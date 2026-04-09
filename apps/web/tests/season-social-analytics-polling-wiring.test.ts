import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("season social analytics polling wiring", () => {
  it("polls through the shared snapshot route instead of separate live loops", () => {
    const filePath = path.resolve(__dirname, "../src/components/admin/season-social-analytics-section.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toContain("useSharedPollingResource");
    expect(contents).toContain("/social/analytics/snapshot?");
    expect(contents).toContain("resource: \"live-snapshot\"");
  });
});
