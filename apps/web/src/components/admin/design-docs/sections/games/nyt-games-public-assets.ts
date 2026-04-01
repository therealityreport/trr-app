import type { CSSProperties } from "react";
import { buildHostedMediaUrl } from "@/lib/hosted-media";
import inventoryArtifact from "./generated/nyt-games-source-inventory.json";

export type NYTGamesPublicAssetKind =
  | "logo"
  | "icon"
  | "progress"
  | "illustration"
  | "promo";

export interface NYTGamesAssetDisplaySize {
  width: number;
  height: number;
  backgroundSize?: string;
  backgroundPosition?: string;
  objectFit?: CSSProperties["objectFit"];
}

export interface NYTGamesAssetDisplay {
  slot: string;
  desktop: NYTGamesAssetDisplaySize;
  mobile?: NYTGamesAssetDisplaySize;
}

export interface NYTGamesPublicAsset {
  label: string;
  kind: NYTGamesPublicAssetKind;
  file: string;
  r2: string;
  source: string;
  display: NYTGamesAssetDisplay;
}

interface NYTGamesInventoryAsset {
  id: string;
  label: string;
  kind: NYTGamesPublicAssetKind;
  file: string;
  source: string;
  sourceType?: "inline-html" | "url";
  sourceSelector?: string;
  display: NYTGamesAssetDisplay;
}

interface NYTGamesInventoryArtifact {
  data: {
    assets: NYTGamesInventoryAsset[];
    sourceComponents?: NYTGamesInventorySourceComponent[];
    sourceBundle: {
      canonicalUrl: string;
    };
  };
}

export interface NYTGamesSourceComponentSpec {
  id: string;
  label: string;
  group: "foundation" | "hub";
  sourceComponentName: string;
  sourcePath: string;
  provenance: string;
  docsAnchor?: string;
  cssModules?: string[];
}

type NYTGamesInventorySourceComponent = NYTGamesSourceComponentSpec;

const INVENTORY = inventoryArtifact as NYTGamesInventoryArtifact;
const INVENTORY_BY_ID = new Map(
  INVENTORY.data.assets.map((asset) => [asset.id, asset] as const),
);

const materializeAsset = (id: string): NYTGamesPublicAsset => {
  const asset = INVENTORY_BY_ID.get(id);
  if (!asset) {
    throw new Error(`Missing NYT Games asset inventory entry for "${id}"`);
  }

  const source =
    asset.sourceType === "inline-html" && asset.sourceSelector
      ? `${asset.source} (inline ${asset.sourceSelector})`
      : asset.source;

  return {
    label: asset.label,
    kind: asset.kind,
    file: asset.file,
    r2: buildHostedMediaUrl(`/images/design-docs/nyt-games/${asset.file}`),
    source,
    display: asset.display,
  };
};

const withDisplay = (
  asset: NYTGamesPublicAsset,
  display: NYTGamesAssetDisplay,
): NYTGamesPublicAsset => ({
  ...asset,
  display,
});

export const NYT_GAMES_LOGO_ASSET = materializeAsset("nyt-games-logo");
export const NYT_GAMES_TOC_ICON_ASSET = materializeAsset("docs-toc-icon");

export const NYT_GAMES_PROMO_ASSETS = {
  featuredArticle: materializeAsset("featured-article-illustration"),
  crossplayBanner: materializeAsset("crossplay-banner"),
} as const;

export const NYT_GAMES_CTA_ASSETS = {
  crossplayAppIcon: materializeAsset("cta-crossplay-app-icon-rounded"),
  pipsAppIcon: materializeAsset("cta-pips-appdownload-cta"),
  inlineGamesAll: materializeAsset("cta-inline-games-all"),
} as const;

export const NYT_GAMES_PRINT_ASSETS = {
  default: materializeAsset("print-default"),
  dark: materializeAsset("print-dark"),
} as const;

