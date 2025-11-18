export const DEFAULT_ADMIN_DISPLAY_NAMES = [
  "The Reality Report Superfan @the_reality_report1",
  // Support potential multi-line profile names synced from Firebase
  "The Reality Report\nSuperfan\n@the_reality_report1",
] as const;

export type DefaultAdminDisplayName = (typeof DEFAULT_ADMIN_DISPLAY_NAMES)[number];

export const DEFAULT_ADMIN_UIDS = ["MyoUFNjl9VP5iVGBi7tVqxUb8np2"] as const;
export type DefaultAdminUid = (typeof DEFAULT_ADMIN_UIDS)[number];
