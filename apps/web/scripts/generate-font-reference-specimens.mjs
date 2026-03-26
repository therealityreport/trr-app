#!/usr/bin/env node

/**
 * generate-font-reference-specimens.mjs
 *
 * Generates PNG specimen images for each brand font at every weight using
 * Playwright to render an HTML page with @font-face-loaded NYT CDN fonts.
 *
 * Output:
 *   tmp/font-specimens/{brand-name}/{font-name}-{weight}.png
 *   tmp/font-specimens/manifest.json
 *
 * Usage:
 *   pnpm -C apps/web generate:font-specimens
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIR, "..");
const OUTPUT_DIR = join(PROJECT_ROOT, "tmp/font-specimens");

const R2_BUCKET = "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev";
const R2_PREFIX = "fonts/references";

const SPECIMEN_WIDTH = 800;
const SPECIMEN_HEIGHT = 600;

/* ── Font inventory ─────────────────────────────────────────────────── */

/**
 * Known CDN hashes for specific font+weight combos (from Athletic source HTML
 * and BrandNYTTypography.tsx). For weights without a known hash, the CDN URL
 * is attempted without a hash segment — the NYT CDN serves these as
 * `{family}-normal-{weight}.woff2` which resolves through their edge.
 */
const KNOWN_HASHES = {
  "cheltenham-normal-300": null,
  "cheltenham-normal-500": "e6711d3a9af4e8cc6c129ba9940c081e",
  "cheltenham-normal-600": null,
  "cheltenham-normal-700": null,
  "cheltenham-normal-800": null,
  "franklin-normal-300": null,
  "franklin-normal-400": null,
  "franklin-normal-500": "0f4aea3d462cdb64748629efcbbf36bc",
  "franklin-normal-600": null,
  "franklin-normal-700": null,
  "franklin-normal-800": null,
  "imperial-normal-400": null,
  "imperial-normal-500": null,
};

function buildCdnUrl(cdnFamily, weight) {
  const key = `${cdnFamily}-normal-${weight}`;
  const hash = KNOWN_HASHES[key];
  if (hash) {
    return `https://g1.nyt.com/fonts/family/${cdnFamily}/${cdnFamily}-normal-${weight}.${hash}.woff2`;
  }
  // Hashless URL — works for most weights via NYT CDN edge resolution
  return `https://g1.nyt.com/fonts/family/${cdnFamily}/${cdnFamily}-normal-${weight}.woff2`;
}

/**
 * Complete font inventory per brand. Each entry has:
 *   fontName   - display name / CSS family used in the app
 *   cdnFamily  - the family segment in the g1.nyt.com CDN path
 *   weights    - numeric CSS weights to generate specimens for
 *   cdnUrls    - map of weight -> CDN woff2 URL (built below)
 */
const BRANDS = [
  {
    brand: "nytimes",
    fonts: [
      { fontName: "nyt-cheltenham", cdnFamily: "cheltenham", weights: [300, 500, 600, 700, 800] },
      { fontName: "nyt-cheltenham-cond", cdnFamily: "cheltenham", weights: [700], condensed: true },
      { fontName: "nyt-franklin", cdnFamily: "franklin", weights: [300, 400, 500, 600, 700, 800] },
      { fontName: "nyt-imperial", cdnFamily: "imperial", weights: [400, 500] },
      { fontName: "nyt-karnak", cdnFamily: "karnak", weights: [400, 700] },
      { fontName: "nyt-karnakcondensed", cdnFamily: "karnakcondensed", weights: [700] },
    ],
  },
  {
    brand: "the-athletic",
    fonts: [
      { fontName: "nyt-cheltenham", cdnFamily: "cheltenham", weights: [300, 500, 600, 700, 800] },
      { fontName: "nyt-cheltenham-cond", cdnFamily: "cheltenham", weights: [700], condensed: true },
      { fontName: "nyt-franklin", cdnFamily: "franklin", weights: [300, 400, 500, 600, 700, 800] },
      { fontName: "nyt-imperial", cdnFamily: "imperial", weights: [400, 500] },
      { fontName: "nyt-karnak", cdnFamily: "karnak", weights: [400, 700] },
      { fontName: "nyt-karnakcondensed", cdnFamily: "karnakcondensed", weights: [700] },
      { fontName: "RegularSlab", cdnFamily: null, weights: [400] },
    ],
  },
];

