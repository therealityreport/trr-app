import { describe, expect, it } from "vitest";
import { resolvePostgresConnectionString, resolvePostgresSslConfig } from "@/lib/server/postgres";

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
