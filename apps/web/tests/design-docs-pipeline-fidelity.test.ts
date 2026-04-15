import { describe, expect, it } from "vitest";

import {
  classifyPublisherPatterns,
  extractVisualContract,
  mergeDesignDocsExtractionOutputs,
} from "@/lib/admin/design-docs-pipeline";

describe("design docs pipeline bespoke fidelity helpers", () => {
  it("detects bespoke interactive pages and requires a visual contract", () => {
    const sourceHtml = `
      <html>
        <body>
          <svg><g><rect width="10" height="10"></rect></g></svg>
          <script>window.app = {}; d3.select("svg");</script>
        </body>
      </html>
    `;

    const result = classifyPublisherPatterns({
      articleUrl: "https://www.nytimes.com/interactive/2020/02/25/us/elections/debate-speaking-time.html",
      sourceHtml,
    });

    expect(result.bespokeInteractive).toBe(true);
    expect(result.requiresVisualContract).toBe(true);
    expect(result.extractionPlan.required).toContain("extract-visual-contract");
  });

  it("extracts the debate visual contract with typed chart variants", () => {
    const publisherClassification = classifyPublisherPatterns({
      articleUrl: "https://www.nytimes.com/interactive/2020/02/25/us/elections/debate-speaking-time.html",
      sourceHtml: `<html><body><h1>Which Candidates Got the Most Speaking Time in the Democratic Debate</h1><svg></svg></body></html>`,
    });

    const contract = extractVisualContract({
      articleUrl: "https://www.nytimes.com/interactive/2020/02/25/us/elections/debate-speaking-time.html",
      sourceHtml: `<html><body><h1>Which Candidates Got the Most Speaking Time in the Democratic Debate</h1><svg></svg></body></html>`,
      publisherClassification,
    });

    expect(contract).not.toBeNull();
    expect(contract?.charts.map((entry) => entry.rendererKind)).toEqual(["bar-chart", "bubble-chart"]);
    expect(contract?.chrome.deckBehavior).toBe("source-only");
  });

  it("marks merged bespoke outputs without a visual contract as legacy fidelity mode", () => {
    const publisherClassification = classifyPublisherPatterns({
      articleUrl: "https://www.nytimes.com/interactive/2020/02/25/us/elections/debate-speaking-time.html",
      sourceHtml: `<html><body><svg></svg></body></html>`,
    });

    const merged = mergeDesignDocsExtractionOutputs({
      articleUrl: "https://www.nytimes.com/interactive/2020/02/25/us/elections/debate-speaking-time.html",
      sourceHtml: `<html><body><svg></svg></body></html>`,
      publisherClassification,
      navigationData: {
        header: {
          logo: null,
          primaryNav: [],
          sticky: false,
          height: "auto",
          background: "#fff",
          textColor: "#121212",
        },
        footer: {
          columns: [],
          legalText: "",
          socialLinks: [],
          policyLinks: [],
          background: "#121212",
          textColor: "#fff",
        },
      },
      visualContract: null,
    });

    expect(merged.legacyFidelityMode).toBe(true);
    expect(merged.visualContract).toBeNull();
  });
});
