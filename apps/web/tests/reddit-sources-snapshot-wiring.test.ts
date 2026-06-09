import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("reddit sources snapshot wiring", () => {
  it("uses the shared polling resource for backfill snapshots", () => {
    const componentPath = path.resolve(process.cwd(), "src/components/admin/reddit-sources-manager.tsx");
    const contents = readFileSync(componentPath, "utf8");

    expect(contents).toContain("useSharedPollingResource");
    expect(contents).toContain("/api/admin/reddit/communities/${selectedCommunity.id}/backfill/snapshot");
  });
});
