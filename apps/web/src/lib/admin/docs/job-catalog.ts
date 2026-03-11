import type { Route } from "next";

export const ADMIN_JOB_DOC_CATEGORIES = [
  "Scraping & Discovery",
  "Show / Person Sync & Import",
  "Image Intelligence & Identity",
  "Brand Assets & Logos",
  "Social Runs & Queue Operations",
] as const;

export type AdminJobDocCategory = (typeof ADMIN_JOB_DOC_CATEGORIES)[number];

export type AdminJobDocTrigger = {
  label: string;
  triggerType: string;
  uiLocation: string;
  routeReference: string;
  notes?: string;
};

export type AdminJobRuntime = "Local" | "Modal";
export type AdminJobMigrationStatus = "stable" | "planned" | "migrating" | "cutover-complete";

export type AdminJobDocEntry = {
  id: string;
  title: string;
  category: AdminJobDocCategory;
  summary: string;
  pageLabel: string;
  pageHref: Route;
  pagePathPattern?: string;
  pageContainerBreadcrumb: readonly string[];
  currentRuntime: AdminJobRuntime;
  targetRuntime: AdminJobRuntime;
  migrationStatus?: AdminJobMigrationStatus;
  runtimeNotes?: string;
  notes?: string;
  triggers: readonly AdminJobDocTrigger[];
};