export const NYT_GAMES_PROGRESS_ASSETS = {
  states: Array.from({ length: 17 }, (_, index) => materializeAsset(`progress-state-${index}`)),
  goldStar: materializeAsset("progress-gold-star"),
  blueStar: materializeAsset("progress-blue-star"),
  newest: materializeAsset("progress-newest"),
  unavailable: materializeAsset("progress-unavailable"),
} as const;

export const NYT_GAMES_PAGE_ICON_ASSETS = {
  crossword: materializeAsset("page-icon-crossword"),
  midi: materializeAsset("page-icon-midi"),
  mini: materializeAsset("page-icon-mini"),
  wordle: materializeAsset("page-icon-wordle"),
  connections: materializeAsset("page-icon-connections"),
  spellingBee: materializeAsset("page-icon-spelling-bee"),
  strands: materializeAsset("page-icon-strands"),
  sudoku: materializeAsset("page-icon-sudoku"),
  tiles: materializeAsset("page-icon-tiles"),
  letterBoxed: materializeAsset("page-icon-letter-boxed"),
} as const;

export const NYT_GAMES_DRAWER_ICON_ASSETS = {
  crossplay: materializeAsset("drawer-icon-crossplay"),
  crossword: materializeAsset("drawer-icon-crossword"),
  midi: materializeAsset("drawer-icon-midi"),
  mini: materializeAsset("drawer-icon-mini"),
  connections: materializeAsset("drawer-icon-connections"),
  spellingBee: materializeAsset("drawer-icon-spelling-bee"),
  wordle: materializeAsset("drawer-icon-wordle"),
  pips: materializeAsset("drawer-icon-pips"),
  strands: materializeAsset("drawer-icon-strands"),
  letterBoxed: materializeAsset("drawer-icon-letter-boxed"),
  tiles: materializeAsset("drawer-icon-tiles"),
  sudoku: materializeAsset("drawer-icon-sudoku"),
} as const;

export const NYT_GAMES_GAME_CARD_ICON_ASSETS = {
  crossplay: materializeAsset("card-icon-crossplay"),
  wordle: materializeAsset("card-icon-wordle"),
  connections: materializeAsset("card-icon-connections"),
  spellingBee: materializeAsset("card-icon-spelling-bee"),
  pips: materializeAsset("card-icon-pips"),
  strands: materializeAsset("card-icon-strands"),
  letterBoxed: materializeAsset("card-icon-letter-boxed"),
  tiles: materializeAsset("card-icon-tiles"),
  sudoku: materializeAsset("card-icon-sudoku"),
} as const;

export const NYT_GAMES_PUBLIC_ASSETS: readonly NYTGamesPublicAsset[] = [
  NYT_GAMES_TOC_ICON_ASSET,
  NYT_GAMES_LOGO_ASSET,
  ...Object.values(NYT_GAMES_PROMO_ASSETS),
  ...Object.values(NYT_GAMES_CTA_ASSETS),
  ...Object.values(NYT_GAMES_PRINT_ASSETS),
  ...NYT_GAMES_PROGRESS_ASSETS.states,
  NYT_GAMES_PROGRESS_ASSETS.goldStar,
  NYT_GAMES_PROGRESS_ASSETS.blueStar,
  NYT_GAMES_PROGRESS_ASSETS.newest,
  NYT_GAMES_PROGRESS_ASSETS.unavailable,
  ...Object.values(NYT_GAMES_PAGE_ICON_ASSETS),
  ...Object.values(NYT_GAMES_DRAWER_ICON_ASSETS),
  ...Object.values(NYT_GAMES_GAME_CARD_ICON_ASSETS),
] as const;

