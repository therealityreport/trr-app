#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

import { parseHostedFontCatalogStylesheet } from "../src/lib/fonts/hosted-font-catalog.ts";
import { buildHostedFontUrl } from "../src/lib/fonts/hosted-fonts.ts";
import { discoverBrandFontEvidence } from "../src/lib/fonts/brand-fonts/discovery.ts";
import {
  buildBrandFontArtifactsInputHash,
  buildRegistry,
  parseHostedCatalog,
} from "../src/lib/fonts/brand-fonts/generator.ts";
import { GLYPH_COMPARISON_SCHEMA_VERSION } from "../src/lib/fonts/brand-fonts/glyph-comparison.ts";
import { normalizeFontKey } from "../src/lib/fonts/brand-fonts/normalization.ts";
import { BRAND_FONT_MATCH_RULES } from "../src/lib/fonts/brand-fonts/seed.ts";
import { rankBrandFontCandidates } from "../src/lib/fonts/brand-fonts/scoring.ts";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = resolve(dirname(SCRIPT_PATH), "..");
const OUTPUT_DIR = resolve(PROJECT_ROOT, "src/lib/fonts/brand-fonts/generated");
const RAW_OUTPUT_PATH = resolve(PROJECT_ROOT, "tmp/brand-font-glyph-comparison-raw.json");
const SUMMARY_OUTPUT_PATH = resolve(OUTPUT_DIR, "glyph-comparison-results.json");
const GLYPHS = [
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  ..."abcdefghijklmnopqrstuvwxyz",
  ..."0123456789",
];
const KERNING_PAIRS = [
  "AV", "AW", "AY", "FA", "LT", "LV", "LW", "PA",
  "TA", "Te", "To", "Tr", "Tu", "Tw", "Ty",
  "VA", "Ve", "Vo", "WA", "We", "Wo",
  "Ya", "Ye", "Yo",
];
const GLYPH_CANVAS_SIZE = 220;
const SENTENCE_CANVAS_WIDTH = 1600;
const SENTENCE_CANVAS_HEIGHT = 320;
const NORMALIZED_GLYPH_SIZE = 96;
const NORMALIZED_SENTENCE_WIDTH = 640;
const NORMALIZED_SENTENCE_HEIGHT = 128;
const FONT_SIZE = 112;
const SENTENCE_FONT_SIZE = 92;
const PADDING = 8;
const DEFAULT_LIMIT = 5;
const SENTENCE_TEXT = "The quick brown fox jumps over the lazy dog 0123456789";
const SOURCE_FAMILY_ALIASES = new Map([
  ["nytkarnakcondensed", ["NYTKarnak_Condensed"]],
  ["nytkarnak", ["KarnakPro-Book"]],
  ["nytfranklin", ["NYTFranklin"]],
  ["tnwebuseonly", ["TN_Web_Use_Only"]],
  ["helveticaneue", ["Helvetica_Neue"]],
]);

function printUsage() {
  console.log(`Usage:
  pnpm -C apps/web exec node scripts/brand-font-glyph-comparison.mjs

Options:
  --limit <count>    Metadata-ranked candidate count per brand role (default ${DEFAULT_LIMIT})
  --raw-output <path>
  --summary-output <path>`);
}

