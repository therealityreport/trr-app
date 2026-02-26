import type {
  RefreshLogTopicDefinition,
} from "@/lib/admin/refresh-log-pipeline";
import type { CastRefreshPhaseId } from "@/lib/admin/cast-refresh-orchestration";
import type { AssetSectionKey } from "@/lib/admin/asset-sectioning";
import type { PlatformTab, SocialAnalyticsView } from "@/components/admin/season-social-analytics-section";
import type {
  BatchJobOperation,
  PersonLinkSourceKey,
  RefreshProgressState,
  ShowGalleryVisibleBySection,
  ShowRefreshTarget,
  ShowTab,
} from "@/lib/admin/show-page/types";

export const REFRESH_LOG_TOPIC_DEFINITIONS: RefreshLogTopicDefinition[] = [
  { key: "shows", label: "SHOWS", description: "Show info, entities, providers" },
  { key: "seasons", label: "SEASONS", description: "Season-level sync progress" },
  { key: "episodes", label: "EPISODES", description: "Episode-level sync and credits" },
  { key: "people", label: "PEOPLE", description: "Cast/member profile and person jobs" },
  { key: "media", label: "MEDIA", description: "Images, mirroring, auto-count, cleanup" },
  { key: "bravotv", label: "BRAVOTV", description: "Bravo preview/commit actions" },
];

export const SHOW_PAGE_TABS: ShowTab[] = [
  { id: "details", label: "Overview" },
  { id: "seasons", label: "Seasons" },
  { id: "assets", label: "Assets" },
  { id: "news", label: "News" },
  { id: "cast", label: "Cast" },
  { id: "surveys", label: "Surveys" },
  { id: "social", label: "Social" },
  { id: "settings", label: "Settings" },
];

export const SHOW_SOCIAL_ANALYTICS_VIEWS: Array<{ id: SocialAnalyticsView; label: string }> = [
  { id: "bravo", label: "BRAVO ANALYTICS" },
  { id: "sentiment", label: "SENTIMENT ANALYSIS" },
  { id: "hashtags", label: "HASHTAGS ANALYSIS" },
  { id: "advanced", label: "ADVANCED ANALYTICS" },
  { id: "reddit", label: "REDDIT ANALYTICS" },
];

export const SHOW_SOCIAL_PLATFORM_TABS: Array<{ key: PlatformTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "twitter", label: "Twitter/X" },
  { key: "youtube", label: "YouTube" },
];

export const isSocialAnalyticsView = (
  value: string | null | undefined
): value is SocialAnalyticsView => {
  if (!value) return false;
  return SHOW_SOCIAL_ANALYTICS_VIEWS.some((item) => item.id === value);
};

export const isSocialPlatformTab = (value: string | null | undefined): value is PlatformTab => {
  if (!value) return false;
  return SHOW_SOCIAL_PLATFORM_TABS.some((item) => item.key === value);
};

export const BATCH_JOB_OPERATION_LABELS: Record<BatchJobOperation, string> = {
  count: "Count",
  crop: "Crop",
  id_text: "ID Text",
  resize: "Auto-Crop",
};

export const DEFAULT_BATCH_JOB_OPERATIONS: BatchJobOperation[] = ["count"];
export const SHOW_GALLERY_ALLOWED_SECTIONS: AssetSectionKey[] = [
  "cast_photos",
  "profile_pictures",
  "banners",
  "posters",
  "backdrops",
];
export const SHOW_GALLERY_SECTION_INITIAL_VISIBLE = 60;
export const SHOW_GALLERY_SECTION_INCREMENT_VISIBLE = 60;
export const DEFAULT_SHOW_GALLERY_SELECTED_SECTIONS: AssetSectionKey[] = [
  ...SHOW_GALLERY_ALLOWED_SECTIONS,
];
export const DEFAULT_BATCH_JOB_CONTENT_SECTIONS: AssetSectionKey[] = [
  "cast_photos",
  "profile_pictures",
  "posters",
  "backdrops",
];

export const buildShowGalleryVisibleDefaults = (): ShowGalleryVisibleBySection => ({
  backdrops: SHOW_GALLERY_SECTION_INITIAL_VISIBLE,
  banners: SHOW_GALLERY_SECTION_INITIAL_VISIBLE,
  posters: SHOW_GALLERY_SECTION_INITIAL_VISIBLE,
  profile_pictures: SHOW_GALLERY_SECTION_INITIAL_VISIBLE,
  cast_photos: SHOW_GALLERY_SECTION_INITIAL_VISIBLE,
});

export const ENTITY_LINK_GROUP_LABELS = {
  official: "Official",
  social: "Social",
  knowledge: "Knowledge",
  cast_announcements: "Cast Announcements",
  other: "Other",
} as const;

export const PERSON_LINK_SOURCE_DEFINITIONS: Array<{ key: PersonLinkSourceKey; label: string }> = [
  { key: "bravo", label: "Bravo" },
  { key: "imdb", label: "IMDb" },
  { key: "tmdb", label: "TMDb" },
  { key: "knowledge", label: "Knowledge Graph" },
  { key: "fandom", label: "Fandom/Wikia" },
];

export const SHOW_REFRESH_TARGET_LABELS: Record<ShowRefreshTarget, string> = {
  details: "Show Info",
  seasons_episodes: "Seasons & Episodes",
  photos: "Show/Season/Episode Media",
  cast_credits: "Cast & Credits",
};

