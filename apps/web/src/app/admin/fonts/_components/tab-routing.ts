export type TabId = "fonts" | "questions" | "colors" | "buttons";

export type TabDefinition = {
  id: TabId;
  label: string;
  queryValue: string;
};

export const TAB_DEFINITIONS: TabDefinition[] = [
  { id: "fonts", label: "Fonts", queryValue: "fonts" },
  { id: "colors", label: "Colors", queryValue: "colors" },
  { id: "buttons", label: "Buttons", queryValue: "buttons" },
  { id: "questions", label: "Questions & Forms", queryValue: "questions-forms" },
];

const TAB_QUERY_TO_ID: Record<string, TabId> = {
  fonts: "fonts",
  colors: "colors",
  buttons: "buttons",
  questions: "questions",
  "questions-forms": "questions",
};

export function getTabFromQuery(tabQueryValue: string | null): TabId {
  if (!tabQueryValue) return "fonts";
  return TAB_QUERY_TO_ID[tabQueryValue] ?? "fonts";
}

export function isValidTabQuery(tabQueryValue: string | null): boolean {
  if (!tabQueryValue) return true;
  return Boolean(TAB_QUERY_TO_ID[tabQueryValue]);
}

export type TabHref =
  | "/admin/fonts"
  | "/admin/fonts?tab=colors"
  | "/admin/fonts?tab=buttons"
  | "/admin/fonts?tab=questions-forms";

export function buildTabHref(tabId: TabId): TabHref {
  if (tabId === "colors") return "/admin/fonts?tab=colors";
  if (tabId === "buttons") return "/admin/fonts?tab=buttons";
  if (tabId === "questions") return "/admin/fonts?tab=questions-forms";
  return "/admin/fonts";
}
