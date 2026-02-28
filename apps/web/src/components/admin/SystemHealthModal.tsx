"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AdminModal from "@/components/admin/AdminModal";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

type HealthState = "healthy" | "degraded" | "down" | "loading" | "error";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 30_000;
const FETCH_TIMEOUT_MS = 12_000;
const QUEUE_STATUS_URL = "/api/admin/trr-api/social/ingest/queue-status";

const STATUS_ORDER = ["running", "pending", "queued", "retrying", "failed", "cancelled", "completed"] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function healthState(data: QueueStatus | null, error: string | null): HealthState {
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

// ---------------------------------------------------------------------------
// Hook: useQueueStatus
// ---------------------------------------------------------------------------

function useQueueStatus(options: { isOpen: boolean; pollInBackground: boolean }) {
  const { isOpen, pollInBackground } = options;
  const [data, setData] = useState<QueueStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);

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
        const body = await response.json().catch(() => ({}));
        setError((body as Record<string, string>).error ?? `HTTP ${response.status}`);
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
    const shouldPoll = pollInBackground || isOpen;
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
  }, [fetchStatus, isOpen, pollInBackground]);

  return { data, error, lastFetched, refetch: fetchStatus };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{children}</h4>;
}

function QueueSummaryTable({ byStatus }: { byStatus: Record<string, number> }) {
  const entries = STATUS_ORDER
    .filter((s) => (byStatus[s] ?? 0) > 0)
    .map((s) => [s, byStatus[s] ?? 0] as const);
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
      {workers.map((w) => (
        <div key={w.worker_id} className="flex items-center gap-2 text-sm">
          <span className={`inline-block h-2 w-2 rounded-full ${w.is_healthy ? "bg-emerald-500" : "bg-red-400"}`} />
          <span className="font-mono text-xs text-zinc-600">{w.worker_id.slice(0, 20)}</span>
          <span className="text-zinc-400">{w.stage}</span>
          <span className="ml-auto text-xs text-zinc-400">{relativeTime(w.last_seen_at)}</span>
        </div>
      ))}
    </div>
  );
}

function RecentFailures({ failures }: { failures: FailureEntry[] }) {
  if (failures.length === 0) return <p className="text-sm text-zinc-400">No recent failures</p>;

  return (
    <div className="max-h-48 space-y-2 overflow-y-auto">
      {failures.slice(0, 20).map((f) => (
        <div key={f.id} className="rounded-lg border border-red-100 bg-red-50/50 px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium capitalize text-zinc-900">{f.platform}</span>
            <span className="text-zinc-400">{f.job_type}</span>
            <span className="ml-auto text-zinc-400">{relativeTime(f.created_at)}</span>
          </div>
          <p className="mt-0.5 font-mono text-red-700">
            {truncate(f.error_message ?? f.last_error_code ?? f.last_error_class, 120)}
          </p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/** Header dot indicator — always renders, always polls. */
export function HealthIndicator({ onClick }: { onClick: () => void }) {
  const { data, error } = useQueueStatus({ isOpen: false, pollInBackground: true });
  const state = healthState(data, error);

  return (
    <button
      type="button"
      aria-label={`System health: ${healthLabel(state)}`}
      onClick={onClick}
      className="group absolute right-4 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition hover:bg-zinc-100"
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

/** Full-screen AdminModal with queue/worker health details. */
export default function SystemHealthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { data, error, lastFetched, refetch } = useQueueStatus({
    isOpen,
    pollInBackground: false,
  });
  const state = healthState(data, error);

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="System Health"
      panelClassName="relative w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl"
    >
      {/* Top status bar */}
      <div className="mb-5 flex items-center gap-3">
        <span className={`inline-block h-3 w-3 rounded-full ${healthDotColor(state)}`} />
        <span className="text-sm font-semibold text-zinc-900">{healthLabel(state)}</span>
        {data?.queue_enabled === false && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Queue disabled</span>
        )}
        <span className="ml-auto text-xs text-zinc-400">
          {lastFetched ? `Updated ${relativeTime(lastFetched.toISOString())}` : "Loading..."}
        </span>
        <button
          type="button"
          onClick={refetch}
          className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Workers section */}
          <section>
            <SectionHeader>
              Workers ({data.workers.healthy_workers}/{data.workers.total_workers} healthy)
            </SectionHeader>
            <WorkersList workers={data.workers.workers} />
          </section>

          <hr className="border-zinc-100" />

          {/* Queue summary */}
          <section>
            <SectionHeader>Queue Summary</SectionHeader>
            <QueueSummaryTable byStatus={data.queue.by_status} />
          </section>

          <hr className="border-zinc-100" />

          {/* Platform breakdown */}
          <section>
            <SectionHeader>By Platform</SectionHeader>
            <PlatformBreakdownTable byPlatform={data.queue.by_platform} />
          </section>

          <hr className="border-zinc-100" />

          {/* Recent failures */}
          <section>
            <SectionHeader>Recent Failures</SectionHeader>
            <RecentFailures failures={data.queue.recent_failures} />
          </section>
        </div>
      )}
    </AdminModal>
  );
}
