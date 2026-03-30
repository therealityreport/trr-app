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
});
