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
});
