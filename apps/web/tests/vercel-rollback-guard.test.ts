import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const appRoot = resolve(__dirname, "../../..");
const wrapper = join(appRoot, "scripts", "vercel.sh");

describe("guarded Vercel release operations", () => {
  let tempDir: string;
  let fakeGuard: string;
  let fakeVercel: string;
  let providerLog: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "trr-vercel-release-guard-"));
    fakeGuard = join(tempDir, "guard.py");
    await writeFile(fakeGuard, "raise SystemExit(0)\n", "utf-8");
    await chmod(fakeGuard, 0o755);
    providerLog = join(tempDir, "provider.jsonl");
    fakeVercel = join(tempDir, "vercel");
    await writeFile(
      fakeVercel,
      [
        "#!/usr/bin/env python3",
        "import json, os, sys",
        `log = ${JSON.stringify(providerLog)}`,
        "with open(log, 'a', encoding='utf-8') as target:",
        "    target.write(json.dumps(sys.argv[1:]) + '\\n')",
        "if sys.argv[1:2] == ['api']:",
        "    print(os.environ.get('FAKE_VERCEL_METADATA', '{}'))",
        "else:",
        "    print('{}')",
        "",
      ].join("\n"),
      "utf-8",
    );
    await chmod(fakeVercel, 0o755);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  function runWrapper(args: string[], extraEnv: NodeJS.ProcessEnv = {}) {
    return spawnSync("bash", [wrapper, ...args], {
      cwd: appRoot,
      encoding: "utf-8",
      env: {
        ...process.env,
        TRR_VERCEL_PROJECT_GUARD: fakeGuard,
        TRR_VERCEL_GUARD_ONLY: "1",
        TRR_VERCEL_BIN: fakeVercel,
        ...extraEnv,
      },
    });
  }

  it("emits a pinned rollback plan without invoking Vercel", () => {
    const result = runWrapper(["rollback-trr", "--deployment", "dpl_Abc123"]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toEqual({
      command: [
        "rollback",
        "dpl_Abc123",
        "--cwd",
        appRoot,
        "--non-interactive",
        "--timeout=0",
      ],
      deployment: "dpl_Abc123",
      execute: false,
      operation: "rollback",
      projectId: "prj_MHpStkwr26rV5kjt0f80zqhwZpAs",
      projectName: "trr-app",
      teamId: "team_EUsG2kN9TAvVDGOu4yZVEoCX",
      teamSlug: "the-reality-reports-projects",
      targetBinding: {
        status: "pending_provider_inspection",
        requiredProjectId: "prj_MHpStkwr26rV5kjt0f80zqhwZpAs",
        requiredProjectName: "trr-app",
        requiredTeamId: "team_EUsG2kN9TAvVDGOu4yZVEoCX",
        verificationCommand: [
          "api",
          "/v13/deployments/dpl_Abc123?teamId=team_EUsG2kN9TAvVDGOu4yZVEoCX",
          "--cwd",
          appRoot,
          "--non-interactive",
          "--scope",
          "the-reality-reports-projects",
        ],
      },
    });
    expect(() => readFileSync(providerLog)).toThrow();
  });

  it("emits a read-only evidence plan without invoking Vercel", () => {
    const result = runWrapper([
      "release-evidence",
      "--deployment",
      "https://trr-app-good.vercel.app",
    ]);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload).toMatchObject({
      operation: "evidence",
      deployment: "https://trr-app-good.vercel.app",
      execute: false,
      projectName: "trr-app",
      teamId: "team_EUsG2kN9TAvVDGOu4yZVEoCX",
      targetBinding: {
        status: "pending_provider_inspection",
      },
    });
    expect(payload.commands).toEqual([
      ["list", "trr-app", "--prod", "--format", "json", "--cwd", appRoot],
      ["inspect", "https://trr-app-good.vercel.app", "--cwd", appRoot, "--no-color"],
      ["rollback", "status", "trr-app", "--cwd", appRoot, "--non-interactive"],
    ]);
  });

  it("requires both production and rollback approval before execute", () => {
    const result = runWrapper([
      "rollback-trr",
      "--deployment",
      "dpl_Abc123",
      "--execute",
    ]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("TRR_VERCEL_ALLOW_PROD=1");
    expect(result.stderr).toContain("TRR_VERCEL_ROLLBACK_APPROVED=1");
  });

  it("blocks ambient rollback commands in favor of the pinned operation", () => {
    const result = runWrapper(["rollback", "dpl_Abc123"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("rollback-trr");
  });

  it("rejects foreign deployment metadata before collecting release evidence", () => {
    const result = runWrapper(
      [
        "release-evidence",
        "--deployment",
        "https://foreign-preview.vercel.app",
        "--execute",
      ],
      {
        TRR_VERCEL_GUARD_ONLY: "0",
        FAKE_VERCEL_METADATA: JSON.stringify({
          id: "dpl_Foreign",
          url: "foreign-preview.vercel.app",
          name: "foreign-app",
          projectId: "prj_foreign",
          ownerId: "team_foreign",
        }),
      },
    );

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("deployment binding mismatch");
    const calls = readFileSync(providerLog, "utf-8")
      .trim()
      .split("\n")
      .map((line: string) => JSON.parse(line));
    expect(calls).toHaveLength(1);
    expect(calls[0]?.[0]).toBe("api");
  });

  it("rejects a foreign deployment before rollback mutation", () => {
    const result = runWrapper(
      ["rollback-trr", "--deployment", "dpl_Abc123", "--execute"],
      {
        TRR_VERCEL_GUARD_ONLY: "0",
        TRR_VERCEL_ALLOW_PROD: "1",
        TRR_VERCEL_ROLLBACK_APPROVED: "1",
        FAKE_VERCEL_METADATA: JSON.stringify({
          id: "dpl_Abc123",
          url: "foreign-preview.vercel.app",
          name: "foreign-app",
          projectId: "prj_foreign",
          ownerId: "team_foreign",
        }),
      },
    );

    expect(result.status).toBe(2);
    const calls = readFileSync(providerLog, "utf-8")
      .trim()
      .split("\n")
      .map((line: string) => JSON.parse(line));
    expect(calls).toHaveLength(1);
    expect(calls[0]?.[0]).toBe("api");
  });

  it("verifies authoritative project and team metadata before rollback", () => {
    const result = runWrapper(
      ["rollback-trr", "--deployment", "dpl_Abc123", "--execute"],
      {
        TRR_VERCEL_GUARD_ONLY: "0",
        TRR_VERCEL_ALLOW_PROD: "1",
        TRR_VERCEL_ROLLBACK_APPROVED: "1",
        FAKE_VERCEL_METADATA: JSON.stringify({
          id: "dpl_Abc123",
          url: "trr-app-good.vercel.app",
          name: "trr-app",
          projectId: "prj_MHpStkwr26rV5kjt0f80zqhwZpAs",
          ownerId: "team_EUsG2kN9TAvVDGOu4yZVEoCX",
        }),
      },
    );

    expect(result.status).toBe(0);
    const calls = readFileSync(providerLog, "utf-8")
      .trim()
      .split("\n")
      .map((line: string) => JSON.parse(line));
    expect(calls.map((call: string[]) => call.slice(0, 2))).toEqual([
      ["api", "/v13/deployments/dpl_Abc123?teamId=team_EUsG2kN9TAvVDGOu4yZVEoCX"],
      ["rollback", "dpl_Abc123"],
      ["rollback", "status"],
    ]);
  });
});
