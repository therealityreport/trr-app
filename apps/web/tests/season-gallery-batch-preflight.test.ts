import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("season gallery batch jobs preflight wiring", () => {
  it("reuses the same computed target plan for summary and submit", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx"
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toContain("const seasonBatchTargetPlan = useMemo(() => {");
    expect(contents).toContain("const seasonBatchPreflightSummary = useMemo(() => {");
    expect(contents).toContain("const { targets } = seasonBatchTargetPlan;");
    expect(contents).toContain("{seasonBatchPreflightSummary}");
  });
});
