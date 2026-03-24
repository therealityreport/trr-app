export type DesignDocSectionId =
  | "overview"
  | "app-styles"
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
  | "brand-nyt-games"
  | "brand-nyt-magazine"
  | "brand-wirecutter"
  | "brand-the-athletic"
  | "brand-nyt-opinion"
  | "brand-nyt-cooking"
  | "brand-nyt-style"
  | "brand-nyt-store"
  | "nyt-articles";

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
    id: "nyt-articles",
    label: "NYT Articles",
    description: "Article-level design breakdowns — charts, layouts, typography, and interactive patterns from NYT articles",
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

/* NYT Games expanded sub-sections — per-game design systems */
const NYT_GAMES_SUB_SECTIONS: readonly BrandSubSection[] = [
  { anchor: "typography", label: "Typography" },
  { anchor: "colors", label: "Colors" },
  { anchor: "components", label: "Components" },
  { anchor: "hub-components", label: "Hub Components" },
  { anchor: "game-wordle", label: "Wordle" },
  { anchor: "game-spelling-bee", label: "Spelling Bee" },
  { anchor: "game-connections", label: "Connections" },
  { anchor: "game-tiles", label: "Tiles" },
  { anchor: "game-mini-crossword", label: "Mini Crossword" },
  { anchor: "game-letter-boxed", label: "Letter Boxed" },
  { anchor: "game-strands", label: "Strands" },
  { anchor: "game-sudoku", label: "Sudoku" },
  { anchor: "game-vertex", label: "Vertex" },
  { anchor: "game-flashback", label: "Flashback" },
  { anchor: "game-crossplay", label: "Crossplay" },
  { anchor: "game-pips", label: "Pips" },
  { anchor: "game-the-midi", label: "The Midi" },
  { anchor: "ai-illustrations", label: "AI Illustrations" },
  { anchor: "layout", label: "Layout" },
  { anchor: "shapes", label: "Shapes & Radius" },
] as const;

/** Returns per-brand sub-section anchors — NYT Games gets expanded list, others get generic */
export function getBrandSubSections(
  sectionId: DesignDocSectionId,
): readonly BrandSubSection[] {
  if (sectionId === "brand-nyt-games") return NYT_GAMES_SUB_SECTIONS;
  return BRAND_SUB_SECTIONS;
}

const BRAND_SECTION_IDS = new Set<DesignDocSectionId>([
  "brand-nyt-games",
  "brand-nyt-magazine",
  "brand-wirecutter",
  "brand-the-athletic",
  "brand-nyt-opinion",
  "brand-nyt-cooking",
  "brand-nyt-style",
  "brand-nyt-store",
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
    sectionIds: ["overview", "app-styles"],
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
    label: "NYT Brand References",
    sectionIds: [
      "brand-nyt-games",
      "brand-nyt-magazine",
      "brand-wirecutter",
      "brand-the-athletic",
      "brand-nyt-opinion",
      "brand-nyt-cooking",
      "brand-nyt-style",
      "brand-nyt-store",
    ],
  },
  {
    label: "NYT Article References",
    sectionIds: ["nyt-articles"],
  },
] as const;

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
        weights: [300, 500],
        role: "Display headlines — article headline uses cheltenham at ~48px/700",
        usedIn: ["Article headline", "Section headings (h2)", "Footer featured text links"],
      },
      {
        name: "nyt-cheltenham-cond",
        cssVar: "--g-chelt-cond",
        fullStack: 'nyt-cheltenham-cond, nyt-cheltenham, cheltenham-fallback-georgia, cheltenham-fallback-noto, georgia, "times new roman", times, serif',
        weights: [700],
        role: "Condensed display — tight headlines",
        usedIn: ["Topper graphic section headings"],
      },
      {
        name: "nyt-franklin",
        cssVar: "--g-franklin",
        fullStack: '"nyt-franklin", arial, helvetica, sans-serif',
        weights: [300, 400, 500, 600, 700, 800],
        role: "Primary sans-serif — body UI, labels, badges, captions, chart text",
        usedIn: ["ai2html labels (weight 300, 14-16px)", "Status badges (weight 600, 9-10px, letter-spacing 0.05em)", "Chart axis labels", "Source credits (weight 300, 12px, #727272)", "Byline", "Nav links", "Share button"],
      },
      {
        name: "nyt-imperial",
        cssVar: "--g-imperial",
        fullStack: '"nyt-imperial", georgia, "times new roman", times, serif',
        weights: [500],
        role: "Article body text — the main reading font for graphics articles",
        usedIn: ["Article body paragraphs (1.25rem / font-weight 500 / line-height 1.5)", "Quote callout text (serif italic)"],
      },
      {
        name: "nyt-karnak",
        cssVar: null,
        fullStack: '"nyt-karnak", georgia, "times new roman", times, serif',
        weights: [400, 700],
        role: "Secondary display serif — moment descriptions",
        usedIn: ["pz-moment__description (1.55em, weight 500)"],
      },
      {
        name: "nyt-karnakcondensed",
        cssVar: null,
        fullStack: '"nyt-karnakcondensed", georgia, "times new roman", times, serif',
        weights: [700],
        role: "Primary game display — game titles (42px/700), section headings (32px/700)",
        usedIn: ["Game titles (.pz-game-title)", "Hub card names (.hub-game-card__name 28px)", "Banner titles (28px)", "Promise tracker heading"],
      },
    ],
    /** Brand-specific font context — which NYT brand fonts appear on this page */
    brandFonts: {
      editorial: ["nyt-cheltenham", "nyt-cheltenham-cond", "nyt-imperial"],
      graphics: ["nyt-franklin"],
      games: ["nyt-karnakcondensed", "nyt-karnak", "nyt-stymie", "nyt-franklin"],
    },
  },
] as const;
