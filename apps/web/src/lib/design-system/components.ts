/**
 * TRR Design System — Component Inventory
 * ========================================
 * Maps every existing component to its shadcn/ui equivalent (where applicable).
 * Status tracks what exists in code vs. what needs a Figma design.
 *
 * Legend:
 *   exists    — implemented in app, needs Figma variant documentation
 *   partial   — implemented but missing variants or not generalized
 *   missing   — not yet implemented, needed for complete design system
 */

export type ComponentStatus = "exists" | "partial" | "missing";

export type ComponentEntry = {
  /** Display name matching shadcn/ui naming convention */
  name: string;
  /** shadcn/ui equivalent component name (null if TRR-specific) */
  shadcnEquivalent: string | null;
  status: ComponentStatus;
  /** File paths in the TRR-APP codebase */
  paths: string[];
  /** Variants/states that exist */
  variants: string[];
  /** What's missing or needs work */
  notes: string;
  /** Figma page this belongs on in the design system file */
  figmaPage: FigmaPageId;
};

export type FigmaPageId =
  | "colors"
  | "typography"
  | "icons"
  | "buttons"
  | "inputs"
  | "data-display"
  | "feedback"
  | "overlays"
  | "navigation"
  | "layout"
  | "surfaces"
  | "games";

// ---------------------------------------------------------------------------
// Existing Components (what we HAVE)
// ---------------------------------------------------------------------------

