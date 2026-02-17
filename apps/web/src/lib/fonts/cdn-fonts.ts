import { DESIGN_SYSTEM_CDN_FONT_OPTIONS } from "@/lib/admin/design-system-tokens";

export interface ResolvedCdnFont {
  name: string;
  fontFamily: string;
}

const GENERIC_FONT_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "emoji",
  "math",
  "fangsong",
  "inherit",
  "initial",
  "unset",
]);

const STYLE_TOKENS = [
  "thin",
  "extralight",
  "ultralight",
  "light",
  "book",
  "regular",
  "roman",
  "medium",
  "semibold",
  "demibold",
  "bold",
  "extrabold",
  "ultrabold",
  "black",
  "italic",
  "oblique",
  "condensed",
  "narrow",
  "compressed",
  "extended",
  "xlight",
  "xbold",
  "extra",
  "pro",
  "std",
  "bt",
];

const FILE_EXTENSION_TOKENS = new Set(["otf", "ttf", "woff", "woff2"]);

const CDN_FONT_ALIASES: Record<string, string> = {
  geoslab703md: "Geometric Slabserif 703",
  geoslab703mdbt: "Geometric Slabserif 703",
  geoslab703xbdbt: "Geometric Slabserif 703",
  geoslab703bt: "Geometric Slabserif 703",
  geoslab712bt: "Geometric Slabserif 712",
  plymouthserialxbold: "Plymouth Serial",
  plymouthserialbold: "Plymouth Serial",
  plymouthserial: "Plymouth Serial",
  hamburgserial: "Hamburg Serial",
};

function stripQuotes(value: string): string {
  return value.replace(/^['"]+|['"]+$/g, "").trim();
}

export function extractPrimaryFontToken(fontValue: string): string {
  const trimmed = fontValue.trim();
  if (!trimmed) return "";
  const primary = trimmed.split(",")[0] ?? "";
  return stripQuotes(primary);
}

function normalizeFontName(value: string): string {
  const withWordBreaks = value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");

  const lowered = withWordBreaks
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .trim();

  if (!lowered) return "";
  const tokens = lowered
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .filter((token) => !FILE_EXTENSION_TOKENS.has(token))
    .filter((token) => !/^\d+$/.test(token));

  const styleSuffixes = [...STYLE_TOKENS].sort((a, b) => b.length - a.length);
  const cleaned = tokens.map((token) => {
    let next = token;
    let changed = true;
    while (changed) {
      changed = false;
      for (const suffix of styleSuffixes) {
        if (next.length <= suffix.length) continue;
        if (!next.endsWith(suffix)) continue;
        next = next.slice(0, -suffix.length);
        changed = true;
        break;
      }
    }
    return next;
  });

  return cleaned
    .filter((token) => token.length > 0 && !STYLE_TOKENS.includes(token))
    .join("");
}

function buildLookups() {
  const byNormalized = new Map<string, ResolvedCdnFont>();
  const byName = new Map<string, ResolvedCdnFont>();

  for (const option of DESIGN_SYSTEM_CDN_FONT_OPTIONS) {
    const entry: ResolvedCdnFont = {
      name: option.name,
      fontFamily: option.fontFamily,
    };
    byName.set(option.name, entry);
    const normalizedName = normalizeFontName(option.name);
    if (normalizedName) byNormalized.set(normalizedName, entry);

    const normalizedPrimaryToken = normalizeFontName(extractPrimaryFontToken(option.fontFamily));
    if (normalizedPrimaryToken && !byNormalized.has(normalizedPrimaryToken)) {
      byNormalized.set(normalizedPrimaryToken, entry);
    }
  }

  return { byName, byNormalized };
}

const CDN_FONT_LOOKUPS = buildLookups();

export function isCloudfrontCdnFontCandidate(fontValue: string): boolean {
  const primaryToken = extractPrimaryFontToken(fontValue);
  if (!primaryToken) return false;

  const lower = primaryToken.toLowerCase();
  if (lower.startsWith("var(")) return false;
  if (GENERIC_FONT_FAMILIES.has(lower)) return false;
  return /[a-z]/i.test(primaryToken);
}

export function resolveCloudfrontCdnFont(fontValue: string): ResolvedCdnFont | null {
  const primaryToken = extractPrimaryFontToken(fontValue);
  if (!primaryToken) return null;

  const normalized = normalizeFontName(primaryToken);
  if (!normalized) return null;

  const alias = CDN_FONT_ALIASES[normalized];
  if (alias) {
    return CDN_FONT_LOOKUPS.byName.get(alias) ?? null;
  }

  return CDN_FONT_LOOKUPS.byNormalized.get(normalized) ?? null;
}
