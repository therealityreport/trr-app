#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

import { buildHostedFontUrl } from "../src/lib/fonts/hosted-fonts.ts";
import {
  readHostedFamilyMap,
  resolveFontAsset,
  resolveSourceHostedFamily,
  resolveHostedFamily,
} from "../src/lib/fonts/brand-fonts/asset-resolution.ts";
import { buildBrandFontArtifacts } from "../src/lib/fonts/brand-fonts/generator.ts";
import { BRAND_FONT_MATCH_RULES } from "../src/lib/fonts/brand-fonts/seed.ts";
import { rankBrandFontCandidates } from "../src/lib/fonts/brand-fonts/scoring.ts";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = resolve(dirname(SCRIPT_PATH), "..");
const DEFAULT_OUTPUT_PATH = resolve(PROJECT_ROOT, "tmp/brand-font-visual-similarity.json");
const DEFAULT_LIMIT = 12;
const DEFAULT_CANVAS_WIDTH = 1400;
const DEFAULT_CANVAS_HEIGHT = 480;
const DEFAULT_FONT_SIZE = 112;

function printUsage() {
  console.log(`Usage:
  pnpm -C apps/web exec node scripts/brand-font-visual-similarity.mjs \\
    --brand-id <brand-id> \\
    --role-label <role label> \\
    --specimen <local path or https url> \\
    [--text <preview text>] \\
    [--limit <count>] \\
    [--output <json path>]

Example:
  pnpm -C apps/web exec node scripts/brand-font-visual-similarity.mjs \\
    --brand-id brand-nyt-games \\
    --role-label "Primary Display" \\
    --specimen public/design-docs/nyt-games/wordle-logo.svg \\
    --text "WORDLE" \\
    --limit 10`);
}

function parseArgs(argv) {
  const options = {
    brandId: "",
    roleLabel: "",
    specimen: "",
    text: "",
    output: DEFAULT_OUTPUT_PATH,
    limit: DEFAULT_LIMIT,
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

    if (token === "--brand-id") options.brandId = value;
    if (token === "--role-label") options.roleLabel = value;
    if (token === "--specimen") options.specimen = value;
    if (token === "--text") options.text = value;
    if (token === "--output") options.output = isAbsolute(value) ? value : resolve(PROJECT_ROOT, value);
    if (token === "--limit") options.limit = Number.parseInt(value, 10);

    index += 1;
  }

  return options;
}

function contentTypeForExtension(specimenPath) {
  const extension = extname(specimenPath).toLowerCase();
  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  return "image/png";
}

function fontContentTypeForExtension(fontPath) {
  const extension = extname(fontPath).toLowerCase();
  if (extension === ".woff2") return "font/woff2";
  if (extension === ".woff") return "font/woff";
  if (extension === ".ttf") return "font/ttf";
  if (extension === ".otf") return "font/otf";
  return "application/octet-stream";
}

