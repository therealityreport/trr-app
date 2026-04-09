"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import SocialAccountProfileHashtagTimelineChart from "@/components/admin/SocialAccountProfileHashtagTimelineChart";
import SocialGrowthSection from "@/components/admin/social-growth-section";
import {
  type SocialAccountCatalogGapAnalysis,
  type SocialAccountCatalogActionScope,
  type SocialAccountCatalogGapAnalysisStatus,
  type SocialAccountCatalogGapAnalysisStatusResponse,
  type SocialAccountCatalogFreshness,
  type CatalogBackfillRequest,
  type CatalogRepairAuthRequest,
  type CatalogReviewResolveRequest,
  type CatalogSyncNewerRequest,
  type CatalogSyncRecentRequest,
  type SocialAccountCatalogPost,
  type SocialAccountCatalogReviewItem,
  type SocialAccountCatalogRun,
  type SocialAccountCatalogRunProgressHandle,
  type SocialAccountCatalogRunProgressLogEntry,
  type SocialAccountCatalogRunProgressSnapshot,
  type SocialAccountCatalogRunProgressStage,
  type SocialAccountOperationalAlert,
  type SocialAccountProfileHashtag,
  type SocialAccountProfileHashtagAssignment,
  type SocialAccountProfileHashtagTimeline,
  type SocialAccountProfilePost,
  type SocialAccountProfileSummary,
  type SocialAccountProfileTab,
  type SocialPlatformSlug,
  type SocialAccountProfileCollaboratorTagAggregate,
  type SocialProfileCookieHealth,
  SOCIAL_ACCOUNT_CATALOG_ENABLED_PLATFORMS,
  SOCIAL_ACCOUNT_PLATFORM_LABELS,
  SOCIAL_ACCOUNT_PROFILE_TAB_LABELS,
  SOCIAL_ACCOUNT_SOCIALBLADE_ENABLED_PLATFORMS,
} from "@/lib/admin/social-account-profile";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { buildSocialAccountProfileUrl } from "@/lib/admin/show-admin-routes";
import { invalidateAdminSnapshotFamilies } from "@/lib/admin/admin-snapshot-client";
import { fetchAdminWithAuth as fetchAdminWithAuthBase } from "@/lib/admin/client-auth";
import { useSharedPollingResource } from "@/lib/admin/shared-live-resource";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

type Props = {
  platform: SocialPlatformSlug;
  handle: string;
  activeTab: SocialAccountProfileTab;
};

