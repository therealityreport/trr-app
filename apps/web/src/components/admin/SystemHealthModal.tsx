"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import AdminModal from "@/components/admin/AdminModal";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { useAdminLiveStatus } from "@/lib/admin/admin-live-status";

type WorkerEntry = {
  worker_id: string;
  stage: string;
  status: string;
  run_id?: string | null;
  current_job_id?: string | null;
  supported_platforms?: string[] | null;
  metadata?: Record<string, unknown> | null;
  last_seen_at: string | null;
  is_healthy: boolean;
};

type WorkerHealth = {
  healthy: boolean;
  healthy_workers: number;
  fresh_workers: number;
  stale_workers: number;
  stale_hidden_count: number;
  active_workers: number;
  total_workers: number;
  stale_after_seconds: number;
  by_stage?: Record<string, { total: number; healthy: number; fresh: number }>;
  by_platform?: Record<string, { total: number; healthy: number; fresh: number }>;
  executor_backend?: string | null;
  dispatch_enabled?: boolean;
  dispatcher_heartbeat_fresh?: boolean;
  active_invocations?: number;
  oldest_queued_age_seconds?: number | null;
  stale_running_count?: number;
  last_dispatch_success_at?: string | null;
  last_dispatch_error?: string | null;
  last_dispatch_blocked_reason?: string | null;
  dispatcher_readiness?: {
    resolved?: boolean;
    reason?: string | null;
    error?: string | null;
    app_name?: string | null;
    function_name?: string | null;
    modal_environment?: string | null;
  } | null;
  remote_auth_capabilities?: {
    instagram?: {
      required?: boolean;
      executor_backend?: string | null;
      total_authenticated_workers?: number;
      fresh_authenticated_workers?: number;
      healthy_authenticated_workers?: number;
      ready?: boolean;
      reason?: string | null;
      missing_hints?: string[];
    } | null;
  } | null;
  shared_account_backfill_readiness?: {
    ready?: boolean;
    reason?: string | null;
    dispatcher_ready?: boolean;
    dispatcher_heartbeat_fresh?: boolean;
    instagram_remote_auth_ready?: boolean;
  } | null;
  workers: WorkerEntry[];
  reason: string | null;
};

type FailureEntry = {
  id: string;
  run_id: string | null;
  platform: string;
  job_type: string;
  status: string;
  error_message: string | null;
  last_error_code: string | null;
  last_error_class: string | null;
  created_at: string;
  completed_at: string | null;
};

type StuckJobEntry = {
  id: string;
  run_id: string | null;
  platform: string;
  job_type: string;
  status: string;
  worker_id: string | null;
  created_at: string;
  heartbeat_at: string | null;
  available_at: string | null;
  error_message: string | null;
  last_error_code: string | null;
  stuck_reason: string;
  stuck_for_seconds: number;
};

type RunningJobEntry = {
  id: string;
  run_id: string | null;
  platform: string;
  job_type: string;
  stage: string;
  account_handle: string | null;
  worker_id: string | null;
  started_at: string | null;
  heartbeat_at: string | null;
  dispatch_backend?: string | null;
  required_execution_backend?: string | null;
};

type WorkerDetail = {
  worker: {
    worker_id: string;
    stage: string;
    status: string;
    run_id: string | null;
    current_job_id: string | null;
    started_at: string | null;
    last_seen_at: string | null;
    supported_platforms?: string[] | null;
    metadata: Record<string, unknown>;
    is_healthy: boolean;
  };
  current_job: {
    id: string;
    run_id: string | null;
    platform: string;
    job_type: string;
    status: string;
    stage: string;
    account_handle: string | null;
    items_found: number;
    attempt_count: number;
    max_attempts: number;
    started_at: string | null;
    heartbeat_at: string | null;
    error_message: string | null;
    last_error_code: string | null;
    metadata: Record<string, unknown>;
  } | null;
  run: {
    run_id: string | null;
    status: string | null;
    source_scope: string | null;
    execution_owner?: string | null;
    execution_mode_canonical?: string | null;
    execution_backend_canonical?: string | null;
    created_at: string | null;
    started_at: string | null;
    completed_at: string | null;
    summary: Record<string, unknown>;
  } | null;
  currently_scraping: string | null;
  progress_made: {
    items_found: number;
    posts_upserted: number;
    comments_upserted: number;
    stage_counters: Record<string, unknown>;
    phase: string | null;
  };
};

type DebugJobResult = {
  job_id: string;
  run_id: string | null;
  model_used: string;
  fallback_used: boolean;
  analysis: {
    root_cause: string;
    confidence: number;
    files_touched: string[];
    tests_to_run: string[];
  };
  patch_unified_diff: string;
  apply: {
    enabled: boolean;
    requested: boolean;
    applied: boolean;
    check_ok: boolean;
    error: string | null;
    files_changed: string[];
  };
};

type QueueStatus = {
  queue_enabled: boolean;
  remote_plane?: {
    execution_mode_canonical?: string | null;
    execution_owner?: string | null;
    execution_backend_canonical?: string | null;
    remote_job_plane_enforced?: boolean;
  };
  workers: WorkerHealth;
  queue: {
    by_status: Record<string, number>;
    by_stage?: Record<string, Record<string, number>>;
    by_stage_platform?: Record<string, Record<string, Record<string, number>>>;
    runs_by_status?: Record<string, number>;
    runs_total?: number;
    by_platform: Record<string, Record<string, number>>;
    by_job_type: Record<string, Record<string, number>>;
    running_jobs: RunningJobEntry[];
    stale_claims?: {
      total: number;
      by_reason: Record<string, number>;
      by_platform: Record<string, number>;
      by_stage: Record<string, number>;
    };
    recent_failures: FailureEntry[];
    stuck_jobs: StuckJobEntry[];
    stuck_jobs_total: number;
    dispatch_blocked_jobs?: StuckJobEntry[];
    dispatch_blocked_jobs_total?: number;
    dispatch_blocked_by_reason?: Record<string, number>;
    waiting_for_claim_jobs_total?: number;
    retrying_dispatch_jobs_total?: number;
    error?: string;
  };
};

type AdminOperationHealthEntry = {
  id: string;
  operation_type: string;
  status: string;
  claimed_by_worker_id?: string | null;
  execution_owner?: string | null;
  execution_mode_canonical?: string | null;
  execution_backend_canonical?: string | null;
  latest_phase?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  heartbeat_at?: string | null;
  cancel_requested_at?: string | null;
  age_seconds?: number | null;
  last_update_age_seconds?: number | null;
  cancel_requested_age_seconds?: number | null;
  is_stale?: boolean;
  stale_reason?: string | null;
};

type AdminOperationsHealth = {
  summary: {
    active_total: number;
    stale_total: number;
    cancelling_total: number;
    by_status: Record<string, number>;
    by_type: Record<string, number>;
    runtime_split: {
      modal: number;
      local: number;
      other: number;
      unknown: number;
    };
    stale_after_seconds: number;
    cancelling_grace_seconds: number;
  };
  active_operations: AdminOperationHealthEntry[];
  stale_operations: AdminOperationHealthEntry[];
  updated_at?: string;
};

type HealthDotStatus = {
  queue_enabled: boolean;
  workers: {
    healthy: boolean;
    healthy_workers: number;
  };
  queue: {
    by_status: Record<string, number>;
  };
  updated_at?: string;
};

type HealthState = "healthy" | "degraded" | "down" | "loading" | "error";

type SharedHealthSnapshot = {
  data: HealthDotStatus | null;
  error: string | null;
  lastFetchedMs: number | null;
};

type SharedHealthSubscriber = {
  shouldPoll: boolean;
  onUpdate: (snapshot: SharedHealthSnapshot) => void;
};

const IS_DEV_ENV = process.env.NODE_ENV !== "production";
const HEALTH_DOT_POLL_BASE_INTERVAL_MS = 5_000;
const HEALTH_DOT_POLL_IDLE_INTERVAL_MS = 15_000;
const HEALTH_DOT_POLL_DEEP_IDLE_INTERVAL_MS = 30_000;
const HEALTH_DOT_POLL_IDLE_AFTER_MS = 30_000;
const HEALTH_DOT_POLL_DEEP_IDLE_AFTER_MS = 120_000;
const QUEUE_STATUS_POLL_INTERVAL_MS = 5_000;
const FOLLOWER_CHECK_INTERVAL_MS = 5_000;
const HEALTH_DOT_FETCH_TIMEOUT_MS = 12_000;
const QUEUE_STATUS_FETCH_TIMEOUT_MS = 30_000;
const STARTUP_JITTER_MIN_MS = 200;
const STARTUP_JITTER_MAX_MS = 1_800;
const LEASE_DURATION_MS = 45_000;

const HEALTH_DOT_URL = "/api/admin/trr-api/social/ingest/health-dot";
const QUEUE_STATUS_URL = "/api/admin/trr-api/social/ingest/queue-status";
const CANCEL_STUCK_JOBS_URL = "/api/admin/trr-api/social/ingest/stuck-jobs/cancel";
const CANCEL_DISPATCH_BLOCKED_JOBS_URL = "/api/admin/trr-api/social/ingest/dispatch-blocked-jobs/cancel";
const CANCEL_ACTIVE_JOBS_URL = "/api/admin/trr-api/social/ingest/active-jobs/cancel";
const RESET_SOCIAL_INGEST_HEALTH_URL = "/api/admin/trr-api/social/ingest/reset-health";
const DISMISS_RECENT_FAILURES_URL = "/api/admin/trr-api/social/ingest/recent-failures/dismiss";
const PURGE_INACTIVE_WORKERS_URL = "/api/admin/trr-api/social/ingest/workers/purge-inactive";
const WORKER_DETAIL_URL_BASE = "/api/admin/trr-api/social/ingest/workers";
const DEBUG_JOB_URL_BASE = "/api/admin/trr-api/social/ingest/jobs";
const ADMIN_OPERATIONS_HEALTH_URL = "/api/admin/trr-api/operations/health";
const CANCEL_ACTIVE_ADMIN_OPERATIONS_URL = "/api/admin/trr-api/operations/cancel";
const CANCEL_STALE_ADMIN_OPERATIONS_URL = "/api/admin/trr-api/operations/stale/cancel";
const ADMIN_OPERATIONS_HEALTH_LIMIT = 100;

const LEASE_STORAGE_KEY = "trr:admin:health-dot:leader:v1";
const SNAPSHOT_STORAGE_KEY = "trr:admin:health-dot:snapshot:v1";
const BROADCAST_CHANNEL_NAME = "trr-admin-health-dot";

type LeaderLease = {
  tabId: string;
  expiresAt: number;
};

const createTabId = (): string => {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `tab-${Date.now()}-${randomPart}`;
};

const isSocialAdminPath = (pathname: string): boolean => {
  const normalized = pathname.toLowerCase();
  return (
    normalized.startsWith("/admin/social") ||
    normalized.includes("/social-media") ||
    normalized.includes("/social/") ||
    normalized.includes("/reddit")
  );
};

function healthState(data: HealthDotStatus | null, error: string | null): HealthState {
  if (error) return "error";
  if (!data) return "loading";
  if (!data.queue_enabled) return "down";
  if (!data.workers.healthy) return "degraded";
  return "healthy";
}

function healthDotColor(state: HealthState): string {
  switch (state) {
    case "healthy":
      return "bg-emerald-500";
    case "degraded":
      return "bg-black";
    case "down":
    case "error":
      return "border border-black bg-white";
    case "loading":
      return "border border-black/40 bg-white";
  }
}

function healthLabel(state: HealthState): string {
  switch (state) {
    case "healthy":
      return "Healthy";
    case "degraded":
      return "Degraded";
    case "down":
      return "Down";
    case "error":
      return "Error";
    case "loading":
      return "Loading";
  }
}

function relativeTime(iso: string | null): string {
  if (!iso) return "-";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function truncate(value: string | null, max: number): string {
  if (!value) return "-";
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function normalizeFetchErrorMessage(error: unknown, fallback = "Fetch failed"): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return error.message || "Request timed out";
  }
  if (error instanceof Error) {
    const normalized = error.message.trim().toLowerCase();
    if (
      normalized.includes("signal is aborted without reason") ||
      normalized.includes("aborted without reason") ||
      normalized.includes("request aborted")
    ) {
      return "Request timed out";
    }
    return error.message || fallback;
  }
  return fallback;
}

type WorkerOrigin = "aws" | "local" | "unknown";

type SummaryCardTone = "neutral" | "good" | "warn" | "bad";

type SummaryCardViewModel = {
  title: string;
  value: string;
  detail: string;
  tone?: SummaryCardTone;
};

type WorkerStageCardViewModel = {
  key: string;
  label: string;
  countsLabel: string;
};

type LiveWorkerRowViewModel = {
  worker: WorkerEntry;
  origin: WorkerOrigin;
  roleLabel: string;
  hostLabel: string;
  currentRunLabel: string | null;
  platformLabel: string | null;
  rawIdLabel: string;
};

type QueueBreakdownRowViewModel = {
  key: string;
  label: string;
  running: number;
  waiting: number;
  failed: number;
  completed: number;
};

type ProblemFailureViewModel = {
  id: string;
  platformLabel: string;
  stageLabel: string;
  runLabel: string | null;
  ageLabel: string;
  summary: string;
  rawDetail: string | null;
};

