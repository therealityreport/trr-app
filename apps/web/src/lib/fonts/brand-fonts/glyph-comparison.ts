import glyphComparisonArtifactJson from "./generated/glyph-comparison-results.json" with { type: "json" };
import { normalizeFontKey } from "./normalization.ts";
import type { BrandFontRecord, GlyphComparisonArtifact, GlyphComparisonPair, ScoringMode } from "./types.ts";

export const GLYPH_COMPARISON_SCHEMA_VERSION = "2026-03-23.glyph.v1";

export const GENERATED_GLYPH_COMPARISON_ARTIFACT =
  glyphComparisonArtifactJson as GlyphComparisonArtifact;

export type GlyphComparisonLookup = {
  pairMap: Map<string, GlyphComparisonPair>;
  recordKeySet: Set<string>;
  scoringMode: ScoringMode;
};

function buildRecordKey(
  brandId: string,
  roleLabel: string,
  sourceFamily: string,
): string {
  return `${brandId}::${normalizeFontKey(roleLabel)}::${normalizeFontKey(sourceFamily)}`;
}

function buildSpecificPairKey(
  brandId: string,
  roleLabel: string,
  candidateFamily: string,
): string {
  return `${brandId}::${normalizeFontKey(roleLabel)}::${normalizeFontKey(candidateFamily)}`;
}

function buildGenericPairKey(sourceFamily: string, candidateFamily: string): string {
  return `${normalizeFontKey(sourceFamily)}::${normalizeFontKey(candidateFamily)}`;
}

export function buildGlyphComparisonLookup(
  artifact: GlyphComparisonArtifact | null | undefined,
  expectedInputHash?: string,
): GlyphComparisonLookup {
  if (!artifact || artifact.pairs.length === 0) {
    return { pairMap: new Map(), recordKeySet: new Set(), scoringMode: "metadata-only" };
  }

  if (expectedInputHash && artifact.inputHash !== expectedInputHash) {
    return { pairMap: new Map(), recordKeySet: new Set(), scoringMode: "metadata-only" };
  }

  const pairMap = new Map<string, GlyphComparisonPair>();
  const recordKeySet = new Set<string>();
  for (const pair of artifact.pairs) {
    recordKeySet.add(buildRecordKey(pair.brandId, pair.roleLabel, pair.sourceFamily));
    const specificKey = buildSpecificPairKey(pair.brandId, pair.roleLabel, pair.candidateFamily);
    if (!pairMap.has(specificKey)) {
      pairMap.set(specificKey, pair);
    }
    const genericKey = buildGenericPairKey(pair.sourceFamily, pair.candidateFamily);
    if (!pairMap.has(genericKey)) {
      pairMap.set(genericKey, pair);
    }
  }

  return {
    pairMap,
    recordKeySet,
    scoringMode: "visual+metadata",
  };
}

export function resolveGlyphComparisonPair(
  record: Pick<BrandFontRecord, "brandId" | "roleLabel" | "sourceFontFamily">,
  candidateFamily: string,
  lookup: GlyphComparisonLookup,
): GlyphComparisonPair | null {
  const specific = lookup.pairMap.get(
    buildSpecificPairKey(record.brandId, record.roleLabel, candidateFamily),
  );
  if (specific) return specific;
  return (
    lookup.pairMap.get(buildGenericPairKey(record.sourceFontFamily, candidateFamily)) ?? null
  );
}

export function hasGlyphComparisonsForRecord(
  record: Pick<BrandFontRecord, "brandId" | "roleLabel" | "sourceFontFamily">,
  lookup: GlyphComparisonLookup,
): boolean {
  return lookup.recordKeySet.has(buildRecordKey(record.brandId, record.roleLabel, record.sourceFontFamily));
}

export function isGeneratedGlyphComparisonArtifactCompatible(
  expectedInputHash?: string,
): boolean {
  if (!expectedInputHash) return GENERATED_GLYPH_COMPARISON_ARTIFACT.pairs.length > 0;
  return GENERATED_GLYPH_COMPARISON_ARTIFACT.inputHash === expectedInputHash;
}

export function emptyGlyphComparisonArtifact(
  inputHash = "",
): GlyphComparisonArtifact {
  return {
    schemaVersion: GLYPH_COMPARISON_SCHEMA_VERSION,
    generatedAt: new Date(0).toISOString(),
    algorithm: "canvas-glyph-comparison-v1",
    inputHash,
    pairs: [],
  };
}
