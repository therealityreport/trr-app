import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SystemHealthModal, { HealthIndicator } from "@/components/admin/SystemHealthModal";

const { fetchAdminWithAuthMock, usePathnameMock } = vi.hoisted(() => ({
  fetchAdminWithAuthMock: vi.fn(),
  usePathnameMock: vi.fn(() => "/admin/social-media"),
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
      stale_claims?: {
        total: number;
        by_reason: Record<string, number>;
        by_platform: Record<string, number>;
        by_stage: Record<string, number>;
      };
      recent_failures: unknown[];
      stuck_jobs: Array<Record<string, unknown>>;
      stuck_jobs_total: number;
    };
  };
  let workerDetailPayload: Record<string, unknown>;

  beforeEach(() => {
    vi.useRealTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    fetchAdminWithAuthMock.mockReset();
    usePathnameMock.mockReturnValue("/admin/social-media");
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
        stale_claims: { total: 0, by_reason: {}, by_platform: {}, by_stage: {} },
        recent_failures: [],
        stuck_jobs: [],
        stuck_jobs_total: 0,
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
      expect(screen.getByText("Social Sync Health")).toBeInTheDocument();
    });

    expect(screen.getByText("How This Sync Runs")).toBeInTheDocument();
    expect(screen.getByText("Remote executor")).toBeInTheDocument();
    expect(screen.getByText("Modal")).toBeInTheDocument();
    expect(screen.getByText("Remote")).toBeInTheDocument();
    expect(screen.getByText("Local execution is disabled")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Shows whether the remote executor is available, whether jobs are moving, and whether anything needs intervention.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Queue Health")).toBeInTheDocument();
    expect(screen.getByText(/2 stale claimed jobs/i)).toBeInTheDocument();
    expect(screen.getByText("Overall Status")).toBeInTheDocument();
    expect(screen.getByText("Work Happening Now")).toBeInTheDocument();
    expect(screen.getByText("Worker Availability")).toBeInTheDocument();
    expect(screen.getByText("Attention Needed")).toBeInTheDocument();
  });

  it("keeps the modal healthy when only historical failures exist", async () => {
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
      expect(screen.getAllByText("Healthy").length).toBeGreaterThan(0);
    });

    expect(screen.getByText("Workers are available, but there are recent failures to review.")).toBeInTheDocument();
    expect(screen.getByText("1 recent failures")).toBeInTheDocument();
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
    expect(screen.getByText(/1 older worker check-in hidden/)).toBeInTheDocument();
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
});