type SystemHealthViewModel = {
  statusSummary: string;
  summaryCards: SummaryCardViewModel[];
  executionOwnerLabel: string;
  executionBackendLabel: string;
  executionModeLabel: string;
  executionPolicyLabel: string;
  instagramRemoteAuthLabel: string;
  instagramRemoteAuthDetail: string;
  sharedAccountBackfillReadinessLabel: string;
  sharedAccountBackfillReadinessDetail: string;
  workerStageCards: WorkerStageCardViewModel[];
  staleClaimsSummary: string;
  queueStatusCards: SummaryCardViewModel[];
  queueBreakdownByPlatform: QueueBreakdownRowViewModel[];
  queueBreakdownByStage: QueueBreakdownRowViewModel[];
  workersSummaryLabel: string;
  olderWorkerCheckinsHiddenLabel: string | null;
  nonAwsWorkersHiddenLabel: string | null;
  liveWorkers: LiveWorkerRowViewModel[];
  recentFailureSummary: string;
  recentFailures: ProblemFailureViewModel[];
};

function preferAwsWorkerRows(backend: string | null | undefined): boolean {
  return String(backend ?? "").trim().toLowerCase() !== "modal";
}

function resolveWorkerOrigin(worker: WorkerEntry): WorkerOrigin {
  const workerId = String(worker.worker_id || "").trim();
  const hostFromWorkerId = workerId.split(":")[1]?.trim().toLowerCase() ?? "";
  const metadataHostname = String(worker.metadata?.hostname ?? "")
    .trim()
    .toLowerCase();
  const host = metadataHostname || hostFromWorkerId;
  if (!host) return "unknown";
  if (host.endsWith(".ec2.internal")) return "aws";
  if (host === "localhost" || host.endsWith(".local")) return "local";
  return "unknown";
}

