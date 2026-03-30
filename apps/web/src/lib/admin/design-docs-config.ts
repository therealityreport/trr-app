import { buildDesignDocsPath } from "./admin-route-paths.ts";

export type DesignDocSectionId =
  | "overview"
  | "app-styles"
  | "gpt54-delightful-frontends"
  | "heroes"
  | "typography"
  | "fonts-showcase"
  | "colors"
  | "shapes"
  | "icons"
  | "illustrations"
  | "galleries"
  | "carousels"
  | "charts"
  | "maps"
  | "cards"
  | "tables-data"
  | "forms"
  | "navigation"
  | "interactive-elements"
  | "animations"
  | "components"
  | "layout"
  | "grids-deep"
  | "responsive"
  | "newsletters"
  | "patterns"
  | "brand-nyt"
  | "brand-nyt-games"
  | "brand-nyt-magazine"
  | "brand-wirecutter"
  | "brand-the-athletic"
  | "brand-nyt-opinion"
  | "brand-nyt-cooking"
  | "brand-nyt-style"
  | "brand-nyt-store"
  | "brand-nymag"
  | "athletic-articles"
  | "nyt-articles"
  | "nyt-tech-stack"
  | "nyt-games-articles";

export type DesignDocSection = {
  id: DesignDocSectionId;
  label: string;
  description: string;
};

export const DESIGN_DOC_SECTIONS: readonly DesignDocSection[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Design philosophy and system summary",
  },
  {
    id: "app-styles",
    label: "App Styles",
    description:
      "Design variants for editorial, data/analytics, games, lifestyle, and interactive contexts",
  },
  {
    id: "gpt54-delightful-frontends",
    label: "GPT-5.4 Delightful Frontends",
    description:
      "Prompt structure, composition rules, landing-vs-app guidance, and verification workflow for TRR frontend work",
  },
  {
    id: "heroes",
    label: "Heroes",
    description: "Hero section patterns — full-bleed, split, centered, dark immersive, editorial masthead",
  },
  {
    id: "typography",
    label: "Typography",
    description: "Cheltenham, Gloucester, Franklin Gothic, Hamburg Serial, Stymie, Chomsky",
  },
  {
    id: "fonts-showcase",
    label: "Fonts Showcase",
    description: "Full specimen pages with every weight, size, and pairing across all TRR typefaces",
  },
  {
    id: "colors",
    label: "Colors",
    description: "Ink/paper scale, data viz palette, TRR 45-color brand palette",
  },
  {
    id: "shapes",
    label: "Shapes & Radius",
    description: "Border radius scale, editorial vs app context, shadow system",
  },
  {
    id: "icons",
    label: "Icons",
    description: "Icon style guide — sizes, stroke weights, usage rules, inline SVG patterns",
  },
  {
    id: "illustrations",
    label: "Illustrations",
    description: "Editorial illustration style, graphic patterns, decorative elements",
  },
  {
    id: "galleries",
    label: "Galleries",
    description: "Image galleries, lightboxes, photo grids, editorial image treatments",
  },
  {
    id: "carousels",
    label: "Carousels",
    description: "Content sliders, hero carousels, horizontal scroll patterns",
  },
  {
    id: "charts",
    label: "Charts & Graphs",
    description: "Bar, line, area, scatter, donut, slope, sparkline, lollipop, waterfall, bump",
  },
  {
    id: "maps",
    label: "Maps",
    description: "Point maps, choropleth tiles, dark satellite maps",
  },
  {
    id: "cards",
    label: "Card Formats",
    description: "Social cards, data-dark, opinion, breaking, badge system",
  },
  {
    id: "tables-data",
    label: "Tables & Data",
    description: "Data table patterns, sorting headers, filtering, pagination, inline sparklines",
  },
  {
    id: "forms",
    label: "Forms",
    description: "Form patterns, validation states, input types, search bars, toggles",
  },
  {
    id: "navigation",
    label: "Navigation",
    description: "Nav patterns — breadcrumbs, tabs, pagination, sticky headers, side menus",
  },
  {
    id: "interactive-elements",
    label: "Interactive Elements",
    description: "Hover states, tooltips, modals, dropdowns, accordions, popovers",
  },
  {
    id: "animations",
    label: "Animations",
    description: "Motion design — easing curves, scroll triggers, transitions, micro-interactions",
  },
  {
    id: "components",
    label: "Components",
    description: "Dividers, spacing scale, content width tiers",
  },
  {
    id: "layout",
    label: "Layout & Grid",
    description: "Grid demos, scrollytelling, design principles",
  },
  {
    id: "grids-deep",
    label: "Advanced Grids",
    description: "Masonry, asymmetric, magazine-style, dashboard, and editorial grid patterns",
  },
  {
    id: "responsive",
    label: "Responsive",
    description: "Breakpoints, mobile vs desktop wireframes, typography scaling",
  },
  {
    id: "newsletters",
    label: "Newsletters",
    description: "Newsletter cards, discovery grid, email patterns",
  },
  {
    id: "patterns",
    label: "Patterns",
    description: "Scrollytelling, annotation, design principles",
  },
  {
    id: "brand-nyt",
    label: "New York Times",
    description: "NYT master brand — typography, color system, layout tokens, architecture, and production stack",
  },
  {
    id: "brand-nyt-games",
    label: "NYT Games",
    description: "Wordle, Connections, Strands — playful type, bouncy interactions, rounded UI",
  },
  {
    id: "brand-nyt-magazine",
    label: "NYT Magazine",
    description: "Bold editorial layouts, dramatic photography, experimental typography",
  },
  {
    id: "brand-wirecutter",
    label: "Wirecutter",
    description: "Product-focused, trust-centric UI, comparison cards, rating systems",
  },
  {
    id: "brand-the-athletic",
    label: "The Athletic",
    description: "Dark sports-media UI, dense stat tables, live game components",
  },
  {
    id: "brand-nyt-opinion",
    label: "NYT Opinion",
    description: "Editorial illustration, op-ed layouts, pull quotes, author bylines",
  },
  {
    id: "brand-nyt-cooking",
    label: "NYT Cooking",
    description: "Warm palette, recipe cards, ingredient lists, step-by-step layouts",
  },
  {
    id: "brand-nyt-style",
    label: "NYT Style",
    description: "Fashion editorial, photo-forward grids, trend layouts, red carpet galleries",
  },
  {
    id: "brand-nyt-store",
    label: "NYT Store",
    description: "E-commerce patterns, product cards, category navigation, cart UI",
  },
  {
    id: "brand-nymag",
    label: "New York Mag",
    description: "Classic editorial magazine — Egyptienne/Miller serif system, 6 verticals, inline CSS architecture",
  },
  {
    id: "athletic-articles",
    label: "Athletic Articles",
    description: "Article-level design breakdowns — charts, layouts, typography, and interactive patterns from The Athletic",
  },
  {
    id: "nyt-articles",
    label: "NYT Articles",
    description: "Article-level design breakdowns — charts, layouts, typography, and interactive patterns from NYT articles",
  },
  {
    id: "nyt-tech-stack",
    label: "NYT Tech Stack",
    description: "Asset inventory — stylesheets, scripts, sitemaps, Birdkit framework, and the full production stack",
  },
  {
    id: "nyt-games-articles",
    label: "Games",
    description: "Per-game design breakdowns — Wordle, Connections, Strands, and more, each with their own page",
  },
] as const;

const VALID_IDS = new Set<string>(DESIGN_DOC_SECTIONS.map((s) => s.id));

export function isDesignDocSectionId(
  value: string | undefined,
): value is DesignDocSectionId {
  return typeof value === "string" && VALID_IDS.has(value);
}

export function resolveDesignDocSection(
  sectionId: DesignDocSectionId,
): DesignDocSection {
  const section = DESIGN_DOC_SECTIONS.find((s) => s.id === sectionId);
  if (!section) {
    return DESIGN_DOC_SECTIONS[0];
  }
  return section;
}

export const DEFAULT_DESIGN_DOC_SECTION: DesignDocSectionId = "overview";

/* Brand sub-section anchors — used for sidebar nested links */
export interface BrandSubSection {
  anchor: string;
  label: string;
  /** When set, sub-link navigates to this route instead of an anchor */
  href?: string;
}

export const BRAND_SUB_SECTIONS: readonly BrandSubSection[] = [
  { anchor: "typography", label: "Typography" },
  { anchor: "colors", label: "Colors" },
  { anchor: "components", label: "Components" },
  { anchor: "ai-illustrations", label: "AI Illustrations" },
  { anchor: "layout", label: "Layout" },
  { anchor: "shapes", label: "Shapes & Radius" },
  { anchor: "resources", label: "Resources" },
] as const;

/* NYT Games expanded sub-sections — shared design tokens and systems */
const NYT_GAMES_SUB_SECTIONS: readonly BrandSubSection[] = [
  { anchor: "typography", label: "Typography" },
  { anchor: "colors", label: "Colors" },
  { anchor: "components", label: "Components" },
  { anchor: "hub-components", label: "Hub Components" },
  { anchor: "layout", label: "Layout" },
  { anchor: "shapes", label: "Shapes & Radius" },
  { anchor: "tech-stack", label: "Tech Stack" },
  { anchor: "ab-tests", label: "A/B Tests" },
] as const;

/* NYT master brand sub-sections — each tab is its own page */
const NYT_BRAND_SUB_SECTIONS: readonly BrandSubSection[] = [
  { anchor: "typography", label: "Typography", href: buildDesignDocsPath("brand-nyt/typography") },
  { anchor: "colors", label: "Colors", href: buildDesignDocsPath("brand-nyt/colors") },
  { anchor: "layout", label: "Layout & Tokens", href: buildDesignDocsPath("brand-nyt/layout") },
  { anchor: "architecture", label: "Architecture", href: buildDesignDocsPath("brand-nyt/architecture") },
  { anchor: "charts", label: "Charts & Graphs", href: buildDesignDocsPath("brand-nyt/charts") },
  { anchor: "components", label: "Components", href: buildDesignDocsPath("brand-nyt/components") },
  { anchor: "resources", label: "Resources", href: buildDesignDocsPath("brand-nyt/resources") },
  { anchor: "tech-stack", label: "Tech Stack", href: buildDesignDocsPath("nyt-tech-stack") },
  { anchor: "pages", label: "Pages", href: buildDesignDocsPath("nyt-articles") },
] as const;

/* The Athletic expanded sub-sections — each tab is its own page */
const ATHLETIC_BRAND_SUB_SECTIONS: readonly BrandSubSection[] = [
  { anchor: "typography", label: "Typography", href: buildDesignDocsPath("brand-the-athletic/typography") },
  { anchor: "colors", label: "Colors", href: buildDesignDocsPath("brand-the-athletic/colors") },
  { anchor: "components", label: "Components", href: buildDesignDocsPath("brand-the-athletic/components") },
  { anchor: "icons", label: "Icons", href: buildDesignDocsPath("brand-the-athletic/icons") },
  { anchor: "layouts", label: "Layouts", href: buildDesignDocsPath("brand-the-athletic/layouts") },
  { anchor: "layout", label: "Layout", href: buildDesignDocsPath("brand-the-athletic/layout") },
  { anchor: "shapes", label: "Shapes & Radius", href: buildDesignDocsPath("brand-the-athletic/shapes") },
  { anchor: "resources", label: "Resources", href: buildDesignDocsPath("brand-the-athletic/resources") },
  { anchor: "pages", label: "Pages", href: buildDesignDocsPath("athletic-articles") },
] as const;

/* New York Mag expanded sub-sections — each tab is its own page */
const NYMAG_BRAND_SUB_SECTIONS: readonly BrandSubSection[] = [
  { anchor: "typography", label: "Typography", href: buildDesignDocsPath("brand-nymag/typography") },
  { anchor: "colors", label: "Colors", href: buildDesignDocsPath("brand-nymag/colors") },
  { anchor: "components", label: "Components", href: buildDesignDocsPath("brand-nymag/components") },
  { anchor: "layout", label: "Layout", href: buildDesignDocsPath("brand-nymag/layout") },
  { anchor: "shapes", label: "Shapes & Radius", href: buildDesignDocsPath("brand-nymag/shapes") },
  { anchor: "resources", label: "Resources", href: buildDesignDocsPath("brand-nymag/resources") },
] as const;

/** Returns per-brand sub-section anchors — NYT and NYT Games get expanded lists, others get generic */
export function getBrandSubSections(
  sectionId: DesignDocSectionId,
): readonly BrandSubSection[] {
  if (sectionId === "brand-nyt") return NYT_BRAND_SUB_SECTIONS;
  if (sectionId === "brand-nyt-games") return NYT_GAMES_SUB_SECTIONS;
  if (sectionId === "brand-the-athletic") return ATHLETIC_BRAND_SUB_SECTIONS;
  if (sectionId === "brand-nymag") return NYMAG_BRAND_SUB_SECTIONS;
  return BRAND_SUB_SECTIONS;
}

const BRAND_SECTION_IDS = new Set<DesignDocSectionId>([
  "brand-nyt",
  "brand-nyt-games",
  "brand-nyt-magazine",
  "brand-wirecutter",
  "brand-the-athletic",
  "brand-nyt-opinion",
  "brand-nyt-cooking",
  "brand-nyt-style",
  "brand-nyt-store",
  "brand-nymag",
]);

export function isBrandSection(id: DesignDocSectionId): boolean {
  return BRAND_SECTION_IDS.has(id);
}

export type DesignDocGroup = {
  label: string;
  sectionIds: readonly DesignDocSectionId[];
};

export const DESIGN_DOC_GROUPS: readonly DesignDocGroup[] = [
  {
    label: "Getting Started",
    sectionIds: ["overview", "app-styles", "gpt54-delightful-frontends"],
  },
  {
    label: "Foundation",
    sectionIds: ["heroes", "typography", "fonts-showcase", "colors", "shapes"],
  },
  {
    label: "Graphics & Media",
    sectionIds: ["icons", "illustrations", "galleries", "carousels"],
  },
  {
    label: "Data Visualization",
    sectionIds: ["charts", "maps", "tables-data"],
  },
  {
    label: "UI Components",
    sectionIds: ["cards", "forms", "navigation", "interactive-elements", "animations"],
  },
  {
    label: "Layout & Structure",
    sectionIds: ["components", "layout", "grids-deep", "responsive"],
  },
  {
    label: "Communication",
    sectionIds: ["newsletters", "patterns"],
  },
  {
    label: "Brands",
    sectionIds: [
      "brand-nyt",
      "brand-nyt-games",
      "nyt-games-articles",
      "brand-nyt-magazine",
      "brand-wirecutter",
      "brand-the-athletic",
      "brand-nyt-opinion",
      "brand-nyt-cooking",
      "brand-nyt-style",
      "brand-nyt-store",
      "brand-nymag",
    ],
  },
] as const;

/* ── Parent-section mapping for sidebar expansion ── */
const SECTION_PARENT_MAP: Partial<Record<DesignDocSectionId, DesignDocSectionId>> = {
  "nyt-tech-stack": "brand-nyt",
  "nyt-articles": "brand-nyt",
  "nyt-games-articles": "brand-nyt-games",
  "athletic-articles": "brand-the-athletic",
};

