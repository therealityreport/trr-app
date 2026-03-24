"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import SocialAccountProfileHashtagTimelineChart from "@/components/admin/SocialAccountProfileHashtagTimelineChart";
import {
  type CatalogBackfillRequest,
  type CatalogReviewResolveRequest,
  type CatalogSyncRecentRequest,
  type SocialAccountCatalogPost,
  type SocialAccountCatalogReviewItem,
  type SocialAccountCatalogRun,
  type SocialAccountCatalogRunProgressHandle,
  type SocialAccountCatalogRunProgressLogEntry,
  type SocialAccountCatalogRunProgressSnapshot,
  type SocialAccountCatalogRunProgressStage,
  type SocialAccountProfileHashtag,
  type SocialAccountProfileHashtagAssignment,
  type SocialAccountProfileHashtagTimeline,
  type SocialAccountProfilePost,
  type SocialAccountProfileSummary,
  type SocialAccountProfileTab,
  type SocialPlatformSlug,
  type SocialAccountProfileCollaboratorTagAggregate,
  SOCIAL_ACCOUNT_CATALOG_ENABLED_PLATFORMS,
  SOCIAL_ACCOUNT_PLATFORM_LABELS,
  SOCIAL_ACCOUNT_PROFILE_TAB_LABELS,
} from "@/lib/admin/social-account-profile";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { buildSocialAccountProfileUrl } from "@/lib/admin/show-admin-routes";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
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

type SeasonOption = {
  season_id: string;
  season_number: number | null;
};

type ReviewResolutionDraft = {
  resolution_action: CatalogReviewResolveRequest["resolution_action"];
  show_id: string;
  season_id: string;
};

type CollaboratorsTagsResponse = {
  collaborators: SocialAccountProfileCollaboratorTagAggregate[];
  tags: SocialAccountProfileCollaboratorTagAggregate[];
  mentions: SocialAccountProfileCollaboratorTagAggregate[];
};

type CatalogRunProgressResponse = SocialAccountCatalogRunProgressSnapshot & {
  error?: string;
};

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

const INTEGER_FORMATTER = new Intl.NumberFormat("en-US");
const ACTIVE_CATALOG_RUN_STATUSES = new Set(["queued", "pending", "retrying", "running", "cancelling"]);
const TERMINAL_CATALOG_RUN_STATUSES = new Set(["completed", "failed", "cancelled"]);
const CATALOG_PROGRESS_POLL_INTERVAL_MS = 5_000;
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

const formatSeasonLabel = (seasonNumber?: number | null): string => {
  return seasonNumber ? `Season ${seasonNumber}` : "All seasons";
};

