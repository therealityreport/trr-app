import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import InstagramCatalogBackfillMockupPage from "@/app/admin/dev-dashboard/instagram-catalog-backfill-mockup/page";

const mocks = vi.hoisted(() => ({
  fetchAdminWithAuth: vi.fn(),
  useAdminGuard: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    prefetch,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }) => {
    void prefetch;
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: (...args: unknown[]) => (mocks.fetchAdminWithAuth as (...inner: unknown[]) => unknown)(...args),
}));

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: (...args: unknown[]) => (mocks.useAdminGuard as (...inner: unknown[]) => unknown)(...args),
}));

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("InstagramCatalogBackfillMockupPage", () => {
  beforeEach(() => {
    mocks.fetchAdminWithAuth.mockReset();
    mocks.useAdminGuard.mockReset();
    mocks.useAdminGuard.mockReturnValue({
      user: { uid: "admin-1" },
      checking: false,
      hasAccess: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the current-truth catalog backfill status from the active run", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/catalog/runs/recent?limit=8")) {
        return jsonResponse({
          platform: "instagram",
          handle: "bravotv",
          catalog_recent_runs: [
            {
              job_id: "mock-job-1",
              run_id: "mock-run-1",
              status: "running",
              created_at: "2026-07-01T14:00:00Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/mock-run-1/progress")) {
        expect(url).toContain("fast=1");
        return jsonResponse({
          run_id: "mock-run-1",
          run_status: "running",
          instagram_posts_auth_mode: "authenticated",
          post_progress: {
            completed_posts: 74,
            total_posts: 17574,
          },
          detail_worker_count: 2,
          attached_followups: {
            comments: {
              state: "pending",
              status: "pending",
              source: "deferred_after_catalog",
            },
          },
          summary: {
            total_jobs: 2,
            completed_jobs: 0,
            failed_jobs: 0,
            active_jobs: 2,
            items_found_total: 74,
          },
        });
      }
      if (url.includes("/completion-summary?year=")) {
        return jsonResponse({
          year: 2026,
          total_posts: 17574,
          total_reported_comments: 2299198,
          saved_comments: 1118683,
          missing_comments: 1180515,
          lanes: {
            comments: { finished: 6000, in_progress: 400, not_started: 11174 },
            details: { finished: 74, in_progress: 0, not_started: 17500 },
            media: { finished: 16691, in_progress: 200, not_started: 683 },
          },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<InstagramCatalogBackfillMockupPage />);

    expect(await screen.findByText("Instagram Backfill Status")).toBeInTheDocument();
    expect(screen.getByText("Current Truth")).toBeInTheDocument();
    expect(screen.getByText("Mockup")).toBeInTheDocument();
    expect(screen.getByText(/74 \/ 17,574 posts checked/)).toBeInTheDocument();
    expect(screen.getByText(/2 workers active/)).toBeInTheDocument();
    expect(screen.getByText("No blocker")).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.fetchAdminWithAuth.mock.calls.some(([input]) => String(input).includes("fast=1"))).toBe(true);
    });
  });

  it("loads attached comments progress for the shard health dashboard", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/catalog/runs/recent?limit=8")) {
        return jsonResponse({
          platform: "instagram",
          handle: "bravotv",
          catalog_recent_runs: [
            {
              job_id: "mock-job-1",
              run_id: "mock-run-1",
              comments_run_id: "comments-run-1",
              status: "running",
              created_at: "2026-07-01T14:00:00Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/mock-run-1/progress")) {
        return jsonResponse({
          run_id: "mock-run-1",
          run_status: "running",
          comments_run_id: "comments-run-1",
          post_progress: {
            completed_posts: 74,
            total_posts: 17574,
          },
          summary: {
            total_jobs: 2,
            active_jobs: 2,
          },
        });
      }
      if (url.includes("/comments/runs/comments-run-1/progress")) {
        return jsonResponse({
          run_id: "comments-run-1",
          platform: "instagram",
          account_handle: "bravotv",
          run_status: "running",
          post_progress: {
            completed_posts: 12,
            total_posts: 60,
          },
          summary: {
            comments_processed_total: 4096,
          },
          throughput: {
            posts_per_minute: 1.5,
            comments_per_minute: 320.4,
          },
          worker_counters: {
            running: 1,
            retrying: 1,
            queued: 2,
            failed: 0,
            total: 4,
          },
          shards: [
            {
              shard_index: 0,
              shard_count: 4,
              job_id: "comment-job-1",
              status: "running",
              completed_posts: 12,
              target_count: 15,
              comments_processed: 4096,
              comments_per_minute: 320.4,
            },
          ],
        });
      }
      if (url.includes("/completion-summary?year=")) {
        return jsonResponse({
          year: 2026,
          total_posts: 17574,
          total_reported_comments: 2299198,
          saved_comments: 1118683,
          missing_comments: 1180515,
          lanes: {
            comments: { finished: 6000, in_progress: 400, not_started: 11174 },
            details: { finished: 74, in_progress: 0, not_started: 17500 },
            media: { finished: 16691, in_progress: 200, not_started: 683 },
          },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<InstagramCatalogBackfillMockupPage />);

    expect(await screen.findByText("Shard Health")).toBeInTheDocument();
    expect((await screen.findAllByText(/Run comments/)).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Shard 1 of 4/)).toBeInTheDocument();
    expect(screen.getByText(/4,096 fetched/)).toBeInTheDocument();
    await waitFor(() => {
      expect(
        mocks.fetchAdminWithAuth.mock.calls.some(([input]) =>
          String(input).includes("/comments/runs/comments-run-1/progress"),
        ),
      ).toBe(true);
    });
  });

  it("dedupes mockup history and excludes the displayed active run", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/catalog/runs/recent?limit=8")) {
        return jsonResponse({
          platform: "instagram",
          handle: "bravotv",
          catalog_recent_runs: [
            {
              job_id: "active-job-1",
              run_id: "active-run-1",
              status: "running",
              created_at: "2026-07-01T14:00:00Z",
            },
            {
              job_id: "active-job-1-duplicate",
              run_id: "active-run-1",
              status: "running",
              created_at: "2026-07-01T14:00:00Z",
            },
            {
              job_id: "older-job-1",
              run_id: "older-run-1",
              status: "cancelled",
              created_at: "2026-06-30T14:00:00Z",
            },
            {
              job_id: "older-job-1-duplicate",
              run_id: "older-run-1",
              status: "cancelled",
              created_at: "2026-06-30T14:00:00Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/active-run-1/progress")) {
        return jsonResponse({
          run_id: "active-run-1",
          run_status: "running",
          post_progress: {
            completed_posts: 74,
            total_posts: 17574,
          },
          summary: {
            total_jobs: 2,
            completed_jobs: 0,
            failed_jobs: 0,
            active_jobs: 2,
            items_found_total: 74,
          },
        });
      }
      if (url.includes("/completion-summary?year=")) {
        return jsonResponse({
          year: 2026,
          total_posts: 17574,
          total_reported_comments: 2299198,
          saved_comments: 1118683,
          missing_comments: 1180515,
          lanes: {
            comments: { finished: 6000, in_progress: 400, not_started: 11174 },
            details: { finished: 74, in_progress: 0, not_started: 17500 },
            media: { finished: 16691, in_progress: 200, not_started: 683 },
          },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<InstagramCatalogBackfillMockupPage />);

    expect(
      await screen.findByText((content) => content.includes("Run active-r") && content.includes("Running")),
    ).toBeInTheDocument();
    const historyHeading = screen.getByText("History");
    const historyCard = historyHeading.closest('[data-slot="card"]');
    expect(historyCard).not.toBeNull();
    const history = within(historyCard as HTMLElement);
    expect(history.queryByText((content) => content.includes("Run active-r"))).not.toBeInTheDocument();
    expect(history.getAllByText((content) => content.includes("Run older-ru"))).toHaveLength(1);
  });

  it("mutes active-looking lane states when the parent run has failed", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/catalog/runs/recent?limit=8")) {
        return jsonResponse({
          platform: "instagram",
          handle: "bravotv",
          catalog_recent_runs: [
            {
              job_id: "failed-job-1",
              run_id: "failed-run-1",
              status: "failed",
              error_message: "modal invocation failed",
              created_at: "2026-07-01T14:00:00Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/failed-run-1/progress")) {
        return jsonResponse({
          run_id: "failed-run-1",
          run_status: "failed",
          details_progress: { status: "queued" },
          attached_followups: {
            comments: { status: "pending", state: "pending", source: "deferred_after_catalog" },
            media: { status: "pending", state: "pending", source: "catalog_media_mirror", enqueued_job_count: 0 },
          },
          summary: {
            total_jobs: 6,
            active_jobs: 0,
          },
        });
      }
      if (url.includes("/completion-summary?year=")) {
        return jsonResponse({
          year: 2026,
          total_posts: 17574,
          total_reported_comments: 0,
          saved_comments: 0,
          missing_comments: 0,
          lanes: {
            comments: { finished: 0, in_progress: 0, not_started: 0 },
            details: { finished: 0, in_progress: 0, not_started: 0 },
            media: { finished: 0, in_progress: 0, not_started: 0 },
          },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<InstagramCatalogBackfillMockupPage />);

    expect(await screen.findByText("Run failed")).toBeInTheDocument();
    expect(screen.getByText("modal invocation failed")).toBeInTheDocument();
    expect(screen.getAllByText("Failed").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText("Parent run is failed; no lane is currently running.").length).toBeGreaterThanOrEqual(2);
  });
});
