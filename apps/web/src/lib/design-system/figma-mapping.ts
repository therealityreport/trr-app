/**
 * TRR Design System — Figma Variable Mapping
 * ============================================
 * Maps TRR design tokens to Figma variables for the design system file.
 * Based on the shadcn/ui Figma template structure (iZuXegX5aNwNiJRgc7tdCV).
 *
 * This file defines:
 *   1. Which Figma variable collections to create
 *   2. How CSS custom properties map to Figma variables
 *   3. Which shadcn template pages to keep, modify, or remove
 */

// ---------------------------------------------------------------------------
// Figma Variable Collections
// ---------------------------------------------------------------------------

/**
 * Figma uses "variable collections" to group related tokens.
 * Each collection can have modes (e.g., Light / Dark).
 *
 * We define three collections following the shadcn pattern:
 */
export const FIGMA_VARIABLE_COLLECTIONS = {
  /** Raw color values — the primitive palette */
  primitives: {
    name: "Primitives",
    description: "Raw color values, font families, and spacing units",
    modes: ["Default"],
  },
  /** Semantic tokens that reference primitives */
  semantic: {
    name: "Semantic",
    description: "Context-aware tokens (background, foreground, accent, etc.)",
    modes: ["Light"],  // Dark mode can be added as a second mode later
  },
  /** Component-specific tokens */
  components: {
    name: "Components",
    description: "Per-component tokens (radius, padding, gap, etc.)",
    modes: ["Default"],
  },
} as const;

// ---------------------------------------------------------------------------
// CSS Variable → Figma Variable Mapping
// ---------------------------------------------------------------------------

export type FigmaVariableMapping = {
  /** CSS custom property name (e.g., "--background") */
  cssVar: string;
  /** Figma variable name using slash notation (e.g., "colors/background") */
  figmaName: string;
  /** Which collection this belongs to */
  collection: keyof typeof FIGMA_VARIABLE_COLLECTIONS;
  /** The resolved value */
  value: string;
  /** Figma variable type */
  type: "COLOR" | "FLOAT" | "STRING";
};

