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
  { anchor: "games", label: "Games", href: buildDesignDocsPath("nyt-games-articles") },
  { anchor: "layout", label: "Layout" },
  { anchor: "shapes", label: "Shapes & Radius" },
  { anchor: "resources", label: "Resources" },
  { anchor: "tech-stack", label: "Tech Stack" },
  { anchor: "ab-tests", label: "A/B Tests" },
] as const;

/* NYT master brand sub-sections — each tab is its own page */
const NYT_BRAND_SUB_SECTIONS: readonly BrandSubSection[] = [
  { anchor: "homepage", label: "Homepage", href: buildDesignDocsPath("brand-nyt/homepage") },
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

export type SiteHeaderShellLink = {
  label: string;
  href: string;
};

export type SiteHeaderShellColumn = {
  heading?: string;
  links: readonly SiteHeaderShellLink[];
};

export type SiteHeaderShellPromoItem = {
  title: string;
  description: string;
  href: string;
  imageUrl?: string;
};

export type SiteHeaderShellPromoGroup = {
  heading: string;
  items: readonly SiteHeaderShellPromoItem[];
  ctaLabel?: string;
  ctaHref?: string;
};

export type SiteHeaderShellMenuSection = {
  label: string;
  href: string;
  columns: readonly SiteHeaderShellColumn[];
  promoGroups?: readonly SiteHeaderShellPromoGroup[];
};

export type SiteHeaderShellSearchPanel = {
  title: string;
  placeholder: string;
  links: readonly {
    label: string;
    href: string;
    description?: string;
  }[];
};

export type SiteHeaderShellAccountSection = {
  heading: string;
  links: readonly SiteHeaderShellLink[];
};

export type SiteHeaderShellAccountPanel = {
  email: string;
  greeting: string;
  relationshipCopy: string;
  subscribeLabel: string;
  subscribeHref: string;
  alternateLoginLabel: string;
  alternateLoginHref: string;
  sections: readonly SiteHeaderShellAccountSection[];
  logoutLabel: string;
  logoutHref: string;
};

export type EditableChartPoint = {
  x: string | number;
  y: number;
  label?: string;
};

export type EditableChartSeries = {
  label: string;
  color: string;
  strokeWidth?: number;
  points: readonly EditableChartPoint[];
};

export type EditableChartBar = {
  label: string;
  value: number;
  valueLabel?: string;
  color?: string;
};

export type EditableDatawrapperChartSpec = {
  mode: "line" | "multi-line" | "diverging-bars";
  subtitle?: string;
  height?: number;
  unit?: string;
  unitPosition?: "prefix" | "suffix";
  decimals?: number;
  xAxisLabel?: string;
  yAxisLabel?: string;
  xTicks?: readonly (string | number)[];
  yTicks?: readonly number[];
  yDomain?: readonly [number, number];
  series?: readonly EditableChartSeries[];
  bars?: readonly EditableChartBar[];
  source?: string;
  credit?: string;
  note?: string;
  originalUrl?: string;
  editableElements?: readonly string[];
};

export type ContentBlock =
  | {
      type: "site-header-shell";
      title: string;
      primitiveId?: string;
      mastheadSpacerHeight?: number;
      subscribeLabel?: string;
      subscribeHref?: string;
      accountLabel?: string;
      menuSections?: readonly SiteHeaderShellMenuSection[];
      searchPanel?: SiteHeaderShellSearchPanel;
      accountPanel?: SiteHeaderShellAccountPanel;
    }
  | { type: "sticky-header"; title: string; behavior: string; elements: readonly string[] }
  | { type: "header" }
  | { type: "byline" }
  | {
      type: "sharetools-bar";
      buttons: readonly { label: string; kind: "share" | "save" | "gift" | "more" }[];
      tier: "tier-2-facsimile";
    }
  | {
      type: "ai2html";
      title: string;
      note: string;
      credit: string;
      source?: string;
      overlaySet?:
        | "sweepstakes-flowchart"
        | "trump-tariffs-us-imports-topper"
        | "trade-treemap";
      artboards: { mobile: Ai2htmlArtboard; desktop: Ai2htmlArtboard };
    }
  | { type: "body-copy"; html: string }
  | {
      type: "body-section-outline";
      title: string;
      source: string;
      sections: readonly {
        sourceIndex: number;
        role: string;
        className?: string;
        firstSentence: string;
      }[];
    }
  | { type: "subhed"; text: string }
  | {
      type: "birdkit-chart";
      id: string;
      title: string;
      source: string;
    }
  | { type: "static-chart-image"; title: string; url: string; caption: string; credit: string }
  | {
      type: "nyt-chart-facsimile";
      title: string;
      subtitle?: string;
      chartKind: "diverging-bars" | "line-crossover" | "cohort-lines" | "survey-bars" | "callout";
      source: string;
      credit: string;
      evidence: "direct-image" | "secondary-source" | "inferred-pending-capture";
      note?: string;
      imageUrl?: string;
      rows?: readonly { label: string; value: number; valueLabel: string }[];
      callouts?: readonly { label: string; value: string; note: string }[];
    }
  | { type: "component-inventory"; title: string; groups: readonly { label: string; items: readonly string[] }[] }
  | { type: "birdkit-table"; title: string; route: string }
  | { type: "birdkit-table-interactive"; title: string; route: string }
  | { type: "datawrapper-table"; id: string; title: string; note: string; source: string; url: string }
  | { type: "showcase-link"; title: string; excerpt: string; href: string; imageUrl?: string }
  | { type: "twitter-embed"; author: string; handle: string; text: string; date: string; url: string }
  | { type: "ad-container"; position: string }
  | { type: "puzzle-entry-point"; game: string; title: string; subtitle: string }
  | { type: "featured-image"; url?: string; caption?: string; credit: string }
  | { type: "storyline"; primitiveId?: string; title?: string; links?: readonly { label: string; href: string }[] }
  | { type: "author-bio" }
  | { type: "related-link"; title: string; url: string; imageUrl: string; summary: string }
  | { type: "site-footer"; title: string; columns: readonly { label: string; links: readonly string[] }[] }
  | { type: "quote"; section: string; badge: string; badgeColor: string; text?: string; citation?: string }
  | { type: "datawrapper-chart"; id: string; title: string; chartType: string; url: string; source?: string; note?: string; height?: number; editableChart?: EditableDatawrapperChartSpec }
  | { type: "birdkit-countdown"; label: string; daysLeft: number }
  | { type: "birdkit-animated-headline"; variants: readonly string[] }
  | { type: "birdkit-state-selector"; stateCount: number; defaultState: string }
  | { type: "birdkit-calendar"; months: readonly string[]; categories: readonly { key: string; label: string; color: string }[] }
  | { type: "birdkit-state-data-section"; title: string }
  | { type: "correction"; text: string; date: string }
  | { type: "filter-card-tracker"; title: string; colorScheme: string; cardCount: number; filters: readonly { label: string; options: readonly string[] }[]; searchEnabled: boolean; expandCollapse: boolean }
  | { type: "video-embed"; streamId: string; sources: readonly { type: string; url: string }[] }
  | { type: "tariff-country-table"; title: string; source: string; noteText: string }
  | { type: "tariff-rate-arrow-chart"; title: string; leadin: string; source: string; credit: string }
  | { type: "tariff-rate-table"; title: string; leadin: string; source: string; credit: string; initialVisibleRows?: number }
  | { type: "debate-speaking-time-chart"; title: string; note: string }
  | { type: "debate-topic-bubble-chart"; title: string; note: string }
  | { type: "reporting-credit"; text: string };

export const CONTENT_BLOCK_TYPE_IDS = [
  "site-header-shell",
  "sticky-header",
  "header",
  "byline",
  "sharetools-bar",
  "ai2html",
  "body-copy",
  "body-section-outline",
  "subhed",
  "birdkit-chart",
  "static-chart-image",
  "nyt-chart-facsimile",
  "component-inventory",
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
  "site-footer",
  "quote",
  "datawrapper-chart",
  "birdkit-countdown",
  "birdkit-animated-headline",
  "birdkit-state-selector",
  "birdkit-calendar",
  "birdkit-state-data-section",
  "correction",
  "filter-card-tracker",
  "video-embed",
  "tariff-country-table",
  "tariff-rate-arrow-chart",
  "tariff-rate-table",
  "debate-speaking-time-chart",
  "debate-topic-bubble-chart",
  "reporting-credit",
] as const satisfies readonly ContentBlock["type"][];

/* ── Article References ──────────────────────────── */
export const ARTICLES = [
  /* -- NYT News Article - Fertility Rates Record Low ---------------- */
  {
    id: "fertility-rates-decline",
    title: "U.S. Fertility Rates Drop to Another Record Low",
    url: "https://www.nytimes.com/2026/04/09/us/fertility-rates-decline.html",
    authors: ["Sabrina Tavernise"],
    date: "2026-04-09",
    section: "U.S.",
    type: "article" as const,
    description: "A standard NYT news article on 2025 fertility data, built around a lead news photo, article-shell typography, and a federal data reference from the National Center for Health Statistics.",
    ogImage: "https://static01.nyt.com/images/2026/04/09/multimedia/09nat-us-census-pchv/09nat-us-census-pchv-facebookJumbo.jpg",
    featuredImage: {
      name: "leadImageArticleLarge",
      url: "https://static01.nyt.com/images/2026/04/09/multimedia/09nat-us-census-pchv/09nat-us-census-pchv-articleLarge.jpg",
      category: "Lead photo",
      ratio: "1.5:1",
      desc: "Adult hand holding a baby's hand, used as the article's lead news image",
      sectionLabel: "Lead Image",
    },
    tags: ["Birth Rates", "Fertility", "Teenagers and Adolescence", "Demographics", "National Center for Health Statistics", "Centers for Disease Control and Prevention", "United States"],
    graphicsCount: 0,
    figuresCount: 1,
    tools: {
      topper: "lead news photo",
      charts: "none",
      components: "site header, masthead, article header, action bar, lead-image figure, reading column, author bio",
      framework: "NYT standard article shell",
      hosting: "nytimes.com article shell + static01.nyt.com image CDN",
    },
    chartTypes: [],
    quoteSections: [],
    cssInfo: {
      styleRules: "standard article shell",
      cssFile: "NYT article shell CSS modules",
      stylesheets: "NYT web fonts + article shell styles",
      loadTime: "not captured",
    },
    typographyGroups: [
      {
        label: "Header",
        families: ["nyt-cheltenham", "georgia"],
        weightCount: 3,
        styleCount: 2,
        samples: [
          {
            label: "Headline",
            text: "U.S. Fertility Rates Drop to Another Record Low",
            fontFamily: 'nyt-cheltenham, cheltenham-fallback-georgia, cheltenham-fallback-noto, georgia, "times new roman", times, serif',
            fontSize: 42,
            fontWeight: 700,
            lineHeight: "48px",
            color: "#121212",
          },
          {
            label: "Summary deck",
            text: "The fertility rate has been falling since 2007, in large part because of a plunge among teenagers.",
            fontFamily: 'nyt-cheltenham, cheltenham-fallback-georgia, cheltenham-fallback-noto, georgia, "times new roman", times, serif',
            fontSize: 23,
            fontWeight: 300,
            lineHeight: "28px",
            color: "#363636",
          },
        ],
      },
      {
        label: "Article Chrome",
        families: ["nyt-franklin", "arial"],
        weightCount: 3,
        styleCount: 6,
        samples: [
          {
            label: "Masthead",
            text: "The New York Times",
            fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
            fontSize: 15,
            fontWeight: 700,
            lineHeight: "18px",
            color: "#121212",
          },
          {
            label: "Action row",
            text: "Listen · 3:19 min · Share full article · 608",
            fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
            fontSize: 12,
            fontWeight: 500,
            lineHeight: "15px",
            color: "#121212",
          },
        ],
      },
      {
        label: "Body and Media",
        families: ["nyt-imperial", "georgia"],
        weightCount: 2,
        styleCount: 3,
        samples: [
          {
            label: "Body text",
            text: "Standard NYT reading column body copy",
            fontFamily: '"nyt-imperial", georgia, "times new roman", times, serif',
            fontSize: 20,
            fontWeight: 400,
            lineHeight: "30px",
            color: "#121212",
          },
          {
            label: "Image caption",
            text: "The fertility rate has been falling since 2007.",
            fontFamily: '"nyt-imperial", georgia, "times new roman", times, serif',
            fontSize: 14,
            fontWeight: 400,
            lineHeight: "19px",
            color: "#363636",
          },
        ],
      },
    ],
    fonts: [
      {
        name: "nyt-cheltenham",
        cssVar: "--g-chelt",
        fullStack: 'nyt-cheltenham, cheltenham-fallback-georgia, cheltenham-fallback-noto, georgia, "times new roman", times, serif',
        weights: [300, 500, 700],
        role: "Display serif for headline and article summary treatment",
        usedIn: [
          "h1.Headline: NYT Cheltenham display headline",
          "p.Summary: NYT Cheltenham deck/summary",
        ],
      },
      {
        name: "nyt-franklin",
        cssVar: "--g-franklin",
        fullStack: '"nyt-franklin", arial, helvetica, sans-serif',
        weights: [400, 500, 700],
        role: "Sans-serif UI chrome, byline, timestamp, image credit, and action controls",
        usedIn: [
          "p.Byline: Franklin byline link treatment",
          "time.Timestamp: Franklin timestamp text",
          "button.ShareButton / save controls: compact Franklin UI",
          "span.ImageCredit: small Franklin credit line",
        ],
      },
      {
        name: "nyt-imperial",
        cssVar: "--g-imperial",
        fullStack: '"nyt-imperial", georgia, "times new roman", times, serif',
        weights: [400, 500],
        role: "Article body text and image caption serif",
        usedIn: [
          "p.BodyText: standard NYT reading column body copy",
          "span.ImageCaption: lead-image caption text",
        ],
      },
    ],
    brandFonts: {
      editorial: ["nyt-cheltenham", "nyt-imperial"],
      graphics: ["nyt-franklin"],
      games: [],
    },
    colors: {
      editorial: {
        primary: "#121212",
        secondary: "#363636",
        faint: "#727272",
        nytBlue: "#326891",
        background: "#FFFFFF",
        divider: "#DFDFDF",
      },
    },
    colorCategories: [
      {
        label: "Article Shell",
        colors: [
          { name: "Headline and masthead ink", hex: "#121212", note: "Headline, logo, and primary action icons" },
          { name: "Deck and caption text", hex: "#363636", note: "Summary deck, caption, and secondary editorial copy" },
          { name: "Muted UI text", hex: "#727272", note: "Section labels, timestamps, and auxiliary metadata" },
          { name: "NYT link blue", hex: "#326891", note: "Inline article links and article action affordances" },
          { name: "Hairline border", hex: "#DFDFDF", note: "Header divider and circular action button borders" },
        ],
      },
    ],
    architecture: {
      framework: "NYT standard article template",
      projectId: "nyt-standard-news-article",
      hydrationId: "not-applicable-standard-article",
      hosting: "nytimes.com + static01.nyt.com/images/",
      hierarchy: [
        "main#story (standard NYT article shell)",
        "  site header (masthead row, section navigation, subscribe/account controls)",
        "  article header (headline, summary deck, byline, timestamp)",
        "  action row (Listen control, share full article, share, save, comments)",
        "  figure.lead-image (articleLarge image with caption and credit)",
        "  article body (Imperial reading column with inline source links)",
        "  footer.author-bio (writer-at-large bio and profile link)",
      ],
      layoutTokens: {
        bodyWidth: "600px article reading column",
        marginInline: "20px mobile gutters",
        siteHeader: "NYT masthead centered above a thin #DFDFDF rule",
        headlineFont: "nyt-cheltenham display serif",
        headlineStyle: "left-aligned Cheltenham bold italic display headline",
        deckStyle: "Cheltenham light summary deck below the headline",
        bodyFont: "nyt-imperial 20px/30px reading text",
        bylineFont: "nyt-franklin compact byline",
        imageCaptionFont: "nyt-imperial caption with Franklin credit",
        actionBar: "share/save/listen controls in compact Franklin chrome",
        graphsCharts: "none; this standard article uses a lead photo and inline federal-data reference instead of embedded charts",
      },
      cssFiles: [
        "NYT web-fonts CSS",
        "NYT standard article shell CSS modules",
        "NYT sharetools/action-bar CSS modules",
      ],
      dataArchitecture: {
        charts: "none",
        primaryDataReference: "National Center for Health Statistics provisional fertility data",
        pageType: "standard news article, not bespoke interactive",
      },
      publicAssets: {
        assetInventory: {
          manifestPath: "config-only: existing NYT article-shell asset list; full source bundle not available",
          counts: {
            images: 6,
            inlineSvgs: 0,
            linkedIcons: 5,
            audio: 0,
            figures: 1,
            scripts: 0,
            stylesheets: 0,
          },
        },
        icons: [
          { name: "listen-play", file: "/design-docs/nyt/article-shell/icons/listen-play.svg", size: "32x32", fill: "#121212", usage: "Listen control play icon", element: "button" },
          { name: "gift", file: "/design-docs/nyt/article-shell/icons/gift.svg", size: "19x19", fill: "#121212", usage: "Share full article icon", element: "button" },
          { name: "share", file: "/design-docs/nyt/article-shell/icons/share.svg", size: "18x18", fill: "#121212", usage: "Share action icon", element: "button" },
          { name: "save", file: "/design-docs/nyt/article-shell/icons/save.svg", size: "12x18", fill: "#121212", usage: "Save/bookmark action icon", element: "button" },
          { name: "comments", file: "/design-docs/nyt/article-shell/icons/comments.svg", size: "20x18", fill: "#121212", usage: "Article comments count icon", element: "button" },
        ],
        images: [
          {
            name: "leadImageArticleLarge",
            url: "https://static01.nyt.com/images/2026/04/09/multimedia/09nat-us-census-pchv/09nat-us-census-pchv-articleLarge.jpg",
            category: "lead-image",
            ratio: "1.5:1",
            desc: "Adult hand holding a baby's hand",
          },
          {
            name: "leadImageSuperJumbo",
            url: "https://static01.nyt.com/images/2026/04/09/multimedia/09nat-us-census-pchv/09nat-us-census-pchv-superJumbo.jpg",
            category: "lead-image",
            width: 2048,
            desc: "High-resolution lead image",
          },
        ],
        socialImages: [
          { name: "facebookJumbo", url: "https://static01.nyt.com/images/2026/04/09/multimedia/09nat-us-census-pchv/09nat-us-census-pchv-facebookJumbo.jpg", ratio: "1.91:1", desc: "Facebook/OG share image" },
          { name: "video16x9-1600", url: "https://static01.nyt.com/images/2026/04/09/multimedia/09nat-us-census-pchv/09nat-us-census-pchv-videoSixteenByNineJumbo1600.jpg", ratio: "16:9", width: 1600, desc: "Wide social/video image" },
          { name: "google4x3", url: "https://static01.nyt.com/images/2026/04/09/multimedia/09nat-us-census-pchv/09nat-us-census-pchv-googleFourByThree.jpg", ratio: "4:3", width: 800, desc: "Google Discover image" },
          { name: "square3x", url: "https://static01.nyt.com/images/2026/04/09/multimedia/09nat-us-census-pchv/09nat-us-census-pchv-mediumSquareAt3X.jpg", ratio: "1:1", width: 1000, desc: "Square thumbnail" },
        ],
      },
    },
    contentBlocks: [
      {
        type: "component-inventory",
        title: "NYT Standard Article Component Inventory",
        groups: [
          {
            label: "Header, Menu, Headline, Icons",
            items: [
              "Standard NYT article shell with centered masthead, article headline, summary deck, listen control, share full article, share, save, and comments actions",
              "Article-shell icon set from config evidence: listen play, gift/share-full-article, share arrow, save bookmark, and comments bubble",
              "No article-specific saved full source bundle is available for this entry; component coverage is marked config-backed instead of source-bundle-backed",
            ],
          },
          {
            label: "Components and Assets",
            items: [
              "Lead article image, high-resolution lead image, and four social/OG image crops are enumerated in publicAssets",
              "Lead-image figure preserves caption and Getty credit",
              "Author-bio slot is retained as the near-final article component",
            ],
          },
          {
            label: "Graphs/Charts and Production Stack",
            items: [
              "Charts: none; the article references federal fertility data in article copy rather than embedding a chart component",
              "Framework: NYT standard article shell",
              "Hosting: nytimes.com story route plus static01.nyt.com image CDN",
            ],
          },
        ],
      },
      {
        type: "body-section-outline",
        title: "Body Paragraph and Section First Sentences",
        source: "Existing design-doc config and user-provided NYT article screenshot; no full saved source bundle available",
        sections: [
          { sourceIndex: 1, role: "headline", firstSentence: "U.S. Fertility Rates Drop to Another Record Low" },
          { sourceIndex: 2, role: "summary deck", firstSentence: "The fertility rate has been falling since 2007, in large part because of a plunge among teenagers." },
          { sourceIndex: 3, role: "lead image caption", firstSentence: "The fertility rate has been falling since 2007." },
          { sourceIndex: 4, role: "data reference", firstSentence: "National Center for Health Statistics provisional fertility data." },
        ],
      },
      { type: "header" },
      { type: "byline" },
      {
        type: "sharetools-bar",
        tier: "tier-2-facsimile",
        buttons: [
          { label: "Share full article", kind: "gift" },
          { label: "Share article", kind: "share" },
          { label: "Save article", kind: "save" },
        ],
      },
      {
        type: "featured-image",
        url: "https://static01.nyt.com/images/2026/04/09/multimedia/09nat-us-census-pchv/09nat-us-census-pchv-articleLarge.jpg",
        caption: "The fertility rate has been falling since 2007.",
        credit: "Markus Scholz/picture alliance, via Getty Images",
      },
      { type: "author-bio" },
    ],
  },
  /* -- NYT Upshot Article - Births Decline / Older Mothers ---------- */
  {
    id: "births-decline-older-mothers",
    title: "Women in Their 20s May Not Be Having Babies, but by 45 Most Probably Will",
    url: "https://www.nytimes.com/2026/04/09/upshot/births-decline-older-mothers.html",
    authors: ["Claire Cain Miller"],
    date: "2026-04-09",
    section: "The Upshot",
    type: "article" as const,
    description: "There are reasons to believe the record-low U.S. birthrate could be only temporary as today's young women postpone pregnancy.",
    ogImage: "https://static01.nyt.com/images/2026/04/09/multimedia/2026-04-09-fert-promo-index/2026-04-09-fert-promo-index-facebookJumbo-v8.png",
    featuredImage: {
      name: "fertility-postponement-nyt-social-image",
      url: "https://static01.nyt.com/images/2026/04/09/multimedia/2026-04-09-fert-promo-index/2026-04-09-fert-promo-index-facebookJumbo-v8.png",
      category: "NYT social image",
      ratio: "1.91:1",
      desc: "NYT Open Graph image from the authenticated rendered page; the in-story charts are Datawrapper embeds rather than this promo image.",
      sectionLabel: "Promo Image",
    },
    tags: ["Birth Rates", "Women and Girls", "Population", "Age, Chronological", "United States", "Teenage Pregnancy", "The Upshot", "Datawrapper", "vis-design", "data-vis", "Data Visualization"],
    graphicsCount: 4,
    figuresCount: 21,
    tools: {
      topper: "none",
      charts: "Editable Datawrapper-style chart replicas from source CSVs: LPtw8 v7 annual fertility line, ywEMI v9 completed-fertility line, IWlRs v12 age-group diverging bars, qz8fa v11 age-30/age-45 motherhood cohort lines",
      components: "sticky site header, masthead, hamburger menu, search panel, account drawer, give/subscribe controls, section label, supported-by ad label, article header, byline/timestamp, audio/listen control, gift/share/save/comment/more actions, body paragraph clusters, ad slots, Datawrapper chart figures, related coverage cards, author bio, comments CTA, site index, global footer",
      framework: "NYT vi-story standard article shell + Datawrapper source charts recreated as editable React/SVG chart primitives; Datadog RUM is analytics/observability, not the chart renderer",
      hosting: "nytimes.com article shell; static01.nyt.com media; datawrapper.dwcdn.net chart embeds",
      productionStack: "NYT vi-story route, Samizdat GraphQL, NYT Webpack chunks, static01 CDN, Datawrapper global-v1.js, GTM, Chartbeat, Datadog RUM",
    },
    chartTypes: [
      {
        type: "line-chart",
        tool: "Datawrapper LPtw8 v7",
        topic: "Even as annual fertility falls ... Number of U.S. births per 1,000 women ages 15 to 44",
        source: "Philip Cohen analysis of Centers for Disease Control and Prevention data",
        url: "https://datawrapper.dwcdn.net/LPtw8/7/",
      },
      {
        type: "line-chart",
        tool: "Datawrapper ywEMI v9",
        topic: "... most women eventually have two children, on average; average number of children ever born to women age 45",
        source: "Philip Cohen analysis of Centers for Disease Control and Prevention data",
        url: "https://datawrapper.dwcdn.net/ywEMI/9/",
      },
      {
        type: "diverging-bar",
        tool: "Datawrapper IWlRs v12",
        topic: "Women are postponing pregnancy; change in the U.S. birth rate by age group since 2007",
        source: "Centers for Disease Control and Prevention data",
        url: "https://datawrapper.dwcdn.net/IWlRs/12/",
      },
      {
        type: "cohort-line-chart",
        tool: "Datawrapper qz8fa v11",
        topic: "Fewer women give birth by 30, but most catch up; share of women in the U.S. who are mothers by age",
        source: "Philip Cohen analysis of Centers for Disease Control and Prevention data",
        url: "https://datawrapper.dwcdn.net/qz8fa/11/",
      },
    ],
    quoteSections: [],
    cssInfo: {
      styleRules: "Authenticated Chrome Profile 11 CDP capture: meta 65, Open Graph 6, Twitter 4, stylesheets 10, scripts 93, DOM images 28, SVGs 29, canvases 0, figures 21; mirrored asset manifest adds OG/Twitter media for 30 saved images, 29 inline SVGs, 5 linked icons, and 1 audio file; Blue Button prompt reported OG 6, Facebook 1, Twitter 10, stylesheets 3, scripts 42, content images 1, icons/banners 6, mobile 2, on-page SEO 8, misc meta 9, article 12, application 1",
      cssFile: "NYT vi-story CSS modules plus static01.nytimes.com/newsgraphics/datawrapper/scripts/global-v1.js for iframe resizing/embedding",
      stylesheets: "10 stylesheet/link stylesheet entries observed in the authenticated rendered source",
      loadTime: "Captured through Chrome DevTools Protocol on Profile 11 admin@thereality.report; BuiltWith/Wappalyzer-equivalent stack recorded from script/link inventory",
    },
    typographyGroups: [
      {
        label: "Header",
        families: ["nyt-cheltenham", "georgia"],
        weightCount: 3,
        styleCount: 2,
        samples: [
          {
            label: "Headline",
            text: "Women in Their 20s May Not Be Having Babies, but by 45 Most Probably Will",
            fontFamily: 'nyt-cheltenham, cheltenham-fallback-georgia, cheltenham-fallback-noto, georgia, "times new roman", times, serif',
            fontSize: 40,
            fontWeight: 700,
            lineHeight: "46px",
            color: "#121212",
            fontStyle: "italic",
          },
          {
            label: "Summary deck",
            text: "The record-low U.S. birthrate could be temporary as today's young women postpone pregnancy.",
            fontFamily: 'nyt-cheltenham, cheltenham-fallback-georgia, cheltenham-fallback-noto, georgia, "times new roman", times, serif',
            fontSize: 23,
            fontWeight: 300,
            lineHeight: "30px",
            color: "#363636",
          },
        ],
      },
      {
        label: "Article Chrome",
        families: ["nyt-franklin", "arial"],
        weightCount: 4,
        styleCount: 6,
        samples: [
          {
            label: "Byline",
            text: "By Claire Cain Miller",
            fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
            fontSize: 14,
            fontWeight: 700,
            lineHeight: "18px",
            color: "#363636",
          },
          {
            label: "Action row",
            text: "Listen, share, save and comment controls",
            fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
            fontSize: 12,
            fontWeight: 500,
            lineHeight: "15px",
            color: "#121212",
          },
        ],
      },
      {
        label: "Charts and Graphs",
        families: ["nyt-cheltenham", "nyt-franklin"],
        weightCount: 5,
        styleCount: 8,
        samples: [
          {
            label: "Chart title",
            text: "Women are postponing pregnancy",
            fontFamily: 'nyt-cheltenham, georgia, "times new roman", serif',
            fontSize: 21,
            fontWeight: 600,
            lineHeight: "24px",
            color: "#121212",
          },
          {
            label: "Chart labels",
            text: "15-19, 20-24, 25-29, 30-34, 35-39, 40-44, 45-54",
            fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
            fontSize: 18,
            fontWeight: 500,
            lineHeight: "23px",
            color: "#121212",
          },
          {
            label: "Chart source",
            text: "Source: Centers for Disease Control and Prevention data",
            fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
            fontSize: 11,
            fontWeight: 400,
            lineHeight: "15px",
            color: "#727272",
          },
        ],
      },
      {
        label: "Sticky Header and Footer",
        families: ["nyt-cheltenham-small", "nyt-franklin"],
        weightCount: 4,
        styleCount: 5,
        samples: [
          {
            label: "Sticky article breadcrumb",
            text: "Women in Their 20s May Not Be Having Babies, but by 45 Most Probably Will",
            fontFamily: 'nyt-cheltenham-small, georgia, "times new roman", serif',
            fontSize: 13,
            fontWeight: 400,
            lineHeight: "16px",
            color: "#121212",
          },
          {
            label: "Footer utility links",
            text: "Contact Us, Accessibility, Work with us, Advertise, T Brand Studio",
            fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
            fontSize: 11,
            fontWeight: 500,
            lineHeight: "15px",
            color: "#666666",
          },
        ],
      },
    ],
    fonts: [
      {
        name: "nyt-cheltenham",
        cssVar: "--g-chelt",
        fullStack: 'nyt-cheltenham, cheltenham-fallback-georgia, cheltenham-fallback-noto, georgia, "times new roman", times, serif',
        weights: [300, 500, 700],
        role: "Display headline, deck, and chart title serif",
        usedIn: [
          "h1.Headline: 40px/700/46px italic",
          "p.Summary: 23px/300/30px",
          "h2.interactive-headline: Datawrapper chart title, 21px/600/24px",
        ],
      },
      {
        name: "nyt-cheltenham-small",
        cssVar: "--g-chelt-small",
        fullStack: 'nyt-cheltenham-small, georgia, "times new roman", serif',
        weights: [400],
        role: "Sticky masthead breadcrumb and compact section navigation serif",
        usedIn: [
          "span.StickyArticleTitle: compact sticky article title",
          "span.MastheadBreadcrumb: section/article breadcrumb",
        ],
      },
      {
        name: "nyt-franklin",
        cssVar: "--g-franklin",
        fullStack: '"nyt-franklin", arial, helvetica, sans-serif',
        weights: [400, 500, 600, 700],
        role: "UI chrome, byline, chart labels, source credit, action controls, footer links",
        usedIn: [
          "p.Byline: Franklin byline link treatment",
          "button.ShareButton: compact Franklin UI",
          "span.ChartLabel: age-group labels and value callouts",
          "p.ChartSource: chart source and credit",
          "footer.UtilityLinks: global footer link matrix",
        ],
      },
      {
        name: "nyt-imperial",
        cssVar: "--g-imperial",
        fullStack: '"nyt-imperial", georgia, "times new roman", times, serif',
        weights: [400, 500],
        role: "Article body text",
        usedIn: [
          "p.BodyText: standard NYT reading column body copy",
        ],
      },
    ],
    brandFonts: {
      editorial: ["nyt-cheltenham", "nyt-imperial"],
      graphics: ["nyt-franklin"],
      games: [],
    },
    colors: {
      chartPalette: [
        { name: "Bar slate", hex: "#687D84" },
        { name: "Axis ink", hex: "#555555" },
        { name: "Chart source gray", hex: "#727272" },
        { name: "Datawrapper background", hex: "#FFFFFF" },
      ],
      editorial: {
        primary: "#121212",
        secondary: "#363636",
        faint: "#727272",
        nytBlue: "#326891",
        background: "#FFFFFF",
        divider: "#DFDFDF",
      },
    },
    colorCategories: [
      {
        label: "Article Shell",
        colors: [
          { name: "Headline and masthead ink", hex: "#121212", note: "Headline, logo, and action icons" },
          { name: "Deck and body secondary", hex: "#363636", note: "Deck, byline text, and reading column copy" },
          { name: "Muted metadata", hex: "#727272", note: "Timestamp, chart source, and auxiliary metadata" },
          { name: "NYT link blue", hex: "#326891", note: "Inline article links and action affordances" },
          { name: "Hairline border", hex: "#DFDFDF", note: "Masthead divider and circular action borders" },
        ],
      },
      {
        label: "Charts and Graphs",
        colors: [
          { name: "Horizontal bar fill", hex: "#687D84", note: "Slate data bars in the age-group chart" },
          { name: "Zero axis", hex: "#555555", note: "Vertical baseline separating negative and positive change" },
          { name: "Datawrapper canvas", hex: "#FFFFFF", note: "Iframe chart background in the embedded Datawrapper charts" },
        ],
      },
    ],
    architecture: {
      framework: "NYT vi-story standard article shell with four Datawrapper charts recreated as editable interactive SVG primitives",
      projectId: "births-decline-older-mothers / NYT article 100000010827733",
      hydrationId: "nyt://article/b3cab499-94db-599c-9dee-157050fa290e; Datawrapper source ids 100000010830379, 100000010830538, 100000010830585, 100000010830177",
      hosting: "nytimes.com vi-story route; static01.nyt.com assets; datawrapper.dwcdn.net chart iframes",
      hierarchy: [
        "main#story (NYT article shell)",
        "  sticky site header shell .kyt-wufmy/.kyt-yAURx (skip links, hamburger, search, centered masthead, Give the Times, Account, date, Today's Paper)",
        "  scroll sticky article header (compact title plus gift/share/save/comment/more controls)",
        "  article header .css-1qv3lay (The Upshot, Supported by, SKIP ADVERTISEMENT, headline, deck, Listen 5:47, byline, timestamp)",
        "  action row (Listen, Share full article, share icon, save/bookmark, Read 76 comments)",
        "  article body cluster 1 (Imperial reading column)",
        "  InteractiveBlock datawrapper_LPtw8 (annual fertility line, iframe height 333)",
        "  InteractiveBlock datawrapper_ywEMI (completed fertility age-45 line, iframe height 333)",
        "  article body cluster 2 (postponement transition and demographic timing)",
        "  InteractiveBlock datawrapper_IWlRs (age-group diverging bar chart, iframe height 164)",
        "  article body cluster 3 (education, age 30, age 45, teen pregnancy, survey intent paragraphs)",
        "  InteractiveBlock datawrapper_qz8fa (age 30 vs age 45 motherhood cohort lines, iframe height 335)",
        "  ad slots / story body companion columns",
        "  related fertility coverage cards",
        "  comments CTA (Read 76 comments)",
        "  footer.author-bio",
        "  site index navigation and global NYT footer utility matrix",
      ],
      layoutTokens: {
        bodyWidth: "600px article reading column",
        marginInline: "20px mobile gutters",
        siteHeader: "43px sticky NYT shell with centered masthead and left hamburger/search controls",
        stickyArticleHeader: "48px compact article-title row with share/save controls after masthead scroll threshold",
        headlineFont: "nyt-cheltenham display serif",
        headlineStyle: "left-aligned Cheltenham bold italic display headline",
        deckStyle: "Cheltenham light summary deck below headline",
        bodyFont: "nyt-imperial 20px/30px reading text",
        bylineFont: "nyt-franklin compact byline",
        chartWidth: "600px reading-column editable SVG chart on desktop",
        chartStyle: "Editable Datawrapper-style React/SVG charts with NYT Cheltenham 21px/600 interactive headlines, Franklin labels, hover crosshairs/tooltips, and source/credit footers",
        graphsCharts: "Four authenticated Datawrapper charts are recreated from public data.csv endpoints as editable local chart primitives; original iframe IDs remain in source metadata for traceability. The survey-intent point appears as article copy, not a separate chart in the captured rendered source",
        footer: "global NYT utility footer with company, legal, help, subscription, and product links",
      },
      cssFiles: [
        "10 stylesheet/link stylesheet entries observed in authenticated rendered source",
        "NYT vi-story CSS modules and Webpack chunks",
        "NYT sharetools/action-bar CSS modules",
        "static01.nytimes.com/newsgraphics/datawrapper/scripts/global-v1.js",
      ],
      dataArchitecture: {
        charts: "Source-backed Datawrapper embeds recovered from authenticated Chrome Profile 11/admin@thereality.report rendered HTML and MHTML capture",
        primaryDataReference: "Centers for Disease Control and Prevention data; Philip Cohen analysis for annual fertility, completed fertility, and motherhood-by-age charts",
        pageType: "Upshot article on NYT vi-story route with Datawrapper iframes embedded in the standard article shell",
        sourceAuthority: "Saved source bundle: .agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/rendered.html, snapshot.mhtml, desktop-full.png, extracted-inventory.json",
        chartExtractionAttempts: [
          { chartId: "LPtw8", version: 7, provider: "Datawrapper", sourceId: "100000010830379", iframe: "https://datawrapper.dwcdn.net/LPtw8/7/?plain=1", dataCsv: "https://datawrapper.dwcdn.net/LPtw8/7/data.csv", status: "source-backed embed and public data CSV recovered" },
          { chartId: "ywEMI", version: 9, provider: "Datawrapper", sourceId: "100000010830538", iframe: "https://datawrapper.dwcdn.net/ywEMI/9/?plain=1", dataCsv: "https://datawrapper.dwcdn.net/ywEMI/9/data.csv", status: "source-backed embed and public data CSV recovered" },
          { chartId: "IWlRs", version: 12, provider: "Datawrapper", sourceId: "100000010830585", iframe: "https://datawrapper.dwcdn.net/IWlRs/12/?plain=1", dataCsv: "https://datawrapper.dwcdn.net/IWlRs/12/data.csv", status: "source-backed embed and public data CSV recovered" },
          { chartId: "qz8fa", version: 11, provider: "Datawrapper", sourceId: "100000010830177", iframe: "https://datawrapper.dwcdn.net/qz8fa/11/?plain=1", dataCsv: "https://datawrapper.dwcdn.net/qz8fa/11/data.csv", status: "source-backed embed and public data CSV recovered" },
        ],
        confirmedNonChartSections: [
          "Survey/intent discussion is body copy in the captured source rather than a fifth Datawrapper chart.",
          "Comments count was 76 at capture time.",
          "Authenticated account shell was rendered for admin@thereality.report via Chrome Profile 11.",
        ],
        degradedSourceCoverage: [
          "No full article body text is copied into design docs; body clusters are summarized for copyright safety.",
          "CSS Peeper UI labels are represented through captured computed styles and asset inventory rather than a separate extension export.",
        ],
        chromeExtensionInventory: {
          blueButtonPrompt: {
            openGraph: 6,
            facebook: 1,
            twitter: 10,
            stylesheets: 3,
            scripts: 42,
            contentImages: 1,
            iconsAndBanners: 6,
            mobile: 2,
            onPageSeo: 8,
            miscMeta: 9,
            article: 12,
            application: 1,
          },
          authenticatedCdpCapture: {
            meta: 65,
            openGraph: 6,
            twitter: 4,
            stylesheets: 10,
            scripts: 93,
            images: 28,
            svgs: 29,
            canvases: 0,
            figures: 21,
          },
          cssPeeper: "Text, color, font, image, and SVG evidence captured from rendered DOM/computed styles.",
          builtWithWappalyzer: "Production stack inferred from scripts/link inventory: NYT vi-story, Samizdat GraphQL, Datawrapper, GTM, Chartbeat, Datadog RUM, static01 CDN.",
        },
      },
      articleHeaderCapture: {
        headerClass: "css-1qv3lay euiyums1",
        sectionHref: "https://www.nytimes.com/section/upshot",
        sectionLabel: "The Upshot",
        sponsorLabel: "Supported by",
        skipAdLabel: "SKIP ADVERTISEMENT",
        headlineId: "link-277b3ca0",
        headlineClass: "css-88wicj e1h9rw200",
        summaryId: "article-summary",
        summaryClass: "css-1r45aqf e1wiw3jv0",
        listen: {
          duration: "5:47 min",
          audioSrc: "https://static.nytimes.com/narrated-articles/synthetic/article-b3cab499-94db-599c-9dee-157050fa290e/job-1775759166448/article-b3cab499-94db-599c-9dee-157050fa290e-job-1775759166448.mp3",
        },
        shareTools: {
          commentCount: 76,
          buttons: [
            { label: "Share full article", kind: "gift" },
            { label: "More sharing options", kind: "more" },
            { label: "Save article", kind: "save" },
          ],
        },
        byline: {
          prefix: "By",
          author: "Claire Cain Miller",
          href: "https://www.nytimes.com/by/claire-cain-miller",
          headshotUrl: "https://static01.nyt.com/images/2018/06/13/multimedia/author-claire-cain-miller/author-claire-cain-miller-thumbLarge-v2.png",
        },
        dateLabel: "April 9, 2026",
        datetime: "2026-04-09T14:26:04-04:00",
      },
      publicAssets: {
        authorHeadshot: {
          name: "Claire-Cain-Miller",
          url: "https://static01.nyt.com/images/2018/06/13/multimedia/author-claire-cain-miller/author-claire-cain-miller-thumbLarge-v2.png",
          localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/00-Claire-Cain-Miller.png",
          width: 150,
          height: 150,
        },
        assetInventory: {
          manifestPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/asset-inventory.json",
          counts: {
            images: 30,
            inlineSvgs: 29,
            linkedIcons: 5,
            audio: 1,
            figures: 21,
            scripts: 93,
            stylesheets: 10,
          },
        },
        icons: [
          { name: "hamburger-menu", file: "/design-docs/nyt/article-shell/icons/menu.svg", size: "17x15", fill: "#121212", usage: "Open section navigation", element: "button" },
          { name: "search", file: "/design-docs/nyt/article-shell/icons/search.svg", size: "16x16", fill: "#121212", usage: "Open search panel", element: "button" },
          { name: "listen-play", file: "/design-docs/nyt/article-shell/icons/listen-play.svg", size: "32x32", fill: "#121212", usage: "Listen control play icon", element: "button" },
          { name: "gift", file: "/design-docs/nyt/article-shell/icons/gift.svg", size: "19x19", fill: "#121212", usage: "Share full article icon", element: "button" },
          { name: "share", file: "/design-docs/nyt/article-shell/icons/share.svg", size: "18x18", fill: "#121212", usage: "Share action icon", element: "button" },
          { name: "save", file: "/design-docs/nyt/article-shell/icons/save.svg", size: "12x18", fill: "#121212", usage: "Save/bookmark action icon", element: "button" },
          { name: "comments", file: "/design-docs/nyt/article-shell/icons/comments.svg", size: "20x18", fill: "#121212", usage: "Article comments icon", element: "button" },
        ],
        images: [
          { name: "Claire-Cain-Miller", url: "https://static01.nyt.com/images/2018/06/13/multimedia/author-claire-cain-miller/author-claire-cain-miller-thumbLarge-v2.png", category: "author-headshot", width: 150, height: 150, localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/00-Claire-Cain-Miller.png", status: "saved" },
          { name: "11Well-TouchGrass-SignUp-thumbLarge", url: "https://static01.nyt.com/images/2026/05/11/well/11Well-TouchGrass-SignUp/11Well-TouchGrass-SignUp-thumbLarge.jpg", category: "content-image", width: 150, height: 150, localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/01-11Well-TouchGrass-SignUp-thumbLarge.jpg", status: "saved" },
          { name: "13re-HABITAT-HOUSES-mtqg-thumbLarge", url: "https://static01.nyt.com/images/2026/05/13/multimedia/13re-HABITAT-HOUSES-mtqg/13re-HABITAT-HOUSES-mtqg-thumbLarge.jpg", category: "content-image", width: 150, height: 150, localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/02-13re-HABITAT-HOUSES-mtqg-thumbLarge.jpg", status: "saved" },
          { name: "13ModernLove-Ramy-Youssef-thumbLarge", url: "https://static01.nyt.com/images/2026/05/13/podcasts/13ModernLove-Ramy-Youssef/13ModernLove-Ramy-Youssef-thumbLarge.png", category: "content-image", width: 150, height: 150, localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/03-13ModernLove-Ramy-Youssef-thumbLarge.png", status: "saved" },
          { name: "09nat-us-census-pchv-threeByTwoSmallAt2X", url: "https://static01.nyt.com/images/2026/04/09/multimedia/09nat-us-census-pchv/09nat-us-census-pchv-threeByTwoSmallAt2X.jpg", category: "content-image", width: 600, height: 400, localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/04-09nat-us-census-pchv-threeByTwoSmallAt2X.jpg", status: "saved" },
          { name: "2026-02-12-up-child-care-inflation-inflation-chart-threeByTwoSmallAt2X-v11", url: "https://static01.nyt.com/images/2026/03/02/multimedia/2026-02-12-up-child-care-inflation-inflation-chart/2026-02-12-up-child-care-inflation-inflation-chart-threeByTwoSmallAt2X-v11.png", category: "content-image", width: 600, height: 400, localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/05-2026-02-12-up-child-care-inflation-inflation-chart-threeByTwoSmallAt2X-v11.png", status: "saved" },
          { name: "merlin_189047097_12f15041-8689-429f-8d1b-5682bcf4b65b-threeByTwoSmallAt2X", url: "https://static01.nyt.com/images/2021/06/14/us/14births-top1/merlin_189047097_12f15041-8689-429f-8d1b-5682bcf4b65b-threeByTwoSmallAt2X.jpg", category: "content-image", width: 600, height: 400, localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/06-merlin_189047097_12f15041-8689-429f-8d1b-5682bcf4b65b-threeByTwoSmallAt2X.jpg", status: "saved" },
          { name: "2026-03-19-school-enrollment-dark-mode-promos-thumbLarge", url: "https://static01.nyt.com/images/2026/05/08/multimedia/2026-03-19-school-enrollment-dark-mode-promos/2026-03-19-school-enrollment-dark-mode-promos-thumbLarge.png?quality=75&auto=webp&disable=upscale", category: "content-image", width: 150, height: 150, localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/07-2026-03-19-school-enrollment-dark-mode-promos-thumbLarge.png", status: "saved" },
          { name: "08eks-belluz-image-thumbLarge", url: "https://static01.nyt.com/images/2026/05/08/opinion/08eks-belluz-image/08eks-belluz-image-thumbLarge.jpg?quality=75&auto=webp&disable=upscale", category: "content-image", width: 150, height: 150, localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/08-08eks-belluz-image-thumbLarge.jpg", status: "saved" },
          { name: "07sussman-zgwp-thumbLarge-v3", url: "https://static01.nyt.com/images/2026/05/12/multimedia/07sussman-zgwp/07sussman-zgwp-thumbLarge-v3.jpg?quality=75&auto=webp&disable=upscale", category: "content-image", width: 150, height: 150, localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/09-07sussman-zgwp-thumbLarge-v3.jpg", status: "saved" },
          { name: "The-U.S.-is-the-only-industrialized-nation-not-to-have-paid-family-leave-as-a-fe", url: "https://static01.nyt.com/images/2026/05/02/multimedia/00up-family-leave2-hfpb/00up-family-leave2-hfpb-square640.jpg?quality=75&auto=webp&disable=upscale", category: "content-image", width: 640, height: 640, localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/10-The-U.S.-is-the-only-industrialized-nation-not-to-have-paid-family-leave-as-a-fe.jpg", status: "saved" },
          { name: "2026-05-07-test-scores-story-index-square640-v4", url: "https://static01.nyt.com/images/2026/05/12/multimedia/2026-05-07-test-scores-story-index/2026-05-07-test-scores-story-index-square640-v4.png?quality=75&auto=webp&disable=upscale", category: "content-image", width: 640, height: 640, localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/11-2026-05-07-test-scores-story-index-square640-v4.png", status: "saved" },
          { name: "00HS-cancer-kras-stillpromo-gzfw-square640", url: "https://static01.nyt.com/images/2026/05/08/multimedia/00HS-cancer-kras-stillpromo-gzfw/00HS-cancer-kras-stillpromo-gzfw-square640.jpg?quality=75&auto=webp&disable=upscale", category: "content-image", width: 640, height: 640, localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/12-00HS-cancer-kras-stillpromo-gzfw-square640.jpg", status: "saved" },
          { name: "2026-04-16-school-score-lookup-index-square640-v3", url: "https://static01.nyt.com/images/2026/05/12/multimedia/2026-04-16-school-score-lookup-index/2026-04-16-school-score-lookup-index-square640-v3.png?quality=75&auto=webp&disable=upscale", category: "content-image", width: 640, height: 640, localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/13-2026-04-16-school-score-lookup-index-square640-v3.png", status: "saved" },
          { name: "flashback-promo-2026-05-09-6-square640", url: "https://static01.nyt.com/images/2026/05/08/multimedia/flashback-promo-2026-05-09-6/flashback-promo-2026-05-09-6-square640.jpg?quality=75&auto=webp&disable=upscale", category: "content-image", width: 640, height: 640, localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/14-flashback-promo-2026-05-09-6-square640.jpg", status: "saved" },
          { name: "11met-affordingny-perkins--01-khqj-square640", url: "https://static01.nyt.com/images/2026/05/11/multimedia/11met-affordingny-perkins-promo/11met-affordingny-perkins--01-khqj-square640.jpg?quality=75&auto=webp&disable=upscale", category: "content-image", width: 640, height: 640, localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/15-11met-affordingny-perkins--01-khqj-square640.jpg", status: "saved" },
          { name: "07FD-DUNZO-DINNERS-creamcheeseramen-hjcw-square640", url: "https://static01.nyt.com/images/2026/05/13/multimedia/13FD-DUNZO-DINNERS-creamcheeseramen-hjcw/07FD-DUNZO-DINNERS-creamcheeseramen-hjcw-square640.jpg?quality=75&auto=webp&disable=upscale", category: "content-image", width: 640, height: 640, localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/16-07FD-DUNZO-DINNERS-creamcheeseramen-hjcw-square640.jpg", status: "saved" },
          { name: "The-Strawberry-Breeze-on-the-menu-at-a-Swig-location-in-Utah.-The-brand-has-expa", url: "https://static01.nyt.com/images/2026/05/10/multimedia/10ST-DIRTY-SODA-bjlg/10ST-DIRTY-SODA-bjlg-square640.jpg?quality=75&auto=webp&disable=upscale", category: "content-image", width: 640, height: 640, localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/17-The-Strawberry-Breeze-on-the-menu-at-a-Swig-location-in-Utah.-The-brand-has-expa.jpg", status: "saved" },
          { name: "Jonathan-Haidt-at-New-York-University-in-2024.", url: "https://static01.nyt.com/images/2026/05/13/multimedia/13nat-nyu-graduation-jtcg/13nat-nyu-graduation-jtcg-square640.jpg?quality=75&auto=webp&disable=upscale&width=350", category: "content-image", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/18-Jonathan-Haidt-at-New-York-University-in-2024..jpg", status: "saved" },
          { name: "The-host-of-The-Late-Show-called-it-so-satisfying-to-realize-that-no-matter-how-", url: "https://static01.nyt.com/images/2026/05/14/arts/14latenight/14latenight-square640.jpg?quality=75&auto=webp&disable=upscale&width=350", category: "content-image", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/19-The-host-of-The-Late-Show-called-it-so-satisfying-to-realize-that-no-matter-how-.jpg", status: "saved" },
          { name: "13pol-on-politics-newsletter-trump-pcmh-square640-v3", url: "https://static01.nyt.com/images/2026/05/13/multimedia/13pol-on-politics-newsletter-trump-pcmh/13pol-on-politics-newsletter-trump-pcmh-square640-v3.jpg?quality=75&auto=webp&disable=upscale&width=350", category: "content-image", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/20-13pol-on-politics-newsletter-trump-pcmh-square640-v3.jpg", status: "saved" },
          { name: "There-s-no-mixer-required-for-this-olive-oil-cake.", url: "https://static01.nyt.com/images/2025/06/16/multimedia/16FD-SUMMER-100-Blueberry-Spoon-Cake-pmch-copy/16FD-SUMMER-100-Blueberry-Spoon-Cake-pmch-square640.jpg?quality=75&auto=webp&disable=upscale&width=350", category: "content-image", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/21-There-s-no-mixer-required-for-this-olive-oil-cake..jpg", status: "saved" },
          { name: "Corpus-Christi-s-industrial-port-has-been-expanding-but-new-water-sources-have-n", url: "https://static01.nyt.com/images/2026/05/09/multimedia/09nat-corpus-christi-top-option-bmjq/09nat-corpus-christi-top-option-bmjq-square640.jpg?quality=75&auto=webp&disable=upscale&width=350", category: "content-image", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/22-Corpus-Christi-s-industrial-port-has-been-expanding-but-new-water-sources-have-n.jpg", status: "saved" },
          { name: "08aftab-image-square640", url: "https://static01.nyt.com/images/2026/05/08/opinion/08aftab-image/08aftab-image-square640.jpg?quality=75&auto=webp&disable=upscale&width=350", category: "content-image", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/23-08aftab-image-square640.jpg", status: "saved" },
          { name: "13re-WYG-Belfast-03-square640-v2", url: "https://static01.nyt.com/images/2026/05/13/realestate/13re-WYG-Belfast-03/13re-WYG-Belfast-03-square640-v2.jpg?quality=75&auto=webp&disable=upscale&width=350", category: "content-image", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/24-13re-WYG-Belfast-03-square640-v2.jpg", status: "saved" },
          { name: "12epstein-square640", url: "https://static01.nyt.com/images/2026/05/12/opinion/12epstein/12epstein-square640.jpg?quality=75&auto=webp&disable=upscale&width=350", category: "content-image", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/25-12epstein-square640.jpg", status: "saved" },
          { name: "A-Honda-dealership-in-Osaka-Japan.", url: "https://static01.nyt.com/images/2026/05/14/multimedia/14Biz-Honda-pvqw/14Biz-Honda-pvqw-square640.jpg?quality=75&auto=webp&disable=upscale&width=350", category: "content-image", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/26-A-Honda-dealership-in-Osaka-Japan..jpg", status: "saved" },
          { name: "Alex-Murdaugh-convicted-of-killing-his-wife-Maggie-and-younger-son-Paul-in-June-", url: "https://static01.nyt.com/images/2026/05/13/multimedia/13nat-murdaugh-lwmq/13nat-murdaugh-lwmq-square640.jpg?quality=75&auto=webp&disable=upscale&width=350", category: "content-image", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/27-Alex-Murdaugh-convicted-of-killing-his-wife-Maggie-and-younger-son-Paul-in-June-.jpg", status: "saved" },
          { name: "twitter-image", url: "https://static01.nyt.com/images/2026/04/09/multimedia/2026-04-09-fert-promo-index/2026-04-09-fert-promo-index-videoSixteenByNine3000-v4.png", category: "twitter-image", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/28-twitter-image.png", status: "saved" },
          { name: "og-image", url: "https://static01.nyt.com/images/2026/04/09/multimedia/2026-04-09-fert-promo-index/2026-04-09-fert-promo-index-facebookJumbo-v8.png", category: "open-graph-image", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/images/29-og-image.png", status: "saved" },
        ],
        inlineSvgs: [
          { name: "css-1fe7a5q", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/00-css-1fe7a5q.svg", className: "css-1fe7a5q", width: "14", height: "2", viewBox: "0 0 16 16", pathCount: 0 },
          { name: "css-1fe7a5q", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/01-css-1fe7a5q.svg", className: "css-1fe7a5q", width: "14", height: "2", viewBox: "0 0 16 16", pathCount: 0 },
          { name: "css-1fe7a5q", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/02-css-1fe7a5q.svg", className: "css-1fe7a5q", viewBox: "0 0 16 16", pathCount: 1 },
          { name: "inline-svg-3", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/03-inline-svg-3.svg", viewBox: "0 0 184 25", pathCount: 1 },
          { name: "css-1w4a6s9", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/04-css-1w4a6s9.svg", className: "css-1w4a6s9", viewBox: "0 0 13 8", pathCount: 0 },
          { name: "css-1p66nw2", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/05-css-1p66nw2.svg", className: "css-1p66nw2", viewBox: "0 0 20 20", pathCount: 2 },
          { name: "inline-svg-6", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/06-inline-svg-6.svg", viewBox: "0 0 16 22", pathCount: 1 },
          { name: "css-12fr9lp", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/07-css-12fr9lp.svg", className: "css-12fr9lp", viewBox: "0 0 184 25", pathCount: 1 },
          { name: "inline-svg-8", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/08-inline-svg-8.svg", width: "19", height: "19", viewBox: "0 0 19 19", pathCount: 1 },
          { name: "css-zd9juy", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/09-css-zd9juy.svg", className: "css-zd9juy", width: "23", height: "18", viewBox: "0 0 23 18", pathCount: 1 },
          { name: "css-kdmyog", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/10-css-kdmyog.svg", className: "css-kdmyog", width: "12", height: "18", viewBox: "0 0 12 18", pathCount: 2 },
          { name: "css-18rar15", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/11-css-18rar15.svg", className: "css-18rar15", width: "21", height: "18", viewBox: "0 0 21 18", pathCount: 1 },
          { name: "The Upshot", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/12-The-Upshot.svg", title: "The Upshot", className: "css-2ov6oh", width: "122", height: "24", viewBox: "0 0 285 54", pathCount: 2 },
          { name: "playIcon", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/13-playIcon.svg", id: "playIcon", className: "css-3pg3bk", width: "55", height: "55", viewBox: "0 0 55 55", pathCount: 2 },
          { name: "inline-svg-14", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/14-inline-svg-14.svg", width: "19", height: "19", viewBox: "0 0 19 19", pathCount: 1 },
          { name: "css-zd9juy", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/15-css-zd9juy.svg", className: "css-zd9juy", width: "23", height: "18", viewBox: "0 0 23 18", pathCount: 1 },
          { name: "css-kdmyog", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/16-css-kdmyog.svg", className: "css-kdmyog", width: "12", height: "18", viewBox: "0 0 12 18", pathCount: 2 },
          { name: "css-18rar15", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/17-css-18rar15.svg", className: "css-18rar15", width: "21", height: "18", viewBox: "0 0 21 18", pathCount: 1 },
          { name: "inline-svg-18", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/18-inline-svg-18.svg", width: "9", height: "9", viewBox: "0 0 9 9", pathCount: 1 },
          { name: "inline-svg-19", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/19-inline-svg-19.svg", width: "19", height: "19", viewBox: "0 0 19 19", pathCount: 1 },
          { name: "css-zd9juy", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/20-css-zd9juy.svg", className: "css-zd9juy", width: "23", height: "18", viewBox: "0 0 23 18", pathCount: 1 },
          { name: "css-kdmyog", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/21-css-kdmyog.svg", className: "css-kdmyog", width: "12", height: "18", viewBox: "0 0 12 18", pathCount: 2 },
          { name: "css-18rar15", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/22-css-18rar15.svg", className: "css-18rar15", width: "21", height: "18", viewBox: "0 0 21 18", pathCount: 1 },
          { name: "css-oylsik", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/23-css-oylsik.svg", className: "css-oylsik", viewBox: "0 0 184 25", pathCount: 1 },
          { name: "css-1o03u4n", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/24-css-1o03u4n.svg", className: "css-1o03u4n", viewBox: "0 0 10 13", pathCount: 1 },
          { name: "css-1o03u4n", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/25-css-1o03u4n.svg", className: "css-1o03u4n", viewBox: "0 0 20 20", pathCount: 2 },
          { name: "css-1o03u4n", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/26-css-1o03u4n.svg", className: "css-1o03u4n", width: "6.1", height: "0.9", viewBox: "0 0 14 13", pathCount: 1 },
          { name: "css-1o03u4n", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/27-css-1o03u4n.svg", className: "css-1o03u4n", viewBox: "0 0 10 13", pathCount: 1 },
          { name: "css-wkt2rv", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/28-css-wkt2rv.svg", className: "css-wkt2rv", width: "26", height: "12", viewBox: "0 0 26 12", pathCount: 2 },
        ],
        linkedIcons: [
          { name: "shortcut icon", url: "https://www.nytimes.com/vi-assets/static-assets/favicon-d2483f10ef688e6f89e23806b9700298.ico", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/00-shortcut-icon-0.ico", status: "saved" },
          { name: "apple-touch-icon", url: "https://www.nytimes.com/vi-assets/static-assets/apple-touch-icon-28865b72953380a40aa43318108876cb.png", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/01-apple-touch-icon-1.png", status: "saved" },
          { name: "apple-touch-icon-precomposed", url: "https://www.nytimes.com/vi-assets/static-assets/ios-ipad-144x144-28865b72953380a40aa43318108876cb.png", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/02-apple-touch-icon-precomposed-144-144.png", size: "144×144", status: "saved" },
          { name: "apple-touch-icon-precomposed", url: "https://www.nytimes.com/vi-assets/static-assets/ios-iphone-114x144-080e7ec6514fdc62bcbb7966d9b257d2.png", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/03-apple-touch-icon-precomposed-114-114.png", size: "114×114", status: "saved" },
          { name: "apple-touch-icon-precomposed", url: "https://www.nytimes.com/vi-assets/static-assets/ios-default-homescreen-57x57-43808a4cd5333b648057a01624d84960.png", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/icons/04-apple-touch-icon-precomposed-4.png", status: "saved" },
        ],
        audio: [
          { name: "narrated-article", url: "https://static.nytimes.com/narrated-articles/synthetic/article-b3cab499-94db-599c-9dee-157050fa290e/job-1775759166448/article-b3cab499-94db-599c-9dee-157050fa290e-job-1775759166448.mp3", type: "audio/mpeg", localPath: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/assets/audio/00-narrated-article.mp3", status: "saved", bytes: 1392177 },
        ],
        socialImages: [
          { name: "og-image", url: "https://static01.nyt.com/images/2026/04/09/multimedia/2026-04-09-fert-promo-index/2026-04-09-fert-promo-index-facebookJumbo-v8.png", ratio: "1.91:1", desc: "NYT Open Graph image" },
          { name: "twitter-image", url: "https://static01.nyt.com/images/2026/04/09/multimedia/2026-04-09-fert-promo-index/2026-04-09-fert-promo-index-videoSixteenByNine3000-v4.png", ratio: "16:9", desc: "NYT Twitter image" },
        ],
      },
    },
    contentBlocks: [
      {
        type: "site-header-shell",
        title: "Site Header Shell",
        primitiveId: "nyt.interactive.header-shell.standard",
      },
      {
        type: "sticky-header",
        title: "Sticky Article Header",
        behavior: "The NYT shell stays at the top of the viewport; after the story header scrolls away, the compact article row preserves the headline context and action buttons.",
        elements: [
          "Skip to content and skip to site index links",
          "Section Navigation hamburger button (#desktop-sections-button)",
          "Search button (.css-tkwi90)",
          "Centered New York Times masthead link",
          "GIVE THE TIMES button",
          "Account button/drawer for admin@thereality.report profile state",
          "Compact article-title row on scroll",
          "Share full article, share icon, save/bookmark, comment count, and more controls",
          "Hairline bottom divider and white sticky surface",
        ],
      },
      {
        type: "component-inventory",
        title: "Complete Article Component Inventory",
        groups: [
          {
            label: "Header, Menu, Search, Account",
            items: [
              "Top NYT vi-story shell: .kyt-wufmy/.kyt-yAURx, 43px high on the desktop capture",
              "Desktop section menu button: #desktop-sections-button, 34x33, text/aria 'Section Navigation'",
              "Search button: .css-tkwi90, 34x33, opens search UI",
              "Centered masthead link: 195x26, aria 'New York Times homepage'",
              "GIVE THE TIMES and Account controls on the right side of the shell",
              "Date/Today Paper line included in the authenticated shell state",
            ],
          },
          {
            label: "Article Header and Action Icons",
            items: [
              "The Upshot section bug and supported-by/ad label",
              "Exact story header capture: header.css-1qv3lay.euiyums1, brand-bar data-testid=story-section, sponsor-wrapper, css-hme5ai spacer, headline, summary, audio/listen, share-tools, byline, and time.css-kx0gap",
              "Headline: Cheltenham bold italic, 40px/46px, #121212",
              "Deck: Cheltenham light, 23px/30px, #363636",
              "Byline: By Claire Cain Miller; Franklin compact link treatment",
              "Listen control: circular play button with 5:47 duration",
              "Actionbar buttons: Share full article, share icon, save role=switch, comment button with 76, more sharing options",
            ],
          },
          {
            label: "Body, Ads, Recirculation, Footer",
            items: [
              "Imperial 20px reading-column body clusters with inline editorial links",
              "Body outline block displays every captured body paragraph/chart lead-in as first-sentence evidence from extracted-inventory.json",
              "StoryBodyCompanionColumn ad/reserved slots after interactive clusters",
              "Related fertility coverage card/chunk near the lower article body",
              "Author bio: Claire Cain Miller is a Times reporter covering gender, families and education",
              "Read 76 comments CTA",
              "Site index navigation and global footer utility links",
            ],
          },
          {
            label: "Charts and Graphs",
            items: [
              "Chart 1: editable LPtw8 v7 line chart replica from Datawrapper CSV",
              "Chart 2: editable ywEMI v9 line chart replica from Datawrapper CSV, including completed-fertility note",
              "Chart 3: editable IWlRs v12 diverging bar chart with directly editable age labels and values",
              "Chart 4: editable qz8fa v11 two-series cohort line chart with age 30 and age 45 series",
              "Each chart has config-driven title, subtitle, axes, ticks, series/bars, hover states, source, credit, note, and original Datawrapper URL",
              "The survey-intent material appears as body copy in the authenticated source, not a separate chart component",
            ],
          },
          {
            label: "Production Stack",
            items: [
              "Route: NYT vi-story",
              "Framework/runtime: NYT Webpack story shell with Samizdat GraphQL article data",
              "Charts: Datawrapper source charts recreated locally as editable React/SVG chart primitives; original Datawrapper URLs retained as evidence",
              "Analytics/observability: Google Tag Manager, Chartbeat, Datadog RUM",
              "Captured source bundle: rendered HTML, MHTML, full-page screenshot, extracted inventory",
              "Mirrored asset manifest: 30 images, 29 inline SVGs, 5 linked icons, and 1 narrated-audio file saved under the source bundle",
            ],
          },
        ],
      },
      {
        type: "body-section-outline",
        title: "Body Paragraph and Section First Sentences",
        source: ".agents/skills/design-docs-agent/source-bundles/nyt-births-decline-older-mothers-2026/extracted-inventory.json",
        sections: [
          { sourceIndex: 4, role: "body paragraph", className: "css-ac37hb evys1bk0", firstSentence: "Fertility in the United States has been declining since the Great Recession, and reached a new low last year, according to federal data released Thursday, causing some to fear a baby bust." },
          { sourceIndex: 5, role: "body paragraph", className: "css-ac37hb evys1bk0", firstSentence: "But it’s not clear that will happen." },
          { sourceIndex: 6, role: "body paragraph", className: "css-ac37hb evys1bk0", firstSentence: "That’s because of a drastic shift among American women who are now of childbearing age: They are waiting longer to have babies." },
          { sourceIndex: 7, role: "chart lead-in", className: "css-1qa9noj interactive-leadin", firstSentence: "Number of U.S. births per 1,000 women ages 15 to 44" },
          { sourceIndex: 8, role: "chart source", className: "css-jagbsj interactive-source", firstSentence: "Source: Philip Cohen analysis of Centers for Disease Control and Prevention data." },
          { sourceIndex: 10, role: "chart lead-in", className: "css-1qa9noj interactive-leadin", firstSentence: "Average number of children in the U.S. ever born to women age 45" },
          { sourceIndex: 11, role: "chart note", className: "css-jagbsj interactive-notes", firstSentence: "Data on the completed fertility rate is available through 2024." },
          { sourceIndex: 12, role: "chart source", className: "css-jagbsj interactive-source", firstSentence: "Source: Philip Cohen analysis of Centers for Disease Control and Prevention data." },
          { sourceIndex: 14, role: "body paragraph", className: "css-ac37hb evys1bk0", firstSentence: "Demographers have a name for this kind of lull in fertility: a “postponement transition.”" },
          { sourceIndex: 16, role: "body paragraph", className: "css-ac37hb evys1bk0", firstSentence: "“It’s totally real that births are declining,” said Philip Cohen, a sociology professor at the University of Maryland." },
          { sourceIndex: 17, role: "chart lead-in", className: "css-1qa9noj interactive-leadin", firstSentence: "Change in the U.S. birth rate by age group since 2007" },
          { sourceIndex: 18, role: "chart source", className: "css-jagbsj interactive-source", firstSentence: "Source: Centers for Disease Control and Prevention data." },
          { sourceIndex: 20, role: "body paragraph", className: "css-ac37hb evys1bk0", firstSentence: "At first, mostly college-educated women living in cities were delaying childbirth." },
          { sourceIndex: 21, role: "body paragraph", className: "css-ac37hb evys1bk0", firstSentence: "For women with high school degrees or less in their 20s, the birthrate has declined 36 percent since 2007 — and for those with a high school education or less who are 35 and older, it has increased 58 percent, found Martha Bailey, an economist at the University of California, Los Angeles." },
          { sourceIndex: 23, role: "body paragraph", className: "css-ac37hb evys1bk0", firstSentence: "In 2024, the most recent year for which there is this data, 49 percent of women who were 30 had given birth to at least one child." },
          { sourceIndex: 24, role: "body paragraph", className: "css-ac37hb evys1bk0", firstSentence: "Yet today’s 45-year-olds, who are nearing the end of their childbearing years, are more likely to be mothers than women who were that age two decades ago." },
          { sourceIndex: 25, role: "chart lead-in", className: "css-1qa9noj interactive-leadin", firstSentence: "The share of women in the U.S. who are mothers, by age" },
          { sourceIndex: 26, role: "chart source", className: "css-jagbsj interactive-source", firstSentence: "Source: Philip Cohen analysis of Centers for Disease Control and Prevention data." },
          { sourceIndex: 28, role: "body paragraph", className: "css-ac37hb evys1bk0", firstSentence: "It wasn’t a surprise that fertility began falling in the Great Recession of 2007-9, because that’s common during financial crises." },
          { sourceIndex: 29, role: "body paragraph", className: "css-ac37hb evys1bk0", firstSentence: "In some ways, the delay in pregnancy is a sign of women’s autonomy." },
          { sourceIndex: 30, role: "body paragraph", className: "css-ac37hb evys1bk0", firstSentence: "It’s also an indicator of anxiety about the future and finances." },
          { sourceIndex: 31, role: "body paragraph", className: "css-ac37hb evys1bk0", firstSentence: "Young people are increasingly waiting to have children until they feel established in adulthood — with steady careers, a long-term partner and a house." },
          { sourceIndex: 34, role: "body paragraph", className: "css-ac37hb evys1bk0", firstSentence: "Postponing pregnancy, Professor Cohen said, “is good when it reflects a greater degree of security, stability, but not if they’re lonely or because America has made it so hard.”" },
          { sourceIndex: 35, role: "body paragraph", className: "css-ac37hb evys1bk0", firstSentence: "One of the biggest drivers of the delay in childbearing is widely considered to be a success story: the decline of teen pregnancy, which had been unusually high in the United States." },
          { sourceIndex: 36, role: "body paragraph", className: "css-ac37hb evys1bk0", firstSentence: "Since the Great Recession, teenage pregnancy has fallen 72 percent, accounting for nearly a third of recent fertility declines, according to an analysis by Alison Gemmill, an associate professor of epidemiology at the University of California, Los Angeles." },
          { sourceIndex: 37, role: "body paragraph", className: "css-ac37hb evys1bk0", firstSentence: "In Southern states, where teen pregnancy was highest, the drop accounts for even more of the recent declines, she found: more than half in Kentucky, and nearly 50 percent in Alabama, Louisiana and Mississippi." },
          { sourceIndex: 39, role: "body paragraph", className: "css-ac37hb evys1bk0", firstSentence: "The question is whether the young women who aren’t having children now will eventually have them." },
          { sourceIndex: 40, role: "body paragraph", className: "css-ac37hb evys1bk0", firstSentence: "If they follow the pattern of today’s 45-year-olds, the vast majority of them will." },
          { sourceIndex: 41, role: "body paragraph", className: "css-ac37hb evys1bk0", firstSentence: "Still, demographers say it’s unlikely that fertility will fully catch up to the level of earlier decades." },
          { sourceIndex: 42, role: "body paragraph", className: "css-ac37hb evys1bk0", firstSentence: "Women who plan to have children at older ages may not be able to, or may have fewer children than they planned, because it becomes harder to get pregnant." },
          { sourceIndex: 44, role: "body paragraph", className: "css-ac37hb evys1bk0", firstSentence: "Especially among women with less education, some may never feel economically stable enough to have children, said Karen Benjamin Guzzo, a professor of sociology at the University of North Carolina at Chapel Hill." },
          { sourceIndex: 45, role: "body paragraph", className: "css-ac37hb evys1bk0", firstSentence: "“I worry we get to a point where there are the fertility haves and have-nots,” she said." },
          { sourceIndex: 49, role: "author bio", firstSentence: "Claire Cain Miller is a Times reporter covering gender, families and education." },
          { sourceIndex: 50, role: "related card", className: "css-z7qbqf", firstSentence: "Cutting Paid Family Leave: Deloitte and Zoom are among the U.S. employers reducing support for working parents, signaling a retreat from family-friendly benefits." },
          { sourceIndex: 51, role: "related card", className: "css-z7qbqf", firstSentence: "Unfilled Classrooms: With women having fewer babies each year, many public school districts are confronting new problems, and hard choices about school closures." },
          { sourceIndex: 52, role: "related card", className: "css-z7qbqf", firstSentence: "U.S. Fertility Rate: Fertility in the United States reached a new low last year, according to federal data, causing some to fear a baby bust." },
          { sourceIndex: 53, role: "related card", className: "css-z7qbqf", firstSentence: "Betting on Reality TV: Kalshi and Polymarket, the two largest prediction markets, are offering bets on reality television shows that have already been taped, raising the possibility that people involved in the taping could profit from surefire bets before episodes are aired." },
          { sourceIndex: 54, role: "related card", className: "css-z7qbqf", firstSentence: "Cost of Child Care: It has always been expensive, but recently prices have risen faster than inflation." },
        ],
      },
      { type: "header" },
      { type: "byline" },
      {
        type: "sharetools-bar",
        tier: "tier-2-facsimile",
        buttons: [
          { label: "Share full article", kind: "gift" },
          { label: "Share article", kind: "share" },
          { label: "Save article", kind: "save" },
          { label: "More sharing options", kind: "more" },
        ],
      },
      {
        type: "featured-image",
        url: "https://static01.nyt.com/images/2026/04/09/multimedia/2026-04-09-fert-promo-index/2026-04-09-fert-promo-index-facebookJumbo-v8.png",
        caption: "NYT social promo image for the article; the visible in-story graphics are Datawrapper embeds.",
        credit: "The New York Times",
      },
      {
        type: "body-copy",
        html: "<p>The opening body section frames the record-low birthrate as a timing question: younger women are delaying childbirth, while older age groups account for more births than before.</p>",
      },
      {
        type: "datawrapper-chart",
        id: "LPtw8",
        title: "Even as annual fertility falls ...",
        chartType: "line-chart",
        url: "https://datawrapper.dwcdn.net/LPtw8/7/",
        height: 333,
        source: "Philip Cohen analysis of Centers for Disease Control and Prevention data.",
        note: "Leadin: Number of U.S. births per 1,000 women ages 15 to 44. Credit: By The New York Times. Data CSV: /LPtw8/7/data.csv.",
        editableChart: {
          mode: "line",
          subtitle: "Number of U.S. births per 1,000 women ages 15 to 44",
          height: 300,
          yAxisLabel: "Births per 1,000 women",
          yTicks: [50, 55, 60, 65, 70],
          yDomain: [50, 72],
          xTicks: [1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2025],
          unit: "",
          decimals: 1,
          source: "Philip Cohen analysis of Centers for Disease Control and Prevention data.",
          credit: "The New York Times",
          originalUrl: "https://datawrapper.dwcdn.net/LPtw8/7/",
          editableElements: ["title", "subtitle", "x-axis ticks", "y-axis ticks", "line series", "hover points", "source", "credit", "original Datawrapper URL"],
          series: [
            {
              label: "General fertility rate",
              color: "#517a8b",
              points: [
                { x: 1976, y: 65 }, { x: 1977, y: 66.8 }, { x: 1978, y: 65.5 }, { x: 1979, y: 67.2 }, { x: 1980, y: 68.4 }, { x: 1981, y: 67.3 }, { x: 1982, y: 67.3 }, { x: 1983, y: 65.7 }, { x: 1984, y: 65.5 }, { x: 1985, y: 66.3 }, { x: 1986, y: 65.4 }, { x: 1987, y: 65.8 }, { x: 1988, y: 67.3 }, { x: 1989, y: 69.2 }, { x: 1990, y: 70.9 }, { x: 1991, y: 69.3 }, { x: 1992, y: 68.4 }, { x: 1993, y: 67 }, { x: 1994, y: 65.9 }, { x: 1995, y: 64.6 }, { x: 1996, y: 64.1 }, { x: 1997, y: 63.6 }, { x: 1998, y: 64.3 }, { x: 1999, y: 64.4 }, { x: 2000, y: 65.9 }, { x: 2001, y: 65.1 }, { x: 2002, y: 65 }, { x: 2003, y: 66.1 }, { x: 2004, y: 66.4 }, { x: 2005, y: 66.7 }, { x: 2006, y: 68.6 }, { x: 2007, y: 69.3 }, { x: 2008, y: 68.1 }, { x: 2009, y: 66.2 }, { x: 2010, y: 64.1 }, { x: 2011, y: 63.2 }, { x: 2012, y: 63 }, { x: 2013, y: 62.5 }, { x: 2014, y: 62.9 }, { x: 2015, y: 62.5 }, { x: 2016, y: 62 }, { x: 2017, y: 60.3 }, { x: 2018, y: 59.1 }, { x: 2019, y: 58.26 }, { x: 2020, y: 55.99 }, { x: 2021, y: 56.3 }, { x: 2022, y: 55.96 }, { x: 2023, y: 54.51 }, { x: 2024, y: 53.8 }, { x: 2025, y: 53.1 },
              ],
            },
          ],
        },
      },
      {
        type: "body-copy",
        html: "<p>The paired opening charts compare annual fertility decline with completed fertility at age 45, preserving the source article's contrast between current births and lifetime motherhood.</p>",
      },
      {
        type: "datawrapper-chart",
        id: "ywEMI",
        title: "... most women eventually have two children, on average",
        chartType: "line-chart",
        url: "https://datawrapper.dwcdn.net/ywEMI/9/",
        height: 333,
        source: "Philip Cohen analysis of Centers for Disease Control and Prevention data.",
        note: "Leadin: Average number of children in the U.S. ever born to women age 45. Note: Data on the completed fertility rate is available through 2024. Credit: By The New York Times.",
        editableChart: {
          mode: "line",
          subtitle: "Average number of children in the U.S. ever born to women age 45",
          height: 300,
          yAxisLabel: "Children ever born",
          yTicks: [0, 1, 2, 3],
          yDomain: [0, 3.5],
          xTicks: [1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020],
          decimals: 2,
          source: "Philip Cohen analysis of Centers for Disease Control and Prevention data.",
          credit: "The New York Times",
          note: "Data on the completed fertility rate is available through 2024.",
          originalUrl: "https://datawrapper.dwcdn.net/ywEMI/9/",
          editableElements: ["title", "subtitle", "note", "x-axis ticks", "y-axis ticks", "line series", "hover points", "source", "credit", "original Datawrapper URL"],
          series: [
            {
              label: "Completed fertility rate",
              color: "#517a8b",
              points: [
                { x: 1976, y: 3.24 }, { x: 1977, y: 3.252 }, { x: 1978, y: 3.255 }, { x: 1979, y: 3.253 }, { x: 1980, y: 3.213 }, { x: 1981, y: 3.13 }, { x: 1982, y: 3.058 }, { x: 1983, y: 2.983 }, { x: 1984, y: 2.891 }, { x: 1985, y: 2.794 }, { x: 1986, y: 2.679 }, { x: 1987, y: 2.56 }, { x: 1988, y: 2.463 }, { x: 1989, y: 2.364 }, { x: 1990, y: 2.291 }, { x: 1991, y: 2.214 }, { x: 1992, y: 2.149 }, { x: 1993, y: 2.103 }, { x: 1994, y: 2.056 }, { x: 1995, y: 2.021 }, { x: 1996, y: 1.996 }, { x: 1997, y: 1.979 }, { x: 1998, y: 1.969 }, { x: 1999, y: 1.972 }, { x: 2000, y: 1.978 }, { x: 2001, y: 1.983 }, { x: 2002, y: 1.984 }, { x: 2003, y: 1.988 }, { x: 2004, y: 2.009 }, { x: 2005, y: 2.021 }, { x: 2006, y: 2.02 }, { x: 2007, y: 2.03 }, { x: 2008, y: 2.048 }, { x: 2009, y: 2.063 }, { x: 2010, y: 2.071 }, { x: 2011, y: 2.085 }, { x: 2012, y: 2.105 }, { x: 2013, y: 2.107 }, { x: 2014, y: 2.11 }, { x: 2015, y: 2.132 }, { x: 2016, y: 2.156 }, { x: 2017, y: 2.178 }, { x: 2018, y: 2.199 }, { x: 2019, y: 2.211 }, { x: 2020, y: 2.217 }, { x: 2021, y: 2.224 }, { x: 2022, y: 2.228 }, { x: 2023, y: 2.204 }, { x: 2024, y: 2.176 },
              ],
            },
          ],
        },
      },
      { type: "ad-container", position: "story-body-companion-after-initial-fertility-charts" },
      {
        type: "body-copy",
        html: "<p>The next section identifies the postponement transition and explains the demographic split by age, education, and timing.</p>",
      },
      {
        type: "datawrapper-chart",
        id: "IWlRs",
        title: "Women are postponing pregnancy",
        chartType: "diverging-bar-chart",
        url: "https://datawrapper.dwcdn.net/IWlRs/12/",
        height: 164,
        source: "Centers for Disease Control and Prevention data.",
        note: "Leadin: Change in the U.S. birth rate by age group since 2007. Public data values: 15-19 -72, 20-24 -51, 25-29 -27, 30-34 -4, 35-39 16, 40-44 35, 45-54 83. Credit: By The New York Times.",
        editableChart: {
          mode: "diverging-bars",
          subtitle: "Change in the U.S. birth rate by age group since 2007",
          height: 260,
          xAxisLabel: "Percent change since 2007",
          xTicks: [-75, -50, -25, 0, 25, 50, 75],
          unit: "%",
          decimals: 0,
          source: "Centers for Disease Control and Prevention data.",
          credit: "The New York Times",
          originalUrl: "https://datawrapper.dwcdn.net/IWlRs/12/",
          editableElements: ["title", "subtitle", "age labels", "bar values", "negative bars", "positive bars", "zero axis", "x-axis ticks", "source", "credit", "original Datawrapper URL"],
          bars: [
            { label: "15-19", value: -72, valueLabel: "-72%", color: "#687d84" },
            { label: "20-24", value: -51, valueLabel: "-51%", color: "#687d84" },
            { label: "25-29", value: -27, valueLabel: "-27%", color: "#687d84" },
            { label: "30-34", value: -4, valueLabel: "-4%", color: "#687d84" },
            { label: "35-39", value: 16, valueLabel: "16%", color: "#517a8b" },
            { label: "40-44", value: 35, valueLabel: "35%", color: "#517a8b" },
            { label: "45-54", value: 83, valueLabel: "83%", color: "#517a8b" },
          ],
        },
      },
      {
        type: "body-copy",
        html: "<p>The cohort section compares motherhood by age 30 with motherhood by age 45, then moves into teen pregnancy, delayed adulthood milestones, and survey-intent discussion in body copy.</p>",
      },
      {
        type: "datawrapper-chart",
        id: "qz8fa",
        title: "Fewer women give birth by 30, but most catch up",
        chartType: "cohort-line-chart",
        url: "https://datawrapper.dwcdn.net/qz8fa/11/",
        height: 335,
        source: "Philip Cohen analysis of Centers for Disease Control and Prevention data.",
        note: "Leadin: The share of women in the U.S. who are mothers, by age. Data CSV columns: Year, Age 45, Age 30. Credit: By The New York Times.",
        editableChart: {
          mode: "multi-line",
          subtitle: "The share of women in the U.S. who are mothers, by age",
          height: 320,
          yAxisLabel: "Share who are mothers",
          yTicks: [40, 50, 60, 70, 80, 90, 100],
          yDomain: [40, 100],
          xTicks: [1965, 1970, 1975, 1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020],
          unit: "%",
          decimals: 1,
          source: "Philip Cohen analysis of Centers for Disease Control and Prevention data.",
          credit: "The New York Times",
          originalUrl: "https://datawrapper.dwcdn.net/qz8fa/11/",
          editableElements: ["title", "subtitle", "x-axis ticks", "y-axis ticks", "Age 45 series", "Age 30 series", "hover points", "source", "credit", "original Datawrapper URL"],
          series: [
            {
              label: "Age 45",
              color: "#517a8b",
              points: [
                { x: 1965, y: 85.6 }, { x: 1966, y: 86.5 }, { x: 1967, y: 86.7 }, { x: 1968, y: 87.7 }, { x: 1969, y: 89 }, { x: 1970, y: 89 }, { x: 1971, y: 89.9 }, { x: 1972, y: 91.2 }, { x: 1973, y: 90.4 }, { x: 1974, y: 90.4 }, { x: 1975, y: 91.2 }, { x: 1976, y: 91.5 }, { x: 1977, y: 92.1 }, { x: 1978, y: 92.8 }, { x: 1979, y: 93.7 }, { x: 1980, y: 93.9 }, { x: 1981, y: 93.3 }, { x: 1982, y: 93.4 }, { x: 1983, y: 93.4 }, { x: 1984, y: 93 }, { x: 1985, y: 92.5 }, { x: 1986, y: 92.1 }, { x: 1987, y: 91.5 }, { x: 1988, y: 90.7 }, { x: 1989, y: 89.4 }, { x: 1990, y: 88.8 }, { x: 1991, y: 88.7 }, { x: 1992, y: 88.2 }, { x: 1993, y: 87.2 }, { x: 1994, y: 85.8 }, { x: 1995, y: 84.9 }, { x: 1996, y: 84.4 }, { x: 1997, y: 83.9 }, { x: 1998, y: 83.5 }, { x: 1999, y: 83.5 }, { x: 2000, y: 83.7 }, { x: 2001, y: 83.8 }, { x: 2002, y: 83.7 }, { x: 2003, y: 83.7 }, { x: 2004, y: 84.4 }, { x: 2005, y: 84.7 }, { x: 2006, y: 84.7 }, { x: 2007, y: 85 }, { x: 2008, y: 85.6 }, { x: 2009, y: 86 }, { x: 2010, y: 85.9 }, { x: 2011, y: 86.1 }, { x: 2012, y: 86.7 }, { x: 2013, y: 86.7 }, { x: 2014, y: 87 }, { x: 2015, y: 88 }, { x: 2016, y: 88.7 }, { x: 2017, y: 89.1 }, { x: 2018, y: 89.6 }, { x: 2019, y: 89.9 }, { x: 2020, y: 89.6 }, { x: 2021, y: 89.6 }, { x: 2022, y: 89.5 }, { x: 2023, y: 88.5 }, { x: 2024, y: 87.5 },
              ],
            },
            {
              label: "Age 30",
              color: "#c49012",
              points: [
                { x: 1965, y: 89.5 }, { x: 1966, y: 88.9 }, { x: 1967, y: 88.9 }, { x: 1968, y: 88.9 }, { x: 1969, y: 88.4 }, { x: 1970, y: 87.9 }, { x: 1971, y: 87.3 }, { x: 1972, y: 86.4 }, { x: 1973, y: 85.3 }, { x: 1974, y: 83.5 }, { x: 1975, y: 82.2 }, { x: 1976, y: 81.3 }, { x: 1977, y: 80 }, { x: 1978, y: 78.3 }, { x: 1979, y: 76.1 }, { x: 1980, y: 74.4 }, { x: 1981, y: 73.1 }, { x: 1982, y: 72 }, { x: 1983, y: 70.9 }, { x: 1984, y: 70.4 }, { x: 1985, y: 70.2 }, { x: 1986, y: 69.9 }, { x: 1987, y: 69.3 }, { x: 1988, y: 68.9 }, { x: 1989, y: 69.2 }, { x: 1990, y: 69.2 }, { x: 1991, y: 68.8 }, { x: 1992, y: 68.6 }, { x: 1993, y: 68.6 }, { x: 1994, y: 68.5 }, { x: 1995, y: 68.1 }, { x: 1996, y: 67.7 }, { x: 1997, y: 67.6 }, { x: 1998, y: 67.1 }, { x: 1999, y: 66.9 }, { x: 2000, y: 67.6 }, { x: 2001, y: 68.2 }, { x: 2002, y: 68.6 }, { x: 2003, y: 69 }, { x: 2004, y: 69.2 }, { x: 2005, y: 69 }, { x: 2006, y: 68.8 }, { x: 2007, y: 68.5 }, { x: 2008, y: 67.4 }, { x: 2009, y: 66.4 }, { x: 2010, y: 65.6 }, { x: 2011, y: 64.9 }, { x: 2012, y: 64.6 }, { x: 2013, y: 64 }, { x: 2014, y: 63.1 }, { x: 2015, y: 62.3 }, { x: 2016, y: 61.5 }, { x: 2017, y: 60.5 }, { x: 2018, y: 59 }, { x: 2019, y: 57 }, { x: 2020, y: 55.1 }, { x: 2021, y: 53.3 }, { x: 2022, y: 51.7 }, { x: 2023, y: 50.2 }, { x: 2024, y: 48.8 },
              ],
            },
          ],
        },
      },
      { type: "ad-container", position: "mid-article-after-cohort-chart" },
      {
        type: "body-copy",
        html: "<p>The closing section asks whether young women who are not having children now will eventually have them, while noting that full catch-up to earlier fertility levels is unlikely.</p>",
      },
      {
        type: "related-link",
        title: "U.S. Fertility Rates Drop to Another Record Low",
        url: "https://www.nytimes.com/2026/04/09/us/fertility-rates-decline.html",
        imageUrl: "https://static01.nyt.com/images/2026/04/09/multimedia/09nat-us-census-pchv/09nat-us-census-pchv-articleLarge.jpg",
        summary: "Related standard news article documenting the annual fertility-rate decline.",
      },
      {
        type: "showcase-link",
        title: "The birthrate is falling for American women in their 20s",
        href: "https://www.nytimes.com/2021/06/16/us/declining-birthrate-motherhood.html",
        imageUrl: "https://static01.nyt.com/images/2021/06/16/us/16birthrates-print1/merlin_186867969_765d0e3d-c1ee-48d3-87ea-002570651f25-articleLarge.jpg",
        excerpt: "Related Upshot recirculation item referenced in the captured article data.",
      },
      {
        type: "reporting-credit",
        text: "Design-doc recreation is based on authenticated Chrome Profile 11/admin@thereality.report capture: rendered HTML, MHTML, full-page screenshot, DOM inventory, Datawrapper iframe IDs, and public chart data.csv endpoints.",
      },
      { type: "author-bio" },
      {
        type: "site-footer",
        title: "The New York Times",
        columns: [
          { label: "Company", links: ["NYTCo", "Contact Us", "Accessibility", "Work with us", "Advertise", "T Brand Studio"] },
          { label: "Legal", links: ["Privacy Policy", "Cookie Policy", "Terms of Service", "Terms of Sale", "Your Privacy Choices"] },
          { label: "Support", links: ["Site Map", "Help", "Subscriptions", "Canada", "International"] },
        ],
      },
    ],
  },
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
  /* ── NYT Democratic Debate Speaking Time ──────────────────────────── */
  {
    id: "debate-speaking-time",
    title: "Which Candidates Got the Most Speaking Time in the Democratic Debate",
    url: "https://www.nytimes.com/interactive/2020/02/25/us/elections/debate-speaking-time.html",
    authors: ["Weiyi Cai", "Keith Collins", "Lauren Leatherby"],
    date: "2020-02-25",
    section: "U.S./Elections",
    type: "interactive" as const,
    description: "Sanders, Bloomberg and Klobuchar led the seven candidates onstage.",
    ogImage: "/design-docs/nyt/debate-speaking-time/social/facebookJumbo.jpg",
    featuredImage: {
      name: "facebookJumbo",
      url: "/design-docs/nyt/debate-speaking-time/social/facebookJumbo.jpg",
      category: "Featured image",
      ratio: "1.91:1",
      width: 1050,
      desc: "Saved Facebook/OG share image used as the article’s share and featured artwork",
      sectionLabel: "Featured Image",
    },
    tags: [
      "Democratic Party",
      "Debates (Political)",
      "Presidential Election of 2020",
      "Politics and Government",
      "South Carolina Primary",
      "vis-design",
    ],
    graphicsCount: 2,
    figuresCount: 0,
    tools: {
      topper: "none",
      charts: "Legacy D3.js + jQuery custom SVG/div charts",
      framework: "vi-interactive shell + D3.js + jQuery",
      hosting: "int.nyt.com/newsgraphics/2019/debates/2020-02-25-dem-debate/",
    },
    chartTypes: [
      { type: "timeline-bar-chart", tool: "D3.js", topic: "Speaking time by candidate across the debate timeline" },
      { type: "bubble-grid", tool: "D3.js", topic: "Total speaking time by topic and candidate" },
    ],
    quoteSections: [],
    cssInfo: {
      styleRules: "5,954",
      cssFile: "417kb",
      stylesheets: "8",
      loadTime: "0.7s",
    },
    typographyGroups: [
      {
        label: "Headings",
        families: ["nyt-cheltenham", "georgia"],
        weightCount: 2,
        styleCount: 54,
        samples: [
          {
            label: "Main headline",
            text: "Which Candidates Got the Most Speaking Time in the Democratic Debate",
            fontFamily: 'nyt-cheltenham, cheltenham-fallback-georgia, cheltenham-fallback-noto, georgia, "times new roman", times, serif',
            fontSize: 47,
            fontWeight: 500,
            lineHeight: "54px",
            color: "#121212",
            textAlign: "center",
          },
          {
            label: "Chart heading",
            text: "How Long Each Candidate Spoke",
            fontFamily: "georgia, \"times new roman\", times, serif",
            fontSize: 18,
            fontWeight: 700,
            lineHeight: "24px",
            color: "#121212",
          },
        ],
      },
      {
        label: "Body",
        families: ["Times"],
        weightCount: 1,
        styleCount: 652,
        samples: [
          {
            label: "Body paragraph",
            text: "The increasing threat of the spread of the coronavirus became a topic of debate for the first time.",
            fontFamily: '"Times New Roman", times, serif',
            fontSize: 20,
            fontWeight: 500,
            lineHeight: "30px",
            color: "#333333",
          },
        ],
      },
    ],
    fonts: [
      {
        name: "nyt-cheltenham",
        cssVar: "--g-chelt",
        fullStack: 'nyt-cheltenham, cheltenham-fallback-georgia, cheltenham-fallback-noto, georgia, "times new roman", times, serif',
        weights: [500],
        role: "Editorial shell headline",
        usedIn: [
          "interactive-heading.mobile: 27px/500/32px text-align:center #121212",
          "interactive-heading.tablet: 38px/500/46px text-align:center #121212",
          "interactive-heading.desktop: 47px/500/54px text-align:center #121212",
        ],
      },
      {
        name: "nyt-franklin",
        cssVar: "--g-franklin",
        fullStack: '"nyt-franklin", arial, helvetica, sans-serif',
        weights: [500, 700],
        role: "Byline system, chart labels, legend labels, and chart notes",
        usedIn: [
          "interactive-byline: 14px/700/18px text-align:center #121212",
          "interactive-dateline: 13px/500/18px text-align:center #121212",
          "charttitle: 18px/700/24px #121212",
          "legendlabel: 15px/500/19px #333333",
          "timeline-axis: 14px/700/16px #000000",
          "candidate-name: 14px/500/16px #000000",
          "candidate-total: 16px/700/20px #121212",
          "topic-label: 14px/700/16px text-align:center #000000",
          "yaxis-candidate: 14px/500/16px #000000",
          "chart-note: 15px/500/19px #666666",
        ],
      },
      {
        name: "nyt-imperial",
        cssVar: "--g-imperial",
        fullStack: '"nyt-imperial", georgia, "times new roman", times, serif',
        weights: [400, 500],
        role: "Article body text",
        usedIn: [
          "bodytext.mobile: 18px/500/25px #333333",
          "bodytext.desktop: 20px/500/30px #333333",
          "bodylink.desktop: 19px/500/28px #326891",
        ],
      },
    ],
    brandFonts: {
      editorial: ["nyt-cheltenham", "nyt-imperial"],
      graphics: ["nyt-franklin"],
      games: [],
    },
    colors: {
      topicPalette: [
        { name: "Electability", hex: "#8fbacc" },
        { name: "Health care", hex: "#436f82" },
        { name: "Racial justice", hex: "#ae4544" },
        { name: "Sexism", hex: "#f9e280" },
        { name: "Gun control", hex: "#cc7c3a" },
        { name: "Economy", hex: "#d8cb98" },
        { name: "Education", hex: "#617bb5" },
        { name: "Criminal justice", hex: "#a4ad6f" },
        { name: "Coronavirus", hex: "#c98d8d" },
        { name: "Foreign policy", hex: "#7c5981" },
        { name: "Other", hex: "#d9d9d9" },
      ],
      editorial: {
        primary: "#121212",
        secondary: "#363636",
        faint: "#727272",
        background: "#ffffff",
      },
    },
    colorCategories: [
      {
        label: "Text colors",
        colors: [
          { name: "Headline / byline", hex: "#121212", note: "Interactive header, byline, totals" },
          { name: "Legend labels", hex: "#333333", note: "g-key row labels and body copy" },
          { name: "Axis / note secondary", hex: "#666666", note: "Chart note and timeline support text" },
          { name: "Muted metadata", hex: "#999999", note: "Axis defaults and helper labels" },
        ],
      },
      {
        label: "Shadow colors",
        colors: [
          { name: "Text shadow", hex: "rgba(0, 0, 0, 0.5)", note: "Source CSS text-shadow and box-shadow accent" },
          { name: "Hero text glow", hex: "rgba(0, 0, 0, 0.333)", note: "Multi-layer text-shadow used in source CSS" },
        ],
      },
      {
        label: "Border colors",
        colors: [
          { name: "Sharetools border", hex: "#dfdfdf", note: "Header button borders" },
          { name: "Timeline separators", hex: "#ffffff", note: "speakbar segment dividers and image rings" },
          { name: "Axis stroke", hex: "#cccccc", note: "Source axis line treatment" },
        ],
      },
      {
        label: "Background colors",
        colors: [
          { name: "Page background", hex: "#ffffff", note: "Article and graphic background" },
          { name: "Other topic fill", hex: "#d9d9d9", note: "Residual / other topic bucket" },
        ],
      },
      {
        label: "Shape/Circle colors",
        colors: [
          { name: "span.g-key-circle / Electability", hex: "#8fbacc", note: "Legend key and Sanders/Bloomberg/Klobuchar electability circles" },
          { name: "div.warren / Foreign policy", hex: "#7c5981", note: "Bubble matrix class fill" },
          { name: "div.steyer / Economy", hex: "#d8cb98", note: "Bubble matrix class fill" },
          { name: "div.klobuchar / Gun control", hex: "#cc7c3a", note: "Bubble matrix class fill" },
          { name: "div.buttigieg / Education", hex: "#617bb5", note: "Bubble matrix class fill" },
          { name: "div.bloomberg / Sexism", hex: "#f9e280", note: "Bubble matrix class fill" },
          { name: "div.biden / Health care", hex: "#436f82", note: "Bubble matrix class fill" },
          { name: "Racial justice", hex: "#ae4544", note: "Timeline segment and bubble fill" },
          { name: "Coronavirus", hex: "#c98d8d", note: "Timeline segment and bubble fill" },
          { name: "Criminal justice", hex: "#a4ad6f", note: "Timeline segment and bubble fill" },
        ],
      },
    ],
    chartAccessibilityLabels: {
      timelineRowTemplate: "Speaking time timeline for {candidate}; total speaking time {total}",
      timelinePortraitTemplate: "{candidate} portrait",
      bubbleTemplate: "Speaking time by topic: {candidate} on {topic}",
    },
    architecture: {
      framework: "Legacy NYT vi-interactive + D3.js + jQuery",
      projectId: "2020-02-25-dem-debate",
      hosting: "https://int.nyt.com/newsgraphics/2019/debates/2020-02-25-dem-debate/",
      hierarchy: [
        "div#story-top (NYT interactive shell)",
        "  header (headline, byline, sharetools)",
        "  div.g-asset (timeline chart SVG + candidate headshots)",
        "  p.g-body paragraphs",
        "  div.g-asset (topic bubble chart SVG axis + absolutely positioned bubble divs)",
        "  closing body paragraphs and recap link",
      ],
      layoutTokens: {
        bodyWidth: "600px editorial text column",
        chartMaxWidth: "1150px full-width interactive container",
        headlineStyle: "Centered Cheltenham 500 headline — no visible deck in the saved source",
        bodyStyle: "nyt-imperial longform paragraph copy",
      },
      cssFiles: [
        "web-fonts.css",
        "global-bf55b3b62e74478ad488922130f07a8e.css",
        "cssModulesStyles-194a4f08b37a2be7fb8f.css",
        "style.css",
      ],
      jsFiles: [
        "build.js",
        "vendor-interactive-835cfb86caa85434dd07.js",
        "interactive-86596d1fb14c8baecda4.js",
      ],
      publicAssets: {
        socialImages: [
          { name: "facebookJumbo", url: "/design-docs/nyt/debate-speaking-time/social/facebookJumbo.jpg", ratio: "1.91:1", desc: "Saved Facebook/OG share image" },
          { name: "video16x9-1600", url: "/design-docs/nyt/debate-speaking-time/social/video16x9-1600.jpg", ratio: "16:9", width: 1600, desc: "Saved Twitter card image" },
          { name: "superJumbo", url: "/design-docs/nyt/debate-speaking-time/social/superJumbo.jpg", ratio: "3:2", desc: "Saved large share image" },
          { name: "square3x", url: "/design-docs/nyt/debate-speaking-time/social/square3x.jpg", ratio: "1:1", width: 1800, desc: "Saved square thumbnail" },
        ],
        icons: [
          { name: "gift", file: "/design-docs/nyt/debate-speaking-time/icons/gift.svg", size: "15×15", fill: "#121212", usage: "Sharetools action icon", element: "button" },
          { name: "more", file: "/design-docs/nyt/debate-speaking-time/icons/more.svg", size: "15×15", fill: "#121212", usage: "Sharetools overflow icon", element: "button" },
          { name: "save", file: "/design-docs/nyt/debate-speaking-time/icons/save.svg", size: "15×15", fill: "#121212", usage: "Sharetools bookmark icon", element: "button" },
          { name: "share", file: "/design-docs/nyt/debate-speaking-time/icons/share.svg", size: "15×15", fill: "#121212", usage: "Floating share action icon", element: "button" },
        ],
        images: [
          { name: "sanders-color", url: "/design-docs/nyt/debate-speaking-time/candidates/color/sanders.png", category: "Timeline portrait", width: 50, desc: "Sanders color portrait used beside the timeline bar" },
          { name: "bloomberg-color", url: "/design-docs/nyt/debate-speaking-time/candidates/color/bloomberg.png", category: "Timeline portrait", width: 50, desc: "Bloomberg color portrait used beside the timeline bar" },
          { name: "klobuchar-color", url: "/design-docs/nyt/debate-speaking-time/candidates/color/klobuchar.png", category: "Timeline portrait", width: 50, desc: "Klobuchar color portrait used beside the timeline bar" },
          { name: "warren-color", url: "/design-docs/nyt/debate-speaking-time/candidates/color/warren.png", category: "Timeline portrait", width: 50, desc: "Warren color portrait used beside the timeline bar" },
          { name: "biden-color", url: "/design-docs/nyt/debate-speaking-time/candidates/color/biden.png", category: "Timeline portrait", width: 50, desc: "Biden color portrait used beside the timeline bar" },
          { name: "buttigieg-color", url: "/design-docs/nyt/debate-speaking-time/candidates/color/buttigieg.png", category: "Timeline portrait", width: 50, desc: "Buttigieg color portrait used beside the timeline bar" },
          { name: "steyer-color", url: "/design-docs/nyt/debate-speaking-time/candidates/color/steyer.png", category: "Timeline portrait", width: 50, desc: "Steyer color portrait used beside the timeline bar" },
          { name: "sanders-grayscale", url: "/design-docs/nyt/debate-speaking-time/candidates/grayscale/sanders.png", category: "Bubble portrait", width: 80, desc: "Sanders grayscale portrait used inside topic bubbles" },
          { name: "bloomberg-grayscale", url: "/design-docs/nyt/debate-speaking-time/candidates/grayscale/bloomberg.png", category: "Bubble portrait", width: 80, desc: "Bloomberg grayscale portrait used inside topic bubbles" },
          { name: "klobuchar-grayscale", url: "/design-docs/nyt/debate-speaking-time/candidates/grayscale/klobuchar.png", category: "Bubble portrait", width: 80, desc: "Klobuchar grayscale portrait used inside topic bubbles" },
          { name: "warren-grayscale", url: "/design-docs/nyt/debate-speaking-time/candidates/grayscale/warren.png", category: "Bubble portrait", width: 80, desc: "Warren grayscale portrait used inside topic bubbles" },
          { name: "biden-grayscale", url: "/design-docs/nyt/debate-speaking-time/candidates/grayscale/biden.png", category: "Bubble portrait", width: 80, desc: "Biden grayscale portrait used inside topic bubbles" },
          { name: "buttigieg-grayscale", url: "/design-docs/nyt/debate-speaking-time/candidates/grayscale/buttigieg.png", category: "Bubble portrait", width: 80, desc: "Buttigieg grayscale portrait used inside topic bubbles" },
          { name: "steyer-grayscale", url: "/design-docs/nyt/debate-speaking-time/candidates/grayscale/steyer.png", category: "Bubble portrait", width: 80, desc: "Steyer grayscale portrait used inside topic bubbles" },
        ],
      },
    },
    contentBlocks: [
      { type: "header" },
      { type: "byline" },
      {
        type: "debate-speaking-time-chart",
        title: "How Long Each Candidate Spoke",
        note: "Note: Each bar segment represents the approximate length of a candidate’s response to a question.",
      },
      { type: "body-copy", html: "Senator <a href=\"https://www.nytimes.com/interactive/2020/us/elections/bernie-sanders.html\">Bernie Sanders</a> of Vermont, former mayor <a href=\"https://www.nytimes.com/interactive/2020/us/elections/michael-bloomberg.html\">Michael R. Bloomberg</a> of New York and Senator <a href=\"https://www.nytimes.com/interactive/2020/us/elections/amy-klobuchar.html\">Amy Klobuchar</a> of Minnesota had the most speaking time of the seven Democratic presidential candidates in the debate in Charleston, S.C., ahead of the South Carolina primary on Saturday." },
      { type: "body-copy", html: "Electability, foreign policy, gun control and racial justice were major topics during the debate. The candidates also sparred over Russian election interference, housing discrimination and each other’s legislative record." },
      {
        type: "debate-topic-bubble-chart",
        title: "Speaking Time by Topic",
        note: "Note: The size of each circle represents the total length of a candidate’s responses to a topic.",
      },
      { type: "body-copy", html: "Like last week’s debate, the night was more heated than usual. Mr. Bloomberg continued to <a href=\"https://www.nytimes.com/2020/02/19/us/politics/democratic-debate-nevada-recap.html\">come under fire</a> for his billionaire status and treatment of women, and Mr. Sanders’s newfound position as clear front-runner <a href=\"https://www.nytimes.com/2020/02/25/us/politics/south-carolina-debate-recap.html\">made him a target</a> as well. Almost every candidate criticized Mr. Sanders in the first 10 minutes of the debate, challenging his electability, health care plan and record on gun control." },
      { type: "body-copy", html: "The night took a turn toward the chaotic when, after Ms. Klobuchar challenged the math of Mr. Sanders’s “Medicare for all” plan, there was more than half a minute of sustained crosstalk among the candidates as they tried to interrupt to make their points." },
      { type: "body-copy", html: "The increasing threat of the <a href=\"https://www.nytimes.com/2020/02/25/world/asia/coronavirus-news.html\">spread of the coronavirus</a> became a topic of debate for the first time, with candidates criticizing the Trump administration’s preparations for an outbreak and Mr. Biden referring to the Obama administration’s efforts to combat the Ebola virus." },
      { type: "body-copy", html: "Get <a href=\"https://www.nytimes.com/2020/02/25/us/politics/south-carolina-debate-recap.html\">full coverage of the Democratic presidential debate from The Times</a>." },
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
  /* ── The Athletic — NFL Free-Agent Tracker ──────────────────────── */
  {
    id: "nfl-free-agent-tracker-2026",
    title: "2026 NFL free-agency tracker: Contract details and analysis for the top 150 free agents",
    url: "https://www.nytimes.com/athletic/7058500/2026/03/05/nfl-free-agent-tracker-rankings-2026/",
    authors: ["Daniel Popper"],
    date: "2026-03-05",
    section: "NFL",
    type: "standard" as const,
    description: "As NFL free agency rolls on, we're tracking it all, from the best available players to signings and contract details around the league.",
    ogImage: "https://static01.nyt.com/athletic/uploads/wp/2026/02/04143320/0305_Top150_NFL_FreeAgents.jpg?width=1200&height=630&fit=cover",
    tags: ["NFL", "Free Agency", "Trey Hendrickson", "Jaelan Phillips", "Daniel Jones", "Tyler Linderbaum", "Mike Evans", "Kenneth Walker III", "Malik Willis", "Travis Etienne", "Alec Pierce", "Odafe Oweh"],
    graphicsCount: 0,
    figuresCount: 0,
    tools: {
      topper: "none",
      charts: "Filter Card system (150-card interactive tracker, 4 dropdown filters, search, expand/collapse) + Tallysight widget",
      framework: "React (Next.js) — data-theme='legacy', SSR with client hydration + WordPress filter-card.js + D3.js + jQuery",
      hosting: "nytimes.com/athletic/ — CDN: static01.nyt.com, cdn-media.theathletic.com, theathletic.com/app/themes/athletic/",
    },
    chartTypes: [
      { type: "filter-card-tracker" as string, tool: "filter-card-system", topic: "150 NFL free agents ranked — filterable by position, availability, previous team, new team — expandable scouting reports with contract projections + actuals" },
    ],
    quoteSections: [],
    /** Fonts — same NYT type families as other Athletic articles, plus filter card custom styles */
    fonts: [
      {
        name: "nyt-cheltenham",
        cssVar: null,
        fullStack: 'nyt-cheltenham, georgia, "times new roman", times, serif',
        weights: [400, 500, 700],
        role: "Display headlines + section headings — serif editorial typeface",
        usedIn: [
          "h1.Article_Headline__ou0D2.Article_Featured__tTXwK: 40px/400/44px #121212",
          "h2 (bare, inside .bodytext1): 30px/700/36px #121212 (Methodology and statistical notes)",
        ],
      },
      {
        name: "nyt-franklin",
        cssVar: null,
        fullStack: '"nyt-franklin", helvetica, arial, sans-serif',
        weights: [300, 400, 500, 600, 700],
        role: "Primary sans-serif — UI chrome, nav, labels, badges, buttons, captions, filter card UI",
        usedIn: [
          "span.Article_BylineString__WkHIP: 14px/500/16.8px letter-spacing:0.25px #121212",
          "a inside BylineString (author name): 14px/700/16.8px #121212 text-decoration:none",
          "div.Article_BylineTimestamp__KhutQ > time: 13px/500/17px #121212",
          "span.Pill_PillLabel__59Ozm: 12px/500 #121212 (Share full article, comment count '110')",
          "a.header-link.HeaderLink_HeaderLink: 14px/400/40px letter-spacing:0.25px #DBDBD9 (on dark bg)",
          "p.ad-slug: 11px/500/11px letter-spacing:0.22px uppercase #969693 (var(--Gray60))",
          "span.Article_ImageCredit__2YNda: 12px/500/15.6px letter-spacing:0.12px #52524F",
          "p.Article_WriterBioText (Typography_utilitySansRegularLarge): 16px/400/22.72px #121212",
          "select.fc-card-filters: nyt-franklin (filter dropdowns — Position, Availability, Previous team, New team)",
          "div.fc-rank-text: 18px (desktop) / 14px (mobile ≤800px) — player rank number",
          "div.fc-spotlight-stat: nyt-franklin bold — contract duration (e.g., '4 years')",
          "div.fc-spotlight-desc: nyt-franklin — contract value (e.g., '$112 million')",
          "strong (inside fc-copy): nyt-franklin 12px — labels (Contract projection, Age, Height, Weight)",
        ],
      },
      {
        name: "nyt-imperial",
        cssVar: null,
        fullStack: '"nyt-imperial", georgia, "times new roman", times, serif',
        weights: [400, 500],
        role: "Article body text + scouting reports — primary reading font",
        usedIn: [
          "p (bare, inside .article-content-container.bodytext1): 20px/400/30px #121212",
          "a (body links): 20px/400/30px #386C92 text-decoration:underline",
          "p (inside .fc-copy): nyt-imperial — player scouting report body text",
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
    brandFonts: {
      editorial: ["nyt-cheltenham", "nyt-imperial"],
      graphics: ["nyt-franklin"],
    },
    colors: {
      page: {
        primaryText: "#121212",
        secondaryText: "#323232",
        tertiaryText: "#52524F",
        mutedText: "#969693",
        pureBlack: "#000000",
        background: "#FFFFFF",
        linkBlue: "#386C92",
      },
      header: {
        background: "#121212",
        primaryText: "#FFFFFF",
        secondaryText: "#DBDBD9",
        dividerBorder: "#52524F",
      },
      footer: {
        background: "#121212",
        sectionHeader: "#F0F0EE",
        linkText: "#C4C4C0",
      },
      darkMode: {
        background: "#121212",
        primaryText: "#F0F0EE",
        secondaryText: "#C4C4C0",
      },
      borders: {
        showcaseDivider: "rgba(150, 150, 147, 0.4)",
        tableBorder: "#C2C2C0",
        contentDivider: "#E8E5E0",
      },
      /** Filter card color scheme: fc-cs-green */
      filterCard: {
        colorScheme: "green",
        headerBg: "#3C5634",
        statBg: "#4EAB75",
        rankBg: "#3C5634",
        rankText: "#FFFFFF",
        spotlightStat: "#FFFFFF",
        spotlightDesc: "#FFFFFF",
        cardBorder: "#E8E5E0",
        searchBg: "#F7F7F4",
      },
      cssVariables: {
        Gray10: "#FFFFFF",
        Gray15: "#FAFAFA",
        Gray20: "#F7F7F4",
        Gray30: "#F0F0EE",
        Gray35: "#DBDBD9",
        Gray40: "#C4C4C0",
        Gray45: "#969693",
        Gray50: "#52524F",
        Gray60: "#323232",
        Gray70: "#121212",
        Gray80: "#000000",
        errorDark: "#CB3939",
        link: "#386C92",
        maroon: "#943848",
        yellow: "#F89A1E",
        brightGreen: "#4EAB75",
        green: "#3C5634",
        turquoise: "#105E5E",
        navy: "#1C3C64",
        blue: "#225FA7",
      },
    },
    architecture: {
      framework: "React (Next.js) — data-theme='legacy', SSR + WordPress filter-card widget + D3.js + jQuery",
      projectId: "theathletic",
      hosting: "nytimes.com/athletic/",
      hierarchy: [
        "div#__next (Next.js app root)",
        "  div (position:relative, min-height:100vh, flex column)",
        "    header > nav.HeaderNav_HeaderNav (same as other Athletic articles)",
        "    div.root.legacy > main",
        "      div#body-container.Container_default-padding",
        "        div.Article_ArticleWrapper",
        "          div#storyline-root.Storyline_Root ('2026 NFL' with 5 links)",
        "          div.Article_FeaturedImageContainer (hero illustration)",
        "          div.Article_Wrapper.the-lead-article",
        "            div.Article_ArticleHeader.Article_FeaturedArticleHeader",
        "              h1.Article_Headline.Article_Featured",
        "              div.Article_BylineGrid (Daniel Popper + March 5, 2026 + 110 comments)",
        "            div#article-container-grid.Article_ContainerGrid",
        "              div.Article_ContentContainer.article-content-container.bodytext1",
        "                p (intro body text — 4 paragraphs)",
        "                div[data-ath-video-stream] (DASH/HLS video embed)",
        "                p (filter instructions)",
        "                style (inline filter card overrides)",
        "                link (filter-card.css, filter-card-theme-default.css, filter-card-theme-brandedstat.css)",
        "                script (d3.v7.min.js, filtercard.js, jquery.min.js, big-board-charts.js)",
        "                div#filtered-cards.article-fullwidth.fc.fc-branded.fc-cs-green",
        "                  div.fc-filter-container.fc-flex (4 select dropdowns + expand/collapse)",
        "                  div.fc-cards-container (search input + 150 div.fc-card elements)",
        "                    div.fc-card.fc-free-agency[data-name] (per player card)",
        "                      div.fc-rank > div.fc-rank-text (rank number 1-150)",
        "                      h3.fc-player-headline (player name)",
        "                      img.fc-right-col-image (team logo 300×300)",
        "                      div.fc-spotlight-text (contract years + value)",
        "                      div.fc-copy (expandable scouting report + contract details)",
        "                h2#sect-0 (Methodology and statistical notes)",
        "                p (methodology paragraphs — grading scale, contract projections, stats sources)",
        "                div.ad-container (mid1)",
        "                p (more methodology — ages, TruMedia, snap rates, pressure figures)",
        "              div.PuzzleEntryPoint_PuzzleContainer (Connections: Sports Edition)",
        "              div.Article_WriterBioContainer (Daniel Popper bio + headshot)",
        "    footer.Footer_footer",
      ],
      layoutTokens: {
        maxContentWidth: "1248px (Container_container)",
        bodyFontSize: "16px base (nyt-imperial for body, nyt-franklin for UI)",
        bodyLineHeight: "139% (1.39) for body; 100% for labels",
        headlineFont: "nyt-cheltenham 400",
        uiFont: "nyt-franklin 500-700",
        avatarSize: "40px byline",
        avatarRadius: "20px (circular)",
        adMargin: "48px 0 desktop, 40px 0 mobile",
        adMinHeight: "300px",
        breakpointMobile: "599.95px",
        breakpointTablet: "1023.95px",
        breakpointDesktop: "1248px",
        gridSystem: "Grid_xsNumber12 (12-col base), sm/md variants",
        articleGridSplit: "9/12 content + sidebar on md+",
        filterCardFullWidth: "article-fullwidth class breaks out of 9/12 grid",
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
        "/athletic/_next/static/css/fa0ee2f24413d9bc.css",
        "/athletic/_next/static/css/94fb3b1f97a112fd.css",
        "/athletic/_next/static/css/e3454c5f8a3931f2.css",
        "/athletic/_next/static/css/3037c331ee17085d.css",
        "https://theathletic.com/app/themes/athletic/assets/css/filter-card.css",
        "https://theathletic.com/app/themes/athletic/assets/css/InteractiveStorytelling/widget-styles.css",
        "https://theathletic.com/app/themes/athletic/assets/css/filter-card-theme-default.css",
        "https://theathletic.com/app/themes/athletic/assets/css/filter-card-theme-brandedstat.css",
      ],
      contentBlocks: [
        "header (headline h1 — nyt-cheltenham 400, Article_Featured variant)",
        "storyline (horizontal nav bar — '2026 NFL' with 5 story links: Top Remaining Free Agents, Winners & Losers, Remaining Team Needs, Grading Deals, Best Available)",
        "featured-image (full-width hero illustration, srcSet 600-1920w, fetchpriority=high)",
        "image-credit (span.Article_ImageCredit — 'Illustration: Dan Goldfarb / The Athletic; Larry Radloff, Cooper Neill, Michael Owens / Getty Images')",
        "byline (author avatar 40×40 r:20px + 'By Daniel Popper' underlined + <time>March 5, 2026</time>)",
        "social-bar (3 Pill buttons: share-full + share-icon + comments '110')",
        "body-text (nyt-imperial 20px/400, intro: 4 paragraphs about free agency tracking)",
        "video-embed (data-ath-video-stream='wmrStQT8XzmHqAt', DASH/HLS dual-source, 9:16 aspect)",
        "body-text (filter instructions paragraph)",
        "filter-card-tracker (div#filtered-cards.fc-branded.fc-cs-green — 150 ranked free agent cards, 4 dropdown filters, search, expand/collapse, team logos, contract spotlights, scouting reports)",
        "subhed (h2#sect-0: Methodology and statistical notes)",
        "body-text (methodology: grading 2.0–8.0 scale, contract projections, stats from TruMedia)",
        "ad-container (mid1)",
        "body-text (methodology continued: ages, snap rates, pressures, splash plays)",
        "puzzle-entry-point (Connections: Sports Edition)",
        "author-bio (Daniel Popper — The Athletic)",
      ],
      publicAssets: {
        socialImages: [
          { name: "og-image", url: "https://static01.nyt.com/athletic/uploads/wp/2026/02/04143320/0305_Top150_NFL_FreeAgents.jpg?width=1200&height=630&fit=cover", ratio: "1.91:1", desc: "Facebook/OG share image — illustration of Willis, Hendrickson, Linderbaum" },
          { name: "twitter-card", url: "https://static01.nyt.com/athletic/uploads/wp/2026/02/04143320/0305_Top150_NFL_FreeAgents.jpg?width=1200&height=675&fit=cover", ratio: "16:9", desc: "Twitter card image" },
        ],
        authorHeadshot: { url: "https://static01.nyt.com/athletic/uploads/wp/2020/04/13220252/HS_Square_0034_20200227Popper-Daniel0542_bw.jpg", desc: "Daniel Popper headshot (byline avatar 40px)" },
        filterCardAssets: {
          css: [
            "https://theathletic.com/app/themes/athletic/assets/css/filter-card.css",
            "https://theathletic.com/app/themes/athletic/assets/css/filter-card-theme-default.css",
            "https://theathletic.com/app/themes/athletic/assets/css/filter-card-theme-brandedstat.css",
          ],
          scripts: [
            "https://theathletic.com/app/themes/athletic/assets/js/d3.v7.min.js",
            "https://theathletic.com/app/themes/athletic/assets/js/filtercard.js",
            "https://theathletic.com/app/themes/athletic/assets/js/jquery.min.js",
            "https://theathletic.com/app/themes/athletic/assets/js/big-board-charts.js",
          ],
          tallysight: {
            workspace: "the-athletic",
            theme: "light",
            src: "https://storage.googleapis.com/tallysight-widgets/dist/tallysight.min.js",
          },
        },
        icons: [
          { name: "hamburger-menu", file: "/icons/athletic/hamburger-menu.svg", r2: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/icons/athletic/hamburger-menu.svg", size: "30×30", fill: "currentColor (var(--Gray10))", usage: "button.DesktopNav_HamburgerMenuContainer", element: "button[aria-label='Toggle hamburger menu']" },
          { name: "wordmark", file: "/icons/athletic/wordmark.svg", r2: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/icons/athletic/wordmark.svg", size: "1449×200", fill: "#FFFFFF (on dark header bg)", usage: "a.athletic-slab-logo — header wordmark", element: "a.athletic-slab-logo > div > img" },
        ],
      },
    },
    contentBlocks: [
      { type: "storyline", title: "2026 NFL", links: [
        { label: "Top Remaining Free Agents", href: "https://www.nytimes.com/athletic/7147350/2026/03/27/nfl-best-free-agent-fits-best-worst-teams/" },
        { label: "Winners & Losers", href: "https://www.nytimes.com/athletic/7116434/2026/03/17/nfl-free-agency-2026-winners-losers-ravens-raiders/" },
        { label: "Remaining Team Needs", href: "https://www.nytimes.com/athletic/7114161/2026/03/14/2026-free-agency-team-needs-players/" },
        { label: "Grading Deals", href: "https://www.nytimes.com/athletic/7093735/2026/03/09/nfl-free-agency-grades-2026/" },
        { label: "Best Available", href: "https://www.nytimes.com/athletic/7091448/2026/03/09/best-available-nfl-free-agents-2026/" },
      ] },
      { type: "featured-image", credit: "Illustration: Dan Goldfarb / The Athletic; Larry Radloff, Cooper Neill, Michael Owens / Getty Images" },
      { type: "header" },
      { type: "byline" },
      { type: "video-embed", streamId: "wmrStQT8XzmHqAt", sources: [
        { type: "application/dash+xml", url: "https://video.nyt.com/athletic/streams/wmrStQT8XzmHqAt/ErFVDhEHWbw2/ErFVDhEHWbw2.mpd" },
        { type: "application/x-mpegURL", url: "https://video.nyt.com/athletic/streams/wmrStQT8XzmHqAt/ErFVDhEHWbw2/ErFVDhEHWbw2.m3u8" },
      ] },
      { type: "filter-card-tracker", title: "Top 150 NFL Free Agents", colorScheme: "green", cardCount: 150, searchEnabled: true, expandCollapse: true, filters: [
        { label: "Position", options: ["C", "CB", "Edge", "G", "IDL", "LB", "QB", "RB", "S", "T", "TE", "WR"] },
        { label: "Availability", options: ["Agreed", "Still available"] },
        { label: "Previous team", options: ["49ers", "Bears", "Bengals", "Bills", "Broncos", "Browns", "Buccaneers", "Cardinals", "Chargers", "Chiefs", "Colts", "Commanders", "Cowboys", "Dolphins", "Eagles", "Falcons", "Giants", "Jaguars", "Jets", "Lions", "Packers", "Panthers", "Patriots", "Raiders", "Rams", "Ravens", "Saints", "Seahawks", "Steelers", "Texans", "Titans", "Vikings"] },
        { label: "New team", options: ["49ers", "Bears", "Bengals", "Bills", "Broncos", "Browns", "Buccaneers", "Cardinals", "Chargers", "Chiefs", "Colts", "Commanders", "Cowboys", "Dolphins", "Eagles", "Falcons", "Giants", "Jaguars", "Jets", "Lions", "Packers", "Panthers", "Patriots", "Raiders", "Rams", "Ravens", "Saints", "Seahawks", "Steelers", "Texans", "Titans", "Vikings"] },
      ] },
      { type: "subhed", text: "Methodology and statistical notes" },
      { type: "ad-container", position: "mid1" },
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
  /* ── NYT Interactive — Trump Tariffs U.S. Imports ───────────────── */
  {
    id: "trump-tariffs-us-imports",
    title: "How Much Will Trump\u2019s Tariffs Cost U.S. Importers?",
    url: "https://www.nytimes.com/interactive/2025/04/03/business/economy/trump-tariffs-us-imports.html",
    authors: ["Lazaro Gamio"],
    date: "2025-04-09",
    section: "Business/Economy",
    type: "interactive" as const,
    description: "It will cost an extra nearly $900 billion in tariffs to bring shoes, TVs and all other imports into the United States, a new analysis of trade data shows.",
    ogImage: "https://static01.nyt.com/images/2025/04/03/multimedia/2025-04-01-tariff-revenue-analysis-index/2025-04-01-tariff-revenue-analysis-index-facebookJumbo-v10.png",
    tags: ["Tariff", "International Trade", "Donald Trump", "China", "Canada", "Mexico", "Protectionism", "Business", "Economy", "vis-design"],
    graphicsCount: 3,
    figuresCount: 14,
    tools: {
      topper: "ai2html v0.121.1",
      charts: "Birdkit/Svelte custom chart + Birdkit/Svelte sortable table",
      framework: "Birdkit (Svelte/SvelteKit) embedded in vi-interactive (React shell)",
      hosting: "static01.nytimes.com/newsgraphics/2025-04-01-tariff-revenue-analysis/",
    },
    chartTypes: [
      { type: "ai2html", tool: "ai2html v0.121.1", topic: "Tariff cost topper" },
      { type: "arrow-chart", tool: "Birdkit/Svelte", topic: "Trade-weighted tariff-rate change across top import partners" },
      { type: "table", tool: "Birdkit/Svelte", topic: "Average tariff-rate change across countries with $1B+ in imports" },
    ],
    quoteSections: [],
    fonts: [
      {
        name: "nyt-cheltenham",
        cssVar: "--g-chelt",
        fullStack: 'nyt-cheltenham, cheltenham-fallback-georgia, cheltenham-fallback-noto, georgia, "times new roman", times, serif',
        weights: [500, 700],
        role: "Display serif for chart values, table headings, and topper numerics",
        usedIn: [
          "Topper totals: 22px/26px mobile, 32px/38px desktop",
          "Section headings: 28px/500 editorial serif",
          "Increase column: bold serif accent in orange",
        ],
      },
      {
        name: "nyt-franklin",
        cssVar: "--g-franklin",
        fullStack: '"nyt-franklin", arial, helvetica, sans-serif',
        weights: [400, 500, 700],
        role: "Primary sans-serif for body copy, action chrome, labels, notes, and table text",
        usedIn: [
          "Body paragraphs: 15px/20px #363636",
          "Share/save/gift/more action pills: uppercase Franklin chrome",
          "Storyline nav, chart labels, source credits, and table headers",
        ],
      },
    ],
    brandFonts: {
      editorial: ["nyt-cheltenham", "nyt-franklin"],
      graphics: ["nyt-franklin", "nyt-cheltenham"],
      games: [],
    },
    colors: {
      chartPalette: [
        { name: "Tariff Accent", hex: "#BC6C14" },
        { name: "Deep Navy", hex: "#000333" },
        { name: "Body Gray", hex: "#363636" },
        { name: "Muted Gray", hex: "#727272" },
        { name: "Divider", hex: "#DFDFDF" },
        { name: "Background", hex: "#FFFFFF" },
      ],
      editorial: {
        primary: "#121212",
        secondary: "#363636",
        faint: "#727272",
        nytBlue: "#326891",
        background: "#FFFFFF",
      },
    },
    architecture: {
      framework: "Birdkit (Svelte/SvelteKit) embedded in vi-interactive (React shell)",
      projectId: "2025-04-01-tariff-revenue-analysis",
      hydrationId: "c069d52d-68cf-4000-a726-5acfd8161fa6",
      hosting: "static01.nytimes.com/newsgraphics/2025-04-01-tariff-revenue-analysis/",
      hierarchy: [
        "div#story-top (vi-interactive React shell)",
        "  header (headline, byline, metered sharetools/action chrome)",
        "  div.storyline-nav (Tariffs and Trade facsimile rail)",
        "  div.ai2html-container (responsive topper with separate mobile and desktop artboards)",
        "  article.g-body (Franklin body copy with inline links)",
        "  section.arrow-chart (trade-weighted average tariff-rate change among top 10 partners)",
        "  section.tariff-table (sortable/collapsible tariff-rate table across 86 countries)",
        "  p.reporting-credit (Ana Swanson contributed reporting.)",
      ],
      layoutTokens: {
        bodyWidth: "600px",
        topperMobileWidth: "320px",
        topperDesktopWidth: "600px",
        sectionHeading: "nyt-cheltenham 28px/500",
        bodyCopy: "nyt-franklin 15px/20px #363636",
        actionBar: "pill buttons with 1px #DFDFDF border, 30px radius",
      },
      cssFiles: [
        "vi-interactive platform bundle",
        "ai2html topper inline stylesheet",
        "Birdkit/Svelte component CSS for chart and table modules",
      ],
      publicAssets: {
        ai2htmlArtboards: {
          mobile: {
            url: "https://static01.nytimes.com/newsgraphics/2025-04-01-tariff-revenue-analysis/c069d52d-68cf-4000-a726-5acfd8161fa6/_assets/topper-as-mobile.png",
            width: 320,
            desc: "Mobile tariff topper artboard (320×1179)",
          },
          desktop: {
            url: "https://static01.nytimes.com/newsgraphics/2025-04-01-tariff-revenue-analysis/c069d52d-68cf-4000-a726-5acfd8161fa6/_assets/topper-as-middle.png",
            width: 600,
            desc: "Desktop tariff topper artboard (600×2110)",
          },
        },
        socialImages: [
          { name: "facebookJumbo", url: "https://static01.nyt.com/images/2025/04/03/multimedia/2025-04-01-tariff-revenue-analysis-index/2025-04-01-tariff-revenue-analysis-index-facebookJumbo-v10.png", ratio: "1.91:1", desc: "Facebook/OG share image" },
          { name: "video16x9-3000", url: "https://static01.nyt.com/images/2025/04/03/multimedia/2025-04-01-tariff-revenue-analysis-index/2025-04-01-tariff-revenue-analysis-index-videoSixteenByNine3000-v6.png", ratio: "16:9", width: 3000, desc: "Twitter card image" },
          { name: "video16x9-1600", url: "https://static01.nyt.com/images/2025/04/03/multimedia/2025-04-01-tariff-revenue-analysis-index/2025-04-01-tariff-revenue-analysis-index-videoSixteenByNineJumbo1600-v12.png", ratio: "16:9", width: 1600, desc: "JSON-LD primary image" },
          { name: "google4x3", url: "https://static01.nyt.com/images/2025/04/03/multimedia/2025-04-01-tariff-revenue-analysis-index/2025-04-01-tariff-revenue-analysis-index-googleFourByThree-v8.png", ratio: "4:3", width: 800, desc: "Google Discover image" },
          { name: "square3x", url: "https://static01.nyt.com/images/2025/04/03/multimedia/2025-04-01-tariff-revenue-analysis-index/2025-04-01-tariff-revenue-analysis-index-mediumSquareAt3X-v9.png", ratio: "1:1", width: 1000, desc: "Square thumbnail" },
        ],
      },
      tierNotes: {
        excluded: [
          "Advertising containers, ad labels, and ad-tech scripts are intentionally omitted by request.",
        ],
        tier2: [
          {
            name: "Share/save/gift/more action bar",
            reason: "Visual chrome is recreated, but NYT account-aware state, gifting flows, and popup behaviors depend on product backends that are not part of the saved source bundle.",
          },
          {
            name: "Tariffs and Trade storyline rail",
            reason: "The navigation treatment is reproduced, but not the upstream NYT storyline CMS wiring behind those links.",
          },
          {
            name: "Recirculation card shells",
            reason: "The page references live editorial recommendation systems, but the saved bundle does not preserve a stable recommendation feed contract for faithful replay.",
          },
        ],
        tier3: [
          {
            name: "vi-interactive platform shell",
            reason: "Rendering, hydration, and orchestration belong to NYT platform infrastructure rather than the article-authored modules themselves.",
          },
          {
            name: "Analytics, consent, and instrumentation",
            reason: "Tracking, privacy, and observability scripts are operational layers, not reusable article components.",
          },
          {
            name: "Authenticated save/gift/subscriber states",
            reason: "These states require NYT identity, entitlement, and persistence services that are unavailable in the saved page snapshot.",
          },
          {
            name: "Footer and sitewide utility shell",
            reason: "Site information and legal chrome are documented as platform furniture rather than rebuilt as article-specific design-doc components.",
          },
        ],
      },
    },
    contentBlocks: [
      { type: "header" },
      { type: "byline" },
      {
        type: "sharetools-bar",
        tier: "tier-2-facsimile",
        buttons: [
          { label: "Share full article", kind: "gift" },
          { label: "More sharing options", kind: "more" },
          { label: "Save article", kind: "save" },
        ],
      },
      {
        type: "storyline",
        primitiveId: "nyt.storyline.tariffs-and-trade.standard",
        title: "Tariffs and Trade",
      },
      {
        type: "ai2html",
        title: "The cost of new tariffs on U.S. imports",
        source: "Trade Partnership Worldwide analysis of Census Bureau trade data",
        note: "Figures are rounded and may not add up exactly to the total tally. The figures provided for China, Mexico and Canada are for the announced tariffs that target those countries specifically; they are also subject to tariffs on autos, steel and aluminum.",
        credit: "The New York Times",
        overlaySet: "trump-tariffs-us-imports-topper",
        artboards: {
          mobile: {
            url: "https://static01.nytimes.com/newsgraphics/2025-04-01-tariff-revenue-analysis/c069d52d-68cf-4000-a726-5acfd8161fa6/_assets/topper-as-mobile.png",
            width: 320,
            height: 1179.42848,
          },
          desktop: {
            url: "https://static01.nytimes.com/newsgraphics/2025-04-01-tariff-revenue-analysis/c069d52d-68cf-4000-a726-5acfd8161fa6/_assets/topper-as-middle.png",
            width: 600,
            height: 2110.0002,
          },
        },
      },
      { type: "body-copy", html: "It will cost an additional $898 billion to bring shoes, TVs and all other imports into the United States, a new analysis of trade data shows, as President Trump enacts an expansive wave of tariffs on America\u2019s biggest trading partners." },
      { type: "body-copy", html: "Since entering office in January, Mr. Trump has placed a growing number of import taxes on products from Canada, Mexico, China and other nations, in addition to a range of goods that come from anywhere in the world. On Wednesday, expansive tariffs on most nations went into effect, even as many countries were trying to <a href=\"https://www.nytimes.com/interactive/2025/04/07/business/economy/trump-tariffs-reaction-china-eu-canada.html\">bargain their way</a> out of the higher rates." },
      { type: "body-copy", html: "In many cases, new tariffs are being placed on top of other new tariffs \u2014 part of one of the most aggressive American trade policies in a century." },
      { type: "body-copy", html: "China, one of the few countries that has retaliated against the Trump administration\u2019s new tariffs, was hit with an additional 50 percent duty in addition to previously announced 34 percent tariffs. Combined, that puts China\u2019s new tariff rate to 104 percent. China is also subject to additional duties on many products, so the total import tax on some of its products could be even higher." },
      { type: "body-copy", html: "If the new global rates were applied to everything the United States imported last year, the combined cost in tariffs to bring in all of those goods from around the world would be more than 10 times what companies paid in 2024, according to a calculation from Trade Partnership Worldwide, an economic research firm in Washington." },
      { type: "body-copy", html: "In practice, trade patterns will likely change as a result of these policies, and countries may be granted exemptions as they negotiate with the Trump administration. But the magnitude of the increase in tariffs will likely remain high for most nations." },
      { type: "body-copy", html: "\u201cThese are staggering high tariffs that will have a major impact on costs for a wide range of products,\u201d said Dan Anthony, president of Trade Partnership Worldwide. \u201cBetween the new rates and China-specific tariffs announced in February, cellphones alone would have faced $27.5 billion in extra import taxes based on these 2024 import values.\u201d" },
      { type: "body-copy", html: "Because of the compounding nature of many of the tariffs, rates for importing goods vary wildly for different countries. China, which was already subject to higher tariffs during Mr. Trump\u2019s first term, jumped to nearly 106 percent from 11 percent. Mexico and Canada, which were spared by the recent round, jumped to 16 percent and 13 percent." },
      { type: "body-copy", html: "Some countries were spared even further. Ireland, for example, was hit with a 20 percent tariff given to all European Union members, but carve outs in Mr. Trump\u2019s executive order for pharmaceutical goods \u2014 Ireland\u2019s major export to the United States \u2014 meant the country\u2019s average tariff rate increased minimally." },
      {
        type: "tariff-rate-arrow-chart",
        title: "Change in trade-weighted average tariff rate",
        leadin: "Among the 10 largest U.S. import partners",
        source: "Trade Partnership Worldwide analysis of Census Bureau trade data",
        credit: "The New York Times",
      },
      { type: "body-copy", html: "Many countries have retaliated with tariffs of their own on American goods, with threats of more to follow. But even as nations wage a diplomatic battle, some companies have been rushing to bring in goods from overseas before the new tariffs take effect. Others have been racing to secure exemptions. But for many, the new costs will be unavoidable." },
      { type: "body-copy", html: "As companies and consumers will largely bear the higher cost of importing goods, Mr. Trump\u2019s trade policies could come with a large economic toll. Consumer sentiment has begun to fall, inflation is <a href=\"https://www.nytimes.com/2025/03/31/business/trump-tariffs-higher-prices.html\">expected to rise</a>, and global <a href=\"https://www.nytimes.com/2025/04/02/business/trump-tariffs-global-stock-markets.html\">stocks have been plunging</a>. Even Mr. Trump has suggested that his policies could cause a recession." },
      { type: "body-copy", html: "Nevertheless, Mr. Trump has continued to suggest that more trade actions could follow." },
      {
        type: "tariff-rate-table",
        title: "See how the average tariff rate has changed across countries",
        leadin: "Change in trade-weighted average tariff rate among countries with $1 billion or more of imports into the U.S., sorted by largest increase",
        source: "Trade Partnership Worldwide analysis of Census Bureau trade data",
        credit: "The New York Times",
        initialVisibleRows: 10,
      },
      { type: "reporting-credit", text: "Ana Swanson contributed reporting." },
      { type: "author-bio" },
    ],
  },
  /* ── NYT Interactive — Trump Tariffs Country Reactions ──────────── */
  {
    id: "trump-tariffs-reaction",
    title: "No Big Stick: Many Tariff Targets Avoid Hitting Back",
    url: "https://www.nytimes.com/interactive/2025/04/07/business/economy/trump-tariffs-reaction-china-eu-canada.html",
    authors: ["Agnes Chang", "Lazaro Gamio", "Samuel Granados", "Lauren Leatherby"],
    date: "2025-04-07",
    section: "Business/Economy",
    type: "interactive" as const,
    description: "Just two of the 20 largest exporters to the United States have matched Mr. Trump\u2019s moves with new tariffs of their own.",
    ogImage: "https://static01.nytimes.com/newsgraphics/2025-04-07-tariff-country-negotiations/00fe2fc6-24b7-4305-8c9f-ffe96ec408a1/_assets/trade-treemap-Artboard_1_copy.png",
    tags: ["Tariff", "International Trade", "Donald Trump", "China", "Canada", "European Union", "Trade War", "vis-design"],
    graphicsCount: 2,
    figuresCount: 20,
    tools: {
      topper: "ai2html v0.121.1 (responsive treemap)",
      charts: "none (custom Birdkit/Svelte status table)",
      framework: "Svelte (SvelteKit) + vi-interactive platform (React shell)",
      hosting: "static01.nytimes.com/newsgraphics/2025-04-07-tariff-country-negotiations/",
    },
    chartTypes: [
      { type: "treemap", tool: "ai2html", topic: "20 largest US export trading partners — boxes sized by export value" },
      { type: "status-table", tool: "Birdkit/Svelte", topic: "20-country tariff response tracker — Retaliated / Negotiating / Offered Concessions" },
    ],
    quoteSections: [],
    /** Fonts — extracted from article HTML/CSS */
    fonts: [
      {
        name: "nyt-franklin",
        cssVar: "--g-franklin",
        fullStack: '"nyt-franklin", helvetica, arial, sans-serif',
        weights: [500, 700],
        role: "Primary sans-serif — header byline, graphic labels, table text, status badges",
        usedIn: [
          "p.Byline (.g-header .g-byline): 14px/700/18px #363636",
          "time.Timestamp: 13px/500/18px #363636",
          "span.GraphicLabel (ai2html .g-pstyle): 11px/500/- #121212 (treemap country labels)",
          "th.TableHeader (.g-table .g-th): 12px/700/- uppercase letter-spacing:0.04em #121212",
          "td.TableCell (.g-table .g-td): 14px/500/20px #121212",
          "span.StatusBadge (.g-retaliated): 11px/700/- letter-spacing:0.04em uppercase #fff bg:#B86200",
          "span.StatusBadge (.g-trying-to-negotiate): 11px/700/- uppercase #fff bg:#4E9493",
          "span.StatusBadge (.g-no-retaliation): 11px/700/- uppercase #666666",
          "span.GraphicNote (.g-note): 12px/500/- #666666",
          "span.GraphicCredit (.g-credit): 12px/500/- #666666",
        ],
      },
      {
        name: "nyt-cheltenham",
        cssVar: "--g-chelt",
        fullStack: 'nyt-cheltenham, cheltenham-fallback-georgia, georgia, "times new roman", times, serif',
        weights: [500],
        role: "Display headline — bold italic header in g-style-bolditalic g-theme-news",
        usedIn: [
          "h1.Headline (.g-header): 36px/500/40px font-style:italic text-align:left #121212 (desktop: 45px/50px)",
        ],
      },
      {
        name: "nyt-imperial",
        cssVar: "--g-imperial",
        fullStack: '"nyt-imperial", georgia, "times new roman", times, serif',
        weights: [500],
        role: "Body copy serif — lead paragraphs between the treemap and tariff-response table",
        usedIn: [
          "p.g-text: 20px/500/30px #121212 with NYT blue inline links",
        ],
      },
    ],
    /** Brand-specific font context */
    brandFonts: {
      editorial: ["nyt-cheltenham"],
      graphics: ["nyt-franklin", "nyt-imperial"],
      games: [],
    },
    /** Color palette — extracted from source HTML/CSS */
    colors: {
      statusColors: {
        retaliated: "#B86200",
        possibleRetaliation: "#B86200",
        negotiating: "#4E9493",
        noRetaliation: "#666666",
        offeredConcessions: "#4E9493",
      },
      chartPalette: [
        { name: "Body text gray", hex: "#666666" },
        { name: "Retaliation orange", hex: "#B86200" },
        { name: "Negotiation teal", hex: "#4E9493" },
        { name: "White text", hex: "#FFFFFF" },
        { name: "Light gray", hex: "#D3D3D3" },
        { name: "Pale gray", hex: "#E8E8E8" },
      ],
      editorial: {
        primary: "#121212",
        secondary: "#363636",
        faint: "#727272",
        nytBlue: "#326891",
        background: "#FFFFFF",
      },
    },
    /** Birdkit framework architecture */
    architecture: {
      framework: "Birdkit (Svelte/SvelteKit) embedded in vi-interactive (React shell)",
      projectId: "2025-04-07-tariff-country-negotiations",
      hydrationId: "00fe2fc6-24b7-4305-8c9f-ffe96ec408a1",
      hosting: "static01.nytimes.com/newsgraphics/2025-04-07-tariff-country-negotiations/",
      hierarchy: [
        "div#story-top (vi-interactive React shell)",
        "  div#interactive-masthead-spacer (site shell spacer)",
        "  div.masthead-shell (menu, search, account entrypoints)",
        "  div.storyline-shell (Tariffs and Trade storyline rail)",
        "  header.g-header.g-style-bolditalic.g-theme-news (article header)",
        "    h1 (nyt-cheltenham bold italic)",
        "    p.g-byline (nyt-franklin 700)",
        "  div.g-body (body paragraphs — nyt-imperial)",
        "  div.ai2html-container (treemap — responsive artboards)",
        "    div.g-artboard[data-min-width=0] (mobile ≤599px)",
        "      img.g-aiImg (treemap PNG)",
        "    div.g-artboard[data-min-width=600] (desktop ≥600px)",
        "      img.g-aiImg (treemap PNG)",
        "  h3.g-subhed (section subheading — nyt-franklin 700)",
        "  div.g-table (interactive country response table)",
        "    div.g-row (20 rows: status badge + country + tariff % + exports + note)",
      ],
      layoutTokens: {
        bodyWidth: "600px (--g-width-body)",
        headerStyle: "bold italic — g-style-bolditalic (nyt-cheltenham 500 italic)",
        headerTheme: "g-theme-news (standard news article treatment)",
        treemapMobileWidth: "≤599px",
        treemapDesktopWidth: "≥600px",
        tableStatusSystem: "5-class: g-retaliated · g-threatening-retaliation · g-no-retaliation · g-trying-to-negotiate · g-offered-concessions",
      },
      cssFiles: [
        "Birdkit CSS bundle (vi-interactive platform)",
      ],
      publicAssets: {
        socialImages: [
          {
            name: "facebookJumbo",
            url: "https://static01.nyt.com/images/2025/04/07/multimedia/2025-04-07-tariff-country-negotiations-index/2025-04-07-tariff-country-negotiations-index-facebookJumbo-v9.png",
            ratio: "1.91:1",
            desc: "Facebook/OG share image",
          },
          {
            name: "video16x9-3000",
            url: "https://static01.nyt.com/images/2025/04/07/multimedia/2025-04-07-tariff-country-negotiations-index/2025-04-07-tariff-country-negotiations-index-videoSixteenByNine3000-v6.png",
            ratio: "16:9",
            width: 3000,
            desc: "Twitter card image",
          },
          {
            name: "video16x9-1600",
            url: "https://static01.nyt.com/images/2025/04/07/multimedia/2025-04-07-tariff-country-negotiations-index/2025-04-07-tariff-country-negotiations-index-videoSixteenByNineJumbo1600-v9.png",
            ratio: "16:9",
            width: 1600,
            desc: "JSON-LD primary image",
          },
          {
            name: "google4x3",
            url: "https://static01.nyt.com/images/2025/04/07/multimedia/2025-04-07-tariff-country-negotiations-index/2025-04-07-tariff-country-negotiations-index-googleFourByThree-v7.png",
            ratio: "4:3",
            width: 800,
            desc: "Google Discover image",
          },
          {
            name: "square3x",
            url: "https://static01.nyt.com/images/2025/04/07/multimedia/2025-04-07-tariff-country-negotiations-index/2025-04-07-tariff-country-negotiations-index-mediumSquareAt3X-v8.png",
            ratio: "1:1",
            width: 1000,
            desc: "Square thumbnail",
          },
        ],
        ai2htmlArtboards: {
          mobile: {
            url: "https://static01.nytimes.com/newsgraphics/2025-04-07-tariff-country-negotiations/00fe2fc6-24b7-4305-8c9f-ffe96ec408a1/_assets/trade-treemap-Artboard_1.png",
            width: 700,
            desc: "Mobile treemap artboard (≤599px)",
          },
          desktop: {
            url: "https://static01.nytimes.com/newsgraphics/2025-04-07-tariff-country-negotiations/00fe2fc6-24b7-4305-8c9f-ffe96ec408a1/_assets/trade-treemap-Artboard_1_copy.png",
            width: 1200,
            desc: "Desktop treemap artboard (≥600px)",
          },
        },
      },
    },
    contentBlocks: [
      {
        type: "site-header-shell",
        title: "Site Header Shell",
        primitiveId: "nyt.interactive.header-shell.standard",
      },
      {
        type: "storyline",
        primitiveId: "nyt.storyline.tariffs-and-trade.standard",
        title: "Tariffs and Trade",
      },
      { type: "header" },
      { type: "byline" },
      {
        type: "sharetools-bar",
        buttons: [
          { kind: "gift", label: "Share full article" },
          { kind: "more", label: "More" },
          { kind: "save", label: "Save" },
        ],
        tier: "tier-2-facsimile",
      },
      {
        type: "ai2html",
        title: "The 20 Largest Exporters to the United States",
        note: "Boxes sized by value of exports to the United States. Only the 20 largest exporters to the U.S. are shown.",
        source: "U.S. International Trade Commission",
        credit: "The New York Times",
        overlaySet: "trade-treemap",
        artboards: {
          mobile: {
            url: "https://static01.nytimes.com/newsgraphics/2025-04-07-tariff-country-negotiations/00fe2fc6-24b7-4305-8c9f-ffe96ec408a1/_assets/trade-treemap-Artboard_1.png",
            width: 700,
            height: 880,
          },
          desktop: {
            url: "https://static01.nytimes.com/newsgraphics/2025-04-07-tariff-country-negotiations/00fe2fc6-24b7-4305-8c9f-ffe96ec408a1/_assets/trade-treemap-Artboard_1_copy.png",
            width: 1200,
            height: 900,
          },
        },
      },
      {
        type: "body-copy",
        html: "For now, most world leaders are trying to bargain their way out of the sweeping new American tariffs. Just two of the 20 largest exporters to the United States have countered them with new tariffs of their own.",
      },
      {
        type: "body-copy",
        html: "One was China, which said Friday that it would impose a 34 percent import tax on products coming from the United States. That prompted escalation from the Trump administration: Rescind the tax, it warned, or American tariffs on China would go up another 50 percent.",
      },
      {
        type: "body-copy",
        html: "The other was Canada, which last month placed tariffs on a variety of U.S. goods. The European Union, while signalling that it would prefer to negotiate, is said to be working to <a href=\"https://www.nytimes.com/2025/04/07/world/europe/europe-tariffs-trump-response.html\">finalize a list</a> of U.S. goods that it would target.",
      },
      {
        type: "body-copy",
        html: "Other economies — even large ones like Japan and South Korea — don’t have the same leverage, and many are <a href=\"https://www.nytimes.com/2025/04/07/us/politics/trump-tariffs-foreign-governments-negotiations.html\">offering concessions</a>. Some are offering to lower their own tariff rates as they try to reach an agreement with the Trump administration.",
      },
      {
        type: "body-copy",
        html: "But it’s unclear how much President Trump wants to negotiate, and a White House trade advisor <a href=\"https://www.nytimes.com/live/2025/04/07/business/trump-tariffs-stock-market/a-top-white-house-adviser-indicates-that-offers-from-trading-partners-wont-convince-trump-to-retreat?smid=url-share\">warned</a> on Monday that even lowering tariffs to zero would not be enough to get the United States to back down.",
      },
      { type: "subhed", text: "How major trade partners are responding" },
      {
        type: "tariff-country-table",
        title: "Tariff Responses by Trading Partner",
        source: "U.S. International Trade Commission",
        noteText: "Goods from Canada and Mexico that fall under the U.S.M.C.A. trade pact — the agreement that replaced NAFTA — are not subject to the 25 percent tariffs.",
      },
      { type: "author-bio" },
    ],
  },
] as const;

export function isAthleticArticle(article: (typeof ARTICLES)[number]): boolean {
  return article.url.includes("/athletic/");
}

export const NYT_ARTICLES = ARTICLES.filter((article) => !isAthleticArticle(article));

export const ATHLETIC_ARTICLES = ARTICLES.filter((article) => isAthleticArticle(article));

export type ArticleReference = (typeof ARTICLES)[number];

export type ArticleSocialImageReference = {
  name: string;
  url: string;
  ratio?: string;
  width?: number;
  desc?: string;
};

const ARTICLE_SHARE_IMAGE_PRIORITY = [
  "video16x9-3000",
  "video16x9-1600",
  "facebookJumbo",
  "og-image",
  "google4x3",
  "square3x",
] as const;

export function getArticleSocialImages(article: ArticleReference): readonly ArticleSocialImageReference[] {
  const publicAssets = (article as { architecture?: { publicAssets?: { socialImages?: readonly ArticleSocialImageReference[] } } }).architecture?.publicAssets;
  if (publicAssets?.socialImages?.length) {
    return publicAssets.socialImages;
  }
  return article.ogImage ? [{ name: "ogImage", url: article.ogImage }] : [];
}

export function getPreferredArticleShareImage(article: ArticleReference): ArticleSocialImageReference | null {
  const socialImages = getArticleSocialImages(article);
  for (const name of ARTICLE_SHARE_IMAGE_PRIORITY) {
    const match = socialImages.find((image) => image.name === name);
    if (match) {
      return match;
    }
  }
  return socialImages[0] ?? null;
}

/** Returns article sub-links for the sidebar "Pages" sub-section */
export function getArticleSubLinks(): { slug: string; label: string }[] {
  return NYT_ARTICLES.map((article) => ({ slug: article.id, label: article.title }));
}

/** Returns Athletic article sub-links for the sidebar "Pages" sub-section */
export function getAthleticArticleSubLinks(): { slug: string; label: string }[] {
  return ATHLETIC_ARTICLES.map((article) => ({ slug: article.id, label: article.title }));
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
