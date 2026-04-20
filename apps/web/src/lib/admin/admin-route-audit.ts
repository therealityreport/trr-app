import { ADMIN_DASHBOARD_TOOLS } from "@/lib/admin/admin-navigation";
import { SHOW_PAGE_TABS } from "@/lib/admin/show-page/constants";
import type { SeasonAdminTab } from "@/lib/admin/show-admin-routes";

export type AdminRouteMatrixGroupId = "admin-home" | "show-tabs" | "season-tabs";

export type AdminRouteVariantStatus =
  | "canonical"
  | "legacy_alias"
  | "wrong_order"
  | "internal_only";

export type AdminRouteMatrixVariant = {
  path: string;
  status: AdminRouteVariantStatus;
  note: string;
};

export type AdminRouteMatrixEntry = {
  key: string;
  label: string;
  canonicalPathSteps: readonly string[];
  finalStatePath: string;
  variantPaths: readonly AdminRouteMatrixVariant[];
  notes: readonly string[];
};

export type AdminRouteMatrixGroup = {
  id: AdminRouteMatrixGroupId;
  kicker: string;
  title: string;
  description: string;
  entries: readonly AdminRouteMatrixEntry[];
};

export type AdminRouteForwarderAudit = {
  sourcePath: string;
  currentTarget: string;
  idealTarget: string;
  issue: string;
};

type AdminHomeEntryConfig = Omit<AdminRouteMatrixEntry, "key" | "label">;
type ShowTabId = (typeof SHOW_PAGE_TABS)[number]["id"];
type ShowTabEntryConfig = Omit<AdminRouteMatrixEntry, "key" | "label">;
type SeasonTabEntryConfig = Omit<AdminRouteMatrixEntry, "key" | "label">;

