import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("admin detail browser smoke script", () => {
  it("stays syntactically valid and keeps fallback/background controls wired", () => {
    const projectRoot = process.cwd();
    const scriptPath = join(projectRoot, "scripts/browser-smoke-admin-detail-routes.mjs");
    const scriptSource = readFileSync(scriptPath, "utf8");
    const packageJson = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };

    execFileSync(process.execPath, ["--check", scriptPath], { stdio: "pipe" });

    expect(packageJson.scripts?.["smoke:admin-detail-routes"]).toBe(
      "node scripts/browser-smoke-admin-detail-routes.mjs",
    );
    expect(scriptSource).toContain("--no-background-stubs");
    expect(scriptSource).toContain("--skip-backend-pool-report");
    expect(scriptSource).toContain("--skip-bravo-videos-assertion");
    expect(scriptSource).toContain("--skip-cookie-health-assertion");
    expect(scriptSource).toContain("--skip-console-504-assertion");
    expect(scriptSource).toContain("--skip-backend-504-assertion");
    expect(scriptSource).toContain("backend_pool_report");
    expect(scriptSource).toContain("acquire_failed");
    expect(scriptSource).toContain("bravo-videos-no-504");
    expect(scriptSource).toContain("cookie-health-no-default-posts-auth");
    expect(scriptSource).toContain("console-no-504");
    expect(scriptSource).toContain("backend-no-504");
    expect(scriptSource).toContain("TRR_BROWSER_SMOKE_COOKIE_HEALTH_ASSERTION");
    expect(scriptSource).toContain("TRR_BROWSER_SMOKE_CONSOLE_504_ASSERTION");
    expect(scriptSource).toContain("TRR_BROWSER_SMOKE_BACKEND_504_ASSERTION");
    expect(scriptSource).toContain("url_contains_any");
    expect(scriptSource).toContain("Awaited response returned HTTP");
    expect(scriptSource).toContain("__trr_smoke_force_local_fallback");
    expect(scriptSource).toContain("x-trr-show-detail-source");
    expect(scriptSource).toContain("x-trr-browser-smoke-stub");
  });
});
