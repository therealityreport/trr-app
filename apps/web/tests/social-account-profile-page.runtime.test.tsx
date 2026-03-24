import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  fetchAdminWithAuth: vi.fn(),
  useAdminGuard: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: (...args: unknown[]) => (mocks.fetchAdminWithAuth as (...inner: unknown[]) => unknown)(...args),
}));

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: (...args: unknown[]) => (mocks.useAdminGuard as (...inner: unknown[]) => unknown)(...args),
}));

vi.mock("@/components/ClientOnly", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/admin/AdminBreadcrumbs", () => ({
  default: () => <div data-testid="breadcrumbs" />,
}));

vi.mock("@/components/admin/AdminGlobalHeader", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/admin/admin-breadcrumbs", () => ({
  buildAdminSectionBreadcrumb: () => [],
}));

vi.mock("@/lib/admin/show-admin-routes", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/show-admin-routes")>(
    "@/lib/admin/show-admin-routes",
  );
  return {
    ...actual,
    buildSocialAccountProfileUrl: ({
      platform,
      handle,
      tab,
    }: {
      platform: string;
      handle: string;
      tab?: string;
    }) => `/admin/social/${platform}/${handle}${tab && tab !== "stats" ? `/${tab}` : ""}`,
  };
});

import SocialAccountProfilePage from "@/components/admin/SocialAccountProfilePage";

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const baseSummary = {
  platform: "instagram",
  account_handle: "bravotv",
  profile_url: "https://www.instagram.com/bravotv/",
  total_posts: 12,
  total_engagement: 1200,
  total_views: 5000,
  last_post_at: "2026-03-17T14:00:00.000Z",
  catalog_total_posts: 10,
  catalog_assigned_posts: 6,
  catalog_unassigned_posts: 2,
  catalog_pending_review_posts: 2,
  last_catalog_run_at: "2026-03-17T12:00:00.000Z",
  last_catalog_run_status: "completed",
  catalog_recent_runs: [],
  per_show_counts: [
    {
      show_id: "show-rhoslc",
      show_name: "The Real Housewives of Salt Lake City",
      show_slug: "rhoslc",
      post_count: 4,
      engagement: 300,
    },
  ],
  per_season_counts: [
    {
      season_id: "season-rhoslc-6",
      season_number: 6,
      show_id: "show-rhoslc",
      show_name: "The Real Housewives of Salt Lake City",
      show_slug: "rhoslc",
      post_count: 4,
      engagement: 300,
    },
  ],
  top_hashtags: [],
  top_collaborators: [],
  top_tags: [],
  source_status: [],
};