function titleCaseWords(value: string): string {
  return value
    .split(/[\s_/-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatStageLabel(stage: string): string {
  const normalized = String(stage || "").trim().toLowerCase();
  switch (normalized) {
    case "posts":
      return "Posts";
    case "comments":
      return "Comments";
    case "media_mirror":
      return "Media mirror";
    case "comment_media_mirror":
      return "Comment media mirror";
    default:
      return titleCaseWords(normalized || "Unknown stage");
  }
}

function formatAdminOperationTypeLabel(operationType: string | null | undefined): string {
  const normalized = String(operationType ?? "").trim().toLowerCase();
  if (!normalized) return "Unknown operation";
  return normalized
    .replace(/^admin_/, "")
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatWorkerRoleLabel(stage: string): string {
  return `${formatStageLabel(stage)} worker`;
}

function formatSupportedPlatformsLabel(platforms: string[] | null | undefined): string | null {
  if (!platforms || platforms.length === 0) return null;
  return platforms.map((platform) => titleCaseWords(platform)).join(", ");
}

function formatWorkerActivityLabel(worker: WorkerEntry): string {
  const role = formatStageLabel(worker.stage).toLowerCase();
  const runLabel = worker.run_id ? `run ${truncate(worker.run_id, 8)}` : null;
  const normalizedStatus = String(worker.status || "").trim().toLowerCase();
  switch (normalizedStatus) {
    case "working":
      return runLabel ? `Working on ${role} jobs for ${runLabel}.` : `Working on ${role} jobs now.`;
    case "starting":
      return `Starting up and getting ready to take ${role} jobs.`;
    case "idle":
      return `Idle and waiting for the next ${role} job.`;
    default:
      return runLabel
        ? `${titleCaseWords(normalizedStatus || "unknown")} for ${role} jobs on ${runLabel}.`
        : `${titleCaseWords(normalizedStatus || "unknown")} for ${role} jobs.`;
  }
}

function formatHostname(worker: WorkerEntry): string {
  const metadataHostname = String(worker.metadata?.hostname ?? "").trim();
  const workerIdHost = String(worker.worker_id ?? "").split(":")[1]?.trim() ?? "";
  const host = metadataHostname || workerIdHost;
  if (!host) return "Unknown host";
  return host;
}

function formatExecutionOwnerLabel(owner: string | null | undefined): string {
  switch (String(owner ?? "").trim().toLowerCase()) {
    case "remote_worker":
      return "Remote executor";
    case "api":
    case "api_server":
      return "API server";
    default:
      return owner ? titleCaseWords(owner) : "Unknown";
  }
}

function formatExecutionBackendLabel(backend: string | null | undefined): string {
  switch (String(backend ?? "").trim().toLowerCase()) {
    case "modal":
      return "Modal";
    case "legacy_worker":
      return "Legacy worker";
    case "local":
      return "Local API";
    default:
      return backend ? titleCaseWords(backend) : "Unknown";
  }
}

function formatExecutionModeLabel(mode: string | null | undefined): string {
  switch (String(mode ?? "").trim().toLowerCase()) {
    case "remote":
      return "Remote";
    case "local":
      return "Local";
    default:
      return mode ? titleCaseWords(mode) : "Unknown";
  }
}

function formatStuckReasonLabel(reason: string | null | undefined): string {
  const normalized = String(reason ?? "").trim().toLowerCase();
  switch (normalized) {
    case "running_stale_heartbeat":
      return "Worker stopped reporting progress";
    case "retrying_stale_timeout":
      return "Retry timed out before progress resumed";
    case "pending_stale_timeout":
      return "Job waited too long without starting";
    case "queued_stale_timeout":
      return "Job stayed queued too long";
    case "modal_sdk_unavailable":
      return "Modal SDK unavailable in dispatcher runtime";
    case "modal_app_not_found":
      return "Modal app not found";
    case "modal_function_not_found":
      return "Modal function not found";
    case "modal_resolution_failed":
      return "Modal dispatch could not resolve the target";
    case "modal_dispatch_failed":
      return "Dispatch failed before any worker claim";
    case "dispatch_blocked":
      return "Dispatch is blocked before worker claim";
    default:
      return reason ? titleCaseWords(reason) : "Unknown issue";
  }
}

function formatAgeSeconds(seconds: number | null | undefined): string {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  if (safeSeconds < 60) return `${safeSeconds}s`;
  if (safeSeconds < 3600) return `${Math.floor(safeSeconds / 60)}m`;
  return `${Math.floor(safeSeconds / 3600)}h ${Math.floor((safeSeconds % 3600) / 60)}m`;
}

function formatFailureSummary(failure: FailureEntry): { summary: string; rawDetail: string | null } {
  const raw = failure.error_message ?? failure.last_error_code ?? failure.last_error_class ?? null;
  if (!raw) {
    return { summary: "Unknown failure", rawDetail: null };
  }
  const normalized = raw.trim().toLowerCase();
  if (normalized.includes("stale_heartbeat_timeout")) {
    return {
      summary: "Worker stopped reporting progress",
      rawDetail: raw,
    };
  }
  return {
    summary: truncate(raw, 120),
    rawDetail: raw,
  };
}

function formatPhaseLabel(phase: string | null | undefined): string {
  const normalized = String(phase ?? "").trim().toLowerCase();
  if (!normalized) return "No phase reported";
  return titleCaseWords(normalized);
}

function formatRunStatusLabel(status: string | null | undefined): string {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (!normalized) return "unknown";
  if (normalized === "running") return "running";
  if (normalized === "queued") return "queued";
  if (normalized === "completed") return "completed";
  if (normalized === "failed") return "failed";
  if (normalized === "cancelled") return "cancelled";
  return normalized.replace(/_/g, " ");
}

function formatRunSummary(detail: WorkerDetail | null): string {
  if (!detail?.run) return "No run is attached to this worker right now.";
  const summary = detail.run.summary ?? {};
  const totalJobs = Math.max(0, Number(summary.total_jobs ?? 0));
  const completedJobs = Math.max(0, Number(summary.completed_jobs ?? 0));
  const failedJobs = Math.max(0, Number(summary.failed_jobs ?? 0));
  const activeJobs = Math.max(0, Number(summary.active_jobs ?? 0));
  const itemsFound = Math.max(0, Number(summary.items_found_total ?? 0));
  const runLabel = detail.run.run_id ? `Run ${truncate(detail.run.run_id, 8)}` : "This run";
  const statusLabel = formatRunStatusLabel(detail.run.status);

  if (totalJobs <= 0 && completedJobs <= 0 && failedJobs <= 0 && activeJobs <= 0 && itemsFound <= 0) {
    return `${runLabel} is ${statusLabel}. Detailed job counts are not available yet.`;
  }

  const progressBits = [`${completedJobs.toLocaleString()} of ${Math.max(totalJobs, completedJobs + failedJobs).toLocaleString()} jobs complete`];
  if (activeJobs > 0) progressBits.push(`${activeJobs.toLocaleString()} still active`);
  if (failedJobs > 0) progressBits.push(`${failedJobs.toLocaleString()} failed`);
  if (itemsFound > 0) progressBits.push(`${itemsFound.toLocaleString()} items scraped`);
  return `${runLabel} is ${statusLabel}. ${progressBits.join(" · ")}.`;
}

function formatCurrentTaskSummary(detail: WorkerDetail | null): string {
  if (!detail?.current_job) {
    return detail?.run?.run_id
      ? `Attached to run ${truncate(detail.run.run_id, 8)} but not actively processing a job right now.`
      : "Not actively processing a job right now.";
  }
  const platform = titleCaseWords(detail.current_job.platform || "unknown");
  const stage = formatStageLabel(detail.current_job.stage || detail.current_job.job_type || "");
  const handle = detail.current_job.account_handle ? ` for ${detail.current_job.account_handle}` : "";
  return `Currently processing ${platform} ${stage.toLowerCase()}${handle}.`;
}

function modalHealthLabel(state: HealthState): string {
  switch (state) {
    case "healthy":
      return "Healthy";
    case "degraded":
      return "Needs Attention";
    case "down":
    case "error":
      return "Down";
    case "loading":
      return "Loading";
  }
}

function summaryToneClass(tone: SummaryCardTone | undefined): string {
  switch (tone) {
    case "good":
      return "border-emerald-200 bg-emerald-50/70";
    case "warn":
      return "border-amber-200 bg-amber-50/70";
    case "bad":
      return "border-red-200 bg-red-50/70";
    case "neutral":
    default:
      return "border-zinc-200 bg-zinc-50/80";
  }
}

function buildQueueBreakdownRows(
  breakdown: Record<string, Record<string, number>> | undefined,
  formatter: (key: string) => string,
): QueueBreakdownRowViewModel[] {
  return Object.keys(breakdown ?? {})
    .sort()
    .map((key) => {
      const counts = breakdown?.[key] ?? {};
      return {
        key,
        label: formatter(key),
        running: counts.running ?? 0,
        waiting: (counts.pending ?? 0) + (counts.queued ?? 0) + (counts.retrying ?? 0),
        failed: counts.failed ?? 0,
        completed: counts.completed ?? 0,
      };
    });
}

function modalQueueHealthState(queueStatus: QueueStatus): HealthState {
  if (!queueStatus.queue_enabled) return "down";
  if (queueStatus.queue.error) return "error";

  const healthyWorkers = Number(queueStatus.workers.healthy_workers ?? 0);
  const workersHealthy = Boolean(queueStatus.workers.healthy);
  const dispatcherResolved = queueStatus.workers.dispatcher_readiness?.resolved;
  if (!workersHealthy || healthyWorkers <= 0) {
    return "degraded";
  }
  if (dispatcherResolved === false) {
    return "degraded";
  }

  const likelyStuckCount = Number(queueStatus.queue.stuck_jobs_total ?? 0);
  const dispatchBlockedCount = Number(queueStatus.queue.dispatch_blocked_jobs_total ?? 0);
  const staleClaimsCount = Number(queueStatus.queue.stale_claims?.total ?? 0);
  const recentFailureCount = Number(queueStatus.queue.recent_failures.length ?? 0);
  if (dispatchBlockedCount > 0 || likelyStuckCount > 0 || staleClaimsCount > 0 || recentFailureCount > 0) {
    return "degraded";
  }

  return "healthy";
}

function buildSystemHealthViewModel(queueStatus: QueueStatus, state: HealthState): SystemHealthViewModel {
  const runsByStatus = queueStatus.queue.runs_by_status ?? queueStatus.queue.by_status ?? {};
  const runStatuses = {
    running: runsByStatus.running ?? 0,
    queued: (runsByStatus.queued ?? 0) + (runsByStatus.pending ?? 0),
    retrying: runsByStatus.retrying ?? 0,
    failed: runsByStatus.failed ?? 0,
    completed: runsByStatus.completed ?? 0,
    cancelled: runsByStatus.cancelled ?? 0,
  };
  const jobStatuses = queueStatus.queue.by_status ?? {};
  const jobRunning = jobStatuses.running ?? 0;
  const recentFailureCount = queueStatus.queue.recent_failures.length;
  const likelyStuckCount = queueStatus.queue.stuck_jobs_total ?? 0;
  const dispatchBlockedCount = Number(queueStatus.queue.dispatch_blocked_jobs_total ?? 0);
  const waitingForClaimCount = Number(queueStatus.queue.waiting_for_claim_jobs_total ?? 0);
  const retryingDispatchCount = Number(queueStatus.queue.retrying_dispatch_jobs_total ?? 0);
  const healthyWorkers = queueStatus.workers.healthy_workers ?? 0;
  const freshWorkers = queueStatus.workers.fresh_workers ?? 0;
  const totalWorkers = queueStatus.workers.total_workers ?? 0;
  const activeInvocations = Number(queueStatus.workers.active_invocations ?? 0);
  const staleRunningCount = Number(queueStatus.workers.stale_running_count ?? 0);
  const staleClaims = queueStatus.queue.stale_claims;
  const dispatcherReadiness = queueStatus.workers.dispatcher_readiness;
  const instagramRemoteAuth = queueStatus.workers.remote_auth_capabilities?.instagram;
  const instagramRemoteAuthReady = instagramRemoteAuth?.ready === true;
  const instagramRemoteHealthyWorkers = Number(instagramRemoteAuth?.healthy_authenticated_workers ?? 0);
  const instagramRemoteFreshWorkers = Number(instagramRemoteAuth?.fresh_authenticated_workers ?? 0);
  const sharedAccountBackfillReadiness = queueStatus.workers.shared_account_backfill_readiness;
  const oldestQueuedAgeSeconds =
    typeof queueStatus.workers.oldest_queued_age_seconds === "number"
      ? queueStatus.workers.oldest_queued_age_seconds
      : null;

  let statusSummary = "Workers are available and the queue looks stable.";
  if (!queueStatus.queue_enabled) {
    statusSummary = "Social sync is turned off right now.";
  } else if (state === "loading") {
    statusSummary = "Checking workers and queue activity now.";
  } else if (state === "error" || state === "down") {
    statusSummary = "Health details could not be loaded.";
  } else if (dispatchBlockedCount > 0 || dispatcherReadiness?.resolved === false) {
    statusSummary =
      dispatcherReadiness?.resolved === false
        ? "Dispatch is blocked by the current Modal runtime or function resolution."
        : "Workers are online, but some jobs are blocked before any worker can claim them.";
  } else if (likelyStuckCount > 0) {
    statusSummary = "Workers are online, but some jobs likely need intervention.";
  } else if (recentFailureCount > 0) {
    statusSummary = "Workers are available. Recent failures are historical, but they are still worth reviewing.";
  } else if (jobRunning > 0 || runStatuses.running > 0) {
    statusSummary = "Workers are online and jobs are moving.";
  }

  const summaryCards: SummaryCardViewModel[] = [
    {
      title: "Overall Status",
      value: modalHealthLabel(state),
      detail: statusSummary,
      tone: state === "healthy" ? "good" : state === "loading" ? "neutral" : state === "degraded" ? "warn" : "bad",
    },
    {
      title: "Work Happening Now",
      value: `${jobRunning.toLocaleString()} jobs running`,
      detail: `${runStatuses.queued.toLocaleString()} runs queued · ${runStatuses.running.toLocaleString()} runs running · ${dispatchBlockedCount.toLocaleString()} blocked`,
      tone: jobRunning > 0 || runStatuses.running > 0 ? "good" : runStatuses.queued > 0 ? "neutral" : "neutral",
    },
    {
      title: "Worker Availability",
      value: `${freshWorkers.toLocaleString()} recent executor heartbeats online`,
      detail: `${healthyWorkers.toLocaleString()} healthy · ${totalWorkers.toLocaleString()} recorded`,
      tone: healthyWorkers > 0 ? "good" : "bad",
    },
    {
      title: "Attention Needed",
      value: `${dispatchBlockedCount.toLocaleString()} dispatch blocked`,
      detail: `${likelyStuckCount.toLocaleString()} likely stuck · ${recentFailureCount.toLocaleString()} recent failures`,
      tone: dispatchBlockedCount > 0 || likelyStuckCount > 0 ? "bad" : recentFailureCount > 0 ? "warn" : "good",
    },
  ];

  const workerStageEntries = Object.entries(queueStatus.workers.by_stage ?? {});
  const hasCurrentStageAvailability = workerStageEntries.some(([, counts]) => {
    const healthy = Number(counts?.healthy ?? 0);
    const fresh = Number(counts?.fresh ?? 0);
    return healthy > 0 || fresh > 0;
  });
  const visibleWorkerStageEntries = hasCurrentStageAvailability
    ? workerStageEntries.filter(([, counts]) => {
        const healthy = Number(counts?.healthy ?? 0);
        const fresh = Number(counts?.fresh ?? 0);
        return healthy > 0 || fresh > 0;
      })
    : workerStageEntries;

  const workerStageCards = visibleWorkerStageEntries.map(([stage, counts]) => ({
    key: stage,
    label: `${formatStageLabel(stage)} workers`,
    countsLabel: `${counts.healthy.toLocaleString()} healthy · ${counts.fresh.toLocaleString()} seen recently · ${counts.total.toLocaleString()} recorded`,
  }));

  const queueStatusCards: SummaryCardViewModel[] = [
    { title: "Running", value: String(runStatuses.running), detail: "Runs actively executing" },
    { title: "Queued", value: String(runStatuses.queued), detail: "Runs waiting to start" },
    { title: "Retrying", value: String(runStatuses.retrying), detail: "Runs waiting for another attempt" },
    { title: "Failed", value: String(runStatuses.failed), detail: "Runs that ended with errors", tone: runStatuses.failed > 0 ? "warn" : "neutral" },
    { title: "Completed", value: String(runStatuses.completed), detail: "Runs finished successfully", tone: runStatuses.completed > 0 ? "good" : "neutral" },
    { title: "Cancelled", value: String(runStatuses.cancelled), detail: "Runs stopped manually or by policy" },
    { title: "Invocations", value: String(activeInvocations), detail: "Active remote executions" },
    {
      title: "Dispatch Blocked",
      value: String(dispatchBlockedCount),
      detail: "Jobs blocked before any worker claim",
      tone: dispatchBlockedCount > 0 ? "bad" : "neutral",
    },
    {
      title: "Waiting For Claim",
      value: String(waitingForClaimCount),
      detail: "Queued jobs with dispatch requested",
      tone: waitingForClaimCount > 0 ? "warn" : "neutral",
    },
    {
      title: "Retrying Dispatch",
      value: String(retryingDispatchCount),
      detail: "Jobs requeued after dispatch trouble",
      tone: retryingDispatchCount > 0 ? "warn" : "neutral",
    },
    {
      title: "Oldest queued",
      value: oldestQueuedAgeSeconds == null ? "n/a" : formatAgeSeconds(oldestQueuedAgeSeconds),
      detail: "Oldest queued or retrying work item",
      tone: oldestQueuedAgeSeconds != null && oldestQueuedAgeSeconds > 900 ? "warn" : "neutral",
    },
    {
      title: "Stale running",
      value: String(staleRunningCount),
      detail: "Running jobs beyond their lease window",
      tone: staleRunningCount > 0 ? "warn" : "neutral",
    },
  ];

  const liveWorkers = queueStatus.workers.workers.map((worker) => {
    const origin = resolveWorkerOrigin(worker);
    return {
      worker,
      origin,
      roleLabel: formatWorkerRoleLabel(worker.stage),
      hostLabel: formatHostname(worker),
      currentRunLabel: worker.run_id ? `Current run ${truncate(worker.run_id, 8)}` : null,
      platformLabel:
        worker.supported_platforms && worker.supported_platforms.length > 0
          ? `Can work on ${worker.supported_platforms.join(", ")}`
          : null,
      rawIdLabel: worker.worker_id,
    };
  });

  const recentFailures = queueStatus.queue.recent_failures.slice(0, 20).map((failure) => {
    const formatted = formatFailureSummary(failure);
    return {
      id: failure.id,
      platformLabel: titleCaseWords(failure.platform),
      stageLabel: formatStageLabel(failure.job_type),
      runLabel: failure.run_id ? `Run ${truncate(failure.run_id, 8)}` : null,
      ageLabel: relativeTime(failure.created_at),
      summary: formatted.summary,
      rawDetail: formatted.rawDetail,
    };
  });

  const instagramRemoteAuthLabel = instagramRemoteAuthReady
    ? `${instagramRemoteHealthyWorkers.toLocaleString()} authenticated`
    : "Not ready";
  const instagramRemoteAuthDetail = instagramRemoteAuthReady
    ? `${instagramRemoteFreshWorkers.toLocaleString()} recent Instagram-authenticated remote worker heartbeat${instagramRemoteFreshWorkers === 1 ? "" : "s"}`
    : String(instagramRemoteAuth?.reason || "No Instagram-authenticated remote workers are reporting.").replaceAll("_", " ");
  const sharedAccountBackfillReady = sharedAccountBackfillReadiness?.ready === true;
  const sharedAccountBackfillReadinessLabel = sharedAccountBackfillReady ? "Ready" : "Blocked";
  const sharedAccountBackfillReadinessDetail = sharedAccountBackfillReady
    ? "Modal dispatch, dispatcher heartbeat, and Instagram remote auth are all green."
    : String(
        sharedAccountBackfillReadiness?.reason ||
          dispatcherReadiness?.reason ||
          "Remote shared-account backfill is not ready yet.",
      ).replaceAll("_", " ");

  return {
    statusSummary,
    summaryCards,
    executionOwnerLabel: `Execution owner: ${formatExecutionOwnerLabel(queueStatus.remote_plane?.execution_owner)}`,
    executionBackendLabel: `Execution backend: ${formatExecutionBackendLabel(
      queueStatus.remote_plane?.execution_backend_canonical ?? queueStatus.workers.executor_backend,
    )}`,
    executionModeLabel: `Execution mode: ${formatExecutionModeLabel(queueStatus.remote_plane?.execution_mode_canonical)}`,
    executionPolicyLabel: queueStatus.remote_plane?.remote_job_plane_enforced
      ? "Local execution is disabled"
      : "Local execution is allowed",
    instagramRemoteAuthLabel,
    instagramRemoteAuthDetail,
    sharedAccountBackfillReadinessLabel,
    sharedAccountBackfillReadinessDetail,
    workerStageCards,
    staleClaimsSummary: staleClaims
      ? `${staleClaims.total.toLocaleString()} stale claimed jobs`
      : "0 stale claimed jobs",
    queueStatusCards,
    queueBreakdownByPlatform: buildQueueBreakdownRows(queueStatus.queue.by_platform, (key) => titleCaseWords(key)),
    queueBreakdownByStage: buildQueueBreakdownRows(queueStatus.queue.by_stage, (key) => formatStageLabel(key)),
    workersSummaryLabel: `${healthyWorkers.toLocaleString()} healthy · ${freshWorkers.toLocaleString()} seen recently · ${totalWorkers.toLocaleString()} recorded`,
    olderWorkerCheckinsHiddenLabel:
      queueStatus.workers.stale_hidden_count > 0
        ? `${queueStatus.workers.stale_hidden_count.toLocaleString()} older worker check-ins hidden`
        : null,
    nonAwsWorkersHiddenLabel: null,
    liveWorkers,
    recentFailureSummary: `${recentFailureCount.toLocaleString()} recent failures`,
    recentFailures,
  };
}

class SharedHealthDotPoller {
  private subscribers = new Map<string, SharedHealthSubscriber>();
  private snapshot: SharedHealthSnapshot = { data: null, error: null, lastFetchedMs: null };
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight = false;
  private leader = false;
  private tabId = createTabId();
  private channel: BroadcastChannel | null = null;
  private lastObservedState: HealthState | null = null;
  private unchangedStateSinceMs: number | null = null;

  constructor() {
    if (typeof window === "undefined") return;

    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      this.channel.onmessage = (event) => {
        this.handleIncomingSnapshot(event.data);
      };
    }

    const cachedSnapshot = this.readSnapshotFromStorage();
    if (cachedSnapshot) {
      this.snapshot = cachedSnapshot;
    }

    window.addEventListener("storage", this.handleStorageEvent);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  subscribe(id: string, onUpdate: (snapshot: SharedHealthSnapshot) => void): void {
    this.subscribers.set(id, { shouldPoll: false, onUpdate });
    onUpdate(this.snapshot);
    this.reconcile();
  }

  unsubscribe(id: string): void {
    this.subscribers.delete(id);
    this.reconcile();
  }

  setInterest(id: string, shouldPoll: boolean): void {
    const existing = this.subscribers.get(id);
    if (!existing) return;
    if (existing.shouldPoll === shouldPoll) return;
    this.subscribers.set(id, { ...existing, shouldPoll });
    this.reconcile();
  }

  requestImmediatePoll(): void {
    if (!this.shouldPollInThisTab()) return;
    this.markStatusObservedNow();
    this.clearTimer();
    this.scheduleTick(0);
  }

  private hasActiveInterest(): boolean {
    for (const entry of this.subscribers.values()) {
      if (entry.shouldPoll) return true;
    }
    return false;
  }

  private shouldPollInThisTab(): boolean {
    if (typeof document === "undefined") return false;
    if (document.visibilityState !== "visible") return false;
    return this.hasActiveInterest();
  }

  private scheduleTick(delayMs: number): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.tick();
    }, delayMs);
  }

  private clearTimer(): void {
    if (!this.timer) return;
    clearTimeout(this.timer);
    this.timer = null;
  }

  private randomStartupDelay(): number {
    return STARTUP_JITTER_MIN_MS + Math.floor(Math.random() * STARTUP_JITTER_MAX_MS);
  }

  private markStatusObservedNow(): void {
    if (!IS_DEV_ENV || this.lastObservedState === null) return;
    this.unchangedStateSinceMs = Date.now();
  }

  private nextLeaderDelayMs(): number {
    if (!IS_DEV_ENV) return HEALTH_DOT_POLL_BASE_INTERVAL_MS;
    if (this.unchangedStateSinceMs === null) return HEALTH_DOT_POLL_BASE_INTERVAL_MS;
    const unchangedForMs = Date.now() - this.unchangedStateSinceMs;
    if (unchangedForMs >= HEALTH_DOT_POLL_DEEP_IDLE_AFTER_MS) {
      return HEALTH_DOT_POLL_DEEP_IDLE_INTERVAL_MS;
    }
    if (unchangedForMs >= HEALTH_DOT_POLL_IDLE_AFTER_MS) {
      return HEALTH_DOT_POLL_IDLE_INTERVAL_MS;
    }
    return HEALTH_DOT_POLL_BASE_INTERVAL_MS;
  }

  private updateCadence(snapshot: SharedHealthSnapshot): void {
    const nextState = healthState(snapshot.data, snapshot.error);
    const fetchedAt = snapshot.lastFetchedMs ?? Date.now();
    if (this.lastObservedState !== nextState || this.unchangedStateSinceMs === null) {
      this.lastObservedState = nextState;
      this.unchangedStateSinceMs = fetchedAt;
      return;
    }
    this.lastObservedState = nextState;
  }

  private reconcile = (): void => {
    if (!this.shouldPollInThisTab()) {
      this.clearTimer();
      this.releaseLeaderLease();
      return;
    }
    if (this.timer) return;
    const hasPolledBefore = this.snapshot.lastFetchedMs !== null;
    this.scheduleTick(hasPolledBefore ? FOLLOWER_CHECK_INTERVAL_MS : this.randomStartupDelay());
  };

  private handleVisibilityChange = (): void => {
    if (typeof document === "undefined") return;
    if (document.visibilityState === "visible" && this.hasActiveInterest()) {
      this.requestImmediatePoll();
      return;
    }
    this.reconcile();
  };

  private async tick(): Promise<void> {
    if (!this.shouldPollInThisTab()) {
      this.releaseLeaderLease();
      return;
    }

    const leaderNow = this.tryAcquireLeaderLease();
    this.leader = leaderNow;
    if (leaderNow) {
      await this.pollHealthDot();
      if (!this.shouldPollInThisTab()) {
        this.releaseLeaderLease();
        return;
      }
      this.scheduleTick(this.nextLeaderDelayMs());
      return;
    }

    this.scheduleTick(FOLLOWER_CHECK_INTERVAL_MS);
  }

  private readLease(): LeaderLease | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(LEASE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<LeaderLease>;
      if (typeof parsed.tabId !== "string" || typeof parsed.expiresAt !== "number") {
        return null;
      }
      return {
        tabId: parsed.tabId,
        expiresAt: parsed.expiresAt,
      };
    } catch {
      return null;
    }
  }

  private writeLease(expiresAt: number): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        LEASE_STORAGE_KEY,
        JSON.stringify({ tabId: this.tabId, expiresAt }),
      );
    } catch {
      // localStorage unavailable; fallback to in-tab polling.
    }
  }

  private tryAcquireLeaderLease(): boolean {
    if (typeof window === "undefined") return true;

    const now = Date.now();
    const lease = this.readLease();
    if (!lease || lease.expiresAt <= now || lease.tabId === this.tabId) {
      this.writeLease(now + LEASE_DURATION_MS);
      const confirmed = this.readLease();
      return confirmed?.tabId === this.tabId;
    }
    return false;
  }

  private releaseLeaderLease(): void {
    if (!this.leader || typeof window === "undefined") {
      this.leader = false;
      return;
    }
    try {
      const lease = this.readLease();
      if (lease?.tabId === this.tabId) {
        window.localStorage.removeItem(LEASE_STORAGE_KEY);
      }
    } catch {
      // Ignore storage failures.
    } finally {
      this.leader = false;
    }
  }

  private readSnapshotFromStorage(): SharedHealthSnapshot | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<SharedHealthSnapshot>;
      if (
        parsed &&
        (parsed.data === null || typeof parsed.data === "object") &&
        (parsed.error === null || typeof parsed.error === "string") &&
        (parsed.lastFetchedMs === null || typeof parsed.lastFetchedMs === "number")
      ) {
        return {
          data: (parsed.data as HealthDotStatus | null) ?? null,
          error: parsed.error ?? null,
          lastFetchedMs: parsed.lastFetchedMs ?? null,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private publish(snapshot: SharedHealthSnapshot, options?: { broadcast?: boolean }): void {
    this.updateCadence(snapshot);
    this.snapshot = snapshot;
    for (const subscriber of this.subscribers.values()) {
      subscriber.onUpdate(snapshot);
    }

    if (!options?.broadcast || typeof window === "undefined") return;

    try {
      window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignore storage failures.
    }

    try {
      this.channel?.postMessage(snapshot);
    } catch {
      // Ignore BroadcastChannel failures.
    }
  }

  private handleIncomingSnapshot(payload: unknown): void {
    if (!payload || typeof payload !== "object") return;
    const incoming = payload as Partial<SharedHealthSnapshot>;
    const incomingFetched =
      typeof incoming.lastFetchedMs === "number" ? incoming.lastFetchedMs : null;
    const currentFetched = this.snapshot.lastFetchedMs;
    if (incomingFetched !== null && currentFetched !== null && incomingFetched <= currentFetched) {
      return;
    }
    this.publish({
      data: (incoming.data as HealthDotStatus | null) ?? null,
      error: typeof incoming.error === "string" ? incoming.error : null,
      lastFetchedMs: incomingFetched,
    });
  }

  private handleStorageEvent = (event: StorageEvent): void => {
    if (event.key !== SNAPSHOT_STORAGE_KEY || !event.newValue) return;
    try {
      const parsed = JSON.parse(event.newValue) as SharedHealthSnapshot;
      this.handleIncomingSnapshot(parsed);
    } catch {
      // Ignore malformed payloads.
    }
  };

  private async pollHealthDot(): Promise<void> {
    if (this.inFlight) return;
    this.inFlight = true;

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(new DOMException("Request timed out", "AbortError")),
      HEALTH_DOT_FETCH_TIMEOUT_MS,
    );

    try {
      this.writeLease(Date.now() + LEASE_DURATION_MS);
      const response = await fetchAdminWithAuth(
        HEALTH_DOT_URL,
        { cache: "no-store", signal: controller.signal },
        { allowDevAdminBypass: true },
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        const error = typeof body.error === "string" ? body.error : `HTTP ${response.status}`;
        this.publish(
          {
            data: this.snapshot.data,
            error,
            lastFetchedMs: Date.now(),
          },
          { broadcast: true },
        );
        return;
      }

      const data = (await response.json()) as HealthDotStatus;
      this.publish(
        {
          data,
          error: null,
          lastFetchedMs: Date.now(),
        },
        { broadcast: true },
      );
    } catch (error) {
      const message = normalizeFetchErrorMessage(error);
      this.publish(
        {
          data: this.snapshot.data,
          error: message,
          lastFetchedMs: Date.now(),
        },
        { broadcast: true },
      );
    } finally {
      clearTimeout(timeoutId);
      this.inFlight = false;
    }
  }
}

