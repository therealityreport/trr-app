import type { AdminApiReferenceIgnoreEntry } from "./types.ts";

export const ADMIN_API_REFERENCE_IGNORE_CATALOG: readonly AdminApiReferenceIgnoreEntry[] = [
  {
    id: "page:/admin/design-docs",
    reason: "redirect_only",
    note: "The design docs index redirects into the canonical overview section.",
  },
  {
    id: "page:/admin/[showId]",
    reason: "duplicate_alias",
    note: "Legacy show workspace alias that forwards into the root-scoped show route.",
  },
  {
    id: "page:/admin/[showId]/[...rest]",
    reason: "duplicate_alias",
    note: "Legacy nested show alias that forwards into the root-scoped show route family.",
  },
  {
    id: "page:/admin/networks",
    reason: "duplicate_alias",
    note: "Legacy brand category entry point kept for compatibility.",
  },
  {
    id: "page:/admin/networks-and-streaming",
    reason: "duplicate_alias",
    note: "Legacy brand category entry point kept for compatibility.",
  },
  {
    id: "page:/admin/news",
    reason: "duplicate_alias",
    note: "Legacy brand category entry point kept for compatibility.",
  },
  {
    id: "page:/admin/other",
    reason: "duplicate_alias",
    note: "Legacy brand category entry point kept for compatibility.",
  },
  {
    id: "page:/admin/production-companies",
    reason: "duplicate_alias",
    note: "Legacy brand category entry point kept for compatibility.",
  },
  {
    id: "page:/admin/screenalytics",
    reason: "duplicate_alias",
    note: "Legacy Screenalytics admin-area alias kept for compatibility.",
  },
  {
    id: "page:/admin/screenlaytics",
    reason: "duplicate_alias",
    note: "Historical typo alias for the Screenalytics admin area kept for compatibility; the canonical spelling remains /screenalytics.",
  },
  {
    id: "page:/admin/social-media",
    reason: "duplicate_alias",
    note: "Legacy social entry path retained while the canonical namespace lives under /admin/social.",
  },
  {
    id: "page:/admin/social-media/bravo-content",
    reason: "duplicate_alias",
    note: "Legacy social alias retained for compatibility with the canonical /admin/social path family.",
  },
  {
    id: "page:/admin/social-media/creator-content",
    reason: "duplicate_alias",
    note: "Legacy social alias retained for compatibility with the canonical /admin/social path family.",
  },
] as const;