const BRAND_SCOPE_CLASS_MAP: Partial<Record<DesignDocSectionId, string>> = {
  "brand-nyt": "brand-scope-nyt",
  "brand-nyt-games": "brand-scope-nyt-games",
  "brand-nyt-magazine": "brand-scope-nyt-magazine",
  "brand-wirecutter": "brand-scope-wirecutter",
  "brand-the-athletic": "brand-scope-athletic",
  "brand-nyt-opinion": "brand-scope-nyt-opinion",
  "brand-nyt-cooking": "brand-scope-nyt-cooking",
  "brand-nyt-style": "brand-scope-nyt-style",
  "brand-nyt-store": "brand-scope-nyt-store",
  "brand-nymag": "brand-scope-nymag",
};

/** Returns the conceptual parent section for sidebar expansion (e.g. nyt-tech-stack → brand-nyt) */
export function getParentSection(id: DesignDocSectionId): DesignDocSectionId | null {
  return SECTION_PARENT_MAP[id] ?? null;
}

export function getBrandScopeClass(
  sectionId: DesignDocSectionId,
): string | null {
  const brandSectionId = isBrandSection(sectionId)
    ? sectionId
    : getParentSection(sectionId);

  if (!brandSectionId) {
    return null;
  }

  return BRAND_SCOPE_CLASS_MAP[brandSectionId] ?? null;
}

/* ── Content Block Types ─────────────────────────── */

export type Ai2htmlArtboard = {
  url: string;
  width: number;
  height: number;
};

export type ContentBlock =
  | { type: "header" }
  | { type: "byline" }
  | {
      type: "ai2html";
      title: string;
      note: string;
      credit: string;
      artboards: { mobile: Ai2htmlArtboard; desktop: Ai2htmlArtboard };
    }
  | { type: "subhed"; text: string }
  | {
      type: "birdkit-chart";
      id: string;
      title: string;
      source: string;
    }
  | { type: "birdkit-table"; title: string; route: string }
  | { type: "birdkit-table-interactive"; title: string; route: string }
  | { type: "datawrapper-table"; id: string; title: string; note: string; source: string; url: string }
  | { type: "showcase-link"; title: string; excerpt: string; href: string; imageUrl?: string }
  | { type: "twitter-embed"; author: string; handle: string; text: string; date: string; url: string }
  | { type: "ad-container"; position: string }
  | { type: "puzzle-entry-point"; game: string; title: string; subtitle: string }
  | { type: "featured-image"; url?: string; caption?: string; credit: string }
  | { type: "storyline"; title: string; links: readonly { label: string; href: string }[] }
  | { type: "author-bio" }
  | { type: "related-link"; title: string; url: string; imageUrl: string; summary: string }
  | { type: "quote"; section: string; badge: string; badgeColor: string; text?: string; citation?: string }
  | { type: "datawrapper-chart"; id: string; title: string; chartType: string; url: string; source?: string; note?: string }
  | { type: "birdkit-countdown"; label: string; daysLeft: number }
  | { type: "birdkit-animated-headline"; variants: readonly string[] }
  | { type: "birdkit-state-selector"; stateCount: number; defaultState: string }
  | { type: "birdkit-calendar"; months: readonly string[]; categories: readonly { key: string; label: string; color: string }[] }
  | { type: "birdkit-state-data-section"; title: string }
  | { type: "correction"; text: string; date: string };

export const CONTENT_BLOCK_TYPE_IDS = [
  "header",
  "byline",
  "ai2html",
  "subhed",
  "birdkit-chart",
  "birdkit-table",
  "birdkit-table-interactive",
  "datawrapper-table",
  "showcase-link",
  "twitter-embed",
  "ad-container",
  "puzzle-entry-point",
  "featured-image",
  "storyline",
  "author-bio",
  "related-link",
  "quote",
  "datawrapper-chart",
  "birdkit-countdown",
  "birdkit-animated-headline",
  "birdkit-state-selector",
  "birdkit-calendar",
  "birdkit-state-data-section",
  "correction",
] as const satisfies readonly ContentBlock["type"][];

