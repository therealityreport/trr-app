import {
  buildGlyphComparisonLookup,
  GENERATED_GLYPH_COMPARISON_ARTIFACT,
  hasGlyphComparisonsForRecord,
  resolveGlyphComparisonPair,
} from "./glyph-comparison.ts";
import type {
  BrandFontMatch,
  BrandFontMatchResult,
  BrandFontMatchRule,
  BrandFontRecord,
  GlyphComparisonArtifact,
  MatchSource,
  MatchWarning,
  NormalizedR2FontRecord,
  RationaleChip,
  ScoreBreakdown,
  ScoreBreakdownProfile,
  ScoringMode,
} from "./types.ts";
import {
  extractFamilySimilarityTokens,
  inferFontClassification,
  MINIMUM_CREDIBLE_MATCH_SCORE,
  fitForRoleFromScore,
  hasItalicSupport,
  normalizeFontKey,
  roleSupportsDisplay,
} from "./normalization.ts";

const CLASSIFICATION_MAX = 18;
const ROLE_MAX = 20;
const WIDTH_MAX = 15;
const WEIGHT_COVERAGE_MAX = 15;
const STYLE_SUPPORT_MAX = 10;
const TRAIT_COMPATIBILITY_MAX = 10;
const FAMILY_AFFINITY_MAX = 20;
const VISUAL_AFFINITY_MAX = 15;

type WeightedProfile = {
  name: ScoreBreakdownProfile;
  structuralWeights: {
    classification: number;
    role: number;
    width: number;
    weightCoverage: number;
    styleSupport: number;
    traitCompatibility: number;
  };
  identityWeight: number;
  visualWeight: number;
};

const WEIGHTED_PROFILES: Record<ScoreBreakdownProfile, WeightedProfile> = {
  "explicit-mapping-visual": {
    name: "explicit-mapping-visual",
    structuralWeights: {
      classification: 6,
      role: 10,
      width: 10,
      weightCoverage: 7,
      styleSupport: 4,
      traitCompatibility: 3,
    },
    identityWeight: 5,
    visualWeight: 55,
  },
  "balanced-visual": {
    name: "balanced-visual",
    structuralWeights: {
      classification: 12,
      role: 18,
      width: 14,
      weightCoverage: 10,
      styleSupport: 6,
      traitCompatibility: 5,
    },
    identityWeight: 10,
    visualWeight: 25,
  },
  "metadata-only": {
    name: "metadata-only",
    structuralWeights: {
      classification: 17,
      role: 25,
      width: 19,
      weightCoverage: 14,
      styleSupport: 8,
      traitCompatibility: 7,
    },
    identityWeight: 10,
    visualWeight: 0,
  },
};

export type RankingScoringOptions = {
  glyphComparisonArtifact?: GlyphComparisonArtifact | null;
  expectedInputHash?: string;
};

function resolveRule(record: BrandFontRecord, rules: readonly BrandFontMatchRule[]): BrandFontMatchRule | null {
  const sourceKey = normalizeFontKey(record.sourceFontFamily);
  return (
    rules.find((rule) => {
      if (normalizeFontKey(rule.sourceFamily) !== sourceKey) return false;
      if (!rule.roleTypes?.length) return true;
      return rule.roleTypes.includes(record.roleType);
    }) ?? null
  );
}

function candidateSupportsCondensed(candidate: NormalizedR2FontRecord): boolean {
  return (
    candidate.widthsNormalized.includes("condensed") ||
    candidate.widthsNormalized.includes("extra-condensed")
  );
}

