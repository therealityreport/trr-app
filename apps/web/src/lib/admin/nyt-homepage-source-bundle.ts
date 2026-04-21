export const NYT_HOMEPAGE_SOURCE_BUNDLE = {
  canonicalSourceUrl: "https://www.nytimes.com/",
  savedPage: {
    html: "/Volumes/HardDrive/SAVED PAGES/NEW YORK TIMES/HOME PAGE/The New York Times - Breaking News, US News, World News and Videos.html",
    assetDirectory:
      "/Volumes/HardDrive/SAVED PAGES/NEW YORK TIMES/HOME PAGE/The New York Times - Breaking News, US News, World News and Videos_files",
  },
  html: {
    rendered: ".agents/skills/design-docs-agent/source-bundles/nyt-homepage-2026-04-21/index.html",
  },
  css: [
    ".agents/skills/design-docs-agent/source-bundles/nyt-homepage-2026-04-21/assets/css/global-bf55b3b62e74478ad488922130f07a8e.css",
    ".agents/skills/design-docs-agent/source-bundles/nyt-homepage-2026-04-21/assets/css/cssModulesStyles-194a4f08b37a2be7fb8f.css",
    ".agents/skills/design-docs-agent/source-bundles/nyt-homepage-2026-04-21/assets/css/player-0.2.40-CnxAEwcy.css",
    ".agents/skills/design-docs-agent/source-bundles/nyt-homepage-2026-04-21/assets/css/cover-0.2.40-eTrf0IGY.css",
    ".agents/skills/design-docs-agent/source-bundles/nyt-homepage-2026-04-21/assets/css/poster-0.2.40-BdueiXaE.css",
    ".agents/skills/design-docs-agent/source-bundles/nyt-homepage-2026-04-21/assets/css/overlay-controls-0.2.40-DTyJF-yz.css",
    ".agents/skills/design-docs-agent/source-bundles/nyt-homepage-2026-04-21/assets/css/scrubber-0.2.40-allGBXvP.css",
    ".agents/skills/design-docs-agent/source-bundles/nyt-homepage-2026-04-21/assets/css/video-feed-0.2.40-DxGu5TjZ.css",
    ".agents/skills/design-docs-agent/source-bundles/nyt-homepage-2026-04-21/assets/css/pool-0.2.40-CbJK-W2L.css",
  ],
  js: [
    ".agents/skills/design-docs-agent/source-bundles/nyt-homepage-2026-04-21/assets/js/adslot-59e729d7c8593a1554b2.js",
    ".agents/skills/design-docs-agent/source-bundles/nyt-homepage-2026-04-21/assets/js/pool-0.2.40-D37jd-c4.js",
    ".agents/skills/design-docs-agent/source-bundles/nyt-homepage-2026-04-21/assets/js/player-CKCxHe9J.js",
    ".agents/skills/design-docs-agent/source-bundles/nyt-homepage-2026-04-21/assets/js/cover-0.2.40-DtYyWQLl.js",
    ".agents/skills/design-docs-agent/source-bundles/nyt-homepage-2026-04-21/assets/js/poster-0.2.40-CFXJA1Fq.js",
    ".agents/skills/design-docs-agent/source-bundles/nyt-homepage-2026-04-21/assets/js/overlay-controls-Df1-R5DD.js",
    ".agents/skills/design-docs-agent/source-bundles/nyt-homepage-2026-04-21/assets/js/video-feed-0.2.40-BZ-zSyuf.js",
    ".agents/skills/design-docs-agent/source-bundles/nyt-homepage-2026-04-21/assets/js/vendor-9916e8df8eecbd757328.js",
    ".agents/skills/design-docs-agent/source-bundles/nyt-homepage-2026-04-21/assets/js/home-2c4544aaa307d69dadd2.js",
    ".agents/skills/design-docs-agent/source-bundles/nyt-homepage-2026-04-21/assets/js/desktopLogoNav-16cdbd8aae0ea9aff7cf.js",
    ".agents/skills/design-docs-agent/source-bundles/nyt-homepage-2026-04-21/assets/js/nestedNav-d3f6f7e7e20094491b95.js",
    ".agents/skills/design-docs-agent/source-bundles/nyt-homepage-2026-04-21/assets/js/cssModulesStyles-67982248ede4abbeaa1f.js",
    ".agents/skills/design-docs-agent/source-bundles/nyt-homepage-2026-04-21/assets/js/main-34f07424be3a0c65c666.js",
  ],
  remoteStylesheets: [
    "https://g1.nyt.com/fonts/css/web-fonts.c851560786173ad206e1f76c1901be7e096e8f8b.css",
    "https://static01.nytimes.com/newsgraphics/7TB1aQ0sdLkJcw/_app.1CC0f5exTKx2uH3NGdL8u27WesdWL1NaUU7IraVXxUU/immutable/assets/index.F3xXo7V6.css",
    "https://static01.nytimes.com/newsgraphics/7TB1aQ0sdLkJcw/_app.1CC0f5exTKx2uH3NGdL8u27WesdWL1NaUU7IraVXxUU/immutable/assets/styles_hp.SHOBbrf7.css",
    "https://static01.nytimes.com/newsgraphics/weather-hp-strip/6020d676-75c3-4993-b5c7-11182d192a4f/_assets/_app/immutable/assets/weather-hp-modules.cbd92ddb.css",
  ],
  additionalInternalScripts: [
    "/vi-assets/static-assets/vendors~audio~bestsellers~card~cardpanel~collections~explainer~home~liveAsset~markets~paidpost~progr~9ff3f856-43452ac8424a0b5a9ef9.js",
    "/vi-assets/static-assets/vendors~audio~byline~capsule~card~cardpanel~clientSideCapsule~home~livePanel~paidpost~slideshow~vide~2ddd9d4c-b971029d54db6881343b.js",
  ],
  authoritativeViewport: "desktop",
  screenshots: {
    desktop: [
      ".agents/skills/design-docs-agent/source-bundles/nyt-homepage-2026-04-21/screenshots/nyt-homepage-2026-04-21.jpg",
    ],
  },
} as const;

export type NytHomepageSourceBundle = typeof NYT_HOMEPAGE_SOURCE_BUNDLE;

type NytHomepagePreviewView = "page" | "fragment" | "screenshot" | "asset";
type NytHomepagePreviewAssetType = "css" | "js";

export function buildNytHomepagePreviewUrl(
  view: NytHomepagePreviewView,
  options?: {
    id?: string;
    type?: NytHomepagePreviewAssetType;
    index?: number;
  },
) {
  const params = new URLSearchParams({ view });

  if (options?.id) {
    params.set("id", options.id);
  }

  if (options?.type) {
    params.set("type", options.type);
  }

  if (typeof options?.index === "number") {
    params.set("index", String(options.index));
  }

  return `/api/admin/design-docs/nyt-homepage-preview?${params.toString()}`;
}
