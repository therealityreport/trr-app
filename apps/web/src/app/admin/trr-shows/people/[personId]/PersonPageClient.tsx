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
import { useAdminOperationUnloadGuard } from "@/lib/admin/use-operation-unload-guard";
import { AdminRequestError, adminGetJson, adminMutation, adminStream } from "@/lib/admin/admin-fetch";
import { fetchAdminWithAuth, getClientAuthHeaders } from "@/lib/admin/client-auth";
import { logAdminPageReadDiagnostic, measurePayloadBytes } from "@/lib/admin/page-read-diagnostics";
import { buildScopedAdminRequestId, resolveRequestIdFromPayload } from "@/lib/admin/request-id";
import { useTabRouteNavigation } from "@/lib/admin/use-tab-route-navigation";
import {
  canonicalizeOperationStatus,
  isCanonicalTerminalStatus,
  monitorKickoffHandle,
  normalizeKickoffHandle,
  waitForOperationTerminalState,
  type CanonicalOperationStatus,
} from "@/lib/admin/async-handles";
import {
  clearAdminOperationSession,
  getAutoResumableAdminOperationSession,
  getAdminOperationSession,
  getOrCreateAdminFlowKey,
  markAdminOperationSessionStatus,
  upsertAdminOperationSession,
  type AdminOperationSessionRecord,
} from "@/lib/admin/operation-session";
import {
  GettyLocalPrefetchError,
  prefetchGettyLocallyForPerson,
  type GettyLocalPrefetchProgressState,
} from "@/lib/admin/getty-local-prefetch";
import {
  buildPersonAdminUrl,
  buildSocialAccountProfileUrl,
  buildPersonRouteSlug,
  normalizeSocialAccountProfileHandle,
  buildSeasonAdminUrl,
  buildShowAdminUrl,
  cleanLegacyPersonRoutingQuery,
  parsePersonRouteState,
} from "@/lib/admin/show-admin-routes";
import { recordAdminRecentShow } from "@/lib/admin/admin-recent-shows";
import { TmdbLinkIcon, ImdbLinkIcon } from "@/components/admin/ExternalLinks";
import { ImageLightbox, type ImageType } from "@/components/admin/ImageLightbox";
import ShowNewsTab from "@/components/admin/show-tabs/ShowNewsTab";
import FandomSyncModal from "@/components/admin/FandomSyncModal";
import NbcumvSeasonBios from "@/components/admin/NbcumvSeasonBios";
import ReassignImageModal from "@/components/admin/ReassignImageModal";
import { ImageScrapeDrawer, type PersonContext } from "@/components/admin/ImageScrapeDrawer";
import SocialGrowthSection from "@/components/admin/social-growth-section";
import { AdvancedFilterDrawer } from "@/components/admin/AdvancedFilterDrawer";
import { normalizePersonExternalIdValue } from "@/lib/admin/person-external-ids";
import {
  PersonExternalIdsEditor,
} from "@/components/admin/PersonExternalIdsEditor";
import {
  type FandomDynamicSection,
  type FandomSyncOptions,
  type FandomSyncPreviewResponse,
  fandomSectionBucket,
  normalizeFandomBioCard,
  normalizeFandomDynamicSections,
  normalizeFandomSyncPreviewResponse,
} from "@/lib/admin/fandom-sync-types";
import {
  formatPhotoSourceLabel,
  mapPhotoToMetadata,
  resolveMetadataDimensions,
} from "@/lib/photo-metadata";
import {
  THUMBNAIL_CROP_LIMITS,
  THUMBNAIL_DEFAULTS,
  parseThumbnailCrop,
  resolveThumbnailViewportImageStyle,
  resolveThumbnailViewportRect,
  resolveThumbnailPresentation,
  type ThumbnailCrop,
} from "@/lib/thumbnail-crop";
import {
  readAdvancedFilters,
  writeAdvancedFilters,
  type AdvancedFilterState,
} from "@/lib/admin/advanced-filters";
import {
  BRAVOCON_LABEL,
  CANONICAL_SCOPED_SOURCE_ORDER,
  UNSORTED_LABEL,
  buildPersonGalleryShowOptions,
  buildShowAcronym,
  computePersonGalleryMediaViewAvailability,
  computePersonPhotoShowBuckets,
  getPersonEventImageCount,
  getShowDisplayLabel,
  isWwhlShowName,
  resolveGalleryShowFilterFallback,
  resolvePersonGalleryImportContext,
  toCanonicalScopedSource,
  WWHL_LABEL,
  type CanonicalScopedSource,
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
import { resolveBravoVideoThumbnailUrl } from "@/lib/admin/bravo-video-thumbnails";
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
  formatCanonicalSourceLabel,
} from "@/lib/admin/person-page/settings";
import {
  usePersonProfileController,
} from "@/lib/admin/person-page/use-person-profile-controller";
import {
  usePersonProfileLoad,
} from "@/lib/admin/person-page/use-person-profile-load";
import {
  usePersonSettingsController,
} from "@/lib/admin/person-page/use-person-settings-controller";
import {
  type CanonicalSourceOrder,
  type TrrPerson,
} from "@/lib/admin/person-page/types";
import {
  applyFacebankSeedUpdateToLightbox,
  applyFacebankSeedUpdateToPhotos,
} from "./facebank-seed-state";
import {
  applyThumbnailCropUpdateToLightbox,
  applyThumbnailCropUpdateToPhotos,
} from "./thumbnail-crop-state";
import {
  buildOperationDispatchDetailMessage,
  buildProxyConnectDetailMessage,
  buildProxyTerminalErrorMessage,
  buildPersonRefreshDetailMessage,
  createPersonRefreshPipelineSteps,
  createSyncProgressTracker,
  finalizePersonRefreshPipelineSteps,
  formatGettySubtaskCountLabel,
  formatRefreshExecutionBackendLabel,
  formatRefreshExecutionOwnerLabel,
  formatPersonRefreshPhaseLabel,
  mapPersonRefreshStage,
  normalizePersonGettyProgress,
  normalizePersonRefreshSourceProgress,
  PERSON_REFRESH_PHASES,
  summarizePersonRefreshSourceProgress,
  type PersonGettyProgressState,
  type PersonRefreshPipelineMode,
  type PersonRefreshPipelineStepState,
  type PersonRefreshSourceProgressState,
  updateSyncProgressTracker,
  updatePersonRefreshPipelineSteps,
} from "./refresh-progress";

const GETTY_RESULTS_PER_PAGE = 60;

function estimateGettyPageTotal(siteImageTotal: number | null | undefined): number {
  if (typeof siteImageTotal !== "number" || !Number.isFinite(siteImageTotal) || siteImageTotal <= 0) {
    return 0;
  }
  return Math.max(1, Math.ceil(siteImageTotal / GETTY_RESULTS_PER_PAGE));
}

function readGettySummaryNumber(
  entry: Record<string, unknown>,
  key: string,
): number {
  const value = entry[key];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

type MultiSourceField = Record<string, unknown> | null | undefined;
type ResolvedField = {
  value: string | null;
  source: string | null;
  sources: Array<{ source: string; value: string }>;
};
type BackendGetImagesSource = "getty" | "nbcumv" | "bravotv" | "imdb" | "tmdb";
type GetImagesSourceSelection = "all" | "getty" | "getty_nbcumv" | "imdb" | "tmdb";
type PersonPipelineOperationType = "admin_person_refresh_images" | "admin_person_reprocess_images";
type AdminOperationHealthEntry = {
  id: string;
  operation_type?: string | null;
  status?: string | null;
  request_payload?: Record<string, unknown> | null;
  progress_payload?: Record<string, unknown> | null;
  execution_owner?: string | null;
  execution_mode_canonical?: string | null;
  execution_backend_canonical?: string | null;
  latest_phase?: string | null;
  age_seconds?: number | null;
  last_update_age_seconds?: number | null;
  is_stale?: boolean;
};
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const looksLikeUuid = (value: string): boolean => UUID_RE.test(value);
const PERSON_PIPELINE_STALE_SESSION_MS = 5 * 60 * 1000;
const PERSON_PIPELINE_OPERATION_TYPES: readonly PersonPipelineOperationType[] = [
  "admin_person_refresh_images",
  "admin_person_reprocess_images",
];

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

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const normalizeStringListMap = (value: unknown): Record<string, string[]> => {
  if (Array.isArray(value)) {
    const values = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    return values.length > 0 ? { tmdb: values } : {};
  }
  const record = asRecord(value);
  if (!record) return {};
  const normalized: Record<string, string[]> = {};
  for (const [key, entry] of Object.entries(record)) {
    if (!Array.isArray(entry)) continue;
    const values = entry
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    if (values.length > 0) {
      normalized[key] = values;
    }
  }
  return normalized;
};

const flattenAlternativeNames = (value: unknown): string[] => {
  const grouped = normalizeStringListMap(value);
  const orderedSources = ["tmdb", "imdb", "wikipedia", "fandom", "bravo", "manual"];
  const seen = new Set<string>();
  const flattened: string[] = [];

  const appendValues = (entries: string[] | undefined) => {
    for (const entry of entries ?? []) {
      const key = entry.toLocaleLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      flattened.push(entry);
    }
  };

  for (const source of orderedSources) {
    appendValues(grouped[source]);
  }
  for (const [source, entries] of Object.entries(grouped)) {
    if (orderedSources.includes(source)) continue;
    appendValues(entries);
  }
  return flattened;
};

const formatAlternativeNameSourceLabel = (source: string): string => {
  const normalized = source.trim().toLowerCase();
  if (normalized === "tmdb") return "TMDb";
  if (normalized === "imdb") return "IMDb";
  if (normalized === "wikipedia") return "Wikipedia";
  if (normalized === "fandom") return "Fandom";
  if (normalized === "bravo") return "Bravo";
  if (normalized === "manual") return "Manual";
  return source;
};

const parseOptionalNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const isPersonPipelineOperationType = (value: unknown): value is PersonPipelineOperationType =>
  typeof value === "string" && PERSON_PIPELINE_OPERATION_TYPES.includes(value as PersonPipelineOperationType);

const getPersonPipelineFlowScopeForOperationType = (
  personId: string | null,
  operationType: PersonPipelineOperationType | null,
): string | null => {
  if (!personId || !operationType) return null;
  return operationType === "admin_person_refresh_images"
    ? `person:${personId}:refresh-images`
    : `person:${personId}:reprocess-images`;
};

const extractPersonIdFromOperationHealthEntry = (entry: AdminOperationHealthEntry | null): string | null => {
  const requestPayload = asRecord(entry?.request_payload);
  const personId = requestPayload?.person_id;
  return typeof personId === "string" && personId.trim().length > 0 ? personId.trim() : null;
};

const countNonPendingSourceProgressEntries = (value: unknown): number => {
  const sourceProgress = asRecord(value);
  if (!sourceProgress) return 0;
  return Object.values(sourceProgress).reduce<number>((count, entry) => {
    const record = asRecord(entry);
    const status = typeof record?.status === "string" ? record.status.trim().toLowerCase() : "";
    return status && status !== "pending" ? count + 1 : count;
  }, 0);
};

const countNonPendingGettySubtasks = (value: unknown): number => {
  const gettyProgress = asRecord(value);
  const subtasks = Array.isArray(gettyProgress?.subtasks) ? gettyProgress.subtasks : [];
  return subtasks.reduce<number>((count, entry) => {
    const record = asRecord(entry);
    const status = typeof record?.status === "string" ? record.status.trim().toLowerCase() : "";
    return status && status !== "pending" ? count + 1 : count;
  }, 0);
};

const scorePersonPipelineOperationCandidate = (entry: AdminOperationHealthEntry): number => {
  const progress = asRecord(entry.progress_payload);
  const normalizedStatus = String(entry.status || "").trim().toLowerCase();
  const nonPendingSources = countNonPendingSourceProgressEntries(progress?.source_progress);
  const nonPendingGettySubtasks = countNonPendingGettySubtasks(progress?.getty_progress);
  const current = parseOptionalNumber(progress?.current);
  const total = parseOptionalNumber(progress?.total);
  const mirroringTotal = parseOptionalNumber(progress?.mirroring_total);
  const stage = typeof progress?.stage === "string" ? progress.stage.trim().toLowerCase() : "";
  let score = 0;

  if (normalizedStatus === "running") score += 200;
  else if (normalizedStatus === "pending") score += 120;
  else if (normalizedStatus === "cancelling") score += 40;

  if (entry.is_stale === true) score -= 300;
  score += nonPendingSources * 80;
  score += nonPendingGettySubtasks * 40;
  if ((current ?? 0) > 0) score += 90;
  if ((total ?? 0) > 0) score += 30;
  if (typeof entry.latest_phase === "string" && entry.latest_phase.trim().length > 0) score += 20;
  if (
    stage === "mirroring" &&
    (mirroringTotal ?? 0) <= 0 &&
    nonPendingSources === 0 &&
    nonPendingGettySubtasks === 0 &&
    (current ?? 0) <= 1
  ) {
    score -= 500;
  }
  score -= Math.min(300, Math.max(0, Number(entry.last_update_age_seconds ?? 0)));
  return score;
};

const GET_IMAGES_SOURCE_OPTIONS: Array<{
  value: GetImagesSourceSelection;
  label: string;
  description: string;
}> = [
  {
    value: "all",
    label: "Run All",
    description: "Runs Getty, IMDb, and TMDb.",
  },
  {
    value: "getty",
    label: "Getty",
    description: "Runs Getty-only discovery/import and skips NBCUMV-only supplementing.",
  },
  {
    value: "getty_nbcumv",
    label: "Getty / NBCUMV",
    description: "Runs the fused Getty / NBCUMV path.",
  },
  { value: "imdb", label: "IMDb", description: "Runs IMDb only." },
  { value: "tmdb", label: "TMDb", description: "Runs TMDb only." },
];

const GET_IMAGES_SOURCE_SELECTION_MAP: Record<GetImagesSourceSelection, BackendGetImagesSource[]> = {
  all: ["nbcumv", "imdb", "tmdb"],
  getty: ["getty"],
  getty_nbcumv: ["nbcumv"],
  imdb: ["imdb"],
  tmdb: ["tmdb"],
};

const getImagesSourcesForSelection = (
  selection: GetImagesSourceSelection,
): BackendGetImagesSource[] => {
  return [...GET_IMAGES_SOURCE_SELECTION_MAP[selection]];
};

const getReprocessSourcesForGetImagesSelection = (
  selection: GetImagesSourceSelection,
): CanonicalScopedSource[] | undefined => {
  const requested = getImagesSourcesForSelection(selection);
  const expanded = new Set<CanonicalScopedSource>();
  for (const source of requested) {
    if (source === "nbcumv") {
      expanded.add("getty");
      expanded.add("nbcumv");
      expanded.add("bravotv");
      continue;
    }
    if (source === "getty") {
      expanded.add("getty");
      continue;
    }
    if (source === "bravotv") {
      expanded.add("bravotv");
      continue;
    }
    expanded.add(source);
  }
  return Array.from(expanded).sort(
    (left, right) => CANONICAL_SCOPED_SOURCE_ORDER.indexOf(left) - CANONICAL_SCOPED_SOURCE_ORDER.indexOf(right),
  );
};

const getImagesSelectionLabel = (selection: GetImagesSourceSelection): string => {
  return GET_IMAGES_SOURCE_OPTIONS.find((option) => option.value === selection)?.label ?? "Run All";
};

const getImagesSelectionDetail = (selection: GetImagesSourceSelection): string => {
  return GET_IMAGES_SOURCE_OPTIONS.find((option) => option.value === selection)?.description ?? "Runs Getty, IMDb, and TMDb.";
};

function LinkOutIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 3H3v10h10V9" />
      <path d="M10 3h3v3" />
      <path d="M6.5 9.5L13 3" />
    </svg>
  );
}

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
  source_image_id?: string | null;
  source_asset_id?: string | null;
  url: string | null;
  hosted_url: string | null;
  original_url?: string | null;
  thumb_url?: string | null;
  display_url?: string | null;
  detail_url?: string | null;
  crop_display_url?: string | null;
  crop_detail_url?: string | null;
  hosted_sha256?: string | null;
  hosted_content_type?: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  context_section: string | null;
  context_type: string | null;
  bucket_type?: "show" | "wwhl" | "bravocon" | "event" | "unknown" | null;
  bucket_key?: string | null;
  bucket_label?: string | null;
  resolved_show_id?: string | null;
  resolved_show_name?: string | null;
  getty_event_group_title?: string | null;
  season: number | null;
  source_page_url?: string | null;
  // Metadata fields for lightbox display
  people_names: string[] | null;
  people_ids: string[] | null;
  people_count?: number | null;
  people_count_source?: "auto" | "manual" | null;
  face_boxes?: FaceBoxTag[] | null;
  face_crops?: FaceCropTag[] | null;
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
  match_similarity?: number | null;
  match_status?: string | null;
  match_reason?: string | null;
  match_candidates?: Array<{
    person_id?: string;
    person_name?: string;
    similarity: number;
  }> | null;
  label_source?: string | null;
}

interface FaceCropTag {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  variant_key?: string;
  variant_url?: string;
  size?: number;
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

type PersonCreditsByShow = Omit<PersonCreditShowScope, "other_show_credits">;

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

type TabId = "overview" | "settings" | "gallery" | "videos" | "news" | "credits" | "fandom" | "social";
type ReprocessStageKey = "all" | "tagging" | "crop" | "id_text" | "resize";
type StageTargetScope = "filtered" | "full";
type StageTargets = {
  totalFiltered: number;
  castCount: number;
  mediaLinkCount: number;
  targetCastPhotoIds: string[];
  targetMediaLinkIds: string[];
  sources: CanonicalScopedSource[];
};

const buildStageTargetsFromPhotos = (photoList: TrrPersonPhoto[]): StageTargets => {
  const castPhotoIds = new Set<string>();
  const mediaLinkIds = new Set<string>();
  const sourceSet = new Set<CanonicalScopedSource>();
  for (const photo of photoList) {
    const canonicalSource = toCanonicalScopedSource(photo.source);
    if (canonicalSource) sourceSet.add(canonicalSource);
    if (photo.origin === "cast_photos") {
      const photoId = String(photo.id || "").trim();
      if (photoId) castPhotoIds.add(photoId);
      continue;
    }
    if (photo.origin === "media_links") {
      const linkId = String(photo.link_id || photo.id || "").trim();
      if (linkId) mediaLinkIds.add(linkId);
    }
  }
  const sources = Array.from(sourceSet).sort(
    (a, b) => CANONICAL_SCOPED_SOURCE_ORDER.indexOf(a) - CANONICAL_SCOPED_SOURCE_ORDER.indexOf(b)
  );
  const targetCastPhotoIds = Array.from(castPhotoIds).sort((a, b) => a.localeCompare(b));
  const targetMediaLinkIds = Array.from(mediaLinkIds).sort((a, b) => a.localeCompare(b));
  return {
    totalFiltered: photoList.length,
    castCount: targetCastPhotoIds.length,
    mediaLinkCount: targetMediaLinkIds.length,
    targetCastPhotoIds,
    targetMediaLinkIds,
    sources,
  };
};

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

const formatCreditsGroupSummary = (group: PersonCreditsByShow): string => {
  const castCount =
    group.cast_groups.length +
    group.cast_non_episodic.length;
  const crewCount =
    group.crew_groups.length +
    group.crew_non_episodic.length;
  if (castCount > 0 && crewCount > 0) {
    return `${castCount} cast • ${crewCount} crew`;
  }
  if (castCount > 0) {
    return `${castCount} cast`;
  }
  if (crewCount > 0) {
    return `${crewCount} crew`;
  }
  return "No grouped credits";
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
    const matchSimilarity =
      typeof candidate.match_similarity === "number" && Number.isFinite(candidate.match_similarity)
        ? clampFaceCoord(candidate.match_similarity)
        : null;
    const matchStatus =
      typeof candidate.match_status === "string" && candidate.match_status.trim().length > 0
        ? candidate.match_status.trim().toLowerCase()
        : null;
    const matchReason =
      typeof candidate.match_reason === "string" && candidate.match_reason.trim().length > 0
        ? candidate.match_reason.trim().toLowerCase()
        : null;
    const matchCandidates = Array.isArray(candidate.match_candidates)
      ? candidate.match_candidates
          .map((entry) => {
            if (!entry || typeof entry !== "object") return null;
            const item = entry as Record<string, unknown>;
            const similarity =
              typeof item.similarity === "number" && Number.isFinite(item.similarity)
                ? clampFaceCoord(item.similarity)
                : null;
            if (similarity === null) return null;
            const personId =
              typeof item.person_id === "string" && item.person_id.trim().length > 0
                ? item.person_id.trim()
                : undefined;
            const personName =
              typeof item.person_name === "string" && item.person_name.trim().length > 0
                ? item.person_name.trim()
                : undefined;
            return {
              ...(personId ? { person_id: personId } : {}),
              ...(personName ? { person_name: personName } : {}),
              similarity,
            };
          })
          .filter(
            (
              entry,
            ): entry is {
              person_id?: string;
              person_name?: string;
              similarity: number;
            } => entry !== null,
          )
      : [];
    const labelSource =
      typeof candidate.label_source === "string" && candidate.label_source.trim().length > 0
        ? candidate.label_source.trim()
        : null;
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
      ...(matchSimilarity !== null ? { match_similarity: matchSimilarity } : {}),
      ...(matchStatus ? { match_status: matchStatus } : {}),
      ...(matchReason ? { match_reason: matchReason } : {}),
      ...(matchCandidates.length > 0 ? { match_candidates: matchCandidates } : {}),
      ...(labelSource ? { label_source: labelSource } : {}),
    });
  }
  return boxes;
};

const normalizeFaceCrops = (value: unknown): FaceCropTag[] => {
  if (!Array.isArray(value)) return [];
  const crops: FaceCropTag[] = [];
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
        : crops.length + 1;
    const variantKey =
      typeof candidate.variant_key === "string" && candidate.variant_key.trim().length > 0
        ? candidate.variant_key.trim()
        : undefined;
    const variantUrl =
      typeof candidate.variant_url === "string" && candidate.variant_url.trim().length > 0
        ? candidate.variant_url.trim()
        : undefined;
    const size =
      typeof candidate.size === "number" && Number.isFinite(candidate.size) && candidate.size > 0
        ? Math.floor(candidate.size)
        : undefined;
    crops.push({
      index,
      x,
      y,
      width,
      height,
      ...(variantKey ? { variant_key: variantKey } : {}),
      ...(variantUrl ? { variant_url: variantUrl } : {}),
      ...(size ? { size } : {}),
    });
  }
  return crops;
};

const PERSON_PAGE_STREAM_IDLE_TIMEOUT_MS = 600_000;
const PERSON_PAGE_STREAM_MAX_DURATION_MS = 45 * 60 * 1000;
const PERSON_PAGE_STREAM_START_DEADLINE_MS = 120_000;
const PERSON_PIPELINE_SWITCH_TO_OPERATION_MONITOR_PREFIX = "__person_pipeline_switch_to_operation_monitor__:";
const PHOTO_PIPELINE_STEP_TIMEOUT_MS = 480_000;
const PHOTO_LIST_LOAD_TIMEOUT_MS = 60_000;
const PERSON_GALLERY_INITIAL_PAGE_SIZE = 48;
const PERSON_GALLERY_VISIBLE_INCREMENT = 48;
const PERSON_SECONDARY_READ_CONCURRENCY = 2;
const BRAVO_VIDEO_THUMBNAIL_SYNC_TIMEOUT_MS = 90_000;
const NEWS_LOAD_TIMEOUT_MS = 45_000;
const NEWS_SYNC_TIMEOUT_MS = 60_000;
const NEWS_SYNC_POLL_INTERVAL_MS = 1_500;
const NEWS_SYNC_POLL_TIMEOUT_MS = 90_000;

const parsePersonPipelineMonitorSwitchOperationId = (message: string | null | undefined): string | null => {
  if (!message || !message.startsWith(PERSON_PIPELINE_SWITCH_TO_OPERATION_MONITOR_PREFIX)) {
    return null;
  }
  const operationId = message.slice(PERSON_PIPELINE_SWITCH_TO_OPERATION_MONITOR_PREFIX.length).trim();
  return operationId || null;
};
const NEWS_OPERATION_RECONNECT_BACKOFF_MS = [2_000, 5_000, 10_000, 15_000] as const;
const NEWS_PAGE_SIZE = 50;
const MAX_PHOTO_FETCH_PAGES = 30;
const TEXT_OVERLAY_DETECT_CONCURRENCY = 4;

type PersonGalleryPagination = {
  count: number;
  limit: number;
  offset: number;
  total_count: number | null;
  total_count_status?: "exact" | "deferred";
  next_offset: number;
  has_more: boolean;
};

const mergePersonPhotoPages = (
  existing: TrrPersonPhoto[],
  incoming: TrrPersonPhoto[]
): TrrPersonPhoto[] => {
  if (existing.length === 0) return incoming;
  if (incoming.length === 0) return existing;
  const merged = new Map<string, TrrPersonPhoto>();
  for (const photo of existing) {
    merged.set(photo.id, photo);
  }
  for (const photo of incoming) {
    merged.set(photo.id, photo);
  }
  return [...merged.values()];
};

const readPersonGalleryPagination = (
  value: unknown,
  {
    fallbackOffset,
    fallbackLimit,
    pageCount,
  }: {
    fallbackOffset: number;
    fallbackLimit: number;
    pageCount: number;
  }
): PersonGalleryPagination => {
  const fallbackNextOffset = fallbackOffset + pageCount;
  if (!value || typeof value !== "object") {
    return {
      count: pageCount,
      limit: fallbackLimit,
      offset: fallbackOffset,
      total_count: null,
      total_count_status: "deferred",
      next_offset: fallbackNextOffset,
      has_more: pageCount >= fallbackLimit,
    };
  }
  const entry = value as Record<string, unknown>;
  const normalizeInt = (candidate: unknown, fallback: number): number => {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return Math.max(0, Math.floor(candidate));
    }
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      const parsed = Number.parseInt(candidate, 10);
      if (Number.isFinite(parsed)) {
        return Math.max(0, parsed);
      }
    }
    return fallback;
  };
  return {
    count: normalizeInt(entry.count, pageCount),
    limit: normalizeInt(entry.limit, fallbackLimit),
    offset: normalizeInt(entry.offset, fallbackOffset),
    total_count:
      typeof entry.total_count === "number" && Number.isFinite(entry.total_count)
        ? Math.max(0, Math.floor(entry.total_count))
        : null,
    total_count_status:
      entry.total_count_status === "exact" || entry.total_count_status === "deferred"
        ? entry.total_count_status
        : typeof entry.total_count === "number"
          ? "exact"
          : "deferred",
    next_offset: normalizeInt(entry.next_offset, fallbackNextOffset),
    has_more: Boolean(entry.has_more),
  };
};

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

