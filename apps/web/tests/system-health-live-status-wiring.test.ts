import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("system health live status wiring", () => {
  it("removes the legacy custom health-dot coordinator", () => {
    const contents = readFileSync(
      "/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/SystemHealthModal.tsx",
      "utf8",
    );

    expect(contents).not.toContain("useSharedHealthDot");
    expect(contents).not.toContain("SharedHealthDotPoller");
  });
});