function classificationScore(source: BrandFontRecord, candidate: NormalizedR2FontRecord): number {
  const sourceKey = normalizeFontKey(source.sourceFontFamily);
  const condensedCandidate = candidateSupportsCondensed(candidate);

  if (sourceKey === "nytkarnakcondensed") {
    if (candidate.classification === "serif") {
      return condensedCandidate ? 12 : 8;
    }
    if (candidate.classification === "slab") {
      return condensedCandidate ? 12 : 8;
    }
    return 0;
  }

  if (sourceKey.includes("slab") && candidate.classification === "slab") return CLASSIFICATION_MAX;
  if (sourceKey.includes("gothic") && candidate.classification === "sans") return CLASSIFICATION_MAX;
  if (sourceKey.includes("sans") && candidate.classification === "sans") return CLASSIFICATION_MAX;
  if (sourceKey.includes("mono") && candidate.classification === "mono") return CLASSIFICATION_MAX;
  if (sourceKey.includes("blackletter") && candidate.classification === "blackletter") return CLASSIFICATION_MAX;
  if (
    (sourceKey.includes("cheltenham") || sourceKey.includes("gloucester") || sourceKey.includes("karnak")) &&
    candidate.classification === "serif"
  ) {
    return CLASSIFICATION_MAX;
  }

  const sourceClassification = inferFontClassification(source.sourceFontFamily);
  if (sourceClassification !== "unknown" && sourceClassification === candidate.classification) {
    return CLASSIFICATION_MAX;
  }
  if (candidate.classification === "unknown") return 6;
  if (candidate.classification === "display" && roleSupportsDisplay(source.roleType)) return 10;
  return 0;
}

function roleScore(source: BrandFontRecord, candidate: NormalizedR2FontRecord): number {
  if (source.roleType === "body") {
    return candidate.bodyRisk === "low" ? ROLE_MAX : candidate.bodyRisk === "medium" ? 10 : 0;
  }
  if (roleSupportsDisplay(source.roleType)) {
    return candidate.displayRisk === "low" ? ROLE_MAX : candidate.displayRisk === "medium" ? 12 : 4;
  }
  if (source.roleType === "caption" || source.roleType === "ui") {
    return candidate.bodyRisk === "low" ? 16 : candidate.bodyRisk === "medium" ? 10 : 4;
  }
  return 12;
}

function widthScore(source: BrandFontRecord, candidate: NormalizedR2FontRecord): number {
  const sourceHasCondensed =
    source.sourceWidthNormalized.includes("condensed") || source.sourceWidthNormalized.includes("extra-condensed");
  const sourceHasExpanded = source.sourceWidthNormalized.includes("expanded");
  const candidateHasCondensed = candidateSupportsCondensed(candidate);
  const candidateHasExpanded = candidate.widthsNormalized.includes("expanded");

  if (sourceHasCondensed === candidateHasCondensed && sourceHasExpanded === candidateHasExpanded) return WIDTH_MAX;
  if ((sourceHasCondensed && candidateHasCondensed) || (sourceHasExpanded && candidateHasExpanded)) return 12;
  return 0;
}

function weightCoverageScore(source: BrandFontRecord, candidate: NormalizedR2FontRecord): number {
  const sourceWeights = source.sourceWeightsNormalized;
  if (sourceWeights.length === 0) return 8;
  const matchedCount = sourceWeights.filter((weight) => candidate.weightsNormalized.includes(weight)).length;
  const ratio = matchedCount / sourceWeights.length;
  if (ratio === 1) return WEIGHT_COVERAGE_MAX;
  if (ratio >= 0.5) return 8;
  if (ratio > 0) return 4;
  return 0;
}

function styleSupportScore(source: BrandFontRecord, candidate: NormalizedR2FontRecord): number {
  const sourceNeedsItalic = source.sourceStyles.includes("italic");
  if (!sourceNeedsItalic) return STYLE_SUPPORT_MAX;
  return hasItalicSupport(candidate.styles) ? STYLE_SUPPORT_MAX : 0;
}

function traitCompatibilityScore(source: BrandFontRecord, candidate: NormalizedR2FontRecord): number {
  const intersections = source.sourceTraitTokens.filter((token) => candidate.traitTokens.includes(token)).length;
  if (intersections >= 3) return TRAIT_COMPATIBILITY_MAX;
  if (intersections === 2) return 7;
  if (intersections === 1) return 4;
  return 0;
}

