import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show gallery batch jobs preflight wiring", () => {
  it("reuses the same computed target plan for summary and submit", () => {
    const routePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/page.tsx"
    );
    const modalPath = path.resolve(
      __dirname,
      "../src/components/admin/ShowBatchRoleModals.tsx"
    );
    const route = fs.readFileSync(routePath, "utf8");
    const modal = fs.readFileSync(modalPath, "utf8");

    expect(route).toContain("const showBatchTargetPlan = useMemo(() => {");
    expect(route).toContain("const showBatchPreflightSummary = useMemo(() => {");
    expect(route).toContain("const { targets } = showBatchTargetPlan;");
    expect(route).toContain("preflightSummary: showBatchPreflightSummary");
    expect(modal).toContain("{batchJobs.preflightSummary}");
  });
});
