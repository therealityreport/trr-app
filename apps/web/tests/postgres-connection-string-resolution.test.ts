import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  classifyConnectionClass,
  isTransactionFlightTestEnabled,
  isDeployedRuntime,
  isSupavisorSessionPoolerConnectionString,
  resolveActiveCandidateIndex,
  resolvePostgresConnectionCandidates,
  resolvePostgresApplicationName,
  resolvePostgresPoolSizing,
  resolvePostgresConnectionString,
  resolvePostgresSslConfig,
  resolveRuntimeConnectionLane,
  shouldAttachPostgresPoolToVercel,
  validateRuntimeLane,
} from "@/lib/server/postgres";

describe("resolvePostgresConnectionString", () => {
  it("prefers the explicit direct lane over session and compatibility URLs", () => {
    const value = resolvePostgresConnectionString({
      TRR_DB_DIRECT_URL: "postgresql://postgres:secret@db.ref.supabase.co:5432/postgres",
      TRR_DB_SESSION_URL: "postgresql://session:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
      TRR_DB_URL: "postgresql://compat:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
      TRR_DB_FALLBACK_URL: "postgresql://fallback:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
    });

    expect(value).toBe("postgresql://postgres:secret@db.ref.supabase.co:5432/postgres");
  });

  it("prefers TRR_DB_URL over the explicit runtime fallback", () => {
    const value = resolvePostgresConnectionString({
      TRR_DB_URL: "postgresql://postgres.ref:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
      TRR_DB_FALLBACK_URL: "postgresql://fallback:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
    });

    expect(value).toBe("postgresql://postgres.ref:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres");
  });

  it("prefers the explicit session lane over the compatibility URL", () => {
    const value = resolvePostgresConnectionString({
      TRR_DB_SESSION_URL: "postgresql://session:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
      TRR_DB_URL: "postgresql://compat:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
    });

    expect(value).toBe("postgresql://session:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres");
  });

  it("falls back to TRR_DB_FALLBACK_URL when the canonical runtime env is absent", () => {
    const value = resolvePostgresConnectionString({
      TRR_DB_FALLBACK_URL: "postgresql://fallback:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
    });

    expect(value).toBe("postgresql://fallback:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres");
  });

  it("does not select transaction mode without the explicit flight-test flag", () => {
    const values = resolvePostgresConnectionCandidates({
      TRR_DB_DIRECT_URL: "postgresql://postgres:secret@db.ref.supabase.co:5432/postgres",
      TRR_DB_RUNTIME_LANE: "transaction",
      TRR_DB_TRANSACTION_URL: "postgresql://tx:secret@aws-1-us-east-1.pooler.supabase.com:6543/postgres",
      TRR_DB_SESSION_URL: "postgresql://session:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
      TRR_DB_URL: "postgresql://compat:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
    });

    expect(values).toEqual([
      "postgresql://postgres:secret@db.ref.supabase.co:5432/postgres",
      "postgresql://session:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
      "postgresql://compat:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
    ]);
  });

  it("selects transaction mode only for an explicit flight test", () => {
    const value = resolvePostgresConnectionString({
      TRR_DB_RUNTIME_LANE: "transaction",
      TRR_DB_TRANSACTION_FLIGHT_TEST: "1",
      TRR_DB_TRANSACTION_URL: "postgresql://tx:secret@aws-1-us-east-1.pooler.supabase.com:6543/postgres",
      TRR_DB_SESSION_URL: "postgresql://session:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
    });

    expect(value).toBe("postgresql://tx:secret@aws-1-us-east-1.pooler.supabase.com:6543/postgres");
  });

  it("never derives direct-host fallback candidates", () => {
    const values = resolvePostgresConnectionCandidates({
      TRR_DB_URL: "postgresql://postgres.abcdefghijklmno:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
      TRR_DB_FALLBACK_URL: "postgresql://fallback:legacy@localhost:5432/trr",
      POSTGRES_ENABLE_SUPABASE_DIRECT_FALLBACK: "true",
    });

    expect(values).toEqual([
      "postgresql://postgres.abcdefghijklmno:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
      "postgresql://fallback:legacy@localhost:5432/trr",
    ]);
  });

  it("throws when no DB URL env vars are configured", () => {
    expect(() => resolvePostgresConnectionString({})).toThrow(
      "No database connection string is set. Configure TRR_DB_DIRECT_URL, TRR_DB_SESSION_URL, or TRR_DB_URL (recommended in TRR-APP/apps/web/.env.local for make dev), or TRR_DB_FALLBACK_URL. Transaction-mode tests require TRR_DB_TRANSACTION_URL plus TRR_DB_TRANSACTION_FLIGHT_TEST=1. Runtime reads do not use SUPABASE_DB_URL or DATABASE_URL.",
    );
  });
});