function countSharedTokens(left: readonly string[], right: readonly string[]): number {
  const rightSet = new Set(right);
  return left.filter((token) => rightSet.has(token)).length;
}

function familyNameScore(
  source: BrandFontRecord,
  candidate: NormalizedR2FontRecord,
): number {
  const sourceKey = normalizeFontKey(source.sourceFontFamily);
  const candidateKey = normalizeFontKey(candidate.familyName);

  if (sourceKey === candidateKey) return FAMILY_AFFINITY_MAX;
  if (sourceKey.includes(candidateKey) || candidateKey.includes(sourceKey)) return 16;

  const sourceTokens = extractFamilySimilarityTokens(source.sourceFontFamily);
  const candidateTokens = extractFamilySimilarityTokens(candidate.familyName);
  const sourceOverlap = countSharedTokens(sourceTokens, candidateTokens);

  if (sourceOverlap >= 3) return 18;
  if (sourceOverlap === 2) return 14;
  if (sourceOverlap === 1) return 8;
  return 0;
}

function riskPenalty(source: BrandFontRecord, candidate: NormalizedR2FontRecord, rule: BrandFontMatchRule | null): number {
  if (rule?.demoteDisplayOnlyForBody && source.roleType === "body" && candidate.bodyRisk === "high") {
    return 20;
  }
  if (source.roleType === "body") {
    return candidate.bodyRisk === "high" ? 20 : candidate.bodyRisk === "medium" ? 10 : 0;
  }
  if (roleSupportsDisplay(source.roleType)) {
    return candidate.displayRisk === "high" ? 20 : candidate.displayRisk === "medium" ? 10 : 0;
  }
  return candidate.bodyRisk === "high" ? 20 : candidate.bodyRisk === "medium" ? 10 : 0;
}

function dedupe<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function buildWarnings(source: BrandFontRecord, candidate: NormalizedR2FontRecord): MatchWarning[] {
  const warnings: MatchWarning[] = [];
  if (source.sourceStyles.includes("italic") && !hasItalicSupport(candidate.styles)) {
    warnings.push("no-italic-support");
  }
  const matchedCount = source.sourceWeightsNormalized.filter((weight) => candidate.weightsNormalized.includes(weight)).length;
  if (matchedCount < source.sourceWeightsNormalized.length) {
    warnings.push("partial-weight-coverage");
  }
  const sourceCondensed = source.sourceWidthNormalized.some((value) => value !== "normal");
  const candidateCondensed = candidate.widthsNormalized.some((value) => value !== "normal");
  if (sourceCondensed !== candidateCondensed) {
    warnings.push("width-mismatch");
  }
  if (candidate.displayRisk === "high" && roleSupportsDisplay(source.roleType)) {
    warnings.push("display-only-risk");
  }
  if (candidate.bodyRisk === "high" && (source.roleType === "body" || source.roleType === "ui" || source.roleType === "caption")) {
    warnings.push("body-copy-risk");
  }
  if (source.provenance === "current-substitute") {
    warnings.push("substitute-only-match");
  }
  return dedupe(warnings);
}

function buildLookup(
  glyphArtifact: GlyphComparisonArtifact | null | undefined,
  expectedInputHash?: string,
) {
  return buildGlyphComparisonLookup(glyphArtifact ?? GENERATED_GLYPH_COMPARISON_ARTIFACT, expectedInputHash);
}

function visualAffinityScore(
  source: BrandFontRecord,
  candidate: NormalizedR2FontRecord,
  lookup: ReturnType<typeof buildLookup>,
): { score: number; scoringMode: ScoringMode; aggregateVisualAffinity: number } {
  const pair = resolveGlyphComparisonPair(source, candidate.familyName, lookup);
  if (!pair) {
    return { score: 0, scoringMode: "metadata-only", aggregateVisualAffinity: 0 };
  }
  return {
    score: Math.round((pair.aggregateVisualAffinity / 100) * VISUAL_AFFINITY_MAX),
    scoringMode: lookup.scoringMode,
    aggregateVisualAffinity: pair.aggregateVisualAffinity,
  };
}

