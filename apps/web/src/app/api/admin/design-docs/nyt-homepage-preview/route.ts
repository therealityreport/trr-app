import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { JSDOM } from "jsdom";
import { NextRequest, NextResponse } from "next/server";

import { NYT_HOMEPAGE_SOURCE_BUNDLE } from "@/lib/admin/nyt-homepage-source-bundle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WORKSPACE_ROOT = path.resolve(process.cwd(), "../../..");
const LOCAL_ASSET_VIEW = "saved-asset";
const REWRITABLE_ATTRIBUTES = ["src", "href", "poster"] as const;
const REWRITABLE_STYLE_ATTRIBUTES = ["style"] as const;
const URL_PROTOCOL_PATTERN = /^(?:[a-z]+:)?\/\//i;
const SKIP_ASSET_PATTERN = /^(?:#|data:|blob:|mailto:|javascript:|tel:)/i;
const CSS_URL_PATTERN = /url\((['"]?)([^'")]+)\1\)/g;

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".htm": "text/html; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".otf": "font/otf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};
const HOMEPAGE_HTML_CACHE = new Map<string, string>();
const HOMEPAGE_STYLESHEET_CACHE = new Map<string, string[]>();

type HomepageSourceMode = "saved-page" | "workspace-bundle";

interface HomepageSource {
  mode: HomepageSourceMode;
  htmlPath: string;
  assetDirectory: string | null;
}

function resolveFilePath(filePath: string) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(WORKSPACE_ROOT, filePath);
}

async function canReadFile(filePath: string) {
  try {
    await access(resolveFilePath(filePath));
    return true;
  } catch {
    return false;
  }
}

async function getHomepageSource(): Promise<HomepageSource> {
  const savedPageHtml = NYT_HOMEPAGE_SOURCE_BUNDLE.savedPage.html;
  if (await canReadFile(savedPageHtml)) {
    return {
      mode: "saved-page",
      htmlPath: savedPageHtml,
      assetDirectory: NYT_HOMEPAGE_SOURCE_BUNDLE.savedPage.assetDirectory,
    };
  }

  return {
    mode: "workspace-bundle",
    htmlPath: NYT_HOMEPAGE_SOURCE_BUNDLE.html.rendered,
    assetDirectory: null,
  };
}

async function readSourceText(filePath: string) {
  return readFile(resolveFilePath(filePath), "utf8");
}

async function readSourceBinary(filePath: string) {
  return readFile(resolveFilePath(filePath));
}

async function loadHomepageHtmlSource() {
  const source = await getHomepageSource();
  const cacheKey = source.htmlPath;
  let html = HOMEPAGE_HTML_CACHE.get(cacheKey);
  if (!html) {
    html = await readSourceText(source.htmlPath);
    HOMEPAGE_HTML_CACHE.set(cacheKey, html);
  }
  return { source, html };
}

async function loadHomepageDocument() {
  const { source, html } = await loadHomepageHtmlSource();
  return {
    source,
    document: new JSDOM(html).window.document,
  };
}

function stripScriptsFromMarkup(markup: string) {
  const dom = new JSDOM(`<!doctype html><body>${markup}</body>`);
  dom.window.document.querySelectorAll("script").forEach((node) => node.remove());
  return dom.window.document.body.innerHTML.trim();
}

function findExactTextElement(document: Document, label: string) {
  const selectors = ["h2 span", "p span", "p", "a", "div"];
  for (const selector of selectors) {
    const match = [...document.querySelectorAll(selector)].find(
      (node) => node.textContent?.trim() === label,
    );
    if (match) {
      return match;
    }
  }
  return null;
}

function climbByClassToken(element: Element | null, token: string) {
  let current: Element | null = element;
  while (current) {
    if (current.classList.contains(token)) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function requireElement<T>(value: T | null | undefined, message: string): T {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function buildLocalAssetUrl(request: NextRequest, relativeAssetPath: string) {
  const url = new URL(request.url);
  url.search = "";
  url.searchParams.set("view", LOCAL_ASSET_VIEW);
  url.searchParams.set("path", relativeAssetPath);
  return url.toString();
}

function toCanonicalUrl(value: string) {
  return new URL(value, NYT_HOMEPAGE_SOURCE_BUNDLE.canonicalSourceUrl).toString();
}

function normalizeSavedPageAssetPath(value: string) {
  const trimmed = value.trim();
  return trimmed
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .replace(/^The New York Times - Breaking News, US News, World News and Videos_files\//, "");
}

function rewriteAssetReference({
  request,
  source,
  value,
  cssContext = false,
}: {
  request: NextRequest;
  source: HomepageSource;
  value: string;
  cssContext?: boolean;
}) {
  const trimmed = value.trim();
  if (!trimmed || SKIP_ASSET_PATTERN.test(trimmed) || URL_PROTOCOL_PATTERN.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return cssContext ? toCanonicalUrl(trimmed) : trimmed;
  }

  if (source.mode !== "saved-page" || !source.assetDirectory) {
    return trimmed;
  }

  return buildLocalAssetUrl(request, normalizeSavedPageAssetPath(trimmed));
}

function rewriteCssAssetUrls({
  css,
  request,
  source,
}: {
  css: string;
  request: NextRequest;
  source: HomepageSource;
}) {
  return css.replace(CSS_URL_PATTERN, (match, quote = "", rawUrl = "") => {
    const rewritten = rewriteAssetReference({
      request,
      source,
      value: String(rawUrl),
      cssContext: true,
    });
    return `url(${quote}${rewritten}${quote})`;
  });
}

function rewriteSrcSet({
  srcSet,
  request,
  source,
}: {
  srcSet: string;
  request: NextRequest;
  source: HomepageSource;
}) {
  return srcSet
    .split(",")
    .map((entry) => {
      const [rawUrl, ...descriptorParts] = entry.trim().split(/\s+/);
      if (!rawUrl) return "";
      const rewrittenUrl = rewriteAssetReference({
        request,
        source,
        value: rawUrl,
      });
      return [rewrittenUrl, ...descriptorParts].join(" ").trim();
    })
    .filter(Boolean)
    .join(", ");
}

function rewriteTemplateTree({
  root,
  request,
  source,
}: {
  root: ParentNode;
  request: NextRequest;
  source: HomepageSource;
}) {
  root.querySelectorAll("style").forEach((styleNode) => {
    styleNode.textContent = rewriteCssAssetUrls({
      css: styleNode.textContent ?? "",
      request,
      source,
    });
  });

  root.querySelectorAll("*").forEach((element) => {
    REWRITABLE_ATTRIBUTES.forEach((attribute) => {
      const value = element.getAttribute(attribute);
      if (!value) return;
      element.setAttribute(
        attribute,
        rewriteAssetReference({
          request,
          source,
          value,
        }),
      );
    });

    const srcSet = element.getAttribute("srcset");
    if (srcSet) {
      element.setAttribute(
        "srcset",
        rewriteSrcSet({
          srcSet,
          request,
          source,
        }),
      );
    }

    REWRITABLE_STYLE_ATTRIBUTES.forEach((attribute) => {
      const value = element.getAttribute(attribute);
      if (!value) return;
      element.setAttribute(
        attribute,
        rewriteCssAssetUrls({
          css: value,
          request,
          source,
        }),
      );
    });

    if (element.tagName === "TEMPLATE") {
      rewriteTemplateTree({
        root: (element as HTMLTemplateElement).content,
        request,
        source,
      });
    }
  });
}

function rewriteFragmentMarkup({
  markup,
  request,
  source,
}: {
  markup: string;
  request: NextRequest;
  source: HomepageSource;
}) {
  const dom = new JSDOM(`<!doctype html><body>${markup}</body>`);
  rewriteTemplateTree({
    root: dom.window.document.body,
    request,
    source,
  });
  return dom.window.document.body.innerHTML.trim();
}

async function extractInteractiveById(id: string) {
  const { document } = await loadHomepageDocument();
  const element = requireElement(document.getElementById(id), `Could not find interactive "${id}"`);
  return stripScriptsFromMarkup(element.outerHTML);
}

async function extractFirstBySelector(selector: string) {
  const { document } = await loadHomepageDocument();
  const element = requireElement(
    document.querySelector(selector),
    `Could not find homepage selector "${selector}"`,
  );
  return stripScriptsFromMarkup(element.outerHTML);
}

async function extractClosestFromSelector(selector: string, classToken: string) {
  const { document } = await loadHomepageDocument();
  const element = requireElement(
    document.querySelector(selector),
    `Could not find homepage selector "${selector}"`,
  );
  const container = requireElement(
    climbByClassToken(element, classToken),
    `Could not resolve ancestor "${classToken}" for selector "${selector}"`,
  );
  return stripScriptsFromMarkup(container.outerHTML);
}

async function extractClosestFromText(label: string, classToken: string) {
  const { document } = await loadHomepageDocument();
  const element = requireElement(
    findExactTextElement(document, label),
    `Could not find homepage text "${label}"`,
  );
  const container = requireElement(
    climbByClassToken(element, classToken),
    `Could not resolve ancestor "${classToken}" for "${label}"`,
  );
  return stripScriptsFromMarkup(container.outerHTML);
}

async function extractProgrammingNodeByIndex(index: number, hierarchy: "zone" | "container" | "feed") {
  const { document } = await loadHomepageDocument();
  const nodes = [...document.querySelectorAll(`[data-testid="programming-node"][data-hierarchy="${hierarchy}"]`)];
  const element = requireElement(
    nodes[index],
    `Could not find programming node index ${index} for hierarchy "${hierarchy}"`,
  );
  return stripScriptsFromMarkup(element.outerHTML);
}

async function extractCombinedFragments(fragmentIds: string[]) {
  const fragments = await Promise.all(fragmentIds.map((id) => resolveFragmentMarkup(id)));
  return `<div class="preview-stack">${fragments.join("")}</div>`;
}

async function resolveFragmentMarkup(id: string): Promise<string> {
  switch (id) {
    case "edition-rail":
      return extractFirstBySelector("[data-testid='masthead-edition-menu']");
    case "masthead":
      return extractFirstBySelector("[data-testid='masthead-container']");
    case "nested-nav":
      return extractFirstBySelector("[data-testid='floating-desktop-nested-nav']");
    case "lead-programming":
      return extractProgrammingNodeByIndex(1, "zone");
    case "inline-interactives":
      return extractCombinedFragments(["tip-strip", "poetry-promo", "weather-strip", "opinion-label"]);
    case "watch-todays-videos":
      return extractClosestFromText("Watch Today’s Videos", "css-1w1paqe");
    case "more-news":
      return extractClosestFromText("More News", "css-1w1paqe");
    case "product-rails":
      return extractCombinedFragments([
        "well-package",
        "culture-lifestyle-package",
        "athletic-package",
        "audio-package",
        "cooking-package",
        "wirecutter-package",
        "games-package",
      ]);
    case "site-index":
      return extractFirstBySelector("[data-testid='site-index']");
    case "footer":
      return extractFirstBySelector("[data-testid='footer']");
    case "betamax-player":
      return extractClosestFromText("Watch Today’s Videos", "css-1w1paqe");
    case "tip-strip":
      return extractInteractiveById("2025-hp-tip-strip");
    case "poetry-promo":
      return extractInteractiveById("poetry-week-hp-promo-day-2");
    case "weather-strip":
      return extractInteractiveById("weather-hp-strip");
    case "opinion-label":
      return extractInteractiveById("large-opinion-label");
    case "well-package":
      return extractClosestFromSelector('[data-pers*="home-packages-well"]', "css-17jkqqy");
    case "culture-lifestyle-package":
      return extractClosestFromSelector('[data-pers*="home-packages-culturelifestyle-primary"]', "css-1w1paqe");
    case "athletic-package":
      return extractClosestFromSelector('[data-pers*="home-packages-athletic-primary"]', "css-17jkqqy");
    case "audio-package":
      return extractClosestFromSelector('[data-pers*="home-packages-audio"]', "css-1w1paqe");
    case "cooking-package":
      return extractClosestFromSelector('[data-pers*="home-packages-cooking-addon"]', "css-1w1paqe");
    case "wirecutter-package":
      return extractClosestFromSelector('[data-pers*="home-packages-wirecutter"]', "css-1w1paqe");
    case "games-package":
      return extractClosestFromText("Daily puzzles", "css-17jkqqy");
    default:
      throw new Error(`Unknown homepage fragment "${id}"`);
  }
}

async function previewStylesheetHrefs(request: NextRequest, source: HomepageSource) {
  if (source.mode === "saved-page") {
    const cacheKey = source.htmlPath;
    let stylesheetRefs = HOMEPAGE_STYLESHEET_CACHE.get(cacheKey);
    if (!stylesheetRefs) {
      const { html } = await loadHomepageHtmlSource();
      stylesheetRefs = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi)]
        .map((match) => match[1])
        .filter(Boolean);
      HOMEPAGE_STYLESHEET_CACHE.set(cacheKey, stylesheetRefs);
    }

    const stylesheets = stylesheetRefs.map((href) =>
      rewriteAssetReference({
        request,
        source,
        value: href,
        cssContext: true,
      }),
    );
    if (stylesheets.length > 0) {
      return stylesheets;
    }
  }

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
  source,
  title,
  bodyMarkup,
  pageMode = false,
}: {
  request: NextRequest;
  source: HomepageSource;
  title: string;
  bodyMarkup: string;
  pageMode?: boolean;
}) {
  const stylesheets = (await previewStylesheetHrefs(request, source))
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
  const { source, document } = await loadHomepageDocument();
  document.querySelectorAll("script").forEach((node) => node.remove());
  const bodyMarkup = rewriteFragmentMarkup({
    markup: document.body.innerHTML,
    request,
    source,
  });
  return buildPreviewDocument({
    request,
    source,
    title: "The New York Times Homepage Snapshot",
    bodyMarkup,
    pageMode: true,
  });
}

async function renderFragmentDocument(request: NextRequest, id: string) {
  const source = await getHomepageSource();
  const fragmentMarkup = rewriteFragmentMarkup({
    markup: await resolveFragmentMarkup(id),
    request,
    source,
  });
  return buildPreviewDocument({
    request,
    source,
    title: `NYT Homepage Preview: ${id}`,
    bodyMarkup: fragmentMarkup,
  });
}

export async function GET(request: NextRequest) {
  try {
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

      const assetPath = sourceList[index];
      const asset = await readSourceBinary(assetPath);
      return new NextResponse(asset, {
        status: 200,
        headers: {
          "content-type": type === "css" ? "text/css; charset=utf-8" : "application/javascript; charset=utf-8",
          "cache-control": "private, max-age=300",
        },
      });
    }

    if (view === LOCAL_ASSET_VIEW) {
      const source = await getHomepageSource();
      if (source.mode !== "saved-page" || !source.assetDirectory) {
        return NextResponse.json({ error: "Local saved-page assets are unavailable" }, { status: 404 });
      }

      const relativePath = request.nextUrl.searchParams.get("path")?.trim();
      if (!relativePath) {
        return NextResponse.json({ error: "path is required for saved-page asset previews" }, { status: 400 });
      }

      const normalizedRelativePath = normalizeSavedPageAssetPath(relativePath);
      const assetPath = path.resolve(source.assetDirectory, normalizedRelativePath);
      const assetRoot = path.resolve(source.assetDirectory);
      if (!assetPath.startsWith(`${assetRoot}${path.sep}`) && assetPath !== assetRoot) {
        return NextResponse.json({ error: "Invalid saved-page asset path" }, { status: 400 });
      }

      const extension = path.extname(assetPath).toLowerCase();
      const contentType = MIME_TYPES[extension] ?? "application/octet-stream";
      if (contentType.startsWith("text/css")) {
        const asset = await readSourceText(assetPath);
        const rewrittenCss = rewriteCssAssetUrls({
          css: asset,
          request,
          source,
        });
        return new NextResponse(rewrittenCss, {
          status: 200,
          headers: {
            "content-type": contentType,
            "cache-control": "private, max-age=300",
          },
        });
      }

      const asset = await readSourceBinary(assetPath);
      return new NextResponse(asset, {
        status: 200,
        headers: {
          "content-type": contentType,
          "cache-control": "private, max-age=300",
        },
      });
    }

    if (view === "page") {
      const html = await renderFullPageDocument(request);
      return new NextResponse(html, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "private, max-age=60",
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
        "cache-control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error("[api] Failed to render NYT homepage preview", error);
    const message = error instanceof Error ? error.message : "failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
