import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { DiscoveredBrandFontEvidence } from "./types.ts";
import { normalizeFontKey } from "./normalization.ts";

type SourceDefinition = {
  brandId: string;
  brandLabel: string;
  relativePath: string;
  kind: "brand-section" | "games-helper";
  scanMode: "typography-block" | "whole-file";
};

const FONT_EVIDENCE_TOKENS = [
  "cheltenham",
  "gloucester",
  "franklin",
  "hamburg",
  "stymie",
  "karnak",
  "clear sans",
  "rude slab",
  "nyt-",
  "italic",
  "regular",
  "bold",
  "medium",
  "black",
  "book",
  "roman",
  "condensed",
];

export const BRAND_FONT_DISCOVERY_SOURCES: readonly SourceDefinition[] = [
  {
    brandId: "brand-nyt-cooking",
    brandLabel: "NYT Cooking",
    relativePath: "src/components/admin/design-docs/sections/BrandNYTCookingSection.tsx",
    kind: "brand-section",
    scanMode: "typography-block",
  },
  {
    brandId: "brand-nyt-games",
    brandLabel: "NYT Games",
    relativePath: "src/components/admin/design-docs/sections/BrandNYTGamesSection.tsx",
    kind: "brand-section",
    scanMode: "typography-block",
  },
  {
    brandId: "brand-nyt-magazine",
    brandLabel: "NYT Magazine",
    relativePath: "src/components/admin/design-docs/sections/BrandNYTMagazineSection.tsx",
    kind: "brand-section",
    scanMode: "typography-block",
  },
  {
    brandId: "brand-nyt-opinion",
    brandLabel: "NYT Opinion",
    relativePath: "src/components/admin/design-docs/sections/BrandNYTOpinionSection.tsx",
    kind: "brand-section",
    scanMode: "typography-block",
  },
  {
    brandId: "brand-nyt-store",
    brandLabel: "NYT Store",
    relativePath: "src/components/admin/design-docs/sections/BrandNYTStoreSection.tsx",
    kind: "brand-section",
    scanMode: "typography-block",
  },
  {
    brandId: "brand-nyt-style",
    brandLabel: "NYT Style",
    relativePath: "src/components/admin/design-docs/sections/BrandNYTStyleSection.tsx",
    kind: "brand-section",
    scanMode: "typography-block",
  },
  {
    brandId: "brand-the-athletic",
    brandLabel: "The Athletic",
    relativePath: "src/components/admin/design-docs/sections/brand-athletic/BrandAthleticTypography.tsx",
    kind: "brand-section",
    scanMode: "whole-file",
  },
  {
    brandId: "brand-wirecutter",
    brandLabel: "Wirecutter",
    relativePath: "src/components/admin/design-docs/sections/BrandWirecutterSection.tsx",
    kind: "brand-section",
    scanMode: "typography-block",
  },
  {
    brandId: "brand-nyt-games:canonical",
    brandLabel: "NYT Games Canonical",
    relativePath: "src/components/admin/design-docs/sections/games/game-palettes.ts",
    kind: "games-helper",
    scanMode: "whole-file",
  },
  {
    brandId: "brand-nyt-games:connections",
    brandLabel: "NYT Games Connections",
    relativePath: "src/components/admin/design-docs/sections/games/GameConnections.tsx",
    kind: "games-helper",
    scanMode: "whole-file",
  },
  {
    brandId: "brand-nyt-games:spelling-bee",
    brandLabel: "NYT Games Spelling Bee",
    relativePath: "src/components/admin/design-docs/sections/games/GameSpellingBee.tsx",
    kind: "games-helper",
    scanMode: "whole-file",
  },
  {
    brandId: "brand-nyt-games:tiles",
    brandLabel: "NYT Games Tiles",
    relativePath: "src/components/admin/design-docs/sections/games/GameTiles.tsx",
    kind: "games-helper",
    scanMode: "whole-file",
  },
  {
    brandId: "brand-nyt-games:wordle",
    brandLabel: "NYT Games Wordle",
    relativePath: "src/components/admin/design-docs/sections/games/GameWordle.tsx",
    kind: "games-helper",
    scanMode: "whole-file",
  },
] as const;

