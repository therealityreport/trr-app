import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("season social subnav wiring", () => {
  it("defines second-row social analytics views on season social tab", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/BRAVO ANALYTICS/);
    expect(contents).toMatch(/SENTIMENT ANALYSIS/);
    expect(contents).toMatch(/HASHTAGS ANALYSIS/);
    expect(contents).toMatch(/ADVANCED ANALYTICS/);
    expect(contents).toMatch(/REDDIT ANALYTICS/);
  });

  it("passes query-driven social analytics view to SeasonSocialAnalyticsSection", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/const socialAnalyticsView = useMemo<SocialAnalyticsView>/);
    expect(contents).toMatch(/searchParams\.get\("social_view"\)/);
    expect(contents).toMatch(/analyticsView=\{socialAnalyticsView\}/);
  });
});
