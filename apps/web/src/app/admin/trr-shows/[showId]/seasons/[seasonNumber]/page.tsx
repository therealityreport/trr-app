"use client";

import { useDeferredValue, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import AdminModal from "@/components/admin/AdminModal";
import SocialAdminPageHeader from "@/components/admin/SocialAdminPageHeader";
import { buildSeasonBreadcrumb, buildSeasonSocialBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { ImageLightbox } from "@/components/admin/ImageLightbox";
import { GalleryAssetEditTools } from "@/components/admin/GalleryAssetEditTools";
import { ImageScrapeDrawer } from "@/components/admin/ImageScrapeDrawer";
import { AdvancedFilterDrawer } from "@/components/admin/AdvancedFilterDrawer";
import FandomSyncModal from "@/components/admin/FandomSyncModal";
import { TmdbLinkIcon, ImdbLinkIcon } from "@/components/admin/ExternalLinks";
import SeasonSocialAnalyticsSection, {
  type SocialAnalyticsView,
} from "@/components/admin/season-social-analytics-section";
import TikTokSeasonAnalyticsSection from "@/components/admin/tiktok-season-analytics-section";
import SeasonSurveysTab from "@/components/admin/season-tabs/SeasonSurveysTab";
import SeasonOverviewTab from "@/components/admin/season-tabs/SeasonOverviewTab";
import SeasonEpisodesTab from "@/components/admin/season-tabs/SeasonEpisodesTab";
import SeasonAssetsTab from "@/components/admin/season-tabs/SeasonAssetsTab";
import SeasonVideosTab from "@/components/admin/season-tabs/SeasonVideosTab";
import SeasonFandomTab from "@/components/admin/season-tabs/SeasonFandomTab";
import SeasonCastTab from "@/components/admin/season-tabs/SeasonCastTab";
import SeasonSocialTab from "@/components/admin/season-tabs/SeasonSocialTab";
import { SeasonTabsNav } from "@/components/admin/season-tabs/SeasonTabsNav";
import ShowBrandEditor from "@/components/admin/ShowBrandEditor";
import { resolveGalleryAssetCapabilities } from "@/lib/admin/gallery-asset-capabilities";
import {
  canonicalizeCastRoleName,
  castRoleMatchesFilter,
  normalizeCastRoleList,
} from "@/lib/admin/cast-role-normalization";
import { mapSeasonAssetToMetadata, type PhotoMetadata } from "@/lib/photo-metadata";
import {
  readAdvancedFilters,
  writeAdvancedFilters,
  type AdvancedFilterState,
} from "@/lib/admin/advanced-filters";
import {
  inferHasTextOverlay,
} from "@/lib/gallery-filter-utils";
import {
  contentTypeToAssetKind,
  contentTypeToContextType,
  normalizeContentTypeToken,
} from "@/lib/media/content-type";
import {
  buildMissingVariantBreakdown,
  getMissingVariantKeys,
  hasMissingVariants,
} from "@/lib/admin/gallery-diagnostics";
import {
  type FandomDynamicSection,
  type FandomSyncOptions,
  type FandomSyncPreviewResponse,
  fandomSectionBucket,
  normalizeFandomDynamicSections,
  normalizeFandomSyncPreviewResponse,
} from "@/lib/admin/fandom-sync-types";
import { applyAdvancedFiltersToSeasonAssets } from "@/lib/gallery-advanced-filtering";
import {
  THUMBNAIL_DEFAULTS,
  isThumbnailCropMode,
  parseThumbnailCrop,
  resolveThumbnailPresentation,
} from "@/lib/thumbnail-crop";
import {
  ASSET_SECTION_LABELS,
  ASSET_SECTION_ORDER,
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
import { getClientAuthHeaders } from "@/lib/admin/client-auth";
import {
  buildPersonAdminUrl,
  buildPersonRouteSlug,
  buildShowAdminUrl,
  buildSeasonAdminUrl,
  cleanLegacyRoutingQuery,
  parseSeasonEpisodeNumberFromPath,
  parseSeasonSocialPathFilters,
  parseSocialAnalyticsViewFromPath,
  parseSeasonSocialPathSegment,
  parseSeasonRouteState,
} from "@/lib/admin/show-admin-routes";
import { recordAdminRecentShow } from "@/lib/admin/admin-recent-shows";
import { resolvePreferredShowRouteSlug } from "@/lib/admin/show-route-slug";
import {
  parseSeasonCastRouteState,
  writeShowCastRouteState,
  writeSeasonCastRouteState,
} from "@/lib/admin/cast-route-state";
import {
  AdminRequestError,
  adminStream,
  adminGetJson,
  adminMutation,
  fetchWithTimeout,
} from "@/lib/admin/admin-fetch";
import { fetchAllPaginatedGalleryRowsWithMeta } from "@/lib/admin/paginated-gallery-fetch";
import { useSeasonCore } from "@/lib/admin/season-page/use-season-core";
import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";

interface TrrShow {
  id: string;
  name: string;
  slug: string;
  canonical_slug: string;
  alternative_names?: string[];
  imdb_id: string | null;
  tmdb_id: number | null;
}

function seasonFandomStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" && item.trim().length > 0 ? item.trim() : null))
    .filter((item): item is string => Boolean(item));
}

function SeasonFandomSectionCard({ title, section }: { title: string; section: FandomDynamicSection }) {
  const paragraphs = seasonFandomStringList(section.paragraphs);
  const bullets = seasonFandomStringList(section.bullets);
  const tableRows = Array.isArray(section.table_rows) ? section.table_rows : [];
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{title}</p>
      {paragraphs.length > 0 && (
        <div className="space-y-2 text-sm text-zinc-700">
          {paragraphs.map((paragraph, idx) => (
            <p key={`${title}-p-${idx}`}>{paragraph}</p>
          ))}
        </div>
      )}
      {bullets.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
          {bullets.map((bullet, idx) => (
            <li key={`${title}-b-${idx}`}>{bullet}</li>
          ))}
        </ul>
      )}
      {tableRows.length > 0 && (
        <pre className="mt-2 overflow-auto text-xs text-zinc-700">{JSON.stringify(tableRows, null, 2)}</pre>
      )}
    </div>
  );
}

