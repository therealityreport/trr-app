export type DesignSystemTabId =
  | "fonts"
  | "colors"
  | "buttons"
  | "questions-forms"
  | "nyt-occurrences"
  | "components"
  | "icons-illustrations";

export type DesignSystemSubtabId =
  | "survey"
  | "auth"
  | "admin"
  | "ui"
  | "layout"
  | "overlays"
  | "icons"
  | "logos"
  | "illustrations";

export type DesignSystemTabDefinition = {
  id: DesignSystemTabId;
  label: string;
  defaultSubtab?: DesignSystemSubtabId | null;
  subtabs?: readonly {
    id: DesignSystemSubtabId;
    label: string;
  }[];
};

type DesignSystemSubtabDefinition = {
  id: DesignSystemSubtabId;
  label: string;
};

export const DESIGN_SYSTEM_TAB_DEFINITIONS: readonly DesignSystemTabDefinition[] = [
  { id: "fonts", label: "Fonts" },
  { id: "colors", label: "Colors" },
  { id: "buttons", label: "Buttons" },
  {
    id: "questions-forms",
    label: "Questions & Forms",
    subtabs: [
      { id: "survey", label: "Survey" },
      { id: "auth", label: "Auth" },
      { id: "admin", label: "Admin" },
    ],
  },
  { id: "nyt-occurrences", label: "NYT Occurrences" },
  {
    id: "components",
    label: "Components",
    subtabs: [
      { id: "ui", label: "UI" },
      { id: "admin", label: "Admin" },
      { id: "survey", label: "Survey" },
      { id: "layout", label: "Layout" },
      { id: "overlays", label: "Overlays" },
    ],
  },
  {
    id: "icons-illustrations",
    label: "Icons & Illustrations",
    subtabs: [
      { id: "icons", label: "Icons" },
      { id: "logos", label: "Logos" },
      { id: "illustrations", label: "Illustrations" },
    ],
  },
] as const;

const TAB_BY_ID = new Map<DesignSystemTabId, DesignSystemTabDefinition>(
  DESIGN_SYSTEM_TAB_DEFINITIONS.map((definition) => [definition.id, definition]),
);

const LEGACY_QUERY_TO_TAB: Record<string, DesignSystemTabId> = {
  fonts: "fonts",
  colors: "colors",
  buttons: "buttons",
  questions: "questions-forms",
  "questions-forms": "questions-forms",
  nyt: "nyt-occurrences",
  "nyt-occurrences": "nyt-occurrences",
};

export function getDesignSystemTabDefinition(tab: DesignSystemTabId): DesignSystemTabDefinition {
  return TAB_BY_ID.get(tab) ?? TAB_BY_ID.get("fonts")!;
}

export function getDesignSystemSubtabs(
  tab: DesignSystemTabId,
): readonly DesignSystemSubtabDefinition[] {
  return getDesignSystemTabDefinition(tab).subtabs ?? [];
}

export function getDesignSystemTabFromLegacyQuery(
  tabQueryValue: string | null | undefined,
): DesignSystemTabId {
  if (!tabQueryValue) return "fonts";
  return LEGACY_QUERY_TO_TAB[tabQueryValue] ?? "fonts";
}

export function buildDesignSystemHref(
  tab: DesignSystemTabId = "fonts",
  subtab?: DesignSystemSubtabId | null,
): `/design-system/${string}` {
  return subtab
    ? `/design-system/${tab}/${subtab}`
    : `/design-system/${tab}`;
}

export function buildLegacyDesignSystemHref(
  tabQueryValue: string | null | undefined,
): `/design-system/${string}` {
  return buildDesignSystemHref(getDesignSystemTabFromLegacyQuery(tabQueryValue));
}

export function isDesignSystemTabId(value: string | null | undefined): value is DesignSystemTabId {
  if (!value) return false;
  return TAB_BY_ID.has(value as DesignSystemTabId);
}

export function isDesignSystemSubtabIdForTab(
  tab: DesignSystemTabId,
  value: string | null | undefined,
): value is DesignSystemSubtabId {
  if (!value) return false;
  return getDesignSystemSubtabs(tab).some((subtab) => subtab.id === value);
}

export function resolveDesignSystemRoute(
  tabParam: string | null | undefined,
  subtabSegments?: string[] | null,
): {
  tab: DesignSystemTabId;
  subtab: DesignSystemSubtabId | null;
  isCanonical: boolean;
  canonicalHref: `/design-system/${string}`;
} {
  const tab = isDesignSystemTabId(tabParam) ? tabParam : "fonts";
  const requestedSubtab = subtabSegments?.[0] ?? null;
  const subtab = isDesignSystemSubtabIdForTab(tab, requestedSubtab) ? requestedSubtab : null;
  const hasExtraSegments = Boolean(subtabSegments && subtabSegments.length > 1);
  const canonicalHref = buildDesignSystemHref(tab, subtab);
  const isCanonical =
    Boolean(tabParam) &&
    tabParam === tab &&
    !hasExtraSegments &&
    ((!requestedSubtab && !subtab) || requestedSubtab === subtab);

  return {
    tab,
    subtab,
    isCanonical,
    canonicalHref,
  };
}
