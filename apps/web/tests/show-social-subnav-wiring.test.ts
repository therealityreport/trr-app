import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show social subnav wiring", () => {
  it("defines second-row social analytics views", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/BRAVO ANALYTICS/);
    expect(contents).toMatch(/SENTIMENT ANALYSIS/);
    expect(contents).toMatch(/HASHTAGS ANALYSIS/);
    expect(contents).toMatch(/ADVANCED ANALYTICS/);
    expect(contents).toMatch(/REDDIT ANALYTICS/);
  });

  it("renders platform tabs above Social Scope in the social first container", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/SHOW_SOCIAL_PLATFORM_TABS\.map/);
    expect(contents).toMatch(/SHOW_SOCIAL_PLATFORM_TABS\.map[\s\S]*Social Scope/);
  });

  it("passes controlled social props to SeasonSocialAnalyticsSection", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/platformTab=\{socialPlatformTab\}/);
    expect(contents).toMatch(/onPlatformTabChange=\{setSocialPlatformTab\}/);
    expect(contents).toMatch(/hidePlatformTabs=\{true\}/);
    expect(contents).toMatch(/analyticsView=\{socialAnalyticsView\}/);
  });
});