export const NYT_GAMES_PUBLIC_ASSET_GROUPS = [
  {
    title: "Docs Chrome",
    description: "Shared NYT Games docs controls mirrored to R2 for the page-level TOC and preview chrome.",
    assets: [NYT_GAMES_TOC_ICON_ASSET],
  },
  {
    title: "Logos & Featured Media",
    description: "Source-backed NYT Games brand marks and featured media mirrored into hosted R2 URLs.",
    assets: [
      NYT_GAMES_LOGO_ASSET,
      NYT_GAMES_PROMO_ASSETS.featuredArticle,
      NYT_GAMES_PROMO_ASSETS.crossplayBanner,
    ],
  },
  {
    title: "CTA & Banner Media",
    description: "Rounded app icons and inline strips used by the live drawer CTA banner states.",
    assets: [
      NYT_GAMES_CTA_ASSETS.crossplayAppIcon,
      NYT_GAMES_CTA_ASSETS.pipsAppIcon,
      NYT_GAMES_CTA_ASSETS.inlineGamesAll,
      NYT_GAMES_PROMO_ASSETS.crossplayBanner,
    ],
  },
  {
    title: "Drawer & Footer Icons",
    description: "Slot-specific icons used in the navigation drawer and footer; these are distinct from hub-card illustrations.",
    assets: Object.values(NYT_GAMES_DRAWER_ICON_ASSETS),
  },
  {
    title: "Page & Nav Icons",
    description: "Page-icon assets used for the hamburger CTA strip, navigation drawer, and footer group labels.",
    assets: Object.values(NYT_GAMES_PAGE_ICON_ASSETS),
  },
  {
    title: "Game Card Illustrations",
    description: "Expansion-game and Crossplay illustrations used by source hub cards at their original responsive heights.",
    assets: Object.values(NYT_GAMES_GAME_CARD_ICON_ASSETS),
  },
  {
    title: "Progress & Utility",
    description: "Puzzle progress states plus print affordances used by Monthly Bonus and archive modules.",
    assets: [
      ...NYT_GAMES_PROGRESS_ASSETS.states,
      NYT_GAMES_PROGRESS_ASSETS.goldStar,
      NYT_GAMES_PROGRESS_ASSETS.blueStar,
      NYT_GAMES_PROGRESS_ASSETS.newest,
      NYT_GAMES_PROGRESS_ASSETS.unavailable,
      ...Object.values(NYT_GAMES_PRINT_ASSETS),
    ],
  },
] as const;

export const NYT_GAMES_ICON_BY_SLUG = {
  crossplay: NYT_GAMES_DRAWER_ICON_ASSETS.crossplay,
  crossword: NYT_GAMES_DRAWER_ICON_ASSETS.crossword,
  midi: NYT_GAMES_DRAWER_ICON_ASSETS.midi,
  mini: NYT_GAMES_DRAWER_ICON_ASSETS.mini,
  connections: NYT_GAMES_DRAWER_ICON_ASSETS.connections,
  "spelling-bee": NYT_GAMES_DRAWER_ICON_ASSETS.spellingBee,
  wordle: NYT_GAMES_DRAWER_ICON_ASSETS.wordle,
  pips: NYT_GAMES_DRAWER_ICON_ASSETS.pips,
  strands: NYT_GAMES_DRAWER_ICON_ASSETS.strands,
  "letter-boxed": NYT_GAMES_DRAWER_ICON_ASSETS.letterBoxed,
  tiles: NYT_GAMES_DRAWER_ICON_ASSETS.tiles,
  sudoku: NYT_GAMES_DRAWER_ICON_ASSETS.sudoku,
} as const;

export const NYT_GAMES_SOURCE_COMPONENTS: readonly NYTGamesSourceComponentSpec[] =
  INVENTORY.data.sourceComponents ?? [];

export const NYT_GAMES_SOURCE_COMPONENT_GROUPS = [
  {
    title: "Foundation Inputs",
    description: "Playbook palette, spacing, and foundation-game SCSS inputs recovered from the screenshot-backed source tree.",
    components: NYT_GAMES_SOURCE_COMPONENTS.filter((component) => component.group === "foundation"),
  },
  {
    title: "Hub Components",
    description: "Hub modules from the screenshot-backed xwords source tree cross-linked to the current NYT Games docs surface.",
    components: NYT_GAMES_SOURCE_COMPONENTS.filter((component) => component.group === "hub"),
  },
] as const;