function buildRationaleChips(
  source: BrandFontRecord,
  candidate: NormalizedR2FontRecord,
  sourceScore: number,
  rawScores: {
    classification: number;
    role: number;
    width: number;
    weightCoverage: number;
    visualAffinity: number;
    familyName: number;
  },
): RationaleChip[] {
  const chips: RationaleChip[] = [];
  if (rawScores.classification >= 12) chips.push("classification-match");
  if (rawScores.familyName >= 14) chips.push("family-affinity");
  if (rawScores.visualAffinity >= 10) chips.push("visual-affinity");
  if (rawScores.role >= 16) chips.push("role-match");
  if (rawScores.width >= 12) chips.push("width-match");
  if (rawScores.weightCoverage === WEIGHT_COVERAGE_MAX) chips.push("full-weight-coverage");
  if (source.sourceStyles.includes("italic") && hasItalicSupport(candidate.styles)) chips.push("italic-supported");
  if (
    source.currentReferenceSubstitute &&
    normalizeFontKey(source.currentReferenceSubstitute) === normalizeFontKey(candidate.familyName)
  ) {
    chips.push("current-substitute");
  }
  if (candidate.bodyRisk === "low") chips.push("body-safe");
  if (candidate.displayRisk === "low" && sourceScore >= MINIMUM_CREDIBLE_MATCH_SCORE) chips.push("display-capable");
  return dedupe(chips);
}

function roundWeighted(value: number): number {
  return Math.round(value * 10) / 10;
}

function normalizedContribution(raw: number, max: number, weight: number): number {
  if (max <= 0 || weight <= 0) return 0;
  return roundWeighted((raw / max) * weight);
}

function selectWeightedProfile(
  source: BrandFontRecord,
  hasRecordVisualEvidence: boolean,
): WeightedProfile {
  if (!hasRecordVisualEvidence) {
    return WEIGHTED_PROFILES["metadata-only"];
  }
  if (source.provenance === "explicit-mapping") {
    return WEIGHTED_PROFILES["explicit-mapping-visual"];
  }
  return WEIGHTED_PROFILES["balanced-visual"];
}

type ScoredCandidate = {
  candidate: NormalizedR2FontRecord;
  score: number;
  breakdown: ScoreBreakdown;
  rawScores: {
    classification: number;
    role: number;
    width: number;
    weightCoverage: number;
    visualAffinity: number;
    familyName: number;
  };
  currentSubstituteTop: boolean;
  scoringMode: ScoringMode;
};

export type RankedBrandFontCandidate = BrandFontMatch & {
  sourceUrl: string;
  familyScore: number;
};

