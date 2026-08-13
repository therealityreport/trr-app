import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

import { JSDOM } from "jsdom";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_PATH = path.join(APP_ROOT, "data", "nyt-homepage-2026-04-21", "index.html.gz");
const OUTPUT_ROOT = path.join(APP_ROOT, "data", "nyt-homepage-2026-04-21", "generated-preview");
const CHECK_ONLY = process.argv.includes("--check");
const GENERATOR_VERSION = "1.0.0";

const LEAF_IDS = [
  "edition-rail",
  "masthead",
  "nested-nav",
  "lead-programming",
  "watch-todays-videos",
  "more-news",
  "site-index",
  "footer",
  "betamax-player",
  "tip-strip",
  "poetry-promo",
  "weather-strip",
  "opinion-label",
  "well-package",
  "culture-lifestyle-package",
  "athletic-package",
  "audio-package",
  "cooking-package",
  "wirecutter-package",
  "games-package",
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function requireElement(value, message) {
  if (!value) throw new Error(message);
  return value;
}

function findExactTextElement(document, label) {
  for (const selector of ["h2 span", "p span", "p", "a", "div"]) {
    const match = [...document.querySelectorAll(selector)].find(
      (node) => node.textContent?.trim() === label,
    );
    if (match) return match;
  }
  return null;
}

function climbByClassToken(element, token) {
  let current = element;
  while (current) {
    if (current.classList.contains(token)) return current;
    current = current.parentElement;
  }
  return null;
}

function removeScripts(root) {
  root.querySelectorAll("script").forEach((node) => node.remove());
  root.querySelectorAll("template").forEach((template) => removeScripts(template.content));
}

function sanitizeElement(element) {
  const clone = element.cloneNode(true);
  removeScripts(clone);
  return clone.outerHTML.trim();
}

function first(document, selector) {
  return sanitizeElement(
    requireElement(document.querySelector(selector), `Could not find homepage selector "${selector}"`),
  );
}

function interactive(document, id) {
  return sanitizeElement(
    requireElement(document.getElementById(id), `Could not find interactive "${id}"`),
  );
}

function closestFromText(document, label, classToken) {
  const element = requireElement(findExactTextElement(document, label), `Could not find homepage text "${label}"`);
  return sanitizeElement(
    requireElement(
      climbByClassToken(element, classToken),
      `Could not resolve ancestor "${classToken}" for "${label}"`,
    ),
  );
}

function closestFromSelectorOrText(document, selector, label, classToken) {
  for (const element of [document.querySelector(selector), findExactTextElement(document, label)]) {
    const container = climbByClassToken(element, classToken);
    if (container) return sanitizeElement(container);
  }
  throw new Error(
    `Could not resolve ancestor "${classToken}" for selector "${selector}" or homepage text "${label}"`,
  );
}

function programmingNode(document, index, hierarchy) {
  const nodes = [...document.querySelectorAll(`[data-testid="programming-node"][data-hierarchy="${hierarchy}"]`)];
  return sanitizeElement(
    requireElement(nodes[index], `Could not find programming node index ${index} for hierarchy "${hierarchy}"`),
  );
}

function resolveLeaf(document, id) {
  switch (id) {
    case "edition-rail": return first(document, "[data-testid='masthead-edition-menu']");
    case "masthead": return first(document, "[data-testid='masthead-container']");
    case "nested-nav": return first(document, "[data-testid='floating-desktop-nested-nav']");
    case "lead-programming": return programmingNode(document, 1, "zone");
    case "watch-todays-videos": return closestFromText(document, "Watch Today’s Videos", "css-1w1paqe");
    case "more-news": return closestFromText(document, "More News", "css-1w1paqe");
    case "site-index": return first(document, "[data-testid='site-index']");
    case "footer": return first(document, "[data-testid='footer']");
    case "betamax-player": return closestFromText(document, "Watch Today’s Videos", "css-1w1paqe");
    case "tip-strip": return interactive(document, "2025-hp-tip-strip");
    case "poetry-promo": return interactive(document, "poetry-week-hp-promo-day-2");
    case "weather-strip": return interactive(document, "weather-hp-strip");
    case "opinion-label": return interactive(document, "large-opinion-label");
    case "well-package": return closestFromSelectorOrText(document, '[data-pers*="home-packages-well"]', "Well", "css-17jkqqy");
    case "culture-lifestyle-package": return closestFromSelectorOrText(document, '[data-pers*="home-packages-culturelifestyle-primary"]', "Culture and Lifestyle", "css-1w1paqe");
    case "athletic-package": return closestFromSelectorOrText(document, '[data-pers*="home-packages-athletic-primary"]', "The Athletic", "css-17jkqqy");
    case "audio-package": return closestFromSelectorOrText(document, '[data-pers*="home-packages-audio"]', "Audio", "css-1w1paqe");
    case "cooking-package": return closestFromSelectorOrText(document, '[data-pers*="home-packages-cooking-addon"]', "Cooking", "css-1w1paqe");
    case "wirecutter-package": return closestFromText(document, "Product recommendations", "isPersonalizedPackage");
    case "games-package": return closestFromText(document, "Daily puzzles", "css-17jkqqy");
    default: throw new Error(`Unknown homepage fragment "${id}"`);
  }
}

function artifactRecord(relativePath, markup) {
  if (/<script\b/i.test(markup)) {
    throw new Error(`Generated preview artifact still contains a script element: ${relativePath}`);
  }
  const uncompressed = Buffer.from(markup, "utf8");
  const compressed = gzipSync(uncompressed, { level: 9 });
  return {
    relativePath,
    compressed,
    manifest: {
      path: relativePath,
      compressedBytes: compressed.byteLength,
      compressedSha256: sha256(compressed),
      uncompressedBytes: uncompressed.byteLength,
      uncompressedSha256: sha256(uncompressed),
    },
  };
}

async function main() {
  const compressedSource = await readFile(SOURCE_PATH);
  const html = gunzipSync(compressedSource).toString("utf8");
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const pageBody = document.body.cloneNode(true);
  removeScripts(pageBody);

  const artifacts = {
    page: artifactRecord("page.html.gz", pageBody.innerHTML.trim()),
    ...Object.fromEntries(
      LEAF_IDS.map((id) => [id, artifactRecord(`fragments/${id}.html.gz`, resolveLeaf(document, id))]),
    ),
  };
  const manifest = {
    schemaVersion: 1,
    generatorVersion: GENERATOR_VERSION,
    source: {
      path: "data/nyt-homepage-2026-04-21/index.html.gz",
      compressedBytes: compressedSource.byteLength,
      compressedSha256: sha256(compressedSource),
      uncompressedBytes: Buffer.byteLength(html),
      uncompressedSha256: sha256(Buffer.from(html)),
    },
    maximumUncompressedArtifactBytes: Math.max(
      ...Object.values(artifacts).map(({ manifest: entry }) => entry.uncompressedBytes),
    ),
    artifacts: Object.fromEntries(
      Object.entries(artifacts).map(([id, { manifest: entry }]) => [id, entry]),
    ),
  };
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;

  if (CHECK_ONLY) {
    for (const { relativePath, compressed } of Object.values(artifacts)) {
      const existing = await readFile(path.join(OUTPUT_ROOT, relativePath));
      if (!existing.equals(compressed)) throw new Error(`Generated artifact is stale: ${relativePath}`);
    }
    const existingManifest = await readFile(path.join(OUTPUT_ROOT, "manifest.json"), "utf8");
    if (existingManifest !== manifestText) throw new Error("Generated preview manifest is stale");
    console.log("NYT homepage preview fragments are up to date.");
    return;
  }

  await mkdir(path.join(OUTPUT_ROOT, "fragments"), { recursive: true });
  for (const { relativePath, compressed } of Object.values(artifacts)) {
    await writeFile(path.join(OUTPUT_ROOT, relativePath), compressed);
  }
  await writeFile(path.join(OUTPUT_ROOT, "manifest.json"), manifestText, "utf8");
  console.log(`Generated ${Object.keys(artifacts).length} deterministic preview artifacts.`);
}

await main();
