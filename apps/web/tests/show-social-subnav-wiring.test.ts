import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show social subnav wiring", () => {
  it("defines second-row social analytics views", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/OFFICIAL ANALYTICS/);
    expect(contents).toMatch(/SENTIMENT ANALYSIS/);
    expect(contents).toMatch(/HASHTAGS ANALYSIS/);
    expect(contents).toMatch(/ADVANCED ANALYTICS/);
    expect(contents).toMatch(/REDDIT ANALYTICS/);
  });

  it("renders platform tabs above Social Scope in the social first container", () => {
    const pagePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const constantsPath = path.resolve(__dirname, "../src/lib/admin/show-page/constants.ts");
    const socialTabPath = path.resolve(__dirname, "../src/components/admin/show-tabs/ShowSocialTab.tsx");
    const pageContents = fs.readFileSync(pagePath, "utf8");
    const constantsContents = fs.readFileSync(constantsPath, "utf8");
    const socialTabContents = fs.readFileSync(socialTabPath, "utf8");

    expect(pageContents).toMatch(/from "@\/lib\/admin\/show-page\/constants"/);
    expect(pageContents).toMatch(/SHOW_SOCIAL_PLATFORM_TABS/);
    expect(pageContents).toMatch(/socialPlatformOptions=\{SHOW_SOCIAL_PLATFORM_TABS\}/);
    expect(constantsContents).toMatch(/\{ key: "facebook", label: "Facebook" \}/);
    expect(constantsContents).toMatch(/\{ key: "threads", label: "Threads" \}/);
    expect(pageContents).toMatch(/socialPlatformTab=\{socialPlatformTab\}/);
    expect(pageContents).toMatch(/isRedditView=\{socialAnalyticsView === "reddit"\}/);
    expect(pageContents).toMatch(/onSelectSocialPlatformTab=\{setSocialPlatformTab\}/);
    expect(socialTabContents).toMatch(/Social Scope/);
    expect(socialTabContents).toMatch(/!isRedditView/);
    expect(socialTabContents).toMatch(/\{selectedSocialSeason \? \(/);
  });

  it("passes controlled social props to SeasonSocialAnalyticsSection", () => {
    const pagePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(pagePath, "utf8");

    expect(contents).toMatch(/platformTab=\{socialPlatformTab\}/);
    expect(contents).toMatch(/onPlatformTabChange=\{setSocialPlatformTab\}/);
    expect(contents).toMatch(/hidePlatformTabs=\{true\}/);
    expect(contents).toMatch(/analyticsView=\{socialAnalyticsView\}/);
  });
});
