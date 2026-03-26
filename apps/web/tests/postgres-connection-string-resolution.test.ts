import { describe, expect, it } from "vitest";
import {
  isSupavisorSessionPoolerConnectionString,
  resolvePostgresConnectionCandidates,
  resolvePostgresConnectionString,
  resolvePostgresSslConfig,
} from "@/lib/server/postgres";

describe("resolvePostgresConnectionString", () => {
  it("prefers DATABASE_URL over SUPABASE_DB_URL", () => {
    const value = resolvePostgresConnectionString({
      SUPABASE_DB_URL: "postgresql://postgres:postgres@127.0.0.1:55432/postgres",
      DATABASE_URL: "postgresql://user:pass@aws-1-us-east-1.pooler.supabase.com:6543/postgres",
      TRR_DB_URL: "postgresql://legacy:legacy@localhost:5432/trr",
    });

    expect(value).toBe("postgresql://user:pass@aws-1-us-east-1.pooler.supabase.com:6543/postgres");
  });

  it("falls back to SUPABASE_DB_URL when DATABASE_URL is missing", () => {
    const value = resolvePostgresConnectionString({
      SUPABASE_DB_URL: "postgresql://user:pass@localhost:5432/postgres",
      TRR_DB_URL: "postgresql://legacy:legacy@localhost:5432/trr",
    });

    expect(value).toBe("postgresql://user:pass@localhost:5432/postgres");
  });

  it("falls back to TRR_DB_URL when others are missing", () => {
    const value = resolvePostgresConnectionString({
      TRR_DB_URL: "postgresql://legacy:legacy@localhost:5432/trr",
    });

    expect(value).toBe("postgresql://legacy:legacy@localhost:5432/trr");
  });

  it("does not add a direct-host fallback unless explicitly enabled", () => {
    const values = resolvePostgresConnectionCandidates({
      DATABASE_URL: "postgresql://postgres.abcdefghijklmno:secret@aws-1-us-east-1.pooler.supabase.com:6543/postgres",
      TRR_DB_URL: "postgresql://legacy:legacy@localhost:5432/trr",
    });

    expect(values).toEqual([
      "postgresql://postgres.abcdefghijklmno:secret@aws-1-us-east-1.pooler.supabase.com:6543/postgres",
      "postgresql://legacy:legacy@localhost:5432/trr",
    ]);
  });

  it("adds a direct-host fallback after a Supabase pooler URL when enabled", () => {
    const values = resolvePostgresConnectionCandidates({
      DATABASE_URL: "postgresql://postgres.abcdefghijklmno:secret@aws-1-us-east-1.pooler.supabase.com:6543/postgres",
      TRR_DB_URL: "postgresql://legacy:legacy@localhost:5432/trr",
      POSTGRES_ENABLE_SUPABASE_DIRECT_FALLBACK: "true",
    });

    expect(values).toEqual([
      "postgresql://postgres.abcdefghijklmno:secret@aws-1-us-east-1.pooler.supabase.com:6543/postgres",
      "postgresql://postgres.abcdefghijklmno:secret@db.abcdefghijklmno.supabase.co:5432/postgres",
      "postgresql://legacy:legacy@localhost:5432/trr",
    ]);
  });

  it("throws when no DB URL env vars are configured", () => {
    expect(() => resolvePostgresConnectionString({})).toThrow(
      "No database connection string is set. Configure SUPABASE_DB_URL, DATABASE_URL, or TRR_DB_URL.",
    );
  });
});

describe("resolvePostgresSslConfig", () => {
  it("disables ssl for localhost when DATABASE_SSL is true", () => {
    const config = resolvePostgresSslConfig("postgresql://postgres:postgres@127.0.0.1:55432/postgres", {
      DATABASE_SSL: "true",
    });

    expect(config).toBeUndefined();
  });

  it("keeps ssl enabled for non-local hosts when DATABASE_SSL is true", () => {
    const config = resolvePostgresSslConfig(
      "postgresql://postgres.vwxfvzutyufrkhfgoeaa:secret@aws-1-us-east-1.pooler.supabase.com:6543/postgres",
      { DATABASE_SSL: "true" },
    );

    expect(config).toEqual({ rejectUnauthorized: false });
  });
});

describe("isSupavisorSessionPoolerConnectionString", () => {
  it("detects Supavisor session-mode pooler urls", () => {
    expect(
      isSupavisorSessionPoolerConnectionString(
        "postgresql://postgres.ref:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
      ),
    ).toBe(true);
  });

  it("does not treat transaction-mode pooler urls as session-mode", () => {
    expect(
      isSupavisorSessionPoolerConnectionString(
        "postgresql://postgres.ref:secret@aws-1-us-east-1.pooler.supabase.com:6543/postgres",
      ),
    ).toBe(false);
  });
});
