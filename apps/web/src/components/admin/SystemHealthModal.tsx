"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import AdminModal from "@/components/admin/AdminModal";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";

type WorkerEntry = {
  worker_id: string;
  stage: string;
  status: string;
  run_id?: string | null;
  current_job_id?: string | null;
  metadata?: Record<string, unknown> | null;
  last_seen_at: string | null;
  is_healthy: boolean;
};

type WorkerHealth = {
  healthy: boolean;
  healthy_workers: number;
  active_workers: number;
  total_workers: number;
  stale_after_seconds: number;
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

type WorkerDetail = {
  worker: {
    worker_id: string;
    stage: string;
    status: string;
    run_id: string | null;
    current_job_id: string | null;
    started_at: string | null;
    last_seen_at: string | null;
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
  workers: WorkerHealth;
  queue: {
    by_status: Record<string, number>;
    runs_by_status?: Record<string, number>;
    runs_total?: number;
    by_platform: Record<string, Record<string, number>>;
    by_job_type: Record<string, Record<string, number>>;
    recent_failures: FailureEntry[];
    stuck_jobs: StuckJobEntry[];
    stuck_jobs_total: number;
    error?: string;
  };
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

const POLL_INTERVAL_MS = 30_000;
const FOLLOWER_CHECK_INTERVAL_MS = 5_000;
const FETCH_TIMEOUT_MS = 12_000;
const STARTUP_JITTER_MIN_MS = 200;
const STARTUP_JITTER_MAX_MS = 1_800;
const LEASE_DURATION_MS = 45_000;

const HEALTH_DOT_URL = "/api/admin/trr-api/social/ingest/health-dot";
const QUEUE_STATUS_URL = "/api/admin/trr-api/social/ingest/queue-status";
const CANCEL_STUCK_JOBS_URL = "/api/admin/trr-api/social/ingest/stuck-jobs/cancel";
const WORKER_DETAIL_URL_BASE = "/api/admin/trr-api/social/ingest/workers";
const DEBUG_JOB_URL_BASE = "/api/admin/trr-api/social/ingest/jobs";

const LEASE_STORAGE_KEY = "trr:admin:health-dot:leader:v1";
const SNAPSHOT_STORAGE_KEY = "trr:admin:health-dot:snapshot:v1";
const BROADCAST_CHANNEL_NAME = "trr-admin-health-dot";

const STATUS_ORDER = ["running", "pending", "queued", "retrying", "cancelled", "completed", "failed"] as const;

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
  const pending = (data.queue.by_status.pending ?? 0) + (data.queue.by_status.queued ?? 0);
  const failed = data.queue.by_status.failed ?? 0;
  if (failed > 0 && failed > pending) return "degraded";
  return "healthy";
}

function healthDotColor(state: HealthState): string {
  switch (state) {
    case "healthy":
      return "bg-emerald-500";
    case "degraded":
      return "bg-amber-500";
    case "down":
    case "error":
      return "bg-red-500";
    case "loading":
      return "bg-zinc-300";
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

class SharedHealthDotPoller {
  private subscribers = new Map<string, SharedHealthSubscriber>();
  private snapshot: SharedHealthSnapshot = { data: null, error: null, lastFetchedMs: null };
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight = false;
  private leader = false;
  private tabId = createTabId();
  private channel: BroadcastChannel | null = null;

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
    document.addEventListener("visibilitychange", this.reconcile);
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
    if (!this.hasActiveInterest()) return;
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
      this.scheduleTick(POLL_INTERVAL_MS);
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
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

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
      const message = error instanceof Error ? error.message : "Fetch failed";
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

function useQueueStatusModal(options: { isOpen: boolean }) {
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
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetchAdminWithAuth(
        QUEUE_STATUS_URL,
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
      setError(err instanceof Error ? err.message : "Fetch failed");
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
      }, POLL_INTERVAL_MS);
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

function QueueSummaryTable({ byStatus }: { byStatus: Record<string, number> }) {
  const entries = STATUS_ORDER
    .filter((status) => (byStatus[status] ?? 0) > 0)
    .map((status) => [status, byStatus[status] ?? 0] as const);
  if (entries.length === 0) return <p className="text-sm text-zinc-400">No runs in queue</p>;

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
      {entries.map(([status, count]) => (
        <div key={status} className="flex items-center justify-between">
          <StatusBadge status={status} />
          <span className="tabular-nums text-sm font-medium text-zinc-900">{count.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function PlatformBreakdownTable({ byPlatform }: { byPlatform: Record<string, Record<string, number>> }) {
  const platforms = Object.keys(byPlatform).sort();
  if (platforms.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-xs text-zinc-500">
            <th className="pb-1.5 pr-3 font-medium">Platform</th>
            <th className="pb-1.5 px-3 font-medium text-right">Run</th>
            <th className="pb-1.5 px-3 font-medium text-right">Pend</th>
            <th className="pb-1.5 px-3 font-medium text-right">Fail</th>
            <th className="pb-1.5 pl-3 font-medium text-right">Done</th>
          </tr>
        </thead>
        <tbody>
          {platforms.map((platform) => {
            const counts = byPlatform[platform] ?? {};
            return (
              <tr key={platform} className="border-b border-zinc-100">
                <td className="py-1.5 pr-3 font-medium capitalize text-zinc-900">{platform}</td>
                <td className="py-1.5 px-3 tabular-nums text-right text-zinc-700">{counts.running ?? 0}</td>
                <td className="py-1.5 px-3 tabular-nums text-right text-zinc-700">
                  {(counts.pending ?? 0) + (counts.queued ?? 0) + (counts.retrying ?? 0)}
                </td>
                <td className="py-1.5 px-3 tabular-nums text-right text-red-600">{counts.failed ?? 0}</td>
                <td className="py-1.5 pl-3 tabular-nums text-right text-zinc-500">{counts.completed ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function WorkersList({
  workers,
  staleAfterSeconds,
  selectedWorkerId,
  onInspectWorker,
  onDebugJob,
  debugJobLoadingId,
}: {
  workers: WorkerEntry[];
  staleAfterSeconds: number;
  selectedWorkerId: string | null;
  onInspectWorker: (worker: WorkerEntry) => void;
  onDebugJob: (jobId: string) => void;
  debugJobLoadingId: string | null;
}) {
  const now = Date.now();
  const freshWorkers = workers.filter((worker) => {
    if (worker.is_healthy) return true;
    if (!worker.last_seen_at) return false;
    const lastSeenMs = new Date(worker.last_seen_at).getTime();
    if (!Number.isFinite(lastSeenMs)) return false;
    return now - lastSeenMs <= staleAfterSeconds * 1000;
  });
  const hiddenStaleCount = Math.max(0, workers.length - freshWorkers.length);

  if (freshWorkers.length === 0) return <p className="text-sm text-zinc-400">No active workers</p>;

  return (
    <div className="space-y-1.5">
      {hiddenStaleCount > 0 && (
        <p className="text-xs text-zinc-400">
          {hiddenStaleCount.toLocaleString()} stale worker heartbeat
          {hiddenStaleCount === 1 ? "" : "s"} hidden
        </p>
      )}
      {freshWorkers.map((worker) => (
        <div key={worker.worker_id} className="flex items-center gap-2 text-sm">
          <span className={`inline-block h-2 w-2 rounded-full ${worker.is_healthy ? "bg-emerald-500" : "bg-red-400"}`} />
          <button
            type="button"
            onClick={() => onInspectWorker(worker)}
            disabled={worker.status !== "working"}
            className={`rounded border px-1.5 py-0.5 font-mono text-xs transition ${
              worker.status === "working"
                ? "border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                : "cursor-default border-transparent text-zinc-500"
            } ${selectedWorkerId === worker.worker_id ? "bg-zinc-100" : ""}`}
          >
            {worker.worker_id.slice(0, 20)}
          </button>
          <span className="text-zinc-400">{worker.stage}</span>
          {worker.run_id && <span className="font-mono text-xs text-zinc-500">run {truncate(worker.run_id, 8)}</span>}
          {worker.status === "working" && worker.current_job_id && (
            <button
              type="button"
              onClick={() => onDebugJob(worker.current_job_id as string)}
              disabled={debugJobLoadingId === worker.current_job_id}
              className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-xs transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              title="Debug this running job"
              aria-label={`Debug job ${truncate(worker.current_job_id, 8)}`}
            >
              {debugJobLoadingId === worker.current_job_id ? "..." : "🐛"}
            </button>
          )}
          <span className="ml-auto text-xs text-zinc-400">{relativeTime(worker.last_seen_at)}</span>
        </div>
      ))}
    </div>
  );
}

function RecentFailures({ failures }: { failures: FailureEntry[] }) {
  if (failures.length === 0) return <p className="text-sm text-zinc-400">No recent failures</p>;

  return (
    <div className="max-h-48 space-y-2 overflow-y-auto">
      {failures.slice(0, 20).map((failure) => (
        <div key={failure.id} className="rounded-lg border border-red-100 bg-red-50/50 px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium capitalize text-zinc-900">{failure.platform}</span>
            <span className="text-zinc-400">{failure.job_type}</span>
            {failure.run_id && <span className="font-mono text-zinc-500">run {truncate(failure.run_id, 8)}</span>}
            <span className="ml-auto text-zinc-400">{relativeTime(failure.created_at)}</span>
          </div>
          <p className="mt-0.5 font-mono text-red-700">
            {truncate(failure.error_message ?? failure.last_error_code ?? failure.last_error_class, 120)}
          </p>
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
}: {
  jobs: StuckJobEntry[];
  total: number;
  cancelingJobIds: Set<string>;
  clearingAll: boolean;
  onCancelJob: (jobId: string) => Promise<void>;
  onClearAll: () => Promise<void>;
}) {
  const canClearAll = total > 0 && !clearingAll && cancelingJobIds.size === 0;
  const sectionLabel = total > jobs.length ? `${jobs.length}/${total}` : `${total}`;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">Showing {sectionLabel} stuck jobs</p>
        <button
          type="button"
          onClick={() => {
            void onClearAll();
          }}
          disabled={!canClearAll}
          className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {clearingAll ? "Clearing..." : "Clear all stuck jobs"}
        </button>
      </div>
      {jobs.length === 0 ? (
        <p className="text-sm text-zinc-400">No stuck jobs detected</p>
      ) : (
        <div className="max-h-56 space-y-2 overflow-y-auto">
          {jobs.map((job) => {
            const inFlight = cancelingJobIds.has(job.id);
            return (
              <div key={job.id} className="rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-zinc-900">{truncate(job.id, 8)}</span>
                  <StatusBadge status={job.status} />
                  <span className="capitalize text-zinc-500">{job.platform}</span>
                  <span className="text-zinc-400">{job.job_type}</span>
                  {job.run_id && <span className="font-mono text-zinc-500">run {truncate(job.run_id, 8)}</span>}
                  <span className="ml-auto text-zinc-400">{relativeTime(job.heartbeat_at ?? job.created_at)}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-zinc-500">
                  <span>{job.stuck_reason}</span>
                  <span>·</span>
                  <span>{Math.max(0, Number(job.stuck_for_seconds) || 0)}s stuck</span>
                  {job.worker_id && (
                    <>
                      <span>·</span>
                      <span className="font-mono">{truncate(job.worker_id, 20)}</span>
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
      <SectionHeader>Running Worker Detail</SectionHeader>
      {loading && <p className="text-sm text-zinc-500">Loading worker detail...</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}
      {detail && (
        <div className="space-y-2 text-xs text-zinc-600">
          <p className="font-mono text-zinc-700">
            {detail.worker.worker_id} · {detail.worker.status} · {detail.worker.stage}
          </p>
          {detail.run?.run_id && <p className="font-mono">Run ID: {detail.run.run_id}</p>}
          <p>Currently scraping: {detail.currently_scraping ?? "-"}</p>
          {detail.current_job ? (
            <div className="rounded-md border border-zinc-200 bg-white p-2">
              <p className="font-medium text-zinc-800">
                {detail.current_job.platform} / {detail.current_job.job_type}
              </p>
              <p>Handle: {detail.current_job.account_handle ?? "-"}</p>
              <p>
                Progress: items {detail.progress_made.items_found}, posts {detail.progress_made.posts_upserted}, comments{" "}
                {detail.progress_made.comments_upserted}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => onDebugJob(detail.current_job?.id ?? "")}
                  disabled={!detail.current_job?.id || debugJobLoadingId === detail.current_job?.id}
                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {debugJobLoadingId === detail.current_job?.id ? "Debugging..." : "🐛 Debug"}
                </button>
                <button
                  type="button"
                  onClick={() => onApplyPatch(detail.current_job?.id ?? "")}
                  disabled={!detail.current_job?.id || debugJobLoadingId === detail.current_job?.id}
                  className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Apply Patch
                </button>
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
  const { data, error } = useSharedHealthDot({ isOpen: false, isSocialRoute: socialRoute });
  const state = healthState(data, error);

  return (
    <button
      type="button"
      aria-label={`System health: ${healthLabel(state)}`}
      onClick={onClick}
      className={
        className ??
        "group absolute right-4 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition hover:bg-zinc-100"
      }
    >
      <span className={`relative inline-block h-2.5 w-2.5 rounded-full ${healthDotColor(state)}`}>
        {state === "healthy" && (
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-40" />
        )}
      </span>
      <span className="hidden text-xs font-medium text-zinc-500 group-hover:inline">{healthLabel(state)}</span>
    </button>
  );
}

export default function SystemHealthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname() ?? "";
  const socialRoute = useMemo(() => isSocialAdminPath(pathname), [pathname]);

  const healthDot = useSharedHealthDot({ isOpen, isSocialRoute: socialRoute });
  const queueStatus = useQueueStatusModal({ isOpen });
  const [cancelingJobIds, setCancelingJobIds] = useState<Set<string>>(new Set());
  const [clearingAll, setClearingAll] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [workerDetail, setWorkerDetail] = useState<WorkerDetail | null>(null);
  const [workerDetailLoading, setWorkerDetailLoading] = useState(false);
  const [workerDetailError, setWorkerDetailError] = useState<string | null>(null);
  const [debugJobLoadingId, setDebugJobLoadingId] = useState<string | null>(null);
  const [debugResult, setDebugResult] = useState<DebugJobResult | null>(null);
  const [debugError, setDebugError] = useState<string | null>(null);

  const statusData: HealthDotStatus | null = queueStatus.data
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

  const state = healthState(statusData, queueStatus.error ?? healthDot.error);
  const lastFetched = queueStatus.lastFetched ?? healthDot.lastFetched;

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

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="System Health"
      panelClassName="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl"
    >
      <div className="mb-5 flex items-center gap-3">
        <span className={`inline-block h-3 w-3 rounded-full ${healthDotColor(state)}`} />
        <span className="text-sm font-semibold text-zinc-900">{healthLabel(state)}</span>
        {statusData?.queue_enabled === false && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Queue disabled</span>
        )}
        <span className="ml-auto text-xs text-zinc-400">
          {lastFetched ? `Updated ${relativeTime(lastFetched.toISOString())}` : "Loading..."}
        </span>
        <button
          type="button"
          onClick={() => {
            queueStatus.refetch();
            healthDot.refetch();
          }}
          className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
        >
          Refresh
        </button>
      </div>
      <div className="max-h-[calc(90vh-8.5rem)] overflow-y-auto pr-1">
        {(queueStatus.error || healthDot.error) && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {queueStatus.error ?? healthDot.error}
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

        {!queueStatus.data && (
          <p className="text-sm text-zinc-500">Loading detailed queue and worker diagnostics...</p>
        )}

        {queueStatus.data && (
          <div className="space-y-6">
            <section>
            <SectionHeader>
              Workers ({queueStatus.data.workers.healthy_workers}/{queueStatus.data.workers.total_workers} healthy)
            </SectionHeader>
            <WorkersList
              workers={queueStatus.data.workers.workers}
              staleAfterSeconds={queueStatus.data.workers.stale_after_seconds}
              selectedWorkerId={selectedWorkerId}
              onInspectWorker={(worker) => {
                void fetchWorkerDetail(worker.worker_id);
              }}
              onDebugJob={(jobId) => {
                void runJobDebug(jobId, false);
              }}
              debugJobLoadingId={debugJobLoadingId}
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
              <SectionHeader>Run Summary</SectionHeader>
              <QueueSummaryTable
                byStatus={queueStatus.data.queue.runs_by_status ?? queueStatus.data.queue.by_status}
              />
            </section>

            <hr className="border-zinc-100" />

            <section>
              <SectionHeader>Jobs By Platform</SectionHeader>
              <PlatformBreakdownTable byPlatform={queueStatus.data.queue.by_platform} />
            </section>

            <hr className="border-zinc-100" />

            <section>
              <SectionHeader>Stuck Jobs</SectionHeader>
              <StuckJobs
                jobs={queueStatus.data.queue.stuck_jobs ?? []}
                total={queueStatus.data.queue.stuck_jobs_total ?? 0}
                cancelingJobIds={cancelingJobIds}
                clearingAll={clearingAll}
                onCancelJob={cancelSingleStuckJob}
                onClearAll={clearAllStuckJobs}
              />
            </section>

            <hr className="border-zinc-100" />

            <section>
              <SectionHeader>Recent Failures</SectionHeader>
              <RecentFailures failures={queueStatus.data.queue.recent_failures} />
            </section>
          </div>
        )}
      </div>
    </AdminModal>
  );
}