function scoreCandidate(
  source: BrandFontRecord,
  candidate: NormalizedR2FontRecord,
  rule: BrandFontMatchRule | null,
  lookup: ReturnType<typeof buildLookup>,
  hasRecordVisualEvidence: boolean,
): ScoredCandidate | null {
  if (rule?.excludeFamily?.some((family) => normalizeFontKey(family) === normalizeFontKey(candidate.familyName))) {
    return null;
  }
  const candidateIsCondensed = candidateSupportsCondensed(candidate);
  const candidateIsExpanded = candidate.widthsNormalized.includes("expanded");
  if (rule?.requireItalic && !hasItalicSupport(candidate.styles)) return null;
  if (rule?.requireCondensed && !candidateIsCondensed) return null;
  if (rule?.requireExpanded && !candidateIsExpanded) return null;

  const classification = classificationScore(source, candidate);
  const role = roleScore(source, candidate);
  const width = widthScore(source, candidate);
  const weightCoverage = weightCoverageScore(source, candidate);
  const styleSupport = styleSupportScore(source, candidate);
  const traitCompatibility = traitCompatibilityScore(source, candidate);
  const familyName = familyNameScore(source, candidate);
  const visual = visualAffinityScore(source, candidate, lookup);
  const profile = selectWeightedProfile(source, hasRecordVisualEvidence);

  const currentSubstituteTop =
    Boolean(source.currentReferenceSubstitute) &&
    normalizeFontKey(source.currentReferenceSubstitute ?? "") === normalizeFontKey(candidate.familyName);
  const ruleBonus = 0;

  const penaltyValue = riskPenalty(source, candidate, rule);
  const weightedClassification = normalizedContribution(
    classification,
    CLASSIFICATION_MAX,
    profile.structuralWeights.classification,
  );
  const weightedRole = normalizedContribution(role, ROLE_MAX, profile.structuralWeights.role);
  const weightedWidth = normalizedContribution(width, WIDTH_MAX, profile.structuralWeights.width);
  const weightedWeightCoverage = normalizedContribution(
    weightCoverage,
    WEIGHT_COVERAGE_MAX,
    profile.structuralWeights.weightCoverage,
  );
  const weightedStyleSupport = normalizedContribution(
    styleSupport,
    STYLE_SUPPORT_MAX,
    profile.structuralWeights.styleSupport,
  );
  const weightedTraitCompatibility = normalizedContribution(
    traitCompatibility,
    TRAIT_COMPATIBILITY_MAX,
    profile.structuralWeights.traitCompatibility,
  );
  const weightedFamilyName = normalizedContribution(familyName, FAMILY_AFFINITY_MAX, profile.identityWeight);
  const weightedVisualAffinity = roundWeighted((visual.aggregateVisualAffinity / 100) * profile.visualWeight);

  const structuralTotal = roundWeighted(
    weightedClassification +
    weightedRole +
    weightedWidth +
    weightedWeightCoverage +
    weightedStyleSupport +
    weightedTraitCompatibility,
  );
  const identityTotal = weightedFamilyName;
  const visualTotal = weightedVisualAffinity;
  const penaltyTotal = penaltyValue === 0 ? 0 : -penaltyValue;

  let total = Math.round(
    structuralTotal +
    identityTotal +
    visualTotal +
    ruleBonus +
    penaltyTotal,
  );

  if (typeof rule?.capScore === "number") {
    total = Math.min(total, rule.capScore);
  }

  total = Math.max(0, Math.min(100, total));

  const breakdown: ScoreBreakdown = {
    profile: profile.name,
    classification: weightedClassification,
    role: weightedRole,
    width: weightedWidth,
    weightCoverage: weightedWeightCoverage,
    styleSupport: weightedStyleSupport,
    traitCompatibility: weightedTraitCompatibility,
    familyName: weightedFamilyName,
    visualAffinity: weightedVisualAffinity,
    ruleBonus,
    riskPenalty: penaltyTotal,
    structuralTotal,
    identityTotal,
    visualTotal,
    penaltyTotal,
    total,
  };

  return {
    candidate,
    score: total,
    breakdown,
    rawScores: {
      classification,
      role,
      width,
      weightCoverage,
      visualAffinity: visual.score,
      familyName,
    },
    currentSubstituteTop,
    scoringMode: hasRecordVisualEvidence ? "visual+metadata" : "metadata-only",
  };
}

function matchSourceForCandidate(
  candidate: ScoredCandidate,
): MatchSource {
  if (candidate.currentSubstituteTop) return "current-substitute";
  return "heuristic";
}

function sortScoredCandidates(scored: readonly ScoredCandidate[]): ScoredCandidate[] {
  return [...scored].sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (right.breakdown.visualTotal !== left.breakdown.visualTotal) {
      return right.breakdown.visualTotal - left.breakdown.visualTotal;
    }
    if (right.breakdown.structuralTotal !== left.breakdown.structuralTotal) {
      return right.breakdown.structuralTotal - left.breakdown.structuralTotal;
    }
    if (right.breakdown.identityTotal !== left.breakdown.identityTotal) {
      return right.breakdown.identityTotal - left.breakdown.identityTotal;
    }
    return left.candidate.familyName.localeCompare(right.candidate.familyName);
  });
}