const ADMIN_HOME_ENTRY_CONFIG: Record<string, AdminHomeEntryConfig> = {
  "dev-dashboard": {
    canonicalPathSteps: ["/dev-dashboard"],
    finalStatePath: "/dev-dashboard",
    variantPaths: [],
    notes: ["Workspace-level diagnostics live on the admin host root without extra nesting."],
  },
  "trr-shows": {
    canonicalPathSteps: ["/admin/shows", "/[show]"],
    finalStatePath: "/[show]",
    variantPaths: [
      {
        path: "/admin/[show]",
        status: "legacy_alias",
        note: "Older admin alias that now forwards into the root-scoped show workspace.",
      },
      {
        path: "/admin/trr-shows/[showId]",
        status: "internal_only",
        note: "Implementation route that should not be treated as the browser-facing workspace URL.",
      },
    ],
    notes: [
      "The dashboard entry still starts at /admin/shows, then hands off to the canonical /[show] workspace.",
    ],
  },
  screenalytics: {
    canonicalPathSteps: ["/screenalytics", "/[show]"],
    finalStatePath: "/[show]",
    variantPaths: [
      {
        path: "/screenlaytics",
        status: "legacy_alias",
        note: "Historical typo alias retained for compatibility; the canonical spelling remains /screenalytics.",
      },
      {
        path: "/admin/screenalytics",
        status: "legacy_alias",
        note: "Older admin-prefixed entry path retained for compatibility.",
      },
    ],
    notes: ["The picker is canonical at /screenalytics and hands off into the same root-level show workspace."],
  },
  people: {
    canonicalPathSteps: ["/people", "/people/[person]"],
    finalStatePath: "/people/[person]",
    variantPaths: [
      {
        path: "/admin/people",
        status: "legacy_alias",
        note: "Legacy admin-prefixed list path.",
      },
      {
        path: "/admin/trr-shows/people/[personId]",
        status: "internal_only",
        note: "Implementation path used for person workspace resolution.",
      },
    ],
    notes: ["People workspaces now use the root-level /people path family on the admin host."],
  },
  games: {
    canonicalPathSteps: ["/games"],
    finalStatePath: "/games",
    variantPaths: [
      {
        path: "/admin/games",
        status: "legacy_alias",
        note: "Older admin-prefixed section path kept for compatibility.",
      },
    ],
    notes: ["Game-specific experiences continue to branch under the /games family."],
  },
  surveys: {
    canonicalPathSteps: ["/surveys", "/surveys/[surveyKey]"],
    finalStatePath: "/surveys/[surveyKey]",
    variantPaths: [
      {
        path: "/admin/surveys",
        status: "legacy_alias",
        note: "Compatibility alias for the survey index.",
      },
    ],
    notes: ["Survey editing and drill-in flows stay inside the /surveys path family."],
  },
  "social-media": {
    canonicalPathSteps: ["/social", "/social/[platform]/[handle]"],
    finalStatePath: "/social/[platform]/[handle]",
    variantPaths: [
      {
        path: "/admin/social-media",
        status: "legacy_alias",
        note: "Old section name that now forwards to /social.",
      },
      {
        path: "/social-media",
        status: "legacy_alias",
        note: "Legacy host-level compatibility path; forwards to /social.",
      },
      {
        path: "/admin/social",
        status: "legacy_alias",
        note: "Pre-migration admin entry path; proxy redirects to /social.",
      },
      {
        path: "/admin/social/[platform]/[handle]",
        status: "legacy_alias",
        note: "Pre-migration account-profile admin path; canonical form is /social/[platform]/[handle].",
      },
    ],
    notes: [
      "Social-account-profile tabs (stats/comments/posts/hashtags/collaborators-tags) render at the canonical /social/[platform]/[handle] family.",
      "The catalog and socialblade tabs remain under /admin/social/... until a follow-up migration moves them.",
    ],
  },
  "networks-streaming": {
    canonicalPathSteps: ["/brands", "/brands/[brand]"],
    finalStatePath: "/brands/[brand]",
    variantPaths: [
      {
        path: "/admin/brands",
        status: "legacy_alias",
        note: "Compatibility alias for the unified brands workspace.",
      },
      {
        path: "/admin/networks-and-streaming",
        status: "legacy_alias",
        note: "Older split brand-category entry point.",
      },
      {
        path: "/admin/networks",
        status: "legacy_alias",
        note: "Legacy short-form brand category alias.",
      },
      {
        path: "/admin/production-companies",
        status: "legacy_alias",
        note: "Legacy split brand category path.",
      },
      {
        path: "/admin/news",
        status: "legacy_alias",
        note: "Legacy split brand category path.",
      },
      {
        path: "/admin/other",
        status: "legacy_alias",
        note: "Legacy split brand category path.",
      },
    ],
    notes: ["Brand-related categories are being consolidated under the /brands tree for testing and cleanup."],
  },
  users: {
    canonicalPathSteps: ["/users"],
    finalStatePath: "/users",
    variantPaths: [
      {
        path: "/admin/users",
        status: "legacy_alias",
        note: "Compatibility alias for the users workspace.",
      },
    ],
    notes: [],
  },
  groups: {
    canonicalPathSteps: ["/groups"],
    finalStatePath: "/groups",
    variantPaths: [
      {
        path: "/admin/groups",
        status: "legacy_alias",
        note: "Compatibility alias for the groups workspace.",
      },
    ],
    notes: [],
  },
  docs: {
    canonicalPathSteps: ["/docs"],
    finalStatePath: "/docs",
    variantPaths: [
      {
        path: "/admin/docs",
        status: "legacy_alias",
        note: "Compatibility alias for the docs workspace.",
      },
    ],
    notes: [],
  },
  "design-system": {
    canonicalPathSteps: ["/design-system/fonts", "/design-system/admin-labels"],
    finalStatePath: "/design-system/admin-labels",
    variantPaths: [],
    notes: ["Admin Labels & Routes lives inside the design-system family as the route QA ledger."],
  },
  "design-docs": {
    canonicalPathSteps: ["/admin/design-docs", "/admin/design-docs/[section]"],
    finalStatePath: "/admin/design-docs/[section]",
    variantPaths: [
      {
        path: "/admin/design-docs/admin-ia",
        status: "legacy_alias",
        note: "Old admin-IA section now redirects to /design-system/admin-labels.",
      },
    ],
    notes: [],
  },
  settings: {
    canonicalPathSteps: ["/settings"],
    finalStatePath: "/settings",
    variantPaths: [
      {
        path: "/admin/settings",
        status: "legacy_alias",
        note: "Compatibility alias for the admin settings workspace.",
      },
    ],
    notes: [],
  },
};

