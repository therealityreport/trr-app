import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

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
    }) => `/social/${platform}/${handle}${tab && tab !== "stats" ? `/${tab}` : ""}`,
  };
});

import SocialAccountProfilePage from "@/components/admin/SocialAccountProfilePage";

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const formatLocalDateTime = (value: string): string => new Date(value).toLocaleString();

const baseSummary = {
  platform: "instagram",
  account_handle: "bravotv",
  profile_url: "https://www.instagram.com/bravotv/",
  total_posts: 12,
  total_engagement: 1200,
  total_views: 5000,
  last_post_at: "2026-03-17T14:00:00.000Z",
  catalog_total_posts: 12,
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

const baseSocialBladeResponse = {
  username: "bravotv",
  account_handle: "bravotv",
  platform: "instagram",
  scraped_at: "2026-04-08T12:00:00Z",
  freshness_status: "fresh" as const,
  profile_stats_labels: {
    followers: "Followers",
    following: "Following",
    media_count: "Posts",
    engagement_rate: "Engagement",
    average_likes: "Avg Likes",
    average_comments: "Avg Comments",
    chart_metric_label: "Followers",
  },
  profile_stats: {
    followers: 1000,
    following: 200,
    media_count: 50,
    engagement_rate: "2.1%",
    average_likes: 110,
    average_comments: 12,
  },
  rankings: {
    sb_rank: "10th",
    followers_rank: "20th",
    engagement_rate_rank: "30th",
    grade: "A-",
  },
  daily_channel_metrics_60day: {
    period: "Last 2 Days",
    row_count: 2,
    headers: ["Date", "Followers Total"],
    data: [
      { Date: "2026-04-07", "Followers Total": "990" },
      { Date: "2026-04-08", "Followers Total": "1000" },
    ],
  },
  daily_total_followers_chart: {
    frequency: "daily",
    metric: "total_followers",
    total_data_points: 2,
    date_range: { from: "2026-04-07", to: "2026-04-08" },
    data: [
      { date: "2026-04-07", followers: 990 },
      { date: "2026-04-08", followers: 1000 },
    ],
  },
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

  it("renders the catalog page without a backgroundCatalogRunId initialization error", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/snapshot")) {
        return jsonResponse({
          summary: baseSummary,
          catalog_run_progress: null,
          generated_at: "2026-04-09T03:00:00.000Z",
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    expect(() => {
      render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);
    }).not.toThrow();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Backfill Posts" })).toBeInTheDocument();
    });
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

    expect(screen.queryByRole("button", { name: "Sync Recent" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resume Tail" })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Backfill Posts scans the full catalog and updates saved posts. If a saved older frontier exists, Backfill Posts resumes it automatically before continuing full-history fetches. Run Gap Analysis before using targeted repairs like Sync Newer.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Cataloged / Profile total")).toBeInTheDocument();
    expect(screen.getByText("Pending Review")).toBeInTheDocument();
    expect(screen.queryByText("Catalog Actions Unavailable In V1")).not.toBeInTheDocument();
  });

  it("shows catalog-supported post totals as cataloged over profile total on the stats card", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          platform: "twitter",
          total_posts: 124_619,
          live_total_posts: 124_619,
          catalog_total_posts: 45,
          live_catalog_total_posts: 45,
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="twitter" handle="bravotv" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByText("Cataloged / Profile total")).toBeInTheDocument();
    });

    expect(screen.getByText("45 / 124,619")).toBeInTheDocument();
    expect(screen.queryByText("Catalog Posts")).not.toBeInTheDocument();
    expect(screen.getByText("Pending Review")).toBeInTheDocument();
  });

  it("shows an empty-state banner instead of an error when the account has never been loaded", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({ error: "Social account profile not found." }, 404);
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravodailydish" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Backfill Posts" })).toBeInTheDocument();
    });

    expect(screen.getByText("No saved posts yet for @bravodailydish.")).toBeInTheDocument();
    expect(screen.queryByText("Social account profile not found.")).not.toBeInTheDocument();
  });

  it("shows the SocialBlade tab only for supported platforms", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({ ...baseSummary, platform: url.includes("/facebook/") ? "facebook" : "tiktok" });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    const { rerender } = render(<SocialAccountProfilePage platform="facebook" handle="bravotv" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "SocialBlade" })).toBeInTheDocument();
    });

    rerender(<SocialAccountProfilePage platform="tiktok" handle="bravotv" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.queryByRole("link", { name: "SocialBlade" })).not.toBeInTheDocument();
    });
  });

  it("renders the SocialBlade dashboard and refreshes through the account proxy", async () => {
    let refreshResolver: ((value: Response) => void) | null = null;
    mocks.fetchAdminWithAuth.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return Promise.resolve(jsonResponse(baseSummary));
      }
      if (url.includes("/socialblade/refresh")) {
        return new Promise<Response>((resolve) => {
          refreshResolver = resolve;
        });
      }
      if (url.includes("/socialblade")) {
        return Promise.resolve(jsonResponse(baseSocialBladeResponse));
      }
      throw new Error(`Unhandled request: ${url} (${init?.method ?? "GET"})`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="socialblade" />);

    await waitFor(() => {
      expect(screen.getByText("Followers Growth")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Refreshing..." })).toBeInTheDocument();
    });

    expect(
      mocks.fetchAdminWithAuth.mock.calls.some(([input]) =>
        String(input).includes("/api/admin/trr-api/social/profiles/instagram/bravotv/socialblade/refresh"),
      ),
    ).toBe(true);

    await act(async () => {
      refreshResolver?.(jsonResponse({ ...baseSocialBladeResponse, refresh_status: "refreshed" }));
    });

    await waitFor(() => {
      expect(screen.getByText("SocialBlade data refreshed.")).toBeInTheDocument();
    });
  });

  it("surfaces SocialBlade refresh errors on the account tab", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/socialblade/refresh")) {
        return jsonResponse({ detail: "SocialBlade challenge blocked the refresh" }, 502);
      }
      if (url.includes("/socialblade")) {
        return jsonResponse(baseSocialBladeResponse);
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="socialblade" />);

    await waitFor(() => {
      expect(screen.getByText("Followers Growth")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => {
      expect(screen.getByText(/Refresh failed:/)).toBeInTheDocument();
      expect(screen.getByText(/SocialBlade challenge blocked the refresh/)).toBeInTheDocument();
    });
  });

  it("does not fan out secondary reads while the summary is saturated", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(
          {
            error: "Local TRR-Backend is saturated. Showing last successful data while retrying.",
            code: "BACKEND_SATURATED",
            retryable: true,
            retry_after_seconds: 2,
            upstream_status: 500,
            upstream_detail: {
              code: "DATABASE_SERVICE_UNAVAILABLE",
              reason: "session_pool_capacity",
              message:
                "Database service unavailable: Supabase session-pool capacity is saturated. Reduce local DB concurrency or use the explicit local fallback lane.",
            },
          },
          503,
        );
      }
      throw new Error(`Unexpected request during summary saturation: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="hashtags" />);

    await waitFor(() => {
      expect(screen.getByText(/backend is saturated/i)).toBeInTheDocument();
    });

    expect(
      mocks.fetchAdminWithAuth.mock.calls.some(([input]) => String(input).includes("/catalog/freshness")),
    ).toBe(false);
    expect(
      mocks.fetchAdminWithAuth.mock.calls.some(([input]) => String(input).includes("/catalog/gap-analysis")),
    ).toBe(false);
  });

  it("renders collaborator-backed Instagram posts without requiring a new run", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          account_handle: "bravodailydish",
          total_posts: 1,
          catalog_total_posts: 1,
          live_catalog_total_posts: 1,
          top_collaborators: [
            {
              handle: "bravo",
              usage_count: 1,
              post_count: 1,
              shows: [],
            },
          ],
        });
      }
      if (url.includes("/posts?page=1&page_size=25")) {
        return jsonResponse({
          items: [
            {
              id: "catalog-post-1",
              source_id: "C123",
              platform: "instagram",
              account_handle: "bravodailydish",
              title: "Bravo Daily Dish x Bravo",
              content: "Collaborator post already in the catalog.",
              url: "https://www.instagram.com/p/C123/",
              posted_at: "2026-03-22T12:00:00Z",
              show_name: "The Real Housewives of Beverly Hills",
              season_number: 14,
              match_mode: "collaborator",
              source_surface: "catalog",
              metrics: {
                engagement: 1250,
                views: 9000,
                comments_count: 42,
              },
            },
          ],
          pagination: {
            page: 1,
            page_size: 25,
            total: 1,
            total_pages: 1,
          },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravodailydish" activeTab="posts" />);

    await waitFor(() => {
      expect(screen.getByText("Bravo Daily Dish x Bravo")).toBeInTheDocument();
    });

    expect(screen.getByText("Collaborator match")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open post" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/p/C123/",
    );
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

  it("shows tail-gap guidance and queues backfill posts from the integrity banner", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          total_posts: 12,
          catalog_total_posts: 10,
          catalog_recent_runs: [
            {
              run_id: "run-tail-1",
              status: "completed",
              created_at: "2026-03-20T12:00:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/posts")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      if (url.includes("/catalog/freshness")) {
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravotv",
          eligible: true,
          checked_at: "2026-03-20T12:30:00.000Z",
          stored_total_posts: 10,
          live_total_posts_current: 12,
          delta_posts: 2,
          needs_recent_sync: false,
          has_resumable_frontier: true,
        });
      }
      if (url.includes("/catalog/gap-analysis/run")) {
        expect(init?.method).toBe("POST");
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravotv",
          status: "queued",
          operation_id: "gap-op-tail-1",
          result: null,
          stale: false,
        });
      }
      if (url.includes("/catalog/gap-analysis")) {
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravotv",
          status: "completed",
          operation_id: "gap-op-tail-1",
          stale: false,
          result: {
            platform: "instagram",
            account_handle: "bravotv",
            gap_type: "tail_gap",
            catalog_posts: 10,
            materialized_posts: 12,
            expected_total_posts: 12,
            live_total_posts_current: 12,
            missing_from_catalog_count: 2,
            sample_missing_source_ids: ["old-post-1"],
            has_resumable_frontier: true,
            needs_recent_sync: false,
            recommended_action: "backfill_posts",
            latest_catalog_run_status: "completed",
            active_run_status: null,
          },
        });
      }
      if (url.includes("/catalog/backfill")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(JSON.stringify({ backfill_scope: "full_history" }));
        return jsonResponse({
          run_id: "catalog-run-tail-12345678",
          status: "queued",
          catalog_action: "backfill",
          catalog_action_scope: "full_history",
          backfill_mode: "resume_frontier",
          resumed_from_cursor: true,
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Run Gap Analysis" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Run Gap Analysis" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Backfill Posts Now" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Backfill Posts Now" }));

    await waitFor(() => {
      expect(screen.getByText("Post backfill queued (catalog-).")).toBeInTheDocument();
    });
  });

  it("shows head-gap guidance and queues sync newer from the integrity banner", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          total_posts: 12,
          catalog_total_posts: 10,
          catalog_recent_runs: [
            {
              run_id: "run-head-1",
              status: "completed",
              created_at: "2026-03-20T12:00:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/posts")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      if (url.includes("/catalog/freshness")) {
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravotv",
          eligible: true,
          checked_at: "2026-03-20T12:30:00.000Z",
          stored_total_posts: 10,
          live_total_posts_current: 12,
          delta_posts: 2,
          needs_recent_sync: true,
          has_resumable_frontier: false,
        });
      }
      if (url.includes("/catalog/gap-analysis/run")) {
        expect(init?.method).toBe("POST");
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravotv",
          status: "queued",
          operation_id: "gap-op-head-1",
          result: null,
          stale: false,
        });
      }
      if (url.includes("/catalog/gap-analysis")) {
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravotv",
          status: "completed",
          operation_id: "gap-op-head-1",
          stale: false,
          result: {
            platform: "instagram",
            account_handle: "bravotv",
            gap_type: "head_gap",
            catalog_posts: 10,
            materialized_posts: 12,
            expected_total_posts: 12,
            live_total_posts_current: 12,
            missing_from_catalog_count: 2,
            sample_missing_source_ids: ["new-post-1"],
            has_resumable_frontier: false,
            needs_recent_sync: true,
            recommended_action: "sync_newer",
            latest_catalog_run_status: "completed",
            active_run_status: null,
          },
        });
      }
      if (url.includes("/catalog/sync-newer")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(JSON.stringify({ source_scope: "bravo" }));
        return jsonResponse({
          run_id: "catalog-run-head-12345678",
          status: "queued",
          catalog_action: "sync_newer",
          catalog_action_scope: "head_gap",
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Run Gap Analysis" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Run Gap Analysis" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sync Newer Now" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Sync Newer Now" }));

    await waitFor(() => {
      expect(screen.getByText("Sync newer posts queued (catalog-).")).toBeInTheDocument();
    });
  });

  it("shows interior-gap guidance and queues a bounded repair window", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          total_posts: 12,
          catalog_total_posts: 10,
          catalog_recent_runs: [
            {
              run_id: "run-interior-1",
              status: "completed",
              created_at: "2026-03-20T12:00:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/posts")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      if (url.includes("/catalog/freshness")) {
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravotv",
          eligible: true,
          checked_at: "2026-03-20T12:30:00.000Z",
          stored_total_posts: 10,
          live_total_posts_current: 12,
          delta_posts: 2,
          needs_recent_sync: false,
          has_resumable_frontier: false,
        });
      }
      if (url.includes("/catalog/gap-analysis/run")) {
        expect(init?.method).toBe("POST");
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravotv",
          status: "queued",
          operation_id: "gap-op-window-1",
          result: null,
          stale: false,
        });
      }
      if (url.includes("/catalog/gap-analysis")) {
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravotv",
          status: "completed",
          operation_id: "gap-op-window-1",
          stale: false,
          result: {
            platform: "instagram",
            account_handle: "bravotv",
            gap_type: "interior_gaps",
            catalog_posts: 10,
            materialized_posts: 12,
            expected_total_posts: 12,
            live_total_posts_current: 12,
            missing_from_catalog_count: 2,
            missing_oldest_post_at: "2026-03-01T12:00:00Z",
            missing_newest_post_at: "2026-03-02T12:00:00Z",
            sample_missing_source_ids: ["mid-post-1", "mid-post-2"],
            has_resumable_frontier: false,
            needs_recent_sync: false,
            recommended_action: "bounded_window_backfill",
            repair_window_start: "2026-03-01T12:00:00Z",
            repair_window_end: "2026-03-02T12:00:00Z",
            latest_catalog_run_status: "completed",
            active_run_status: null,
          },
        });
      }
      if (url.includes("/catalog/backfill")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(
          JSON.stringify({
            backfill_scope: "bounded_window",
            date_start: "2026-03-01T12:00:00Z",
            date_end: "2026-03-02T12:00:00Z",
          }),
        );
        return jsonResponse({ run_id: "catalog-run-window-12345678", status: "queued" });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Run Gap Analysis" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Run Gap Analysis" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Repair Missing Window" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Repair Missing Window" }));

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

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="hashtags" />);

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
          live_total_posts: 12562,
          total_posts: 417,
          catalog_total_posts: 417,
          live_catalog_total_posts: 417,
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
    expect(screen.getByText("417 / 12,562")).toBeInTheDocument();

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

  it(
    "backs off catalog progress polling when the backend is saturated",
    async () => {
      let summaryCalls = 0;
      let progressCalls = 0;

      mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/summary")) {
          summaryCalls += 1;
          return jsonResponse({
            ...baseSummary,
            catalog_recent_runs: [
              {
                run_id: "run-saturated-1",
                status: "running",
                created_at: "2026-03-20T15:14:42.000Z",
              },
            ],
          });
        }
        if (url.includes("/catalog/runs/run-saturated-1/progress")) {
          progressCalls += 1;
          return jsonResponse(
            {
              error: "Local TRR-Backend is saturated. Showing last successful data while retrying.",
              code: "BACKEND_SATURATED",
              retryable: true,
              retry_after_seconds: 2,
              upstream_status: 500,
              upstream_detail: {
                code: "DATABASE_SERVICE_UNAVAILABLE",
                reason: "session_pool_capacity",
                message:
                  "Database service unavailable: Supabase session-pool capacity is saturated. Reduce local DB concurrency or use the explicit local fallback lane.",
              },
            },
            503,
          );
        }
        throw new Error(`Unhandled request: ${url}`);
      });

      render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="stats" />);

      await waitFor(() => {
        expect(progressCalls).toBe(1);
      });
      expect(summaryCalls).toBe(1);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1_900));
      });
      expect(progressCalls).toBe(1);

      await waitFor(
        () => {
          expect(progressCalls).toBe(2);
        },
        { timeout: 1_500 },
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 3_900));
      });
      expect(progressCalls).toBe(2);

      await waitFor(
        () => {
          expect(progressCalls).toBe(3);
        },
        { timeout: 1_500 },
      );
      expect(summaryCalls).toBe(1);
    },
    12_000,
  );

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

    expect(screen.queryByRole("button", { name: "Sync Recent" })).not.toBeInTheDocument();
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
    expect(screen.queryByRole("button", { name: "Sync Recent" })).not.toBeInTheDocument();
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

  it("shows background classification instead of a queued rerun when fetch is already complete", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          platform: "instagram",
          account_handle: "bravotv",
          profile_url: "https://www.instagram.com/bravotv/",
          catalog_recent_runs: [
            {
              run_id: "run-classify-1",
              status: "queued",
              created_at: "2026-04-02T23:18:10.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-classify-1/progress")) {
        return jsonResponse({
          run_id: "run-classify-1",
          run_status: "queued",
          source_scope: "bravo",
          created_at: "2026-04-02T23:18:10.000Z",
          scrape_complete: true,
          classify_incomplete: true,
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
              jobs_failed: 1,
              jobs_active: 0,
              jobs_running: 0,
              jobs_waiting: 0,
              scraped_count: 66,
              saved_count: 66,
            },
            post_classify: {
              jobs_total: 2,
              jobs_completed: 0,
              jobs_failed: 0,
              jobs_active: 2,
              jobs_running: 0,
              jobs_waiting: 2,
              scraped_count: 0,
              saved_count: 0,
            },
          },
          post_progress: {
            completed_posts: 66,
            matched_posts: 66,
            total_posts: 16619,
          },
          worker_runtime: {
            runner_strategy: "newest_first_frontier",
            partition_strategy: "newest_first_frontier",
            frontier_strategy: "newest_first_frontier",
            runner_count: 1,
            scheduler_lanes: ["A"],
            active_workers_now: 0,
            worker_ids_sample: [],
          },
          frontier: {
            status: "retrying",
            pages_scanned: 2,
            posts_checked: 66,
            posts_saved: 66,
            expected_total_posts: 16619,
            transport: "public",
            retry_count: 2,
            exhausted: false,
          },
          discovery: {
            partition_count: 1,
            completed_count: 1,
            running_count: 0,
            queued_count: 0,
          },
          per_handle: [],
          recent_log: [],
          dispatch_health: {
            queued_unclaimed_jobs: 0,
            modal_pending_jobs: 2,
            modal_running_unclaimed_jobs: 0,
            retrying_dispatch_jobs: 0,
            stale_dispatch_failed_jobs: 0,
            latest_dispatch_requested_at: "2026-04-02T23:28:35.000Z",
            remote_invocation_checked_at: "2026-04-02T23:46:22.000Z",
            max_stale_dispatch_retries: 3,
          },
          summary: {
            total_jobs: 4,
            completed_jobs: 1,
            failed_jobs: 1,
            active_jobs: 2,
            items_found_total: 99,
          },
        });
      }
      if (url.includes("/catalog/posts")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 66, total_pages: 3 },
        });
      }
      if (url.includes("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByText("Classifying posts")).toBeInTheDocument();
    });
    expect(screen.getByText("Classifying")).toBeInTheDocument();
    expect(screen.getByText(/Run run-clas · Classifying/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/2 classify jobs from this run are already dispatched to Modal and waiting for capacity/i)
        .length,
    ).toBeGreaterThan(0);
  expect(screen.queryByText(/Run run-clas · Queued/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Run run-clas is Queued/i)).not.toBeInTheDocument();
});

it("shows recovering catalog state details when the backend is waiting on a recovery handoff", async () => {
  mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/summary")) {
      return jsonResponse({
        ...baseSummary,
        catalog_recent_runs: [
          {
            run_id: "run-recov-1",
            status: "queued",
            created_at: "2026-04-07T09:48:03.000Z",
          },
        ],
      });
    }
    if (url.includes("/catalog/runs/run-recov-1/progress")) {
      return jsonResponse({
        run_id: "run-recov-1",
        run_status: "queued",
        run_state: "recovering",
        source_scope: "bravo",
        created_at: "2026-04-07T09:48:03.000Z",
        stages: {
          shared_account_discovery: {
            jobs_total: 2,
            jobs_completed: 1,
            jobs_failed: 0,
            jobs_active: 1,
            jobs_running: 0,
            jobs_waiting: 1,
            scraped_count: 120,
            saved_count: 0,
          },
        },
        per_handle: [
          {
            platform: "instagram",
            account_handle: "bravotv",
            stage: "shared_account_discovery",
            jobs_total: 2,
            jobs_completed: 1,
            jobs_failed: 0,
            jobs_active: 1,
            jobs_running: 0,
            jobs_waiting: 1,
            scraped_count: 120,
            saved_count: 0,
            has_started: true,
            next_stage: "shared_account_posts",
          },
        ],
        recent_log: [],
        recovery: {
          status: "queued",
          reason: "initial_empty_page",
          stage: "shared_account_discovery",
          job_id: "job-recovery-1",
          recovery_depth: 1,
          waited_seconds: 95,
          attempt_count: 1,
          next_stage: "shared_account_posts",
          transport: "authenticated",
          execution_backend: "modal",
        },
        alerts: [
          {
            code: "instagram_modal_empty_page",
            severity: "error",
            message: "Instagram returned no posts on the first page from a Modal worker.",
          },
        ],
        summary: {
          total_jobs: 2,
          completed_jobs: 1,
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
    expect(screen.getByText("Recovering")).toBeInTheDocument();
  });
  expect(screen.getByText("Instagram blocked first-page fetch")).toBeInTheDocument();
  expect(screen.getByText("Recovery")).toBeInTheDocument();
  expect(screen.getByText(/reason: initial empty page/i)).toBeInTheDocument();
  expect(screen.getByText(/transport: authenticated/i)).toBeInTheDocument();
  expect(screen.getByText(/attempt 1/i)).toBeInTheDocument();
  expect(screen.getByText(/next: catalog fetch/i)).toBeInTheDocument();
});

it("prefers terminal cancelled status labels over stale recovering state", async () => {
  mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/summary")) {
      return jsonResponse({
        ...baseSummary,
        catalog_recent_runs: [
          {
            run_id: "run-cancelled-1",
            status: "cancelled",
            created_at: "2026-04-07T09:48:03.000Z",
          },
        ],
      });
    }
    if (url.includes("/catalog/runs/run-cancelled-1/progress")) {
      return jsonResponse({
        run_id: "run-cancelled-1",
        run_status: "cancelled",
        run_state: "recovering",
        source_scope: "bravo",
        created_at: "2026-04-07T09:48:03.000Z",
        stages: {
          shared_account_discovery: {
            jobs_total: 2,
            jobs_completed: 1,
            jobs_failed: 0,
            jobs_active: 1,
            jobs_running: 0,
            jobs_waiting: 1,
            scraped_count: 120,
            saved_count: 0,
          },
        },
        per_handle: [],
        recent_log: [],
        recovery: {
          status: "queued",
          reason: "no_partitions_discovered",
          stage: "shared_account_discovery",
          job_id: "job-recovery-1",
          recovery_depth: 1,
        },
        summary: {
          total_jobs: 2,
          completed_jobs: 1,
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
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });
  expect(screen.getByText(/Run run-canc · Cancelled/i)).toBeInTheDocument();
  expect(screen.queryByText(/^Recovering$/)).not.toBeInTheDocument();
  expect(screen.getByText("Run cancelled")).toBeInTheDocument();
});

  it("renders catalog operational alerts from the backend progress payload", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: [{ run_id: "run-alerts-1", status: "running", created_at: "2026-04-02T23:18:10.000Z" }],
        });
      }
      if (url.includes("/catalog/runs/run-alerts-1/progress")) {
        return jsonResponse({
          run_id: "run-alerts-1",
          run_status: "running",
          run_state: "classifying",
          source_scope: "bravo",
          scrape_complete: true,
          classify_incomplete: true,
          alerts: [
            {
              code: "runtime_version_drift",
              severity: "warning",
              message: "This run was observed on more than one worker runtime version.",
            },
            {
              code: "classify_backlog_after_scrape",
              severity: "warning",
              message: "Scrape finished, but classification still has queued backlog.",
            },
          ],
          stages: {
            post_classify: {
              jobs_total: 2,
              jobs_completed: 0,
              jobs_failed: 0,
              jobs_active: 2,
              jobs_running: 0,
              jobs_waiting: 2,
              scraped_count: 0,
              saved_count: 0,
            },
          },
          per_handle: [],
          recent_log: [],
          dispatch_health: {
            queued_unclaimed_jobs: 0,
            modal_pending_jobs: 0,
            modal_running_unclaimed_jobs: 0,
            retrying_dispatch_jobs: 0,
            stale_dispatch_failed_jobs: 0,
          },
          summary: {
            total_jobs: 2,
            completed_jobs: 0,
            failed_jobs: 0,
            active_jobs: 2,
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
      expect(screen.getByText("Runtime Version Drift")).toBeInTheDocument();
    });
    expect(screen.getByText("This run was observed on more than one worker runtime version.")).toBeInTheDocument();
    expect(screen.getByText("Classify Backlog After Scrape")).toBeInTheDocument();
    expect(screen.getByText("Scrape finished, but classification still has queued backlog.")).toBeInTheDocument();
  });

  it("uses shared-profile network metadata in the header and source status", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          network_name: "Bravo",
          source_status: [
            {
              id: "shared-source-1",
              source_scope: "bravo",
              network_name: "Bravo",
              profile_kind: "network_streaming",
              assignment_mode: "multi_show_match",
              metadata: {},
              last_scrape_status: "completed",
              last_scrape_at: "2026-04-02T23:18:10.000Z",
            },
          ],
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Instagram · Bravo · @bravotv" })).toBeInTheDocument();
    });
    expect(screen.getByText("Source Status")).toBeInTheDocument();
    expect(screen.getAllByText("Bravo").length).toBeGreaterThan(0);
    expect(screen.getByText(/network streaming · multi show match · bravo/i)).toBeInTheDocument();
  });

  it("shows a dispatch-blocked banner with the configured Modal target when dispatch resolution fails", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          account_handle: "bravodailydish",
          catalog_recent_runs: [
            {
              run_id: "run-modal-blocked-1",
              status: "queued",
              created_at: "2026-03-26T01:13:50.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-modal-blocked-1/progress")) {
        return jsonResponse({
          run_id: "run-modal-blocked-1",
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
            dispatch_blocked_jobs: 1,
            modal_pending_jobs: 0,
            modal_running_unclaimed_jobs: 0,
            retrying_dispatch_jobs: 0,
            stale_dispatch_failed_jobs: 0,
            latest_dispatch_requested_at: "2026-03-26T01:13:50.000Z",
            latest_dispatch_backend: "modal",
            latest_dispatch_error_code: "modal_dispatch_failed",
            latest_dispatch_error:
              "Lookup failed for Function 'run_social_job' from the 'trr-backend-jobs' app: App 'trr-backend-jobs' not found in environment 'main'.",
            latest_remote_blocked_reason: "modal_app_not_found",
            configured_app_name: "trr-backend-jobs",
            configured_function_name: "run_social_job",
            modal_environment: "main",
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

    render(<SocialAccountProfilePage platform="instagram" handle="bravodailydish" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByText("Modal dispatch blocked")).toBeInTheDocument();
    });
    expect(screen.getAllByText(/blocked before claim/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/trr-backend-jobs\.run_social_job in env main/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("Waiting for Modal worker")).not.toBeInTheDocument();
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

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="hashtags" />);

    await waitFor(() => {
      expect(screen.getByText("8,359,747")).toBeInTheDocument();
    });
    expect(screen.getByText("110,072,264")).toBeInTheDocument();
    expect(screen.getByText("16,474 / 16,475")).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByText(
          "Catalog fetch is complete. Saved catalog totals and hashtags are live while post classification finishes in the background.",
        ),
      ).toBeInTheDocument();
    });
  });

  it(
    "does not re-poll the heavy summary while an active run is still running",
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
        expect(screen.getByText("1,001 / 16,475")).toBeInTheDocument();
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5_500));
      });
      expect(summaryCalls).toBe(1);
      expect(screen.queryByText("1,234")).not.toBeInTheDocument();
    },
    12_000,
  );

  it(
    "keeps the last good summary visible without retrying timed-out summaries during an active run",
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

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5_500));
      });
      expect(summaryCalls).toBe(1);
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

  it("loads authoritative all-time hashtags on the Instagram stats tab from the hashtags endpoint", async () => {
    let resolveHashtagsResponse: ((value: Response) => void) | null = null;

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          top_hashtags: [
            {
              hashtag: "summaryonly",
              display_hashtag: "#summaryonly",
              usage_count: 44,
              first_seen_at: "2026-02-23T23:00:26.000Z",
              latest_seen_at: "2026-03-20T14:00:29.000Z",
            },
          ],
        });
      }
      if (url.includes("/hashtags")) {
        return await new Promise<Response>((resolve) => {
          resolveHashtagsResponse = resolve;
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByText("Loading hashtags…")).toBeInTheDocument();
    });

    await act(async () => {
      resolveHashtagsResponse?.(
        jsonResponse({
          items: [
            {
              hashtag: "alltime",
              display_hashtag: "#alltime",
              usage_count: 88,
              first_seen_at: "2026-01-01T12:00:00.000Z",
              latest_seen_at: "2026-03-20T14:00:29.000Z",
            },
          ],
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("#alltime")).toBeInTheDocument();
    });
    expect(screen.queryByText("#summaryonly")).not.toBeInTheDocument();
    expect(
      mocks.fetchAdminWithAuth.mock.calls.some(([input]) =>
        String(input) === "/api/admin/trr-api/social/profiles/instagram/bravotv/hashtags",
      ),
    ).toBe(true);
  });

  it("updates stats-tab hashtags when operators change the window selector", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          top_hashtags: [
            {
              hashtag: "summaryonly",
              display_hashtag: "#summaryonly",
              usage_count: 44,
              first_seen_at: "2026-02-23T23:00:26.000Z",
              latest_seen_at: "2026-03-20T14:00:29.000Z",
            },
          ],
        });
      }
      if (url.includes("/hashtags?window=30d")) {
        return jsonResponse({
          items: [
            {
              hashtag: "monthonly",
              display_hashtag: "#monthonly",
              usage_count: 12,
              first_seen_at: "2026-03-01T12:00:00.000Z",
              latest_seen_at: "2026-03-20T14:00:29.000Z",
            },
          ],
        });
      }
      if (url.includes("/hashtags?window=7d")) {
        return jsonResponse({
          items: [
            {
              hashtag: "weekonly",
              display_hashtag: "#weekonly",
              usage_count: 5,
              first_seen_at: "2026-03-27T12:00:00.000Z",
              latest_seen_at: "2026-04-02T14:00:29.000Z",
            },
          ],
        });
      }
      if (url.includes("/hashtags")) {
        return jsonResponse({
          items: [
            {
              hashtag: "alltime",
              display_hashtag: "#alltime",
              usage_count: 88,
              first_seen_at: "2026-01-01T12:00:00.000Z",
              latest_seen_at: "2026-03-20T14:00:29.000Z",
            },
          ],
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByText("#alltime")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole("combobox", { name: "Window" }), {
      target: { value: "30d" },
    });

    await waitFor(() => {
      expect(screen.getByText("#monthonly")).toBeInTheDocument();
    });
    expect(screen.queryByText("#summaryonly")).not.toBeInTheDocument();
    expect(
      mocks.fetchAdminWithAuth.mock.calls.some(([input]) =>
        String(input).includes("/api/admin/trr-api/social/profiles/instagram/bravotv/hashtags?window=30d"),
      ),
    ).toBe(true);

    fireEvent.change(screen.getByRole("combobox", { name: "Window" }), {
      target: { value: "7d" },
    });

    await waitFor(() => {
      expect(screen.getByText("#weekonly")).toBeInTheDocument();
    });
    expect(
      mocks.fetchAdminWithAuth.mock.calls.some(([input]) =>
        String(input).includes("/api/admin/trr-api/social/profiles/instagram/bravotv/hashtags?window=7d"),
      ),
    ).toBe(true);
  });

  it("shows stats-tab hashtag request errors instead of falling back to the summary preview", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          top_hashtags: [
            {
              hashtag: "summaryonly",
              display_hashtag: "#summaryonly",
              usage_count: 44,
              first_seen_at: "2026-02-23T23:00:26.000Z",
              latest_seen_at: "2026-03-20T14:00:29.000Z",
            },
          ],
        });
      }
      if (url.includes("/hashtags")) {
        return jsonResponse(
          {
            error: "Local TRR-Backend is saturated. Showing last successful data while retrying.",
            code: "BACKEND_SATURATED",
            retryable: true,
            upstream_status: 503,
            upstream_detail_code: "DATABASE_SERVICE_UNAVAILABLE",
          },
          503,
        );
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByText("Hashtag data is retryable while the backend is busy.")).toBeInTheDocument();
    });
    expect(screen.queryByText("#summaryonly")).not.toBeInTheDocument();
  });

  it("preserves cached all-time hashtags when a later retry for that window is retryably saturated", async () => {
    let allTimeRequestCount = 0;

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/hashtags?window=30d")) {
        return jsonResponse({
          items: [
            {
              hashtag: "monthonly",
              display_hashtag: "#monthonly",
              usage_count: 12,
              first_seen_at: "2026-03-01T12:00:00.000Z",
              latest_seen_at: "2026-03-20T14:00:29.000Z",
            },
          ],
        });
      }
      if (url.includes("/hashtags/timeline")) {
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravotv",
          years: [],
          series: [],
          top_rank_limit: 10,
          off_chart_rank: 11,
        });
      }
      if (url.includes("/hashtags")) {
        allTimeRequestCount += 1;
        if (allTimeRequestCount === 1) {
          return jsonResponse({
            items: [
              {
                hashtag: "alltime",
                display_hashtag: "#alltime",
                usage_count: 88,
                first_seen_at: "2026-01-01T12:00:00.000Z",
                latest_seen_at: "2026-03-20T14:00:29.000Z",
              },
            ],
          });
        }
        return jsonResponse(
          {
            error: "Local TRR-Backend is saturated. Showing last successful data while retrying.",
            code: "BACKEND_SATURATED",
            retryable: true,
            upstream_status: 503,
            upstream_detail_code: "DATABASE_SERVICE_UNAVAILABLE",
            upstream_detail: {
              code: "DATABASE_SERVICE_UNAVAILABLE",
              reason: "session_pool_capacity",
              message:
                "Database service unavailable: Supabase session-pool capacity is saturated. Reduce local DB concurrency or use the explicit local fallback lane.",
            },
          },
          503,
        );
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="hashtags" />);

    await waitFor(() => {
      expect(screen.getByText("#alltime")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole("combobox", { name: "Window" }), {
      target: { value: "30d" },
    });

    await waitFor(() => {
      expect(screen.getByText("#monthonly")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole("combobox", { name: "Window" }), {
      target: { value: "all" },
    });

    await waitFor(() => {
      expect(screen.getByText("Hashtag data is retryable while the backend is busy.")).toBeInTheDocument();
    });
    expect(screen.getByText("#alltime")).toBeInTheDocument();
    expect(screen.queryByText("No hashtags found yet.")).not.toBeInTheDocument();
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
          total_posts: 16475,
          live_total_posts: 16475,
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
      expect(screen.getByText("16,474 / 16,475")).toBeInTheDocument();
    });
    expect(screen.getByText(formatLocalDateTime("2026-03-20T14:06:43.000Z"))).toBeInTheDocument();
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

  it("treats completed sync-newer runs as bounded progress instead of full-history coverage", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          platform: "tiktok",
          total_posts: 10200,
          live_total_posts: 10200,
          catalog_recent_runs: [
            {
              run_id: "run-sync-newer-1",
              status: "completed",
              created_at: "2026-04-07T20:36:47.000Z",
              catalog_action: "sync_newer",
              catalog_action_scope: "head_gap",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-sync-newer-1/progress")) {
        return jsonResponse({
          run_id: "run-sync-newer-1",
          run_status: "completed",
          catalog_action: "sync_newer",
          catalog_action_scope: "head_gap",
          source_scope: "bravo",
          created_at: "2026-04-07T20:36:47.000Z",
          stages: {
            shared_account_posts: {
              jobs_total: 1,
              jobs_completed: 1,
              jobs_failed: 0,
              jobs_active: 0,
              jobs_running: 0,
              jobs_waiting: 0,
              scraped_count: 17,
              saved_count: 16,
            },
          },
          per_handle: [],
          recent_log: [],
          post_progress: {
            completed_posts: 17,
            matched_posts: 16,
            total_posts: 10200,
          },
          summary: {
            total_jobs: 1,
            completed_jobs: 1,
            failed_jobs: 0,
            active_jobs: 0,
            items_found_total: 17,
          },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="tiktok" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "View Details" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "View Details" }));

    await waitFor(() => {
      expect(screen.getByText("100%")).toBeInTheDocument();
      expect(screen.getByText("17 posts checked")).toBeInTheDocument();
      expect(screen.getByText("16 matched")).toBeInTheDocument();
    });

    expect(screen.queryByText("17 / 10,200 posts checked")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/History discovery finished, but this run only checked 17 of 10,200 posts/i),
    ).not.toBeInTheDocument();
  });

  it("shows at least 1% for full-history runs that checked some posts", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          total_posts: 10200,
          live_total_posts: 10200,
          catalog_recent_runs: [
            {
              run_id: "run-full-history-low-progress-1",
              status: "completed",
              created_at: "2026-04-07T20:36:47.000Z",
              catalog_action: "backfill",
              catalog_action_scope: "full_history",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-full-history-low-progress-1/progress")) {
        return jsonResponse({
          run_id: "run-full-history-low-progress-1",
          run_status: "completed",
          catalog_action: "backfill",
          catalog_action_scope: "full_history",
          source_scope: "bravo",
          created_at: "2026-04-07T20:36:47.000Z",
          discovery: {
            status: "completed",
            partition_strategy: "cursor_breakpoints",
            partition_count: 1,
            discovered_count: 1,
            queued_count: 0,
            running_count: 0,
            completed_count: 1,
            failed_count: 0,
            cancelled_count: 0,
          },
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
              jobs_completed: 1,
              jobs_failed: 0,
              jobs_active: 0,
              jobs_running: 0,
              jobs_waiting: 0,
              scraped_count: 17,
              saved_count: 16,
            },
          },
          per_handle: [],
          recent_log: [],
          post_progress: {
            completed_posts: 17,
            matched_posts: 16,
            total_posts: 10200,
          },
          summary: {
            total_jobs: 2,
            completed_jobs: 2,
            failed_jobs: 0,
            active_jobs: 0,
            items_found_total: 17,
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
      expect(screen.getByText("1%")).toBeInTheDocument();
      expect(screen.getByText("17 / 10,200 posts checked")).toBeInTheDocument();
      expect(screen.getByText("16 matched")).toBeInTheDocument();
    });
  });

  it("does not treat classify-only items_found_total as posts checked for a failed discovery run", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          total_posts: 16668,
          live_total_posts: 16668,
          catalog_recent_runs: [
            {
              run_id: "run-discovery-classify-mismatch",
              status: "failed",
              created_at: "2026-04-07T13:36:41.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-discovery-classify-mismatch/progress")) {
        return jsonResponse({
          run_id: "run-discovery-classify-mismatch",
          run_status: "failed",
          source_scope: "bravo",
          created_at: "2026-04-07T13:36:41.000Z",
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
            post_classify: {
              jobs_total: 1,
              jobs_completed: 1,
              jobs_failed: 0,
              jobs_active: 0,
              jobs_running: 0,
              jobs_waiting: 0,
              scraped_count: 86,
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
            completed_count: 1,
            failed_count: 0,
            cancelled_count: 0,
          },
          post_progress: {
            completed_posts: 0,
            matched_posts: 0,
            total_posts: 16668,
          },
          summary: {
            total_jobs: 2,
            completed_jobs: 2,
            failed_jobs: 0,
            active_jobs: 0,
            items_found_total: 86,
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
      expect(screen.getByText("0 / 16,668 posts checked")).toBeInTheDocument();
      expect(screen.getByText("0 matched")).toBeInTheDocument();
    });
  });

  it("renders blocked-auth repair controls and starts the repair flow", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          total_posts: 16668,
          live_total_posts: 16668,
          catalog_recent_runs: [
            {
              run_id: "run-blocked-auth-1",
              status: "failed",
              created_at: "2026-04-07T13:36:41.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-blocked-auth-1/progress")) {
        return jsonResponse({
          run_id: "run-blocked-auth-1",
          run_status: "failed",
          run_state: "failed",
          operational_state: "blocked_auth",
          repair_action: "repair_instagram_auth",
          repair_status: "idle",
          repairable_reason: "discovery_empty_first_page",
          resume_stage: "discovery",
          auto_resume_pending: false,
          repair_environment: {
            supported: true,
            repair_command: "python scripts/modal/repair_instagram_auth.py --json",
          },
          source_scope: "bravo",
          created_at: "2026-04-07T13:36:41.000Z",
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
          post_progress: {
            completed_posts: 0,
            matched_posts: 0,
            total_posts: 16668,
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
      if (url.includes("/catalog/runs/run-blocked-auth-1/repair-auth")) {
        expect(init?.method).toBe("POST");
        return jsonResponse({
          run_id: "run-blocked-auth-1",
          repair_status: "running",
          operational_state: "blocked_auth",
          resume_stage: "discovery",
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
      expect(screen.getByRole("button", { name: "Repair Instagram Auth" })).toBeInTheDocument();
      expect(
        screen.getByText(/local headed chrome window will open for confirmation/i),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Repair Instagram Auth" }));

    await waitFor(() => {
      expect(screen.getByText(/repairing auth/i)).toBeInTheDocument();
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

  it("dismisses a progress-derived failed run and clears the catalog progress panel", async () => {
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
                  run_id: "run-derived-failed",
                  status: "running",
                  created_at: "2026-04-08T17:08:30.000Z",
                },
              ],
        });
      }
      if (url.includes("/snapshot")) {
        return jsonResponse({
          summary: {
            ...baseSummary,
            catalog_recent_runs: dismissed
              ? []
              : [
                  {
                    run_id: "run-derived-failed",
                    status: "running",
                    created_at: "2026-04-08T17:08:30.000Z",
                  },
                ],
          },
          catalog_run_progress: dismissed
            ? null
            : {
                run_id: "run-derived-failed",
                run_status: "failed",
                run_state: "failed",
                source_scope: "bravo",
                created_at: "2026-04-08T17:08:30.000Z",
                started_at: "2026-04-08T17:08:40.000Z",
                completed_at: null,
                stages: {},
                per_handle: [],
                recent_log: [],
                worker_runtime: {},
                post_progress: {
                  completed_posts: 3729,
                  matched_posts: 3729,
                  total_posts: 5501,
                },
                summary: {
                  total_jobs: 5,
                  completed_jobs: 3,
                  failed_jobs: 1,
                  active_jobs: 0,
                  items_found_total: 3729,
                },
                repairable_reason: "checkpoint_required",
                alerts: [],
              },
          generated_at: "2026-04-09T03:00:00.000Z",
        });
      }
      if (url.includes("/catalog/runs/run-derived-failed/progress")) {
        return jsonResponse({
          run_id: "run-derived-failed",
          run_status: "failed",
          run_state: "failed",
          source_scope: "bravo",
          created_at: "2026-04-08T17:08:30.000Z",
          started_at: "2026-04-08T17:08:40.000Z",
          completed_at: null,
          stages: {},
          per_handle: [],
          recent_log: [],
          worker_runtime: {},
          post_progress: {
            completed_posts: 3729,
            matched_posts: 3729,
            total_posts: 5501,
          },
          summary: {
            total_jobs: 5,
            completed_jobs: 3,
            failed_jobs: 1,
            active_jobs: 0,
            items_found_total: 3729,
          },
          repairable_reason: "checkpoint_required",
          alerts: [],
        });
      }
      if (url.includes("/catalog/runs/run-derived-failed/dismiss")) {
        expect(init?.method).toBe("POST");
        dismissed = true;
        return jsonResponse({
          run_id: "run-derived-failed",
          status: "failed",
          dismissed: true,
          dismissed_at: "2026-04-08T17:53:00.000Z",
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByText("Run failed")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    await waitFor(() => {
      expect(screen.getByText("No active catalog run. Ready to start the next backfill.")).toBeInTheDocument();
    });
    expect(screen.getByText("Dismissed run run-deri.")).toBeInTheDocument();
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

  it("automatically probes instagram catalog freshness after a completed backfill", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: [
            {
              run_id: "run-freshness-1",
              status: "completed",
              created_at: "2026-03-20T12:00:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/hashtags/timeline")) {
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravotv",
          years: [],
          series: [],
          top_rank_limit: 10,
          off_chart_rank: 11,
        });
      }
      if (url.includes("/hashtags")) {
        return jsonResponse({
          items: [],
        });
      }
      if (url.includes("/catalog/freshness")) {
        expect(init?.method).toBe("POST");
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravotv",
          eligible: true,
          live_total_posts_current: 14,
          stored_total_posts: 12,
          delta_posts: 2,
          needs_recent_sync: true,
          checked_at: "2026-03-20T12:30:00.000Z",
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByText("Catalog totals trail the live profile by 2 posts. Stored 12 posts; live profile shows 14.")).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "Catalog Diagnostics" })).toBeInTheDocument();
  });

  it("keeps gap analysis deferred on the stats tab until operators request it", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          total_posts: 20,
          live_total_posts: 20,
          catalog_total_posts: 12,
          live_catalog_total_posts: 12,
          catalog_recent_runs: [
            {
              run_id: "run-gap-deferred-1",
              status: "completed",
              created_at: "2026-03-20T12:00:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/freshness")) {
        expect(init?.method).toBe("POST");
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravotv",
          eligible: true,
          live_total_posts_current: 20,
          stored_total_posts: 12,
          delta_posts: 8,
          needs_recent_sync: true,
          checked_at: "2026-03-20T12:30:00.000Z",
        });
      }
      if (url.includes("/catalog/gap-analysis")) {
        throw new Error(`Gap analysis should stay deferred on first stats mount: ${url}`);
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Catalog Diagnostics" })).toBeInTheDocument();
    });
    expect(screen.getByText("Gap analysis is deferred until you request it.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run Gap Analysis" })).toBeInTheDocument();
    expect(
      mocks.fetchAdminWithAuth.mock.calls.some(([input]) => String(input).includes("/catalog/gap-analysis")),
    ).toBe(false);
  });

  it("offers a full backfill when gap analysis finds only unclassified total drift", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          total_posts: 20,
          live_total_posts: 20,
          catalog_total_posts: 12,
          live_catalog_total_posts: 12,
          catalog_recent_runs: [
            {
              run_id: "run-gap-drift-1",
              status: "completed",
              created_at: "2026-03-20T12:00:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/freshness")) {
        expect(init?.method).toBe("POST");
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravotv",
          eligible: true,
          live_total_posts_current: 20,
          stored_total_posts: 12,
          delta_posts: 8,
          needs_recent_sync: true,
          checked_at: "2026-03-20T12:30:00.000Z",
        });
      }
      if (url.includes("/catalog/gap-analysis/run")) {
        expect(init?.method).toBe("POST");
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravotv",
          status: "queued",
          operation_id: "gap-op-drift-1",
          result: null,
          stale: false,
        });
      }
      if (url.includes("/catalog/gap-analysis")) {
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravotv",
          status: "completed",
          operation_id: "gap-op-drift-1",
          stale: false,
          result: {
            platform: "instagram",
            account_handle: "bravotv",
            gap_type: "source_total_drift",
            catalog_posts: 12,
            materialized_posts: 20,
            expected_total_posts: 20,
            live_total_posts_current: 20,
            missing_from_catalog_count: 8,
            sample_missing_source_ids: [],
            has_resumable_frontier: false,
            needs_recent_sync: true,
            recommended_action: "backfill_posts",
            latest_catalog_run_status: "completed",
            active_run_status: null,
          },
        });
      }
      if (url.includes("/catalog/backfill")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(JSON.stringify({ backfill_scope: "full_history" }));
        return jsonResponse({
          run_id: "catalog-run-drift-12345678",
          status: "queued",
          catalog_action: "backfill",
          catalog_action_scope: "full_history",
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Run Gap Analysis" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Run Gap Analysis" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Backfill Posts Now" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Backfill Posts Now" }));

    await waitFor(() => {
      expect(screen.getByText("Post backfill queued (catalog-).")).toBeInTheDocument();
    });
  });

  it("runs gap analysis only after an explicit stats-tab trigger", async () => {
    let gapStatusPollCount = 0;

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          total_posts: 20,
          live_total_posts: 20,
          catalog_total_posts: 12,
          live_catalog_total_posts: 12,
          catalog_recent_runs: [
            {
              run_id: "run-gap-manual-1",
              status: "completed",
              created_at: "2026-03-20T12:00:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/freshness")) {
        expect(init?.method).toBe("POST");
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravotv",
          eligible: true,
          live_total_posts_current: 20,
          stored_total_posts: 12,
          delta_posts: 8,
          needs_recent_sync: true,
          checked_at: "2026-03-20T12:30:00.000Z",
        });
      }
      if (url.includes("/catalog/gap-analysis/run")) {
        expect(init?.method).toBe("POST");
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravotv",
          status: "queued",
          operation_id: "gap-op-1",
          result: null,
          stale: false,
        });
      }
      if (url.includes("/catalog/gap-analysis")) {
        gapStatusPollCount += 1;
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravotv",
          status: "completed",
          operation_id: "gap-op-1",
          stale: false,
          result: {
            platform: "instagram",
            account_handle: "bravotv",
            gap_type: "tail_gap",
            catalog_posts: 12,
            materialized_posts: 20,
            expected_total_posts: 20,
            live_total_posts_current: 20,
            missing_from_catalog_count: 8,
            sample_missing_source_ids: ["POST-20", "POST-19"],
            has_resumable_frontier: true,
            needs_recent_sync: false,
            recommended_action: "backfill_posts",
            repair_window_start: null,
            repair_window_end: null,
            catalog_oldest_post_at: "2026-03-01T12:00:00Z",
            catalog_newest_post_at: "2026-03-12T12:00:00Z",
            latest_catalog_run_status: "completed",
            active_run_status: null,
          },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Run Gap Analysis" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Run Gap Analysis" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Backfill Posts Now" })).toBeInTheDocument();
    });
    expect(
      mocks.fetchAdminWithAuth.mock.calls.filter(([input]) => String(input).includes("/catalog/gap-analysis/run")).length,
    ).toBe(1);
    expect(gapStatusPollCount).toBeGreaterThanOrEqual(1);
  });

  it("groups catalog diagnostic failures without rendering duplicate raw backend banners", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          total_posts: 20,
          live_total_posts: 20,
          catalog_total_posts: 12,
          live_catalog_total_posts: 12,
          catalog_recent_runs: [
            {
              run_id: "run-gap-errors-1",
              status: "completed",
              created_at: "2026-03-20T12:00:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/freshness")) {
        expect(init?.method).toBe("POST");
        return jsonResponse(
          {
            error: "Local TRR-Backend is saturated. Showing last successful data while retrying.",
            code: "BACKEND_SATURATED",
            retryable: true,
            retry_after_seconds: 2,
            upstream_status: 503,
          },
          503,
        );
      }
      if (url.includes("/catalog/gap-analysis/run")) {
        expect(init?.method).toBe("POST");
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravotv",
          status: "queued",
          operation_id: "gap-op-errors-1",
          result: null,
          stale: false,
        });
      }
      if (url.includes("/catalog/gap-analysis")) {
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravotv",
          status: "failed",
          operation_id: "gap-op-errors-1",
          result: null,
          stale: false,
          last_error: {
            error: "TRR-Backend request timed out.",
            code: "UPSTREAM_TIMEOUT",
            retryable: true,
            upstream_status: 504,
          },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Run Gap Analysis" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Run Gap Analysis" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Catalog Diagnostics" })).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("Freshness check is retryable while the backend is busy.")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("Gap analysis timed out before completion. Retry when you need repair guidance.")).toBeInTheDocument();
    });
    expect(screen.queryByText("Local TRR-Backend is saturated. Showing last successful data while retrying.")).not.toBeInTheDocument();
    expect(screen.queryByText("TRR-Backend request timed out.")).not.toBeInTheDocument();
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

  it("lets operators resolve unknown hashtags with a show-only assignment", async () => {
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
      if (url.includes("/catalog/review-queue/review-1/resolve")) {
        expect(init?.method).toBe("POST");
        expect(JSON.parse(String(init?.body))).toEqual({
          resolution_action: "assign_show",
          show_id: "show-rhop",
        });
        return jsonResponse({ ok: true });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="hashtags" />);

    await waitFor(() => {
      expect(screen.getByText("Unknown Hashtags")).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        `3 uses · First seen ${formatLocalDateTime("2026-03-10T12:00:00.000Z")} · Last seen ${formatLocalDateTime("2026-03-17T12:00:00.000Z")}`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Show for #RHOP")).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Resolve" }));

    await waitFor(() => {
      expect(
        mocks.fetchAdminWithAuth.mock.calls.some(([input]) =>
          String(input).includes("/catalog/review-queue/review-1/resolve"),
        ),
      ).toBe(true);
    });
    expect(
      mocks.fetchAdminWithAuth.mock.calls.some(([input]) =>
        String(input).includes("/api/admin/trr-api/shows/show-rhop/seasons"),
      ),
    ).toBe(false);
  });
});
