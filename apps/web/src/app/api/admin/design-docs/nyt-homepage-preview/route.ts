import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { NYT_HOMEPAGE_SOURCE_BUNDLE } from "@/lib/admin/nyt-homepage-source-bundle";
import {
  decodeGeneratedArtifact,
  type GeneratedPreviewManifest,
  MAX_UNCOMPRESSED_ARTIFACT_BYTES,
  resolveFragmentArtifactIds,
} from "@/lib/admin/nyt-homepage-preview-runtime";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WORKSPACE_ROOT = path.resolve(process.cwd(), "../../..");
const APP_ROOT = process.cwd();
const GENERATED_PREVIEW_ROOT = path.resolve(
  APP_ROOT,
  "data/nyt-homepage-2026-04-21/generated-preview",
);
const GENERATED_MANIFEST_PATH = path.join(GENERATED_PREVIEW_ROOT, "manifest.json");
const LOCAL_ASSET_VIEW = "saved-asset";
const PREVIEW_CACHE_CONTROL = "private, max-age=60";
const PREVIEW_GENERATOR_VERSION = "1.0.0";

function resolveFilePath(filePath: string) {
  if (path.isAbsolute(filePath)) return filePath;
  if (filePath.endsWith(".html.gz")) return path.resolve(APP_ROOT, filePath);
  return path.resolve(WORKSPACE_ROOT, filePath);
}

async function readSourceBinary(filePath: string) {
  return readFile(resolveFilePath(filePath));
}

async function loadGeneratedManifest(): Promise<GeneratedPreviewManifest> {
  const parsed: unknown = JSON.parse(await readFile(GENERATED_MANIFEST_PATH, "utf8"));
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Object.hasOwn(parsed, "artifacts") ||
    typeof (parsed as GeneratedPreviewManifest).artifacts !== "object" ||
    (parsed as GeneratedPreviewManifest).schemaVersion !== 1 ||
    (parsed as GeneratedPreviewManifest).generatorVersion !== PREVIEW_GENERATOR_VERSION ||
    !Number.isSafeInteger((parsed as GeneratedPreviewManifest).maximumUncompressedArtifactBytes) ||
    (parsed as GeneratedPreviewManifest).maximumUncompressedArtifactBytes < 1 ||
    (parsed as GeneratedPreviewManifest).maximumUncompressedArtifactBytes >
      MAX_UNCOMPRESSED_ARTIFACT_BYTES
  ) {
    throw new Error("Invalid generated NYT preview manifest");
  }
  return parsed as GeneratedPreviewManifest;
}

async function readGeneratedArtifact(logicalId: string) {
  const manifest = await loadGeneratedManifest();
  const artifact = manifest.artifacts[logicalId];
  if (!artifact) throw new Error(`Unknown homepage fragment "${logicalId}"`);
  const artifactPath = path.resolve(GENERATED_PREVIEW_ROOT, artifact.path);
  if (!artifactPath.startsWith(`${GENERATED_PREVIEW_ROOT}${path.sep}`)) {
    throw new Error(`Invalid generated NYT preview artifact "${logicalId}"`);
  }
  return decodeGeneratedArtifact(logicalId, manifest, artifact, await readFile(artifactPath));
}

async function previewStylesheetHrefs(request: NextRequest) {
  const localStyles = NYT_HOMEPAGE_SOURCE_BUNDLE.css.map((_, index) => {
    const url = new URL(request.url);
    url.search = "";
    url.searchParams.set("view", "asset");
    url.searchParams.set("type", "css");
    url.searchParams.set("index", String(index));
    return url.toString();
  });

  return [...NYT_HOMEPAGE_SOURCE_BUNDLE.remoteStylesheets, ...localStyles];
}