function SeasonFandomDynamicSections({ sections }: { sections: unknown }) {
  const normalized = normalizeFandomDynamicSections(sections);
  if (normalized.length === 0) return null;

  const canonical = normalized.filter((section) => fandomSectionBucket(section) !== "other");
  const otherSections = normalized.filter((section) => fandomSectionBucket(section) === "other");

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        {canonical.map((section, idx) => (
          <SeasonFandomSectionCard
            key={`${section.title ?? section.canonical_title ?? "canonical"}-${idx}`}
            title={String(section.canonical_title ?? section.title ?? `Section ${idx + 1}`)}
            section={section}
          />
        ))}
      </div>
      {otherSections.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Other Sections</p>
          <div className="grid gap-3 lg:grid-cols-2">
            {otherSections.map((section, idx) => (
              <SeasonFandomSectionCard
                key={`${section.title ?? section.canonical_title ?? "section"}-${idx}`}
                title={String(section.title ?? section.canonical_title ?? `Section ${idx + 1}`)}
                section={section}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface TrrSeason {
  id: string;
  show_id: string;
  season_number: number;
  name: string | null;
  title: string | null;
  overview: string | null;
  air_date: string | null;
  premiere_date: string | null;
  tmdb_season_id: number | null;
}

interface TrrEpisode {
  id: string;
  season_number: number;
  episode_number: number;
  title: string | null;
  synopsis: string | null;
  overview: string | null;
  air_date: string | null;
  runtime: number | null;
  imdb_rating: number | null;
  imdb_vote_count: number | null;
  tmdb_vote_average: number | null;
  tmdb_vote_count: number | null;
  url_original_still: string | null;
  tmdb_episode_id: number | null;
  imdb_episode_id: string | null;
}

interface SeasonCastMember {
  person_id: string;
  person_name: string | null;
  episodes_in_season: number;
  archive_episodes_in_season?: number | null;
  total_episodes: number | null;
  photo_url: string | null;
  thumbnail_focus_x?: number | null;
  thumbnail_focus_y?: number | null;
  thumbnail_zoom?: number | null;
  thumbnail_crop_mode?: "manual" | "auto" | null;
}

interface TrrShowCastMember {
  person_id: string;
  full_name: string | null;
  cast_member_name: string | null;
  role: string | null;
  credit_category: string;
  photo_url: string | null;
  cover_photo_url: string | null;
}

interface CastRoleMember {
  person_id: string;
  person_name: string | null;
  total_episodes: number | null;
  latest_season: number | null;
  roles: string[];
  photo_url: string | null;
}

type CastRunFailedMember = {
  personId: string;
  name: string;
  reason: string;
};

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
}

interface TrrSeasonFandom {
  id: string;
  source: string;
  source_url: string;
  page_title: string | null;
  scraped_at: string;
  summary: string | null;
  dynamic_sections?: unknown[] | null;
  citations?: unknown[] | null;
  conflicts?: unknown[] | null;
  source_variants?: unknown;
}

type TabId = "overview" | "episodes" | "assets" | "news" | "fandom" | "cast" | "surveys" | "social";
type SeasonCastSource = "season_evidence" | "show_fallback";
type GalleryDiagnosticFilter = "all" | "missing-variants" | "oversized" | "unclassified";
type RefreshProgressState = {
  stage?: string | null;
  message?: string | null;
  current: number | null;
  total: number | null;
  requestId?: string | null;
};
type SeasonRefreshLogLevel = "info" | "success" | "error";
type SeasonRefreshLogScope = "assets" | "cast" | "cast_enrich" | "image";
type SeasonRefreshLogEntry = {
  id: number;
  ts: number;
  scope: SeasonRefreshLogScope;
  stage: string;
  message: string;
  requestId?: string | null;
  detail?: string | null;
  response?: string | null;
  level: SeasonRefreshLogLevel;
  current?: number | null;
  total?: number | null;
};

type EpisodeCoverageRow = {
  episodeId: string;
  episodeNumber: number;
  title: string | null;
  hasStill: boolean;
  hasDescription: boolean;
  hasAirDate: boolean;
  hasRuntime: boolean;
};

const SEASON_PAGE_TABS: ReadonlyArray<{ id: TabId; label: string; icon?: "home" }> = [
  { id: "overview", label: "Home", icon: "home" },
  { id: "episodes", label: "Episodes" },
  { id: "assets", label: "Assets" },
  { id: "news", label: "News" },
  { id: "fandom", label: "Fandom" },
  { id: "cast", label: "Cast" },
  { id: "surveys", label: "Surveys" },
  { id: "social", label: "Social Media" },
];

const SEASON_REFRESH_STAGE_LABELS: Record<string, string> = {
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
const SEASON_STREAM_IDLE_TIMEOUT_MS = 600_000;
const SEASON_STREAM_MAX_DURATION_MS = 12 * 60 * 1000;
const SEASON_REFRESH_FALLBACK_TIMEOUT_MS = 5 * 60 * 1000;
const SEASON_ASSET_LOAD_TIMEOUT_MS = 60_000;
const SEASON_ASSET_PAGE_SIZE = 500;
const SEASON_ASSET_MAX_PAGES = 30;
const SEASON_CAST_LOAD_TIMEOUT_MS = 60_000;
const SEASON_PERSON_STREAM_IDLE_TIMEOUT_MS = 600_000;
const SEASON_PERSON_STREAM_MAX_DURATION_MS = 6 * 60 * 1000;
const SEASON_ASSET_PIPELINE_STEP_TIMEOUT_MS = 8 * 60 * 1000;
const SEASON_CAST_ROLE_MEMBERS_LOAD_TIMEOUT_MS = 120_000;
const SEASON_CAST_ROLE_MEMBERS_MAX_ATTEMPTS = 2;
const SEASON_CAST_PROFILE_SYNC_CONCURRENCY = 3;
const SEASON_CAST_INCREMENTAL_INITIAL_LIMIT = 48;
const SEASON_CAST_INCREMENTAL_BATCH_SIZE = 48;
const SEASON_BRAVO_VIDEO_THUMBNAIL_SYNC_TIMEOUT_MS = 90_000;
const MAX_SEASON_REFRESH_LOG_ENTRIES = 180;

const SEASON_SOCIAL_ANALYTICS_VIEWS: Array<{ id: SocialAnalyticsView; label: string }> = [
  { id: "tiktok-overview", label: "TIKTOK OVERVIEW" },
  { id: "tiktok-cast", label: "TIKTOK CAST" },
  { id: "tiktok-hashtags", label: "TIKTOK HASHTAGS" },
  { id: "tiktok-sounds", label: "TIKTOK SOUNDS" },
  { id: "tiktok-health", label: "TIKTOK CONTENT HEALTH" },
  { id: "tiktok-sentiment", label: "TIKTOK SENTIMENT" },
  { id: "bravo", label: "OFFICIAL ANALYTICS (LEGACY)" },
  { id: "sentiment", label: "SENTIMENT ANALYSIS" },
  { id: "hashtags", label: "HASHTAGS ANALYSIS" },
  { id: "advanced", label: "ADVANCED ANALYTICS" },
  { id: "reddit", label: "REDDIT ANALYTICS" },
];

const isSocialAnalyticsView = (value: string | null | undefined): value is SocialAnalyticsView => {
  if (!value) return false;
  return SEASON_SOCIAL_ANALYTICS_VIEWS.some((item) => item.id === value);
};

const normalizeSocialAnalyticsViewInput = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "official") return "bravo";
  return normalized;
};

const formatSocialAnalyticsViewLabel = (view: SocialAnalyticsView): string => {
  if (view === "bravo") return "Official (Legacy)";
  if (view === "tiktok-overview") return "TikTok Overview";
  if (view === "tiktok-cast") return "TikTok Cast";
  if (view === "tiktok-hashtags") return "TikTok Hashtags";
  if (view === "tiktok-sounds") return "TikTok Sounds";
  if (view === "tiktok-health") return "TikTok Content Health";
  if (view === "tiktok-sentiment") return "TikTok Sentiment";
  return `${view.charAt(0).toUpperCase()}${view.slice(1)}`;
};

const isTikTokAnalyticsView = (view: SocialAnalyticsView): view is
  | "tiktok-overview"
  | "tiktok-cast"
  | "tiktok-hashtags"
  | "tiktok-sounds"
  | "tiktok-health"
  | "tiktok-sentiment" => view.startsWith("tiktok-");

const BATCH_JOB_OPERATION_LABELS = {
  count: "Count",
  crop: "Crop",
  id_text: "ID Text",
  resize: "Auto-Crop",
} as const;

type BatchJobOperation = keyof typeof BATCH_JOB_OPERATION_LABELS;

const DEFAULT_BATCH_JOB_OPERATIONS: BatchJobOperation[] = ["count"];
const DEFAULT_BATCH_JOB_CONTENT_SECTIONS: AssetSectionKey[] = ASSET_SECTION_ORDER.filter(
  (section) => section !== "other"
);

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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const looksLikeUuid = (value: string): boolean => UUID_RE.test(value);

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

const summarizeRefreshTargetResult = (
  payload: unknown,
  target: "photos" | "cast_credits"
): string | null => {
  if (!payload || typeof payload !== "object") return null;
  const resultsRaw = (payload as { results?: unknown }).results;
  if (!resultsRaw || typeof resultsRaw !== "object") return null;
  const stepRaw = (resultsRaw as Record<string, unknown>)[target];
  if (!stepRaw || typeof stepRaw !== "object") return null;
  const status = typeof (stepRaw as { status?: unknown }).status === "string"
    ? (stepRaw as { status: string }).status
    : "ok";
  const durationMs = toFiniteNumber((stepRaw as { duration_ms?: unknown }).duration_ms);
  const errorText = typeof (stepRaw as { error?: unknown }).error === "string"
    ? (stepRaw as { error: string }).error
    : null;
  const parts: string[] = [`status: ${status}`];
  if (durationMs !== null) parts.push(`duration: ${Math.round(durationMs)}ms`);
  if (errorText) parts.push(`error: ${errorText}`);
  return parts.join(" · ");
};

const summarizePhotoStreamCompletion = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") return null;
  const readMetric = (key: string): number | null =>
    toFiniteNumber((payload as Record<string, unknown>)[key]);
  const fetched = readMetric("cast_photos_fetched");
  const upserted = readMetric("cast_photos_upserted");
  const mirrored = readMetric("cast_photos_mirrored");
  const failed = readMetric("cast_photos_failed");
  const sourcesSkipped = readMetric("sources_skipped");
  const durationMs = readMetric("duration_ms");
  const parts: string[] = [];
  if (fetched !== null) parts.push(`fetched: ${Math.round(fetched)}`);
  if (upserted !== null) parts.push(`upserted: ${Math.round(upserted)}`);
  if (mirrored !== null) parts.push(`mirrored: ${Math.round(mirrored)}`);
  if (failed !== null && failed > 0) parts.push(`failed: ${Math.round(failed)}`);
  if (sourcesSkipped !== null && sourcesSkipped > 0) {
    parts.push(`sources skipped: ${Math.round(sourcesSkipped)}`);
  }
  if (durationMs !== null) parts.push(`duration: ${Math.round(durationMs)}ms`);
  return parts.length > 0 ? parts.join(" · ") : null;
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

function GalleryImage({
  src,
  srcCandidates,
  diagnosticKey,
  onFallbackEvent,
  alt,
  sizes = "200px",
  className = "object-cover",
  style,
}: {
  src: string;
  srcCandidates?: string[];
  diagnosticKey?: string;
  onFallbackEvent?: (event: "attempt" | "recovered" | "failed") => void;
  alt: string;
  sizes?: string;
  className?: string;
  style?: React.CSSProperties;
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
      console.warn("[season-gallery] all image URL candidates failed", {
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
  );
}

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

function RefreshActivityLog({
  title,
  entries,
  scopes,
  open,
  onToggle,
}: {
  title: string;
  entries: SeasonRefreshLogEntry[];
  scopes: SeasonRefreshLogScope[];
  open: boolean;
  onToggle: () => void;
}) {
  const filtered = entries.filter((entry) => scopes.includes(entry.scope));
  return (
    <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
          {title} ({filtered.length})
        </p>
        <span className="text-xs font-semibold text-zinc-500">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-zinc-500">No refresh activity yet.</p>
          ) : (
            filtered.map((entry) => {
              const toneClass =
                entry.level === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : entry.level === "error"
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-zinc-200 bg-white text-zinc-800";
              return (
                <div key={entry.id} className={`rounded-md border px-2 py-2 text-xs ${toneClass}`}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-semibold uppercase tracking-[0.14em]">
                      {entry.stage.replace(/[_-]+/g, " ")}
                    </span>
                    <span className="tabular-nums opacity-80">
                      {new Date(entry.ts).toLocaleTimeString()}
                    </span>
                  </div>
                  <p>{entry.requestId ? `[req:${entry.requestId}] ${entry.message}` : entry.message}</p>
                  {typeof entry.current === "number" &&
                    typeof entry.total === "number" &&
                    Number.isFinite(entry.current) &&
                    Number.isFinite(entry.total) && (
                      <p className="mt-1 opacity-80">
                        Progress: {entry.current}/{entry.total}
                      </p>
                    )}
                  {entry.response && <p className="mt-1 opacity-80">Response: {entry.response}</p>}
                  {entry.detail && <p className="mt-1 opacity-80">Detail: {entry.detail}</p>}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function mapEpisodeToMetadata(episode: TrrEpisode, showName?: string): PhotoMetadata {
  const fileTypeMatch = episode.url_original_still?.match(/\.([a-z0-9]+)$/i);
  const fileType = fileTypeMatch ? fileTypeMatch[1].toLowerCase() : null;
  const createdAt = episode.air_date ? new Date(episode.air_date) : null;
  return {
    source: "tmdb",
    sourceBadgeColor: "#01d277",
    fileType,
    caption: episode.title || `Episode ${episode.episode_number}`,
    dimensions: null,
    createdAt,
    season: episode.season_number,
    contextType: `Episode ${episode.episode_number}`,
    people: [],
    titles: showName ? [showName] : [],
    fetchedAt: null,
  };
}

export default function SeasonDetailPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showRouteParam = params.showId as string;
  const seasonNumberParam = params.seasonNumber as string;
  const seasonNumber = Number.parseInt(seasonNumberParam, 10);
  const {
    setResolvedShowId,
    slugResolutionLoading,
    setSlugResolutionLoading,
    slugResolutionError,
    setSlugResolutionError,
    showId,
    activeSeasonRequestKeyRef,
    seasonLoadRequestIdRef,
  } = useSeasonCore<TrrShow, TrrSeason, TrrEpisode>(showRouteParam, seasonNumberParam);
  const { user, checking, hasAccess } = useAdminGuard();
  const isCurrentSeasonRequest = useCallback(
    (requestKey: string, requestId?: number) =>
      activeSeasonRequestKeyRef.current === requestKey &&
      (typeof requestId !== "number" || seasonLoadRequestIdRef.current === requestId),
    [activeSeasonRequestKeyRef, seasonLoadRequestIdRef]
  );

  useEffect(() => {
    activeSeasonRequestKeyRef.current = `${showId}:${seasonNumber}`;
    bravoVideoSyncAttemptedRef.current = false;
    bravoVideoSyncInFlightRef.current = null;
    setBravoVideoSyncWarning(null);
    setBravoVideoSyncing(false);
  }, [activeSeasonRequestKeyRef, seasonNumber, showId]);

  const [show, setShow] = useState<TrrShow | null>(null);
  const [season, setSeason] = useState<TrrSeason | null>(null);
  const [showSeasons, setShowSeasons] = useState<TrrSeason[]>([]);
  const [episodes, setEpisodes] = useState<TrrEpisode[]>([]);
  const [assets, setAssets] = useState<SeasonAsset[]>([]);
  const [assetsVisibleCount, setAssetsVisibleCount] = useState(120);
  const [assetsTruncatedWarning, setAssetsTruncatedWarning] = useState<string | null>(null);
  const [galleryFallbackTelemetry, setGalleryFallbackTelemetry] = useState({
    fallbackRecoveredCount: 0,
    allCandidatesFailedCount: 0,
    totalImageAttempts: 0,
  });
  const [cast, setCast] = useState<SeasonCastMember[]>([]);
  const [seasonCastSource, setSeasonCastSource] = useState<SeasonCastSource>("season_evidence");
  const [seasonCastEligibilityWarning, setSeasonCastEligibilityWarning] = useState<string | null>(null);
  const [archiveCast, setArchiveCast] = useState<SeasonCastMember[]>([]);
  const [bravoVideos, setBravoVideos] = useState<BravoVideoItem[]>([]);
  const [bravoVideosLoading, setBravoVideosLoading] = useState(false);
  const [bravoVideosError, setBravoVideosError] = useState<string | null>(null);
  const [bravoVideoSyncing, setBravoVideoSyncing] = useState(false);
  const [bravoVideoSyncWarning, setBravoVideoSyncWarning] = useState<string | null>(null);
  const bravoVideoSyncAttemptedRef = useRef(false);
  const bravoVideoSyncInFlightRef = useRef<Promise<boolean> | null>(null);
  const [seasonFandomData, setSeasonFandomData] = useState<TrrSeasonFandom[]>([]);
  const [seasonFandomLoading, setSeasonFandomLoading] = useState(false);
  const [seasonFandomError, setSeasonFandomError] = useState<string | null>(null);
  const [fandomSyncOpen, setFandomSyncOpen] = useState(false);
  const [fandomSyncPreview, setFandomSyncPreview] = useState<FandomSyncPreviewResponse | null>(null);
  const [fandomSyncPreviewLoading, setFandomSyncPreviewLoading] = useState(false);
  const [fandomSyncCommitLoading, setFandomSyncCommitLoading] = useState(false);
  const [fandomSyncError, setFandomSyncError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [assetsView, setAssetsView] = useState<"images" | "videos" | "branding">("images");
  const [allowPlaceholderMediaOverride, setAllowPlaceholderMediaOverride] = useState(false);
  const [galleryDiagnosticFilter, setGalleryDiagnosticFilter] =
    useState<GalleryDiagnosticFilter>("all");
  const [galleryDiagnosticsOpen, setGalleryDiagnosticsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seasonSupplementalWarning, setSeasonSupplementalWarning] = useState<string | null>(null);
  const [refreshingAssets, setRefreshingAssets] = useState(false);
  const [assetsRefreshNotice, setAssetsRefreshNotice] = useState<string | null>(null);
  const [assetsRefreshError, setAssetsRefreshError] = useState<string | null>(null);
  const [assetsRefreshProgress, setAssetsRefreshProgress] = useState<RefreshProgressState | null>(
    null
  );
  const [assetsRefreshLiveCounts, setAssetsRefreshLiveCounts] = useState<JobLiveCounts | null>(null);
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
  const [assetsRefreshLogOpen, setAssetsRefreshLogOpen] = useState(false);
  const [refreshingCast, setRefreshingCast] = useState(false);
  const [enrichingCast, setEnrichingCast] = useState(false);
  const [castRefreshNotice, setCastRefreshNotice] = useState<string | null>(null);
  const [castRefreshError, setCastRefreshError] = useState<string | null>(null);
  const [castEnrichNotice, setCastEnrichNotice] = useState<string | null>(null);
  const [castEnrichError, setCastEnrichError] = useState<string | null>(null);
  const [castRefreshProgress, setCastRefreshProgress] = useState<RefreshProgressState | null>(
    null
  );
  const [castRefreshLogOpen, setCastRefreshLogOpen] = useState(false);
  const [castRunFailedMembers, setCastRunFailedMembers] = useState<CastRunFailedMember[]>([]);
  const [castFailedMembersOpen, setCastFailedMembersOpen] = useState(false);
  const [refreshLogEntries, setRefreshLogEntries] = useState<SeasonRefreshLogEntry[]>([]);
  const refreshLogCounterRef = useRef(0);
  const seasonRefreshRequestCounterRef = useRef(0);
  const [trrShowCast, setTrrShowCast] = useState<TrrShowCastMember[]>([]);
  const [trrShowCastLoading, setTrrShowCastLoading] = useState(false);
  const [trrShowCastError, setTrrShowCastError] = useState<string | null>(null);
  const [castRoleMembers, setCastRoleMembers] = useState<CastRoleMember[]>([]);
  const [castRoleMembersLoadedOnce, setCastRoleMembersLoadedOnce] = useState(false);
  const [castRoleMembersLoading, setCastRoleMembersLoading] = useState(false);
  const [castRoleMembersError, setCastRoleMembersError] = useState<string | null>(null);
  const [castRoleMembersWarning, setCastRoleMembersWarning] = useState<string | null>(null);
  const [lastSuccessfulCastRoleMembersAt, setLastSuccessfulCastRoleMembersAt] = useState<number | null>(
    null
  );
  const [castSortBy, setCastSortBy] = useState<"episodes" | "season" | "name">("episodes");
  const [castSortOrder, setCastSortOrder] = useState<"desc" | "asc">("desc");
  const [castRoleFilters, setCastRoleFilters] = useState<string[]>([]);
  const [castCreditFilters, setCastCreditFilters] = useState<string[]>([]);
  const [castHasImageFilter, setCastHasImageFilter] = useState<"all" | "yes" | "no">("all");
  const [castSearchQuery, setCastSearchQuery] = useState("");
  const [castSearchQueryDebounced, setCastSearchQueryDebounced] = useState("");
  const [castRenderLimit, setCastRenderLimit] = useState(SEASON_CAST_INCREMENTAL_INITIAL_LIMIT);
  const [crewRenderLimit, setCrewRenderLimit] = useState(SEASON_CAST_INCREMENTAL_INITIAL_LIMIT);
  const castIncrementalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [refreshingPersonIds, setRefreshingPersonIds] = useState<Record<string, boolean>>({});
  const [refreshingPersonProgress, setRefreshingPersonProgress] = useState<
    Record<string, RefreshProgressState>
  >({});
  const showCastFetchAttemptedRef = useRef(false);
  const castRoleMembersLoadInFlightRef = useRef<Promise<void> | null>(null);
  const castRoleMembersLoadedOnceRef = useRef(false);

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
  const castRoleMembersSnapshotRef = useRef<CastRoleMember[]>([]);
  const castRefreshAbortControllerRef = useRef<AbortController | null>(null);
  const castEnrichAbortControllerRef = useRef<AbortController | null>(null);
  const personRefreshAbortControllersRef = useRef<Record<string, AbortController>>({});
  const appendRefreshLog = useCallback(
    (
      entry: Omit<SeasonRefreshLogEntry, "id" | "ts"> & {
        ts?: number;
      }
    ) => {
      const id = ++refreshLogCounterRef.current;
      const ts = typeof entry.ts === "number" ? entry.ts : Date.now();
      setRefreshLogEntries((prev) =>
        [{ ...entry, id, ts }, ...prev].slice(0, MAX_SEASON_REFRESH_LOG_ENTRIES)
      );
    },
    []
  );

  const buildSeasonRefreshRequestId = useCallback(() => {
    const counter = ++seasonRefreshRequestCounterRef.current;
    const timestampToken = Date.now().toString(36);
    const showToken = String(showId || "unknown")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32);
    const seasonToken = Number.isFinite(seasonNumber) ? String(seasonNumber) : "na";
    return `season-refresh-${showToken}-s${seasonToken}-${timestampToken}-${counter}`;
  }, [seasonNumber, showId]);

  useEffect(() => {
    castRoleMembersLoadedOnceRef.current = castRoleMembersLoadedOnce;
  }, [castRoleMembersLoadedOnce]);

  useEffect(() => {
    castRoleMembersSnapshotRef.current = castRoleMembers;
  }, [castRoleMembers]);

  const [episodeLightbox, setEpisodeLightbox] = useState<{
    episode: TrrEpisode;
    index: number;
    seasonEpisodes: TrrEpisode[];
  } | null>(null);
  const episodeTriggerRef = useRef<HTMLElement | null>(null);

  const [assetLightbox, setAssetLightbox] = useState<{
    asset: SeasonAsset;
    index: number;
    filteredAssets: SeasonAsset[];
  } | null>(null);
  const assetTriggerRef = useRef<HTMLElement | null>(null);

  const [scrapeDrawerOpen, setScrapeDrawerOpen] = useState(false);
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

  const seasonRouteState = useMemo(
    () => parseSeasonRouteState(pathname, new URLSearchParams(searchParams.toString())),
    [pathname, searchParams]
  );
  const seasonEpisodeNumberFromPath = useMemo(
    () => parseSeasonEpisodeNumberFromPath(pathname),
    [pathname],
  );
  const seasonSocialPathSegment = useMemo(
    () => parseSeasonSocialPathSegment(pathname),
    [pathname],
  );
  const seasonSocialPathFilters = useMemo(
    () => parseSeasonSocialPathFilters(pathname),
    [pathname],
  );
  const seasonCastRouteState = useMemo(
    () => parseSeasonCastRouteState(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );
  const focusEpisodeParam = useMemo(() => {
    const value = searchParams.get("focusEpisode");
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, [searchParams]);
  const abortInFlightPersonRefreshRuns = useCallback(() => {
    for (const controller of Object.values(personRefreshAbortControllersRef.current)) {
      controller.abort();
    }
    personRefreshAbortControllersRef.current = {};
  }, []);

  useEffect(() => {
    setActiveTab(seasonRouteState.tab);
    if (seasonRouteState.tab === "assets") {
      setAssetsView(seasonRouteState.assetsSubTab);
    }
  }, [seasonRouteState.assetsSubTab, seasonRouteState.tab]);

  const [focusedEpisodeId, setFocusedEpisodeId] = useState<string | null>(null);
  const episodeRowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (seasonRouteState.tab !== "episodes") return;
    if (!focusEpisodeParam) {
      setFocusedEpisodeId(null);
      return;
    }
    const hasTargetEpisode = episodes.some((episode) => episode.id === focusEpisodeParam);
    if (!hasTargetEpisode) {
      setFocusedEpisodeId(null);
      return;
    }

    setFocusedEpisodeId(focusEpisodeParam);

    const scrollTimer = window.setTimeout(() => {
      const targetRow = episodeRowRefs.current[focusEpisodeParam];
      targetRow?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);

    const clearTimer = window.setTimeout(() => {
      setFocusedEpisodeId((current) => (current === focusEpisodeParam ? null : current));
    }, 2600);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [episodes, focusEpisodeParam, seasonRouteState.tab]);

  useEffect(() => {
    setCastSortBy(seasonCastRouteState.sortBy);
    setCastSortOrder(seasonCastRouteState.sortOrder);
    setCastHasImageFilter(seasonCastRouteState.hasImageFilter);
    setCastRoleFilters((prev) =>
      areStringArraysEqual(prev, seasonCastRouteState.roleFilters)
        ? prev
        : seasonCastRouteState.roleFilters
    );
    setCastCreditFilters((prev) =>
      areStringArraysEqual(prev, seasonCastRouteState.creditFilters)
        ? prev
        : seasonCastRouteState.creditFilters
    );
    setCastSearchQuery(seasonCastRouteState.searchQuery);
  }, [
    seasonCastRouteState.creditFilters,
    seasonCastRouteState.hasImageFilter,
    seasonCastRouteState.roleFilters,
    seasonCastRouteState.searchQuery,
    seasonCastRouteState.sortBy,
    seasonCastRouteState.sortOrder,
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

  useEffect(() => {
    if (!showSlugForRouting) return;
    if (Number.isFinite(seasonNumber) && seasonNumber > 0) return;
    router.replace(
      buildShowAdminUrl({ showSlug: showSlugForRouting, tab: "seasons" }) as Route,
      { scroll: false },
    );
  }, [router, seasonNumber, showSlugForRouting]);

  useEffect(() => {
    if (!show?.name || !showSlugForRouting) return;
    recordAdminRecentShow({
      slug: showSlugForRouting,
      label: show.name,
    });
  }, [show?.name, showSlugForRouting]);
  const seasonCanonicalReplaceRef = useRef<string | null>(null);

  const setTab = useCallback(
    (tab: TabId) => {
      setActiveTab(tab);
      const preservedQuery = cleanLegacyRoutingQuery(new URLSearchParams(searchParams.toString()));
      router.replace(
        buildSeasonAdminUrl({
          showSlug: showSlugForRouting,
          seasonNumber,
          tab,
          assetsSubTab: tab === "assets" ? assetsView : undefined,
          query: preservedQuery,
        }) as Route,
        { scroll: false }
      );
    },
    [assetsView, router, searchParams, seasonNumber, showSlugForRouting]
  );

  const setAssetsSubTab = useCallback(
    (view: "images" | "videos" | "branding") => {
      setAssetsView(view);
      const preservedQuery = cleanLegacyRoutingQuery(new URLSearchParams(searchParams.toString()));
      router.replace(
        buildSeasonAdminUrl({
          showSlug: showSlugForRouting,
          seasonNumber,
          tab: "assets",
          assetsSubTab: view,
          query: preservedQuery,
        }) as Route,
        { scroll: false }
      );
    },
    [router, searchParams, seasonNumber, showSlugForRouting]
  );

  useEffect(() => {
    if (activeTab !== "cast") return;
    const currentQuery = new URLSearchParams(searchParams.toString());
    const nextQuery = writeSeasonCastRouteState(currentQuery, {
      searchQuery: castSearchQueryDebounced,
      sortBy: castSortBy,
      sortOrder: castSortOrder,
      hasImageFilter: castHasImageFilter,
      roleFilters: castRoleFilters,
      creditFilters: castCreditFilters,
    });
    const nextUrl = buildSeasonAdminUrl({
      showSlug: showSlugForRouting,
      seasonNumber,
      tab: "cast",
      query: nextQuery,
    });
    const currentUrl = currentQuery.toString() ? `${pathname}?${currentQuery.toString()}` : pathname;
    if (nextUrl === currentUrl) return;
    router.replace(nextUrl as Route, { scroll: false });
  }, [
    activeTab,
    castCreditFilters,
    castHasImageFilter,
    castRoleFilters,
    castSearchQueryDebounced,
    castSortBy,
    castSortOrder,
    pathname,
    router,
    searchParams,
    seasonNumber,
    showSlugForRouting,
  ]);

  const socialAnalyticsView = useMemo<SocialAnalyticsView>(() => {
    const queryValue = normalizeSocialAnalyticsViewInput(searchParams.get("social_view"));
    if (isSocialAnalyticsView(queryValue)) return queryValue;
    const pathValue = normalizeSocialAnalyticsViewInput(parseSocialAnalyticsViewFromPath(pathname));
    return isSocialAnalyticsView(pathValue) ? pathValue : "tiktok-overview";
  }, [pathname, searchParams]);

  const setSocialAnalyticsView = useCallback(
    (view: SocialAnalyticsView) => {
      const nextQuery = cleanLegacyRoutingQuery(new URLSearchParams(searchParams.toString()));
      nextQuery.delete("social_platform");
      if (view === "bravo") {
        nextQuery.delete("social_view");
      } else {
        nextQuery.set("social_view", view);
      }
      router.replace(
        buildSeasonAdminUrl({
          showSlug: showSlugForRouting,
          seasonNumber,
          tab: "social",
          query: nextQuery,
          socialRoute: {
            weekIndex: seasonSocialPathFilters?.weekIndex,
            platform: seasonSocialPathFilters?.platform,
            handle: seasonSocialPathFilters?.handle,
          },
        }) as Route,
        { scroll: false }
      );
    },
    [router, searchParams, seasonNumber, showSlugForRouting, seasonSocialPathFilters]
  );

  const [addBackdropsOpen, setAddBackdropsOpen] = useState(false);
  const [unassignedBackdrops, setUnassignedBackdrops] = useState<
    Array<{
      media_asset_id: string;
      hosted_url: string | null;
      source_url: string | null;
      display_url: string;
      width: number | null;
      height: number | null;
      caption: string | null;
      fetched_at: string | null;
      metadata: Record<string, unknown> | null;
    }>
  >([]);
  const [backdropsLoading, setBackdropsLoading] = useState(false);
  const [backdropsError, setBackdropsError] = useState<string | null>(null);
  const [selectedBackdropIds, setSelectedBackdropIds] = useState<Set<string>>(new Set());
  const [assigningBackdrops, setAssigningBackdrops] = useState(false);

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
            const response = await fetch(
              `/api/admin/trr-api/shows/resolve-slug?slug=${encodeURIComponent(raw)}`,
              { headers, cache: "no-store" }
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
    user,
  ]);

  useEffect(() => {
    if (!showSlugForRouting) return;
    const isEpisodeSocialPath =
      seasonRouteState.tab === "social" &&
      seasonEpisodeNumberFromPath != null &&
      seasonSocialPathSegment != null;
    if (isEpisodeSocialPath) {
      return;
    }

    const preservedQuery = cleanLegacyRoutingQuery(new URLSearchParams(searchParams.toString()));
    if (seasonRouteState.tab === "social") {
      preservedQuery.delete("social_platform");
      if (socialAnalyticsView === "bravo") {
        preservedQuery.delete("social_view");
      } else {
        preservedQuery.set("social_view", socialAnalyticsView);
      }
    }
    const canonicalRouteUrl = buildSeasonAdminUrl({
      showSlug: showSlugForRouting,
      seasonNumber,
      tab: seasonRouteState.tab,
      assetsSubTab: seasonRouteState.assetsSubTab,
      query: preservedQuery,
      socialView: seasonRouteState.tab === "social" ? socialAnalyticsView : undefined,
      socialRoute:
        seasonRouteState.tab === "social"
          ? {
              weekIndex: seasonSocialPathFilters?.weekIndex,
              platform: seasonSocialPathFilters?.platform,
              handle: seasonSocialPathFilters?.handle,
            }
          : undefined,
    });
    const currentHasLegacyRoutingQuery =
      searchParams.has("tab") || searchParams.has("assets") || searchParams.has("social_platform");
    const canonicalPath = canonicalRouteUrl.split("?")[0] ?? canonicalRouteUrl;
    const currentPath = pathname;
    const pathMismatch = currentPath !== canonicalPath;
    if (!pathMismatch && !currentHasLegacyRoutingQuery) {
      seasonCanonicalReplaceRef.current = null;
      return;
    }

    const currentCleanedQuery = preservedQuery.toString();
    const canonicalQuery = canonicalRouteUrl.includes("?")
      ? (canonicalRouteUrl.split("?")[1] ?? "")
      : "";
    if (!pathMismatch && currentCleanedQuery === canonicalQuery) {
      seasonCanonicalReplaceRef.current = null;
      return;
    }
    if (seasonCanonicalReplaceRef.current === canonicalRouteUrl) return;
    seasonCanonicalReplaceRef.current = canonicalRouteUrl;
    router.replace(canonicalRouteUrl as Route, { scroll: false });
  }, [
    pathname,
    router,
    searchParams,
    seasonNumber,
    showSlugForRouting,
    socialAnalyticsView,
    seasonEpisodeNumberFromPath,
    seasonSocialPathFilters,
    seasonSocialPathSegment,
    seasonRouteState.assetsSubTab,
    seasonRouteState.tab,
  ]);
  const fetchShowCastForBrand = useCallback(async () => {
    if (!showId) return;
    setTrrShowCastError(null);
    setTrrShowCastLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/shows/${showId}/cast?limit=500&photo_fallback=none&exclude_zero_episode_members=1`,
        {
          headers,
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data as { error?: string }).error || "Failed to fetch show cast");
      }
      const nextCast = Array.isArray((data as { cast?: unknown }).cast)
        ? ((data as { cast: unknown[] }).cast as TrrShowCastMember[])
        : [];
      setTrrShowCast(nextCast);
    } catch (err) {
      setTrrShowCastError(err instanceof Error ? err.message : "Failed to fetch show cast");
      setTrrShowCast([]);
    } finally {
      showCastFetchAttemptedRef.current = true;
      setTrrShowCastLoading(false);
    }
  }, [getAuthHeaders, showId]);

  const fetchCastRoleMembers = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (!showId) return;
      if (!Number.isFinite(seasonNumber)) return;
      if (castRoleMembersLoadInFlightRef.current) {
        await castRoleMembersLoadInFlightRef.current;
        if (!force) return;
      }

      const request = (async () => {
        setCastRoleMembersLoading(true);
        setCastRoleMembersError(null);
        setCastRoleMembersWarning(null);
        const headers = await getAuthHeaders();
        const params = new URLSearchParams();
        params.set("seasons", String(seasonNumber));
        params.set("exclude_zero_episode_members", "1");

        let lastError: unknown = null;
        for (let attempt = 1; attempt <= SEASON_CAST_ROLE_MEMBERS_MAX_ATTEMPTS; attempt += 1) {
          try {
            const data = await adminGetJson<unknown[]>(
              `/api/admin/trr-api/shows/${showId}/cast-role-members?${params.toString()}`,
              {
                headers,
                cache: "no-store",
                timeoutMs: SEASON_CAST_ROLE_MEMBERS_LOAD_TIMEOUT_MS,
              }
            );
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
            setCastRoleMembersLoadedOnce(true);
            setLastSuccessfulCastRoleMembersAt(Date.now());
            setCastRoleMembersWarning(null);
            return;
          } catch (error) {
            lastError = error;
            if (attempt < SEASON_CAST_ROLE_MEMBERS_MAX_ATTEMPTS) {
              continue;
            }
          }
        }

        const message =
          lastError instanceof AdminRequestError
            ? lastError.message
            : isAbortError(lastError)
              ? `Timed out loading cast role members after ${Math.round(
                  SEASON_CAST_ROLE_MEMBERS_LOAD_TIMEOUT_MS / 1000
                )}s`
              : lastError instanceof Error
                ? lastError.message
                : "Failed to load cast role members";
        const hasPriorData =
          castRoleMembersLoadedOnceRef.current || castRoleMembersSnapshotRef.current.length > 0;
        if (hasPriorData) {
          setCastRoleMembersWarning(`${message}. Showing last successful cast intelligence snapshot.`);
          setCastRoleMembersError(null);
        } else {
          setCastRoleMembers([]);
          setCastRoleMembersLoadedOnce(false);
          setCastRoleMembersError(message);
        }
      })();

      castRoleMembersLoadInFlightRef.current = request;
      try {
        await request;
      } finally {
        if (castRoleMembersLoadInFlightRef.current === request) {
          castRoleMembersLoadInFlightRef.current = null;
        }
        setCastRoleMembersLoading(false);
      }
    },
    [
      getAuthHeaders,
      seasonNumber,
      showId,
    ]
  );

  const syncSeasonBravoVideoThumbnails = useCallback(
    async (
      options?: { force?: boolean; signal?: AbortSignal }
    ): Promise<boolean> => {
      const force = options?.force ?? false;
      const signal = options?.signal;
      const requestShowId = showId;
      const requestSeasonNumber = seasonNumber;
      const requestKey = `${requestShowId}:${requestSeasonNumber}`;
      if (!requestShowId || !Number.isFinite(requestSeasonNumber)) return false;
      if (signal?.aborted) return false;
      if (bravoVideoSyncInFlightRef.current) {
        return await bravoVideoSyncInFlightRef.current;
      }

      const request = (async (): Promise<boolean> => {
        try {
          if (!isCurrentSeasonRequest(requestKey)) return false;
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
            SEASON_BRAVO_VIDEO_THUMBNAIL_SYNC_TIMEOUT_MS,
            signal
          );
          const data = (await response.json().catch(() => ({}))) as {
            error?: string;
            video_thumbnail_sync?: { attempted?: number; synced?: number; failed?: number };
          };
          if (!response.ok) {
            throw new Error(data.error || "Failed to sync season video thumbnails");
          }
          const attempted = Number(data.video_thumbnail_sync?.attempted ?? 0);
          const synced = Number(data.video_thumbnail_sync?.synced ?? 0);
          const failed = Number(data.video_thumbnail_sync?.failed ?? 0);
          if (!isCurrentSeasonRequest(requestKey)) return false;
          if (attempted > 0 || synced > 0 || failed > 0) {
            setBravoVideoSyncWarning(
              `Video thumbnail sync: ${synced} synced, ${failed} failed${attempted > 0 ? ` (${attempted} attempted)` : ""}.`
            );
          }
          return true;
        } catch (error) {
          if (!isCurrentSeasonRequest(requestKey) || signal?.aborted || isAbortError(error)) return false;
          setBravoVideoSyncWarning(
            error instanceof Error ? error.message : "Failed to sync season video thumbnails"
          );
          return false;
        } finally {
          if (isCurrentSeasonRequest(requestKey)) {
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
    [getAuthHeaders, isCurrentSeasonRequest, seasonNumber, showId]
  );

  const fetchSeasonBravoVideos = useCallback(async (options?: { signal?: AbortSignal; forceSync?: boolean }) => {
    const signal = options?.signal;
    const forceSync = options?.forceSync ?? false;
    const requestShowId = showId;
    const requestSeasonNumber = seasonNumber;
    const requestKey = `${requestShowId}:${requestSeasonNumber}`;
    if (!requestShowId) return;
    if (!Number.isFinite(requestSeasonNumber)) return;
    if (signal?.aborted) return;
    if (!isCurrentSeasonRequest(requestKey)) return;
    setBravoVideosLoading(true);
    setBravoVideosError(null);
    try {
      const headers = await getAuthHeaders();
      if (forceSync || !bravoVideoSyncAttemptedRef.current) {
        bravoVideoSyncAttemptedRef.current = true;
        await syncSeasonBravoVideoThumbnails({ force: forceSync, signal });
      }

      const response = await fetchWithTimeout(
        `/api/admin/trr-api/shows/${requestShowId}/bravo/videos?season_number=${requestSeasonNumber}&merge_person_sources=true`,
        {
          headers,
          cache: "no-store",
          signal,
        },
        SEASON_ASSET_LOAD_TIMEOUT_MS,
        signal
      );
      const data = (await response.json().catch(() => ({}))) as {
        videos?: BravoVideoItem[];
        error?: string;
      };
      if (signal?.aborted) return;
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch season videos");
      }
      if (!isCurrentSeasonRequest(requestKey)) return;
      setBravoVideos(Array.isArray(data.videos) ? data.videos : []);
    } catch (err) {
      if (!isCurrentSeasonRequest(requestKey) || signal?.aborted || isAbortError(err)) return;
      setBravoVideosError(err instanceof Error ? err.message : "Failed to fetch season videos");
    } finally {
      if (!isCurrentSeasonRequest(requestKey)) return;
      setBravoVideosLoading(false);
    }
  }, [getAuthHeaders, isCurrentSeasonRequest, seasonNumber, showId, syncSeasonBravoVideoThumbnails]);

  const fetchSeasonFandomData = useCallback(async () => {
    const requestShowId = showId;
    const requestSeasonNumber = seasonNumber;
    const requestKey = `${requestShowId}:${requestSeasonNumber}`;
    if (!requestShowId || !Number.isFinite(requestSeasonNumber)) return;
    if (!isCurrentSeasonRequest(requestKey)) return;
    setSeasonFandomLoading(true);
    setSeasonFandomError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/shows/${requestShowId}/seasons/${requestSeasonNumber}/fandom`,
        {
          headers,
          cache: "no-store",
        }
      );
      const data = (await response.json().catch(() => ({}))) as {
        fandomData?: TrrSeasonFandom[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Failed to fetch season fandom");
      if (!isCurrentSeasonRequest(requestKey)) return;
      setSeasonFandomData(Array.isArray(data.fandomData) ? data.fandomData : []);
    } catch (err) {
      if (!isCurrentSeasonRequest(requestKey)) return;
      setSeasonFandomError(err instanceof Error ? err.message : "Failed to fetch season fandom");
    } finally {
      if (!isCurrentSeasonRequest(requestKey)) return;
      setSeasonFandomLoading(false);
    }
  }, [getAuthHeaders, isCurrentSeasonRequest, seasonNumber, showId]);

  const previewSyncByFandom = useCallback(
    async (options: FandomSyncOptions) => {
      if (!showId || !Number.isFinite(seasonNumber)) return;
      try {
        setFandomSyncPreviewLoading(true);
        setFandomSyncError(null);
        const headers = await getAuthHeaders();
        const response = await fetch(
          `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/import-fandom/preview`,
          {
            method: "POST",
            headers: {
              ...headers,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(options),
          }
        );
        const rawData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        const data = normalizeFandomSyncPreviewResponse(rawData);
        if (!response.ok) {
          throw new Error(typeof rawData.error === "string" ? rawData.error : "Season fandom preview failed");
        }
        setFandomSyncPreview(data);
      } catch (err) {
        setFandomSyncError(err instanceof Error ? err.message : "Season fandom preview failed");
      } finally {
        setFandomSyncPreviewLoading(false);
      }
    },
    [getAuthHeaders, seasonNumber, showId]
  );

  const commitSyncByFandom = useCallback(
    async (options: FandomSyncOptions) => {
      if (!showId || !Number.isFinite(seasonNumber)) return;
      try {
        setFandomSyncCommitLoading(true);
        setFandomSyncError(null);
        const headers = await getAuthHeaders();
        const response = await fetch(
          `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/import-fandom/commit`,
          {
            method: "POST",
            headers: {
              ...headers,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(options),
          }
        );
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) throw new Error(data.error || "Season fandom save failed");
        await fetchSeasonFandomData();
        setFandomSyncOpen(false);
      } catch (err) {
        setFandomSyncError(err instanceof Error ? err.message : "Season fandom save failed");
      } finally {
        setFandomSyncCommitLoading(false);
      }
    },
    [fetchSeasonFandomData, getAuthHeaders, seasonNumber, showId]
  );

  const loadSeasonData = useCallback(async () => {
    const requestShowId = showId;
    const requestSeasonNumber = seasonNumber;
    const requestKey = `${requestShowId}:${requestSeasonNumber}`;
    const requestId = ++seasonLoadRequestIdRef.current;
    if (!requestShowId) return;
    if (!Number.isFinite(requestSeasonNumber)) {
      if (!isCurrentSeasonRequest(requestKey, requestId)) return;
      setError("Invalid season number");
      setLoading(false);
      return;
    }

    try {
      if (!isCurrentSeasonRequest(requestKey, requestId)) return;
      setLoading(true);
      setSeasonSupplementalWarning(null);
      const headers = await getAuthHeaders();

      const [showResponse, seasonsResponse] = await Promise.all([
        fetch(`/api/admin/trr-api/shows/${requestShowId}`, { headers }),
        fetch(`/api/admin/trr-api/shows/${requestShowId}/seasons?limit=50`, { headers }),
      ]);

      if (!showResponse.ok) throw new Error("Failed to fetch show");
      if (!seasonsResponse.ok) throw new Error("Failed to fetch seasons");

      const showData = await showResponse.json();
      const seasonsData = await seasonsResponse.json();
      if (!isCurrentSeasonRequest(requestKey, requestId)) return;
      setShow(showData.show);

      const seasonList = Array.isArray(seasonsData.seasons)
        ? (seasonsData.seasons as TrrSeason[])
        : [];
      if (!isCurrentSeasonRequest(requestKey, requestId)) return;
      setShowSeasons(seasonList);

      const foundSeason = seasonList.find(
        (s) => s.season_number === requestSeasonNumber
      );

      if (!foundSeason) {
        if (!isCurrentSeasonRequest(requestKey, requestId)) return;
        setError("Season not found");
        setSeasonSupplementalWarning(null);
        setSeason(null);
        setEpisodes([]);
        setAssets([]);
        setCast([]);
        setSeasonCastSource("season_evidence");
        setSeasonCastEligibilityWarning(null);
        setArchiveCast([]);
        setLoading(false);
        return;
      }

      setSeason(foundSeason);
      setError(null);
      setEpisodes([]);
      setCast([]);
      setArchiveCast([]);
      setSeasonCastSource("season_evidence");
      setSeasonCastEligibilityWarning(null);

      void (async () => {
        try {
          const [episodesResponse, castResponse] = await Promise.all([
            fetch(`/api/admin/trr-api/seasons/${foundSeason.id}/episodes?limit=500`, { headers }),
            fetch(
              `/api/admin/trr-api/shows/${requestShowId}/seasons/${requestSeasonNumber}/cast?limit=500&include_archive_only=true`,
              { headers }
            ),
          ]);

          if (!episodesResponse.ok) throw new Error("Failed to fetch episodes");
          if (!castResponse.ok) throw new Error("Failed to fetch season cast");

          const episodesData = await episodesResponse.json();
          const castData = await castResponse.json();
          if (!isCurrentSeasonRequest(requestKey, requestId)) return;

          setEpisodes(episodesData.episodes ?? []);
          const allSeasonCast = Array.isArray((castData as { cast?: unknown }).cast)
            ? ((castData as { cast: unknown[] }).cast as SeasonCastMember[])
            : [];
          setCast(allSeasonCast.filter((member) => (member.episodes_in_season ?? 0) > 0));
          setSeasonCastSource(
            castData.cast_source === "show_fallback" ? "show_fallback" : "season_evidence"
          );
          setSeasonCastEligibilityWarning(
            typeof castData.eligibility_warning === "string" && castData.eligibility_warning.trim()
              ? castData.eligibility_warning
              : null
          );
          setArchiveCast(
            allSeasonCast.filter(
              (member) =>
                (member.episodes_in_season ?? 0) <= 0 &&
                ((member.archive_episodes_in_season as number | null | undefined) ?? 0) > 0
            )
          );
          setSeasonSupplementalWarning(null);
        } catch (err) {
          if (!isCurrentSeasonRequest(requestKey, requestId)) return;
          const message = err instanceof Error ? err.message : "Failed to load season supplemental data";
          console.warn("[season] Supplemental season data unavailable:", message);
          setSeasonSupplementalWarning(message);
        }
      })();
    } catch (err) {
      if (!isCurrentSeasonRequest(requestKey, requestId)) return;
      setError(err instanceof Error ? err.message : "Failed to load season");
      setSeasonSupplementalWarning(null);
      setSeason(null);
      setEpisodes([]);
      setAssets([]);
      setCast([]);
      setArchiveCast([]);
      setSeasonCastSource("season_evidence");
      setSeasonCastEligibilityWarning(null);
    } finally {
      if (!isCurrentSeasonRequest(requestKey, requestId)) return;
      setLoading(false);
    }
  }, [getAuthHeaders, isCurrentSeasonRequest, seasonLoadRequestIdRef, seasonNumber, showId]);

  useEffect(() => {
    if (!hasAccess) return;
    if (!showId) return;
    loadSeasonData();
  }, [hasAccess, loadSeasonData, showId]);

  useEffect(() => {
    castRefreshAbortControllerRef.current?.abort();
    castEnrichAbortControllerRef.current?.abort();
    abortInFlightPersonRefreshRuns();
    castRefreshAbortControllerRef.current = null;
    castEnrichAbortControllerRef.current = null;
    setAllowPlaceholderMediaOverride(false);
    setGalleryDiagnosticFilter("all");
    setCastSortBy("episodes");
    setCastSortOrder("desc");
    setCastRoleFilters([]);
    setCastCreditFilters([]);
    setCastHasImageFilter("all");
    setCastSearchQuery("");
    setCastSearchQueryDebounced("");
    setCastRenderLimit(SEASON_CAST_INCREMENTAL_INITIAL_LIMIT);
    setCrewRenderLimit(SEASON_CAST_INCREMENTAL_INITIAL_LIMIT);
    setCastRoleMembers([]);
    setCastRoleMembersLoadedOnce(false);
    setCastRoleMembersError(null);
    setCastRoleMembersWarning(null);
    setLastSuccessfulCastRoleMembersAt(null);
    setRefreshingPersonIds({});
    setRefreshingPersonProgress({});
    setCastRunFailedMembers([]);
    setCastFailedMembersOpen(false);
    setCastEnrichNotice(null);
    setCastEnrichError(null);
    setEnrichingCast(false);
    setRefreshLogEntries([]);
    setAssetsRefreshLogOpen(false);
    setCastRefreshLogOpen(false);
    refreshLogCounterRef.current = 0;
  }, [abortInFlightPersonRefreshRuns, season?.id]);

  useEffect(() => {
    showCastFetchAttemptedRef.current = false;
    setTrrShowCast([]);
    setTrrShowCastError(null);
    setTrrShowCastLoading(false);
  }, [showId, season?.id]);

  useEffect(() => () => {
    abortInFlightPersonRefreshRuns();
  }, [abortInFlightPersonRefreshRuns]);

  useEffect(() => {
    if (!hasAccess) return;
    if (activeTab !== "assets" || assetsView !== "branding") return;
    if (showCastFetchAttemptedRef.current) return;
    fetchShowCastForBrand();
  }, [hasAccess, activeTab, assetsView, fetchShowCastForBrand]);

  useEffect(() => {
    if (!hasAccess || !showId) return;
    if (activeTab !== "cast") return;
    void fetchCastRoleMembers();
    if (!showCastFetchAttemptedRef.current) {
      void fetchShowCastForBrand();
    }
  }, [activeTab, fetchCastRoleMembers, fetchShowCastForBrand, hasAccess, showId]);

  useEffect(() => {
    if (!hasAccess || !showId) return;
    if (activeTab !== "fandom") return;
    void fetchSeasonFandomData();
  }, [activeTab, fetchSeasonFandomData, hasAccess, showId]);

  useEffect(() => {
    if (!hasAccess || !showId) return;
    if (activeTab !== "assets" || assetsView !== "videos") return;
    const controller = new AbortController();
    void fetchSeasonBravoVideos({ signal: controller.signal });
    return () => {
      controller.abort();
    };
  }, [activeTab, assetsView, fetchSeasonBravoVideos, hasAccess, showId]);

  const fetchAssets = useCallback(async () => {
    if (!showId) return;
    setAssetsTruncatedWarning(null);
    setGalleryFallbackTelemetry({
      fallbackRecoveredCount: 0,
      allCandidatesFailedCount: 0,
      totalImageAttempts: 0,
    });
    const headers = await getAuthHeaders();
    const sourcesParam = advancedFilters.sources.length
      ? `&sources=${encodeURIComponent(advancedFilters.sources.join(","))}`
      : "";
    const fetchAssetRows = async (url: string): Promise<SeasonAsset[]> => {
      try {
        const data = await adminGetJson<{ assets?: unknown }>(url, {
          headers,
          timeoutMs: SEASON_ASSET_LOAD_TIMEOUT_MS,
        });
        const payload = data.assets;
        return Array.isArray(payload) ? (payload as SeasonAsset[]) : [];
      } catch (error) {
        if (isAbortError(error) || (error instanceof AdminRequestError && error.status === 408)) {
          throw new Error(
            `Timed out loading season assets after ${Math.round(
              SEASON_ASSET_LOAD_TIMEOUT_MS / 1000
            )}s.`
          );
        }
        throw error;
      }
    };

    const result = await fetchAllPaginatedGalleryRowsWithMeta({
      pageSize: SEASON_ASSET_PAGE_SIZE,
      maxPages: SEASON_ASSET_MAX_PAGES,
      fetchPage: (offset, limit) =>
        fetchAssetRows(
          `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/assets?limit=${limit}&offset=${offset}${sourcesParam}`
        ),
    });
    setAssets(result.rows);
    setAssetsTruncatedWarning(
      result.truncated
        ? `Showing first ${result.rows.length} assets due to pagination cap. Narrow filters to refine.`
        : null
    );
  }, [showId, seasonNumber, getAuthHeaders, advancedFilters.sources]);

  useEffect(() => {
    if (!hasAccess || !showId) return;
    if (activeTab !== "assets" || assetsView !== "images") return;
    void fetchAssets().catch((err) => {
      console.error("Failed to refresh filtered season media:", err);
    });
  }, [hasAccess, showId, activeTab, assetsView, fetchAssets]);

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

  const seasonBatchTargetPlan = useMemo(() => {
    const advancedFiltered = applyAdvancedFiltersToSeasonAssets(assets, advancedFilters, {
      showName: show?.name ?? undefined,
      getSeasonNumber: () => seasonNumber,
    });
    const diagnosticsFiltered = advancedFiltered.filter((asset) => {
      if (galleryDiagnosticFilter === "all") return true;
      if (galleryDiagnosticFilter === "missing-variants") {
        return hasMissingVariants(asset.metadata ?? null);
      }
      if (galleryDiagnosticFilter === "oversized") {
        const pixelCount =
          typeof asset.width === "number" && typeof asset.height === "number"
            ? asset.width * asset.height
            : 0;
        return pixelCount > 6_000_000;
      }
      if (galleryDiagnosticFilter === "unclassified") {
        return !asset.kind || asset.kind.trim().toLowerCase() === "other";
      }
      return true;
    });
    const visibleSections = groupSeasonAssetsBySection(
      diagnosticsFiltered.slice(0, assetsVisibleCount),
      {
        seasonNumber,
        showName: show?.name ?? undefined,
        includeOther: true,
      }
    );
    const selectedSections = new Set(batchJobContentSections);
    const dedupeTargets = new Set<string>();
    const sectionCounts = new Map<AssetSectionKey, number>();
    const selectedVisibleAssets = ASSET_SECTION_ORDER.flatMap((section) =>
      selectedSections.has(section) ? visibleSections[section] : []
    );
    const targets = selectedVisibleAssets
      .map((asset) => {
        const section = classifySeasonAssetSection(asset, {
          seasonNumber,
          showName: show?.name ?? undefined,
        });
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

    const selectedSectionLabels = ASSET_SECTION_ORDER.filter(
      (section) => selectedSections.has(section) && (sectionCounts.get(section) ?? 0) > 0
    ).map((section) => ASSET_SECTION_LABELS[section]);

    return {
      targets,
      selectedSectionLabels,
    };
  }, [
    advancedFilters,
    assets,
    assetsVisibleCount,
    batchJobContentSections,
    galleryDiagnosticFilter,
    seasonNumber,
    show?.name,
  ]);

  const runBatchJobs = useCallback(async () => {
    if (!showId || !seasonNumber) return;
    if (batchJobsRunning) return;

    if (batchJobOperations.length === 0) {
      setBatchJobsError("Select at least one operation.");
      return;
    }
    if (batchJobContentSections.length === 0) {
      setBatchJobsError("Select at least one content type.");
      return;
    }
    const { targets } = seasonBatchTargetPlan;

    if (targets.length === 0) {
      setBatchJobsError("No matching season assets found for the selected content types.");
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
        `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/assets/batch-jobs/stream`,
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
          timeoutMs: SEASON_ASSET_PIPELINE_STEP_TIMEOUT_MS,
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
      await fetchAssets();
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
    fetchAssets,
    getAuthHeaders,
    seasonNumber,
    seasonBatchTargetPlan,
    showId,
  ]);

  const seasonBatchPreflightSummary = useMemo(() => {
    const sectionsText =
      seasonBatchTargetPlan.selectedSectionLabels.length > 0
        ? seasonBatchTargetPlan.selectedSectionLabels
            .map((label) => label.toLowerCase())
            .join(", ")
        : "no sections";
    const operationsText =
      batchJobOperations.length > 0
        ? batchJobOperations.map((operation) => BATCH_JOB_OPERATION_LABELS[operation]).join(", ")
        : "no operations";
    return `Will process ${seasonBatchTargetPlan.targets.length} assets across ${sectionsText} with ${operationsText}.`;
  }, [batchJobOperations, seasonBatchTargetPlan]);

  const handleRefreshImages = useCallback(async () => {
    if (!showId) return;
    if (refreshingAssets) return;
    const requestId = buildSeasonRefreshRequestId();
    setRefreshingAssets(true);
    setAssetsRefreshError(null);
    setAssetsRefreshNotice(null);
    setAssetsRefreshLiveCounts(null);
    setAssetsRefreshLogOpen(true);
    setAssetsRefreshProgress({
      stage: "Initializing",
      message: "Refreshing show/season/episode media...",
      current: 0,
      total: null,
      requestId,
    });
    appendRefreshLog({
      scope: "assets",
      stage: "start",
      message: "Refresh Images started",
      requestId,
      level: "info",
    });
    try {
      const headers = await getAuthHeaders();
      let sawComplete = false;
      let completionSummary: string | null = null;
      let completionLiveCounts: JobLiveCounts | null = null;
      let lastProgressLogSignature: string | null = null;
      let lastSeenRequestId: string = requestId;

      try {
        const streamController = new AbortController();
        const streamTimeout = setTimeout(
          () => streamController.abort(),
          SEASON_STREAM_MAX_DURATION_MS
        );
        let streamIdleTimeout: ReturnType<typeof setTimeout> | null = null;
        const bumpStreamIdleTimeout = () => {
          if (streamIdleTimeout) clearTimeout(streamIdleTimeout);
          streamIdleTimeout = setTimeout(
            () => streamController.abort(),
            SEASON_STREAM_IDLE_TIMEOUT_MS
          );
        };
        const clearStreamIdleTimeout = () => {
          if (streamIdleTimeout) clearTimeout(streamIdleTimeout);
          streamIdleTimeout = null;
        };
        bumpStreamIdleTimeout();
        let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
        let shouldStopReading = false;
        try {
          const streamResponse = await fetch(`/api/admin/trr-api/shows/${showId}/refresh-photos/stream`, {
            method: "POST",
            headers: {
              ...headers,
              "Content-Type": "application/json",
              "x-trr-request-id": requestId,
            },
            body: JSON.stringify({ skip_mirror: false, season_number: seasonNumber }),
            signal: streamController.signal,
          });

          if (!streamResponse.ok || !streamResponse.body) {
            throw new Error("Media refresh stream unavailable");
          }

          reader = streamResponse.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

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
                  (payload as { stage?: unknown; step?: unknown }).stage ??
                    (payload as { stage?: unknown; step?: unknown }).step,
                  SEASON_REFRESH_STAGE_LABELS
                );
                const stageCurrent = parseProgressNumber(
                  (payload as { stage_current?: unknown }).stage_current
                );
                const stageTotal = parseProgressNumber(
                  (payload as { stage_total?: unknown }).stage_total
                );
                const current = parseProgressNumber(
                  (payload as { current?: unknown }).current
                );
                const total = parseProgressNumber(
                  (payload as { total?: unknown }).total
                );
                const heartbeat = (payload as { heartbeat?: unknown }).heartbeat === true;
                const elapsedMs = parseProgressNumber((payload as { elapsed_ms?: unknown }).elapsed_ms);
                const source = typeof (payload as { source?: unknown }).source === "string"
                  ? (payload as { source: string }).source
                  : null;
                const payloadRequestId = typeof (payload as { request_id?: unknown }).request_id === "string"
                  ? (payload as { request_id: string }).request_id
                  : requestId;
                lastSeenRequestId = payloadRequestId;
                const sourceTotal = parseProgressNumber((payload as { source_total?: unknown }).source_total);
                const mirroredCount = parseProgressNumber((payload as { mirrored_count?: unknown }).mirrored_count);
                const resolvedCurrent = stageCurrent ?? current;
                const resolvedTotal = stageTotal ?? total;
                let progressMessage = buildProgressMessage(
                  stageLabel,
                  (payload as { message?: unknown }).message,
                  "Refreshing media..."
                );
                if (heartbeat && elapsedMs !== null && elapsedMs >= 0) {
                  progressMessage = `${progressMessage} · ${Math.round(elapsedMs / 1000)}s elapsed`;
                }
                if (
                  (payload as { skip_reason?: unknown }).skip_reason === "already_mirrored" &&
                  sourceTotal !== null &&
                  mirroredCount !== null
                ) {
                  progressMessage = `${progressMessage} (${mirroredCount}/${sourceTotal})`;
                }
                const nextLiveCounts = resolveJobLiveCounts(assetsRefreshLiveCounts, payload);
                setAssetsRefreshLiveCounts(nextLiveCounts);
                const enrichedProgressMessage = appendLiveCountsToMessage(
                  progressMessage,
                  nextLiveCounts
                );

                setAssetsRefreshProgress({
                  stage: stageLabel,
                  message: enrichedProgressMessage,
                  current: resolvedCurrent,
                  total: resolvedTotal,
                  requestId: payloadRequestId,
                });
                const signature = [
                  stageLabel ?? "",
                  enrichedProgressMessage ?? "",
                  resolvedCurrent ?? "",
                  resolvedTotal ?? "",
                  payloadRequestId,
                ].join("|");
                if (signature !== lastProgressLogSignature) {
                  appendRefreshLog({
                    scope: "assets",
                    stage: stageLabel ?? "progress",
                    message: source
                      ? `${source.toUpperCase()}: ${enrichedProgressMessage}`
                      : enrichedProgressMessage ?? "Refresh progress update",
                    level: "info",
                    requestId: payloadRequestId,
                    current: resolvedCurrent,
                    total: resolvedTotal,
                  });
                  lastProgressLogSignature = signature;
                }
              } else if (eventType === "complete") {
                sawComplete = true;
                const completeRequestId = typeof (payload as { request_id?: unknown }).request_id === "string"
                  ? (payload as { request_id: string }).request_id
                  : requestId;
                lastSeenRequestId = completeRequestId;
                const completeLiveCounts = resolveJobLiveCounts(assetsRefreshLiveCounts, payload);
                setAssetsRefreshLiveCounts(completeLiveCounts);
                completionLiveCounts = completeLiveCounts;
                const liveCountSuffix = formatJobLiveCounts(completeLiveCounts);
                completionSummary =
                  summarizePhotoStreamCompletion(payload) ??
                  summarizeRefreshTargetResult(payload, "photos");
                appendRefreshLog({
                  scope: "assets",
                  stage: "complete",
                  message: "Media refresh stream complete.",
                  requestId: completeRequestId,
                  response: [completionSummary, liveCountSuffix].filter(Boolean).join(" | "),
                  level: "success",
                });
                shouldStopReading = true;
              } else if (eventType === "error") {
                const errorPayload =
                  payload && typeof payload === "object"
                    ? (payload as { error?: unknown; detail?: unknown; request_id?: unknown })
                    : null;
                const payloadRequestId =
                  typeof errorPayload?.request_id === "string" ? errorPayload.request_id : requestId;
                lastSeenRequestId = payloadRequestId;
                const errorText =
                  typeof errorPayload?.error === "string" && errorPayload.error
                    ? errorPayload.error
                    : "Failed to refresh media";
                const detailText =
                  typeof errorPayload?.detail === "string" && errorPayload.detail
                    ? errorPayload.detail
                    : null;
                appendRefreshLog({
                  scope: "assets",
                  stage: "error",
                  message: errorText,
                  requestId: payloadRequestId,
                  detail: detailText,
                  level: "error",
                });
                throw new Error(detailText ? `${errorText}: ${detailText}` : errorText);
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
        if (!sawComplete) {
          appendRefreshLog({
            scope: "assets",
            stage: "stream_incomplete",
            message: "Refresh stream ended before completion.",
            requestId: lastSeenRequestId,
            level: "error",
          });
          throw new Error("Refresh stream ended before completion.");
        }
      } catch (streamErr) {
        console.warn("Season media refresh stream failed.", streamErr);
        appendRefreshLog({
          scope: "assets",
          stage: "stream_failed",
          message: "Live stream unavailable.",
          requestId: lastSeenRequestId,
          detail: streamErr instanceof Error ? streamErr.message : String(streamErr),
          level: "error",
        });
        throw streamErr;
      }

      await fetchAssets();
      const finalNotice = completionSummary
        ? `Refreshed media. ${completionSummary}${
            formatJobLiveCounts(completionLiveCounts)
              ? ` (${formatJobLiveCounts(completionLiveCounts)})`
              : ""
          }`
        : sawComplete
          ? "Refreshed show, season, episode, and cast media."
          : "Refreshed media.";
      setAssetsRefreshNotice(finalNotice);
      appendRefreshLog({
        scope: "assets",
        stage: "done",
        message: "Refresh Images completed.",
        requestId: lastSeenRequestId,
        response: completionSummary,
        level: "success",
      });
    } catch (err) {
      console.error("Failed to refresh media:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to refresh media";
      setAssetsRefreshError(errorMessage);
      appendRefreshLog({
        scope: "assets",
        stage: "error",
        message: "Refresh Images failed.",
        requestId,
        detail: errorMessage,
        level: "error",
      });
    } finally {
      setRefreshingAssets(false);
      setAssetsRefreshProgress(null);
      setAssetsRefreshLiveCounts(null);
    }
  }, [
    appendRefreshLog,
    assetsRefreshLiveCounts,
    refreshingAssets,
    fetchAssets,
    getAuthHeaders,
    buildSeasonRefreshRequestId,
    seasonNumber,
    showId,
  ]);

  const refreshSeasonCast = useCallback(async () => {
    if (!showId) return;
    if (refreshingCast) return;

    const runController = new AbortController();
    castRefreshAbortControllerRef.current = runController;
    const throwIfCanceled = () => {
      if (runController.signal.aborted) {
        throw new Error("Season cast refresh canceled.");
      }
    };

    setRefreshingCast(true);
    setCastRefreshError(null);
    setCastRefreshNotice(null);
    setCastEnrichError(null);
    setCastEnrichNotice(null);
    setCastRunFailedMembers([]);
    setCastFailedMembersOpen(false);
    setCastRefreshLogOpen(true);
    setCastRefreshProgress({
      stage: "Initializing",
      message: "Refreshing cast credits and season cast intelligence...",
      current: 0,
      total: null,
    });
    appendRefreshLog({
      scope: "cast",
      stage: "start",
      message: "Season cast refresh started.",
      level: "info",
    });

    try {
      const headers = await getAuthHeaders();
      throwIfCanceled();
      let streamFailed = false;
      let sawComplete = false;
      let completionSummary: string | null = null;
      let lastProgressLogSignature: string | null = null;

      try {
        const streamController = new AbortController();
        const forwardRunAbort = () => streamController.abort();
        runController.signal.addEventListener("abort", forwardRunAbort, { once: true });
        const streamTimeout = setTimeout(
          () => streamController.abort(),
          SEASON_STREAM_MAX_DURATION_MS
        );
        let streamIdleTimeout: ReturnType<typeof setTimeout> | null = null;
        const bumpStreamIdleTimeout = () => {
          if (streamIdleTimeout) clearTimeout(streamIdleTimeout);
          streamIdleTimeout = setTimeout(
            () => streamController.abort(),
            SEASON_STREAM_IDLE_TIMEOUT_MS
          );
        };
        const clearStreamIdleTimeout = () => {
          if (streamIdleTimeout) clearTimeout(streamIdleTimeout);
          streamIdleTimeout = null;
        };
        bumpStreamIdleTimeout();
        let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
        let shouldStopReading = false;
        try {
          const refreshResponse = await fetch(`/api/admin/trr-api/shows/${showId}/refresh/stream`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ targets: ["cast_credits"] }),
            signal: streamController.signal,
          });

          if (!refreshResponse.ok || !refreshResponse.body) {
            throw new Error("Cast refresh stream unavailable");
          }

          reader = refreshResponse.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

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
                  (payload as { step?: unknown; stage?: unknown }).step ??
                    (payload as { step?: unknown; stage?: unknown }).stage,
                  SEASON_REFRESH_STAGE_LABELS
                );
                const current = parseProgressNumber(
                  (payload as { current?: unknown }).current
                );
                const total = parseProgressNumber((payload as { total?: unknown }).total);
                const heartbeat = (payload as { heartbeat?: unknown }).heartbeat === true;
                const elapsedMs = parseProgressNumber((payload as { elapsed_ms?: unknown }).elapsed_ms);
                let progressMessage = buildProgressMessage(
                  stageLabel,
                  (payload as { message?: unknown }).message,
                  "Refreshing cast..."
                );
                if (heartbeat && elapsedMs !== null && elapsedMs >= 0) {
                  progressMessage = `${progressMessage} · ${Math.round(elapsedMs / 1000)}s elapsed`;
                }
                setCastRefreshProgress({
                  stage: stageLabel,
                  message: progressMessage,
                  current,
                  total,
                });
                const signature = [stageLabel ?? "", progressMessage ?? "", current ?? "", total ?? ""].join("|");
                if (signature !== lastProgressLogSignature) {
                  appendRefreshLog({
                    scope: "cast",
                    stage: stageLabel ?? "progress",
                    message: progressMessage ?? "Refresh progress update",
                    level: "info",
                    current,
                    total,
                  });
                  lastProgressLogSignature = signature;
                }
              } else if (eventType === "complete") {
                sawComplete = true;
                completionSummary = summarizeRefreshTargetResult(payload, "cast_credits");
                appendRefreshLog({
                  scope: "cast",
                  stage: "complete",
                  message: "Cast refresh stream complete.",
                  response: completionSummary,
                  level: "success",
                });
                shouldStopReading = true;
              } else if (eventType === "error") {
                const errorPayload =
                  payload && typeof payload === "object"
                    ? (payload as { error?: unknown; detail?: unknown })
                    : null;
                const errorText =
                  typeof errorPayload?.error === "string" && errorPayload.error
                    ? errorPayload.error
                    : "Failed to refresh cast credits";
                const detailText =
                  typeof errorPayload?.detail === "string" && errorPayload.detail
                    ? errorPayload.detail
                    : null;
                appendRefreshLog({
                  scope: "cast",
                  stage: "error",
                  message: errorText,
                  detail: detailText,
                  level: "error",
                });
                throw new Error(detailText ? `${errorText}: ${detailText}` : errorText);
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
          runController.signal.removeEventListener("abort", forwardRunAbort);
          if (reader && shouldStopReading) {
            try {
              await reader.cancel();
            } catch {
              // no-op
            }
          }
        }
        if (!sawComplete) {
          streamFailed = true;
          appendRefreshLog({
            scope: "cast",
            stage: "stream_incomplete",
            message: "Cast refresh stream ended before completion; switching to fallback.",
            level: "info",
          });
        }
      } catch (streamErr) {
        if (runController.signal.aborted) {
          throw new Error("Season cast refresh canceled.");
        }
        streamFailed = true;
        console.warn("Season cast refresh stream failed, falling back to non-stream.", streamErr);
        appendRefreshLog({
          scope: "cast",
          stage: "stream_failed",
          message: "Live cast stream unavailable; running fallback refresh.",
          detail: streamErr instanceof Error ? streamErr.message : String(streamErr),
          level: "info",
        });
      }

      if (streamFailed) {
        throwIfCanceled();
        setCastRefreshProgress({
          stage: "Fallback",
          message: "Refreshing cast credits...",
          current: null,
          total: null,
        });
        appendRefreshLog({
          scope: "cast",
          stage: "fallback",
          message: "Fallback cast refresh started.",
          level: "info",
        });
        let fallbackResponse: Response;
        try {
          fallbackResponse = await fetchWithTimeout(
            `/api/admin/trr-api/shows/${showId}/refresh`,
            {
              method: "POST",
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ targets: ["cast_credits"] }),
            },
            SEASON_REFRESH_FALLBACK_TIMEOUT_MS,
            runController.signal
          );
        } catch (error) {
          if (isAbortError(error) && runController.signal.aborted) {
            throw new Error("Season cast refresh canceled.");
          }
          if (isAbortError(error)) {
            appendRefreshLog({
              scope: "cast",
              stage: "fallback_timeout",
              message: "Fallback cast refresh timed out.",
              detail: `Timed out after ${Math.round(SEASON_REFRESH_FALLBACK_TIMEOUT_MS / 1000)}s`,
              level: "error",
            });
            throw new Error(
              `Timed out refreshing cast credits after ${Math.round(
                SEASON_REFRESH_FALLBACK_TIMEOUT_MS / 1000
              )}s.`
            );
          }
          throw error;
        }
        const fallbackData = await fallbackResponse.json().catch(() => ({}));
        if (!fallbackResponse.ok) {
          const message =
            typeof (fallbackData as { error?: unknown }).error === "string"
              ? (fallbackData as { error: string }).error
              : "Failed to refresh cast credits";
          appendRefreshLog({
            scope: "cast",
            stage: "fallback_failed",
            message,
            level: "error",
          });
          throw new Error(message);
        }
        completionSummary =
          summarizeRefreshTargetResult(fallbackData, "cast_credits") ?? completionSummary;
        appendRefreshLog({
          scope: "cast",
          stage: "fallback_complete",
          message: "Fallback cast refresh completed.",
          response: completionSummary,
          level: "success",
        });
      }

      throwIfCanceled();
      let castResponse: Response;
      try {
        castResponse = await fetchWithTimeout(
          `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/cast?limit=500&include_archive_only=true`,
          { headers },
          SEASON_CAST_LOAD_TIMEOUT_MS,
          runController.signal
        );
      } catch (error) {
        if (isAbortError(error) && runController.signal.aborted) {
          throw new Error("Season cast refresh canceled.");
        }
        if (isAbortError(error)) {
          throw new Error(
            `Timed out loading refreshed season cast after ${Math.round(
              SEASON_CAST_LOAD_TIMEOUT_MS / 1000
            )}s.`
          );
        }
        throw error;
      }
      const castData = await castResponse.json().catch(() => ({}));
      if (!castResponse.ok) {
        const message =
          typeof (castData as { error?: unknown }).error === "string"
            ? (castData as { error: string }).error
            : "Failed to fetch refreshed season cast";
        throw new Error(message);
      }

      const refreshedCast = (castData as { cast?: unknown }).cast;
      const refreshedCastSource = (castData as { cast_source?: unknown }).cast_source;
      const refreshedCastWarning = (castData as { eligibility_warning?: unknown }).eligibility_warning;
      const refreshedCastWithArchive = Array.isArray(refreshedCast)
        ? (refreshedCast as SeasonCastMember[])
        : [];
      const refreshedCastMembers = refreshedCastWithArchive.filter(
        (member) => (member.episodes_in_season ?? 0) > 0
      );
      setCast(refreshedCastMembers);
      setSeasonCastSource(
        refreshedCastSource === "show_fallback" ? "show_fallback" : "season_evidence"
      );
      setSeasonCastEligibilityWarning(
        typeof refreshedCastWarning === "string" && refreshedCastWarning.trim()
          ? refreshedCastWarning
          : null
      );
      setArchiveCast(
        refreshedCastWithArchive.filter(
          (member) =>
            (member.episodes_in_season ?? 0) <= 0 &&
            ((member.archive_episodes_in_season as number | null | undefined) ?? 0) > 0
        )
      );

      throwIfCanceled();
      await Promise.all([fetchCastRoleMembers({ force: true }), fetchShowCastForBrand()]);
      const finalNotice = completionSummary
        ? `Refreshed season cast. ${completionSummary}`
        : "Refreshed season cast.";
      setCastRefreshNotice(finalNotice);
      appendRefreshLog({
        scope: "cast",
        stage: "done",
        message: "Season cast refresh complete.",
        response: completionSummary,
        level: "success",
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to refresh season cast";
      if (runController.signal.aborted || /canceled/i.test(errorMessage)) {
        setCastRefreshError(null);
        setCastRefreshNotice("Season cast refresh canceled.");
        appendRefreshLog({
          scope: "cast",
          stage: "canceled",
          message: "Season cast refresh canceled.",
          level: "info",
        });
      } else {
        setCastRefreshError(errorMessage);
        appendRefreshLog({
          scope: "cast",
          stage: "error",
          message: "Season cast refresh failed.",
          detail: errorMessage,
          level: "error",
        });
      }
    } finally {
      if (castRefreshAbortControllerRef.current === runController) {
        castRefreshAbortControllerRef.current = null;
      }
      setRefreshingCast(false);
      setCastRefreshProgress(null);
    }
  }, [
    appendRefreshLog,
    refreshingCast,
    getAuthHeaders,
    showId,
    seasonNumber,
    fetchCastRoleMembers,
    fetchShowCastForBrand,
  ]);

  const refreshSeasonPersonImages = useCallback(
    async (
      personId: string,
      onProgress?: (progress: RefreshProgressState) => void,
      options?: { signal?: AbortSignal }
    ) => {
      const headers = await getAuthHeaders();
      const externalSignal = options?.signal;
      if (externalSignal?.aborted) {
        throw new Error("Season cast refresh canceled.");
      }
      const streamController = new AbortController();
      const forwardExternalAbort = () => streamController.abort();
      if (externalSignal) {
        externalSignal.addEventListener("abort", forwardExternalAbort, { once: true });
      }
      const streamTimeout = setTimeout(
        () => streamController.abort(),
        SEASON_PERSON_STREAM_MAX_DURATION_MS
      );
      let streamIdleTimeout: ReturnType<typeof setTimeout> | null = null;
      const bumpStreamIdleTimeout = () => {
        if (streamIdleTimeout) clearTimeout(streamIdleTimeout);
        streamIdleTimeout = setTimeout(
          () => streamController.abort(),
          SEASON_PERSON_STREAM_IDLE_TIMEOUT_MS
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
            body: JSON.stringify({
              skip_mirror: false,
              show_id: showId,
              show_name: show?.name ?? undefined,
            }),
            signal: streamController.signal,
          }
        );

        if (!streamResponse.ok || !streamResponse.body) {
          throw new Error("Person refresh stream unavailable");
        }

        const reader = streamResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
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
                (payload as { stage?: unknown; step?: unknown }).stage ??
                  (payload as { stage?: unknown; step?: unknown }).step,
                SEASON_REFRESH_STAGE_LABELS
              );
              onProgress?.({
                stage: stageLabel,
                message: buildProgressMessage(
                  stageLabel,
                  (payload as { message?: unknown }).message,
                  "Refreshing cast member..."
                ),
                current: parseProgressNumber((payload as { current?: unknown }).current),
                total: parseProgressNumber((payload as { total?: unknown }).total),
              });
            } else if (eventType === "complete") {
              shouldStopReading = true;
            } else if (eventType === "error") {
              const errorPayload =
                payload && typeof payload === "object"
                  ? (payload as { error?: unknown; detail?: unknown })
                  : null;
              const errorText =
                typeof errorPayload?.error === "string" && errorPayload.error
                  ? errorPayload.error
                  : "Failed to sync cast member profile/media";
              const detailText =
                typeof errorPayload?.detail === "string" && errorPayload.detail
                  ? errorPayload.detail
                  : null;
              throw new Error(detailText ? `${errorText}: ${detailText}` : errorText);
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
      } catch (streamErr) {
        if (isAbortError(streamErr) && externalSignal?.aborted) {
          throw new Error("Season cast refresh canceled.");
        }
        if (isAbortError(streamErr)) {
          throw new Error(
            `Timed out syncing cast member profile/media after ${Math.round(
              SEASON_PERSON_STREAM_MAX_DURATION_MS / 1000
            )}s.`
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
    [getAuthHeaders, show?.name, showId]
  );

  const reprocessSeasonPersonImages = useCallback(
    async (
      personId: string,
      onProgress?: (progress: RefreshProgressState) => void,
      options?: { signal?: AbortSignal }
    ) => {
      const headers = await getAuthHeaders();
      const externalSignal = options?.signal;
      if (externalSignal?.aborted) {
        throw new Error("Season cast media enrich canceled.");
      }
      const streamController = new AbortController();
      const forwardExternalAbort = () => streamController.abort();
      if (externalSignal) {
        externalSignal.addEventListener("abort", forwardExternalAbort, { once: true });
      }
      const streamTimeout = setTimeout(
        () => streamController.abort(),
        SEASON_PERSON_STREAM_MAX_DURATION_MS
      );
      let streamIdleTimeout: ReturnType<typeof setTimeout> | null = null;
      const bumpStreamIdleTimeout = () => {
        if (streamIdleTimeout) clearTimeout(streamIdleTimeout);
        streamIdleTimeout = setTimeout(
          () => streamController.abort(),
          SEASON_PERSON_STREAM_IDLE_TIMEOUT_MS
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
                (payload as { stage?: unknown; step?: unknown }).stage ??
                  (payload as { stage?: unknown; step?: unknown }).step,
                SEASON_REFRESH_STAGE_LABELS
              );
              onProgress?.({
                stage: stageLabel,
                message: buildProgressMessage(
                  stageLabel,
                  (payload as { message?: unknown }).message,
                  "Enriching cast media..."
                ),
                current: parseProgressNumber((payload as { current?: unknown }).current),
                total: parseProgressNumber((payload as { total?: unknown }).total),
              });
            } else if (eventType === "complete") {
              shouldStopReading = true;
            } else if (eventType === "error") {
              const errorPayload =
                payload && typeof payload === "object"
                  ? (payload as { error?: unknown; detail?: unknown })
                  : null;
              const errorText =
                typeof errorPayload?.error === "string" && errorPayload.error
                  ? errorPayload.error
                  : "Failed to enrich cast media";
              const detailText =
                typeof errorPayload?.detail === "string" && errorPayload.detail
                  ? errorPayload.detail
                  : null;
              throw new Error(detailText ? `${errorText}: ${detailText}` : errorText);
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
      } catch (streamErr) {
        if (isAbortError(streamErr) && externalSignal?.aborted) {
          throw new Error("Season cast media enrich canceled.");
        }
        if (isAbortError(streamErr)) {
          throw new Error(
            `Timed out enriching cast media after ${Math.round(
              SEASON_PERSON_STREAM_MAX_DURATION_MS / 1000
            )}s.`
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

  const runSeasonCastMediaEnrich = useCallback(
    async (members: SeasonCastMember[], options?: { signal?: AbortSignal }) => {
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

      let completed = 0;
      let inFlight = 0;
      let nextIndex = 0;
      let succeeded = 0;
      let failed = 0;
      const failedMembers: CastRunFailedMember[] = [];
      const throwIfCanceled = () => {
        if (options?.signal?.aborted) {
          throw new Error("Season cast media enrich canceled.");
        }
      };
      const updateProgressMessage = (message: string) => {
        setCastRefreshProgress({
          stage: "Cast Media Enrich",
          message,
          current: completed,
          total,
        });
      };

      updateProgressMessage(`Enriching media: ${completed}/${total} complete (${inFlight} in flight).`);
      const workerCount = Math.max(1, Math.min(SEASON_CAST_PROFILE_SYNC_CONCURRENCY, total));
      appendRefreshLog({
        scope: "cast_enrich",
        stage: "start",
        message: `Season cast media enrich started (${total} members).`,
        level: "info",
      });
      const runWorker = async () => {
        while (true) {
          throwIfCanceled();
          const memberIndex = nextIndex;
          nextIndex += 1;
          if (memberIndex >= total) return;
          const member = uniqueMembers[memberIndex];
          const label = member.person_name || `Cast member ${memberIndex + 1}`;
          inFlight += 1;
          updateProgressMessage(`Enriching media: ${completed}/${total} complete (${inFlight} in flight) — ${label}`);
          try {
            await reprocessSeasonPersonImages(
              member.person_id,
              (progress) => {
                updateProgressMessage(
                  progress.message
                    ? `Enriching media: ${completed}/${total} complete (${inFlight} in flight) — ${label}: ${progress.message}`
                    : `Enriching media: ${completed}/${total} complete (${inFlight} in flight) — ${label}`
                );
              },
              { signal: options?.signal }
            );
            succeeded += 1;
            appendRefreshLog({
              scope: "cast_enrich",
              stage: "member_complete",
              message: `Enriched ${label}.`,
              current: completed + 1,
              total,
              level: "success",
            });
          } catch (err) {
            if (options?.signal?.aborted) {
              throw new Error("Season cast media enrich canceled.");
            }
            failed += 1;
            const reason = err instanceof Error ? err.message : "Failed to enrich cast media";
            appendRefreshLog({
              scope: "cast_enrich",
              stage: "member_failed",
              message: `Failed enriching ${label}.`,
              detail: reason,
              current: completed + 1,
              total,
              level: "error",
            });
            failedMembers.push({
              personId: member.person_id,
              name: label,
              reason,
            });
          } finally {
            completed += 1;
            inFlight = Math.max(0, inFlight - 1);
            updateProgressMessage(`Enriching media: ${completed}/${total} complete (${inFlight} in flight).`);
          }
        }
      };

      await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
      appendRefreshLog({
        scope: "cast_enrich",
        stage: "done",
        message: `Season cast media enrich complete (${succeeded}/${total} succeeded${failed > 0 ? `, ${failed} failed` : ""}).`,
        level: "success",
      });
      return { attempted: total, succeeded, failed, failedMembers };
    },
    [appendRefreshLog, reprocessSeasonPersonImages]
  );

  const enrichSeasonCastMedia = useCallback(async () => {
    if (!showId) return;
    if (refreshingCast || enrichingCast) return;
    const runController = new AbortController();
    castEnrichAbortControllerRef.current = runController;
    setEnrichingCast(true);
    setCastEnrichError(null);
    setCastEnrichNotice(null);
    setCastRunFailedMembers([]);
    setCastFailedMembersOpen(false);
    setCastRefreshLogOpen(true);

    try {
      const summary = await runSeasonCastMediaEnrich(cast, { signal: runController.signal });
      await Promise.all([fetchCastRoleMembers({ force: true }), fetchShowCastForBrand()]);
      setCastRunFailedMembers(summary.failedMembers);
      setCastFailedMembersOpen(summary.failedMembers.length > 0);
      setCastEnrichNotice(
        summary.failed > 0
          ? `Cast & crew media enrich completed with issues (${summary.succeeded}/${summary.attempted} succeeded).`
          : `Cast & crew media enrich complete (${summary.succeeded}/${summary.attempted}).`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to enrich season cast media";
      if (runController.signal.aborted || /canceled/i.test(message)) {
        setCastEnrichError(null);
        setCastEnrichNotice("Season cast & crew media enrich canceled.");
      } else {
        setCastEnrichError(message);
      }
    } finally {
      if (castEnrichAbortControllerRef.current === runController) {
        castEnrichAbortControllerRef.current = null;
      }
      setEnrichingCast(false);
      setCastRefreshProgress(null);
    }
  }, [
    cast,
    enrichingCast,
    fetchCastRoleMembers,
    fetchShowCastForBrand,
    refreshingCast,
    runSeasonCastMediaEnrich,
    showId,
  ]);

  const retryFailedSeasonCastMediaEnrich = useCallback(async () => {
    if (castRunFailedMembers.length === 0) return;
    const retryPersonIds = new Set(castRunFailedMembers.map((member) => member.personId));
    const retryMembers = cast.filter((member) => retryPersonIds.has(member.person_id));
    if (retryMembers.length === 0) return;
    if (refreshingCast || enrichingCast) return;
    const runController = new AbortController();
    castEnrichAbortControllerRef.current = runController;
    setEnrichingCast(true);
    setCastEnrichError(null);
    setCastEnrichNotice(null);

    try {
      const summary = await runSeasonCastMediaEnrich(retryMembers, { signal: runController.signal });
      await Promise.all([fetchCastRoleMembers({ force: true }), fetchShowCastForBrand()]);
      setCastRunFailedMembers(summary.failedMembers);
      setCastFailedMembersOpen(summary.failedMembers.length > 0);
      setCastEnrichNotice(
        summary.failed > 0
          ? `Retried failed members; ${summary.succeeded}/${summary.attempted} succeeded.`
          : "Retried failed members successfully."
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to retry failed cast members";
      if (runController.signal.aborted || /canceled/i.test(message)) {
        setCastEnrichError(null);
        setCastEnrichNotice("Season cast & crew media enrich canceled.");
      } else {
        setCastEnrichError(message);
      }
    } finally {
      if (castEnrichAbortControllerRef.current === runController) {
        castEnrichAbortControllerRef.current = null;
      }
      setEnrichingCast(false);
      setCastRefreshProgress(null);
    }
  }, [
    cast,
    castRunFailedMembers,
    enrichingCast,
    fetchCastRoleMembers,
    fetchShowCastForBrand,
    refreshingCast,
    runSeasonCastMediaEnrich,
  ]);

  const cancelSeasonCastRefresh = useCallback(() => {
    castRefreshAbortControllerRef.current?.abort();
    castEnrichAbortControllerRef.current?.abort();
    abortInFlightPersonRefreshRuns();
  }, [abortInFlightPersonRefreshRuns]);

  const handleRefreshSeasonCastMember = useCallback(
    async (personId: string, label: string) => {
      if (!personId) return;
      if (refreshingCast || enrichingCast) return;
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
      setCastRefreshError(null);
      setCastRefreshNotice(null);
      try {
        await refreshSeasonPersonImages(
          personId,
          (progress) => {
            setRefreshingPersonProgress((prev) => ({
              ...prev,
              [personId]: progress,
            }));
          },
          { signal: runController.signal }
        );
        await Promise.all([fetchCastRoleMembers({ force: true }), fetchShowCastForBrand()]);
        setCastRefreshNotice(`Refreshed person for ${label}.`);
      } catch (err) {
        if (runController.signal.aborted) {
          setCastRefreshError(null);
          return;
        }
        setCastRefreshError(err instanceof Error ? err.message : "Failed to refresh cast member");
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
    [enrichingCast, fetchCastRoleMembers, fetchShowCastForBrand, refreshingCast, refreshSeasonPersonImages]
  );

  const openAddBackdrops = useCallback(async () => {
    if (!season?.id) return;
    const mediaEligible =
      Boolean(
        (season.premiere_date && season.premiere_date.trim()) ||
          (season.air_date && season.air_date.trim())
      ) || episodes.length > 1;
    if (!mediaEligible && !allowPlaceholderMediaOverride) {
      setBackdropsError(
        "Season is marked as placeholder. Add a premiere date or more than one episode, or enable override to continue."
      );
      return;
    }
    setAddBackdropsOpen(true);
    setBackdropsError(null);
    setBackdropsLoading(true);
    setSelectedBackdropIds(new Set());
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/seasons/${season.id}/unassigned-backdrops`,
        { headers }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to load backdrops");
      }
      setUnassignedBackdrops(data.backdrops ?? []);
    } catch (err) {
      setUnassignedBackdrops([]);
      setBackdropsError(err instanceof Error ? err.message : "Failed to load backdrops");
    } finally {
      setBackdropsLoading(false);
    }
  }, [
    allowPlaceholderMediaOverride,
    episodes.length,
    getAuthHeaders,
    season?.air_date,
    season?.id,
    season?.premiere_date,
  ]);

  const assignSelectedBackdrops = useCallback(async () => {
    if (!season?.id) return;
    const ids = Array.from(selectedBackdropIds);
    if (ids.length === 0) return;
    setAssigningBackdrops(true);
    setBackdropsError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/seasons/${season.id}/assign-backdrops`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ media_asset_ids: ids }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to assign backdrops");
      }
      const failedIds = Array.isArray(data.mirrored_failed_ids)
        ? (data.mirrored_failed_ids.filter((v: unknown) => typeof v === "string") as string[])
        : [];
      if (failedIds.length > 0) {
        setBackdropsError(
          `Assigned, but failed to mirror ${failedIds.length} image(s). Try again in a moment.`
        );
      } else {
        setAddBackdropsOpen(false);
      }
      setSelectedBackdropIds(new Set());
      await fetchAssets();
    } catch (err) {
      setBackdropsError(err instanceof Error ? err.message : "Failed to assign backdrops");
    } finally {
      setAssigningBackdrops(false);
    }
  }, [season?.id, selectedBackdropIds, getAuthHeaders, fetchAssets]);

  const openEpisodeLightbox = (
    episode: TrrEpisode,
    index: number,
    seasonEpisodes: TrrEpisode[],
    triggerElement: HTMLElement
  ) => {
    episodeTriggerRef.current = triggerElement;
    setEpisodeLightbox({ episode, index, seasonEpisodes });
  };

  const navigateEpisodeLightbox = (direction: "prev" | "next") => {
    if (!episodeLightbox) return;
    const { index, seasonEpisodes } = episodeLightbox;
    const newIndex = direction === "prev" ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < seasonEpisodes.length) {
      setEpisodeLightbox({
        episode: seasonEpisodes[newIndex],
        index: newIndex,
        seasonEpisodes,
      });
    }
  };

  const closeEpisodeLightbox = () => {
    setEpisodeLightbox(null);
  };

  const openAssetLightbox = (
    asset: SeasonAsset,
    index: number,
    filteredAssets: SeasonAsset[],
    triggerElement: HTMLElement
  ) => {
    assetTriggerRef.current = triggerElement;
    setAssetLightbox({ asset, index, filteredAssets });
  };

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

  const closeAssetLightbox = () => {
    setAssetLightbox(null);
  };

  const applyAssetPatch = useCallback((target: SeasonAsset, patch: Partial<SeasonAsset>) => {
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
        metadata: patch.metadata === undefined ? candidate.metadata : patch.metadata,
      };
    };

    setAssets((prev) => prev.map(applyPatch));
    setAssetLightbox((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        asset: applyPatch(prev.asset),
        filteredAssets: prev.filteredAssets.map(applyPatch),
      };
    });
  }, []);

  const refreshAssetPipeline = useCallback(
    async (asset: SeasonAsset) => {
      setAssetsRefreshLogOpen(true);
      setAssetsRefreshNotice(null);
      setAssetsRefreshError(null);
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

      appendRefreshLog({
        scope: "image",
        stage: "pipeline_start",
        message: `Image pipeline refresh started (${base.kind}:${base.id}).`,
        level: "info",
      });

      const callStep = async (
        label: string,
        endpoint: string,
        payload: Record<string, unknown>
      ) => {
        appendRefreshLog({
          scope: "image",
          stage: "pipeline_step",
          message: `${label} started.`,
          level: "info",
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
            SEASON_ASSET_PIPELINE_STEP_TIMEOUT_MS
          );
        } catch (error) {
          if (isAbortError(error)) {
            appendRefreshLog({
              scope: "image",
              stage: "pipeline_step_timeout",
              message: `${label} timed out.`,
              detail: `Pipeline step timed out (${Math.round(SEASON_ASSET_PIPELINE_STEP_TIMEOUT_MS / 1000)}s)`,
              level: "error",
            });
            throw new Error(
              `Pipeline step timed out (${Math.round(SEASON_ASSET_PIPELINE_STEP_TIMEOUT_MS / 1000)}s)`
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
            scope: "image",
            stage: "pipeline_step_failed",
            message: `${label} failed.`,
            detail: message,
            level: "error",
          });
          throw new Error(message);
        }
        appendRefreshLog({
          scope: "image",
          stage: "pipeline_step_complete",
          message: `${label} completed.`,
          response:
            summarizeRefreshTargetResult(data, "photos") ??
            summarizeRefreshTargetResult(data, "cast_credits"),
          level: "success",
        });
        return data as Record<string, unknown>;
      };

      const prefix =
        base.kind === "media"
          ? `/api/admin/trr-api/media-assets/${base.id}`
          : `/api/admin/trr-api/cast-photos/${base.id}`;

      await callStep("Mirror", `${prefix}/mirror`, { force: true });
      const countPayload = await callStep("People Count", `${prefix}/auto-count`, { force: true });
      const textPayload = await callStep(
        "Text Overlay",
        `${prefix}/detect-text-overlay`,
        { force: true }
      );
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

      applyAssetPatch(asset, {
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

      await fetchAssets();
      const pipelineSummaryParts: string[] = [];
      if (typeof countPayload.people_count === "number") {
        pipelineSummaryParts.push(`people_count: ${countPayload.people_count}`);
      }
      pipelineSummaryParts.push(
        hasTextOverlay === null
          ? "text_overlay: unchanged"
          : `text_overlay: ${hasTextOverlay ? "yes" : "no"}`
      );
      setAssetsRefreshNotice(`Image pipeline refreshed. ${pipelineSummaryParts.join(" · ")}`);
      appendRefreshLog({
        scope: "image",
        stage: "pipeline_done",
        message: `Image pipeline refresh completed (${base.kind}:${base.id}).`,
        response: pipelineSummaryParts.join(" · "),
        level: "success",
      });
    },
    [appendRefreshLog, applyAssetPatch, fetchAssets, getAuthHeaders]
  );

  const deleteMediaAsset = useCallback(
    async (asset: SeasonAsset) => {
      if (asset.origin_table !== "media_assets") {
        throw new Error("Delete is currently supported only for imported media assets.");
      }
      const headers = await getAuthHeaders();
      const assetId = asset.media_asset_id ?? asset.id;
      const response = await fetch(`/api/admin/trr-api/media-assets/${assetId}`, {
        method: "DELETE",
        headers,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete image");
      }
      setAssetLightbox(null);
      await fetchAssets();
    },
    [getAuthHeaders, fetchAssets]
  );

  const archiveGalleryAsset = useCallback(
    async (asset: SeasonAsset) => {
      const origin = asset.origin_table ?? null;
      if (!origin) throw new Error("Cannot archive: missing origin_table");
      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/trr-api/assets/archive", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ origin, asset_id: asset.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          data?.error && data?.detail ? `${data.error}: ${data.detail}` : data?.detail || data?.error || "Archive failed";
        throw new Error(message);
      }
      setAssets((prev) => prev.filter((a) => a.hosted_url !== asset.hosted_url));
      setAssetLightbox(null);
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
        await adminMutation(
          endpoint,
          {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ force: true }),
            timeoutMs: SEASON_ASSET_PIPELINE_STEP_TIMEOUT_MS,
          },
        );
        await adminMutation(
          endpoint,
          {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              force: true,
              crop: buildAssetAutoCropPayloadWithFallback(asset),
            }),
            timeoutMs: SEASON_ASSET_PIPELINE_STEP_TIMEOUT_MS,
          },
        );
      } catch (error) {
        console.warn("[season-gallery] auto-crop rebuild after star toggle failed", {
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
      const response = await fetch("/api/admin/trr-api/assets/star", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ origin, asset_id: asset.id, starred }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          data?.error && data?.detail ? `${data.error}: ${data.detail}` : data?.detail || data?.error || "Star failed";
        throw new Error(message);
      }
      setAssets((prev) =>
        prev.map((a) => {
          if (a.hosted_url !== asset.hosted_url) return a;
          const meta =
            a.metadata && typeof a.metadata === "object"
              ? { ...(a.metadata as Record<string, unknown>) }
              : {};
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
      const response = await fetch("/api/admin/trr-api/assets/content-type", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ origin, asset_id: asset.id, content_type: contentType }),
      });
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

      setAssets((prev) =>
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

  const lightboxAssetCapabilities = assetLightbox
    ? resolveGalleryAssetCapabilities(assetLightbox.asset)
    : null;
  const episodeLightboxAsset: SeasonAsset | null = episodeLightbox
    ? {
        id: episodeLightbox.episode.id,
        type: "episode",
        origin_table: "episode_images",
        source: "episode_images",
        kind: "episode_still",
        hosted_url: episodeLightbox.episode.url_original_still ?? "",
        width: null,
        height: null,
        caption:
          episodeLightbox.episode.title ??
          `Episode ${episodeLightbox.episode.episode_number}`,
        episode_number: episodeLightbox.episode.episode_number,
        season_number: seasonNumber,
        metadata: null,
        ingest_status: null,
        hosted_content_type: null,
        link_id: null,
        media_asset_id: null,
        people_count: null,
        people_count_source: null,
        thumbnail_focus_x: null,
        thumbnail_focus_y: null,
        thumbnail_zoom: null,
        thumbnail_crop_mode: null,
      }
    : null;
  const episodeLightboxCapabilities = episodeLightboxAsset
    ? resolveGalleryAssetCapabilities(episodeLightboxAsset)
    : null;

  const totalEpisodes = episodes.length;
  const seasonHasPremiereDate = Boolean(
    (season?.premiere_date && season.premiere_date.trim()) ||
      (season?.air_date && season.air_date.trim())
  );
  const seasonEligibleForMedia = seasonHasPremiereDate || totalEpisodes > 1;
  const seasonEligibilityReason = seasonEligibleForMedia
    ? seasonHasPremiereDate
      ? "Eligible: season has a premiere/air date."
      : "Eligible: season has more than one episode."
    : "Placeholder season: requires a premiere date or more than one episode before media assignment.";

  const episodeCoverageRows = useMemo<EpisodeCoverageRow[]>(
    () =>
      episodes
        .map((episode) => ({
          episodeId: episode.id,
          episodeNumber: episode.episode_number,
          title: episode.title,
          hasStill: Boolean(episode.url_original_still),
          hasDescription: Boolean((episode.synopsis ?? episode.overview ?? "").trim()),
          hasAirDate: Boolean(episode.air_date),
          hasRuntime: typeof episode.runtime === "number" && episode.runtime > 0,
        }))
        .sort((a, b) => a.episodeNumber - b.episodeNumber),
    [episodes]
  );

  const coverageSummary = useMemo(() => {
    const total = episodeCoverageRows.length;
    const count = (selector: (row: EpisodeCoverageRow) => boolean): number =>
      episodeCoverageRows.reduce((acc, row) => (selector(row) ? acc + 1 : acc), 0);
    return {
      total,
      stills: count((row) => row.hasStill),
      descriptions: count((row) => row.hasDescription),
      airDates: count((row) => row.hasAirDate),
      runtimes: count((row) => row.hasRuntime),
    };
  }, [episodeCoverageRows]);

  const castRoleMemberByPersonId = useMemo(
    () => new Map(castRoleMembers.map((member) => [member.person_id, member] as const)),
    [castRoleMembers]
  );

  const showCastByPersonId = useMemo(() => {
    const byPersonId = new Map<string, TrrShowCastMember>();
    for (const member of trrShowCast) {
      if (typeof member.person_id === "string" && member.person_id.trim().length > 0) {
        byPersonId.set(member.person_id, member);
      }
    }
    return byPersonId;
  }, [trrShowCast]);

  const availableCastRoles = useMemo(() => {
    const values = new Set<string>();
    for (const member of cast) {
      const scoped = castRoleMemberByPersonId.get(member.person_id);
      if (scoped?.roles.length) {
        for (const role of scoped.roles) {
          const canonical = canonicalizeCastRoleName(role);
          if (canonical) values.add(canonical);
        }
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [cast, castRoleMemberByPersonId]);

  const availableCastCreditCategories = useMemo(() => {
    const values = new Set<string>();
    for (const member of cast) {
      const category = showCastByPersonId.get(member.person_id)?.credit_category;
      if (typeof category === "string" && category.trim().length > 0) {
        values.add(category.trim());
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [cast, showCastByPersonId]);

  const castUniqueMembers = useMemo(() => {
    const seen = new Set<string>();
    const next: SeasonCastMember[] = [];
    for (const member of cast) {
      const personId = String(member.person_id || "").trim();
      if (!personId || seen.has(personId)) continue;
      seen.add(personId);
      next.push(member);
    }
    return next;
  }, [cast]);

  const castMergedMembers = useMemo(() => {
    return castUniqueMembers.map((member) => {
      const scoped = castRoleMemberByPersonId.get(member.person_id);
      const showCastMember = showCastByPersonId.get(member.person_id);
      const roles = scoped?.roles.length
        ? normalizeCastRoleList(scoped.roles)
        : [];
      const creditCategory =
        typeof showCastMember?.credit_category === "string" &&
        showCastMember.credit_category.trim().length > 0
          ? showCastMember.credit_category.trim()
          : null;
      return {
        ...member,
        roles,
        latest_season: typeof scoped?.latest_season === "number" ? scoped.latest_season : null,
        merged_photo_url:
          member.photo_url ||
          scoped?.photo_url ||
          showCastMember?.photo_url ||
          showCastMember?.cover_photo_url ||
          null,
        credit_category: creditCategory,
      };
    });
  }, [castRoleMemberByPersonId, castUniqueMembers, showCastByPersonId]);

  const castDisplayMembers = useMemo(() => {
    const filtered = castMergedMembers.filter((member) => {
      if (castSearchQueryDeferred.length > 0) {
        const name = (member.person_name || "").toLowerCase();
        if (!name.includes(castSearchQueryDeferred)) {
          return false;
        }
      }
      if (
        castRoleFilters.length > 0 &&
        !member.roles.some((role) =>
          castRoleFilters.some((selected) => castRoleMatchesFilter(role, selected))
        )
      ) {
        return false;
      }
      if (
        castCreditFilters.length > 0 &&
        !castCreditFilters.some(
          (selected) => selected.toLowerCase() === (member.credit_category ?? "").toLowerCase()
        )
      ) {
        return false;
      }
      if (castHasImageFilter === "yes" && !member.merged_photo_url) return false;
      if (castHasImageFilter === "no" && member.merged_photo_url) return false;
      return true;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (castSortBy === "name") {
        const aName = (a.person_name || "").toLowerCase();
        const bName = (b.person_name || "").toLowerCase();
        return castSortOrder === "asc" ? aName.localeCompare(bName) : bName.localeCompare(aName);
      }
      if (castSortBy === "season") {
        const aSeason = a.latest_season ?? -1;
        const bSeason = b.latest_season ?? -1;
        return castSortOrder === "asc" ? aSeason - bSeason : bSeason - aSeason;
      }
      const aEpisodes = a.episodes_in_season ?? 0;
      const bEpisodes = b.episodes_in_season ?? 0;
      return castSortOrder === "asc" ? aEpisodes - bEpisodes : bEpisodes - aEpisodes;
    });
    return sorted;
  }, [
    castMergedMembers,
    castCreditFilters,
    castHasImageFilter,
    castRoleFilters,
    castSearchQueryDeferred,
    castSortBy,
    castSortOrder,
  ]);

  const castDisplayTotals = useMemo(() => {
    let castTotal = 0;
    let crewTotal = 0;
    for (const member of castMergedMembers) {
      if (isCrewCreditCategory(member.credit_category)) {
        crewTotal += 1;
      } else {
        castTotal += 1;
      }
    }
    return {
      cast: castTotal,
      crew: crewTotal,
      total: castMergedMembers.length,
    };
  }, [castMergedMembers]);

  const showFallbackCastWarning =
    seasonCastSource === "show_fallback" &&
    Boolean(seasonCastEligibilityWarning) &&
    castUniqueMembers.every((member) => (member.episodes_in_season ?? 0) <= 0);

  const castSeasonMembers = useMemo(
    () => castDisplayMembers.filter((member) => !isCrewCreditCategory(member.credit_category)),
    [castDisplayMembers]
  );
  const crewSeasonMembers = useMemo(
    () => castDisplayMembers.filter((member) => isCrewCreditCategory(member.credit_category)),
    [castDisplayMembers]
  );
  const visibleCastSeasonMembers = useMemo(
    () => castSeasonMembers.slice(0, castRenderLimit),
    [castRenderLimit, castSeasonMembers]
  );
  const visibleCrewSeasonMembers = useMemo(
    () => crewSeasonMembers.slice(0, crewRenderLimit),
    [crewRenderLimit, crewSeasonMembers]
  );
  const renderedCastCount = visibleCastSeasonMembers.length;
  const matchedCastCount = castSeasonMembers.length;
  const totalCastCount = castDisplayTotals.cast;
  const renderedCrewCount = visibleCrewSeasonMembers.length;
  const matchedCrewCount = crewSeasonMembers.length;
  const totalCrewCount = castDisplayTotals.crew;
  const renderedVisibleCount = renderedCastCount + renderedCrewCount;
  const matchedVisibleCount = castDisplayMembers.length;
  const totalVisibleCount = castDisplayTotals.total;
  const castRenderProgressLabel = useMemo(() => {
    const rendered =
      Math.min(castRenderLimit, castSeasonMembers.length) +
      Math.min(crewRenderLimit, crewSeasonMembers.length);
    const total = castSeasonMembers.length + crewSeasonMembers.length;
    if (total === 0 || rendered >= total) return null;
    return `Rendering ${rendered.toLocaleString()}/${total.toLocaleString()}`;
  }, [castRenderLimit, castSeasonMembers.length, crewRenderLimit, crewSeasonMembers.length]);
  const castRoleMembersWarningWithSnapshotAge = withSnapshotAgeSuffix(
    castRoleMembersWarning,
    lastSuccessfulCastRoleMembersAt
  );
  const seasonHasPersonRefreshInFlight = Object.keys(refreshingPersonIds).length > 0;
  const seasonCastAnyJobRunning = refreshingCast || enrichingCast || seasonHasPersonRefreshInFlight;
  const buildShowCastRoleEditorQuery = useCallback(
    (personId: string) => {
      const roleAndCreditFilters = [
        ...castRoleFilters.map((value) => `role:${value}`),
        ...castCreditFilters.map((value) => `credit:${value}`),
      ];
      const castQuery = writeShowCastRouteState(new URLSearchParams(), {
        searchQuery: castSearchQueryDebounced,
        sortBy: castSortBy,
        sortOrder: castSortOrder,
        hasImageFilter: castHasImageFilter,
        seasonFilters: Number.isFinite(seasonNumber) ? [seasonNumber] : [],
        filters: roleAndCreditFilters,
      });
      castQuery.set("cast_person", personId);
      castQuery.set("cast_open_role_editor", "1");
      return castQuery;
    },
    [
      castCreditFilters,
      castHasImageFilter,
      castRoleFilters,
      castSearchQueryDebounced,
      castSortBy,
      castSortOrder,
      seasonNumber,
    ]
  );

  useEffect(() => {
    setCastRenderLimit(SEASON_CAST_INCREMENTAL_INITIAL_LIMIT);
    setCrewRenderLimit(SEASON_CAST_INCREMENTAL_INITIAL_LIMIT);
  }, [castCreditFilters, castHasImageFilter, castRoleFilters, castSearchQuery, castSortBy, castSortOrder]);

  useEffect(() => {
    if (activeTab !== "cast") return;
    if (castRenderLimit >= castSeasonMembers.length && crewRenderLimit >= crewSeasonMembers.length) {
      return;
    }
    const schedule = () => {
      castIncrementalTimeoutRef.current = setTimeout(() => {
        setCastRenderLimit((prev) =>
          prev >= castSeasonMembers.length
            ? prev
            : Math.min(prev + SEASON_CAST_INCREMENTAL_BATCH_SIZE, castSeasonMembers.length)
        );
        setCrewRenderLimit((prev) =>
          prev >= crewSeasonMembers.length
            ? prev
            : Math.min(prev + SEASON_CAST_INCREMENTAL_BATCH_SIZE, crewSeasonMembers.length)
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
    castRenderLimit,
    castSeasonMembers.length,
    crewRenderLimit,
    crewSeasonMembers.length,
  ]);

  const formatEpisodesLabel = (count: number) => {
    const normalized = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
    return `${normalized} ${normalized === 1 ? "episode" : "episodes"} this season`;
  };

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

  const advancedFilteredMediaAssets = useMemo(() => {
    return applyAdvancedFiltersToSeasonAssets(assets, advancedFilters, {
      showName: show?.name ?? undefined,
      getSeasonNumber: () => seasonNumber,
    });
  }, [assets, advancedFilters, seasonNumber, show?.name]);

  const galleryDiagnostics = useMemo(() => {
    const sourceCounts = new Map<string, number>();
    let missingVariants = 0;
    let oversized = 0;
    let unclassified = 0;

    for (const asset of advancedFilteredMediaAssets) {
      const sourceKey = (asset.source || "unknown").trim().toLowerCase() || "unknown";
      sourceCounts.set(sourceKey, (sourceCounts.get(sourceKey) ?? 0) + 1);

      const missingKeys = getMissingVariantKeys(asset.metadata ?? null);
      if (missingKeys.length > 0) {
        missingVariants += 1;
      }
      const pixelCount =
        typeof asset.width === "number" && typeof asset.height === "number"
          ? asset.width * asset.height
          : 0;
      if (pixelCount > 6_000_000) oversized += 1;
      if (!asset.kind || asset.kind.trim().toLowerCase() === "other") unclassified += 1;
    }

    const topSources = Array.from(sourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      total: advancedFilteredMediaAssets.length,
      missingVariants,
      missingVariantBreakdown: buildMissingVariantBreakdown(
        advancedFilteredMediaAssets.map((asset) => asset.metadata ?? null)
      ),
      oversized,
      unclassified,
      topSources,
    };
  }, [advancedFilteredMediaAssets]);

  const filteredMediaAssets = useMemo(() => {
    if (galleryDiagnosticFilter === "all") return advancedFilteredMediaAssets;
    return advancedFilteredMediaAssets.filter((asset) => {
      if (galleryDiagnosticFilter === "missing-variants") {
        return hasMissingVariants(asset.metadata ?? null);
      }
      if (galleryDiagnosticFilter === "oversized") {
        const pixelCount =
          typeof asset.width === "number" && typeof asset.height === "number"
            ? asset.width * asset.height
            : 0;
        return pixelCount > 6_000_000;
      }
      if (galleryDiagnosticFilter === "unclassified") {
        return !asset.kind || asset.kind.trim().toLowerCase() === "other";
      }
      return true;
    });
  }, [advancedFilteredMediaAssets, galleryDiagnosticFilter]);

  useEffect(() => {
    setAssetsVisibleCount(120);
  }, [advancedFilters, galleryDiagnosticFilter]);

  const mediaSections = useMemo(() => {
    return groupSeasonAssetsBySection(filteredMediaAssets.slice(0, assetsVisibleCount), {
      seasonNumber,
      showName: show?.name ?? undefined,
      includeOther: true,
    });
  }, [filteredMediaAssets, assetsVisibleCount, seasonNumber, show?.name]);

  const isTextFilterActive = useMemo(() => {
    const wantsText = advancedFilters.text.includes("text");
    const wantsNoText = advancedFilters.text.includes("no_text");
    return wantsText !== wantsNoText;
  }, [advancedFilters.text]);

  const unknownTextCount = useMemo(() => {
    if (!isTextFilterActive) return 0;
    return assets.filter((a) => inferHasTextOverlay(a.metadata ?? null) === null).length;
  }, [isTextFilterActive, assets]);

  const detectTextOverlayForUnknown = useCallback(async () => {
    const targets = assets
      .filter((a) => looksLikeUuid(a.id) && inferHasTextOverlay(a.metadata ?? null) === null)
      .slice(0, 25);
    if (targets.length === 0) return;

    setTextOverlayDetectError(null);
    const headers = await getAuthHeaders();
    for (const asset of targets) {
      try {
        const response = await fetch(`/api/admin/trr-api/media-assets/${asset.id}/detect-text-overlay`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ force: false }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const errorText =
            typeof data.error === "string" ? data.error : "Detect text overlay failed";
          const detailText = typeof data.detail === "string" ? data.detail : null;
          setTextOverlayDetectError(detailText ? `${errorText}: ${detailText}` : errorText);
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

    await fetchAssets();
  }, [assets, getAuthHeaders, fetchAssets]);

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
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-zinc-900">Admin access required</p>
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
          <p className="text-sm text-zinc-600">Loading season data...</p>
        </div>
      </div>
    );
  }

  if (!show || !season) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">
            {error || "Season not found"}
          </p>
          <Link
            href={buildShowAdminUrl({ showSlug: showSlugForRouting }) as Route}
            className="mt-4 inline-block text-sm text-zinc-600 hover:text-zinc-900"
          >
            ← Back to Show
          </Link>
        </div>
      </div>
    );
  }

  const socialViewBreadcrumbLabel = `${formatSocialAnalyticsViewLabel(socialAnalyticsView)} Analytics`;

  const socialTabHref = buildSeasonAdminUrl({
    showSlug: showSlugForRouting,
    seasonNumber: season.season_number,
    tab: "social",
    socialView: socialAnalyticsView,
  });
  const socialHeaderBreadcrumbItems = buildSeasonSocialBreadcrumb(show.name, season.season_number, {
    showHref: buildShowAdminUrl({ showSlug: showSlugForRouting }),
    seasonHref: buildSeasonAdminUrl({
      showSlug: showSlugForRouting,
      seasonNumber: season.season_number,
    }),
    socialHref: socialTabHref,
    subTabLabel: socialViewBreadcrumbLabel,
    subTabHref: socialTabHref,
  });
  const socialHeaderTitle = `${show.name} · Season ${season.season_number}`;

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        {activeTab === "social" ? (
          <SocialAdminPageHeader
            breadcrumbs={socialHeaderBreadcrumbItems}
            title={socialHeaderTitle}
            backHref={buildShowAdminUrl({ showSlug: showSlugForRouting })}
            backLabel="Back"
            bodyClassName="px-6 py-6"
          />
        ) : (
          <AdminGlobalHeader bodyClassName="px-6 py-5">
            <div className="mx-auto max-w-6xl">
              <div className="mb-4">
                <Link
                  href={buildShowAdminUrl({ showSlug: showSlugForRouting }) as Route}
                  className="text-sm text-zinc-500 hover:text-zinc-900"
                >
                  ← Back to Show
                </Link>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <AdminBreadcrumbs
                    items={buildSeasonBreadcrumb(show.name, season.season_number, {
                      showHref: buildShowAdminUrl({ showSlug: showSlugForRouting }),
                      seasonHref: buildSeasonAdminUrl({
                        showSlug: showSlugForRouting,
                        seasonNumber: season.season_number,
                      }),
                    })}
                    className="mb-1"
                  />
                  <h1 className="text-3xl font-bold text-zinc-900">
                    {show.name} · Season {season.season_number}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                        seasonEligibleForMedia
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {seasonEligibleForMedia ? "Eligible Season" : "Placeholder Season"}
                    </span>
                    <span className="text-xs text-zinc-500">{seasonEligibilityReason}</span>
                  </div>
                  {season.overview && (
                    <p className="mt-2 text-sm text-zinc-600 max-w-3xl">
                      {season.overview}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {show.tmdb_id && (
                    <TmdbLinkIcon
                      showTmdbId={show.tmdb_id}
                      seasonNumber={season.season_number}
                      type="season"
                    />
                  )}
                </div>
              </div>
            </div>
          </AdminGlobalHeader>
        )}

        <div className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-6xl px-6">
            <SeasonTabsNav tabs={SEASON_PAGE_TABS} activeTab={activeTab} onSelect={setTab} />
            {activeTab === "social" && (
              <nav className="pb-4 flex flex-wrap gap-2">
                {SEASON_SOCIAL_ANALYTICS_VIEWS.map((view) => (
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
          </div>
        </div>

        <main className="mx-auto max-w-6xl px-6 py-8">
          {activeTab === "episodes" && (
            <SeasonEpisodesTab>
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Episodes
                  </p>
                  <h3 className="text-xl font-bold text-zinc-900">
                    Season {season.season_number}
                  </h3>
                </div>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                  {episodes.length} episodes
                </span>
              </div>

              <div className="space-y-3">
                {episodes.map((episode) => {
                  const imdbRatingText = formatFixed1(episode.imdb_rating);
                  const tmdbVoteAverageText = formatFixed1(episode.tmdb_vote_average);
                  const isFocusedEpisode = focusedEpisodeId === episode.id;

                  return (
                    <div
                      key={episode.id}
                      ref={(node) => {
                        episodeRowRefs.current[episode.id] = node;
                      }}
                      data-focused={isFocusedEpisode ? "true" : undefined}
                      className={`flex items-start gap-4 rounded-lg border p-4 transition ${
                        isFocusedEpisode
                          ? "border-blue-300 bg-blue-50 shadow-[0_0_0_2px_rgba(37,99,235,0.15)]"
                          : "border-zinc-100 bg-zinc-50/50"
                      }`}
                    >
                      {episode.url_original_still && (
                        <button
                          onClick={(e) => {
                            const episodesWithStills = episodes.filter((ep) => ep.url_original_still);
                            const idx = episodesWithStills.findIndex((ep) => ep.id === episode.id);
                            openEpisodeLightbox(episode, idx, episodesWithStills, e.currentTarget);
                          }}
                          className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <GalleryImage
                            src={episode.url_original_still}
                            alt={episode.title || `Episode ${episode.episode_number}`}
                            sizes="112px"
                          />
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold text-zinc-500">
                                Episode {episode.episode_number}
                              </p>
                              {show.tmdb_id && episode.tmdb_episode_id && (
                                <TmdbLinkIcon
                                  showTmdbId={show.tmdb_id}
                                  seasonNumber={episode.season_number}
                                  episodeNumber={episode.episode_number}
                                  type="episode"
                                />
                              )}
                              {episode.imdb_episode_id && (
                                <ImdbLinkIcon imdbId={episode.imdb_episode_id} type="title" />
                              )}
                            </div>
                            <p className="font-semibold text-zinc-900">
                              {episode.title || "Untitled"}
                            </p>
                          </div>
                          {imdbRatingText && (
                            <span className="flex items-center gap-1 text-sm text-zinc-600">
                              <span className="text-yellow-500">★</span>
                              {imdbRatingText}
                            </span>
                          )}
                        </div>
                        {(episode.synopsis || episode.overview) && (
                          <p className="mt-1 text-sm text-zinc-600 line-clamp-2">
                            {episode.synopsis || episode.overview}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
                          {episode.air_date && (
                            <span>{new Date(episode.air_date).toLocaleDateString()}</span>
                          )}
                          {episode.runtime && <span>{episode.runtime} min</span>}
                          {tmdbVoteAverageText && (
                            <span>TMDB {tmdbVoteAverageText}</span>
                          )}
                          {episode.imdb_vote_count && (
                            <span>IMDB votes {episode.imdb_vote_count}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {episodes.length === 0 && (
                  <p className="text-sm text-zinc-500">No episodes found for this season.</p>
                )}
              </div>

              <section className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Episode Coverage Matrix
                    </p>
                    <p className="text-xs text-zinc-500">
                      Missing data is surfaced per episode for stills, copy, air date, and runtime.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-white px-2 py-1 text-zinc-600">
                      Stills {coverageSummary.stills}/{coverageSummary.total}
                    </span>
                    <span className="rounded-full bg-white px-2 py-1 text-zinc-600">
                      Descriptions {coverageSummary.descriptions}/{coverageSummary.total}
                    </span>
                    <span className="rounded-full bg-white px-2 py-1 text-zinc-600">
                      Air Dates {coverageSummary.airDates}/{coverageSummary.total}
                    </span>
                    <span className="rounded-full bg-white px-2 py-1 text-zinc-600">
                      Runtime {coverageSummary.runtimes}/{coverageSummary.total}
                    </span>
                  </div>
                </div>
                {episodeCoverageRows.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-zinc-100 text-zinc-600">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Episode</th>
                          <th className="px-3 py-2 font-semibold">Still</th>
                          <th className="px-3 py-2 font-semibold">Description</th>
                          <th className="px-3 py-2 font-semibold">Air Date</th>
                          <th className="px-3 py-2 font-semibold">Runtime</th>
                        </tr>
                      </thead>
                      <tbody>
                        {episodeCoverageRows.map((row) => (
                          <tr key={row.episodeId} className="border-t border-zinc-100">
                            <td className="px-3 py-2 text-zinc-700">
                              E{row.episodeNumber} {row.title ? `· ${row.title}` : ""}
                            </td>
                            {[
                              { key: "still", ok: row.hasStill },
                              { key: "description", ok: row.hasDescription },
                              { key: "air-date", ok: row.hasAirDate },
                              { key: "runtime", ok: row.hasRuntime },
                            ].map(({ key, ok }) => (
                                <td key={`${row.episodeId}-${key}`} className="px-3 py-2">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${
                                      ok
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-amber-100 text-amber-700"
                                    }`}
                                  >
                                    {ok ? "Ready" : "Missing"}
                                  </span>
                                </td>
                              ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">No episodes available for coverage matrix.</p>
                )}
              </section>
              </div>
            </SeasonEpisodesTab>
          )}

          {activeTab === "assets" && (
            <SeasonAssetsTab>
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    {assetsView === "images"
                      ? "Season Images"
                      : assetsView === "videos"
                        ? "Season Videos"
                        : "Branding"}
                  </p>
                  <h3 className="text-xl font-bold text-zinc-900">
                    {show.name} · Season {season.season_number}
                  </h3>
                </div>
                <div className="flex flex-col gap-3 sm:items-end">
                  <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
                    <button
                      type="button"
                      onClick={() => setAssetsSubTab("images")}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                        assetsView === "images"
                          ? "bg-white text-zinc-900 shadow-sm"
                          : "text-zinc-500 hover:text-zinc-700"
                      }`}
                    >
                      Images
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssetsSubTab("videos")}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                        assetsView === "videos"
                          ? "bg-white text-zinc-900 shadow-sm"
                          : "text-zinc-500 hover:text-zinc-700"
                      }`}
                    >
                      Videos
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssetsSubTab("branding")}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                        assetsView === "branding"
                          ? "bg-white text-zinc-900 shadow-sm"
                          : "text-zinc-500 hover:text-zinc-700"
                      }`}
                    >
                      Branding
                    </button>
                  </div>

                  {assetsView === "images" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={handleRefreshImages}
                        disabled={refreshingAssets}
                        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M20 8a8 8 0 00-14-4M4 16a8 8 0 0014 4" />
                        </svg>
                        {refreshingAssets ? "Refreshing..." : "Refresh Images"}
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
                        onClick={openAddBackdrops}
                        disabled={!seasonEligibleForMedia && !allowPlaceholderMediaOverride}
                        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Assign TMDb Backdrops
                      </button>
                      <button
                        onClick={() => setScrapeDrawerOpen(true)}
                        disabled={!seasonEligibleForMedia && !allowPlaceholderMediaOverride}
                        className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Import Images
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {(assetsRefreshNotice || assetsRefreshError) && (
                <p
                  className={`mb-4 text-sm ${
                    assetsRefreshError ? "text-red-600" : "text-zinc-500"
                  }`}
                >
                  {assetsRefreshError || assetsRefreshNotice}
                </p>
              )}
              <RefreshProgressBar
                show={refreshingAssets}
                stage={assetsRefreshProgress?.stage}
                message={assetsRefreshProgress?.message}
                current={assetsRefreshProgress?.current}
                total={assetsRefreshProgress?.total}
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
              {assetsTruncatedWarning && (
                <p className="mb-4 text-xs font-medium text-amber-700">{assetsTruncatedWarning}</p>
              )}
              <RefreshActivityLog
                title="Refresh Activity"
                entries={refreshLogEntries}
                scopes={["assets", "image"]}
                open={assetsRefreshLogOpen}
                onToggle={() => setAssetsRefreshLogOpen((prev) => !prev)}
              />

              {!seasonEligibleForMedia && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">Placeholder season guardrail</p>
                  <p className="mt-1 text-xs text-amber-700">
                    This season has no premiere date and not enough episodes yet. Media imports are blocked by
                    default to avoid assigning assets to placeholder seasons.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAllowPlaceholderMediaOverride((prev) => !prev)}
                    className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    {allowPlaceholderMediaOverride ? "Disable Override" : "Enable Override"}
                  </button>
                </div>
              )}

              {assetsView === "images" ? (
                <div className="space-y-8">
                <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <button
                    type="button"
                    onClick={() => setGalleryDiagnosticsOpen((prev) => !prev)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
                    aria-expanded={galleryDiagnosticsOpen}
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Gallery Diagnostics
                      </p>
                      <p className="text-xs text-zinc-500">
                        Source quality, variant status, and quick risk filters.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-wrap justify-end gap-2 text-xs">
                        <span className="rounded-full bg-white px-2 py-1 text-zinc-600">
                          Assets {galleryDiagnostics.total}
                        </span>
                        <span className="rounded-full bg-white px-2 py-1 text-zinc-600">
                          Missing variants {galleryDiagnostics.missingVariants}
                        </span>
                        <span className="rounded-full bg-white px-2 py-1 text-zinc-600">
                          Oversized {galleryDiagnostics.oversized}
                        </span>
                        <span className="rounded-full bg-white px-2 py-1 text-zinc-600">
                          Unclassified {galleryDiagnostics.unclassified}
                        </span>
                        <span className="rounded-full bg-white px-2 py-1 text-zinc-600">
                          Fallback recovered {galleryFallbackTelemetry.fallbackRecoveredCount}
                        </span>
                        <span className="rounded-full bg-white px-2 py-1 text-zinc-600">
                          Fallback failed {galleryFallbackTelemetry.allCandidatesFailedCount}
                        </span>
                      </div>
                      <svg
                        className={`h-4 w-4 text-zinc-500 transition-transform ${
                          galleryDiagnosticsOpen ? "rotate-180" : ""
                        }`}
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                      >
                        <path d="m5 7 5 6 5-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </button>
                  {galleryDiagnosticsOpen && (
                    <>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(
                          [
                            { key: "all", label: "All" },
                            { key: "missing-variants", label: "Missing Variants" },
                            { key: "oversized", label: "Oversized" },
                            { key: "unclassified", label: "Unclassified" },
                          ] as const
                        ).map((option) => (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => setGalleryDiagnosticFilter(option.key)}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                              galleryDiagnosticFilter === option.key
                                ? "border-zinc-900 bg-zinc-900 text-white"
                                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      {galleryDiagnostics.topSources.length > 0 && (
                        <p className="mt-3 text-xs text-zinc-500">
                          Top sources:{" "}
                          {galleryDiagnostics.topSources
                            .map(([source, count]) => `${source} (${count})`)
                            .join(", ")}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-zinc-500">
                        Fallback diagnostics: {galleryFallbackTelemetry.fallbackRecoveredCount} recovered,{" "}
                        {galleryFallbackTelemetry.allCandidatesFailedCount} failed,{" "}
                        {galleryFallbackTelemetry.totalImageAttempts} attempted.
                      </p>
                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Missing Variant Breakdown
                        </p>
                        {galleryDiagnostics.missingVariantBreakdown.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {galleryDiagnostics.missingVariantBreakdown.map((item) => (
                              <span
                                key={item.key}
                                className="rounded-full bg-white px-2 py-1 text-xs text-zinc-700"
                              >
                                {item.key} ({item.count})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-zinc-500">
                            No missing variants detected.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </section>
                {mediaSections.backdrops.length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Backdrops</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {mediaSections.backdrops.map((asset, i, arr) => (
                          <button
                            key={asset.id}
                            onClick={(e) => openAssetLightbox(asset, i, arr, e.currentTarget)}
                            className="relative aspect-[16/9] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <GalleryImage
                              src={getAssetDisplayUrl(asset)}
                              srcCandidates={getSeasonAssetCardUrlCandidates(asset)}
                              diagnosticKey={`${asset.origin_table || "unknown"}:${asset.id}`}
                              onFallbackEvent={trackGalleryFallbackEvent}
                              alt={asset.caption || "Season backdrop"}
                              sizes="300px"
                              className="object-cover"
                            />
                          </button>
                        ))}
                    </div>
                  </section>
                )}

                {mediaSections.posters.length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Posters</h4>
                    <div className="grid grid-cols-4 gap-4">
                      {mediaSections.posters.map((asset, i, arr) => (
                          <button
                            key={asset.id}
                            onClick={(e) => openAssetLightbox(asset, i, arr, e.currentTarget)}
                            className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <GalleryImage
                              src={getAssetDisplayUrl(asset)}
                              srcCandidates={getSeasonAssetCardUrlCandidates(asset)}
                              diagnosticKey={`${asset.origin_table || "unknown"}:${asset.id}`}
                              onFallbackEvent={trackGalleryFallbackEvent}
                              alt={asset.caption || "Poster"}
                              sizes="180px"
                            />
                          </button>
                        ))}
                    </div>
                  </section>
                )}

                {mediaSections.episode_stills.length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Episode Stills</h4>
                    <div className="grid grid-cols-6 gap-3">
                      {mediaSections.episode_stills.map((asset, i, arr) => (
                          <button
                            key={asset.id}
                            onClick={(e) => openAssetLightbox(asset, i, arr, e.currentTarget)}
                            className="relative aspect-video overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <GalleryImage
                              src={getAssetDisplayUrl(asset)}
                              srcCandidates={getSeasonAssetCardUrlCandidates(asset)}
                              diagnosticKey={`${asset.origin_table || "unknown"}:${asset.id}`}
                              onFallbackEvent={trackGalleryFallbackEvent}
                              alt={asset.caption || "Episode still"}
                              sizes="150px"
                            />
                          </button>
                        ))}
                    </div>
                  </section>
                )}

                {mediaSections.profile_pictures.length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Profile Pictures</h4>
                    <div className="grid grid-cols-5 gap-4">
                      {mediaSections.profile_pictures.map((asset, i, arr) => (
                          <button
                            key={asset.id}
                            onClick={(e) => openAssetLightbox(asset, i, arr, e.currentTarget)}
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
                                <p className="truncate text-xs text-white">{asset.person_name}</p>
                              </div>
                            )}
                          </button>
                        ))}
                    </div>
                  </section>
                )}

                {mediaSections.cast_photos.length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Cast Photos</h4>
                    <div className="grid grid-cols-5 gap-4">
                      {mediaSections.cast_photos.map((asset, i, arr) => (
                          <button
                            key={asset.id}
                            onClick={(e) => openAssetLightbox(asset, i, arr, e.currentTarget)}
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
                                <p className="truncate text-xs text-white">{asset.person_name}</p>
                              </div>
                            )}
                          </button>
                        ))}
                    </div>
                  </section>
                )}

                {mediaSections.confessionals.length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Confessionals</h4>
                    <div className="grid grid-cols-5 gap-4">
                      {mediaSections.confessionals.map((asset, i, arr) => (
                        <button
                          key={asset.id}
                          onClick={(e) => openAssetLightbox(asset, i, arr, e.currentTarget)}
                          className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <GalleryImage
                            src={getAssetDisplayUrl(asset)}
                            srcCandidates={getSeasonAssetCardUrlCandidates(asset)}
                            diagnosticKey={`${asset.origin_table || "unknown"}:${asset.id}`}
                              onFallbackEvent={trackGalleryFallbackEvent}
                            alt={asset.caption || "Confessional"}
                            sizes="180px"
                          />
                          {asset.person_name && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                              <p className="truncate text-xs text-white">{asset.person_name}</p>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {mediaSections.reunion.length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Reunion</h4>
                    <div className="grid grid-cols-5 gap-4">
                      {mediaSections.reunion.map((asset, i, arr) => (
                        <button
                          key={asset.id}
                          onClick={(e) => openAssetLightbox(asset, i, arr, e.currentTarget)}
                          className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <GalleryImage
                            src={getAssetDisplayUrl(asset)}
                            srcCandidates={getSeasonAssetCardUrlCandidates(asset)}
                            diagnosticKey={`${asset.origin_table || "unknown"}:${asset.id}`}
                              onFallbackEvent={trackGalleryFallbackEvent}
                            alt={asset.caption || "Reunion"}
                            sizes="180px"
                          />
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {mediaSections.intro_card.length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Intro Card</h4>
                    <div className="grid grid-cols-5 gap-4">
                      {mediaSections.intro_card.map((asset, i, arr) => (
                        <button
                          key={asset.id}
                          onClick={(e) => openAssetLightbox(asset, i, arr, e.currentTarget)}
                          className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <GalleryImage
                            src={getAssetDisplayUrl(asset)}
                            srcCandidates={getSeasonAssetCardUrlCandidates(asset)}
                            diagnosticKey={`${asset.origin_table || "unknown"}:${asset.id}`}
                              onFallbackEvent={trackGalleryFallbackEvent}
                            alt={asset.caption || "Intro Card"}
                            sizes="180px"
                          />
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {mediaSections.other.length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Other</h4>
                    <div className="grid grid-cols-5 gap-4">
                      {mediaSections.other.map((asset, i, arr) => (
                        <button
                          key={asset.id}
                          onClick={(e) => openAssetLightbox(asset, i, arr, e.currentTarget)}
                          className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <GalleryImage
                            src={getAssetDisplayUrl(asset)}
                            srcCandidates={getSeasonAssetCardUrlCandidates(asset)}
                            diagnosticKey={`${asset.origin_table || "unknown"}:${asset.id}`}
                              onFallbackEvent={trackGalleryFallbackEvent}
                            alt={asset.caption || "Other media"}
                            sizes="180px"
                          />
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {filteredMediaAssets.length > assetsVisibleCount && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => setAssetsVisibleCount((prev) => prev + 120)}
                      className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                    >
                      Load More Images
                    </button>
                  </div>
                )}

                {filteredMediaAssets.length === 0 && (
                  <p className="text-sm text-zinc-500">No media found for this season.</p>
                )}
              </div>
              ) : assetsView === "branding" ? (
                <div className="space-y-4">
                  {trrShowCastLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
                    </div>
                  ) : trrShowCastError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <p className="text-sm text-red-700">{trrShowCastError}</p>
                      <button
                        type="button"
                        onClick={() => {
                          showCastFetchAttemptedRef.current = false;
                          fetchShowCastForBrand();
                        }}
                        className="mt-2 text-xs font-semibold text-red-600 hover:underline"
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    <ShowBrandEditor
                      trrShowId={showId}
                      trrShowName={show.name}
                      trrSeasons={showSeasons}
                      trrCast={trrShowCast}
                    />
                  )}
                </div>
              ) : null}
              </div>
            </SeasonAssetsTab>
          )}

          {activeTab === "assets" && assetsView === "videos" && (
            <SeasonVideosTab>
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Bravo Videos
                  </p>
                  <h3 className="text-xl font-bold text-zinc-900">
                    Season {season.season_number}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => void fetchSeasonBravoVideos({ forceSync: true })}
                  disabled={bravoVideosLoading}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                >
                  {bravoVideosLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              {bravoVideosError && <p className="mb-4 text-sm text-red-600">{bravoVideosError}</p>}
              {bravoVideoSyncing && (
                <p className="mb-4 text-sm text-zinc-500">Syncing high-quality video thumbnails...</p>
              )}
              {bravoVideoSyncWarning && !bravoVideosError && (
                <p className="mb-4 text-sm text-amber-700">{bravoVideoSyncWarning}</p>
              )}
              {!bravoVideosLoading && bravoVideos.length === 0 && !bravoVideosError && (
                <p className="text-sm text-zinc-500">No persisted Bravo videos found for this season.</p>
              )}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {bravoVideos.map((video) => {
                  const thumbnailUrl = resolveBravoVideoThumbnailUrl(video);
                  return (
                  <article key={`${video.clip_url}-${video.published_at ?? "unknown"}`} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <a href={video.clip_url} target="_blank" rel="noopener noreferrer" className="group block">
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
            </SeasonVideosTab>
          )}

          {activeTab === "news" && (
            <section
              id="season-tabpanel-news"
              role="tabpanel"
              aria-labelledby="season-tab-news"
            >
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                  Season News
                </p>
                <h3 className="mt-1 text-xl font-bold text-zinc-900">
                  {show.name} · Season {season.season_number}
                </h3>
                <p className="mt-3 text-sm text-zinc-600">
                  Season-specific curation is managed in the show-level News tab.
                </p>
                <Link
                  href={buildShowAdminUrl({ showSlug: showSlugForRouting, tab: "news" }) as Route}
                  className="mt-4 inline-flex rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  Open Show News
                </Link>
              </div>
            </section>
          )}

          {activeTab === "fandom" && (
            <SeasonFandomTab>
              <div className="space-y-6">
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Fandom</p>
                    <h3 className="text-xl font-bold text-zinc-900">Season {season.season_number}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFandomSyncOpen(true)}
                    className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    Sync by Fandom
                  </button>
                </div>
                {fandomSyncError && <p className="mt-3 text-sm text-red-600">{fandomSyncError}</p>}
                {seasonFandomError && <p className="mt-2 text-sm text-red-600">{seasonFandomError}</p>}
              </div>

              {seasonFandomLoading ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-zinc-500">Loading season fandom...</p>
                </div>
              ) : seasonFandomData.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-zinc-500">No persisted Fandom data found for this season.</p>
                </div>
              ) : (
                seasonFandomData.map((fandom) => (
                  <div key={fandom.id} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">{fandom.source}</p>
                        <h4 className="text-lg font-semibold text-zinc-900">{fandom.page_title || "Fandom Season Profile"}</h4>
                      </div>
                      {fandom.source_url && (
                        <a
                          href={fandom.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
                        >
                          View on Fandom →
                        </a>
                      )}
                    </div>
                    {fandom.summary && <p className="mb-4 text-sm leading-relaxed text-zinc-700">{fandom.summary}</p>}
                    <SeasonFandomDynamicSections sections={fandom.dynamic_sections} />
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      {Array.isArray(fandom.citations) && (
                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Citations</p>
                          <pre className="overflow-auto text-xs text-zinc-700">{JSON.stringify(fandom.citations, null, 2)}</pre>
                        </div>
                      )}
                      {Array.isArray(fandom.conflicts) && (
                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Conflicts</p>
                          <pre className="overflow-auto text-xs text-zinc-700">{JSON.stringify(fandom.conflicts, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              </div>
            </SeasonFandomTab>
          )}

          {activeTab === "cast" && (
            <SeasonCastTab>
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Cast
                  </p>
                  <h3 className="text-xl font-bold text-zinc-900">
                    Season {season.season_number}
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                    {renderedCastCount}/{matchedCastCount}/{totalCastCount} cast ·{" "}
                    {renderedCrewCount}/{matchedCrewCount}/{totalCrewCount} crew ·{" "}
                    {renderedVisibleCount}/{matchedVisibleCount}/{totalVisibleCount} visible
                    {archiveCast.length > 0 ? ` · ${archiveCast.length} archive-only` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={refreshSeasonCast}
                    disabled={seasonCastAnyJobRunning}
                    title={seasonCastAnyJobRunning ? "Cast sync in progress" : undefined}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {refreshingCast ? "Syncing..." : "Sync Cast"}
                  </button>
                  <button
                    type="button"
                    onClick={enrichSeasonCastMedia}
                    disabled={seasonCastAnyJobRunning}
                    title={seasonCastAnyJobRunning ? "Cast sync in progress" : undefined}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {enrichingCast ? "Enriching..." : "Enrich Cast & Crew Media"}
                  </button>
                  {seasonCastAnyJobRunning && (
                    <button
                      type="button"
                      onClick={cancelSeasonCastRefresh}
                      className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
              {(castRefreshNotice || castRefreshError) && (
                <p className={`mb-4 text-sm ${castRefreshError ? "text-red-600" : "text-zinc-500"}`}>
                  {castRefreshError || castRefreshNotice}
                </p>
              )}
              {(castEnrichNotice || castEnrichError) && (
                <p className={`mb-4 text-sm ${castEnrichError ? "text-red-600" : "text-zinc-500"}`}>
                  {castEnrichError || castEnrichNotice}
                </p>
              )}
              {showFallbackCastWarning && (
                <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Season cast evidence is still syncing. Showing show-level cast fallback until
                  episode-level cast sync completes.
                </div>
              )}
              <RefreshProgressBar
                show={refreshingCast || enrichingCast}
                stage={castRefreshProgress?.stage}
                message={castRefreshProgress?.message}
                current={castRefreshProgress?.current}
                total={castRefreshProgress?.total}
              />
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
                        onClick={() => void retryFailedSeasonCastMediaEnrich()}
                        disabled={refreshingCast || enrichingCast}
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
              <RefreshActivityLog
                title="Refresh Activity"
                entries={refreshLogEntries}
                scopes={["cast", "cast_enrich"]}
                open={castRefreshLogOpen}
                onToggle={() => setCastRefreshLogOpen((prev) => !prev)}
              />

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
              {castRoleMembersError && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  <span>{castRoleMembersError}</span>
                  <button
                    type="button"
                    onClick={() => void fetchCastRoleMembers({ force: true })}
                    className="rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    Retry
                  </button>
                </div>
              )}
              {trrShowCastError && (
                <div
                  className={`mb-4 flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${
                    castRoleMembersLoadedOnce
                      ? "border border-amber-300 bg-amber-50 text-amber-900"
                      : "border border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  <span>{trrShowCastError}</span>
                  <button
                    type="button"
                    onClick={() => {
                      showCastFetchAttemptedRef.current = false;
                      void fetchShowCastForBrand();
                    }}
                    className={`rounded-full bg-white px-3 py-1 text-xs font-semibold transition ${
                      castRoleMembersLoadedOnce
                        ? "border border-amber-400 text-amber-900 hover:bg-amber-100"
                        : "border border-rose-300 text-rose-700 hover:bg-rose-100"
                    }`}
                  >
                    Retry
                  </button>
                </div>
              )}

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
                      setCastSortBy("episodes");
                      setCastSortOrder("desc");
                      setCastRoleFilters([]);
                      setCastCreditFilters([]);
                      setCastHasImageFilter("all");
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
                      Roles & Credit
                    </span>
                    <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                      Role
                    </span>
                    {availableCastRoles.length === 0 ? (
                      <span className="text-xs text-zinc-500">No roles configured.</span>
                    ) : (
                      availableCastRoles.map((role) => {
                        const active = castRoleFilters.some((value) =>
                          castRoleMatchesFilter(value, role)
                        );
                        return (
                          <button
                            key={`season-role-filter-${role}`}
                            type="button"
                            aria-pressed={active}
                            onClick={() =>
                              setCastRoleFilters((prev) =>
                                active
                                  ? prev.filter((value) => !castRoleMatchesFilter(value, role))
                                  : [...prev, role]
                              )
                            }
                            className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                              active
                                ? "border-zinc-900 bg-zinc-900 text-white"
                                : "border-zinc-200 bg-white text-zinc-600"
                            }`}
                          >
                            {role}
                          </button>
                        );
                      })
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                      Credit
                    </span>
                    {availableCastCreditCategories.length === 0 ? (
                      <span className="text-xs text-zinc-500">No categories.</span>
                    ) : (
                      availableCastCreditCategories.map((category) => {
                        const active = castCreditFilters.some(
                          (value) => value.toLowerCase() === category.toLowerCase()
                        );
                        return (
                          <button
                            key={`season-credit-filter-${category}`}
                            type="button"
                            aria-pressed={active}
                            onClick={() =>
                              setCastCreditFilters((prev) =>
                                active
                                  ? prev.filter((value) => value.toLowerCase() !== category.toLowerCase())
                                  : [...prev, category]
                              )
                            }
                            className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                              active
                                ? "border-zinc-900 bg-zinc-900 text-white"
                                : "border-zinc-200 bg-white text-zinc-600"
                            }`}
                          >
                            {category}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {castRoleMembersLoading && (
                <p className="mb-2 text-sm text-zinc-500" aria-live="polite">
                  Loading cast intelligence...
                </p>
              )}
              {trrShowCastLoading && (
                <p className="mb-4 text-sm text-zinc-500" aria-live="polite">
                  Loading supplemental show cast data...
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
                  {castSeasonMembers.length === 0 ? (
                    <p className="text-sm text-zinc-500">No cast members match the selected filters.</p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {visibleCastSeasonMembers.map((member) => (
                        <div
                          key={member.person_id}
                          className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 transition hover:border-zinc-300 hover:bg-zinc-100/50"
                        >
                          <Link
                            href={buildPersonAdminUrl({
                              showSlug: showSlugForRouting,
                              personSlug: buildPersonRouteSlug({
                                personName: member.person_name,
                                personId: member.person_id,
                              }),
                              tab: "overview",
                              query: new URLSearchParams({
                                seasonNumber: String(seasonNumber),
                              }),
                            }) as Route}
                            className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                          >
                            <div className="relative mb-3 aspect-[4/5] overflow-hidden rounded-lg bg-zinc-200">
                              {member.merged_photo_url ? (
                                <CastPhoto
                                  src={member.merged_photo_url}
                                  alt={member.person_name || "Cast"}
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
                            <p className="font-semibold text-zinc-900">{member.person_name || "Unknown"}</p>
                            <p className="text-sm text-zinc-600">
                              {formatEpisodesLabel(member.episodes_in_season)}
                            </p>
                            <p className="text-xs text-zinc-500">
                              Role: {member.roles.length > 0 ? member.roles.join(", ") : "Unspecified for season"}
                            </p>
                            {member.latest_season && (
                              <p className="text-xs text-zinc-500">Latest season: {member.latest_season}</p>
                            )}
                            {member.roles.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {member.roles.map((role) => (
                                  <span
                                    key={`${member.person_id}-season-role-${role}`}
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
                            onClick={() =>
                              void handleRefreshSeasonCastMember(
                                member.person_id,
                                member.person_name || "Cast member"
                              )
                            }
                            disabled={seasonCastAnyJobRunning || Boolean(refreshingPersonIds[member.person_id])}
                            title={seasonCastAnyJobRunning ? "Cast sync in progress" : undefined}
                            className="mt-3 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50"
                          >
                            {refreshingPersonIds[member.person_id] ? "Refreshing..." : "Refresh Person"}
                          </button>
                          <Link
                            href={
                              buildShowAdminUrl({
                                showSlug: showSlugForRouting,
                                tab: "cast",
                                query: buildShowCastRoleEditorQuery(member.person_id),
                              }) as Route
                            }
                            className={`mt-2 block w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-center text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 ${
                              seasonCastAnyJobRunning ? "pointer-events-none opacity-50" : ""
                            }`}
                            title={seasonCastAnyJobRunning ? "Cast sync in progress" : undefined}
                          >
                            Edit Roles
                          </Link>
                          <RefreshProgressBar
                            show={Boolean(refreshingPersonIds[member.person_id])}
                            stage={refreshingPersonProgress[member.person_id]?.stage}
                            message={refreshingPersonProgress[member.person_id]?.message}
                            current={refreshingPersonProgress[member.person_id]?.current}
                            total={refreshingPersonProgress[member.person_id]?.total}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {crewSeasonMembers.length > 0 && (
                  <section>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Crew
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {visibleCrewSeasonMembers.map((member) => (
                        <div
                          key={`crew-${member.person_id}`}
                          className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 transition hover:border-blue-300 hover:bg-blue-100/40"
                        >
                          <Link
                            href={buildPersonAdminUrl({
                              showSlug: showSlugForRouting,
                              personSlug: buildPersonRouteSlug({
                                personName: member.person_name,
                                personId: member.person_id,
                              }),
                              tab: "overview",
                              query: new URLSearchParams({
                                seasonNumber: String(seasonNumber),
                              }),
                            }) as Route}
                            className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                          >
                            <div className="relative mb-3 aspect-[4/5] overflow-hidden rounded-lg bg-zinc-200">
                              {member.merged_photo_url ? (
                                <CastPhoto
                                  src={member.merged_photo_url}
                                  alt={member.person_name || "Crew"}
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
                            <p className="font-semibold text-zinc-900">{member.person_name || "Unknown"}</p>
                            {member.credit_category && (
                              <p className="text-sm text-blue-700">{member.credit_category}</p>
                            )}
                            <p className="text-xs text-zinc-600">
                              {formatEpisodesLabel(member.episodes_in_season)}
                            </p>
                            <p className="text-xs text-zinc-500">
                              Role: {member.roles.length > 0 ? member.roles.join(", ") : "Unspecified for season"}
                            </p>
                            {member.roles.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {member.roles.map((role) => (
                                  <span
                                    key={`${member.person_id}-season-crew-role-${role}`}
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
                            onClick={() =>
                              void handleRefreshSeasonCastMember(
                                member.person_id,
                                member.person_name || "Crew member"
                              )
                            }
                            disabled={seasonCastAnyJobRunning || Boolean(refreshingPersonIds[member.person_id])}
                            title={seasonCastAnyJobRunning ? "Cast sync in progress" : undefined}
                            className="mt-3 w-full rounded-md border border-blue-200 bg-white px-2 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
                          >
                            {refreshingPersonIds[member.person_id] ? "Refreshing..." : "Refresh Person"}
                          </button>
                          <Link
                            href={
                              buildShowAdminUrl({
                                showSlug: showSlugForRouting,
                                tab: "cast",
                                query: buildShowCastRoleEditorQuery(member.person_id),
                              }) as Route
                            }
                            className={`mt-2 block w-full rounded-md border border-blue-200 bg-white px-2 py-1 text-center text-xs font-semibold text-blue-700 transition hover:bg-blue-50 ${
                              seasonCastAnyJobRunning ? "pointer-events-none opacity-50" : ""
                            }`}
                            title={seasonCastAnyJobRunning ? "Cast sync in progress" : undefined}
                          >
                            Edit Roles
                          </Link>
                          <RefreshProgressBar
                            show={Boolean(refreshingPersonIds[member.person_id])}
                            stage={refreshingPersonProgress[member.person_id]?.stage}
                            message={refreshingPersonProgress[member.person_id]?.message}
                            current={refreshingPersonProgress[member.person_id]?.current}
                            total={refreshingPersonProgress[member.person_id]?.total}
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {archiveCast.length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">
                      Archive Footage Credits
                    </h4>
                    <p className="mb-3 text-xs text-zinc-500">
                      These credits are excluded from actual season-episode counts.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {archiveCast.map((member) => (
                        <Link
                          key={`archive-${member.person_id}`}
                          href={buildPersonAdminUrl({
                            showSlug: showSlugForRouting,
                            personSlug: buildPersonRouteSlug({
                              personName: member.person_name,
                              personId: member.person_id,
                            }),
                            tab: "overview",
                            query: new URLSearchParams({
                              seasonNumber: String(seasonNumber),
                            }),
                          }) as Route}
                          className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 transition hover:border-amber-300 hover:bg-amber-100/50"
                        >
                          <div className="relative mb-3 aspect-[4/5] overflow-hidden rounded-lg bg-zinc-200">
                            {member.photo_url ? (
                              <CastPhoto
                                src={member.photo_url}
                                alt={member.person_name || "Cast"}
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
                            {member.person_name || "Unknown"}
                          </p>
                          <p className="text-sm text-amber-800">
                            {((member.archive_episodes_in_season as number | null | undefined) ?? 0)} archived episodes this season
                          </p>
                          {(() => {
                            const scoped = castRoleMemberByPersonId.get(member.person_id);
                            const scopedRoles =
                              scoped?.roles && scoped.roles.length > 0
                                ? normalizeCastRoleList(scoped.roles)
                                : [];
                            if (scopedRoles.length === 0) {
                              return (
                                <p className="mt-1 text-xs text-zinc-500">
                                  Role: Unspecified for season
                                </p>
                              );
                            }
                            return (
                              <div className="mt-2 space-y-2">
                                <p className="text-xs text-zinc-500">Role: {scopedRoles.join(", ")}</p>
                                <div className="flex flex-wrap gap-1">
                                  {scopedRoles.map((role) => (
                                    <span
                                      key={`${member.person_id}-season-archive-role-${role}`}
                                      className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-800"
                                    >
                                      {role}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {castSeasonMembers.length === 0 && crewSeasonMembers.length === 0 && cast.length > 0 && (
                  <p className="text-sm text-zinc-500">No cast members match the selected filters.</p>
                )}

                {cast.length === 0 && archiveCast.length === 0 && (
                  <p className="text-sm text-zinc-500">No cast found for this season.</p>
                )}
              </div>
              </div>
            </SeasonCastTab>
          )}

          {activeTab === "surveys" && (
            <section
              id="season-tabpanel-surveys"
              role="tabpanel"
              aria-labelledby="season-tab-surveys"
            >
              <SeasonSurveysTab
                showId={showId}
                showName={show.name}
                totalSeasons={showSeasons.length > 0 ? showSeasons.length : null}
                seasonNumber={Number.isFinite(seasonNumber) ? seasonNumber : null}
              />
            </section>
          )}

          {activeTab === "social" && (
            <SeasonSocialTab
              seasonSupplementalWarning={seasonSupplementalWarning}
              analyticsSection={
                isTikTokAnalyticsView(socialAnalyticsView) ? (
                  <TikTokSeasonAnalyticsSection
                    showId={showId}
                    seasonNumber={season.season_number}
                    seasonId={season.id}
                    showName={show.name}
                    analyticsView={socialAnalyticsView}
                  />
                ) : (
                  <SeasonSocialAnalyticsSection
                    showId={showId}
                    showSlug={showSlugForRouting}
                    seasonNumber={season.season_number}
                    seasonId={season.id}
                    showName={show.name}
                    analyticsView={socialAnalyticsView}
                  />
                )
              }
            />
          )}

          {activeTab === "overview" && (
            <SeasonOverviewTab show={show} season={season} showId={showId} />
          )}
        </main>

        {episodeLightbox && (
          <ImageLightbox
            src={episodeLightbox.episode.url_original_still || ""}
            alt={
              episodeLightbox.episode.title ||
              `Episode ${episodeLightbox.episode.episode_number}`
            }
            isOpen={true}
            onClose={closeEpisodeLightbox}
            metadata={mapEpisodeToMetadata(episodeLightbox.episode, show?.name)}
            canManage={true}
            metadataExtras={
              episodeLightboxAsset && episodeLightboxCapabilities ? (
                <GalleryAssetEditTools
                  asset={episodeLightboxAsset}
                  capabilities={episodeLightboxCapabilities}
                  getAuthHeaders={getAuthHeaders}
                />
              ) : null
            }
            actionDisabledReasons={{
              refresh: "Full pipeline refresh is unavailable for episode still records from this origin.",
              archive: "Archive is unavailable for episode still records from this origin.",
              star: "Star/Flag is unavailable for episode still records from this origin.",
              delete: "Delete is unavailable for episode still records from this origin.",
            }}
            position={{
              current: episodeLightbox.index + 1,
              total: episodeLightbox.seasonEpisodes.length,
            }}
            onPrevious={() => navigateEpisodeLightbox("prev")}
            onNext={() => navigateEpisodeLightbox("next")}
            hasPrevious={episodeLightbox.index > 0}
            hasNext={episodeLightbox.index < episodeLightbox.seasonEpisodes.length - 1}
            triggerRef={episodeTriggerRef as React.RefObject<HTMLElement | null>}
          />
        )}

        {assetLightbox && lightboxAssetCapabilities && (
          <ImageLightbox
            src={getAssetDetailUrl(assetLightbox.asset)}
            fallbackSrcs={getSeasonAssetDetailUrlCandidates(assetLightbox.asset)}
            alt={assetLightbox.asset.caption || "Gallery image"}
            isOpen={true}
            onClose={closeAssetLightbox}
            metadata={mapSeasonAssetToMetadata(assetLightbox.asset, seasonNumber, show?.name)}
            canManage={true}
            metadataExtras={
              <GalleryAssetEditTools
                asset={assetLightbox.asset}
                capabilities={lightboxAssetCapabilities}
                getAuthHeaders={getAuthHeaders}
                onAssetUpdated={(patch) => applyAssetPatch(assetLightbox.asset, patch)}
                onReload={fetchAssets}
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
            }}
            onRefresh={() => refreshAssetPipeline(assetLightbox.asset)}
            onToggleStar={(starred) => toggleStarGalleryAsset(assetLightbox.asset, starred)}
            onArchive={() => archiveGalleryAsset(assetLightbox.asset)}
            onUpdateContentType={(contentType) =>
              updateGalleryAssetContentType(assetLightbox.asset, contentType)
            }
            onDelete={async () => {
              setAssetsRefreshError(null);
              setAssetsRefreshNotice(null);
              try {
                await deleteMediaAsset(assetLightbox.asset);
              } catch (err) {
                setAssetsRefreshError(
                  err instanceof Error ? err.message : "Failed to delete image"
                );
              }
            }}
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

        <AdminModal
          isOpen={batchJobsOpen}
          onClose={() => setBatchJobsOpen(false)}
          disableClose={batchJobsRunning}
          closeLabel="Close batch jobs dialog"
          ariaLabel="Run Image Jobs"
          panelClassName="max-w-2xl p-5"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Batch Jobs
              </p>
              <h4 className="text-lg font-semibold text-zinc-900">Run Image Jobs</h4>
              <p className="mt-1 text-xs text-zinc-500">
                Select one or more operations and content types. Jobs run on currently loaded assets.
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
                {ASSET_SECTION_ORDER.map((section) => (
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
              {seasonBatchPreflightSummary}
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

        <ImageScrapeDrawer
          isOpen={scrapeDrawerOpen}
          onClose={() => setScrapeDrawerOpen(false)}
          entityContext={{
            type: "season",
            showId: showId,
            showName: show?.name ?? "",
            seasonNumber: seasonNumber,
            seasonId: season?.id,
          }}
          onImportComplete={() => {
            loadSeasonData();
          }}
        />

        <AdvancedFilterDrawer
          isOpen={advancedFiltersOpen}
          onClose={() => setAdvancedFiltersOpen(false)}
          filters={advancedFilters}
          onChange={setAdvancedFilters}
          availableSources={[...new Set(assets.map((a) => a.source))].sort()}
          showSeeded={false}
          sortOptions={[
            { value: "newest", label: "Newest First" },
            { value: "oldest", label: "Oldest First" },
            { value: "source", label: "By Source" },
          ]}
          defaults={{ sort: "newest" }}
          unknownTextCount={isTextFilterActive ? unknownTextCount : undefined}
          onDetectTextForVisible={isTextFilterActive ? detectTextOverlayForUnknown : undefined}
          textOverlayDetectError={textOverlayDetectError}
        />

        <FandomSyncModal
          isOpen={fandomSyncOpen}
          onClose={() => setFandomSyncOpen(false)}
          onPreview={previewSyncByFandom}
          onCommit={commitSyncByFandom}
          previewData={fandomSyncPreview}
          previewLoading={fandomSyncPreviewLoading}
          commitLoading={fandomSyncCommitLoading}
          entityLabel={show?.name ? `${show.name} Season ${seasonNumber}` : `Season ${seasonNumber}`}
        />

        {/* Add Backdrops drawer */}
        <AdminModal
          isOpen={addBackdropsOpen}
          onClose={() => setAddBackdropsOpen(false)}
          disableClose={assigningBackdrops}
          closeLabel="Close add backdrops dialog"
          ariaLabel="Assign TMDb Backdrops"
          containerClassName="items-stretch justify-end p-0"
          backdropClassName="bg-black/50"
          panelClassName="h-full max-w-3xl overflow-y-auto rounded-none border-l border-zinc-200 p-0"
        >
          <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                  Backdrops
                </p>
                <h3 className="text-lg font-bold text-zinc-900">
                  Assign TMDb Backdrops
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  {selectedBackdropIds.size} selected
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAddBackdropsOpen(false)}
                  disabled={assigningBackdrops}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const all = new Set(unassignedBackdrops.map((b) => b.media_asset_id));
                    if (selectedBackdropIds.size === all.size) {
                      setSelectedBackdropIds(new Set());
                    } else {
                      setSelectedBackdropIds(all);
                    }
                  }}
                  disabled={backdropsLoading || unassignedBackdrops.length === 0 || assigningBackdrops}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {selectedBackdropIds.size === unassignedBackdrops.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
                <button
                  type="button"
                  onClick={assignSelectedBackdrops}
                  disabled={assigningBackdrops || selectedBackdropIds.size === 0}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {assigningBackdrops
                    ? "Assigning..."
                    : `Assign ${selectedBackdropIds.size}`}
                </button>
              </div>
            </div>
            {backdropsError && (
              <p className="mt-3 text-sm text-red-600">{backdropsError}</p>
            )}
          </div>

          <div className="p-6">
            {backdropsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900" />
              </div>
            ) : unassignedBackdrops.length === 0 ? (
              <p className="text-sm text-zinc-500">No unassigned TMDb backdrops found.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {unassignedBackdrops.map((b) => {
                  const selected = selectedBackdropIds.has(b.media_asset_id);
                  return (
                    <button
                      key={b.media_asset_id}
                      type="button"
                      onClick={() => {
                        setSelectedBackdropIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(b.media_asset_id)) next.delete(b.media_asset_id);
                          else next.add(b.media_asset_id);
                          return next;
                        });
                      }}
                      className={`relative aspect-[16/9] overflow-hidden rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        selected ? "border-zinc-900" : "border-zinc-200"
                      }`}
                    >
                      <GalleryImage
                        src={b.display_url ?? b.hosted_url ?? b.source_url ?? ""}
                        alt={b.caption || "Backdrop"}
                        sizes="420px"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 transition hover:bg-black/10" />
                      {selected && (
                        <div className="absolute left-2 top-2 rounded-full bg-zinc-900 px-2 py-1 text-xs font-semibold text-white shadow">
                          Selected
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </AdminModal>
      </div>
    </ClientOnly>
  );
}
