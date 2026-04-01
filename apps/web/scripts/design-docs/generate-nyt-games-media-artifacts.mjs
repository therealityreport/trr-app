import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { parseArgs, writeJsonOutput } from "./_cli.mjs";

const APP_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const DEFAULT_BUNDLE_ROOT = "/Volumes/HardDrive/SAVED PAGES/NYT GAMES/HOME PAGE";
const DEFAULT_HTML_PATH = path.join(
  DEFAULT_BUNDLE_ROOT,
  "The Crossword — The New York Times.html",
);
const DEFAULT_HUB_CSS_PATH = path.join(
  DEFAULT_BUNDLE_ROOT,
  "The Crossword — The New York Times_files",
  "hub.3cf5ee155725326e1184.css",
);
const DEFAULT_CROSSPLAY_CSS_PATH = path.join(
  DEFAULT_BUNDLE_ROOT,
  "The Crossword — The New York Times_files",
  "5761.7d1915be73cf8ef65093.css",
);
const DEFAULT_DRAWER_CSS_PATH = path.join(
  DEFAULT_BUNDLE_ROOT,
  "The Crossword — The New York Times_files",
  "5282.6ea7e0f5f16a91f7809a.css",
);
const DEFAULT_OUTPUT_PATH = path.join(
  APP_ROOT,
  "src/components/admin/design-docs/sections/games/generated/nyt-games-source-inventory.json",
);
const DEFAULT_DOWNLOAD_DIR = path.join(APP_ROOT, ".tmp/nyt-games-media");
const DEFAULT_PUBLIC_BASE_URL = "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev";
const DEFAULT_R2_PREFIX = "images/design-docs/nyt-games";
const CACHE_CONTROL = "public, max-age=31536000, immutable";
const SCHEMA_VERSION = "2026-03-31.nyt-games-media.v1";
const SCORING_CONFIG_VERSION = "crosswords-home-saved-bundle.v1";

const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const URL_PATTERN = /url\((['"]?)([^'")]+)\1\)/g;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizePathSeparator(value) {
  return value.split(path.sep).join("/");
}

function inferContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return MIME_TYPES[extension] ?? "application/octet-stream";
}

function resolveRelativeAssetUrl(value) {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("./assets/puzzle-progress/")) {
    return `https://www.nytimes.com/games-assets/v2/assets/puzzle-progress/${value.split("/").pop()}`;
  }

  if (value.startsWith("./assets/expansion-games/")) {
    return `https://www.nytimes.com/games-assets/v2/assets/expansion-games/${value.split("/").pop()}`;
  }

  if (value.startsWith("./assets/icons/")) {
    return `https://www.nytimes.com/games-assets/v2/assets/icons/${value.split("/").pop()}`;
  }

  if (value === "./assets/print.svg") {
    return "https://www.nytimes.com/games-assets/v2/assets/print.svg";
  }

  if (value === "./assets/print-black.svg") {
    return "https://www.nytimes.com/games-assets/v2/assets/print-black.svg";
  }

  if (value === "./assets/crossplay/bannerV2.svg") {
    return "https://www.nytimes.com/games-assets/v2/assets/crossplay/bannerV2.svg";
  }

  return value;
}

