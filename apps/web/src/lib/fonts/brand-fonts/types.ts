export type BrandRoleType =
  | "display"
  | "headline"
  | "subhead"
  | "body"
  | "ui"
  | "caption"
  | "logo-like";

export type BrandFontStyle = "normal" | "italic";
export type BrandFontWidth = "normal" | "condensed" | "extra-condensed" | "expanded";
export type FontClassification = "serif" | "sans" | "slab" | "blackletter" | "mono" | "display" | "unknown";
export type ConfidenceLevel = "high" | "medium" | "low";
export type Provenance =
  | "explicit-mapping"
  | "design-doc-jsx"
  | "manual-inference"
  | "current-substitute";
export type RiskLevel = "low" | "medium" | "high";
export type MatchFitForRole = "strong" | "acceptable" | "risky";
export type MatchSource = "heuristic" | "current-substitute";
export type ScoringMode = "metadata-only" | "visual+metadata";
export type RefreshMode = "artifact" | "local-rerank";
export type CandidateSource = "metadata" | "current-substitute";
export type ScoreBreakdownProfile = "explicit-mapping-visual" | "balanced-visual" | "metadata-only";
export type VisualEvidenceStatus = "fresh" | "stale" | "missing";
export type VisualEvidenceReason =
  | "compatible-glyph-artifact"
  | "input-hash-mismatch"
  | "missing-artifact"
  | "empty-artifact";
export type FontAssetResolutionReason =
  | "exact"
  | "nearest-weight"
  | "style-fallback"
  | "stretch-fallback"
  | "family-alias";

export type TraitToken =
  | "body-safe"
  | "condensed"
  | "display"
  | "editorial"
  | "expanded"
  | "geometric"
  | "grotesque"
  | "headline"
  | "humanist"
  | "masthead"
  | "mono"
  | "news"
  | "slab"
  | "text"
  | "traditional";

export type MatchWarning =
  | "no-italic-support"
  | "partial-weight-coverage"
  | "width-mismatch"
  | "display-only-risk"
  | "body-copy-risk"
  | "substitute-only-match";

export type RationaleChip =
  | "classification-match"
  | "family-affinity"
  | "visual-affinity"
  | "role-match"
  | "width-match"
  | "full-weight-coverage"
  | "italic-supported"
  | "current-substitute"
  | "body-safe"
  | "display-capable";

export type GlyphCategory = "upper" | "lower" | "numeral";

export interface GlyphResult {
  char: string;
  category: GlyphCategory;
  similarity: number;
}

export interface WeightComparison {
  weight: number;
  overallScore: number;
  uppercaseScore: number;
  lowercaseScore: number;
  numeralScore: number;
  sentenceScore: number;
  sentenceComparison: {
    text: string;
    similarity: number;
  };
  glyphs: GlyphResult[];
}

export interface KerningPairResult {
  pair: string;
  sourceKerning: number;
  candidateKerning: number;
  deltaEm: number;
}

export interface KerningAnalysis {
  weight: number;
  pairs: KerningPairResult[];
  recommendedLetterSpacingEm: number;
}

export interface ResolvedFontAsset {
  requestedFamilyName: string;
  resolvedFamilyName: string;
  requestedWeight: number;
  requestedStyle: BrandFontStyle;
  requestedWidth: BrandFontWidth;
  resolvedWeight: number;
  resolvedStyle: BrandFontStyle;
  resolvedWidth: BrandFontWidth;
  sourceUrl: string;
  assetPath: string | null;
  resolutionReason: FontAssetResolutionReason;
}

export interface GlyphComparisonPair {
  brandId: string;
  brandLabel: string;
  roleLabel: string;
  roleType: BrandRoleType;
  sourceFamily: string;
  resolvedSourceFamily?: string;
  sourceWeight?: number;
  currentReferenceSubstitute?: string;
  candidateFamily: string;
  candidateSource: CandidateSource;
  resolvedSourceAsset?: ResolvedFontAsset;
  resolvedCandidateAsset?: ResolvedFontAsset;
  aggregateVisualAffinity: number;
  perWeight: WeightComparison[];
  kerning: KerningAnalysis;
  mostDifferentGlyphs: GlyphResult[];
  mostSimilarGlyphs: GlyphResult[];
}

export interface GlyphComparisonArtifact {
  schemaVersion: string;
  generatedAt: string;
  algorithm: "canvas-glyph-comparison-v1";
  inputHash: string;
  pairs: GlyphComparisonPair[];
}

export interface ScoreBreakdown {
  profile: ScoreBreakdownProfile;
  classification: number;
  role: number;
  width: number;
  weightCoverage: number;
  styleSupport: number;
  traitCompatibility: number;
  familyName: number;
  visualAffinity: number;
  ruleBonus: number;
  riskPenalty: number;
  structuralTotal: number;
  identityTotal: number;
  visualTotal: number;
  penaltyTotal: number;
  total: number;
}

