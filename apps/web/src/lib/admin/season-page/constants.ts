import type { SocialAnalyticsView } from "@/components/admin/season-social-analytics-section";
import { ASSET_SECTION_ORDER } from "@/lib/admin/asset-sectioning";
import type { AssetSectionKey } from "@/lib/admin/asset-sectioning";
import type { BatchJobOperation, SeasonTab, TabId } from "@/lib/admin/season-page/types";

export const SEASON_PAGE_TABS: ReadonlyArray<SeasonTab> = [
  { id: "overview", label: "Home", icon: "home" },
  { id: "episodes", label: "Episodes" },
  { id: "assets", label: "Assets" },
  { id: "news", label: "News" },
  { id: "fandom", label: "Fandom" },
  { id: "cast", label: "Cast" },
  { id: "surveys", label: "Surveys" },
  { id: "social", label: "Social Media" },
];

export const isSeasonTabId = (value: string | null | undefined): value is TabId =>
  Boolean(value && SEASON_PAGE_TABS.some((tab) => tab.id === value));

export const SEASON_REFRESH_STAGE_LABELS: Record<string, string> = {
  starting: "Initializing",
  sync_show_images: "Show Media",
  sync_imdb_mediaindex: "Show Media",
  sync_tmdb_seasons: "Season Media",
  sync_tmdb_episodes: "Episode Media",
  mirror_show_images: "Show Media Mirroring",
  mirror_season_images: "Season Media Mirroring",
  mirror_episode_images: "Episode Media Mirroring",
  sync_cast_photos: "Cast Media",
  sync_imdb: "Cast Media (IMDb)",
  sync_tmdb: "Cast Media (TMDb)",
  sync_fandom: "Cast Media (Fandom)",
  mirror_cast_photos: "Cast Media Mirroring",
  auto_count: "Auto Count",
  word_id: "Word Detection",
  prune: "Cleanup",
  mirroring: "S3 Mirroring",
  mirror: "S3 Mirroring",
  cast_credits_show_cast: "Cast Credits",
  cast_credits_episode_appearances: "Episode Credits",
};

export const SEASON_STREAM_IDLE_TIMEOUT_MS = 600_000;
export const SEASON_STREAM_MAX_DURATION_MS = 12 * 60 * 1000;
export const SEASON_REFRESH_FALLBACK_TIMEOUT_MS = 5 * 60 * 1000;
export const SEASON_ASSET_LOAD_TIMEOUT_MS = 60_000;
export const SEASON_ASSET_PAGE_SIZE = 500;
export const SEASON_ASSET_MAX_PAGES = 30;
export const SEASON_CAST_LOAD_TIMEOUT_MS = 60_000;
export const SEASON_PERSON_STREAM_IDLE_TIMEOUT_MS = 600_000;
export const SEASON_PERSON_STREAM_MAX_DURATION_MS = 6 * 60 * 1000;
export const SEASON_ASSET_PIPELINE_STEP_TIMEOUT_MS = 8 * 60 * 1000;
export const SEASON_CAST_ROLE_MEMBERS_LOAD_TIMEOUT_MS = 120_000;
export const SEASON_CAST_ROLE_MEMBERS_MAX_ATTEMPTS = 2;
export const SEASON_CAST_PROFILE_SYNC_CONCURRENCY = 3;
export const SEASON_CAST_INCREMENTAL_INITIAL_LIMIT = 48;
export const SEASON_CAST_INCREMENTAL_BATCH_SIZE = 48;
export const SEASON_BRAVO_VIDEO_THUMBNAIL_SYNC_TIMEOUT_MS = 90_000;
export const MAX_SEASON_REFRESH_LOG_ENTRIES = 180;

export const SEASON_SOCIAL_ANALYTICS_VIEWS: Array<{ id: SocialAnalyticsView; label: string }> = [
  { id: "bravo", label: "OFFICIAL ANALYTICS" },
  { id: "sentiment", label: "SENTIMENT ANALYSIS" },
  { id: "hashtags", label: "HASHTAGS ANALYSIS" },
  { id: "advanced", label: "ADVANCED ANALYTICS" },
  { id: "reddit", label: "REDDIT ANALYTICS" },
];

export const isSocialAnalyticsView = (
  value: string | null | undefined
): value is SocialAnalyticsView => {
  if (!value) return false;
  return SEASON_SOCIAL_ANALYTICS_VIEWS.some((item) => item.id === value);
};

export const BATCH_JOB_OPERATION_LABELS: Record<BatchJobOperation, string> = {
  count: "Count",
  crop: "Crop",
  id_text: "ID Text",
  resize: "Auto-Crop",
};

export const DEFAULT_BATCH_JOB_OPERATIONS: BatchJobOperation[] = ["count"];
export const DEFAULT_BATCH_JOB_CONTENT_SECTIONS: AssetSectionKey[] = ASSET_SECTION_ORDER.filter(
  (section) => section !== "other"
);

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const looksLikeUuid = (value: string): boolean => UUID_RE.test(value);
