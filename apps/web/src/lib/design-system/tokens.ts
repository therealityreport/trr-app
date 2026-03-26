/**
 * TRR Design System Tokens
 * ========================
 * Canonical design token definitions following the shadcn/ui variable pattern.
 * These tokens map 1:1 to CSS custom properties in globals.css and to
 * Figma variables in the design system file.
 *
 * Structure:
 *   primitives  — raw values (colors, font families, sizes)
 *   semantic     — context-aware aliases that reference primitives
 *   components   — component-level tokens (button, card, input, etc.)
 *   game         — game-specific token sets (Flashback, Realitease, Bravodle)
 */

// ---------------------------------------------------------------------------
// Primitive Color Palette
// ---------------------------------------------------------------------------

/** The 45 base brand colors used across the platform. */
export const PALETTE = {
  // Reds
  deepCrimson: "#7A0307",
  magenta: "#95164A",
  red: "#B81D22",
  vermillion: "#CF5315",

  // Oranges & Ambers
  amber: "#C76D00",
  tangerine: "#F1991B",
  sienna: "#B05E2A",
  gold: "#E3A320",
  butterscotch: "#D48C42",

  // Yellows
  sunflower: "#ECC91C",
  ochre: "#977022",
  walnut: "#744A1F",
  olive: "#C2B72D",

  // Greens
  fern: "#76A34C",
  forest: "#356A3B",
  teal: "#0C454A",
  lime: "#769F25",

  // Blues
  powderBlue: "#A1C6D4",
  slate: "#53769C",
  petrol: "#4B7C89",
  cobalt: "#28578A",
  navy: "#063656",
  royal: "#1D4782",
  indigo: "#2C438D",
  sapphire: "#144386",

  // Purples
  lavender: "#6568AB",
  plum: "#644072",
  eggplant: "#4F2F4B",

  // Pinks
  rose: "#C37598",
  orchid: "#B05988",
  aubergine: "#644073",
  wine: "#772149",
  blush: "#DFC3D9",
  petal: "#E9A6C7",
  mauve: "#A5739F",
  carnation: "#D37EAF",

  // Neutrals
  sand: "#C8BEB3",
  khaki: "#D2C09E",
  graphite: "#666A6E",
  espresso: "#34130C",
  charcoal: "#34373F",
  mahogany: "#35110B",
} as const;

/** Flat array form for color lab / admin tooling. */
export const PALETTE_ARRAY = Object.values(PALETTE);

// ---------------------------------------------------------------------------
// Primitive Neutrals (Zinc scale, shadcn-compatible)
// ---------------------------------------------------------------------------

export const NEUTRALS = {
  white: "#ffffff",
  zinc50: "#fafafa",
  zinc100: "#f4f4f5",
  zinc200: "#e4e4e7",
  zinc300: "#d4d4d8",
  zinc400: "#a1a1aa",
  zinc500: "#71717a",
  zinc600: "#52525b",
  zinc700: "#3f3f46",
  zinc800: "#27272a",
  zinc900: "#18181b",
  zinc950: "#09090b",
  black: "#000000",
} as const;

// ---------------------------------------------------------------------------
// Semantic Color Tokens (CSS variable names)
// ---------------------------------------------------------------------------

export const SEMANTIC_COLORS = {
  // Core surfaces
  background: "#ffffff",
  surface: "#ffffff",
  foreground: "#171717",
  primaryText: "#171717",
  mutedText: "#737373",

  // Card / elevated surface
  card: "#ffffff",
  cardForeground: "#171717",

  // Popover / overlay surface
  popover: "#ffffff",
  popoverForeground: "#171717",

  // Primary action
  primary: "#111111",
  primaryForeground: "#ffffff",

  // Secondary action
  secondary: "#f4f4f5",
  secondaryForeground: "#171717",

  // Muted / disabled
  muted: "#f4f4f5",
  mutedForeground: "#737373",

  // Accent (interactive highlight)
  accent: "#0B57D0",
  accentForeground: "#ffffff",

  // Destructive
  destructive: "#ef4444",
  destructiveForeground: "#ffffff",

  // Success
  success: "#4A9E6F",
  successForeground: "#ffffff",

  // Warning
  warning: "#F1991B",
  warningForeground: "#ffffff",

  // Borders & inputs
  border: "#E6E6E6",
  input: "#E6E6E6",
  ring: "#0B57D0",

  // Text aliases
  ink: "#111111",
  line: "#E6E6E6",
} as const;

