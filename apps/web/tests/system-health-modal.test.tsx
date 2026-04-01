import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SystemHealthModal, { HealthIndicator } from "@/components/admin/SystemHealthModal";

const { fetchAdminWithAuthMock, usePathnameMock } = vi.hoisted(() => ({
  fetchAdminWithAuthMock: vi.fn(),
  usePathnameMock: vi.fn(() => "/admin/social"),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: (...args: unknown[]) =>
    (fetchAdminWithAuthMock as (...inner: unknown[]) => unknown)(...args),
}));

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const healthDotCallCount = () =>
  fetchAdminWithAuthMock.mock.calls.filter(([input]) =>
    String(input).includes("/api/admin/trr-api/social/ingest/health-dot"),
  ).length;

describe("SystemHealthModal polling", () => {
  let queueStatusPayload: {
    queue_enabled: boolean;
    remote_plane?: {
      execution_mode_canonical?: string | null;
      execution_owner?: string | null;
      execution_backend_canonical?: string | null;
      remote_job_plane_enforced?: boolean;
    };
    workers: {
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
      dispatcher_readiness?: {
        resolved?: boolean;
        reason?: string | null;
      };
      remote_auth_capabilities?: {
        instagram?: {
          ready?: boolean;
          reason?: string | null;
          healthy_authenticated_workers?: number;
          fresh_authenticated_workers?: number;
        };
      };
      shared_account_backfill_readiness?: {
        ready?: boolean;
        reason?: string | null;
      };
      workers: unknown[];
      reason: string | null;
    };
    queue: {
      by_status: Record<string, number>;
      by_stage?: Record<string, Record<string, number>>;
      runs_by_status?: Record<string, number>;
      runs_total?: number;
      by_platform: Record<string, Record<string, number>>;
      by_job_type: Record<string, Record<string, number>>;
      running_jobs: Array<Record<string, unknown>>;
      stale_claims?: {
        total: number;
        by_reason: Record<string, number>;
        by_platform: Record<string, number>;
        by_stage: Record<string, number>;
      };
      recent_failures: unknown[];
      stuck_jobs: Array<Record<string, unknown>>;
      stuck_jobs_total: number;
      dispatch_blocked_jobs?: Array<Record<string, unknown>>;
      dispatch_blocked_jobs_total?: number;
      dispatch_blocked_by_reason?: Record<string, number>;
      waiting_for_claim_jobs_total?: number;
      retrying_dispatch_jobs_total?: number;
    };
  };
  let workerDetailPayload: Record<string, unknown>;

  beforeEach(() => {
    vi.useRealTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    fetchAdminWithAuthMock.mockReset();
    usePathnameMock.mockReturnValue("/admin/social");
    delete (window as Window & { __trr_admin_health_dot_poller__?: unknown }).__trr_admin_health_dot_poller__;
    window.localStorage.removeItem("trr:admin:health-dot:leader:v1");
    window.localStorage.removeItem("trr:admin:health-dot:snapshot:v1");
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });

    queueStatusPayload = {
      queue_enabled: true,
      remote_plane: {
        execution_mode_canonical: "remote",
        execution_owner: "remote_worker",
        execution_backend_canonical: "modal",
        remote_job_plane_enforced: true,
      },
      workers: {
        healthy: true,
        healthy_workers: 1,
        fresh_workers: 1,
        stale_workers: 0,
        stale_hidden_count: 0,
        active_workers: 1,
        total_workers: 1,
        stale_after_seconds: 60,
        executor_backend: "modal",
        dispatch_enabled: true,
        dispatcher_heartbeat_fresh: true,
        active_invocations: 2,
        oldest_queued_age_seconds: 120,
        stale_running_count: 0,
        last_dispatch_success_at: "2026-03-02T12:05:00.000Z",
        last_dispatch_error: null,
        dispatcher_readiness: { resolved: true, reason: null },
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
        by_stage: { posts: { total: 1, healthy: 1, fresh: 1 } },
        by_platform: { instagram: { total: 1, healthy: 1, fresh: 1 } },
        workers: [],
        reason: null,
      },
      queue: {
        by_status: { running: 0, pending: 0, queued: 0, retrying: 0, failed: 0, cancelled: 0, completed: 0 },
        by_stage: {},
        by_platform: {},
        by_job_type: {},
        running_jobs: [],
        stale_claims: { total: 0, by_reason: {}, by_platform: {}, by_stage: {} },
        recent_failures: [],
        stuck_jobs: [],
        stuck_jobs_total: 0,
        dispatch_blocked_jobs: [],
        dispatch_blocked_jobs_total: 0,
        dispatch_blocked_by_reason: {},
        waiting_for_claim_jobs_total: 0,
        retrying_dispatch_jobs_total: 0,
      },
    };
    workerDetailPayload = {
      worker: {
        worker_id: "social-worker:ip-172-31-115-232.ec2.internal:healthy",
        stage: "posts",
        status: "working",
        run_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        current_job_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        started_at: "2026-03-02T12:00:00.000Z",
        last_seen_at: "2026-03-02T12:05:00.000Z",
        supported_platforms: ["twitter"],
        metadata: { hostname: "ip-172-31-115-232.ec2.internal" },
        is_healthy: true,
      },
      current_job: {
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        run_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        platform: "twitter",
        job_type: "comments",
        status: "running",
        stage: "comments",
        account_handle: "@bravotv",
        items_found: 12,
        attempt_count: 1,
        max_attempts: 3,
        started_at: "2026-03-02T12:00:00.000Z",
        heartbeat_at: "2026-03-02T12:05:00.000Z",
        error_message: null,
        last_error_code: null,
        metadata: {},
      },
      run: {
        run_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        status: "running",
        source_scope: "bravo",
        execution_owner: "remote_worker",
        execution_mode_canonical: "remote",
        created_at: "2026-03-02T11:59:00.000Z",
        started_at: "2026-03-02T12:00:00.000Z",
        completed_at: null,
        summary: {},
      },
      currently_scraping: "comments_scan",
      progress_made: {
        items_found: 12,
        posts_upserted: 3,
        comments_upserted: 9,
        stage_counters: {},
        phase: "comments_scan",
      },
    };

    fetchAdminWithAuthMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/admin/trr-api/social/ingest/health-dot")) {
        return jsonResponse({
          queue_enabled: true,
          workers: { healthy: true, healthy_workers: 1 },
          queue: { by_status: { running: 0, pending: 0, queued: 0, failed: 0 } },
          updated_at: "2026-02-28T12:00:00.000Z",
        });
      }
      if (url.includes("/api/admin/trr-api/social/ingest/queue-status")) {
        return jsonResponse(queueStatusPayload);
      }
      if (url.includes("/api/admin/trr-api/operations/health")) {
        return jsonResponse({
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
          updated_at: "2026-03-02T12:05:00.000Z",
        });
      }
      if (url.includes("/api/admin/trr-api/social/ingest/stuck-jobs/cancel")) {
        queueStatusPayload = {
          ...queueStatusPayload,
          queue: {
            ...queueStatusPayload.queue,
            stuck_jobs: [],
            stuck_jobs_total: 0,
          },
        };
        return jsonResponse({ cancelled_jobs: 1, stuck_jobs_remaining: 0 });
      }
      if (url.includes("/api/admin/trr-api/social/ingest/active-jobs/cancel")) {
        queueStatusPayload = {
          ...queueStatusPayload,
          queue: {
            ...queueStatusPayload.queue,
            by_status: {
              ...queueStatusPayload.queue.by_status,
              queued: 0,
              pending: 0,
              running: 0,
              retrying: 0,
            },
          },
        };
        return jsonResponse({ cancelled_jobs: 4, active_jobs_remaining: 0 });
      }
      if (url.includes("/api/admin/trr-api/social/ingest/reset-health")) {
        queueStatusPayload = {
          ...queueStatusPayload,
          queue: {
            ...queueStatusPayload.queue,
            by_status: {
              ...queueStatusPayload.queue.by_status,
              queued: 0,
              pending: 0,
              running: 0,
              retrying: 0,
            },
            runs_by_status: {
              ...queueStatusPayload.queue.runs_by_status,
              running: 0,
              queued: 0,
              pending: 0,
              failed: 0,
              retrying: 0,
            },
            recent_failures: [],
            running_jobs: [],
          },
        };
        return jsonResponse({
          cancelled_jobs: 2,
          dismissed_failures: 3,
          dismissed_failed_runs: 2,
          active_jobs_remaining: 0,
          recent_failures_remaining: 0,
          failed_runs_remaining: 0,
        });
      }
      if (url.includes("/api/admin/trr-api/social/ingest/workers/purge-inactive")) {
        const deletedWorkers = Math.max(0, Number(queueStatusPayload.workers.stale_hidden_count ?? 0));
        queueStatusPayload = {
          ...queueStatusPayload,
          workers: {
            ...queueStatusPayload.workers,
            stale_hidden_count: 0,
            total_workers: Math.max(0, Number(queueStatusPayload.workers.total_workers ?? 0) - deletedWorkers),
          },
        };
        return jsonResponse({
          deleted_workers: deletedWorkers,
          total_workers_after: queueStatusPayload.workers.total_workers,
        });
      }
      if (url.includes("/api/admin/trr-api/social/ingest/recent-failures/dismiss")) {
        const body = typeof init?.body === "string" ? (JSON.parse(init.body) as { job_ids?: string[] }) : {};
        const dismissedIds = new Set(body.job_ids ?? []);
        queueStatusPayload = {
          ...queueStatusPayload,
          queue: {
            ...queueStatusPayload.queue,
            recent_failures: queueStatusPayload.queue.recent_failures.filter((failure) => {
              const failureId =
                typeof failure === "object" && failure !== null && "id" in failure ? String(failure.id) : "";
              return !dismissedIds.has(failureId);
            }),
          },
        };
        return jsonResponse({
          requested_job_ids_count: dismissedIds.size,
          dismissed_jobs: dismissedIds.size,
          dismissed_job_ids: Array.from(dismissedIds),
          recent_failures_remaining: queueStatusPayload.queue.recent_failures.length,
        });
      }
      if (url.includes("/api/admin/trr-api/social/ingest/workers/") && url.endsWith("/detail")) {
        return jsonResponse(workerDetailPayload);
      }
      if (url.includes("/api/admin/trr-api/social/ingest/jobs/") && url.endsWith("/debug")) {
        const body = typeof init?.body === "string" ? JSON.parse(init.body) as { apply_patch?: boolean } : {};
        const applyPatch = Boolean(body.apply_patch);
        return jsonResponse({
          job_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          run_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          model_used: "gpt-5.3-codex",
          fallback_used: false,
          analysis: {
            root_cause: "retry loop missing heartbeat refresh",
            confidence: 0.92,
            files_touched: ["trr_backend/repositories/social_season_analytics.py"],
            tests_to_run: ["pytest -q tests/repositories/test_social_season_analytics.py -k queue_status"],
          },
          patch_unified_diff:
            "--- a/trr_backend/repositories/social_season_analytics.py\n+++ b/trr_backend/repositories/social_season_analytics.py\n@@\n-foo\n+bar\n",
          apply: {
            enabled: true,
            requested: applyPatch,
            applied: applyPatch,
            check_ok: applyPatch,
            error: applyPatch ? null : null,
            files_changed: applyPatch ? ["trr_backend/repositories/social_season_analytics.py"] : [],
          },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("uses health-dot polling for header indicator", async () => {
    render(<HealthIndicator onClick={() => undefined} />);

    await waitFor(() => {
      expect(
        fetchAdminWithAuthMock.mock.calls.some(([input]) =>
          String(input).includes("/api/admin/trr-api/social/ingest/health-dot"),
        ),
      ).toBe(true);
    }, { timeout: 4000 });
    expect(
      fetchAdminWithAuthMock.mock.calls.some(([input]) =>
        String(input).includes("/api/admin/trr-api/social/ingest/queue-status"),
      ),
    ).toBe(false);
  });

  it("backs off repeated health-dot polling after a stable status in dev", async () => {
    vi.useFakeTimers();

    render(<HealthIndicator onClick={() => undefined} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(healthDotCallCount()).toBe(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(healthDotCallCount()).toBe(7);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(14_000);
    });
    expect(healthDotCallCount()).toBe(7);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500);
    });
    expect(healthDotCallCount()).toBe(8);
  });

  it("pauses health-dot polling while hidden and refetches immediately when visible again", async () => {
    vi.useFakeTimers();

    render(<HealthIndicator onClick={() => undefined} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(healthDotCallCount()).toBe(1);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    fireEvent(document, new Event("visibilitychange"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(healthDotCallCount()).toBe(1);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    fireEvent(document, new Event("visibilitychange"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(healthDotCallCount()).toBe(2);
  });

  it("loads full queue diagnostics when modal is open", async () => {
    render(<SystemHealthModal isOpen onClose={() => undefined} />);

    await waitFor(() => {
      expect(
        fetchAdminWithAuthMock.mock.calls.some(([input]) =>
          String(input).includes("/api/admin/trr-api/social/ingest/queue-status"),
        ),
      ).toBe(true);
    }, { timeout: 4000 });
  });

  it("normalizes aborted queue-status fetch errors to request timed out", async () => {
    fetchAdminWithAuthMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admin/trr-api/social/ingest/health-dot")) {
        return jsonResponse({
          queue_enabled: true,
          workers: { healthy: true, healthy_workers: 1 },
          queue: { by_status: { running: 0, pending: 0, queued: 0, failed: 0 } },
          updated_at: "2026-02-28T12:00:00.000Z",
        });
      }
      if (url.includes("/api/admin/trr-api/social/ingest/queue-status")) {
        throw new Error("signal is aborted without reason");
      }
      if (url.includes("/api/admin/trr-api/operations/health")) {
        return jsonResponse({
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
          updated_at: "2026-03-02T12:05:00.000Z",
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    render(<SystemHealthModal isOpen onClose={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByText("Request timed out")).toBeInTheDocument();
    });
  });

  it("renders worker-plane ownership and stage depth summaries", async () => {
    queueStatusPayload = {
      ...queueStatusPayload,
      workers: {
        ...queueStatusPayload.workers,
        by_stage: {
          posts: { total: 2, healthy: 1, fresh: 2 },
          comments: { total: 1, healthy: 1, fresh: 1 },
        },
      },
      queue: {
        ...queueStatusPayload.queue,
        by_stage: {
          posts: { running: 1, pending: 2, failed: 0, completed: 4 },
          comments: { running: 0, pending: 1, failed: 1, completed: 3 },
        },
        stale_claims: {
          total: 2,
          by_reason: { running_stale_heartbeat: 2 },
          by_platform: { instagram: 1, twitter: 1 },
          by_stage: { posts: 1, comments: 1 },
        },
      },
    };

    render(<SystemHealthModal isOpen onClose={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByText("How This Sync Runs")).toBeInTheDocument();
    });

    expect(screen.getByText("How This Sync Runs")).toBeInTheDocument();
    expect(screen.getByText("Instagram remote auth")).toBeInTheDocument();
    expect(screen.getByText("1 authenticated")).toBeInTheDocument();
    expect(screen.getByText("Shared-account backfill")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("Remote executor")).toBeInTheDocument();
    expect(screen.getByText("Modal")).toBeInTheDocument();
    expect(screen.getByText("Remote")).toBeInTheDocument();
    expect(screen.getByText("Local execution is disabled")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Shows whether workers are available, whether gallery and social jobs are moving, and whether anything needs intervention across both queues.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Queue Health")).toBeInTheDocument();
    expect(screen.getByText(/2 stale claimed jobs/i)).toBeInTheDocument();
    expect(screen.getByText("Overall Status")).toBeInTheDocument();
    expect(screen.getByText("Work Happening Now")).toBeInTheDocument();
    expect(screen.getByText("Worker Availability")).toBeInTheDocument();
    expect(screen.getByText("Attention Needed")).toBeInTheDocument();
  });

  it("renders every running job in the dedicated running jobs section", async () => {
    queueStatusPayload = {
      ...queueStatusPayload,
      queue: {
        ...queueStatusPayload.queue,
        by_status: { running: 2, pending: 0, queued: 0, retrying: 0, failed: 0, cancelled: 0, completed: 0 },
        running_jobs: [
          {
            id: "job-1",
            run_id: "run-1",
            platform: "instagram",
            job_type: "shared_account_posts",
            stage: "shared_account_posts",
            account_handle: "bravotv",
            worker_id: "modal:social-dispatcher",
            started_at: "2026-03-19T12:00:00.000Z",
            heartbeat_at: "2026-03-19T12:01:00.000Z",
            dispatch_backend: "modal",
            required_execution_backend: "modal",
          },
          {
            id: "job-2",
            run_id: "run-2",
            platform: "twitter",
            job_type: "comments",
            stage: "comments",
            account_handle: "andycohen",
            worker_id: "modal:admin-dispatcher",
            started_at: "2026-03-19T12:02:00.000Z",
            heartbeat_at: "2026-03-19T12:03:00.000Z",
            dispatch_backend: "modal",
            required_execution_backend: null,
          },
        ],
      },
    };

    render(<SystemHealthModal isOpen onClose={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByText("Running Jobs")).toBeInTheDocument();
    });

    expect(screen.getByText(/These are the job rows currently marked running/i)).toBeInTheDocument();
    expect(screen.getByText("@bravotv")).toBeInTheDocument();
    expect(screen.getByText("@andycohen")).toBeInTheDocument();
    expect(screen.getAllByText("Modal").length).toBeGreaterThan(0);
    expect(screen.getByText("Any")).toBeInTheDocument();
  });

  it("marks the modal as needing attention when recent failures exist", async () => {
    queueStatusPayload = {
      ...queueStatusPayload,
      queue: {
        ...queueStatusPayload.queue,
        by_status: { running: 0, pending: 0, queued: 0, retrying: 0, failed: 15, cancelled: 0, completed: 313 },
        recent_failures: [
          {
            id: "failure-1",
            run_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            platform: "instagram",
            job_type: "posts",
            status: "failed",
            error_message: "'NoneType' object has no attribute 'get'",
            last_error_code: null,
            last_error_class: "AttributeError",
            created_at: "2026-03-02T10:00:00.000Z",
            completed_at: "2026-03-02T10:01:00.000Z",
          },
        ],
        stuck_jobs_total: 0,
        stuck_jobs: [],
        stale_claims: { total: 0, by_reason: {}, by_platform: {}, by_stage: {} },
      },
    };

    render(<SystemHealthModal isOpen onClose={() => undefined} />);

    await waitFor(() => {
      expect(screen.getAllByText("Needs Attention").length).toBeGreaterThan(0);
    });

    expect(
      screen.getByText("Workers are available. Recent failures are historical, but they are still worth reviewing."),
    ).toBeInTheDocument();
    expect(screen.getByText("0 likely stuck · 1 recent failures")).toBeInTheDocument();
  });

  it("hides stale-only worker stage cards when current stage capacity exists", async () => {
    queueStatusPayload = {
      ...queueStatusPayload,
      workers: {
        ...queueStatusPayload.workers,
        total_workers: 8,
        by_stage: {
          any: { total: 7, healthy: 1, fresh: 1 },
          post_classify: { total: 1, healthy: 0, fresh: 0 },
        },
        workers: [
          {
            worker_id: "modal:social-dispatcher",
            stage: "any",
            status: "idle",
            last_seen_at: new Date().toISOString(),
            is_healthy: true,
            supported_platforms: ["instagram"],
            metadata: { hostname: "social-dispatcher" },
          },
        ],
      },
    };

    render(<SystemHealthModal isOpen onClose={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByText("Any workers")).toBeInTheDocument();
    });

    expect(screen.getByText("1 healthy · 1 seen recently · 7 recorded")).toBeInTheDocument();
    expect(screen.queryByText("Post Classify workers")).not.toBeInTheDocument();
  });

  it("dismisses a recent failure from the panel", async () => {
    queueStatusPayload = {
      ...queueStatusPayload,
      queue: {
        ...queueStatusPayload.queue,
        recent_failures: [
          {
            id: "failure-1",
            run_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            platform: "instagram",
            job_type: "shared_account_discovery",
            status: "failed",
            error_message: "invalid input syntax for type uuid",
            last_error_code: null,
            last_error_class: "InvalidTextRepresentation",
            created_at: "2026-03-02T10:00:00.000Z",
            completed_at: "2026-03-02T10:01:00.000Z",
          },
        ],
      },
    };

    render(<SystemHealthModal isOpen onClose={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    await waitFor(() => {
      expect(
        fetchAdminWithAuthMock.mock.calls.some(([input]) =>
          String(input).includes("/api/admin/trr-api/social/ingest/recent-failures/dismiss"),
        ),
      ).toBe(true);
    });

    await waitFor(() => {
      expect(screen.getByText(/Dismissed 1 recent failure/)).toBeInTheDocument();
      expect(screen.getByText("No recent error patterns to review.")).toBeInTheDocument();
    });
  });

  it("renders stuck jobs and cancels one", async () => {
    queueStatusPayload = {
      ...queueStatusPayload,
      queue: {
        ...queueStatusPayload.queue,
        stuck_jobs_total: 1,
        stuck_jobs: [
          {
            id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            run_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            platform: "twitter",
            job_type: "comments",
            status: "running",
            worker_id: "social-worker:thomas",
            created_at: "2026-03-02T13:00:00.000Z",
            heartbeat_at: "2026-03-02T13:01:00.000Z",
            available_at: null,
            error_message: "stale_heartbeat_timeout: no heartbeat for >= 300 seconds",
            last_error_code: "stale_heartbeat_timeout",
            stuck_reason: "running_stale_heartbeat",
            stuck_for_seconds: 450,
          },
        ],
      },
    };

    render(<SystemHealthModal isOpen onClose={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByText("Likely Stuck Jobs")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(
        fetchAdminWithAuthMock.mock.calls.some(([input]) =>
          String(input).includes("/api/admin/trr-api/social/ingest/stuck-jobs/cancel"),
        ),
      ).toBe(true);
    });

    await waitFor(() => {
      expect(screen.getByText(/Cancelled stuck job/)).toBeInTheDocument();
    });
  });

  it("supports clear all stuck jobs", async () => {
    queueStatusPayload = {
      ...queueStatusPayload,
      queue: {
        ...queueStatusPayload.queue,
        stuck_jobs_total: 2,
        stuck_jobs: [
          {
            id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            run_id: null,
            platform: "youtube",
            job_type: "posts",
            status: "retrying",
            worker_id: null,
            created_at: "2026-03-02T12:00:00.000Z",
            heartbeat_at: null,
            available_at: "2026-03-02T12:03:00.000Z",
            error_message: "stale_heartbeat_timeout: no heartbeat for >= 300 seconds",
            last_error_code: "stale_heartbeat_timeout",
            stuck_reason: "retrying_stale_timeout",
            stuck_for_seconds: 500,
          },
        ],
      },
    };

    render(<SystemHealthModal isOpen onClose={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Cancel all likely stuck jobs" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel all likely stuck jobs" }));

    await waitFor(() => {
      expect(
        fetchAdminWithAuthMock.mock.calls.some(([input]) =>
          String(input).includes("/api/admin/trr-api/social/ingest/stuck-jobs/cancel"),
        ),
      ).toBe(true);
    });
  });

  it("renders dispatch-blocked jobs and cancels one independently", async () => {
    queueStatusPayload = {
      ...queueStatusPayload,
      workers: {
        ...queueStatusPayload.workers,
        dispatcher_readiness: { resolved: false, reason: "modal_sdk_unavailable" },
      },
      queue: {
        ...queueStatusPayload.queue,
        dispatch_blocked_jobs_total: 1,
        dispatch_blocked_by_reason: { modal_sdk_unavailable: 1 },
        dispatch_blocked_jobs: [
          {
            id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
            run_id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
            platform: "instagram",
            job_type: "post_classify",
            status: "queued",
            worker_id: null,
            created_at: "2026-03-02T12:00:00.000Z",
            heartbeat_at: null,
            available_at: "2026-03-02T12:03:00.000Z",
            error_message: "No module named 'modal'",
            last_error_code: "modal_dispatch_failed",
            stuck_reason: "modal_sdk_unavailable",
            stuck_for_seconds: 620,
          },
        ],
      },
    };

    render(<SystemHealthModal isOpen onClose={() => undefined} />);

    await waitFor(() => {
      expect(screen.getAllByText("Dispatch Blocked").length).toBeGreaterThan(0);
      expect(screen.getByText("Modal SDK unavailable in dispatcher runtime")).toBeInTheDocument();
      expect(
        screen.getByText("Dispatch is blocked by the current Modal runtime or function resolution."),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel all dispatch-blocked jobs" }));

    await waitFor(() => {
      expect(
        fetchAdminWithAuthMock.mock.calls.some(([input]) =>
          String(input).includes("/api/admin/trr-api/social/ingest/dispatch-blocked-jobs/cancel"),
        ),
      ).toBe(true);
    });
  });

  it("renders failed last in queue summary and has scrollable modal body", async () => {
    queueStatusPayload = {
      ...queueStatusPayload,
      queue: {
        ...queueStatusPayload.queue,
        by_status: { running: 1, pending: 2, queued: 3, retrying: 4, failed: 5, cancelled: 6, completed: 7 },
        runs_by_status: { running: 1, pending: 2, queued: 3, retrying: 4, failed: 5, cancelled: 6, completed: 7 },
        by_platform: {
          twitter: { running: 1, pending: 2, queued: 3, retrying: 4, failed: 5, completed: 7 },
        },
      },
    };

    render(<SystemHealthModal isOpen onClose={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByText("Queue Health")).toBeInTheDocument();
    });

    expect(screen.getByText("Running now")).toBeInTheDocument();
    expect(screen.getByText("Waiting")).toBeInTheDocument();
    expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
    expect(screen.getByText("Waiting includes queued, pending, and retrying jobs.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "By Platform" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "By Stage" })).toBeInTheDocument();

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("max-h-[90vh]");
    const hasScrollableBody = Array.from(dialog.querySelectorAll("div")).some((node) =>
      typeof node.className === "string" && node.className.includes("max-h-[calc(90vh-8.5rem)]"),
    );
    expect(hasScrollableBody).toBe(true);
  });

  it("loads running worker detail and supports debug + apply patch actions", async () => {
    queueStatusPayload = {
      ...queueStatusPayload,
      workers: {
        ...queueStatusPayload.workers,
        healthy_workers: 1,
        total_workers: 1,
        workers: [
          {
            worker_id: "social-worker:ip-172-31-115-232.ec2.internal:healthy",
            stage: "posts",
            status: "working",
            run_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            current_job_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            metadata: { hostname: "ip-172-31-115-232.ec2.internal" },
            last_seen_at: new Date().toISOString(),
            is_healthy: true,
          },
        ],
      },
      queue: {
        ...queueStatusPayload.queue,
        recent_failures: [
          {
            id: "failure-1",
            run_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            platform: "twitter",
            job_type: "comments",
            status: "failed",
            error_message: "x",
            last_error_code: "E1",
            last_error_class: "Error",
            created_at: "2026-03-02T10:00:00.000Z",
            completed_at: "2026-03-02T10:01:00.000Z",
          },
        ],
      },
    };

    render(<SystemHealthModal isOpen onClose={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByText("Live Workers")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Posts worker" }));

    await waitFor(() => {
      expect(
        fetchAdminWithAuthMock.mock.calls.some(([input]) =>
          String(input).includes(
            "/api/admin/trr-api/social/ingest/workers/social-worker%3Aip-172-31-115-232.ec2.internal%3Ahealthy/detail",
          ),
        ),
      ).toBe(true);
    });

    await waitFor(() => {
      expect(screen.getByText("Selected Worker")).toBeInTheDocument();
      expect(screen.getByText(/Currently processing Twitter comments for @bravotv/i)).toBeInTheDocument();
      expect(screen.getByText(/Detailed job counts are not available yet/i)).toBeInTheDocument();
      expect(screen.getByText(/Comments Scan/)).toBeInTheDocument();
      expect(screen.getByText(/Handle: @bravotv/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Debug current job" }));

    await waitFor(() => {
      expect(
        fetchAdminWithAuthMock.mock.calls.some(([input]) =>
          String(input).includes("/api/admin/trr-api/social/ingest/jobs/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/debug"),
        ),
      ).toBe(true);
      expect(screen.getByText(/retry loop missing heartbeat refresh/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Apply suggested patch" }));

    await waitFor(() => {
      expect(screen.getByText(/Patch applied for job aaaaaaaa/)).toBeInTheDocument();
      expect(screen.getByText(/Patch applied to trr_backend\/repositories\/social_season_analytics.py/)).toBeInTheDocument();
    });
  });

  it("hides stale worker rows from list while keeping health counts", async () => {
    queueStatusPayload = {
      ...queueStatusPayload,
      workers: {
        ...queueStatusPayload.workers,
        healthy_workers: 1,
        fresh_workers: 1,
        stale_workers: 2,
        stale_hidden_count: 2,
        total_workers: 3,
        stale_after_seconds: 180,
        workers: [
          {
            worker_id: "social-worker:ip-172-31-115-232.ec2.internal:healthy",
            stage: "posts",
            status: "working",
            last_seen_at: new Date().toISOString(),
            is_healthy: true,
            metadata: { hostname: "ip-172-31-115-232.ec2.internal" },
          },
          {
            worker_id: "social-worker:ip-172-31-115-232.ec2.internal:stale",
            stage: "any",
            status: "idle",
            last_seen_at: "2026-02-20T00:00:00.000Z",
            is_healthy: false,
            metadata: { hostname: "ip-172-31-115-232.ec2.internal" },
          },
          {
            worker_id: "social-worker:thomass-MacBook-Pro.local:idle",
            stage: "comments",
            status: "idle",
            last_seen_at: new Date().toISOString(),
            is_healthy: false,
            metadata: { hostname: "thomass-MacBook-Pro.local" },
          },
        ],
      },
    };

    render(<SystemHealthModal isOpen onClose={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByText("Live Workers")).toBeInTheDocument();
    });

    expect(screen.getByText(/1 healthy · 1 seen recently · 3 recorded/i)).toBeInTheDocument();
    expect(screen.getByText(/2 older worker check-ins hidden/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show older worker check-ins/i })).toBeInTheDocument();
    expect(screen.getByText(/social-worker:ip-172-31-115-232\.ec2\.internal:healthy/i)).toBeInTheDocument();
    expect(screen.getAllByText(/thomass-MacBook-Pro\.local/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/social-worker:ip-172-31-115-232\.ec2\.internal:stale/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show older worker check-ins/i }));

    await waitFor(() => {
      expect(screen.getByText(/social-worker:ip-172-31-115-232\.ec2\.internal:stale/i)).toBeInTheDocument();
    });
  });

  it("falls back to worker executor backend when remote-plane backend is absent", async () => {
    queueStatusPayload = {
      ...queueStatusPayload,
      remote_plane: {
        execution_mode_canonical: "remote",
        execution_owner: "remote_worker",
        remote_job_plane_enforced: true,
      },
      workers: {
        ...queueStatusPayload.workers,
        executor_backend: "modal",
      },
    };

    render(<SystemHealthModal isOpen onClose={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByText("Execution backend")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Modal").length).toBeGreaterThan(0);
  });

  it("shows bottom cancel-all-active button and triggers active cancellation", async () => {
    queueStatusPayload = {
      ...queueStatusPayload,
      queue: {
        ...queueStatusPayload.queue,
        by_status: { running: 2, pending: 1, queued: 1, retrying: 0, failed: 0, cancelled: 0, completed: 0 },
      },
    };

    render(<SystemHealthModal isOpen onClose={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByText("Admin Actions")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel all active jobs" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel all active jobs" }));

    await waitFor(() => {
      expect(
        fetchAdminWithAuthMock.mock.calls.some(([input]) =>
          String(input).includes("/api/admin/trr-api/social/ingest/active-jobs/cancel"),
        ),
      ).toBe(true);
      expect(screen.getByText(/Cancelled 4 active jobs/)).toBeInTheDocument();
    });
  });

  it("runs fresh slate reset and clears visible health noise without deleting posts", async () => {
    queueStatusPayload = {
      ...queueStatusPayload,
      queue: {
        ...queueStatusPayload.queue,
        by_status: { running: 1, pending: 0, queued: 1, retrying: 1, failed: 4, cancelled: 0, completed: 20 },
        runs_by_status: { running: 1, retrying: 1, failed: 2, completed: 8 },
        recent_failures: [
          {
            id: "failure-1",
            run_id: "run-reset",
            platform: "instagram",
            job_type: "shared_account_posts",
            status: "failed",
            error_message: "remote executor failed",
            last_error_code: "ERR",
            last_error_class: "RuntimeError",
            created_at: "2026-03-19T10:00:00.000Z",
            completed_at: "2026-03-19T10:01:00.000Z",
          },
        ],
        running_jobs: [
          {
            id: "job-reset",
            run_id: "run-reset",
            platform: "instagram",
            job_type: "shared_account_posts",
            stage: "shared_account_posts",
            account_handle: "bravotv",
            worker_id: "modal:social-dispatcher",
            started_at: "2026-03-19T12:00:00.000Z",
            heartbeat_at: "2026-03-19T12:01:00.000Z",
            dispatch_backend: "modal",
            required_execution_backend: "modal",
          },
        ],
      },
    };

    render(<SystemHealthModal isOpen onClose={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Fresh slate reset" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Fresh slate reset" }));

    await waitFor(() => {
      expect(
        fetchAdminWithAuthMock.mock.calls.some(([input]) =>
          String(input).includes("/api/admin/trr-api/social/ingest/reset-health"),
        ),
      ).toBe(true);
    });

    await waitFor(() => {
      expect(screen.getByText(/Fresh slate ready/i)).toBeInTheDocument();
      expect(screen.getByText("No recent error patterns to review.")).toBeInTheDocument();
      expect(screen.getByText("No jobs are running right now.")).toBeInTheDocument();
    });
  });

  it("clears hidden older worker check-ins from the worker panel", async () => {
    queueStatusPayload = {
      ...queueStatusPayload,
      workers: {
        ...queueStatusPayload.workers,
        stale_hidden_count: 116,
        total_workers: 186,
        workers: [],
      },
    };

    render(<SystemHealthModal isOpen onClose={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Clear older worker check-ins" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear older worker check-ins" }));

    await waitFor(() => {
      expect(
        fetchAdminWithAuthMock.mock.calls.some(([input]) =>
          String(input).includes("/api/admin/trr-api/social/ingest/workers/purge-inactive"),
        ),
      ).toBe(true);
    });

    await waitFor(() => {
      expect(screen.getByText(/Cleared 116 older worker check-ins/)).toBeInTheDocument();
      expect(screen.queryByText(/116 older worker check-ins hidden/i)).not.toBeInTheDocument();
    });
  });
});