export const ADMIN_JOB_DOCS: readonly AdminJobDocEntry[] = [
  {
    id: "image-scrape-import",
    title: "Image Scrape / Import",
    category: "Scraping & Discovery",
    summary: "Run a scrape job and import discovered images into the current admin workflow.",
    pageLabel: "Scrape Images",
    pageHref: "/admin/scrape-images",
    pagePathPattern: "/admin/scrape-images",
    pageContainerBreadcrumb: ["Admin", "Scrape Images"],
    currentRuntime: "Modal",
    targetRuntime: "Modal",
    runtimeNotes: "This admin operation has dedicated Modal dispatch and falls back to the remote admin worker when Modal is disabled.",
    notes: "The same ImageScrapeDrawer flow is also reused from show and season asset pages.",
    triggers: [
      {
        label: "Scrape",
        triggerType: "drawer action",
        uiLocation: "Scrape Images page form footer",
        routeReference: "/api/admin/trr-api/scrape-images",
      },
      {
        label: "Import Images",
        triggerType: "drawer action",
        uiLocation: "Scrape Images page import workflow footer",
        routeReference: "/api/admin/trr-api/images/import",
        notes: "The drawer label is exactly `Import Images`; import counts are shown in surrounding status copy.",
      },
    ],
  },
  {
    id: "show-link-discovery",
    title: "Show Link Discovery",
    category: "Scraping & Discovery",
    summary: "Refresh the show link catalog and add approved links directly from the show admin page.",
    pageLabel: "Shows",
    pageHref: "/shows",
    pagePathPattern: "/shows/[showId]",
    pageContainerBreadcrumb: ["Admin", "Shows", "Show Name", "Settings", "Links"],
    currentRuntime: "Modal",
    targetRuntime: "Modal",
    runtimeNotes: "Link discovery is wired into the streamed admin-operations plane and has a dedicated Modal dispatch target.",
    triggers: [
      {
        label: "Refresh Links",
        triggerType: "section action",
        uiLocation: "Show page Links section toolbar",
        routeReference: "/api/admin/trr-api/shows/[showId]/links/discover/stream",
      },
      {
        label: "Add Link(s)",
        triggerType: "section action",
        uiLocation: "Show page Links section bulk-add form",
        routeReference: "/api/admin/trr-api/shows/[showId]/links",
      },
    ],
  },
  {
    id: "show-sync-from-lists",
    title: "Show Sync from Lists",
    category: "Scraping & Discovery",
    summary: "Backfill or refresh shows from the lists sync endpoint exposed on the show search page.",
    pageLabel: "Show Search",
    pageHref: "/admin/trr-shows",
    pagePathPattern: "/admin/trr-shows",
    pageContainerBreadcrumb: ["Admin", "Shows"],
    currentRuntime: "Local",
    targetRuntime: "Modal",
    runtimeNotes: "The sync endpoint currently runs inline in the API request path; it is a better fit for offloaded batch execution.",
    triggers: [
      {
        label: "Sync from Lists",
        triggerType: "page action",
        uiLocation: "TRR Shows admin page header actions",
        routeReference: "/api/admin/trr-api/shows/sync-from-lists",
      },
    ],
  },
  {
    id: "show-refresh",
    title: "Show Refresh",
    category: "Show / Person Sync & Import",
    summary: "Refresh show metadata and open the health center that tracks content and pipeline status.",
    pageLabel: "Shows",
    pageHref: "/shows",
    pagePathPattern: "/shows/[showId]",
    pageContainerBreadcrumb: ["Admin", "Shows", "Show Name"],
    currentRuntime: "Modal",
    targetRuntime: "Modal",
    runtimeNotes: "Show refresh is already wired to the Modal-backed admin-operations plane; the Health action only opens UI state.",
    triggers: [
      {
        label: "Refresh",
        triggerType: "page action",
        uiLocation: "Show page header actions",
        routeReference: "/api/admin/trr-api/shows/[showId]/refresh",
      },
      {
        label: "Health",
        triggerType: "page action",
        uiLocation: "Show page header actions",
        routeReference: "/shows/[showId]#health-center",
        notes: "Opens the in-page Health Center drawer; no backend kickoff on its own.",
      },
    ],
  },
  {
    id: "show-bravo-import",
    title: "Bravo Import Preview / Commit",
    category: "Show / Person Sync & Import",
    summary: "Preview and save Bravo-driven show sync payloads from the show page modal.",
    pageLabel: "Shows",
    pageHref: "/shows",
    pagePathPattern: "/shows/[showId]",
    pageContainerBreadcrumb: ["Admin", "Shows", "Show Name"],
    currentRuntime: "Modal",
    targetRuntime: "Modal",
    runtimeNotes: "Bravo preview is part of the explicit Modal-supported admin operation set; the commit step remains in the same workflow.",
    triggers: [
      {
        label: "Sync by Bravo",
        triggerType: "open modal",
        uiLocation: "Show page header actions",
        routeReference: "/shows/[showId]#sync-by-bravo",
      },
      {
        label: "Run Preview",
        triggerType: "modal action",
        uiLocation: "Sync by Bravo mode picker modal footer",
        routeReference: "/api/admin/trr-api/shows/[showId]/import-bravo/preview",
      },
      {
        label: "Next",
        triggerType: "modal action",
        uiLocation: "Sync by Bravo mode picker modal footer",
        routeReference: "/shows/[showId]#sync-by-bravo",
        notes: "Advances from preview to commit confirmation.",
      },
      {
        label: "Save",
        triggerType: "modal action",
        uiLocation: "Sync by Bravo mode picker modal confirmation footer",
        routeReference: "/api/admin/trr-api/shows/[showId]/import-bravo/commit",
      },
    ],
  },
  {
    id: "season-fandom-import",
    title: "Season Fandom Preview / Commit",
    category: "Show / Person Sync & Import",
    summary: "Preview and persist season-level Fandom content from the dedicated season Fandom tab.",
    pageLabel: "Shows",
    pageHref: "/shows",
    pagePathPattern: "/shows/[showId]/seasons/[seasonNumber]",
    pageContainerBreadcrumb: ["Admin", "Shows", "Show Name", "Season #", "Fandom"],
    currentRuntime: "Local",
    targetRuntime: "Modal",
    runtimeNotes: "Season Fandom preview and commit execute inline today, but the external fetch-and-parse work is better moved off the request path.",
    triggers: [
      {
        label: "Sync by Fandom",
        triggerType: "open modal",
        uiLocation: "Season page Fandom tab header actions",
        routeReference: "/shows/[showId]/seasons/[seasonNumber]#fandom",
      },
      {
        label: "Run Preview",
        triggerType: "modal action",
        uiLocation: "Fandom sync modal footer",
        routeReference: "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/preview",
      },
      {
        label: "Save",
        triggerType: "modal action",
        uiLocation: "Fandom sync modal confirmation footer",
        routeReference: "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/import-fandom/commit",
      },
    ],
  },
  {
    id: "person-fandom-import",
    title: "Person Fandom Preview / Commit",
    category: "Show / Person Sync & Import",
    summary: "Preview and persist Fandom profile data from the person page Fandom tab.",
    pageLabel: "People",
    pageHref: "/people",
    pagePathPattern: "/people/[personId]",
    pageContainerBreadcrumb: ["Admin", "People", "Person Name", "Fandom"],
    currentRuntime: "Local",
    targetRuntime: "Modal",
    runtimeNotes: "Person Fandom sync is currently request-bound; the preview scrape workload is a better match for Modal.",
    triggers: [
      {
        label: "Sync by Fandom",
        triggerType: "open modal",
        uiLocation: "Person page Fandom tab header actions",
        routeReference: "/people/[personId]#fandom",
      },
      {
        label: "Run Preview",
        triggerType: "modal action",
        uiLocation: "Fandom sync modal footer",
        routeReference: "/api/admin/trr-api/people/[personId]/import-fandom/preview",
      },
      {
        label: "Save",
        triggerType: "modal action",
        uiLocation: "Fandom sync modal confirmation footer",
        routeReference: "/api/admin/trr-api/people/[personId]/import-fandom/commit",
      },
    ],
  },
  {
    id: "cast-matrix-sync",
    title: "Cast Matrix Sync",
    category: "Show / Person Sync & Import",
    summary: "Apply wiki and Fandom-derived cast role assignments back into the show cast matrix.",
    pageLabel: "Shows",
    pageHref: "/shows",
    pagePathPattern: "/shows/[showId]",
    pageContainerBreadcrumb: ["Admin", "Shows", "Show Name", "Cast Matrix"],
    currentRuntime: "Local",
    targetRuntime: "Local",
    runtimeNotes: "This is a direct metadata sync against existing TRR data and does not currently rely on a worker plane.",
    triggers: [
      {
        label: "Sync Cast Roles (Wiki/Fandom)",
        triggerType: "panel action",
        uiLocation: "Show page Cast Matrix Sync panel",
        routeReference: "/api/admin/trr-api/shows/[showId]/cast-matrix/sync",
      },
    ],
  },
  {
    id: "person-image-refresh",
    title: "Person Image Refresh / Reprocess",
    category: "Show / Person Sync & Import",
    summary: "Refresh gallery details, fetch new images, and rerun the full image pipeline from the person admin page.",
    pageLabel: "People",
    pageHref: "/people",
    pagePathPattern: "/people/[personId]",
    pageContainerBreadcrumb: ["Admin", "People", "Person Name", "Gallery"],
    currentRuntime: "Modal",
    targetRuntime: "Modal",
    migrationStatus: "cutover-complete",
    runtimeNotes:
      "The refresh and reprocess pipeline now executes through the backend-owned vision runtime with Modal-backed image analysis instead of the old Screenalytics service dependency.",
    triggers: [
      {
        label: "Get Images",
        triggerType: "page action",
        uiLocation: "Person page gallery toolbar",
        routeReference: "/api/admin/trr-api/people/[personId]/photos",
      },
      {
        label: "Refresh Details",
        triggerType: "page action",
        uiLocation: "Person page gallery toolbar",
        routeReference: "/api/admin/trr-api/people/[personId]/refresh-images",
      },
      {
        label: "Refresh Full Pipeline",
        triggerType: "lightbox action",
        uiLocation: "Image lightbox action row",
        routeReference: "/api/admin/trr-api/people/[personId]/refresh-images/stream",
      },
    ],
  },
  {
    id: "google-news-sync",
    title: "Google News Sync",
    category: "Show / Person Sync & Import",
    summary: "Refresh the show News tab, including Google News sync-backed content and filters.",
    pageLabel: "Shows",
    pageHref: "/shows",
    pagePathPattern: "/shows/[showId]",
    pageContainerBreadcrumb: ["Admin", "Shows", "Show Name", "News"],
    currentRuntime: "Modal",
    targetRuntime: "Modal",
    runtimeNotes: "Google News sync can fall back to the remote worker plane, but it has dedicated Modal dispatch today.",
    triggers: [
      {
        label: "Refresh",
        triggerType: "tab action",
        uiLocation: "Show page News tab toolbar",
        routeReference: "/api/admin/trr-api/shows/[showId]/google-news/sync",
      },
    ],
  },
  {
    id: "people-count-tools",
    title: "People Count Tools",
    category: "Image Intelligence & Identity",
    summary: "Manually save a count or rerun count detection from gallery edit tools on cast photos and media assets.",
    pageLabel: "People",
    pageHref: "/people",
    pagePathPattern: "/people/[personId]",
    pageContainerBreadcrumb: ["Admin", "People", "Person Name", "Gallery", "Asset Edit Tools"],
    currentRuntime: "Modal",
    targetRuntime: "Modal",
    migrationStatus: "cutover-complete",
    runtimeNotes:
      "People count and crop-analysis now execute through the dedicated Modal vision worker and no longer require the Screenalytics API URL for covered admin jobs.",
    triggers: [
      {
        label: "Save",
        triggerType: "field edit + save",
        uiLocation: "Gallery asset edit tools > People Count",
        routeReference: "/api/admin/trr-api/cast-photos/[photoId]/people-count",
        notes: "Used when an editor overrides the current detected count.",
      },
      {
        label: "Recount",
        triggerType: "panel action",
        uiLocation: "Gallery asset edit tools > People Count",
        routeReference: "/api/admin/trr-api/cast-photos/[photoId]/auto-count",
        notes: "Media assets use the matching `/media-assets/[assetId]/auto-count` proxy.",
      },
    ],
  },
  {
    id: "text-overlay-detection",
    title: "Text Overlay Detection",
    category: "Image Intelligence & Identity",
    summary: "Classify whether an image contains text overlay from the gallery edit tools.",
    pageLabel: "People",
    pageHref: "/people",
    pagePathPattern: "/people/[personId]",
    pageContainerBreadcrumb: ["Admin", "People", "Person Name", "Gallery", "Asset Edit Tools"],
    currentRuntime: "Local",
    targetRuntime: "Local",
    runtimeNotes: "Text overlay detection runs inline from the admin API today and is scoped to a single asset per trigger.",
    triggers: [
      {
        label: "Classify Text Overlay",
        triggerType: "panel action",
        uiLocation: "Gallery asset edit tools > Text ID",
        routeReference: "/api/admin/trr-api/cast-photos/[photoId]/detect-text-overlay",
        notes: "Media assets use the matching `/media-assets/[assetId]/detect-text-overlay` proxy.",
      },
    ],
  },
  {
    id: "crop-and-variants",
    title: "Thumbnail Crop / Variant Generation",
    category: "Image Intelligence & Identity",
    summary: "Persist manual crops, refresh auto crops, and regenerate resized variants from gallery edit tools.",
    pageLabel: "People",
    pageHref: "/people",
    pagePathPattern: "/people/[personId]",
    pageContainerBreadcrumb: ["Admin", "People", "Person Name", "Gallery", "Asset Edit Tools"],
    currentRuntime: "Local",
    targetRuntime: "Local",
    runtimeNotes: "Crop saves and variant generation are handled per asset inside the API path today rather than through a worker queue.",
    triggers: [
      {
        label: "Save Crop",
        triggerType: "panel action",
        uiLocation: "Gallery asset edit tools > Crop / Resize",
        routeReference: "/api/admin/trr-api/people/[personId]/photos/[photoId]/thumbnail-crop",
      },
      {
        label: "Refresh Auto Crop",
        triggerType: "panel action",
        uiLocation: "Gallery asset edit tools > Crop / Resize",
        routeReference: "/api/admin/trr-api/people/[personId]/photos/[photoId]/thumbnail-crop",
      },
      {
        label: "Generate Variants (Base)",
        triggerType: "panel action",
        uiLocation: "Gallery asset edit tools > Crop / Resize",
        routeReference: "/api/admin/trr-api/media-assets/[assetId]/variants/base",
      },
      {
        label: "Generate Variants (Crop)",
        triggerType: "panel action",
        uiLocation: "Gallery asset edit tools > Crop / Resize",
        routeReference: "/api/admin/trr-api/media-assets/[assetId]/variants/crop",
      },
    ],
  },
  {
    id: "manual-crop-and-facebank-seed",
    title: "Manual Crop / Facebank Seed",
    category: "Image Intelligence & Identity",
    summary: "Persist person-photo specific thumbnail crops and mark gallery items as facebank seeds.",
    pageLabel: "People",
    pageHref: "/people",
    pagePathPattern: "/people/[personId]",
    pageContainerBreadcrumb: ["Admin", "People", "Person Name", "Gallery", "Image Lightbox"],
    currentRuntime: "Local",
    targetRuntime: "Local",
    runtimeNotes: "Manual crop persistence and facebank seed toggles are lightweight editor writes and fit the in-request path.",
    triggers: [
      {
        label: "Save Manual Crop",
        triggerType: "panel action",
        uiLocation: "Person gallery lightbox crop controls",
        routeReference: "/api/admin/trr-api/people/[personId]/photos/[photoId]/thumbnail-crop",
      },
      {
        label: "Refresh Auto Crop",
        triggerType: "panel action",
        uiLocation: "Person gallery lightbox crop controls",
        routeReference: "/api/admin/trr-api/people/[personId]/photos/[photoId]/thumbnail-crop",
      },
      {
        label: "Set as Seed",
        triggerType: "panel action",
        uiLocation: "Person gallery lightbox > Facebank Seed",
        routeReference: "/api/admin/trr-api/people/[personId]/gallery/[linkId]/facebank-seed",
      },
      {
        label: "Unset Seed",
        triggerType: "panel action",
        uiLocation: "Person gallery lightbox > Facebank Seed",
        routeReference: "/api/admin/trr-api/people/[personId]/gallery/[linkId]/facebank-seed",
      },
    ],
  },
  {
    id: "brand-logo-sync",
    title: "Brand Logo Sync",
    category: "Brand Assets & Logos",
    summary: "Trigger the global brand logo sync from the Brands admin page.",
    pageLabel: "Brands",
    pageHref: "/brands",
    pagePathPattern: "/brands",
    pageContainerBreadcrumb: ["Admin", "Brands"],
    currentRuntime: "Local",
    targetRuntime: "Modal",
    runtimeNotes: "The current brand-wide sync runs from the API request path, but global logo sync is batch-shaped and should be offloaded.",
    triggers: [
      {
        label: "Sync All Brand Logos",
        triggerType: "page action",
        uiLocation: "Brands page header actions",
        routeReference: "/api/admin/trr-api/brands/logos/sync-all",
      },
    ],
  },
  {
    id: "brand-logo-options",
    title: "Brand Logo Option Discovery / Selection",
    category: "Brand Assets & Logos",
    summary: "Discover, import, and save logo options from the brand/show logo options modal.",
    pageLabel: "Brands",
    pageHref: "/brands",
    pagePathPattern: "/brands/networks-and-streaming/[entityType]/[entitySlug]",
    pageContainerBreadcrumb: ["Admin", "Brands", "Brand / Show", "Logo Options"],
    currentRuntime: "Local",
    targetRuntime: "Local",
    runtimeNotes: "Discovery, selection, and source-query saves all execute directly in the admin API today.",
    triggers: [
      {
        label: "Import Image URL",
        triggerType: "modal action",
        uiLocation: "Brand Logo Options modal > manual import panel",
        routeReference: "/api/admin/trr-api/brands/logos/options/import-url",
      },
      {
        label: "Add Query",
        triggerType: "modal action",
        uiLocation: "Brand Logo Options modal > Source Discovery",
        routeReference: "/api/admin/trr-api/brands/logos/options/source-query",
      },
      {
        label: "Save Featured (1)",
        triggerType: "modal action",
        uiLocation: "Brand Logo Options modal footer",
        routeReference: "/api/admin/trr-api/brands/logos/featured",
      },
    ],
  },
  {
    id: "featured-logo-selection",
    title: "Featured Logo Selection",
    category: "Brand Assets & Logos",
    summary: "Set or change the featured show logo directly from the featured-logo drawer.",
    pageLabel: "Shows",
    pageHref: "/shows",
    pagePathPattern: "/shows/[showId]",
    pageContainerBreadcrumb: ["Admin", "Shows", "Show Name", "Brand Assets"],
    currentRuntime: "Local",
    targetRuntime: "Local",
    runtimeNotes: "Featured-logo changes are editor-driven metadata updates and do not need a remote worker.",
    triggers: [
      {
        label: "Set Featured Logo",
        triggerType: "drawer action",
        uiLocation: "Show page Featured Logo drawer",
        routeReference: "/api/admin/trr-api/brands/logos/featured",
      },
      {
        label: "Featured Logo",
        triggerType: "drawer state action",
        uiLocation: "Show page Featured Logo drawer",
        routeReference: "/api/admin/trr-api/brands/logos/featured",
        notes: "This is the exact button label once the selected item is already the featured logo.",
      },
    ],
  },
  {
    id: "season-asset-batch-jobs",
    title: "Season Asset Batch Jobs",
    category: "Brand Assets & Logos",
    summary: "Open season asset batch jobs and run the season media batch workflow.",
    pageLabel: "Shows",
    pageHref: "/shows",
    pagePathPattern: "/shows/[showId]/seasons/[seasonNumber]",
    pageContainerBreadcrumb: ["Admin", "Shows", "Show Name", "Season #", "Assets"],
    currentRuntime: "Modal",
    targetRuntime: "Modal",
    runtimeNotes: "Season asset batch jobs are already streamed through the Modal-supported admin batch-jobs operation.",
    triggers: [
      {
        label: "Batch Jobs",
        triggerType: "open modal",
        uiLocation: "Season page assets toolbar",
        routeReference: "/shows/[showId]/seasons/[seasonNumber]#batch-jobs",
      },
      {
        label: "Run Batch Jobs",
        triggerType: "modal action",
        uiLocation: "Season Batch Jobs modal footer",
        routeReference: "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets/batch-jobs/stream",
      },
    ],
  },
  {
    id: "shared-social-ingest",
    title: "Shared Social Ingest",
    category: "Social Runs & Queue Operations",
    summary: "Kick off the Bravo-owned shared account ingest from the social admin landing page.",
    pageLabel: "Social Media",
    pageHref: "/social-media",
    pagePathPattern: "/social-media",
    pageContainerBreadcrumb: ["Admin", "Social Media", "Shared Ingest"],
    currentRuntime: "Modal",
    targetRuntime: "Modal",
    runtimeNotes:
      "Shared ingest now runs on the remote Modal executor plane, with Supabase retaining the shared ingest job and recovery state.",
    migrationStatus: "cutover-complete",
    triggers: [
      {
        label: "Run Shared Ingest",
        triggerType: "page action",
        uiLocation: "Social Media page > Shared Ingest section",
        routeReference: "/api/admin/trr-api/social/shared/ingest",
      },
    ],
  },
  {
    id: "season-social-runs",
    title: "Season Social Ingest Runs / Jobs",
    category: "Social Runs & Queue Operations",
    summary: "Start season-wide or week-specific social ingest jobs and refresh the ingest job status panel.",
    pageLabel: "Shows",
    pageHref: "/shows",
    pagePathPattern: "/shows/[showId]/seasons/[seasonNumber]/social",
    pageContainerBreadcrumb: ["Admin", "Shows", "Show Name", "Season #", "Social Media", "Official Analytics"],
    currentRuntime: "Modal",
    targetRuntime: "Modal",
    runtimeNotes:
      "Season social ingest and job refresh now run on the remote Modal executor plane, with Supabase retaining run and job state.",
    migrationStatus: "cutover-complete",
    triggers: [
      {
        label: "Run Season Sync (All)",
        triggerType: "panel action",
        uiLocation: "Season social analytics > Ingest + Export",
        routeReference: "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest",
      },
      {
        label: "Run Week",
        triggerType: "table action",
        uiLocation: "Season social analytics weekly grid",
        routeReference: "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest",
      },
      {
        label: "Refresh Jobs",
        triggerType: "panel action",
        uiLocation: "Season social analytics > Ingest Job Status",
        routeReference: "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/jobs",
      },
    ],
  },
  {
    id: "season-social-cancel-requeue",
    title: "Season Social Cancel / Mirror Requeue",
    category: "Social Runs & Queue Operations",
    summary: "Cancel active season ingest runs and requeue mirror coverage work from the season social pipeline.",
    pageLabel: "Shows",
    pageHref: "/shows",
    pagePathPattern: "/shows/[showId]/seasons/[seasonNumber]/social",
    pageContainerBreadcrumb: ["Admin", "Shows", "Show Name", "Season #", "Social Media", "Official Analytics"],
    currentRuntime: "Modal",
    targetRuntime: "Modal",
    runtimeNotes:
      "Cancel and mirror requeue now operate against the Modal-backed social pipeline while keeping the same admin APIs and recovery semantics.",
    migrationStatus: "cutover-complete",
    triggers: [
      {
        label: "Cancel Active Run",
        triggerType: "panel action",
        uiLocation: "Season social analytics > Ingest + Export",
        routeReference: "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/[runId]/cancel",
        notes: "The UI appends the active run id in parentheses.",
      },
      {
        label: "Mirror requeue",
        triggerType: "auto-followup",
        uiLocation: "Season social analytics ingest auto-recovery flow",
        routeReference: "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/mirror/requeue",
        notes: "Triggered programmatically when mirror coverage guardrails detect stale platforms.",
      },
    ],
  },
  {
    id: "week-sync-operations",
    title: "Week Sync / Refresh Operations",
    category: "Social Runs & Queue Operations",
    summary: "Cancel live week sync runs and refresh individual post/media state from the week detail view.",
    pageLabel: "Shows",
    pageHref: "/shows",
    pagePathPattern: "/shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]",
    pageContainerBreadcrumb: ["Admin", "Shows", "Show Name", "Season #", "Social Media", "Week #"],
    currentRuntime: "Modal",
    targetRuntime: "Modal",
    runtimeNotes:
      "Week sync now runs on the Modal-backed remote executor plane, while direct per-post refresh actions remain immediate from the admin UI.",
    migrationStatus: "cutover-complete",
    triggers: [
      {
        label: "Cancel Sync",
        triggerType: "panel action",
        uiLocation: "Week detail > Sync Progress card",
        routeReference: "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/runs/[runId]/cancel",
      },
      {
        label: "REFRESH",
        triggerType: "post action",
        uiLocation: "Week detail post/media controls",
        routeReference: "/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/posts/[platform]/[sourceId]",
      },
    ],
  },
] as const;

export const ADMIN_JOB_DOCS_BY_CATEGORY = ADMIN_JOB_DOC_CATEGORIES.map((category) => ({
  category,
  entries: ADMIN_JOB_DOCS.filter((entry) => entry.category === category),
}));

export function resolveAdminJobMigrationStatus(entry: AdminJobDocEntry): AdminJobMigrationStatus {
  if (entry.migrationStatus) {
    return entry.migrationStatus;
  }
  if (entry.currentRuntime === entry.targetRuntime) {
    return entry.currentRuntime === "Modal" ? "cutover-complete" : "stable";
  }
  return "planned";
}
