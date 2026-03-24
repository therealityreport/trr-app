import { describe, expect, it } from "vitest";

import { GENERATED_GLYPH_COMPARISON_ARTIFACT } from "@/lib/fonts/brand-fonts/glyph-comparison.ts";
import { rankBrandFontCandidates } from "@/lib/fonts/brand-fonts/scoring.ts";
import type {
  BrandFontRecord,
  BrandFontMatchRule,
  GlyphComparisonArtifact,
  NormalizedR2FontRecord,
} from "@/lib/fonts/brand-fonts/types.ts";

describe("brand font matching scoring", () => {
  it("keeps the regenerated KarnakPro-Book to Gloucester visual score below the old inflated range", () => {
    const pair = GENERATED_GLYPH_COMPARISON_ARTIFACT.pairs.find(
      (entry) =>
        entry.brandId === "brand-nyt-games:canonical" &&
        entry.sourceFamily === "nyt-karnak" &&
        entry.candidateFamily === "Gloucester",
    );

    expect(pair).toBeDefined();
    expect(pair?.aggregateVisualAffinity ?? 100).toBeLessThan(80);
    expect(pair?.perWeight[0]?.sentenceScore ?? 100).toBeLessThan(50);
  });

  it("prefers grotesque news-family candidates over generic geometric display faces", () => {
    const record: BrandFontRecord = {
      brandId: "brand-test",
      brandLabel: "Test Brand",
      roleLabel: "Ingredient List",
      roleType: "ui",
      sourceFontFamily: "Franklin Gothic",
      sourceWeightsRaw: ["Regular", "Bold"],
      sourceWeightsNormalized: [400, 700],
      sourceStyles: ["normal"],
      sourceWidthRaw: ["normal"],
      sourceWidthNormalized: ["normal"],
      currentReferenceSubstitute: undefined,
      provenance: "design-doc-jsx",
      confidence: "high",
      evidenceLabel: "Ingredient List",
      evidenceExcerpt: "Ingredient List",
      evidencePath: { type: "file", path: "src/test.tsx" },
      sourceTraitTokens: ["grotesque", "news", "text", "body-safe"],
      evidenceIds: ["brand-test:evidence:1"],
    };

    const catalog: NormalizedR2FontRecord[] = [
      {
        familyName: "Futura Now Display",
        weightsNormalized: [400, 700],
        styles: ["normal"],
        widthsNormalized: ["normal"],
        classification: "sans",
        traitTokens: ["display", "geometric"],
        displayRisk: "low",
        bodyRisk: "medium",
        sourceUrl: "https://example.test/futura.woff2",
      },
      {
        familyName: "Hamburg Serial",
        weightsNormalized: [400, 700],
        styles: ["normal"],
        widthsNormalized: ["normal"],
        classification: "sans",
        traitTokens: ["grotesque", "news", "text", "body-safe", "headline"],
        displayRisk: "medium",
        bodyRisk: "low",
        sourceUrl: "https://example.test/hamburg.woff2",
      },
      {
        familyName: "Gloucester",
        weightsNormalized: [400, 700],
        styles: ["normal"],
        widthsNormalized: ["normal"],
        classification: "serif",
        traitTokens: ["editorial", "text", "body-safe", "traditional"],
        displayRisk: "medium",
        bodyRisk: "low",
        sourceUrl: "https://example.test/gloucester.woff2",
      },
    ];

    const ranked = rankBrandFontCandidates(record, catalog, [] satisfies BrandFontMatchRule[], {
      includeBelowCredible: true,
      limit: 3,
    });

    expect(ranked.map((entry) => entry.familyName)).toEqual([
      "Hamburg Serial",
      "Gloucester",
      "Futura Now Display",
    ]);
    expect(ranked[0]?.rationaleChips).toContain("family-affinity");
    expect(ranked[0]?.scoreBreakdown.profile).toBe("metadata-only");
  });

  it("keeps current substitutes visible without giving them a manual score bonus", () => {
    const record: BrandFontRecord = {
      brandId: "brand-test",
      brandLabel: "Test Brand",
      roleLabel: "Section Labels",
      roleType: "caption",
      sourceFontFamily: "Athletic Sans",
      sourceWeightsRaw: ["Regular"],
      sourceWeightsNormalized: [400],
      sourceStyles: ["normal"],
      sourceWidthRaw: ["normal"],
      sourceWidthNormalized: ["normal"],
      currentReferenceSubstitute: "Franklin Gothic",
      provenance: "design-doc-jsx",
      confidence: "medium",
      evidenceLabel: "Section Labels",
      evidenceExcerpt: "Section Labels",
      evidencePath: { type: "file", path: "src/test.tsx" },
      sourceTraitTokens: ["grotesque", "news", "text", "body-safe"],
      evidenceIds: ["brand-test:evidence:2"],
    };

    const catalog: NormalizedR2FontRecord[] = [
      {
        familyName: "Franklin Gothic",
        weightsNormalized: [400, 700],
        styles: ["normal"],
        widthsNormalized: ["normal"],
        classification: "sans",
        traitTokens: ["grotesque", "news", "text", "body-safe"],
        displayRisk: "medium",
        bodyRisk: "low",
        sourceUrl: "https://example.test/franklin.woff2",
      },
      {
        familyName: "Hamburg Serial",
        weightsNormalized: [400, 700],
        styles: ["normal"],
        widthsNormalized: ["normal"],
        classification: "sans",
        traitTokens: ["grotesque", "news", "text", "body-safe", "headline"],
        displayRisk: "medium",
        bodyRisk: "low",
        sourceUrl: "https://example.test/hamburg.woff2",
      },
    ];

    const rules: BrandFontMatchRule[] = [
      {
        sourceFamily: "Athletic Sans",
        roleTypes: ["caption"],
      },
    ];

    const ranked = rankBrandFontCandidates(record, catalog, rules, {
      includeBelowCredible: true,
      limit: 2,
    });

    expect(ranked[0]?.familyName).toBe("Franklin Gothic");
    expect(ranked[0]?.matchSource).toBe("current-substitute");
    expect(ranked[0]?.scoreBreakdown.ruleBonus).toBe(0);
    expect(ranked[0]?.scoreBreakdown.profile).toBe("metadata-only");
  });

  it("lets visual affinity favor Rude Slab Condensed over Velino without adding a manual preference bonus", () => {
    const record: BrandFontRecord = {
      brandId: "brand-nyt-games:spelling-bee",
      brandLabel: "NYT Games Spelling Bee",
      roleLabel: "nyt-karnakcondensed",
      roleType: "headline",
      sourceFontFamily: "nyt-karnakcondensed",
      sourceWeightsRaw: ["Bold"],
      sourceWeightsNormalized: [700],
      sourceStyles: ["normal"],
      sourceWidthRaw: ["Condensed"],
      sourceWidthNormalized: ["condensed"],
      currentReferenceSubstitute: "Rude Slab Condensed",
      provenance: "explicit-mapping",
      confidence: "medium",
      evidenceLabel: "nyt-karnakcondensed",
      evidenceExcerpt: "nyt-karnakcondensed → Rude Slab · 40px / 700",
      evidencePath: { type: "file", path: "src/test.tsx", lineHint: 12 },
      sourceTraitTokens: ["condensed", "traditional"],
      evidenceIds: ["brand-test:evidence:3"],
    };

    const catalog: NormalizedR2FontRecord[] = [
      {
        familyName: "Velino Compressed Text",
        weightsNormalized: [100, 300, 400, 500, 700, 900],
        styles: ["normal"],
        widthsNormalized: ["extra-condensed"],
        classification: "serif",
        traitTokens: ["body-safe", "condensed", "display", "text", "traditional"],
        displayRisk: "low",
        bodyRisk: "high",
        sourceUrl: "https://example.test/velino.woff2",
      },
      {
        familyName: "Rude Slab Condensed",
        weightsNormalized: [200, 300, 400, 500, 700, 800, 900],
        styles: ["normal", "italic"],
        widthsNormalized: ["condensed"],
        classification: "slab",
        traitTokens: ["condensed", "display", "slab"],
        displayRisk: "low",
        bodyRisk: "high",
        sourceUrl: "https://example.test/rude.woff2",
      },
    ];

    const rules: BrandFontMatchRule[] = [
      {
        sourceFamily: "nyt-karnakcondensed",
        roleTypes: ["headline", "display"],
        requireCondensed: true,
      },
    ];

    const glyphArtifact: GlyphComparisonArtifact = {
      schemaVersion: "test",
      generatedAt: "2026-03-23T12:00:00.000Z",
      algorithm: "canvas-glyph-comparison-v1",
      inputHash: "hash-1",
      pairs: [
        {
          brandId: record.brandId,
          brandLabel: record.brandLabel,
          roleLabel: record.roleLabel,
          roleType: record.roleType,
          sourceFamily: record.sourceFontFamily,
          resolvedSourceFamily: "NYTKarnak_Condensed",
          sourceWeight: 700,
          currentReferenceSubstitute: record.currentReferenceSubstitute,
          candidateFamily: "Rude Slab Condensed",
          aggregateVisualAffinity: 94,
          perWeight: [
            {
              weight: 700,
              overallScore: 94,
              uppercaseScore: 95,
              lowercaseScore: 93,
              numeralScore: 90,
              sentenceScore: 94,
              sentenceComparison: {
                text: "The quick brown fox jumps over the lazy dog 0123456789",
                similarity: 94,
              },
              glyphs: [],
            },
          ],
          kerning: {
            weight: 700,
            pairs: [],
            recommendedLetterSpacingEm: -0.01,
          },
          mostDifferentGlyphs: [],
          mostSimilarGlyphs: [],
        },
        {
          brandId: record.brandId,
          brandLabel: record.brandLabel,
          roleLabel: record.roleLabel,
          roleType: record.roleType,
          sourceFamily: record.sourceFontFamily,
          resolvedSourceFamily: "NYTKarnak_Condensed",
          sourceWeight: 700,
          currentReferenceSubstitute: record.currentReferenceSubstitute,
          candidateFamily: "Velino Compressed Text",
          aggregateVisualAffinity: 42,
          perWeight: [
            {
              weight: 700,
              overallScore: 42,
              uppercaseScore: 40,
              lowercaseScore: 44,
              numeralScore: 41,
              sentenceScore: 43,
              sentenceComparison: {
                text: "The quick brown fox jumps over the lazy dog 0123456789",
                similarity: 43,
              },
              glyphs: [],
            },
          ],
          kerning: {
            weight: 700,
            pairs: [],
            recommendedLetterSpacingEm: 0.01,
          },
          mostDifferentGlyphs: [],
          mostSimilarGlyphs: [],
        },
      ],
    };

    const ranked = rankBrandFontCandidates(
      record,
      catalog,
      rules,
      { includeBelowCredible: true, limit: 2 },
      { glyphComparisonArtifact: glyphArtifact, expectedInputHash: "hash-1" },
    );

    const rude = ranked.find((entry) => entry.familyName === "Rude Slab Condensed");
    const velino = ranked.find((entry) => entry.familyName === "Velino Compressed Text");

    expect(ranked[0]?.familyName).toBe("Rude Slab Condensed");
    expect(rude?.scoringMode).toBe("visual+metadata");
    expect(rude?.scoreBreakdown.profile).toBe("explicit-mapping-visual");
    expect(rude?.scoreBreakdown.visualAffinity ?? 0).toBeGreaterThan(
      velino?.scoreBreakdown.visualAffinity ?? 0,
    );
    expect((rude?.scoreBreakdown.visualTotal ?? 0)).toBeGreaterThan(
      rude?.scoreBreakdown.structuralTotal ?? 0,
    );
    expect(rude?.scoreBreakdown.ruleBonus).toBe(0);
  });

  it("falls back to metadata-only scoring when no glyph artifact is available", () => {
    const record: BrandFontRecord = {
      brandId: "brand-test",
      brandLabel: "Test Brand",
      roleLabel: "Display",
      roleType: "headline",
      sourceFontFamily: "nyt-karnakcondensed",
      sourceWeightsRaw: ["Bold"],
      sourceWeightsNormalized: [700],
      sourceStyles: ["normal"],
      sourceWidthRaw: ["Condensed"],
      sourceWidthNormalized: ["condensed"],
      currentReferenceSubstitute: "Rude Slab Condensed",
      provenance: "explicit-mapping",
      confidence: "medium",
      evidenceLabel: "Display",
      evidenceExcerpt: "Display",
      evidencePath: { type: "file", path: "src/test.tsx" },
      sourceTraitTokens: ["condensed", "traditional"],
      evidenceIds: ["brand-test:evidence:4"],
    };

    const ranked = rankBrandFontCandidates(
      record,
      [
        {
          familyName: "Rude Slab Condensed",
          weightsNormalized: [700],
          styles: ["normal"],
          widthsNormalized: ["condensed"],
          classification: "slab",
          traitTokens: ["condensed", "display", "slab"],
          displayRisk: "low",
          bodyRisk: "high",
          sourceUrl: "https://example.test/rude.woff2",
        },
      ],
      [
        {
          sourceFamily: "nyt-karnakcondensed",
          roleTypes: ["headline"],
          requireCondensed: true,
        },
      ],
      { includeBelowCredible: true, limit: 1 },
      { expectedInputHash: "missing-artifact-hash" },
    );

    expect(ranked[0]?.scoringMode).toBe("metadata-only");
    expect(ranked[0]?.scoreBreakdown.profile).toBe("metadata-only");
    expect(ranked[0]?.scoreBreakdown.visualAffinity).toBe(0);
  });
});
