import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { ADDITIONAL_MONOTYPE_FONTS } from "../additional-monotype-fonts.ts";
import { GENERATED_ADDITIONAL_TRR_FONT_CATALOG } from "../generated/additional-trr-font-catalog.ts";
import {
  BRAND_FONT_SCORING_CONFIG_VERSION,
  BRAND_FONT_SCHEMA_VERSION,
  brandIdIsValid,
  deriveRisks,
  extractNormalizedWeights,
  extractNormalizedWidths,
  inferFontClassification,
  inferTraitTokens,
  manualInferenceRatio,
  MANUAL_INFERENCE_GATE,
} from "./normalization.ts";
import { discoverBrandFontEvidence } from "./discovery.ts";
import { BRAND_FONT_MATCH_RULES, BRAND_FONT_REGISTRY_SEED } from "./seed.ts";
import { buildBrandFontMatchResults } from "./scoring.ts";
import type {
  BrandFontRecord,
  DiscoveredBrandFontEvidence,
  GeneratedArtifactEnvelope,
  GeneratedBrandFontArtifacts,
  GlyphComparisonArtifact,
  NormalizedR2FontRecord,
} from "./types.ts";

export const HOSTED_FONT_TEMPLATE_PATH = "src/styles/cdn-fonts.css";
export const GLYPH_COMPARISON_ARTIFACT_PATH =
  "src/lib/fonts/brand-fonts/generated/glyph-comparison-results.json";

