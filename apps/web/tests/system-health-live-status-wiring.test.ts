import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("system health live status wiring", () => {
  it("removes the legacy custom health-dot coordinator", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/SystemHealthModal.tsx",
    );
    const contents = readFileSync(filePath, "utf8");

    expect(contents).not.toContain("useSharedHealthDot");
    expect(contents).not.toContain("SharedHealthDotPoller");
  });
});
