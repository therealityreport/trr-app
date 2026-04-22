import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const modulePath = pathToFileURL(path.resolve(__dirname, "../scripts/run-migrations.mjs")).href;

const loadScript = async () => import(modulePath);

describe("run-migrations", () => {
  afterEach(async () => {
    const script = await loadScript();
    await script.__resetPoolForTests();
  });

  it("wraps each app-local migration in a single transaction", async () => {
    const executed: string[] = [];
    const client = {
      query: async (sql: string) => {
        executed.push(sql);
        return { rowCount: 0 };
      },
      release: () => undefined,
    };
    const script = await loadScript();
    script.__setPoolForTests({
      connect: async () => client,
    });

    await script.applyMigration("001_app_local_sample.sql", "create table foo (id int);");

    expect(executed[0]).toBe("BEGIN");
    expect(executed).toContain("create table foo (id int);");
    expect(executed).toContain("INSERT INTO __migrations (name) VALUES ($1)");
    expect(executed[executed.length - 1]).toBe("COMMIT");
  });

  it("rolls back when the SQL body fails", async () => {
    const executed: string[] = [];
    const client = {
      query: async (sql: string) => {
        executed.push(sql);
        if (sql.includes("create table")) {
          throw new Error("syntax");
        }
        return { rowCount: 0 };
      },
      release: () => undefined,
    };
    const script = await loadScript();
    script.__setPoolForTests({
      connect: async () => client,
    });

    await expect(script.applyMigration("x.sql", "create table ...")).rejects.toThrow(/syntax/);
    expect(executed).toContain("ROLLBACK");
  });

  it("refuses the removed shared-schema flag even in dry-run mode", async () => {
    const script = await loadScript();

    await expect(
      script.runMigrations({
        dryRun: true,
        includeTransitionalSharedSchema: true,
      }),
    ).rejects.toThrow(/Shared-schema migrations belong in TRR-Backend\/supabase\/migrations/);
  });
});
