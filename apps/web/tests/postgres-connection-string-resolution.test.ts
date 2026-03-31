import { describe, expect, it } from "vitest";
import {
  classifyConnectionClass,
  isSupavisorSessionPoolerConnectionString,
  resolvePostgresConnectionCandidates,
  resolvePostgresPoolSizing,
  resolvePostgresConnectionString,
  resolvePostgresSslConfig,
} from "@/lib/server/postgres";

describe("resolvePostgresConnectionString", () => {
  it("prefers TRR_DB_URL over the explicit runtime fallback", () => {
    const value = resolvePostgresConnectionString({
      TRR_DB_URL: "postgresql://postgres.ref:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
      TRR_DB_FALLBACK_URL: "postgresql://fallback:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
    });

    expect(value).toBe("postgresql://postgres.ref:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres");
  });

  it("falls back to TRR_DB_FALLBACK_URL when the canonical runtime env is absent", () => {
    const value = resolvePostgresConnectionString({
      TRR_DB_FALLBACK_URL: "postgresql://fallback:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
    });

    expect(value).toBe("postgresql://fallback:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres");
  });

  it("does not add a direct-host fallback unless explicitly enabled", () => {
    const values = resolvePostgresConnectionCandidates({
      TRR_DB_URL: "postgresql://postgres.abcdefghijklmno:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
      TRR_DB_FALLBACK_URL: "postgresql://fallback:legacy@localhost:5432/trr",
    });

    expect(values).toEqual([
      "postgresql://postgres.abcdefghijklmno:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
      "postgresql://fallback:legacy@localhost:5432/trr",
    ]);
  });

  it("adds a direct-host fallback after a Supabase pooler URL when enabled", () => {
    const values = resolvePostgresConnectionCandidates({
      TRR_DB_URL: "postgresql://postgres.abcdefghijklmno:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
      TRR_DB_FALLBACK_URL: "postgresql://fallback:legacy@localhost:5432/trr",
      POSTGRES_ENABLE_SUPABASE_DIRECT_FALLBACK: "true",
    });

    expect(values).toEqual([
      "postgresql://postgres.abcdefghijklmno:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
      "postgresql://postgres.abcdefghijklmno:secret@db.abcdefghijklmno.supabase.co:5432/postgres",
      "postgresql://fallback:legacy@localhost:5432/trr",
    ]);
  });

  it("throws when no DB URL env vars are configured", () => {
    expect(() => resolvePostgresConnectionString({})).toThrow(
      "No database connection string is set. Configure TRR_DB_URL (recommended in TRR-APP/apps/web/.env.local for make dev) or TRR_DB_FALLBACK_URL. Runtime reads do not use SUPABASE_DB_URL or DATABASE_URL.",
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

describe("classifyConnectionClass", () => {
  it("classifies the supported runtime lanes", () => {
    expect(
      classifyConnectionClass("postgresql://postgres.ref:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres"),
    ).toBe("session");
    expect(
      classifyConnectionClass("postgresql://postgres.ref:secret@aws-1-us-east-1.pooler.supabase.com:6543/postgres"),
    ).toBe("transaction");
    expect(classifyConnectionClass("postgresql://postgres:secret@db.example.supabase.co:5432/postgres")).toBe(
      "direct",
    );
  });
});

describe("resolvePostgresPoolSizing", () => {
  it("uses modestly larger session defaults in local development", () => {
    const sizing = resolvePostgresPoolSizing(
      "postgresql://postgres.ref:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
      { NODE_ENV: "development" },
    );

    expect(sizing).toEqual({
      maxConcurrentOperations: 4,
      poolMax: 4,
    });
  });

  it("keeps deployed session defaults conservative", () => {
    const sizing = resolvePostgresPoolSizing(
      "postgresql://postgres.ref:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
      { NODE_ENV: "production" },
    );

    expect(sizing).toEqual({
      maxConcurrentOperations: 2,
      poolMax: 4,
    });
  });
});
