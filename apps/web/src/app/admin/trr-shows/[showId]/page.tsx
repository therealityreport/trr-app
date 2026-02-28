"use client";

import { useDeferredValue, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import type { Route } from "next";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import AdminModal from "@/components/admin/AdminModal";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import SocialPostsSection from "@/components/admin/social-posts-section";
import SeasonSocialAnalyticsSection, {
  type PlatformTab,
  type SocialAnalyticsView,
} from "@/components/admin/season-social-analytics-section";
import ShowBrandEditor from "@/components/admin/ShowBrandEditor";
import ShowSurveysTab from "@/components/admin/show-tabs/ShowSurveysTab";
import ShowOverviewTab from "@/components/admin/show-tabs/ShowOverviewTab";
import {
  CastMatrixSyncPanel,
  type CastMatrixSyncResult,
} from "@/components/admin/CastMatrixSyncPanel";
import { ExternalLinks, TmdbLinkIcon, ImdbLinkIcon } from "@/components/admin/ExternalLinks";
import { ImageLightbox } from "@/components/admin/ImageLightbox";
import { GalleryAssetEditTools } from "@/components/admin/GalleryAssetEditTools";
import { ImageScrapeDrawer, type EntityContext } from "@/components/admin/ImageScrapeDrawer";
import { AdvancedFilterDrawer } from "@/components/admin/AdvancedFilterDrawer";
import { ShowTabsNav } from "@/components/admin/show-tabs/ShowTabsNav";
import { ShowAssetsImageSections } from "@/components/admin/show-tabs/ShowAssetsImageSections";
import {
  ShowBrandLogosSection,
  type ShowLogoVariant,
} from "@/components/admin/show-tabs/ShowBrandLogosSection";
import { ShowFeaturedMediaSelectors } from "@/components/admin/show-tabs/ShowFeaturedMediaSelectors";
import { resolveGalleryAssetCapabilities } from "@/lib/admin/gallery-asset-capabilities";
import { shouldIncludeCastMemberForSeasonFilter } from "@/lib/admin/cast-role-filtering";
import {
  canonicalizeCastRoleName,
  castRoleMatchesFilter,
  normalizeCastRoleList,
} from "@/lib/admin/cast-role-normalization";
import {
  resolveShowCastEpisodeCount,
  showCastEpisodeScopeHint,
} from "@/lib/admin/cast-episode-scope";
import {
  formatCastBatchCounts,
  formatCastBatchMemberMessage,
  formatCastBatchRunningMessage,
} from "@/lib/admin/cast-batch-progress";
import { mapSeasonAssetToMetadata } from "@/lib/photo-metadata";
import {
  clearAdvancedFilters,
  countActiveAdvancedFilters,
  readAdvancedFilters,
  writeAdvancedFilters,
  type AdvancedFilterState,
} from "@/lib/admin/advanced-filters";
import {
  buildPersonAdminUrl,
  buildPersonRouteSlug,
  buildSeasonAdminUrl,
  buildShowAdminUrl,
  cleanLegacyRoutingQuery,
  parseSocialAnalyticsViewFromPath,
  parseShowSocialPathFilters,
  parseShowRouteState,
} from "@/lib/admin/show-admin-routes";
import { recordAdminRecentShow } from "@/lib/admin/admin-recent-shows";
import { resolvePreferredShowRouteSlug } from "@/lib/admin/show-route-slug";
import {
  resolveFeaturedLogoPayload,
  resolveFeaturedShowLogoAssetId,
} from "@/lib/admin/show-logo-featured";
import {
  parseShowCastRouteState,
  writeShowCastRouteState,
} from "@/lib/admin/cast-route-state";
import { buildSeasonSocialBreadcrumb, buildShowBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import {
  buildPipelineRows,
  isRefreshLogTerminalSuccess,
  resolveRefreshLogTopicKey,
  shouldDedupeRefreshLogEntry,
  type RefreshLogTopicDefinition,
  type RefreshLogTopicKey,
} from "@/lib/admin/refresh-log-pipeline";
import {
  inferHasTextOverlay,
} from "@/lib/gallery-filter-utils";
import { applyAdvancedFiltersToSeasonAssets } from "@/lib/gallery-advanced-filtering";
import {
  contentTypeToAssetKind,
  contentTypeToContextType,
  normalizeContentTypeToken,
} from "@/lib/media/content-type";
import {
  THUMBNAIL_DEFAULTS,
  isThumbnailCropMode,
  parseThumbnailCrop,
  resolveThumbnailPresentation,
} from "@/lib/thumbnail-crop";
import {
  ASSET_SECTION_LABELS,
  ASSET_SECTION_TO_BATCH_CONTENT_TYPE,
  classifySeasonAssetSection,
  groupSeasonAssetsBySection,
  type AssetSectionKey,
} from "@/lib/admin/asset-sectioning";
import {
  firstImageUrlCandidate,
  getSeasonAssetCardUrlCandidates,
  getSeasonAssetDetailUrlCandidates,
} from "@/lib/admin/image-url-candidates";
import {
  appendLiveCountsToMessage,
  formatJobLiveCounts,
  resolveJobLiveCounts,
  type JobLiveCounts,
} from "@/lib/admin/job-live-counts";
import {
  type CastRefreshPhaseDefinition,
  type CastRefreshPhaseId,
  type CastRefreshPhaseState,
  runCastEnrichMediaWorkflow,
  runPhasedCastRefresh,
} from "@/lib/admin/cast-refresh-orchestration";
import { getClientAuthHeaders } from "@/lib/admin/client-auth";
import {
  AdminRequestError,
  adminStream,
  adminGetJson,
  adminMutation,
  fetchWithTimeout,
} from "@/lib/admin/admin-fetch";
import { useShowCore } from "@/lib/admin/show-page/use-show-core";
import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";

// Types
interface TrrShow {
  id: string;
  name: string;
  slug: string;
  canonical_slug: string;
  alternative_names: string[];
  imdb_id: string | null;
  tmdb_id: number | null;
  external_ids?: Record<string, unknown> | null;
  show_total_seasons: number | null;
  show_total_episodes: number | null;
  description: string | null;
  premiere_date: string | null;
  networks: string[];
  genres: string[];
  tags: string[];
  tmdb_status: string | null;
  tmdb_vote_average: number | null;
  imdb_rating_value: number | null;
  primary_poster_image_id?: string | null;
  primary_backdrop_image_id?: string | null;
  primary_logo_image_id?: string | null;
  logo_url?: string | null;
  streaming_providers?: string[] | null;
  watch_providers?: string[] | null;
}

interface TrrSeason {
  id: string;
  show_id: string;
  season_number: number;
  name: string | null;
  title: string | null;
  overview: string | null;
  air_date: string | null;
  url_original_poster: string | null;
  tmdb_season_id: number | null;
}


interface TrrCastMember {
  id: string;
  person_id: string;
  full_name: string | null;
  cast_member_name: string | null;
  role: string | null;
  billing_order: number | null;
  credit_category: string;
  photo_url: string | null;
  cover_photo_url: string | null;
  thumbnail_focus_x?: number | null;
  thumbnail_focus_y?: number | null;
  thumbnail_zoom?: number | null;
  thumbnail_crop_mode?: "manual" | "auto" | null;
  total_episodes?: number | null;
  archive_episode_count?: number | null;
  latest_season?: number | null;
  seasons_appeared?: number[] | null;
}

type EntityLinkType = "show" | "season" | "person";
type EntityLinkGroup = "official" | "social" | "knowledge" | "cast_announcements" | "other";
type EntityLinkStatus = "pending" | "approved" | "rejected";

interface EntityLink {
  id: string;
  show_id: string;
  entity_type: EntityLinkType;
  entity_id: string;
  season_number: number;
  link_group: EntityLinkGroup;
  link_kind: string;
  label: string | null;
  url: string;
  status: EntityLinkStatus;
  confidence: number | null;
  source: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ShowRole {
  id: string;
  show_id: string;
  name: string;
  normalized_name: string;
  sort_order: number;
  is_active: boolean;
}

interface CastRoleMember {
  person_id: string;
  person_name: string | null;
  total_episodes: number | null;
  seasons_appeared: number | null;
  latest_season: number | null;
  roles: string[];
  photo_url: string | null;
}

interface BravoPersonTag {
  person_id?: string | null;
  person_name?: string | null;
  person_url?: string | null;
}

interface BravoVideoItem {
  title?: string | null;
  runtime?: string | null;
  kicker?: string | null;
  image_url?: string | null;
  hosted_image_url?: string | null;
  original_image_url?: string | null;
  media_asset_id?: string | null;
  thumbnail_sync_status?: string | null;
  thumbnail_sync_error?: string | null;
  clip_url: string;
  season_number?: number | null;
  published_at?: string | null;
  person_tags?: BravoPersonTag[];
}

interface BravoNewsItem {
  headline?: string | null;
  image_url?: string | null;
  article_url: string;
  published_at?: string | null;
  person_tags?: BravoPersonTag[];
}

interface UnifiedNewsSeasonMatch {
  season_number?: number | null;
  match_types?: string[] | null;
}

interface UnifiedNewsItem {
  source_id?: string | null;
  headline?: string | null;
  article_url: string;
  canonical_article_url?: string | null;
  image_url?: string | null;
  hosted_image_url?: string | null;
  original_image_url?: string | null;
  mirror_status?: string | null;
  mirror_attempt_count?: number | null;
  last_mirror_attempt_at?: string | null;
  last_mirror_success_at?: string | null;
  last_mirror_error?: string | null;
  mirror_retry_after?: string | null;
  published_at?: string | null;
  publisher_name?: string | null;
  publisher_domain?: string | null;
  person_tags?: BravoPersonTag[];
  topic_tags?: string[] | null;
  season_matches?: UnifiedNewsSeasonMatch[] | null;
  feed_rank?: number | null;
  trending_rank?: number | null;
  quality_score?: number | null;
}

interface UnifiedNewsFacetSource {
  token: string;
  label: string;
  count: number;
}

interface UnifiedNewsFacetPerson {
  person_id: string;
  person_name: string;
  count: number;
}

interface UnifiedNewsFacetTopic {
  topic: string;
  count: number;
}

interface UnifiedNewsFacetSeason {
  season_number: number;
  count: number;
}

interface UnifiedNewsFacets {
  sources: UnifiedNewsFacetSource[];
  people: UnifiedNewsFacetPerson[];
  topics: UnifiedNewsFacetTopic[];
  seasons: UnifiedNewsFacetSeason[];
}

interface BravoPreviewPerson {
  name?: string | null;
  canonical_url?: string | null;
  bio?: string | null;
  hero_image_url?: string | null;
  social_links?: Record<string, string> | null;
}

interface BravoPersonCandidateResult {
  url: string;
  source?: "bravo" | "fandom";
  name?: string | null;
  status?: "pending" | "in_progress" | "ok" | "missing" | "error" | string;
  error?: string | null;
  person?: BravoPreviewPerson | null;
}

type BravoCandidateSummary = {
  tested: number;
  valid: number;
  missing: number;
  errors: number;
};

type BravoImportImageKind =
  | "poster"
  | "backdrop"
  | "logo"
  | "episode_still"
  | "cast"
  | "promo"
  | "intro"
  | "reunion"
  | "other";
type SyncBravoRunMode = "full" | "cast-only";

type TabId = "seasons" | "assets" | "news" | "cast" | "surveys" | "social" | "details" | "settings";
type ShowCastSource = "episode_evidence" | "show_fallback" | "imdb_show_membership";
type ShowCastRosterMode = "episode_evidence" | "imdb_show_membership";
type CastPhotoFallbackMode = "none" | "bravo";
type ShowRefreshTarget = "details" | "seasons_episodes" | "photos" | "cast_credits";
type ShowTab = { id: TabId; label: string; icon?: "home" };
type RefreshProgressState = {
  stage?: string | null;
  message?: string | null;
  current: number | null;
  total: number | null;
};

type RefreshLogEntry = {
  id: string;
  at: string;
  category: string;
  message: string;
  current: number | null;
  total: number | null;
  stageKey?: string | null;
  topic?: RefreshLogTopicKey | null;
  provider?: string | null;
};

type LinkEditDraft = {
  linkId: string;
  label: string;
  url: string;
};

type RoleRenameDraft = {
  roleId: string;
  originalName: string;
  nextName: string;
};

type CastRoleEditDraft = {
  personId: string;
  personName: string;
  roleCsv: string;
};

type CastRunFailedMember = {
  personId: string;
  name: string;
  reason: string;
};

type ShowRefreshRunOptions = {
  photoMode?: "fast" | "full";
  includeCastProfiles?: boolean;
  suppressSuccessNotice?: boolean;
};
type PersonRefreshMode = "full" | "ingest_only" | "profile_only";

type HealthStatus = "ready" | "missing" | "stale";
type PersonLinkSourceKey = "bravo" | "imdb" | "tmdb" | "knowledge" | "fandom";
type PersonLinkSourceState = "found" | "missing" | "pending" | "rejected";

type PersonLinkSourceSummary = {
  key: PersonLinkSourceKey;
  label: string;
  state: PersonLinkSourceState;
  url: string | null;
  link: EntityLink | null;
};

type PersonLinkCoverageCard = {
  personId: string;
  personName: string;
  seasons: number[];
  sources: PersonLinkSourceSummary[];
};

type ShowGalleryVisibleBySection = Partial<Record<AssetSectionKey, number>>;

const TabLoadingFallback = ({ label }: { label: string }) => (
  <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{label}</p>
    <p className="mt-2 text-sm text-zinc-500">Loading tab...</p>
  </div>
);

const ShowSeasonsTab = dynamic(() => import("@/components/admin/show-tabs/ShowSeasonsTab"), {
  loading: () => <TabLoadingFallback label="Seasons" />,
});
const ShowAssetsTab = dynamic(() => import("@/components/admin/show-tabs/ShowAssetsTab"), {
  loading: () => <TabLoadingFallback label="Assets" />,
});
const ShowNewsTab = dynamic(() => import("@/components/admin/show-tabs/ShowNewsTab"), {
  loading: () => <TabLoadingFallback label="News" />,
});
const ShowCastTab = dynamic(() => import("@/components/admin/show-tabs/ShowCastTab"), {
  loading: () => <TabLoadingFallback label="Cast" />,
});
const ShowSocialTab = dynamic(() => import("@/components/admin/show-tabs/ShowSocialTab"), {
  loading: () => <TabLoadingFallback label="Social" />,
});
const ShowSettingsTab = dynamic(() => import("@/components/admin/show-tabs/ShowSettingsTab"), {
  loading: () => <TabLoadingFallback label="Settings" />,
});

const REFRESH_LOG_TOPIC_DEFINITIONS: RefreshLogTopicDefinition[] = [
  { key: "shows", label: "SHOWS", description: "Show info, entities, providers" },
  { key: "seasons", label: "SEASONS", description: "Season-level sync progress" },
  { key: "episodes", label: "EPISODES", description: "Episode-level sync and credits" },
  { key: "people", label: "PEOPLE", description: "Cast/member profile and person jobs" },
  { key: "media", label: "MEDIA", description: "Images, mirroring, auto-count, cleanup" },
  { key: "bravotv", label: "BRAVOTV", description: "Bravo preview/commit actions" },
];

const SHOW_PAGE_TABS: ShowTab[] = [
  { id: "details", label: "Home", icon: "home" },
  { id: "seasons", label: "Seasons" },
  { id: "assets", label: "Assets" },
  { id: "news", label: "News" },
  { id: "cast", label: "Cast" },
  { id: "surveys", label: "Surveys" },
  { id: "social", label: "Social" },
  { id: "settings", label: "Settings" },
];

const SHOW_SOCIAL_ANALYTICS_VIEWS: Array<{ id: SocialAnalyticsView; label: string }> = [
  { id: "bravo", label: "OFFICIAL ANALYTICS" },
  { id: "sentiment", label: "SENTIMENT ANALYSIS" },
  { id: "hashtags", label: "HASHTAGS ANALYSIS" },
  { id: "advanced", label: "ADVANCED ANALYTICS" },
  { id: "reddit", label: "REDDIT ANALYTICS" },
];

const SHOW_SOCIAL_PLATFORM_TABS: Array<{ key: PlatformTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "twitter", label: "Twitter/X" },
  { key: "youtube", label: "YouTube" },
];

const isSocialAnalyticsView = (value: string | null | undefined): value is SocialAnalyticsView => {
  if (!value) return false;
  return SHOW_SOCIAL_ANALYTICS_VIEWS.some((item) => item.id === value);
};

const normalizeSocialAnalyticsViewInput = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "official") return "bravo";
  return normalized;
};

const formatSocialAnalyticsViewLabel = (view: SocialAnalyticsView): string => {
  if (view === "bravo") return "Official";
  return `${view.charAt(0).toUpperCase()}${view.slice(1)}`;
};

const isSocialPlatformTab = (value: string | null | undefined): value is PlatformTab => {
  if (!value) return false;
  return SHOW_SOCIAL_PLATFORM_TABS.some((item) => item.key === value);
};

const BATCH_JOB_OPERATION_LABELS = {
  count: "Count",
  crop: "Crop",
  id_text: "ID Text",
  resize: "Auto-Crop",
} as const;

type BatchJobOperation = keyof typeof BATCH_JOB_OPERATION_LABELS;

const DEFAULT_BATCH_JOB_OPERATIONS: BatchJobOperation[] = ["count"];
const SHOW_GALLERY_ALLOWED_SECTIONS: AssetSectionKey[] = [
  "cast_photos",
  "profile_pictures",
  "banners",
  "posters",
  "backdrops",
];
const SHOW_GALLERY_SECTION_INITIAL_VISIBLE = 60;
const SHOW_GALLERY_SECTION_INCREMENT_VISIBLE = 60;
const DEFAULT_SHOW_GALLERY_SELECTED_SECTIONS: AssetSectionKey[] = [...SHOW_GALLERY_ALLOWED_SECTIONS];
const DEFAULT_BATCH_JOB_CONTENT_SECTIONS: AssetSectionKey[] = [
  ...DEFAULT_SHOW_GALLERY_SELECTED_SECTIONS,
];
const buildShowGalleryVisibleDefaults = (): ShowGalleryVisibleBySection => ({
  backdrops: SHOW_GALLERY_SECTION_INITIAL_VISIBLE,
  posters: SHOW_GALLERY_SECTION_INITIAL_VISIBLE,
  banners: SHOW_GALLERY_SECTION_INITIAL_VISIBLE,
  profile_pictures: SHOW_GALLERY_SECTION_INITIAL_VISIBLE,
  cast_photos: SHOW_GALLERY_SECTION_INITIAL_VISIBLE,
});

const SHOW_ASSET_SUB_TABS: Array<{ id: "images" | "videos" | "branding"; label: string }> = [
  { id: "images", label: "Images" },
  { id: "videos", label: "Videos" },
  { id: "branding", label: "Branding" },
];

const TRUSTED_SHOW_LOGO_SOURCE_HOSTS = new Set([
  "upload.wikimedia.org",
  "wikipedia.org",
  "en.wikipedia.org",
  "imdb.com",
  "www.imdb.com",
  "m.media-amazon.com",
  "media-amazon.com",
  "image.tmdb.org",
]);

const TRUSTED_SHOW_LOGO_SOURCES = new Set(["imdb", "tmdb"]);

const extractHostname = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    return host || null;
  } catch {
    return null;
  }
};

const resolveShowLogoIdentityKey = (asset: SeasonAsset): string => {
  const candidates = [asset.source_url, asset.original_url, asset.hosted_url];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const trimmed = candidate.trim().toLowerCase();
    if (trimmed) return trimmed;
  }
  return `${asset.origin_table ?? "unknown"}:${asset.id}`;
};

const isTrustedShowBrandLogoAsset = (asset: SeasonAsset): boolean => {
  if (asset.type !== "show") return false;
  if ((asset.kind ?? "").toLowerCase().trim() !== "logo") return false;

  const sourceToken = (asset.source ?? "").trim().toLowerCase();
  if (TRUSTED_SHOW_LOGO_SOURCES.has(sourceToken)) return true;

  const sourceHost = extractHostname(asset.source_url);
  if (sourceHost && TRUSTED_SHOW_LOGO_SOURCE_HOSTS.has(sourceHost)) return true;

  const originalHost = extractHostname(asset.original_url);
  if (originalHost && TRUSTED_SHOW_LOGO_SOURCE_HOSTS.has(originalHost)) return true;

  return false;
};

const ENTITY_LINK_GROUP_LABELS: Record<EntityLinkGroup, string> = {
  official: "Official",
  social: "Social",
  knowledge: "Knowledge",
  cast_announcements: "Cast Announcements",
  other: "Other",
};

const PERSON_LINK_SOURCE_DEFINITIONS: Array<{ key: PersonLinkSourceKey; label: string }> = [
  { key: "bravo", label: "Bravo" },
  { key: "imdb", label: "IMDb" },
  { key: "tmdb", label: "TMDb" },
  { key: "knowledge", label: "Knowledge Graph" },
  { key: "fandom", label: "Fandom/Wikia" },
];

const SHOW_REFRESH_TARGET_LABELS: Record<ShowRefreshTarget, string> = {
  details: "Show Info",
  seasons_episodes: "Seasons & Episodes",
  photos: "Show/Season/Episode Media",
  cast_credits: "Cast & Credits",
};

const SHOW_REFRESH_STAGE_LABELS: Record<string, string> = {
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

const PERSON_REFRESH_STAGE_LABELS: Record<string, string> = {
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

const SHOW_REFRESH_STREAM_IDLE_TIMEOUT_MS = 600_000;
const SHOW_REFRESH_STREAM_MAX_DURATION_MS = 12 * 60 * 1000;
const SHOW_REFRESH_FALLBACK_TIMEOUT_MS = 5 * 60 * 1000;
const PERSON_REFRESH_STREAM_TIMEOUT_MS = 4 * 60 * 1000;
const PERSON_REFRESH_STREAM_IDLE_TIMEOUT_MS = 600_000;
const PERSON_REFRESH_FALLBACK_TIMEOUT_MS = 8 * 60 * 1000;
const GALLERY_ASSET_LOAD_TIMEOUT_MS = 60_000;
const ASSET_PIPELINE_STEP_TIMEOUT_MS = 8 * 60 * 1000;
const CAST_PROFILE_SYNC_CONCURRENCY = 3;
const CAST_INCREMENTAL_INITIAL_LIMIT = 48;
const CAST_INCREMENTAL_BATCH_SIZE = 48;
const BRAVO_LOAD_TIMEOUT_MS = 15_000;
const BRAVO_VIDEO_THUMBNAIL_SYNC_TIMEOUT_MS = 90_000;
const BRAVO_IMPORT_MUTATION_TIMEOUT_MS = 120_000;
const NEWS_LOAD_TIMEOUT_MS = 45_000;
const NEWS_SYNC_TIMEOUT_MS = 60_000;
const NEWS_SYNC_POLL_INTERVAL_MS = 1_500;
const NEWS_SYNC_POLL_TIMEOUT_MS = 90_000;
const NEWS_PAGE_SIZE = 50;
const EMPTY_NEWS_FACETS: UnifiedNewsFacets = {
  sources: [],
  people: [],
  topics: [],
  seasons: [],
};
const SHOW_CORE_LOAD_TIMEOUT_MS = 15_000;
const SHOW_CAST_LOAD_TIMEOUT_MS = 90_000;
const SHOW_CAST_LOAD_MAX_ATTEMPTS = 2;
const SHOW_CAST_LOAD_RETRY_BACKOFF_MS = 250;
const ROLE_LOAD_TIMEOUT_MS = 30_000;
const ROLE_LOAD_MAX_ATTEMPTS = 2;
const CAST_ROLE_MEMBERS_LOAD_TIMEOUT_MS = 125_000;
const SEASON_EPISODE_SUMMARY_TIMEOUT_MS = 12_000;
const SEASON_EPISODE_SUMMARY_CONCURRENCY = 4;
const SETTINGS_MUTATION_TIMEOUT_MS = 30_000;
const CAST_MATRIX_SYNC_TIMEOUT_MS = 90_000;
const COVERAGE_MUTATION_TIMEOUT_MS = 20_000;

const CAST_REFRESH_PHASE_TIMEOUTS: Record<CastRefreshPhaseId, number> = {
  credits_sync: 6 * 60 * 1000,
  profile_links_sync: 4 * 60 * 1000,
  bio_sync: 4 * 60 * 1000,
  network_augmentation: 5 * 60 * 1000,
  media_ingest: 20 * 60 * 1000,
};

const CAST_REFRESH_PHASE_BUTTON_LABELS: Record<CastRefreshPhaseId, string> = {
  credits_sync: "Syncing Credits...",
  profile_links_sync: "Syncing Links...",
  bio_sync: "Syncing Bios...",
  network_augmentation: "Syncing Bravo...",
  media_ingest: "Ingesting Media...",
};

const CAST_REFRESH_PHASE_STAGES: Record<CastRefreshPhaseId, string> = {
  credits_sync: "Credits",
  profile_links_sync: "Profile Links",
  bio_sync: "Bios",
  network_augmentation: "Network/Bravo",
  media_ingest: "Media",
};

const CAST_REFRESH_PHASE_ORDER: CastRefreshPhaseId[] = [
  "credits_sync",
  "profile_links_sync",
  "bio_sync",
  "network_augmentation",
  "media_ingest",
];

const SEASON_PAGE_TABS = [
  { tab: "overview", label: "Home" },
  { tab: "episodes", label: "Episodes" },
  { tab: "assets", label: "Assets" },
  { tab: "news", label: "News" },
  { tab: "fandom", label: "Fandom" },
  { tab: "cast", label: "Cast" },
  { tab: "surveys", label: "Surveys" },
  { tab: "social", label: "Social Media" },
] as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const looksLikeUuid = (value: string) => UUID_RE.test(value);

const isLikelyMirroredAssetUrl = (value: string | null | undefined): boolean => {
  if (!value) return false;
  try {
    const host = new URL(value).hostname.toLowerCase();
    return (
      host.includes("cloudfront.net") ||
      host.includes("amazonaws.com") ||
      host.includes("s3.") ||
      host.includes("therealityreport")
    );
  } catch {
    return false;
  }
};

const normalizeEntityLinkStatus = (value: unknown): EntityLinkStatus => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "approved") return "approved";
  if (normalized === "rejected") return "rejected";
  return "pending";
};

const classifyPersonLinkSource = (linkKind: string): PersonLinkSourceKey | null => {
  const kind = linkKind.trim().toLowerCase();
  if (!kind) return null;
  if (kind === "bravo_profile" || kind.includes("bravo")) return "bravo";
  if (kind.includes("imdb")) return "imdb";
  if (kind.includes("tmdb")) return "tmdb";
  if (kind === "wikidata" || kind === "wikipedia" || kind.includes("knowledge")) return "knowledge";
  if (kind === "fandom" || kind === "wikia") return "fandom";
  return null;
};

const getHostnameFromUrl = (value: string): string | null => {
  try {
    const parsed = new URL(value);
    return parsed.hostname || null;
  } catch {
    return null;
  }
};

const parsePersonNameFromLink = (link: EntityLink): string | null => {
  const rawLabel = typeof link.label === "string" ? link.label.trim() : "";
  if (rawLabel) {
    const cleaned = rawLabel
      .replace(/\s+(wikipedia|wikidata|fandom|wikia|bravo profile|imdb|tmdb)$/i, "")
      .trim();
    if (cleaned) return cleaned;
  }
  try {
    const parsed = new URL(link.url);
    const slug = decodeURIComponent((parsed.pathname.split("/").pop() ?? "").trim());
    if (!slug) return null;
    const humanized = slug.replace(/_/g, " ").replace(/-/g, " ").trim();
    return humanized || null;
  } catch {
    return null;
  }
};

const getPersonSourceKindPriority = (sourceKey: PersonLinkSourceKey, linkKind: string): number => {
  const kind = linkKind.trim().toLowerCase();
  if (sourceKey !== "knowledge") return 99;
  if (kind === "wikidata") return 0;
  if (kind === "wikipedia") return 1;
  return 2;
};

const pickPreferredPersonSourceLink = (
  sourceKey: PersonLinkSourceKey,
  links: EntityLink[]
): EntityLink | null => {
  if (links.length === 0) return null;
  const rankByStatus = (status: EntityLinkStatus): number => {
    if (status === "approved") return 0;
    if (status === "pending") return 1;
    return 2;
  };
  const sorted = [...links].sort((a, b) => {
    const statusDiff = rankByStatus(normalizeEntityLinkStatus(a.status)) - rankByStatus(normalizeEntityLinkStatus(b.status));
    if (statusDiff !== 0) return statusDiff;
    const kindDiff =
      getPersonSourceKindPriority(sourceKey, a.link_kind) -
      getPersonSourceKindPriority(sourceKey, b.link_kind);
    if (kindDiff !== 0) return kindDiff;
    return (a.label || a.url).localeCompare(b.label || b.url);
  });
  return sorted[0] ?? null;
};

function PersonSourceLogo({ sourceKey }: { sourceKey: PersonLinkSourceKey }) {
  const baseClass =
    "inline-flex h-5 min-w-[2.1rem] items-center justify-center rounded border px-1 text-[10px] font-bold uppercase tracking-[0.08em]";
  if (sourceKey === "imdb") {
    return <span className={`${baseClass} border-zinc-300 bg-[#f5c518] text-zinc-900`}>IMDb</span>;
  }
  if (sourceKey === "tmdb") {
    return <span className={`${baseClass} border-zinc-300 bg-[#01d277] text-zinc-900`}>TMDb</span>;
  }
  if (sourceKey === "bravo") {
    return <span className={`${baseClass} border-zinc-300 bg-zinc-900 text-white`}>Bravo</span>;
  }
  if (sourceKey === "knowledge") {
    return <span className={`${baseClass} border-zinc-300 bg-sky-600 text-white`}>KG</span>;
  }
  return <span className={`${baseClass} border-zinc-300 bg-[#f3f4f6] text-zinc-800`}>Fandom</span>;
}

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const formatFixed1 = (value: unknown): string | null => {
  const parsed = toFiniteNumber(value);
  return parsed === null ? null : parsed.toFixed(1);
};

const parseProgressNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === "AbortError";

const formatSnapshotAgeLabel = (timestampMs: number): string => {
  const diffMs = Math.max(0, Date.now() - timestampMs);
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const withSnapshotAgeSuffix = (warning: string | null, timestampMs: number | null): string | null => {
  if (!warning) return null;
  if (!timestampMs) return warning;
  return `${warning} Last successful snapshot: ${formatSnapshotAgeLabel(timestampMs)}.`;
};

const isTransientNotAuthenticatedError = (error: unknown): boolean =>
  error instanceof Error && error.message.toLowerCase().includes("not authenticated");

const parseAltNamesText = (value: string): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of value.split(/\r?\n|,/)) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
};

const inferBravoShowUrl = (showName: string | null | undefined): string | null => {
  if (typeof showName !== "string") return null;
  const slug = showName
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (!slug) return null;
  return `https://www.bravotv.com/${slug}`;
};

const inferBravoPersonUrl = (personName: string | null | undefined): string | null => {
  if (typeof personName !== "string") return null;
  const slug = personName
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (!slug) return null;
  return `https://www.bravotv.com/people/${slug}`;
};

const isBravoNetworkName = (value: unknown): boolean => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  if (!normalized) return false;
  return normalized === "bravo" || normalized === "bravotv" || normalized.includes("bravo");
};

const normalizeBravoSocialKey = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "link";
  if (normalized.includes("instagram")) return "instagram";
  if (normalized === "x" || normalized.includes("twitter")) return "x";
  if (normalized.includes("facebook")) return "facebook";
  if (normalized.includes("tiktok")) return "tiktok";
  if (normalized.includes("youtube")) return "youtube";
  return normalized;
};

const formatBravoSocialLabel = (key: string): string => {
  if (key === "x") return "X";
  if (key === "instagram") return "Instagram";
  if (key === "facebook") return "Facebook";
  if (key === "tiktok") return "TikTok";
  if (key === "youtube") return "YouTube";
  return key.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const extractBravoSocialHandle = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const handle = segments.at(-1) ?? "";
    if (!handle) return null;
    return handle.startsWith("@") ? handle : `@${handle}`;
  } catch {
    return null;
  }
};

const BRAVO_IMPORT_IMAGE_KIND_OPTIONS: Array<{ value: BravoImportImageKind; label: string }> = [
  { value: "poster", label: "Poster" },
  { value: "backdrop", label: "Backdrop" },
  { value: "logo", label: "Logo" },
  { value: "episode_still", label: "Episode Still" },
  { value: "cast", label: "Cast" },
  { value: "promo", label: "Promo" },
  { value: "intro", label: "Intro" },
  { value: "reunion", label: "Reunion" },
  { value: "other", label: "Other" },
];

const inferBravoImportImageKind = (
  image: { url: string; alt?: string | null }
): BravoImportImageKind => {
  const haystack = `${image.alt ?? ""} ${image.url}`.toLowerCase();
  if (haystack.includes("logo")) return "logo";
  if (haystack.includes("key art") || haystack.includes("poster")) return "poster";
  if (haystack.includes("backdrop") || haystack.includes("background")) return "backdrop";
  if (haystack.includes("cast")) return "cast";
  if (haystack.includes("still")) return "episode_still";
  if (haystack.includes("intro")) return "intro";
  if (haystack.includes("reunion")) return "reunion";
  return "promo";
};

const humanizeStage = (value: string): string => {
  const normalized = value.replace(/[_-]+/g, " ").trim();
  if (!normalized) return "Working";
  return normalized
    .split(" ")
    .map((token) =>
      token.length > 0 ? token.charAt(0).toUpperCase() + token.slice(1) : token
    )
    .join(" ");
};

const resolveStageLabel = (
  stageValue: unknown,
  stageLabels: Record<string, string>
): string | null => {
  if (typeof stageValue !== "string") return null;
  const normalized = stageValue.trim().toLowerCase();
  if (!normalized) return null;
  return stageLabels[normalized] ?? humanizeStage(normalized);
};

const getShowRefreshTargetLabel = (target: ShowRefreshTarget): string => {
  return SHOW_REFRESH_TARGET_LABELS[target] ?? target;
};

const buildProgressMessage = (
  stageLabel: string | null,
  rawMessage: unknown,
  fallback: string
): string => {
  const message = typeof rawMessage === "string" ? rawMessage.trim() : "";
  if (!message) return stageLabel ? `Working on ${stageLabel}...` : fallback;
  if (stageLabel) return `${stageLabel}: ${message}`;
  return message;
};

const UUID_LIKE_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

const normalizeRefreshLogMessage = (value: string): string => {
  return value
    .replace(UUID_LIKE_RE, "person")
    .replace(/\s+/g, " ")
    .trim();
};

const extractRefreshLogSubJob = (entry: RefreshLogEntry): { subJob: string; details: string } => {
  const normalizedMessage = normalizeRefreshLogMessage(entry.message);
  const prefixMatch = normalizedMessage.match(/^([^:]{2,50}):\s+(.+)$/);
  if (prefixMatch) {
    return {
      subJob: prefixMatch[1].trim(),
      details: prefixMatch[2].trim(),
    };
  }
  const fallbackSubJob = entry.category.trim() || "Update";
  return {
    subJob: fallbackSubJob,
    details: normalizedMessage,
  };
};

const isRefreshTopicDone = (entry: RefreshLogEntry | null): boolean => {
  return isRefreshLogTerminalSuccess(entry);
};

const isRefreshTopicFailed = (entry: RefreshLogEntry | null): boolean => {
  if (!entry) return false;
  const message = entry.message.toLowerCase();
  return message.includes("failed") || message.includes("error");
};

// Generic gallery image with error handling - falls back to placeholder on broken images
function GalleryImage({
  src,
  srcCandidates,
  diagnosticKey,
  onFallbackEvent,
  alt,
  sizes = "200px",
  className = "object-cover",
  style,
  children,
}: {
  src: string;
  srcCandidates?: string[];
  diagnosticKey?: string;
  onFallbackEvent?: (event: "attempt" | "recovered" | "failed") => void;
  alt: string;
  sizes?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const fallbackCandidates = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const value of srcCandidates ?? []) {
      if (typeof value !== "string") continue;
      const trimmed = value.trim();
      if (!trimmed || trimmed === src || seen.has(trimmed)) continue;
      seen.add(trimmed);
      out.push(trimmed);
    }
    return out;
  }, [src, srcCandidates]);
  const fallbackCandidatesSignature = useMemo(
    () => fallbackCandidates.join("\u0001"),
    [fallbackCandidates]
  );
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const telemetryStateRef = useRef({
    attempted: false,
    recovered: false,
    failed: false,
  });

  useEffect(() => {
    setHasError(false);
    setCurrentSrc(src);
    setFallbackIndex(0);
    telemetryStateRef.current = {
      attempted: false,
      recovered: false,
      failed: false,
    };
    if (onFallbackEvent && !telemetryStateRef.current.attempted) {
      onFallbackEvent("attempt");
      telemetryStateRef.current.attempted = true;
    }
  }, [src, fallbackCandidatesSignature, onFallbackEvent]);

  const handleError = () => {
    const nextCandidate = fallbackCandidates[fallbackIndex] ?? null;
    if (nextCandidate && nextCandidate !== currentSrc) {
      setCurrentSrc(nextCandidate);
      setFallbackIndex((prev) => prev + 1);
      return;
    }
    if (diagnosticKey) {
      console.warn("[show-gallery] all image URL candidates failed", {
        asset: diagnosticKey,
        attempted: fallbackCandidates.length + 1,
      });
    }
    if (onFallbackEvent && !telemetryStateRef.current.failed) {
      onFallbackEvent("failed");
      telemetryStateRef.current.failed = true;
    }
    setHasError(true);
  };

  if (hasError) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-100 text-zinc-400">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
          <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
          <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>
    );
  }

  return (
    <>
      <Image
        src={currentSrc}
        alt={alt}
        fill
        className={className}
        style={style}
        sizes={sizes}
        unoptimized
        onError={handleError}
        onLoad={() => {
          if (onFallbackEvent && currentSrc !== src && !telemetryStateRef.current.recovered) {
            onFallbackEvent("recovered");
            telemetryStateRef.current.recovered = true;
          }
        }}
      />
      {children}
    </>
  );
}

// Cast photo with error handling - falls back to placeholder on broken images
function CastPhoto({
  src,
  alt,
  thumbnail_focus_x,
  thumbnail_focus_y,
  thumbnail_zoom,
  thumbnail_crop_mode,
}: {
  src: string;
  alt: string;
  thumbnail_focus_x?: number | null;
  thumbnail_focus_y?: number | null;
  thumbnail_zoom?: number | null;
  thumbnail_crop_mode?: "manual" | "auto" | null;
}) {
  const hasPersistedCrop =
    isThumbnailCropMode(thumbnail_crop_mode) &&
    typeof thumbnail_focus_x === "number" &&
    Number.isFinite(thumbnail_focus_x) &&
    typeof thumbnail_focus_y === "number" &&
    Number.isFinite(thumbnail_focus_y) &&
    typeof thumbnail_zoom === "number" &&
    Number.isFinite(thumbnail_zoom);

  const presentation = resolveThumbnailPresentation({
    width: null,
    height: null,
    crop: hasPersistedCrop
      ? {
          x: thumbnail_focus_x,
          y: thumbnail_focus_y,
          zoom: thumbnail_zoom,
          mode: thumbnail_crop_mode,
        }
      : null,
  });

  return (
    <GalleryImage
      src={src}
      alt={alt}
      sizes="200px"
      className="object-cover transition-transform duration-300"
      style={{
        objectPosition: presentation.objectPosition,
        transformOrigin: presentation.objectPosition,
        transform: presentation.zoom !== 1 ? `scale(${presentation.zoom})` : undefined,
      }}
    />
  );
}

const getAssetDisplayUrl = (asset: SeasonAsset): string =>
  firstImageUrlCandidate(getSeasonAssetCardUrlCandidates(asset)) ?? asset.hosted_url;

const getAssetDetailUrl = (asset: SeasonAsset): string =>
  firstImageUrlCandidate(getSeasonAssetDetailUrlCandidates(asset)) ?? asset.hosted_url;

const getFeaturedShowImageKind = (asset: SeasonAsset): "poster" | "backdrop" | null => {
  const normalizedKind = String(asset.kind ?? "").trim().toLowerCase();
  if (normalizedKind === "poster") return "poster";
  if (normalizedKind === "backdrop") return "backdrop";
  return null;
};

const buildAssetAutoCropPayload = (asset: SeasonAsset): Record<string, unknown> | null => {
  const directCrop = parseThumbnailCrop(
    {
      x: asset.thumbnail_focus_x,
      y: asset.thumbnail_focus_y,
      zoom: asset.thumbnail_zoom,
      mode: asset.thumbnail_crop_mode,
    },
    { clamp: true }
  );
  const metadataCrop = parseThumbnailCrop(
    (asset.metadata as Record<string, unknown> | null)?.thumbnail_crop,
    { clamp: true }
  );
  const crop = directCrop ?? metadataCrop;
  if (!crop) return null;
  return {
    x: crop.x,
    y: crop.y,
    zoom: crop.zoom,
    mode: crop.mode,
  };
};

const buildAssetAutoCropPayloadWithFallback = (
  asset: SeasonAsset
): Record<string, unknown> =>
  buildAssetAutoCropPayload(asset) ?? {
    x: THUMBNAIL_DEFAULTS.x,
    y: THUMBNAIL_DEFAULTS.y,
    zoom: THUMBNAIL_DEFAULTS.zoom,
    mode: "auto",
    strategy: "resize_center_fallback_v1",
  };

const isCrewCreditCategory = (value: string | null | undefined): boolean => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized === "crew" ||
    normalized.includes("crew") ||
    normalized.includes("producer") ||
    normalized.includes("production")
  );
};

const areStringArraysEqual = (a: string[], b: string[]): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
};

const areNumberArraysEqual = (a: number[], b: number[]): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
};

const NETWORK_LOGO_DOMAIN_BY_NAME: Record<string, string> = {
  bravo: "bravotv.com",
  nbc: "nbc.com",
  peacock: "peacocktv.com",
  "paramount+": "paramountplus.com",
  "e!": "eonline.com",
  mtv: "mtv.com",
  vh1: "vh1.com",
  abc: "abc.com",
  cbs: "cbs.com",
  fox: "fox.com",
  netflix: "netflix.com",
  hulu: "hulu.com",
  max: "max.com",
};

const getNetworkLogoUrl = (network: string | null | undefined): string | null => {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }
  if (!network) return null;
  const normalized = network.trim().toLowerCase();
  if (!normalized) return null;
  const domain = NETWORK_LOGO_DOMAIN_BY_NAME[normalized];
  if (!domain) return null;
  return `https://logo.clearbit.com/${domain}`;
};

function NetworkNameOrLogo({
  network,
  fallbackLabel,
}: {
  network: string | null;
  fallbackLabel: string;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = getNetworkLogoUrl(network);

  if (logoUrl && !logoFailed) {
    return (
      <Image
        src={logoUrl}
        alt={network ? `${network} logo` : "Network logo"}
        className="h-6 w-auto object-contain"
        width={96}
        height={24}
        loading="lazy"
        unoptimized
        onError={() => setLogoFailed(true)}
      />
    );
  }

  return (
    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
      {fallbackLabel}
    </p>
  );
}

function ShowNameOrLogo({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const trimmedLogo = typeof logoUrl === "string" && logoUrl.trim() ? logoUrl.trim() : null;

  if (trimmedLogo && !logoFailed) {
    return (
      <Image
        src={trimmedLogo}
        alt={`${name} logo`}
        className="h-14 w-auto max-w-[28rem] object-contain"
        width={448}
        height={56}
        loading="lazy"
        unoptimized
        onError={() => setLogoFailed(true)}
      />
    );
  }

  return <h1 className="text-3xl font-bold text-zinc-900">{name}</h1>;
}

function RefreshProgressBar({
  show,
  stage,
  message,
  current,
  total,
}: {
  show: boolean;
  stage?: string | null;
  message?: string | null;
  current?: number | null;
  total?: number | null;
}) {
  if (!show) return null;
  const hasCounts =
    typeof current === "number" &&
    Number.isFinite(current) &&
    typeof total === "number" &&
    Number.isFinite(total) &&
    total >= 0 &&
    current >= 0;
  const safeTotal = hasCounts ? Math.max(0, Math.floor(total)) : null;
  const safeCurrent = hasCounts
    ? Math.max(
        0,
        Math.floor(
          safeTotal !== null && safeTotal > 0 ? Math.min(current, safeTotal) : current
        )
      )
    : null;
  const hasProgressBar = safeCurrent !== null && safeTotal !== null && safeTotal > 0;
  const percent = hasProgressBar
    ? Math.min(100, Math.round((safeCurrent / safeTotal) * 100))
    : 0;
  const stageLabel =
    typeof stage === "string" && stage.trim()
      ? stage.replace(/[_-]+/g, " ").trim()
      : null;

  return (
    <div className="mt-2 w-full">
      {(message || stageLabel || hasCounts) && (
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
            {message || stageLabel || "Working..."}
          </p>
          {hasProgressBar && safeCurrent !== null && safeTotal !== null && (
            <p className="text-[11px] tabular-nums text-zinc-500">
              {safeCurrent.toLocaleString()}/{safeTotal.toLocaleString()} ({percent}%)
            </p>
          )}
        </div>
      )}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
        {hasProgressBar ? (
          <div
            className="h-full rounded-full bg-zinc-700 transition-all"
            style={{ width: `${percent}%` }}
          />
        ) : safeTotal === 0 ? null : (
          <div className="absolute inset-y-0 left-0 w-1/3 animate-pulse rounded-full bg-zinc-700/70" />
        )}
      </div>
    </div>
  );
}


export default function TrrShowDetailPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showRouteParam = params.showId as string;
  const {
    setResolvedShowId,
    slugResolutionLoading,
    setSlugResolutionLoading,
    slugResolutionError,
    setSlugResolutionError,
    showId,
    isCurrentShowId,
  } = useShowCore<TrrShow, TrrSeason>(showRouteParam);
  const { user, checking, hasAccess } = useAdminGuard();

  const [show, setShow] = useState<TrrShow | null>(null);
  const [seasons, setSeasons] = useState<TrrSeason[]>([]);
  const [cast, setCast] = useState<TrrCastMember[]>([]);
  const [castLoadedOnce, setCastLoadedOnce] = useState(false);
  const [castLoading, setCastLoading] = useState(false);
  const [castLoadError, setCastLoadError] = useState<string | null>(null);
  const [castLoadWarning, setCastLoadWarning] = useState<string | null>(null);
  const [castPhotoEnriching, setCastPhotoEnriching] = useState(false);
  const [castPhotoEnrichError, setCastPhotoEnrichError] = useState<string | null>(null);
  const [castPhotoEnrichNotice, setCastPhotoEnrichNotice] = useState<string | null>(null);
  const [castSource, setCastSource] = useState<ShowCastSource>("episode_evidence");
  const [castEligibilityWarning, setCastEligibilityWarning] = useState<string | null>(null);
  const [castRoleMembers, setCastRoleMembers] = useState<CastRoleMember[]>([]);
  const [castRoleMembersLoadedOnce, setCastRoleMembersLoadedOnce] = useState(false);
  const [castRoleMembersLoading, setCastRoleMembersLoading] = useState(false);
  const [castRoleMembersError, setCastRoleMembersError] = useState<string | null>(null);
  const [castRoleMembersWarning, setCastRoleMembersWarning] = useState<string | null>(null);
  const [castMatrixSyncLoading, setCastMatrixSyncLoading] = useState(false);
  const [castMatrixSyncError, setCastMatrixSyncError] = useState<string | null>(null);
  const [castMatrixSyncResult, setCastMatrixSyncResult] = useState<CastMatrixSyncResult | null>(
    null
  );
  const [archiveFootageCast, setArchiveFootageCast] = useState<TrrCastMember[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("details");
  const [selectedSocialSeasonId, setSelectedSocialSeasonId] = useState<string | null>(null);
  const [assetsView, setAssetsView] = useState<"images" | "videos" | "branding">("images");
  const [bravoVideos, setBravoVideos] = useState<BravoVideoItem[]>([]);
  const [bravoLoading, setBravoLoading] = useState(false);
  const [bravoError, setBravoError] = useState<string | null>(null);
  const [bravoVideoSyncing, setBravoVideoSyncing] = useState(false);
  const [bravoVideoSyncWarning, setBravoVideoSyncWarning] = useState<string | null>(null);
  const [bravoLoaded, setBravoLoaded] = useState(false);
  const bravoLoadInFlightRef = useRef<Promise<void> | null>(null);
  const bravoVideoSyncInFlightRef = useRef<Promise<boolean> | null>(null);
  const bravoVideoSyncAttemptedRef = useRef(false);
  const [unifiedNews, setUnifiedNews] = useState<UnifiedNewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsSyncing, setNewsSyncing] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [newsNotice, setNewsNotice] = useState<string | null>(null);
  const [newsLoaded, setNewsLoaded] = useState(false);
  const [newsPageCount, setNewsPageCount] = useState(0);
  const [newsTotalCount, setNewsTotalCount] = useState(0);
  const [newsFacets, setNewsFacets] = useState<UnifiedNewsFacets>(EMPTY_NEWS_FACETS);
  const [newsNextCursor, setNewsNextCursor] = useState<string | null>(null);
  const [newsGoogleUrlMissing, setNewsGoogleUrlMissing] = useState(false);
  const [newsSort, setNewsSort] = useState<"trending" | "latest">("trending");
  const [newsSourceFilter, setNewsSourceFilter] = useState<string>("");
  const [newsPersonFilter, setNewsPersonFilter] = useState<string>("");
  const [newsTopicFilter, setNewsTopicFilter] = useState<string>("");
  const [newsSeasonFilter, setNewsSeasonFilter] = useState<string>("");
  const newsLoadInFlightRef = useRef<Promise<void> | null>(null);
  const newsSyncInFlightRef = useRef<Promise<boolean> | null>(null);
  const newsAutoSyncAttemptedRef = useRef(false);
  const newsLoadedQueryKeyRef = useRef<string | null>(null);
  const newsInFlightQueryKeyRef = useRef<string | null>(null);
  const newsRequestSeqRef = useRef(0);
  const pendingNewsReloadRef = useRef(false);
  const pendingNewsReloadArgsRef = useRef<{ force: boolean; forceSync: boolean; queryKey: string } | null>(null);
  const newsCursorQueryKeyRef = useRef<string | null>(null);
  const [syncBravoOpen, setSyncBravoOpen] = useState(false);
  const [syncBravoModePickerOpen, setSyncBravoModePickerOpen] = useState(false);
  const [syncBravoRunMode, setSyncBravoRunMode] = useState<SyncBravoRunMode>("full");
  const [syncBravoUrl, setSyncBravoUrl] = useState("");
  const [syncBravoDescription, setSyncBravoDescription] = useState("");
  const [syncBravoApplyDescriptionToShow, setSyncBravoApplyDescriptionToShow] = useState(false);
  const [syncBravoAirs, setSyncBravoAirs] = useState("");
  const [syncBravoStep, setSyncBravoStep] = useState<"preview" | "confirm">("preview");
  const [syncBravoImages, setSyncBravoImages] = useState<Array<{ url: string; alt?: string | null }>>([]);
  const [syncBravoPreviewPeople, setSyncBravoPreviewPeople] = useState<BravoPreviewPerson[]>([]);
  const [syncFandomPreviewPeople, setSyncFandomPreviewPeople] = useState<BravoPreviewPerson[]>([]);
  const [syncBravoPersonCandidateResults, setSyncBravoPersonCandidateResults] = useState<
    BravoPersonCandidateResult[]
  >([]);
  const [syncFandomPersonCandidateResults, setSyncFandomPersonCandidateResults] = useState<
    BravoPersonCandidateResult[]
  >([]);
  const [syncBravoPreviewResult, setSyncBravoPreviewResult] = useState<Record<string, unknown> | null>(null);
  const [syncBravoPreviewSignature, setSyncBravoPreviewSignature] = useState<string | null>(null);
  const [syncBravoCandidateSummary, setSyncBravoCandidateSummary] =
    useState<BravoCandidateSummary | null>(null);
  const [syncFandomCandidateSummary, setSyncFandomCandidateSummary] =
    useState<BravoCandidateSummary | null>(null);
  const [syncFandomDomainsUsed, setSyncFandomDomainsUsed] = useState<string[]>([]);
  const [syncBravoProbeTotal, setSyncBravoProbeTotal] = useState(0);
  const [syncBravoProbeStatusMessage, setSyncBravoProbeStatusMessage] = useState<string | null>(null);
  const [syncBravoProbeActive, setSyncBravoProbeActive] = useState(false);
  const [syncBravoDiscoveredPersonUrls, setSyncBravoDiscoveredPersonUrls] = useState<string[]>([]);
  const [syncBravoPreviewVideos, setSyncBravoPreviewVideos] = useState<BravoVideoItem[]>([]);
  const [syncBravoPreviewNews, setSyncBravoPreviewNews] = useState<BravoNewsItem[]>([]);
  const [syncBravoTargetSeasonNumber, setSyncBravoTargetSeasonNumber] = useState<number | null>(null);
  const [syncBravoPreviewSeasonFilter, setSyncBravoPreviewSeasonFilter] = useState<number | "all">("all");
  const [syncBravoSelectedImages, setSyncBravoSelectedImages] = useState<Set<string>>(new Set());
  const [syncBravoImageKinds, setSyncBravoImageKinds] = useState<Record<string, BravoImportImageKind>>({});
  const [syncBravoPreviewLoading, setSyncBravoPreviewLoading] = useState(false);
  const [syncBravoCommitLoading, setSyncBravoCommitLoading] = useState(false);
  const [syncBravoError, setSyncBravoError] = useState<string | null>(null);
  const [syncBravoNotice, setSyncBravoNotice] = useState<string | null>(null);
  const syncBravoPreviewAbortControllerRef = useRef<AbortController | null>(null);
  const syncBravoPreviewRunRef = useRef(0);
  const [openSeasonId, setOpenSeasonId] = useState<string | null>(null);
  const hasAutoOpenedSeasonRef = useRef(false);
  const [seasonEpisodeSummaries, setSeasonEpisodeSummaries] = useState<
    Record<string, { count: number; premiereDate: string | null; finaleDate: string | null }>
  >({});
  const [seasonSummariesLoading, setSeasonSummariesLoading] = useState(false);
  const [socialDependencyError, setSocialDependencyError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailsForm, setDetailsForm] = useState<{
    displayName: string;
    nickname: string;
    altNamesText: string;
    description: string;
    premiereDate: string;
  }>({
    displayName: "",
    nickname: "",
    altNamesText: "",
    description: "",
    premiereDate: "",
  });
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsNotice, setDetailsNotice] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsEditing, setDetailsEditing] = useState(false);
  const detailsBaseline = useMemo(() => {
    if (!show) {
      return {
        displayName: "",
        nickname: "",
        altNamesText: "",
        description: "",
        premiereDate: "",
      };
    }
    const alternatives = Array.isArray(show.alternative_names)
      ? show.alternative_names.filter((name) => typeof name === "string" && name.trim().length > 0)
      : [];
    const [nickname = "", ...restAlt] = alternatives;
    return {
      displayName: show.name ?? "",
      nickname,
      altNamesText: restAlt.join("\n"),
      description: show.description ?? "",
      premiereDate: show.premiere_date ?? "",
    };
  }, [show]);
  const hasUnsavedDetailsChanges = useMemo(() => {
    if (!detailsEditing) return false;
    return (
      detailsForm.displayName.trim() !== detailsBaseline.displayName.trim() ||
      detailsForm.nickname.trim() !== detailsBaseline.nickname.trim() ||
      detailsForm.description.trim() !== detailsBaseline.description.trim() ||
      detailsForm.premiereDate.trim() !== detailsBaseline.premiereDate.trim() ||
      parseAltNamesText(detailsForm.altNamesText).join("\n") !==
        parseAltNamesText(detailsBaseline.altNamesText).join("\n")
    );
  }, [detailsBaseline, detailsEditing, detailsForm]);

  const [showLinks, setShowLinks] = useState<EntityLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [linksNotice, setLinksNotice] = useState<string | null>(null);
  const [linkEditDraft, setLinkEditDraft] = useState<LinkEditDraft | null>(null);
  const [linkEditSaving, setLinkEditSaving] = useState(false);
  const [googleNewsLinkId, setGoogleNewsLinkId] = useState<string | null>(null);
  const [googleNewsUrl, setGoogleNewsUrl] = useState("");
  const [googleNewsSaving, setGoogleNewsSaving] = useState(false);
  const [googleNewsError, setGoogleNewsError] = useState<string | null>(null);
  const [googleNewsNotice, setGoogleNewsNotice] = useState<string | null>(null);
  const [roleRenameDraft, setRoleRenameDraft] = useState<RoleRenameDraft | null>(null);
  const [roleRenameSaving, setRoleRenameSaving] = useState(false);
  const [castRoleEditDraft, setCastRoleEditDraft] = useState<CastRoleEditDraft | null>(null);
  const [castRoleEditSaving, setCastRoleEditSaving] = useState(false);

  const [showRoles, setShowRoles] = useState<ShowRole[]>([]);
  const [showRolesLoadedOnce, setShowRolesLoadedOnce] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [rolesWarning, setRolesWarning] = useState<string | null>(null);
  const [castRoleEditorDeepLinkWarning, setCastRoleEditorDeepLinkWarning] = useState<string | null>(
    null
  );
  const [lastSuccessfulRolesAt, setLastSuccessfulRolesAt] = useState<number | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const showRolesAutoLoadAttemptedRef = useRef<string | null>(null);
  const showRolesLoadInFlightRef = useRef<Promise<void> | null>(null);
  const showRolesSnapshotRef = useRef<ShowRole[]>([]);
  const showRolesLoadedOnceRef = useRef(false);
  const castRoleMembersAutoLoadAttemptedRef = useRef<string | null>(null);
  const castRoleMembersLoadInFlightRef = useRef<Promise<void> | null>(null);
  const castRoleMembersLoadKeyRef = useRef<string | null>(null);
  const castRoleMembersSnapshotRef = useRef<CastRoleMember[]>([]);
  const castRoleMembersLoadedOnceRef = useRef(false);
  const [lastSuccessfulCastRoleMembersAt, setLastSuccessfulCastRoleMembersAt] = useState<number | null>(
    null
  );

  const [castSortBy, setCastSortBy] = useState<"episodes" | "season" | "name">("episodes");
  const [castSortOrder, setCastSortOrder] = useState<"desc" | "asc">("desc");
  const [castSeasonFilters, setCastSeasonFilters] = useState<number[]>([]);
  const [castRoleAndCreditFilters, setCastRoleAndCreditFilters] = useState<string[]>([]);
  const [castHasImageFilter, setCastHasImageFilter] = useState<"all" | "yes" | "no">("all");
  const [castSearchQuery, setCastSearchQuery] = useState("");
  const [castSearchQueryDebounced, setCastSearchQueryDebounced] = useState("");
  const [castRenderLimit, setCastRenderLimit] = useState(CAST_INCREMENTAL_INITIAL_LIMIT);
  const [crewRenderLimit, setCrewRenderLimit] = useState(CAST_INCREMENTAL_INITIAL_LIMIT);
  const castIncrementalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lightbox state (for cast photos)
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);

  // Gallery state
  const [galleryAssets, setGalleryAssets] = useState<SeasonAsset[]>([]);
  const [featuredLogoSavingAssetId, setFeaturedLogoSavingAssetId] = useState<string | null>(null);
  const [featuredLogoVariant, setFeaturedLogoVariant] = useState<ShowLogoVariant>("color");
  const [galleryVisibleBySection, setGalleryVisibleBySection] = useState<ShowGalleryVisibleBySection>(
    () => buildShowGalleryVisibleDefaults()
  );
  const [galleryAutoAdvanceMode, setGalleryAutoAdvanceMode] = useState<"manual" | "auto">(
    "manual"
  );
  const [batchJobsOpen, setBatchJobsOpen] = useState(false);
  const [batchJobsRunning, setBatchJobsRunning] = useState(false);
  const [batchJobsError, setBatchJobsError] = useState<string | null>(null);
  const [batchJobsNotice, setBatchJobsNotice] = useState<string | null>(null);
  const [batchJobsProgress, setBatchJobsProgress] = useState<RefreshProgressState | null>(null);
  const [batchJobsLiveCounts, setBatchJobsLiveCounts] = useState<JobLiveCounts | null>(null);
  const [batchJobOperations, setBatchJobOperations] = useState<BatchJobOperation[]>(
    DEFAULT_BATCH_JOB_OPERATIONS
  );
  const [batchJobContentSections, setBatchJobContentSections] = useState<AssetSectionKey[]>(
    DEFAULT_BATCH_JOB_CONTENT_SECTIONS
  );
  const [selectedGallerySeason, setSelectedGallerySeason] = useState<
    number | "all"
  >("all");
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryTruncatedWarning, setGalleryTruncatedWarning] = useState<string | null>(null);
  const [galleryFallbackTelemetry, setGalleryFallbackTelemetry] = useState({
    fallbackRecoveredCount: 0,
    allCandidatesFailedCount: 0,
    totalImageAttempts: 0,
  });
  const [galleryMirrorTelemetry, setGalleryMirrorTelemetry] = useState({
    mirroredCount: 0,
    totalCount: 0,
    mirroredRatio: 0,
  });
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [textOverlayDetectError, setTextOverlayDetectError] = useState<string | null>(null);
  const advancedFilters = useMemo(
    () =>
      readAdvancedFilters(new URLSearchParams(searchParams.toString()), {
        sort: "newest",
      }),
    [searchParams]
  );

  const setAdvancedFilters = useCallback(
    (next: AdvancedFilterState) => {
      const out = writeAdvancedFilters(
        new URLSearchParams(searchParams.toString()),
        next,
        { sort: "newest" }
      );
      router.replace(`?${out.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const trackGalleryFallbackEvent = useCallback((event: "attempt" | "recovered" | "failed") => {
    setGalleryFallbackTelemetry((prev) => {
      if (event === "attempt") {
        return {
          ...prev,
          totalImageAttempts: prev.totalImageAttempts + 1,
        };
      }
      if (event === "recovered") {
        return {
          ...prev,
          fallbackRecoveredCount: prev.fallbackRecoveredCount + 1,
        };
      }
      return {
        ...prev,
        allCandidatesFailedCount: prev.allCandidatesFailedCount + 1,
      };
    });
  }, []);

  const activeAdvancedFilterCount = useMemo(
    () => countActiveAdvancedFilters(advancedFilters, { sort: "newest" }),
    [advancedFilters]
  );
  const hasActiveAdvancedFilters = activeAdvancedFilterCount > 0;
  const clearGalleryFilters = useCallback(() => {
    setAdvancedFilters(clearAdvancedFilters({ sort: "newest" }));
  }, [setAdvancedFilters]);

  const availableGallerySources = useMemo(() => {
    const sources = new Set(galleryAssets.map((a) => a.source).filter(Boolean));
    return Array.from(sources).sort();
  }, [galleryAssets]);

  // Gallery asset lightbox state
  const [assetLightbox, setAssetLightbox] = useState<{
    asset: SeasonAsset;
    index: number;
    filteredAssets: SeasonAsset[];
  } | null>(null);
  const assetTriggerRef = useRef<HTMLElement | null>(null);

  // Covered shows state
  const [isCovered, setIsCovered] = useState(false);
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [coverageError, setCoverageError] = useState<string | null>(null);

  // Refresh show sync state (uses TRR-Backend scripts, proxied via Next API routes)
  const [refreshingTargets, setRefreshingTargets] = useState<Record<ShowRefreshTarget, boolean>>({
    details: false,
    seasons_episodes: false,
    photos: false,
    cast_credits: false,
  });
  const [refreshTargetNotice, setRefreshTargetNotice] = useState<
    Partial<Record<ShowRefreshTarget, string>>
  >({});
  const [refreshTargetError, setRefreshTargetError] = useState<
    Partial<Record<ShowRefreshTarget, string>>
  >({});
  const [refreshTargetProgress, setRefreshTargetProgress] = useState<
    Partial<
      Record<
        ShowRefreshTarget,
        {
          stage?: string | null;
          message?: string | null;
          current: number | null;
          total: number | null;
        }
      >
    >
  >({});
  const [refreshTargetLiveCounts, setRefreshTargetLiveCounts] = useState<
    Partial<Record<ShowRefreshTarget, JobLiveCounts | null>>
  >({});
  const [refreshingShowAll, setRefreshingShowAll] = useState(false);
  const [refreshAllNotice, setRefreshAllNotice] = useState<string | null>(null);
  const [refreshAllError, setRefreshAllError] = useState<string | null>(null);
  const [refreshAllProgress, setRefreshAllProgress] = useState<RefreshProgressState | null>(
    null
  );
  const [refreshLogEntries, setRefreshLogEntries] = useState<RefreshLogEntry[]>([]);
  const [refreshLogOpen, setRefreshLogOpen] = useState(false);

  // Image scrape drawer state
  const [scrapeDrawerOpen, setScrapeDrawerOpen] = useState(false);
  const [scrapeDrawerContext, setScrapeDrawerContext] = useState<EntityContext | null>(null);

  // Refresh images state
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [castRefreshPipelineRunning, setCastRefreshPipelineRunning] = useState(false);
  const [castRefreshPhaseStates, setCastRefreshPhaseStates] = useState<CastRefreshPhaseState[]>(
    []
  );
  const [castMediaEnriching, setCastMediaEnriching] = useState(false);
  const [castMediaEnrichNotice, setCastMediaEnrichNotice] = useState<string | null>(null);
  const [castMediaEnrichError, setCastMediaEnrichError] = useState<string | null>(null);
  const [castRunFailedMembers, setCastRunFailedMembers] = useState<CastRunFailedMember[]>([]);
  const [castFailedMembersOpen, setCastFailedMembersOpen] = useState(false);
  const [refreshingPersonIds, setRefreshingPersonIds] = useState<Record<string, boolean>>({});
  const [refreshingPersonProgress, setRefreshingPersonProgress] = useState<
    Record<string, RefreshProgressState>
  >({});
  const castRefreshAbortControllerRef = useRef<AbortController | null>(null);
  const castMediaEnrichAbortControllerRef = useRef<AbortController | null>(null);
  const castLoadAbortControllerRef = useRef<AbortController | null>(null);
  const castLoadInFlightRef = useRef<Promise<TrrCastMember[]> | null>(null);
  const castAutoLoadAttemptedRef = useRef<string | null>(null);
  const castAutoRecoveryAttemptedRef = useRef<string | null>(null);
  const castSnapshotRef = useRef<{ cast: TrrCastMember[]; archive: TrrCastMember[] }>({
    cast: [],
    archive: [],
  });
  const castLoadedOnceRef = useRef(false);
  const personRefreshAbortControllersRef = useRef<Record<string, AbortController>>({});

  const showRouteState = useMemo(
    () => parseShowRouteState(pathname, new URLSearchParams(searchParams.toString())),
    [pathname, searchParams]
  );
  const showCastRouteState = useMemo(
    () => parseShowCastRouteState(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );
  const abortInFlightPersonRefreshRuns = useCallback(() => {
    for (const controller of Object.values(personRefreshAbortControllersRef.current)) {
      controller.abort();
    }
    personRefreshAbortControllersRef.current = {};
  }, []);

  useEffect(() => {
    showRolesSnapshotRef.current = showRoles;
  }, [showRoles]);

  useEffect(() => {
    showRolesLoadedOnceRef.current = showRolesLoadedOnce;
  }, [showRolesLoadedOnce]);

  useEffect(() => {
    castRoleMembersSnapshotRef.current = castRoleMembers;
  }, [castRoleMembers]);

  useEffect(() => {
    castRoleMembersLoadedOnceRef.current = castRoleMembersLoadedOnce;
  }, [castRoleMembersLoadedOnce]);

  useEffect(() => {
    castSnapshotRef.current = { cast, archive: archiveFootageCast };
  }, [archiveFootageCast, cast]);

  useEffect(() => {
    castLoadedOnceRef.current = castLoadedOnce;
  }, [castLoadedOnce]);

  useEffect(() => {
    setActiveTab(showRouteState.tab);
    if (showRouteState.tab === "assets") {
      setAssetsView(showRouteState.assetsSubTab);
    }
  }, [showRouteState.assetsSubTab, showRouteState.tab]);

  useEffect(() => {
    setCastSortBy(showCastRouteState.sortBy);
    setCastSortOrder(showCastRouteState.sortOrder);
    setCastHasImageFilter(showCastRouteState.hasImageFilter);
    setCastSeasonFilters((prev) =>
      areNumberArraysEqual(prev, showCastRouteState.seasonFilters)
        ? prev
        : showCastRouteState.seasonFilters
    );
    setCastRoleAndCreditFilters((prev) =>
      areStringArraysEqual(prev, showCastRouteState.filters) ? prev : showCastRouteState.filters
    );
    setCastSearchQuery(showCastRouteState.searchQuery);
  }, [
    showCastRouteState.hasImageFilter,
    showCastRouteState.filters,
    showCastRouteState.searchQuery,
    showCastRouteState.seasonFilters,
    showCastRouteState.sortBy,
    showCastRouteState.sortOrder,
  ]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCastSearchQueryDebounced(castSearchQuery.trim());
    }, 250);
    return () => clearTimeout(timeoutId);
  }, [castSearchQuery]);
  const castSearchQueryDeferred = useDeferredValue(castSearchQuery.trim().toLowerCase());

  const showSlugForRouting = useMemo(() => {
    return resolvePreferredShowRouteSlug({
      alternativeNames: show?.alternative_names,
      canonicalSlug: show?.canonical_slug,
      slug: show?.slug,
      fallback: showRouteParam,
    });
  }, [show?.alternative_names, show?.canonical_slug, show?.slug, showRouteParam]);

  const getActiveSocialSeasonNumber = useCallback((): number | null => {
    const selectedSeason =
      selectedSocialSeasonId != null
        ? seasons.find((season) => season.id === selectedSocialSeasonId) ?? null
        : null;
    if (
      selectedSeason &&
      typeof selectedSeason.season_number === "number" &&
      Number.isFinite(selectedSeason.season_number) &&
      selectedSeason.season_number > 0
    ) {
      return selectedSeason.season_number;
    }
    const fallbackSeason = [...seasons]
      .filter(
        (season) =>
          typeof season.season_number === "number" &&
          Number.isFinite(season.season_number) &&
          season.season_number > 0,
      )
      .sort((a, b) => b.season_number - a.season_number)[0];
    return fallbackSeason?.season_number ?? null;
  }, [seasons, selectedSocialSeasonId]);

  useEffect(() => {
    if (!show?.name || !showSlugForRouting) return;
    recordAdminRecentShow({
      slug: showSlugForRouting,
      label: show.name,
    });
  }, [show?.name, showSlugForRouting]);

  const socialAnalyticsView = useMemo<SocialAnalyticsView>(() => {
    const queryValue = normalizeSocialAnalyticsViewInput(searchParams.get("social_view"));
    if (isSocialAnalyticsView(queryValue)) return queryValue;
    const pathValue = normalizeSocialAnalyticsViewInput(parseSocialAnalyticsViewFromPath(pathname));
    return isSocialAnalyticsView(pathValue) ? pathValue : "bravo";
  }, [pathname, searchParams]);

  const socialPathFilters = useMemo(
    () => parseShowSocialPathFilters(pathname),
    [pathname],
  );

  const getSocialSeasonNumberForRouting = useCallback((): number | null => {
    if (socialPathFilters?.seasonNumber != null) {
      return socialPathFilters.seasonNumber;
    }
    return getActiveSocialSeasonNumber();
  }, [getActiveSocialSeasonNumber, socialPathFilters?.seasonNumber]);

  const socialPlatformTab = useMemo<PlatformTab>(() => {
    const value = searchParams.get("social_platform");
    if (isSocialPlatformTab(value)) return value;
    const fromPath = socialPathFilters?.platform;
    return fromPath ?? "overview";
  }, [searchParams, socialPathFilters?.platform]);

  const setTab = useCallback(
    (tab: TabId) => {
      if (
        tab !== "details" &&
        hasUnsavedDetailsChanges &&
        !window.confirm("You have unsaved show detail changes. Leave this tab?")
      ) {
        return;
      }
      setActiveTab(tab);
      const preservedQuery = cleanLegacyRoutingQuery(new URLSearchParams(searchParams.toString()));
      const socialSeasonNumber = getSocialSeasonNumberForRouting();
      router.replace(
        buildShowAdminUrl({
          showSlug: showSlugForRouting,
          tab,
          assetsSubTab: tab === "assets" ? assetsView : undefined,
          socialRoute:
            tab === "social"
              ? {
                  seasonNumber: socialSeasonNumber,
                  weekIndex: socialPathFilters?.weekIndex,
                  platform:
                    socialPathFilters?.platform ??
                    (socialPlatformTab !== "overview" ? socialPlatformTab : undefined),
                  handle: socialPathFilters?.handle,
                }
              : undefined,
          query: preservedQuery,
        }) as Route,
        { scroll: false }
      );
    },
    [
      assetsView,
      getSocialSeasonNumberForRouting,
      hasUnsavedDetailsChanges,
      router,
      searchParams,
      showSlugForRouting,
      socialPathFilters,
      socialPlatformTab,
    ]
  );

  useEffect(() => {
    if (!hasUnsavedDetailsChanges) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedDetailsChanges]);

  useEffect(() => {
    if (activeTab !== "cast") return;
    const currentQuery = new URLSearchParams(searchParams.toString());
    const nextQuery = writeShowCastRouteState(currentQuery, {
      searchQuery: castSearchQueryDebounced,
      sortBy: castSortBy,
      sortOrder: castSortOrder,
      hasImageFilter: castHasImageFilter,
      seasonFilters: castSeasonFilters,
      filters: castRoleAndCreditFilters,
    });
    const nextUrl = buildShowAdminUrl({
      showSlug: showSlugForRouting,
      tab: "cast",
      query: nextQuery,
    });
    const currentUrl = currentQuery.toString() ? `${pathname}?${currentQuery.toString()}` : pathname;
    if (nextUrl === currentUrl) return;
    router.replace(nextUrl as Route, { scroll: false });
  }, [
    activeTab,
    castHasImageFilter,
    castRoleAndCreditFilters,
    castSearchQueryDebounced,
    castSeasonFilters,
    castSortBy,
    castSortOrder,
    pathname,
    router,
    searchParams,
    showSlugForRouting,
  ]);

  const setSocialAnalyticsView = useCallback(
    (view: SocialAnalyticsView) => {
      const nextQuery = cleanLegacyRoutingQuery(new URLSearchParams(searchParams.toString()));
      nextQuery.delete("social_platform");
      if (view === "bravo") {
        nextQuery.delete("social_view");
      } else {
        nextQuery.set("social_view", view);
      }
      const socialSeasonNumber = getSocialSeasonNumberForRouting();
      router.replace(
        buildShowAdminUrl({
          showSlug: showSlugForRouting,
          tab: "social",
          query: nextQuery,
          socialRoute: {
            seasonNumber: socialSeasonNumber,
            weekIndex: socialPathFilters?.weekIndex,
            platform: socialPathFilters?.platform ?? (socialPlatformTab !== "overview" ? socialPlatformTab : undefined),
            handle: socialPathFilters?.handle,
          },
        }) as Route,
        { scroll: false },
      );
    },
    [getSocialSeasonNumberForRouting, router, searchParams, showSlugForRouting, socialPathFilters, socialPlatformTab],
  );

  const setSocialPlatformTab = useCallback(
    (tab: PlatformTab) => {
      const nextQuery = cleanLegacyRoutingQuery(new URLSearchParams(searchParams.toString()));
      nextQuery.delete("social_platform");
      const socialSeasonNumber = getSocialSeasonNumberForRouting();
      router.replace(
        buildShowAdminUrl({
          showSlug: showSlugForRouting,
          tab: "social",
          query: nextQuery,
          socialRoute: {
            seasonNumber: socialSeasonNumber,
            weekIndex: socialPathFilters?.weekIndex,
            platform: tab !== "overview" ? tab : undefined,
            handle: socialPathFilters?.handle,
          },
        }) as Route,
        { scroll: false },
      );
    },
    [
      getSocialSeasonNumberForRouting,
      router,
      searchParams,
      showSlugForRouting,
      socialPathFilters?.handle,
      socialPathFilters?.weekIndex,
    ],
  );

  const setAssetsSubTab = useCallback(
    (view: "images" | "videos" | "branding") => {
      setAssetsView(view);
      const preservedQuery = cleanLegacyRoutingQuery(new URLSearchParams(searchParams.toString()));
      router.replace(
        buildShowAdminUrl({
          showSlug: showSlugForRouting,
          tab: "assets",
          assetsSubTab: view,
          query: preservedQuery,
        }) as Route,
        { scroll: false }
      );
    },
    [router, searchParams, showSlugForRouting]
  );

  // Helper to get auth headers
  const getAuthHeaders = useCallback(async () => {
    return getClientAuthHeaders({ allowDevAdminBypass: true });
  }, []);

  useEffect(() => {
    if (checking || !hasAccess) return;
    const raw = typeof showRouteParam === "string" ? showRouteParam.trim() : "";
    if (!raw) {
      setResolvedShowId(null);
      setSlugResolutionLoading(false);
      setSlugResolutionError("Missing show identifier.");
      return;
    }
    if (looksLikeUuid(raw)) {
      setResolvedShowId(raw);
      setSlugResolutionLoading(false);
      setSlugResolutionError(null);
      return;
    }

    let cancelled = false;
    const resolveSlug = async () => {
      setSlugResolutionLoading(true);
      setSlugResolutionError(null);
      try {
        for (let attempt = 0; attempt < 4; attempt += 1) {
          try {
            const headers = await getAuthHeaders();
            const response = await fetchWithTimeout(
              `/api/admin/trr-api/shows/resolve-slug?slug=${encodeURIComponent(raw)}`,
              { headers, cache: "no-store" },
              SHOW_CORE_LOAD_TIMEOUT_MS
            );
            const data = (await response.json().catch(() => ({}))) as {
              error?: string;
              resolved?: { show_id?: string | null };
            };
            if (!response.ok) {
              throw new Error(data.error || "Failed to resolve show slug");
            }
            const nextShowId =
              typeof data.resolved?.show_id === "string" && looksLikeUuid(data.resolved.show_id)
                ? data.resolved.show_id
                : null;
            if (!nextShowId) throw new Error("Resolved show slug did not return a valid show id.");
            if (cancelled) return;
            setResolvedShowId(nextShowId);
            return;
          } catch (err) {
            if (cancelled) return;
            if (isTransientNotAuthenticatedError(err) && attempt < 3) {
              await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 250));
              continue;
            }
            setResolvedShowId(null);
            setSlugResolutionError(
              err instanceof Error ? err.message : "Could not resolve show URL slug."
            );
            return;
          }
        }
      } catch (err) {
        if (cancelled) return;
        setResolvedShowId(null);
        setSlugResolutionError(
          err instanceof Error ? err.message : "Could not resolve show URL slug."
        );
      } finally {
        if (!cancelled) setSlugResolutionLoading(false);
      }
    };

    void resolveSlug();
    return () => {
      cancelled = true;
    };
  }, [
    checking,
    getAuthHeaders,
    hasAccess,
    setResolvedShowId,
    setSlugResolutionError,
    setSlugResolutionLoading,
    showRouteParam,
  ]);

  useEffect(() => {
    if (!showSlugForRouting) return;

    const preservedQuery = cleanLegacyRoutingQuery(new URLSearchParams(searchParams.toString()));
    if (showRouteState.tab === "social") {
      preservedQuery.delete("social_platform");
      if (socialAnalyticsView === "bravo") {
        preservedQuery.delete("social_view");
      } else {
        preservedQuery.set("social_view", socialAnalyticsView);
      }
    }
    const socialSeasonNumber = getSocialSeasonNumberForRouting();
    const canonicalRouteUrl = buildShowAdminUrl({
      showSlug: showSlugForRouting,
      tab: showRouteState.tab,
      assetsSubTab: showRouteState.assetsSubTab,
      query: preservedQuery,
      socialView: showRouteState.tab === "social" ? socialAnalyticsView : undefined,
      socialRoute:
        showRouteState.tab === "social"
          ? {
              seasonNumber: socialSeasonNumber,
              weekIndex: socialPathFilters?.weekIndex,
              platform:
                socialPathFilters?.platform ??
                (socialPlatformTab !== "overview" ? socialPlatformTab : undefined),
              handle: socialPathFilters?.handle,
            }
          : undefined,
    });
    const currentHasLegacyRoutingQuery =
      searchParams.has("tab") || searchParams.has("assets") || searchParams.has("social_platform");
    const canonicalPath = canonicalRouteUrl.split("?")[0] ?? canonicalRouteUrl;
    const currentPath = pathname;
    const pathMismatch = currentPath !== canonicalPath;
    if (!pathMismatch && !currentHasLegacyRoutingQuery) return;

    const currentCleanedQuery = preservedQuery.toString();
    const canonicalQuery = canonicalRouteUrl.includes("?")
      ? (canonicalRouteUrl.split("?")[1] ?? "")
      : "";
    if (!pathMismatch && currentCleanedQuery === canonicalQuery) return;
    router.replace(canonicalRouteUrl as Route, { scroll: false });
  }, [
    pathname,
    router,
    searchParams,
    socialAnalyticsView,
    getSocialSeasonNumberForRouting,
    socialPathFilters,
    socialPlatformTab,
    showSlugForRouting,
    showRouteState.assetsSubTab,
    showRouteState.tab,
  ]);

  const appendRefreshLog = useCallback(
    (entry: {
      category: string;
      message: string;
      current?: number | null;
      total?: number | null;
      stageKey?: string | null;
      topic?: string | null;
      provider?: string | null;
    }) => {
      const normalizedMessage = normalizeRefreshLogMessage(entry.message);
      if (!normalizedMessage) return;
      setRefreshLogEntries((prev) => {
        const nextEntry: RefreshLogEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          at: new Date().toISOString(),
          category: entry.category.trim() || "Refresh",
          message: normalizedMessage,
          current:
            typeof entry.current === "number" && Number.isFinite(entry.current)
              ? entry.current
              : null,
          total:
            typeof entry.total === "number" && Number.isFinite(entry.total) ? entry.total : null,
          stageKey: typeof entry.stageKey === "string" && entry.stageKey.trim() ? entry.stageKey.trim() : null,
          topic: resolveRefreshLogTopicKey({
            topic: entry.topic,
            stageKey: entry.stageKey,
            category: entry.category,
            message: normalizedMessage,
          }),
          provider: typeof entry.provider === "string" && entry.provider.trim() ? entry.provider.trim() : null,
        };
        const previous = prev[prev.length - 1];
        if (
          previous &&
          shouldDedupeRefreshLogEntry(
            {
              topic: previous.topic,
              stageKey: previous.stageKey,
              category: previous.category,
              message: previous.message,
              current: previous.current,
              total: previous.total,
            },
            {
              topic: nextEntry.topic,
              stageKey: nextEntry.stageKey,
              category: nextEntry.category,
              message: nextEntry.message,
              current: nextEntry.current,
              total: nextEntry.total,
            }
          )
        ) {
          return prev;
        }
        return [...prev.slice(-149), nextEntry];
      });
    },
    []
  );

  const refreshLogTopicGroups = useMemo(() => {
    const grouped = new Map<RefreshLogTopicKey, RefreshLogEntry[]>();
    for (const topic of REFRESH_LOG_TOPIC_DEFINITIONS) {
      grouped.set(topic.key, []);
    }
    for (const entry of refreshLogEntries) {
      const topicKey = resolveRefreshLogTopicKey(entry);
      if (!topicKey) continue;
      grouped.get(topicKey)?.push(entry);
    }

    const groups = REFRESH_LOG_TOPIC_DEFINITIONS.map((topic) => {
      const entries = grouped.get(topic.key) ?? [];
      const latest = entries.length > 0 ? entries[entries.length - 1] : null;
      const failed = isRefreshTopicFailed(latest);
      const done = !failed && isRefreshTopicDone(latest);
      const forceActivePeopleTopic =
        topic.key === "people" &&
        Boolean(refreshingTargets.cast_credits || castRefreshPipelineRunning || castMediaEnriching);
      const status: "pending" | "active" | "done" | "failed" = failed
        ? "failed"
        : forceActivePeopleTopic
          ? "active"
        : done
          ? "done"
          : entries.length > 0
            ? "active"
            : "pending";
      return {
        topic,
        entries,
        entriesForView: [...entries].reverse(),
        latest,
        status,
      };
    });

    return [
      ...groups.filter((group) => group.status !== "done"),
      ...groups.filter((group) => group.status === "done"),
    ];
  }, [
    castMediaEnriching,
    castRefreshPipelineRunning,
    refreshLogEntries,
    refreshingTargets.cast_credits,
  ]);

  // Refresh images for a person with streaming progress when available.
  const refreshPersonImages = useCallback(
    async (
      personId: string,
      onProgress?: (progress: RefreshProgressState) => void,
      options?: { mode?: PersonRefreshMode; signal?: AbortSignal }
    ) => {
      const headers = await getAuthHeaders();
      const mode = options?.mode ?? "full";
      const externalSignal = options?.signal;
      const isIngestOnly = mode === "ingest_only";
      const isProfileOnly = mode === "profile_only";
      const baseProgressMessage = isIngestOnly
        ? "Ingesting cast media..."
        : isProfileOnly
          ? "Syncing cast bios and profile intelligence..."
          : "Refreshing cast media...";
      const completeProgressMessage = isIngestOnly
        ? "Cast media ingest complete."
        : isProfileOnly
          ? "Cast bios/profile sync complete."
          : "Cast media refresh complete.";
      const body = isIngestOnly
        ? {
            skip_mirror: false,
            show_id: showId,
            sources: ["imdb", "tmdb"],
            skip_auto_count: true,
            skip_word_detection: true,
            skip_centering: true,
            skip_resize: true,
          }
        : isProfileOnly
          ? {
              skip_mirror: true,
              skip_prune: true,
              show_id: showId,
              limit_per_source: 1,
              sources: ["tmdb", "fandom"],
              skip_auto_count: true,
              skip_word_detection: true,
              skip_centering: true,
              skip_resize: true,
            }
          : { skip_mirror: false, show_id: showId };

      if (externalSignal?.aborted) {
        throw new Error("Cast refresh canceled.");
      }

      try {
        const streamController = new AbortController();
        const forwardExternalAbort = () => streamController.abort();
        if (externalSignal) {
          externalSignal.addEventListener("abort", forwardExternalAbort, { once: true });
        }
        const streamTimeout = setTimeout(
          () => streamController.abort(),
          PERSON_REFRESH_STREAM_TIMEOUT_MS
        );
        let streamIdleTimeout: ReturnType<typeof setTimeout> | null = null;
        const bumpStreamIdleTimeout = () => {
          if (streamIdleTimeout) clearTimeout(streamIdleTimeout);
          streamIdleTimeout = setTimeout(
            () => streamController.abort(),
            PERSON_REFRESH_STREAM_IDLE_TIMEOUT_MS
          );
        };
        const clearStreamIdleTimeout = () => {
          if (streamIdleTimeout) clearTimeout(streamIdleTimeout);
          streamIdleTimeout = null;
        };
        bumpStreamIdleTimeout();
        try {
          const streamResponse = await fetch(
            `/api/admin/trr-api/people/${personId}/refresh-images/stream`,
            {
              method: "POST",
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify(body),
              signal: streamController.signal,
            }
          );

          if (!streamResponse.ok || !streamResponse.body) {
            throw new Error("Person refresh stream unavailable");
          }

          const reader = streamResponse.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let completePayload: Record<string, unknown> | null = null;
          let shouldStopReading = false;

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            bumpStreamIdleTimeout();
            buffer += decoder.decode(value, { stream: true });
            buffer = buffer.replace(/\r\n/g, "\n");

            let boundaryIndex = buffer.indexOf("\n\n");
            while (boundaryIndex !== -1) {
              const rawEvent = buffer.slice(0, boundaryIndex);
              buffer = buffer.slice(boundaryIndex + 2);

              const lines = rawEvent.split("\n").filter(Boolean);
              let eventType = "message";
              const dataLines: string[] = [];
              for (const line of lines) {
                if (line.startsWith("event:")) {
                  eventType = line.slice(6).trim();
                } else if (line.startsWith("data:")) {
                  dataLines.push(line.slice(5).trim());
                }
              }

              const dataStr = dataLines.join("\n");
              let payload: Record<string, unknown> | string = dataStr;
              try {
                payload = JSON.parse(dataStr) as Record<string, unknown>;
              } catch {
                payload = dataStr;
              }

              if (eventType === "progress" && payload && typeof payload === "object") {
                const stageLabel = resolveStageLabel(
                  (payload as { stage?: unknown }).stage,
                  PERSON_REFRESH_STAGE_LABELS
                );
                const current = parseProgressNumber((payload as { current?: unknown }).current);
                const total = parseProgressNumber((payload as { total?: unknown }).total);
                onProgress?.({
                  stage: stageLabel,
                  message: buildProgressMessage(
                    stageLabel,
                    (payload as { message?: unknown }).message,
                    baseProgressMessage
                  ),
                  current,
                  total,
                });
              } else if (eventType === "error") {
                const message =
                  payload && typeof payload === "object"
                    ? (payload as { error?: unknown; detail?: unknown })
                    : null;
                const errorText =
                  typeof message?.error === "string" && message.error
                    ? message.error
                    : "Failed to refresh person images";
                const detailText =
                  typeof message?.detail === "string" && message.detail ? message.detail : null;
                throw new Error(detailText ? `${errorText}: ${detailText}` : errorText);
              } else if (eventType === "complete") {
                completePayload =
                  payload && typeof payload === "object"
                    ? (payload as Record<string, unknown>)
                    : {};
                shouldStopReading = true;
              }

              if (shouldStopReading) {
                break;
              }
              boundaryIndex = buffer.indexOf("\n\n");
            }
            if (shouldStopReading) {
              break;
            }
          }

          clearStreamIdleTimeout();
          if (shouldStopReading) {
            try {
              await reader.cancel();
            } catch {
              // no-op
            }
          }

          return completePayload ?? {};
        } finally {
          if (externalSignal) {
            externalSignal.removeEventListener("abort", forwardExternalAbort);
          }
          clearStreamIdleTimeout();
          clearTimeout(streamTimeout);
        }
      } catch (streamErr) {
        if (isAbortError(streamErr) && externalSignal?.aborted) {
          throw new Error("Cast refresh canceled.");
        }
        console.warn("Person refresh stream failed, falling back to non-stream.", streamErr);
      }

      onProgress?.({
        stage: "Fallback",
        message: baseProgressMessage,
        current: null,
        total: null,
      });

      const fallbackController = new AbortController();
      const forwardExternalAbort = () => fallbackController.abort();
      if (externalSignal) {
        externalSignal.addEventListener("abort", forwardExternalAbort, { once: true });
      }
      const fallbackTimeout = setTimeout(
        () => fallbackController.abort(),
        PERSON_REFRESH_FALLBACK_TIMEOUT_MS
      );
      let response: Response;
      try {
        response = await fetch(`/api/admin/trr-api/people/${personId}/refresh-images`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: fallbackController.signal,
        });
      } catch (fallbackErr) {
        if (isAbortError(fallbackErr) && externalSignal?.aborted) {
          throw new Error("Cast refresh canceled.");
        }
        if (isAbortError(fallbackErr)) {
          throw new Error(
            `Timed out ${
              isIngestOnly ? "ingesting" : isProfileOnly ? "syncing cast bios/profiles for" : "refreshing"
            } cast media after ${Math.round(
              PERSON_REFRESH_FALLBACK_TIMEOUT_MS / 1000
            )}s.`
          );
        }
        throw fallbackErr;
      } finally {
        if (externalSignal) {
          externalSignal.removeEventListener("abort", forwardExternalAbort);
        }
        clearTimeout(fallbackTimeout);
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          data.error && data.detail
            ? `${data.error}: ${data.detail}`
            : data.error || data.detail || "Failed to refresh images";
        throw new Error(message);
      }

      onProgress?.({
        stage: "Complete",
        message: completeProgressMessage,
        current: 1,
        total: 1,
      });
      return data;
    },
    [getAuthHeaders, showId]
  );

  const reprocessPersonImages = useCallback(
    async (
      personId: string,
      onProgress?: (progress: RefreshProgressState) => void,
      options?: { signal?: AbortSignal }
    ) => {
      const headers = await getAuthHeaders();
      const externalSignal = options?.signal;
      if (externalSignal?.aborted) {
        throw new Error("Cast media enrich canceled.");
      }
      const streamController = new AbortController();
      const forwardExternalAbort = () => streamController.abort();
      if (externalSignal) {
        externalSignal.addEventListener("abort", forwardExternalAbort, { once: true });
      }
      const streamTimeout = setTimeout(
        () => streamController.abort(),
        PERSON_REFRESH_STREAM_TIMEOUT_MS
      );
      let streamIdleTimeout: ReturnType<typeof setTimeout> | null = null;
      const bumpStreamIdleTimeout = () => {
        if (streamIdleTimeout) clearTimeout(streamIdleTimeout);
        streamIdleTimeout = setTimeout(
          () => streamController.abort(),
          PERSON_REFRESH_STREAM_IDLE_TIMEOUT_MS
        );
      };
      const clearStreamIdleTimeout = () => {
        if (streamIdleTimeout) clearTimeout(streamIdleTimeout);
        streamIdleTimeout = null;
      };

      bumpStreamIdleTimeout();
      try {
        const streamResponse = await fetch(
          `/api/admin/trr-api/people/${personId}/reprocess-images/stream`,
          {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            signal: streamController.signal,
          }
        );

        if (!streamResponse.ok || !streamResponse.body) {
          throw new Error("Person reprocess stream unavailable");
        }

        const reader = streamResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let completePayload: Record<string, unknown> | null = null;
        let shouldStopReading = false;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          bumpStreamIdleTimeout();
          buffer += decoder.decode(value, { stream: true });
          buffer = buffer.replace(/\r\n/g, "\n");

          let boundaryIndex = buffer.indexOf("\n\n");
          while (boundaryIndex !== -1) {
            const rawEvent = buffer.slice(0, boundaryIndex);
            buffer = buffer.slice(boundaryIndex + 2);

            const lines = rawEvent.split("\n").filter(Boolean);
            let eventType = "message";
            const dataLines: string[] = [];
            for (const line of lines) {
              if (line.startsWith("event:")) {
                eventType = line.slice(6).trim();
              } else if (line.startsWith("data:")) {
                dataLines.push(line.slice(5).trim());
              }
            }

            const dataStr = dataLines.join("\n");
            let payload: Record<string, unknown> | string = dataStr;
            try {
              payload = JSON.parse(dataStr) as Record<string, unknown>;
            } catch {
              payload = dataStr;
            }

            if (eventType === "progress" && payload && typeof payload === "object") {
              const stageLabel = resolveStageLabel(
                (payload as { stage?: unknown }).stage,
                PERSON_REFRESH_STAGE_LABELS
              );
              const current = parseProgressNumber((payload as { current?: unknown }).current);
              const total = parseProgressNumber((payload as { total?: unknown }).total);
              onProgress?.({
                stage: stageLabel,
                message: buildProgressMessage(
                  stageLabel,
                  (payload as { message?: unknown }).message,
                  "Enriching existing cast media..."
                ),
                current,
                total,
              });
            } else if (eventType === "error") {
              const message =
                payload && typeof payload === "object"
                  ? (payload as { error?: unknown; detail?: unknown })
                  : null;
              const errorText =
                typeof message?.error === "string" && message.error
                  ? message.error
                  : "Failed to reprocess person images";
              const detailText =
                typeof message?.detail === "string" && message.detail ? message.detail : null;
              throw new Error(detailText ? `${errorText}: ${detailText}` : errorText);
            } else if (eventType === "complete") {
              completePayload =
                payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
              shouldStopReading = true;
            }

            if (shouldStopReading) {
              break;
            }
            boundaryIndex = buffer.indexOf("\n\n");
          }

          if (shouldStopReading) {
            break;
          }
        }

        clearStreamIdleTimeout();
        if (shouldStopReading) {
          try {
            await reader.cancel();
          } catch {
            // no-op
          }
          return completePayload ?? {};
        }
        throw new Error("Reprocess stream ended before completion.");
      } catch (streamErr) {
        if (isAbortError(streamErr) && externalSignal?.aborted) {
          throw new Error("Cast media enrich canceled.");
        }
        if (isAbortError(streamErr)) {
          throw new Error(
            `Timed out enriching cast media after ${Math.round(PERSON_REFRESH_STREAM_TIMEOUT_MS / 1000)}s.`
          );
        }
        throw streamErr;
      } finally {
        if (externalSignal) {
          externalSignal.removeEventListener("abort", forwardExternalAbort);
        }
        clearStreamIdleTimeout();
        clearTimeout(streamTimeout);
      }
    },
    [getAuthHeaders]
  );

  const refreshCastProfilesAndMedia = useCallback(
    async (
      members: TrrCastMember[],
      options?: {
        mode?: PersonRefreshMode;
        stageLabel?: string;
        category?: string;
        signal?: AbortSignal;
      }
    ) => {
      const mode = options?.mode ?? "full";
      const isIngestOnly = mode === "ingest_only";
      const isProfileOnly = mode === "profile_only";
      const stageLabel =
        options?.stageLabel
        ?? (isIngestOnly
          ? "Cast Media Ingest"
          : isProfileOnly
            ? "Cast Bios"
            : "Cast Profiles & Media");
      const category =
        options?.category
        ?? (isIngestOnly ? "Cast Media Ingest" : isProfileOnly ? "Cast Bios" : "Cast Profiles");
      const startMessage =
        isIngestOnly
          ? "Ingesting cast member media from IMDb/TMDb..."
          : isProfileOnly
            ? "Syncing cast bios and profile intelligence..."
            : "Syncing cast profiles and media from TMDb/IMDb/Fandom...";
      const completionPrefix =
        isIngestOnly
          ? "Completed cast media ingest"
          : isProfileOnly
            ? "Completed cast bios/profile sync"
            : "Completed cast profile/media sync";
      const failureVerb = isIngestOnly ? "ingest" : isProfileOnly ? "sync bios for" : "sync";

      const uniqueMembers = Array.from(
        new Map(
          members
            .filter((member) => typeof member.person_id === "string" && member.person_id.trim())
            .map((member) => [member.person_id, member] as const)
        ).values()
      );

      const total = uniqueMembers.length;
      if (total === 0) {
        return { attempted: 0, succeeded: 0, failed: 0, failedMembers: [] as CastRunFailedMember[] };
      }
      const throwIfAborted = () => {
        if (options?.signal?.aborted) {
          throw new Error(`${stageLabel} canceled.`);
        }
      };
      throwIfAborted();

      let succeeded = 0;
      let failed = 0;
      let completed = 0;
      let dispatched = 0;
      let inFlight = 0;
      let nextIndex = 0;
      const failedMembers: CastRunFailedMember[] = [];
      const concurrency = Math.max(1, Math.min(CAST_PROFILE_SYNC_CONCURRENCY, total));
      const longRunningHint = isIngestOnly && total > 30 ? " This may take several minutes." : "";

      const batchCountsMessage = ({
        completed: completedCount,
        inFlight: inFlightCount,
      }: {
        completed: number;
        inFlight: number;
      }) =>
        isIngestOnly
          ? `Ingesting media: ${completedCount}/${total} complete (${inFlightCount} in flight)`
          : formatCastBatchRunningMessage({ completed: completedCount, total, inFlight: inFlightCount });

      const memberBatchMessage = (label: string, completedCount: number, inFlightCount: number) =>
        isIngestOnly
          ? `${batchCountsMessage({ completed: completedCount, inFlight: inFlightCount })} — ${label}`
          : formatCastBatchMemberMessage(label, { completed: completedCount, total, inFlight: inFlightCount });

      const setCastBatchProgress = (message: string, stage = stageLabel) => {
        setRefreshTargetProgress((prev) => ({
          ...prev,
          cast_credits: {
            stage,
            message,
            current: completed,
            total,
          },
        }));
      };

      setRefreshTargetProgress((prev) => ({
        ...prev,
        cast_credits: {
          stage: stageLabel,
          message: `${batchCountsMessage({ completed, inFlight })}.${longRunningHint}`,
          current: 0,
          total,
        },
      }));
      appendRefreshLog({
        category,
        message: `${startMessage} (${total} members, concurrency ${concurrency}).${longRunningHint}`,
        current: 0,
        total,
      });

      const syncMember = async (memberIndex: number) => {
        const member = uniqueMembers[memberIndex];
        const label =
          member.full_name || member.cast_member_name || `Cast member ${memberIndex + 1}`;
        throwIfAborted();
        dispatched += 1;
        inFlight += 1;
        setCastBatchProgress(memberBatchMessage(label, completed, inFlight));
        appendRefreshLog({
          category,
          message: memberBatchMessage(label, completed, inFlight),
          current: completed,
          total,
        });

        try {
          await refreshPersonImages(
            member.person_id,
            (progress) => {
              throwIfAborted();
              setRefreshTargetProgress((prev) => ({
                ...prev,
                cast_credits: {
                  stage: progress.stage ?? stageLabel,
                  message:
                    progress.message
                      ? isIngestOnly
                        ? `${batchCountsMessage({ completed, inFlight })} — ${label}: ${progress.message}`
                        : `${label}: ${progress.message} (${formatCastBatchCounts({
                            completed,
                            total,
                            inFlight,
                          })})`
                      : memberBatchMessage(label, completed, inFlight),
                  current: completed,
                  total,
                },
              }));
            },
            { mode, signal: options?.signal }
          );
          succeeded += 1;
        } catch (err) {
          console.warn(`Failed to ${failureVerb} cast media for ${label}:`, err);
          const errorText = err instanceof Error ? err.message : "unknown error";
          if (options?.signal?.aborted || /canceled/i.test(errorText)) {
            throw new Error(`${stageLabel} canceled.`);
          }
          appendRefreshLog({
            category,
            message: `Failed to ${failureVerb} ${label}: ${errorText}`,
            current: completed,
            total,
          });
          failedMembers.push({
            personId: member.person_id,
            name: label,
            reason: errorText,
          });
          failed += 1;
        } finally {
          completed += 1;
          inFlight = Math.max(0, inFlight - 1);
          setCastBatchProgress(batchCountsMessage({ completed, inFlight }));
        }
      };

      const runWorker = async () => {
        while (true) {
          throwIfAborted();
          const memberIndex = nextIndex;
          nextIndex += 1;
          if (memberIndex >= total) {
            return;
          }
          await syncMember(memberIndex);
        }
      };

      await Promise.all(Array.from({ length: concurrency }, () => runWorker()));

      setCastBatchProgress(
        `${completionPrefix} (${succeeded}/${total} succeeded${failed > 0 ? `, ${failed} failed` : ""}).`
      );
      appendRefreshLog({
        category,
        message: `${completionPrefix} (${succeeded}/${total} succeeded${failed > 0 ? `, ${failed} failed` : ""}, dispatched ${dispatched}/${total}).`,
        current: total,
        total,
      });
      return { attempted: total, succeeded, failed, failedMembers };
    },
    [appendRefreshLog, refreshPersonImages]
  );

  const reprocessCastMedia = useCallback(
    async (
      members: TrrCastMember[],
      options?: { signal?: AbortSignal }
    ): Promise<{
      attempted: number;
      succeeded: number;
      failed: number;
      failedMembers: CastRunFailedMember[];
    }> => {
      const uniqueMembers = Array.from(
        new Map(
          members
            .filter((member) => typeof member.person_id === "string" && member.person_id.trim())
            .map((member) => [member.person_id, member] as const)
        ).values()
      );

      const total = uniqueMembers.length;
      if (total === 0) {
        return { attempted: 0, succeeded: 0, failed: 0, failedMembers: [] as CastRunFailedMember[] };
      }
      const throwIfAborted = () => {
        if (options?.signal?.aborted) {
          throw new Error("Cast media enrich canceled.");
        }
      };
      throwIfAborted();

      let succeeded = 0;
      let failed = 0;
      let completed = 0;
      let inFlight = 0;
      let nextIndex = 0;
      const failedMembers: CastRunFailedMember[] = [];
      const concurrency = Math.max(1, Math.min(CAST_PROFILE_SYNC_CONCURRENCY, total));

      const setCastBatchProgress = (message: string, stage = "Cast Media Enrich") => {
        setRefreshTargetProgress((prev) => ({
          ...prev,
          cast_credits: {
            stage,
            message,
            current: completed,
            total,
          },
        }));
      };

      setRefreshTargetProgress((prev) => ({
        ...prev,
        cast_credits: {
          stage: "Cast Media Enrich",
          message: `Enriching existing cast media (count, word detection, crop, resize)... (${formatCastBatchCounts({
            completed,
            total,
            inFlight,
          })})`,
          current: 0,
          total,
        },
      }));
      appendRefreshLog({
        category: "Cast Media Enrich",
        message: `Enriching existing cast media (${total} members, concurrency ${concurrency}).`,
        current: 0,
        total,
      });

      const reprocessMember = async (memberIndex: number) => {
        const member = uniqueMembers[memberIndex];
        const label =
          member.full_name || member.cast_member_name || `Cast member ${memberIndex + 1}`;
        inFlight += 1;
        setCastBatchProgress(formatCastBatchMemberMessage(label, { completed, total, inFlight }));
        appendRefreshLog({
          category: "Cast Media Enrich",
          message: formatCastBatchMemberMessage(label, { completed, total, inFlight }),
          current: completed,
          total,
        });

        try {
          throwIfAborted();
          await reprocessPersonImages(member.person_id, (progress) => {
            throwIfAborted();
            setRefreshTargetProgress((prev) => ({
              ...prev,
              cast_credits: {
                stage: progress.stage ?? "Cast Media Enrich",
                message:
                  progress.message
                    ? `${label}: ${progress.message} (${formatCastBatchCounts({
                        completed,
                        total,
                        inFlight,
                      })})`
                    : formatCastBatchMemberMessage(label, { completed, total, inFlight }),
                current: completed,
                total,
                },
              }));
          }, { signal: options?.signal });
          succeeded += 1;
        } catch (err) {
          if (options?.signal?.aborted) {
            throw new Error("Cast media enrich canceled.");
          }
          console.warn(`Failed to enrich cast media for ${label}:`, err);
          const errorText = err instanceof Error ? err.message : "unknown error";
          appendRefreshLog({
            category: "Cast Media Enrich",
            message: `Failed to enrich ${label}: ${errorText}`,
            current: completed,
            total,
          });
          failedMembers.push({
            personId: member.person_id,
            name: label,
            reason: errorText,
          });
          failed += 1;
        } finally {
          completed += 1;
          inFlight = Math.max(0, inFlight - 1);
          setCastBatchProgress(formatCastBatchRunningMessage({ completed, total, inFlight }));
        }
      };

      const runWorker = async () => {
        while (true) {
          throwIfAborted();
          const memberIndex = nextIndex;
          nextIndex += 1;
          if (memberIndex >= total) {
            return;
          }
          await reprocessMember(memberIndex);
        }
      };

      await Promise.all(Array.from({ length: concurrency }, () => runWorker()));

      setCastBatchProgress(
        `Completed cast media enrich (${succeeded}/${total} succeeded${failed > 0 ? `, ${failed} failed` : ""}).`
      );
      appendRefreshLog({
        category: "Cast Media Enrich",
        message: `Completed cast media enrich (${succeeded}/${total} succeeded${failed > 0 ? `, ${failed} failed` : ""}).`,
        current: total,
        total,
      });
      return { attempted: total, succeeded, failed, failedMembers };
    },
    [appendRefreshLog, reprocessPersonImages]
  );

  // Fetch show details
  const fetchShow = useCallback(async () => {
    const requestShowId = showId;
    if (!requestShowId) return;
    try {
      const headers = await getAuthHeaders();
      const data = await adminGetJson<{ show?: TrrShow }>(
        `/api/admin/trr-api/shows/${requestShowId}`,
        {
          headers,
          timeoutMs: SHOW_CORE_LOAD_TIMEOUT_MS,
        }
      );
      if (!isCurrentShowId(requestShowId)) return;
      setShow(data.show ?? null);
      setError(null);
    } catch (err) {
      if (!isCurrentShowId(requestShowId)) return;
      const message =
        err instanceof AdminRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load show";
      setError(message);
    }
  }, [getAuthHeaders, isCurrentShowId, showId]);

  const setFeaturedShowImage = useCallback(
    async (kind: "poster" | "backdrop", showImageId: string | null) => {
      if (!showId) return;
      const headers = await getAuthHeaders();
      const payload =
        kind === "poster"
          ? { primary_poster_image_id: showImageId }
          : { primary_backdrop_image_id: showImageId };
      const response = await fetchWithTimeout(
        `/api/admin/trr-api/shows/${showId}`,
        {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        SETTINGS_MUTATION_TIMEOUT_MS
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          (data as { error?: string }).error ||
          `Failed to set featured ${kind} (HTTP ${response.status})`;
        throw new Error(message);
      }
      const nextShow = (data as { show?: TrrShow }).show ?? null;
      if (nextShow) {
        setShow(nextShow);
      }
    },
    [getAuthHeaders, showId]
  );

  const saveShowDetails = useCallback(async () => {
    if (!show) return;
    const displayName = detailsForm.displayName.trim();
    if (!displayName) {
      setDetailsError("Display Name is required.");
      return;
    }

    const nickname = detailsForm.nickname.trim();
    const altNames = parseAltNamesText(detailsForm.altNamesText);
    const allAltNames = [
      ...(nickname ? [nickname] : []),
      ...altNames.filter((name) => name.toLowerCase() !== nickname.toLowerCase()),
    ].filter((name) => name.toLowerCase() !== displayName.toLowerCase());

    setDetailsSaving(true);
    setDetailsError(null);
    setDetailsNotice(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout(
        `/api/admin/trr-api/shows/${showId}`,
        {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            name: displayName,
            nickname: nickname || "",
            alternative_names: allAltNames,
            description: detailsForm.description.trim() || "",
            premiere_date: detailsForm.premiereDate || "",
          }),
        },
        SETTINGS_MUTATION_TIMEOUT_MS
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          (data as { error?: string }).error ||
          `Failed to save show details (HTTP ${response.status})`;
        throw new Error(message);
      }
      const nextShow = (data as { show?: TrrShow }).show ?? null;
      if (nextShow) {
        setShow(nextShow);
      }
      setDetailsNotice("Show details saved.");
      setDetailsEditing(false);
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : "Failed to save show details");
    } finally {
      setDetailsSaving(false);
    }
  }, [detailsForm, getAuthHeaders, show, showId]);

  useEffect(() => {
    if (!show) return;
    const alternatives = Array.isArray(show.alternative_names)
      ? show.alternative_names.filter((name) => typeof name === "string" && name.trim().length > 0)
      : [];
    const [nickname = "", ...restAlt] = alternatives;
    setDetailsForm({
      displayName: show.name ?? "",
      nickname,
      altNamesText: restAlt.join("\n"),
      description: show.description ?? "",
      premiereDate: show.premiere_date ?? "",
    });
  }, [show]);

  const startDetailsEdit = useCallback(() => {
    setDetailsNotice(null);
    setDetailsError(null);
    setDetailsEditing(true);
  }, []);

  const cancelDetailsEdit = useCallback(() => {
    if (show) {
      const alternatives = Array.isArray(show.alternative_names)
        ? show.alternative_names.filter((name) => typeof name === "string" && name.trim().length > 0)
        : [];
      const [nickname = "", ...restAlt] = alternatives;
      setDetailsForm({
        displayName: show.name ?? "",
        nickname,
        altNamesText: restAlt.join("\n"),
        description: show.description ?? "",
        premiereDate: show.premiere_date ?? "",
      });
    }
    setDetailsNotice(null);
    setDetailsError(null);
    setDetailsEditing(false);
  }, [show]);

  // Fetch seasons
  const fetchSeasons = useCallback(async () => {
    const requestShowId = showId;
    if (!requestShowId) return;
    try {
      const headers = await getAuthHeaders();
      const data = await adminGetJson<{ seasons?: TrrSeason[] }>(
        `/api/admin/trr-api/shows/${requestShowId}/seasons?limit=50`,
        {
          headers,
          timeoutMs: SHOW_CORE_LOAD_TIMEOUT_MS,
        }
      );
      const nextSeasons = Array.isArray(data.seasons) ? data.seasons : [];
      if (!isCurrentShowId(requestShowId)) return;
      setSeasons(nextSeasons);
      setSocialDependencyError(null);
    } catch (err) {
      if (!isCurrentShowId(requestShowId)) return;
      const message = err instanceof Error ? err.message : "Failed to fetch seasons";
      console.warn("Failed to fetch seasons:", message);
      setSocialDependencyError(message);
    }
  }, [getAuthHeaders, isCurrentShowId, showId]);

  const fetchSeasonEpisodeSummaries = useCallback(
    async (seasonList: TrrSeason[]) => {
      if (seasonList.length === 0) {
        setSeasonEpisodeSummaries({});
        setSeasonSummariesLoading(false);
        return;
      }
      setSeasonSummariesLoading(true);
      try {
        const headers = await getAuthHeaders();
        const results: Array<
          | {
              seasonId: string;
              summary: { count: number; premiereDate: string | null; finaleDate: string | null };
            }
          | { seasonId: string; error: string }
        > = [];
        const workerCount = Math.max(
          1,
          Math.min(SEASON_EPISODE_SUMMARY_CONCURRENCY, seasonList.length)
        );
        let cursor = 0;

        const runWorker = async () => {
          while (true) {
            const nextIndex = cursor;
            cursor += 1;
            if (nextIndex >= seasonList.length) return;
            const season = seasonList[nextIndex];
            try {
              const response = await fetchWithTimeout(
                `/api/admin/trr-api/seasons/${season.id}/episodes?limit=500`,
                { headers },
                SEASON_EPISODE_SUMMARY_TIMEOUT_MS,
              );
              if (!response.ok) throw new Error("Failed to fetch episodes");
              const data = await response.json();
              const episodes = (data.episodes ?? []) as Array<{ air_date: string | null }>;
              const dates = episodes
                .map((ep) => ep.air_date)
                .filter((date): date is string => Boolean(date))
                .map((date) => new Date(date))
                .filter((date) => !Number.isNaN(date.getTime()));
              const premiere =
                dates.length > 0
                  ? new Date(Math.min(...dates.map((d) => d.getTime()))).toISOString()
                  : null;
              const finale =
                dates.length > 0
                  ? new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString()
                  : null;
              results.push({
                seasonId: season.id,
                summary: {
                  count: episodes.length,
                  premiereDate: premiere,
                  finaleDate: finale,
                },
              });
            } catch (error) {
              const message = error instanceof Error ? error.message : "failed";
              results.push({
                seasonId: season.id,
                error: message,
              });
            }
          }
        };

        await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

        const failedSeasonIds: string[] = [];
        const nextSummaries: Record<
          string,
          { count: number; premiereDate: string | null; finaleDate: string | null }
        > = {};
        for (const result of results) {
          if ("summary" in result && result.summary) {
            nextSummaries[result.seasonId] = result.summary;
            continue;
          }
          failedSeasonIds.push(result.seasonId);
        }
        if (failedSeasonIds.length > 0) {
          console.warn(
            `[show] Season episode summaries unavailable for ${failedSeasonIds.length} season(s): ${failedSeasonIds.join(", ")}`,
          );
        }
        setSeasonEpisodeSummaries(nextSummaries);
      } catch (error) {
        console.warn("Failed to compute season episode summaries:", error);
      } finally {
        setSeasonSummariesLoading(false);
      }
    },
    [getAuthHeaders]
  );

  // Fetch cast
  const fetchCast = useCallback(
    async (options?: {
      rosterMode?: ShowCastRosterMode;
      minEpisodes?: number | null;
      excludeZeroEpisodeMembers?: boolean;
      photoFallbackMode?: CastPhotoFallbackMode;
      mergeMissingPhotosOnly?: boolean;
      throwOnError?: boolean;
      force?: boolean;
      signal?: AbortSignal;
    }): Promise<TrrCastMember[]> => {
      const force = options?.force === true;
      const rosterMode = options?.rosterMode ?? "imdb_show_membership";
      const minEpisodes =
        typeof options?.minEpisodes === "number"
          ? options.minEpisodes
          : rosterMode === "imdb_show_membership"
            ? 1
            : null;
      const excludeZeroEpisodeMembers = options?.excludeZeroEpisodeMembers ?? true;
      const photoFallbackMode = options?.photoFallbackMode ?? "none";
      const mergeMissingPhotosOnly = options?.mergeMissingPhotosOnly === true;
      const requestShowId = showId;
      if (!requestShowId) return [];
      if (castLoadInFlightRef.current && !force) {
        return castLoadInFlightRef.current;
      }
      const requestController = new AbortController();
      const externalSignal = options?.signal;
      const abortWithExternalSignal = () => requestController.abort();
      if (force) {
        castLoadAbortControllerRef.current?.abort();
      }
      castLoadAbortControllerRef.current = requestController;

      const mergeMissingPhotoFields = (
        existingMembers: TrrCastMember[],
        incomingMembers: TrrCastMember[]
      ): TrrCastMember[] => {
        if (existingMembers.length === 0) return incomingMembers;
        const incomingByPersonId = new Map(
          incomingMembers.map((member) => [member.person_id, member] as const)
        );
        return existingMembers.map((member) => {
          const incoming = incomingByPersonId.get(member.person_id);
          if (!incoming) return member;
          return {
            ...member,
            photo_url: member.photo_url ?? incoming.photo_url ?? null,
            thumbnail_focus_x: member.thumbnail_focus_x ?? incoming.thumbnail_focus_x ?? null,
            thumbnail_focus_y: member.thumbnail_focus_y ?? incoming.thumbnail_focus_y ?? null,
            thumbnail_zoom: member.thumbnail_zoom ?? incoming.thumbnail_zoom ?? null,
            thumbnail_crop_mode:
              member.thumbnail_crop_mode ?? incoming.thumbnail_crop_mode ?? null,
          };
        });
      };

      const request = (async () => {
        setCastLoading(true);
        setCastLoadError(null);
        setCastLoadWarning(null);
        try {
          if (externalSignal) {
            if (externalSignal.aborted) {
              requestController.abort();
            } else {
              externalSignal.addEventListener("abort", abortWithExternalSignal, { once: true });
            }
          }
          const headers = await getAuthHeaders();
          let response: Response | null = null;
          let data: unknown = {};
          let lastError: unknown = null;
          let lastStatus = 0;
          for (let attempt = 1; attempt <= SHOW_CAST_LOAD_MAX_ATTEMPTS; attempt += 1) {
            try {
              const params = new URLSearchParams();
              params.set("limit", "500");
              params.set("roster_mode", rosterMode);
              params.set("photo_fallback", photoFallbackMode);
              if (typeof minEpisodes === "number" && Number.isFinite(minEpisodes)) {
                params.set("minEpisodes", String(minEpisodes));
              }
              if (excludeZeroEpisodeMembers) {
                params.set("exclude_zero_episode_members", "1");
              }
              response = await fetchWithTimeout(
                `/api/admin/trr-api/shows/${requestShowId}/cast?${params.toString()}`,
                { headers },
                SHOW_CAST_LOAD_TIMEOUT_MS,
                requestController.signal
              );
              data = await response.json().catch(() => ({}));
              lastStatus = response.status;
              if (!response.ok) {
                const retryableStatus =
                  response.status === 502 || response.status === 503 || response.status === 504;
                if (retryableStatus && attempt < SHOW_CAST_LOAD_MAX_ATTEMPTS) {
                  await new Promise((resolve) => setTimeout(resolve, SHOW_CAST_LOAD_RETRY_BACKOFF_MS));
                  continue;
                }
                const message =
                  typeof (data as { error?: unknown }).error === "string"
                    ? (data as { error: string }).error
                    : `Failed to fetch cast (HTTP ${response.status})`;
                throw new Error(message);
              }
              break;
            } catch (error) {
              lastError = error;
              if (requestController.signal.aborted) {
                break;
              }
              const retryableError = isAbortError(error);
              if (retryableError && attempt < SHOW_CAST_LOAD_MAX_ATTEMPTS) {
                await new Promise((resolve) => setTimeout(resolve, SHOW_CAST_LOAD_RETRY_BACKOFF_MS));
                continue;
              }
              throw error;
            }
          }
          if (!response || !response.ok) {
            if (lastError instanceof Error) {
              throw lastError;
            }
            throw new Error(lastStatus > 0 ? `Failed to fetch cast (HTTP ${lastStatus})` : "Failed to fetch cast");
          }
          const castRaw = (data as { cast?: unknown }).cast;
          const archiveCastRaw = (data as { archive_footage_cast?: unknown }).archive_footage_cast;
          const castSourceRaw = (data as { cast_source?: unknown }).cast_source;
          const eligibilityWarningRaw = (data as { eligibility_warning?: unknown }).eligibility_warning;
          const nextCast = Array.isArray(castRaw) ? (castRaw as TrrCastMember[]) : [];
          const nextArchiveCast = Array.isArray(archiveCastRaw)
            ? (archiveCastRaw as TrrCastMember[])
            : [];
          if (!isCurrentShowId(requestShowId)) return nextCast;

          let appliedCast = nextCast;
          let appliedArchiveCast = nextArchiveCast;
          if (mergeMissingPhotosOnly) {
            setCast((prev) => {
              const merged = mergeMissingPhotoFields(prev, nextCast);
              appliedCast = merged;
              return merged;
            });
            setArchiveFootageCast((prev) => {
              const merged = mergeMissingPhotoFields(prev, nextArchiveCast);
              appliedArchiveCast = merged;
              return merged;
            });
          } else {
            setCast(nextCast);
            setArchiveFootageCast(nextArchiveCast);
          }

          castSnapshotRef.current = { cast: appliedCast, archive: appliedArchiveCast };
          setCastSource(
            castSourceRaw === "show_fallback"
              ? "show_fallback"
              : castSourceRaw === "imdb_show_membership"
                ? "imdb_show_membership"
                : "episode_evidence"
          );
          setCastEligibilityWarning(
            typeof eligibilityWarningRaw === "string" && eligibilityWarningRaw.trim()
              ? eligibilityWarningRaw
              : null
          );
          setCastLoadWarning(null);
          setCastLoadedOnce(true);
          castLoadedOnceRef.current = true;
          return appliedCast;
        } catch (err) {
          if (requestController.signal.aborted) {
            return [];
          }
          if (!isCurrentShowId(requestShowId)) return [];
          const message = isAbortError(err)
            ? `Timed out loading cast after ${Math.round(SHOW_CAST_LOAD_TIMEOUT_MS / 1000)}s`
            : err instanceof Error
              ? err.message
              : "Failed to fetch cast";
          console.warn("Failed to fetch cast:", message);
          const hasPriorData =
            castLoadedOnceRef.current ||
            castSnapshotRef.current.cast.length > 0 ||
            castSnapshotRef.current.archive.length > 0;
          if (hasPriorData) {
            setCastLoadWarning(`${message}. Showing last successful cast snapshot.`);
            setCastLoadError(null);
          } else {
            setCastLoadError(message);
            setCastLoadWarning(null);
            setCast([]);
            setArchiveFootageCast([]);
            castSnapshotRef.current = { cast: [], archive: [] };
            setCastSource(rosterMode === "imdb_show_membership" ? "imdb_show_membership" : "episode_evidence");
            setCastEligibilityWarning(null);
            setCastLoadedOnce(false);
            castLoadedOnceRef.current = false;
          }
          if (options?.throwOnError) {
            throw (err instanceof Error ? err : new Error(message));
          }
          return [];
        } finally {
          if (externalSignal) {
            externalSignal.removeEventListener("abort", abortWithExternalSignal);
          }
          if (castLoadAbortControllerRef.current === requestController) {
            castLoadAbortControllerRef.current = null;
          }
          if (castLoadAbortControllerRef.current === null && isCurrentShowId(requestShowId)) {
            setCastLoading(false);
          }
        }
      })();

      castLoadInFlightRef.current = request;
      try {
        return await request;
      } finally {
        if (castLoadInFlightRef.current === request) {
          castLoadInFlightRef.current = null;
        }
      }
    },
    [getAuthHeaders, isCurrentShowId, showId]
  );

  const fetchShowLinks = useCallback(async () => {
    if (!showId) return;
    setLinksLoading(true);
    setLinksError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout(
        `/api/admin/trr-api/shows/${showId}/links?status=all`,
        {
          headers,
          cache: "no-store",
        },
        SETTINGS_MUTATION_TIMEOUT_MS
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      } & { 0?: EntityLink };
      if (!response.ok) {
        throw new Error(data.error || "Failed to load links");
      }
      setShowLinks(Array.isArray(data) ? (data as EntityLink[]) : []);
    } catch (err) {
      setLinksError(err instanceof Error ? err.message : "Failed to load links");
    } finally {
      setLinksLoading(false);
    }
  }, [getAuthHeaders, showId]);

  const discoverShowLinks = useCallback(async () => {
    if (!showId) return;
    setLinksNotice(null);
    setLinksError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout(
        `/api/admin/trr-api/shows/${showId}/links/discover`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ include_seasons: true, include_people: true }),
        },
        SETTINGS_MUTATION_TIMEOUT_MS
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        discovered?: number;
      };
      if (!response.ok) throw new Error(data.error || "Failed to discover links");
      setLinksNotice(
        `Discovered ${typeof data.discovered === "number" ? data.discovered : 0} links. Validated person sources were auto-approved; review any remaining pending items before publish.`
      );
      await fetchShowLinks();
    } catch (err) {
      setLinksError(err instanceof Error ? err.message : "Failed to discover links");
    }
  }, [fetchShowLinks, getAuthHeaders, showId]);

  const patchShowLink = useCallback(
    async (linkId: string, payload: Record<string, unknown>) => {
      if (!showId) return false;
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout(
        `/api/admin/trr-api/shows/${showId}/links/${linkId}`,
        {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        SETTINGS_MUTATION_TIMEOUT_MS
      );
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Failed to update link");
      return true;
    },
    [getAuthHeaders, showId]
  );

  const setShowLinkStatus = useCallback(
    async (linkId: string, status: EntityLinkStatus) => {
      setLinksError(null);
      try {
        await patchShowLink(linkId, { status });
        await fetchShowLinks();
      } catch (err) {
        setLinksError(err instanceof Error ? err.message : "Failed to update link");
      }
    },
    [fetchShowLinks, patchShowLink]
  );

  const editShowLink = useCallback(
    (link: EntityLink) => {
      setLinksError(null);
      setLinkEditDraft({
        linkId: link.id,
        label: link.label ?? "",
        url: link.url,
      });
    },
    []
  );

  const saveEditedShowLink = useCallback(async () => {
    if (!linkEditDraft) return;
    const nextUrl = linkEditDraft.url.trim();
    if (!nextUrl) {
      setLinksError("Link URL is required.");
      return;
    }
    setLinksError(null);
    setLinkEditSaving(true);
    try {
      await patchShowLink(linkEditDraft.linkId, {
        label: linkEditDraft.label.trim() || null,
        url: nextUrl,
      });
      await fetchShowLinks();
      setLinkEditDraft(null);
    } catch (err) {
      setLinksError(err instanceof Error ? err.message : "Failed to edit link");
    } finally {
      setLinkEditSaving(false);
    }
  }, [fetchShowLinks, linkEditDraft, patchShowLink]);

  const cancelShowLinkEdit = useCallback(() => {
    if (linkEditSaving) return;
    setLinkEditDraft(null);
  }, [linkEditSaving]);

  const deleteShowLink = useCallback(
    async (linkId: string) => {
      if (!showId) return;
      setLinksError(null);
      try {
        const headers = await getAuthHeaders();
        const response = await fetchWithTimeout(
          `/api/admin/trr-api/shows/${showId}/links/${linkId}`,
          {
            method: "DELETE",
            headers,
          },
          SETTINGS_MUTATION_TIMEOUT_MS
        );
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) throw new Error(data.error || "Failed to delete link");
        await fetchShowLinks();
      } catch (err) {
        setLinksError(err instanceof Error ? err.message : "Failed to delete link");
      }
    },
    [fetchShowLinks, getAuthHeaders, showId]
  );

  const saveGoogleNewsLink = useCallback(async () => {
    if (!showId) return;
    const trimmedUrl = googleNewsUrl.trim();
    if (!trimmedUrl) {
      setGoogleNewsError("Google News URL is required.");
      return;
    }
    let parsed: URL;
    try {
      parsed = new URL(trimmedUrl);
    } catch {
      setGoogleNewsError("Enter a valid URL.");
      return;
    }
    if (!parsed.hostname.includes("news.google.com")) {
      setGoogleNewsError("Google News URL must use news.google.com.");
      return;
    }

    setGoogleNewsSaving(true);
    setGoogleNewsError(null);
    setGoogleNewsNotice(null);
    try {
      const headers = await getAuthHeaders();
      if (googleNewsLinkId) {
        const response = await fetchWithTimeout(
          `/api/admin/trr-api/shows/${showId}/links/${googleNewsLinkId}`,
          {
            method: "PATCH",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              url: trimmedUrl,
              label: "Google News URL",
              link_group: "official",
              link_kind: "google_news_url",
              status: "approved",
            }),
          },
          SETTINGS_MUTATION_TIMEOUT_MS,
        );
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Failed to update Google News URL");
        }
      } else {
        const response = await fetchWithTimeout(
          `/api/admin/trr-api/shows/${showId}/links`,
          {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              entity_type: "show",
              entity_id: showId,
              link_group: "official",
              link_kind: "google_news_url",
              label: "Google News URL",
              url: trimmedUrl,
              season_number: 0,
              status: "approved",
              source: "manual",
              metadata: {},
            }),
          },
          SETTINGS_MUTATION_TIMEOUT_MS,
        );
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Failed to create Google News URL");
        }
      }
      setGoogleNewsNotice("Saved Google News URL.");
      setNewsGoogleUrlMissing(false);
      await fetchShowLinks();
    } catch (err) {
      setGoogleNewsError(err instanceof Error ? err.message : "Failed to save Google News URL");
    } finally {
      setGoogleNewsSaving(false);
    }
  }, [fetchShowLinks, getAuthHeaders, googleNewsLinkId, googleNewsUrl, showId]);

  const fetchShowRoles = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (!showId) return;
      if (!force && showRolesLoadedOnceRef.current) return;
      if (showRolesLoadInFlightRef.current) {
        await showRolesLoadInFlightRef.current;
        return;
      }

      const request = (async () => {
        setRolesLoading(true);
        setRolesError(null);
        setRolesWarning(null);
        const headers = await getAuthHeaders();
        let lastError: unknown = null;
        try {
          for (let attempt = 1; attempt <= ROLE_LOAD_MAX_ATTEMPTS; attempt += 1) {
            try {
              const response = await fetchWithTimeout(
                `/api/admin/trr-api/shows/${showId}/roles`,
                { headers, cache: "no-store" },
                ROLE_LOAD_TIMEOUT_MS
              );
              const data = (await response.json().catch(() => ({}))) as { error?: string };
              if (!response.ok) throw new Error(data.error || "Failed to load roles");
              setShowRoles(Array.isArray(data) ? (data as ShowRole[]) : []);
              setShowRolesLoadedOnce(true);
              showRolesLoadedOnceRef.current = true;
              showRolesSnapshotRef.current = Array.isArray(data) ? (data as ShowRole[]) : [];
              setLastSuccessfulRolesAt(Date.now());
              setRolesWarning(null);
              return;
            } catch (error) {
              lastError = error;
              if (attempt < ROLE_LOAD_MAX_ATTEMPTS) {
                await new Promise((resolve) => setTimeout(resolve, 200));
                continue;
              }
            }
          }

          const message = isAbortError(lastError)
            ? `Timed out loading roles after ${Math.round(ROLE_LOAD_TIMEOUT_MS / 1000)}s`
            : lastError instanceof Error
              ? lastError.message
              : "Failed to load roles";
          const hasPriorData =
            showRolesLoadedOnceRef.current || showRolesSnapshotRef.current.length > 0;
          if (hasPriorData) {
            setRolesWarning(`${message}. Showing last successful role catalog snapshot.`);
            setRolesError(null);
          } else {
            setShowRoles([]);
            setShowRolesLoadedOnce(false);
            showRolesLoadedOnceRef.current = false;
            showRolesSnapshotRef.current = [];
            setRolesError(message);
          }
        } finally {
          setRolesLoading(false);
        }
      })();

      showRolesLoadInFlightRef.current = request;
      try {
        await request;
      } finally {
        if (showRolesLoadInFlightRef.current === request) {
          showRolesLoadInFlightRef.current = null;
        }
      }
    },
    [getAuthHeaders, showId]
  );

  const createShowRole = useCallback(async () => {
    const roleName = newRoleName.trim();
    if (!roleName || !showId) return;
    setRolesError(null);
    setRolesWarning(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout(
        `/api/admin/trr-api/shows/${showId}/roles`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ name: roleName }),
        },
        SETTINGS_MUTATION_TIMEOUT_MS
      );
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Failed to create role");
      setNewRoleName("");
      await fetchShowRoles({ force: true });
    } catch (err) {
      setRolesError(err instanceof Error ? err.message : "Failed to create role");
    }
  }, [fetchShowRoles, getAuthHeaders, newRoleName, showId]);

  const patchShowRole = useCallback(
    async (roleId: string, payload: Record<string, unknown>) => {
      if (!showId) return;
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout(
        `/api/admin/trr-api/shows/${showId}/roles/${roleId}`,
        {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        SETTINGS_MUTATION_TIMEOUT_MS
      );
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Failed to update role");
    },
    [getAuthHeaders, showId]
  );

  const fetchCastRoleMembers = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (!showId) return;
      const seasonsParam = [...castSeasonFilters].sort((a, b) => a - b).join(",");
      const fetchKey = `${showId}|${seasonsParam}`;
      if (!force && castRoleMembersLoadKeyRef.current === fetchKey && castRoleMembersLoadedOnceRef.current) {
        return;
      }
      if (castRoleMembersLoadInFlightRef.current) {
        await castRoleMembersLoadInFlightRef.current;
        if (
          !force &&
          castRoleMembersLoadKeyRef.current === fetchKey &&
          castRoleMembersLoadedOnceRef.current
        ) {
          return;
        }
      }

      const request = (async () => {
        setCastRoleMembersLoading(true);
        setCastRoleMembersError(null);
        setCastRoleMembersWarning(null);
        try {
          const headers = await getAuthHeaders();
          const params = new URLSearchParams();
          if (castSeasonFilters.length > 0) {
            params.set("seasons", castSeasonFilters.join(","));
          }
          params.set("exclude_zero_episode_members", "1");

          const response = await fetchWithTimeout(
            `/api/admin/trr-api/shows/${showId}/cast-role-members?${params.toString()}`,
            { headers, cache: "no-store" },
            CAST_ROLE_MEMBERS_LOAD_TIMEOUT_MS
          );
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          if (!response.ok) throw new Error(data.error || "Failed to load cast role members");
          setCastRoleMembers(
            (Array.isArray(data) ? data : []).map((row) => {
              const roles = Array.isArray((row as { roles?: unknown }).roles)
                ? ((row as { roles: unknown[] }).roles.filter(
                    (value): value is string => typeof value === "string" && value.trim().length > 0
                  ) as string[])
                : [];
              return {
                person_id: String((row as { person_id?: unknown }).person_id ?? ""),
                person_name:
                  typeof (row as { person_name?: unknown }).person_name === "string"
                    ? (row as { person_name: string }).person_name
                    : null,
                total_episodes:
                  typeof (row as { total_episodes?: unknown }).total_episodes === "number"
                    ? (row as { total_episodes: number }).total_episodes
                    : null,
                seasons_appeared:
                  typeof (row as { seasons_appeared?: unknown }).seasons_appeared === "number"
                    ? (row as { seasons_appeared: number }).seasons_appeared
                    : null,
                latest_season:
                  typeof (row as { latest_season?: unknown }).latest_season === "number"
                    ? (row as { latest_season: number }).latest_season
                    : null,
                roles,
                photo_url:
                  typeof (row as { photo_url?: unknown }).photo_url === "string"
                    ? (row as { photo_url: string }).photo_url
                    : null,
              };
            })
          );
          castRoleMembersLoadKeyRef.current = fetchKey;
          setCastRoleMembersLoadedOnce(true);
          castRoleMembersLoadedOnceRef.current = true;
          setLastSuccessfulCastRoleMembersAt(Date.now());
          setCastRoleMembersWarning(null);
        } catch (err) {
          const message = isAbortError(err)
            ? `Timed out loading cast role members after ${Math.round(CAST_ROLE_MEMBERS_LOAD_TIMEOUT_MS / 1000)}s`
            : err instanceof Error
              ? err.message
              : "Failed to load cast role members";
          const hasPriorData =
            castRoleMembersLoadedOnceRef.current || castRoleMembersSnapshotRef.current.length > 0;
          if (hasPriorData) {
            setCastRoleMembersWarning(
              `${message}. Showing last successful cast intelligence snapshot.`
            );
            setCastRoleMembersError(null);
          } else {
            setCastRoleMembers([]);
            setCastRoleMembersLoadedOnce(false);
            castRoleMembersLoadedOnceRef.current = false;
            setCastRoleMembersError(message);
          }
        } finally {
          setCastRoleMembersLoading(false);
        }
      })();

      castRoleMembersLoadInFlightRef.current = request;
      try {
        await request;
      } finally {
        if (castRoleMembersLoadInFlightRef.current === request) {
          castRoleMembersLoadInFlightRef.current = null;
        }
      }
    },
    [castSeasonFilters, getAuthHeaders, showId]
  );

  const syncCastMatrixRoles = useCallback(
    async (options?: {
      includeRelationshipRoles?: boolean;
      includeBravoLinks?: boolean;
      includeBravoImages?: boolean;
      throwOnError?: boolean;
      refreshAfterSync?: boolean;
      signal?: AbortSignal;
    }): Promise<CastMatrixSyncResult | null> => {
      if (!showId) return null;
      const includeRelationshipRoles = options?.includeRelationshipRoles ?? true;
      const includeBravoLinks = options?.includeBravoLinks ?? true;
      const includeBravoImages = options?.includeBravoImages ?? true;
      const refreshAfterSync = options?.refreshAfterSync ?? true;

      setCastMatrixSyncLoading(true);
      setCastMatrixSyncError(null);
      try {
        const headers = await getAuthHeaders();
        const seasonNumbers = (
          castSeasonFilters.length > 0
            ? castSeasonFilters
            : seasons
                .map((season) => season.season_number)
                .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
        ).sort((a, b) => a - b);
        const response = await fetchWithTimeout(
          `/api/admin/trr-api/shows/${showId}/cast-matrix/sync`,
          {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              season_numbers: seasonNumbers,
              include_relationship_roles: includeRelationshipRoles,
              include_bravo_links: includeBravoLinks,
              include_bravo_images: includeBravoImages,
              dry_run: false,
            }),
          },
          CAST_MATRIX_SYNC_TIMEOUT_MS,
          options?.signal,
        );
        const data = (await response.json().catch(() => ({}))) as CastMatrixSyncResult & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error || "Failed to sync cast matrix roles");
        }
        setCastMatrixSyncResult(data);
        if (refreshAfterSync) {
          await Promise.all([
            fetchCastRoleMembers({ force: true }),
            fetchShowRoles({ force: true }),
            fetchShowLinks(),
            fetchCast({ signal: options?.signal }),
          ]);
        }
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to sync cast matrix roles";
        setCastMatrixSyncError(message);
        if (options?.throwOnError) {
          throw (err instanceof Error ? err : new Error(message));
        }
        return null;
      } finally {
        setCastMatrixSyncLoading(false);
      }
    },
    [
      castSeasonFilters,
      fetchCast,
      fetchCastRoleMembers,
      fetchShowLinks,
      fetchShowRoles,
      getAuthHeaders,
      seasons,
      showId,
    ]
  );

  const renameShowRole = useCallback(
    (role: ShowRole) => {
      setRolesError(null);
      setRolesWarning(null);
      setRoleRenameDraft({
        roleId: role.id,
        originalName: role.name,
        nextName: role.name,
      });
    },
    []
  );

  const saveRenamedShowRole = useCallback(async () => {
    if (!roleRenameDraft) return;
    const nextName = roleRenameDraft.nextName.trim();
    if (!nextName) {
      setRolesError("Role name is required.");
      return;
    }
    if (nextName === roleRenameDraft.originalName) {
      setRoleRenameDraft(null);
      return;
    }
    setRoleRenameSaving(true);
    try {
      setRolesError(null);
      setRolesWarning(null);
      await patchShowRole(roleRenameDraft.roleId, { name: nextName });
      await fetchShowRoles({ force: true });
      await fetchCastRoleMembers({ force: true });
      setRoleRenameDraft(null);
    } catch (err) {
      setRolesError(err instanceof Error ? err.message : "Failed to rename role");
    } finally {
      setRoleRenameSaving(false);
    }
  }, [fetchCastRoleMembers, fetchShowRoles, patchShowRole, roleRenameDraft]);

  const cancelRoleRename = useCallback(() => {
    if (roleRenameSaving) return;
    setRoleRenameDraft(null);
  }, [roleRenameSaving]);

  const openCastRoleEditor = useCallback(
    (personId: string, personName: string) => {
      const currentRoles =
        castRoleMembers.find((member) => member.person_id === personId)?.roles ?? [];
      setRolesError(null);
      setRolesWarning(null);
      setCastRoleMembersError(null);
      setCastRoleEditDraft({
        personId,
        personName,
        roleCsv: currentRoles.join(", "),
      });
    },
    [castRoleMembers]
  );

  useEffect(() => {
    if (activeTab !== "cast") return;
    const shouldOpen = searchParams.get("cast_open_role_editor");
    const personId = searchParams.get("cast_person");
    if (shouldOpen !== "1" || !personId) {
      setCastRoleEditorDeepLinkWarning(null);
      return;
    }

    const castMember = cast.find((member) => member.person_id === personId);
    const roleMember = castRoleMembers.find((member) => member.person_id === personId);
    const roleDataReady = castRoleMembersLoadedOnce || Boolean(roleMember);
    if (!roleDataReady) {
      if (!castRoleMembersLoading && !rolesLoading && (Boolean(castRoleMembersError) || Boolean(rolesError))) {
        setCastRoleEditorDeepLinkWarning(
          "Role editor deep-link is waiting for cast intelligence. Retry roles and cast intelligence, then reopen."
        );
      } else {
        setCastRoleEditorDeepLinkWarning(null);
      }
      return;
    }
    setCastRoleEditorDeepLinkWarning(null);
    const personName =
      castMember?.full_name ||
      castMember?.cast_member_name ||
      roleMember?.person_name ||
      "Cast member";
    openCastRoleEditor(personId, personName);

    const nextQuery = new URLSearchParams(searchParams.toString());
    nextQuery.delete("cast_open_role_editor");
    nextQuery.delete("cast_person");
    const nextUrl = buildShowAdminUrl({
      showSlug: showSlugForRouting,
      tab: "cast",
      query: nextQuery,
    });
    const currentUrl = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
    if (nextUrl === currentUrl) return;
    router.replace(nextUrl as Route, { scroll: false });
  }, [
    activeTab,
    cast,
    castRoleMembers,
    castRoleMembersError,
    castRoleMembersLoadedOnce,
    castRoleMembersLoading,
    openCastRoleEditor,
    pathname,
    rolesError,
    rolesLoading,
    router,
    searchParams,
    showSlugForRouting,
  ]);

  const toggleShowRoleActive = useCallback(
    async (role: ShowRole) => {
      try {
        setRolesError(null);
        setRolesWarning(null);
        await patchShowRole(role.id, { is_active: !role.is_active });
        await fetchShowRoles({ force: true });
        await fetchCastRoleMembers({ force: true });
      } catch (err) {
        setRolesError(err instanceof Error ? err.message : "Failed to update role");
      }
    },
    [fetchCastRoleMembers, fetchShowRoles, patchShowRole]
  );

  const assignRolesToCastMember = useCallback(
    async (personId: string, roleCsv: string) => {
      if (!showId) return;
      const roleNames = Array.from(
        new Set(
          roleCsv
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        )
      );
      try {
        setRolesError(null);
        setRolesWarning(null);
        setCastRoleMembersError(null);
        const headers = await getAuthHeaders();
        let nextRoles = [...showRoles];
        const existingRoleNames = new Set(nextRoles.map((role) => role.name.trim().toLowerCase()));
        const missingRoleNames = roleNames.filter(
          (roleName) => !existingRoleNames.has(roleName.trim().toLowerCase())
        );

        if (missingRoleNames.length > 0) {
          const pendingRoleNames = [...missingRoleNames];
          const createRoleWorkerCount = Math.min(3, pendingRoleNames.length);
          const runCreateRoleWorker = async () => {
            while (pendingRoleNames.length > 0) {
              const roleName = pendingRoleNames.shift();
              if (!roleName) return;
              const createResponse = await fetchWithTimeout(
                `/api/admin/trr-api/shows/${showId}/roles`,
                {
                  method: "POST",
                  headers: { ...headers, "Content-Type": "application/json" },
                  body: JSON.stringify({ name: roleName }),
                },
                SETTINGS_MUTATION_TIMEOUT_MS
              );
              const created = (await createResponse.json().catch(() => ({}))) as { error?: string };
              if (!createResponse.ok) {
                throw new Error(created.error || `Failed to create role "${roleName}"`);
              }
            }
          };

          await Promise.all(Array.from({ length: createRoleWorkerCount }, () => runCreateRoleWorker()));
        }

        const refreshedRolesResponse = await fetchWithTimeout(
          `/api/admin/trr-api/shows/${showId}/roles`,
          {
            headers,
            cache: "no-store",
          },
          ROLE_LOAD_TIMEOUT_MS
        );
        const refreshedRolesData = (await refreshedRolesResponse.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!refreshedRolesResponse.ok) {
          throw new Error(refreshedRolesData.error || "Failed to refresh roles");
        }
        nextRoles = Array.isArray(refreshedRolesData) ? (refreshedRolesData as ShowRole[]) : [];
        setShowRoles(nextRoles);
        setShowRolesLoadedOnce(true);

        const roleIds = nextRoles
          .filter((role) => roleNames.some((name) => name.toLowerCase() === role.name.toLowerCase()))
          .map((role) => role.id);
        const seasonNumber = castSeasonFilters.length === 1 ? castSeasonFilters[0] : 0;
        const assignResponse = await fetchWithTimeout(
          `/api/admin/trr-api/shows/${showId}/cast/${personId}/roles`,
          {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ season_number: seasonNumber, role_ids: roleIds }),
          },
          SETTINGS_MUTATION_TIMEOUT_MS
        );
        const assigned = (await assignResponse.json().catch(() => ({}))) as { error?: string };
        if (!assignResponse.ok) throw new Error(assigned.error || "Failed to assign roles");
        await fetchCastRoleMembers({ force: true });
      } catch (err) {
        setCastRoleMembersError(err instanceof Error ? err.message : "Failed to assign roles");
      }
    },
    [castSeasonFilters, fetchCastRoleMembers, getAuthHeaders, showId, showRoles]
  );

  const saveCastRoleAssignments = useCallback(async () => {
    if (!castRoleEditDraft) return;
    setCastRoleEditSaving(true);
    try {
      await assignRolesToCastMember(castRoleEditDraft.personId, castRoleEditDraft.roleCsv);
      setCastRoleEditDraft(null);
    } finally {
      setCastRoleEditSaving(false);
    }
  }, [assignRolesToCastMember, castRoleEditDraft]);

  const cancelCastRoleEditor = useCallback(() => {
    if (castRoleEditSaving) return;
    setCastRoleEditDraft(null);
  }, [castRoleEditSaving]);

  const syncBravoVideoThumbnails = useCallback(
    async ({ force = false }: { force?: boolean } = {}): Promise<boolean> => {
      const requestShowId = showId;
      if (!requestShowId) return false;
      if (bravoVideoSyncInFlightRef.current) {
        return await bravoVideoSyncInFlightRef.current;
      }

      const request = (async (): Promise<boolean> => {
        try {
          if (!isCurrentShowId(requestShowId)) return false;
          setBravoVideoSyncing(true);
          setBravoVideoSyncWarning(null);
          const headers = await getAuthHeaders();
          const response = await fetchWithTimeout(
            `/api/admin/trr-api/shows/${requestShowId}/bravo/videos/sync-thumbnails`,
            {
              method: "POST",
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ force }),
              cache: "no-store",
            },
            BRAVO_VIDEO_THUMBNAIL_SYNC_TIMEOUT_MS
          );
          const data = (await response.json().catch(() => ({}))) as {
            error?: string;
            video_thumbnail_sync?: { attempted?: number; synced?: number; failed?: number };
          };
          if (!response.ok) {
            throw new Error(data.error || "Failed to sync Bravo video thumbnails");
          }
          const attempted = Number(data.video_thumbnail_sync?.attempted ?? 0);
          const synced = Number(data.video_thumbnail_sync?.synced ?? 0);
          const failed = Number(data.video_thumbnail_sync?.failed ?? 0);
          if (!isCurrentShowId(requestShowId)) return false;
          if (attempted > 0 || synced > 0 || failed > 0) {
            setBravoVideoSyncWarning(
              `Video thumbnail sync: ${synced} synced, ${failed} failed${attempted > 0 ? ` (${attempted} attempted)` : ""}.`
            );
          }
          return true;
        } catch (err) {
          if (!isCurrentShowId(requestShowId)) return false;
          const message = isAbortError(err)
            ? `Timed out syncing video thumbnails after ${Math.round(BRAVO_VIDEO_THUMBNAIL_SYNC_TIMEOUT_MS / 1000)}s`
            : err instanceof Error
              ? err.message
              : "Failed to sync video thumbnails";
          setBravoVideoSyncWarning(message);
          return false;
        } finally {
          if (isCurrentShowId(requestShowId)) {
            setBravoVideoSyncing(false);
          }
        }
      })();

      bravoVideoSyncInFlightRef.current = request;
      try {
        return await request;
      } finally {
        if (bravoVideoSyncInFlightRef.current === request) {
          bravoVideoSyncInFlightRef.current = null;
        }
      }
    },
    [getAuthHeaders, isCurrentShowId, showId]
  );

  const loadBravoData = useCallback(async (
    {
      force = false,
      syncThumbnails = false,
      forceThumbnailSync = false,
    }: { force?: boolean; syncThumbnails?: boolean; forceThumbnailSync?: boolean } = {}
  ) => {
    const requestShowId = showId;
    if (!requestShowId) return;
    if (!force && bravoLoaded) return;
    if (bravoLoadInFlightRef.current) {
      await bravoLoadInFlightRef.current;
      return;
    }

    const request = (async () => {
      try {
        if (!isCurrentShowId(requestShowId)) return;
        setBravoLoading(true);
        setBravoError(null);
        const headers = await getAuthHeaders();
        if (syncThumbnails && (forceThumbnailSync || !bravoVideoSyncAttemptedRef.current)) {
          bravoVideoSyncAttemptedRef.current = true;
          await syncBravoVideoThumbnails({ force: forceThumbnailSync });
        }

        const videosResponse = await fetchWithTimeout(
          `/api/admin/trr-api/shows/${requestShowId}/bravo/videos?merge_person_sources=true`,
          {
            headers,
            cache: "no-store",
          },
          BRAVO_LOAD_TIMEOUT_MS
        );

        const videosData = (await videosResponse.json().catch(() => ({}))) as {
          videos?: BravoVideoItem[];
          error?: string;
        };

        if (!videosResponse.ok) {
          throw new Error(videosData.error || "Failed to fetch Bravo videos");
        }

        if (!isCurrentShowId(requestShowId)) return;
        setBravoVideos(Array.isArray(videosData.videos) ? videosData.videos : []);
        setBravoLoaded(true);
      } catch (err) {
        if (!isCurrentShowId(requestShowId)) return;
        const message = isAbortError(err)
          ? `Timed out loading Bravo data after ${Math.round(BRAVO_LOAD_TIMEOUT_MS / 1000)}s`
          : err instanceof Error
            ? err.message
            : "Failed to load Bravo data";
        setBravoLoaded(false);
        setBravoError(message);
      } finally {
        if (!isCurrentShowId(requestShowId)) return;
        setBravoLoading(false);
      }
    })();

    bravoLoadInFlightRef.current = request;
    try {
      await request;
    } finally {
      if (bravoLoadInFlightRef.current === request) {
        bravoLoadInFlightRef.current = null;
      }
    }
  }, [bravoLoaded, getAuthHeaders, isCurrentShowId, showId, syncBravoVideoThumbnails]);

  const syncGoogleNews = useCallback(
    async ({ force = false }: { force?: boolean } = {}): Promise<boolean> => {
      const requestShowId = showId;
      if (!requestShowId) return false;
      if (newsSyncInFlightRef.current) {
        return await newsSyncInFlightRef.current;
      }

      const request = (async (): Promise<boolean> => {
        try {
          if (!isCurrentShowId(requestShowId)) return false;
          setNewsSyncing(true);
          const headers = await getAuthHeaders();
          const response = await fetchWithTimeout(
            `/api/admin/trr-api/shows/${requestShowId}/google-news/sync`,
            {
              method: "POST",
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ force, async: true }),
            },
            NEWS_SYNC_TIMEOUT_MS
          );
          const data = (await response.json().catch(() => ({}))) as {
            error?: string;
            job_id?: string;
            status?: string;
          };
          if (!response.ok) {
            if (response.status === 409) {
              const message = data.error || "Google News URL is not configured for this show.";
              if (!isCurrentShowId(requestShowId)) return false;
              setNewsGoogleUrlMissing(true);
              setNewsNotice(message);
              return false;
            }
            throw new Error(data.error || "Failed to sync Google News");
          }
          const jobId = typeof data.job_id === "string" ? data.job_id.trim() : "";
          if (jobId) {
            const pollStartedAt = Date.now();
            while (Date.now() - pollStartedAt < NEWS_SYNC_POLL_TIMEOUT_MS) {
              if (!isCurrentShowId(requestShowId)) return false;
              const statusResponse = await fetchWithTimeout(
                `/api/admin/trr-api/shows/${requestShowId}/google-news/sync/${encodeURIComponent(jobId)}`,
                { headers, cache: "no-store" },
                NEWS_SYNC_TIMEOUT_MS
              );
              const statusData = (await statusResponse.json().catch(() => ({}))) as {
                error?: string;
                status?: string;
                result?: { synced?: boolean; stale_guard_skipped?: boolean } | null;
              };
              if (!statusResponse.ok) {
                throw new Error(statusData.error || "Failed to fetch Google News sync status");
              }
              const jobStatus = String(statusData.status || "").trim().toLowerCase();
              if (jobStatus === "completed") {
                break;
              }
              if (jobStatus === "failed") {
                const detail =
                  (statusData.result &&
                    typeof statusData.result === "object" &&
                    "error" in statusData.result &&
                    typeof statusData.result.error === "string" &&
                    statusData.result.error) ||
                  statusData.error ||
                  "Google News sync failed";
                throw new Error(detail);
              }
              await new Promise((resolve) => setTimeout(resolve, NEWS_SYNC_POLL_INTERVAL_MS));
            }
            if (Date.now() - pollStartedAt >= NEWS_SYNC_POLL_TIMEOUT_MS) {
              throw new Error(
                `Google News sync polling timed out after ${Math.round(NEWS_SYNC_POLL_TIMEOUT_MS / 1000)}s`
              );
            }
          }
          if (!isCurrentShowId(requestShowId)) return false;
          setNewsGoogleUrlMissing(false);
          setNewsNotice(null);
          return true;
        } catch (err) {
          throw err instanceof Error
            ? err
            : new Error(isAbortError(err) ? "Timed out syncing Google News" : "Failed to sync Google News");
        } finally {
          if (isCurrentShowId(requestShowId)) {
            setNewsSyncing(false);
          }
        }
      })();

      newsSyncInFlightRef.current = request;
      try {
        return await request;
      } finally {
        if (newsSyncInFlightRef.current === request) {
          newsSyncInFlightRef.current = null;
        }
      }
    },
    [getAuthHeaders, isCurrentShowId, showId]
  );

  const loadUnifiedNews = useCallback(
    async function loadUnifiedNewsInternal({
      force = false,
      forceSync = false,
      append = false,
    }: { force?: boolean; forceSync?: boolean; append?: boolean } = {}) {
      const requestShowId = showId;
      if (!requestShowId) return;
      const baseParams = new URLSearchParams({
        sources: "bravo,google_news",
        sort: newsSort,
        limit: String(NEWS_PAGE_SIZE),
      });
      if (newsPersonFilter) baseParams.set("person_id", newsPersonFilter);
      if (newsSourceFilter) baseParams.set("source", newsSourceFilter);
      if (newsTopicFilter) baseParams.set("topic", newsTopicFilter);
      if (newsSeasonFilter) baseParams.set("season_number", newsSeasonFilter);
      const queryKey = baseParams.toString();
      let shouldAppend = append;
      let shouldForce = force;
      if (shouldAppend && (!newsNextCursor || newsCursorQueryKeyRef.current !== queryKey)) {
        shouldAppend = false;
        shouldForce = true;
      }
      if (!shouldForce && !shouldAppend && newsLoaded && newsLoadedQueryKeyRef.current === queryKey) return;
      if (!shouldAppend && newsLoadedQueryKeyRef.current && newsLoadedQueryKeyRef.current !== queryKey) {
        setNewsNextCursor(null);
        newsCursorQueryKeyRef.current = null;
      }
      if (newsLoadInFlightRef.current) {
        pendingNewsReloadRef.current = true;
        pendingNewsReloadArgsRef.current = {
          force: shouldForce,
          forceSync,
          queryKey,
        };
        return;
      }

      const requestSeq = newsRequestSeqRef.current + 1;
      newsRequestSeqRef.current = requestSeq;
      const request = (async () => {
        try {
          if (!isCurrentShowId(requestShowId)) return;
          setNewsLoading(true);
          setNewsError(null);
          if (!shouldAppend && (forceSync || !newsAutoSyncAttemptedRef.current)) {
            const syncSuccess = await syncGoogleNews({ force: forceSync });
            if (syncSuccess) {
              newsAutoSyncAttemptedRef.current = true;
            }
          }
          if (!isCurrentShowId(requestShowId)) return;

          const headers = await getAuthHeaders();
          const requestParams = new URLSearchParams(baseParams);
          if (shouldAppend && newsNextCursor) {
            requestParams.set("cursor", newsNextCursor);
          }
          const data = await adminGetJson<{
            news?: UnifiedNewsItem[];
            error?: string;
            count?: number;
            total_count?: number;
            next_cursor?: string | null;
            facets?: {
              sources?: Array<{ token?: string; label?: string; count?: number }>;
              people?: Array<{ person_id?: string; person_name?: string; count?: number }>;
              topics?: Array<{ topic?: string; count?: number }>;
              seasons?: Array<{ season_number?: number; count?: number }>;
            };
          }>(
            `/api/admin/trr-api/shows/${requestShowId}/news?${requestParams.toString()}`,
            {
              headers,
              cache: "no-store",
              timeoutMs: NEWS_LOAD_TIMEOUT_MS,
            },
          );
          if (!isCurrentShowId(requestShowId) || requestSeq !== newsRequestSeqRef.current) return;
          const nextItems = Array.isArray(data.news) ? data.news : [];
          const nextFacets: UnifiedNewsFacets = {
            sources: Array.isArray(data.facets?.sources)
              ? data.facets.sources
                  .map((row) => ({
                    token: String(row?.token || "").trim(),
                    label: String(row?.label || "").trim(),
                    count: Number.isFinite(Number(row?.count ?? 0)) ? Number(row?.count ?? 0) : 0,
                  }))
                  .filter((row) => row.token && row.label)
              : [],
            people: Array.isArray(data.facets?.people)
              ? data.facets.people
                  .map((row) => ({
                    person_id: String(row?.person_id || "").trim(),
                    person_name: String(row?.person_name || "").trim(),
                    count: Number.isFinite(Number(row?.count ?? 0)) ? Number(row?.count ?? 0) : 0,
                  }))
                  .filter((row) => row.person_id && row.person_name)
              : [],
            topics: Array.isArray(data.facets?.topics)
              ? data.facets.topics
                  .map((row) => ({
                    topic: String(row?.topic || "").trim(),
                    count: Number.isFinite(Number(row?.count ?? 0)) ? Number(row?.count ?? 0) : 0,
                  }))
                  .filter((row) => row.topic)
              : [],
            seasons: Array.isArray(data.facets?.seasons)
              ? data.facets.seasons
                  .map((row) => ({
                    season_number: Number(row?.season_number || 0),
                    count: Number.isFinite(Number(row?.count ?? 0)) ? Number(row?.count ?? 0) : 0,
                  }))
                  .filter((row) => Number.isFinite(row.season_number) && row.season_number > 0)
              : [],
          };
          const responseCount =
            typeof data.count === "number" && Number.isFinite(data.count) ? data.count : nextItems.length;
          setUnifiedNews((prev) => (shouldAppend ? [...prev, ...nextItems] : nextItems));
          setNewsPageCount((prev) => (shouldAppend ? prev + responseCount : responseCount));
          setNewsTotalCount((prev) =>
            typeof data.total_count === "number" && Number.isFinite(data.total_count)
              ? data.total_count
              : shouldAppend
                ? prev + responseCount
                : responseCount
          );
          setNewsFacets(nextFacets);
          const nextCursor =
            typeof data.next_cursor === "string" && data.next_cursor.trim() ? data.next_cursor : null;
          setNewsNextCursor(nextCursor);
          newsCursorQueryKeyRef.current = nextCursor ? queryKey : null;
          setNewsLoaded(true);
          newsLoadedQueryKeyRef.current = queryKey;
        } catch (err) {
          if (!isCurrentShowId(requestShowId) || requestSeq !== newsRequestSeqRef.current) return;
          const message = isAbortError(err)
            ? `Timed out loading news after ${Math.round(NEWS_LOAD_TIMEOUT_MS / 1000)}s`
            : err instanceof Error
              ? err.message
              : "Failed to load unified news";
          if (shouldAppend) {
            setNewsNextCursor(null);
            newsCursorQueryKeyRef.current = null;
            setNewsError(`Failed to load more news: ${message}. Cursor reset. Refresh to continue.`);
            return;
          }
          if (!shouldAppend) {
            setNewsLoaded(false);
            setNewsPageCount(0);
            newsLoadedQueryKeyRef.current = null;
            setNewsNextCursor(null);
            newsCursorQueryKeyRef.current = null;
            setNewsFacets(EMPTY_NEWS_FACETS);
          }
          setNewsError(message);
        } finally {
          if (!isCurrentShowId(requestShowId) || requestSeq !== newsRequestSeqRef.current) return;
          setNewsLoading(false);
        }
      })();

      newsLoadInFlightRef.current = request;
      newsInFlightQueryKeyRef.current = queryKey;
      try {
        await request;
      } finally {
        if (newsLoadInFlightRef.current === request) {
          newsLoadInFlightRef.current = null;
          newsInFlightQueryKeyRef.current = null;
          const pendingReload = pendingNewsReloadRef.current ? pendingNewsReloadArgsRef.current : null;
          pendingNewsReloadRef.current = false;
          pendingNewsReloadArgsRef.current = null;
          if (pendingReload && isCurrentShowId(requestShowId)) {
            void loadUnifiedNewsInternal({
              force: pendingReload.force,
              forceSync: pendingReload.forceSync,
              append: false,
            });
          }
        }
      }
    },
    [
      getAuthHeaders,
      isCurrentShowId,
      newsLoaded,
      newsNextCursor,
      newsPersonFilter,
      newsSeasonFilter,
      newsSort,
      newsSourceFilter,
      newsTopicFilter,
      showId,
      syncGoogleNews,
    ]
  );

  const syncBravoCastUrlCandidates = useMemo(() => {
    const urls = new Set<string>();
    for (const member of cast) {
      const name = String(member.full_name || member.cast_member_name || "").trim();
      const inferred = inferBravoPersonUrl(name);
      if (inferred) {
        urls.add(inferred);
      }
    }
    return Array.from(urls).sort((a, b) => a.localeCompare(b));
  }, [cast]);

  const syncBravoCastCandidateNameByUrl = useMemo(() => {
    const byUrl = new Map<string, string>();
    for (const member of cast) {
      const name = String(member.full_name || member.cast_member_name || "").trim();
      if (!name) continue;
      const inferred = inferBravoPersonUrl(name);
      if (!inferred) continue;
      if (!byUrl.has(inferred)) {
        byUrl.set(inferred, name);
      }
    }
    return byUrl;
  }, [cast]);

  const syncBravoSeasonOptions = useMemo(() => {
    const numbers = seasons
      .filter((season) => {
        const summary = seasonEpisodeSummaries[season.id];
        const episodeCount = summary?.count;
        const hasEpisodeEvidence = typeof episodeCount === "number" && Number.isFinite(episodeCount) && episodeCount > 1;
        const hasPremiereDate = Boolean((summary?.premiereDate ?? season.air_date)?.trim());
        return hasEpisodeEvidence || hasPremiereDate;
      })
      .map((season) => season.season_number)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    return [...new Set(numbers)].sort((a, b) => b - a);
  }, [seasonEpisodeSummaries, seasons]);

  const defaultSyncBravoSeasonNumber = useMemo(() => {
    if (syncBravoSeasonOptions.length === 0) return null;
    return syncBravoSeasonOptions[0];
  }, [syncBravoSeasonOptions]);

  const syncBravoSeasonEligibilityError =
    "No eligible seasons for Bravo sync. A season must have more than 1 episode or a premiere date.";

  useEffect(() => {
    setSyncBravoTargetSeasonNumber((prev) => {
      if (
        typeof prev === "number" &&
        Number.isFinite(prev) &&
        syncBravoSeasonOptions.includes(prev)
      ) {
        return prev;
      }
      return defaultSyncBravoSeasonNumber;
    });
  }, [defaultSyncBravoSeasonNumber, syncBravoSeasonOptions]);

  const abortSyncBravoPreviewStream = useCallback(() => {
    const controller = syncBravoPreviewAbortControllerRef.current;
    if (controller) {
      controller.abort();
      syncBravoPreviewAbortControllerRef.current = null;
    }
    setSyncBravoProbeActive(false);
  }, []);

  const previewSyncByBravo = useCallback(async (options?: { urlOverride?: string; mode?: SyncBravoRunMode }) => {
    const selectedMode = options?.mode ?? syncBravoRunMode;
    const includeFullShowContent = selectedMode !== "cast-only";
    const hasEpisodeEvidence =
      (show?.show_total_episodes ?? 0) > 0 ||
      Object.values(seasonEpisodeSummaries).some((summary) => (summary?.count ?? 0) > 0);
    if (seasons.length === 0 || !hasEpisodeEvidence || cast.length === 0) {
      appendRefreshLog({
        category: "BravoTV",
        message: "Blocked: sync seasons, episodes, and cast first.",
      });
      setSyncBravoError(
        "Sync seasons, episodes, and cast first. Run Refresh and wait for completion."
      );
      return;
    }
    if (syncBravoSeasonOptions.length === 0) {
      setSyncBravoError(syncBravoSeasonEligibilityError);
      appendRefreshLog({
        category: "BravoTV",
        message: `Blocked: ${syncBravoSeasonEligibilityError}`,
      });
      return;
    }
    const targetUrl =
      (typeof options?.urlOverride === "string" ? options.urlOverride : syncBravoUrl).trim();
    if (!targetUrl) {
      setSyncBravoError("Show URL is required.");
      return;
    }

    abortSyncBravoPreviewStream();
    const runId = syncBravoPreviewRunRef.current + 1;
    syncBravoPreviewRunRef.current = runId;

    if (targetUrl !== syncBravoUrl) {
      setSyncBravoUrl(targetUrl);
    }

    setSyncBravoPreviewLoading(true);
    setSyncBravoError(null);
    setSyncBravoNotice(null);
    setSyncFandomPreviewPeople([]);
    setSyncFandomPersonCandidateResults([]);
    setSyncBravoPersonCandidateResults([]);
    setSyncBravoPreviewResult(null);
    setSyncBravoPreviewSignature(null);
    setSyncBravoCandidateSummary(null);
    setSyncFandomCandidateSummary(null);
    setSyncFandomDomainsUsed([]);
    setSyncBravoProbeTotal(0);
    setSyncBravoProbeStatusMessage(null);
    appendRefreshLog({
      category: "BravoTV",
      message:
        selectedMode === "cast-only" ? "Loading Bravo cast-only preview..." : "Loading Bravo preview...",
    });

    let castOnlyController: AbortController | null = null;

    try {
      const headers = await getAuthHeaders();

      if (selectedMode === "cast-only") {
        const pendingRows: BravoPersonCandidateResult[] = syncBravoCastUrlCandidates.map((url) => ({
          url,
          source: "bravo",
          name: syncBravoCastCandidateNameByUrl.get(url) ?? null,
          status: "pending",
          error: null,
          person: null,
        }));
        const initialSummary: BravoCandidateSummary = {
          tested: 0,
          valid: 0,
          missing: 0,
          errors: 0,
        };
        let liveBravoSummary = initialSummary;
        let liveFandomSummary = initialSummary;
        let bravoTotal = pendingRows.length;
        let fandomTotal = 0;
        let finalPayload: Record<string, unknown> | null = null;

        setSyncFandomPreviewPeople([]);
        setSyncFandomPersonCandidateResults([]);
        setSyncBravoPersonCandidateResults(pendingRows);
        setSyncBravoCandidateSummary(initialSummary);
        setSyncFandomCandidateSummary(initialSummary);
        setSyncBravoProbeTotal(bravoTotal);
        setSyncBravoProbeActive(bravoTotal > 0);
        setSyncBravoProbeStatusMessage(
          bravoTotal > 0
            ? `Probing cast profiles: Bravo 0/${bravoTotal}, Fandom 0/0 (1 in flight).`
            : "No canonical cast profile URLs to probe."
        );
        if (bravoTotal > 30) {
          appendRefreshLog({
            category: "BravoTV",
            message: "Cast-only probe may take several minutes for large casts.",
          });
        }

        castOnlyController = new AbortController();
        syncBravoPreviewAbortControllerRef.current = castOnlyController;

        const streamResponse = await fetch(
          `/api/admin/trr-api/shows/${showId}/import-bravo/preview/stream`,
          {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              show_url: targetUrl,
              cast_only: true,
              include_people: true,
              include_videos: false,
              include_news: false,
              person_url_candidates: syncBravoCastUrlCandidates,
              season_number: syncBravoTargetSeasonNumber ?? defaultSyncBravoSeasonNumber ?? undefined,
            }),
            signal: castOnlyController.signal,
          }
        );

        if (!streamResponse.ok || !streamResponse.body) {
          const streamErrorText = (await streamResponse.text().catch(() => "")).trim();
          throw new Error(
            streamErrorText || `Bravo cast-only stream failed (HTTP ${streamResponse.status})`
          );
        }

        const reader = streamResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (runId !== syncBravoPreviewRunRef.current) {
            break;
          }
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

          let boundaryIndex = buffer.indexOf("\n\n");
          while (boundaryIndex !== -1) {
            const rawEvent = buffer.slice(0, boundaryIndex);
            buffer = buffer.slice(boundaryIndex + 2);

            const lines = rawEvent.split("\n").filter(Boolean);
            let eventType = "message";
            const dataLines: string[] = [];
            for (const line of lines) {
              if (line.startsWith("event:")) {
                eventType = line.slice(6).trim();
              } else if (line.startsWith("data:")) {
                dataLines.push(line.slice(5).trim());
              }
            }

            const dataStr = dataLines.join("\n");
            let payload: Record<string, unknown> | string = dataStr;
            try {
              payload = JSON.parse(dataStr) as Record<string, unknown>;
            } catch {
              payload = dataStr;
            }
            if (!payload || typeof payload !== "object") {
              boundaryIndex = buffer.indexOf("\n\n");
              continue;
            }

            if (eventType === "start") {
              const startCandidates = Array.isArray(payload.candidates) ? payload.candidates : [];
              const seededRows = startCandidates
                .map((candidate) => {
                  if (!candidate || typeof candidate !== "object") return null;
                  const url =
                    typeof (candidate as { url?: unknown }).url === "string"
                      ? String((candidate as { url?: unknown }).url).trim()
                      : "";
                  if (!url) return null;
                  const nameRaw = (candidate as { name?: unknown }).name;
                  const name = typeof nameRaw === "string" && nameRaw.trim() ? nameRaw.trim() : null;
                  return {
                    url,
                    source: "bravo",
                    name,
                    status: "pending",
                    error: null,
                    person: null,
                  } satisfies BravoPersonCandidateResult;
                })
                .filter((value) => Boolean(value)) as BravoPersonCandidateResult[];

              if (seededRows.length > 0) {
                bravoTotal = seededRows.length;
                setSyncBravoPersonCandidateResults(seededRows);
              }
              const totalRaw = (payload as { total?: unknown }).total;
              if (typeof totalRaw === "number" && Number.isFinite(totalRaw) && totalRaw >= 0) {
                bravoTotal = totalRaw;
              }

              const fandomCandidates = Array.isArray((payload as { fandom_candidates?: unknown }).fandom_candidates)
                ? ((payload as { fandom_candidates?: Array<Record<string, unknown>> }).fandom_candidates ?? [])
                : [];
              const seededFandomRows = fandomCandidates
                .map((candidate) => {
                  if (!candidate || typeof candidate !== "object") return null;
                  const url = typeof candidate.url === "string" ? candidate.url.trim() : "";
                  if (!url) return null;
                  const name = typeof candidate.name === "string" && candidate.name.trim() ? candidate.name.trim() : null;
                  return {
                    url,
                    source: "fandom",
                    name,
                    status: "pending",
                    error: null,
                    person: null,
                  } satisfies BravoPersonCandidateResult;
                })
                .filter((value) => Boolean(value)) as BravoPersonCandidateResult[];
              if (seededFandomRows.length > 0) {
                fandomTotal = seededFandomRows.length;
                setSyncFandomPersonCandidateResults(seededFandomRows);
              }
              const fandomTotalRaw = (payload as { fandom_total?: unknown }).fandom_total;
              if (
                typeof fandomTotalRaw === "number" &&
                Number.isFinite(fandomTotalRaw) &&
                fandomTotalRaw >= 0
              ) {
                fandomTotal = fandomTotalRaw;
              }
              const fandomDomainsRaw = (payload as { fandom_domains_used?: unknown }).fandom_domains_used;
              if (Array.isArray(fandomDomainsRaw)) {
                const parsedDomains = fandomDomainsRaw
                  .filter((value): value is string => typeof value === "string")
                  .map((value) => value.trim())
                  .filter((value) => value.length > 0);
                setSyncFandomDomainsUsed(parsedDomains);
              }

              const totalToProbe = bravoTotal + fandomTotal;
              setSyncBravoProbeTotal(totalToProbe);
              const inFlight = totalToProbe > 0 ? 1 : 0;
              setSyncBravoProbeActive(inFlight > 0);
              if (totalToProbe > 0) {
                setSyncBravoProbeStatusMessage(
                  `Probing cast profiles: Bravo ${liveBravoSummary.tested}/${bravoTotal}, Fandom ${liveFandomSummary.tested}/${fandomTotal} (${inFlight} in flight).`
                );
              }
            } else if (eventType === "progress") {
              const url = typeof payload.url === "string" ? payload.url.trim() : "";
              if (!url) {
                boundaryIndex = buffer.indexOf("\n\n");
                continue;
              }
              const source = payload.source === "fandom" ? "fandom" : "bravo";
              const statusRaw = typeof payload.status === "string" ? payload.status.trim().toLowerCase() : "";
              const status = statusRaw || "in_progress";
              const nameRaw = typeof payload.name === "string" ? payload.name.trim() : "";
              const errorRaw =
                typeof payload.error === "string" && payload.error.trim().length > 0
                  ? payload.error.trim()
                  : null;
              const personRaw = payload.person;
              const person =
                personRaw && typeof personRaw === "object" && !Array.isArray(personRaw)
                  ? (personRaw as BravoPreviewPerson)
                  : null;

              const setResults =
                source === "fandom" ? setSyncFandomPersonCandidateResults : setSyncBravoPersonCandidateResults;
              setResults((prev) => {
                const next = [...prev];
                const index = next.findIndex((row) => row.url === url);
                const nextRow: BravoPersonCandidateResult = {
                  ...(index >= 0 ? next[index] : {}),
                  url,
                  source,
                  name: nameRaw || (index >= 0 ? next[index]?.name ?? null : null),
                  status,
                  error: errorRaw,
                  person,
                };
                if (index >= 0) {
                  next[index] = nextRow;
                } else {
                  next.push(nextRow);
                }
                return next;
              });

              if (person && typeof person.canonical_url === "string" && person.canonical_url.trim()) {
                const personUrl = person.canonical_url.trim();
                const setPeople = source === "fandom" ? setSyncFandomPreviewPeople : setSyncBravoPreviewPeople;
                setPeople((prev) => {
                  const byUrl = new Map<string, BravoPreviewPerson>();
                  for (const existing of prev) {
                    const existingUrl =
                      typeof existing.canonical_url === "string" ? existing.canonical_url.trim() : "";
                    if (!existingUrl) continue;
                    byUrl.set(existingUrl, existing);
                  }
                  byUrl.set(personUrl, person);
                  return Array.from(byUrl.values()).sort((a, b) => {
                    const aKey = String(a.name || a.canonical_url || "").toLowerCase();
                    const bKey = String(b.name || b.canonical_url || "").toLowerCase();
                    return aKey.localeCompare(bKey);
                  });
                });
              }

              const testedRaw =
                source === "fandom" ? payload.fandom_candidates_tested : payload.bravo_candidates_tested;
              const validRaw =
                source === "fandom" ? payload.fandom_candidates_valid : payload.bravo_candidates_valid;
              const missingRaw =
                source === "fandom" ? payload.fandom_candidates_missing : payload.bravo_candidates_missing;
              const errorsRaw =
                source === "fandom" ? payload.fandom_candidates_errors : payload.bravo_candidates_errors;
              if (
                typeof testedRaw === "number" &&
                typeof validRaw === "number" &&
                typeof missingRaw === "number" &&
                typeof errorsRaw === "number"
              ) {
                const resolvedSummary = {
                  tested: testedRaw,
                  valid: validRaw,
                  missing: missingRaw,
                  errors: errorsRaw,
                };
                if (source === "fandom") {
                  liveFandomSummary = resolvedSummary;
                  setSyncFandomCandidateSummary(resolvedSummary);
                } else {
                  liveBravoSummary = resolvedSummary;
                  setSyncBravoCandidateSummary(resolvedSummary);
                }
              } else {
                let nextSummary = source === "fandom" ? liveFandomSummary : liveBravoSummary;
                if (status === "ok") nextSummary = { ...nextSummary, tested: nextSummary.tested + 1, valid: nextSummary.valid + 1 };
                else if (status === "missing") {
                  nextSummary = { ...nextSummary, tested: nextSummary.tested + 1, missing: nextSummary.missing + 1 };
                } else if (status === "error") {
                  nextSummary = { ...nextSummary, tested: nextSummary.tested + 1, errors: nextSummary.errors + 1 };
                }
                if (source === "fandom") {
                  liveFandomSummary = nextSummary;
                  setSyncFandomCandidateSummary(nextSummary);
                } else {
                  liveBravoSummary = nextSummary;
                  setSyncBravoCandidateSummary(nextSummary);
                }
              }

              const bravoInFlight = bravoTotal > liveBravoSummary.tested ? 1 : 0;
              const fandomInFlight = fandomTotal > liveFandomSummary.tested ? 1 : 0;
              const inFlight = bravoInFlight + fandomInFlight;
              setSyncBravoProbeActive(inFlight > 0);
              setSyncBravoProbeStatusMessage(
                bravoTotal + fandomTotal > 0
                  ? `Probing cast profiles: Bravo ${Math.min(liveBravoSummary.tested, bravoTotal)}/${bravoTotal}, Fandom ${Math.min(liveFandomSummary.tested, fandomTotal)}/${fandomTotal} (${inFlight} in flight).`
                  : "No canonical cast profile URLs to probe."
              );
            } else if (eventType === "complete") {
              finalPayload = payload;
            } else if (eventType === "error") {
              const detail =
                typeof payload.detail === "string" && payload.detail.trim()
                  ? payload.detail.trim()
                  : null;
              const errorLabel =
                typeof payload.error === "string" && payload.error.trim()
                  ? payload.error.trim()
                  : "Bravo cast-only stream failed";
              throw new Error(detail ? `${errorLabel}: ${detail}` : errorLabel);
            }

            boundaryIndex = buffer.indexOf("\n\n");
          }
        }

        const completePayload = finalPayload ?? {};
        const nextPeople = Array.isArray(completePayload.people)
          ? completePayload.people.filter((person): person is BravoPreviewPerson => {
              const personUrl = person?.canonical_url;
              return typeof personUrl === "string" && personUrl.trim().length > 0;
            })
          : [];
        const nextFandomPeople = Array.isArray(completePayload.fandom_people)
          ? completePayload.fandom_people.filter((person): person is BravoPreviewPerson => {
              const personUrl = person?.canonical_url;
              return typeof personUrl === "string" && personUrl.trim().length > 0;
            })
          : [];
        const nextCandidateResults = Array.isArray(completePayload.person_candidate_results)
          ? completePayload.person_candidate_results
              .map((row) => {
                if (!row || typeof row !== "object") return null;
                const url = typeof (row as { url?: unknown }).url === "string" ? String((row as { url?: unknown }).url).trim() : "";
                if (!url) return null;
                const nameRaw = (row as { name?: unknown }).name;
                const errorRaw = (row as { error?: unknown }).error;
                const personRaw = (row as { person?: unknown }).person;
                return {
                  url,
                  source: "bravo",
                  name: typeof nameRaw === "string" && nameRaw.trim() ? nameRaw.trim() : null,
                  status:
                    typeof (row as { status?: unknown }).status === "string"
                      ? String((row as { status?: unknown }).status)
                      : undefined,
                  error: typeof errorRaw === "string" && errorRaw.trim() ? errorRaw.trim() : null,
                  person:
                  personRaw && typeof personRaw === "object" && !Array.isArray(personRaw)
                      ? (personRaw as BravoPreviewPerson)
                      : null,
                } satisfies BravoPersonCandidateResult;
              })
              .filter((value) => Boolean(value)) as BravoPersonCandidateResult[]
          : [];
        const nextFandomCandidateResults = Array.isArray(completePayload.fandom_candidate_results)
          ? completePayload.fandom_candidate_results
              .map((row) => {
                if (!row || typeof row !== "object") return null;
                const url = typeof (row as { url?: unknown }).url === "string" ? String((row as { url?: unknown }).url).trim() : "";
                if (!url) return null;
                const nameRaw = (row as { name?: unknown }).name;
                const errorRaw = (row as { error?: unknown }).error;
                const personRaw = (row as { person?: unknown }).person;
                return {
                  url,
                  source: "fandom",
                  name: typeof nameRaw === "string" && nameRaw.trim() ? nameRaw.trim() : null,
                  status:
                    typeof (row as { status?: unknown }).status === "string"
                      ? String((row as { status?: unknown }).status)
                      : undefined,
                  error: typeof errorRaw === "string" && errorRaw.trim() ? errorRaw.trim() : null,
                  person:
                    personRaw && typeof personRaw === "object" && !Array.isArray(personRaw)
                      ? (personRaw as BravoPreviewPerson)
                      : null,
                } satisfies BravoPersonCandidateResult;
              })
              .filter((value) => Boolean(value)) as BravoPersonCandidateResult[]
          : [];
        const summary: BravoCandidateSummary = {
          tested:
            typeof completePayload.bravo_candidates_tested === "number"
              ? completePayload.bravo_candidates_tested
              : nextCandidateResults.filter((row) => {
                  const status = String(row.status || "").trim().toLowerCase();
                  return status === "ok" || status === "missing" || status === "error";
                }).length,
          valid:
            typeof completePayload.bravo_candidates_valid === "number"
              ? completePayload.bravo_candidates_valid
              : nextCandidateResults.filter((row) => String(row.status || "").trim().toLowerCase() === "ok").length,
          missing:
            typeof completePayload.bravo_candidates_missing === "number"
              ? completePayload.bravo_candidates_missing
              : nextCandidateResults.filter((row) => String(row.status || "").trim().toLowerCase() === "missing")
                  .length,
          errors:
            typeof completePayload.bravo_candidates_errors === "number"
              ? completePayload.bravo_candidates_errors
              : nextCandidateResults.filter((row) => String(row.status || "").trim().toLowerCase() === "error")
                  .length,
        };
        const fandomSummary: BravoCandidateSummary = {
          tested:
            typeof completePayload.fandom_candidates_tested === "number"
              ? completePayload.fandom_candidates_tested
              : nextFandomCandidateResults.filter((row) => {
                  const status = String(row.status || "").trim().toLowerCase();
                  return status === "ok" || status === "missing" || status === "error";
                }).length,
          valid:
            typeof completePayload.fandom_candidates_valid === "number"
              ? completePayload.fandom_candidates_valid
              : nextFandomCandidateResults.filter((row) => String(row.status || "").trim().toLowerCase() === "ok")
                  .length,
          missing:
            typeof completePayload.fandom_candidates_missing === "number"
              ? completePayload.fandom_candidates_missing
              : nextFandomCandidateResults.filter((row) => String(row.status || "").trim().toLowerCase() === "missing")
                  .length,
          errors:
            typeof completePayload.fandom_candidates_errors === "number"
              ? completePayload.fandom_candidates_errors
              : nextFandomCandidateResults.filter((row) => String(row.status || "").trim().toLowerCase() === "error")
                  .length,
        };
        const nextFandomDomainsUsed = Array.isArray(completePayload.fandom_domains_used)
          ? completePayload.fandom_domains_used
              .filter((value): value is string => typeof value === "string")
              .map((value) => value.trim())
              .filter((value) => value.length > 0)
          : [];
        const nextDiscoveredUrls = Array.isArray(completePayload.discovered_person_urls)
          ? completePayload.discovered_person_urls
              .filter((url): url is string => typeof url === "string")
              .map((url) => url.trim())
              .filter((url) => url.length > 0)
          : [];

        setSyncBravoDescription("");
        setSyncBravoApplyDescriptionToShow(false);
        setSyncBravoAirs("");
        setSyncBravoImages([]);
        setSyncBravoImageKinds({});
        setSyncBravoSelectedImages(new Set());
        setSyncBravoPreviewPeople((prev) => (nextPeople.length > 0 ? nextPeople : prev));
        setSyncFandomPreviewPeople((prev) => (nextFandomPeople.length > 0 ? nextFandomPeople : prev));
        setSyncBravoPersonCandidateResults(nextCandidateResults.length > 0 ? nextCandidateResults : pendingRows);
        setSyncFandomPersonCandidateResults(nextFandomCandidateResults);
        setSyncBravoPreviewResult(completePayload);
        setSyncBravoPreviewSignature(
          typeof completePayload.preview_signature === "string" && completePayload.preview_signature.trim()
            ? completePayload.preview_signature.trim()
            : null
        );
        setSyncBravoCandidateSummary(summary);
        setSyncFandomCandidateSummary(fandomSummary);
        setSyncFandomDomainsUsed(nextFandomDomainsUsed);
        const resolvedBravoTotal = bravoTotal > 0 ? bravoTotal : summary.tested;
        const resolvedFandomTotal = fandomTotal > 0 ? fandomTotal : fandomSummary.tested;
        setSyncBravoProbeTotal(resolvedBravoTotal + resolvedFandomTotal);
        setSyncBravoProbeActive(false);
        setSyncBravoProbeStatusMessage(
          `Probe complete: Bravo tested ${summary.tested}, valid ${summary.valid}, missing ${summary.missing}, error ${summary.errors}; Fandom tested ${fandomSummary.tested}, valid ${fandomSummary.valid}, missing ${fandomSummary.missing}, error ${fandomSummary.errors}.`
        );
        setSyncBravoDiscoveredPersonUrls(nextDiscoveredUrls);
        setSyncBravoPreviewVideos([]);
        setSyncBravoPreviewNews([]);
        setSyncBravoPreviewSeasonFilter("all");
        setSyncBravoNotice("Cast-only preview loaded from Bravo + Fandom.");
        appendRefreshLog({
          category: "BravoTV",
          message: `Cast-only preview ready: Bravo tested ${summary.tested}, valid ${summary.valid}, missing ${summary.missing}, errors ${summary.errors}; Fandom tested ${fandomSummary.tested}, valid ${fandomSummary.valid}, missing ${fandomSummary.missing}, errors ${fandomSummary.errors}.`,
        });
        return;
      }

      const response = await fetchWithTimeout(
        `/api/admin/trr-api/shows/${showId}/import-bravo/preview`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            show_url: targetUrl,
            cast_only: false,
            include_people: true,
            include_videos: includeFullShowContent,
            include_news: includeFullShowContent,
            person_url_candidates: syncBravoCastUrlCandidates,
            season_number: syncBravoTargetSeasonNumber ?? defaultSyncBravoSeasonNumber ?? undefined,
          }),
        },
        BRAVO_IMPORT_MUTATION_TIMEOUT_MS
      );
      const clone = response.clone();
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        detail?: string;
        show?: { description?: string | null; airs_text?: string | null };
        image_candidates?: Array<{ url?: string; alt?: string | null }>;
        people?: BravoPreviewPerson[];
        person_candidate_results?: BravoPersonCandidateResult[];
        fandom_people?: BravoPreviewPerson[];
        fandom_domains_used?: string[];
        fandom_candidate_results?: BravoPersonCandidateResult[];
        bravo_candidates_tested?: number;
        bravo_candidates_valid?: number;
        bravo_candidates_missing?: number;
        bravo_candidates_errors?: number;
        fandom_candidates_tested?: number;
        fandom_candidates_valid?: number;
        fandom_candidates_missing?: number;
        fandom_candidates_errors?: number;
        discovered_person_urls?: string[];
        videos?: BravoVideoItem[];
        news?: BravoNewsItem[];
        preview_signature?: string;
      } | null;
      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.detail ||
            `Bravo preview failed (HTTP ${response.status})`
        );
      }

      if (!data || typeof data !== "object") {
        const fallbackText = (await clone.text().catch(() => "")).trim();
        const message = fallbackText
          ? `Bravo preview returned a non-JSON payload: ${fallbackText.slice(0, 180)}`
          : "Bravo preview returned an empty response.";
        throw new Error(message);
      }

      const nextDescription =
        typeof data.show?.description === "string" ? data.show.description : "";
      const nextAirs =
        typeof data.show?.airs_text === "string" ? data.show.airs_text : "";
      const nextImages = Array.isArray(data.image_candidates)
        ? data.image_candidates
            .map((image) => ({
              url: typeof image.url === "string" ? image.url : "",
              alt: typeof image.alt === "string" ? image.alt : null,
            }))
            .filter((image) => image.url)
        : [];
      const nextVideos = Array.isArray(data.videos)
        ? data.videos.filter((video): video is BravoVideoItem => typeof video?.clip_url === "string")
        : [];
      const nextNews = Array.isArray(data.news)
        ? data.news.filter((item): item is BravoNewsItem => typeof item?.article_url === "string")
        : [];
      const nextPeople = Array.isArray(data.people)
        ? data.people.filter((person): person is BravoPreviewPerson => {
            const personUrl = person?.canonical_url;
            return typeof personUrl === "string" && personUrl.trim().length > 0;
          })
        : [];
      const nextFandomPeople = Array.isArray(data.fandom_people)
        ? data.fandom_people.filter((person): person is BravoPreviewPerson => {
            const personUrl = person?.canonical_url;
            return typeof personUrl === "string" && personUrl.trim().length > 0;
          })
        : [];
      const nextCandidateResults = Array.isArray(data.person_candidate_results)
        ? data.person_candidate_results
            .map((row) => {
              const url = typeof row?.url === "string" ? row.url.trim() : "";
              if (!url) return null;
              return {
                url,
                source: "bravo",
                name: typeof row?.name === "string" && row.name.trim() ? row.name.trim() : null,
                status: typeof row?.status === "string" ? row.status : undefined,
                error:
                  typeof row?.error === "string" && row.error.trim().length > 0
                    ? row.error.trim()
                    : null,
                person:
                  row?.person && typeof row.person === "object" && !Array.isArray(row.person)
                    ? (row.person as BravoPreviewPerson)
                    : null,
              } satisfies BravoPersonCandidateResult;
            })
            .filter((value) => Boolean(value)) as BravoPersonCandidateResult[]
        : [];
      const nextFandomCandidateResults = Array.isArray(data.fandom_candidate_results)
        ? data.fandom_candidate_results
            .map((row) => {
              const url = typeof row?.url === "string" ? row.url.trim() : "";
              if (!url) return null;
              return {
                url,
                source: "fandom",
                name: typeof row?.name === "string" && row.name.trim() ? row.name.trim() : null,
                status: typeof row?.status === "string" ? row.status : undefined,
                error:
                  typeof row?.error === "string" && row.error.trim().length > 0
                    ? row.error.trim()
                    : null,
                person:
                  row?.person && typeof row.person === "object" && !Array.isArray(row.person)
                    ? (row.person as BravoPreviewPerson)
                    : null,
              } satisfies BravoPersonCandidateResult;
            })
            .filter((value) => Boolean(value)) as BravoPersonCandidateResult[]
        : [];
      const nextCandidateSummary: BravoCandidateSummary = {
        tested:
          typeof data.bravo_candidates_tested === "number"
            ? data.bravo_candidates_tested
            : nextCandidateResults.filter((row) => {
                const status = String(row.status || "").trim().toLowerCase();
                return status === "ok" || status === "missing" || status === "error";
              }).length,
        valid:
          typeof data.bravo_candidates_valid === "number"
            ? data.bravo_candidates_valid
            : nextCandidateResults.filter((row) => String(row.status || "").trim().toLowerCase() === "ok")
                .length,
        missing:
          typeof data.bravo_candidates_missing === "number"
            ? data.bravo_candidates_missing
            : nextCandidateResults.filter((row) => String(row.status || "").trim().toLowerCase() === "missing")
                .length,
        errors:
          typeof data.bravo_candidates_errors === "number"
            ? data.bravo_candidates_errors
            : nextCandidateResults.filter((row) => String(row.status || "").trim().toLowerCase() === "error")
                .length,
      };
      const nextFandomCandidateSummary: BravoCandidateSummary = {
        tested:
          typeof data.fandom_candidates_tested === "number"
            ? data.fandom_candidates_tested
            : nextFandomCandidateResults.filter((row) => {
                const status = String(row.status || "").trim().toLowerCase();
                return status === "ok" || status === "missing" || status === "error";
              }).length,
        valid:
          typeof data.fandom_candidates_valid === "number"
            ? data.fandom_candidates_valid
            : nextFandomCandidateResults.filter((row) => String(row.status || "").trim().toLowerCase() === "ok")
                .length,
        missing:
          typeof data.fandom_candidates_missing === "number"
            ? data.fandom_candidates_missing
            : nextFandomCandidateResults.filter((row) => String(row.status || "").trim().toLowerCase() === "missing")
                .length,
        errors:
          typeof data.fandom_candidates_errors === "number"
            ? data.fandom_candidates_errors
            : nextFandomCandidateResults.filter((row) => String(row.status || "").trim().toLowerCase() === "error")
                .length,
      };
      const nextFandomDomains = Array.isArray(data.fandom_domains_used)
        ? data.fandom_domains_used
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter((value) => value.length > 0)
        : [];
      const nextDiscoveredUrls = Array.isArray(data.discovered_person_urls)
        ? data.discovered_person_urls
            .filter((url): url is string => typeof url === "string")
            .map((url) => url.trim())
            .filter((url) => url.length > 0)
        : [];
      const excludedShowImageUrls = new Set<string>();
      for (const video of nextVideos) {
        if (typeof video.image_url === "string" && video.image_url.trim()) {
          excludedShowImageUrls.add(video.image_url.trim());
        }
      }
      for (const newsItem of nextNews) {
        if (typeof newsItem.image_url === "string" && newsItem.image_url.trim()) {
          excludedShowImageUrls.add(newsItem.image_url.trim());
        }
      }
      const filteredShowImages = nextImages.filter((image) => !excludedShowImageUrls.has(image.url));
      const nextImageKinds: Record<string, BravoImportImageKind> = {};
      for (const image of filteredShowImages) {
        nextImageKinds[image.url] = inferBravoImportImageKind(image);
      }

      const seasonFromPreview = nextVideos
        .map((video) => video.season_number)
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
      const seasonFromShow = seasons
        .map((season) => season.season_number)
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
      const latestSeason = [...seasonFromPreview, ...seasonFromShow].sort((a, b) => b - a)[0] ?? null;
      const defaultPreviewSeason =
        typeof syncBravoTargetSeasonNumber === "number" &&
        seasonFromPreview.includes(syncBravoTargetSeasonNumber)
          ? syncBravoTargetSeasonNumber
          : latestSeason !== null && seasonFromPreview.includes(latestSeason)
            ? latestSeason
            : seasonFromPreview.length > 0
              ? [...seasonFromPreview].sort((a, b) => b - a)[0]
              : "all";

      setSyncBravoDescription(nextDescription);
      setSyncBravoAirs(nextAirs);
      setSyncBravoImages(filteredShowImages);
      setSyncBravoImageKinds(nextImageKinds);
      setSyncBravoPreviewPeople(nextPeople);
      setSyncFandomPreviewPeople(nextFandomPeople);
      setSyncBravoPersonCandidateResults(nextCandidateResults);
      setSyncFandomPersonCandidateResults(nextFandomCandidateResults);
      setSyncBravoPreviewResult(data as Record<string, unknown>);
      setSyncBravoPreviewSignature(
        typeof data.preview_signature === "string" && data.preview_signature.trim()
          ? data.preview_signature.trim()
          : null
      );
      setSyncBravoCandidateSummary(nextCandidateSummary);
      setSyncFandomCandidateSummary(nextFandomCandidateSummary);
      setSyncFandomDomainsUsed(nextFandomDomains);
      setSyncBravoProbeTotal(nextCandidateSummary.tested + nextFandomCandidateSummary.tested);
      setSyncBravoProbeStatusMessage(null);
      setSyncBravoProbeActive(false);
      setSyncBravoDiscoveredPersonUrls(nextDiscoveredUrls);
      setSyncBravoPreviewVideos(nextVideos);
      setSyncBravoPreviewNews(nextNews);
      setSyncBravoPreviewSeasonFilter(defaultPreviewSeason);
      setSyncBravoSelectedImages(new Set(filteredShowImages.map((image) => image.url)));
      setSyncBravoNotice("Preview loaded from persisted Bravo parse output.");
      appendRefreshLog({
        category: "BravoTV",
        message: `Preview ready: Bravo cast ${nextPeople.length}, Fandom cast ${nextFandomPeople.length}, ${nextVideos.length} videos, ${nextNews.length} news, ${filteredShowImages.length} show images.`,
      });
    } catch (err) {
      if (
        selectedMode === "cast-only" &&
        (runId !== syncBravoPreviewRunRef.current || isAbortError(err))
      ) {
        return;
      }
      appendRefreshLog({
        category: "BravoTV",
        message: `Preview failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
      setSyncBravoError(err instanceof Error ? err.message : "Bravo preview failed");
    } finally {
      if (selectedMode === "cast-only" && syncBravoPreviewAbortControllerRef.current === castOnlyController) {
        syncBravoPreviewAbortControllerRef.current = null;
      }
      if (runId === syncBravoPreviewRunRef.current) {
        setSyncBravoPreviewLoading(false);
      }
    }
  }, [
    abortSyncBravoPreviewStream,
    appendRefreshLog,
    cast.length,
    defaultSyncBravoSeasonNumber,
    getAuthHeaders,
    seasonEpisodeSummaries,
    seasons,
    showId,
    show?.show_total_episodes,
    syncBravoSeasonEligibilityError,
    syncBravoSeasonOptions.length,
    syncBravoCastCandidateNameByUrl,
    syncBravoCastUrlCandidates,
    syncBravoTargetSeasonNumber,
    syncBravoRunMode,
    syncBravoUrl,
  ]);

  const commitSyncByBravo = useCallback(async () => {
    if (!syncBravoUrl.trim()) {
      setSyncBravoError("Show URL is required.");
      return;
    }
    if (syncBravoSeasonOptions.length === 0) {
      setSyncBravoError(syncBravoSeasonEligibilityError);
      appendRefreshLog({
        category: "BravoTV",
        message: `Blocked: ${syncBravoSeasonEligibilityError}`,
      });
      return;
    }

    setSyncBravoCommitLoading(true);
    setSyncBravoError(null);
    setSyncBravoNotice(null);
    appendRefreshLog({
      category: "BravoTV",
      message:
        syncBravoRunMode === "cast-only" ? "Committing Bravo cast-only sync..." : "Committing Bravo sync...",
    });

    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout(
        `/api/admin/trr-api/shows/${showId}/import-bravo/commit`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            show_url: syncBravoUrl.trim(),
            selected_show_images: Array.from(syncBravoSelectedImages).map((url) => ({
              url,
              kind: syncBravoImageKinds[url] ?? "promo",
            })),
            selected_show_image_urls: Array.from(syncBravoSelectedImages),
            description_override:
              syncBravoApplyDescriptionToShow && syncBravoDescription.trim()
                ? syncBravoDescription.trim()
                : undefined,
            apply_show_description_override: syncBravoApplyDescriptionToShow,
            airs_override: syncBravoAirs.trim() || undefined,
            cast_only: syncBravoRunMode === "cast-only",
            person_url_candidates: syncBravoCastUrlCandidates,
            season_number:
              syncBravoTargetSeasonNumber ?? defaultSyncBravoSeasonNumber ?? undefined,
            preview_result:
              syncBravoRunMode === "cast-only" && syncBravoPreviewResult
                ? syncBravoPreviewResult
                : undefined,
            preview_signature:
              syncBravoRunMode === "cast-only" && syncBravoPreviewSignature
                ? syncBravoPreviewSignature
                : undefined,
          }),
        },
        BRAVO_IMPORT_MUTATION_TIMEOUT_MS
      );

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        detail?: string;
        counts?: {
          imported_show_images?: number;
          people_updated?: number;
          fandom_candidates_tested?: number;
          fandom_candidates_valid?: number;
          fandom_candidates_missing?: number;
          fandom_candidates_errors?: number;
          fandom_profiles_upserted?: number;
          fandom_links_upserted?: number;
          fandom_na_marked?: number;
          fandom_fallback_images_imported?: number;
        };
      };
      if (!response.ok) {
        const failureMessage = data.error || data.detail || "Bravo sync failed";
        if (response.status === 409 && failureMessage.toLowerCase().includes("preview stale")) {
          throw new Error("Preview stale. Re-run preview before committing cast-only sync.");
        }
        throw new Error(failureMessage);
      }

      const noticeParts: string[] = [];
      if (typeof data.counts?.people_updated === "number") {
        noticeParts.push(`people updated: ${data.counts.people_updated}`);
      }
      if (typeof data.counts?.imported_show_images === "number") {
        noticeParts.push(`images imported: ${data.counts.imported_show_images}`);
      }
      if (typeof data.counts?.fandom_candidates_tested === "number") {
        noticeParts.push(`fandom tested: ${data.counts.fandom_candidates_tested}`);
      }
      if (typeof data.counts?.fandom_profiles_upserted === "number") {
        noticeParts.push(`fandom profiles: ${data.counts.fandom_profiles_upserted}`);
      }
      if (typeof data.counts?.fandom_fallback_images_imported === "number") {
        noticeParts.push(`fandom image fallback: ${data.counts.fandom_fallback_images_imported}`);
      }
      setSyncBravoNotice(
        `${syncBravoRunMode === "cast-only" ? "Synced Bravo + Fandom cast members" : "Synced Bravo + Fandom data"}${noticeParts.length > 0 ? `; ${noticeParts.join("; ")}` : ""}.`
      );
      appendRefreshLog({
        category: "BravoTV",
        message: `${syncBravoRunMode === "cast-only" ? "Bravo/Fandom cast-only sync complete" : "Bravo/Fandom sync complete"}: ${data.counts?.people_updated ?? 0} people updated, ${data.counts?.imported_show_images ?? 0} show images imported, ${data.counts?.fandom_profiles_upserted ?? 0} fandom profiles upserted, ${data.counts?.fandom_fallback_images_imported ?? 0} fandom fallback images imported.`,
      });

      await Promise.all([
        fetchShow(),
        fetchCast({ rosterMode: "imdb_show_membership", minEpisodes: 1 }),
        fetchCastRoleMembers({ force: true }),
      ]);
      setBravoLoaded(false);
      setNewsLoaded(false);
      void loadBravoData({ force: true });
      void loadUnifiedNews({ force: true });
    } catch (err) {
      appendRefreshLog({
        category: "BravoTV",
        message: `Bravo sync failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
      setSyncBravoError(err instanceof Error ? err.message : "Bravo sync failed");
    } finally {
      setSyncBravoCommitLoading(false);
    }
  }, [
    appendRefreshLog,
    fetchCast,
    fetchCastRoleMembers,
    fetchShow,
    getAuthHeaders,
    loadBravoData,
    loadUnifiedNews,
    showId,
    syncBravoDescription,
    syncBravoApplyDescriptionToShow,
    syncBravoImageKinds,
    defaultSyncBravoSeasonNumber,
    syncBravoSeasonEligibilityError,
    syncBravoSeasonOptions.length,
    syncBravoSelectedImages,
    syncBravoCastUrlCandidates,
    syncBravoPreviewResult,
    syncBravoPreviewSignature,
    syncBravoAirs,
    syncBravoRunMode,
    syncBravoTargetSeasonNumber,
    syncBravoUrl,
    setNewsLoaded,
  ]);

  const syncBravoLoading = syncBravoPreviewLoading || syncBravoCommitLoading;
  const syncBravoModeSummaryLabel =
    syncBravoRunMode === "cast-only" ? "Cast Info only" : "Sync All Info";

  // Check if show is covered
  const checkCoverage = useCallback(async () => {
    const requestShowId = showId;
    if (!requestShowId) return;
    try {
      const headers = await getAuthHeaders();
      await adminGetJson(
        `/api/admin/covered-shows/${requestShowId}`,
        {
          headers,
          timeoutMs: SHOW_CORE_LOAD_TIMEOUT_MS,
        }
      );
      if (!isCurrentShowId(requestShowId)) return;
      setIsCovered(true);
      setCoverageError(null);
    } catch {
      if (!isCurrentShowId(requestShowId)) return;
      setIsCovered(false);
    }
  }, [getAuthHeaders, isCurrentShowId, showId]);

  // Add show to covered shows
  const addToCoveredShows = async () => {
    if (!show || !showId) return;
    setCoverageLoading(true);
    setCoverageError(null);
    try {
      const headers = await getAuthHeaders();
      await adminMutation<{ error?: string }>(
        "/api/admin/covered-shows",
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ trr_show_id: showId, show_name: show.name }),
          timeoutMs: COVERAGE_MUTATION_TIMEOUT_MS,
        },
      );
      setIsCovered(true);
    } catch (err) {
      setCoverageError(err instanceof Error ? err.message : "Failed to add show visibility");
    } finally {
      setCoverageLoading(false);
    }
  };

  // Remove show from covered shows
  const removeFromCoveredShows = async () => {
    if (!showId) return;
    setCoverageLoading(true);
    setCoverageError(null);
    try {
      const headers = await getAuthHeaders();
      await adminMutation<{ error?: string }>(
        `/api/admin/covered-shows/${showId}`,
        {
          method: "DELETE",
          headers,
          timeoutMs: COVERAGE_MUTATION_TIMEOUT_MS,
        },
      );
      setIsCovered(false);
    } catch (err) {
      setCoverageError(err instanceof Error ? err.message : "Failed to remove show visibility");
    } finally {
      setCoverageLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (!hasAccess) return;
    if (!showId) return;

    const loadData = async () => {
      const requestShowId = showId;
      if (!isCurrentShowId(requestShowId)) return;
      setLoading(true);
      try {
        await fetchShow();
        // Keep initial render fast: load core show data first.
        await Promise.allSettled([fetchSeasons(), checkCoverage()]);
      } finally {
        if (!isCurrentShowId(requestShowId)) return;
        setLoading(false);
      }
      if (!isCurrentShowId(requestShowId)) return;
      // Bravo data can be slow/unavailable and should not block page load.
      void loadBravoData();
    };

    void loadData();
  }, [hasAccess, showId, fetchShow, fetchSeasons, checkCoverage, isCurrentShowId, loadBravoData]);

  useEffect(() => {
    if (!hasAccess || !showId || (activeTab !== "settings" && activeTab !== "details" && activeTab !== "cast")) {
      return;
    }
    void fetchShowLinks();
  }, [activeTab, fetchShowLinks, hasAccess, showId]);

  useEffect(() => {
    const candidates = showLinks.filter(
      (link) =>
        link.entity_type === "show" &&
        link.link_kind === "google_news_url" &&
        Number(link.season_number || 0) === 0
    );
    if (candidates.length === 0) {
      setGoogleNewsLinkId(null);
      setGoogleNewsUrl("");
      return;
    }
    const rankStatus = (status: EntityLinkStatus): number => {
      if (status === "approved") return 0;
      if (status === "pending") return 1;
      return 2;
    };
    const sorted = [...candidates].sort((a, b) => {
      const statusDiff = rankStatus(normalizeEntityLinkStatus(a.status)) - rankStatus(normalizeEntityLinkStatus(b.status));
      if (statusDiff !== 0) return statusDiff;
      return (b.updated_at || "").localeCompare(a.updated_at || "");
    });
    const selected = sorted[0] ?? null;
    setGoogleNewsLinkId(selected?.id ?? null);
    setGoogleNewsUrl(selected?.url ?? "");
  }, [showLinks]);

  useEffect(() => {
    if (!hasAccess || !showId || (activeTab !== "cast" && activeTab !== "settings")) return;
    const autoLoadKey = `${showId}:roles`;
    if (showRolesAutoLoadAttemptedRef.current === autoLoadKey) return;
    showRolesAutoLoadAttemptedRef.current = autoLoadKey;
    void fetchShowRoles();
  }, [activeTab, fetchShowRoles, hasAccess, showId]);

  useEffect(() => {
    if (!hasAccess || !showId || activeTab !== "cast") return;
    const autoLoadKey = `${showId}:cast`;
    if (castAutoLoadAttemptedRef.current === autoLoadKey) return;
    castAutoLoadAttemptedRef.current = autoLoadKey;
    void fetchCast({ force: true });
  }, [activeTab, fetchCast, hasAccess, showId]);

  useEffect(() => {
    if (!hasAccess || !showId || activeTab !== "cast") return;
    const seasonsKey = [...castSeasonFilters].sort((a, b) => a - b).join(",");
    const autoLoadKey = `${showId}|${seasonsKey}`;
    if (castRoleMembersAutoLoadAttemptedRef.current === autoLoadKey) return;
    castRoleMembersAutoLoadAttemptedRef.current = autoLoadKey;
    void fetchCastRoleMembers();
  }, [activeTab, castSeasonFilters, fetchCastRoleMembers, hasAccess, showId]);

  useEffect(() => {
    if (!hasAccess || !showId || activeTab !== "cast") return;
    const intelligenceSettled = !castRoleMembersLoading && !rolesLoading;
    const intelligenceReady =
      intelligenceSettled &&
      !castRoleMembersError &&
      !rolesError &&
      (castRoleMembersLoadedOnce || showRolesLoadedOnce);
    if (!intelligenceReady) return;
    if (castLoading || castLoadError) return;
    if (cast.length > 0 || archiveFootageCast.length > 0) return;

    const recoveryModeKey = castLoadedOnce ? "empty-cast-recovery" : "initial-cast-recovery";
    const recoveryKey = `${showId}:${recoveryModeKey}`;
    if (castAutoRecoveryAttemptedRef.current === recoveryKey) return;
    castAutoRecoveryAttemptedRef.current = recoveryKey;

    if (castLoadedOnce) {
      setCastLoadWarning("Cast list unavailable; retrying cast roster...");
    } else {
      setCastLoadWarning("Loading cast roster...");
    }
    void fetchCast({ force: true });
  }, [
    activeTab,
    archiveFootageCast.length,
    cast.length,
    castLoadError,
    castLoadedOnce,
    castLoading,
    castRoleMembersError,
    castRoleMembersLoadedOnce,
    castRoleMembersLoading,
    fetchCast,
    hasAccess,
    rolesError,
    rolesLoading,
    showId,
    showRolesLoadedOnce,
  ]);

  useEffect(() => {
    castRefreshAbortControllerRef.current?.abort();
    castMediaEnrichAbortControllerRef.current?.abort();
    castLoadAbortControllerRef.current?.abort();
    abortInFlightPersonRefreshRuns();
    castRefreshAbortControllerRef.current = null;
    castMediaEnrichAbortControllerRef.current = null;
    castLoadAbortControllerRef.current = null;
    abortSyncBravoPreviewStream();
    syncBravoPreviewRunRef.current += 1;
    setSyncBravoModePickerOpen(false);
    setSyncBravoOpen(false);
    setSyncBravoRunMode("full");
    setSyncBravoStep("preview");
    setSyncBravoError(null);
    setSyncBravoNotice(null);
    setSyncBravoPreviewPeople([]);
    setSyncFandomPreviewPeople([]);
    setSyncBravoPersonCandidateResults([]);
    setSyncFandomPersonCandidateResults([]);
    setSyncBravoPreviewResult(null);
    setSyncBravoPreviewSignature(null);
    setSyncBravoCandidateSummary(null);
    setSyncFandomCandidateSummary(null);
    setSyncFandomDomainsUsed([]);
    setSyncBravoProbeTotal(0);
    setSyncBravoProbeStatusMessage(null);
    setSyncBravoProbeActive(false);
    setSyncBravoDiscoveredPersonUrls([]);
    setSyncBravoPreviewVideos([]);
    setSyncBravoPreviewNews([]);
    setSyncBravoImages([]);
    setSyncBravoSelectedImages(new Set());
    setSyncBravoImageKinds({});
    setBravoVideos([]);
    setBravoError(null);
    setBravoVideoSyncing(false);
    setBravoVideoSyncWarning(null);
    setBravoLoaded(false);
    bravoLoadInFlightRef.current = null;
    bravoVideoSyncInFlightRef.current = null;
    bravoVideoSyncAttemptedRef.current = false;
    setUnifiedNews([]);
    setNewsError(null);
    setNewsNotice(null);
    setNewsLoaded(false);
    setNewsPageCount(0);
    setNewsTotalCount(0);
    setNewsFacets(EMPTY_NEWS_FACETS);
    setNewsNextCursor(null);
    setNewsGoogleUrlMissing(false);
    setNewsSort("trending");
    setNewsSourceFilter("");
    setNewsPersonFilter("");
    setNewsTopicFilter("");
    setNewsSeasonFilter("");
    newsLoadInFlightRef.current = null;
    newsSyncInFlightRef.current = null;
    newsAutoSyncAttemptedRef.current = false;
    newsLoadedQueryKeyRef.current = null;
    newsInFlightQueryKeyRef.current = null;
    newsRequestSeqRef.current = 0;
    pendingNewsReloadRef.current = false;
    pendingNewsReloadArgsRef.current = null;
    newsCursorQueryKeyRef.current = null;
    setShowLinks([]);
    setCast([]);
    setArchiveFootageCast([]);
    setCastLoadedOnce(false);
    castLoadedOnceRef.current = false;
    castSnapshotRef.current = { cast: [], archive: [] };
    castLoadInFlightRef.current = null;
    castAutoLoadAttemptedRef.current = null;
    castAutoRecoveryAttemptedRef.current = null;
    setCastLoading(false);
    setCastLoadError(null);
    setCastLoadWarning(null);
    setCastPhotoEnriching(false);
    setCastPhotoEnrichError(null);
    setCastPhotoEnrichNotice(null);
    setShowRoles([]);
    setShowRolesLoadedOnce(false);
    showRolesSnapshotRef.current = [];
    showRolesLoadedOnceRef.current = false;
    showRolesAutoLoadAttemptedRef.current = null;
    setRolesWarning(null);
    setLastSuccessfulRolesAt(null);
    setCastRoleMembers([]);
    setCastRoleMembersLoadedOnce(false);
    castRoleMembersSnapshotRef.current = [];
    castRoleMembersLoadedOnceRef.current = false;
    castRoleMembersAutoLoadAttemptedRef.current = null;
    showRolesLoadInFlightRef.current = null;
    castRoleMembersLoadInFlightRef.current = null;
    castRoleMembersLoadKeyRef.current = null;
    setCastRoleMembersError(null);
    setCastRoleMembersWarning(null);
    setLastSuccessfulCastRoleMembersAt(null);
    setCastRoleEditorDeepLinkWarning(null);
    setCastMatrixSyncError(null);
    setCastMatrixSyncResult(null);
    setCastRefreshPipelineRunning(false);
    setCastRefreshPhaseStates([]);
    setCastSortBy("episodes");
    setCastSortOrder("desc");
    setCastSeasonFilters([]);
    setCastRoleAndCreditFilters([]);
    setCastHasImageFilter("all");
    setCastSearchQuery("");
    setCastSearchQueryDebounced("");
    setCastRenderLimit(CAST_INCREMENTAL_INITIAL_LIMIT);
    setCrewRenderLimit(CAST_INCREMENTAL_INITIAL_LIMIT);
    setCastRunFailedMembers([]);
    setCastFailedMembersOpen(false);
    setLinksError(null);
    setLinksNotice(null);
    setGoogleNewsLinkId(null);
    setGoogleNewsUrl("");
    setGoogleNewsNotice(null);
    setGoogleNewsError(null);
    setDetailsEditing(false);
  }, [abortInFlightPersonRefreshRuns, abortSyncBravoPreviewStream, showId]);

  useEffect(() => {
    if (activeTab === "cast") return;
    castLoadAbortControllerRef.current?.abort();
    castLoadAbortControllerRef.current = null;
    castLoadInFlightRef.current = null;
    if (!castLoadedOnceRef.current) {
      castAutoLoadAttemptedRef.current = null;
    }
  }, [activeTab]);

  useEffect(() => () => {
    abortInFlightPersonRefreshRuns();
  }, [abortInFlightPersonRefreshRuns]);

  useEffect(() => {
    if (!hasAccess || !showId) return;
    const shouldLoadBravo = refreshLogOpen || (activeTab === "assets" && assetsView === "videos");
    if (!shouldLoadBravo) return;
    void loadBravoData({ syncThumbnails: activeTab === "assets" && assetsView === "videos" });
  }, [activeTab, assetsView, hasAccess, loadBravoData, refreshLogOpen, showId]);

  useEffect(() => {
    if (!hasAccess || !showId) return;
    const shouldLoadNews = refreshLogOpen || activeTab === "news";
    if (!shouldLoadNews) return;
    void loadUnifiedNews();
  }, [activeTab, hasAccess, loadUnifiedNews, refreshLogOpen, showId]);

  useEffect(() => {
    if (activeTab !== "seasons") return;
    if (seasons.length > 0) {
      void fetchSeasonEpisodeSummaries(seasons);
    }
  }, [activeTab, seasons, fetchSeasonEpisodeSummaries]);

  const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleDateString() : "TBD";

  const formatBravoPublishedDate = (value: string | null | undefined): string | null => {
    if (!value || typeof value !== "string") return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString();
  };

  const resolveBravoVideoThumbnailUrl = (video: BravoVideoItem): string | null => {
    if (typeof video.hosted_image_url === "string" && video.hosted_image_url.trim()) {
      return video.hosted_image_url.trim();
    }
    if (typeof video.image_url === "string" && video.image_url.trim()) {
      return video.image_url.trim();
    }
    if (typeof video.original_image_url === "string" && video.original_image_url.trim()) {
      return video.original_image_url.trim();
    }
    return null;
  };

  const formatDateRange = (
    premiere: string | null | undefined,
    finale: string | null | undefined
  ) => {
    const normalizedPremiere = premiere ?? null;
    const normalizedFinale = finale ?? null;
    if (!normalizedPremiere && !normalizedFinale) return "Dates unavailable";
    return `${formatDate(normalizedPremiere)} – ${formatDate(normalizedFinale)}`;
  };

  const castRoleMemberByPersonId = useMemo(
    () => new Map(castRoleMembers.map((member) => [member.person_id, member] as const)),
    [castRoleMembers]
  );

  const castDisplayBaseMembers = useMemo(() => {
    const seen = new Set<string>();
    const base: TrrCastMember[] = [];

    for (const member of cast) {
      const personId = String(member.person_id || "").trim();
      if (!personId) continue;
      if (seen.has(personId)) continue;
      seen.add(personId);
      base.push(member);
    }

    return base;
  }, [cast]);

  const availableCastRoles = useMemo(() => {
    const values = new Set<string>();
    for (const role of showRoles) {
      if (role.is_active) {
        const canonical = canonicalizeCastRoleName(role.name);
        if (canonical) values.add(canonical);
      }
    }
    for (const member of castRoleMembers) {
      for (const role of member.roles) {
        const canonical = canonicalizeCastRoleName(role);
        if (canonical) values.add(canonical);
      }
    }
    for (const member of cast) {
      const canonical = canonicalizeCastRoleName(member.role);
      if (canonical) values.add(canonical);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [cast, castRoleMembers, showRoles]);

  const availableCastCreditCategories = useMemo(() => {
    const values = new Set<string>();
    for (const member of cast) {
      if (typeof member.credit_category === "string" && member.credit_category.trim()) {
        values.add(member.credit_category.trim());
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [cast]);

  const availableCastSeasons = useMemo(() => {
    const values = new Set<number>();
    for (const season of seasons) {
      if (typeof season.season_number === "number" && Number.isFinite(season.season_number) && season.season_number > 0) {
        values.add(season.season_number);
      }
    }
    for (const member of castRoleMembers) {
      if (typeof member.latest_season === "number" && Number.isFinite(member.latest_season)) {
        values.add(member.latest_season);
      }
    }
    for (const member of cast) {
      if (Array.isArray(member.seasons_appeared)) {
        for (const seasonNumber of member.seasons_appeared) {
          if (typeof seasonNumber === "number" && Number.isFinite(seasonNumber) && seasonNumber > 0) {
            values.add(seasonNumber);
          }
        }
      }
    }
    return Array.from(values).sort((a, b) => b - a);
  }, [cast, castRoleMembers, seasons]);

  const availableCastRoleAndCreditFilters = useMemo(() => {
    const options: Array<{ key: string; label: string }> = [];
    for (const role of availableCastRoles) {
      options.push({ key: `role:${role}`, label: role });
    }
    for (const category of availableCastCreditCategories) {
      options.push({ key: `credit:${category}`, label: category });
    }
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [availableCastCreditCategories, availableCastRoles]);

  const castMatrixSyncScopeLabel = useMemo(() => {
    if (castSeasonFilters.length > 0) {
      const seasonsLabel = [...castSeasonFilters].sort((a, b) => a - b).join(", ");
      return `Season scope: ${seasonsLabel} (plus global season 0 roles).`;
    }
    return "Season scope: all show seasons (plus global season 0 roles).";
  }, [castSeasonFilters]);

  const castEpisodeScopeLabel = useMemo(
    () => showCastEpisodeScopeHint(castSeasonFilters.length > 0),
    [castSeasonFilters]
  );

  const castDisplayMembers = useMemo(() => {
    const merged = castDisplayBaseMembers.map((member) => {
      const enriched = castRoleMemberByPersonId.get(member.person_id);
      const mergedRoles =
        enriched && enriched.roles.length > 0
          ? normalizeCastRoleList(enriched.roles)
          : typeof member.role === "string" && member.role.trim().length > 0
            ? normalizeCastRoleList([member.role.trim()])
            : [];
      const mergedLatestSeason =
        enriched && typeof enriched.latest_season === "number"
          ? enriched.latest_season
          : typeof member.latest_season === "number"
            ? member.latest_season
            : null;
      const mergedTotalEpisodes = resolveShowCastEpisodeCount({
        castTotalEpisodes:
          typeof member.total_episodes === "number" ? member.total_episodes : null,
        scopedTotalEpisodes:
          enriched && typeof enriched.total_episodes === "number"
            ? enriched.total_episodes
            : null,
        hasSeasonFilters: castSeasonFilters.length > 0,
      });
      // Keep the primary cast endpoint photo stable; cast-role-members is supplemental.
      const mergedPhotoUrl =
        member.photo_url || enriched?.photo_url || member.cover_photo_url || null;
      return {
        ...member,
        roles: mergedRoles,
        latest_season: mergedLatestSeason,
        total_episodes: mergedTotalEpisodes,
        merged_photo_url: mergedPhotoUrl,
      };
    });

    const filtered = merged.filter((member) => {
      if (castSearchQueryDeferred.length > 0) {
        const name = (member.full_name || member.cast_member_name || "").toLowerCase();
        if (!name.includes(castSearchQueryDeferred)) {
          return false;
        }
      }
      const hasScopedRoleOrSeasonMatch = castRoleMemberByPersonId.has(member.person_id);
      if (
        !shouldIncludeCastMemberForSeasonFilter({
          castSeasonFilters,
          hasScopedRoleOrSeasonMatch,
          latestSeason: member.latest_season,
          scopedFilteringReady: castRoleMembersLoadedOnce,
        })
      ) {
        return false;
      }
      if (castRoleAndCreditFilters.length > 0) {
        const matchesAnyFilter = castRoleAndCreditFilters.some((rawFilter) => {
          const [kind, value] = rawFilter.split(":", 2);
          if (!kind || !value) return false;
          if (kind === "role") {
            return member.roles.some((role) => castRoleMatchesFilter(role, value));
          }
          if (kind === "credit") {
            return value.toLowerCase() === (member.credit_category ?? "").toLowerCase();
          }
          return false;
        });
        if (!matchesAnyFilter) return false;
      }
      if (castHasImageFilter === "yes" && !member.merged_photo_url) return false;
      if (castHasImageFilter === "no" && member.merged_photo_url) return false;
      return true;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (castSortBy === "name") {
        const aName = (a.full_name || a.cast_member_name || "").toLowerCase();
        const bName = (b.full_name || b.cast_member_name || "").toLowerCase();
        return castSortOrder === "asc" ? aName.localeCompare(bName) : bName.localeCompare(aName);
      }
      if (castSortBy === "season") {
        const aSeason = a.latest_season ?? -1;
        const bSeason = b.latest_season ?? -1;
        return castSortOrder === "asc" ? aSeason - bSeason : bSeason - aSeason;
      }
      const aEpisodes = a.total_episodes ?? 0;
      const bEpisodes = b.total_episodes ?? 0;
      return castSortOrder === "asc" ? aEpisodes - bEpisodes : bEpisodes - aEpisodes;
    });
    return sorted;
  }, [
    castDisplayBaseMembers,
    castHasImageFilter,
    castRoleAndCreditFilters,
    castRoleMemberByPersonId,
    castRoleMembersLoadedOnce,
    castSearchQueryDeferred,
    castSeasonFilters,
    castSortBy,
    castSortOrder,
  ]);

  const castGalleryMembers = useMemo(
    () => castDisplayMembers.filter((member) => !isCrewCreditCategory(member.credit_category)),
    [castDisplayMembers]
  );
  const crewGalleryMembers = useMemo(
    () => castDisplayMembers.filter((member) => isCrewCreditCategory(member.credit_category)),
    [castDisplayMembers]
  );
  const castDisplayTotals = useMemo(() => {
    let castTotal = 0;
    let crewTotal = 0;
    for (const member of castDisplayBaseMembers) {
      if (isCrewCreditCategory(member.credit_category)) {
        crewTotal += 1;
      } else {
        castTotal += 1;
      }
    }
    return {
      cast: castTotal,
      crew: crewTotal,
      total: castDisplayBaseMembers.length,
    };
  }, [castDisplayBaseMembers]);
  const visibleCastGalleryMembers = useMemo(
    () => castGalleryMembers.slice(0, castRenderLimit),
    [castGalleryMembers, castRenderLimit]
  );
  const visibleCrewGalleryMembers = useMemo(
    () => crewGalleryMembers.slice(0, crewRenderLimit),
    [crewGalleryMembers, crewRenderLimit]
  );
  const renderedCastCount = visibleCastGalleryMembers.length;
  const matchedCastCount = castGalleryMembers.length;
  const totalCastCount = castDisplayTotals.cast;
  const renderedCrewCount = visibleCrewGalleryMembers.length;
  const matchedCrewCount = crewGalleryMembers.length;
  const totalCrewCount = castDisplayTotals.crew;
  const renderedVisibleCount = renderedCastCount + renderedCrewCount;
  const matchedVisibleCount = castDisplayMembers.length;
  const totalVisibleCount = castDisplayTotals.total;
  const castRenderProgressLabel = useMemo(() => {
    const rendered =
      Math.min(castRenderLimit, castGalleryMembers.length) +
      Math.min(crewRenderLimit, crewGalleryMembers.length);
    const total = castGalleryMembers.length + crewGalleryMembers.length;
    if (total === 0 || rendered >= total) return null;
    return `Rendering ${rendered.toLocaleString()}/${total.toLocaleString()}`;
  }, [castGalleryMembers.length, castRenderLimit, crewGalleryMembers.length, crewRenderLimit]);

  useEffect(() => {
    setCastRenderLimit(CAST_INCREMENTAL_INITIAL_LIMIT);
    setCrewRenderLimit(CAST_INCREMENTAL_INITIAL_LIMIT);
  }, [
    castHasImageFilter,
    castRoleAndCreditFilters,
    castSearchQuery,
    castSeasonFilters,
    castSortBy,
    castSortOrder,
    castSource,
  ]);

  useEffect(() => {
    if (activeTab !== "cast") return;
    if (castRenderLimit >= castGalleryMembers.length && crewRenderLimit >= crewGalleryMembers.length) {
      return;
    }

    const schedule = () => {
      castIncrementalTimeoutRef.current = setTimeout(() => {
        setCastRenderLimit((prev) =>
          prev >= castGalleryMembers.length
            ? prev
            : Math.min(prev + CAST_INCREMENTAL_BATCH_SIZE, castGalleryMembers.length)
        );
        setCrewRenderLimit((prev) =>
          prev >= crewGalleryMembers.length
            ? prev
            : Math.min(prev + CAST_INCREMENTAL_BATCH_SIZE, crewGalleryMembers.length)
        );
      }, 0);
    };

    if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(() => schedule());
      return () => {
        window.cancelIdleCallback(idleId);
        if (castIncrementalTimeoutRef.current) {
          clearTimeout(castIncrementalTimeoutRef.current);
          castIncrementalTimeoutRef.current = null;
        }
      };
    }

    schedule();
    return () => {
      if (castIncrementalTimeoutRef.current) {
        clearTimeout(castIncrementalTimeoutRef.current);
        castIncrementalTimeoutRef.current = null;
      }
    };
  }, [
    activeTab,
    castGalleryMembers.length,
    castRenderLimit,
    crewGalleryMembers.length,
    crewRenderLimit,
  ]);

  const pendingLinkCount = useMemo(
    () => showLinks.filter((link) => link.status === "pending").length,
    [showLinks]
  );

  const newsSourceOptions = useMemo(() => newsFacets.sources, [newsFacets.sources]);

  const newsPeopleOptions = useMemo(
    () =>
      newsFacets.people.map((person) => ({
        id: person.person_id,
        name: person.person_name,
        count: person.count,
      })),
    [newsFacets.people]
  );

  const newsTopicOptions = useMemo(
    () => newsFacets.topics.map((topic) => ({ topic: topic.topic, count: topic.count })),
    [newsFacets.topics]
  );

  const newsSeasonOptions = useMemo(
    () => newsFacets.seasons.map((season) => ({ seasonNumber: season.season_number, count: season.count })),
    [newsFacets.seasons]
  );

  const settingsLinkSections = useMemo(() => {
    const showPageLinks: EntityLink[] = [];
    const seasonPageLinks: EntityLink[] = [];
    const castMemberLinks: EntityLink[] = [];

    for (const link of showLinks) {
      if (link.entity_type === "person") {
        castMemberLinks.push(link);
        continue;
      }
      if (link.entity_type === "season" || link.link_group === "cast_announcements" || link.season_number > 0) {
        seasonPageLinks.push(link);
        continue;
      }
      showPageLinks.push(link);
    }

    const sortLinks = (links: EntityLink[]) =>
      [...links].sort((a, b) => {
        if (a.season_number !== b.season_number) return b.season_number - a.season_number;
        return (a.label || a.url).localeCompare(b.label || b.url);
      });

    return [
      {
        key: "show-pages",
        title: "Show Pages",
        description: "Show wiki/fandom pages, IMDb/TMDb show links, BravoTV show pages, and other show-level URLs.",
        links: sortLinks(showPageLinks),
      },
      {
        key: "season-pages",
        title: "Season Pages",
        description: "Season wiki pages and official season/cast announcement links.",
        links: sortLinks(seasonPageLinks),
      },
      {
        key: "cast-member-pages",
        title: "Cast Member Pages",
        description: "Cast-member profile links (BravoTV, Fandom, Wikipedia, IMDb, TMDb, and related pages).",
        links: sortLinks(castMemberLinks),
      },
    ] as const;
  }, [showLinks]);

  const overviewExternalIdLinks = useMemo(() => {
    return showLinks
      .filter(
        (link) =>
          link.entity_type === "show" &&
          Number(link.season_number || 0) === 0 &&
          link.link_group !== "social" &&
          link.link_kind !== "cast_announcement"
      )
      .sort((a, b) => (a.label || a.url).localeCompare(b.label || b.url));
  }, [showLinks]);

  const overviewSocialHandleLinks = useMemo(() => {
    return showLinks
      .filter(
        (link) =>
          link.entity_type === "show" &&
          Number(link.season_number || 0) === 0 &&
          link.link_group === "social"
      )
      .sort((a, b) => (a.label || a.url).localeCompare(b.label || b.url));
  }, [showLinks]);

  const seasonUrlCoverageRows = useMemo(() => {
    return [...seasons]
      .sort((a, b) => b.season_number - a.season_number)
      .map((season) => {
        const seasonLinks = showLinks.filter(
          (link) =>
            Number(link.season_number || 0) === season.season_number ||
            (link.entity_type === "season" && String(link.entity_id || "") === season.id)
        );
        const pills = Array.from(
          new Set(
            seasonLinks.map((link) => {
              const host = getHostnameFromUrl(link.url);
              return host ? `${link.link_kind} · ${host}` : link.link_kind;
            })
          )
        ).sort((a, b) => a.localeCompare(b));
        return {
          seasonNumber: season.season_number,
          totalLinks: seasonLinks.length,
          pills,
        };
      });
  }, [seasons, showLinks]);

  const castMemberLinkCoverageCards = useMemo<PersonLinkCoverageCard[]>(() => {
    const personLinks = showLinks.filter((link) => link.entity_type === "person");
    if (personLinks.length === 0) return [];

    const personNameById = new Map<string, string>();
    for (const member of cast) {
      const name = String(member.full_name || member.cast_member_name || "").trim();
      if (member.person_id && name && !personNameById.has(member.person_id)) {
        personNameById.set(member.person_id, name);
      }
    }
    for (const link of personLinks) {
      if (!link.entity_id || personNameById.has(link.entity_id)) continue;
      const parsedName = parsePersonNameFromLink(link);
      if (parsedName) personNameById.set(link.entity_id, parsedName);
    }

    const linksByPerson = new Map<string, EntityLink[]>();
    for (const link of personLinks) {
      const personId = String(link.entity_id || "").trim();
      if (!personId) continue;
      const existing = linksByPerson.get(personId);
      if (existing) {
        existing.push(link);
      } else {
        linksByPerson.set(personId, [link]);
      }
    }

    const cards: PersonLinkCoverageCard[] = [];
    for (const [personId, links] of linksByPerson.entries()) {
      const linksBySource = new Map<PersonLinkSourceKey, EntityLink[]>();
      const seasonSet = new Set<number>();
      for (const link of links) {
        if (typeof link.season_number === "number" && link.season_number > 0) {
          seasonSet.add(link.season_number);
        }
        const sourceKey = classifyPersonLinkSource(link.link_kind);
        if (!sourceKey) continue;
        const sourceLinks = linksBySource.get(sourceKey);
        if (sourceLinks) {
          sourceLinks.push(link);
        } else {
          linksBySource.set(sourceKey, [link]);
        }
      }

      const sources = PERSON_LINK_SOURCE_DEFINITIONS.map<PersonLinkSourceSummary>((definition) => {
        const sourceLinks = linksBySource.get(definition.key) ?? [];
        const selected = pickPreferredPersonSourceLink(definition.key, sourceLinks);
        if (!selected) {
          return {
            key: definition.key,
            label: definition.label,
            state: "missing",
            url: null,
            link: null,
          };
        }

        const normalizedStatus = normalizeEntityLinkStatus(selected.status);
        if (normalizedStatus === "approved" && selected.url) {
          return {
            key: definition.key,
            label: definition.label,
            state: "found",
            url: selected.url,
            link: selected,
          };
        }
        const fallbackState: PersonLinkSourceState =
          normalizedStatus === "rejected"
            ? "rejected"
            : normalizedStatus === "pending"
              ? "pending"
              : "missing";
        return {
          key: definition.key,
          label: definition.label,
          state: fallbackState,
          url: null,
          link: selected,
        };
      });

      const personName =
        personNameById.get(personId) ||
        parsePersonNameFromLink(links[0]) ||
        "Unknown Person";

      cards.push({
        personId,
        personName,
        seasons: [...seasonSet].sort((a, b) => a - b),
        sources,
      });
    }

    cards.sort((a, b) => a.personName.localeCompare(b.personName));
    return cards;
  }, [cast, showLinks]);

  const showGalleryAllowedSectionSet = useMemo(
    () => new Set<AssetSectionKey>(SHOW_GALLERY_ALLOWED_SECTIONS),
    []
  );

  const showGalleryScopedAssets = useMemo(
    () =>
      galleryAssets.filter((asset) => {
        const section = classifySeasonAssetSection(asset, { showName: show?.name ?? undefined });
        return Boolean(section && showGalleryAllowedSectionSet.has(section));
      }),
    [galleryAssets, show?.name, showGalleryAllowedSectionSet]
  );

  const filteredGalleryAssets = useMemo(() => {
    return applyAdvancedFiltersToSeasonAssets(showGalleryScopedAssets, advancedFilters, {
      showName: show?.name ?? undefined,
      getSeasonNumber: (asset) =>
        selectedGallerySeason === "all"
          ? typeof asset.season_number === "number"
            ? asset.season_number
            : undefined
          : selectedGallerySeason,
    });
  }, [showGalleryScopedAssets, advancedFilters, selectedGallerySeason, show?.name]);

  const gallerySectionAssets = useMemo(() => {
    const classifiedAssets = filteredGalleryAssets.map((asset) => {
      const section = classifySeasonAssetSection(asset, { showName: show?.name ?? undefined });
      return { asset, section };
    });

    const displayAssets = classifiedAssets.filter((row) => {
      if (!row.section) return false;
      return showGalleryAllowedSectionSet.has(row.section);
    });
    const grouped = groupSeasonAssetsBySection(displayAssets.map((row) => row.asset), {
      showName: show?.name ?? undefined,
      includeOther: false,
    });

    const sectionKeys: AssetSectionKey[] = [
      "backdrops",
      "banners",
      "posters",
      "profile_pictures",
      "cast_photos",
    ];
    const hasMoreBySection: Partial<Record<AssetSectionKey, boolean>> = {};
    for (const sectionKey of sectionKeys) {
      const visibleLimit =
        galleryVisibleBySection[sectionKey] ?? SHOW_GALLERY_SECTION_INITIAL_VISIBLE;
      const sectionAssets = grouped[sectionKey] ?? [];
      hasMoreBySection[sectionKey] = sectionAssets.length > visibleLimit;
      grouped[sectionKey] = sectionAssets.slice(0, visibleLimit);
    }

    return {
      ...grouped,
      hasMoreBySection,
    };
  }, [
    filteredGalleryAssets,
    galleryVisibleBySection,
    show?.name,
    showGalleryAllowedSectionSet,
  ]);

  const brandLogoAssets = useMemo(() => {
    // Keep show-brand logos limited to canonical logo sources (Wikipedia + IMDb/TMDb).
    const trusted = galleryAssets.filter((asset) => isTrustedShowBrandLogoAsset(asset));
    const sorted = [...trusted].sort((a, b) => {
      if (a.origin_table === b.origin_table) return 0;
      if (a.origin_table === "show_images") return -1;
      if (b.origin_table === "show_images") return 1;
      return 0;
    });
    const deduped: SeasonAsset[] = [];
    const seenIdentityKeys = new Set<string>();
    for (const asset of sorted) {
      const key = resolveShowLogoIdentityKey(asset);
      if (seenIdentityKeys.has(key)) continue;
      seenIdentityKeys.add(key);
      deduped.push(asset);
    }
    return deduped;
  }, [galleryAssets]);

  const featuredShowLogoAssetId = useMemo(
    () => resolveFeaturedShowLogoAssetId(brandLogoAssets, show?.primary_logo_image_id),
    [brandLogoAssets, show?.primary_logo_image_id]
  );

  const featuredShowLogoAsset = useMemo(
    () => brandLogoAssets.find((asset) => asset.id === featuredShowLogoAssetId) ?? null,
    [brandLogoAssets, featuredShowLogoAssetId]
  );

  const featuredHeaderLogoUrl = useMemo(() => {
    if (!featuredShowLogoAsset) return show?.logo_url ?? null;
    const colorUrl = getAssetDisplayUrl(featuredShowLogoAsset);
    if (featuredLogoVariant === "black") {
      return featuredShowLogoAsset.logo_black_url ?? colorUrl ?? show?.logo_url ?? null;
    }
    if (featuredLogoVariant === "white") {
      return featuredShowLogoAsset.logo_white_url ?? colorUrl ?? show?.logo_url ?? null;
    }
    return colorUrl ?? show?.logo_url ?? null;
  }, [featuredLogoVariant, featuredShowLogoAsset, show?.logo_url]);

  const featuredPosterCandidates = useMemo(
    () =>
      galleryAssets.filter(
        (asset) => asset.origin_table === "show_images" && getFeaturedShowImageKind(asset) === "poster"
      ),
    [galleryAssets]
  );

  const featuredBackdropCandidates = useMemo(
    () =>
      galleryAssets.filter(
        (asset) => asset.origin_table === "show_images" && getFeaturedShowImageKind(asset) === "backdrop"
      ),
    [galleryAssets]
  );

  useEffect(() => {
    setFeaturedLogoVariant("color");
  }, [featuredShowLogoAssetId]);

  const increaseGallerySectionVisible = useCallback((section: AssetSectionKey) => {
    setGalleryVisibleBySection((prev) => ({
      ...prev,
      [section]:
        (prev[section] ?? SHOW_GALLERY_SECTION_INITIAL_VISIBLE) +
        SHOW_GALLERY_SECTION_INCREMENT_VISIBLE,
    }));
  }, []);

  const isTextFilterActive = useMemo(() => {
    const wantsText = advancedFilters.text.includes("text");
    const wantsNoText = advancedFilters.text.includes("no_text");
    return wantsText !== wantsNoText;
  }, [advancedFilters.text]);

  const unknownTextCount = useMemo(() => {
    if (!isTextFilterActive) return 0;
    return galleryAssets.filter(
      (a) => looksLikeUuid(a.id) && inferHasTextOverlay(a.metadata ?? null) === null
    ).length;
  }, [isTextFilterActive, galleryAssets]);

  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const isSeasonAired = useCallback(
    (season: TrrSeason) => {
      const summary = seasonEpisodeSummaries[season.id];
      const episodeCount = summary?.count ?? null;

      // Hide placeholder seasons (e.g. "1 episode") once we know the episode count.
      if (typeof episodeCount === "number" && episodeCount <= 1) return false;

      const premiereDate = summary?.premiereDate ?? season.air_date;
      const finaleDate = summary?.finaleDate ?? season.air_date;

      // Hide seasons that don't have any dates available yet.
      if (!premiereDate && !finaleDate) return false;

      const dateToCheck = premiereDate ?? finaleDate;
      if (!dateToCheck) return false;

      const airDate = new Date(dateToCheck);
      if (Number.isNaN(airDate.getTime())) return false;
      airDate.setHours(0, 0, 0, 0);
      return airDate <= today;
    },
    [seasonEpisodeSummaries, today]
  );

  const visibleSeasons = useMemo(
    () => seasons.filter((season) => isSeasonAired(season)),
    [seasons, isSeasonAired]
  );

  const socialSeasonOptions = useMemo(() => {
    const sortByMostRecentSeason = (a: TrrSeason, b: TrrSeason) => {
      if (a.season_number !== b.season_number) {
        return b.season_number - a.season_number;
      }
      return String(b.id).localeCompare(String(a.id));
    };

    const aired = [...visibleSeasons].sort(sortByMostRecentSeason);
    if (aired.length > 0) return aired;
    return [...seasons].sort(sortByMostRecentSeason);
  }, [seasons, visibleSeasons]);

  const defaultSocialSeasonId = useMemo(
    () => socialSeasonOptions[0]?.id ?? null,
    [socialSeasonOptions]
  );

  const requestedSocialSeasonId = useMemo(() => {
    const seasonNumberFromPath = socialPathFilters?.seasonNumber ?? null;
    if (seasonNumberFromPath == null) return null;
    return (
      socialSeasonOptions.find((season) => season.season_number === seasonNumberFromPath)?.id ?? null
    );
  }, [socialPathFilters?.seasonNumber, socialSeasonOptions]);

  useEffect(() => {
    setSelectedSocialSeasonId((prev) => {
      if (requestedSocialSeasonId) {
        return prev === requestedSocialSeasonId ? prev : requestedSocialSeasonId;
      }
      if (prev && socialSeasonOptions.some((season) => season.id === prev)) {
        return prev;
      }
      return defaultSocialSeasonId;
    });
  }, [defaultSocialSeasonId, requestedSocialSeasonId, socialSeasonOptions]);

  const selectedSocialSeason = useMemo(
    () => socialSeasonOptions.find((season) => season.id === selectedSocialSeasonId) ?? null,
    [selectedSocialSeasonId, socialSeasonOptions]
  );

  const syncBravoPreviewSeasonOptions = useMemo(() => {
    const set = new Set<number>();
    for (const video of syncBravoPreviewVideos) {
      if (typeof video.season_number === "number" && Number.isFinite(video.season_number)) {
        set.add(video.season_number);
      }
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [syncBravoPreviewVideos]);

  const syncBravoFilteredPreviewVideos = useMemo(() => {
    if (syncBravoPreviewSeasonFilter === "all") return syncBravoPreviewVideos;
    return syncBravoPreviewVideos.filter(
      (video) =>
        typeof video.season_number === "number" &&
        video.season_number === syncBravoPreviewSeasonFilter
    );
  }, [syncBravoPreviewSeasonFilter, syncBravoPreviewVideos]);

  const syncBravoPreviewCastLinks = useMemo(() => {
    const byUrl = new Map<string, { name: string | null; url: string }>();

    for (const person of syncBravoPreviewPeople) {
      const url =
        typeof person.canonical_url === "string" && person.canonical_url.trim()
          ? person.canonical_url.trim()
          : "";
      if (!url) continue;
      const name =
        typeof person.name === "string" && person.name.trim() ? person.name.trim() : null;
      byUrl.set(url, { name, url });
    }

    for (const discoveredUrl of syncBravoDiscoveredPersonUrls) {
      const url = typeof discoveredUrl === "string" ? discoveredUrl.trim() : "";
      if (!url || byUrl.has(url)) continue;
      byUrl.set(url, { name: null, url });
    }

    return Array.from(byUrl.values()).sort((a, b) => {
      const aKey = (a.name || a.url).toLowerCase();
      const bKey = (b.name || b.url).toLowerCase();
      return aKey.localeCompare(bKey);
    });
  }, [syncBravoDiscoveredPersonUrls, syncBravoPreviewPeople]);

  const syncBravoValidProfileCards = useMemo(() => {
    const byUrl = new Map<
      string,
      {
        url: string;
        name: string | null;
        bio: string | null;
        heroImageUrl: string | null;
        socialLinks: Array<{ key: string; label: string; url: string; handle: string | null }>;
      }
    >();
    for (const person of syncBravoPreviewPeople) {
      const url =
        typeof person.canonical_url === "string" ? person.canonical_url.trim() : "";
      if (!url) continue;
      const name = typeof person.name === "string" && person.name.trim() ? person.name.trim() : null;
      const bio = typeof person.bio === "string" && person.bio.trim() ? person.bio.trim() : null;
      const heroImageUrl =
        typeof person.hero_image_url === "string" && person.hero_image_url.trim()
          ? person.hero_image_url.trim()
          : null;
      const socialMap =
        person.social_links && typeof person.social_links === "object" ? person.social_links : null;
      const socialLinks = socialMap
        ? Object.entries(socialMap)
            .map(([rawKey, rawUrl]) => {
              const linkUrl = typeof rawUrl === "string" ? rawUrl.trim() : "";
              if (!linkUrl) return null;
              const key = normalizeBravoSocialKey(rawKey);
              return {
                key,
                label: formatBravoSocialLabel(key),
                url: linkUrl,
                handle: extractBravoSocialHandle(linkUrl),
              };
            })
            .filter(
              (
                value
              ): value is { key: string; label: string; url: string; handle: string | null } =>
                Boolean(value)
            )
            .sort((a, b) => a.label.localeCompare(b.label))
        : [];
      byUrl.set(url, { url, name, bio, heroImageUrl, socialLinks });
    }

    return Array.from(byUrl.values()).sort((a, b) => {
      const aKey = (a.name || a.url).toLowerCase();
      const bKey = (b.name || b.url).toLowerCase();
      return aKey.localeCompare(bKey);
    });
  }, [syncBravoPreviewPeople]);

  const syncFandomValidProfileCards = useMemo(() => {
    const byUrl = new Map<
      string,
      {
        url: string;
        name: string | null;
        bio: string | null;
        heroImageUrl: string | null;
        socialLinks: Array<{ key: string; label: string; url: string; handle: string | null }>;
      }
    >();
    for (const person of syncFandomPreviewPeople) {
      const url =
        typeof person.canonical_url === "string" ? person.canonical_url.trim() : "";
      if (!url) continue;
      const name = typeof person.name === "string" && person.name.trim() ? person.name.trim() : null;
      const bio = typeof person.bio === "string" && person.bio.trim() ? person.bio.trim() : null;
      const heroImageUrl =
        typeof person.hero_image_url === "string" && person.hero_image_url.trim()
          ? person.hero_image_url.trim()
          : null;
      const socialMap =
        person.social_links && typeof person.social_links === "object" ? person.social_links : null;
      const socialLinks = socialMap
        ? Object.entries(socialMap)
            .map(([rawKey, rawUrl]) => {
              const linkUrl = typeof rawUrl === "string" ? rawUrl.trim() : "";
              if (!linkUrl) return null;
              const key = normalizeBravoSocialKey(rawKey);
              return {
                key,
                label: formatBravoSocialLabel(key),
                url: linkUrl,
                handle: extractBravoSocialHandle(linkUrl),
              };
            })
            .filter(
              (
                value
              ): value is { key: string; label: string; url: string; handle: string | null } =>
                Boolean(value)
            )
            .sort((a, b) => a.label.localeCompare(b.label))
        : [];
      byUrl.set(url, { url, name, bio, heroImageUrl, socialLinks });
    }

    return Array.from(byUrl.values()).sort((a, b) => {
      const aKey = (a.name || a.url).toLowerCase();
      const bKey = (b.name || b.url).toLowerCase();
      return aKey.localeCompare(bKey);
    });
  }, [syncFandomPreviewPeople]);

  const syncBravoCandidateIssues = useMemo(() => {
    return syncBravoPersonCandidateResults
      .map((result) => {
        const url = typeof result.url === "string" ? result.url.trim() : "";
        if (!url) return null;
        const status = String(result.status || "").trim().toLowerCase();
        if (status !== "missing" && status !== "error") return null;
        const reason =
          typeof result.error === "string" && result.error.trim() ? result.error.trim() : null;
        return { url, status: status as "missing" | "error", reason };
      })
      .filter((value): value is { url: string; status: "missing" | "error"; reason: string | null } =>
        Boolean(value)
      )
      .sort((a, b) => a.url.localeCompare(b.url));
  }, [syncBravoPersonCandidateResults]);

  const syncFandomCandidateIssues = useMemo(() => {
    return syncFandomPersonCandidateResults
      .map((result) => {
        const url = typeof result.url === "string" ? result.url.trim() : "";
        if (!url) return null;
        const status = String(result.status || "").trim().toLowerCase();
        if (status !== "missing" && status !== "error") return null;
        const reason =
          typeof result.error === "string" && result.error.trim() ? result.error.trim() : null;
        return { url, status: status as "missing" | "error", reason };
      })
      .filter((value): value is { url: string; status: "missing" | "error"; reason: string | null } =>
        Boolean(value)
      )
      .sort((a, b) => a.url.localeCompare(b.url));
  }, [syncFandomPersonCandidateResults]);

  const derivedSyncBravoCandidateSummary = useMemo<BravoCandidateSummary>(() => {
    let valid = 0;
    let missing = 0;
    let errors = 0;
    for (const result of syncBravoPersonCandidateResults) {
      const status = String(result.status || "").trim().toLowerCase();
      if (status === "ok") valid += 1;
      else if (status === "missing") missing += 1;
      else if (status === "error") errors += 1;
    }
    return {
      tested: valid + missing + errors,
      valid,
      missing,
      errors,
    };
  }, [syncBravoPersonCandidateResults]);

  const derivedSyncFandomCandidateSummary = useMemo<BravoCandidateSummary>(() => {
    let valid = 0;
    let missing = 0;
    let errors = 0;
    for (const result of syncFandomPersonCandidateResults) {
      const status = String(result.status || "").trim().toLowerCase();
      if (status === "ok") valid += 1;
      else if (status === "missing") missing += 1;
      else if (status === "error") errors += 1;
    }
    return {
      tested: valid + missing + errors,
      valid,
      missing,
      errors,
    };
  }, [syncFandomPersonCandidateResults]);

  const syncBravoProbeSummary = syncBravoCandidateSummary ?? derivedSyncBravoCandidateSummary;
  const syncFandomProbeSummary = syncFandomCandidateSummary ?? derivedSyncFandomCandidateSummary;
  const syncBravoCastSyncCount =
    syncBravoRunMode === "cast-only"
      ? Math.max(syncBravoProbeSummary.valid, syncFandomProbeSummary.valid)
      : syncBravoPreviewCastLinks.length;

  const syncBravoSelectedImageSummaries = useMemo(() => {
    const byUrl = new Map(syncBravoImages.map((image) => [image.url, image]));
    return Array.from(syncBravoSelectedImages)
      .map((url) => {
        const image = byUrl.get(url);
        return {
          url,
          alt: image?.alt ?? null,
          kind: syncBravoImageKinds[url] ?? inferBravoImportImageKind({ url, alt: image?.alt ?? null }),
        };
      })
      .sort((a, b) => {
        const aKey = (a.alt || a.url).toLowerCase();
        const bKey = (b.alt || b.url).toLowerCase();
        return aKey.localeCompare(bKey);
      });
  }, [syncBravoImageKinds, syncBravoImages, syncBravoSelectedImages]);

  const syncedSeasonCount = seasons.length;
  const syncedEpisodeCount = Object.values(seasonEpisodeSummaries).reduce(
    (sum, summary) => sum + (summary?.count ?? 0),
    0
  );
  const syncedCastCount = cast.length;
  const syncBravoReadinessIssues: string[] = [];
  if (syncedSeasonCount <= 0) syncBravoReadinessIssues.push("seasons");
  if (syncedEpisodeCount <= 0 && (show?.show_total_episodes ?? 0) <= 0) {
    syncBravoReadinessIssues.push("episodes");
  }
  if (syncedCastCount <= 0) syncBravoReadinessIssues.push("cast");
  const canSyncByBravo = syncBravoReadinessIssues.length === 0;
  const syncBravoReadinessMessage = canSyncByBravo
    ? null
    : `Sync seasons, episodes, and cast first (missing: ${syncBravoReadinessIssues.join(", ")}).`;

  const openSyncBravoConfirmStep = useCallback(() => {
    const missing: string[] = [];
    const hasEpisodeEvidence =
      (show?.show_total_episodes ?? 0) > 0 ||
      Object.values(seasonEpisodeSummaries).some((summary) => (summary?.count ?? 0) > 0);
    if (seasons.length <= 0) missing.push("seasons");
    if (!hasEpisodeEvidence) missing.push("episodes");
    if (cast.length <= 0) missing.push("cast");
    if (missing.length > 0) {
      setSyncBravoError(
        `Sync seasons, episodes, and cast first (missing: ${missing.join(", ")}).`
      );
      return;
    }
    const hasPreviewData =
      syncBravoImages.length > 0 ||
      syncBravoPreviewCastLinks.length > 0 ||
      syncBravoPersonCandidateResults.length > 0 ||
      syncFandomPersonCandidateResults.length > 0 ||
      syncBravoPreviewNews.length > 0 ||
      syncBravoPreviewVideos.length > 0 ||
      Boolean(syncBravoDescription.trim()) ||
      Boolean(syncBravoAirs.trim());
    if (!hasPreviewData) {
      setSyncBravoError("Run Preview first before moving to the next step.");
      return;
    }
    if (syncBravoRunMode === "cast-only" && !syncBravoPreviewSignature) {
      setSyncBravoError("Run Preview first before moving to the next step.");
      return;
    }
    setSyncBravoError(null);
    setSyncBravoNotice(null);
    setSyncBravoStep("confirm");
  }, [
    syncBravoAirs,
    syncBravoDescription,
    syncFandomPersonCandidateResults.length,
    syncBravoImages.length,
    syncBravoPreviewCastLinks.length,
    syncBravoPersonCandidateResults.length,
    syncBravoPreviewNews.length,
    syncBravoPreviewVideos.length,
    syncBravoPreviewSignature,
    syncBravoRunMode,
    cast.length,
    seasonEpisodeSummaries,
    seasons.length,
    show?.show_total_episodes,
  ]);

  const startSyncBravoFlow = useCallback(
    (mode: SyncBravoRunMode) => {
      if (!canSyncByBravo) {
        setSyncBravoError(syncBravoReadinessMessage || "Sync seasons, episodes, and cast first.");
        return;
      }
      const inferredBravoUrl = inferBravoShowUrl(show?.name) || syncBravoUrl.trim();
      const initialSeason = syncBravoTargetSeasonNumber ?? defaultSyncBravoSeasonNumber ?? null;
      setSyncBravoRunMode(mode);
      setSyncBravoTargetSeasonNumber(initialSeason);
      setSyncBravoModePickerOpen(false);
      setSyncBravoOpen(true);
      setSyncBravoStep("preview");
      setSyncBravoError(null);
      setSyncBravoNotice(null);
      setSyncBravoApplyDescriptionToShow(false);
      setSyncBravoPreviewPeople([]);
      setSyncFandomPreviewPeople([]);
      setSyncBravoDiscoveredPersonUrls([]);
      setSyncBravoPersonCandidateResults([]);
      setSyncFandomPersonCandidateResults([]);
      setSyncBravoPreviewResult(null);
      setSyncBravoPreviewSignature(null);
      setSyncBravoCandidateSummary(null);
      setSyncFandomCandidateSummary(null);
      setSyncFandomDomainsUsed([]);
      setSyncBravoProbeTotal(0);
      setSyncBravoProbeStatusMessage(null);
      setSyncBravoProbeActive(false);
      if (mode === "cast-only") {
        setSyncBravoImages([]);
        setSyncBravoSelectedImages(new Set());
        setSyncBravoImageKinds({});
      }
      setSyncBravoUrl(inferredBravoUrl);
      void previewSyncByBravo({ urlOverride: inferredBravoUrl, mode });
    },
    [
      canSyncByBravo,
      defaultSyncBravoSeasonNumber,
      previewSyncByBravo,
      show?.name,
      syncBravoReadinessMessage,
      syncBravoTargetSeasonNumber,
      syncBravoUrl,
    ]
  );

  useEffect(() => {
    if (syncBravoOpen) return;
    abortSyncBravoPreviewStream();
    syncBravoPreviewRunRef.current += 1;
    setSyncBravoProbeStatusMessage(null);
    setSyncBravoProbeActive(false);
  }, [abortSyncBravoPreviewStream, syncBravoOpen]);

  useEffect(() => {
    return () => {
      abortSyncBravoPreviewStream();
      syncBravoPreviewRunRef.current += 1;
    };
  }, [abortSyncBravoPreviewStream]);

  useEffect(() => {
    if (visibleSeasons.length === 0) return;

    // If the open season disappears (filtered out), fall back to the newest visible.
    if (openSeasonId && !visibleSeasons.some((season) => season.id === openSeasonId)) {
      setOpenSeasonId(visibleSeasons[0].id);
      hasAutoOpenedSeasonRef.current = true;
      return;
    }

    // Auto-open one season once (initial load), but allow the user to close all afterwards.
    if (!hasAutoOpenedSeasonRef.current && !openSeasonId) {
      setOpenSeasonId(visibleSeasons[0].id);
      hasAutoOpenedSeasonRef.current = true;
    }
  }, [visibleSeasons, openSeasonId]);

  useEffect(() => {
    if (selectedGallerySeason === "all") return;
    if (!visibleSeasons.some((season) => season.season_number === selectedGallerySeason)) {
      setSelectedGallerySeason("all");
    }
  }, [selectedGallerySeason, visibleSeasons]);

  useEffect(() => {
    setGalleryVisibleBySection(buildShowGalleryVisibleDefaults());
  }, [selectedGallerySeason, advancedFilters]);

  // Load gallery assets for a season (or all seasons)
  const loadGalleryAssets = useCallback(
    async (seasonNumber: number | "all") => {
      if (!showId) return;
      setGalleryLoading(true);
      setGalleryTruncatedWarning(null);
      setGalleryFallbackTelemetry({
        fallbackRecoveredCount: 0,
        allCandidatesFailedCount: 0,
        totalImageAttempts: 0,
      });
      setGalleryMirrorTelemetry({
        mirroredCount: 0,
        totalCount: 0,
        mirroredRatio: 0,
      });
      try {
        const headers = await getAuthHeaders();
        const sourcesParam = advancedFilters.sources.length
          ? `&sources=${encodeURIComponent(advancedFilters.sources.join(","))}`
          : "";
        const dedupe = (rows: SeasonAsset[]) => {
          const seen = new Set<string>();
          const out: SeasonAsset[] = [];
          for (const row of rows) {
            const key = (row.hosted_url ?? "").trim();
            if (!key) continue;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(row);
          }
          return out;
        };

        const computeMirrorTelemetry = (rows: SeasonAsset[]) => {
          const totalCount = rows.length;
          const mirroredCount = rows.filter((asset) => {
            const candidates = getSeasonAssetCardUrlCandidates(asset);
            const preferredUrl = firstImageUrlCandidate(candidates) ?? asset.hosted_url ?? null;
            return isLikelyMirroredAssetUrl(preferredUrl);
          }).length;
          return {
            mirroredCount,
            totalCount,
            mirroredRatio: totalCount > 0 ? mirroredCount / totalCount : 0,
          };
        };

        const fetchAssetRows = async (
          url: string
        ): Promise<{ rows: SeasonAsset[]; truncated: boolean }> => {
          let res: Response;
          try {
            res = await fetchWithTimeout(url, { headers }, GALLERY_ASSET_LOAD_TIMEOUT_MS);
          } catch (error) {
            if (isAbortError(error)) {
              throw new Error(
                `Timed out loading gallery assets after ${Math.round(
                  GALLERY_ASSET_LOAD_TIMEOUT_MS / 1000
                )}s.`
              );
            }
            throw error;
          }
          if (!res.ok) return { rows: [], truncated: false };
          const data = await res.json().catch(() => ({}));
          const assets = (data as { assets?: unknown }).assets;
          const pagination = (data as { pagination?: { truncated?: unknown } }).pagination;
          const truncated = Boolean(pagination?.truncated);
          return {
            rows: Array.isArray(assets) ? (assets as SeasonAsset[]) : [],
            truncated,
          };
        };

        const fetchShowAssets = async (): Promise<{ rows: SeasonAsset[]; truncated: boolean }> =>
          fetchAssetRows(`/api/admin/trr-api/shows/${showId}/assets?full=1${sourcesParam}`);

        if (seasonNumber === "all") {
          // Fetch show-level assets once + season assets for all seasons.
          const [showAssets, ...seasonResults] = await Promise.all([
            fetchShowAssets(),
            ...visibleSeasons.map(async (season) => {
              return fetchAssetRows(
                `/api/admin/trr-api/shows/${showId}/seasons/${season.season_number}/assets?full=1${sourcesParam}`
              );
            }),
          ]);
          const dedupedAssets = dedupe([
            ...(showAssets?.rows ?? []),
            ...seasonResults.flatMap((result) => result.rows),
          ]);
          const isTruncated = Boolean(
            showAssets?.truncated || seasonResults.some((result) => result.truncated)
          );
          setGalleryAssets(dedupedAssets);
          setGalleryTruncatedWarning(
            isTruncated
              ? `Showing first ${dedupedAssets.length} assets due to pagination cap. Narrow filters to refine.`
              : null
          );
          setGalleryMirrorTelemetry(computeMirrorTelemetry(dedupedAssets));
        } else {
          const [showAssets, seasonAssets] = await Promise.all([
            fetchShowAssets(),
            fetchAssetRows(
              `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/assets?full=1${sourcesParam}`
            ),
          ]);
          const dedupedAssets = dedupe([...(showAssets?.rows ?? []), ...(seasonAssets?.rows ?? [])]);
          const isTruncated = Boolean(showAssets?.truncated || seasonAssets?.truncated);
          setGalleryAssets(dedupedAssets);
          setGalleryTruncatedWarning(
            isTruncated
              ? `Showing first ${dedupedAssets.length} assets due to pagination cap. Narrow filters to refine.`
              : null
          );
          setGalleryMirrorTelemetry(computeMirrorTelemetry(dedupedAssets));
        }
      } finally {
        setGalleryLoading(false);
      }
    },
    [showId, visibleSeasons, getAuthHeaders, advancedFilters.sources]
  );

  const setFeaturedShowLogo = useCallback(
    async (asset: SeasonAsset) => {
      if (!showId) return;
      const payload = resolveFeaturedLogoPayload(asset);
      if (!payload) {
        throw new Error("Featured logo can only be set from show_images or media_assets logo rows.");
      }

      const selectedShowImageId = "show_image_id" in payload ? payload.show_image_id : null;
      const selectedMediaAssetId = "media_asset_id" in payload ? payload.media_asset_id : null;
      const featuredAssetId = selectedShowImageId ?? selectedMediaAssetId;
      setFeaturedLogoSavingAssetId(featuredAssetId);
      try {
        const headers = await getAuthHeaders();
        const response = await fetchWithTimeout(
          `/api/admin/trr-api/shows/${showId}/logos/featured`,
          {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
          SETTINGS_MUTATION_TIMEOUT_MS
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message =
            (data as { error?: string; detail?: string }).error ||
            (data as { detail?: string }).detail ||
            `Failed to set featured logo (HTTP ${response.status})`;
          throw new Error(message);
        }

        setGalleryAssets((prev) =>
          prev.map((candidate) => {
            if ((candidate.kind ?? "").trim().toLowerCase() !== "logo") return candidate;
            if (candidate.origin_table !== "media_assets") return candidate;
            return {
              ...candidate,
              logo_link_is_primary:
                selectedMediaAssetId != null &&
                (candidate.media_asset_id ?? candidate.id) === selectedMediaAssetId,
            };
          })
        );
        setShow((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            primary_logo_image_id: selectedShowImageId ?? null,
          };
        });

        await Promise.all([fetchShow(), loadGalleryAssets(selectedGallerySeason)]);
      } finally {
        setFeaturedLogoSavingAssetId(null);
      }
    },
    [fetchShow, getAuthHeaders, loadGalleryAssets, selectedGallerySeason, showId]
  );

  const selectFeaturedLogoVariant = useCallback(
    (asset: SeasonAsset, variant: ShowLogoVariant) => {
      if (asset.id !== featuredShowLogoAssetId) return;
      setFeaturedLogoVariant(variant);
    },
    [featuredShowLogoAssetId]
  );

  const toggleBatchJobOperation = useCallback((operation: BatchJobOperation) => {
    setBatchJobOperations((prev) =>
      prev.includes(operation) ? prev.filter((item) => item !== operation) : [...prev, operation]
    );
  }, []);

  const toggleBatchJobContentSection = useCallback((section: AssetSectionKey) => {
    setBatchJobContentSections((prev) =>
      prev.includes(section) ? prev.filter((item) => item !== section) : [...prev, section]
    );
  }, []);

  const showBatchTargetPlan = useMemo(() => {
    const selectedSections = new Set(batchJobContentSections);
    const selectedVisibleAssets = SHOW_GALLERY_ALLOWED_SECTIONS.flatMap((section) =>
      selectedSections.has(section) ? gallerySectionAssets[section] : []
    );
    const dedupeTargets = new Set<string>();
    const sectionCounts = new Map<AssetSectionKey, number>();
    const targets = selectedVisibleAssets
      .map((asset) => {
        const section = classifySeasonAssetSection(asset, { showName: show?.name ?? undefined });
        if (!section) return null;
        const origin = asset.origin_table ?? "unknown";
        const rawId = origin === "media_assets" ? asset.media_asset_id ?? asset.id : asset.id;
        if (!rawId) return null;
        const key = `${origin}:${rawId}`;
        if (dedupeTargets.has(key)) return null;
        dedupeTargets.add(key);
        sectionCounts.set(section, (sectionCounts.get(section) ?? 0) + 1);
        return {
          origin,
          id: rawId,
          content_type: ASSET_SECTION_TO_BATCH_CONTENT_TYPE[section],
        };
      })
      .filter((item): item is { origin: string; id: string; content_type: string } => item !== null);

    const selectedSectionLabels = SHOW_GALLERY_ALLOWED_SECTIONS.filter(
      (section) => selectedSections.has(section) && (sectionCounts.get(section) ?? 0) > 0
    ).map((section) => ASSET_SECTION_LABELS[section]);

    return {
      targets,
      selectedSectionLabels,
    };
  }, [batchJobContentSections, gallerySectionAssets, show?.name]);

  const runBatchJobs = useCallback(async () => {
    if (!showId) return;
    if (batchJobsRunning) return;

    if (batchJobOperations.length === 0) {
      setBatchJobsError("Select at least one operation.");
      return;
    }
    if (batchJobContentSections.length === 0) {
      setBatchJobsError("Select at least one content type.");
      return;
    }
    const { targets } = showBatchTargetPlan;

    if (targets.length === 0) {
      setBatchJobsError("No matching visible gallery assets found for the selected content types.");
      return;
    }

    setBatchJobsError(null);
    setBatchJobsNotice(null);
    setBatchJobsRunning(true);
    setBatchJobsLiveCounts(null);
    setBatchJobsProgress({
      stage: "Batch Jobs",
      message: "Starting batch jobs...",
      current: 0,
      total: targets.length * batchJobOperations.length,
    });

    try {
      const headers = await getAuthHeaders();
      const completePayloadRef: { current: Record<string, unknown> | null } = { current: null };
      await adminStream(
        `/api/admin/trr-api/shows/${showId}/assets/batch-jobs/stream`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            operations: batchJobOperations,
            content_types: batchJobContentSections.map(
              (section) => ASSET_SECTION_TO_BATCH_CONTENT_TYPE[section]
            ),
            targets,
            force: true,
          }),
          timeoutMs: ASSET_PIPELINE_STEP_TIMEOUT_MS,
          onEvent: async ({ event, payload }) => {
            if (!payload || typeof payload !== "object") return;
            if (event === "progress") {
              const current = parseProgressNumber(payload.current);
              const total = parseProgressNumber(payload.total);
              const stage = typeof payload.stage === "string" ? payload.stage : "Batch Jobs";
              const baseMessage =
                typeof payload.message === "string" && payload.message.trim()
                  ? payload.message
                  : "Running batch jobs...";
              setBatchJobsLiveCounts((prev) => {
                const nextLiveCounts = resolveJobLiveCounts(prev, payload);
                setBatchJobsProgress({
                  stage,
                  message: appendLiveCountsToMessage(baseMessage, nextLiveCounts),
                  current,
                  total,
                });
                return nextLiveCounts;
              });
              return;
            }
            if (event === "error") {
              const errorText =
                typeof payload.error === "string" ? payload.error : "Batch jobs failed.";
              const detailText =
                typeof payload.detail === "string" ? payload.detail : null;
              throw new Error(detailText ? `${errorText}: ${detailText}` : errorText);
            }
            if (event === "complete") {
              completePayloadRef.current = payload;
            }
          },
        }
      );

      const completePayload = completePayloadRef.current;
      const attempted = parseProgressNumber(completePayload?.attempted ?? null) ?? 0;
      const succeeded = parseProgressNumber(completePayload?.succeeded ?? null) ?? 0;
      const failed = parseProgressNumber(completePayload?.failed ?? null) ?? 0;
      const skipped = parseProgressNumber(completePayload?.skipped ?? null) ?? 0;
      const completeLiveCounts = resolveJobLiveCounts(batchJobsLiveCounts, completePayload ?? {});
      setBatchJobsLiveCounts(completeLiveCounts);
      const liveCountSuffix = formatJobLiveCounts(completeLiveCounts);
      setBatchJobsNotice(
        `Batch jobs complete. Attempted ${attempted}, succeeded ${succeeded}, failed ${failed}, skipped ${skipped}${
          liveCountSuffix ? `. ${liveCountSuffix}` : "."
        }`
      );
      setBatchJobsOpen(false);
      await loadGalleryAssets(selectedGallerySeason);
    } catch (error) {
      setBatchJobsError(error instanceof Error ? error.message : "Batch jobs failed.");
    } finally {
      setBatchJobsRunning(false);
      setBatchJobsProgress(null);
      setBatchJobsLiveCounts(null);
    }
  }, [
    batchJobsLiveCounts,
    batchJobContentSections,
    batchJobOperations,
    batchJobsRunning,
    getAuthHeaders,
    loadGalleryAssets,
    selectedGallerySeason,
    showBatchTargetPlan,
    showId,
  ]);

  const showBatchPreflightSummary = useMemo(() => {
    const operationLabels = batchJobOperations.map((operation) => BATCH_JOB_OPERATION_LABELS[operation]);
    const sectionLabels =
      showBatchTargetPlan.selectedSectionLabels.length > 0
        ? showBatchTargetPlan.selectedSectionLabels
        : batchJobContentSections.map((section) => ASSET_SECTION_LABELS[section]);
    const sectionsText = sectionLabels.length > 0 ? sectionLabels.join(", ") : "no sections selected";
    const operationsText = operationLabels.length > 0 ? operationLabels.join(", ") : "no operations selected";
    return `Will process ${showBatchTargetPlan.targets.length} assets across ${sectionsText} with ${operationsText}.`;
  }, [batchJobContentSections, batchJobOperations, showBatchTargetPlan]);

  const refreshShow = useCallback(
    async (
      target: ShowRefreshTarget,
      options?: ShowRefreshRunOptions
    ): Promise<boolean> => {
      const label = getShowRefreshTargetLabel(target);
      const includeCastProfiles = options?.includeCastProfiles ?? true;
      const fastPhotoMode = options?.photoMode === "fast";
      const suppressSuccessNotice = options?.suppressSuccessNotice === true;

      let success = false;
      let castProfilesSummary: { attempted: number; succeeded: number; failed: number } | null =
        null;

      setRefreshingTargets((prev) => ({ ...prev, [target]: true }));
      setRefreshTargetLiveCounts((prev) => ({ ...prev, [target]: null }));
      setRefreshTargetProgress((prev) => ({
        ...prev,
        [target]: {
          stage: "Initializing",
          message: `Refreshing ${label}...`,
          current: 0,
          total: null,
        },
      }));
      setRefreshTargetNotice((prev) => {
        const next = { ...prev };
        delete next[target];
        return next;
      });
      setRefreshTargetError((prev) => {
        const next = { ...prev };
        delete next[target];
        return next;
      });
      appendRefreshLog({
        category: label,
        message: `Starting ${label} refresh...`,
        current: 0,
        total: null,
      });
      if (target === "photos" && fastPhotoMode) {
        appendRefreshLog({
          category: label,
          message: "Fast mode enabled: reduced media crawl pages and skipped auto-count/word-detection.",
          current: null,
          total: null,
        });
      }

      try {
        let streamFailed = false;
        let sawComplete = false;

        try {
          const headers = await getAuthHeaders();
          const streamUrl =
            target === "photos"
              ? `/api/admin/trr-api/shows/${showId}/refresh-photos/stream`
              : `/api/admin/trr-api/shows/${showId}/refresh/stream`;
          const streamBody =
            target === "photos"
              ? {
                  skip_mirror: false,
                  limit_per_source: fastPhotoMode ? 20 : 50,
                  imdb_mediaindex_max_pages: fastPhotoMode ? 6 : 25,
                  skip_auto_count: fastPhotoMode,
                  skip_word_detection: fastPhotoMode,
                }
              : { targets: [target] };
          const streamController = new AbortController();
          let streamIdleTimer: ReturnType<typeof setTimeout> | null = null;
          const bumpStreamIdleTimeout = () => {
            if (streamIdleTimer) clearTimeout(streamIdleTimer);
            streamIdleTimer = setTimeout(
              () => streamController.abort(),
              SHOW_REFRESH_STREAM_IDLE_TIMEOUT_MS
            );
          };
          const clearStreamIdleTimeout = () => {
            if (streamIdleTimer) clearTimeout(streamIdleTimer);
            streamIdleTimer = null;
          };
          const streamTimeout = setTimeout(
            () => streamController.abort(),
            SHOW_REFRESH_STREAM_MAX_DURATION_MS
          );
          bumpStreamIdleTimeout();
          let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
          let shouldStopReading = false;
          try {
            const response = await fetch(streamUrl, {
              method: "POST",
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify(streamBody),
              signal: streamController.signal,
            });

            if (!response.ok || !response.body) {
              const data = await response.json().catch(() => ({}));
              const message =
                data.error && data.detail
                  ? `${data.error}: ${data.detail}`
                  : data.error || data.detail || "Refresh failed";
              throw new Error(message);
            }

            reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              bumpStreamIdleTimeout();
              buffer += decoder.decode(value, { stream: true });
              // Some environments send SSE with CRLF delimiters. Normalize to LF so our
              // "\n\n" boundary detection works reliably and progress updates stream live.
              buffer = buffer.replace(/\r\n/g, "\n");

              let boundaryIndex = buffer.indexOf("\n\n");
              while (boundaryIndex !== -1) {
                const rawEvent = buffer.slice(0, boundaryIndex);
                buffer = buffer.slice(boundaryIndex + 2);

                const lines = rawEvent.split("\n").filter(Boolean);
                let eventType = "message";
                const dataLines: string[] = [];
                for (const line of lines) {
                  if (line.startsWith("event:")) {
                    eventType = line.slice(6).trim();
                  } else if (line.startsWith("data:")) {
                    dataLines.push(line.slice(5).trim());
                  }
                }

                const dataStr = dataLines.join("\n");
                let payload: Record<string, unknown> | string = dataStr;
                try {
                  payload = JSON.parse(dataStr) as Record<string, unknown>;
                } catch {
                  payload = dataStr;
                }

                if (eventType === "progress" && payload && typeof payload === "object") {
                const stageKeyRaw =
                  (payload as { stage_key?: unknown }).stage_key
                  ?? (payload as { step?: unknown }).step;
                const stageRaw =
                  stageKeyRaw
                  ?? (payload as { stage?: unknown; target?: unknown }).stage
                  ?? (payload as { stage?: unknown; step?: unknown; target?: unknown }).target;
                const messageRaw = (payload as { message?: unknown }).message;
                const stageCurrentRaw = (payload as { stage_current?: unknown }).stage_current;
                const stageTotalRaw = (payload as { stage_total?: unknown }).stage_total;
                const currentRaw = (payload as { current?: unknown }).current;
                const totalRaw = (payload as { total?: unknown }).total;
                const topicRaw = (payload as { topic?: unknown }).topic;
                const providerRaw = (payload as { provider?: unknown }).provider;
                const sourceRaw = (payload as { source?: unknown }).source;
                const skipReasonRaw = (payload as { skip_reason?: unknown }).skip_reason;
                const heartbeat = (payload as { heartbeat?: unknown }).heartbeat === true;
                const elapsedMsRaw = (payload as { elapsed_ms?: unknown }).elapsed_ms;
                const elapsedMs = parseProgressNumber(elapsedMsRaw);
                const sourceTotal = parseProgressNumber((payload as { source_total?: unknown }).source_total);
                const mirroredCount = parseProgressNumber((payload as { mirrored_count?: unknown }).mirrored_count);
                const current = parseProgressNumber(stageCurrentRaw ?? currentRaw);
                const total = parseProgressNumber(stageTotalRaw ?? totalRaw);
                const stageLabel = resolveStageLabel(stageRaw, SHOW_REFRESH_STAGE_LABELS);
                let progressMessage = buildProgressMessage(
                  stageLabel,
                  messageRaw,
                  `Refreshing ${label}...`
                );
                if (heartbeat && elapsedMs !== null && elapsedMs >= 0) {
                  progressMessage = `${progressMessage} · ${Math.round(elapsedMs / 1000)}s elapsed`;
                }
                if (typeof skipReasonRaw === "string" && skipReasonRaw === "already_mirrored") {
                  const counts =
                    sourceTotal !== null && mirroredCount !== null
                      ? ` (${mirroredCount}/${sourceTotal})`
                      : "";
                  progressMessage = `${progressMessage}${counts}`;
                }
                const nextLiveCounts = resolveJobLiveCounts(
                  refreshTargetLiveCounts[target] ?? null,
                  payload
                );
                setRefreshTargetLiveCounts((prev) => ({ ...prev, [target]: nextLiveCounts }));
                const enrichedProgressMessage = appendLiveCountsToMessage(
                  progressMessage,
                  nextLiveCounts
                );

                setRefreshTargetProgress((prev) => ({
                  ...prev,
                  [target]: {
                    stage: stageLabel ?? prev[target]?.stage ?? null,
                    message: enrichedProgressMessage || prev[target]?.message || null,
                    current: typeof current === "number" && Number.isFinite(current) ? current : null,
                    total: typeof total === "number" && Number.isFinite(total) ? total : null,
                  },
                }));
                appendRefreshLog({
                  category: label,
                  message: enrichedProgressMessage,
                  current: typeof current === "number" && Number.isFinite(current) ? current : null,
                  total: typeof total === "number" && Number.isFinite(total) ? total : null,
                  stageKey: typeof stageKeyRaw === "string" ? stageKeyRaw : null,
                  topic: typeof topicRaw === "string" ? topicRaw : null,
                  provider:
                    typeof providerRaw === "string"
                      ? providerRaw
                      : typeof sourceRaw === "string"
                        ? sourceRaw
                        : null,
                });
                } else if (eventType === "complete") {
                  sawComplete = true;
                  const completeLiveCounts = resolveJobLiveCounts(
                    refreshTargetLiveCounts[target] ?? null,
                    payload
                  );
                  setRefreshTargetLiveCounts((prev) => ({
                    ...prev,
                    [target]: completeLiveCounts,
                  }));
                  const liveCountSuffix = formatJobLiveCounts(completeLiveCounts);

                  if (
                    target === "photos" &&
                    payload &&
                    typeof payload === "object" &&
                    ("cast_photos_upserted" in payload || "cast_photos_fetched" in payload)
                  ) {
                  const asNum = (value: unknown): number | null =>
                    typeof value === "number" && Number.isFinite(value) ? value : null;
                  const durationMs = asNum((payload as { duration_ms?: unknown }).duration_ms);
                  const castFetched = asNum((payload as { cast_photos_fetched?: unknown }).cast_photos_fetched);
                  const castUpserted = asNum((payload as { cast_photos_upserted?: unknown }).cast_photos_upserted);
                  const castMirrored = asNum((payload as { cast_photos_mirrored?: unknown }).cast_photos_mirrored);
                  const castFailed = asNum((payload as { cast_photos_failed?: unknown }).cast_photos_failed);
                  const castPruned = asNum((payload as { cast_photos_pruned?: unknown }).cast_photos_pruned);
                  const sourcesSkipped = asNum((payload as { sources_skipped?: unknown }).sources_skipped);
                  const autoSucceeded = asNum((payload as { auto_counts_succeeded?: unknown }).auto_counts_succeeded);
                  const autoFailed = asNum((payload as { auto_counts_failed?: unknown }).auto_counts_failed);
                  const wordSucceeded = asNum((payload as { text_overlay_succeeded?: unknown }).text_overlay_succeeded);
                  const wordFailed = asNum((payload as { text_overlay_failed?: unknown }).text_overlay_failed);

                  if (activeTab === "assets" && assetsView === "images") {
                    await loadGalleryAssets(selectedGallerySeason);
                  }

                  const successParts = [
                    castFetched !== null ? `photos fetched: ${castFetched}` : null,
                    castUpserted !== null ? `photos upserted: ${castUpserted}` : null,
                    castMirrored !== null ? `photos mirrored: ${castMirrored}` : null,
                    castPruned !== null ? `photos pruned: ${castPruned}` : null,
                    sourcesSkipped !== null && sourcesSkipped > 0
                      ? `sources skipped: ${sourcesSkipped}`
                      : null,
                    autoSucceeded !== null ? `auto counts set: ${autoSucceeded}` : null,
                    wordSucceeded !== null ? `text-overlay classified: ${wordSucceeded}` : null,
                  ].filter((part): part is string => Boolean(part));
                  const failParts = [
                    castFailed !== null && castFailed > 0 ? `photos failed: ${castFailed}` : null,
                    autoFailed !== null && autoFailed > 0
                      ? `auto counts failed: ${autoFailed}`
                      : null,
                    wordFailed !== null && wordFailed > 0
                      ? `text-overlay failed: ${wordFailed}`
                      : null,
                  ].filter((part): part is string => Boolean(part));

                    if (!suppressSuccessNotice) {
                      setRefreshTargetNotice((prev) => ({
                        ...prev,
                        photos: [
                          successParts.length > 0
                            ? `SUCCESS: ${successParts.join(", ")}`
                            : "SUCCESS: photos refresh complete",
                          failParts.length > 0 ? `FAILS: ${failParts.join(", ")}` : null,
                          liveCountSuffix ? liveCountSuffix : null,
                          durationMs !== null ? `duration: ${durationMs}ms` : null,
                        ]
                          .filter(Boolean)
                          .join(" | "),
                      }));
                    }
                    appendRefreshLog({
                      category: label,
                      message:
                        successParts.length > 0
                          ? `Photos refresh complete: ${successParts.join(", ")}.`
                          : "Photos refresh complete.",
                      current: null,
                      total: null,
                    });
                  } else {
                    const resultsRaw = (payload as { results?: unknown }).results;
                    const results =
                      resultsRaw && typeof resultsRaw === "object"
                        ? (resultsRaw as Record<string, unknown>)
                        : null;
                    const stepRaw = results ? results[target] : null;
                    const step =
                      stepRaw && typeof stepRaw === "object"
                        ? (stepRaw as { status?: unknown; duration_ms?: unknown; error?: unknown })
                        : null;
                    if (step?.status === "failed") {
                      const stepError =
                        typeof step.error === "string" && step.error
                          ? step.error
                          : "Refresh failed";
                      throw new Error(stepError);
                    }

                    if (target === "details") {
                      await fetchShow();
                    } else if (target === "seasons_episodes") {
                      await Promise.all([fetchShow(), fetchSeasons()]);
                    } else if (target === "photos") {
                      if (activeTab === "assets" && assetsView === "images") {
                        await loadGalleryAssets(selectedGallerySeason);
                      }
                    } else if (target === "cast_credits") {
                      if (includeCastProfiles) {
                        const castMembers = await fetchCast({
                          rosterMode: "imdb_show_membership",
                          minEpisodes: 1,
                        });
                        castProfilesSummary = await refreshCastProfilesAndMedia(castMembers);
                      }
                      await fetchCast({ rosterMode: "imdb_show_membership", minEpisodes: 1 });
                    }

                    const durationMs =
                      typeof step?.duration_ms === "number" ? step.duration_ms : null;
                    const castSuffix =
                      target === "cast_credits" && castProfilesSummary
                        ? `, cast profiles/media: ${castProfilesSummary.succeeded}/${castProfilesSummary.attempted}${
                            castProfilesSummary.failed > 0
                              ? ` (${castProfilesSummary.failed} failed)`
                              : ""
                          }`
                        : "";
                    if (!suppressSuccessNotice) {
                      setRefreshTargetNotice((prev) => ({
                        ...prev,
                        [target]: `Refreshed ${label}${durationMs !== null ? ` (${durationMs}ms)` : ""}${castSuffix}${
                          liveCountSuffix ? `. ${liveCountSuffix}` : "."
                        }`,
                      }));
                    }
                    appendRefreshLog({
                      category: label,
                      message: `Completed ${label}${durationMs !== null ? ` in ${durationMs}ms` : ""}${castSuffix}.`,
                      current: null,
                      total: null,
                    });
                  }
                  shouldStopReading = true;
                } else if (eventType === "error") {
                  const message =
                    payload && typeof payload === "object"
                      ? (payload as { error?: string; detail?: string })
                      : null;
                  const errorText =
                    message?.error && message?.detail
                      ? `${message.error}: ${message.detail}`
                      : message?.error || "Refresh failed";
                  appendRefreshLog({
                    category: label,
                    message: `Failed: ${errorText}`,
                    current: null,
                    total: null,
                  });
                  throw new Error(errorText);
                }

                if (shouldStopReading) {
                  break;
                }
                boundaryIndex = buffer.indexOf("\n\n");
              }
              if (shouldStopReading) {
                break;
              }
            }
          } finally {
            clearStreamIdleTimeout();
            clearTimeout(streamTimeout);
            if (reader && shouldStopReading) {
              try {
                await reader.cancel();
              } catch {
                // no-op
              }
            }
          }
        } catch (streamErr) {
          streamFailed = true;
          console.warn("Show refresh stream failed, falling back to non-stream.", streamErr);
        }

        if (streamFailed) {
          appendRefreshLog({
            category: label,
            message: "Live stream unavailable; retrying with fallback refresh.",
            current: null,
            total: null,
          });
          if (target === "photos") {
            throw new Error("Photo refresh stream failed.");
          }
          const headers = await getAuthHeaders();
          let response: Response;
          try {
            response = await fetchWithTimeout(
              `/api/admin/trr-api/shows/${showId}/refresh`,
              {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({ targets: [target] }),
              },
              SHOW_REFRESH_FALLBACK_TIMEOUT_MS
            );
          } catch (error) {
            if (isAbortError(error)) {
              throw new Error(
                `Timed out refreshing ${label} after ${Math.round(
                  SHOW_REFRESH_FALLBACK_TIMEOUT_MS / 1000
                )}s.`
              );
            }
            throw error;
          }
          const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

          if (!response.ok) {
            const message =
              typeof data.error === "string" && typeof data.detail === "string"
                ? `${data.error}: ${data.detail}`
                : (typeof data.error === "string" && data.error) ||
                  (typeof data.detail === "string" && data.detail) ||
                  "Refresh failed";
            throw new Error(message);
          }

          const resultsRaw = (data as { results?: unknown }).results;
          const results =
            resultsRaw && typeof resultsRaw === "object"
              ? (resultsRaw as Record<string, unknown>)
              : null;
          const stepRaw = results ? results[target] : null;
          const step =
            stepRaw && typeof stepRaw === "object"
              ? (stepRaw as { status?: unknown; duration_ms?: unknown; error?: unknown })
              : null;
          if (step?.status === "failed") {
            const stepError =
              typeof step.error === "string" && step.error ? step.error : "Refresh failed";
            throw new Error(stepError);
          }

          if (target === "details") {
            await fetchShow();
          } else if (target === "seasons_episodes") {
            await Promise.all([fetchShow(), fetchSeasons()]);
          } else if (target === "cast_credits") {
            if (includeCastProfiles) {
              const castMembers = await fetchCast({
                rosterMode: "imdb_show_membership",
                minEpisodes: 1,
              });
              castProfilesSummary = await refreshCastProfilesAndMedia(castMembers);
            }
            await fetchCast({ rosterMode: "imdb_show_membership", minEpisodes: 1 });
          }

          const durationMs = typeof step?.duration_ms === "number" ? step.duration_ms : null;
          const castSuffix =
            target === "cast_credits" && castProfilesSummary
              ? `, cast profiles/media: ${castProfilesSummary.succeeded}/${castProfilesSummary.attempted}${
                  castProfilesSummary.failed > 0 ? ` (${castProfilesSummary.failed} failed)` : ""
                }`
              : "";
          if (!suppressSuccessNotice) {
            setRefreshTargetNotice((prev) => ({
              ...prev,
              [target]: `Refreshed ${label}${durationMs !== null ? ` (${durationMs}ms)` : ""}${castSuffix}.`,
            }));
          }
          appendRefreshLog({
            category: label,
            message: `Completed ${label}${durationMs !== null ? ` in ${durationMs}ms` : ""}${castSuffix}.`,
            current: null,
            total: null,
          });
        } else if (!sawComplete) {
          if (!suppressSuccessNotice) {
            setRefreshTargetNotice((prev) => ({ ...prev, [target]: `Refreshed ${label}.` }));
          }
          appendRefreshLog({
            category: label,
            message: `Completed ${label}.`,
            current: null,
            total: null,
          });
        }
        success = true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Refresh failed";
        setRefreshTargetError((prev) => ({ ...prev, [target]: message }));
        appendRefreshLog({
          category: label,
          message: `Failed: ${message}`,
          current: null,
          total: null,
        });
        success = false;
      } finally {
        setRefreshingTargets((prev) => ({ ...prev, [target]: false }));
        setRefreshTargetLiveCounts((prev) => {
          const next = { ...prev };
          delete next[target];
          return next;
        });
        setRefreshTargetProgress((prev) => {
          const next = { ...prev };
          delete next[target];
          return next;
        });
      }

      return success;
    },
    [
      activeTab,
      appendRefreshLog,
      assetsView,
      fetchCast,
      refreshCastProfilesAndMedia,
      fetchSeasons,
      fetchShow,
      getAuthHeaders,
      loadGalleryAssets,
      refreshTargetLiveCounts,
      selectedGallerySeason,
      showId,
    ]
  );

  const refreshAllShowData = useCallback(async () => {
    if (!showId) return;
    if (refreshingShowAll) return;

    setRefreshLogEntries([]);
    setRefreshLogOpen(true);
    setRefreshingShowAll(true);
    setRefreshAllError(null);
    setRefreshAllNotice(null);
    setRefreshAllProgress({
      stage: "Initializing",
      message: "Starting full show refresh...",
      current: 0,
      total: 4,
    });
    appendRefreshLog({
      category: "Refresh",
      message: "Starting full refresh.",
      current: 0,
      total: 4,
    });

    try {
      const targets: ShowRefreshTarget[] = ["details", "seasons_episodes", "cast_credits", "photos"];
      const failedLabels: string[] = [];

      for (const [index, target] of targets.entries()) {
        const targetLabel = getShowRefreshTargetLabel(target);
        const targetOptions: ShowRefreshRunOptions | undefined =
          target === "cast_credits"
              ? { includeCastProfiles: false }
              : target === "photos"
                ? { photoMode: "fast", includeCastProfiles: false }
              : undefined;
        setRefreshAllProgress({
          stage: targetLabel,
          message: `Refreshing ${targetLabel}...`,
          current: index,
          total: targets.length,
        });
        const ok = await refreshShow(target, targetOptions);
        setRefreshAllProgress({
          stage: targetLabel,
          message: ok ? `${targetLabel} complete.` : `${targetLabel} failed.`,
          current: index + 1,
          total: targets.length,
        });
        if (!ok) {
          if (target === "details") failedLabels.push("show info");
          if (target === "seasons_episodes") failedLabels.push("seasons/episodes");
          if (target === "cast_credits") failedLabels.push("cast/credits");
          if (target === "photos") failedLabels.push("media/photos");
        }
      }

      if (failedLabels.length > 0) {
        setRefreshAllError(`Refresh completed with issues in: ${failedLabels.join(", ")}.`);
        appendRefreshLog({
          category: "Refresh",
          message: `Completed with issues: ${failedLabels.join(", ")}.`,
          current: targets.length,
          total: targets.length,
        });
        return;
      }

      setRefreshAllNotice(
        "Refreshed show info, seasons/episodes, media/photos, and cast/credits."
      );
      appendRefreshLog({
        category: "Refresh",
        message: "Completed full refresh successfully.",
        current: targets.length,
        total: targets.length,
      });
    } catch (err) {
      setRefreshAllError(err instanceof Error ? err.message : "Refresh failed");
      appendRefreshLog({
        category: "Refresh",
        message: `Refresh failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        current: null,
        total: null,
      });
    } finally {
      setRefreshingShowAll(false);
      setRefreshAllProgress(null);
    }
  }, [appendRefreshLog, refreshShow, refreshingShowAll, showId]);

  const refreshShowCast = useCallback(async () => {
    if (
      refreshingShowAll ||
      Object.values(refreshingTargets).some(Boolean) ||
      castMatrixSyncLoading ||
      castMediaEnriching ||
      castRefreshPipelineRunning
    ) {
      return;
    }
    const runController = new AbortController();
    castRefreshAbortControllerRef.current = runController;
    setCastMediaEnrichNotice(null);
    setCastMediaEnrichError(null);
    setCastRunFailedMembers([]);
    setCastFailedMembersOpen(false);
    setCastRefreshPipelineRunning(true);
    setCastRefreshPhaseStates([]);
    setRefreshTargetNotice((prev) => {
      const next = { ...prev };
      delete next.cast_credits;
      return next;
    });
    setRefreshTargetError((prev) => {
      const next = { ...prev };
      delete next.cast_credits;
      return next;
    });
    setRefreshTargetProgress((prev) => {
      const next = { ...prev };
      delete next.cast_credits;
      return next;
    });

    const isBravoShow = (show?.networks ?? []).some((network) => isBravoNetworkName(network));
    let rosterMembers: TrrCastMember[] = [];
    let latestPhaseStates: CastRefreshPhaseState[] = [];
    let completedSuccessfully = false;
    const runFailedMembers: CastRunFailedMember[] = [];

    try {
      const phases: CastRefreshPhaseDefinition[] = [
        {
          id: "credits_sync",
          label: "Credits Sync",
          timeoutMs: CAST_REFRESH_PHASE_TIMEOUTS.credits_sync,
          run: async ({ updateProgress }) => {
            updateProgress({
              current: 0,
              total: 1,
              message: "Syncing cast credits from IMDb...",
            });
            const refreshed = await refreshShow("cast_credits", {
              includeCastProfiles: false,
              suppressSuccessNotice: true,
            });
            if (!refreshed) {
              throw new Error("Cast credits sync failed.");
            }
            updateProgress({
              current: 1,
              total: 1,
              message: "Cast credits synced.",
            });
          },
        },
        {
          id: "profile_links_sync",
          label: "Profile Links Sync",
          timeoutMs: CAST_REFRESH_PHASE_TIMEOUTS.profile_links_sync,
          run: async ({ signal, updateProgress }) => {
            updateProgress({
              current: 0,
              total: 1,
              message: "Syncing relationship roles and profile links...",
            });
            await syncCastMatrixRoles({
              includeRelationshipRoles: true,
              includeBravoLinks: false,
              includeBravoImages: false,
              throwOnError: true,
              signal,
            });
            updateProgress({
              current: 1,
              total: 1,
              message: "Profile link sync complete.",
            });
          },
        },
        {
          id: "bio_sync",
          label: "Bio Sync",
          timeoutMs: CAST_REFRESH_PHASE_TIMEOUTS.bio_sync,
          run: async ({ signal, updateProgress }) => {
            updateProgress({
              current: 0,
              total: null,
              message: "Loading IMDb cast roster for bio sync...",
            });
            rosterMembers = await fetchCast({
              rosterMode: "imdb_show_membership",
              minEpisodes: 1,
              throwOnError: true,
              signal,
            });
            const bioSummary = await refreshCastProfilesAndMedia(rosterMembers, {
              mode: "profile_only",
              stageLabel: "Cast Bios",
              category: "Cast Bios",
              signal,
            });
            if (bioSummary.failedMembers.length > 0) {
              runFailedMembers.push(...bioSummary.failedMembers);
            }
            updateProgress({
              current: rosterMembers.length,
              total: rosterMembers.length,
              message: `Bio sync complete for ${rosterMembers.length.toLocaleString()} members.`,
            });
          },
        },
        {
          id: "network_augmentation",
          label: "Network Augmentation",
          timeoutMs: CAST_REFRESH_PHASE_TIMEOUTS.network_augmentation,
          run: async ({ signal, updateProgress }) => {
            if (!isBravoShow) {
              return { skipped: true, message: "Skipped: no Bravo network augmentation required." };
            }
            updateProgress({
              current: 0,
              total: 1,
              message: "Running Bravo-specific cast augmentation...",
            });
            await syncCastMatrixRoles({
              includeRelationshipRoles: false,
              includeBravoLinks: true,
              includeBravoImages: true,
              throwOnError: true,
              signal,
            });
            updateProgress({
              current: 1,
              total: 1,
              message: "Network augmentation complete.",
            });
          },
        },
        {
          id: "media_ingest",
          label: "Media Ingest",
          timeoutMs: CAST_REFRESH_PHASE_TIMEOUTS.media_ingest,
          run: async ({ signal, updateProgress }) => {
            if (rosterMembers.length === 0) {
              rosterMembers = await fetchCast({
                rosterMode: "imdb_show_membership",
                minEpisodes: 1,
                throwOnError: true,
                signal,
              });
            }
            const longHint =
              rosterMembers.length > 30 ? " This may take several minutes." : "";
            updateProgress({
              current: 0,
              total: rosterMembers.length,
              message: `Ingesting cast media from IMDb/TMDb...${longHint}`,
            });
            const ingestSummary = await refreshCastProfilesAndMedia(rosterMembers, {
              mode: "ingest_only",
              stageLabel: "Cast Media Ingest",
              category: "Cast Media Ingest",
              signal,
            });
            if (ingestSummary.failedMembers.length > 0) {
              runFailedMembers.push(...ingestSummary.failedMembers);
            }
            updateProgress({
              current: rosterMembers.length,
              total: rosterMembers.length,
              message: "Cast media ingest complete.",
            });
          },
        },
      ];

      await runPhasedCastRefresh({
        phases,
        signal: runController.signal,
        onPhaseStatesChange: (states) => {
          latestPhaseStates = states;
          setCastRefreshPhaseStates(states);
          const activePhase =
            states.find((phase) => phase.status === "running") ??
            states.find((phase) => phase.status === "failed" || phase.status === "timed_out") ??
            [...states].reverse().find((phase) => phase.status === "completed") ??
            null;
          if (!activePhase) return;

          const phaseIndex = states.findIndex((phase) => phase.id === activePhase.id);
          const phaseStage = CAST_REFRESH_PHASE_STAGES[activePhase.id] ?? activePhase.label;
          setRefreshTargetProgress((prev) => ({
            ...prev,
            cast_credits: {
              stage: `Phase ${phaseIndex + 1}/${states.length}: ${phaseStage}`,
              message:
                activePhase.progress.message ||
                `${phaseStage} ${
                  activePhase.status === "running" ? "in progress" : activePhase.status
                }.`,
              current: activePhase.progress.current,
              total: activePhase.progress.total,
            },
          }));
        },
      });
      await fetchCast({
        rosterMode: "imdb_show_membership",
        minEpisodes: 1,
        signal: runController.signal,
      });
      await fetchCastRoleMembers({ force: true });
      setCastRoleMembersWarning(null);
      setCastRunFailedMembers(runFailedMembers);
      setCastFailedMembersOpen(runFailedMembers.length > 0);
      setRefreshTargetNotice((prev) => ({
        ...prev,
        cast_credits:
          "Cast refresh complete: credits synced, profile links synced, bios refreshed, network augmentation applied, media ingest complete.",
      }));
      completedSuccessfully = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Cast refresh failed";
      if (runController.signal.aborted || /canceled/i.test(message)) {
        setRefreshTargetError((prev) => {
          const next = { ...prev };
          delete next.cast_credits;
          return next;
        });
        setRefreshTargetNotice((prev) => ({
          ...prev,
          cast_credits: "Cast refresh canceled.",
        }));
        appendRefreshLog({
          category: "Cast & Credits",
          message: "Cast refresh canceled.",
          current: null,
          total: null,
        });
        return;
      }
      const failedPhase =
        latestPhaseStates.find((phase) => phase.status === "failed" || phase.status === "timed_out")
        ?? null;
      const phasePrefix = failedPhase
        ? `${CAST_REFRESH_PHASE_STAGES[failedPhase.id] ?? failedPhase.label} failed`
        : "Cast refresh failed";
      setCastRunFailedMembers(runFailedMembers);
      setCastFailedMembersOpen(runFailedMembers.length > 0);
      setRefreshTargetNotice((prev) => {
        const next = { ...prev };
        delete next.cast_credits;
        return next;
      });
      setRefreshTargetError((prev) => ({ ...prev, cast_credits: `${phasePrefix}: ${message}` }));
      appendRefreshLog({
        category: "Cast & Credits",
        message: `${phasePrefix}: ${message}`,
        current: null,
        total: null,
      });
    } finally {
      if (castRefreshAbortControllerRef.current === runController) {
        castRefreshAbortControllerRef.current = null;
      }
      setCastRefreshPipelineRunning(false);
      if (completedSuccessfully) {
        setCastRefreshPhaseStates([]);
      }
    }
  }, [
    appendRefreshLog,
    castMatrixSyncLoading,
    castMediaEnriching,
    castRefreshPipelineRunning,
    fetchCast,
    fetchCastRoleMembers,
    refreshCastProfilesAndMedia,
    refreshShow,
    refreshingShowAll,
    refreshingTargets,
    show?.networks,
    syncCastMatrixRoles,
  ]);

  const enrichCastMedia = useCallback(async () => {
    if (
      refreshingShowAll ||
      Object.values(refreshingTargets).some(Boolean) ||
      castMatrixSyncLoading ||
      castMediaEnriching ||
      castRefreshPipelineRunning
    ) {
      return;
    }
    const runController = new AbortController();
    castMediaEnrichAbortControllerRef.current = runController;
    setCastMediaEnriching(true);
    setCastMediaEnrichNotice(null);
    setCastMediaEnrichError(null);
    setCastRunFailedMembers([]);
    setCastFailedMembersOpen(false);
    try {
      let failedMembers: CastRunFailedMember[] = [];
      await runCastEnrichMediaWorkflow({
        fetchCastMembers: async () => {
          setRefreshTargetProgress((prev) => ({
            ...prev,
            cast_credits: {
              stage: "Cast Roster",
              message: "Loading cast roster for media enrich...",
              current: null,
              total: null,
            },
          }));
          return await fetchCast({
            rosterMode: "imdb_show_membership",
            minEpisodes: 1,
            throwOnError: true,
            signal: runController.signal,
          });
        },
        reprocessCastMemberMedia: async (members) => {
          const summary = await reprocessCastMedia(members, { signal: runController.signal });
          failedMembers = summary.failedMembers;
        },
      });
      await fetchCast({
        rosterMode: "imdb_show_membership",
        minEpisodes: 1,
        signal: runController.signal,
      });
      setCastRunFailedMembers(failedMembers);
      setCastFailedMembersOpen(failedMembers.length > 0);
      setCastMediaEnrichNotice("Cast media enrich complete (count, word detection, crop, resize).");
    } catch (err) {
      if (runController.signal.aborted) {
        setCastMediaEnrichError(null);
        setCastMediaEnrichNotice("Cast media enrich canceled.");
        appendRefreshLog({
          category: "Cast Media Enrich",
          message: "Cast media enrich canceled.",
          current: null,
          total: null,
        });
        return;
      }
      setCastMediaEnrichError(err instanceof Error ? err.message : "Failed to enrich cast media");
    } finally {
      if (castMediaEnrichAbortControllerRef.current === runController) {
        castMediaEnrichAbortControllerRef.current = null;
      }
      setCastMediaEnriching(false);
      setRefreshTargetProgress((prev) => {
        const next = { ...prev };
        delete next.cast_credits;
        return next;
      });
    }
  }, [
    appendRefreshLog,
    castMatrixSyncLoading,
    castMediaEnriching,
    castRefreshPipelineRunning,
    fetchCast,
    refreshingShowAll,
    refreshingTargets,
    reprocessCastMedia,
  ]);

  const cancelShowCastWorkflow = useCallback(() => {
    castRefreshAbortControllerRef.current?.abort();
    castMediaEnrichAbortControllerRef.current?.abort();
    abortInFlightPersonRefreshRuns();
  }, [abortInFlightPersonRefreshRuns]);

  const retryFailedCastMediaEnrich = useCallback(async () => {
    if (castRunFailedMembers.length === 0) return;
    if (
      refreshingShowAll ||
      Object.values(refreshingTargets).some(Boolean) ||
      castMatrixSyncLoading ||
      castMediaEnriching ||
      castRefreshPipelineRunning
    ) {
      return;
    }

    const retryPersonIds = new Set(castRunFailedMembers.map((member) => member.personId));
    const retryMembers = cast.filter((member) => retryPersonIds.has(member.person_id));
    if (retryMembers.length === 0) return;

    const runController = new AbortController();
    castMediaEnrichAbortControllerRef.current = runController;
    setCastMediaEnriching(true);
    setCastMediaEnrichNotice(null);
    setCastMediaEnrichError(null);

    try {
      const retrySummary = await reprocessCastMedia(retryMembers, { signal: runController.signal });
      await fetchCast({
        rosterMode: "imdb_show_membership",
        minEpisodes: 1,
        signal: runController.signal,
      });
      setCastRunFailedMembers(retrySummary.failedMembers);
      setCastFailedMembersOpen(retrySummary.failedMembers.length > 0);
      setCastMediaEnrichNotice(
        retrySummary.failedMembers.length > 0
          ? `Retried failed members; ${retrySummary.succeeded}/${retrySummary.attempted} succeeded.`
          : "Retried failed members successfully."
      );
    } catch (err) {
      if (runController.signal.aborted) {
        setCastMediaEnrichError(null);
        setCastMediaEnrichNotice("Cast media enrich canceled.");
        return;
      }
      setCastMediaEnrichError(err instanceof Error ? err.message : "Failed to retry failed cast members");
    } finally {
      if (castMediaEnrichAbortControllerRef.current === runController) {
        castMediaEnrichAbortControllerRef.current = null;
      }
      setCastMediaEnriching(false);
      setRefreshTargetProgress((prev) => {
        const next = { ...prev };
        delete next.cast_credits;
        return next;
      });
    }
  }, [
    cast,
    castMatrixSyncLoading,
    castMediaEnriching,
    castRefreshPipelineRunning,
    castRunFailedMembers,
    fetchCast,
    refreshingShowAll,
    refreshingTargets,
    reprocessCastMedia,
  ]);

  const missingCastPhotoCount = useMemo(() => {
    const countMissing = (members: TrrCastMember[]) =>
      members.filter((member) => !member.photo_url).length;
    return countMissing(cast) + countMissing(archiveFootageCast);
  }, [archiveFootageCast, cast]);

  const enrichMissingCastPhotos = useCallback(async () => {
    if (!showId) return;
    if (castLoading || castPhotoEnriching) return;
    if (missingCastPhotoCount <= 0) {
      setCastPhotoEnrichError(null);
      setCastPhotoEnrichNotice("No missing cast photos to enrich.");
      return;
    }

    setCastPhotoEnriching(true);
    setCastPhotoEnrichError(null);
    setCastPhotoEnrichNotice(null);
    try {
      await fetchCast({
        rosterMode: "imdb_show_membership",
        minEpisodes: 1,
        photoFallbackMode: "bravo",
        mergeMissingPhotosOnly: true,
        throwOnError: true,
      });
      setCastPhotoEnrichNotice(
        `Bravo enrichment complete. Requested fallback photos for ${missingCastPhotoCount} cast entries.`
      );
    } catch (err) {
      setCastPhotoEnrichError(err instanceof Error ? err.message : "Failed to enrich cast photos");
    } finally {
      setCastPhotoEnriching(false);
    }
  }, [castLoading, castPhotoEnriching, fetchCast, missingCastPhotoCount, showId]);

  const detectTextOverlayForUnknown = useCallback(async () => {
    const targets = galleryAssets
      .filter((a) => looksLikeUuid(a.id) && inferHasTextOverlay(a.metadata ?? null) === null)
      .slice(0, 25);
    if (targets.length === 0) return;

    setTextOverlayDetectError(null);
    const headers = await getAuthHeaders();
    for (const asset of targets) {
      try {
        const response = await fetchWithTimeout(
          `/api/admin/trr-api/media-assets/${asset.id}/detect-text-overlay`,
          {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ force: false }),
          },
          ASSET_PIPELINE_STEP_TIMEOUT_MS
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const errorText =
            typeof data.error === "string" ? data.error : "Detect text overlay failed";
          const detailText = typeof data.detail === "string" ? data.detail : null;
          setTextOverlayDetectError(detailText ? `${errorText}: ${detailText}` : errorText);
          // Non-recoverable for this batch; avoid spamming 25 failing requests.
          if (response.status === 401 || response.status === 403 || response.status === 503) {
            break;
          }
        }
      } catch (err) {
        setTextOverlayDetectError(
          err instanceof Error ? err.message : "Detect text overlay failed"
        );
        break;
      }
    }

    if (activeTab === "assets" && assetsView === "images") {
      await loadGalleryAssets(selectedGallerySeason);
    }
  }, [galleryAssets, getAuthHeaders, activeTab, assetsView, loadGalleryAssets, selectedGallerySeason]);

  // Load gallery for image/brand views when Assets tab is active.
  useEffect(() => {
    if (activeTab !== "assets") return;
    if (assetsView === "images" && visibleSeasons.length > 0) {
      loadGalleryAssets(selectedGallerySeason);
      return;
    }
    if (assetsView === "branding") {
      loadGalleryAssets("all");
    }
  }, [activeTab, assetsView, selectedGallerySeason, loadGalleryAssets, visibleSeasons.length]);

  const handleRefreshCastMember = useCallback(
    async (personId: string, label: string) => {
      if (!personId) return;
      if (
        castRefreshPipelineRunning ||
        castMediaEnriching ||
        castMatrixSyncLoading ||
        refreshingTargets.cast_credits
      ) {
        return;
      }

      personRefreshAbortControllersRef.current[personId]?.abort();
      const runController = new AbortController();
      personRefreshAbortControllersRef.current[personId] = runController;

      setRefreshingPersonIds((prev) => ({ ...prev, [personId]: true }));
      setRefreshingPersonProgress((prev) => ({
        ...prev,
        [personId]: {
          stage: "Initializing",
          message: `Refreshing cast media for ${label}...`,
          current: 0,
          total: null,
        },
      }));
      setRefreshNotice(null);
      setRefreshError(null);

      try {
        await refreshPersonImages(
          personId,
          (progress) => {
            setRefreshingPersonProgress((prev) => ({
              ...prev,
              [personId]: progress,
            }));
          },
          { signal: runController.signal }
        );
        await fetchCast();
        setRefreshNotice(`Refreshed person for ${label}.`);
      } catch (err) {
        if (runController.signal.aborted) {
          setRefreshError(null);
          return;
        }
        console.error("Failed to refresh person images:", err);
        setRefreshError(
          err instanceof Error ? err.message : "Failed to refresh images"
        );
      } finally {
        if (personRefreshAbortControllersRef.current[personId] === runController) {
          delete personRefreshAbortControllersRef.current[personId];
        }
        setRefreshingPersonIds((prev) => {
          const next = { ...prev };
          delete next[personId];
          return next;
        });
        setRefreshingPersonProgress((prev) => {
          const next = { ...prev };
          delete next[personId];
          return next;
        });
      }
    },
    [
      castMatrixSyncLoading,
      castMediaEnriching,
      castRefreshPipelineRunning,
      fetchCast,
      refreshPersonImages,
      refreshingTargets.cast_credits,
    ]
  );

  // Open lightbox for gallery asset
  const openAssetLightbox = (
    asset: SeasonAsset,
    index: number,
    filteredAssets: SeasonAsset[],
    triggerElement: HTMLElement
  ) => {
    assetTriggerRef.current = triggerElement;
    setAssetLightbox({ asset, index, filteredAssets });
  };

  // Navigate between assets in lightbox
  const navigateAssetLightbox = (direction: "prev" | "next") => {
    if (!assetLightbox) return;
    const { index, filteredAssets } = assetLightbox;
    const newIndex = direction === "prev" ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < filteredAssets.length) {
      setAssetLightbox({
        asset: filteredAssets[newIndex],
        index: newIndex,
        filteredAssets,
      });
    }
  };

  // Close asset lightbox
  const closeAssetLightbox = () => {
    setAssetLightbox(null);
  };

  const applyGalleryAssetPatch = useCallback(
    (target: SeasonAsset, patch: Partial<SeasonAsset>) => {
      const applyPatch = (candidate: SeasonAsset): SeasonAsset => {
        const sameAsset =
          candidate.id === target.id ||
          (candidate.media_asset_id &&
            target.media_asset_id &&
            candidate.media_asset_id === target.media_asset_id) ||
          candidate.hosted_url === target.hosted_url;
        if (!sameAsset) return candidate;
        return {
          ...candidate,
          ...patch,
          metadata:
            patch.metadata === undefined ? candidate.metadata : patch.metadata,
        };
      };

      setGalleryAssets((prev) => prev.map(applyPatch));
      setAssetLightbox((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          asset: applyPatch(prev.asset),
          filteredAssets: prev.filteredAssets.map(applyPatch),
        };
      });
    },
    []
  );

  const refreshGalleryAssetPipeline = useCallback(
    async (asset: SeasonAsset) => {
      const headers = await getAuthHeaders();
      const base =
        asset.origin_table === "media_assets"
          ? { kind: "media" as const, id: asset.media_asset_id ?? asset.id }
          : asset.origin_table === "cast_photos"
            ? { kind: "cast" as const, id: asset.id }
            : null;

      if (!base) {
        throw new Error("Full pipeline refresh is only available for media assets and cast photos.");
      }

      setRefreshLogOpen(true);
      appendRefreshLog({
        category: "Image Pipeline",
        message: `Started image pipeline refresh (${base.kind}:${base.id}).`,
        current: null,
        total: null,
      });

      const callStep = async (
        label: string,
        endpoint: string,
        payload: Record<string, unknown>
      ) => {
        appendRefreshLog({
          category: "Image Pipeline",
          message: `${label} started.`,
          current: null,
          total: null,
        });
        let response: Response;
        try {
          response = await fetchWithTimeout(
            endpoint,
            {
              method: "POST",
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            },
            ASSET_PIPELINE_STEP_TIMEOUT_MS
          );
        } catch (error) {
          if (isAbortError(error)) {
            appendRefreshLog({
              category: "Image Pipeline",
              message: `${label} timed out after ${Math.round(ASSET_PIPELINE_STEP_TIMEOUT_MS / 1000)}s.`,
              current: null,
              total: null,
            });
            throw new Error(
              `Pipeline step timed out (${Math.round(ASSET_PIPELINE_STEP_TIMEOUT_MS / 1000)}s)`
            );
          }
          throw error;
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message =
            data?.error && data?.detail
              ? `${data.error}: ${data.detail}`
              : data?.error || data?.detail || "Pipeline step failed";
          appendRefreshLog({
            category: "Image Pipeline",
            message: `${label} failed: ${message}`,
            current: null,
            total: null,
          });
          throw new Error(message);
        }
        appendRefreshLog({
          category: "Image Pipeline",
          message: `${label} complete.`,
          current: null,
          total: null,
        });
        return data as Record<string, unknown>;
      };

      try {
        const prefix =
          base.kind === "media"
            ? `/api/admin/trr-api/media-assets/${base.id}`
            : `/api/admin/trr-api/cast-photos/${base.id}`;

        await callStep("Mirror", `${prefix}/mirror`, { force: true });
        const countPayload = await callStep("People Count", `${prefix}/auto-count`, { force: true });
        const textPayload = await callStep("Text Overlay", `${prefix}/detect-text-overlay`, { force: true });
        await callStep("Variants", `${prefix}/variants`, { force: true });
        const hasTextOverlay =
          typeof textPayload.has_text_overlay === "boolean"
            ? textPayload.has_text_overlay
            : typeof textPayload.hasTextOverlay === "boolean"
              ? textPayload.hasTextOverlay
              : null;
        await callStep("Variants (Auto-Crop)", `${prefix}/variants`, {
          force: true,
          crop: buildAssetAutoCropPayloadWithFallback(asset),
        });

        applyGalleryAssetPatch(asset, {
          people_count:
            typeof countPayload.people_count === "number"
              ? countPayload.people_count
              : asset.people_count ?? null,
          people_count_source:
            countPayload.people_count_source === "auto" ||
            countPayload.people_count_source === "manual"
              ? countPayload.people_count_source
              : asset.people_count_source ?? null,
          metadata: {
            ...((asset.metadata ?? {}) as Record<string, unknown>),
            ...(hasTextOverlay === null ? {} : { has_text_overlay: hasTextOverlay }),
          },
        });

        await loadGalleryAssets(selectedGallerySeason);
        const summaryParts: string[] = [];
        if (typeof countPayload.people_count === "number") {
          summaryParts.push(`people_count: ${countPayload.people_count}`);
        }
        summaryParts.push(
          hasTextOverlay === null
            ? "text_overlay: unchanged"
            : `text_overlay: ${hasTextOverlay ? "yes" : "no"}`
        );
        const summaryText = summaryParts.join(" | ");
        setRefreshTargetNotice((prev) => ({
          ...prev,
          photos: `Image pipeline refreshed (${summaryText}).`,
        }));
        setRefreshTargetError((prev) => {
          const next = { ...prev };
          delete next.photos;
          return next;
        });
        appendRefreshLog({
          category: "Image Pipeline",
          message: `Completed image pipeline refresh (${base.kind}:${base.id})${summaryText ? `: ${summaryText}` : "."}`,
          current: null,
          total: null,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Image pipeline refresh failed";
        setRefreshTargetError((prev) => ({ ...prev, photos: message }));
        appendRefreshLog({
          category: "Image Pipeline",
          message: `Failed image pipeline refresh (${base.kind}:${base.id}): ${message}`,
          current: null,
          total: null,
        });
        throw error;
      }
    },
    [
      appendRefreshLog,
      applyGalleryAssetPatch,
      getAuthHeaders,
      loadGalleryAssets,
      selectedGallerySeason,
    ]
  );

  const archiveGalleryAsset = useCallback(
    async (asset: SeasonAsset) => {
      const origin = asset.origin_table ?? null;
      if (!origin) throw new Error("Cannot archive: missing origin_table");
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout(
        "/api/admin/trr-api/assets/archive",
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ origin, asset_id: asset.id }),
        },
        ASSET_PIPELINE_STEP_TIMEOUT_MS
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          data?.error && data?.detail ? `${data.error}: ${data.detail}` : data?.detail || data?.error || "Archive failed";
        throw new Error(message);
      }

      // Clear from UI immediately (hosted_url will also be cleared server-side).
      setGalleryAssets((prev) => prev.filter((a) => a.hosted_url !== asset.hosted_url));
      closeAssetLightbox();
    },
    [getAuthHeaders]
  );

  const triggerGalleryAssetAutoCrop = useCallback(
    async (asset: SeasonAsset) => {
      const base =
        asset.origin_table === "media_assets"
          ? { id: asset.media_asset_id ?? asset.id, prefix: "media-assets" }
          : asset.origin_table === "cast_photos"
            ? { id: asset.id, prefix: "cast-photos" }
            : null;
      if (!base?.id) return;
      try {
        const headers = await getAuthHeaders();
        const endpoint = `/api/admin/trr-api/${base.prefix}/${base.id}/variants`;
        await fetchWithTimeout(
          endpoint,
          {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ force: true }),
          },
          ASSET_PIPELINE_STEP_TIMEOUT_MS
        );
        await fetchWithTimeout(
          endpoint,
          {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              force: true,
              crop: buildAssetAutoCropPayloadWithFallback(asset),
            }),
          },
          ASSET_PIPELINE_STEP_TIMEOUT_MS
        );
      } catch (error) {
        console.warn("[show-gallery] auto-crop rebuild after star toggle failed", {
          assetId: asset.id,
          origin: asset.origin_table,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [getAuthHeaders]
  );

  const toggleStarGalleryAsset = useCallback(
    async (asset: SeasonAsset, starred: boolean) => {
      const origin = asset.origin_table ?? null;
      if (!origin) throw new Error("Cannot star: missing origin_table");
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout(
        "/api/admin/trr-api/assets/star",
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ origin, asset_id: asset.id, starred }),
        },
        ASSET_PIPELINE_STEP_TIMEOUT_MS
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          data?.error && data?.detail ? `${data.error}: ${data.detail}` : data?.detail || data?.error || "Star failed";
        throw new Error(message);
      }

      setGalleryAssets((prev) =>
        prev.map((a) => {
          if (a.hosted_url !== asset.hosted_url) return a;
          const meta = (a.metadata && typeof a.metadata === "object") ? { ...(a.metadata as Record<string, unknown>) } : {};
          meta.starred = starred;
          if (starred) meta.starred_at = new Date().toISOString();
          else delete meta.starred_at;
          return { ...a, metadata: meta };
        })
      );
      if (starred) {
        void triggerGalleryAssetAutoCrop(asset);
      }
    },
    [getAuthHeaders, triggerGalleryAssetAutoCrop]
  );

  const updateGalleryAssetContentType = useCallback(
    async (asset: SeasonAsset, contentType: string) => {
      const origin = asset.origin_table ?? null;
      if (!origin) throw new Error("Cannot update content type: missing origin_table");
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout(
        "/api/admin/trr-api/assets/content-type",
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ origin, asset_id: asset.id, content_type: contentType }),
        },
        ASSET_PIPELINE_STEP_TIMEOUT_MS
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          data?.error && data?.detail
            ? `${data.error}: ${data.detail}`
            : data?.detail || data?.error || "Content type update failed";
        throw new Error(message);
      }

      const normalizedContentType =
        typeof data.content_type === "string" && data.content_type.trim().length > 0
          ? normalizeContentTypeToken(data.content_type)
          : normalizeContentTypeToken(contentType);
      const nextKind =
        typeof data.kind === "string" && data.kind.trim().length > 0
          ? data.kind.trim()
          : contentTypeToAssetKind(normalizedContentType);
      const nextContextType =
        typeof data.context_type === "string" && data.context_type.trim().length > 0
          ? data.context_type.trim()
          : contentTypeToContextType(normalizedContentType);

      const applyUpdate = (candidate: SeasonAsset): SeasonAsset => {
        const metadata =
          candidate.metadata && typeof candidate.metadata === "object"
            ? { ...(candidate.metadata as Record<string, unknown>) }
            : {};
        metadata.fandom_section_tag = normalizedContentType;
        metadata.content_type = normalizedContentType;
        return {
          ...candidate,
          kind: nextKind,
          context_type: nextContextType,
          metadata,
        };
      };

      setGalleryAssets((prev) =>
        prev.map((candidate) =>
          candidate.id === asset.id ? applyUpdate(candidate) : candidate
        )
      );
      setAssetLightbox((prev) =>
        prev && prev.asset.id === asset.id
          ? { ...prev, asset: applyUpdate(prev.asset) }
          : prev
      );
    },
    [getAuthHeaders]
  );

  const deleteGalleryAsset = useCallback(
    async (asset: SeasonAsset) => {
      if (asset.origin_table !== "media_assets") {
        throw new Error("Delete is currently supported only for imported media assets.");
      }
      const headers = await getAuthHeaders();
      const assetId = asset.media_asset_id ?? asset.id;
      const response = await fetchWithTimeout(
        `/api/admin/trr-api/media-assets/${assetId}`,
        {
          method: "DELETE",
          headers,
        },
        ASSET_PIPELINE_STEP_TIMEOUT_MS
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.detail || data?.error || "Delete failed");
      }
      setGalleryAssets((prev) => prev.filter((a) => a.id !== asset.id));
      closeAssetLightbox();
    },
    [getAuthHeaders]
  );

  const lightboxAssetCapabilities = assetLightbox
    ? resolveGalleryAssetCapabilities(assetLightbox.asset)
    : null;
  const lightboxFeaturedKind = assetLightbox
    ? getFeaturedShowImageKind(assetLightbox.asset)
    : null;
  const lightboxFeaturedLogoPayload = assetLightbox
    ? resolveFeaturedLogoPayload(assetLightbox.asset)
    : null;
  const canSetFeaturedPoster =
    Boolean(assetLightbox) &&
    assetLightbox?.asset.origin_table === "show_images" &&
    lightboxFeaturedKind === "poster";
  const canSetFeaturedBackdrop =
    Boolean(assetLightbox) &&
    assetLightbox?.asset.origin_table === "show_images" &&
    lightboxFeaturedKind === "backdrop";
  const canSetFeaturedLogo = Boolean(assetLightbox && lightboxFeaturedLogoPayload);
  const featuredPosterDisabledReason = !assetLightbox
    ? "No image selected."
    : assetLightbox.asset.origin_table !== "show_images"
      ? "Featured images can only be selected from show_images assets."
      : lightboxFeaturedKind !== "poster"
        ? "Only show-image poster assets can be set as featured poster."
        : undefined;
  const featuredBackdropDisabledReason = !assetLightbox
    ? "No image selected."
    : assetLightbox.asset.origin_table !== "show_images"
      ? "Featured images can only be selected from show_images assets."
      : lightboxFeaturedKind !== "backdrop"
        ? "Only show-image backdrop assets can be set as featured backdrop."
        : undefined;
  const featuredLogoDisabledReason = !assetLightbox
    ? "No image selected."
    : !lightboxFeaturedLogoPayload
      ? "Featured logo can only be set from show_images or media_assets logo rows."
      : undefined;
  const isFeaturedPoster = Boolean(
    assetLightbox &&
      canSetFeaturedPoster &&
      show?.primary_poster_image_id &&
      show.primary_poster_image_id === assetLightbox.asset.id
  );
  const isFeaturedBackdrop = Boolean(
    assetLightbox &&
      canSetFeaturedBackdrop &&
      show?.primary_backdrop_image_id &&
      show.primary_backdrop_image_id === assetLightbox.asset.id
  );
  const isFeaturedLogo = Boolean(
    assetLightbox &&
      featuredShowLogoAssetId &&
      featuredShowLogoAssetId === assetLightbox.asset.id
  );

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Loading admin access...</p>
        </div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  if (slugResolutionLoading || (!showId && !slugResolutionError)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Resolving show URL...</p>
        </div>
      </div>
    );
  }

  if (slugResolutionError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">{slugResolutionError}</p>
          <Link
            href="/shows"
            className="mt-4 inline-block text-sm text-zinc-600 hover:text-zinc-900"
          >
            ← Back to Shows
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Loading show data...</p>
        </div>
      </div>
    );
  }

  if (!show) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">
            {error || "Show not found"}
          </p>
          <Link
            href="/shows"
            className="mt-4 inline-block text-sm text-zinc-600 hover:text-zinc-900"
          >
            ← Back to Shows
          </Link>
        </div>
      </div>
    );
  }

  const tmdbVoteAverageText = formatFixed1(show.tmdb_vote_average);
  const imdbRatingText = formatFixed1(show.imdb_rating_value);
  const primaryNetwork = show.networks?.[0] ?? null;
  const networkLabel = show.networks?.slice(0, 2).join(" · ") || "TRR Core";
  const hasPersonRefreshInFlight = Object.keys(refreshingPersonIds).length > 0;
  const isShowRefreshBusy =
    refreshingShowAll || Object.values(refreshingTargets).some((value) => value);
  const castAnyJobRunning =
    castRefreshPipelineRunning ||
    castMediaEnriching ||
    castMatrixSyncLoading ||
    Boolean(refreshingTargets.cast_credits) ||
    hasPersonRefreshInFlight;
  const isCastRefreshBusy =
    isShowRefreshBusy ||
    castMatrixSyncLoading ||
    castRefreshPipelineRunning ||
    castMediaEnriching ||
    hasPersonRefreshInFlight;
  const rolesWarningWithSnapshotAge = withSnapshotAgeSuffix(rolesWarning, lastSuccessfulRolesAt);
  const castRoleMembersWarningWithSnapshotAge = withSnapshotAgeSuffix(
    castRoleMembersWarning,
    lastSuccessfulCastRoleMembersAt
  );
  const showCastIntelligenceUnavailable =
    activeTab === "cast" &&
    castSource === "show_fallback" &&
    !castRoleMembersLoading &&
    !rolesLoading &&
    (Boolean(castRoleMembersError) || Boolean(rolesError));
  const castIntelligenceSettled = !castRoleMembersLoading && !rolesLoading;
  const castRosterSettled =
    !castLoading && (castLoadedOnce || Boolean(castLoadError) || Boolean(castLoadWarning));
  const castUiTerminalReady = activeTab === "cast" && castIntelligenceSettled && castRosterSettled;
  const shouldShowRoleCreditEmptyState =
    castUiTerminalReady && availableCastRoleAndCreditFilters.length === 0;
  const activeRefreshTarget =
    (Object.entries(refreshingTargets).find(([, isRefreshing]) => isRefreshing)?.[0] as
      | ShowRefreshTarget
      | undefined) ?? null;
  const activeTargetProgress = activeRefreshTarget
    ? refreshTargetProgress[activeRefreshTarget]
    : null;
  const globalRefreshProgress = activeTargetProgress ?? refreshAllProgress;
  const globalRefreshStage = activeTargetProgress?.stage ?? refreshAllProgress?.stage ?? null;
  const globalRefreshMessage =
    activeTargetProgress?.message ??
    (activeRefreshTarget
      ? `Refreshing ${getShowRefreshTargetLabel(activeRefreshTarget)}...`
      : refreshAllProgress?.message ?? null);
  const globalRefreshCurrent =
    activeTargetProgress?.current ?? refreshAllProgress?.current ?? null;
  const globalRefreshTotal = activeTargetProgress?.total ?? refreshAllProgress?.total ?? null;
  const castRefreshActivePhase =
    castRefreshPhaseStates.find((phase) => phase.status === "running") ?? null;
  const castRefreshActivePhaseIndex = castRefreshActivePhase
    ? castRefreshPhaseStates.findIndex((phase) => phase.id === castRefreshActivePhase.id)
    : -1;
  const castPhaseProgress =
    castRefreshActivePhase && castRefreshActivePhaseIndex >= 0
      ? {
          stage: `Phase ${castRefreshActivePhaseIndex + 1}/${castRefreshPhaseStates.length}: ${
            CAST_REFRESH_PHASE_STAGES[castRefreshActivePhase.id] ?? castRefreshActivePhase.label
          }`,
          message: castRefreshActivePhase.progress.message ?? null,
          current: castRefreshActivePhase.progress.current,
          total: castRefreshActivePhase.progress.total,
        }
      : null;
  const castTabProgress =
    refreshingTargets.cast_credits || castRefreshPipelineRunning || castMediaEnriching
      ? castPhaseProgress ?? refreshTargetProgress.cast_credits ?? null
      : null;
  const showCastTabProgress = Boolean(
    castTabProgress?.message || castTabProgress?.stage || castTabProgress?.total !== null
  );
  const castRefreshPhasePanelStates =
    castRefreshPhaseStates.length > 0
      ? castRefreshPhaseStates
      : CAST_REFRESH_PHASE_ORDER.map((phaseId) => ({
          id: phaseId,
          label: CAST_REFRESH_PHASE_STAGES[phaseId],
          timeoutMs: CAST_REFRESH_PHASE_TIMEOUTS[phaseId],
          status: "pending" as const,
          progress: { current: null, total: null, message: null, liveCounts: null },
          startedAt: null,
          finishedAt: null,
          error: null,
        }));
  const castRefreshButtonLabel = castRefreshPipelineRunning
    ? castRefreshActivePhase
      ? CAST_REFRESH_PHASE_BUTTON_LABELS[castRefreshActivePhase.id]
      : "Refreshing..."
    : "Refresh";
  const autoGeneratedBravoUrl = inferBravoShowUrl(show?.name) || syncBravoUrl.trim() || "";

  const pipelineSteps = buildPipelineRows(REFRESH_LOG_TOPIC_DEFINITIONS, refreshLogTopicGroups);
  const castRefreshPhaseStatusChipClassName = (status: CastRefreshPhaseState["status"]): string => {
    if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "running") return "border-sky-200 bg-sky-50 text-sky-700";
    if (status === "skipped") return "border-zinc-200 bg-zinc-100 text-zinc-600";
    if (status === "failed" || status === "timed_out") return "border-rose-200 bg-rose-50 text-rose-700";
    return "border-zinc-200 bg-white text-zinc-500";
  };
  const castRefreshPhaseStatusLabel = (status: CastRefreshPhaseState["status"]): string => {
    if (status === "timed_out") return "Timed Out";
    if (status === "running") return "Running";
    if (status === "completed") return "Completed";
    if (status === "failed") return "Failed";
    if (status === "skipped") return "Skipped";
    return "Pending";
  };

  const healthBadgeClassName = (status: HealthStatus): string => {
    if (status === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "stale") return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-rose-200 bg-rose-50 text-rose-700";
  };

  const showHealthStatus: HealthStatus = refreshingTargets.details
    ? "stale"
    : show.description || show.tmdb_id || show.imdb_id
      ? "ready"
      : "missing";
  const seasonsHealthStatus: HealthStatus = refreshingTargets.seasons_episodes
    ? "stale"
    : visibleSeasons.length > 0
      ? "ready"
      : "missing";
  const episodesHealthStatus: HealthStatus = refreshingTargets.seasons_episodes
    ? "stale"
    : syncedEpisodeCount > 0
      ? "ready"
      : "missing";
  const castHealthStatus: HealthStatus =
    refreshingTargets.cast_credits || castRefreshPipelineRunning || castMediaEnriching
    ? "stale"
    : cast.length > 0
      ? "ready"
      : "missing";
  const imageHealthStatus: HealthStatus = refreshingTargets.photos || galleryLoading
    ? "stale"
    : galleryAssets.length > 0
      ? "ready"
      : "missing";
  const videoHealthStatus: HealthStatus = bravoLoading
    ? "stale"
    : bravoVideos.length > 0
      ? "ready"
      : "missing";
  const newsHealthStatus: HealthStatus = newsLoading || newsSyncing
    ? "stale"
    : unifiedNews.length > 0
      ? "ready"
      : "missing";

  const contentHealthItems: Array<{
    key: string;
    label: string;
    countLabel: string;
    status: HealthStatus;
    onClick: () => void;
  }> = [
    {
      key: "show",
      label: "Show",
      countLabel: show.description?.trim() ? "Info set" : "Info missing",
      status: showHealthStatus,
      onClick: () => setTab("details"),
    },
    {
      key: "seasons",
      label: "Seasons",
      countLabel: `${visibleSeasons.length}`,
      status: seasonsHealthStatus,
      onClick: () => setTab("seasons"),
    },
    {
      key: "episodes",
      label: "Episodes",
      countLabel: `${syncedEpisodeCount}`,
      status: episodesHealthStatus,
      onClick: () => setTab("seasons"),
    },
    {
      key: "cast",
      label: "Cast",
      countLabel: `${cast.length}`,
      status: castHealthStatus,
      onClick: () => setTab("cast"),
    },
    {
      key: "images",
      label: "Images",
      countLabel: `${galleryAssets.length}`,
      status: imageHealthStatus,
      onClick: () => {
        setTab("assets");
        setAssetsSubTab("images");
      },
    },
    {
      key: "videos",
      label: "Videos",
      countLabel: `${bravoVideos.length}`,
      status: videoHealthStatus,
      onClick: () => {
        setTab("assets");
        setAssetsSubTab("videos");
      },
    },
    {
      key: "news",
      label: "News",
      countLabel: `${unifiedNews.length}`,
      status: newsHealthStatus,
      onClick: () => setTab("news"),
    },
  ];

  const operationsInboxItems: Array<{
    id: string;
    title: string;
    detail: string;
    onClick: () => void;
  }> = [];
  if (!canSyncByBravo) {
    operationsInboxItems.push({
      id: "bravo-readiness",
      title: "Sync prerequisites missing",
      detail:
        syncBravoReadinessMessage ??
        "Run Show Info, Seasons/Episodes, and Cast sync before Bravo import.",
      onClick: refreshAllShowData,
    });
  }
  if (galleryAssets.length === 0) {
    operationsInboxItems.push({
      id: "no-gallery-assets",
      title: "No gallery images imported",
      detail: "Import or sync images so show/season galleries can render.",
      onClick: () => {
        setTab("assets");
        setAssetsSubTab("images");
      },
    });
  }
  if (bravoVideos.length === 0) {
    operationsInboxItems.push({
      id: "no-bravo-videos",
      title: "No Bravo videos persisted",
      detail: "Run Sync by Bravo and verify the target season has watch/videos content.",
      onClick: () => {
        setTab("assets");
        setAssetsSubTab("videos");
      },
    });
  }
  if (newsGoogleUrlMissing) {
    operationsInboxItems.push({
      id: "google-news-url-missing",
      title: "Google News URL missing",
      detail: "Add Google News URL in Show Settings to enable Google sync in the News tab.",
      onClick: () => setTab("settings"),
    });
  }
  if (unifiedNews.length === 0) {
    operationsInboxItems.push({
      id: "no-unified-news",
      title: "No news persisted",
      detail: "Open News tab to sync Google + Bravo sources, then refresh if needed.",
      onClick: () => setTab("news"),
    });
  }
  if (cast.length === 0) {
    operationsInboxItems.push({
      id: "cast-missing",
      title: "Cast has no eligible members",
      detail:
        "Cast eligibility requires real episode evidence. Check episode credits sync and appearance types.",
      onClick: () => setTab("cast"),
    });
  }

  const socialHeaderHref = buildShowAdminUrl({
    showSlug: showSlugForRouting,
    tab: "social",
    socialView: socialAnalyticsView,
    socialRoute: {
      seasonNumber: getSocialSeasonNumberForRouting(),
      weekIndex: socialPathFilters?.weekIndex,
      platform: socialPathFilters?.platform ?? (socialPlatformTab !== "overview" ? socialPlatformTab : undefined),
      handle: socialPathFilters?.handle,
    },
  });
  const socialHeaderNetworkLabel = `${formatSocialAnalyticsViewLabel(socialAnalyticsView)} Analytics`;
  const headerBreadcrumbs =
    activeTab === "social"
      ? buildSeasonSocialBreadcrumb(show.name, selectedSocialSeason?.season_number ?? "", {
          showHref: buildShowAdminUrl({ showSlug: showSlugForRouting }),
          seasonHref: selectedSocialSeason
            ? buildSeasonAdminUrl({
                showSlug: showSlugForRouting,
                seasonNumber: selectedSocialSeason.season_number,
              })
            : buildShowAdminUrl({ showSlug: showSlugForRouting }),
          socialHref: socialHeaderHref,
          subTabLabel: socialHeaderNetworkLabel,
          subTabHref: socialHeaderHref,
        })
      : buildShowBreadcrumb(show.name, {
          showHref: buildShowAdminUrl({ showSlug: showSlugForRouting }),
        });

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        {/* Header */}
        <AdminGlobalHeader bodyClassName="px-6 py-5">
          <div className="mx-auto max-w-6xl">
            <AdminBreadcrumbs
              items={headerBreadcrumbs}
              className="mb-4"
            />
            <div className="mb-4">
              <Link
                href="/shows"
                className="text-sm text-zinc-500 hover:text-zinc-900"
              >
                ← Back to Shows
              </Link>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <NetworkNameOrLogo network={primaryNetwork} fallbackLabel={networkLabel} />
                <div className="mt-2 flex items-center gap-3">
                  <ShowNameOrLogo name={show.name} logoUrl={featuredHeaderLogoUrl} />
                  {/* TMDb and IMDb links */}
                  <div className="flex items-center gap-2">
                    <TmdbLinkIcon tmdbId={show.tmdb_id} type="show" />
                    <ImdbLinkIcon imdbId={show.imdb_id} type="title" />
                  </div>
                </div>
                {show.description && (
                  <p className="mt-2 max-w-2xl text-sm text-zinc-600">
                    {show.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {visibleSeasons.length > 0 && (
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                      {visibleSeasons.length} seasons
                    </span>
                  )}
                  {show.show_total_episodes && (
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                      {show.show_total_episodes} episodes
                    </span>
                  )}
                  {show.tmdb_status && (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        show.tmdb_status === "Returning Series"
                          ? "bg-green-100 text-green-700"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {show.tmdb_status}
                    </span>
                  )}
                </div>
              </div>
              {activeTab !== "social" && (
                <div className="flex flex-col gap-3 sm:items-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (isShowRefreshBusy) {
                        setRefreshLogOpen((prev) => !prev);
                        return;
                      }
                      void refreshAllShowData();
                    }}
                    className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                  >
                    {isShowRefreshBusy
                      ? `Refreshing... ${refreshLogOpen ? "(Hide Health)" : "(View Health)"}`
                      : "Refresh"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canSyncByBravo) {
                        setSyncBravoError(
                          syncBravoReadinessMessage ||
                            "Sync seasons, episodes, and cast first."
                        );
                        return;
                      }
                      setSyncBravoModePickerOpen(true);
                      setSyncBravoOpen(false);
                      setSyncBravoStep("preview");
                      setSyncBravoError(null);
                      setSyncBravoNotice(null);
                    }}
                    disabled={!canSyncByBravo || syncBravoLoading}
                    title={syncBravoReadinessMessage || undefined}
                    className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Sync by Bravo
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefreshLogOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                    title="Open Health Center"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M22 12h-4l-3 8-4-16-3 8H2" />
                    </svg>
                    Health
                  </button>
                  {syncBravoReadinessMessage && (
                    <p className="max-w-xs text-right text-[11px] text-amber-700">
                      {syncBravoReadinessMessage}
                    </p>
                  )}

                  {/* Ratings */}
                  {tmdbVoteAverageText && (
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-yellow-500">★</span>
                      <span className="font-semibold">
                        {tmdbVoteAverageText}
                      </span>
                      <span className="text-zinc-500">TMDB</span>
                    </div>
                  )}
                  {imdbRatingText && (
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-yellow-500">★</span>
                      <span className="font-semibold">
                        {imdbRatingText}
                      </span>
                      <span className="text-zinc-500">IMDB</span>
                    </div>
                  )}
                  {refreshAllNotice && (
                    <p className="max-w-xs text-right text-xs text-zinc-500">{refreshAllNotice}</p>
                  )}
                  {refreshAllError && (
                    <p className="max-w-xs text-right text-xs text-red-600">{refreshAllError}</p>
                  )}
                  {globalRefreshProgress && (
                    <div className="w-full max-w-xs">
                      <RefreshProgressBar
                        show={isShowRefreshBusy}
                        stage={globalRefreshStage}
                        message={globalRefreshMessage}
                        current={globalRefreshCurrent}
                        total={globalRefreshTotal}
                      />
                    </div>
                  )}
                  {refreshLogOpen && (
                    <div className="w-full max-w-xl rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Refresh Log
                      </p>
                      <button
                        type="button"
                        onClick={() => setRefreshLogOpen(false)}
                        className="text-xs font-semibold text-zinc-500 hover:text-zinc-800"
                      >
                        Close
                      </button>
                    </div>
                    {refreshLogEntries.length === 0 ? (
                      <p className="text-xs text-zinc-500">No refresh activity yet.</p>
                    ) : (
                      <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                        {refreshLogTopicGroups.map(({ topic, entries, entriesForView, latest, status }) => {
                          const latestParts = latest ? extractRefreshLogSubJob(latest) : null;
                          const latestPercent =
                            latest &&
                            typeof latest.current === "number" &&
                            typeof latest.total === "number" &&
                            latest.total > 0
                              ? Math.min(100, Math.round((latest.current / latest.total) * 100))
                              : null;

                          if (status === "done") {
                            return (
                              <article
                                key={topic.key}
                                className="rounded-lg border border-green-200 bg-green-50 px-3 py-2"
                              >
                                <p className="text-xs font-semibold text-green-800">
                                  {topic.label}: Done ✔️
                                </p>
                              </article>
                            );
                          }

                          return (
                            <article key={topic.key} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                                    {topic.label}
                                  </p>
                                  <p className="text-[11px] text-zinc-500">{topic.description}</p>
                                </div>
                                {latest && (
                                  <p className="text-[10px] text-zinc-400">
                                    {new Date(latest.at).toLocaleTimeString()}
                                  </p>
                                )}
                              </div>

                              {status === "failed" && (
                                <p className="mt-2 text-xs font-semibold text-red-700">
                                  {topic.label}: Failed ✖
                                </p>
                              )}

                              {latest ? (
                                <div className="mt-2 rounded-md border border-zinc-200 bg-white p-2">
                                  <p className="text-xs font-semibold text-zinc-800">{latestParts?.subJob}</p>
                                  <p className="mt-1 text-xs text-zinc-600">{latestParts?.details}</p>
                                  {typeof latest.current === "number" &&
                                    typeof latest.total === "number" && (
                                      <p className="mt-1 text-[11px] text-zinc-500">
                                        {latest.current.toLocaleString()}/{latest.total.toLocaleString()}
                                        {latestPercent !== null ? ` (${latestPercent}%)` : ""}
                                      </p>
                                    )}
                                </div>
                              ) : (
                                <p className="mt-2 text-xs text-zinc-500">No updates yet.</p>
                              )}

                              {entries.length > 0 && (
                                <details className="mt-2" open={entries.length <= 3}>
                                  <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                    Sub-jobs ({entries.length})
                                  </summary>
                                  <div className="mt-2 space-y-1">
                                    {entriesForView.slice(0, 30).map((entry) => {
                                      const parts = extractRefreshLogSubJob(entry);
                                      const percent =
                                        typeof entry.current === "number" &&
                                        typeof entry.total === "number" &&
                                        entry.total > 0
                                          ? Math.min(100, Math.round((entry.current / entry.total) * 100))
                                          : null;
                                      return (
                                        <div
                                          key={entry.id}
                                          className="rounded border border-zinc-100 bg-white px-2 py-1.5"
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <p className="text-[11px] font-semibold text-zinc-700">
                                              {parts.subJob}
                                            </p>
                                            <p className="text-[10px] text-zinc-400">
                                              {new Date(entry.at).toLocaleTimeString()}
                                            </p>
                                          </div>
                                          <p className="mt-0.5 text-[11px] text-zinc-600">{parts.details}</p>
                                          {typeof entry.current === "number" &&
                                            typeof entry.total === "number" && (
                                              <p className="mt-0.5 text-[10px] text-zinc-500">
                                                {entry.current.toLocaleString()}/{entry.total.toLocaleString()}
                                                {percent !== null ? ` (${percent}%)` : ""}
                                              </p>
                                            )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </details>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-4">
              <ShowTabsNav
                tabs={SHOW_PAGE_TABS}
                activeTab={activeTab}
                onSelect={setTab}
              />
              {activeTab === "social" && (
                <nav className="mt-3 flex flex-wrap gap-2">
                  {SHOW_SOCIAL_ANALYTICS_VIEWS.map((view) => (
                    <button
                      key={view.id}
                      onClick={() => setSocialAnalyticsView(view.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.08em] transition ${
                        socialAnalyticsView === view.id
                          ? "border-zinc-800 bg-zinc-800 text-white"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      {view.label}
                    </button>
                  ))}
                </nav>
              )}
              {activeTab === "assets" && (
                <nav className="mt-3 flex flex-wrap gap-2">
                  {SHOW_ASSET_SUB_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAssetsSubTab(tab.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.08em] transition ${
                        assetsView === tab.id
                          ? "border-zinc-800 bg-zinc-800 text-white"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              )}
            </div>
          </div>
        </AdminGlobalHeader>

        {/* Content */}
        <main className="mx-auto max-w-6xl px-6 py-8">
          {/* Seasons Tab */}
          {activeTab === "seasons" && (
            <ShowSeasonsTab
              showName={show.name}
              isShowRefreshBusy={isShowRefreshBusy}
              onRefresh={refreshAllShowData}
              refreshNotice={refreshTargetNotice.seasons_episodes ?? null}
              refreshError={refreshTargetError.seasons_episodes ?? null}
              refreshProgressBar={
                <RefreshProgressBar
                  show={refreshingTargets.seasons_episodes}
                  stage={refreshTargetProgress.seasons_episodes?.stage}
                  message={refreshTargetProgress.seasons_episodes?.message}
                  current={refreshTargetProgress.seasons_episodes?.current}
                  total={refreshTargetProgress.seasons_episodes?.total}
                />
              }
              seasonSummariesLoading={seasonSummariesLoading}
              seasons={visibleSeasons}
              seasonEpisodeSummaries={seasonEpisodeSummaries}
              openSeasonId={openSeasonId}
              onToggleSeason={(seasonId) =>
                setOpenSeasonId((prev) => (prev === seasonId ? null : seasonId))
              }
              seasonPageTabs={SEASON_PAGE_TABS}
              buildSeasonHref={(seasonNumber, tab) =>
                buildSeasonAdminUrl({
                  showSlug: showSlugForRouting,
                  seasonNumber,
                  tab,
                })
              }
              showTmdbId={show.tmdb_id}
              formatDateRange={formatDateRange}
            />
          )}

          {/* ASSETS Tab */}
          {activeTab === "assets" && (
            <ShowAssetsTab>
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                  {assetsView === "images" ? "Show Gallery" : assetsView === "videos" ? "Videos" : "Branding"}
                </p>
                <h3 className="text-xl font-bold text-zinc-900">{show.name}</h3>
                </div>

                <div />
              </div>

              {assetsView === "images" ? (
                <>
                  {/* Season filter and Import button */}
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium text-zinc-700">
                        Filter by season:
                      </label>
                      <select
                        value={selectedGallerySeason}
                        onChange={(e) =>
                          setSelectedGallerySeason(
                            e.target.value === "all" ? "all" : parseInt(e.target.value)
                          )
                        }
                        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
                      >
                        <option value="all">All Seasons</option>
                        {visibleSeasons.map((s) => (
                          <option key={s.id} value={s.season_number}>
                            Season {s.season_number}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={refreshAllShowData}
                        disabled={isShowRefreshBusy}
                        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v6h6M20 20v-6h-6M20 8a8 8 0 00-14-4M4 16a8 8 0 0014 4"
                          />
                        </svg>
                        {isShowRefreshBusy ? "Refreshing..." : "Refresh"}
                      </button>

                      <button
                        onClick={() => setAdvancedFiltersOpen(true)}
                        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M7 12h10M10 18h4" />
                        </svg>
                        Filters
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setGalleryAutoAdvanceMode((prev) =>
                            prev === "manual" ? "auto" : "manual"
                          )
                        }
                        className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                      >
                        Auto-Load: {galleryAutoAdvanceMode === "auto" ? "On" : "Off"}
                      </button>
                      {hasActiveAdvancedFilters && (
                        <button
                          type="button"
                          onClick={clearGalleryFilters}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          Clear Filters ({activeAdvancedFilterCount})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setBatchJobsError(null);
                          setBatchJobsNotice(null);
                          setBatchJobsOpen(true);
                        }}
                        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                      >
                        Batch Jobs
                      </button>

                      <button
                        onClick={() => {
                          if (selectedGallerySeason !== "all") {
                            const selectedSeason = visibleSeasons.find(
                              (season) => season.season_number === selectedGallerySeason
                            );
                            setScrapeDrawerContext({
                              type: "season",
                              showId: showId,
                              showName: show.name,
                              seasonNumber: selectedGallerySeason,
                              seasonId: selectedSeason?.id,
                            });
                          } else {
                            setScrapeDrawerContext({
                              type: "show",
                              showId: showId,
                              showName: show.name,
                              seasons: visibleSeasons.map((season) => ({
                                seasonNumber: season.season_number,
                                seasonId: season.id,
                              })),
                              defaultSeasonNumber: null,
                            });
                          }
                          setScrapeDrawerOpen(true);
                        }}
                        className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Import Images
                      </button>
                    </div>
                  </div>

                  {(refreshTargetNotice.photos || refreshTargetError.photos) && (
                    <p
                      className={`mb-4 text-sm ${
                        refreshTargetError.photos ? "text-red-600" : "text-zinc-500"
                      }`}
                    >
                      {refreshTargetError.photos || refreshTargetNotice.photos}
                    </p>
                  )}
                  <RefreshProgressBar
                    show={refreshingTargets.photos}
                    stage={refreshTargetProgress.photos?.stage}
                    message={refreshTargetProgress.photos?.message}
                    current={refreshTargetProgress.photos?.current}
                    total={refreshTargetProgress.photos?.total}
                  />
                  {(batchJobsNotice || batchJobsError) && (
                    <p className={`mb-4 text-sm ${batchJobsError ? "text-red-600" : "text-zinc-500"}`}>
                      {batchJobsError || batchJobsNotice}
                    </p>
                  )}
                  <RefreshProgressBar
                    show={batchJobsRunning}
                    stage={batchJobsProgress?.stage}
                    message={batchJobsProgress?.message}
                    current={batchJobsProgress?.current}
                    total={batchJobsProgress?.total}
                  />
                  {galleryTruncatedWarning && (
                    <p className="mb-4 text-xs font-medium text-amber-700">{galleryTruncatedWarning}</p>
                  )}
                  <p className="mb-4 text-xs text-zinc-500">
                    Fallback diagnostics: {galleryFallbackTelemetry.fallbackRecoveredCount} recovered,{" "}
                    {galleryFallbackTelemetry.allCandidatesFailedCount} failed,{" "}
                    {galleryFallbackTelemetry.totalImageAttempts} attempted. Mirrored URL usage:{" "}
                    {galleryMirrorTelemetry.mirroredCount}/{galleryMirrorTelemetry.totalCount} (
                    {Math.round(galleryMirrorTelemetry.mirroredRatio * 100)}%).
                  </p>

                  {galleryLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-blue-500" />
                    </div>
                  ) : filteredGalleryAssets.length === 0 ? (
                    <p className="py-8 text-center text-zinc-500">
                      No images found for this selection.
                    </p>
                  ) : (
                    <div className="space-y-8">
                      <ShowAssetsImageSections
                        backdrops={gallerySectionAssets.backdrops}
                        banners={gallerySectionAssets.banners}
                        posters={gallerySectionAssets.posters}
                        featuredBackdropImageId={show.primary_backdrop_image_id}
                        featuredPosterImageId={show.primary_poster_image_id}
                        autoAdvanceMode={galleryAutoAdvanceMode}
                        hasMoreBackdrops={Boolean(gallerySectionAssets.hasMoreBySection.backdrops)}
                        hasMoreBanners={Boolean(gallerySectionAssets.hasMoreBySection.banners)}
                        hasMorePosters={Boolean(gallerySectionAssets.hasMoreBySection.posters)}
                        onLoadMoreBackdrops={() => increaseGallerySectionVisible("backdrops")}
                        onLoadMoreBanners={() => increaseGallerySectionVisible("banners")}
                        onLoadMorePosters={() => increaseGallerySectionVisible("posters")}
                        onOpenAssetLightbox={openAssetLightbox}
                        renderGalleryImage={({ asset, alt, sizes, className }) => (
                          <GalleryImage
                            src={getAssetDisplayUrl(asset)}
                            srcCandidates={getSeasonAssetCardUrlCandidates(asset)}
                            diagnosticKey={`${asset.origin_table || "unknown"}:${asset.id}`}
                            onFallbackEvent={trackGalleryFallbackEvent}
                            alt={alt}
                            sizes={sizes}
                            className={className}
                          />
                        )}
                      />

                      {/* Profile Pictures */}
                      {gallerySectionAssets.profile_pictures.length > 0 && (
                        <section>
                          <h4 className="mb-3 text-sm font-semibold text-zinc-900">
                            Profile Pictures
                          </h4>
                          <div className="grid grid-cols-5 gap-4">
                            {gallerySectionAssets.profile_pictures.map((asset, i, arr) => (
                                <button
                                  key={asset.id}
                                  onClick={(e) =>
                                    openAssetLightbox(asset, i, arr, e.currentTarget)
                                  }
                                  className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <GalleryImage
                                    src={getAssetDisplayUrl(asset)}
                                    srcCandidates={getSeasonAssetCardUrlCandidates(asset)}
                                    diagnosticKey={`${asset.origin_table || "unknown"}:${asset.id}`}
                                    onFallbackEvent={trackGalleryFallbackEvent}
                                    alt={asset.caption || "Profile picture"}
                                    sizes="180px"
                                  />
                                  {asset.person_name && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                      <p className="truncate text-xs text-white">
                                        {asset.person_name}
                                      </p>
                                    </div>
                                  )}
                                </button>
                              ))}
                          </div>
                          {gallerySectionAssets.hasMoreBySection.profile_pictures && (
                            <div className="mt-3 flex justify-center">
                              <button
                                type="button"
                                onClick={() => increaseGallerySectionVisible("profile_pictures")}
                                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                              >
                                Load More Profile Pictures
                              </button>
                            </div>
                          )}
                        </section>
                      )}

                      {/* Cast Photos (official season announcement only) */}
                      {gallerySectionAssets.cast_photos.length > 0 && (
                        <section>
                          <h4 className="mb-3 text-sm font-semibold text-zinc-900">
                            Cast Promos
                          </h4>
                          <div className="grid grid-cols-5 gap-4">
                            {gallerySectionAssets.cast_photos.map((asset, i, arr) => (
                                <button
                                  key={asset.id}
                                  onClick={(e) =>
                                    openAssetLightbox(asset, i, arr, e.currentTarget)
                                  }
                                  className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <GalleryImage
                                    src={getAssetDisplayUrl(asset)}
                                    srcCandidates={getSeasonAssetCardUrlCandidates(asset)}
                                    diagnosticKey={`${asset.origin_table || "unknown"}:${asset.id}`}
                                    onFallbackEvent={trackGalleryFallbackEvent}
                                    alt={asset.caption || "Cast photo"}
                                    sizes="180px"
                                  />
                                  {asset.person_name && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                      <p className="truncate text-xs text-white">
                                        {asset.person_name}
                                      </p>
                                    </div>
                                  )}
                                </button>
                              ))}
                          </div>
                          {gallerySectionAssets.hasMoreBySection.cast_photos && (
                            <div className="mt-3 flex justify-center">
                              <button
                                type="button"
                                onClick={() => increaseGallerySectionVisible("cast_photos")}
                                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                              >
                                Load More Cast Promos
                              </button>
                            </div>
                          )}
                        </section>
                      )}

                    </div>
                  )}
                </>
              ) : assetsView === "videos" ? (
                <div className="space-y-4">
                  {(bravoError || bravoLoading) && (
                    <p className={`text-sm ${bravoError ? "text-red-600" : "text-zinc-500"}`}>
                      {bravoError || "Loading Bravo videos..."}
                    </p>
                  )}
                  {bravoVideoSyncing && (
                    <p className="text-sm text-zinc-500">Syncing high-quality video thumbnails...</p>
                  )}
                  {bravoVideoSyncWarning && !bravoError && (
                    <p className="text-sm text-amber-700">{bravoVideoSyncWarning}</p>
                  )}
                  {!bravoLoading && bravoVideos.length === 0 && !bravoError && (
                    <p className="text-sm text-zinc-500">No persisted Bravo videos found for this show.</p>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {bravoVideos.map((video) => {
                      const thumbnailUrl = resolveBravoVideoThumbnailUrl(video);
                      return (
                      <article key={`${video.clip_url}-${video.published_at ?? "unknown"}`} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                        <a
                          href={video.clip_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group block"
                        >
                          <div className="relative mb-3 aspect-video overflow-hidden rounded-lg bg-zinc-200">
                            {thumbnailUrl ? (
                              <GalleryImage
                                src={thumbnailUrl}
                                alt={video.title || "Bravo video"}
                                sizes="400px"
                                className="object-cover transition group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-zinc-400">No image</div>
                            )}
                          </div>
                          <h4 className="text-sm font-semibold text-zinc-900 group-hover:text-blue-700">
                            {video.title || "Untitled video"}
                          </h4>
                        </a>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                          {video.runtime && <span>{video.runtime}</span>}
                          {typeof video.season_number === "number" && <span>Season {video.season_number}</span>}
                          {video.kicker && <span>{video.kicker}</span>}
                          {formatBravoPublishedDate(video.published_at) && (
                            <span>Posted {formatBravoPublishedDate(video.published_at)}</span>
                          )}
                        </div>
                      </article>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Featured Images</h4>
                    <ShowFeaturedMediaSelectors
                      posterAssets={featuredPosterCandidates}
                      backdropAssets={featuredBackdropCandidates}
                      featuredPosterImageId={show.primary_poster_image_id}
                      featuredBackdropImageId={show.primary_backdrop_image_id}
                      getAssetDisplayUrl={getAssetDisplayUrl}
                      onSetFeaturedPoster={(showImageId) => {
                        void setFeaturedShowImage("poster", showImageId);
                      }}
                      onSetFeaturedBackdrop={(showImageId) => {
                        void setFeaturedShowImage("backdrop", showImageId);
                      }}
                    />
                  </section>

                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Logos</h4>
                    <ShowBrandLogosSection
                      logoAssets={brandLogoAssets}
                      featuredLogoAssetId={featuredShowLogoAssetId}
                      featuredLogoSavingAssetId={featuredLogoSavingAssetId}
                      selectedFeaturedLogoVariant={featuredLogoVariant}
                      getAssetDisplayUrl={getAssetDisplayUrl}
                      onOpenAssetLightbox={openAssetLightbox}
                      onSelectFeaturedLogoVariant={selectFeaturedLogoVariant}
                      onSetFeaturedLogo={(asset) => {
                        void setFeaturedShowLogo(asset);
                      }}
                    />
                  </section>

                  <ShowBrandEditor
                    trrShowId={showId}
                    trrShowName={show.name}
                    trrSeasons={seasons}
                    trrCast={cast}
                  />
                </div>
              )}
            </div>
            </ShowAssetsTab>
          )}

          {/* NEWS Tab */}
          {activeTab === "news" && (
            <ShowNewsTab
              showName={show.name}
              newsSort={newsSort}
              onSetNewsSort={setNewsSort}
              onRefreshNews={() => void loadUnifiedNews({ force: true, forceSync: true })}
              newsLoading={newsLoading}
              newsSyncing={newsSyncing}
              newsSourceFilter={newsSourceFilter}
              onSetNewsSourceFilter={setNewsSourceFilter}
              newsPersonFilter={newsPersonFilter}
              onSetNewsPersonFilter={setNewsPersonFilter}
              newsTopicFilter={newsTopicFilter}
              onSetNewsTopicFilter={setNewsTopicFilter}
              newsSeasonFilter={newsSeasonFilter}
              onSetNewsSeasonFilter={setNewsSeasonFilter}
              onClearFilters={() => {
                setNewsSourceFilter("");
                setNewsPersonFilter("");
                setNewsTopicFilter("");
                setNewsSeasonFilter("");
              }}
              newsSourceOptions={newsSourceOptions}
              newsPeopleOptions={newsPeopleOptions}
              newsTopicOptions={newsTopicOptions}
              newsSeasonOptions={newsSeasonOptions}
              newsPageCount={newsPageCount}
              newsTotalCount={newsTotalCount}
              newsError={newsError}
              newsNotice={newsNotice}
              newsGoogleUrlMissing={newsGoogleUrlMissing}
              unifiedNews={unifiedNews}
              formatPublishedDate={formatBravoPublishedDate}
              newsNextCursor={newsNextCursor}
              onLoadMore={() => void loadUnifiedNews({ append: true })}
              renderNewsImage={({ src, alt, sizes, className }) => (
                <GalleryImage
                  src={src}
                  alt={alt}
                  sizes={sizes}
                  className={className}
                />
              )}
            />
          )}

          {/* Cast Tab */}
          {activeTab === "cast" && (
            <ShowCastTab>
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Cast Members
                  </p>
                  <h3 className="text-xl font-bold text-zinc-900">
                    {show.name}
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                    {renderedCastCount}/{matchedCastCount}/{totalCastCount} cast ·{" "}
                    {renderedCrewCount}/{matchedCrewCount}/{totalCrewCount} crew ·{" "}
                    {renderedVisibleCount}/{matchedVisibleCount}/{totalVisibleCount} visible
                  </span>
                  <button
                    type="button"
                    onClick={() => void enrichCastMedia()}
                    disabled={isCastRefreshBusy}
                    title={isCastRefreshBusy ? "Cast sync in progress" : undefined}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {castMediaEnriching ? "Enriching..." : "Enrich Media"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void enrichMissingCastPhotos()}
                    disabled={isCastRefreshBusy || castPhotoEnriching || castLoading || missingCastPhotoCount <= 0}
                    title={isCastRefreshBusy ? "Cast sync in progress" : undefined}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {castPhotoEnriching
                      ? "Enriching..."
                      : `Enrich Missing Cast Photos${missingCastPhotoCount > 0 ? ` (${missingCastPhotoCount})` : ""}`}
                  </button>
                  <button
                    type="button"
                    onClick={refreshShowCast}
                    disabled={isCastRefreshBusy}
                    title={isCastRefreshBusy ? "Cast sync in progress" : undefined}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {castRefreshButtonLabel}
                  </button>
                  {(castRefreshPipelineRunning || castMediaEnriching || hasPersonRefreshInFlight) && (
                    <button
                      type="button"
                      onClick={cancelShowCastWorkflow}
                      className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
              {(refreshTargetNotice.cast_credits ||
                refreshTargetError.cast_credits) && (
                <p
                  className={`mb-4 text-sm ${
                    refreshTargetError.cast_credits ? "text-red-600" : "text-zinc-500"
                  }`}
                >
                  {refreshTargetError.cast_credits ||
                    refreshTargetNotice.cast_credits}
                </p>
              )}
              {(castRefreshPipelineRunning || castRefreshPhaseStates.length > 0) && (
                <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Cast Refresh Pipeline
                    </p>
                    {castRefreshPipelineRunning && (
                      <p className="text-[11px] text-zinc-500">Fail-fast timeout policy enabled</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    {castRefreshPhasePanelStates.map((phase, index) => (
                      <div
                        key={`cast-refresh-phase-${phase.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-800">
                            {index + 1}. {CAST_REFRESH_PHASE_STAGES[phase.id] ?? phase.label}
                          </p>
                          {(phase.status === "running" ||
                            phase.status === "failed" ||
                            phase.status === "timed_out") &&
                            phase.progress.message && (
                              <p className="truncate text-xs text-zinc-500">{phase.progress.message}</p>
                            )}
                        </div>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${castRefreshPhaseStatusChipClassName(
                            phase.status
                          )}`}
                        >
                          {castRefreshPhaseStatusLabel(phase.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <RefreshProgressBar
                show={showCastTabProgress}
                stage={castTabProgress?.stage}
                message={castTabProgress?.message}
                current={castTabProgress?.current}
                total={castTabProgress?.total}
              />
              {(refreshNotice || refreshError) && (
                <p className={`mb-4 text-sm ${refreshError ? "text-red-600" : "text-zinc-500"}`}>
                  {refreshError || refreshNotice}
                </p>
              )}
              {(castPhotoEnrichNotice || castPhotoEnrichError) && (
                <p className={`mb-4 text-sm ${castPhotoEnrichError ? "text-red-600" : "text-zinc-500"}`}>
                  {castPhotoEnrichError || castPhotoEnrichNotice}
                </p>
              )}
              {(castMediaEnrichNotice || castMediaEnrichError) && (
                <p className={`mb-4 text-sm ${castMediaEnrichError ? "text-red-600" : "text-zinc-500"}`}>
                  {castMediaEnrichError || castMediaEnrichNotice}
                </p>
              )}
              {castLoadWarning && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <span>{castLoadWarning}</span>
                  <button
                    type="button"
                    onClick={() => void fetchCast({ throwOnError: false })}
                    className="rounded-full border border-amber-400 bg-white px-3 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
                  >
                    Retry Cast
                  </button>
                </div>
              )}
              {castLoadError && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  <span>{castLoadError}</span>
                  <button
                    type="button"
                    onClick={() => void fetchCast({ throwOnError: false })}
                    className="rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    Retry Cast
                  </button>
                </div>
              )}
              {castRoleMembersWarningWithSnapshotAge && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <span>{castRoleMembersWarningWithSnapshotAge}</span>
                  <button
                    type="button"
                    onClick={() => void fetchCastRoleMembers({ force: true })}
                    className="rounded-full border border-amber-400 bg-white px-3 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
                  >
                    Retry
                  </button>
                </div>
              )}
              {rolesWarningWithSnapshotAge && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <span>{rolesWarningWithSnapshotAge}</span>
                  <button
                    type="button"
                    onClick={() => void fetchShowRoles({ force: true })}
                    className="rounded-full border border-amber-400 bg-white px-3 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
                  >
                    Retry Roles
                  </button>
                </div>
              )}
              {showCastIntelligenceUnavailable && (
                <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                  <p className="font-semibold">
                    Cast intelligence unavailable; showing base cast snapshot.
                  </p>
                  {(castRoleMembersError || rolesError) && (
                    <p className="mt-1 text-xs">
                      {[castRoleMembersError, rolesError].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void fetchCastRoleMembers({ force: true })}
                      className="rounded-full border border-amber-400 bg-white px-3 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
                    >
                      Retry Cast Intelligence
                    </button>
                    <button
                      type="button"
                      onClick={() => void fetchShowRoles({ force: true })}
                      className="rounded-full border border-amber-400 bg-white px-3 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
                    >
                      Retry Roles
                    </button>
                  </div>
                </div>
              )}
              {castRoleEditorDeepLinkWarning && (
                <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {castRoleEditorDeepLinkWarning}
                </div>
              )}
              {castSource === "show_fallback" && castEligibilityWarning && (
                <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {castEligibilityWarning}
                </div>
              )}
              {castRunFailedMembers.length > 0 && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-amber-900">
                      Failed Members ({castRunFailedMembers.length})
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCastFailedMembersOpen((prev) => !prev)}
                        className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                      >
                        {castFailedMembersOpen ? "Hide" : "Show"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void retryFailedCastMediaEnrich()}
                        disabled={isCastRefreshBusy}
                        className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                      >
                        Retry failed only
                      </button>
                    </div>
                  </div>
                  {castFailedMembersOpen && (
                    <ul className="mt-3 space-y-2 text-xs text-amber-900">
                      {castRunFailedMembers.map((member) => (
                        <li
                          key={`${member.personId}-${member.name}-${member.reason}`}
                          className="rounded-md border border-amber-200 bg-white px-2 py-1"
                        >
                          <span className="font-semibold">{member.name}</span>: {member.reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <CastMatrixSyncPanel
                loading={castMatrixSyncLoading}
                error={castMatrixSyncError}
                result={castMatrixSyncResult}
                scopeLabel={castMatrixSyncScopeLabel}
                onSync={() => void syncCastMatrixRoles()}
              />

              <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="grid gap-3 md:grid-cols-5">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 md:col-span-2">
                    Search Name
                    <input
                      value={castSearchQuery}
                      onChange={(event) => setCastSearchQuery(event.target.value)}
                      placeholder="Search cast or crew..."
                      className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm font-medium normal-case tracking-normal text-zinc-700"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Sort By
                    <select
                      value={castSortBy}
                      onChange={(event) =>
                        setCastSortBy(event.target.value as "episodes" | "season" | "name")
                      }
                      className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm font-medium normal-case tracking-normal text-zinc-700"
                    >
                      <option value="episodes">Episodes</option>
                      <option value="season">Season Recency</option>
                      <option value="name">Name</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Order
                    <select
                      value={castSortOrder}
                      onChange={(event) => setCastSortOrder(event.target.value as "desc" | "asc")}
                      className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm font-medium normal-case tracking-normal text-zinc-700"
                    >
                      <option value="desc">Desc</option>
                      <option value="asc">Asc</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Has Image
                    <select
                      value={castHasImageFilter}
                      onChange={(event) =>
                        setCastHasImageFilter(event.target.value as "all" | "yes" | "no")
                      }
                      className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm font-medium normal-case tracking-normal text-zinc-700"
                    >
                      <option value="all">All</option>
                      <option value="yes">With Image</option>
                      <option value="no">Without Image</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCastSeasonFilters([]);
                      setCastRoleAndCreditFilters([]);
                      setCastHasImageFilter("all");
                      setCastSortBy("episodes");
                      setCastSortOrder("desc");
                      setCastSearchQuery("");
                    }}
                    className="self-end rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
                  >
                    Clear Filters
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Seasons
                    </span>
                    {availableCastSeasons.length === 0 ? (
                      <span className="text-xs text-zinc-500">No season recency data yet.</span>
                    ) : (
                      availableCastSeasons.map((seasonNumber) => {
                        const active = castSeasonFilters.includes(seasonNumber);
                        return (
                          <button
                            key={`season-filter-${seasonNumber}`}
                            type="button"
                            aria-pressed={active}
                            onClick={() =>
                              setCastSeasonFilters((prev) =>
                                prev.includes(seasonNumber)
                                  ? prev.filter((value) => value !== seasonNumber)
                                  : [...prev, seasonNumber]
                              )
                            }
                            className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                              active
                                ? "border-zinc-900 bg-zinc-900 text-white"
                                : "border-zinc-200 bg-white text-zinc-600"
                            }`}
                          >
                            S{seasonNumber}
                          </button>
                        );
                      })
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Season filters use season-scoped role assignments plus global season-0 roles.{" "}
                    {castEpisodeScopeLabel}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Roles & Credit
                    </span>
                    {shouldShowRoleCreditEmptyState ? (
                      <span className="text-xs text-zinc-500">No role or credit filters available.</span>
                    ) : !castUiTerminalReady ? (
                      <span className="text-xs text-zinc-500">Loading role and credit filters...</span>
                    ) : (
                      availableCastRoleAndCreditFilters.map((option) => {
                        const active = castRoleAndCreditFilters.includes(option.key);
                        return (
                          <button
                            key={`role-credit-filter-${option.key}`}
                            type="button"
                            aria-pressed={active}
                            onClick={() =>
                              setCastRoleAndCreditFilters((prev) =>
                                active ? prev.filter((value) => value !== option.key) : [...prev, option.key]
                              )
                            }
                            className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                              active
                                ? "border-zinc-900 bg-zinc-900 text-white"
                                : "border-zinc-200 bg-white text-zinc-600"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
              {castRoleMembersLoading && (
                <p className="mb-4 text-sm text-zinc-500" aria-live="polite">
                  Refreshing cast intelligence...
                </p>
              )}
              {castLoading && !castLoadedOnce && (
                <p className="mb-4 text-sm text-zinc-500" aria-live="polite">
                  Loading cast members...
                </p>
              )}
              {castLoading && castLoadedOnce && cast.length === 0 && (
                <p className="mb-4 text-sm text-zinc-500" aria-live="polite">
                  Cast list unavailable; retrying cast roster...
                </p>
              )}
              {castRenderProgressLabel && (
                <p className="mb-3 text-xs text-zinc-500" role="status" aria-live="polite">
                  {castRenderProgressLabel}
                </p>
              )}
              <div className="space-y-8">
                <section>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                    Cast
                  </p>
                  {castGalleryMembers.length === 0 ? (
                    castUiTerminalReady ? (
                      <p className="text-sm text-zinc-500">No cast members match the selected filters.</p>
                    ) : (
                      <p className="text-sm text-zinc-500">Loading cast roster...</p>
                    )
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {visibleCastGalleryMembers.map((member) => {
                        const thumbnailUrl = member.merged_photo_url;
                        const episodeLabel =
                          typeof member.total_episodes === "number"
                            ? `${member.total_episodes} episodes`
                            : null;

                        return (
                          <div
                            key={member.id}
                            className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 transition hover:border-zinc-300 hover:bg-zinc-100/50"
                          >
                            <Link
                              href={buildPersonAdminUrl({
                                showSlug: showSlugForRouting,
                                personSlug: buildPersonRouteSlug({
                                  personName: member.full_name || member.cast_member_name || null,
                                  personId: member.person_id,
                                }),
                                tab: "overview",
                              }) as Route}
                              className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                            >
                            <div className="relative mb-3 aspect-[4/5] overflow-hidden rounded-lg bg-zinc-200">
                              {thumbnailUrl ? (
                                <CastPhoto
                                  src={thumbnailUrl}
                                  alt={member.full_name || member.cast_member_name || "Cast member"}
                                  thumbnail_focus_x={member.thumbnail_focus_x}
                                  thumbnail_focus_y={member.thumbnail_focus_y}
                                  thumbnail_zoom={member.thumbnail_zoom}
                                  thumbnail_crop_mode={member.thumbnail_crop_mode}
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-zinc-400">
                                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                                    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <p className="font-semibold text-zinc-900">
                              {member.full_name || member.cast_member_name || "Unknown"}
                            </p>
                            {episodeLabel && <p className="text-sm text-zinc-600">{episodeLabel}</p>}
                            {member.latest_season && (
                              <p className="text-xs text-zinc-500">Latest season: {member.latest_season}</p>
                            )}
                            {member.roles.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {member.roles.map((role) => (
                                  <span
                                    key={`${member.person_id}-${role}`}
                                    className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-700"
                                  >
                                    {role}
                                  </span>
                                ))}
                              </div>
                            )}
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                handleRefreshCastMember(
                                  member.person_id,
                                  member.full_name || member.cast_member_name || "Cast member"
                                );
                              }}
                              disabled={castAnyJobRunning || Boolean(refreshingPersonIds[member.person_id])}
                              title={castAnyJobRunning ? "Cast sync in progress" : undefined}
                              className="mt-3 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50"
                            >
                              {refreshingPersonIds[member.person_id]
                                ? "Refreshing..."
                                : "Refresh Person"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                openCastRoleEditor(
                                  member.person_id,
                                  member.full_name || member.cast_member_name || "Cast member"
                                );
                              }}
                              disabled={castAnyJobRunning}
                              title={castAnyJobRunning ? "Cast sync in progress" : undefined}
                              className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50"
                            >
                              Edit Roles
                            </button>
                            <RefreshProgressBar
                              show={Boolean(refreshingPersonIds[member.person_id])}
                              stage={refreshingPersonProgress[member.person_id]?.stage}
                              message={refreshingPersonProgress[member.person_id]?.message}
                              current={refreshingPersonProgress[member.person_id]?.current}
                              total={refreshingPersonProgress[member.person_id]?.total}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {crewGalleryMembers.length > 0 && (
                  <section>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Crew
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {visibleCrewGalleryMembers.map((member) => {
                        const thumbnailUrl = member.merged_photo_url;
                        const episodeLabel =
                          typeof member.total_episodes === "number"
                            ? `${member.total_episodes} episodes`
                            : null;
                        return (
                          <div
                            key={`crew-${member.id}`}
                            className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 transition hover:border-blue-300 hover:bg-blue-100/40"
                          >
                            <Link
                              href={buildPersonAdminUrl({
                                showSlug: showSlugForRouting,
                                personSlug: buildPersonRouteSlug({
                                  personName: member.full_name || member.cast_member_name || null,
                                  personId: member.person_id,
                                }),
                                tab: "overview",
                              }) as Route}
                              className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                            >
                            <div className="relative mb-3 aspect-[4/5] overflow-hidden rounded-lg bg-zinc-200">
                              {thumbnailUrl ? (
                                <CastPhoto
                                  src={thumbnailUrl}
                                  alt={member.full_name || member.cast_member_name || "Crew member"}
                                  thumbnail_focus_x={member.thumbnail_focus_x}
                                  thumbnail_focus_y={member.thumbnail_focus_y}
                                  thumbnail_zoom={member.thumbnail_zoom}
                                  thumbnail_crop_mode={member.thumbnail_crop_mode}
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-zinc-400">
                                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                                    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <p className="font-semibold text-zinc-900">
                              {member.full_name || member.cast_member_name || "Unknown"}
                            </p>
                            {member.credit_category && (
                              <p className="text-sm text-blue-700">{member.credit_category}</p>
                            )}
                            {episodeLabel && <p className="text-xs text-zinc-600">{episodeLabel}</p>}
                            {member.roles.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {member.roles.map((role) => (
                                  <span
                                    key={`crew-${member.person_id}-${role}`}
                                    className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-blue-700"
                                  >
                                    {role}
                                  </span>
                                ))}
                              </div>
                            )}
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                handleRefreshCastMember(
                                  member.person_id,
                                  member.full_name || member.cast_member_name || "Crew member"
                                );
                              }}
                              disabled={castAnyJobRunning || Boolean(refreshingPersonIds[member.person_id])}
                              title={castAnyJobRunning ? "Cast sync in progress" : undefined}
                              className="mt-3 w-full rounded-md border border-blue-200 bg-white px-2 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
                            >
                              {refreshingPersonIds[member.person_id] ? "Refreshing..." : "Refresh Person"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                openCastRoleEditor(
                                  member.person_id,
                                  member.full_name || member.cast_member_name || "Crew member"
                                );
                              }}
                              disabled={castAnyJobRunning}
                              title={castAnyJobRunning ? "Cast sync in progress" : undefined}
                              className="mt-2 w-full rounded-md border border-blue-200 bg-white px-2 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
                            >
                              Edit Roles
                            </button>
                            <RefreshProgressBar
                              show={Boolean(refreshingPersonIds[member.person_id])}
                              stage={refreshingPersonProgress[member.person_id]?.stage}
                              message={refreshingPersonProgress[member.person_id]?.message}
                              current={refreshingPersonProgress[member.person_id]?.current}
                              total={refreshingPersonProgress[member.person_id]?.total}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {archiveFootageCast.length > 0 && (
                  <section>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Archive Footage
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {archiveFootageCast.map((member) => {
                        const thumbnailUrl = member.cover_photo_url || member.photo_url;
                        const archiveLabel =
                          typeof member.archive_episode_count === "number"
                            ? `${member.archive_episode_count} archive footage episodes`
                            : "Archive footage appearance";

                        return (
                          <Link
                            key={`archive-${member.id}`}
                            href={buildPersonAdminUrl({
                              showSlug: showSlugForRouting,
                              personSlug: buildPersonRouteSlug({
                                personName: member.full_name || member.cast_member_name || null,
                                personId: member.person_id,
                              }),
                              tab: "overview",
                            }) as Route}
                            className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 transition hover:border-amber-300 hover:bg-amber-100/40"
                          >
                            <div className="relative mb-3 aspect-[4/5] overflow-hidden rounded-lg bg-zinc-200">
                              {thumbnailUrl ? (
                                <CastPhoto
                                  src={thumbnailUrl}
                                  alt={member.full_name || member.cast_member_name || "Cast member"}
                                  thumbnail_focus_x={member.thumbnail_focus_x}
                                  thumbnail_focus_y={member.thumbnail_focus_y}
                                  thumbnail_zoom={member.thumbnail_zoom}
                                  thumbnail_crop_mode={member.thumbnail_crop_mode}
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-zinc-400">
                                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                                    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <p className="font-semibold text-zinc-900">
                              {member.full_name || member.cast_member_name || "Unknown"}
                            </p>
                            <p className="text-sm text-amber-700">{archiveLabel}</p>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                )}

                {castUiTerminalReady &&
                  castGalleryMembers.length === 0 &&
                  crewGalleryMembers.length === 0 &&
                  cast.length > 0 && (
                  <p className="text-sm text-zinc-500">No cast members match the selected filters.</p>
                )}

                {castUiTerminalReady && cast.length === 0 && archiveFootageCast.length === 0 && (
                  <p className="text-sm text-zinc-500">
                    No cast members found for this show.
                  </p>
                )}
              </div>
            </div>
            </ShowCastTab>
          )}

          {/* Surveys Tab */}
          {activeTab === "surveys" && (
            <section
              id="show-tabpanel-surveys"
              role="tabpanel"
              aria-labelledby="show-tab-surveys"
            >
              <ShowSurveysTab
                showId={showId}
                showName={show.name}
                totalSeasons={visibleSeasons.length || show.show_total_seasons || null}
              />
            </section>
          )}

          {/* Social Media Tab */}
          {activeTab === "social" && (
            <ShowSocialTab
              socialDependencyError={socialDependencyError}
              selectedSocialSeason={selectedSocialSeason}
              socialPlatformTab={socialPlatformTab}
              isRedditView={socialAnalyticsView === "reddit"}
              onSelectSocialPlatformTab={setSocialPlatformTab}
              socialPlatformOptions={SHOW_SOCIAL_PLATFORM_TABS}
              socialSeasonOptions={socialSeasonOptions}
              selectedSocialSeasonId={selectedSocialSeasonId}
              onSelectSocialSeasonId={setSelectedSocialSeasonId}
              analyticsSection={
                selectedSocialSeason ? (
                  <SeasonSocialAnalyticsSection
                    showId={showId}
                    showSlug={showSlugForRouting}
                    seasonNumber={selectedSocialSeason.season_number}
                    seasonId={selectedSocialSeason.id}
                    showName={show.name}
                    platformTab={socialPlatformTab}
                    onPlatformTabChange={setSocialPlatformTab}
                    hidePlatformTabs={true}
                    analyticsView={socialAnalyticsView}
                  />
                ) : null
              }
              fallbackSection={
                <SocialPostsSection
                  showId={showId}
                  showName={show.name}
                  seasonId={selectedSocialSeasonId}
                />
              }
            />
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <ShowSettingsTab>
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Show Settings
                  </p>
                  <h3 className="text-xl font-bold text-zinc-900">
                    Links and Cast Role Catalog
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={refreshAllShowData}
                  disabled={isShowRefreshBusy}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                >
                  {isShowRefreshBusy ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              {(linksError || linksNotice || rolesError || rolesWarning || googleNewsError || googleNewsNotice) && (
                <p
                  className={`mb-4 text-sm ${
                    linksError || rolesError || googleNewsError ? "text-red-600" : "text-zinc-500"
                  }`}
                >
                  {linksError ||
                    rolesError ||
                    googleNewsError ||
                    rolesWarning ||
                    linksNotice ||
                    googleNewsNotice}
                </p>
              )}

              <div className="space-y-6">
                <section>
                  <h4 className="mb-3 text-sm font-semibold text-zinc-700">Google News Feed</h4>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <p className="mb-2 text-xs text-zinc-500">
                      Configure the show-level Google News topic URL used by auto-sync in the News tab.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        value={googleNewsUrl}
                        onChange={(event) => setGoogleNewsUrl(event.target.value)}
                        placeholder="https://news.google.com/topics/..."
                        className="min-w-[320px] flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700"
                      />
                      <button
                        type="button"
                        onClick={() => void saveGoogleNewsLink()}
                        disabled={googleNewsSaving}
                        className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50"
                      >
                        {googleNewsSaving ? "Saving..." : "Save URL"}
                      </button>
                    </div>
                    {(googleNewsError || googleNewsNotice) && (
                      <p className={`mt-2 text-sm ${googleNewsError ? "text-red-600" : "text-zinc-500"}`}>
                        {googleNewsError || googleNewsNotice}
                      </p>
                    )}
                    {googleNewsLinkId && (
                      <p className="mt-2 text-xs text-zinc-500">Linked as `google_news_url` (show-level).</p>
                    )}
                  </div>
                </section>

                <section>
                  <h4 className="mb-3 text-sm font-semibold text-zinc-700">Role Catalog</h4>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <input
                        value={newRoleName}
                        onChange={(event) => setNewRoleName(event.target.value)}
                        placeholder="Housewife"
                        className="min-w-[220px] flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700"
                      />
                      <button
                        type="button"
                        onClick={createShowRole}
                        disabled={rolesLoading}
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                      >
                        Add Role
                      </button>
                    </div>
                    {showRoles.length === 0 ? (
                      <p className="text-sm text-zinc-500">No roles configured yet.</p>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        {showRoles.map((role) => (
                          <div
                            key={`settings-role-catalog-${role.id}`}
                            className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-1"
                          >
                            <span
                              className={`text-xs font-semibold ${
                                role.is_active ? "text-zinc-700" : "text-zinc-400 line-through"
                              }`}
                            >
                              {role.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => void renameShowRole(role)}
                              className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700"
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              onClick={() => void toggleShowRoleActive(role)}
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                role.is_active
                                  ? "border border-amber-200 bg-amber-50 text-amber-700"
                                  : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {role.is_active ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-zinc-700">Links</h4>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600">
                        Pending {pendingLinkCount}
                      </span>
                      <button
                        type="button"
                        onClick={discoverShowLinks}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                      >
                        Discover
                      </button>
                      <button
                        type="button"
                        onClick={() => void fetchShowLinks()}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    {linksLoading ? (
                      <p className="text-sm text-zinc-500">Loading links...</p>
                    ) : showLinks.length === 0 ? (
                      <p className="text-sm text-zinc-500">No links yet. Run discovery to populate this list.</p>
                    ) : (
                      <div className="space-y-5">
                        {settingsLinkSections.map((section) => (
                          <div key={section.key} className="space-y-2">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                                {section.title}
                              </p>
                              <p className="text-xs text-zinc-500">{section.description}</p>
                            </div>
                            {section.key === "cast-member-pages" ? (
                              castMemberLinkCoverageCards.length === 0 ? (
                                <p className="text-sm text-zinc-500">No cast-member links in this category yet.</p>
                              ) : (
                                <div className="grid gap-3 lg:grid-cols-2">
                                  {castMemberLinkCoverageCards.map((card) => (
                                    <div
                                      key={`person-link-coverage-${card.personId}`}
                                      className="rounded-lg border border-zinc-200 bg-white p-3"
                                    >
                                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-zinc-900">{card.personName}</p>
                                        {card.seasons.length > 0 && (
                                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                                            Seasons {card.seasons.map((season) => `S${season}`).join(", ")}
                                          </span>
                                        )}
                                      </div>
                                      <div className="grid gap-2 sm:grid-cols-2">
                                        {card.sources.map((source) => {
                                          const isFound = source.state === "found";
                                          const stateLabel =
                                            source.state === "found"
                                              ? "Found"
                                              : source.state === "pending"
                                                ? "Pending"
                                                : source.state === "rejected"
                                                  ? "Rejected"
                                                  : "Missing";
                                          return (
                                            <div
                                              key={`person-link-source-${card.personId}-${source.key}`}
                                              className={`rounded-md border px-2 py-2 ${
                                                isFound
                                                  ? "border-emerald-200 bg-emerald-50"
                                                  : "border-red-200 bg-red-50"
                                              }`}
                                            >
                                              <div className="mb-1 flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                  <PersonSourceLogo sourceKey={source.key} />
                                                  <span className="text-xs font-semibold text-zinc-800">
                                                    {source.label}
                                                  </span>
                                                </div>
                                                <span
                                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                    isFound
                                                      ? "bg-emerald-100 text-emerald-700"
                                                      : "bg-red-100 text-red-700"
                                                  }`}
                                                >
                                                  {stateLabel}
                                                </span>
                                              </div>

                                              {isFound && source.url ? (
                                                <a
                                                  href={source.url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="block truncate text-xs font-medium text-emerald-700 hover:underline"
                                                >
                                                  {source.url}
                                                </a>
                                              ) : (
                                                <p className="truncate text-xs text-red-700">
                                                  {source.state === "pending"
                                                    ? "Pending review or validation"
                                                    : source.state === "rejected"
                                                      ? "Rejected source URL"
                                                      : "No source URL found"}
                                                </p>
                                              )}

                                              {source.link && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                  <button
                                                    type="button"
                                                    onClick={() => void setShowLinkStatus(source.link!.id, "approved")}
                                                    className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
                                                  >
                                                    Approve
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => void setShowLinkStatus(source.link!.id, "rejected")}
                                                    className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                                                  >
                                                    Reject
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => void editShowLink(source.link!)}
                                                    className="rounded border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-700"
                                                  >
                                                    Edit
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => void deleteShowLink(source.link!.id)}
                                                    className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700"
                                                  >
                                                    Delete
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )
                            ) : section.links.length === 0 ? (
                              <p className="text-sm text-zinc-500">No links in this category yet.</p>
                            ) : (
                              <div className="space-y-1">
                                {section.links.map((link) => {
                                  const isPersonBravoProfile =
                                    link.entity_type === "person" && link.link_kind === "bravo_profile";
                                  return (
                                    <div
                                      key={`settings-link-${section.key}-${link.id}`}
                                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white px-2 py-1.5"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <a
                                          href={link.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="block truncate text-sm font-medium text-blue-700 hover:underline"
                                        >
                                          {link.label || link.url}
                                        </a>
                                        <div className="mt-1 flex flex-wrap items-center gap-1">
                                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                                            {link.link_kind}
                                          </span>
                                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                                            {ENTITY_LINK_GROUP_LABELS[link.link_group]}
                                          </span>
                                          {link.season_number > 0 && (
                                            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                                              Season {link.season_number}
                                            </span>
                                          )}
                                          {link.entity_type !== "show" && (
                                            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                                              {link.entity_type}
                                            </span>
                                          )}
                                          {typeof link.metadata?.publisher_host === "string" &&
                                            link.metadata.publisher_host.trim().length > 0 && (
                                              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                                                {link.metadata.publisher_host.trim()}
                                              </span>
                                            )}
                                          {isPersonBravoProfile && (
                                            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                                              Bravo Person Profile
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-1">
                                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                                          {link.status}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => void setShowLinkStatus(link.id, "approved")}
                                          className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => void setShowLinkStatus(link.id, "rejected")}
                                          className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
                                        >
                                          Reject
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => void editShowLink(link)}
                                          className="rounded border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-700"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => void deleteShowLink(link.id)}
                                          className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
            </ShowSettingsTab>
          )}

          {/* Details Tab - External IDs */}
          {activeTab === "details" && (
            <ShowOverviewTab>
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Show Overview
                  </p>
                  <h3 className="text-xl font-bold text-zinc-900">
                    Details and Metadata
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {detailsEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={cancelDetailsEdit}
                        disabled={detailsSaving}
                        className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveShowDetails}
                        disabled={detailsSaving}
                        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                      >
                        {detailsSaving ? "Saving..." : "Save"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={startDetailsEdit}
                      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={refreshAllShowData}
                    disabled={isShowRefreshBusy}
                    className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {isShowRefreshBusy ? "Refreshing..." : "Refresh"}
                  </button>
                </div>
              </div>

              {(refreshTargetNotice.details || refreshTargetError.details) && (
                <p
                  className={`mb-4 text-sm ${
                    refreshTargetError.details ? "text-red-600" : "text-zinc-500"
                  }`}
                >
                  {refreshTargetError.details || refreshTargetNotice.details}
                </p>
              )}
              <RefreshProgressBar
                show={refreshingTargets.details}
                stage={refreshTargetProgress.details?.stage}
                message={refreshTargetProgress.details?.message}
                current={refreshTargetProgress.details?.current}
                total={refreshTargetProgress.details?.total}
              />
              {(detailsNotice || detailsError) && (
                <p className={`mb-4 text-sm ${detailsError ? "text-red-600" : "text-zinc-500"}`}>
                  {detailsError || detailsNotice}
                </p>
              )}

              <div className="space-y-6">
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-zinc-700">Editable Info</h4>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block md:col-span-2">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Display Name
                        </span>
                        <input
                          type="text"
                          value={detailsForm.displayName}
                          onChange={(e) =>
                            setDetailsForm((prev) => ({ ...prev, displayName: e.target.value }))
                          }
                          disabled={!detailsEditing}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
                          placeholder="Real Housewives of Beverly Hills"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Nickname
                        </span>
                        <input
                          type="text"
                          value={detailsForm.nickname}
                          onChange={(e) =>
                            setDetailsForm((prev) => ({ ...prev, nickname: e.target.value }))
                          }
                          disabled={!detailsEditing}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
                          placeholder="RHOBH"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Premiere Date
                        </span>
                        <input
                          type="date"
                          value={detailsForm.premiereDate}
                          onChange={(e) =>
                            setDetailsForm((prev) => ({ ...prev, premiereDate: e.target.value }))
                          }
                          disabled={!detailsEditing}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
                        />
                      </label>

                      <label className="block md:col-span-2">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Alt Names
                        </span>
                        <textarea
                          value={detailsForm.altNamesText}
                          onChange={(e) =>
                            setDetailsForm((prev) => ({ ...prev, altNamesText: e.target.value }))
                          }
                          rows={3}
                          disabled={!detailsEditing}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
                          placeholder={"One per line (or comma-separated)\nThe Real Housewives of Beverly Hills"}
                        />
                      </label>

                      <label className="block md:col-span-2">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Description
                        </span>
                        <textarea
                          value={detailsForm.description}
                          onChange={(e) =>
                            setDetailsForm((prev) => ({ ...prev, description: e.target.value }))
                          }
                          rows={4}
                          disabled={!detailsEditing}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
                          placeholder="Short show description"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-sm font-semibold text-zinc-700">External IDs</h4>
                  <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <ExternalLinks
                      externalIds={(show.external_ids as Record<string, unknown> | null) ?? null}
                      tmdbId={show.tmdb_id}
                      imdbId={show.imdb_id}
                      type="show"
                    />
                    {overviewExternalIdLinks.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {overviewExternalIdLinks.map((link) => (
                          <a
                            key={`overview-external-id-link-${link.id}`}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                          >
                            {link.label || link.link_kind}
                          </a>
                        ))}
                      </div>
                    ) : (
                      !show.tmdb_id &&
                      !show.imdb_id && (
                        <p className="text-sm text-zinc-500">No external IDs available for this show.</p>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-sm font-semibold text-zinc-700">Social Handles</h4>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    {overviewSocialHandleLinks.length === 0 ? (
                      <p className="text-sm text-zinc-500">No show-level social handles discovered yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {overviewSocialHandleLinks.map((link) => (
                          <a
                            key={`overview-social-link-${link.id}`}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                          >
                            {link.label || link.link_kind}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-sm font-semibold text-zinc-700">Season URL Coverage</h4>
                  <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    {seasonUrlCoverageRows.length === 0 ? (
                      <p className="text-sm text-zinc-500">No seasons available for URL coverage yet.</p>
                    ) : (
                      seasonUrlCoverageRows.map((row) => (
                        <div
                          key={`overview-season-url-coverage-${row.seasonNumber}`}
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-2"
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                            Season {row.seasonNumber}
                          </p>
                          {row.pills.length === 0 ? (
                            <p className="mt-1 text-sm text-zinc-500">No season-scoped URLs discovered.</p>
                          ) : (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {row.pills.map((pill) => (
                                <span
                                  key={`overview-season-url-pill-${row.seasonNumber}-${pill}`}
                                  className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700"
                                >
                                  {pill}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Genres */}
                {show.genres && show.genres.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-700">
                      Genres
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {show.genres.map((genre) => (
                        <span
                          key={genre}
                          className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm text-zinc-700"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="mb-3 text-sm font-semibold text-zinc-700">
                    Brands (Network & Streaming)
                  </h4>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Networks
                    </p>
                    <div className="mb-4 flex flex-wrap gap-2">
                      {(show.networks ?? []).length > 0 ? (
                        show.networks.map((network) => (
                          <span
                            key={network}
                            className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-700"
                          >
                            {network}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-zinc-500">No network metadata.</p>
                      )}
                    </div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Streaming
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(
                        (Array.isArray(show.streaming_providers) ? show.streaming_providers : null) ??
                        (Array.isArray(show.watch_providers) ? show.watch_providers : []) ??
                        []
                      ).length > 0 ? (
                        (
                          (Array.isArray(show.streaming_providers)
                            ? show.streaming_providers
                            : Array.isArray(show.watch_providers)
                              ? show.watch_providers
                              : []) ?? []
                        ).map((provider) => (
                          <span
                            key={provider}
                            className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-700"
                          >
                            {provider}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-zinc-500">No streaming providers on this record.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {show.tags && show.tags.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-700">
                      Tags
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {show.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-sm text-blue-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Premiere Date */}
                {show.premiere_date && (
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-700">
                      Premiere Date
                    </h4>
                    <p className="text-sm text-zinc-700">
                      {new Date(show.premiere_date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}

                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-sm text-zinc-700">
                    Link management and role catalog tools are now on the <span className="font-semibold">Settings</span> tab.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab("settings")}
                    className="mt-3 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                  >
                    Open Settings
                  </button>
                </div>

                {/* Internal ID */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-zinc-700">
                    Internal ID
                  </h4>
                  <code className="text-xs bg-zinc-100 rounded px-2 py-1 text-zinc-600 font-mono">
                    {show.id}
                  </code>
                </div>

                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Show Visibility
                  </p>
                  {isCovered ? (
                    <button
                      onClick={removeFromCoveredShows}
                      disabled={coverageLoading}
                      className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {coverageLoading ? "..." : "Remove from Shows"}
                    </button>
                  ) : (
                    <button
                      onClick={addToCoveredShows}
                      disabled={coverageLoading}
                      className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      {coverageLoading ? "..." : "Add to Shows"}
                    </button>
                  )}
                  {coverageError && (
                    <p className="mt-2 text-xs font-medium text-rose-700">{coverageError}</p>
                  )}
                </div>
              </div>
            </div>
            </ShowOverviewTab>
          )}
        </main>

        {/* Lightbox for cast photos */}
        {lightboxImage && (
          <ImageLightbox
            src={lightboxImage.src}
            alt={lightboxImage.alt}
            isOpen={lightboxOpen}
            onClose={() => {
              setLightboxOpen(false);
              setLightboxImage(null);
            }}
          />
        )}

        {/* Lightbox for gallery assets */}
        {assetLightbox && lightboxAssetCapabilities && (
          <ImageLightbox
            src={getAssetDetailUrl(assetLightbox.asset)}
            fallbackSrcs={getSeasonAssetDetailUrlCandidates(assetLightbox.asset)}
            alt={assetLightbox.asset.caption || "Gallery image"}
            isOpen={true}
            onClose={closeAssetLightbox}
            metadata={mapSeasonAssetToMetadata(assetLightbox.asset, selectedGallerySeason !== "all" ? selectedGallerySeason : undefined, show?.name)}
            canManage={true}
            metadataExtras={
              <GalleryAssetEditTools
                asset={assetLightbox.asset}
                capabilities={lightboxAssetCapabilities}
                getAuthHeaders={getAuthHeaders}
                onAssetUpdated={(patch) => applyGalleryAssetPatch(assetLightbox.asset, patch)}
                onReload={async () => {
                  await loadGalleryAssets(selectedGallerySeason);
                }}
              />
            }
            isStarred={Boolean((assetLightbox.asset.metadata as Record<string, unknown> | null)?.starred)}
            actionDisabledReasons={{
              refresh: lightboxAssetCapabilities.canEdit
                ? undefined
                : lightboxAssetCapabilities.reasons.edit,
              archive: lightboxAssetCapabilities.canArchive
                ? undefined
                : lightboxAssetCapabilities.reasons.archive ?? "Archive is unavailable for this image.",
              star: lightboxAssetCapabilities.canStar
                ? undefined
                : lightboxAssetCapabilities.reasons.star ?? "Star/Flag is unavailable for this image.",
              delete:
                assetLightbox.asset.origin_table === "media_assets"
                  ? undefined
                  : "Delete is only available for imported media assets.",
              featuredPoster: canSetFeaturedPoster ? undefined : featuredPosterDisabledReason,
              featuredBackdrop: canSetFeaturedBackdrop ? undefined : featuredBackdropDisabledReason,
              featuredLogo: canSetFeaturedLogo ? undefined : featuredLogoDisabledReason,
            }}
            onRefresh={() => refreshGalleryAssetPipeline(assetLightbox.asset)}
            onToggleStar={(starred) => toggleStarGalleryAsset(assetLightbox.asset, starred)}
            onArchive={() => archiveGalleryAsset(assetLightbox.asset)}
            onSetFeaturedPoster={
              canSetFeaturedPoster
                ? () => setFeaturedShowImage("poster", assetLightbox.asset.id)
                : undefined
            }
            onSetFeaturedBackdrop={
              canSetFeaturedBackdrop
                ? () => setFeaturedShowImage("backdrop", assetLightbox.asset.id)
                : undefined
            }
            onClearFeaturedPoster={
              isFeaturedPoster ? () => setFeaturedShowImage("poster", null) : undefined
            }
            onClearFeaturedBackdrop={
              isFeaturedBackdrop ? () => setFeaturedShowImage("backdrop", null) : undefined
            }
            isFeaturedPoster={isFeaturedPoster}
            isFeaturedBackdrop={isFeaturedBackdrop}
            onSetFeaturedLogo={
              canSetFeaturedLogo && assetLightbox
                ? () => setFeaturedShowLogo(assetLightbox.asset)
                : undefined
            }
            isFeaturedLogo={isFeaturedLogo}
            onUpdateContentType={(contentType) =>
              updateGalleryAssetContentType(assetLightbox.asset, contentType)
            }
            onDelete={() => deleteGalleryAsset(assetLightbox.asset)}
            position={{
              current: assetLightbox.index + 1,
              total: assetLightbox.filteredAssets.length,
            }}
            onPrevious={() => navigateAssetLightbox("prev")}
            onNext={() => navigateAssetLightbox("next")}
            hasPrevious={assetLightbox.index > 0}
            hasNext={assetLightbox.index < assetLightbox.filteredAssets.length - 1}
            triggerRef={assetTriggerRef as React.RefObject<HTMLElement | null>}
          />
        )}

        {/* Image scrape drawer */}
        {scrapeDrawerContext && (
          <ImageScrapeDrawer
            isOpen={scrapeDrawerOpen}
            onClose={() => {
              setScrapeDrawerOpen(false);
              setScrapeDrawerContext(null);
            }}
            entityContext={scrapeDrawerContext}
            onImportComplete={() => {
              // Refresh gallery after import
              if (activeTab === "assets" && assetsView === "images") {
                loadGalleryAssets(selectedGallerySeason);
              }
            }}
          />
        )}

        <AdminModal
          isOpen={refreshLogOpen}
          onClose={() => setRefreshLogOpen(false)}
          closeLabel="Close health center"
          ariaLabel="Health Center"
          panelClassName="max-h-[90vh] max-w-5xl overflow-y-auto"
        >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">Health Center</h3>
                  <p className="text-sm text-zinc-500">
                    Content Health, Sync Pipeline, Operations Inbox, and Refresh Log.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRefreshLogOpen(false)}
                  className="rounded-md border border-zinc-200 px-3 py-1 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Close
                </button>
              </div>

              <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                  Content Health
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                  {contentHealthItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={item.onClick}
                      className={`rounded-xl border px-3 py-2 text-left transition hover:shadow-sm ${healthBadgeClassName(
                        item.status
                      )}`}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {item.status === "ready"
                          ? "Ready"
                          : item.status === "stale"
                            ? "Stale"
                            : "Missing"}
                      </p>
                      <p className="mt-1 text-xs opacity-80">{item.countLabel}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="mb-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Sync Pipeline
                  </p>
                  <div className="space-y-2">
                    {pipelineSteps.map((step) => {
                      const latestParts = step.latest ? extractRefreshLogSubJob(step.latest) : null;
                      const statusPillClass =
                        step.status === "done"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : step.status === "active"
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : step.status === "failed"
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-zinc-200 bg-zinc-50 text-zinc-600";
                      const statusText =
                        step.status === "done"
                          ? "Done"
                          : step.status === "active"
                            ? "Running"
                            : step.status === "failed"
                              ? "Failed"
                              : "Queued";
                      return (
                        <div
                          key={step.topic.key}
                          className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-700">
                              {step.topic.label}
                            </p>
                            <p className="truncate text-[11px] text-zinc-500">{step.topic.description}</p>
                            <p className="truncate text-[11px] text-zinc-600">
                              {latestParts?.details ?? "No updates yet."}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusPillClass}`}>
                              {statusText}
                            </span>
                            {step.latest && (
                              <p className="mt-1 text-[10px] text-zinc-400">
                                {new Date(step.latest.at).toLocaleTimeString()}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Operations Inbox
                  </p>
                  {operationsInboxItems.length === 0 ? (
                    <p className="mt-3 text-sm text-emerald-700">No blocking tasks.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {operationsInboxItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.onClick}
                          className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left transition hover:bg-amber-100"
                        >
                          <p className="text-sm font-semibold text-amber-800">{item.title}</p>
                          <p className="mt-1 text-xs text-amber-700">{item.detail}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                  Refresh Log
                </p>
                {refreshLogEntries.length === 0 ? (
                  <p className="text-xs text-zinc-500">No refresh activity yet.</p>
                ) : (
                  <div className="max-h-[44vh] space-y-3 overflow-y-auto pr-1">
                    {refreshLogTopicGroups.map(({ topic, entries, entriesForView, latest, status }) => {
                      const latestParts = latest ? extractRefreshLogSubJob(latest) : null;
                      const latestPercent =
                        latest &&
                        typeof latest.current === "number" &&
                        typeof latest.total === "number" &&
                        latest.total > 0
                          ? Math.min(100, Math.round((latest.current / latest.total) * 100))
                          : null;

                      if (status === "done") {
                        return (
                          <article
                            key={topic.key}
                            className="rounded-lg border border-green-200 bg-green-50 px-3 py-2"
                          >
                            <p className="text-xs font-semibold text-green-800">
                              {topic.label}: Done ✔️
                            </p>
                          </article>
                        );
                      }

                      return (
                        <article key={topic.key} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                                {topic.label}
                              </p>
                              <p className="text-[11px] text-zinc-500">{topic.description}</p>
                            </div>
                            {latest && (
                              <p className="text-[10px] text-zinc-400">
                                {new Date(latest.at).toLocaleTimeString()}
                              </p>
                            )}
                          </div>

                          {status === "failed" && (
                            <p className="mt-2 text-xs font-semibold text-red-700">
                              {topic.label}: Failed ✖
                            </p>
                          )}

                          {latest ? (
                            <div className="mt-2 rounded-md border border-zinc-200 bg-white p-2">
                              <p className="text-xs font-semibold text-zinc-800">{latestParts?.subJob}</p>
                              <p className="mt-1 text-xs text-zinc-600">{latestParts?.details}</p>
                              {typeof latest.current === "number" &&
                                typeof latest.total === "number" && (
                                  <p className="mt-1 text-[11px] text-zinc-500">
                                    {latest.current.toLocaleString()}/{latest.total.toLocaleString()}
                                    {latestPercent !== null ? ` (${latestPercent}%)` : ""}
                                  </p>
                                )}
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-zinc-500">No updates yet.</p>
                          )}

                          {entries.length > 0 && (
                            <details className="mt-2" open={entries.length <= 3}>
                              <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                Sub-jobs ({entries.length})
                              </summary>
                              <div className="mt-2 space-y-1">
                                {entriesForView.slice(0, 30).map((entry) => {
                                  const parts = extractRefreshLogSubJob(entry);
                                  const percent =
                                    typeof entry.current === "number" &&
                                    typeof entry.total === "number" &&
                                    entry.total > 0
                                      ? Math.min(100, Math.round((entry.current / entry.total) * 100))
                                      : null;
                                  return (
                                    <div
                                      key={entry.id}
                                      className="rounded border border-zinc-100 bg-white px-2 py-1.5"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="text-[11px] font-semibold text-zinc-700">
                                          {parts.subJob}
                                        </p>
                                        <p className="text-[10px] text-zinc-400">
                                          {new Date(entry.at).toLocaleTimeString()}
                                        </p>
                                      </div>
                                      <p className="mt-0.5 text-[11px] text-zinc-600">{parts.details}</p>
                                      {typeof entry.current === "number" &&
                                        typeof entry.total === "number" && (
                                          <p className="mt-0.5 text-[10px] text-zinc-500">
                                            {entry.current.toLocaleString()}/{entry.total.toLocaleString()}
                                            {percent !== null ? ` (${percent}%)` : ""}
                                          </p>
                                        )}
                                    </div>
                                  );
                                })}
                              </div>
                            </details>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
        </AdminModal>

        <AdminModal
          isOpen={syncBravoModePickerOpen}
          onClose={() => setSyncBravoModePickerOpen(false)}
          closeLabel="Close sync mode picker"
          ariaLabel="Sync by Bravo mode picker"
          panelClassName="max-w-md"
        >
              <h3 className="text-lg font-bold text-zinc-900">Sync by Bravo</h3>
              <p className="mt-1 text-sm text-zinc-600">
                Choose what to sync from Bravo for this run.
              </p>
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => startSyncBravoFlow("full")}
                  className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  Sync All Info
                </button>
                <button
                  type="button"
                  onClick={() => startSyncBravoFlow("cast-only")}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Cast Info only
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSyncBravoModePickerOpen(false)}
                className="mt-4 w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
        </AdminModal>

        <AdminModal
          isOpen={syncBravoOpen}
          onClose={() => {
            if (syncBravoLoading) return;
            setSyncBravoOpen(false);
            setSyncBravoStep("preview");
          }}
          disableClose={syncBravoLoading}
          closeLabel="Close Bravo sync dialog"
          ariaLabel="Import by Bravo"
          panelClassName="max-h-[90vh] max-w-3xl overflow-y-auto"
        >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">
                    Import by Bravo {syncBravoRunMode === "cast-only" ? "(Cast Info only)" : ""}
                  </h3>
                  <p className="text-sm text-zinc-500">Preview and commit persisted Bravo snapshots for this show.</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    Step {syncBravoStep === "preview" ? "1" : "2"} of 2
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Selected Mode: {syncBravoModeSummaryLabel}
                  </p>
                  {syncBravoPreviewSignature && (
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Preview Signature: {syncBravoPreviewSignature.slice(0, 12)}...
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSyncBravoOpen(false);
                    setSyncBravoStep("preview");
                  }}
                  disabled={syncBravoLoading}
                  className="rounded-md border border-zinc-200 px-3 py-1 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Close
                </button>
              </div>

              <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Sync Season
                  <select
                    value={syncBravoTargetSeasonNumber ?? ""}
                    onChange={(event) => {
                      const raw = event.target.value;
                      const parsed = Number.parseInt(raw, 10);
                      setSyncBravoTargetSeasonNumber(
                        Number.isFinite(parsed) ? parsed : defaultSyncBravoSeasonNumber
                      );
                    }}
                    disabled={syncBravoLoading || syncBravoSeasonOptions.length === 0}
                    className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-zinc-800 disabled:opacity-50"
                  >
                    {syncBravoSeasonOptions.length === 0 ? (
                      <option value="">No eligible seasons</option>
                    ) : (
                      syncBravoSeasonOptions.map((seasonNumber) => (
                        <option key={seasonNumber} value={seasonNumber}>
                          Season {seasonNumber}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                <p className="mt-2 text-xs text-zinc-500">
                  Bravo profile images from this run will be assigned as season promos for the selected season. Eligible seasons require more than 1 episode or a premiere date.
                </p>
              </div>

              {syncBravoStep === "preview" ? (
                <>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Show Name
                  </p>
                  <p className="text-sm font-semibold text-zinc-900">{show.name}</p>
                  <p className="mt-2 mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Bravo Show URL
                  </p>
                  {autoGeneratedBravoUrl ? (
                    <a
                      href={autoGeneratedBravoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block break-all text-xs text-blue-700 hover:underline"
                    >
                      {autoGeneratedBravoUrl}
                    </a>
                  ) : (
                    <p className="text-xs text-zinc-500">Could not infer URL yet.</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void previewSyncByBravo()}
                  disabled={syncBravoLoading}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {syncBravoPreviewLoading
                    ? "Refreshing..."
                    : syncBravoRunMode === "cast-only"
                      ? "Refresh Cast Preview"
                      : "Refresh Preview"}
                </button>
              </div>

              {(syncBravoError || syncBravoNotice) && (
                <p className={`mb-4 text-sm ${syncBravoError ? "text-red-600" : "text-zinc-600"}`}>
                  {syncBravoError || syncBravoNotice}
                </p>
              )}

              {syncBravoRunMode === "cast-only" && (
                <p className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                  Cast-only mode probes canonical Bravo (`/people/*`) and Fandom (`/wiki/*`) cast profile URLs and reports
                  valid, missing, and error candidates for each source.
                </p>
              )}

              {syncBravoRunMode !== "cast-only" && (
                <>
                  <div className="mb-4 grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Description
                      </span>
                      <textarea
                        value={syncBravoDescription}
                        onChange={(event) => setSyncBravoDescription(event.target.value)}
                        rows={4}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Airs / Tune-In
                      </span>
                      <textarea
                        value={syncBravoAirs}
                        onChange={(event) => setSyncBravoAirs(event.target.value)}
                        rows={4}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                      />
                    </label>
                  </div>
                  <label className="mb-4 flex items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={syncBravoApplyDescriptionToShow}
                      onChange={(event) => setSyncBravoApplyDescriptionToShow(event.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      Apply Bravo description to show profile.
                      <span className="ml-1 text-xs text-zinc-500">
                        Off by default. When off, commit keeps canonical show bio sources (IMDb/TMDb/Knowledge/Fandom).
                      </span>
                    </span>
                  </label>

                  <div className="mb-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Show Images
                    </p>
                    {syncBravoImages.length === 0 ? (
                      <p className="text-sm text-zinc-500">Run preview to load image candidates.</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {syncBravoImages.map((image) => {
                          const checked = syncBravoSelectedImages.has(image.url);
                          const selectedKind =
                            syncBravoImageKinds[image.url] ?? inferBravoImportImageKind(image);
                          return (
                            <div key={image.url} className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) =>
                                  setSyncBravoSelectedImages((prev) => {
                                    const next = new Set(prev);
                                    if (event.target.checked) next.add(image.url);
                                    else next.delete(image.url);
                                    return next;
                                  })
                                }
                                className="mt-1"
                              />
                              <div className="relative h-16 w-28 overflow-hidden rounded bg-zinc-100">
                                <GalleryImage src={image.url} alt={image.alt || "Bravo image"} sizes="120px" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="line-clamp-2 text-xs text-zinc-600">{image.alt || image.url}</span>
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                    Type
                                  </span>
                                  <select
                                    value={selectedKind}
                                    onChange={(event) =>
                                      setSyncBravoImageKinds((prev) => ({
                                        ...prev,
                                        [image.url]: event.target.value as BravoImportImageKind,
                                      }))
                                    }
                                    className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700"
                                  >
                                    {BRAVO_IMPORT_IMAGE_KIND_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Cast Member URLs
                  </p>
                  {syncBravoRunMode === "cast-only" && (
                    <div className="text-right text-[11px] font-semibold text-zinc-500">
                      <p>
                        Bravo tested {syncBravoProbeSummary.tested} / valid {syncBravoProbeSummary.valid} /
                        missing {syncBravoProbeSummary.missing} / error {syncBravoProbeSummary.errors}
                      </p>
                      <p>
                        Fandom tested {syncFandomProbeSummary.tested} / valid {syncFandomProbeSummary.valid} /
                        missing {syncFandomProbeSummary.missing} / error {syncFandomProbeSummary.errors}
                      </p>
                    </div>
                  )}
                </div>
                {syncBravoRunMode === "cast-only" && syncBravoProbeStatusMessage && (
                  <p className="mb-2 text-xs text-zinc-500">
                    {syncBravoProbeStatusMessage}
                    {syncBravoProbeActive && syncBravoProbeTotal > 30 ? " This may take several minutes." : ""}
                  </p>
                )}

                {syncBravoRunMode === "cast-only" ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-zinc-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Probe Queue
                      </p>
                      {syncBravoPersonCandidateResults.length === 0 ? (
                        <p className="mt-2 text-sm text-zinc-500">
                          Preparing canonical `/people/*` candidate probes...
                        </p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {syncBravoPersonCandidateResults.map((result) => {
                            const status = String(result.status || "pending").trim().toLowerCase();
                            const badgeClass =
                              status === "ok"
                                ? "bg-emerald-100 text-emerald-700"
                                : status === "missing"
                                  ? "bg-amber-100 text-amber-700"
                                  : status === "error"
                                    ? "bg-red-100 text-red-700"
                                    : status === "in_progress"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-zinc-200 text-zinc-700";
                            return (
                              <article
                                key={`candidate-${result.url}`}
                                className="rounded-md border border-zinc-200 bg-zinc-50 p-2"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${badgeClass}`}
                                  >
                                    {status}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-semibold text-zinc-800">
                                      {result.name || "Unresolved cast member"}
                                    </p>
                                    <a
                                      href={result.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="min-w-0 break-all text-xs text-blue-700 hover:underline"
                                    >
                                      {result.url}
                                    </a>
                                  </div>
                                </div>
                                {result.error && (
                                  <p className="mt-1 text-xs text-zinc-600">{result.error}</p>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {syncBravoValidProfileCards.length === 0 ? (
                      <p className="text-sm text-zinc-500">
                        No valid Bravo profile pages resolved from canonical `/people/*` probes.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {syncBravoValidProfileCards.map((person) => (
                          <article
                            key={person.url}
                            className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                          >
                            <div className="flex gap-3">
                              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-zinc-100">
                                {person.heroImageUrl ? (
                                  <GalleryImage
                                    src={person.heroImageUrl}
                                    alt={person.name || "Bravo profile"}
                                    sizes="96px"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-[11px] text-zinc-400">
                                    No image
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-zinc-900">
                                  {person.name || "Unresolved cast member"}
                                </p>
                                <a
                                  href={person.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 block break-all text-xs text-blue-700 hover:underline"
                                >
                                  {person.url}
                                </a>
                                {person.bio && (
                                  <p className="mt-2 line-clamp-3 text-xs text-zinc-600">{person.bio}</p>
                                )}
                                {person.socialLinks.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {person.socialLinks.map((social) => (
                                      <a
                                        key={`${person.url}-${social.key}-${social.url}`}
                                        href={social.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100"
                                      >
                                        {social.label}
                                        {social.handle ? ` ${social.handle}` : ""}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}

                    {syncBravoCandidateIssues.length > 0 && (
                      <div className="rounded-lg border border-zinc-200 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Missing / Error Profiles
                        </p>
                        <div className="mt-2 space-y-2">
                          {syncBravoCandidateIssues.map((result) => (
                            <article
                              key={`${result.status}-${result.url}`}
                              className="rounded-md border border-zinc-200 bg-zinc-50 p-2"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                                    result.status === "missing"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {result.status}
                                </span>
                                <a
                                  href={result.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="min-w-0 break-all text-xs text-blue-700 hover:underline"
                                >
                                  {result.url}
                                </a>
                              </div>
                              {result.reason && (
                                <p className="mt-1 text-xs text-zinc-600">{result.reason}</p>
                              )}
                            </article>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg border border-zinc-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Fandom Probe Queue
                        </p>
                        <p className="text-[11px] font-semibold text-zinc-500">
                          tested {syncFandomProbeSummary.tested} / valid {syncFandomProbeSummary.valid} /
                          missing {syncFandomProbeSummary.missing} / error {syncFandomProbeSummary.errors}
                        </p>
                      </div>
                      {syncFandomDomainsUsed.length > 0 && (
                        <p className="mt-1 text-[11px] text-zinc-500">
                          Domains: {syncFandomDomainsUsed.join(", ")}
                        </p>
                      )}
                      {syncFandomPersonCandidateResults.length === 0 ? (
                        <p className="mt-2 text-sm text-zinc-500">
                          Preparing canonical `/wiki/*` candidate probes...
                        </p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {syncFandomPersonCandidateResults.map((result) => {
                            const status = String(result.status || "pending").trim().toLowerCase();
                            const badgeClass =
                              status === "ok"
                                ? "bg-emerald-100 text-emerald-700"
                                : status === "missing"
                                  ? "bg-amber-100 text-amber-700"
                                  : status === "error"
                                    ? "bg-red-100 text-red-700"
                                    : status === "in_progress"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-zinc-200 text-zinc-700";
                            return (
                              <article
                                key={`fandom-candidate-${result.url}`}
                                className="rounded-md border border-zinc-200 bg-zinc-50 p-2"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${badgeClass}`}
                                  >
                                    {status}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-semibold text-zinc-800">
                                      {result.name || "Unresolved cast member"}
                                    </p>
                                    <a
                                      href={result.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="min-w-0 break-all text-xs text-blue-700 hover:underline"
                                    >
                                      {result.url}
                                    </a>
                                  </div>
                                </div>
                                {result.error && (
                                  <p className="mt-1 text-xs text-zinc-600">{result.error}</p>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {syncFandomValidProfileCards.length === 0 ? (
                      <p className="text-sm text-zinc-500">
                        No valid Fandom profile pages resolved from canonical `/wiki/*` probes.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {syncFandomValidProfileCards.map((person) => (
                          <article
                            key={`fandom-profile-${person.url}`}
                            className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                          >
                            <div className="flex gap-3">
                              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-zinc-100">
                                {person.heroImageUrl ? (
                                  <GalleryImage
                                    src={person.heroImageUrl}
                                    alt={person.name || "Fandom profile"}
                                    sizes="96px"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-[11px] text-zinc-400">
                                    No image
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-zinc-900">
                                  {person.name || "Unresolved cast member"}
                                </p>
                                <a
                                  href={person.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 block break-all text-xs text-blue-700 hover:underline"
                                >
                                  {person.url}
                                </a>
                                {person.bio && (
                                  <p className="mt-2 line-clamp-3 text-xs text-zinc-600">{person.bio}</p>
                                )}
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}

                    {syncFandomCandidateIssues.length > 0 && (
                      <div className="rounded-lg border border-zinc-200 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Fandom Missing / Error Profiles
                        </p>
                        <div className="mt-2 space-y-2">
                          {syncFandomCandidateIssues.map((result) => (
                            <article
                              key={`fandom-${result.status}-${result.url}`}
                              className="rounded-md border border-zinc-200 bg-zinc-50 p-2"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                                    result.status === "missing"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {result.status}
                                </span>
                                <a
                                  href={result.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="min-w-0 break-all text-xs text-blue-700 hover:underline"
                                >
                                  {result.url}
                                </a>
                              </div>
                              {result.reason && (
                                <p className="mt-1 text-xs text-zinc-600">{result.reason}</p>
                              )}
                            </article>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : syncBravoPreviewCastLinks.length === 0 ? (
                  <p className="text-sm text-zinc-500">No cast member URLs found in this preview.</p>
                ) : (
                  <div className="space-y-2">
                    {syncBravoPreviewCastLinks.map((person) => (
                      <article
                        key={person.url}
                        className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                      >
                        <p className="text-sm font-semibold text-zinc-900">
                          {person.name || "Unresolved cast member"}
                        </p>
                        <a
                          href={person.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block break-all text-xs text-blue-700 hover:underline"
                        >
                          {person.url}
                        </a>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              {syncBravoRunMode !== "cast-only" && (
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Fandom Cast Coverage
                    </p>
                    <p className="text-[11px] font-semibold text-zinc-500">
                      tested {syncFandomProbeSummary.tested} / valid {syncFandomProbeSummary.valid} /
                      missing {syncFandomProbeSummary.missing} / error {syncFandomProbeSummary.errors}
                    </p>
                  </div>
                  {syncFandomDomainsUsed.length > 0 && (
                    <p className="mb-2 text-xs text-zinc-500">
                      Domains used: {syncFandomDomainsUsed.join(", ")}
                    </p>
                  )}
                  {syncFandomValidProfileCards.length === 0 ? (
                    <p className="text-sm text-zinc-500">No valid Fandom cast profiles found in this preview.</p>
                  ) : (
                    <div className="space-y-2">
                      {syncFandomValidProfileCards.map((person) => (
                        <article
                          key={`full-fandom-${person.url}`}
                          className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                        >
                          <p className="text-sm font-semibold text-zinc-900">
                            {person.name || "Unresolved cast member"}
                          </p>
                          <a
                            href={person.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 block break-all text-xs text-blue-700 hover:underline"
                          >
                            {person.url}
                          </a>
                          {person.bio && (
                            <p className="mt-2 line-clamp-2 text-xs text-zinc-600">{person.bio}</p>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                  {syncFandomCandidateIssues.length > 0 && (
                    <div className="mt-2 rounded-lg border border-zinc-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Fandom Missing / Error Profiles
                      </p>
                      <div className="mt-2 space-y-1">
                        {syncFandomCandidateIssues.map((result) => (
                          <p key={`full-fandom-issue-${result.url}`} className="text-xs text-zinc-600">
                            {result.status.toUpperCase()}: {result.url}
                            {result.reason ? ` (${result.reason})` : ""}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {syncBravoRunMode !== "cast-only" && (
                <>
                  <div className="mb-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      News
                    </p>
                    {syncBravoPreviewNews.length === 0 ? (
                      <p className="text-sm text-zinc-500">No news items found in this preview.</p>
                    ) : (
                      <div className="space-y-2">
                        {syncBravoPreviewNews.map((item) => (
                          <article
                            key={`${item.article_url}-${item.published_at ?? "unknown"}`}
                            className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                          >
                            <div className="flex gap-3">
                              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded bg-zinc-100">
                                {item.image_url ? (
                                  <GalleryImage
                                    src={item.image_url}
                                    alt={item.headline || "Bravo news"}
                                    sizes="120px"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                                    No image
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <a
                                  href={item.article_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="line-clamp-2 text-sm font-semibold text-zinc-900 hover:text-blue-700"
                                >
                                  {item.headline || "Untitled story"}
                                </a>
                                {formatBravoPublishedDate(item.published_at) && (
                                  <p className="mt-1 text-xs text-zinc-500">
                                    Posted {formatBravoPublishedDate(item.published_at)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Videos
                      </p>
                      {syncBravoPreviewSeasonOptions.length > 0 && (
                        <label className="flex items-center gap-2 text-xs text-zinc-600">
                          <span>Season</span>
                          <select
                            value={syncBravoPreviewSeasonFilter}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              setSyncBravoPreviewSeasonFilter(
                                nextValue === "all" ? "all" : Number.parseInt(nextValue, 10)
                              );
                            }}
                            className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700"
                          >
                            <option value="all">All</option>
                            {syncBravoPreviewSeasonOptions.map((season) => (
                              <option key={season} value={season}>
                                Season {season}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>
                    {syncBravoFilteredPreviewVideos.length === 0 ? (
                      <p className="text-sm text-zinc-500">No videos found for this preview/season filter.</p>
                    ) : (
                      <div className="space-y-2">
                        {syncBravoFilteredPreviewVideos.map((video) => (
                          <article
                            key={`${video.clip_url}-${video.published_at ?? "unknown"}`}
                            className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                          >
                            <div className="flex gap-3">
                              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded bg-zinc-100">
                                {video.image_url ? (
                                  <GalleryImage
                                    src={video.image_url}
                                    alt={video.title || "Bravo video"}
                                    sizes="120px"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                                    No image
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <a
                                  href={video.clip_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="line-clamp-2 text-sm font-semibold text-zinc-900 hover:text-blue-700"
                                >
                                  {video.title || "Untitled video"}
                                </a>
                                <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                                  {video.runtime && <span>{video.runtime}</span>}
                                  {typeof video.season_number === "number" && (
                                    <span>Season {video.season_number}</span>
                                  )}
                                  {formatBravoPublishedDate(video.published_at) && (
                                    <span>Posted {formatBravoPublishedDate(video.published_at)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Show Name
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-800">{show.name}</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Bravo Show URL
                    </p>
                    {autoGeneratedBravoUrl ? (
                      <a
                        href={autoGeneratedBravoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block break-all text-xs text-blue-700 hover:underline"
                      >
                        {autoGeneratedBravoUrl}
                      </a>
                    ) : (
                      <p className="mt-1 text-xs text-zinc-500">Could not infer URL yet.</p>
                    )}
                    {syncBravoRunMode !== "cast-only" && syncBravoDescription.trim() && (
                      <>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Description
                        </p>
                        <p className="mt-1 text-sm text-zinc-700">{syncBravoDescription.trim()}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {syncBravoApplyDescriptionToShow
                            ? "Will be applied to show profile."
                            : "Will not overwrite show profile unless enabled in preview step."}
                        </p>
                      </>
                    )}
                    {syncBravoRunMode !== "cast-only" && syncBravoAirs.trim() && (
                      <>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Airs / Tune-In
                        </p>
                        <p className="mt-1 text-sm text-zinc-700">{syncBravoAirs.trim()}</p>
                      </>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Cast Members Being Synced ({syncBravoCastSyncCount})
                    </p>
                    {syncBravoRunMode === "cast-only" && (
                      <>
                        <p className="mb-1 text-xs text-zinc-500">
                          Bravo summary: tested {syncBravoProbeSummary.tested}, valid{" "}
                          {syncBravoProbeSummary.valid}, missing {syncBravoProbeSummary.missing},
                          errors {syncBravoProbeSummary.errors}.
                        </p>
                        <p className="mb-2 text-xs text-zinc-500">
                          Fandom summary: tested {syncFandomProbeSummary.tested}, valid{" "}
                          {syncFandomProbeSummary.valid}, missing {syncFandomProbeSummary.missing},
                          errors {syncFandomProbeSummary.errors}.
                        </p>
                        {syncFandomDomainsUsed.length > 0 && (
                          <p className="mb-2 text-xs text-zinc-500">
                            Fandom domains used: {syncFandomDomainsUsed.join(", ")}
                          </p>
                        )}
                      </>
                    )}
                    {syncBravoRunMode === "cast-only" ? (
                      <div className="space-y-3">
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                            Bravo Profiles ({syncBravoValidProfileCards.length})
                          </p>
                          {syncBravoValidProfileCards.length === 0 ? (
                            <p className="text-sm text-zinc-500">
                              No valid Bravo cast profile URLs were detected in this preview.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {syncBravoValidProfileCards.map((person) => (
                                <article
                                  key={person.url}
                                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                                >
                                  <p className="text-sm font-semibold text-zinc-900">
                                    {person.name || "Unresolved cast member"}
                                  </p>
                                  <p className="mt-1 break-all text-xs text-zinc-600">{person.url}</p>
                                </article>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                            Fandom Profiles ({syncFandomValidProfileCards.length})
                          </p>
                          {syncFandomValidProfileCards.length === 0 ? (
                            <p className="text-sm text-zinc-500">
                              No valid Fandom cast profile URLs were detected in this preview.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {syncFandomValidProfileCards.map((person) => (
                                <article
                                  key={`confirm-fandom-${person.url}`}
                                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                                >
                                  <p className="text-sm font-semibold text-zinc-900">
                                    {person.name || "Unresolved cast member"}
                                  </p>
                                  <p className="mt-1 break-all text-xs text-zinc-600">{person.url}</p>
                                </article>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : syncBravoPreviewCastLinks.length === 0 ? (
                      <p className="text-sm text-zinc-500">No cast member URLs found in this preview.</p>
                    ) : (
                      <div className="space-y-2">
                        {syncBravoPreviewCastLinks.map((person) => (
                          <article
                            key={person.url}
                            className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                          >
                            <p className="text-sm font-semibold text-zinc-900">
                              {person.name || "Unresolved cast member"}
                            </p>
                            <p className="mt-1 break-all text-xs text-zinc-600">{person.url}</p>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>

                  {syncBravoRunMode !== "cast-only" && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Show Images Being Synced ({syncBravoSelectedImageSummaries.length})
                      </p>
                      {syncBravoSelectedImageSummaries.length === 0 ? (
                        <p className="text-sm text-zinc-500">No show images selected for sync.</p>
                      ) : (
                        <div className="space-y-2">
                          {syncBravoSelectedImageSummaries.map((image) => (
                            <article
                              key={image.url}
                              className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                            >
                              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded bg-zinc-100">
                                <GalleryImage src={image.url} alt={image.alt || "Selected show image"} sizes="120px" />
                              </div>
                              <div className="min-w-0">
                                <p className="line-clamp-2 text-sm font-semibold text-zinc-900">
                                  {image.alt || "Show image"}
                                </p>
                                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-zinc-500">
                                  Type: {image.kind}
                                </p>
                                <p className="mt-1 break-all text-xs text-zinc-600">{image.url}</p>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {syncBravoStep === "confirm" && (syncBravoError || syncBravoNotice) && (
                <p className={`mb-4 text-sm ${syncBravoError ? "text-red-600" : "text-zinc-600"}`}>
                  {syncBravoError || syncBravoNotice}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (syncBravoStep === "confirm") {
                      setSyncBravoStep("preview");
                      return;
                    }
                    setSyncBravoOpen(false);
                    setSyncBravoStep("preview");
                  }}
                  disabled={syncBravoLoading}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  {syncBravoStep === "confirm" ? "Back" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={syncBravoStep === "confirm" ? commitSyncByBravo : openSyncBravoConfirmStep}
                  disabled={syncBravoLoading}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {syncBravoStep === "confirm"
                    ? syncBravoCommitLoading
                      ? "Syncing..."
                      : syncBravoRunMode === "cast-only"
                        ? "Sync Cast Info only"
                        : "Sync All Info"
                    : "Next"}
                </button>
              </div>
        </AdminModal>

        <AdminModal
          isOpen={batchJobsOpen}
          onClose={() => setBatchJobsOpen(false)}
          disableClose={batchJobsRunning}
          closeLabel="Close batch jobs dialog"
          ariaLabel="Run image batch jobs"
          panelClassName="max-w-2xl p-5"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Batch Jobs
              </p>
              <h4 className="text-lg font-semibold text-zinc-900">Run Image Jobs</h4>
              <p className="mt-1 text-xs text-zinc-500">
                Select one or more operations and content types. Jobs run on the currently visible gallery assets.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!batchJobsRunning) setBatchJobsOpen(false);
              }}
              className="rounded-lg border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
              disabled={batchJobsRunning}
            >
              Close
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Operations
              </p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(BATCH_JOB_OPERATION_LABELS) as BatchJobOperation[]).map((operation) => (
                  <label
                    key={operation}
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
                  >
                    <input
                      type="checkbox"
                      checked={batchJobOperations.includes(operation)}
                      onChange={() => toggleBatchJobOperation(operation)}
                      disabled={batchJobsRunning}
                    />
                    {BATCH_JOB_OPERATION_LABELS[operation]}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Content Types
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SHOW_GALLERY_ALLOWED_SECTIONS.map((section) => (
                  <label
                    key={section}
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700"
                  >
                    <input
                      type="checkbox"
                      checked={batchJobContentSections.includes(section)}
                      onChange={() => toggleBatchJobContentSection(section)}
                      disabled={batchJobsRunning}
                    />
                    {ASSET_SECTION_LABELS[section]}
                  </label>
                ))}
              </div>
            </div>
            <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
              {showBatchPreflightSummary}
            </p>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setBatchJobsOpen(false)}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              disabled={batchJobsRunning}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={runBatchJobs}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
              disabled={batchJobsRunning}
            >
              {batchJobsRunning ? "Running..." : "Run Batch Jobs"}
            </button>
          </div>
        </AdminModal>

        <AdminModal
          isOpen={Boolean(linkEditDraft)}
          onClose={cancelShowLinkEdit}
          disableClose={linkEditSaving}
          closeLabel="Close link editor"
          ariaLabel="Edit link"
          panelClassName="max-w-lg"
        >
          {linkEditDraft && (
            <>
              <h4 className="text-lg font-semibold text-zinc-900">Edit Link</h4>
              <div className="mt-4 space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Label
                  <input
                    value={linkEditDraft.label}
                    onChange={(event) =>
                      setLinkEditDraft((prev) =>
                        prev ? { ...prev, label: event.target.value } : prev,
                      )
                    }
                    className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700"
                    placeholder="Link label"
                  />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  URL
                  <input
                    value={linkEditDraft.url}
                    onChange={(event) =>
                      setLinkEditDraft((prev) =>
                        prev ? { ...prev, url: event.target.value } : prev,
                      )
                    }
                    className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700"
                    placeholder="https://..."
                    required
                  />
                </label>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelShowLinkEdit}
                  disabled={linkEditSaving}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveEditedShowLink()}
                  disabled={linkEditSaving}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {linkEditSaving ? "Saving..." : "Save Link"}
                </button>
              </div>
            </>
          )}
        </AdminModal>

        <AdminModal
          isOpen={Boolean(roleRenameDraft)}
          onClose={cancelRoleRename}
          disableClose={roleRenameSaving}
          closeLabel="Close role rename dialog"
          ariaLabel="Rename role"
          panelClassName="max-w-md"
        >
          {roleRenameDraft && (
            <>
              <h4 className="text-lg font-semibold text-zinc-900">Rename Role</h4>
              <p className="mt-1 text-sm text-zinc-500">Current: {roleRenameDraft.originalName}</p>
              <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                New Name
                <input
                  value={roleRenameDraft.nextName}
                  onChange={(event) =>
                    setRoleRenameDraft((prev) =>
                      prev ? { ...prev, nextName: event.target.value } : prev,
                    )
                  }
                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700"
                  placeholder="Housewife"
                  required
                />
              </label>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelRoleRename}
                  disabled={roleRenameSaving}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveRenamedShowRole()}
                  disabled={roleRenameSaving}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {roleRenameSaving ? "Saving..." : "Save Role"}
                </button>
              </div>
            </>
          )}
        </AdminModal>

        <AdminModal
          isOpen={Boolean(castRoleEditDraft)}
          onClose={cancelCastRoleEditor}
          disableClose={castRoleEditSaving}
          closeLabel="Close cast role editor"
          ariaLabel="Assign cast roles"
          panelClassName="max-w-xl"
        >
          {castRoleEditDraft && (
            <>
              <h4 className="text-lg font-semibold text-zinc-900">
                Assign Roles for {castRoleEditDraft.personName}
              </h4>
              <p className="mt-1 text-sm text-zinc-500">
                Enter comma-separated role names. Missing roles will be created automatically.
              </p>
              <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Roles
                <textarea
                  value={castRoleEditDraft.roleCsv}
                  onChange={(event) =>
                    setCastRoleEditDraft((prev) =>
                      prev ? { ...prev, roleCsv: event.target.value } : prev,
                    )
                  }
                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700"
                  rows={4}
                  placeholder="Housewife, Friend Of"
                />
              </label>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelCastRoleEditor}
                  disabled={castRoleEditSaving}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveCastRoleAssignments()}
                  disabled={castRoleEditSaving}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {castRoleEditSaving ? "Saving..." : "Save Roles"}
                </button>
              </div>
            </>
          )}
        </AdminModal>

        <AdvancedFilterDrawer
          isOpen={advancedFiltersOpen}
          onClose={() => setAdvancedFiltersOpen(false)}
          filters={advancedFilters}
          onChange={setAdvancedFilters}
          availableSources={availableGallerySources}
          sortOptions={[
            { value: "newest", label: "Newest" },
            { value: "oldest", label: "Oldest" },
            { value: "source", label: "Source" },
          ]}
          defaults={{ sort: "newest" }}
          unknownTextCount={unknownTextCount}
          onDetectTextForVisible={detectTextOverlayForUnknown}
          textOverlayDetectError={textOverlayDetectError}
        />
      </div>
    </ClientOnly>
  );
}
