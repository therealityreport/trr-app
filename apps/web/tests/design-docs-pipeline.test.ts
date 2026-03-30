import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  classifyPublisherPatterns,
  extractNavigationData,
  mergeDesignDocsExtractionOutputs,
} from "@/lib/admin/design-docs-pipeline";

const fixturesDir = resolve("/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/fixtures/design-docs-agent");

describe("design docs pipeline extraction helpers", () => {
  it("classifies NYT interactive HTML and produces extraction routing", async () => {
    const sourceHtml = await readFile(resolve(fixturesDir, "nyt-interactive.html"), "utf8");
    const classification = classifyPublisherPatterns({
      articleUrl: "https://www.nytimes.com/interactive/2026/01/19/business/economy/trump-economy.html",
      sourceHtml,
    });

    expect(classification.layoutFamily).toBe("nyt-interactive");
    expect(classification.techInventory.frameworks.map((entry) => entry.name)).toEqual(
      expect.arrayContaining(["Next.js", "Birdkit"]),
    );
    expect(classification.taxonomyMapping.sections["4-navigation"]?.discovered).toBe(true);
    expect(classification.taxonomyMapping.sections["11-dev-stack"]?.discovered).toBe(true);
    expect(classification.extractionPlan.required).toEqual(
      expect.arrayContaining(["extract-page-structure", "extract-css-tokens", "extract-navigation"]),
    );
    expect(classification.extractionPlan.conditional).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ skill: "extract-datawrapper-charts" }),
        expect.objectContaining({ skill: "extract-ai2html-artboards" }),
      ]),
    );
  });

  it("classifies Athletic article HTML and extracts navigation chrome", async () => {
    const sourceHtml = await readFile(resolve(fixturesDir, "athletic-article.html"), "utf8");
    const classification = classifyPublisherPatterns({
      articleUrl: "https://www.nytimes.com/athletic/6932205/2026/01/07/nfl-playoffs-super-bowl-afc-champion/",
      sourceHtml,
    });
    const navigation = extractNavigationData({
      articleUrl: "https://www.nytimes.com/athletic/6932205/2026/01/07/nfl-playoffs-super-bowl-afc-champion/",
      sourceHtml,
      publisherClassification: classification,
    });

    expect(classification.layoutFamily).toBe("athletic-article");
    expect(navigation.header.logo).toEqual(
      expect.objectContaining({
        type: "img",
        content: expect.stringContaining("cdn-media.theathletic.com/logo.svg"),
      }),
    );
    expect(navigation.header.primaryNav.map((entry) => entry.label)).toEqual(["NFL", "NBA", "MLB"]);
    expect(navigation.sidebar?.items.map((entry) => entry.label)).toEqual(["NFL Home", "NBA Home"]);
    expect(navigation.tabs?.items.map((entry) => entry.label)).toEqual(["Story", "Stats"]);
    expect(navigation.dropdownMenus?.[0]?.items.map((entry) => entry.label)).toEqual(["NFL", "NBA"]);
  });

  it("merges extraction outputs into the shared pipeline contract", async () => {
    const sourceHtml = await readFile(resolve(fixturesDir, "nyt-article.html"), "utf8");
    const classification = classifyPublisherPatterns({
      articleUrl: "https://www.nytimes.com/2026/01/18/style/fixture.html",
      sourceHtml,
    });
    const navigation = extractNavigationData({
      articleUrl: "https://www.nytimes.com/2026/01/18/style/fixture.html",
      sourceHtml,
    });

    const merged = mergeDesignDocsExtractionOutputs({
      articleUrl: "https://www.nytimes.com/2026/01/18/style/fixture.html",
      sourceHtml,
      publisherClassification: classification,
      navigationData: navigation,
      extractionOutputs: {
        "extract-page-structure": { blockCompleteness: 0.95 },
      },
      blockCompleteness: 0.95,
    });

    expect(merged.sourceHtmlLength).toBe(sourceHtml.length);
    expect(merged.publisherClassification.layoutFamily).toBe("nyt-article");
    expect(merged.navigationData.header.primaryNav.length).toBeGreaterThanOrEqual(3);
    expect(merged.blockCompleteness).toBe(0.95);
  });
});
