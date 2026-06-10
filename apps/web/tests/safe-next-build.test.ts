import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const scriptPath = path.join(process.cwd(), "scripts", "safe-next-build.mjs");
const packageJsonPath = path.join(process.cwd(), "package.json");

function runSafeBuild(env: NodeJS.ProcessEnv, args: string[] = []) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      CI: undefined,
      GITHUB_ACTIONS: undefined,
      ...env,
      npm_execpath: undefined,
    },
  });
}

describe("safe-next-build", () => {
  it("refuses to start a local build when the configured free-memory floor is not met", () => {
    const result = runSafeBuild({
      TRR_BUILD_DRY_RUN: "1",
      TRR_BUILD_MIN_FREE_GB: "999",
      TRR_BUILD_MAX_SWAP_USED_GB: "999",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Refusing to start local production build");
    expect(result.stderr).toContain("free memory");
    expect(result.stderr).toContain("Practical next steps");
    expect(result.stderr).toContain("TRR_NEXT_BUILD_CPUS=1");
    expect(result.stderr).not.toContain("next build --webpack");
  });

  it("prints the lowered-priority dry-run command with the default local worker cap", () => {
    const result = runSafeBuild({
      TRR_FORCE_BUILD: "1",
      TRR_BUILD_DRY_RUN: "1",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("cpus=2");
    expect(result.stdout).toContain("nice=10");
    expect(result.stdout).toContain("next build --webpack");
  });

  it("honors explicit local worker and priority overrides", () => {
    const result = runSafeBuild({
      TRR_FORCE_BUILD: "1",
      TRR_BUILD_DRY_RUN: "1",
      TRR_NEXT_BUILD_CPUS: "3",
      TRR_BUILD_NICE: "12",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("cpus=3");
    expect(result.stdout).toContain("nice=12");
  });

  it("routes turbopack builds through the same safe build guard", () => {
    const result = runSafeBuild(
      {
        TRR_FORCE_BUILD: "1",
        TRR_BUILD_DRY_RUN: "1",
      },
      ["--turbopack"],
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[safe-next-build]");
    expect(result.stdout).toContain("next build --turbopack");
    expect(result.stdout).not.toContain("next build --webpack --turbopack");
  });

  it("keeps the build:turbo package script behind the safe build guard", () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["build:turbo"]).toBe("node scripts/safe-next-build.mjs --turbopack");
  });
});
