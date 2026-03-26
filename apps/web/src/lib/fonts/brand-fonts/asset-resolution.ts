import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  parseHostedFontCatalogStylesheet,
  type HostedFontCatalogFamily,
  type HostedFontCatalogStyle,
} from "../hosted-font-catalog.ts";
import type {
  BrandFontRecord,
  BrandFontStyle,
  BrandFontWidth,
  ResolvedFontAsset,
} from "./types.ts";
import { normalizeFontKey } from "./normalization.ts";

const SOURCE_FAMILY_ALIASES = new Map([
  ["nytkarnakcondensed", ["NYTKarnak_Condensed"]],
  ["nytkarnak", ["KarnakPro-Book"]],
  ["nytfranklin", ["NYTFranklin"]],
  ["tnwebuseonly", ["TN_Web_Use_Only"]],
  ["helveticaneue", ["Helvetica_Neue"]],
]);

const HOSTED_STYLESHEET_PATH = "src/styles/cdn-fonts.css";
const REFERENCE_STYLESHEET_PATH = "src/styles/realitease-fonts.css";

export type HostedFamilyMap = Map<string, HostedFontCatalogFamily>;

function stretchToWidth(stretch?: HostedFontCatalogStyle["stretch"]): BrandFontWidth {
  if (stretch === "condensed") return "condensed";
  if (stretch === "extra-condensed") return "extra-condensed";
  if (stretch === "expanded") return "expanded";
  return "normal";
}

function styleMismatchScore(requested: BrandFontStyle, actual: BrandFontStyle): number {
  return requested === actual ? 0 : 1000;
}

function widthMismatchScore(requested: BrandFontWidth, actual: BrandFontWidth): number {
  return requested === actual ? 0 : 100;
}

function resolutionReason(
  requestedFamilyName: string,
  resolvedFamilyName: string,
  requestedStyle: BrandFontStyle,
  actualStyle: BrandFontStyle,
  requestedWidth: BrandFontWidth,
  actualWidth: BrandFontWidth,
  requestedWeight: number,
  actualWeight: number,
): ResolvedFontAsset["resolutionReason"] {
  if (normalizeFontKey(requestedFamilyName) !== normalizeFontKey(resolvedFamilyName)) {
    return "family-alias";
  }
  if (requestedStyle !== actualStyle) return "style-fallback";
  if (requestedWidth !== actualWidth) return "stretch-fallback";
  if (requestedWeight !== actualWeight) return "nearest-weight";
  return "exact";
}

export function buildHostedFamilyMap(
  hostedStylesheet: string,
  referenceStylesheet: string,
): HostedFamilyMap {
  const families = parseHostedFontCatalogStylesheet(`${hostedStylesheet}\n${referenceStylesheet}`);
  return new Map(
    families.map((family) => [normalizeFontKey(family.familyName), family]),
  );
}

export function readHostedFamilyMap(projectRoot: string): HostedFamilyMap {
  const hostedStylesheet = readFileSync(join(projectRoot, HOSTED_STYLESHEET_PATH), "utf8");
  const referenceStylesheet = readFileSync(join(projectRoot, REFERENCE_STYLESHEET_PATH), "utf8");
  return buildHostedFamilyMap(hostedStylesheet, referenceStylesheet);
}

export function resolveHostedFamily(
  requestedFamilyName: string,
  familyMap: HostedFamilyMap,
  fallbacks: readonly string[] = [],
): HostedFontCatalogFamily | null {
  const requested = familyMap.get(normalizeFontKey(requestedFamilyName));
  if (requested) return requested;

  for (const fallback of fallbacks) {
    const resolved = familyMap.get(normalizeFontKey(fallback));
    if (resolved) return resolved;
  }

  return null;
}

export function resolveSourceHostedFamily(
  record: Pick<BrandFontRecord, "sourceFontFamily" | "currentReferenceSubstitute">,
  familyMap: HostedFamilyMap,
): HostedFontCatalogFamily | null {
  const aliases = SOURCE_FAMILY_ALIASES.get(normalizeFontKey(record.sourceFontFamily)) ?? [];
  return resolveHostedFamily(
    record.sourceFontFamily,
    familyMap,
    [...aliases, record.currentReferenceSubstitute ?? ""].filter(Boolean),
  );
}

export function selectClosestHostedStyle(
  family: HostedFontCatalogFamily,
  requestedWeight: number,
  requestedStyle: BrandFontStyle,
  requestedWidth: BrandFontWidth,
): HostedFontCatalogStyle | null {
  if (family.styles.length === 0) return null;

  const [best] = [...family.styles].sort((left, right) => {
    const leftWidth = stretchToWidth(left.stretch);
    const rightWidth = stretchToWidth(right.stretch);
    const leftScore =
      styleMismatchScore(requestedStyle, left.style) +
      widthMismatchScore(requestedWidth, leftWidth) +
      Math.abs(left.weight - requestedWeight);
    const rightScore =
      styleMismatchScore(requestedStyle, right.style) +
      widthMismatchScore(requestedWidth, rightWidth) +
      Math.abs(right.weight - requestedWeight);
    if (leftScore !== rightScore) return leftScore - rightScore;
    return left.weight - right.weight;
  });

  return best ?? null;
}

export function resolveFontAsset(
  requestedFamilyName: string,
  family: HostedFontCatalogFamily,
  requestedWeight: number,
  requestedStyle: BrandFontStyle,
  requestedWidth: BrandFontWidth,
): ResolvedFontAsset | null {
  const style = selectClosestHostedStyle(family, requestedWeight, requestedStyle, requestedWidth);
  if (!style?.sourceUrl) return null;

  const resolvedWidth = stretchToWidth(style.stretch);
  return {
    requestedFamilyName,
    resolvedFamilyName: family.familyName,
    requestedWeight,
    requestedStyle,
    requestedWidth,
    resolvedWeight: style.weight,
    resolvedStyle: style.style,
    resolvedWidth,
    sourceUrl: style.sourceUrl,
    assetPath: style.assetPath,
    resolutionReason: resolutionReason(
      requestedFamilyName,
      family.familyName,
      requestedStyle,
      style.style,
      requestedWidth,
      resolvedWidth,
      requestedWeight,
      style.weight,
    ),
  };
}