const getSharedHealthDotPoller = (): SharedHealthDotPoller | null => {
  if (typeof window === "undefined") return null;
  const globalKey = "__trr_admin_health_dot_poller__" as const;
  const withPoller = window as Window & {
    [globalKey]?: SharedHealthDotPoller;
  };
  if (!withPoller[globalKey]) {
    withPoller[globalKey] = new SharedHealthDotPoller();
  }
  return withPoller[globalKey] ?? null;
};

function useSharedHealthDot(options: { isOpen: boolean; isSocialRoute: boolean }) {
  const [snapshot, setSnapshot] = useState<SharedHealthSnapshot>({
    data: null,
    error: null,
    lastFetchedMs: null,
  });
  const subscriberIdRef = useRef<string>(createTabId());

  useEffect(() => {
    const poller = getSharedHealthDotPoller();
    if (!poller) return;
    const id = subscriberIdRef.current;
    poller.subscribe(id, setSnapshot);
    return () => {
      poller.unsubscribe(id);
    };
  }, []);

  useEffect(() => {
    const poller = getSharedHealthDotPoller();
    if (!poller) return;
    poller.setInterest(subscriberIdRef.current, options.isOpen || options.isSocialRoute);
  }, [options.isOpen, options.isSocialRoute]);

  const refetch = useCallback(() => {
    const poller = getSharedHealthDotPoller();
    poller?.requestImmediatePoll();
  }, []);

  return {
    data: snapshot.data,
    error: snapshot.error,
    lastFetched: snapshot.lastFetchedMs ? new Date(snapshot.lastFetchedMs) : null,
    refetch,
  };
}

export function useQueueStatusModal(options: { isOpen: boolean }) {
  const [data, setData] = useState<QueueStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (typeof document === "undefined") return true;
    return document.visibilityState === "visible";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleVisibility = () => setIsVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const fetchStatus = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(new DOMException("Request timed out", "AbortError")),
      QUEUE_STATUS_FETCH_TIMEOUT_MS,
    );

    try {
      const response = await fetchAdminWithAuth(
        `${QUEUE_STATUS_URL}?fresh=true`,
        { cache: "no-store", signal: controller.signal },
        { allowDevAdminBypass: true },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        setError(typeof body.error === "string" ? body.error : `HTTP ${response.status}`);
        return;
      }
      const json = (await response.json()) as QueueStatus;
      setData(json);
      setError(null);
      setLastFetched(new Date());
    } catch (err) {
      setError(normalizeFetchErrorMessage(err));
    } finally {
      clearTimeout(timeout);
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    const shouldPoll = options.isOpen && isVisible;
    if (!shouldPoll) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      await fetchStatus();
      if (cancelled) return;
      timeoutRef.current = setTimeout(() => {
        void poll();
      }, QUEUE_STATUS_POLL_INTERVAL_MS);
    };

    void poll();

    return () => {
      cancelled = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [fetchStatus, isVisible, options.isOpen]);

  return {
    data,
    error,
    lastFetched,
    refetch: fetchStatus,
  };
}

export function useAdminOperationsHealthModal(options: { isOpen: boolean }) {
  const [data, setData] = useState<AdminOperationsHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);

  const fetchStatus = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(new DOMException("Request timed out", "AbortError")),
      QUEUE_STATUS_FETCH_TIMEOUT_MS,
    );

    try {
      const response = await fetchAdminWithAuth(
        `${ADMIN_OPERATIONS_HEALTH_URL}?limit=${ADMIN_OPERATIONS_HEALTH_LIMIT}`,
        { cache: "no-store", signal: controller.signal },
        { allowDevAdminBypass: true },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        setError(typeof body.error === "string" ? body.error : `HTTP ${response.status}`);
        return;
      }
      const json = (await response.json()) as AdminOperationsHealth;
      setData(json);
      setError(null);
      setLastFetched(new Date());
    } catch (err) {
      setError(normalizeFetchErrorMessage(err));
    } finally {
      clearTimeout(timeout);
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!options.isOpen) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      await fetchStatus();
      if (cancelled) return;
      timeoutRef.current = setTimeout(() => {
        void poll();
      }, QUEUE_STATUS_POLL_INTERVAL_MS);
    };

    void poll();

    return () => {
      cancelled = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [fetchStatus, options.isOpen]);

  return {
    data,
    error,
    lastFetched,
    refetch: fetchStatus,
  };
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: "bg-blue-100 text-blue-800",
    pending: "bg-yellow-100 text-yellow-800",
    queued: "bg-yellow-100 text-yellow-800",
    retrying: "bg-orange-100 text-orange-800",
    completed: "bg-emerald-100 text-emerald-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-zinc-100 text-zinc-600",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-zinc-100 text-zinc-600"}`}>
      {status}
    </span>
  );
}

function SectionHeader({ children }: { children: ReactNode }) {
  return <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{children}</h4>;
}

function SummaryCards({ cards, columns = 4 }: { cards: SummaryCardViewModel[]; columns?: 2 | 3 | 4 | 6 }) {
  return (
    <div
      className={`grid gap-3 ${
        columns === 6
          ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-6"
          : columns === 3
            ? "grid-cols-1 md:grid-cols-3"
            : columns === 2
              ? "grid-cols-1 md:grid-cols-2"
              : "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
      }`}
    >
      {cards.map((card) => (
        <div key={card.title} className={`rounded-xl border p-3 ${summaryToneClass(card.tone)}`}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{card.title}</p>
          <p className="mt-2 text-lg font-semibold text-zinc-950">{card.value}</p>
          <p className="mt-1 text-sm text-zinc-600">{card.detail}</p>
        </div>
      ))}
    </div>
  );
}

