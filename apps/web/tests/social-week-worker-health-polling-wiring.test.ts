import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("social week worker-health polling wiring", () => {
  it("uses the week snapshot route with shared polling", () => {
    const filePath = path.resolve(__dirname, "../src/components/admin/social-week/WeekDetailPageView.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toContain("useSharedPollingResource");
    expect(contents).toContain("/social/analytics/week/${weekIndex}/snapshot?");
    expect(contents).toContain("week-social-snapshot:");
  });
});
