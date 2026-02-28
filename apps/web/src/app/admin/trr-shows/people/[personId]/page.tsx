"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import Link from "next/link";
import Image from "next/image";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import { buildPersonBreadcrumb, humanizeSlug } from "@/lib/admin/admin-breadcrumbs";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { fetchAdminWithAuth, getClientAuthHeaders } from "@/lib/admin/client-auth";
import {
  buildPersonAdminUrl,
  buildPersonRouteSlug,
  buildSeasonAdminUrl,
  buildShowAdminUrl,
  cleanLegacyPersonRoutingQuery,
  parsePersonRouteState,
} from "@/lib/admin/show-admin-routes";
import { readAdminRecentShows, recordAdminRecentShow } from "@/lib/admin/admin-recent-shows";
import { ExternalLinks, TmdbLinkIcon, ImdbLinkIcon } from "@/components/admin/ExternalLinks";
import { ImageLightbox, type ImageType } from "@/components/admin/ImageLightbox";
import ShowNewsTab from "@/components/admin/show-tabs/ShowNewsTab";
import FandomSyncModal from "@/components/admin/FandomSyncModal";
import ReassignImageModal from "@/components/admin/ReassignImageModal";
import { ImageScrapeDrawer, type PersonContext } from "@/components/admin/ImageScrapeDrawer";
import { AdvancedFilterDrawer } from "@/components/admin/AdvancedFilterDrawer";
import {
  type FandomDynamicSection,
  type FandomSyncOptions,
  type FandomSyncPreviewResponse,
  fandomSectionBucket,
  normalizeFandomBioCard,
  normalizeFandomDynamicSections,
  normalizeFandomSyncPreviewResponse,
} from "@/lib/admin/fandom-sync-types";
import { mapPhotoToMetadata, resolveMetadataDimensions } from "@/lib/photo-metadata";
import {
  THUMBNAIL_CROP_LIMITS,
  THUMBNAIL_DEFAULTS,
  parseThumbnailCrop,
  resolveThumbnailPresentation,
  type ThumbnailCrop,
} from "@/lib/thumbnail-crop";
import {
  readAdvancedFilters,
  writeAdvancedFilters,
  type AdvancedFilterState,
} from "@/lib/admin/advanced-filters";
import {
  buildShowAcronym,
  computePersonGalleryMediaViewAvailability,
  computePersonPhotoShowBuckets,
  isWwhlShowName,
  resolveGalleryShowFilterFallback,
  WWHL_LABEL,
  type GalleryShowFilter,
} from "@/lib/admin/person-gallery-media-view";
import { formatPersonRefreshSummary } from "@/lib/admin/person-refresh-summary";
import {
  firstImageUrlCandidate,
  getPersonPhotoCardUrlCandidates,
  getPersonPhotoDetailUrlCandidates,
} from "@/lib/admin/image-url-candidates";
import {
  appendLiveCountsToMessage,
  formatJobLiveCounts,
  resolveJobLiveCounts,
  type JobLiveCounts,
} from "@/lib/admin/job-live-counts";
import {
  inferHasTextOverlay,
  inferPeopleCountForPersonPhoto,
  matchesContentTypesForPersonPhoto,
} from "@/lib/gallery-filter-utils";
import {
  contentTypeToContextType,
  normalizeContentTypeToken,
} from "@/lib/media/content-type";
import {
  applyFacebankSeedUpdateToLightbox,
  applyFacebankSeedUpdateToPhotos,
} from "./facebank-seed-state";
import {
  applyThumbnailCropUpdateToLightbox,
  applyThumbnailCropUpdateToPhotos,
} from "./thumbnail-crop-state";
import {
  createSyncProgressTracker,
  formatPersonRefreshPhaseLabel,
  mapPersonRefreshStage,
  PERSON_REFRESH_PHASES,
  updateSyncProgressTracker,
} from "./refresh-progress";

// Types
interface TrrPerson {
  id: string;
  full_name: string;
  known_for: string | null;
  external_ids: Record<string, unknown>;
  // Canonical multi-source fields (jsonb, keyed by source: tmdb/fandom/manual)
  birthday?: Record<string, unknown>;
  gender?: Record<string, unknown>;
  biography?: Record<string, unknown>;
  place_of_birth?: Record<string, unknown>;
  homepage?: Record<string, unknown>;
  profile_image_url?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

type MultiSourceField = Record<string, unknown> | null | undefined;
type ResolvedField = {
  value: string | null;
  source: string | null;
  sources: Array<{ source: string; value: string }>;
};

const DEFAULT_CANONICAL_SOURCE_ORDER = ["tmdb", "imdb", "fandom", "manual"] as const;
type CanonicalSource = (typeof DEFAULT_CANONICAL_SOURCE_ORDER)[number];
type CanonicalSourceOrder = CanonicalSource[];
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const looksLikeUuid = (value: string): boolean => UUID_RE.test(value);

const readRouteParamValue = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
    const first = value[0].trim();
    return first.length > 0 ? first : null;
  }
  return null;
};

const isCanonicalSource = (value: string): value is CanonicalSource =>
  (DEFAULT_CANONICAL_SOURCE_ORDER as readonly string[]).includes(value);

const normalizeCanonicalSourceOrder = (value: unknown): CanonicalSourceOrder => {
  if (!Array.isArray(value)) {
    return [...DEFAULT_CANONICAL_SOURCE_ORDER];
  }

  const collected: CanonicalSourceOrder = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const normalized = entry.trim().toLowerCase();
    if (!isCanonicalSource(normalized)) continue;
    if (!collected.includes(normalized)) {
      collected.push(normalized);
    }
  }

  for (const source of DEFAULT_CANONICAL_SOURCE_ORDER) {
    if (!collected.includes(source)) {
      collected.push(source);
    }
  }

  return collected;
};

const readCanonicalSourceOrderFromExternalIds = (
  externalIds: Record<string, unknown> | null | undefined
): CanonicalSourceOrder => {
  if (!externalIds || typeof externalIds !== "object") {
    return [...DEFAULT_CANONICAL_SOURCE_ORDER];
  }
  return normalizeCanonicalSourceOrder(externalIds.canonical_profile_source_order);
};

const formatCanonicalSourceLabel = (source: CanonicalSource): string =>
  source === "tmdb"
    ? "TMDB"
    : source === "imdb"
      ? "IMDb"
      : source === "fandom"
        ? "Fandom"
        : "Manual";

const resolveMultiSourceField = (
  field: MultiSourceField,
  sourceOrder: CanonicalSourceOrder
): ResolvedField => {
  if (!field || typeof field !== "object") {
    return { value: null, source: null, sources: [] };
  }

  const entries = Object.entries(field)
    .map(([source, value]) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed ? { source, value: trimmed } : null;
      }
      if (typeof value === "number" && Number.isFinite(value)) {
        return { source, value: String(value) };
      }
      return null;
    })
    .filter((row): row is { source: string; value: string } => Boolean(row));

  if (entries.length === 0) {
    return { value: null, source: null, sources: [] };
  }

  for (const preferred of sourceOrder) {
    const hit = entries.find((e) => e.source === preferred);
    if (hit) {
      return { value: hit.value, source: hit.source, sources: entries };
    }
  }

  // Fallback to first available source (stable order by source name).
  const stable = [...entries].sort((a, b) => a.source.localeCompare(b.source));
  return { value: stable[0].value, source: stable[0].source, sources: stable };
};

interface TrrPersonPhoto {
  id: string;
  person_id: string;
  source: string;
  url: string | null;
  hosted_url: string | null;
  original_url?: string | null;
  thumb_url?: string | null;
  display_url?: string | null;
  detail_url?: string | null;
  crop_display_url?: string | null;
  crop_detail_url?: string | null;
  hosted_content_type?: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  context_section: string | null;
  context_type: string | null;
  season: number | null;
  // Metadata fields for lightbox display
  people_names: string[] | null;
  people_ids: string[] | null;
  people_count?: number | null;
  people_count_source?: "auto" | "manual" | null;
  face_boxes?: FaceBoxTag[] | null;
  ingest_status?: string | null;
  title_names: string[] | null;
  metadata: Record<string, unknown> | null;
  fetched_at: string | null;
  created_at: string | null;
  // Origin metadata
  origin: "cast_photos" | "media_links";
  link_id?: string | null;
  media_asset_id?: string | null;
  facebank_seed: boolean;
  thumbnail_focus_x: number | null;
  thumbnail_focus_y: number | null;
  thumbnail_zoom: number | null;
  thumbnail_crop_mode: "manual" | "auto" | null;
}

interface FaceBoxTag {
  index: number;
  kind: "face";
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number | null;
  person_id?: string;
  person_name?: string;
  label?: string;
}

type GallerySortOption = "newest" | "oldest" | "source" | "season-asc" | "season-desc";

interface TrrPersonCredit {
  id: string;
  show_id: string | null;
  person_id: string;
  show_name: string | null;
  role: string | null;
  billing_order: number | null;
  credit_category: string;
  source_type?: string | null;
  external_imdb_id?: string | null;
  external_url?: string | null;
}

interface PersonCreditScopeEpisode {
  episode_id: string;
  episode_number: number | null;
  episode_name: string | null;
  appearance_type: string | null;
}

interface PersonCreditScopeSeason {
  season_number: number | null;
  episode_count: number;
  episodes: PersonCreditScopeEpisode[];
}

interface PersonCreditScopeGroup {
  credit_id: string;
  role: string | null;
  credit_category: string;
  billing_order: number | null;
  source_type: string | null;
  total_episodes: number;
  seasons: PersonCreditScopeSeason[];
}

interface PersonCreditShowScope {
  show_id: string;
  show_name: string | null;
  cast_groups: PersonCreditScopeGroup[];
  crew_groups: PersonCreditScopeGroup[];
  cast_non_episodic: TrrPersonCredit[];
  crew_non_episodic: TrrPersonCredit[];
  other_show_credits: TrrPersonCredit[];
}

interface CoverPhoto {
  person_id: string;
  photo_id: string;
  photo_url: string;
}

interface TrrCastFandom {
  id: string;
  person_id: string;
  source: string;
  source_url: string;
  page_title: string | null;
  scraped_at: string;
  full_name: string | null;
  birthdate: string | null;
  birthdate_display: string | null;
  gender: string | null;
  resides_in: string | null;
  hair_color: string | null;
  eye_color: string | null;
  height_display: string | null;
  weight_display: string | null;
  romances: string[] | null;
  family: Record<string, unknown> | null;
  friends: Record<string, unknown> | null;
  enemies: Record<string, unknown> | null;
  installment: string | null;
  installment_url: string | null;
  main_seasons_display: string | null;
  summary: string | null;
  taglines: Record<string, unknown> | null;
  reunion_seating: Record<string, unknown> | null;
  trivia: Record<string, unknown> | null;
  dynamic_sections?: unknown[] | null;
  bio_card?: Record<string, unknown> | null;
  casting_summary?: string | null;
  citations?: unknown[] | null;
  conflicts?: unknown[] | null;
  source_variants?: Record<string, unknown> | null;
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
  source_id?: string | null;
  publisher_name?: string | null;
  publisher_domain?: string | null;
  feed_rank?: number | null;
  hosted_image_url?: string | null;
  original_image_url?: string | null;
  image_url?: string | null;
  article_url: string;
  published_at?: string | null;
  person_tags?: BravoPersonTag[];
  topic_tags?: string[] | null;
  season_matches?: Array<{ season_number?: number | null; match_types?: string[] | null }> | null;
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

type TabId = "overview" | "gallery" | "videos" | "news" | "credits" | "fandom";
type ReprocessStageKey = "all" | "count" | "crop" | "id_text" | "resize";

const parsePeopleCount = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const formatEpisodeCountLabel = (count: number): string =>
  `${count} episode${count === 1 ? "" : "s"}`;

const formatEpisodeAndNonEpisodicLabel = (
  episodeCount: number,
  nonEpisodicCount: number
): string =>
  nonEpisodicCount > 0
    ? `${formatEpisodeCountLabel(episodeCount)} • ${nonEpisodicCount} non-episodic credit${
        nonEpisodicCount === 1 ? "" : "s"
      }`
    : formatEpisodeCountLabel(episodeCount);

const formatEpisodeCode = (
  seasonNumber: number | null,
  episodeNumber: number | null
): string | null => {
  if (seasonNumber === null && episodeNumber === null) return null;
  const season = seasonNumber === null ? "?" : String(seasonNumber);
  const episode =
    episodeNumber === null ? "?" : String(episodeNumber).padStart(2, "0");
  return `S${season}E${episode}`;
};

const isSelfCreditCategory = (creditCategory: string | null | undefined): boolean =>
  typeof creditCategory === "string" && creditCategory.trim().toLowerCase() === "self";

const normalizeRoleLabel = (role: string | null | undefined): string =>
  typeof role === "string" ? role.trim() : "";

const resolveOtherShowKey = (credit: TrrPersonCredit): string => {
  if (typeof credit.show_id === "string" && credit.show_id.trim().length > 0) {
    return `show:${credit.show_id.trim()}`;
  }
  if (typeof credit.show_name === "string" && credit.show_name.trim().length > 0) {
    return `name:${credit.show_name.trim().toLowerCase()}`;
  }
  return `credit:${credit.id}`;
};

const partitionOtherShowCredits = (
  otherShowCredits: TrrPersonCredit[]
): { otherShowCastCredits: TrrPersonCredit[]; otherShowCrewCredits: TrrPersonCredit[] } => {
  const hasExplicitCastRoleByShow = new Map<string, boolean>();

  for (const credit of otherShowCredits) {
    const showKey = resolveOtherShowKey(credit);
    const isCastCredit = isSelfCreditCategory(credit.credit_category);
    const roleLabel = normalizeRoleLabel(credit.role);
    if (isCastCredit && roleLabel.length > 0) {
      hasExplicitCastRoleByShow.set(showKey, true);
    } else if (!hasExplicitCastRoleByShow.has(showKey)) {
      hasExplicitCastRoleByShow.set(showKey, false);
    }
  }

  const otherShowCastCredits: TrrPersonCredit[] = [];
  const otherShowCrewCredits: TrrPersonCredit[] = [];

  for (const credit of otherShowCredits) {
    const showKey = resolveOtherShowKey(credit);
    const isCastCredit = isSelfCreditCategory(credit.credit_category);
    const roleLabel = normalizeRoleLabel(credit.role);
    const hasExplicitCastRole = hasExplicitCastRoleByShow.get(showKey) ?? false;

    if (isCastCredit && roleLabel.length === 0 && hasExplicitCastRole) {
      continue;
    }

    if (isCastCredit) {
      otherShowCastCredits.push(credit);
      continue;
    }
    otherShowCrewCredits.push(credit);
  }

  return { otherShowCastCredits, otherShowCrewCredits };
};

const groupCreditsByShow = (
  credits: TrrPersonCredit[]
): Array<{ showKey: string; showName: string; credits: TrrPersonCredit[] }> => {
  const groups = new Map<
    string,
    { showKey: string; showName: string; credits: TrrPersonCredit[] }
  >();

  for (const credit of credits) {
    const showKey = resolveOtherShowKey(credit);
    const existing = groups.get(showKey);
    if (existing) {
      existing.credits.push(credit);
      continue;
    }
    const showName =
      typeof credit.show_name === "string" && credit.show_name.trim().length > 0
        ? credit.show_name.trim()
        : "Unknown Show";
    groups.set(showKey, {
      showKey,
      showName,
      credits: [credit],
    });
  }

  return Array.from(groups.values());
};

const clampFaceCoord = (value: number): number => Math.min(1, Math.max(0, value));

const normalizeFaceBoxes = (value: unknown): FaceBoxTag[] => {
  if (!Array.isArray(value)) return [];
  const boxes: FaceBoxTag[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as Record<string, unknown>;
    const x = typeof candidate.x === "number" && Number.isFinite(candidate.x) ? clampFaceCoord(candidate.x) : null;
    const y = typeof candidate.y === "number" && Number.isFinite(candidate.y) ? clampFaceCoord(candidate.y) : null;
    const width =
      typeof candidate.width === "number" && Number.isFinite(candidate.width)
        ? clampFaceCoord(candidate.width)
        : null;
    const height =
      typeof candidate.height === "number" && Number.isFinite(candidate.height)
        ? clampFaceCoord(candidate.height)
        : null;
    if (x === null || y === null || width === null || height === null || width <= 0 || height <= 0) {
      continue;
    }
    const index =
      typeof candidate.index === "number" && Number.isFinite(candidate.index)
        ? Math.max(1, Math.floor(candidate.index))
        : boxes.length + 1;
    const confidence =
      typeof candidate.confidence === "number" && Number.isFinite(candidate.confidence)
        ? clampFaceCoord(candidate.confidence)
        : null;
    const personId =
      typeof candidate.person_id === "string" && candidate.person_id.trim().length > 0
        ? candidate.person_id.trim()
        : undefined;
    const personName =
      typeof candidate.person_name === "string" && candidate.person_name.trim().length > 0
        ? candidate.person_name.trim()
        : undefined;
    const label =
      typeof candidate.label === "string" && candidate.label.trim().length > 0
        ? candidate.label.trim()
        : undefined;
    boxes.push({
      index,
      kind: "face",
      x,
      y,
      width,
      height,
      ...(confidence !== null ? { confidence } : {}),
      ...(personId ? { person_id: personId } : {}),
      ...(personName ? { person_name: personName } : {}),
      ...(label ? { label } : {}),
    });
  }
  return boxes;
};

const PERSON_PAGE_STREAM_IDLE_TIMEOUT_MS = 600_000;
const PERSON_PAGE_STREAM_MAX_DURATION_MS = 12 * 60 * 1000;
const PERSON_PAGE_STREAM_START_DEADLINE_MS = 20_000;
const PHOTO_PIPELINE_STEP_TIMEOUT_MS = 480_000;
const PHOTO_LIST_LOAD_TIMEOUT_MS = 60_000;
const BRAVO_VIDEO_THUMBNAIL_SYNC_TIMEOUT_MS = 90_000;
const NEWS_LOAD_TIMEOUT_MS = 45_000;
const NEWS_SYNC_TIMEOUT_MS = 60_000;
const NEWS_SYNC_POLL_INTERVAL_MS = 1_500;
const NEWS_SYNC_POLL_TIMEOUT_MS = 90_000;
const NEWS_PAGE_SIZE = 50;
const MAX_PHOTO_FETCH_PAGES = 30;
const TEXT_OVERLAY_DETECT_CONCURRENCY = 4;

const EMPTY_NEWS_FACETS: UnifiedNewsFacets = {
  sources: [],
  people: [],
  topics: [],
  seasons: [],
};

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === "AbortError";

const isSignalAbortedWithoutReasonError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  return error.message.toLowerCase().includes("signal is aborted without reason");
};

const createNamedError = (name: string, message: string): Error => {
  const error = new Error(message);
  error.name = name;
  return error;
};

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  externalSignal?: AbortSignal
): Promise<Response> => {
  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", onExternalAbort, { once: true });
    }
  }
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", onExternalAbort);
    }
  }
};

const parseStreamErrorResponse = async (response: Response): Promise<string> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      detail?: string;
    };
    if (payload.error && payload.detail) return `${payload.error}: ${payload.detail}`;
    return payload.error || payload.detail || "Request failed";
  }

  const bodyText = await response.text().catch(() => "");
  if (!bodyText.trim()) return "Request failed";
  const dataMatch = bodyText.match(/data:\s*(\{[\s\S]*\})/);
  if (!dataMatch) return bodyText.trim();

  try {
    const payload = JSON.parse(dataMatch[1]) as { error?: string; detail?: string };
    if (payload.error && payload.detail) return `${payload.error}: ${payload.detail}`;
    return payload.error || payload.detail || bodyText.trim();
  } catch {
    return bodyText.trim();
  }
};

type RefreshLogLevel = "info" | "success" | "error";

type RefreshLogEntry = {
  id: number;
  ts: number;
  source: "page_refresh" | "image_refresh";
  stage: string;
  message: string;
  detail?: string | null;
  level: RefreshLogLevel;
  runId?: string | null;
};

const MAX_REFRESH_LOG_ENTRIES = 400;

const parseDimensionValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
};

const resolvePhotoDimensions = (
  photo: TrrPersonPhoto | null | undefined
): { width: number | null; height: number | null } => {
  if (!photo) return { width: null, height: null };
  const metadata = photo.metadata as Record<string, unknown> | null;
  const metaDims = resolveMetadataDimensions(metadata);
  const metaWidth = parseDimensionValue(metaDims.width);
  const metaHeight = parseDimensionValue(metaDims.height);
  return {
    width: parseDimensionValue(photo.width) ?? metaWidth,
    height: parseDimensionValue(photo.height) ?? metaHeight,
  };
};

const readGalleryStatusFromMetadata = (
  photo: TrrPersonPhoto
): {
  status: string | null;
  reason: string | null;
  checkedAt: string | null;
} => {
  const metadata = (photo.metadata ?? {}) as Record<string, unknown>;
  const statusRaw = metadata.gallery_status;
  const reasonRaw = metadata.gallery_status_reason;
  const checkedAtRaw = metadata.gallery_status_checked_at;
  const status =
    typeof statusRaw === "string" && statusRaw.trim().length > 0 ? statusRaw.trim() : null;
  const reason =
    typeof reasonRaw === "string" && reasonRaw.trim().length > 0 ? reasonRaw.trim() : null;
  const checkedAt =
    typeof checkedAtRaw === "string" && checkedAtRaw.trim().length > 0 ? checkedAtRaw.trim() : null;
  return { status, reason, checkedAt };
};

const isBrokenUnreachableGalleryStatus = (status: string | null | undefined): boolean =>
  typeof status === "string" && status.trim().toLowerCase() === "broken_unreachable";

const getPersonPhotoCardUrl = (photo: TrrPersonPhoto): string | null =>
  firstImageUrlCandidate(getPersonPhotoCardUrlCandidates(photo));

const getPersonPhotoDetailUrl = (photo: TrrPersonPhoto): string | null =>
  firstImageUrlCandidate(getPersonPhotoDetailUrlCandidates(photo));

const resolvePhotoPersistedCrop = (
  photo: TrrPersonPhoto | null | undefined
): ThumbnailCrop | null => {
  if (!photo) return null;
  const directCrop = parseThumbnailCrop(
    {
      x: photo.thumbnail_focus_x,
      y: photo.thumbnail_focus_y,
      zoom: photo.thumbnail_zoom,
      mode: photo.thumbnail_crop_mode,
    },
    { clamp: true }
  );
  if (directCrop) return directCrop;
  const metadata = photo.metadata as Record<string, unknown> | null;
  return parseThumbnailCrop(metadata?.thumbnail_crop, { clamp: true });
};

const buildThumbnailCropPreview = (
  photo: TrrPersonPhoto | null | undefined
): {
  focusX: number;
  focusY: number;
  zoom: number;
  imageWidth: number | null;
  imageHeight: number | null;
  aspectRatio: number;
} | null => {
  if (!photo) return null;
  const dims = resolvePhotoDimensions(photo);
  const persistedCrop = resolvePhotoPersistedCrop(photo);
  return {
    focusX: persistedCrop?.x ?? THUMBNAIL_DEFAULTS.x,
    focusY: persistedCrop?.y ?? THUMBNAIL_DEFAULTS.y,
    zoom: persistedCrop?.zoom ?? THUMBNAIL_DEFAULTS.zoom,
    imageWidth: dims.width,
    imageHeight: dims.height,
    aspectRatio: 4 / 5,
  };
};

const buildThumbnailCropPayload = (photo: TrrPersonPhoto): Record<string, unknown> | null => {
  const persistedCrop = resolvePhotoPersistedCrop(photo);
  if (!persistedCrop) return null;
  return {
    x: persistedCrop.x,
    y: persistedCrop.y,
    zoom: persistedCrop.zoom,
    mode: persistedCrop.mode,
  };
};

const buildAutoCropFallbackPayload = (): Record<string, unknown> => ({
  x: THUMBNAIL_DEFAULTS.x,
  y: THUMBNAIL_DEFAULTS.y,
  zoom: THUMBNAIL_DEFAULTS.zoom,
  mode: "auto",
  strategy: "resize_center_fallback_v1",
});

const buildThumbnailCropPayloadWithFallback = (
  photo: TrrPersonPhoto | null | undefined
): Record<string, unknown> => {
  if (!photo) return buildAutoCropFallbackPayload();
  return buildThumbnailCropPayload(photo) ?? buildAutoCropFallbackPayload();
};

type ThumbnailCropPreview = {
  focusX: number;
  focusY: number;
  zoom: number;
  imageWidth: number | null;
  imageHeight: number | null;
  aspectRatio: number;
};

type ThumbnailCropOverlayUpdate = ThumbnailCropPreview & {
  photoId: string;
  nonce: number;
};

