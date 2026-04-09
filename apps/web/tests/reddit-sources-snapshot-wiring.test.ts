import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("reddit sources snapshot wiring", () => {
  it("uses the shared polling resource for backfill snapshots", () => {
    const contents = readFileSync(
      "/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/reddit-sources-manager.tsx",
      "utf8",
    );

    expect(contents).toContain("useSharedPollingResource");
    expect(contents).toContain("/api/admin/reddit/communities/${selectedCommunity.id}/backfill/snapshot");
  });
});