// ---------------------------------------------------------------------------
// Typography Tokens
// ---------------------------------------------------------------------------

export const FONT_FAMILY = {
  /** Primary sans-serif — Hamburg Serial */
  sans: '"Hamburg Serial", "HamburgSerial", Inter, Geist, ui-sans-serif, system-ui, sans-serif',
  /** Primary serif — Gloucester */
  serif: '"Gloucester", "Playfair Display", Georgia, "Times New Roman", serif',
  /** Display headings — Gloucester */
  display: '"Gloucester", "Playfair Display", Georgia, "Times New Roman", serif',
  /** Headline hierarchy for editorial and admin surfaces */
  headline: '"Gloucester", "Playfair Display", Georgia, "Times New Roman", serif',
  /** Body copy — Hamburg Serial */
  body: '"Hamburg Serial", "HamburgSerial", Inter, Geist, ui-sans-serif, system-ui, sans-serif',
  /** Caption and utility copy */
  caption: '"Hamburg Serial", "HamburgSerial", Inter, Geist, ui-sans-serif, system-ui, sans-serif',
  /** Game UI — Plymouth Serial */
  games: '"Plymouth Serial", "Hamburg Serial", Inter, Geist, ui-sans-serif, system-ui, sans-serif',
  /** Monospace (code) */
  mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
} as const;

export const FONT_SIZE = {
  xs: "0.75rem",     // 12px
  sm: "0.875rem",    // 14px
  base: "1rem",      // 16px
  lg: "1.125rem",    // 18px
  xl: "1.25rem",     // 20px
  "2xl": "1.5rem",   // 24px
  "3xl": "1.875rem", // 30px
  "4xl": "2.25rem",  // 36px
  "5xl": "3rem",     // 48px
  "6xl": "3.75rem",  // 60px
} as const;

export const FONT_WEIGHT = {
  light: "300",
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
  black: "900",
} as const;

export const LINE_HEIGHT = {
  none: "1",
  tight: "1.25",
  snug: "1.375",
  normal: "1.5",
  relaxed: "1.625",
  loose: "1.75",     // used on <p> elements
} as const;

export const LETTER_SPACING = {
  tighter: "-0.05em",
  tight: "-0.025em",  // used on h1-h3
  normal: "0em",
  wide: "0.01em",     // used on side-menu headings
  wider: "0.05em",
  widest: "0.14em",   // used on section labels (uppercase tracking)
} as const;

// ---------------------------------------------------------------------------
// Spacing Scale (Tailwind-compatible, 4px base)
// ---------------------------------------------------------------------------

export const SPACING = {
  0: "0px",
  px: "1px",
  0.5: "0.125rem",  // 2px
  1: "0.25rem",     // 4px
  1.5: "0.375rem",  // 6px
  2: "0.5rem",      // 8px
  2.5: "0.625rem",  // 10px
  3: "0.75rem",     // 12px
  3.5: "0.875rem",  // 14px
  4: "1rem",        // 16px
  5: "1.25rem",     // 20px
  6: "1.5rem",      // 24px
  7: "1.75rem",     // 28px
  8: "2rem",        // 32px
  9: "2.25rem",     // 36px
  10: "2.5rem",     // 40px
  12: "3rem",       // 48px
  14: "3.5rem",     // 56px
  16: "4rem",       // 64px
  20: "5rem",       // 80px
} as const;

// ---------------------------------------------------------------------------
// Border Radius
// ---------------------------------------------------------------------------