function QueueBreakdownTable({
  rows,
  emptyMessage,
}: {
  rows: QueueBreakdownRowViewModel[];
  emptyMessage: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-zinc-400">{emptyMessage}</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-50">
          <tr className="border-b border-zinc-200 text-xs text-zinc-500">
            <th className="pb-1.5 pt-2 pr-3 pl-3 font-medium">Category</th>
            <th className="pb-1.5 pt-2 px-3 font-medium text-right">Running now</th>
            <th className="pb-1.5 pt-2 px-3 font-medium text-right">Waiting</th>
            <th className="pb-1.5 pt-2 px-3 font-medium text-right">Failed</th>
            <th className="pb-1.5 pt-2 pl-3 pr-3 font-medium text-right">Completed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-zinc-100 last:border-b-0">
              <td className="py-2 pr-3 pl-3 font-medium text-zinc-900">{row.label}</td>
              <td className="py-2 px-3 tabular-nums text-right text-zinc-700">{row.running.toLocaleString()}</td>
              <td className="py-2 px-3 tabular-nums text-right text-zinc-700">{row.waiting.toLocaleString()}</td>
              <td className="py-2 px-3 tabular-nums text-right text-red-600">{row.failed.toLocaleString()}</td>
              <td className="py-2 pl-3 pr-3 tabular-nums text-right text-zinc-500">{row.completed.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WorkerPlaneSummary({ viewModel }: { viewModel: SystemHealthViewModel }) {
  return (
    <div className="space-y-3 text-sm text-zinc-600">
      <p className="text-sm text-zinc-600">
        All long-running sync work is expected to run on the configured remote executor, not in your browser or local app session.
      </p>
      <div className="grid gap-2 md:grid-cols-6">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Execution owner</p>
          <p className="mt-1 text-sm font-medium text-zinc-900">{viewModel.executionOwnerLabel.replace("Execution owner: ", "")}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Execution backend</p>
          <p className="mt-1 text-sm font-medium text-zinc-900">{viewModel.executionBackendLabel.replace("Execution backend: ", "")}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Execution mode</p>
          <p className="mt-1 text-sm font-medium text-zinc-900">{viewModel.executionModeLabel.replace("Execution mode: ", "")}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Execution policy</p>
          <p className="mt-1 text-sm font-medium text-zinc-900">{viewModel.executionPolicyLabel}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Instagram remote auth</p>
          <p className="mt-1 text-sm font-medium text-zinc-900">{viewModel.instagramRemoteAuthLabel}</p>
          <p className="mt-1 text-[11px] text-zinc-500">{viewModel.instagramRemoteAuthDetail}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Shared-account backfill</p>
          <p className="mt-1 text-sm font-medium text-zinc-900">{viewModel.sharedAccountBackfillReadinessLabel}</p>
          <p className="mt-1 text-[11px] text-zinc-500">{viewModel.sharedAccountBackfillReadinessDetail}</p>
        </div>
      </div>
      {viewModel.workerStageCards.length > 0 && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {viewModel.workerStageCards.map((card) => (
            <div key={card.key} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs">
              <p className="font-medium text-zinc-800">{card.label}</p>
              <p className="mt-1 text-zinc-500">{card.countsLabel}</p>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-zinc-500">
        Seen recently means the worker checked in within the expected heartbeat window. Recorded includes older heartbeat history.
      </p>
      <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 text-xs text-amber-900">
        <p className="font-medium">{viewModel.staleClaimsSummary}</p>
      </div>
    </div>
  );
}

function QueueHealthSection({ viewModel }: { viewModel: SystemHealthViewModel }) {
  const [mode, setMode] = useState<"platform" | "stage">("platform");
  const rows =
    mode === "platform" ? viewModel.queueBreakdownByPlatform : viewModel.queueBreakdownByStage;

  return (
    <div className="space-y-3">
      <SummaryCards cards={viewModel.queueStatusCards} columns={6} />
      <p className="text-xs text-zinc-500">Waiting includes queued, pending, and retrying jobs.</p>
      <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1">
        <button
          type="button"
          onClick={() => setMode("platform")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${mode === "platform" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
        >
          By Platform
        </button>
        <button
          type="button"
          onClick={() => setMode("stage")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${mode === "stage" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
        >
          By Stage
        </button>
      </div>
      <QueueBreakdownTable
        rows={rows}
        emptyMessage={mode === "platform" ? "No platform-level queue data available" : "No stage-level queue data available"}
      />
    </div>
  );
}

function WorkersList({
  workers,
  staleAfterSeconds,
  staleHiddenCount,
  selectedWorkerId,
  onInspectWorker,
  onDebugJob,
  onClearOlderWorkerCheckins,
  clearingOlderWorkerCheckins,
  debugJobLoadingId,
  workersSummaryLabel,
  executionBackend,
}: {
  workers: WorkerEntry[];
  staleAfterSeconds: number;
  staleHiddenCount: number;
  selectedWorkerId: string | null;
  onInspectWorker: (worker: WorkerEntry) => void;
  onDebugJob: (jobId: string) => void;
  onClearOlderWorkerCheckins?: (() => void) | null;
  clearingOlderWorkerCheckins?: boolean;
  debugJobLoadingId: string | null;
  workersSummaryLabel: string;
  executionBackend: string | null | undefined;
}) {
  const [showStaleWorkers, setShowStaleWorkers] = useState(false);
  const [showOtherWorkers, setShowOtherWorkers] = useState(false);
  const now = Date.now();
  const shouldPreferAwsRows = preferAwsWorkerRows(executionBackend);
  const workersWithOrigin = workers.map((worker) => ({
    worker,
    origin: resolveWorkerOrigin(worker),
  }));
  const otherWorkerCount = workersWithOrigin.filter(({ origin }) => origin !== "aws").length;
  const originFilteredWorkers = workersWithOrigin.filter(
    ({ origin }) => !shouldPreferAwsRows || showOtherWorkers || origin === "aws",
  );
  const freshWorkers = originFilteredWorkers.filter(({ worker }) => {
    if (worker.is_healthy) return true;
    if (!worker.last_seen_at) return false;
    const lastSeenMs = new Date(worker.last_seen_at).getTime();
    if (!Number.isFinite(lastSeenMs)) return false;
    return now - lastSeenMs <= staleAfterSeconds * 1000;
  });
  const derivedHiddenStaleCount = Math.max(0, originFilteredWorkers.length - freshWorkers.length);
  const hiddenStaleCount = Math.max(
    0,
    Number.isFinite(staleHiddenCount) ? staleHiddenCount : derivedHiddenStaleCount,
  );
  const visibleWorkers = (showStaleWorkers ? originFilteredWorkers : freshWorkers).map(({ worker, origin }) => ({
    worker,
    origin,
    roleLabel: formatWorkerRoleLabel(worker.stage),
    hostLabel: formatHostname(worker),
    currentRunLabel: worker.run_id ? `Current run ${truncate(worker.run_id, 8)}` : null,
    platformLabel: formatSupportedPlatformsLabel(worker.supported_platforms),
    activityLabel: formatWorkerActivityLabel(worker),
  }));

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-600">
        Remote executor processes checking the social sync queues. Each card shows what kind of jobs a worker
        handles, where it is running, and whether it is busy right now.
      </p>
      <p className="text-xs text-zinc-500">{workersSummaryLabel}</p>
      {shouldPreferAwsRows && otherWorkerCount > 0 && (
        <div className="flex items-center justify-between gap-2 text-xs text-zinc-400">
          <p>
            {otherWorkerCount.toLocaleString()} other worker
            {otherWorkerCount === 1 ? "" : "s"} {showOtherWorkers ? "shown" : "hidden"}
          </p>
          <button
            type="button"
            onClick={() => setShowOtherWorkers((current) => !current)}
            className="rounded border border-zinc-300 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50"
          >
            {showOtherWorkers ? "Hide other workers" : "Show other workers"}
          </button>
        </div>
      )}
      {hiddenStaleCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 text-xs text-amber-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>
              {hiddenStaleCount.toLocaleString()} older worker check-in
              {hiddenStaleCount === 1 ? "" : "s"} hidden
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {onClearOlderWorkerCheckins ? (
                <button
                  type="button"
                  onClick={onClearOlderWorkerCheckins}
                  disabled={Boolean(clearingOlderWorkerCheckins)}
                  className="rounded border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-medium text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {clearingOlderWorkerCheckins ? "Clearing..." : "Clear older worker check-ins"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setShowStaleWorkers((current) => !current)}
                className="rounded border border-zinc-300 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50"
              >
                {showStaleWorkers ? "Hide older worker check-ins" : "Show older worker check-ins"}
              </button>
            </div>
          </div>
        </div>
      )}
      {visibleWorkers.length === 0 && <p className="text-sm text-zinc-400">No workers seen recently.</p>}
      <div className="space-y-2">
        {visibleWorkers.map(({ worker, origin, roleLabel, hostLabel, currentRunLabel, platformLabel, activityLabel }) => (
          <div
            key={worker.worker_id}
            className={`rounded-xl border px-3 py-3 ${selectedWorkerId === worker.worker_id ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white"}`}
          >
            <div className="flex items-start gap-3">
              <span className={`mt-1 inline-block h-2.5 w-2.5 rounded-full ${worker.is_healthy ? "bg-emerald-500" : "bg-amber-500"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onInspectWorker(worker)}
                    className="text-left text-sm font-semibold text-zinc-900 hover:text-zinc-700"
                  >
                    {roleLabel}
                  </button>
                  {origin !== "aws" && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">
                      {origin}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-zinc-600">{hostLabel}</p>
                <p className="mt-1 text-xs text-zinc-600">{activityLabel}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Last seen {relativeTime(worker.last_seen_at)}
                  {currentRunLabel ? ` · ${currentRunLabel}` : ""}
                </p>
                {platformLabel && <p className="mt-1 text-xs text-zinc-500">Platforms this worker can pick up: {platformLabel}</p>}
                <p className="mt-1 text-[11px] text-zinc-400">
                  Worker ID: <span className="break-all font-mono">{worker.worker_id}</span>
                </p>
              </div>
              {worker.status === "working" && worker.current_job_id && (
                <button
                  type="button"
                  onClick={() => onDebugJob(worker.current_job_id as string)}
                  disabled={debugJobLoadingId === worker.current_job_id}
                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Debug current job"
                >
                  {debugJobLoadingId === worker.current_job_id ? "Debugging..." : "Debug"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RunningJobs({ jobs }: { jobs: RunningJobEntry[] }) {
  if (jobs.length === 0) {
    return <p className="text-sm text-zinc-400">No jobs are running right now.</p>;
  }

  return (
    <div className="space-y-2">
      {jobs.map((job) => (
        <div key={job.id} className="rounded-xl border border-zinc-200 bg-white px-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900">{titleCaseWords(job.platform)}</span>
            <span className="text-xs text-zinc-500">{formatStageLabel(job.stage || job.job_type)}</span>
            {job.account_handle ? (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700">
                @{job.account_handle.replace(/^@+/, "")}
              </span>
            ) : null}
            {job.run_id ? <span className="font-mono text-[11px] text-zinc-500">run {truncate(job.run_id, 8)}</span> : null}
            <span className="ml-auto text-[11px] text-zinc-400">
              Started {relativeTime(job.started_at)} · heartbeat {relativeTime(job.heartbeat_at)}
            </span>
          </div>
          <div className="mt-2 grid gap-2 text-xs text-zinc-500 md:grid-cols-3">
            <p>
              Worker: <span className="font-mono text-zinc-700">{job.worker_id ?? "-"}</span>
            </p>
            <p>
              Dispatch backend: <span className="text-zinc-700">{titleCaseWords(job.dispatch_backend ?? "unknown")}</span>
            </p>
            <p>
              Required backend:{" "}
              <span className="text-zinc-700">{titleCaseWords(job.required_execution_backend ?? "any")}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminOperationsTable({
  operations,
  emptyMessage,
  cancelingOperationIds,
  onCancelOperation,
  cancelActionLabel = "Cancel",
}: {
  operations: AdminOperationHealthEntry[];
  emptyMessage: string;
  cancelingOperationIds?: Set<string>;
  onCancelOperation?: (operationId: string) => Promise<void>;
  cancelActionLabel?: string;
}) {
  if (operations.length === 0) {
    return <p className="text-sm text-zinc-400">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      {operations.map((operation) => (
        <div key={operation.id} className="rounded-xl border border-zinc-200 bg-white px-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900">
              {formatAdminOperationTypeLabel(operation.operation_type)}
            </span>
            <StatusBadge status={operation.status} />
            {operation.is_stale ? (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
                {formatStuckReasonLabel(operation.stale_reason)}
              </span>
            ) : null}
            <span className="ml-auto text-[11px] text-zinc-400">
              age {formatAgeSeconds(operation.age_seconds)} · last update {formatAgeSeconds(operation.last_update_age_seconds)}
            </span>
          </div>
          <div className="mt-2 grid gap-2 text-xs text-zinc-500 md:grid-cols-4">
            <p>
              Operation: <span className="font-mono text-zinc-700">{truncate(operation.id, 8)}</span>
            </p>
            <p>
              Runtime:{" "}
              <span className="text-zinc-700">
                {formatExecutionBackendLabel(operation.execution_backend_canonical)} · {formatExecutionOwnerLabel(operation.execution_owner)}
              </span>
            </p>
            <p>
              Phase: <span className="text-zinc-700">{formatPhaseLabel(operation.latest_phase)}</span>
            </p>
            <p>
              Worker: <span className="font-mono text-zinc-700">{truncate(operation.claimed_by_worker_id ?? "-", 24)}</span>
            </p>
          </div>
          {onCancelOperation ? (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  void onCancelOperation(operation.id);
                }}
                disabled={cancelingOperationIds?.has(operation.id) === true}
                className="rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelingOperationIds?.has(operation.id) ? "Cancelling..." : cancelActionLabel}
              </button>
            </div>
          ) : null}
          {typeof operation.cancel_requested_age_seconds === "number" ? (
            <p className="mt-2 text-[11px] text-zinc-400">
              Cancel requested {formatAgeSeconds(operation.cancel_requested_age_seconds)} ago
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function RecentFailures({
  failures,
  dismissingFailureIds,
  onDismissFailure,
}: {
  failures: FailureEntry[];
  dismissingFailureIds: Set<string>;
  onDismissFailure: (jobId: string) => Promise<void>;
}) {
  if (failures.length === 0) return <p className="text-sm text-zinc-400">No recent error patterns to review.</p>;

  return (
    <div className="max-h-48 space-y-2 overflow-y-auto">
      {failures.slice(0, 20).map((failure) => (
        <div key={failure.id} className="rounded-lg border border-red-100 bg-red-50/50 px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-900">{titleCaseWords(failure.platform)}</span>
            <span className="text-zinc-400">{formatStageLabel(failure.job_type)}</span>
            {failure.run_id && <span className="font-mono text-zinc-500">run {truncate(failure.run_id, 8)}</span>}
            <span className="ml-auto text-zinc-400">{relativeTime(failure.created_at)}</span>
          </div>
          <p className="mt-0.5 text-red-700">{formatFailureSummary(failure).summary}</p>
          {formatFailureSummary(failure).rawDetail && (
            <p className="mt-1 font-mono text-red-700">{truncate(formatFailureSummary(failure).rawDetail, 120)}</p>
          )}
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                void onDismissFailure(failure.id);
              }}
              disabled={dismissingFailureIds.has(failure.id)}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {dismissingFailureIds.has(failure.id) ? "Dismissing..." : "Dismiss"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function StuckJobs({
  jobs,
  total,
  cancelingJobIds,
  clearingAll,
  onCancelJob,
  onClearAll,
  itemLabel = "likely stuck jobs",
  emptyLabel = "No likely stuck jobs detected.",
  clearAllLabel = "Cancel all likely stuck jobs",
}: {
  jobs: StuckJobEntry[];
  total: number;
  cancelingJobIds: Set<string>;
  clearingAll: boolean;
  onCancelJob: (jobId: string) => Promise<void>;
  onClearAll: () => Promise<void>;
  itemLabel?: string;
  emptyLabel?: string;
  clearAllLabel?: string;
}) {
  const canClearAll = total > 0 && !clearingAll && cancelingJobIds.size === 0;
  const sectionLabel = total > jobs.length ? `${jobs.length}/${total}` : `${total}`;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">Showing {sectionLabel} {itemLabel}</p>
        <button
          type="button"
          onClick={() => {
            void onClearAll();
          }}
          disabled={!canClearAll}
          className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {clearingAll ? "Cancelling..." : clearAllLabel}
        </button>
      </div>
      {jobs.length === 0 ? (
        <p className="text-sm text-zinc-400">{emptyLabel}</p>
      ) : (
        <div className="max-h-56 space-y-2 overflow-y-auto">
          {jobs.map((job) => {
            const inFlight = cancelingJobIds.has(job.id);
            return (
              <div key={job.id} className="rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-900">{titleCaseWords(job.platform)}</span>
                  <span className="text-zinc-500">{formatStageLabel(job.job_type)}</span>
                  <StatusBadge status={job.status} />
                  {job.run_id && <span className="font-mono text-zinc-500">run {truncate(job.run_id, 8)}</span>}
                  <span className="ml-auto text-zinc-400">{relativeTime(job.heartbeat_at ?? job.created_at)}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-zinc-500">
                  <span>{formatStuckReasonLabel(job.stuck_reason)}</span>
                  <span>·</span>
                  <span>{Math.max(0, Number(job.stuck_for_seconds) || 0)}s stuck</span>
                  {job.worker_id && (
                    <>
                      <span>·</span>
                      <span className="max-w-[20rem] break-all font-mono">{job.worker_id}</span>
                    </>
                  )}
                </div>
                {(job.error_message || job.last_error_code) && (
                  <p className="mt-1 font-mono text-amber-800">
                    {truncate(job.error_message ?? job.last_error_code, 120)}
                  </p>
                )}
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      void onCancelJob(job.id);
                    }}
                    disabled={inFlight || clearingAll}
                    className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {inFlight ? "Cancelling..." : "Cancel"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WorkerDetailPanel({
  selectedWorkerId,
  detail,
  loading,
  error,
  debugResult,
  debugError,
  debugJobLoadingId,
  onDebugJob,
  onApplyPatch,
}: {
  selectedWorkerId: string | null;
  detail: WorkerDetail | null;
  loading: boolean;
  error: string | null;
  debugResult: DebugJobResult | null;
  debugError: string | null;
  debugJobLoadingId: string | null;
  onDebugJob: (jobId: string) => void;
  onApplyPatch: (jobId: string) => void;
}) {
  if (!selectedWorkerId && !detail && !loading && !debugResult && !debugError) return null;

  return (
    <section className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3">
      <SectionHeader>Selected Worker</SectionHeader>
      {loading && <p className="text-sm text-zinc-500">Loading worker detail...</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}
      {detail && (
        <div className="space-y-2 text-xs text-zinc-600">
          <div className="rounded-md border border-zinc-200 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">What this worker is doing</p>
            <p className="mt-1 text-sm font-medium text-zinc-900">{formatCurrentTaskSummary(detail)}</p>
            <p className="mt-2 text-xs text-zinc-600">{formatRunSummary(detail)}</p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-md border border-zinc-200 bg-white p-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Worker ID</p>
              <p className="mt-1 break-all font-mono text-zinc-700">{detail.worker.worker_id}</p>
            </div>
            <div className="rounded-md border border-zinc-200 bg-white p-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Worker type</p>
              <p className="mt-1 text-sm font-medium text-zinc-900">{formatWorkerRoleLabel(detail.worker.stage)}</p>
            </div>
            <div className="rounded-md border border-zinc-200 bg-white p-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Run</p>
              <p className="mt-1 break-all font-mono text-zinc-700">{detail.run?.run_id ?? "-"}</p>
            </div>
            <div className="rounded-md border border-zinc-200 bg-white p-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Reported phase</p>
              <p className="mt-1 text-sm text-zinc-900">{formatPhaseLabel(detail.currently_scraping)}</p>
            </div>
          </div>
          {detail.worker.supported_platforms && detail.worker.supported_platforms.length > 0 && (
            <p>Platforms this worker can pick up: {formatSupportedPlatformsLabel(detail.worker.supported_platforms)}</p>
          )}
          {(detail.run?.execution_owner || detail.run?.execution_backend_canonical || detail.run?.execution_mode_canonical) && (
            <p>
              Execution: {formatExecutionOwnerLabel(detail.run?.execution_owner)}
              {detail.run?.execution_backend_canonical
                ? ` · ${formatExecutionBackendLabel(detail.run.execution_backend_canonical)}`
                : ""}
              {detail.run?.execution_mode_canonical
                ? ` · ${formatExecutionModeLabel(detail.run.execution_mode_canonical)}`
                : ""}
            </p>
          )}
          {detail.current_job ? (
            <div className="rounded-md border border-zinc-200 bg-white p-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Current task</p>
              <p className="mt-1 font-medium text-zinc-800">
                {titleCaseWords(detail.current_job.platform)} / {formatStageLabel(detail.current_job.job_type)}
              </p>
              <p>Handle: {detail.current_job.account_handle ?? "-"}</p>
              <p>
                Progress reported: {detail.progress_made.items_found.toLocaleString()} items scraped ·{" "}
                {detail.progress_made.posts_upserted.toLocaleString()} posts saved ·{" "}
                {detail.progress_made.comments_upserted.toLocaleString()} comments saved
              </p>
              <p>
                Current job ID: <span className="font-mono">{detail.current_job.id}</span>
              </p>
              <div className="mt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Admin-only actions</p>
                <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onDebugJob(detail.current_job?.id ?? "")}
                  disabled={!detail.current_job?.id || debugJobLoadingId === detail.current_job?.id}
                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {debugJobLoadingId === detail.current_job?.id ? "Debugging..." : "Debug current job"}
                </button>
                <button
                  type="button"
                  onClick={() => onApplyPatch(detail.current_job?.id ?? "")}
                  disabled={!detail.current_job?.id || debugJobLoadingId === detail.current_job?.id}
                  className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Apply suggested patch
                </button>
                </div>
              </div>
            </div>
          ) : (
            <p>No current job attached to this worker.</p>
          )}
        </div>
      )}
      {debugError && <p className="text-sm text-red-700">{debugError}</p>}
      {debugResult && (
        <div className="space-y-2 rounded-md border border-zinc-200 bg-white p-2 text-xs text-zinc-700">
          <p>
            Model: <span className="font-mono">{debugResult.model_used}</span>
            {debugResult.fallback_used ? " (fallback)" : ""}
          </p>
          <p>{debugResult.analysis.root_cause}</p>
          {debugResult.apply.error && <p className="text-red-700">Apply error: {debugResult.apply.error}</p>}
          {debugResult.apply.applied && (
            <p className="text-emerald-700">Patch applied to {debugResult.apply.files_changed.join(", ")}</p>
          )}
          {debugResult.patch_unified_diff && (
            <pre className="max-h-52 overflow-auto rounded border border-zinc-200 bg-zinc-900 p-2 text-[11px] text-zinc-100">
              {debugResult.patch_unified_diff}
            </pre>
          )}
        </div>
      )}
    </section>
  );
}

export function HealthIndicator({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  const pathname = usePathname() ?? "";
  const socialRoute = useMemo(() => isSocialAdminPath(pathname), [pathname]);
  const healthDot = useSharedHealthDot({ isOpen: false, isSocialRoute: socialRoute });
  const liveStatus = useAdminLiveStatus({ shouldRun: socialRoute });
  const statusData = (liveStatus.data?.health_dot as HealthDotStatus | null | undefined) ?? healthDot.data;
  const state = healthState(statusData, liveStatus.error ?? healthDot.error);

  return (
    <button
      type="button"
      aria-label={`System health: ${healthLabel(state)}`}
      onClick={onClick}
      className={
        className ??
        "group absolute right-4 flex items-center gap-1.5 rounded-full border border-black px-2.5 py-1.5 transition hover:bg-black/[0.04]"
      }
    >
      <span className={`relative inline-block h-2.5 w-2.5 rounded-full ${healthDotColor(state)}`}>
        {state === "healthy" && (
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-30" />
        )}
      </span>
      <span className="hidden text-xs font-medium text-black/65 group-hover:inline">{healthLabel(state)}</span>
    </button>
  );
}

export default function SystemHealthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname() ?? "";
  const socialRoute = useMemo(() => isSocialAdminPath(pathname), [pathname]);

  const healthDot = useSharedHealthDot({ isOpen, isSocialRoute: socialRoute });
  const liveStatus = useAdminLiveStatus({ shouldRun: isOpen || socialRoute });
  const queueStatus = useMemo(
    () => ({
      data: (liveStatus.data?.queue_status as QueueStatus | null | undefined) ?? null,
      error: liveStatus.error,
      lastFetched: liveStatus.lastFetched,
      refetch: liveStatus.refetch,
    }),
    [liveStatus.data, liveStatus.error, liveStatus.lastFetched, liveStatus.refetch],
  );
  const adminOperations = useMemo(
    () => ({
      data: (liveStatus.data?.admin_operations as AdminOperationsHealth | null | undefined) ?? null,
      error: liveStatus.error,
      lastFetched: liveStatus.lastFetched,
      refetch: liveStatus.refetch,
    }),
    [liveStatus.data, liveStatus.error, liveStatus.lastFetched, liveStatus.refetch],
  );
  const [cancelingJobIds, setCancelingJobIds] = useState<Set<string>>(new Set());
  const [cancelingBlockedJobIds, setCancelingBlockedJobIds] = useState<Set<string>>(new Set());
  const [dismissingFailureIds, setDismissingFailureIds] = useState<Set<string>>(new Set());
  const [clearingAll, setClearingAll] = useState(false);
  const [clearingBlockedAll, setClearingBlockedAll] = useState(false);
  const [clearingStaleAdminOperations, setClearingStaleAdminOperations] = useState(false);
  const [cancelingAdminOperationIds, setCancelingAdminOperationIds] = useState<Set<string>>(new Set());
  const [cancelingAllActiveAdminOperations, setCancelingAllActiveAdminOperations] = useState(false);
  const [cancelingActiveJobs, setCancelingActiveJobs] = useState(false);
  const [dismissingAllRecentFailures, setDismissingAllRecentFailures] = useState(false);
  const [resettingHealth, setResettingHealth] = useState(false);
  const [clearingOlderWorkerCheckins, setClearingOlderWorkerCheckins] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [workerDetail, setWorkerDetail] = useState<WorkerDetail | null>(null);
  const [workerDetailLoading, setWorkerDetailLoading] = useState(false);
  const [workerDetailError, setWorkerDetailError] = useState<string | null>(null);
  const [debugJobLoadingId, setDebugJobLoadingId] = useState<string | null>(null);
  const [debugResult, setDebugResult] = useState<DebugJobResult | null>(null);
  const [debugError, setDebugError] = useState<string | null>(null);

  const statusData: HealthDotStatus | null = liveStatus.data?.health_dot
    ? (liveStatus.data.health_dot as HealthDotStatus)
    : queueStatus.data
    ? {
        queue_enabled: queueStatus.data.queue_enabled,
        workers: {
          healthy: queueStatus.data.workers.healthy,
          healthy_workers: queueStatus.data.workers.healthy_workers,
        },
        queue: {
          by_status: queueStatus.data.queue.by_status,
        },
      }
    : healthDot.data;

  const state = healthState(statusData, liveStatus.error ?? queueStatus.error ?? healthDot.error);
  const lastFetched =
    liveStatus.lastFetched ?? adminOperations.lastFetched ?? queueStatus.lastFetched ?? healthDot.lastFetched;
  const modalState = useMemo(
    () => {
      const socialState = queueStatus.data ? modalQueueHealthState(queueStatus.data) : state;
      if (socialState === "error" || socialState === "down") return socialState;
      if (adminOperations.error) return "error";
      if ((adminOperations.data?.summary.stale_total ?? 0) > 0) return "degraded";
      if ((adminOperations.data?.summary.active_total ?? 0) > 0 && socialState === "healthy") return "healthy";
      return socialState;
    },
    [adminOperations.data, adminOperations.error, queueStatus.data, state],
  );
  const viewModel = useMemo(
    () => (queueStatus.data ? buildSystemHealthViewModel(queueStatus.data, modalState) : null),
    [modalState, queueStatus.data],
  );
  const hasActiveAdminOperations = (adminOperations.data?.summary.active_total ?? 0) > 0;
  const hasStaleAdminOperations = (adminOperations.data?.summary.stale_total ?? 0) > 0;
  const hasRecentFailures = (queueStatus.data?.queue.recent_failures?.length ?? 0) > 0;

  const cancelStuckJobs = useCallback(
    async (jobIds: string[]) => {
      const response = await fetchAdminWithAuth(
        CANCEL_STUCK_JOBS_URL,
        {
          method: "POST",
          cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ job_ids: jobIds }),
        },
        { allowDevAdminBypass: true },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        cancelled_jobs?: number;
        stuck_jobs_remaining?: number;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? `HTTP ${response.status}`);
      }
      await Promise.all([queueStatus.refetch(), healthDot.refetch()]);
      return {
        cancelledJobs: Number(payload.cancelled_jobs ?? 0),
        stuckJobsRemaining: Number(payload.stuck_jobs_remaining ?? 0),
      };
    },
    [healthDot, queueStatus],
  );

  const cancelDispatchBlockedJobs = useCallback(
    async (jobIds: string[]) => {
      const response = await fetchAdminWithAuth(
        CANCEL_DISPATCH_BLOCKED_JOBS_URL,
        {
          method: "POST",
          cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ job_ids: jobIds }),
        },
        { allowDevAdminBypass: true },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        cancelled_jobs?: number;
        dispatch_blocked_jobs_remaining?: number;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? `HTTP ${response.status}`);
      }
      await Promise.all([queueStatus.refetch(), healthDot.refetch()]);
      return {
        cancelledJobs: Number(payload.cancelled_jobs ?? 0),
        dispatchBlockedJobsRemaining: Number(payload.dispatch_blocked_jobs_remaining ?? 0),
      };
    },
    [healthDot, queueStatus],
  );

  const fetchWorkerDetail = useCallback(async (workerId: string) => {
    setSelectedWorkerId(workerId);
    setWorkerDetailLoading(true);
    setWorkerDetailError(null);
    try {
      const response = await fetchAdminWithAuth(
        `${WORKER_DETAIL_URL_BASE}/${encodeURIComponent(workerId)}/detail`,
        { cache: "no-store" },
        { allowDevAdminBypass: true },
      );
      const payload = (await response.json().catch(() => ({}))) as WorkerDetail & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? `HTTP ${response.status}`);
      }
      setWorkerDetail(payload);
    } catch (error) {
      setWorkerDetail(null);
      setWorkerDetailError(error instanceof Error ? error.message : "Failed to fetch worker detail");
    } finally {
      setWorkerDetailLoading(false);
    }
  }, []);

  const runJobDebug = useCallback(async (jobId: string, applyPatch: boolean) => {
    if (!jobId) return;
    setDebugJobLoadingId(jobId);
    setDebugError(null);
    try {
      const response = await fetchAdminWithAuth(
        `${DEBUG_JOB_URL_BASE}/${jobId}/debug`,
        {
          method: "POST",
          cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            apply_patch: applyPatch,
            confirm_apply: applyPatch,
            include_context: true,
          }),
        },
        { allowDevAdminBypass: true },
      );
      const payload = (await response.json().catch(() => ({}))) as DebugJobResult & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? `HTTP ${response.status}`);
      }
      setDebugResult(payload);
      if (applyPatch && payload.apply.applied) {
        setActionNotice(`Patch applied for job ${jobId.slice(0, 8)}.`);
      }
    } catch (error) {
      setDebugError(error instanceof Error ? error.message : "Failed to debug job");
    } finally {
      setDebugJobLoadingId(null);
    }
  }, []);

  useEffect(() => {
    if (isOpen) return;
    setSelectedWorkerId(null);
    setWorkerDetail(null);
    setWorkerDetailError(null);
    setDebugResult(null);
    setDebugError(null);
    setDebugJobLoadingId(null);
    setCancelingBlockedJobIds(new Set());
    setClearingBlockedAll(false);
  }, [isOpen]);

  const cancelSingleStuckJob = useCallback(
    async (jobId: string) => {
      setActionNotice(null);
      setActionError(null);
      setCancelingJobIds((previous) => {
        const next = new Set(previous);
        next.add(jobId);
        return next;
      });
      try {
        const result = await cancelStuckJobs([jobId]);
        setActionNotice(
          result.cancelledJobs > 0
            ? `Cancelled stuck job ${jobId.slice(0, 8)}.`
            : `Job ${jobId.slice(0, 8)} was no longer stuck.`,
        );
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Failed to cancel stuck job");
      } finally {
        setCancelingJobIds((previous) => {
          const next = new Set(previous);
          next.delete(jobId);
          return next;
        });
      }
    },
    [cancelStuckJobs],
  );

  const clearAllStuckJobs = useCallback(async () => {
    setActionNotice(null);
    setActionError(null);
    setClearingAll(true);
    try {
      const result = await cancelStuckJobs([]);
      if (result.cancelledJobs > 0) {
        setActionNotice(`Cancelled ${result.cancelledJobs} stuck jobs.`);
      } else {
        setActionNotice("No stuck jobs needed cancellation.");
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to clear stuck jobs");
    } finally {
      setClearingAll(false);
    }
  }, [cancelStuckJobs]);

  const cancelSingleDispatchBlockedJob = useCallback(
    async (jobId: string) => {
      setActionNotice(null);
      setActionError(null);
      setCancelingBlockedJobIds((previous) => {
        const next = new Set(previous);
        next.add(jobId);
        return next;
      });
      try {
        const result = await cancelDispatchBlockedJobs([jobId]);
        setActionNotice(
          result.cancelledJobs > 0
            ? `Cancelled dispatch-blocked job ${jobId.slice(0, 8)}.`
            : `Job ${jobId.slice(0, 8)} was no longer dispatch blocked.`,
        );
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Failed to cancel dispatch-blocked job");
      } finally {
        setCancelingBlockedJobIds((previous) => {
          const next = new Set(previous);
          next.delete(jobId);
          return next;
        });
      }
    },
    [cancelDispatchBlockedJobs],
  );

  const clearAllDispatchBlockedJobs = useCallback(async () => {
    setActionNotice(null);
    setActionError(null);
    setClearingBlockedAll(true);
    try {
      const result = await cancelDispatchBlockedJobs([]);
      if (result.cancelledJobs > 0) {
        setActionNotice(`Cancelled ${result.cancelledJobs} dispatch-blocked jobs.`);
      } else {
        setActionNotice("No dispatch-blocked jobs needed cancellation.");
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to clear dispatch-blocked jobs");
    } finally {
      setClearingBlockedAll(false);
    }
  }, [cancelDispatchBlockedJobs]);

  const clearStaleAdminOperations = useCallback(async () => {
    setActionNotice(null);
    setActionError(null);
    setClearingStaleAdminOperations(true);
    try {
      const response = await fetchAdminWithAuth(
        CANCEL_STALE_ADMIN_OPERATIONS_URL,
        {
          method: "POST",
          cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        },
        { allowDevAdminBypass: true },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        cancelled_operations?: number;
        stale_operations_remaining?: number;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? `HTTP ${response.status}`);
      }
      await Promise.all([adminOperations.refetch(), queueStatus.refetch(), healthDot.refetch()]);
      const cancelledOperations = Number(payload.cancelled_operations ?? 0);
      const remaining = Number(payload.stale_operations_remaining ?? 0);
      setActionNotice(
        cancelledOperations > 0
          ? `Cancelled ${cancelledOperations} stale admin operation${cancelledOperations === 1 ? "" : "s"}.${remaining > 0 ? ` ${remaining} still stale.` : ""}`
          : "No stale admin operations needed cleanup.",
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to clear stale admin operations");
    } finally {
      setClearingStaleAdminOperations(false);
    }
  }, [adminOperations, healthDot, queueStatus]);

  const cancelSingleAdminOperation = useCallback(
    async (operationId: string) => {
      setActionNotice(null);
      setActionError(null);
      setCancelingAdminOperationIds((current) => new Set(current).add(operationId));
      try {
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/operations/${operationId}/cancel`,
          {
            method: "POST",
            cache: "no-store",
          },
          { allowDevAdminBypass: true },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          cancelled_operations?: number;
          cancelled_operation_ids?: string[];
          operation?: { status?: string | null };
        };
        if (!response.ok) {
          throw new Error(payload.error ?? `HTTP ${response.status}`);
        }
        await Promise.all([adminOperations.refetch(), queueStatus.refetch(), healthDot.refetch()]);
        const cancelledOperations = Number(payload.cancelled_operations ?? 0);
        const status = String(payload.operation?.status || "").trim().toLowerCase();
        if (status === "cancelled") {
          setActionNotice(
            cancelledOperations > 1
              ? `Cancelled ${cancelledOperations} related admin operations from ${operationId.slice(0, 8)}.`
              : `Admin operation ${operationId.slice(0, 8)} cancelled.`,
          );
        } else {
          setActionNotice(
            cancelledOperations > 1
              ? `Cancellation requested for ${cancelledOperations} related admin operations from ${operationId.slice(0, 8)}.`
              : `Cancellation requested for admin operation ${operationId.slice(0, 8)}.`,
          );
        }
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Failed to cancel admin operation");
      } finally {
        setCancelingAdminOperationIds((current) => {
          const next = new Set(current);
          next.delete(operationId);
          return next;
        });
      }
    },
    [adminOperations, healthDot, queueStatus],
  );

  const cancelAllActiveAdminOperations = useCallback(async () => {
    setActionNotice(null);
    setActionError(null);
    setCancelingAllActiveAdminOperations(true);
    try {
      const response = await fetchAdminWithAuth(
        CANCEL_ACTIVE_ADMIN_OPERATIONS_URL,
        {
          method: "POST",
          cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ cancel_all_active: true }),
        },
        { allowDevAdminBypass: true },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        cancel_requested_operations?: number;
        active_operations_remaining?: number;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? `HTTP ${response.status}`);
      }
      await Promise.all([adminOperations.refetch(), queueStatus.refetch(), healthDot.refetch()]);
      const requested = Number(payload.cancel_requested_operations ?? 0);
      const remaining = Number(payload.active_operations_remaining ?? 0);
      setActionNotice(
        requested > 0
          ? `Requested cancellation for ${requested} active admin operation${requested === 1 ? "" : "s"}.${remaining > 0 ? ` ${remaining} still active.` : ""}`
          : "No active admin operations needed cancellation.",
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to cancel active admin operations");
    } finally {
      setCancelingAllActiveAdminOperations(false);
    }
  }, [adminOperations, healthDot, queueStatus]);

  const dismissRecentFailure = useCallback(
    async (jobId: string) => {
      setActionNotice(null);
      setActionError(null);
      setDismissingFailureIds((current) => new Set(current).add(jobId));
      try {
        const response = await fetchAdminWithAuth(
          DISMISS_RECENT_FAILURES_URL,
          {
            method: "POST",
            cache: "no-store",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ job_ids: [jobId] }),
          },
          { allowDevAdminBypass: true },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          dismissed_jobs?: number;
          recent_failures_remaining?: number;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? `HTTP ${response.status}`);
        }
        await Promise.all([queueStatus.refetch(), healthDot.refetch()]);
        const dismissedJobs = Number(payload.dismissed_jobs ?? 0);
        const remaining = Number(payload.recent_failures_remaining ?? 0);
        if (dismissedJobs > 0) {
          setActionNotice(
            `Dismissed ${dismissedJobs} recent failure${dismissedJobs === 1 ? "" : "s"}. ${
              remaining > 0 ? `${remaining} still visible.` : "No recent failures remain."
            }`,
          );
        } else {
          setActionNotice("That failure was already cleared from the panel.");
        }
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Failed to dismiss recent failure");
      } finally {
        setDismissingFailureIds((current) => {
          const next = new Set(current);
          next.delete(jobId);
          return next;
        });
      }
    },
    [healthDot, queueStatus],
  );

  const dismissAllRecentFailures = useCallback(async () => {
    setActionNotice(null);
    setActionError(null);
    setDismissingAllRecentFailures(true);
    try {
      const response = await fetchAdminWithAuth(
        DISMISS_RECENT_FAILURES_URL,
        {
          method: "POST",
          cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ dismiss_all_visible: true }),
        },
        { allowDevAdminBypass: true },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        dismissed_jobs?: number;
        recent_failures_remaining?: number;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? `HTTP ${response.status}`);
      }
      await Promise.all([queueStatus.refetch(), healthDot.refetch()]);
      const dismissedJobs = Number(payload.dismissed_jobs ?? 0);
      const remaining = Number(payload.recent_failures_remaining ?? 0);
      setActionNotice(
        dismissedJobs > 0
          ? `Dismissed ${dismissedJobs} recent failure${dismissedJobs === 1 ? "" : "s"}.${remaining > 0 ? ` ${remaining} still visible.` : ""}`
          : "No recent failures needed dismissal.",
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to dismiss recent failures");
    } finally {
      setDismissingAllRecentFailures(false);
    }
  }, [healthDot, queueStatus]);

  const cancelAllActiveJobs = useCallback(async () => {
    setActionNotice(null);
    setActionError(null);
    setCancelingActiveJobs(true);
    try {
      const response = await fetchAdminWithAuth(
        CANCEL_ACTIVE_JOBS_URL,
        {
          method: "POST",
          cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        },
        { allowDevAdminBypass: true },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        cancelled_jobs?: number;
        active_jobs_remaining?: number;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? `HTTP ${response.status}`);
      }
      await Promise.all([queueStatus.refetch(), healthDot.refetch()]);
      const cancelledJobs = Number(payload.cancelled_jobs ?? 0);
      const remaining = Number(payload.active_jobs_remaining ?? 0);
      if (cancelledJobs > 0) {
        setActionNotice(`Cancelled ${cancelledJobs} active jobs.${remaining > 0 ? ` ${remaining} still active.` : ""}`);
      } else {
        setActionNotice("No active jobs needed cancellation.");
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to cancel active jobs");
    } finally {
      setCancelingActiveJobs(false);
    }
  }, [healthDot, queueStatus]);

  const resetSocialIngestHealth = useCallback(async () => {
    setActionNotice(null);
    setActionError(null);
    setResettingHealth(true);
    try {
      const response = await fetchAdminWithAuth(
        RESET_SOCIAL_INGEST_HEALTH_URL,
        {
          method: "POST",
          cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        },
        { allowDevAdminBypass: true },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        cancelled_jobs?: number;
        dismissed_failures?: number;
        dismissed_failed_runs?: number;
        active_jobs_remaining?: number;
        recent_failures_remaining?: number;
        failed_runs_remaining?: number;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? `HTTP ${response.status}`);
      }
      await Promise.all([queueStatus.refetch(), healthDot.refetch()]);
      setActionNotice(
        `Fresh slate ready: cancelled ${Number(payload.cancelled_jobs ?? 0)} active jobs, ` +
          `dismissed ${Number(payload.dismissed_failures ?? 0)} recent failures, ` +
          `hid ${Number(payload.dismissed_failed_runs ?? 0)} failed runs. ` +
          `${Number(payload.active_jobs_remaining ?? 0)} active jobs, ` +
          `${Number(payload.recent_failures_remaining ?? 0)} visible failures, and ` +
          `${Number(payload.failed_runs_remaining ?? 0)} visible failed runs remain.`,
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to reset social ingest health");
    } finally {
      setResettingHealth(false);
    }
  }, [healthDot, queueStatus]);

  const clearOlderWorkerCheckins = useCallback(async () => {
    setActionNotice(null);
    setActionError(null);
    setClearingOlderWorkerCheckins(true);
    try {
      const response = await fetchAdminWithAuth(
        PURGE_INACTIVE_WORKERS_URL,
        {
          method: "POST",
          cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        },
        { allowDevAdminBypass: true },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        deleted_workers?: number;
        total_workers_after?: number;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? `HTTP ${response.status}`);
      }
      await Promise.all([queueStatus.refetch(), healthDot.refetch()]);
      const deletedWorkers = Number(payload.deleted_workers ?? 0);
      const totalWorkersAfter = Number(payload.total_workers_after ?? 0);
      setActionNotice(
        deletedWorkers > 0
          ? `Cleared ${deletedWorkers} older worker check-ins. ${totalWorkersAfter} workers remain visible.`
          : "No older worker check-ins needed cleanup.",
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to clear older worker check-ins");
    } finally {
      setClearingOlderWorkerCheckins(false);
    }
  }, [healthDot, queueStatus]);

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="System Jobs Health"
      panelClassName="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl"
    >
      <div className="mb-5 flex items-start gap-3">
        <span className={`mt-1 inline-block h-3 w-3 rounded-full ${healthDotColor(modalState)}`} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900">{modalHealthLabel(modalState)}</span>
            {statusData?.queue_enabled === false && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Queue disabled</span>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            Shows whether workers are available, whether gallery and social jobs are moving, and whether anything needs
            intervention across both queues.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-zinc-400">
            {lastFetched ? `Updated ${relativeTime(lastFetched.toISOString())}` : "Loading..."}
          </span>
          <button
            type="button"
            onClick={() => {
              adminOperations.refetch();
              queueStatus.refetch();
              healthDot.refetch();
            }}
            className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
          >
            Refresh
          </button>
        </div>
      </div>
      <div className="max-h-[calc(90vh-8.5rem)] overflow-y-auto pr-1">
        {(queueStatus.error || healthDot.error || adminOperations.error) && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {adminOperations.error ?? queueStatus.error ?? healthDot.error}
          </div>
        )}

        {actionError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        )}
        {actionNotice && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {actionNotice}
          </div>
        )}

        {(queueStatus.data || adminOperations.data) && (
          <div className="sticky top-0 z-10 mb-4 rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Immediate Actions
              </span>
              <button
                type="button"
                onClick={() => {
                  void cancelAllActiveAdminOperations();
                }}
                disabled={cancelingAllActiveAdminOperations || !hasActiveAdminOperations}
                className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelingAllActiveAdminOperations ? "Cancelling active admin jobs..." : "Cancel all active admin operations"}
              </button>
              <button
                type="button"
                onClick={() => {
                  void clearStaleAdminOperations();
                }}
                disabled={clearingStaleAdminOperations || !hasStaleAdminOperations}
                className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {clearingStaleAdminOperations ? "Clearing stale..." : "Force cancel stale admin operations"}
              </button>
              <button
                type="button"
                onClick={() => {
                  void dismissAllRecentFailures();
                }}
                disabled={dismissingAllRecentFailures || !hasRecentFailures}
                className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {dismissingAllRecentFailures ? "Dismissing..." : "Dismiss all error patterns"}
              </button>
            </div>
          </div>
        )}

        {!queueStatus.data && !adminOperations.data && (
          <p className="text-sm text-zinc-500">Loading detailed queue and worker diagnostics...</p>
        )}

        {queueStatus.data && viewModel && (
          <div className="space-y-6">
            <section>
              <SummaryCards cards={viewModel.summaryCards} />
            </section>

            <hr className="border-zinc-100" />

            {adminOperations.data && (
              <>
                <section>
                  <SectionHeader>Admin Operations</SectionHeader>
                  <p className="mb-3 text-sm text-zinc-600">
                    Long-running show, person, and gallery workflows running through the shared remote execution plane.
                  </p>
                  <SummaryCards
                    columns={4}
                    cards={[
                      {
                        title: "Active admin jobs",
                        value: String(adminOperations.data.summary.active_total),
                        detail: "Non-terminal admin operations",
                        tone: adminOperations.data.summary.active_total > 0 ? "neutral" : "good",
                      },
                      {
                        title: "Stale admin jobs",
                        value: String(adminOperations.data.summary.stale_total),
                        detail: "Need cleanup or operator review",
                        tone: adminOperations.data.summary.stale_total > 0 ? "bad" : "good",
                      },
                      {
                        title: "Cancelling",
                        value: String(adminOperations.data.summary.cancelling_total),
                        detail: "Waiting for workers to stop",
                        tone: adminOperations.data.summary.cancelling_total > 0 ? "warn" : "neutral",
                      },
                      {
                        title: "Runtime split",
                        value: `${adminOperations.data.summary.runtime_split.modal}/${adminOperations.data.summary.runtime_split.local}`,
                        detail: "Modal vs Local active operations",
                        tone:
                          adminOperations.data.summary.runtime_split.local > 0 &&
                          adminOperations.data.summary.runtime_split.modal === 0
                            ? "warn"
                            : "neutral",
                      },
                    ]}
                  />
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-zinc-900">Active admin operations</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            The newest non-terminal workflows, including runtime ownership and the last update age.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            void cancelAllActiveAdminOperations();
                          }}
                          disabled={cancelingAllActiveAdminOperations || (adminOperations.data.summary.active_total ?? 0) <= 0}
                          className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {cancelingAllActiveAdminOperations ? "Cancelling..." : "Cancel all active admin operations"}
                        </button>
                      </div>
                      <div className="mt-3">
                        <AdminOperationsTable
                          operations={adminOperations.data.active_operations}
                          emptyMessage="No active admin operations right now."
                          cancelingOperationIds={cancelingAdminOperationIds}
                          onCancelOperation={cancelSingleAdminOperation}
                          cancelActionLabel="Cancel run"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-zinc-900">Stale admin operations</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            These jobs have dead heartbeats or have been cancelling past the grace window.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            void clearStaleAdminOperations();
                          }}
                          disabled={clearingStaleAdminOperations || (adminOperations.data.summary.stale_total ?? 0) <= 0}
                          className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {clearingStaleAdminOperations ? "Clearing..." : "Force cancel stale admin operations"}
                        </button>
                      </div>
                      <AdminOperationsTable
                        operations={adminOperations.data.stale_operations}
                        emptyMessage="No stale admin operations detected."
                      />
                    </div>
                  </div>
                </section>

                <hr className="border-zinc-100" />
              </>
            )}

            <section>
              <SectionHeader>How This Sync Runs</SectionHeader>
              <WorkerPlaneSummary viewModel={viewModel} />
            </section>

            <hr className="border-zinc-100" />

            <section>
              <SectionHeader>Queue Health</SectionHeader>
              <QueueHealthSection viewModel={viewModel} />
            </section>

            <hr className="border-zinc-100" />

            <section>
              <SectionHeader>Live Workers</SectionHeader>
              <WorkersList
                workers={queueStatus.data.workers.workers}
                staleAfterSeconds={queueStatus.data.workers.stale_after_seconds}
                staleHiddenCount={queueStatus.data.workers.stale_hidden_count}
                selectedWorkerId={selectedWorkerId}
                onInspectWorker={(worker) => {
                  void fetchWorkerDetail(worker.worker_id);
                }}
                onDebugJob={(jobId) => {
                  void runJobDebug(jobId, false);
                }}
                onClearOlderWorkerCheckins={() => {
                  void clearOlderWorkerCheckins();
                }}
                clearingOlderWorkerCheckins={clearingOlderWorkerCheckins}
                debugJobLoadingId={debugJobLoadingId}
                workersSummaryLabel={viewModel.workersSummaryLabel}
                executionBackend={queueStatus.data.remote_plane?.execution_backend_canonical ?? queueStatus.data.workers.executor_backend}
              />
              <WorkerDetailPanel
                selectedWorkerId={selectedWorkerId}
                detail={workerDetail}
                loading={workerDetailLoading}
                error={workerDetailError}
                debugResult={debugResult}
                debugError={debugError}
                debugJobLoadingId={debugJobLoadingId}
                onDebugJob={(jobId) => {
                  void runJobDebug(jobId, false);
                }}
                onApplyPatch={(jobId) => {
                  void runJobDebug(jobId, true);
                }}
              />
            </section>

            <hr className="border-zinc-100" />

            <section>
              <SectionHeader>Running Jobs</SectionHeader>
              <p className="mb-3 text-sm text-zinc-600">
                These are the job rows currently marked running in the queue, regardless of which worker card they map to.
              </p>
              <RunningJobs jobs={queueStatus.data.queue.running_jobs ?? []} />
            </section>

            <hr className="border-zinc-100" />

            <section>
              <SectionHeader>Problems to Review</SectionHeader>
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-medium text-zinc-900">Dispatch Blocked</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    These jobs are waiting in the queue, but dispatch is failing before any worker can claim them.
                  </p>
                  <div className="mt-3">
                    <StuckJobs
                      jobs={queueStatus.data.queue.dispatch_blocked_jobs ?? []}
                      total={queueStatus.data.queue.dispatch_blocked_jobs_total ?? 0}
                      cancelingJobIds={cancelingBlockedJobIds}
                      clearingAll={clearingBlockedAll}
                      onCancelJob={cancelSingleDispatchBlockedJob}
                      onClearAll={clearAllDispatchBlockedJobs}
                      itemLabel="dispatch blocked jobs"
                      emptyLabel="No dispatch-blocked jobs detected."
                      clearAllLabel="Cancel all dispatch-blocked jobs"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">Likely Stuck Jobs</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    These jobs were claimed by a worker but have not reported progress in time.
                  </p>
                  <div className="mt-3">
                    <StuckJobs
                      jobs={queueStatus.data.queue.stuck_jobs ?? []}
                      total={queueStatus.data.queue.stuck_jobs_total ?? 0}
                      cancelingJobIds={cancelingJobIds}
                      clearingAll={clearingAll}
                      onCancelJob={cancelSingleStuckJob}
                      onClearAll={clearAllStuckJobs}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">Recent Error Patterns</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        These are the most recent job failures, grouped in the order they occurred.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void dismissAllRecentFailures();
                      }}
                      disabled={dismissingAllRecentFailures || !hasRecentFailures}
                      className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {dismissingAllRecentFailures ? "Dismissing..." : "Dismiss all"}
                    </button>
                  </div>
                  <div className="mt-3">
                    <RecentFailures
                      failures={queueStatus.data.queue.recent_failures}
                      dismissingFailureIds={dismissingFailureIds}
                      onDismissFailure={dismissRecentFailure}
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
      {(queueStatus.data || adminOperations.data) && (
        <div className="mt-4 border-t border-zinc-100 pt-4">
          <SectionHeader>Admin Actions</SectionHeader>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                void cancelAllActiveAdminOperations();
              }}
              disabled={cancelingAllActiveAdminOperations || (adminOperations.data?.summary.active_total ?? 0) <= 0}
              className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelingAllActiveAdminOperations ? "Cancelling active admin operations..." : "Cancel all active admin operations"}
            </button>
            <p className="text-xs text-zinc-500">
              Stops all currently active admin-operation workflows, including show refresh runs that are still attached to workers.
            </p>
            <button
              type="button"
              onClick={() => {
                void clearStaleAdminOperations();
              }}
              disabled={clearingStaleAdminOperations || (adminOperations.data?.summary.stale_total ?? 0) <= 0}
              className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {clearingStaleAdminOperations ? "Clearing stale admin operations..." : "Force cancel stale admin operations"}
            </button>
            <p className="text-xs text-zinc-500">
              Use this when gallery or admin jobs are stuck in pending, running, or cancelling after heartbeats stop.
            </p>
            <button
              type="button"
              onClick={() => {
                void resetSocialIngestHealth();
              }}
              disabled={
                resettingHealth ||
                cancelingAllActiveAdminOperations ||
                cancelingActiveJobs ||
                clearingAll ||
                cancelingJobIds.size > 0 ||
                clearingBlockedAll ||
                cancelingBlockedJobIds.size > 0
              }
              className="w-full rounded-md border border-zinc-300 bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resettingHealth ? "Resetting health..." : "Fresh slate reset"}
            </button>
            <p className="text-xs text-zinc-500">
              Cancels active work and hides failed job/run history from this health surface without deleting saved posts.
            </p>
            <button
              type="button"
              onClick={() => {
                void cancelAllActiveJobs();
              }}
              disabled={
                resettingHealth ||
                cancelingAllActiveAdminOperations ||
                cancelingActiveJobs ||
                clearingAll ||
                cancelingJobIds.size > 0 ||
                clearingBlockedAll ||
                cancelingBlockedJobIds.size > 0
              }
              className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelingActiveJobs ? "Cancelling active jobs..." : "Cancel all active jobs"}
            </button>
            <p className="mt-1 text-xs text-zinc-500">
              Use only if the queue is wedged or you need to stop every active social sync job.
            </p>
          </div>
        </div>
      )}
    </AdminModal>
  );
}