const SHOW_TAB_ENTRY_CONFIG: Record<ShowTabId, ShowTabEntryConfig> = {
  details: {
    canonicalPathSteps: ["/[show]"],
    finalStatePath: "/[show]",
    variantPaths: [
      {
        path: "/admin/[show]",
        status: "legacy_alias",
        note: "Old direct admin alias that now redirects to the root-scoped show workspace.",
      },
      {
        path: "/admin/trr-shows/[showId]",
        status: "internal_only",
        note: "Implementation path still used under the hood.",
      },
    ],
    notes: ["The show home tab is the root-scoped canonical workspace path on the admin host."],
  },
  seasons: {
    canonicalPathSteps: ["/[show]", "/[show]/seasons", "/[show]/s#"],
    finalStatePath: "/[show]/s#",
    variantPaths: [
      {
        path: "/admin/trr-shows/[showId]/seasons/[seasonNumber]",
        status: "internal_only",
        note: "Implementation route for season workspaces.",
      },
      {
        path: "/admin/trr-shows/[showId]/season-#",
        status: "legacy_alias",
        note: "Legacy season slug alias that redirects into the canonical season route.",
      },
    ],
    notes: ["The Seasons tab ladders from the show workspace into the season index and then a canonical season workspace."],
  },
  assets: {
    canonicalPathSteps: ["/[show]", "/[show]/assets", "/[show]/assets/[subtab]"],
    finalStatePath: "/[show]/assets/[subtab]",
    variantPaths: [
      {
        path: "/[show]/media",
        status: "legacy_alias",
        note: "Legacy alias normalized into the assets family.",
      },
      {
        path: "/[show]/media-gallery",
        status: "legacy_alias",
        note: "Legacy alias normalized to /[show]/assets.",
      },
      {
        path: "/[show]/media-videos",
        status: "legacy_alias",
        note: "Legacy alias normalized to /[show]/assets/videos.",
      },
      {
        path: "/[show]/media-brand",
        status: "legacy_alias",
        note: "Legacy alias normalized to /[show]/assets/branding.",
      },
      {
        path: "/admin/trr-shows/[showId]/assets/[subtab]",
        status: "internal_only",
        note: "Implementation path behind the canonical root-scoped assets routes.",
      },
    ],
    notes: ["Treat Media as presentation language only; the canonical tab family is /assets."],
  },
  news: {
    canonicalPathSteps: ["/[show]", "/[show]/news"],
    finalStatePath: "/[show]/news",
    variantPaths: [
      {
        path: "/admin/trr-shows/[showId]/news",
        status: "internal_only",
        note: "Implementation path only.",
      },
    ],
    notes: [],
  },
  cast: {
    canonicalPathSteps: ["/[show]", "/[show]/cast"],
    finalStatePath: "/[show]/cast",
    variantPaths: [
      {
        path: "/admin/trr-shows/[showId]/cast",
        status: "internal_only",
        note: "Implementation path only.",
      },
    ],
    notes: [],
  },
  surveys: {
    canonicalPathSteps: ["/[show]", "/[show]/surveys"],
    finalStatePath: "/[show]/surveys",
    variantPaths: [
      {
        path: "/admin/trr-shows/[showId]/surveys",
        status: "internal_only",
        note: "Implementation path only.",
      },
    ],
    notes: [],
  },
  social: {
    canonicalPathSteps: [
      "/[show]/social",
      "/[show]/social/[view]",
      "/[show]/social/[s#]",
      "/[show]/social/[s#]/[view]",
      "/[show]/social/[s#]/[w#]",
      "/[show]/social/[s#]/[w#]/[platform]",
    ],
    finalStatePath: "/[show]/social/[s#]/[w#]/[platform]",
    variantPaths: [
      {
        path: "/[show]/[s#]/social",
        status: "wrong_order",
        note: "Valid season-workspace route family, but not the canonical show-level social ladder.",
      },
      {
        path: "/[show]/social/w#/[platform]",
        status: "legacy_alias",
        note: "Legacy week-without-season shorthand preserved by compatibility parsing.",
      },
      {
        path: "/admin/trr-shows/[showId]/social",
        status: "internal_only",
        note: "Implementation path only.",
      },
    ],
    notes: [
      "Official analysis omits [view]; non-official analytics views insert [view] before week or platform segments.",
      "Use /[show]/social/[s#] for show-level season scoping, not /[show]/[s#]/social.",
    ],
  },
  settings: {
    canonicalPathSteps: ["/[show]", "/[show]/settings"],
    finalStatePath: "/[show]/settings",
    variantPaths: [
      {
        path: "/admin/trr-shows/[showId]/settings",
        status: "internal_only",
        note: "Implementation path only.",
      },
      {
        path: "/admin/trr-shows/[showId]/overview",
        status: "legacy_alias",
        note: "Legacy alias preserved for backward-compatible tab normalization.",
      },
    ],
    notes: [],
  },
};

