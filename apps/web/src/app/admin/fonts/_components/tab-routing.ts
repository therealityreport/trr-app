import {
  DESIGN_SYSTEM_TAB_DEFINITIONS,
  buildDesignSystemHref,
  getDesignSystemTabFromLegacyQuery,
  type DesignSystemTabId,
} from "@/lib/admin/design-system-routing";

export const TAB_DEFINITIONS = DESIGN_SYSTEM_TAB_DEFINITIONS;
export const getTabFromQuery = getDesignSystemTabFromLegacyQuery;
export type { DesignSystemTabId as TabId } from "@/lib/admin/design-system-routing";

export function buildTabHref(tabId: DesignSystemTabId): `/design-system/${string}` {
  return buildDesignSystemHref(tabId);
}

export function isValidTabQuery(tabQueryValue: string | null): boolean {
  if (!tabQueryValue) return true;
  return getTabFromQuery(tabQueryValue) !== "fonts" || tabQueryValue === "fonts";
}