async function loadDataUrl(input, fallbackContentType) {
  if (/^https?:\/\//i.test(input)) {
    const response = await fetch(input);
    if (!response.ok) {
      throw new Error(`Failed to fetch specimen: ${response.status} ${response.statusText}`);
    }
    const contentType = response.headers.get("content-type") ?? fallbackContentType ?? "application/octet-stream";
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  }

  const absolutePath = isAbsolute(input) ? input : resolve(PROJECT_ROOT, input);
  const buffer = await readFile(absolutePath);
  const contentType = fallbackContentType ?? contentTypeForExtension(absolutePath);
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

function normalizeFontSourceUrl(sourceUrl) {
  if (!sourceUrl) return "";
  if (/^https?:\/\//i.test(sourceUrl)) return sourceUrl;
  return buildHostedFontUrl(sourceUrl);
}

function defaultPreviewText(record) {
  const cleaned = record.evidenceExcerpt.replace(/\s+/g, " ").trim();
  if (cleaned.length >= 8 && cleaned.length <= 80) return cleaned;
  return record.sourceFontFamily;
}

function requestedWidth(record) {
  return record.sourceWidthNormalized[0] ?? "normal";
}

function buildReviewTemplate(record, rankedVisualMatches) {
  const topFamilies = rankedVisualMatches.slice(0, 3).map((match) => match.familyName);
  return {
    sourceFamily: record.sourceFontFamily,
    roleLabel: record.roleLabel,
    note: "Review visually before copying into BRAND_FONT_MATCH_RULES preferFamily or forceTopMatch.",
    suggestedRulePatch: {
      sourceFamily: record.sourceFontFamily,
      roleTypes: [record.roleType],
      preferFamily: topFamilies,
    },
  };
}

async function compareCandidates({ candidates, specimenDataUrl, text, fontSize }) {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: {
        width: DEFAULT_CANVAS_WIDTH,
        height: DEFAULT_CANVAS_HEIGHT,
      },
    });

    return await page.evaluate(
      async ({ evalCandidates, evalSpecimenDataUrl, evalText, evalFontSize }) => {
        function loadImage(src) {
          return new Promise((resolveImage, rejectImage) => {
            const image = new Image();
            image.onload = () => resolveImage(image);
            image.onerror = () => rejectImage(new Error(`image-load-failed:${src}`));
            image.src = src;
          });
        }

        function createCanvas(width, height) {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          return canvas;
        }

        function drawContainedImage(context, image, width, height) {
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, width, height);
          const scale = Math.min(width / image.width, height / image.height);
          const drawWidth = image.width * scale;
          const drawHeight = image.height * scale;
          const offsetX = (width - drawWidth) / 2;
          const offsetY = (height - drawHeight) / 2;
          context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
        }

        function renderTextImageData({ familyName, width, height, fontStyle, fontWeight, text }) {
          const canvas = createCanvas(width, height);
          const context = canvas.getContext("2d");
          if (!context) {
            throw new Error("candidate-canvas-context-unavailable");
          }
          context.clearRect(0, 0, width, height);
          context.fillStyle = "#111111";
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.font = `${fontStyle} ${fontWeight} ${evalFontSize}px "${familyName}"`;
          context.fillText(text, width / 2, height / 2, width * 0.88);
          return context.getImageData(0, 0, width, height);
        }

        function extractSpecimenMask(imageData) {
          const mask = new Array(imageData.width * imageData.height);
          for (let index = 0; index < mask.length; index += 1) {
            const offset = index * 4;
            const luminance = (
              imageData.data[offset] +
              imageData.data[offset + 1] +
              imageData.data[offset + 2]
            ) / (3 * 255);
            const darkness = Math.max(0, 1 - luminance - 0.04);
            mask[index] = darkness;
          }
          return mask;
        }

        function extractAlphaMask(imageData) {
          const mask = new Array(imageData.width * imageData.height);
          for (let index = 0; index < mask.length; index += 1) {
            mask[index] = imageData.data[index * 4 + 3] / 255;
          }
          return mask;
        }

        function findMaskBounds(mask, width, height) {
          let minX = width;
          let minY = height;
          let maxX = -1;
          let maxY = -1;
          for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
              const value = mask[y * width + x];
              if (value <= 0.03) continue;
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
          if (maxX < minX || maxY < minY) return null;
          return {
            minX: Math.max(0, minX - 8),
            minY: Math.max(0, minY - 8),
            maxX: Math.min(width - 1, maxX + 8),
            maxY: Math.min(height - 1, maxY + 8),
          };
        }

        function normalizeMask(mask, width, height, targetWidth, targetHeight) {
          const bounds = findMaskBounds(mask, width, height);
          if (!bounds) return null;

          const cropWidth = bounds.maxX - bounds.minX + 1;
          const cropHeight = bounds.maxY - bounds.minY + 1;
          const cropCanvas = createCanvas(cropWidth, cropHeight);
          const cropContext = cropCanvas.getContext("2d");
          if (!cropContext) {
            throw new Error("mask-crop-context-unavailable");
          }

          const cropImage = cropContext.createImageData(cropWidth, cropHeight);
          for (let y = 0; y < cropHeight; y += 1) {
            for (let x = 0; x < cropWidth; x += 1) {
              const value = mask[(bounds.minY + y) * width + (bounds.minX + x)];
              const alpha = Math.max(0, Math.min(255, Math.round(value * 255)));
              const offset = (y * cropWidth + x) * 4;
              cropImage.data[offset] = 0;
              cropImage.data[offset + 1] = 0;
              cropImage.data[offset + 2] = 0;
              cropImage.data[offset + 3] = alpha;
            }
          }
          cropContext.putImageData(cropImage, 0, 0);

          const normalizedCanvas = createCanvas(targetWidth, targetHeight);
          const normalizedContext = normalizedCanvas.getContext("2d");
          if (!normalizedContext) {
            throw new Error("normalized-mask-context-unavailable");
          }
          normalizedContext.clearRect(0, 0, targetWidth, targetHeight);
          const scale = Math.min(targetWidth / cropWidth, targetHeight / cropHeight);
          const drawWidth = cropWidth * scale;
          const drawHeight = cropHeight * scale;
          const drawX = (targetWidth - drawWidth) / 2;
          const drawY = (targetHeight - drawHeight) / 2;
          normalizedContext.drawImage(cropCanvas, drawX, drawY, drawWidth, drawHeight);

          const normalizedImage = normalizedContext.getImageData(0, 0, targetWidth, targetHeight);
          const alphaMask = new Array(targetWidth * targetHeight);
          let support = 0;
          for (let index = 0; index < alphaMask.length; index += 1) {
            alphaMask[index] = normalizedImage.data[index * 4 + 3] / 255;
            support += alphaMask[index];
          }

          return {
            alphaMask,
            aspectRatio: cropWidth / Math.max(cropHeight, 1),
            support,
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
          const similarity = Math.max(0, Math.round((1 - distance) * 100));
          return {
            similarity,
            distance,
            coverageDelta: Math.abs(leftMask.support - rightMask.support) / supportSum,
            aspectRatioDelta: Math.abs(leftMask.aspectRatio - rightMask.aspectRatio),
          };
        }

        const specimenImage = await loadImage(evalSpecimenDataUrl);
        const specimenCanvas = createCanvas(1400, 480);
        const specimenContext = specimenCanvas.getContext("2d");
        if (!specimenContext) {
          throw new Error("canvas-context-unavailable");
        }

        drawContainedImage(specimenContext, specimenImage, specimenCanvas.width, specimenCanvas.height);
        const specimenImageData = specimenContext.getImageData(
          0,
          0,
          specimenCanvas.width,
          specimenCanvas.height,
        );
        const normalizedSpecimenMask = normalizeMask(
          extractSpecimenMask(specimenImageData),
          specimenCanvas.width,
          specimenCanvas.height,
          420,
          140,
        );

        const results = [];
        for (const candidate of evalCandidates) {
          if (!candidate.fontDataUrl || !candidate.resolvedCandidateAsset) {
            results.push({
              familyName: candidate.familyName,
              heuristicScore: candidate.heuristicScore,
              fitForRole: candidate.fitForRole,
              matchWarnings: candidate.matchWarnings,
              rationaleChips: candidate.rationaleChips,
              matchSource: candidate.matchSource,
              sourceUrl: candidate.sourceUrl,
              familyScore: candidate.familyScore,
              requestedFamilyName: candidate.requestedFamilyName,
              resolvedCandidateAsset: candidate.resolvedCandidateAsset ?? null,
              fontLoadStatus: "degraded",
              degradedReason: candidate.degradedReason ?? "candidate-asset-unresolved",
              visualDistance: 1,
              visualScore: 0,
              combinedScore: Math.round(candidate.heuristicScore * 0.35),
            });
            continue;
          }
          try {
            const fontFace = new FontFace(
              candidate.resolvedCandidateAsset.resolvedFamilyName,
              `url("${candidate.fontDataUrl}")`,
              {
                style: candidate.resolvedCandidateAsset.resolvedStyle,
                weight: String(candidate.resolvedCandidateAsset.resolvedWeight),
              },
            );
            await fontFace.load();
            document.fonts.add(fontFace);
            await document.fonts.load(
              `${candidate.resolvedCandidateAsset.resolvedStyle} ${candidate.resolvedCandidateAsset.resolvedWeight} ${evalFontSize}px "${candidate.resolvedCandidateAsset.resolvedFamilyName}"`,
            );
            const fontLoaded = document.fonts.check(
              `${candidate.resolvedCandidateAsset.resolvedStyle} ${candidate.resolvedCandidateAsset.resolvedWeight} ${evalFontSize}px "${candidate.resolvedCandidateAsset.resolvedFamilyName}"`,
            );

            const candidateImageData = renderTextImageData({
              familyName: candidate.resolvedCandidateAsset.resolvedFamilyName,
              width: 1400,
              height: 480,
              fontStyle: candidate.resolvedCandidateAsset.resolvedStyle,
              fontWeight: candidate.resolvedCandidateAsset.resolvedWeight,
              text: evalText,
            });
            const normalizedCandidateMask = normalizeMask(
              extractAlphaMask(candidateImageData),
              1400,
              480,
              420,
              140,
            );
            const comparison = compareMasks(normalizedSpecimenMask, normalizedCandidateMask);
            if (!comparison) {
              throw new Error("mask-comparison-unavailable");
            }
            const normalizedAspectPenalty = Math.min(2, comparison.aspectRatioDelta) * 1.5;
            const visualScore = Math.max(
              0,
              Math.round(
                comparison.similarity -
                comparison.coverageDelta * 18 -
                normalizedAspectPenalty,
              ),
            );
            const visualDistance = comparison.distance;
            const combinedScore = Math.max(
              0,
              Math.round(candidate.heuristicScore * 0.45 + visualScore * 0.55),
            );

            results.push({
              familyName: candidate.familyName,
              heuristicScore: candidate.heuristicScore,
              fitForRole: candidate.fitForRole,
              matchWarnings: candidate.matchWarnings,
              rationaleChips: candidate.rationaleChips,
              matchSource: candidate.matchSource,
              sourceUrl: candidate.sourceUrl,
              familyScore: candidate.familyScore,
              requestedFamilyName: candidate.requestedFamilyName,
              resolvedCandidateAsset: candidate.resolvedCandidateAsset,
              fontLoadStatus: fontLoaded ? "loaded" : "degraded",
              degradedReason: fontLoaded ? null : "font-face-check-failed",
              aspectRatioDelta: Number(comparison.aspectRatioDelta.toFixed(4)),
              coverageDelta: Number(comparison.coverageDelta.toFixed(4)),
              visualDistance: Number(visualDistance.toFixed(4)),
              visualScore,
              combinedScore,
            });
          } catch (error) {
            results.push({
              familyName: candidate.familyName,
              heuristicScore: candidate.heuristicScore,
              fitForRole: candidate.fitForRole,
              matchWarnings: candidate.matchWarnings,
              rationaleChips: candidate.rationaleChips,
              matchSource: candidate.matchSource,
              sourceUrl: candidate.sourceUrl,
              familyScore: candidate.familyScore,
              requestedFamilyName: candidate.requestedFamilyName,
              resolvedCandidateAsset: candidate.resolvedCandidateAsset ?? null,
              fontLoadStatus: "degraded",
              degradedReason: error instanceof Error ? error.message : "font-render-failed",
              visualDistance: 1,
              visualScore: 0,
              combinedScore: Math.round(candidate.heuristicScore * 0.35),
            });
          }
        }

        return results.sort((left, right) => {
          if (right.combinedScore !== left.combinedScore) return right.combinedScore - left.combinedScore;
          return right.heuristicScore - left.heuristicScore;
        });
      },
      {
        evalCandidates: candidates,
        evalSpecimenDataUrl: specimenDataUrl,
        evalText: text,
        evalFontSize: fontSize,
      },
    );
  } finally {
    await browser.close();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }
  if (!options.brandId || !options.roleLabel || !options.specimen) {
    printUsage();
    throw new Error("brand-id, role-label, and specimen are required");
  }
  if (!Number.isFinite(options.limit) || options.limit <= 0) {
    throw new Error("limit must be a positive integer");
  }

  const artifacts = buildBrandFontArtifacts(PROJECT_ROOT);
  const record = artifacts.registry.data.find(
    (entry) => entry.brandId === options.brandId && entry.roleLabel === options.roleLabel,
  );
  if (!record) {
    throw new Error(`Brand font record not found for ${options.brandId} / ${options.roleLabel}`);
  }
  const familyMap = readHostedFamilyMap(PROJECT_ROOT);
  const sourceFamily = resolveSourceHostedFamily(record, familyMap);
  const sourceAsset = sourceFamily
    ? resolveFontAsset(
        record.sourceFontFamily,
        sourceFamily,
        Math.max(...record.sourceWeightsNormalized),
        record.sourceStyles.includes("italic") ? "italic" : "normal",
        requestedWidth(record),
      )
    : null;

  const rankedHeuristicMatches = rankBrandFontCandidates(
    record,
    artifacts.catalog.data,
    BRAND_FONT_MATCH_RULES,
    { includeBelowCredible: true, limit: options.limit },
  );
  const specimenDataUrl = await loadDataUrl(options.specimen);
  const text = options.text || defaultPreviewText(record);
  const candidates = rankedHeuristicMatches.map((match) => ({
    requestedFamilyName: match.familyName,
    familyName: match.familyName,
    sourceUrl: normalizeFontSourceUrl(match.sourceUrl),
    heuristicScore: match.score,
    fitForRole: match.fitForRole,
    matchWarnings: match.matchWarnings,
    rationaleChips: match.rationaleChips,
    matchSource: match.matchSource,
    familyScore: match.familyScore,
    resolvedCandidateAsset: (() => {
      const candidateFamily = resolveHostedFamily(match.familyName, familyMap);
      if (!candidateFamily) return null;
      return resolveFontAsset(
        match.familyName,
        candidateFamily,
        Math.max(...record.sourceWeightsNormalized),
        record.sourceStyles.includes("italic") ? "italic" : "normal",
        requestedWidth(record),
      );
    })(),
  }));
  const hydratedCandidates = await Promise.all(
    candidates.map(async (candidate) => ({
      ...candidate,
      sourceUrl: candidate.resolvedCandidateAsset
        ? normalizeFontSourceUrl(candidate.resolvedCandidateAsset.sourceUrl)
        : candidate.sourceUrl,
      degradedReason: candidate.resolvedCandidateAsset ? null : "candidate-asset-unresolved",
      fontDataUrl: candidate.resolvedCandidateAsset
        ? await loadDataUrl(
            normalizeFontSourceUrl(candidate.resolvedCandidateAsset.sourceUrl),
            fontContentTypeForExtension(candidate.resolvedCandidateAsset.sourceUrl),
          )
        : null,
    })),
  );

  const rankedVisualMatches = await compareCandidates({
    candidates: hydratedCandidates,
    specimenDataUrl,
    text,
    fontSize: DEFAULT_FONT_SIZE,
  });

  const output = {
    generatedAt: new Date().toISOString(),
    algorithm: "canvas-visual-similarity-v2",
    projectRoot: PROJECT_ROOT,
    input: {
      brandId: options.brandId,
      roleLabel: options.roleLabel,
      sourceFontFamily: record.sourceFontFamily,
      resolvedSourceFamily: sourceFamily?.familyName ?? null,
      resolvedSourceAsset: sourceAsset,
      specimen: options.specimen,
      text,
      limit: options.limit,
      visualEvidenceHealth: artifacts.visualEvidenceHealth,
    },
    reviewTemplate: buildReviewTemplate(record, rankedVisualMatches),
    results: rankedVisualMatches,
  };

  await mkdir(dirname(options.output), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(`Saved visual similarity report to ${options.output}`);
  console.table(
    rankedVisualMatches.slice(0, 5).map((match) => ({
      family: match.familyName,
      combined: match.combinedScore,
      visual: match.visualScore,
      heuristic: match.heuristicScore,
      fit: match.fitForRole,
    })),
  );
}

main().catch((error) => {
  console.error("[brand-font-visual-similarity]", error);
  process.exitCode = 1;
});
