"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import AdminModal from "@/components/admin/AdminModal";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";

type WorkerEntry = {
  worker_id: string;
  stage: string;
  status: string;
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
  platform: string;
  job_type: string;
  status: string;
  error_message: string | null;
  last_error_code: string | null;
  last_error_class: string | null;
  created_at: string;
  completed_at: string | null;
};

type QueueStatus = {
  queue_enabled: boolean;
  workers: WorkerHealth;
  queue: {
    by_status: Record<string, number>;
    by_platform: Record<string, Record<string, number>>;
    by_job_type: Record<string, Record<string, number>>;
    recent_failures: FailureEntry[];
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

const LEASE_STORAGE_KEY = "trr:admin:health-dot:leader:v1";
const SNAPSHOT_STORAGE_KEY = "trr:admin:health-dot:snapshot:v1";
const BROADCAST_CHANNEL_NAME = "trr-admin-health-dot";

const STATUS_ORDER = ["running", "pending", "queued", "retrying", "failed", "cancelled", "completed"] as const;

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
  if (entries.length === 0) return <p className="text-sm text-zinc-400">No jobs in queue</p>;

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

function WorkersList({ workers }: { workers: WorkerEntry[] }) {
  if (workers.length === 0) return <p className="text-sm text-zinc-400">No workers registered</p>;

  return (
    <div className="space-y-1.5">
      {workers.map((worker) => (
        <div key={worker.worker_id} className="flex items-center gap-2 text-sm">
          <span className={`inline-block h-2 w-2 rounded-full ${worker.is_healthy ? "bg-emerald-500" : "bg-red-400"}`} />
          <span className="font-mono text-xs text-zinc-600">{worker.worker_id.slice(0, 20)}</span>
          <span className="text-zinc-400">{worker.stage}</span>
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

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="System Health"
      panelClassName="relative w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl"
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

      {(queueStatus.error || healthDot.error) && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {queueStatus.error ?? healthDot.error}
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
            <WorkersList workers={queueStatus.data.workers.workers} />
          </section>

          <hr className="border-zinc-100" />

          <section>
            <SectionHeader>Queue Summary</SectionHeader>
            <QueueSummaryTable byStatus={queueStatus.data.queue.by_status} />
          </section>

          <hr className="border-zinc-100" />

          <section>
            <SectionHeader>By Platform</SectionHeader>
            <PlatformBreakdownTable byPlatform={queueStatus.data.queue.by_platform} />
          </section>

          <hr className="border-zinc-100" />

          <section>
            <SectionHeader>Recent Failures</SectionHeader>
            <RecentFailures failures={queueStatus.data.queue.recent_failures} />
          </section>
        </div>
      )}
    </AdminModal>
  );
}
