export type ButtonCatalogEntry = {
  id: string;
  name: string;
  group: "Primary" | "Secondary" | "Ghost" | "Chip" | "Destructive";
  description: string;
  usage: string;
  sourcePath: string;
  signature: string;
  defaultClassName: string;
  hoverClassName: string;
  disabledClassName: string;
};

export const BUTTON_CATALOG: ButtonCatalogEntry[] = [
  {
    id: "auth-primary-continue",
    name: "Auth Continue",
    group: "Primary",
    description: "Primary CTA used on signup/finish forms.",
    usage: "Auth submit",
    sourcePath: "app/auth/finish/page.tsx",
    signature: "h-11 rounded font-hamburg font-bold bg-neutral-900 text-white",
    defaultClassName: "h-11 rounded bg-neutral-900 px-4 text-sm font-hamburg font-bold text-white",
    hoverClassName: "h-11 rounded bg-neutral-800 px-4 text-sm font-hamburg font-bold text-white",
    disabledClassName: "h-11 rounded bg-neutral-900/60 px-4 text-sm font-hamburg font-bold text-white/80",
  },
  {
    id: "admin-primary",
    name: "Admin Primary",
    group: "Primary",
    description: "Primary action button used in admin tooling.",
    usage: "Save/add actions",
    sourcePath: "app/admin/fonts/page.tsx",
    signature: "rounded-lg bg-zinc-900 text-white font-semibold",
    defaultClassName: "rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white",
    hoverClassName: "rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-white",
    disabledClassName: "rounded-lg bg-zinc-900/60 px-4 py-2 text-sm font-semibold text-white/80",
  },
  {
    id: "admin-secondary",
    name: "Admin Secondary",
    group: "Secondary",
    description: "Secondary outlined action button.",
    usage: "Navigation/secondary actions",
    sourcePath: "app/admin/fonts/page.tsx",
    signature: "rounded-lg border border-zinc-200 text-zinc-700",
    defaultClassName: "rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700",
    hoverClassName: "rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700",
    disabledClassName: "rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-400",
  },
  {
    id: "editor-chip",
    name: "Template Editor Chip",
    group: "Chip",
    description: "Rounded micro-action button used in preview cards.",
    usage: "Open template editor",
    sourcePath: "app/admin/fonts/_components/QuestionsTab.tsx",
    signature: "rounded-full border border-zinc-200 uppercase tracking",
    defaultClassName: "rounded-full border border-zinc-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600",
    hoverClassName: "rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-900",
    disabledClassName: "rounded-full border border-zinc-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400",
  },
  {
    id: "tab-button",
    name: "Top Nav Tab",
    group: "Ghost",
    description: "Top tab navigation style.",
    usage: "Design system top tabs",
    sourcePath: "app/admin/fonts/page.tsx",
    signature: "border-b-2 text-sm font-semibold",
    defaultClassName: "border-b-2 border-transparent px-1 py-2 text-sm font-semibold text-zinc-500",
    hoverClassName: "border-b-2 border-transparent px-1 py-2 text-sm font-semibold text-zinc-700",
    disabledClassName: "border-b-2 border-transparent px-1 py-2 text-sm font-semibold text-zinc-300",
  },
  {
    id: "pill-multiselect",
    name: "Pill Selector",
    group: "Chip",
    description: "Selectable pill button used for show and traits multiselect.",
    usage: "MultiSelectPills",
    sourcePath: "components/survey/MultiSelectPills.tsx",
    signature: "h-8 rounded-full text-sm font-hamburg border",
    defaultClassName: "h-8 rounded-full border border-zinc-300 bg-zinc-100 px-3 text-sm font-hamburg text-zinc-900",
    hoverClassName: "h-8 rounded-full border border-zinc-400 bg-zinc-200 px-3 text-sm font-hamburg text-zinc-900",
    disabledClassName: "h-8 rounded-full border border-zinc-200 bg-zinc-100 px-3 text-sm font-hamburg text-zinc-400",
  },
  {
    id: "danger-destructive",
    name: "Destructive",
    group: "Destructive",
    description: "Destructive action button for removals/resets.",
    usage: "Danger actions",
    sourcePath: "components/admin/SurveyQuestionsEditor.tsx",
    signature: "rounded-md bg-red-600 text-white",
    defaultClassName: "rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white",
    hoverClassName: "rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white",
    disabledClassName: "rounded-md bg-red-600/60 px-4 py-2 text-sm font-semibold text-white/80",
  },
  {
    id: "inline-link-button",
    name: "Inline Link Button",
    group: "Ghost",
    description: "Text-only inline button style used for secondary contextual actions.",
    usage: "Small in-card actions",
    sourcePath: "app/auth/finish/page.tsx",
    signature: "text-xs underline underline-offset-2",
    defaultClassName: "rounded px-1 py-1 text-xs font-semibold text-zinc-700 underline underline-offset-2",
    hoverClassName: "rounded px-1 py-1 text-xs font-semibold text-zinc-900 underline underline-offset-2",
    disabledClassName: "rounded px-1 py-1 text-xs font-semibold text-zinc-400 underline underline-offset-2",
  },
];

export const BUTTON_GROUPS: ButtonCatalogEntry["group"][] = [
  "Primary",
  "Secondary",
  "Ghost",
  "Chip",
  "Destructive",
];
