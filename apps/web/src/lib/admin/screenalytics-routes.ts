export const SCREENALYTICS_ADMIN_ORIGIN = "https://admin.trr.localhost";
export const SCREENALYTICS_CANONICAL_PATH = "/screenalytics";
export const SCREENALYTICS_INTERNAL_CAST_SCREENTIME_PATH = "/admin/cast-screentime";
export const SCREENALYTICS_RHOBH_S5_E16_TEST_PATH =
  "/screenalytics/rhobh/s5/e16/extras/screenalytics-test";
export const SCREENALYTICS_RHOBH_S5_E16_TEST_SEASON_ID =
  "98ac397a-3928-4583-92bc-25ea84c42d89";

export const SCREENALYTICS_RHOBH_S5_E16_TEST_DEFAULTS = {
  owner_scope: "episode",
  owner_id: "4eb4ceb4-c13d-4c29-bd0f-8bcde94b6591",
  show_id: "909ddc36-ca4d-4b09-8aa5-dd5dd34f987e",
  media_type: "extras",
  media_kind: "screenalytics_test",
  prefill_context: "screenalytics_test_extra",
} as const;

export const SCREENALYTICS_LEGACY_QUERY_KEYS = [
  "run",
  "run_id",
  "owner_scope",
  "owner_id",
  "show_id",
  "media_type",
  "video_class",
  "media_kind",
  "promo_subtype",
  "prefill_context",
] as const;

export function buildScreenalyticsRunPath(runId: string): string {
  return `${SCREENALYTICS_CANONICAL_PATH}/runs/${encodeURIComponent(runId)}`;
}

export function buildScreenalyticsRunUrl(runId: string): string {
  return new URL(buildScreenalyticsRunPath(runId), SCREENALYTICS_ADMIN_ORIGIN).toString();
}

export function isScreenalyticsRhobhS5E16TestPath(pathname: string | null): boolean {
  return (pathname || "").toLowerCase() === SCREENALYTICS_RHOBH_S5_E16_TEST_PATH;
}

export function appendScreenalyticsRhobhS5E16TestDefaults(searchParams?: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(searchParams?.toString() ?? "");
  Object.entries(SCREENALYTICS_RHOBH_S5_E16_TEST_DEFAULTS).forEach(([key, value]) => {
    params.set(key, value);
  });
  return params;
}

export function removeScreenalyticsLegacySearchParams(searchParams?: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(searchParams?.toString() ?? "");
  SCREENALYTICS_LEGACY_QUERY_KEYS.forEach((key) => params.delete(key));
  return params;
}

export function hasScreenalyticsRhobhS5E16TestSearch(searchParams?: URLSearchParams): boolean {
  if (!searchParams) return false;
  const ownerScope = searchParams.get("owner_scope");
  const ownerId = searchParams.get("owner_id");
  const ownsTestExtra =
    (ownerScope === SCREENALYTICS_RHOBH_S5_E16_TEST_DEFAULTS.owner_scope &&
      ownerId === SCREENALYTICS_RHOBH_S5_E16_TEST_DEFAULTS.owner_id) ||
    (ownerScope === "season" && ownerId === SCREENALYTICS_RHOBH_S5_E16_TEST_SEASON_ID);

  return (
    ownsTestExtra &&
    searchParams.get("show_id") === SCREENALYTICS_RHOBH_S5_E16_TEST_DEFAULTS.show_id &&
    (searchParams.get("media_type") === SCREENALYTICS_RHOBH_S5_E16_TEST_DEFAULTS.media_type ||
      searchParams.get("video_class") === SCREENALYTICS_RHOBH_S5_E16_TEST_DEFAULTS.media_type) &&
    (searchParams.get("media_kind") === SCREENALYTICS_RHOBH_S5_E16_TEST_DEFAULTS.media_kind ||
      searchParams.get("promo_subtype") === SCREENALYTICS_RHOBH_S5_E16_TEST_DEFAULTS.media_kind)
  );
}
