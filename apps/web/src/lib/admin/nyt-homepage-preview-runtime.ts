import { createHash } from "node:crypto";
import path from "node:path";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";

export const MAX_UNCOMPRESSED_ARTIFACT_BYTES = 4 * 1024 * 1024;

export type PreviewArtifact = {
  path: string;
  uncompressedBytes: number;
  compressedBytes: number;
  compressedSha256: string;
  uncompressedSha256: string;
};

export type GeneratedPreviewManifest = {
  schemaVersion: number;
  generatorVersion: string;
  maximumUncompressedArtifactBytes: number;
  source: {
    path: string;
    compressedBytes: number;
    compressedSha256: string;
    uncompressedBytes: number;
    uncompressedSha256: string;
  };
  artifacts: Record<string, PreviewArtifact>;
};

const GENERATED_FRAGMENT_IDS = new Set([
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
]);

const COMBINED_FRAGMENT_IDS: Record<string, string[]> = {
  "inline-interactives": ["tip-strip", "poetry-promo", "weather-strip", "opinion-label"],
  "product-rails": [
    "well-package",
    "culture-lifestyle-package",
    "athletic-package",
    "audio-package",
    "cooking-package",
    "wirecutter-package",
    "games-package",
  ],
};

const gunzipAsync = promisify(gunzip);

function sha256(value: Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function isStaticArtifactPath(value: string) {
  return (
    value === "page.html.gz" ||
    (/^fragments\/[a-z0-9-]+\.html\.gz$/.test(value) && path.posix.normalize(value) === value)
  );
}

export async function decodeGeneratedArtifact(
  logicalId: string,
  manifest: GeneratedPreviewManifest,
  artifact: PreviewArtifact | undefined,
  compressed: Buffer,
) {
  if (!artifact) throw new Error(`Unknown homepage fragment "${logicalId}"`);
  if (
    !isStaticArtifactPath(artifact.path) ||
    !Number.isSafeInteger(artifact.compressedBytes) ||
    !Number.isSafeInteger(artifact.uncompressedBytes) ||
    artifact.compressedBytes < 1 ||
    artifact.uncompressedBytes < 1 ||
    artifact.uncompressedBytes > MAX_UNCOMPRESSED_ARTIFACT_BYTES ||
    artifact.uncompressedBytes > manifest.maximumUncompressedArtifactBytes ||
    !/^[a-f0-9]{64}$/.test(artifact.compressedSha256) ||
    !/^[a-f0-9]{64}$/.test(artifact.uncompressedSha256)
  ) {
    throw new Error(`Invalid generated NYT preview artifact "${logicalId}"`);
  }
  if (
    compressed.byteLength !== artifact.compressedBytes ||
    sha256(compressed) !== artifact.compressedSha256
  ) {
    throw new Error(`Generated NYT preview artifact integrity check failed for "${logicalId}"`);
  }
  const uncompressed = await gunzipAsync(compressed, {
    maxOutputLength: MAX_UNCOMPRESSED_ARTIFACT_BYTES,
  });
  if (
    uncompressed.byteLength !== artifact.uncompressedBytes ||
    sha256(uncompressed) !== artifact.uncompressedSha256
  ) {
    throw new Error(`Generated NYT preview artifact size check failed for "${logicalId}"`);
  }
  return uncompressed.toString("utf8");
}

export function resolveFragmentArtifactIds(id: string) {
  if (!GENERATED_FRAGMENT_IDS.has(id) && !(id in COMBINED_FRAGMENT_IDS)) {
    throw new Error(`Unknown homepage fragment "${id}"`);
  }
  return COMBINED_FRAGMENT_IDS[id] ?? [id];
}
