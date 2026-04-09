import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("cast socialblade snapshot wiring", () => {
  it("uses the shared polling resource for pending refresh polling", () => {
    const contents = readFileSync(
      "/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/cast-socialblade-comparison.tsx",
      "utf8",
    );

    expect(contents).toContain("useSharedPollingResource");
    expect(contents).toContain("/api/admin/trr-api/social-growth/cast-comparison/snapshot");
  });
});