type PostsResponse = {
  items: SocialAccountProfilePost[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
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

type HashtagsResponse = {
  items: SocialAccountProfileHashtag[];
};

type HashtagTimelineResponse = SocialAccountProfileHashtagTimeline & {
  error?: string;
};

type CatalogReviewQueueResponse = {
  items: SocialAccountCatalogReviewItem[];
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
};

type SummaryResponse = SocialAccountProfileSummary & ProxyErrorPayload;

type SummaryLoadResult = {
  data: SocialAccountProfileSummary;
  uninitialized: boolean;
};

type CatalogRunProgressResponse = SocialAccountCatalogRunProgressSnapshot & ProxyErrorPayload;

type SocialAccountProfileSnapshot = {
  summary?: SocialAccountProfileSummary | null;
  catalog_run_progress?: SocialAccountCatalogRunProgressSnapshot | null;
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

const socialProfileRequestInflight = new Map<string, Promise<unknown>>();

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
const TERMINAL_CATALOG_RUN_STATUSES = new Set(["completed", "failed", "cancelled"]);
const CATALOG_ACTION_SCOPES: ReadonlyArray<SocialAccountCatalogActionScope> = [
  "full_history",
  "bounded_window",
  "recent_window",
  "head_gap",
  "frontier_resume",
];
const BOUNDED_CATALOG_ACTION_SCOPES = new Set<SocialAccountCatalogActionScope>([
  "bounded_window",
  "recent_window",
  "head_gap",
  "frontier_resume",
]);
const CATALOG_PROGRESS_POLL_INTERVAL_MS = 5_000;
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

const formatInteger = (value: number | null | undefined): string => {
  return INTEGER_FORMATTER.format(Number.isFinite(Number(value)) ? Number(value) : 0);
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
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

const formatHashtagWindowLabel = (value: (typeof HASHTAG_WINDOW_OPTIONS)[number]["value"]): string => {
  return HASHTAG_WINDOW_OPTIONS.find((option) => option.value === value)?.label ?? "All Time";
};

const buildEmptySocialAccountProfileSummary = (
  platform: SocialPlatformSlug,
  handle: string,
): SocialAccountProfileSummary => ({
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
  per_show_counts: [],
  per_season_counts: [],
  top_hashtags: [],
  top_collaborators: [],
  top_tags: [],
  source_status: [],
});

const hasBackendSaturationText = (value: string): boolean => {
  const message = value.toLowerCase();
  return (
    message.includes("connection pool exhausted") ||
    message.includes("database pool initialization failed") ||
    message.includes("maxclientsinsessionmode") ||
    message.includes("session-pool capacity") ||
    message.includes("session pool capacity") ||
    message.includes("backend is saturated")
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
      existing.upstreamStatus !== undefined
    ) {
      return existing;
    }
    const normalized = new Error(existing.message || fallbackMessage) as SocialAccountRequestError;
    normalized.code = existing.code;
    normalized.retryable = existing.retryable;
    normalized.retryAfterMs = existing.retryAfterMs;
    normalized.isBackendSaturated = existing.isBackendSaturated;
    normalized.upstreamStatus = existing.upstreamStatus;
    return normalized;
  }
  return new Error(fallbackMessage) as SocialAccountRequestError;
};

const isBackendSaturationError = (error: unknown): error is SocialAccountRequestError => {
  return Boolean((error as SocialAccountRequestError | undefined)?.isBackendSaturated);
};

const isTimeoutRequestError = (error: SocialAccountRequestError | null | undefined): boolean => {
  if (!error) return false;
  return (
    error.code === "UPSTREAM_TIMEOUT" ||
    error.upstreamStatus === 504 ||
    error.message.toLowerCase().includes("timed out")
  );
};

const formatCatalogDiagnosticErrorMessage = (
  label: "Freshness check" | "Gap analysis",
  error: SocialAccountRequestError | null,
): string | null => {
  if (!error) return null;
  if (isBackendSaturationError(error)) {
    return `${label} is retryable while the backend is busy.`;
  }
  if (isTimeoutRequestError(error)) {
    return label === "Gap analysis"
      ? "Gap analysis timed out before completion. Retry when you need repair guidance."
      : "Freshness check timed out before completion. Retry in a moment.";
  }
  return `${label} failed. ${(error as Error).message}`;
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

const formatRunStageLabel = (
  value?: string | null,
  options?: { frontierMode?: boolean; singleRunnerFallback?: boolean },
): string => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "Other";
  const frontierMode = Boolean(options?.frontierMode);
  const singleRunnerFallback = Boolean(options?.singleRunnerFallback);
  if (normalized === "media_mirror") return "Media Mirror";
  if (normalized === "comment_media_mirror") return "Comment Media Mirror";
  if (normalized === "shared_account_discovery") return frontierMode ? "History Bootstrap" : "History Discovery";
  if (normalized === "shared_account_posts") {
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

const formatCatalogStageActivitySummary = (
  stageName: string,
  stats: Pick<CatalogRunProgressStageStats, "scraped" | "saved">,
  options?: { frontierMode?: boolean; singleRunnerFallback?: boolean },
): string => {
  const normalized = String(stageName || "").trim().toLowerCase();
  const frontierMode = Boolean(options?.frontierMode);
  const singleRunnerFallback = Boolean(options?.singleRunnerFallback);
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
  if (runStatus === "cancelled") {
    return "Run cancelled";
  }
  if (runStatus === "failed") {
    return "Run failed";
  }
  if (runStatus === "completed" && !progress?.classify_incomplete) {
    return "Catalog fetch complete";
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
    return "Fetching catalog posts";
  }
  if (runState === "classifying") {
    return "Classifying posts";
  }
  if (runState === "completed") {
    return "Catalog fetch complete";
  }
  if (progress?.scrape_complete) {
    return progress?.classify_incomplete ? "Classifying posts" : "Catalog fetch complete";
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

const normalizeCatalogRunStatus = (value?: string | null): string => {
  return String(value || "").trim().toLowerCase();
};

const normalizeCatalogRunState = (value?: string | null): string => {
  return String(value || "").trim().toLowerCase();
};

const resolveActiveCatalogSourceScope = (
  summary?: SocialAccountProfileSummary | null,
  progress?: SocialAccountCatalogRunProgressSnapshot | null,
): string => {
  const progressScope = String(progress?.source_scope || "").trim().toLowerCase();
  if (progressScope) return progressScope;
  const sourceStatusRows = Array.isArray(summary?.source_status) ? summary.source_status : [];
  for (const row of sourceStatusRows) {
    const scope = String((row as Record<string, unknown>).source_scope || "").trim().toLowerCase();
    if (scope) return scope;
  }
  return "bravo";
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
  String(alert.code || "")
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
  const [catalogCardPreview, setCatalogCardPreview] = useState<{
    total: number;
    latestPostedAt: string | null;
  } | null>(null);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogFilter, setCatalogFilter] = useState<"all" | "assigned" | "unassigned" | "ambiguous" | "needs_review">("all");
  const [catalogActionMessage, setCatalogActionMessage] = useState<string | null>(null);
  const [runningCatalogAction, setRunningCatalogAction] = useState<"backfill" | "repair_auth" | "sync_recent" | "sync_newer" | null>(null);
  const [reviewQueue, setReviewQueue] = useState<SocialAccountCatalogReviewItem[]>([]);
  const [reviewQueueLoading, setReviewQueueLoading] = useState(false);
  const [reviewQueueError, setReviewQueueError] = useState<string | null>(null);
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
  const [catalogProgressRequestNonce, setCatalogProgressRequestNonce] = useState(0);
  const [catalogRunProgress, setCatalogRunProgress] = useState<SocialAccountCatalogRunProgressSnapshot | null>(null);
  const [catalogRunProgressError, setCatalogRunProgressError] = useState<string | null>(null);
  const [catalogRunProgressLoading, setCatalogRunProgressLoading] = useState(false);
  const [catalogProgressSaturationActive, setCatalogProgressSaturationActive] = useState(false);
  const [cancellingCatalogRun, setCancellingCatalogRun] = useState(false);
  const [dismissingCatalogRunId, setDismissingCatalogRunId] = useState<string | null>(null);
  const [catalogProgressLastSuccessAt, setCatalogProgressLastSuccessAt] = useState<string | null>(null);
  const [catalogLogsExpanded, setCatalogLogsExpanded] = useState(false);
  const catalogTerminalSummaryRefreshRunIdRef = useRef<string | null>(null);
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
  const COOKIE_REQUIRED_PLATFORMS: ReadonlyArray<SocialPlatformSlug> = ["tiktok", "twitter", "facebook", "threads"];
  const platformRequiresCookies = COOKIE_REQUIRED_PLATFORMS.includes(platform);
  const [cookieHealth, setCookieHealth] = useState<SocialProfileCookieHealth | null>(null);
  const [cookieHealthLoading, setCookieHealthLoading] = useState(false);
  const [cookieHealthError, setCookieHealthError] = useState<string | null>(null);
  const [cookieRefreshing, setCookieRefreshing] = useState(false);
  const [cookieRefreshMessage, setCookieRefreshMessage] = useState<string | null>(null);

  const supportsCatalog = SOCIAL_ACCOUNT_CATALOG_ENABLED_PLATFORMS.includes(platform);
  const supportsSocialBlade = SOCIAL_ACCOUNT_SOCIALBLADE_ENABLED_PLATFORMS.includes(platform);
  const hasSummary = summary !== null;
  const shouldDeferSecondaryCatalogReads =
    !hasSummary || summaryLoading || summarySaturationActive || catalogProgressSaturationActive;
  const summaryRequestKey = `summary:${platform}:${handle}`;
  const hashtagsRequestKey = `hashtags:${platform}:${handle}:${hashtagWindow}`;
  const hashtagTimelineRequestKey = `hashtags-timeline:${platform}:${handle}:${hashtagWindow}`;
  const collaboratorsRequestKey = `collaborators-tags:${platform}:${handle}`;
  const activeCatalogRun = useMemo<SocialAccountCatalogRun | null>(() => {
    const runs = summary?.catalog_recent_runs ?? [];
    return runs.find((run) => ACTIVE_CATALOG_RUN_STATUSES.has(String(run.status || "").trim().toLowerCase())) ?? null;
  }, [summary?.catalog_recent_runs]);
  const latestCatalogRun = useMemo<SocialAccountCatalogRun | null>(() => {
    const runs = summary?.catalog_recent_runs ?? [];
    const normalize = (s: string | undefined | null) => String(s || "").trim().toLowerCase();
    const completed = runs.find((r) => normalize(r.status) === "completed");
    if (completed) return completed;
    const nonTerminal = runs.find((r) => !TERMINAL_CATALOG_RUN_STATUSES.has(normalize(r.status)));
    if (nonTerminal) return nonTerminal;
    if (runs.length === 1 && normalize(runs[0]?.status) === "cancelled") {
      return runs[0] ?? null;
    }
    return null;
  }, [summary?.catalog_recent_runs]);
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
  const backgroundCatalogRunId = useMemo(() => {
    return selectedCatalogRunId || activeCatalogRunId || latestCatalogRunId || null;
  }, [activeCatalogRunId, latestCatalogRunId, selectedCatalogRunId]);
  const visibleTabs = useMemo(
    () =>
      (Object.keys(SOCIAL_ACCOUNT_PROFILE_TAB_LABELS) as SocialAccountProfileTab[]).filter(
        (tab) => tab !== "socialblade" || supportsSocialBlade,
      ),
    [supportsSocialBlade],
  );

  useEffect(() => {
    setPage(1);
    setCatalogPage(1);
    setSummary(null);
    setSummaryUninitialized(false);
    setSummaryLoading(false);
    setSummaryError(null);
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
    setCatalogProgressRequestNonce(0);
    setCatalogRunProgress(null);
    setCatalogRunProgressError(null);
    setCatalogRunProgressLoading(false);
    setCatalogProgressSaturationActive(false);
    setCatalogProgressLastSuccessAt(null);
    setCatalogLogsExpanded(false);
    catalogTerminalSummaryRefreshRunIdRef.current = null;
    catalogFreshnessProbeKeyRef.current = null;
    setHashtagTimeline(null);
    setHashtagTimelineError(null);
    setHashtagTimelineLoading(false);
    setHashtagWindow("all");
    setCatalogFreshness(null);
    setCatalogFreshnessLoading(false);
    setCatalogFreshnessError(null);
    setCatalogGapAnalysis(null);
    setCatalogGapAnalysisStatus("idle");
    setCatalogGapAnalysisOperationId(null);
    setCatalogGapAnalysisStale(false);
    setCatalogGapAnalysisLoading(false);
    setCatalogGapAnalysisError(null);
    setCatalogGapAnalysisRequestNonce(0);
    setCollaboratorsTags(null);
    setCollaboratorsLoading(false);
    setCollaboratorsError(null);
    setPostSearchExpanded(false);
    setPostSearchQuery("");
    setPostSearchResults(null);
    setPostSearchLoading(false);
    setPostSearchError(null);
  }, [platform, handle]);

  useEffect(() => {
    setCatalogPage(1);
  }, [catalogFilter]);

  useEffect(() => {
    if (!postSearchExpanded) return;
    postSearchInputRef.current?.focus();
  }, [postSearchExpanded]);

  const refreshSummary = useCallback(async () => {
    if (!user) return;
    const result = await withSocialProfileRequestDedup(summaryRequestKey, async (): Promise<SummaryLoadResult> => {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/summary`,
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
    setSummary(result.data);
    setSummaryUninitialized(result.uninitialized);
    setSummaryError(null);
    return result;
  }, [fetchAdminWithAuth, handle, platform, summaryRequestKey, user]);

  const fetchProfileSnapshot = useCallback(
    async (options?: { signal?: AbortSignal; forceRefresh?: boolean; runId?: string | null }) => {
      if (!user) {
        throw new Error("Missing admin user");
      }
      const params = new URLSearchParams();
      const runId = options?.runId ?? backgroundCatalogRunId;
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
    [backgroundCatalogRunId, fetchAdminWithAuth, handle, platform, user],
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

  const refreshProfileSnapshotNow = useCallback(
    async (options?: { runId?: string | null }) => {
      await invalidateProfileSnapshotFamily();
      const snapshot = await fetchProfileSnapshot({
        forceRefresh: true,
        runId: options?.runId,
      });
      if (snapshot.payload.summary) {
        setSummary(snapshot.payload.summary);
        setSummaryUninitialized(false);
        setSummaryError(null);
      }
      if (snapshot.payload.catalog_run_progress) {
        setCatalogProgressSaturationActive(false);
        setCatalogRunProgress(snapshot.payload.catalog_run_progress);
        setCatalogRunProgressError(null);
        setCatalogProgressLastSuccessAt(snapshot.payload.generated_at ?? new Date().toISOString());
        setCatalogRunProgressLoading(false);
      }
      return snapshot;
    },
    [fetchProfileSnapshot, invalidateProfileSnapshotFamily],
  );

  const applyCancelledCatalogRunLocally = useCallback(
    (runId: string, cancelledAt?: string | null) => {
      const normalizedRunId = String(runId || "").trim();
      if (!normalizedRunId) return;
      const effectiveCancelledAt = String(cancelledAt || "").trim() || new Date().toISOString();
      setCatalogActionMessage(`Cancelled run ${shortRunId(normalizedRunId)}.`);
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
    [setCatalogActionMessage],
  );

  const reconcileCatalogRunAfterCancelAttempt = useCallback(
    async (runId: string): Promise<boolean> => {
      if (!user) return false;
      const normalizedRunId = String(runId || "").trim();
      if (!normalizedRunId) return false;

      try {
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/runs/${encodeURIComponent(normalizedRunId)}/progress?recent_log_limit=25`,
          undefined,
          { preferredUser: user },
        );
        const data = (await response.json().catch(() => ({}))) as CatalogRunProgressResponse;
        if (response.ok) {
          setCatalogRunProgress(data);
          setCatalogRunProgressError(null);
          setCatalogProgressLastSuccessAt(new Date().toISOString());
          if (normalizeCatalogRunStatus(data.run_status) === "cancelled") {
            applyCancelledCatalogRunLocally(normalizedRunId, data.completed_at);
            return true;
          }
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

  useEffect(() => {
    if (checking || !user || !hasAccess) return;
    let cancelled = false;

    const loadSummary = async () => {
      setSummaryLoading(true);
      setSummaryError(null);
      try {
        const snapshot = await fetchProfileSnapshot();
        if (snapshot.payload.summary) {
          setSummary(snapshot.payload.summary);
          setSummaryUninitialized(false);
          setSummaryError(null);
        }
        if (snapshot.payload.catalog_run_progress) {
          setCatalogRunProgress(snapshot.payload.catalog_run_progress);
          setCatalogRunProgressError(null);
          setCatalogProgressLastSuccessAt(snapshot.payload.generated_at ?? new Date().toISOString());
        }
        if (cancelled) return;
        setSummaryError(null);
      } catch (error) {
        if (cancelled) return;
        setSummaryUninitialized(false);
        if (!isBackendSaturationError(error)) {
          setSummarySaturationActive(false);
        }
        setSummaryError(error instanceof Error ? error.message : "Failed to load social account profile summary");
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    };

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, [checking, fetchProfileSnapshot, handle, hasAccess, platform, user]);

  useEffect(() => {
    if (checking || !user || !hasAccess || !supportsCatalog || summaryUninitialized || shouldDeferSecondaryCatalogReads) {
      return;
    }
    const liveCatalogTotal = Number(summary?.live_catalog_total_posts ?? summary?.catalog_total_posts ?? 0);
    const hasCatalogHistory = Number(summary?.catalog_recent_runs?.length ?? 0) > 0;
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
      } catch {
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
    platform,
    summary?.catalog_recent_runs,
    summary?.catalog_total_posts,
    summary?.live_catalog_total_posts,
    summaryUninitialized,
    shouldDeferSecondaryCatalogReads,
    supportsCatalog,
    user,
  ]);

  useEffect(() => {
    if (checking || !user || !hasAccess || activeTab !== "posts" || summaryUninitialized) return;
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
  }, [activeTab, checking, fetchAdminWithAuth, handle, hasAccess, page, platform, summaryUninitialized, user]);

  useEffect(() => {
    if (checking || !user || !hasAccess || activeTab !== "catalog" || !supportsCatalog || summaryUninitialized) return;
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
  }, [activeTab, catalogFilter, catalogPage, checking, fetchAdminWithAuth, handle, hasAccess, platform, summaryUninitialized, supportsCatalog, user]);

  useEffect(() => {
    const shouldLoadHashtags = activeTab === "hashtags" || activeTab === "stats";
    if (checking || !user || !hasAccess || !shouldLoadHashtags || summaryUninitialized || shouldDeferSecondaryCatalogReads) {
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
    activeTab,
    checking,
    hashtagWindow,
    hasAccess,
    hashtagsRequestKey,
    platform,
    refreshHashtags,
    shouldDeferSecondaryCatalogReads,
    summaryUninitialized,
    user,
  ]);

  useEffect(() => {
    if (checking || !user || !hasAccess || activeTab !== "hashtags" || platform !== "instagram" || summaryUninitialized) {
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
  }, [activeTab, checking, hasAccess, platform, refreshHashtagTimeline, summaryUninitialized, user]);

  useEffect(() => {
    if (
      checking ||
      !user ||
      !hasAccess ||
      !supportsCatalog ||
      summaryUninitialized ||
      (activeTab !== "hashtags" && activeTab !== "catalog")
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
        setReviewQueueError(error instanceof Error ? error.message : "Failed to load social account catalog review queue");
      } finally {
        if (!cancelled) setReviewQueueLoading(false);
      }
    };

    void loadReviewQueue();
    return () => {
      cancelled = true;
    };
  }, [activeTab, checking, fetchAdminWithAuth, handle, hasAccess, platform, summaryUninitialized, supportsCatalog, user]);

  useEffect(() => {
    if (checking || !user || !hasAccess || activeTab !== "collaborators-tags" || summaryUninitialized) return;
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
  }, [activeTab, checking, collaboratorsRequestKey, fetchAdminWithAuth, handle, hasAccess, platform, summaryUninitialized, user]);

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
      !shouldDeferSecondaryCatalogReads &&
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
    shouldDeferSecondaryCatalogReads,
    summaryUninitialized,
    supportsCatalog,
  ]);

  const requestCatalogGapAnalysis = useCallback(() => {
    setCatalogGapAnalysisError(null);
    setCatalogGapAnalysisStale(Boolean(catalogGapAnalysis));
    setCatalogGapAnalysisRequestNonce((current) => current + 1);
  }, [catalogGapAnalysis]);

  const displayedStatsHashtags = useMemo(() => hashtags, [hashtags]);

  const statsHashtagsPending = useMemo(() => {
    const shouldShowFetchedHashtags = activeTab === "stats" || activeTab === "hashtags";
    if (!shouldShowFetchedHashtags) {
      return false;
    }
    return hashtagsLoadedRequestKey !== hashtagsRequestKey;
  }, [activeTab, hashtagsLoadedRequestKey, hashtagsRequestKey]);

  const hashtagsErrorMessage = useMemo(() => formatHashtagRequestErrorMessage(hashtagsError), [hashtagsError]);
  const hashtagsErrorToneClass = useMemo(() => {
    return isBackendSaturationError(hashtagsError) ? "text-amber-800" : "text-red-700";
  }, [hashtagsError]);

  useEffect(() => {
    if (
      checking ||
      !user ||
      !hasAccess ||
      !supportsCatalog ||
      platform !== "instagram" ||
      summaryUninitialized ||
      shouldDeferSecondaryCatalogReads
    ) {
      setCatalogFreshness(null);
      setCatalogFreshnessError(null);
      setCatalogFreshnessLoading(false);
      return;
    }

    const latestStatus = normalizeCatalogRunStatus(latestCatalogRun?.status);
    const activeStatus = normalizeCatalogRunStatus(activeCatalogRun?.status);
    const probeKey = `${platform}:${handle}:${latestCatalogRun?.run_id ?? "none"}:${activeCatalogRun?.run_id ?? "none"}`;

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
    catalogFreshnessProbeKeyRef.current = probeKey;

    const loadCatalogFreshness = async () => {
      setCatalogFreshnessLoading(true);
      setCatalogFreshnessError(null);
      try {
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/freshness`,
          {
            method: "POST",
          },
          { preferredUser: user },
        );
        const data = (await response.json().catch(() => ({}))) as (SocialAccountCatalogFreshness & ProxyErrorPayload);
        if (!response.ok) {
          throw buildSocialAccountRequestError(data, "Failed to check catalog freshness");
        }
        if (cancelled) return;
        setCatalogFreshness(data);
      } catch (error) {
        if (cancelled) return;
        setCatalogFreshness(null);
        setCatalogFreshnessError(toSocialAccountRequestError(error, "Failed to check catalog freshness"));
      } finally {
        if (!cancelled) {
          setCatalogFreshnessLoading(false);
        }
      }
    };

    void loadCatalogFreshness();
    return () => {
      cancelled = true;
    };
  }, [
    activeCatalogRun,
    checking,
    fetchAdminWithAuth,
    handle,
    hasAccess,
    latestCatalogRun?.run_id,
    latestCatalogRun?.status,
    platform,
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
      !supportsCatalog ||
      platform !== "instagram" ||
      summaryUninitialized ||
      !catalogCountsMismatch ||
      shouldDeferSecondaryCatalogReads ||
      catalogGapAnalysisRequestNonce <= 0
    ) {
      if (!catalogCountsMismatch || shouldDeferSecondaryCatalogReads) {
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
      !supportsCatalog ||
      platform !== "instagram" ||
      summaryUninitialized ||
      !catalogCountsMismatch ||
      shouldDeferSecondaryCatalogReads ||
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
    shouldDeferSecondaryCatalogReads,
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

  const displayedCatalogRunSummary = useMemo<SocialAccountCatalogRun | null>(() => {
    const runs = summary?.catalog_recent_runs ?? [];
    if (selectedCatalogRunId) {
      return runs.find((run) => run.run_id === selectedCatalogRunId) ?? null;
    }
    if (activeCatalogRunId) {
      return runs.find((run) => run.run_id === activeCatalogRunId) ?? null;
    }
    if (backgroundCatalogRunId) {
      return runs.find((run) => run.run_id === backgroundCatalogRunId) ?? null;
    }
    return null;
  }, [
    activeCatalogRunId,
    backgroundCatalogRunId,
    selectedCatalogRunId,
    summary?.catalog_recent_runs,
  ]);

  const displayedCatalogRunId = useMemo(() => {
    return (
      selectedCatalogRunId ||
      activeCatalogRunId ||
      backgroundCatalogRunId ||
      null
    );
  }, [activeCatalogRunId, backgroundCatalogRunId, selectedCatalogRunId]);

  const displayedCatalogRunStatus = useMemo(() => {
    const selectedRunId = displayedCatalogRunId?.trim() ?? "";
    const progressStatus =
      selectedRunId && catalogRunProgress?.run_id === selectedRunId ? catalogRunProgress.run_status : null;
    const summaryStatus =
      selectedRunId && displayedCatalogRunSummary?.run_id === selectedRunId ? displayedCatalogRunSummary.status : null;
    const candidates = [
      progressStatus,
      summaryStatus,
      selectedRunId && catalogProgressRunId === selectedRunId ? "queued" : null,
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

  const catalogActionsBlocked =
    runningCatalogAction !== null || activeCatalogRunBlocksActions || cancellableCatalogRunIsActive;

  const catalogPhaseLabel = useMemo(() => {
    const progressLabel = getCatalogPhaseLabel(catalogRunProgress);
    if (progressLabel) {
      return progressLabel;
    }
    if (String(catalogRunProgress?.operational_state || "").trim().toLowerCase() === "blocked_auth") {
      return "Instagram auth blocked";
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
  }, [catalogRunProgress, displayedCatalogRunStatus]);

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
    const repairStatus = String(catalogRunProgress?.repair_status || "").trim().toLowerCase();
    const resumeStage = String(catalogRunProgress?.resume_stage || "").trim().toLowerCase();
    const repairReason = String(catalogRunProgress?.repairable_reason || "").trim().replaceAll("_", " ");
    const repairCommand = String(catalogRunProgress?.repair_environment?.repair_command || "").trim();
    const canRepair = catalogRunProgress?.repair_action === "repair_instagram_auth";
    const resumeLabel =
      resumeStage === "posts" ? "Auth repaired, resuming from saved frontier." : "Auth repaired, restarting discovery.";
    return {
      canRepair,
      repairStatus,
      repairReason,
      repairCommand,
      detail:
        repairStatus === "running" ?
          "Repairing auth. A local headed Chrome window will open for confirmation."
        : repairStatus === "succeeded" || catalogRunProgress?.auto_resume_pending ?
          resumeLabel
        : canRepair ?
          "Instagram blocked this catalog run before history fetch could continue. A local headed Chrome window will open for confirmation."
        : "Instagram blocked this catalog run before history fetch could continue.",
    };
  }, [catalogRunProgress]);

  const catalogGapAnalysisPresentation = useMemo(() => {
    if (!catalogGapAnalysis) return null;
    const sampleIds = catalogGapAnalysis.sample_missing_source_ids.slice(0, 5).join(", ");
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
        tone: "text-red-700",
        text: formatCatalogDiagnosticErrorMessage("Freshness check", catalogFreshnessError),
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
  }, [catalogFreshness, catalogFreshnessError, catalogFreshnessLoading, catalogHasCountDrift]);

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

  const liveProfileSnapshot = useSharedPollingResource<{
    payload: SocialAccountProfileSnapshot;
    cacheStatus: string;
  }>({
    key: `social-account-profile-snapshot:${platform}:${handle}:${backgroundCatalogRunId ?? "none"}:${catalogProgressRequestNonce}`,
    shouldRun: !checking && Boolean(user) && hasAccess && supportsCatalog && Boolean(backgroundCatalogRunId),
    intervalMs: CATALOG_PROGRESS_POLL_INTERVAL_MS,
    fetchData: async (signal, request) => await fetchProfileSnapshot({ signal, forceRefresh: request?.forceRefresh }),
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
    if (payload.summary) {
      setSummary(payload.summary);
      setSummaryUninitialized(false);
      setSummaryError(null);
    }
    if (payload.catalog_run_progress) {
      setCatalogProgressSaturationActive(false);
      setCatalogRunProgress(payload.catalog_run_progress);
      setCatalogRunProgressError(null);
      setCatalogProgressLastSuccessAt(payload.generated_at ?? new Date().toISOString());
      setCatalogRunProgressLoading(false);
    }
  }, [liveProfileSnapshot.data]);

  useEffect(() => {
    if (!liveProfileSnapshot.error) return;
    if (isBackendSaturationError(liveProfileSnapshot.error)) {
      setCatalogProgressSaturationActive(true);
    } else {
      setCatalogProgressSaturationActive(false);
    }
    setCatalogRunProgressLoading(false);
    setCatalogRunProgressError(liveProfileSnapshot.error);
  }, [liveProfileSnapshot.error]);

  useEffect(() => {
    const runId = String(catalogRunProgress?.run_id || "").trim();
    const runStatus = String(catalogRunProgress?.run_status || "").trim().toLowerCase();
    if (catalogProgressSaturationActive) return;
    if (!runId || !TERMINAL_CATALOG_RUN_STATUSES.has(runStatus)) return;
    if (catalogTerminalSummaryRefreshRunIdRef.current === runId) return;
    catalogTerminalSummaryRefreshRunIdRef.current = runId;
    void refreshSummary().catch(() => {});
  }, [catalogProgressSaturationActive, catalogRunProgress?.run_id, catalogRunProgress?.run_status, refreshSummary]);

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
            hasFetchStageTelemetry ? 0 : Number(catalogProgressSummary.items ?? 0),
          );
    const matched = Number(payload.matched_posts ?? 0);
    const fallbackTotal = Number(summary?.live_total_posts ?? summary?.total_posts ?? 0);
    const total = Number(payload.total_posts ?? 0) || fallbackTotal;
    const roundedCoveragePct = total > 0 ? Math.round((completed / total) * 100) : catalogProgressSummary.pct;
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
      matched,
      total,
      pct: Math.max(0, Math.min(100, pct)),
      hasTotal: total > 0,
      hasCompleted: completed > 0,
    };
  }, [
    catalogProgressSummary.items,
    catalogProgressSummary.pct,
    catalogProgressSummary.total,
    catalogRunProgress?.post_progress,
    catalogRunProgress?.stages?.shared_account_discovery,
    catalogRunProgress?.stages?.shared_account_posts,
    catalogProgressMode,
    displayedCatalogRunStatus,
    summary?.live_total_posts,
    summary?.total_posts,
  ]);

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
    return `History discovery finished, but this run only checked ${formatInteger(catalogPostProgress.completed)} of ${formatInteger(catalogPostProgress.total)} posts. Review recent logs before starting the next backfill.`;
  }, [
    catalogPostProgress.completed,
    catalogPostProgress.hasTotal,
    catalogPostProgress.total,
    catalogProgressMode,
    catalogRunProgress?.completion_gap_reason,
    catalogRunProgress?.discovery?.completed_count,
    displayedCatalogRunStatus,
  ]);

  const catalogRunDiagnostics = catalogRunProgress?.run_diagnostics;

  const catalogRuntimeMessage = useMemo(() => {
    const executionBackend = String(catalogRunDiagnostics?.effective_execution_backend || "").trim();
    const declaredRunner = String(catalogRunDiagnostics?.declared_runner_strategy || "").trim();
    const effectiveRunner = String(catalogRunDiagnostics?.effective_runner_strategy || "").trim();
    const strategyMismatch = Boolean(catalogRunDiagnostics?.strategy_mismatch);
    const parts: string[] = [];
    if (executionBackend) {
      parts.push(`Executor ${executionBackend}`);
    }
    if (strategyMismatch && declaredRunner && effectiveRunner) {
      parts.push(`Strategy drift ${formatDiagnosticToken(declaredRunner)} -> ${formatDiagnosticToken(effectiveRunner)}`);
    } else if (effectiveRunner) {
      parts.push(`Strategy ${formatDiagnosticToken(effectiveRunner)}`);
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [
    catalogRunDiagnostics,
  ]);

  const catalogStopMessage = useMemo(() => {
    const frontierStopReason = String(catalogRunDiagnostics?.frontier_stop_reason || "").trim().toLowerCase();
    if (
      frontierStopReason === "catalog_oldest_stored_post_not_reached" &&
      catalogRunDiagnostics?.oldest_posted_at_seen &&
      catalogRunDiagnostics?.catalog_oldest_post_at
    ) {
      return `Runner stopped at ${formatDateTime(catalogRunDiagnostics.oldest_posted_at_seen)} even though the earliest saved catalog post is ${formatDateTime(catalogRunDiagnostics.catalog_oldest_post_at)}. This backfill did not reach the full history yet.`;
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
    catalogRunProgress?.cancel_reason,
    catalogRunProgress?.last_error_code,
    catalogRunProgress?.last_error_message,
    catalogRunDiagnostics,
  ]);

  const catalogScrapeCompletionMessage = useMemo(() => {
    if (!catalogRunProgress?.scrape_complete) return null;
    if (catalogRunProgress?.classify_incomplete) {
      return "Catalog fetch is complete. Saved catalog totals and hashtags are live while post classification finishes in the background.";
    }
    return "Catalog fetch is complete and the saved catalog totals shown above reflect the latest stored rows.";
  }, [catalogRunProgress?.classify_incomplete, catalogRunProgress?.scrape_complete]);

  const displayEngagement = useMemo(() => {
    if (supportsCatalog && Number(summary?.live_catalog_total_posts ?? 0) > 0) {
      return Number(summary?.live_catalog_total_engagement ?? 0);
    }
    return Number(summary?.total_engagement ?? 0);
  }, [summary?.live_catalog_total_engagement, summary?.live_catalog_total_posts, summary?.total_engagement, supportsCatalog]);

  const displayViews = useMemo(() => {
    if (supportsCatalog && Number(summary?.live_catalog_total_posts ?? 0) > 0) {
      return Number(summary?.live_catalog_total_views ?? 0);
    }
    return Number(summary?.total_views ?? 0);
  }, [summary?.live_catalog_total_posts, summary?.live_catalog_total_views, summary?.total_views, supportsCatalog]);

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

  const catalogHandleCards = useMemo((): CatalogRunProgressHandleCard[] => {
    const frontierMode =
      String(catalogRunProgress?.worker_runtime?.frontier_strategy || catalogRunProgress?.partition_strategy || "")
        .trim()
        .toLowerCase() === "newest_first_frontier";
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
  }, [catalogRunProgress?.frontier, catalogRunProgress?.partition_strategy, catalogRunProgress?.per_handle, catalogRunProgress?.worker_runtime?.frontier_strategy, platform]);

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
    async (force = false) => {
      if (!platformRequiresCookies || !user) return;
      setCookieHealthLoading(true);
      setCookieHealthError(null);
      try {
        const qs = force ? "?force=true" : "";
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/cookies/health${qs}`,
          { method: "GET" },
          { preferredUser: user },
        );
        if (!response.ok) throw new Error("Failed to check cookie health");
        const data = (await response.json()) as SocialProfileCookieHealth;
        setCookieHealth(data);
      } catch (error) {
        setCookieHealthError(error instanceof Error ? error.message : "Cookie health check failed");
      } finally {
        setCookieHealthLoading(false);
      }
    },
    [platformRequiresCookies, user, platform, handle, fetchAdminWithAuth],
  );

  useEffect(() => {
    if (platformRequiresCookies && user && !cookieHealth && !cookieHealthLoading) {
      void fetchCookieHealth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformRequiresCookies, user]);

  const handleCookieRefresh = async () => {
    if (!user) return;
    setCookieRefreshing(true);
    setCookieRefreshMessage("Opening browser… Log in to " + SOCIAL_ACCOUNT_PLATFORM_LABELS[platform] + " in the browser window.");
    try {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/cookies/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ headless: false, timeout_seconds: 180 }),
        },
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        healthy?: boolean;
        reason?: string;
        warning_message?: string;
        detail?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(data.detail?.message || data.reason || "Cookie refresh failed");
      }
      if (data.success) {
        setCookieRefreshMessage("Cookies refreshed successfully.");
        void fetchCookieHealth(true);
      } else {
        setCookieRefreshMessage(`Refresh completed but cookies may still be invalid: ${data.reason || "unknown"}`);
        void fetchCookieHealth(true);
      }
    } catch (error) {
      setCookieRefreshMessage(error instanceof Error ? error.message : "Cookie refresh failed");
    } finally {
      setCookieRefreshing(false);
    }
  };

  const runCatalogAction = async (
    action: "backfill" | "sync_recent" | "sync_newer",
    requestBody: CatalogBackfillRequest | CatalogSyncRecentRequest | CatalogSyncNewerRequest,
  ) => {
    if (!user) return;
    // Gate: block if cookies are explicitly unhealthy (don't block on unknown/error state)
    if (platformRequiresCookies && cookieHealth?.healthy === false) {
      setCatalogActionMessage(
        `Cannot start ${action === "backfill" ? "backfill" : action === "sync_newer" ? "sync newer" : "sync recent"}: ` +
          `${SOCIAL_ACCOUNT_PLATFORM_LABELS[platform]} cookies are expired. Please refresh cookies first.`,
      );
      return;
    }
    setRunningCatalogAction(action);
    setCatalogActionMessage(null);
    setCatalogFreshness(null);
    setCatalogFreshnessError(null);
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
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        run_id?: string;
        catalog_action?: string;
        catalog_action_scope?: string;
        detail?: { message?: string; run_id?: string; status?: string };
      };
      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            data.detail?.message ||
            `Failed to ${
              action === "backfill" ? "start backfill"
              : action === "sync_newer" ? "sync newer posts"
              : "sync recent catalog content"
            }`,
        );
      }
      const queuedRunId = String(data.run_id || "").trim() || null;
      setCatalogProgressRunId(queuedRunId);
      setCatalogRunProgress(null);
      setCatalogRunProgressError(null);
      setCatalogLogsExpanded(false);
      catalogTerminalSummaryRefreshRunIdRef.current = null;
      setCatalogActionMessage(
        action === "backfill"
          ? `Post backfill queued${queuedRunId ? ` (${queuedRunId.slice(0, 8)})` : ""}.`
          : action === "sync_newer"
          ? `Sync newer posts queued${queuedRunId ? ` (${queuedRunId.slice(0, 8)})` : ""}.`
          : `Recent sync queued${queuedRunId ? ` (${queuedRunId.slice(0, 8)})` : ""}.`,
      );
      await refreshProfileSnapshotNow({ runId: queuedRunId }).catch(() => {});
    } catch (error) {
      setCatalogActionMessage(
        error instanceof Error
          ? error.message
          : `Failed to ${
            action === "backfill" ? "start backfill"
            : action === "sync_newer" ? "sync newer posts"
            : "sync recent catalog content"
          }`,
      );
    } finally {
      setRunningCatalogAction(null);
    }
  };

  const runCatalogRepairAuth = async (runId: string, requestBody: CatalogRepairAuthRequest = {}) => {
    const normalizedRunId = runId.trim();
    if (!user || !normalizedRunId) return;
    setRunningCatalogAction("repair_auth");
    setCatalogActionMessage(null);
    try {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/runs/${encodeURIComponent(normalizedRunId)}/repair-auth`,
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
        repair_status?: string;
        resume_stage?: string | null;
      };
      if (!response.ok) {
        throw new Error(
          data.error || data.message || data.detail?.message || "Failed to repair Instagram auth for this catalog run",
        );
      }
      setCatalogActionMessage("Repairing auth… A local headed Chrome window will open for confirmation.");
      setCatalogRunProgress((current) =>
        current && current.run_id === normalizedRunId ?
          {
            ...current,
            operational_state: "blocked_auth",
            repair_action: "repair_instagram_auth",
            repair_status: (data.repair_status as SocialAccountCatalogRunProgressSnapshot["repair_status"]) || "running",
            resume_stage:
              (data.resume_stage as SocialAccountCatalogRunProgressSnapshot["resume_stage"]) || current.resume_stage,
          }
        : current,
      );
      await refreshProfileSnapshotNow({ runId: normalizedRunId }).catch(() => {});
    } catch (error) {
      setCatalogActionMessage(
        error instanceof Error ? error.message : "Failed to repair Instagram auth for this catalog run",
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
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel catalog run");
      }
      applyCancelledCatalogRunLocally(runId);
      await refreshProfileSnapshotNow({ runId }).catch(() => {});
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

  const dismissCatalogRun = async (runId: string) => {
    const normalizedRunId = runId.trim();
    if (!user || !normalizedRunId) return;
    setDismissingCatalogRunId(normalizedRunId);
    setCatalogActionMessage(null);
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
      if (catalogProgressRunId === normalizedRunId) {
        setCatalogProgressRunId(null);
      }
      if (catalogRunProgress?.run_id === normalizedRunId) {
        setCatalogRunProgress(null);
        setCatalogRunProgressError(null);
      }
      setCatalogProgressLastSuccessAt(null);
      setSummary((current) => {
        if (!current) return current;
        return {
          ...current,
          catalog_recent_runs: (current.catalog_recent_runs ?? []).filter((run) => run.run_id !== normalizedRunId),
        };
      });
      setCatalogActionMessage(`Dismissed run ${shortRunId(normalizedRunId)}.`);
      await refreshProfileSnapshotNow().catch(() => {});
    } catch (error) {
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
    ...buildAdminSectionBreadcrumb("Social Analytics", "/social"),
    { label: `${SOCIAL_ACCOUNT_PLATFORM_LABELS[platform]} @${handle}`, href: buildSocialAccountProfileUrl({ platform, handle }) },
  ];

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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-zinc-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                    Official Social Profile
                  </span>
                  <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                    All shows / all seasons
                  </span>
                </div>
                <h1 className="mt-3 text-3xl font-bold text-zinc-900">{headerTitle}</h1>
                <p className="mt-2 max-w-2xl text-sm text-zinc-500">
                  Cross-show account view for materialized posts, catalog backfills, hashtags, collaborators, and tags.
                </p>
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
                      <button
                        type="button"
                        onClick={() =>
                          void runCatalogAction("backfill", {
                            backfill_scope: "full_history",
                          })
                        }
                        disabled={catalogActionsBlocked}
                        className="inline-flex rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {runningCatalogAction === "backfill" ? "Queueing Backfill…" : "Backfill Posts"}
                      </button>
                      {platform === "instagram" ? (
                        <button
                          type="button"
                          title="Copy direct backfill command for terminal"
                          onClick={() => {
                            const cmd = `cd ~/Projects/TRR/TRR-Backend && source .venv/bin/activate && python3 scripts/socials/instagram/direct_catalog_backfill.py --account ${handle}`;
                            void navigator.clipboard.writeText(cmd);
                          }}
                          className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                            <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" />
                            <path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.44A1.5 1.5 0 0 0 8.378 6H4.5Z" />
                          </svg>
                        </button>
                      ) : null}
                      {platform !== "instagram" ? (
                        <button
                          type="button"
                          onClick={() =>
                            void runCatalogAction("sync_recent", {
                              lookback_days: 1,
                            })
                          }
                          disabled={catalogActionsBlocked}
                          className="inline-flex rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {runningCatalogAction === "sync_recent" ? "Queueing Recent Sync…" : "Sync Recent"}
                        </button>
                      ) : null}
                      {cancellableCatalogRunId && cancellableCatalogRunIsActive ? (
                        <button
                          type="button"
                          onClick={() => void cancelCatalogRun()}
                          disabled={runningCatalogAction !== null || cancellingCatalogRun}
                          className="inline-flex rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {cancellingCatalogRun ? "Cancelling Run…" : "Cancel Run"}
                        </button>
                      ) : null}
                      {cancellableCatalogRunId ? (
                        <span className="text-xs font-medium text-zinc-500">
                          {cancellableCatalogRunIsActive
                            ? `Run ${shortRunId(cancellableCatalogRunId)} is ${cancellableCatalogRunStatusLabel}. ${
                                catalogDispatchStatusMessage?.text
                                  ? `${catalogDispatchStatusMessage.text} `
                                  : ""
                              }Start buttons unlock after it finishes or you cancel it.`
                            : `Run ${shortRunId(cancellableCatalogRunId)} is scrape-complete. New backfills are unlocked while classification continues in the background.`}
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
                      ? "Backfill Posts scans the full catalog and updates saved posts. If a saved older frontier exists, Backfill Posts resumes it automatically before continuing full-history fetches. Run Gap Analysis before using targeted repairs like Sync Newer."
                      : "Backfill Posts runs the full-history catalog job. Sync Recent runs the same pipeline, limited to the last day."}
                  </p>
                ) : null}
                {catalogActionMessage ? <p className="mt-2 text-sm text-zinc-600">{catalogActionMessage}</p> : null}
                {/* Cookie preflight card for cookie-dependent platforms */}
                {supportsCatalog && platformRequiresCookies ? (
                  <div className="mt-3 flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                    {cookieHealthLoading ? (
                      <>
                        <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-zinc-400" />
                        <span className="text-xs text-zinc-500">Checking cookies…</span>
                      </>
                    ) : cookieHealthError ? (
                      <>
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
                        <span className="text-xs text-zinc-500">Cookie check failed</span>
                        <button
                          type="button"
                          onClick={() => void fetchCookieHealth(true)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          Retry
                        </button>
                      </>
                    ) : cookieHealth?.healthy === true ? (
                      <>
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <span className="text-xs text-zinc-600">
                          Cookies healthy
                          {cookieHealth.source_kind && cookieHealth.source_path
                            ? ` (${cookieHealth.source_path.split("/").pop()})`
                            : ""}
                        </span>
                      </>
                    ) : cookieHealth?.healthy === false ? (
                      <>
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
                        <span className="text-xs text-zinc-600">
                          Cookies expired{cookieHealth.reason ? ` — ${cookieHealth.reason}` : ""}
                        </span>
                        {cookieHealth.refresh_available ? (
                          <button
                            type="button"
                            onClick={() => void handleCookieRefresh()}
                            disabled={cookieRefreshing}
                            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {cookieRefreshing ? "Refreshing…" : "Refresh Cookies"}
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-400" title="Cookie refresh requires local dev server">
                            Refresh unavailable (requires local dev)
                          </span>
                        )}
                      </>
                    ) : null}
                    {cookieRefreshMessage ? (
                      <span className="text-xs text-zinc-500">{cookieRefreshMessage}</span>
                    ) : null}
                    {cookieHealth?.warning_message ? (
                      <span className="text-xs text-amber-600" title={cookieHealth.warning_message}>
                        ⚠ {cookieHealth.warning_code === "env_json_source_refresh_writes_file" ? "env var source" : "warning"}
                      </span>
                    ) : null}
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
                        {canRequestCatalogGapAnalysis && (!catalogGapAnalysis || catalogGapAnalysisError) ? (
                          <button
                            type="button"
                            onClick={() => requestCatalogGapAnalysis()}
                            disabled={catalogGapAnalysisLoading}
                            className="mt-3 inline-flex rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {catalogGapAnalysisLoading
                              ? "Analyzing Gap…"
                              : catalogGapAnalysisError
                                ? "Retry Gap Analysis"
                                : "Run Gap Analysis"}
                          </button>
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
                          <button
                            type="button"
                            onClick={() =>
                            void runCatalogAction("sync_newer", {
                              source_scope: activeCatalogSourceScope,
                            })
                          }
                            disabled={catalogActionsBlocked}
                            className="mt-3 inline-flex rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {runningCatalogAction === "sync_newer" ? "Queueing…" : "Sync Newer Now"}
                          </button>
                        ) : null}
                        {catalogGapAnalysis.recommended_action === "bounded_window_backfill" &&
                        catalogGapAnalysis.repair_window_start &&
                        catalogGapAnalysis.repair_window_end ? (
                          <button
                            type="button"
                            onClick={() =>
                              void runCatalogAction("backfill", {
                                backfill_scope: "bounded_window",
                                date_start: catalogGapAnalysis.repair_window_start,
                                date_end: catalogGapAnalysis.repair_window_end,
                              })
                            }
                            disabled={catalogActionsBlocked}
                            className="mt-3 inline-flex rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-900 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {runningCatalogAction === "backfill" ? "Queueing…" : "Repair Missing Window"}
                          </button>
                        ) : null}
                        {catalogGapAnalysis.recommended_action === "backfill_posts" ? (
                          <button
                            type="button"
                            onClick={() =>
                              void runCatalogAction("backfill", {
                                backfill_scope: "full_history",
                              })
                            }
                            disabled={catalogActionsBlocked}
                            className="mt-3 inline-flex rounded-lg border border-zinc-400 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {runningCatalogAction === "backfill" ? "Queueing…" : "Backfill Posts Now"}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className={`grid min-w-[220px] gap-3 ${supportsCatalog ? "grid-cols-3" : "grid-cols-2"}`}>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Posts</p>
                  {supportsCatalog ? (
                    <>
                      <p className="mt-2 text-2xl font-bold leading-tight text-zinc-900">
                        {formatInteger(displayCatalogTotalPosts)} / {formatInteger(displayTotalPosts)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">Cataloged / Profile total</p>
                    </>
                  ) : (
                    <p className="mt-2 text-2xl font-bold text-zinc-900">{formatInteger(displayTotalPosts)}</p>
                  )}
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Engagement</p>
                  <p className="mt-2 text-2xl font-bold text-zinc-900">{formatInteger(displayEngagement)}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Views</p>
                  <p className="mt-2 text-2xl font-bold text-zinc-900">{formatInteger(displayViews)}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Last Post</p>
                  <p className="mt-2 text-sm font-semibold text-zinc-900">{formatDateTime(displayLastPostAt)}</p>
                </div>
                {supportsCatalog ? (
                  <>
                    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Pending Review</p>
                      <p className="mt-2 text-2xl font-bold text-zinc-900">{formatInteger(summary?.catalog_pending_review_posts)}</p>
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            <nav className="mt-6 flex flex-wrap items-center gap-2" aria-label="Social account profile tabs">
              {visibleTabs.map((tab) => {
                const isActive = tab === activeTab;
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
                <button
                  type="button"
                  aria-label={postSearchExpanded ? "Close caption search" : "Open caption search"}
                  onClick={() => setPostSearchExpanded((current) => !current)}
                  className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${
                    postSearchExpanded
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                    <circle cx="8.5" cy="8.5" r="5.5" />
                    <path d="M12.5 12.5 17 17" strokeLinecap="round" />
                  </svg>
                  <span>{postSearchExpanded ? "Close Search" : "Search Posts"}</span>
                </button>
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
          {summaryLoading && !hasSummary ? <div className="text-sm text-zinc-500">Loading account summary…</div> : null}
          {summaryError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{summaryError}</div>
          ) : null}
          {summaryUninitialized ? (
            <section className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-900">
              <p className="font-semibold">No saved posts yet for @{handle}.</p>
              <p className="mt-1 text-sky-800">
                Use <span className="font-semibold">Backfill Posts</span> to load this account. If saved network-profile posts
                already include this handle as a collaborator, they will appear here automatically.
              </p>
            </section>
          ) : null}

          {hasSummary && supportsCatalog && displayedCatalogRunId ? (
            <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-zinc-900">Catalog Run Progress</h2>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getCatalogRunStatusTone(
                        displayedCatalogRunStatus,
                      )}`}
                    >
                      {displayedCatalogRunStatusLabel}
                    </span>
                    {(displayedCatalogRunStatus === "failed" || displayedCatalogRunStatus === "cancelled") &&
                      displayedCatalogRunId && (
                        <button
                          type="button"
                          onClick={() => void dismissCatalogRun(displayedCatalogRunId)}
                          disabled={dismissingCatalogRunId === displayedCatalogRunId}
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {dismissingCatalogRunId === displayedCatalogRunId ? "Dismissing…" : "Dismiss"}
                        </button>
                      )}
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">
                    Run {shortRunId(displayedCatalogRunId)} · {displayedCatalogRunStatusLabel}
                    {catalogRunProgress?.created_at ? ` · queued ${formatDateTime(catalogRunProgress.created_at)}` : ""}
                    {catalogProgressLastSuccessAt ? ` · last refresh ${formatDateTime(catalogProgressLastSuccessAt)}` : ""}
                  </p>
                  {catalogPhaseLabel ? <p className="mt-2 text-sm font-medium text-zinc-700">{catalogPhaseLabel}</p> : null}
                  {catalogRunProgressError ? (
                    <p className="mt-2 text-sm text-red-700">{catalogRunProgressError}</p>
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
                  {(catalogRunProgress?.alerts ?? []).length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {(catalogRunProgress?.alerts ?? []).map((alert) => (
                        <div
                          key={`${alert.code}-${alert.message}`}
                          className={`rounded-xl border px-3 py-2 text-sm ${getOperationalAlertTone(alert.severity)}`}
                        >
                          <p className="font-semibold">{formatOperationalAlertLabel(alert)}</p>
                          <p className="mt-1">{alert.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {catalogBlockedAuthPresentation ? (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-900">
                      <p className="font-semibold">Instagram Auth Blocked</p>
                      <p className="mt-1">{catalogBlockedAuthPresentation.detail}</p>
                      {catalogBlockedAuthPresentation.repairReason ? (
                        <p className="mt-2 text-xs text-red-800">
                          Repair reason: {catalogBlockedAuthPresentation.repairReason}
                        </p>
                      ) : null}
                      {catalogBlockedAuthPresentation.canRepair ? (
                        <button
                          type="button"
                          onClick={() => void runCatalogRepairAuth(displayedCatalogRunId)}
                          disabled={catalogActionsBlocked}
                          className="mt-3 inline-flex rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {runningCatalogAction === "repair_auth" ? "Repairing auth…" : "Repair Instagram Auth"}
                        </button>
                      ) : catalogBlockedAuthPresentation.repairCommand ? (
                        <p className="mt-3 text-xs text-red-800">
                          Run <code>{catalogBlockedAuthPresentation.repairCommand}</code> from the local TRR-Backend host.
                        </p>
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
                </div>
                <div className="min-w-[190px] rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Overall Progress</p>
                  <p className="mt-2 text-3xl font-bold text-zinc-900">
                    {catalogPostProgress.pct}%
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {catalogProgressMode === "bounded"
                      ? catalogPostProgress.hasCompleted
                        ? `${formatInteger(catalogPostProgress.completed)} posts checked`
                        : `${formatInteger(catalogProgressSummary.finished)} / ${formatInteger(catalogProgressSummary.total)} jobs`
                      : catalogPostProgress.hasTotal
                      ? `${formatInteger(catalogPostProgress.completed)} / ${formatInteger(catalogPostProgress.total)} posts checked`
                      : catalogPostProgress.hasCompleted
                        ? `${formatInteger(catalogPostProgress.completed)} posts checked`
                        : `${formatInteger(catalogProgressSummary.finished)} / ${formatInteger(catalogProgressSummary.total)} jobs`}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {catalogPostProgress.hasTotal || catalogPostProgress.hasCompleted
                      ? `${formatInteger(catalogPostProgress.matched)} matched`
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

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    displayedCatalogRunStatus === "failed"
                      ? "bg-red-500"
                      : displayedCatalogRunStatus === "cancelled"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.max(catalogPostProgress.pct, 2)}%` }}
                />
              </div>

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
              ) : !catalogRunProgressLoading ? (
                <p className="mt-4 text-sm text-zinc-500">Waiting for the job to report stage-level progress…</p>
              ) : null}

              {catalogRunProgress?.recovery ? (
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
                  <button
                    type="button"
                    onClick={() => setCatalogLogsExpanded((current) => !current)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900">Recent Logs</h3>
                      <p className="text-xs text-zinc-500">Latest worker events for this account run</p>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      {catalogLogsExpanded ? "Hide" : "Show"}
                    </span>
                  </button>
                  {catalogLogsExpanded ? (
                    <div className="mt-3 space-y-2">
                      {catalogLogs.map((entry) => (
                        <div key={entry.id} className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                            {formatRunStageLabel(entry.stage, {
                              frontierMode,
                              singleRunnerFallback: singleRunnerFallbackMode,
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
            </section>
          ) : hasSummary && supportsCatalog ? (
            <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">Catalog Run Progress</h2>
                  <p className="mt-2 text-sm text-zinc-600">No active catalog run. Ready to start the next backfill.</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Use Recent Catalog Runs to inspect or dismiss older failed runs without letting them own this page.
                  </p>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                  Ready
                </span>
              </div>
            </section>
          ) : null}

          {activeTab === "socialblade" ? (
            <SocialGrowthSection
              platform={platform as Extract<SocialPlatformSlug, "instagram" | "facebook" | "youtube">}
              handle={handle}
            />
          ) : null}

          {hasSummary && activeTab === "stats" ? (
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-zinc-900">Distribution</h2>
                <div className="mt-4 grid gap-6 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Shows</p>
                    <div className="mt-3 space-y-2">
                      {(summary?.per_show_counts ?? []).length === 0 ? (
                        <p className="text-sm text-zinc-500">No show assignments yet.</p>
                      ) : (
                        (summary?.per_show_counts ?? []).map((item) => (
                          <div key={item.show_id ?? item.show_name} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                            <p className="font-semibold text-zinc-900">{item.show_name ?? "Unassigned show"}</p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {formatInteger(item.post_count)} posts · {formatInteger(item.engagement)} engagement
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Seasons</p>
                    <div className="mt-3 space-y-2">
                      {(summary?.per_season_counts ?? []).length === 0 ? (
                        <p className="text-sm text-zinc-500">No season assignments yet.</p>
                      ) : (
                        (summary?.per_season_counts ?? []).map((item) => (
                          <div
                            key={item.season_id ?? `${item.show_id}-${item.season_number}`}
                            className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3"
                          >
                            <p className="font-semibold text-zinc-900">
                              {item.show_name ?? "Unknown show"} · {formatSeasonLabel(item.season_number)}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {formatInteger(item.post_count)} posts · {formatInteger(item.engagement)} engagement
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                {supportsCatalog ? (
                  <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-semibold text-zinc-900">Catalog Status</h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Assigned</p>
                        <p className="mt-2 text-xl font-bold text-zinc-900">{formatInteger(summary?.catalog_assigned_posts)}</p>
                      </div>
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Unassigned</p>
                        <p className="mt-2 text-xl font-bold text-zinc-900">{formatInteger(summary?.catalog_unassigned_posts)}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-zinc-500">
                      Last catalog run {formatDateTime(summary?.last_catalog_run_at)} · {summary?.last_catalog_run_status ?? "Never run"}
                    </p>
                  </div>
                ) : null}

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
                            {String(item.source_scope ?? "bravo")}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Scrape {String(item.last_scrape_status ?? "Not run")} · Last scrape {formatDateTime(String(item.last_scrape_at ?? ""))}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {hasSummary && activeTab === "catalog" ? (
            supportsCatalog ? (
              <div className="space-y-6">
                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-900">Catalog</h2>
                      <p className="text-sm text-zinc-500">
                        Lightweight shared-account history staged for assignment before show-level hydration.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(["all", "assigned", "needs_review", "unassigned", "ambiguous"] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setCatalogFilter(status)}
                          className={`rounded-full border px-3 py-2 text-sm font-semibold ${
                            catalogFilter === status
                              ? "border-zinc-900 bg-zinc-900 text-white"
                              : "border-zinc-200 bg-white text-zinc-700"
                          }`}
                        >
                          {status === "all" ? "All" : status.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                  {catalogPostsLoading ? <p className="mt-4 text-sm text-zinc-500">Loading catalog posts…</p> : null}
                  {catalogPostsError ? <p className="mt-4 text-sm text-red-700">{catalogPostsError}</p> : null}
                  {!catalogPostsLoading && !catalogPostsError ? (
                    <>
                      <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full divide-y divide-zinc-200 text-sm">
                          <thead>
                            <tr className="text-left text-xs uppercase tracking-[0.14em] text-zinc-500">
                              <th className="pb-3 pr-4">Post</th>
                              <th className="pb-3 pr-4">Status</th>
                              <th className="pb-3 pr-4">Assigned</th>
                              <th className="pb-3">Published</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {(catalogPosts?.items ?? []).length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-6 text-sm text-zinc-500">
                                  No catalog posts found for this filter.
                                </td>
                              </tr>
                            ) : (
                              (catalogPosts?.items ?? []).map((item) => (
                                <tr key={item.id}>
                                  <td className="py-4 pr-4 align-top">
                                    <div className="max-w-xl">
                                      <p className="font-semibold text-zinc-900">{item.title || item.excerpt || "Untitled post"}</p>
                                      {item.url ? (
                                        <a
                                          href={item.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="mt-1 inline-flex text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                          Open post
                                        </a>
                                      ) : null}
                                      {item.content ? <p className="mt-2 text-xs leading-5 text-zinc-600">{item.content}</p> : null}
                                    </div>
                                  </td>
                                  <td className="py-4 pr-4 align-top">
                                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-700">
                                      {String(item.assignment_status || "unassigned").replace("_", " ")}
                                    </span>
                                  </td>
                                  <td className="py-4 pr-4 align-top text-zinc-700">
                                    {item.show_name ? `${item.show_name} · ${formatSeasonLabel(item.season_number)}` : "Not assigned"}
                                  </td>
                                  <td className="py-4 align-top text-xs text-zinc-500">{formatDateTime(item.posted_at)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setCatalogPage((current) => Math.max(1, current - 1))}
                          disabled={catalogPage <= 1 || catalogPostsLoading}
                          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <div className="text-sm text-zinc-500">
                          Page {catalogPosts?.pagination.page ?? catalogPage} of {catalogPosts?.pagination.total_pages ?? 1}
                        </div>
                        <button
                          type="button"
                          onClick={() => setCatalogPage((current) => current + 1)}
                          disabled={Boolean(catalogPosts && catalogPage >= catalogPosts.pagination.total_pages) || catalogPostsLoading}
                          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </>
                  ) : null}
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-zinc-900">Recent Catalog Runs</h2>
                  <div className="mt-4 space-y-2">
                    {(summary?.catalog_recent_runs ?? []).length === 0 ? (
                      <p className="text-sm text-zinc-500">No catalog runs recorded yet.</p>
                    ) : (
                      (summary?.catalog_recent_runs ?? []).map((run) => (
                        <div key={run.job_id || run.run_id} className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getCatalogRunStatusTone(
                                    run.status,
                                  )}`}
                                >
                                  Status {formatRunStatusLabel(run.status)}
                                </span>
                                <span className="text-xs font-semibold text-zinc-500">Run {shortRunId(run.run_id)}</span>
                              </div>
                              <p className="mt-2 text-xs text-zinc-500">
                                Queued {formatDateTime(run.created_at)}
                                {run.started_at ? ` · started ${formatDateTime(run.started_at)}` : ""}
                                {run.completed_at ? ` · finished ${formatDateTime(run.completed_at)}` : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {(String(run.status || "").trim().toLowerCase() === "failed" ||
                                String(run.status || "").trim().toLowerCase() === "cancelled") && (
                                <button
                                  type="button"
                                  onClick={() => void dismissCatalogRun(run.run_id)}
                                  disabled={dismissingCatalogRunId === run.run_id}
                                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {dismissingCatalogRunId === run.run_id ? "Dismissing…" : "Dismiss"}
                                </button>
                              )}
                              <button
                                type="button"
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
                                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                          {run.error_message ? <p className="mt-2 text-xs text-red-700">{run.error_message}</p> : null}
                        </div>
                      ))
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

          {hasSummary && activeTab === "posts" ? (
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">Posts</h2>
                  <p className="text-sm text-zinc-500">
                    Every post touching @{handle}, including owned posts, collaborator matches, and catalog-only history.
                  </p>
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
                          <th className="pb-3">Published</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {(posts?.items ?? []).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-sm text-zinc-500">
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
                              <td className="py-4 align-top text-xs text-zinc-500">{formatDateTime(item.posted_at)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={page <= 1 || postsLoading}
                      className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((current) => current + 1)}
                      disabled={Boolean(posts && page >= posts.pagination.total_pages) || postsLoading}
                      className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : null}
            </section>
          ) : null}

          {hasSummary && activeTab === "hashtags" ? (
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
                              <button
                                type="button"
                                onClick={() => addHashtagAssignmentRow(item.hashtag)}
                                disabled={showOptions.length === 0}
                                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Add Assignment
                              </button>
                              <button
                                type="button"
                                onClick={() => void saveHashtagAssignments(item.hashtag)}
                                disabled={savingHashtag === item.hashtag}
                                className="rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {savingHashtag === item.hashtag ? "Saving…" : "Save"}
                              </button>
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
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateHashtagAssignments(
                                            item.hashtag,
                                            assignments.filter((_, entryIndex) => entryIndex !== index),
                                          )
                                        }
                                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
                                      >
                                        Remove
                                      </button>
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
                                  <button
                                    type="button"
                                    disabled={resolvingReviewItemId === item.id || !canResolve}
                                    onClick={() =>
                                      void resolveReviewItem(item.id, {
                                        resolution_action: draft.resolution_action,
                                        show_id:
                                          draft.resolution_action === "mark_non_show" ? undefined : draft.show_id || undefined,
                                      })
                                    }
                                    className="rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {resolvingReviewItemId === item.id ? "Saving…" : "Resolve"}
                                  </button>
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

          {hasSummary && activeTab === "collaborators-tags" ? (
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
        </main>
      </div>
    </ClientOnly>
  );
}