describe("SocialAccountProfilePage", () => {
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

  it("renders supported-platform catalog actions on the stats tab", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Backfill Posts" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Sync Recent" })).toBeInTheDocument();
    expect(screen.getByText("Catalog Posts")).toBeInTheDocument();
    expect(screen.getByText("Pending Review")).toBeInTheDocument();
    expect(screen.queryByText("Catalog Actions Unavailable In V1")).not.toBeInTheDocument();
  });

  it("queues a full-history catalog backfill from the primary CTA", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/catalog/backfill")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(JSON.stringify({ backfill_scope: "full_history" }));
        return jsonResponse({ run_id: "catalog-run-12345678", status: "queued" });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Backfill Posts" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Backfill Posts" }));

    await waitFor(() => {
      expect(screen.getByText("Post backfill queued (catalog-).")).toBeInTheDocument();
    });
  });

  it("renders TikTok catalog actions and skips the Instagram-only hashtag timeline fetch", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          platform: "tiktok",
          profile_url: "https://www.tiktok.com/@bravotv",
          avatar_url: "https://images.test/tiktok-avatar.jpg",
          display_name: "Bravo TV",
          bio: "Official Bravo TV account",
          is_verified: true,
          follower_count: 1200000,
          following_count: 42,
          live_total_posts: 2450,
          total_posts: 2450,
        });
      }
      if (url.endsWith("/hashtags")) {
        return jsonResponse({ items: [] });
      }
      if (url.endsWith("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    const { rerender } = render(<SocialAccountProfilePage platform="tiktok" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Backfill Posts" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Sync Recent" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open public profile" })).toHaveAttribute(
      "href",
      "https://www.tiktok.com/@bravotv",
    );

    rerender(<SocialAccountProfilePage platform="tiktok" handle="bravotv" activeTab="hashtags" />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Hashtags", level: 2 })).toBeInTheDocument();
    });

    expect(
      mocks.fetchAdminWithAuth.mock.calls.some(([input]) => String(input).includes("/hashtags/timeline")),
    ).toBe(false);
  });

  it("renders Twitter catalog actions with the shared profile UI", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          platform: "twitter",
          profile_url: "https://x.com/bravotv",
          avatar_url: "https://images.test/twitter-avatar.jpg",
          display_name: "Bravo TV",
          is_verified: true,
          total_posts: 1200,
          catalog_total_posts: 1200,
          live_catalog_total_posts: 1200,
        });
      }
      if (url.endsWith("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="twitter" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Backfill Posts" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Sync Recent" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open public profile" })).toHaveAttribute(
      "href",
      "https://x.com/bravotv",
    );
  });

  it("expands caption search without switching tabs and shows backend search results", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          platform: "instagram",
        });
      }
      if (url.includes("/posts?page=1&page_size=25&search=%23BravoCon")) {
        return jsonResponse({
          items: [
            {
              id: "post-1",
              source_id: "source-1",
              platform: "instagram",
              account_handle: "bravotv",
              title: "BravoCon backstage",
              content: "Catch @andycohen and the cast live from #BravoCon.",
              posted_at: "2026-03-18T12:00:00.000Z",
              show_name: "Watch What Happens Live",
              season_number: 21,
              hashtags: ["BravoCon"],
              mentions: ["andycohen"],
              collaborators: ["andycohen"],
              tags: ["bravotv"],
              metrics: {},
            },
          ],
          pagination: {
            page: 1,
            page_size: 100,
            total: 1,
            total_pages: 1,
          },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Stats" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Open caption search" }));

    await waitFor(() => {
      expect(screen.getByRole("searchbox", { name: "Search captions" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole("searchbox", { name: "Search captions" }), {
      target: { value: "#BravoCon" },
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Caption Search", level: 2 })).toBeInTheDocument();
      expect(screen.getByText("BravoCon backstage")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        screen.getByText((content) => content.includes("1 matching caption") && content.includes("#BravoCon")),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("RHOSLC reunion")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Collaborators / Tags", level: 2 })).not.toBeInTheDocument();
  });

  it("shows the caption search control beside the tab pills before any tab change", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          platform: "tiktok",
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="tiktok" handle="bravotv" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Collaborators / Tags" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Open caption search" })).toBeInTheDocument();
    expect(screen.getByText("Search Posts")).toBeInTheDocument();
  });

  it("renders separate collaborator, tagged account, and mention columns", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          platform: "tiktok",
        });
      }
      if (url.includes("/collaborators-tags")) {
        return jsonResponse({
          collaborators: [
            {
              handle: "bravochatroom",
              platform: "tiktok",
              usage_count: 4,
              post_count: 4,
              latest_seen_at: "2026-03-22T12:00:00.000Z",
              shows: [],
              seasons: [],
            },
          ],
          tags: [
            {
              handle: "staciarusch",
              platform: "tiktok",
              usage_count: 2,
              post_count: 2,
              latest_seen_at: "2026-03-21T12:00:00.000Z",
              shows: [],
              seasons: [],
            },
          ],
          mentions: [
            {
              handle: "peacock",
              platform: "tiktok",
              usage_count: 12,
              post_count: 12,
              latest_seen_at: "2026-03-22T12:00:00.000Z",
              shows: [],
              seasons: [],
            },
          ],
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="tiktok" handle="bravotv" activeTab="collaborators-tags" />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Collaborators / Tagged Accounts / Mentions", level: 2 })).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "Collaborators", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tagged Accounts", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mentions", level: 2 })).toBeInTheDocument();
    expect(screen.getByText("@bravochatroom")).toBeInTheDocument();
    expect(screen.getByText("@staciarusch")).toBeInTheDocument();
    expect(screen.getByText("@peacock")).toBeInTheDocument();
  });

  it("renders YouTube catalog actions and skips the Instagram-only hashtag timeline fetch", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          platform: "youtube",
          account_handle: "bravo",
          profile_url: "https://www.youtube.com/@bravo",
          avatar_url: "https://images.test/youtube-avatar.jpg",
          display_name: "Bravo",
          bio: "Official Bravo channel",
          follower_count: 1200000,
          live_total_posts: 2450,
          total_posts: 2450,
          catalog_total_posts: 2450,
          live_catalog_total_posts: 2450,
        });
      }
      if (url.endsWith("/hashtags")) {
        return jsonResponse({ items: [] });
      }
      if (url.endsWith("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    const { rerender } = render(<SocialAccountProfilePage platform="youtube" handle="bravo" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Backfill Posts" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Sync Recent" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open public profile" })).toHaveAttribute(
      "href",
      "https://www.youtube.com/@bravo",
    );

    rerender(<SocialAccountProfilePage platform="youtube" handle="bravo" activeTab="hashtags" />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Hashtags", level: 2 })).toBeInTheDocument();
    });

    expect(
      mocks.fetchAdminWithAuth.mock.calls.some(([input]) => String(input).includes("/hashtags/timeline")),
    ).toBe(false);
  });

  it("shows cancel controls and discovery progress for an active catalog run", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: [
            {
              run_id: "run-active-1",
              status: "running",
              created_at: "2026-03-18T11:00:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-active-1/progress")) {
        return jsonResponse({
          run_id: "run-active-1",
          run_status: "running",
          source_scope: "bravo",
          created_at: "2026-03-18T11:00:00.000Z",
          stages: {
            shared_account_discovery: {
              jobs_total: 1,
              jobs_completed: 0,
              jobs_failed: 0,
              jobs_active: 1,
              jobs_running: 1,
              jobs_waiting: 0,
              scraped_count: 420,
              saved_count: 0,
            },
          },
          per_handle: [],
          recent_log: [],
          worker_runtime: {
            runner_strategy: "full_history_cursor_breakpoints",
            runner_count: 4,
            scheduler_lanes: ["A", "B", "C", "D"],
          },
          discovery: {
            status: "queued",
            partition_strategy: "cursor_breakpoints",
            partition_count: 4,
            discovered_count: 4,
            queued_count: 4,
            running_count: 0,
            completed_count: 0,
            failed_count: 0,
            cancelled_count: 0,
          },
          post_progress: {
            completed_posts: 420,
            matched_posts: 420,
            total_posts: 4500,
          },
          summary: {
            total_jobs: 5,
            completed_jobs: 0,
            failed_jobs: 0,
            active_jobs: 5,
            items_found_total: 420,
          },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Cancel Run" })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        screen.getByText((content) => content.includes("420") && content.includes("posts checked")),
      ).toBeInTheDocument();
      expect(
        screen.getByText((content) => content.includes("420") && content.includes("matched")),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("420 scraped")).not.toBeInTheDocument();
  });

  it("renders frontier-mode labels and suppresses shard copy for newest-first runs", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: [
            {
              run_id: "run-frontier-1",
              status: "running",
              created_at: "2026-03-20T12:00:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-frontier-1/progress")) {
        return jsonResponse({
          run_id: "run-frontier-1",
          run_status: "running",
          source_scope: "bravo",
          stages: {
            shared_account_discovery: {
              jobs_total: 1,
              jobs_completed: 1,
              jobs_failed: 0,
              jobs_active: 0,
              jobs_running: 0,
              jobs_waiting: 0,
              scraped_count: 33,
              saved_count: 33,
            },
            shared_account_posts: {
              jobs_total: 1,
              jobs_completed: 0,
              jobs_failed: 0,
              jobs_active: 1,
              jobs_running: 1,
              jobs_waiting: 0,
              scraped_count: 99,
              saved_count: 99,
            },
          },
          per_handle: [
            {
              platform: "instagram",
              account_handle: "bravotv",
              stage: "shared_account_posts",
              jobs_total: 1,
              jobs_completed: 0,
              jobs_failed: 0,
              jobs_active: 1,
              jobs_running: 1,
              jobs_waiting: 0,
              scraped_count: 99,
              saved_count: 99,
              has_started: true,
              next_stage: "shared_account_posts",
            },
          ],
          recent_log: [],
          worker_runtime: {
            runner_strategy: "newest_first_frontier",
            frontier_strategy: "newest_first_frontier",
            runner_count: 4,
            partition_strategy: "newest_first_frontier",
          },
          frontier: {
            status: "running",
            pages_scanned: 3,
            posts_checked: 99,
            posts_saved: 99,
            expected_total_posts: 16454,
            transport: "public",
            lease_owner: "modal:test",
            retry_count: 1,
          },
          post_progress: {
            completed_posts: 99,
            matched_posts: 99,
            total_posts: 16454,
          },
          summary: {
            total_jobs: 4,
            completed_jobs: 1,
            failed_jobs: 0,
            active_jobs: 3,
            items_found_total: 99,
          },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByText("History Bootstrap")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Catalog Fetch").length).toBeGreaterThan(0);
    expect(screen.queryByText(/shards complete/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Frontier active/i)).toBeInTheDocument();
  });

  it("blocks duplicate backfill actions while the same profile already has an active run", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: [
            {
              run_id: "run-active-2",
              status: "retrying",
              created_at: "2026-03-18T11:00:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-active-2/progress")) {
        return jsonResponse({
          run_id: "run-active-2",
          run_status: "retrying",
          source_scope: "bravo",
          stages: {},
          per_handle: [],
          recent_log: [],
          summary: {
            total_jobs: 3,
            completed_jobs: 1,
            failed_jobs: 0,
            active_jobs: 2,
            items_found_total: 24,
          },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Backfill Posts" })).toBeDisabled();
    });

    expect(screen.getByRole("button", { name: "Sync Recent" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel Run" })).toBeInTheDocument();
    expect(screen.getByText(/Run run-acti is Retrying\./i)).toBeInTheDocument();
    expect(screen.getByText(/Start buttons unlock after it finishes or you cancel it\./i)).toBeInTheDocument();
  });

  it("prefers live polled status over stale summary status for the displayed run", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: [
            {
              run_id: "run-active-3",
              status: "queued",
              created_at: "2026-03-18T11:00:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-active-3/progress")) {
        return jsonResponse({
          run_id: "run-active-3",
          run_status: "running",
          source_scope: "bravo",
          stages: {},
          per_handle: [],
          recent_log: [],
          summary: {
            total_jobs: 2,
            completed_jobs: 0,
            failed_jobs: 0,
            active_jobs: 2,
            items_found_total: 24,
          },
        });
      }
      if (url.includes("/catalog/posts")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      if (url.includes("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(
        screen.getByText("Run run-acti is Running. Start buttons unlock after it finishes or you cancel it."),
      ).toBeInTheDocument();
    });
  });

  it("keeps start actions blocked when viewing an older run while another run is active", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: [
            {
              run_id: "run-active-new",
              status: "running",
              created_at: "2026-03-19T11:00:00.000Z",
            },
            {
              run_id: "run-failed-old",
              status: "failed",
              created_at: "2026-03-18T11:00:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-active-new/progress")) {
        return jsonResponse({
          run_id: "run-active-new",
          run_status: "running",
          source_scope: "bravo",
          stages: {},
          per_handle: [],
          recent_log: [],
          summary: {
            total_jobs: 4,
            completed_jobs: 1,
            failed_jobs: 0,
            active_jobs: 3,
            items_found_total: 48,
          },
        });
      }
      if (url.includes("/catalog/runs/run-failed-old/progress")) {
        return jsonResponse({
          run_id: "run-failed-old",
          run_status: "failed",
          source_scope: "bravo",
          stages: {},
          per_handle: [],
          recent_log: [],
          summary: {
            total_jobs: 1,
            completed_jobs: 0,
            failed_jobs: 1,
            active_jobs: 0,
            items_found_total: 0,
          },
        });
      }
      if (url.includes("/catalog/posts")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      if (url.includes("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Backfill Posts" })).toBeDisabled();
    });

    const failedRunCard = screen.getByText("Run run-fail").closest(".rounded-xl");
    expect(failedRunCard).not.toBeNull();
    fireEvent.click(within(failedRunCard as HTMLElement).getByRole("button", { name: "View Details" }));

    await waitFor(() => {
      expect(
        mocks.fetchAdminWithAuth.mock.calls.some(([input]) =>
          String(input).includes("/catalog/runs/run-failed-old/progress"),
        ),
      ).toBe(true);
    });
    expect(screen.getByRole("button", { name: "Backfill Posts" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sync Recent" })).toBeDisabled();
  });

  it("cancels the true active run even when an older run is being inspected", async () => {
    const cancelCalls: string[] = [];

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: [
            {
              run_id: "run-active-live",
              status: "running",
              created_at: "2026-03-19T11:00:00.000Z",
            },
            {
              run_id: "run-old-history",
              status: "failed",
              created_at: "2026-03-18T11:00:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-active-live/progress")) {
        return jsonResponse({
          run_id: "run-active-live",
          run_status: "running",
          source_scope: "bravo",
          stages: {},
          per_handle: [],
          recent_log: [],
          summary: {
            total_jobs: 2,
            completed_jobs: 0,
            failed_jobs: 0,
            active_jobs: 2,
            items_found_total: 24,
          },
        });
      }
      if (url.includes("/catalog/runs/run-old-history/progress")) {
        return jsonResponse({
          run_id: "run-old-history",
          run_status: "failed",
          source_scope: "bravo",
          stages: {},
          per_handle: [],
          recent_log: [],
          summary: {
            total_jobs: 1,
            completed_jobs: 0,
            failed_jobs: 1,
            active_jobs: 0,
            items_found_total: 0,
          },
        });
      }
      if (url.includes("/catalog/posts")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      if (url.includes("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      if (url.includes("/cancel")) {
        expect(init?.method).toBe("POST");
        cancelCalls.push(url);
        return jsonResponse({ ok: true });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "View Details" }).length).toBeGreaterThan(0);
    });

    const oldRunCard = screen.getByText("Run run-old-").closest(".rounded-xl");
    expect(oldRunCard).not.toBeNull();
    fireEvent.click(within(oldRunCard as HTMLElement).getByRole("button", { name: "View Details" }));

    await waitFor(() => {
      expect(
        mocks.fetchAdminWithAuth.mock.calls.some(([input]) =>
          String(input).includes("/catalog/runs/run-old-history/progress"),
        ),
      ).toBe(true);
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel Run" }));

    await waitFor(() => {
      expect(cancelCalls.length).toBe(1);
    });
    expect(cancelCalls[0]).toContain("/catalog/runs/run-active-live/cancel");
    expect(cancelCalls[0]).not.toContain("/catalog/runs/run-old-history/cancel");
  });

  it("uses live progress status in the action banner when summary status is stale", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: [
            {
              run_id: "run-live-1",
              status: "queued",
              created_at: "2026-03-22T07:45:33.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-live-1/progress")) {
        return jsonResponse({
          run_id: "run-live-1",
          run_status: "running",
          source_scope: "bravo",
          stages: {},
          per_handle: [],
          recent_log: [],
          summary: {
            total_jobs: 2,
            completed_jobs: 0,
            failed_jobs: 0,
            active_jobs: 2,
            items_found_total: 24,
          },
        });
      }
      if (url.includes("/catalog/posts")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      if (url.includes("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByText(/Run run-live is Running\./)).toBeInTheDocument();
    });
  });

  it("shows waiting for Modal capacity when a queued catalog job is pending inside Modal", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          platform: "tiktok",
          account_handle: "bravotv",
          profile_url: "https://www.tiktok.com/@bravotv",
          catalog_recent_runs: [
            {
              run_id: "run-modal-wait-1",
              status: "queued",
              created_at: "2026-03-22T09:45:33.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-modal-wait-1/progress")) {
        return jsonResponse({
          run_id: "run-modal-wait-1",
          run_status: "queued",
          source_scope: "bravo",
          stages: {
            shared_account_discovery: {
              jobs_total: 1,
              jobs_completed: 0,
              jobs_failed: 0,
              jobs_active: 1,
              jobs_running: 0,
              jobs_waiting: 1,
              scraped_count: 0,
              saved_count: 0,
            },
          },
          per_handle: [],
          recent_log: [],
          dispatch_health: {
            queued_unclaimed_jobs: 0,
            modal_pending_jobs: 1,
            modal_running_unclaimed_jobs: 0,
            retrying_dispatch_jobs: 0,
            stale_dispatch_failed_jobs: 0,
            latest_dispatch_requested_at: "2026-03-22T09:45:33.000Z",
            remote_invocation_checked_at: "2026-03-22T09:46:03.000Z",
            max_stale_dispatch_retries: 3,
          },
          summary: {
            total_jobs: 1,
            completed_jobs: 0,
            failed_jobs: 0,
            active_jobs: 1,
            items_found_total: 0,
          },
        });
      }
      if (url.includes("/catalog/posts")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      if (url.includes("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="tiktok" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByText("Waiting for Modal capacity")).toBeInTheDocument();
    });
    expect(screen.getAllByText(/already dispatched to Modal and waiting for capacity/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Cancel Run" })).toBeInTheDocument();
  });

  it("keeps waiting for Modal worker when the backend has no live remote invocation yet", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          platform: "tiktok",
          account_handle: "bravotv",
          profile_url: "https://www.tiktok.com/@bravotv",
          catalog_recent_runs: [
            {
              run_id: "run-modal-worker-1",
              status: "queued",
              created_at: "2026-03-22T09:45:33.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-modal-worker-1/progress")) {
        return jsonResponse({
          run_id: "run-modal-worker-1",
          run_status: "queued",
          source_scope: "bravo",
          stages: {
            shared_account_discovery: {
              jobs_total: 1,
              jobs_completed: 0,
              jobs_failed: 0,
              jobs_active: 1,
              jobs_running: 0,
              jobs_waiting: 1,
              scraped_count: 0,
              saved_count: 0,
            },
          },
          per_handle: [],
          recent_log: [],
          dispatch_health: {
            queued_unclaimed_jobs: 1,
            modal_pending_jobs: 0,
            modal_running_unclaimed_jobs: 0,
            retrying_dispatch_jobs: 0,
            stale_dispatch_failed_jobs: 0,
            latest_dispatch_requested_at: "2026-03-22T09:45:33.000Z",
            max_stale_dispatch_retries: 3,
          },
          summary: {
            total_jobs: 1,
            completed_jobs: 0,
            failed_jobs: 0,
            active_jobs: 1,
            items_found_total: 0,
          },
        });
      }
      if (url.includes("/catalog/posts")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      if (url.includes("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="tiktok" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByText("Waiting for Modal worker")).toBeInTheDocument();
    });
    expect(screen.getAllByText(/waiting for a Modal worker claim/i).length).toBeGreaterThan(0);
  });

  it("shows retrying remote dispatch when the backend is recovering stale unclaimed Modal dispatches", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: [
            {
              run_id: "run-retry-1",
              status: "queued",
              created_at: "2026-03-22T09:45:33.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-retry-1/progress")) {
        return jsonResponse({
          run_id: "run-retry-1",
          run_status: "queued",
          source_scope: "bravo",
          stages: {
            shared_account_discovery: {
              jobs_total: 1,
              jobs_completed: 0,
              jobs_failed: 0,
              jobs_active: 1,
              jobs_running: 0,
              jobs_waiting: 1,
              scraped_count: 0,
              saved_count: 0,
            },
          },
          per_handle: [],
          recent_log: [],
          dispatch_health: {
            queued_unclaimed_jobs: 0,
            retrying_dispatch_jobs: 1,
            stale_dispatch_failed_jobs: 0,
            max_stale_dispatch_retries: 3,
          },
          summary: {
            total_jobs: 1,
            completed_jobs: 0,
            failed_jobs: 0,
            active_jobs: 1,
            items_found_total: 0,
          },
        });
      }
      if (url.includes("/catalog/posts")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      if (url.includes("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByText("Retrying remote dispatch")).toBeInTheDocument();
    });
    expect(screen.getAllByText(/retrying remote dispatch after an unclaimed Modal lease expired/i).length).toBeGreaterThan(0);
  });

  it("renders single-runner fallback shared-account posts as catalog fetch with checked counts", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          platform: "tiktok",
          account_handle: "bravotv",
          profile_url: "https://www.tiktok.com/@bravotv",
          total_posts: 10_100,
          catalog_recent_runs: [
            {
              run_id: "run-fallback-fetch-1",
              status: "running",
              created_at: "2026-03-22T10:31:06.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-fallback-fetch-1/progress")) {
        return jsonResponse({
          run_id: "run-fallback-fetch-1",
          run_status: "running",
          source_scope: "bravo",
          stages: {
            shared_account_discovery: {
              jobs_total: 1,
              jobs_completed: 1,
              jobs_failed: 0,
              jobs_active: 0,
              jobs_running: 0,
              jobs_waiting: 0,
              scraped_count: 0,
              saved_count: 0,
            },
            shared_account_posts: {
              jobs_total: 1,
              jobs_completed: 0,
              jobs_failed: 0,
              jobs_active: 1,
              jobs_running: 1,
              jobs_waiting: 0,
              scraped_count: 42,
              saved_count: 18,
            },
          },
          per_handle: [
            {
              platform: "tiktok",
              account_handle: "bravotv",
              stage: "shared_account_discovery",
              jobs_total: 1,
              jobs_completed: 1,
              jobs_failed: 0,
              jobs_active: 0,
              jobs_running: 0,
              jobs_waiting: 0,
              scraped_count: 0,
              saved_count: 0,
              has_started: true,
              next_stage: "shared_account_posts",
            },
            {
              platform: "tiktok",
              account_handle: "bravotv",
              stage: "shared_account_posts",
              jobs_total: 1,
              jobs_completed: 0,
              jobs_failed: 0,
              jobs_active: 1,
              jobs_running: 1,
              jobs_waiting: 0,
              scraped_count: 42,
              saved_count: 18,
              has_started: true,
            },
          ],
          recent_log: [
            {
              id: "log-1",
              timestamp: "2026-03-22T10:35:01.000Z",
              platform: "tiktok",
              account_handle: "bravotv",
              stage: "shared_account_posts",
              status: "running",
              line: "Importing TikTok posts",
            },
          ],
          worker_runtime: {
            runner_strategy: "single_runner_fallback",
            partition_strategy: "cursor_breakpoints",
            runner_count: 1,
          },
          summary: {
            total_jobs: 2,
            completed_jobs: 1,
            failed_jobs: 0,
            active_jobs: 1,
            items_found_total: 42,
          },
        });
      }
      if (url.includes("/catalog/posts")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      if (url.includes("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="tiktok" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByText("Fetching catalog posts")).toBeInTheDocument();
    });
    expect(screen.getAllByText("Catalog Fetch").length).toBeGreaterThan(0);
    expect(screen.queryByText("Shard Workers")).not.toBeInTheDocument();
    expect(screen.getAllByText(/42 checked · 18 saved/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Next Catalog Fetch/)).toBeInTheDocument();
  });

  it("shows an explicit stale-dispatch failure message instead of leaving the page in a fake active state", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: [
            {
              run_id: "run-stale-fail-1",
              status: "queued",
              created_at: "2026-03-22T09:45:33.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-stale-fail-1/progress")) {
        return jsonResponse({
          run_id: "run-stale-fail-1",
          run_status: "failed",
          source_scope: "bravo",
          stages: {
            shared_account_discovery: {
              jobs_total: 1,
              jobs_completed: 0,
              jobs_failed: 1,
              jobs_active: 0,
              jobs_running: 0,
              jobs_waiting: 0,
              scraped_count: 0,
              saved_count: 0,
            },
          },
          per_handle: [],
          recent_log: [],
          dispatch_health: {
            queued_unclaimed_jobs: 0,
            retrying_dispatch_jobs: 0,
            stale_dispatch_failed_jobs: 1,
            max_stale_dispatch_retries: 3,
          },
          summary: {
            total_jobs: 1,
            completed_jobs: 0,
            failed_jobs: 1,
            active_jobs: 0,
            items_found_total: 0,
          },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getAllByText(/Cancel this run before retrying/i).length).toBeGreaterThan(0);
    });
    expect(screen.queryByRole("button", { name: "Cancel Run" })).not.toBeInTheDocument();
  });

  it("keeps cancel success visible when the follow-up summary refresh times out", async () => {
    const cancelCalls: string[] = [];
    let summaryCalls = 0;

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        summaryCalls += 1;
        if (summaryCalls === 1) {
          return jsonResponse({
            ...baseSummary,
            catalog_recent_runs: [
              {
                run_id: "cancelok1-run",
                status: "running",
                created_at: "2026-03-22T07:45:33.000Z",
              },
            ],
          });
        }
        return jsonResponse({ error: "TRR-Backend request timed out." }, 504);
      }
      if (url.includes("/catalog/runs/cancelok1-run/progress")) {
        return jsonResponse({
          run_id: "cancelok1-run",
          run_status: "running",
          source_scope: "bravo",
          stages: {},
          per_handle: [],
          recent_log: [],
          summary: {
            total_jobs: 1,
            completed_jobs: 0,
            failed_jobs: 0,
            active_jobs: 1,
            items_found_total: 10,
          },
        });
      }
      if (url.includes("/catalog/posts")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      if (url.includes("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      if (url.includes("/cancel")) {
        expect(init?.method).toBe("POST");
        cancelCalls.push(url);
        return jsonResponse({ ok: true });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Cancel Run" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel Run" }));

    await waitFor(() => {
      expect(screen.getByText("Cancelled run cancelok.")).toBeInTheDocument();
    });
    expect(cancelCalls).toEqual([expect.stringContaining("/catalog/runs/cancelok1-run/cancel")]);
    expect(screen.queryByRole("button", { name: "Cancel Run" })).not.toBeInTheDocument();
    expect(screen.queryByText("TRR-Backend request timed out.")).not.toBeInTheDocument();
  });

  it("reconciles a cancel attempt when the first cancel request fails but the run is already cancelled upstream", async () => {
    const cancelCalls: string[] = [];
    let progressCalls = 0;

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: [
            {
              run_id: "cancel-race-1",
              status: "running",
              created_at: "2026-03-22T10:05:20.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/cancel-race-1/progress")) {
        progressCalls += 1;
        return jsonResponse({
          run_id: "cancel-race-1",
          run_status: progressCalls === 1 ? "running" : "cancelled",
          source_scope: "bravo",
          completed_at: progressCalls === 1 ? null : "2026-03-22T10:14:53.000Z",
          stages: {
            shared_account_discovery: {
              jobs_total: 1,
              jobs_completed: 1,
              jobs_failed: 0,
              jobs_active: 0,
              jobs_running: 0,
              jobs_waiting: 0,
              scraped_count: 33,
              saved_count: 33,
            },
          },
          per_handle: [],
          recent_log: [],
          summary: {
            total_jobs: 2,
            completed_jobs: progressCalls === 1 ? 1 : 2,
            failed_jobs: 0,
            active_jobs: progressCalls === 1 ? 1 : 0,
            items_found_total: 33,
          },
        });
      }
      if (url.includes("/catalog/posts")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      if (url.includes("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      if (url.includes("/cancel")) {
        expect(init?.method).toBe("POST");
        cancelCalls.push(url);
        return jsonResponse(
          { error: "Could not reach TRR-Backend. Confirm TRR-Backend is running and TRR_API_URL is correct." },
          502,
        );
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="tiktok" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Cancel Run" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel Run" }));

    await waitFor(() => {
      expect(screen.getByText("Cancelled run cancel-r.")).toBeInTheDocument();
    });
    expect(cancelCalls).toEqual([expect.stringContaining("/catalog/runs/cancel-race-1/cancel")]);
    expect(progressCalls).toBeGreaterThan(1);
    expect(screen.queryByRole("button", { name: "Cancel Run" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Backfill Posts" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Sync Recent" })).toBeEnabled();
  });

  it("cancels a queued run and unlocks catalog actions immediately", async () => {
    const cancelCalls: string[] = [];
    let cancelled = false;

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: cancelled
            ? []
            : [
                {
                  run_id: "queued-run-1",
                  status: "queued",
                  created_at: "2026-03-22T09:45:33.000Z",
                },
              ],
        });
      }
      if (url.includes("/catalog/runs/queued-run-1/progress")) {
        return jsonResponse({
          run_id: "queued-run-1",
          run_status: "queued",
          source_scope: "bravo",
          stages: {
            shared_account_discovery: {
              jobs_total: 1,
              jobs_completed: 0,
              jobs_failed: 0,
              jobs_active: 1,
              jobs_running: 0,
              jobs_waiting: 1,
              scraped_count: 0,
              saved_count: 0,
            },
          },
          per_handle: [],
          recent_log: [],
          dispatch_health: {
            queued_unclaimed_jobs: 1,
            retrying_dispatch_jobs: 0,
            stale_dispatch_failed_jobs: 0,
            latest_dispatch_requested_at: "2026-03-22T09:45:33.000Z",
            max_stale_dispatch_retries: 3,
          },
          summary: {
            total_jobs: 1,
            completed_jobs: 0,
            failed_jobs: 0,
            active_jobs: 1,
            items_found_total: 0,
          },
        });
      }
      if (url.includes("/catalog/posts")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      if (url.includes("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      if (url.includes("/cancel")) {
        expect(init?.method).toBe("POST");
        cancelled = true;
        cancelCalls.push(url);
        return jsonResponse({ ok: true });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="tiktok" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Cancel Run" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel Run" }));

    await waitFor(() => {
      expect(screen.getByText("Cancelled run queued-r.")).toBeInTheDocument();
    });
    expect(cancelCalls).toEqual([expect.stringContaining("/catalog/runs/queued-run-1/cancel")]);
    expect(screen.queryByRole("button", { name: "Cancel Run" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Backfill Posts" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Sync Recent" })).toBeEnabled();
  });

  it("shows restart backfill after a terminal catalog run", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: [
            {
              run_id: "run-failed-1",
              status: "failed",
              created_at: "2026-03-18T11:00:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-failed-1/progress")) {
        return jsonResponse({
          run_id: "run-failed-1",
          run_status: "failed",
          source_scope: "bravo",
          stages: {},
          per_handle: [],
          recent_log: [],
          summary: {
            total_jobs: 1,
            completed_jobs: 0,
            failed_jobs: 1,
            active_jobs: 0,
            items_found_total: 0,
          },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Backfill Posts" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Restart Backfill" })).not.toBeInTheDocument();
    expect(screen.getByText("No active catalog run. Ready to start the next backfill.")).toBeInTheDocument();
  });

  it("prefers live catalog-backed summary cards while a frontier run is active", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          total_posts: 16475,
          total_engagement: 1200,
          total_views: 5000,
          last_post_at: "2026-03-17T14:00:00.000Z",
          catalog_total_posts: 4088,
          live_catalog_total_posts: 16474,
          live_catalog_total_engagement: 8359747,
          live_catalog_total_views: 110072264,
          live_catalog_last_post_at: "2026-02-22T21:30:00.000Z",
          catalog_recent_runs: [
            {
              run_id: "run-live-1",
              status: "running",
              created_at: "2026-03-20T15:14:42.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-live-1/progress")) {
        return jsonResponse({
          run_id: "run-live-1",
          run_status: "running",
          source_scope: "bravo",
          stages: {
            shared_account_discovery: {
              jobs_total: 1,
              jobs_completed: 1,
              jobs_failed: 0,
              jobs_active: 0,
              jobs_running: 0,
              jobs_waiting: 0,
              scraped_count: 33,
              saved_count: 33,
            },
            shared_account_posts: {
              jobs_total: 1,
              jobs_completed: 1,
              jobs_failed: 0,
              jobs_active: 0,
              jobs_running: 0,
              jobs_waiting: 0,
              scraped_count: 16474,
              saved_count: 16474,
            },
            post_classify: {
              jobs_total: 500,
              jobs_completed: 71,
              jobs_failed: 71,
              jobs_active: 2,
              jobs_running: 2,
              jobs_waiting: 427,
              scraped_count: 198,
              saved_count: 0,
            },
          },
          per_handle: [],
          recent_log: [],
          frontier: {
            strategy: "newest_first_frontier",
            pages_scanned: 500,
            posts_checked: 16474,
            posts_saved: 16474,
            transport: "authenticated",
          },
          post_progress: {
            completed_posts: 16474,
            matched_posts: 16474,
            total_posts: 16475,
          },
          scrape_complete: true,
          classify_incomplete: true,
          summary: {
            total_jobs: 502,
            completed_jobs: 72,
            failed_jobs: 71,
            active_jobs: 2,
            items_found_total: 16474,
          },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByText("8,359,747")).toBeInTheDocument();
    });
    expect(screen.getByText("110,072,264")).toBeInTheDocument();
    expect(screen.getAllByText("16,474").length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(
        screen.getByText(
          "Catalog fetch is complete. Saved catalog totals and hashtags are live while post classification finishes in the background.",
        ),
      ).toBeInTheDocument();
    });
  });

  it(
    "refreshes the live catalog summary while an active run is still running",
    async () => {
      let summaryCalls = 0;

      mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/summary")) {
          summaryCalls += 1;
          return jsonResponse({
            ...baseSummary,
            total_posts: 16475,
            catalog_total_posts: 4088,
            live_catalog_total_posts: summaryCalls === 1 ? 1001 : 1234,
            live_catalog_total_engagement: 2000,
            live_catalog_total_views: 3000,
            live_catalog_last_post_at: "2026-03-20T16:00:00.000Z",
            catalog_recent_runs: [
              {
                run_id: "run-refresh-1",
                status: "running",
                created_at: "2026-03-20T15:14:42.000Z",
              },
            ],
          });
        }
        if (url.includes("/catalog/runs/run-refresh-1/progress")) {
          return jsonResponse({
            run_id: "run-refresh-1",
            run_status: "running",
            source_scope: "bravo",
            stages: {
              shared_account_discovery: {
                jobs_total: 1,
                jobs_completed: 1,
                jobs_failed: 0,
                jobs_active: 0,
                jobs_running: 0,
                jobs_waiting: 0,
                scraped_count: 33,
                saved_count: 33,
              },
              shared_account_posts: {
                jobs_total: 1,
                jobs_completed: 0,
                jobs_failed: 0,
                jobs_active: 1,
                jobs_running: 1,
                jobs_waiting: 0,
                scraped_count: 1001,
                saved_count: 1001,
              },
            },
            per_handle: [],
            recent_log: [],
            frontier: {
              strategy: "newest_first_frontier",
              pages_scanned: 31,
              posts_checked: 1001,
              posts_saved: 1001,
              transport: "public",
            },
            post_progress: {
              completed_posts: 1001,
              matched_posts: 1001,
              total_posts: 16475,
            },
            summary: {
              total_jobs: 2,
              completed_jobs: 1,
              failed_jobs: 0,
              active_jobs: 1,
              items_found_total: 1001,
            },
          });
        }
        throw new Error(`Unhandled request: ${url}`);
      });

      render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="stats" />);

      await waitFor(() => {
        expect(screen.getAllByText("1,001").length).toBeGreaterThan(0);
      });

      await waitFor(
        () => {
          expect(screen.getAllByText("1,234").length).toBeGreaterThan(0);
        },
        { timeout: 7_000 },
      );
    },
    12_000,
  );

  it(
    "keeps the last good summary visible when a live refresh times out during an active run",
    async () => {
      let summaryCalls = 0;

      mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/summary")) {
          summaryCalls += 1;
          if (summaryCalls === 1) {
            return jsonResponse({
              ...baseSummary,
              catalog_recent_runs: [
                {
                  run_id: "run-timeout-1",
                  status: "running",
                  created_at: "2026-03-20T15:14:42.000Z",
                },
              ],
            });
          }
          return jsonResponse({ error: "TRR-Backend request timed out." }, 504);
        }
        if (url.includes("/catalog/runs/run-timeout-1/progress")) {
          return jsonResponse({
            run_id: "run-timeout-1",
            run_status: "running",
            source_scope: "bravo",
            stages: {},
            per_handle: [],
            recent_log: [],
            summary: {
              total_jobs: 2,
              completed_jobs: 0,
              failed_jobs: 0,
              active_jobs: 2,
              items_found_total: 24,
            },
          });
        }
        throw new Error(`Unhandled request: ${url}`);
      });

      render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="stats" />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Distribution" })).toBeInTheDocument();
      });

      await waitFor(
        () => {
          expect(summaryCalls).toBeGreaterThan(1);
        },
        { timeout: 7_000 },
      );
      expect(screen.getByRole("heading", { name: "Distribution" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel Run" })).toBeInTheDocument();
    },
    12_000,
  );

  it("clears stale summary content when switching to a different handle", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        if (url.includes("/bravotv/summary")) {
          return jsonResponse(baseSummary);
        }
        if (url.includes("/bravowwhl/summary")) {
          return jsonResponse({ error: "TRR-Backend request timed out." }, 504);
        }
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    const { rerender } = render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Distribution" })).toBeInTheDocument();
    });
    expect(screen.getByText("The Real Housewives of Salt Lake City")).toBeInTheDocument();

    rerender(<SocialAccountProfilePage platform="instagram" handle="bravowwhl" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByText("TRR-Backend request timed out.")).toBeInTheDocument();
    });
    expect(screen.queryByRole("heading", { name: "Distribution" })).not.toBeInTheDocument();
    expect(screen.queryByText("The Real Housewives of Salt Lake City")).not.toBeInTheDocument();
  });

  it("treats scrape-complete classify backlog as completed for actions and status copy", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          total_posts: 16475,
          live_catalog_total_posts: 16474,
          catalog_recent_runs: [
            {
              run_id: "run-scrape-complete-1",
              status: "running",
              created_at: "2026-03-20T15:14:42.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-scrape-complete-1/progress")) {
        return jsonResponse({
          run_id: "run-scrape-complete-1",
          run_status: "completed",
          source_scope: "bravo",
          stages: {
            shared_account_discovery: {
              jobs_total: 1,
              jobs_completed: 1,
              jobs_failed: 0,
              jobs_active: 0,
              jobs_running: 0,
              jobs_waiting: 0,
              scraped_count: 33,
              saved_count: 33,
            },
            shared_account_posts: {
              jobs_total: 1,
              jobs_completed: 1,
              jobs_failed: 0,
              jobs_active: 0,
              jobs_running: 0,
              jobs_waiting: 0,
              scraped_count: 16474,
              saved_count: 16474,
            },
            post_classify: {
              jobs_total: 500,
              jobs_completed: 80,
              jobs_failed: 80,
              jobs_active: 2,
              jobs_running: 2,
              jobs_waiting: 418,
              scraped_count: 201,
              saved_count: 0,
            },
          },
          per_handle: [],
          recent_log: [],
          frontier: {
            strategy: "newest_first_frontier",
            pages_scanned: 500,
            posts_checked: 16474,
            posts_saved: 16474,
            transport: "authenticated",
          },
          post_progress: {
            completed_posts: 16474,
            matched_posts: 16474,
            total_posts: 16475,
          },
          scrape_complete: true,
          classify_incomplete: true,
          summary: {
            total_jobs: 502,
            completed_jobs: 82,
            failed_jobs: 80,
            active_jobs: 2,
            items_found_total: 16474,
          },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="stats" />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Run run-scra is scrape-complete. New backfills are unlocked while classification continues in the background.",
        ),
      ).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "Cancel Run" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Backfill Posts" })).toBeEnabled();
    expect(screen.getByText("Background")).toBeInTheDocument();
  });

  it("falls back to catalog posts preview when summary catalog totals are zero", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_total_posts: 0,
          live_catalog_total_posts: 0,
          catalog_last_post_at: null,
          live_catalog_last_post_at: null,
          catalog_recent_runs: [
            {
              run_id: "run-preview-fallback-1",
              status: "completed",
              created_at: "2026-03-20T17:14:42.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/posts?page=1&page_size=1&filter=all")) {
        return jsonResponse({
          items: [
            {
              id: "catalog-row-1",
              source_id: "DWG-R4IjjH-",
              platform: "instagram",
              account_handle: "bravotv",
              title: null,
              content: "Captain of the vibe",
              excerpt: "Captain of the vibe",
              url: "https://www.instagram.com/p/DWG-R4IjjH-/",
              profile_url: "https://www.instagram.com/bravotv/",
              posted_at: "2026-03-20T14:06:43.000Z",
              show_id: null,
              show_name: null,
              show_slug: null,
              season_id: null,
              season_number: null,
              hashtags: ["BelowDeck"],
              mentions: [],
              collaborators: [],
              tags: [],
              metrics: {
                likes: 564,
                comments_count: 15,
                views: 0,
                shares: 0,
                retweets: 0,
                replies_count: 0,
                quotes: 0,
                engagement: 579,
              },
              assignment_status: "needs_review",
              assignment_source: null,
              candidate_matches: [],
            },
          ],
          pagination: {
            page: 1,
            page_size: 1,
            total: 16474,
            total_pages: 16474,
          },
        });
      }
      if (url.includes("/catalog/runs/run-preview-fallback-1/progress")) {
        return jsonResponse({
          run_id: "run-preview-fallback-1",
          run_status: "completed",
          source_scope: "bravo",
          stages: {},
          per_handle: [],
          recent_log: [],
          post_progress: {
            completed_posts: 16474,
            matched_posts: 16474,
            total_posts: 16475,
          },
          summary: {
            total_jobs: 2,
            completed_jobs: 2,
            failed_jobs: 0,
            active_jobs: 0,
            items_found_total: 16474,
          },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getAllByText("16,474").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("3/20/2026, 10:06:43 AM")).toBeInTheDocument();
  });

  it("falls back to the account total when inspecting a terminal run with no catalog denominator", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          total_posts: 16453,
          catalog_total_posts: 4049,
          catalog_recent_runs: [
            {
              run_id: "run-discovery-only",
              status: "failed",
              created_at: "2026-03-18T18:04:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-discovery-only/progress")) {
        return jsonResponse({
          run_id: "run-discovery-only",
          run_status: "failed",
          source_scope: "bravo",
          created_at: "2026-03-18T18:04:00.000Z",
          stages: {
            shared_account_discovery: {
              jobs_total: 1,
              jobs_completed: 1,
              jobs_failed: 0,
              jobs_active: 0,
              jobs_running: 0,
              jobs_waiting: 0,
              scraped_count: 0,
              saved_count: 0,
            },
          },
          per_handle: [],
          recent_log: [],
          discovery: {
            status: "completed",
            partition_strategy: "cursor_breakpoints",
            partition_count: 0,
            discovered_count: 0,
            queued_count: 0,
            running_count: 0,
            completed_count: 0,
            failed_count: 0,
            cancelled_count: 0,
          },
          post_progress: {
            completed_posts: 0,
            matched_posts: 0,
            total_posts: null,
          },
          summary: {
            total_jobs: 1,
            completed_jobs: 1,
            failed_jobs: 0,
            active_jobs: 0,
            items_found_total: 0,
          },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "View Details" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "View Details" }));

    await waitFor(() => {
      expect(screen.getByText("0%")).toBeInTheDocument();
      expect(screen.getByText("0 / 16,453 posts checked")).toBeInTheDocument();
    });
  });

  it("uses the newest inspected catalog run from the summary when discovery outranks an older failed posts run", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: [
            {
              run_id: "run-discovery-new",
              status: "failed",
              created_at: "2026-03-18T12:00:00.000Z",
            },
            {
              run_id: "run-posts-old",
              status: "failed",
              created_at: "2026-03-18T08:00:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-discovery-new/progress")) {
        return jsonResponse({
          run_id: "run-discovery-new",
          run_status: "failed",
          source_scope: "bravo",
          created_at: "2026-03-18T12:00:00.000Z",
          stages: {
            shared_account_discovery: {
              jobs_total: 1,
              jobs_completed: 0,
              jobs_failed: 1,
              jobs_active: 0,
              jobs_running: 0,
              jobs_waiting: 0,
              scraped_count: 0,
              saved_count: 0,
            },
          },
          per_handle: [],
          recent_log: [],
          summary: {
            total_jobs: 1,
            completed_jobs: 0,
            failed_jobs: 1,
            active_jobs: 0,
            items_found_total: 0,
          },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "View Details" }).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByRole("button", { name: "View Details" })[0]);

    await waitFor(() => {
      expect(
        mocks.fetchAdminWithAuth.mock.calls.some(([input]) =>
          String(input).includes("/catalog/runs/run-discovery-new/progress"),
        ),
      ).toBe(true);
    });
    expect(
      mocks.fetchAdminWithAuth.mock.calls.some(([input]) =>
        String(input).includes("/catalog/runs/run-posts-old/progress"),
      ),
    ).toBe(false);
  });

  it("dismisses a failed recent run and returns the page to the ready state", async () => {
    let dismissed = false;

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: dismissed
            ? []
            : [
                {
                  run_id: "run-failed-dismiss",
                  status: "failed",
                  created_at: "2026-03-19T22:00:00.000Z",
                },
              ],
        });
      }
      if (url.includes("/catalog/runs/run-failed-dismiss/dismiss")) {
        expect(init?.method).toBe("POST");
        dismissed = true;
        return jsonResponse({
          run_id: "run-failed-dismiss",
          status: "failed",
          dismissed: true,
          dismissed_at: "2026-03-19T23:00:00.000Z",
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    await waitFor(() => {
      expect(screen.getByText("No active catalog run. Ready to start the next backfill.")).toBeInTheDocument();
    });
    expect(screen.getByText("Dismissed run run-fail.")).toBeInTheDocument();
  });

  it("renders Facebook catalog actions with the shared profile UI", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          platform: "facebook",
          account_handle: "bravotv",
          profile_url: "https://www.facebook.com/bravotv",
          avatar_url: "https://images.test/facebook-avatar.jpg",
          display_name: "Bravo TV",
          is_verified: true,
          total_posts: 320,
          catalog_total_posts: 320,
          live_catalog_total_posts: 320,
        });
      }
      if (url.endsWith("/hashtags")) {
        return jsonResponse({ items: [] });
      }
      if (url.endsWith("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="facebook" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Backfill Posts" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Sync Recent" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open public profile" })).toHaveAttribute(
      "href",
      "https://www.facebook.com/bravotv",
    );
  });

  it("renders the catalog tab empty state", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/catalog/posts")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByText("No catalog posts found for this filter.")).toBeInTheDocument();
    });
    expect(screen.getByText("Recent Catalog Runs")).toBeInTheDocument();
  });

  it("lets operators resolve unknown hashtags with an explicit season picker", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          per_show_counts: [],
          per_season_counts: [],
        });
      }
      if (url.endsWith("/hashtags")) {
        return jsonResponse({ items: [] });
      }
      if (url.endsWith("/catalog/review-queue")) {
        return jsonResponse({
          items: [
            {
              id: "review-1",
              platform: "instagram",
              account_handle: "bravotv",
              hashtag: "rhop",
              display_hashtag: "#RHOP",
              review_status: "pending",
              usage_count: 3,
              sample_post_ids: ["post-1"],
              sample_source_ids: ["source-1"],
              suggested_shows: [
                {
                  show_id: "show-rhop",
                  show_name: "The Real Housewives of Potomac",
                  show_slug: "rhop",
                },
              ],
              first_seen_at: "2026-03-10T12:00:00.000Z",
              last_seen_at: "2026-03-17T12:00:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/api/admin/trr-api/shows/show-rhop/seasons")) {
        return jsonResponse({
          seasons: [
            { id: "season-rhop-9", season_number: 9 },
            { id: "season-rhop-8", season_number: 8 },
          ],
        });
      }
      if (url.includes("/catalog/review-queue/review-1/resolve")) {
        expect(init?.method).toBe("POST");
        expect(JSON.parse(String(init?.body))).toEqual({
          resolution_action: "assign_season",
          show_id: "show-rhop",
          season_id: "season-rhop-9",
        });
        return jsonResponse({ ok: true });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="hashtags" />);

    await waitFor(() => {
      expect(screen.getByText("Unknown Hashtags")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Resolution for #RHOP"), {
      target: { value: "assign_season" },
    });

    await waitFor(() => {
      expect(
        mocks.fetchAdminWithAuth.mock.calls.some(([input]) =>
          String(input).includes("/api/admin/trr-api/shows/show-rhop/seasons"),
        ),
      ).toBe(true);
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Season for #RHOP")).toBeEnabled();
    });

    fireEvent.change(screen.getByLabelText("Season for #RHOP"), {
      target: { value: "season-rhop-9" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Resolve" }));

    await waitFor(() => {
      expect(
        mocks.fetchAdminWithAuth.mock.calls.some(([input]) =>
          String(input).includes("/catalog/review-queue/review-1/resolve"),
        ),
      ).toBe(true);
    });
  });
});
