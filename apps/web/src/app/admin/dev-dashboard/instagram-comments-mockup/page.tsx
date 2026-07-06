"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIcon,
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  Clock3Icon,
  ExternalLinkIcon,
  FilterIcon,
  PlayIcon,
  SearchIcon,
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
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAdminWithAuth as fetchAdminWithAuthBase } from "@/lib/admin/client-auth";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import type {
  SocialAccountCommentsRunProgress,
  SocialAccountCommentsTargetProgressRow,
  SocialAccountProfileSummary,
} from "@/lib/admin/social-account-profile";

const navItems = ["Overview", "Active run", "Workers", "Coverage", "Actions"];
const PLATFORM = "instagram";
const HANDLE = "bravotv";
const REFRESH_INTERVAL_MS = 5_000;
const ACTIVE_RUN_STATUSES = new Set(["queued", "pending", "retrying", "running", "cancelling"]);

type ProxyErrorPayload = {
  error?: string;
  message?: string;
  detail?: string | { message?: string };
};

type WorkerHealthRow = {
  group: string;
  count: number;
  status: string;
  detail: string;
  action: string;
};

type MovementRow = {
  label: string;
  title: string;
  detail: string;
};

type CoverageRow = {
  post: string;
  saved: string;
  gap: string;
  issue: string;
  next: string;
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

const firstFiniteNumber = (...values: unknown[]): number | null => {
  for (const value of values) {
    const numeric = readFiniteNumber(value);
    if (numeric !== null) return numeric;
  }
  return null;
};

const readRecordNumber = (record: Record<string, unknown> | null | undefined, keys: string[]): number | null => {
  if (!record) return null;
  for (const key of keys) {
    const numeric = readFiniteNumber(record[key]);
    if (numeric !== null) return numeric;
  }
  return null;
};

const formatStatusLabel = (value?: string | null): string => {
  const normalized = String(value || "").trim();
  if (!normalized) return "Idle";
  return normalized.replace(/_/g, " ").replace(/^./, (char) => char.toUpperCase());
};

const formatIssueLabel = (value?: string | null): string => {
  const normalized = String(value || "").trim();
  if (!normalized) return "Unknown";
  return normalized.replace(/_/g, " ");
};

const formatDurationEstimate = (seconds: number | null): string => {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) return "Unknown";
  const roundedMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
};

const formatSecondsPerPost = (seconds: number | null): string => {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) return "Unknown pace";
  if (seconds < 10) return `${seconds.toFixed(1)} sec per post`;
  return `${Math.round(seconds)} sec per post`;
};

const toProgressPercent = (completed: number | null, total: number | null): number => {
  if (completed === null || total === null || total <= 0) return 0;
  return Math.max(0, Math.min(100, (completed / total) * 100));
};

const mapRecordToTargetProgressRow = (row: Record<string, unknown>): SocialAccountCommentsTargetProgressRow => ({
  source_id: typeof row.source_id === "string" ? row.source_id : typeof row.post_id === "string" ? row.post_id : null,
  shortcode: typeof row.shortcode === "string" ? row.shortcode : typeof row.code === "string" ? row.code : null,
  latest_reason:
    typeof row.latest_reason === "string"
      ? row.latest_reason
      : typeof row.reason === "string"
        ? row.reason
        : typeof row.issue === "string"
          ? row.issue
          : null,
  latest_stop_reason: typeof row.latest_stop_reason === "string" ? row.latest_stop_reason : null,
  reported_comment_count: readFiniteNumber(row.reported_comment_count ?? row.reported_comments),
  saved_comment_count: readFiniteNumber(row.saved_comment_count ?? row.saved_comments),
  observed_comment_count: readFiniteNumber(row.observed_comment_count ?? row.observed_comments),
  missing_comment_gap: readFiniteNumber(row.missing_comment_gap ?? row.gap),
  retryable: typeof row.retryable === "boolean" ? row.retryable : undefined,
  network_stopped: typeof row.network_stopped === "boolean" ? row.network_stopped : undefined,
});

