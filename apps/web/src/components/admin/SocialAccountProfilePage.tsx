"use client";

import { type SyntheticEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon, SearchIcon, XIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import SocialAccountProfileHashtagTimelineChart from "@/components/admin/SocialAccountProfileHashtagTimelineChart";
import InstagramCommentsPanel from "@/components/admin/instagram/InstagramCommentsPanel";
import PostScrapeCommentsButton from "@/components/admin/instagram/PostScrapeCommentsButton";
import SocialGrowthSection from "@/components/admin/social-growth-section";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type SocialAccountCatalogGapAnalysis,
  type SocialAccountCatalogAction,
  type SocialAccountCatalogActionScope,
  type SocialAccountCatalogGapAnalysisStatus,
  type SocialAccountCatalogGapAnalysisStatusResponse,
  type SocialAccountCatalogFreshness,
  type CatalogBackfillRequest,
  type CatalogBackfillLaunchResponse,
  type CatalogBackfillSelectedTask,
  type SocialAccountCatalogAttachedFollowups,
  type CatalogRemediateDriftRequest,
  type CatalogRemediateDriftResponse,
  type CatalogRepairAuthRequest,
  type CatalogReviewResolveRequest,
  type CatalogSyncNewerRequest,
  type CatalogSyncRecentRequest,
  type SocialAccountCatalogPost,
  type SocialAccountCatalogPostDetail,
  type SocialAccountCatalogReviewItem,
  type SocialAccountCatalogRun,
  type SocialAccountCatalogRunProgressHandle,
  type SocialAccountCatalogRunProgressLogEntry,
  type SocialAccountCatalogRunProgressSnapshot,
  type SocialAccountCatalogRunProgressStage,
  type SocialAccountCatalogStageGraphNode,
  type SocialAccountDashboardFreshness,
  type SocialAccountOperationalAlert,
  type SocialAccountProfileHashtag,
  type SocialAccountProfileHashtagAssignment,
  type SocialAccountProfileHashtagTimeline,
  type SocialAccountLiveProfileTotal,
  type SocialAccountProfilePost,
  type SocialAccountProfilePostsSortMetadata,
  type SocialAccountProfileSummaryDetail,
  type SocialAccountProfileSummary,
  type SocialAccountProfileTab,
  type SocialPlatformSlug,
  type SocialAccountProfileCollaboratorTagAggregate,
  type SocialProfileCookieHealth,
  type SocialProfileCookieRefreshResult,
  type SocialAccountCommentsRunProgress,
  type SocialAccountCommentsShardProgress,
  SOCIAL_ACCOUNT_CATALOG_DETAIL_ENABLED_PLATFORMS,
  SOCIAL_ACCOUNT_CATALOG_ENABLED_PLATFORMS,
  SOCIAL_ACCOUNT_COMMENTS_ENABLED_PLATFORMS,
  SOCIAL_ACCOUNT_PLATFORM_LABELS,
  SOCIAL_ACCOUNT_PROFILE_TAB_LABELS,
  SOCIAL_ACCOUNT_SOCIALBLADE_ENABLED_PLATFORMS,
} from "@/lib/admin/social-account-profile";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { ADMIN_SOCIAL_PATH } from "@/lib/admin/admin-route-paths";
import { isLocalDevHostname } from "@/lib/admin/dev-admin-bypass";
import { buildSocialAccountProfileUrl } from "@/lib/admin/show-admin-routes";
import { fetchSocialAccountCatalogRunProgressSnapshot } from "@/lib/admin/social-account-catalog-progress";
import { invalidateAdminSnapshotFamilies } from "@/lib/admin/admin-snapshot-client";
import { fetchAdminWithAuth as fetchAdminWithAuthBase } from "@/lib/admin/client-auth";
import { useSharedPollingResource } from "@/lib/admin/shared-live-resource";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import {
  selectDisplayThumbnail,
  type DisplayThumbnailSelection,
  type DisplayThumbnailVariants,
} from "./social-week/social-media-thumbnails";

type Props = {
  platform: SocialPlatformSlug;
  handle: string;
  activeTab: SocialAccountProfileTab;
};

const INSTAGRAM_AUTH_REFRESH_CONFIRMATION = "I UNDERSTAND INSTAGRAM AUTH RISK";
const INSTAGRAM_AUTH_REFRESH_WARNING =
  "Manual Instagram auth can surface CAPTCHA, verification code, checkpoint, or account-lock prompts. Complete those steps yourself before confirming a validated-cookie sync.";
const CANCEL_STUCK_SOCIAL_INGEST_JOBS_URL = "/api/admin/trr-api/social/ingest/stuck-jobs/cancel";
const CATALOG_ADVANCED_DETAILS_STORAGE_PREFIX = "trr-social-catalog-advanced-details";
const NYT_DASHBOARD_BUTTON_CLASS =
  "rounded-none border-black bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-black hover:bg-black hover:text-white";
const NYT_DASHBOARD_PRIMARY_BUTTON_CLASS =
  "rounded-none border-black bg-black px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white hover:bg-white hover:text-black";
const NYT_DASHBOARD_DANGER_BUTTON_CLASS =
  "rounded-none border-red-900 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-red-900 hover:bg-red-900 hover:text-white";
const NYT_DASHBOARD_ICON_BUTTON_CLASS =
  "rounded-none border-black bg-white px-2 py-1.5 text-black hover:bg-black hover:text-white";
export const getCatalogRepairAuthEndpointSegment = (repairAction: string | null | undefined): "manual-auth" | "repair-auth" =>
  repairAction === "repair_instagram_auth" ? "manual-auth" : "repair-auth";

type SummaryFetchDetail = SocialAccountProfileSummaryDetail;

type PostsResponse = {
  items: SocialAccountProfilePost[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  sort_metadata?: SocialAccountProfilePostsSortMetadata | null;
};

type CatalogPostsResponse = {
  items: SocialAccountCatalogPost[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
};

const formatPostsSortMode = (mode: string | null | undefined): string => {
  switch (mode) {
    case "persisted_rollup":
      return "Persisted rollup";
    case "bounded_page_score":
      return "Bounded page score";
    case "live_comment_count":
      return "Live comment count";
    default:
      return "Unknown";
  }
};

type HashtagsResponse = {
  items: SocialAccountProfileHashtag[];
};

type HashtagTimelineResponse = SocialAccountProfileHashtagTimeline & {
  error?: string;
};

type CatalogReviewQueueResponse = {
  items: SocialAccountCatalogReviewItem[];
};

type SharedAccountSource = {
  id?: string | null;
  platform?: SocialPlatformSlug | string | null;
  source_scope?: string | null;
  account_handle?: string | null;
  is_active?: boolean | null;
  scrape_priority?: number | null;
  metadata?: Record<string, unknown> | null;
  display_name?: string | null;
  network_name?: string | null;
  profile_kind?: string | null;
};

type SharedAccountSourcesResponse = {
  source_scope?: string | null;
  sources?: SharedAccountSource[];
  using_defaults?: boolean;
};

type ShowOption = {
  show_id: string;
  show_name: string;
  show_slug?: string | null;
};

type ReviewResolutionDraft = {
  resolution_action: CatalogReviewResolveRequest["resolution_action"];
  show_id: string;
};

type PendingCatalogAction = {
  action: "backfill" | "sync_recent" | "sync_newer";
  requestBody: CatalogBackfillRequest | CatalogSyncRecentRequest | CatalogSyncNewerRequest;
};

type BackfillTaskOption = {
  value: CatalogBackfillSelectedTask;
  label: string;
  description: string;
};

type LocalCatalogCommandDebugOptions = {
  progress?: SocialAccountCatalogRunProgressSnapshot | null;
  mode?: "resume" | "restart" | "probe_only" | "fresh";
};

type CatalogProgressDiagnosticRow = {
  key: string;
  label: string;
  value: string;
  detail: string | null;
};

type JsonRecord = Record<string, unknown>;

type CollaboratorsTagsResponse = {
  collaborators: SocialAccountProfileCollaboratorTagAggregate[];
  tags: SocialAccountProfileCollaboratorTagAggregate[];
  mentions: SocialAccountProfileCollaboratorTagAggregate[];
};

type ProxyErrorPayload = {
  error?: string;
  detail?: string;
  code?: string;
  retryable?: boolean;
  retry_after_seconds?: number;
  trace_id?: string;
  upstream_status?: number;
  upstream_detail?: unknown;
  upstream_detail_code?: string;
};

type SocialAccountRequestError = Error & {
  code?: string;
  retryable?: boolean;
  retryAfterMs?: number;
  isBackendSaturated?: boolean;
  upstreamStatus?: number;
  traceId?: string;
};

type SummaryResponse = SocialAccountProfileSummary & ProxyErrorPayload;

type SummaryLoadResult = {
  data: SocialAccountProfileSummary;
  uninitialized: boolean;
};

type CatalogFreshnessPayload = SocialAccountCatalogFreshness &
  ProxyErrorPayload & {
    degraded?: boolean;
    partial?: boolean;
    freshness_degraded?: boolean;
    recent_runs_degraded?: boolean;
    recent_runs_unavailable?: boolean;
    degraded_reason?: string | null;
    degradation_reason?: string | null;
  };

type SocialAccountProfileSnapshot = {
  summary?: SocialAccountProfileSummary | null;
  catalog_run_progress?: SocialAccountCatalogRunProgressSnapshot | null;
  dashboard_freshness?: SocialAccountDashboardFreshness | null;
  operational_alerts?: SocialAccountOperationalAlert[];
  summary_omitted_reason?: "progress_only" | string | null;
  generated_at?: string | null;
  cache_age_ms?: number;
  stale?: boolean;
};

type CatalogGapAnalysisStatusPayload = SocialAccountCatalogGapAnalysisStatusResponse & ProxyErrorPayload;

type CatalogRunProgressStageStats = {
  total: number;
  completed: number;
  failed: number;
  active: number;
  running: number;
  waiting: number;
  scraped: number;
  saved: number;
};

type CatalogRunProgressHandleCard = {
  id: string;
  platform: string;
  handle: string;
  runnerLanes: string[];
  frontierLabel?: string | null;
  hasStarted: boolean;
  nextStage: string | null;
  totals: CatalogRunProgressStageStats;
  stages: Array<CatalogRunProgressStageStats & { stage: string }>;
};

type CatalogOperatorSummaryCard = {
  key: string;
  label: string;
  value: string;
  detail: string | null;
};

type CatalogCompactStageSummary = {
  key: string;
  label: string;
  counts: string;
  activity: string | null;
};

type CommentsRunMovementSnapshot = {
  runId: string;
  sampledAtMs: number;
  postsChecked: number;
  commentsProcessed: number;
  commentsInserted: number;
  commentsChanged: number;
};

type CommentsRunMovement = {
  runId: string;
  hasBaseline: boolean;
  postsCheckedDelta: number;
  commentsProcessedDelta: number;
  newCommentsDelta: number;
  existingCommentDetailsEditedDelta: number;
};

type CatalogLaneCard = {
  key: string;
  label: string;
  status?: string | null;
  sourceLabel?: string | null;
  detail?: string | null;
  blockedReason?: string | null;
  counts?: string | null;
};

type InstagramPipelineTruthRow = {
  key: string;
  label: string;
  value: string;
  detail: string | null;
  recommendation?: string | null;
  progressValue?: number | null;
};

type InstagramPipelineIssueRow = {
  key: string;
  title: string;
  detail: string;
  recommendation?: string | null;
  action?: "remediate_drift";
  actionLabel?: string;
  actionBusyLabel?: string;
  actionDisabled?: boolean;
  tone: "amber" | "red" | "sky";
};

const socialProfileRequestInflight = new Map<string, Promise<unknown>>();

export const __resetSocialProfileRequestInflightForTests = (): void => {
  socialProfileRequestInflight.clear();
};

const withSocialProfileRequestDedup = <T,>(key: string, loader: () => Promise<T>): Promise<T> => {
  const existing = socialProfileRequestInflight.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }
  const promise = loader().finally(() => {
    if (socialProfileRequestInflight.get(key) === promise) {
      socialProfileRequestInflight.delete(key);
    }
  });
  socialProfileRequestInflight.set(key, promise as Promise<unknown>);
  return promise;
};

const INTEGER_FORMATTER = new Intl.NumberFormat("en-US");
const ACTIVE_CATALOG_RUN_STATUSES = new Set(["queued", "pending", "retrying", "running", "cancelling"]);
const ACTIVE_CATALOG_RECOVERY_STATUSES = new Set(["queued", "running", "fallback_enqueued", "blocked"]);
const TERMINAL_CATALOG_RUN_STATUSES = new Set(["completed", "failed", "cancelled"]);
const COMMENTS_PROGRESS_POLL_INTERVAL_MS = 5_000;
const TWITTER_BACKFILL_LOOKBACK_DAYS = 365;
const TIKTOK_EMPTY_FIRST_PAGE_ERROR_CODE = "tiktok_discovery_empty_first_page";
const TIKTOK_EMPTY_FIRST_PAGE_ALERT_CODE = "tiktok_empty_first_page";
const TIKTOK_DIRECT_FALLBACK_FAILED_ALERT_CODE = "tiktok_direct_fallback_failed";
const INSTAGRAM_LOCAL_FALLBACK_ALERT_CODES = new Set([
  "frontier_auth_blocked",
  "instagram_modal_empty_page",
  "instagram_modal_empty_page_retry_exhausted",
  "no_authenticated_modal_workers",
]);
const CATALOG_ACTION_SCOPES: ReadonlyArray<SocialAccountCatalogActionScope> = [
  "full_history",
  "bounded_window",
  "recent_window",
  "head_gap",
  "frontier_resume",
];
const INSTAGRAM_BACKFILL_TASK_OPTIONS: ReadonlyArray<BackfillTaskOption> = [
  {
    value: "post_details",
    label: "Post Details",
    description: "Run after the listing pass to refresh saved Instagram post details and metrics.",
  },
  {
    value: "comments",
    label: "Comments",
    description: "Follow listing with the full comments lane for saved Instagram posts in scope.",
  },
  {
    value: "media",
    label: "Media",
    description: "Follow listing by mirroring hosted post media to the R2/CDN lanes.",
  },
];
const INSTAGRAM_BACKFILL_DEFAULT_SELECTED_TASKS: CatalogBackfillSelectedTask[] = [
  "post_details",
  "comments",
];
const INSTAGRAM_BACKFILL_DETAIL_WORKER_OPTIONS = [1, 2, 4, 6, 8, 12] as const;
const INSTAGRAM_BACKFILL_COMMENTS_WORKER_OPTIONS = [1, 2, 4, 6, 8] as const;
const INSTAGRAM_BACKFILL_DEFAULT_DETAIL_WORKER_COUNT = 4;
const INSTAGRAM_BACKFILL_DEFAULT_COMMENTS_WORKER_COUNT = 4;
const INSTAGRAM_BRAVOTV_FAST_DETAIL_WORKER_COUNT = 8;
const INSTAGRAM_BRAVOTV_FAST_COMMENTS_WORKER_COUNT = 8;
const getDefaultInstagramBackfillDetailWorkerCount = (accountHandle: string | null | undefined): number =>
  normalizeComparable(accountHandle) === "bravotv"
    ? INSTAGRAM_BRAVOTV_FAST_DETAIL_WORKER_COUNT
    : INSTAGRAM_BACKFILL_DEFAULT_DETAIL_WORKER_COUNT;
const getDefaultInstagramBackfillCommentsWorkerCount = (accountHandle: string | null | undefined): number =>
  normalizeComparable(accountHandle) === "bravotv"
    ? INSTAGRAM_BRAVOTV_FAST_COMMENTS_WORKER_COUNT
    : INSTAGRAM_BACKFILL_DEFAULT_COMMENTS_WORKER_COUNT;
const getDefaultInstagramBackfillCommentMediaFollowups = (accountHandle: string | null | undefined): boolean =>
  normalizeComparable(accountHandle) === "bravotv";
const TIKTOK_BACKFILL_DEFAULT_SELECTED_TASKS: CatalogBackfillSelectedTask[] = [
  "post_details",
  "comments",
  "media",
];
const INSTAGRAM_POSTS_ACCELERATION_FLAG_NAMES = [
  "SOCIAL_INSTAGRAM_POSTS_BIDIRECTIONAL_WALK_ENABLED",
  "SOCIAL_INSTAGRAM_POSTS_PER_IP_PACING_ENABLED",
  "SOCIAL_INSTAGRAM_POSTS_PAGE_PROXY_ROTATION_ENABLED",
  "SOCIAL_INSTAGRAM_POSTS_SHARED_WARMUP_ENABLED",
] as const;
const BOUNDED_CATALOG_ACTION_SCOPES = new Set<SocialAccountCatalogActionScope>([
  "bounded_window",
  "recent_window",
  "head_gap",
  "frontier_resume",
]);
const CATALOG_PROGRESS_POLL_INTERVAL_MS = 5_000;
const CATALOG_PROGRESS_RUN_STORAGE_PREFIX = "trr-social-catalog-progress-run";
const COMMENTS_PROGRESS_RUN_STORAGE_PREFIX = "trr-social-comments-progress-run";
const CATALOG_GAP_ANALYSIS_POLL_INTERVAL_MS = 4_000;
const CATALOG_GAP_ANALYSIS_BACKOFF_BASE_MS = 2_000;
const CATALOG_GAP_ANALYSIS_BACKOFF_MAX_MS = 30_000;
const HASHTAG_WINDOW_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "7d", label: "This Week" },
  { value: "30d", label: "This Month" },
  { value: "365d", label: "This Year" },
] as const;
const CATALOG_STAGE_SORT_ORDER: Record<string, number> = {
  posts: 0,
  comments: 1,
  media_mirror: 2,
  comment_media_mirror: 3,
  shared_account_discovery: 4,
  shared_account_posts: 5,
  post_classify: 6,
  season_materialize: 7,
  analytics_refresh: 8,
  other: 99,
};

const buildCatalogProgressRunStorageKey = (platform: string, handle: string) =>
  `${CATALOG_PROGRESS_RUN_STORAGE_PREFIX}:${platform.trim().toLowerCase()}:${handle.trim().toLowerCase()}`;

const buildCommentsProgressRunStorageKey = (platform: string, handle: string) =>
  `${COMMENTS_PROGRESS_RUN_STORAGE_PREFIX}:${platform.trim().toLowerCase()}:${handle.trim().toLowerCase()}`;

const buildCatalogAdvancedDetailsStorageKey = (platform: string, handle: string) =>
  `${CATALOG_ADVANCED_DETAILS_STORAGE_PREFIX}:${platform.trim().toLowerCase()}:${handle.trim().toLowerCase()}`;

const readStoredCatalogProgressRunId = (storageKey: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(storageKey)?.trim();
    return value || null;
  } catch {
    return null;
  }
};

const readStoredDisclosureOpen = (storageKey: string): boolean | null => {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(storageKey)?.trim().toLowerCase();
    if (value === "open") return true;
    if (value === "closed") return false;
    return null;
  } catch {
    return null;
  }
};

const storeDisclosureOpen = (storageKey: string, open: boolean) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, open ? "open" : "closed");
  } catch {
    // Storage is best-effort; the details element still works for this render.
  }
};

const isRuntimeVersionAlertCode = (code: string | null | undefined): boolean => {
  const normalized = String(code || "").trim().toLowerCase();
  return normalized === "runtime_version_drift" || normalized === "runtime_version_pin_mismatch";
};

const storeCatalogProgressRunId = (storageKey: string, runId: string | null | undefined) => {
  if (typeof window === "undefined") return;
  try {
    const normalizedRunId = String(runId || "").trim();
    if (normalizedRunId) {
      window.sessionStorage.setItem(storageKey, normalizedRunId);
    } else {
      window.sessionStorage.removeItem(storageKey);
    }
  } catch {
    // Storage is best-effort; live polling still works for the current render.
  }
};

const formatInteger = (value: number | null | undefined): string => {
  return INTEGER_FORMATTER.format(Number.isFinite(Number(value)) ? Number(value) : 0);
};

const readFiniteNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const readString = (value: unknown): string | null => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

const readNestedRecord = (root: unknown, path: string[]): Record<string, unknown> | null => {
  let current: unknown = root;
  for (const key of path) {
    const record = asRecord(current);
    if (!record) return null;
    current = record[key];
  }
  return asRecord(current);
};

const resolveSummarySourceMetadata = (
  summary: SocialAccountProfileSummary | null,
  platform: SocialPlatformSlug,
  handle: string,
): Record<string, unknown> | null => {
  const normalizedHandle = handle.trim().toLowerCase();
  for (const source of summary?.source_status ?? []) {
    const sourcePlatform = readString(source.platform)?.toLowerCase();
    const sourceHandle = readString(source.account_handle)?.toLowerCase();
    if (sourcePlatform === platform && sourceHandle === normalizedHandle) {
      return asRecord(source.metadata);
    }
  }
  return asRecord(summary?.source_status?.[0]?.metadata);
};

const resolveSummaryAvatarUrl = (
  summary: SocialAccountProfileSummary | null,
  platform: SocialPlatformSlug,
  handle: string,
): string | null => {
  const direct = readString(summary?.avatar_url);
  if (direct) return direct;
  const metadata = resolveSummarySourceMetadata(summary, platform, handle);
  const profilePayloadUser = readNestedRecord(metadata, [
    "profile_following",
    "retrieval_meta",
    "profile_payload",
    "data",
    "user",
  ]);
  return (
    readString(readNestedRecord(profilePayloadUser, ["hd_profile_pic_url_info"])?.url) ||
    readString(profilePayloadUser?.profile_pic_url_hd) ||
    readString(profilePayloadUser?.profile_pic_url) ||
    readString(readNestedRecord(metadata, ["profile_snapshot"])?.avatar_url) ||
    readString(readNestedRecord(metadata, ["profile_snapshot"])?.profile_pic_url)
  );
};

const socialSourceMetadataValue = (source: SharedAccountSource, key: string): string | null => {
  return readString(source.metadata?.[key]);
};

const socialSourceDisplayName = (source: SharedAccountSource): string => {
  return (
    readString(source.display_name) ||
    socialSourceMetadataValue(source, "display_name") ||
    readString(source.account_handle) ||
    "Unknown account"
  );
};

const normalizeComparable = (value: string | null | undefined): string => String(value ?? "").trim().toLowerCase();

const socialPlatformLabel = (value: string | null | undefined): string => {
  const normalized = normalizeComparable(value);
  return SOCIAL_ACCOUNT_PLATFORM_LABELS[normalized as SocialPlatformSlug] ?? (readString(value) || "Social");
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const buildInstagramBackfillDateDefaults = (now = new Date()): { dateStart: string; dateEnd: string } => {
  const year = now.getUTCFullYear();
  return {
    dateStart: `${year}-01-01`,
    dateEnd: `${year}-12-31`,
  };
};

const dateInputToWindowBoundaryIso = (value: string, boundary: "start" | "end"): string | null => {
  const normalized = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const suffix = boundary === "start" ? "T00:00:00.000Z" : "T23:59:59.999Z";
  const parsed = new Date(`${normalized}${suffix}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const formatCatalogRunWindow = (progress?: SocialAccountCatalogRunProgressSnapshot | null): string | null => {
  const dateStart = readString(progress?.date_start);
  const dateEnd = readString(progress?.date_end);
  if (!dateStart && !dateEnd) return null;
  return `Window ${dateStart ? formatDateTime(dateStart) : "open start"} to ${dateEnd ? formatDateTime(dateEnd) : "open end"}`;
};

const formatInstagramPostsAuthMode = (progress?: SocialAccountCatalogRunProgressSnapshot | null): string | null => {
  const mode = normalizeComparable(progress?.instagram_posts_auth_mode || progress?.posts_auth_mode);
  if (mode === "anonymous") return "Posts auth anonymous";
  if (mode === "authenticated") return "Posts auth authenticated";
  return null;
};

const formatDashboardFreshnessAge = (ageSeconds: number | null | undefined): string => {
  if (ageSeconds == null || !Number.isFinite(Number(ageSeconds))) {
    return "moments ago";
  }
  const normalizedSeconds = Math.max(0, Math.round(Number(ageSeconds)));
  if (normalizedSeconds < 60) {
    return `${normalizedSeconds} second${normalizedSeconds === 1 ? "" : "s"} ago`;
  }
  const minutes = Math.round(normalizedSeconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
};

export const defaultLocalCatalogCommandSelectedTasks = (
  platform: SocialPlatformSlug,
  action: "backfill" | "fill_missing_posts",
): CatalogBackfillSelectedTask[] => {
  if (action !== "backfill") {
    return [];
  }
  if (platform === "instagram") {
    return [...INSTAGRAM_BACKFILL_DEFAULT_SELECTED_TASKS];
  }
  if (platform === "tiktok") {
    return [...TIKTOK_BACKFILL_DEFAULT_SELECTED_TASKS];
  }
  return [];
};

const REDACTED_DEBUG_VALUE = "<redacted>";
const DEBUG_REDACT_KEY_PATTERN = /cookie|authorization|password|secret|token|proxy_url|proxyurl|sessionid|csrf|x-ig-|claim/i;

const redactDebugString = (value: string): string =>
  value
    .replace(/(https?:\/\/)([^/@\s]+)@/gi, `$1${REDACTED_DEBUG_VALUE}@`)
    .replace(/(sessionid|csrftoken|ds_user_id|ig_did|mid)=([^;\s]+)/gi, `$1=${REDACTED_DEBUG_VALUE}`)
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, `$1${REDACTED_DEBUG_VALUE}`);

const sanitizeDebugValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeDebugValue(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as JsonRecord).map(([key, innerValue]) => [
        key,
        DEBUG_REDACT_KEY_PATTERN.test(key) ? REDACTED_DEBUG_VALUE : sanitizeDebugValue(innerValue),
      ]),
    );
  }
  if (typeof value === "string") {
    return redactDebugString(value);
  }
  return value;
};

const normalizeDebugRecord = (value: unknown): JsonRecord | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return sanitizeDebugValue(value) as JsonRecord;
};

const getProgressFeatureFlagSnapshot = (
  progress?: SocialAccountCatalogRunProgressSnapshot | null,
): JsonRecord => {
  const explicitFlags =
    normalizeDebugRecord(progress?.acceleration_feature_flags) ??
    normalizeDebugRecord(progress?.posts_acceleration_flags) ??
    normalizeDebugRecord(progress?.feature_flags);
  const flags: JsonRecord = {};
  for (const flagName of INSTAGRAM_POSTS_ACCELERATION_FLAG_NAMES) {
    flags[flagName] = explicitFlags?.[flagName] ?? explicitFlags?.[flagName.toLowerCase()] ?? null;
  }
  return flags;
};

const hasPaginationResumeCursor = (
  paginationState?: SocialAccountCatalogRunProgressSnapshot["pagination_state"],
): boolean => {
  const states = Array.isArray(paginationState) ? paginationState : paginationState ? [paginationState] : [];
  return states.some((state) => Boolean(String(state?.end_cursor || state?.cursor_in || "").trim()));
};

const inferBackfillDebugMode = (
  progress?: SocialAccountCatalogRunProgressSnapshot | null,
  explicitMode?: LocalCatalogCommandDebugOptions["mode"],
): "resume" | "restart" | "probe_only" | "fresh" => {
  if (explicitMode) return explicitMode;
  const probeOnly =
    Boolean((progress?.posts_auth_probe as JsonRecord | undefined)?.probe_only) ||
    Boolean((progress?.bidirectional_probe as JsonRecord | undefined)?.probe_only);
  if (probeOnly) return "probe_only";
  const stopReason = String(progress?.stop_reason || progress?.run_diagnostics?.frontier_stop_reason || "").trim().toLowerCase();
  if (stopReason === "cursor_expired_restart_required") return "restart";
  if (progress?.resume_cursor_saved || hasPaginationResumeCursor(progress?.pagination_state)) return "resume";
  return "fresh";
};

const buildLocalCatalogCommandDebugSnapshot = ({
  platform,
  handle,
  sourceScope,
  action,
  selectedTasks,
  progress,
  mode,
}: {
  platform: SocialPlatformSlug;
  handle: string;
  sourceScope: string;
  action: "backfill" | "fill_missing_posts";
  selectedTasks: CatalogBackfillSelectedTask[];
  progress?: SocialAccountCatalogRunProgressSnapshot | null;
  mode?: LocalCatalogCommandDebugOptions["mode"];
}): JsonRecord => ({
  platform,
  account_handle: handle,
  action,
  source_scope: sourceScope,
  selected_tasks: selectedTasks,
  mode: inferBackfillDebugMode(progress, mode),
  run_id: progress?.run_id ?? null,
  run_status: progress?.run_status ?? null,
  partial_scrape: progress?.partial_scrape ?? null,
  stop_reason: progress?.stop_reason ?? progress?.run_diagnostics?.frontier_stop_reason ?? null,
  resume_cursor_saved: progress?.resume_cursor_saved ?? null,
  pagination_doc_id_stale: progress?.pagination_doc_id_stale ?? null,
  doc_id_used: progress?.doc_id_used ?? null,
  feature_flags: getProgressFeatureFlagSnapshot(progress),
  proxy_pacing: normalizeDebugRecord(progress?.proxy_pacing),
  warmup_pool: normalizeDebugRecord(progress?.warmup_pool),
  bidirectional_probe: normalizeDebugRecord(progress?.bidirectional_probe),
  posts_auth_probe: normalizeDebugRecord(progress?.posts_auth_probe),
  listing_progress: normalizeDebugRecord(progress?.listing_progress),
  details_progress: normalizeDebugRecord(progress?.details_progress),
});

export const buildLocalCatalogCommand = (
  platform: SocialPlatformSlug,
  handle: string,
  sourceScope: string,
  action: "backfill" | "fill_missing_posts",
  selectedTasks: CatalogBackfillSelectedTask[] = [],
  debugOptions: LocalCatalogCommandDebugOptions = {},
): string => {
  const selectedTaskArgs = selectedTasks.map((task) => ` --selected-task ${task}`).join("");
  const command = `cd ~/Projects/TRR/TRR-Backend && source .venv/bin/activate && python3 scripts/socials/local_catalog_action.py --platform ${platform} --account ${handle} --source-scope ${sourceScope} --action ${action}${selectedTaskArgs}`;
  const debugSnapshot = buildLocalCatalogCommandDebugSnapshot({
    platform,
    handle,
    sourceScope,
    action,
    selectedTasks,
    progress: debugOptions.progress,
    mode: debugOptions.mode,
  });
  return [
    command,
    "# TRR Backfill Posts debug snapshot (sanitized; no cookies, tokens, or proxy credentials)",
    `# ${JSON.stringify(sanitizeDebugValue(debugSnapshot))}`,
  ].join("\n");
};

const formatDiagnosticToken = (value?: string | null): string => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  return normalized.replace(/_/g, " ");
};

const normalizeCatalogActionScope = (value?: string | null): SocialAccountCatalogActionScope | null => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  return CATALOG_ACTION_SCOPES.includes(normalized as SocialAccountCatalogActionScope)
    ? (normalized as SocialAccountCatalogActionScope)
    : null;
};

const formatModalTargetLabel = (progress?: SocialAccountCatalogRunProgressSnapshot | null): string | null => {
  const appName = String(progress?.dispatch_health?.configured_app_name || "").trim();
  const functionName = String(progress?.dispatch_health?.configured_function_name || "").trim();
  if (!appName && !functionName) return null;
  return functionName ? `${appName || "<unset>"}.${functionName}` : appName;
};

const formatSeasonLabel = (seasonNumber?: number | null): string => {
  return seasonNumber ? `Season ${seasonNumber}` : "All seasons";
};

const formatBackfillTaskLabel = (task: CatalogBackfillSelectedTask): string => {
  return INSTAGRAM_BACKFILL_TASK_OPTIONS.find((option) => option.value === task)?.label ?? task;
};

const buildTwitterBackfillWindow = (now = new Date()): { dateStart: string; dateEnd: string } => {
  const dateEnd = new Date(now);
  const dateStart = new Date(dateEnd);
  dateStart.setUTCDate(dateStart.getUTCDate() - TWITTER_BACKFILL_LOOKBACK_DAYS);
  return {
    dateStart: dateStart.toISOString(),
    dateEnd: dateEnd.toISOString(),
  };
};

const formatCoverageFieldLabel = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "music_info" || normalized === "music") return "Music";
  if (normalized === "owner_detail" || normalized === "owner") return "Owner";
  if (normalized === "tagged_collaborator_detail" || normalized === "tagged_collaborators") return "Tagged";
  if (normalized === "child_post_data" || normalized === "children") return "Children";
  if (normalized === "dimensions_alt_text" || normalized === "dimensions") return "Alt text/dimensions";
  if (normalized === "inline_comment_samples" || normalized === "sample_comments") return "Inline samples";
  return normalized
    .split("_")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
};

const getNumberFromRecord = (record: unknown, keys: string[]): number | null => {
  if (typeof record === "number" && Number.isFinite(record)) return record;
  if (!record || typeof record !== "object") return null;
  for (const key of keys) {
    const value = (record as JsonRecord)[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
};

const formatCoverageMetric = (metric: unknown): string | null => {
  const covered = getNumberFromRecord(metric, ["present_count", "covered_count", "saved_count", "count"]);
  const total = getNumberFromRecord(metric, ["total_count", "total_posts", "eligible_count", "available_posts"]);
  const pct = getNumberFromRecord(metric, ["pct", "percent"]);
  if (covered == null && total == null && pct == null) return null;
  const countLabel =
    covered != null && total != null
      ? `${formatInteger(covered)} / ${formatInteger(total)}`
      : covered != null
        ? formatInteger(covered)
        : total != null
          ? `0 / ${formatInteger(total)}`
          : null;
  const pctLabel = pct != null ? `${Math.round(pct)}%` : null;
  return [countLabel, pctLabel].filter(Boolean).join(" · ");
};

const formatPhaseProgress = (progress?: SocialAccountCatalogRunProgressSnapshot["listing_progress"] | null): string | null => {
  if (!progress) return null;
  const pages = getNumberFromRecord(progress, ["pages_scanned", "pages_completed"]);
  const postsSeen = getNumberFromRecord(progress, ["posts_seen", "posts_checked", "completed_posts", "matched_posts"]);
  const postsSaved = getNumberFromRecord(progress, ["posts_upserted", "posts_saved", "saved_posts"]);
  const totalPosts = getNumberFromRecord(progress, ["total_posts"]);
  const status = typeof progress.status === "string" && progress.status.trim() ? progress.status.trim().replaceAll("_", " ") : null;
  const parts = [
    pages != null ? `${formatInteger(pages)} pages` : null,
    postsSeen != null && totalPosts != null
      ? `${formatInteger(postsSeen)} / ${formatInteger(totalPosts)} posts`
      : postsSeen != null
        ? `${formatInteger(postsSeen)} posts`
        : null,
    postsSaved != null ? `${formatInteger(postsSaved)} saved` : null,
    status,
  ];
  return parts.filter(Boolean).join(" · ") || null;
};

const buildCatalogProgressDiagnosticRows = (
  progress?: SocialAccountCatalogRunProgressSnapshot | null,
  summary?: SocialAccountProfileSummary | null,
): CatalogProgressDiagnosticRow[] => {
  const rows: CatalogProgressDiagnosticRow[] = [];
  const detailsLabel = formatPhaseProgress(progress?.details_progress);
  const listingLabel = formatPhaseProgress(progress?.listing_progress);
  const listingPages = getNumberFromRecord(progress?.listing_progress, ["pages_scanned", "pages_completed"]);
  const listingPostsSeen = getNumberFromRecord(progress?.listing_progress, [
    "posts_seen",
    "posts_checked",
    "completed_posts",
    "matched_posts",
  ]);
  const listingPostsSaved = getNumberFromRecord(progress?.listing_progress, [
    "posts_upserted",
    "posts_saved",
    "saved_posts",
  ]);
  const listingStatus = String(progress?.listing_progress?.status || "").trim();
  const selectedTasks = new Set([...(progress?.selected_tasks ?? []), ...(progress?.effective_selected_tasks ?? [])]);
  const hasDetailRefreshSignal =
    Boolean(detailsLabel) ||
    getNumberFromRecord(progress?.post_progress, ["completed_posts", "matched_posts"]) != null ||
    getNumberFromRecord(progress?.summary, ["items_found_total"]) != null;
  const shouldSuppressZeroListingProgress =
    selectedTasks.has("post_details") &&
    hasDetailRefreshSignal &&
    !listingStatus &&
    (listingPages ?? 0) <= 0 &&
    (listingPostsSeen ?? 0) <= 0 &&
    (listingPostsSaved ?? 0) <= 0;
  if (listingLabel && !shouldSuppressZeroListingProgress) {
    rows.push({
      key: "listing-progress",
      label: "Listing Progress",
      value: listingLabel,
      detail: "Listing saves reachable post identities first; details, comments, and media can continue afterward.",
    });
  }

  if (detailsLabel) {
    rows.push({
      key: "details-progress",
      label: "Details Progress",
      value: detailsLabel,
      detail: "Detail refresh coverage is separate from listing completion.",
    });
  }

  if (selectedTasks.has("post_details")) {
    const detailWorkerCount =
      getNumberFromRecord(progress?.worker_runtime, ["runner_count"]) ??
      getNumberFromRecord(progress, ["details_refresh_shard_count", "details_refresh_worker_count"]);
    const detailRunnerStrategy = String(progress?.worker_runtime?.runner_strategy || "").trim().toLowerCase();
    if (detailWorkerCount != null) {
      rows.push({
        key: "detail-worker-count",
        label: "Detail Worker Count",
        value: `${formatInteger(detailWorkerCount)} ${detailWorkerCount === 1 ? "worker" : "workers"}`,
        detail: detailRunnerStrategy ? `Strategy: ${formatDiagnosticToken(detailRunnerStrategy)}.` : null,
      });
    }
    if (detailWorkerCount === 1 && detailRunnerStrategy === "single_runner") {
      rows.push({
        key: "detail-single-runner-warning",
        label: "Detail Speed Warning",
        value: "Single-runner detail refresh",
        detail: "Large Instagram accounts should launch with parallel detail workers.",
      });
    }
  }

  if (selectedTasks.has("comments")) {
    const targetReadiness = progress?.target_readiness as JsonRecord | null | undefined;
    const commentsPreview = targetReadiness?.comments_preview;
    const commentsWorkerCount =
      getNumberFromRecord(commentsPreview, ["comments_shard_count", "recommended_comments_shard_count"]) ??
      getNumberFromRecord(targetReadiness, ["comments_shard_count", "recommended_comments_shard_count"]);
    if (commentsWorkerCount != null) {
      rows.push({
        key: "comments-worker-count",
        label: "Comments Worker Count",
        value: `${formatInteger(commentsWorkerCount)} ${commentsWorkerCount === 1 ? "worker" : "workers"}`,
        detail: "Comments workers are separate from post-detail workers.",
      });
    }
  }

  const coverage = progress?.rich_field_coverage ?? progress?.field_coverage ?? null;
  if (coverage && typeof coverage === "object") {
    const preferredKeys = [
      "music_info",
      "owner_detail",
      "tagged_collaborator_detail",
      "child_post_data",
      "dimensions_alt_text",
      "inline_comment_samples",
    ];
    const entries = Object.entries(coverage)
      .sort(([left], [right]) => {
        const leftIndex = preferredKeys.indexOf(left);
        const rightIndex = preferredKeys.indexOf(right);
        if (leftIndex !== -1 || rightIndex !== -1) {
          return (leftIndex === -1 ? 100 : leftIndex) - (rightIndex === -1 ? 100 : rightIndex);
        }
        return left.localeCompare(right);
      })
      .map(([key, metric]) => {
        const label = formatCoverageFieldLabel(key);
        const value = formatCoverageMetric(metric);
        return value ? `${label} ${value}` : null;
      })
      .filter(Boolean);
    if (entries.length > 0) {
      rows.push({
        key: "rich-field-coverage",
        label: "Rich Field Coverage",
        value: entries.join(" · "),
        detail: "Rich coverage tracks listing/detail fields and does not mean the post catalog itself is incomplete.",
      });
    }
  }

  const inlineSamples =
    getNumberFromRecord(progress?.sample_comments, ["inline_comments_upserted", "inline_comment_samples", "saved_samples"]) ??
    getNumberFromRecord(progress, ["inline_comments_upserted"]) ??
    getNumberFromRecord(summary?.comments_saved_summary, ["inline_comments_upserted", "inline_comment_samples"]);
  if (inlineSamples != null) {
    rows.push({
      key: "sample-comments",
      label: "Sample Comments",
      value: `${formatInteger(inlineSamples)} inline samples saved`,
      detail: "Inline samples are useful previews, but they do not satisfy the full comments lane.",
    });
  }

  const stateParts = [
    progress?.partial_scrape ? "partial scrape" : null,
    progress?.resume_cursor_saved ? "resume cursor saved" : null,
    progress?.pagination_doc_id_stale ? "doc ID stale" : null,
    progress?.doc_id_used ? `doc ${String(progress.doc_id_used).slice(0, 10)}` : null,
  ].filter(Boolean);
  if (stateParts.length > 0) {
    rows.push({
      key: "pagination-state",
      label: "Pagination State",
      value: stateParts.join(" · "),
      detail: progress?.stop_reason ? `Stop reason: ${formatDiagnosticToken(progress.stop_reason)}.` : null,
    });
  }

  return rows;
};

const formatDetailMetricValue = (value: unknown): string => {
  return typeof value === "number" && Number.isFinite(value) ? formatInteger(value) : "0";
};

const formatMirrorStatusLabel = (value: unknown): string => {
  if (typeof value === "string" && value.trim()) {
    return value.trim().replace(/_/g, " ");
  }
  if (value && typeof value === "object" && "status" in value) {
    return String((value as { status?: unknown }).status || "")
      .trim()
      .replace(/_/g, " ");
  }
  return "Unknown";
};

const isLikelyVideoUrl = (value?: string | null): boolean => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized.endsWith(".mp4") || normalized.endsWith(".mov") || normalized.endsWith(".webm") || normalized.includes(".mp4?");
};

const getUniqueMediaUrls = (values: Array<string | null | undefined>): string[] => {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const value of values) {
    const url = String(value || "").trim();
    if (!url) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    urls.push(url);
  }
  return urls;
};

const getDisplayThumbnailVariants = (value: unknown): DisplayThumbnailVariants => {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as DisplayThumbnailVariants) : null;
};

const getCatalogPostMediaUrls = (item: SocialAccountCatalogPost | SocialAccountCatalogPostDetail): string[] => {
  return getUniqueMediaUrls([
    item.display_thumbnail_url,
    item.hosted_thumbnail_url,
    item.thumbnail_url,
    item.source_thumbnail_url,
    ...(item.hosted_media_urls ?? []),
    ...(item.media_urls ?? []),
    ...(item.source_media_urls ?? []),
  ]);
};

const buildCatalogDetailUrlGroups = (item: SocialAccountCatalogPostDetail): Array<{ label: string; urls: string[] }> => [
  {
    label: "Hosted",
    urls: getUniqueMediaUrls([item.hosted_thumbnail_url, ...(item.hosted_media_urls ?? [])]),
  },
  {
    label: "Saved",
    urls: getUniqueMediaUrls([item.display_thumbnail_url, item.thumbnail_url, ...(item.media_urls ?? [])]),
  },
  {
    label: "Source",
    urls: getUniqueMediaUrls([item.source_thumbnail_url, ...(item.source_media_urls ?? [])]),
  },
];

const getCatalogPostPreviewImage = (
  item: SocialAccountCatalogPost | SocialAccountCatalogPostDetail,
): DisplayThumbnailSelection => {
  return selectDisplayThumbnail({
    displayThumbnail: item.display_thumbnail_url,
    displayThumbnailSrcSet: item.display_thumbnail_srcset,
    displayThumbnailVariants: getDisplayThumbnailVariants(item.display_thumbnail_variants),
    fallbackUrls: getCatalogPostMediaUrls(item),
  });
};

const getCatalogPostMetricSummary = (item: SocialAccountCatalogPost): string | null => {
  const metrics = item.metrics ?? {};
  const pieces = [
    typeof metrics.likes === "number" ? `${formatInteger(metrics.likes)} likes` : null,
    typeof metrics.comments_count === "number" ? `${formatInteger(metrics.comments_count)} comments` : null,
    typeof metrics.reposts === "number" && metrics.reposts > 0 ? `${formatInteger(metrics.reposts)} reposts` : null,
    typeof metrics.views === "number" && metrics.views > 0 ? `${formatInteger(metrics.views)} views` : null,
    typeof metrics.video_views === "number" && metrics.video_views > 0
      ? `${formatInteger(metrics.video_views)} video views`
      : null,
  ].filter(Boolean);
  if (pieces.length > 0) return pieces.join(" · ");
  return typeof metrics.engagement === "number" && metrics.engagement > 0
    ? `${formatInteger(metrics.engagement)} engagement`
    : null;
};

const formatHashtagWindowLabel = (value: (typeof HASHTAG_WINDOW_OPTIONS)[number]["value"]): string => {
  return HASHTAG_WINDOW_OPTIONS.find((option) => option.value === value)?.label ?? "All Time";
};

export const shouldUseSummaryTopHashtagsPreview = (options: {
  activeTab: SocialAccountProfileTab;
  hashtagWindow: (typeof HASHTAG_WINDOW_OPTIONS)[number]["value"];
  summaryTopHashtags: ReadonlyArray<SocialAccountProfileHashtag> | null | undefined;
  hasLoadedExactWindow: boolean;
}): boolean => {
  return (
    options.activeTab === "stats" &&
    options.hashtagWindow === "all" &&
    !options.hasLoadedExactWindow &&
    (options.summaryTopHashtags?.length ?? 0) > 0
  );
};

const buildEmptySocialAccountProfileSummary = (
  platform: SocialPlatformSlug,
  handle: string,
): SocialAccountProfileSummary => ({
  summary_detail: "full",
  platform,
  account_handle: handle,
  total_posts: 0,
  total_engagement: 0,
  total_views: 0,
  live_total_posts: 0,
  catalog_total_posts: 0,
  catalog_assigned_posts: 0,
  catalog_unassigned_posts: 0,
  catalog_pending_review_posts: 0,
  live_catalog_total_posts: 0,
  live_catalog_total_engagement: 0,
  live_catalog_total_views: 0,
  live_catalog_caption_rows: 0,
  live_catalog_hashtag_instances: 0,
  live_catalog_unique_hashtags: 0,
  last_catalog_run_at: null,
  last_catalog_run_status: null,
  catalog_recent_runs: [],
  comments_saved_summary: null,
  comments_coverage: null,
  media_coverage: null,
  per_show_counts: [],
  per_season_counts: [],
  top_hashtags: [],
  top_collaborators: [],
  top_tags: [],
  source_status: [],
});

const normalizePositiveFiniteNumber = (value: unknown): number | null => {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
};

const mergeProfileSummaryPreservingLiveTotal = (
  incoming: SocialAccountProfileSummary,
  current: SocialAccountProfileSummary | null,
): SocialAccountProfileSummary => {
  if (!current) return incoming;
  const next = { ...incoming };
  const incomingLiveTotal = normalizePositiveFiniteNumber(incoming.live_total_posts);
  const currentLiveTotal = normalizePositiveFiniteNumber(current?.live_total_posts);
  const liveTotal = incomingLiveTotal ?? currentLiveTotal;
  if (liveTotal !== null) {
    next.live_total_posts = liveTotal;
  }

  const preservePositiveNumber = (key: keyof SocialAccountProfileSummary) => {
    const incomingValue = normalizePositiveFiniteNumber(incoming[key]);
    const currentValue = normalizePositiveFiniteNumber(current[key]);
    if (incomingValue === null && currentValue !== null) {
      (next as Record<string, unknown>)[key] = currentValue;
    }
  };

  const preserveWhenNullish = (key: keyof SocialAccountProfileSummary) => {
    if (incoming[key] == null && current[key] != null) {
      (next as Record<string, unknown>)[key] = current[key];
    }
  };

  preservePositiveNumber("total_posts");
  preservePositiveNumber("catalog_total_posts");
  preservePositiveNumber("live_catalog_total_posts");
  preserveWhenNullish("live_catalog_last_post_at");
  preserveWhenNullish("last_post_at");
  preserveWhenNullish("comments_saved_summary");
  preserveWhenNullish("comments_coverage");
  preserveWhenNullish("media_coverage");

  return next;
};

const hasBackendSaturationText = (value: string): boolean => {
  const message = value.toLowerCase();
  return (
    message.includes("connection pool exhausted") ||
    message.includes("database pool initialization failed") ||
    message.includes("maxclientsinsessionmode") ||
    message.includes("session-pool capacity") ||
    message.includes("session pool capacity") ||
    message.includes("pool pressure") ||
    message.includes("backend is saturated")
  );
};

const isBackendPressureCode = (value: string | null | undefined): boolean => {
  const normalized = String(value || "").trim().toUpperCase();
  return (
    normalized === "BACKEND_TIMEOUT" ||
    normalized === "BACKEND_REQUEST_TIMEOUT" ||
    normalized === "DATABASE_SERVICE_UNAVAILABLE" ||
    normalized === "UPSTREAM_TIMEOUT" ||
    normalized === "REQUEST_TIMEOUT"
  );
};

const isBackendSaturatedPayload = (payload: ProxyErrorPayload): boolean => {
  const upstreamDetail =
    payload.upstream_detail && typeof payload.upstream_detail === "object"
      ? (payload.upstream_detail as Record<string, unknown>)
      : null;
  const upstreamReason =
    typeof upstreamDetail?.reason === "string" && upstreamDetail.reason.trim()
      ? upstreamDetail.reason.trim().toLowerCase()
      : "";
  const upstreamCode =
    (typeof payload.upstream_detail_code === "string" && payload.upstream_detail_code.trim()) ||
    (typeof upstreamDetail?.code === "string" && upstreamDetail.code.trim()) ||
    (typeof payload.code === "string" && payload.code.trim()) ||
    "";
  const detailMessage = [payload.error, payload.detail, upstreamDetail?.message, upstreamDetail?.error]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");
  return (
    payload.code === "BACKEND_SATURATED" ||
    upstreamReason === "session_pool_capacity" ||
    (upstreamCode === "DATABASE_SERVICE_UNAVAILABLE" && upstreamReason === "session_pool_capacity") ||
    hasBackendSaturationText(detailMessage)
  );
};

const buildSocialAccountRequestError = (
  payload: ProxyErrorPayload,
  fallbackMessage: string,
): SocialAccountRequestError => {
  const upstreamDetail =
    payload.upstream_detail && typeof payload.upstream_detail === "object"
      ? (payload.upstream_detail as Record<string, unknown>)
      : null;
  const message =
    (typeof payload.error === "string" && payload.error.trim()) ||
    (typeof payload.detail === "string" && payload.detail.trim()) ||
    (typeof upstreamDetail?.message === "string" && upstreamDetail.message.trim()) ||
    fallbackMessage;
  const retryAfterMs =
    typeof payload.retry_after_seconds === "number" && Number.isFinite(payload.retry_after_seconds)
      ? Math.max(0, payload.retry_after_seconds * 1000)
      : undefined;
  const error = new Error(message) as SocialAccountRequestError;
  error.code = typeof payload.code === "string" && payload.code.trim() ? payload.code.trim() : undefined;
  error.retryable = Boolean(payload.retryable);
  error.retryAfterMs = retryAfterMs;
  error.isBackendSaturated = isBackendSaturatedPayload(payload);
  error.upstreamStatus = typeof payload.upstream_status === "number" ? payload.upstream_status : undefined;
  error.traceId = typeof payload.trace_id === "string" && payload.trace_id.trim() ? payload.trace_id.trim() : undefined;
  return error;
};

const toSocialAccountRequestError = (
  error: unknown,
  fallbackMessage: string,
): SocialAccountRequestError => {
  if (error instanceof Error) {
    const existing = error as SocialAccountRequestError;
    if (
      existing.code ||
      existing.retryable !== undefined ||
      existing.retryAfterMs !== undefined ||
      existing.isBackendSaturated !== undefined ||
      existing.upstreamStatus !== undefined ||
      existing.traceId !== undefined
    ) {
      return existing;
    }
    const normalized = new Error(existing.message || fallbackMessage) as SocialAccountRequestError;
    normalized.code = existing.code;
    normalized.retryable = existing.retryable;
    normalized.retryAfterMs = existing.retryAfterMs;
    normalized.isBackendSaturated = existing.isBackendSaturated;
    normalized.upstreamStatus = existing.upstreamStatus;
    normalized.traceId = existing.traceId;
    return normalized;
  }
  return new Error(fallbackMessage) as SocialAccountRequestError;
};

const isBackendSaturationError = (error: unknown): error is SocialAccountRequestError => {
  return Boolean((error as SocialAccountRequestError | undefined)?.isBackendSaturated);
};

const isCatalogFreshnessDegraded = (payload: CatalogFreshnessPayload | null | undefined): boolean => {
  if (!payload) return false;
  const reason = payload.degraded_reason ?? payload.degradation_reason ?? payload.reason ?? null;
  return (
    Boolean(payload.degraded) ||
    Boolean(payload.partial) ||
    Boolean(payload.freshness_degraded) ||
    Boolean(payload.recent_runs_degraded) ||
    Boolean(payload.recent_runs_unavailable) ||
    Boolean(reason && hasBackendSaturationText(reason)) ||
    isBackendSaturatedPayload(payload)
  );
};

const toSharedLiveResourceRequestError = (
  message: string | null,
  details: {
    code?: string;
    retryable?: boolean;
    retryAfterMs?: number;
    isBackendSaturated?: boolean;
    upstreamStatus?: number;
  } | null,
): SocialAccountRequestError => {
  const error = new Error(message || details?.code || "Fetch failed") as SocialAccountRequestError;
  error.code = details?.code;
  error.retryable = details?.retryable;
  error.retryAfterMs = details?.retryAfterMs;
  error.isBackendSaturated = details?.isBackendSaturated;
  error.upstreamStatus = details?.upstreamStatus;
  return error;
};

const isTimeoutRequestError = (error: SocialAccountRequestError | null | undefined): boolean => {
  if (!error) return false;
  return (
    error.code === "BACKEND_REQUEST_TIMEOUT" ||
    error.code === "UPSTREAM_TIMEOUT" ||
    error.upstreamStatus === 504 ||
    error.message.toLowerCase().includes("timed out")
  );
};

const isBackendPressureError = (error: unknown): error is SocialAccountRequestError => {
  const requestError = error as SocialAccountRequestError | undefined;
  if (!requestError) return false;
  return (
    Boolean(requestError.isBackendSaturated) ||
    isBackendPressureCode(requestError.code) ||
    isTimeoutRequestError(requestError) ||
    hasBackendSaturationText(requestError.message || "")
  );
};

const formatCatalogDiagnosticErrorMessage = (
  label: "Freshness check" | "Gap analysis",
  error: SocialAccountRequestError | null,
): string | null => {
  if (!error) return null;
  const traceSuffix = error.traceId ? ` Trace ${error.traceId}.` : "";
  if (isBackendSaturationError(error)) {
    return `${label} is retryable while the backend is busy.${traceSuffix}`;
  }
  if (isTimeoutRequestError(error)) {
    return label === "Gap analysis"
      ? `Gap analysis timed out before completion. Retry when you need repair guidance.${traceSuffix}`
      : `Freshness check timed out before completion. Retry in a moment.${traceSuffix}`;
  }
  return `${label} failed. ${(error as Error).message}${traceSuffix}`;
};

const formatCatalogActionErrorMessage = (
  action: "backfill" | "sync_recent" | "sync_newer",
  error: SocialAccountRequestError | null,
): string => {
  if (!error) {
    return `Failed to ${
      action === "backfill" ? "start backfill"
      : action === "sync_newer" ? "sync newer posts"
      : "sync recent catalog content"
    }`;
  }
  if (isBackendSaturationError(error)) {
    return `${
      action === "backfill" ? "Backfill start"
      : action === "sync_newer" ? "Sync newer start"
      : "Recent sync start"
    } is retryable while the backend is busy.`;
  }
  if (isTimeoutRequestError(error)) {
    return `${
      action === "backfill" ? "Backfill start"
      : action === "sync_newer" ? "Sync newer start"
      : "Recent sync start"
    } timed out before TRR-Backend replied. Retry in a moment.`;
  }
  const message = typeof (error as { message?: unknown } | null)?.message === "string"
    ? ((error as { message: string }).message || "").trim()
    : "";
  return message || "Catalog action failed.";
};

const formatSummaryRequestErrorMessage = (error: SocialAccountRequestError | null): string => {
  if (!error) {
    return "Failed to load social account profile summary";
  }
  if (isTimeoutRequestError(error)) {
    return "Summary read timed out before completion. Retry in a moment.";
  }
  return (error as Error).message || "Failed to load social account profile summary";
};

const toCatalogGapAnalysisStatusError = (
  value: unknown,
  fallbackMessage: string,
): SocialAccountRequestError | null => {
  if (!value || typeof value !== "object") {
    if (typeof value === "string" && value.trim()) {
      return new Error(value.trim()) as SocialAccountRequestError;
    }
    return null;
  }
  const payload = value as ProxyErrorPayload & { message?: string; detail?: string };
  if (payload.error || payload.detail || payload.code || payload.retryable || payload.upstream_status) {
    return buildSocialAccountRequestError(payload, fallbackMessage);
  }
  if (typeof payload.message === "string" && payload.message.trim()) {
    return new Error(payload.message.trim()) as SocialAccountRequestError;
  }
  return null;
};

const toProxyErrorPayload = (value: unknown): ProxyErrorPayload => {
  if (!value || typeof value !== "object") {
    return {};
  }
  const payload = value as Record<string, unknown>;
  return {
    error: typeof payload.error === "string" ? payload.error : undefined,
    detail: typeof payload.detail === "string" ? payload.detail : undefined,
    code: typeof payload.code === "string" ? payload.code : undefined,
    retryable: typeof payload.retryable === "boolean" ? payload.retryable : undefined,
    retry_after_seconds:
      typeof payload.retry_after_seconds === "number" && Number.isFinite(payload.retry_after_seconds)
        ? payload.retry_after_seconds
        : undefined,
    trace_id: typeof payload.trace_id === "string" ? payload.trace_id : undefined,
    upstream_status:
      typeof payload.upstream_status === "number" && Number.isFinite(payload.upstream_status)
        ? payload.upstream_status
        : undefined,
    upstream_detail: payload.upstream_detail,
    upstream_detail_code:
      typeof payload.upstream_detail_code === "string" ? payload.upstream_detail_code : undefined,
  };
};

const buildHashtagDraftAssignments = (
  items: SocialAccountProfileHashtag[],
): Record<string, SocialAccountProfileHashtagAssignment[]> => {
  return Object.fromEntries(
    items.map((item) => [
      item.hashtag,
      item.assignments?.map((assignment) => ({ ...assignment })) ?? [],
    ]),
  );
};

const cloneHashtagItems = (items: SocialAccountProfileHashtag[]): SocialAccountProfileHashtag[] => {
  return items.map((item) => ({
    ...item,
    assignments: item.assignments?.map((assignment) => ({ ...assignment })) ?? [],
    assigned_shows: item.assigned_shows?.map((show) => ({ ...show })) ?? [],
    observed_shows: item.observed_shows?.map((show) => ({ ...show })) ?? [],
    observed_seasons: item.observed_seasons?.map((season) => ({ ...season })) ?? [],
  }));
};

const formatHashtagRequestErrorMessage = (error: SocialAccountRequestError | null): string | null => {
  if (!error) return null;
  if (isBackendSaturationError(error)) {
    return "Hashtag data is retryable while the backend is busy.";
  }
  if (isTimeoutRequestError(error)) {
    return "Hashtag load timed out before completion. Retry when needed.";
  }
  return (error as Error).message || "Failed to load social account profile hashtags";
};

const resolveCatalogGapAnalysisBackoffMs = (
  error: SocialAccountRequestError | null,
  saturationAttempt: number,
): number => {
  const exponentialDelayMs = Math.min(
    CATALOG_GAP_ANALYSIS_BACKOFF_MAX_MS,
    CATALOG_GAP_ANALYSIS_BACKOFF_BASE_MS * 2 ** saturationAttempt,
  );
  return Math.max(error?.retryAfterMs ?? 0, exponentialDelayMs);
};

const getPostMatchBadge = (post: Pick<SocialAccountProfilePost, "match_mode" | "source_surface">): {
  label: string;
  tone: string;
} => {
  if (post.match_mode === "collaborator") {
    return {
      label: "Collaborator match",
      tone: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }
  if (post.source_surface === "catalog") {
    return {
      label: "Catalog only",
      tone: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  return {
    label: "Owned post",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
};

const formatRunStatusLabel = (value?: string | null): string => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "Unknown";
  return normalized
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
};

const formatSourceStatusActivityLabel = (
  item: Record<string, unknown>,
  summary?: SocialAccountProfileSummary | null,
): string => {
  const scrapeStatus = String(item.last_scrape_status ?? "").trim();
  const scrapeAt = String(item.last_scrape_at ?? "").trim();
  if (scrapeStatus || scrapeAt) {
    const statusLabel = scrapeStatus ? formatRunStatusLabel(scrapeStatus) : "Unknown";
    return `Scrape ${statusLabel} · Last scrape ${formatDateTime(scrapeAt)}`;
  }
  const catalogStatus = String(summary?.last_catalog_run_status ?? "").trim();
  const catalogAt = String(summary?.last_catalog_run_at ?? "").trim();
  if (catalogStatus || catalogAt) {
    const statusLabel = catalogStatus ? formatRunStatusLabel(catalogStatus) : "Unknown";
    return `Catalog ${statusLabel} · Last catalog ${formatDateTime(catalogAt)}`;
  }
  return "No scrape or catalog run recorded";
};

const getCatalogRunDisplayStatusLabel = (
  value?: string | null,
  progress?: SocialAccountCatalogRunProgressSnapshot | null,
): string => {
  const normalizedStatus = String(value || "").trim().toLowerCase();
  if (normalizedStatus === "cancelled" || normalizedStatus === "failed" || normalizedStatus === "completed") {
    return formatRunStatusLabel(value);
  }
  const operationalState = String(progress?.operational_state || "").trim().toLowerCase();
  if (operationalState === "blocked_auth") return "Auth Blocked";
  const runState = String(progress?.run_state || "").trim().toLowerCase();
  if (runState === "discovering") return "Discovering";
  if (runState === "fetching") return "Fetching";
  if (runState === "recovering") return "Recovering";
  if (runState === "classifying") return "Classifying";
  if (progress?.scrape_complete && progress?.classify_incomplete) {
    return "Classifying";
  }
  return formatRunStatusLabel(value);
};

const formatCommentsShardJobSummary = (progress?: SocialAccountCommentsRunProgress | null): string | null => {
  if (!progress) return null;
  const shardCount = readFiniteNumber(progress.comments_shard_count);
  const activeJobs = readFiniteNumber(progress.active_comment_jobs);
  const queuedJobs = readFiniteNumber(progress.queued_comment_jobs);
  const retryingJobs = readFiniteNumber(progress.retrying_comment_jobs);
  const completedJobs = readFiniteNumber(progress.completed_comment_jobs);
  const cancelledJobs =
    readFiniteNumber(progress.cancelled_comment_jobs) ??
    readFiniteNumber(progress.cancellation_summary?.cancelled_jobs);
  const failedJobs = readFiniteNumber(progress.failed_comment_jobs);
  const jobBits = [
    activeJobs !== null ? `${formatInteger(activeJobs)} active` : null,
    retryingJobs !== null && retryingJobs > 0 ? `${formatInteger(retryingJobs)} retrying` : null,
    queuedJobs !== null ? `${formatInteger(queuedJobs)} queued` : null,
    completedJobs !== null ? `${formatInteger(completedJobs)} complete` : null,
    cancelledJobs !== null && cancelledJobs > 0 ? `${formatInteger(cancelledJobs)} cancelled` : null,
    failedJobs !== null ? `${formatInteger(failedJobs)} failed` : null,
  ].filter(Boolean);
  if (jobBits.length === 0) {
    return shardCount !== null && shardCount > 1 ? `${formatInteger(shardCount)} shards` : null;
  }
  if (shardCount !== null && shardCount > 1) {
    return `${formatInteger(shardCount)} shards: ${jobBits.join(", ")}`;
  }
  return `Jobs: ${jobBits.join(", ")}`;
};

const formatCommentsRunMovementLabel = (movement?: CommentsRunMovement | null): string | null => {
  if (!movement) return null;
  if (!movement.hasBaseline) {
    return "Current movement: waiting for next refresh";
  }
  const parts = [
    movement.postsCheckedDelta > 0 ? `+${formatInteger(movement.postsCheckedDelta)} posts checked` : null,
    movement.commentsProcessedDelta > 0 ? `+${formatInteger(movement.commentsProcessedDelta)} comments fetched` : null,
    movement.newCommentsDelta > 0 ? `+${formatInteger(movement.newCommentsDelta)} new comments` : null,
    movement.existingCommentDetailsEditedDelta > 0
      ? `+${formatInteger(movement.existingCommentDetailsEditedDelta)} existing detail edits`
      : null,
  ].filter(Boolean);
  if (parts.length === 0) {
    return "Current movement: no counter movement since last refresh";
  }
  return `Current movement: ${parts.join(" · ")} since last refresh`;
};

const getCommentsShardProgressRows = (
  progress?: SocialAccountCommentsRunProgress | null,
): SocialAccountCommentsShardProgress[] => {
  const rows = progress?.comment_shards ?? progress?.shards ?? progress?.shard_progress ?? [];
  return Array.isArray(rows) ? rows.slice(0, 8) : [];
};

const toProgressPercent = (completed: number | null, total: number | null): number | null => {
  if (completed === null || total === null || total <= 0) return null;
  return Math.max(0, Math.min(100, (completed / total) * 100));
};

const formatDurationEstimate = (seconds: number | null): string | null => {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) return null;
  const roundedMinutes = Math.max(1, Math.round(seconds / 60));
  if (roundedMinutes < 60) return `${roundedMinutes}m`;
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
};

const estimateInstagramBackfillMinutes = (
  postTargets: number | null,
  workerCount: number,
  postsPerWorkerMinute: number,
): number | null => {
  if (postTargets === null || postTargets <= 0 || workerCount <= 0 || postsPerWorkerMinute <= 0) return null;
  return Math.max(1, Math.ceil(postTargets / (workerCount * postsPerWorkerMinute)));
};

const formatCommentsShardProgressLabel = (row: SocialAccountCommentsShardProgress, index: number): string => {
  const shardIndex = readFiniteNumber(row.shard_index) ?? index + 1;
  const shardCount = readFiniteNumber(row.shard_count);
  const jobId = typeof row.job_id === "string" && row.job_id.trim() ? row.job_id.trim().slice(0, 8) : null;
  return `Shard ${formatInteger(shardIndex)}${shardCount ? ` of ${formatInteger(shardCount)}` : ""}${
    jobId ? ` · job ${jobId}` : ""
  }`;
};

type CommentsShardDisplay = {
  checkedPosts: number | null;
  commentsProcessed: number | null;
  issueLabel: string | null;
  speedLabel: string | null;
  targetCount: number | null;
  percent: number | null;
};

const getCommentsShardDisplay = (row: SocialAccountCommentsShardProgress): CommentsShardDisplay => {
  const targetCount =
    readFiniteNumber(row.target_count) ??
    readFiniteNumber(row.target_source_ids_count) ??
    readFiniteNumber(row.comments_shard_target_count);
  const checkedPosts =
    readFiniteNumber(row.processed_post_count) ??
    readFiniteNumber(row.completed_posts) ??
    readFiniteNumber(row.matched_posts);
  const itemsFound = readFiniteNumber(row.items_found_total);
  const commentsProcessed =
    readFiniteNumber(row.comments_processed) ??
    readFiniteNumber(row.comments_upserted) ??
    itemsFound;
  const postsPerMinute = readFiniteNumber(row.posts_per_minute);
  const commentsPerMinute = readFiniteNumber(row.comments_per_minute);
  const issueLabel =
    readCommentsProgressString(row.latest_stop_reason) ??
    readCommentsProgressString(row.latest_failure_reason) ??
    readCommentsProgressString(row.error_message) ??
    readCommentsProgressString(row.latest_fetch_reason);
  const speedLabel =
    postsPerMinute !== null || commentsPerMinute !== null
      ? [
          postsPerMinute !== null ? `${postsPerMinute.toFixed(1)} posts/min` : null,
          commentsPerMinute !== null ? `${commentsPerMinute.toFixed(0)} comments/min` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;
  return {
    checkedPosts,
    commentsProcessed,
    issueLabel,
    speedLabel,
    targetCount,
    percent: toProgressPercent(checkedPosts, targetCount),
  };
};

const readCommentsProgressString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const readCommentsProgressBoolean = (value: unknown): boolean | null => {
  return typeof value === "boolean" ? value : null;
};

const readCommentsProgressTruthy = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    return ["1", "true", "yes", "on", "enabled"].includes(value.trim().toLowerCase());
  }
  return false;
};

const isCommentsProgressNonAuthoritative = (progress?: SocialAccountCommentsRunProgress | null): boolean => {
  if (!progress || typeof progress !== "object") return false;
  const record = progress as Record<string, unknown>;
  return (
    readCommentsProgressTruthy(record.stale) ||
    readCommentsProgressTruthy(record.progress_stale) ||
    readCommentsProgressTruthy(record.degraded) ||
    readCommentsProgressTruthy(record.progress_degraded) ||
    record.progress_authoritative === false ||
    record.authoritative === false
  );
};

const readCommentsProgressMetadata = (
  progress?: SocialAccountCommentsRunProgress | null,
): Record<string, unknown> => {
  return progress?.job_metadata && typeof progress.job_metadata === "object" ? progress.job_metadata : {};
};

const commentsProgressHasActiveRows = (progress?: SocialAccountCommentsRunProgress | null): boolean => {
  if (!progress) return false;
  const normalizedStatus = String(progress.run_status || "").trim().toLowerCase();
  if (!ACTIVE_CATALOG_RUN_STATUSES.has(normalizedStatus)) return false;
  const summary = progress.summary && typeof progress.summary === "object" ? progress.summary : {};
  return [
    summary.items_found_total,
    summary.comments_processed_total,
    summary.comments_upserted_total,
    progress.post_progress?.completed_posts,
  ].some((value) => (readFiniteNumber(value) ?? 0) > 0);
};

const isCommentsEndpointProbeAdvisoryActive = (progress?: SocialAccountCommentsRunProgress | null): boolean => {
  if (!progress) return false;
  if (readCommentsProgressTruthy(progress.comments_endpoint_probe_advisory_active)) return true;
  const endpointProbe = progress.comments_endpoint_probe;
  const endpointProbeStatus =
    endpointProbe && typeof endpointProbe === "object"
      ? String(endpointProbe.status || endpointProbe.result || "").trim().toLowerCase()
      : "";
  return Boolean(
    endpointProbeStatus === "auth_blocked" &&
    endpointProbe &&
    typeof endpointProbe === "object" &&
    readCommentsProgressTruthy(endpointProbe.advisory_continue) &&
    commentsProgressHasActiveRows(progress)
  );
};

const isTransientCommentsProgressPollError = (message: unknown): boolean => {
  const normalized = String(message || "").trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized === "failed to fetch" ||
    normalized === "load failed" ||
    normalized.includes("networkerror") ||
    normalized.includes("network request failed") ||
    normalized.includes("the network connection was lost")
  );
};

const formatActiveCommentsProgressWarning = (progress?: SocialAccountCommentsRunProgress | null): string | null => {
  if (!progress) return null;
  if (isCommentsProgressNonAuthoritative(progress)) {
    return "Comments progress is temporarily stale. Live controls are locked until a fresh progress response arrives.";
  }
  const explicitWarning =
    (typeof progress.warning_message === "string" && progress.warning_message.trim()) ||
    (progress.warnings ?? []).filter((warning) => typeof warning === "string" && warning.trim()).slice(0, 2).join(" ");
  if (explicitWarning) return explicitWarning;
  const endpointProbe = progress.comments_endpoint_probe;
  const endpointProbeStatus =
    endpointProbe && typeof endpointProbe === "object"
      ? String(endpointProbe.status || endpointProbe.result || "").trim().toLowerCase()
      : "";
  if (progress.manual_auth_required === true) {
    return "Instagram comments auth is blocked. Complete manual Instagram auth, then rerun the comments scrape.";
  }
  if (endpointProbeStatus === "auth_blocked") {
    return isCommentsEndpointProbeAdvisoryActive(progress)
      ? "Comments endpoint preflight was blocked; workers are continuing with fallback."
      : "Instagram comments auth is blocked. Complete manual Instagram auth, then rerun the comments scrape.";
  }
  if (endpointProbeStatus === "transport_blocked") {
    return "Comments endpoint preflight timed out through the proxy; workers are continuing.";
  }
  const targetCount =
    readFiniteNumber(progress.target_source_ids_count) ??
    readFiniteNumber(progress.post_progress?.total_posts) ??
    (progress.target_source_ids?.length ? progress.target_source_ids.length : null);
  const shardCount = readFiniteNumber(progress.comments_shard_count);
  const isPreSharding =
    Boolean(progress.pre_sharding_run || progress.stale_pre_sharding_run) ||
    (progress.comments_sharding_enabled === false &&
      targetCount !== null &&
      targetCount > 25 &&
      (shardCount === null || shardCount <= 1));
  if (!isPreSharding) return null;
  return targetCount !== null
    ? `Pre-sharding run: one comments job is covering ${formatInteger(targetCount)} targets. New launches should use sharded workers.`
    : "Pre-sharding run: this older comments job may not include shard-level progress.";
};

const getActiveCommentsRunScopeNotice = (progress?: SocialAccountCommentsRunProgress | null): string | null => {
  if (!progress) return null;
  const metadata = readCommentsProgressMetadata(progress);
  const runStatus = String(progress.run_status || "").trim().toLowerCase();
  const isActiveRun = ACTIVE_CATALOG_RUN_STATUSES.has(runStatus);
  const isTerminalRun = TERMINAL_CATALOG_RUN_STATUSES.has(runStatus);
  const statusWord = isActiveRun ? "active" : isTerminalRun ? formatRunStatusLabel(runStatus).toLowerCase() : "current";
  const targetVerb = isActiveRun ? "is targeting" : "targeted";
  const mode = readCommentsProgressString(progress.mode) ?? readCommentsProgressString(metadata.mode);
  const targetFilter = readCommentsProgressString(progress.target_filter) ?? readCommentsProgressString(metadata.target_filter);
  const incompleteFill =
    readCommentsProgressBoolean(progress.incomplete_fill) ?? readCommentsProgressBoolean(metadata.incomplete_fill) ?? false;
  const targetCount =
    readFiniteNumber(progress.target_source_ids_count) ??
    readFiniteNumber(metadata.target_source_ids_count) ??
    readFiniteNumber(progress.post_progress?.total_posts);
  const sourceIds =
    progress.target_source_ids ??
    (Array.isArray(metadata.target_source_ids)
      ? metadata.target_source_ids.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : []);
  const firstSourceId = sourceIds[0];

  if (mode === "single_post") {
    const targetLabel = firstSourceId ? ` for ${firstSourceId}` : "";
    return `Single-post repair${targetLabel}: this run only updates one post and will not close the account-wide comments gap. Run Incomplete Fill after it finishes to target every incomplete post.`;
  }
  if (targetFilter === "incomplete" || incompleteFill) {
    return targetCount && targetCount > 0
      ? `Incomplete Fill ${statusWord}: this run ${targetVerb} ${formatInteger(targetCount)} incomplete posts.`
      : `Incomplete Fill ${statusWord}: this run ${targetVerb} incomplete posts.`;
  }
  if (mode === "profile" && targetCount && targetCount > 0) {
    return `Profile comments sync ${statusWord}: this run ${targetVerb} ${formatInteger(targetCount)} posts.`;
  }
  return null;
};

const formatRunStageLabel = (
  value?: string | null,
  options?: { frontierMode?: boolean; singleRunnerFallback?: boolean; detailsRefresh?: boolean },
): string => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "Other";
  const frontierMode = Boolean(options?.frontierMode);
  const singleRunnerFallback = Boolean(options?.singleRunnerFallback);
  const detailsRefresh = Boolean(options?.detailsRefresh);
  if (normalized === "media_mirror") return "Media Mirror";
  if (normalized === "comment_media_mirror") return "Comment Media Mirror";
  if (normalized === "shared_account_discovery") return frontierMode ? "History Bootstrap" : "History Discovery";
  if (normalized === "shared_account_posts") {
    if (detailsRefresh) return "Detail Workers";
    return frontierMode || singleRunnerFallback ? "Catalog Fetch" : "Shard Workers";
  }
  if (normalized === "post_classify") return "Classifying Posts";
  if (normalized === "season_materialize") return "Season Materialize";
  if (normalized === "analytics_refresh") return "Analytics Refresh";
  return normalized
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
};

const formatHandleLabel = (value?: string | null): string => {
  const normalized = String(value || "").trim().replace(/^@+/, "");
  return normalized ? `@${normalized}` : "@unknown";
};

const formatRecoveryReasonLabel = (value?: string | null): string => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "unknown";
  return normalized.replaceAll("_", " ");
};

const isDetailsRefreshCatalogProgress = (
  progress?: SocialAccountCatalogRunProgressSnapshot | null,
): boolean => {
  const detailRefreshStage = getStageGraphNode(progress, "detail_refresh");
  const detailRefreshStatus = getStageGraphNodeStatus(detailRefreshStage);
  return (
    Boolean(progress?.details_refresh_force_detail_fetch) ||
    Boolean(progress?.force_network_detail_fetch) ||
    Boolean(progress?.detail_refresh) ||
    Boolean(detailRefreshStatus && detailRefreshStatus !== "skipped") ||
    (progress?.effective_selected_tasks ?? []).includes("post_details")
  );
};

const hasCatalogRecoveryDetails = (
  recovery?: SocialAccountCatalogRunProgressSnapshot["recovery"] | null,
): boolean => {
  if (!recovery) return false;
  const status = String(recovery.status || "").trim().toLowerCase();
  const reason = String(recovery.reason || "").trim().toLowerCase();
  return Boolean(
    (status && status !== "idle") ||
      (reason && reason !== "unknown") ||
      recovery.stage ||
      recovery.next_stage ||
      recovery.transport ||
      recovery.execution_backend ||
      Number(recovery.attempt_count ?? 0) > 0 ||
      Number(recovery.waited_seconds ?? 0) > 0 ||
      Number(recovery.recovery_depth ?? 0) > 0,
  );
};

const formatCatalogStageActivitySummary = (
  stageName: string,
  stats: Pick<CatalogRunProgressStageStats, "scraped" | "saved">,
  options?: { frontierMode?: boolean; singleRunnerFallback?: boolean; detailsRefresh?: boolean },
): string => {
  const normalized = String(stageName || "").trim().toLowerCase();
  const frontierMode = Boolean(options?.frontierMode);
  const singleRunnerFallback = Boolean(options?.singleRunnerFallback);
  const detailsRefresh = Boolean(options?.detailsRefresh);
  if (normalized === "shared_account_discovery") {
    if (frontierMode) {
      return [
        `${formatInteger(stats.scraped)} checked`,
        stats.saved > 0 ? `${formatInteger(stats.saved)} saved` : null,
      ]
        .filter(Boolean)
        .join(" · ");
    }
    return [
      `${formatInteger(stats.scraped)} checked`,
      stats.saved > 0 ? `${formatInteger(stats.saved)} partitions created` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (normalized === "shared_account_posts" && detailsRefresh) {
    return [
      `${formatInteger(stats.scraped)} checked`,
      stats.saved > 0 ? `${formatInteger(stats.saved)} refreshed` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (normalized === "shared_account_posts" && (frontierMode || singleRunnerFallback)) {
    return [
      `${formatInteger(stats.scraped)} checked`,
      stats.saved > 0 ? `${formatInteger(stats.saved)} saved` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (normalized === "post_classify") {
    return [
      `${formatInteger(stats.scraped)} classified`,
      stats.saved > 0 ? `${formatInteger(stats.saved)} saved` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  return [
    `${formatInteger(stats.scraped)} scraped`,
    stats.saved > 0 ? `${formatInteger(stats.saved)} saved` : null,
  ]
    .filter(Boolean)
    .join(" · ");
};

const shortRunId = (value?: string | null): string => {
  const normalized = String(value || "").trim();
  return normalized ? normalized.slice(0, 8) : "pending";
};

const formatAttachedLaneSourceLabel = (value?: string | null): string | null => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "new_run") return "New";
  if (normalized === "reused_run") return "Reused";
  if (normalized === "deferred_after_catalog") return "Deferred";
  if (normalized === "catalog_media_mirror") return "Attached";
  if (normalized === "comments_media_followups") return "Comment Follow-ups";
  return formatRunStatusLabel(normalized);
};

const formatStageGraphLaneLabel = (value: string): string => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "target_readiness") return "Target Readiness";
  if (normalized === "detail_refresh") return "Detail Refresh";
  if (normalized === "permalink_metadata_refresh") return "Permalink Metadata";
  if (normalized === "facebook_crosspost_refresh") return "Facebook Crosspost";
  if (normalized === "media_candidate_refresh") return "Media Candidates";
  return formatRunStageLabel(normalized);
};

const getStageGraphNode = (
  progress: SocialAccountCatalogRunProgressSnapshot | null | undefined,
  key: string,
): SocialAccountCatalogStageGraphNode | null => {
  const fromGraph = progress?.stage_graph?.[key];
  if (fromGraph && typeof fromGraph === "object") return fromGraph;
  const direct = (progress as Record<string, unknown> | null | undefined)?.[key];
  return direct && typeof direct === "object" ? (direct as SocialAccountCatalogStageGraphNode) : null;
};

const getStageGraphNodeStatus = (node?: SocialAccountCatalogStageGraphNode | null): string | null => {
  const status = String(node?.status || node?.state || "").trim();
  return status || null;
};

const normalizeCatalogLaneStatus = (value?: string | null): string | null => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || null;
};

const shouldPreferAttachedFollowupLaneStatus = (value?: string | null): boolean => {
  const normalized = normalizeCatalogLaneStatus(value);
  if (!normalized) return false;
  return TERMINAL_CATALOG_RUN_STATUSES.has(normalized) || ACTIVE_CATALOG_RUN_STATUSES.has(normalized) || normalized === "blocked_auth";
};

const getStageGraphBlockedReason = (node?: SocialAccountCatalogStageGraphNode | null): string | null => {
  const reasons = [
    node?.blocked_reason,
    node?.blocker_reason,
    node?.blocker,
    ...(Array.isArray(node?.blocked_reasons) ? node.blocked_reasons : []),
    ...(Array.isArray(node?.blocker_reasons) ? node.blocker_reasons : []),
  ]
    .map((value) => String(value || "").trim())
    .filter((value) => value.length > 0);
  return reasons.length > 0 ? reasons.map(formatDiagnosticToken).join(", ") : null;
};

const formatStageGraphCounts = (node?: SocialAccountCatalogStageGraphNode | null): string | null => {
  if (!node) return null;
  const completed = Number(node.completed_count ?? 0);
  const failed = Number(node.failed_count ?? 0);
  const running = Number(node.running_count ?? 0);
  const pending = Number(node.pending_count ?? 0);
  const total = Number(node.total_count ?? node.target_count ?? node.eligible_count ?? 0);
  const pieces = [
    total > 0 ? `${formatInteger(completed + failed)} / ${formatInteger(total)} complete` : null,
    running > 0 ? `${formatInteger(running)} running` : null,
    pending > 0 ? `${formatInteger(pending)} pending` : null,
    failed > 0 ? `${formatInteger(failed)} failed` : null,
  ].filter(Boolean);
  return pieces.length > 0 ? pieces.join(" · ") : null;
};

const formatDetailRefreshCounters = (
  progress?: SocialAccountCatalogRunProgressSnapshot | null,
): string | null => {
  const detail = progress?.detail_refresh;
  if (!detail) return null;
  const attempts = Number(detail.fetch_attempts ?? 0);
  const avoided = Number(detail.fetch_avoided ?? 0);
  const gallery = Number(detail.rows_satisfied_from_gallery ?? 0);
  const existing = Number(detail.rows_satisfied_from_existing ?? 0);
  const pieces = [
    attempts > 0 ? `${formatInteger(attempts)} network fetches` : null,
    avoided > 0 ? `${formatInteger(avoided)} avoided` : null,
    gallery > 0 ? `${formatInteger(gallery)} gallery` : null,
    existing > 0 ? `${formatInteger(existing)} existing` : null,
  ].filter(Boolean);
  return pieces.length > 0 ? pieces.join(" · ") : null;
};

const formatProxyMetadata = (progress?: SocialAccountCatalogRunProgressSnapshot | null): string | null => {
  const metadata = progress?.proxy_metadata;
  const fingerprint =
    String(progress?.proxy_fingerprint || metadata?.proxy_fingerprint || metadata?.posts_proxy_fingerprint || metadata?.detail_proxy_fingerprint || "").trim();
  const sessionMode =
    String(progress?.proxy_session_mode || metadata?.proxy_session_mode || metadata?.posts_proxy_session_mode || metadata?.detail_proxy_session_mode || "").trim();
  const provider = String(metadata?.proxy_provider || "").trim();
  const pieces = [
    provider ? `proxy ${provider}` : fingerprint ? `proxy ${fingerprint}` : null,
    sessionMode ? `session ${formatDiagnosticToken(sessionMode)}` : null,
  ].filter(Boolean);
  return pieces.length > 0 ? pieces.join(" · ") : null;
};

const buildStageGraphLaneCards = (
  progress?: SocialAccountCatalogRunProgressSnapshot | null,
  attachedFollowups?: SocialAccountCatalogAttachedFollowups | null,
): CatalogLaneCard[] => {
  if (!progress?.stage_graph && !progress?.target_readiness && !progress?.detail_refresh && !progress?.enrichment) {
    return [];
  }
  const lanes: CatalogLaneCard[] = [];
  const appendLane = (
    key: string,
    fallbackStatus?: string | null,
    fallbackDetail?: string | null,
    followup?: NonNullable<SocialAccountCatalogAttachedFollowups["comments" | "media"]> | null,
  ) => {
    const node = getStageGraphNode(progress, key);
    if (!node && !fallbackStatus && !fallbackDetail && !followup) return;
    const nodeStatus = getStageGraphNodeStatus(node);
    const followupStatus = normalizeCatalogLaneStatus(followup?.status ?? followup?.state);
    const followupRunId = String(followup && "run_id" in followup ? followup.run_id || "" : "").trim();
    const followupAttachmentId = String(followup && "attachment_id" in followup ? followup.attachment_id || "" : "").trim();
    const followupDetail =
      followupRunId
        ? `Run ${shortRunId(followupRunId)}`
        : followupAttachmentId
          ? `Attachment ${shortRunId(followupAttachmentId)}`
          : null;
    const followupErrorMessage = String(followup && "error_message" in followup ? followup.error_message || "" : "").trim();
    const followupErrorDetail = followupErrorMessage
      ? `${followup && "retryable" in followup && followup.retryable ? "Retryable: " : ""}${followupErrorMessage}`
      : null;
    lanes.push({
      key,
      label: formatStageGraphLaneLabel(key),
      status: shouldPreferAttachedFollowupLaneStatus(followupStatus) ? followupStatus : nodeStatus ?? fallbackStatus,
      sourceLabel: formatAttachedLaneSourceLabel(followup?.source),
      detail: followupDetail || followupErrorDetail || String(node?.detail || "").trim() || fallbackDetail || null,
      blockedReason: getStageGraphBlockedReason(node),
      counts: formatStageGraphCounts(node),
    });
  };
  appendLane("target_readiness");
  appendLane("detail_refresh", null, formatDetailRefreshCounters(progress));
  appendLane(
    "comments",
    progress.comments_run_id ? "running" : null,
    progress.comments_run_id ? `Run ${shortRunId(progress.comments_run_id)}` : null,
    attachedFollowups?.comments ?? progress.attached_followups?.comments ?? null,
  );
  appendLane("media", null, null, attachedFollowups?.media ?? progress.attached_followups?.media ?? null);
  appendLane("enrichment", null, typeof progress.enrichment?.pending_count === "number" ? `${formatInteger(progress.enrichment.pending_count)} pending` : null);
  const enrichmentLanes = progress.enrichment?.lanes;
  const normalizedEnrichmentLanes = Array.isArray(enrichmentLanes)
    ? enrichmentLanes
    : enrichmentLanes && typeof enrichmentLanes === "object"
      ? Object.entries(enrichmentLanes).map(([key, lane]) => ({ key, ...lane }))
      : [];
  for (const lane of normalizedEnrichmentLanes) {
    const key = String(lane.key || lane.lane || "").trim();
    if (!key) continue;
    lanes.push({
      key: `enrichment:${key}`,
      label: formatStageGraphLaneLabel(key),
      status: lane.status,
      detail: lane.detail ?? null,
      blockedReason: formatDiagnosticToken(lane.blocked_reason || lane.blocker_reason),
      counts: formatStageGraphCounts(lane),
    });
  }
  appendLane("finalization");
  return lanes;
};

const shouldShowCatalogLaunchState = (runStatus?: string | null, launchState?: string | null): boolean => {
  const normalizedRunStatus = String(runStatus || "").trim().toLowerCase();
  const normalizedLaunchState = String(launchState || "").trim().toLowerCase();
  if (!normalizedLaunchState) return false;
  return !TERMINAL_CATALOG_RUN_STATUSES.has(normalizedRunStatus);
};

const shouldShowCatalogCompletedAt = (
  completedAt?: string | null,
  startedAt?: string | null,
  createdAt?: string | null,
): boolean => {
  const completedMs = Date.parse(String(completedAt || ""));
  if (!Number.isFinite(completedMs)) return false;
  const startedMs = Date.parse(String(startedAt || ""));
  if (Number.isFinite(startedMs) && completedMs < startedMs) return false;
  const createdMs = Date.parse(String(createdAt || ""));
  if (Number.isFinite(createdMs) && completedMs < createdMs) return false;
  return true;
};

const buildCatalogLaneCards = (options: {
  progress?: SocialAccountCatalogRunProgressSnapshot | null;
  runStatus?: string | null;
  selectedTasks?: CatalogBackfillSelectedTask[] | null;
  effectiveSelectedTasks?: CatalogBackfillSelectedTask[] | null;
  commentsRunId?: string | null;
  attachedFollowups?: SocialAccountCatalogAttachedFollowups | null;
}): CatalogLaneCard[] => {
  const stageGraphCards = buildStageGraphLaneCards(options.progress, options.attachedFollowups);
  if (stageGraphCards.length > 0) {
    return stageGraphCards;
  }
  const taskSet = new Set<CatalogBackfillSelectedTask>([
    ...(options.selectedTasks ?? []),
    ...(options.effectiveSelectedTasks ?? []),
  ]);
  const commentsFollowup = options.attachedFollowups?.comments ?? null;
  const mediaFollowup = options.attachedFollowups?.media ?? null;
  const normalizedRunStatus = String(options.runStatus || "").trim().toLowerCase();
  const terminalRunStatus = TERMINAL_CATALOG_RUN_STATUSES.has(normalizedRunStatus) ? normalizedRunStatus : null;
  const cards: CatalogLaneCard[] = [
    {
      key: "catalog",
      label: "Catalog",
      status: options.runStatus,
    },
  ];
  if (taskSet.has("comments") || commentsFollowup || options.commentsRunId) {
    const commentsRunId = String(commentsFollowup?.run_id || options.commentsRunId || "").trim() || null;
    const sourceLabel = formatAttachedLaneSourceLabel(commentsFollowup?.source);
    const followupErrorMessage = String(commentsFollowup?.error_message || "").trim();
    const followupErrorDetail = followupErrorMessage
      ? `${commentsFollowup?.retryable ? "Retryable: " : ""}${followupErrorMessage}`
      : null;
    const normalizedCommentsFollowupStatus = normalizeCatalogLaneStatus(commentsFollowup?.status);
    const commentsStatus =
      terminalRunStatus && !commentsRunId && commentsFollowup?.source === "deferred_after_catalog"
        ? normalizedCommentsFollowupStatus === "failed" || normalizedCommentsFollowupStatus === "cancelled"
          ? normalizedCommentsFollowupStatus
          : terminalRunStatus
        : commentsFollowup?.status ?? (commentsRunId ? "queued" : null);
    cards.push({
      key: "comments",
      label: "Comments",
      status: commentsStatus,
      sourceLabel,
      detail: commentsRunId
        ? `Run ${shortRunId(commentsRunId)}`
        : followupErrorDetail
          ? followupErrorDetail
        : sourceLabel === "Deferred" && !terminalRunStatus
          ? "Waiting for target readiness"
          : null,
    });
  }
  if (taskSet.has("media") || mediaFollowup) {
    const attachmentId = String(mediaFollowup?.attachment_id || "").trim() || null;
    const enqueuedCount = typeof mediaFollowup?.enqueued_job_count === "number" ? mediaFollowup.enqueued_job_count : null;
    const mediaJobIds = Array.isArray(mediaFollowup?.enqueued_job_ids) ? mediaFollowup.enqueued_job_ids : [];
    const mediaStatus =
      terminalRunStatus &&
      mediaFollowup?.source === "catalog_media_mirror" &&
      mediaJobIds.length === 0 &&
      (enqueuedCount === null || enqueuedCount <= 0)
        ? terminalRunStatus
        : mediaFollowup?.status ?? null;
    cards.push({
      key: "media",
      label: "Media",
      status: mediaStatus,
      sourceLabel: formatAttachedLaneSourceLabel(mediaFollowup?.source),
      detail:
        enqueuedCount && enqueuedCount > 0
          ? `${formatInteger(enqueuedCount)} repair jobs`
          : attachmentId
            ? `Attachment ${shortRunId(attachmentId)}`
            : null,
    });
  }
  return cards;
};

const getCatalogAggregateRunStatus = (runStatus?: string | null, laneCards: CatalogLaneCard[] = []): string => {
  const normalizedRunStatus = normalizeCatalogLaneStatus(runStatus);
  const statuses = [
    normalizedRunStatus,
    ...laneCards
      .filter((lane) => lane.key !== "catalog")
      .map((lane) => normalizeCatalogLaneStatus(lane.status)),
  ].filter((status): status is string => Boolean(status));
  if (statuses.length === 0) return normalizedRunStatus || "";
  for (const status of ["failed", "cancelled", "running", "retrying", "cancelling", "queued", "pending", "completed"]) {
    if (statuses.includes(status)) return status;
  }
  return normalizedRunStatus || statuses[0] || "";
};

const formatCatalogAggregateRunStatusLabel = (runStatus?: string | null, laneCards: CatalogLaneCard[] = []): string => {
  const hasFollowupLanes = laneCards.some((lane) => lane.key !== "catalog");
  const aggregateStatus = getCatalogAggregateRunStatus(runStatus, laneCards);
  return `${hasFollowupLanes ? "Backfill" : "Catalog"} ${formatRunStatusLabel(aggregateStatus || runStatus)}`;
};

const getCatalogRunStatusTone = (value?: string | null): string => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "blocked_auth") return "border-red-200 bg-red-50 text-red-700";
  if (normalized === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "failed") return "border-red-200 bg-red-50 text-red-700";
  if (normalized === "cancelled") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-sky-200 bg-sky-50 text-sky-700";
};

const getCatalogStageBadge = (
  stage: string,
  stats: CatalogRunProgressStageStats,
  options?: { scrapeComplete?: boolean },
): { label: string; tone: string } => {
  const normalizedStage = String(stage || "").trim().toLowerCase();
  const classifyBackground = normalizedStage === "post_classify" && Boolean(options?.scrapeComplete);
  if (classifyBackground && (stats.running > 0 || stats.waiting > 0 || stats.failed > 0)) {
    return {
      label: "Background",
      tone: "bg-zinc-100 text-zinc-700",
    };
  }
  if (stats.failed > 0) {
    return {
      label: "Issue",
      tone: "bg-red-100 text-red-700",
    };
  }
  if (stats.running > 0) {
    return {
      label: "Running",
      tone: "bg-sky-100 text-sky-700",
    };
  }
  if (stats.waiting > 0) {
    return {
      label: "Queued",
      tone: "bg-amber-100 text-amber-700",
    };
  }
  return {
    label: "Done",
    tone: "bg-emerald-100 text-emerald-700",
  };
};

const getCatalogPhaseLabel = (progress?: SocialAccountCatalogRunProgressSnapshot | null): string | null => {
  const detailsRefresh = isDetailsRefreshCatalogProgress(progress);
  const queuedUnclaimedJobs = Number(progress?.dispatch_health?.queued_unclaimed_jobs ?? 0);
  const dispatchBlockedJobs = Number(progress?.dispatch_health?.dispatch_blocked_jobs ?? 0);
  const modalPendingJobs = Number(progress?.dispatch_health?.modal_pending_jobs ?? 0);
  const modalRunningUnclaimedJobs = Number(progress?.dispatch_health?.modal_running_unclaimed_jobs ?? 0);
  const retryingDispatchJobs = Number(progress?.dispatch_health?.retrying_dispatch_jobs ?? 0);
  const staleDispatchFailedJobs = Number(progress?.dispatch_health?.stale_dispatch_failed_jobs ?? 0);
  const runStatus = normalizeCatalogRunStatus(progress?.run_status);
  const runState = normalizeCatalogRunState(progress?.run_state);
  const recovery = progress?.recovery;
  const recoveryStatus = String(recovery?.status || "").trim().toLowerCase();
  const recoveryReason = String(recovery?.reason || "").trim().toLowerCase();
  const recoveryStage = String(recovery?.stage || "").trim().toLowerCase();
  const completionGapReason = String(progress?.completion_gap_reason || "").trim().toLowerCase();
  const stopReason = String(progress?.stop_reason || progress?.run_diagnostics?.frontier_stop_reason || "").trim().toLowerCase();
  if (runStatus === "cancelled") {
    return "Run cancelled";
  }
  if (runStatus === "blocked_auth" || stopReason === "checkpoint_required") {
    return "Instagram auth blocked";
  }
  if (stopReason === "pagination_doc_id_stale" || progress?.pagination_doc_id_stale) {
    return "Instagram doc ID stale";
  }
  if (stopReason === "cursor_expired_restart_required") {
    return "Cursor restart required";
  }
  if (stopReason === "awaiting_enrichment") {
    return "Listing saved; enrichment pending";
  }
  if (
    runStatus === "failed" &&
    completionGapReason === "fetch_incomplete" &&
    recoveryReason === "no_partitions_discovered" &&
    !["queued", "running", "fallback_enqueued", "blocked"].includes(recoveryStatus)
  ) {
    return "Recovery ended before catalog fetch";
  }
  if (runStatus === "failed") {
    return "Run failed";
  }
  if (runStatus === "completed" && !progress?.classify_incomplete) {
    return detailsRefresh ? "Post details refreshed" : "Catalog fetch complete";
  }
  if (staleDispatchFailedJobs > 0) {
    return "Remote dispatch failed";
  }
  if (dispatchBlockedJobs > 0) {
    return "Modal dispatch blocked";
  }
  if (retryingDispatchJobs > 0) {
    return "Retrying remote dispatch";
  }
  if (runState === "recovering") {
    if (recoveryReason === "no_authenticated_modal_workers" || recoveryStatus === "blocked") {
      return "Waiting for authenticated Modal worker";
    }
    if (recoveryReason === "initial_empty_page") {
      return "Instagram blocked first-page fetch";
    }
    if (recoveryStatus === "fallback_enqueued" || recoveryStage === "shared_account_posts") {
      return "Falling back to direct catalog fetch";
    }
    if (recoveryStage === "shared_account_discovery") {
      return "Recovering history partitions";
    }
  }
  if (runState === "discovering") {
    return "Bootstrapping history";
  }
  if (runState === "fetching") {
    return detailsRefresh ? "Refreshing post details" : "Fetching catalog posts";
  }
  if (runState === "classifying") {
    return "Classifying posts";
  }
  if (runState === "completed") {
    return detailsRefresh ? "Post details refreshed" : "Catalog fetch complete";
  }
  if (progress?.scrape_complete) {
    return progress?.classify_incomplete ? "Classifying posts" : detailsRefresh ? "Post details refreshed" : "Catalog fetch complete";
  }
  if (runStatus === "queued" && modalPendingJobs > 0) {
    return "Waiting for Modal capacity";
  }
  if (runStatus === "queued" && modalRunningUnclaimedJobs > 0) {
    return "Modal worker starting";
  }
  if (runStatus === "queued" && queuedUnclaimedJobs > 0) {
    return "Waiting for Modal worker";
  }
  const frontierMode =
    String(progress?.worker_runtime?.frontier_strategy || progress?.partition_strategy || "")
      .trim()
      .toLowerCase() === "newest_first_frontier";
  const singleRunnerFallback =
    String(progress?.worker_runtime?.runner_strategy || "")
      .trim()
      .toLowerCase() === "single_runner_fallback";
  const discovery = progress?.discovery;
  const frontier = progress?.frontier;
  const activeDiscoveryJobs = Number(progress?.stages?.shared_account_discovery?.jobs_active ?? 0);
  const activeSharedPostsJobs = Number(progress?.stages?.shared_account_posts?.jobs_active ?? 0);
  if (activeDiscoveryJobs > 0) {
    return frontierMode ? "Bootstrapping history" : "Discovering history";
  }
  if (activeSharedPostsJobs > 0) {
    if (detailsRefresh) {
      return "Refreshing post details";
    }
    return frontierMode || singleRunnerFallback ? "Fetching catalog posts" : "Running shard workers";
  }
  if (frontierMode) {
    if (frontier?.status === "completed" || frontier?.exhausted) {
      return "Classifying posts";
    }
  }
  if (Number(discovery?.partition_count ?? 0) > 0) {
    if (Number(discovery?.running_count ?? 0) > 0 || Number(discovery?.queued_count ?? 0) > 0) {
      return "Running shard workers";
    }
    if (Number(discovery?.completed_count ?? 0) === Number(discovery?.partition_count ?? 0)) {
      return "Classifying posts";
    }
  }
  return null;
};

const normalizeStageStats = (
  stage: SocialAccountCatalogRunProgressStage | SocialAccountCatalogRunProgressHandle,
): CatalogRunProgressStageStats => ({
  total: Number(stage.jobs_total ?? 0),
  completed: Number(stage.jobs_completed ?? 0),
  failed: Number(stage.jobs_failed ?? 0),
  active: Number(stage.jobs_active ?? 0),
  running: Number(stage.jobs_running ?? 0),
  waiting: Number(stage.jobs_waiting ?? 0),
  scraped: Number(stage.scraped_count ?? 0),
  saved: Number(stage.saved_count ?? 0),
});

const normalizeStageGraphNodeStats = (
  node?: SocialAccountCatalogStageGraphNode | null,
): CatalogRunProgressStageStats | null => {
  if (!node) return null;
  const total = Number(node.total_count ?? node.target_count ?? node.eligible_count ?? 0);
  const completed = Number(node.completed_count ?? 0);
  const failed = Number(node.failed_count ?? 0);
  const running = Number(node.running_count ?? 0);
  const waiting = Number(node.pending_count ?? 0);
  if (total <= 0 && completed <= 0 && failed <= 0 && running <= 0 && waiting <= 0) {
    return null;
  }
  return {
    total,
    completed,
    failed,
    active: running,
    running,
    waiting,
    scraped: 0,
    saved: 0,
  };
};

const normalizeCatalogRunStatus = (value?: string | null): string => {
  return String(value || "").trim().toLowerCase();
};

const normalizeCatalogRunState = (value?: string | null): string => {
  return String(value || "").trim().toLowerCase();
};

const resolveActiveCatalogSourceScope = (
  summary?: SocialAccountProfileSummary | null,
  progress?: SocialAccountCatalogRunProgressSnapshot | null,
): NonNullable<CatalogBackfillRequest["source_scope"]> => {
  const progressScope = String(progress?.source_scope || "").trim().toLowerCase();
  if (
    progressScope === "network" ||
    progressScope === "creator" ||
    progressScope === "community" ||
    progressScope === "news"
  ) {
    return progressScope;
  }
  if (progressScope === "bravo") return "network";
  const sourceStatusRows = Array.isArray(summary?.source_status) ? summary.source_status : [];
  for (const row of sourceStatusRows) {
    const scope = String((row as Record<string, unknown>).source_scope || "").trim().toLowerCase();
    if (
      scope === "network" ||
      scope === "creator" ||
      scope === "community" ||
      scope === "news"
    ) {
      return scope;
    }
    if (scope === "bravo") return "network";
  }
  return "network";
};

const resolveNetworkProfileName = (
  summary?: SocialAccountProfileSummary | null,
  progress?: SocialAccountCatalogRunProgressSnapshot | null,
): string | null => {
  for (const candidate of [summary?.network_name, progress?.network_name, progress?.shared_profile?.network_name]) {
    const value = String(candidate || "").trim();
    if (value) return value;
  }
  const sourceStatusRows = Array.isArray(summary?.source_status) ? summary.source_status : [];
  for (const row of sourceStatusRows) {
    const networkName = String((row as Record<string, unknown>).network_name || "").trim();
    if (networkName) return networkName;
  }
  return null;
};

const getOperationalAlertTone = (severity?: string | null): string => {
  const normalized = String(severity || "").trim().toLowerCase();
  if (normalized === "error") return "border-red-200 bg-red-50 text-red-700";
  if (normalized === "info") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
};

const formatOperationalAlertLabel = (alert: SocialAccountOperationalAlert): string =>
  String(alert.code || "").trim().toLowerCase() === "failed_recovery_no_partitions_discovered"
    ? "Failed Recovery"
    : String(alert.code || "")
        .trim()
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(/\b\w/g, (token) => token.toUpperCase());

const getCatalogDispatchStatusMessage = (progress?: SocialAccountCatalogRunProgressSnapshot | null): {
  tone: "amber" | "red";
  text: string;
} | null => {
  const queuedUnclaimedJobs = Number(progress?.dispatch_health?.queued_unclaimed_jobs ?? 0);
  const dispatchBlockedJobs = Number(progress?.dispatch_health?.dispatch_blocked_jobs ?? 0);
  const modalPendingJobs = Number(progress?.dispatch_health?.modal_pending_jobs ?? 0);
  const modalRunningUnclaimedJobs = Number(progress?.dispatch_health?.modal_running_unclaimed_jobs ?? 0);
  const retryingDispatchJobs = Number(progress?.dispatch_health?.retrying_dispatch_jobs ?? 0);
  const staleDispatchFailedJobs = Number(progress?.dispatch_health?.stale_dispatch_failed_jobs ?? 0);
  const maxRetries = Number(progress?.dispatch_health?.max_stale_dispatch_retries ?? 0);
  const latestDispatchRequestedAt = progress?.dispatch_health?.latest_dispatch_requested_at;
  const remoteInvocationCheckedAt = progress?.dispatch_health?.remote_invocation_checked_at;
  const latestDispatchError = String(progress?.dispatch_health?.latest_dispatch_error || "").trim();
  const latestDispatchErrorCode = String(progress?.dispatch_health?.latest_dispatch_error_code || "").trim();
  const latestRemoteBlockedReason = String(progress?.dispatch_health?.latest_remote_blocked_reason || "").trim();
  const modalEnvironment = String(progress?.dispatch_health?.modal_environment || "").trim();
  const modalTargetLabel = formatModalTargetLabel(progress);
  const runState = normalizeCatalogRunState(progress?.run_state);
  const backgroundClassify = Boolean(runState === "classifying" || (progress?.scrape_complete && progress?.classify_incomplete));
  const formatJobLabel = (count: number): string =>
    backgroundClassify
      ? `${formatInteger(count)} classif${count === 1 ? "y job" : "y jobs"} from this run`
      : `${formatInteger(count)} queued job${count === 1 ? "" : "s"}`;
  if (staleDispatchFailedJobs > 0) {
    return {
      tone: "red",
      text: `${formatJobLabel(staleDispatchFailedJobs)} exhausted ${
        maxRetries > 0 ? formatInteger(maxRetries) : "the allowed"
      } remote dispatch retr${maxRetries === 1 ? "y" : "ies"} before any Modal worker claimed them. Cancel this run before retrying.`,
    };
  }
  if (dispatchBlockedJobs > 0) {
    const detail = latestDispatchError || latestRemoteBlockedReason || latestDispatchErrorCode || "Modal dispatch was blocked before a worker could claim the job.";
    const targetBits = [modalTargetLabel, modalEnvironment ? `env ${modalEnvironment}` : null].filter(Boolean).join(" in ");
    return {
      tone: "red",
      text: `${formatJobLabel(dispatchBlockedJobs)} ${
        dispatchBlockedJobs === 1 ? "is" : "are"
      } blocked before claim. ${detail}${targetBits ? ` Target: ${targetBits}.` : ""}`,
    };
  }
  if (retryingDispatchJobs > 0) {
    return {
      tone: "amber",
      text: `${backgroundClassify ? formatJobLabel(retryingDispatchJobs) : `${formatInteger(retryingDispatchJobs)} job${retryingDispatchJobs === 1 ? "" : "s"}`} ${
        retryingDispatchJobs === 1 ? "is" : "are"
      } retrying remote dispatch after an unclaimed Modal lease expired.`,
    };
  }
  if ((runState === "classifying" || normalizeCatalogRunStatus(progress?.run_status) === "queued") && modalPendingJobs > 0) {
    return {
      tone: "amber",
      text: `${formatJobLabel(modalPendingJobs)} ${
        modalPendingJobs === 1 ? "is" : "are"
      } already dispatched to Modal and waiting for capacity${
        remoteInvocationCheckedAt ? ` as of ${formatDateTime(remoteInvocationCheckedAt)}` : ""
      }.`,
    };
  }
  if ((runState === "classifying" || normalizeCatalogRunStatus(progress?.run_status) === "queued") && modalRunningUnclaimedJobs > 0) {
    return {
      tone: "amber",
      text: `${formatJobLabel(modalRunningUnclaimedJobs)} ${
        modalRunningUnclaimedJobs === 1 ? "is" : "are"
      } already running in Modal and waiting to claim the database job${
        remoteInvocationCheckedAt ? ` as of ${formatDateTime(remoteInvocationCheckedAt)}` : ""
      }.`,
    };
  }
  if ((runState === "classifying" || normalizeCatalogRunStatus(progress?.run_status) === "queued") && queuedUnclaimedJobs > 0) {
    return {
      tone: "amber",
      text: `${formatJobLabel(queuedUnclaimedJobs)} ${
        queuedUnclaimedJobs === 1 ? "is" : "are"
      } waiting for a Modal worker claim${latestDispatchRequestedAt ? ` since ${formatDateTime(latestDispatchRequestedAt)}` : ""}.`,
    };
  }
  return null;
};

const getCatalogLaunchGuardMessage = (
  progress?: SocialAccountCatalogRunProgressSnapshot | null,
  cookieHealth?: SocialProfileCookieHealth | null,
): string | null => {
  const operationalState = normalizeCatalogRunState(progress?.operational_state);
  if (operationalState === "blocked_auth") {
    if (isInstagramPostsAuthVerified(cookieHealth)) {
      return null;
    }
    const reason = formatDiagnosticToken(progress?.repairable_reason);
    return reason
      ? `Catalog launch is blocked until the required manual auth is complete. Reason: ${reason}.`
      : "Catalog launch is blocked until the required manual auth is complete.";
  }
  const dispatchMessage = getCatalogDispatchStatusMessage(progress);
  if (dispatchMessage?.tone === "red") {
    return `Catalog launch is blocked. ${dispatchMessage.text}`;
  }
  return null;
};

const formatCookieHealthSourceLabel = (cookieHealth?: SocialProfileCookieHealth | null): string => {
  if (!cookieHealth) return "";
  if (cookieHealth.source_kind === "env_json") return " (env JSON)";
  if (cookieHealth.source_kind === "runtime_override") return " (runtime override)";
  if (cookieHealth.source_path) return ` (${cookieHealth.source_path.split("/").pop()})`;
  return "";
};

const formatCookieHealthWarningLabel = (cookieHealth?: SocialProfileCookieHealth | null): string => {
  if (cookieHealth?.warning_code === "env_json_source_refresh_writes_file") {
    return "Sync writes file";
  }
  return "Warning";
};

const INSTAGRAM_BACKFILL_BLOCKED_AUTH_MESSAGE =
  "Instagram backfill blocked before jobs were queued. Local cookies are present, but Modal posts auth was not accepted by Instagram. Complete manual auth first, then sync already validated cookies and rerun Backfill Posts.";

const isInstagramPostsAuthVerified = (cookieHealth?: SocialProfileCookieHealth | null): boolean => {
  const health = cookieHealth?.posts_auth_health ?? null;
  const probe = cookieHealth?.posts_auth_probe as JsonRecord | null | undefined;
  const probeStatus = String(probe?.status || probe?.result || "").trim().toLowerCase();
  return health?.ready === true || probe?.ready === true || probeStatus === "valid";
};

const getInstagramPostsAuthStatusCopy = (
  progress?: SocialAccountCatalogRunProgressSnapshot | null,
  cookieHealth?: SocialProfileCookieHealth | null,
): { tone: string; text: string } => {
  const postsAuthMode = normalizeComparable(progress?.instagram_posts_auth_mode || progress?.posts_auth_mode);
  if (postsAuthMode === "anonymous") {
    return { tone: "text-emerald-700", text: "Instagram posts anonymous mode" };
  }
  const operationalState = String(progress?.operational_state || "").trim().toLowerCase();
  const repairStatus = String(progress?.auth_repair_status || progress?.repair_status || "").trim().toLowerCase();
  const health = cookieHealth?.posts_auth_health ?? null;
  const probe = progress?.posts_auth_probe ?? cookieHealth?.posts_auth_probe ?? null;
  const probeStatus = String(probe?.status || probe?.result || "").trim().toLowerCase();
  const healthStatus = String(health?.status || "").trim().toLowerCase();
  const status = probeStatus || healthStatus;
  const healthReason = String(health?.reason || "").trim().toLowerCase();
  if (isInstagramPostsAuthVerified(cookieHealth)) {
    return { tone: "text-emerald-700", text: "Modal posts auth verified" };
  }
  if (status === "transport_blocked") {
    return { tone: "text-amber-700", text: "Instagram posts transport blocked" };
  }
  if (status === "fetch_blocked") {
    return { tone: "text-amber-700", text: "Instagram posts fetch blocked" };
  }
  if (
    operationalState === "blocked_auth" ||
    repairStatus === "failed" ||
    status === "auth_blocked" ||
    healthReason === "checkpoint_required" ||
    healthReason === "redirect_to_login" ||
    healthReason === "redirect_to_checkpoint"
  ) {
    if (healthReason === "probe_function_unavailable" || healthReason === "probe_invocation_failed") {
      return { tone: "text-amber-700", text: "Modal posts auth probe unavailable" };
    }
    return { tone: "text-red-600", text: "Instagram posts auth blocked" };
  }
  if (status === "valid" || health?.ready === true) {
    return { tone: "text-emerald-700", text: "Modal posts auth verified" };
  }
  if (repairStatus === "succeeded") {
    return { tone: "text-emerald-700", text: "Modal posts auth validated" };
  }
  return { tone: "text-zinc-500", text: "Modal posts auth not verified" };
};

const getInstagramCommentsAuthStatusCopy = (
  cookieHealth?: SocialProfileCookieHealth | null,
): { tone: string; text: string } => {
  const health = cookieHealth?.comments_auth_health ?? null;
  const probe = cookieHealth?.comments_auth_probe as JsonRecord | null | undefined;
  const probeStatus = String(probe?.status || probe?.result || "").trim().toLowerCase();
  const healthStatus = String(health?.status || "").trim().toLowerCase();
  const status = probeStatus || healthStatus;
  if (health?.ready === true || probe?.ready === true || status === "valid") {
    return { tone: "text-emerald-700", text: "Modal comments auth verified" };
  }
  if (status === "transport_blocked") {
    return { tone: "text-amber-700", text: "Instagram comments transport blocked" };
  }
  if (status === "fetch_blocked") {
    const reason = String(health?.reason || probe?.reason || "").trim();
    return {
      tone: "text-amber-700",
      text: reason
        ? `Instagram comments auth probe blocked: ${formatDiagnosticToken(reason)}`
        : "Instagram comments auth probe blocked",
    };
  }
  if (status === "auth_blocked") {
    const reason = String(health?.reason || probe?.reason || "").trim();
    const fallbackEnabled =
      health?.rendered_fallback_enabled === true ||
      health?.advisory_continue === true ||
      probe?.advisory_continue === true;
    if (fallbackEnabled && reason === "html_challenge_or_auth_required") {
      return {
        tone: "text-amber-700",
        text: "Instagram comments endpoint challenged; rendered fallback enabled",
      };
    }
    return {
      tone: "text-red-600",
      text: reason
        ? `Instagram comments auth blocked: ${formatDiagnosticToken(reason)}`
        : "Instagram comments auth blocked",
    };
  }
  return { tone: "text-zinc-500", text: "Modal comments endpoint not checked yet" };
};

const getInstagramCookiePayloadStatusCopy = (
  cookieHealth: SocialProfileCookieHealth | null | undefined,
  selectedTab: SocialAccountProfileTab,
): { tone: string; text: string } | null => {
  if (!cookieHealth?.cookie_fingerprint) return null;
  const authHealth =
    selectedTab === "comments" ? cookieHealth.comments_auth_health : cookieHealth.posts_auth_health;
  const probe =
    (selectedTab === "comments" ? cookieHealth.comments_auth_probe : cookieHealth.posts_auth_probe) as
      | JsonRecord
      | null
      | undefined;
  const remoteFingerprint = String(authHealth?.cookie_fingerprint || probe?.cookie_fingerprint || "").trim();
  const explicitMatch = authHealth?.cookie_fingerprint_match;
  const matches =
    typeof explicitMatch === "boolean"
      ? explicitMatch
      : remoteFingerprint
        ? remoteFingerprint === cookieHealth.cookie_fingerprint
        : null;
  if (matches === true) {
    return { tone: "text-emerald-700", text: "Modal uses same cookie payload" };
  }
  if (matches === false) {
    return { tone: "text-red-600", text: "Modal cookie payload differs from local file" };
  }
  return null;
};

const buildCommentsAuthCookieHealthProbeKey = (
  platform: string,
  handle: string,
  cookieHealth: SocialProfileCookieHealth,
): string => {
  const fingerprint = String(cookieHealth.cookie_fingerprint || "").trim();
  const sourcePath = String(cookieHealth.source_path || "").trim();
  return [platform, handle, fingerprint || "no-fingerprint", cookieHealth.source_kind || "", sourcePath].join(":");
};

const COOKIE_HEALTH_SESSION_CACHE_TTL_MS = 5 * 60 * 1000;

const buildCookieHealthSessionCacheKey = (platform: string, handle: string): string =>
  `trr-social-cookie-health:${platform.toLowerCase()}:${handle.toLowerCase()}`;

const hasCommentsAuthProbe = (cookieHealth: SocialProfileCookieHealth): boolean =>
  Boolean(cookieHealth.comments_auth_health || cookieHealth.comments_auth_probe);

const readCookieHealthSessionCache = (input: {
  platform: string;
  handle: string;
  needsCommentsAuth: boolean;
}): SocialProfileCookieHealth | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(buildCookieHealthSessionCacheKey(input.platform, input.handle));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      cached_at?: unknown;
      cookie_health?: unknown;
    };
    if (typeof parsed.cached_at !== "number") return null;
    if (Date.now() - parsed.cached_at > COOKIE_HEALTH_SESSION_CACHE_TTL_MS) return null;
    if (!parsed.cookie_health || typeof parsed.cookie_health !== "object") return null;
    const cookieHealth = parsed.cookie_health as SocialProfileCookieHealth;
    if (input.needsCommentsAuth && !hasCommentsAuthProbe(cookieHealth)) return null;
    return cookieHealth;
  } catch {
    return null;
  }
};

const writeCookieHealthSessionCache = (
  platform: string,
  handle: string,
  cookieHealth: SocialProfileCookieHealth,
): void => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      buildCookieHealthSessionCacheKey(platform, handle),
      JSON.stringify({
        cached_at: Date.now(),
        cookie_health: cookieHealth,
      }),
    );
  } catch {
    // A disabled or full sessionStorage should not block the live health check.
  }
};

const buildProvisionalCatalogRunProgress = (input: {
  runId: string;
  status?: string | null;
  launchGroupId?: string | null;
  launchState?: CatalogBackfillLaunchResponse["launch_state"];
  sourceScope?: string | null;
  dateStart?: string | null;
  dateEnd?: string | null;
  selectedTasks?: CatalogBackfillSelectedTask[];
  effectiveSelectedTasks?: CatalogBackfillSelectedTask[];
  catalogAction?: SocialAccountCatalogAction;
  catalogActionScope?: SocialAccountCatalogActionScope;
}): SocialAccountCatalogRunProgressSnapshot => ({
  run_id: input.runId,
  run_status: normalizeCatalogRunStatus(input.status) || "queued",
  launch_group_id: input.launchGroupId ?? null,
  launch_state: input.launchState ?? null,
  source_scope: String(input.sourceScope || "network").trim() || "network",
  catalog_action: input.catalogAction ?? "backfill",
  catalog_action_scope: input.catalogActionScope ?? "full_history",
  date_start: input.dateStart ?? null,
  date_end: input.dateEnd ?? null,
  selected_tasks: input.selectedTasks ?? [],
  effective_selected_tasks: input.effectiveSelectedTasks ?? input.selectedTasks ?? [],
  stages: {},
  per_handle: [],
  recent_log: [],
  summary: {
    total_jobs: 0,
    completed_jobs: 0,
    failed_jobs: 0,
    active_jobs: 0,
  },
});

export default function SocialAccountProfilePage({ platform, handle, activeTab }: Props) {
  const { user, checking, hasAccess } = useAdminGuard();
  const fetchAdminWithAuth = useCallback(
    (
      input: RequestInfo | URL,
      init?: RequestInit,
      options?: Parameters<typeof fetchAdminWithAuthBase>[2],
    ) =>
      fetchAdminWithAuthBase(input, init, {
        ...options,
        preferredUser: options?.preferredUser ?? user,
        allowDevAdminBypass: options?.allowDevAdminBypass ?? true,
      }),
    [user],
  );
  const [summary, setSummary] = useState<SocialAccountProfileSummary | null>(null);
  const [summaryUninitialized, setSummaryUninitialized] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summarySaturationActive, setSummarySaturationActive] = useState(false);
  const [dashboardFreshness, setDashboardFreshness] = useState<SocialAccountDashboardFreshness | null>(null);
  const [accountSwitcherOpen, setAccountSwitcherOpen] = useState(false);
  const [sharedAccountSources, setSharedAccountSources] = useState<SharedAccountSource[]>([]);
  const [sharedAccountSourcesLoading, setSharedAccountSourcesLoading] = useState(false);
  const [sharedAccountSourcesError, setSharedAccountSourcesError] = useState<string | null>(null);

  const [posts, setPosts] = useState<PostsResponse | null>(null);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [postSearchExpanded, setPostSearchExpanded] = useState(false);
  const [postSearchQuery, setPostSearchQuery] = useState("");
  const postSearchInputRef = useRef<HTMLInputElement | null>(null);
  const [postSearchResults, setPostSearchResults] = useState<PostsResponse | null>(null);
  const [postSearchLoading, setPostSearchLoading] = useState(false);
  const [postSearchError, setPostSearchError] = useState<string | null>(null);
  const [catalogPosts, setCatalogPosts] = useState<CatalogPostsResponse | null>(null);
  const [catalogPostsLoading, setCatalogPostsLoading] = useState(false);
  const [catalogPostsError, setCatalogPostsError] = useState<string | null>(null);
  const [catalogDetailSourceId, setCatalogDetailSourceId] = useState<string | null>(null);
  const [catalogDetail, setCatalogDetail] = useState<SocialAccountCatalogPostDetail | null>(null);
  const [catalogDetailLoading, setCatalogDetailLoading] = useState(false);
  const [catalogDetailError, setCatalogDetailError] = useState<string | null>(null);
  const [catalogCardPreview, setCatalogCardPreview] = useState<{
    total: number;
    latestPostedAt: string | null;
  } | null>(null);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogFilter, setCatalogFilter] = useState<"all" | "assigned" | "unassigned" | "ambiguous" | "needs_review">("all");
  const [instagramBackfillDialogOpen, setInstagramBackfillDialogOpen] = useState(false);
  const [instagramBackfillSelectedTasks, setInstagramBackfillSelectedTasks] = useState<CatalogBackfillSelectedTask[]>([
    ...INSTAGRAM_BACKFILL_DEFAULT_SELECTED_TASKS,
  ]);
  const [instagramBackfillDetailWorkerCount, setInstagramBackfillDetailWorkerCount] = useState(
    INSTAGRAM_BACKFILL_DEFAULT_DETAIL_WORKER_COUNT,
  );
  const [instagramBackfillCommentsWorkerCount, setInstagramBackfillCommentsWorkerCount] = useState(
    INSTAGRAM_BACKFILL_DEFAULT_COMMENTS_WORKER_COUNT,
  );
  const [instagramBackfillCommentMediaFollowups, setInstagramBackfillCommentMediaFollowups] = useState(false);
  const [instagramBackfillDateStart, setInstagramBackfillDateStart] = useState(
    () => buildInstagramBackfillDateDefaults().dateStart,
  );
  const [instagramBackfillDateEnd, setInstagramBackfillDateEnd] = useState(
    () => buildInstagramBackfillDateDefaults().dateEnd,
  );
  const [catalogActionMessage, setCatalogActionMessage] = useState<string | null>(null);
  const [runningCatalogAction, setRunningCatalogAction] = useState<
    | "backfill"
    | "clear_stuck_jobs"
    | "fill_missing_posts"
    | "repair_auth"
    | "sync_recent"
    | "sync_newer"
    | "remediate_drift"
    | null
  >(null);
  const [reviewQueue, setReviewQueue] = useState<SocialAccountCatalogReviewItem[]>([]);
  const [reviewQueueLoading, setReviewQueueLoading] = useState(false);
  const [reviewQueueError, setReviewQueueError] = useState<string | null>(null);
  const [pendingReviewOpen, setPendingReviewOpen] = useState(false);
  const [resolvingReviewItemId, setResolvingReviewItemId] = useState<string | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, ReviewResolutionDraft>>({});

  const [hashtags, setHashtags] = useState<SocialAccountProfileHashtag[]>([]);
  const [hashtagsLoading, setHashtagsLoading] = useState(false);
  const [hashtagsError, setHashtagsError] = useState<SocialAccountRequestError | null>(null);
  const [hashtagsLoadedRequestKey, setHashtagsLoadedRequestKey] = useState<string | null>(null);
  const [hashtagWindow, setHashtagWindow] = useState<(typeof HASHTAG_WINDOW_OPTIONS)[number]["value"]>("all");
  const [savingHashtag, setSavingHashtag] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [draftAssignments, setDraftAssignments] = useState<Record<string, SocialAccountProfileHashtagAssignment[]>>({});
  const [hashtagTimeline, setHashtagTimeline] = useState<SocialAccountProfileHashtagTimeline | null>(null);
  const [hashtagTimelineLoading, setHashtagTimelineLoading] = useState(false);
  const [hashtagTimelineError, setHashtagTimelineError] = useState<string | null>(null);
  const [catalogFreshness, setCatalogFreshness] = useState<SocialAccountCatalogFreshness | null>(null);
  const [catalogFreshnessLoading, setCatalogFreshnessLoading] = useState(false);
  const [catalogFreshnessError, setCatalogFreshnessError] = useState<SocialAccountRequestError | null>(null);
  const [catalogFreshnessRequestNonce, setCatalogFreshnessRequestNonce] = useState(0);
  const [catalogGapAnalysis, setCatalogGapAnalysis] = useState<SocialAccountCatalogGapAnalysis | null>(null);
  const [catalogGapAnalysisStatus, setCatalogGapAnalysisStatus] = useState<SocialAccountCatalogGapAnalysisStatus>("idle");
  const [catalogGapAnalysisOperationId, setCatalogGapAnalysisOperationId] = useState<string | null>(null);
  const [catalogGapAnalysisStale, setCatalogGapAnalysisStale] = useState(false);
  const [catalogGapAnalysisLoading, setCatalogGapAnalysisLoading] = useState(false);
  const [catalogGapAnalysisError, setCatalogGapAnalysisError] = useState<SocialAccountRequestError | null>(null);
  const [catalogGapAnalysisRequestNonce, setCatalogGapAnalysisRequestNonce] = useState(0);

  const [collaboratorsTags, setCollaboratorsTags] = useState<CollaboratorsTagsResponse | null>(null);
  const [collaboratorsLoading, setCollaboratorsLoading] = useState(false);
  const [collaboratorsError, setCollaboratorsError] = useState<string | null>(null);
  const [catalogProgressRunId, setCatalogProgressRunId] = useState<string | null>(null);
  const [commentsProgressRunId, setCommentsProgressRunId] = useState<string | null>(null);
  const [instagramCommentsCoverageMetrics, setInstagramCommentsCoverageMetrics] = useState<{
    availablePosts: number;
    commentablePosts: number;
    incompletePosts: number | null;
  } | null>(null);
  const [catalogProgressRequestNonce, setCatalogProgressRequestNonce] = useState(0);
  const [catalogRunProgress, setCatalogRunProgress] = useState<SocialAccountCatalogRunProgressSnapshot | null>(null);
  const [catalogRunProgressError, setCatalogRunProgressError] = useState<string | null>(null);
  const [catalogRunProgressLoading, setCatalogRunProgressLoading] = useState(false);
  const [catalogProgressSaturationActive, setCatalogProgressSaturationActive] = useState(false);
  const [cancellingCatalogRun, setCancellingCatalogRun] = useState(false);
  const [cancellingActiveCommentsRun, setCancellingActiveCommentsRun] = useState(false);
  const [resumingActiveCommentsRun, setResumingActiveCommentsRun] = useState(false);
  const [cancellingCommentsJobId, setCancellingCommentsJobId] = useState<string | null>(null);
  const [dismissingCatalogRunId, setDismissingCatalogRunId] = useState<string | null>(null);
  const [pendingDismissedCatalogRunIds, setPendingDismissedCatalogRunIds] = useState<Set<string>>(new Set());
  const [catalogProgressLastSuccessAt, setCatalogProgressLastSuccessAt] = useState<string | null>(null);
  const [catalogLogsExpanded, setCatalogLogsExpanded] = useState(false);
  const [catalogAdvancedDetailsOpen, setCatalogAdvancedDetailsOpen] = useState(false);
  const mountedAtMsRef = useRef(Date.now());
  const catalogTerminalSummaryRefreshRunIdRef = useRef<string | null>(null);
  const catalogTerminalProgressHydrationAttemptedRunIdRef = useRef<string | null>(null);
  const catalogRuntimePivotRef = useRef<string | null>(null);
  const catalogFreshnessProbeKeyRef = useRef<string | null>(null);
  const hashtagResponseCacheRef = useRef<
    Map<
      string,
      {
        items: SocialAccountProfileHashtag[];
        draftAssignments: Record<string, SocialAccountProfileHashtagAssignment[]>;
      }
    >
  >(new Map());
  // Cookie preflight state
  const COOKIE_REQUIRED_PLATFORMS: ReadonlyArray<SocialPlatformSlug> = [
    "instagram",
    "tiktok",
    "twitter",
    "facebook",
  ];
  const platformRequiresCookies = COOKIE_REQUIRED_PLATFORMS.includes(platform);
  const [cookieHealth, setCookieHealth] = useState<SocialProfileCookieHealth | null>(null);
  const [cookieHealthLoading, setCookieHealthLoading] = useState(false);
  const [cookieHealthError, setCookieHealthError] = useState<string | null>(null);
  const [cookieRefreshing, setCookieRefreshing] = useState(false);
  const [cookieRefreshMessage, setCookieRefreshMessage] = useState<string | null>(null);
  const [cookieRefreshConfirmationPending, setCookieRefreshConfirmationPending] = useState(false);
  const [catalogRepairAuthConfirmationRunId, setCatalogRepairAuthConfirmationRunId] = useState<string | null>(null);
  const [secondaryReadsGateOpen, setSecondaryReadsGateOpen] = useState(false);
  const [secondaryReadBudgetSlot, setSecondaryReadBudgetSlot] = useState(0);
  const [secondaryReadsPressurePause, setSecondaryReadsPressurePause] = useState<{
    reason: string;
    code?: string | null;
  } | null>(null);
  const pendingCatalogActionAfterCookieRepairRef = useRef<PendingCatalogAction | null>(null);
  const liveProfileTotalProbeKeyRef = useRef<string | null>(null);
  const commentsAuthCookieHealthProbeKeyRef = useRef<string | null>(null);

  const supportsCatalog = SOCIAL_ACCOUNT_CATALOG_ENABLED_PLATFORMS.includes(platform);
  const supportsCatalogDetail = SOCIAL_ACCOUNT_CATALOG_DETAIL_ENABLED_PLATFORMS.includes(platform);
  const supportsComments = SOCIAL_ACCOUNT_COMMENTS_ENABLED_PLATFORMS.includes(platform);
  const supportsSocialBlade = SOCIAL_ACCOUNT_SOCIALBLADE_ENABLED_PLATFORMS.includes(platform);
  const selectedTab: SocialAccountProfileTab = supportsCatalog && activeTab === "posts" ? "catalog" : activeTab;
  const catalogProgressStorageKey = useMemo(
    () => buildCatalogProgressRunStorageKey(platform, handle),
    [handle, platform],
  );
  const commentsProgressStorageKey = useMemo(
    () => buildCommentsProgressRunStorageKey(platform, handle),
    [handle, platform],
  );
  const catalogAdvancedDetailsStorageKey = useMemo(
    () => buildCatalogAdvancedDetailsStorageKey(platform, handle),
    [handle, platform],
  );
  const shouldShowCatalogRunProgressCard = selectedTab !== "comments";
  const hasSummary = summary !== null;
  const postsSortMetadata = posts?.sort_metadata ?? null;
  const summaryInitialStatePending = !hasSummary && !summaryError && !summaryUninitialized;
  const summarySourceMetadata = useMemo(
    () => resolveSummarySourceMetadata(summary, platform, handle),
    [handle, platform, summary],
  );
  const summaryAvatarUrl = useMemo(
    () => resolveSummaryAvatarUrl(summary, platform, handle),
    [handle, platform, summary],
  );
  const currentSourceOption = useMemo<SharedAccountSource>(
    () => ({
      platform,
      account_handle: handle,
      is_active: true,
      metadata: summarySourceMetadata,
      display_name: readString(summary?.display_name) || readString(summarySourceMetadata?.display_name) || handle,
      network_name: readString(summary?.network_name) || readString(summarySourceMetadata?.network_name),
      profile_kind: readString(summarySourceMetadata?.profile_kind),
    }),
    [handle, platform, summary?.display_name, summary?.network_name, summarySourceMetadata],
  );
  const accountSwitcherSources = useMemo(() => {
    const normalizedCurrentPlatform = normalizeComparable(platform);
    const normalizedCurrentHandle = normalizeComparable(handle);
    const showId = readString(summarySourceMetadata?.assigned_show_id);
    const networkName = normalizeComparable(
      readString(summary?.network_name) || readString(summarySourceMetadata?.network_name),
    );
    const matches = sharedAccountSources.filter((source) => {
      const sourcePlatform = normalizeComparable(readString(source.platform));
      const sourceHandle = normalizeComparable(readString(source.account_handle));
      if (!sourcePlatform || !sourceHandle) return false;
      if (sourcePlatform === normalizedCurrentPlatform && sourceHandle === normalizedCurrentHandle) return true;
      const sourceShowId = socialSourceMetadataValue(source, "assigned_show_id");
      if (showId && sourceShowId === showId) return true;
      const sourceNetworkName = normalizeComparable(readString(source.network_name) || socialSourceMetadataValue(source, "network_name"));
      const sourceKind = normalizeComparable(readString(source.profile_kind) || socialSourceMetadataValue(source, "profile_kind"));
      return Boolean(networkName && sourceNetworkName === networkName && sourceKind === "show_official");
    });
    const seen = new Set<string>();
    return [currentSourceOption, ...matches].filter((source) => {
      const sourcePlatform = normalizeComparable(readString(source.platform));
      const sourceHandle = normalizeComparable(readString(source.account_handle));
      const key = `${sourcePlatform}:${sourceHandle}`;
      if (!sourcePlatform || !sourceHandle || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [currentSourceOption, handle, platform, sharedAccountSources, summary?.network_name, summarySourceMetadata]);
  const loadSharedAccountSources = useCallback(async () => {
    if (sharedAccountSourcesLoading || sharedAccountSources.length > 0) return;
    setSharedAccountSourcesLoading(true);
    setSharedAccountSourcesError(null);
    try {
      const response = await fetchAdminWithAuth(
        "/api/admin/trr-api/social/shared/sources?source_scope=network&include_inactive=false",
        undefined,
        { preferredUser: user },
      );
      const payload = (await response.json().catch(() => ({}))) as SharedAccountSourcesResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load social account sources");
      }
      setSharedAccountSources(payload.sources ?? []);
    } catch (error) {
      setSharedAccountSourcesError(error instanceof Error ? error.message : "Failed to load social account sources");
    } finally {
      setSharedAccountSourcesLoading(false);
    }
  }, [fetchAdminWithAuth, sharedAccountSources.length, sharedAccountSourcesLoading, user]);
  const hashtagsRequestKey = `hashtags:${platform}:${handle}:${hashtagWindow}`;
  const hashtagTimelineRequestKey = `hashtags-timeline:${platform}:${handle}:${hashtagWindow}`;
  const collaboratorsRequestKey = `collaborators-tags:${platform}:${handle}`;
  const selectedTabPrimaryReadActive =
    (selectedTab === "posts" && postsLoading) ||
    (selectedTab === "catalog" && catalogPostsLoading) ||
    (selectedTab === "hashtags" && (hashtagsLoading || hashtagTimelineLoading)) ||
    (selectedTab === "collaborators-tags" && collaboratorsLoading);
  const selectedTabPrimaryReadPending =
    hasSummary &&
    !summaryUninitialized &&
    (
      (selectedTab === "posts" && !posts && !postsError) ||
      (selectedTab === "catalog" && supportsCatalog && !catalogPosts && !catalogPostsError) ||
      (selectedTab === "hashtags" &&
        (
          hashtagsLoadedRequestKey !== hashtagsRequestKey ||
          (platform === "instagram" && !hashtagTimeline && !hashtagTimelineError)
        )) ||
      (selectedTab === "collaborators-tags" && !collaboratorsTags && !collaboratorsError)
    );
  const shouldPauseSecondaryReads =
    !secondaryReadsGateOpen ||
    secondaryReadBudgetSlot <= 0 ||
    Boolean(secondaryReadsPressurePause) ||
    summarySaturationActive ||
    catalogProgressSaturationActive;
  const shouldDeferSecondaryCatalogReads =
    !hasSummary || summaryLoading || selectedTabPrimaryReadActive || selectedTabPrimaryReadPending || shouldPauseSecondaryReads;
  const shouldDeferManualCatalogDiagnostics =
    !hasSummary ||
    summaryLoading ||
    summarySaturationActive ||
    catalogProgressSaturationActive;
  const pauseSecondaryReadsForPressure = useCallback((error: unknown, fallbackReason: string) => {
    const requestError = toSocialAccountRequestError(error, fallbackReason);
    if (!isBackendPressureError(requestError)) return false;
    setSecondaryReadsPressurePause({
      reason: requestError.message || fallbackReason,
      code: requestError.code ?? null,
    });
    return true;
  }, []);
  const visibleCatalogRecentRuns = useMemo(() => {
    const runs = summary?.catalog_recent_runs ?? [];
    if (pendingDismissedCatalogRunIds.size === 0) {
      return runs;
    }
    return runs.filter((run) => !pendingDismissedCatalogRunIds.has(String(run.run_id || "").trim()));
  }, [pendingDismissedCatalogRunIds, summary?.catalog_recent_runs]);
  const activeCatalogRun = useMemo<SocialAccountCatalogRun | null>(() => {
    const runs = visibleCatalogRecentRuns;
    return runs.find((run) => ACTIVE_CATALOG_RUN_STATUSES.has(String(run.status || "").trim().toLowerCase())) ?? null;
  }, [visibleCatalogRecentRuns]);
  const latestCatalogRun = useMemo<SocialAccountCatalogRun | null>(() => {
    const runs = visibleCatalogRecentRuns;
    const normalize = (s: string | undefined | null) => String(s || "").trim().toLowerCase();
    const nonTerminal = runs.find((r) => !TERMINAL_CATALOG_RUN_STATUSES.has(normalize(r.status)));
    if (nonTerminal) return nonTerminal;
    return runs[0] ?? null;
  }, [visibleCatalogRecentRuns]);
  const latestCatalogRunStatus = useMemo(() => normalizeCatalogRunStatus(latestCatalogRun?.status), [latestCatalogRun?.status]);
  const activeCatalogRunStatusNormalized = useMemo(
    () => normalizeCatalogRunStatus(activeCatalogRun?.status),
    [activeCatalogRun?.status],
  );
  const selectedCatalogRunId = useMemo(() => {
    const normalized = String(catalogProgressRunId || "").trim();
    return normalized || null;
  }, [catalogProgressRunId]);
  const latestCatalogRunId = useMemo(() => {
    const normalized = String(latestCatalogRun?.run_id || "").trim();
    return normalized || null;
  }, [latestCatalogRun?.run_id]);
  const activeCatalogRunId = useMemo(() => {
    return activeCatalogRun?.run_id?.trim() || null;
  }, [activeCatalogRun?.run_id]);
  const displayedCatalogRunSummary = useMemo<SocialAccountCatalogRun | null>(() => {
    const runs = visibleCatalogRecentRuns;
    if (selectedCatalogRunId) {
      return runs.find((run) => run.run_id === selectedCatalogRunId) ?? null;
    }
    if (activeCatalogRunId) {
      return runs.find((run) => run.run_id === activeCatalogRunId) ?? null;
    }
    if (latestCatalogRunId) {
      return runs.find((run) => run.run_id === latestCatalogRunId) ?? null;
    }
    return null;
  }, [
    activeCatalogRunId,
    latestCatalogRunId,
    selectedCatalogRunId,
    visibleCatalogRecentRuns,
  ]);
  const displayedCatalogRunId = useMemo(() => {
    return (
      selectedCatalogRunId ||
      activeCatalogRunId ||
      latestCatalogRunId ||
      null
    );
  }, [activeCatalogRunId, latestCatalogRunId, selectedCatalogRunId]);
  const backgroundCatalogRunId = useMemo(() => {
    return selectedCatalogRunId || activeCatalogRunId || null;
  }, [activeCatalogRunId, selectedCatalogRunId]);
  const visibleTabs = useMemo(
    () =>
      (Object.keys(SOCIAL_ACCOUNT_PROFILE_TAB_LABELS) as SocialAccountProfileTab[]).filter(
        (tab) =>
          (tab !== "socialblade" || supportsSocialBlade) &&
          (tab !== "comments" || supportsComments) &&
          (tab !== "posts" || !supportsCatalog),
      ),
    [supportsCatalog, supportsComments, supportsSocialBlade],
  );
  const shouldRenderCommentsPanel =
    selectedTab === "comments" &&
    supportsComments &&
    !summaryUninitialized &&
    (hasSummary || summaryLoading || Boolean(summaryError));
  const isLocalDevHost = useMemo(() => {
    return typeof window !== "undefined" && isLocalDevHostname(window.location.hostname);
  }, []);

  useEffect(() => {
    setSecondaryReadsGateOpen(false);
    setSecondaryReadBudgetSlot(0);
    setSecondaryReadsPressurePause(null);
  }, [handle, platform, selectedTab]);

  useEffect(() => {
    if (secondaryReadsGateOpen) return;
    if (checking || !user || !hasAccess || summaryLoading) return;
    if (!hasSummary && !summaryError && !summaryUninitialized) return;
    if (selectedTabPrimaryReadActive || selectedTabPrimaryReadPending) return;
    const timeoutId = window.setTimeout(() => {
      setSecondaryReadsGateOpen(true);
      setSecondaryReadBudgetSlot(1);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [
    checking,
    hasAccess,
    hasSummary,
    secondaryReadsGateOpen,
    selectedTabPrimaryReadActive,
    selectedTabPrimaryReadPending,
    summaryError,
    summaryLoading,
    summaryUninitialized,
    user,
  ]);

  useEffect(() => {
    if (!secondaryReadsGateOpen || secondaryReadsPressurePause) return;
    const cookieTimer = window.setTimeout(() => setSecondaryReadBudgetSlot((slot) => Math.max(slot, 2)), 25);
    const remainingTimer = window.setTimeout(() => setSecondaryReadBudgetSlot((slot) => Math.max(slot, 3)), 50);
    return () => {
      window.clearTimeout(cookieTimer);
      window.clearTimeout(remainingTimer);
    };
  }, [secondaryReadsGateOpen, secondaryReadsPressurePause]);

  useEffect(() => {
    setPage(1);
    setCatalogPage(1);
    setSummary(null);
    setSummaryUninitialized(false);
    setSummaryLoading(false);
    setSummaryError(null);
    setDashboardFreshness(null);
    setSummarySaturationActive(false);
    setPosts(null);
    setPostsLoading(false);
    setPostsError(null);
    setCatalogPosts(null);
    setCatalogPostsLoading(false);
    setCatalogPostsError(null);
    setCatalogCardPreview(null);
    setReviewQueue([]);
    setReviewQueueLoading(false);
    setReviewQueueError(null);
    setReviewDrafts({});
    setHashtags([]);
    setHashtagsLoading(false);
    setHashtagsError(null);
    setHashtagsLoadedRequestKey(null);
    setDraftAssignments({});
    hashtagResponseCacheRef.current.clear();
    setCatalogProgressRunId(null);
    setCommentsProgressRunId(null);
    setInstagramCommentsCoverageMetrics(null);
    setCatalogProgressRequestNonce(0);
    setCatalogRunProgress(null);
    setCatalogRunProgressError(null);
    setCatalogRunProgressLoading(false);
    setCatalogProgressSaturationActive(false);
    setCatalogProgressLastSuccessAt(null);
    setCatalogLogsExpanded(false);
    catalogTerminalSummaryRefreshRunIdRef.current = null;
    catalogTerminalProgressHydrationAttemptedRunIdRef.current = null;
    catalogFreshnessProbeKeyRef.current = null;
    setHashtagTimeline(null);
    setHashtagTimelineError(null);
    setHashtagTimelineLoading(false);
    setHashtagWindow("all");
    setCatalogFreshness(null);
    setCatalogFreshnessLoading(false);
    setCatalogFreshnessError(null);
    setCatalogFreshnessRequestNonce(0);
    setCatalogGapAnalysis(null);
    setCatalogGapAnalysisStatus("idle");
    setCatalogGapAnalysisOperationId(null);
    setCatalogGapAnalysisStale(false);
    setCatalogGapAnalysisLoading(false);
    setCatalogGapAnalysisError(null);
    setCatalogGapAnalysisRequestNonce(0);
    setCookieHealth(null);
    setCookieHealthLoading(false);
    setCookieHealthError(null);
    setCookieRefreshing(false);
    setCookieRefreshMessage(null);
    setCookieRefreshConfirmationPending(false);
    setCatalogRepairAuthConfirmationRunId(null);
    setSecondaryReadsGateOpen(false);
    setSecondaryReadsPressurePause(null);
    commentsAuthCookieHealthProbeKeyRef.current = null;
    setCollaboratorsTags(null);
    setCollaboratorsLoading(false);
    setCollaboratorsError(null);
    setPostSearchExpanded(false);
    setPostSearchQuery("");
    setPostSearchResults(null);
    setPostSearchLoading(false);
    setPostSearchError(null);
    liveProfileTotalProbeKeyRef.current = null;
  }, [platform, handle]);

  useEffect(() => {
    if (!supportsCatalog) return;
    const storedRunId = readStoredCatalogProgressRunId(catalogProgressStorageKey);
    if (!storedRunId) return;
    setCatalogProgressRunId((current) => String(current || "").trim() || storedRunId);
    setCatalogRunProgressLoading(true);
  }, [catalogProgressStorageKey, supportsCatalog]);

  useEffect(() => {
    if (platform !== "instagram") return;
    const storedRunId = readStoredCatalogProgressRunId(commentsProgressStorageKey);
    if (!storedRunId) return;
    setCommentsProgressRunId((current) => String(current || "").trim() || storedRunId);
  }, [commentsProgressStorageKey, platform]);

  useEffect(() => {
    const storedOpen = readStoredDisclosureOpen(catalogAdvancedDetailsStorageKey);
    setCatalogAdvancedDetailsOpen(storedOpen ?? false);
  }, [catalogAdvancedDetailsStorageKey]);

  const handleCatalogAdvancedDetailsToggle = useCallback(
    (event: SyntheticEvent<HTMLDetailsElement>) => {
      const nextOpen = event.currentTarget.open;
      setCatalogAdvancedDetailsOpen(nextOpen);
      storeDisclosureOpen(catalogAdvancedDetailsStorageKey, nextOpen);
    },
    [catalogAdvancedDetailsStorageKey],
  );

  useEffect(() => {
    if (!supportsCatalog || !selectedCatalogRunId || summaryInitialStatePending || summaryLoading) return;
    const matchingRun = visibleCatalogRecentRuns.find((run) => run.run_id === selectedCatalogRunId) ?? null;
    const matchingStatus = normalizeCatalogRunStatus(matchingRun?.status);
    const progressStatus =
      catalogRunProgress?.run_id === selectedCatalogRunId ? normalizeCatalogRunStatus(catalogRunProgress.run_status) : "";
    const selectedRunIsActive =
      ACTIVE_CATALOG_RUN_STATUSES.has(matchingStatus || "") ||
      ACTIVE_CATALOG_RUN_STATUSES.has(progressStatus || "");
    if (selectedRunIsActive) return;
    const selectedRunIsStale = !matchingRun && !progressStatus;
    if (!selectedRunIsStale) return;

    storeCatalogProgressRunId(catalogProgressStorageKey, null);
    setCatalogProgressRunId((current) => (current === selectedCatalogRunId ? null : current));
    setCatalogRunProgress((current) => (current?.run_id === selectedCatalogRunId ? null : current));
    setCatalogRunProgressLoading(false);
  }, [
    catalogProgressStorageKey,
    catalogRunProgress?.run_id,
    catalogRunProgress?.run_status,
    selectedCatalogRunId,
    summaryInitialStatePending,
    summaryLoading,
    supportsCatalog,
    visibleCatalogRecentRuns,
  ]);

  useEffect(() => {
    if (!supportsCatalog) return;
    const runId = String(catalogProgressRunId || backgroundCatalogRunId || "").trim();
    if (runId) {
      storeCatalogProgressRunId(catalogProgressStorageKey, runId);
    }
  }, [backgroundCatalogRunId, catalogProgressRunId, catalogProgressStorageKey, supportsCatalog]);

  useEffect(() => {
    if (platform !== "instagram") return;
    const runId = String(commentsProgressRunId || "").trim();
    if (runId) {
      storeCatalogProgressRunId(commentsProgressStorageKey, runId);
    }
  }, [commentsProgressRunId, commentsProgressStorageKey, platform]);

  useEffect(() => {
    setCatalogPage(1);
  }, [catalogFilter]);

  useEffect(() => {
    if (!postSearchExpanded) return;
    postSearchInputRef.current?.focus();
  }, [postSearchExpanded]);

  const refreshSummary = useCallback(async (options?: { detail?: SummaryFetchDetail }) => {
    if (!user) return;
    const detail = options?.detail ?? "lite";
    const summaryRequestKey = `summary:${platform}:${handle}:${detail}`;
    const query = new URLSearchParams({ detail });
    const result = await withSocialProfileRequestDedup(summaryRequestKey, async (): Promise<SummaryLoadResult> => {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/summary?${query.toString()}`,
        undefined,
        { preferredUser: user },
      );
      const payload = (await response.json().catch(() => ({}))) as SummaryResponse;
      if (!response.ok) {
        if (response.status === 404) {
          setSummarySaturationActive(false);
          return {
            data: buildEmptySocialAccountProfileSummary(platform, handle),
            uninitialized: true,
          };
        }
        const requestError = buildSocialAccountRequestError(payload, "Failed to load social account profile summary");
        setSummarySaturationActive(Boolean(requestError.isBackendSaturated));
        throw requestError;
      }
      setSummarySaturationActive(false);
      return {
        data: payload,
        uninitialized: false,
      };
    });
    setSummary((current) => {
      const nextSummary =
        detail === "distribution" && current
          ? {
              ...current,
              ...result.data,
              summary_detail: result.data.summary_detail ?? "distribution",
            }
          : result.data;
      return mergeProfileSummaryPreservingLiveTotal(nextSummary, current);
    });
    setSummaryUninitialized(result.uninitialized);
    setSummaryError(null);
    return result;
  }, [fetchAdminWithAuth, handle, platform, user]);

  const refreshCommentsSummary = useCallback(async () => {
    await refreshSummary({ detail: "lite" });
  }, [refreshSummary]);

  const fetchCatalogRunProgressSnapshot = useCallback(
    async (runId: string, options?: { signal?: AbortSignal; recentLogLimit?: number; fast?: boolean }) => {
      return fetchSocialAccountCatalogRunProgressSnapshot({
        fetchAdminWithAuth,
        platform,
        handle,
        runId,
        preferredUser: user,
        signal: options?.signal,
        recentLogLimit: options?.recentLogLimit,
        fast: options?.fast,
      });
    },
    [fetchAdminWithAuth, handle, platform, user],
  );

  const fetchProfileSnapshot = useCallback(
    async (
      options?: { signal?: AbortSignal; forceRefresh?: boolean; runId?: string | null; detail?: SummaryFetchDetail },
    ): Promise<{ payload: SocialAccountProfileSnapshot; cacheStatus: string }> => {
      if (!user) {
        throw new Error("Missing admin user");
      }
      const params = new URLSearchParams();
      params.set("detail", options?.detail ?? "lite");
      const runId = options && "runId" in options ? options.runId : null;
      if (runId) {
        params.set("run_id", runId);
      }
      if (options?.forceRefresh) {
        params.set("refresh", "1");
      }
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/snapshot${
          params.size > 0 ? `?${params.toString()}` : ""
        }`,
        {
          cache: "no-store",
          signal: options?.signal,
        },
        { preferredUser: user },
      );
      const envelope = (await response.json().catch(() => ({}))) as
        | SocialAccountProfileSnapshot
        | ({
            data?: SocialAccountProfileSnapshot;
            generated_at?: string | null;
            cache_age_ms?: number;
            stale?: boolean;
          } & ProxyErrorPayload);
      if (!response.ok) {
        if (response.status === 404) {
          return {
            payload: {
              summary: buildEmptySocialAccountProfileSummary(platform, handle),
              catalog_run_progress: null,
              dashboard_freshness: {
                status: "missing",
                source: "live",
                generated_at: null,
                age_seconds: null,
              } satisfies SocialAccountDashboardFreshness,
            },
            cacheStatus: response.headers.get("x-trr-cache") ?? "miss",
          };
        }
        throw buildSocialAccountRequestError(
          toProxyErrorPayload(envelope),
          "Failed to load social account profile snapshot",
        );
      }
      const payload =
        envelope && typeof envelope === "object" && "data" in envelope && envelope.data
          ? {
              ...envelope.data,
              generated_at: envelope.generated_at ?? envelope.data.generated_at,
              cache_age_ms:
                typeof envelope.cache_age_ms === "number"
                  ? envelope.cache_age_ms
                  : envelope.data.cache_age_ms,
              stale: typeof envelope.stale === "boolean" ? envelope.stale : envelope.data.stale,
            }
          : (envelope as SocialAccountProfileSnapshot);
      return {
        payload,
        cacheStatus: response.headers.get("x-trr-cache") ?? "miss",
      };
    },
    [fetchAdminWithAuth, handle, platform, user],
  );

  const invalidateProfileSnapshotFamily = useCallback(async () => {
    try {
      await invalidateAdminSnapshotFamilies([
        {
          pageFamily: "social-profile",
          scope: `${platform}:${handle}`,
        },
      ]);
    } catch {
      // Best-effort only.
    }
  }, [handle, platform]);

  const applyProfileSnapshotSummary = useCallback(
    (payload: SocialAccountProfileSnapshot): "summary" | "progress-only" | "missing" | "ignored" => {
      if (payload.summary) {
        setSummary((current) => mergeProfileSummaryPreservingLiveTotal(payload.summary!, current));
        setSummaryUninitialized(payload.dashboard_freshness?.status === "missing");
        setSummaryError(null);
        return "summary";
      }

      if (payload.catalog_run_progress || payload.summary_omitted_reason === "progress_only") {
        setSummaryUninitialized(false);
        return "progress-only";
      }

      setSummary(buildEmptySocialAccountProfileSummary(platform, handle));
      setSummaryUninitialized(true);
      return "missing";
    },
    [handle, platform],
  );

  const refreshProfileSnapshotNow = useCallback(
    async (options?: { runId?: string | null }) => {
      await invalidateProfileSnapshotFamily();
      const snapshot = await fetchProfileSnapshot({
        forceRefresh: true,
        runId: options?.runId,
        detail: "lite",
      });
      applyProfileSnapshotSummary(snapshot.payload);
      if (snapshot.payload.catalog_run_progress) {
        setCatalogProgressSaturationActive(false);
        setCatalogRunProgress(snapshot.payload.catalog_run_progress);
        setCatalogRunProgressError(null);
        setCatalogProgressLastSuccessAt(snapshot.payload.generated_at ?? new Date().toISOString());
        setCatalogRunProgressLoading(false);
      }
      return snapshot;
    },
    [applyProfileSnapshotSummary, fetchProfileSnapshot, invalidateProfileSnapshotFamily],
  );

  const applyCancelledCatalogRunLocally = useCallback(
    (runId: string, cancelledAt?: string | null) => {
      const normalizedRunId = String(runId || "").trim();
      if (!normalizedRunId) return;
      const effectiveCancelledAt = String(cancelledAt || "").trim() || new Date().toISOString();
      setCatalogActionMessage(`Cancelled run ${shortRunId(normalizedRunId)}.`);
      storeCatalogProgressRunId(catalogProgressStorageKey, null);
      setCatalogProgressRunId((current) => (current === normalizedRunId ? null : current));
      setCatalogRunProgress((current) => {
        if (!current || current.run_id !== normalizedRunId) return current;
        return {
          ...current,
          run_status: "cancelled",
          completed_at: current.completed_at || effectiveCancelledAt,
          updated_at: effectiveCancelledAt,
        };
      });
      setCatalogRunProgressError(null);
      setCatalogProgressLastSuccessAt(effectiveCancelledAt);
      setSummary((current) => {
        if (!current) return current;
        const nextRuns = (current.catalog_recent_runs ?? []).map((run) =>
          run.run_id === normalizedRunId
            ? { ...run, status: "cancelled", completed_at: run.completed_at || effectiveCancelledAt }
            : run,
        );
        const nextLastCatalogRunStatus =
          nextRuns[0]?.run_id === normalizedRunId ? "cancelled" : current.last_catalog_run_status;
        return {
          ...current,
          catalog_recent_runs: nextRuns,
          last_catalog_run_status: nextLastCatalogRunStatus,
        };
      });
    },
    [catalogProgressStorageKey, setCatalogActionMessage],
  );

  const reconcileCatalogRunAfterCancelAttempt = useCallback(
    async (runId: string): Promise<boolean> => {
      if (!user) return false;
      const normalizedRunId = String(runId || "").trim();
      if (!normalizedRunId) return false;

      try {
        const data = await fetchSocialAccountCatalogRunProgressSnapshot({
          fetchAdminWithAuth,
          platform,
          handle,
          runId: normalizedRunId,
          preferredUser: user,
          fast: true,
        });
        setCatalogRunProgress(data);
        setCatalogRunProgressError(null);
        setCatalogProgressLastSuccessAt(new Date().toISOString());
        if (normalizeCatalogRunStatus(data.run_status) === "cancelled") {
          applyCancelledCatalogRunLocally(normalizedRunId, data.completed_at);
          return true;
        }
      } catch {
        // Fall through to summary reconciliation.
      }

      try {
        const result = await refreshSummary();
        if (result) {
          const matchingRun = (result.data.catalog_recent_runs ?? []).find((run) => run.run_id === normalizedRunId);
          if (normalizeCatalogRunStatus(matchingRun?.status) === "cancelled") {
            applyCancelledCatalogRunLocally(normalizedRunId, matchingRun?.completed_at ?? null);
            return true;
          }
        }
      } catch {
        // Best effort only.
      }

      return false;
    },
    [applyCancelledCatalogRunLocally, fetchAdminWithAuth, handle, platform, refreshSummary, user],
  );

  const refreshHashtags = useCallback(async () => {
    if (!user) return;
    const query = new URLSearchParams();
    if (hashtagWindow !== "all") {
      query.set("window", hashtagWindow);
    }
    const data = await withSocialProfileRequestDedup(hashtagsRequestKey, async () => {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/hashtags${
          query.size > 0 ? `?${query.toString()}` : ""
        }`,
        undefined,
        { preferredUser: user },
      );
      const payload = (await response.json().catch(() => ({}))) as HashtagsResponse & { error?: string };
      if (!response.ok) {
        throw buildSocialAccountRequestError(payload, "Failed to load social account profile hashtags");
      }
      return payload;
    });
    const nextItems = cloneHashtagItems(data.items ?? []);
    const nextDraftAssignments = buildHashtagDraftAssignments(nextItems);
    hashtagResponseCacheRef.current.set(hashtagsRequestKey, {
      items: cloneHashtagItems(nextItems),
      draftAssignments: nextDraftAssignments,
    });
    setHashtags(nextItems);
    setHashtagsLoadedRequestKey(hashtagsRequestKey);
    setDraftAssignments(nextDraftAssignments);
  }, [fetchAdminWithAuth, handle, hashtagWindow, hashtagsRequestKey, platform, user]);

  const refreshHashtagTimeline = useCallback(async () => {
    if (!user || platform !== "instagram") return;
    const query = new URLSearchParams();
    if (hashtagWindow !== "all") {
      query.set("window", hashtagWindow);
    }
    const data = await withSocialProfileRequestDedup(hashtagTimelineRequestKey, async () => {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/hashtags/timeline${
          query.size > 0 ? `?${query.toString()}` : ""
        }`,
        undefined,
        { preferredUser: user },
      );
      const payload = (await response.json().catch(() => ({}))) as HashtagTimelineResponse;
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load social account hashtag timeline");
      }
      return payload;
    });
    setHashtagTimeline(data);
  }, [fetchAdminWithAuth, handle, hashtagTimelineRequestKey, hashtagWindow, platform, user]);

  // Keep stable refs to the loaders so effects can call them without re-running
  // every time their identity changes mid-session.
  const refreshSummaryRef = useRef(refreshSummary);
  const fetchProfileSnapshotRef = useRef(fetchProfileSnapshot);
  useEffect(() => {
    refreshSummaryRef.current = refreshSummary;
  }, [refreshSummary]);
  useEffect(() => {
    fetchProfileSnapshotRef.current = fetchProfileSnapshot;
  }, [fetchProfileSnapshot]);

  useEffect(() => {
    if (checking || !user || !hasAccess) return;
    let cancelled = false;

    const loadDashboardSnapshot = async () => {
      setSummaryLoading(true);
      setSummaryError(null);
      try {
        const snapshot = await fetchProfileSnapshotRef.current({ detail: "lite" });
        if (cancelled) return;
        setDashboardFreshness(snapshot.payload.dashboard_freshness ?? null);
        const snapshotSummaryResult = applyProfileSnapshotSummary(snapshot.payload);
        if (snapshotSummaryResult === "ignored") {
          const legacySummary = await refreshSummaryRef.current({ detail: "lite" });
          if (cancelled) return;
          if (legacySummary) {
            setSummary((current) => mergeProfileSummaryPreservingLiveTotal(legacySummary.data, current));
            setSummaryUninitialized(legacySummary.uninitialized);
            setDashboardFreshness({
              status: legacySummary.uninitialized ? "missing" : "fresh",
              source: "live",
              generated_at: null,
              age_seconds: null,
            } satisfies SocialAccountDashboardFreshness);
          }
        }
        if (snapshot.payload.catalog_run_progress) {
          setCatalogRunProgress(snapshot.payload.catalog_run_progress);
          setCatalogRunProgressError(null);
          setCatalogProgressLastSuccessAt(snapshot.payload.generated_at ?? new Date().toISOString());
        }
        setSummarySaturationActive(false);
        setSummaryError(null);
      } catch (error) {
        if (cancelled) return;
        const snapshotError = toSocialAccountRequestError(error, "Failed to load social account profile summary");
        if (!snapshotError.code && snapshotError.upstreamStatus === undefined && !snapshotError.retryable) {
          try {
            const legacySummary = await refreshSummaryRef.current({ detail: "lite" });
            if (cancelled) return;
            if (legacySummary) {
              setSummary((current) => mergeProfileSummaryPreservingLiveTotal(legacySummary.data, current));
              setSummaryUninitialized(legacySummary.uninitialized);
              setDashboardFreshness({
                status: legacySummary.uninitialized ? "missing" : "fresh",
                source: "live",
                generated_at: null,
                age_seconds: null,
              } satisfies SocialAccountDashboardFreshness);
              setSummarySaturationActive(false);
              setSummaryError(null);
              return;
            }
          } catch (legacyError) {
            error = legacyError;
          }
        }
        setSummaryUninitialized(false);
        if (!isBackendSaturationError(error)) {
          setSummarySaturationActive(false);
        }
        setSummaryError(
          formatSummaryRequestErrorMessage(
            toSocialAccountRequestError(error, "Failed to load social account profile summary"),
          ),
        );
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    };

    void loadDashboardSnapshot();
    return () => {
      cancelled = true;
    };
  }, [applyProfileSnapshotSummary, checking, hasAccess, user]);

  useEffect(() => {
    if (
      checking ||
      !user ||
      !hasAccess ||
      platform !== "instagram" ||
      summaryLoading ||
      !summary
    ) {
      return;
    }

    const probeKey = `${platform}:${handle}`;
    const pendingProbeKey = `pending:${probeKey}`;
    if (
      liveProfileTotalProbeKeyRef.current === probeKey ||
      liveProfileTotalProbeKeyRef.current === pendingProbeKey
    ) {
      return;
    }

    let cancelled = false;
    liveProfileTotalProbeKeyRef.current = pendingProbeKey;

    const loadLiveProfileTotal = async () => {
      try {
        const data = await withSocialProfileRequestDedup(
          `live-profile-total:${probeKey}`,
          async (): Promise<SocialAccountLiveProfileTotal> => {
            const response = await fetchAdminWithAuth(
              `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/live-profile-total`,
              undefined,
              { preferredUser: user },
            );
            const payload = (await response.json().catch(() => ({}))) as
              | SocialAccountLiveProfileTotal
              | ProxyErrorPayload;
            if (!response.ok) {
              throw buildSocialAccountRequestError(
                toProxyErrorPayload(payload),
                "Failed to load social account live profile total",
              );
            }
            return payload as SocialAccountLiveProfileTotal;
          },
        );
        const liveTotalFromProfile =
          typeof data.live_total_posts_current === "number" && Number.isFinite(data.live_total_posts_current)
            ? Math.max(0, data.live_total_posts_current)
            : null;
        if (cancelled) {
          if (liveProfileTotalProbeKeyRef.current === pendingProbeKey) {
            liveProfileTotalProbeKeyRef.current = null;
          }
          return;
        }
        if (liveTotalFromProfile === null) {
          if (liveProfileTotalProbeKeyRef.current === pendingProbeKey) {
            liveProfileTotalProbeKeyRef.current = null;
          }
          return;
        }
        liveProfileTotalProbeKeyRef.current = probeKey;
        setSummary((current) => {
          if (!current) return current;
          return {
            ...current,
            live_total_posts: liveTotalFromProfile,
            profile_url: data.profile_url || current.profile_url,
          };
        });
      } catch (error) {
        pauseSecondaryReadsForPressure(error, "Failed to load social account live profile total");
        if (liveProfileTotalProbeKeyRef.current === pendingProbeKey) {
          liveProfileTotalProbeKeyRef.current = null;
        }
        // Best-effort only; leave the cached summary values intact.
      }
    };

    void loadLiveProfileTotal();
    return () => {
      cancelled = true;
      if (liveProfileTotalProbeKeyRef.current === pendingProbeKey) {
        liveProfileTotalProbeKeyRef.current = null;
      }
    };
  }, [
    checking,
    fetchAdminWithAuth,
    handle,
    hasAccess,
    platform,
    pauseSecondaryReadsForPressure,
    summary,
    summaryLoading,
    summaryUninitialized,
    user,
  ]);

  useEffect(() => {
    if (
      checking ||
      !user ||
      !hasAccess ||
      !supportsCatalog ||
      summaryUninitialized ||
      shouldDeferSecondaryCatalogReads ||
      secondaryReadBudgetSlot < 3
    ) {
      return;
    }
    const liveCatalogTotal = Number(summary?.live_catalog_total_posts ?? summary?.catalog_total_posts ?? 0);
    const hasCatalogHistory = visibleCatalogRecentRuns.length > 0;
    if (liveCatalogTotal > 0 || !hasCatalogHistory) {
      setCatalogCardPreview(null);
      return;
    }

    let cancelled = false;

    const loadCatalogCardPreview = async () => {
      try {
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/posts?page=1&page_size=1&filter=all`,
          undefined,
          { preferredUser: user },
        );
        const data = (await response.json().catch(() => ({}))) as CatalogPostsResponse & { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Failed to load catalog preview");
        }
        if (cancelled) return;
        setCatalogCardPreview({
          total: Number(data.pagination?.total ?? 0),
          latestPostedAt: data.items?.[0]?.posted_at ?? null,
        });
      } catch (error) {
        pauseSecondaryReadsForPressure(error, "Failed to load catalog preview");
        if (!cancelled) {
          setCatalogCardPreview(null);
        }
      }
    };

    void loadCatalogCardPreview();
    return () => {
      cancelled = true;
    };
  }, [
    checking,
    fetchAdminWithAuth,
    handle,
    hasAccess,
    pauseSecondaryReadsForPressure,
    platform,
    visibleCatalogRecentRuns,
    summary?.catalog_total_posts,
    summary?.live_catalog_total_posts,
    summaryUninitialized,
    shouldDeferSecondaryCatalogReads,
    secondaryReadBudgetSlot,
    supportsCatalog,
    user,
  ]);

  useEffect(() => {
    if (checking || !user || !hasAccess || selectedTab !== "posts" || summaryUninitialized) return;
    let cancelled = false;

    const loadPosts = async () => {
      setPostsLoading(true);
      setPostsError(null);
      try {
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/posts?page=${page}&page_size=25`,
          undefined,
          { preferredUser: user },
        );
        const data = (await response.json().catch(() => ({}))) as PostsResponse & { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Failed to load social account profile posts");
        }
        if (cancelled) return;
        setPosts(data);
      } catch (error) {
        if (cancelled) return;
        setPostsError(error instanceof Error ? error.message : "Failed to load social account profile posts");
      } finally {
        if (!cancelled) setPostsLoading(false);
      }
    };

    void loadPosts();
    return () => {
      cancelled = true;
    };
  }, [checking, fetchAdminWithAuth, handle, hasAccess, page, platform, selectedTab, summaryUninitialized, user]);

  useEffect(() => {
    if (checking || !user || !hasAccess || selectedTab !== "catalog" || !supportsCatalog || (summaryUninitialized && !hasSummary)) return;
    let cancelled = false;

    const loadCatalogPosts = async () => {
      setCatalogPostsLoading(true);
      setCatalogPostsError(null);
      try {
        const query = new URLSearchParams({
          page: String(catalogPage),
          page_size: "25",
        });
        if (catalogFilter !== "all") {
          query.set("assignment_status", catalogFilter);
        }
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/posts?${query.toString()}`,
          undefined,
          { preferredUser: user },
        );
        const data = (await response.json().catch(() => ({}))) as CatalogPostsResponse & { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Failed to load social account catalog posts");
        }
        if (cancelled) return;
        setCatalogPosts(data);
      } catch (error) {
        if (cancelled) return;
        setCatalogPostsError(error instanceof Error ? error.message : "Failed to load social account catalog posts");
      } finally {
        if (!cancelled) setCatalogPostsLoading(false);
      }
    };

    void loadCatalogPosts();
    return () => {
      cancelled = true;
    };
  }, [catalogFilter, catalogPage, checking, fetchAdminWithAuth, handle, hasAccess, hasSummary, platform, selectedTab, summaryUninitialized, supportsCatalog, user]);

  const hasLoadedExactHashtagWindow = hashtagsLoadedRequestKey === hashtagsRequestKey;
  const useSummaryTopHashtagsPreview = shouldUseSummaryTopHashtagsPreview({
    activeTab: selectedTab,
    hashtagWindow,
    summaryTopHashtags: summary?.top_hashtags ?? [],
    hasLoadedExactWindow: hasLoadedExactHashtagWindow,
  });

  useEffect(() => {
    const shouldLoadHashtags =
      selectedTab === "hashtags" ||
      (selectedTab === "stats" && !useSummaryTopHashtagsPreview);
    if (
      checking ||
      !user ||
      !hasAccess ||
      !shouldLoadHashtags ||
      summaryUninitialized ||
      (selectedTab !== "hashtags" && shouldDeferSecondaryCatalogReads)
    ) {
      return;
    }
    let cancelled = false;

    const loadHashtags = async () => {
      setHashtagsLoading(true);
      setHashtagsError(null);
      try {
        await refreshHashtags();
        if (cancelled) return;
      } catch (error) {
        if (cancelled) return;
        const requestError = toSocialAccountRequestError(error, "Failed to load social account profile hashtags");
        pauseSecondaryReadsForPressure(requestError, "Failed to load social account profile hashtags");
        const cached = hashtagResponseCacheRef.current.get(hashtagsRequestKey);
        if (cached) {
          setHashtags(cloneHashtagItems(cached.items));
          setDraftAssignments(
            Object.fromEntries(
              Object.entries(cached.draftAssignments).map(([hashtag, assignments]) => [
                hashtag,
                assignments.map((assignment) => ({ ...assignment })),
              ]),
            ),
          );
        } else {
          setHashtags([]);
          setDraftAssignments({});
        }
        setHashtagsLoadedRequestKey(hashtagsRequestKey);
        setHashtagsError(requestError);
      } finally {
        if (!cancelled) setHashtagsLoading(false);
      }
    };

    void loadHashtags();
    return () => {
      cancelled = true;
    };
  }, [
    checking,
    hashtagWindow,
    hasAccess,
    hashtagsRequestKey,
    platform,
    pauseSecondaryReadsForPressure,
    refreshHashtags,
    selectedTab,
    useSummaryTopHashtagsPreview,
    shouldDeferSecondaryCatalogReads,
    summaryUninitialized,
    user,
  ]);

  useEffect(() => {
    if (checking || !user || !hasAccess || selectedTab !== "hashtags" || platform !== "instagram" || summaryUninitialized) {
      if (platform !== "instagram") {
        setHashtagTimeline(null);
        setHashtagTimelineError(null);
        setHashtagTimelineLoading(false);
      }
      return;
    }
    let cancelled = false;

    const loadHashtagTimeline = async () => {
      setHashtagTimelineLoading(true);
      setHashtagTimelineError(null);
      try {
        await refreshHashtagTimeline();
      } catch (error) {
        if (cancelled) return;
        setHashtagTimelineError(error instanceof Error ? error.message : "Failed to load social account hashtag timeline");
      } finally {
        if (!cancelled) setHashtagTimelineLoading(false);
      }
    };

    void loadHashtagTimeline();
    return () => {
      cancelled = true;
    };
  }, [checking, hasAccess, platform, refreshHashtagTimeline, selectedTab, summaryUninitialized, user]);

  useEffect(() => {
    if (
      checking ||
      !user ||
      !hasAccess ||
      !supportsCatalog ||
      summaryUninitialized ||
      (selectedTab !== "hashtags" && shouldDeferSecondaryCatalogReads) ||
      (selectedTab !== "hashtags" && secondaryReadBudgetSlot < 3) ||
      (selectedTab !== "hashtags" && selectedTab !== "catalog" && !pendingReviewOpen)
    ) {
      return;
    }
    let cancelled = false;

    const loadReviewQueue = async () => {
      setReviewQueueLoading(true);
      setReviewQueueError(null);
      try {
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/review-queue`,
          undefined,
          { preferredUser: user },
        );
        const data = (await response.json().catch(() => ({}))) as CatalogReviewQueueResponse & { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Failed to load social account catalog review queue");
        }
        if (cancelled) return;
        setReviewQueue(data.items ?? []);
      } catch (error) {
        if (cancelled) return;
        pauseSecondaryReadsForPressure(error, "Failed to load social account catalog review queue");
        setReviewQueueError(error instanceof Error ? error.message : "Failed to load social account catalog review queue");
      } finally {
        if (!cancelled) setReviewQueueLoading(false);
      }
    };

    void loadReviewQueue();
    return () => {
      cancelled = true;
    };
  }, [
    checking,
    fetchAdminWithAuth,
    handle,
    hasAccess,
    pendingReviewOpen,
    pauseSecondaryReadsForPressure,
    platform,
    selectedTab,
    secondaryReadBudgetSlot,
    shouldDeferSecondaryCatalogReads,
    summaryUninitialized,
    supportsCatalog,
    user,
  ]);

  useEffect(() => {
    if (checking || !user || !hasAccess || selectedTab !== "collaborators-tags" || summaryUninitialized) return;
    let cancelled = false;

    const loadCollaboratorsTags = async () => {
      setCollaboratorsLoading(true);
      setCollaboratorsError(null);
      try {
        const data = await withSocialProfileRequestDedup(collaboratorsRequestKey, async () => {
          const response = await fetchAdminWithAuth(
            `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/collaborators-tags`,
            undefined,
            { preferredUser: user },
          );
          const payload = (await response.json().catch(() => ({}))) as CollaboratorsTagsResponse & { error?: string };
          if (!response.ok) {
            throw new Error(payload.error || "Failed to load social account profile collaborators and tags");
          }
          return payload;
        });
        if (cancelled) return;
        setCollaboratorsTags(data);
      } catch (error) {
        if (cancelled) return;
        setCollaboratorsError(
          error instanceof Error ? error.message : "Failed to load social account profile collaborators and tags",
        );
      } finally {
        if (!cancelled) setCollaboratorsLoading(false);
      }
    };

    void loadCollaboratorsTags();
    return () => {
      cancelled = true;
    };
  }, [checking, collaboratorsRequestKey, fetchAdminWithAuth, handle, hasAccess, platform, selectedTab, summaryUninitialized, user]);

  const displayCatalogTotalPosts = useMemo(() => {
    if (supportsCatalog && Number(summary?.live_catalog_total_posts ?? 0) > 0) {
      return Number(summary?.live_catalog_total_posts ?? 0);
    }
    if (supportsCatalog && Number(catalogCardPreview?.total ?? 0) > 0) {
      return Number(catalogCardPreview?.total ?? 0);
    }
    return Number(summary?.catalog_total_posts ?? 0);
  }, [
    catalogCardPreview?.total,
    summary?.catalog_total_posts,
    summary?.live_catalog_total_posts,
    supportsCatalog,
  ]);

  const displayTotalPosts = useMemo(() => {
    if (Number(summary?.live_total_posts ?? 0) > 0) {
      return Number(summary?.live_total_posts ?? 0);
    }
    return Number(summary?.total_posts ?? 0);
  }, [summary?.live_total_posts, summary?.total_posts]);

  const catalogCountsMismatch = useMemo(() => {
    return supportsCatalog && displayTotalPosts !== displayCatalogTotalPosts;
  }, [displayCatalogTotalPosts, displayTotalPosts, supportsCatalog]);

  const postsSummaryLabel = useMemo(() => {
    if (supportsCatalog && Number(summary?.live_total_posts ?? 0) > 0) {
      return "Cataloged / Profile total";
    }
    if (supportsCatalog) {
      return "Cataloged / Stored total";
    }
    return "Cataloged / Profile total";
  }, [summary?.live_total_posts, supportsCatalog]);

  const applyCatalogGapAnalysisStatus = useCallback(
    (payload: CatalogGapAnalysisStatusPayload) => {
      const normalizedStatus = payload.status ?? "idle";
      const operationId =
        typeof payload.operation_id === "string" && payload.operation_id.trim()
          ? payload.operation_id.trim()
          : null;
      setCatalogGapAnalysis(payload.result ?? null);
      setCatalogGapAnalysisStatus(normalizedStatus);
      setCatalogGapAnalysisOperationId(operationId);
      setCatalogGapAnalysisStale(Boolean(payload.stale));
      setCatalogGapAnalysisLoading(normalizedStatus === "queued" || normalizedStatus === "running");
      if (normalizedStatus === "failed") {
        setCatalogGapAnalysisError(
          toCatalogGapAnalysisStatusError(payload.last_error, "Failed to analyze social account catalog gaps"),
        );
      } else {
        setCatalogGapAnalysisError(null);
      }
    },
    [],
  );

  const canRequestCatalogGapAnalysis = useMemo(() => {
    return (
      supportsCatalog &&
      platform === "instagram" &&
      !summaryUninitialized &&
      !shouldDeferManualCatalogDiagnostics &&
      catalogCountsMismatch &&
      !activeCatalogRun &&
      latestCatalogRunStatus === "completed" &&
      !activeCatalogRunStatusNormalized
    );
  }, [
    activeCatalogRun,
    activeCatalogRunStatusNormalized,
    catalogCountsMismatch,
    latestCatalogRunStatus,
    platform,
    shouldDeferManualCatalogDiagnostics,
    summaryUninitialized,
    supportsCatalog,
  ]);

  const requestCatalogGapAnalysis = useCallback(() => {
    setCatalogGapAnalysisError(null);
    setCatalogGapAnalysisStale(Boolean(catalogGapAnalysis));
    setCatalogGapAnalysisRequestNonce((current) => current + 1);
  }, [catalogGapAnalysis]);

  const requestCatalogFreshness = useCallback(() => {
    setSecondaryReadsPressurePause(null);
    setCatalogFreshnessError(null);
    catalogFreshnessProbeKeyRef.current = null;
    setCatalogFreshnessRequestNonce((current) => current + 1);
  }, []);

  const summaryTopHashtagsPreview = useMemo(
    () => cloneHashtagItems(summary?.top_hashtags ?? []),
    [summary?.top_hashtags],
  );

  const displayedStatsHashtags = useMemo(() => {
    if (useSummaryTopHashtagsPreview) {
      return summaryTopHashtagsPreview;
    }
    return hashtags;
  }, [hashtags, summaryTopHashtagsPreview, useSummaryTopHashtagsPreview]);

  const statsHashtagsPending = useMemo(() => {
    const shouldShowFetchedHashtags = selectedTab === "hashtags" || selectedTab === "stats";
    if (!shouldShowFetchedHashtags) {
      return false;
    }
    if (useSummaryTopHashtagsPreview) {
      return false;
    }
    return hashtagsLoadedRequestKey !== hashtagsRequestKey;
  }, [hashtagsLoadedRequestKey, hashtagsRequestKey, selectedTab, useSummaryTopHashtagsPreview]);

  const hashtagsErrorMessage = useMemo(() => formatHashtagRequestErrorMessage(hashtagsError), [hashtagsError]);
  const hashtagsErrorToneClass = useMemo(() => {
    return isBackendSaturationError(hashtagsError) ? "text-amber-800" : "text-red-700";
  }, [hashtagsError]);

  useEffect(() => {
    if (
      checking ||
      !user ||
      !hasAccess ||
      selectedTab !== "catalog" ||
      !supportsCatalog ||
      platform !== "instagram" ||
      summaryUninitialized
    ) {
      setCatalogFreshness(null);
      setCatalogFreshnessError(null);
      setCatalogFreshnessLoading(false);
      return;
    }
    if (shouldDeferSecondaryCatalogReads) {
      setCatalogFreshnessLoading(false);
      return;
    }

    const latestStatus = normalizeCatalogRunStatus(latestCatalogRun?.status);
    const activeStatus = normalizeCatalogRunStatus(activeCatalogRun?.status);
    const probeKey = `${platform}:${handle}:${latestCatalogRun?.run_id ?? "none"}:${activeCatalogRun?.run_id ?? "none"}:${catalogFreshnessRequestNonce}`;

    if (activeCatalogRun || latestStatus !== "completed" || activeStatus) {
      setCatalogFreshness(null);
      setCatalogFreshnessError(null);
      setCatalogFreshnessLoading(false);
      catalogFreshnessProbeKeyRef.current = probeKey;
      return;
    }
    if (catalogFreshnessProbeKeyRef.current === probeKey) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    catalogFreshnessProbeKeyRef.current = probeKey;

    const loadCatalogFreshness = async () => {
      setCatalogFreshnessLoading(true);
      setCatalogFreshnessError(null);
      try {
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/freshness`,
          {
            method: "POST",
            signal: controller.signal,
          },
          { preferredUser: user },
        );
        const data = (await response.json().catch(() => ({}))) as CatalogFreshnessPayload;
        if (!response.ok) {
          throw buildSocialAccountRequestError(data, "Failed to check catalog freshness");
        }
        if (cancelled) return;
        setCatalogFreshness(data);
        if (isCatalogFreshnessDegraded(data)) {
          setSecondaryReadsPressurePause({
            reason: data.degraded_reason ?? data.degradation_reason ?? data.reason ?? "Catalog freshness returned partial data.",
            code: data.code ?? null,
          });
        }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        const requestError = toSocialAccountRequestError(error, "Failed to check catalog freshness");
        pauseSecondaryReadsForPressure(requestError, "Failed to check catalog freshness");
        setCatalogFreshnessError(requestError);
      } finally {
        if (!cancelled) {
          setCatalogFreshnessLoading(false);
        }
      }
    };

    void loadCatalogFreshness();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    activeCatalogRun,
    catalogFreshnessRequestNonce,
    checking,
    fetchAdminWithAuth,
    handle,
    hasAccess,
    latestCatalogRun?.run_id,
    latestCatalogRun?.status,
    pauseSecondaryReadsForPressure,
    platform,
    selectedTab,
    shouldDeferSecondaryCatalogReads,
    summaryUninitialized,
    supportsCatalog,
    user,
  ]);

  useEffect(() => {
    if (
      checking ||
      !user ||
      !hasAccess ||
      selectedTab !== "catalog" ||
      !supportsCatalog ||
      platform !== "instagram" ||
      summaryUninitialized ||
      !catalogCountsMismatch ||
      shouldDeferManualCatalogDiagnostics ||
      catalogGapAnalysisRequestNonce <= 0
    ) {
      if (!catalogCountsMismatch || shouldDeferManualCatalogDiagnostics) {
        setCatalogGapAnalysis(null);
        setCatalogGapAnalysisStatus("idle");
        setCatalogGapAnalysisOperationId(null);
        setCatalogGapAnalysisStale(false);
        setCatalogGapAnalysisError(null);
        setCatalogGapAnalysisLoading(false);
      }
      return;
    }

    const latestStatus = normalizeCatalogRunStatus(latestCatalogRun?.status);
    const activeStatus = normalizeCatalogRunStatus(activeCatalogRun?.status);
    if (activeCatalogRun || latestStatus !== "completed" || activeStatus) {
      setCatalogGapAnalysis(null);
      setCatalogGapAnalysisStatus("idle");
      setCatalogGapAnalysisOperationId(null);
      setCatalogGapAnalysisStale(false);
      setCatalogGapAnalysisError(null);
      setCatalogGapAnalysisLoading(false);
      return;
    }

    let cancelled = false;
    const runCatalogGapAnalysis = async () => {
      setCatalogGapAnalysisLoading(true);
      setCatalogGapAnalysisStatus("queued");
      setCatalogGapAnalysisError(null);
      try {
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/gap-analysis/run`,
          { method: "POST" },
          { preferredUser: user },
        );
        const data = (await response.json().catch(() => ({}))) as CatalogGapAnalysisStatusPayload;
        if (!response.ok) {
          throw buildSocialAccountRequestError(data, "Failed to start social account catalog gap analysis");
        }
        if (cancelled) return;
        applyCatalogGapAnalysisStatus(data);
      } catch (error) {
        if (cancelled) return;
        setCatalogGapAnalysisStatus("idle");
        setCatalogGapAnalysisLoading(false);
        setCatalogGapAnalysisError(
          toSocialAccountRequestError(error, "Failed to start social account catalog gap analysis"),
        );
      }
    };

    void runCatalogGapAnalysis();
    return () => {
      cancelled = true;
    };
  }, [
    activeCatalogRun,
    applyCatalogGapAnalysisStatus,
    catalogCountsMismatch,
    catalogGapAnalysisRequestNonce,
    checking,
    fetchAdminWithAuth,
    handle,
    hasAccess,
    latestCatalogRun?.status,
    platform,
    selectedTab,
    shouldDeferManualCatalogDiagnostics,
    summaryUninitialized,
    supportsCatalog,
    user,
  ]);

  useEffect(() => {
    if (
      checking ||
      !user ||
      !hasAccess ||
      selectedTab !== "catalog" ||
      !supportsCatalog ||
      platform !== "instagram" ||
      summaryUninitialized ||
      !catalogCountsMismatch ||
      shouldDeferManualCatalogDiagnostics ||
      !catalogGapAnalysisOperationId ||
      (catalogGapAnalysisStatus !== "queued" && catalogGapAnalysisStatus !== "running")
    ) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | null = null;
    let saturationAttempt = 0;

    const clearPendingPoll = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const scheduleNextPoll = (delayMs: number) => {
      clearPendingPoll();
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      timeoutId = window.setTimeout(() => {
        void loadCatalogGapAnalysisStatus();
      }, delayMs);
    };

    const loadCatalogGapAnalysisStatus = async () => {
      try {
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/gap-analysis`,
          undefined,
          { preferredUser: user },
        );
        const data = (await response.json().catch(() => ({}))) as CatalogGapAnalysisStatusPayload;
        if (!response.ok) {
          throw buildSocialAccountRequestError(data, "Failed to fetch social account catalog gap analysis");
        }
        if (cancelled) return;
        saturationAttempt = 0;
        applyCatalogGapAnalysisStatus(data);
        if (data.status === "queued" || data.status === "running") {
          scheduleNextPoll(CATALOG_GAP_ANALYSIS_POLL_INTERVAL_MS);
        }
      } catch (error) {
        if (cancelled) return;
        const requestError = toSocialAccountRequestError(error, "Failed to fetch social account catalog gap analysis");
        if (requestError.retryable) {
          saturationAttempt += 1;
          scheduleNextPoll(resolveCatalogGapAnalysisBackoffMs(requestError, saturationAttempt));
          return;
        }
        setCatalogGapAnalysisStatus("failed");
        setCatalogGapAnalysisLoading(false);
        setCatalogGapAnalysisError(requestError);
      }
    };

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        clearPendingPoll();
        return;
      }
      void loadCatalogGapAnalysisStatus();
    };

    void loadCatalogGapAnalysisStatus();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      clearPendingPoll();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    applyCatalogGapAnalysisStatus,
    catalogCountsMismatch,
    catalogGapAnalysisOperationId,
    catalogGapAnalysisStatus,
    checking,
    fetchAdminWithAuth,
    handle,
    hasAccess,
    platform,
    selectedTab,
    shouldDeferManualCatalogDiagnostics,
    summaryUninitialized,
    supportsCatalog,
    user,
  ]);

  const trimmedPostSearchQuery = useMemo(() => postSearchQuery.trim(), [postSearchQuery]);

  useEffect(() => {
    if (checking || !user || !hasAccess || !postSearchExpanded || summaryUninitialized) {
      setPostSearchLoading(false);
      setPostSearchError(null);
      if (!postSearchExpanded) {
        setPostSearchResults(null);
      }
      return;
    }
    if (!trimmedPostSearchQuery) {
      setPostSearchResults(null);
      setPostSearchLoading(false);
      setPostSearchError(null);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void (async () => {
        setPostSearchLoading(true);
        setPostSearchError(null);
        try {
          const query = new URLSearchParams({
            page: "1",
            page_size: "25",
            search: trimmedPostSearchQuery,
          });
          const response = await fetchAdminWithAuth(
            `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/posts?${query.toString()}`,
            undefined,
            { preferredUser: user },
          );
          const data = (await response.json().catch(() => ({}))) as PostsResponse & { error?: string };
          if (!response.ok) {
            throw new Error(data.error || "Failed to search social account captions");
          }
          if (cancelled) return;
          setPostSearchResults(data);
        } catch (error) {
          if (cancelled) return;
          setPostSearchError(error instanceof Error ? error.message : "Failed to search social account captions");
        } finally {
          if (!cancelled) {
            setPostSearchLoading(false);
          }
        }
      })();
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [checking, fetchAdminWithAuth, handle, hasAccess, platform, postSearchExpanded, summaryUninitialized, trimmedPostSearchQuery, user]);

  const activeCatalogRunStatus = useMemo(() => {
    const normalized = normalizeCatalogRunStatus(activeCatalogRun?.status);
    return normalized || null;
  }, [activeCatalogRun?.status]);

  const activeCatalogRunDisplayStatus = useMemo(() => {
    if (activeCatalogRunId && catalogRunProgress?.run_id === activeCatalogRunId) {
      const progressStatus = normalizeCatalogRunStatus(catalogRunProgress?.run_status);
      if (catalogRunProgress?.scrape_complete && progressStatus === "completed") {
        return "completed";
      }
      if (progressStatus) {
        return progressStatus;
      }
    }
    return activeCatalogRunStatus;
  }, [
    activeCatalogRunId,
    activeCatalogRunStatus,
    catalogRunProgress?.run_id,
    catalogRunProgress?.run_status,
    catalogRunProgress?.scrape_complete,
  ]);

  const activeCatalogRunBlocksActions = useMemo(() => {
    return activeCatalogRunId !== null && ACTIVE_CATALOG_RUN_STATUSES.has(activeCatalogRunDisplayStatus || "");
  }, [activeCatalogRunDisplayStatus, activeCatalogRunId]);

  const displayedCatalogRunStatus = useMemo(() => {
    const selectedRunId = displayedCatalogRunId?.trim() ?? "";
    const progressStatus =
      selectedRunId && catalogRunProgress?.run_id === selectedRunId ? catalogRunProgress.run_status : null;
    const summaryStatus =
      selectedRunId && displayedCatalogRunSummary?.run_id === selectedRunId ? displayedCatalogRunSummary.status : null;
    const hasProvisionalSelectedRun =
      Boolean(selectedRunId) &&
      catalogRunProgress?.run_id === selectedRunId;
    const candidates = [
      progressStatus,
      summaryStatus,
      hasProvisionalSelectedRun && catalogProgressRunId === selectedRunId ? "queued" : null,
    ];
    for (const candidate of candidates) {
      const normalized = normalizeCatalogRunStatus(candidate);
      if (normalized) return normalized;
    }
    return "";
  }, [
    displayedCatalogRunSummary?.run_id,
    displayedCatalogRunSummary?.status,
    catalogRunProgress?.run_id,
    catalogRunProgress?.run_status,
    catalogProgressRunId,
    displayedCatalogRunId,
  ]);

  const shouldDisplayCatalogRunProgressCard = useMemo(() => {
    const normalizedDisplayedRunId = String(displayedCatalogRunId || "").trim();
    if (!normalizedDisplayedRunId) return false;
    if (ACTIVE_CATALOG_RUN_STATUSES.has(displayedCatalogRunStatus || "")) return true;
    if (!TERMINAL_CATALOG_RUN_STATUSES.has(displayedCatalogRunStatus || "")) return false;
    if (displayedCatalogRunStatus === "cancelled") return selectedCatalogRunId === normalizedDisplayedRunId;
    if (selectedCatalogRunId === normalizedDisplayedRunId) return true;
    return activeCatalogRunId === normalizedDisplayedRunId && catalogRunProgress?.run_id === normalizedDisplayedRunId;
  }, [
    activeCatalogRunId,
    catalogRunProgress?.run_id,
    displayedCatalogRunId,
    displayedCatalogRunStatus,
    selectedCatalogRunId,
  ]);
  const shouldRenderCatalogRunProgressCard =
    shouldShowCatalogRunProgressCard && supportsCatalog && shouldDisplayCatalogRunProgressCard;

  useEffect(() => {
    if (checking || !user || !hasAccess || !supportsCatalog) return;
    const normalizedDisplayedRunId = String(displayedCatalogRunId || "").trim();
    if (!normalizedDisplayedRunId) return;
    if (!TERMINAL_CATALOG_RUN_STATUSES.has(displayedCatalogRunStatus)) return;
    if (summaryUninitialized) return;
    const selectedMatchesDisplayedRun = selectedCatalogRunId === normalizedDisplayedRunId;
    const activeMatchesDisplayedRun = activeCatalogRunId === normalizedDisplayedRunId;
    if (
      normalizedDisplayedRunId === String(backgroundCatalogRunId || "").trim() &&
      !selectedMatchesDisplayedRun &&
      !activeMatchesDisplayedRun
    ) {
      return;
    }
    const shouldHydrateTerminalRun =
      selectedMatchesDisplayedRun ||
      activeMatchesDisplayedRun;
    if (!shouldHydrateTerminalRun) return;
    if (catalogRunProgress?.run_id === normalizedDisplayedRunId) {
      catalogTerminalProgressHydrationAttemptedRunIdRef.current = null;
      return;
    }
    if (catalogTerminalProgressHydrationAttemptedRunIdRef.current === normalizedDisplayedRunId) return;

    let cancelled = false;
    catalogTerminalProgressHydrationAttemptedRunIdRef.current = normalizedDisplayedRunId;
    setCatalogRunProgressLoading(true);

    void (async () => {
      let snapshot: Awaited<ReturnType<typeof fetchProfileSnapshotRef.current>> | null = null;

      try {
        snapshot = await fetchProfileSnapshotRef.current({ runId: normalizedDisplayedRunId, detail: "lite" });
      } catch (snapshotError) {
        if (displayedCatalogRunStatus === "completed") {
          throw snapshotError;
        }
        const progress = await fetchCatalogRunProgressSnapshot(normalizedDisplayedRunId);
        if (cancelled) return;
        setCatalogProgressSaturationActive(false);
        setCatalogRunProgress(progress);
        setCatalogRunProgressError(null);
        setCatalogProgressLastSuccessAt(new Date().toISOString());
        return;
      }

      if (cancelled) return;
      applyProfileSnapshotSummary(snapshot.payload);
      const progress =
        snapshot.payload.catalog_run_progress ??
        (displayedCatalogRunStatus === "completed"
          ? null
          : await fetchCatalogRunProgressSnapshot(normalizedDisplayedRunId));
      if (cancelled) return;
      if (!progress) return;
      setCatalogProgressSaturationActive(false);
      setCatalogRunProgress(progress);
      setCatalogRunProgressError(null);
      setCatalogProgressLastSuccessAt(snapshot.payload.generated_at ?? new Date().toISOString());
    })()
      .catch((error) => {
        if (cancelled) return;
        const requestError = toSocialAccountRequestError(error, "Failed to load catalog run progress");
        if (isBackendSaturationError(requestError)) {
          setCatalogProgressSaturationActive(true);
        }
        setCatalogRunProgressError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) {
          setCatalogRunProgressLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeCatalogRunId,
    applyProfileSnapshotSummary,
    backgroundCatalogRunId,
    catalogRunProgress?.run_id,
    checking,
    displayedCatalogRunId,
    displayedCatalogRunStatus,
    fetchCatalogRunProgressSnapshot,
    hasAccess,
    selectedCatalogRunId,
    summaryUninitialized,
    supportsCatalog,
    user,
  ]);

  const catalogReplacementRunId = useMemo(() => {
    return String(catalogRunProgress?.worker_runtime?.replacement_run_id || "").trim() || null;
  }, [catalogRunProgress?.worker_runtime?.replacement_run_id]);

  const catalogAutoRequeueStatus = useMemo(() => {
    return String(catalogRunProgress?.worker_runtime?.auto_requeue_status || "").trim().toLowerCase() || null;
  }, [catalogRunProgress?.worker_runtime?.auto_requeue_status]);

  const catalogAutoRequeueActive = useMemo(() => {
    return Boolean(catalogReplacementRunId) && (catalogAutoRequeueStatus === "queued" || catalogAutoRequeueStatus === "running");
  }, [catalogAutoRequeueStatus, catalogReplacementRunId]);

  const cancellableCatalogRunId = useMemo(() => {
    const normalizedDisplayedRunId = displayedCatalogRunId?.trim() ?? "";
    if (normalizedDisplayedRunId && ACTIVE_CATALOG_RUN_STATUSES.has(displayedCatalogRunStatus || "")) {
      return normalizedDisplayedRunId;
    }
    return activeCatalogRunId;
  }, [activeCatalogRunId, displayedCatalogRunId, displayedCatalogRunStatus]);

  const cancellableCatalogRunStatus = useMemo(() => {
    if (cancellableCatalogRunId && cancellableCatalogRunId === displayedCatalogRunId) {
      return displayedCatalogRunStatus;
    }
    return activeCatalogRunDisplayStatus || "";
  }, [activeCatalogRunDisplayStatus, cancellableCatalogRunId, displayedCatalogRunId, displayedCatalogRunStatus]);
  const cancellableCatalogRunStatusLabel = useMemo(() => {
    const progressForRun =
      cancellableCatalogRunId && catalogRunProgress?.run_id === cancellableCatalogRunId ? catalogRunProgress : null;
    return getCatalogRunDisplayStatusLabel(cancellableCatalogRunStatus, progressForRun);
  }, [cancellableCatalogRunId, cancellableCatalogRunStatus, catalogRunProgress]);

  const cancellableCatalogRunIsActive = useMemo(() => {
    return Boolean(cancellableCatalogRunId) && ACTIVE_CATALOG_RUN_STATUSES.has(cancellableCatalogRunStatus || "");
  }, [cancellableCatalogRunId, cancellableCatalogRunStatus]);

  const summaryActiveCommentsRunId = useMemo(() => {
    const candidate = String(summary?.comments_coverage?.active_run_id || "").trim();
    return candidate.length > 0 ? candidate : null;
  }, [summary?.comments_coverage?.active_run_id]);

  useEffect(() => {
    if (!summaryActiveCommentsRunId) return;
    setCommentsProgressRunId(summaryActiveCommentsRunId);
    storeCatalogProgressRunId(commentsProgressStorageKey, summaryActiveCommentsRunId);
  }, [commentsProgressStorageKey, summaryActiveCommentsRunId]);

  const activeCommentsRunId = useMemo(() => {
    const candidate = String(summaryActiveCommentsRunId || commentsProgressRunId || "").trim();
    return candidate.length > 0 ? candidate : null;
  }, [commentsProgressRunId, summaryActiveCommentsRunId]);

  const activeCommentsRunStatus = useMemo(() => {
    const coverage = summary?.comments_coverage;
    const candidates = [coverage?.effective_status, coverage?.last_attempt_status, coverage?.last_comments_run_status];
    for (const candidate of candidates) {
      const normalized = String(candidate || "").trim().toLowerCase();
      if (normalized) return normalized;
    }
    return "";
  }, [summary?.comments_coverage]);

  const activeCommentsRunProgress = useSharedPollingResource<SocialAccountCommentsRunProgress>({
    key: `instagram-comments-run:${platform}:${handle}:${activeCommentsRunId ?? "none"}`,
    shouldRun: !checking && Boolean(user) && hasAccess && platform === "instagram" && Boolean(activeCommentsRunId),
    intervalMs: COMMENTS_PROGRESS_POLL_INTERVAL_MS,
    fetchData: async (signal) => {
      if (!activeCommentsRunId) {
        throw new Error("Missing comments run id");
      }
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/comments/runs/${encodeURIComponent(activeCommentsRunId)}/progress`,
        { signal },
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as SocialAccountCommentsRunProgress & ProxyErrorPayload;
      if (!response.ok) {
        throw buildSocialAccountRequestError(data, "Failed to load comments run progress");
      }
      return data;
    },
  });

  const rawActiveCommentsRunProgressData =
    activeCommentsRunProgress.data?.run_id === activeCommentsRunId ? activeCommentsRunProgress.data : null;
  const rawActiveCommentsRunProgressStatus = String(rawActiveCommentsRunProgressData?.run_status || "").trim().toLowerCase();
  const rawActiveCommentsRunProgressIsStale = isCommentsProgressNonAuthoritative(rawActiveCommentsRunProgressData);
  const activeCommentsRunProgressLastSuccessMs = activeCommentsRunProgress.lastSuccessAt?.getTime() ?? 0;
  const activeCommentsRunProgressFromThisMount = activeCommentsRunProgressLastSuccessMs >= mountedAtMsRef.current;
  const commentsRunMovementSnapshotRef = useRef<CommentsRunMovementSnapshot | null>(null);
  const [commentsRunMovement, setCommentsRunMovement] = useState<CommentsRunMovement | null>(null);
  const suppressStaleActiveCommentsErroredProgress =
    Boolean(activeCommentsRunId) &&
    rawActiveCommentsRunProgressData?.run_id === activeCommentsRunId &&
    Boolean(activeCommentsRunProgress.error) &&
    !activeCommentsRunProgressFromThisMount;
  const suppressStaleActiveCommentsTerminalProgress =
    Boolean(activeCommentsRunId) &&
    rawActiveCommentsRunProgressData?.run_id === activeCommentsRunId &&
    TERMINAL_CATALOG_RUN_STATUSES.has(rawActiveCommentsRunProgressStatus) &&
    ACTIVE_CATALOG_RUN_STATUSES.has(activeCommentsRunStatus) &&
    !activeCommentsRunProgressFromThisMount;
  const activeCommentsRunProgressData =
    suppressStaleActiveCommentsTerminalProgress || suppressStaleActiveCommentsErroredProgress || rawActiveCommentsRunProgressIsStale
    ? null
    : rawActiveCommentsRunProgressData;
  const refetchActiveCommentsRunProgress = activeCommentsRunProgress.refetch;

  useEffect(() => {
    const progress = activeCommentsRunProgressData;
    const runId = String(progress?.run_id || "").trim();
    if (!runId) {
      commentsRunMovementSnapshotRef.current = null;
      setCommentsRunMovement(null);
      return;
    }
    const summaryPayload = (progress?.summary ?? {}) as Record<string, unknown>;
    const snapshot: CommentsRunMovementSnapshot = {
      runId,
      sampledAtMs: activeCommentsRunProgressLastSuccessMs || Date.now(),
      postsChecked:
        readFiniteNumber(progress?.post_progress?.completed_posts) ??
        readFiniteNumber(progress?.post_progress?.matched_posts) ??
        0,
      commentsProcessed:
        readFiniteNumber(summaryPayload.comments_processed_total) ??
        readFiniteNumber(summaryPayload.items_found_total) ??
        0,
      commentsInserted: readFiniteNumber(summaryPayload.comments_inserted_total) ?? 0,
      commentsChanged: readFiniteNumber(summaryPayload.comments_changed_total) ?? 0,
    };
    const previous = commentsRunMovementSnapshotRef.current;
    if (previous?.runId === runId && previous.sampledAtMs >= snapshot.sampledAtMs) return;
    const hasBaseline = previous?.runId === runId;
    const commentsChangedDelta = hasBaseline ? Math.max(0, snapshot.commentsChanged - previous.commentsChanged) : 0;
    const newCommentsDelta = hasBaseline ? Math.max(0, snapshot.commentsInserted - previous.commentsInserted) : 0;
    setCommentsRunMovement({
      runId,
      hasBaseline,
      postsCheckedDelta: hasBaseline ? Math.max(0, snapshot.postsChecked - previous.postsChecked) : 0,
      commentsProcessedDelta: hasBaseline ? Math.max(0, snapshot.commentsProcessed - previous.commentsProcessed) : 0,
      newCommentsDelta,
      existingCommentDetailsEditedDelta: Math.max(0, commentsChangedDelta - newCommentsDelta),
    });
    commentsRunMovementSnapshotRef.current = snapshot;
  }, [activeCommentsRunProgressData, activeCommentsRunProgressLastSuccessMs]);

  useEffect(() => {
    if (!suppressStaleActiveCommentsTerminalProgress) return;
    refetchActiveCommentsRunProgress({ cause: "manual", forceRefresh: true });
  }, [refetchActiveCommentsRunProgress, suppressStaleActiveCommentsTerminalProgress]);

  const activeCommentsRunEffectiveStatus = useMemo(() => {
    return String(activeCommentsRunProgressData?.run_status || activeCommentsRunStatus || "").trim().toLowerCase();
  }, [activeCommentsRunProgressData?.run_status, activeCommentsRunStatus]);

  const activeCommentsRunIsActive = useMemo(() => {
    return ACTIVE_CATALOG_RUN_STATUSES.has(activeCommentsRunEffectiveStatus);
  }, [activeCommentsRunEffectiveStatus]);

  const activeCommentsRunProgressPollError = useMemo(() => {
    const error = activeCommentsRunProgress.error;
    if (!error) return null;
    if (activeCommentsRunIsActive && isTransientCommentsProgressPollError(error)) {
      return null;
    }
    return error;
  }, [activeCommentsRunIsActive, activeCommentsRunProgress.error]);

  const activeCommentsRunIsTerminal = useMemo(() => {
    return TERMINAL_CATALOG_RUN_STATUSES.has(activeCommentsRunEffectiveStatus);
  }, [activeCommentsRunEffectiveStatus]);

  const activeCommentsRunCanCancel =
    Boolean(activeCommentsRunId) && activeCommentsRunIsActive && !rawActiveCommentsRunProgressIsStale;
  const activeCommentsRunCanResume =
    Boolean(activeCommentsRunId) &&
    ["cancelled", "failed"].includes(activeCommentsRunEffectiveStatus) &&
    !rawActiveCommentsRunProgressIsStale;

  const activeCommentsRunBlocksActions = useMemo(() => {
    if (activeCommentsRunIsTerminal) return false;
    if (activeCommentsRunIsActive) return true;
    return Boolean(activeCommentsRunId) && !activeCommentsRunEffectiveStatus;
  }, [activeCommentsRunEffectiveStatus, activeCommentsRunId, activeCommentsRunIsActive, activeCommentsRunIsTerminal]);

  const activeCommentsProgressRows = useMemo(
    () => getCommentsShardProgressRows(activeCommentsRunProgressData),
    [activeCommentsRunProgressData],
  );

  const activeCommentsProgressRankedRows = useMemo(
    () =>
      activeCommentsProgressRows
        .map((row, index) => {
          const shard = getCommentsShardDisplay(row);
          const speedScore =
            readFiniteNumber(row.posts_per_minute) ??
            (readFiniteNumber(row.comments_per_minute) !== null
              ? (readFiniteNumber(row.comments_per_minute) ?? 0) / 100
              : -1);
          return { row, index, shard, speedScore };
        })
        .sort((left, right) => {
          if (right.speedScore !== left.speedScore) return right.speedScore - left.speedScore;
          return left.index - right.index;
        }),
    [activeCommentsProgressRows],
  );

  const activeCommentsProgressSummary = useMemo(() => {
    const progress = activeCommentsRunProgressData;
    const completedPosts =
      readFiniteNumber(progress?.post_progress?.completed_posts) ??
      readFiniteNumber(progress?.post_progress?.matched_posts);
    const completePosts =
      readFiniteNumber(progress?.post_progress?.complete_posts) ??
      readFiniteNumber(progress?.summary?.complete_posts_total);
    const incompletePosts =
      readFiniteNumber(progress?.post_progress?.incomplete_posts) ??
      readFiniteNumber(progress?.summary?.incomplete_posts_total);
    const totalPosts =
      readFiniteNumber(progress?.post_progress?.total_posts) ??
      readFiniteNumber(progress?.target_source_ids_count);
    const rawItemsFound = readFiniteNumber(progress?.summary?.items_found_total);
    const commentsProcessed =
      readFiniteNumber(progress?.summary?.comments_processed_total) ??
      rawItemsFound;
    const commentsWritten = readFiniteNumber(progress?.summary?.comments_upserted_total);
    const commentsInserted = readFiniteNumber(progress?.summary?.comments_inserted_total);
    const commentsRefreshed = readFiniteNumber(progress?.summary?.comments_refreshed_total);
    const commentsChanged = readFiniteNumber(progress?.summary?.comments_changed_total);
    const postsPerMinute = readFiniteNumber(progress?.throughput?.posts_per_minute);
    const commentsPerMinute = readFiniteNumber(progress?.throughput?.comments_per_minute);
    const runningCommentJobs = readFiniteNumber(progress?.active_comment_jobs);
    const savedComments = readFiniteNumber(summary?.comments_saved_summary?.saved_comments);
    const reportedComments = readFiniteNumber(summary?.comments_saved_summary?.retrieved_comments);
    const postsPercent = toProgressPercent(completedPosts, totalPosts);
    const savedPercent = toProgressPercent(savedComments, reportedComments);
    const remainingPosts =
      completedPosts !== null && totalPosts !== null ? Math.max(0, totalPosts - completedPosts) : null;
    const estimatedSecondsRemaining =
      runningCommentJobs !== null && runningCommentJobs > 0 && remainingPosts !== null && postsPerMinute !== null && postsPerMinute > 0
        ? (remainingPosts / postsPerMinute) * 60
        : null;
    const etaLabel = formatDurationEstimate(estimatedSecondsRemaining);
    const autoRebalance = progress?.auto_rebalance;
    const autoRebalancedJobCount = getNumberFromRecord(autoRebalance, ["created_job_count"]);
    return {
      status: formatRunStatusLabel(activeCommentsRunEffectiveStatus || "running"),
      jobSummary: formatCommentsShardJobSummary(progress),
      completedPosts,
      totalPosts,
      commentsProcessed,
      commentsInserted,
      commentsWritten,
      postsPercent,
      savedComments,
      reportedComments,
      savedPercent,
      etaLabel,
      autoRebalancedJobCount,
      runningCommentJobs,
      movementLabel: formatCommentsRunMovementLabel(commentsRunMovement),
      currentMovementLabel:
        runningCommentJobs !== null && runningCommentJobs <= 0 && ACTIVE_CATALOG_RUN_STATUSES.has(activeCommentsRunEffectiveStatus)
          ? "No comments shard is running right now; throughput and ETA are historical for this run."
          : null,
      postsLabel:
        totalPosts !== null
          ? `${formatInteger(completedPosts ?? 0)} / ${formatInteger(totalPosts)} posts checked`
          : completedPosts !== null
            ? `${formatInteger(completedPosts)} posts checked`
            : null,
      commentsProcessedLabel:
        commentsProcessed !== null ? `${formatInteger(commentsProcessed)} comments fetched this run` : null,
      commentsWrittenLabel:
        commentsWritten !== null ? `${formatInteger(commentsWritten)} comments upserted this run` : null,
      commentsInsertedLabel:
        commentsInserted !== null ? `${formatInteger(commentsInserted)} new comments saved this run` : null,
      commentsRefreshedLabel:
        commentsRefreshed !== null ? `${formatInteger(commentsRefreshed)} existing comments seen this run` : null,
      commentsChangedLabel:
        commentsChanged !== null ? `${formatInteger(commentsChanged)} existing comments changed this run` : null,
      postsCompletionLabel:
        completePosts !== null || incompletePosts !== null
          ? [
              completePosts !== null ? `${formatInteger(completePosts)} complete` : null,
              incompletePosts !== null ? `${formatInteger(incompletePosts)} incomplete` : null,
            ]
              .filter(Boolean)
              .join(" · ")
          : null,
      throughputLabel:
        postsPerMinute !== null || commentsPerMinute !== null
          ? [
              postsPerMinute !== null ? `${postsPerMinute.toFixed(1)} posts/min` : null,
              commentsPerMinute !== null ? `${commentsPerMinute.toFixed(1)} comments/min` : null,
              etaLabel ? `about ${etaLabel} remaining` : null,
            ]
              .filter(Boolean)
              .join(" · ")
          : null,
      savedLabel:
        savedComments !== null && reportedComments !== null
          ? `${formatInteger(savedComments)} saved comments / ${formatInteger(reportedComments)} reported comments`
          : savedComments !== null
            ? `${formatInteger(savedComments)} saved comments`
            : null,
    };
  }, [
    activeCommentsRunProgressData,
    activeCommentsRunEffectiveStatus,
    commentsRunMovement,
    summary?.comments_saved_summary?.retrieved_comments,
    summary?.comments_saved_summary?.saved_comments,
  ]);

  const activeCommentsRunScopeNotice = useMemo(
    () => getActiveCommentsRunScopeNotice(activeCommentsRunProgressData),
    [activeCommentsRunProgressData],
  );

  const activeCommentsProgressWarning = useMemo(
    () => formatActiveCommentsProgressWarning(rawActiveCommentsRunProgressData ?? activeCommentsRunProgressData),
    [activeCommentsRunProgressData, rawActiveCommentsRunProgressData],
  );

  const activeCommentsSummarySnapshot = useSharedPollingResource<{
    payload: SocialAccountProfileSnapshot;
    cacheStatus: string;
  }>({
    key: `social-account-profile-comments-summary:${platform}:${handle}:${activeCommentsRunId ?? "none"}`,
    shouldRun: !checking && Boolean(user) && hasAccess && platform === "instagram" && Boolean(activeCommentsRunId),
    intervalMs: COMMENTS_PROGRESS_POLL_INTERVAL_MS,
    fetchData: async (signal) => {
      return fetchProfileSnapshot({ signal, forceRefresh: true, detail: "lite" });
    },
  });

  useEffect(() => {
    const payload = activeCommentsSummarySnapshot.data?.payload;
    if (!payload) return;
    applyProfileSnapshotSummary(payload);
    if (payload.dashboard_freshness) {
      setDashboardFreshness(payload.dashboard_freshness);
    }
  }, [activeCommentsSummarySnapshot.data, applyProfileSnapshotSummary]);

  const catalogLaunchGuardMessage = useMemo(() => {
    return getCatalogLaunchGuardMessage(catalogRunProgress, cookieHealth);
  }, [catalogRunProgress, cookieHealth]);
  const instagramCommentsModalAuthActive = useMemo(() => {
    if (platform !== "instagram") return false;
    const activeCommentsStatus = String(activeCommentsRunProgressData?.run_status || "").trim().toLowerCase();
    return (
      ["queued", "running", "retrying", "pending"].includes(activeCommentsStatus) &&
      activeCommentsRunProgressData?.manual_auth_required !== true &&
      (activeCommentsRunProgressData?.manual_auth_required === false ||
        isCommentsEndpointProbeAdvisoryActive(activeCommentsRunProgressData))
    );
  }, [activeCommentsRunProgressData, platform]);
  const instagramCommentsAuthOwnsCurrentSurface =
    instagramCommentsModalAuthActive && selectedTab === "comments";
  const instagramPostsAuthStatusCopy = useMemo(() => {
    if (platform !== "instagram") return null;
    if (instagramCommentsModalAuthActive) {
      return { tone: "text-emerald-700", text: "Modal Instagram comments auth active" };
    }
    if (activeCommentsRunProgressData?.manual_auth_required === true) {
      return { tone: "text-red-600", text: "Instagram comments auth blocked" };
    }
    if (selectedTab === "comments") {
      return getInstagramCommentsAuthStatusCopy(cookieHealth);
    }
    return getInstagramPostsAuthStatusCopy(catalogRunProgress, cookieHealth);
  }, [activeCommentsRunProgressData, catalogRunProgress, cookieHealth, instagramCommentsModalAuthActive, platform, selectedTab]);
  const cookieHealthPrimaryLabel = useMemo(() => {
    if (!cookieHealth) return null;
    const sourceLabel = formatCookieHealthSourceLabel(cookieHealth);
    if (platform === "instagram" && selectedTab === "comments") {
      return `Cookie file present${sourceLabel}`;
    }
    return `Local cookies healthy${sourceLabel}`;
  }, [cookieHealth, platform, selectedTab]);
  const instagramCookiePayloadStatusCopy = useMemo(() => {
    if (platform !== "instagram") return null;
    return getInstagramCookiePayloadStatusCopy(cookieHealth, selectedTab);
  }, [cookieHealth, platform, selectedTab]);
  const showCookieHealthLoading =
    cookieHealthLoading &&
    !cookieHealth &&
    !instagramPostsAuthStatusCopy &&
    !instagramCookiePayloadStatusCopy;
  const showCookieHealthError = Boolean(cookieHealthError) && !cookieHealth;

  const catalogActionsBlocked =
    runningCatalogAction !== null ||
    cancellingCatalogRun ||
    activeCatalogRunBlocksActions ||
    cancellableCatalogRunIsActive ||
    activeCommentsRunBlocksActions;

  const catalogLaunchActionsBlocked =
    runningCatalogAction !== null ||
    cancellingCatalogRun ||
    activeCatalogRunBlocksActions ||
    cancellableCatalogRunIsActive ||
    activeCommentsRunBlocksActions ||
    Boolean(catalogLaunchGuardMessage);

  useEffect(() => {
    if (platform !== "instagram") return;
    if (String(catalogRunProgress?.operational_state || "").trim().toLowerCase() !== "blocked_auth") return;
    if (isInstagramPostsAuthVerified(cookieHealth)) {
      setCatalogActionMessage((current) => (current === INSTAGRAM_BACKFILL_BLOCKED_AUTH_MESSAGE ? null : current));
      return;
    }
    const repairStatus = String(catalogRunProgress?.repair_status || catalogRunProgress?.auth_repair_status || "")
      .trim()
      .toLowerCase();
    if (repairStatus === "running" || repairStatus === "succeeded") return;
    setCatalogActionMessage(INSTAGRAM_BACKFILL_BLOCKED_AUTH_MESSAGE);
  }, [
    catalogRunProgress?.auth_repair_status,
    catalogRunProgress?.operational_state,
    catalogRunProgress?.repair_status,
    cookieHealth,
    platform,
  ]);

  useEffect(() => {
    if (platform !== "instagram") return;
    const currentRunId = String(catalogRunProgress?.run_id || "").trim();
    if (!currentRunId || currentRunId !== String(displayedCatalogRunId || "").trim()) return;
    const launchState = String(catalogRunProgress?.launch_state || "").trim().toLowerCase();
    const runStatus = normalizeCatalogRunStatus(catalogRunProgress?.run_status);
    const hasQueuedJobs = Number(catalogRunProgress?.summary?.total_jobs ?? 0) > 0;
    const hasProgress =
      hasQueuedJobs ||
      Number(catalogRunProgress?.post_progress?.completed_posts ?? 0) > 0 ||
      ACTIVE_CATALOG_RUN_STATUSES.has(runStatus || "") ||
      TERMINAL_CATALOG_RUN_STATUSES.has(runStatus || "");
    if (!hasProgress || launchState === "pending" || launchState === "finalizing") return;
    setCatalogActionMessage((current) =>
      current?.startsWith("Instagram backfill accepted.") ? null : current,
    );
  }, [
    catalogRunProgress?.launch_state,
    catalogRunProgress?.post_progress?.completed_posts,
    catalogRunProgress?.run_id,
    catalogRunProgress?.run_status,
    catalogRunProgress?.summary?.total_jobs,
    displayedCatalogRunId,
    platform,
  ]);

  useEffect(() => {
    const currentRunId = String(catalogRunProgress?.run_id || "").trim();
    const displayedRunId = String(displayedCatalogRunId || "").trim();
    const replacementRunId = String(catalogReplacementRunId || "").trim();
    if (!currentRunId || !displayedRunId || currentRunId !== displayedRunId || !replacementRunId || !catalogAutoRequeueActive) {
      return;
    }
    const pivotKey = `${currentRunId}:${replacementRunId}`;
    if (catalogRuntimePivotRef.current === pivotKey) {
      return;
    }
    catalogRuntimePivotRef.current = pivotKey;
    setCatalogActionMessage(
      `Run ${shortRunId(currentRunId)} was superseded. Following replacement ${shortRunId(replacementRunId)}.`,
    );
    setCatalogProgressRunId(replacementRunId);
    setCatalogRunProgress(null);
    setCatalogRunProgressError(null);
    setCatalogLogsExpanded(false);
    catalogTerminalSummaryRefreshRunIdRef.current = null;
    void refreshProfileSnapshotNow({ runId: replacementRunId }).catch(() => {});
  }, [
    catalogAutoRequeueActive,
    catalogReplacementRunId,
    catalogRunProgress?.run_id,
    displayedCatalogRunId,
    refreshProfileSnapshotNow,
  ]);

  const catalogPhaseLabel = useMemo(() => {
    const progressLabel = getCatalogPhaseLabel(catalogRunProgress);
    if (progressLabel) {
      return progressLabel;
    }
    if (String(catalogRunProgress?.operational_state || "").trim().toLowerCase() === "blocked_auth") {
      return `${SOCIAL_ACCOUNT_PLATFORM_LABELS[platform]} auth blocked`;
    }
    if (String(catalogRunProgress?.operational_state || "").trim().toLowerCase() === "runtime_superseded") {
      return "Runtime superseded";
    }
    if (displayedCatalogRunStatus === "cancelled") {
      return "Run cancelled";
    }
    if (displayedCatalogRunStatus === "failed") {
      return "Run failed";
    }
    if (displayedCatalogRunStatus === "completed") {
      return "Catalog fetch complete";
    }
    return null;
  }, [catalogRunProgress, displayedCatalogRunStatus, platform]);
  const detailsRefreshProgress = useMemo(() => {
    return isDetailsRefreshCatalogProgress(catalogRunProgress);
  }, [catalogRunProgress]);

  const catalogDispatchStatusMessage = useMemo(() => {
    return getCatalogDispatchStatusMessage(catalogRunProgress);
  }, [catalogRunProgress]);
  const activeCatalogSourceScope = useMemo(() => {
    return resolveActiveCatalogSourceScope(summary, catalogRunProgress);
  }, [catalogRunProgress, summary]);
  const displayedCatalogRunStatusLabel = useMemo(() => {
    return getCatalogRunDisplayStatusLabel(displayedCatalogRunStatus, catalogRunProgress);
  }, [catalogRunProgress, displayedCatalogRunStatus]);
  const catalogBlockedAuthPresentation = useMemo(() => {
    if (String(catalogRunProgress?.operational_state || "").trim().toLowerCase() !== "blocked_auth") {
      return null;
    }
    const repairAction = catalogRunProgress?.repair_action;
    const repairStatus = String(catalogRunProgress?.repair_status || "").trim().toLowerCase();
    const resumeStage = String(catalogRunProgress?.resume_stage || "").trim().toLowerCase();
    const repairReason = String(catalogRunProgress?.repairable_reason || "").trim().replaceAll("_", " ");
    const repairCommand = String(catalogRunProgress?.repair_environment?.repair_command || "").trim();
    const liveBlockedRunId = String(catalogRunProgress?.run_id || "").trim();
    const displayedRunId = String(displayedCatalogRunId || "").trim();
    const displayedRunDiffersFromLiveBlockedRun = Boolean(
      liveBlockedRunId && displayedRunId && displayedRunId !== liveBlockedRunId,
    );
    const repairSupported = Boolean(repairAction) && Boolean(catalogRunProgress?.repair_environment?.supported);
    const canRepair = repairSupported && Boolean(liveBlockedRunId) && !displayedRunDiffersFromLiveBlockedRun;
    const platformLabel = SOCIAL_ACCOUNT_PLATFORM_LABELS[platform];
    const repairRunId = liveBlockedRunId || null;
    const repairButtonLabel = repairAction === "repair_instagram_auth" ? "Sync Validated Cookies" : "Refresh Cookies";
    const resumeLabel =
      resumeStage === "posts"
        ? "Manual auth checked, resuming from saved frontier."
        : "Manual auth checked, restarting discovery.";
    const repairDisabledReason = displayedRunDiffersFromLiveBlockedRun
      ? `Repair is available only on live blocked run ${shortRunId(liveBlockedRunId)}.`
      : !liveBlockedRunId
        ? "Repair is unavailable until live blocked-run progress reports a run id."
        : null;
    return {
      title: repairAction === "repair_instagram_auth" ? "Manual Instagram Auth Required" : `${platformLabel} Cookie Refresh Required`,
      repairAction,
      repairButtonLabel,
      canRepair,
      repairSupported,
      repairDisabledReason,
      repairStatus,
      repairReason,
      repairCommand,
      repairRunId,
      detail:
        repairStatus === "running" ?
          repairAction === "repair_instagram_auth" ?
            "Checking the manual-auth state and syncing only already validated cookies."
          : `Refreshing ${platformLabel} cookies. A local headed Chrome window will open for confirmation.`
        : repairStatus === "succeeded" || catalogRunProgress?.auto_resume_pending ?
          resumeLabel
        : canRepair ?
          repairAction === "repair_instagram_auth" ?
            "Instagram blocked this catalog run before jobs were queued. Complete manual auth first, then sync already validated cookies."
          : `${platformLabel} cookies must be refreshed before this catalog run can continue. A local headed Chrome window will open for confirmation.`
        : `${platformLabel} auth must be completed manually before this catalog run can continue.`,
    };
  }, [catalogRunProgress, displayedCatalogRunId, platform]);
  const catalogAlertCodes = useMemo(() => {
    return new Set(
      (catalogRunProgress?.alerts ?? [])
        .map((alert) => String(alert.code || "").trim().toLowerCase())
        .filter((code) => code.length > 0),
    );
  }, [catalogRunProgress?.alerts]);
  const visibleCatalogOperationalAlerts = useMemo(() => {
    return (catalogRunProgress?.alerts ?? []).filter((alert) => !isRuntimeVersionAlertCode(alert.code));
  }, [catalogRunProgress?.alerts]);
  const hasActiveCatalogRecovery = useMemo(() => {
    const recoveryStatus = String(catalogRunProgress?.recovery?.status || "").trim().toLowerCase();
    return ACTIVE_CATALOG_RECOVERY_STATUSES.has(recoveryStatus);
  }, [catalogRunProgress?.recovery?.status]);
  const shouldShowCatalogRecovery = useMemo(() => {
    return hasCatalogRecoveryDetails(catalogRunProgress?.recovery);
  }, [catalogRunProgress?.recovery]);
  const canRetryTikTokLocally = useMemo(() => {
    if (platform !== "tiktok" || !isLocalDevHost || displayedCatalogRunStatus !== "failed") {
      return false;
    }
    if (activeCatalogRunBlocksActions || cancellableCatalogRunIsActive || hasActiveCatalogRecovery) {
      return false;
    }
    const lastErrorCode = String(catalogRunProgress?.last_error_code || "").trim().toLowerCase();
    return (
      lastErrorCode === TIKTOK_EMPTY_FIRST_PAGE_ERROR_CODE ||
      catalogAlertCodes.has(TIKTOK_EMPTY_FIRST_PAGE_ALERT_CODE) ||
      catalogAlertCodes.has(TIKTOK_DIRECT_FALLBACK_FAILED_ALERT_CODE)
    );
  }, [
    activeCatalogRunBlocksActions,
    cancellableCatalogRunIsActive,
    catalogAlertCodes,
    catalogRunProgress?.last_error_code,
    displayedCatalogRunStatus,
    hasActiveCatalogRecovery,
    isLocalDevHost,
    platform,
  ]);
  const canRetryInstagramLocally = useMemo(() => {
    if (platform !== "instagram" || !isLocalDevHost || displayedCatalogRunStatus !== "failed") {
      return false;
    }
    if (activeCatalogRunBlocksActions || cancellableCatalogRunIsActive || hasActiveCatalogRecovery) {
      return false;
    }
    const operationalState = String(catalogRunProgress?.operational_state || "").trim().toLowerCase();
    if (operationalState === "blocked_auth") {
      return true;
    }
    const latestRemoteBlockedReason = String(
      catalogRunProgress?.dispatch_health?.latest_remote_blocked_reason || "",
    )
      .trim()
      .toLowerCase();
    const latestDispatchErrorCode = String(catalogRunProgress?.dispatch_health?.latest_dispatch_error_code || "")
      .trim()
      .toLowerCase();
    return (
      Array.from(INSTAGRAM_LOCAL_FALLBACK_ALERT_CODES).some((code) => catalogAlertCodes.has(code)) ||
      latestRemoteBlockedReason.endsWith("_remote_auth_unavailable") ||
      latestDispatchErrorCode.endsWith("_remote_auth_unavailable")
    );
  }, [
    activeCatalogRunBlocksActions,
    cancellableCatalogRunIsActive,
    catalogAlertCodes,
    catalogRunProgress?.dispatch_health?.latest_dispatch_error_code,
    catalogRunProgress?.dispatch_health?.latest_remote_blocked_reason,
    catalogRunProgress?.operational_state,
    displayedCatalogRunStatus,
    hasActiveCatalogRecovery,
    isLocalDevHost,
    platform,
  ]);
  const canRetryCatalogLocally = canRetryTikTokLocally || canRetryInstagramLocally;

  const catalogGapAnalysisPresentation = useMemo(() => {
    if (!catalogGapAnalysis) return null;
    const sampleIds = (catalogGapAnalysis.sample_missing_source_ids ?? []).slice(0, 5).join(", ");
    if (catalogGapAnalysis.gap_type === "tail_gap") {
      return {
        tone: "border-amber-200 bg-amber-50 text-amber-900",
        title: "Catalog backfill stopped before the historical tail completed",
        detail: catalogGapAnalysis.has_resumable_frontier
          ? "Use Backfill Posts to resume the saved frontier automatically before continuing the full-history crawl."
          : "Older posts are missing from the catalog and no saved frontier is available.",
        sampleIds,
      };
    }
    if (catalogGapAnalysis.gap_type === "head_gap") {
      return {
        tone: "border-blue-200 bg-blue-50 text-blue-900",
        title: "Catalog is missing newer posts at the head",
        detail: "Use Sync Newer to fetch posts published after the newest stored catalog post.",
        sampleIds,
      };
    }
    if (catalogGapAnalysis.gap_type === "interior_gaps") {
      return {
        tone: "border-red-200 bg-red-50 text-red-900",
        title: "Catalog has interior gaps",
        detail: "The missing posts are neither purely newer nor purely older, so a bounded repair window is recommended.",
        sampleIds,
      };
    }
    if (catalogGapAnalysis.gap_type === "source_total_drift") {
      return {
        tone: "border-zinc-300 bg-zinc-100 text-zinc-800",
        title: "Catalog totals drift without a confirmed gap direction",
        detail: "Totals show the catalog trails the live profile, but diagnostics could not yet prove whether the missing posts are newer, older, or interior gaps.",
        sampleIds,
      };
    }
    if (catalogGapAnalysis.gap_type === "active_run") {
      return {
        tone: "border-zinc-300 bg-zinc-100 text-zinc-800",
        title: "Gap analysis is waiting on the active run",
        detail: "Wait for the current catalog run to finish before choosing another repair action.",
        sampleIds,
      };
    }
    return {
      tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
      title: "Catalog counts reconcile cleanly",
      detail: "No stored-data gap was found between owner materialized posts and owner catalog rows.",
      sampleIds,
    };
  }, [catalogGapAnalysis]);

  const catalogGapAnalysisDeferred = useMemo(() => {
    return (
      canRequestCatalogGapAnalysis &&
      catalogGapAnalysisStatus === "idle" &&
      !catalogGapAnalysisLoading &&
      !catalogGapAnalysis
    );
  }, [
    canRequestCatalogGapAnalysis,
    catalogGapAnalysis,
    catalogGapAnalysisLoading,
    catalogGapAnalysisStatus,
  ]);

  const catalogDiagnosticsVisible = useMemo(() => {
    return (
      supportsCatalog &&
      platform === "instagram" &&
      (catalogFreshnessLoading ||
        catalogFreshness !== null ||
        catalogFreshnessError !== null ||
        secondaryReadsPressurePause !== null ||
        catalogCountsMismatch ||
        catalogGapAnalysisLoading ||
        catalogGapAnalysis !== null ||
        catalogGapAnalysisError !== null)
    );
  }, [
    catalogCountsMismatch,
    catalogFreshness,
    catalogFreshnessError,
    catalogFreshnessLoading,
    catalogGapAnalysis,
    catalogGapAnalysisError,
    catalogGapAnalysisLoading,
    platform,
    secondaryReadsPressurePause,
    supportsCatalog,
  ]);

  const catalogHasCountDrift = Boolean((catalogFreshness?.delta_posts ?? 0) > 0);

  const catalogFreshnessStatusCopy = useMemo(() => {
    if (catalogFreshnessLoading) {
      return {
        tone: "text-zinc-600",
        text: "Freshness check is running.",
      };
    }
    if (catalogFreshnessError) {
      return {
        tone: isBackendPressureError(catalogFreshnessError) ? "text-amber-800" : "text-red-700",
        text: catalogFreshness
          ? `Freshness check paused automatic retries. Showing the last usable catalog data.`
          : formatCatalogDiagnosticErrorMessage("Freshness check", catalogFreshnessError),
      };
    }
    if (isCatalogFreshnessDegraded(catalogFreshness as CatalogFreshnessPayload | null)) {
      return {
        tone: "text-amber-800",
        text: "Freshness check returned partial data. Automatic retries are paused; saved catalog data remains usable.",
      };
    }
    if (secondaryReadsPressurePause) {
      return {
        tone: "text-amber-800",
        text: "Secondary profile reads are paused while the backend recovers.",
      };
    }
    if (catalogFreshness && catalogFreshness.eligible) {
      return {
        tone: catalogHasCountDrift ? "text-amber-800" : "text-emerald-800",
        text: catalogHasCountDrift
          ? `Catalog totals trail the live profile by ${formatInteger(catalogFreshness.delta_posts)} post${
              catalogFreshness.delta_posts === 1 ? "" : "s"
            }. Stored ${formatInteger(catalogFreshness.stored_total_posts)} posts${
              catalogFreshness.live_total_posts_current !== null &&
              catalogFreshness.live_total_posts_current !== undefined
                ? `; live profile shows ${formatInteger(catalogFreshness.live_total_posts_current)}`
                : ""
            }.`
          : `Catalog is up to date. Stored ${formatInteger(catalogFreshness.stored_total_posts)} posts${
              catalogFreshness.live_total_posts_current !== null &&
              catalogFreshness.live_total_posts_current !== undefined
                ? `; live profile shows ${formatInteger(catalogFreshness.live_total_posts_current)}`
                : ""
            }.`,
      };
    }
    return null;
  }, [catalogFreshness, catalogFreshnessError, catalogFreshnessLoading, catalogHasCountDrift, secondaryReadsPressurePause]);

  const catalogGapAnalysisStatusCopy = useMemo(() => {
    if (!catalogCountsMismatch) {
      return {
        tone: "text-emerald-800",
        text: "Gap analysis is not needed while totals reconcile cleanly.",
      };
    }
    if (catalogGapAnalysisLoading) {
      return {
        tone: "text-zinc-600",
        text: catalogGapAnalysisStale
          ? "Gap analysis is running in the background. Showing the last completed result while it refreshes."
          : "Gap analysis is running in the background.",
      };
    }
    if (catalogGapAnalysisError) {
      return {
        tone: "text-red-700",
        text: formatCatalogDiagnosticErrorMessage("Gap analysis", catalogGapAnalysisError),
      };
    }
    if (catalogGapAnalysisPresentation) {
      return {
        tone: "text-zinc-700",
        text: catalogGapAnalysisPresentation.title,
      };
    }
    if (catalogGapAnalysisDeferred) {
      return {
        tone: "text-zinc-600",
        text: "Gap analysis is deferred until you request it.",
      };
    }
    return null;
  }, [
    catalogCountsMismatch,
    catalogGapAnalysisDeferred,
    catalogGapAnalysisError,
    catalogGapAnalysisLoading,
    catalogGapAnalysisPresentation,
    catalogGapAnalysisStale,
  ]);

  const shouldRunLiveProfileSnapshot =
    !checking &&
    Boolean(user) &&
    hasAccess &&
    supportsCatalog &&
    Boolean(backgroundCatalogRunId) &&
    (ACTIVE_CATALOG_RUN_STATUSES.has(
      normalizeCatalogRunStatus(catalogRunProgress?.run_status ?? activeCatalogRun?.status) || "",
    ) ||
      (
        Boolean(selectedCatalogRunId) &&
        selectedCatalogRunId === backgroundCatalogRunId &&
        (
          !catalogRunProgress ||
          catalogRunProgress.run_id !== backgroundCatalogRunId ||
          ["pending", "finalizing"].includes(String(catalogRunProgress.launch_state || "").trim().toLowerCase())
        )
      ));

  const liveProfileSnapshot = useSharedPollingResource<{
    payload: SocialAccountProfileSnapshot;
    cacheStatus: string;
  }>({
    key: `social-account-profile-snapshot:${platform}:${handle}:${backgroundCatalogRunId ?? "none"}:${catalogProgressRequestNonce}`,
    shouldRun: shouldRunLiveProfileSnapshot,
    intervalMs: CATALOG_PROGRESS_POLL_INTERVAL_MS,
    fetchData: async (signal) => {
      const normalizedRunId = String(backgroundCatalogRunId || "").trim();
      if (normalizedRunId) {
        const progressBody = await fetchCatalogRunProgressSnapshot(normalizedRunId, { signal, fast: true });
        return {
          payload: {
            summary: null,
            catalog_run_progress: progressBody,
            generated_at: new Date().toISOString(),
          } as SocialAccountProfileSnapshot,
          cacheStatus: "direct-progress",
        };
      }
      try {
        return await fetchProfileSnapshot({ signal });
      } catch (snapshotError) {
        // Fall back to the legacy direct catalog-progress endpoint so a degraded
        // snapshot cache does not break live polling of a running catalog job.
        if (!backgroundCatalogRunId || !user) throw snapshotError;
        const normalizedRunId = String(backgroundCatalogRunId).trim();
        if (!normalizedRunId) throw snapshotError;
        const progressBody = await fetchCatalogRunProgressSnapshot(normalizedRunId, { signal, fast: true });
        return {
          payload: {
            summary: null,
            catalog_run_progress: progressBody,
            generated_at: new Date().toISOString(),
          } as SocialAccountProfileSnapshot,
          cacheStatus: "fallback-direct",
        };
      }
    },
  });

  useEffect(() => {
    if (!backgroundCatalogRunId) {
      setCatalogProgressSaturationActive(false);
      return;
    }
    setCatalogRunProgressLoading(liveProfileSnapshot.connected && !liveProfileSnapshot.data);
  }, [backgroundCatalogRunId, liveProfileSnapshot.connected, liveProfileSnapshot.data]);

  useEffect(() => {
    if (!liveProfileSnapshot.data) return;
    const payload = liveProfileSnapshot.data.payload;
    applyProfileSnapshotSummary(payload);
    if (payload.dashboard_freshness) {
      setDashboardFreshness(payload.dashboard_freshness);
    }
    if (payload.catalog_run_progress) {
      setCatalogProgressSaturationActive(false);
      setCatalogRunProgress(payload.catalog_run_progress);
      setCatalogRunProgressError(null);
      setCatalogProgressLastSuccessAt(payload.generated_at ?? new Date().toISOString());
      setCatalogRunProgressLoading(false);
    }
  }, [applyProfileSnapshotSummary, liveProfileSnapshot.data]);

  useEffect(() => {
    if (!liveProfileSnapshot.error) return;
    const requestError = toSharedLiveResourceRequestError(
      liveProfileSnapshot.error,
      liveProfileSnapshot.errorDetails,
    );
    if (isBackendSaturationError(requestError)) {
      setCatalogProgressSaturationActive(true);
    } else {
      setCatalogProgressSaturationActive(false);
    }
    setCatalogRunProgressLoading(false);
    if (catalogRunProgress?.run_id) {
      setCatalogRunProgressError(null);
      return;
    }
    setCatalogRunProgressError(requestError.message);
  }, [catalogRunProgress?.run_id, liveProfileSnapshot.error, liveProfileSnapshot.errorDetails]);

  useEffect(() => {
    const runId = String(catalogRunProgress?.run_id || "").trim();
    const runStatus = String(catalogRunProgress?.run_status || "").trim().toLowerCase();
    if (catalogProgressSaturationActive) return;
    if (!runId || !TERMINAL_CATALOG_RUN_STATUSES.has(runStatus)) return;
    storeCatalogProgressRunId(catalogProgressStorageKey, null);
    if (catalogTerminalSummaryRefreshRunIdRef.current === runId) return;
    catalogTerminalSummaryRefreshRunIdRef.current = runId;
    void refreshSummary().catch(() => {});
  }, [
    catalogProgressSaturationActive,
    catalogProgressStorageKey,
    catalogRunProgress?.run_id,
    catalogRunProgress?.run_status,
    refreshSummary,
  ]);

  const catalogStageEntries = useMemo(() => {
    return Object.entries(catalogRunProgress?.stages ?? {})
      .map(([stage, stats]) => [stage, normalizeStageStats(stats)] as const)
      .filter(([, stats]) => stats.total > 0 || stats.active > 0 || stats.scraped > 0 || stats.saved > 0)
      .sort(([left], [right]) => {
        const leftOrder = CATALOG_STAGE_SORT_ORDER[left] ?? 50;
        const rightOrder = CATALOG_STAGE_SORT_ORDER[right] ?? 50;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return left.localeCompare(right);
      });
  }, [catalogRunProgress?.stages]);

  const catalogTerminalNoStageTelemetryMessage = useMemo(() => {
    if (catalogRunProgressLoading || catalogStageEntries.length > 0) return null;
    if (!TERMINAL_CATALOG_RUN_STATUSES.has(displayedCatalogRunStatus)) return null;
    if (displayedCatalogRunStatus === "completed") {
      return "This completed run did not report stage-level progress telemetry.";
    }
    return "This terminal run did not report stage-level progress telemetry.";
  }, [catalogRunProgressLoading, catalogStageEntries.length, displayedCatalogRunStatus]);

  const catalogProgressSummary = useMemo(() => {
    const summaryPayload = catalogRunProgress?.summary ?? {};
    const stageStats = catalogStageEntries.map(([, stats]) => stats);
    const total = Number(summaryPayload.total_jobs ?? stageStats.reduce((sum, stage) => sum + stage.total, 0));
    const completed = Number(summaryPayload.completed_jobs ?? stageStats.reduce((sum, stage) => sum + stage.completed, 0));
    const failed = Number(summaryPayload.failed_jobs ?? stageStats.reduce((sum, stage) => sum + stage.failed, 0));
    const active = Number(summaryPayload.active_jobs ?? stageStats.reduce((sum, stage) => sum + stage.active, 0));
    const running = stageStats.reduce((sum, stage) => sum + stage.running, 0);
    const waiting = stageStats.reduce((sum, stage) => sum + stage.waiting, 0);
    const items = Number(summaryPayload.items_found_total ?? stageStats.reduce((sum, stage) => sum + stage.scraped, 0));
    const finished = completed + failed;
    const pct = total > 0 ? Math.round((finished / total) * 100) : active > 0 ? 5 : 0;
    return {
      total,
      completed,
      failed,
      active,
      running,
      waiting,
      items,
      finished,
      pct: Math.max(0, Math.min(100, pct)),
    };
  }, [catalogRunProgress?.summary, catalogStageEntries]);

  const catalogProgressActionScope = useMemo<SocialAccountCatalogActionScope | null>(() => {
    return (
      normalizeCatalogActionScope(catalogRunProgress?.catalog_action_scope) ??
      normalizeCatalogActionScope(displayedCatalogRunSummary?.catalog_action_scope)
    );
  }, [catalogRunProgress?.catalog_action_scope, displayedCatalogRunSummary?.catalog_action_scope]);

  const catalogProgressMode = useMemo<"coverage" | "bounded">(() => {
    return catalogProgressActionScope && BOUNDED_CATALOG_ACTION_SCOPES.has(catalogProgressActionScope)
      ? "bounded"
      : "coverage";
  }, [catalogProgressActionScope]);

  const catalogPostProgress = useMemo(() => {
    const payload = catalogRunProgress?.post_progress ?? {};
    const rawCompleted = Number(payload.completed_posts ?? 0);
    const terminalRunHasNoStageTelemetry =
      TERMINAL_CATALOG_RUN_STATUSES.has(displayedCatalogRunStatus) && catalogStageEntries.length === 0;
    const summarySavedTotal = Number(summary?.catalog_total_posts ?? summary?.total_posts ?? 0);
    const summaryAccountTotal = Number(summary?.live_total_posts ?? summary?.total_posts ?? 0);
    const payloadTotal = Number(payload.total_posts ?? 0);
    const terminalSummaryCompletedFallback =
      terminalRunHasNoStageTelemetry && displayedCatalogRunStatus === "completed" && summarySavedTotal > 0
        ? Math.max(summarySavedTotal, payloadTotal)
        : 0;
    const discoveryScraped = Number(catalogRunProgress?.stages?.shared_account_discovery?.scraped_count ?? 0);
    const fetchScraped = Number(catalogRunProgress?.stages?.shared_account_posts?.scraped_count ?? 0);
    const hasFetchStageTelemetry =
      Boolean(catalogRunProgress?.stages?.shared_account_discovery) ||
      Boolean(catalogRunProgress?.stages?.shared_account_posts);
    const completed =
      rawCompleted > 0
        ? rawCompleted
        : Math.max(
            discoveryScraped,
            fetchScraped,
            terminalSummaryCompletedFallback,
            hasFetchStageTelemetry ? 0 : Number(catalogProgressSummary.items ?? 0),
          );
    const rawPersisted =
      payload.saved_posts != null ? Number(payload.saved_posts ?? 0)
      : payload.matched_posts != null ? Number(payload.matched_posts ?? 0)
      : terminalSummaryCompletedFallback;
    const persisted = Math.max(rawPersisted, terminalSummaryCompletedFallback);
    const fallbackTotal = summaryAccountTotal;
    const total =
      catalogProgressMode === "coverage"
        ? Math.max(payloadTotal, fallbackTotal)
        : payloadTotal || fallbackTotal;
    const displayedCompleted = total > 0 ? Math.min(completed, total) : completed;
    const displayedPersisted = total > 0 ? Math.min(persisted, total) : persisted;
    const roundedCoveragePct = total > 0 ? Math.round((displayedCompleted / total) * 100) : catalogProgressSummary.pct;
    const pct =
      catalogProgressMode === "bounded"
        ? displayedCatalogRunStatus === "completed" && catalogProgressSummary.total <= 0 && completed > 0
          ? 100
          : catalogProgressSummary.pct
        : completed > 0 && total > 0 && roundedCoveragePct === 0
          ? 1
          : roundedCoveragePct;
    return {
      completed,
      persisted,
      total,
      pct: Math.max(0, Math.min(100, pct)),
      displayedCompleted,
      displayedPersisted,
      hasTotal: total > 0,
      hasCompleted: displayedCompleted > 0,
    };
  }, [
    catalogProgressSummary.items,
    catalogProgressSummary.pct,
    catalogProgressSummary.total,
    catalogRunProgress?.post_progress,
    catalogRunProgress?.stages?.shared_account_discovery,
    catalogRunProgress?.stages?.shared_account_posts,
    catalogProgressMode,
    catalogStageEntries.length,
    displayedCatalogRunStatus,
    summary?.catalog_total_posts,
    summary?.live_total_posts,
    summary?.total_posts,
  ]);

  const catalogProgressBarWidthPct = useMemo(() => {
    if (TERMINAL_CATALOG_RUN_STATUSES.has(displayedCatalogRunStatus)) {
      return Math.max(0, Math.min(100, catalogPostProgress.pct));
    }
    return Math.max(catalogPostProgress.pct, 2);
  }, [catalogPostProgress.pct, displayedCatalogRunStatus]);

  const postDetailsBackfillActiveBanner = useMemo(() => {
    if (platform !== "instagram" || !supportsCatalog || !catalogRunProgress) return null;
    const runId = String(catalogRunProgress.run_id || displayedCatalogRunId || "").trim();
    const status = normalizeCatalogRunStatus(catalogRunProgress.run_status || displayedCatalogRunStatus);
    if (!runId || !ACTIVE_CATALOG_RUN_STATUSES.has(status)) return null;
    if (!isDetailsRefreshCatalogProgress(catalogRunProgress)) return null;
    const progressLabel = catalogPostProgress.hasTotal
      ? `${formatInteger(catalogPostProgress.displayedCompleted)} / ${formatInteger(catalogPostProgress.total)} posts checked`
      : catalogPostProgress.hasCompleted
        ? `${formatInteger(catalogPostProgress.displayedCompleted)} posts checked`
        : "Preparing post-detail workers";
    return {
      runId,
      statusLabel: getCatalogRunDisplayStatusLabel(status, catalogRunProgress),
      progressLabel,
    };
  }, [
    catalogPostProgress.displayedCompleted,
    catalogPostProgress.hasCompleted,
    catalogPostProgress.hasTotal,
    catalogPostProgress.total,
    catalogRunProgress,
    displayedCatalogRunId,
    displayedCatalogRunStatus,
    platform,
    supportsCatalog,
  ]);

  const commentsSyncActiveBanner = useMemo(() => {
    if (platform !== "instagram" || !activeCommentsRunId || !activeCommentsRunIsActive) return null;
    return {
      runId: activeCommentsRunId,
      statusLabel: activeCommentsProgressSummary.status,
      progressLabel: activeCommentsProgressSummary.postsLabel ?? "Preparing comments workers",
      throughputLabel: activeCommentsProgressSummary.throughputLabel,
    };
  }, [
    activeCommentsProgressSummary.postsLabel,
    activeCommentsProgressSummary.status,
    activeCommentsProgressSummary.throughputLabel,
    activeCommentsRunId,
    activeCommentsRunIsActive,
    platform,
  ]);

  const commentsShardHealthSummary = useMemo(() => {
    let failed = 0;
    let retrying = 0;
    let running = 0;
    let queued = 0;
    let complete = 0;
    const issueReasons = new Set<string>();
    for (const { row, shard } of activeCommentsProgressRankedRows) {
      const status = String(row.status ?? row.job_status ?? "").trim().toLowerCase();
      if (status === "failed") failed += 1;
      if (status === "retrying") retrying += 1;
      if (status === "running") running += 1;
      if (status === "queued" || status === "pending") queued += 1;
      if (status === "completed" || status === "complete") complete += 1;
      if (shard.issueLabel) {
        issueReasons.add(formatDiagnosticToken(shard.issueLabel));
      }
    }
    return {
      failed,
      retrying,
      running,
      queued,
      complete,
      total: activeCommentsProgressRankedRows.length,
      issueReasons: Array.from(issueReasons).slice(0, 3),
    };
  }, [activeCommentsProgressRankedRows]);

  const catalogLaneCards = useMemo(
    () =>
      buildCatalogLaneCards({
        progress: catalogRunProgress,
        runStatus: catalogRunProgress?.run_status ?? displayedCatalogRunStatus,
        selectedTasks: catalogRunProgress?.selected_tasks,
        effectiveSelectedTasks: catalogRunProgress?.effective_selected_tasks,
        commentsRunId: catalogRunProgress?.comments_run_id,
        attachedFollowups: catalogRunProgress?.attached_followups,
      }),
	    [
	      catalogRunProgress,
	      displayedCatalogRunStatus,
	    ],
	  );

  const catalogTerminalCoverageMessage = useMemo(() => {
    if (catalogProgressMode !== "coverage") return null;
    const status = displayedCatalogRunStatus;
    if (!TERMINAL_CATALOG_RUN_STATUSES.has(status)) return null;
    if (!catalogPostProgress.hasTotal || catalogPostProgress.total <= 0) return null;
    if (catalogPostProgress.completed >= catalogPostProgress.total) return null;
    const discoveryComplete = Number(catalogRunProgress?.discovery?.completed_count ?? 0) > 0;
    if (!discoveryComplete && status !== "failed") return null;
    if (catalogRunProgress?.completion_gap_reason === "source_total_drift") {
      return `Catalog fetch reached the stored frontier, but the live source total moved during the run. This run checked ${formatInteger(catalogPostProgress.completed)} of the original ${formatInteger(catalogPostProgress.total)} expected posts.`;
    }
    if (
      catalogRunProgress?.completion_gap_reason === "fetch_incomplete" &&
      catalogRunProgress?.recovery?.reason === "no_partitions_discovered" &&
      !["queued", "running", "fallback_enqueued", "blocked"].includes(
        String(catalogRunProgress?.recovery?.status || "").trim().toLowerCase(),
      )
    ) {
      return `History discovery completed, but recovery did not produce catalog fetch work. This run only checked ${formatInteger(catalogPostProgress.completed)} of ${formatInteger(catalogPostProgress.total)} posts before stopping with no partitions discovered.`;
    }
    return `History discovery finished, but this run only checked ${formatInteger(catalogPostProgress.completed)} of ${formatInteger(catalogPostProgress.total)} posts. Review recent logs before starting the next backfill.`;
  }, [
    catalogPostProgress.completed,
    catalogPostProgress.hasTotal,
    catalogPostProgress.total,
    catalogProgressMode,
    catalogRunProgress?.completion_gap_reason,
    catalogRunProgress?.recovery?.reason,
    catalogRunProgress?.recovery?.status,
    catalogRunProgress?.discovery?.completed_count,
    displayedCatalogRunStatus,
  ]);

  const catalogRunDiagnostics = catalogRunProgress?.run_diagnostics;

  const catalogRuntimeMessage = useMemo(() => {
    const executionBackend = String(catalogRunDiagnostics?.effective_execution_backend || "").trim();
    const declaredRunner = String(catalogRunDiagnostics?.declared_runner_strategy || "").trim();
    const effectiveRunner = String(catalogRunDiagnostics?.effective_runner_strategy || "").trim();
    const strategyMismatch = Boolean(catalogRunDiagnostics?.strategy_mismatch);
    const postsAuthMode = platform === "instagram" ? formatInstagramPostsAuthMode(catalogRunProgress) : null;
    const parts: string[] = [];
    if (executionBackend) {
      parts.push(`Executor ${executionBackend}`);
    }
    if (strategyMismatch && declaredRunner && effectiveRunner) {
      parts.push(`Strategy drift ${formatDiagnosticToken(declaredRunner)} -> ${formatDiagnosticToken(effectiveRunner)}`);
    } else if (effectiveRunner) {
      parts.push(`Strategy ${formatDiagnosticToken(effectiveRunner)}`);
    }
    if (postsAuthMode) {
      parts.push(postsAuthMode);
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [
    catalogRunProgress,
    catalogRunDiagnostics,
    platform,
  ]);

  const catalogRunWindowMessage = useMemo(() => formatCatalogRunWindow(catalogRunProgress), [catalogRunProgress]);

  const catalogStopMessage = useMemo(() => {
    const frontierStopReason = String(
      catalogRunProgress?.stop_reason || catalogRunDiagnostics?.frontier_stop_reason || "",
    ).trim().toLowerCase();
    if (frontierStopReason === "checkpoint_required") {
      return "Instagram auth is checkpointed. This run is blocked and should not be treated as a complete post backfill.";
    }
    if (frontierStopReason === "pagination_doc_id_stale" || catalogRunProgress?.pagination_doc_id_stale) {
      return "Instagram pagination doc ID looks stale. Listing stopped before details, comments, or media could be considered complete.";
    }
    if (frontierStopReason === "cursor_expired_restart_required") {
      return "The saved cursor expired. Restart this listing pass intentionally instead of assuming the prior partial scrape finished.";
    }
    if (frontierStopReason === "awaiting_enrichment") {
      return "Listing has saved the reachable posts. Details, comments, and media are still separate follow-up phases.";
    }
    if (catalogRunProgress?.partial_scrape) {
      return "This is a partial scrape. Details, comments, and media should stay eligible until their lanes report completion.";
    }
    if (
      frontierStopReason === "catalog_oldest_stored_post_not_reached" &&
      catalogRunDiagnostics?.oldest_posted_at_seen &&
      catalogRunDiagnostics?.catalog_oldest_post_at
    ) {
      return `Runner stopped at ${formatDateTime(catalogRunDiagnostics.oldest_posted_at_seen)} even though the earliest saved catalog post is ${formatDateTime(catalogRunDiagnostics.catalog_oldest_post_at)}. This backfill did not reach the full history yet.`;
    }
    const failedRecoveryAlert = (catalogRunProgress?.alerts ?? []).find(
      (alert) => String(alert.code || "").trim().toLowerCase() === TIKTOK_DIRECT_FALLBACK_FAILED_ALERT_CODE,
    );
    if (displayedCatalogRunStatus === "failed" && failedRecoveryAlert?.message) {
      return failedRecoveryAlert.message;
    }
    const lastErrorMessage = String(catalogRunProgress?.last_error_message || catalogRunDiagnostics?.last_error_message || "").trim();
    if (lastErrorMessage) {
      return lastErrorMessage;
    }
    const cancelReason = String(catalogRunProgress?.cancel_reason || catalogRunDiagnostics?.cancel_reason || "").trim();
    if (cancelReason) {
      return `Run cancel reason: ${formatDiagnosticToken(cancelReason)}.`;
    }
    const lastErrorCode = String(catalogRunProgress?.last_error_code || catalogRunDiagnostics?.last_error_code || "").trim();
    if (lastErrorCode) {
      return `Run error code: ${formatDiagnosticToken(lastErrorCode)}.`;
    }
    return null;
  }, [
    displayedCatalogRunStatus,
    catalogRunProgress?.alerts,
    catalogRunProgress?.cancel_reason,
    catalogRunProgress?.last_error_code,
    catalogRunProgress?.last_error_message,
    catalogRunProgress?.pagination_doc_id_stale,
    catalogRunProgress?.partial_scrape,
    catalogRunProgress?.stop_reason,
    catalogRunDiagnostics,
  ]);

  const catalogScrapeCompletionMessage = useMemo(() => {
    if (!catalogRunProgress?.scrape_complete) return null;
    if (catalogRunProgress?.classify_incomplete) {
      return "Catalog fetch is complete. Saved catalog totals and hashtags are live while post classification finishes in the background.";
    }
    return "Catalog fetch is complete and the saved catalog totals shown above reflect the latest stored rows.";
  }, [catalogRunProgress?.classify_incomplete, catalogRunProgress?.scrape_complete]);

  const commentsSavedCount = useMemo(() => {
    return Number(summary?.comments_saved_summary?.saved_comments ?? 0);
  }, [summary?.comments_saved_summary?.saved_comments]);

  const commentsRetrievedCount = useMemo(
    () => Number(summary?.comments_saved_summary?.retrieved_comments ?? 0),
    [summary?.comments_saved_summary?.retrieved_comments],
  );
  const commentsGapCount = useMemo(
    () => Math.max(0, commentsRetrievedCount - commentsSavedCount),
    [commentsRetrievedCount, commentsSavedCount],
  );
  const commentsSavedSummaryUnavailable = !summaryInitialStatePending && summary?.comments_saved_summary == null;

  const mediaSavedFiles = useMemo(
    () => Number(summary?.media_coverage?.saved_files ?? 0),
    [summary?.media_coverage?.saved_files],
  );

  const mediaTotalFiles = useMemo(
    () => Number(summary?.media_coverage?.total_files ?? 0),
    [summary?.media_coverage?.total_files],
  );

  const mediaCoverageUnavailable = !summaryInitialStatePending && summary?.media_coverage == null;

  const catalogProgressDiagnosticRows = useMemo(
    () => buildCatalogProgressDiagnosticRows(catalogRunProgress, summary),
    [catalogRunProgress, summary],
  );

  const displayLastPostAt = useMemo(() => {
    if (supportsCatalog && Number(summary?.live_catalog_total_posts ?? 0) > 0 && summary?.live_catalog_last_post_at) {
      return summary.live_catalog_last_post_at;
    }
    if (supportsCatalog && Number(catalogCardPreview?.total ?? 0) > 0 && catalogCardPreview?.latestPostedAt) {
      return catalogCardPreview.latestPostedAt;
    }
    return summary?.last_post_at;
  }, [
    catalogCardPreview?.latestPostedAt,
    catalogCardPreview?.total,
    summary?.last_post_at,
    summary?.live_catalog_last_post_at,
    summary?.live_catalog_total_posts,
    supportsCatalog,
  ]);

  const catalogStuckQueueRecoveryRecommended = useMemo(() => {
    const dispatchHealth = catalogRunProgress?.dispatch_health;
    return (
      platform === "instagram" &&
      shouldRenderCatalogRunProgressCard &&
      (Boolean(catalogDispatchStatusMessage) ||
        Number(dispatchHealth?.queued_unclaimed_jobs ?? 0) > 0 ||
        Number(dispatchHealth?.dispatch_blocked_jobs ?? 0) > 0 ||
        Number(dispatchHealth?.modal_pending_jobs ?? 0) > 0 ||
        Number(dispatchHealth?.modal_running_unclaimed_jobs ?? 0) > 0 ||
        Number(dispatchHealth?.retrying_dispatch_jobs ?? 0) > 0 ||
        Number(dispatchHealth?.stale_dispatch_failed_jobs ?? 0) > 0 ||
        normalizeCatalogRunState(catalogRunProgress?.run_state) === "recovering")
    );
  }, [
    catalogDispatchStatusMessage,
    catalogRunProgress?.dispatch_health,
    catalogRunProgress?.run_state,
    platform,
    shouldRenderCatalogRunProgressCard,
  ]);

  const instagramPipelineTruthRows = useMemo<InstagramPipelineTruthRow[]>(() => {
    if (platform !== "instagram") return [];
    const rows: InstagramPipelineTruthRow[] = [];
    const commentsShardStatusLabel =
      commentsShardHealthSummary.total > 0
        ? [
            `${formatInteger(commentsShardHealthSummary.running)} running`,
            `${formatInteger(commentsShardHealthSummary.retrying)} retrying`,
            `${formatInteger(commentsShardHealthSummary.queued)} queued`,
            `${formatInteger(commentsShardHealthSummary.failed)} failed`,
          ].join(" · ")
        : null;
    const postsAuthCopy = getInstagramPostsAuthStatusCopy(catalogRunProgress, cookieHealth);
    const postsAuthText = postsAuthCopy.text;
    const postsAuthTextLower = postsAuthText.toLowerCase();
    const cookieHealthChecking = cookieHealthLoading && !cookieHealth;
    const postsAuthBlocked =
      postsAuthCopy.tone.includes("red") ||
      postsAuthTextLower.includes("blocked") ||
      postsAuthTextLower.includes("unavailable") ||
      (postsAuthTextLower.includes("not verified") && cookieHealth?.healthy === false);
    const authActionNeeded =
      postsAuthBlocked || cookieHealth?.healthy === false || activeCommentsRunProgressData?.manual_auth_required === true;
    if (postDetailsBackfillActiveBanner || shouldRenderCatalogRunProgressCard) {
      const runLabel = displayedCatalogRunId ? `Run ${shortRunId(displayedCatalogRunId)}` : "No run selected";
      const progressLabel =
        postDetailsBackfillActiveBanner?.progressLabel ??
        (catalogPostProgress.hasTotal
          ? `${formatInteger(catalogPostProgress.displayedCompleted)} / ${formatInteger(catalogPostProgress.total)} posts checked`
          : catalogPostProgress.hasCompleted
            ? `${formatInteger(catalogPostProgress.displayedCompleted)} posts checked`
            : "Waiting for post-detail workers");
      rows.push({
        key: "post-details",
        label: "Post/details run",
        value: `${runLabel} · ${displayedCatalogRunStatusLabel}`,
        detail: `${progressLabel}. This is active-run progress for the current backfill, not the lifetime profile total.`,
        recommendation: catalogAlertCodes.has("runtime_version_pin_mismatch") || catalogAlertCodes.has("runtime_version_drift")
          ? "Use the guided requeue action below only if this run needs the newest worker image now."
          : catalogStuckQueueRecoveryRecommended
            ? "Clear the stuck post/details queue before launching another catalog run."
            : "Let the post/details workers continue; do not compare this checked count to the all-time post total.",
        progressValue: catalogProgressBarWidthPct,
      });
    }
    if (commentsSyncActiveBanner || activeCommentsRunId) {
      rows.push({
        key: "comments",
        label: "Comments run",
        value: activeCommentsRunId
          ? `Run ${shortRunId(activeCommentsRunId)} · ${activeCommentsProgressSummary.status}`
          : "No comments run selected",
        detail: [
          activeCommentsProgressSummary.postsLabel ?? "Waiting for comments workers",
          activeCommentsProgressSummary.commentsProcessedLabel,
          activeCommentsProgressSummary.movementLabel,
          activeCommentsProgressSummary.throughputLabel,
          commentsShardStatusLabel,
        ]
          .filter(Boolean)
          .join(" · "),
        recommendation:
          commentsShardHealthSummary.failed > 0 || commentsShardHealthSummary.retrying > 0
            ? "Leave the run active unless a shard stops moving; cancel only the stuck shard."
            : "Let comments continue separately from post/details work.",
        progressValue: activeCommentsProgressSummary.postsPercent ?? null,
      });
    }
    rows.push({
      key: "auth",
      label: "Auth state",
      value:
        authActionNeeded
          ? "Action needed"
          : cookieHealthChecking
            ? "Checking"
          : "Usable",
      detail: [
        `Post/details: ${postsAuthText}`,
        cookieHealth?.healthy === true
          ? "local cookie file is healthy"
          : cookieHealth?.healthy === false
            ? `local cookie file is blocked${cookieHealth.reason ? `: ${cookieHealth.reason}` : ""}`
            : cookieHealth?.degraded
              ? "local cookie health check is degraded"
              : "local cookie health is still loading",
        instagramCommentsModalAuthActive
          ? "comments: Modal auth active"
          : activeCommentsRunProgressData?.manual_auth_required === true
            ? "comments: Modal auth blocked"
            : "comments: no active comments auth run",
      ].join(". "),
      recommendation:
        authActionNeeded
          ? "Repair or sync validated Instagram auth before starting the blocked lane."
          : cookieHealthChecking
            ? "Wait for the local cookie health check to finish before treating auth as blocked."
          : "No auth action is needed right now.",
    });
    if (hasSummary) {
      rows.push({
        key: "library",
        label: "Library totals",
        value: supportsCatalog
          ? `${formatInteger(displayCatalogTotalPosts)} / ${formatInteger(displayTotalPosts)} posts saved`
          : `${formatInteger(displayTotalPosts)} posts saved`,
        detail: `${formatInteger(commentsSavedCount)} saved comments · ${formatInteger(mediaSavedFiles)} media files · latest saved post ${formatDateTime(displayLastPostAt)}. These totals are all-time saved data.`,
        recommendation: "Use these totals for coverage only; active run cards show what workers are doing now.",
      });
    }
    return rows;
  }, [
    activeCommentsProgressSummary.commentsProcessedLabel,
    activeCommentsProgressSummary.movementLabel,
    activeCommentsProgressSummary.postsLabel,
    activeCommentsProgressSummary.postsPercent,
    activeCommentsProgressSummary.status,
    activeCommentsProgressSummary.throughputLabel,
    activeCommentsRunId,
    activeCommentsRunProgressData?.manual_auth_required,
    catalogPostProgress.displayedCompleted,
    catalogPostProgress.hasCompleted,
    catalogPostProgress.hasTotal,
    catalogPostProgress.total,
    catalogProgressBarWidthPct,
    catalogAlertCodes,
    catalogStuckQueueRecoveryRecommended,
    commentsSavedCount,
    commentsShardHealthSummary.failed,
    commentsShardHealthSummary.queued,
    commentsShardHealthSummary.retrying,
    commentsShardHealthSummary.running,
    commentsShardHealthSummary.total,
    commentsSyncActiveBanner,
    cookieHealth,
    cookieHealthLoading,
    cookieHealth?.degraded,
    cookieHealth?.healthy,
    cookieHealth?.reason,
    displayCatalogTotalPosts,
    displayLastPostAt,
    displayTotalPosts,
    displayedCatalogRunId,
    displayedCatalogRunStatusLabel,
    hasSummary,
    instagramCommentsModalAuthActive,
    mediaSavedFiles,
    platform,
    postDetailsBackfillActiveBanner,
    shouldRenderCatalogRunProgressCard,
    supportsCatalog,
    catalogRunProgress,
  ]);

  const instagramPipelineIssueRows = useMemo<InstagramPipelineIssueRow[]>(() => {
    if (platform !== "instagram") return [];
    const issues: InstagramPipelineIssueRow[] = [];
    if (catalogRunProgressError) {
      issues.push({
        key: "catalog-progress-error",
        title: "Post/details progress poll is retrying",
        detail: catalogRunProgressError,
        recommendation: "Wait for the next refresh; saved rows remain available while polling recovers.",
        tone: "red",
      });
    }
    if (catalogRunProgress?.progress_degraded) {
      issues.push({
        key: "catalog-progress-degraded",
        title: "Post/details progress is using the last good update",
        detail: `Last good update${
          catalogRunProgress.progress_degraded_at ? ` from ${formatDateTime(catalogRunProgress.progress_degraded_at)}` : ""
        }${catalogRunProgress.progress_degraded_reason ? `: ${formatDiagnosticToken(catalogRunProgress.progress_degraded_reason)}` : ""}.`,
        recommendation: "Do not start a duplicate run; wait for a fresh worker heartbeat or use advanced details to find the stalled job.",
        tone: "amber",
      });
    }
    if (catalogDispatchStatusMessage) {
      issues.push({
        key: "catalog-dispatch",
        title: catalogDispatchStatusMessage.tone === "red" ? "Post/details dispatch is blocked" : "Post/details dispatch is retrying",
        detail: catalogDispatchStatusMessage.text,
        recommendation: catalogStuckQueueRecoveryRecommended
          ? "Clear the stuck post/details queue before launching more post/detail work."
          : "Wait or cancel the active run before launching another post/details job.",
        tone: catalogDispatchStatusMessage.tone === "red" ? "red" : "amber",
      });
    }
    for (const alert of (catalogRunProgress?.alerts ?? []).slice(0, 3)) {
      const code = String(alert.code || "").trim().toLowerCase();
      const title =
        code === "runtime_version_drift"
          ? "Worker version drift"
          : code === "runtime_version_pin_mismatch"
            ? "Run is pinned to an older worker image"
            : formatOperationalAlertLabel(alert);
      const detail =
        code === "runtime_version_drift"
          ? "More than one worker runtime has reported into this run. The run can keep saving progress, but behavior may differ until workers converge."
          : code === "runtime_version_pin_mismatch"
            ? "This run is still using the runtime it started with. Cancel and requeue only when you need the newest scraper image immediately."
            : alert.message;
      const runtimeVersionAlert = isRuntimeVersionAlertCode(code);
      issues.push({
        key: `catalog-alert-${alert.code}-${issues.length}`,
        title,
        detail,
        recommendation: runtimeVersionAlert
          ? catalogAutoRequeueActive
            ? "A clean replacement run is already queued or running; let that handoff finish."
            : "Cancel and requeue a clean run to pick up the current worker image. Already saved posts, details, comments, and media stay saved."
          : "Use advanced worker details to decide whether this is transient or needs a targeted cancel/retry.",
        action: runtimeVersionAlert && !catalogAutoRequeueActive ? "remediate_drift" : undefined,
        actionLabel: "Cancel + requeue clean run",
        actionBusyLabel: "Cancelling + requeuing...",
        tone: alert.severity === "error" ? "red" : alert.severity === "info" ? "sky" : "amber",
      });
    }
    if (catalogStopMessage) {
      issues.push({
        key: "catalog-stop",
        title: "Post/details stop reason",
        detail: catalogStopMessage,
        recommendation:
          displayedCatalogRunStatus === "failed"
            ? "Requeue only after the stop reason is fixed or the guided action above recommends it."
            : "Keep this as context; a stopped scrape can still have saved useful rows.",
        tone: displayedCatalogRunStatus === "failed" ? "red" : "amber",
      });
    }
    if (activeCommentsRunProgressPollError) {
      issues.push({
        key: "comments-progress-error",
        title: "Comments progress poll is retrying",
        detail: String(activeCommentsRunProgressPollError),
        recommendation: "Wait for the next comments progress refresh before cancelling shards.",
        tone: "amber",
      });
    }
    if (activeCommentsProgressWarning) {
      issues.push({
        key: "comments-warning",
        title: "Comments warning",
        detail: activeCommentsProgressWarning,
        recommendation: activeCommentsProgressWarning.toLowerCase().includes("blocked")
          ? "Repair comments auth before expecting more comments to save."
          : "Let comments continue unless the same warning repeats without saved-count movement.",
        tone: activeCommentsProgressWarning.toLowerCase().includes("blocked") ? "red" : "amber",
      });
    }
    if (commentsShardHealthSummary.failed > 0 || commentsShardHealthSummary.retrying > 0) {
      issues.push({
        key: "comments-shards",
        title: "Comments shards need attention",
        detail: [
          commentsShardHealthSummary.failed > 0 ? `${formatInteger(commentsShardHealthSummary.failed)} failed` : null,
          commentsShardHealthSummary.retrying > 0 ? `${formatInteger(commentsShardHealthSummary.retrying)} retrying` : null,
          commentsShardHealthSummary.issueReasons.length > 0
            ? `latest reasons: ${commentsShardHealthSummary.issueReasons.join(", ")}`
            : null,
          "The comments run can still continue while individual shards retry.",
        ]
          .filter(Boolean)
          .join(". "),
        recommendation: "Cancel only a shard that is stuck; failed or retrying shards do not mean the whole comments run is dead.",
        tone: commentsShardHealthSummary.failed > 0 ? "red" : "amber",
      });
    }
    if (cookieHealth?.healthy === false) {
      issues.push({
        key: "cookies-blocked",
        title: cookieHealth.auth_surface_blocked ? "Instagram auth is blocked" : "Local cookies need refresh",
        detail: cookieHealth.reason || "The local cookie health check says the cookie file is not usable.",
        recommendation: "Sync validated cookies before rerunning post/details or comments auth-dependent work.",
        tone: "red",
      });
    } else if (cookieHealth?.degraded) {
      issues.push({
        key: "cookies-degraded",
        title: "Cookie health check is degraded",
        detail: "Saved cookies may still work, but the health check could not fully confirm them.",
        recommendation: "Treat auth as usable but watch the next worker heartbeat for auth errors.",
        tone: "amber",
      });
    }
    return issues.slice(0, 6);
  }, [
    activeCommentsProgressWarning,
    activeCommentsRunProgressPollError,
    catalogAutoRequeueActive,
    catalogDispatchStatusMessage,
    catalogStuckQueueRecoveryRecommended,
    catalogRunProgress?.alerts,
    catalogRunProgress?.progress_degraded,
    catalogRunProgress?.progress_degraded_at,
    catalogRunProgress?.progress_degraded_reason,
    catalogRunProgressError,
    catalogStopMessage,
    commentsShardHealthSummary.failed,
    commentsShardHealthSummary.issueReasons,
    commentsShardHealthSummary.retrying,
    cookieHealth?.auth_surface_blocked,
    cookieHealth?.degraded,
    cookieHealth?.healthy,
    cookieHealth?.reason,
    displayedCatalogRunStatus,
    platform,
  ]);

  const showInstagramPipelineTruthPanel =
    platform === "instagram" && (instagramPipelineTruthRows.length > 0 || instagramPipelineIssueRows.length > 0);

  const frontierMode = useMemo(
    () =>
      String(catalogRunProgress?.worker_runtime?.frontier_strategy || catalogRunProgress?.partition_strategy || "")
        .trim()
        .toLowerCase() === "newest_first_frontier",
    [catalogRunProgress?.partition_strategy, catalogRunProgress?.worker_runtime?.frontier_strategy],
  );

  const singleRunnerFallbackMode = useMemo(
    () => String(catalogRunProgress?.worker_runtime?.runner_strategy || "").trim().toLowerCase() === "single_runner_fallback",
    [catalogRunProgress?.worker_runtime?.runner_strategy],
  );

  const catalogHandleCards = useMemo((): CatalogRunProgressHandleCard[] => {
    const frontierLabel =
      frontierMode && catalogRunProgress?.frontier
        ? [
            catalogRunProgress.frontier.lease_owner ? "Frontier active" : "Frontier queued",
            catalogRunProgress.frontier.transport
              ? `Transport ${String(catalogRunProgress.frontier.transport).trim()}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")
        : null;
    const cards = new Map<string, CatalogRunProgressHandleCard>();
    for (const entry of catalogRunProgress?.per_handle ?? []) {
      const normalizedHandle = String(entry.account_handle || "").trim().replace(/^@+/, "") || "unknown";
      const normalizedPlatform = String(entry.platform || "").trim().toLowerCase() || platform;
      const cardId = `${normalizedPlatform}:${normalizedHandle}`;
      const stageStats = normalizeStageStats(entry);
      const existing = cards.get(cardId) ?? {
        id: cardId,
        platform: normalizedPlatform,
        handle: normalizedHandle,
        runnerLanes: [],
        frontierLabel,
        hasStarted: false,
        nextStage: null,
        totals: { total: 0, completed: 0, failed: 0, active: 0, running: 0, waiting: 0, scraped: 0, saved: 0 },
        stages: [],
      };
      existing.totals.total += stageStats.total;
      existing.totals.completed += stageStats.completed;
      existing.totals.failed += stageStats.failed;
      existing.totals.active += stageStats.active;
      existing.totals.running += stageStats.running;
      existing.totals.waiting += stageStats.waiting;
      existing.totals.scraped += stageStats.scraped;
      existing.totals.saved += stageStats.saved;
      existing.runnerLanes = Array.from(
        new Set([
          ...existing.runnerLanes,
          ...((entry.runner_lanes ?? [])
            .map((lane) => String(lane || "").trim())
            .filter((lane) => lane.length > 0)),
        ]),
      ).sort();
      existing.hasStarted = existing.hasStarted || Boolean(entry.has_started);
      if (!existing.frontierLabel && frontierLabel) {
        existing.frontierLabel = frontierLabel;
      }
      if (!existing.nextStage && typeof entry.next_stage === "string" && entry.next_stage.trim()) {
        existing.nextStage = entry.next_stage.trim();
      }
      existing.stages.push({ ...stageStats, stage: entry.stage });
      cards.set(cardId, existing);
    }
    return Array.from(cards.values())
      .map((card) => ({
        ...card,
        stages: [...card.stages].sort((left, right) => {
          const leftOrder = CATALOG_STAGE_SORT_ORDER[left.stage] ?? 50;
          const rightOrder = CATALOG_STAGE_SORT_ORDER[right.stage] ?? 50;
          if (leftOrder !== rightOrder) return leftOrder - rightOrder;
          return left.stage.localeCompare(right.stage);
        }),
      }))
      .sort((left, right) => left.handle.localeCompare(right.handle));
  }, [catalogRunProgress?.frontier, catalogRunProgress?.per_handle, frontierMode, platform]);

  const activeCatalogHandleCard = useMemo(() => {
    const normalizedHandle = normalizeComparable(handle);
    return (
      catalogHandleCards.find((card) => normalizeComparable(card.handle) === normalizedHandle) ??
      catalogHandleCards[0] ??
      null
    );
  }, [catalogHandleCards, handle]);

  const catalogPrimaryStageKey = useMemo(() => {
    if (catalogRunProgress?.stages?.shared_account_posts) return "shared_account_posts";
    if (detailsRefreshProgress && getStageGraphNode(catalogRunProgress, "detail_refresh")) return "detail_refresh";
    return catalogStageEntries[0]?.[0] ?? null;
  }, [catalogRunProgress, catalogStageEntries, detailsRefreshProgress]);

  const catalogPrimaryStageStats = useMemo(() => {
    if (catalogPrimaryStageKey === "detail_refresh") {
      return normalizeStageGraphNodeStats(getStageGraphNode(catalogRunProgress, "detail_refresh"));
    }
    if (catalogPrimaryStageKey && catalogRunProgress?.stages?.[catalogPrimaryStageKey]) {
      return normalizeStageStats(catalogRunProgress.stages[catalogPrimaryStageKey]);
    }
    return catalogStageEntries[0]?.[1] ?? null;
  }, [catalogPrimaryStageKey, catalogRunProgress, catalogStageEntries]);

  const catalogOperatorSummaryCards = useMemo((): CatalogOperatorSummaryCard[] => {
    const cards: CatalogOperatorSummaryCard[] = [];
    const configuredRunnerCount =
      Number(
        catalogRunProgress?.worker_runtime?.runner_count ??
          catalogRunProgress?.details_refresh_shard_count ??
          0,
      ) || 0;
    const activeWorkerCount =
      Number(catalogRunProgress?.worker_runtime?.active_workers_now ?? catalogPrimaryStageStats?.running ?? 0) || 0;
    if (configuredRunnerCount > 0 || activeWorkerCount > 0) {
      cards.push({
        key: "workers",
        label: "Workers",
        value:
          configuredRunnerCount > 0
            ? `${formatInteger(activeWorkerCount)} / ${formatInteger(configuredRunnerCount)} active`
            : `${formatInteger(activeWorkerCount)} active`,
        detail:
          configuredRunnerCount > 0
            ? "Live workers reporting against the configured runner count."
            : "Live workers currently reporting for this run.",
      });
    }
    if (catalogPrimaryStageKey) {
      cards.push({
        key: "stage",
        label: "Active Stage",
        value: formatRunStageLabel(catalogPrimaryStageKey, {
          frontierMode,
          singleRunnerFallback: singleRunnerFallbackMode,
          detailsRefresh: detailsRefreshProgress,
        }),
        detail:
          detailsRefreshProgress && catalogPrimaryStageKey === "shared_account_posts"
            ? "Detail refresh work is running through the shared post worker lane."
            : "Most recent worker lane reporting live progress.",
      });
    }
    if (catalogPrimaryStageStats) {
      cards.push({
        key: "stage-jobs",
        label: "Stage Jobs",
        value: [
          `${formatInteger(catalogPrimaryStageStats.running)} running`,
          `${formatInteger(catalogPrimaryStageStats.waiting)} queued`,
        ].join(" · "),
        detail: [
          `${formatInteger(catalogPrimaryStageStats.completed)} complete`,
          catalogPrimaryStageStats.failed > 0 ? `${formatInteger(catalogPrimaryStageStats.failed)} failed` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      });
    }
    return cards;
  }, [
    catalogPrimaryStageKey,
    catalogPrimaryStageStats,
    catalogRunProgress?.details_refresh_shard_count,
    catalogRunProgress?.worker_runtime?.active_workers_now,
    catalogRunProgress?.worker_runtime?.runner_count,
    detailsRefreshProgress,
    frontierMode,
    singleRunnerFallbackMode,
  ]);

  const catalogCompactStageSummaries = useMemo((): CatalogCompactStageSummary[] => {
    const sourceStages =
      activeCatalogHandleCard?.stages && activeCatalogHandleCard.stages.length > 0
        ? activeCatalogHandleCard.stages
        : catalogStageEntries.map(([stage, stats]) => ({ stage, ...stats }));
    return sourceStages.slice(0, 4).map((stage) => ({
      key: stage.stage,
      label: formatRunStageLabel(stage.stage, {
        frontierMode,
        singleRunnerFallback: singleRunnerFallbackMode,
        detailsRefresh: detailsRefreshProgress,
      }),
      counts: `${formatInteger(stage.completed + stage.failed)} / ${formatInteger(stage.total)} complete`,
      activity: [
        stage.running > 0 ? `${formatInteger(stage.running)} running` : null,
        stage.waiting > 0 ? `${formatInteger(stage.waiting)} queued` : null,
        stage.failed > 0 ? `${formatInteger(stage.failed)} failed` : null,
        stage.running <= 0 && stage.waiting <= 0 && stage.failed <= 0
          ? formatCatalogStageActivitySummary(stage.stage, stage, {
              frontierMode,
              singleRunnerFallback: singleRunnerFallbackMode,
              detailsRefresh: detailsRefreshProgress,
            })
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
    }));
  }, [
    activeCatalogHandleCard,
    catalogStageEntries,
    detailsRefreshProgress,
    frontierMode,
    singleRunnerFallbackMode,
  ]);

  const showCatalogStuckQueueRecovery = catalogStuckQueueRecoveryRecommended;

  const shouldRenderCatalogOperatorSummary =
    catalogOperatorSummaryCards.length > 0 || catalogCompactStageSummaries.length > 0 || showCatalogStuckQueueRecovery;

  const catalogLogs = useMemo((): SocialAccountCatalogRunProgressLogEntry[] => {
    return (catalogRunProgress?.recent_log ?? [])
      .map((entry) => ({
        ...entry,
        line: String(entry.line || "")
          .replace(/ · 0p\/0c/g, "")
          .replace(/ · saved 0p\/0c/g, "")
          .trim(),
      }))
      .filter((entry) => entry.line.length > 0);
  }, [catalogRunProgress?.recent_log]);

  useEffect(() => {
    setCatalogLogsExpanded(false);
  }, [displayedCatalogRunId]);

  const showOptions = useMemo<ShowOption[]>(() => {
    return [...(summary?.per_show_counts ?? [])]
      .filter((item) => item.show_id && item.show_name)
      .map((item) => ({
        show_id: item.show_id as string,
        show_name: item.show_name as string,
        show_slug: item.show_slug ?? null,
      }));
  }, [summary?.per_show_counts]);

  const reviewShowOptionsByItem = useMemo<Record<string, ShowOption[]>>(() => {
    const optionsByItem: Record<string, ShowOption[]> = {};
    for (const item of reviewQueue) {
      const merged = new Map<string, ShowOption>();
      for (const show of showOptions) {
        merged.set(show.show_id, show);
      }
      for (const show of item.suggested_shows ?? []) {
        if (!show.show_id || !show.show_name) continue;
        merged.set(show.show_id, {
          show_id: show.show_id,
          show_name: show.show_name,
          show_slug: show.show_slug ?? null,
        });
      }
      optionsByItem[item.id] = Array.from(merged.values()).sort((left, right) => left.show_name.localeCompare(right.show_name));
    }
    return optionsByItem;
  }, [reviewQueue, showOptions]);

  const buildReviewResolutionDraft = useCallback((
    item: SocialAccountCatalogReviewItem,
    itemShowOptions: ShowOption[],
  ): ReviewResolutionDraft => {
    const fallbackShowId = item.suggested_shows?.[0]?.show_id ?? itemShowOptions[0]?.show_id ?? "";
    return {
      resolution_action: "assign_show",
      show_id: fallbackShowId,
    };
  }, []);

  useEffect(() => {
    setReviewDrafts((current) => {
      const next: Record<string, ReviewResolutionDraft> = {};
      for (const item of reviewQueue) {
        const existing = current[item.id];
        next[item.id] = existing ?? buildReviewResolutionDraft(item, reviewShowOptionsByItem[item.id] ?? []);
      }
      return next;
    });
  }, [buildReviewResolutionDraft, reviewQueue, reviewShowOptionsByItem]);

  const updateReviewDraft = (itemId: string, updates: Partial<ReviewResolutionDraft>) => {
    setReviewDrafts((current) => {
      const currentDraft =
        current[itemId] ??
        (() => {
          const item = reviewQueue.find((entry) => entry.id === itemId);
          if (item) {
            return buildReviewResolutionDraft(item, reviewShowOptionsByItem[itemId] ?? []);
          }
          return {
            resolution_action: "assign_show",
            show_id: "",
          };
        })();
      const nextDraft = { ...currentDraft, ...updates };
      if (nextDraft.resolution_action === "mark_non_show") {
        nextDraft.show_id = "";
      }
      return { ...current, [itemId]: nextDraft };
    });
  };

  const updateHashtagAssignments = (hashtag: string, nextAssignments: SocialAccountProfileHashtagAssignment[]) => {
    setDraftAssignments((current) => ({ ...current, [hashtag]: nextAssignments }));
    setSaveMessage(null);
  };

  const addHashtagAssignmentRow = (hashtag: string) => {
    const fallbackShow = showOptions[0];
    if (!fallbackShow) return;
    const nextAssignments = [...(draftAssignments[hashtag] ?? []), { show_id: fallbackShow.show_id }];
    updateHashtagAssignments(hashtag, nextAssignments);
  };

  const saveHashtagAssignments = async (hashtag: string) => {
    if (!user) return;
    const assignments = (draftAssignments[hashtag] ?? [])
      .filter((assignment) => assignment.show_id)
      .map((assignment) => ({
        show_id: assignment.show_id,
      }));

    setSavingHashtag(hashtag);
    setSaveMessage(null);
    try {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/hashtags`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hashtags: [{ hashtag, assignments }] }),
        },
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as HashtagsResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to save hashtag assignments");
      }
      setHashtags(data.items ?? hashtags);
      setDraftAssignments((current) => ({
        ...current,
        [hashtag]: (data.items ?? []).find((item) => item.hashtag === hashtag)?.assignments ?? assignments,
      }));
      setSaveMessage(`Saved assignments for #${hashtag}`);
      await refreshProfileSnapshotNow();
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Failed to save hashtag assignments");
    } finally {
      setSavingHashtag(null);
    }
  };

  // --- Cookie preflight: fetch health on load for cookie-dependent platforms ---
  const fetchCookieHealth = useCallback(
    async (
      force = false,
      options: { includePostsAuth?: boolean; includeCommentsAuth?: boolean } = {},
    ): Promise<SocialProfileCookieHealth | null> => {
      if (!platformRequiresCookies || !user) return null;
      const commentsAuthRequested = platform === "instagram" && selectedTab === "comments";
      if (!force) {
        const cachedCookieHealth = readCookieHealthSessionCache({
          platform,
          handle,
          needsCommentsAuth: commentsAuthRequested,
        });
        if (cachedCookieHealth) {
          setCookieHealth(cachedCookieHealth);
          setCookieHealthError(null);
          if (commentsAuthRequested) {
            commentsAuthCookieHealthProbeKeyRef.current = buildCommentsAuthCookieHealthProbeKey(
              platform,
              handle,
              cachedCookieHealth,
            );
          }
          return cachedCookieHealth;
        }
      }
      setCookieHealthLoading(true);
      setCookieHealthError(null);
      try {
        const params = new URLSearchParams();
        if (force) params.set("force", "true");
        if (platform === "instagram") {
          if (options.includePostsAuth ?? force) params.set("posts_auth", "true");
          if (options.includeCommentsAuth ?? commentsAuthRequested) params.set("comments_auth", "true");
        }
        const qs = params.size > 0 ? `?${params.toString()}` : "";
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/cookies/health${qs}`,
          { method: "GET" },
          { preferredUser: user },
        );
        const data = (await response.json().catch(() => ({}))) as SocialProfileCookieHealth & ProxyErrorPayload;
        if (!response.ok) throw buildSocialAccountRequestError(data, "Failed to check cookie health");
        setCookieHealth(data);
        writeCookieHealthSessionCache(platform, handle, data);
        if (commentsAuthRequested) {
          commentsAuthCookieHealthProbeKeyRef.current = buildCommentsAuthCookieHealthProbeKey(platform, handle, data);
        }
        return data;
      } catch (error) {
        pauseSecondaryReadsForPressure(error, "Failed to check cookie health");
        setCookieHealthError(error instanceof Error ? error.message : "Cookie health check failed");
        return null;
      } finally {
        setCookieHealthLoading(false);
      }
    },
    [platformRequiresCookies, user, platform, handle, selectedTab, fetchAdminWithAuth, pauseSecondaryReadsForPressure],
  );

  useEffect(() => {
    const commentsAuthProbeMissing =
      platform === "instagram" &&
      selectedTab === "comments" &&
      Boolean(cookieHealth) &&
      !cookieHealth?.comments_auth_health &&
      !cookieHealth?.comments_auth_probe;
    const commentsAuthProbeKey =
      commentsAuthProbeMissing && cookieHealth
        ? buildCommentsAuthCookieHealthProbeKey(platform, handle, cookieHealth)
        : null;
    const commentsAuthProbeAlreadyRequested =
      Boolean(commentsAuthProbeKey) && commentsAuthCookieHealthProbeKeyRef.current === commentsAuthProbeKey;
    if (
      checking ||
      !user ||
      !hasAccess ||
      !platformRequiresCookies ||
      shouldDeferSecondaryCatalogReads ||
      secondaryReadBudgetSlot < 2 ||
      (commentsAuthProbeMissing && commentsAuthProbeAlreadyRequested) ||
      (cookieHealth && !commentsAuthProbeMissing) ||
      cookieHealthLoading
    ) {
      return;
    }
    if (platformRequiresCookies && user && (!cookieHealth || commentsAuthProbeMissing) && !cookieHealthLoading) {
      void fetchCookieHealth(commentsAuthProbeMissing, {
        includeCommentsAuth: platform === "instagram" && selectedTab === "comments",
        includePostsAuth: false,
      });
    }
  }, [
    checking,
    cookieHealth,
    cookieHealthLoading,
    fetchCookieHealth,
    hasAccess,
    handle,
    platform,
    platformRequiresCookies,
    selectedTab,
    secondaryReadBudgetSlot,
    shouldDeferSecondaryCatalogReads,
    user,
  ]);

  const handleCookieRefresh = useCallback(async (options: { confirmed?: boolean } = {}): Promise<{
    refreshResult: SocialProfileCookieRefreshResult | null;
    refreshedHealth: SocialProfileCookieHealth | null;
  }> => {
    if (!user) {
      return { refreshResult: null, refreshedHealth: null };
    }
    const refreshAction = cookieHealth?.refresh_action || (platform === "instagram" ? "instagram_auth_repair" : "cookie_refresh");
    const refreshLabel =
      cookieHealth?.refresh_label ||
      (refreshAction === "instagram_auth_repair" ? "Manual Instagram Auth" : "Refresh Cookies");
    const requiresInstagramConfirmation = platform === "instagram" && refreshAction === "instagram_auth_repair";
    if (requiresInstagramConfirmation && !options.confirmed) {
      setCookieRefreshConfirmationPending(true);
      setCookieRefreshMessage(INSTAGRAM_AUTH_REFRESH_WARNING);
      return { refreshResult: null, refreshedHealth: null };
    }
    setCookieRefreshing(true);
    setCookieRefreshConfirmationPending(false);
    setCookieRefreshMessage(
      refreshAction === "instagram_auth_repair"
        ? "Checking manual Instagram auth state and syncing only already validated cookies."
        : "Opening browser… Log in to " + SOCIAL_ACCOUNT_PLATFORM_LABELS[platform] + " in the browser window.",
    );
    try {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/cookies/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            headless: false,
            timeout_seconds: 180,
            operator_confirmation: requiresInstagramConfirmation ? INSTAGRAM_AUTH_REFRESH_CONFIRMATION : undefined,
            allow_cookie_refresh: true,
          }),
        },
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as SocialProfileCookieRefreshResult & {
        detail?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(data.detail?.message || data.reason || "Cookie refresh failed");
      }
      const refreshedHealth = await fetchCookieHealth(true);
      if (data.success) {
        setCookieRefreshMessage(
          refreshAction === "instagram_auth_repair"
            ? "Validated Instagram cookies synced."
            : `${refreshLabel} completed successfully.`,
        );
      } else {
        setCookieRefreshMessage(
          refreshAction === "instagram_auth_repair"
            ? `Manual Instagram auth check completed but health is still invalid: ${data.reason || "unknown"}`
            : `Refresh completed but cookies may still be invalid: ${data.reason || "unknown"}`,
        );
      }
      return { refreshResult: data, refreshedHealth };
    } catch (error) {
      setCookieRefreshMessage(error instanceof Error ? error.message : "Cookie refresh failed");
      return { refreshResult: null, refreshedHealth: null };
    } finally {
      setCookieRefreshing(false);
    }
  }, [cookieHealth?.refresh_action, cookieHealth?.refresh_label, fetchAdminWithAuth, fetchCookieHealth, handle, platform, user]);

  const buildFullHistoryBackfillRequest = useCallback(
    (
      selectedTasks?: CatalogBackfillSelectedTask[],
      detailWorkerCount?: number,
      commentsWorkerCount?: number,
      commentsMediaFollowups?: boolean,
    ): CatalogBackfillRequest => {
      const defaultSelectedTasks =
        platform === "instagram" ? [...INSTAGRAM_BACKFILL_DEFAULT_SELECTED_TASKS]
        : platform === "tiktok" ? [...TIKTOK_BACKFILL_DEFAULT_SELECTED_TASKS]
        : undefined;
      const resolvedSelectedTasks = selectedTasks ?? defaultSelectedTasks;
      const normalizedDetailWorkerCount =
        platform === "instagram" && resolvedSelectedTasks?.includes("post_details")
          ? Math.max(1, Math.min(12, Number(detailWorkerCount ?? getDefaultInstagramBackfillDetailWorkerCount(handle)) || 1))
          : undefined;
      const normalizedCommentsWorkerCount =
        platform === "instagram" && resolvedSelectedTasks?.includes("comments")
          ? Math.max(1, Math.min(24, Number(commentsWorkerCount ?? getDefaultInstagramBackfillCommentsWorkerCount(handle)) || 1))
          : undefined;
      const normalizedCommentsMediaFollowups =
        platform === "instagram" && resolvedSelectedTasks?.includes("comments")
          ? Boolean(commentsMediaFollowups ?? getDefaultInstagramBackfillCommentMediaFollowups(handle)) ||
            resolvedSelectedTasks.includes("media")
          : undefined;
      if (platform === "twitter") {
        const { dateStart, dateEnd } = buildTwitterBackfillWindow();
        return {
          source_scope: activeCatalogSourceScope,
          backfill_scope: "bounded_window",
          date_start: dateStart,
          date_end: dateEnd,
          ...(resolvedSelectedTasks ? { selected_tasks: resolvedSelectedTasks } : {}),
          ...(normalizedDetailWorkerCount ? { detail_worker_count: normalizedDetailWorkerCount } : {}),
          ...(normalizedCommentsWorkerCount ? { comments_worker_count: normalizedCommentsWorkerCount } : {}),
          ...(normalizedCommentsMediaFollowups !== undefined
            ? { comments_enable_media_followups: normalizedCommentsMediaFollowups }
            : {}),
        };
      }
      return {
        source_scope: activeCatalogSourceScope,
        backfill_scope: "full_history",
        ...(resolvedSelectedTasks ? { selected_tasks: resolvedSelectedTasks } : {}),
        ...(normalizedDetailWorkerCount ? { detail_worker_count: normalizedDetailWorkerCount } : {}),
        ...(normalizedCommentsWorkerCount ? { comments_worker_count: normalizedCommentsWorkerCount } : {}),
        ...(normalizedCommentsMediaFollowups !== undefined
          ? { comments_enable_media_followups: normalizedCommentsMediaFollowups }
          : {}),
      };
    },
    [activeCatalogSourceScope, handle, platform],
  );

  const buildBoundedWindowBackfillRequest = useCallback(
    (
      dateStart: string,
      dateEnd: string,
      selectedTasks?: CatalogBackfillSelectedTask[],
      detailWorkerCount?: number,
      commentsWorkerCount?: number,
      commentsMediaFollowups?: boolean,
    ): CatalogBackfillRequest => {
      const defaultSelectedTasks =
        platform === "instagram" ? [...INSTAGRAM_BACKFILL_DEFAULT_SELECTED_TASKS]
        : platform === "tiktok" ? [...TIKTOK_BACKFILL_DEFAULT_SELECTED_TASKS]
        : undefined;
      const resolvedSelectedTasks = selectedTasks ?? defaultSelectedTasks;
      const normalizedDetailWorkerCount =
        platform === "instagram" && resolvedSelectedTasks?.includes("post_details")
          ? Math.max(1, Math.min(12, Number(detailWorkerCount ?? getDefaultInstagramBackfillDetailWorkerCount(handle)) || 1))
          : undefined;
      const normalizedCommentsWorkerCount =
        platform === "instagram" && resolvedSelectedTasks?.includes("comments")
          ? Math.max(1, Math.min(24, Number(commentsWorkerCount ?? getDefaultInstagramBackfillCommentsWorkerCount(handle)) || 1))
          : undefined;
      const normalizedCommentsMediaFollowups =
        platform === "instagram" && resolvedSelectedTasks?.includes("comments")
          ? Boolean(commentsMediaFollowups ?? getDefaultInstagramBackfillCommentMediaFollowups(handle)) ||
            resolvedSelectedTasks.includes("media")
          : undefined;
      return {
        source_scope: activeCatalogSourceScope,
        backfill_scope: "bounded_window",
        date_start: dateStart,
        date_end: dateEnd,
        ...(resolvedSelectedTasks ? { selected_tasks: resolvedSelectedTasks } : {}),
        ...(normalizedDetailWorkerCount ? { detail_worker_count: normalizedDetailWorkerCount } : {}),
        ...(normalizedCommentsWorkerCount ? { comments_worker_count: normalizedCommentsWorkerCount } : {}),
        ...(normalizedCommentsMediaFollowups !== undefined
          ? { comments_enable_media_followups: normalizedCommentsMediaFollowups }
          : {}),
      };
    },
    [activeCatalogSourceScope, handle, platform],
  );

  const startCatalogActionRequest = useCallback(
    async (
      action: "backfill" | "sync_recent" | "sync_newer",
      requestBody: CatalogBackfillRequest | CatalogSyncRecentRequest | CatalogSyncNewerRequest,
    ) => {
      setRunningCatalogAction(action);
      const requestSelectedTasks = "selected_tasks" in requestBody ? requestBody.selected_tasks : undefined;
      const instagramCommentsSelected =
        action === "backfill" &&
        platform === "instagram" &&
        (requestSelectedTasks ?? INSTAGRAM_BACKFILL_DEFAULT_SELECTED_TASKS).includes("comments");
      setCatalogActionMessage(
        instagramCommentsSelected ? "Checking Instagram auth before preparing backfill..." : null,
      );
      setCatalogFreshness(null);
      setCatalogFreshnessError(null);
      setSecondaryReadsPressurePause(null);
      setCatalogGapAnalysis(null);
      setCatalogGapAnalysisError(null);
      try {
        const actionSlug =
          action === "backfill" ? "backfill"
          : action === "sync_newer" ? "sync-newer"
          : "sync-recent";
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/${actionSlug}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          },
          { preferredUser: user },
        );
        const data = (await response.json().catch(() => ({}))) as CatalogBackfillLaunchResponse & {
          error?: string;
          message?: string;
          catalog_action?: string;
          catalog_action_scope?: string;
          detail?: { message?: string; run_id?: string; status?: string };
        } & ProxyErrorPayload;
        if (!response.ok) {
          throw buildSocialAccountRequestError(
            data,
            `Failed to ${
              action === "backfill" ? "start backfill"
              : action === "sync_newer" ? "sync newer posts"
              : "sync recent catalog content"
            }`,
          );
        }
        const queuedRunId = String(data.run_id || "").trim() || null;
        const catalogRunId = String(data.catalog_run_id || "").trim() || queuedRunId;
        const commentsRunId = String(data.comments_run_id || "").trim() || null;
        const commentsDeferredUntilCatalogComplete =
          action === "backfill" &&
          platform === "instagram" &&
          Boolean(data.comments_deferred_until_catalog_complete) &&
          Boolean(catalogRunId);
        const requestedSourceScope =
          "source_scope" in requestBody && requestBody.source_scope
            ? String(requestBody.source_scope)
            : activeCatalogSourceScope;
        const launchSelectedTaskSet =
          data.effective_selected_tasks ??
          data.selected_tasks ??
          ("selected_tasks" in requestBody ? requestBody.selected_tasks ?? [] : []);
        if (catalogRunId) {
          storeCatalogProgressRunId(catalogProgressStorageKey, catalogRunId);
          setCatalogProgressRunId(catalogRunId);
          setCatalogRunProgress(
            buildProvisionalCatalogRunProgress({
              runId: catalogRunId,
              status: data.status ?? "queued",
              launchGroupId: data.launch_group_id,
              launchState: data.launch_state,
              sourceScope: requestedSourceScope,
              dateStart: "date_start" in requestBody ? requestBody.date_start : null,
              dateEnd: "date_end" in requestBody ? requestBody.date_end : null,
              selectedTasks: data.selected_tasks ?? launchSelectedTaskSet,
              effectiveSelectedTasks: launchSelectedTaskSet,
              catalogAction: action,
              catalogActionScope:
                "backfill_scope" in requestBody && requestBody.backfill_scope
                  ? requestBody.backfill_scope
                  : action === "sync_recent"
                    ? "recent_window"
                    : action === "sync_newer"
                      ? "head_gap"
                    : "full_history",
            }),
          );
          setCatalogRunProgressError(null);
          setCatalogRunProgressLoading(true);
          setCatalogLogsExpanded(false);
          catalogTerminalSummaryRefreshRunIdRef.current = null;
        }
        if (commentsRunId) {
          setCommentsProgressRunId(commentsRunId);
          storeCatalogProgressRunId(commentsProgressStorageKey, commentsRunId);
        }
        if (action === "backfill" && platform === "instagram") {
          const launchTaskResolutionPending =
            data.launch_state === "pending" || Boolean(data.launch_task_resolution_pending);
          const attachedFollowups = data.attached_followups ?? null;
          const attachedComments = attachedFollowups?.comments ?? null;
          const attachedMedia = attachedFollowups?.media ?? null;
          const commentsSourceLabel = formatAttachedLaneSourceLabel(attachedComments?.source);
          const launchParts = [
            data.launch_group_id ? `Launch ${data.launch_group_id.slice(0, 8)}` : null,
            catalogRunId ? `Catalog ${catalogRunId.slice(0, 8)}` : null,
            commentsRunId
              ? `Comments ${commentsRunId.slice(0, 8)}${commentsSourceLabel ? ` (${commentsSourceLabel.toLowerCase()})` : ""}`
              : attachedComments?.source === "deferred_after_catalog"
                ? "Comments waiting on target readiness"
                : null,
            attachedMedia ? "Media attached" : null,
            commentsDeferredUntilCatalogComplete ? "Comments waiting until targets are ready" : null,
          ].filter(Boolean);
          const selectedTaskLabels = launchSelectedTaskSet
            .map((task) => INSTAGRAM_BACKFILL_TASK_OPTIONS.find((option) => option.value === task)?.label ?? task)
            .join(", ");
          const skippedPostDetailsMessage =
            data.post_details_skipped_reason === "already_materialized"
              ? " Post Details skipped because all catalog posts are already materialized."
              : "";
          const authRepairPrefix =
            data.auth_repair_attempted && data.auth_repair_status === "succeeded"
              ? "Manual Instagram auth validated. "
              : "";
          if (launchTaskResolutionPending) {
            const phaseMessage =
              `Requested tasks: ${selectedTaskLabels || "Post Details"}. ` +
              `Source scope: ${formatDiagnosticToken(requestedSourceScope)}. ` +
              "Current phase: reserving the run and finalizing task lanes in the background. " +
              "Next: verify Instagram posts auth, check target readiness, attach selected follow-up lanes, then workers claim queued jobs.";
            const message =
              launchParts.length > 0
                ? `Instagram backfill accepted. ${phaseMessage} ${launchParts.join(" · ")}.`
                : `Instagram backfill accepted. ${phaseMessage}`;
            setCatalogActionMessage(
              `${authRepairPrefix}${message}`,
            );
          } else {
            const message =
              launchParts.length > 0
                ? `Instagram backfill queued for ${selectedTaskLabels || "Post Details"}.${skippedPostDetailsMessage} ${launchParts.join(" · ")}.`
                : `Instagram backfill queued for ${selectedTaskLabels || "Post Details"}.${skippedPostDetailsMessage}`;
            setCatalogActionMessage(
              `${authRepairPrefix}${message}`,
            );
          }
        } else if (action === "backfill") {
          const selectedTaskSet =
            data.effective_selected_tasks ??
            data.selected_tasks ??
            ("selected_tasks" in requestBody ? requestBody.selected_tasks ?? [] : []);
          const selectedTaskLabels = selectedTaskSet.map((task) => formatBackfillTaskLabel(task)).join(", ");
          const platformLabel = SOCIAL_ACCOUNT_PLATFORM_LABELS[platform];
          if ((platform === "tiktok" || platform === "twitter" || platform === "youtube") && selectedTaskLabels) {
            setCatalogActionMessage(
              `${platformLabel} backfill queued for ${selectedTaskLabels}.${
                catalogRunId ? ` Catalog ${catalogRunId.slice(0, 8)}.` : queuedRunId ? ` (${queuedRunId.slice(0, 8)}).` : ""
              }`,
            );
          } else {
            setCatalogActionMessage(`Post backfill queued${queuedRunId ? ` (${queuedRunId.slice(0, 8)}).` : "."}`);
          }
        } else {
          setCatalogActionMessage(
            action === "sync_newer"
              ? `Sync newer posts queued${queuedRunId ? ` (${queuedRunId.slice(0, 8)})` : ""}.`
              : `Recent sync queued${queuedRunId ? ` (${queuedRunId.slice(0, 8)})` : ""}.`,
          );
        }
        setRunningCatalogAction(null);
        void refreshProfileSnapshotNow({ runId: catalogRunId || queuedRunId }).catch(() => {});
      } catch (error) {
        const requestError = toSocialAccountRequestError(
          error,
          `Failed to ${
            action === "backfill" ? "start backfill"
            : action === "sync_newer" ? "sync newer posts"
            : "sync recent catalog content"
          }`,
        );
        setCatalogActionMessage(formatCatalogActionErrorMessage(action, requestError));
      } finally {
        setRunningCatalogAction(null);
      }
    },
    [
      activeCatalogSourceScope,
      catalogProgressStorageKey,
      commentsProgressStorageKey,
      fetchAdminWithAuth,
      handle,
      platform,
      refreshProfileSnapshotNow,
      user,
    ],
  );

  const runCatalogAction = useCallback(async (
    action: "backfill" | "sync_recent" | "sync_newer",
    requestBody: CatalogBackfillRequest | CatalogSyncRecentRequest | CatalogSyncNewerRequest,
  ) => {
    if (!user) return;
    const actionLabel =
      action === "backfill" ? "backfill"
      : action === "sync_newer" ? "sync newer"
      : "sync recent";
    const explicitLocalInlineFallback =
      action === "backfill" &&
      "allow_inline_dev_fallback" in requestBody &&
      requestBody.allow_inline_dev_fallback === true &&
      "execution_preference" in requestBody &&
      requestBody.execution_preference === "prefer_local_inline";
    if (catalogLaunchGuardMessage && !explicitLocalInlineFallback) {
      setCatalogActionMessage(catalogLaunchGuardMessage);
      return;
    }
    let effectiveCookieHealth = cookieHealth;
    if (platformRequiresCookies && !effectiveCookieHealth) {
      setCatalogActionMessage(`Checking ${SOCIAL_ACCOUNT_PLATFORM_LABELS[platform]} auth before starting…`);
      effectiveCookieHealth = await fetchCookieHealth(true);
      if (!effectiveCookieHealth) {
        setCatalogActionMessage(
          `Cannot start ${actionLabel} until ${SOCIAL_ACCOUNT_PLATFORM_LABELS[platform]} auth status can be checked.`,
        );
        return;
      }
    }
    if (platformRequiresCookies && effectiveCookieHealth?.healthy === false) {
      const canAutoRepairBeforeLaunch =
        effectiveCookieHealth.refresh_available &&
        effectiveCookieHealth.refresh_action === "cookie_refresh";
      if (
        platform === "instagram" &&
        effectiveCookieHealth.refresh_available &&
        effectiveCookieHealth.refresh_action === "instagram_auth_repair"
      ) {
        setCatalogActionMessage(
          "Backfill was not started. Complete Manual Instagram Auth and confirm before rerunning Backfill.",
        );
        setCookieRefreshConfirmationPending(true);
        setCookieRefreshMessage(INSTAGRAM_AUTH_REFRESH_WARNING);
        return;
      }
      if (canAutoRepairBeforeLaunch) {
        const refreshAction = effectiveCookieHealth.refresh_action;
        const platformLabel = SOCIAL_ACCOUNT_PLATFORM_LABELS[platform];
        pendingCatalogActionAfterCookieRepairRef.current = { action, requestBody };
        setCatalogActionMessage(
          refreshAction === "instagram_auth_repair" ?
            "Manual Instagram auth must be completed before Backfill can start."
          : `${platformLabel} cookies must be refreshed before Backfill can start.`,
        );
        const { refreshResult, refreshedHealth } = await handleCookieRefresh();
        const pendingAction = pendingCatalogActionAfterCookieRepairRef.current;
        pendingCatalogActionAfterCookieRepairRef.current = null;
        if (!pendingAction) {
          return;
        }
        if (!refreshResult?.success) {
          setCatalogActionMessage(
            refreshAction === "instagram_auth_repair" ?
              "Backfill was not started because Manual Instagram Auth did not validate."
            : `Backfill was not started because ${platformLabel} cookies could not be refreshed.`,
          );
          return;
        }
        if (refreshedHealth?.healthy !== true) {
          setCatalogActionMessage(
            refreshAction === "instagram_auth_repair" ?
              "Backfill was not started because Instagram auth is still unhealthy after the manual check."
            : `Backfill was not started because ${platformLabel} cookies are still unhealthy after refresh.`,
          );
          return;
        }
        setCatalogActionMessage(
          refreshAction === "instagram_auth_repair" ?
            "Manual Instagram Auth is validated. Starting Backfill…"
          : `${platformLabel} cookies are refreshed. Starting Backfill…`,
        );
        await startCatalogActionRequest(pendingAction.action, pendingAction.requestBody);
        return;
      }
      if (
        platform === "instagram" &&
        effectiveCookieHealth.refresh_action === "instagram_auth_repair" &&
        !effectiveCookieHealth.refresh_available
      ) {
        setCatalogActionMessage(
          "Backfill cannot continue until Manual Instagram Auth is completed from a local TRR-Backend host.",
        );
        return;
      }
      setCatalogActionMessage(
        `Cannot start ${actionLabel}: ` +
          `${SOCIAL_ACCOUNT_PLATFORM_LABELS[platform]} cookies are expired. Please refresh cookies first.`,
      );
      return;
    }
    await startCatalogActionRequest(action, requestBody);
  }, [
    catalogLaunchGuardMessage,
    cookieHealth,
    fetchCookieHealth,
    handleCookieRefresh,
    platform,
    platformRequiresCookies,
    startCatalogActionRequest,
    user,
  ]);

  const toggleInstagramBackfillTask = useCallback((task: CatalogBackfillSelectedTask) => {
    setInstagramBackfillSelectedTasks((current) =>
      current.includes(task) ? current.filter((value) => value !== task) : [...current, task],
    );
  }, []);

  const openInstagramBackfillDialog = useCallback(() => {
    const defaultWindow = buildInstagramBackfillDateDefaults();
    setInstagramBackfillSelectedTasks([...INSTAGRAM_BACKFILL_DEFAULT_SELECTED_TASKS]);
    setInstagramBackfillDetailWorkerCount(getDefaultInstagramBackfillDetailWorkerCount(handle));
    setInstagramBackfillCommentsWorkerCount(getDefaultInstagramBackfillCommentsWorkerCount(handle));
    setInstagramBackfillCommentMediaFollowups(getDefaultInstagramBackfillCommentMediaFollowups(handle));
    setInstagramBackfillDateStart(defaultWindow.dateStart);
    setInstagramBackfillDateEnd(defaultWindow.dateEnd);
    setInstagramBackfillDialogOpen(true);
  }, [handle]);

  const applyBravoTvFastBackfillPreset = useCallback(() => {
    const defaultWindow = buildInstagramBackfillDateDefaults();
    setInstagramBackfillSelectedTasks([...INSTAGRAM_BACKFILL_DEFAULT_SELECTED_TASKS]);
    setInstagramBackfillDetailWorkerCount(INSTAGRAM_BRAVOTV_FAST_DETAIL_WORKER_COUNT);
    setInstagramBackfillCommentsWorkerCount(INSTAGRAM_BRAVOTV_FAST_COMMENTS_WORKER_COUNT);
    setInstagramBackfillCommentMediaFollowups(true);
    setInstagramBackfillDateStart(defaultWindow.dateStart);
    setInstagramBackfillDateEnd(defaultWindow.dateEnd);
  }, []);

  const submitInstagramBackfillDialog = useCallback(async () => {
    if (instagramBackfillSelectedTasks.length === 0) {
      setCatalogActionMessage("Select at least one backfill task before starting Instagram backfill.");
      return;
    }
    const dateStartIso = dateInputToWindowBoundaryIso(instagramBackfillDateStart, "start");
    const dateEndIso = dateInputToWindowBoundaryIso(instagramBackfillDateEnd, "end");
    if (!dateStartIso || !dateEndIso) {
      setCatalogActionMessage("Choose valid Instagram backfill start and end dates before starting.");
      return;
    }
    if (new Date(dateEndIso).getTime() < new Date(dateStartIso).getTime()) {
      setCatalogActionMessage("Choose an Instagram backfill end date that is on or after the start date.");
      return;
    }
    setInstagramBackfillDialogOpen(false);
    await runCatalogAction(
      "backfill",
      buildBoundedWindowBackfillRequest(
        dateStartIso,
        dateEndIso,
        instagramBackfillSelectedTasks,
        instagramBackfillDetailWorkerCount,
        instagramBackfillCommentsWorkerCount,
        instagramBackfillCommentMediaFollowups,
      ),
    );
  }, [
    buildBoundedWindowBackfillRequest,
    instagramBackfillCommentMediaFollowups,
    instagramBackfillCommentsWorkerCount,
    instagramBackfillDateEnd,
    instagramBackfillDateStart,
    instagramBackfillDetailWorkerCount,
    instagramBackfillSelectedTasks,
    runCatalogAction,
  ]);

  const openCatalogDetail = useCallback(
    async (sourceId: string) => {
      if (!user) return;
      const normalizedSourceId = String(sourceId || "").trim();
      if (!normalizedSourceId) return;
      setCatalogDetailSourceId(normalizedSourceId);
      setCatalogDetail(null);
      setCatalogDetailError(null);
      setCatalogDetailLoading(true);
      try {
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/posts/${encodeURIComponent(normalizedSourceId)}/detail`,
          {
            cache: "no-store",
          },
          { preferredUser: user },
        );
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as ProxyErrorPayload & { error?: string };
          throw buildSocialAccountRequestError(data, "Failed to load catalog post detail");
        }
        const data = (await response.json().catch(() => ({}))) as SocialAccountCatalogPostDetail;
        setCatalogDetail(data);
      } catch (error) {
        const requestError = toSocialAccountRequestError(error, "Failed to load catalog post detail");
        setCatalogDetailError(requestError.message);
      } finally {
        setCatalogDetailLoading(false);
      }
    },
    [fetchAdminWithAuth, handle, platform, user],
  );

  const runCatalogRemediateDrift = async (requestBody: CatalogRemediateDriftRequest = {}) => {
    if (!user) return;
    setRunningCatalogAction("remediate_drift");
    setCatalogActionMessage(null);
    try {
      const requestedRunId = String(requestBody.run_id || displayedCatalogRunId || "").trim() || null;
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/remediate-drift`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requeue_canary: true, source_scope: "network", run_id: requestedRunId, ...requestBody }),
        },
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as CatalogRemediateDriftResponse &
        ProxyErrorPayload & { error?: string; message?: string };
      if (!response.ok) {
        throw buildSocialAccountRequestError(data, "Failed to remediate catalog runtime drift");
      }
      const cancelled = Array.isArray(data.cancelled_runs) ? data.cancelled_runs.length : 0;
      const canaryRunId = String(data.requeued_canary?.run_id || "").trim() || null;
      setCatalogActionMessage(
        canaryRunId
          ? `Cancelled ${cancelled} stuck run${cancelled === 1 ? "" : "s"} and queued clean canary (${canaryRunId.slice(0, 8)}).`
          : `Cancelled ${cancelled} stuck run${cancelled === 1 ? "" : "s"}.`,
      );
      if (canaryRunId) {
        storeCatalogProgressRunId(catalogProgressStorageKey, canaryRunId);
        setCatalogProgressRunId(canaryRunId);
        setCatalogRunProgress(null);
        setCatalogRunProgressError(null);
        setCatalogLogsExpanded(false);
        catalogTerminalSummaryRefreshRunIdRef.current = null;
      }
      await refreshProfileSnapshotNow({ runId: canaryRunId }).catch(() => {});
    } catch (error) {
      const requestError = toSocialAccountRequestError(error, "Failed to remediate catalog runtime drift");
      setCatalogActionMessage(requestError.message ?? "Failed to remediate catalog runtime drift");
    } finally {
      setRunningCatalogAction(null);
    }
  };

  const clearCatalogStuckJobs = async () => {
    if (!user) return;
    setRunningCatalogAction("clear_stuck_jobs");
    setCatalogActionMessage(null);
    try {
      const response = await fetchAdminWithAuth(
        CANCEL_STUCK_SOCIAL_INGEST_JOBS_URL,
        {
          method: "POST",
          cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ job_ids: [] }),
        },
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as {
        cancelled_jobs?: number;
        stuck_jobs_remaining?: number;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel stuck jobs");
      }
      const cancelledJobs = Number(data.cancelled_jobs ?? 0);
      const stuckJobsRemaining = Number(data.stuck_jobs_remaining ?? 0);
      if (cancelledJobs > 0) {
        setCatalogActionMessage(
          `Cancelled ${cancelledJobs} stuck job${cancelledJobs === 1 ? "" : "s"}${
            stuckJobsRemaining > 0 ? ` · ${stuckJobsRemaining} still waiting` : ""
          }.`,
        );
      } else {
        setCatalogActionMessage("No stuck jobs needed cancellation.");
      }
      await refreshProfileSnapshotNow({ runId: displayedCatalogRunId || undefined }).catch(() => {});
    } catch (error) {
      setCatalogActionMessage(error instanceof Error ? error.message : "Failed to cancel stuck jobs");
    } finally {
      setRunningCatalogAction((current) => (current === "clear_stuck_jobs" ? null : current));
    }
  };

  const copyLocalCatalogCommand = async (action: "backfill" | "fill_missing_posts") => {
    const clipboard = navigator.clipboard;
    if (!clipboard?.writeText) {
      setCatalogActionMessage("Clipboard copy is unavailable in this browser.");
      return;
    }
    try {
      const selectedTasks = defaultLocalCatalogCommandSelectedTasks(platform, action);
      await clipboard.writeText(
        buildLocalCatalogCommand(platform, handle, activeCatalogSourceScope, action, selectedTasks, {
          progress: catalogRunProgress,
        }),
      );
      setCatalogActionMessage(
        action === "backfill"
          ? "Copied Backfill Posts terminal command."
          : "Copied Fill Missing Posts terminal command.",
      );
    } catch (error) {
      const clipboardDenied =
        error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
      setCatalogActionMessage(
        clipboardDenied
          ? "Clipboard write is blocked in this browser. Use the Backfill button directly, or enable clipboard access and try Copy again."
          : error instanceof Error
            ? error.message
            : "Failed to copy terminal command.",
      );
    }
  };

  const runFillMissingPosts = async () => {
    if (!user) return;
    setRunningCatalogAction("fill_missing_posts");
    setCatalogActionMessage(null);
    setCatalogGapAnalysisError(null);
    try {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/gap-analysis/run`,
        { method: "POST" },
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as CatalogGapAnalysisStatusPayload;
      if (!response.ok) {
        throw buildSocialAccountRequestError(data, "Failed to start social account catalog gap analysis");
      }

      applyCatalogGapAnalysisStatus(data);

      let result = data.result ?? null;
      let status = data.status ?? "idle";
      let attempts = 0;

      while (!result && (status === "queued" || status === "running") && attempts < 30) {
        attempts += 1;
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, CATALOG_GAP_ANALYSIS_POLL_INTERVAL_MS);
        });
        const statusResponse = await fetchAdminWithAuth(
          `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/gap-analysis`,
          undefined,
          { preferredUser: user },
        );
        const statusData = (await statusResponse.json().catch(() => ({}))) as CatalogGapAnalysisStatusPayload;
        if (!statusResponse.ok) {
          throw buildSocialAccountRequestError(statusData, "Failed to fetch social account catalog gap analysis");
        }
        applyCatalogGapAnalysisStatus(statusData);
        result = statusData.result ?? null;
        status = statusData.status ?? "idle";
      }

      if (!result) {
        if (status === "failed") {
          throw new Error("Failed to analyze social account catalog gaps");
        }
        throw new Error("Catalog gap analysis did not return a repair recommendation.");
      }

      if (result.recommended_action === "sync_newer") {
        await runCatalogAction("sync_newer", {
          source_scope: activeCatalogSourceScope,
        });
        return;
      }

      if (result.recommended_action === "backfill_posts") {
        await runCatalogAction("backfill", buildFullHistoryBackfillRequest());
        return;
      }

      if (result.recommended_action === "bounded_window_backfill") {
        if (!result.repair_window_start || !result.repair_window_end) {
          throw new Error("Gap analysis requested a bounded repair window without dates.");
        }
        await runCatalogAction(
          "backfill",
          buildBoundedWindowBackfillRequest(result.repair_window_start, result.repair_window_end),
        );
        return;
      }

      if (result.recommended_action === "wait_for_active_run") {
        setCatalogActionMessage("A catalog run is already active. Wait for it to finish before filling missing posts.");
        return;
      }

      setCatalogActionMessage("No missing posts to fill right now.");
    } catch (error) {
      setCatalogActionMessage(
        error instanceof Error ? error.message : "Failed to analyze social account catalog gaps",
      );
    } finally {
      setRunningCatalogAction((current) => (current === "fill_missing_posts" ? null : current));
    }
  };

  const runCatalogRepairAuth = async (runId: string, requestBody: CatalogRepairAuthRequest = {}) => {
    const normalizedRunId = runId.trim();
    if (!user || !normalizedRunId) return;
    const repairAction = catalogRunProgress?.repair_action || "repair_instagram_auth";
    if (platform === "instagram" && repairAction === "repair_instagram_auth" && !requestBody.operator_confirmation) {
      setCatalogRepairAuthConfirmationRunId(normalizedRunId);
      setCatalogActionMessage(INSTAGRAM_AUTH_REFRESH_WARNING);
      return;
    }
    setRunningCatalogAction("repair_auth");
    setCatalogRepairAuthConfirmationRunId(null);
    setCatalogActionMessage(null);
    try {
      const repairActionPath = getCatalogRepairAuthEndpointSegment(repairAction);
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/runs/${encodeURIComponent(normalizedRunId)}/${repairActionPath}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        },
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        detail?: { message?: string };
        repair_action?: SocialAccountCatalogRunProgressSnapshot["repair_action"];
        repair_status?: string;
        resume_stage?: string | null;
      };
      if (!response.ok) {
        throw new Error(
          data.error || data.message || data.detail?.message || "Failed to repair auth for this catalog run",
        );
      }
      const responseRepairAction = data.repair_action || catalogRunProgress?.repair_action || "repair_instagram_auth";
      const platformLabel = SOCIAL_ACCOUNT_PLATFORM_LABELS[platform];
      setCatalogActionMessage(
        responseRepairAction === "repair_instagram_auth" ?
          "Checking manual Instagram auth state and syncing only already validated cookies."
        : `Refreshing ${platformLabel} cookies… A local headed Chrome window will open for confirmation.`,
      );
      setCatalogRunProgress((current) =>
        current && current.run_id === normalizedRunId ?
          {
            ...current,
            operational_state: "blocked_auth",
            repair_action: responseRepairAction,
            repair_status: (data.repair_status as SocialAccountCatalogRunProgressSnapshot["repair_status"]) || "running",
            resume_stage:
              (data.resume_stage as SocialAccountCatalogRunProgressSnapshot["resume_stage"]) || current.resume_stage,
          }
        : current,
      );
      await refreshProfileSnapshotNow({ runId: normalizedRunId }).catch(() => {});
    } catch (error) {
      setCatalogActionMessage(
        error instanceof Error ? error.message : "Failed to repair auth for this catalog run",
      );
    } finally {
      setRunningCatalogAction(null);
    }
  };

  const cancelCatalogRun = async () => {
    const runId = String(cancellableCatalogRunId || "").trim();
    if (!user || !runId) return;
    setCancellingCatalogRun(true);
    setCatalogActionMessage(null);
    try {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/runs/${encodeURIComponent(runId)}/cancel`,
        {
          method: "POST",
        },
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        cancelled_jobs?: number;
        claimed_jobs_cancelled?: number;
      };
      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel catalog run");
      }
      const cancelledJobs = readFiniteNumber(data.cancelled_jobs);
      const claimedJobs = readFiniteNumber(data.claimed_jobs_cancelled);
      const cancelMessage =
        String(data.message || "").trim() ||
        [
          `Cancel requested for run ${shortRunId(runId)}.`,
          claimedJobs !== null && claimedJobs > 0
            ? `${formatInteger(claimedJobs)} claimed job(s) may finish in-flight post/detail saves before the worker stops.`
            : cancelledJobs !== null && cancelledJobs > 0
              ? `${formatInteger(cancelledJobs)} queued job(s) were marked cancelled.`
              : "No queued jobs were available to cancel; claimed work may still finish before workers stop.",
        ].join(" ");
      const reconciled = await reconcileCatalogRunAfterCancelAttempt(runId);
      if (!reconciled) {
        setCatalogActionMessage(`${cancelMessage} Waiting for backend confirmation.`);
        void refreshProfileSnapshotNow({ runId }).catch(() => {});
      } else {
        setCatalogActionMessage(cancelMessage);
      }
    } catch (error) {
      const reconciled = await reconcileCatalogRunAfterCancelAttempt(runId);
      if (reconciled) {
        return;
      }
      setCatalogActionMessage(error instanceof Error ? error.message : "Failed to cancel catalog run");
    } finally {
      setCancellingCatalogRun(false);
    }
  };

  const cancelActiveCommentsRun = async () => {
    const runId = String(activeCommentsRunId || "").trim();
    if (!user || !runId || !activeCommentsRunCanCancel) return;
    const confirmed =
      typeof window === "undefined" ||
      window.confirm(
        [
          `Cancel comments run ${shortRunId(runId)}?`,
          "This stops the comments shards to free post-details capacity. Saved comments stay saved, and you can resume from the remaining unchecked posts.",
        ].join("\n\n"),
      );
    if (!confirmed) return;
    setCancellingActiveCommentsRun(true);
    setCatalogActionMessage(`Cancelling comments run ${shortRunId(runId)}...`);
    try {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/comments/runs/${encodeURIComponent(runId)}/cancel`,
        { method: "POST" },
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string; detail?: { message?: string } };
      if (!response.ok) {
        throw new Error(data.error || data.message || data.detail?.message || "Failed to cancel comments run");
      }
      setCatalogActionMessage(`Comments run ${shortRunId(runId)} cancelled.`);
      await refreshProfileSnapshotNow().catch(() => {});
      refetchActiveCommentsRunProgress({ cause: "manual", forceRefresh: true });
    } catch (error) {
      setCatalogActionMessage(error instanceof Error ? error.message : "Failed to cancel comments run");
    } finally {
      setCancellingActiveCommentsRun(false);
    }
  };

  const resumeActiveCommentsRun = async () => {
    const runId = String(activeCommentsRunId || "").trim();
    if (!user || !runId || !activeCommentsRunCanResume) return;
    setResumingActiveCommentsRun(true);
    setCatalogActionMessage(`Resuming remaining comments targets from run ${shortRunId(runId)}...`);
    try {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/comments/runs/${encodeURIComponent(runId)}/resume`,
        { method: "POST" },
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as {
        run_id?: string | null;
        status?: string | null;
        accepted?: boolean;
        remaining_target_source_ids_count?: number | null;
        error?: string;
        message?: string;
        detail?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(data.error || data.message || data.detail?.message || "Failed to resume comments run");
      }
      const nextRunId = String(data.run_id || "").trim();
      if (!nextRunId) {
        setCatalogActionMessage(
          data.status === "no_work"
            ? `Comments run ${shortRunId(runId)} has no remaining unchecked posts to resume.`
            : "No resume comments run was created.",
        );
        await refreshProfileSnapshotNow().catch(() => {});
        refetchActiveCommentsRunProgress({ cause: "manual", forceRefresh: true });
        return;
      }
      setCommentsProgressRunId(nextRunId);
      storeCatalogProgressRunId(commentsProgressStorageKey, nextRunId);
      const remainingCount = readFiniteNumber(data.remaining_target_source_ids_count);
      setCatalogActionMessage(
        remainingCount !== null
          ? `Resumed comments run ${shortRunId(nextRunId)} for ${formatInteger(remainingCount)} remaining posts.`
          : `Resumed comments run ${shortRunId(nextRunId)}.`,
      );
      await refreshProfileSnapshotNow().catch(() => {});
      refetchActiveCommentsRunProgress({ cause: "manual", forceRefresh: true });
    } catch (error) {
      setCatalogActionMessage(error instanceof Error ? error.message : "Failed to resume comments run");
    } finally {
      setResumingActiveCommentsRun(false);
    }
  };

  const cancelCommentsShardJob = async (jobId: string | null | undefined) => {
    const runId = String(activeCommentsRunId || "").trim();
    const normalizedJobId = String(jobId || "").trim();
    if (!user || !runId || !normalizedJobId) return;
    setCancellingCommentsJobId(normalizedJobId);
    setCatalogActionMessage(`Cancelling shard job ${shortRunId(normalizedJobId)}...`);
    try {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/comments/runs/${encodeURIComponent(runId)}/jobs/${encodeURIComponent(normalizedJobId)}/cancel`,
        { method: "POST" },
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        detail?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(data.error || data.message || data.detail?.message || "Failed to cancel comments shard");
      }
      setCatalogActionMessage(`Shard job ${shortRunId(normalizedJobId)} cancelled.`);
      refetchActiveCommentsRunProgress({ cause: "manual", forceRefresh: true });
    } catch (error) {
      setCatalogActionMessage(error instanceof Error ? error.message : "Failed to cancel comments shard");
    } finally {
      setCancellingCommentsJobId(null);
    }
  };

  const dismissCatalogRun = async (runId: string) => {
    const normalizedRunId = runId.trim();
    if (!user || !normalizedRunId) return;
    const wasDisplayedRun = displayedCatalogRunId === normalizedRunId;
    setDismissingCatalogRunId(normalizedRunId);
    setCatalogActionMessage(null);
    setPendingDismissedCatalogRunIds((current) => new Set(current).add(normalizedRunId));
    storeCatalogProgressRunId(catalogProgressStorageKey, null);
    if (catalogProgressRunId === normalizedRunId) {
      setCatalogProgressRunId(null);
    }
    if (catalogRunProgress?.run_id === normalizedRunId) {
      setCatalogRunProgress(null);
      setCatalogRunProgressError(null);
    }
    setCatalogProgressLastSuccessAt(null);
    try {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/runs/${encodeURIComponent(normalizedRunId)}/dismiss`,
        {
          method: "POST",
        },
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to dismiss catalog run");
      }
      setCatalogActionMessage(`Dismissed run ${shortRunId(normalizedRunId)}.`);
      await refreshProfileSnapshotNow().catch(() => {});
    } catch (error) {
      setPendingDismissedCatalogRunIds((current) => {
        const next = new Set(current);
        next.delete(normalizedRunId);
        return next;
      });
      if (wasDisplayedRun) {
        setCatalogProgressRunId(normalizedRunId);
        setCatalogProgressRequestNonce((current) => current + 1);
      }
      await refreshProfileSnapshotNow({ runId: normalizedRunId }).catch(() => {});
      setCatalogActionMessage(error instanceof Error ? error.message : "Failed to dismiss catalog run");
    } finally {
      setDismissingCatalogRunId(null);
    }
  };

  const resolveReviewItem = async (itemId: string, payload: CatalogReviewResolveRequest) => {
    if (!user) return;
    setResolvingReviewItemId(itemId);
    setCatalogActionMessage(null);
    try {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/review-queue/${encodeURIComponent(itemId)}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to resolve catalog review item");
      }
      setCatalogActionMessage("Updated hashtag review item.");
      const reviewResponse = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/review-queue`,
        undefined,
        { preferredUser: user },
      );
      if (reviewResponse.ok) {
        const reviewData = (await reviewResponse.json().catch(() => ({}))) as CatalogReviewQueueResponse;
        setReviewQueue(reviewData.items ?? []);
      }
      await refreshHashtags().catch(() => {});
      await refreshProfileSnapshotNow();
    } catch (error) {
      setCatalogActionMessage(error instanceof Error ? error.message : "Failed to resolve catalog review item");
    } finally {
      setResolvingReviewItemId(null);
    }
  };

  const networkProfileName = resolveNetworkProfileName(summary, catalogRunProgress);
  const headerTitle = networkProfileName
    ? `${SOCIAL_ACCOUNT_PLATFORM_LABELS[platform]} · ${networkProfileName} · @${handle}`
    : `${SOCIAL_ACCOUNT_PLATFORM_LABELS[platform]} · @${handle}`;
  const breadcrumbs = [
    ...buildAdminSectionBreadcrumb("Social Analytics", ADMIN_SOCIAL_PATH),
    { label: `${SOCIAL_ACCOUNT_PLATFORM_LABELS[platform]} @${handle}`, href: buildSocialAccountProfileUrl({ platform, handle }) },
  ];
  const instagramBackfillIncludesDetails = instagramBackfillSelectedTasks.includes("post_details");
  const instagramBackfillIncludesComments = instagramBackfillSelectedTasks.includes("comments");
  const instagramBackfillIncludesMedia = instagramBackfillSelectedTasks.includes("media");
  const instagramBackfillCommentMediaEnabled =
    instagramBackfillIncludesComments && (instagramBackfillCommentMediaFollowups || instagramBackfillIncludesMedia);
  const instagramBackfillEstimatedPostTargets = Math.max(
    0,
    Number(
      summary?.live_catalog_total_posts ??
      summary?.catalog_total_posts ??
      summary?.total_posts ??
      0,
    ),
  );
  const instagramBackfillCoverageGapTargets =
    Number(summary?.comments_coverage?.stale_posts ?? 0) + Number(summary?.comments_coverage?.missing_posts ?? 0);
  const instagramBackfillSavedCommentPostTargets = Number(
    summary?.comments_saved_summary?.retrieved_comment_posts ??
      summary?.comments_saved_summary?.saved_comment_posts ??
      0,
  );
  const instagramBackfillEstimatedCommentTargets = Math.max(
    0,
    Number(
      instagramCommentsCoverageMetrics?.incompletePosts ??
      instagramCommentsCoverageMetrics?.commentablePosts ??
      (instagramBackfillCoverageGapTargets > 0 ? instagramBackfillCoverageGapTargets : null) ??
      summary?.comments_coverage?.eligible_posts ??
      (instagramBackfillSavedCommentPostTargets > 0 ? instagramBackfillSavedCommentPostTargets : null) ??
      summary?.comments_coverage?.available_posts ??
      instagramBackfillEstimatedPostTargets,
    ),
  );
  const instagramBackfillDetailMinutes = estimateInstagramBackfillMinutes(
    instagramBackfillEstimatedPostTargets || null,
    instagramBackfillDetailWorkerCount,
    30,
  );
  const instagramBackfillCommentsMinutes = estimateInstagramBackfillMinutes(
    instagramBackfillEstimatedCommentTargets || instagramBackfillEstimatedPostTargets || null,
    instagramBackfillCommentsWorkerCount,
    0.4,
  );
  const instagramBackfillEstimatedWallSeconds =
    Math.max(
      instagramBackfillIncludesDetails ? instagramBackfillDetailMinutes ?? 0 : 0,
      instagramBackfillIncludesComments ? instagramBackfillCommentsMinutes ?? 0 : 0,
    ) * 60;
  const instagramBackfillEstimatedWorkerMinutes =
    (instagramBackfillIncludesDetails ? (instagramBackfillDetailMinutes ?? 0) * instagramBackfillDetailWorkerCount : 0) +
    (instagramBackfillIncludesComments ? (instagramBackfillCommentsMinutes ?? 0) * instagramBackfillCommentsWorkerCount : 0);
  const instagramBackfillPreflightItems = [
    instagramBackfillIncludesDetails ? `${instagramBackfillDetailWorkerCount} detail workers` : "Details skipped",
    instagramBackfillIncludesComments
      ? `${instagramBackfillCommentsWorkerCount} comments workers`
      : "Comments skipped",
    instagramBackfillIncludesMedia ? "Post media enabled" : "Post media skipped",
    instagramBackfillCommentMediaEnabled ? "Comment media enabled" : "Comment media skipped",
  ];
  const handleInstagramCommentsCoverageMetricsChange = useCallback(
    (metrics: { availablePosts: number; commentablePosts: number; incompletePosts: number | null }) => {
      setInstagramCommentsCoverageMetrics((current) => {
        if (
          current &&
          current.availablePosts === metrics.availablePosts &&
          current.commentablePosts === metrics.commentablePosts &&
          current.incompletePosts === metrics.incompletePosts
        ) {
          return current;
        }
        return metrics;
      });
    },
    [],
  );

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-sm text-zinc-500">Loading admin access…</div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
        <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">Access Required</p>
          <h1 className="mt-2 text-xl font-bold">Admin access is required</h1>
          <p className="mt-2 text-sm text-amber-800">You do not have permission to view social account profiles.</p>
        </div>
      </div>
    );
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        <AdminGlobalHeader bodyClassName="px-6 py-6">
          <div className="mx-auto max-w-6xl">
            <AdminBreadcrumbs items={breadcrumbs} className="mb-2" />
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-zinc-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                    Official Social Profile
                  </span>
                  <div className="relative">
                    <Button
                      onClick={() => {
                        const nextOpen = !accountSwitcherOpen;
                        setAccountSwitcherOpen(nextOpen);
                        if (nextOpen) {
                          void loadSharedAccountSources();
                        }
                      }}
                      size="sm"
                      variant="outline"
                      className={NYT_DASHBOARD_BUTTON_CLASS}
                      aria-haspopup="menu"
                      aria-expanded={accountSwitcherOpen}
                    >
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-[4px] bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400">
                        <span className="h-1.5 w-1.5 rounded-full border border-white" />
                      </span>
                      {socialPlatformLabel(platform)}
                      <ChevronDownIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                    {accountSwitcherOpen ? (
                      <div className="absolute left-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-xl border border-zinc-200 bg-white text-left shadow-xl">
                        <div className="max-h-80 overflow-y-auto py-1">
                          {accountSwitcherSources.map((source) => {
                            const sourcePlatform = readString(source.platform) || platform;
                            const sourceHandle = readString(source.account_handle) || handle;
                            const isCurrent =
                              normalizeComparable(sourcePlatform) === normalizeComparable(platform) &&
                              normalizeComparable(sourceHandle) === normalizeComparable(handle);
                            const href = buildSocialAccountProfileUrl({
                              platform: sourcePlatform,
                              handle: sourceHandle,
                              tab: selectedTab,
                            }) as Route;
                            const content = (
                              <>
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold uppercase text-zinc-600">
                                  {socialPlatformLabel(sourcePlatform).slice(0, 2)}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-semibold text-zinc-900">
                                    {socialSourceDisplayName(source)}
                                  </span>
                                  <span className="block truncate text-xs text-zinc-500">
                                    {socialPlatformLabel(sourcePlatform)} @{sourceHandle}
                                  </span>
                                </span>
                                {isCurrent ? (
                                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
                                    Current
                                  </span>
                                ) : null}
                              </>
                            );
                            return isCurrent ? (
                              <div key={`${sourcePlatform}:${sourceHandle}`} className="flex items-center gap-3 px-3 py-2">
                                {content}
                              </div>
                            ) : (
                              <Link
                                key={`${sourcePlatform}:${sourceHandle}`}
                                href={href}
                                prefetch={false}
                                className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-50"
                              >
                                {content}
                              </Link>
                            );
                          })}
                          {sharedAccountSourcesLoading ? (
                            <p className="px-3 py-2 text-sm text-zinc-500">Loading accounts...</p>
                          ) : null}
                          {sharedAccountSourcesError ? (
                            <p className="px-3 py-2 text-sm text-amber-700">{sharedAccountSourcesError}</p>
                          ) : null}
                          {!sharedAccountSourcesLoading && accountSwitcherSources.length <= 1 ? (
                            <p className="px-3 py-2 text-xs text-zinc-500">No other show handles are configured.</p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                <h1 className="mt-3 text-3xl font-bold text-zinc-900">{headerTitle}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {summary?.profile_url ? (
                    <a
                      href={summary.profile_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Open public profile
                    </a>
                  ) : null}
                  {supportsCatalog ? (
                    <>
                      <Button
                        onClick={() =>
                          platform === "instagram"
                            ? openInstagramBackfillDialog()
                            : void runCatalogAction("backfill", buildFullHistoryBackfillRequest())
                        }
                        disabled={catalogLaunchActionsBlocked}
                        variant="primary"
                        className={NYT_DASHBOARD_PRIMARY_BUTTON_CLASS}
                      >
                        {runningCatalogAction === "backfill" ? "Preparing Backfill…" : "Backfill Posts"}
                      </Button>
                      <Button
                        aria-label="Copy terminal command"
                        title="Copy Backfill Posts terminal command"
                        onClick={() => void copyLocalCatalogCommand("backfill")}
                        size="sm"
                        variant="outline"
                        className={NYT_DASHBOARD_ICON_BUTTON_CLASS}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" />
                          <path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.44A1.5 1.5 0 0 0 8.378 6H4.5Z" />
                        </svg>
                      </Button>
                      <Button
                        onClick={() => void runFillMissingPosts()}
                        disabled={catalogLaunchActionsBlocked}
                        variant="outline"
                        className={NYT_DASHBOARD_BUTTON_CLASS}
                      >
                        {runningCatalogAction === "fill_missing_posts" ? "Analyzing Gaps…" : "Fill Missing Posts"}
                      </Button>
                      <Button
                        aria-label="Copy terminal command"
                        title="Copy Fill Missing Posts terminal command"
                        onClick={() => void copyLocalCatalogCommand("fill_missing_posts")}
                        size="sm"
                        variant="outline"
                        className={NYT_DASHBOARD_ICON_BUTTON_CLASS}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" />
                          <path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.44A1.5 1.5 0 0 0 8.378 6H4.5Z" />
                        </svg>
                      </Button>
                      {platform !== "instagram" ? (
                        <Button
                          onClick={() =>
                            void runCatalogAction("sync_recent", {
                              lookback_days: 1,
                            })
                          }
                          disabled={catalogLaunchActionsBlocked}
                          variant="outline"
                          className={NYT_DASHBOARD_BUTTON_CLASS}
                        >
                          {runningCatalogAction === "sync_recent" ? "Queueing Recent Sync…" : "Sync Recent"}
                        </Button>
                      ) : null}
                      {cancellableCatalogRunId && cancellableCatalogRunIsActive ? (
                        <Button
                          onClick={() => void cancelCatalogRun()}
                          disabled={runningCatalogAction !== null || cancellingCatalogRun}
                          variant="outline"
                          className={NYT_DASHBOARD_DANGER_BUTTON_CLASS}
                        >
                          {cancellingCatalogRun ? "Cancelling Run…" : "Cancel Run"}
                        </Button>
                      ) : null}
                      {cancellableCatalogRunId ? (
                        <span className="text-xs font-medium text-zinc-500">
                          {cancellableCatalogRunIsActive
                            ? `Run ${shortRunId(cancellableCatalogRunId)} is ${cancellableCatalogRunStatusLabel}. ${
                                catalogDispatchStatusMessage?.text
                                  ? `${catalogDispatchStatusMessage.text} `
                                  : ""
                              }Start buttons unlock after it finishes or cancel is confirmed. Cancel is best-effort after a worker claims work.`
                            : `Run ${shortRunId(cancellableCatalogRunId)} is scrape-complete. New backfills are unlocked while classification continues in the background.`}
                        </span>
                      ) : null}
                      {!cancellableCatalogRunId && activeCommentsRunBlocksActions && activeCommentsRunId ? (
                        <span className="text-xs font-medium text-zinc-500">
                          Comments run {shortRunId(activeCommentsRunId)} is{" "}
                          {getCatalogRunDisplayStatusLabel(activeCommentsRunStatus || "running", null)}. Start buttons unlock after
                          it finishes.
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                      Catalog Actions Unavailable In V1
                    </span>
                  )}
                </div>
                {supportsCatalog ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    {platform === "instagram"
                      ? "Backfill Posts starts with listing saved post identities. Post Details, Comments, and Media are follow-up lanes and stay separate from listing completion."
                      : platform === "twitter"
                        ? "Backfill Posts runs the past-year catalog job. Sync Recent runs the same pipeline, limited to the last day."
                      : "Backfill Posts runs the full-history catalog job. Sync Recent runs the same pipeline, limited to the last day."}
                  </p>
                ) : null}
                {catalogLaunchGuardMessage ? <p className="mt-2 text-sm text-red-700">{catalogLaunchGuardMessage}</p> : null}
                {catalogActionMessage ? <p className="mt-2 text-sm text-zinc-600">{catalogActionMessage}</p> : null}
                {/* Cookie preflight card for cookie-dependent platforms */}
                {supportsCatalog && platformRequiresCookies ? (
                  <div className="mt-3 flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                    {showCookieHealthLoading ? (
                      <>
                        <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-zinc-400" />
                        <span className="text-xs text-zinc-500">Checking cookies…</span>
                      </>
                    ) : showCookieHealthError ? (
                      <>
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
                        <span className="text-xs text-zinc-500">Cookie check failed</span>
                        <Button
                          onClick={() => void fetchCookieHealth(true)}
                          size="sm"
                          variant="outline"
                          className={NYT_DASHBOARD_BUTTON_CLASS}
                        >
                          Retry
                        </Button>
                      </>
                    ) : instagramCommentsAuthOwnsCurrentSurface ? (
                      <>
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <span className="text-xs text-zinc-600">Comments auth active</span>
                      </>
                    ) : cookieHealth?.degraded ? (
                      <>
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
                        <span className="text-xs text-zinc-600">Cookie check unavailable</span>
                      </>
                    ) : cookieHealth?.healthy === true ? (
                      <>
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <span className="text-xs text-zinc-600">
                          {cookieHealthPrimaryLabel ?? "Local cookies healthy"}
                        </span>
                      </>
                    ) : cookieHealth?.healthy === false ? (
                      <>
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
                        <span className="text-xs text-zinc-600">
                          {cookieHealth.auth_surface_blocked ? "Instagram auth blocked" : "Cookies expired"}
                          {cookieHealth.reason ? ` — ${cookieHealth.reason}` : ""}
                        </span>
                        {cookieHealth.refresh_available ? (
                          <Button
                            onClick={() =>
                              void handleCookieRefresh({
                                confirmed:
                                  platform === "instagram" &&
                                  cookieHealth.refresh_action === "instagram_auth_repair" &&
                                  cookieRefreshConfirmationPending,
                              })
                            }
                            disabled={cookieRefreshing}
                            size="sm"
                            variant="outline"
                            className={NYT_DASHBOARD_BUTTON_CLASS}
                          >
                            {cookieRefreshing
                              ? platform === "instagram" && cookieHealth.refresh_action === "instagram_auth_repair"
                                ? "Syncing…"
                                : "Refreshing…"
                              : platform === "instagram" &&
                                  cookieHealth.refresh_action === "instagram_auth_repair" &&
                                  cookieRefreshConfirmationPending
                                ? "Confirm Manual Auth Check"
                                : cookieHealth.refresh_label || "Refresh Cookies"}
                          </Button>
                        ) : (
                          <span className="text-xs text-zinc-400" title="Cookie refresh requires local dev server">
                            {(cookieHealth.refresh_label || "Refresh Cookies") + " unavailable (requires local dev)"}
                          </span>
                        )}
                      </>
                    ) : null}
                    {instagramPostsAuthStatusCopy ? (
                      <span className={`text-xs ${instagramPostsAuthStatusCopy.tone}`}>
                        {instagramPostsAuthStatusCopy.text}
                      </span>
                    ) : null}
                    {instagramCookiePayloadStatusCopy ? (
                      <span className={`text-xs ${instagramCookiePayloadStatusCopy.tone}`}>
                        {instagramCookiePayloadStatusCopy.text}
                      </span>
                    ) : null}
                    {cookieRefreshMessage && !instagramCommentsAuthOwnsCurrentSurface ? (
                      <span className="text-xs text-zinc-500">{cookieRefreshMessage}</span>
                    ) : null}
                    {cookieHealth?.warning_message ? (
                      <span className="text-xs text-amber-600" title={cookieHealth.warning_message}>
                        ⚠ {formatCookieHealthWarningLabel(cookieHealth)}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-4 flex flex-col gap-1">
                  <h2 className="text-base font-semibold text-zinc-900">Library Totals</h2>
                  <p className="text-xs text-zinc-500">
                    These are all-time saved records for this profile. Active backfill progress is shown separately below.
                  </p>
                </div>
                <div className={`mt-3 grid w-full min-w-0 gap-3 sm:grid-cols-2 ${supportsCatalog ? "lg:grid-cols-3" : ""}`}>
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Saved Posts</p>
                    {summaryInitialStatePending ? (
                      <>
                        <p className="mt-2 text-sm font-semibold text-zinc-500">Loading…</p>
                        {supportsCatalog ? <p className="mt-1 text-xs text-zinc-500">{postsSummaryLabel}</p> : null}
                      </>
                    ) : supportsCatalog ? (
                      <>
                        <p className="mt-2 text-2xl font-bold leading-tight text-zinc-900">
                          {formatInteger(displayCatalogTotalPosts)} / {formatInteger(displayTotalPosts)}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">{postsSummaryLabel}</p>
                      </>
                    ) : (
                      <p className="mt-2 text-2xl font-bold text-zinc-900">{formatInteger(displayTotalPosts)}</p>
                    )}
                  </div>
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">All-time Saved Comments</p>
                    {summaryInitialStatePending || commentsSavedSummaryUnavailable ? (
                      <>
                        <p className="mt-2 text-sm font-semibold text-zinc-500">
                          {summaryInitialStatePending ? "Loading…" : "Unavailable"}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="mt-2 text-2xl font-bold text-zinc-900">{formatInteger(commentsSavedCount)}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {formatInteger(commentsSavedCount)} saved comments / {formatInteger(commentsRetrievedCount)} reported comments
                        </p>
                      </>
                    )}
                  </div>
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">All-time Comment Gap</p>
                    {summaryInitialStatePending || commentsSavedSummaryUnavailable ? (
                      <p className="mt-2 text-sm font-semibold text-zinc-500">
                        {summaryInitialStatePending ? "Loading…" : "Unavailable"}
                      </p>
                    ) : (
                      <>
                        <p className="mt-2 text-2xl font-bold text-zinc-900">{formatInteger(commentsGapCount)}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {formatInteger(commentsRetrievedCount)} reported minus {formatInteger(commentsSavedCount)} saved
                        </p>
                      </>
                    )}
                  </div>
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">All-time Media Saved</p>
                    {summaryInitialStatePending || mediaCoverageUnavailable ? (
                      <>
                        <p className="mt-2 text-sm font-semibold text-zinc-500">
                          {summaryInitialStatePending ? "Loading…" : "Unavailable"}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="mt-2 text-2xl font-bold text-zinc-900">{formatInteger(mediaSavedFiles)}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {formatInteger(mediaSavedFiles)} / {formatInteger(mediaTotalFiles)} files
                        </p>
                      </>
                    )}
                  </div>
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Latest Saved Post</p>
                    <p className="mt-2 text-sm font-semibold text-zinc-900">
                      {summaryInitialStatePending ? "Loading…" : formatDateTime(displayLastPostAt)}
                    </p>
                  </div>
                  {supportsCatalog ? (
                    <Button
                      onClick={() => setPendingReviewOpen(true)}
                      variant="outline"
                      className="block rounded-2xl border-zinc-200 bg-white p-4 text-left shadow-sm hover:border-zinc-300 hover:bg-zinc-50"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Pending Review</p>
                      {summaryInitialStatePending ? (
                        <p className="mt-2 text-sm font-semibold text-zinc-500">Loading…</p>
                      ) : (
                        <>
                          <p className="mt-2 text-2xl font-bold text-zinc-900">
                            {formatInteger(summary?.catalog_pending_review_posts)}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">Unknown hashtag review queue</p>
                        </>
                      )}
                    </Button>
                  ) : null}
                </div>
                {pendingReviewOpen ? (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/35 px-4 py-6"
                    role="dialog"
                    aria-modal="true"
                  >
                    <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-zinc-200 bg-white shadow-xl">
                      <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
                        <div>
                          <h2 className="text-base font-bold text-zinc-900">Pending Review</h2>
                          <p className="mt-1 text-sm text-zinc-500">
                            {formatInteger(summary?.catalog_pending_review_posts)} unknown hashtag assignments are waiting.
                          </p>
                        </div>
                        <Button
                          onClick={() => setPendingReviewOpen(false)}
                          size="sm"
                          variant="outline"
                          className={NYT_DASHBOARD_ICON_BUTTON_CLASS}
                          aria-label="Close pending review details"
                        >
                          <XIcon className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                        {reviewQueueLoading ? <p className="text-sm text-zinc-500">Loading review queue...</p> : null}
                        {reviewQueueError ? <p className="text-sm text-red-700">{reviewQueueError}</p> : null}
                        {!reviewQueueLoading && !reviewQueueError && reviewQueue.length === 0 ? (
                          <p className="text-sm text-zinc-500">No unknown hashtags are waiting for review.</p>
                        ) : null}
                        <div className="space-y-2">
                          {reviewQueue.slice(0, 25).map((item) => (
                            <div key={item.id} className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-zinc-900">
                                    {item.display_hashtag ?? `#${item.hashtag}`}
                                  </p>
                                  <p className="mt-0.5 text-xs text-zinc-500">
                                    {formatInteger(item.usage_count)} uses · Last seen {formatDateTime(item.last_seen_at)}
                                  </p>
                                </div>
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                                  {item.review_status}
                                </span>
                              </div>
                              <p className="mt-2 text-xs text-zinc-500">
                                Suggested shows:{" "}
                                {item.suggested_shows?.map((show) => show.show_name).filter(Boolean).join(", ") ||
                                  "No suggestions yet"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-5 py-4">
                        <span className="text-xs text-zinc-500">
                          Showing {formatInteger(Math.min(reviewQueue.length, 25))} of {formatInteger(reviewQueue.length)} loaded items.
                        </span>
                        <Link
                          href={buildSocialAccountProfileUrl({ platform, handle, tab: "hashtags" }) as Route}
                          prefetch={false}
                          onClick={() => setPendingReviewOpen(false)}
                          className="rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-semibold text-white"
                        >
                          Open Hashtags
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : null}
                {platform === "instagram" && activeCommentsRunId ? (
                  <div className="mt-3 rounded-lg border border-zinc-200 bg-white px-3 py-3 text-sm shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900">Active Comments Run</h3>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          Truth source: comments run progress · Run {shortRunId(activeCommentsRunId)} · {activeCommentsProgressSummary.status}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">
                          {activeCommentsProgressSummary.status}
                        </span>
                        {activeCommentsRunCanCancel ? (
                        <Button
                          onClick={() => void cancelActiveCommentsRun()}
                          disabled={cancellingActiveCommentsRun || !user}
                          size="sm"
                          variant="outline"
                          className={NYT_DASHBOARD_DANGER_BUTTON_CLASS}
                        >
                            {cancellingActiveCommentsRun ? "Cancelling..." : "Cancel Comments"}
                          </Button>
                        ) : null}
                        {activeCommentsRunCanResume ? (
                          <Button
                            onClick={() => void resumeActiveCommentsRun()}
                          disabled={resumingActiveCommentsRun || !user}
                          size="sm"
                          variant="secondary"
                            className={NYT_DASHBOARD_BUTTON_CLASS}
                          >
                            {resumingActiveCommentsRun ? "Resuming..." : "Resume Remaining"}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {activeCommentsRunProgressPollError ? (
                      <p className="mt-2 text-xs text-amber-700">
                        Progress poll is retrying: {activeCommentsRunProgressPollError}
                      </p>
                    ) : null}
                    {activeCommentsRunCanCancel ? (
                      <p className="mt-2 text-xs text-zinc-500">
                        Cancelling stops comments shards to free post-details capacity. Saved comments remain saved, and the
                        remaining unchecked posts can be resumed from this card.
                      </p>
                    ) : null}
                    {activeCommentsRunScopeNotice ? (
                      <p className="mt-2 text-xs font-medium text-sky-700">{activeCommentsRunScopeNotice}</p>
                    ) : null}
                    {activeCommentsProgressWarning ? (
                      <p className="mt-2 text-xs font-medium text-amber-700">{activeCommentsProgressWarning}</p>
                    ) : null}
                    {activeCommentsProgressSummary.autoRebalancedJobCount ? (
                      <p className="mt-2 text-xs font-medium text-sky-700">
                        Slow-shard rebalance queued {formatInteger(activeCommentsProgressSummary.autoRebalancedJobCount)} replacement jobs.
                      </p>
                    ) : null}
                    {activeCommentsRunProgressData ? (
                      <>
                        <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-zinc-800">
                              {activeCommentsProgressSummary.postsLabel ?? "Checking comments targets..."}
                            </p>
                            {activeCommentsProgressSummary.jobSummary ? (
                              <p className="text-xs text-zinc-500">{activeCommentsProgressSummary.jobSummary}</p>
                            ) : null}
                          </div>
                          <Progress className="mt-2 h-2" value={activeCommentsProgressSummary.postsPercent ?? 0} />
                          <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            {[
                              ["Fetched", activeCommentsProgressSummary.commentsProcessedLabel],
                              ["Saved New", activeCommentsProgressSummary.commentsInsertedLabel],
                              ["Total Saved", activeCommentsProgressSummary.savedLabel],
                              ["Estimated Finish", activeCommentsProgressSummary.etaLabel ? `About ${activeCommentsProgressSummary.etaLabel}` : null],
                            ].map(([label, value]) =>
                              value ? (
                                <div key={label}>
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                                    {label}
                                  </p>
                                  <p className="mt-1 text-xs font-semibold text-zinc-800">{value}</p>
                                </div>
                              ) : null,
                            )}
                          </div>
                          {activeCommentsProgressSummary.throughputLabel ? (
                            <p className="mt-2 text-xs text-zinc-500">{activeCommentsProgressSummary.throughputLabel}</p>
                          ) : null}
                          {activeCommentsProgressSummary.movementLabel ? (
                            <p className="mt-2 text-xs font-medium text-zinc-700">
                              {activeCommentsProgressSummary.movementLabel}
                            </p>
                          ) : null}
                          {activeCommentsProgressSummary.currentMovementLabel ? (
                            <p className="mt-2 text-xs font-medium text-amber-700">
                              {activeCommentsProgressSummary.currentMovementLabel}
                            </p>
                          ) : null}
                        </div>
                        {activeCommentsProgressRankedRows.length > 0 ? (
                          <div className="mt-3 rounded-lg border border-zinc-100 bg-white px-3 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-zinc-800">Shard Health</p>
                              <p className="text-[11px] text-zinc-500">
                                {commentsShardHealthSummary.running} running · {commentsShardHealthSummary.retrying} retrying ·{" "}
                                {commentsShardHealthSummary.queued} queued · {commentsShardHealthSummary.failed} failed
                              </p>
                            </div>
                            <div className="mt-2">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs text-zinc-500">Shard</TableHead>
                                    <TableHead className="text-xs text-zinc-500">Status</TableHead>
                                    <TableHead className="text-xs text-zinc-500">Posts</TableHead>
                                    <TableHead className="text-xs text-zinc-500">Comments / speed</TableHead>
                                    <TableHead className="text-xs text-zinc-500">Latest issue</TableHead>
                                    <TableHead className="text-right text-xs text-zinc-500">Action</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {activeCommentsProgressRankedRows.map(({ row, index, shard }) => {
                                    const normalizedJobId = String(row.job_id || "").trim() || null;
                                    const shardStatus = String(row.status ?? row.job_status ?? "").trim().toLowerCase();
                                    const canCancelShard =
                                      Boolean(normalizedJobId) &&
                                      ["queued", "pending", "retrying", "running", "cancelling"].includes(shardStatus);
                                    return (
                                      <TableRow key={`${row.job_id || row.shard_index || index}`}>
                                        <TableCell className="whitespace-normal text-xs font-semibold text-zinc-800">
                                          {formatCommentsShardProgressLabel(row, index)}
                                        </TableCell>
                                        <TableCell className="text-xs text-zinc-600">
                                          {formatRunStatusLabel(row.status ?? row.job_status)}
                                        </TableCell>
                                        <TableCell className="min-w-36 text-xs text-zinc-600">
                                          <Progress className="h-1.5 bg-zinc-100" value={shard.percent ?? 0} />
                                          <span className="mt-1 block">
                                            {shard.targetCount !== null
                                              ? `${formatInteger(shard.checkedPosts ?? 0)} / ${formatInteger(shard.targetCount)}`
                                              : shard.checkedPosts !== null
                                                ? formatInteger(shard.checkedPosts)
                                                : "Waiting"}
                                          </span>
                                        </TableCell>
                                        <TableCell className="whitespace-normal text-xs text-zinc-600">
                                          {[
                                            shard.commentsProcessed !== null
                                              ? `${formatInteger(shard.commentsProcessed)} fetched`
                                              : null,
                                            shard.speedLabel,
                                          ]
                                            .filter(Boolean)
                                            .join(" · ") || "No comments yet"}
                                        </TableCell>
                                        <TableCell className="max-w-56 whitespace-normal text-xs text-amber-700">
                                          {shard.issueLabel ? formatDiagnosticToken(shard.issueLabel) : "None"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {canCancelShard ? (
                                            <Button
                                              onClick={() => void cancelCommentsShardJob(normalizedJobId)}
                                              disabled={cancellingCommentsJobId === normalizedJobId || !user}
                                              size="sm"
                                              variant="ghost"
                                              className={NYT_DASHBOARD_BUTTON_CLASS}
                                            >
                                              {cancellingCommentsJobId === normalizedJobId ? "Cancelling..." : "Cancel"}
                                            </Button>
                                          ) : null}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <p className="mt-2 text-xs text-zinc-500">Loading live comments progress…</p>
                    )}
                  </div>
                ) : null}
                {supportsCatalog && platform === "instagram" ? (
                  <div className="mt-3 space-y-2">
                    {catalogDiagnosticsVisible ? (
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm">
                        <h3 className="font-semibold text-zinc-900">Catalog Diagnostics</h3>
                        <div className="mt-2 space-y-2">
                          {catalogFreshnessStatusCopy ? (
                            <p className={`text-sm ${catalogFreshnessStatusCopy.tone}`}>{catalogFreshnessStatusCopy.text}</p>
                          ) : null}
                          {catalogGapAnalysisStatusCopy ? (
                            <p className={`text-sm ${catalogGapAnalysisStatusCopy.tone}`}>{catalogGapAnalysisStatusCopy.text}</p>
                          ) : null}
                        </div>
                        {(catalogFreshnessError ||
                          isCatalogFreshnessDegraded(catalogFreshness as CatalogFreshnessPayload | null) ||
                          secondaryReadsPressurePause) ? (
                          <Button
                            onClick={() => requestCatalogFreshness()}
                            disabled={catalogFreshnessLoading}
                            size="sm"
                            variant="outline"
                            className={`mt-3 mr-2 ${NYT_DASHBOARD_BUTTON_CLASS}`}
                          >
                            {catalogFreshnessLoading ? "Checking Freshness…" : "Retry Freshness"}
                          </Button>
                        ) : null}
                        {canRequestCatalogGapAnalysis && (!catalogGapAnalysis || catalogGapAnalysisError) ? (
                          <Button
                            onClick={() => requestCatalogGapAnalysis()}
                            disabled={catalogGapAnalysisLoading}
                            size="sm"
                            variant="outline"
                            className={`mt-3 ${NYT_DASHBOARD_BUTTON_CLASS}`}
                          >
                            {catalogGapAnalysisLoading
                              ? "Analyzing Gap…"
                              : catalogGapAnalysisError
                                ? "Retry Gap Analysis"
                                : "Run Gap Analysis"}
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                    {catalogGapAnalysis && catalogGapAnalysisPresentation ? (
                      <div className={`rounded-xl border px-3 py-3 text-sm ${catalogGapAnalysisPresentation.tone}`}>
                        <p className="font-semibold">{catalogGapAnalysisPresentation.title}</p>
                        {catalogGapAnalysisStale && catalogGapAnalysisLoading ? (
                          <p className="mt-1 text-xs">
                            Showing the last completed gap-analysis result while a refresh is still running.
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs">
                          {catalogGapAnalysisPresentation.detail} Materialized {formatInteger(catalogGapAnalysis.materialized_posts)} ·
                          catalog {formatInteger(catalogGapAnalysis.catalog_posts)} · missing{" "}
                          {formatInteger(catalogGapAnalysis.missing_from_catalog_count)}.
                        </p>
                        {catalogGapAnalysisPresentation.sampleIds ? (
                          <p className="mt-1 text-xs">
                            Sample missing source ids: <span className="font-semibold">{catalogGapAnalysisPresentation.sampleIds}</span>
                          </p>
                        ) : null}
                        {catalogGapAnalysis.gap_type === "interior_gaps" &&
                        catalogGapAnalysis.repair_window_start &&
                        catalogGapAnalysis.repair_window_end ? (
                          <p className="mt-1 text-xs">
                            Recommended repair window: {formatDateTime(catalogGapAnalysis.repair_window_start)} to{" "}
                            {formatDateTime(catalogGapAnalysis.repair_window_end)}
                          </p>
                        ) : null}
                        {catalogGapAnalysis.recommended_action === "sync_newer" ? (
                          <Button
                            onClick={() =>
                              void runCatalogAction("sync_newer", {
                                source_scope: activeCatalogSourceScope,
                              })
                            }
                            disabled={catalogLaunchActionsBlocked}
                            size="sm"
                            variant="outline"
                            className={`mt-3 ${NYT_DASHBOARD_BUTTON_CLASS}`}
                          >
                            {runningCatalogAction === "sync_newer" ? "Queueing…" : "Sync Newer Now"}
                          </Button>
                        ) : null}
                        {catalogGapAnalysis.recommended_action === "bounded_window_backfill" &&
                        catalogGapAnalysis.repair_window_start &&
                        catalogGapAnalysis.repair_window_end ? (
                          <Button
                            onClick={() =>
                              void runCatalogAction(
                                "backfill",
                                buildBoundedWindowBackfillRequest(
                                  catalogGapAnalysis.repair_window_start!,
                                  catalogGapAnalysis.repair_window_end!,
                                ),
                              )
                            }
                            disabled={catalogLaunchActionsBlocked}
                            size="sm"
                            variant="outline"
                            className={`mt-3 ${NYT_DASHBOARD_DANGER_BUTTON_CLASS}`}
                          >
                            {runningCatalogAction === "backfill" ? "Queueing…" : "Repair Missing Window"}
                          </Button>
                        ) : null}
                        {catalogGapAnalysis.recommended_action === "backfill_posts" ? (
                          <Button
                            onClick={() => {
                              if (platform === "instagram") {
                                openInstagramBackfillDialog();
                                return;
                              }
                              void runCatalogAction("backfill", buildFullHistoryBackfillRequest());
                            }}
                            disabled={catalogLaunchActionsBlocked}
                            size="sm"
                            variant="outline"
                            className={`mt-3 ${NYT_DASHBOARD_BUTTON_CLASS}`}
                          >
                            {runningCatalogAction === "backfill" ? "Queueing…" : "Backfill Posts Now"}
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <nav className="mt-6 flex flex-wrap items-center gap-2" aria-label="Social account profile tabs">
              {visibleTabs.map((tab) => {
                const isActive = tab === selectedTab;
                return (
                  <Link
                    key={tab}
                    href={buildSocialAccountProfileUrl({ platform, handle, tab }) as Route}
                    prefetch={false}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {SOCIAL_ACCOUNT_PROFILE_TAB_LABELS[tab]}
                  </Link>
                );
              })}
              <div className="ml-0 flex items-center gap-2 sm:ml-2">
                {postSearchExpanded ? (
                  <input
                    ref={postSearchInputRef}
                    aria-label="Search captions"
                    type="search"
                    value={postSearchQuery}
                    onChange={(event) => setPostSearchQuery(event.target.value)}
                    placeholder="Search all captions, hashtags, and mentions"
                    className="w-full rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 sm:w-80"
                  />
                ) : null}
                <Button
                  aria-label={postSearchExpanded ? "Close caption search" : "Open caption search"}
                  onClick={() => setPostSearchExpanded((current) => !current)}
                  size="sm"
                  variant="outline"
                  className={`gap-2 ${
                    postSearchExpanded
                      ? NYT_DASHBOARD_PRIMARY_BUTTON_CLASS
                      : `${NYT_DASHBOARD_ICON_BUTTON_CLASS} h-10 w-10 px-0`
                  }`}
                >
                  {postSearchExpanded ? (
                    <XIcon className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <SearchIcon className="h-4 w-4" aria-hidden="true" />
                  )}
                  {postSearchExpanded ? <span>Close Search</span> : <span className="sr-only">Open caption search</span>}
                </Button>
              </div>
            </nav>

            {postSearchExpanded ? (
              <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2">
                  <h2 className="text-lg font-semibold text-zinc-900">Caption Search</h2>
                  <p className="text-sm text-zinc-500">
                    Search every stored caption for this account by keyword, hashtag, or mention without leaving your current tab.
                  </p>
                </div>
                {!trimmedPostSearchQuery ? (
                  <p className="mt-4 text-sm text-zinc-500">Start typing to search all captions on this profile.</p>
                ) : null}
                {postSearchLoading ? <p className="mt-4 text-sm text-zinc-500">Searching captions…</p> : null}
                {postSearchError ? <p className="mt-4 text-sm text-red-700">{postSearchError}</p> : null}
                {!postSearchLoading && !postSearchError && trimmedPostSearchQuery ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-xs text-zinc-500">
                      {formatInteger(postSearchResults?.pagination.total ?? 0)} matching caption
                      {Number(postSearchResults?.pagination.total ?? 0) === 1 ? "" : "s"} for “{trimmedPostSearchQuery}”.
                    </p>
                    {(postSearchResults?.items ?? []).length === 0 ? (
                      <p className="text-sm text-zinc-500">No captions matched “{trimmedPostSearchQuery}”.</p>
                    ) : (
                      (postSearchResults?.items ?? []).map((item) => (
                        <div key={`caption-search-${item.id}`} className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="max-w-3xl">
                              <p className="font-semibold text-zinc-900">{item.title || item.excerpt || "Untitled post"}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {(() => {
                                  const badge = getPostMatchBadge(item);
                                  return (
                                    <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${badge.tone}`}>
                                      {badge.label}
                                    </span>
                                  );
                                })()}
                              </div>
                              {item.content ? <p className="mt-2 text-sm leading-6 text-zinc-600">{item.content}</p> : null}
                              <p className="mt-2 text-xs text-zinc-500">
                                {item.show_name ?? "Unassigned"} · {formatSeasonLabel(item.season_number)} · {formatDateTime(item.posted_at)}
                              </p>
                            </div>
                            {item.url ? (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                Open post
                              </a>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>
        </AdminGlobalHeader>

        <main className="mx-auto max-w-6xl px-6 py-8">
          {summaryLoading && !hasSummary && !shouldRenderCatalogRunProgressCard ? (
            <div className="text-sm text-zinc-500">Loading account summary…</div>
          ) : null}
          {summaryError && !shouldRenderCatalogRunProgressCard ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{summaryError}</div>
          ) : null}
          {dashboardFreshness?.status === "stale" ? (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Showing cached dashboard data from {formatDashboardFreshnessAge(dashboardFreshness.age_seconds)}.
            </div>
          ) : null}
          {dashboardFreshness?.status === "error" && hasSummary ? (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Backend dashboard refresh failed. Showing the last successful profile data.
            </div>
          ) : null}
          {dashboardFreshness?.status === "missing" && !summaryUninitialized ? (
            <div className="mb-6 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              No profile dashboard snapshot has been generated yet.
            </div>
          ) : null}
          {showInstagramPipelineTruthPanel ? (
            <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Current Truth
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-zinc-900">Instagram Backfill Status</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Active run progress is the source of truth for what is running now. Library totals are all-time saved data.
                  </p>
                </div>
                <span className="inline-flex w-fit rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700">
                  @{handle}
                </span>
              </div>
              {instagramPipelineTruthRows.length > 0 ? (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {instagramPipelineTruthRows.map((row) => (
                    <div key={row.key} className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                            {row.label}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-zinc-900">{row.value}</p>
                        </div>
                        {typeof row.progressValue === "number" ? (
                          <span className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-600">
                            {Math.round(row.progressValue)}%
                          </span>
                        ) : null}
                      </div>
                      {typeof row.progressValue === "number" ? (
                        <Progress className="mt-3 h-2 bg-white" value={row.progressValue} />
                      ) : null}
                      {row.detail ? <p className="mt-2 text-xs leading-5 text-zinc-600">{row.detail}</p> : null}
                      {row.recommendation ? (
                        <p className="mt-2 border-t border-zinc-200 pt-2 text-xs font-medium leading-5 text-zinc-800">
                          Recommended action: {row.recommendation}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900">What is going wrong</h3>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      instagramPipelineIssueRows.length > 0
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {instagramPipelineIssueRows.length > 0 ? `${instagramPipelineIssueRows.length} item${instagramPipelineIssueRows.length === 1 ? "" : "s"}` : "No blocker"}
                  </span>
                </div>
                {instagramPipelineIssueRows.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {instagramPipelineIssueRows.map((issue) => (
                      <div
                        key={issue.key}
                        className={`rounded-lg border px-3 py-2 text-sm ${
                          issue.tone === "red"
                            ? "border-red-200 bg-red-50 text-red-800"
                            : issue.tone === "sky"
                              ? "border-sky-200 bg-sky-50 text-sky-800"
                              : "border-amber-200 bg-amber-50 text-amber-800"
                        }`}
                      >
                        <p className="font-semibold">{issue.title}</p>
                        <p className="mt-1 text-xs leading-5">{issue.detail}</p>
                        {issue.recommendation ? (
                          <p className="mt-2 border-t border-current/20 pt-2 text-xs font-semibold leading-5">
                            Recommended action: {issue.recommendation}
                          </p>
                        ) : null}
                        {issue.action === "remediate_drift" ? (
                          <Button
                            onClick={() =>
                              void runCatalogRemediateDrift({
                                run_id: catalogRunProgress?.run_id ?? displayedCatalogRunId,
                                requeue_canary: true,
                              })
                            }
                            disabled={runningCatalogAction === "remediate_drift" || catalogAutoRequeueActive}
                            size="sm"
                            variant="outline"
                            className={`mt-3 ${NYT_DASHBOARD_BUTTON_CLASS}`}
                          >
                            {runningCatalogAction === "remediate_drift"
                              ? issue.actionBusyLabel || "Cancelling + requeuing..."
                              : issue.actionLabel || "Cancel + requeue clean run"}
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-zinc-600">
                    No blocking issue is reported. Worker retries can still appear in advanced details while the run keeps saving progress.
                  </p>
                )}
              </div>
            </section>
          ) : null}
          {summaryUninitialized && !shouldRenderCatalogRunProgressCard ? (
            <section className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-900">
              <p className="font-semibold">No saved posts yet for @{handle}.</p>
              <p className="mt-1 text-sky-800">
                Use <span className="font-semibold">Backfill Posts</span> to load this account. If saved network-profile posts
                already include this handle as a collaborator, they will appear here automatically.
              </p>
            </section>
          ) : null}

          {shouldRenderCatalogRunProgressCard ? (
            <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-zinc-900">Post/details Run</h2>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getCatalogRunStatusTone(
                        displayedCatalogRunStatus,
                      )}`}
                    >
                      {displayedCatalogRunStatusLabel}
                    </span>
                    {(displayedCatalogRunStatus === "failed" || displayedCatalogRunStatus === "cancelled") &&
                      displayedCatalogRunId && (
                        <Button
                          onClick={() => void dismissCatalogRun(displayedCatalogRunId)}
                          disabled={dismissingCatalogRunId === displayedCatalogRunId}
                          size="sm"
                          variant="outline"
                          className={NYT_DASHBOARD_BUTTON_CLASS}
                        >
                          {dismissingCatalogRunId === displayedCatalogRunId ? "Dismissing…" : "Dismiss"}
                        </Button>
                      )}
                    {canRetryCatalogLocally ? (
                      <Button
                        onClick={() =>
                          void runCatalogAction("backfill", {
                            ...buildFullHistoryBackfillRequest(),
                            allow_inline_dev_fallback: true,
                            execution_preference: "prefer_local_inline",
                          })
                        }
                        disabled={catalogActionsBlocked}
                        size="sm"
                        variant="secondary"
                        className={NYT_DASHBOARD_BUTTON_CLASS}
                      >
                        {runningCatalogAction === "backfill" ? "Retrying Locally…" : "Retry Locally"}
                      </Button>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">
                    Truth source: catalog run progress · Run {shortRunId(displayedCatalogRunId)} · {displayedCatalogRunStatusLabel}
                    {catalogRunProgress?.created_at ? ` · queued ${formatDateTime(catalogRunProgress.created_at)}` : ""}
                    {catalogRunProgress?.launch_group_id ? ` · launch ${shortRunId(catalogRunProgress.launch_group_id)}` : ""}
                    {shouldShowCatalogLaunchState(
                      catalogRunProgress?.run_status ?? displayedCatalogRunStatus,
                      catalogRunProgress?.launch_state,
                    )
                      ? ` · ${formatRunStatusLabel(catalogRunProgress?.launch_state)}`
                      : ""}
                    {catalogProgressLastSuccessAt ? ` · last refresh ${formatDateTime(catalogProgressLastSuccessAt)}` : ""}
                  </p>
                  {catalogRunWindowMessage ? (
                    <p className="mt-1 text-xs text-zinc-500">{catalogRunWindowMessage}</p>
                  ) : null}
                  {catalogPhaseLabel ? <p className="mt-2 text-sm font-medium text-zinc-700">{catalogPhaseLabel}</p> : null}
                  {catalogRunProgressError ? (
                    <p className="mt-2 text-sm text-red-700">{catalogRunProgressError}</p>
                  ) : null}
                  {catalogRunProgress?.progress_degraded ? (
                    <p className="mt-2 text-sm text-amber-700">
                      Progress polling is using the last good update
                      {catalogRunProgress.progress_degraded_at
                        ? ` from ${formatDateTime(catalogRunProgress.progress_degraded_at)}`
                        : ""}
                      {catalogRunProgress.progress_degraded_reason
                        ? ` (${formatDiagnosticToken(catalogRunProgress.progress_degraded_reason)})`
                        : ""}
                      .
                    </p>
                  ) : null}
                  {catalogDispatchStatusMessage ? (
                    <p
                      className={`mt-2 text-sm ${
                        catalogDispatchStatusMessage.tone === "red" ? "text-red-700" : "text-amber-700"
                      }`}
                    >
                      {catalogDispatchStatusMessage.text}
                    </p>
                  ) : null}
                  {visibleCatalogOperationalAlerts.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {visibleCatalogOperationalAlerts.map((alert) => (
                        <div
                          key={`${alert.code}-${alert.message}`}
                          className={`rounded-xl border px-3 py-2 text-sm ${getOperationalAlertTone(alert.severity)}`}
                        >
                          <p className="font-semibold">{formatOperationalAlertLabel(alert)}</p>
                          <p className="mt-1">{alert.message}</p>
                          {alert.code === "no_eligible_worker_for_required_runtime" && !catalogAutoRequeueActive ? (
                            <Button
                              onClick={() =>
                                void runCatalogRemediateDrift({
                                  run_id: catalogRunProgress?.run_id ?? displayedCatalogRunId,
                                  requeue_canary: true,
                                })
                              }
                              disabled={runningCatalogAction === "remediate_drift"}
                              size="sm"
                              variant="outline"
                              className={`mt-2 ${NYT_DASHBOARD_BUTTON_CLASS}`}
                            >
                              {runningCatalogAction === "remediate_drift"
                                ? "Cancelling + requeuing…"
                                : "Cancel + Requeue clean run"}
                            </Button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {catalogBlockedAuthPresentation ? (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-900">
                      <p className="font-semibold">{catalogBlockedAuthPresentation.title}</p>
                      <p className="mt-1">{catalogBlockedAuthPresentation.detail}</p>
                      {catalogBlockedAuthPresentation.repairReason ? (
                        <p className="mt-2 text-xs text-red-800">
                          Repair reason: {catalogBlockedAuthPresentation.repairReason}
                        </p>
                      ) : null}
                      {catalogBlockedAuthPresentation.canRepair || catalogBlockedAuthPresentation.repairSupported ? (
                        <Button
                          onClick={() => {
                            if (catalogBlockedAuthPresentation.canRepair && catalogBlockedAuthPresentation.repairRunId) {
                              void runCatalogRepairAuth(
                                catalogBlockedAuthPresentation.repairRunId,
                                catalogRepairAuthConfirmationRunId === catalogBlockedAuthPresentation.repairRunId
                                  ? {
                                      operator_confirmation: INSTAGRAM_AUTH_REFRESH_CONFIRMATION,
                                      allow_cookie_refresh: false,
                                    }
                                  : {},
                              );
                            }
                          }}
                          disabled={runningCatalogAction !== null || !catalogBlockedAuthPresentation.canRepair}
                          size="sm"
                          variant="outline"
                          className={`mt-3 ${NYT_DASHBOARD_DANGER_BUTTON_CLASS}`}
                        >
                          {runningCatalogAction === "repair_auth"
                            ? "Syncing cookies…"
                            : catalogRepairAuthConfirmationRunId === catalogBlockedAuthPresentation.repairRunId
                              ? "Confirm Manual Auth Check"
                              : catalogBlockedAuthPresentation.repairButtonLabel}
                        </Button>
                      ) : catalogBlockedAuthPresentation.repairCommand ? (
                        <p className="mt-3 text-xs text-red-800">
                          Run <code>{catalogBlockedAuthPresentation.repairCommand}</code> from the local TRR-Backend host.
                        </p>
                      ) : null}
                      {catalogBlockedAuthPresentation.repairDisabledReason ? (
                        <p className="mt-2 text-xs text-red-800">{catalogBlockedAuthPresentation.repairDisabledReason}</p>
                      ) : null}
                    </div>
                  ) : null}
                  {catalogScrapeCompletionMessage ? (
                    <p className="mt-2 text-sm text-emerald-700">{catalogScrapeCompletionMessage}</p>
                  ) : null}
                  {catalogTerminalCoverageMessage ? (
                    <p className="mt-2 text-sm text-amber-700">{catalogTerminalCoverageMessage}</p>
                  ) : null}
                  {catalogStopMessage ? <p className="mt-2 text-sm text-zinc-700">{catalogStopMessage}</p> : null}
                  {catalogRuntimeMessage ? <p className="mt-2 text-xs text-zinc-500">{catalogRuntimeMessage}</p> : null}
                  {formatProxyMetadata(catalogRunProgress) ? (
                    <p className="mt-1 text-xs text-zinc-500">{formatProxyMetadata(catalogRunProgress)}</p>
                  ) : null}
                </div>
                <div className="min-w-[190px] rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Active Run Progress</p>
                  <p className="mt-2 text-3xl font-bold text-zinc-900">
                    {catalogPostProgress.pct}%
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {catalogProgressMode === "bounded"
                      ? catalogPostProgress.hasCompleted
                        ? `${formatInteger(catalogPostProgress.displayedCompleted)} posts checked`
                        : `${formatInteger(catalogProgressSummary.finished)} / ${formatInteger(catalogProgressSummary.total)} jobs`
                      : catalogPostProgress.hasTotal
                      ? `${formatInteger(catalogPostProgress.displayedCompleted)} / ${formatInteger(catalogPostProgress.total)} posts checked`
                      : catalogPostProgress.hasCompleted
                      ? `${formatInteger(catalogPostProgress.displayedCompleted)} posts checked`
                      : `${formatInteger(catalogProgressSummary.finished)} / ${formatInteger(catalogProgressSummary.total)} jobs`}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {catalogPostProgress.hasTotal || catalogPostProgress.hasCompleted
                      ? `${formatInteger(catalogPostProgress.displayedPersisted)} ${detailsRefreshProgress ? "refreshed" : "persisted"}`
                      : `${formatInteger(catalogProgressSummary.items)} scraped`}
                    {catalogProgressSummary.running > 0 ? ` · ${formatInteger(catalogProgressSummary.running)} running` : ""}
                    {catalogProgressSummary.waiting > 0 ? ` · ${formatInteger(catalogProgressSummary.waiting)} queued` : ""}
                    {catalogProgressSummary.failed > 0 ? ` · ${formatInteger(catalogProgressSummary.failed)} failed` : ""}
                  </p>
                  {frontierMode && catalogRunProgress?.frontier ? (
                    <p className="mt-1 text-xs text-zinc-500">
                      {formatInteger(catalogRunProgress.frontier.pages_scanned)} pages scanned
                      {catalogRunProgress.frontier.transport ? ` · ${String(catalogRunProgress.frontier.transport)} transport` : ""}
                      {catalogRunProgress.frontier.retry_count ? ` · ${formatInteger(catalogRunProgress.frontier.retry_count)} retries` : ""}
                    </p>
                  ) : catalogRunProgress?.discovery?.partition_count ? (
                    <p className="mt-1 text-xs text-zinc-500">
                      {formatInteger(catalogRunProgress.discovery.completed_count)} /{" "}
                      {formatInteger(catalogRunProgress.discovery.partition_count)} shards complete
                    </p>
                  ) : null}
                </div>
              </div>

              <Progress className="mt-4 h-2" value={catalogProgressBarWidthPct} />

              {shouldRenderCatalogOperatorSummary ? (
                <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900">Post/details Worker Summary</h3>
                      <p className="text-xs text-zinc-500">
                        Active worker and job counts for the shard/detail lane reporting live progress.
                      </p>
                    </div>
                    {showCatalogStuckQueueRecovery ? (
                      <Button
                        onClick={() => void clearCatalogStuckJobs()}
                        disabled={runningCatalogAction !== null}
                        variant="outline"
                        size="sm"
                        className={NYT_DASHBOARD_DANGER_BUTTON_CLASS}
                      >
                        {runningCatalogAction === "clear_stuck_jobs" ? "Clearing Stuck Queue…" : "Clear Stuck Queue"}
                      </Button>
                    ) : null}
                  </div>
                  {catalogOperatorSummaryCards.length > 0 ? (
                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      {catalogOperatorSummaryCards.map((card) => (
                        <div key={card.key} className="rounded-xl border border-zinc-200 bg-white px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{card.label}</p>
                          <p className="mt-1 text-sm font-medium text-zinc-900">{card.value}</p>
                          {card.detail ? <p className="mt-1 text-xs text-zinc-500">{card.detail}</p> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {catalogCompactStageSummaries.length > 0 ? (
                    <div className="mt-3 grid gap-2 lg:grid-cols-2">
                      {catalogCompactStageSummaries.map((stage) => (
                        <div key={stage.key} className="rounded-xl border border-zinc-200 bg-white px-3 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-zinc-900">{stage.label}</p>
                            <p className="text-xs text-zinc-500">{stage.counts}</p>
                          </div>
                          {stage.activity ? <p className="mt-1 text-xs text-zinc-500">{stage.activity}</p> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {catalogLaneCards.length > 0 ||
              catalogProgressDiagnosticRows.length > 0 ||
              catalogRunProgressLoading ||
              catalogStageEntries.length > 0 ||
              Boolean(catalogTerminalNoStageTelemetryMessage) ||
              shouldShowCatalogRecovery ||
              catalogLogs.length > 0 ||
              catalogHandleCards.length > 0 ? (
                <details
                  open={catalogAdvancedDetailsOpen}
                  onToggle={handleCatalogAdvancedDetailsToggle}
                  className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <summary className="cursor-pointer text-sm font-semibold text-zinc-900">
                    Advanced worker details
                  </summary>
                  <div className="mt-4">
              {catalogLaneCards.length > 0 ? (
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {catalogLaneCards.map((lane) => (
                    <div key={lane.key} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{lane.label}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getCatalogRunStatusTone(
                            lane.status,
                          )}`}
                        >
                          {formatRunStatusLabel(lane.status)}
                        </span>
                        {lane.sourceLabel ? (
                          <span className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                            {lane.sourceLabel}
                          </span>
                        ) : null}
                      </div>
                      {lane.detail ? <p className="mt-2 text-xs text-zinc-600">{lane.detail}</p> : null}
                      {lane.counts ? <p className="mt-1 text-xs text-zinc-500">{lane.counts}</p> : null}
                      {lane.blockedReason ? (
                        <p className="mt-1 text-xs text-amber-700">Blocked: {lane.blockedReason}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {catalogProgressDiagnosticRows.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <h3 className="text-sm font-semibold text-zinc-900">Operator Diagnostics</h3>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {catalogProgressDiagnosticRows.map((row) => (
                      <div key={row.key} className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{row.label}</p>
                        <p className="mt-1 text-sm font-medium text-zinc-900">{row.value}</p>
                        {row.detail ? <p className="mt-1 text-xs text-zinc-500">{row.detail}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {catalogRunProgressLoading && !catalogRunProgress ? (
                <p className="mt-4 text-sm text-zinc-500">Loading live run progress…</p>
              ) : null}

              {catalogStageEntries.length > 0 ? (
                <div className={`mt-4 grid gap-3 ${catalogStageEntries.length >= 3 ? "xl:grid-cols-3" : "md:grid-cols-2"}`}>
                  {catalogStageEntries.map(([stage, stats]) => {
                    const badge = getCatalogStageBadge(stage, stats, {
                      scrapeComplete: Boolean(catalogRunProgress?.scrape_complete),
                    });
                    return (
                      <div key={stage} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-zinc-900">
                              {formatRunStageLabel(stage, {
                                frontierMode,
                                singleRunnerFallback: singleRunnerFallbackMode,
                                detailsRefresh: detailsRefreshProgress,
                              })}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {formatInteger(stats.completed + stats.failed)} / {formatInteger(stats.total)} jobs complete
                            </p>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${badge.tone}`}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                          <div
                            className="h-full rounded-full bg-zinc-900 transition-all duration-500"
                            style={{
                              width: `${Math.max(
                                stats.total > 0 ? Math.round(((stats.completed + stats.failed) / stats.total) * 100) : 0,
                                stats.running > 0 || stats.waiting > 0 ? 6 : 0,
                              )}%`,
                            }}
                          />
                        </div>
                        <p className="mt-3 text-sm text-zinc-700">
                          {formatCatalogStageActivitySummary(stage, stats, {
                            frontierMode,
                            singleRunnerFallback: singleRunnerFallbackMode,
                            detailsRefresh: detailsRefreshProgress,
                          })}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {stats.running > 0 ? `${formatInteger(stats.running)} running · ` : ""}
                          {stats.waiting > 0 ? `${formatInteger(stats.waiting)} queued · ` : ""}
                          {stats.failed > 0 ? `${formatInteger(stats.failed)} failed` : "No failures"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : catalogTerminalNoStageTelemetryMessage ? (
                <p className="mt-4 text-sm text-zinc-500">{catalogTerminalNoStageTelemetryMessage}</p>
              ) : !catalogRunProgressLoading ? (
                <p className="mt-4 text-sm text-zinc-500">Waiting for the job to report stage-level progress…</p>
              ) : null}

              {shouldShowCatalogRecovery && catalogRunProgress?.recovery ? (
                <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <h3 className="text-sm font-semibold text-zinc-900">Recovery</h3>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <p className="text-sm text-zinc-700">
                      reason: {formatRecoveryReasonLabel(catalogRunProgress.recovery.reason)}
                    </p>
                    {catalogRunProgress.recovery.stage ? (
                      <p className="text-sm text-zinc-700">
                        stage:{" "}
                        {formatRunStageLabel(catalogRunProgress.recovery.stage, {
                          frontierMode,
                          singleRunnerFallback: true,
                          detailsRefresh: detailsRefreshProgress,
                        }).toLowerCase()}
                      </p>
                    ) : null}
                    {catalogRunProgress.recovery.transport ? (
                      <p className="text-sm text-zinc-700">transport: {catalogRunProgress.recovery.transport}</p>
                    ) : null}
                    {catalogRunProgress.recovery.execution_backend ? (
                      <p className="text-sm text-zinc-700">
                        backend: {catalogRunProgress.recovery.execution_backend}
                      </p>
                    ) : null}
                    {typeof catalogRunProgress.recovery.attempt_count === "number" &&
                    catalogRunProgress.recovery.attempt_count > 0 ? (
                      <p className="text-sm text-zinc-700">attempt {catalogRunProgress.recovery.attempt_count}</p>
                    ) : null}
                    {typeof catalogRunProgress.recovery.waited_seconds === "number" &&
                    catalogRunProgress.recovery.waited_seconds > 0 ? (
                      <p className="text-sm text-zinc-700">
                        waiting: {formatInteger(catalogRunProgress.recovery.waited_seconds)}s
                      </p>
                    ) : null}
                    {catalogRunProgress.recovery.next_stage ? (
                      <p className="text-sm text-zinc-700">
                        next:{" "}
                        {formatRunStageLabel(catalogRunProgress.recovery.next_stage, {
                          frontierMode,
                          singleRunnerFallback: true,
                          detailsRefresh: detailsRefreshProgress,
                        }).toLowerCase()}
                      </p>
                    ) : null}
                    {typeof catalogRunProgress.recovery.recovery_depth === "number" ? (
                      <p className="text-sm text-zinc-700">
                        depth: {formatInteger(catalogRunProgress.recovery.recovery_depth)}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {catalogLogs.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <Button
                    onClick={() => setCatalogLogsExpanded((current) => !current)}
                    variant="ghost"
                    className="flex w-full justify-between rounded-none px-0 py-0 text-left hover:bg-transparent"
                  >
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900">Recent Logs</h3>
                      <p className="text-xs text-zinc-500">Latest worker events for this account run</p>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      {catalogLogsExpanded ? "Hide" : "Show"}
                    </span>
                  </Button>
                  {catalogLogsExpanded ? (
                    <div className="mt-3 space-y-2">
                      {catalogLogs.map((entry) => (
                        <div key={entry.id} className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                            {formatRunStageLabel(entry.stage, {
                              frontierMode,
                              singleRunnerFallback: singleRunnerFallbackMode,
                              detailsRefresh: detailsRefreshProgress,
                            })} · {formatRunStatusLabel(entry.status)}
                          </p>
                          <p className="mt-1 text-sm text-zinc-700">{entry.line}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {catalogHandleCards.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <h3 className="text-sm font-semibold text-zinc-900">Per-Handle Job Progress</h3>
                  <p className="text-xs text-zinc-500">
                    {frontierMode
                      ? "Frontier ownership and stage completion by social account handle"
                      : "Lane allocation and stage completion by social account handle"}
                  </p>
                  <div className="mt-3 grid gap-3 xl:grid-cols-2">
                    {catalogHandleCards.map((card) => (
                      <div key={card.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-zinc-900">{formatHandleLabel(card.handle)}</p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {card.hasStarted ? "Started" : "Pending start"}
                              {card.nextStage
                                ? ` · Next ${formatRunStageLabel(card.nextStage, {
                                    frontierMode,
                                    singleRunnerFallback: singleRunnerFallbackMode,
                                    detailsRefresh: detailsRefreshProgress,
                                  })}`
                                : ""}
                            </p>
                          </div>
                          <span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-semibold text-zinc-600">
                            {frontierMode
                              ? card.frontierLabel || "Frontier pending"
                              : card.runnerLanes.length > 0
                                ? `Lanes ${card.runnerLanes.join(", ")}`
                                : "Lane pending"}
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-zinc-700">
                          {formatInteger(card.totals.completed + card.totals.failed)} / {formatInteger(card.totals.total)} complete
                          {card.totals.running > 0 ? ` · ${formatInteger(card.totals.running)} running` : ""}
                          {card.totals.waiting > 0 ? ` · ${formatInteger(card.totals.waiting)} queued` : ""}
                        </p>
                        <div className="mt-3 space-y-2">
                          {card.stages.map((stage) => (
                            <div key={`${card.id}-${stage.stage}`} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-zinc-800">
                                  {formatRunStageLabel(stage.stage, {
                                    frontierMode,
                                    singleRunnerFallback: singleRunnerFallbackMode,
                                    detailsRefresh: detailsRefreshProgress,
                                  })}
                                </p>
                                <p className="text-xs text-zinc-500">
                                  {formatInteger(stage.completed + stage.failed)} / {formatInteger(stage.total)}
                                </p>
                              </div>
                              <p className="mt-1 text-xs text-zinc-500">
                                {stage.running > 0 ? `${formatInteger(stage.running)} running · ` : ""}
                                {stage.waiting > 0 ? `${formatInteger(stage.waiting)} queued · ` : ""}
                                {formatCatalogStageActivitySummary(stage.stage, stage, {
                                  frontierMode,
                                  singleRunnerFallback: singleRunnerFallbackMode,
                                  detailsRefresh: detailsRefreshProgress,
                                })}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
                  </div>
                </details>
              ) : null}
            </section>
          ) : null}

          {selectedTab === "socialblade" ? (
            <SocialGrowthSection
              platform={platform as Extract<SocialPlatformSlug, "instagram" | "facebook" | "tiktok" | "youtube">}
              handle={handle}
              sourceScope={activeCatalogSourceScope}
              avatarUrl={summaryAvatarUrl}
              avatarAlt={`${headerTitle} profile picture`}
            />
          ) : null}

          {hasSummary && selectedTab === "stats" ? (
            <section className="space-y-6">
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-900">Top Hashtags</h2>
                      <p className="mt-1 text-xs text-zinc-500">
                        Ranked for {formatHashtagWindowLabel(hashtagWindow).toLowerCase()}.
                      </p>
                    </div>
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      Window
                      <select
                        value={hashtagWindow}
                        onChange={(event) =>
                          setHashtagWindow(event.target.value as (typeof HASHTAG_WINDOW_OPTIONS)[number]["value"])
                        }
                        className="mt-1 block rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-zinc-700"
                      >
                        {HASHTAG_WINDOW_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="mt-4 space-y-2">
                    {hashtagsLoading || statsHashtagsPending ? (
                      <p className="text-sm text-zinc-500">Loading hashtags…</p>
                    ) : null}
                    {!hashtagsLoading && !statsHashtagsPending && hashtagsErrorMessage ? (
                      <p className={`text-sm ${hashtagsErrorToneClass}`}>{hashtagsErrorMessage}</p>
                    ) : null}
                    {!hashtagsLoading && !statsHashtagsPending && displayedStatsHashtags.length === 0 && !hashtagsErrorMessage ? (
                      <p className="text-sm text-zinc-500">No hashtags found yet.</p>
                    ) : null}
                    {!hashtagsLoading && !statsHashtagsPending && displayedStatsHashtags.length > 0 ? (
                      displayedStatsHashtags.slice(0, 10).map((item) => (
                        <div key={item.hashtag} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                          <div>
                            <p className="font-semibold text-zinc-900">{item.display_hashtag ?? `#${item.hashtag}`}</p>
                            <p className="text-xs text-zinc-500">
                              First seen {formatDateTime(item.first_seen_at)} · Last seen {formatDateTime(item.latest_seen_at)}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-zinc-700">{formatInteger(item.usage_count)}</span>
                        </div>
                      ))
                    ) : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-zinc-900">Source Status</h2>
                  <div className="mt-4 space-y-2">
                    {(summary?.source_status ?? []).length === 0 ? (
                      <p className="text-sm text-zinc-500">No shared-source network metadata was found for this handle.</p>
                    ) : (
                      (summary?.source_status ?? []).map((item, index) => (
                        <div key={`${String(item.id ?? index)}`} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm">
                          <p className="font-semibold text-zinc-900">
                            {String(item.network_name ?? item.source_scope ?? "Network profile")}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {String(
                              item.profile_kind ??
                                (item.metadata as Record<string, unknown> | undefined)?.profile_kind ??
                                "shared_profile",
                            ).replaceAll("_", " ")}
                            {" · "}
                            {String(
                              item.assignment_mode ??
                                (item.metadata as Record<string, unknown> | undefined)?.assignment_mode ??
                                "multi_show_match",
                            ).replaceAll("_", " ")}
                            {" · "}
                            {String(item.source_scope ?? "network")}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {formatSourceStatusActivityLabel(item, summary)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
          ) : null}

          {hasSummary && selectedTab === "catalog" ? (
            supportsCatalog ? (
              <div className="space-y-6">
                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-900">Catalog</h2>
                      <p className="text-sm text-zinc-500">
                        Gallery view of saved catalog posts. Open a card to inspect details and media.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(["all", "assigned", "needs_review", "unassigned", "ambiguous"] as const).map((status) => (
                        <Button
                          key={status}
                          onClick={() => setCatalogFilter(status)}
                          size="sm"
                          variant={catalogFilter === status ? "primary" : "outline"}
                          className={`${
                            catalogFilter === status ? NYT_DASHBOARD_PRIMARY_BUTTON_CLASS : NYT_DASHBOARD_BUTTON_CLASS
                          }`}
                        >
                          {status === "all" ? "All" : status.replace("_", " ")}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {catalogPostsLoading ? <p className="mt-4 text-sm text-zinc-500">Loading catalog posts…</p> : null}
                  {catalogPostsError ? <p className="mt-4 text-sm text-red-700">{catalogPostsError}</p> : null}
                  {!catalogPostsLoading && !catalogPostsError ? (
                    <>
                      {(catalogPosts?.items ?? []).length === 0 ? (
                        <div className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">
                          No catalog posts found for this filter.
                        </div>
                      ) : (
                        <div data-testid="catalog-post-gallery" className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                          {(catalogPosts?.items ?? []).map((item) => {
                            const previewImage = getCatalogPostPreviewImage(item);
                            const previewUrl = previewImage.src;
                            const title = item.title || item.excerpt || "Untitled post";
                            const metricSummary = getCatalogPostMetricSummary(item);
                            const assignmentLabel = String(item.assignment_status || "unassigned").replaceAll("_", " ");
                            const assignedLabel = item.show_name
                              ? `${item.show_name} · ${formatSeasonLabel(item.season_number)}`
                              : "Not assigned";
                            const canOpenDetail = supportsCatalogDetail && Boolean(item.source_id);
                            return (
                              <article
                                key={item.id || item.source_id}
                                role={canOpenDetail ? "button" : undefined}
                                tabIndex={canOpenDetail ? 0 : undefined}
                                onClick={() => {
                                  if (canOpenDetail) {
                                    void openCatalogDetail(item.source_id);
                                  }
                                }}
                                onKeyDown={(event) => {
                                  if (!canOpenDetail || (event.key !== "Enter" && event.key !== " ")) return;
                                  event.preventDefault();
                                  void openCatalogDetail(item.source_id);
                                }}
                                className={`h-full rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition ${
                                  canOpenDetail ? "cursor-pointer hover:border-zinc-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-zinc-900/20" : ""
                                }`}
                              >
                                <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-zinc-100" data-testid="catalog-post-thumbnail">
                                  {previewUrl ? (
                                    isLikelyVideoUrl(previewUrl) ? (
                                      <video src={previewUrl} muted playsInline preload="metadata" className="h-full w-full bg-black object-cover" />
                                    ) : (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={previewUrl}
                                        srcSet={previewImage.srcSet ?? undefined}
                                        alt={title}
                                        loading="lazy"
                                        className="h-full w-full object-cover"
                                      />
                                    )
                                  ) : (
                                    <div className="flex h-full items-center justify-center px-4 text-center text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                                      No media
                                    </div>
                                  )}
                                  <span className="absolute left-2 top-2 rounded-full border border-white/70 bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-700 shadow-sm">
                                    {assignmentLabel}
                                  </span>
                                  {item.post_format ? (
                                    <span className="absolute bottom-2 left-2 rounded-full bg-zinc-900/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                                      {item.post_format}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-3 space-y-2">
                                  <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-zinc-900">{title}</h3>
                                  {item.content ? <p className="line-clamp-3 text-xs leading-5 text-zinc-600">{item.content}</p> : null}
                                  <p className="text-xs font-medium text-zinc-700">{assignedLabel}</p>
                                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                                    <span>{formatDateTime(item.posted_at)}</span>
                                    {metricSummary ? <span>{metricSummary}</span> : null}
                                  </div>
                                  {item.url ? (
                                    <a
                                      href={item.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(event) => event.stopPropagation()}
                                      className="inline-flex text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                      Open post
                                    </a>
                                  ) : null}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      )}
                      <div className="mt-4 flex items-center justify-between">
                        <Button
                          onClick={() => setCatalogPage((current) => Math.max(1, current - 1))}
                          disabled={catalogPage <= 1 || catalogPostsLoading}
                          size="sm"
                          variant="outline"
                          className={NYT_DASHBOARD_BUTTON_CLASS}
                        >
                          Previous
                        </Button>
                        <div className="text-sm text-zinc-500">
                          Page {catalogPosts?.pagination.page ?? catalogPage} of {catalogPosts?.pagination.total_pages ?? 1}
                        </div>
                        <Button
                          onClick={() => setCatalogPage((current) => current + 1)}
                          disabled={Boolean(catalogPosts && catalogPage >= catalogPosts.pagination.total_pages) || catalogPostsLoading}
                          size="sm"
                          variant="outline"
                          className={NYT_DASHBOARD_BUTTON_CLASS}
                        >
                          Next
                        </Button>
                      </div>
                    </>
                  ) : null}
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-zinc-900">Recent Catalog Runs</h2>
                  <div className="mt-4 space-y-2">
                    {visibleCatalogRecentRuns.length === 0 ? (
                      <p className="text-sm text-zinc-500">No catalog runs recorded yet.</p>
                    ) : (
                      visibleCatalogRecentRuns.map((run) => {
                        const laneCards = buildCatalogLaneCards({
                          runStatus: run.status,
                          selectedTasks: run.selected_tasks,
                          effectiveSelectedTasks: run.effective_selected_tasks,
                          commentsRunId: run.comments_run_id,
                          attachedFollowups: run.attached_followups,
                        });
                        const aggregateStatus = getCatalogAggregateRunStatus(run.status, laneCards);
                        const aggregateStatusLabel = formatCatalogAggregateRunStatusLabel(run.status, laneCards);
                        return (
                        <div key={run.job_id || run.run_id} className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getCatalogRunStatusTone(
                                    aggregateStatus,
                                  )}`}
                                >
                                  {aggregateStatusLabel}
                                </span>
                                <span className="text-xs font-semibold text-zinc-500">Run {shortRunId(run.run_id)}</span>
                                {run.launch_group_id ? (
                                  <span className="text-xs font-semibold text-zinc-500">
                                    Launch {shortRunId(run.launch_group_id)}
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-2 text-xs text-zinc-500">
                                Queued {formatDateTime(run.created_at)}
                                {run.started_at ? ` · started ${formatDateTime(run.started_at)}` : ""}
                                {shouldShowCatalogCompletedAt(run.completed_at, run.started_at, run.created_at)
                                  ? ` · finished ${formatDateTime(run.completed_at)}`
                                  : ""}
                                {shouldShowCatalogLaunchState(run.status, run.launch_state)
                                  ? ` · ${formatRunStatusLabel(run.launch_state)}`
                                  : ""}
                              </p>
                              {run.selected_tasks && run.selected_tasks.length > 0 ? (
                                <p className="mt-2 text-xs text-zinc-500">
                                  Selected: {run.selected_tasks.map((task) => formatBackfillTaskLabel(task)).join(", ")}
                                  {run.effective_selected_tasks && run.effective_selected_tasks.length > 0
                                    ? ` · Executing: ${run.effective_selected_tasks
                                        .map((task) => formatBackfillTaskLabel(task))
                                        .join(", ")}`
                                    : ""}
                                </p>
                              ) : null}
                              <div className="mt-3 grid gap-2 md:grid-cols-3">
                                {laneCards.map((lane) => (
                                  <div key={`${run.run_id}-${lane.key}`} className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                      {lane.label}
                                    </p>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                      <span
                                        className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${getCatalogRunStatusTone(
                                          lane.status,
                                        )}`}
                                      >
                                        {formatRunStatusLabel(lane.status)}
                                      </span>
                                      {lane.sourceLabel ? (
                                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                                          {lane.sourceLabel}
                                        </span>
                                      ) : null}
                                    </div>
                                    {lane.detail ? <p className="mt-1 text-xs text-zinc-600">{lane.detail}</p> : null}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {(String(run.status || "").trim().toLowerCase() === "failed" ||
                                String(run.status || "").trim().toLowerCase() === "cancelled") && (
                                <Button
                                  onClick={() => void dismissCatalogRun(run.run_id)}
                                  disabled={dismissingCatalogRunId === run.run_id}
                                  size="sm"
                                  variant="outline"
                                  className={NYT_DASHBOARD_BUTTON_CLASS}
                                >
                                  {dismissingCatalogRunId === run.run_id ? "Dismissing…" : "Dismiss"}
                                </Button>
                              )}
                              <Button
                                onClick={() => {
                                  const selectedRunId = String(run.run_id || "").trim();
                                  const currentRunId = String(catalogRunProgress?.run_id || "").trim();
                                  setCatalogProgressRunId(selectedRunId);
                                  setCatalogProgressRequestNonce((current) => current + 1);
                                  if (selectedRunId !== currentRunId) {
                                    setCatalogRunProgress(null);
                                    setCatalogRunProgressError(null);
                                  }
                                }}
                                size="sm"
                                variant="outline"
                                className={NYT_DASHBOARD_BUTTON_CLASS}
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                          {run.error_message ? <p className="mt-2 text-xs text-red-700">{run.error_message}</p> : null}
                        </div>
                        );
                      })
                    )}
                  </div>
                </section>
              </div>
            ) : (
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-zinc-900">Catalog</h2>
                <p className="mt-2 text-sm text-zinc-500">
                  Catalog backfill is only enabled for Instagram, TikTok, Twitter/X, and Threads in v1.
                </p>
              </section>
            )
          ) : null}

          {shouldRenderCommentsPanel ? (
            <InstagramCommentsPanel
              platform={platform}
              handle={handle}
              summary={summary}
              onSummaryRefresh={refreshCommentsSummary}
              hideActiveRunProgress={Boolean(activeCommentsRunId)}
              onCoverageMetricsChange={handleInstagramCommentsCoverageMetricsChange}
            />
          ) : null}

          {hasSummary && selectedTab === "posts" ? (
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">Posts</h2>
                  <p className="text-sm text-zinc-500">
                    Every post touching @{handle}, including owned posts, collaborator matches, and catalog-only history.
                  </p>
                  {postsSortMetadata ? (
                    <p className="mt-1 text-xs text-zinc-500">
                      Sort: {postsSortMetadata.sort_by ?? "default"} {postsSortMetadata.sort_dir ?? "desc"} /{" "}
                      {formatPostsSortMode(postsSortMetadata.mode)} /{" "}
                      {postsSortMetadata.exact ? "Exact" : "Approximate"}
                      {postsSortMetadata.rollup_available === false ? " / Rollup unavailable" : null}
                      {typeof postsSortMetadata.candidate_limit === "number"
                        ? ` / Candidate limit ${postsSortMetadata.candidate_limit}`
                        : null}
                    </p>
                  ) : null}
                </div>
                <div className="text-sm text-zinc-500">
                  Page {posts?.pagination.page ?? page} of {posts?.pagination.total_pages ?? 1}
                </div>
              </div>
              {postsLoading ? <p className="mt-4 text-sm text-zinc-500">Loading posts…</p> : null}
              {postsError ? <p className="mt-4 text-sm text-red-700">{postsError}</p> : null}
              {!postsLoading && !postsError ? (
                <>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-zinc-200 text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-[0.14em] text-zinc-500">
                          <th className="pb-3 pr-4">Post</th>
                          <th className="pb-3 pr-4">Show</th>
                          <th className="pb-3 pr-4">Season</th>
                          <th className="pb-3 pr-4">Metrics</th>
                          {supportsComments ? <th className="pb-3 pr-4">Comments Lane</th> : null}
                          <th className="pb-3">Published</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {(posts?.items ?? []).length === 0 ? (
                          <tr>
                            <td colSpan={supportsComments ? 6 : 5} className="py-6 text-sm text-zinc-500">
                              No posts found for this account.
                            </td>
                          </tr>
                        ) : (
                          (posts?.items ?? []).map((item) => (
                            <tr key={item.id}>
                              <td className="py-4 pr-4 align-top">
                                <div className="max-w-xl">
                                  <p className="font-semibold text-zinc-900">{item.title || item.excerpt || "Untitled post"}</p>
                                  <div className="mt-2">
                                    {(() => {
                                      const badge = getPostMatchBadge(item);
                                      return (
                                        <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${badge.tone}`}>
                                          {badge.label}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                  {item.url ? (
                                    <a href={item.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                                      Open post
                                    </a>
                                  ) : null}
                                  {item.content ? <p className="mt-2 text-xs leading-5 text-zinc-600">{item.content}</p> : null}
                                </div>
                              </td>
                              <td className="py-4 pr-4 align-top text-zinc-700">{item.show_name ?? "Unassigned"}</td>
                              <td className="py-4 pr-4 align-top text-zinc-700">{formatSeasonLabel(item.season_number)}</td>
                              <td className="py-4 pr-4 align-top text-zinc-700">
                                <div className="space-y-1 text-xs">
                                  <div>{formatInteger(item.metrics.engagement)} engagement</div>
                                  <div>{formatInteger(item.metrics.views)} views</div>
                                  <div>{formatInteger(item.metrics.comments_count)} comments</div>
                                </div>
                              </td>
                              {supportsComments ? (
                                <td className="py-4 pr-4 align-top text-zinc-700">
                                  <PostScrapeCommentsButton
                                    platform={platform}
                                    handle={handle}
                                    sourceId={item.source_id}
                                    onCompleted={async () => {
                                      await refreshSummary();
                                    }}
                                  />
                                </td>
                              ) : null}
                              <td className="py-4 align-top text-xs text-zinc-500">{formatDateTime(item.posted_at)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <Button
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={page <= 1 || postsLoading}
                      size="sm"
                      variant="outline"
                      className={NYT_DASHBOARD_BUTTON_CLASS}
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={() => setPage((current) => current + 1)}
                      disabled={Boolean(posts && page >= posts.pagination.total_pages) || postsLoading}
                      size="sm"
                      variant="outline"
                      className={NYT_DASHBOARD_BUTTON_CLASS}
                    >
                      Next
                    </Button>
                  </div>
                </>
              ) : null}
            </section>
          ) : null}

          {hasSummary && selectedTab === "hashtags" ? (
            <div className="space-y-6">
              {platform === "instagram" ? (
                <SocialAccountProfileHashtagTimelineChart
                  timeline={hashtagTimeline}
                  loading={hashtagTimelineLoading}
                  error={hashtagTimelineError}
                />
              ) : null}
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900">Hashtags</h2>
                    <p className="text-sm text-zinc-500">
                      Show-level assignments only. Season context below is observed from post dates, not manually assigned.
                    </p>
                    {saveMessage ? <p className="mt-2 text-sm text-zinc-600">{saveMessage}</p> : null}
                  </div>
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Window
                    <select
                      value={hashtagWindow}
                      onChange={(event) =>
                        setHashtagWindow(event.target.value as (typeof HASHTAG_WINDOW_OPTIONS)[number]["value"])
                      }
                      className="mt-1 block rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-zinc-700"
                    >
                      {HASHTAG_WINDOW_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {hashtagsLoading ? <p className="mt-4 text-sm text-zinc-500">Loading hashtags…</p> : null}
                {!hashtagsLoading && hashtagsErrorMessage ? (
                  <p className={`mt-4 text-sm ${hashtagsErrorToneClass}`}>{hashtagsErrorMessage}</p>
                ) : null}
                {!hashtagsLoading && hashtags.length > 0 ? (
                  <div className="mt-4 space-y-4">
                    {hashtags.map((item) => {
                      const assignments = draftAssignments[item.hashtag] ?? [];
                      return (
                        <div key={item.hashtag} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p className="text-lg font-semibold text-zinc-900">{item.display_hashtag ?? `#${item.hashtag}`}</p>
                              <p className="text-xs text-zinc-500">
                                {formatInteger(item.usage_count)} uses · First seen {formatDateTime(item.first_seen_at)} · Last seen {formatDateTime(item.latest_seen_at)}
                              </p>
                              <p className="mt-2 text-xs text-zinc-500">
                                Observed on {(item.observed_shows ?? []).map((show) => show.show_name).filter(Boolean).join(", ") || "no assigned shows yet"}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                onClick={() => addHashtagAssignmentRow(item.hashtag)}
                                disabled={showOptions.length === 0}
                                size="sm"
                                variant="outline"
                                className={NYT_DASHBOARD_BUTTON_CLASS}
                              >
                                Add Assignment
                              </Button>
                              <Button
                                onClick={() => void saveHashtagAssignments(item.hashtag)}
                                disabled={savingHashtag === item.hashtag}
                                size="sm"
                                variant="primary"
                                className={NYT_DASHBOARD_PRIMARY_BUTTON_CLASS}
                              >
                                {savingHashtag === item.hashtag ? "Saving…" : "Save"}
                              </Button>
                            </div>
                          </div>

                          <div className="mt-4 space-y-3">
                            {assignments.length === 0 ? (
                              <p className="text-sm text-zinc-500">No assignments saved for this hashtag yet.</p>
                            ) : (
                              assignments.map((assignment, index) => {
                                const selectedShowId = assignment.show_id ?? showOptions[0]?.show_id ?? "";
                                return (
                                  <div key={`${item.hashtag}-${assignment.show_id ?? "show"}-${index}`} className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-3 lg:grid-cols-[1fr_auto]">
                                    <label className="text-sm font-medium text-zinc-700">
                                      Show
                                      <select
                                        value={selectedShowId}
                                        onChange={(event) => {
                                          const nextShowId = event.target.value;
                                          updateHashtagAssignments(
                                            item.hashtag,
                                            assignments.map((entry, entryIndex) =>
                                              entryIndex === index ? { ...entry, show_id: nextShowId } : entry,
                                            ),
                                          );
                                        }}
                                        className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                                      >
                                        {showOptions.map((show) => (
                                          <option key={show.show_id} value={show.show_id}>
                                            {show.show_name}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <div className="flex items-end">
                                      <Button
                                        onClick={() =>
                                          updateHashtagAssignments(
                                            item.hashtag,
                                            assignments.filter((_, entryIndex) => entryIndex !== index),
                                          )
                                        }
                                        size="sm"
                                        variant="outline"
                                        className={NYT_DASHBOARD_DANGER_BUTTON_CLASS}
                                      >
                                        Remove
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                {!hashtagsLoading && hashtags.length === 0 && !hashtagsErrorMessage ? (
                  <p className="mt-4 text-sm text-zinc-500">No hashtags found for this account.</p>
                ) : null}
                {supportsCatalog ? (
                  <div className="mt-8 border-t border-zinc-200 pt-6">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-base font-semibold text-zinc-900">Unknown Hashtags</h3>
                    <p className="text-sm text-zinc-500">
                      Review newly observed hashtags that have not been assigned to a show yet.
                    </p>
                  </div>
                  {reviewQueueLoading ? <p className="mt-4 text-sm text-zinc-500">Loading review queue…</p> : null}
                  {reviewQueueError ? <p className="mt-4 text-sm text-red-700">{reviewQueueError}</p> : null}
                  {!reviewQueueLoading && !reviewQueueError ? (
                    <div className="mt-4 space-y-3">
                      {reviewQueue.length === 0 ? (
                        <p className="text-sm text-zinc-500">No unknown hashtags are waiting for review.</p>
                      ) : (
                        reviewQueue.map((item) => {
                          const draft = reviewDrafts[item.id] ?? buildReviewResolutionDraft(item, reviewShowOptionsByItem[item.id] ?? []);
                          const itemShowOptions = reviewShowOptionsByItem[item.id] ?? [];
                          const canResolve =
                            draft.resolution_action === "mark_non_show" ||
                            (draft.resolution_action === "assign_show" && Boolean(draft.show_id));
                          return (
                            <div key={item.id} className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                              <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                  <div>
                                    <p className="font-semibold text-zinc-900">{item.display_hashtag ?? `#${item.hashtag}`}</p>
                                    <p className="text-xs text-zinc-500">
                                      {formatInteger(item.usage_count)} uses · First seen {formatDateTime(item.first_seen_at)} · Last seen {formatDateTime(item.last_seen_at)}
                                    </p>
                                  </div>
                                  <Button
                                    disabled={resolvingReviewItemId === item.id || !canResolve}
                                    onClick={() =>
                                      void resolveReviewItem(item.id, {
                                        resolution_action: draft.resolution_action,
                                        show_id:
                                          draft.resolution_action === "mark_non_show" ? undefined : draft.show_id || undefined,
                                      })
                                    }
                                    size="sm"
                                    variant="primary"
                                    className={NYT_DASHBOARD_PRIMARY_BUTTON_CLASS}
                                  >
                                    {resolvingReviewItemId === item.id ? "Saving…" : "Resolve"}
                                  </Button>
                                </div>
                                <div>
                                  <p className="text-xs text-zinc-500">
                                    Suggested shows: {item.suggested_shows?.map((show) => show.show_name).filter(Boolean).join(", ") || "No suggestions yet"}
                                  </p>
                                </div>
                                <div className="grid gap-3 lg:grid-cols-[220px_1fr_1fr]">
                                  <label className="text-sm font-medium text-zinc-700">
                                    Resolution
                                    <select
                                      aria-label={`Resolution for ${item.display_hashtag ?? `#${item.hashtag}`}`}
                                      value={draft.resolution_action}
                                      onChange={(event) =>
                                        updateReviewDraft(item.id, {
                                          resolution_action: event.target.value as CatalogReviewResolveRequest["resolution_action"],
                                        })
                                      }
                                      className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                                    >
                                      <option value="assign_show">Assign To Show</option>
                                      <option value="mark_non_show">Not A Show Hashtag</option>
                                    </select>
                                  </label>

                                  {draft.resolution_action !== "mark_non_show" ? (
                                    <label className="text-sm font-medium text-zinc-700">
                                      Show
                                      <select
                                        aria-label={`Show for ${item.display_hashtag ?? `#${item.hashtag}`}`}
                                        value={draft.show_id}
                                        onChange={(event) => updateReviewDraft(item.id, { show_id: event.target.value })}
                                        className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                                      >
                                        <option value="">Select a show</option>
                                        {itemShowOptions.map((show) => (
                                          <option key={show.show_id} value={show.show_id}>
                                            {show.show_name}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  ) : (
                                    <div className="hidden lg:block" />
                                  )}
                                  <div className="hidden lg:block" />
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : null}
                  </div>
                ) : null}
              </section>
            </div>
          ) : null}

          {hasSummary && selectedTab === "collaborators-tags" ? (
            <div className="space-y-6">
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900">Collaborators / Tagged Accounts / Mentions</h2>
                    <p className="text-sm text-zinc-500">
                      Review coauthors, truly tagged accounts, and caption mentions for this profile.
                    </p>
                  </div>
                </div>
              </section>

              <div className="grid gap-6 lg:grid-cols-3">
                {(["collaborators", "tags", "mentions"] as const).map((kind) => {
                  const items = collaboratorsTags?.[kind] ?? [];
                  const sectionTitle =
                    kind === "collaborators" ? "Collaborators" : kind === "tags" ? "Tagged Accounts" : "Mentions";
                  const emptyState =
                    kind === "collaborators"
                      ? "No collaborator data is available for this platform yet."
                      : kind === "tags"
                        ? "No tagged accounts were found for this profile."
                        : "No caption mentions were found for this profile.";
                  const usageLabel =
                    kind === "collaborators"
                      ? "coauthor appearances"
                      : kind === "tags"
                        ? "tag instances"
                        : "mentions";
                  return (
                    <section key={kind} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                      <h2 className="text-lg font-semibold text-zinc-900">{sectionTitle}</h2>
                      {collaboratorsLoading ? <p className="mt-4 text-sm text-zinc-500">Loading…</p> : null}
                      {collaboratorsError ? <p className="mt-4 text-sm text-red-700">{collaboratorsError}</p> : null}
                      {!collaboratorsLoading && !collaboratorsError ? (
                        <div className="mt-4 space-y-3">
                          {items.length === 0 ? (
                            <p className="text-sm text-zinc-500">{emptyState}</p>
                          ) : (
                            items.map((item) => (
                              <div key={`${kind}-${item.handle}`} className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-zinc-900">@{item.handle}</p>
                                    <p className="text-xs text-zinc-500">
                                      {formatInteger(item.usage_count)} {usageLabel} across {formatInteger(item.post_count)} posts
                                    </p>
                                  </div>
                                  {item.profile_url ? (
                                    <a
                                      href={item.profile_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                      Open
                                    </a>
                                  ) : null}
                                </div>
                                <p className="mt-2 text-xs text-zinc-500">
                                  {(item.shows ?? []).map((show) => show.show_name).filter(Boolean).join(", ") || "No mapped show context"}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            </div>
          ) : null}

          {instagramBackfillDialogOpen ? (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/55 px-4 py-6">
              <div className="w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Instagram Backfill</p>
                    <h2 className="mt-2 text-2xl font-semibold text-zinc-900">Choose what this backfill should run</h2>
                    <p className="mt-2 text-sm text-zinc-500">
                      Post Details and Comments run by default inside the selected date window. Add Media when you want the
                      full hosted-media lane.
                    </p>
                  </div>
                  <Button
                    onClick={() => setInstagramBackfillDialogOpen(false)}
                    size="sm"
                    variant="outline"
                    className={NYT_DASHBOARD_BUTTON_CLASS}
                  >
                    Close
                  </Button>
                </div>
                <div className="mt-5 space-y-3">
                  {INSTAGRAM_BACKFILL_TASK_OPTIONS.map((option) => {
                    const checked = instagramBackfillSelectedTasks.includes(option.value);
                    return (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 ${
                          checked ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleInstagramBackfillTask(option.value)}
                          className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                        />
                        <div>
                          <p className="font-semibold text-zinc-900">{option.label}</p>
                          <p className="mt-1 text-sm text-zinc-500">{option.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                  <p className="font-semibold text-zinc-900">Bounded Window</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Backfill only posts published from the start date through the end date.
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        Start date
                      </span>
                      <input
                        type="date"
                        value={instagramBackfillDateStart}
                        onChange={(event) => setInstagramBackfillDateStart(event.currentTarget.value)}
                        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        End date
                      </span>
                      <input
                        type="date"
                        value={instagramBackfillDateEnd}
                        onChange={(event) => setInstagramBackfillDateEnd(event.currentTarget.value)}
                        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    Dates are sent as UTC boundaries: 00:00:00 on the start date through 23:59:59 on the end date.
                  </p>
                </div>
                {instagramBackfillSelectedTasks.includes("post_details") ? (
                  <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-zinc-900">Detail Workers</p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {instagramBackfillDetailWorkerCount} parallel detail{" "}
                          {instagramBackfillDetailWorkerCount === 1 ? "worker" : "workers"}
                        </p>
                      </div>
                      {normalizeComparable(handle) === "bravotv" ? (
                        <Button
                          onClick={applyBravoTvFastBackfillPreset}
                          size="sm"
                          variant="outline"
                          className={NYT_DASHBOARD_BUTTON_CLASS}
                        >
                          Fast Bravo TV
                        </Button>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {INSTAGRAM_BACKFILL_DETAIL_WORKER_OPTIONS.map((count) => (
                        <Button
                          key={count}
                          onClick={() => setInstagramBackfillDetailWorkerCount(count)}
                          size="sm"
                          variant={instagramBackfillDetailWorkerCount === count ? "primary" : "outline"}
                          className={`${
                            instagramBackfillDetailWorkerCount === count
                              ? NYT_DASHBOARD_PRIMARY_BUTTON_CLASS
                              : NYT_DASHBOARD_BUTTON_CLASS
                          }`}
                        >
                          {count}
                        </Button>
                      ))}
                    </div>
                    {instagramBackfillDetailWorkerCount === 1 ? (
                      <p className="mt-3 text-sm font-medium text-amber-700">
                        Single-runner detail refresh will be slow on large Instagram accounts.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {instagramBackfillSelectedTasks.includes("comments") ? (
                  <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-zinc-900">Comments Workers</p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {instagramBackfillCommentsWorkerCount} parallel comments{" "}
                          {instagramBackfillCommentsWorkerCount === 1 ? "worker" : "workers"}
                        </p>
                      </div>
                      {normalizeComparable(handle) === "bravotv" ? (
                        <Button
                          onClick={applyBravoTvFastBackfillPreset}
                          size="sm"
                          variant="outline"
                          className={NYT_DASHBOARD_BUTTON_CLASS}
                        >
                          Fast Bravo TV
                        </Button>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {INSTAGRAM_BACKFILL_COMMENTS_WORKER_OPTIONS.map((count) => (
                        <Button
                          key={count}
                          onClick={() => setInstagramBackfillCommentsWorkerCount(count)}
                          size="sm"
                          variant={instagramBackfillCommentsWorkerCount === count ? "primary" : "outline"}
                          className={`${
                            instagramBackfillCommentsWorkerCount === count
                              ? NYT_DASHBOARD_PRIMARY_BUTTON_CLASS
                              : NYT_DASHBOARD_BUTTON_CLASS
                          }`}
                        >
                          {count}
                        </Button>
                      ))}
                    </div>
                    {instagramBackfillCommentsWorkerCount === 1 ? (
                      <p className="mt-3 text-sm font-medium text-amber-700">
                        Single-runner comments sync will be slow on large Instagram accounts.
                      </p>
                    ) : null}
                    <label className="mt-4 flex items-start gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3">
                      <input
                        type="checkbox"
                        checked={instagramBackfillCommentMediaEnabled}
                        disabled={instagramBackfillIncludesMedia}
                        onChange={(event) => setInstagramBackfillCommentMediaFollowups(event.currentTarget.checked)}
                        className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-zinc-900">Comment media follow-ups</span>
                        <span className="mt-1 block text-xs text-zinc-500">
                          Save comment GIFs, stickers, emoji media, and other comment attachments separately from hosted post media.
                        </span>
                      </span>
                    </label>
                  </div>
                ) : null}
                <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                    Conservative Full-Depth Estimate
                  </p>
                  <p className="mt-2 text-sm font-semibold text-sky-950">
                    {instagramBackfillPreflightItems.join(" · ")}
                  </p>
                  <p className="mt-1 text-xs text-sky-700">
                    Estimated wall time{" "}
                    {formatDurationEstimate(instagramBackfillEstimatedWallSeconds) ?? "unknown"} · Estimated worker cost{" "}
                    {instagramBackfillEstimatedWorkerMinutes > 0
                      ? `${formatInteger(Math.ceil(instagramBackfillEstimatedWorkerMinutes))} worker-min`
                      : "unknown"}
                    .
                  </p>
                  <p className="mt-1 text-xs text-sky-700">
                    Estimate uses {formatInteger(instagramBackfillEstimatedPostTargets)} catalog posts and{" "}
                    {formatInteger(instagramBackfillEstimatedCommentTargets || instagramBackfillEstimatedPostTargets)} comment targets.
                    The comments lane fetches full per-post threads, not a shallow profile export.
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between gap-3">
                  <p className="text-xs text-zinc-500">
                    {instagramBackfillSelectedTasks.length > 0
                      ? `Selected: ${instagramBackfillDateStart || "open start"} to ${
                          instagramBackfillDateEnd || "open end"
                        } · ${instagramBackfillSelectedTasks.map((task) => formatBackfillTaskLabel(task)).join(", ")}${
                          instagramBackfillSelectedTasks.includes("post_details")
                            ? ` · ${instagramBackfillDetailWorkerCount} detail workers`
                            : ""
                        }${
                          instagramBackfillSelectedTasks.includes("comments")
                            ? ` · ${instagramBackfillCommentsWorkerCount} comments workers`
                            : ""
                        }${
                          instagramBackfillCommentMediaEnabled ? " · comment media on" : ""
                        }`
                      : "Select at least one task to continue."}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setInstagramBackfillDialogOpen(false)}
                      variant="outline"
                      className={NYT_DASHBOARD_BUTTON_CLASS}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => void submitInstagramBackfillDialog()}
                      disabled={instagramBackfillSelectedTasks.length === 0 || catalogLaunchActionsBlocked}
                      variant="primary"
                      className={NYT_DASHBOARD_PRIMARY_BUTTON_CLASS}
                    >
                      {runningCatalogAction === "backfill" ? "Preparing Backfill…" : "Start Backfill"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {catalogDetailSourceId ? (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/60 px-4 py-6">
              <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Catalog Detail</p>
                    <h2 className="mt-1 text-xl font-semibold text-zinc-900">
                      {catalogDetail?.title || catalogDetail?.source_id || `${SOCIAL_ACCOUNT_PLATFORM_LABELS[platform] ?? platform} Post`}
                    </h2>
                  </div>
                  <Button
                    onClick={() => {
                      setCatalogDetailSourceId(null);
                      setCatalogDetail(null);
                      setCatalogDetailError(null);
                    }}
                    size="sm"
                    variant="outline"
                    className={NYT_DASHBOARD_BUTTON_CLASS}
                  >
                    Close
                  </Button>
                </div>
                <div className="max-h-[calc(90vh-72px)] overflow-y-auto px-6 py-5">
                  {catalogDetailLoading ? <p className="text-sm text-zinc-500">Loading catalog post detail…</p> : null}
                  {catalogDetailError ? <p className="text-sm text-red-700">{catalogDetailError}</p> : null}
                  {!catalogDetailLoading && !catalogDetailError && catalogDetail ? (
                    <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
                      <div className="space-y-5">
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Likes</p>
                              <p className="mt-1 text-lg font-semibold text-zinc-900">
                                {formatDetailMetricValue(catalogDetail.saved_metrics?.likes)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Comments</p>
                              <p className="mt-1 text-lg font-semibold text-zinc-900">
                                {formatDetailMetricValue(catalogDetail.saved_metrics?.comments_count)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Views</p>
                              <p className="mt-1 text-lg font-semibold text-zinc-900">
                                {formatDetailMetricValue(catalogDetail.saved_metrics?.views)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Engagement</p>
                              <p className="mt-1 text-lg font-semibold text-zinc-900">
                                {formatDetailMetricValue(catalogDetail.saved_metrics?.engagement)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {catalogDetail.facebook_crosspost?.comments_count ||
                        catalogDetail.facebook_crosspost?.is_shared_to_fb != null ||
                        catalogDetail.comment_completeness?.external_facebook_comments ? (
                          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                  Facebook Crosspost
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-zinc-700">
                                  {formatInteger(
                                    catalogDetail.facebook_crosspost?.comments_count ??
                                      catalogDetail.comment_completeness?.external_facebook_comments ??
                                      0,
                                  )}{" "}
                                  comments from Facebook
                                </p>
                                {catalogDetail.comment_completeness?.instagram_fetchable_comments != null ||
                                catalogDetail.comment_completeness?.saved_instagram_comments != null ? (
                                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                                    {formatInteger(catalogDetail.comment_completeness?.saved_instagram_comments ?? 0)} saved comments out of{" "}
                                    {formatInteger(catalogDetail.comment_completeness?.instagram_fetchable_comments ?? 0)}{" "}
                                    Instagram-fetchable comments
                                    {catalogDetail.comment_completeness?.external_facebook_comments
                                      ? `; ${formatInteger(
                                          catalogDetail.comment_completeness.external_facebook_comments,
                                        )} Facebook accounted outside Instagram comments.`
                                      : "."}
                                  </p>
                                ) : null}
                              </div>
                              <div className="text-right text-xs text-zinc-500">
                                <p>
                                  {catalogDetail.facebook_crosspost?.is_shared_to_fb === true
                                    ? "Shared to Facebook"
                                    : catalogDetail.facebook_crosspost?.is_shared_to_fb === false
                                      ? "Not shared to Facebook"
                                      : "Facebook share state unknown"}
                                </p>
                                {catalogDetail.facebook_crosspost?.observed_at ? (
                                  <p className="mt-1">Observed {formatDateTime(catalogDetail.facebook_crosspost.observed_at)}</p>
                                ) : null}
                              </div>
                            </div>
                            {catalogDetail.facebook_crosspost?.post_url || catalogDetail.facebook_crosspost?.post_id ? (
                              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                                {catalogDetail.facebook_crosspost?.post_url ? (
                                  <a
                                    href={catalogDetail.facebook_crosspost.post_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                  >
                                    Open Facebook post
                                  </a>
                                ) : null}
                                {catalogDetail.facebook_crosspost?.post_id ? (
                                  <span className="text-zinc-500">Facebook ID {catalogDetail.facebook_crosspost.post_id}</span>
                                ) : null}
                              </div>
                            ) : null}
                          </section>
                        ) : null}

                        <div className="grid gap-3 sm:grid-cols-2">
                          {(() => {
                            const mediaUrls = getCatalogPostMediaUrls(catalogDetail);
                            if (mediaUrls.length === 0) {
                              return (
                                <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                                  No saved media URLs are available for this catalog row yet.
                                </div>
                              );
                            }
                            return mediaUrls.slice(0, 8).map((mediaUrl, index) => (
                              <div key={`${mediaUrl}-${index}`} className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
                                {isLikelyVideoUrl(mediaUrl) ? (
                                  <video src={mediaUrl} controls className="h-64 w-full bg-black object-cover" />
                                ) : (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={mediaUrl} alt="" className="h-64 w-full object-cover" />
                                )}
                              </div>
                            ));
                          })()}
                        </div>

                        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
                          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">Caption</h3>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                            {catalogDetail.content || "No caption saved for this post."}
                          </p>
                        </section>

                        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">Saved Discussion</h3>
                            <p className="text-xs text-zinc-500">
                              {formatInteger(
                                catalogDetail.total_comments_in_db ??
                                  catalogDetail.saved_comments ??
                                  catalogDetail.discussion_items?.length ??
                                  0,
                              )}{" "}
                              items
                            </p>
                          </div>
                          <div className="mt-3 space-y-3">
                            {(catalogDetail.discussion_items ?? []).length === 0 ? (
                              <p className="text-sm text-zinc-500">No saved discussion items are available for this post yet.</p>
                            ) : (
                              (catalogDetail.discussion_items ?? []).slice(0, 20).map((item) => (
                                <div key={item.id} className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                    <span>{item.display_name || item.username || "Unknown"}</span>
                                    {item.discussion_type ? <span>{item.discussion_type.replace(/_/g, " ")}</span> : null}
                                    {item.created_at ? <span>{formatDateTime(item.created_at)}</span> : null}
                                  </div>
                                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-700">
                                    {item.text || "No text"}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        </section>
                      </div>

                      <div className="space-y-4">
                        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
                          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">Post Meta</h3>
                          <div className="mt-3 space-y-3 text-sm text-zinc-700">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Published</p>
                              <p className="mt-1">{formatDateTime(catalogDetail.posted_at)}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Mirror Status</p>
                              <p className="mt-1">{formatMirrorStatusLabel(catalogDetail.media_mirror_status)}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Last Mirror Job</p>
                              <p className="mt-1">{catalogDetail.media_mirror_last_job_id || "None"}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Source Surface</p>
                              <p className="mt-1 capitalize">{catalogDetail.source_surface || "catalog"}</p>
                            </div>
                            {catalogDetail.permalink ? (
                              <div>
                                <a
                                  href={catalogDetail.permalink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  Open permalink
                                </a>
                              </div>
                            ) : null}
                          </div>
                        </section>

                        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
                          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">Saved Fields</h3>
                          <div className="mt-3 space-y-3 text-sm text-zinc-700">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Hashtags</p>
                              <p className="mt-1">{(catalogDetail.hashtags ?? []).join(", ") || "None"}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Mentions</p>
                              <p className="mt-1">{(catalogDetail.mentions ?? []).join(", ") || "None"}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Collaborators</p>
                              <p className="mt-1">{(catalogDetail.collaborators ?? []).join(", ") || "None"}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Tags</p>
                              <p className="mt-1">{(catalogDetail.tags ?? []).join(", ") || "None"}</p>
                            </div>
                          </div>
                        </section>

                        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
                          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">Media URLs</h3>
                          <div className="mt-3 space-y-3 text-xs text-zinc-600">
                            {buildCatalogDetailUrlGroups(catalogDetail).map((group) => (
                              <div key={group.label}>
                                <p className="font-semibold uppercase tracking-[0.14em] text-zinc-500">{group.label}</p>
                                <div className="mt-2 space-y-2">
                                  {group.urls.length === 0 ? (
                                    <p>None</p>
                                  ) : (
                                    group.urls.map((url) => (
                                      <a
                                        key={url}
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block break-all text-blue-600 hover:text-blue-800 hover:underline"
                                      >
                                        {url}
                                      </a>
                                    ))
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </ClientOnly>
  );
}