// Profile photo with error handling
function ProfilePhoto({ url, name }: { url: string | null | undefined; name: string }) {
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(url ?? null);

  useEffect(() => {
    setHasError(false);
    setCurrentSrc(url ?? null);
  }, [url]);

  if (!currentSrc || hasError) {
    return (
      <div className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-200">
        <div className="flex h-full items-center justify-center text-zinc-400">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
            <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-200">
      <Image
        src={currentSrc}
        alt={name}
        fill
        className="object-cover"
        sizes="128px"
        unoptimized
        onError={() => setHasError(true)}
      />
    </div>
  );
}

function RefreshProgressBar({
  show,
  phase,
  message,
  current,
  total,
}: {
  show: boolean;
  phase?: string | null;
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
  const phaseLabel = formatPersonRefreshPhaseLabel(phase);
  const countLabel =
    safeCurrent !== null && safeTotal !== null
      ? `${safeCurrent.toLocaleString()}/${safeTotal.toLocaleString()}`
      : null;
  const detailMessage =
    typeof message === "string" && message.trim()
      ? message.trim()
      : null;

  return (
    <div className="w-full">
      {(phaseLabel || message || hasCounts) && (
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
            {countLabel ? `${phaseLabel || "WORKING"} ${countLabel}` : phaseLabel || "WORKING"}
          </p>
          {hasProgressBar && safeCurrent !== null && safeTotal !== null && (
            <p className="text-[11px] tabular-nums text-zinc-500">
              {safeCurrent.toLocaleString()}/{safeTotal.toLocaleString()} ({percent}%)
            </p>
          )}
        </div>
      )}
      {detailMessage && (
        <p className="mb-1 text-[11px] text-zinc-500">{detailMessage}</p>
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

// Photo with error handling
function GalleryPhoto({
  photo,
  onClick,
  isCover,
  onFallbackEvent,
}: {
  photo: TrrPersonPhoto;
  onClick: () => void;
  isCover?: boolean;
  onFallbackEvent?: (event: "attempt" | "recovered" | "failed") => void;
}) {
  const [hasError, setHasError] = useState(false);
  const cardCandidates = useMemo(() => getPersonPhotoCardUrlCandidates(photo), [photo]);
  const primarySrc = cardCandidates[0] ?? null;
  const fallbackCandidates = useMemo(() => cardCandidates.slice(1), [cardCandidates]);
  const fallbackCandidatesSignature = useMemo(
    () => fallbackCandidates.join("\u0001"),
    [fallbackCandidates]
  );
  const [currentSrc, setCurrentSrc] = useState<string | null>(primarySrc);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [naturalDimensions, setNaturalDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const telemetryStateRef = useRef({ attempted: false, recovered: false, failed: false });
  const galleryStatus = useMemo(() => readGalleryStatusFromMetadata(photo), [photo]);
  const isMarkedBroken = isBrokenUnreachableGalleryStatus(galleryStatus.status);
  const brokenBadgeTitle = useMemo(() => {
    if (!isMarkedBroken) return undefined;
    const checkedAtLabel = galleryStatus.checkedAt
      ? new Date(galleryStatus.checkedAt).toLocaleString()
      : "Unknown check time";
    const reasonLabel = galleryStatus.reason ?? "Source unreachable";
    return `Broken (unreachable) • ${reasonLabel} • ${checkedAtLabel}`;
  }, [galleryStatus.checkedAt, galleryStatus.reason, isMarkedBroken]);
  const presentation = useMemo(() => {
    const persistedCrop = resolvePhotoPersistedCrop(photo);

    return resolveThumbnailPresentation({
      width: photo.width,
      height: photo.height,
      peopleCount: inferPeopleCountForPersonPhoto(photo),
      crop: persistedCrop,
    });
  }, [
    photo,
  ]);

  useEffect(() => {
    setHasError(false);
    setCurrentSrc(primarySrc);
    setFallbackIndex(0);
    setNaturalDimensions(null);
    telemetryStateRef.current = { attempted: false, recovered: false, failed: false };
    if (onFallbackEvent && primarySrc && !telemetryStateRef.current.attempted) {
      onFallbackEvent("attempt");
      telemetryStateRef.current.attempted = true;
    }
  }, [fallbackCandidatesSignature, onFallbackEvent, primarySrc]);

  const imageDimensions = useMemo(() => {
    const resolvedWidth = naturalDimensions?.width ?? parseDimensionValue(photo.width) ?? null;
    const resolvedHeight = naturalDimensions?.height ?? parseDimensionValue(photo.height) ?? null;
    return { width: resolvedWidth, height: resolvedHeight };
  }, [photo.height, photo.width, naturalDimensions?.height, naturalDimensions?.width]);

  const handleError = () => {
    const nextCandidate = fallbackCandidates[fallbackIndex] ?? null;
    if (nextCandidate && nextCandidate !== currentSrc) {
      setCurrentSrc(nextCandidate);
      setFallbackIndex((prev) => prev + 1);
      return;
    }
    console.warn("[person-gallery] all image URL candidates failed", {
      photoId: photo.id,
      origin: photo.origin,
      attempted: cardCandidates.length,
    });
    if (onFallbackEvent && !telemetryStateRef.current.failed) {
      onFallbackEvent("failed");
      telemetryStateRef.current.failed = true;
    }
    setHasError(true);
  };

  if (hasError || !currentSrc) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-200 text-zinc-400">
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
        alt={photo.caption || "Photo"}
        width={imageDimensions.width ?? 1200}
        height={imageDimensions.height ?? 1200}
        className="absolute inset-0 h-full w-full cursor-zoom-in select-none object-cover transition-transform duration-200"
        style={{
          objectPosition: presentation.objectPosition,
          transform: presentation.zoom === 1 ? undefined : `scale(${presentation.zoom})`,
          transformOrigin: presentation.objectPosition,
        }}
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
        unoptimized
        onClick={onClick}
        onError={handleError}
        onLoad={(event) => {
          const element = event.currentTarget as HTMLImageElement;
          if (onFallbackEvent && currentSrc !== primarySrc && !telemetryStateRef.current.recovered) {
            onFallbackEvent("recovered");
            telemetryStateRef.current.recovered = true;
          }
          if (element.naturalWidth > 0 && element.naturalHeight > 0) {
            setNaturalDimensions({
              width: element.naturalWidth,
              height: element.naturalHeight,
            });
          }
        }}
      />
      {/* Cover badge */}
      {isCover && (
        <div className="absolute top-2 left-2 z-10 rounded-full bg-green-500 px-2 py-0.5 text-xs font-semibold text-white shadow">
          Cover
        </div>
      )}
      {photo.facebank_seed && (
        <div className="absolute top-2 right-2 z-10 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white shadow">
          Seed
        </div>
      )}
      {isMarkedBroken && (
        <div
          title={brokenBadgeTitle}
          className={`absolute left-2 z-10 rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white shadow ${
            isCover ? "top-9" : "top-2"
          }`}
        >
          Broken
        </div>
      )}
    </>
  );
}

type TagPerson = { id?: string; name: string };

function TagPeoplePanel({
  photo,
  defaultPersonTag,
  getAuthHeaders,
  onTagsUpdated,
  onMirrorUpdated,
  onFacebankSeedUpdated,
  onThumbnailCropUpdated,
  onThumbnailCropPreviewChange,
  externalThumbnailCropOverlayUpdate,
  onRefreshAutoThumbnailCrop,
}: {
  photo: TrrPersonPhoto;
  defaultPersonTag: TagPerson | null;
  getAuthHeaders: () => Promise<{ Authorization: string }>;
  onTagsUpdated: (payload: {
    mediaAssetId: string | null;
    castPhotoId: string | null;
    peopleNames: string[];
    peopleIds: string[];
    peopleCount: number | null;
    peopleCountSource: "auto" | "manual" | null;
    faceBoxes: FaceBoxTag[];
  }) => void;
  onMirrorUpdated: (payload: {
    mediaAssetId: string | null;
    castPhotoId: string | null;
    hostedUrl: string;
  }) => void;
  onFacebankSeedUpdated: (payload: {
    linkId: string;
    facebankSeed: boolean;
  }) => void;
  onThumbnailCropUpdated: (payload: {
    origin: "cast_photos" | "media_links";
    photoId: string;
    linkId: string | null;
    thumbnailFocusX: number | null;
    thumbnailFocusY: number | null;
    thumbnailZoom: number | null;
    thumbnailCropMode: "manual" | "auto" | null;
  }) => void;
  onThumbnailCropPreviewChange: (preview: ThumbnailCropPreview | null) => void;
  externalThumbnailCropOverlayUpdate: ThumbnailCropOverlayUpdate | null;
  onRefreshAutoThumbnailCrop: (photo: TrrPersonPhoto) => Promise<void>;
}) {
  const isCastPhoto = photo.origin === "cast_photos";
  const isMediaLink = photo.origin === "media_links";
  const hasSourceTags =
    isCastPhoto &&
    (photo.people_names?.length ?? 0) > 0 &&
    photo.people_count_source !== "manual";
  const isEditable = (isMediaLink && Boolean(photo.link_id)) || (isCastPhoto && !hasSourceTags);
  const [taggedPeople, setTaggedPeople] = useState<TagPerson[]>([]);
  const [faceBoxes, setFaceBoxes] = useState<FaceBoxTag[]>([]);
  const [readonlyNames, setReadonlyNames] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TrrPerson[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [peopleCountInput, setPeopleCountInput] = useState<string>("");
  const [recounting, setRecounting] = useState(false);
  const [recountError, setRecountError] = useState<string | null>(null);
  const [mirroring, setMirroring] = useState(false);
  const [mirrorError, setMirrorError] = useState<string | null>(null);
  const [facebankSeedSaving, setFacebankSeedSaving] = useState(false);
  const [facebankSeedError, setFacebankSeedError] = useState<string | null>(null);
  const initialPersistedCrop = resolvePhotoPersistedCrop(photo);
  const [cropX, setCropX] = useState<number>(
    initialPersistedCrop?.x ?? THUMBNAIL_DEFAULTS.x
  );
  const [cropY, setCropY] = useState<number>(
    initialPersistedCrop?.y ?? THUMBNAIL_DEFAULTS.y
  );
  const [cropZoom, setCropZoom] = useState<number>(
    initialPersistedCrop?.zoom ?? THUMBNAIL_DEFAULTS.zoom
  );
  const [cropSaving, setCropSaving] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);
  const autoTagRequestedPhotoIdRef = useRef<string | null>(null);
  const currentPeopleCount = parsePeopleCount(photo.people_count);
  const faceBoxesEnabled =
    (currentPeopleCount ?? 0) > 1 || normalizeFaceBoxes(photo.face_boxes).length > 1;
  const originalPersistedCrop = resolvePhotoPersistedCrop(photo);
  const originalCropMode = originalPersistedCrop?.mode ?? photo.thumbnail_crop_mode;
  const originalCropX = originalPersistedCrop?.x ?? THUMBNAIL_DEFAULTS.x;
  const originalCropY = originalPersistedCrop?.y ?? THUMBNAIL_DEFAULTS.y;
  const originalCropZoom = originalPersistedCrop?.zoom ?? THUMBNAIL_DEFAULTS.zoom;
  const manualCropDirty =
    originalCropMode !== "manual" ||
    Math.abs(cropX - originalCropX) >= 1 ||
    Math.abs(cropY - originalCropY) >= 1 ||
    Math.abs(cropZoom - originalCropZoom) >= 0.01;
  const clampCropZoom = useCallback((value: number) => {
    return Math.min(
      THUMBNAIL_CROP_LIMITS.zoomMax,
      Math.max(THUMBNAIL_CROP_LIMITS.zoomMin, value),
    );
  }, []);
  const clampCropPercent = useCallback((value: number) => {
    return Math.min(100, Math.max(0, value));
  }, []);

  useEffect(() => {
    const ids = photo.people_ids ?? [];
    const names = photo.people_names ?? [];
    const fallbackTagName = defaultPersonTag?.name?.trim() || null;
    if (isEditable) {
      if (ids.length > 0) {
        setTaggedPeople(
          ids.map((id, i) => ({ id, name: names[i] ?? id }))
        );
      } else if (names.length > 0) {
        setTaggedPeople(names.map((name) => ({ name })));
      } else if (fallbackTagName) {
        setTaggedPeople([{ id: defaultPersonTag?.id, name: fallbackTagName }]);
      } else {
        setTaggedPeople([]);
      }
      setReadonlyNames([]);
    } else {
      setTaggedPeople([]);
      setReadonlyNames(names.length > 0 ? names : fallbackTagName ? [fallbackTagName] : []);
    }
    setPeopleCountInput(
      currentPeopleCount !== null && currentPeopleCount !== undefined
        ? String(currentPeopleCount)
        : ""
    );
    setFaceBoxes(normalizeFaceBoxes(photo.face_boxes));
  }, [
    currentPeopleCount,
    defaultPersonTag?.id,
    defaultPersonTag?.name,
    isEditable,
    photo.face_boxes,
    photo.id,
    photo.people_ids,
    photo.people_names,
  ]);

  useEffect(() => {
    const persistedCrop = resolvePhotoPersistedCrop(photo);
    setCropX(persistedCrop?.x ?? THUMBNAIL_DEFAULTS.x);
    setCropY(persistedCrop?.y ?? THUMBNAIL_DEFAULTS.y);
    setCropZoom(clampCropZoom(persistedCrop?.zoom ?? THUMBNAIL_DEFAULTS.zoom));
    setCropError(null);
  }, [
    clampCropZoom,
    photo,
    photo.id,
    photo.metadata,
    photo.thumbnail_crop_mode,
    photo.thumbnail_focus_x,
    photo.thumbnail_focus_y,
    photo.thumbnail_zoom,
  ]);

  useEffect(() => {
    if (!externalThumbnailCropOverlayUpdate) return;
    if (externalThumbnailCropOverlayUpdate.photoId !== photo.id) return;
    setCropX(clampCropPercent(externalThumbnailCropOverlayUpdate.focusX));
    setCropY(clampCropPercent(externalThumbnailCropOverlayUpdate.focusY));
    setCropZoom(clampCropZoom(externalThumbnailCropOverlayUpdate.zoom));
  }, [
    clampCropPercent,
    clampCropZoom,
    externalThumbnailCropOverlayUpdate,
    photo.id,
  ]);

  useEffect(() => {
    const dims = resolvePhotoDimensions(photo);
    onThumbnailCropPreviewChange({
      focusX: cropX,
      focusY: cropY,
      zoom: cropZoom,
      imageWidth: dims.width,
      imageHeight: dims.height,
      aspectRatio: 4 / 5,
    });
  }, [
    cropX,
    cropY,
    cropZoom,
    photo,
    onThumbnailCropPreviewChange,
  ]);

  useEffect(() => {
    return () => onThumbnailCropPreviewChange(null);
  }, [onThumbnailCropPreviewChange]);

  useEffect(() => {
    if (!isEditable) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const headers = await getAuthHeaders();
        const response = await fetch(
          `/api/admin/trr-api/people?q=${encodeURIComponent(trimmed)}&limit=8`,
          { headers }
        );
        if (!response.ok) {
          setResults([]);
          return;
        }
        const data = await response.json();
        setResults(data.people ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isEditable, getAuthHeaders]);

  const updateTags = useCallback(
    async (
      nextPeople: TagPerson[],
      peopleCountOverride?: number | null,
      faceBoxesOverride?: FaceBoxTag[] | null
    ) => {
      if (!isEditable) return;
      if (isMediaLink && !photo.link_id) return;
      setSaving(true);
      setError(null);
      try {
        const headers = await getAuthHeaders();
        const endpoint = isMediaLink
          ? `/api/admin/trr-api/media-links/${photo.link_id}/tags`
          : `/api/admin/trr-api/cast-photos/${photo.id}/tags`;
        const payload: Record<string, unknown> = { people: nextPeople };
        if (peopleCountOverride !== undefined) {
          payload.people_count = peopleCountOverride;
        }
        if (
          peopleCountOverride !== undefined &&
          (peopleCountOverride === null || peopleCountOverride <= 1)
        ) {
          payload.face_boxes = null;
        } else if (faceBoxesOverride !== undefined) {
          payload.face_boxes = faceBoxesOverride;
        } else if (faceBoxesEnabled && faceBoxes.length > 0) {
          payload.face_boxes = faceBoxes;
        }
        const response = await fetch(endpoint, {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || data.detail || "Failed to update tags");
        }
        const normalizedNextPeopleNames = [
          ...new Set(
            nextPeople
              .map((person) => person.name.trim())
              .filter((name) => name.length > 0),
          ),
        ];
        const normalizedNextPeopleIds = [
          ...new Set(
            nextPeople
              .map((person) => person.id?.trim() ?? "")
              .filter((id) => id.length > 0),
          ),
        ];
        const responsePeopleNames = Array.isArray(data.people_names)
          ? (data.people_names as string[])
          : [];
        const peopleNames = Array.isArray(data.people_names)
          ? normalizedNextPeopleNames
          : normalizedNextPeopleNames.length > 0
            ? normalizedNextPeopleNames
            : responsePeopleNames;
        const responsePeopleIds = Array.isArray(data.people_ids)
          ? (data.people_ids as string[])
          : [];
        const peopleIds = Array.isArray(data.people_ids)
          ? normalizedNextPeopleIds
          : normalizedNextPeopleIds.length > 0
            ? normalizedNextPeopleIds
            : responsePeopleIds;
        const peopleCountFromResponse = parsePeopleCount(data.people_count);
        const peopleCount =
          peopleCountFromResponse !== null
            ? peopleCountFromResponse
            : peopleCountOverride ?? null;
        const fallbackSource =
          typeof peopleCountOverride === "number" && Number.isFinite(peopleCountOverride)
            ? "manual"
            : null;
        const peopleCountSource =
          typeof data.people_count_source === "string"
            ? (data.people_count_source as "auto" | "manual")
            : fallbackSource;
        const responseFaceBoxes = normalizeFaceBoxes(data.face_boxes);
        const nextFaceBoxes =
          faceBoxesOverride !== undefined
            ? normalizeFaceBoxes(faceBoxesOverride)
            : responseFaceBoxes.length > 0
              ? responseFaceBoxes
              : faceBoxesEnabled
                ? normalizeFaceBoxes(faceBoxes)
                : [];
        setTaggedPeople(nextPeople);
        setReadonlyNames([]);
        setFaceBoxes(nextFaceBoxes);
        setPeopleCountInput(
          peopleCount !== null && peopleCount !== undefined
            ? String(peopleCount)
            : ""
        );
        onTagsUpdated({
          mediaAssetId: photo.media_asset_id ?? null,
          castPhotoId: isCastPhoto ? photo.id : null,
          peopleNames,
          peopleIds,
          peopleCount,
          peopleCountSource,
          faceBoxes: nextFaceBoxes,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update tags");
      } finally {
        setSaving(false);
      }
    },
    [
      getAuthHeaders,
      isEditable,
      isMediaLink,
      isCastPhoto,
      faceBoxes,
      faceBoxesEnabled,
      onTagsUpdated,
      photo.id,
      photo.link_id,
      photo.media_asset_id,
    ]
  );

  useEffect(() => {
    if (!isEditable) return;
    const fallbackTagName = defaultPersonTag?.name?.trim();
    if (!fallbackTagName) return;
    const hasStoredTags =
      (photo.people_ids?.length ?? 0) > 0 || (photo.people_names?.length ?? 0) > 0;
    if (hasStoredTags) return;
    if (autoTagRequestedPhotoIdRef.current === photo.id) return;
    autoTagRequestedPhotoIdRef.current = photo.id;
    const next = [{ id: defaultPersonTag?.id, name: fallbackTagName }];
    setTaggedPeople(next);
    void updateTags(next);
  }, [
    defaultPersonTag?.id,
    defaultPersonTag?.name,
    isEditable,
    photo.id,
    photo.people_ids,
    photo.people_names,
    updateTags,
  ]);

  const handleAddPerson = (person: TrrPerson) => {
    if (!person.id || !person.full_name) return;
    if (taggedPeople.some((p) => p.id === person.id)) return;
    const next = [...taggedPeople, { id: person.id, name: person.full_name }];
    setQuery("");
    setResults([]);
    void updateTags(next);
  };

  const handleAddFreeText = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (taggedPeople.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setQuery("");
      setResults([]);
      return;
    }
    const next = [...taggedPeople, { name: trimmed }];
    setQuery("");
    setResults([]);
    void updateTags(next);
  };

  const handleRemovePerson = (person: TagPerson) => {
    const next = taggedPeople.filter((p) => {
      if (person.id) return p.id !== person.id;
      return p.name.toLowerCase() !== person.name.toLowerCase();
    });
    void updateTags(next);
  };

  const displayTags = useMemo(() => {
    const names =
      taggedPeople.length > 0 ? taggedPeople.map((person) => person.name) : readonlyNames;
    return [...new Set(names.filter((name) => typeof name === "string" && name.trim().length > 0))];
  }, [readonlyNames, taggedPeople]);

  const faceBoxTagOptions = useMemo(
    () => [...new Set([...taggedPeople.map((person) => person.name), ...readonlyNames])],
    [readonlyNames, taggedPeople]
  );

  const handleFaceBoxAssignment = (faceIndex: number, personName: string) => {
    const personId =
      taggedPeople.find((person) => person.name === personName)?.id ??
      undefined;
    const next = faceBoxes.map((box) =>
      box.index === faceIndex
        ? {
            ...box,
            ...(personName ? { person_name: personName } : {}),
            ...(personId ? { person_id: personId } : {}),
            ...(!personName
              ? { person_name: undefined, person_id: undefined }
              : {}),
          }
        : box
    );
    setFaceBoxes(next);
    void updateTags(taggedPeople, undefined, next);
  };

  const normalizeCountInput = (value: string) => {
    const raw = value.trim();
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const isCountDirty =
    normalizeCountInput(peopleCountInput) !== currentPeopleCount;

  const handleSaveCount = () => {
    if (!isCountDirty) return;
    const raw = peopleCountInput.trim();
    if (!raw) {
      void updateTags(taggedPeople, null);
      return;
    }
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("People count must be a positive number.");
      return;
    }
    void updateTags(taggedPeople, parsed);
  };

  const canRecount = isCastPhoto || Boolean(photo.media_asset_id);

  const canMirror = isMediaLink && Boolean(photo.media_asset_id);
  const canToggleFacebankSeed = isMediaLink && Boolean(photo.link_id);

  const mirrorForRecount = async () => {
    if (isMediaLink && photo.media_asset_id) {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/media-assets/${photo.media_asset_id}/mirror`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ force: true }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        const message =
          data.error && data.detail
            ? `${data.error}: ${data.detail}`
            : data.error || data.detail || "Failed to mirror image";
        throw new Error(message);
      }
      if (typeof data.hosted_url === "string") {
        onMirrorUpdated({
          mediaAssetId: photo.media_asset_id,
          castPhotoId: null,
          hostedUrl: data.hosted_url,
        });
      }
      return;
    }

    if (isCastPhoto) {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/cast-photos/${photo.id}/mirror`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ force: true }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        const message =
          data.error && data.detail
            ? `${data.error}: ${data.detail}`
            : data.error || data.detail || "Failed to mirror image";
        throw new Error(message);
      }
      if (typeof data.hosted_url === "string") {
        onMirrorUpdated({
          mediaAssetId: null,
          castPhotoId: photo.id,
          hostedUrl: data.hosted_url,
        });
      }
    }
  };

  const handleRecount = async () => {
    if (!canRecount) return;
    setRecounting(true);
    setRecountError(null);
    const runRecount = async () => {
      const headers = await getAuthHeaders();
      const endpoint = isCastPhoto
        ? `/api/admin/trr-api/cast-photos/${photo.id}/auto-count`
        : `/api/admin/trr-api/media-assets/${photo.media_asset_id}/auto-count`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          force: photo.people_count_source === "manual",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const message =
          data.error && data.detail
            ? `${data.error}: ${data.detail}`
            : data.error || data.detail || "Failed to auto-count people";
        throw new Error(message);
      }
      return data;
    };

    const applyRecount = (data: Record<string, unknown>) => {
      const peopleCount = parsePeopleCount(data.people_count);
      const peopleCountSource =
        (data.people_count_source as "auto" | "manual" | null) ?? "auto";
      const nextFaceBoxes = normalizeFaceBoxes(data.face_boxes);
      setFaceBoxes(nextFaceBoxes);
      setPeopleCountInput(
        peopleCount !== null && peopleCount !== undefined
          ? String(peopleCount)
          : ""
      );
      onTagsUpdated({
        mediaAssetId: photo.media_asset_id ?? null,
        castPhotoId: isCastPhoto ? photo.id : null,
        peopleNames: photo.people_names ?? [],
        peopleIds: photo.people_ids ?? [],
        peopleCount,
        peopleCountSource,
        faceBoxes: nextFaceBoxes,
      });
    };

    try {
      const data = await runRecount();
      applyRecount(data);
    } catch (err) {
      const initialErrorMessage =
        err instanceof Error ? err.message : "Failed to auto-count people";
      let mirrorFallbackError: string | null = null;
      try {
        setMirroring(true);
        await mirrorForRecount();
      } catch (mirrorErr) {
        mirrorFallbackError =
          mirrorErr instanceof Error ? mirrorErr.message : "Mirror fallback failed";
      } finally {
        setMirroring(false);
      }

      try {
        const retryData = await runRecount();
        applyRecount(retryData);
        setRecountError(null);
      } catch (retryErr) {
        const retryErrorMessage =
          retryErr instanceof Error ? retryErr.message : "Failed to auto-count people";
        if (mirrorFallbackError) {
          setRecountError(
            `${retryErrorMessage} | Mirror fallback failed: ${mirrorFallbackError}`
          );
          return;
        }
        if (initialErrorMessage && initialErrorMessage !== retryErrorMessage) {
          setRecountError(`${retryErrorMessage} | Initial error: ${initialErrorMessage}`);
          return;
        }
        setRecountError(retryErrorMessage);
      }
    } finally {
      setRecounting(false);
    }
  };

  const handleMirror = async () => {
    if (!canMirror || !photo.media_asset_id) return;
    setMirroring(true);
    setMirrorError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/media-assets/${photo.media_asset_id}/mirror`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ force: true }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        const message =
          data.error && data.detail
            ? `${data.error}: ${data.detail}`
            : data.error || data.detail || "Failed to mirror image";
        throw new Error(message);
      }
      const hostedUrl =
        typeof data.hosted_url === "string" ? data.hosted_url : null;
      if (hostedUrl) {
        onMirrorUpdated({
          mediaAssetId: photo.media_asset_id,
          castPhotoId: null,
          hostedUrl,
        });
      }
    } catch (err) {
      setMirrorError(err instanceof Error ? err.message : "Failed to mirror image");
    } finally {
      setMirroring(false);
    }
  };

  const handleToggleFacebankSeed = async () => {
    if (!canToggleFacebankSeed || !photo.link_id) return;
    setFacebankSeedSaving(true);
    setFacebankSeedError(null);
    try {
      const headers = await getAuthHeaders();
      const nextValue = !Boolean(photo.facebank_seed);
      const response = await fetch(
        `/api/admin/trr-api/people/${photo.person_id}/gallery/${photo.link_id}/facebank-seed`,
        {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ facebank_seed: nextValue }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          data.error && data.detail
            ? `${data.error}: ${data.detail}`
            : data.error || data.detail || "Failed to update facebank seed";
        throw new Error(message);
      }
      onFacebankSeedUpdated({
        linkId: photo.link_id,
        facebankSeed: Boolean(
          typeof data.facebank_seed === "boolean" ? data.facebank_seed : nextValue
        ),
      });
    } catch (err) {
      setFacebankSeedError(
        err instanceof Error ? err.message : "Failed to update facebank seed"
      );
    } finally {
      setFacebankSeedSaving(false);
    }
  };

  const persistThumbnailCrop = useCallback(
    async (crop: ThumbnailCrop | null) => {
      if (isMediaLink && !photo.link_id) {
        throw new Error("Cannot update crop: media link id is missing");
      }

      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/people/${photo.person_id}/photos/${photo.id}/thumbnail-crop`,
        {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: photo.origin,
            link_id: photo.link_id ?? undefined,
            crop,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          data.error && data.detail
            ? `${data.error}: ${data.detail}`
            : data.error || data.detail || "Failed to update thumbnail crop";
        throw new Error(message);
      }

      const nextPhotoId =
        typeof data.photo_id === "string" && data.photo_id.trim().length > 0
          ? data.photo_id
          : photo.id;
      const nextLinkId =
        typeof data.link_id === "string" && data.link_id.trim().length > 0
          ? data.link_id
          : photo.link_id ?? null;
      const nextOrigin =
        data.origin === "cast_photos" || data.origin === "media_links"
          ? data.origin
          : photo.origin;
      const nextMode =
        data.thumbnail_crop_mode === "manual" || data.thumbnail_crop_mode === "auto"
          ? data.thumbnail_crop_mode
          : null;
      const nextX =
        typeof data.thumbnail_focus_x === "number" && Number.isFinite(data.thumbnail_focus_x)
          ? data.thumbnail_focus_x
          : null;
      const nextY =
        typeof data.thumbnail_focus_y === "number" && Number.isFinite(data.thumbnail_focus_y)
          ? data.thumbnail_focus_y
          : null;
      const nextZoom =
        typeof data.thumbnail_zoom === "number" && Number.isFinite(data.thumbnail_zoom)
          ? data.thumbnail_zoom
          : null;

      onThumbnailCropUpdated({
        origin: nextOrigin,
        photoId: nextPhotoId,
        linkId: nextLinkId,
        thumbnailFocusX: nextX,
        thumbnailFocusY: nextY,
        thumbnailZoom: nextZoom,
        thumbnailCropMode: nextMode,
      });

      if (nextMode === "manual") {
        setCropX(nextX ?? THUMBNAIL_DEFAULTS.x);
        setCropY(nextY ?? THUMBNAIL_DEFAULTS.y);
        setCropZoom(clampCropZoom(nextZoom ?? THUMBNAIL_DEFAULTS.zoom));
      } else {
        setCropX(THUMBNAIL_DEFAULTS.x);
        setCropY(THUMBNAIL_DEFAULTS.y);
        setCropZoom(THUMBNAIL_DEFAULTS.zoom);
      }
    },
    [
      clampCropZoom,
      getAuthHeaders,
      isMediaLink,
      onThumbnailCropUpdated,
      photo.id,
      photo.link_id,
      photo.origin,
      photo.person_id,
    ],
  );

  const handleSaveManualThumbnailCrop = async () => {
    setCropSaving(true);
    setCropError(null);
    try {
      await persistThumbnailCrop({
        x: Math.round(cropX),
        y: Math.round(cropY),
        zoom: Number(cropZoom.toFixed(2)),
        mode: "manual",
      });
    } catch (err) {
      setCropError(err instanceof Error ? err.message : "Failed to update thumbnail crop");
    } finally {
      setCropSaving(false);
    }
  };

  const handleResetThumbnailCrop = async () => {
    setCropSaving(true);
    setCropError(null);
    try {
      await persistThumbnailCrop(null);
      await onRefreshAutoThumbnailCrop(photo);
    } catch (err) {
      setCropError(err instanceof Error ? err.message : "Failed to refresh auto thumbnail crop");
    } finally {
      setCropSaving(false);
    }
  };

  return (
    <div>
      <span className="tracking-widest text-[10px] uppercase text-white/50">
        Tags
      </span>
      <div className="mt-2 flex flex-wrap gap-2">
        {displayTags.length === 0 && (
          <span className="text-xs text-white/60">No tags</span>
        )}
        {taggedPeople.length > 0
          ? taggedPeople.map((person) => (
              <span
                key={person.id ?? person.name}
                className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white"
              >
                {person.name}
                {isEditable && (
                  <button
                    type="button"
                    onClick={() => handleRemovePerson(person)}
                    disabled={saving}
                    className="ml-1 rounded-full px-1 text-white/70 hover:text-white"
                  >
                    ×
                  </button>
                )}
              </span>
            ))
          : readonlyNames.map((name) => (
              <span
                key={name}
                className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white"
              >
                {name}
              </span>
            ))}
      </div>

      {!isEditable && hasSourceTags && (
        <p className="mt-2 text-xs text-white/60">
          Tags from source metadata are read-only here.
        </p>
      )}

      {isEditable && readonlyNames.length > 0 && taggedPeople.length === 0 && (
        <p className="mt-2 text-xs text-white/60">
          Existing tags are read-only. Re-add people to edit tags.
        </p>
      )}

      {isEditable && (
        <div className="mt-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people to tag"
            className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
            disabled={saving}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddFreeText();
              }
            }}
          />
          {searching && (
            <p className="mt-1 text-xs text-white/60">Searching...</p>
          )}
          {results.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-white/10 bg-black/60">
              {results.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => handleAddPerson(person)}
                  disabled={saving || taggedPeople.some((p) => p.id === person.id)}
                  className="flex w-full items-center justify-between px-2 py-1 text-left text-xs text-white hover:bg-white/10 disabled:opacity-50"
                >
                  <span>{person.full_name}</span>
                  {taggedPeople.some((p) => p.id === person.id) && (
                    <span className="text-white/50">Added</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {results.length === 0 && query.trim().length > 0 && (
            <button
              type="button"
              onClick={handleAddFreeText}
              disabled={saving}
              className="mt-2 text-xs text-white/70 hover:text-white"
            >
              Add “{query.trim()}”
            </button>
          )}
          {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        </div>
      )}

      {faceBoxesEnabled && (
        <div className="mt-4">
          <span className="tracking-widest text-[10px] uppercase text-white/50">
            Face Boxes
          </span>
          {faceBoxes.length === 0 ? (
            <p className="mt-2 text-xs text-white/60">
              No face boxes detected yet. Use Recount to detect faces for multi-person tagging.
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {faceBoxes
                .slice()
                .sort((a, b) => a.index - b.index)
                .map((box) => (
                  <div
                    key={`face-box-${box.index}`}
                    className="rounded-md border border-white/10 bg-black/30 p-2"
                  >
                    <p className="text-xs font-semibold text-white/90">
                      Face {box.index}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <select
                        value={box.person_name ?? ""}
                        onChange={(event) => handleFaceBoxAssignment(box.index, event.target.value)}
                        disabled={!isEditable || saving}
                        className="rounded border border-white/20 bg-black/40 px-2 py-1 text-xs text-white focus:border-white/40 focus:outline-none disabled:opacity-60"
                      >
                        <option value="">Unassigned</option>
                        {faceBoxTagOptions.map((name) => (
                          <option key={`face-option-${box.index}-${name}`} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                      {box.confidence !== undefined && box.confidence !== null && (
                        <span className="text-[11px] text-white/60">
                          Confidence {(box.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        <span className="tracking-widest text-[10px] uppercase text-white/50">
          People Count
        </span>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={peopleCountInput}
            onChange={(e) => setPeopleCountInput(e.target.value)}
            className="w-20 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
            disabled={!isEditable || saving}
            placeholder="Auto"
          />
          {isEditable && isCountDirty && (
            <button
              type="button"
              onClick={handleSaveCount}
              disabled={saving}
              className="rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          )}
          <button
            type="button"
            onClick={handleRecount}
            disabled={!canRecount || recounting}
            className="rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 disabled:opacity-50"
          >
            {recounting ? "Recounting..." : "Recount"}
          </button>
        </div>
        {photo.people_count_source && (
          <p className="mt-1 text-xs text-white/60">
            Count source: {photo.people_count_source}
          </p>
        )}
        {recountError && (
          <p className="mt-2 text-xs text-red-300">{recountError}</p>
        )}
        {canMirror && !photo.hosted_url && (
          <div className="mt-3">
            <button
              type="button"
              onClick={handleMirror}
              disabled={mirroring}
              className="rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 disabled:opacity-50"
            >
              {mirroring ? "Mirroring..." : "Mirror to CDN"}
            </button>
            {mirrorError && (
              <p className="mt-2 text-xs text-red-300">{mirrorError}</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4">
        <span className="tracking-widest text-[10px] uppercase text-white/50">
          Thumbnail Crop
        </span>
        <p className="mt-1 text-xs text-white/60">
          Mode: {(resolvePhotoPersistedCrop(photo)?.mode ?? photo.thumbnail_crop_mode) === "manual" ? "Manual" : "Auto"}
        </p>
        <div className="mt-2 space-y-2">
          <label className="block text-xs text-white/70">
            Horizontal ({Math.round(cropX)}%)
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={cropX}
              onChange={(e) => setCropX(Number(e.target.value))}
              className="mt-1 w-full"
              disabled={cropSaving}
            />
          </label>
          <label className="block text-xs text-white/70">
            Vertical ({Math.round(cropY)}%)
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={cropY}
              onChange={(e) => setCropY(Number(e.target.value))}
              className="mt-1 w-full"
              disabled={cropSaving}
            />
          </label>
          <label className="block text-xs text-white/70">
            Zoom ({cropZoom.toFixed(2)}x)
            <input
              type="range"
              min={1}
              max={THUMBNAIL_CROP_LIMITS.zoomMax}
              step={0.01}
              value={cropZoom}
              onChange={(e) => setCropZoom(clampCropZoom(Number(e.target.value)))}
              className="mt-1 w-full"
              disabled={cropSaving}
            />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveManualThumbnailCrop}
            disabled={cropSaving || !manualCropDirty}
            className="rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 disabled:opacity-50"
          >
            {cropSaving ? "Saving..." : "Save Manual Crop"}
          </button>
          <button
            type="button"
            onClick={handleResetThumbnailCrop}
            disabled={cropSaving}
            className="rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 disabled:opacity-50"
          >
            {cropSaving ? "Refreshing..." : "Refresh Auto Crop"}
          </button>
        </div>
        {cropError && <p className="mt-2 text-xs text-red-300">{cropError}</p>}
      </div>

      {canToggleFacebankSeed && (
        <div className="mt-4">
          <span className="tracking-widest text-[10px] uppercase text-white/50">
            Facebank Seed
          </span>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                photo.facebank_seed
                  ? "bg-blue-600/80 text-white"
                  : "bg-white/10 text-white/80"
              }`}
            >
              {photo.facebank_seed ? "Seeded" : "Not seeded"}
            </span>
            <button
              type="button"
              onClick={handleToggleFacebankSeed}
              disabled={facebankSeedSaving}
              className="rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 disabled:opacity-50"
            >
              {facebankSeedSaving
                ? "Saving..."
                : photo.facebank_seed
                  ? "Unset Seed"
                  : "Set as Seed"}
            </button>
          </div>
          {facebankSeedError && (
            <p className="mt-2 text-xs text-red-300">{facebankSeedError}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PersonProfilePage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const personRouteParam = readRouteParamValue((params as Record<string, unknown>).personId);
  const showRouteParam = readRouteParamValue((params as Record<string, unknown>).showId);
  const showIdParamRaw = searchParams.get("showId");
  const legacyShowIdParam =
    typeof showIdParamRaw === "string" && showIdParamRaw.trim().length > 0
      ? showIdParamRaw.trim()
      : null;
  const [stickyShowParam, setStickyShowParam] = useState<string | null>(
    showRouteParam ?? legacyShowIdParam
  );
  const [recentShowFallback, setRecentShowFallback] = useState<{
    slug: string;
    label: string;
    href: string;
  } | null>(null);
  useEffect(() => {
    const explicitShowParam = showRouteParam ?? legacyShowIdParam;
    if (explicitShowParam) {
      setStickyShowParam((prev) => (prev === explicitShowParam ? prev : explicitShowParam));
      return;
    }
    const recent = readAdminRecentShows();
    const recentEntry = recent[0] ?? null;
    setRecentShowFallback((prev) => {
      if (!recentEntry) return null;
      if (
        prev &&
        prev.slug === recentEntry.slug &&
        prev.label === recentEntry.label &&
        prev.href === recentEntry.href
      ) {
        return prev;
      }
      return {
        slug: recentEntry.slug,
        label: recentEntry.label,
        href: recentEntry.href,
      };
    });
  }, [legacyShowIdParam, showRouteParam]);
  const showIdParam =
    showRouteParam ?? legacyShowIdParam ?? stickyShowParam ?? recentShowFallback?.slug ?? null;
  const [resolvedShowIdParam, setResolvedShowIdParam] = useState<string | null>(
    showIdParam && looksLikeUuid(showIdParam) ? showIdParam : null
  );
  const [resolvedShowSlugParam, setResolvedShowSlugParam] = useState<string | null>(
    showIdParam && !looksLikeUuid(showIdParam) ? showIdParam : null
  );
  const [resolvedPersonIdParam, setResolvedPersonIdParam] = useState<string | null>(
    personRouteParam && looksLikeUuid(personRouteParam) ? personRouteParam : null
  );
  const [resolvedPersonSlugParam, setResolvedPersonSlugParam] = useState<string | null>(
    personRouteParam && !looksLikeUuid(personRouteParam) ? personRouteParam : null
  );
  const personId = resolvedPersonIdParam ?? "";
  const showIdForApi = resolvedShowIdParam;
  const showSlugForRouting = useMemo(() => {
    if (resolvedShowSlugParam && resolvedShowSlugParam.trim().length > 0) {
      return resolvedShowSlugParam;
    }
    if (showIdParam && !looksLikeUuid(showIdParam)) {
      return showIdParam;
    }
    return null;
  }, [resolvedShowSlugParam, showIdParam]);
  const seasonNumberParam = searchParams.get("seasonNumber");
  const seasonNumberRaw = seasonNumberParam ? Number.parseInt(seasonNumberParam, 10) : Number.NaN;
  const seasonNumber = Number.isFinite(seasonNumberRaw) ? seasonNumberRaw : null;
  const backShowTarget = showSlugForRouting ?? showIdParam;
  const backHref = backShowTarget
    ? seasonNumber !== null
      ? buildSeasonAdminUrl({ showSlug: backShowTarget, seasonNumber, tab: "cast" })
      : buildShowAdminUrl({ showSlug: backShowTarget })
    : "/admin/trr-shows";
  const backLabel = backShowTarget
    ? seasonNumber !== null
      ? "← Back to Season Cast"
      : "← Back to Show"
    : "← Back to Shows";
  const { user, checking, hasAccess } = useAdminGuard();

  const personRouteState = useMemo(
    () => parsePersonRouteState(pathname, new URLSearchParams(searchParams.toString())),
    [pathname, searchParams]
  );

  const [person, setPerson] = useState<TrrPerson | null>(null);
  const [canonicalSourceOrder, setCanonicalSourceOrder] = useState<CanonicalSourceOrder>([
    ...DEFAULT_CANONICAL_SOURCE_ORDER,
  ]);
  const [initialCanonicalSourceOrder, setInitialCanonicalSourceOrder] = useState<CanonicalSourceOrder>([
    ...DEFAULT_CANONICAL_SOURCE_ORDER,
  ]);
  const [canonicalSourceOrderSaving, setCanonicalSourceOrderSaving] = useState(false);
  const [canonicalSourceOrderError, setCanonicalSourceOrderError] = useState<string | null>(null);
  const [canonicalSourceOrderNotice, setCanonicalSourceOrderNotice] = useState<string | null>(null);
  const [photos, setPhotos] = useState<TrrPersonPhoto[]>([]);
  const [photosVisibleCount, setPhotosVisibleCount] = useState(120);
  const [showBrokenRows, setShowBrokenRows] = useState(false);
  const [galleryFallbackTelemetry, setGalleryFallbackTelemetry] = useState({
    fallbackRecoveredCount: 0,
    allCandidatesFailedCount: 0,
    totalImageAttempts: 0,
  });
  const [credits, setCredits] = useState<TrrPersonCredit[]>([]);
  const [creditsError, setCreditsError] = useState<string | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [showScopedCredits, setShowScopedCredits] = useState<PersonCreditShowScope | null>(null);
  const [fandomData, setFandomData] = useState<TrrCastFandom[]>([]);
  const [fandomError, setFandomError] = useState<string | null>(null);
  const [fandomLoaded, setFandomLoaded] = useState(false);
  const [fandomLoading, setFandomLoading] = useState(false);
  const [fandomSyncOpen, setFandomSyncOpen] = useState(false);
  const [fandomSyncPreview, setFandomSyncPreview] = useState<FandomSyncPreviewResponse | null>(null);
  const [fandomSyncPreviewLoading, setFandomSyncPreviewLoading] = useState(false);
  const [fandomSyncCommitLoading, setFandomSyncCommitLoading] = useState(false);
  const [fandomSyncError, setFandomSyncError] = useState<string | null>(null);
  const [bravoVideos, setBravoVideos] = useState<BravoVideoItem[]>([]);
  const [bravoVideosLoaded, setBravoVideosLoaded] = useState(false);
  const [bravoVideosLoading, setBravoVideosLoading] = useState(false);
  const [bravoVideosError, setBravoVideosError] = useState<string | null>(null);
  const [bravoVideoSyncing, setBravoVideoSyncing] = useState(false);
  const [bravoVideoSyncWarning, setBravoVideoSyncWarning] = useState<string | null>(null);
  const bravoVideoSyncAttemptedRef = useRef(false);
  const bravoVideoSyncInFlightRef = useRef<Promise<boolean> | null>(null);
  const [unifiedNews, setUnifiedNews] = useState<BravoNewsItem[]>([]);
  const [newsLoaded, setNewsLoaded] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [newsNotice, setNewsNotice] = useState<string | null>(null);
  const [newsGoogleUrlMissing, setNewsGoogleUrlMissing] = useState(false);
  const [newsSyncing, setNewsSyncing] = useState(false);
  const [newsFacets, setNewsFacets] = useState<UnifiedNewsFacets>(EMPTY_NEWS_FACETS);
  const [newsNextCursor, setNewsNextCursor] = useState<string | null>(null);
  const [newsPageCount, setNewsPageCount] = useState(0);
  const [newsTotalCount, setNewsTotalCount] = useState(0);
  const [newsSort, setNewsSort] = useState<"trending" | "latest">("trending");
  const [newsSourceFilter, setNewsSourceFilter] = useState<string>("");
  const [newsTopicFilter, setNewsTopicFilter] = useState<string>("");
  const [newsSeasonFilter, setNewsSeasonFilter] = useState<string>("");
  const newsAutoSyncAttemptedRef = useRef(false);
  const newsSyncInFlightRef = useRef<Promise<boolean> | null>(null);
  const newsLoadInFlightRef = useRef<Promise<void> | null>(null);
  const newsLoadedQueryKeyRef = useRef<string | null>(null);
  const newsCursorQueryKeyRef = useRef<string | null>(null);
  const newsRequestSeqRef = useRef(0);
  const pendingNewsReloadRef = useRef(false);
  const pendingNewsReloadArgsRef = useRef<{ force: boolean; forceSync: boolean; queryKey: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>(personRouteState.tab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lightbox state - track full photo object + index for navigation
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<{
    photo: TrrPersonPhoto;
    index: number;
  } | null>(null);
  const [reassignModalImage, setReassignModalImage] = useState<{
    imageId: string;
    currentEntityId: string;
    currentEntityLabel: string | null;
  } | null>(null);
  const [thumbnailCropPreview, setThumbnailCropPreview] = useState<ThumbnailCropPreview | null>(null);
  const [thumbnailCropOverlayUpdate, setThumbnailCropOverlayUpdate] =
    useState<ThumbnailCropOverlayUpdate | null>(null);
  const lightboxTriggerRef = useRef<HTMLElement | null>(null);

  // Cover photo state
  const [coverPhoto, setCoverPhoto] = useState<CoverPhoto | null>(null);
  const [settingCover, setSettingCover] = useState(false);

  // Image scrape drawer state
  const [scrapeDrawerOpen, setScrapeDrawerOpen] = useState(false);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [textOverlayDetectError, setTextOverlayDetectError] = useState<string | null>(null);

  // Refresh images state
  const [refreshingImages, setRefreshingImages] = useState(false);
  const [reprocessingImages, setReprocessingImages] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState<{
    current?: number | null;
    total?: number | null;
    phase?: string | null;
    message?: string | null;
    rawStage?: string | null;
    detailMessage?: string | null;
    runId?: string | null;
    lastEventAt?: number | null;
  } | null>(null);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshLiveCounts, setRefreshLiveCounts] = useState<JobLiveCounts | null>(null);
  const [photosError, setPhotosError] = useState<string | null>(null);
  const [refreshLogOpen, setRefreshLogOpen] = useState(false);
  const [refreshLogEntries, setRefreshLogEntries] = useState<RefreshLogEntry[]>([]);
  const refreshLogCounterRef = useRef(0);
  const personRefreshRequestCounterRef = useRef(0);
  const textOverlayDetectControllerRef = useRef<AbortController | null>(null);
  const showBrokenRowsRef = useRef(showBrokenRows);

  const appendRefreshLog = useCallback(
    (entry: Omit<RefreshLogEntry, "id" | "ts"> & { ts?: number }) => {
      const id = ++refreshLogCounterRef.current;
      const ts = typeof entry.ts === "number" ? entry.ts : Date.now();
      const normalized: RefreshLogEntry = { ...entry, id, ts };
      setRefreshLogEntries((prev) => [normalized, ...prev].slice(0, MAX_REFRESH_LOG_ENTRIES));
    },
    []
  );

  const buildPersonRefreshRequestId = useCallback(() => {
    const counter = ++personRefreshRequestCounterRef.current;
    const timestampToken = Date.now().toString(36);
    const showToken = String(showIdForApi || "unknown")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32);
    const personToken = String(personId || "unknown")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32);
    return `person-refresh-${showToken}-p${personToken}-${timestampToken}-${counter}`;
  }, [personId, showIdForApi]);

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

  const personSlugForRouting = useMemo(() => {
    if (resolvedPersonSlugParam && resolvedPersonSlugParam.trim().length > 0) {
      return resolvedPersonSlugParam;
    }
    if (person?.id) {
      return buildPersonRouteSlug({
        personName: person.full_name,
        personId: person.id,
      });
    }
    if (personRouteParam && !looksLikeUuid(personRouteParam)) {
      return personRouteParam;
    }
    return null;
  }, [person?.full_name, person?.id, personRouteParam, resolvedPersonSlugParam]);

  useEffect(() => {
    setActiveTab(personRouteState.tab);
  }, [personRouteState.tab]);

  useEffect(() => {
    setBravoVideos([]);
    setBravoVideosLoaded(false);
    setBravoVideosError(null);
    setBravoVideoSyncWarning(null);
    setBravoVideoSyncing(false);
    bravoVideoSyncAttemptedRef.current = false;
    bravoVideoSyncInFlightRef.current = null;
    setUnifiedNews([]);
    setNewsLoaded(false);
    setNewsLoading(false);
    setNewsError(null);
    setNewsNotice(null);
    setNewsGoogleUrlMissing(false);
    setNewsSyncing(false);
    setNewsFacets(EMPTY_NEWS_FACETS);
    setNewsNextCursor(null);
    setNewsPageCount(0);
    setNewsTotalCount(0);
    setNewsSort("trending");
    setNewsSourceFilter("");
    setNewsTopicFilter("");
    setNewsSeasonFilter("");
    newsAutoSyncAttemptedRef.current = false;
    newsSyncInFlightRef.current = null;
    newsLoadInFlightRef.current = null;
    newsLoadedQueryKeyRef.current = null;
    newsCursorQueryKeyRef.current = null;
    newsRequestSeqRef.current = 0;
    pendingNewsReloadRef.current = false;
    pendingNewsReloadArgsRef.current = null;
    setFandomData([]);
    setFandomError(null);
    setFandomLoaded(false);
    setFandomLoading(false);
    setCredits([]);
    setShowScopedCredits(null);
    setCreditsError(null);
    setCreditsLoading(false);
  }, [personId, showIdForApi]);

  useEffect(
    () => () => {
      textOverlayDetectControllerRef.current?.abort();
    },
    []
  );

  useEffect(() => {
    showBrokenRowsRef.current = showBrokenRows;
  }, [showBrokenRows]);

  const setTab = useCallback(
    (tab: TabId) => {
      setActiveTab(tab);
      if (!personSlugForRouting) return;
      const preservedQuery = cleanLegacyPersonRoutingQuery(
        new URLSearchParams(searchParams.toString())
      );
      router.replace(
        buildPersonAdminUrl({
          personSlug: personSlugForRouting,
          tab,
          query: preservedQuery,
        }) as Route,
        { scroll: false }
      );
    },
    [personSlugForRouting, router, searchParams]
  );

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

  // Gallery filter/sort state
  const [galleryShowFilter, setGalleryShowFilter] = useState<GalleryShowFilter>(
    showIdParam ? "this-show" : "all"
  );
  const [selectedOtherShowKey, setSelectedOtherShowKey] = useState<string>("all");
  const [seasonPremiereMap, setSeasonPremiereMap] = useState<Record<number, string>>({});
  const canonicalSourceOrderDirty = useMemo(
    () => canonicalSourceOrder.join("|") !== initialCanonicalSourceOrder.join("|"),
    [canonicalSourceOrder, initialCanonicalSourceOrder]
  );

  useEffect(() => {
    if (!showIdParam) {
      setGalleryShowFilter("all");
      return;
    }
    setGalleryShowFilter((prev) => (prev === "all" ? "this-show" : prev));
  }, [showIdParam]);

  const galleryFilterCreditsSource = useMemo(() => {
    if (!showScopedCredits) return credits;
    const byId = new Map<string, TrrPersonCredit>();
    for (const credit of [...credits, ...(showScopedCredits.other_show_credits ?? [])]) {
      byId.set(credit.id, credit);
    }
    return Array.from(byId.values());
  }, [credits, showScopedCredits]);

  const activeShow = useMemo(
    () =>
      showIdForApi ? galleryFilterCreditsSource.find((credit) => credit.show_id === showIdForApi) ?? null : null,
    [galleryFilterCreditsSource, showIdForApi]
  );
  const activeShowName =
    showScopedCredits?.show_name?.trim() || activeShow?.show_name?.trim() || null;
  const activeShowAcronym = useMemo(
    () => buildShowAcronym(activeShowName),
    [activeShowName]
  );
  const activeShowFilterLabel = activeShowAcronym ?? activeShowName ?? "This Show";
  const otherShowOptions = useMemo(() => {
    const byKey = new Map<
      string,
      { key: string; showId: string | null; showName: string; acronym: string | null }
    >();
    for (const credit of galleryFilterCreditsSource) {
      if (showIdForApi && credit.show_id === showIdForApi) continue;
      const showName = credit.show_name?.trim() ?? "";
      if (!showName || isWwhlShowName(showName)) continue;
      const key = credit.show_id ? `id:${credit.show_id}` : `name:${showName.toLowerCase()}`;
      if (byKey.has(key)) continue;
      byKey.set(key, {
        key,
        showId: credit.show_id ?? null,
        showName,
        acronym: buildShowAcronym(showName),
      });
    }
    return Array.from(byKey.values()).sort((a, b) => a.showName.localeCompare(b.showName));
  }, [galleryFilterCreditsSource, showIdForApi]);
  const otherShowNameMatches = useMemo(
    () => otherShowOptions.map((option) => option.showName.toLowerCase()),
    [otherShowOptions]
  );
  const otherShowAcronymMatches = useMemo(() => {
    const acronyms = new Set<string>();
    for (const option of otherShowOptions) {
      if (option.acronym) acronyms.add(option.acronym.toUpperCase());
    }
    return acronyms;
  }, [otherShowOptions]);
  const selectedOtherShow = useMemo(
    () => otherShowOptions.find((option) => option.key === selectedOtherShowKey) ?? null,
    [otherShowOptions, selectedOtherShowKey]
  );

  useEffect(() => {
    if (selectedOtherShowKey === "all") return;
    if (otherShowOptions.some((option) => option.key === selectedOtherShowKey)) return;
    setSelectedOtherShowKey("all");
  }, [otherShowOptions, selectedOtherShowKey]);

  const mediaViewAvailability = useMemo(() => {
    if (!showIdParam) {
      return {
        hasWwhlMatches: false,
        hasOtherShowMatches: false,
        hasNonThisShowMatches: false,
      };
    }
    return computePersonGalleryMediaViewAvailability({
      photos,
      showIdForApi,
      activeShowName,
      activeShowAcronym,
      otherShowNameMatches,
      otherShowAcronymMatches,
    });
  }, [
    activeShowAcronym,
    activeShowName,
    otherShowAcronymMatches,
    otherShowNameMatches,
    photos,
    showIdForApi,
    showIdParam,
  ]);

  const { hasWwhlMatches, hasOtherShowMatches, hasNonThisShowMatches } = mediaViewAvailability;

  useEffect(() => {
    if (!showIdParam) return;
    const nextFilter = resolveGalleryShowFilterFallback({
      currentFilter: galleryShowFilter,
      showContextEnabled: true,
      hasWwhlMatches,
      hasOtherShowMatches,
      hasNonThisShowMatches,
    });
    if (nextFilter !== galleryShowFilter) {
      setGalleryShowFilter(nextFilter);
    }
  }, [
    galleryShowFilter,
    hasNonThisShowMatches,
    hasOtherShowMatches,
    hasWwhlMatches,
    showIdParam,
  ]);

  // Compute unique sources from photos
  const uniqueSources = useMemo(() => {
    const sources = new Set(photos.map(p => p.source).filter(Boolean));
    return Array.from(sources).sort();
  }, [photos]);

  const isTextFilterActive = useMemo(() => {
    const wantsText = advancedFilters.text.includes("text");
    const wantsNoText = advancedFilters.text.includes("no_text");
    return wantsText !== wantsNoText;
  }, [advancedFilters.text]);

  const unknownTextCount = useMemo(() => {
    if (!isTextFilterActive) return 0;
    return photos.filter((p) => inferHasTextOverlay(p.metadata ?? null) === null)
      .length;
  }, [isTextFilterActive, photos]);

  const getPhotoSortDate = useCallback(
    (photo: TrrPersonPhoto): number => {
      const metadata = mapPhotoToMetadata(photo);
      if (metadata.createdAt) return metadata.createdAt.getTime();
      if (metadata.addedAt) return metadata.addedAt.getTime();
      const seasonNumber = typeof photo.season === "number" ? photo.season : null;
      if (seasonNumber && seasonPremiereMap[seasonNumber]) {
        const date = new Date(seasonPremiereMap[seasonNumber]);
        if (!Number.isNaN(date.getTime())) return date.getTime();
      }
      return 0;
    },
    [seasonPremiereMap]
  );

  // Filter and sort photos for gallery
  const filteredPhotos = useMemo(() => {
    let result = [...photos];

    // Apply show filter (if coming from a show context)
    if (showIdParam && galleryShowFilter !== "all") {
      result = result.filter((photo) => {
        const bucketMatches = computePersonPhotoShowBuckets({
          photo,
          showIdForApi,
          activeShowName,
          activeShowAcronym,
          otherShowNameMatches,
          otherShowAcronymMatches,
          selectedOtherShow,
        });

        if (galleryShowFilter === "this-show") {
          return bucketMatches.matchesThisShow;
        }
        if (galleryShowFilter === "wwhl") {
          return bucketMatches.matchesWwhl;
        }
        if (galleryShowFilter === "other-shows") {
          return selectedOtherShow
            ? bucketMatches.matchesSelectedOtherShow
            : bucketMatches.matchesOtherShows;
        }
        return true;
      });
    }

    // Apply sources filter (OR within category)
    if (advancedFilters.sources.length > 0) {
      result = result.filter((p) => advancedFilters.sources.includes(p.source));
    }

    // Apply text overlay filter (if exactly one of TEXT/NO TEXT is selected)
    const wantsText = advancedFilters.text.includes("text");
    const wantsNoText = advancedFilters.text.includes("no_text");
    const textFilterActive = wantsText !== wantsNoText;
    if (textFilterActive) {
      result = result.filter((photo) => {
        const v = inferHasTextOverlay(photo.metadata ?? null);
        if (v === null) return false;
        return wantsText ? v === true : v === false;
      });
    }

    // Apply SOLO/GROUP filter (if exactly one is selected)
    const wantsSolo = advancedFilters.people.includes("solo");
    const wantsGroup = advancedFilters.people.includes("group");
    const peopleFilterActive = wantsSolo !== wantsGroup;
    if (peopleFilterActive) {
      result = result.filter((photo) => {
        const count = inferPeopleCountForPersonPhoto(photo);
        if (count === null) return false;
        return wantsSolo ? count <= 1 : count >= 2;
      });
    }

    // Apply seeded filter (if exactly one is selected)
    const wantsSeeded = advancedFilters.seeded.includes("seeded");
    const wantsNotSeeded = advancedFilters.seeded.includes("not_seeded");
    const seededFilterActive = wantsSeeded !== wantsNotSeeded;
    if (seededFilterActive) {
      result = result.filter((photo) =>
        wantsSeeded ? Boolean(photo.facebank_seed) : !Boolean(photo.facebank_seed)
      );
    }

    // Apply content type filter
    if (advancedFilters.contentTypes.length > 0) {
      result = result.filter((photo) =>
        matchesContentTypesForPersonPhoto(photo, advancedFilters.contentTypes)
      );
    }

    // Apply sort
    switch (advancedFilters.sort as GallerySortOption) {
      case "newest":
        result.sort((a, b) => getPhotoSortDate(b) - getPhotoSortDate(a));
        break;
      case "oldest":
        result.sort((a, b) => getPhotoSortDate(a) - getPhotoSortDate(b));
        break;
      case "season-asc":
        result.sort((a, b) => {
          const seasonA = typeof a.season === "number" ? a.season : null;
          const seasonB = typeof b.season === "number" ? b.season : null;
          if (seasonA === null && seasonB === null) {
            return getPhotoSortDate(b) - getPhotoSortDate(a);
          }
          if (seasonA === null) return 1;
          if (seasonB === null) return -1;
          if (seasonA !== seasonB) return seasonA - seasonB;
          return getPhotoSortDate(b) - getPhotoSortDate(a);
        });
        break;
      case "season-desc":
        result.sort((a, b) => {
          const seasonA = typeof a.season === "number" ? a.season : null;
          const seasonB = typeof b.season === "number" ? b.season : null;
          if (seasonA === null && seasonB === null) {
            return getPhotoSortDate(b) - getPhotoSortDate(a);
          }
          if (seasonA === null) return 1;
          if (seasonB === null) return -1;
          if (seasonA !== seasonB) return seasonB - seasonA;
          return getPhotoSortDate(b) - getPhotoSortDate(a);
        });
        break;
      case "source":
        result.sort((a, b) => (a.source || "").localeCompare(b.source || ""));
        break;
    }

    return result;
  }, [
    photos,
    galleryShowFilter,
    advancedFilters.sources,
    advancedFilters.text,
    advancedFilters.people,
    advancedFilters.contentTypes,
    advancedFilters.seeded,
    advancedFilters.sort,
    showIdParam,
    showIdForApi,
    activeShowName,
    activeShowAcronym,
    otherShowNameMatches,
    otherShowAcronymMatches,
    selectedOtherShow,
    getPhotoSortDate,
  ]);

  const gallerySections = useMemo(() => {
    const profilePictures: TrrPersonPhoto[] = [];
    const otherPhotos: TrrPersonPhoto[] = [];

    for (const photo of filteredPhotos.slice(0, photosVisibleCount)) {
      const normalizedContextType = (photo.context_type ?? "").toLowerCase().trim();
      const normalizedContextSection = (photo.context_section ?? "").toLowerCase().trim();
      const isProfilePicture =
        normalizedContextType === "profile_picture" ||
        normalizedContextType === "profile" ||
        normalizedContextSection === "bravo_profile";
      if (isProfilePicture) {
        profilePictures.push(photo);
      } else {
        otherPhotos.push(photo);
      }
    }

    return { profilePictures, otherPhotos };
  }, [filteredPhotos, photosVisibleCount]);

  const filteredPhotoIndexById = useMemo(() => {
    const indexMap = new Map<string, number>();
    filteredPhotos.forEach((photo, index) => indexMap.set(photo.id, index));
    return indexMap;
  }, [filteredPhotos]);

  useEffect(() => {
    setPhotosVisibleCount(120);
  }, [galleryShowFilter, selectedOtherShowKey, advancedFilters]);

  // Helper to get auth headers
  const getAuthHeaders = useCallback(
    async () =>
      getClientAuthHeaders({
        preferredUser: user,
        allowDevAdminBypass: true,
      }),
    [user],
  );

  const fetchWithAuth = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) =>
      fetchAdminWithAuth(input, init, {
        preferredUser: user,
        allowDevAdminBypass: true,
      }),
    [user],
  );

  useEffect(() => {
    if (!showIdParam || !hasAccess) {
      setResolvedShowIdParam(null);
      setResolvedShowSlugParam(null);
      return;
    }
    if (looksLikeUuid(showIdParam)) {
      setResolvedShowIdParam(showIdParam);
      setResolvedShowSlugParam(null);
      return;
    }

    let cancelled = false;
    const resolveSlug = async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(
          `/api/admin/trr-api/shows/resolve-slug?slug=${encodeURIComponent(showIdParam)}`,
          { headers, cache: "no-store" }
        );
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          resolved?: { show_id?: string | null; canonical_slug?: string | null; slug?: string | null };
        };
        if (!response.ok) {
          throw new Error(data.error || "Failed to resolve show slug");
        }
        const resolvedId =
          typeof data.resolved?.show_id === "string" && looksLikeUuid(data.resolved.show_id)
            ? data.resolved.show_id
            : null;
        if (!resolvedId) {
          throw new Error("Resolved show slug did not return a valid show id.");
        }
        if (cancelled) return;
        setResolvedShowIdParam(resolvedId);
        const resolvedSlug =
          typeof data.resolved?.canonical_slug === "string" && data.resolved.canonical_slug.trim().length > 0
            ? data.resolved.canonical_slug.trim()
            : typeof data.resolved?.slug === "string" && data.resolved.slug.trim().length > 0
              ? data.resolved.slug.trim()
              : showIdParam;
        setResolvedShowSlugParam(resolvedSlug);
      } catch {
        if (cancelled) return;
        setResolvedShowIdParam(null);
        setResolvedShowSlugParam(null);
      }
    };
    void resolveSlug();
    return () => {
      cancelled = true;
    };
  }, [getAuthHeaders, hasAccess, showIdParam]);

  useEffect(() => {
    if (!hasAccess) return;
    if (!personRouteParam) {
      setResolvedPersonIdParam(null);
      setResolvedPersonSlugParam(null);
      setError("Missing person identifier.");
      setLoading(false);
      return;
    }

    if (looksLikeUuid(personRouteParam)) {
      setResolvedPersonIdParam(personRouteParam);
      setResolvedPersonSlugParam(null);
      return;
    }

    let cancelled = false;
    const resolvePersonSlug = async () => {
      try {
        setError(null);
        setLoading(true);
        const headers = await getAuthHeaders();
        const query = new URLSearchParams({ slug: personRouteParam });
        if (showIdParam) query.set("showId", showIdParam);
        const response = await fetch(`/api/admin/trr-api/people/resolve-slug?${query.toString()}`, {
          headers,
          cache: "no-store",
        });
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          resolved?: { person_id?: string | null; canonical_slug?: string | null; slug?: string | null };
        };
        if (!response.ok) {
          throw new Error(data.error || "Failed to resolve person slug");
        }
        const resolvedId =
          typeof data.resolved?.person_id === "string" && looksLikeUuid(data.resolved.person_id)
            ? data.resolved.person_id
            : null;
        if (!resolvedId) {
          throw new Error("Resolved person slug did not return a valid person id.");
        }
        if (cancelled) return;
        setResolvedPersonIdParam(resolvedId);
        const resolvedSlug =
          typeof data.resolved?.canonical_slug === "string" && data.resolved.canonical_slug.trim().length > 0
            ? data.resolved.canonical_slug.trim()
            : typeof data.resolved?.slug === "string" && data.resolved.slug.trim().length > 0
              ? data.resolved.slug.trim()
              : personRouteParam;
        setResolvedPersonSlugParam(resolvedSlug);
      } catch (err) {
        if (cancelled) return;
        setResolvedPersonIdParam(null);
        setError(err instanceof Error ? err.message : "Could not resolve person URL slug.");
        setLoading(false);
      }
    };

    void resolvePersonSlug();
    return () => {
      cancelled = true;
    };
  }, [getAuthHeaders, hasAccess, personRouteParam, showIdParam]);

  useEffect(() => {
    if (!personSlugForRouting) return;
    const preservedQuery = cleanLegacyPersonRoutingQuery(new URLSearchParams(searchParams.toString()));
    const canonicalUrl = buildPersonAdminUrl({
      personSlug: personSlugForRouting,
      tab: personRouteState.tab,
      query: preservedQuery,
    });
    const currentQuery = searchParams.toString();
    const currentUrl = currentQuery ? `${pathname}?${currentQuery}` : pathname;
    if (currentUrl === canonicalUrl) return;
    router.replace(canonicalUrl as Route, { scroll: false });
  }, [
    pathname,
    personRouteState.tab,
    personSlugForRouting,
    router,
    searchParams,
  ]);

  useEffect(() => {
    if (!showIdForApi || !hasAccess) {
      setSeasonPremiereMap({});
      return;
    }

    let cancelled = false;

    const loadSeasonPremieres = async () => {
      try {
        const response = await fetchWithAuth(
          `/api/admin/trr-api/shows/${showIdForApi}/seasons?limit=50`,
        );
        if (!response.ok) throw new Error("Failed to fetch seasons");
        const data = await response.json();
        const nextMap: Record<number, string> = {};
        for (const season of (data.seasons ?? []) as Array<{
          season_number: number;
          premiere_date?: string | null;
          air_date?: string | null;
        }>) {
          const date = season.premiere_date ?? season.air_date ?? null;
          if (date && Number.isFinite(season.season_number)) {
            nextMap[season.season_number] = date;
          }
        }
        if (!cancelled) {
          setSeasonPremiereMap(nextMap);
        }
      } catch (err) {
        console.error("Failed to fetch season premiere dates:", err);
        if (!cancelled) {
          setSeasonPremiereMap({});
        }
      }
    };

    loadSeasonPremieres();
    return () => {
      cancelled = true;
    };
  }, [fetchWithAuth, showIdForApi, hasAccess]);

  // Fetch person details
  const fetchPerson = useCallback(async (options?: { signal?: AbortSignal }) => {
    if (!personId) return;
    const signal = options?.signal;
    if (signal?.aborted) return;
    try {
      const headers = await getAuthHeaders();
      if (signal?.aborted) return;
      const response = await fetch(`/api/admin/trr-api/people/${personId}`, { headers, signal });
      if (!response.ok) throw new Error("Failed to fetch person");
      const data = await response.json();
      if (signal?.aborted) return;
      setPerson(data.person);
      const nextSourceOrder = readCanonicalSourceOrderFromExternalIds(
        data.person?.external_ids as Record<string, unknown> | null | undefined
      );
      setCanonicalSourceOrder(nextSourceOrder);
      setInitialCanonicalSourceOrder(nextSourceOrder);
      setCanonicalSourceOrderError(null);
      setCanonicalSourceOrderNotice(null);
    } catch (err) {
      if (signal?.aborted || isAbortError(err)) return;
      setError(err instanceof Error ? err.message : "Failed to load person");
    }
  }, [personId, getAuthHeaders]);

  const moveCanonicalSource = useCallback(
    (source: CanonicalSource, direction: "up" | "down") => {
      setCanonicalSourceOrder((prev) => {
        const index = prev.indexOf(source);
        if (index < 0) return prev;
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= prev.length) return prev;
        const next = [...prev];
        const [item] = next.splice(index, 1);
        next.splice(targetIndex, 0, item);
        return next;
      });
      setCanonicalSourceOrderError(null);
      setCanonicalSourceOrderNotice(null);
    },
    []
  );

  const resetCanonicalSourceOrder = useCallback(() => {
    setCanonicalSourceOrder([...initialCanonicalSourceOrder]);
    setCanonicalSourceOrderError(null);
    setCanonicalSourceOrderNotice(null);
  }, [initialCanonicalSourceOrder]);

  const saveCanonicalSourceOrder = useCallback(async () => {
    if (!personId) return;
    if (!canonicalSourceOrderDirty || canonicalSourceOrderSaving) {
      return;
    }
    try {
      setCanonicalSourceOrderSaving(true);
      setCanonicalSourceOrderError(null);
      setCanonicalSourceOrderNotice(null);
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/trr-api/people/${personId}`, {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          canonicalProfileSourceOrder: canonicalSourceOrder,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        person?: TrrPerson;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Failed to update canonical source order");
      }
      if (data.person) {
        setPerson(data.person);
        const persistedSourceOrder = readCanonicalSourceOrderFromExternalIds(
          data.person.external_ids as Record<string, unknown> | null | undefined
        );
        setCanonicalSourceOrder(persistedSourceOrder);
        setInitialCanonicalSourceOrder(persistedSourceOrder);
      } else {
        setInitialCanonicalSourceOrder([...canonicalSourceOrder]);
      }
      setCanonicalSourceOrderNotice("Saved source order.");
    } catch (err) {
      setCanonicalSourceOrderError(
        err instanceof Error ? err.message : "Failed to update source order"
      );
    } finally {
      setCanonicalSourceOrderSaving(false);
    }
  }, [
    canonicalSourceOrder,
    canonicalSourceOrderDirty,
    canonicalSourceOrderSaving,
    getAuthHeaders,
    personId,
  ]);

  // Fetch photos
  const fetchPhotos = useCallback(async (options?: { signal?: AbortSignal; includeBroken?: boolean }): Promise<TrrPersonPhoto[]> => {
    if (!personId) return [];
    const signal = options?.signal;
    const includeBroken = options?.includeBroken ?? showBrokenRowsRef.current;
    if (signal?.aborted) return [];
    try {
      const headers = await getAuthHeaders();
      const pageSize = 500;
      const fetchedPhotos: TrrPersonPhoto[] = [];
      let offset = 0;
      let pageCount = 0;
      while (true) {
        if (signal?.aborted) return [];
        pageCount += 1;
        if (pageCount > MAX_PHOTO_FETCH_PAGES) {
          throw new Error("Photo pagination exceeded safety limit.");
        }
        let response: Response;
        try {
          const params = new URLSearchParams({
            limit: String(pageSize),
            offset: String(offset),
          });
          if (includeBroken) {
            params.set("include_broken", "true");
          }
          response = await fetchWithTimeout(
            `/api/admin/trr-api/people/${personId}/photos?${params.toString()}`,
            { headers },
            PHOTO_LIST_LOAD_TIMEOUT_MS,
            signal
          );
        } catch (error) {
          if (signal?.aborted || isSignalAbortedWithoutReasonError(error)) {
            return [];
          }
          if (isAbortError(error)) {
            throw new Error(
              `Timed out loading person photos after ${Math.round(PHOTO_LIST_LOAD_TIMEOUT_MS / 1000)}s.`
            );
          }
          throw error;
        }
        if (signal?.aborted) return [];
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message =
            data.error && data.detail
              ? `${data.error}: ${data.detail}`
              : data.error || "Failed to fetch photos";
          throw new Error(message);
        }
        const pagePhotos = Array.isArray(data.photos) ? (data.photos as TrrPersonPhoto[]) : [];
        fetchedPhotos.push(...pagePhotos);
        if (pagePhotos.length < pageSize) break;
        offset += pageSize;
      }
      if (signal?.aborted) return [];
      setGalleryFallbackTelemetry({
        fallbackRecoveredCount: 0,
        allCandidatesFailedCount: 0,
        totalImageAttempts: 0,
      });
      setPhotos(fetchedPhotos);
      setPhotosError(null);
      return fetchedPhotos;
    } catch (err) {
      if (signal?.aborted || isAbortError(err) || isSignalAbortedWithoutReasonError(err)) {
        return [];
      }
      console.error("Failed to fetch photos:", err);
      setPhotosError(err instanceof Error ? err.message : "Failed to fetch photos");
      return [];
    }
  }, [personId, getAuthHeaders]);

  const detectTextOverlayForUnknown = useCallback(async () => {
    textOverlayDetectControllerRef.current?.abort();
    const controller = new AbortController();
    textOverlayDetectControllerRef.current = controller;
    const signal = controller.signal;

    // Best-effort batch for the current gallery set (capped to reduce cost).
    const targets = photos
      .filter(
        (p) =>
          inferHasTextOverlay(p.metadata ?? null) === null
      )
      .slice(0, 25);
    if (targets.length === 0) return;

    setTextOverlayDetectError(null);
    const headers = await getAuthHeaders();
    if (signal.aborted) return;
    let shouldStop = false;
    const runDetection = async (
      photo: TrrPersonPhoto
    ): Promise<{ error: string | null; shouldStop: boolean }> => {
      try {
        const endpoint =
          photo.origin === "media_links" && photo.media_asset_id
            ? `/api/admin/trr-api/media-assets/${photo.media_asset_id}/detect-text-overlay`
            : `/api/admin/trr-api/cast-photos/${photo.id}/detect-text-overlay`;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ force: false }),
          signal,
        });
        if (response.ok) {
          return { error: null, shouldStop: false };
        }
        const data = await response.json().catch(() => ({}));
        const errorText =
          typeof data.error === "string" ? data.error : "Detect text overlay failed";
        const detailText = typeof data.detail === "string" ? data.detail : null;
        return {
          error: detailText ? `${errorText}: ${detailText}` : errorText,
          shouldStop: response.status === 401 || response.status === 403 || response.status === 503,
        };
      } catch (err) {
        if (signal.aborted || isAbortError(err)) {
          return { error: null, shouldStop: true };
        }
        return {
          error: err instanceof Error ? err.message : "Detect text overlay failed",
          shouldStop: true,
        };
      }
    };

    for (let index = 0; index < targets.length && !shouldStop; index += TEXT_OVERLAY_DETECT_CONCURRENCY) {
      if (signal.aborted) break;
      const batch = targets.slice(index, index + TEXT_OVERLAY_DETECT_CONCURRENCY);
      const results = await Promise.all(batch.map((photo) => runDetection(photo)));
      for (const result of results) {
        if (result.error) setTextOverlayDetectError(result.error);
        if (result.shouldStop) {
          shouldStop = true;
          break;
        }
      }
    }

    if (signal.aborted) return;
    await fetchPhotos({ signal });
  }, [photos, getAuthHeaders, fetchPhotos]);

  // Fetch credits
  const fetchCredits = useCallback(async (options?: { signal?: AbortSignal }) => {
    if (!personId) return;
    const signal = options?.signal;
    if (signal?.aborted) return;
    try {
      setCreditsLoading(true);
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      params.set("limit", showIdForApi ? "500" : "50");
      if (showIdForApi) {
        params.set("showId", showIdForApi);
      }
      const response = await fetch(
        `/api/admin/trr-api/people/${personId}/credits?${params.toString()}`,
        { headers, signal }
      );
      const data = (await response.json().catch(() => ({}))) as {
        credits?: TrrPersonCredit[];
        show_scope?: PersonCreditShowScope;
        error?: string;
      };
      if (signal?.aborted) return;
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch credits");
      }
      setCredits(Array.isArray(data.credits) ? data.credits : []);
      setShowScopedCredits(
        data.show_scope && typeof data.show_scope === "object"
          ? (data.show_scope as PersonCreditShowScope)
          : null
      );
      setCreditsError(null);
    } catch (err) {
      if (signal?.aborted || isAbortError(err)) return;
      setCredits([]);
      setShowScopedCredits(null);
      setCreditsError(err instanceof Error ? err.message : "Failed to fetch credits");
      console.error("Failed to fetch credits:", err);
    } finally {
      setCreditsLoading(false);
    }
  }, [personId, getAuthHeaders, showIdForApi]);

  // Fetch cover photo
  const fetchCoverPhoto = useCallback(async (options?: { signal?: AbortSignal }) => {
    if (!personId) return;
    const signal = options?.signal;
    if (signal?.aborted) return;
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/people/${personId}/cover-photo`,
        { headers, signal }
      );
      if (!response.ok) return;
      const data = await response.json();
      if (signal?.aborted) return;
      setCoverPhoto(data.coverPhoto);
    } catch (err) {
      if (signal?.aborted || isAbortError(err)) return;
      console.error("Failed to fetch cover photo:", err);
    }
  }, [personId, getAuthHeaders]);

  // Fetch fandom data
  const fetchFandomData = useCallback(async (options?: { signal?: AbortSignal }) => {
    if (!personId) return;
    const signal = options?.signal;
    if (signal?.aborted) return;
    try {
      setFandomLoading(true);
      const headers = await getAuthHeaders();
      const showIdQuery =
        typeof showIdForApi === "string" && showIdForApi.trim().length > 0
          ? `?showId=${encodeURIComponent(showIdForApi.trim())}`
          : "";
      const response = await fetch(
        `/api/admin/trr-api/people/${personId}/fandom${showIdQuery}`,
        { headers, signal }
      );
      const data = (await response.json().catch(() => ({}))) as {
        fandomData?: TrrCastFandom[];
        error?: string;
      };
      if (signal?.aborted) return;
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch fandom data");
      }
      setFandomData(data.fandomData ?? []);
      setFandomError(null);
    } catch (err) {
      if (signal?.aborted || isAbortError(err)) return;
      setFandomError(err instanceof Error ? err.message : "Failed to fetch fandom data");
      console.error("Failed to fetch fandom data:", err);
    } finally {
      setFandomLoading(false);
      if (!signal?.aborted) {
        setFandomLoaded(true);
      }
    }
  }, [personId, getAuthHeaders, showIdForApi]);

  const previewSyncByFandom = useCallback(
    async (options: FandomSyncOptions) => {
      if (!personId) return;
      try {
        setFandomSyncPreviewLoading(true);
        setFandomSyncError(null);
        const headers = await getAuthHeaders();
        const response = await fetch(
          `/api/admin/trr-api/people/${personId}/import-fandom/preview`,
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
          throw new Error(typeof rawData.error === "string" ? rawData.error : "Fandom preview failed");
        }
        setFandomSyncPreview(data);
      } catch (err) {
        setFandomSyncError(err instanceof Error ? err.message : "Fandom preview failed");
      } finally {
        setFandomSyncPreviewLoading(false);
      }
    },
    [personId, getAuthHeaders]
  );

  const commitSyncByFandom = useCallback(
    async (options: FandomSyncOptions) => {
      if (!personId) return;
      try {
        setFandomSyncCommitLoading(true);
        setFandomSyncError(null);
        const headers = await getAuthHeaders();
        const response = await fetch(
          `/api/admin/trr-api/people/${personId}/import-fandom/commit`,
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
        if (!response.ok) {
          throw new Error(data.error || "Fandom save failed");
        }
        await fetchFandomData();
        setFandomSyncOpen(false);
      } catch (err) {
        setFandomSyncError(err instanceof Error ? err.message : "Fandom save failed");
      } finally {
        setFandomSyncCommitLoading(false);
      }
    },
    [personId, getAuthHeaders, fetchFandomData]
  );

  const syncBravoVideoThumbnails = useCallback(
    async (options?: { force?: boolean; signal?: AbortSignal }): Promise<boolean> => {
      if (!showIdForApi) return false;
      const force = options?.force ?? false;
      const signal = options?.signal;
      if (signal?.aborted) return false;
      if (bravoVideoSyncInFlightRef.current) {
        return await bravoVideoSyncInFlightRef.current;
      }

      const request = (async (): Promise<boolean> => {
        try {
          setBravoVideoSyncing(true);
          setBravoVideoSyncWarning(null);
          const headers = await getAuthHeaders();
          const response = await fetchWithTimeout(
            `/api/admin/trr-api/shows/${showIdForApi}/bravo/videos/sync-thumbnails`,
            {
              method: "POST",
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ force }),
              cache: "no-store",
            },
            BRAVO_VIDEO_THUMBNAIL_SYNC_TIMEOUT_MS,
            signal
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
          if (attempted > 0 || synced > 0 || failed > 0) {
            setBravoVideoSyncWarning(
              `Video thumbnail sync: ${synced} synced, ${failed} failed${attempted > 0 ? ` (${attempted} attempted)` : ""}.`
            );
          }
          return true;
        } catch (error) {
          if (signal?.aborted || isAbortError(error)) return false;
          setBravoVideoSyncWarning(
            error instanceof Error ? error.message : "Failed to sync Bravo video thumbnails"
          );
          return false;
        } finally {
          setBravoVideoSyncing(false);
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
    [getAuthHeaders, showIdForApi]
  );

  const fetchBravoVideos = useCallback(async (options?: { signal?: AbortSignal; forceSync?: boolean }) => {
    if (!personId || !showIdForApi) {
      setBravoVideos([]);
      setBravoVideosLoaded(false);
      setBravoVideosError(null);
      return;
    }
    const signal = options?.signal;
    const forceSync = options?.forceSync ?? false;
    if (signal?.aborted) return;

    try {
      setBravoVideosLoading(true);
      setBravoVideosError(null);
      const headers = await getAuthHeaders();
      if (forceSync || !bravoVideoSyncAttemptedRef.current) {
        bravoVideoSyncAttemptedRef.current = true;
        await syncBravoVideoThumbnails({ force: forceSync, signal });
      }
      const videosResponse = await fetchWithTimeout(
        `/api/admin/trr-api/shows/${showIdForApi}/bravo/videos?person_id=${personId}&merge_person_sources=true`,
        {
          headers,
          cache: "no-store",
        },
        PHOTO_LIST_LOAD_TIMEOUT_MS,
        signal
      );
      const videosData = (await videosResponse.json().catch(() => ({}))) as {
        videos?: BravoVideoItem[];
        error?: string;
      };
      if (signal?.aborted) return;
      if (!videosResponse.ok) {
        throw new Error(videosData.error || "Failed to fetch person videos");
      }

      setBravoVideos(Array.isArray(videosData.videos) ? videosData.videos : []);
    } catch (err) {
      if (signal?.aborted || isAbortError(err)) return;
      setBravoVideosError(err instanceof Error ? err.message : "Failed to fetch person videos");
    } finally {
      setBravoVideosLoading(false);
      if (!signal?.aborted) {
        setBravoVideosLoaded(true);
      }
    }
  }, [getAuthHeaders, personId, showIdForApi, syncBravoVideoThumbnails]);

  const syncGoogleNews = useCallback(
    async ({ force = false }: { force?: boolean } = {}): Promise<boolean> => {
      if (!showIdForApi) return false;
      if (newsSyncInFlightRef.current) {
        return await newsSyncInFlightRef.current;
      }

      const request = (async (): Promise<boolean> => {
        try {
          setNewsSyncing(true);
          const headers = await getAuthHeaders();
          const response = await fetchWithTimeout(
            `/api/admin/trr-api/shows/${showIdForApi}/google-news/sync`,
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
          };
          if (!response.ok) {
            if (response.status === 409) {
              setNewsGoogleUrlMissing(true);
              setNewsNotice(data.error || "Google News URL is not configured for this show.");
              return false;
            }
            throw new Error(data.error || "Failed to sync Google News");
          }

          const jobId = typeof data.job_id === "string" ? data.job_id.trim() : "";
          if (jobId) {
            const headers = await getAuthHeaders();
            const pollStartedAt = Date.now();
            while (Date.now() - pollStartedAt < NEWS_SYNC_POLL_TIMEOUT_MS) {
              const statusResponse = await fetchWithTimeout(
                `/api/admin/trr-api/shows/${showIdForApi}/google-news/sync/${encodeURIComponent(jobId)}`,
                { headers, cache: "no-store" },
                NEWS_SYNC_TIMEOUT_MS
              );
              const statusData = (await statusResponse.json().catch(() => ({}))) as {
                error?: string;
                status?: string;
                result?: { error?: string } | null;
              };
              if (!statusResponse.ok) {
                throw new Error(statusData.error || "Failed to fetch Google News sync status");
              }
              const status = String(statusData.status || "").trim().toLowerCase();
              if (status === "completed") break;
              if (status === "failed") {
                throw new Error(
                  (statusData.result && typeof statusData.result.error === "string" && statusData.result.error) ||
                    statusData.error ||
                    "Google News sync failed"
                );
              }
              await new Promise((resolve) => setTimeout(resolve, NEWS_SYNC_POLL_INTERVAL_MS));
            }
            if (Date.now() - pollStartedAt >= NEWS_SYNC_POLL_TIMEOUT_MS) {
              throw new Error(
                `Google News sync polling timed out after ${Math.round(NEWS_SYNC_POLL_TIMEOUT_MS / 1000)}s`
              );
            }
          }

          setNewsGoogleUrlMissing(false);
          setNewsNotice(null);
          return true;
        } catch (error) {
          if (isAbortError(error)) {
            throw new Error(`Timed out syncing Google News after ${Math.round(NEWS_SYNC_TIMEOUT_MS / 1000)}s`);
          }
          throw error instanceof Error ? error : new Error("Failed to sync Google News");
        } finally {
          setNewsSyncing(false);
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
    [getAuthHeaders, showIdForApi]
  );

  const loadUnifiedNews = useCallback(
    async ({ force = false, forceSync = false, append = false }: { force?: boolean; forceSync?: boolean; append?: boolean } = {}) => {
      if (!personId || !showIdForApi) {
        setUnifiedNews([]);
        setNewsLoaded(false);
        setNewsError(null);
        setNewsNotice(null);
        setNewsNextCursor(null);
        setNewsFacets(EMPTY_NEWS_FACETS);
        setNewsPageCount(0);
        setNewsTotalCount(0);
        newsLoadedQueryKeyRef.current = null;
        newsCursorQueryKeyRef.current = null;
        return;
      }

      const baseParams = new URLSearchParams({
        sources: "bravo,google_news",
        person_id: personId,
        sort: newsSort,
        limit: String(NEWS_PAGE_SIZE),
      });
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
      if (!shouldForce && !shouldAppend && newsLoaded && newsLoadedQueryKeyRef.current === queryKey) {
        return;
      }
      if (!shouldAppend && newsLoadedQueryKeyRef.current && newsLoadedQueryKeyRef.current !== queryKey) {
        setNewsNextCursor(null);
        newsCursorQueryKeyRef.current = null;
      }
      if (newsLoadInFlightRef.current) {
        pendingNewsReloadRef.current = true;
        pendingNewsReloadArgsRef.current = { force: shouldForce, forceSync, queryKey };
        return;
      }

      const requestSeq = newsRequestSeqRef.current + 1;
      newsRequestSeqRef.current = requestSeq;

      const request = (async () => {
        try {
          setNewsLoading(true);
          setNewsError(null);
          if (!shouldAppend && (forceSync || !newsAutoSyncAttemptedRef.current)) {
            const syncSuccess = await syncGoogleNews({ force: forceSync });
            if (syncSuccess) newsAutoSyncAttemptedRef.current = true;
          }

          const headers = await getAuthHeaders();
          const requestParams = new URLSearchParams(baseParams);
          if (shouldAppend && newsNextCursor) {
            requestParams.set("cursor", newsNextCursor);
          }
          const response = await fetchWithTimeout(
            `/api/admin/trr-api/shows/${showIdForApi}/news?${requestParams.toString()}`,
            {
              headers,
              cache: "no-store",
            },
            NEWS_LOAD_TIMEOUT_MS
          );
          const data = (await response.json().catch(() => ({}))) as {
            news?: BravoNewsItem[];
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
          };
          if (!response.ok) {
            throw new Error(data.error || "Failed to fetch person news");
          }
          if (requestSeq !== newsRequestSeqRef.current) return;

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
            typeof data.next_cursor === "string" && data.next_cursor.trim().length > 0
              ? data.next_cursor
              : null;
          setNewsNextCursor(nextCursor);
          newsCursorQueryKeyRef.current = nextCursor ? queryKey : null;
          setNewsLoaded(true);
          newsLoadedQueryKeyRef.current = queryKey;
        } catch (error) {
          if (requestSeq !== newsRequestSeqRef.current) return;
          const message = isAbortError(error)
            ? `Timed out loading news after ${Math.round(NEWS_LOAD_TIMEOUT_MS / 1000)}s`
            : error instanceof Error
              ? error.message
              : "Failed to load unified news";
          if (shouldAppend) {
            setNewsNextCursor(null);
            newsCursorQueryKeyRef.current = null;
            setNewsError(`Failed to load more news: ${message}. Cursor reset. Refresh to continue.`);
            return;
          }
          setNewsLoaded(false);
          setNewsPageCount(0);
          setNewsTotalCount(0);
          setNewsFacets(EMPTY_NEWS_FACETS);
          setNewsNextCursor(null);
          setUnifiedNews([]);
          newsLoadedQueryKeyRef.current = null;
          newsCursorQueryKeyRef.current = null;
          setNewsError(message);
        } finally {
          if (requestSeq !== newsRequestSeqRef.current) return;
          setNewsLoading(false);
        }
      })();

      newsLoadInFlightRef.current = request;
      try {
        await request;
      } finally {
        if (newsLoadInFlightRef.current === request) {
          newsLoadInFlightRef.current = null;
          const pendingReload = pendingNewsReloadRef.current ? pendingNewsReloadArgsRef.current : null;
          pendingNewsReloadRef.current = false;
          pendingNewsReloadArgsRef.current = null;
          if (pendingReload) {
            void loadUnifiedNews({
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
      newsLoaded,
      newsNextCursor,
      newsSeasonFilter,
      newsSort,
      newsSourceFilter,
      newsTopicFilter,
      personId,
      showIdForApi,
      syncGoogleNews,
    ]
  );

  // Set cover photo
  const handleSetCover = async (photo: TrrPersonPhoto) => {
    if (!personId || !photo.hosted_url) return;
    setSettingCover(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/people/${personId}/cover-photo`,
        {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            photo_id: photo.id,
            photo_url: photo.hosted_url,
          }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        setCoverPhoto(data.coverPhoto);
      }
    } catch (err) {
      console.error("Failed to set cover photo:", err);
    } finally {
      setSettingCover(false);
    }
  };

  const handleTagsUpdated = useCallback(
    (payload: {
      mediaAssetId: string | null;
      castPhotoId: string | null;
      peopleNames: string[];
      peopleIds: string[];
      peopleCount: number | null;
      peopleCountSource: "auto" | "manual" | null;
      faceBoxes: FaceBoxTag[];
    }) => {
      setPhotos((prev) =>
        prev.map((photo) =>
          payload.mediaAssetId && photo.media_asset_id === payload.mediaAssetId
            ? {
                ...photo,
                people_names: payload.peopleNames,
                people_ids: payload.peopleIds,
                people_count: payload.peopleCount,
                people_count_source: payload.peopleCountSource,
                face_boxes: payload.faceBoxes,
              }
            : payload.castPhotoId && photo.id === payload.castPhotoId
              ? {
                  ...photo,
                  people_names: payload.peopleNames,
                  people_ids: payload.peopleIds,
                  people_count: payload.peopleCount,
                  people_count_source: payload.peopleCountSource,
                  face_boxes: payload.faceBoxes,
                }
              : photo
        )
      );
      setLightboxPhoto((prev) => {
        if (!prev) return prev;
        if (
          payload.mediaAssetId &&
          prev.photo.media_asset_id === payload.mediaAssetId
        ) {
          return {
            ...prev,
            photo: {
              ...prev.photo,
              people_names: payload.peopleNames,
              people_ids: payload.peopleIds,
              people_count: payload.peopleCount,
              people_count_source: payload.peopleCountSource,
              face_boxes: payload.faceBoxes,
            },
          };
        }
        if (payload.castPhotoId && prev.photo.id === payload.castPhotoId) {
          return {
            ...prev,
            photo: {
              ...prev.photo,
              people_names: payload.peopleNames,
              people_ids: payload.peopleIds,
              people_count: payload.peopleCount,
              people_count_source: payload.peopleCountSource,
              face_boxes: payload.faceBoxes,
            },
          };
        }
        return prev;
      });
    },
    []
  );

  const handleMirrorUpdated = useCallback(
    (payload: { mediaAssetId: string | null; castPhotoId: string | null; hostedUrl: string }) => {
      setPhotos((prev) =>
        prev.map((photo) =>
          payload.mediaAssetId && photo.media_asset_id === payload.mediaAssetId
            ? { ...photo, hosted_url: payload.hostedUrl }
            : payload.castPhotoId && photo.id === payload.castPhotoId
              ? { ...photo, hosted_url: payload.hostedUrl }
            : photo
        )
      );
      setLightboxPhoto((prev) => {
        if (!prev) return prev;
        if (payload.mediaAssetId && prev.photo.media_asset_id === payload.mediaAssetId) {
          return {
            ...prev,
            photo: { ...prev.photo, hosted_url: payload.hostedUrl },
          };
        }
        if (payload.castPhotoId && prev.photo.id === payload.castPhotoId) {
          return {
            ...prev,
            photo: { ...prev.photo, hosted_url: payload.hostedUrl },
          };
        }
        return prev;
      });
    },
    []
  );

  const runPhotoMetadataJob = useCallback(
    async (endpoint: string, payload?: Record<string, unknown>) => {
      const headers = await getAuthHeaders();
      let response: Response;
      try {
        response = await fetchWithTimeout(
          endpoint,
          {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify(payload ?? { force: true }),
          },
          PHOTO_PIPELINE_STEP_TIMEOUT_MS
        );
      } catch (error) {
        if (isAbortError(error)) {
          throw new Error(
            `Job timed out (${Math.round(PHOTO_PIPELINE_STEP_TIMEOUT_MS / 1000)}s)`
          );
        }
        throw error;
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorText =
          typeof data.error === "string" ? data.error : "Job failed";
        const detailText = typeof data.detail === "string" ? data.detail : null;
        throw new Error(detailText ? `${errorText}: ${detailText}` : errorText);
      }
      return data;
    },
    [getAuthHeaders]
  );

  type PhotoPipelineStepKey = "sync" | "count" | "crop" | "id_text" | "resize";

  type PhotoPipelineStep = {
    key: PhotoPipelineStepKey;
    label: string;
    endpoint: string;
    payload: Record<string, unknown>;
  };

  const summarizePhotoStepResponse = (value: unknown): string | null => {
    if (!value || typeof value !== "object") return null;
    const data = value as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof data.people_count === "number") {
      parts.push(`people_count=${data.people_count}`);
    }
    if (typeof data.has_text_overlay === "boolean") {
      parts.push(`has_text_overlay=${data.has_text_overlay ? "yes" : "no"}`);
    }
    if (typeof data.mirrored === "number") {
      parts.push(`mirrored=${data.mirrored}`);
    }
    if (typeof data.failed === "number" && data.failed > 0) {
      parts.push(`failed=${data.failed}`);
    }
    if (typeof data.updated === "number") {
      parts.push(`updated=${data.updated}`);
    }
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const resolvePhotoPipelineSteps = useCallback((photo: TrrPersonPhoto): Record<PhotoPipelineStepKey, PhotoPipelineStep | null> => {
    const cropPayload = buildThumbnailCropPayload(photo);
    if (photo.origin === "media_links") {
      if (!photo.media_asset_id) {
        throw new Error("Cannot run image pipeline: media asset id is missing.");
      }
      const assetId = photo.media_asset_id;
      return {
        sync: {
          key: "sync",
          label: "Sync",
          endpoint: `/api/admin/trr-api/media-assets/${assetId}/mirror`,
          payload: { force: true },
        },
        count: {
          key: "count",
          label: "Count",
          endpoint: `/api/admin/trr-api/media-assets/${assetId}/auto-count`,
          payload: { force: true },
        },
        crop: cropPayload
          ? {
              key: "crop",
              label: "Crop",
              endpoint: `/api/admin/trr-api/media-assets/${assetId}/variants`,
              payload: { force: true, crop: cropPayload },
            }
          : null,
        id_text: {
          key: "id_text",
          label: "ID Text",
          endpoint: `/api/admin/trr-api/media-assets/${assetId}/detect-text-overlay`,
          payload: { force: true },
        },
        resize: {
          key: "resize",
          label: "Auto-Crop",
          endpoint: `/api/admin/trr-api/media-assets/${assetId}/variants`,
          payload: { force: true, crop: buildThumbnailCropPayloadWithFallback(photo) },
        },
      };
    }

    return {
      sync: {
        key: "sync",
        label: "Sync",
        endpoint: `/api/admin/trr-api/cast-photos/${photo.id}/mirror`,
        payload: { force: true },
      },
      count: {
        key: "count",
        label: "Count",
        endpoint: `/api/admin/trr-api/cast-photos/${photo.id}/auto-count`,
        payload: { force: true },
      },
      crop: cropPayload
        ? {
            key: "crop",
            label: "Crop",
            endpoint: `/api/admin/trr-api/cast-photos/${photo.id}/variants`,
            payload: { force: true, crop: cropPayload },
          }
        : null,
      id_text: {
        key: "id_text",
        label: "ID Text",
        endpoint: `/api/admin/trr-api/cast-photos/${photo.id}/detect-text-overlay`,
        payload: { force: true },
      },
      resize: {
        key: "resize",
        label: "Auto-Crop",
        endpoint: `/api/admin/trr-api/cast-photos/${photo.id}/variants`,
        payload: { force: true, crop: buildThumbnailCropPayloadWithFallback(photo) },
      },
    };
  }, []);

  const runPhotoPipelineSteps = useCallback(
    async (
      photo: TrrPersonPhoto,
      stepKeys: PhotoPipelineStepKey[],
      options?: { allowPartialFailures?: boolean; successNotice?: string; runLabel?: string }
    ) => {
      const allowPartialFailures = options?.allowPartialFailures ?? false;
      const runLabel = options?.runLabel ?? "image_pipeline";
      const errors: string[] = [];
      let runCounts: JobLiveCounts | null = null;

      const logStep = (
        level: RefreshLogLevel,
        stage: string,
        message: string,
        detail?: string | null
      ) => {
        appendRefreshLog({
          source: "image_refresh",
          stage,
          message,
          detail,
          level,
        });
      };

      const stepMap = resolvePhotoPipelineSteps(photo);
      logStep("info", runLabel, `Started ${runLabel.replace(/_/g, " ")} for ${photo.id}`);

      for (const key of stepKeys) {
        const step = stepMap[key];
        if (!step) {
          const message = key === "crop" ? "Crop requires thumbnail crop metadata." : `Step ${key} unavailable.`;
          if (allowPartialFailures) {
            errors.push(message);
            logStep("error", runLabel, message);
            continue;
          }
          throw new Error(message);
        }

        logStep("info", runLabel, `${step.label} started`);
        const startedAt = Date.now();
        try {
          const responseData = await runPhotoMetadataJob(step.endpoint, step.payload);
          runCounts = resolveJobLiveCounts(runCounts, responseData);
          const durationMs = Date.now() - startedAt;
          const summary = summarizePhotoStepResponse(responseData);
          const countSummary = formatJobLiveCounts(runCounts);
          logStep(
            "success",
            runLabel,
            `${step.label} complete (${durationMs}ms${
              summary ? `; ${summary}` : ""
            }${countSummary ? `; ${countSummary}` : ""})`
          );
        } catch (error) {
          const detail = error instanceof Error ? error.message : "failed";
          if (allowPartialFailures) {
            errors.push(`${step.label}: ${detail}`);
            logStep("error", runLabel, `${step.label} failed`, detail);
            continue;
          }
          logStep("error", runLabel, `${step.label} failed`, detail);
          throw error;
        }
      }

      const refreshedPhotos = await fetchPhotos();
      const refreshedPhoto = refreshedPhotos.find((candidate) => candidate.id === photo.id) ?? null;
      if (refreshedPhoto) {
        setThumbnailCropPreview(buildThumbnailCropPreview(refreshedPhoto));
      }
      setLightboxPhoto((prev) => {
        if (!prev || !refreshedPhoto) return prev;
        if (prev.photo.id !== refreshedPhoto.id) return prev;
        return { ...prev, photo: refreshedPhoto };
      });

      if (errors.length > 0) {
        const warning = errors.join(" | ");
        logStep("error", runLabel, `Completed with warnings: ${warning}`);
        if (!allowPartialFailures) {
          throw new Error(warning);
        }
        setRefreshNotice(
          options?.successNotice
            ? `${options.successNotice} (with warnings: ${warning})`
            : `Completed with warnings: ${warning}`
        );
      }

      if (options?.successNotice && errors.length === 0) {
        const countSummary = formatJobLiveCounts(runCounts);
        setRefreshNotice(
          countSummary ? `${options.successNotice} ${countSummary}` : options.successNotice
        );
      }
      setRefreshError(null);
      const completionCountSummary = formatJobLiveCounts(runCounts);
      logStep(
        "success",
        runLabel,
        `Completed ${runLabel.replace(/_/g, " ")} for ${photo.id}${
          completionCountSummary ? ` (${completionCountSummary})` : ""
        }`
      );
    },
    [appendRefreshLog, fetchPhotos, resolvePhotoPipelineSteps, runPhotoMetadataJob]
  );

  const runPhotoAutoCropStage = useCallback(
    async (
      photo: TrrPersonPhoto,
      options?: {
        allowPartialFailures?: boolean;
        successNotice?: string;
        runLabel?: string;
        skipCountStep?: boolean;
      }
    ) => {
      const allowPartialFailures = options?.allowPartialFailures ?? false;
      const runLabel = options?.runLabel ?? "image_auto_crop";
      const errors: string[] = [];
      let runCounts: JobLiveCounts | null = null;

      const basePrefix =
        photo.origin === "media_links"
          ? photo.media_asset_id
            ? `/api/admin/trr-api/media-assets/${photo.media_asset_id}`
            : null
          : `/api/admin/trr-api/cast-photos/${photo.id}`;
      if (!basePrefix) {
        throw new Error("Cannot run auto-crop: media asset id is missing.");
      }

      const logStep = (
        level: RefreshLogLevel,
        stage: string,
        message: string,
        detail?: string | null
      ) => {
        appendRefreshLog({
          source: "image_refresh",
          stage,
          message,
          detail,
          level,
        });
      };

      logStep("info", runLabel, `Started auto-crop for ${photo.id}`);

      if (!options?.skipCountStep) {
        try {
          const countData = await runPhotoMetadataJob(`${basePrefix}/auto-count`, { force: true });
          runCounts = resolveJobLiveCounts(runCounts, countData);
          const summary = summarizePhotoStepResponse(countData);
          const countSummary = formatJobLiveCounts(runCounts);
          logStep(
            "success",
            runLabel,
            `Count complete${summary ? ` (${summary})` : ""}${
              countSummary ? ` (${countSummary})` : ""
            }`
          );
        } catch (error) {
          const detail = error instanceof Error ? error.message : "failed";
          logStep(
            "error",
            runLabel,
            "Count failed; continuing with fallback auto-crop payload.",
            detail
          );
        }
      }

      const refreshedAfterCount = await fetchPhotos();
      const latestPhoto =
        refreshedAfterCount.find((candidate) => candidate.id === photo.id) ?? photo;
      const cropPayload = buildThumbnailCropPayloadWithFallback(latestPhoto);

      try {
        const baseVariantResponse = await runPhotoMetadataJob(`${basePrefix}/variants`, {
          force: true,
        });
        runCounts = resolveJobLiveCounts(runCounts, baseVariantResponse);
        logStep("success", runLabel, "Base variants complete.");
      } catch (error) {
        const detail = error instanceof Error ? error.message : "failed";
        if (!allowPartialFailures) {
          logStep("error", runLabel, "Base variants failed.", detail);
          throw error;
        }
        errors.push(`Base variants: ${detail}`);
        logStep("error", runLabel, "Base variants failed.", detail);
      }

      try {
        const cropVariantResponse = await runPhotoMetadataJob(`${basePrefix}/variants`, {
          force: true,
          crop: cropPayload,
        });
        runCounts = resolveJobLiveCounts(runCounts, cropVariantResponse);
        logStep("success", runLabel, "Crop variants complete.");
      } catch (error) {
        const detail = error instanceof Error ? error.message : "failed";
        if (!allowPartialFailures) {
          logStep("error", runLabel, "Crop variants failed.", detail);
          throw error;
        }
        errors.push(`Crop variants: ${detail}`);
        logStep("error", runLabel, "Crop variants failed.", detail);
      }

      const refreshedPhotos = await fetchPhotos();
      const refreshedPhoto = refreshedPhotos.find((candidate) => candidate.id === photo.id) ?? null;
      if (refreshedPhoto) {
        setThumbnailCropPreview(buildThumbnailCropPreview(refreshedPhoto));
      }
      setLightboxPhoto((prev) => {
        if (!prev || !refreshedPhoto) return prev;
        if (prev.photo.id !== refreshedPhoto.id) return prev;
        return { ...prev, photo: refreshedPhoto };
      });

      if (errors.length > 0 && !allowPartialFailures) {
        throw new Error(errors.join(" | "));
      }
      if (errors.length > 0) {
        logStep("error", runLabel, `Auto-crop completed with partial failures: ${errors.join(" | ")}`);
      }

      if (options?.successNotice) {
        const countSummary = formatJobLiveCounts(runCounts);
        setRefreshNotice(
          countSummary ? `${options.successNotice} ${countSummary}` : options.successNotice
        );
      }
      setRefreshError(null);
      const completionCountSummary = formatJobLiveCounts(runCounts);
      logStep(
        "success",
        runLabel,
        `Completed auto-crop for ${photo.id}${
          completionCountSummary ? ` (${completionCountSummary})` : ""
        }`
      );
    },
    [appendRefreshLog, fetchPhotos, runPhotoMetadataJob]
  );

  const triggerPreviewAutoCropRebuild = useCallback(
    (photo: TrrPersonPhoto, runLabel: string) => {
      void runPhotoAutoCropStage(photo, {
        allowPartialFailures: true,
        runLabel,
      });
    },
    [runPhotoAutoCropStage]
  );

  const handleFacebankSeedUpdated = useCallback(
    (payload: { linkId: string; facebankSeed: boolean }) => {
      let matchedPhoto: TrrPersonPhoto | null = null;
      setPhotos((prev) => {
        matchedPhoto = prev.find((photo) => photo.link_id === payload.linkId) ?? null;
        return applyFacebankSeedUpdateToPhotos(prev, payload);
      });
      setLightboxPhoto((prev) => applyFacebankSeedUpdateToLightbox(prev, payload));
      if (payload.facebankSeed && matchedPhoto) {
        triggerPreviewAutoCropRebuild(matchedPhoto, "facebank_seed_auto_crop");
      }
    },
    [triggerPreviewAutoCropRebuild]
  );

  const handleRefreshLightboxPhotoMetadata = useCallback(
    async (photo: TrrPersonPhoto) => {
      await runPhotoPipelineSteps(photo, ["sync", "count", "id_text"], {
        allowPartialFailures: true,
        runLabel: "image_pipeline",
      });
      await runPhotoAutoCropStage(photo, {
        allowPartialFailures: true,
        successNotice: "Photo full pipeline refreshed.",
        runLabel: "image_pipeline_auto_crop",
        skipCountStep: true,
      });
    },
    [runPhotoAutoCropStage, runPhotoPipelineSteps]
  );

  const handleRefreshAutoThumbnailCrop = useCallback(
    async (photo: TrrPersonPhoto) => {
      await runPhotoAutoCropStage(photo, {
        allowPartialFailures: false,
        successNotice: "Auto thumbnail crop refreshed.",
        runLabel: "auto_crop_refresh",
      });
    },
    [runPhotoAutoCropStage]
  );

  const handleLightboxSyncStage = useCallback(
    async (photo: TrrPersonPhoto) =>
      runPhotoPipelineSteps(photo, ["sync"], {
        successNotice: "Image sync complete.",
        runLabel: "image_sync",
      }),
    [runPhotoPipelineSteps]
  );

  const handleLightboxCountStage = useCallback(
    async (photo: TrrPersonPhoto) =>
      runPhotoPipelineSteps(photo, ["count"], {
        successNotice: "Image count complete.",
        runLabel: "image_count",
      }),
    [runPhotoPipelineSteps]
  );

  const handleLightboxCropStage = useCallback(
    async (photo: TrrPersonPhoto) =>
      runPhotoPipelineSteps(photo, ["crop"], {
        successNotice: "Image crop complete.",
        runLabel: "image_crop",
      }),
    [runPhotoPipelineSteps]
  );

  const handleLightboxIdTextStage = useCallback(
    async (photo: TrrPersonPhoto) =>
      runPhotoPipelineSteps(photo, ["id_text"], {
        successNotice: "Image text detection complete.",
        runLabel: "image_id_text",
      }),
    [runPhotoPipelineSteps]
  );

  const handleLightboxResizeStage = useCallback(
    async (photo: TrrPersonPhoto) =>
      runPhotoAutoCropStage(photo, {
        successNotice: "Image auto-crop complete.",
        runLabel: "image_auto_crop",
      }),
    [runPhotoAutoCropStage]
  );

  const handleThumbnailCropUpdated = useCallback(
    (payload: {
      origin: "cast_photos" | "media_links";
      photoId: string;
      linkId: string | null;
      thumbnailFocusX: number | null;
      thumbnailFocusY: number | null;
      thumbnailZoom: number | null;
      thumbnailCropMode: "manual" | "auto" | null;
    }) => {
      setPhotos((prev) => applyThumbnailCropUpdateToPhotos(prev, payload));
      setLightboxPhoto((prev) => applyThumbnailCropUpdateToLightbox(prev, payload));
    },
    []
  );

  const handleRefreshImages = useCallback(async (mode: "full" | "sync" = "full") => {
    if (!personId) return;
    if (refreshingImages || reprocessingImages) return;
    const requestId = buildPersonRefreshRequestId();
    const refreshBody =
      mode === "sync"
        ? {
            skip_mirror: false,
            force_mirror: false,
            limit_per_source: 200,
            enforce_show_source_policy: false,
            skip_auto_count: true,
            skip_word_detection: true,
            skip_centering: true,
            skip_resize: true,
            skip_prune: true,
            show_id: showIdForApi ?? undefined,
            show_name: activeShowName ?? undefined,
          }
        : {
            skip_mirror: false,
            force_mirror: false,
            limit_per_source: 200,
            enforce_show_source_policy: false,
            show_id: showIdForApi ?? undefined,
            show_name: activeShowName ?? undefined,
          };

    setRefreshingImages(true);
    setRefreshProgress({
      phase: PERSON_REFRESH_PHASES.syncing,
      message: mode === "sync" ? "Running sync stage..." : "Syncing person images...",
      detailMessage: mode === "sync" ? "Running sync stage..." : "Syncing person images...",
      current: null,
      total: null,
      rawStage: "syncing",
      runId: requestId,
      lastEventAt: Date.now(),
    });
    setRefreshNotice(null);
    setRefreshError(null);
    setRefreshLiveCounts(null);
    setPhotosError(null);
    appendRefreshLog({
      source: "page_refresh",
      stage: "syncing",
      message: mode === "sync" ? "Sync stage started" : "Refresh Images started",
      level: "info",
      runId: requestId,
    });

    try {
      const runStreamAttempt = async () => {
        const syncProgressTracker = createSyncProgressTracker();
        const headers = await getAuthHeaders();
        const streamController = new AbortController();
        let streamAbortReason: "max_duration" | "idle" | "start_deadline" | null = null;
        let sawFirstEvent = false;
        const streamTimeout = setTimeout(
          () => {
            streamAbortReason = "max_duration";
            streamController.abort();
          },
          PERSON_PAGE_STREAM_MAX_DURATION_MS
        );
        let streamStartTimeout: ReturnType<typeof setTimeout> | null = setTimeout(
          () => {
            if (!sawFirstEvent) {
              streamAbortReason = "start_deadline";
              streamController.abort();
            }
          },
          PERSON_PAGE_STREAM_START_DEADLINE_MS
        );
        let streamIdleTimeout: ReturnType<typeof setTimeout> | null = null;
        const bumpStreamIdleTimeout = () => {
          if (streamIdleTimeout) clearTimeout(streamIdleTimeout);
          streamIdleTimeout = setTimeout(
            () => {
              streamAbortReason = "idle";
              streamController.abort();
            },
            PERSON_PAGE_STREAM_IDLE_TIMEOUT_MS
          );
        };
        const clearStreamIdleTimeout = () => {
          if (streamIdleTimeout) clearTimeout(streamIdleTimeout);
          streamIdleTimeout = null;
        };
        const clearStreamStartTimeout = () => {
          if (streamStartTimeout) clearTimeout(streamStartTimeout);
          streamStartTimeout = null;
        };
        bumpStreamIdleTimeout();
        let response: Response;
        try {
          response = await fetch(
            `/api/admin/trr-api/people/${personId}/refresh-images/stream`,
            {
              method: "POST",
              headers: {
                ...headers,
                "Content-Type": "application/json",
                "x-trr-request-id": requestId,
              },
              body: JSON.stringify(refreshBody),
              signal: streamController.signal,
            }
          );
        } catch (error) {
          clearStreamIdleTimeout();
          clearTimeout(streamTimeout);
          if (streamAbortReason === "idle") {
            throw createNamedError(
              "StreamTimeoutError",
              `No refresh updates received for ${Math.round(
                PERSON_PAGE_STREAM_IDLE_TIMEOUT_MS / 1000
              )}s.`
            );
          }
          if (streamAbortReason === "max_duration") {
            throw createNamedError(
              "StreamTimeoutError",
              `Refresh stream reached max duration (${Math.round(
                PERSON_PAGE_STREAM_MAX_DURATION_MS / 60000
              )}m).`
            );
          }
          if (streamAbortReason === "start_deadline") {
            throw createNamedError(
              "StreamTimeoutError",
              `No refresh stream events received within ${Math.round(
                PERSON_PAGE_STREAM_START_DEADLINE_MS / 1000
              )}s.`
            );
          }
          if (isAbortError(error) || isSignalAbortedWithoutReasonError(error)) {
            throw createNamedError("StreamAbortError", "Refresh stream request was aborted.");
          }
          throw error;
        }

        if (!response.ok || !response.body) {
          clearStreamIdleTimeout();
          clearTimeout(streamTimeout);
          throw new Error(await parseStreamErrorResponse(response));
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let sawComplete = false;
        let shouldStopReading = false;
        let lastEventAt = Date.now();
        const staleInterval = setInterval(() => {
          const now = Date.now();
          if (now - lastEventAt < 12000) return;
          setRefreshProgress((prev) => {
            if (!prev) return prev;
            const stageLabel = formatPersonRefreshPhaseLabel(prev.rawStage ?? prev.phase) ?? "WORKING";
            return {
              ...prev,
              detailMessage: `Still running: ${stageLabel}`,
              lastEventAt: now,
            };
          });
          lastEventAt = now;
        }, 2000);

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            lastEventAt = Date.now();
            bumpStreamIdleTimeout();
            buffer += decoder.decode(value, { stream: true });
            // Normalize CRLF to LF so "\n\n" boundary splitting works in all runtimes.
            buffer = buffer.replace(/\r\n/g, "\n");

            let boundaryIndex = buffer.indexOf("\n\n");
            while (boundaryIndex !== -1) {
              const rawEvent = buffer.slice(0, boundaryIndex);
              buffer = buffer.slice(boundaryIndex + 2);
              if (!sawFirstEvent && rawEvent.trim().length > 0) {
                sawFirstEvent = true;
                clearStreamStartTimeout();
                appendRefreshLog({
                  source: "page_refresh",
                  stage: "stream_connected",
                  message: "Stream connected.",
                  level: "info",
                  runId: requestId,
                });
              }

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
                const rawStage =
                  typeof (payload as { stage?: unknown }).stage === "string"
                    ? ((payload as { stage: string }).stage)
                    : typeof (payload as { phase?: unknown }).phase === "string"
                      ? ((payload as { phase: string }).phase)
                      : null;
                const mappedPhase = mapPersonRefreshStage(rawStage);
                const message =
                  typeof (payload as { message?: unknown }).message === "string"
                    ? ((payload as { message: string }).message)
                    : null;
                const heartbeat = (payload as { heartbeat?: unknown }).heartbeat === true;
                const elapsedMsRaw = (payload as { elapsed_ms?: unknown }).elapsed_ms;
                const elapsedMs =
                  typeof elapsedMsRaw === "number"
                    ? elapsedMsRaw
                    : typeof elapsedMsRaw === "string"
                      ? Number.parseInt(elapsedMsRaw, 10)
                      : null;
                const runId =
                  typeof (payload as { run_id?: unknown }).run_id === "string"
                    ? ((payload as { run_id: string }).run_id)
                    : null;
                const payloadRequestId =
                  typeof (payload as { request_id?: unknown }).request_id === "string"
                    ? ((payload as { request_id: string }).request_id)
                    : null;
                const resolvedRunId = payloadRequestId ?? runId ?? requestId;
                const currentRaw = (payload as { current?: unknown }).current;
                const totalRaw = (payload as { total?: unknown }).total;
                const current =
                  typeof currentRaw === "number"
                    ? currentRaw
                    : typeof currentRaw === "string"
                      ? Number.parseInt(currentRaw, 10)
                      : null;
                const total =
                  typeof totalRaw === "number"
                    ? totalRaw
                    : typeof totalRaw === "string"
                      ? Number.parseInt(totalRaw, 10)
                      : null;
                const numericCurrent =
                  typeof current === "number" && Number.isFinite(current) ? current : null;
                const numericTotal =
                  typeof total === "number" && Number.isFinite(total) ? total : null;
                const syncCounts =
                  !heartbeat && mappedPhase === PERSON_REFRESH_PHASES.syncing
                    ? updateSyncProgressTracker(syncProgressTracker, {
                        rawStage,
                        message,
                        current: numericCurrent,
                        total: numericTotal,
                      })
                    : null;
                const heartbeatMessage =
                  heartbeat && elapsedMs !== null && elapsedMs >= 0
                    ? `Still running${rawStage ? ` (${rawStage})` : ""} · ${Math.round(elapsedMs / 1000)}s elapsed`
                    : heartbeat
                      ? `Still running${rawStage ? ` (${rawStage})` : ""}`
                      : null;
                const nextLiveCounts = resolveJobLiveCounts(refreshLiveCounts, payload);
                setRefreshLiveCounts(nextLiveCounts);
                const enrichedMessage = appendLiveCountsToMessage(
                  message ?? heartbeatMessage ?? "",
                  nextLiveCounts
                );
                setRefreshProgress({
                  current: syncCounts?.current ?? numericCurrent,
                  total: syncCounts?.total ?? numericTotal,
                  phase: mappedPhase ?? rawStage,
                  rawStage,
                  message: enrichedMessage || message || heartbeatMessage || null,
                  detailMessage: enrichedMessage || message || heartbeatMessage || null,
                  runId: resolvedRunId,
                  lastEventAt: Date.now(),
                });
                if (!heartbeat) {
                  appendRefreshLog({
                    source: "page_refresh",
                    stage: rawStage ?? "progress",
                    message: enrichedMessage || "Refresh progress update",
                    level: "info",
                    runId: resolvedRunId,
                  });
                }
              } else if (eventType === "complete") {
                sawComplete = true;
                const payloadRequestId =
                  payload && typeof payload === "object" && typeof payload.request_id === "string"
                    ? payload.request_id
                    : requestId;
                const completeLiveCounts = resolveJobLiveCounts(refreshLiveCounts, payload);
                setRefreshLiveCounts(completeLiveCounts);
                const summary = payload && typeof payload === "object" && "summary" in payload
                  ? (payload as { summary?: unknown }).summary
                  : payload;
                const summaryText = formatPersonRefreshSummary(summary);
                const liveCountSuffix = formatJobLiveCounts(completeLiveCounts);
                setRefreshNotice(
                  summaryText
                    ? `${summaryText}${liveCountSuffix ? `. ${liveCountSuffix}` : ""}`
                    : liveCountSuffix
                      ? `Images refreshed. ${liveCountSuffix}`
                      : "Images refreshed."
                );
                appendRefreshLog({
                  source: "page_refresh",
                  stage: "complete",
                  message: summaryText || "Images refreshed.",
                  detail: liveCountSuffix,
                  level: "success",
                  runId: payloadRequestId,
                });
                shouldStopReading = true;
              } else if (eventType === "error") {
                const errorPayload =
                  payload && typeof payload === "object"
                    ? (payload as { stage?: string; error?: string; detail?: string; request_id?: string })
                    : null;
                const stage = errorPayload?.stage ? `[${errorPayload.stage}] ` : "";
                const payloadRequestId =
                  typeof errorPayload?.request_id === "string" ? errorPayload.request_id : requestId;
                const errorText =
                  errorPayload?.error && errorPayload?.detail
                    ? `${stage}${errorPayload.error}: ${errorPayload.detail}`
                    : `${stage}${errorPayload?.error || "Failed to refresh images"}`;
                // Mark as a backend error so the retry loop does NOT retry.
                const backendErr = new Error(errorText);
                backendErr.name = "BackendError";
                appendRefreshLog({
                  source: "page_refresh",
                  stage: errorPayload?.stage ?? "error",
                  message: errorPayload?.error || "Failed to refresh images",
                  detail: errorPayload?.detail,
                  level: "error",
                  runId: payloadRequestId,
                });
                throw backendErr;
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
        } catch (error) {
          if (streamAbortReason === "idle") {
            throw createNamedError(
              "StreamTimeoutError",
              `No refresh updates received for ${Math.round(
                PERSON_PAGE_STREAM_IDLE_TIMEOUT_MS / 1000
              )}s.`
            );
          }
          if (streamAbortReason === "max_duration") {
            throw createNamedError(
              "StreamTimeoutError",
              `Refresh stream reached max duration (${Math.round(
                PERSON_PAGE_STREAM_MAX_DURATION_MS / 60000
              )}m).`
            );
          }
          if (streamAbortReason === "start_deadline") {
            throw createNamedError(
              "StreamTimeoutError",
              `No refresh stream events received within ${Math.round(
                PERSON_PAGE_STREAM_START_DEADLINE_MS / 1000
              )}s.`
            );
          }
          if (isAbortError(error) || isSignalAbortedWithoutReasonError(error)) {
            throw createNamedError("StreamAbortError", "Refresh stream request was aborted.");
          }
          throw error;
        } finally {
          clearInterval(staleInterval);
          clearStreamIdleTimeout();
          clearStreamStartTimeout();
          clearTimeout(streamTimeout);
          if (shouldStopReading) {
            try {
              await reader.cancel();
            } catch {
              // no-op
            }
          }
        }

        if (!sawComplete) {
          throw new Error("Refresh stream ended before completion.");
        }
      };

      let streamError: string | null = null;
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          await runStreamAttempt();
          if (attempt > 1) {
            appendRefreshLog({
              source: "page_refresh",
              stage: "stream_recovered",
              message: "Stream recovered.",
              level: "success",
              runId: requestId,
            });
          }
          streamError = null;
          break;
        } catch (streamErr) {
          // Only retry on stream-drop conditions (EOF before complete,
          // network read errors). Explicit backend errors (auth, config,
          // validation) should surface immediately without a retry to
          // avoid duplicate refresh jobs.
          const isBackendError =
            streamErr instanceof Error && streamErr.name === "BackendError";
          const isLocalTimeoutOrAbort =
            streamErr instanceof Error &&
            (streamErr.name === "StreamTimeoutError" || streamErr.name === "StreamAbortError");
          streamError = streamErr instanceof Error ? streamErr.message : String(streamErr);
          if (isBackendError || isLocalTimeoutOrAbort || attempt >= 2) {
            break;
          }
          setRefreshProgress((prev) =>
            prev
              ? {
                  ...prev,
                  detailMessage: `Stream disconnected, retrying... (${streamError})`,
                  lastEventAt: Date.now(),
                }
              : prev
          );
          appendRefreshLog({
            source: "page_refresh",
            stage: "stream_retry",
            message: "Stream disconnected, retrying refresh...",
            detail: streamError,
            level: "error",
            runId: requestId,
          });
          continue;
        }
      }
      if (streamError) {
        throw new Error(streamError);
      }

      await Promise.all([
        fetchPerson(),
        fetchCredits(),
        fetchFandomData(),
        fetchBravoVideos(),
        loadUnifiedNews({ force: true }),
        fetchPhotos(),
        fetchCoverPhoto(),
      ]);
    } catch (err) {
      console.error("Failed to refresh images:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to refresh images";
      setRefreshError(errorMessage);
      appendRefreshLog({
        source: "page_refresh",
        stage: "refresh_error",
        message: "Refresh Images failed",
        detail: errorMessage,
        level: "error",
        runId: requestId,
      });
    } finally {
      setRefreshingImages(false);
      setRefreshProgress(null);
      setRefreshLiveCounts(null);
    }
  }, [
    refreshingImages,
    reprocessingImages,
    appendRefreshLog,
    fetchPerson,
    fetchCredits,
    fetchFandomData,
    fetchBravoVideos,
    loadUnifiedNews,
    fetchPhotos,
    fetchCoverPhoto,
    getAuthHeaders,
    personId,
    refreshLiveCounts,
    showIdForApi,
    activeShowName,
    buildPersonRefreshRequestId,
  ]);

  const handleReprocessImages = useCallback(async (stage: ReprocessStageKey = "all") => {
    if (!personId) return;
    if (refreshingImages || reprocessingImages) return;
    const requestId = buildPersonRefreshRequestId();
    const stageRequest: Record<
      ReprocessStageKey,
      {
        body: {
          run_count: boolean;
          run_id_text: boolean;
          run_crop: boolean;
          run_resize: boolean;
        };
        startLabel: string;
        startMessage: string;
        defaultSuccessMessage: string;
        failureLabel: string;
      }
    > = {
      all: {
        body: { run_count: true, run_id_text: true, run_crop: true, run_resize: true },
        startLabel: "Count & Crop started",
        startMessage: "Reprocessing existing images...",
        defaultSuccessMessage: "Reprocessing complete.",
        failureLabel: "Count & Crop failed",
      },
      count: {
        body: { run_count: true, run_id_text: false, run_crop: false, run_resize: false },
        startLabel: "Count stage started",
        startMessage: "Reprocessing count stage...",
        defaultSuccessMessage: "Count stage complete.",
        failureLabel: "Count stage failed",
      },
      crop: {
        body: { run_count: false, run_id_text: false, run_crop: true, run_resize: false },
        startLabel: "Crop stage started",
        startMessage: "Reprocessing crop stage...",
        defaultSuccessMessage: "Crop stage complete.",
        failureLabel: "Crop stage failed",
      },
      id_text: {
        body: { run_count: false, run_id_text: true, run_crop: false, run_resize: false },
        startLabel: "ID Text stage started",
        startMessage: "Reprocessing text-detection stage...",
        defaultSuccessMessage: "ID Text stage complete.",
        failureLabel: "ID Text stage failed",
      },
      resize: {
        body: { run_count: false, run_id_text: false, run_crop: false, run_resize: true },
        startLabel: "Auto-Crop stage started",
        startMessage: "Reprocessing resize/auto-crop stage...",
        defaultSuccessMessage: "Auto-Crop stage complete.",
        failureLabel: "Auto-Crop stage failed",
      },
    };
    const selectedStage = stageRequest[stage];

    setReprocessingImages(true);
    setRefreshLiveCounts(null);
    setRefreshProgress({
      phase: PERSON_REFRESH_PHASES.counting,
      message: selectedStage.startMessage,
      current: null,
      total: null,
      runId: requestId,
      rawStage: "reprocess_start",
      lastEventAt: Date.now(),
    });
    setRefreshNotice(null);
    setRefreshError(null);
    appendRefreshLog({
      source: "page_refresh",
      stage: "reprocess_start",
      message: selectedStage.startLabel,
      level: "info",
      runId: requestId,
    });

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/people/${personId}/reprocess-images/stream`,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
            "x-trr-request-id": requestId,
          },
          body: JSON.stringify(selectedStage.body),
        }
      );

      if (!response.ok || !response.body) {
        throw new Error(await parseStreamErrorResponse(response));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let hadError = false;
      let sawComplete = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
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
            const rawPhase =
              typeof (payload as { stage?: unknown }).stage === "string"
                ? ((payload as { stage: string }).stage)
                : null;
            const mappedPhase = mapPersonRefreshStage(rawPhase);
            const message =
              typeof (payload as { message?: unknown }).message === "string"
                ? ((payload as { message: string }).message)
                : null;
            const currentRaw = (payload as { current?: unknown }).current;
            const totalRaw = (payload as { total?: unknown }).total;
            const current =
              typeof currentRaw === "number"
                ? currentRaw
                : typeof currentRaw === "string"
                  ? Number.parseInt(currentRaw, 10)
                  : null;
            const total =
              typeof totalRaw === "number"
                ? totalRaw
                : typeof totalRaw === "string"
                  ? Number.parseInt(totalRaw, 10)
                  : null;
            const numericCurrent =
              typeof current === "number" && Number.isFinite(current) ? current : null;
            const numericTotal =
              typeof total === "number" && Number.isFinite(total) ? total : null;
            const runId =
              typeof (payload as { run_id?: unknown }).run_id === "string"
                ? ((payload as { run_id: string }).run_id)
                : null;
            const payloadRequestId =
              typeof (payload as { request_id?: unknown }).request_id === "string"
                ? ((payload as { request_id: string }).request_id)
                : null;
            const resolvedRunId = payloadRequestId ?? runId ?? requestId;
            const nextLiveCounts = resolveJobLiveCounts(refreshLiveCounts, payload);
            setRefreshLiveCounts(nextLiveCounts);
            const enrichedMessage = appendLiveCountsToMessage(message ?? "", nextLiveCounts);
            setRefreshProgress({
              current: numericCurrent,
              total: numericTotal,
              phase: mappedPhase ?? rawPhase,
              message: enrichedMessage || message || null,
              runId: resolvedRunId,
              rawStage: rawPhase,
              lastEventAt: Date.now(),
            });
            appendRefreshLog({
              source: "page_refresh",
              stage: rawPhase ?? "reprocess_progress",
              message: enrichedMessage || message || "Count & Crop progress update",
              level: "info",
              runId: resolvedRunId,
            });
          } else if (eventType === "complete") {
            sawComplete = true;
            const payloadRequestId =
              payload && typeof payload === "object" && typeof payload.request_id === "string"
                ? payload.request_id
                : requestId;
            const completeLiveCounts = resolveJobLiveCounts(refreshLiveCounts, payload);
            setRefreshLiveCounts(completeLiveCounts);
            const summary = payload && typeof payload === "object" && "summary" in payload
              ? (payload as { summary?: unknown }).summary
              : payload;
            const summaryText = formatPersonRefreshSummary(summary);
            const liveCountSuffix = formatJobLiveCounts(completeLiveCounts);
            setRefreshNotice(
              summaryText
                ? `${summaryText}${liveCountSuffix ? `. ${liveCountSuffix}` : ""}`
                : liveCountSuffix
                  ? `Reprocessing complete. ${liveCountSuffix}`
                  : "Reprocessing complete."
            );
            appendRefreshLog({
              source: "page_refresh",
              stage: "reprocess_complete",
              message: summaryText || "Reprocessing complete.",
              detail: liveCountSuffix,
              level: "success",
              runId: payloadRequestId,
            });
          } else if (eventType === "error") {
            hadError = true;
            const message =
              payload && typeof payload === "object"
                ? (payload as { error?: string; detail?: string; request_id?: string })
                : null;
            const payloadRequestId =
              typeof message?.request_id === "string" ? message.request_id : requestId;
            const errorText =
              message?.error && message?.detail
                ? `${message.error}: ${message.detail}`
                : message?.error || "Failed to reprocess images";
            setRefreshError(errorText);
            appendRefreshLog({
              source: "page_refresh",
              stage: "reprocess_error",
              message: message?.error || "Failed to reprocess images",
              detail: message?.detail,
              level: "error",
              runId: payloadRequestId,
            });
          }

          boundaryIndex = buffer.indexOf("\n\n");
        }
      }

      if (!sawComplete && !hadError) {
        setRefreshNotice(selectedStage.defaultSuccessMessage);
        appendRefreshLog({
          source: "page_refresh",
          stage: "reprocess_complete",
          message: selectedStage.defaultSuccessMessage,
          level: "success",
          runId: requestId,
        });
      }

      // Reload photos to show updated crops/counts
      await fetchPhotos();
    } catch (err) {
      console.error("Failed to reprocess images:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to reprocess images";
      setRefreshError(errorMessage);
      appendRefreshLog({
        source: "page_refresh",
        stage: "reprocess_error",
        message: selectedStage.failureLabel,
        detail: errorMessage,
        level: "error",
        runId: requestId,
      });
    } finally {
      setReprocessingImages(false);
      setRefreshProgress(null);
      setRefreshLiveCounts(null);
    }
  }, [
    refreshingImages,
    reprocessingImages,
    appendRefreshLog,
    fetchPhotos,
    getAuthHeaders,
    personId,
    refreshLiveCounts,
    buildPersonRefreshRequestId,
  ]);

  // Initial load
  useEffect(() => {
    if (!hasAccess) return;
    if (!personId) return;
    let cancelled = false;
    const controller = new AbortController();
    const { signal } = controller;

    const loadData = async () => {
      setLoading(true);
      try {
        await fetchPerson({ signal });
        if (signal.aborted) return;
        await Promise.all([
          fetchPhotos({ signal }),
          fetchCredits({ signal }),
          fetchCoverPhoto({ signal }),
        ]);
      } catch (err) {
        if (signal.aborted) return;
        console.error("Failed to load person page data:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadData();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [hasAccess, fetchPerson, fetchPhotos, fetchCredits, fetchCoverPhoto, personId]);

  useEffect(() => {
    if (activeTab !== "videos") return;
    if (!showIdForApi || bravoVideosLoaded) return;
    const controller = new AbortController();
    void fetchBravoVideos({ signal: controller.signal });
    return () => {
      controller.abort();
    };
  }, [activeTab, bravoVideosLoaded, fetchBravoVideos, showIdForApi]);

  useEffect(() => {
    if (!hasAccess || !personId) return;
    if (loading) return;
    const controller = new AbortController();
    void fetchPhotos({ signal: controller.signal, includeBroken: showBrokenRows });
    return () => {
      controller.abort();
    };
  }, [fetchPhotos, hasAccess, loading, personId, showBrokenRows]);

  useEffect(() => {
    if (activeTab !== "news") return;
    if (!showIdForApi || !personId) return;
    const controller = new AbortController();
    void loadUnifiedNews();
    return () => {
      controller.abort();
    };
  }, [activeTab, loadUnifiedNews, personId, showIdForApi]);

  useEffect(() => {
    if (activeTab !== "fandom") return;
    if (!hasAccess || fandomLoaded) return;
    const controller = new AbortController();
    void fetchFandomData({ signal: controller.signal });
    return () => {
      controller.abort();
    };
  }, [activeTab, fandomLoaded, fetchFandomData, hasAccess]);

  const newsSourceOptions = useMemo(
    () => newsFacets.sources,
    [newsFacets.sources]
  );

  const newsPeopleOptions = useMemo(() => {
    const fromFacets = newsFacets.people
      .filter((row) => row.person_id === personId)
      .map((row) => ({ id: row.person_id, name: row.person_name, count: row.count }));
    if (fromFacets.length > 0) {
      return fromFacets;
    }
    if (personId && person?.full_name) {
      return [
        {
          id: personId,
          name: person.full_name,
          count: newsTotalCount > 0 ? newsTotalCount : unifiedNews.length,
        },
      ];
    }
    return [];
  }, [newsFacets.people, newsTotalCount, person?.full_name, personId, unifiedNews.length]);

  const newsTopicOptions = useMemo(
    () => newsFacets.topics.map((topic) => ({ topic: topic.topic, count: topic.count })),
    [newsFacets.topics]
  );

  const newsSeasonOptions = useMemo(
    () =>
      newsFacets.seasons.map((season) => ({
        seasonNumber: season.season_number,
        count: season.count,
      })),
    [newsFacets.seasons]
  );

  // Open lightbox with photo, index, and trigger element for focus restoration
  const openLightbox = (
    photo: TrrPersonPhoto,
    index: number,
    triggerElement: HTMLElement
  ) => {
    lightboxTriggerRef.current = triggerElement;
    setThumbnailCropPreview(buildThumbnailCropPreview(photo));
    setThumbnailCropOverlayUpdate(null);
    setLightboxPhoto({ photo, index });
    setLightboxOpen(true);
  };

  // Navigate between photos in lightbox (uses filteredPhotos)
  const navigateLightbox = (direction: "prev" | "next") => {
    if (!lightboxPhoto) return;
    const newIndex =
      direction === "prev" ? lightboxPhoto.index - 1 : lightboxPhoto.index + 1;
    if (newIndex >= 0 && newIndex < filteredPhotos.length) {
      const nextPhoto = filteredPhotos[newIndex];
      setThumbnailCropPreview(buildThumbnailCropPreview(nextPhoto));
      setThumbnailCropOverlayUpdate(null);
      setLightboxPhoto({ photo: nextPhoto, index: newIndex });
    }
  };

  // Close lightbox and clean up state
  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setLightboxPhoto(null);
    setReassignModalImage(null);
    setThumbnailCropPreview(null);
    setThumbnailCropOverlayUpdate(null);
  }, []);

  const handleReassignCastPhoto = useCallback(
    async (toType: ImageType, toEntityId: string) => {
      if (!reassignModalImage) {
        throw new Error("No image selected for reassignment.");
      }
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/images/cast/${reassignModalImage.imageId}/reassign`,
        {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            toType,
            toEntityId,
            mode: "preserve",
          }),
        }
      );
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to reassign image.");
      }

      setReassignModalImage(null);
      await Promise.all([fetchPhotos(), fetchCoverPhoto()]);

      if (toType === "cast" && toEntityId !== personId) {
        closeLightbox();
      }
      setRefreshError(null);
      setRefreshNotice("Image reassigned.");
    },
    [closeLightbox, fetchCoverPhoto, fetchPhotos, getAuthHeaders, personId, reassignModalImage]
  );

  const handleThumbnailCropOverlayAdjust = useCallback(
    (nextPreview: ThumbnailCropPreview) => {
      if (!lightboxPhoto) return;
      setThumbnailCropPreview(nextPreview);
      setThumbnailCropOverlayUpdate({
        ...nextPreview,
        photoId: lightboxPhoto.photo.id,
        nonce: Date.now(),
      });
    },
    [lightboxPhoto],
  );

  const archiveGalleryPhoto = useCallback(
    async (photo: TrrPersonPhoto) => {
      const origin = photo.origin === "cast_photos" ? "cast_photos" : "media_assets";
      const assetId =
        photo.origin === "cast_photos" ? photo.id : photo.media_asset_id ?? null;
      if (!assetId) throw new Error("Cannot archive: missing asset id");

      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/trr-api/assets/archive", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ origin, asset_id: assetId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          data?.error && data?.detail
            ? `${data.error}: ${data.detail}`
            : data?.detail || data?.error || "Archive failed";
        throw new Error(message);
      }

      // Hide immediately; backend clears hosted_url as well.
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      closeLightbox();
    },
    [closeLightbox, getAuthHeaders]
  );

  const toggleStarGalleryPhoto = useCallback(
    async (photo: TrrPersonPhoto, starred: boolean) => {
      const origin = photo.origin === "cast_photos" ? "cast_photos" : "media_assets";
      const assetId =
        photo.origin === "cast_photos" ? photo.id : photo.media_asset_id ?? null;
      if (!assetId) throw new Error("Cannot star: missing asset id");

      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/trr-api/assets/star", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ origin, asset_id: assetId, starred }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          data?.error && data?.detail
            ? `${data.error}: ${data.detail}`
            : data?.detail || data?.error || "Star failed";
        throw new Error(message);
      }

      setPhotos((prev) =>
        prev.map((p) => {
          if (p.id !== photo.id) return p;
          const meta =
            p.metadata && typeof p.metadata === "object"
              ? { ...(p.metadata as Record<string, unknown>) }
              : {};
          meta.starred = starred;
          if (starred) meta.starred_at = new Date().toISOString();
          else delete meta.starred_at;
          return { ...p, metadata: meta };
        })
      );

      if (starred) {
        triggerPreviewAutoCropRebuild(photo, "star_auto_crop");
      }
    },
    [getAuthHeaders, triggerPreviewAutoCropRebuild]
  );

  const updateGalleryPhotoContentType = useCallback(
    async (photo: TrrPersonPhoto, contentType: string) => {
      const origin = photo.origin === "cast_photos" ? "cast_photos" : "media_assets";
      const assetId =
        photo.origin === "cast_photos" ? photo.id : photo.media_asset_id ?? null;
      if (!assetId) throw new Error("Cannot update content type: missing asset id");

      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/trr-api/assets/content-type", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ origin, asset_id: assetId, content_type: contentType }),
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
      const nextContextType =
        typeof data.context_type === "string" && data.context_type.trim().length > 0
          ? data.context_type.trim()
          : contentTypeToContextType(normalizedContentType);

      const applyUpdate = (candidate: TrrPersonPhoto): TrrPersonPhoto => {
        const metadata =
          candidate.metadata && typeof candidate.metadata === "object"
            ? { ...(candidate.metadata as Record<string, unknown>) }
            : {};
        metadata.fandom_section_tag = normalizedContentType;
        metadata.content_type = normalizedContentType;
        return {
          ...candidate,
          context_type: nextContextType,
          metadata,
        };
      };

      setPhotos((prev) =>
        prev.map((candidate) =>
          origin === "media_assets"
            ? candidate.media_asset_id === assetId
              ? applyUpdate(candidate)
              : candidate
            : candidate.id === assetId
              ? applyUpdate(candidate)
              : candidate
        )
      );

      setLightboxPhoto((prev) => {
        if (!prev) return prev;
        const matches =
          origin === "media_assets"
            ? prev.photo.media_asset_id === assetId
            : prev.photo.id === assetId;
        if (!matches) return prev;
        return { ...prev, photo: applyUpdate(prev.photo) };
      });
    },
    [getAuthHeaders]
  );

  const bravoProfileImage =
    person?.profile_image_url && typeof person.profile_image_url === "object"
      ? (() => {
          const candidate = (person.profile_image_url as Record<string, unknown>).bravo;
          return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
        })()
      : null;
  // Get primary photo - cover photo first, then Bravo profile fallback, then first hosted photo.
  const primaryPhotoUrl =
    coverPhoto?.photo_url ||
    bravoProfileImage ||
    (photos.length > 0 ? getPersonPhotoCardUrl(photos[0]) : null) ||
    photos.find((p) => p.hosted_url)?.hosted_url;

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

  // Extract external IDs - database uses 'imdb'/'tmdb' keys, not 'imdb_id'/'tmdb_id'
  const rawExternalIds = person?.external_ids as {
    imdb?: string;
    tmdb?: number;
    tvdb?: number;
  } | undefined;
  const externalIds = rawExternalIds ? {
    imdb_id: rawExternalIds.imdb,
    tmdb_id: rawExternalIds.tmdb,
    tvdb_id: rawExternalIds.tvdb,
  } : undefined;

  const canonical = useMemo(() => {
    return {
      birthday: resolveMultiSourceField(person?.birthday, canonicalSourceOrder),
      gender: resolveMultiSourceField(person?.gender, canonicalSourceOrder),
      biography: resolveMultiSourceField(person?.biography, canonicalSourceOrder),
      placeOfBirth: resolveMultiSourceField(person?.place_of_birth, canonicalSourceOrder),
      homepage: resolveMultiSourceField(person?.homepage, canonicalSourceOrder),
      profileImageUrl: resolveMultiSourceField(person?.profile_image_url, canonicalSourceOrder),
    };
  }, [person, canonicalSourceOrder]);

  const { otherShowCastCredits, otherShowCrewCredits } = useMemo(
    () => partitionOtherShowCredits(showScopedCredits?.other_show_credits ?? []),
    [showScopedCredits]
  );
  const otherShowCastGroups = useMemo(
    () => groupCreditsByShow(otherShowCastCredits),
    [otherShowCastCredits]
  );
  const otherShowCrewGroups = useMemo(
    () => groupCreditsByShow(otherShowCrewCredits),
    [otherShowCrewCredits]
  );
  const currentScopedShowName =
    showScopedCredits?.show_name && showScopedCredits.show_name.trim().length > 0
      ? showScopedCredits.show_name.trim()
      : "Unknown Show";
  const breadcrumbShowName =
    showScopedCredits?.show_name && showScopedCredits.show_name.trim().length > 0
      ? showScopedCredits.show_name.trim()
      : recentShowFallback?.label && recentShowFallback.label.trim().length > 0
        ? recentShowFallback.label.trim()
      : showSlugForRouting
        ? humanizeSlug(showSlugForRouting)
        : null;
  const breadcrumbShowHref = backShowTarget
    ? buildShowAdminUrl({ showSlug: backShowTarget })
    : undefined;
  useEffect(() => {
    if (!showSlugForRouting || !breadcrumbShowName) return;
    recordAdminRecentShow({
      slug: showSlugForRouting,
      label: breadcrumbShowName,
    });
  }, [breadcrumbShowName, showSlugForRouting]);

  const breadcrumbPersonHref = (() => {
    const queryString = searchParams.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  })();
  const currentShowCastEpisodeTotal = useMemo(
    () =>
      (showScopedCredits?.cast_groups ?? []).reduce(
        (total, group) => total + group.total_episodes,
        0
      ),
    [showScopedCredits]
  );
  const currentShowCrewEpisodeTotal = useMemo(
    () =>
      (showScopedCredits?.crew_groups ?? []).reduce(
        (total, group) => total + group.total_episodes,
        0
      ),
    [showScopedCredits]
  );
  const currentShowCastNonEpisodicTotal =
    showScopedCredits?.cast_non_episodic.length ?? 0;
  const currentShowCrewNonEpisodicTotal =
    showScopedCredits?.crew_non_episodic.length ?? 0;

  const renderOtherShowCreditSummaryRow = (
    credit: TrrPersonCredit,
    sectionType: "cast" | "crew"
  ) => {
    const roleFallback =
      sectionType === "cast" ? "Unspecified Cast Role" : "Unspecified Crew Role";
    const roleLabel = normalizeRoleLabel(credit.role) || roleFallback;
    const rowClassName =
      "flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 transition hover:bg-zinc-100";
    const content = (
      <>
        <div>
          <p className="font-semibold text-zinc-900">{credit.show_name || "Unknown Show"}</p>
          <p className="text-sm text-zinc-600">{roleLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-600">
            {credit.credit_category}
          </span>
          {!credit.show_id && (
            <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-600">
              IMDb
            </span>
          )}
        </div>
      </>
    );

    if (credit.show_id) {
      const showLinkSlug =
        showIdParam && showIdForApi && credit.show_id === showIdForApi
          ? showIdParam
          : credit.show_id;
      return (
        <Link key={credit.id} href={`/admin/trr-shows/${showLinkSlug}`} className={rowClassName}>
          {content}
        </Link>
      );
    }

    if (credit.external_url) {
      return (
        <a
          key={credit.id}
          href={credit.external_url}
          target="_blank"
          rel="noopener noreferrer"
          className={rowClassName}
        >
          {content}
        </a>
      );
    }

    return (
      <div key={credit.id} className={rowClassName}>
        {content}
      </div>
    );
  };

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Loading person data...</p>
        </div>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">
            {error || "Person not found"}
          </p>
          <Link
            href={backHref as "/admin/trr-shows"}
            className="mt-4 inline-block text-sm text-zinc-600 hover:text-zinc-900"
          >
            {backLabel}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        {/* Header */}
        <AdminGlobalHeader bodyClassName="px-6 py-5">
          <div className="mx-auto max-w-6xl">
            <div className="mb-4">
              <AdminBreadcrumbs
                items={buildPersonBreadcrumb(person.full_name, {
                  personHref: breadcrumbPersonHref,
                  showName: breadcrumbShowName,
                  showHref: breadcrumbShowHref,
                })}
              />
            </div>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {/* Profile Photo */}
              <ProfilePhoto url={primaryPhotoUrl} name={person.full_name} />

              {/* Person Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-zinc-900">
                    {person.full_name}
                  </h1>
                  {/* External links */}
                  <div className="flex items-center gap-2">
                    <TmdbLinkIcon tmdbId={externalIds?.tmdb_id} type="person" />
                    <ImdbLinkIcon imdbId={externalIds?.imdb_id} type="person" />
                  </div>
                </div>
                {person.known_for && (
                  <p className="mt-2 text-sm text-zinc-600">
                    Known for: {person.known_for}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                    {photos.length} photos
                  </span>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                    {credits.length} credits
                  </span>
                  <button
                    type="button"
                    onClick={() => setRefreshLogOpen((prev) => !prev)}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
                  >
                    Refresh Log ({refreshLogEntries.length})
                  </button>
                </div>
                {refreshLogOpen && (
                  <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                        Refresh Activity
                      </p>
                      <button
                        type="button"
                        onClick={() => setRefreshLogEntries([])}
                        className="text-xs font-semibold text-zinc-500 hover:text-zinc-800"
                      >
                        Clear
                      </button>
                    </div>
                    {refreshLogEntries.length === 0 ? (
                      <p className="text-xs text-zinc-500">No refresh events yet.</p>
                    ) : (
                      <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                        {refreshLogEntries.map((entry) => {
                          const levelClass =
                            entry.level === "error"
                              ? "text-red-700"
                              : entry.level === "success"
                                ? "text-emerald-700"
                                : "text-zinc-700";
                          const timestamp = new Date(entry.ts).toLocaleTimeString();
                          return (
                            <div
                              key={entry.id}
                              className="rounded-md border border-zinc-200 bg-white px-2 py-1.5"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-xs font-semibold ${levelClass}`}>
                                  {entry.runId ? `[req:${entry.runId}] ${entry.message}` : entry.message}
                                </p>
                                <span className="shrink-0 text-[10px] text-zinc-500">{timestamp}</span>
                              </div>
                              <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                                {entry.stage} · {entry.source === "image_refresh" ? "Image" : "Page"}
                              </p>
                              {entry.detail && (
                                <p className="mt-0.5 text-[11px] text-zinc-600">{entry.detail}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                {photosError && (
                  <div className="mt-2">
                    <p className="text-xs text-red-600">{photosError}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </AdminGlobalHeader>

        {/* Tabs */}
        <div className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-6xl px-6">
            <nav className="flex gap-6">
              {(
                [
                  { id: "overview", label: "Overview" },
                  { id: "gallery", label: `Gallery (${photos.length})` },
                  { id: "videos", label: `Videos (${bravoVideos.length})` },
                  { id: "news", label: `News (${unifiedNews.length})` },
                  { id: "credits", label: `Credits (${credits.length})` },
                  { id: "fandom", label: fandomData.length > 0 ? `Fandom (${fandomData.length})` : "Fandom" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTab(tab.id)}
                  className={`border-b-2 py-4 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? "border-zinc-900 text-zinc-900"
                      : "border-transparent text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <main className="mx-auto max-w-6xl px-6 py-8">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* External IDs */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-zinc-900">
                  External IDs
                </h3>
                <ExternalLinks
                  externalIds={person.external_ids}
                  type="person"
                  className="bg-zinc-50 rounded-lg p-4"
                />
                {Object.keys(person.external_ids || {}).length === 0 && (
                  <p className="text-sm text-zinc-500">No external IDs available.</p>
                )}
              </div>

              {/* Recent Photos Preview */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-zinc-900">Photos</h3>
                  {photos.length > 6 && (
                    <button
                      onClick={() => setTab("gallery")}
                      className="text-sm font-semibold text-zinc-600 hover:text-zinc-900"
                    >
                      View all →
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {photos.slice(0, 6).map((photo, index) => (
                    <button
                      key={photo.id}
                      onClick={(e) => openLightbox(photo, index, e.currentTarget)}
                      className="relative aspect-[4/5] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      <GalleryPhoto
                        photo={photo}
                        onClick={() => {}}
                        onFallbackEvent={trackGalleryFallbackEvent}
                      />
                    </button>
                  ))}
                </div>
                {photos.length === 0 && (
                  <p className="text-sm text-zinc-500">No photos available.</p>
                )}
              </div>

              {/* Canonical Profile (multi-source fields on core.people) */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <h3 className="text-lg font-bold text-zinc-900">Canonical Profile</h3>
                  <div className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-4 lg:max-w-md">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Source priority
                    </p>
                    <div className="mt-3 space-y-2">
                      {canonicalSourceOrder.map((source, index) => (
                        <div
                          key={source}
                          className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2"
                        >
                          <span className="text-sm text-zinc-800">
                            {index + 1}. {formatCanonicalSourceLabel(source)}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveCanonicalSource(source, "up")}
                              disabled={index === 0 || canonicalSourceOrderSaving}
                              className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Up
                            </button>
                            <button
                              type="button"
                              onClick={() => moveCanonicalSource(source, "down")}
                              disabled={index === canonicalSourceOrder.length - 1 || canonicalSourceOrderSaving}
                              className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Down
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={saveCanonicalSourceOrder}
                        disabled={!canonicalSourceOrderDirty || canonicalSourceOrderSaving}
                        className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {canonicalSourceOrderSaving ? "Saving..." : "Save Order"}
                      </button>
                      <button
                        type="button"
                        onClick={resetCanonicalSourceOrder}
                        disabled={!canonicalSourceOrderDirty || canonicalSourceOrderSaving}
                        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Reset
                      </button>
                    </div>
                    {canonicalSourceOrderError && (
                      <p className="mt-2 text-xs text-red-600">{canonicalSourceOrderError}</p>
                    )}
                    {!canonicalSourceOrderError && canonicalSourceOrderNotice && (
                      <p className="mt-2 text-xs text-emerald-700">{canonicalSourceOrderNotice}</p>
                    )}
                  </div>
                </div>

                {(() => {
                  const rows: Array<{ label: string; field: ResolvedField; isLink: boolean }> = [
                    { label: "Birthday", field: canonical.birthday, isLink: false },
                    { label: "Gender", field: canonical.gender, isLink: false },
                    { label: "Place of Birth", field: canonical.placeOfBirth, isLink: false },
                    { label: "Homepage", field: canonical.homepage, isLink: true },
                    { label: "Profile Image URL", field: canonical.profileImageUrl, isLink: true },
                  ];

                  const hasAny =
                    rows.some((r) => Boolean(r.field.value)) ||
                    Boolean(canonical.biography.value);

                  if (!hasAny) {
                    return (
                      <p className="text-sm text-zinc-500">
                        No canonical fields available yet.
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        {rows.map(({ label, field, isLink }) => (
                          <div
                            key={label}
                            className="rounded-xl border border-zinc-100 bg-zinc-50 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                                  {label}
                                </p>
                                {field.value ? (
                                  isLink ? (
                                    <a
                                      href={field.value}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-1 block break-words text-sm font-medium text-blue-700 hover:text-blue-900"
                                    >
                                      {field.value}
                                    </a>
                                  ) : (
                                    <p className="mt-1 break-words text-sm text-zinc-900">
                                      {field.value}
                                    </p>
                                  )
                                ) : (
                                  <p className="mt-1 text-sm text-zinc-500">—</p>
                                )}
                              </div>
                              {field.source && (
                                <span className="flex-shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-600">
                                  {field.source}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {canonical.biography.value && (
                        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                              Biography
                            </p>
                            {canonical.biography.source && (
                              <span className="flex-shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-600">
                                {canonical.biography.source}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap">
                            {canonical.biography.value}
                          </p>
                        </div>
                      )}

                      <details className="rounded-xl border border-zinc-200 bg-white p-4">
                        <summary className="cursor-pointer text-sm font-semibold text-zinc-700">
                          Raw Sources
                        </summary>
                        <pre className="mt-3 overflow-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-100">
                          {JSON.stringify(
                            {
                              birthday: person.birthday ?? {},
                              gender: person.gender ?? {},
                              biography: person.biography ?? {},
                              place_of_birth: person.place_of_birth ?? {},
                              homepage: person.homepage ?? {},
                              profile_image_url: person.profile_image_url ?? {},
                            },
                            null,
                            2
                          )}
                        </pre>
                      </details>
                    </div>
                  );
                })()}
              </div>

              {/* Credits Preview */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-zinc-900">Show Credits</h3>
                  {credits.length > 5 && (
                    <button
                      onClick={() => setTab("credits")}
                      className="text-sm font-semibold text-zinc-600 hover:text-zinc-900"
                    >
                      View all →
                    </button>
                  )}
                </div>
                {creditsError && <p className="mb-3 text-sm text-red-600">{creditsError}</p>}
                <div className="space-y-2">
                  {credits.slice(0, 5).map((credit) => {
                    const rowClassName =
                      "flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 transition hover:bg-zinc-100";
                    const content = (
                      <>
                        <div>
                          <p className="font-semibold text-zinc-900">
                            {credit.show_name || "Unknown Show"}
                          </p>
                          {credit.role && (
                            <p className="text-sm text-zinc-600">{credit.role}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-600">
                            {credit.credit_category}
                          </span>
                          {!credit.show_id && (
                            <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-600">
                              IMDb
                            </span>
                          )}
                        </div>
                      </>
                    );
                    if (credit.show_id) {
                      const showLinkSlug =
                        showIdParam && showIdForApi && credit.show_id === showIdForApi
                          ? showIdParam
                          : credit.show_id;
                      return (
                        <Link
                          key={credit.id}
                          href={`/admin/trr-shows/${showLinkSlug}`}
                          className={rowClassName}
                        >
                          {content}
                        </Link>
                      );
                    }
                    if (credit.external_url) {
                      return (
                        <a
                          key={credit.id}
                          href={credit.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={rowClassName}
                        >
                          {content}
                        </a>
                      );
                    }
                    return (
                      <div key={credit.id} className={rowClassName}>
                        {content}
                      </div>
                    );
                  })}
                </div>
                {credits.length === 0 && (
                  <p className="text-sm text-zinc-500">No credits available.</p>
                )}
              </div>

              {/* Fandom Preview */}
              {fandomData.length > 0 && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-zinc-900">Fandom Info</h3>
                    <button
                      onClick={() => setTab("fandom")}
                      className="text-sm font-semibold text-zinc-600 hover:text-zinc-900"
                    >
                      View all →
                    </button>
                  </div>
                  {fandomData[0]?.summary && (
                    <p className="text-sm text-zinc-600 mb-4 line-clamp-3">
                      {fandomData[0].summary}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {fandomData[0]?.resides_in && (
                      <div>
                        <span className="text-zinc-500">Lives in:</span>{" "}
                        <span className="text-zinc-900">{fandomData[0].resides_in}</span>
                      </div>
                    )}
                    {fandomData[0]?.birthdate_display && (
                      <div>
                        <span className="text-zinc-500">Birthday:</span>{" "}
                        <span className="text-zinc-900">{fandomData[0].birthdate_display}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {fandomError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm lg:col-span-2">
                  <p className="text-sm text-red-700">{fandomError}</p>
                </div>
              )}
            </div>
          )}

          {/* Gallery Tab */}
          {activeTab === "gallery" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Photo Gallery
                  </p>
                  <h3 className="text-xl font-bold text-zinc-900">
                    {person.full_name}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => void handleRefreshImages()}
                    disabled={refreshingImages || reprocessingImages}
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M20 8a8 8 0 00-14-4M4 16a8 8 0 0014 4" />
                    </svg>
                    {refreshingImages ? "Refreshing..." : "Refresh Images"}
                  </button>
                    <button
                      onClick={() => void handleReprocessImages()}
                      disabled={refreshingImages || reprocessingImages}
                      className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                    >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {reprocessingImages ? "Processing..." : "Count & Crop"}
                  </button>
                  <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1">
                    <span className="px-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
                      Stages
                    </span>
                    <button
                      onClick={() => void handleRefreshImages("sync")}
                      disabled={refreshingImages || reprocessingImages}
                      title="Sync source + mirror stages."
                      className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                    >
                      Sync
                    </button>
                    <button
                      onClick={() => void handleReprocessImages("count")}
                      disabled={refreshingImages || reprocessingImages}
                      title="Run count stage for existing images."
                      className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                    >
                      Count
                    </button>
                    <button
                      onClick={() => void handleReprocessImages("crop")}
                      disabled={refreshingImages || reprocessingImages}
                      title="Run crop stage for existing images."
                      className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                    >
                      Crop
                    </button>
                    <button
                      onClick={() => void handleReprocessImages("id_text")}
                      disabled={refreshingImages || reprocessingImages}
                      title="Run ID Text stage for existing images."
                      className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                    >
                      ID Text
                    </button>
                    <button
                      onClick={() => void handleReprocessImages("resize")}
                      disabled={refreshingImages || reprocessingImages}
                      title="Run Auto-Crop (resize variants) stage for existing images."
                      className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                    >
                      Auto-Crop
                    </button>
                  </div>
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
                    onClick={() => setShowBrokenRows((prev) => !prev)}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                      showBrokenRows
                        ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {showBrokenRows ? "Hide Broken" : "Show Broken"}
                  </button>
                  <button
                    onClick={() => setScrapeDrawerOpen(true)}
                    className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Import Images
                  </button>
                </div>
              </div>
              <div className="mb-4 space-y-2">
                <RefreshProgressBar
                  show={refreshingImages || reprocessingImages}
                  phase={refreshProgress?.phase}
                  message={refreshProgress?.detailMessage ?? refreshProgress?.message}
                  current={refreshProgress?.current}
                  total={refreshProgress?.total}
                />
                {refreshError && (
                  <p className="text-xs text-red-600">{refreshError}</p>
                )}
                {refreshNotice && !refreshError && (
                  <p className="text-xs text-zinc-500">{refreshNotice}</p>
                )}
              </div>

              {showIdParam && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Media View
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setGalleryShowFilter("this-show")}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        galleryShowFilter === "this-show"
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      {activeShowFilterLabel}
                    </button>
                    {hasWwhlMatches && (
                      <button
                        type="button"
                        onClick={() => setGalleryShowFilter("wwhl")}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          galleryShowFilter === "wwhl"
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        {WWHL_LABEL}
                      </button>
                    )}
                    {hasOtherShowMatches && (
                      <button
                        type="button"
                        onClick={() => setGalleryShowFilter("other-shows")}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          galleryShowFilter === "other-shows"
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        Other Shows
                      </button>
                    )}
                    {hasNonThisShowMatches && (
                      <button
                        type="button"
                        onClick={() => setGalleryShowFilter("all")}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          galleryShowFilter === "all"
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        All Media
                      </button>
                    )}
                  </div>
                  {galleryShowFilter === "other-shows" && hasOtherShowMatches && (
                    <select
                      value={selectedOtherShowKey}
                      onChange={(event) => {
                        setSelectedOtherShowKey(event.target.value);
                        setGalleryShowFilter("other-shows");
                      }}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700"
                    >
                      <option value="all">All Other Shows & Events</option>
                      {otherShowOptions.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.acronym ? `${option.showName} (${option.acronym})` : option.showName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-zinc-500">
                  Showing {filteredPhotos.length} of {photos.length} photos
                </p>
                <p className="text-xs text-zinc-500">
                  Fallback diagnostics: {galleryFallbackTelemetry.fallbackRecoveredCount} recovered,{" "}
                  {galleryFallbackTelemetry.allCandidatesFailedCount} failed,{" "}
                  {galleryFallbackTelemetry.totalImageAttempts} attempted.
                </p>
              </div>

              <div className="space-y-6">
                {gallerySections.profilePictures.length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Profile Pictures</h4>
                    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                      {gallerySections.profilePictures.map((photo) => {
                        const index = filteredPhotoIndexById.get(photo.id) ?? 0;
                        const isCover = coverPhoto?.photo_id === photo.id;
                        return (
                          <div
                            key={photo.id}
                            className="group relative aspect-[4/5] overflow-hidden rounded-lg bg-zinc-200"
                          >
                            <button
                              type="button"
                              onClick={(e) => openLightbox(photo, index, e.currentTarget as HTMLElement)}
                              className="relative h-full w-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                              <GalleryPhoto
                                photo={photo}
                                onClick={() => {}}
                                isCover={isCover}
                                onFallbackEvent={trackGalleryFallbackEvent}
                              />
                            </button>
                            {!isCover && photo.hosted_url && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleSetCover(photo);
                                }}
                                disabled={settingCover}
                                className="absolute bottom-2 right-2 z-20 rounded-lg bg-black/70 px-2 py-1 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100 hover:bg-black disabled:opacity-50"
                              >
                                {settingCover ? "..." : "Set as Cover"}
                              </button>
                            )}
                            <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                              <p className="text-xs text-white truncate">
                                {photo.source}
                                {photo.season && ` • S${photo.season}`}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {gallerySections.otherPhotos.length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Other Photos</h4>
                    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                      {gallerySections.otherPhotos.map((photo) => {
                        const index = filteredPhotoIndexById.get(photo.id) ?? 0;
                        const isCover = coverPhoto?.photo_id === photo.id;
                        return (
                          <div
                            key={photo.id}
                            className="group relative aspect-[4/5] overflow-hidden rounded-lg bg-zinc-200"
                          >
                            <button
                              type="button"
                              onClick={(e) => openLightbox(photo, index, e.currentTarget as HTMLElement)}
                              className="relative h-full w-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                              <GalleryPhoto
                                photo={photo}
                                onClick={() => {}}
                                isCover={isCover}
                                onFallbackEvent={trackGalleryFallbackEvent}
                              />
                            </button>
                            {!isCover && photo.hosted_url && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleSetCover(photo);
                                }}
                                disabled={settingCover}
                                className="absolute bottom-2 right-2 z-20 rounded-lg bg-black/70 px-2 py-1 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100 hover:bg-black disabled:opacity-50"
                              >
                                {settingCover ? "..." : "Set as Cover"}
                              </button>
                            )}
                            <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                              <p className="text-xs text-white truncate">
                                {photo.source}
                                {photo.season && ` • S${photo.season}`}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
              {filteredPhotos.length > photosVisibleCount && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setPhotosVisibleCount((prev) => prev + 120)}
                    className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                  >
                    Load More Photos
                  </button>
                </div>
              )}
              {filteredPhotos.length === 0 && photos.length > 0 && (
                <p className="text-sm text-zinc-500">
                  No photos match the current filter.
                </p>
              )}
              {photos.length === 0 && (
                <p className="text-sm text-zinc-500">
                  No photos available for this person.
                </p>
              )}
            </div>
          )}

          {/* Videos Tab */}
          {activeTab === "videos" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Bravo Videos
                  </p>
                  <h3 className="text-xl font-bold text-zinc-900">{person.full_name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => void fetchBravoVideos({ forceSync: true })}
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
                <p className="text-sm text-zinc-500">No persisted Bravo videos found for this person.</p>
              )}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {bravoVideos.map((video, index) => {
                  const thumbnailUrl = resolveBravoVideoThumbnailUrl(video);
                  return (
                  <article key={`${video.clip_url}-${index}`} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <a href={video.clip_url} target="_blank" rel="noopener noreferrer" className="group block">
                      <div className="relative mb-3 aspect-video overflow-hidden rounded-lg bg-zinc-200">
                        {thumbnailUrl ? (
                          <Image
                            src={thumbnailUrl}
                            alt={video.title || "Bravo video"}
                            fill
                            className="object-cover transition group-hover:scale-105"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
          )}

          {/* News Tab */}
          {activeTab === "news" && (
            <ShowNewsTab
              showName={person.full_name}
              newsSort={newsSort}
              onSetNewsSort={setNewsSort}
              onRefreshNews={() => void loadUnifiedNews({ force: true, forceSync: true })}
              newsLoading={newsLoading}
              newsSyncing={newsSyncing}
              newsSourceFilter={newsSourceFilter}
              onSetNewsSourceFilter={setNewsSourceFilter}
              newsPersonFilter={personId}
              onSetNewsPersonFilter={() => {}}
              newsTopicFilter={newsTopicFilter}
              onSetNewsTopicFilter={setNewsTopicFilter}
              newsSeasonFilter={newsSeasonFilter}
              onSetNewsSeasonFilter={setNewsSeasonFilter}
              onClearFilters={() => {
                setNewsSourceFilter("");
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
                <Image
                  src={src}
                  alt={alt}
                  fill
                  className={className}
                  sizes={sizes}
                />
              )}
            />
          )}

          {/* Credits Tab */}
          {activeTab === "credits" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                  Show Credits
                </p>
                <h3 className="text-xl font-bold text-zinc-900">
                  {person.full_name}
                </h3>
              </div>
              {creditsLoading && (
                <p className="mb-4 text-sm text-zinc-500">Loading credits...</p>
              )}
              {creditsError && <p className="mb-4 text-sm text-red-600">{creditsError}</p>}
              {showScopedCredits ? (
                <div className="space-y-8">
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-semibold text-zinc-900">Cast</h4>
                      <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs text-zinc-600">
                        {showScopedCredits.cast_groups.length} grouped
                      </span>
                    </div>
                    <div className="space-y-3">
                      <details className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-3">
                        <summary className="cursor-pointer list-none">
                          <div className="flex items-center justify-between gap-4">
                            <h5 className="text-sm font-semibold text-zinc-700">{currentScopedShowName}</h5>
                            <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs text-zinc-600">
                              {formatEpisodeAndNonEpisodicLabel(
                                currentShowCastEpisodeTotal,
                                currentShowCastNonEpisodicTotal
                              )}
                            </span>
                          </div>
                        </summary>
                        <div className="mt-3 space-y-2">
                          {showScopedCredits.cast_groups.length === 0 &&
                            showScopedCredits.cast_non_episodic.length === 0 && (
                              <p className="text-sm text-zinc-500">No cast credits for this show yet.</p>
                            )}
                          {showScopedCredits.cast_groups.map((group) => (
                            <article
                              key={`cast-group-${group.credit_id}`}
                              className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3"
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="font-semibold text-zinc-900">
                                    {group.role || "Unspecified Cast Role"}
                                  </p>
                                  <p className="text-xs text-zinc-500">{group.credit_category}</p>
                                </div>
                                <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs text-zinc-600">
                                  {formatEpisodeCountLabel(group.total_episodes)}
                                </span>
                              </div>
                              <div className="mt-3 space-y-2">
                                {group.seasons.map((season) => {
                                  const seasonLabel =
                                    season.season_number === null ? "Unknown" : String(season.season_number);
                                  return (
                                    <details
                                      key={`cast-group-${group.credit_id}-season-${seasonLabel}`}
                                      className="rounded-md border border-zinc-200 bg-white p-3"
                                    >
                                      <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-800">
                                        Season {seasonLabel} • {formatEpisodeCountLabel(season.episode_count)}
                                      </summary>
                                      <div className="mt-2 space-y-1">
                                        {season.episodes.map((episode) => {
                                          const episodeCode = formatEpisodeCode(
                                            season.season_number,
                                            episode.episode_number
                                          );
                                          return (
                                            <div
                                              key={`${group.credit_id}-${episode.episode_id}`}
                                              className="rounded border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
                                            >
                                              {episodeCode
                                                ? `${episodeCode} • ${episode.episode_name || "Untitled Episode"}`
                                                : episode.episode_name || "Untitled Episode"}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </details>
                                  );
                                })}
                              </div>
                            </article>
                          ))}

                          {showScopedCredits.cast_non_episodic.map((credit) => (
                            <div
                              key={`cast-non-episodic-${credit.id}`}
                              className="flex items-center justify-between rounded-lg border border-zinc-200 border-dashed bg-white p-3"
                            >
                              <div>
                                <p className="font-semibold text-zinc-900">
                                  {credit.role || "Unspecified Cast Role"}
                                </p>
                                <p className="text-xs text-zinc-500">
                                  {credit.credit_category} • No episode evidence yet
                                </p>
                              </div>
                              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600">
                                {credit.source_type || "source unknown"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>

                      {otherShowCastGroups.map((showGroup) => (
                        <details
                          key={`other-cast-show-${showGroup.showKey}`}
                          className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-3"
                        >
                          <summary className="cursor-pointer list-none">
                            <div className="flex items-center justify-between gap-4">
                              <h5 className="text-sm font-semibold text-zinc-700">{showGroup.showName}</h5>
                              <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs text-zinc-600">
                                {showGroup.credits.length} credit{showGroup.credits.length === 1 ? "" : "s"}
                              </span>
                            </div>
                          </summary>
                          <div className="mt-3 space-y-2">
                            {showGroup.credits.map((credit) =>
                              renderOtherShowCreditSummaryRow(credit, "cast")
                            )}
                          </div>
                        </details>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-semibold text-zinc-900">Crew</h4>
                      <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs text-zinc-600">
                        {showScopedCredits.crew_groups.length} grouped
                      </span>
                    </div>
                    <div className="space-y-3">
                      <details className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-3">
                        <summary className="cursor-pointer list-none">
                          <div className="flex items-center justify-between gap-4">
                            <h5 className="text-sm font-semibold text-zinc-700">{currentScopedShowName}</h5>
                            <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs text-zinc-600">
                              {formatEpisodeAndNonEpisodicLabel(
                                currentShowCrewEpisodeTotal,
                                currentShowCrewNonEpisodicTotal
                              )}
                            </span>
                          </div>
                        </summary>
                        <div className="mt-3 space-y-2">
                          {showScopedCredits.crew_groups.length === 0 &&
                            showScopedCredits.crew_non_episodic.length === 0 && (
                              <p className="text-sm text-zinc-500">No crew credits for this show yet.</p>
                            )}
                          {showScopedCredits.crew_groups.map((group) => (
                            <article
                              key={`crew-group-${group.credit_id}`}
                              className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3"
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="font-semibold text-zinc-900">
                                    {group.role || "Unspecified Crew Role"}
                                  </p>
                                  <p className="text-xs text-zinc-500">{group.credit_category}</p>
                                </div>
                                <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs text-zinc-600">
                                  {formatEpisodeCountLabel(group.total_episodes)}
                                </span>
                              </div>
                              <div className="mt-3 space-y-2">
                                {group.seasons.map((season) => {
                                  const seasonLabel =
                                    season.season_number === null ? "Unknown" : String(season.season_number);
                                  return (
                                    <details
                                      key={`crew-group-${group.credit_id}-season-${seasonLabel}`}
                                      className="rounded-md border border-zinc-200 bg-white p-3"
                                    >
                                      <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-800">
                                        Season {seasonLabel} • {formatEpisodeCountLabel(season.episode_count)}
                                      </summary>
                                      <div className="mt-2 space-y-1">
                                        {season.episodes.map((episode) => {
                                          const episodeCode = formatEpisodeCode(
                                            season.season_number,
                                            episode.episode_number
                                          );
                                          return (
                                            <div
                                              key={`${group.credit_id}-${episode.episode_id}`}
                                              className="rounded border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
                                            >
                                              {episodeCode
                                                ? `${episodeCode} • ${episode.episode_name || "Untitled Episode"}`
                                                : episode.episode_name || "Untitled Episode"}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </details>
                                  );
                                })}
                              </div>
                            </article>
                          ))}

                          {showScopedCredits.crew_non_episodic.map((credit) => (
                            <div
                              key={`crew-non-episodic-${credit.id}`}
                              className="flex items-center justify-between rounded-lg border border-zinc-200 border-dashed bg-white p-3"
                            >
                              <div>
                                <p className="font-semibold text-zinc-900">
                                  {credit.role || "Unspecified Crew Role"}
                                </p>
                                <p className="text-xs text-zinc-500">
                                  {credit.credit_category} • No episode evidence yet
                                </p>
                              </div>
                              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600">
                                {credit.source_type || "source unknown"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>

                      {otherShowCrewGroups.map((showGroup) => (
                        <details
                          key={`other-crew-show-${showGroup.showKey}`}
                          className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-3"
                        >
                          <summary className="cursor-pointer list-none">
                            <div className="flex items-center justify-between gap-4">
                              <h5 className="text-sm font-semibold text-zinc-700">{showGroup.showName}</h5>
                              <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs text-zinc-600">
                                {showGroup.credits.length} credit{showGroup.credits.length === 1 ? "" : "s"}
                              </span>
                            </div>
                          </summary>
                          <div className="mt-3 space-y-2">
                            {showGroup.credits.map((credit) =>
                              renderOtherShowCreditSummaryRow(credit, "crew")
                            )}
                          </div>
                        </details>
                      ))}
                    </div>
                  </section>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {credits.map((credit) => {
                      const rowClassName =
                        "flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 p-4 transition hover:bg-zinc-100";
                      const content = (
                        <>
                          <div>
                            <p className="font-semibold text-zinc-900">
                              {credit.show_name || "Unknown Show"}
                            </p>
                            {credit.role && (
                              <p className="text-sm text-zinc-600">{credit.role}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600">
                              {credit.credit_category}
                            </span>
                            {!credit.show_id && (
                              <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600">
                                IMDb
                              </span>
                            )}
                            {credit.billing_order && (
                              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                                #{credit.billing_order}
                              </span>
                            )}
                          </div>
                        </>
                      );
                      if (credit.show_id) {
                        const showLinkSlug =
                          showIdParam && showIdForApi && credit.show_id === showIdForApi
                            ? showIdParam
                            : credit.show_id;
                        return (
                          <Link
                            key={credit.id}
                            href={`/admin/trr-shows/${showLinkSlug}`}
                            className={rowClassName}
                          >
                            {content}
                          </Link>
                        );
                      }
                      if (credit.external_url) {
                        return (
                          <a
                            key={credit.id}
                            href={credit.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={rowClassName}
                          >
                            {content}
                          </a>
                        );
                      }
                      return (
                        <div key={credit.id} className={rowClassName}>
                          {content}
                        </div>
                      );
                    })}
                  </div>
                  {credits.length === 0 && (
                    <p className="text-sm text-zinc-500">
                      No credits available for this person.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Fandom Tab */}
          {activeTab === "fandom" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Fandom Sync</p>
                    <p className="text-sm text-zinc-600">
                      Preview and save structured Fandom data from allowlisted communities.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void fetchFandomData()}
                      disabled={fandomLoading}
                      className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                    >
                      {fandomLoading ? "Refreshing..." : "Refresh"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFandomSyncOpen(true)}
                      className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                    >
                      Sync by Fandom
                    </button>
                  </div>
                </div>
                {fandomLoading && <p className="mt-3 text-sm text-zinc-500">Loading Fandom data...</p>}
                {fandomSyncError && <p className="mt-3 text-sm text-red-600">{fandomSyncError}</p>}
                {fandomError && <p className="mt-3 text-sm text-red-600">{fandomError}</p>}
              </div>

              {fandomData.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-zinc-500">
                    No Fandom/Wikia data available for this person.
                  </p>
                </div>
              ) : (
                fandomData.map((fandom) => (
                  <div key={fandom.id} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                    {/* Source header with link */}
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                          {fandom.source}
                        </p>
                        <h3 className="text-xl font-bold text-zinc-900">
                          {fandom.page_title || fandom.full_name || "Fandom Profile"}
                        </h3>
                      </div>
                      {fandom.source_url && (
                        <a
                          href={fandom.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                        >
                          View on Fandom →
                        </a>
                      )}
                    </div>

                    {/* Summary */}
                    {fandom.summary && (
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-zinc-700 mb-2">Summary</h4>
                        <p className="text-sm text-zinc-600 leading-relaxed">{fandom.summary}</p>
                      </div>
                    )}

                    {fandom.casting_summary && (
                      <div className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                        <h4 className="text-sm font-semibold text-zinc-700 mb-2">Casting</h4>
                        <p className="text-sm text-zinc-700 leading-relaxed">{fandom.casting_summary}</p>
                      </div>
                    )}

                    {/* Biographical Info Grid */}
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Personal Details */}
                      <FandomSection title="Personal Details">
                        <FandomField label="Full Name" value={fandom.full_name} />
                        <FandomField label="Birthday" value={fandom.birthdate_display} />
                        <FandomField label="Gender" value={fandom.gender} />
                        <FandomField label="Resides In" value={fandom.resides_in} />
                        <FandomField label="Hair Color" value={fandom.hair_color} />
                        <FandomField label="Eye Color" value={fandom.eye_color} />
                        <FandomField label="Height" value={fandom.height_display} />
                        <FandomField label="Weight" value={fandom.weight_display} />
                      </FandomSection>

                      {/* Show Info */}
                      <FandomSection title="Show Information">
                        <FandomField label="Installment" value={fandom.installment} />
                        <FandomField label="Seasons" value={fandom.main_seasons_display} />
                      </FandomSection>
                    </div>

                    {/* Relationships */}
                    {(fandom.romances?.length || fandom.family || fandom.friends || fandom.enemies) && (
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-zinc-700 mb-3">Relationships</h4>
                        <div className="grid gap-4 lg:grid-cols-2">
                          {fandom.romances && fandom.romances.length > 0 && (
                            <FandomList title="Romances" items={fandom.romances} />
                          )}
                          {fandom.family && Object.keys(fandom.family).length > 0 && (
                            <FandomJsonList title="Family" data={fandom.family} />
                          )}
                          {fandom.friends && Object.keys(fandom.friends).length > 0 && (
                            <FandomJsonList title="Friends" data={fandom.friends} />
                          )}
                          {fandom.enemies && Object.keys(fandom.enemies).length > 0 && (
                            <FandomJsonList title="Enemies" data={fandom.enemies} />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Taglines */}
                    {fandom.taglines && Object.keys(fandom.taglines).length > 0 && (
                      <FandomTaglines taglines={fandom.taglines} />
                    )}

                    {/* Trivia */}
                    {fandom.trivia && (Array.isArray(fandom.trivia) ? fandom.trivia.length > 0 : Object.keys(fandom.trivia).length > 0) && (
                      <FandomTrivia trivia={fandom.trivia} />
                    )}

                    {/* Reunion Seating */}
                    {fandom.reunion_seating && Object.keys(fandom.reunion_seating).length > 0 && (
                      <FandomReunionSeating seating={fandom.reunion_seating} />
                    )}

                    <FandomBioCard card={fandom.bio_card} />
                    <FandomDynamicSections sections={fandom.dynamic_sections} />

                    {(Array.isArray(fandom.citations) || Array.isArray(fandom.conflicts)) && (
                      <div className="mt-6 grid gap-4 lg:grid-cols-2">
                        {Array.isArray(fandom.citations) && (
                          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                            <h4 className="text-sm font-semibold text-zinc-700 mb-2">Citations</h4>
                            <pre className="overflow-auto text-xs text-zinc-700">{JSON.stringify(fandom.citations, null, 2)}</pre>
                          </div>
                        )}
                        {Array.isArray(fandom.conflicts) && (
                          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                            <h4 className="text-sm font-semibold text-zinc-700 mb-2">Conflicts</h4>
                            <pre className="overflow-auto text-xs text-zinc-700">{JSON.stringify(fandom.conflicts, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Scraped timestamp */}
                    <div className="mt-6 pt-4 border-t border-zinc-100">
                      <p className="text-xs text-zinc-400">
                        Last updated: {new Date(fandom.scraped_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </main>

        {/* Lightbox with metadata and navigation */}
        {lightboxPhoto && (
          <ImageLightbox
            src={getPersonPhotoDetailUrl(lightboxPhoto.photo) || ""}
            fallbackSrcs={getPersonPhotoDetailUrlCandidates(lightboxPhoto.photo)}
            alt={lightboxPhoto.photo.caption || person.full_name}
            isOpen={lightboxOpen}
            onClose={closeLightbox}
            metadata={mapPhotoToMetadata(lightboxPhoto.photo)}
            canManage={true}
            isStarred={Boolean((lightboxPhoto.photo.metadata as Record<string, unknown> | null)?.starred)}
            onToggleStar={(starred) => toggleStarGalleryPhoto(lightboxPhoto.photo, starred)}
            onArchive={() => archiveGalleryPhoto(lightboxPhoto.photo)}
            onUpdateContentType={(contentType) =>
              updateGalleryPhotoContentType(lightboxPhoto.photo, contentType)
            }
            metadataExtras={
              <TagPeoplePanel
                photo={lightboxPhoto.photo}
                defaultPersonTag={
                  person.full_name
                    ? { id: person.id, name: person.full_name }
                    : null
                }
                getAuthHeaders={getAuthHeaders}
                onTagsUpdated={handleTagsUpdated}
                onMirrorUpdated={handleMirrorUpdated}
                onFacebankSeedUpdated={handleFacebankSeedUpdated}
                onThumbnailCropUpdated={handleThumbnailCropUpdated}
                onThumbnailCropPreviewChange={setThumbnailCropPreview}
                externalThumbnailCropOverlayUpdate={thumbnailCropOverlayUpdate}
                onRefreshAutoThumbnailCrop={handleRefreshAutoThumbnailCrop}
              />
            }
            position={{ current: lightboxPhoto.index + 1, total: filteredPhotos.length }}
            onPrevious={() => navigateLightbox("prev")}
            onNext={() => navigateLightbox("next")}
            hasPrevious={lightboxPhoto.index > 0}
            hasNext={lightboxPhoto.index < filteredPhotos.length - 1}
            triggerRef={lightboxTriggerRef as React.RefObject<HTMLElement | null>}
            thumbnailCropPreview={
              thumbnailCropPreview ?? buildThumbnailCropPreview(lightboxPhoto.photo)
            }
            onThumbnailCropPreviewAdjust={handleThumbnailCropOverlayAdjust}
            onRefresh={() => handleRefreshLightboxPhotoMetadata(lightboxPhoto.photo)}
            onSync={() => handleLightboxSyncStage(lightboxPhoto.photo)}
            onCount={() => handleLightboxCountStage(lightboxPhoto.photo)}
            onCrop={() => handleLightboxCropStage(lightboxPhoto.photo)}
            onIdText={() => handleLightboxIdTextStage(lightboxPhoto.photo)}
            onResize={() => handleLightboxResizeStage(lightboxPhoto.photo)}
            onReassign={
              lightboxPhoto.photo.origin === "cast_photos"
                ? () =>
                    setReassignModalImage({
                      imageId: lightboxPhoto.photo.id,
                      currentEntityId: lightboxPhoto.photo.person_id,
                      currentEntityLabel: person.full_name ?? null,
                    })
                : undefined
            }
          />
        )}

        <ReassignImageModal
          isOpen={Boolean(reassignModalImage)}
          onClose={() => setReassignModalImage(null)}
          onSubmit={handleReassignCastPhoto}
          currentType="cast"
          currentEntityId={reassignModalImage?.currentEntityId ?? personId}
          currentEntityLabel={reassignModalImage?.currentEntityLabel ?? person.full_name}
          allowedTypes={["cast"]}
          getAuthHeaders={getAuthHeaders}
        />

        {/* Image scrape drawer */}
        <ImageScrapeDrawer
          isOpen={scrapeDrawerOpen}
          onClose={() => setScrapeDrawerOpen(false)}
          entityContext={{
            type: "person",
            personId: personId,
            personName: person.full_name,
          } as PersonContext}
          onImportComplete={() => {
            // Refresh photos after import
            fetchPhotos();
          }}
        />

        <AdvancedFilterDrawer
          isOpen={advancedFiltersOpen}
          onClose={() => setAdvancedFiltersOpen(false)}
          filters={advancedFilters}
          onChange={setAdvancedFilters}
          availableSources={uniqueSources}
          showSeeded={true}
          sortOptions={[
            { value: "newest", label: "Newest First" },
            { value: "oldest", label: "Oldest First" },
            { value: "season-desc", label: "Season (Newest)" },
            { value: "season-asc", label: "Season (Oldest)" },
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
          entityLabel={person?.full_name ?? "Person"}
        />
      </div>
    </ClientOnly>
  );
}

// Fandom Helper Components
function FandomSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-4">
      <h4 className="text-sm font-semibold text-zinc-700 mb-3">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function FandomField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-zinc-500 w-28 flex-shrink-0">{label}:</span>
      <span className="text-zinc-900">{value}</span>
    </div>
  );
}

function FandomList({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3">
      <p className="text-xs font-semibold text-zinc-500 mb-2">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-zinc-700">• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function FandomJsonList({ title, data }: { title: string; data: Record<string, unknown> | unknown[] }) {
  // Handle both array and object formats
  const items: string[] = [];

  if (Array.isArray(data)) {
    // Array of objects like [{name: "Person", relation: "Friend"}] or just strings
    for (const item of data) {
      if (typeof item === 'string') {
        items.push(item);
      } else if (item && typeof item === 'object') {
        // Try to extract meaningful display text from the object
        const obj = item as Record<string, unknown>;
        if (obj.name) {
          const relation = obj.relation ? ` (${obj.relation})` : '';
          items.push(`${obj.name}${relation}`);
        } else {
          // Fall back to showing the first string value found
          const firstVal = Object.values(obj).find(v => typeof v === 'string');
          if (firstVal) items.push(firstVal as string);
        }
      }
    }
  } else {
    // Object format like {key: value}
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        items.push(`${key}: ${value}`);
      } else if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        if (obj.name) {
          items.push(`${key}: ${obj.name}`);
        }
      }
    }
  }

  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3">
      <p className="text-xs font-semibold text-zinc-500 mb-2">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-zinc-700">• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function fandomValueToText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => fandomValueToText(item)).filter(Boolean).join(", ");
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => `${key}: ${fandomValueToText(entry)}`)
      .join(" | ");
  }
  return "—";
}

function toFandomStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" && item.trim() ? item.trim() : null))
    .filter((item): item is string => Boolean(item));
}

function FandomDynamicSectionCard({ title, section }: { title: string; section: FandomDynamicSection }) {
  const paragraphs = toFandomStringList(section.paragraphs);
  const bullets = toFandomStringList(section.bullets);
  const tableRows = Array.isArray(section.table_rows) ? section.table_rows : [];

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <h4 className="mb-2 text-sm font-semibold text-zinc-700">{title}</h4>
      {paragraphs.length > 0 && (
        <div className="space-y-2 text-sm text-zinc-700">
          {paragraphs.map((paragraph, idx) => (
            <p key={`${title}-paragraph-${idx}`}>{paragraph}</p>
          ))}
        </div>
      )}
      {bullets.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
          {bullets.map((bullet, idx) => (
            <li key={`${title}-bullet-${idx}`}>{bullet}</li>
          ))}
        </ul>
      )}
      {tableRows.length > 0 && (
        <pre className="mt-2 overflow-auto text-xs text-zinc-700">{JSON.stringify(tableRows, null, 2)}</pre>
      )}
    </div>
  );
}

function FandomBioCard({ card }: { card: unknown }) {
  const normalizedCard = normalizeFandomBioCard(card);
  if (!normalizedCard) return null;
  const groups: Array<{ key: string; label: string }> = [
    { key: "general", label: "General" },
    { key: "appearance", label: "Appearance" },
    { key: "relationships", label: "Relationships" },
    { key: "production", label: "Production" },
  ];
  const visibleGroups = groups.filter(({ key }) => normalizedCard[key] && typeof normalizedCard[key] === "object");
  if (visibleGroups.length === 0) return null;

  return (
    <div className="mt-6">
      <h4 className="mb-3 text-sm font-semibold text-zinc-700">Bio Card</h4>
      <div className="grid gap-4 lg:grid-cols-2">
        {visibleGroups.map(({ key, label }) => {
          const section = normalizedCard[key];
          if (!section) return null;
          return (
            <div key={key} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{label}</p>
              <div className="space-y-1.5">
                {Object.entries(section).map(([field, value]) => (
                  <div key={field} className="text-sm text-zinc-700">
                    <span className="font-medium text-zinc-900">{field.replaceAll("_", " ")}:</span>{" "}
                    {fandomValueToText(value)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FandomDynamicSections({ sections }: { sections: unknown }) {
  const normalized = normalizeFandomDynamicSections(sections);
  if (normalized.length === 0) return null;

  const casting = normalized.find((section) => fandomSectionBucket(section) === "casting");
  const biography = normalized.find((section) => fandomSectionBucket(section) === "biography");
  const taglines = normalized.find((section) => fandomSectionBucket(section) === "taglines");
  const reunion = normalized.find((section) => fandomSectionBucket(section) === "reunion");
  const otherSections = normalized.filter((section) => fandomSectionBucket(section) === "other");

  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {casting && <FandomDynamicSectionCard title="Casting" section={casting} />}
        {biography && <FandomDynamicSectionCard title="Biography" section={biography} />}
        {taglines && <FandomDynamicSectionCard title="Taglines" section={taglines} />}
        {reunion && <FandomDynamicSectionCard title="Reunion Seating" section={reunion} />}
      </div>
      {otherSections.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-zinc-700">Other Sections</h4>
          <div className="grid gap-4 lg:grid-cols-2">
            {otherSections.map((section, idx) => (
              <FandomDynamicSectionCard
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

function FandomTaglines({ taglines }: { taglines: Record<string, unknown> | unknown[] }) {
  // Handle both array and object formats
  const items: { season: string; tagline: string }[] = [];

  if (Array.isArray(taglines)) {
    // Array format like [{season: "1", tagline: "Quote"}]
    for (const item of taglines) {
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const season = obj.season ? String(obj.season) : obj.year ? String(obj.year) : `#${items.length + 1}`;
        const rawTagline = obj.tagline || obj.quote || obj.text;
        if (rawTagline) {
          // Strip outer quotes if present (data often has embedded quotes)
          let tagline = String(rawTagline);
          if (tagline.startsWith('"') && tagline.endsWith('"')) {
            tagline = tagline.slice(1, -1);
          }
          items.push({ season, tagline });
        }
      } else if (typeof item === 'string') {
        items.push({ season: `#${items.length + 1}`, tagline: item });
      }
    }
  } else {
    // Object format like {"Season 1": "Quote"}
    for (const [season, tagline] of Object.entries(taglines)) {
      if (typeof tagline === 'string') {
        items.push({ season, tagline });
      } else if (tagline && typeof tagline === 'object') {
        const obj = tagline as Record<string, unknown>;
        const text = obj.tagline || obj.quote || obj.text;
        if (text) items.push({ season, tagline: String(text) });
      }
    }
  }

  if (items.length === 0) return null;
  return (
    <div className="mt-6">
      <h4 className="text-sm font-semibold text-zinc-700 mb-3">Taglines</h4>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
            <span className="text-xs font-semibold text-amber-700 bg-amber-200 px-2 py-0.5 rounded h-fit">
              {item.season}
            </span>
            <p className="text-sm text-amber-900 italic">&ldquo;{item.tagline}&rdquo;</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FandomTrivia({ trivia }: { trivia: Record<string, unknown> | unknown[] }) {
  // Handle both array and object formats
  const items: string[] = [];

  if (Array.isArray(trivia)) {
    for (const item of trivia) {
      if (typeof item === 'string') {
        items.push(item);
      } else if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const text = obj.text || obj.fact || obj.trivia || obj.content;
        if (text) items.push(String(text));
      }
    }
  } else {
    for (const value of Object.values(trivia)) {
      if (typeof value === 'string') {
        items.push(value);
      } else if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        const text = obj.text || obj.fact || obj.trivia || obj.content;
        if (text) items.push(String(text));
      }
    }
  }

  if (items.length === 0) return null;
  return (
    <div className="mt-6">
      <h4 className="text-sm font-semibold text-zinc-700 mb-3">Trivia</h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-zinc-600 pl-4 border-l-2 border-zinc-200">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FandomReunionSeating({ seating }: { seating: Record<string, unknown> | unknown[] }) {
  // Handle both array and object formats
  const items: { reunion: string; position: string }[] = [];

  if (Array.isArray(seating)) {
    // Array format like [{reunion: "Season 1 Reunion", position: "3"}]
    for (const item of seating) {
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const season = obj.season;
        const seatOrder = obj.seat_order ?? obj.position ?? obj.seat;
        if (season !== undefined && seatOrder) {
          items.push({ reunion: `Season ${season} Reunion`, position: String(seatOrder) });
        }
      }
    }
  } else {
    // Object format like {"Season 1 Reunion": "3"}
    for (const [reunion, position] of Object.entries(seating)) {
      if (typeof position === 'string' || typeof position === 'number') {
        items.push({ reunion, position: String(position) });
      } else if (position && typeof position === 'object') {
        const obj = position as Record<string, unknown>;
        const pos = obj.position || obj.seat || obj.order;
        if (pos !== undefined) items.push({ reunion, position: String(pos) });
      }
    }
  }

  if (items.length === 0) return null;
  return (
    <div className="mt-6">
      <h4 className="text-sm font-semibold text-zinc-700 mb-3">Reunion Seating</h4>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between p-2 rounded bg-zinc-50 text-sm">
            <span className="text-zinc-600">{item.reunion}</span>
            <span className="font-medium text-zinc-900">{item.position}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