export const COMPONENT_INVENTORY: ComponentEntry[] = [
  // ── Buttons ─────────────────────────────────────────────────────────────
  {
    name: "Button",
    shadcnEquivalent: "Button",
    status: "exists",
    paths: [
      "src/components/ui/button.tsx",
      "src/styles/components.css",
    ],
    variants: ["primary", "secondary", "google", "sm", "default"],
    notes: "Has .btn-primary (black bg), .btn-secondary (outline), .btn-google (icon+text). Needs ghost, destructive, link variants for parity.",
    figmaPage: "buttons",
  },
  {
    name: "SurveyContinueButton",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/components/survey/SurveyContinueButton.tsx"],
    variants: ["enabled", "disabled"],
    notes: "Game-specific continue/next button. Domain component, not a generic primitive.",
    figmaPage: "buttons",
  },
  {
    name: "SignOutButton",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/components/SignOutButton.tsx"],
    variants: ["default"],
    notes: "Auth action button with sign-out behavior.",
    figmaPage: "buttons",
  },

  // ── Inputs & Forms ──────────────────────────────────────────────────────
  {
    name: "Input",
    shadcnEquivalent: "Input",
    status: "exists",
    paths: ["src/styles/components.css"],
    variants: ["default", "focus"],
    notes: ".input-field class with focus:ring-2 focus:ring-blue-500. Needs disabled, error, with-icon variants.",
    figmaPage: "inputs",
  },
  {
    name: "Editable",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/components/ui/editable.tsx"],
    variants: ["reading", "editing", "submitting"],
    notes: "Inline editable text with context provider. Unique to TRR — not in shadcn.",
    figmaPage: "inputs",
  },
  {
    name: "TextEntryInput",
    shadcnEquivalent: "Textarea",
    status: "exists",
    paths: ["src/components/survey/TextEntryInput.tsx"],
    variants: ["default"],
    notes: "Survey text entry. Maps loosely to Textarea.",
    figmaPage: "inputs",
  },
  {
    name: "SingleSelectInput",
    shadcnEquivalent: "RadioGroup",
    status: "exists",
    paths: ["src/components/survey/SingleSelectInput.tsx"],
    variants: ["default", "with-images"],
    notes: "Single-choice selection in surveys. Functions like RadioGroup.",
    figmaPage: "inputs",
  },
  {
    name: "MultiSelectInput",
    shadcnEquivalent: "Checkbox",
    status: "exists",
    paths: ["src/components/survey/MultiSelectInput.tsx"],
    variants: ["default"],
    notes: "Multi-choice checkboxes in surveys.",
    figmaPage: "inputs",
  },
  {
    name: "MultiSelectPills",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/components/survey/MultiSelectPills.tsx"],
    variants: ["default", "selected"],
    notes: "Pill-style multi-select. Custom — closest shadcn is ToggleGroup.",
    figmaPage: "inputs",
  },
  {
    name: "SliderInput",
    shadcnEquivalent: "Slider",
    status: "exists",
    paths: ["src/components/survey/SliderInput.tsx"],
    variants: ["default"],
    notes: "Range slider for survey ratings.",
    figmaPage: "inputs",
  },
  {
    name: "ThreeChoiceSliderInput",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/components/survey/ThreeChoiceSliderInput.tsx"],
    variants: ["default"],
    notes: "Three-way slider unique to TRR surveys.",
    figmaPage: "inputs",
  },
  {
    name: "DropdownInput",
    shadcnEquivalent: "Select",
    status: "exists",
    paths: ["src/components/survey/DropdownInput.tsx"],
    variants: ["default"],
    notes: "Custom dropdown for surveys. Needs generalized Select primitive.",
    figmaPage: "inputs",
  },
  {
    name: "StarRatingInput",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/components/survey/StarRatingInput.tsx"],
    variants: ["default", "partial-fill"],
    notes: "Star rating control with partial fill support.",
    figmaPage: "inputs",
  },
  {
    name: "IconRatingInput",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/components/survey/IconRatingInput.tsx"],
    variants: ["default", "custom-icon"],
    notes: "Icon-based rating scale (e.g., snowflakes for RHOSLC).",
    figmaPage: "inputs",
  },
  {
    name: "MatrixLikertInput",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/components/survey/MatrixLikertInput.tsx"],
    variants: ["default"],
    notes: "Matrix/Likert scale grid for surveys.",
    figmaPage: "inputs",
  },
  {
    name: "TwoAxisGridInput",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/components/survey/TwoAxisGridInput.tsx"],
    variants: ["default"],
    notes: "2D grid selection for cast positioning.",
    figmaPage: "inputs",
  },
  {
    name: "RankOrderInput",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/components/survey/RankOrderInput.tsx"],
    variants: ["default"],
    notes: "Drag-to-rank with @dnd-kit. Custom survey component.",
    figmaPage: "inputs",
  },
  {
    name: "PosterSingleSelect",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/components/survey/PosterSingleSelect.tsx"],
    variants: ["default"],
    notes: "Image/poster-based selection card.",
    figmaPage: "inputs",
  },
  {
    name: "CastDecisionCardInput",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/components/survey/CastDecisionCardInput.tsx"],
    variants: ["default"],
    notes: "Card-based binary decision UI for cast members.",
    figmaPage: "inputs",
  },

  // ── Data Display ────────────────────────────────────────────────────────
  {
    name: "Badge",
    shadcnEquivalent: "Badge",
    status: "partial",
    paths: [],
    variants: ["default", "secondary", "destructive", "outline", "success", "warning", "info"],
    notes: "Legacy donor implementation existed in the retired Screenalytics repo. TRR-APP still needs a local Badge primitive.",
    figmaPage: "data-display",
  },
  {
    name: "GameCard",
    shadcnEquivalent: "Card",
    status: "partial",
    paths: ["src/styles/components.css"],
    variants: ["default", "hover"],
    notes: ".game-card class with hover:-translate-y-0.5. Needs generalized Card primitive with header/body/footer.",
    figmaPage: "surfaces",
  },
  {
    name: "YearBadge",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/app/flashback/play/year-badge.tsx"],
    variants: ["default"],
    notes: "Flashback game year badge. Domain-specific.",
    figmaPage: "games",
  },
  {
    name: "ClueCard",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/app/flashback/play/clue-card.tsx"],
    variants: ["default", "revealed"],
    notes: "Flashback game clue card. Domain-specific.",
    figmaPage: "games",
  },
  {
    name: "CastCircleToken",
    shadcnEquivalent: "Avatar",
    status: "partial",
    paths: ["src/components/survey/CastCircleToken.tsx"],
    variants: ["default"],
    notes: "Cast avatar token. Functions like Avatar but is survey-specific. Needs generalized Avatar primitive.",
    figmaPage: "data-display",
  },

  // ── Feedback ────────────────────────────────────────────────────────────
  {
    name: "Toast",
    shadcnEquivalent: "Toast",
    status: "exists",
    paths: ["src/components/ToastHost.tsx"],
    variants: ["default", "error"],
    notes: "TRR-APP has a live toast implementation; the retired Screenalytics donor implementation is no longer part of the active workspace.",
    figmaPage: "feedback",
  },
  {
    name: "ErrorBoundary",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/components/ErrorBoundary.tsx"],
    variants: ["default"],
    notes: "React error boundary wrapper. No visual component — just catches errors.",
    figmaPage: "feedback",
  },

  // ── Overlays ────────────────────────────────────────────────────────────
  {
    name: "Dialog",
    shadcnEquivalent: "Dialog",
    status: "partial",
    paths: ["src/components/admin/AdminModal.tsx"],
    variants: ["default"],
    notes: "TRR-APP has AdminModal (custom). A unified Dialog primitive is still needed locally.",
    figmaPage: "overlays",
  },
  {
    name: "Sheet / Drawer",
    shadcnEquivalent: "Sheet",
    status: "partial",
    paths: [
      "src/components/admin/ImageScrapeDrawer.tsx",
      "src/components/admin/AdvancedFilterDrawer.tsx",
      "src/components/admin/image-lightbox/ReplaceGettyDrawer.tsx",
    ],
    variants: ["right"],
    notes: "Multiple drawers exist but each is custom. Need a generic Sheet/Drawer primitive with left/right/bottom variants.",
    figmaPage: "overlays",
  },
  {
    name: "ImageLightbox",
    shadcnEquivalent: null,
    status: "exists",
    paths: [
      "src/components/admin/ImageLightbox.tsx",
      "src/components/admin/image-lightbox/LightboxShell.tsx",
      "src/components/admin/image-lightbox/LightboxImageStage.tsx",
      "src/components/admin/image-lightbox/LightboxMetadataPanel.tsx",
      "src/components/admin/image-lightbox/LightboxManagementActions.tsx",
    ],
    variants: ["default", "with-metadata"],
    notes: "Full-featured lightbox with management actions. TRR-specific.",
    figmaPage: "overlays",
  },
  {
    name: "FeaturesModal",
    shadcnEquivalent: null,
    status: "exists",
    paths: [],
    variants: ["default"],
    notes: "Legacy donor modal from the retired Screenalytics repo. No active TRR-APP implementation is tracked here.",
    figmaPage: "overlays",
  },

  // ── Navigation ──────────────────────────────────────────────────────────
  {
    name: "GlobalHeader",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/components/GlobalHeader.tsx"],
    variants: ["authenticated", "unauthenticated"],
    notes: "Auth-aware app header with user settings menu.",
    figmaPage: "navigation",
  },
  {
    name: "GameHeader",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/components/GameHeader.tsx"],
    variants: ["default"],
    notes: "Per-game header with game branding.",
    figmaPage: "navigation",
  },
  {
    name: "AdminGlobalHeader",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/components/admin/AdminGlobalHeader.tsx"],
    variants: ["default"],
    notes: "Admin panel header.",
    figmaPage: "navigation",
  },
  {
    name: "AdminSideMenu",
    shadcnEquivalent: null,
    status: "exists",
    paths: [
      "src/components/admin/AdminSideMenu.tsx",
      "src/components/SideMenuProvider.tsx",
      "src/app/side-menu.css",
    ],
    variants: ["open", "closed", "mobile"],
    notes: "Collapsible sidebar with animated transitions. Custom to TRR.",
    figmaPage: "navigation",
  },
  {
    name: "Tabs",
    shadcnEquivalent: "Tabs",
    status: "exists",
    paths: [
      "src/components/admin/show-tabs/ShowTabsNav.tsx",
      "src/components/admin/season-tabs/SeasonTabsNav.tsx",
    ],
    variants: ["default"],
    notes: "TRR-APP uses custom tab navigation across multiple domain-specific tab sets.",
    figmaPage: "navigation",
  },
  {
    name: "Breadcrumb",
    shadcnEquivalent: "Breadcrumb",
    status: "partial",
    paths: ["src/components/admin/AdminBreadcrumbs.tsx"],
    variants: ["default"],
    notes: "Admin-specific breadcrumbs. Not a generic primitive. Needs generalization.",
    figmaPage: "navigation",
  },
  {
    name: "AdminGlobalSearch",
    shadcnEquivalent: "Command",
    status: "partial",
    paths: ["src/components/admin/AdminGlobalSearch.tsx"],
    variants: ["default"],
    notes: "Functions like a Command palette but is admin-specific.",
    figmaPage: "navigation",
  },

  // ── Layout ──────────────────────────────────────────────────────────────
  {
    name: "PublicRouteShell",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/components/public/PublicRouteShell.tsx"],
    variants: ["default"],
    notes: "Public page wrapper/layout shell.",
    figmaPage: "layout",
  },
  {
    name: "ClientAuthGuard",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/components/ClientAuthGuard.tsx"],
    variants: ["default"],
    notes: "Protected route wrapper. Logic component — no visual.",
    figmaPage: "layout",
  },

  // ── Game Components ─────────────────────────────────────────────────────
  {
    name: "RealiteaseTileBoard",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/styles/components.css"],
    variants: ["default", "bravodle", "flipped", "animating"],
    notes: "3D tile flip board with CSS transforms. Bravodle variant removes shadows.",
    figmaPage: "games",
  },
  {
    name: "FlashbackRanker",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/components/flashback-ranker.tsx"],
    variants: ["default"],
    notes: "Complex ranking game with slide-in, badge-appear, and score-pop animations.",
    figmaPage: "games",
  },
  {
    name: "EpisodeRating",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/components/episode-rating.tsx"],
    variants: ["default"],
    notes: "Episode rating control.",
    figmaPage: "games",
  },
  {
    name: "SeasonRating",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/components/season-rating.tsx"],
    variants: ["default"],
    notes: "Season rating control.",
    figmaPage: "games",
  },
  {
    name: "CastVerdict",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/components/cast-verdict.tsx"],
    variants: ["default"],
    notes: "Cast member verdict selector.",
    figmaPage: "games",
  },
  {
    name: "MaskedSvgIcon",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/components/survey/MaskedSvgIcon.tsx"],
    variants: ["default"],
    notes: "Reusable masked SVG for survey rating icons.",
    figmaPage: "icons",
  },
  {
    name: "PartialFillIcon",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/components/survey/PartialFillIcon.tsx"],
    variants: ["empty", "partial", "full"],
    notes: "Partial star/icon fill for ratings. Companion to MaskedSvgIcon.",
    figmaPage: "icons",
  },

  // ── Icons ───────────────────────────────────────────────────────────────
  {
    name: "SocialPlatformTabIcon",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/components/admin/SocialPlatformTabIcon.tsx"],
    variants: ["instagram", "tiktok", "youtube", "overview"],
    notes: "Inline SVG icon set for social platform tabs.",
    figmaPage: "icons",
  },
  {
    name: "ExternalLinks",
    shadcnEquivalent: null,
    status: "exists",
    paths: ["src/components/admin/ExternalLinks.tsx"],
    variants: ["tmdb", "imdb", "generic"],
    notes: "Outbound metadata link icons/badges.",
    figmaPage: "icons",
  },

  // ── Missing Primitives (need to create) ─────────────────────────────────
  {
    name: "Avatar",
    shadcnEquivalent: "Avatar",
    status: "missing",
    paths: [],
    variants: [],
    notes: "CastCircleToken is closest but not generalized. Need sizes (xs/sm/md/lg), fallback initials, status ring.",
    figmaPage: "data-display",
  },
  {
    name: "Tooltip",
    shadcnEquivalent: "Tooltip",
    status: "missing",
    paths: [],
    variants: [],
    notes: "No tooltip primitive in TRR-APP. Screenalytics could use Radix Tooltip.",
    figmaPage: "overlays",
  },
  {
    name: "Popover",
    shadcnEquivalent: "Popover",
    status: "missing",
    paths: [],
    variants: [],
    notes: "No standalone popover. Needed for dropdown menus, date pickers.",
    figmaPage: "overlays",
  },
  {
    name: "Toggle / Switch",
    shadcnEquivalent: "Switch",
    status: "missing",
    paths: [],
    variants: [],
    notes: "No boolean toggle component exists.",
    figmaPage: "inputs",
  },
  {
    name: "Separator",
    shadcnEquivalent: "Separator",
    status: "missing",
    paths: [],
    variants: [],
    notes: "Dividers are done via border utilities. Need a semantic <Separator> component.",
    figmaPage: "layout",
  },
  {
    name: "Skeleton",
    shadcnEquivalent: "Skeleton",
    status: "missing",
    paths: [],
    variants: [],
    notes: "No skeleton/loading-state components.",
    figmaPage: "feedback",
  },
  {
    name: "Progress",
    shadcnEquivalent: "Progress",
    status: "missing",
    paths: [],
    variants: [],
    notes: "No progress bar component.",
    figmaPage: "feedback",
  },
  {
    name: "Alert",
    shadcnEquivalent: "Alert",
    status: "missing",
    paths: [],
    variants: [],
    notes: "No dismissible alert/banner component.",
    figmaPage: "feedback",
  },
  {
    name: "Accordion",
    shadcnEquivalent: "Accordion",
    status: "missing",
    paths: [],
    variants: [],
    notes: "No collapsible content sections.",
    figmaPage: "data-display",
  },
  {
    name: "DataTable",
    shadcnEquivalent: "Table",
    status: "missing",
    paths: [],
    variants: [],
    notes: "Admin displays data but no reusable sortable/filterable Table primitive.",
    figmaPage: "data-display",
  },
  {
    name: "DropdownMenu",
    shadcnEquivalent: "DropdownMenu",
    status: "missing",
    paths: [],
    variants: [],
    notes: "No standardized context/action menu.",
    figmaPage: "overlays",
  },
  {
    name: "Pagination",
    shadcnEquivalent: "Pagination",
    status: "missing",
    paths: [],
    variants: [],
    notes: "No pagination component.",
    figmaPage: "navigation",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getComponentsByPage(page: FigmaPageId): ComponentEntry[] {
  return COMPONENT_INVENTORY.filter((c) => c.figmaPage === page);
}

export function getComponentsByStatus(status: ComponentStatus): ComponentEntry[] {
  return COMPONENT_INVENTORY.filter((c) => c.status === status);
}

export function getExistingComponents(): ComponentEntry[] {
  return COMPONENT_INVENTORY.filter((c) => c.status !== "missing");
}

export function getMissingComponents(): ComponentEntry[] {
  return COMPONENT_INVENTORY.filter((c) => c.status === "missing");
}

/** Summary stats for the design system. */
export function getInventorySummary() {
  const all = COMPONENT_INVENTORY;
  return {
    total: all.length,
    exists: all.filter((c) => c.status === "exists").length,
    partial: all.filter((c) => c.status === "partial").length,
    missing: all.filter((c) => c.status === "missing").length,
    hasShadcnEquivalent: all.filter((c) => c.shadcnEquivalent !== null).length,
    trrSpecific: all.filter((c) => c.shadcnEquivalent === null).length,
  };
}