describe("resolveActiveCandidateIndex", () => {
  it("defaults to the primary candidate when no operator override is set", () => {
    expect(resolveActiveCandidateIndex({})).toBe(0);
  });

  it("pins the fallback candidate only when TRR_DB_FORCE_FALLBACK is explicitly enabled", () => {
    expect(resolveActiveCandidateIndex({ TRR_DB_FORCE_FALLBACK: "1" })).toBe(1);
    expect(resolveActiveCandidateIndex({ TRR_DB_FORCE_FALLBACK: "true" })).toBe(1);
    expect(resolveActiveCandidateIndex({ TRR_DB_FORCE_FALLBACK: "yes" })).toBe(1);
    expect(resolveActiveCandidateIndex({ TRR_DB_FORCE_FALLBACK: "false" })).toBe(0);
  });

  it("selects the declared fallback source when session and compatibility URLs differ", () => {
    expect(
      resolveActiveCandidateIndex({
        TRR_DB_FORCE_FALLBACK: "1",
        TRR_DB_SESSION_URL: "postgresql://session:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
        TRR_DB_URL: "postgresql://compat:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
        TRR_DB_FALLBACK_URL: "postgresql://fallback:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
      }),
    ).toBe(2);
  });

  it("selects the declared fallback source when direct, session, and compatibility URLs differ", () => {
    expect(
      resolveActiveCandidateIndex({
        TRR_DB_FORCE_FALLBACK: "1",
        TRR_DB_DIRECT_URL: "postgresql://postgres:secret@db.ref.supabase.co:5432/postgres",
        TRR_DB_SESSION_URL: "postgresql://session:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
        TRR_DB_URL: "postgresql://compat:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
        TRR_DB_FALLBACK_URL: "postgresql://fallback:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
      }),
    ).toBe(3);
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

  it("loads ssl CA files from the canonical env name", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "trr-ca-"));
    try {
      const caPath = join(tempDir, "root.crt");
      writeFileSync(caPath, "canonical-ca", "utf8");

      const config = resolvePostgresSslConfig(
        "postgresql://postgres.vwxfvzutyufrkhfgoeaa:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=verify-full",
        { DATABASE_SSL_CA_FILE: caPath },
      );

      expect(config).toEqual({ rejectUnauthorized: true, ca: "canonical-ca" });
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("accepts DATABASE_SSL_CA_PATH as a compatibility alias", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "trr-ca-"));
    try {
      const caPath = join(tempDir, "root.crt");
      writeFileSync(caPath, "alias-ca", "utf8");

      const config = resolvePostgresSslConfig(
        "postgresql://postgres.vwxfvzutyufrkhfgoeaa:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=verify-ca",
        { DATABASE_SSL_CA_PATH: caPath },
      );

      expect(config).toEqual({ rejectUnauthorized: true, ca: "alias-ca" });
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
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

describe("transaction flight-test controls", () => {
  it("defaults to the session lane", () => {
    expect(resolveRuntimeConnectionLane({})).toBe("session");
    expect(isTransactionFlightTestEnabled({})).toBe(false);
  });

  it("recognizes explicit transaction flight-test controls", () => {
    expect(
      resolveRuntimeConnectionLane({
        TRR_DB_RUNTIME_LANE: "transaction",
      }),
    ).toBe("transaction");
    expect(isTransactionFlightTestEnabled({ TRR_DB_TRANSACTION_FLIGHT_TEST: "true" })).toBe(true);
  });
});

describe("resolvePostgresPoolSizing", () => {
  it("keeps session defaults bounded in local development", () => {
    const sizing = resolvePostgresPoolSizing(
      "postgresql://postgres.ref:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
      { NODE_ENV: "development" },
    );

    expect(sizing).toEqual({
      maxConcurrentOperations: 1,
      poolMax: 1,
    });
  });

  it("keeps deployed session defaults inside the Supabase capacity budget", () => {
    const sizing = resolvePostgresPoolSizing(
      "postgresql://postgres.ref:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
      { NODE_ENV: "production" },
    );

    expect(sizing).toEqual({
      maxConcurrentOperations: 1,
      poolMax: 2,
    });
  });

  it("keeps preview session defaults inside the Supabase capacity budget", () => {
    const sizing = resolvePostgresPoolSizing(
      "postgresql://postgres.ref:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
      { NODE_ENV: "production", VERCEL_ENV: "preview" },
    );

    expect(sizing).toEqual({
      maxConcurrentOperations: 1,
      poolMax: 1,
    });
  });

  it("keeps direct local development defaults at local Postgres capacity", () => {
    const sizing = resolvePostgresPoolSizing("postgresql://postgres:secret@localhost:5432/postgres", {
      NODE_ENV: "development",
    });

    expect(sizing).toEqual({
      maxConcurrentOperations: 8,
      poolMax: 8,
    });
  });

  it("honors explicit local debug pool overrides", () => {
    const sizing = resolvePostgresPoolSizing(
      "postgresql://postgres.ref:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
      {
        NODE_ENV: "development",
        POSTGRES_POOL_MAX: "2",
        POSTGRES_MAX_CONCURRENT_OPERATIONS: "2",
      },
    );

    expect(sizing).toEqual({
      maxConcurrentOperations: 2,
      poolMax: 2,
    });
  });
});

describe("resolvePostgresApplicationName", () => {
  it("uses a pg_stat_activity-friendly default", () => {
    expect(resolvePostgresApplicationName({})).toBe("trr-app:web");
  });

  it("uses a trimmed explicit app name", () => {
    expect(resolvePostgresApplicationName({ POSTGRES_APPLICATION_NAME: " trr-app:preview " })).toBe(
      "trr-app:preview",
    );
  });

  it("falls back to the default when the env var is blank", () => {
    expect(resolvePostgresApplicationName({ POSTGRES_APPLICATION_NAME: "   " })).toBe("trr-app:web");
  });

  it("does not use secret-like values as application_name", () => {
    expect(
      resolvePostgresApplicationName({
        POSTGRES_APPLICATION_NAME: "postgresql://user:secret@db.example.com/postgres",
      }),
    ).toBe("trr-app:web");
    expect(resolvePostgresApplicationName({ POSTGRES_APPLICATION_NAME: "token=abc123" })).toBe("trr-app:web");
    expect(resolvePostgresApplicationName({ POSTGRES_APPLICATION_NAME: "service@role" })).toBe("trr-app:web");
  });
});

describe("shouldAttachPostgresPoolToVercel", () => {
  it("attaches only when Vercel runtime markers are present", () => {
    expect(shouldAttachPostgresPoolToVercel({})).toBe(false);
    expect(shouldAttachPostgresPoolToVercel({ VERCEL: "1" })).toBe(true);
    expect(shouldAttachPostgresPoolToVercel({ VERCEL_ENV: "production" })).toBe(true);
    expect(shouldAttachPostgresPoolToVercel({ VERCEL_ENV: "preview" })).toBe(true);
  });
});

describe("isDeployedRuntime", () => {
  it("returns false for NODE_ENV=development", () => {
    expect(isDeployedRuntime({ NODE_ENV: "development" })).toBe(false);
  });

  it("returns false for VERCEL_ENV=preview", () => {
    expect(isDeployedRuntime({ NODE_ENV: "production", VERCEL_ENV: "preview" })).toBe(false);
  });

  it("returns false for VERCEL_ENV=development", () => {
    expect(isDeployedRuntime({ NODE_ENV: "production", VERCEL_ENV: "development" })).toBe(false);
  });

  it("returns true for production without VERCEL_ENV override", () => {
    expect(isDeployedRuntime({ NODE_ENV: "production" })).toBe(true);
  });

  it("returns true for VERCEL_ENV=production", () => {
    expect(isDeployedRuntime({ NODE_ENV: "production", VERCEL_ENV: "production" })).toBe(true);
  });
});

describe("validateRuntimeLane", () => {
  it("allows session in deployed runtime", () => {
    expect(() => validateRuntimeLane("session", true)).not.toThrow();
  });

  it("allows local in deployed runtime", () => {
    expect(() => validateRuntimeLane("local", true)).not.toThrow();
  });

  it("rejects transaction in deployed runtime", () => {
    expect(() => validateRuntimeLane("transaction", true)).toThrow(
      /connection class "transaction" is not allowed\b/,
    );
  });

  it("allows transaction only during an explicit flight test", () => {
    expect(() =>
      validateRuntimeLane("transaction", true, {
        TRR_DB_TRANSACTION_FLIGHT_TEST: "1",
      }),
    ).not.toThrow();
  });

  it("rejects direct in deployed runtime", () => {
    expect(() => validateRuntimeLane("direct", true, {}, "TRR_DB_DIRECT_URL")).toThrow(
      /connection source "TRR_DB_DIRECT_URL" is not allowed\b/,
    );
  });

  it("rejects TRR_DB_DIRECT_URL in deployed runtime even when the URL shape is session", () => {
    expect(() => validateRuntimeLane("session", true, {}, "TRR_DB_DIRECT_URL")).toThrow(
      /connection source "TRR_DB_DIRECT_URL" is not allowed\b/,
    );
  });

  it("rejects transaction in local dev", () => {
    expect(() => validateRuntimeLane("transaction", false)).toThrow(
      /connection class "transaction" is not allowed\b/,
    );
  });

  it("allows direct in local dev only through TRR_DB_DIRECT_URL", () => {
    expect(() => validateRuntimeLane("direct", false, {}, "TRR_DB_DIRECT_URL")).not.toThrow();
  });

  it("rejects direct in local dev from compatibility sources", () => {
    expect(() => validateRuntimeLane("direct", false, {}, "TRR_DB_URL")).toThrow(
      /connection class "direct" is not allowed\b/,
    );
  });

  it("rejects unknown lanes in local dev", () => {
    expect(() => validateRuntimeLane("other", false)).toThrow(
      /connection class "other" is not allowed\b/,
    );
  });
});