function hashInput(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function buildEnvelope<T>(data: T, inputHash: string): GeneratedArtifactEnvelope<T> {
  return {
    schemaVersion: BRAND_FONT_SCHEMA_VERSION,
    inputHash,
    generatedAt: new Date().toISOString(),
    scoringConfigVersion: BRAND_FONT_SCORING_CONFIG_VERSION,
    data,
  };
}

export function parseHostedCatalog(projectRoot: string): NormalizedR2FontRecord[] {
  const stylesheet = readFileSync(join(projectRoot, HOSTED_FONT_TEMPLATE_PATH), "utf8");
  const fontFaces = [...stylesheet.matchAll(/@font-face\s*{([\s\S]*?)}/g)];
  const familyMap = new Map<
    string,
    { weights: Set<number>; styles: Set<"normal" | "italic">; sourceUrl: string; widths: Set<"normal" | "condensed" | "extra-condensed" | "expanded"> }
  >();

  for (const fontFace of fontFaces) {
    const block = fontFace[1] ?? "";
    const family = block.match(/font-family:\s*["']([^"']+)["']/)?.[1]?.trim();
    if (!family) continue;
    const sourceUrl = block.match(/src:\s*url\(["']([^"']+)["']/)?.[1]?.trim() ?? "";
    const weightToken = block.match(/font-weight:\s*([^;]+);/)?.[1]?.trim() ?? "400";
    const styleToken = block.match(/font-style:\s*([^;]+);/)?.[1]?.trim() ?? "normal";
    const entry = familyMap.get(family) ?? {
      weights: new Set<number>(),
      styles: new Set<"normal" | "italic">(),
      sourceUrl,
      widths: new Set<"normal" | "condensed" | "extra-condensed" | "expanded">(),
    };
    extractNormalizedWeights([weightToken]).forEach((weight) => entry.weights.add(weight));
    entry.styles.add(styleToken.includes("italic") ? "italic" : "normal");
    extractNormalizedWidths([family, weightToken]).forEach((width) => entry.widths.add(width));
    if (!entry.sourceUrl) entry.sourceUrl = sourceUrl;
    familyMap.set(family, entry);
  }

  for (const font of ADDITIONAL_MONOTYPE_FONTS) {
    const generatedCatalogEntry = GENERATED_ADDITIONAL_TRR_FONT_CATALOG.find(
      (entry) => entry.familyName === font.name,
    );
    if (generatedCatalogEntry) {
      const widths = extractNormalizedWidths([
        generatedCatalogEntry.familyName,
        ...generatedCatalogEntry.styles.flatMap((style) => [
          style.sourceUrl,
          style.assetPath ?? "",
          style.stretch ?? "",
        ]),
      ]);
      familyMap.set(font.name, {
        weights: new Set(generatedCatalogEntry.styles.map((style) => style.weight)),
        styles: new Set(generatedCatalogEntry.styles.map((style) => style.style)),
        widths: new Set(widths),
        sourceUrl: generatedCatalogEntry.styles[0]?.sourceUrl ?? font.previewAssetPath,
      });
      continue;
    }
    const widths = extractNormalizedWidths([font.name, font.previewAssetPath]);
    familyMap.set(font.name, {
      weights: new Set<number>([400]),
      styles: new Set<"normal" | "italic">(["normal"]),
      widths: new Set(widths),
      sourceUrl: font.previewAssetPath,
    });
  }

  return [...familyMap.entries()]
    .map(([familyName, entry]) => {
      const widthsNormalized = [...entry.widths];
      const weightsNormalized = [...entry.weights].sort((left, right) => left - right);
      const classification = inferFontClassification(familyName);
      const traitTokens = inferTraitTokens(familyName, classification, widthsNormalized);
      const { displayRisk, bodyRisk } = deriveRisks(
        familyName,
        classification,
        widthsNormalized,
        weightsNormalized,
        traitTokens,
      );
      return {
        familyName,
        weightsNormalized,
        styles: [...entry.styles],
        widthsNormalized,
        classification,
        traitTokens,
        displayRisk,
        bodyRisk,
        sourceUrl: entry.sourceUrl,
      };
    })
    .sort((left, right) => left.familyName.localeCompare(right.familyName));
}

export function buildRegistry(
  discovered: readonly DiscoveredBrandFontEvidence[],
): BrandFontRecord[] {
  const evidenceById = new Map(discovered.map((entry) => [entry.id, entry]));
  const seenRecordKeys = new Set<string>();

  return BRAND_FONT_REGISTRY_SEED.map((seed) => {
    if (!brandIdIsValid(seed.brandId)) {
      throw new Error(`Invalid brandId: ${seed.brandId}`);
    }
    const recordKey = `${seed.brandId}::${seed.roleLabel}`;
    if (seenRecordKeys.has(recordKey)) {
      throw new Error(`Duplicate brand font record key: ${recordKey}`);
    }
    seenRecordKeys.add(recordKey);
    const evidence = seed.evidenceIds.map((id) => {
      const discoveredEvidence = evidenceById.get(id);
      if (!discoveredEvidence) {
        throw new Error(`Missing discovered evidence for ${seed.roleLabel}: ${id}`);
      }
      return discoveredEvidence;
    });
    const primaryEvidence = evidence[0];
    if (!primaryEvidence) {
      throw new Error(`No evidence rows found for ${seed.roleLabel}`);
    }
    return {
      brandId: seed.brandId,
      brandLabel: seed.brandLabel,
      roleLabel: seed.roleLabel,
      roleType: seed.roleType,
      sourceFontFamily: seed.sourceFontFamily,
      sourceWeightsRaw: [...seed.sourceWeightsRaw],
      sourceWeightsNormalized: extractNormalizedWeights(seed.sourceWeightsRaw),
      sourceStyles: [...seed.sourceStyles],
      sourceWidthRaw: [...seed.sourceWidthRaw],
      sourceWidthNormalized: extractNormalizedWidths(seed.sourceWidthRaw),
      currentReferenceSubstitute: seed.currentReferenceSubstitute,
      provenance: seed.provenance,
      confidence: seed.confidence,
      evidenceLabel: seed.roleLabel,
      evidenceExcerpt: primaryEvidence.text,
      evidenceNote: seed.evidenceNote,
      evidencePath: {
        type: "file" as const,
        path: primaryEvidence.sourcePath,
        anchor: primaryEvidence.anchor,
        lineHint: primaryEvidence.line,
      },
      sourceTraitTokens: inferTraitTokens(
        seed.sourceFontFamily,
        inferFontClassification(seed.sourceFontFamily),
        extractNormalizedWidths(seed.sourceWidthRaw),
        seed.sourceTraitTokens,
      ),
      evidenceIds: [...seed.evidenceIds],
    };
  }).sort((left, right) => {
    if (left.brandLabel !== right.brandLabel) return left.brandLabel.localeCompare(right.brandLabel);
    if (left.roleType !== right.roleType) return left.roleType.localeCompare(right.roleType);
    return left.roleLabel.localeCompare(right.roleLabel);
  });
}

export function buildBrandFontArtifactsInputHash(
  projectRoot: string,
  discovered: readonly DiscoveredBrandFontEvidence[],
): string {
  const sourceFiles = [
    HOSTED_FONT_TEMPLATE_PATH,
    ...new Set(discovered.map((entry) => entry.sourcePath)),
  ].sort();
  const combinedInput = sourceFiles
    .map((relativePath) => `${relativePath}\n${readFileSync(join(projectRoot, relativePath), "utf8")}`)
    .join("\n\n===\n\n");
  const configHash = hashInput(
    JSON.stringify({
      seed: BRAND_FONT_REGISTRY_SEED,
      rules: BRAND_FONT_MATCH_RULES,
      schema: BRAND_FONT_SCHEMA_VERSION,
      scoring: BRAND_FONT_SCORING_CONFIG_VERSION,
    }),
  );
  return hashInput(`${combinedInput}\n\n${configHash}`);
}

function readGlyphComparisonArtifact(projectRoot: string): GlyphComparisonArtifact | null {
  const artifactPath = join(projectRoot, GLYPH_COMPARISON_ARTIFACT_PATH);
  if (!existsSync(artifactPath)) return null;
  return JSON.parse(readFileSync(artifactPath, "utf8")) as GlyphComparisonArtifact;
}

export function buildBrandFontArtifacts(projectRoot: string): GeneratedBrandFontArtifacts {
  const discovered = discoverBrandFontEvidence(projectRoot);
  const registry = buildRegistry(discovered);
  const catalog = parseHostedCatalog(projectRoot);
  const inputHash = buildBrandFontArtifactsInputHash(projectRoot, discovered);
  const glyphComparisonArtifact = readGlyphComparisonArtifact(projectRoot);
  const matchResults = buildBrandFontMatchResults(
    registry,
    catalog,
    BRAND_FONT_MATCH_RULES,
    {
      glyphComparisonArtifact,
      expectedInputHash: inputHash,
    },
  );

  const manualInferenceShare = manualInferenceRatio(registry);
  if (manualInferenceShare > MANUAL_INFERENCE_GATE) {
    throw new Error(
      `Manual inference share ${manualInferenceShare.toFixed(3)} exceeded gate ${MANUAL_INFERENCE_GATE.toFixed(2)}`,
    );
  }

  return {
    discovered: buildEnvelope(discovered, inputHash),
    registry: buildEnvelope(registry, inputHash),
    catalog: buildEnvelope(catalog, inputHash),
    matches: buildEnvelope(matchResults.matches, inputHash),
    scoringMode: matchResults.scoringMode,
    visualEvidenceHealth: matchResults.visualEvidenceHealth,
  };
}