function parseArgs(argv) {
  const options = {
    limit: DEFAULT_LIMIT,
    rawOutput: RAW_OUTPUT_PATH,
    summaryOutput: SUMMARY_OUTPUT_PATH,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const value = argv[index + 1];
    if (token === "--help") {
      options.help = true;
      continue;
    }
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${token}`);
    }
    if (token === "--limit") options.limit = Number.parseInt(value, 10) || DEFAULT_LIMIT;
    if (token === "--raw-output") options.rawOutput = isAbsolute(value) ? value : resolve(PROJECT_ROOT, value);
    if (token === "--summary-output") options.summaryOutput = isAbsolute(value) ? value : resolve(PROJECT_ROOT, value);
    index += 1;
  }

  return options;
}

function mean(numbers) {
  if (!numbers.length) return 0;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function uniqueByKey(values, keyFn) {
  const seen = new Set();
  return values.filter((value) => {
    const key = keyFn(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildCandidateScope(record, catalog, limit) {
  const metadataRanked = rankBrandFontCandidates(
    record,
    catalog,
    BRAND_FONT_MATCH_RULES,
    { includeBelowCredible: true, limit },
    { glyphComparisonArtifact: null },
  );

  const familyNames = [
    ...metadataRanked.map((entry) => entry.familyName),
    record.currentReferenceSubstitute,
  ].filter(Boolean);

  return uniqueByKey(
    familyNames
      .map((familyName) => catalog.find((candidate) => normalizeFontKey(candidate.familyName) === normalizeFontKey(familyName)))
      .filter(Boolean)
      .map((candidate) => ({
        ...candidate,
        candidateSource:
          record.currentReferenceSubstitute &&
          normalizeFontKey(record.currentReferenceSubstitute) === normalizeFontKey(candidate.familyName)
            ? "current-substitute"
            : "metadata",
      })),
    (candidate) => normalizeFontKey(candidate.familyName),
  );
}

async function readStylesheet(relativePath) {
  return readFile(join(PROJECT_ROOT, relativePath), "utf8");
}

function buildFontFamilyCatalog(hostedStylesheet, referenceStylesheet) {
  const allFamilies = parseHostedFontCatalogStylesheet(`${hostedStylesheet}\n${referenceStylesheet}`);
  const familyMap = new Map();
  for (const family of allFamilies) {
    familyMap.set(normalizeFontKey(family.familyName), family);
  }
  return familyMap;
}

function resolveSourceFamily(record, familyMap) {
  const direct = familyMap.get(normalizeFontKey(record.sourceFontFamily));
  if (direct) return direct;
  const substitute = record.currentReferenceSubstitute
    ? familyMap.get(normalizeFontKey(record.currentReferenceSubstitute))
    : null;
  const aliases = SOURCE_FAMILY_ALIASES.get(normalizeFontKey(record.sourceFontFamily)) ?? [];
  const aliasMatch = aliases
    .map((alias) => familyMap.get(normalizeFontKey(alias)))
    .find(Boolean);
  return aliasMatch ?? substitute ?? null;
}

function selectSourceStyle(record, family) {
  const sourceWeight = record.sourceWeightsNormalized[0] ?? 400;
  const sourceStyle = record.sourceStyles[0] ?? "normal";
  return (
    family.styles.find((style) => style.weight === sourceWeight && style.style === sourceStyle) ??
    family.styles.find((style) => style.style === sourceStyle) ??
    family.styles[0] ??
    null
  );
}

function selectCandidateStyles(record, family) {
  const sourceStyle = record.sourceStyles[0] ?? "normal";
  const matchingStyle = family.styles.filter((style) => style.style === sourceStyle);
  const styles = matchingStyle.length > 0 ? matchingStyle : family.styles;
  return uniqueByKey(styles, (style) => `${style.weight}:${style.style}`);
}

async function loadFontDataUrl(sourceUrl, cache) {
  if (cache.has(sourceUrl)) return cache.get(sourceUrl);
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`font-fetch-failed:${response.status}:${sourceUrl}`);
  }
  const contentType = response.headers.get("content-type") ?? "font/woff2";
  const buffer = Buffer.from(await response.arrayBuffer());
  const dataUrl = `data:${contentType};base64,${buffer.toString("base64")}`;
  cache.set(sourceUrl, dataUrl);
  return dataUrl;
}

function resolveFontFetchUrl(sourceUrl) {
  return /^https?:\/\//i.test(sourceUrl) ? sourceUrl : buildHostedFontUrl(sourceUrl);
}

async function compareWeight(page, payload) {
  return page.evaluate(
    async ({
      sourceFamily,
      sourceFontDataUrl,
      sourceFontStyle,
      sourceFontWeight,
      candidateFamily,
      candidateFontDataUrl,
      candidateFontStyle,
      candidateFontWeight,
      glyphs,
      kerningPairs,
      glyphCanvasSize,
      sentenceCanvasWidth,
      sentenceCanvasHeight,
      normalizedGlyphSize,
      normalizedSentenceWidth,
      normalizedSentenceHeight,
      fontSize,
      sentenceFontSize,
      padding,
      sentenceText,
    }) => {
      const sourceFace = new FontFace(sourceFamily, `url("${sourceFontDataUrl}")`, {
        style: sourceFontStyle,
        weight: String(sourceFontWeight),
      });
      const candidateFace = new FontFace(candidateFamily, `url("${candidateFontDataUrl}")`, {
        style: candidateFontStyle,
        weight: String(candidateFontWeight),
      });
      await sourceFace.load();
      await candidateFace.load();
      document.fonts.add(sourceFace);
      document.fonts.add(candidateFace);
      await document.fonts.ready;

      function createCanvas(width, height) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        return canvas;
      }

      function renderTextAlpha({
        familyName,
        fontStyle,
        fontWeight,
        text,
        width,
        height,
        fontSizeValue,
        align = "center",
        maxWidth = width * 0.88,
      }) {
        const canvas = createCanvas(width, height);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("canvas-context-unavailable");

        context.clearRect(0, 0, width, height);
        context.fillStyle = "#000000";
        context.textBaseline = "middle";
        context.textAlign = align;
        context.font = `${fontStyle} ${fontWeight} ${fontSizeValue}px "${familyName}"`;

        if (align === "center") {
          context.fillText(text, width / 2, height / 2, maxWidth);
        } else {
          context.fillText(text, padding, height / 2, maxWidth);
        }

        return context.getImageData(0, 0, width, height);
      }

      function findInkBounds(imageData) {
        const { data, width, height } = imageData;
        let minX = width;
        let minY = height;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const alpha = data[(y * width + x) * 4 + 3];
            if (alpha <= 0) continue;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }

        if (maxX < minX || maxY < minY) return null;

        return {
          minX: Math.max(0, minX - padding),
          minY: Math.max(0, minY - padding),
          maxX: Math.min(width - 1, maxX + padding),
          maxY: Math.min(height - 1, maxY + padding),
        };
      }

      function normalizeAlphaMask(imageData, targetWidth, targetHeight) {
        const bounds = findInkBounds(imageData);
        if (!bounds) return null;

        const cropWidth = bounds.maxX - bounds.minX + 1;
        const cropHeight = bounds.maxY - bounds.minY + 1;
        const cropCanvas = createCanvas(cropWidth, cropHeight);
        const cropContext = cropCanvas.getContext("2d");
        if (!cropContext) throw new Error("crop-context-unavailable");

        const cropped = cropContext.createImageData(cropWidth, cropHeight);
        for (let y = 0; y < cropHeight; y += 1) {
          for (let x = 0; x < cropWidth; x += 1) {
            const sourceX = bounds.minX + x;
            const sourceY = bounds.minY + y;
            const sourceIndex = (sourceY * imageData.width + sourceX) * 4;
            const alpha = imageData.data[sourceIndex + 3];
            const targetIndex = (y * cropWidth + x) * 4;
            cropped.data[targetIndex] = 0;
            cropped.data[targetIndex + 1] = 0;
            cropped.data[targetIndex + 2] = 0;
            cropped.data[targetIndex + 3] = alpha;
          }
        }
        cropContext.putImageData(cropped, 0, 0);

        const normalizedCanvas = createCanvas(targetWidth, targetHeight);
        const normalizedContext = normalizedCanvas.getContext("2d");
        if (!normalizedContext) throw new Error("normalized-context-unavailable");
        normalizedContext.clearRect(0, 0, targetWidth, targetHeight);

        const scale = Math.min(targetWidth / cropWidth, targetHeight / cropHeight);
        const drawWidth = cropWidth * scale;
        const drawHeight = cropHeight * scale;
        const drawX = (targetWidth - drawWidth) / 2;
        const drawY = (targetHeight - drawHeight) / 2;
        normalizedContext.drawImage(cropCanvas, drawX, drawY, drawWidth, drawHeight);

        const normalized = normalizedContext.getImageData(0, 0, targetWidth, targetHeight);
        const alphaMask = new Array(targetWidth * targetHeight);
        for (let index = 0; index < alphaMask.length; index += 1) {
          alphaMask[index] = normalized.data[index * 4 + 3] / 255;
        }

        return {
          alphaMask,
          width: targetWidth,
          height: targetHeight,
        };
      }

      function compareMasks(leftMask, rightMask) {
        if (!leftMask || !rightMask) return null;
        let differenceSum = 0;
        let supportSum = 0;

        for (let index = 0; index < leftMask.alphaMask.length; index += 1) {
          const left = leftMask.alphaMask[index];
          const right = rightMask.alphaMask[index];
          differenceSum += Math.abs(left - right);
          supportSum += Math.max(left, right);
        }

        if (supportSum === 0) return null;
        const distance = differenceSum / supportSum;
        return Math.max(0, Math.round((1 - distance) * 100));
      }

      function measureKerning(familyName, fontStyle, fontWeight, pair) {
        const canvas = createCanvas(glyphCanvasSize, glyphCanvasSize);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("kerning-context-unavailable");
        context.font = `${fontStyle} ${fontWeight} ${fontSize}px "${familyName}"`;
        const pairWidth = context.measureText(pair).width;
        const first = context.measureText(pair[0]).width;
        const second = context.measureText(pair[1]).width;
        return pairWidth - (first + second);
      }

      const glyphResults = glyphs
        .map((char) => {
          const sourceImage = renderTextAlpha({
            familyName: sourceFamily,
            fontStyle: sourceFontStyle,
            fontWeight: sourceFontWeight,
            text: char,
            width: glyphCanvasSize,
            height: glyphCanvasSize,
            fontSizeValue: fontSize,
          });
          const candidateImage = renderTextAlpha({
            familyName: candidateFamily,
            fontStyle: candidateFontStyle,
            fontWeight: candidateFontWeight,
            text: char,
            width: glyphCanvasSize,
            height: glyphCanvasSize,
            fontSizeValue: fontSize,
          });
          const sourceMask = normalizeAlphaMask(sourceImage, normalizedGlyphSize, normalizedGlyphSize);
          const candidateMask = normalizeAlphaMask(candidateImage, normalizedGlyphSize, normalizedGlyphSize);
          const similarity = compareMasks(sourceMask, candidateMask);
          if (similarity === null) return null;
          return {
            char,
            category: /[A-Z]/.test(char) ? "upper" : /[a-z]/.test(char) ? "lower" : "numeral",
            similarity,
          };
        })
        .filter(Boolean);

      const uppercaseScore = Math.round(
        glyphResults.filter((glyph) => glyph.category === "upper").reduce((sum, glyph, _, array) => (
          sum + glyph.similarity / Math.max(array.length, 1)
        ), 0),
      );
      const lowercaseScore = Math.round(
        glyphResults.filter((glyph) => glyph.category === "lower").reduce((sum, glyph, _, array) => (
          sum + glyph.similarity / Math.max(array.length, 1)
        ), 0),
      );
      const numeralScore = Math.round(
        glyphResults.filter((glyph) => glyph.category === "numeral").reduce((sum, glyph, _, array) => (
          sum + glyph.similarity / Math.max(array.length, 1)
        ), 0),
      );

      const sourceSentence = normalizeAlphaMask(
        renderTextAlpha({
          familyName: sourceFamily,
          fontStyle: sourceFontStyle,
          fontWeight: sourceFontWeight,
          text: sentenceText,
          width: sentenceCanvasWidth,
          height: sentenceCanvasHeight,
          fontSizeValue: sentenceFontSize,
          align: "left",
          maxWidth: sentenceCanvasWidth - padding * 2,
        }),
        normalizedSentenceWidth,
        normalizedSentenceHeight,
      );
      const candidateSentence = normalizeAlphaMask(
        renderTextAlpha({
          familyName: candidateFamily,
          fontStyle: candidateFontStyle,
          fontWeight: candidateFontWeight,
          text: sentenceText,
          width: sentenceCanvasWidth,
          height: sentenceCanvasHeight,
          fontSizeValue: sentenceFontSize,
          align: "left",
          maxWidth: sentenceCanvasWidth - padding * 2,
        }),
        normalizedSentenceWidth,
        normalizedSentenceHeight,
      );
      const sentenceSimilarity = compareMasks(sourceSentence, candidateSentence) ?? 0;
      const sentenceScore = sentenceSimilarity;

      const kerningPairsResult = kerningPairs.map((pair) => {
        const sourceKerning = measureKerning(sourceFamily, sourceFontStyle, sourceFontWeight, pair);
        const candidateKerning = measureKerning(candidateFamily, candidateFontStyle, candidateFontWeight, pair);
        return {
          pair,
          sourceKerning: Number(sourceKerning.toFixed(4)),
          candidateKerning: Number(candidateKerning.toFixed(4)),
          deltaEm: Number(((sourceKerning - candidateKerning) / fontSize).toFixed(4)),
        };
      });

      return {
        glyphs: glyphResults,
        uppercaseScore,
        lowercaseScore,
        numeralScore,
        sentenceScore,
        sentenceComparison: {
          text: sentenceText,
          similarity: sentenceSimilarity,
        },
        kerningPairs: kerningPairsResult,
      };
    },
    payload,
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  const hostedStylesheet = await readStylesheet("src/styles/cdn-fonts.css");
  const referenceStylesheet = await readStylesheet("src/styles/realitease-fonts.css");
  const familyMap = buildFontFamilyCatalog(hostedStylesheet, referenceStylesheet);
  const discovered = discoverBrandFontEvidence(PROJECT_ROOT);
  const registry = buildRegistry(discovered);
  const hostedCatalog = parseHostedCatalog(PROJECT_ROOT);
  const inputHash = buildBrandFontArtifactsInputHash(PROJECT_ROOT, discovered);
  const fontCache = new Map();
  const rawPairs = [];
  const summaryPairs = [];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });

  try {
    for (const record of registry) {
      const sourceFamily = resolveSourceFamily(record, familyMap);
      if (!sourceFamily) continue;
      const sourceStyle = selectSourceStyle(record, sourceFamily);
      if (!sourceStyle?.sourceUrl) continue;
      const sourceFontDataUrl = await loadFontDataUrl(resolveFontFetchUrl(sourceStyle.sourceUrl), fontCache);
      const candidates = buildCandidateScope(record, hostedCatalog, options.limit);

      for (const candidate of candidates) {
        const candidateFamily = familyMap.get(normalizeFontKey(candidate.familyName));
        if (!candidateFamily) continue;
        const candidateStyles = selectCandidateStyles(record, candidateFamily).filter((style) => Boolean(style.sourceUrl));
        if (candidateStyles.length === 0) continue;

        const perWeight = [];
        for (const candidateStyle of candidateStyles) {
          const candidateFontDataUrl = await loadFontDataUrl(resolveFontFetchUrl(candidateStyle.sourceUrl), fontCache);
          const comparison = await compareWeight(page, {
            sourceFamily: sourceFamily.familyName,
            sourceFontDataUrl,
            sourceFontStyle: sourceStyle.style,
            sourceFontWeight: sourceStyle.weight,
            candidateFamily: candidateFamily.familyName,
            candidateFontDataUrl,
            candidateFontStyle: candidateStyle.style,
            candidateFontWeight: candidateStyle.weight,
            glyphs: GLYPHS,
            kerningPairs: KERNING_PAIRS,
            glyphCanvasSize: GLYPH_CANVAS_SIZE,
            sentenceCanvasWidth: SENTENCE_CANVAS_WIDTH,
            sentenceCanvasHeight: SENTENCE_CANVAS_HEIGHT,
            normalizedGlyphSize: NORMALIZED_GLYPH_SIZE,
            normalizedSentenceWidth: NORMALIZED_SENTENCE_WIDTH,
            normalizedSentenceHeight: NORMALIZED_SENTENCE_HEIGHT,
            fontSize: FONT_SIZE,
            sentenceFontSize: SENTENCE_FONT_SIZE,
            padding: PADDING,
            sentenceText: SENTENCE_TEXT,
          });

          const overallScore = Math.round(
            comparison.uppercaseScore * 0.35 +
            comparison.lowercaseScore * 0.35 +
            comparison.numeralScore * 0.10 +
            comparison.sentenceScore * 0.20,
          );
          const recommendedLetterSpacingEm = round(
            mean(comparison.kerningPairs.map((pair) => pair.deltaEm)),
            3,
          );
          perWeight.push({
            weight: candidateStyle.weight,
            overallScore,
            uppercaseScore: comparison.uppercaseScore,
            lowercaseScore: comparison.lowercaseScore,
            numeralScore: comparison.numeralScore,
            sentenceScore: comparison.sentenceScore,
            sentenceComparison: comparison.sentenceComparison,
            glyphs: comparison.glyphs,
            kerningPairs: comparison.kerningPairs,
            recommendedLetterSpacingEm,
          });
        }

        if (perWeight.length === 0) continue;
        perWeight.sort((left, right) => right.overallScore - left.overallScore || left.weight - right.weight);
        const bestWeight = perWeight[0];
        const sortedGlyphs = [...bestWeight.glyphs].sort((left, right) => right.similarity - left.similarity);
        rawPairs.push({
          brandId: record.brandId,
          brandLabel: record.brandLabel,
          roleLabel: record.roleLabel,
          roleType: record.roleType,
          sourceFamily: record.sourceFontFamily,
          resolvedSourceFamily: sourceFamily.familyName,
          currentReferenceSubstitute: record.currentReferenceSubstitute,
          candidateFamily: candidate.familyName,
          candidateSource: candidate.candidateSource,
          sourceWeight: sourceStyle.weight,
          perWeight,
        });
        summaryPairs.push({
          brandId: record.brandId,
          brandLabel: record.brandLabel,
          roleLabel: record.roleLabel,
          roleType: record.roleType,
          sourceFamily: record.sourceFontFamily,
          resolvedSourceFamily: sourceFamily.familyName,
          sourceWeight: sourceStyle.weight,
          currentReferenceSubstitute: record.currentReferenceSubstitute,
          candidateFamily: candidate.familyName,
          candidateSource: candidate.candidateSource,
          aggregateVisualAffinity: bestWeight.overallScore,
          perWeight: perWeight.map((entry) => ({
            weight: entry.weight,
            overallScore: entry.overallScore,
            uppercaseScore: entry.uppercaseScore,
            lowercaseScore: entry.lowercaseScore,
            numeralScore: entry.numeralScore,
            sentenceScore: entry.sentenceScore,
            sentenceComparison: entry.sentenceComparison,
            glyphs: entry.glyphs,
          })),
          kerning: {
            weight: bestWeight.weight,
            pairs: bestWeight.kerningPairs,
            recommendedLetterSpacingEm: bestWeight.recommendedLetterSpacingEm,
          },
          mostDifferentGlyphs: [...sortedGlyphs].reverse().slice(0, 10),
          mostSimilarGlyphs: sortedGlyphs.slice(0, 10),
        });
      }
    }
  } finally {
    await browser.close();
  }

  const rawArtifact = {
    schemaVersion: GLYPH_COMPARISON_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    algorithm: "canvas-glyph-comparison-v1",
    inputHash,
    pairs: rawPairs,
  };
  const summaryArtifact = {
    schemaVersion: GLYPH_COMPARISON_SCHEMA_VERSION,
    generatedAt: rawArtifact.generatedAt,
    algorithm: "canvas-glyph-comparison-v1",
    inputHash,
    pairs: summaryPairs.sort((left, right) => {
      if (left.brandLabel !== right.brandLabel) return left.brandLabel.localeCompare(right.brandLabel);
      if (left.roleLabel !== right.roleLabel) return left.roleLabel.localeCompare(right.roleLabel);
      return right.aggregateVisualAffinity - left.aggregateVisualAffinity;
    }),
  };

  await mkdir(dirname(options.rawOutput), { recursive: true });
  await mkdir(dirname(options.summaryOutput), { recursive: true });
  await Promise.all([
    writeFile(options.rawOutput, `${JSON.stringify(rawArtifact, null, 2)}\n`, "utf8"),
    writeFile(options.summaryOutput, `${JSON.stringify(summaryArtifact, null, 2)}\n`, "utf8"),
  ]);

  console.log(
    `Generated glyph comparison artifacts: ${summaryArtifact.pairs.length} pairs → ${options.summaryOutput}`,
  );
}

main().catch((error) => {
  console.error("[brand-font-glyph-comparison] failed", error);
  process.exitCode = 1;
});