export const SHOW_REFRESH_STAGE_LABELS: Record<string, string> = {
  starting: "Initializing",
  details_sync_shows: "Show Info",
  details_tmdb_show_entities: "Show Entities",
  details_tmdb_watch_providers: "Watch Providers",
  seasons_episodes_seasons: "Seasons",
  seasons_episodes_episodes: "Episodes",
  photos_show_images: "Show Media",
  photos_season_episode_images: "Season/Episode Media",
  cast_credits_show_cast: "Cast Credits",
  cast_credits_episode_appearances: "Episode Credits",
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
};

export const PERSON_REFRESH_STAGE_LABELS: Record<string, string> = {
  starting: "Initializing",
  tmdb_profile: "TMDb Profile",
  fandom_profile: "Fandom Profile",
  sync_imdb: "Cast Media (IMDb)",
  sync_tmdb: "Cast Media (TMDb)",
  sync_fandom: "Cast Media (Fandom)",
  fetching: "Fetching",
  upserting: "Upserting",
  mirroring: "S3 Mirroring",
  pruning: "Cleanup",
  auto_count: "Auto Count",
  word_id: "Word Detection",
  centering_cropping: "Centering/Cropping",
  resizing: "Resizing",
};

export const SHOW_REFRESH_STREAM_IDLE_TIMEOUT_MS = 600_000;
export const SHOW_REFRESH_STREAM_MAX_DURATION_MS = 12 * 60 * 1000;
export const SHOW_REFRESH_FALLBACK_TIMEOUT_MS = 5 * 60 * 1000;
export const PERSON_REFRESH_STREAM_TIMEOUT_MS = 4 * 60 * 1000;
export const PERSON_REFRESH_STREAM_IDLE_TIMEOUT_MS = 600_000;
export const PERSON_REFRESH_FALLBACK_TIMEOUT_MS = 8 * 60 * 1000;
export const GALLERY_ASSET_LOAD_TIMEOUT_MS = 60_000;
export const GALLERY_ASSET_PAGE_SIZE = 500;
export const GALLERY_ASSET_MAX_PAGES = 30;
export const ASSET_PIPELINE_STEP_TIMEOUT_MS = 8 * 60 * 1000;
export const CAST_PROFILE_SYNC_CONCURRENCY = 3;
export const CAST_INCREMENTAL_INITIAL_LIMIT = 48;
export const CAST_INCREMENTAL_BATCH_SIZE = 48;
export const BRAVO_LOAD_TIMEOUT_MS = 15_000;
export const BRAVO_VIDEO_THUMBNAIL_SYNC_TIMEOUT_MS = 90_000;
export const BRAVO_IMPORT_MUTATION_TIMEOUT_MS = 120_000;
export const NEWS_LOAD_TIMEOUT_MS = 45_000;
export const NEWS_SYNC_TIMEOUT_MS = 60_000;
export const NEWS_SYNC_POLL_INTERVAL_MS = 1_500;
export const NEWS_SYNC_POLL_TIMEOUT_MS = 90_000;
export const NEWS_PAGE_SIZE = 50;
export const SHOW_CORE_LOAD_TIMEOUT_MS = 15_000;
export const SHOW_CAST_LOAD_TIMEOUT_MS = 20_000;
export const ROLE_LOAD_TIMEOUT_MS = 30_000;
export const ROLE_LOAD_MAX_ATTEMPTS = 2;
export const CAST_ROLE_MEMBERS_LOAD_TIMEOUT_MS = 125_000;
export const SEASON_EPISODE_SUMMARY_TIMEOUT_MS = 12_000;
export const SEASON_EPISODE_SUMMARY_CONCURRENCY = 4;
export const SETTINGS_MUTATION_TIMEOUT_MS = 30_000;
export const CAST_MATRIX_SYNC_TIMEOUT_MS = 90_000;
export const COVERAGE_MUTATION_TIMEOUT_MS = 20_000;

export const EMPTY_REFRESH_PROGRESS_STATE: RefreshProgressState = {
  stage: null,
  message: null,
  current: null,
  total: null,
};

export const CAST_REFRESH_PHASE_TIMEOUTS: Record<CastRefreshPhaseId, number> = {
  credits_sync: 6 * 60 * 1000,
  profile_links_sync: 4 * 60 * 1000,
  bio_sync: 4 * 60 * 1000,
  network_augmentation: 5 * 60 * 1000,
  media_ingest: 20 * 60 * 1000,
};

export const CAST_REFRESH_PHASE_BUTTON_LABELS: Record<CastRefreshPhaseId, string> = {
  credits_sync: "Syncing Credits...",
  profile_links_sync: "Syncing Links...",
  bio_sync: "Syncing Bios...",
  network_augmentation: "Syncing Bravo...",
  media_ingest: "Ingesting Media...",
};

export const CAST_REFRESH_PHASE_STAGES: Record<CastRefreshPhaseId, string> = {
  credits_sync: "Credits",
  profile_links_sync: "Profile Links",
  bio_sync: "Bios",
  network_augmentation: "Network/Bravo",
  media_ingest: "Media",
};

export const CAST_REFRESH_PHASE_ORDER: CastRefreshPhaseId[] = [
  "credits_sync",
  "profile_links_sync",
  "bio_sync",
  "network_augmentation",
  "media_ingest",
];

export const SEASON_PAGE_TABS = [
  { tab: "overview", label: "Overview" },
  { tab: "episodes", label: "Seasons & Episodes" },
  { tab: "assets", label: "Assets" },
  { tab: "videos", label: "Videos" },
  { tab: "fandom", label: "Fandom" },
  { tab: "cast", label: "Cast" },
  { tab: "surveys", label: "Surveys" },
  { tab: "social", label: "Social Media" },
] as const;

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const looksLikeUuid = (value: string): boolean => UUID_RE.test(value);