async function buildPreviewDocument({
  request,
  title,
  bodyMarkup,
  pageMode = false,
}: {
  request: NextRequest;
  title: string;
  bodyMarkup: string;
  pageMode?: boolean;
}) {
  const stylesheets = (await previewStylesheetHrefs(request))
    .map((href) => `<link rel="stylesheet" href="${href}" crossorigin="anonymous">`)
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <base href="${NYT_HOMEPAGE_SOURCE_BUNDLE.canonicalSourceUrl}">
    ${stylesheets}
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: #fff;
      }

      body {
        color: #121212;
        min-width: 320px;
      }

      .preview-shell {
        ${pageMode ? "" : "padding: 0;"}
      }

      .preview-stack {
        display: grid;
        gap: 18px;
      }

      img, svg, video, picture {
        max-width: 100%;
      }

      iframe {
        max-width: 100%;
      }

      .preview-shell [data-testid="StandardAd"] iframe,
      .preview-shell .ad iframe {
        min-width: 100% !important;
      }
    </style>
  </head>
  <body>
    <div class="preview-shell">${bodyMarkup}</div>
  </body>
</html>`;
}

async function renderFullPageDocument(request: NextRequest) {
  return buildPreviewDocument({
    request,
    title: "The New York Times Homepage Snapshot",
    bodyMarkup: await readGeneratedArtifact("page"),
    pageMode: true,
  });
}

async function renderFragmentDocument(request: NextRequest, id: string) {
  const fragmentIds = resolveFragmentArtifactIds(id);
  const fragments = await Promise.all(fragmentIds.map((fragmentId) => readGeneratedArtifact(fragmentId)));
  const bodyMarkup = fragmentIds.length > 1
    ? `<div class="preview-stack">${fragments.join("")}</div>`
    : fragments[0];
  return buildPreviewDocument({
    request,
    title: `NYT Homepage Preview: ${id}`,
    bodyMarkup,
  });
}


function adminErrorStatus(error: unknown) {
  const message = error instanceof Error ? error.message : "failed";
  if (message === "unauthorized") return 401;
  if (message === "forbidden") return 403;
  return 500;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const view = request.nextUrl.searchParams.get("view") ?? "fragment";

    if (view === "screenshot") {
      const relativePath = NYT_HOMEPAGE_SOURCE_BUNDLE.screenshots.desktop[0];
      const image = await readSourceBinary(relativePath);
      return new NextResponse(image, {
        status: 200,
        headers: {
          "content-type": "image/jpeg",
          "cache-control": "private, max-age=300",
        },
      });
    }

    if (view === "asset") {
      const type = request.nextUrl.searchParams.get("type");
      const rawIndex = request.nextUrl.searchParams.get("index");
      const index = rawIndex ? Number.parseInt(rawIndex, 10) : NaN;
      const sourceList =
        type === "css"
          ? NYT_HOMEPAGE_SOURCE_BUNDLE.css
          : type === "js"
            ? NYT_HOMEPAGE_SOURCE_BUNDLE.js
            : null;

      if (!sourceList || !Number.isFinite(index) || index < 0 || index >= sourceList.length) {
        return NextResponse.json({ error: "Invalid asset request" }, { status: 400 });
      }

      const asset = await readSourceBinary(sourceList[index]);
      return new NextResponse(asset, {
        status: 200,
        headers: {
          "content-type": type === "css" ? "text/css; charset=utf-8" : "application/javascript; charset=utf-8",
          "cache-control": "private, max-age=300",
        },
      });
    }

    if (view === LOCAL_ASSET_VIEW) {
      return NextResponse.json({ error: "Local saved-page assets are unavailable" }, { status: 404 });
    }

    if (view === "page") {
      const html = await renderFullPageDocument(request);
      return new NextResponse(html, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": PREVIEW_CACHE_CONTROL,
        },
      });
    }

    const id = request.nextUrl.searchParams.get("id")?.trim();
    if (!id) {
      return NextResponse.json({ error: "id is required for fragment previews" }, { status: 400 });
    }

    const html = await renderFragmentDocument(request, id);
    return new NextResponse(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": PREVIEW_CACHE_CONTROL,
      },
    });
  } catch (error) {
    console.error("[api] Failed to render NYT homepage preview", error);
    const message = error instanceof Error ? error.message : "failed";
    return NextResponse.json({ error: message }, { status: adminErrorStatus(error) });
  }
}
