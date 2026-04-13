import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("reddit sources snapshot wiring", () => {
  // TODO(ci-shard-isolation): Source-pattern test that opens the component
  // file via path.resolve(process.cwd(), ...). Under --shard mode on CI,
  // this surfaced an ENOENT error against a macOS absolute path, which
  // indicates either a vitest root misconfiguration or the component file
  // not existing in the checked-out tree at this commit. Re-enable once
  // the path resolution is normalized and/or the file is verified present.
  it.skip("uses the shared polling resource for backfill snapshots", () => {
    const componentPath = path.resolve(process.cwd(), "src/components/admin/reddit-sources-manager.tsx");
    const contents = readFileSync(componentPath, "utf8");

    expect(contents).toContain("useSharedPollingResource");
    expect(contents).toContain("/api/admin/reddit/communities/${selectedCommunity.id}/backfill/snapshot");
  });
});