const SEASON_PAGE_TABS: ReadonlyArray<{ id: SeasonAdminTab; label: string }> = [
  { id: "overview", label: "Home" },
  { id: "episodes", label: "Episodes" },
  { id: "assets", label: "Assets" },
  { id: "news", label: "News" },
  { id: "fandom", label: "Fandom" },
  { id: "cast", label: "Cast" },
  { id: "surveys", label: "Surveys" },
  { id: "social", label: "Social Media" },
];

const SEASON_TAB_ENTRY_CONFIG: Record<SeasonAdminTab, SeasonTabEntryConfig> = {
  overview: {
    canonicalPathSteps: ["/[show]/s#"],
    finalStatePath: "/[show]/s#",
    variantPaths: [
      {
        path: "/admin/trr-shows/[showId]/seasons/[seasonNumber]",
        status: "internal_only",
        note: "Implementation route behind the root-scoped season workspace.",
      },
      {
        path: "/admin/trr-shows/[showId]/season-#",
        status: "legacy_alias",
        note: "Legacy season slug alias redirected into the canonical season route.",
      },
      {
        path: "/admin/trr-shows/[showId]/seasons/[seasonNumber]/overview",
        status: "legacy_alias",
        note: "Legacy details/overview tab aliases normalize back to the season root.",
      },
    ],
    notes: ["The season home tab is the root of the canonical /[show]/s# workspace."],
  },
  episodes: {
    canonicalPathSteps: ["/[show]/s#", "/[show]/s#/e#"],
    finalStatePath: "/[show]/s#/e#",
    variantPaths: [
      {
        path: "/admin/trr-shows/[showId]/seasons/[seasonNumber]/episodes",
        status: "internal_only",
        note: "Implementation path only.",
      },
    ],
    notes: ["Episode drill-ins sit directly under the canonical season root."],
  },
  assets: {
    canonicalPathSteps: ["/[show]/s#", "/[show]/s#/assets", "/[show]/s#/assets/[subtab]"],
    finalStatePath: "/[show]/s#/assets/[subtab]",
    variantPaths: [
      {
        path: "/[show]/s#/media",
        status: "legacy_alias",
        note: "Legacy alias normalized into the season assets family.",
      },
      {
        path: "/[show]/s#/assets/brand",
        status: "legacy_alias",
        note: "Legacy alias normalized to /[show]/s#/assets/branding.",
      },
      {
        path: "/admin/trr-shows/[showId]/seasons/[seasonNumber]/assets/[subtab]",
        status: "internal_only",
        note: "Implementation path only.",
      },
    ],
    notes: ["Season Media should be documented under the canonical /assets family for testing."],
  },
  news: {
    canonicalPathSteps: ["/[show]/s#", "/[show]/s#/news"],
    finalStatePath: "/[show]/s#/news",
    variantPaths: [
      {
        path: "/admin/trr-shows/[showId]/seasons/[seasonNumber]/news",
        status: "internal_only",
        note: "Implementation path only.",
      },
    ],
    notes: [],
  },
  fandom: {
    canonicalPathSteps: ["/[show]/s#", "/[show]/s#/fandom"],
    finalStatePath: "/[show]/s#/fandom",
    variantPaths: [
      {
        path: "/admin/trr-shows/[showId]/seasons/[seasonNumber]/fandom",
        status: "internal_only",
        note: "Implementation path only.",
      },
    ],
    notes: [],
  },
  cast: {
    canonicalPathSteps: ["/[show]/s#", "/[show]/s#/cast"],
    finalStatePath: "/[show]/s#/cast",
    variantPaths: [
      {
        path: "/admin/trr-shows/[showId]/seasons/[seasonNumber]/cast",
        status: "internal_only",
        note: "Implementation path only.",
      },
    ],
    notes: [],
  },
  surveys: {
    canonicalPathSteps: ["/[show]/s#", "/[show]/s#/surveys"],
    finalStatePath: "/[show]/s#/surveys",
    variantPaths: [
      {
        path: "/admin/trr-shows/[showId]/seasons/[seasonNumber]/surveys",
        status: "internal_only",
        note: "Implementation path only.",
      },
    ],
    notes: [],
  },
  social: {
    canonicalPathSteps: [
      "/[show]/s#/social",
      "/[show]/s#/social/[view]",
      "/[show]/s#/social/[w#]",
      "/[show]/s#/social/[w#]/[platform]",
      "/[show]/s#/social/[view]/[w#]",
      "/[show]/s#/social/[view]/[w#]/[platform]",
    ],
    finalStatePath: "/[show]/s#/social/[w#]/[platform]",
    variantPaths: [
      {
        path: "/[show]/social/[s#]",
        status: "wrong_order",
        note: "Valid show-level social ladder, but not the canonical season-tab route family.",
      },
      {
        path: "/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]",
        status: "internal_only",
        note: "Implementation path behind week-detail rendering.",
      },
      {
        path: "/admin/trr-shows/[showId]/season-#/social",
        status: "legacy_alias",
        note: "Legacy tab alias that redirects into the canonical season route.",
      },
    ],
    notes: [
      "Official analysis omits [view]; non-official analytics views insert [view] before the week path.",
      "Use /[show]/s#/social for season workspaces and /[show]/social/[s#] for the show-level social ladder.",
    ],
  },
};