export interface VisualMatchDiagnostics {
  aggregateVisualAffinity: number;
  resolvedSourceFamily?: string;
  sourceAsset?: ResolvedFontAsset;
  candidateAsset?: ResolvedFontAsset;
}

export interface VisualEvidenceHealth {
  status: VisualEvidenceStatus;
  reason: VisualEvidenceReason;
  compatible: boolean;
  generatedAt: string | null;
  inputHash: string | null;
}

export type EvidencePath =
  | { type: "file"; path: string; anchor?: string; lineHint?: number }
  | { type: "url"; href: string };

export interface DiscoveredBrandFontEvidence {
  id: string;
  brandId: string;
  brandLabel: string;
  kind: "specimen-meta" | "jsx-label" | "mapping-line";
  text: string;
  normalizedText: string;
  sourcePath: string;
  line: number;
  anchor?: string;
}

export interface BrandFontSeed {
  brandId: string;
  brandLabel: string;
  roleLabel: string;
  roleType: BrandRoleType;
  sourceFontFamily: string;
  sourceWeightsRaw: string[];
  sourceStyles: BrandFontStyle[];
  sourceWidthRaw: string[];
  currentReferenceSubstitute?: string;
  provenance: Provenance;
  confidence: ConfidenceLevel;
  sourceTraitTokens?: TraitToken[];
  evidenceIds: string[];
  evidenceNote?: string;
}

export interface BrandFontRecord {
  brandId: string;
  brandLabel: string;
  roleLabel: string;
  roleType: BrandRoleType;
  sourceFontFamily: string;
  sourceWeightsRaw: string[];
  sourceWeightsNormalized: number[];
  sourceStyles: BrandFontStyle[];
  sourceWidthRaw: string[];
  sourceWidthNormalized: BrandFontWidth[];
  currentReferenceSubstitute?: string;
  provenance: Provenance;
  confidence: ConfidenceLevel;
  evidenceLabel: string;
  evidenceExcerpt: string;
  evidenceNote?: string;
  evidencePath: EvidencePath;
  sourceTraitTokens: TraitToken[];
  evidenceIds: string[];
}

export interface NormalizedR2FontRecord {
  familyName: string;
  weightsNormalized: number[];
  styles: BrandFontStyle[];
  widthsNormalized: BrandFontWidth[];
  classification: FontClassification;
  traitTokens: TraitToken[];
  displayRisk: RiskLevel;
  bodyRisk: RiskLevel;
  sourceUrl: string;
}

export interface BrandFontMatchRule {
  sourceFamily: string;
  roleTypes?: BrandRoleType[];
  preferFamily?: string[];
  excludeFamily?: string[];
  capScore?: number;
  requireItalic?: boolean;
  requireCondensed?: boolean;
  requireExpanded?: boolean;
  preferCurrentSubstituteAsTieBreakOnly?: boolean;
  forceTopMatch?: string;
  demoteDisplayOnlyForBody?: boolean;
}

export interface BrandFontMatch {
  familyName: string;
  score: number;
  fitForRole: MatchFitForRole;
  matchWarnings: MatchWarning[];
  rationaleChips: RationaleChip[];
  matchSource: MatchSource;
  scoreBreakdown: ScoreBreakdown;
  scoringMode: ScoringMode;
  visualDiagnostics?: VisualMatchDiagnostics;
}

export interface BrandFontMatchResult {
  brandId: string;
  brandLabel: string;
  roleLabel: string;
  roleType: BrandRoleType;
  sourceFontFamily: string;
  currentReferenceSubstitute?: string;
  provenance: Provenance;
  confidence: ConfidenceLevel;
  evidenceLabel: string;
  evidenceExcerpt: string;
  evidenceNote?: string;
  evidencePath: EvidencePath;
  matches: BrandFontMatch[];
  status: "matched" | "no-credible-match";
  scoringMode: ScoringMode;
}

export interface GeneratedArtifactEnvelope<T> {
  schemaVersion: string;
  inputHash: string;
  generatedAt: string;
  scoringConfigVersion: string;
  data: T;
}

export interface GeneratedBrandFontArtifacts {
  discovered: GeneratedArtifactEnvelope<DiscoveredBrandFontEvidence[]>;
  registry: GeneratedArtifactEnvelope<BrandFontRecord[]>;
  catalog: GeneratedArtifactEnvelope<NormalizedR2FontRecord[]>;
  matches: GeneratedArtifactEnvelope<BrandFontMatchResult[]>;
  scoringMode: ScoringMode;
  visualEvidenceHealth: VisualEvidenceHealth;
}

export interface BrandFontMatchesApiResponse {
  source: "generated-artifact" | "live-regenerated";
  refreshMode: RefreshMode;
  scoringMode: ScoringMode;
  visualEvidence: VisualEvidenceHealth;
  schemaVersion: string;
  scoringConfigVersion: string;
  inputHash: string;
  generatedAt: string;
  registryCount: number;
  catalogCount: number;
  matchedCount: number;
  matches: BrandFontMatchResult[];
}