const isAdminRequestTimeoutError = (error: unknown): boolean =>
  error instanceof AdminRequestError &&
  (error.code === "REQUEST_TIMEOUT" || error.status === 408);

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
    aspectRatio: 3 / 4,
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
function ProfilePhoto({ urls, name }: { urls: Array<string | null | undefined>; name: string }) {
  const candidates = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const value of urls) {
      if (typeof value !== "string") continue;
      const trimmed = value.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      ordered.push(trimmed);
    }
    return ordered;
  }, [urls]);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(candidates[0] ?? null);
  const [fallbackIndex, setFallbackIndex] = useState(1);

  useEffect(() => {
    setHasError(false);
    setCurrentSrc(candidates[0] ?? null);
    setFallbackIndex(1);
  }, [candidates]);

  const handleError = () => {
    const nextSrc = candidates[fallbackIndex] ?? null;
    if (nextSrc && nextSrc !== currentSrc) {
      setCurrentSrc(nextSrc);
      setFallbackIndex((prev) => prev + 1);
      return;
    }
    setHasError(true);
  };

  if (!currentSrc || hasError) {
    return (
      <div className="relative aspect-[3/4] w-32 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-200">
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
    <div className="relative aspect-[3/4] w-32 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-200">
      <Image
        src={currentSrc}
        alt={name}
        fill
        className="object-cover"
        sizes="128px"
        unoptimized
        onError={handleError}
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
  lastEventAt,
  steps,
  sourceProgress,
  gettyProgress,
}: {
  show: boolean;
  phase?: string | null;
  message?: string | null;
  current?: number | null;
  total?: number | null;
  lastEventAt?: number | null;
  steps?: PersonRefreshPipelineStepState[] | null;
  sourceProgress?: PersonRefreshSourceProgressState[] | null;
  gettyProgress?: PersonGettyProgressState | null;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!show) return;
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [show]);

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
  const stepStates = Array.isArray(steps) ? steps : [];
  const completedStepCount = stepStates.filter(
    (step) => step.status === "completed" || step.status === "skipped",
  ).length;
  const warningStepCount = stepStates.filter((step) => step.status === "warning").length;
  const failedStepCount = stepStates.filter((step) => step.status === "failed").length;
  const runningStep = stepStates.find((step) => step.status === "running") ?? null;
  const hasStepProgress = stepStates.length > 0;
  const sourceStates = Array.isArray(sourceProgress) ? sourceProgress : [];
  const gettyState = gettyProgress ?? null;
  const processedStepCount = stepStates.filter(
    (step) =>
      step.status === "completed" ||
      step.status === "warning" ||
      step.status === "skipped" ||
      step.status === "failed",
  ).length;
  const stepPercent = hasStepProgress ? Math.round((processedStepCount / stepStates.length) * 100) : 0;
  const percent = hasProgressBar
    ? Math.min(100, Math.round((safeCurrent / safeTotal) * 100))
    : hasStepProgress
      ? stepPercent
      : 0;
  const phaseLabel = formatPersonRefreshPhaseLabel(phase);
  const countLabel =
    safeCurrent !== null && safeTotal !== null
      ? `${safeCurrent.toLocaleString()}/${safeTotal.toLocaleString()}`
      : null;
  const stepLabel =
    hasStepProgress
      ? `${completedStepCount.toLocaleString()}/${stepStates.length.toLocaleString()} phases complete`
      : null;
  const detailMessage =
    typeof message === "string" && message.trim()
      ? message.trim()
      : null;
  const lastUpdateSeconds =
    typeof lastEventAt === "number" && Number.isFinite(lastEventAt)
      ? Math.max(0, Math.floor((nowMs - lastEventAt) / 1000))
      : null;
  const lastUpdateLabel =
    typeof lastUpdateSeconds === "number" ? `last update ${lastUpdateSeconds}s ago` : null;

  const renderStepStatus = (step: PersonRefreshPipelineStepState): string => {
    if (step.status === "running") {
      if (typeof step.current === "number" && typeof step.total === "number") {
        return `${step.current.toLocaleString()}/${step.total.toLocaleString()}`;
      }
      return "In progress";
    }
    if (step.status === "completed") return "Done";
    if (step.status === "warning") return "Warning";
    if (step.status === "skipped") return "Skipped";
    if (step.status === "failed") return "Failed";
    return "Pending";
  };

  const stepToneClass = (status: PersonRefreshPipelineStepState["status"]): string => {
    if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-800";
    if (status === "running") return "border-blue-200 bg-blue-50 text-blue-800";
    if (status === "warning") return "border-amber-200 bg-amber-50 text-amber-800";
    if (status === "failed") return "border-red-200 bg-red-50 text-red-800";
    if (status === "skipped") return "border-zinc-200 bg-zinc-100 text-zinc-600";
    return "border-zinc-200 bg-white text-zinc-500";
  };

  const sourceToneClass = (status: PersonRefreshSourceProgressState["status"]): string => {
    if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-800";
    if (status === "running") return "border-blue-200 bg-blue-50 text-blue-800";
    if (status === "warning") return "border-amber-200 bg-amber-50 text-amber-800";
    if (status === "failed") return "border-red-200 bg-red-50 text-red-800";
    if (status === "skipped") return "border-zinc-200 bg-zinc-100 text-zinc-600";
    return "border-zinc-200 bg-white text-zinc-500";
  };

  const renderSourceStatus = (source: PersonRefreshSourceProgressState): string => {
    if (source.status === "running") return "In progress";
    if (source.status === "completed") return "Done";
    if (source.status === "warning") return "Warning";
    if (source.status === "skipped") return "Skipped";
    if (source.status === "failed") return "Failed";
    return "Pending";
  };

  const gettyToneClass = (status: PersonGettyProgressState["status"] | PersonGettyProgressState["subtasks"][number]["status"]): string => {
    if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-800";
    if (status === "running") return "border-blue-200 bg-blue-50 text-blue-800";
    if (status === "warning") return "border-amber-200 bg-amber-50 text-amber-800";
    if (status === "failed") return "border-red-200 bg-red-50 text-red-800";
    if (status === "skipped") return "border-zinc-200 bg-zinc-100 text-zinc-600";
    return "border-zinc-200 bg-white text-zinc-500";
  };

  const renderGettyStatus = (
    status: PersonGettyProgressState["status"] | PersonGettyProgressState["subtasks"][number]["status"],
  ): string => {
    if (status === "running") return "In progress";
    if (status === "completed") return "Done";
    if (status === "warning") return "Warning";
    if (status === "skipped") return "Skipped";
    if (status === "failed") return "Failed";
    return "Pending";
  };

  const formatGettyQueryMeta = (
    subtask: PersonGettyProgressState["subtasks"][number]
  ): string | null => {
    const parts: string[] = [];
    if (typeof subtask.siteImageTotal === "number" && subtask.siteImageTotal > 0) {
      parts.push(`${subtask.siteImageTotal.toLocaleString()} Getty images`);
    }
    if (typeof subtask.siteEventTotal === "number" && subtask.siteEventTotal > 0) {
      parts.push(`${subtask.siteEventTotal.toLocaleString()} events`);
    }
    if (typeof subtask.siteVideoTotal === "number" && subtask.siteVideoTotal > 0) {
      parts.push(`${subtask.siteVideoTotal.toLocaleString()} videos`);
    }
    if (subtask.candidatesFound > 0) {
      parts.push(`${subtask.candidatesFound.toLocaleString()} fetched`);
    }
    if (subtask.usableAfterDedupeTotal > 0) {
      parts.push(`${subtask.usableAfterDedupeTotal.toLocaleString()} usable`);
    }
    if (subtask.overlapCount > 0) {
      parts.push(`${subtask.overlapCount.toLocaleString()} overlap`);
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  };

  const gettyBreakdownEntries = gettyState
    ? ([
        ["Bravo Search", Number(gettyState.breakdown.bravoSearchTotal)],
        ["Broad Search", Number(gettyState.breakdown.broadSearchTotal)],
        ["Unique Merged", Number(gettyState.breakdown.uniqueDiscovered)],
        ["Via NBCUMV", Number(gettyState.breakdown.matchedViaNbcumv)],
        ["Via BravoTV", Number(gettyState.breakdown.matchedViaBravotvJson)],
        ["Via Image Search", Number(gettyState.breakdown.matchedViaImageSearch)],
        ["Unmatched Getty", Number(gettyState.breakdown.unmatchedGetty)],
        ["Getty-only", Number(gettyState.breakdown.gettyOnlyImported)],
        ["NBCUMV-only", Number(gettyState.breakdown.nbcumvOnlyImported)],
        ["BravoTV-only", Number(gettyState.breakdown.bravotvOnlyImported)],
        ["Covered Existing", Number(gettyState.breakdown.coveredExisting)],
        ["Upgraded Existing", Number(gettyState.breakdown.upgradedExisting)],
        ["Hosted", Number(gettyState.breakdown.mirroredHosted)],
        ["Hosting Failed", Number(gettyState.breakdown.mirroredFailed)],
        ["Skipped", Number(gettyState.breakdown.skipped)],
        ["Failed", Number(gettyState.breakdown.failed)],
      ] as Array<[string, number]>).filter(([, value]) => value > 0)
    : [];
  const gettyIsPrefetched = gettyState?.breakdown.prefetched ?? false;

  const formatSourceCounts = (source: PersonRefreshSourceProgressState): string => {
    const discoveredTotal =
      typeof source.discoveredTotal === "number" ? source.discoveredTotal.toLocaleString() : "?";
    const remaining =
      typeof source.remaining === "number" ? source.remaining.toLocaleString() : "?";
    const parts = [
      `scraped ${source.scrapedCurrent.toLocaleString()}/${discoveredTotal}`,
      `saved ${source.savedCurrent.toLocaleString()}`,
    ];
    if (source.coveredExisting > 0) {
      parts.push(`covered ${source.coveredExisting.toLocaleString()}`);
    }
    if (source.upgradedExisting > 0) {
      parts.push(`upgraded ${source.upgradedExisting.toLocaleString()}`);
    }
    parts.push(`remaining ${remaining}`);
    return parts.join(" · ");
  };

  return (
    <div className="w-full">
      {(phaseLabel || message || hasCounts || hasStepProgress) && (
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-400">
            {countLabel
              ? `${phaseLabel || runningStep?.label?.toUpperCase() || "WORKING"} ${countLabel}`
              : phaseLabel || runningStep?.label?.toUpperCase() || "WORKING"}
          </p>
          {hasProgressBar && safeCurrent !== null && safeTotal !== null && (
            <p className="text-[11px] font-bold tabular-nums text-zinc-400">
              {safeCurrent.toLocaleString()}/{safeTotal.toLocaleString()} ({percent}%)
            </p>
          )}
          {!hasProgressBar && stepLabel && (
            <p className="text-[11px] tabular-nums text-zinc-500">
              {stepLabel}
              {warningStepCount > 0 ? ` · ${warningStepCount.toLocaleString()} warning${warningStepCount === 1 ? "" : "s"}` : ""}
              {failedStepCount > 0 ? ` · ${failedStepCount.toLocaleString()} failed` : ""}
            </p>
          )}
          {!hasProgressBar && lastUpdateLabel && (
            <p className="text-[11px] tabular-nums text-zinc-500">{lastUpdateLabel}</p>
          )}
        </div>
      )}
      {detailMessage && (
        <p className="mb-1 text-[11px] text-zinc-500">{detailMessage}</p>
      )}
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-zinc-800">
        {hasProgressBar || hasStepProgress ? (
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-600 to-emerald-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        ) : safeTotal === 0 ? null : (
          <div className="absolute inset-y-0 left-0 w-1/3 animate-pulse rounded-full bg-sky-600/50" />
        )}
      </div>
      {hasStepProgress && (
        <div className="mt-2 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-sm">
          <div className="grid gap-px bg-zinc-800 sm:grid-cols-2">
            {stepStates.map((step) => {
              const detail = step.result || step.message;
              return (
                <div
                  key={step.id}
                  className={`px-3 py-2 ${
                    step.status === "completed"
                      ? "bg-zinc-900"
                      : step.status === "running"
                        ? "bg-zinc-900/90"
                        : step.status === "failed"
                          ? "bg-red-950/30"
                          : step.status === "skipped"
                            ? "bg-zinc-900/70"
                            : step.status === "warning"
                              ? "bg-amber-950/20"
                              : "bg-zinc-900/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`mt-px h-1 w-1 shrink-0 rounded-full ${
                          step.status === "completed"
                            ? "bg-emerald-500"
                            : step.status === "running"
                              ? "animate-pulse bg-sky-400"
                              : step.status === "failed"
                                ? "bg-red-500"
                                : step.status === "skipped"
                                  ? "bg-zinc-600"
                                  : step.status === "warning"
                                    ? "bg-amber-500"
                                    : "bg-zinc-700"
                        }`}
                      />
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
                        {step.label}
                      </p>
                    </div>
                    <p
                      className={`text-[11px] font-bold tabular-nums ${
                        step.status === "completed"
                          ? "text-emerald-400"
                          : step.status === "running"
                            ? "text-sky-400"
                            : step.status === "failed"
                              ? "text-red-400"
                              : step.status === "warning"
                                ? "text-amber-400"
                                : "text-zinc-500"
                      }`}
                    >
                      {renderStepStatus(step)}
                    </p>
                  </div>
                  {detail && (
                    <p className="mt-0.5 pl-2.5 text-[10px] leading-tight text-zinc-500">
                      {detail}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {sourceStates.length > 0 && (
        <div className="mt-2 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-700/60 bg-zinc-800/80 px-3 py-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-300">
              Image Sources
            </p>
            <p className="text-[11px] font-bold tabular-nums text-zinc-400">
              {sourceStates.filter((source) => source.status !== "pending").length.toLocaleString()}/
              {sourceStates.length.toLocaleString()}
            </p>
          </div>
          <div className="grid gap-px bg-zinc-800 sm:grid-cols-2">
            {sourceStates.map((source) => (
              <div
                key={source.key}
                className={`px-3 py-2 ${
                  source.status === "completed"
                    ? "bg-zinc-900"
                    : source.status === "running"
                      ? "bg-zinc-900/90"
                      : source.status === "failed"
                        ? "bg-red-950/30"
                        : source.status === "skipped"
                          ? "bg-zinc-900/70"
                          : "bg-zinc-900/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`mt-px h-1 w-1 shrink-0 rounded-full ${
                        source.status === "completed"
                          ? "bg-emerald-500"
                          : source.status === "running"
                            ? "animate-pulse bg-sky-400"
                            : source.status === "failed"
                              ? "bg-red-500"
                              : source.status === "skipped"
                                ? "bg-zinc-600"
                                : source.status === "warning"
                                  ? "bg-amber-500"
                                  : "bg-zinc-700"
                      }`}
                    />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
                      {source.label}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase ${
                      source.status === "completed"
                        ? "text-emerald-400"
                        : source.status === "running"
                          ? "text-sky-400"
                          : source.status === "failed"
                            ? "text-red-400"
                            : source.status === "warning"
                              ? "text-amber-400"
                              : "text-zinc-500"
                    }`}
                  >
                    {renderSourceStatus(source)}
                  </span>
                </div>
                <p className="mt-0.5 pl-2.5 text-[10px] tabular-nums leading-tight text-zinc-500">
                  {formatSourceCounts(source)}
                </p>
                {source.failedCurrent > 0 && (
                  <p className="mt-0.5 pl-2.5 text-[10px] leading-tight text-red-400/80">
                    failed {source.failedCurrent.toLocaleString()}
                  </p>
                )}
                {source.message && (
                  <p className="mt-0.5 pl-2.5 text-[10px] leading-tight text-zinc-600">
                    {source.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {gettyState && (
        <div className="mt-2 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-sm">
          {/* Header bar */}
          <div className="flex items-center justify-between border-b border-zinc-700/60 bg-zinc-800/80 px-3 py-1.5">
            <div className="flex items-center gap-2">
              <div
                className={`h-1.5 w-1.5 rounded-full ${
                  gettyState.status === "running"
                    ? "animate-pulse bg-sky-400"
                    : gettyState.status === "completed"
                      ? "bg-emerald-400"
                      : gettyState.status === "failed"
                        ? "bg-red-400"
                        : gettyState.status === "warning"
                          ? "bg-amber-400"
                          : "bg-zinc-500"
                }`}
              />
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-300">
                Getty / NBCUMV
              </p>
              {gettyIsPrefetched && (
                <span className="rounded bg-sky-900/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-300">
                  Hybrid
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {gettyState.phase && (
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  {gettyState.phase.replace(/_/g, " ")}
                </p>
              )}
              {gettyState.authMode && (
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  {gettyState.authMode.replace(/_/g, " ")}
                </p>
              )}
              <span
                className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  gettyState.status === "completed"
                    ? "bg-emerald-900/40 text-emerald-400"
                    : gettyState.status === "running"
                      ? "bg-sky-900/40 text-sky-400"
                      : gettyState.status === "failed"
                        ? "bg-red-900/40 text-red-400"
                        : gettyState.status === "warning"
                          ? "bg-amber-900/40 text-amber-400"
                          : "bg-zinc-700/40 text-zinc-500"
                }`}
              >
                {renderGettyStatus(gettyState.status)}
              </span>
            </div>
          </div>

          {/* Subtask grid */}
          {gettyState.subtasks.length > 0 && (
            <div className="grid gap-px bg-zinc-800 sm:grid-cols-2">
              {gettyState.subtasks.map((subtask) => (
                <div
                  key={subtask.id}
                  className={`px-3 py-2 ${
                    subtask.status === "completed"
                      ? "bg-zinc-900"
                      : subtask.status === "running"
                        ? "bg-zinc-900/90"
                        : subtask.status === "failed"
                          ? "bg-red-950/30"
                          : subtask.status === "skipped"
                            ? "bg-zinc-900/70"
                            : "bg-zinc-900/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`mt-px h-1 w-1 shrink-0 rounded-full ${
                          subtask.status === "completed"
                            ? "bg-emerald-500"
                            : subtask.status === "running"
                              ? "animate-pulse bg-sky-400"
                              : subtask.status === "failed"
                                ? "bg-red-500"
                                : subtask.status === "skipped"
                                  ? "bg-zinc-600"
                                  : "bg-zinc-700"
                        }`}
                      />
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
                        {subtask.label}
                      </p>
                    </div>
                    <p
                      className={`text-[11px] font-bold tabular-nums ${
                        subtask.status === "completed"
                          ? "text-emerald-400"
                          : subtask.status === "running"
                            ? "text-sky-400"
                            : "text-zinc-500"
                      }`}
                    >
                      {formatGettySubtaskCountLabel(subtask) ?? renderGettyStatus(subtask.status)}
                    </p>
                  </div>
                  {subtask.query && (
                    <p className="mt-0.5 pl-2.5 text-[10px] leading-tight text-zinc-600">
                      &ldquo;{subtask.query}&rdquo;
                    </p>
                  )}
                  {subtask.queryUrl && (
                    <a
                      href={subtask.queryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 block pl-2.5 text-[10px] leading-tight text-sky-500 hover:text-sky-400"
                    >
                      Open Getty search
                    </a>
                  )}
                  {formatGettyQueryMeta(subtask) && (
                    <p className="mt-0.5 pl-2.5 text-[10px] leading-tight text-zinc-500">
                      {formatGettyQueryMeta(subtask)}
                    </p>
                  )}
                  {subtask.message && (
                    <p className="mt-0.5 pl-2.5 text-[10px] leading-tight text-zinc-500">
                      {subtask.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Breakdown stats */}
          {gettyBreakdownEntries.length > 0 && (
            <div className="border-t border-zinc-700/60 px-3 py-2">
              <div className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-3">
                {gettyBreakdownEntries.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                      {label}
                    </span>
                    <span
                      className={`text-[11px] font-bold tabular-nums ${
                        label === "Failed" || label === "Hosting Failed"
                          ? "text-red-400"
                          : label === "Skipped"
                            ? "text-zinc-500"
                            : "text-zinc-300"
                      }`}
                    >
                      {value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
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
  const thumbnailViewportStyle = useMemo(() => {
    const [xToken = "", yToken = ""] = presentation.objectPosition.split(/\s+/);
    const focusX = Number.parseFloat(xToken);
    const focusY = Number.parseFloat(yToken);
    if (!Number.isFinite(focusX) || !Number.isFinite(focusY)) return null;
    const viewportRect = resolveThumbnailViewportRect({
      imageWidth: imageDimensions.width,
      imageHeight: imageDimensions.height,
      focusX,
      focusY,
      zoom: presentation.zoom,
      aspectRatio: 3 / 4,
    });
    return resolveThumbnailViewportImageStyle(viewportRect);
  }, [imageDimensions.height, imageDimensions.width, presentation.objectPosition, presentation.zoom]);
  const useViewportStyle = Boolean(thumbnailViewportStyle);

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
        className={`absolute inset-0 cursor-zoom-in select-none transition-transform duration-200 ${
          useViewportStyle ? "max-w-none" : "h-full w-full object-cover"
        }`}
        style={
          useViewportStyle
            ? thumbnailViewportStyle ?? undefined
            : {
                objectPosition: presentation.objectPosition,
                transform: presentation.zoom === 1 ? undefined : `scale(${presentation.zoom})`,
                transformOrigin: presentation.objectPosition,
              }
        }
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
    faceCrops: FaceCropTag[];
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
  const [faceCrops, setFaceCrops] = useState<FaceCropTag[]>([]);
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
    setFaceCrops(normalizeFaceCrops(photo.face_crops));
  }, [
    currentPeopleCount,
    defaultPersonTag?.id,
    defaultPersonTag?.name,
    isEditable,
    photo.face_boxes,
    photo.face_crops,
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
      aspectRatio: 3 / 4,
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
          faceCrops,
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
      faceCrops,
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
  const faceCropItems = useMemo(
    () =>
      faceCrops
        .slice()
        .sort((a, b) => a.index - b.index)
        .map((crop) => {
          const matchingBox = faceBoxes.find((box) => box.index === crop.index);
          const label = matchingBox?.person_name || matchingBox?.label || `Face ${crop.index}`;
          const matchStatus =
            typeof matchingBox?.match_status === "string" && matchingBox.match_status.trim().length > 0
              ? matchingBox.match_status.trim().toLowerCase()
              : "unassigned";
          const matchSimilarity =
            typeof matchingBox?.match_similarity === "number" && Number.isFinite(matchingBox.match_similarity)
              ? `${(matchingBox.match_similarity * 100).toFixed(1)}%`
              : "—";
          const detectConfidence =
            typeof matchingBox?.confidence === "number" && Number.isFinite(matchingBox.confidence)
              ? `${(matchingBox.confidence * 100).toFixed(1)}%`
              : "—";
          return {
            index: crop.index,
            label,
            diagnosticsLine: `Status ${matchStatus} | Sim ${matchSimilarity} | Detect ${detectConfidence}`,
            url:
              typeof crop.variant_url === "string" && crop.variant_url.trim().length > 0
                ? crop.variant_url
                : null,
          };
        }),
    [faceBoxes, faceCrops]
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
      const nextFaceCrops = normalizeFaceCrops(data.face_crops);
      setFaceBoxes(nextFaceBoxes);
      setFaceCrops(nextFaceCrops);
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
        faceCrops: nextFaceCrops,
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
          {faceCropItems.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {faceCropItems.map((crop) => (
                <div
                  key={`face-crop-chip-${crop.index}`}
                  className="w-20"
                  title={`${crop.label} | ${crop.diagnosticsLine}`}
                >
                  <div className="relative h-16 w-16 overflow-hidden rounded-full border border-white/20 bg-white/10">
                    {crop.url ? (
                      <Image
                        src={crop.url}
                        alt={crop.label}
                        fill
                        sizes="64px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white/80">
                        {crop.label.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-center text-[9px] font-semibold text-white">
                      {crop.label}
                    </div>
                  </div>
                  <p className="mt-1 text-center text-[9px] leading-tight text-white/65">
                    {crop.diagnosticsLine}
                  </p>
                </div>
              ))}
            </div>
          )}
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
                      {box.match_status && (
                        <span className="rounded-full border border-sky-300/40 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-200">
                          {box.match_status.replace(/_/g, " ")}
                        </span>
                      )}
                      {box.match_similarity !== undefined && box.match_similarity !== null && (
                        <span className="text-[11px] text-sky-200/80">
                          Similarity {(box.match_similarity * 100).toFixed(0)}%
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

const SOCIALBLADE_PERSON_PLATFORM_ORDER = ["instagram", "facebook", "youtube"] as const;
type SocialBladePersonPlatform = (typeof SOCIALBLADE_PERSON_PLATFORM_ORDER)[number];

export default function PersonProfilePage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const personRouteParam = readRouteParamValue((params as Record<string, unknown>).personId);
  const showRouteParam = readRouteParamValue((params as Record<string, unknown>).showId);
  const hasShowRouteContext = typeof showRouteParam === "string" && showRouteParam.trim().length > 0;
  const showIdQueryParamRaw = searchParams.get("showId");
  const showIdQueryParam =
    typeof showIdQueryParamRaw === "string" && showIdQueryParamRaw.trim().length > 0
      ? showIdQueryParamRaw.trim()
      : null;
  const hasShowQueryContext = Boolean(showIdQueryParam);
  const showIdParam = hasShowRouteContext ? showRouteParam : showIdQueryParam;
  const personQueryContext = useMemo(() => {
    const query = cleanLegacyPersonRoutingQuery(new URLSearchParams(searchParams.toString()));
    if (!hasShowRouteContext && !hasShowQueryContext) {
      query.delete("showId");
    }
    return query;
  }, [hasShowQueryContext, hasShowRouteContext, searchParams]);
  const [resolvedShowIdParam, setResolvedShowIdParam] = useState<string | null>(
    showIdParam && looksLikeUuid(showIdParam) ? showIdParam : null
  );
  const [resolvedShowSlugParam, setResolvedShowSlugParam] = useState<string | null>(
    showIdParam && !looksLikeUuid(showIdParam) ? showIdParam : null
  );
  const [resolvedShowNameForRouting, setResolvedShowNameForRouting] = useState<string | null>(null);
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
  useAdminOperationUnloadGuard();

  const personRouteState = useMemo(
    () => parsePersonRouteState(pathname, new URLSearchParams(searchParams.toString())),
    [pathname, searchParams]
  );

  const [photos, setPhotos] = useState<TrrPersonPhoto[]>([]);
  const [photosSavedTotal, setPhotosSavedTotal] = useState<number | null>(0);
  const [photosSavedTotalStatus, setPhotosSavedTotalStatus] = useState<"exact" | "deferred">("exact");
  const [photosVisibleCount, setPhotosVisibleCount] = useState(PERSON_GALLERY_VISIBLE_INCREMENT);
  const [photosHasMore, setPhotosHasMore] = useState(false);
  const [photosNextOffset, setPhotosNextOffset] = useState(0);
  const [photosLoadingMore, setPhotosLoadingMore] = useState(false);
  const [primaryGalleryReady, setPrimaryGalleryReady] = useState(false);
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
  const [creditsByShow, setCreditsByShow] = useState<PersonCreditsByShow[]>([]);
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
  const [getImagesSourceSelection, setGetImagesSourceSelection] = useState<GetImagesSourceSelection>("all");
  const [refreshProgress, setRefreshProgress] = useState<{
    current?: number | null;
    total?: number | null;
    phase?: string | null;
    message?: string | null;
    rawStage?: string | null;
    detailMessage?: string | null;
    runId?: string | null;
    lastEventAt?: number | null;
    checkpoint?: string | null;
    streamState?: "connecting" | "connected" | "streaming" | "failed" | "completed" | null;
    errorCode?: string | null;
    attemptElapsedMs?: number | null;
    attemptTimeoutMs?: number | null;
    backendHost?: string | null;
    sourceProgress?: PersonRefreshSourceProgressState[] | null;
    gettyProgress?: PersonGettyProgressState | null;
    executionOwner?: string | null;
    executionModeCanonical?: string | null;
    executionBackendCanonical?: string | null;
    operationStatus?: CanonicalOperationStatus | null;
  } | null>(null);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshLiveCounts, setRefreshLiveCounts] = useState<JobLiveCounts | null>(null);
  const [refreshPipelineSteps, setRefreshPipelineSteps] = useState<PersonRefreshPipelineStepState[] | null>(null);
  const [photosError, setPhotosError] = useState<string | null>(null);
  const [refreshLogOpen, setRefreshLogOpen] = useState(false);
  const [refreshLogEntries, setRefreshLogEntries] = useState<RefreshLogEntry[]>([]);
  const [getImagesFollowUpPromptOpen, setGetImagesFollowUpPromptOpen] = useState(false);
  const [refreshingProfile, setRefreshingProfile] = useState(false);
  const [profileRefreshMessage, setProfileRefreshMessage] = useState<string | null>(null);
  const [profileRefreshError, setProfileRefreshError] = useState<string | null>(null);
  const [profileRefreshSummary, setProfileRefreshSummary] = useState<Record<string, unknown> | null>(null);
  const refreshLogCounterRef = useRef(0);
  const personRefreshRequestCounterRef = useRef(0);
  const resumedPersonPipelineRef = useRef(false);
  const resumedProfileRefreshRef = useRef(false);
  const textOverlayDetectControllerRef = useRef<AbortController | null>(null);
  const showBrokenRowsRef = useRef(showBrokenRows);
  const photosRef = useRef<TrrPersonPhoto[]>(photos);
  const photosNextOffsetRef = useRef(photosNextOffset);
  const photosRequestKeyRef = useRef<string | null>(null);
  const photosInFlightRef = useRef<Promise<TrrPersonPhoto[]> | null>(null);
  const secondaryReadQueueRef = useRef<Array<() => void>>([]);
  const secondaryReadsInFlightRef = useRef(0);
  const showBrokenPhotoRefetchInitializedRef = useRef(false);
  const recentViewRequestKeyRef = useRef<string | null>(null);

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
    return buildScopedAdminRequestId({
      prefix: "person-refresh",
      counter: ++personRefreshRequestCounterRef.current,
      parts: [
        { value: showIdForApi, fallback: "unknown" },
        { prefix: "p", value: personId, fallback: "unknown" },
      ],
    });
  }, [personId, showIdForApi]);

  const refreshStreamPath = personId
    ? `/api/admin/trr-api/people/${personId}/refresh-images/stream`
    : null;
  const profileRefreshStreamPath = personId
    ? `/api/admin/trr-api/people/${personId}/refresh-profile/stream`
    : null;
  const reprocessStreamPath = personId
    ? `/api/admin/trr-api/people/${personId}/reprocess-images/stream`
    : null;
  const refreshOperationFlowScope = personId ? `person:${personId}:refresh-images` : null;
  const reprocessOperationFlowScope = personId ? `person:${personId}:reprocess-images` : null;
  const profileRefreshAutoResumeScope = profileRefreshStreamPath
    ? `POST:${profileRefreshStreamPath}:${JSON.stringify({ refresh_links: true, refresh_credits: true }).length}`
    : null;
  const [cancellingPersonPipeline, setCancellingPersonPipeline] = useState(false);

  const isLikelyStalePersonPipelineSession = useCallback((session: AdminOperationSessionRecord | null) => {
    if (!session || session.status !== "active") return false;
    return Date.now() - (session.updatedAtMs ?? 0) >= PERSON_PIPELINE_STALE_SESSION_MS;
  }, []);

  const getLatestPersonPipelineOperationSession = useCallback(() => {
    const refreshSession = refreshOperationFlowScope ? getAdminOperationSession(refreshOperationFlowScope) : null;
    const reprocessSession = reprocessOperationFlowScope ? getAdminOperationSession(reprocessOperationFlowScope) : null;
    return [refreshSession, reprocessSession]
      .filter((session): session is NonNullable<typeof refreshSession> => Boolean(session?.operationId))
      .sort((left, right) => (right.updatedAtMs ?? 0) - (left.updatedAtMs ?? 0))[0] ?? null;
  }, [refreshOperationFlowScope, reprocessOperationFlowScope]);

  const getCurrentPersonPipelineOperationSession = useCallback(() => {
    const latestSession = getLatestPersonPipelineOperationSession();
    if (!latestSession || latestSession.status !== "active" || !latestSession.operationId) return null;
    if (isLikelyStalePersonPipelineSession(latestSession)) return null;
    return latestSession;
  }, [getLatestPersonPipelineOperationSession, isLikelyStalePersonPipelineSession]);

  const latestPersonPipelineSession = getLatestPersonPipelineOperationSession();
  const activePersonPipelineSession = getCurrentPersonPipelineOperationSession();
  const stalePersonPipelineSession =
    latestPersonPipelineSession && isLikelyStalePersonPipelineSession(latestPersonPipelineSession)
      ? latestPersonPipelineSession
      : null;
  const effectiveRuntimeBackend =
    refreshProgress?.executionBackendCanonical ??
    activePersonPipelineSession?.executionBackendCanonical ??
    latestPersonPipelineSession?.executionBackendCanonical ??
    null;
  const effectiveRuntimeOwner =
    refreshProgress?.executionOwner ??
    activePersonPipelineSession?.executionOwner ??
    latestPersonPipelineSession?.executionOwner ??
    null;
  const effectiveRuntimeMode =
    refreshProgress?.executionModeCanonical ??
    activePersonPipelineSession?.executionModeCanonical ??
    latestPersonPipelineSession?.executionModeCanonical ??
    null;
  const runtimePillLabel =
    effectiveRuntimeBackend === "modal"
      ? "Runtime: Modal"
      : effectiveRuntimeBackend === "local"
        ? "Runtime: Local"
        : refreshingImages || reprocessingImages || Boolean(activePersonPipelineSession)
          ? "Runtime: Detecting..."
          : "Runtime: Unknown";
  const runtimePillClass =
    effectiveRuntimeBackend === "modal"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : effectiveRuntimeBackend === "local"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-zinc-200 bg-zinc-50 text-zinc-600";
  const runtimeTooltipParts = [
    formatRefreshExecutionBackendLabel(effectiveRuntimeBackend),
    formatRefreshExecutionOwnerLabel(effectiveRuntimeOwner),
    effectiveRuntimeMode ? effectiveRuntimeMode.replace(/_/g, " ") : null,
  ].filter(Boolean);
  const effectiveOperationStatus =
    cancellingPersonPipeline
      ? "cancelling"
      : refreshProgress?.operationStatus ??
        activePersonPipelineSession?.canonicalStatus ??
        (stalePersonPipelineSession ? "cancelling" : null);
  const statusPillLabel =
    stalePersonPipelineSession && !activePersonPipelineSession
      ? "Status: Stale"
      : effectiveOperationStatus === "cancelling"
        ? "Status: Cancelling"
        : effectiveOperationStatus === "running"
          ? "Status: Running"
          : effectiveOperationStatus === "queued"
            ? "Status: Queued"
            : "Status: Ready";
  const statusPillClass =
    stalePersonPipelineSession && !activePersonPipelineSession
      ? "border-red-200 bg-red-50 text-red-700"
      : effectiveOperationStatus === "cancelling"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : effectiveOperationStatus === "running"
          ? "border-blue-200 bg-blue-50 text-blue-800"
          : effectiveOperationStatus === "queued"
            ? "border-yellow-200 bg-yellow-50 text-yellow-800"
            : "border-zinc-200 bg-zinc-50 text-zinc-600";
  const latestPipelineSummary = useMemo(() => {
    const operationId = latestPersonPipelineSession?.operationId ?? refreshProgress?.runId ?? null;
    if (!operationId) return null;
    const phase = refreshProgress?.rawStage ?? refreshProgress?.phase ?? latestPersonPipelineSession?.latestPhase ?? null;
    const lastUpdatedMs = refreshProgress?.lastEventAt ?? latestPersonPipelineSession?.updatedAtMs ?? null;
    return {
      operationId,
      phase,
      lastUpdatedMs,
      runtimeLabel: runtimePillLabel.replace(/^Runtime:\s*/, ""),
    };
  }, [latestPersonPipelineSession, refreshProgress, runtimePillLabel]);

  const parseOperationEventSeq = useCallback((payload: unknown): number => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return 0;
    const rawValue = (payload as { event_seq?: unknown }).event_seq;
    if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
      return Math.max(0, Math.floor(rawValue));
    }
    if (typeof rawValue === "string" && rawValue.trim().length > 0) {
      const parsed = Number.parseInt(rawValue, 10);
      return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    }
    return 0;
  }, []);

  const parseOptionalProgressNumber = useCallback((value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }, []);

  const persistPersonOperationSessionEvent = useCallback(
    (input: {
      flowScope: string | null;
      flowKey: string;
      requestPath: string | null;
      method: string;
      eventType: string;
      payload: unknown;
    }) => {
      if (!input.flowScope || !input.requestPath) return;
      const payloadRecord =
        input.payload && typeof input.payload === "object" && !Array.isArray(input.payload)
          ? (input.payload as Record<string, unknown>)
          : null;
      const operationId =
        payloadRecord && typeof payloadRecord.operation_id === "string" && payloadRecord.operation_id.trim().length > 0
          ? payloadRecord.operation_id.trim()
          : null;
      const eventSeq = parseOperationEventSeq(input.payload);
      const statusRaw =
        payloadRecord && typeof payloadRecord.status === "string" ? payloadRecord.status.trim().toLowerCase() : "";
      const canonicalStatus =
        statusRaw.length > 0 ? canonicalizeOperationStatus(statusRaw, "running") : undefined;
      const executionOwner =
        payloadRecord && typeof payloadRecord.execution_owner === "string"
          ? payloadRecord.execution_owner.trim() || null
          : null;
      const executionModeCanonical =
        payloadRecord && typeof payloadRecord.execution_mode_canonical === "string"
          ? payloadRecord.execution_mode_canonical.trim() || null
          : null;
      const executionBackendCanonical =
        payloadRecord && typeof payloadRecord.execution_backend_canonical === "string"
          ? payloadRecord.execution_backend_canonical.trim() || null
          : null;
      const latestPhase =
        payloadRecord && typeof payloadRecord.phase === "string"
          ? payloadRecord.phase.trim() || null
          : payloadRecord && typeof payloadRecord.stage === "string"
            ? payloadRecord.stage.trim() || null
            : null;

      upsertAdminOperationSession(input.flowScope, {
        flowKey: input.flowKey,
        input: input.requestPath,
        method: input.method,
        ...(operationId ? { operationId } : {}),
        ...(canonicalStatus ? { canonicalStatus } : {}),
        ...(executionOwner ? { executionOwner } : {}),
        ...(executionModeCanonical ? { executionModeCanonical } : {}),
        ...(executionBackendCanonical ? { executionBackendCanonical } : {}),
        ...(latestPhase ? { latestPhase } : {}),
        ...(eventSeq > 0 ? { lastEventSeq: eventSeq } : {}),
        status: "active",
      });

      if (input.eventType === "complete") {
        markAdminOperationSessionStatus(input.flowScope, "completed");
      } else if (input.eventType === "error") {
        markAdminOperationSessionStatus(
          input.flowScope,
          statusRaw === "cancelled" || statusRaw === "canceled" ? "cancelled" : "failed",
        );
      }
    },
    [parseOperationEventSeq]
  );

  const formatPipelineStreamError = useCallback(
    (error: unknown, fallbackMessage: string) => {
      const baseErrorMessage = error instanceof Error ? error.message : fallbackMessage;
      const checkpoint = refreshProgress?.checkpoint;
      const streamState = refreshProgress?.streamState;
      const backendHost = refreshProgress?.backendHost;
      const normalizedBackendHost = backendHost?.trim().toLowerCase() ?? "";
      const isLocalBackendHost =
        normalizedBackendHost === "127.0.0.1:8000" ||
        normalizedBackendHost === "localhost:8000" ||
        normalizedBackendHost === "[::1]:8000" ||
        normalizedBackendHost === "::1:8000";
      const isSocketDisconnect =
        /UND_ERR_SOCKET|ECONNRESET|EPIPE/i.test(baseErrorMessage) ||
        /terminated/i.test(baseErrorMessage);

      if (isLocalBackendHost && isSocketDisconnect) {
        return "Local TRR-Backend restarted while the pipeline stream was open. This usually happens in dev when backend reload is enabled. Restart with TRR_BACKEND_RELOAD=0 make dev, wait for /health to come back, then run the pipeline again.";
      }

      const contextualErrorMessage =
        (/^failed to fetch$/i.test(baseErrorMessage) || /fetch failed/i.test(baseErrorMessage)) &&
        checkpoint
          ? `Refresh stream failed during ${checkpoint}${backendHost ? ` (${backendHost})` : ""}. ${baseErrorMessage}`
          : baseErrorMessage;

      if (streamState === "failed" && checkpoint && contextualErrorMessage === fallbackMessage) {
        return `Refresh stream failed during ${checkpoint}.`;
      }

      return contextualErrorMessage;
    },
    [refreshProgress]
  );

  const applyPipelineOperationEnvelope = useCallback(
    (input: {
      eventType: string;
      payload: unknown;
      fallbackPhase: string;
      fallbackMessage: string;
      logStage: string;
      runId: string;
    }) => {
      if (!input.payload || typeof input.payload !== "object" || Array.isArray(input.payload)) return;
      const payload = input.payload as Record<string, unknown>;
      const detailMessage = buildOperationDispatchDetailMessage({
        eventType: input.eventType,
        status: typeof payload.status === "string" ? payload.status : null,
        attached: payload.attached === true,
        executionOwner: typeof payload.execution_owner === "string" ? payload.execution_owner : null,
        executionBackendCanonical:
          typeof payload.execution_backend_canonical === "string" ? payload.execution_backend_canonical : null,
        executionModeCanonical:
          typeof payload.execution_mode_canonical === "string" ? payload.execution_mode_canonical : null,
      });
      if (!detailMessage) return;
      const operationStatus =
        input.eventType === "dispatched_to_modal"
          ? ("queued" satisfies CanonicalOperationStatus)
          : canonicalizeOperationStatus(
              typeof payload.status === "string" ? payload.status : null,
              "queued",
            );
      setRefreshProgress((prev) => ({
        current: prev?.current ?? null,
        total: prev?.total ?? null,
        phase: prev?.phase ?? input.fallbackPhase,
        rawStage: prev?.rawStage ?? input.logStage,
        message: detailMessage,
        detailMessage,
        runId: input.runId,
        lastEventAt: Date.now(),
        checkpoint: prev?.checkpoint ?? null,
        streamState: prev?.streamState ?? "connecting",
        errorCode: prev?.errorCode ?? null,
        attemptElapsedMs: prev?.attemptElapsedMs ?? null,
        attemptTimeoutMs: prev?.attemptTimeoutMs ?? null,
        backendHost: prev?.backendHost ?? null,
        sourceProgress: prev?.sourceProgress ?? null,
        gettyProgress: prev?.gettyProgress ?? null,
        executionOwner: typeof payload.execution_owner === "string" ? payload.execution_owner : prev?.executionOwner ?? null,
        executionModeCanonical:
          typeof payload.execution_mode_canonical === "string"
            ? payload.execution_mode_canonical
            : prev?.executionModeCanonical ?? null,
        executionBackendCanonical:
          typeof payload.execution_backend_canonical === "string"
            ? payload.execution_backend_canonical
            : prev?.executionBackendCanonical ?? null,
        operationStatus,
      }));
      appendRefreshLog({
        source: "page_refresh",
        stage: input.logStage,
        message: input.fallbackMessage,
        detail: detailMessage,
        level: "info",
        runId: input.runId,
      });
    },
    [appendRefreshLog]
  );

  const applyRefreshResumeEvent = useCallback(
    async (eventType: string, payload: unknown, requestId: string) => {
      if (eventType === "operation" || eventType === "dispatched_to_modal") {
        applyPipelineOperationEnvelope({
          eventType,
          payload,
          fallbackPhase: PERSON_REFRESH_PHASES.syncing,
          fallbackMessage:
            eventType === "dispatched_to_modal" ? "Refresh dispatched to Modal." : "Refresh operation update.",
          logStage: "operation",
          runId: requestId,
        });
        return;
      }
      if (eventType === "progress" && payload && typeof payload === "object" && !Array.isArray(payload)) {
        const record = payload as Record<string, unknown>;
        const rawStage = typeof record.stage === "string" ? record.stage : typeof record.phase === "string" ? record.phase : null;
        const mappedPhase = mapPersonRefreshStage(rawStage);
        const message = typeof record.message === "string" ? record.message : null;
        const heartbeat = record.heartbeat === true;
        const elapsedMs = parseOptionalProgressNumber(record.elapsed_ms);
        const current = parseOptionalProgressNumber(record.current);
        const total = parseOptionalProgressNumber(record.total);
        const checkpoint = typeof record.checkpoint === "string" ? record.checkpoint : null;
        const streamStateRaw = record.stream_state;
        const streamState =
          streamStateRaw === "connecting" ||
          streamStateRaw === "connected" ||
          streamStateRaw === "streaming" ||
          streamStateRaw === "failed" ||
          streamStateRaw === "completed"
            ? streamStateRaw
            : null;
        const errorCode = typeof record.error_code === "string" ? record.error_code : null;
        const backendHost = typeof record.backend_host === "string" ? record.backend_host : null;
        const source = typeof record.source === "string" ? record.source : null;
        const sourceTotal = parseOptionalProgressNumber(record.source_total);
        const mirroredCount = parseOptionalProgressNumber(record.mirrored_count);
        const reviewedRows = parseOptionalProgressNumber(record.reviewed_rows);
        const changedRows = parseOptionalProgressNumber(record.changed_rows);
        const totalRows = parseOptionalProgressNumber(record.total_rows);
        const failedRows = parseOptionalProgressNumber(record.failed_rows);
        const skippedRows = parseOptionalProgressNumber(
          record.skipped_rows ?? record.skipped_existing_rows ?? record.skipped_manual_rows,
        );
        const forceStatusRaw = record.force_status;
        const forceStatus =
          forceStatusRaw === "pending" ||
          forceStatusRaw === "running" ||
          forceStatusRaw === "completed" ||
          forceStatusRaw === "warning" ||
          forceStatusRaw === "skipped" ||
          forceStatusRaw === "failed"
            ? forceStatusRaw
            : null;
        const skipReason = typeof record.skip_reason === "string" ? record.skip_reason : null;
        const detail = typeof record.detail === "string" ? record.detail : null;
        const serviceUnavailable = record.service_unavailable === true;
        const retryAfterS = parseOptionalProgressNumber(record.retry_after_s);
        const sourceProgress = normalizePersonRefreshSourceProgress(record.source_progress);
        const gettyProgress = normalizePersonGettyProgress(record.getty_progress);
        const sourceSyncCounts = summarizePersonRefreshSourceProgress(sourceProgress);
        const nextLiveCounts = resolveJobLiveCounts(refreshLiveCounts, payload);
        setRefreshLiveCounts(nextLiveCounts);
        const baseDetailMessage = buildPersonRefreshDetailMessage({
          rawStage,
          message,
          heartbeat,
          elapsedMs,
          source,
          sourceTotal,
          mirroredCount,
          current,
          total,
          skipReason,
          detail,
          serviceUnavailable,
          retryAfterS,
          reviewedRows,
          changedRows,
          totalRows,
          failedRows,
          skippedRows,
        });
        const enrichedMessage = appendLiveCountsToMessage(baseDetailMessage ?? message ?? "", nextLiveCounts);
        setRefreshProgress((prev) => ({
          current: sourceSyncCounts?.current ?? current,
          total: sourceSyncCounts?.total ?? total,
          phase: mappedPhase ?? rawStage,
          rawStage,
          message: enrichedMessage || baseDetailMessage || message || null,
          detailMessage: enrichedMessage || baseDetailMessage || message || null,
          runId: requestId,
          lastEventAt: Date.now(),
          checkpoint,
          streamState,
          errorCode,
          attemptElapsedMs: null,
          attemptTimeoutMs: null,
          backendHost,
          sourceProgress,
          gettyProgress,
          executionOwner: prev?.executionOwner ?? null,
          executionModeCanonical: prev?.executionModeCanonical ?? null,
          executionBackendCanonical: prev?.executionBackendCanonical ?? null,
          operationStatus: "running",
        }));
        setRefreshPipelineSteps((prev) =>
          updatePersonRefreshPipelineSteps(prev ?? createPersonRefreshPipelineSteps("ingest"), {
            rawStage,
            message: enrichedMessage || baseDetailMessage || message,
            current: sourceSyncCounts?.current ?? current,
            total: sourceSyncCounts?.total ?? total,
            heartbeat,
            skipReason,
            serviceUnavailable,
            detail,
            forceStatus,
          }),
        );
        if (!heartbeat) {
          appendRefreshLog({
            source: "page_refresh",
            stage: rawStage ?? "resume_progress",
            message: enrichedMessage || "Refresh progress update",
            level: "info",
            runId: requestId,
          });
        }
        return;
      }
      if (eventType === "complete") {
        const requestIdFromPayload =
          payload && typeof payload === "object" && !Array.isArray(payload) && typeof (payload as { request_id?: unknown }).request_id === "string"
            ? (payload as { request_id: string }).request_id
            : requestId;
        const completeLiveCounts = resolveJobLiveCounts(refreshLiveCounts, payload);
        setRefreshLiveCounts(completeLiveCounts);
        const summary =
          payload && typeof payload === "object" && !Array.isArray(payload) && "summary" in payload
            ? (payload as { summary?: unknown }).summary
            : payload;
        const sourceProgress = normalizePersonRefreshSourceProgress(
          summary && typeof summary === "object" && !Array.isArray(summary)
            ? (summary as { source_progress?: unknown }).source_progress
            : undefined,
        );
        const gettyProgress = normalizePersonGettyProgress(
          summary && typeof summary === "object" && !Array.isArray(summary)
            ? (summary as { getty_progress?: unknown }).getty_progress
            : undefined,
        );
        const summaryText = formatPersonRefreshSummary(summary);
        const liveCountSuffix = formatJobLiveCounts(completeLiveCounts);
        const completionMessage =
          summaryText
            ? `${summaryText}${liveCountSuffix ? `. ${liveCountSuffix}` : ""}. Reloading page data...`
            : liveCountSuffix
              ? `Images refreshed. ${liveCountSuffix}. Reloading page data...`
              : "Images refreshed. Reloading page data...";
        setRefreshPipelineSteps((prev) =>
          finalizePersonRefreshPipelineSteps(prev ?? createPersonRefreshPipelineSteps("ingest"), "ingest", summary),
        );
        setRefreshProgress((prev) => ({
          current: null,
          total: null,
          phase: "COMPLETED",
          rawStage: "complete",
          message: completionMessage,
          detailMessage: completionMessage,
          runId: requestIdFromPayload,
          lastEventAt: null,
          checkpoint: "complete",
          streamState: "completed",
          errorCode: null,
          attemptElapsedMs: prev?.attemptElapsedMs ?? null,
          attemptTimeoutMs: prev?.attemptTimeoutMs ?? null,
          backendHost: prev?.backendHost ?? null,
          sourceProgress,
          gettyProgress,
          executionOwner: prev?.executionOwner ?? null,
          executionModeCanonical: prev?.executionModeCanonical ?? null,
          executionBackendCanonical: prev?.executionBackendCanonical ?? null,
          operationStatus: "completed",
        }));
        setRefreshNotice(
          summaryText
            ? `${summaryText}${liveCountSuffix ? `. ${liveCountSuffix}` : ""}`
            : liveCountSuffix
              ? `Images refreshed. ${liveCountSuffix}`
              : "Images refreshed.",
        );
        appendRefreshLog({
          source: "page_refresh",
          stage: "complete",
          message: summaryText || "Images refreshed.",
          detail: liveCountSuffix,
          level: "success",
          runId: requestIdFromPayload,
        });
        return;
      }
      if (eventType === "error") {
        const errorPayload =
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? (payload as Record<string, unknown>)
            : null;
        const errorText =
          typeof errorPayload?.error === "string" && typeof errorPayload?.detail === "string"
            ? `${errorPayload.error}: ${errorPayload.detail}`
            : typeof errorPayload?.error === "string"
              ? errorPayload.error
              : "Failed to get images";
        setRefreshError(errorText);
        setRefreshPipelineSteps((prev) =>
          updatePersonRefreshPipelineSteps(prev ?? createPersonRefreshPipelineSteps("ingest"), {
            rawStage: typeof errorPayload?.stage === "string" ? errorPayload.stage : null,
            message: typeof errorPayload?.error === "string" ? errorPayload.error : errorText,
            detail: typeof errorPayload?.detail === "string" ? errorPayload.detail : null,
            current: null,
            total: null,
            forceStatus: "failed",
          }),
        );
        appendRefreshLog({
          source: "page_refresh",
          stage: "refresh_error",
          message: "Get Images failed",
          detail: errorText,
          level: "error",
          runId: requestId,
        });
        setRefreshProgress((prev) =>
          prev
            ? {
                ...prev,
                detailMessage: errorText,
                lastEventAt: Date.now(),
                operationStatus:
                  String(errorPayload?.status ?? "").toLowerCase().includes("cancel") ? "cancelled" : "failed",
              }
            : prev,
        );
      }
    },
    [
      appendRefreshLog,
      applyPipelineOperationEnvelope,
      parseOptionalProgressNumber,
      refreshLiveCounts,
    ]
  );

  const applyReprocessResumeEvent = useCallback(
    async (eventType: string, payload: unknown, requestId: string) => {
      if (eventType === "operation" || eventType === "dispatched_to_modal") {
        applyPipelineOperationEnvelope({
          eventType,
          payload,
          fallbackPhase: PERSON_REFRESH_PHASES.tagging,
          fallbackMessage:
            eventType === "dispatched_to_modal" ? "Reprocess dispatched to Modal." : "Reprocess operation update.",
          logStage: "operation",
          runId: requestId,
        });
        return;
      }
      if (eventType === "progress" && payload && typeof payload === "object" && !Array.isArray(payload)) {
        const record = payload as Record<string, unknown>;
        const rawPhase = typeof record.stage === "string" ? record.stage : null;
        const mappedPhase = mapPersonRefreshStage(rawPhase);
        const message = typeof record.message === "string" ? record.message : null;
        const current = parseOptionalProgressNumber(record.current);
        const total = parseOptionalProgressNumber(record.total);
        const checkpoint = typeof record.checkpoint === "string" ? record.checkpoint : null;
        const streamStateRaw = record.stream_state;
        const streamState =
          streamStateRaw === "connecting" ||
          streamStateRaw === "connected" ||
          streamStateRaw === "streaming" ||
          streamStateRaw === "failed" ||
          streamStateRaw === "completed"
            ? streamStateRaw
            : null;
        const errorCode = typeof record.error_code === "string" ? record.error_code : null;
        const backendHost = typeof record.backend_host === "string" ? record.backend_host : null;
        const elapsedMs = parseOptionalProgressNumber(record.elapsed_ms);
        const heartbeat = record.heartbeat === true;
        const source = typeof record.source === "string" ? record.source : null;
        const sourceTotal = parseOptionalProgressNumber(record.source_total);
        const mirroredCount = parseOptionalProgressNumber(record.mirrored_count);
        const reviewedRows = parseOptionalProgressNumber(record.reviewed_rows);
        const changedRows = parseOptionalProgressNumber(record.changed_rows);
        const totalRows = parseOptionalProgressNumber(record.total_rows);
        const failedRows = parseOptionalProgressNumber(record.failed_rows);
        const skippedRows = parseOptionalProgressNumber(
          record.skipped_rows ?? record.skipped_existing_rows ?? record.skipped_manual_rows,
        );
        const forceStatusRaw = record.force_status;
        const forceStatus =
          forceStatusRaw === "pending" ||
          forceStatusRaw === "running" ||
          forceStatusRaw === "completed" ||
          forceStatusRaw === "warning" ||
          forceStatusRaw === "skipped" ||
          forceStatusRaw === "failed"
            ? forceStatusRaw
            : null;
        const skipReason = typeof record.skip_reason === "string" ? record.skip_reason : null;
        const detail = typeof record.detail === "string" ? record.detail : null;
        const serviceUnavailable = record.service_unavailable === true;
        const retryAfterS = parseOptionalProgressNumber(record.retry_after_s);
        const nextLiveCounts = resolveJobLiveCounts(refreshLiveCounts, payload);
        setRefreshLiveCounts(nextLiveCounts);
        const baseDetailMessage = buildPersonRefreshDetailMessage({
          rawStage: rawPhase,
          message,
          heartbeat,
          elapsedMs,
          source,
          sourceTotal,
          mirroredCount,
          current,
          total,
          skipReason,
          detail,
          serviceUnavailable,
          retryAfterS,
          reviewedRows,
          changedRows,
          totalRows,
          failedRows,
          skippedRows,
        });
        const enrichedMessage = appendLiveCountsToMessage(baseDetailMessage ?? message ?? "", nextLiveCounts);
        setRefreshProgress((prev) => ({
          current,
          total,
          phase: mappedPhase ?? rawPhase,
          message: enrichedMessage || baseDetailMessage || message || null,
          detailMessage: enrichedMessage || baseDetailMessage || message || null,
          runId: requestId,
          rawStage: rawPhase,
          lastEventAt: Date.now(),
          checkpoint,
          streamState,
          errorCode,
          attemptElapsedMs: null,
          attemptTimeoutMs: null,
          backendHost,
          executionOwner: prev?.executionOwner ?? null,
          executionModeCanonical: prev?.executionModeCanonical ?? null,
          executionBackendCanonical: prev?.executionBackendCanonical ?? null,
          operationStatus: "running",
        }));
        setRefreshPipelineSteps((prev) =>
          updatePersonRefreshPipelineSteps(prev ?? createPersonRefreshPipelineSteps("reprocess"), {
            rawStage: rawPhase,
            message: enrichedMessage || baseDetailMessage || message,
            current,
            total,
            heartbeat,
            skipReason,
            serviceUnavailable,
            detail,
            forceStatus,
          }),
        );
        if (!heartbeat) {
          appendRefreshLog({
            source: "page_refresh",
            stage: rawPhase ?? "reprocess_progress",
            message: enrichedMessage || baseDetailMessage || message || "Person pipeline progress update",
            level: "info",
            runId: requestId,
          });
        }
        return;
      }
      if (eventType === "complete") {
        const requestIdFromPayload =
          payload && typeof payload === "object" && !Array.isArray(payload) && typeof (payload as { request_id?: unknown }).request_id === "string"
            ? (payload as { request_id: string }).request_id
            : requestId;
        const completeLiveCounts = resolveJobLiveCounts(refreshLiveCounts, payload);
        setRefreshLiveCounts(completeLiveCounts);
        const summary =
          payload && typeof payload === "object" && !Array.isArray(payload) && "summary" in payload
            ? (payload as { summary?: unknown }).summary
            : payload;
        const summaryText = formatPersonRefreshSummary(summary);
        const liveCountSuffix = formatJobLiveCounts(completeLiveCounts);
        const completionMessage =
          summaryText
            ? `${summaryText}${liveCountSuffix ? `. ${liveCountSuffix}` : ""}. Reloading photos...`
            : liveCountSuffix
              ? `Reprocessing complete. ${liveCountSuffix}. Reloading photos...`
              : "Reprocessing complete. Reloading photos...";
        setRefreshPipelineSteps((prev) =>
          finalizePersonRefreshPipelineSteps(prev ?? createPersonRefreshPipelineSteps("reprocess"), "reprocess", summary),
        );
        setRefreshProgress((prev) => ({
          current: null,
          total: null,
          phase: "COMPLETED",
          rawStage: "complete",
          message: completionMessage,
          detailMessage: completionMessage,
          runId: requestIdFromPayload,
          lastEventAt: null,
          checkpoint: "complete",
          streamState: "completed",
          errorCode: null,
          attemptElapsedMs: null,
          attemptTimeoutMs: null,
          backendHost: null,
          executionOwner: prev?.executionOwner ?? null,
          executionModeCanonical: prev?.executionModeCanonical ?? null,
          executionBackendCanonical: prev?.executionBackendCanonical ?? null,
          operationStatus: "completed",
        }));
        setRefreshNotice(
          summaryText
            ? `${summaryText}${liveCountSuffix ? `. ${liveCountSuffix}` : ""}`
            : liveCountSuffix
              ? `Reprocessing complete. ${liveCountSuffix}`
              : "Reprocessing complete.",
        );
        appendRefreshLog({
          source: "page_refresh",
          stage: "reprocess_complete",
          message: summaryText || "Reprocessing complete.",
          detail: liveCountSuffix,
          level: "success",
          runId: requestIdFromPayload,
        });
        return;
      }
      if (eventType === "error") {
        const errorPayload =
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? (payload as Record<string, unknown>)
            : null;
        const errorText =
          typeof errorPayload?.error === "string" && typeof errorPayload?.detail === "string"
            ? `${errorPayload.error}: ${errorPayload.detail}`
            : typeof errorPayload?.error === "string"
              ? errorPayload.error
              : "Failed to reprocess images";
        setRefreshError(errorText);
        setRefreshPipelineSteps((prev) =>
          updatePersonRefreshPipelineSteps(prev ?? createPersonRefreshPipelineSteps("reprocess"), {
            rawStage: typeof errorPayload?.stage === "string" ? errorPayload.stage : null,
            message: typeof errorPayload?.error === "string" ? errorPayload.error : errorText,
            detail: typeof errorPayload?.detail === "string" ? errorPayload.detail : null,
            current: null,
            total: null,
            forceStatus: "failed",
          }),
        );
        appendRefreshLog({
          source: "page_refresh",
          stage: "reprocess_error",
          message: "Run Person Pipeline failed",
          detail: errorText,
          level: "error",
          runId: requestId,
        });
        setRefreshProgress((prev) =>
          prev
            ? {
                ...prev,
                detailMessage: errorText,
                lastEventAt: Date.now(),
                operationStatus:
                  String(errorPayload?.status ?? "").toLowerCase().includes("cancel") ? "cancelled" : "failed",
              }
            : prev,
        );
      }
    },
    [
      appendRefreshLog,
      applyPipelineOperationEnvelope,
      parseOptionalProgressNumber,
      refreshLiveCounts,
    ]
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

  const { person, setPerson, fetchPerson } = usePersonProfileController({
    personId,
    getAuthHeaders,
    onError: setError,
  });

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
  const personRouteShowContext = useMemo(
    () => showSlugForRouting ?? resolvedShowIdParam,
    [resolvedShowIdParam, showSlugForRouting],
  );

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

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    photosNextOffsetRef.current = photosNextOffset;
  }, [photosNextOffset]);

  const setTab = useTabRouteNavigation<TabId>({
    router,
    setActiveTab,
    buildHref: (tab) => {
      if (!personSlugForRouting) return null;
      return buildPersonAdminUrl({
        personSlug: personSlugForRouting,
        tab,
        showId: personRouteShowContext ?? undefined,
        query: personQueryContext,
      }) as Route;
    },
  });

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
  const [galleryShowFilter, setGalleryShowFilter] = useState<GalleryShowFilter>("all");
  const [selectedOtherShowKey, setSelectedOtherShowKey] = useState<string>("all");
  const [selectedEventSubcategoryKey, setSelectedEventSubcategoryKey] = useState<string>("all");
  const [selectedEventBucketKey, setSelectedEventBucketKey] = useState<string>("all");
  const [seasonPremiereMap, setSeasonPremiereMap] = useState<Record<number, string>>({});
  useEffect(() => {
    if (!showIdParam) {
      setGalleryShowFilter("all");
      return;
    }
    setGalleryShowFilter((prev) => (prev === "all" ? "all" : prev));
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
    showScopedCredits?.show_name?.trim() ||
    activeShow?.show_name?.trim() ||
    resolvedShowNameForRouting?.trim() ||
    null;
  const activeShowAcronym = useMemo(
    () => buildShowAcronym(activeShowName),
    [activeShowName]
  );
  const activeShowChipLabel =
    getShowDisplayLabel(activeShowName) ??
    (showSlugForRouting ? humanizeSlug(showSlugForRouting) : "This Show");
  const activeShowFilterLabel =
    activeShowName ??
    activeShowAcronym ??
    (showSlugForRouting ? humanizeSlug(showSlugForRouting) : "This Show");
  const knownShowOptions = useMemo(() => {
    return buildPersonGalleryShowOptions(photos);
  }, [photos]);
  const activeShowOption = useMemo(() => {
    if (!activeShowName && !showIdForApi) return null;
    const targetShowId = showIdForApi?.trim();
    const targetShowName = activeShowName?.trim().toLowerCase() ?? null;
    if (!targetShowId && !targetShowName) return null;
    return (
      knownShowOptions.find((option) => {
        if (targetShowId && option.showId && option.showId === targetShowId) {
          return true;
        }
        return targetShowName ? option.showName.toLowerCase() === targetShowName : false;
      }) ?? null
    );
  }, [activeShowName, knownShowOptions, showIdForApi]);
  const otherKnownShowOptions = useMemo(
    () =>
      activeShowOption
        ? knownShowOptions.filter((option) => option.key !== activeShowOption.key)
        : knownShowOptions,
    [activeShowOption, knownShowOptions]
  );
  const allKnownShowNameMatches = useMemo(
    () => knownShowOptions.map((option) => option.showName.toLowerCase()),
    [knownShowOptions]
  );
  const allKnownShowAcronymMatches = useMemo(() => {
    const acronyms = new Set<string>();
    for (const option of knownShowOptions) {
      if (option.acronym) acronyms.add(option.acronym.toUpperCase());
    }
    return acronyms;
  }, [knownShowOptions]);
  const allKnownShowIds = useMemo(
    () => knownShowOptions.map((option) => option.showId).filter((value): value is string => Boolean(value)),
    [knownShowOptions]
  );
  const otherShowNameMatches = useMemo(
    () => otherKnownShowOptions.map((option) => option.showName.toLowerCase()),
    [otherKnownShowOptions]
  );
  const otherShowAcronymMatches = useMemo(() => {
    const acronyms = new Set<string>();
    for (const option of otherKnownShowOptions) {
      if (option.acronym) acronyms.add(option.acronym.toUpperCase());
    }
    return acronyms;
  }, [otherKnownShowOptions]);
  const selectedOtherShow = useMemo(
    () => knownShowOptions.find((option) => option.key === selectedOtherShowKey) ?? null,
    [knownShowOptions, selectedOtherShowKey]
  );
  const wwhlShowOption = useMemo(() => {
    const credit = galleryFilterCreditsSource.find((entry) => isWwhlShowName(entry.show_name));
    if (!credit) return null;
    const showName = credit.show_name?.trim() ?? null;
    if (!credit.show_id && !showName) return null;
    return {
      showId: credit.show_id ?? null,
      showName,
    };
  }, [galleryFilterCreditsSource]);
  const hasWwhlCredit = useMemo(
    () => galleryFilterCreditsSource.some((credit) => isWwhlShowName(credit.show_name)),
    [galleryFilterCreditsSource]
  );
  const canSelectWwhlWithoutMatches = hasWwhlCredit;
  const canSelectOtherShowWithoutMatches = selectedOtherShow !== null;
  const effectiveGalleryImportContext = useMemo(
    () =>
      resolvePersonGalleryImportContext({
        galleryShowFilter,
        routeShow: {
          showId: showIdForApi,
          showName: activeShowName,
          label: activeShowFilterLabel,
        },
        selectedOtherShow,
        wwhlShow: wwhlShowOption,
      }),
    [
      activeShowFilterLabel,
      activeShowName,
      galleryShowFilter,
      selectedOtherShow,
      showIdForApi,
      wwhlShowOption,
    ]
  );
  const effectiveGalleryImportLabel = effectiveGalleryImportContext.label;
  const effectiveGalleryImportSuffix = effectiveGalleryImportLabel
    ? ` for ${effectiveGalleryImportLabel}`
    : "";

  useEffect(() => {
    if (selectedOtherShowKey === "all") return;
    if (knownShowOptions.some((option) => option.key === selectedOtherShowKey)) return;
    setSelectedOtherShowKey("all");
  }, [knownShowOptions, selectedOtherShowKey]);

  const mediaViewAvailability = useMemo(() =>
    computePersonGalleryMediaViewAvailability({
      photos,
      showIdForApi,
      activeShowName,
      activeShowAcronym,
      allKnownShowNameMatches,
      allKnownShowAcronymMatches,
      allKnownShowIds,
      otherShowNameMatches,
      otherShowAcronymMatches,
    }), [
    activeShowAcronym,
    activeShowName,
    allKnownShowAcronymMatches,
    allKnownShowIds,
    allKnownShowNameMatches,
    otherShowAcronymMatches,
    otherShowNameMatches,
    photos,
    showIdForApi,
  ]);

  const {
    hasWwhlMatches,
    hasBravoconMatches,
    hasEventMatches,
    eventSubcategoryOptions,
    eventOptions,
    hasOtherShowMatches,
    hasUnknownShowMatches,
    hasNonThisShowMatches,
  } = mediaViewAvailability;

  const galleryFilterCounts = useMemo(() => {
    const counts = {
      all: photos.length,
      thisShow: 0,
      wwhl: 0,
      bravocon: 0,
      events: 0,
      unsorted: 0,
      otherShowByKey: new Map<string, number>(),
      eventSubcategoryByKey: new Map<string, number>(),
    };
    for (const photo of photos) {
      const bucketMatches = computePersonPhotoShowBuckets({
        photo,
        showIdForApi,
        activeShowName,
        activeShowAcronym,
        allKnownShowNameMatches,
        allKnownShowAcronymMatches,
        allKnownShowIds,
        otherShowNameMatches,
        otherShowAcronymMatches,
        selectedOtherShow,
      });
      if (bucketMatches.matchesThisShow) counts.thisShow += 1;
      if (bucketMatches.matchesWwhl) counts.wwhl += 1;
      if (bucketMatches.matchesBravocon) counts.bravocon += 1;
      if (bucketMatches.matchesEvents) counts.events += 1;
      if (bucketMatches.matchesUnknownShows) counts.unsorted += 1;
      if (bucketMatches.matchesSelectedOtherShow && selectedOtherShow?.key) {
        counts.otherShowByKey.set(
          selectedOtherShow.key,
          (counts.otherShowByKey.get(selectedOtherShow.key) ?? 0) + 1,
        );
      }
      for (const option of showIdParam ? otherKnownShowOptions : knownShowOptions) {
        const optionMatches = computePersonPhotoShowBuckets({
          photo,
          showIdForApi,
          activeShowName,
          activeShowAcronym,
          allKnownShowNameMatches,
          allKnownShowAcronymMatches,
          allKnownShowIds,
          otherShowNameMatches,
          otherShowAcronymMatches,
          selectedOtherShow: option,
        });
        if (optionMatches.matchesSelectedOtherShow) {
          counts.otherShowByKey.set(option.key, (counts.otherShowByKey.get(option.key) ?? 0) + 1);
        }
      }
      for (const eventSubcategoryKey of bucketMatches.eventSubcategoryKeys) {
        counts.eventSubcategoryByKey.set(
          eventSubcategoryKey,
          (counts.eventSubcategoryByKey.get(eventSubcategoryKey) ?? 0) + 1,
        );
      }
    }
    return counts;
  }, [
    activeShowAcronym,
    activeShowName,
    allKnownShowAcronymMatches,
    allKnownShowIds,
    allKnownShowNameMatches,
    knownShowOptions,
    otherKnownShowOptions,
    otherShowAcronymMatches,
    otherShowNameMatches,
    photos,
    selectedOtherShow,
    showIdForApi,
    showIdParam,
  ]);

  useEffect(() => {
    if (eventSubcategoryOptions.length === 0) {
      setSelectedEventSubcategoryKey("all");
      return;
    }
    if (selectedEventSubcategoryKey === "all") return;
    if (eventSubcategoryOptions.some((option) => option.key === selectedEventSubcategoryKey)) return;
    setSelectedEventSubcategoryKey(eventSubcategoryOptions[0]?.key ?? "all");
  }, [eventSubcategoryOptions, selectedEventSubcategoryKey]);

  const eventOptionsForSelectedSubcategory = useMemo(() => {
    if (selectedEventSubcategoryKey === "all") return eventOptions;
    const optionsByKey = new Map<string, (typeof eventOptions)[number]>();
    for (const photo of photos) {
      const bucketMatches = computePersonPhotoShowBuckets({
        photo,
        showIdForApi,
        activeShowName,
        activeShowAcronym,
        allKnownShowNameMatches,
        allKnownShowAcronymMatches,
        allKnownShowIds,
        otherShowNameMatches,
        otherShowAcronymMatches,
        selectedOtherShow,
      });
      if (!bucketMatches.matchesEvents) continue;
      if (!bucketMatches.eventSubcategoryKeys.includes(selectedEventSubcategoryKey)) continue;
      if (!bucketMatches.eventBucketKey || !bucketMatches.eventBucketLabel) continue;
      const existing = optionsByKey.get(bucketMatches.eventBucketKey);
      const photoMetadata = (photo.metadata ?? {}) as Record<string, unknown>;
      const count = getPersonEventImageCount(photo, photoMetadata);
      optionsByKey.set(bucketMatches.eventBucketKey, {
        key: bucketMatches.eventBucketKey,
        label: bucketMatches.eventBucketLabel,
        count:
          typeof count === "number"
            ? Math.max(existing?.count ?? 0, count)
            : existing?.count ?? null,
      });
    }
    return Array.from(optionsByKey.values()).sort((left, right) => left.label.localeCompare(right.label));
  }, [
    activeShowAcronym,
    activeShowName,
    allKnownShowAcronymMatches,
    allKnownShowIds,
    allKnownShowNameMatches,
    eventOptions,
    otherShowAcronymMatches,
    otherShowNameMatches,
    photos,
    selectedEventSubcategoryKey,
    selectedOtherShow,
    showIdForApi,
  ]);

  useEffect(() => {
    if (eventOptionsForSelectedSubcategory.length === 0) {
      setSelectedEventBucketKey("all");
      return;
    }
    if (selectedEventBucketKey === "all") return;
    if (eventOptionsForSelectedSubcategory.some((option) => option.key === selectedEventBucketKey)) return;
    setSelectedEventBucketKey(eventOptionsForSelectedSubcategory[0]?.key ?? "all");
  }, [eventOptionsForSelectedSubcategory, selectedEventBucketKey]);

  const hasSelectedOtherShowMatches = useMemo(() => {
    if (!selectedOtherShow) {
      return false;
    }
    return photos.some((photo) => {
      const bucketMatches = computePersonPhotoShowBuckets({
        photo,
        showIdForApi,
        activeShowName,
        activeShowAcronym,
        allKnownShowNameMatches,
        allKnownShowAcronymMatches,
        allKnownShowIds,
        otherShowNameMatches,
        otherShowAcronymMatches,
        selectedOtherShow,
      });
      return bucketMatches.matchesSelectedOtherShow;
    });
  }, [
    activeShowAcronym,
    activeShowName,
    allKnownShowAcronymMatches,
    allKnownShowIds,
    allKnownShowNameMatches,
    otherShowAcronymMatches,
    otherShowNameMatches,
    photos,
    selectedOtherShow,
    showIdForApi,
  ]);

  const hasSelectedEventMatches = useMemo(() => {
    if (selectedEventBucketKey === "all") {
      return eventOptionsForSelectedSubcategory.length > 0;
    }
    return photos.some((photo) => {
      const bucketMatches = computePersonPhotoShowBuckets({
        photo,
        showIdForApi,
        activeShowName,
        activeShowAcronym,
        allKnownShowNameMatches,
        allKnownShowAcronymMatches,
        allKnownShowIds,
        otherShowNameMatches,
        otherShowAcronymMatches,
        selectedOtherShow,
      });
      if (
        selectedEventSubcategoryKey !== "all" &&
        !bucketMatches.eventSubcategoryKeys.includes(selectedEventSubcategoryKey)
      ) {
        return false;
      }
      return bucketMatches.matchesEvents && bucketMatches.eventBucketKey === selectedEventBucketKey;
    });
  }, [
    activeShowAcronym,
    activeShowName,
    allKnownShowAcronymMatches,
    allKnownShowIds,
    allKnownShowNameMatches,
    eventOptionsForSelectedSubcategory.length,
    otherShowAcronymMatches,
    otherShowNameMatches,
    photos,
    selectedEventBucketKey,
    selectedEventSubcategoryKey,
    selectedOtherShow,
    showIdForApi,
  ]);

  useEffect(() => {
    const nextFilter = resolveGalleryShowFilterFallback({
      currentFilter: galleryShowFilter,
      showContextEnabled: Boolean(showIdParam),
      hasWwhlMatches,
      hasBravoconMatches,
      hasEventMatches,
      hasOtherShowMatches,
      hasUnknownShowMatches,
      hasSelectedOtherShowMatches,
      hasNonThisShowMatches,
      canSelectWwhlWithoutMatches,
      canSelectOtherShowWithoutMatches,
    });
    if (nextFilter !== galleryShowFilter) {
      setGalleryShowFilter(nextFilter);
    }
  }, [
    galleryShowFilter,
    hasNonThisShowMatches,
    hasBravoconMatches,
    hasEventMatches,
    hasOtherShowMatches,
    hasUnknownShowMatches,
    hasSelectedOtherShowMatches,
    hasWwhlMatches,
    canSelectOtherShowWithoutMatches,
    canSelectWwhlWithoutMatches,
    showIdParam,
  ]);

  useEffect(() => {
    if (galleryShowFilter !== "events") return;
    if (hasEventMatches && eventOptionsForSelectedSubcategory.length === 0) {
      setSelectedEventBucketKey("all");
      return;
    }
    if (hasSelectedEventMatches) return;
    if (eventOptionsForSelectedSubcategory[0]?.key) {
      setSelectedEventBucketKey(eventOptionsForSelectedSubcategory[0].key);
      return;
    }
    setGalleryShowFilter(Boolean(showIdParam) ? "this-show" : "all");
  }, [eventOptionsForSelectedSubcategory, galleryShowFilter, hasEventMatches, hasSelectedEventMatches, showIdParam]);

  // Compute unique sources from photos
  const uniqueSources = useMemo(() => {
    const sources = new Set(photos.map(p => p.source).filter(Boolean));
    return Array.from(sources).sort();
  }, [photos]);

  const activeReferenceCount = useMemo(
    () =>
      photos.filter((photo) => {
        const metadata = photo.metadata as Record<string, unknown> | null;
        const taggingReference = metadata?.tagging_reference;
        return (
          Boolean(taggingReference) &&
          typeof taggingReference === "object" &&
          (taggingReference as Record<string, unknown>).selected === true
        );
      }).length,
    [photos]
  );

  const wantsReferences = advancedFilters.references.includes("references");
  const wantsNotReferences = advancedFilters.references.includes("not_references");
  const referencesFilterActive = wantsReferences !== wantsNotReferences;

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

  const filterPhotosByCurrentGalleryScope = useCallback((photoList: TrrPersonPhoto[]) => {
    if (galleryShowFilter === "all") return [...photoList];
    return photoList.filter((photo) => {
      const bucketMatches = computePersonPhotoShowBuckets({
        photo,
        showIdForApi,
        activeShowName,
        activeShowAcronym,
        allKnownShowNameMatches,
        allKnownShowAcronymMatches,
        allKnownShowIds,
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
      if (galleryShowFilter === "bravocon") {
        return bucketMatches.matchesBravocon;
      }
      if (galleryShowFilter === "events") {
        if (
          selectedEventSubcategoryKey !== "all" &&
          !bucketMatches.eventSubcategoryKeys.includes(selectedEventSubcategoryKey)
        ) {
          return false;
        }
        if (selectedEventBucketKey !== "all") {
          return bucketMatches.matchesEvents && bucketMatches.eventBucketKey === selectedEventBucketKey;
        }
        return bucketMatches.matchesEvents;
      }
      if (galleryShowFilter === "other-shows") {
        return selectedOtherShow
          ? bucketMatches.matchesSelectedOtherShow
          : bucketMatches.matchesOtherShows;
      }
      if (galleryShowFilter === "unsorted") {
        return bucketMatches.matchesUnknownShows;
      }
      return true;
    });
  }, [
    activeShowAcronym,
    activeShowName,
    allKnownShowAcronymMatches,
    allKnownShowIds,
    allKnownShowNameMatches,
    galleryShowFilter,
    otherShowAcronymMatches,
    otherShowNameMatches,
    selectedEventBucketKey,
    selectedEventSubcategoryKey,
    selectedOtherShow,
    showIdForApi,
  ]);

  // Filter and sort photos for gallery
  const filteredPhotos = useMemo(() => {
    let result = filterPhotosByCurrentGalleryScope(photos);

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

    // Apply references filter (if exactly one is selected)
    if (referencesFilterActive) {
      result = result.filter((photo) => {
        const metadata = photo.metadata as Record<string, unknown> | null;
        const taggingReference = metadata?.tagging_reference;
        const isReference =
          Boolean(taggingReference) &&
          typeof taggingReference === "object" &&
          (taggingReference as Record<string, unknown>).selected === true;
        return wantsReferences ? isReference : !isReference;
      });
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
    advancedFilters.sources,
    advancedFilters.text,
    advancedFilters.people,
    advancedFilters.contentTypes,
    advancedFilters.seeded,
    advancedFilters.sort,
    referencesFilterActive,
    wantsReferences,
    filterPhotosByCurrentGalleryScope,
    getPhotoSortDate,
  ]);

  const { mainGalleryPhotos, otherEventCovers } = useMemo(
    () => ({
      mainGalleryPhotos: filteredPhotos,
      otherEventCovers: [] as TrrPersonPhoto[],
    }),
    [filteredPhotos],
  );

  const scopedStageTargets = useMemo(() => buildStageTargetsFromPhotos(filteredPhotos), [filteredPhotos]);
  const fullStageTargets = useMemo(() => buildStageTargetsFromPhotos(photos), [photos]);

  const gallerySections = useMemo(() => {
    const profilePictures: TrrPersonPhoto[] = [];
    const otherPhotos: TrrPersonPhoto[] = [];

    for (const photo of mainGalleryPhotos.slice(0, photosVisibleCount)) {
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
  }, [mainGalleryPhotos, photosVisibleCount]);

  const filteredPhotoIndexById = useMemo(() => {
    const indexMap = new Map<string, number>();
    filteredPhotos.forEach((photo, index) => indexMap.set(photo.id, index));
    return indexMap;
  }, [filteredPhotos]);

  useEffect(() => {
    setPhotosVisibleCount(PERSON_GALLERY_VISIBLE_INCREMENT);
  }, [galleryShowFilter, selectedOtherShowKey, selectedEventBucketKey, advancedFilters]);

  const flushSecondaryReadQueue = useCallback(() => {
    while (
      secondaryReadsInFlightRef.current < PERSON_SECONDARY_READ_CONCURRENCY &&
      secondaryReadQueueRef.current.length > 0
    ) {
      const next = secondaryReadQueueRef.current.shift();
      if (!next) break;
      secondaryReadsInFlightRef.current += 1;
      next();
    }
  }, []);

  const runSecondaryRead = useCallback(
    (task: () => Promise<unknown>): Promise<unknown> =>
      new Promise((resolve, reject) => {
        const start = () => {
          void task()
            .then(resolve)
            .catch(reject)
            .finally(() => {
              secondaryReadsInFlightRef.current = Math.max(0, secondaryReadsInFlightRef.current - 1);
              flushSecondaryReadQueue();
            });
        };
        secondaryReadQueueRef.current.push(start);
        flushSecondaryReadQueue();
      }),
    [flushSecondaryReadQueue],
  );

  const {
    externalIdDrafts,
    externalIdsLoading,
    externalIdsSaving,
    externalIdsError,
    externalIdsNotice,
    fetchExternalIds,
    saveExternalIds,
    handleChangeExternalIdDraft,
    handleAddExternalIdDraft,
    handleRemoveExternalIdDraft,
    canonicalSourceOrder,
    canonicalSourceOrderDirty,
    canonicalSourceOrderSaving,
    canonicalSourceOrderError,
    canonicalSourceOrderNotice,
    moveCanonicalSource,
    resetCanonicalSourceOrder,
    saveCanonicalSourceOrder,
  } = usePersonSettingsController({
    personId,
    person,
    setPerson,
    fetchPerson: () => fetchPerson(),
    getAuthHeaders,
    hasAccess,
    settingsTabActive: activeTab === "settings",
    runSecondaryRead,
  });

  usePersonProfileLoad({
    hasAccess,
    personId,
    fetchPerson,
    setLoading,
  });

  const fetchBestActivePersonPipelineOperation = useCallback(
    async (operationTypes?: readonly PersonPipelineOperationType[]) => {
      if (!personId) return null;
      try {
        const headers = await getAuthHeaders();
        const response = await fetchAdminWithAuth(
          "/api/admin/trr-api/operations/health?limit=100",
          {
            method: "GET",
            headers,
          },
          { allowDevAdminBypass: true },
        );
        if (!response.ok) {
          console.warn("Failed to load active admin operations", { status: response.status, personId });
          return null;
        }
        const payload = (await response.json().catch(() => ({}))) as {
          active_operations?: unknown;
        };
        const requestedTypes = new Set(
          (operationTypes && operationTypes.length > 0 ? operationTypes : PERSON_PIPELINE_OPERATION_TYPES).map((value) =>
            String(value),
          ),
        );
        const activeOperations = Array.isArray(payload.active_operations) ? payload.active_operations : [];
        const candidates = activeOperations
          .map((entry) => (asRecord(entry) as AdminOperationHealthEntry | null))
          .filter((entry): entry is AdminOperationHealthEntry => Boolean(entry?.id))
          .filter((entry) => requestedTypes.has(String(entry.operation_type || "")))
          .filter((entry) => extractPersonIdFromOperationHealthEntry(entry) === personId)
          .sort((left, right) => scorePersonPipelineOperationCandidate(right) - scorePersonPipelineOperationCandidate(left));
        return candidates[0] ?? null;
      } catch (error) {
        console.warn("Failed to load active admin operations", { personId, error });
        return null;
      }
    },
    [getAuthHeaders, personId],
  );

  useEffect(() => {
    if (!showIdParam || !hasAccess) {
      setResolvedShowIdParam(null);
      setResolvedShowSlugParam(null);
      setResolvedShowNameForRouting(null);
      return;
    }
    if (looksLikeUuid(showIdParam)) {
      setResolvedShowIdParam(showIdParam);
      setResolvedShowSlugParam(null);
      setResolvedShowNameForRouting(null);
      return;
    }

    let cancelled = false;
    const resolveSlug = async () => {
      try {
        const headers = await getAuthHeaders();
        const data = await adminGetJson<{
          error?: string;
          resolved?: {
            show_id?: string | null;
            canonical_slug?: string | null;
            slug?: string | null;
            show_name?: string | null;
          };
        }>(`/api/admin/trr-api/shows/resolve-slug?slug=${encodeURIComponent(showIdParam)}`, {
          headers,
          requestRole: "primary",
          dedupeKey: `show:resolve:${showIdParam}`,
        });
        const resolvedId =
          typeof data.resolved?.show_id === "string" && looksLikeUuid(data.resolved.show_id)
            ? data.resolved.show_id
            : null;
        if (!resolvedId) {
          throw new Error("Resolved show slug did not return a valid show id.");
        }
        if (cancelled) return;
        setResolvedShowIdParam(resolvedId);
        setResolvedShowNameForRouting(
          typeof data.resolved?.show_name === "string" ? data.resolved.show_name : null
        );
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
        setResolvedShowNameForRouting(null);
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
        query.set("request_role", "primary");
        const data = await adminGetJson<{
          error?: string;
          resolved?: { person_id?: string | null; canonical_slug?: string | null; slug?: string | null };
        }>(`/api/admin/trr-api/people/resolve-slug?${query.toString()}`, {
          headers,
          requestRole: "primary",
          dedupeKey: `person:resolve:${query.toString()}`,
        });
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
    const canonicalUrl = buildPersonAdminUrl({
      personSlug: personSlugForRouting,
      tab: personRouteState.tab,
      showId: personRouteShowContext ?? undefined,
      query: personQueryContext,
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
    personQueryContext,
    personRouteShowContext,
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

  // Fetch photos
  const fetchPhotos = useCallback(async (options?: {
    signal?: AbortSignal;
    includeBroken?: boolean;
    append?: boolean;
    ensurePhotoId?: string | null;
    loadAll?: boolean;
    includeTotalCount?: boolean;
    requestRole?: "primary" | "secondary";
  }): Promise<TrrPersonPhoto[]> => {
    if (!personId) return [];
    const signal = options?.signal;
    const includeBroken = options?.includeBroken ?? showBrokenRowsRef.current;
    const append = options?.append === true;
    const loadAll = options?.loadAll === true;
    const includeTotalCount = options?.includeTotalCount !== false;
    const requestRole = options?.requestRole ?? (append || loadAll ? "secondary" : "primary");
    const ensurePhotoId =
      typeof options?.ensurePhotoId === "string" && options.ensurePhotoId.trim().length > 0
        ? options.ensurePhotoId.trim()
        : null;
    if (signal?.aborted) return [];
    const requestStartOffset = append ? Math.max(0, photosNextOffsetRef.current) : 0;
    const requestKey = [
      personId,
      includeBroken ? "broken" : "clean",
      append ? "append" : "replace",
      loadAll ? "all" : "page",
      includeTotalCount ? "count" : "deferred-count",
      requestRole,
      ensurePhotoId ?? "",
      requestStartOffset,
    ].join(":");
    if (photosRequestKeyRef.current === requestKey && photosInFlightRef.current) {
      return photosInFlightRef.current;
    }

    const requestPromise = (async (): Promise<TrrPersonPhoto[]> => {
      const startedAt = Date.now();
      logAdminPageReadDiagnostic({
        pageFamily: "people-gallery",
        resource: append ? "gallery-append" : "gallery-primary-slice",
        requestRole,
        phase: "start",
      });
      try {
        const headers = await getAuthHeaders();
        const pageSize = PERSON_GALLERY_INITIAL_PAGE_SIZE;
        const fetchedPhotos: TrrPersonPhoto[] = append ? [...photosRef.current] : [];
        let offset = requestStartOffset;
        let pageCount = 0;
        while (true) {
          if (signal?.aborted) return [];
          pageCount += 1;
          if (pageCount > MAX_PHOTO_FETCH_PAGES) {
            throw new Error("Photo pagination exceeded safety limit.");
          }
          try {
            const params = new URLSearchParams({
              limit: String(pageSize),
              offset: String(offset),
              request_role: requestRole,
            });
            if (includeBroken) {
              params.set("include_broken", "true");
            }
            if (!includeTotalCount) {
              params.set("include_total_count", "false");
            }
            const data = await adminGetJson<{
              photos?: TrrPersonPhoto[];
              pagination?: PersonGalleryPagination;
            }>(`/api/admin/trr-api/people/${personId}/photos?${params.toString()}`, {
              headers,
              externalSignal: signal,
              requestRole,
              dedupeKey: `person:${personId}:photos:${params.toString()}`,
            });
            if (signal?.aborted) return [];
            const pagePhotos = Array.isArray(data.photos) ? data.photos : [];
            const pagination = readPersonGalleryPagination(data.pagination, {
              fallbackOffset: offset,
              fallbackLimit: pageSize,
              pageCount: pagePhotos.length,
            });
            const nextPhotos = append ? mergePersonPhotoPages(fetchedPhotos, pagePhotos) : pagePhotos;
            fetchedPhotos.splice(0, fetchedPhotos.length, ...nextPhotos);
            if (
              pagination.total_count_status === "exact" ||
              typeof pagination.total_count === "number"
            ) {
              setPhotosSavedTotal(pagination.total_count ?? 0);
              setPhotosSavedTotalStatus("exact");
            } else {
              setPhotosSavedTotal((current) => current);
              setPhotosSavedTotalStatus((current) => (current === "exact" ? "exact" : "deferred"));
            }
            setPhotosHasMore(pagination.has_more);
            setPhotosNextOffset(pagination.next_offset);
            const foundEnsuredPhoto = ensurePhotoId
              ? fetchedPhotos.some((candidate) => candidate.id === ensurePhotoId)
              : false;
            if (!pagination.has_more) {
              break;
            }
            if (!loadAll && !ensurePhotoId) {
              break;
            }
            if (ensurePhotoId && foundEnsuredPhoto) {
              break;
            }
            offset = pagination.next_offset;
          } catch (error) {
            if (signal?.aborted || isSignalAbortedWithoutReasonError(error)) {
              return append ? photosRef.current : [];
            }
            if (isAbortError(error)) {
              throw new Error(
                `Timed out loading person photos after ${Math.round(PHOTO_LIST_LOAD_TIMEOUT_MS / 1000)}s.`
              );
            }
            throw error;
          }
        }
        if (signal?.aborted) return [];
        setGalleryFallbackTelemetry({
          fallbackRecoveredCount: 0,
          allCandidatesFailedCount: 0,
          totalImageAttempts: 0,
        });
        setPhotos([...fetchedPhotos]);
        setPhotosError(null);
        logAdminPageReadDiagnostic({
          pageFamily: "people-gallery",
          resource: append ? "gallery-append" : "gallery-primary-slice",
          requestRole,
          phase: "success",
          durationMs: Date.now() - startedAt,
          payloadBytes: measurePayloadBytes({
            photos: fetchedPhotos.slice(0, pageSize),
            visibleCount: fetchedPhotos.length,
            includeTotalCount,
          }),
        });
        return [...fetchedPhotos];
      } catch (err) {
        if (signal?.aborted || isAbortError(err) || isSignalAbortedWithoutReasonError(err)) {
          return append ? photosRef.current : [];
        }
        console.error("Failed to fetch photos:", err);
        logAdminPageReadDiagnostic({
          pageFamily: "people-gallery",
          resource: append ? "gallery-append" : "gallery-primary-slice",
          requestRole,
          phase: "error",
          durationMs: Date.now() - startedAt,
          message: err instanceof Error ? err.message : "Failed to fetch photos",
        });
        setPhotosError(err instanceof Error ? err.message : "Failed to fetch photos");
        if (!append) {
          setPhotosSavedTotal(0);
        }
        return append ? photosRef.current : [];
      }
    })();

    photosRequestKeyRef.current = requestKey;
    photosInFlightRef.current = requestPromise;
    try {
      return await requestPromise;
    } finally {
      if (photosInFlightRef.current === requestPromise) {
        photosInFlightRef.current = null;
        photosRequestKeyRef.current = null;
      }
    }
  }, [personId, getAuthHeaders]);

  const handleLoadMorePhotos = useCallback(async () => {
    if (photosVisibleCount < mainGalleryPhotos.length) {
      setPhotosVisibleCount((prev) => prev + PERSON_GALLERY_VISIBLE_INCREMENT);
      return;
    }
    if (!photosHasMore || photosLoadingMore) return;
    setPhotosLoadingMore(true);
    try {
      const loadedPhotos = await fetchPhotos({ append: true, includeBroken: showBrokenRows });
      if (loadedPhotos.length > mainGalleryPhotos.length) {
        setPhotosVisibleCount((prev) => prev + PERSON_GALLERY_VISIBLE_INCREMENT);
      }
    } finally {
      setPhotosLoadingMore(false);
    }
  }, [fetchPhotos, mainGalleryPhotos.length, photosHasMore, photosLoadingMore, photosVisibleCount, showBrokenRows]);

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
    const startedAt = Date.now();
    logAdminPageReadDiagnostic({
      pageFamily: "people-gallery",
      resource: "credits",
      requestRole: "secondary",
      phase: "start",
    });
    try {
      setCreditsLoading(true);
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      params.set("limit", "500");
      if (showIdForApi) {
        params.set("showId", showIdForApi);
      }
      const data = await adminGetJson<{
        credits?: TrrPersonCredit[];
        show_scope?: PersonCreditShowScope;
        credits_by_show?: PersonCreditsByShow[];
      }>(`/api/admin/trr-api/people/${personId}/credits?${params.toString()}`, {
        headers,
        externalSignal: signal,
        requestRole: "secondary",
        dedupeKey: `person:${personId}:credits:${params.toString()}`,
      });
      if (signal?.aborted) return;
      setCredits(Array.isArray(data.credits) ? data.credits : []);
      setShowScopedCredits(
        data.show_scope && typeof data.show_scope === "object"
          ? (data.show_scope as PersonCreditShowScope)
          : null
      );
      setCreditsByShow(Array.isArray(data.credits_by_show) ? data.credits_by_show : []);
      setCreditsError(null);
      logAdminPageReadDiagnostic({
        pageFamily: "people-gallery",
        resource: "credits",
        requestRole: "secondary",
        phase: "success",
        durationMs: Date.now() - startedAt,
        payloadBytes: measurePayloadBytes({
          credits: Array.isArray(data.credits) ? data.credits : [],
          show_scope: data.show_scope ?? null,
          credits_by_show: Array.isArray(data.credits_by_show) ? data.credits_by_show : [],
        }),
      });
    } catch (err) {
      if (signal?.aborted || isAbortError(err) || isSignalAbortedWithoutReasonError(err)) return;
      setCredits([]);
      setShowScopedCredits(null);
      setCreditsByShow([]);
      setCreditsError(err instanceof Error ? err.message : "Failed to fetch credits");
      logAdminPageReadDiagnostic({
        pageFamily: "people-gallery",
        resource: "credits",
        requestRole: "secondary",
        phase: "error",
        durationMs: Date.now() - startedAt,
        message: err instanceof Error ? err.message : "Failed to fetch credits",
      });
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
    const startedAt = Date.now();
    logAdminPageReadDiagnostic({
      pageFamily: "people-gallery",
      resource: "cover-photo",
      requestRole: "secondary",
      phase: "start",
    });
    try {
      const headers = await getAuthHeaders();
      const data = await adminGetJson<{ coverPhoto?: CoverPhoto | null }>(
        `/api/admin/trr-api/people/${personId}/cover-photo?request_role=secondary`,
        {
          headers,
          externalSignal: signal,
          requestRole: "secondary",
          dedupeKey: `person:${personId}:cover-photo`,
        }
      );
      if (signal?.aborted) return;
      setCoverPhoto(data.coverPhoto ?? null);
      logAdminPageReadDiagnostic({
        pageFamily: "people-gallery",
        resource: "cover-photo",
        requestRole: "secondary",
        phase: "success",
        durationMs: Date.now() - startedAt,
        payloadBytes: measurePayloadBytes(data.coverPhoto),
      });
    } catch (err) {
      if (signal?.aborted || isAbortError(err)) return;
      if (isAdminRequestTimeoutError(err)) {
        setCoverPhoto(null);
        logAdminPageReadDiagnostic({
          pageFamily: "people-gallery",
          resource: "cover-photo",
          requestRole: "secondary",
          phase: "error",
          durationMs: Date.now() - startedAt,
          message: "Optional cover photo request timed out",
        });
        return;
      }
      console.error("Failed to fetch cover photo:", err);
      logAdminPageReadDiagnostic({
        pageFamily: "people-gallery",
        resource: "cover-photo",
        requestRole: "secondary",
        phase: "error",
        durationMs: Date.now() - startedAt,
        message: err instanceof Error ? err.message : "Failed to fetch cover photo",
      });
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
          const kickoffPath = `/api/admin/trr-api/shows/${showIdForApi}/google-news/sync`;
          const flowScope = `POST:${kickoffPath}:google-news-sync`;
          const flowKey = getOrCreateAdminFlowKey(flowScope);
          const authHeaders = await getAuthHeaders();
          const requestHeaders = {
            ...authHeaders,
            "Content-Type": "application/json",
            "x-trr-flow-key": flowKey,
          };
          const kickoffPayload = await adminMutation<Record<string, unknown>>(kickoffPath, {
            method: "POST",
            headers: requestHeaders,
            body: JSON.stringify({ force, async: true }),
            timeoutMs: NEWS_SYNC_TIMEOUT_MS,
          });
          const kickoffHandle = normalizeKickoffHandle(kickoffPayload);
          if (kickoffHandle.rawStatus) {
            setNewsNotice(`Google News sync ${canonicalizeOperationStatus(kickoffHandle.rawStatus)}.`);
          } else if (kickoffHandle.operationId || kickoffHandle.jobId) {
            setNewsNotice("Google News sync queued.");
          }

          const waitForLegacyJobTerminal = async (): Promise<CanonicalOperationStatus> => {
            if (!kickoffHandle.jobId) return kickoffHandle.canonicalStatus;
            const pollStartedAt = Date.now();
            while (Date.now() - pollStartedAt < NEWS_SYNC_POLL_TIMEOUT_MS) {
              const statusResponse = await fetchWithTimeout(
                `/api/admin/trr-api/shows/${showIdForApi}/google-news/sync/${encodeURIComponent(kickoffHandle.jobId)}`,
                { headers: requestHeaders, cache: "no-store" },
                NEWS_SYNC_TIMEOUT_MS,
              );
              const statusData = (await statusResponse.json().catch(() => ({}))) as {
                error?: string;
                status?: string;
                result?: { error?: string } | null;
              };
              if (!statusResponse.ok) {
                throw new Error(statusData.error || "Failed to fetch Google News sync status");
              }
              const status = canonicalizeOperationStatus(statusData.status, "running");
              setNewsNotice(`Google News sync ${status}.`);
              if (isCanonicalTerminalStatus(status)) {
                if (status === "failed") {
                  throw new Error(
                    (statusData.result && typeof statusData.result.error === "string" && statusData.result.error) ||
                      statusData.error ||
                      "Google News sync failed",
                  );
                }
                return status;
              }
              await new Promise((resolve) => setTimeout(resolve, NEWS_SYNC_POLL_INTERVAL_MS));
            }
            throw new Error(`Google News sync polling timed out after ${Math.round(NEWS_SYNC_POLL_TIMEOUT_MS / 1000)}s`);
          };

          const finalStatus = await monitorKickoffHandle({
            handle: kickoffHandle,
            operation: {
              flowScope,
              flowKey,
              input: kickoffPath,
              method: "POST",
              requestHeaders,
              streamTimeoutMs: NEWS_SYNC_TIMEOUT_MS,
              statusTimeoutMs: NEWS_SYNC_TIMEOUT_MS,
              reconnectBackoffMs: [...NEWS_OPERATION_RECONNECT_BACKOFF_MS],
              onState: (state) => {
                setNewsNotice(`Google News sync ${state.status}.`);
              },
            },
            waitForLegacyTerminal: kickoffHandle.jobId ? waitForLegacyJobTerminal : undefined,
          });
          if (finalStatus === "failed") {
            throw new Error("Google News sync failed");
          }
          if (finalStatus === "cancelled") {
            throw new Error("Google News sync was cancelled");
          }

          setNewsGoogleUrlMissing(false);
          setNewsNotice(null);
          return true;
        } catch (error) {
          if (error instanceof AdminRequestError && error.status === 409) {
            setNewsGoogleUrlMissing(true);
            setNewsNotice(error.message || "Google News URL is not configured for this show.");
            return false;
          }
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

  const handleRefreshProfileDetails = useCallback(async () => {
    if (!personId || !profileRefreshStreamPath) return;
    const requestBody = JSON.stringify({ refresh_links: true, refresh_credits: true });
    try {
      setRefreshingProfile(true);
      setProfileRefreshError(null);
      setProfileRefreshSummary(null);
      setProfileRefreshMessage("Connecting to backend profile refresh stream...");
      const headers = await getAuthHeaders();
      await adminStream(profileRefreshStreamPath, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: requestBody,
        timeoutMs: PERSON_PAGE_STREAM_MAX_DURATION_MS,
        onEvent: async ({ event, payload }) => {
          const payloadRecord = asRecord(payload);
          if (event === "progress") {
            const message =
              typeof payloadRecord?.message === "string"
                ? payloadRecord.message
                : typeof payloadRecord?.stage === "string"
                  ? `Refreshing ${payloadRecord.stage.replace(/_/g, " ")}...`
                  : "Refreshing profile details...";
            setProfileRefreshMessage(message);
            return;
          }
          if (event === "error") {
            const message =
              typeof payloadRecord?.detail === "string"
                ? payloadRecord.detail
                : typeof payloadRecord?.error === "string"
                  ? payloadRecord.error
                  : "Profile refresh failed";
            setProfileRefreshError(message);
            setProfileRefreshMessage(null);
            return;
          }
          if (event === "complete") {
            const summary = asRecord(payloadRecord?.summary) ?? payloadRecord;
            setProfileRefreshSummary(summary);
            setProfileRefreshMessage("Profile refresh complete.");
            await Promise.allSettled([
              fetchPerson(),
              fetchExternalIds(),
              fetchCredits(),
              fetchPhotos(),
              fetchFandomData(),
              fetchBravoVideos(),
              loadUnifiedNews({ force: true }),
              fetchCoverPhoto(),
            ]);
          }
        },
      });
    } catch (error) {
      const message =
        error instanceof AdminRequestError ? error.message : "Profile refresh failed";
      setProfileRefreshError(message);
      setProfileRefreshMessage(null);
    } finally {
      setRefreshingProfile(false);
    }
  }, [
    fetchBravoVideos,
    fetchCoverPhoto,
    fetchCredits,
    fetchExternalIds,
    fetchFandomData,
    fetchPerson,
    fetchPhotos,
    getAuthHeaders,
    loadUnifiedNews,
    personId,
    profileRefreshStreamPath,
  ]);

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
      faceCrops: FaceCropTag[];
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
                face_crops: payload.faceCrops,
              }
            : payload.castPhotoId && photo.id === payload.castPhotoId
              ? {
                  ...photo,
                  people_names: payload.peopleNames,
                  people_ids: payload.peopleIds,
                  people_count: payload.peopleCount,
                  people_count_source: payload.peopleCountSource,
                  face_boxes: payload.faceBoxes,
                  face_crops: payload.faceCrops,
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
              face_crops: payload.faceCrops,
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
              face_crops: payload.faceCrops,
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
          label: "Tagging",
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
        label: "Tagging",
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
          if (step.key === "count") {
            const referencesRaw = (responseData as { references_used?: unknown }).references_used;
            if (Array.isArray(referencesRaw) && referencesRaw.length > 0) {
              const referenceUrls = referencesRaw
                .map((entry) => {
                  if (!entry || typeof entry !== "object") return null;
                  const url = (entry as { url?: unknown }).url;
                  return typeof url === "string" && url.trim().length > 0 ? url.trim() : null;
                })
                .filter((url): url is string => Boolean(url));
              if (referenceUrls.length > 0) {
                logStep(
                  "info",
                  runLabel,
                  `Tagging references used (${referenceUrls.length})`,
                  referenceUrls.join(" | ")
                );
              } else {
                logStep("info", runLabel, "Warning: No owner references accepted.");
              }
            } else {
              logStep("info", runLabel, "Warning: No owner references accepted.");
            }
          }
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

      const refreshedPhotos = await fetchPhotos({ ensurePhotoId: photo.id });
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

      const refreshedAfterCount = await fetchPhotos({ ensurePhotoId: photo.id });
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

      const refreshedPhotos = await fetchPhotos({ ensurePhotoId: photo.id });
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
        successNotice: "Image tagging complete.",
        runLabel: "image_tagging",
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

  const handleExpandEvent = useCallback(async (eventUrl: string, eventTitle: string) => {
    if (!personId) return;
    const confirmed = window.confirm(
      `Scrape all images of ${person?.full_name ?? "this person"} from "${eventTitle}"?\n\nThis may take a moment.`
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/trr-api/people/${personId}/images/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expand_event_url: eventUrl,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      // Refresh gallery photos after expansion
      await fetchPhotos();
    } catch (err) {
      console.error("Event expansion failed:", err);
    }
  }, [personId, person?.full_name, fetchPhotos]);

  const handleRefreshImages = useCallback(async (
    mode: "full" | "sync" = "full",
    options?: { openFollowUpPrompt?: boolean }
  ): Promise<TrrPersonPhoto[] | null> => {
    if (!personId) return null;
    if (refreshingImages || reprocessingImages) return null;
    if (mode === "full") {
      setGetImagesFollowUpPromptOpen(false);
    }
    if (mode === "sync" && scopedStageTargets.totalFiltered === 0) {
      const message = `No filtered images to sync${effectiveGalleryImportSuffix}.`;
      setRefreshNotice(message);
      setRefreshError(null);
      appendRefreshLog({
        source: "page_refresh",
        stage: "syncing",
        message,
        level: "info",
      });
      return [];
    }
    if (mode === "sync" && scopedStageTargets.sources.length === 0) {
      const message = `No eligible filtered sources to sync${effectiveGalleryImportSuffix}.`;
      setRefreshNotice(message);
      setRefreshError(null);
      appendRefreshLog({
        source: "page_refresh",
        stage: "syncing",
        message,
        level: "info",
      });
      return [];
    }
    const requestId = buildPersonRefreshRequestId();
    const refreshRequestPath = refreshStreamPath ?? `/api/admin/trr-api/people/${personId}/refresh-images/stream`;
    const operationSessionFlowKey = refreshOperationFlowScope
      ? getOrCreateAdminFlowKey(refreshOperationFlowScope)
      : requestId;
    const pipelineMode: PersonRefreshPipelineMode = "ingest";
    const speedExecutionConfig = {
      execution_profile: "speed" as const,
      prefer_fast_pass: true,
      async_job: true,
      max_parallelism: { sync: 4, mirror: 16, tagging: 12, crop: 12 },
      batch_size: { tagging: 48, mirror: 256, crop: 96 },
    };
    const perSourceLimit =
      effectiveGalleryImportContext.showId ?? effectiveGalleryImportContext.showName ? 500 : 1000;
    const requestedGetImagesSources =
      mode === "full" ? getImagesSourcesForSelection(getImagesSourceSelection) : undefined;
    const refreshBody = {
      ...speedExecutionConfig,
      skip_mirror: false,
      force_mirror: false,
      limit_per_source: perSourceLimit,
      enforce_show_source_policy: false,
      // Get Images should stop after source sync + mirroring. Full downstream
      // reprocessing stays on Refresh Details or the follow-up prompt.
      skip_auto_count: true,
      skip_word_detection: true,
      skip_centering: true,
      skip_resize: true,
      skip_prune: true,
      sources:
        mode === "sync"
          ? scopedStageTargets.sources.length > 0
            ? scopedStageTargets.sources
            : undefined
          : requestedGetImagesSources,
      show_id: effectiveGalleryImportContext.showId ?? undefined,
      show_name: effectiveGalleryImportContext.showName ?? undefined,
    };

    setRefreshingImages(true);
    setRefreshPipelineSteps(createPersonRefreshPipelineSteps(pipelineMode));
    setRefreshProgress({
      phase: PERSON_REFRESH_PHASES.syncing,
      message: mode === "sync" ? "Opening sync stream..." : "Opening get-images stream...",
      detailMessage:
        mode === "sync"
          ? `Connecting to backend stream for sync stages${effectiveGalleryImportSuffix}...`
          : `Connecting to backend stream for source sync and mirroring${effectiveGalleryImportSuffix}...`,
      current: null,
      total: null,
      rawStage: "syncing",
      runId: requestId,
      lastEventAt: Date.now(),
      sourceProgress: null,
      gettyProgress: null,
      executionOwner: null,
      executionModeCanonical: null,
      executionBackendCanonical: null,
      operationStatus: "queued",
    });
    setRefreshNotice(null);
    setRefreshError(null);
    setRefreshLiveCounts(null);
    setPhotosError(null);
    if (refreshOperationFlowScope) clearAdminOperationSession(refreshOperationFlowScope);
    if (reprocessOperationFlowScope) clearAdminOperationSession(reprocessOperationFlowScope);
    if (refreshOperationFlowScope && refreshStreamPath) {
      upsertAdminOperationSession(refreshOperationFlowScope, {
        flowKey: operationSessionFlowKey,
        input: refreshStreamPath,
        method: "POST",
        status: "active",
        operationId: null,
        runId: null,
        jobId: null,
        canonicalStatus: "queued",
        executionOwner: null,
        executionModeCanonical: null,
        executionBackendCanonical: null,
        selectedSources: requestedGetImagesSources ?? null,
        latestPhase: "syncing",
        lastEventSeq: 0,
      });
    }
      appendRefreshLog({
        source: "page_refresh",
        stage: "syncing",
        message:
          mode === "sync"
            ? `Sync stage started${effectiveGalleryImportSuffix}`
            : `Get Images started${effectiveGalleryImportSuffix} (${getImagesSelectionLabel(getImagesSourceSelection)})`,
        level: "info",
        runId: requestId,
      });
    if (mode === "sync") {
      appendRefreshLog({
        source: "page_refresh",
        stage: "syncing",
        message: `Scoped sync sources: ${scopedStageTargets.sources.join(", ")}.`,
        detail: `${scopedStageTargets.totalFiltered} filtered images`,
        level: "info",
        runId: requestId,
      });
    } else {
      appendRefreshLog({
        source: "page_refresh",
        stage: "syncing",
        message: `Get Images source selection: ${getImagesSelectionLabel(getImagesSourceSelection)}.`,
        detail: getImagesSelectionDetail(getImagesSourceSelection),
        level: "info",
        runId: requestId,
      });
    }

    let gettyEnrichmentPromise: Promise<void> | null = null;
    let startGettyEnrichment: (() => Promise<void>) | null = null;
    let gettyEnrichmentError: string | null = null;

    // ── GETTY LOCAL PREFETCH ──────────────────────────────────────────
    // Getty blocks cloud IPs (Modal).  When the user selects a source
    // set that includes Getty/NBCUMV, scrape Getty images and events
    // via the local machine's residential IP first, then include them
    // in the pipeline request so Modal can skip the (blocked) live
    // Getty search and go straight to R2 upload + Supabase persistence.
    const gettySourcesRequested =
      mode === "full" &&
      ((requestedGetImagesSources?.includes("nbcumv") ?? false) ||
        (requestedGetImagesSources?.includes("getty") ?? false));
    if (gettySourcesRequested && person?.full_name) {
      const updateGettyDiscoveryProgress = (progress: GettyLocalPrefetchProgressState) => {
        const activeLabel =
          progress.activeQuery && typeof progress.activeQuery.label === "string"
            ? progress.activeQuery.label
            : null;
        const activeScope =
          progress.activeQuery && typeof progress.activeQuery.scope === "string"
            ? progress.activeQuery.scope
            : null;
        const activePhrase =
          progress.activeQuery && typeof progress.activeQuery.phrase === "string"
            ? progress.activeQuery.phrase
            : null;
        const pageNumber =
          typeof progress.currentPage === "number" && progress.currentPage > 0
            ? progress.currentPage
            : typeof progress.requestedPage === "number" && progress.requestedPage > 0
              ? progress.requestedPage
              : null;
        const heartbeatAgeSeconds = progress.heartbeatAt
          ? Math.max(0, Math.round((Date.now() - new Date(progress.heartbeatAt).getTime()) / 1000))
          : null;
        const activeQueryAlreadyCounted = progress.querySummariesLive.some((summary) => {
          const summaryScope = typeof summary.scope === "string" ? summary.scope : null;
          const summaryLabel = typeof summary.label === "string" ? summary.label : null;
          return (
            (activeScope && summaryScope === activeScope) ||
            (activeLabel && summaryLabel === activeLabel)
          );
        });
        const completedImageTotal = progress.querySummariesLive.reduce(
          (sum, summary) => sum + readGettySummaryNumber(summary, "site_image_total"),
          0,
        );
        const completedEventTotal = progress.querySummariesLive.reduce(
          (sum, summary) => sum + readGettySummaryNumber(summary, "site_event_total"),
          0,
        );
        const completedPageTotal = progress.querySummariesLive.reduce(
          (sum, summary) =>
            sum + estimateGettyPageTotal(readGettySummaryNumber(summary, "site_image_total")),
          0,
        );
        const activeImageTotal =
          !activeQueryAlreadyCounted && typeof progress.siteImageTotal === "number"
            ? progress.siteImageTotal
            : 0;
        const activeEventTotal =
          !activeQueryAlreadyCounted && typeof progress.siteEventTotal === "number"
            ? progress.siteEventTotal
            : 0;
        const activePageTotal =
          !activeQueryAlreadyCounted ? estimateGettyPageTotal(progress.siteImageTotal) : 0;
        const totalImageCount = completedImageTotal + activeImageTotal;
        const totalEventCount = completedEventTotal + activeEventTotal;
        const totalPageCount = completedPageTotal + activePageTotal;
        const completedPageCount =
          completedPageTotal +
          Math.max(0, Math.min(activePageTotal, pageNumber ?? 0));
        const liveCountDetail =
          typeof progress.fetchedCandidatesTotal === "number" && progress.fetchedCandidatesTotal > 0
            ? ` ${progress.fetchedCandidatesTotal} candidates discovered so far.`
            : "";
        const heartbeatDetail =
          heartbeatAgeSeconds !== null
            ? ` Last heartbeat ${heartbeatAgeSeconds}s ago.`
            : "";
        const paginationDetail =
          progress.terminationReason === "pagination_rewrite" &&
          typeof progress.requestedPage === "number" &&
          typeof progress.currentPage === "number"
            ? ` Getty rewrote page ${progress.requestedPage} to page ${progress.currentPage}.`
            : progress.terminationReason === "session_truncated"
              ? " Getty session appears truncated after page 3."
              : progress.terminationReason === "duplicate_page"
                ? " Getty repeated a prior results page."
                : "";
        const authDetail = progress.authWarning?.trim()
          ? progress.authWarning.trim()
          : progress.lastErrorCode === "getty_profile_not_authenticated"
            ? "Getty profile is not authenticated."
            : null;
        const detailParts = [
          progress.progressMessage,
          activeLabel
            ? `${activeLabel}${activePhrase ? ` (“${activePhrase}”)` : ""}${pageNumber ? ` page ${pageNumber}` : ""}.`
            : null,
          totalImageCount > 0 || totalEventCount > 0 || totalPageCount > 0
            ? `${totalImageCount.toLocaleString()} images · ${totalEventCount.toLocaleString()} events · ${totalPageCount.toLocaleString()} pages discovered.`
            : null,
          liveCountDetail.trim() || null,
          paginationDetail.trim() || null,
          authDetail,
          heartbeatDetail.trim() || null,
        ].filter((value): value is string => Boolean(value && value.trim()));
        const detailMessage =
          detailParts.join(" ").trim() ||
          `Fetching Getty search candidates for "${person.full_name}" via the codex Chrome profile...`;
        setRefreshProgress((prev) =>
          prev
            ? {
              ...prev,
              phase: PERSON_REFRESH_PHASES.gettyDiscovery,
              current: totalPageCount > 0 ? completedPageCount : null,
              total: totalPageCount > 0 ? totalPageCount : null,
              message:
                progress.status === "completed"
                  ? "Getty discovery complete."
                    : progress.status === "failed"
                      ? "Getty discovery failed."
                      : "Running Getty discovery locally...",
                detailMessage,
                lastEventAt: Date.now(),
              }
            : prev
        );
      };
      Object.assign(refreshBody, {
        getty_prefetch_attempted: true,
        getty_prefetch_succeeded: false,
      });
      setRefreshProgress((prev) =>
        prev
          ? {
              ...prev,
              phase: PERSON_REFRESH_PHASES.gettyDiscovery,
              message: "Running Getty discovery locally...",
              detailMessage: `Fetching Getty search candidates for "${person.full_name}" via the codex Chrome profile...`,
            }
          : prev
      );
      appendRefreshLog({
        source: "page_refresh",
        stage: "getty_discovery",
        message: "Starting Getty discovery via local Chrome-backed Getty session...",
        level: "info",
        runId: requestId,
      });
      try {
        const gettyPrefetch = await prefetchGettyLocallyForPerson(
          person.full_name,
          effectiveGalleryImportContext.showName ?? undefined,
          { mode: "discovery", onProgress: updateGettyDiscoveryProgress }
        );
        Object.assign(refreshBody, gettyPrefetch.bodyPatch);
        const discoveryToken =
          typeof gettyPrefetch.bodyPatch.getty_prefetch_token === "string"
            ? gettyPrefetch.bodyPatch.getty_prefetch_token
            : null;
        appendRefreshLog({
          source: "page_refresh",
          stage: "getty_discovery",
          message: `Getty discovery complete: ${gettyPrefetch.candidateManifestTotal} candidates (${gettyPrefetch.elapsedSeconds ?? "?"}s). Starting pipeline...`,
          detail:
            gettyPrefetch.querySummaries.length > 0
              ? `${gettyPrefetch.querySummaries.length} query summaries captured`
              : undefined,
          level: "info",
          runId: requestId,
        });
        setRefreshProgress((prev) =>
          prev
            ? {
                ...prev,
                detailMessage: `Getty discovery found ${gettyPrefetch.candidateManifestTotal} candidates. Connecting to pipeline...`,
              }
            : prev
        );

        if (discoveryToken && gettyPrefetch.enrichmentPending) {
          startGettyEnrichment = async () =>
            (async () => {
              appendRefreshLog({
                source: "page_refresh",
                stage: "getty_enrichment",
                message: "Starting background Getty enrichment...",
                detail: `${gettyPrefetch.detailEnrichmentTotal} editorial ids queued`,
                level: "info",
                runId: requestId,
              });
              const fullPrefetch = await prefetchGettyLocallyForPerson(
                person.full_name,
                effectiveGalleryImportContext.showName ?? undefined,
                {
                  mode: "full",
                  prefetchToken: discoveryToken,
                }
              );
              const enrichmentResponse = await fetch(
                `/api/admin/trr-api/people/${personId}/refresh-images/getty-enrichment`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    getty_prefetch_token: discoveryToken,
                    show_id: effectiveGalleryImportContext.showId ?? undefined,
                    show_name: effectiveGalleryImportContext.showName ?? undefined,
                  }),
                }
              );
              const enrichmentData = (await enrichmentResponse
                .json()
                .catch(() => ({ error: "Getty enrichment failed" }))) as {
                error?: string;
                detail?: string;
                getty_enrichment_completed?: number;
                getty_enrichment_failed?: number;
                cast_photos_mirrored?: number;
                media_assets_mirrored?: number;
              };
              if (!enrichmentResponse.ok) {
                throw new Error(
                  enrichmentData.detail ||
                    enrichmentData.error ||
                    `Getty enrichment failed (${enrichmentResponse.status})`
                );
              }
              appendRefreshLog({
                source: "page_refresh",
                stage: "getty_enrichment",
                message: `Getty enrichment complete: ${enrichmentData.getty_enrichment_completed ?? 0} editorial ids updated.`,
                detail: `Mirrored ${(enrichmentData.cast_photos_mirrored ?? 0) + (enrichmentData.media_assets_mirrored ?? 0)} hosted assets after enrichment. Full prefetch mode: ${fullPrefetch.prefetchMode ?? "full"}.`,
                level: "success",
                runId: requestId,
              });
            })().catch((error) => {
              gettyEnrichmentError = error instanceof Error ? error.message : String(error);
              appendRefreshLog({
                source: "page_refresh",
                stage: "getty_enrichment",
                message: "Getty enrichment failed",
                detail: gettyEnrichmentError,
                level: "error",
                runId: requestId,
              });
            });
        }
      } catch (gettyErr) {
        Object.assign(refreshBody, {
          getty_prefetch_error_code:
            gettyErr instanceof GettyLocalPrefetchError ? gettyErr.code : "UNREACHABLE",
        });
        const errMsg = gettyErr instanceof Error ? gettyErr.message : String(gettyErr);
        appendRefreshLog({
          source: "page_refresh",
          stage: "getty_local_scrape",
          message: `${errMsg} Getty/NBCUMV refresh requires local Getty prefetch because Modal is blocked by Getty.`,
          level: "error",
          runId: requestId,
        });
        throw new Error(`${errMsg} Getty/NBCUMV refresh was not started.`);
        
      }
      // Restore progress phase to syncing for the pipeline stream
      setRefreshProgress((prev) =>
        prev
          ? {
              ...prev,
              current: null,
              total: null,
              phase: PERSON_REFRESH_PHASES.syncing,
              message: "Connecting to pipeline...",
            }
          : prev
      );
    }
    // ── END GETTY LOCAL PREFETCH ──────────────────────────────────────

    let refreshedPhotosAfterRun: TrrPersonPhoto[] = [];
    let handoffOperationId: string | null = null;
    let handoffRequestHeaders: HeadersInit | undefined;
    try {
      const runStreamAttempt = async () => {
        const syncProgressTracker = createSyncProgressTracker();
        const headers = await getAuthHeaders();
        handoffRequestHeaders = headers;
        const streamController = new AbortController();
        let streamAbortReason: "max_duration" | "idle" | "start_deadline" | null = null;
        let sawFirstEvent = false;
        const markStreamStarted = () => {
          if (sawFirstEvent) return;
          sawFirstEvent = true;
          clearStreamStartTimeout();
          setRefreshProgress((prev) =>
            prev
              ? {
                  ...prev,
                  detailMessage: "Backend stream connected. Waiting for live stage updates...",
                  lastEventAt: Date.now(),
                }
              : prev
          );
          appendRefreshLog({
            source: "page_refresh",
            stage: "stream_connected",
            message: "Stream connected.",
            level: "info",
            runId: requestId,
          });
        };
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
        let sawComplete = false;
        let lastEventAt = Date.now();
        const staleInterval = setInterval(() => {
          const now = Date.now();
          const staleAgeMs = now - lastEventAt;
          if (staleAgeMs < 4000) return;
          setRefreshProgress((prev) => {
            if (!prev) return prev;
            const stageLabel = formatPersonRefreshPhaseLabel(prev.rawStage ?? prev.phase) ?? "WORKING";
            const normalizedDetail =
              (prev.detailMessage ?? prev.message ?? "")
                .replace(/\s+\(last update \d+s ago\)\s*$/i, "")
                .trim();
            const baseMessage =
              normalizedDetail || `Waiting for ${stageLabel} backend update...`;
            return {
              ...prev,
              detailMessage: `${baseMessage} (last update ${Math.round(staleAgeMs / 1000)}s ago)`,
            };
          });
        }, 1000);

        try {
          await adminStream(
            `/api/admin/trr-api/people/${personId}/refresh-images/stream`,
            {
              method: "POST",
              headers: {
                ...headers,
                "Content-Type": "application/json",
                "x-trr-request-id": requestId,
              },
              body: JSON.stringify(refreshBody),
              timeoutMs: PERSON_PAGE_STREAM_MAX_DURATION_MS,
              externalSignal: streamController.signal,
              onEvent: async ({ event: eventType, payload }) => {
                lastEventAt = Date.now();
                bumpStreamIdleTimeout();
                if (!sawFirstEvent) {
                  markStreamStarted();
                }
                persistPersonOperationSessionEvent({
                  flowScope: refreshOperationFlowScope,
                  flowKey: operationSessionFlowKey,
                  requestPath: refreshStreamPath,
                  method: "POST",
                  eventType,
                  payload,
                });
                if (eventType === "operation" || eventType === "dispatched_to_modal") {
                  applyPipelineOperationEnvelope({
                    eventType,
                    payload,
                    fallbackPhase: PERSON_REFRESH_PHASES.syncing,
                    fallbackMessage:
                      eventType === "dispatched_to_modal"
                        ? "Refresh dispatched to Modal."
                        : "Refresh operation update.",
                    logStage: "operation",
                    runId: requestId,
                  });
                  const payloadRecord =
                    payload && typeof payload === "object" && !Array.isArray(payload)
                      ? (payload as { operation_id?: unknown })
                      : null;
                  const operationId =
                    typeof payloadRecord?.operation_id === "string" ? payloadRecord.operation_id.trim() : "";
                  if (operationId) {
                    handoffOperationId = operationId;
                    throw new Error(
                      `${PERSON_PIPELINE_SWITCH_TO_OPERATION_MONITOR_PREFIX}${operationId}`,
                    );
                  }
                  return;
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
                  resolveRequestIdFromPayload(payload, requestId);
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
                const source =
                  typeof (payload as { source?: unknown }).source === "string"
                    ? ((payload as { source: string }).source)
                    : null;
                const sourceTotalRaw = (payload as { source_total?: unknown }).source_total;
                const sourceTotal =
                  typeof sourceTotalRaw === "number"
                    ? sourceTotalRaw
                    : typeof sourceTotalRaw === "string"
                      ? Number.parseInt(sourceTotalRaw, 10)
                      : null;
                const mirroredCountRaw = (payload as { mirrored_count?: unknown }).mirrored_count;
                const mirroredCount =
                  typeof mirroredCountRaw === "number"
                    ? mirroredCountRaw
                    : typeof mirroredCountRaw === "string"
                      ? Number.parseInt(mirroredCountRaw, 10)
                      : null;
                const reviewedRowsRaw = (payload as { reviewed_rows?: unknown }).reviewed_rows;
                const reviewedRows =
                  typeof reviewedRowsRaw === "number"
                    ? reviewedRowsRaw
                    : typeof reviewedRowsRaw === "string"
                      ? Number.parseInt(reviewedRowsRaw, 10)
                      : null;
                const changedRowsRaw = (payload as { changed_rows?: unknown }).changed_rows;
                const changedRows =
                  typeof changedRowsRaw === "number"
                    ? changedRowsRaw
                    : typeof changedRowsRaw === "string"
                      ? Number.parseInt(changedRowsRaw, 10)
                      : null;
                const totalRowsRaw = (payload as { total_rows?: unknown }).total_rows;
                const totalRows =
                  typeof totalRowsRaw === "number"
                    ? totalRowsRaw
                    : typeof totalRowsRaw === "string"
                      ? Number.parseInt(totalRowsRaw, 10)
                      : null;
                const failedRowsRaw = (payload as { failed_rows?: unknown }).failed_rows;
                const failedRows =
                  typeof failedRowsRaw === "number"
                    ? failedRowsRaw
                    : typeof failedRowsRaw === "string"
                      ? Number.parseInt(failedRowsRaw, 10)
                      : null;
                const skippedRowsRaw = (
                  payload as { skipped_rows?: unknown; skipped_existing_rows?: unknown; skipped_manual_rows?: unknown }
                ).skipped_rows ??
                  (payload as { skipped_existing_rows?: unknown }).skipped_existing_rows ??
                  (payload as { skipped_manual_rows?: unknown }).skipped_manual_rows;
                const skippedRows =
                  typeof skippedRowsRaw === "number"
                    ? skippedRowsRaw
                    : typeof skippedRowsRaw === "string"
                      ? Number.parseInt(skippedRowsRaw, 10)
                      : null;
                const forceStatusRaw = (payload as { force_status?: unknown }).force_status;
                const forceStatus =
                  forceStatusRaw === "pending" ||
                  forceStatusRaw === "running" ||
                  forceStatusRaw === "completed" ||
                  forceStatusRaw === "warning" ||
                  forceStatusRaw === "skipped" ||
                  forceStatusRaw === "failed"
                    ? forceStatusRaw
                    : null;
                const skipReason =
                  typeof (payload as { skip_reason?: unknown }).skip_reason === "string"
                    ? ((payload as { skip_reason: string }).skip_reason)
                    : null;
                const detail =
                  typeof (payload as { detail?: unknown }).detail === "string"
                    ? ((payload as { detail: string }).detail)
                    : null;
                const serviceUnavailable =
                  (payload as { service_unavailable?: unknown }).service_unavailable === true;
                const retryAfterRaw = (payload as { retry_after_s?: unknown }).retry_after_s;
                const retryAfterS =
                  typeof retryAfterRaw === "number"
                    ? retryAfterRaw
                    : typeof retryAfterRaw === "string"
                      ? Number.parseInt(retryAfterRaw, 10)
                      : null;
                const checkpoint =
                  typeof (payload as { checkpoint?: unknown }).checkpoint === "string"
                    ? ((payload as { checkpoint: string }).checkpoint)
                    : null;
                const streamStateRaw = (payload as { stream_state?: unknown }).stream_state;
                const streamState =
                  streamStateRaw === "connecting" ||
                  streamStateRaw === "connected" ||
                  streamStateRaw === "streaming" ||
                  streamStateRaw === "failed" ||
                  streamStateRaw === "completed"
                    ? streamStateRaw
                    : null;
                const errorCode =
                  typeof (payload as { error_code?: unknown }).error_code === "string"
                    ? ((payload as { error_code: string }).error_code)
                    : null;
                const attemptRaw = (payload as { attempt?: unknown }).attempt;
                const attempt =
                  typeof attemptRaw === "number"
                    ? attemptRaw
                    : typeof attemptRaw === "string"
                      ? Number.parseInt(attemptRaw, 10)
                      : null;
                const maxAttemptsRaw = (payload as { max_attempts?: unknown }).max_attempts;
                const maxAttempts =
                  typeof maxAttemptsRaw === "number"
                    ? maxAttemptsRaw
                    : typeof maxAttemptsRaw === "string"
                      ? Number.parseInt(maxAttemptsRaw, 10)
                      : null;
                const attemptElapsedRaw = (payload as { attempt_elapsed_ms?: unknown }).attempt_elapsed_ms;
                const attemptElapsedMs =
                  typeof attemptElapsedRaw === "number"
                    ? attemptElapsedRaw
                    : typeof attemptElapsedRaw === "string"
                      ? Number.parseInt(attemptElapsedRaw, 10)
                      : null;
                const attemptTimeoutRaw = (payload as { attempt_timeout_ms?: unknown }).attempt_timeout_ms;
                const attemptTimeoutMs =
                  typeof attemptTimeoutRaw === "number"
                    ? attemptTimeoutRaw
                    : typeof attemptTimeoutRaw === "string"
                      ? Number.parseInt(attemptTimeoutRaw, 10)
                      : null;
                const backendHost =
                  typeof (payload as { backend_host?: unknown }).backend_host === "string"
                    ? ((payload as { backend_host: string }).backend_host)
                    : null;
                const sourceProgress = normalizePersonRefreshSourceProgress(
                  (payload as { source_progress?: unknown }).source_progress,
                );
                const gettyProgress = normalizePersonGettyProgress(
                  (payload as { getty_progress?: unknown }).getty_progress,
                );
                const sourceSyncCounts = summarizePersonRefreshSourceProgress(sourceProgress);
                const syncCounts =
                  sourceSyncCounts && mappedPhase === PERSON_REFRESH_PHASES.syncing
                    ? sourceSyncCounts
                    : !heartbeat && mappedPhase === PERSON_REFRESH_PHASES.syncing
                      ? updateSyncProgressTracker(syncProgressTracker, {
                          rawStage,
                          message,
                          current: numericCurrent,
                          total: numericTotal,
                        })
                      : null;
                const connectDetailMessage = buildProxyConnectDetailMessage({
                  stage: rawStage,
                  message,
                  attempt:
                    typeof attempt === "number" && Number.isFinite(attempt) ? attempt : null,
                  maxAttempts:
                    typeof maxAttempts === "number" && Number.isFinite(maxAttempts) ? maxAttempts : null,
                  attemptElapsedMs:
                    typeof attemptElapsedMs === "number" && Number.isFinite(attemptElapsedMs)
                      ? attemptElapsedMs
                      : null,
                  attemptTimeoutMs:
                    typeof attemptTimeoutMs === "number" && Number.isFinite(attemptTimeoutMs)
                      ? attemptTimeoutMs
                      : null,
                });
                const baseDetailMessage =
                  connectDetailMessage ??
                  buildPersonRefreshDetailMessage({
                    rawStage,
                    message,
                    heartbeat,
                    elapsedMs,
                    source,
                    sourceTotal:
                      typeof sourceTotal === "number" && Number.isFinite(sourceTotal)
                        ? sourceTotal
                        : null,
                    mirroredCount:
                      typeof mirroredCount === "number" && Number.isFinite(mirroredCount)
                        ? mirroredCount
                        : null,
                    current: numericCurrent,
                    total: numericTotal,
                    skipReason,
                    detail,
                    serviceUnavailable,
                    retryAfterS:
                      typeof retryAfterS === "number" && Number.isFinite(retryAfterS)
                        ? retryAfterS
                        : null,
                    reviewedRows:
                      typeof reviewedRows === "number" && Number.isFinite(reviewedRows)
                        ? reviewedRows
                        : null,
                    changedRows:
                      typeof changedRows === "number" && Number.isFinite(changedRows)
                        ? changedRows
                        : null,
                    totalRows:
                      typeof totalRows === "number" && Number.isFinite(totalRows)
                        ? totalRows
                        : null,
                    failedRows:
                      typeof failedRows === "number" && Number.isFinite(failedRows)
                        ? failedRows
                        : null,
                    skippedRows:
                      typeof skippedRows === "number" && Number.isFinite(skippedRows)
                        ? skippedRows
                        : null,
                  });
                const nextLiveCounts = resolveJobLiveCounts(refreshLiveCounts, payload);
                setRefreshLiveCounts(nextLiveCounts);
                const enrichedMessage = appendLiveCountsToMessage(
                  baseDetailMessage ?? message ?? "",
                  nextLiveCounts
                );
                setRefreshProgress((prev) => ({
                  current: syncCounts?.current ?? numericCurrent,
                  total: syncCounts?.total ?? numericTotal,
                  phase: mappedPhase ?? rawStage,
                  rawStage,
                  message: enrichedMessage || baseDetailMessage || message || null,
                  detailMessage: enrichedMessage || baseDetailMessage || message || null,
                  runId: resolvedRunId,
                  lastEventAt: Date.now(),
                  checkpoint,
                  streamState,
                  errorCode,
                  attemptElapsedMs:
                    typeof attemptElapsedMs === "number" && Number.isFinite(attemptElapsedMs)
                      ? attemptElapsedMs
                      : null,
                  attemptTimeoutMs:
                    typeof attemptTimeoutMs === "number" && Number.isFinite(attemptTimeoutMs)
                      ? attemptTimeoutMs
                      : null,
                  backendHost,
                  sourceProgress,
                  gettyProgress,
                  executionOwner: prev?.executionOwner ?? null,
                  executionModeCanonical: prev?.executionModeCanonical ?? null,
                  executionBackendCanonical: prev?.executionBackendCanonical ?? null,
                  operationStatus: "running",
                }));
                setRefreshPipelineSteps((prev) =>
                  updatePersonRefreshPipelineSteps(
                    prev ?? createPersonRefreshPipelineSteps(pipelineMode),
                    {
                      rawStage,
                      message: enrichedMessage || baseDetailMessage || message,
                      current: syncCounts?.current ?? numericCurrent,
                      total: syncCounts?.total ?? numericTotal,
                      heartbeat,
                      skipReason,
                      serviceUnavailable,
                      detail,
                      forceStatus,
                    },
                  ),
                );
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
                  resolveRequestIdFromPayload(payload, requestId);
                const completeLiveCounts = resolveJobLiveCounts(refreshLiveCounts, payload);
                setRefreshLiveCounts(completeLiveCounts);
                const summary = payload && typeof payload === "object" && "summary" in payload
                  ? (payload as { summary?: unknown }).summary
                  : payload;
                const sourceProgress = normalizePersonRefreshSourceProgress(
                  summary && typeof summary === "object"
                    ? (summary as { source_progress?: unknown }).source_progress
                    : undefined,
                );
                const gettyProgress = normalizePersonGettyProgress(
                  summary && typeof summary === "object"
                    ? (summary as { getty_progress?: unknown }).getty_progress
                    : undefined,
                );
                const summaryText = formatPersonRefreshSummary(summary);
                const liveCountSuffix = formatJobLiveCounts(completeLiveCounts);
                const completionMessage =
                  summaryText
                    ? `${summaryText}${liveCountSuffix ? `. ${liveCountSuffix}` : ""}. Reloading page data...`
                    : liveCountSuffix
                      ? `Images refreshed. ${liveCountSuffix}. Reloading page data...`
                      : "Images refreshed. Reloading page data...";
                setRefreshPipelineSteps((prev) =>
                  finalizePersonRefreshPipelineSteps(
                    prev ?? createPersonRefreshPipelineSteps(pipelineMode),
                    pipelineMode,
                    summary,
                  ),
                );
                setRefreshProgress((prev) => ({
                  current: null,
                  total: null,
                  phase: "COMPLETED",
                  rawStage: "complete",
                  message: completionMessage,
                  detailMessage: completionMessage,
                  runId: payloadRequestId,
                  lastEventAt: null,
                  checkpoint: "complete",
                  streamState: "completed",
                  errorCode: null,
                  attemptElapsedMs: prev?.attemptElapsedMs ?? null,
                  attemptTimeoutMs: prev?.attemptTimeoutMs ?? null,
                  backendHost: prev?.backendHost ?? null,
                  sourceProgress,
                  gettyProgress,
                  executionOwner: prev?.executionOwner ?? null,
                  executionModeCanonical: prev?.executionModeCanonical ?? null,
                  executionBackendCanonical: prev?.executionBackendCanonical ?? null,
                  operationStatus: "completed",
                }));
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
                } else if (eventType === "error") {
                  const errorPayload =
                  payload && typeof payload === "object"
                    ? (payload as {
                        stage?: string;
                        error?: string;
                        detail?: string;
                        request_id?: string;
                        checkpoint?: string;
                        stream_state?: string;
                        error_code?: string;
                        is_terminal?: boolean;
                        backend_host?: string;
                        attempts_used?: number | string;
                        max_attempts?: number | string;
                      })
                    : null;
                  const stage = errorPayload?.stage ? `[${errorPayload.stage}] ` : "";
                  const payloadRequestId =
                    resolveRequestIdFromPayload(errorPayload, requestId);
                  const attemptUsedRaw = errorPayload?.attempts_used;
                  const maxAttemptsRaw = errorPayload?.max_attempts;
                  const attemptsUsed =
                  typeof attemptUsedRaw === "number"
                    ? attemptUsedRaw
                    : typeof attemptUsedRaw === "string"
                      ? Number.parseInt(attemptUsedRaw, 10)
                      : null;
                  const maxAttempts =
                  typeof maxAttemptsRaw === "number"
                    ? maxAttemptsRaw
                    : typeof maxAttemptsRaw === "string"
                      ? Number.parseInt(maxAttemptsRaw, 10)
                      : null;
                  const isTerminal = errorPayload?.is_terminal === true;
                  const terminalProxyConnectError =
                  isTerminal &&
                  errorPayload?.stage === "proxy_connecting" &&
                  (errorPayload?.checkpoint === "connect_exhausted" ||
                    errorPayload?.stream_state === "failed");
                  const formattedErrorText = terminalProxyConnectError
                  ? buildProxyTerminalErrorMessage({
                      stage: errorPayload?.stage ?? null,
                      checkpoint: errorPayload?.checkpoint ?? null,
                      error: errorPayload?.error ?? null,
                      detail: errorPayload?.detail ?? null,
                      errorCode: errorPayload?.error_code ?? null,
                      backendHost: errorPayload?.backend_host ?? null,
                      attemptsUsed:
                        typeof attemptsUsed === "number" && Number.isFinite(attemptsUsed)
                          ? attemptsUsed
                          : null,
                      maxAttempts:
                        typeof maxAttempts === "number" && Number.isFinite(maxAttempts)
                          ? maxAttempts
                          : null,
                    })
                  : errorPayload?.error && errorPayload?.detail
                    ? `${stage}${errorPayload.error}: ${errorPayload.detail}`
                    : `${stage}${errorPayload?.error || "Failed to get images"}`;
                  setRefreshPipelineSteps((prev) =>
                  updatePersonRefreshPipelineSteps(
                    prev ?? createPersonRefreshPipelineSteps(pipelineMode),
                    {
                      rawStage: errorPayload?.stage ?? null,
                      message: errorPayload?.error ?? "Failed to get images",
                      detail: errorPayload?.detail ?? null,
                      current: null,
                      total: null,
                      forceStatus: "failed",
                    },
                  ),
                );
                  setRefreshProgress((prev) =>
                  prev
                    ? {
                        ...prev,
                        checkpoint:
                          typeof errorPayload?.checkpoint === "string" ? errorPayload.checkpoint : prev.checkpoint,
                        streamState:
                          errorPayload?.stream_state === "connecting" ||
                          errorPayload?.stream_state === "connected" ||
                          errorPayload?.stream_state === "streaming" ||
                          errorPayload?.stream_state === "failed" ||
                          errorPayload?.stream_state === "completed"
                            ? errorPayload.stream_state
                            : prev.streamState,
                        errorCode:
                          typeof errorPayload?.error_code === "string"
                            ? errorPayload.error_code
                            : prev.errorCode,
                        backendHost:
                          typeof errorPayload?.backend_host === "string"
                            ? errorPayload.backend_host
                            : prev.backendHost,
                        detailMessage: formattedErrorText,
                        lastEventAt: Date.now(),
                        operationStatus:
                          String(errorPayload?.error || "").toLowerCase().includes("cancel")
                            ? "cancelled"
                            : "failed",
                      }
                    : prev,
                );
                  // Mark as a backend error so the retry loop does NOT retry.
                  const backendErr = new Error(formattedErrorText);
                  backendErr.name = "BackendError";
                  appendRefreshLog({
                  source: "page_refresh",
                  stage: errorPayload?.stage ?? "error",
                  message: terminalProxyConnectError
                    ? "Backend stream connect failed"
                    : errorPayload?.error || "Failed to get images",
                  detail: formattedErrorText,
                  level: "error",
                  runId: payloadRequestId,
                });
                  throw backendErr;
                }
              },
            },
          );
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
              `No refresh stream response received within ${Math.round(
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
        }

        if (!sawComplete) {
          throw new Error("Refresh stream ended before completion.");
        }
      };

      let streamError: string | null = null;
      let gettyEnrichmentStarted = false;
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          const streamAttemptPromise = runStreamAttempt();
          if (!gettyEnrichmentStarted && startGettyEnrichment) {
            gettyEnrichmentStarted = true;
            gettyEnrichmentPromise = startGettyEnrichment();
          }
          await streamAttemptPromise;
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
          // network read errors and initial connection timeouts.
          // Explicit backend errors (auth, config, validation) should
          // surface immediately without a retry to avoid duplicate refresh jobs.
          const isBackendError =
            streamErr instanceof Error && streamErr.name === "BackendError";
          const isConnectionTimeout =
            streamErr instanceof Error &&
            streamErr.name === "StreamTimeoutError" &&
            streamErr.message.includes("received within");
          streamError = streamErr instanceof Error ? streamErr.message : String(streamErr);
          const handoffOperationFromError = parsePersonPipelineMonitorSwitchOperationId(streamError);
          if (handoffOperationFromError) {
            handoffOperationId = handoffOperationFromError;
            streamError = null;
            break;
          }
          const isOperationSequenceConflict =
            /admin_operation_events_op_seq_unique|duplicate key value violates unique constraint/i.test(
              streamError,
            );
          const isNonRetryableError =
            (streamErr instanceof Error &&
              (streamErr.name === "BackendError" ||
                streamErr.name === "StreamAbortError" ||
                (streamErr.name === "StreamTimeoutError" && !isConnectionTimeout))) ||
            isOperationSequenceConflict;
          if (isBackendError || isNonRetryableError || attempt >= 2) {
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
      if (handoffOperationId) {
        const operationIdForMonitor = handoffOperationId;
        const state = await waitForOperationTerminalState({
          operationId: operationIdForMonitor,
          flowScope: refreshOperationFlowScope ?? `person:${personId}:refresh`,
          flowKey: operationSessionFlowKey,
          input: refreshRequestPath,
          method: "POST",
          requestHeaders: handoffRequestHeaders,
          onStreamEvent: async ({ event, payload }) => {
            persistPersonOperationSessionEvent({
              flowScope: refreshOperationFlowScope,
              flowKey: operationSessionFlowKey,
              requestPath: refreshRequestPath,
              method: "POST",
              eventType: event,
              payload,
            });
            await applyRefreshResumeEvent(event, payload, operationIdForMonitor);
          },
        });
        if (state.status === "failed") {
          throw new Error("Get Images failed");
        }
        if (state.status === "cancelled") {
          throw new Error("Get Images was cancelled");
        }
      }

      if (gettyEnrichmentPromise) {
        setRefreshProgress((prev) =>
          prev
            ? {
                ...prev,
                phase: PERSON_REFRESH_PHASES.gettyEnrichment,
                message: "Applying Getty enrichment...",
                detailMessage: "Finalizing Getty detail/event enrichment and canonical image repairs...",
              }
            : prev
        );
        await gettyEnrichmentPromise;
      }

      await Promise.all([
        fetchPerson(),
        fetchCredits(),
        fetchFandomData(),
        fetchBravoVideos(),
        loadUnifiedNews({ force: true }),
        fetchCoverPhoto(),
      ]);
      refreshedPhotosAfterRun = await fetchPhotos();
      if (gettyEnrichmentError) {
        setRefreshNotice(`Images refreshed. Getty enrichment warning: ${gettyEnrichmentError}`);
      }
      if (mode === "full" && options?.openFollowUpPrompt !== false) {
        setGetImagesFollowUpPromptOpen(true);
      }
      return refreshedPhotosAfterRun;
    } catch (err) {
      console.error("Failed to get images:", err);
      const errorMessage = formatPipelineStreamError(err, "Failed to get images");
      setRefreshError(errorMessage);
      setRefreshPipelineSteps((prev) =>
        updatePersonRefreshPipelineSteps(
          prev ?? createPersonRefreshPipelineSteps(pipelineMode),
          {
            rawStage: null,
            message: errorMessage,
            current: null,
            total: null,
            forceStatus: "failed",
          },
        ),
      );
      appendRefreshLog({
        source: "page_refresh",
        stage: "refresh_error",
        message: "Get Images failed",
        detail: errorMessage,
        level: "error",
        runId: requestId,
      });
      return null;
    } finally {
      setRefreshingImages(false);
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
    formatPipelineStreamError,
    refreshLiveCounts,
    buildPersonRefreshRequestId,
    refreshOperationFlowScope,
    reprocessOperationFlowScope,
    refreshStreamPath,
    persistPersonOperationSessionEvent,
    applyPipelineOperationEnvelope,
    applyRefreshResumeEvent,
    effectiveGalleryImportContext.showId,
    effectiveGalleryImportContext.showName,
    effectiveGalleryImportSuffix,
    getImagesSourceSelection,
    person?.full_name,
    scopedStageTargets,
  ]);

  const handleReprocessImages = useCallback(
    async (
      stage: ReprocessStageKey = "all",
      scope: StageTargetScope = "filtered",
      stageTargetsOverride?: StageTargets,
      sourceSelectionOverride?: CanonicalScopedSource[]
    ): Promise<boolean> => {
    const stageTargets = stageTargetsOverride ?? (scope === "full" ? fullStageTargets : scopedStageTargets);
    const selectedReprocessSources =
      sourceSelectionOverride && sourceSelectionOverride.length > 0
        ? sourceSelectionOverride
        : stageTargets.sources.length > 0
          ? stageTargets.sources
          : undefined;
    if (!personId) return false;
    if (refreshingImages || reprocessingImages) return false;
    setGetImagesFollowUpPromptOpen(false);
    if (stageTargets.totalFiltered === 0) {
      const message =
        scope === "full"
          ? `No images to reprocess${effectiveGalleryImportSuffix}.`
          : `No filtered images to reprocess${effectiveGalleryImportSuffix}.`;
      setRefreshNotice(message);
      setRefreshError(null);
      appendRefreshLog({
        source: "page_refresh",
        stage: "reprocess_start",
        message,
        level: "info",
      });
      return false;
    }
    if (
      stageTargets.targetCastPhotoIds.length === 0 &&
      stageTargets.targetMediaLinkIds.length === 0
    ) {
      const message =
        scope === "full"
          ? `No eligible gallery images to reprocess${effectiveGalleryImportSuffix}.`
          : `No eligible filtered images to reprocess${effectiveGalleryImportSuffix}.`;
      setRefreshNotice(message);
      setRefreshError(null);
      appendRefreshLog({
        source: "page_refresh",
        stage: "reprocess_start",
        message,
        level: "info",
      });
      return false;
    }
    const requestId = buildPersonRefreshRequestId();
    const reprocessRequestPath =
      reprocessStreamPath ?? `/api/admin/trr-api/people/${personId}/reprocess-images/stream`;
    const operationSessionFlowKey = reprocessOperationFlowScope
      ? getOrCreateAdminFlowKey(reprocessOperationFlowScope)
      : requestId;
    const pipelineMode: PersonRefreshPipelineMode = "reprocess";
    const stageRequest: Record<
      ReprocessStageKey,
      {
        body: {
          run_metadata: boolean;
          run_count: boolean;
          run_tagging?: boolean;
          force_tagging_recount?: boolean;
          execution_profile?: "speed" | "balanced" | "safe";
          max_parallelism?: Partial<Record<"sync" | "mirror" | "tagging" | "crop", number>>;
          batch_size?: Partial<Record<"tagging" | "mirror" | "crop", number>>;
          prefer_fast_pass?: boolean;
          async_job?: boolean;
          run_id_text: boolean;
          run_crop: boolean;
          run_resize: boolean;
          sources?: CanonicalScopedSource[];
          target_cast_photo_ids?: string[];
          target_media_link_ids?: string[];
        };
        startLabel: string;
        startMessage: string;
        defaultSuccessMessage: string;
        failureLabel: string;
      }
    > = {
      all: {
        body: {
          run_metadata: true,
          run_count: true,
          run_tagging: true,
          force_tagging_recount: true,
          run_id_text: true,
          run_crop: true,
          run_resize: true,
        },
        startLabel: "Run Person Pipeline started",
        startMessage: "Running the person pipeline end-to-end...",
        defaultSuccessMessage: "Run Person Pipeline complete.",
        failureLabel: "Run Person Pipeline failed",
      },
      tagging: {
        body: {
          run_metadata: false,
          run_count: true,
          run_tagging: true,
          force_tagging_recount: true,
          run_id_text: false,
          run_crop: false,
          run_resize: false,
        },
        startLabel: "Tagging stage started",
        startMessage: "Reprocessing tagging stage...",
        defaultSuccessMessage: "Tagging stage complete.",
        failureLabel: "Tagging stage failed",
      },
      crop: {
        body: { run_metadata: false, run_count: false, run_id_text: false, run_crop: true, run_resize: false },
        startLabel: "Crop stage started",
        startMessage: "Saving thumbnail framing metadata...",
        defaultSuccessMessage: "Crop stage complete.",
        failureLabel: "Crop stage failed",
      },
      id_text: {
        body: { run_metadata: false, run_count: false, run_id_text: true, run_crop: false, run_resize: false },
        startLabel: "ID Text stage started",
        startMessage: "Reprocessing text-detection stage...",
        defaultSuccessMessage: "ID Text stage complete.",
        failureLabel: "ID Text stage failed",
      },
      resize: {
        body: { run_metadata: false, run_count: false, run_id_text: false, run_crop: false, run_resize: true },
        startLabel: "Auto-Crop stage started",
        startMessage: "Generating auto-crop and resize variants...",
        defaultSuccessMessage: "Auto-Crop stage complete.",
        failureLabel: "Auto-Crop stage failed",
      },
    };
    const selectedStage = stageRequest[stage];

    setReprocessingImages(true);
    setRefreshPipelineSteps(createPersonRefreshPipelineSteps(pipelineMode));
    setRefreshLiveCounts(null);
    setRefreshProgress({
      phase: PERSON_REFRESH_PHASES.tagging,
      message: "Opening reprocess stream...",
      detailMessage: `${selectedStage.startMessage} Connecting to backend stream...`,
      current: null,
      total: null,
      runId: requestId,
      rawStage: "reprocess_start",
      lastEventAt: Date.now(),
      checkpoint: "connect_start",
      streamState: "connecting",
      errorCode: null,
      attemptElapsedMs: null,
      attemptTimeoutMs: null,
      backendHost: null,
      sourceProgress: null,
      gettyProgress: null,
      executionOwner: null,
      executionModeCanonical: null,
      executionBackendCanonical: null,
      operationStatus: "queued",
    });
    setRefreshNotice(null);
    setRefreshError(null);
    if (refreshOperationFlowScope) clearAdminOperationSession(refreshOperationFlowScope);
    if (reprocessOperationFlowScope) clearAdminOperationSession(reprocessOperationFlowScope);
    if (reprocessOperationFlowScope && reprocessStreamPath) {
      upsertAdminOperationSession(reprocessOperationFlowScope, {
        flowKey: operationSessionFlowKey,
        input: reprocessStreamPath,
        method: "POST",
        status: "active",
        operationId: null,
        runId: null,
        jobId: null,
        canonicalStatus: "queued",
        executionOwner: null,
        executionModeCanonical: null,
        executionBackendCanonical: null,
        selectedSources: selectedReprocessSources ?? null,
        latestPhase: "reprocess_start",
        lastEventSeq: 0,
      });
    }
    appendRefreshLog({
      source: "page_refresh",
      stage: "reprocess_start",
      message: selectedStage.startLabel,
      level: "info",
      runId: requestId,
    });
    appendRefreshLog({
      source: "page_refresh",
      stage: "reprocess_start",
      message:
        scope === "full"
          ? `Full-gallery run: ${stageTargets.totalFiltered} images (${stageTargets.castCount} cast, ${stageTargets.mediaLinkCount} media links).`
          : `Scoped run: ${stageTargets.totalFiltered} filtered (${stageTargets.castCount} cast, ${stageTargets.mediaLinkCount} media links).`,
        detail:
          selectedReprocessSources && selectedReprocessSources.length > 0
            ? `sources: ${selectedReprocessSources.join(", ")}`
            : "sources: all",
      level: "info",
      runId: requestId,
    });

    try {
      const headers = await getAuthHeaders();
      let handoffOperationId: string | null = null;
      const requestBody = JSON.stringify({
        ...selectedStage.body,
        execution_profile: "speed",
        max_parallelism: { tagging: 12, crop: 12, mirror: 16, sync: 4 },
        batch_size: { tagging: 48, crop: 96, mirror: 256 },
        prefer_fast_pass: true,
        async_job: true,
        sources: selectedReprocessSources,
        target_cast_photo_ids: stageTargets.targetCastPhotoIds,
        target_media_link_ids: stageTargets.targetMediaLinkIds,
        show_id: effectiveGalleryImportContext.showId ?? undefined,
        show_name: effectiveGalleryImportContext.showName || undefined,
      });
      let hadError = false;
      let sawComplete = false;
      try {
        await adminStream(
          `/api/admin/trr-api/people/${personId}/reprocess-images/stream`,
          {
            method: "POST",
            headers: {
              ...headers,
              "Content-Type": "application/json",
              "x-trr-request-id": requestId,
            },
            body: requestBody,
            timeoutMs: PERSON_PAGE_STREAM_MAX_DURATION_MS,
            onEvent: async ({ event: eventType, payload }) => {
            persistPersonOperationSessionEvent({
              flowScope: reprocessOperationFlowScope,
              flowKey: operationSessionFlowKey,
              requestPath: reprocessStreamPath,
              method: "POST",
              eventType,
              payload,
            });
            if (eventType === "operation" || eventType === "dispatched_to_modal") {
              applyPipelineOperationEnvelope({
                eventType,
                payload,
                fallbackPhase: PERSON_REFRESH_PHASES.tagging,
                fallbackMessage:
                  eventType === "dispatched_to_modal"
                    ? "Reprocess dispatched to Modal."
                    : "Reprocess operation update.",
                logStage: "operation",
                runId: requestId,
              });
              const payloadRecord =
                payload && typeof payload === "object" && !Array.isArray(payload)
                  ? (payload as { operation_id?: unknown })
                  : null;
              const operationId =
                typeof payloadRecord?.operation_id === "string" ? payloadRecord.operation_id.trim() : "";
              if (operationId) {
                handoffOperationId = operationId;
                throw new Error(
                  `${PERSON_PIPELINE_SWITCH_TO_OPERATION_MONITOR_PREFIX}${operationId}`,
                );
              }
              return;
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
            const source =
              typeof (payload as { source?: unknown }).source === "string"
                ? ((payload as { source: string }).source)
                : null;
            const sourceTotalRaw = (payload as { source_total?: unknown }).source_total;
            const sourceTotal =
              typeof sourceTotalRaw === "number"
                ? sourceTotalRaw
                : typeof sourceTotalRaw === "string"
                  ? Number.parseInt(sourceTotalRaw, 10)
                  : null;
            const mirroredCountRaw = (payload as { mirrored_count?: unknown }).mirrored_count;
            const mirroredCount =
              typeof mirroredCountRaw === "number"
                ? mirroredCountRaw
                : typeof mirroredCountRaw === "string"
                  ? Number.parseInt(mirroredCountRaw, 10)
                  : null;
            const reviewedRowsRaw = (payload as { reviewed_rows?: unknown }).reviewed_rows;
            const reviewedRows =
              typeof reviewedRowsRaw === "number"
                ? reviewedRowsRaw
                : typeof reviewedRowsRaw === "string"
                  ? Number.parseInt(reviewedRowsRaw, 10)
                  : null;
            const changedRowsRaw = (payload as { changed_rows?: unknown }).changed_rows;
            const changedRows =
              typeof changedRowsRaw === "number"
                ? changedRowsRaw
                : typeof changedRowsRaw === "string"
                  ? Number.parseInt(changedRowsRaw, 10)
                  : null;
            const totalRowsRaw = (payload as { total_rows?: unknown }).total_rows;
            const totalRows =
              typeof totalRowsRaw === "number"
                ? totalRowsRaw
                : typeof totalRowsRaw === "string"
                  ? Number.parseInt(totalRowsRaw, 10)
                  : null;
            const failedRowsRaw = (payload as { failed_rows?: unknown }).failed_rows;
            const failedRows =
              typeof failedRowsRaw === "number"
                ? failedRowsRaw
                : typeof failedRowsRaw === "string"
                  ? Number.parseInt(failedRowsRaw, 10)
                  : null;
            const skippedRowsRaw = (
              payload as { skipped_rows?: unknown; skipped_existing_rows?: unknown; skipped_manual_rows?: unknown }
            ).skipped_rows ??
              (payload as { skipped_existing_rows?: unknown }).skipped_existing_rows ??
              (payload as { skipped_manual_rows?: unknown }).skipped_manual_rows;
            const skippedRows =
              typeof skippedRowsRaw === "number"
                ? skippedRowsRaw
                : typeof skippedRowsRaw === "string"
                  ? Number.parseInt(skippedRowsRaw, 10)
                  : null;
            const forceStatusRaw = (payload as { force_status?: unknown }).force_status;
            const forceStatus =
              forceStatusRaw === "pending" ||
              forceStatusRaw === "running" ||
              forceStatusRaw === "completed" ||
              forceStatusRaw === "warning" ||
              forceStatusRaw === "skipped" ||
              forceStatusRaw === "failed"
                ? forceStatusRaw
                : null;
            const skipReason =
              typeof (payload as { skip_reason?: unknown }).skip_reason === "string"
                ? ((payload as { skip_reason: string }).skip_reason)
                : null;
            const detail =
              typeof (payload as { detail?: unknown }).detail === "string"
                ? ((payload as { detail: string }).detail)
                : null;
            const elapsedMsRaw = (payload as { elapsed_ms?: unknown }).elapsed_ms;
            const elapsedMs =
              typeof elapsedMsRaw === "number"
                ? elapsedMsRaw
                : typeof elapsedMsRaw === "string"
                  ? Number.parseInt(elapsedMsRaw, 10)
                  : null;
            const heartbeat = (payload as { heartbeat?: unknown }).heartbeat === true;
            const serviceUnavailable =
              (payload as { service_unavailable?: unknown }).service_unavailable === true;
            const retryAfterRaw = (payload as { retry_after_s?: unknown }).retry_after_s;
            const retryAfterS =
              typeof retryAfterRaw === "number"
                ? retryAfterRaw
                : typeof retryAfterRaw === "string"
                  ? Number.parseInt(retryAfterRaw, 10)
                  : null;
            const runId =
              typeof (payload as { run_id?: unknown }).run_id === "string"
                ? ((payload as { run_id: string }).run_id)
                : null;
            const payloadRequestId =
              resolveRequestIdFromPayload(payload, requestId);
            const checkpoint =
              typeof (payload as { checkpoint?: unknown }).checkpoint === "string"
                ? ((payload as { checkpoint: string }).checkpoint)
                : null;
            const streamStateRaw = (payload as { stream_state?: unknown }).stream_state;
            const streamState =
              streamStateRaw === "connecting" ||
              streamStateRaw === "connected" ||
              streamStateRaw === "streaming" ||
              streamStateRaw === "failed" ||
              streamStateRaw === "completed"
                ? streamStateRaw
                : null;
            const errorCode =
              typeof (payload as { error_code?: unknown }).error_code === "string"
                ? ((payload as { error_code: string }).error_code)
                : null;
            const attemptRaw = (payload as { attempt?: unknown }).attempt;
            const attempt =
              typeof attemptRaw === "number"
                ? attemptRaw
                : typeof attemptRaw === "string"
                  ? Number.parseInt(attemptRaw, 10)
                  : null;
            const maxAttemptsRaw = (payload as { max_attempts?: unknown }).max_attempts;
            const maxAttempts =
              typeof maxAttemptsRaw === "number"
                ? maxAttemptsRaw
                : typeof maxAttemptsRaw === "string"
                  ? Number.parseInt(maxAttemptsRaw, 10)
                  : null;
            const attemptElapsedRaw = (payload as { attempt_elapsed_ms?: unknown }).attempt_elapsed_ms;
            const attemptElapsedMs =
              typeof attemptElapsedRaw === "number"
                ? attemptElapsedRaw
                : typeof attemptElapsedRaw === "string"
                  ? Number.parseInt(attemptElapsedRaw, 10)
                  : null;
            const attemptTimeoutRaw = (payload as { attempt_timeout_ms?: unknown }).attempt_timeout_ms;
            const attemptTimeoutMs =
              typeof attemptTimeoutRaw === "number"
                ? attemptTimeoutRaw
                : typeof attemptTimeoutRaw === "string"
                  ? Number.parseInt(attemptTimeoutRaw, 10)
                  : null;
            const backendHost =
              typeof (payload as { backend_host?: unknown }).backend_host === "string"
                ? ((payload as { backend_host: string }).backend_host)
                : null;
            const resolvedRunId = payloadRequestId ?? runId ?? requestId;
            const nextLiveCounts = resolveJobLiveCounts(refreshLiveCounts, payload);
            setRefreshLiveCounts(nextLiveCounts);
            const connectDetailMessage = buildProxyConnectDetailMessage({
              stage: rawPhase,
              message,
              attempt:
                typeof attempt === "number" && Number.isFinite(attempt) ? attempt : null,
              maxAttempts:
                typeof maxAttempts === "number" && Number.isFinite(maxAttempts) ? maxAttempts : null,
              attemptElapsedMs:
                typeof attemptElapsedMs === "number" && Number.isFinite(attemptElapsedMs)
                  ? attemptElapsedMs
                  : null,
              attemptTimeoutMs:
                typeof attemptTimeoutMs === "number" && Number.isFinite(attemptTimeoutMs)
                  ? attemptTimeoutMs
                  : null,
            });
            const baseDetailMessage = connectDetailMessage ?? buildPersonRefreshDetailMessage({
              rawStage: rawPhase,
              message,
              heartbeat,
              elapsedMs,
              source,
              sourceTotal:
                typeof sourceTotal === "number" && Number.isFinite(sourceTotal)
                  ? sourceTotal
                  : null,
              mirroredCount:
                typeof mirroredCount === "number" && Number.isFinite(mirroredCount)
                  ? mirroredCount
                  : null,
              current: numericCurrent,
              total: numericTotal,
              skipReason,
              detail,
              serviceUnavailable,
              retryAfterS:
                typeof retryAfterS === "number" && Number.isFinite(retryAfterS)
                  ? retryAfterS
                  : null,
              reviewedRows:
                typeof reviewedRows === "number" && Number.isFinite(reviewedRows)
                  ? reviewedRows
                  : null,
              changedRows:
                typeof changedRows === "number" && Number.isFinite(changedRows)
                  ? changedRows
                  : null,
              totalRows:
                typeof totalRows === "number" && Number.isFinite(totalRows)
                  ? totalRows
                  : null,
              failedRows:
                typeof failedRows === "number" && Number.isFinite(failedRows)
                  ? failedRows
                  : null,
              skippedRows:
                typeof skippedRows === "number" && Number.isFinite(skippedRows)
                  ? skippedRows
                  : null,
            });
            const enrichedMessage = appendLiveCountsToMessage(baseDetailMessage ?? message ?? "", nextLiveCounts);
            setRefreshProgress({
              current: numericCurrent,
              total: numericTotal,
              phase: mappedPhase ?? rawPhase,
              message: enrichedMessage || baseDetailMessage || message || null,
              detailMessage: enrichedMessage || baseDetailMessage || message || null,
              runId: resolvedRunId,
              rawStage: rawPhase,
              lastEventAt: Date.now(),
              checkpoint,
              streamState,
              errorCode,
              attemptElapsedMs:
                typeof attemptElapsedMs === "number" && Number.isFinite(attemptElapsedMs)
                  ? attemptElapsedMs
                  : null,
              attemptTimeoutMs:
                typeof attemptTimeoutMs === "number" && Number.isFinite(attemptTimeoutMs)
                  ? attemptTimeoutMs
                  : null,
              backendHost,
            });
            setRefreshPipelineSteps((prev) =>
              updatePersonRefreshPipelineSteps(
                prev ?? createPersonRefreshPipelineSteps(pipelineMode),
                {
                  rawStage: rawPhase,
                  message: enrichedMessage || baseDetailMessage || message,
                  current: numericCurrent,
                  total: numericTotal,
                  heartbeat,
                  skipReason,
                  serviceUnavailable,
                  detail,
                  forceStatus,
                },
              ),
            );
            appendRefreshLog({
              source: "page_refresh",
              stage: rawPhase ?? "reprocess_progress",
              message: enrichedMessage || baseDetailMessage || message || "Person pipeline progress update",
              level: "info",
              runId: resolvedRunId,
            });
            } else if (eventType === "complete") {
            sawComplete = true;
            const payloadRequestId =
              resolveRequestIdFromPayload(payload, requestId);
            const completeLiveCounts = resolveJobLiveCounts(refreshLiveCounts, payload);
            setRefreshLiveCounts(completeLiveCounts);
            const summary = payload && typeof payload === "object" && "summary" in payload
              ? (payload as { summary?: unknown }).summary
              : payload;
            const summaryText = formatPersonRefreshSummary(summary);
            const liveCountSuffix = formatJobLiveCounts(completeLiveCounts);
            const completionMessage =
              summaryText
                ? `${summaryText}${liveCountSuffix ? `. ${liveCountSuffix}` : ""}. Reloading photos...`
                : liveCountSuffix
                  ? `Reprocessing complete. ${liveCountSuffix}. Reloading photos...`
                  : "Reprocessing complete. Reloading photos...";
            setRefreshPipelineSteps((prev) =>
              finalizePersonRefreshPipelineSteps(
                prev ?? createPersonRefreshPipelineSteps(pipelineMode),
                pipelineMode,
                summary,
              ),
            );
            setRefreshProgress({
              current: null,
              total: null,
              phase: "COMPLETED",
              rawStage: "complete",
              message: completionMessage,
              detailMessage: completionMessage,
              runId: payloadRequestId,
              lastEventAt: null,
            });
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
            const errorPayload =
              payload && typeof payload === "object"
                ? (payload as {
                    stage?: string;
                    error?: string;
                    detail?: string;
                    request_id?: string;
                    checkpoint?: string;
                    stream_state?: string;
                    error_code?: string;
                    is_terminal?: boolean;
                    backend_host?: string;
                    attempts_used?: number | string;
                    max_attempts?: number | string;
                  })
                : null;
            const payloadRequestId =
              resolveRequestIdFromPayload(errorPayload, requestId);
            const attemptUsedRaw = errorPayload?.attempts_used;
            const maxAttemptsRaw = errorPayload?.max_attempts;
            const attemptsUsed =
              typeof attemptUsedRaw === "number"
                ? attemptUsedRaw
                : typeof attemptUsedRaw === "string"
                  ? Number.parseInt(attemptUsedRaw, 10)
                  : null;
            const maxAttempts =
              typeof maxAttemptsRaw === "number"
                ? maxAttemptsRaw
                : typeof maxAttemptsRaw === "string"
                  ? Number.parseInt(maxAttemptsRaw, 10)
                  : null;
            const isTerminal = errorPayload?.is_terminal === true;
            const terminalProxyConnectError =
              isTerminal &&
              errorPayload?.stage === "proxy_connecting" &&
              (errorPayload?.checkpoint === "connect_exhausted" ||
                errorPayload?.stream_state === "failed");
            const errorText = terminalProxyConnectError
              ? buildProxyTerminalErrorMessage({
                  stage: errorPayload?.stage ?? null,
                  checkpoint: errorPayload?.checkpoint ?? null,
                  error: errorPayload?.error ?? null,
                  detail: errorPayload?.detail ?? null,
                  errorCode: errorPayload?.error_code ?? null,
                  backendHost: errorPayload?.backend_host ?? null,
                  attemptsUsed:
                    typeof attemptsUsed === "number" && Number.isFinite(attemptsUsed)
                      ? attemptsUsed
                      : null,
                  maxAttempts:
                    typeof maxAttempts === "number" && Number.isFinite(maxAttempts)
                      ? maxAttempts
                      : null,
                })
              : errorPayload?.error && errorPayload?.detail
                ? `${errorPayload.error}: ${errorPayload.detail}`
                : errorPayload?.error || "Failed to reprocess images";
            setRefreshError(errorText);
            setRefreshPipelineSteps((prev) =>
              updatePersonRefreshPipelineSteps(
                prev ?? createPersonRefreshPipelineSteps(pipelineMode),
                {
                  rawStage:
                    payload && typeof payload === "object" && typeof payload.stage === "string"
                      ? payload.stage
                      : null,
                  message: errorPayload?.error ?? "Failed to reprocess images",
                  detail: errorPayload?.detail ?? null,
                  current: null,
                  total: null,
                  forceStatus: "failed",
                },
              ),
            );
            setRefreshProgress((prev) =>
              prev
                ? {
                    ...prev,
                    checkpoint:
                      typeof errorPayload?.checkpoint === "string" ? errorPayload.checkpoint : prev.checkpoint,
                    streamState:
                      errorPayload?.stream_state === "connecting" ||
                      errorPayload?.stream_state === "connected" ||
                      errorPayload?.stream_state === "streaming" ||
                      errorPayload?.stream_state === "failed" ||
                      errorPayload?.stream_state === "completed"
                        ? errorPayload.stream_state
                        : prev.streamState,
                    errorCode:
                      typeof errorPayload?.error_code === "string"
                        ? errorPayload.error_code
                        : prev.errorCode,
                    backendHost:
                      typeof errorPayload?.backend_host === "string"
                        ? errorPayload.backend_host
                        : prev.backendHost,
                    detailMessage: errorText,
                    lastEventAt: Date.now(),
                  }
                : prev,
            );
            appendRefreshLog({
              source: "page_refresh",
              stage: "reprocess_error",
              message: errorPayload?.error || "Failed to reprocess images",
              detail: errorPayload?.detail ?? errorText,
              level: "error",
              runId: payloadRequestId,
            });
            const backendErr = new Error(errorText);
            backendErr.name = "BackendError";
              throw backendErr;
            }
            },
          },
        );
      } catch (streamErr) {
        const streamError = streamErr instanceof Error ? streamErr.message : String(streamErr);
        const handoffOperationFromError = parsePersonPipelineMonitorSwitchOperationId(streamError);
        if (handoffOperationFromError) {
          handoffOperationId = handoffOperationFromError;
        } else {
          throw streamErr;
        }
      }

      if (handoffOperationId) {
        const operationIdForMonitor = handoffOperationId;
        const state = await waitForOperationTerminalState({
          operationId: operationIdForMonitor,
          flowScope: reprocessOperationFlowScope ?? `person:${personId}:reprocess`,
          flowKey: operationSessionFlowKey,
          input: reprocessRequestPath,
          method: "POST",
          requestHeaders: headers,
          onStreamEvent: async ({ event, payload }) => {
            persistPersonOperationSessionEvent({
              flowScope: reprocessOperationFlowScope,
              flowKey: operationSessionFlowKey,
              requestPath: reprocessRequestPath,
              method: "POST",
              eventType: event,
              payload,
            });
            await applyReprocessResumeEvent(event, payload, operationIdForMonitor);
          },
        });
        if (state.status === "failed") {
          throw new Error(selectedStage.failureLabel);
        }
        if (state.status === "cancelled") {
          throw new Error("Run Person Pipeline was cancelled");
        }
      } else if (!sawComplete && !hadError) {
        throw new Error("Reprocess stream ended before completion.");
      }

      // Reload photos to show updated crops/counts
      await fetchPhotos();
      return true;
    } catch (err) {
      console.error("Failed to reprocess images:", err);
      const errorMessage = formatPipelineStreamError(err, "Failed to reprocess images");
      setRefreshError(errorMessage);
      setRefreshPipelineSteps((prev) =>
        updatePersonRefreshPipelineSteps(
          prev ?? createPersonRefreshPipelineSteps(pipelineMode),
          {
            rawStage: null,
            message: errorMessage,
            current: null,
            total: null,
            forceStatus: "failed",
          },
        ),
      );
      appendRefreshLog({
        source: "page_refresh",
        stage: "reprocess_error",
        message: selectedStage.failureLabel,
        detail: errorMessage,
        level: "error",
        runId: requestId,
      });
      return false;
    } finally {
      setReprocessingImages(false);
      setRefreshLiveCounts(null);
    }
  }, [
    refreshingImages,
    reprocessingImages,
    appendRefreshLog,
    fetchPhotos,
    formatPipelineStreamError,
    getAuthHeaders,
    personId,
    refreshLiveCounts,
    buildPersonRefreshRequestId,
    refreshOperationFlowScope,
    reprocessOperationFlowScope,
    reprocessStreamPath,
    persistPersonOperationSessionEvent,
    applyPipelineOperationEnvelope,
    applyReprocessResumeEvent,
    fullStageTargets,
    scopedStageTargets,
    effectiveGalleryImportContext.showId,
    effectiveGalleryImportContext.showName,
    effectiveGalleryImportSuffix,
  ]);

  const handleRunPersonPipeline = useCallback(async (scope: StageTargetScope = "filtered") => {
    const refreshedPhotos = await handleRefreshImages("full", { openFollowUpPrompt: false });
    if (!refreshedPhotos) return false;
    const scopedPhotos =
      scope === "full" ? refreshedPhotos : filterPhotosByCurrentGalleryScope(refreshedPhotos);
    const stageTargets = buildStageTargetsFromPhotos(scopedPhotos);
    return handleReprocessImages(
      "all",
      scope,
      stageTargets,
      getReprocessSourcesForGetImagesSelection(getImagesSourceSelection),
    );
  }, [filterPhotosByCurrentGalleryScope, getImagesSourceSelection, handleRefreshImages, handleReprocessImages]);

  const handleGetImagesFollowUpSelection = useCallback(
    (scope: StageTargetScope) => {
      setGetImagesFollowUpPromptOpen(false);
      void handleReprocessImages(
        "all",
        scope,
        undefined,
        getReprocessSourcesForGetImagesSelection(getImagesSourceSelection),
      );
    },
    [getImagesSourceSelection, handleReprocessImages]
  );

  useEffect(() => {
    if (!hasAccess || !personId) return;
    if (!primaryGalleryReady) return;
    if (resumedPersonPipelineRef.current) return;
    let cancelled = false;
    let resumableSession: AdminOperationSessionRecord | null = null;
    let detectedReprocessSession = false;

    const resumeOperation = async () => {
      try {
        const refreshSession =
          refreshOperationFlowScope ? getAutoResumableAdminOperationSession(refreshOperationFlowScope) : null;
        const reprocessSession =
          reprocessOperationFlowScope ? getAutoResumableAdminOperationSession(reprocessOperationFlowScope) : null;
        const bestActiveOperation = await fetchBestActivePersonPipelineOperation();
        if (cancelled) return;

        resumableSession =
          [refreshSession, reprocessSession]
            .filter((session): session is NonNullable<typeof refreshSession> => Boolean(session?.operationId))
            .sort((left, right) => (right.updatedAtMs ?? 0) - (left.updatedAtMs ?? 0))[0] ?? null;

        if (bestActiveOperation && isPersonPipelineOperationType(bestActiveOperation.operation_type)) {
          const flowScope = getPersonPipelineFlowScopeForOperationType(personId, bestActiveOperation.operation_type);
          const requestPath =
            bestActiveOperation.operation_type === "admin_person_reprocess_images"
              ? reprocessStreamPath
              : refreshStreamPath;
          if (flowScope && requestPath) {
            const existingSession = getAdminOperationSession(flowScope);
            resumableSession = upsertAdminOperationSession(flowScope, {
              flowKey: existingSession?.flowKey ?? getOrCreateAdminFlowKey(flowScope),
              input: requestPath,
              method: "POST",
              status: "active",
              operationId: bestActiveOperation.id,
              canonicalStatus: canonicalizeOperationStatus(bestActiveOperation.status, "running"),
              executionOwner: bestActiveOperation.execution_owner ?? null,
              executionModeCanonical: bestActiveOperation.execution_mode_canonical ?? null,
              executionBackendCanonical: bestActiveOperation.execution_backend_canonical ?? null,
              latestPhase: bestActiveOperation.latest_phase ?? null,
            });
          }
        }

        if (!resumableSession?.operationId) return;
        const activeSession = resumableSession;
        const activeOperationId = activeSession.operationId;
        if (!activeOperationId) return;
        if (isLikelyStalePersonPipelineSession(resumableSession)) {
          setRefreshNotice("A previous person pipeline looks stale. Clear the stale job before starting a fresh run.");
          setRefreshProgress((prev) => ({
            current: prev?.current ?? null,
            total: prev?.total ?? null,
            phase: prev?.phase ?? PERSON_REFRESH_PHASES.syncing,
            rawStage: prev?.rawStage ?? "operation",
            message: "A previous person pipeline looks stale.",
            detailMessage: "A previous person pipeline looks stale. Clear the stale job before starting a fresh run.",
            runId: activeOperationId,
            lastEventAt: Date.now(),
            checkpoint: "stale_resume_blocked",
            streamState: "failed",
            errorCode: "STALE_SESSION",
            attemptElapsedMs: prev?.attemptElapsedMs ?? null,
            attemptTimeoutMs: prev?.attemptTimeoutMs ?? null,
            backendHost: prev?.backendHost ?? null,
            sourceProgress: prev?.sourceProgress ?? null,
            gettyProgress: prev?.gettyProgress ?? null,
            executionOwner: activeSession.executionOwner ?? prev?.executionOwner ?? null,
            executionModeCanonical: activeSession.executionModeCanonical ?? prev?.executionModeCanonical ?? null,
            executionBackendCanonical:
              activeSession.executionBackendCanonical ?? prev?.executionBackendCanonical ?? null,
            operationStatus: "cancelling",
          }));
          return;
        }

        resumedPersonPipelineRef.current = true;
        const requestHeaders = await getAuthHeaders();
        if (cancelled) return;

        const isReprocessSession =
          !!reprocessSession?.operationId && reprocessSession.operationId === activeSession.operationId;
        detectedReprocessSession = isReprocessSession;
        const flowScope = isReprocessSession ? reprocessOperationFlowScope : refreshOperationFlowScope;
        const requestPath = isReprocessSession
          ? (reprocessStreamPath ?? `/api/admin/trr-api/people/${personId}/reprocess-images/stream`)
          : (refreshStreamPath ?? `/api/admin/trr-api/people/${personId}/refresh-images/stream`);
        const pipelineMode: PersonRefreshPipelineMode = isReprocessSession ? "reprocess" : "ingest";
        const resumeMessage = isReprocessSession
          ? "Reattaching to in-flight person reprocess operation..."
          : "Reattaching to in-flight person refresh operation...";

        if (isReprocessSession) {
          setReprocessingImages(true);
        } else {
          setRefreshingImages(true);
        }
        setRefreshError(null);
        setRefreshNotice(resumeMessage);
        setRefreshPipelineSteps(createPersonRefreshPipelineSteps(pipelineMode));
        setRefreshProgress({
          phase: PERSON_REFRESH_PHASES.syncing,
          rawStage: "operation",
          message: resumeMessage,
          detailMessage: resumeMessage,
          current: null,
          total: null,
          runId: activeOperationId,
          lastEventAt: Date.now(),
          checkpoint: "resume_attach",
          streamState: "connecting",
          errorCode: null,
          attemptElapsedMs: null,
          attemptTimeoutMs: null,
          backendHost: null,
          sourceProgress: null,
          gettyProgress: null,
          executionOwner: activeSession.executionOwner ?? null,
          executionModeCanonical: activeSession.executionModeCanonical ?? null,
          executionBackendCanonical: activeSession.executionBackendCanonical ?? null,
          operationStatus:
            activeSession.canonicalStatus === "running" || activeSession.canonicalStatus === "cancelling"
              ? activeSession.canonicalStatus
              : "queued",
        });
        appendRefreshLog({
          source: "page_refresh",
          stage: "resume_attach",
          message: resumeMessage,
          detail: `operation ${activeOperationId.slice(0, 8)}`,
          level: "info",
          runId: activeOperationId,
        });

        const state = await waitForOperationTerminalState({
          operationId: activeOperationId,
          flowScope: flowScope ?? `person:${personId}:resume`,
          flowKey: activeSession.flowKey,
          input: requestPath,
          method: activeSession.method || "POST",
          requestHeaders,
          onStreamEvent: async ({ event, payload }) => {
            if (cancelled) return;
            persistPersonOperationSessionEvent({
              flowScope,
              flowKey: activeSession.flowKey,
              requestPath,
              method: activeSession.method || "POST",
              eventType: event,
              payload,
            });
            if (isReprocessSession) {
              await applyReprocessResumeEvent(event, payload, activeOperationId);
            } else {
              await applyRefreshResumeEvent(event, payload, activeOperationId);
            }
          },
        });

        if (cancelled) return;
        if (state.status === "completed") {
          if (isReprocessSession) {
            await fetchPhotos();
          } else {
            await Promise.all([
              fetchPerson(),
              fetchCredits(),
              fetchFandomData(),
              fetchBravoVideos(),
              loadUnifiedNews({ force: true }),
              fetchCoverPhoto(),
            ]);
            await fetchPhotos();
          }
        }
      } catch (error) {
        if (cancelled) return;
        const errorMessage = formatPipelineStreamError(
          error,
          detectedReprocessSession ? "Failed to reprocess images" : "Failed to get images",
        );
        setRefreshError(errorMessage);
        appendRefreshLog({
          source: "page_refresh",
          stage: "resume_error",
          message: "Failed to reattach to in-flight operation",
          detail: errorMessage,
          level: "error",
          runId: resumableSession?.operationId ?? undefined,
        });
      } finally {
        if (cancelled) return;
        setRefreshingImages(false);
        setReprocessingImages(false);
      }
    };

    void resumeOperation();

    return () => {
      cancelled = true;
    };
  }, [
    hasAccess,
    personId,
    refreshOperationFlowScope,
    reprocessOperationFlowScope,
    refreshStreamPath,
    reprocessStreamPath,
    getAuthHeaders,
    persistPersonOperationSessionEvent,
    applyRefreshResumeEvent,
    applyReprocessResumeEvent,
    appendRefreshLog,
    fetchPerson,
    fetchCredits,
    fetchFandomData,
    fetchBravoVideos,
    loadUnifiedNews,
    fetchCoverPhoto,
    fetchPhotos,
    fetchBestActivePersonPipelineOperation,
    formatPipelineStreamError,
    isLikelyStalePersonPipelineSession,
    primaryGalleryReady,
  ]);

  const handleCancelPersonPipeline = useCallback(async () => {
    const bestActiveOperation = await fetchBestActivePersonPipelineOperation();
    const activeSession = getCurrentPersonPipelineOperationSession();
    const operationId =
      (typeof bestActiveOperation?.id === "string" ? bestActiveOperation.id.trim() : "") ||
      activeSession?.operationId?.trim() ||
      "";
    if (!operationId) {
      setRefreshError("No active person pipeline operation is available to cancel yet.");
      return;
    }

    setCancellingPersonPipeline(true);
    setRefreshError(null);
    setRefreshNotice(`Requesting cancellation for operation ${operationId.slice(0, 8)}...`);
    setRefreshProgress((prev) =>
      prev
        ? {
            ...prev,
            phase: prev.phase ?? PERSON_REFRESH_PHASES.syncing,
            rawStage: "operation",
            message: "Cancellation requested...",
            detailMessage: `Requesting cancellation for operation ${operationId.slice(0, 8)}...`,
            lastEventAt: Date.now(),
          }
        : prev
    );
    appendRefreshLog({
      source: "page_refresh",
      stage: "cancel_requested",
      message: "Cancellation requested.",
      detail: `operation ${operationId.slice(0, 8)}`,
      level: "info",
      runId: operationId,
    });

    try {
      const headers = await getAuthHeaders();
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/operations/${operationId}/cancel`,
        {
          method: "POST",
          headers,
        },
        { allowDevAdminBypass: true }
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        operation?: { status?: string | null };
        cancelled_operations?: number;
        cancelled_operation_ids?: string[];
      };
      if (!response.ok) {
        throw new Error(payload.error ?? `HTTP ${response.status}`);
      }

      const resultingStatus = String(payload.operation?.status || "").trim().toLowerCase();
      const cancelledOperationIds = Array.isArray(payload.cancelled_operation_ids)
        ? payload.cancelled_operation_ids.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        : [];
      if (activeSession?.flowScope && resultingStatus === "cancelled") {
        markAdminOperationSessionStatus(activeSession.flowScope, "cancelled");
      }
      const notice =
        resultingStatus === "cancelled"
          ? cancelledOperationIds.length > 1
            ? `Cancelled ${cancelledOperationIds.length} related person pipeline jobs.`
            : `Pipeline operation ${operationId.slice(0, 8)} cancelled.`
          : cancelledOperationIds.length > 1
            ? `Cancellation requested for ${cancelledOperationIds.length} related person pipeline jobs.`
            : `Cancellation requested for operation ${operationId.slice(0, 8)}.`;
      setRefreshNotice(notice);
      setRefreshProgress((prev) =>
        prev
          ? {
              ...prev,
              phase: prev.phase ?? PERSON_REFRESH_PHASES.syncing,
              rawStage: "operation",
              message: notice,
              detailMessage:
                resultingStatus === "cancelled"
                  ? notice
                  : `${notice} Waiting for the worker to stop...`,
              lastEventAt: Date.now(),
              operationStatus: resultingStatus === "cancelled" ? "cancelled" : "cancelling",
            }
          : prev
      );
      appendRefreshLog({
        source: "page_refresh",
        stage: "cancel_requested",
        message: notice,
        detail:
          cancelledOperationIds.length > 1
            ? cancelledOperationIds.map((value) => value.slice(0, 8)).join(", ")
            : undefined,
        level: "info",
        runId: operationId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to cancel person pipeline";
      setRefreshError(message);
      appendRefreshLog({
        source: "page_refresh",
        stage: "cancel_requested",
        message: "Cancellation failed.",
        detail: message,
        level: "error",
        runId: operationId,
      });
    } finally {
      setCancellingPersonPipeline(false);
    }
  }, [appendRefreshLog, fetchBestActivePersonPipelineOperation, getAuthHeaders, getCurrentPersonPipelineOperationSession]);

  const handleClearStalePersonPipeline = useCallback(async (overrideOperationId?: string | null) => {
    const staleSession = stalePersonPipelineSession;
    const activeSession = getCurrentPersonPipelineOperationSession();
    const operationId =
      (typeof overrideOperationId === "string" ? overrideOperationId.trim() : "") ||
      staleSession?.operationId?.trim() ||
      activeSession?.operationId?.trim() ||
      "";
    if (!operationId) {
      setRefreshError("No stale person pipeline operation is available to clear.");
      return;
    }
    setCancellingPersonPipeline(true);
    setRefreshError(null);
    setRefreshNotice(`Clearing stale operation ${operationId.slice(0, 8)}...`);
    try {
      const headers = await getAuthHeaders();
      const response = await fetchAdminWithAuth(
        "/api/admin/trr-api/operations/stale/cancel",
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ operation_ids: [operationId], force_selected: true }),
        },
        { allowDevAdminBypass: true }
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        cancelled_operations?: number;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? `HTTP ${response.status}`);
      }
      if (staleSession?.flowScope) {
        clearAdminOperationSession(staleSession.flowScope);
      }
      if (activeSession?.flowScope && activeSession.flowScope !== staleSession?.flowScope) {
        clearAdminOperationSession(activeSession.flowScope);
      }
      setRefreshingImages(false);
      setReprocessingImages(false);
      setRefreshProgress((prev) =>
        prev
          ? {
              ...prev,
              message: `Cleared job ${operationId.slice(0, 8)}.`,
              detailMessage: `Force-cancelled job ${operationId.slice(0, 8)} and returned the gallery to ready state.`,
              lastEventAt: Date.now(),
              operationStatus: "cancelled",
            }
          : prev,
      );
      setRefreshNotice(`Cleared job ${operationId.slice(0, 8)}.`);
      appendRefreshLog({
        source: "page_refresh",
        stage: "stale_cleanup",
        message: "Cleared person pipeline job.",
        detail: `operation ${operationId.slice(0, 8)}`,
        level: "info",
        runId: operationId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to clear person pipeline job";
      setRefreshError(message);
      appendRefreshLog({
        source: "page_refresh",
        stage: "stale_cleanup",
        message: "Failed to clear person pipeline job.",
        detail: message,
        level: "error",
        runId: operationId,
      });
    } finally {
      setCancellingPersonPipeline(false);
    }
  }, [appendRefreshLog, getAuthHeaders, getCurrentPersonPipelineOperationSession, stalePersonPipelineSession]);

  // Initial load
  useEffect(() => {
    if (!hasAccess) return;
    if (!personId) return;
    setPrimaryGalleryReady(false);
    showBrokenPhotoRefetchInitializedRef.current = false;
    let cancelled = false;
    const controller = new AbortController();
    const { signal } = controller;

    const loadData = async () => {
      try {
        await fetchPhotos({ signal, requestRole: "primary" });
        if (signal.aborted) return;
        if (!cancelled) {
          setPrimaryGalleryReady(true);
        }
        void runSecondaryRead(async () => {
          if (signal.aborted) return;
          await fetchCoverPhoto({ signal });
        });
      } catch (err) {
        if (signal.aborted) return;
        console.error("Failed to load person page data:", err);
      } finally {
        if (!cancelled && !signal.aborted) {
          setPrimaryGalleryReady(true);
        }
      }
    };

    void loadData();
    return () => {
      cancelled = true;
      controller.abort();
      secondaryReadQueueRef.current = [];
    };
  }, [hasAccess, fetchCoverPhoto, fetchPhotos, personId, runSecondaryRead]);

  useEffect(() => {
    if (activeTab !== "credits") return;
    if (!hasAccess || !personId || creditsLoading || credits.length > 0) return;
    const controller = new AbortController();
    void runSecondaryRead(async () => {
      await fetchCredits({ signal: controller.signal });
    });
    return () => {
      controller.abort();
    };
  }, [activeTab, credits.length, creditsLoading, fetchCredits, hasAccess, personId, runSecondaryRead]);

  useEffect(() => {
    if (activeTab !== "videos") return;
    if (!showIdForApi || bravoVideosLoaded) return;
    const controller = new AbortController();
    void runSecondaryRead(async () => {
      await fetchBravoVideos({ signal: controller.signal });
    });
    return () => {
      controller.abort();
    };
  }, [activeTab, bravoVideosLoaded, fetchBravoVideos, runSecondaryRead, showIdForApi]);

  useEffect(() => {
    if (!hasAccess || !personId) return;
    if (loading) return;
    if (!showBrokenPhotoRefetchInitializedRef.current) {
      showBrokenPhotoRefetchInitializedRef.current = true;
      return;
    }
    const controller = new AbortController();
    void fetchPhotos({
      signal: controller.signal,
      includeBroken: showBrokenRows,
      includeTotalCount: false,
      requestRole: "secondary",
    });
    return () => {
      controller.abort();
    };
  }, [fetchPhotos, hasAccess, loading, personId, showBrokenRows]);

  useEffect(() => {
    if (!hasAccess || !personId) return;
    if (effectiveOperationStatus !== "running" && effectiveOperationStatus !== "queued") return;

    const controller = new AbortController();
    void fetchPhotos({
      signal: controller.signal,
      includeBroken: showBrokenRows,
      includeTotalCount: false,
      requestRole: "secondary",
    });
    return () => {
      controller.abort();
    };
  }, [effectiveOperationStatus, fetchPhotos, hasAccess, personId, showBrokenRows]);

  useEffect(() => {
    if (activeTab !== "news") return;
    if (!showIdForApi || !personId) return;
    const controller = new AbortController();
    void runSecondaryRead(async () => {
      await loadUnifiedNews();
    });
    return () => {
      controller.abort();
    };
  }, [activeTab, loadUnifiedNews, personId, runSecondaryRead, showIdForApi]);

  useEffect(() => {
    if (activeTab !== "fandom") return;
    if (!hasAccess || fandomLoaded) return;
    const controller = new AbortController();
    void runSecondaryRead(async () => {
      await fetchFandomData({ signal: controller.signal });
    });
    return () => {
      controller.abort();
    };
  }, [activeTab, fandomLoaded, fetchFandomData, hasAccess, runSecondaryRead]);

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
  const primaryPhotoCandidates = useMemo(() => {
    const coverPhotoRecord =
      coverPhoto?.photo_id
        ? photos.find((photo) => photo.id === coverPhoto.photo_id) ?? null
        : null;
    return [
      ...(coverPhotoRecord ? getPersonPhotoCardUrlCandidates(coverPhotoRecord) : []),
      coverPhoto?.photo_url ?? null,
      bravoProfileImage,
      ...(photos.length > 0 ? getPersonPhotoCardUrlCandidates(photos[0]) : []),
      photos.find((photo) => typeof photo.hosted_url === "string" && photo.hosted_url.trim())?.hosted_url ?? null,
    ];
  }, [bravoProfileImage, coverPhoto?.photo_id, coverPhoto?.photo_url, photos]);

  const formatBravoPublishedDate = (value: string | null | undefined): string | null => {
    if (!value || typeof value !== "string") return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString();
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

  const socialBladeAccounts = useMemo(() => {
    const ids = person?.external_ids as Record<string, unknown> | undefined;
    if (!ids) return [] as Array<{ platform: SocialBladePersonPlatform; handle: string }>;
    return SOCIALBLADE_PERSON_PLATFORM_ORDER.flatMap((platform) => {
      const rawCandidates = [ids[`${platform}_id`], ids[platform]];
      const rawValue = rawCandidates.find((value) => typeof value === "string" && value.trim()) as string | undefined;
      if (!rawValue) return [];
      const normalizedExternalId = normalizePersonExternalIdValue(platform, rawValue);
      const normalizedHandle = normalizeSocialAccountProfileHandle(normalizedExternalId);
      if (!normalizedHandle) return [];
      return [{ platform, handle: normalizedHandle }];
    });
  }, [person?.external_ids]);
  const [selectedSocialBladePlatform, setSelectedSocialBladePlatform] = useState<SocialBladePersonPlatform>("instagram");
  const selectedSocialBladeAccount = useMemo(
    () =>
      socialBladeAccounts.find((account) => account.platform === selectedSocialBladePlatform) ??
      socialBladeAccounts[0] ??
      null,
    [selectedSocialBladePlatform, socialBladeAccounts],
  );

  useEffect(() => {
    if (!socialBladeAccounts.length) {
      setSelectedSocialBladePlatform("instagram");
      return;
    }
    setSelectedSocialBladePlatform((current) => {
      if (socialBladeAccounts.some((account) => account.platform === current)) return current;
      return socialBladeAccounts[0].platform;
    });
  }, [socialBladeAccounts]);

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
  const groupedAlternativeNames = useMemo(
    () => normalizeStringListMap(person?.alternative_names),
    [person?.alternative_names]
  );
  const alternativeNames = useMemo(
    () => flattenAlternativeNames(person?.alternative_names),
    [person?.alternative_names]
  );
  const breadcrumbShowName =
    showScopedCredits?.show_name && showScopedCredits.show_name.trim().length > 0
      ? showScopedCredits.show_name.trim()
      : resolvedShowNameForRouting?.trim()
        ? resolvedShowNameForRouting.trim()
      : showSlugForRouting
        ? showIdParam
          ? humanizeSlug(showSlugForRouting)
          : null
        : null;
  const breadcrumbShowHref = backShowTarget
    ? buildShowAdminUrl({ showSlug: backShowTarget })
    : undefined;
  const breadcrumbCastHref =
    backShowTarget && seasonNumber !== null
      ? buildSeasonAdminUrl({
          showSlug: backShowTarget,
          seasonNumber,
          tab: "social",
          socialView: "cast-content",
        })
      : null;
  useEffect(() => {
    if (!showSlugForRouting || !breadcrumbShowName) return;
    recordAdminRecentShow({
      slug: showSlugForRouting,
      label: breadcrumbShowName,
    });
  }, [breadcrumbShowName, showSlugForRouting]);

  useEffect(() => {
    if (!hasAccess || !person?.id) return;
    const requestKey = `${person.id}:${personRouteShowContext ?? ""}`;
    if (recentViewRequestKeyRef.current === requestKey) return;
    recentViewRequestKeyRef.current = requestKey;

    const run = async () => {
      try {
        await fetchWithAuth("/api/admin/recent-people", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personId: person.id,
            showId: personRouteShowContext ?? null,
          }),
        });
      } catch (error) {
        recentViewRequestKeyRef.current = null;
        console.warn("[people-page] Failed to record recent person view", error);
      }
    };

    void run();
  }, [fetchWithAuth, hasAccess, person?.id, personRouteShowContext]);

  useEffect(() => {
    if (!hasAccess || !personId || !profileRefreshAutoResumeScope) return;
    if (resumedProfileRefreshRef.current) return;
    const existingSession = getAutoResumableAdminOperationSession(profileRefreshAutoResumeScope);
    if (!existingSession?.operationId || existingSession.status !== "active") return;
    resumedProfileRefreshRef.current = true;
    setProfileRefreshMessage("Reattaching to in-flight profile refresh...");
    void handleRefreshProfileDetails();
  }, [
    handleRefreshProfileDetails,
    hasAccess,
    personId,
    profileRefreshAutoResumeScope,
  ]);

  const breadcrumbPersonHref = (() => {
    const queryString = searchParams.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  })();

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
                  castHref: breadcrumbCastHref,
                })}
              />
            </div>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {/* Profile Photo */}
              <ProfilePhoto urls={primaryPhotoCandidates} name={person.full_name} />

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
                  { id: "settings", label: "Settings" },
                  { id: "gallery", label: `Gallery (${photos.length})` },
                  { id: "videos", label: `Videos (${bravoVideos.length})` },
                  { id: "news", label: `News (${unifiedNews.length})` },
                  { id: "credits", label: `Credits (${credits.length})` },
                  { id: "fandom", label: fandomData.length > 0 ? `Fandom (${fandomData.length})` : "Fandom" },
                  { id: "social", label: "Social" },
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
              {/* Season Bios (NBCUMV) */}
              {person?.full_name && (
                <NbcumvSeasonBios personName={person.full_name} />
              )}

              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900">Refresh Info & Credits</h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      Refresh approved source links, profile details, Bravo hero image data, aliases, and related-show credits.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRefreshProfileDetails()}
                    disabled={refreshingProfile}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {refreshingProfile ? "Refreshing..." : "Refresh Info & Credits"}
                  </button>
                </div>
                {profileRefreshMessage && (
                  <p className="mt-4 text-sm text-zinc-700">{profileRefreshMessage}</p>
                )}
                {profileRefreshError && (
                  <p className="mt-2 text-sm text-red-600">{profileRefreshError}</p>
                )}
                {profileRefreshSummary && (
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-600">
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1">
                      Links: {Number(profileRefreshSummary.links_refreshed ?? 0)}
                    </span>
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1">
                      Aliases: {Number(profileRefreshSummary.aliases_added ?? 0)}
                    </span>
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1">
                      Fields: {Number(profileRefreshSummary.profile_fields_changed ?? 0)}
                    </span>
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1">
                      Shows: {Number(profileRefreshSummary.shows_processed ?? 0)}
                    </span>
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1">
                      Credits: {Number(profileRefreshSummary.credits_updated ?? 0)}
                    </span>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-zinc-900">Alternative Names</h3>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600">
                    {alternativeNames.length}
                  </span>
                </div>
                {alternativeNames.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {alternativeNames.map((name) => (
                      <span
                        key={name}
                        className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm text-zinc-700"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">No alternative names saved yet.</p>
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
                      className="relative aspect-[3/4] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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

              {/* Credits Preview */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-zinc-900">Credits</h3>
                  {creditsByShow.length > 5 && (
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
                  {creditsByShow.slice(0, 5).map((group) => {
                    const showLinkSlug =
                      showIdParam && showIdForApi && group.show_id === showIdForApi
                        ? showIdParam
                        : group.show_id;
                    return (
                      <Link
                        key={group.show_id}
                        href={`/admin/trr-shows/${showLinkSlug}`}
                        className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 transition hover:bg-zinc-100"
                      >
                        <div>
                          <p className="font-semibold text-zinc-900">
                            {group.show_name || "Unknown Show"}
                          </p>
                          <p className="text-sm text-zinc-600">
                            {formatCreditsGroupSummary(group)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-600">
                            {group.cast_groups.length + group.cast_non_episodic.length} cast
                          </span>
                          <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-600">
                            {group.crew_groups.length + group.crew_non_episodic.length} crew
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                {creditsByShow.length === 0 && (
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

          {activeTab === "settings" && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-zinc-900">Settings</h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    Manage external IDs and choose which source TRR should trust first when profile data disagrees.
                  </p>
                </div>

                <div className="space-y-6">
                  <PersonExternalIdsEditor
                    drafts={externalIdDrafts}
                    loading={externalIdsLoading}
                    saving={externalIdsSaving}
                    error={externalIdsError}
                    notice={externalIdsNotice}
                    onChangeDraft={handleChangeExternalIdDraft}
                    onAddDraft={handleAddExternalIdDraft}
                    onRemoveDraft={handleRemoveExternalIdDraft}
                    onSave={() => void saveExternalIds()}
                  />

                  <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                    <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <h3 className="text-lg font-bold text-zinc-900">Canonical Profile</h3>
                      <div className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-4 lg:max-w-md">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Source priority
                        </p>
                        <p className="mt-2 text-xs text-zinc-500">
                          Choose which source TRR should trust first when multiple sources disagree.
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
                                        <div className="mt-1 flex items-start justify-between gap-3">
                                          <p className="min-w-0 break-all text-sm font-medium text-zinc-900">
                                            {field.value}
                                          </p>
                                          <a
                                            href={field.value}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-100"
                                            aria-label={`Open ${label}`}
                                            title={`Open ${label}`}
                                          >
                                            <LinkOutIcon />
                                          </a>
                                        </div>
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

                          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                            <div className="mb-2 flex items-start justify-between gap-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                                Alternative Names
                              </p>
                              <span className="flex-shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-600">
                                {alternativeNames.length}
                              </span>
                            </div>
                            {alternativeNames.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {alternativeNames.map((name) => (
                                  <span
                                    key={name}
                                    className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700"
                                  >
                                    {name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-zinc-500">No alternative names available.</p>
                            )}
                          </div>

                          <details className="rounded-xl border border-zinc-200 bg-white p-4">
                            <summary className="cursor-pointer text-sm font-semibold text-zinc-700">
                              Raw Sources
                            </summary>
                            {Object.keys(groupedAlternativeNames).length > 0 && (
                              <div className="mt-3 space-y-2">
                                {Object.entries(groupedAlternativeNames).map(([source, names]) => (
                                  <div key={source}>
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                                      {formatAlternativeNameSourceLabel(source)}
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-700">{names.join(", ")}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            <pre className="mt-3 overflow-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-100">
                              {JSON.stringify(
                                {
                                  birthday: person.birthday ?? {},
                                  gender: person.gender ?? {},
                                  biography: person.biography ?? {},
                                  place_of_birth: person.place_of_birth ?? {},
                                  homepage: person.homepage ?? {},
                                  profile_image_url: person.profile_image_url ?? {},
                                  alternative_names: person.alternative_names ?? {},
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
                </div>
              </section>
            </div>
          )}

          {/* Gallery Tab */}
          {activeTab === "gallery" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
                <div className="mr-auto flex flex-wrap items-center gap-2">
                  <span
                    title={runtimeTooltipParts.length > 0 ? runtimeTooltipParts.join(" · ") : "Runtime metadata has not arrived yet."}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${runtimePillClass}`}
                  >
                    {runtimePillLabel}
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusPillClass}`}>
                    {statusPillLabel}
                  </span>
                  {latestPipelineSummary && (
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600">
                      {`Op ${latestPipelineSummary.operationId.slice(0, 8)} · ${latestPipelineSummary.runtimeLabel} · ${
                        latestPipelineSummary.phase
                          ? formatPersonRefreshPhaseLabel(latestPipelineSummary.phase) ?? latestPipelineSummary.phase
                          : "No phase"
                      } · ${
                        latestPipelineSummary.lastUpdatedMs
                          ? `${Math.max(0, Math.round((Date.now() - latestPipelineSummary.lastUpdatedMs) / 1000))}s ago`
                          : "no timestamp"
                      }`}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
                  {GET_IMAGES_SOURCE_OPTIONS.map((option) => {
                    const isActive = getImagesSourceSelection === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setGetImagesSourceSelection(option.value)}
                        disabled={refreshingImages || reprocessingImages}
                        title={option.description}
                        aria-pressed={isActive}
                        className={
                          isActive
                            ? "rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50"
                            : "rounded-md border border-transparent px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-white disabled:opacity-50"
                        }
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => void handleRefreshImages()}
                    disabled={refreshingImages || reprocessingImages}
                    title={
                      `${effectiveGalleryImportLabel ? `Run Get Images for ${effectiveGalleryImportLabel}` : "Run Get Images for the current gallery context"} using ${getImagesSelectionDetail(getImagesSourceSelection)} (source sync + mirror only).`
                    }
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M20 8a8 8 0 00-14-4M4 16a8 8 0 0014 4" />
                    </svg>
                    {refreshingImages
                      ? "Getting..."
                      : `Get Images (${getImagesSelectionLabel(getImagesSourceSelection)})`}
                  </button>
                  <button
                    onClick={() =>
                      stalePersonPipelineSession?.operationId
                        ? void handleClearStalePersonPipeline()
                        : effectiveOperationStatus === "cancelling" && activePersonPipelineSession?.operationId
                        ? void handleClearStalePersonPipeline(activePersonPipelineSession.operationId)
                        : refreshingImages || reprocessingImages
                        ? void handleCancelPersonPipeline()
                        : void handleRunPersonPipeline()
                    }
                    disabled={
                      stalePersonPipelineSession?.operationId
                        ? cancellingPersonPipeline
                        : refreshingImages || reprocessingImages
                        ? cancellingPersonPipeline || !activePersonPipelineSession?.operationId
                        : refreshingImages || reprocessingImages
                    }
                    title={
                      stalePersonPipelineSession?.operationId
                        ? "Force-cancel and clear the stale gallery job so the page returns to ready."
                        : effectiveOperationStatus === "cancelling" && activePersonPipelineSession?.operationId
                        ? "Force-cancel and clear the in-flight person pipeline job immediately."
                        : refreshingImages || reprocessingImages
                        ? activePersonPipelineSession?.operationId
                          ? "Cancel the in-flight person pipeline job."
                          : "Waiting for an active pipeline operation id before cancellation is available."
                        : effectiveGalleryImportLabel
                          ? `Run the full person pipeline for ${effectiveGalleryImportLabel} (Get Images + tagging + ID Text + Crop + Auto-Crop).`
                          : "Run the full person pipeline for the current gallery context."
                    }
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {stalePersonPipelineSession?.operationId || refreshingImages || reprocessingImages ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M18 6L6 18" />
                      ) : (
                        <>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </>
                      )}
                    </svg>
                    {stalePersonPipelineSession?.operationId
                      ? cancellingPersonPipeline
                        ? "Clearing..."
                        : "Clear Stale Job"
                      : effectiveOperationStatus === "cancelling" && activePersonPipelineSession?.operationId
                      ? cancellingPersonPipeline
                        ? "Clearing..."
                        : "Force Cancel"
                      : refreshingImages || reprocessingImages
                      ? cancellingPersonPipeline
                        ? "Cancelling..."
                        : "Cancel Job"
                      : "Run Person Pipeline"}
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
                      onClick={() => void handleReprocessImages("tagging")}
                      disabled={refreshingImages || reprocessingImages}
                      title="Run Tagging stage (face boxes + identity + owner focus) for existing images."
                      className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                    >
                      Tagging
                    </button>
                    <button
                      onClick={() => void handleReprocessImages("crop")}
                      disabled={refreshingImages || reprocessingImages}
                      title="Run Crop (save thumbnail framing/focus metadata) for existing images."
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
                  show={
                    refreshingImages ||
                    reprocessingImages ||
                    Boolean(refreshProgress) ||
                    Boolean(refreshPipelineSteps?.length)
                  }
                  phase={refreshProgress?.phase}
                  message={refreshProgress?.detailMessage ?? refreshProgress?.message}
                  current={refreshProgress?.current}
                  total={refreshProgress?.total}
                  lastEventAt={refreshProgress?.lastEventAt}
                  steps={refreshPipelineSteps}
                  sourceProgress={refreshProgress?.sourceProgress}
                  gettyProgress={refreshProgress?.gettyProgress}
                />
                {refreshError && (
                  <p className="text-xs text-red-600">{refreshError}</p>
                )}
                {refreshNotice && !refreshError && (
                  <p className="text-xs text-zinc-500">{refreshNotice}</p>
                )}
                {getImagesFollowUpPromptOpen && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-xs font-medium text-emerald-900">
                      Get Images finished{effectiveGalleryImportSuffix}. Run the full person pipeline now?
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleGetImagesFollowUpSelection("filtered")}
                        disabled={
                          refreshingImages ||
                          reprocessingImages ||
                          scopedStageTargets.targetCastPhotoIds.length + scopedStageTargets.targetMediaLinkIds.length === 0
                        }
                        className="rounded border border-emerald-300 bg-white px-2 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Run Person Pipeline on filtered scope
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGetImagesFollowUpSelection("full")}
                        disabled={
                          refreshingImages ||
                          reprocessingImages ||
                          fullStageTargets.targetCastPhotoIds.length + fullStageTargets.targetMediaLinkIds.length === 0
                        }
                        className="rounded border border-emerald-300 bg-white px-2 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Run Person Pipeline on full gallery
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {(showIdParam ||
                knownShowOptions.length > 0 ||
                hasWwhlMatches ||
                hasWwhlCredit ||
                hasBravoconMatches ||
                hasEventMatches ||
                hasUnknownShowMatches) && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Shows
                  </span>
                  <div className="flex items-center gap-2">
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
                        All Media ({galleryFilterCounts.all})
                      </button>
                    )}
                    {showIdParam && (
                      <button
                        type="button"
                        onClick={() => setGalleryShowFilter("this-show")}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          galleryShowFilter === "this-show"
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        {activeShowChipLabel} ({galleryFilterCounts.thisShow})
                      </button>
                    )}
                    {(showIdParam ? otherKnownShowOptions : knownShowOptions).map((option) => (
                      <button
                        type="button"
                        key={option.key}
                        onClick={() => {
                          setSelectedOtherShowKey(option.key);
                          setGalleryShowFilter("other-shows");
                        }}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          galleryShowFilter === "other-shows" && selectedOtherShowKey === option.key
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        {(getShowDisplayLabel(option.showName) ?? option.showName)} ({galleryFilterCounts.otherShowByKey.get(option.key) ?? 0})
                      </button>
                    ))}
                    {(hasWwhlMatches || hasWwhlCredit) && (
                      <button
                        type="button"
                        onClick={() => setGalleryShowFilter("wwhl")}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          galleryShowFilter === "wwhl"
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                          {WWHL_LABEL} ({galleryFilterCounts.wwhl})
                      </button>
                    )}
                    {hasBravoconMatches && (
                      <button
                        type="button"
                        onClick={() => setGalleryShowFilter("bravocon")}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          galleryShowFilter === "bravocon"
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        {BRAVOCON_LABEL} ({galleryFilterCounts.bravocon})
                      </button>
                    )}
                    {hasEventMatches && (
                      <div
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          galleryShowFilter === "events"
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        <div className="relative flex items-center">
                          <select
                            aria-label="Event category filter"
                            value={galleryShowFilter === "events" ? selectedEventSubcategoryKey : "all"}
                            onChange={(event) => {
                              setSelectedEventSubcategoryKey(event.target.value);
                              setSelectedEventBucketKey("all");
                              setGalleryShowFilter("events");
                            }}
                            className={`appearance-none bg-transparent pl-0 pr-5 text-xs font-semibold outline-none ${
                              galleryShowFilter === "events" ? "text-white" : "text-zinc-700"
                            }`}
                          >
                            <option value="all">Events ({galleryFilterCounts.events})</option>
                            {eventSubcategoryOptions.map((option) => (
                              <option key={option.key} value={option.key}>
                                {option.label} ({galleryFilterCounts.eventSubcategoryByKey.get(option.key) ?? 0})
                              </option>
                            ))}
                          </select>
                          <svg
                            className={`pointer-events-none absolute right-0 h-3 w-3 ${
                              galleryShowFilter === "events" ? "text-white" : "text-zinc-500"
                            }`}
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l4 4 4-4" />
                          </svg>
                        </div>
                      </div>
                    )}
                    {hasUnknownShowMatches && (
                      <button
                        type="button"
                        onClick={() => setGalleryShowFilter("unsorted")}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          galleryShowFilter === "unsorted"
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        {UNSORTED_LABEL} ({galleryFilterCounts.unsorted})
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-zinc-700">
                    Saved total:{" "}
                    {photosSavedTotal === null ? "calculating..." : `${photosSavedTotal.toLocaleString()} photos`}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {filteredPhotos.length.toLocaleString()} filtered, {photos.length.toLocaleString()}
                    {photosHasMore ? "+" : ""} loaded
                  </p>
                  {photosSavedTotalStatus === "deferred" && (
                    <p className="text-xs text-zinc-500">Exact saved count is loading in the background.</p>
                  )}
                </div>
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
                            className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-zinc-200"
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
                                {formatPhotoSourceLabel(photo.source)}
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
                    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                      {gallerySections.otherPhotos.map((photo) => {
                        const index = filteredPhotoIndexById.get(photo.id) ?? 0;
                        const isCover = coverPhoto?.photo_id === photo.id;
                        return (
                          <div
                            key={photo.id}
                            className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-zinc-200"
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
                                {formatPhotoSourceLabel(photo.source)}
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
              {(mainGalleryPhotos.length > photosVisibleCount || photosHasMore) && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => void handleLoadMorePhotos()}
                    disabled={photosLoadingMore}
                    className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                  >
                    {photosLoadingMore
                      ? "Loading More..."
                      : mainGalleryPhotos.length > photosVisibleCount
                        ? "Load More Photos"
                        : "Load More From Server"}
                  </button>
                </div>
              )}
              {otherEventCovers.length > 0 && (
                <div className="mt-8">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Other Events ({otherEventCovers.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {otherEventCovers.map((photo) => {
                      const metadata = (photo.metadata ?? {}) as Record<string, unknown>;
                      const eventTitle =
                        (typeof metadata.getty_event_title === "string" ? metadata.getty_event_title : null) ??
                        photo.caption ??
                        "Unknown Event";
                      const personCount = getPersonEventImageCount(photo, metadata);
                      const eventImageSrc = photo.thumb_url || photo.hosted_url || photo.url || null;

                      return (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => {
                            const eventUrl = typeof metadata.getty_event_url === "string" ? metadata.getty_event_url : null;
                            if (eventUrl) {
                              handleExpandEvent(eventUrl, eventTitle);
                            }
                          }}
                          className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition hover:shadow-md"
                        >
                          <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-100">
                            {eventImageSrc ? (
                              <Image
                                src={eventImageSrc}
                                alt={eventTitle}
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                className="object-cover transition group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                                No image
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="truncate text-xs font-medium text-zinc-800">{eventTitle}</p>
                            {personCount !== null && (
                              <p className="text-xs text-zinc-500">{personCount} images</p>
                            )}
                            <p className="mt-1 text-xs font-medium text-blue-600">Click to scrape</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {mainGalleryPhotos.length === 0 && photos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-zinc-500">
                    {referencesFilterActive && wantsReferences && activeReferenceCount === 0
                      ? "No active reference images are currently selected for this person."
                      : "No photos match the current filter."}
                  </p>
                  {referencesFilterActive && wantsReferences && activeReferenceCount === 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setAdvancedFilters({
                          ...advancedFilters,
                          references: [],
                        })
                      }
                      className="rounded border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                    >
                      Clear References Filter
                    </button>
                  )}
                </div>
              )}
              {photos.length === 0 && (
                <p className="text-sm text-zinc-500">
                  No photos available for this person.
                </p>
              )}
            </div>
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
                    <article
                      key={`${video.clip_url}-${index}`}
                      className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"
                    >
                      <a
                        href={video.clip_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block"
                      >
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
                            <div className="flex h-full items-center justify-center text-zinc-400">
                              No image
                            </div>
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
                  Credits
                </p>
                <h3 className="text-xl font-bold text-zinc-900">
                  {person.full_name}
                </h3>
              </div>
              {creditsLoading && (
                <p className="mb-4 text-sm text-zinc-500">Loading credits...</p>
              )}
              {creditsError && <p className="mb-4 text-sm text-red-600">{creditsError}</p>}
              <div className="space-y-4">
                {creditsByShow.map((showGroup) => {
                  const showLinkSlug =
                    showIdParam && showIdForApi && showGroup.show_id === showIdForApi
                      ? showIdParam
                      : showGroup.show_id;
                  const castEpisodeTotal = showGroup.cast_groups.reduce(
                    (total, group) => total + group.total_episodes,
                    0
                  );
                  const crewEpisodeTotal = showGroup.crew_groups.reduce(
                    (total, group) => total + group.total_episodes,
                    0
                  );
                  return (
                    <details
                      key={showGroup.show_id}
                      className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-4"
                    >
                      <summary className="cursor-pointer list-none">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h4 className="text-base font-semibold text-zinc-900">
                              {showGroup.show_name || "Unknown Show"}
                            </h4>
                            <p className="text-sm text-zinc-500">
                              {formatCreditsGroupSummary(showGroup)}
                            </p>
                          </div>
                          <Link
                            href={`/admin/trr-shows/${showLinkSlug}`}
                            className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                            onClick={(event) => event.stopPropagation()}
                          >
                            Open Show
                          </Link>
                        </div>
                      </summary>

                      <div className="mt-4 grid gap-6 lg:grid-cols-2">
                        <section className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-semibold text-zinc-900">Cast</h5>
                            <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs text-zinc-600">
                              {formatEpisodeAndNonEpisodicLabel(
                                castEpisodeTotal,
                                showGroup.cast_non_episodic.length
                              )}
                            </span>
                          </div>
                          {showGroup.cast_groups.length === 0 &&
                            showGroup.cast_non_episodic.length === 0 && (
                              <p className="text-sm text-zinc-500">No cast credits for this show yet.</p>
                            )}
                          {showGroup.cast_groups.map((group) => (
                            <article
                              key={`credits-show-${showGroup.show_id}-cast-${group.credit_id}`}
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
                                      key={`credits-show-${showGroup.show_id}-cast-${group.credit_id}-season-${seasonLabel}`}
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
                          {showGroup.cast_non_episodic.map((credit) => (
                            <div
                              key={`credits-show-${showGroup.show_id}-cast-non-episodic-${credit.id}`}
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
                        </section>

                        <section className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-semibold text-zinc-900">Crew</h5>
                            <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs text-zinc-600">
                              {formatEpisodeAndNonEpisodicLabel(
                                crewEpisodeTotal,
                                showGroup.crew_non_episodic.length
                              )}
                            </span>
                          </div>
                          {showGroup.crew_groups.length === 0 &&
                            showGroup.crew_non_episodic.length === 0 && (
                              <p className="text-sm text-zinc-500">No crew credits for this show yet.</p>
                            )}
                          {showGroup.crew_groups.map((group) => (
                            <article
                              key={`credits-show-${showGroup.show_id}-crew-${group.credit_id}`}
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
                                      key={`credits-show-${showGroup.show_id}-crew-${group.credit_id}-season-${seasonLabel}`}
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
                          {showGroup.crew_non_episodic.map((credit) => (
                            <div
                              key={`credits-show-${showGroup.show_id}-crew-non-episodic-${credit.id}`}
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
                        </section>
                      </div>
                    </details>
                  );
                })}
                {creditsByShow.length === 0 && (
                  <p className="text-sm text-zinc-500">
                    No credits available for this person.
                  </p>
                )}
              </div>
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

          {/* Social Tab */}
          {activeTab === "social" && (
            <div className="space-y-4">
              {socialBladeAccounts.length ? (
                <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Linked SocialBlade accounts</p>
                    <div className="mt-3 flex flex-wrap gap-2" aria-label="Person socialblade platform switcher">
                      {socialBladeAccounts.map((account) => {
                        const isActive = selectedSocialBladeAccount?.platform === account.platform;
                        return (
                          <button
                            key={`${account.platform}:${account.handle}`}
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => setSelectedSocialBladePlatform(account.platform)}
                            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                              isActive
                                ? "border-zinc-900 bg-zinc-900 text-white"
                                : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                            }`}
                          >
                            {account.platform.charAt(0).toUpperCase() + account.platform.slice(1)} · @{account.handle}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {selectedSocialBladeAccount ? (
                    <Link
                      href={
                        buildSocialAccountProfileUrl({
                          platform: selectedSocialBladeAccount.platform,
                          handle: selectedSocialBladeAccount.handle,
                          tab: "socialblade",
                        }) as Route
                      }
                      className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                    >
                      Open account page
                    </Link>
                  ) : null}
                </div>
              ) : null}

              <SocialGrowthSection
                personId={personId}
                platform={selectedSocialBladeAccount?.platform ?? "instagram"}
                handle={selectedSocialBladeAccount?.handle ?? null}
              />
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
          showReferences={true}
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
