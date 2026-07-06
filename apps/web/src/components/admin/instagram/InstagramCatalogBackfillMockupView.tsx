"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIcon,
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  Clock3Icon,
  ExternalLinkIcon,
  RefreshCwIcon,
} from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAdminWithAuth as fetchAdminWithAuthBase } from "@/lib/admin/client-auth";
import { fetchSocialAccountCatalogRunProgressSnapshot } from "@/lib/admin/social-account-catalog-progress";
import type {
  SocialAccountCommentsRunProgress,
  SocialAccountCommentsShardProgress,
  SocialAccountCatalogRun,
  SocialAccountCatalogRunProgressSnapshot,
  SocialAccountOperationalAlert,
  SocialPlatformSlug,
} from "@/lib/admin/social-account-profile";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

const REFRESH_INTERVAL_MS = 5_000;
const COMPLETION_REFRESH_INTERVAL_MS = 60_000;
const ACTIVE_RUN_STATUSES = new Set(["queued", "pending", "retrying", "running", "cancelling"]);
const TERMINAL_MUTED_RUN_STATUSES = new Set(["cancelled", "failed"]);

type ProxyErrorPayload = {
  error?: string;
  message?: string;
  detail?: string | { message?: string };
};

type MetricCard = {
  label: string;
  value: string;
  detail: string;
};

type LaneRow = {
  label: string;
  status: string;
  detail: string;
};

type TruthRow = {
  key: string;
  label: string;
  value: string;
  detail: string | null;
  recommendation?: string | null;
  progressValue?: number | null;
};

type IssueRow = {
  key: string;
  title: string;
  detail: string;
  recommendation?: string | null;
  tone: "amber" | "red" | "sky";
};

type ShardHealthSummary = {
  failed: number;
  retrying: number;
  running: number;
  queued: number;
  complete: number;
  cancelled: number;
  total: number;
  issueReasons: string[];
};

type CatalogRecentRunsPayload = ProxyErrorPayload & {
  catalog_recent_runs?: SocialAccountCatalogRun[];
};

type CommentsProgressPayload = SocialAccountCommentsRunProgress & ProxyErrorPayload;

type CompletionLaneSummary = {
  finished?: number | null;
  in_progress?: number | null;
  not_started?: number | null;
};

type CompletionSummaryPayload = ProxyErrorPayload & {
  year?: number;
  total_posts?: number | null;
  total_reported_comments?: number | null;
  saved_comments?: number | null;
  missing_comments?: number | null;
  lanes?: {
    comments?: CompletionLaneSummary;
    details?: CompletionLaneSummary;
    media?: CompletionLaneSummary;
  };
};

type InstagramCatalogBackfillMockupViewProps = {
  platform: SocialPlatformSlug;
  handle: string;
  canonicalCatalogUrl: string;
  variantLabel?: string;
};

const formatInteger = (value: number | null | undefined): string => {
  const numeric = Number(value);
  return new Intl.NumberFormat("en-US").format(Number.isFinite(numeric) ? numeric : 0);
};

const readFiniteNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const readRecord = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
};

const readString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const readRecordNumber = (record: Record<string, unknown> | null | undefined, keys: string[]): number | null => {
  if (!record) return null;
  for (const key of keys) {
    const value = readFiniteNumber(record[key]);
    if (value !== null) return value;
  }
  return null;
};

const firstFiniteNumber = (...values: unknown[]): number | null => {
  for (const value of values) {
    const numeric = readFiniteNumber(value);
    if (numeric !== null) return numeric;
  }
  return null;
};

const formatStatusLabel = (value?: string | null): string => {
  const normalized = String(value || "").trim();
  if (!normalized) return "Idle";
  return normalized
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
};

const shortRunId = (value?: string | null): string => {
  const normalized = String(value || "").trim();
  return normalized ? normalized.slice(0, 8) : "none";
};

const getCatalogRunIdentity = (run: SocialAccountCatalogRun): string => {
  return String(run.run_id || run.job_id || "").trim().toLowerCase();
};

const dedupeCatalogRuns = (runs: readonly SocialAccountCatalogRun[]): SocialAccountCatalogRun[] => {
  const seen = new Set<string>();
  const deduped: SocialAccountCatalogRun[] = [];
  for (const run of runs) {
    const identity = getCatalogRunIdentity(run);
    if (!identity) {
      deduped.push(run);
      continue;
    }
    if (seen.has(identity)) continue;
    seen.add(identity);
    deduped.push(run);
  }
  return deduped;
};

const toProgressPercent = (completed: number | null, total: number | null): number => {
  if (completed === null || total === null || total <= 0) return 0;
  return Math.max(0, Math.min(100, (completed / total) * 100));
};

const formatDecimal = (value: number | null, digits = 1): string | null => {
  return value === null ? null : value.toFixed(digits);
};

