import type {
  BrandFontStyle,
  BrandFontWidth,
  BrandRoleType,
  ConfidenceLevel,
  FontClassification,
  MatchFitForRole,
  RiskLevel,
  TraitToken,
} from "./types.ts";

export const BRAND_FONT_SCHEMA_VERSION = "2026-03-23.v2";
export const BRAND_FONT_SCORING_CONFIG_VERSION = "2026-03-23.score.v3";
export const MANUAL_INFERENCE_GATE = 0.15;
export const MINIMUM_CREDIBLE_MATCH_SCORE = 60;

const WEIGHT_ALIASES: Record<string, number> = {
  thin: 100,
  hairline: 100,
  extralight: 200,
  ultralight: 200,
  xlight: 200,
  light: 300,
  book: 400,
  regular: 400,
  roman: 400,
  normal: 400,
  medium: 500,
  semibold: 600,
  demibold: 600,
  demi: 600,
  bold: 700,
  extrabold: 800,
  ultrabold: 800,
  heavy: 800,
  black: 900,
  ultra: 900,
};

const WIDTH_ALIASES: Record<string, BrandFontWidth> = {
  condensed: "condensed",
  narrow: "condensed",
  compressed: "extra-condensed",
  extracondensed: "extra-condensed",
  extra_condensed: "extra-condensed",
  "extra-condensed": "extra-condensed",
  extended: "expanded",
  expanded: "expanded",
};

const GENERIC_FAMILY_TOKENS = new Set([
  "alternate",
  "black",
  "bold",
  "book",
  "caption",
  "condensed",
  "compressed",
  "demi",
  "display",
  "extra",
  "extralight",
  "extended",
  "extraoldstyle",
  "extracondensed",
  "extraold",
  "gothic",
  "hdtooled",
  "headline",
  "heavy",
  "italic",
  "itc",
  "light",
  "lt",
  "medium",
  "mt",
  "no",
  "normal",
  "nova",
  "oblique",
  "old",
  "opentype",
  "pro",
  "pt",
  "raw",
  "regular",
  "serial",
  "semiwide",
  "std",
  "style",
  "text",
  "thin",
  "ttf",
  "ultra",
  "use",
  "web",
  "w01",
  "w02",
]);

const RAW_FAMILY_TOKEN_ALIASES: Record<string, string[]> = {
  "clear sans": ["clear", "humanist", "sans"],
  "franklin gothic": ["franklin", "grotesque", "news"],
  "franklin gothic raw": ["franklin", "grotesque", "news"],
  "gloucester": ["editorial", "gloucester", "serif"],
  "hamburg serial": ["franklin", "grotesque", "hamburg", "news"],
  "itc cheltenham": ["cheltenham", "editorial", "serif"],
  "itc franklin gothic lt": ["franklin", "grotesque", "news"],
  "news gothic": ["franklin", "grotesque", "news"],
  "news gothic no 2": ["franklin", "grotesque", "news"],
  "nyt-cheltenham": ["cheltenham", "editorial", "serif"],
  "nyt-franklin": ["franklin", "grotesque", "news"],
  "nyt-karnak": ["cheltenham", "editorial", "gloucester", "serif"],
  "nyt-karnakcondensed": ["cheltenham", "condensed", "editorial", "karnak"],
  "nyt-stymie": ["slab", "stymie"],
  "rude slab condensed": ["condensed", "rude", "slab"],
  "stymie": ["slab", "stymie"],
  "velino compressed text": ["compressed", "condensed", "editorial", "velino"],
};