export const FIGMA_VARIABLE_MAP: FigmaVariableMapping[] = [
  // ── Semantic Colors ─────────────────────────────────────────────────────
  { cssVar: "--background", figmaName: "colors/background", collection: "semantic", value: "#ffffff", type: "COLOR" },
  { cssVar: "--foreground", figmaName: "colors/foreground", collection: "semantic", value: "#171717", type: "COLOR" },
  { cssVar: "--card", figmaName: "colors/card", collection: "semantic", value: "#ffffff", type: "COLOR" },
  { cssVar: "--card-foreground", figmaName: "colors/card-foreground", collection: "semantic", value: "#171717", type: "COLOR" },
  { cssVar: "--popover", figmaName: "colors/popover", collection: "semantic", value: "#ffffff", type: "COLOR" },
  { cssVar: "--popover-foreground", figmaName: "colors/popover-foreground", collection: "semantic", value: "#171717", type: "COLOR" },
  { cssVar: "--primary", figmaName: "colors/primary", collection: "semantic", value: "#111111", type: "COLOR" },
  { cssVar: "--primary-foreground", figmaName: "colors/primary-foreground", collection: "semantic", value: "#ffffff", type: "COLOR" },
  { cssVar: "--secondary", figmaName: "colors/secondary", collection: "semantic", value: "#f4f4f5", type: "COLOR" },
  { cssVar: "--secondary-foreground", figmaName: "colors/secondary-foreground", collection: "semantic", value: "#171717", type: "COLOR" },
  { cssVar: "--muted", figmaName: "colors/muted", collection: "semantic", value: "#f4f4f5", type: "COLOR" },
  { cssVar: "--muted-foreground", figmaName: "colors/muted-foreground", collection: "semantic", value: "#737373", type: "COLOR" },
  { cssVar: "--accent", figmaName: "colors/accent", collection: "semantic", value: "#0B57D0", type: "COLOR" },
  { cssVar: "--accent-foreground", figmaName: "colors/accent-foreground", collection: "semantic", value: "#ffffff", type: "COLOR" },
  { cssVar: "--destructive", figmaName: "colors/destructive", collection: "semantic", value: "#ef4444", type: "COLOR" },
  { cssVar: "--destructive-foreground", figmaName: "colors/destructive-foreground", collection: "semantic", value: "#ffffff", type: "COLOR" },
  { cssVar: "--success", figmaName: "colors/success", collection: "semantic", value: "#4A9E6F", type: "COLOR" },
  { cssVar: "--success-foreground", figmaName: "colors/success-foreground", collection: "semantic", value: "#ffffff", type: "COLOR" },
  { cssVar: "--warning", figmaName: "colors/warning", collection: "semantic", value: "#F1991B", type: "COLOR" },
  { cssVar: "--warning-foreground", figmaName: "colors/warning-foreground", collection: "semantic", value: "#ffffff", type: "COLOR" },
  { cssVar: "--border", figmaName: "colors/border", collection: "semantic", value: "#E6E6E6", type: "COLOR" },
  { cssVar: "--input", figmaName: "colors/input", collection: "semantic", value: "#E6E6E6", type: "COLOR" },
  { cssVar: "--ring", figmaName: "colors/ring", collection: "semantic", value: "#0B57D0", type: "COLOR" },

  // ── Radius ──────────────────────────────────────────────────────────────
  { cssVar: "--radius-sm", figmaName: "radius/sm", collection: "components", value: "4", type: "FLOAT" },
  { cssVar: "--radius-md", figmaName: "radius/md", collection: "components", value: "6", type: "FLOAT" },
  { cssVar: "--radius-lg", figmaName: "radius/lg", collection: "components", value: "8", type: "FLOAT" },
  { cssVar: "--radius-xl", figmaName: "radius/xl", collection: "components", value: "12", type: "FLOAT" },
  { cssVar: "--radius-2xl", figmaName: "radius/2xl", collection: "components", value: "16", type: "FLOAT" },
  { cssVar: "--radius-full", figmaName: "radius/full", collection: "components", value: "9999", type: "FLOAT" },

  // ── Shadows (as string tokens — Figma uses effect styles, not variables) ──
  { cssVar: "--shadow-sm", figmaName: "elevation/sm", collection: "components", value: "0 1px 2px rgba(0,0,0,0.05)", type: "STRING" },
  { cssVar: "--shadow-md", figmaName: "elevation/md", collection: "components", value: "0 4px 6px rgba(0,0,0,0.1)", type: "STRING" },
  { cssVar: "--shadow-lg", figmaName: "elevation/lg", collection: "components", value: "0 10px 15px -3px rgba(0,0,0,0.1)", type: "STRING" },

  // ── Flashback Game ──────────────────────────────────────────────────────
  { cssVar: "--fb-bg", figmaName: "games/flashback/bg", collection: "semantic", value: "#E8E0D0", type: "COLOR" },
  { cssVar: "--fb-accent", figmaName: "games/flashback/accent", collection: "semantic", value: "#6B6BA0", type: "COLOR" },
  { cssVar: "--fb-correct", figmaName: "games/flashback/correct", collection: "semantic", value: "#4A9E6F", type: "COLOR" },
  { cssVar: "--fb-incorrect", figmaName: "games/flashback/incorrect", collection: "semantic", value: "#D4564A", type: "COLOR" },
  { cssVar: "--fb-confirm-border", figmaName: "games/flashback/confirm-border", collection: "semantic", value: "#D4A843", type: "COLOR" },
  { cssVar: "--fb-timeline", figmaName: "games/flashback/timeline", collection: "semantic", value: "#C4BCB0", type: "COLOR" },
  { cssVar: "--fb-text", figmaName: "games/flashback/text", collection: "semantic", value: "#3D3D3D", type: "COLOR" },
  { cssVar: "--fb-text-muted", figmaName: "games/flashback/text-muted", collection: "semantic", value: "#8A8478", type: "COLOR" },
];

// ---------------------------------------------------------------------------
// Figma Page Plan — What to Keep / Modify / Remove from shadcn template
// ---------------------------------------------------------------------------

export type FigmaPageAction = "keep" | "modify" | "hidden" | "add";

export type FigmaPagePlan = {
  /** Page name in the shadcn Figma template */
  pageName: string;
  action: FigmaPageAction;
  /** What to do with this page */
  instructions: string;
};

/**
 * The shadcn/ui Figma community file has ~50+ component pages.
 * This plan specifies which to keep (with TRR tokens applied),
 * which to hide (not yet used — kept for future reference), and which are new.
 */
