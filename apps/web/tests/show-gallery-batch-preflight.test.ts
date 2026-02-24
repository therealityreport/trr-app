import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show gallery batch jobs preflight wiring", () => {
  it("reuses the same computed target plan for summary and submit", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/page.tsx"
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toContain("const showBatchTargetPlan = useMemo(() => {");
    expect(contents).toContain("const showBatchPreflightSummary = useMemo(() => {");
    expect(contents).toContain("const { targets } = showBatchTargetPlan;");
    expect(contents).toContain("{showBatchPreflightSummary}");
  });
});