const formatDurationEstimate = (seconds: number | null): string | null => {
  if (seconds === null || seconds <= 0) return null;
  const roundedMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

const formatDiagnosticToken = (value?: string | null): string => {
  const normalized = String(value || "").trim();
  if (!normalized) return "Unknown";
  return normalized.replace(/_/g, " ");
};

const isRuntimeVersionAlertCode = (code?: string | null): boolean => {
  const normalized = String(code || "").trim().toLowerCase();
  return normalized === "runtime_version_drift" || normalized === "runtime_version_pin_mismatch";
};

const formatOperationalAlertLabel = (alert: SocialAccountOperationalAlert): string => {
  const normalized = String(alert.code || "").trim().toLowerCase();
  if (normalized === "runtime_version_drift") return "Worker version drift";
  if (normalized === "runtime_version_pin_mismatch") return "Run is pinned to an older worker image";
  if (normalized === "failed_recovery_no_partitions_discovered") return "Failed recovery";
  return formatStatusLabel(normalized || alert.message || "alert");
};

const buildRequestError = (payload: ProxyErrorPayload, fallback: string): Error => {
  const detailMessage = typeof payload.detail === "object" ? payload.detail?.message : payload.detail;
  return new Error(payload.error || payload.message || detailMessage || fallback);
};

const getActiveCatalogRun = (runs: readonly SocialAccountCatalogRun[]): SocialAccountCatalogRun | null => {
  return (
    runs.find((run) => ACTIVE_RUN_STATUSES.has(String(run.status || "").trim().toLowerCase())) ??
    runs[0] ??
    null
  );
};

const resolveLaneStatus = (runStatus: string, laneStatus?: string | null): string => {
  const normalizedRunStatus = runStatus.trim().toLowerCase();
  const normalizedLaneStatus = String(laneStatus || "").trim().toLowerCase();
  if (TERMINAL_MUTED_RUN_STATUSES.has(normalizedRunStatus) && ACTIVE_RUN_STATUSES.has(normalizedLaneStatus)) {
    return normalizedRunStatus;
  }
  return normalizedLaneStatus || "waiting";
};

const buildLaneRows = (progress: SocialAccountCatalogRunProgressSnapshot | null, runStatus: string): LaneRow[] => {
  if (!progress) return [];
  const summary = progress.summary ?? {};
  const normalizedRunStatus = runStatus.trim().toLowerCase();
  const runHasEnded = TERMINAL_MUTED_RUN_STATUSES.has(normalizedRunStatus);
  const historicalLaneDetail = `Parent run is ${formatStatusLabel(normalizedRunStatus).toLowerCase()}; no lane is currently running.`;
  const detailStatus = resolveLaneStatus(runStatus, progress.details_progress?.status ?? "waiting");
  const commentsStatus = resolveLaneStatus(
    runStatus,
    progress.attached_followups?.comments?.status ?? progress.comments_streaming?.state ?? "waiting",
  );
  const mediaStatus = resolveLaneStatus(runStatus, progress.attached_followups?.media?.status ?? "waiting");
  return [
    {
      label: "Catalog jobs",
      status: formatStatusLabel(progress.run_status),
      detail: `${formatInteger(summary.active_jobs)} active / ${formatInteger(summary.total_jobs)} total`,
    },
    {
      label: "Post details",
      status: formatStatusLabel(detailStatus),
      detail:
        runHasEnded && ACTIVE_RUN_STATUSES.has(String(progress.details_progress?.status ?? "waiting").trim().toLowerCase())
          ? historicalLaneDetail
          : progress.detail_worker_count != null
          ? `${formatInteger(progress.detail_worker_count)} detail workers requested`
          : "Details are tracked by the active catalog run",
    },
    {
      label: "Comments",
      status: formatStatusLabel(commentsStatus),
      detail:
        runHasEnded &&
        ACTIVE_RUN_STATUSES.has(
          String(progress.attached_followups?.comments?.status ?? progress.comments_streaming?.state ?? "waiting")
            .trim()
            .toLowerCase(),
        )
          ? historicalLaneDetail
          : progress.comments_run_id || progress.attached_followups?.comments?.run_id
          ? `Run ${shortRunId(progress.comments_run_id ?? progress.attached_followups?.comments?.run_id)}`
          : "Waiting for saved post targets",
    },
    {
      label: "Media",
      status: formatStatusLabel(mediaStatus),
      detail:
        runHasEnded &&
        ACTIVE_RUN_STATUSES.has(String(progress.attached_followups?.media?.status ?? "waiting").trim().toLowerCase())
          ? historicalLaneDetail
          : progress.attached_followups?.media?.enqueued_job_count != null
          ? `${formatInteger(progress.attached_followups.media.enqueued_job_count)} repair jobs`
          : "Media follows saved catalog posts",
    },
  ];
};

const laneTotal = (lane: CompletionLaneSummary | null | undefined): number | null => {
  if (!lane) return null;
  return (
    (readFiniteNumber(lane.finished) ?? 0) +
    (readFiniteNumber(lane.in_progress) ?? 0) +
    (readFiniteNumber(lane.not_started) ?? 0)
  );
};

const resolveCommentsRunId = (
  progress: SocialAccountCatalogRunProgressSnapshot | null | undefined,
  run: SocialAccountCatalogRun | null | undefined,
): string | null => {
  return (
    readString(progress?.comments_run_id) ??
    readString(progress?.comments_streaming?.comments_run_id) ??
    readString(progress?.attached_followups?.comments?.run_id) ??
    readString(run?.comments_run_id) ??
    readString(run?.attached_followups?.comments?.run_id)
  );
};

const resolveCommentsRunStatus = (
  progress: SocialAccountCatalogRunProgressSnapshot | null | undefined,
  commentsProgress: SocialAccountCommentsRunProgress | null | undefined,
  run: SocialAccountCatalogRun | null | undefined,
): string => {
  return (
    readString(commentsProgress?.run_status) ??
    readString(progress?.attached_followups?.comments?.status) ??
    readString(progress?.attached_followups?.comments?.state) ??
    readString(progress?.comments_streaming?.state) ??
    readString(run?.attached_followups?.comments?.status) ??
    readString(run?.attached_followups?.comments?.state) ??
    "waiting"
  );
};

const getCommentsShardRows = (
  progress: SocialAccountCommentsRunProgress | null | undefined,
): SocialAccountCommentsShardProgress[] => {
  if (!progress) return [];
  return progress.comment_shards ?? progress.shards ?? progress.shard_progress ?? [];
};

const readReasonFromCounts = (counts: Record<string, number | null | undefined> | null | undefined): string | null => {
  if (!counts) return null;
  const entry = Object.entries(counts).find(([, value]) => Number(value ?? 0) > 0);
  return entry ? entry[0] : null;
};

const getShardIssueLabel = (row: SocialAccountCommentsShardProgress): string | null => {
  return (
    readString(row.latest_failure_reason) ??
    readString(row.latest_stop_reason) ??
    readString(row.error_message) ??
    readReasonFromCounts(row.retry_reason_counts) ??
    readReasonFromCounts(row.stop_reason_counts) ??
    readReasonFromCounts(row.completion_reason_counts)
  );
};

const buildCommentsShardHealthSummary = (
  progress: SocialAccountCommentsRunProgress | null | undefined,
  rows: readonly SocialAccountCommentsShardProgress[],
): ShardHealthSummary => {
  const counters = progress?.worker_counters;
  const issueReasons = new Set<string>();
  for (const row of rows) {
    const issue = getShardIssueLabel(row);
    if (issue) issueReasons.add(formatDiagnosticToken(issue));
  }
  if (counters) {
    return {
      failed: readFiniteNumber(counters.failed) ?? 0,
      retrying: readFiniteNumber(counters.retrying) ?? 0,
      running: readFiniteNumber(counters.running ?? counters.active) ?? 0,
      queued: readFiniteNumber(counters.queued) ?? 0,
      complete: readFiniteNumber(counters.completed) ?? 0,
      cancelled: readFiniteNumber(counters.cancelled) ?? 0,
      total: readFiniteNumber(counters.total) ?? rows.length,
      issueReasons: Array.from(issueReasons).slice(0, 3),
    };
  }
  let failed = 0;
  let retrying = 0;
  let running = 0;
  let queued = 0;
  let complete = 0;
  let cancelled = 0;
  for (const row of rows) {
    const status = String(row.status ?? row.job_status ?? "").trim().toLowerCase();
    if (status === "failed") failed += 1;
    if (status === "retrying") retrying += 1;
    if (status === "running") running += 1;
    if (status === "queued" || status === "pending") queued += 1;
    if (status === "completed" || status === "complete") complete += 1;
    if (status === "cancelled" || status === "canceled") cancelled += 1;
  }
  return {
    failed,
    retrying,
    running,
    queued,
    complete,
    cancelled,
    total: rows.length,
    issueReasons: Array.from(issueReasons).slice(0, 3),
  };
};

const formatShardProgressLabel = (row: SocialAccountCommentsShardProgress, index: number): string => {
  const shardIndex = readFiniteNumber(row.shard_index);
  const shardCount = readFiniteNumber(row.shard_count);
  const shardLabel =
    shardIndex !== null && shardCount !== null
      ? `Shard ${formatInteger(shardIndex + 1)} of ${formatInteger(shardCount)}`
      : `Shard ${formatInteger(index + 1)}`;
  const jobId = readString(row.job_id);
  return jobId ? `${shardLabel} · job ${shortRunId(jobId)}` : shardLabel;
};

const formatShardPostLabel = (row: SocialAccountCommentsShardProgress): string => {
  const checked = firstFiniteNumber(
    row.processed_post_count,
    row.completed_posts,
    row.complete_posts,
    row.matched_posts,
    row.saved_posts,
  );
  const total = firstFiniteNumber(row.target_count, row.target_source_ids_count, row.comments_shard_target_count);
  if (checked !== null && total !== null) return `${formatInteger(checked)} / ${formatInteger(total)}`;
  if (checked !== null) return formatInteger(checked);
  if (total !== null) return `0 / ${formatInteger(total)}`;
  return "Waiting";
};

const formatShardCommentsLabel = (row: SocialAccountCommentsShardProgress): string => {
  const commentsProcessed = firstFiniteNumber(
    row.comments_processed,
    row.comments_upserted,
    row.comments_inserted,
    row.items_found_total,
  );
  const parts = [
    commentsProcessed !== null ? `${formatInteger(commentsProcessed)} fetched` : null,
    formatDecimal(readFiniteNumber(row.posts_per_minute)) !== null
      ? `${formatDecimal(readFiniteNumber(row.posts_per_minute))} posts/min`
      : null,
    formatDecimal(readFiniteNumber(row.comments_per_minute)) !== null
      ? `${formatDecimal(readFiniteNumber(row.comments_per_minute))} comments/min`
      : null,
  ].filter(Boolean);
  return parts.join(" · ") || "No comments yet";
};

export function InstagramCatalogBackfillMockupView({
  platform,
  handle,
  canonicalCatalogUrl,
  variantLabel = "Mockup",
}: InstagramCatalogBackfillMockupViewProps) {
  const { user, checking, hasAccess } = useAdminGuard();
  const [recentRuns, setRecentRuns] = useState<SocialAccountCatalogRun[]>([]);
  const [completionSummary, setCompletionSummary] = useState<CompletionSummaryPayload | null>(null);
  const [progress, setProgress] = useState<SocialAccountCatalogRunProgressSnapshot | null>(null);
  const [commentsProgress, setCommentsProgress] = useState<SocialAccountCommentsRunProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [commentsProgressError, setCommentsProgressError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const hasLoadedRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const refreshRequestIdRef = useRef(0);
  const completionInFlightRef = useRef(false);
  const completionLastRequestedAtRef = useRef(0);
  const normalizedPlatform = platform;
  const normalizedHandle = handle.trim().toLowerCase().replace(/^@+/, "");
  const completionYear = new Date().getUTCFullYear();
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

  const refreshCompletionSummary = useCallback(async (options?: { force?: boolean }) => {
    if (checking || !user || !hasAccess) return;
    const now = Date.now();
    if (completionInFlightRef.current) return;
    if (!options?.force && now - completionLastRequestedAtRef.current < COMPLETION_REFRESH_INTERVAL_MS) return;
    completionInFlightRef.current = true;
    completionLastRequestedAtRef.current = now;
    try {
      const completionResponse = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(normalizedPlatform)}/${encodeURIComponent(
          normalizedHandle,
        )}/completion-summary?year=${completionYear}`,
        undefined,
        { preferredUser: user },
      );
      const completionPayload = (await completionResponse.json().catch(() => ({}))) as CompletionSummaryPayload;
      if (!completionResponse.ok) {
        setCompletionSummary(null);
        setCompletionError(buildRequestError(completionPayload, "2026 completion summary could not load").message);
      } else {
        setCompletionSummary(completionPayload);
        setCompletionError(null);
      }
    } catch (caught) {
      setCompletionSummary(null);
      setCompletionError(caught instanceof Error ? caught.message : "2026 completion summary could not load");
    } finally {
      completionInFlightRef.current = false;
    }
  }, [
    checking,
    completionYear,
    fetchAdminWithAuth,
    hasAccess,
    normalizedHandle,
    normalizedPlatform,
    user,
  ]);

  const refreshDashboard = useCallback(async (options?: { showLoading?: boolean }) => {
    if (checking || !user || !hasAccess) {
      setLoading(false);
      return;
    }
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    const requestId = ++refreshRequestIdRef.current;
    if (options?.showLoading || !hasLoadedRef.current) setLoading(true);
    setError(null);
    setCommentsProgressError(null);
    const isCurrentRequest = () => refreshRequestIdRef.current === requestId;
    try {
      const recentRunsResponse = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(normalizedPlatform)}/${encodeURIComponent(
          normalizedHandle,
        )}/catalog/runs/recent?limit=8`,
        undefined,
        { preferredUser: user },
      );
      const recentRunsPayload = (await recentRunsResponse.json().catch(() => ({}))) as CatalogRecentRunsPayload;
      if (!recentRunsResponse.ok) {
        throw buildRequestError(recentRunsPayload, "Failed to load recent catalog runs");
      }
      if (!isCurrentRequest()) return;
      const nextRecentRuns = dedupeCatalogRuns(recentRunsPayload.catalog_recent_runs ?? []);
      setRecentRuns(nextRecentRuns);
      const activeRun = getActiveCatalogRun(nextRecentRuns);
      const runId = String(activeRun?.run_id || "").trim();
      if (runId) {
        const progressPayload = await fetchSocialAccountCatalogRunProgressSnapshot({
          fetchAdminWithAuth,
          platform: normalizedPlatform,
          handle: normalizedHandle,
          runId,
          preferredUser: user,
          recentLogLimit: 8,
          fast: true,
        });
        if (!isCurrentRequest()) return;
        setProgress(progressPayload);
        const commentsRunId = resolveCommentsRunId(progressPayload, activeRun);
        if (commentsRunId) {
          try {
            const commentsResponse = await fetchAdminWithAuth(
              `/api/admin/trr-api/social/profiles/${encodeURIComponent(normalizedPlatform)}/${encodeURIComponent(
                normalizedHandle,
              )}/comments/runs/${encodeURIComponent(commentsRunId)}/progress`,
              undefined,
              { preferredUser: user },
            );
            const commentsPayload = (await commentsResponse.json().catch(() => ({}))) as CommentsProgressPayload;
            if (!commentsResponse.ok) {
              throw buildRequestError(commentsPayload, "Failed to load comments run progress");
            }
            if (!isCurrentRequest()) return;
            setCommentsProgress(commentsPayload);
            setCommentsProgressError(null);
          } catch (caught) {
            if (!isCurrentRequest()) return;
            setCommentsProgress(null);
            setCommentsProgressError(
              caught instanceof Error ? caught.message : "Failed to load comments run progress",
            );
          }
        } else {
          setCommentsProgress(null);
          setCommentsProgressError(null);
        }
      } else {
        setProgress(null);
        setCommentsProgress(null);
        setCommentsProgressError(null);
      }
      if (!isCurrentRequest()) return;
      setLastUpdatedAt(new Date());
      void refreshCompletionSummary({ force: Boolean(options?.showLoading) });
    } catch (caught) {
      if (!isCurrentRequest()) return;
      setError(caught instanceof Error ? caught.message : "Failed to load live catalog backfill data");
    } finally {
      if (isCurrentRequest()) {
        hasLoadedRef.current = true;
        refreshInFlightRef.current = false;
        setLoading(false);
      }
    }
  }, [
    checking,
    fetchAdminWithAuth,
    hasAccess,
    normalizedHandle,
    normalizedPlatform,
    refreshCompletionSummary,
    user,
  ]);

  useEffect(() => {
    if (checking || !hasAccess || !user) return;
    let cancelled = false;
    const load = async () => {
      if (cancelled) return;
      await refreshDashboard();
    };
    void load();
    const intervalId = window.setInterval(() => {
      void load();
    }, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      refreshRequestIdRef.current += 1;
      refreshInFlightRef.current = false;
      window.clearInterval(intervalId);
    };
  }, [checking, hasAccess, refreshDashboard, user]);

  const activeRun = getActiveCatalogRun(recentRuns);
  const runId = String(progress?.run_id || activeRun?.run_id || "").trim();
  const runStatus = String(progress?.run_status || activeRun?.status || "").trim();
  const runIsActive = ACTIVE_RUN_STATUSES.has(runStatus.toLowerCase());
  const progressSummary = progress?.summary ?? {};
  const completedPosts = firstFiniteNumber(
    progress?.post_progress?.completed_posts,
    progress?.post_progress?.matched_posts,
    progressSummary.items_found_total,
  );
  const totalPosts = firstFiniteNumber(
    progress?.post_progress?.total_posts,
    progress?.source_total_posts_current,
    completionSummary?.total_posts,
  );
  const progressPercent = toProgressPercent(completedPosts, totalPosts);
  const savedComments = firstFiniteNumber(completionSummary?.saved_comments);
  const reportedComments = firstFiniteNumber(completionSummary?.total_reported_comments);
  const commentGap =
    firstFiniteNumber(completionSummary?.missing_comments) ??
    (savedComments !== null && reportedComments !== null ? Math.max(0, reportedComments - savedComments) : 0);
  const detailsFinished = firstFiniteNumber(completionSummary?.lanes?.details?.finished);
  const detailsTotal = laneTotal(completionSummary?.lanes?.details);
  const mediaFinished = firstFiniteNumber(completionSummary?.lanes?.media?.finished);
  const mediaTotal = laneTotal(completionSummary?.lanes?.media);
  const activeWorkers = firstFiniteNumber(
    progressSummary.active_jobs,
    progress?.dispatch_health?.modal_running_unclaimed_jobs,
    0,
  );
  const authMode = progress?.instagram_posts_auth_mode || progress?.posts_auth_mode || "not reported";
  const liveStatusDetail = runIsActive
    ? `${formatInteger(activeWorkers)} workers active. Auth mode: ${formatStatusLabel(authMode)}.`
    : runStatus
      ? `Run is ${formatStatusLabel(runStatus).toLowerCase()}.`
      : "No active catalog backfill run is reported.";
  const runHasEnded = TERMINAL_MUTED_RUN_STATUSES.has(runStatus.toLowerCase());
  const commentsRunId = resolveCommentsRunId(progress, activeRun);
  const commentsRunStatus = resolveCommentsRunStatus(progress, commentsProgress, activeRun);
  const commentsShardRows = useMemo(() => getCommentsShardRows(commentsProgress), [commentsProgress]);
  const commentsShardPreviewRows = useMemo(() => commentsShardRows.slice(0, 8), [commentsShardRows]);
  const commentsShardHealth = useMemo(
    () => buildCommentsShardHealthSummary(commentsProgress, commentsShardRows),
    [commentsProgress, commentsShardRows],
  );
  const commentsCompletedPosts = firstFiniteNumber(
    commentsProgress?.post_progress?.completed_posts,
    commentsProgress?.post_progress?.matched_posts,
    readRecordNumber(commentsProgress?.summary, ["complete_posts_total"]),
  );
  const commentsTotalPosts = firstFiniteNumber(
    commentsProgress?.post_progress?.total_posts,
    commentsProgress?.target_source_ids_count,
  );
  const commentsProgressPercent = toProgressPercent(commentsCompletedPosts, commentsTotalPosts);
  const commentsProcessed = firstFiniteNumber(
    commentsProgress?.summary?.comments_processed_total,
    commentsProgress?.summary?.items_found_total,
  );
  const commentsPerMinute = readFiniteNumber(commentsProgress?.throughput?.comments_per_minute);
  const postsPerMinute = readFiniteNumber(commentsProgress?.throughput?.posts_per_minute);
  const commentsEta = formatDurationEstimate(readFiniteNumber(commentsProgress?.throughput?.estimated_seconds_remaining));
  const commentsThroughputLabel = [
    formatDecimal(postsPerMinute) !== null ? `${formatDecimal(postsPerMinute)} posts/min` : null,
    formatDecimal(commentsPerMinute) !== null ? `${formatDecimal(commentsPerMinute)} comments/min` : null,
    commentsEta ? `about ${commentsEta} remaining` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const lastUpdatedLabel = lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString() : "Not loaded yet";

  const coverageMetrics = useMemo<MetricCard[]>(
    () => [
      {
        label: `${completionYear} posts`,
        value: formatInteger(completionSummary?.total_posts),
        detail: "Posts in the selected year",
      },
      {
        label: "Missing comments",
        value: formatInteger(commentGap),
        detail: "Backend gap count for the selected year",
      },
      {
        label: "Post details",
        value:
          detailsFinished !== null && detailsTotal !== null
            ? `${formatInteger(detailsFinished)} / ${formatInteger(detailsTotal)}`
            : formatInteger(detailsFinished),
        detail: "Posts with saved details",
      },
      {
        label: "Media lane",
        value:
          mediaFinished !== null && mediaTotal !== null
            ? `${formatInteger(mediaFinished)} / ${formatInteger(mediaTotal)}`
            : formatInteger(mediaFinished),
        detail: "Posts with completed media work",
      },
    ],
    [
      commentGap,
      completionSummary?.total_posts,
      completionYear,
      detailsFinished,
      detailsTotal,
      mediaFinished,
      mediaTotal,
    ],
  );
  const laneRows = useMemo(() => buildLaneRows(progress, runStatus), [progress, runStatus]);
  const truthRows = useMemo<TruthRow[]>(() => {
    const rows: TruthRow[] = [
      {
        key: "post-details",
        label: "Post/details run",
        value: runId ? `Run ${shortRunId(runId)} · ${formatStatusLabel(runStatus || "waiting")}` : "No run selected",
        detail:
          completedPosts !== null && totalPosts !== null
            ? `${formatInteger(completedPosts)} / ${formatInteger(totalPosts)} posts checked. This is active-run progress, not the lifetime profile total.`
            : liveStatusDetail,
        recommendation: runHasEnded
          ? "Treat this run as historical. Start a new run only from the live controls after checking why it ended."
          : "Let the post/details workers continue; do not compare this checked count to all-time saved posts.",
        progressValue: progressPercent,
      },
      {
        key: "comments",
        label: "Comments run",
        value: commentsRunId ? `Run ${shortRunId(commentsRunId)} · ${formatStatusLabel(commentsRunStatus)}` : "No comments run selected",
        detail: [
          commentsCompletedPosts !== null && commentsTotalPosts !== null
            ? `${formatInteger(commentsCompletedPosts)} / ${formatInteger(commentsTotalPosts)} posts checked`
            : commentsRunId
              ? "Waiting for comments worker counters"
              : "Comments will appear here when the catalog run attaches a comments run",
          commentsProcessed !== null ? `${formatInteger(commentsProcessed)} comments fetched this run` : null,
          commentsThroughputLabel || null,
          commentsShardHealth.total > 0
            ? `${formatInteger(commentsShardHealth.running)} running · ${formatInteger(commentsShardHealth.retrying)} retrying · ${formatInteger(commentsShardHealth.queued)} queued · ${formatInteger(commentsShardHealth.failed)} failed`
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
        recommendation:
          commentsShardHealth.failed > 0 || commentsShardHealth.retrying > 0
            ? "Cancel or recover only the shard that is stuck; do not cancel the whole comments run while other shards can continue."
            : commentsRunId
              ? "Let comments continue separately from post/details work."
              : "No comments action is available until a comments run is attached.",
        progressValue: commentsRunId ? commentsProgressPercent : null,
      },
      {
        key: "auth",
        label: "Auth state",
        value: authMode === "not reported" ? "Not reported" : formatStatusLabel(authMode),
        detail: [
          `Post/details auth mode: ${formatStatusLabel(authMode)}`,
          commentsRunId ? "comments progress feed is connected" : "comments progress feed is waiting for a run ID",
        ].join(". "),
        recommendation:
          authMode === "not reported"
            ? "Watch worker errors before treating auth as blocked."
            : "No auth action is needed from this read-only page.",
      },
      {
        key: "completion",
        label: `${completionYear} completion`,
        value: `${formatInteger(completionSummary?.total_posts)} posts · ${formatInteger(commentGap)} missing comments`,
        detail:
          savedComments !== null && reportedComments !== null
            ? `${formatInteger(savedComments)} saved comments / ${formatInteger(reportedComments)} reported comments. This is coverage for ${completionYear}, not current worker progress.`
            : "Coverage totals load separately from active worker progress.",
        recommendation: "Use this for the remaining gap; use active run cards for what is happening right now.",
      },
    ];
    return rows;
  }, [
    authMode,
    commentGap,
    commentsCompletedPosts,
    commentsProcessed,
    commentsProgressPercent,
    commentsRunId,
    commentsRunStatus,
    commentsShardHealth.failed,
    commentsShardHealth.queued,
    commentsShardHealth.retrying,
    commentsShardHealth.running,
    commentsShardHealth.total,
    commentsThroughputLabel,
    commentsTotalPosts,
    completedPosts,
    completionSummary?.total_posts,
    completionYear,
    liveStatusDetail,
    progressPercent,
    reportedComments,
    runHasEnded,
    runId,
    runStatus,
    savedComments,
    totalPosts,
  ]);

  const issueRows = useMemo<IssueRow[]>(() => {
    const rows: IssueRow[] = [];
    if (error) {
      rows.push({
        key: "catalog-refresh-error",
        title: "Live catalog data could not load",
        detail: error,
        recommendation: "Keep the active run separate from this read error; reload only the dashboard data.",
        tone: "red",
      });
    }
    if (progress?.progress_degraded) {
      rows.push({
        key: "catalog-progress-degraded",
        title: "Post/details progress is using the last good update",
        detail: `Last good update${progress.progress_degraded_at ? ` from ${new Date(progress.progress_degraded_at).toLocaleString()}` : ""}${progress.progress_degraded_reason ? `: ${formatDiagnosticToken(progress.progress_degraded_reason)}` : ""}.`,
        recommendation: "Do not start a duplicate run; wait for a fresh worker heartbeat or inspect the stuck job.",
        tone: "amber",
      });
    }
    const dispatchHealth = progress?.dispatch_health;
    const dispatchBlocked = readFiniteNumber(dispatchHealth?.dispatch_blocked_jobs) ?? 0;
    const dispatchQueued =
      (readFiniteNumber(dispatchHealth?.queued_unclaimed_jobs) ?? 0) +
      (readFiniteNumber(dispatchHealth?.modal_pending_jobs) ?? 0) +
      (readFiniteNumber(dispatchHealth?.retrying_dispatch_jobs) ?? 0) +
      (readFiniteNumber(dispatchHealth?.stale_dispatch_failed_jobs) ?? 0);
    if (dispatchBlocked > 0 || dispatchQueued > 0 || dispatchHealth?.latest_dispatch_error) {
      rows.push({
        key: "catalog-dispatch",
        title: dispatchBlocked > 0 ? "Post/details dispatch is blocked" : "Post/details dispatch is retrying",
        detail:
          dispatchHealth?.latest_dispatch_error ||
          `${formatInteger(dispatchQueued)} queued or retrying dispatch jobs; ${formatInteger(dispatchBlocked)} blocked jobs.`,
        recommendation: "Clear the stuck post/details queue before launching more post/detail work.",
        tone: dispatchBlocked > 0 ? "red" : "amber",
      });
    }
    for (const alert of (progress?.alerts ?? []).slice(0, 3)) {
      const runtimeVersionAlert = isRuntimeVersionAlertCode(alert.code);
      rows.push({
        key: `catalog-alert-${alert.code}-${rows.length}`,
        title: formatOperationalAlertLabel(alert),
        detail:
          runtimeVersionAlert && String(alert.code).toLowerCase() === "runtime_version_drift"
            ? "More than one worker runtime has reported into this run. The run can keep saving progress, but behavior may differ until workers converge."
            : runtimeVersionAlert
              ? "This run is still using the runtime it started with. Requeue only if the newest worker image is required now."
              : alert.message,
        recommendation: runtimeVersionAlert
          ? "Cancel and requeue only when you need the current worker image immediately. Saved rows stay saved."
          : "Use worker details to decide whether this is transient or needs a targeted retry.",
        tone: alert.severity === "error" ? "red" : alert.severity === "info" ? "sky" : "amber",
      });
    }
    if (runHasEnded && (activeRun?.error_message || progress?.completion_gap_reason)) {
      rows.push({
        key: "catalog-ended",
        title: `Run ${formatStatusLabel(runStatus).toLowerCase()}`,
        detail: activeRun?.error_message || progress?.completion_gap_reason || "Run ended.",
        recommendation: "Treat attached pending lanes as historical for this run.",
        tone: runStatus.toLowerCase() === "failed" ? "red" : "amber",
      });
    }
    if (commentsProgressError) {
      rows.push({
        key: "comments-progress-error",
        title: "Comments progress poll is retrying",
        detail: commentsProgressError,
        recommendation: "Wait for the next comments progress refresh before cancelling shards.",
        tone: "amber",
      });
    }
    const commentsWarning = readString(commentsProgress?.warning_message);
    if (commentsWarning) {
      rows.push({
        key: "comments-warning",
        title: "Comments warning",
        detail: commentsWarning,
        recommendation: commentsWarning.toLowerCase().includes("blocked")
          ? "Repair comments auth before expecting more comments to save."
          : "Let comments continue unless the warning repeats without saved-count movement.",
        tone: commentsWarning.toLowerCase().includes("blocked") ? "red" : "amber",
      });
    }
    if (commentsShardHealth.failed > 0 || commentsShardHealth.retrying > 0) {
      rows.push({
        key: "comments-shards",
        title: "Comments shards need attention",
        detail: [
          commentsShardHealth.failed > 0 ? `${formatInteger(commentsShardHealth.failed)} failed` : null,
          commentsShardHealth.retrying > 0 ? `${formatInteger(commentsShardHealth.retrying)} retrying` : null,
          commentsShardHealth.issueReasons.length > 0
            ? `latest reasons: ${commentsShardHealth.issueReasons.join(", ")}`
            : null,
          "The comments run can still continue while individual shards retry.",
        ]
          .filter(Boolean)
          .join(". "),
        recommendation: "Cancel only a shard that is stale or no longer moving; failed or retrying shards do not mean the whole comments run is dead.",
        tone: commentsShardHealth.failed > 0 ? "red" : "amber",
      });
    }
    return rows.slice(0, 6);
  }, [
    activeRun?.error_message,
    commentsProgress?.warning_message,
    commentsProgressError,
    commentsShardHealth.failed,
    commentsShardHealth.issueReasons,
    commentsShardHealth.retrying,
    error,
    progress,
    runHasEnded,
    runStatus,
  ]);

  const recentHistory = useMemo(() => {
    const activeId = String(runId || "").trim().toLowerCase();
    return dedupeCatalogRuns(recentRuns)
      .filter((run) => getCatalogRunIdentity(run) !== activeId)
      .slice(0, 4);
  }, [recentRuns, runId]);

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-zinc-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-zinc-300 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href={canonicalCatalogUrl}
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
            >
              <ArrowLeftIcon aria-hidden="true" />
              Back to current catalog page
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">Catalog Backfill Command Center</h1>
              <Badge variant="outline">{variantLabel}</Badge>
              <Badge className={runIsActive ? "bg-sky-100 text-sky-800" : "bg-zinc-200 text-zinc-800"}>
                {formatStatusLabel(runStatus || (loading ? "loading" : "idle"))}
              </Badge>
            </div>
            <p className="mt-2 max-w-3xl text-sm text-zinc-600">
              @{normalizedHandle} read-only Alt 1 dashboard. Active worker progress, completion coverage, comments
              health, and old run history are separated so the live run is the first thing to watch.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => void refreshDashboard({ showLoading: true })}
              disabled={loading || checking || !hasAccess}
            >
              <RefreshCwIcon data-icon="inline-start" />
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
            <Button
              onClick={() => {
                window.location.href = canonicalCatalogUrl;
              }}
            >
              <ExternalLinkIcon data-icon="inline-start" />
              Open live controls
            </Button>
          </div>
        </header>

        {completionError && !error ? (
          <Alert className="border-amber-200 bg-amber-50 text-amber-950">
            <AlertTriangleIcon aria-hidden="true" />
            <AlertTitle>2026 completion summary temporarily unavailable</AlertTitle>
            <AlertDescription>{completionError}. Live run progress is still shown separately.</AlertDescription>
          </Alert>
        ) : null}

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Current Truth</p>
              <h2 className="mt-1 text-lg font-semibold text-zinc-900">Instagram Backfill Status</h2>
              <p className="mt-1 max-w-3xl text-sm text-zinc-500">
                Active run progress is the source of truth for what is running now. Coverage totals and old runs are
                context, not live worker movement.
              </p>
            </div>
            <span className="inline-flex w-fit rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700">
              @{normalizedHandle}
            </span>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {truthRows.map((row) => (
              <div key={row.key} className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{row.label}</p>
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

          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-600">
            <ActivityIcon aria-hidden="true" className="h-4 w-4 text-zinc-500" />
            <span className="font-semibold uppercase tracking-[0.16em] text-zinc-500">Live feed</span>
            <span className="font-medium text-zinc-900">{liveStatusDetail}</span>
            <span>Last refresh {lastUpdatedLabel}</span>
          </div>

          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-zinc-900">What is going wrong</h3>
              <span
                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                  issueRows.length > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {issueRows.length > 0 ? `${issueRows.length} item${issueRows.length === 1 ? "" : "s"}` : "No blocker"}
              </span>
            </div>
            {issueRows.length > 0 ? (
              <div className="mt-3 space-y-2">
                {issueRows.map((issue) => (
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
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <CheckCircle2Icon aria-hidden="true" className="mt-0.5 h-4 w-4" />
                <p>No blocking issue is reported. Worker retries can still appear below while the run keeps saving progress.</p>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {coverageMetrics.map((metric) => (
            <Card key={metric.label} className="bg-white">
              <CardHeader className="pb-2">
                <CardDescription>{metric.label}</CardDescription>
                <CardTitle className="text-xl">{metric.value}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-zinc-500">{metric.detail}</CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Shard Health</CardTitle>
              <CardDescription>
                Comments worker health from the attached comments run. Shards sit below the primary live status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex flex-wrap gap-2 text-xs text-zinc-600">
                <Badge variant="outline">{formatInteger(commentsShardHealth.running)} running</Badge>
                <Badge variant="outline">{formatInteger(commentsShardHealth.retrying)} retrying</Badge>
                <Badge variant="outline">{formatInteger(commentsShardHealth.queued)} queued</Badge>
                <Badge variant="outline">{formatInteger(commentsShardHealth.failed)} failed</Badge>
              </div>
              {commentsProgressError ? (
                <p className="text-sm text-amber-700">Comments shard details are retrying: {commentsProgressError}</p>
              ) : commentsShardPreviewRows.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shard</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Posts</TableHead>
                      <TableHead>Comments / speed</TableHead>
                      <TableHead>Latest issue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commentsShardPreviewRows.map((row, index) => (
                      <TableRow key={row.job_id || `${row.shard_index ?? index}`}>
                        <TableCell className="font-medium">{formatShardProgressLabel(row, index)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatStatusLabel(row.status ?? row.job_status)}</Badge>
                        </TableCell>
                        <TableCell className="text-zinc-600">{formatShardPostLabel(row)}</TableCell>
                        <TableCell className="text-zinc-600">{formatShardCommentsLabel(row)}</TableCell>
                        <TableCell className="text-amber-700">
                          {getShardIssueLabel(row) ? formatDiagnosticToken(getShardIssueLabel(row)) : "None"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : commentsRunId ? (
                <p className="text-sm text-zinc-500">
                  Comments run {shortRunId(commentsRunId)} is connected, but shard rows have not been reported yet.
                </p>
              ) : (
                <p className="text-sm text-zinc-500">No comments run is attached yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Worker and Lane Details</CardTitle>
              <CardDescription>Lower-priority catalog, details, comments, and media execution state.</CardDescription>
            </CardHeader>
            <CardContent>
              {laneRows.length === 0 ? (
                <p className="text-sm text-zinc-500">No active lane details yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lane</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {laneRows.map((row) => (
                      <TableRow key={row.label}>
                        <TableCell className="font-medium">{row.label}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{row.status}</Badge>
                        </TableCell>
                        <TableCell className="text-zinc-600">{row.detail}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle>History</CardTitle>
            <CardDescription>Current run is shown above, not repeated here.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {recentHistory.length === 0 ? (
              <p className="text-sm text-zinc-500">No older catalog runs need attention.</p>
            ) : (
              recentHistory.map((run) => (
                <div key={run.run_id || run.job_id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-zinc-950">Run {shortRunId(run.run_id)}</p>
                    <Badge variant="outline">{formatStatusLabel(run.status)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">
                    {run.created_at ? `Queued ${new Date(run.created_at).toLocaleString()}` : "Queued time not reported"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <footer className="flex flex-wrap items-center gap-3 pb-6 text-sm text-zinc-500">
          <Clock3Icon aria-hidden="true" />
          <span>Last refreshed {lastUpdatedLabel}. Mockup only; no workers were changed.</span>
        </footer>
      </div>
    </main>
  );
}