const RAW_TRAIT_FAMILY_OVERRIDES: Record<string, TraitToken[]> = {
  "beton": ["slab", "display", "traditional"],
  "biotif pro": ["humanist", "text", "body-safe"],
  "cheltenham": ["editorial", "headline", "traditional"],
  "cheltenham old style pro": ["editorial", "text", "traditional"],
  "chomsky": ["display", "masthead"],
  "franklin gothic": ["grotesque", "text", "body-safe", "news"],
  "franklin gothic raw": ["grotesque", "display", "news"],
  "futura now": ["geometric", "text"],
  "futura now display": ["geometric", "display"],
  "futura now headline": ["geometric", "display", "condensed"],
  "futura now text": ["geometric", "text", "body-safe"],
  "geometric slabserif 703": ["geometric", "slab", "display"],
  "geometric slabserif 712": ["geometric", "slab", "display"],
  "gloucester": ["editorial", "text", "body-safe", "traditional"],
  "goodall": ["text", "body-safe"],
  "hamburg serial": ["grotesque", "text", "body-safe", "headline"],
  "itc cheltenham": ["editorial", "headline", "traditional"],
  "itc franklin gothic lt": ["grotesque", "text", "body-safe", "news"],
  "magnus": ["display"],
  "malden sans": ["grotesque", "text", "body-safe"],
  "malden sans condensed": ["grotesque", "condensed", "display"],
  "news gothic": ["grotesque", "text", "body-safe", "news"],
  "news gothic no 2": ["grotesque", "text", "body-safe", "news"],
  "newspaper publisher jnl": ["display", "news", "masthead"],
  "newston": ["text", "traditional"],
  "plymouth serial": ["display", "traditional"],
  "rockwell": ["slab", "text", "body-safe"],
  "rockwell nova": ["slab", "text", "body-safe"],
  "rockwell nova condensed": ["slab", "condensed", "display"],
  "rude slab condensed": ["slab", "display", "condensed"],
  "sofia pro": ["humanist", "text", "body-safe"],
  "stafford serial": ["text", "traditional", "body-safe"],
  "stymie": ["slab", "display"],
  "stymie extra bold": ["slab", "display"],
  "velino compressed text": ["display", "condensed"],
  "bernhard modern": ["display", "traditional"],
  "best bet jnl": ["display", "news"],
  "hefring slab": ["slab", "display"],
  "madriz": ["display", "condensed"],
  "novecento slab": ["slab", "display"],
  "palo slab": ["slab", "display"],
  "publica slab": ["slab", "display"],
  "rude slab": ["slab", "display"],
  "rude slab extracondensed": ["slab", "display", "condensed"],
  "rude slab semiwide": ["slab", "display"],
  "sharp slab": ["slab", "display"],
  "stint pro": ["text", "traditional", "body-safe"],
  "tt rationalist": ["geometric", "text", "body-safe"],
  "tabac big slab": ["slab", "display"],
  "winner sans": ["grotesque", "display"],
  "clear sans": ["humanist", "text", "body-safe"],
  "nyt-franklin": ["grotesque", "text", "body-safe", "news"],
  "nyt-karnakcondensed": ["display", "condensed", "traditional"],
  "nyt-karnak": ["editorial", "text", "traditional"],
  "nyt-stymie": ["slab", "display"],
  "nyt-cheltenham": ["editorial", "headline", "traditional"],
};

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&(?:mdash|middot|rarr);/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function normalizeFontKey(value: string): string {
  return value
    .replace(/^['"]+|['"]+$/g, "")
    .replace(/_/g, " ")
    .replace(/&(?:mdash|middot|rarr);/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ");
}

function normalizeLookupMap<T>(input: Record<string, T>): Map<string, T> {
  return new Map(
    Object.entries(input).map(([key, value]) => [normalizeFontKey(key), value]),
  );
}

const FAMILY_TOKEN_ALIAS_MAP = normalizeLookupMap(RAW_FAMILY_TOKEN_ALIASES);
const TRAIT_FAMILY_OVERRIDE_MAP = normalizeLookupMap(RAW_TRAIT_FAMILY_OVERRIDES);

export function extractFamilySimilarityTokens(value: string): string[] {
  const normalized = normalizeFontKey(value);
  const directTokens = normalized
    .split(" ")
    .filter((token) => token.length > 1 && !GENERIC_FAMILY_TOKENS.has(token));
  const aliasTokens = FAMILY_TOKEN_ALIAS_MAP.get(normalized) ?? [];
  return [...new Set([...directTokens, ...aliasTokens])].sort();
}

export function extractNormalizedWeights(tokens: readonly string[]): number[] {
  const weights = new Set<number>();
  for (const token of tokens) {
    const lowered = normalizeFontKey(token);
    const directNumber = lowered.match(/\b([1-9]00)\b/);
    if (directNumber?.[1]) {
      weights.add(Number(directNumber[1]));
    }
    for (const [alias, weight] of Object.entries(WEIGHT_ALIASES)) {
      if (lowered.includes(alias)) {
        weights.add(weight);
      }
    }
  }
  if (weights.size === 0) {
    weights.add(400);
  }
  return [...weights].sort((left, right) => left - right);
}

export function extractNormalizedWidths(tokens: readonly string[]): BrandFontWidth[] {
  const widths = new Set<BrandFontWidth>();
  for (const token of tokens) {
    const lowered = normalizeFontKey(token).replace(/\s+/g, "");
    for (const [alias, width] of Object.entries(WIDTH_ALIASES)) {
      if (lowered.includes(alias)) {
        widths.add(width);
      }
    }
  }
  if (widths.size === 0) {
    widths.add("normal");
  }
  return [...widths];
}

export function hasItalicSupport(styles: readonly BrandFontStyle[]): boolean {
  return styles.includes("italic");
}

export function inferFontClassification(familyName: string): FontClassification {
  const normalized = normalizeFontKey(familyName);
  if (normalized.includes("chomsky")) return "blackletter";
  if (normalized.includes("mono")) return "mono";
  if (normalized.includes("slab") || normalized.includes("rockwell") || normalized.includes("stymie") || normalized.includes("beton")) {
    return "slab";
  }
  if (
    normalized.includes("gothic") ||
    normalized.includes("sans") ||
    normalized.includes("franklin") ||
    normalized.includes("biotif") ||
    normalized.includes("futura") ||
    normalized.includes("goodall") ||
    normalized.includes("hamburg") ||
    normalized.includes("malden") ||
    normalized.includes("news gothic") ||
    normalized.includes("winner sans")
  ) {
    return "sans";
  }
  if (
    normalized.includes("cheltenham") ||
    normalized.includes("gloucester") ||
    normalized.includes("karnak") ||
    normalized.includes("stafford") ||
    normalized.includes("velino") ||
    normalized.includes("newston") ||
    normalized.includes("bernhard")
  ) {
    return "serif";
  }
  if (
    normalized.includes("publisher") ||
    normalized.includes("magnus") ||
    normalized.includes("madriz") ||
    normalized.includes("plymouth")
  ) {
    return "display";
  }
  return "unknown";
}

export function inferTraitTokens(
  familyName: string,
  classification: FontClassification,
  widths: readonly BrandFontWidth[],
  existing: readonly TraitToken[] = [],
): TraitToken[] {
  const traits = new Set<TraitToken>(existing);
  const normalized = normalizeFontKey(familyName);
  const overrideTraits = TRAIT_FAMILY_OVERRIDE_MAP.get(normalized) ?? [];
  for (const trait of overrideTraits) traits.add(trait);
  if (widths.includes("condensed") || widths.includes("extra-condensed")) traits.add("condensed");
  if (widths.includes("expanded")) traits.add("expanded");
  if (classification === "serif") traits.add("traditional");
  if (classification === "slab") traits.add("slab");
  if (classification === "sans") traits.add("text");
  if (classification === "display") traits.add("display");
  if (classification === "blackletter") {
    traits.add("display");
    traits.add("masthead");
  }
  if (normalized.includes("news")) traits.add("news");
  if (normalized.includes("editorial") || normalized.includes("cheltenham") || normalized.includes("gloucester")) {
    traits.add("editorial");
  }
  if (normalized.includes("geometric") || normalized.includes("futura") || normalized.includes("tt rationalist")) {
    traits.add("geometric");
  }
  if (normalized.includes("gothic") || normalized.includes("franklin") || normalized.includes("news gothic") || normalized.includes("hamburg")) {
    traits.add("grotesque");
  }
  if (normalized.includes("body") || normalized.includes("text")) {
    traits.add("body-safe");
    traits.add("text");
  }
  return [...traits].sort();
}

export function deriveRisks(
  familyName: string,
  classification: FontClassification,
  widths: readonly BrandFontWidth[],
  weights: readonly number[],
  traits: readonly TraitToken[],
): { displayRisk: RiskLevel; bodyRisk: RiskLevel } {
  const normalized = normalizeFontKey(familyName);
  const hasBodyWeight = weights.includes(400);
  const hasDisplayWeight = weights.some((weight) => weight >= 600);
  const compressed = widths.includes("condensed") || widths.includes("extra-condensed") || normalized.includes("compressed");
  const isDisplayOnly =
    classification === "blackletter" ||
    classification === "display" ||
    traits.includes("masthead") ||
    normalized.includes("publisher");

  let bodyRisk: RiskLevel = "low";
  if (isDisplayOnly || compressed || !hasBodyWeight) {
    bodyRisk = "high";
  } else if (classification === "slab" || !traits.includes("body-safe")) {
    bodyRisk = "medium";
  }

  let displayRisk: RiskLevel = "low";
  if (classification === "mono" || (!hasDisplayWeight && traits.includes("body-safe"))) {
    displayRisk = "high";
  } else if (traits.includes("text") && !traits.includes("display")) {
    displayRisk = "medium";
  }

  return { displayRisk, bodyRisk };
}

export function brandIdIsValid(value: string): boolean {
  return /^[a-z0-9-]+(?::[a-z0-9-]+)?$/.test(value);
}

export function manualInferenceRatio(values: readonly { provenance: string; confidence: ConfidenceLevel }[]): number {
  if (values.length === 0) return 0;
  const count = values.filter(
    (value) => value.provenance === "manual-inference" && value.confidence === "low",
  ).length;
  return count / values.length;
}

export function fitForRoleFromScore(score: number): MatchFitForRole {
  if (score >= 85) return "strong";
  if (score >= 70) return "acceptable";
  return "risky";
}

export function roleSupportsDisplay(roleType: BrandRoleType): boolean {
  return roleType === "display" || roleType === "headline" || roleType === "subhead" || roleType === "logo-like";
}
