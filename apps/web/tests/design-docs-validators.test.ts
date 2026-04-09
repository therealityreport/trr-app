import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  auditGeneratedConfigIntegrity,
  auditResponsiveAccessibility,
  runDesignDocsIntegrationChecks,
} from "@/lib/admin/design-docs-pipeline-validators";

const articleDetailPath = resolve(
  "/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/design-docs/ArticleDetailPage.tsx",
);
const chartDataPath = resolve(
  "/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/design-docs/chart-data.ts",
);

describe("design docs pipeline validators", () => {
  it("audits generated config integrity against the live design-docs config", async () => {
    const articleDetailPageSource = await readFile(articleDetailPath, "utf8");
    const chartDataSource = await readFile(chartDataPath, "utf8");

    const result = await auditGeneratedConfigIntegrity({
      articleId: "nfl-playoff-coaches-fourth-down",
      articleDetailPageSource,
      chartDataSource,
      typecheckRunner: async () => ({
        passed: true,
        details: ["typecheck stubbed in unit test"],
      }),
    });

    expect(result.passed).toBe(true);
    expect(result.checks.map((entry) => entry.name)).toEqual([
      "typecheck",
      "content block document order",
      "font/color uniqueness",
      "content block union coverage",
      "chart data bindings",
      "social image coverage",
      "reusable primitive coverage",
      "required fields",
      "page background contract",
    ]);
  });

  it("returns deterministic accessibility findings for heading, alt text, contrast, and overflow issues", () => {
    const result = auditResponsiveAccessibility({
      articleId: "fixture-article",
      brandSlug: "fixture-brand",
      fileSources: [
        {
          path: "Fixture.tsx",
          content: `
            <section>
              <h1>Fixture</h1>
              <h3>Skipped heading</h3>
              <img src="/hero.png" />
              <button><svg /></button>
              <div style={{ color: "#777777", background: "#ffffff", whiteSpace: "nowrap", width: 420 }} />
            </section>
          `,
        },
      ],
    });

    expect(result.passed).toBe(false);
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ check: "heading hierarchy", severity: "error" }),
        expect.objectContaining({ check: "alt text", severity: "error" }),
        expect.objectContaining({ check: "interactive labels", severity: "warning" }),
        expect.objectContaining({ check: "responsive overflow", severity: "warning" }),
      ]),
    );
  });

  it("runs the executable integration harness against the current design-docs inventory", async () => {
    const articleDetailPageSource = await readFile(articleDetailPath, "utf8");
    const chartDataSource = await readFile(chartDataPath, "utf8");

    const result = await runDesignDocsIntegrationChecks({
      articleDetailPageSource,
      chartDataSource,
    });

    expect(result.passed).toBe(true);
    expect(result.failedTests).toBe(0);
    expect(result.totalTests).toBeGreaterThan(0);
  });

  it("fails integrity when reusable NYT chrome is inlined instead of referencing primitives and social images are missing", async () => {
    const articleDetailPageSource = await readFile(articleDetailPath, "utf8");
    const chartDataSource = await readFile(chartDataPath, "utf8");

    const result = await auditGeneratedConfigIntegrity({
      articleId: "fixture-nyt-shell-inline",
      articles: [
        {
          id: "fixture-nyt-shell-inline",
          title: "Fixture NYT shell article",
          url: "https://www.nytimes.com/interactive/2025/04/07/business/economy/fixture-shell.html",
          authors: ["Fixture Author"],
          date: "2025-04-07",
          section: "Business",
          type: "interactive",
          ogImage:
            "https://static01.nyt.com/images/2025/04/07/multimedia/2025-04-07-tariff-country-negotiations-index/2025-04-07-tariff-country-negotiations-index-videoSixteenByNine3000-v6.png",
          contentBlocks: [
            {
              type: "site-header-shell",
              title: "Site Header Shell",
              mastheadSpacerHeight: 43,
              subscribeLabel: "Subscribe",
              subscribeHref: "https://www.nytimes.com/subscription",
              accountLabel: "Account",
              menuSections: [],
              searchPanel: {
                title: "Search The New York Times",
                placeholder: "Search...",
                links: [],
              },
              accountPanel: {
                email: "admin@thereality.report",
                greeting: "Hello",
                relationshipCopy: "Relationship copy",
                subscribeLabel: "Subscribe",
                subscribeHref: "https://www.nytimes.com/subscription",
                alternateLoginLabel: "Try a different email",
                alternateLoginHref: "https://myaccount.nytimes.com/auth/login",
                sections: [],
                logoutLabel: "Log out",
                logoutHref: "https://myaccount.nytimes.com/auth/logout",
              },
            },
            {
              type: "storyline",
              title: "Tariffs and Trade",
              links: [
                { label: "Metals and Pharmaceuticals", href: "https://www.nytimes.com/2026/04/02/business/economy/trump-metal-pharmaceutical-tariffs.html" },
                { label: "U.S.-E.U. Trade Deal", href: "https://www.nytimes.com/2026/03/26/world/europe/eu-trade-deal-us-european-parliament.html" },
                { label: "Tariff Refunds", href: "https://www.nytimes.com/2026/03/12/us/politics/trump-tariff-refunds-delay.html" },
                { label: "U.S. Trade Deficit", href: "https://www.nytimes.com/2026/03/12/business/economy/us-trade-deficit-january.html" },
                { label: "Trade Investigation", href: "https://www.nytimes.com/2026/03/12/us/politics/trump-forced-labor-tariffs.html" },
                { label: "Tariff Tracker", href: "https://www.nytimes.com/interactive/2026/business/economy/trump-tariff-tracker.html" },
              ],
            },
            { type: "header" },
            { type: "byline" },
            { type: "author-bio" },
          ],
          architecture: {
            publicAssets: {},
          },
        },
      ],
      articleDetailPageSource,
      chartDataSource,
      typecheckRunner: async () => ({
        passed: true,
        details: ["typecheck stubbed in unit test"],
      }),
    });

    expect(result.passed).toBe(false);
    expect(result.checks.map((entry) => entry.name)).toEqual(
      expect.arrayContaining(["social image coverage", "reusable primitive coverage"]),
    );
    expect(result.blockingErrors.join("\n")).toContain("primitive");
    expect(result.blockingErrors.join("\n")).toContain("socialImages");
  });
});