export const NYT_GAMES_SOURCE_COMPONENT_DATA = {
  canonicalUrl: INVENTORY.data.sourceBundle.canonicalUrl,
  monthlyBonus: {
    sectionTitle: "Monthly Bonus",
    href: "/crosswords/game/bonus/2026/03",
    printHref: "/svc/crosswords/v2/puzzle/23469.pdf",
    title: "Get Real!",
    date: "Mar. 2026",
    byline: "By CHRISTINA IVERSON AND GABBY WINDEY",
    editor: "Edited by CHRISTINA IVERSON",
    progressAsset: withDisplay(NYT_GAMES_PROGRESS_ASSETS.states[0], {
      slot: "monthly-bonus-progress",
      desktop: { width: 48, height: 48, objectFit: "contain" },
    }),
    printAsset: NYT_GAMES_PRINT_ASSETS.default,
    ribbonText: "Play",
  },
  recentlyTabbed: {
    archiveHref: "/crosswords/archive",
    mobileTitle: "Last 7 Days",
    desktopTabs: ["Last 7 Days", "In Progress"] as const,
    items: [
      {
        id: "sunday",
        mobileLabel: "Sunday",
        desktopLabel: "Sun",
        href: "/crosswords/game/daily/2026/03/29",
        printHref: "/svc/crosswords/v2/puzzle/print/Mar2926.pdf",
        date: "Mar. 29",
        progressAsset: withDisplay(NYT_GAMES_PROGRESS_ASSETS.states[0], {
          slot: "archive-thumb-progress",
          desktop: { width: 55, height: 55, objectFit: "contain" },
          mobile: { width: 55, height: 55, objectFit: "contain" },
        }),
      },
      {
        id: "saturday",
        mobileLabel: "Saturday",
        desktopLabel: "Sat",
        href: "/crosswords/game/daily/2026/03/28",
        printHref: "/svc/crosswords/v2/puzzle/print/Mar2826.pdf",
        date: "28",
        progressAsset: withDisplay(NYT_GAMES_PROGRESS_ASSETS.states[0], {
          slot: "archive-thumb-progress",
          desktop: { width: 55, height: 55, objectFit: "contain" },
          mobile: { width: 55, height: 55, objectFit: "contain" },
        }),
      },
      {
        id: "friday",
        mobileLabel: "Friday",
        desktopLabel: "Fri",
        href: "/crosswords/game/daily/2026/03/27",
        printHref: "/svc/crosswords/v2/puzzle/print/Mar2726.pdf",
        date: "27",
        progressAsset: withDisplay(NYT_GAMES_PROGRESS_ASSETS.states[0], {
          slot: "archive-thumb-progress",
          desktop: { width: 55, height: 55, objectFit: "contain" },
          mobile: { width: 55, height: 55, objectFit: "contain" },
        }),
      },
      {
        id: "thursday",
        mobileLabel: "Thursday",
        desktopLabel: "Thu",
        href: "/crosswords/game/daily/2026/03/26",
        printHref: "/svc/crosswords/v2/puzzle/print/Mar2626.pdf",
        date: "26",
        progressAsset: withDisplay(NYT_GAMES_PROGRESS_ASSETS.states[0], {
          slot: "archive-thumb-progress",
          desktop: { width: 55, height: 55, objectFit: "contain" },
          mobile: { width: 55, height: 55, objectFit: "contain" },
        }),
      },
      {
        id: "wednesday",
        mobileLabel: "Wednesday",
        desktopLabel: "Wed",
        href: "/crosswords/game/daily/2026/03/25",
        printHref: "/svc/crosswords/v2/puzzle/print/Mar2526.pdf",
        date: "25",
        progressAsset: withDisplay(NYT_GAMES_PROGRESS_ASSETS.states[0], {
          slot: "archive-thumb-progress",
          desktop: { width: 55, height: 55, objectFit: "contain" },
          mobile: { width: 55, height: 55, objectFit: "contain" },
        }),
      },
      {
        id: "tuesday",
        mobileLabel: "Tuesday",
        desktopLabel: "Tue",
        href: "/crosswords/game/daily/2026/03/24",
        printHref: "/svc/crosswords/v2/puzzle/print/Mar2426.pdf",
        date: "24",
        progressAsset: withDisplay(NYT_GAMES_PROGRESS_ASSETS.states[0], {
          slot: "archive-thumb-progress",
          desktop: { width: 55, height: 55, objectFit: "contain" },
          mobile: { width: 55, height: 55, objectFit: "contain" },
        }),
      },
      {
        id: "monday",
        mobileLabel: "Monday",
        desktopLabel: "Mon",
        href: "/crosswords/game/daily/2026/03/23",
        printHref: "/svc/crosswords/v2/puzzle/print/Mar2326.pdf",
        date: "23",
        progressAsset: withDisplay(NYT_GAMES_PROGRESS_ASSETS.states[0], {
          slot: "archive-thumb-progress",
          desktop: { width: 55, height: 55, objectFit: "contain" },
          mobile: { width: 55, height: 55, objectFit: "contain" },
        }),
      },
    ],
    printAsset: withDisplay(NYT_GAMES_PRINT_ASSETS.default, {
      slot: "archive-thumb-print",
      desktop: { width: 16, height: 16, objectFit: "contain" },
    }),
  },
  featuredArticle: {
    sectionTitle: "Featured Article",
    href: "https://www.nytimes.com/guides/crosswords/how-to-solve-a-crossword-puzzle",
    title: "How to Solve The New York Times Crossword",
    kicker: "A Guide by DEB AMLEN",
    description:
      "With patience and practice anyone can learn to solve crosswords.",
    linkText: "Read More",
    image: withDisplay(NYT_GAMES_PROMO_ASSETS.featuredArticle, {
      slot: "featured-article-illustration",
      desktop: {
        width: 290,
        height: 260,
        objectFit: "cover",
        backgroundSize: "cover",
        backgroundPosition: "left",
      },
      mobile: {
        width: 320,
        height: 260,
        objectFit: "cover",
        backgroundSize: "cover",
        backgroundPosition: "left",
      },
    }),
  },
  crossplayCta: {
    title: "Crossplay",
    description: "Nav-drawer hero card used for the geo-gated Crossplay install CTA.",
    href: "/games/crossplay",
    linkText: "Download app",
    banner: NYT_GAMES_PROMO_ASSETS.crossplayBanner,
    primaryIcon: NYT_GAMES_CTA_ASSETS.crossplayAppIcon,
    inlineStrip: NYT_GAMES_CTA_ASSETS.inlineGamesAll,
    alternateIcon: NYT_GAMES_CTA_ASSETS.pipsAppIcon,
    hamburgerIcons: [
      NYT_GAMES_PAGE_ICON_ASSETS.wordle,
      NYT_GAMES_PAGE_ICON_ASSETS.connections,
      NYT_GAMES_PAGE_ICON_ASSETS.crossword,
      NYT_GAMES_PAGE_ICON_ASSETS.spellingBee,
      NYT_GAMES_PAGE_ICON_ASSETS.mini,
      NYT_GAMES_PAGE_ICON_ASSETS.midi,
    ],
  },
  shellMounts: {
    header: [
      "banner-portal",
      "js-mobile-toolbar",
      "bar1-portal",
      "nav-variant-experiment",
      "cywp-help-portal",
      "js-nav-drawer",
    ],
    content: ["hub-root", "hub-modal", "ad-bottom", "after-bottom"],
    footer: ["js-feedback-link", "js-portal-footer-legal"],
  },
} as const;