function extractCanonicalUrl(html) {
  return (
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ??
    html.match(/property=["']og:url["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    "https://www.nytimes.com/crosswords"
  );
}

function extractInlineLogoMarkup(html) {
  const match = html.match(/<svg[^>]*class=["'][^"']*pz-nav__logo[^"']*["'][\s\S]*?<\/svg>/i);
  if (!match?.[0]) {
    throw new Error("Unable to extract inline NYT Games logo SVG from the saved HTML bundle.");
  }

  const svg = match[0];
  if (svg.includes("xmlns=")) {
    return svg;
  }
  return svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
}

function extractCssUrls(label, cssText) {
  const urls = [];
  for (const match of cssText.matchAll(URL_PATTERN)) {
    const raw = match[2]?.trim();
    if (!raw) continue;
    urls.push({
      discoveredIn: label,
      raw,
      resolved: resolveRelativeAssetUrl(raw),
    });
  }
  return urls;
}

function dedupeByResolvedUrl(entries) {
  const byResolved = new Map();
  for (const entry of entries) {
    if (!byResolved.has(entry.resolved)) {
      byResolved.set(entry.resolved, entry);
    }
  }
  return byResolved;
}

function createDisplay(slot, desktop, mobile) {
  return {
    slot,
    desktop,
    ...(mobile ? { mobile } : {}),
  };
}

function buildAssetSpecs(canonicalUrl) {
  const pageIconDisplay = createDisplay(
    "hamburger-cta-icon-strip",
    { width: 25, height: 25, objectFit: "contain" },
    { width: 20, height: 20, objectFit: "contain" },
  );
  const drawerIconDisplay = createDisplay(
    "drawer-footer-icon",
    { width: 20, height: 20, objectFit: "contain" },
    { width: 20, height: 20, objectFit: "contain" },
  );
  const cardIllustrationDisplay = createDisplay(
    "hub-game-card-illustration",
    { width: 92, height: 92, objectFit: "contain", backgroundSize: "contain" },
    { width: 62, height: 62, objectFit: "contain", backgroundSize: "contain" },
  );
  const ctaIconDisplay = createDisplay(
    "drawer-cta-icon",
    { width: 56, height: 56, objectFit: "contain" },
    { width: 56, height: 56, objectFit: "contain" },
  );

  const progressSpecs = Array.from({ length: 17 }, (_, index) => ({
    id: `progress-state-${index}`,
    label: `Puzzle progress ${index}`,
    kind: "progress",
    file: `progress/puzzle-progress-${index}.svg`,
    source: `https://www.nytimes.com/games-assets/v2/assets/puzzle-progress/puzzle-progress-${index}.svg`,
    display: createDisplay(
      "featured-puzzle-progress",
      { width: 100, height: 100, objectFit: "contain" },
      { width: 75, height: 75, objectFit: "contain" },
    ),
  }));

  return [
    {
      id: "docs-toc-icon",
      label: "Table of contents icon",
      kind: "icon",
      file: "icons/docs/toc-outline.png",
      source: "https://static.thenounproject.com/png/1010520-200.png",
      allowMissingFromBundle: true,
      display: createDisplay(
        "docs-toc-trigger",
        { width: 22, height: 22, objectFit: "contain" },
        { width: 22, height: 22, objectFit: "contain" },
      ),
    },
    {
      id: "nyt-games-logo",
      label: "NYT Games wordmark",
      kind: "logo",
      file: "logos/nyt-games-logo.svg",
      source: canonicalUrl,
      sourceType: "inline-html",
      sourceSelector: "svg.pz-nav__logo",
      display: createDisplay(
        "brand-logo",
        { width: 138, height: 25, objectFit: "contain" },
      ),
    },
    {
      id: "featured-article-illustration",
      label: "Featured article illustration",
      kind: "illustration",
      file: "illustrations/guide-promo-005.jpg",
      source: "https://www.nytimes.com/games-assets/guide-promo-005.jpg",
      display: createDisplay(
        "featured-article-illustration",
        {
          width: 290,
          height: 260,
          objectFit: "cover",
          backgroundSize: "cover",
          backgroundPosition: "left",
        },
        {
          width: 320,
          height: 260,
          objectFit: "cover",
          backgroundSize: "cover",
          backgroundPosition: "left",
        },
      ),
    },
    {
      id: "crossplay-banner",
      label: "Crossplay banner",
      kind: "promo",
      file: "promo/crossplay-banner-v2.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/crossplay/bannerV2.svg",
      display: createDisplay(
        "crossplay-banner",
        { width: 320, height: 207, objectFit: "cover", backgroundSize: "cover" },
      ),
    },
    {
      id: "cta-crossplay-app-icon-rounded",
      label: "Crossplay CTA rounded app icon",
      kind: "icon",
      file: "icons/cta/crossplay-app-icon-rounded.svg",
      source: "https://storage.googleapis.com/games-assets/v2/assets/icons/crossplay_app_icon_rounded.svg",
      display: ctaIconDisplay,
    },
    {
      id: "cta-pips-appdownload-cta",
      label: "Pips CTA app-download icon",
      kind: "icon",
      file: "icons/cta/pips-appdownload-cta.svg",
      source: "https://www.nytimes.com/games-assets/icons/banner-cta/pips_appdownload_cta.svg",
      display: createDisplay(
        "drawer-cta-icon",
        { width: 85, height: 56, objectFit: "contain" },
        { width: 56, height: 56, objectFit: "contain" },
      ),
    },
    {
      id: "cta-inline-games-all",
      label: "Inline games CTA strip",
      kind: "icon",
      file: "icons/cta/inline-games-all.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/icons/inline-games-all.svg",
      display: createDisplay(
        "drawer-cta-inline-strip",
        { width: 148, height: 30, objectFit: "contain" },
        { width: 148, height: 30, objectFit: "contain" },
      ),
    },
    {
      id: "print-default",
      label: "Print icon",
      kind: "icon",
      file: "icons/print.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/print.svg",
      display: createDisplay(
        "monthly-bonus-print",
        { width: 20, height: 20, objectFit: "contain" },
      ),
    },
    {
      id: "print-dark",
      label: "Print icon (black)",
      kind: "icon",
      file: "icons/print-black.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/print-black.svg",
      display: createDisplay(
        "monthly-bonus-print",
        { width: 20, height: 20, objectFit: "contain" },
      ),
    },
    ...progressSpecs,
    {
      id: "progress-gold-star",
      label: "Puzzle progress gold star",
      kind: "progress",
      file: "progress/puzzle-progress-gold-star.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/puzzle-progress/puzzle-progress-gold-star.svg",
      display: createDisplay(
        "archive-thumb-progress",
        { width: 55, height: 55, objectFit: "contain" },
      ),
    },
    {
      id: "progress-blue-star",
      label: "Puzzle progress blue star",
      kind: "progress",
      file: "progress/puzzle-progress-blue-star.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/puzzle-progress/puzzle-progress-blue-star.svg",
      display: createDisplay(
        "archive-thumb-progress",
        { width: 55, height: 55, objectFit: "contain" },
      ),
    },
    {
      id: "progress-newest",
      label: "Puzzle newest state",
      kind: "progress",
      file: "progress/puzzle-progress-newest.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/puzzle-progress/puzzle-progress-newest.svg",
      display: createDisplay(
        "archive-thumb-progress",
        { width: 55, height: 55, objectFit: "contain" },
      ),
    },
    {
      id: "progress-unavailable",
      label: "Puzzle unavailable state",
      kind: "progress",
      file: "progress/puzzle-unavailable.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/puzzle-progress/puzzle-unavailable.svg",
      display: createDisplay(
        "archive-thumb-progress",
        { width: 55, height: 55, objectFit: "contain" },
      ),
    },
    {
      id: "page-icon-crossword",
      label: "Crossword page icon",
      kind: "icon",
      file: "icons/crossword-icon-np.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/wordle/page-icons/Crossword-Icon-np.svg",
      display: pageIconDisplay,
    },
    {
      id: "page-icon-midi",
      label: "Midi page icon",
      kind: "icon",
      file: "icons/midi-icon-np.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/wordle/page-icons/Midi-Icon-np.svg",
      display: pageIconDisplay,
    },
    {
      id: "page-icon-mini",
      label: "Mini page icon",
      kind: "icon",
      file: "icons/mini-icon-np.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/wordle/page-icons/Mini-Icon-np.svg",
      display: pageIconDisplay,
    },
    {
      id: "page-icon-wordle",
      label: "Wordle page icon",
      kind: "icon",
      file: "icons/page/wordle-icon-np.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/wordle/page-icons/Wordle-Icon-np.svg",
      display: pageIconDisplay,
    },
    {
      id: "page-icon-connections",
      label: "Connections page icon",
      kind: "icon",
      file: "icons/page/connections-icon-np.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/wordle/page-icons/Connections-Icon-np.svg",
      display: pageIconDisplay,
    },
    {
      id: "page-icon-spelling-bee",
      label: "Spelling Bee page icon",
      kind: "icon",
      file: "icons/page/spelling-bee-icon-np.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/wordle/page-icons/Spelling-Bee-Icon-np.svg",
      display: pageIconDisplay,
    },
    {
      id: "page-icon-strands",
      label: "Strands page icon",
      kind: "icon",
      file: "icons/page/strands-icon-np.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/wordle/page-icons/Strands-Icon-np.svg",
      display: pageIconDisplay,
    },
    {
      id: "page-icon-sudoku",
      label: "Sudoku page icon",
      kind: "icon",
      file: "icons/page/sudoku-icon-np.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/wordle/page-icons/Sudoku-Icon-np.svg",
      display: pageIconDisplay,
    },
    {
      id: "page-icon-tiles",
      label: "Tiles page icon",
      kind: "icon",
      file: "icons/page/tiles-icon-np.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/wordle/page-icons/Tiles-Icon-np.svg",
      display: pageIconDisplay,
    },
    {
      id: "page-icon-letter-boxed",
      label: "Letter Boxed page icon",
      kind: "icon",
      file: "icons/page/letter-boxed-icon-np.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/wordle/page-icons/LetterBoxed-Icon-np.svg",
      display: pageIconDisplay,
    },
    {
      id: "drawer-icon-crossplay",
      label: "Crossplay drawer icon",
      kind: "icon",
      file: "icons/drawer/crossplay.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/icons/crossplay.svg",
      display: drawerIconDisplay,
    },
    {
      id: "drawer-icon-crossword",
      label: "Crossword drawer icon",
      kind: "icon",
      file: "icons/drawer/daily.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/icons/daily.svg",
      display: drawerIconDisplay,
    },
    {
      id: "drawer-icon-midi",
      label: "Midi drawer icon",
      kind: "icon",
      file: "icons/drawer/midi.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/icons/midi.svg",
      display: drawerIconDisplay,
    },
    {
      id: "drawer-icon-mini",
      label: "Mini drawer icon",
      kind: "icon",
      file: "icons/drawer/mini.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/icons/mini.svg",
      display: drawerIconDisplay,
    },
    {
      id: "drawer-icon-connections",
      label: "Connections drawer icon",
      kind: "icon",
      file: "icons/drawer/connections.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/icons/connections.svg",
      display: drawerIconDisplay,
    },
    {
      id: "drawer-icon-spelling-bee",
      label: "Spelling Bee drawer icon",
      kind: "icon",
      file: "icons/drawer/spelling-bee.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/icons/spelling-bee.svg",
      display: drawerIconDisplay,
    },
    {
      id: "drawer-icon-wordle",
      label: "Wordle drawer icon",
      kind: "icon",
      file: "icons/drawer/wordle.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/icons/wordle.svg",
      display: drawerIconDisplay,
    },
    {
      id: "drawer-icon-pips",
      label: "Pips drawer icon",
      kind: "icon",
      file: "icons/drawer/pips.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/icons/pips.svg",
      display: drawerIconDisplay,
    },
    {
      id: "drawer-icon-strands",
      label: "Strands drawer icon",
      kind: "icon",
      file: "icons/drawer/strands.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/icons/strands.svg",
      display: drawerIconDisplay,
    },
    {
      id: "drawer-icon-letter-boxed",
      label: "Letter Boxed drawer icon",
      kind: "icon",
      file: "icons/drawer/letter-boxed.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/icons/letter-boxed.svg",
      display: drawerIconDisplay,
    },
    {
      id: "drawer-icon-tiles",
      label: "Tiles drawer icon",
      kind: "icon",
      file: "icons/drawer/tiles.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/icons/tiles.svg",
      display: drawerIconDisplay,
    },
    {
      id: "drawer-icon-sudoku",
      label: "Sudoku drawer icon",
      kind: "icon",
      file: "icons/drawer/sudoku-card-icon.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/expansion-games/sudoku-card-icon.svg",
      display: drawerIconDisplay,
    },
    {
      id: "card-icon-crossplay",
      label: "Crossplay card icon",
      kind: "icon",
      file: "icons/crossplay-card-icon.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/icons/crossplay-card-icon.svg",
      display: cardIllustrationDisplay,
    },
    {
      id: "card-icon-wordle",
      label: "Wordle card icon",
      kind: "icon",
      file: "icons/wordle-card-icon.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/expansion-games/wordle-card-icon.svg",
      display: cardIllustrationDisplay,
    },
    {
      id: "card-icon-connections",
      label: "Connections card icon",
      kind: "icon",
      file: "icons/connections.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/expansion-games/connections.svg",
      display: cardIllustrationDisplay,
    },
    {
      id: "card-icon-spelling-bee",
      label: "Spelling Bee card icon",
      kind: "icon",
      file: "icons/spelling-bee-card-icon.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/expansion-games/spelling-bee-card-icon.svg",
      display: cardIllustrationDisplay,
    },
    {
      id: "card-icon-pips",
      label: "Pips card icon",
      kind: "icon",
      file: "icons/pips-card-icon.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/expansion-games/pips-card-icon.svg",
      display: cardIllustrationDisplay,
    },
    {
      id: "card-icon-strands",
      label: "Strands card icon",
      kind: "icon",
      file: "icons/strands.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/expansion-games/strands.svg",
      display: cardIllustrationDisplay,
    },
    {
      id: "card-icon-letter-boxed",
      label: "Letter Boxed card icon",
      kind: "icon",
      file: "icons/letter-boxed-card-icon.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/expansion-games/letter-boxed-card-icon.svg",
      display: cardIllustrationDisplay,
    },
    {
      id: "card-icon-tiles",
      label: "Tiles card icon",
      kind: "icon",
      file: "icons/tiles-card-icon.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/expansion-games/tiles-card-icon.svg",
      display: cardIllustrationDisplay,
    },
    {
      id: "card-icon-sudoku",
      label: "Sudoku card icon",
      kind: "icon",
      file: "icons/sudoku-card-icon.svg",
      source: "https://www.nytimes.com/games-assets/v2/assets/expansion-games/sudoku-card-icon.svg",
      display: cardIllustrationDisplay,
    },
  ];
}

function buildSourceComponents() {
  return [
    {
      id: "playbook-palette-index",
      label: "Playbook Palette",
      group: "foundation",
      sourceComponentName: "@nyt/playbook/lib/assets/palette/index.css",
      sourcePath: "xwords/phoenix/node_modules/@nyt/playbook/lib/assets/palette/index.css",
      provenance: "Provided screenshot of the webpack:// source tree.",
      docsAnchor: "color-palette",
      cssModules: ["index.css"],
    },
    {
      id: "playbook-spacing",
      label: "Playbook Spacing",
      group: "foundation",
      sourceComponentName: "@nyt/playbook/lib/assets/spacing",
      sourcePath: "xwords/phoenix/node_modules/@nyt/playbook/lib/assets/spacing",
      provenance: "Provided screenshot of the webpack:// source tree.",
      docsAnchor: "type-scale",
      cssModules: ["spacing"],
    },
    ...[
      ["buttons", "buttons.scss"],
      ["close", "close.scss"],
      ["icon", "icon.scss"],
      ["info", "info.scss"],
      ["title", "title.scss"],
    ].map(([idSuffix, cssFile]) => ({
      id: `foundation-moments-${idSuffix}`,
      label: `Moments / ${cssFile}`,
      group: "foundation",
      sourceComponentName: `foundation-game/moments/${cssFile}`,
      sourcePath: `xwords/phoenix/src/shared/foundation-game/moments/${cssFile}`,
      provenance: "Provided screenshot of the webpack:// source tree.",
      docsAnchor: "source-tree-coverage",
      cssModules: [cssFile],
    })),
    ...[
      ["index", "index.scss"],
      ["intercept", "intercept.scss"],
      ["modals", "modals.scss"],
      ["moments", "moments.scss"],
    ].map(([idSuffix, cssFile]) => ({
      id: `foundation-game-${idSuffix}`,
      label: `Foundation Game / ${cssFile}`,
      group: "foundation",
      sourceComponentName: `foundation-game/${cssFile}`,
      sourcePath: `xwords/phoenix/src/shared/foundation-game/${cssFile}`,
      provenance: "Provided screenshot of the webpack:// source tree.",
      docsAnchor: "source-tree-coverage",
      cssModules: [cssFile],
    })),
    {
      id: "hub-games-section",
      label: "GamesSection",
      group: "hub",
      sourceComponentName: "GamesSection",
      sourcePath: "xwords/phoenix/src/shared/hub/GamesSection",
      provenance: "Provided screenshot of the webpack:// source tree plus saved hub CSS.",
      docsAnchor: "game-portfolio",
      cssModules: ["hub-game-card", "hub-our-games"],
    },
    {
      id: "hub-guide-promo",
      label: "GuidePromo",
      group: "hub",
      sourceComponentName: "GuidePromo",
      sourcePath: "xwords/phoenix/src/shared/hub/GuidePromo",
      provenance: "Provided screenshot of the webpack:// source tree plus saved hub CSS.",
      docsAnchor: "featured-article",
      cssModules: ["hub-guide-promo-card", "hub-guide-promo-card-illustration"],
    },
    {
      id: "hub-loading-card",
      label: "LoadingCard",
      group: "hub",
      sourceComponentName: "LoadingCard",
      sourcePath: "xwords/phoenix/src/shared/hub/LoadingCard",
      provenance: "Provided screenshot of the webpack:// source tree.",
      docsAnchor: "source-tree-coverage",
      cssModules: ["LoadingCard.css"],
    },
    {
      id: "hub-mobile-stats-card",
      label: "MobileStatsCard",
      group: "hub",
      sourceComponentName: "MobileStatsCard",
      sourcePath: "xwords/phoenix/src/shared/hub/MobileStatsCard",
      provenance: "Provided screenshot of the webpack:// source tree.",
      docsAnchor: "recently-tabbed",
      cssModules: ["mobile stats card"],
    },
    {
      id: "hub-print-modal",
      label: "PrintModal",
      group: "hub",
      sourceComponentName: "PrintModal",
      sourcePath: "xwords/phoenix/src/shared/hub/PrintModal",
      provenance: "Provided screenshot of the webpack:// source tree plus saved hub CSS.",
      docsAnchor: "source-tree-coverage",
      cssModules: ["hub-print-modal", "hub-print-modal-content"],
    },
    {
      id: "hub-progress",
      label: "Progress",
      group: "hub",
      sourceComponentName: "Progress",
      sourcePath: "xwords/phoenix/src/shared/hub/Progress",
      provenance: "Provided screenshot of the webpack:// source tree plus saved hub CSS.",
      docsAnchor: "recently-tabbed",
      cssModules: ["puzzle-progress", "progress-state"],
    },
    {
      id: "hub-promo-card",
      label: "PromoCard",
      group: "hub",
      sourceComponentName: "PromoCard",
      sourcePath: "xwords/phoenix/src/shared/hub/PromoCard",
      provenance: "Provided screenshot of the webpack:// source tree plus saved hub CSS.",
      docsAnchor: "navigation-drawer-crossplay-cta",
      cssModules: ["promo card", "banner CTA"],
    },
    {
      id: "hub-puzzle-card",
      label: "PuzzleCard / scss",
      group: "hub",
      sourceComponentName: "PuzzleCard",
      sourcePath: "xwords/phoenix/src/shared/hub/PuzzleCard/scss",
      provenance: "Provided screenshot of the webpack:// source tree plus saved hub CSS.",
      docsAnchor: "game-portfolio",
      cssModules: ["hub-game-card", "puzzle card"],
    },
    {
      id: "hub-puzzle-group",
      label: "PuzzleGroup",
      group: "hub",
      sourceComponentName: "PuzzleGroup",
      sourcePath: "xwords/phoenix/src/shared/hub/PuzzleGroup",
      provenance: "Provided screenshot of the webpack:// source tree plus saved hub CSS.",
      docsAnchor: "recently-tabbed",
      cssModules: ["hub-puzzle-group"],
    },
    {
      id: "hub-sponsored-card",
      label: "SponsoredCard",
      group: "hub",
      sourceComponentName: "SponsoredCard",
      sourcePath: "xwords/phoenix/src/shared/hub/SponsoredCard",
      provenance: "Provided screenshot of the webpack:// source tree plus saved hub CSS.",
      docsAnchor: "source-tree-coverage",
      cssModules: ["hub-sponsored-card"],
    },
    {
      id: "hub-stats-card",
      label: "StatsCard",
      group: "hub",
      sourceComponentName: "StatsCard",
      sourcePath: "xwords/phoenix/src/shared/hub/StatsCard",
      provenance: "Provided screenshot of the webpack:// source tree.",
      docsAnchor: "recently-tabbed",
      cssModules: ["stats card"],
    },
    {
      id: "hub-streak-encouragement",
      label: "StreakEncouragement",
      group: "hub",
      sourceComponentName: "StreakEncouragement",
      sourcePath: "xwords/phoenix/src/shared/hub/StreakEncouragement",
      provenance: "Provided screenshot of the webpack:// source tree.",
      docsAnchor: "recently-tabbed",
      cssModules: ["streak encouragement"],
    },
    {
      id: "hub-welcome",
      label: "Welcome",
      group: "hub",
      sourceComponentName: "Welcome",
      sourcePath: "xwords/phoenix/src/shared/hub/Welcome",
      provenance: "Provided screenshot of the webpack:// source tree.",
      docsAnchor: "header-shell-and-portal-targets",
      cssModules: ["welcome"],
    },
    {
      id: "hub-wordplay-link",
      label: "WordplayLink",
      group: "hub",
      sourceComponentName: "WordplayLink",
      sourcePath: "xwords/phoenix/src/shared/hub/WordplayLink",
      provenance: "Provided screenshot of the webpack:// source tree.",
      docsAnchor: "production-footer",
      cssModules: ["wordplay link"],
    },
    {
      id: "hub-shared-accordion",
      label: "shared / Accordion",
      group: "hub",
      sourceComponentName: "Accordion",
      sourcePath: "xwords/phoenix/src/shared/hub/shared/Accordion/Accordion.scss",
      provenance: "Provided screenshot of the webpack:// source tree plus saved hub CSS.",
      docsAnchor: "recently-tabbed",
      cssModules: ["Accordion.scss"],
    },
  ];
}

function ensureDiscoveredAsset(spec, discoveredByUrl) {
  if (spec.sourceType === "inline-html" || spec.allowMissingFromBundle) {
    return {
      ...spec,
      discoveredIn: [spec.allowMissingFromBundle ? "external-docs-provenance" : "The Crossword — The New York Times.html"],
    };
  }

  const discovered = discoveredByUrl.get(spec.source);
  if (!discovered) {
    throw new Error(`Expected asset not found in saved source bundle: ${spec.source}`);
  }

  return {
    ...spec,
    discoveredIn: [discovered.discoveredIn],
  };
}

async function ensureDir(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function writeInlineAsset(targetPath, content) {
  await ensureDir(targetPath);
  await writeFile(targetPath, `${content.trim()}\n`, "utf8");
}

async function downloadAsset(targetPath, url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await ensureDir(targetPath);
  await writeFile(targetPath, Buffer.from(arrayBuffer));
}

function uploadToR2(localPath, objectKey, endpointUrl, bucket) {
  const contentType = inferContentType(localPath);
  const result = spawnSync(
    "aws",
    [
      "s3",
      "cp",
      localPath,
      `s3://${bucket}/${objectKey}`,
      "--endpoint-url",
      endpointUrl,
      "--region",
      process.env.OBJECT_STORAGE_REGION || "auto",
      "--cache-control",
      CACHE_CONTROL,
      "--content-type",
      contentType,
    ],
    {
      encoding: "utf8",
      stdio: "pipe",
      env: {
        ...process.env,
        AWS_ACCESS_KEY_ID: process.env.OBJECT_STORAGE_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY,
      },
    },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || `aws s3 cp failed for ${objectKey}`);
  }
}

async function headR2Url(url) {
  const response = await fetch(url, { method: "HEAD" });
  return response.status;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const htmlPath = path.resolve(String(args.html || DEFAULT_HTML_PATH));
  const hubCssPath = path.resolve(String(args["hub-css"] || DEFAULT_HUB_CSS_PATH));
  const crossplayCssPath = path.resolve(String(args["crossplay-css"] || DEFAULT_CROSSPLAY_CSS_PATH));
  const drawerCssPath = path.resolve(String(args["drawer-css"] || DEFAULT_DRAWER_CSS_PATH));
  const outputPath = path.resolve(String(args.output || DEFAULT_OUTPUT_PATH));
  const downloadDir = path.resolve(String(args["download-dir"] || DEFAULT_DOWNLOAD_DIR));
  const shouldDownload = Boolean(args.download || args.mirror);
  const shouldMirror = Boolean(args.mirror);
  const shouldValidateR2 = Boolean(args.validate || args["validate-r2"] || args.mirror);
  const publicBaseUrl = String(
    args["public-base-url"] ||
      process.env.OBJECT_STORAGE_PUBLIC_BASE_URL ||
      DEFAULT_PUBLIC_BASE_URL,
  ).replace(/\/+$/, "");
  const r2Prefix = String(args.prefix || DEFAULT_R2_PREFIX).replace(/^\/+|\/+$/g, "");
  const bucket = String(args.bucket || process.env.OBJECT_STORAGE_BUCKET || "").trim();
  const endpointUrl = String(args.endpoint || process.env.OBJECT_STORAGE_ENDPOINT_URL || "").trim();

  const [html, hubCss, crossplayCss, drawerCss] = await Promise.all([
    readFile(htmlPath, "utf8"),
    readFile(hubCssPath, "utf8"),
    readFile(crossplayCssPath, "utf8"),
    readFile(drawerCssPath, "utf8"),
  ]);

  const canonicalUrl = extractCanonicalUrl(html);
  const inlineLogoMarkup = extractInlineLogoMarkup(html);
  const discoveredUrls = dedupeByResolvedUrl([
    ...extractCssUrls(path.basename(hubCssPath), hubCss),
    ...extractCssUrls(path.basename(crossplayCssPath), crossplayCss),
    ...extractCssUrls(path.basename(drawerCssPath), drawerCss),
  ]);
  const assetSpecs = buildAssetSpecs(canonicalUrl).map((spec) =>
    ensureDiscoveredAsset(spec, discoveredUrls),
  );

  const envelope = {
    schemaVersion: SCHEMA_VERSION,
    inputHash: sha256([html, hubCss, crossplayCss, drawerCss].join("\n---\n")),
    generatedAt: new Date().toISOString(),
    scoringConfigVersion: SCORING_CONFIG_VERSION,
    data: {
      sourceBundle: {
        canonicalUrl,
        htmlPath,
        stylesheets: [hubCssPath, crossplayCssPath, drawerCssPath],
      },
      extractedUrls: [...discoveredUrls.values()].map((entry) => ({
        discoveredIn: entry.discoveredIn,
        raw: entry.raw,
        resolved: entry.resolved,
      })),
      assets: assetSpecs,
      sourceComponents: buildSourceComponents(),
    },
  };

  await ensureDir(outputPath);
  await writeJsonOutput(outputPath, envelope);

  if (!shouldDownload) {
    return;
  }

  const mirroredUrls = [];
  for (const asset of assetSpecs) {
    const localPath = path.join(downloadDir, asset.file);
    if (asset.sourceType === "inline-html") {
      await writeInlineAsset(localPath, inlineLogoMarkup);
    } else {
      await downloadAsset(localPath, asset.source);
    }

    if (shouldMirror) {
      if (!bucket || !endpointUrl) {
        throw new Error("R2 mirror requested, but OBJECT_STORAGE_BUCKET / OBJECT_STORAGE_ENDPOINT_URL are not configured.");
      }

      const objectKey = normalizePathSeparator(path.posix.join(r2Prefix, asset.file));
      uploadToR2(localPath, objectKey, endpointUrl, bucket);
      mirroredUrls.push({
        file: asset.file,
        url: `${publicBaseUrl}/${objectKey}`,
      });
    }
  }

  if (shouldMirror && shouldValidateR2) {
    const failures = [];
    for (const entry of mirroredUrls) {
      const status = await headR2Url(entry.url);
      if (status !== 200) {
        failures.push(`${entry.file} -> ${entry.url} returned ${status}`);
      }
    }
    if (failures.length > 0) {
      throw new Error(`R2 validation failed:\n${failures.join("\n")}`);
    }
  }
}

main().catch((error) => {
  console.error(`[nyt-games-media] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
