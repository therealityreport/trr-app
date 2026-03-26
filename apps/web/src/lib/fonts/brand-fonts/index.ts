import discoveredArtifact from "@/lib/fonts/brand-fonts/generated/discovered-brand-font-snapshot.json";
import registryArtifact from "@/lib/fonts/brand-fonts/generated/normalized-brand-font-registry.json";
import catalogArtifact from "@/lib/fonts/brand-fonts/generated/normalized-r2-font-catalog.json";
import matchesArtifact from "@/lib/fonts/brand-fonts/generated/brand-font-match-results.json";
import glyphComparisonArtifact from "@/lib/fonts/brand-fonts/generated/glyph-comparison-results.json";
import { BRAND_FONT_MATCH_RULES } from "./seed.ts";
import { buildGlyphComparisonLookup } from "./glyph-comparison.ts";
import { buildBrandFontMatchResults } from "./scoring.ts";
import type {
  BrandFontMatchesApiResponse,
  BrandFontMatchResult,
  BrandFontRecord,
  DiscoveredBrandFontEvidence,
  GeneratedBrandFontArtifacts,
  GeneratedArtifactEnvelope,
  GlyphComparisonArtifact,
  NormalizedR2FontRecord,
  ScoringMode,
} from "./types.ts";

export const GENERATED_BRAND_FONT_DISCOVERED =
  discoveredArtifact as GeneratedArtifactEnvelope<DiscoveredBrandFontEvidence[]>;
export const GENERATED_BRAND_FONT_REGISTRY =
  registryArtifact as GeneratedArtifactEnvelope<BrandFontRecord[]>;
export const GENERATED_BRAND_FONT_CATALOG =
  catalogArtifact as GeneratedArtifactEnvelope<NormalizedR2FontRecord[]>;
export const GENERATED_BRAND_FONT_MATCHES =
  matchesArtifact as GeneratedArtifactEnvelope<BrandFontMatchResult[]>;
export const GENERATED_GLYPH_COMPARISON_ARTIFACT =
  glyphComparisonArtifact as GlyphComparisonArtifact;

function inferScoringMode(matches: readonly BrandFontMatchResult[]): ScoringMode {
  return matches.some((entry) => entry.scoringMode === "visual+metadata")
    ? "visual+metadata"
    : "metadata-only";
}

function inferGeneratedVisualEvidenceHealth() {
  return buildGlyphComparisonLookup(
    GENERATED_GLYPH_COMPARISON_ARTIFACT,
    GENERATED_BRAND_FONT_MATCHES.inputHash,
  ).health;
}

export function buildBrandFontMatchesApiResponse(
  matchesEnvelope: GeneratedArtifactEnvelope<BrandFontMatchResult[]>,
  source: BrandFontMatchesApiResponse["source"],
  scoringMode: ScoringMode = inferScoringMode(matchesEnvelope.data),
  visualEvidence = inferGeneratedVisualEvidenceHealth(),
  counts: { registryCount: number; catalogCount: number } = {
    registryCount: GENERATED_BRAND_FONT_REGISTRY.data.length,
    catalogCount: GENERATED_BRAND_FONT_CATALOG.data.length,
  },
): BrandFontMatchesApiResponse {
  return {
    source,
    refreshMode: source === "live-regenerated" ? "local-rerank" : "artifact",
    scoringMode,
    visualEvidence,
    schemaVersion: matchesEnvelope.schemaVersion,
    scoringConfigVersion: matchesEnvelope.scoringConfigVersion,
    inputHash: matchesEnvelope.inputHash,
    generatedAt: matchesEnvelope.generatedAt,
    registryCount: counts.registryCount,
    catalogCount: counts.catalogCount,
    matchedCount: matchesEnvelope.data.filter((entry) => entry.status === "matched").length,
    matches: matchesEnvelope.data,
  };
}

export function buildBrandFontMatchesApiResponseFromArtifacts(
  artifacts: Pick<GeneratedBrandFontArtifacts, "registry" | "catalog" | "matches" | "scoringMode" | "visualEvidenceHealth">,
  source: BrandFontMatchesApiResponse["source"],
): BrandFontMatchesApiResponse {
  return buildBrandFontMatchesApiResponse(
    artifacts.matches,
    source,
    artifacts.scoringMode,
    artifacts.visualEvidenceHealth,
    {
      registryCount: artifacts.registry.data.length,
      catalogCount: artifacts.catalog.data.length,
    },
  );
}

export function getGeneratedBrandFontMatchesApiResponse(): BrandFontMatchesApiResponse {
  return buildBrandFontMatchesApiResponseFromArtifacts(
    {
      registry: GENERATED_BRAND_FONT_REGISTRY,
      catalog: GENERATED_BRAND_FONT_CATALOG,
      matches: GENERATED_BRAND_FONT_MATCHES,
      scoringMode: inferScoringMode(GENERATED_BRAND_FONT_MATCHES.data),
      visualEvidenceHealth: inferGeneratedVisualEvidenceHealth(),
    },
    "generated-artifact",
  );
}

export function resolveBrandFontMatches(): BrandFontMatchResult[] {
  const generatedMatches = GENERATED_BRAND_FONT_MATCHES.data;
  if (generatedMatches.length > 0) return generatedMatches;
  return buildBrandFontMatchResults(
    GENERATED_BRAND_FONT_REGISTRY.data,
    GENERATED_BRAND_FONT_CATALOG.data,
    BRAND_FONT_MATCH_RULES,
    {
      glyphComparisonArtifact: GENERATED_GLYPH_COMPARISON_ARTIFACT,
      expectedInputHash: GENERATED_BRAND_FONT_MATCHES.inputHash,
    },
  ).matches;
}