const formatRunStatusLabel = (value?: string | null): string => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "Unknown";
  return normalized
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
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
  const modalPendingJobs = Number(progress?.dispatch_health?.modal_pending_jobs ?? 0);
  const modalRunningUnclaimedJobs = Number(progress?.dispatch_health?.modal_running_unclaimed_jobs ?? 0);
  const retryingDispatchJobs = Number(progress?.dispatch_health?.retrying_dispatch_jobs ?? 0);
  const staleDispatchFailedJobs = Number(progress?.dispatch_health?.stale_dispatch_failed_jobs ?? 0);
  const runStatus = normalizeCatalogRunStatus(progress?.run_status);
  if (staleDispatchFailedJobs > 0) {
    return "Remote dispatch failed";
  }
  if (retryingDispatchJobs > 0) {
    return "Retrying remote dispatch";
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
  if (progress?.scrape_complete) {
    return progress?.classify_incomplete ? "Catalog fetch complete" : "Catalog fetch complete";
  }
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

const getCatalogDispatchStatusMessage = (progress?: SocialAccountCatalogRunProgressSnapshot | null): {
  tone: "amber" | "red";
  text: string;
} | null => {
  const queuedUnclaimedJobs = Number(progress?.dispatch_health?.queued_unclaimed_jobs ?? 0);
  const modalPendingJobs = Number(progress?.dispatch_health?.modal_pending_jobs ?? 0);
  const modalRunningUnclaimedJobs = Number(progress?.dispatch_health?.modal_running_unclaimed_jobs ?? 0);
  const retryingDispatchJobs = Number(progress?.dispatch_health?.retrying_dispatch_jobs ?? 0);
  const staleDispatchFailedJobs = Number(progress?.dispatch_health?.stale_dispatch_failed_jobs ?? 0);
  const maxRetries = Number(progress?.dispatch_health?.max_stale_dispatch_retries ?? 0);
  const latestDispatchRequestedAt = progress?.dispatch_health?.latest_dispatch_requested_at;
  const remoteInvocationCheckedAt = progress?.dispatch_health?.remote_invocation_checked_at;
  if (staleDispatchFailedJobs > 0) {
    return {
      tone: "red",
      text: `${formatInteger(staleDispatchFailedJobs)} queued job${staleDispatchFailedJobs === 1 ? "" : "s"} exhausted ${
        maxRetries > 0 ? formatInteger(maxRetries) : "the allowed"
      } remote dispatch retr${maxRetries === 1 ? "y" : "ies"} before any Modal worker claimed them. Cancel this run before retrying.`,
    };
  }
  if (retryingDispatchJobs > 0) {
    return {
      tone: "amber",
      text: `${formatInteger(retryingDispatchJobs)} job${retryingDispatchJobs === 1 ? "" : "s"} ${
        retryingDispatchJobs === 1 ? "is" : "are"
      } retrying remote dispatch after an unclaimed Modal lease expired.`,
    };
  }
  if (normalizeCatalogRunStatus(progress?.run_status) === "queued" && modalPendingJobs > 0) {
    return {
      tone: "amber",
      text: `${formatInteger(modalPendingJobs)} queued job${modalPendingJobs === 1 ? "" : "s"} ${
        modalPendingJobs === 1 ? "is" : "are"
      } already dispatched to Modal and waiting for capacity${
        remoteInvocationCheckedAt ? ` as of ${formatDateTime(remoteInvocationCheckedAt)}` : ""
      }.`,
    };
  }
  if (normalizeCatalogRunStatus(progress?.run_status) === "queued" && modalRunningUnclaimedJobs > 0) {
    return {
      tone: "amber",
      text: `${formatInteger(modalRunningUnclaimedJobs)} queued job${modalRunningUnclaimedJobs === 1 ? "" : "s"} ${
        modalRunningUnclaimedJobs === 1 ? "is" : "are"
      } already running in Modal and waiting to claim the database job${
        remoteInvocationCheckedAt ? ` as of ${formatDateTime(remoteInvocationCheckedAt)}` : ""
      }.`,
    };
  }
  if (normalizeCatalogRunStatus(progress?.run_status) === "queued" && queuedUnclaimedJobs > 0) {
    return {
      tone: "amber",
      text: `${formatInteger(queuedUnclaimedJobs)} queued job${queuedUnclaimedJobs === 1 ? "" : "s"} ${
        queuedUnclaimedJobs === 1 ? "is" : "are"
      } waiting for a Modal worker claim${latestDispatchRequestedAt ? ` since ${formatDateTime(latestDispatchRequestedAt)}` : ""}.`,
    };
  }
  return null;
};

export default function SocialAccountProfilePage({ platform, handle, activeTab }: Props) {
  const { user, checking, hasAccess } = useAdminGuard();
  const [summary, setSummary] = useState<SocialAccountProfileSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

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
  const [runningCatalogAction, setRunningCatalogAction] = useState<"backfill" | "sync_recent" | null>(null);
  const [reviewQueue, setReviewQueue] = useState<SocialAccountCatalogReviewItem[]>([]);
  const [reviewQueueLoading, setReviewQueueLoading] = useState(false);
  const [reviewQueueError, setReviewQueueError] = useState<string | null>(null);
  const [resolvingReviewItemId, setResolvingReviewItemId] = useState<string | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, ReviewResolutionDraft>>({});
  const [reviewSeasonOptionsByShow, setReviewSeasonOptionsByShow] = useState<Record<string, SeasonOption[]>>({});
  const [reviewSeasonLoadingByShow, setReviewSeasonLoadingByShow] = useState<Record<string, boolean>>({});

  const [hashtags, setHashtags] = useState<SocialAccountProfileHashtag[]>([]);
  const [hashtagsLoading, setHashtagsLoading] = useState(false);
  const [hashtagsError, setHashtagsError] = useState<string | null>(null);
  const [savingHashtag, setSavingHashtag] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [draftAssignments, setDraftAssignments] = useState<Record<string, SocialAccountProfileHashtagAssignment[]>>({});
  const [hashtagTimeline, setHashtagTimeline] = useState<SocialAccountProfileHashtagTimeline | null>(null);
  const [hashtagTimelineLoading, setHashtagTimelineLoading] = useState(false);
  const [hashtagTimelineError, setHashtagTimelineError] = useState<string | null>(null);

  const [collaboratorsTags, setCollaboratorsTags] = useState<CollaboratorsTagsResponse | null>(null);
  const [collaboratorsLoading, setCollaboratorsLoading] = useState(false);
  const [collaboratorsError, setCollaboratorsError] = useState<string | null>(null);
  const [catalogProgressRunId, setCatalogProgressRunId] = useState<string | null>(null);
  const [catalogRunProgress, setCatalogRunProgress] = useState<SocialAccountCatalogRunProgressSnapshot | null>(null);
  const [catalogRunProgressError, setCatalogRunProgressError] = useState<string | null>(null);
  const [catalogRunProgressLoading, setCatalogRunProgressLoading] = useState(false);
  const [cancellingCatalogRun, setCancellingCatalogRun] = useState(false);
  const [dismissingCatalogRunId, setDismissingCatalogRunId] = useState<string | null>(null);
  const [catalogProgressLastSuccessAt, setCatalogProgressLastSuccessAt] = useState<string | null>(null);
  const [catalogLogsExpanded, setCatalogLogsExpanded] = useState(false);
  const catalogTerminalSummaryRefreshRunIdRef = useRef<string | null>(null);
  const supportsCatalog = SOCIAL_ACCOUNT_CATALOG_ENABLED_PLATFORMS.includes(platform);
  const hasSummary = summary !== null;

  useEffect(() => {
    setPage(1);
    setCatalogPage(1);
    setSummary(null);
    setSummaryLoading(false);
    setSummaryError(null);
    setCatalogCardPreview(null);
    setReviewDrafts({});
    setReviewSeasonOptionsByShow({});
    setReviewSeasonLoadingByShow({});
    setCatalogProgressRunId(null);
    setCatalogRunProgress(null);
    setCatalogRunProgressError(null);
    setCatalogRunProgressLoading(false);
    setCatalogProgressLastSuccessAt(null);
    setCatalogLogsExpanded(false);
    catalogTerminalSummaryRefreshRunIdRef.current = null;
    setHashtagTimeline(null);
    setHashtagTimelineError(null);
    setHashtagTimelineLoading(false);
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
    const response = await fetchAdminWithAuth(
      `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/summary`,
      undefined,
      { preferredUser: user },
    );
    const data = (await response.json().catch(() => ({}))) as SocialAccountProfileSummary & { error?: string };
    if (!response.ok) {
      throw new Error(data.error || "Failed to load social account profile summary");
    }
    setSummary(data);
    setSummaryError(null);
  }, [handle, platform, user]);

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
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/summary`,
          undefined,
          { preferredUser: user },
        );
        const data = (await response.json().catch(() => ({}))) as SocialAccountProfileSummary & { error?: string };
        if (response.ok) {
          setSummary(data);
          setSummaryError(null);
          const matchingRun = (data.catalog_recent_runs ?? []).find((run) => run.run_id === normalizedRunId);
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
    [applyCancelledCatalogRunLocally, handle, platform, user],
  );

  const refreshHashtags = useCallback(async () => {
    if (!user) return;
    const response = await fetchAdminWithAuth(
      `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/hashtags`,
      undefined,
      { preferredUser: user },
    );
    const data = (await response.json().catch(() => ({}))) as HashtagsResponse & { error?: string };
    if (!response.ok) {
      throw new Error(data.error || "Failed to load social account profile hashtags");
    }
    setHashtags(data.items ?? []);
    setDraftAssignments(
      Object.fromEntries(
        (data.items ?? []).map((item) => [item.hashtag, item.assignments?.map((assignment) => ({ ...assignment })) ?? []]),
      ),
    );
  }, [handle, platform, user]);

  const refreshHashtagTimeline = useCallback(async () => {
    if (!user || platform !== "instagram") return;
    const response = await fetchAdminWithAuth(
      `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/hashtags/timeline`,
      undefined,
      { preferredUser: user },
    );
    const data = (await response.json().catch(() => ({}))) as HashtagTimelineResponse;
    if (!response.ok) {
      throw new Error(data.error || "Failed to load social account hashtag timeline");
    }
    setHashtagTimeline(data);
  }, [handle, platform, user]);

  useEffect(() => {
    if (checking || !user || !hasAccess) return;
    let cancelled = false;

    const loadSummary = async () => {
      setSummaryLoading(true);
      setSummaryError(null);
      try {
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/summary`,
          undefined,
          { preferredUser: user },
        );
        const data = (await response.json().catch(() => ({}))) as SocialAccountProfileSummary & { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Failed to load social account profile summary");
        }
        if (cancelled) return;
        setSummary(data);
        setSummaryError(null);
      } catch (error) {
        if (cancelled) return;
        setSummaryError(error instanceof Error ? error.message : "Failed to load social account profile summary");
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    };

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, [checking, handle, hasAccess, platform, user]);

  useEffect(() => {
    if (checking || !user || !hasAccess || !supportsCatalog) return;
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
    handle,
    hasAccess,
    platform,
    summary?.catalog_recent_runs,
    summary?.catalog_total_posts,
    summary?.live_catalog_total_posts,
    supportsCatalog,
    user,
  ]);

  useEffect(() => {
    if (checking || !user || !hasAccess || activeTab !== "posts") return;
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
  }, [activeTab, checking, handle, hasAccess, page, platform, user]);

  useEffect(() => {
    if (checking || !user || !hasAccess || activeTab !== "catalog" || !supportsCatalog) return;
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
  }, [activeTab, catalogFilter, catalogPage, checking, handle, hasAccess, platform, supportsCatalog, user]);

  useEffect(() => {
    if (checking || !user || !hasAccess || activeTab !== "hashtags") return;
    let cancelled = false;

    const loadHashtags = async () => {
      setHashtagsLoading(true);
      setHashtagsError(null);
      try {
        await refreshHashtags();
        if (cancelled) return;
      } catch (error) {
        if (cancelled) return;
        setHashtagsError(error instanceof Error ? error.message : "Failed to load social account profile hashtags");
      } finally {
        if (!cancelled) setHashtagsLoading(false);
      }
    };

    void loadHashtags();
    return () => {
      cancelled = true;
    };
  }, [activeTab, checking, hasAccess, refreshHashtags, user]);

  useEffect(() => {
    if (checking || !user || !hasAccess || activeTab !== "hashtags" || platform !== "instagram") {
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
  }, [activeTab, checking, hasAccess, platform, refreshHashtagTimeline, user]);

  useEffect(() => {
    if (checking || !user || !hasAccess || !supportsCatalog || (activeTab !== "hashtags" && activeTab !== "catalog")) {
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
  }, [activeTab, checking, handle, hasAccess, platform, supportsCatalog, user]);

  useEffect(() => {
    if (checking || !user || !hasAccess || activeTab !== "collaborators-tags") return;
    let cancelled = false;

    const loadCollaboratorsTags = async () => {
      setCollaboratorsLoading(true);
      setCollaboratorsError(null);
      try {
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/collaborators-tags`,
          undefined,
          { preferredUser: user },
        );
        const data = (await response.json().catch(() => ({}))) as CollaboratorsTagsResponse & { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Failed to load social account profile collaborators and tags");
        }
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
  }, [activeTab, checking, handle, hasAccess, platform, user]);

  const activeCatalogRun = useMemo<SocialAccountCatalogRun | null>(() => {
    const runs = summary?.catalog_recent_runs ?? [];
    return runs.find((run) => ACTIVE_CATALOG_RUN_STATUSES.has(String(run.status || "").trim().toLowerCase())) ?? null;
  }, [summary?.catalog_recent_runs]);

  const latestCatalogRun = useMemo<SocialAccountCatalogRun | null>(() => {
    const runs = summary?.catalog_recent_runs ?? [];
    return runs[0] ?? null;
  }, [summary?.catalog_recent_runs]);

  const trimmedPostSearchQuery = useMemo(() => postSearchQuery.trim(), [postSearchQuery]);

  useEffect(() => {
    if (checking || !user || !hasAccess || !postSearchExpanded) {
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
  }, [checking, handle, hasAccess, platform, postSearchExpanded, trimmedPostSearchQuery, user]);

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

  const backgroundCatalogRunId = useMemo(() => {
    return selectedCatalogRunId || activeCatalogRunId || latestCatalogRunId || null;
  }, [activeCatalogRunId, latestCatalogRunId, selectedCatalogRunId]);

  const backgroundCatalogRunStatus = useMemo(() => {
    if (!backgroundCatalogRunId || catalogRunProgress?.run_id !== backgroundCatalogRunId) return "";
    return String(catalogRunProgress?.run_status || "").trim().toLowerCase();
  }, [backgroundCatalogRunId, catalogRunProgress?.run_id, catalogRunProgress?.run_status]);

  const backgroundCatalogRunIsActive = useMemo(() => {
    return ACTIVE_CATALOG_RUN_STATUSES.has(backgroundCatalogRunStatus);
  }, [backgroundCatalogRunStatus]);

  const displayedCatalogRunSummary = useMemo<SocialAccountCatalogRun | null>(() => {
    const runs = summary?.catalog_recent_runs ?? [];
    if (selectedCatalogRunId) {
      return runs.find((run) => run.run_id === selectedCatalogRunId) ?? null;
    }
    if (activeCatalogRunId) {
      return runs.find((run) => run.run_id === activeCatalogRunId) ?? null;
    }
    if (backgroundCatalogRunIsActive && backgroundCatalogRunId) {
      return runs.find((run) => run.run_id === backgroundCatalogRunId) ?? null;
    }
    return null;
  }, [
    activeCatalogRunId,
    backgroundCatalogRunId,
    backgroundCatalogRunIsActive,
    selectedCatalogRunId,
    summary?.catalog_recent_runs,
  ]);

  const displayedCatalogRunId = useMemo(() => {
    return (
      selectedCatalogRunId ||
      activeCatalogRunId ||
      (backgroundCatalogRunIsActive ? backgroundCatalogRunId : null) ||
      null
    );
  }, [activeCatalogRunId, backgroundCatalogRunId, backgroundCatalogRunIsActive, selectedCatalogRunId]);

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

  const cancellableCatalogRunIsActive = useMemo(() => {
    return Boolean(cancellableCatalogRunId) && ACTIVE_CATALOG_RUN_STATUSES.has(cancellableCatalogRunStatus || "");
  }, [cancellableCatalogRunId, cancellableCatalogRunStatus]);

  const catalogActionsBlocked =
    runningCatalogAction !== null || activeCatalogRunBlocksActions || cancellableCatalogRunIsActive;

  const catalogPhaseLabel = useMemo(() => {
    return getCatalogPhaseLabel(catalogRunProgress);
  }, [catalogRunProgress]);

  const catalogDispatchStatusMessage = useMemo(() => {
    return getCatalogDispatchStatusMessage(catalogRunProgress);
  }, [catalogRunProgress]);

  useEffect(() => {
    if (checking || !user || !hasAccess || !supportsCatalog) return;
    if (!backgroundCatalogRunId) return;

    let cancelled = false;
    let timeoutId: number | null = null;

    const loadProgress = async () => {
      if (cancelled) return;
      setCatalogRunProgressLoading(true);
      try {
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/runs/${encodeURIComponent(backgroundCatalogRunId)}/progress?recent_log_limit=25`,
          undefined,
          { preferredUser: user },
        );
        const data = (await response.json().catch(() => ({}))) as CatalogRunProgressResponse;
        if (!response.ok) {
          throw new Error(data.error || "Failed to load social account catalog run progress");
        }
        if (cancelled) return;
        setCatalogRunProgress(data);
        setCatalogRunProgressError(null);
        setCatalogProgressLastSuccessAt(new Date().toISOString());
        if (TERMINAL_CATALOG_RUN_STATUSES.has(String(data.run_status || "").trim().toLowerCase())) return;
      } catch (error) {
        if (cancelled) return;
        setCatalogRunProgressError(
          error instanceof Error ? error.message : "Failed to load social account catalog run progress",
        );
      } finally {
        if (!cancelled) {
          setCatalogRunProgressLoading(false);
        }
      }

      if (cancelled) return;
      timeoutId = window.setTimeout(() => {
        void loadProgress();
      }, CATALOG_PROGRESS_POLL_INTERVAL_MS);
    };

    void loadProgress();
    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [backgroundCatalogRunId, checking, handle, hasAccess, platform, supportsCatalog, user]);

  useEffect(() => {
    const runId = String(catalogRunProgress?.run_id || "").trim();
    const runStatus = String(catalogRunProgress?.run_status || "").trim().toLowerCase();
    if (!runId || !TERMINAL_CATALOG_RUN_STATUSES.has(runStatus)) return;
    if (catalogTerminalSummaryRefreshRunIdRef.current === runId) return;
    catalogTerminalSummaryRefreshRunIdRef.current = runId;
    void refreshSummary().catch(() => {});
  }, [catalogRunProgress?.run_id, catalogRunProgress?.run_status, refreshSummary]);

  useEffect(() => {
    if (checking || !user || !hasAccess || !supportsCatalog || !backgroundCatalogRunIsActive) return;
    let cancelled = false;
    let timeoutId: number | null = null;

    const refreshLiveAccountState = async () => {
      try {
        await refreshSummary();
        if (!cancelled && activeTab === "hashtags") {
          await refreshHashtags();
          if (platform === "instagram") {
            await refreshHashtagTimeline();
          }
        }
      } catch {
        // The progress poll already surfaces run-level failures; keep live-summary refresh best effort.
      }
      if (cancelled) return;
      timeoutId = window.setTimeout(() => {
        void refreshLiveAccountState();
      }, CATALOG_PROGRESS_POLL_INTERVAL_MS);
    };

    timeoutId = window.setTimeout(() => {
      void refreshLiveAccountState();
    }, CATALOG_PROGRESS_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [
    activeTab,
    backgroundCatalogRunIsActive,
    checking,
    hasAccess,
    platform,
    refreshHashtagTimeline,
    refreshHashtags,
    refreshSummary,
    supportsCatalog,
    user,
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

  const catalogPostProgress = useMemo(() => {
    const payload = catalogRunProgress?.post_progress ?? {};
    const rawCompleted = Number(payload.completed_posts ?? 0);
    const completed = rawCompleted > 0 ? rawCompleted : Number(catalogProgressSummary.items ?? 0);
    const matched = Number(payload.matched_posts ?? 0);
    const fallbackTotal = Number(summary?.total_posts ?? 0);
    const total = Number(payload.total_posts ?? 0) || fallbackTotal;
    const pct = total > 0 ? Math.round((completed / total) * 100) : catalogProgressSummary.pct;
    return {
      completed,
      matched,
      total,
      pct: Math.max(0, Math.min(100, pct)),
      hasTotal: total > 0,
      hasCompleted: completed > 0,
    };
  }, [catalogProgressSummary.items, catalogProgressSummary.pct, catalogRunProgress?.post_progress, summary?.total_posts]);

  const catalogTerminalCoverageMessage = useMemo(() => {
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
    catalogRunProgress?.completion_gap_reason,
    catalogRunProgress?.discovery?.completed_count,
    displayedCatalogRunStatus,
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

  const seasonOptionsByShow = useMemo(() => {
    const next = new Map<string, SeasonOption[]>();
    for (const season of summary?.per_season_counts ?? []) {
      if (!season.show_id || !season.season_id) continue;
      const existing = next.get(season.show_id) ?? [];
      existing.push({
        season_id: season.season_id,
        season_number: season.season_number ?? null,
      });
      existing.sort((a, b) => Number(a.season_number ?? 0) - Number(b.season_number ?? 0));
      next.set(season.show_id, existing);
    }
    return next;
  }, [summary?.per_season_counts]);

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

  const mergedSeasonOptionsByShow = useMemo<Record<string, SeasonOption[]>>(() => {
    const showIds = new Set<string>([
      ...Array.from(seasonOptionsByShow.keys()),
      ...Object.keys(reviewSeasonOptionsByShow),
    ]);
    const next: Record<string, SeasonOption[]> = {};
    for (const showId of showIds) {
      const merged = new Map<string, SeasonOption>();
      for (const option of seasonOptionsByShow.get(showId) ?? []) {
        merged.set(option.season_id, option);
      }
      for (const option of reviewSeasonOptionsByShow[showId] ?? []) {
        merged.set(option.season_id, option);
      }
      next[showId] = Array.from(merged.values()).sort(
        (left, right) => Number(left.season_number ?? 0) - Number(right.season_number ?? 0),
      );
    }
    return next;
  }, [reviewSeasonOptionsByShow, seasonOptionsByShow]);

  const buildReviewResolutionDraft = useCallback((
    item: SocialAccountCatalogReviewItem,
    itemShowOptions: ShowOption[],
  ): ReviewResolutionDraft => {
    const fallbackShowId = item.suggested_shows?.[0]?.show_id ?? itemShowOptions[0]?.show_id ?? "";
    const fallbackSeasonId = fallbackShowId ? mergedSeasonOptionsByShow[fallbackShowId]?.[0]?.season_id ?? "" : "";
    return {
      resolution_action: "assign_show",
      show_id: fallbackShowId,
      season_id: fallbackSeasonId,
    };
  }, [mergedSeasonOptionsByShow]);

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

  const loadReviewSeasonOptions = useCallback(async (showId: string) => {
    if (!user || !showId) return;
    if ((mergedSeasonOptionsByShow[showId] ?? []).length > 0) return;
    if (reviewSeasonLoadingByShow[showId]) return;
    setReviewSeasonLoadingByShow((current) => ({ ...current, [showId]: true }));
    try {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/shows/${encodeURIComponent(showId)}/seasons?limit=50&include_episode_signal=true`,
        undefined,
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as {
        seasons?: Array<{ id?: string | null; season_number?: number | null }>;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Failed to load seasons for review queue");
      }
      const items = (data.seasons ?? [])
        .filter((season) => season.id)
        .map((season) => ({
          season_id: season.id as string,
          season_number: season.season_number ?? null,
        }));
      setReviewSeasonOptionsByShow((current) => ({ ...current, [showId]: items }));
    } catch {
      setReviewSeasonOptionsByShow((current) => ({ ...current, [showId]: [] }));
    } finally {
      setReviewSeasonLoadingByShow((current) => ({ ...current, [showId]: false }));
    }
  }, [mergedSeasonOptionsByShow, reviewSeasonLoadingByShow, user]);

  useEffect(() => {
    for (const draft of Object.values(reviewDrafts)) {
      if (draft.resolution_action !== "assign_season" || !draft.show_id) continue;
      if ((mergedSeasonOptionsByShow[draft.show_id] ?? []).length > 0 || reviewSeasonLoadingByShow[draft.show_id]) continue;
      void loadReviewSeasonOptions(draft.show_id);
    }
  }, [loadReviewSeasonOptions, mergedSeasonOptionsByShow, reviewDrafts, reviewSeasonLoadingByShow]);

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
            season_id: "",
          };
        })();
      const nextDraft = { ...currentDraft, ...updates };
      if (updates.show_id && updates.show_id !== currentDraft.show_id) {
        nextDraft.season_id = mergedSeasonOptionsByShow[updates.show_id]?.[0]?.season_id ?? "";
      }
      if (nextDraft.resolution_action === "assign_show") {
        nextDraft.season_id = "";
      }
      if (nextDraft.resolution_action === "mark_non_show") {
        nextDraft.show_id = "";
        nextDraft.season_id = "";
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
    const nextAssignments = [...(draftAssignments[hashtag] ?? []), { show_id: fallbackShow.show_id, season_id: null }];
    updateHashtagAssignments(hashtag, nextAssignments);
  };

  const saveHashtagAssignments = async (hashtag: string) => {
    if (!user) return;
    const assignments = (draftAssignments[hashtag] ?? [])
      .filter((assignment) => assignment.show_id)
      .map((assignment) => ({
        show_id: assignment.show_id,
        season_id: null,
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
      await refreshSummary();
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Failed to save hashtag assignments");
    } finally {
      setSavingHashtag(null);
    }
  };

  const runCatalogAction = async (
    action: "backfill" | "sync_recent",
    requestBody: CatalogBackfillRequest | CatalogSyncRecentRequest,
  ) => {
    if (!user) return;
    setRunningCatalogAction(action);
    setCatalogActionMessage(null);
    try {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/${
          action === "backfill" ? "backfill" : "sync-recent"
        }`,
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
        detail?: { message?: string; run_id?: string; status?: string };
      };
      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            data.detail?.message ||
            `Failed to ${action === "backfill" ? "start backfill" : "sync recent catalog content"}`,
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
          : `Recent sync queued${queuedRunId ? ` (${queuedRunId.slice(0, 8)})` : ""}.`,
      );
      await refreshSummary().catch(() => {});
    } catch (error) {
      setCatalogActionMessage(
        error instanceof Error
          ? error.message
          : `Failed to ${action === "backfill" ? "start backfill" : "sync recent catalog content"}`,
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
      await refreshSummary().catch(() => {});
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
      await refreshSummary().catch(() => {});
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
      const hashtagResponse = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/hashtags`,
        undefined,
        { preferredUser: user },
      );
      if (hashtagResponse.ok) {
        const hashtagData = (await hashtagResponse.json().catch(() => ({}))) as HashtagsResponse;
        setHashtags(hashtagData.items ?? []);
        setDraftAssignments(
          Object.fromEntries(
            (hashtagData.items ?? []).map((item) => [
              item.hashtag,
              item.assignments?.map((assignment) => ({ ...assignment })) ?? [],
            ]),
          ),
        );
      }
      await refreshSummary();
    } catch (error) {
      setCatalogActionMessage(error instanceof Error ? error.message : "Failed to resolve catalog review item");
    } finally {
      setResolvingReviewItemId(null);
    }
  };

  const headerTitle = `${SOCIAL_ACCOUNT_PLATFORM_LABELS[platform]} · @${handle}`;
  const breadcrumbs = [
    ...buildAdminSectionBreadcrumb("Social Analytics", "/admin/social"),
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
                        {runningCatalogAction === "backfill" ? "Queueing Post Backfill…" : "Backfill Posts"}
                      </button>
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
                            ? `Run ${shortRunId(cancellableCatalogRunId)} is ${formatRunStatusLabel(cancellableCatalogRunStatus)}. ${
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
                {catalogActionMessage ? <p className="mt-2 text-sm text-zinc-600">{catalogActionMessage}</p> : null}
              </div>
              <div className={`grid min-w-[220px] gap-3 ${supportsCatalog ? "grid-cols-3" : "grid-cols-2"}`}>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Posts</p>
                  <p className="mt-2 text-2xl font-bold text-zinc-900">{formatInteger(summary?.total_posts)}</p>
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
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Catalog Posts</p>
                      <p className="mt-2 text-2xl font-bold text-zinc-900">{formatInteger(displayCatalogTotalPosts)}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Pending Review</p>
                      <p className="mt-2 text-2xl font-bold text-zinc-900">{formatInteger(summary?.catalog_pending_review_posts)}</p>
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            <nav className="mt-6 flex flex-wrap items-center gap-2" aria-label="Social account profile tabs">
              {(Object.keys(SOCIAL_ACCOUNT_PROFILE_TAB_LABELS) as SocialAccountProfileTab[]).map((tab) => {
                const isActive = tab === activeTab;
                return (
                  <Link
                    key={tab}
                    href={buildSocialAccountProfileUrl({ platform, handle, tab }) as Route}
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
                      {formatRunStatusLabel(displayedCatalogRunStatus)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">
                    Run {shortRunId(displayedCatalogRunId)} · {formatRunStatusLabel(displayedCatalogRunStatus)}
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
                  {catalogScrapeCompletionMessage ? (
                    <p className="mt-2 text-sm text-emerald-700">{catalogScrapeCompletionMessage}</p>
                  ) : null}
                  {catalogTerminalCoverageMessage ? (
                    <p className="mt-2 text-sm text-amber-700">{catalogTerminalCoverageMessage}</p>
                  ) : null}
                </div>
                <div className="min-w-[190px] rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Overall Progress</p>
                  <p className="mt-2 text-3xl font-bold text-zinc-900">
                    {catalogPostProgress.hasTotal ? catalogPostProgress.pct : catalogProgressSummary.pct}%
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {catalogPostProgress.hasTotal
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
                  style={{ width: `${Math.max(catalogPostProgress.hasTotal ? catalogPostProgress.pct : catalogProgressSummary.pct, 2)}%` }}
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
                  <h2 className="text-lg font-semibold text-zinc-900">Top Hashtags</h2>
                  <div className="mt-4 space-y-2">
                    {(summary?.top_hashtags ?? []).length === 0 ? (
                      <p className="text-sm text-zinc-500">No hashtags found yet.</p>
                    ) : (
                      (summary?.top_hashtags ?? []).map((item) => (
                        <div key={item.hashtag} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                          <div>
                            <p className="font-semibold text-zinc-900">{item.display_hashtag ?? `#${item.hashtag}`}</p>
                            <p className="text-xs text-zinc-500">{item.assignments?.length ?? 0} assignments</p>
                          </div>
                          <span className="text-sm font-semibold text-zinc-700">{formatInteger(item.usage_count)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-zinc-900">Source Status</h2>
                  <div className="mt-4 space-y-2">
                    {(summary?.source_status ?? []).length === 0 ? (
                      <p className="text-sm text-zinc-500">No shared-source metadata was found for this handle.</p>
                    ) : (
                      (summary?.source_status ?? []).map((item, index) => (
                        <div key={`${String(item.id ?? index)}`} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm">
                          <p className="font-semibold text-zinc-900">{String(item.source_scope ?? "bravo")}</p>
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
                                  {formatRunStatusLabel(run.status)}
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
                                  setCatalogProgressRunId(run.run_id);
                                  setCatalogRunProgress(null);
                                  setCatalogRunProgressError(null);
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
                  <p className="text-sm text-zinc-500">All materialized posts for @{handle} across every show and season.</p>
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
                <div className="flex flex-col gap-2">
                  <h2 className="text-lg font-semibold text-zinc-900">Hashtags</h2>
                  <p className="text-sm text-zinc-500">
                    Each hashtag shows show-level assignments plus the show and season contexts observed on this account’s posts.
                  </p>
                  {saveMessage ? <p className="text-sm text-zinc-600">{saveMessage}</p> : null}
                </div>
                {hashtagsLoading ? <p className="mt-4 text-sm text-zinc-500">Loading hashtags…</p> : null}
                {hashtagsError ? <p className="mt-4 text-sm text-red-700">{hashtagsError}</p> : null}
                {!hashtagsLoading && !hashtagsError ? (
                  <div className="mt-4 space-y-4">
                    {hashtags.length === 0 ? (
                      <p className="text-sm text-zinc-500">No hashtags found for this account.</p>
                    ) : (
                      hashtags.map((item) => {
                        const assignments = draftAssignments[item.hashtag] ?? [];
                        return (
                          <div key={item.hashtag} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <p className="text-lg font-semibold text-zinc-900">{item.display_hashtag ?? `#${item.hashtag}`}</p>
                                <p className="text-xs text-zinc-500">
                                  {formatInteger(item.usage_count)} uses · Last seen {formatDateTime(item.latest_seen_at)}
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
                                                entryIndex === index ? { ...entry, show_id: nextShowId, season_id: null } : entry,
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
                      })
                    )}
                  </div>
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
                          const availableSeasonOptions = draft.show_id ? (mergedSeasonOptionsByShow[draft.show_id] ?? []) : [];
                          const isAssigningToSeason = draft.resolution_action === "assign_season";
                          const canResolve =
                            draft.resolution_action === "mark_non_show" ||
                            (draft.resolution_action === "assign_show" && Boolean(draft.show_id)) ||
                            (draft.resolution_action === "assign_season" &&
                              Boolean(draft.show_id) &&
                              Boolean(draft.season_id));
                          return (
                            <div key={item.id} className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                              <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                  <div>
                                    <p className="font-semibold text-zinc-900">{item.display_hashtag ?? `#${item.hashtag}`}</p>
                                    <p className="text-xs text-zinc-500">
                                      {formatInteger(item.usage_count)} uses · Last seen {formatDateTime(item.last_seen_at)}
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
                                        season_id:
                                          draft.resolution_action === "assign_season"
                                            ? draft.season_id || undefined
                                            : undefined,
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
                                      onChange={(event) => {
                                        const nextAction = event.target.value as CatalogReviewResolveRequest["resolution_action"];
                                        updateReviewDraft(item.id, { resolution_action: nextAction });
                                        if (nextAction === "assign_season" && draft.show_id) {
                                          void loadReviewSeasonOptions(draft.show_id);
                                        }
                                      }}
                                      className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                                    >
                                      <option value="assign_show">Assign To Show</option>
                                      <option value="assign_season">Assign To Season</option>
                                      <option value="mark_non_show">Not A Show Hashtag</option>
                                    </select>
                                  </label>

                                  {draft.resolution_action !== "mark_non_show" ? (
                                    <label className="text-sm font-medium text-zinc-700">
                                      Show
                                      <select
                                        aria-label={`Show for ${item.display_hashtag ?? `#${item.hashtag}`}`}
                                        value={draft.show_id}
                                        onChange={(event) => {
                                          const nextShowId = event.target.value;
                                          updateReviewDraft(item.id, { show_id: nextShowId });
                                          if (draft.resolution_action === "assign_season" && nextShowId) {
                                            void loadReviewSeasonOptions(nextShowId);
                                          }
                                        }}
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

                                  {isAssigningToSeason ? (
                                    <label className="text-sm font-medium text-zinc-700">
                                      Season
                                      <select
                                        aria-label={`Season for ${item.display_hashtag ?? `#${item.hashtag}`}`}
                                        value={draft.season_id}
                                        onChange={(event) => updateReviewDraft(item.id, { season_id: event.target.value })}
                                        disabled={!draft.show_id || reviewSeasonLoadingByShow[draft.show_id]}
                                        className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        <option value="">
                                          {reviewSeasonLoadingByShow[draft.show_id] ? "Loading seasons…" : "Select a season"}
                                        </option>
                                        {availableSeasonOptions.map((season) => (
                                          <option key={season.season_id} value={season.season_id}>
                                            {formatSeasonLabel(season.season_number)}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  ) : (
                                    <div className="hidden lg:block" />
                                  )}
                                </div>
                              </div>
                              {isAssigningToSeason && draft.show_id && !reviewSeasonLoadingByShow[draft.show_id] && availableSeasonOptions.length === 0 ? (
                                <p className="text-xs text-amber-700">
                                  No seasons are loaded for the selected show yet. Pick a different show or resolve at the show level.
                                </p>
                              ) : null}
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