function isFontEvidenceText(text: string): boolean {
  const normalized = normalizeFontKey(text);
  if (!normalized) return false;
  if (/^\d+(?: \d+)*$/.test(normalized.replace(/px/g, "").replace(/\s+/g, " ").trim())) {
    return false;
  }
  return FONT_EVIDENCE_TOKENS.some((token) => normalized.includes(token));
}

function extractTypographyLines(sourceText: string, mode: SourceDefinition["scanMode"]): Array<{ line: number; text: string }> {
  const lines = sourceText.split("\n");
  if (mode === "whole-file") {
    return lines.map((text, index) => ({ line: index + 1, text }));
  }

  const startIndex = lines.findIndex((line) => line.includes('id="typography"'));
  if (startIndex === -1) return [];
  const endIndex = lines.findIndex((line, index) => index > startIndex && line.includes('id="colors"'));
  const sliceEnd = endIndex === -1 ? lines.length : endIndex;
  return lines.slice(startIndex, sliceEnd).map((text, index) => ({ line: startIndex + index + 1, text }));
}

function buildEvidenceId(
  brandId: string,
  kind: DiscoveredBrandFontEvidence["kind"],
  line: number,
): string {
  return `${brandId}:${kind}:${line}`;
}

function extractQuotedText(line: string): string | null {
  const quoted = line.match(/text=(["'])(.*?)\1/);
  return quoted?.[2]?.trim() ?? null;
}

function extractLabelText(line: string): string | null {
  const label = line.match(/&mdash;\s*([^<]+)/);
  return label?.[1]?.trim() ?? null;
}

function extractMappingText(line: string): string | null {
  if (!(line.includes("&rarr;") || line.includes("→"))) return null;
  if (!isFontEvidenceText(line)) return null;
  return line
    .replace(/<[^>]+>/g, " ")
    .replace(/&middot;/g, " · ")
    .replace(/&rarr;/g, " → ")
    .replace(/\s+/g, " ")
    .trim();
}

export function discoverBrandFontEvidence(projectRoot: string): DiscoveredBrandFontEvidence[] {
  const evidence: DiscoveredBrandFontEvidence[] = [];

  for (const source of BRAND_FONT_DISCOVERY_SOURCES) {
    const fullPath = join(projectRoot, source.relativePath);
    const contents = readFileSync(fullPath, "utf8");
    const lines = extractTypographyLines(contents, source.scanMode);

    for (const entry of lines) {
      const candidates: Array<{ kind: DiscoveredBrandFontEvidence["kind"]; text: string | null }> = [
        { kind: "specimen-meta", text: extractQuotedText(entry.text) },
        { kind: "jsx-label", text: extractLabelText(entry.text) },
        { kind: "mapping-line", text: extractMappingText(entry.text) },
      ];

      for (const candidate of candidates) {
        if (!candidate.text || !isFontEvidenceText(candidate.text)) continue;
        const anchor = source.kind === "brand-section" ? "typography" : undefined;
        evidence.push({
          id: buildEvidenceId(source.brandId, candidate.kind, entry.line),
          brandId: source.brandId,
          brandLabel: source.brandLabel,
          kind: candidate.kind,
          text: candidate.text,
          normalizedText: normalizeFontKey(candidate.text),
          sourcePath: source.relativePath,
          line: entry.line,
          ...(anchor ? { anchor } : {}),
        });
      }
    }
  }

  return evidence.sort((left, right) => {
    if (left.brandId !== right.brandId) return left.brandId.localeCompare(right.brandId);
    if (left.sourcePath !== right.sourcePath) return left.sourcePath.localeCompare(right.sourcePath);
    return left.line - right.line;
  });
}