const buildAdminHomeEntry = (): readonly AdminRouteMatrixEntry[] =>
  ADMIN_DASHBOARD_TOOLS.map((tool) => {
    const config = ADMIN_HOME_ENTRY_CONFIG[tool.key] ?? {
      canonicalPathSteps: [String(tool.href)],
      finalStatePath: String(tool.href),
      variantPaths: [],
      notes: [],
    };

    return {
      key: tool.key,
      label: tool.title,
      ...config,
    };
  });

const buildShowTabEntries = (): readonly AdminRouteMatrixEntry[] =>
  SHOW_PAGE_TABS.map((tab) => ({
    key: tab.id,
    label: tab.label,
    ...SHOW_TAB_ENTRY_CONFIG[tab.id],
  }));

const buildSeasonTabEntries = (): readonly AdminRouteMatrixEntry[] =>
  SEASON_PAGE_TABS.map((tab) => ({
    key: tab.id,
    label: tab.label,
    ...SEASON_TAB_ENTRY_CONFIG[tab.id],
  }));

export const ADMIN_ROUTE_MATRIX_GROUPS: readonly AdminRouteMatrixGroup[] = [
  {
    id: "admin-home",
    kicker: "Admin Home",
    title: "Admin Home Tools",
    description:
      "Dashboard tool cards and their launch paths on the admin host, including root-level canonical entries and compatibility aliases that still exist in the tree.",
    entries: buildAdminHomeEntry(),
  },
  {
    id: "show-tabs",
    kicker: "Show Workspaces",
    title: "Show Page Tabs",
    description:
      "Canonical root-scoped show workspace ladders, including each tab family from the shallowest valid path to the deepest state that still belongs to that tab.",
    entries: buildShowTabEntries(),
  },
  {
    id: "season-tabs",
    kicker: "Season Workspaces",
    title: "Season Page Tabs",
    description:
      "Canonical season workspace ladders rooted at /[show]/s#, with explicit notes where legacy admin or wrong-order variants still exist for compatibility.",
    entries: buildSeasonTabEntries(),
  },
] as const;

export const ADMIN_ROUTE_FORWARDER_AUDIT: readonly AdminRouteForwarderAudit[] = [
  {
    sourcePath: "/admin/[show]",
    currentTarget: "/admin/trr-shows/[showId]",
    idealTarget: "/[show]",
    issue: "This older alias still exposes an unnecessary /admin segment before landing on the show workspace.",
  },
  {
    sourcePath: "/admin/[show]/*",
    currentTarget: "/admin/trr-shows/[showId]/*",
    idealTarget: "/[show]/*",
    issue: "Nested show aliases should resolve to the root-level show workspace path, not continue to expose the legacy internal tree.",
  },
  {
    sourcePath: "/admin/trr-shows/[showId]",
    currentTarget: "Legacy implementation path",
    idealTarget: "/[show]",
    issue: "This is an internal implementation route and should never be treated as a browser-facing primary URL.",
  },
  {
    sourcePath: "/admin/trr-shows/[showId]/*",
    currentTarget: "Legacy implementation path",
    idealTarget: "/[show]/*",
    issue: "Nested legacy implementation paths should redirect outward to the canonical root-level show workspace URLs.",
  },
  {
    sourcePath: "/admin/social-media",
    currentTarget: "/admin/social",
    idealTarget: "/admin/social",
    issue: "This is a compatibility redirect and should not be treated as a primary section path.",
  },
  {
    sourcePath: "/admin/networks, /admin/networks-and-streaming, /admin/production-companies, /admin/news, /admin/other",
    currentTarget: "Split brand category pages",
    idealTarget: "/brands/*",
    issue: "Brand-related destinations are fragmented across multiple path families instead of reading as one brands tree.",
  },
] as const;