// Pre-compute CDN URLs for each font entry
for (const brandDef of BRANDS) {
  for (const fontDef of brandDef.fonts) {
    fontDef.cdnUrls = {};
    for (const w of fontDef.weights) {
      if (fontDef.cdnFamily) {
        fontDef.cdnUrls[w] = buildCdnUrl(fontDef.cdnFamily, w);
      } else {
        fontDef.cdnUrls[w] = null; // no CDN source (e.g. RegularSlab)
      }
    }
  }
}

/* ── Specimen HTML builder ──────────────────────────────────────────── */

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.";

function buildSpecimenHtml(fontName, weight, cdnUrl, condensed) {
  const specimenFamily = `specimen-${fontName}-${weight}`;
  const stretch = condensed ? "condensed" : "normal";

  // For fonts without a CDN URL, we show a placeholder
  const fontFaceBlock = cdnUrl
    ? `
    @font-face {
      font-family: "${specimenFamily}";
      src: url("${cdnUrl}") format("woff2");
      font-weight: ${weight};
      font-style: normal;
      font-stretch: ${stretch};
      font-display: block;
    }`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  ${fontFaceBlock}
  body {
    width: ${SPECIMEN_WIDTH}px;
    height: ${SPECIMEN_HEIGHT}px;
    background: #ffffff;
    color: #121212;
    padding: 32px 40px;
    overflow: hidden;
  }
  .specimen-font {
    font-family: "${specimenFamily}", "Georgia", serif;
    font-weight: ${weight};
    font-stretch: ${stretch};
  }
  .label {
    font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: #666666;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e0e0e0;
  }
  .line {
    margin-bottom: 8px;
    line-height: 1.3;
  }
  .line-alpha-upper {
    font-size: 22px;
    letter-spacing: 0.04em;
  }
  .line-alpha-lower {
    font-size: 22px;
    letter-spacing: 0.04em;
  }
  .line-numbers {
    font-size: 20px;
    letter-spacing: 0.02em;
    color: #333333;
  }
  .line-pangram {
    font-size: 20px;
    margin-top: 12px;
  }
  .line-headline {
    font-size: 32px;
    line-height: 1.15;
    margin-top: 16px;
    margin-bottom: 12px;
  }
  .line-body {
    font-size: 16px;
    line-height: 1.5;
    color: #363636;
  }
  .not-available {
    font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
    font-size: 18px;
    color: #cc0000;
    text-align: center;
    margin-top: 80px;
  }
</style>
</head>
<body>
  <div class="label">${fontName} ${weight}</div>
  <div id="specimen-content">
    <div class="line line-alpha-upper specimen-font">ABCDEFGHIJKLMNOPQRSTUVWXYZ</div>
    <div class="line line-alpha-lower specimen-font">abcdefghijklmnopqrstuvwxyz</div>
    <div class="line line-numbers specimen-font">0123456789 $\u20AC\u00A3\u00A5 .,;:!?</div>
    <div class="line line-pangram specimen-font">The Quick Brown Fox Jumps Over The Lazy Dog</div>
    <div class="line line-headline specimen-font">Economic Policy in the Digital Age</div>
    <div class="line line-body specimen-font">${LOREM}</div>
  </div>
  <div id="not-available" class="not-available" style="display:none;">
    Font not available \u2014 ${fontName} ${weight}
  </div>

  <script>
    (async () => {
      ${
        cdnUrl
          ? `
      try {
        const face = new FontFace("${specimenFamily}", 'url("${cdnUrl}")', {
          weight: "${weight}",
          style: "normal",
          stretch: "${stretch}",
          display: "block",
        });
        const loaded = await face.load();
        document.fonts.add(loaded);
        await document.fonts.ready;

        // Verify the font actually loaded (not a fallback)
        const check = document.fonts.check('${weight} 20px "${specimenFamily}"');
        if (!check) {
          throw new Error("font-check-failed");
        }
      } catch (err) {
        document.getElementById("specimen-content").style.display = "none";
        document.getElementById("not-available").style.display = "block";
        document.getElementById("not-available").textContent =
          "Font not available \\u2014 " + "${fontName}" + " " + "${weight}" + " (" + err.message + ")";
      }
      `
          : `
      // No CDN URL for this font — show placeholder
      document.getElementById("specimen-content").style.display = "none";
      document.getElementById("not-available").style.display = "block";
      `
      }
      // Signal to Playwright that rendering is complete
      window.__SPECIMEN_READY__ = true;
    })();
  </script>
</body>
</html>`;
}

/* ── Main ───────────────────────────────────────────────────────────── */

async function main() {
  console.log("Generating font reference specimens...\n");

  const manifest = { specimens: [] };
  const jobs = [];

  for (const brandDef of BRANDS) {
    for (const fontDef of brandDef.fonts) {
      for (const weight of fontDef.weights) {
        jobs.push({
          brand: brandDef.brand,
          fontName: fontDef.fontName,
          weight,
          cdnUrl: fontDef.cdnUrls[weight],
          condensed: fontDef.condensed ?? false,
        });
      }
    }
  }

  console.log(`  ${jobs.length} specimen(s) across ${BRANDS.length} brand(s)\n`);

  // Ensure all output directories exist
  const dirs = new Set(jobs.map((j) => join(OUTPUT_DIR, j.brand)));
  await Promise.all([...dirs].map((d) => mkdir(d, { recursive: true })));

  const browser = await chromium.launch({ headless: true });

  try {
    // Process specimens sequentially to avoid memory pressure from many pages
    let successCount = 0;
    let failCount = 0;

    for (const job of jobs) {
      const { brand, fontName, weight, cdnUrl, condensed } = job;
      const fileName = `${fontName}-${weight}.png`;
      const localPath = join(OUTPUT_DIR, brand, fileName);
      const r2Path = `${R2_PREFIX}/${brand}/${fileName}`;

      try {
        const page = await browser.newPage({
          viewport: { width: SPECIMEN_WIDTH, height: SPECIMEN_HEIGHT },
        });

        const html = buildSpecimenHtml(fontName, weight, cdnUrl, condensed);
        await page.setContent(html, { waitUntil: "networkidle" });

        // Wait for the specimen rendering signal (font load + layout)
        await page.waitForFunction(() => window.__SPECIMEN_READY__ === true, {
          timeout: 15_000,
        });

        // Small extra delay for font rasterization to settle
        await page.waitForTimeout(200);

        const screenshot = await page.screenshot({
          type: "png",
          clip: { x: 0, y: 0, width: SPECIMEN_WIDTH, height: SPECIMEN_HEIGHT },
        });

        await writeFile(localPath, screenshot);
        await page.close();

        manifest.specimens.push({
          localPath: `tmp/font-specimens/${brand}/${fileName}`,
          r2Path,
          r2Url: `${R2_BUCKET}/${r2Path}`,
          fontName,
          weight,
          brand,
        });

        successCount += 1;
        console.log(`  [ok] ${brand}/${fileName}`);
      } catch (err) {
        failCount += 1;
        console.error(`  [FAIL] ${brand}/${fileName}: ${err.message}`);
      }
    }

    // Write manifest
    const manifestPath = join(OUTPUT_DIR, "manifest.json");
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    console.log(`\nDone. ${successCount} succeeded, ${failCount} failed.`);
    console.log(`Manifest: ${manifestPath}`);
    console.log(`\nTo upload to R2, run:`);
    console.log(`  python scripts/upload-fonts-to-s3.py --manifest tmp/font-specimens/manifest.json`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("[generate-font-reference-specimens]", err);
  process.exitCode = 1;
});
