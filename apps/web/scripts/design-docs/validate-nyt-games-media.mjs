import { readFile } from "node:fs/promises";
import path from "node:path";

import { parseArgs } from "./_cli.mjs";

const APP_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const DEFAULT_ARTIFACT_PATH = path.join(
  APP_ROOT,
  "src/components/admin/design-docs/sections/games/generated/nyt-games-source-inventory.json",
);
const DEFAULT_PUBLIC_BASE_URL = "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev";
const DEFAULT_R2_PREFIX = "images/design-docs/nyt-games";

const COMPONENT_FILES = [
  "src/components/admin/design-docs/sections/games/HubComponents.tsx",
  "src/components/admin/design-docs/sections/games/BrandNYTGamesResources.tsx",
  "src/components/admin/design-docs/sections/games/NYTGamesPreviewShell.tsx",
].map((relativePath) => path.join(APP_ROOT, relativePath));

async function head(url) {
  const response = await fetch(url, { method: "HEAD" });
  return response.status;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const artifactPath = path.resolve(String(args.artifact || DEFAULT_ARTIFACT_PATH));
  const publicBaseUrl = String(
    args["public-base-url"] ||
      process.env.OBJECT_STORAGE_PUBLIC_BASE_URL ||
      DEFAULT_PUBLIC_BASE_URL,
  ).replace(/\/+$/, "");
  const r2Prefix = String(args.prefix || DEFAULT_R2_PREFIX).replace(/^\/+|\/+$/g, "");

  const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
  const assets = Array.isArray(artifact?.data?.assets) ? artifact.data.assets : [];
  const sourceComponents = Array.isArray(artifact?.data?.sourceComponents)
    ? artifact.data.sourceComponents
    : [];
  if (assets.length === 0) {
    throw new Error(`No assets found in ${artifactPath}`);
  }
  if (sourceComponents.length === 0) {
    throw new Error(`No sourceComponents found in ${artifactPath}`);
  }

  const seenFiles = new Set();
  const errors = [];
  for (const asset of assets) {
    if (!asset?.label || !asset?.kind || !asset?.file || !asset?.source || !asset?.display) {
      errors.push(`Asset is missing one or more required fields: ${JSON.stringify(asset)}`);
      continue;
    }

    if (seenFiles.has(asset.file)) {
      errors.push(`Duplicate file key detected: ${asset.file}`);
    }
    seenFiles.add(asset.file);

    if (!asset.display.slot || !asset.display.desktop?.width || !asset.display.desktop?.height) {
      errors.push(`Asset display metadata is incomplete for ${asset.file}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  const r2Failures = [];
  for (const asset of assets) {
    const url = `${publicBaseUrl}/${path.posix.join(r2Prefix, asset.file)}`;
    const status = await head(url);
    if (status !== 200) {
      r2Failures.push(`${asset.file} -> ${url} returned ${status}`);
    }
  }

  if (r2Failures.length > 0) {
    throw new Error(`R2 asset validation failed:\n${r2Failures.join("\n")}`);
  }

  const forbiddenPatterns = [
    "nytimes.com/games-assets",
    "static.thenounproject.com",
    "/design-docs/nyt-games/",
  ];
  const sourceFailures = [];
  for (const filePath of COMPONENT_FILES) {
    const contents = await readFile(filePath, "utf8");
    for (const pattern of forbiddenPatterns) {
      if (contents.includes(pattern)) {
        sourceFailures.push(`${filePath} still contains forbidden asset reference: ${pattern}`);
      }
    }
  }

  if (sourceFailures.length > 0) {
    throw new Error(sourceFailures.join("\n"));
  }

  process.stdout.write(
    `Validated ${assets.length} NYT Games mirrored assets, ${sourceComponents.length} source components, and component references.\n`,
  );
}

main().catch((error) => {
  console.error(`[nyt-games-media:validate] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