export function rankBrandFontCandidates(
  record: BrandFontRecord,
  catalog: readonly NormalizedR2FontRecord[],
  rules: readonly BrandFontMatchRule[],
  options: { includeBelowCredible?: boolean; limit?: number } = {},
  scoringOptions: RankingScoringOptions = {},
): RankedBrandFontCandidate[] {
  const rule = resolveRule(record, rules);
  const lookup = buildLookup(scoringOptions.glyphComparisonArtifact, scoringOptions.expectedInputHash);
  const hasRecordVisualEvidence = hasGlyphComparisonsForRecord(record, lookup);
  const sorted = sortScoredCandidates(
    catalog
      .map((candidate) => scoreCandidate(record, candidate, rule, lookup, hasRecordVisualEvidence))
      .filter((candidate): candidate is ScoredCandidate => candidate !== null),
  );
  const filtered = options.includeBelowCredible
    ? sorted
    : sorted.filter((candidate) => candidate.score >= MINIMUM_CREDIBLE_MATCH_SCORE);
  const limited = typeof options.limit === "number" ? filtered.slice(0, options.limit) : filtered;

  return limited.map((candidate) => ({
    familyName: candidate.candidate.familyName,
    score: candidate.score,
    familyScore: candidate.breakdown.identityTotal,
    sourceUrl: candidate.candidate.sourceUrl,
    fitForRole: fitForRoleFromScore(candidate.score),
    matchWarnings: buildWarnings(record, candidate.candidate),
    rationaleChips: buildRationaleChips(record, candidate.candidate, candidate.score, candidate.rawScores),
    matchSource: matchSourceForCandidate(candidate),
    scoreBreakdown: candidate.breakdown,
    scoringMode: candidate.scoringMode,
  }));
}

export function buildBrandFontMatchResults(
  registry: readonly BrandFontRecord[],
  catalog: readonly NormalizedR2FontRecord[],
  rules: readonly BrandFontMatchRule[],
  scoringOptions: RankingScoringOptions = {},
): { matches: BrandFontMatchResult[]; scoringMode: ScoringMode } {
  const matches = registry.map((record) => {
    const rankedMatches: BrandFontMatch[] = rankBrandFontCandidates(
      record,
      catalog,
      rules,
      { limit: 3 },
      scoringOptions,
    ).map((candidate) => ({
      familyName: candidate.familyName,
      score: candidate.score,
      fitForRole: candidate.fitForRole,
      matchWarnings: candidate.matchWarnings,
      rationaleChips: candidate.rationaleChips,
      matchSource: candidate.matchSource,
      scoreBreakdown: candidate.scoreBreakdown,
      scoringMode: candidate.scoringMode,
    }));

    const resultScoringMode: ScoringMode = rankedMatches.some((match) => match.scoringMode === "visual+metadata")
      ? "visual+metadata"
      : "metadata-only";

    return {
      brandId: record.brandId,
      brandLabel: record.brandLabel,
      roleLabel: record.roleLabel,
      roleType: record.roleType,
      sourceFontFamily: record.sourceFontFamily,
      currentReferenceSubstitute: record.currentReferenceSubstitute,
      provenance: record.provenance,
      confidence: record.confidence,
      evidenceLabel: record.evidenceLabel,
      evidenceExcerpt: record.evidenceExcerpt,
      evidenceNote: record.evidenceNote,
      evidencePath: record.evidencePath,
      matches: rankedMatches,
      status: (rankedMatches.length > 0 ? "matched" : "no-credible-match") as "matched" | "no-credible-match",
      scoringMode: resultScoringMode,
    };
  });

  return {
    matches,
    scoringMode: (matches.some((entry) => entry.scoringMode === "visual+metadata")
      ? "visual+metadata"
      : "metadata-only") as ScoringMode,
  };
}
