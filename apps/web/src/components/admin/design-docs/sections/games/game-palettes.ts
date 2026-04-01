/**
 * NYT Games — Per-Game Color Palettes
 *
 * Source hierarchy:
 *   1. Live nytimes.com CSS custom properties (AUTHORITATIVE)
 *   2. nyt-games-design-system.html reference (secondary)
 *
 * Font rendering (design docs use ACTUAL NYT fonts via .nytg-scope):
 *   nyt-franklin        → NYTFranklin           (R2 CDN, loaded via /hosted-fonts.css)
 *   nyt-karnakcondensed → NYTKarnak_Condensed   (R2 CDN, loaded via /hosted-fonts.css)
 *   nyt-karnak          → KarnakPro-Book        (R2 CDN, loaded via /hosted-fonts.css)
 *   nyt-stymie          → Stymie                (R2 CDN, same family)
 *   nyt-cheltenham      → NYTKarnak_Condensed   (closest match — condensed display serif)
 *   Clear Sans (Wordle) → system fallback chain  (not hosted; --nytg-font-wordle)
 *
 * The .nytg-scope CSS class (design-docs.css) overrides --dd-font-* variables
 * so all var() references resolve to the actual NYT typefaces, not TRR substitutes.
 */

/* ------------------------------------------------------------------ */
/*  Wordle — verified from live site CSS custom properties             */
/* ------------------------------------------------------------------ */
export const WORDLE = {
  light: {
    tone1: "#000",     // --color-tone-1
    tone2: "#787c7e",  // --color-tone-2
    tone3: "#878a8c",  // --color-tone-3
    tone4: "#d3d6da",  // --color-tone-4
    tone5: "#edeff1",  // --color-tone-5
    tone6: "#f6f7f8",  // --color-tone-6
    tone7: "#fff",     // --color-tone-7
    correct: "#6aaa64",  // --color-correct / --green
    present: "#c9b458",  // --color-present
    absent: "#787c7e",   // --color-absent
  },
  dark: {
    tone1: "#ffffff",
    tone2: "#818384",
    tone3: "#565758",
    tone4: "#3a3a3c",
    tone5: "#272729",
    tone6: "#1a1a1b",
    tone7: "#121213",
    correct: "#538d4e",
    present: "#b59f3b",
    absent: "#3a3a3c",
  },
  colorblind: {
    correct: "#f5793a",  // Orange
    present: "#85c0f9",  // Blue
  },
  keyboard: {
    bg: "#d3d6da",       // --key-bg
    correct: "#6aaa64",  // --key-bg-correct
    present: "#c9b458",  // --key-bg-present
    absent: "#787c7e",   // --key-bg-absent
    text: "#000",        // --key-text-color
    evaluatedText: "#fff",
  },
  layout: {
    headerHeight: 50,
    keyboardHeight: 200,
    maxWidth: 500,
    tileSize: 62,
    tileGap: 5,
    rows: 6,
    cols: 5,
  },
  radius: {
    tile: "0px",
    keyboard: "4px",
    modal: "8px",
  },
  navBorder: "#d3d6da",   // Nav sidebar expanded border — wordle-gray, NOT green
  coverBg: "#d3d6da",     // Hub card cover background — wordle-gray, NOT green
  fonts: {
    body: '"Clear Sans", "Helvetica Neue", Arial, sans-serif',
    title: "nyt-karnakcondensed",
    subtitle: "nyt-karnak",
    ui: "nyt-franklin",
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Connections — live site CSS: --connections-purple is #b4a8ff       */
/*  (reference file had #ba81c5 — OVERRIDDEN by live site)            */
/* ------------------------------------------------------------------ */
export const CONNECTIONS = {
  tiers: {
    yellow: "#f9df6d",   // --connections-yellow (Easiest)
    green: "#a0c35a",    // --connections-green
    blue: "#b0c4ef",     // --connections-blue
    purple: "#b4a8ff",   // --connections-purple (LIVE SITE VALUE)
  },
  beige: {
    lightest: "#efefe6",      // --connections-lightest-beige
    light: "#cfcfbf",         // --connections-light-beige
    mid: "#a39f95",           // --connections-beige
    dark: "#5a594ebf",        // --connections-dark-beige (alpha)
    darker: "#787668",        // --connections-darker-beige
    extraDark: "#656458",     // --connections-extra-dark-beige
    darkest: "#5a594e",       // --connections-darkest-beige
  },
  darkPurple: "#861cab",      // --connections-dark-purple
  maroon: "#ba81c5",          // --connections-maroon
  tileDefault: "#efefe6",     // lightest beige — unselected tile
  tileSelected: "#5a594e",    // darkest beige — selected tile
  tileError: "#5a594ebf",     // dark beige with alpha — error flash
  navBorder: "#b4a8ff",       // Nav sidebar expanded border
  coverBg: "#b4a8ff",         // Hub card cover background
  ui: {
    tone1: "#000",       // --color-tone-1
  },
  radius: {
    tile: "8px",
    modal: "8px",
  },
  layout: {
    grid: "4×4",
    totalWords: 16,
    groups: 4,
    wordsPerGroup: 4,
  },
  fonts: {
    body: "nyt-franklin",
    title: "nyt-karnakcondensed, Georgia",
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Spelling Bee — from reference + live site                          */
/* ------------------------------------------------------------------ */
export const SPELLING_BEE = {
  /* LIVE SITE CSS vars (authoritative) */
  yellow: "#f7da21",        // --sb-yellow (confirmed exact)
  gold: "#f7da21",          // alias for backward compat
  gray: "#e7e7e7",          // --sb-gray (reference had #e6e6e6)
  lightYellow: "#ffeca0",   // --sb-light-yellow
  darkYellow: "#847306",    // --sb-dark-yellow
  darkGray: "#38383f",      // --sb-dark-gray
  lightGray: "#e7e7e7",     // alias (reference had #c2c2c2, live is #e7e7e7)
  /* Additional from reference (not in root vars — likely component-level) */
  gold2: "#ffc600",
  gold3: "#ffda00",
  pink: "#f93aa7",
  red: "#e05c56",
  green: "#b5e352",
  teal: "#00a2b3",
  blue: "#4f85e5",         // shared game action blue used in docs
  darkBlue: "#3976e2",     // darker hover-state companion blue
  navBorder: "#f7da21",    // Nav sidebar expanded border
  coverBg: "#f7da21",      // Hub card cover background
  radius: {
    hexagon: "clip-path",
    button: "9999px",
  },
  layout: {
    interface: "Honeycomb (7 hexagons)",
    centerLetter: 1,
    outerLetters: 6,
  },
  ranks: [
    "Beginner", "Good Start", "Moving Up", "Good",
    "Solid", "Nice", "Great", "Amazing", "Genius", "Queen Bee",
  ],
  fonts: {
    body: "nyt-franklin",
    title: "nyt-karnakcondensed",
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Mini Crossword                                                     */
/* ------------------------------------------------------------------ */
export const MINI = {
  yellow: "#f7da21",
  gold: "#ffc600",
  selection: "#ffda00",
  highlight: "#a7d8ff",
  lightBlue: "#dcefff",
  red: "#e63333",
  purple: "#7d68f2",
  orange: "#f96443",
  blue: "#2860d8",
  teal: "#00a2b3",
  green: "#6dc3a1",
  navBorder: "#95befa",    // Nav sidebar expanded border — --mini-blue
  coverBg: "#95befa",      // Hub card cover background (not on hub currently, but consistent)
  radius: {
    cell: "0px",
    button: "8px",
  },
  layout: {
    grid: "5×5",
    interface: "Mini crossword",
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Strands                                                            */
/* ------------------------------------------------------------------ */
export const STRANDS = {
  /* LIVE SITE CSS vars (authoritative — overrides reference) */
  yellow: "#f8cd05",       // --strands-yellow (reference had #f7da21)
  theme: "#3f9ebc",        // alias: closest to reference #4A90D9 is --strands-dark-mint
  spangram: "#f8cd05",     // alias: --strands-yellow
  beige: "#dbd8c5",        // --strands-beige
  blue: "#aedfee",         // --strands-blue
  mint: "#b2ded8",         // --strands-mint
  darkMint: "#3f9ebc",     // --strands-dark-mint
  darkerMint: "#0f7ea0",   // --strands-darker-mint
  darkYellow: "#db9e00",   // --strands-dark-yellow
  darkBeige: "#c4c1af",    // --strands-dark-beige
  green: "#c0ddd9",        // --strandsGreen alias
  navBorder: "#b2ded8",    // Nav sidebar expanded border — --strands-mint
  coverBg: "#c0ddd9",      // Hub card cover background (slightly different from mint)
  radius: {
    cell: "0px",
    button: "8px",
  },
  layout: {
    grid: "6×8",
    interface: "Letter board",
  },
  fonts: {
    body: "nyt-franklin",
    title: "nyt-karnakcondensed",
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Letter Boxed                                                       */
/* ------------------------------------------------------------------ */
export const LETTER_BOXED = {
  /* LIVE SITE CSS vars (authoritative) */
  pink: "#faa6a4",         // --lb-pink (confirmed exact match)
  pinkSalmon: "#faa6a4",   // alias for backward compat
  red: "#fc716b",          // --lb-red
  darkerRed: "#fc5f5a",    // --lb-darker-red
  buttonBlue: "#4f85e5",
  buttonHover: "#3976e2",
  buttonActive: "#2366de",
  sectionColor: "#D1495B",
  easing: "cubic-bezier(0.36, 0.07, 0.19, 0.97)",
  navBorder: "#fc716b",    // Nav sidebar expanded border — --lb-red
  coverBg: "#fc716b",      // Hub card cover background — --lb-red
  radius: {
    board: "0px",
    button: "9999px",
  },
  layout: {
    interface: "Square box, 12 letters (3 per side)",
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Tiles                                                              */
/* ------------------------------------------------------------------ */
export const TILES = {
  /* LIVE SITE CSS vars (authoritative) — uses named tileset themes */
  green: "#b5e352",            // --tiles-green
  tilesets: {
    granada: { brown: "#564646", blue: "#8deee6" },
    soho: { yellow: "#f7da2f" },
    lisbon: { blue: "#0d3264" },
    kuala: { pink: "#f3b3b3", brown: "#665c54" },
    hongkong: { green: "#195f39" },
    austin: { yellow: "#f3e9b3", brown: "#746634" },
    haven: { beige: "#deddd6" },
    paris: { gray: "#bdc4ce", darkGray: "#4d4d4d" },
    brighton: { blue: "#91d8e8", darkBlue: "#32557b" },
    tangier: { purple: "#393362" },
    holland: { blue: "#95c0ef" },
    la: { black: "#1c1f23" },
    utrecht: { yellow: "#fef5d7", black: "#0a0a0a" },
    topeka: { green: "#678400" },
  },
  /* Reference colors (secondary — used in component specimens) */
  blues: { navy: "#0035f1", blue1: "#1654f2", blue2: "#2b17ff", teal: "#054499", sky: "#5291dc", lightTeal: "#9cd9f2" },
  greens: { dark: "#195f28", mint: "#5bb56f", light: "#8de0b8" },
  reds: { dark: "#c3211c", bright: "#e20a0a", pink: "#e2548e", hotPink: "#ff1d99" },
  golds: { gold: "#fbc63f", orange: "#fc9f42", bright: "#ffd30c" },
  neutrals: { tan: "#f4cc71", brown: "#917c67", darkBrown: "#665c54", warmGray: "#c0b3a0", cream: "#eadac5" },
  sectionColor: "#fb9b00",
  navBorder: "#b5e352",    // Nav sidebar expanded border — --tiles-green
  coverBg: "#b5e352",      // Hub card cover background — --tiles-green
  radius: {
    tile: "4px",
  },
  layout: {
    interface: "Colored grid — visual pattern matching",
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Sudoku                                                             */
/* ------------------------------------------------------------------ */
export const SUDOKU = {
  /* LIVE SITE CSS vars (authoritative — overrides reference) */
  orange: "#fb9b00",         // --sudoku-orange
  lightYellow: "#f9eac2",   // --sudoku-light-yellow
  darkYellow: "#fec468",    // --sudoku-dark-yellow (reference had #ffda00)
  select: "#fec468",         // alias for backward compat
  blue: "#2c64d5",          // --sudoku-blue (reference had #2860d8)
  accent: "#2c64d5",        // alias
  lightBlue: "#b4cdff",     // --sudoku-light-blue (reference had #a7d8ff)
  highlight: "#b4cdff",     // alias
  darkBlue: "#0037a5",      // --sudoku-dark-blue
  red: "#ff4b56",           // --sudoku-red (reference had #e63333)
  walnut: "#5e5638",        // --sudoku-walnut
  brown: "#9f6509",         // --sudoku-brown
  sectionColor: "#2c64d5",
  navBorder: "#fb9b00",    // Nav sidebar expanded border — --sudoku-orange
  coverBg: "#fb9b00",      // Hub card cover background — --sudoku-orange
  radius: {
    cell: "0px",
    selected: "0px",
  },
  layout: {
    grid: "9×9 with 3×3 subgrids",
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Vertex                                                             */
/* ------------------------------------------------------------------ */
export const VERTEX = {
  cool: { deepNavy: "#0c252f", darkSlate: "#1B2028", deepTeal: "#29566c", teal: "#31799a", blue: "#4476a8" },
  warm: { green: "#567223", red: "#e03e42", gold: "#e0b109", orange: "#f18449", brightOrange: "#f4c747" },
  highlights: { brightGold: "#F8BB3C", neonPink: "#FC3CC7" },
  sectionColor: "#29566c",
  radius: {
    polygon: "0px",
    dot: "50%",
  },
  layout: {
    interface: "Polygon grid — geometric mesh puzzle",
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Crossplay                                                          */
/* ------------------------------------------------------------------ */
export const CROSSPLAY = {
  doubleLetter: "#f9df6d",
  tripleLetter: "#a0c35a",
  doubleWord: "#b0c4ef",
  tripleWord: "#ba81c5",
  sectionColor: "#6366f1",
  navBorder: "#4076c6",    // Nav sidebar expanded border
  coverBg: "#c8d8f5",      // Hub card cover background
  radius: {
    cell: "0px",
    bonus: "4px",
  },
  layout: {
    grid: "15×15",
    interface: "Multiplayer crossword board",
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Pips                                                               */
/* ------------------------------------------------------------------ */
export const PIPS = {
  /* LIVE SITE CSS vars (authoritative — completely different from reference!) */
  purple: "#9251ca",         // --pips-purple (PRIMARY BRAND COLOR)
  darkPurple: "#8046b1",    // --pips-dark-purple
  darkerPurple: "#7000cf",  // --pips-darker-purple
  lightPurple: "#e3c3ff",   // --pips-light-purple
  lighterPurple: "#8046b14d", // --pips-lighter-purple (alpha)
  orange: "#d15609",        // --pips-orange
  darkOrange: "#ca4e00",    // --pips-dark-orange
  lightOrange: "#eba376",   // --pips-light-orange
  pink: "#db137a",          // --pips-pink
  hotPink: "#ea004e",       // --pips-hot-pink
  lightPink: "#ed9bc5",     // --pips-light-pink
  blue: "#008293",          // --pips-blue
  darkBlue: "#006a78",      // --pips-dark-blue
  lightBlue: "#70cdd9",     // --pips-light-blue
  navy: "#124076",          // --pips-navy
  darkNavy: "#003674",      // --pips-dark-navy
  green: "#547601",         // --pips-green
  darkGreen: "#4c6b00",     // --pips-dark-green
  beige: "#dbc2b9",         // --pips-beige
  softPink: "#daa8d0",      // --pips-soft-pink
  coolGray: "#f6f6f6",      // --pips-cool-gray
  gray: "#444444",          // --pips-gray
  brownGray: "#574e49",     // --pips-brown-gray
  /* Aliases for region colors used in specimens (pastel versions of brand colors) */
  lavender: "#e3c3ff",      // --pips-light-purple (closest to reference #cfe2f3)
  mint: "#70cdd9",          // --pips-light-blue (closest to reference #b4e7ff)
  peach: "#eba376",         // --pips-light-orange (closest to reference #ffd9b3)
  butter: "#ed9bc5",        // --pips-light-pink (no yellow in pips namespace)
  /* Additional production colors (complete set) */
  darkerOrange: "#ae4300",
  darkPink: "#cb036a",
  darkHotPink: "#c70042",
  darkerBlue: "#005460",
  lighterBlue: "#00a3b84d",   // alpha
  darkerNavy: "#0c386a",
  lighterNavy: "#1240764D",   // alpha
  darkerGreen: "#3f5900",
  lighterGreen: "#5476014D",  // alpha
  darkBeige: "#b9a096",
  darkerBeige: "#aa9289",
  lightBeige: "#e1cbc5",
  lighterBeige: "#f5efee",
  lighterOrange: "#fd9d094d", // alpha
  lighterPink: "#f93a7a4d",   // alpha
  lightGray: "#e2dbdb",
  sectionColor: "#9251ca",  // Updated from #f59e0b to actual brand
  navBorder: "#daa8d0",     // Nav sidebar expanded border — --pips-soft-pink
  coverBg: "#daa8d0",       // Hub card cover background — --pips-soft-pink
  radius: {
    domino: "8px",
    pip: "50%",
  },
  layout: {
    interface: "Constraint grid — domino placement",
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Flashback                                                          */
/* ------------------------------------------------------------------ */
export const FLASHBACK = {
  cream: "#faf8f6",
  terracotta: "#c2593a",
  rust: "#d4714f",
  beige: "#efe8e2",
  sectionColor: "#c2593a",
  radius: {
    card: "8px",
  },
  layout: {
    interface: "8 cards — chronological ordering",
    format: "Weekly (The Upshot)",
  },
} as const;

/* ------------------------------------------------------------------ */
/*  The Crossword (full-size)                                          */
/* ------------------------------------------------------------------ */
export const CROSSWORD = {
  sectionColor: "#000000",
  navBorder: "#6493e6",    // Nav sidebar expanded border — --xd-blue
  layout: {
    grid: "15×15 (daily) / 21×21 (Sunday)",
  },
} as const;

/* ------------------------------------------------------------------ */
/*  The Midi                                                           */
/* ------------------------------------------------------------------ */
export const THE_MIDI = {
  sectionColor: "#000000",
  navBorder: "#7ca8f0",    // Nav sidebar expanded border — midi specific blue
  radius: {
    cell: "0px",
  },
  layout: {
    grid: "9×9 to 11×11",
    interface: "Themed crossword",
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Game metadata — for portfolio grid                                 */
/* ------------------------------------------------------------------ */
export interface GameMeta {
  id: string;
  name: string;
  status: "Original" | "Core" | "New" | "Special" | "Unlisted";
  color: string;
  navBorder?: string;
  coverBg?: string;
  interface: string;
  description: string;
}

/** Ordered to match live nav drawer (Mar 2026). Vertex & Flashback are not in the live nav. */
export const GAME_META: readonly GameMeta[] = [
  { id: "crossplay", name: "Crossplay", status: "New", color: "#6366f1", navBorder: "#4076c6", coverBg: "#c8d8f5", interface: "15×15 Board", description: "Multiplayer crossword" },
  { id: "crossword", name: "The Crossword", status: "Original", color: "#000000", navBorder: "#6493e6", interface: "15×15 / 21×21", description: "Flagship daily puzzle" },
  { id: "midi", name: "The Midi", status: "New", color: "#000000", navBorder: "#7ca8f0", interface: "9×9 to 11×11", description: "Smaller themed crossword" },
  { id: "mini", name: "The Mini", status: "Original", color: "#f7da21", navBorder: "#95befa", coverBg: "#95befa", interface: "5×5 Grid", description: "Quick 5×5 crossword" },
  { id: "connections", name: "Connections", status: "Core", color: "#b4a8ff", navBorder: "#b4a8ff", coverBg: "#b4a8ff", interface: "4×4 Grid", description: "Find four-word groups" },
  { id: "spelling-bee", name: "Spelling Bee", status: "Core", color: "#f7da21", navBorder: "#f7da21", coverBg: "#f7da21", interface: "Honeycomb", description: "Hexagon word game" },
  { id: "wordle", name: "Wordle", status: "Core", color: "#6aaa64", navBorder: "#d3d6da", coverBg: "#d3d6da", interface: "5×6 Grid", description: "Five-letter word puzzle" },
  { id: "pips", name: "Pips", status: "Core", color: "#9251ca", navBorder: "#daa8d0", coverBg: "#daa8d0", interface: "Constraint Grid", description: "Domino placement puzzle" },
  { id: "strands", name: "Strands", status: "Core", color: "#b2ded8", navBorder: "#b2ded8", coverBg: "#c0ddd9", interface: "6×8 Board", description: "Theme word pathfinding" },
  { id: "letter-boxed", name: "Letter Boxed", status: "Core", color: "#fc716b", navBorder: "#fc716b", coverBg: "#fc716b", interface: "12 Letters", description: "Square letter connections" },
  { id: "tiles", name: "Tiles", status: "Core", color: "#b5e352", navBorder: "#b5e352", coverBg: "#b5e352", interface: "Colored Grid", description: "Visual pattern matching" },
  { id: "sudoku", name: "Sudoku", status: "Core", color: "#fb9b00", navBorder: "#fb9b00", coverBg: "#fb9b00", interface: "9×9 Grid", description: "Logic number puzzle" },
  { id: "vertex", name: "Vertex", status: "Unlisted", color: "#29566c", interface: "Polygon Grid", description: "Geometric mesh puzzle" },
  { id: "flashback", name: "Flashback", status: "Unlisted", color: "#c2593a", interface: "8 Cards", description: "Historical timeline puzzle" },
] as const;

/* ------------------------------------------------------------------ */
/*  Hub page design tokens — from live nytimes.com/crosswords          */
/* ------------------------------------------------------------------ */
export const HUB = {
  gameCard: {
    borderRadius: "8px",
    border: "1px solid rgb(220, 220, 220)",
    width: "280px",
    hoverShadow: "0 4px 23px rgba(0,0,0,0.15)",
    hoverTranslateY: "-4px",
  },
  pillBadge: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#ffffff",
    bg: "#363636",
    borderRadius: "6px",
    padding: "5px 8px",
  },
  button: {
    borderRadius: "44px",
    border: "1px solid rgb(204, 204, 204)",
    fontSize: "16px",
    fontWeight: 700,
  },
  fonts: {
    body: "nyt-franklin",
    sectionHeading: "nyt-karnakcondensed",
    sectionHeadingSize: "32px",
    sectionHeadingWeight: "500",
    gameTitle: "nyt-franklin",
    gameTitleSize: "12px",
    gameTitleWeight: "700",
    description: "nyt-franklin",
    descriptionSize: "16px",
    descriptionColor: "rgb(149, 149, 149)",
  },
  footer: {
    bg: "rgb(250, 250, 250)",
    padding: "20px 0 42px",
    sectionHeaderFont: "nyt-franklin",
    sectionHeaderSize: "12px",
    sectionHeaderWeight: 700,
    sectionHeaderLetterSpacing: "0.75px",
    sectionHeaderTransform: "uppercase" as const,
    linkFont: "nyt-franklin",
    linkSize: "15px",
    linkWeight: 400,
    linkLetterSpacing: "0.5px",
    legalFont: "nyt-franklin",
    legalSize: "11px",
    legalLineHeight: "16px",
    aboutTextFont: "nyt-cheltenham",
    aboutTextSize: "20px",
    aboutTextWeight: 300,
    aboutTextLineHeight: "28px",
    columns: ["Games List", "Crosswords", "Community", "Learn More"],
  },

  /** Header bar — from live <header class="pz-header"> */
  header: {
    className: "pz-header",
    navClassName: "pz-nav",
    height: "44px",
    bg: "#fff",
    borderBottom: "1px solid #e8e8e8",
    logoWidth: 138,
    logoHeight: 25,
    hamburgerClass: "pz-nav__hamburger-squeeze",
    subscribeButtonClass: "pz-nav__button",
    subscribeText: "Subscribe",
    subscribeCampaignId: "4QHQ8",
    hybridBackLabel: "Back",
    portalMounts: [
      "banner-portal",
      "js-mobile-toolbar",
      "bar1-portal",
      "nav-variant-experiment",
      "cywp-help-portal",
      "js-nav-drawer",
    ],
  },

  /** Navigation drawer — from live <div class="pz-nav-drawer"> */
  navDrawer: {
    className: "pz-nav-drawer",
    cssModules: {
      container: "CustomNav-module_customNav__RX0TG",
      crossplayCTA: "CrossplayCTA-module_crossplayCTAContainer__TunE_",
      linkGroup: "LinkGroup-module_linkGroup__jAkmD",
      linkGroupHeader: "LinkGroup-module_linkGroup__header__e8tYm",
      link: "LinkGroup-module_link__wwRAz",
      directLink: "DirectLink-module_directLink__kSggP",
      directLinkBold: "DirectLink-module_directLink--boldText__OqQFI",
      directLinkPill: "DirectLink-module_directLink__pill__lFxm9",
      collapsibleLink: "CollapsibleLink-module_collapsibleLink__NvSrT",
      collapsibleButton: "CollapsibleLink-module_collapsibleLink__button__qtjQx",
      expansionButton: "ExpansionButton-module_ExpansionButton__lqTjh",
    },
    groups: [
      {
        label: "News",
        links: [
          { name: "The New York Times", href: "https://www.nytimes.com", icon: "pz-icon-nyt" },
        ],
      },
      {
        label: "New York Times Games",
        links: [
          { name: "Crossplay", href: "/games/crossplay", icon: "pz-icon-crossplay", badge: "NEW", collapsible: false },
          { name: "The Crossword", href: "/crosswords/game/daily", icon: "pz-icon-daily", collapsible: true },
          { name: "The Midi", href: "/crosswords/game/midi", icon: "pz-icon-midi", badge: "NEW", collapsible: true },
          { name: "The Mini", href: "/crosswords/game/mini", icon: "pz-icon-mini", collapsible: true },
          { name: "Connections", href: "/games/connections", icon: "pz-icon-connections", collapsible: true },
          { name: "Spelling Bee", href: "/puzzles/spelling-bee", icon: "pz-icon-spelling-bee", collapsible: true },
          { name: "Wordle", href: "/games/wordle/index.html", icon: "pz-icon-wordle", collapsible: true },
          { name: "Pips", href: "/games/pips", icon: "pz-icon-pips", collapsible: false },
          { name: "Strands", href: "/games/strands", icon: "pz-icon-strands", collapsible: true },
          { name: "Letter Boxed", href: "/puzzles/letter-boxed", icon: "pz-icon-letter-boxed", collapsible: false },
          { name: "Tiles", href: "/puzzles/tiles", icon: "pz-icon-tiles", collapsible: false },
          { name: "Sudoku", href: "/puzzles/sudoku", icon: "pz-icon-sudoku", collapsible: false },
          { name: "View all Games", href: "/crosswords", collapsible: false },
        ],
      },
      {
        label: "Tips and Tricks",
        links: [
          { name: "NYT Daily Wordplay Column", href: "https://www.nytimes.com/column/wordplay" },
          { name: "Games Tips", href: "https://www.nytimes.com/spotlight/games-tips" },
          { name: "Games Features", href: "https://www.nytimes.com/spotlight/games-feature" },
        ],
      },
      {
        label: undefined, /* Cross-brand links (no header) */
        links: [
          { name: "The Athletic", href: "https://www.nytimes.com/athletic/", icon: "pz-icon-athletic" },
          { name: "Connections: Sports Edition", href: "https://www.nytimes.com/athletic/connections-sports-edition", icon: "pz-icon-sports-connections" },
          { name: "New York Times Cooking", href: "https://cooking.nytimes.com", icon: "pz-icon-cooking" },
          { name: "New York Times Wirecutter", href: "https://www.nytimes.com/wirecutter", icon: "pz-icon-wirecutter" },
        ],
      },
      {
        label: "Privacy Settings",
        links: [
          { name: "Privacy Policy", href: "https://www.nytimes.com/privacy/privacy-policy" },
          { name: "Cookie Policy", href: "https://www.nytimes.com/privacy/cookie-policy" },
          { name: "Privacy FAQ", href: "https://www.nytimes.com/privacy" },
          { name: "Delete My Account", href: "https://www.nytimes.com/account/delete-account" },
          { name: "Your Privacy Choices", href: "https://www.nytimes.com/privacy/your-privacy-choices" },
        ],
      },
    ],
    accountActions: {
      subscribe: { text: "Subscribe", campaignId: "4QHQ8" },
      saleVariant: { text: "75% off", campaignId: "4QHQ8" },
      login: { text: "Log In", client: "games", application: "crosswords" },
      logout: { text: "Log Out" },
    },
  },

  /** Footer sections — from live <footer class="pz-footer"> */
  footerSections: {
    about: {
      heading: "About New York Times Games",
      text: "Since the launch of the Crossword in 1942, The Times has captivated solvers by providing engaging word and logic games. In 2014, we introduced the Mini Crossword — followed by Spelling Bee, Letter Boxed, Tiles, Wordle, Connections and more.",
      cta: { text: "Subscribe now", href: "https://www.nytimes.com/subscription/games?campaignId=9W9LL" },
    },
    gamesCol: {
      heading: "New York Times Games",
      links: [
        { name: "Crossplay", href: "/games/crossplay" },
        { name: "The Crossword", href: "/crosswords/game/daily" },
        { name: "The Midi Crossword", href: "/crosswords/game/midi" },
        { name: "The Mini Crossword", href: "/crosswords/game/mini" },
        { name: "Spelling Bee", href: "/puzzles/spelling-bee" },
        { name: "Wordle", href: "/games/wordle/index.html" },
        { name: "Pips", href: "/games/pips" },
        { name: "Strands", href: "/games/strands" },
        { name: "Connections", href: "/games/connections" },
        { name: "Tiles", href: "/puzzles/tiles" },
        { name: "Letter Boxed", href: "/puzzles/letter-boxed" },
        { name: "Sudoku", href: "/puzzles/sudoku" },
        { name: "All Games", href: "/crosswords" },
      ],
    },
    crosswordsCol: {
      heading: "Crosswords",
      links: [
        { name: "Crossword Archives", href: "/crosswords/archive" },
        { name: "Statistics", href: "/puzzles/stats" },
        { name: "Leaderboards", href: "/puzzles/leaderboards" },
        { name: "Submit a Crossword", href: "https://nytimes.com/article/submit-crossword-puzzles-the-new-york-times.html" },
      ],
    },
    communityCol: {
      heading: "Community",
      links: [
        { name: "Gameplay Stories", href: "https://www.nytimes.com/column/wordplay" },
        { name: "Spelling Bee Forum", href: "https://www.nytimes.com/spotlight/spelling-bee-forum" },
        { name: "Games Threads", href: "https://www.threads.net/@nytgames" },
      ],
    },
    learnMoreCol: {
      heading: "Learn More",
      links: [
        { name: "FAQs", href: "https://help.nytimes.com/hc/en-us/sections/360011158491-NYT-Games" },
        { name: "Gift Subscriptions", href: "https://www.nytimes.com/subscription/games/gift" },
        { name: "Shop the Games Collection", href: "https://store.nytimes.com/collections/games" },
        { name: "Download the App", href: "/crosswords/apps" },
      ],
    },
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Shared design foundation — NYT Games production CSS tokens          */
/* ------------------------------------------------------------------ */
export const FOUNDATION = {
  /* ---- Global game brand colors (root CSS custom properties) ---- */
  globalColors: {
    gamesYellow: "#fbd300",       // --games-yellow (main NYT Games brand yellow, NOT #f7da21)
    xdBlue: "#6493e6",            // --xd-blue
    miniBlue: "#95befa",          // --mini-blue
    tilesGreen: "#b5e352",        // --tiles-green
    sbYellow: "#f7da21",          // --sb-yellow (Spelling Bee specific)
    lbRed: "#fc716b",             // --lb-red (Letter Boxed border/stroke)
    lbPink: "#faa6a4",            // --lb-pink (Letter Boxed cover bg)
    sudokuOrange: "#fb9b00",      // --sudoku-orange
    wordleGray: "#d3d6da",        // --wordle-gray
    chessBeige: "#ede1ca",        // --chess-beige
    connectionsPurple: "#b4a8ff", // --connections-purple (CONFIRMED, NOT #ba81c5)
    strandsMint: "#b2ded8",       // --strands-mint
    triviaOrange: "#ff945c",      // --trivia-orange
    pipsPurple: "#9251ca",        // --pips-purple
    pipsSoftPink: "#daa8d0",      // --pips-soft-pink
  },

  /* ---- Grayscale system (14 values, NYT Games unified) ---- */
  grayscale: {
    white: "#fff",                // --white
    darkBlack: "#121212",         // --dark-black
    medBlack: "#1b1b1b",          // --med-black
    black: "#2a2a2a",             // --black
    darkestGray: "#363636",       // --darkest-gray
    extraDarkGray: "#424242",     // --extra-dark-gray
    darkerGray: "#5a5a5a",        // --darker-gray
    darkGray: "#727272",          // --dark-gray
    gray2: "#8b8b8b",             // --gray2
    gray: "#979797",              // --gray
    lightGray: "#a3a3a3",         // --light-gray
    lighterGray: "#bbb",          // --lighter-gray
    extraLightGray: "#dfdfdf",    // --extra-light-gray
    lightestGray: "#ebebeb",      // --lightest-gray
    coolGray: "#f8f8f8",          // --cool-gray
  },

  /* ---- Accent colors ---- */
  accents: {
    xdBlue: "#4f85e5",            // --accent-xd-blue
    blue: "#346eb7",              // --accent-blue
    lightBlue: "#6ba1dd",         // --accent-light-blue
    brightBlue: "#2873dc",        // --accent-bright-blue
    green: "#267c30",             // --accent-green
    lightGreen: "#63a859",        // --accent-light-green
    red: "#a90111",               // --accent-red
    lightRed: "#ea7980",          // --accent-light-red
  },

  /* ---- Spacing system (8px base) ---- */
  spacing: {
    "0-5": "4px",    // --spacing-0-5
    "1": "8px",      // --spacing-1
    "1-5": "12px",   // --spacing-1-5
    "2": "16px",     // --spacing-2
    "2-5": "20px",   // --spacing-2-5
    "3": "24px",     // --spacing-3
    "4": "32px",     // --spacing-4
    "5": "40px",     // --spacing-5
    "6": "48px",     // --spacing-6
    "7": "56px",     // --spacing-7
    "8": "64px",     // --spacing-8
    "9": "72px",     // --spacing-9
    "10": "80px",    // --spacing-10
  },

  /* ---- Typography (@font-face declarations + text CSS) ---- */
  typography: {
    families: {
      cheltenham: {
        family: "nyt-cheltenham",
        weights: [300, 500],
        role: "Editorial serif — footer featured text, article links",
        fallback: "Georgia",
        specimens: {
          footerFeatured: { fontWeight: 300, fontSize: "20px", lineHeight: "28px", letterSpacing: "0.5px" },
          footerFeaturedTablet: { fontSize: "18px", lineHeight: "25px" },
        },
      },
      franklin: {
        family: "nyt-franklin",
        weights: [300, 400, 500, 600, 700, 800],
        italicWeights: [500],
        role: "Primary sans-serif — body text, UI elements, buttons, nav, labels",
        fallback: "Arial",
        specimens: {
          /* Root default */
          htmlDefault: { fontWeight: 500, fontStyle: "normal" },
          /* Navigation */
          navButton: { fontSize: "12px", fontWeight: 700, letterSpacing: "0.047em", textTransform: "uppercase" as const },
          navDrawerLink: { fontSize: "15px", fontWeight: 500, letterSpacing: "0.5px", lineHeight: "40px" },
          navDrawerHeading: { fontSize: "12px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.75px", lineHeight: "14px" },
          navDrawerNew: { fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", color: "#346eb7" },
          navDrawerBeta: { fontSize: "10px", fontWeight: 400, lineHeight: "12px" },
          /* Hub page */
          hubSectionHeader: { fontSize: "18px", fontWeight: 700, lineHeight: "23.4px" },
          hubGameCardName: { fontSize: "28px", fontWeight: 700, lineHeight: "1.1" },
          hubGameCardDescription: { fontSize: "16px", fontWeight: 400, lineHeight: "20px", color: "#959595" },
          hubGameCardButton: { fontSize: "16px", fontWeight: 700, letterSpacing: "0.25px", lineHeight: "20.8px" },
          /* Puzzle cards */
          puzzleTitle: { fontSize: "22px", fontWeight: 700, lineHeight: "28.6px" },
          puzzleOneLiner: { fontSize: "18px", fontWeight: 700, lineHeight: "23.4px" },
          puzzleDate: { fontSize: "16px", fontWeight: 200, lineHeight: "20.8px" },
          puzzleDateSmall: { fontSize: "14px", fontWeight: 200, lineHeight: "18.2px" },
          puzzleByline: { fontSize: "14px", fontWeight: 200, lineHeight: "18.2px", color: "#959595" },
          /* Buttons */
          buttonPrimary: { fontWeight: 600, fontSize: "1rem", lineHeight: "1.25", letterSpacing: "0.05rem" },
          momentButton: { fontSize: "clamp(0.95em, 1vw + 0.125em, 1em)", fontWeight: 600, letterSpacing: "0.05em" },
          /* Footer */
          footerSectionHeader: { fontSize: "12px", fontWeight: 700, letterSpacing: "0.75px", textTransform: "uppercase" as const, lineHeight: "14px" },
          footerLink: { fontSize: "15px", fontWeight: 400, letterSpacing: "0.5px", lineHeight: "20px" },
          footerLegal: { fontSize: "11px", fontWeight: 400, lineHeight: "16px", letterSpacing: "-0.7px" },
          /* Progress tracker */
          progressPlayMore: { fontSize: "13px", fontWeight: 700, lineHeight: "16.9px", textTransform: "uppercase" as const },
          progressNoProgress: { fontSize: "16px", fontWeight: 400, lineHeight: "20.8px" },
          /* Banners */
          bannerTitle: { fontSize: "16px", fontWeight: 700, lineHeight: "20.8px" },
          bannerMessage: { fontSize: "14px", fontWeight: 500, lineHeight: "18.2px" },
          bannerDownload: { fontSize: "14px", fontWeight: 600, lineHeight: "1.15" },
          /* Messaging */
          messagingHeadline: { fontSize: "14px", fontWeight: 700, lineHeight: "18px", letterSpacing: "0.5px" },
          messagingAction: { fontSize: "14px", fontWeight: 700 },
          /* Pill / badge */
          pillGrey: { fontSize: "0.625rem", fontWeight: 700, lineHeight: "0.75rem", letterSpacing: "0.05rem", textTransform: "uppercase" as const },
          newLabel: { fontSize: "10px", fontWeight: 700, letterSpacing: "0.08rem", lineHeight: "1.2" },
          /* Tab bar */
          tab: { fontSize: "16px", fontWeight: 400 },
          tabActive: { fontSize: "16px", fontWeight: 700 },
          /* Accordion */
          accordionTitle: { fontWeight: 700, lineHeight: "44px", textAlign: "center" as const },
          /* Mobile stats */
          mobileStatsH2: { fontSize: "17px", fontWeight: 700, lineHeight: "22.1px", textAlign: "center" as const },
          mobileStatsMore: { fontSize: "13px", fontWeight: 700, textTransform: "uppercase" as const },
          /* Sponsored */
          sponsored: { fontSize: "11px", fontWeight: 400, color: "#959595" },
          /* Skip link (a11y) */
          skipLink: { fontWeight: 700, borderRadius: "3px" },
        },
      },
      franklinCw: {
        family: "nyt-franklin-cw",
        weights: [400, 500],
        role: "Crossword-specific Franklin variant for grid UI text",
        fallback: "Arial",
        specimens: {},
      },
      karnak: {
        family: "nyt-karnak",
        weights: [400, 500, 600, 700],
        role: "Secondary display serif — moment descriptions, editorial content",
        fallback: "Georgia",
        specimens: {
          pzH1: { fontSize: "28px", fontWeight: 700 },
          momentDescription: { fontSize: "1.55em", fontWeight: 500, lineHeight: "1.167" },
          momentDescriptionTablet: { fontSize: "2em", lineHeight: "1.125" },
          momentDescriptionDesktop: { fontSize: "2.375em", lineHeight: "1.158" },
          momentDescriptionSmall: { fontSize: "1.25em", lineHeight: "1.2" },
        },
      },
      karnakCondensed: {
        family: "nyt-karnakcondensed",
        weights: [700],
        role: "Primary display font — game titles, headings, moments, promos",
        fallback: "Georgia",
        specimens: {
          gameTitle: { fontSize: "42px", fontWeight: 700, letterSpacing: "0" },
          gameTitleTablet: { fontSize: "37px" },
          momentTitleLarge: { fontSize: "2.25em", fontWeight: 700, lineHeight: "1.056" },
          momentTitleLargeTablet: { fontSize: "2.75em", lineHeight: "1.045" },
          momentTitleLargeDesktop: { fontSize: "3.125em", lineHeight: "1.04" },
          momentTitleMedium: { fontSize: "1.75em", lineHeight: "1.05" },
          momentTitleSmall: { fontSize: "1.125em", lineHeight: "1.111" },
          hubGameCardName: { fontSize: "28px", fontWeight: 700, lineHeight: "1.1" },
          hubPromoTitle: { fontSize: "35px", fontWeight: 700, lineHeight: "45.5px" },
          hubPromoTitleMobile: { fontSize: "28px", lineHeight: "36.4px" },
          featuredTitle: { fontSize: "35px", fontWeight: 700, lineHeight: "45.5px" },
          featuredTitleMobile: { fontSize: "26px", lineHeight: "33.8px" },
          modalTitle: { fontSize: "40px", fontWeight: 700, lineHeight: "38px" },
          hamburgerCTA: { fontSize: "28px", fontWeight: 700, lineHeight: "1" },
          hamburgerCTAMobile: { fontSize: "24px" },
          largeBannerTitle: { fontSize: "28px", fontWeight: 700, lineHeight: "33px" },
          guidePromoH2: { fontSize: "28px", fontWeight: 700, lineHeight: "1.1" },
          crossplayTitle: { fontSize: "32px", fontWeight: 700, lineHeight: "1" },
        },
      },
      stymie: {
        family: "nyt-stymie",
        weights: [500, 700, 800],
        role: "Decorative slab serif — section headers, welcome title, featured cards",
        fallback: "Georgia",
        specimens: {
          hubWelcomeTitle: { fontSize: "18px", fontWeight: 800, color: "#fff" },
          hubSectionHeader: { fontSize: "18px", fontWeight: 700, textAlign: "center" as const },
          featuredCardShadow: { boxShadow: "0 7px 0 0 #2860d8" },
          mobileStatsH2: { fontSize: "17px", fontWeight: 700 },
          accordionTitle: { fontWeight: 700, lineHeight: "44px" },
          printModalTitle: { fontSize: "17px", fontWeight: 700, textAlign: "center" as const },
        },
      },
      inter: {
        family: "nyt-inter",
        weights: [600],
        role: "Reserved for specific UI elements (limited use)",
        fallback: "sans-serif",
        specimens: {},
      },
    },

    /* ---- Global text rendering ---- */
    rendering: {
      webkitFontSmoothing: "antialiased",
      mozOsxFontSmoothing: "grayscale",
    },

    /* ---- Font stacks (CSS font shorthand patterns from NYT) ---- */
    fontStacks: {
      body: '"nyt-franklin", Arial',
      display: '"nyt-karnakcondensed", Georgia',
      editorial: '"nyt-karnak", Georgia',
      decorative: '"nyt-stymie", Georgia',
      mono: '"IBM Plex Mono", "Courier New", monospace',
      crossword: '"nyt-franklin-cw", Arial',
    },

    /* ---- Type scale summary (from production CSS) ---- */
    scale: [
      { size: "42px", usage: "Game title (nyt-karnakcondensed 700)", context: ".pz-game-title" },
      { size: "40px", usage: "Modal title (NYT-KarnakCondensed 700)", context: ".pz-modal__title" },
      { size: "35px", usage: "Featured card title, promo card title", context: ".featured .title" },
      { size: "32px", usage: "Hub h2 headings (nyt-karnakcondensed 700)", context: "pz-nav h2" },
      { size: "28px", usage: "H1, promo card, hamburger CTA, guide promo", context: ".pz-h1" },
      { size: "26px", usage: "Featured title (mobile)", context: ".featured .title @mobile" },
      { size: "22px", usage: "Puzzle title, island title", context: ".title" },
      { size: "18px", usage: "Section headers, oneLiner, modal content, toolbar", context: "various" },
      { size: "16px", usage: "Body text, date, buttons, banner title", context: "body, .date" },
      { size: "15px", usage: "Nav drawer link, footer link, byline, description", context: ".pz-nav-drawer__link" },
      { size: "14px", usage: "Caption, date small, byline, banner message, legal", context: ".date (mobile)" },
      { size: "13px", usage: "Play more link, mobile stats more, sponsored", context: ".progress__playMoreLink" },
      { size: "12px", usage: "Nav button, nav heading, footer heading, pill label", context: ".pz-nav__button" },
      { size: "11px", usage: "Footer legal, sidebar title", context: ".pz-footer__legal-link" },
      { size: "10px", usage: "Pill badge, new label, progress bar label", context: ".PillGrey" },
    ],

    /* ---- Text transform patterns ---- */
    transforms: {
      uppercase: [
        "nav buttons", "nav headings", "pill badges", "new labels",
        "footer section headers", "play more links", "mobile stats more",
        "streak type labels", "progress bar labels",
      ],
      none: ["game titles", "body text", "descriptions", "dates"],
    },

    /* ---- Letter spacing patterns ---- */
    letterSpacingScale: {
      tight: "-0.7px",      // footer legal links
      normal: "0",          // default
      slight: "0.05rem",    // buttons, pill badges
      medium: "0.047em",    // nav buttons
      wide: "0.08em",       // new labels, nav drawer new
      expanded: "0.5px",    // nav drawer links, footer links, messaging
      extraWide: "0.75px",  // nav headings, footer section headers
      condensed: "1px",     // card ribbon, keyboard
      ultraWide: "1.2px",   // sidebar title
    },

    /* ---- Line height patterns ---- */
    lineHeightScale: {
      tight: "1",           // game titles, banner headings
      snug: "1.05",         // moment title medium
      normal: "1.2",        // various
      relaxed: "1.3",       // body text (rem-based: 1.3rem = 20.8px at 16px)
      comfortable: "1.5",   // puzzle info, byline
      spacious: "1.6",      // print modal, global body
      extraSpacious: "1.7", // descriptions
    },

    /* ---- Text decoration patterns ---- */
    textDecoration: {
      navLinks: "none",
      footerLinksHover: "underline",
      guidePromoLink: "inline, colored #2860d8",
      hubWordplayLink: "none (until hover)",
      cardRibbon: "none, uppercase, letter-spacing 1px",
    },

    /* ---- Color patterns by context ---- */
    textColors: {
      primary: "var(--text)",                    // #121212 light, #f8f8f8 dark
      secondary: "var(--text-secondary)",         // #5a5a5a light
      subdued: "var(--text-subdued)",              // #363636 light
      accent: "var(--text-accent)",               // #346eb7 light, #6ba1dd dark
      muted: "#959595",                           // descriptions, bylines, sponsored
      disabled: "rgba(255,255,255,0.5)",          // disabled button text
      white: "#fff",                              // dark backgrounds, banners
      black: "#000",                              // light backgrounds
      link: "#2860d8",                            // feature links, promo CTA
      error: "var(--text-negative)",              // #a90111 light, #ea7980 dark
      positive: "var(--text-positive)",           // #267c30 light, #63a859 dark
    },
  },

  /* ---- Button system ---- */
  buttons: {
    primary: {
      bg: "var(--bg-btn-emphasis)",         // --dark-black in light, --white in dark
      color: "var(--text-alternate)",       // --cool-gray in light, --dark-black in dark
      borderRadius: "9999px",              // pill
      font: '600 1rem "nyt-franklin"',
      padding: "0.5rem 2rem",
      height: "3em",                       // moment buttons
    },
    primaryHover: { bg: "var(--text-secondary)" },
    primaryActive: { bg: "var(--text-subdued)" },
    primaryFocus: { border: "1px solid #a7d8ff" },
    card: {
      borderRadius: "44px",
      height: "44px",
      border: "1px solid #ccc",
      fontWeight: 700,
    },
    tab: {
      width: "50%",
      height: "36px",
      bg: "#f4f4f4",
      activeBg: "#fff",                    // with border-bottom removed
    },
    pillGrey: {
      bg: "#363636",
      color: "#fff",
      font: '700 0.625rem "nyt-franklin"',
      borderRadius: "6px",
      padding: "5px 8px",
      height: "24px",
    },
  },

  /* ---- Progress icon system ---- */
  progressIcons: {
    levels: 17,    // puzzleProgress0 through puzzleProgress16
    special: ["GoldStar", "BlueStar", "Unavailable", "Newest"],
  },

  /* ---- Layout constants ---- */
  layout: {
    pzNav: { heightMobile: "48px", heightDesktop: "56px" },
    pzNavDrawer: { widthMobile: "100%", maxWidthTablet: "375px" },
    hubGameCard: {
      borderRadius: "8px",
      illustrationHeight: "92px",
      nameFont: '1.75rem "nyt-karnakcondensed"',
      buttonBorderRadius: "44px",
      buttonHeight: "44px",
    },
    pzFooter: { bg: "#fafafa", minHeight: "412px" },
    accordion: { drawerTitleHeight: "44px", drawerTitleFont: "nyt-stymie bold" },
    tabGroup: { height: "38px", bg: "#f4f4f4", border: "1px solid #dcdcdc", borderRadius: "3px" },
    hubGuidePromoCard: { height: "260px", borderRadius: "8px", border: "1px solid #dcdcdc" },
    modal: { borderRadius: "7px", shadow: "0 4px 23px 0 rgba(0,0,0,0.08)" },
  },

  /* ---- Shared tokens (kept from prior version) ---- */
  shadows: {
    sm: "0 2px 8px rgba(0,0,0,0.08)",
    md: "0 4px 23px rgba(0,0,0,0.15)",
    lg: "3px 5px 5px rgba(0,0,0,0.15)",
  },
  easing: "cubic-bezier(0.645, 0.045, 0.355, 1)",
  radius: {
    sharp: "0px",
    slight: "4px",
    standard: "8px",
    pill: "9999px",
  },
  modal: {
    overlay: "rgba(51,51,51,0.5)",
    contentBg: "rgba(255,255,255,0.85)",
    borderRadius: "7px",
    shadow: "0 4px 23px rgba(0,0,0,0.08)",
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Tech Stack — extracted from live nytimes.com/crosswords (Mar 2026) */
/* ------------------------------------------------------------------ */
export const TECH_STACK = {
  /** Build metadata from <meta> tags */
  build: {
    commit: "3830bfc",
    pageName: "hub",
    CG: "Crosswords/Games",
    PT: "puzzle hub",
    sourceApp: "games-crosswords",
    cacheSafe: true,
    assetBase: "https://www.nytimes.com/games-assets/v2",
    cssChunks: [
      "5401.95f6943559c35f1f9a76.css",
      "9236.9cff01cea7c2e4b748ea.css",
      "5282.135255377a0b31955461.css",
      "hub.15dced5b24f937724a34.css",
    ],
    jsChunkExamples: [
      "webpack-2f0df11395c1a9ad.js",
      "framework-8883d1e9be70c3da.js",
      "hub-d8f9e71b6b28d22f.js",
      "main-49f6f30c8b1b2e11.js",
    ],
    jsChunks: 24, /* Number of deferred JS bundles for hub page */
  },

  /** Analytics & monitoring */
  analytics: {
    gtm: [
      { id: "GTM-P528B3", env: "env-130", purpose: "Games GTM container" },
      { id: "GTM-N5P6T9S", purpose: "Secondary container (DC-5290727)" },
    ],
    datadogRum: {
      applicationId: "0d77619c-b426-4593-bbc9-d52dcc596b96",
      environment: "prod",
    },
    sentry: {
      dsn: "https://...@o82024.ingest.sentry.io/5839863",
      sampleRate: "1",
      environment: "prod",
    },
    chartbeat: true,
    comscore: { id: "3005403" },
    brandMetrics: { siteId: "4486dfe2-780e-4dfa-a60a-2a948887658f" },
    iterateHQ: true,
  },

  /** Advertising infrastructure */
  ads: {
    framework: "AdSlot4",
    prebid: { version: "9.26.0", bidders: ["criteo", "rubicon", "openx", "triplelift", "pubmatic", "ix", "medianet"] },
    amazon: { pubId: "3030", deals: true },
    mediaNet: { cid: "8CU36S2OB" },
    geoEdge: { key: "b3960cc6-bfd2-4adc-910c-6e917e8a6a0e" },
    gpt: "securepubads.g.doubleclick.net",
    adUnitPath: "crosswords",
    positions: ["top", "mid1", "bottom", "intsl"],
  },

  /** Privacy & consent */
  privacy: {
    fidesTCF: "Transparency & Consent Framework (loads conditionally from PURR cookie)",
    fidesGPP: "Global Privacy Platform (loads conditionally from PURR cookie)",
    purrCookie: "nyt-purr — 22-character directive string controlling ad config, opt-out UI, TCF, GPP, TOS blocker",
    directives: [
      "PURR_DataSaleOptOutUI_v2",
      "PURR_CaliforniaNoticesUI",
      "PURR_AdConfiguration_v3",
      "PURR_LimitSensitivePI",
      "PURR_FidesTCF",
      "PURR_TOSBlocker_Versioned",
      "PURR_LoadGPP",
    ],
    liveramp: "ats-wrapper (identity resolution)",
  },

  /** Feature flags & experimentation */
  featureFlags: {
    statsig: {
      tier: "production",
      specsUrl: "https://static01.nyt.com/statsig/config/...",
    },
    abra: {
      version: 29529,
      description: "NYT internal A/B test framework — client-side partition on agent_id or regi_id",
    },
  },

  /** Data layer */
  data: {
    samizdat: {
      host: "https://samizdat-graphql.nytimes.com",
      appType: "games-phoenix",
      appVersion: "1.0.0",
    },
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Active A/B Tests — categorized from window.abra (Mar 2026)        */
/* ------------------------------------------------------------------ */
export const AB_TESTS = {
  darkMode: {
    description: "Phased dark mode rollout across all games",
    tests: [
      { key: "GAMES_darkMode_holdout", scope: "Global holdout — 5% control, 95% dark mode audience" },
      { key: "GAMES_tilesDarkMode_0125", scope: "Tiles" },
      { key: "GAMES_strandsDarkMode_0916", scope: "Strands" },
      { key: "GAMES_connectionsDarkMode_0926", scope: "Connections" },
      { key: "GAMES_lbDarkMode_1112", scope: "Letter Boxed" },
      { key: "GAMES_deviceDefaultDarkMode_0225", scope: "Device-default (regi_id targeted)" },
      { key: "GAMES_darkMode_android_1120", scope: "Android app" },
    ],
  },
  gameFeatures: {
    description: "Game-specific feature flags",
    tests: [
      { key: "GAMES_tilesTilesetModal_0125", scope: "Tiles tileset selection modal" },
      { key: "GAMES_pipsReveal_0525", scope: "Pips reveal mechanic" },
      { key: "GAMES_pipsBetaTakedownWarning_0625", scope: "Pips beta takedown warning" },
      { key: "GAMES_createWordle_puzzles_0425", scope: "Create Wordle — custom puzzles" },
      { key: "GAMES_connectionsSportsLinks_0924", scope: "Connections sports edition links" },
      { key: "GAMES_geoLockedCrossPlayCTA_0714", scope: "Crossplay CTA — geo-locked to NZ/AU" },
      { key: "GAMES_appConnectionsBot_0425_v2", scope: "Connections bot (app)" },
      { key: "GAMES_GAMES_CROSS_BOT_PAYWALL", scope: "Daily crossword bot paywall wiring" },
    ],
  },
  archives: {
    description: "Archive access rollouts",
    tests: [
      { key: "GAMES_strands_archive_0710", scope: "Strands archive" },
      { key: "GAMES_androidConnectionsArchive_0924", scope: "Connections archive (Android)" },
    ],
  },
  badges: {
    description: "Achievement badge system",
    tests: [
      { key: "GAMES_badges_regi_0925", scope: "Badge system (regi_id partitioned)" },
      { key: "GAMES_strandsBadges_1225", scope: "Strands-specific badges" },
      { key: "GAMES_badges_anon_ios_0925", scope: "Badge regiwall for anon iOS users" },
    ],
  },
  monetization: {
    description: "Paywall, OMA, and ad experiments",
    tests: [
      { key: "GAMES_salePaywallGood_0325", scope: "Sale paywall variant" },
      { key: "GAMES_subForNoAds_0325", scope: "Subscribe for no ads" },
      { key: "GAMES_omaWelcomeCTA_1125", scope: "OMA welcome CTA" },
      { key: "OMA_PAYWALL_SPELLING_BEE", scope: "Spelling Bee paywall" },
      { key: "OMA_METER_BEHIND_OMA_SPELLING_BEE_WEB_ONLY", scope: "Spelling Bee meter-behind-OMA" },
      { key: "GAMES_PurrTOSBlocker_1024", scope: "PURR TOS blocker" },
    ],
  },
  welcomeCtas: {
    description: "App and web welcome-screen CTA variants by game",
    tests: [
      { key: "AMS_WELCOME_SCREEN_CTA_WORDLE", scope: "Wordle" },
      { key: "AMS_WELCOME_SCREEN_CTA_SPELLING_BEE", scope: "Spelling Bee" },
      { key: "AMS_WELCOME_SCREEN_CTA_CONNECTIONS", scope: "Connections" },
      { key: "AMS_WELCOME_SCREEN_CTA_STRANDS", scope: "Strands" },
      { key: "AMS_WELCOME_SCREEN_CTA_MINI_CROSSWORD", scope: "Mini Crossword" },
      { key: "AMS_WELCOME_SCREEN_CTA_TILES", scope: "Tiles" },
      { key: "AMS_WELCOME_SCREEN_CTA_LETTER_BOXED", scope: "Letter Boxed" },
      { key: "AMS_WELCOME_SCREEN_CTA_PIPS", scope: "Pips" },
      { key: "AMS_WELCOME_SCREEN_CTA_MIDI_CROSSWORD", scope: "The Midi" },
    ],
  },
  endscreenActions: {
    description: "Puzzle completion and post-game endscreen treatments",
    tests: [
      { key: "OMA_ENDSCREENACTIONS_CONNECTIONS", scope: "Connections" },
      { key: "OMA_ENDSCREENACTIONS_STRANDS", scope: "Strands" },
      { key: "OMA_ENDSCREENACTIONS_MINI", scope: "Mini Crossword" },
      { key: "OMA_ENDSCREENACTIONS_TILES", scope: "Tiles" },
      { key: "OMA_ENDSCREENACTIONS_SUDOKU", scope: "Sudoku" },
      { key: "OMA_ENDSCREENACTIONS_DAILY", scope: "Daily Crossword" },
    ],
  },
  adExperiments: {
    description: "DFP ad placement and refresh experiments",
    tests: [
      { key: "DFP_WordleSkipFade_0524", scope: "Wordle ad skip with fade" },
      { key: "DFP_WordleSkip", scope: "Wordle ad skip" },
      { key: "DFP_WordleMobile_0423", scope: "Wordle mobile interstitial" },
      { key: "DFP_WordleAdRefresh", scope: "Wordle ad refresh (31s interval)" },
      { key: "DFP_StrandsMobileWeb", scope: "Strands mobile web ads" },
      { key: "DFP_SpellingBeeSkip", scope: "Spelling Bee ad skip" },
      { key: "DFP_SpellingBeeMobile", scope: "Spelling Bee mobile ads" },
      { key: "DFP_MiniSkip", scope: "Mini crossword ad skip" },
      { key: "DFP_GamesPrebid_1025", scope: "Prebid vs MediaNet (50/50)" },
      { key: "dfp_wordle_ad", scope: "Legacy Wordle ad placement flag" },
    ],
  },
} as const;
