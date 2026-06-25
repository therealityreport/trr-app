import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("cast socialblade snapshot wiring", () => {
  it("uses the shared polling resource for pending refresh polling", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/cast-socialblade-comparison.tsx",
    );
    const contents = readFileSync(filePath, "utf8");

    expect(contents).toContain("useSharedPollingResource");
    expect(contents).toContain("/api/admin/trr-api/social-growth/cast-comparison/snapshot");
  });

  it("tracks queued Modal refreshes by call id without failing slow jobs early", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/cast-socialblade-comparison.tsx",
    );
    const contents = readFileSync(filePath, "utf8");

    expect(contents).toContain("type PendingRefreshState");
    expect(contents).toContain("callId");
    expect(contents).toContain("Queued in Modal");
    expect(contents).toContain("Still running in Modal");
    expect(contents).toContain("/api/admin/trr-api/social-growth/calls/");
    expect(contents).toContain("/api/admin/trr-api/social-growth/history");
    expect(contents).toContain("Job History");
    expect(contents).toContain("formatTimingDetail");
    expect(contents).toContain("setPendingRefreshState");
    expect(contents).toContain("status: \"still_running\"");
    expect(contents).toContain("lastRefreshSnapshotEventMsRef");
  });

  it("keeps the mocked e2e harness aligned with season social cast-comparison flows", () => {
    const fixturesPath = path.resolve(__dirname, "./e2e/admin-fixtures.ts");
    const specPath = path.resolve(__dirname, "./e2e/admin-cast-tabs-smoke.spec.ts");
    const fixtures = readFileSync(fixturesPath, "utf8");
    const spec = readFileSync(specPath, "utf8");

    expect(fixtures).toContain("gotoSeasonSocialCastContent");
    expect(fixtures).toContain("/api/admin/trr-api/social-growth/refresh-batch");
    expect(fixtures).toContain("/api/admin/trr-api/social-growth/cast-comparison/snapshot");
    expect(fixtures).toContain("/api/admin/trr-api/social-growth/history");
    expect(fixtures).toContain("calls|call-status");
    expect(spec).toContain("SOCIAL BLADE");
    expect(spec).toContain("Queued in Modal");
    expect(spec).toContain("Running in Modal");
  });
});