const getProgressTargetRows = (progress: SocialAccountCommentsRunProgress | null): SocialAccountCommentsTargetProgressRow[] => {
  const rows = progress?.target_progress_rows ?? progress?.target_progress ?? progress?.retry_progress?.target_progress_rows ?? [];
  if (Array.isArray(rows) && rows.length > 0) return rows.slice(0, 4);
  const fallbackRows =
    progress?.retry_progress?.largest_remaining_gaps ??
    progress?.largest_remaining_gaps ??
    progress?.largest_gaps ??
    progress?.incomplete_targets ??
    [];
  return Array.isArray(fallbackRows) ? fallbackRows.slice(0, 4).map(mapRecordToTargetProgressRow) : [];
};

const buildRequestError = (payload: ProxyErrorPayload, fallback: string): Error => {
  const detailMessage = typeof payload.detail === "object" ? payload.detail?.message : payload.detail;
  return new Error(payload.error || payload.message || detailMessage || fallback);
};

export default function InstagramCommentsMockupPage() {
  const { user, checking, hasAccess } = useAdminGuard();
  const [summary, setSummary] = useState<SocialAccountProfileSummary | null>(null);
  const [progress, setProgress] = useState<SocialAccountCommentsRunProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const hasLoadedRef = useRef(false);
  const handle = HANDLE;
  const canonicalCommentsUrl = "/social/instagram/bravotv/comments";
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
  const refreshDashboard = useCallback(async (options?: { showLoading?: boolean }) => {
    if (checking || !user || !hasAccess) {
      setLoading(false);
      return;
    }
    if (options?.showLoading || !hasLoadedRef.current) setLoading(true);
    setError(null);
    try {
      const summaryResponse = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${PLATFORM}/${HANDLE}/summary?detail=lite`,
        undefined,
        { preferredUser: user },
      );
      const summaryPayload = (await summaryResponse.json().catch(() => ({}))) as SocialAccountProfileSummary & ProxyErrorPayload;
      if (!summaryResponse.ok) {
        throw buildRequestError(summaryPayload, "Failed to load comments summary");
      }
      setSummary(summaryPayload);
      const activeRunId = String(summaryPayload.comments_coverage?.active_run_id || "").trim();
      if (activeRunId) {
        const progressResponse = await fetchAdminWithAuth(
          `/api/admin/trr-api/social/profiles/${PLATFORM}/${HANDLE}/comments/runs/${encodeURIComponent(activeRunId)}/progress`,
          undefined,
          { preferredUser: user },
        );
        const progressPayload = (await progressResponse.json().catch(() => ({}))) as SocialAccountCommentsRunProgress &
          ProxyErrorPayload;
        if (!progressResponse.ok) {
          throw buildRequestError(progressPayload, "Failed to load comments run progress");
        }
        setProgress(progressPayload);
      } else {
        setProgress(null);
      }
      setLastUpdatedAt(new Date());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load live comments data");
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
    }
  }, [checking, fetchAdminWithAuth, hasAccess, user]);

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
      window.clearInterval(intervalId);
    };
  }, [checking, hasAccess, refreshDashboard, user]);

  const coverage = summary?.comments_coverage ?? null;
  const savedSummary = summary?.comments_saved_summary ?? null;
  const runStatus = String(progress?.run_status || coverage?.effective_status || coverage?.last_comments_run_status || "").trim();
  const normalizedRunStatus = runStatus.toLowerCase();
  const runIsActive = ACTIVE_RUN_STATUSES.has(normalizedRunStatus);
  const runId = String(progress?.run_id || coverage?.active_run_id || "").trim();
  const runIdLabel = runId ? runId.slice(0, 8) : "none";
  const progressSummary = readRecord(progress?.summary);
  const completedPosts = firstFiniteNumber(progress?.post_progress?.completed_posts, progress?.post_progress?.matched_posts);
  const totalPosts = firstFiniteNumber(progress?.post_progress?.total_posts, progress?.target_source_ids_count, coverage?.eligible_posts);
  const progressPercent = toProgressPercent(completedPosts, totalPosts);
  const commentsProcessed = readRecordNumber(progressSummary, ["comments_processed_total", "items_found_total"]);
  const commentsInserted = readRecordNumber(progressSummary, ["comments_inserted_total", "new_comments_total"]);
  const savedComments = firstFiniteNumber(savedSummary?.saved_comments);
  const reportedComments = firstFiniteNumber(savedSummary?.retrieved_comments);
  const openGap =
    savedComments !== null && reportedComments !== null
      ? Math.max(0, reportedComments - savedComments)
      : firstFiniteNumber(coverage?.missing_posts, 0);
  const postsPerMinute = firstFiniteNumber(progress?.throughput?.posts_per_minute);
  const estimatedSecondsRemaining =
    firstFiniteNumber(progress?.throughput?.estimated_seconds_remaining) ??
    (postsPerMinute !== null && postsPerMinute > 0 && completedPosts !== null && totalPosts !== null
      ? (Math.max(0, totalPosts - completedPosts) / postsPerMinute) * 60
      : null);
  const etaLabel = formatDurationEstimate(estimatedSecondsRemaining);
  const averageSecondsPerPost = firstFiniteNumber(progress?.throughput?.average_seconds_per_post);
  const runningWorkers = firstFiniteNumber(progress?.running_comment_jobs, progress?.active_comment_jobs, progress?.worker_counters?.running, progress?.worker_counters?.active) ?? 0;
  const retryingWorkers = firstFiniteNumber(progress?.retrying_comment_jobs, progress?.worker_counters?.retrying) ?? 0;
  const failedWorkers = firstFiniteNumber(progress?.failed_comment_jobs, progress?.worker_counters?.failed) ?? 0;
  const queuedWorkers = firstFiniteNumber(progress?.queued_comment_jobs, progress?.worker_counters?.queued) ?? 0;
  const shardCount =
    firstFiniteNumber(progress?.comments_shard_count, progress?.worker_counters?.total) ??
    runningWorkers + retryingWorkers + failedWorkers + queuedWorkers;
  const attentionCount = failedWorkers + retryingWorkers;
  const attentionTitle =
    attentionCount > 0
      ? `${formatInteger(failedWorkers)} failed shard, ${formatInteger(retryingWorkers)} retrying shard`
      : "No shard action needed";
  const attentionDetail =
    attentionCount > 0
      ? "The whole run is not failed. Cancel only a shard that stays stuck after another refresh."
      : "Workers look healthy. Let the run continue.";
  const proof = progress?.instagram_access_proof;
  const authState = String(proof?.auth_state || proof?.cookie_state || "").trim();
  const authLabel = proof?.no_cookies ? "No cookies" : authState ? formatStatusLabel(authState) : "Not reported";
  const networkMode = proof?.proof_label || [
    proof?.no_cookies ? "No cookies" : proof?.cookie_state,
    proof?.no_decodo ? "no Decodo" : proof?.decodo_state,
  ].filter(Boolean).join(" · ") || "Live progress source";
  const workerRows = useMemo<WorkerHealthRow[]>(
    () => [
      {
        group: "Running",
        count: runningWorkers,
        status: runningWorkers > 0 ? "Healthy" : "Idle",
        detail: runningWorkers > 0 ? "Workers are saving comments" : "No active comments worker reported",
        action: runningWorkers > 0 ? "Leave running" : "Wait",
      },
      {
        group: "Retrying",
        count: retryingWorkers,
        status: retryingWorkers > 0 ? "Watch" : "Clear",
        detail: retryingWorkers > 0 ? "Retry is expected during public relay blocks" : "No retrying shard reported",
        action: retryingWorkers > 0 ? "Wait" : "No action",
      },
      {
        group: "Failed",
        count: failedWorkers,
        status: failedWorkers > 0 ? "Needs check" : "Clear",
        detail: failedWorkers > 0 ? "Cancel only if it stays failed without movement" : "No failed shard reported",
        action: failedWorkers > 0 ? "Inspect shard" : "No action",
      },
      {
        group: "Queued",
        count: queuedWorkers,
        status: queuedWorkers > 0 ? "Waiting" : "Clear",
        detail: queuedWorkers > 0 ? "Queued behind active workers" : "No queued shard reported",
        action: queuedWorkers > 0 ? "No action" : "No action",
      },
    ],
    [failedWorkers, queuedWorkers, retryingWorkers, runningWorkers],
  );
  const metrics = useMemo(
    () => [
      {
        label: "Saved comments",
        value: formatInteger(savedComments),
        detail:
          commentsInserted !== null && commentsInserted > 0
            ? `${formatInteger(commentsInserted)} new this run`
            : "Live saved total",
      },
      {
        label: "Open gap",
        value: formatInteger(openGap),
        detail: "Reported minus saved",
      },
      {
        label: "Posts checked",
        value:
          completedPosts !== null && totalPosts !== null
            ? `${formatInteger(completedPosts)} / ${formatInteger(totalPosts)}`
            : "Waiting",
        detail: progress?.incomplete_fill ? "Incomplete fill scope" : "Active run scope",
      },
      {
        label: "Estimated finish",
        value: etaLabel,
        detail: formatSecondsPerPost(averageSecondsPerPost),
      },
    ],
    [averageSecondsPerPost, commentsInserted, completedPosts, etaLabel, openGap, progress?.incomplete_fill, savedComments, totalPosts],
  );
  const movement = useMemo<MovementRow[]>(
    () => [
      {
        label: "Now",
        title: runIsActive ? "Run is active" : runStatus ? `Run is ${formatStatusLabel(runStatus).toLowerCase()}` : "No active run",
        detail:
          runningWorkers > 0
            ? `${formatInteger(runningWorkers)} workers are running and comments are still being fetched.`
            : "No running comments worker is currently reported.",
      },
      {
        label: "Last refresh",
        title:
          commentsProcessed !== null
            ? `${formatInteger(commentsProcessed)} comments fetched`
            : "Waiting for comments movement",
        detail:
          commentsInserted !== null
            ? `${formatInteger(commentsInserted)} were new saved comments.`
            : "New saved comment count is not present in the latest progress payload.",
      },
      {
        label: "Next",
        title: attentionCount > 0 ? "Watch shard movement" : "Let the run continue",
        detail: progress?.operator_next_action || progress?.recommended_next_action || progress?.recommended_action || attentionDetail,
      },
    ],
    [
      attentionCount,
      attentionDetail,
      commentsInserted,
      commentsProcessed,
      progress?.operator_next_action,
      progress?.recommended_action,
      progress?.recommended_next_action,
      runIsActive,
      runStatus,
      runningWorkers,
    ],
  );
  const coverageRows = useMemo<CoverageRow[]>(() => {
    const rows = getProgressTargetRows(progress);
    return rows.map((row, index) => {
      const post = String(row.shortcode || row.source_id || `target-${index + 1}`);
      const saved = firstFiniteNumber(row.saved_comment_count, row.observed_comment_count) ?? 0;
      const reported = firstFiniteNumber(row.reported_comment_count) ?? 0;
      const gap = firstFiniteNumber(row.missing_comment_gap) ?? Math.max(0, reported - saved);
      const reason = row.network_stopped ? "Network stopped" : formatIssueLabel(row.latest_reason || row.fetch_reason || row.latest_stop_reason || row.cursor_stop_reason);
      return {
        post,
        saved: `${formatInteger(saved)} / ${formatInteger(reported)}`,
        gap: formatInteger(gap),
        issue: reason,
        next: row.retryable === false ? "Inspect manually" : "Retry automatically",
      };
    });
  }, [progress]);
  const displayedCoverageRows =
    coverageRows.length > 0
      ? coverageRows
      : [
          {
            post: "No target rows",
            saved: "0 / 0",
            gap: "0",
            issue: progress ? "Latest progress payload has no target rows" : "Waiting for active progress",
            next: "Refresh",
          },
        ];
  const lastUpdatedLabel = lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString() : "Not loaded yet";

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[220px_1fr]">
        <aside className="hidden border-b border-zinc-200 bg-white lg:block lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col gap-6 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">TRR Admin</p>
              <h1 className="mt-2 text-lg font-semibold tracking-normal text-zinc-950">Instagram Comments</h1>
              <p className="mt-1 text-sm text-zinc-500">@{handle}</p>
            </div>
            <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
              {navItems.map((item, index) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    index === 1 ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                  }`}
                >
                  {item}
                </a>
              ))}
            </nav>
            <div className="mt-auto hidden rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600 lg:block">
              <p className="font-medium text-zinc-950">Run {runIdLabel}</p>
              <p className="mt-1">
                {runStatus ? `${formatStatusLabel(runStatus)} with ${formatInteger(attentionCount)} shards needing attention.` : "Loading run state."}
              </p>
            </div>
          </div>
        </aside>

        <section className="px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-5">
            <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <Link
                  href={canonicalCommentsUrl}
                  className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-950"
                >
                  <ArrowLeftIcon aria-hidden="true" />
                  Back to current dashboard
                </Link>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold tracking-normal text-zinc-950">Comments recovery</h2>
                  <Badge variant="outline">Mockup</Badge>
                  <Badge className={runIsActive ? "bg-sky-50 text-sky-700" : "bg-zinc-100 text-zinc-700"}>
                    {formatStatusLabel(runStatus || (loading ? "loading" : "idle"))}
                  </Badge>
                </div>
                <p className="mt-2 max-w-2xl text-sm text-zinc-600">
                  {loading && !summary
                    ? "Loading live comments progress..."
                    : runIsActive
                      ? "One run is active. Let it continue unless shard problems repeat without saved-count movement."
                      : "No active comments run is currently reported by the live summary."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => void refreshDashboard({ showLoading: true })}
                  disabled={loading || checking || !hasAccess}
                >
                  <FilterIcon data-icon="inline-start" />
                  {loading ? "Refreshing..." : "Refresh"}
                </Button>
                <Button onClick={() => { window.location.href = canonicalCommentsUrl; }}>
                  <PlayIcon data-icon="inline-start" />
                  Open live dashboard
                </Button>
              </div>
            </header>

            {error ? (
              <Alert variant="destructive">
                <AlertTriangleIcon aria-hidden="true" />
                <AlertTitle>Live data could not load</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <section id="active-run" className="grid gap-5 xl:grid-cols-[1.5fr_0.85fr]">
              <Card className="bg-white">
                <CardHeader className="border-b">
                  <CardTitle>Active comments run</CardTitle>
                  <CardDescription>
                    Run {runIdLabel} · {progress?.incomplete_fill ? "incomplete fill" : "comments sync"} · {formatInteger(shardCount)} shards · {networkMode}
                  </CardDescription>
                  <Badge className="justify-self-start" variant="secondary">
                    {formatInteger(runningWorkers)} workers running
                  </Badge>
                </CardHeader>
                <CardContent className="flex flex-col gap-5 pt-1">
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-zinc-950">
                        {completedPosts !== null && totalPosts !== null
                          ? `${formatInteger(completedPosts)} of ${formatInteger(totalPosts)} posts checked`
                          : "Waiting for post progress"}
                      </span>
                      <span className="text-zinc-500">{Math.round(progressPercent)}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-3 bg-zinc-200" />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {metrics.map((metric) => (
                      <div key={metric.label} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{metric.label}</p>
                        <p className="mt-2 text-xl font-semibold tracking-normal text-zinc-950">{metric.value}</p>
                        <p className="mt-1 text-xs text-zinc-500">{metric.detail}</p>
                      </div>
                    ))}
                  </div>

                  <Alert className="border-sky-200 bg-sky-50 text-sky-950">
                    <ActivityIcon aria-hidden="true" />
                    <AlertTitle>Current status</AlertTitle>
                    <AlertDescription>
                      {commentsProcessed !== null
                        ? `Comments are still moving: ${formatInteger(commentsProcessed)} fetched this run, ${formatInteger(commentsInserted)} newly saved, about ${etaLabel} left.`
                        : "Waiting for live comments movement from the active run progress endpoint."}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <Card id="actions" className="bg-white">
                <CardHeader>
                  <CardTitle>Needs attention</CardTitle>
                  <CardDescription>Only one item needs a decision right now.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <AlertTriangleIcon aria-hidden="true" className="mt-0.5 text-amber-700" />
                    <div>
                      <p className="font-medium text-amber-950">{attentionTitle}</p>
                      <p className="mt-1 text-sm text-amber-800">
                        {attentionDetail}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-zinc-600">Auth state</span>
                      <Badge className={proof?.no_cookies ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}>
                        {authLabel}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-zinc-600">Network mode</span>
                      <span className="font-medium text-zinc-950">{networkMode}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-zinc-600">Next action</span>
                      <span className="font-medium text-zinc-950">{attentionCount > 0 ? "Watch" : "Wait"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
              <Card id="workers" className="bg-white">
                <CardHeader>
                  <CardTitle>Worker health</CardTitle>
                  <CardDescription>Grouped by what an operator should do, not by raw shard logs.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table className="min-w-[680px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Group</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Plain-language detail</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workerRows.map((row) => (
                          <TableRow key={row.group}>
                            <TableCell className="font-medium">
                              {formatInteger(row.count)} {row.group.toLowerCase()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={row.status === "Healthy" ? "secondary" : "outline"}>{row.status}</Badge>
                            </TableCell>
                            <TableCell className="text-zinc-600">{row.detail}</TableCell>
                            <TableCell className="text-right font-medium text-zinc-950">{row.action}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>Recent movement</CardTitle>
                  <CardDescription>Short updates, no duplicate run summaries.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="flex flex-col gap-4">
                    {movement.map((item, index) => (
                      <li key={item.label} className="grid grid-cols-[88px_1fr] gap-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{item.label}</div>
                        <div className="relative pb-4">
                          {index < movement.length - 1 ? (
                            <span className="absolute left-1 top-4 h-full w-px bg-zinc-200" aria-hidden="true" />
                          ) : null}
                          <div className="relative flex gap-3">
                            <span className="mt-1 size-2 rounded-full bg-zinc-950" aria-hidden="true" />
                            <div>
                              <p className="font-medium text-zinc-950">{item.title}</p>
                              <p className="mt-1 text-sm text-zinc-600">{item.detail}</p>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </section>

            <Card id="coverage" className="bg-white">
              <CardHeader className="border-b">
                <CardTitle>Coverage queue</CardTitle>
                <CardDescription>Posts with the largest open comment gaps.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <label className="relative block w-full sm:max-w-sm">
                  <SearchIcon
                    aria-hidden="true"
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <Input className="pl-8" placeholder="Search post or issue" />
                </label>
                <div className="overflow-x-auto">
                  <Table className="min-w-[760px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Post</TableHead>
                        <TableHead>Saved</TableHead>
                        <TableHead>Gap</TableHead>
                        <TableHead>Issue</TableHead>
                        <TableHead className="text-right">Next step</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedCoverageRows.map((row) => (
                        <TableRow key={row.post}>
                          <TableCell className="font-medium text-blue-700">{row.post}</TableCell>
                          <TableCell>{row.saved}</TableCell>
                          <TableCell className="font-semibold text-amber-700">{row.gap}</TableCell>
                          <TableCell className="text-zinc-600">{row.issue}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              {row.next}
                              <ExternalLinkIcon data-icon="inline-end" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <footer className="flex flex-wrap items-center gap-3 pb-6 text-sm text-zinc-500">
              <CheckCircle2Icon aria-hidden="true" className="text-emerald-700" />
              <span>Live numbers are loaded from @bravotv summary and comments progress APIs.</span>
              <span className="hidden text-zinc-300 sm:inline">/</span>
              <Clock3Icon aria-hidden="true" />
              <span>Last refreshed {lastUpdatedLabel}. Mockup only; no workers were changed.</span>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}