export const FIGMA_PAGE_PLAN: FigmaPagePlan[] = [
  // ── Keep & Modify (components that exist in TRR) ───────────────────────
  { pageName: "Cover", action: "modify", instructions: "Replace shadcn branding with TRR branding. Update title, description, fonts to Hamburg Serial / Gloucester." },
  { pageName: "Colors", action: "modify", instructions: "Replace shadcn zinc scale with TRR semantic tokens (--background, --foreground, --accent, etc.) + 45-color brand palette." },
  { pageName: "Typography", action: "modify", instructions: "Replace Inter/Geist with Hamburg Serial (body), Gloucester (display/serif), Plymouth Serial (games). Show all 5 font roles." },
  { pageName: "Badge", action: "modify", instructions: "Keep structure. Apply TRR colors. Add success/warning/info variants from Screenalytics badge.tsx." },
  { pageName: "Button", action: "modify", instructions: "Keep structure. Replace with TRR variants: primary (black bg), secondary (outline), google (icon+text). Sizes: sm, default." },
  { pageName: "Card", action: "modify", instructions: "Use .game-card styles: rounded-lg, border-zinc-300, shadow-sm, hover:-translate-y-0.5. Add game-card-header variant." },
  { pageName: "Dialog", action: "modify", instructions: "Keep Radix dialog structure. Apply TRR colors/radius. Show AdminModal variant alongside." },
  { pageName: "Input", action: "modify", instructions: "Apply .input-field styles: border-gray-300, rounded-md, focus:ring-2 focus:ring-blue-500." },
  { pageName: "Select", action: "modify", instructions: "Base on DropdownInput survey component. Show single-select and cast-select variants." },
  { pageName: "Slider", action: "modify", instructions: "Show SliderInput and ThreeChoiceSliderInput variants from survey system." },
  { pageName: "Tabs", action: "modify", instructions: "Show Radix Tabs (Screenalytics) + ShowTabsNav + SeasonTabsNav custom tab sets." },
  { pageName: "Toast", action: "modify", instructions: "Show both ToastHost (TRR-APP) and Radix toast (Screenalytics) implementations." },
  { pageName: "Sheet", action: "modify", instructions: "Base on existing drawers: ImageScrapeDrawer, AdvancedFilterDrawer, ReplaceGettyDrawer. Right-side panel." },
  { pageName: "Table", action: "keep", instructions: "Keep structure for future DataTable primitive. Apply TRR typography/colors." },
  { pageName: "Checkbox", action: "modify", instructions: "Base on MultiSelectInput survey checkbox pattern." },
  { pageName: "RadioGroup", action: "modify", instructions: "Base on SingleSelectInput survey radio pattern." },
  { pageName: "Separator", action: "keep", instructions: "Keep — useful primitive. Apply --border color." },
  { pageName: "Skeleton", action: "keep", instructions: "Keep for future use — not yet implemented but needed." },
  { pageName: "Label", action: "keep", instructions: "Keep — survey forms use labels. Apply Hamburg Serial font." },
  { pageName: "Textarea", action: "modify", instructions: "Base on TextEntryInput. Apply .input-field base styles." },
  { pageName: "ScrollArea", action: "keep", instructions: "Keep — .scrollbar-hide utility exists. Useful reference." },

  // ── Hidden (not yet used in TRR — kept for future reference) ────────────
  { pageName: "Accordion", action: "hidden", instructions: "Not yet implemented. Hide until TRR builds its own collapsible sections." },
  { pageName: "Alert", action: "hidden", instructions: "Not yet implemented. Hide until TRR adds alert/banner component." },
  { pageName: "AlertDialog", action: "hidden", instructions: "Not yet implemented. Standard Dialog covers current use case." },
  { pageName: "AspectRatio", action: "hidden", instructions: "Not currently used. Hide for future media components." },
  { pageName: "Calendar", action: "hidden", instructions: "No date picker in TRR yet. Hide for future scheduling features." },
  { pageName: "Carousel", action: "hidden", instructions: "Not currently used. Hide for future media galleries." },
  { pageName: "Chart", action: "hidden", instructions: "Admin uses inline charting. Hide until TRR adopts a chart component." },
  { pageName: "Collapsible", action: "hidden", instructions: "Not used as a primitive yet. Hide for future use." },
  { pageName: "Command", action: "hidden", instructions: "AdminGlobalSearch exists but doesn't follow Command pattern yet." },
  { pageName: "ContextMenu", action: "hidden", instructions: "Not currently used. Hide for future right-click menus." },
  { pageName: "DatePicker", action: "hidden", instructions: "Not yet implemented. Hide for future scheduling." },
  { pageName: "DropdownMenu", action: "hidden", instructions: "Not yet implemented as a generic primitive. Hide for future use." },
  { pageName: "Form", action: "hidden", instructions: "TRR uses custom survey question system. Hide shadcn Form reference." },
  { pageName: "HoverCard", action: "hidden", instructions: "Not currently used. Hide for future cast/show hover previews." },
  { pageName: "InputOTP", action: "hidden", instructions: "Not currently used. Hide for future auth flows." },
  { pageName: "Menubar", action: "hidden", instructions: "Not currently used. Hide for future admin toolbars." },
  { pageName: "NavigationMenu", action: "hidden", instructions: "TRR has custom GlobalHeader/AdminSideMenu. Hide shadcn reference." },
  { pageName: "Pagination", action: "hidden", instructions: "Not yet implemented. Hide until TRR adds paginated views." },
  { pageName: "Popover", action: "hidden", instructions: "Not yet implemented. Hide for future dropdown/filter UIs." },
  { pageName: "Progress", action: "hidden", instructions: "Not yet implemented. Hide for future upload/processing indicators." },
  { pageName: "Resizable", action: "hidden", instructions: "Not currently used. Hide for future panel layouts." },
  { pageName: "Sonner", action: "hidden", instructions: "TRR uses custom toast. Hide Sonner reference." },
  { pageName: "Switch", action: "hidden", instructions: "Not yet implemented. Hide for future toggle controls." },
  { pageName: "Toggle", action: "hidden", instructions: "Not yet implemented. Hide for future toggle buttons." },
  { pageName: "ToggleGroup", action: "hidden", instructions: "MultiSelectPills is closest. Hide until TRR generalizes." },
  { pageName: "Tooltip", action: "hidden", instructions: "Not yet implemented. Hide for future hover hints." },

  // ── Add (TRR-specific pages not in shadcn) ─────────────────────────────
  { pageName: "Brand Palette", action: "add", instructions: "New page showing the 45 TRR brand colors with named swatches (deepCrimson, magenta, red, etc.)." },
  { pageName: "Game: Realitease", action: "add", instructions: "Tile board component: 58px tiles, 3D flip animation, perspective 900px. Show default, flipped, bravodle variants." },
  { pageName: "Game: Flashback", action: "add", instructions: "Clue card, year badge, ranking interface. Uses --fb-* token set with cream bg (#E8E0D0)." },
  { pageName: "Game: Bravodle", action: "add", instructions: "Wordle-style board variant of Realitease tiles (no shadows)." },
  { pageName: "Survey Components", action: "add", instructions: "StarRating, IconRating, MatrixLikert, TwoAxisGrid, RankOrder, CastDecisionCard, PosterSelect, MultiSelectPills, PersonRankings." },
  { pageName: "Side Menu", action: "add", instructions: "Collapsible side menu: min(384px, 92vw) width, backdrop rgba(17,24,39,0.48), 0.28s ease transition." },
  { pageName: "Admin Navigation", action: "add", instructions: "AdminGlobalHeader, AdminSideMenu, AdminBreadcrumbs, AdminGlobalSearch patterns." },
  { pageName: "Image Lightbox", action: "add", instructions: "Full-screen image viewer with metadata panel, navigation, management actions." },
  { pageName: "Icons & Illustrations", action: "add", instructions: "7 custom SVGs (game icons, brand placeholder), inline SVG components (social platforms, external links, lightbox controls)." },
  { pageName: "CDN Fonts Showcase", action: "add", instructions: "Preview of all 38 Monotype CDN fonts with weight variants. Reference sheet for typography decisions." },
];

// ---------------------------------------------------------------------------
// Summary helpers
// ---------------------------------------------------------------------------

export function getFigmaPagesByAction(action: FigmaPageAction): FigmaPagePlan[] {
  return FIGMA_PAGE_PLAN.filter((p) => p.action === action);
}

export function getFigmaPlanSummary() {
  const plan = FIGMA_PAGE_PLAN;
  return {
    total: plan.length,
    keep: plan.filter((p) => p.action === "keep").length,
    modify: plan.filter((p) => p.action === "modify").length,
    hidden: plan.filter((p) => p.action === "hidden").length,
    add: plan.filter((p) => p.action === "add").length,
  };
}
