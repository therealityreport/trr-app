#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

import { buildHostedFontUrl } from "../src/lib/fonts/hosted-fonts.ts";
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

async function compareCandidates({ candidates, specimenDataUrl, text, fontSize, fontStyle, fontWeight }) {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: {
        width: DEFAULT_CANVAS_WIDTH,
        height: DEFAULT_CANVAS_HEIGHT,
      },
    });

    return await page.evaluate(
      async ({ evalCandidates, evalSpecimenDataUrl, evalText, evalFontSize, evalFontStyle, evalFontWeight }) => {
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

        function drawTextCandidate(context, familyName, width, height) {
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, width, height);
          context.fillStyle = "#111111";
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.font = `${evalFontStyle} ${evalFontWeight} ${evalFontSize}px "${familyName}"`;
          context.fillText(evalText, width / 2, height / 2, width * 0.88);
        }

        function meanAbsoluteDifference(leftData, rightData) {
          let total = 0;
          for (let index = 0; index < leftData.length; index += 4) {
            const left = (leftData[index] + leftData[index + 1] + leftData[index + 2]) / 3;
            const right = (rightData[index] + rightData[index + 1] + rightData[index + 2]) / 3;
            total += Math.abs(left - right);
          }
          return total / (leftData.length / 4) / 255;
        }

        const specimenImage = await loadImage(evalSpecimenDataUrl);
        const specimenCanvas = createCanvas(1400, 480);
        const specimenContext = specimenCanvas.getContext("2d");
        const reducedSpecimenCanvas = createCanvas(350, 120);
        const reducedSpecimenContext = reducedSpecimenCanvas.getContext("2d");
        if (!specimenContext || !reducedSpecimenContext) {
          throw new Error("canvas-context-unavailable");
        }

        drawContainedImage(specimenContext, specimenImage, specimenCanvas.width, specimenCanvas.height);
        reducedSpecimenContext.drawImage(specimenCanvas, 0, 0, reducedSpecimenCanvas.width, reducedSpecimenCanvas.height);
        const specimenPixels = reducedSpecimenContext.getImageData(
          0,
          0,
          reducedSpecimenCanvas.width,
          reducedSpecimenCanvas.height,
        ).data;

        const results = [];
        for (const candidate of evalCandidates) {
          try {
            const fontFace = new FontFace(candidate.familyName, `url("${candidate.fontDataUrl}")`);
            await fontFace.load();
            document.fonts.add(fontFace);
            await document.fonts.load(`${evalFontStyle} ${evalFontWeight} ${evalFontSize}px "${candidate.familyName}"`);

            const candidateCanvas = createCanvas(1400, 480);
            const candidateContext = candidateCanvas.getContext("2d");
            const reducedCandidateCanvas = createCanvas(350, 120);
            const reducedCandidateContext = reducedCandidateCanvas.getContext("2d");
            if (!candidateContext || !reducedCandidateContext) {
              throw new Error("candidate-canvas-context-unavailable");
            }

            drawTextCandidate(candidateContext, candidate.familyName, candidateCanvas.width, candidateCanvas.height);
            reducedCandidateContext.drawImage(
              candidateCanvas,
              0,
              0,
              reducedCandidateCanvas.width,
              reducedCandidateCanvas.height,
            );
            const candidatePixels = reducedCandidateContext.getImageData(
              0,
              0,
              reducedCandidateCanvas.width,
              reducedCandidateCanvas.height,
            ).data;
            const visualDistance = meanAbsoluteDifference(specimenPixels, candidatePixels);
            const visualScore = Math.max(0, Math.round((1 - visualDistance) * 100));

            results.push({
              familyName: candidate.familyName,
              heuristicScore: candidate.heuristicScore,
              fitForRole: candidate.fitForRole,
              matchWarnings: candidate.matchWarnings,
              rationaleChips: candidate.rationaleChips,
              matchSource: candidate.matchSource,
              sourceUrl: candidate.sourceUrl,
              familyScore: candidate.familyScore,
              visualDistance: Number(visualDistance.toFixed(4)),
              visualScore,
              combinedScore: Math.round(candidate.heuristicScore * 0.65 + visualScore * 0.35),
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
              visualDistance: 1,
              visualScore: 0,
              combinedScore: Math.round(candidate.heuristicScore * 0.5),
              error: error instanceof Error ? error.message : "font-render-failed",
            });
          }
        }

        return results.sort((left, right) => {
          if (right.combinedScore !== left.combinedScore) return right.combinedScore - left.combinedScore;
          if (right.visualScore !== left.visualScore) return right.visualScore - left.visualScore;
          return right.heuristicScore - left.heuristicScore;
        });
      },
      {
        evalCandidates: candidates,
        evalSpecimenDataUrl: specimenDataUrl,
        evalText: text,
        evalFontSize: fontSize,
        evalFontStyle: fontStyle,
        evalFontWeight: fontWeight,
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

  const rankedHeuristicMatches = rankBrandFontCandidates(
    record,
    artifacts.catalog.data,
    BRAND_FONT_MATCH_RULES,
    { includeBelowCredible: true, limit: options.limit },
  );
  const specimenDataUrl = await loadDataUrl(options.specimen);
  const text = options.text || defaultPreviewText(record);
  const fontWeight = Math.max(...record.sourceWeightsNormalized);
  const fontStyle = record.sourceStyles.includes("italic") ? "italic" : "normal";
  const candidates = rankedHeuristicMatches.map((match) => ({
    familyName: match.familyName,
    sourceUrl: normalizeFontSourceUrl(match.sourceUrl),
    heuristicScore: match.score,
    fitForRole: match.fitForRole,
    matchWarnings: match.matchWarnings,
    rationaleChips: match.rationaleChips,
    matchSource: match.matchSource,
    familyScore: match.familyScore,
  }));
  const hydratedCandidates = await Promise.all(
    candidates.map(async (candidate) => ({
      ...candidate,
      fontDataUrl: await loadDataUrl(
        candidate.sourceUrl,
        fontContentTypeForExtension(candidate.sourceUrl),
      ),
    })),
  );

  const rankedVisualMatches = await compareCandidates({
    candidates: hydratedCandidates,
    specimenDataUrl,
    text,
    fontSize: DEFAULT_FONT_SIZE,
    fontStyle,
    fontWeight,
  });

  const output = {
    generatedAt: new Date().toISOString(),
    algorithm: "canvas-visual-similarity-v1",
    projectRoot: PROJECT_ROOT,
    input: {
      brandId: options.brandId,
      roleLabel: options.roleLabel,
      sourceFontFamily: record.sourceFontFamily,
      specimen: options.specimen,
      text,
      limit: options.limit,
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