export const RADIUS = {
  none: "0px",
  sm: "0.25rem",    // 4px  — small chips, tags
  md: "0.375rem",   // 6px  — buttons, inputs (default)
  lg: "0.5rem",     // 8px  — cards, dialogs
  xl: "0.75rem",    // 12px — larger cards
  "2xl": "1rem",    // 16px — design-system showcase cards
  "3xl": "1.5rem",  // 24px — hero sections
  full: "9999px",   // pill shapes, avatars
} as const;

// ---------------------------------------------------------------------------
// Elevation / Shadows
// ---------------------------------------------------------------------------

export const SHADOW = {
  none: "none",
  sm: "0 1px 2px rgba(0, 0, 0, 0.05)",                         // game-card default
  md: "0 4px 6px rgba(0, 0, 0, 0.1)",                           // game-card hover
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",                    // elevated panels
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",                    // modals
  sideMenu: "3px 6px 20px rgba(0, 0, 0, 0.18)",                 // side menu
  card: "0 2px 6px rgba(15, 23, 42, 0.04)",                     // screenalytics card
  inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",              // inset elements
} as const;

// ---------------------------------------------------------------------------
// Motion / Animation Tokens
// ---------------------------------------------------------------------------

export const DURATION = {
  fast: "150ms",
  normal: "200ms",
  slow: "300ms",
  slower: "500ms",
  tile: "620ms",     // Realitease tile flip
} as const;

export const EASING = {
  default: "ease",
  in: "ease-in",
  out: "ease-out",
  inOut: "ease-in-out",
  tileFlip: "cubic-bezier(0.42, 0.17, 0.3, 1.02)",   // Realitease 3D flip
  bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",        // playful overshoot
} as const;

export const TRANSITION = {
  colors: "color, background-color, border-color, text-decoration-color, fill, stroke 150ms ease",
  sideMenu: "transform 0.28s ease",
  sideMenuToggle: "transform 0.2s ease",
  cardHover: "transform 200ms ease, box-shadow 200ms ease",
} as const;

// ---------------------------------------------------------------------------
// Game-Specific Token Sets
// ---------------------------------------------------------------------------

export const FLASHBACK_TOKENS = {
  bg: "#E8E0D0",
  card: "#FFFFFF",
  cardShadow: "rgba(0, 0, 0, 0.08)",
  cardDragShadow: "rgba(0, 0, 0, 0.18)",
  accent: "#6B6BA0",
  correct: "#4A9E6F",
  incorrect: "#D4564A",
  confirmBorder: "#D4A843",
  timeline: "#C4BCB0",
  text: "#3D3D3D",
  textMuted: "#8A8478",
} as const;

export const REALITEASE_TOKENS = {
  tileSize: "58px",
  tileBorder: "1px solid",
  tileShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
  tileFlipDuration: "620ms",
  tileFlipEasing: "cubic-bezier(0.42, 0.17, 0.3, 1.02)",
  perspective: "900px",
} as const;

// ---------------------------------------------------------------------------
// Breakpoints (Tailwind defaults, documented for Figma frames)
// ---------------------------------------------------------------------------

export const BREAKPOINT = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

// ---------------------------------------------------------------------------
// Z-Index Scale
// ---------------------------------------------------------------------------

export const Z_INDEX = {
  base: "0",
  dropdown: "10",
  sticky: "20",
  fixed: "30",
  overlay: "40",    // side menu backdrop
  modal: "50",      // modals, dialogs
  popover: "60",    // popovers, tooltips
  toast: "70",      // toast notifications
  max: "9999",      // emergency overrides
} as const;

// ---------------------------------------------------------------------------
// Side Menu Tokens
// ---------------------------------------------------------------------------

export const SIDE_MENU = {
  width: "min(384px, 92vw)",
  headerHeight: "56px",
  backdropColor: "rgba(17, 24, 39, 0.48)",
  borderColor: "rgba(0, 0, 0, 0.12)",
  brandFontSize: "1.25rem",
  sectionFontSize: "0.75rem",
  primaryLinkFontSize: "1rem",
  secondaryFontSize: "0.875rem",
} as const;
