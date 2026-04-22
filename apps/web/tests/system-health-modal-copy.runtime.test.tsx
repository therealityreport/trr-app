import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  usePathname: vi.fn(() => "/admin/social"),
  useAdminLiveStatus: vi.fn(),
  invalidateAdminSnapshotFamilies: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.usePathname(),
}));

vi.mock("@/lib/admin/admin-live-status", () => ({
  useAdminLiveStatus: (...args: unknown[]) => (mocks.useAdminLiveStatus as (...inner: unknown[]) => unknown)(...args),
}));

vi.mock("@/lib/admin/admin-snapshot-client", () => ({
  invalidateAdminSnapshotFamilies: (...args: unknown[]) =>
    (mocks.invalidateAdminSnapshotFamilies as (...inner: unknown[]) => unknown)(...args),
}));

vi.mock("@/components/admin/AdminModal", () => ({
  default: ({
    isOpen,
    title,
    children,
  }: {
    isOpen: boolean;
    title: string;
    children: React.ReactNode;
  }) => (isOpen ? <div><h1>{title}</h1>{children}</div> : null),
}));

import SystemHealthModal from "@/components/admin/SystemHealthModal";

const installClipboardMock = () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  return writeText;
};

describe("SystemHealthModal copy snapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/admin/social?tab=jobs");

    mocks.useAdminLiveStatus.mockReturnValue({
      data: {
        generated_at: "2026-04-21T12:34:56.000Z",
        sequence: 17,
        health_dot: {
          queue_enabled: true,
          workers: {
            healthy: true,
            healthy_workers: 2,
          },
          queue: {
            by_status: {
              running: 1,
              queued: 0,
              pending: 0,
            },
          },
          updated_at: "2026-04-21T12:34:50.000Z",
        },
        queue_status: {
          queue_enabled: true,
          remote_plane: {
            execution_mode_canonical: "remote",
            execution_owner: "remote_worker",
            execution_backend_canonical: "modal",
            remote_job_plane_enforced: true,
          },
          workers: {
            healthy: true,
            healthy_workers: 2,
            fresh_workers: 2,
            stale_workers: 0,
            stale_hidden_count: 0,
            active_workers: 2,
            total_workers: 2,
            stale_after_seconds: 300,
            by_stage: {
              posts: { total: 2, healthy: 2, fresh: 2 },
            },
            by_platform: {
              instagram: { total: 2, healthy: 2, fresh: 2 },
            },
            workers: [],
            reason: null,
            dispatcher_readiness: {
              resolved: true,
              reason: null,
            },
            remote_auth_capabilities: {
              instagram: {
                ready: true,
                reason: null,
                healthy_authenticated_workers: 2,
                fresh_authenticated_workers: 2,
              },
            },
            shared_account_backfill_readiness: {
              ready: true,
              reason: null,
            },
          },
          queue: {
            by_status: {
              running: 1,
              queued: 0,
              pending: 0,
              retrying: 0,
              failed: 0,
              completed: 4,
              cancelled: 0,
            },
            by_stage: {
              posts: { running: 1, pending: 0, failed: 0, completed: 4 },
            },
            by_platform: {
              instagram: { running: 1, pending: 0, failed: 0, completed: 4 },
            },
            by_job_type: {},
            running_jobs: [],
            stale_claims: {
              total: 0,
              by_reason: {},
              by_platform: {},
              by_stage: {},
            },
            recent_failures: [],
            stuck_jobs: [],
            stuck_jobs_total: 0,
            dispatch_blocked_jobs: [],
            dispatch_blocked_jobs_total: 0,
            dispatch_blocked_by_reason: {},
            waiting_for_claim_jobs_total: 0,
            retrying_dispatch_jobs_total: 0,
          },
        },
        admin_operations: {
          summary: {
            active_total: 0,
            stale_total: 0,
            cancelling_total: 0,
            by_status: {},
            by_type: {},
            runtime_split: { modal: 0, local: 0, other: 0, unknown: 0 },
            stale_after_seconds: 300,
            cancelling_grace_seconds: 60,
          },
          active_operations: [],
          stale_operations: [],
          updated_at: "2026-04-21T12:34:56.000Z",
        },
      },
      error: null,
      connected: true,
      lastFetched: new Date("2026-04-21T12:35:00.000Z"),
      refetch: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("copies a debugger-ready snapshot of the current modal state", async () => {
    const writeText = installClipboardMock();

    render(<SystemHealthModal isOpen onClose={() => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy debug snapshot" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });

    const copiedText = String(writeText.mock.calls[0]?.[0] ?? "");
    expect(copiedText).toContain("TRR System Jobs Health Debug Snapshot");
    expect(copiedText).toContain("\"pathname\": \"/admin/social\"");
    expect(copiedText).toContain("\"href\": \"http://localhost:3000/admin/social?tab=jobs\"");
    expect(copiedText).toContain("\"modal_state\": \"healthy\"");
    expect(copiedText).toContain("\"queue_status\"");
    expect(copiedText).toContain("\"admin_operations\"");
    expect(copiedText).toContain("\"live_status_sequence\": 17");

    expect(await screen.findByText("Copied System Jobs Health debug snapshot to clipboard.")).toBeInTheDocument();
  });

  it("auto-dismisses action notices after ten minutes", async () => {
    vi.useFakeTimers();
    const writeText = installClipboardMock();

    render(<SystemHealthModal isOpen onClose={() => undefined} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy debug snapshot" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Copied System Jobs Health debug snapshot to clipboard.")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(10 * 60 * 1000);
      await Promise.resolve();
    });

    expect(screen.queryByText("Copied System Jobs Health debug snapshot to clipboard.")).not.toBeInTheDocument();
  });

  it("treats queue aggregate timeouts as degraded when workers are otherwise healthy", async () => {
    mocks.useAdminLiveStatus.mockReturnValue({
      data: {
        generated_at: "2026-04-21T04:16:03.559835+00:00",
        sequence: 1,
        health_dot: {
          queue_enabled: true,
          workers: {
            healthy: true,
            healthy_workers: 4,
          },
          queue: {
            by_status: {
              running: 0,
              pending: 0,
              queued: 0,
              failed: 0,
            },
          },
          updated_at: "2026-04-21T04:16:01.902470+00:00",
        },
        queue_status: {
          queue_enabled: true,
          remote_plane: {
            execution_mode_canonical: "remote",
            execution_owner: "remote_worker",
            execution_backend_canonical: "modal",
            remote_job_plane_enforced: true,
          },
          workers: {
            healthy: true,
            healthy_workers: 4,
            fresh_workers: 4,
            stale_workers: 5,
            stale_hidden_count: 0,
            active_workers: 6,
            total_workers: 9,
            stale_after_seconds: 180,
            by_stage: {
              any: { total: 7, healthy: 4, fresh: 4 },
            },
            by_platform: {
              instagram: { total: 6, healthy: 1, fresh: 1 },
            },
            workers: [],
            reason: null,
            dispatcher_readiness: {
              resolved: true,
              reason: null,
            },
            remote_auth_capabilities: {
              instagram: {
                ready: true,
                reason: null,
                healthy_authenticated_workers: 1,
                fresh_authenticated_workers: 1,
              },
            },
            shared_account_backfill_readiness: {
              ready: true,
              reason: null,
            },
          },
          queue: {
            by_status: {
              queued: 0,
              pending: 0,
              running: 0,
              retrying: 0,
              cancelling: 0,
              failed: 0,
              cancelled: 0,
              completed: 0,
            },
            by_stage: {},
            by_stage_platform: {},
            by_platform: {},
            by_job_type: {},
            running_jobs: [],
            recent_failures: [],
            stuck_jobs: [],
            stuck_jobs_total: 0,
            dispatch_blocked_jobs: [],
            dispatch_blocked_jobs_total: 0,
            dispatch_blocked_by_reason: {},
            waiting_for_claim_jobs_total: 0,
            retrying_dispatch_jobs_total: 0,
            stale_claims: {
              total: 0,
              by_reason: {},
              by_platform: {},
              by_stage: {},
            },
            runs_by_status: {
              queued: 0,
              pending: 0,
              running: 0,
              retrying: 0,
              cancelling: 0,
              failed: 0,
              cancelled: 0,
              completed: 0,
            },
            runs_total: 0,
            error: "queue_aggregate_query_failed: canceling statement due to statement timeout\n",
          },
        },
        admin_operations: {
          summary: {
            active_total: 0,
            stale_total: 0,
            cancelling_total: 0,
            by_status: {},
            by_type: {},
            runtime_split: { modal: 0, local: 0, other: 0, unknown: 0 },
            stale_after_seconds: 300,
            cancelling_grace_seconds: 60,
          },
          active_operations: [],
          stale_operations: [],
          updated_at: "2026-04-21T04:16:03.559795Z",
        },
      },
      error: null,
      connected: true,
      lastFetched: new Date("2026-04-21T04:16:03.571Z"),
      refetch: vi.fn().mockResolvedValue(undefined),
    });

    render(<SystemHealthModal isOpen onClose={() => undefined} />);

    expect((await screen.findAllByText("Needs Attention")).length).toBeGreaterThan(0);
    expect(screen.getByText("Queue activity summary timed out, but workers are still reporting healthy heartbeats.")).toBeInTheDocument();
    expect(screen.queryByText("Health details could not be loaded.")).not.toBeInTheDocument();
  });
});
