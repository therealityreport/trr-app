import type { ScoreBreakdown, ScoreBreakdownProfile } from "./types.ts";

export const CLASSIFICATION_MAX = 18;
export const ROLE_MAX = 20;
export const WIDTH_MAX = 15;
export const WEIGHT_COVERAGE_MAX = 15;
export const STYLE_SUPPORT_MAX = 10;
export const TRAIT_COMPATIBILITY_MAX = 10;
export const FAMILY_AFFINITY_MAX = 20;
export const VISUAL_AFFINITY_MAX = 15;
export const RISK_PENALTY_MAX = 20;

type StructuralContribution =
  | "classification"
  | "role"
  | "width"
  | "weightCoverage"
  | "styleSupport"
  | "traitCompatibility";

export type WeightedProfile = {
  name: ScoreBreakdownProfile;
  structuralWeights: Record<StructuralContribution, number>;
  identityWeight: number;
  visualWeight: number;
};

export type ScoreBreakdownMaxima = Record<
  keyof Omit<ScoreBreakdown, "profile" | "ruleBonus" | "total">,
  number
>;

export const WEIGHTED_PROFILES: Record<ScoreBreakdownProfile, WeightedProfile> = {
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

export function getScoreBreakdownMaxima(profileName: ScoreBreakdownProfile): ScoreBreakdownMaxima {
  const profile = WEIGHTED_PROFILES[profileName];
  const structuralTotal = Object.values(profile.structuralWeights).reduce(
    (total, value) => total + value,
    0,
  );

  return {
    ...profile.structuralWeights,
    familyName: profile.identityWeight,
    visualAffinity: profile.visualWeight,
    riskPenalty: RISK_PENALTY_MAX,
    structuralTotal,
    identityTotal: profile.identityWeight,
    visualTotal: profile.visualWeight,
    penaltyTotal: RISK_PENALTY_MAX,
  };
}
