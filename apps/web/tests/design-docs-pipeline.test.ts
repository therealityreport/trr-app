import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  classifyPublisherPatterns,
  extractNavigationData,
  extractSiteShellInteractions,
  extractSocialShareAssets,
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

  it("extracts named social share image slots and NYT shell interaction coverage", () => {
    const sourceHtml = `
      <!doctype html>
      <html lang="en">
        <head>
          <meta property="og:image" content="https://static01.nyt.com/images/2025/04/07/multimedia/2025-04-07-tariff-country-negotiations-index/2025-04-07-tariff-country-negotiations-index-facebookJumbo-v9.png" />
          <meta name="twitter:image" content="https://static01.nyt.com/images/2025/04/07/multimedia/2025-04-07-tariff-country-negotiations-index/2025-04-07-tariff-country-negotiations-index-videoSixteenByNine3000-v6.png" />
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "image": [
                "https://static01.nyt.com/images/2025/04/07/multimedia/2025-04-07-tariff-country-negotiations-index/2025-04-07-tariff-country-negotiations-index-videoSixteenByNineJumbo1600-v9.png",
                "https://static01.nyt.com/images/2025/04/07/multimedia/2025-04-07-tariff-country-negotiations-index/2025-04-07-tariff-country-negotiations-index-googleFourByThree-v7.png"
              ]
            }
          </script>
          <script id="__NEXT_DATA__" type="application/json">
            {
              "props": {
                "pageProps": {
                  "socialImages": [
                    {
                      "url": "https://static01.nyt.com/images/2025/04/07/multimedia/2025-04-07-tariff-country-negotiations-index/2025-04-07-tariff-country-negotiations-index-mediumSquareAt3X-v8.png"
                    }
                  ]
                }
              }
            }
          </script>
        </head>
        <body>
          <div id="interactive-masthead-spacer" style="height: 43px"></div>
          <header>
            <button aria-label="Open section navigation">Menu</button>
            <button aria-label="Open search">Search</button>
            <button aria-label="Account">Account</button>
          </header>
          <nav aria-labelledby="storyline-menu-title">
            <p id="storyline-menu-title">Tariffs and Trade</p>
            <a href="https://www.nytimes.com/2026/04/02/business/economy/trump-metal-pharmaceutical-tariffs.html">Metals and Pharmaceuticals</a>
            <a href="https://www.nytimes.com/2026/03/26/world/europe/eu-trade-deal-us-european-parliament.html">U.S.-E.U. Trade Deal</a>
            <a href="https://www.nytimes.com/2026/03/12/us/politics/trump-tariff-refunds-delay.html">Tariff Refunds</a>
            <a href="https://www.nytimes.com/2026/03/12/business/economy/us-trade-deficit-january.html">U.S. Trade Deficit</a>
            <a href="https://www.nytimes.com/2026/03/12/us/politics/trump-forced-labor-tariffs.html">Trade Investigation</a>
            <a href="https://www.nytimes.com/interactive/2026/business/economy/trump-tariff-tracker.html">Tariff Tracker</a>
          </nav>
          <div role="dialog" aria-label="Section Navigation"></div>
          <div role="dialog" aria-label="Search The New York Times"></div>
          <div role="dialog" aria-label="Account Information"></div>
        </body>
      </html>
    `;
    const articleUrl =
      "https://www.nytimes.com/interactive/2025/04/07/business/economy/trump-tariffs-reaction-china-eu-canada.html";
    const classification = classifyPublisherPatterns({ articleUrl, sourceHtml });

    const socialShareAssets = extractSocialShareAssets({ articleUrl, sourceHtml });
    expect(socialShareAssets.map((asset) => asset.name)).toEqual([
      "facebookJumbo",
      "video16x9-3000",
      "video16x9-1600",
      "google4x3",
      "square3x",
    ]);

    const siteShell = extractSiteShellInteractions({
      articleUrl,
      sourceHtml,
      publisherClassification: classification,
    });

    expect(siteShell.interactionCoverage).toMatchObject({
      mastheadSpacer: true,
      storyline: true,
      menuOverlay: true,
      searchPanel: true,
      accountDrawer: true,
    });
    expect(siteShell.storyline?.primitiveMatchId).toBe("nyt.storyline.tariffs-and-trade.standard");
    expect(siteShell.siteHeader?.primitiveMatchId).toBe("nyt.interactive.header-shell.standard");
  });
});