/* ── Article References ──────────────────────────── */
export const ARTICLES = [
  {
    id: "trump-economy-year-1",
    title: "Trump Said He'd Unleash the Economy in Year 1. Here's How He Did.",
    url: "https://www.nytimes.com/interactive/2026/01/19/business/economy/trump-economy.html",
    authors: ["Ben Casselman", "Jacqueline Gu", "Rebecca Lieberman"],
    date: "2026-01-18",
    section: "Business/Economy",
    type: "interactive" as const,
    description: "As a candidate, President Trump pledged to boost the stock market, bring back manufacturing jobs and improve other elements of the economy. A year after his return to office, his record is mixed.",
    ogImage: "https://static01.nyt.com/images/2026/01/16/business/2026-01-08-econ-year-index/2026-01-08-econ-year-index-facebookJumbo-v10.png",
    tags: ["Donald Trump", "US Economy", "Price", "International trade", "Oil and Gasoline", "Electric power", "Tariff", "Food", "Manufacturing", "Stocks & Bonds", "Inflation", "Jobs", "vis-design", "Cars"],
    graphicsCount: 10,
    figuresCount: 30,
    tools: {
      topper: "ai2html v0.121.1",
      charts: "Datawrapper (8 embeds)",
      framework: "Svelte (SvelteKit)",
      hosting: "static01.nytimes.com/newsgraphics/",
    },
    chartTypes: [
      { type: "report-card", tool: "ai2html", topic: "Promise tracker topper" },
      { type: "line-chart", tool: "datawrapper", topic: "Food prices (CPI)", url: "https://datawrapper.dwcdn.net/2Iq0I/6/" },
      { type: "line-chart", tool: "datawrapper", topic: "Gas prices", url: "https://datawrapper.dwcdn.net/JRwRC/6/" },
      { type: "line-chart", tool: "datawrapper", topic: "Electricity prices", url: "https://datawrapper.dwcdn.net/tKBPt/5/" },
      { type: "bar-chart", tool: "datawrapper", topic: "Auto industry jobs", url: "https://datawrapper.dwcdn.net/WMpGc/6/" },
      { type: "bar-chart", tool: "datawrapper", topic: "Manufacturing jobs", url: "https://datawrapper.dwcdn.net/Y9bME/5/" },
      { type: "line-chart", tool: "datawrapper", topic: "S&P 500 stock market", url: "https://datawrapper.dwcdn.net/HwUbK/3/" },
      { type: "bar-chart", tool: "datawrapper", topic: "Tariff revenue", url: "https://datawrapper.dwcdn.net/FPRyD/5/" },
      { type: "stacked-area", tool: "datawrapper", topic: "Trade deficit by country", url: "https://datawrapper.dwcdn.net/UosFj/4/" },
    ],
    quoteSections: [
      { section: "Food Prices", badge: "HASN'T HAPPENED", badgeColor: "#bc261a" },
      { section: "Gas Prices", badge: "SOME PROGRESS", badgeColor: "#c49012" },
      { section: "Electricity Prices", badge: "HASN'T HAPPENED", badgeColor: "#bc261a" },
      { section: "The Auto Industry", badge: "HASN'T HAPPENED", badgeColor: "#bc261a" },
      { section: "Manufacturing Jobs", badge: "HASN'T HAPPENED", badgeColor: "#bc261a" },
      { section: "Stock Market", badge: "SO FAR, SO GOOD", badgeColor: "#53a451" },
      { section: "Tariff revenue", badge: "SOME PROGRESS", badgeColor: "#c49012" },
      { section: "Trade deficit", badge: "SOME PROGRESS", badgeColor: "#c49012" },
    ],
    /** Fonts used on this page — names match the actual @font-face declarations in production CSS */
    fonts: [
      {
        name: "nyt-cheltenham",
        cssVar: "--g-chelt",
        fullStack: 'nyt-cheltenham, cheltenham-fallback-georgia, cheltenham-fallback-noto, georgia, "times new roman", times, serif',
        weights: [300, 500, 600, 700, 800],
        role: "Display headlines + section headings — serif editorial typeface",
        usedIn: [
          "h1.Headline (css-88wicj): 40px/700/46px font-style:italic text-align:center #121212",
          "p.Summary (css-79rysd): 23px/300/30px font-style:normal #363636",
          "h2.SectionHeading (css-11zi5nh): 26px/600/30px #121212 (desktop: 28px/34px)",
          "h2.ChartTitle (css-4hk76s): 21px/600/24px #121212",
          "h2.QuoteText (quote container): 25px/300/31.25px font-style:italic #363636",
          "span.RecircTitle (css-d6eweq): 17px/500/21px #363636",
        ],
      },
      {
        name: "nyt-cheltenham-cond",
        cssVar: "--g-chelt-cond",
        fullStack: 'nyt-cheltenham-cond, nyt-cheltenham, cheltenham-fallback-georgia, cheltenham-fallback-noto, georgia, "times new roman", times, serif',
        weights: [700],
        role: "Condensed display — tight headlines in ai2html topper",
        usedIn: [
          "div.ai2html_ReportCardLabel: 16px/700/- #121212 (report card row labels)",
        ],
      },
      {
        name: "nyt-franklin",
        cssVar: "--g-franklin",
        fullStack: '"nyt-franklin", arial, helvetica, sans-serif',
        weights: [300, 400, 500, 600, 700, 800],
        role: "Primary sans-serif — UI chrome, nav, labels, badges, captions, chart text",
        usedIn: [
          "p.Byline (css-4anu6l): 15px/700/20px #363636",
          "time.Timestamp (css-1ubbotv): 13px/500/18px #363636",
          "span.SectionLabel (css-1ev7j75): 10px/500/10px letter-spacing:0.05rem uppercase #727272",
          "div.PromiseBadge: 12px/600/- letter-spacing:0.02em uppercase #FFFFFF bg:#bc261a|#c49012|#53a451",
          "p.QuoteCitation: 14px/400/- uppercase #363636",
          "div.SubhedLabel: 13px/700/- uppercase letter-spacing:0.02em #121212 border-top:2px solid #121212",
          "p.ChartSource: 12px/300/- #727272",
          "p.ChartNote (italic): 12px/300/- font-style:italic #727272",
          "div.ai2html_BadgeText: 9px/600/- letter-spacing:0.05em uppercase #FFFFFF",
          "div.ai2html_RowLabel: 14px/300/- #121212",
          "p.TopicTag: 11px/500/- #363636 bg:#f4f4f4 border-radius:3px padding:4px 8px",
          "button.ShareButton (css-10d8k1f): 12px/500/15px uppercase #121212",
          "p.ExtendedBylineCredit: 13px/500/18px #363636",
          "span.BarOneNavLink (css-1pd1msn): 14px/400/20px #121212",
        ],
      },
      {
        name: "nyt-imperial",
        cssVar: "--g-imperial",
        fullStack: '"nyt-imperial", georgia, "times new roman", times, serif',
        weights: [400, 500],
        role: "Article body text — primary reading font for long-form journalism",
        usedIn: [
          "p.BodyText (css-ac37hb): 20px/500/25px #363636 (desktop: 20px/30px)",
          "p.ExtendedByline (css-1n7yjps): 15px/500/20px #363636",
          "span.ImageCaption (css-jagbsj): 13px/400/15px #727272 (desktop: 13px/16px)",
          "span.ImageCredit (css-jagbsj): 12px/400/- #727272",
        ],
      },
    ],
    /** Brand-specific font context — which NYT brand fonts appear on this page */
    brandFonts: {
      editorial: ["nyt-cheltenham", "nyt-cheltenham-cond", "nyt-imperial"],
      graphics: ["nyt-franklin"],
      games: ["nyt-karnakcondensed", "nyt-karnak", "nyt-stymie", "nyt-franklin"],
    },
    /** Color palette — status badges, Datawrapper chart accents, and editorial tokens */
    colors: {
      /** Promise tracker status badge colors (3-state system) */
      statusBadges: {
        hasntHappened: "#bc261a",
        someProgress: "#c49012",
        soFarSoGood: "#53a451",
      },
      /** Datawrapper chart line/bar colors used in this article's 8 embeds */
      chartPalette: [
        { name: "CPI Red", hex: "#bf1d02" },
        { name: "Gold accent", hex: "#fdba58" },
        { name: "Orange", hex: "#fc9627" },
        { name: "Olive (S&P)", hex: "#8b8b00" },
        { name: "Reference gray", hex: "#CCCCCC" },
      ],
      /** Editorial tokens (shared across NYT pages) */
      editorial: {
        primary: "#121212",
        secondary: "#363636",
        faint: "#727272",
        nytBlue: "#326891",
        background: "#FFFFFF",
      },
    },
    /** Birdkit framework architecture — NYT's internal interactive graphics platform */
    architecture: {
      framework: "Birdkit (Svelte/SvelteKit)",
      projectId: "bk-OsFcy_mg4zMq9g",
      hydrationId: "0b6532a460caa57a",
      hosting: "static01.nytimes.com/newsgraphics/",
      hierarchy: [
        "figure.g-wrapper (outer wrapper, margin-block, text-wrap: balance)",
        "  div.g-block.g-block-margin.g-margin-inline (margin: 20px gutters)",
        "    div.g-block-width.g-max-width-body (max-width: 600px)",
        "      div.g-wrapper_main-content.g-overflow-visible (overflow for tooltips)",
        "        div.g-wrapper_main_content_slot (slot)",
        "          div.g-media[role=img][aria-label] (accessible chart)",
        "            iframe[src=datawrapper] (chart embed)",
        "  div.g-block.g-block-margin (SEPARATE credit block)",
        "    p.g-wrapper_meta (Note + Source + Credit spans)",
      ],
      layoutTokens: {
        bodyWidth: "600px (--g-width-body)",
        wideWidth: "1050px (--g-width-wide)",
        marginInline: "20px (--g-margin-left/right)",
        marginBlock: "25px (--g-margin-top/bottom)",
        bodyMarginBottom: "12.5px paragraph spacing",
        bodyFontSize: "1.25rem (20px)",
        bodyLineHeight: "1.5",
        bodyFontWeight: "500",
        bodyColor: "#363636 (--g-color-copy)",
      },
      cssFiles: [
        "/_app/immutable/assets/2.DkPSoQwJ.css (theme)",
        "/_app/immutable/assets/index.CyB6tk6K.css (components)",
      ],
      datawrapperTheme: {
        cssFile: "d3-lines.nyt.a06db3a7.css",
        gridColor: "#e6e6e6 (1px)",
        baselineColor: "#333333 (1px)",
        textFont: "nyt-franklin, sans-serif",
        textSize: "14px",
        textWeight: "400",
        textColor: "#333333",
        primaryLabelWeight: "700",
        primaryLabelColor: "#121212",
        secondaryLabelWeight: "400",
        secondaryLabelColor: "#a8a8a8",
        secondaryLabelHalo: "white text-shadow (25 values)",
        hoverCrosshair: "stroke-dasharray: 3px 2px; opacity: 0.3; color: series color",
        hoverTooltipFont: "110% size, 700 weight",
      },
      contentBlocks: [
        "header (headline, byline, sharetools)",
        "graphic (ai2html with responsive artboards)",
        "extendedbyline (author, producers, date)",
        "text (article paragraphs in nyt-imperial)",
        "subhed (section headings like 'Food Prices')",
        "quote (callout box with citation, quote text, status badge)",
        "embed (Datawrapper iframe with source credit)",
        "ad (mid-article ad slots)",
      ],
      publicAssets: {
        reportCard: {
          mobile: { url: "https://static01.nytimes.com/newsgraphics/bk-OsFcy_mg4zMq9g/jGmausUcGMUDLInIfX31DCUYa_o/_assets/topper_onecolumn-Artboard_2.png", width: 320, desc: "Mobile report card artboard" },
          desktop: { url: "https://static01.nytimes.com/newsgraphics/bk-OsFcy_mg4zMq9g/jGmausUcGMUDLInIfX31DCUYa_o/_assets/topper_onecolumn-Artboard_3.png", width: 600, desc: "Desktop report card artboard" },
        },
        socialImages: [
          { name: "facebookJumbo", url: "https://static01.nyt.com/images/2026/01/16/business/2026-01-08-econ-year-index/2026-01-08-econ-year-index-facebookJumbo-v10.png", ratio: "1.91:1", desc: "Facebook/OG share image" },
          { name: "video16x9-3000", url: "https://static01.nyt.com/images/2026/01/16/business/2026-01-08-econ-year-index/2026-01-08-econ-year-index-videoSixteenByNine3000-v6.png", ratio: "16:9", width: 3000, desc: "Twitter card image" },
          { name: "video16x9-1600", url: "https://static01.nyt.com/images/2026/01/16/business/2026-01-08-econ-year-index/2026-01-08-econ-year-index-videoSixteenByNineJumbo1600-v9.png", ratio: "16:9", width: 1600, desc: "JSON-LD primary image" },
          { name: "google4x3", url: "https://static01.nyt.com/images/2026/01/16/business/2026-01-08-econ-year-index/2026-01-08-econ-year-index-googleFourByThree-v7.png", ratio: "4:3", width: 800, desc: "Google Discover image" },
          { name: "square3x", url: "https://static01.nyt.com/images/2026/01/16/business/2026-01-08-econ-year-index/2026-01-08-econ-year-index-mediumSquareAt3X-v8.png", ratio: "1:1", width: 1000, desc: "Square thumbnail" },
        ],
        authorHeadshot: { url: "https://static01.nyt.com/images/2018/11/09/multimedia/author-ben-casselman/author-ben-casselman-thumbLarge.png", desc: "Ben Casselman headshot" },
        datawrapperCharts: [
          { id: "2Iq0I", version: 6, topic: "Food Prices", url: "https://datawrapper.dwcdn.net/2Iq0I/6/?plain=1", height: 400 },
          { id: "JRwRC", version: 6, topic: "Gas Prices", url: "https://datawrapper.dwcdn.net/JRwRC/6/?plain=1", height: 400 },
          { id: "tKBPt", version: 5, topic: "Electricity", url: "https://datawrapper.dwcdn.net/tKBPt/5/?plain=1", height: 400 },
          { id: "WMpGc", version: 6, topic: "Auto Jobs", url: "https://datawrapper.dwcdn.net/WMpGc/6/?plain=1", height: 400 },
          { id: "Y9bME", version: 5, topic: "Manufacturing", url: "https://datawrapper.dwcdn.net/Y9bME/5/?plain=1", height: 400 },
          { id: "HwUbK", version: 3, topic: "S&P 500", url: "https://datawrapper.dwcdn.net/HwUbK/3/?plain=1", height: 400 },
          { id: "FPRyD", version: 5, topic: "Tariff Revenue", url: "https://datawrapper.dwcdn.net/FPRyD/5/?plain=1", height: 400 },
          { id: "UosFj", version: 4, topic: "Trade Deficit", url: "https://datawrapper.dwcdn.net/UosFj/4/?plain=1", height: 400 },
        ],
        datawrapperCss: {
          linesTheme: "https://datawrapper.dwcdn.net/lib/vis/d3-lines.nyt.a06db3a7.css",
          linesDark: "https://datawrapper.dwcdn.net/lib/vis/d3-lines.nyt-dark.a06db3a7.css",
          globalScript: "https://static01.nytimes.com/newsgraphics/datawrapper/scripts/global-v1.js",
        },
      },
    },
    /* Trump uses special-cased rendering (Section 4a: ai2html report card, Section 6: promise sections)
       rather than the generic contentBlocks renderer — no contentBlocks array needed */
  },
  {
    id: "online-casinos-sweepstakes-gambling",
    title: "The Online Casinos That Can Operate as Long as They Say They Aren't Actually Casinos",
    url: "https://www.nytimes.com/2025/03/23/upshot/online-casinos-sweepstakes-gambling.html",
    authors: ["Ben Blatt"],
    date: "2025-03-23",
    section: "The Upshot",
    type: "article" as const,
    description: "Policing loopholes in gambling law can be challenging, and most states have been slow to adapt.",
    ogImage: "https://static01.nyt.com/images/2025/03/21/multimedia/2025-03-21-sweeps-flowchart-index/2025-03-21-sweeps-flowchart-index-facebookJumbo.jpg",
    tags: ["Casinos", "Law and Legislation", "States (US)", "Regulation and Deregulation of Industry", "Computers and the Internet", "Slot Machines", "Addabbo, Joseph P Jr"],
    graphicsCount: 2,
    figuresCount: 0,
    tools: {
      topper: "ai2html v0.121.1",
      charts: "Birdkit/Svelte (1 custom stacked bar)",
      framework: "Svelte (SvelteKit) + vi platform (React)",
      hosting: "static01.nytimes.com/newsgraphics/",
    },
    chartTypes: [
      { type: "ai2html", tool: "ai2html v0.121.1", topic: "Sweepstakes vs Casino Flowchart" },
      { type: "stacked-bar", tool: "Birdkit/Svelte", topic: "State Tax Revenue Breakdown" },
    ],
    quoteSections: [],
    /** Fonts used on this page — names match the actual @font-face declarations in production CSS */
    fonts: [
      {
        name: "nyt-cheltenham",
        cssVar: "--g-chelt",
        fullStack: 'nyt-cheltenham, cheltenham-fallback-georgia, cheltenham-fallback-noto, georgia, "times new roman", times, serif',
        weights: [300, 500, 600, 700],
        role: "Display headlines + section headings — serif editorial typeface",
        usedIn: [
          "h1.Headline (css-88wicj): 31px/700/36px font-style:italic text-align:left #121212 (desktop: 40px/46px)",
          "p.Summary (css-79rysd): 20px/300/25px font-style:normal #363636 (desktop: 23px/30px)",
          "h2.SectionHeading (css-11zi5nh): 26px/600/30px #121212 (desktop: 28px/34px)",
          "h2.FlowchartTitle (css-4hk76s): 21px/600/24px #121212",
        ],
      },
      {
        name: "nyt-franklin",
        cssVar: "--g-franklin",
        fullStack: '"nyt-franklin", arial, helvetica, sans-serif',
        weights: [300, 400, 500, 600, 700],
        role: "Primary sans-serif — UI chrome, nav, labels, chart text, ai2html flowchart labels",
        usedIn: [
          "p.Byline (css-4anu6l): 14px/700/18px #363636 (desktop: 15px/20px)",
          "time.Timestamp (css-1ubbotv): 13px/500/18px #363636",
          "p.FlowchartLabel (g-pstyle1): 14px/700/15px #000000 (bold step labels)",
          "p.FlowchartBody (g-pstyle2): 12px/500/13px #000000 (description text)",
          "span.FlowchartLegal (g-cstyle0): 14px/700/- color:rgb(62,145,77) (legal = green)",
          "span.FlowchartIllegal (g-cstyle1): 14px/700/- color:rgb(221,80,65) (illegal = red)",
          "div.BarLabel (svelte-1ykhju6 .labeltext): 12px/500/32px #FFFFFF (on dark #353D4C bar)",
          "div.BarLabelLight (svelte-1ykhju6 .labeltext): 12px/500/32px #000000 (on light #CCCCCC bar)",
          "div.ChartTitle (svelte-1ykhju6 .title): 14px/700/- #000000",
          "div.ColumnHeader (svelte-1ykhju6 .casino-label): 10px/700/- uppercase #353D4C",
          "p.ChartSource (svelte-1ykhju6 .alt-source): 12px/400/- #727272",
          "p.FlowchartNote (css-jagbsj .interactive-notes): 12px/400/15px #727272",
          "div.AudioLabel (css-1nnq2i0): 12px/500/- #121212",
          "button.ShareButton (css-10d8k1f): 12px/500/15px uppercase #121212",
          "p.TopicTag: 11px/500/- #363636 bg:#f4f4f4",
        ],
      },
      {
        name: "nyt-imperial",
        cssVar: "--g-imperial",
        fullStack: '"nyt-imperial", georgia, "times new roman", times, serif',
        weights: [400, 500],
        role: "Article body text — primary reading font for long-form journalism",
        usedIn: [
          "p.BodyText (css-ac37hb): 18px/400/25px #363636 (desktop: 20px/30px)",
          "span.ImageNote (css-jagbsj): 13px/400/15px #727272",
          "p.PrintInfo (css-lojhqv): 13px/400/18px #363636 (print edition reference)",
          "span.ImageCredit (css-jagbsj .interactive-credit): 12px/400/- #727272",
        ],
      },
    ],
    /** Brand-specific font context — which NYT brand fonts appear on this page */
    brandFonts: {
      editorial: ["nyt-cheltenham", "nyt-imperial"],
      graphics: ["nyt-franklin"],
      games: [],
    },
    /** Color palette — chart and flowchart colors extracted from the live Birdkit Svelte graphic */
    colors: {
      chartPalette: [
        { name: "Casino (dark slate)", hex: "#353D4C" },
        { name: "Sports (light gray)", hex: "#CCCCCC" },
        { name: "Legal (green)", hex: "#3E914D" },
        { name: "Illegal (red)", hex: "#DD5041" },
        { name: "NYT editorial blue", hex: "#326891" },
      ],
    },
    /** Birdkit framework architecture — NYT's internal interactive graphics platform */
    architecture: {
      framework: "Birdkit (Svelte/SvelteKit)",
      projectId: "2025-03-12-sweepstakes-casino",
      hydrationId: "1ae0b5949a4095ef",
      hosting: "static01.nytimes.com/newsgraphics/2025-03-12-sweepstakes-casino/",
      hierarchy: [
        "div#story-top (vi platform wrapper)",
        "  header (headline, byline, sharetools — React/vi platform)",
        "  div.ai2html-container (flowchart — separate Birdkit project)",
        "    div.g-artboard[data-aspect-ratio-med] (responsive artboard selector)",
        "      img.g-aiImg (background artboard JPG)",
        "      div.g-aiPointText (positioned text overlays)",
        "  article (body text — nyt-imperial, React/vi platform)",
        "    p.css-ac37hb (body paragraphs)",
        "    h2.css-11zi5nh (section headings — nyt-cheltenham 600)",
        "  div.birdkit-embed[data-birdkit-hydrate] (stacked bar chart — Birdkit/Svelte)",
        "    div.svelte-1ykhju6 (chart container)",
        "      div.title (chart title — nyt-franklin 700)",
        "      div.bars (stacked horizontal bars — casino:#353D4C + sports:#CCCCCC)",
        "      div.alt-source (source credit — nyt-franklin 400 #727272)",
      ],
      layoutTokens: {
        bodyWidth: "600px (same as Trump article — vi platform standard)",
        marginInline: "20px (--g-margin-left/right)",
        bodyFontSize: "1.125rem (18px mobile, 20px desktop)",
        bodyLineHeight: "1.389 (25px/18px mobile, 30px/20px desktop)",
        bodyColor: "#363636",
        headlineFont: "nyt-cheltenham 700 italic 31px/36px (mobile) → 40px/46px (desktop)",
        summaryFont: "nyt-cheltenham 300 20px/25px (mobile) → 23px/30px (desktop)",
        flowchartArtboardWidth: "335px mobile, 600px desktop",
      },
      cssFiles: [
        "10 Birdkit CSS files (bundled)",
      ],
      publicAssets: {
        ai2htmlArtboards: {
          mobile: { url: "https://static01.nytimes.com/newsgraphics/2025-03-21-sweeps-flowchart/6e0af475-20b1-4803-afd3-20e97d25e41b/_assets/sweeps-Artboard_1_copy_4.jpg", width: 335, desc: "Mobile flowchart artboard (335x577)" },
          desktop: { url: "https://static01.nytimes.com/newsgraphics/2025-03-21-sweeps-flowchart/6e0af475-20b1-4803-afd3-20e97d25e41b/_assets/sweeps-Artboard_1_copy_5.jpg", width: 600, desc: "Desktop flowchart artboard (600x617)" },
        },
        socialImages: [
          { name: "facebookJumbo", url: "https://static01.nyt.com/images/2025/03/21/multimedia/2025-03-21-sweeps-flowchart-index/2025-03-21-sweeps-flowchart-index-facebookJumbo.jpg", ratio: "1.91:1", desc: "Facebook/OG share image" },
          { name: "video16x9-3000", url: "https://static01.nyt.com/images/2025/03/21/multimedia/2025-03-21-sweeps-flowchart-index/2025-03-21-sweeps-flowchart-index-videoSixteenByNine3000.jpg", ratio: "16:9", width: 3000, desc: "Twitter card image" },
          { name: "video16x9-1600", url: "https://static01.nyt.com/images/2025/03/21/multimedia/2025-03-21-sweeps-flowchart-index/2025-03-21-sweeps-flowchart-index-videoSixteenByNineJumbo1600.jpg", ratio: "16:9", width: 1600, desc: "JSON-LD primary image" },
          { name: "google4x3", url: "https://static01.nyt.com/images/2025/03/21/multimedia/2025-03-21-sweeps-flowchart-index/2025-03-21-sweeps-flowchart-index-googleFourByThree.jpg", ratio: "4:3", width: 800, desc: "Google Discover image" },
          { name: "square3x", url: "https://static01.nyt.com/images/2025/03/21/multimedia/2025-03-21-sweeps-flowchart-index/2025-03-21-sweeps-flowchart-index-mediumSquareAt3X.jpg", ratio: "1:1", width: 1000, desc: "Square thumbnail" },
        ],
        authorHeadshot: { url: "https://static01.nyt.com/images/2023/10/24/reader-center/author-ben-blatt/author-ben-blatt-thumbLarge.png", desc: "Ben Blatt headshot" },
      },
    },
    contentBlocks: [
      { type: "header" },
      { type: "byline" },
      {
        type: "ai2html",
        title: "The Difference Between a Sweepstakes Casino and an Online Casino",
        note: "Names for Gold Coins and Sweepstakes Cash may differ based on the site.",
        credit: "The New York Times",
        artboards: {
          mobile: { url: "https://static01.nytimes.com/newsgraphics/2025-03-21-sweeps-flowchart/6e0af475-20b1-4803-afd3-20e97d25e41b/_assets/sweeps-Artboard_1_copy_4.jpg", width: 335, height: 577 },
          desktop: { url: "https://static01.nytimes.com/newsgraphics/2025-03-21-sweeps-flowchart/6e0af475-20b1-4803-afd3-20e97d25e41b/_assets/sweeps-Artboard_1_copy_5.jpg", width: 600, height: 617 },
        },
      },
      { type: "subhed", text: "Playing Whac-a-Mole" },
      { type: "subhed", text: "A share of the pot" },
      {
        type: "birdkit-chart",
        id: "state-tax-gambling",
        title: "Breakdown of tax revenue from online casino and sports gambling in six states",
        source: "State financial reports for year 2024. Fiscal year used for Delaware and West Virginia based on data availability. Rhode Island not included because less than a year\u2019s worth of data was available.",
      },
      { type: "author-bio" },
    ],
  },
  /* ── NYT Voting Deadlines Interactive Calendar ───────────────────── */
  {
    id: "voting-deadlines-state",
    title: "When to Vote in Your State for the U.S. Presidential Election",
    url: "https://www.nytimes.com/interactive/2024/us/elections/voting-deadlines-state.html",
    authors: ["Alice Fang", "Lisa Waananen Jones", "Destinée-Charisse Royal", "Amy Schoenfeld Walker"],
    date: "2024-09-28",
    section: "U.S./Elections",
    type: "interactive" as const,
    description: "An interactive guide to voter registration deadlines, mail ballot deadlines, early voting dates, and Election Day details for every U.S. state and Washington, D.C.",
    ogImage: "https://static01.nyt.com/images/2024/09/27/multimedia/00voting-deadlines/00voting-deadlines-facebookJumbo.png",
    tags: ["vis-design", "Presidential Election of 2024", "Elections", "Voting Rights, Registration and Requirements", "Absentee Voting", "Content Type: Service", "Voting and Voters", "Early Voting"],
    graphicsCount: 1,
    figuresCount: 0,
    tools: {
      topper: "none",
      charts: "none (pure interactive — state data selector + calendar)",
      framework: "Svelte (SvelteKit) + vi-interactive platform (React shell)",
      hosting: "static01.nytimes.com/newsgraphics/2024-09-11-voting-guide/",
    },
    chartTypes: [],
    quoteSections: [],
    /** Fonts used on this page — extracted from source CSS and inline styles */
    fonts: [
      {
        name: "nyt-cheltenham",
        cssVar: "--g-chelt",
        fullStack: 'nyt-cheltenham, cheltenham-fallback-georgia, cheltenham-fallback-noto, georgia, "times new roman", times, serif',
        weights: [300, 700],
        role: "Display headline + calendar month headings — serif editorial typeface",
        usedIn: [
          "h1.AnimatedHeadline (svelte-n6zzpu): ~40px/700/46px font-style:italic text-align:center #121212 — cycles 'Register to Vote / Vote Early / Vote by Mail'",
          "p.CalendarMonth (svelte-190h5a9 .h5): ~16px/700/- #121212 (October, November headings)",
        ],
      },
      {
        name: "nyt-franklin",
        cssVar: "--g-franklin",
        fullStack: '"nyt-franklin", arial, helvetica, sans-serif',
        weights: [300, 400, 500, 600, 700],
        role: "Primary sans-serif — UI chrome, nav, byline, state selector, calendar days, category headings, key labels, date spans, description text",
        usedIn: [
          "p.Byline (svelte-n6zzpu .g-byline): 14px/700/18px #363636",
          "select.StateDropdown (svelte-122pd5k): 16px/500/- #121212 (51 options: all states + DC, default: New York)",
          "span.KeyLabel (svelte-190h5a9 .key-last span): 11px/600/- uppercase (Register, Request, Mail, Early)",
          "td.CalendarDay (svelte-190h5a9): 14px/400/- #444444 (day numbers in 7-column grid)",
          "h3.CategoryHeading (svelte-2ql986 .g-category): 16px/700/- #121212 (Register to Vote, Vote by Mail, Early Voting, Election Day)",
          "span.DateSpan (svelte-2ql986): 14px/400/- #363636 (deadline dates)",
          "p.DescriptionText (svelte-2ql986): 14px/300/- #363636 (deadline descriptions, notes)",
          "div.CountdownBadge (svelte-46mr9t .g-days-left): 12px/600/- uppercase #121212 ('27 days until election day')",
          "h2.StateHeader (svelte-gd1o93): 16px/500/- #121212 ('Important voting deadlines for')",
          "button.ShareButton (css-10d8k1f): 12px/500/15px uppercase #121212",
          "span.SectionLabel (css-1ev7j75): 10px/500/- letter-spacing:0.05rem uppercase #727272 ('Elections')",
        ],
      },
      {
        name: "nyt-cheltenham-small",
        cssVar: null,
        fullStack: 'nyt-cheltenham-small, georgia, "times new roman"',
        weights: [400],
        role: "In-story masthead breadcrumb — small text serif for section navigation",
        usedIn: [
          "span.MastheadBreadcrumb (css-rnl02l): 13px/400/- letter-spacing:0.015em #121212 ('When to Vote in Your State')",
        ],
      },
      {
        name: "nyt-imperial",
        cssVar: "--g-imperial",
        fullStack: '"nyt-imperial", georgia, "times new roman", times, serif',
        weights: [400, 500],
        role: "Body text — intro paragraph and correction text",
        usedIn: [
          "p.IntroText (svelte-n6zzpu .g-text): 20px/500/25px #363636 (introductory paragraph with links)",
          "p.CorrectionText (css-8hnokg): 15px/400/20px #363636 (correction notices at bottom)",
        ],
      },
    ],
    /** Brand-specific font context */
    brandFonts: {
      editorial: ["nyt-cheltenham", "nyt-cheltenham-small", "nyt-imperial"],
      graphics: ["nyt-franklin"],
      games: [],
    },
    /** Color palette — calendar deadline categories + editorial tokens */
    colors: {
      /** Calendar deadline category colors (5-color system, extracted from live page computed styles) */
      calendarCategories: [
        { name: "Register to vote", hex: "#F6CC79", cssClass: ".register" },
        { name: "Request mail ballot", hex: "#F7A0E1", cssClass: ".request" },
        { name: "Mail ballot postmark/received", hex: "#BFA0F7", cssClass: ".mail" },
        { name: "Early voting", hex: "#BCEB82", cssClass: ".early_voting" },
        { name: "Election Day", hex: "#BFA0F7", cssClass: ".election_day" },
        { name: "Today highlight", hex: "#F7F7F7", cssClass: ".today", note: "2px border #CFCFCF" },
      ],
      /** Editorial tokens (shared across NYT pages) */
      editorial: {
        primary: "#121212",
        secondary: "#363636",
        faint: "#727272",
        nytBlue: "#326891",
        background: "#FFFFFF",
      },
    },
    /** Birdkit framework architecture — NYT's internal interactive graphics platform */
    architecture: {
      framework: "Birdkit (Svelte/SvelteKit) embedded in vi-interactive (React shell)",
      projectId: "2024-09-11-voting-guide",
      hydrationId: "f6ae7340a9838bc0",
      hosting: "static01.nytimes.com/newsgraphics/2024-09-11-voting-guide/ec379e24-cff8-4330-8a05-0f9ace449830/",
      hierarchy: [
        "div#app (vi-interactive React shell)",
        "  header (masthead + section label 'Elections' — React)",
        "  div.birdkit-body[data-birdkit-hydrate='f6ae7340a9838bc0'] (Svelte app root)",
        "    div#custom-header (svelte-n6zzpu)",
        "      div.g-days-left-container (countdown badge: '27 days until election day')",
        "      h1.screenreader + span.interactive-heading (animated headline cycling 3 variants)",
        "      p.g-text (intro paragraph — nyt-imperial body text with links)",
        "      p.g-byline (4 authors with links)",
        "      div.g-sharetools-wrapper (share buttons)",
        "    div#states-wrapper (svelte-gd1o93)",
        "      h2 + select (state selector — 51 options, default NY)",
        "      div.calendar-wrapper[role=img] (dual-month calendar: Oct + Nov)",
        "        div.calendar-key (6-category color legend: Today, Election, Register, Request, Mail, Early)",
        "        table.calendar.October (7-column CSS Grid, 31 days)",
        "        table.calendar.November (7-column CSS Grid, 30 days)",
        "      div.dates-column (4 data sections: Register, Mail, Early, Election Day)",
        "        h3.g-category + p spans (per-state deadline dates + notes)",
        "  footer (corrections, methodology, recirculation — React)",
      ],
      layoutTokens: {
        bodyWidth: "600px (standard vi-interactive)",
        marginInline: "20px",
        calendarGrid: "7-column CSS Grid (--grid-start: N for month start day)",
        responsiveBreakpoints: "375px, 600px, 740px, 1024px, 1150px",
      },
      cssFiles: [
        "https://g1.nyt.com/fonts/css/web-fonts.c851560786173ad206e1f76c1901be7e096e8f8b.css (web fonts)",
        "2.u2rr8Tjh.css (Birdkit theme)",
        "index.B915GTVN.css (Birdkit components)",
        "Inline <style data-lights-css> block (~80 CSS class definitions for vi platform chrome)",
      ],
      dataArchitecture: {
        stateData: "51 states (50 + DC) embedded as JSON in Svelte hydration <script> tag",
        perStateFields: [
          "postal, state, nyt_name, website",
          "in_person/online/mail voter registration deadlines",
          "request_absentee_by_mail_deadline",
          "absentee_ballot_postmarked/receipt deadlines + notes",
          "date_early_voting_starts/ends",
          "sends_ballots_to_all_registered_voters (boolean)",
          "display_mail_note, display_early_vote_note, display_registration_note",
        ],
        clientSideState: "Svelte reactive store — dropdown selection triggers calendar re-render + data section update",
      },
      publicAssets: {
        socialImages: [
          { name: "facebookJumbo", url: "https://static01.nyt.com/images/2024/09/27/multimedia/00voting-deadlines/00voting-deadlines-facebookJumbo.png", ratio: "1.91:1", desc: "Facebook/OG share image" },
          { name: "video16x9-3000", url: "https://static01.nyt.com/images/2024/09/27/multimedia/00voting-deadlines/00voting-deadlines-videoSixteenByNine3000.png", ratio: "16:9", width: 3000, desc: "Twitter card image" },
          { name: "video16x9-1600", url: "https://static01.nyt.com/images/2024/09/27/multimedia/00voting-deadlines/00voting-deadlines-videoSixteenByNineJumbo1600.png", ratio: "16:9", width: 1600, desc: "JSON-LD primary image" },
          { name: "google4x3", url: "https://static01.nyt.com/images/2024/09/27/multimedia/00voting-deadlines/00voting-deadlines-googleFourByThree.png", ratio: "4:3", width: 800, desc: "Google Discover image" },
          { name: "square3x", url: "https://static01.nyt.com/images/2024/09/27/multimedia/00voting-deadlines/00voting-deadlines-mediumSquareAt3X.png", ratio: "1:1", width: 1800, desc: "Square thumbnail" },
        ],
      },
    },
    contentBlocks: [
      { type: "header" },
      { type: "birdkit-countdown", label: "days until election day", daysLeft: 27 },
      { type: "birdkit-animated-headline", variants: ["Register to Vote", "Vote Early", "Vote by Mail"] },
      { type: "byline" },
      { type: "birdkit-state-selector", stateCount: 51, defaultState: "New York" },
      { type: "birdkit-calendar", months: ["October 2024", "November 2024"], categories: [
        { key: "register", label: "Register to vote", color: "#F6CC79" },
        { key: "request", label: "Request mail ballot", color: "#F7A0E1" },
        { key: "mail", label: "Mail ballot postmark", color: "#BFA0F7" },
        { key: "early_voting", label: "Vote early in person", color: "#BCEB82" },
        { key: "election_day", label: "Election Day", color: "#BFA0F7" },
      ] },
      { type: "birdkit-state-data-section", title: "Register to Vote" },
      { type: "birdkit-state-data-section", title: "Vote by Mail" },
      { type: "birdkit-state-data-section", title: "Early Voting" },
      { type: "birdkit-state-data-section", title: "Election Day" },
      { type: "correction", text: "Virginia registration deadline correction", date: "2024-09-30" },
      { type: "correction", text: "Timezone rendering fix", date: "2024-10-10" },
      { type: "author-bio" },
    ],
  },
  /* ── The Athletic ──────────────────────────────────────────────────── */
  {
    id: "nfl-playoff-coaches-fourth-down",
    title: "Ranking NFL playoff coaches by who gives their team biggest edge on fourth down",
    url: "https://www.nytimes.com/athletic/6932241/2026/01/09/nfl-playoffs-coaches-fourth-down-stats-analytics/",
    authors: ["Austin Mock"],
    date: "2026-01-09",
    section: "NFL",
    type: "standard" as const,
    description: "There will be times during the playoffs when coaches must make crucial fourth-down decisions. Who's most likely to make the right call?",
    ogImage: "https://static01.nyt.com/athletic/uploads/wp/2026/01/08140654/0109_NFL_COACHES-BIGGEST-4TH-DOWN-EDGE-1.png?width=1200&height=630&fit=cover",
    tags: ["Buffalo Bills", "Carolina Panthers", "Chicago Bears", "Denver Broncos", "Green Bay Packers", "Houston Texans", "Jacksonville Jaguars", "New England Patriots", "Philadelphia Eagles", "Pittsburgh Steelers", "Los Angeles Chargers", "Seattle Seahawks", "San Francisco 49ers", "Los Angeles Rams", "NFL"],
    graphicsCount: 2,
    figuresCount: 4,
    tools: {
      topper: "none",
      charts: "Datawrapper (1 table embed — heatmap table, The Athletic theme)",
      framework: "React (Next.js) — data-theme='legacy', SSR with client hydration",
      hosting: "nytimes.com/athletic/ — CDN: static01.nyt.com, cdn-media.theathletic.com",
    },
    chartTypes: [
      { type: "datawrapper-table", tool: "datawrapper", topic: "2025 NFL fourth-down decisions — heatmap table with xGO, xGC+, go_correct, go_correct%", url: "https://datawrapper.dwcdn.net/UYsk6/7/" },
    ],
    quoteSections: [],
    /** Fonts used on this page — preloaded woff2 from g1.nyt.com/fonts CDN */
    fonts: [
      {
        name: "nyt-cheltenham",
        cssVar: null,
        fullStack: 'nyt-cheltenham, georgia, "times new roman", times, serif',
        weights: [400, 500, 700],
        role: "Display headlines + section headings — serif editorial typeface",
        usedIn: [
          "h1.Article_Headline__ou0D2.Article_Featured__tTXwK: 40px/400/44px #121212",
          "h2 (bare, inside .bodytext1): 30px/700/36px #121212 (section heads: Takeaways, Methodology)",
          "h3 (bare, inside .bodytext1): 24px/500/28.8px #121212 (sub-sections: Let's go LaFleur it)",
          "div.showcase-link-title: 24px/500/120% letter-spacing:0.01px #121212 (mobile: 16px)",
          "button.PuzzleEntryPoint_PuzzlesButton: 14px/500/18.2px #000000 (CTA text)",
        ],
      },
      {
        name: "nyt-franklin",
        cssVar: null,
        fullStack: '"nyt-franklin", helvetica, arial, sans-serif',
        weights: [300, 400, 500, 600, 700],
        role: "Primary sans-serif — UI chrome, nav, labels, badges, buttons, captions, Datawrapper",
        usedIn: [
          "span.Article_BylineString__WkHIP: 14px/500/16.8px letter-spacing:0.25px #121212",
          "a inside BylineString (author name): 14px/700/16.8px #121212 text-decoration:none",
          "div.Article_BylineTimestamp__KhutQ > time: 13px/500/17px #121212",
          "span.Pill_PillLabel__59Ozm: 12px/500 #121212 (Share full article, comment count '46')",
          "p.Storyline_StorylineTitle__lns7V (Typography_headlineSansBoldExtraSmall): 15px/700/15px #121212",
          "div.Storyline_ItemTitle__W3Wj_: 14px/500/14px #52524F",
          "a.header-link.HeaderLink_HeaderLink: 14px/400/40px letter-spacing:0.25px #DBDBD9 (on dark bg)",
          "div.showcase-link: 14px/700/13.8px letter-spacing:1.1px uppercase #121212",
          "p.ad-slug: 11px/500/11px letter-spacing:0.22px uppercase #969693 (var(--Gray60))",
          "span.Article_ImageCredit__2YNda: 12px/500/15.6px letter-spacing:0.12px #52524F",
          "p.Article_WriterBioText (Typography_utilitySansRegularLarge): 16px/400/22.72px #121212",
          "a (author bio links): 16px/700/22.72px #386C92 text-decoration:none",
          "h2.PuzzleEntryPoint_PuzzlesTitle: 20px/600/24px letter-spacing:0.3px #000000",
          "p.PuzzleEntryPoint_PuzzlesMobileSubtitle: 14px/500/18.2px letter-spacing:0.25px #323232",
          "div.Footer_FooterSectionHeader: 14px/700/16.8px letter-spacing:0.25px #F0F0EE (dark footer)",
          "a.Footer_FooterLink: 12px/500/13px letter-spacing:0.15px #C4C4C0 (dark footer)",
          "Datawrapper h3.block-headline: 20px/700/22px #121212 (NYT Franklin via static.dwcdn.net)",
          "Datawrapper p.block-description: 16px/500/19.2px #323232",
          "Datawrapper th span.dw-bold: 13.76px/500 uppercase letter-spacing:0.08px #52524F",
          "Datawrapper td: 16px/300 #121212 (body cells)",
          "Datawrapper footer span.prepend: 12px/600 #52524F | span: 12px/500 #52524F",
        ],
      },
      {
        name: "nyt-imperial",
        cssVar: null,
        fullStack: '"nyt-imperial", georgia, "times new roman", times, serif',
        weights: [400, 500],
        role: "Article body text — primary reading font for long-form journalism",
        usedIn: [
          "p (bare, inside .article-content-container.bodytext1): 20px/400/30px #121212",
          "a (body links): 20px/400/30px #386C92 text-decoration:underline",
          "p.Article_ImageCaptionCredit (Typography_body1): 14px/500/19.46px #323232",
          "div.showcase-link-excerpt: 16px/400/139% #323232 (mobile: 12px/121%)",
        ],
      },
      {
        name: "RegularSlab",
        cssVar: null,
        fullStack: "RegularSlab",
        weights: [400],
        role: "Nav bar league label — wordmark-style slab serif for sport abbreviations",
        usedIn: [
          "p.HeaderNavBarLinks_LeagueNavText: 18px/400/18px letter-spacing:0.18px #FFFFFF (on dark header)",
        ],
      },
    ],
    /** Brand-specific font context — The Athletic uses same NYT type families but different hierarchy */
    brandFonts: {
      editorial: ["nyt-cheltenham", "nyt-imperial"],
      graphics: ["nyt-franklin"],
    },
    /** Color palette — every hex extracted from computed styles on live page + Datawrapper iframe */
    colors: {
      /** Page-level text and background colors (light mode default) */
      page: {
        primaryText: "#121212",      // h1, h2, h3, body p, byline, pills — dominant text color
        secondaryText: "#323232",    // .showcase-link-excerpt, p.block-description, p.PuzzlesMobileSubtitle
        tertiaryText: "#52524F",     // Datawrapper th/footer, .Storyline_ItemTitle, .Article_ImageCredit, nav divider border
        mutedText: "#969693",        // p.ad-slug (var(--Gray60)), footer note text
        pureBlack: "#000000",        // h2.PuzzleEntryPoint_PuzzlesTitle, button.PuzzlesButton, SVG path fills
        background: "#FFFFFF",       // page bg, table cell bg, sticky coach column bg
        linkBlue: "#386C92",         // a (body text links underlined), a (author bio name/twitter bold)
      },
      /** Header + navigation (dark background) */
      header: {
        background: "#121212",       // dark nav bar bg (inferred from white SVG wordmark + white text)
        primaryText: "#FFFFFF",      // SVG wordmark fill, p.LeagueNavText
        secondaryText: "#DBDBD9",    // a.header-link.HeaderLinkLighter (nav link text)
        dividerBorder: "#52524F",    // vertical nav section divider (border-left 2px solid)
      },
      /** Footer (dark background, matches header) */
      footer: {
        background: "#121212",       // footer bg (same as header)
        sectionHeader: "#F0F0EE",    // div.Footer_FooterSectionHeader
        linkText: "#C4C4C0",         // a.Footer_FooterLink
      },
      /** Dark mode (native mobile only — prefers-color-scheme: dark) */
      darkMode: {
        background: "#121212",       // .native-mobile a.showcase-link-container
        primaryText: "#F0F0EE",      // text on dark bg
        secondaryText: "#C4C4C0",    // .showcase-link-excerpt on dark bg
      },
      /** Dividers and borders */
      borders: {
        showcaseDivider: "rgba(150, 150, 147, 0.4)",  // showcase-link-container border-top/bottom
        tableBorder: "#C2C2C0",      // Datawrapper th/td border-bottom, storyline bar bottom
        contentDivider: "#E8E5E0",   // general section dividers (inferred from NYT pattern)
      },
      /** Datawrapper "The Athletic" theme — heatmap table (UYsk6/7) */
      datawrapperTheme: {
        /** 8-stop continuous gradient for xGC+ heatmap column */
        heatmapGradient: ["#904406", "#BD6910", "#F89A1E", "#FBC46D", "#98E9E7", "#409797", "#136060", "#002728"],
        /** Exact per-row computed heatmap colors (bg → text) extracted from rendered iframe */
        heatmapExact: {
          "+18.1%": { bg: "#002728", fg: "#FFFFFF" },
          "+16.9%": { bg: "#023334", fg: "#FFFFFF" },
          "+14.7%": { bg: "#0A4C4C", fg: "#FFFFFF" },
          "+12.9%": { bg: "#136060", fg: "#FFFFFF" },
          "+11.9%": { bg: "#1D6B6B", fg: "#FFFFFF" },
          "+9.6%":  { bg: "#318383", fg: "#FFFFFF" },
          "+6.9%":  { bg: "#4FA4A4", fg: "#FFFFFF" },
          "+1.9%":  { bg: "#ADE4D7", fg: "#121212" },
          "-0.6%":  { bg: "#DED4A0", fg: "#121212" },
          "-4.8%":  { bg: "#FBBC5F", fg: "#121212" },
          "-13.1%": { bg: "#E08618", fg: "#FFFFFF" },
          "-19.1%": { bg: "#B15F0D", fg: "#FFFFFF" },
          "-23.1%": { bg: "#974A07", fg: "#FFFFFF" },
          "-24.2%": { bg: "#904406", fg: "#FFFFFF" },
        },
        text: "#52524F",             // th headers, footer labels
        cellText: "#121212",         // td body cells
        border: "#C2C2C0",          // th/td border-bottom
        headerBg: "transparent",     // th bg (col 1 sticky gets white)
        stickyColBg: "#FFFFFF",      // coach name column sticky bg
      },
      /** Chart accent palette (non-heatmap chart elements, Datawrapper Athletic theme defaults) */
      chartPalette: {
        gold: "#FDBA58",            // warm gold accent
        gray: "#CCCCCC",            // neutral gray for secondary data
        teal: "#409797",            // from heatmap gradient mid-tone
        darkTeal: "#002728",        // deepest heatmap value
        warmOrange: "#F89A1E",      // heatmap warm mid-tone
        deepOrange: "#904406",      // heatmap floor / worst-performing
      },
      /** Complete CSS variable system from :root (data-theme="legacy") */
      cssVariables: {
        /* Gray scale — The Athletic's 18-step gray system */
        Gray10: "#FFFFFF",           // --Gray10: page bg, icons
        Gray15: "#FAFAFA",           // --Gray15
        Gray20: "#F7F7F4",           // --Gray20: ad bg (--adBackground)
        Gray25: "#FBFBFB",           // --Gray25
        Gray30: "#F0F0EE",           // --Gray30: skeleton, borders, footer section header
        Gray31: "#F2F2F2",           // --Gray31
        Gray32: "#E2E2E2",           // --Gray32
        Gray33: "#333333",           // --Gray33
        Gray34: "#DADADA",           // --Gray34
        Gray35: "#DBDBD9",           // --Gray35: nav secondary text
        Gray40: "#C4C4C0",           // --Gray40: footer link text
        Gray45: "#969693",           // --Gray45: ad slug / muted text
        Gray49: "#706B66",           // --Gray49
        Gray50: "#52524F",           // --Gray50: tertiary text, Datawrapper headers, borders
        Gray60: "#323232",           // --Gray60: secondary text
        Gray62: "#2B2B2B",           // --Gray62
        Gray63: "#262627",           // --Gray63
        Gray65: "#1A1A1A",           // --Gray65
        Gray70: "#121212",           // --Gray70: primary text (default body color)
        Gray78: "#181818",           // --Gray78
        Gray80: "#000000",           // --Gray80: pure black
        /* Semantic colors */
        errorDark: "#CB3939",        // --error-dark
        errorMain: "#F24A4A",        // --error-main / --primary-main
        primaryLight: "#EAB4B0",     // --primary-light
        secondaryMain: "#012F6C",    // --secondary-main
        link: "#386C92",             // --Link: body text links, author bio links
        /* Brand colors */
        maroon: "#943848",           // --Maroon
        red: "#CB3939",              // --Red
        chalkRed: "#B72424",         // --chalkRed
        orange: "#E95F33",           // --Orange
        darkOrange: "#C04300",       // --DarkOrange
        yellow: "#F89A1E",           // --Yellow (matches heatmap mid-tone)
        lightYellow: "#FEF0DD",      // --LightYellow
        brightGreen: "#4EAB75",      // --BrightGreen
        green: "#3C5634",            // --Green
        turquoise: "#105E5E",        // --Turqoise
        royal: "#497AB8",            // --Royal
        navy: "#1C3C64",             // --Navy
        blue: "#225FA7",             // --Blue / --Blue10
        green10: "#026A2E",          // --Green10
        red10: "#B72424",            // --Red10
        purple: "#403C5C",           // --Purple
        /* Gradients */
        gradient10: "#F0F0EE",       // --Gradient10
        gradient20: "#FFFFFF",       // --Gradient20
        /* Component-specific tokens */
        contentRecOuterBorder: "#52524F",   // --content-recommendation-outer-border-color
        contentRecItemBorder: "#F0F0EE",    // --content-recommendation-item-border-color
        contentRecHeaderTitle: "#000000",   // --content-recommendation-header-title-color
        contentRecItemTitle: "#121212",     // --content-recommendation-item-title-color
      },
    },
    /** Next.js architecture — The Athletic's web platform */
    architecture: {
      framework: "React (Next.js) — data-theme='legacy', SSR with client hydration, Statsig feature flags",
      projectId: "theathletic",
      hosting: "nytimes.com/athletic/",
      hierarchy: [
        "div#__next (Next.js app root)",
        "  div (position:relative, min-height:100vh, flex column)",
        "    header > nav.HeaderNav_HeaderNav",
        "      div.DesktopNav_Wrapper (StorylineHeight variant)",
        "        div.DesktopNav_PrimaryNav",
        "          button.DesktopNav_HamburgerMenuContainer (hamburger: 3 rects 17×2.5px each)",
        "          div#subnav-hamburger.HeaderSubNav_Wrapper (aria-hidden=true)",
        "            div.HamburgerNav_Wrapper (league list + edition toggle + search)",
        "          a.athletic-slab-logo (SVG wordmark 1449×200 viewBox, white fill on dark bg)",
        "          div.PrimaryNav_Wrapper (league icons 24×24 + team dropdown subnavs)",
        "    div.root.legacy > main",
        "      div#body-container.Container_default-padding (Container_container max-width:none)",
        "        div.Article_ArticleWrapper",
        "          div#storyline-root.Storyline_Root (Storyline_notEmbed Storyline_isLegacy)",
        "            div.Storyline_NavContainer > div.Storyline_TitleWrapper",
        "              p.Storyline_StorylineTitle (headlineSansBoldExtraSmall: 'Super Bowl LX')",
        "            div.Storyline_ItemContainer (horizontal scroll links)",
        "          div.Article_FeaturedImageContainer (full-width)",
        "            div.Image_Root--centered (span > img srcSet 600-1920w, fetchpriority=high)",
        "            p.Article_ImageCaptionCredit > span.Article_ImageCredit (body1 typography)",
        "          div.Article_Wrapper.the-lead-article",
        "            div.Article_ArticleHeader.Article_FeaturedArticleHeader",
        "              div.Article_HeadlineContainer.Article_FeaturedHeadlineContainer",
        "                h1.Article_Headline.Article_Featured (nyt-cheltenham 400)",
        "              div.Article_BylineGrid (Grid 12-col)",
        "                div.Article_BylineAuthorWrapper",
        "                  div.Article_AuthorAvatarImage (40×40, border-radius:20px)",
        "                  span.Article_BylineString ('By <u>Austin Mock</u>')",
        "                div.Article_BylineTimestamp.Article_Featured (<time>Jan. 9, 2026</time>)",
        "                div.Article_ArticleBylineSocialContainer",
        "                  button.Pill (share: SVG 28×28 + 'Share full article')",
        "                  button.Pill (share-only icon: SVG 24×24)",
        "                  button.Pill (comments: SVG 14×15 + '46')",
        "            div#article-container-grid.Article_ContainerGrid",
        "              div.Article_ContentContainer.article-content-container.bodytext1",
        "                p (body text — nyt-imperial)",
        "                div.ad-container > div.ad-wrapper (min-height:300px, margin:48px 0)",
        "                div#inline-graphic > a.showcase-link-container (recommendation card)",
        "                div > iframe#datawrapper-chart-UYsk6 (dark/light mode pair)",
        "                h2 / h3 (section subheadings)",
        "                blockquote.twitter-tweet (embedded tweet)",
        "              div.PuzzleEntryPoint_PuzzleContainer (Connections: Sports Edition)",
        "              div.Article_WriterBioContainer (Grid 9-col, headshot + bio)",
        "    footer.Footer_footer",
        "      nav (Grid: National | US | Canada+Partners | Subscribe+Support)",
        "      div (Logo SVG + social icons + app store badges)",
      ],
      layoutTokens: {
        maxContentWidth: "1248px (Container_container)",
        bodyFontSize: "16px base (nyt-imperial for body, nyt-franklin for UI)",
        bodyLineHeight: "139% (1.39) for body; 100% for labels",
        headlineFont: "nyt-cheltenham 500",
        uiFont: "nyt-franklin 500-700",
        showcaseCardBorder: "1px solid rgba(150, 150, 147, 0.4) top+bottom",
        showcaseImageSize: "200×150px desktop, 120×120px mobile",
        showcaseImageRadius: "8px",
        showcaseGap: "16px (inner content), 20px (section padding)",
        avatarSize: "40px byline, 100px bio",
        avatarRadius: "20px (circular)",
        pillShape: "Pill_Pill — icon + optional label, aria-pressed toggle",
        adMargin: "48px 0 desktop, 40px 0 mobile",
        adMinHeight: "300px",
        adSlugStyle: "11px/500/uppercase, 0.02em spacing, var(--Gray60)",
        breakpointMobile: "599.95px",
        breakpointTablet: "1023.95px",
        breakpointDesktop: "1248px",
        gridSystem: "Grid_xsNumber12 (12-col base), sm/md variants",
        articleGridSplit: "9/12 content + sidebar on md+",
      },
      cssFiles: [
        "/athletic/_next/static/css/17f00444ca25c61f.css (global reset)",
        "/athletic/_next/static/css/90f4e6b42067e4fb.css",
        "/athletic/_next/static/css/e245a4adee347a47.css",
        "/athletic/_next/static/css/97d13b5c057c71f5.css",
        "/athletic/_next/static/css/3d4d90231fd6ed69.css",
        "/athletic/_next/static/css/6148836b558a1c06.css",
        "/athletic/_next/static/css/90f652a6dd291d17.css",
        "/athletic/_next/static/css/6b0e63f354e11a15.css",
      ],
      datawrapperTheme: {
        themeName: "the-athletic",
        fontCdn: "https://static.dwcdn.net/custom/themes/the-athletic/",
        fontFamily: "NYTFranklin-Medium/Semibold/Bold (500/600/700)",
        textColor: "#52524F",
        headerBg: "#F0F0EE",
        borderColor: "#C2C2C0",
        heatmapGradient: "#904406 → #BD6910 → #F89A1E → #FBC46D → #98E9E7 → #409797 → #136060 → #002728",
        headerTransform: "uppercase",
        baseFontSize: "16px",
        headerFontSize: "0.86em",
        paginationPosition: "top",
        rowsPerPage: "20",
        darkModeBg: "#121212",
      },
      contentBlocks: [
        "header (headline h1 — nyt-cheltenham 500, Article_Featured variant)",
        "storyline (horizontal nav bar — 'Super Bowl LX' with 5 story links, headlineSansBoldExtraSmall)",
        "featured-image (full-width hero img, srcSet 600-1920w, fetchpriority=high, object-fit:cover)",
        "image-credit (span.Article_ImageCredit — 'Illustration: Will Tullos / The Athletic; ...')",
        "byline (author avatar 40×40 r:20px + 'By Austin Mock' underlined + <time>Jan. 9, 2026</time>)",
        "social-bar (3 Pill buttons: share-full 28×28 + share-icon 24×24 + comments 14×15 + '46')",
        "body-text (nyt-imperial 16px/400, line-height 139%, paragraphs)",
        "ad-container (mid-article: .ad-wrapper min-h:300px, margin:48px/40px, .ad-slug 11px/500 uppercase)",
        "showcase-link (inline recommendation card: image 200×150 r:8px + title cheltenham 24px + excerpt imperial 16px, border-top/bottom rgba(150,150,147,0.4))",
        "datawrapper-table (iframe#datawrapper-chart-UYsk6, The Athletic theme, heatmap on xGC+ column, dark/light pair with .dw-dark/.dw-light classes)",
        "twitter-embed (blockquote.twitter-tweet data-width=550 data-dnt=true, async widgets.js)",
        "subhed (h2/h3 — section headings: Takeaways, Let's go LaFleur it, etc.)",
        "author-bio (Grid 9-col: headshot 100px + bio text utilitySansRegularLarge + Twitter link)",
        "puzzle-entry-point (PuzzleEntryPoint_PuzzleContainer: Connections: Sports Edition promo with date, title, subtitle, play CTA button with chevron)",
      ],
      publicAssets: {
        socialImages: [
          { name: "og-image", url: "https://static01.nyt.com/athletic/uploads/wp/2026/01/08140654/0109_NFL_COACHES-BIGGEST-4TH-DOWN-EDGE-1.png?width=1200&height=630&fit=cover", ratio: "1.91:1", desc: "Facebook/OG share image (og:image)" },
          { name: "twitter-card", url: "https://static01.nyt.com/athletic/uploads/wp/2026/01/08140654/0109_NFL_COACHES-BIGGEST-4TH-DOWN-EDGE-1.png?width=1200&height=675&fit=cover", ratio: "16:9", desc: "Twitter card image (twitter:image)" },
          { name: "square-1200", url: "https://static01.nyt.com/athletic/uploads/wp/2026/01/08140654/0109_NFL_COACHES-BIGGEST-4TH-DOWN-EDGE-1.png?width=1200&height=1200&fit=cover", ratio: "1:1", width: 1200, desc: "Square structured data image (schema.org)" },
          { name: "4x3-900", url: "https://static01.nyt.com/athletic/uploads/wp/2026/01/08140654/0109_NFL_COACHES-BIGGEST-4TH-DOWN-EDGE-1.png?width=1200&height=900&fit=cover", ratio: "4:3", width: 1200, desc: "4:3 structured data image (schema.org)" },
        ],
        authorHeadshot: { url: "https://static01.nyt.com/athletic/uploads/wp/2021/08/19090910/Mock-Austin-Headshot-081821-1.jpg", desc: "Austin Mock headshot (byline avatar 40px + bio 100px)" },
        datawrapperCharts: [
          { id: "UYsk6", version: 7, topic: "2025 NFL fourth-down decisions", url: "https://datawrapper.dwcdn.net/UYsk6/7/?plain=1", height: 400 },
        ],
        datawrapperCss: {
          athleticTheme: "https://static.dwcdn.net/custom/themes/the-athletic/ (NYTFranklin fonts, #52524F text, #C2C2C0 borders)",
          ptStylesheet: "//pt.dwcdn.net/UYsk6.css (chart-specific styles)",
        },
        icons: [
          { name: "hamburger-menu", file: "/icons/athletic/hamburger-menu.svg", r2: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/icons/athletic/hamburger-menu.svg", size: "30×30", fill: "currentColor (var(--Gray10))", usage: "button.DesktopNav_HamburgerMenuContainer — 3 rects 17×2.5px, 5px gap", element: "button[aria-label='Toggle hamburger menu']" },
          { name: "share-gift", file: "/icons/athletic/share-gift.svg", r2: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/icons/athletic/share-gift.svg", size: "28×28", fill: "#000", usage: "span.Pill_PillIcon inside button.Pill — 'Share full article' pill", element: "button[aria-label='Open share menu'] > span.Pill_PillIcon" },
          { name: "forward-share", file: "/icons/athletic/forward-share.svg", r2: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/icons/athletic/forward-share.svg", size: "24×24", fill: "#121212", usage: "span.Pill_PillIcon inside icon-only share pill (no label)", element: "button.ShareMenuDropdown_shareMenuPillWithoutLabel > span.Pill_PillIcon" },
          { name: "comment-bubble", file: "/icons/athletic/comment-bubble.svg", r2: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/icons/athletic/comment-bubble.svg", size: "14×15", fill: "#121212", usage: "span.Pill_PillIcon inside comment count pill ('46')", element: "button[aria-label='Open Comments'] > span.Pill_PillIcon" },
          { name: "chevron-down", file: "/icons/athletic/chevron-down.svg", r2: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/icons/athletic/chevron-down.svg", size: "10×6", fill: "#969693", usage: "button.HeaderLink_ShowSubNavButton — nav dropdown toggle", element: "button[aria-label='Open Teams submenu'] > svg" },
          { name: "chevron-right", file: "/icons/athletic/chevron-right.svg", r2: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/icons/athletic/chevron-right.svg", size: "16×16", fill: "#121212", usage: "button.PuzzleEntryPoint_PuzzlesButton — 'Play today's puzzle' CTA arrow", element: "button.PuzzlesButton > svg" },
          { name: "wordmark", file: "/icons/athletic/wordmark.svg", r2: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/icons/athletic/wordmark.svg", size: "1449×200", fill: "#FFFFFF (on dark header bg)", usage: "a.athletic-slab-logo — header wordmark, min-width 127px", element: "a.athletic-slab-logo > div > img (base64-encoded inline SVG)" },
          /* League logo */
          { name: "nfl-league", file: "/icons/athletic/leagues/nfl.png", r2: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/icons/athletic/leagues/nfl.png", size: "24×24 (nav) / 20×20 (hamburger)", fill: "n/a (raster)", usage: "Primary nav league icon + hamburger menu league list", element: "img.HeaderSubNav_MoreLeaguesImg (20×20) / div.Image_Root img (24×24)" },
          /* Connections: Sports Edition logo (PNG, extracted from base64 inline) */
          { name: "connections-sports-edition", file: "/icons/athletic/connections-sports-edition.png", r2: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/icons/athletic/connections-sports-edition.png", size: "288×288", fill: "n/a (raster, multicolor on white)", usage: "div.PuzzleEntryPoint_PuzzlesContentContainer — puzzle promo card icon", element: "img.PuzzleEntryPoint_PuzzlesIcon" },
          /* Team logos — 14 teams tagged in this article (72×72 PNG from static01.nyt.com) */
          { name: "bills", file: "/icons/athletic/teams/bills.png", r2: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/icons/athletic/teams/bills.png", size: "72×72", fill: "n/a (raster)", usage: "Nav team dropdown — AFC East", element: "img[data-src*='team-logo-34'] (24×24 in nav, 72×72 source)" },
          { name: "panthers", file: "/icons/athletic/teams/panthers.png", r2: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/icons/athletic/teams/panthers.png", size: "72×72", fill: "n/a (raster)", usage: "Nav team dropdown — NFC South", element: "img[data-src*='team-logo-35']" },
          { name: "bears", file: "/icons/athletic/teams/bears.png", r2: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/icons/athletic/teams/bears.png", size: "72×72", fill: "n/a (raster)", usage: "Nav team dropdown — NFC North", element: "img[data-src*='team-logo-36']" },
          { name: "broncos", file: "/icons/athletic/teams/broncos.png", r2: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/icons/athletic/teams/broncos.png", size: "72×72", fill: "n/a (raster)", usage: "Nav team dropdown — AFC West", element: "img[data-src*='team-logo-40']" },
          { name: "packers", file: "/icons/athletic/teams/packers.png", r2: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/icons/athletic/teams/packers.png", size: "72×72", fill: "n/a (raster)", usage: "Nav team dropdown — NFC North", element: "img[data-src*='team-logo-42']" },
          { name: "texans", file: "/icons/athletic/teams/texans.png", r2: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/icons/athletic/teams/texans.png", size: "72×72", fill: "n/a (raster)", usage: "Nav team dropdown — AFC South", element: "img[data-src*='team-logo-43']" },
          { name: "jaguars", file: "/icons/athletic/teams/jaguars.png", r2: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/icons/athletic/teams/jaguars.png", size: "72×72", fill: "n/a (raster)", usage: "Nav team dropdown — AFC South", element: "img[data-src*='team-logo-45']" },
          { name: "patriots", file: "/icons/athletic/teams/patriots.png", r2: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/icons/athletic/teams/patriots.png", size: "72×72", fill: "n/a (raster)", usage: "Nav team dropdown — AFC East", element: "img[data-src*='team-logo-49']" },
          { name: "eagles", file: "/icons/athletic/teams/eagles.png", r2: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/icons/athletic/teams/eagles.png", size: "72×72", fill: "n/a (raster)", usage: "Nav team dropdown — NFC East", element: "img[data-src*='team-logo-54']" },
          { name: "steelers", file: "/icons/athletic/teams/steelers.png", r2: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/icons/athletic/teams/steelers.png", size: "72×72", fill: "n/a (raster)", usage: "Nav team dropdown — AFC North", element: "img[data-src*='team-logo-55']" },
          { name: "chargers", file: "/icons/athletic/teams/chargers.png", r2: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/icons/athletic/teams/chargers.png", size: "72×72", fill: "n/a (raster)", usage: "Nav team dropdown — AFC West", element: "img[data-src*='team-logo-56']" },
          { name: "seahawks", file: "/icons/athletic/teams/seahawks.png", r2: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/icons/athletic/teams/seahawks.png", size: "72×72", fill: "n/a (raster)", usage: "Nav team dropdown — NFC West", element: "img[data-src*='team-logo-57']" },
          { name: "49ers", file: "/icons/athletic/teams/49ers.png", r2: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/icons/athletic/teams/49ers.png", size: "72×72", fill: "n/a (raster)", usage: "Nav team dropdown — NFC West", element: "img[data-src*='team-logo-58']" },
          { name: "rams", file: "/icons/athletic/teams/rams.png", r2: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/icons/athletic/teams/rams.png", size: "72×72", fill: "n/a (raster)", usage: "Nav team dropdown — NFC West", element: "img[data-src*='team-logo-59']" },
        ],
      },
    },
    /** Content blocks in exact document order — drives ArticleDetailPage rendering */
    contentBlocks: [
      { type: "storyline", title: "Super Bowl LX", links: [
        { label: "Seahawks Dominate Patriots", href: "https://www.nytimes.com/athletic/7030353/2026/02/08/super-bowl-2026-winner-score-results-seahawks-patriots/" },
        { label: "Halftime Show Rankings", href: "https://www.nytimes.com/athletic/7024793/2026/02/09/super-bowl-bad-bunny-halftime-show-rankings/" },
        { label: "Broadcast Viewership", href: "https://www.nytimes.com/athletic/7036613/2026/02/10/super-bowl-ratings-nfl-nbc-bad-bunny/" },
        { label: "Kenneth Walker III MVP", href: "https://www.nytimes.com/athletic/7031979/2026/02/08/super-bowl-2026-mvp-kenneth-walker-seahawks/" },
        { label: "2027 Super Bowl Odds", href: "https://www.nytimes.com/athletic/7032067/2026/02/08/super-bowl-2027-odds-seahawks-repeat-favorites-rams/" },
      ] },
      { type: "featured-image", credit: "Illustration: Will Tullos / The Athletic; Nic Antaya, Bruce Yeung and Logan Bowles / Getty Images" },
      { type: "header" },
      { type: "byline" },
      { type: "ad-container", position: "mid1" },
      { type: "showcase-link", title: "Why each NFC playoff team will win the Super Bowl, and why each won't", excerpt: "The Seahawks are overwhelming favorites to win the NFC, but who are their top challengers?", href: "https://www.nytimes.com/athletic/6932256/2026/01/08/nfl-playoffs-super-bowl-nfc-champion-bears-eagles-49ers/", imageUrl: "https://static01.nyt.com/athletic/uploads/wp/2025/12/31140143/AP23264012447844-scaled-e1767207720667-1024x684.jpg?width=400&quality=70" },
      { type: "datawrapper-table", id: "UYsk6", title: "2025 NFL fourth-down decisions", note: "xGO \u2013 how many times a coach was expected to go on fourth down \u2022 xGC+ \u2013 percentage above/below the average playoff coach", source: "https://rbsdm.com/", url: "https://datawrapper.dwcdn.net/UYsk6/7/" },
      { type: "subhed", text: "Takeaways" },
      { type: "subhed", text: "Let\u2019s go LaFleur it" },
      { type: "twitter-embed", author: "Matt Schneidman", handle: "@mattschneidman", text: "Matt LaFleur: \u201cI thought the only way you come into this place (and win), which is not an easy place to play, is you\u2019ve got to be aggressive.\u201d What if the last fourth-down try failed? \u201cI\u2019d rather go down swinging.\u201d", date: "November 28, 2025", url: "https://twitter.com/mattschneidman/status/1994448753793610057" },
      { type: "subhed", text: "Have you learned nothing?" },
      { type: "ad-container", position: "mid2" },
      { type: "showcase-link", title: "Why each AFC playoff team will win the Super Bowl, and why they won't", excerpt: "The Broncos have the best odds, by nature of their free pass in the first round, but Denver is far from flawless.", href: "https://www.nytimes.com/athletic/6932205/2026/01/07/nfl-playoffs-super-bowl-afc-champion/", imageUrl: "https://static01.nyt.com/athletic/uploads/wp/2025/12/31132259/AP25359143264592-scaled-e1767205412856-1024x683.jpg?width=400&quality=70" },
      { type: "subhed", text: "Didn\u2019t think I\u2019d see you here" },
      { type: "showcase-link", title: "How 2 NFL teams are winning the game of inches, stealing yards on the \u2018dynamic kickoff\u2019", excerpt: "The Seahawks and Panthers have adapted to the new \u201cdynamic kickoff\u201d better than every other team in the NFL. This is how they\u2019ve done it.", href: "https://www.nytimes.com/athletic/6820928/2025/11/21/nfl-dyanmic-kickoffs-seahawks-panthers/", imageUrl: "https://static01.nyt.com/athletic/uploads/wp/2025/11/20161106/1121_NFLDynamicKickoff.png?width=400&quality=70" },
      { type: "subhed", text: "Advantage, Patriots" },
      { type: "subhed", text: "Methodology" },
      { type: "ad-container", position: "mid3" },
      { type: "puzzle-entry-point", game: "Connections: Sports Edition", title: "Connections: Sports Edition", subtitle: "Find the hidden link between sports terms" },
      { type: "author-bio" },
    ],
  },
  /* ── NYT Upshot — Winter Olympics Medal Analysis ─────────────────── */
  {
    id: "winter-olympics-leaders-nations",
    title: "Who Won the Olympics? All the Ways to Count We Could Think Of.",
    alternativeHeadline: "Who Won the Winter Olympics? We (Over) Analyzed the Medal Standings.",
    url: "https://www.nytimes.com/2026/02/22/upshot/winter-olympics-leaders-nations.html",
    authors: ["Ben Blatt"],
    date: "2026-02-22",
    section: "The Upshot",
    type: "article" as const,
    description: "An analysis of the Winter Olympics medal standings through multiple lenses — by event type, surface, gender, team vs individual, and latitude.",
    ogImage: "https://static01.nyt.com/images/2026/02/21/multimedia/00up-norway1-vlbj/00up-norway1-vlbj-facebookJumbo.jpg",
    tags: ["Olympic Games (2026)", "Records and Achievements", "Norway", "United States"],
    graphicsCount: 6,
    figuresCount: 0,
    tools: {
      topper: "lead photo",
      charts: "Birdkit (6 Svelte tables)",
      framework: "Svelte (SvelteKit)",
      hosting: "static01.nytimes.com/newsgraphics/",
    },
    chartTypes: [
      { type: "birdkit-table", tool: "Birdkit/Svelte CTableDouble", topic: "Number of Events Won (the Standard Count)" },
      { type: "birdkit-table", tool: "Birdkit/Svelte CTableDouble", topic: "Events on Snow / Ice Rink / Sliding Track / Judge" },
      { type: "birdkit-table", tool: "Birdkit/Svelte CTableDouble", topic: "Team / Individual / Men's / Women's Events" },
      { type: "birdkit-table", tool: "Birdkit/Svelte CTableDouble", topic: "Number of Athletes Who Won Medals" },
      { type: "birdkit-table", tool: "Birdkit/Svelte CTableDouble", topic: "Mid-Latitude Countries" },
      { type: "birdkit-table-interactive", tool: "Birdkit/Svelte CTable", topic: "Choose Your Own Medal Table (dropdown selector)" },
    ],
    /** Color palette — medal circle and table colors extracted from the live Birdkit Svelte tables */
    colors: {
      /** Medal circle colors used in the Birdkit CTableDouble / CTable components */
      chartPalette: {
        gold: "#C9B037",              // Olympic gold medal circle
        silver: "#A8A8A8",            // Olympic silver medal circle
        bronze: "#AD8A56",            // Olympic bronze medal circle
        leadingRowText: "#121212",    // Bold/usabold class on leading-row country names
        tableHoverBg: "#f7f5f0",      // Table background on hover
        sourceText: "#727272",        // Table source/credit text
        storylineNavBorder: "#DFDFDF", // Storyline nav bar bottom border
        liveLabelRed: "#D0021B",      // Live label text color
        leadingRowBg: "transparent",  // Leading row background
      },
    },
    quoteSections: [],
    /** Fonts used on this page — names match the actual @font-face declarations in production CSS */
    fonts: [
      {
        name: "nyt-cheltenham",
        cssVar: "--g-chelt",
        fullStack: 'nyt-cheltenham, cheltenham-fallback-georgia, cheltenham-fallback-noto, georgia, "times new roman", times, serif',
        weights: [300, 500, 700],
        role: "Display headlines + interactive table title — serif editorial typeface",
        usedIn: [
          "h1.Headline (css-88wicj): 31px/700/36px font-style:italic text-align:left #121212 (desktop: 40px/46px)",
          "p.Summary (css-79rysd): 20px/300/25px font-style:normal #363636 (desktop: 23px/30px)",
          "div.ChooseTitle (svelte-8xprw7 .MainTitle): 20px/500/- text-wrap:balance #121212",
        ],
      },
      {
        name: "nyt-franklin",
        cssVar: "--g-franklin",
        fullStack: '"nyt-franklin", arial, helvetica, sans-serif',
        weights: [400, 500, 700, 800],
        role: "Primary sans-serif — nav, byline, labels, table text, medal data, storyline bar",
        usedIn: [
          "p.Byline (css-4anu6l): 14px/700/18px #363636 (desktop: 15px/20px)",
          "time.Timestamp (css-1ubbotv): 13px/500/18px #363636",
          "td.MedalCountry (svelte-3ieccj .country): 14px/400/- #363636 (standard rows)",
          "td.MedalCountryBold (svelte-3ieccj .usabold): 14px/700/- #121212 (leading country)",
          "td.MedalValue (svelte-3ieccj .medal): 14px/400/- text-align:center #363636",
          "td.MedalValueBold (svelte-3ieccj .medal.usabold): 14px/700/- text-align:center #121212",
          "div.TableSubtitle (svelte-3ieccj .subtitle): 13px/700/- uppercase #363636",
          "div.TableSource (svelte-3ieccj .alt-source): 12px/400/- #727272",
          "select.Dropdown (svelte-8xprw7): 16px/400/- #121212 border:1px solid #ccc",
          "span.StorylineBrand (css-1uhlowv): 14px/700/14px #121212 border-right:1px solid #DFDFDF",
          "span.StorylineNavLink (css-fi5tub): 13px/500/- #121212 (desktop: 14px)",
          "span.LiveLabel (css-nyit7w): 12px/800/12px letter-spacing:0.06em uppercase #D0021B",
          "div.AudioLabel (css-1nnq2i0): 12px/500/- #121212",
          "button.ShareButton (css-10d8k1f): 12px/500/15px uppercase #121212",
        ],
      },
      {
        name: "nyt-imperial",
        cssVar: "--g-imperial",
        fullStack: '"nyt-imperial", georgia, "times new roman", times, serif',
        weights: [400, 500],
        role: "Article body text — primary reading font for long-form journalism",
        usedIn: [
          "p.BodyText (css-ac37hb): 18px/400/25px #363636 (desktop: 20px/30px)",
          "span.ImageCaption (css-jevhma): 14px/400/18px #727272 (desktop: 15px/20px)",
          "span.ImageCredit (css-iwa86d): 12px/400/16px #727272",
        ],
      },
    ],
    /** Brand-specific font context — which NYT brand fonts appear on this page */
    brandFonts: {
      editorial: ["nyt-cheltenham", "nyt-imperial"],
      graphics: ["nyt-franklin"],
      games: [],
    },
    /** Birdkit framework architecture — NYT's internal interactive graphics platform */
    architecture: {
      framework: "Birdkit (Svelte/SvelteKit)",
      projectId: "bk-0kGxO_MFoiTWuw",
      hydrationId: "7a3f2b1c9e8d4f6a",
      hosting: "static01.nytimes.com/newsgraphics/",
      hierarchy: [
        "div#story-top (vi platform wrapper — same as Sweepstakes/Upshot)",
        "  header (headline italic h1, byline, sharetools — React/vi platform)",
        "  figure.lead-image (cross-country skiing photo — nyt-imperial caption + credit)",
        "  div.storyline-nav (Milan 2026 branded nav — nyt-franklin 700/500, border-bottom #DFDFDF)",
        "    span.brand (14px/700 'The Upshot' + border-right #DFDFDF)",
        "    span.live-label (12px/800 uppercase #D0021B 'LIVE')",
        "    a.nav-link (13px/500 → 14px desktop, Updates/Medal Count/Photo Highlights/Schedule/Athletes)",
        "  article (body text — nyt-imperial 18px/400 mobile → 20px/400 desktop)",
        "  div.birdkit-embed[data-birdkit-hydrate] (6 Svelte table components)",
        "    CTableDouble (5 instances — double-header medal table with sub-categories)",
        "      div.subtitle (13px/700 uppercase #363636)",
        "      table (14px/400 #363636, bold-row 14px/700 #121212)",
        "      div.medal-circles (gold:#C9B037, silver:#A8A8A8, bronze:#AD8A56)",
        "      div.alt-source (12px/400 #727272)",
        "    CTable (1 instance — interactive dropdown for custom medal permutations)",
        "      div.MainTitle (nyt-cheltenham 500 20px text-wrap:balance #121212)",
        "      select.dropdown (nyt-franklin 16px/400 border:1px solid #ccc)",
        "      table (same styling as CTableDouble)",
      ],
      layoutTokens: {
        bodyWidth: "600px (vi platform standard — same as Trump/Sweepstakes)",
        marginInline: "20px",
        bodyFontSize: "1.125rem (18px mobile, 20px desktop)",
        bodyLineHeight: "1.389 (25px mobile, 30px desktop)",
        bodyColor: "#363636",
        headlineFont: "nyt-cheltenham 700 italic 31px/36px (mobile) → 40px/46px (desktop)",
        summaryFont: "nyt-cheltenham 300 20px/25px (mobile) → 23px/30px (desktop)",
        tableWidth: "100% within 600px body column",
        medalCircleSize: "16px diameter inline",
        storylineNavHeight: "44px (sticky on scroll)",
      },
      cssFiles: [
        "index.D_Z5vxLa.css",
        "index.By_0uuml.css",
        "index.BA3E211K.css",
        "index.CyB6tk6K.css",
      ],
      publicAssets: {
        leadImage: {
          articleLarge: { url: "https://static01.nyt.com/images/2026/02/21/multimedia/00up-norway1-vlbj/00up-norway1-vlbj-articleLarge.jpg", desc: "Cross-country skiing photo by Vincent Alban/NYT (articleLarge)" },
          superJumbo: { url: "https://static01.nyt.com/images/2026/02/21/multimedia/00up-norway1-vlbj/00up-norway1-vlbj-superJumbo.jpg", desc: "Cross-country skiing photo by Vincent Alban/NYT (superJumbo)" },
        },
        socialImages: [
          { name: "facebookJumbo", url: "https://static01.nyt.com/images/2026/02/21/multimedia/00up-norway1-vlbj/00up-norway1-vlbj-facebookJumbo.jpg", ratio: "1.91:1", desc: "Facebook/OG share image" },
          { name: "video16x9-3000", url: "https://static01.nyt.com/images/2026/02/21/multimedia/00up-norway1-vlbj/00up-norway1-vlbj-videoSixteenByNine3000.jpg", ratio: "16:9", width: 3000, desc: "Twitter card image" },
          { name: "video16x9-1600", url: "https://static01.nyt.com/images/2026/02/21/multimedia/00up-norway1-vlbj/00up-norway1-vlbj-videoSixteenByNineJumbo1600.jpg", ratio: "16:9", width: 1600, desc: "JSON-LD primary image" },
          { name: "google4x3", url: "https://static01.nyt.com/images/2026/02/21/multimedia/00up-norway1-vlbj/00up-norway1-vlbj-googleFourByThree.jpg", ratio: "4:3", width: 800, desc: "Google Discover image" },
          { name: "square3x", url: "https://static01.nyt.com/images/2026/02/21/multimedia/00up-norway1-vlbj/00up-norway1-vlbj-mediumSquareAt3X.jpg", ratio: "1:1", width: 1000, desc: "Square thumbnail" },
        ],
        authorHeadshot: { url: "https://static01.nyt.com/images/2023/10/24/reader-center/author-ben-blatt/author-ben-blatt-thumbLarge.png", desc: "Ben Blatt headshot" },
        olympicsNavBar: "Milan 2026 branded storyline navigation — Updates, Medal Count, Photo Highlights, Schedule, Athletes",
      },
    },
    contentBlocks: [
      { type: "header" },
      { type: "byline" },
      { type: "featured-image", url: "https://static01.nyt.com/images/2026/02/21/multimedia/00up-norway1-vlbj/00up-norway1-vlbj-articleLarge.jpg", caption: "Cross-country skiing is part of Norway\u2019s culture and was a source of many of its medals.", credit: "Vincent Alban/The New York Times" },
      { type: "storyline", title: "Milan 2026 Olympics", links: [
        { label: "Updates", href: "https://www.nytimes.com/athletic/live-blogs/winter-olympics-closing-ceremony-2026-milano-cortina-live-updates/hD4tQ8cqQeun/" },
        { label: "Medal Count", href: "https://www.nytimes.com/interactive/2026/02/09/upshot/olympics-medal-table-milan-cortina.html" },
        { label: "Photo Highlights", href: "https://www.nytimes.com/interactive/2026/02/09/world/olympics/winter-olympics-milano-cortina-photos.html" },
        { label: "Who Won the Olympics?", href: "https://www.nytimes.com/2026/02/22/upshot/winter-olympics-leaders-nations.html" },
        { label: "Post-Olympic Blues", href: "https://www.nytimes.com/2026/02/22/sports/athletes-post-winter-olympics-blues.html" },
      ] },
      { type: "birdkit-table", title: "Number of Events Won (the Standard Count)", route: "/olympics-alttop" },
      { type: "birdkit-table", title: "Events on Snow / Events on an Ice Rink / Events on Sliding Track / Events With a Judge", route: "/olympics-double2" },
      { type: "birdkit-table", title: "Team Events / Individual Events / Men's Events / Women's Events", route: "/olympics-double1" },
      { type: "birdkit-table", title: "Number of Athletes Who Won Medals", route: "/olympics-athleteonly" },
      { type: "birdkit-table", title: "Mid-Latitude Countries", route: "/olympics-double3" },
      { type: "birdkit-table-interactive", title: "Choose Your Own Medal Table", route: "/olympics-choose" },
      { type: "related-link", title: "Milan-Cortina Olympics: Who Leads the Medal Count?", url: "https://www.nytimes.com/interactive/2026/02/09/upshot/olympics-medal-table-milan-cortina.html", imageUrl: "https://static01.nyt.com/images/2024/06/18/upshot/which-country-leads-olympic-medal-count-1721915112359/which-country-leads-olympic-medal-count-1721915112359-threeByTwoSmallAt2X.png", summary: "It can depend on who\u2019s counting \u2014 and how." },
      { type: "author-bio" },
    ],
  },
] as const;

/** Returns article sub-links for the sidebar "Pages" sub-section */
export function getArticleSubLinks(): { slug: string; label: string }[] {
  return ARTICLES.filter((a) => !a.url.includes("/athletic/")).map((a) => ({ slug: a.id, label: a.title }));
}

/** Returns Athletic article sub-links for the sidebar "Pages" sub-section */
export function getAthleticArticleSubLinks(): { slug: string; label: string }[] {
  return ARTICLES.filter((a) => a.url.includes("/athletic/")).map((a) => ({ slug: a.id, label: a.title }));
}

/* ── Game Articles (per-game design docs) ───────────────────────── */

export interface GameArticle {
  id: string;
  name: string;
  description: string;
  ogImage: string;
  ogDescription: string;
  themeColor: string;
  pageName: string;
  canonical: string;
  cssChunks: string[];
  jsChunkCount: number;
  darkModeKey: string | null;
  adUnitPath: string;
  /** Wordle-specific: A/B test keys active on this game page */
  abTestKeys: string[];
}

export const GAME_ARTICLES: GameArticle[] = [
  {
    id: "wordle",
    name: "Wordle",
    description: "Five-letter word puzzle — 5×6 grid, keyboard, flip animations, share grid",
    ogImage: "https://www.nytimes.com/games-assets/v2/assets/wordle/wordle_og_1200x630.png",
    ogDescription: "Guess the hidden word in 6 tries. A new puzzle is available each day.",
    themeColor: "#6aaa64",
    pageName: "wordle",
    canonical: "https://www.nytimes.com/games/wordle/index.html",
    cssChunks: [
      "9732.7ce4680f79ecd56b1aaa.css",
      "6116.31d5c85b4dc87f1a44b5.css",
      "9236.9cff01cea7c2e4b748ea.css",
      "5526.e734c135b0e643575c4b.css",
      "8824.b7ad7b8a950ed2afca91.css",
      "wordle.0bec8c26deed24ea271e.css",
    ],
    jsChunkCount: 28,
    darkModeKey: "nyt-wordle-darkmode",
    adUnitPath: "wordle",
    abTestKeys: [
      "ON_wordleOnboardingOffer_0822",
      "ON_wordle_regi_modal",
      "GAMES_createWordle_puzzles_0425",
      "DFP_WordleSkipFade_0524",
      "DFP_WordleSkip",
      "DFP_WordleMobile_0423",
      "DFP_WordleAdRefresh",
      "dfp_wordle_ad",
      "AMS_WELCOME_SCREEN_CTA_WORDLE",
    ],
  },
  {
    id: "spelling-bee",
    name: "Spelling Bee",
    description:
      "Pangram word puzzle — honeycomb letter grid with 7 hexagonal cells, center-letter constraint, ranking meter from Beginner to Queen Bee",
    ogImage:
      "https://www.nytimes.com/games-assets/v2/assets/spelling-bee/spelling-bee_og_1200x630.png",
    ogDescription:
      "How many words can you make with 7 letters? Find the pangram for maximum points.",
    themeColor: "#f7da21",
    pageName: "spelling-bee",
    canonical: "https://www.nytimes.com/puzzles/spelling-bee",
    cssChunks: [],
    jsChunkCount: 0,
    darkModeKey: null,
    adUnitPath: "spelling_bee",
    abTestKeys: [
      "OMA_PAYWALL_SPELLING_BEE",
      "OMA_METER_BEHIND_OMA_SPELLING_BEE_WEB_ONLY",
      "DFP_SpellingBeeSkip",
      "DFP_SpellingBeeMobile",
      "AMS_WELCOME_SCREEN_CTA_SPELLING_BEE",
    ],
  },
  {
    id: "connections",
    name: "Connections",
    description:
      "Category-grouping puzzle — 4×4 grid of 16 words, four hidden groups of four, color-coded difficulty (yellow/green/blue/purple)",
    ogImage:
      "https://www.nytimes.com/games-assets/v2/assets/connections/connections_og_1200x630.png",
    ogDescription:
      "Group 16 words into four categories. Find the connections that link them together.",
    themeColor: "#b4a8ff",
    pageName: "connections",
    canonical: "https://www.nytimes.com/games/connections",
    cssChunks: [],
    jsChunkCount: 0,
    darkModeKey: null,
    adUnitPath: "connections",
    abTestKeys: [
      "GAMES_connectionsDarkMode_0926",
      "GAMES_connectionsSportsLinks_0924",
      "GAMES_androidConnectionsArchive_0924",
      "OMA_ENDSCREENACTIONS_CONNECTIONS",
      "AMS_WELCOME_SCREEN_CTA_CONNECTIONS",
    ],
  },
  {
    id: "strands",
    name: "Strands",
    description:
      "Thematic word-search puzzle — 6×8 letter grid, trace paths through adjacent letters to find themed words and the spangram that spans the board",
    ogImage:
      "https://www.nytimes.com/games-assets/v2/assets/strands/strands_og_1200x630.png",
    ogDescription:
      "Find hidden words in the grid that all relate to a daily theme. Discover the spangram to complete the puzzle.",
    themeColor: "#f8cd05",
    pageName: "strands",
    canonical: "https://www.nytimes.com/games/strands",
    cssChunks: [],
    jsChunkCount: 0,
    darkModeKey: null,
    adUnitPath: "strands",
    abTestKeys: [
      "GAMES_strandsDarkMode_0916",
      "GAMES_strandsBadges_1225",
      "GAMES_strands_archive_0710",
      "DFP_StrandsMobileWeb",
      "OMA_ENDSCREENACTIONS_STRANDS",
      "AMS_WELCOME_SCREEN_CTA_STRANDS",
    ],
  },
  {
    id: "mini",
    name: "The Mini Crossword",
    description:
      "Compact crossword puzzle — 5×5 grid with short clues, quick-solve timer, streak tracking, simplified navigation controls",
    ogImage:
      "https://www.nytimes.com/games-assets/v2/assets/mini/mini_og_1200x630.png",
    ogDescription:
      "A quick, fun mini crossword that you can solve in just a few minutes every day.",
    themeColor: "#95befa",
    pageName: "mini",
    canonical: "https://www.nytimes.com/crosswords/game/mini",
    cssChunks: [],
    jsChunkCount: 0,
    darkModeKey: null,
    adUnitPath: "crosswords",
    abTestKeys: [
      "DFP_MiniSkip",
      "OMA_ENDSCREENACTIONS_MINI",
      "AMS_WELCOME_SCREEN_CTA_MINI_CROSSWORD",
    ],
  },
  {
    id: "tiles",
    name: "Tiles",
    description:
      "Pattern-matching tile puzzle — grid of illustrated tiles, match pairs by visual pattern to clear the board, multiple tileset themes",
    ogImage:
      "https://www.nytimes.com/games-assets/v2/assets/tiles/tiles_og_1200x630.png",
    ogDescription:
      "Match tiles by pattern to clear the board. A relaxing visual puzzle with beautiful illustrated tilesets.",
    themeColor: "#87b683",
    pageName: "tiles",
    canonical: "https://www.nytimes.com/puzzles/tiles",
    cssChunks: [],
    jsChunkCount: 0,
    darkModeKey: null,
    adUnitPath: "tiles",
    abTestKeys: [
      "GAMES_tilesTilesetModal_0125",
      "GAMES_tilesDarkMode_0125",
      "OMA_ENDSCREENACTIONS_TILES",
      "AMS_WELCOME_SCREEN_CTA_TILES",
    ],
  },
  {
    id: "letter-boxed",
    name: "Letter Boxed",
    description:
      "Geometric word puzzle — square with 3 letters on each side, form words by connecting letters across sides, solve in fewest words possible",
    ogImage:
      "https://www.nytimes.com/games-assets/v2/assets/letter-boxed/letter-boxed_og_1200x630.png",
    ogDescription:
      "Connect letters around the square to form words. Use all 12 letters in as few words as possible.",
    themeColor: "#de6b74",
    pageName: "letter-boxed",
    canonical: "https://www.nytimes.com/puzzles/letter-boxed",
    cssChunks: [],
    jsChunkCount: 0,
    darkModeKey: null,
    adUnitPath: "letter_boxed",
    abTestKeys: [
      "GAMES_lbDarkMode_1112",
      "AMS_WELCOME_SCREEN_CTA_LETTER_BOXED",
    ],
  },
  {
    id: "sudoku",
    name: "Sudoku",
    description:
      "Classic number-placement puzzle — 9×9 grid divided into 3×3 boxes, fill digits 1-9 with no repeats per row/column/box, multiple difficulty levels",
    ogImage:
      "https://www.nytimes.com/games-assets/v2/assets/sudoku/sudoku_og_1200x630.png",
    ogDescription:
      "Play Sudoku in easy, medium, and hard difficulties. A new puzzle every day.",
    themeColor: "#f49b38",
    pageName: "sudoku",
    canonical: "https://www.nytimes.com/puzzles/sudoku",
    cssChunks: [],
    jsChunkCount: 0,
    darkModeKey: null,
    adUnitPath: "sudoku",
    abTestKeys: ["OMA_ENDSCREENACTIONS_SUDOKU"],
  },
  {
    id: "vertex",
    name: "Vertex",
    description:
      "Geometric line-drawing puzzle — connect vertices on a geometric figure without crossing lines, increasing complexity per level",
    ogImage:
      "https://www.nytimes.com/games-assets/v2/assets/vertex/vertex_og_1200x630.png",
    ogDescription:
      "Draw lines between dots without crossing. A spatial reasoning puzzle with escalating difficulty.",
    themeColor: "#1a3a5c",
    pageName: "vertex",
    canonical: "https://www.nytimes.com/games/vertex",
    cssChunks: [],
    jsChunkCount: 0,
    darkModeKey: null,
    adUnitPath: "vertex",
    abTestKeys: [],
  },
  {
    id: "crossplay",
    name: "Crossplay",
    description:
      "Collaborative crossword puzzle — real-time multiplayer crossword grid, invite friends to solve together, shared cursor and progress tracking",
    ogImage:
      "https://www.nytimes.com/games-assets/v2/assets/crossplay/crossplay_og_1200x630.png",
    ogDescription:
      "Solve a crossword together in real time with friends. A multiplayer puzzle experience.",
    themeColor: "#6c5ce7",
    pageName: "crossplay",
    canonical: "https://www.nytimes.com/games/crossplay",
    cssChunks: [],
    jsChunkCount: 0,
    darkModeKey: null,
    adUnitPath: "crossplay",
    abTestKeys: ["GAMES_geoLockedCrossPlayCTA_0714"],
  },
  {
    id: "pips",
    name: "Pips",
    description:
      "Dice-based logic puzzle — arrange dice on a grid so that pip counts satisfy row and column constraints, deduction-driven placement mechanics",
    ogImage:
      "https://www.nytimes.com/games-assets/v2/assets/pips/pips_og_1200x630.png",
    ogDescription:
      "Place dice on the board so every row and column adds up. A satisfying logic puzzle with daily challenges.",
    themeColor: "#7c3aed",
    pageName: "pips",
    canonical: "https://www.nytimes.com/games/pips",
    cssChunks: [],
    jsChunkCount: 0,
    darkModeKey: null,
    adUnitPath: "pips",
    abTestKeys: [
      "GAMES_pipsReveal_0525",
      "GAMES_pipsBetaTakedownWarning_0625",
      "AMS_WELCOME_SCREEN_CTA_PIPS",
    ],
  },
  {
    id: "daily-crossword",
    name: "The Daily Crossword",
    description:
      "Full-size crossword puzzle — 15×15 weekday / 21×21 weekend grid, clue list panel, pencil mode, rebus entry, check/reveal tools, timer",
    ogImage:
      "https://www.nytimes.com/games-assets/v2/assets/daily-crossword/daily-crossword_og_1200x630.png",
    ogDescription:
      "The original New York Times daily crossword. Edited by the world's most famous crossword editors since 1942.",
    themeColor: "#000000",
    pageName: "daily",
    canonical: "https://www.nytimes.com/crosswords/game/daily",
    cssChunks: [],
    jsChunkCount: 0,
    darkModeKey: null,
    adUnitPath: "crosswords",
    abTestKeys: [
      "OMA_ENDSCREENACTIONS_DAILY",
      "GAMES_GAMES_CROSS_BOT_PAYWALL",
    ],
  },
  {
    id: "midi",
    name: "The Midi",
    description:
      "Mid-size crossword puzzle — 9×9 grid bridging the Mini and Daily, moderate clue difficulty, timer and streak tracking",
    ogImage:
      "https://www.nytimes.com/games-assets/v2/assets/midi/midi_og_1200x630.png",
    ogDescription:
      "A medium-sized crossword that fits between the Mini and the Daily. The perfect midday puzzle break.",
    themeColor: "#000000",
    pageName: "midi",
    canonical: "https://www.nytimes.com/crosswords/game/midi",
    cssChunks: [],
    jsChunkCount: 0,
    darkModeKey: null,
    adUnitPath: "crosswords",
    abTestKeys: ["AMS_WELCOME_SCREEN_CTA_MIDI_CROSSWORD"],
  },
  {
    id: "flashback",
    name: "Flashback",
    description:
      "Trivia and memory puzzle — answer questions about past events and cultural moments, progressive hint reveals, daily themed challenge",
    ogImage:
      "https://www.nytimes.com/games-assets/v2/assets/flashback/flashback_og_1200x630.png",
    ogDescription:
      "Test your memory of past events and pop culture. A daily trivia game from The New York Times.",
    themeColor: "#c97d4f",
    pageName: "flashback",
    canonical: "https://www.nytimes.com/games/flashback",
    cssChunks: [],
    jsChunkCount: 0,
    darkModeKey: null,
    adUnitPath: "flashback",
    abTestKeys: [],
  },
];

/** Returns game article sub-links for the sidebar nested under NYT Games */
export function getGameArticleSubLinks(): { slug: string; label: string }[] {
  return GAME_ARTICLES.map((g) => ({ slug: g.id, label: g.name }));
}
