import { Client } from "pg";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { removeSeasonImports, resolveDatabaseConfig } from "../scripts/delete-web-scrape-imports.mjs";

const baseUrl = "postgresql://test@localhost/test";

describe("cleanup TLS configuration through the installed pg parser", () => {
  it.each(["", "?sslmode=require", "?sslmode=disable", "?ssl=no-verify", "?sslmode=require&uselibpqcompat=true"])(
    "strict mode cannot be weakened by URL %s", (suffix) => {
      const config = resolveDatabaseConfig(baseUrl + suffix, { DATABASE_SSL_STRICT: "true" });
      expect(new Client(config).connectionParameters.ssl).toEqual({ rejectUnauthorized: true });
    },
  );

  it("uses a supplied CA and keeps explicit non-strict/local modes", () => {
    const config = resolveDatabaseConfig(`${baseUrl}?sslmode=require`, {
      DATABASE_SSL_STRICT: "true", DATABASE_SSL_CA: "line1\\nline2",
    });
    expect(new Client(config).connectionParameters.ssl).toEqual({ rejectUnauthorized: true, ca: "line1\nline2" });
    expect(resolveDatabaseConfig(baseUrl, {}).ssl).toBe(false);
    expect(resolveDatabaseConfig(baseUrl, { DATABASE_SSL: "true" }).ssl).toEqual({ rejectUnauthorized: false });
  });

  it("fails closed for an unavailable configured CA", () => {
    expect(() => resolveDatabaseConfig(baseUrl, {
      DATABASE_SSL_STRICT: "true", DATABASE_SSL_CA_PATH: "/inert-nonexistent-test/ca.pem",
    })).toThrow();
  });

  it.each(["?ssl=true", "?sslmode=require", "?sslmode=verify-full"])(
    "preserves pg certificate verification for secure URL %s", (suffix) => {
      const original = new Client({ connectionString: baseUrl + suffix }).connectionParameters.ssl;
      const resolved = new Client(resolveDatabaseConfig(baseUrl + suffix, {})).connectionParameters.ssl;
      expect(resolved).toEqual(original);
      expect(resolved).not.toEqual({ rejectUnauthorized: false });
    },
  );

  it("preserves explicit opt-outs and inherited PGSSLMODE", () => {
    expect(new Client(resolveDatabaseConfig(`${baseUrl}?ssl=no-verify`, {})).connectionParameters.ssl)
      .toEqual({ rejectUnauthorized: false });
    expect(new Client(resolveDatabaseConfig(`${baseUrl}?sslmode=require&uselibpqcompat=true`, {})).connectionParameters.ssl)
      .toEqual({ rejectUnauthorized: false });
    vi.stubEnv("PGSSLMODE", "verify-full");
    expect(new Client(resolveDatabaseConfig(baseUrl)).connectionParameters.ssl).toBe(true);
  });

  it("preserves the configured CA, strict verification and direct handshake together", () => {
    const config = resolveDatabaseConfig(`${baseUrl}?sslnegotiation=direct`, {
      DATABASE_SSL_STRICT: "true", DATABASE_SSL_CA: "INERT-TEST-CA",
    });
    const parsed = new Client(config).connectionParameters;
    expect(parsed.ssl).toEqual({ rejectUnauthorized: true, ca: "INERT-TEST-CA" });
    expect(parsed.sslnegotiation).toBe("direct");
    expect(config.connectionString).not.toContain("sslnegotiation");
  });

  it.each([
    { DATABASE_SSL_STRICT: "true" },
    { DATABASE_SSL_CA: "INERT-TEST-CA" },
    { DATABASE_SSL_STRICT: "true", DATABASE_SSL_CA: "INERT-TEST-CA" },
  ])("retains client credentials and the key's non-enumerability with overlay %j", (env) => {
    // Inert public package text exercises pg's file handling without credentials.
    const inertFile = encodeURIComponent(path.join(process.cwd(), "package.json"));
    const url = `${baseUrl}?sslmode=verify-full&sslcert=${inertFile}&sslkey=${inertFile}`;
    const native = new Client({ connectionString: url }).connectionParameters.ssl;
    const resolved = new Client(resolveDatabaseConfig(url, env)).connectionParameters.ssl;
    expect(resolved.cert).toBe(native.cert);
    expect(resolved.key).toBe(native.key);
    expect(Object.getOwnPropertyDescriptor(resolved, "key")?.enumerable).toBe(false);
    expect(JSON.stringify(resolved)).not.toContain('"key"');
  });
});

describe("season import unlink transaction", () => {
  const options = { seasonId: "season-1", source: "web_scrape:test", pageUrl: "https://example.test/photos" };
  const rows = [{ link_id: "link-1", id: "shared-asset" }, { link_id: "link-2", id: "shared-asset" }];

  it("defaults to a read-only preview", async () => {
    const client = { query: vi.fn().mockResolvedValue({ rows }) };
    expect(await removeSeasonImports(client, options)).toEqual({ rows, removed: 0 });
    expect(client.query).toHaveBeenCalledOnce();
    expect(client.query.mock.calls[0][1]).toEqual([options.seasonId, options.source, options.pageUrl]);
    expect(client.query.mock.calls[0][0]).not.toMatch(/for update|delete/i);
  });

  it("locks selected links and deletes only their IDs within the same season", async () => {
    const client = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }) };
    client.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows })
      .mockResolvedValueOnce({ rows: [], rowCount: 2 });
    expect(await removeSeasonImports(client, { ...options, apply: true })).toEqual({ rows, removed: 2 });
    const calls = client.query.mock.calls;
    expect(calls[0][0]).toBe("begin");
    expect(calls[1][0]).toMatch(/for update of ml/);
    expect(calls[2][0]).toContain("id = any($1::uuid[]) and entity_type = 'season' and entity_id = $2");
    expect(calls[2][1]).toEqual([["link-1", "link-2"], options.seasonId]);
    expect(calls[3][0]).toBe("commit");
    expect(calls.some(([sql]) => /delete from core\.media_assets/i.test(sql))).toBe(false);
  });

  it("rolls back a failed removal and never reports success", async () => {
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    client.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows })
      .mockRejectedValueOnce(new Error("controlled delete failure"));
    await expect(removeSeasonImports(client, { ...options, apply: true })).rejects.toThrow("controlled delete failure");
    expect(client.query.mock.calls.at(-1)?.[0]).toBe("rollback");
    expect(client.query.mock.calls.some(([sql]) => sql === "commit")).toBe(false);
  });

  it("commits an empty selection without deleting anything", async () => {
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    expect(await removeSeasonImports(client, { ...options, apply: true })).toEqual({ rows: [], removed: 0 });
    expect(client.query.mock.calls.map(([sql]) => sql).filter((sql) => /^delete/i.test(sql))).toEqual([]);
    expect(client.query.mock.calls.at(-1)?.[0]).toBe("commit");
  });
});
