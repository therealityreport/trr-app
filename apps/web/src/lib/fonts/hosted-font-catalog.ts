import {
  buildHostedFontAssetPath,
  normalizeHostedFontAssetPathFromUrl,
} from "./hosted-fonts.ts";

export type HostedFontCatalogBucket = "trr" | "reference";
export type HostedFontCatalogStretch = "condensed" | "extra-condensed" | "expanded";

export interface HostedFontCatalogStyle {
  weight: number;
  style: "normal" | "italic";
  stretch?: HostedFontCatalogStretch;
  sourceUrl: string;
  assetPath: string | null;
}

export interface HostedFontCatalogFamily {
  familyName: string;
  bucket: HostedFontCatalogBucket;
  cdnPath?: string;
  styles: HostedFontCatalogStyle[];
}

function normalizeToken(value: string): string {
  return value
    .replace(/^['"]+|['"]+$/g, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function normalizeHostedFamilyKey(value: string): string {
  return normalizeToken(value).replace(/[^a-z0-9 ]+/g, "");
}

function inferStretch(value: string): HostedFontCatalogStretch | undefined {
  const normalized = normalizeToken(value).replace(/\s+/g, "");
  if (normalized.includes("extracondensed") || normalized.includes("compressed")) return "extra-condensed";
  if (normalized.includes("condensed") || normalized.includes("narrow")) return "condensed";
  if (normalized.includes("extended") || normalized.includes("expanded")) return "expanded";
  return undefined;
}

function normalizeWeight(token: string): number {
  const match = token.match(/\b([1-9]00)\b/);
  if (match?.[1]) return Number(match[1]);
  return Number.parseInt(token, 10) || 400;
}

function buildFamilyPath(assetPath: string | null): string | undefined {
  if (!assetPath) return undefined;
  const normalized = buildHostedFontAssetPath(assetPath);
  return normalized.split("/").slice(0, -1).join("/") || undefined;
}

function inferHostedFontCatalogBucket(assetPath: string | null): HostedFontCatalogBucket {
  if (!assetPath) return "trr";
  if (assetPath.includes("/reference%20fonts/") || assetPath.includes("/reference fonts/")) {
    return "reference";
  }
  return "trr";
}

export function parseHostedFontCatalogStylesheet(stylesheet: string): HostedFontCatalogFamily[] {
  const blocks = [...stylesheet.matchAll(/@font-face\s*{([\s\S]*?)}/g)];
  const grouped = new Map<string, HostedFontCatalogFamily>();

  for (const blockMatch of blocks) {
    const block = blockMatch[1] ?? "";
    const familyName = block.match(/font-family:\s*["']([^"']+)["']/)?.[1]?.trim();
    if (!familyName) continue;
    const sourceUrl = block.match(/src:\s*url\((['"]?)([^"')]+)\1\)/)?.[2]?.trim() ?? "";
    const assetPath = normalizeHostedFontAssetPathFromUrl(sourceUrl);
    const bucket = inferHostedFontCatalogBucket(assetPath);
    const style: HostedFontCatalogStyle = {
      weight: normalizeWeight(block.match(/font-weight:\s*([^;]+);/)?.[1]?.trim() ?? "400"),
      style: block.match(/font-style:\s*([^;]+);/)?.[1]?.includes("italic") ? "italic" : "normal",
      stretch: inferStretch(`${familyName} ${sourceUrl}`),
      sourceUrl,
      assetPath,
    };
    const key = `${bucket}::${familyName}`;
    const family = grouped.get(key) ?? {
      familyName,
      bucket,
      cdnPath: buildFamilyPath(assetPath),
      styles: [],
    };
    family.styles.push(style);
    if (!family.cdnPath) {
      family.cdnPath = buildFamilyPath(assetPath);
    }
    grouped.set(key, family);
  }

  return [...grouped.values()]
    .map((family) => ({
      ...family,
      styles: family.styles.sort((left, right) => {
        if (left.weight !== right.weight) return left.weight - right.weight;
        const leftStretch = left.stretch ?? "normal";
        const rightStretch = right.stretch ?? "normal";
        if (leftStretch !== rightStretch) return leftStretch.localeCompare(rightStretch);
        return left.style.localeCompare(right.style);
      }),
    }))
    .sort((left, right) => left.familyName.localeCompare(right.familyName));
}
