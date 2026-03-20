/**
 * TRR Design System
 * =================
 * Barrel export for all design tokens and component inventory.
 */

export {
  // Primitive colors
  PALETTE,
  PALETTE_ARRAY,
  NEUTRALS,

  // Semantic color tokens
  SEMANTIC_COLORS,

  // Typography
  FONT_FAMILY,
  FONT_SIZE,
  FONT_WEIGHT,
  LINE_HEIGHT,
  LETTER_SPACING,

  // Spacing & layout
  SPACING,
  BREAKPOINT,
  Z_INDEX,

  // Shape
  RADIUS,
  SHADOW,

  // Motion
  DURATION,
  EASING,
  TRANSITION,

  // Game tokens
  FLASHBACK_TOKENS,
  REALITEASE_TOKENS,

  // Side menu
  SIDE_MENU,
} from "./tokens";

export {
  COMPONENT_INVENTORY,
  getComponentsByPage,
  getComponentsByStatus,
  getExistingComponents,
  getMissingComponents,
  getInventorySummary,
} from "./components";

export type {
  ComponentEntry,
  ComponentStatus,
  FigmaPageId,
} from "./components";

export {
  FIGMA_VARIABLE_COLLECTIONS,
  FIGMA_VARIABLE_MAP,
  FIGMA_PAGE_PLAN,
  getFigmaPagesByAction,
  getFigmaPlanSummary,
} from "./figma-mapping";

export type {
  FigmaVariableMapping,
  FigmaPageAction,
  FigmaPagePlan,
} from "./figma-mapping";
