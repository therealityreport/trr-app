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
import { __resetSharedLiveResourceRegistryForTests } from "@/lib/admin/shared-live-resource";
import * as devAdminBypass from "@/lib/admin/dev-admin-bypass";

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const setWindowLocation = (url: string): void => {
  const parsed = new URL(url, window.location.origin);
  window.history.replaceState({}, "", `${parsed.pathname}${parsed.search}${parsed.hash}`);
};

const formatLocalDateTime = (value: string): string => new Date(value).toLocaleString();

const installClipboardMock = () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  return writeText;
};

const baseSummary = {
  summary_detail: "full" as const,
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
  comments_saved_summary: {
    saved_comments: 41,
    retrieved_comments: 429,
    saved_comment_posts: 8,
    retrieved_comment_posts: 12,
    saved_comment_media_files: 7,
  },
  media_coverage: {
    saved_files: 1289,
    total_files: 1400,
    saved_post_media_files: 1200,
    total_post_media_files: 1300,
    saved_comment_media_files: 60,
    total_comment_media_files: 75,
    saved_avatar_files: 55,
    saved_reel_still_files: 29,
    total_reel_still_files: 29,
  },
  comments_coverage: {
    available_posts: 12,
    eligible_posts: 12,
    missing_posts: 3,
    stale_posts: 2,
    last_comments_run_at: "2026-03-17T11:00:00.000Z",
    last_comments_run_status: "completed",
  },
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

const healthyCookieHealth = (platform: string) => ({
  platform,
  required: true,
  healthy: true,
  reason: null,
  refresh_supported: true,
  refresh_available: true,
  refresh_action: platform === "instagram" ? "instagram_auth_repair" : "cookie_refresh",
  refresh_label: platform === "instagram" ? "Repair Instagram Auth" : "Refresh Cookies",
  source_kind: "default_file",
});

const INSTAGRAM_BACKFILL_DEFAULT_TASKS = ["post_details", "comments", "media"] as const;
const TIKTOK_BACKFILL_DEFAULT_TASKS = ["post_details", "comments", "media"] as const;

describe("SocialAccountProfilePage", () => {
  beforeEach(() => {
    // Shared live-resource coordinators are cached on `window`, so tests leak state
    // (pending timers, in-flight polls, cached snapshots) into each other unless the
    // registry is explicitly cleared between cases.
    __resetSharedLiveResourceRegistryForTests();
    mocks.fetchAdminWithAuth.mockReset();
    mocks.useAdminGuard.mockReset();
    mocks.useAdminGuard.mockReturnValue({
      user: { uid: "admin-1" },
      checking: false,
      hasAccess: true,
    });
    setWindowLocation("https://admin.therealityreport.com/social");
  });

  afterEach(() => {
    __resetSharedLiveResourceRegistryForTests();
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

  it("renders comment-row and media-file totals in the top summary tiles", async () => {
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

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="stats" />);

    const commentsTile = await screen.findByText("Comments Saved");
    const commentsCard = commentsTile.closest("div.rounded-2xl");
    expect(commentsCard).not.toBeNull();
    expect(within(commentsCard as HTMLElement).getByText("41")).toBeInTheDocument();
    expect(within(commentsCard as HTMLElement).getByText("41 / 429 comments")).toBeInTheDocument();

    const mediaTile = screen.getByText("Media Saved");
    const mediaCard = mediaTile.closest("div.rounded-2xl");
    expect(mediaCard).not.toBeNull();
    expect(within(mediaCard as HTMLElement).getByText("1,289")).toBeInTheDocument();
    expect(within(mediaCard as HTMLElement).getByText("1,289 / 1,400 files")).toBeInTheDocument();
  });

  it("aliases the legacy posts tab to catalog for catalog-backed platforms", async () => {
    const requestUrls: string[] = [];
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      requestUrls.push(url);
      if (url.includes("/snapshot")) {
        return jsonResponse({
          summary: baseSummary,
          catalog_run_progress: null,
          generated_at: "2026-04-09T03:00:00.000Z",
        });
      }
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
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

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="posts" />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Catalog" })).toBeInTheDocument();
    });

    expect(screen.queryByRole("link", { name: "Posts" })).not.toBeInTheDocument();
    expect(requestUrls.some((url) => url.includes("/catalog/posts"))).toBe(true);
    expect(requestUrls.some((url) => url.includes("/profiles/instagram/bravotv/posts?page="))).toBe(false);
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
        "Backfill Posts opens an Instagram task picker. If catalog posts are missing from social.instagram_posts, the backend backfills post rows first. If they are already materialized, it skips post-detail hydration and runs only the requested media and comments follow-ups.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Saved / Account total")).toBeInTheDocument();
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
      expect(screen.getByText("Saved / Account total")).toBeInTheDocument();
    });

    expect(screen.getByText("45 / 124,619")).toBeInTheDocument();
    expect(screen.queryByText("Catalog Posts")).not.toBeInTheDocument();
    expect(screen.getByText("Pending Review")).toBeInTheDocument();
  });

  it("first paint issues exactly one summary fetch and no snapshot fetch", async () => {
    const summarySpy = vi.fn().mockResolvedValue(
      jsonResponse({
        ...baseSummary,
        summary_detail: "lite" as const,
        comments_coverage: null,
        per_show_counts: [],
        per_season_counts: [],
        top_hashtags: [],
        top_collaborators: [],
        top_tags: [],
      }),
    );
    const snapshotSpy = vi.fn();
    const requestUrls: string[] = [];

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      requestUrls.push(url);
      if (url.includes("/summary?detail=lite")) {
        return await summarySpy();
      }
      if (url.includes("/snapshot")) {
        return await snapshotSpy();
      }
      if (url.includes("/cookies/health")) {
        return jsonResponse(healthyCookieHealth("instagram"));
      }
      if (url.includes("/live-profile-total")) {
        return jsonResponse({
          platform: "instagram",
          account_handle: "thetraitorsus",
          profile_url: "https://www.instagram.com/thetraitorsus/",
          live_total_posts_current: 12,
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="thetraitorsus" activeTab="stats" />);

    await waitFor(() => {
      expect(summarySpy).toHaveBeenCalledTimes(1);
    });

    expect(snapshotSpy).not.toHaveBeenCalled();
    expect(requestUrls.filter((url) => url.includes("/summary?detail=lite"))).toHaveLength(1);
    expect(requestUrls.some((url) => url.includes("/snapshot"))).toBe(false);
  });

  it("keeps the stats tab on lite summary until full insights are requested", async () => {
    const liteSummary = {
      ...baseSummary,
      summary_detail: "lite" as const,
      comments_coverage: null,
      per_show_counts: [],
      per_season_counts: [],
      top_hashtags: [],
      top_collaborators: [],
      top_tags: [],
    };
    const requestUrls: string[] = [];

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      requestUrls.push(url);
      if (url.includes("/summary?detail=lite")) {
        return jsonResponse(liteSummary);
      }
      if (url.includes("/summary?detail=full")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/hashtags")) {
        return jsonResponse({ items: [] });
      }
      if (url.includes("/cookies/health")) {
        return jsonResponse(healthyCookieHealth("instagram"));
      }
      if (url.includes("/live-profile-total")) {
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravotv",
          profile_url: "https://www.instagram.com/bravotv/",
          live_total_posts_current: 12,
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Load Full Profile Insights" })).toBeInTheDocument();
    });
    expect(requestUrls.some((url) => url.includes("/summary?detail=full"))).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Load Full Profile Insights" }));

    await waitFor(() => {
      expect(screen.getByText("The Real Housewives of Salt Lake City")).toBeInTheDocument();
    });
    expect(requestUrls.some((url) => url.includes("/summary?detail=full"))).toBe(true);
  });

  it("does not auto-upgrade the comments tab into a full-summary fetch", async () => {
    const liteSummary = {
      ...baseSummary,
      summary_detail: "lite" as const,
      comments_coverage: null,
      per_show_counts: [],
      per_season_counts: [],
      top_hashtags: [],
      top_collaborators: [],
      top_tags: [],
    };
    let fullSummaryCalls = 0;

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary?detail=lite")) {
        return jsonResponse(liteSummary);
      }
      if (url.includes("/summary?detail=full")) {
        fullSummaryCalls += 1;
        return jsonResponse({ error: "TRR-Backend request timed out." }, 504);
      }
      if (url.includes("/cookies/health")) {
        return jsonResponse(healthyCookieHealth("instagram"));
      }
      if (url.includes("/live-profile-total")) {
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravotv",
          profile_url: "https://www.instagram.com/bravotv/",
          live_total_posts_current: 12,
        });
      }
      if (url.includes("/posts?page=1&page_size=25&comments_only=true")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="comments" />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Comments" })).toBeInTheDocument();
    });
    expect(fullSummaryCalls).toBe(0);
    expect(screen.getByText("Loading comments coverage…")).toBeInTheDocument();
    expect(screen.queryByText("TRR-Backend request timed out.")).not.toBeInTheDocument();
  });

  it("hydrates the account total from the live Instagram profile after the page loads", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/cookies/health")) {
        return jsonResponse(healthyCookieHealth("instagram"));
      }
      if (url.includes("/live-profile-total")) {
        return jsonResponse({
          platform: "instagram",
          account_handle: "thetraitorsus",
          profile_url: "https://www.instagram.com/thetraitorsus/",
          live_total_posts_current: 321,
        });
      }
      if (url.includes("/summary")) {
        return jsonResponse({ error: "Social account profile not found." }, 404);
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="thetraitorsus" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByText("Posts", { selector: "p" }).parentElement?.textContent?.replace(/\s+/g, " ").trim()).toContain(
        "0 / 321",
      );
    });
    expect(screen.getByText("No saved posts yet for @thetraitorsus.")).toBeInTheDocument();
  });

  it("shows an empty-state banner instead of an error when the account has never been loaded", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/cookies/health")) {
        return jsonResponse(healthyCookieHealth("instagram"));
      }
      if (url.includes("/summary")) {
        return jsonResponse({ error: "Social account profile not found." }, 404);
      }
      if (url.includes("/live-profile-total")) {
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravodailydish",
          profile_url: "https://www.instagram.com/bravodailydish/",
          live_total_posts_current: 5517,
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravodailydish" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Backfill Posts" })).toBeInTheDocument();
    });

    expect(screen.getByText("No saved posts yet for @bravodailydish.")).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByText("Posts", { selector: "p" }).parentElement?.textContent?.replace(/\s+/g, " ").trim(),
      ).toContain("0 / 5,517");
    });
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

  it("shows the Comments tab only for platforms with saved discussion support", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        if (url.includes("/facebook/")) {
          return jsonResponse({ ...baseSummary, platform: "facebook" });
        }
        if (url.includes("/tiktok/")) {
          return jsonResponse({ ...baseSummary, platform: "tiktok" });
        }
        return jsonResponse(baseSummary);
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    const { rerender } = render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Comments" })).toBeInTheDocument();
    });

    rerender(<SocialAccountProfilePage platform="tiktok" handle="bravotv" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Comments" })).toBeInTheDocument();
    });

    rerender(<SocialAccountProfilePage platform="facebook" handle="bravotv" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.queryByRole("link", { name: "Comments" })).not.toBeInTheDocument();
    });
  });

  it("queues a profile comments scrape from the comments tab", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/posts?page=1&page_size=25&comments_only=true")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      if (url.includes("/comments/scrape")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(
          JSON.stringify({
            mode: "profile",
            source_scope: "bravo",
            refresh_policy: "all_saved_posts",
          }),
        );
        return jsonResponse({ run_id: "comments-run-12345678", status: "queued" });
      }
      if (url.includes("/comments/runs/comments-run-12345678/progress")) {
        return jsonResponse({
          run_id: "comments-run-12345678",
          platform: "instagram",
          account_handle: "bravotv",
          run_status: "completed",
          job_status: "completed",
          target_source_ids: ["C123"],
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="comments" />);

    expect(await screen.findByText("Available Posts")).toBeInTheDocument();
    expect(screen.getByText("Commentable now: 12")).toBeInTheDocument();

    const button = await screen.findByRole("button", { name: "Sync Comments" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(
        mocks.fetchAdminWithAuth.mock.calls.some(([input]) =>
          String(input).includes("/api/admin/trr-api/social/profiles/instagram/bravotv/comments/scrape"),
        ),
      ).toBe(true);
    });
  });

  it("hides catalog progress chrome on the comments tab", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/posts?page=1&page_size=25&comments_only=true")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="comments" />);

    expect(await screen.findByText("Instagram Comments")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Catalog Run Progress" })).not.toBeInTheDocument();
  });

  it("reattaches the comments tab to an already-active comments sync", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          comments_coverage: {
            ...baseSummary.comments_coverage,
            active_run_id: "comments-run-active-1234",
            effective_status: "running",
          },
        });
      }
      if (url.includes("/posts?page=1&page_size=25&comments_only=true")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      if (url.includes("/comments/runs/comments-run-active-1234/progress")) {
        return jsonResponse({
          run_id: "comments-run-active-1234",
          platform: "instagram",
          account_handle: "bravotv",
          run_status: "running",
          job_status: "running",
          target_source_ids: ["C123"],
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="comments" />);

    expect(await screen.findByRole("button", { name: "Syncing Comments..." })).toBeDisabled();
    await waitFor(() => {
      expect(
        mocks.fetchAdminWithAuth.mock.calls.some(([input]) =>
          String(input).includes("/comments/runs/comments-run-active-1234/progress"),
        ),
      ).toBe(true);
    });
  });

  it("queues a catalog-driven discussion refresh from the comments tab for TikTok", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({ ...baseSummary, platform: "tiktok" });
      }
      if (url.includes("/posts?page=1&page_size=25&comments_only=true")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      if (url.includes("/catalog/backfill")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(
          JSON.stringify({
            source_scope: "bravo",
            backfill_scope: "full_history",
            selected_tasks: ["post_details", "comments", "media"],
          }),
        );
        return jsonResponse({ run_id: "catalog-run-12345678", catalog_run_id: "catalog-run-12345678", status: "queued" });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="tiktok" handle="bravotv" activeTab="comments" />);

    expect(await screen.findByText("TikTok Discussion")).toBeInTheDocument();

    const button = await screen.findByRole("button", { name: "Refresh Details + Comments + Media" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(
        mocks.fetchAdminWithAuth.mock.calls.some(([input]) =>
          String(input).includes("/api/admin/trr-api/social/profiles/tiktok/bravotv/catalog/backfill"),
        ),
      ).toBe(true);
    });
  });

  it("retries a retryable timeout once before surfacing a comments-posts failure", async () => {
    let postsCalls = 0;

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/posts?page=1&page_size=25&comments_only=true")) {
        postsCalls += 1;
        if (postsCalls === 1) {
          return jsonResponse(
            {
              error: "TRR-Backend request timed out.",
              code: "BACKEND_REQUEST_TIMEOUT",
              retryable: true,
              upstream_status: 504,
              upstream_detail_code: "REQUEST_TIMEOUT",
            },
            504,
          );
        }
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="comments" />);

    expect(await screen.findByText("Instagram Comments")).toBeInTheDocument();
    await waitFor(() => {
      expect(postsCalls).toBe(2);
    });
    expect(screen.queryByText("TRR-Backend request timed out.")).not.toBeInTheDocument();
    expect(
      screen.getByText("No Instagram posts with comments are saved for this account yet."),
    ).toBeInTheDocument();
  });

  it("renders one row per post and opens a post comments modal from the post link", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/posts?page=1&page_size=25&comments_only=true")) {
        return jsonResponse({
          items: [
            {
              id: "post-1",
              source_id: "DVfQnTcjsCA",
              platform: "instagram",
              account_handle: "bravotv",
              content: "Recap caption for the reunion post.",
              url: "https://www.instagram.com/p/DVfQnTcjsCA/",
              posted_at: "2026-04-09T14:30:00.000Z",
              saved_comments: 14,
              metrics: {
                likes: 842,
                comments_count: 27,
              },
            },
          ],
          pagination: { page: 1, page_size: 25, total: 1, total_pages: 1 },
        });
      }
      if (url.includes("/comments?post_source_id=DVfQnTcjsCA&page=1&page_size=25")) {
        return jsonResponse({
          items: [
            {
              id: "comment-1",
              comment_id: "178",
              post_id: "post-1",
              post_source_id: "DVfQnTcjsCA",
              post_url: "https://www.instagram.com/p/DVfQnTcjsCA/",
              username: "andycohen",
              text: "First saved comment",
              likes: 22,
              is_reply: false,
              created_at: "2026-04-09T15:00:00.000Z",
              parent_comment_id: null,
            },
          ],
          pagination: { page: 1, page_size: 25, total: 1, total_pages: 1 },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="comments" />);

    const postLink = await screen.findByRole("link", { name: "DVfQnTcjsCA" });
    expect(postLink).toBeInTheDocument();
    expect(screen.getAllByText("Comments Saved")).toHaveLength(2);
    expect(screen.getByText("842")).toBeInTheDocument();
    expect(screen.getByText(formatLocalDateTime("2026-04-09T14:30:00.000Z"))).toBeInTheDocument();

    fireEvent.click(postLink);

    const dialog = await screen.findByRole("dialog", { name: "Comments for DVfQnTcjsCA" });
    expect(within(dialog).getByText("Recap caption for the reunion post.")).toBeInTheDocument();
    expect(within(dialog).getByText("First saved comment")).toBeInTheDocument();
    expect(within(dialog).getByText("14 saved")).toBeInTheDocument();
  });

  it("sources comments panel `Available Posts` from saved-post inventory, not the commentable subset", async () => {
    // P0-1 regression lock: before the fix, `Available Posts` was wired to
    // `comments_coverage.available_posts` (the smaller commentable subset), so it
    // showed ~1,099 for an account with 16,200 saved posts. The headline figure must
    // match the saved-post total shown by the Posts card (`live_catalog_total_posts`
    // with `catalog_total_posts` fallback). `Commentable now` stays on the smaller
    // `coverage.eligible_posts` value.
    const divergentSummary = {
      ...baseSummary,
      total_posts: 16737,
      live_total_posts: 16737,
      catalog_total_posts: 16200,
      live_catalog_total_posts: 16200,
      comments_coverage: {
        ...baseSummary.comments_coverage,
        available_posts: 1099, // stale backend field — UI must ignore
        eligible_posts: 1099,
      },
    };
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(divergentSummary);
      }
      if (url.includes("/posts?page=1&page_size=25&comments_only=true")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="comments" />);

    expect(await screen.findByText("Available Posts")).toBeInTheDocument();
    // Saved-post total (16,200), NOT coverage.available_posts (1,099).
    expect(screen.getByText("16,200")).toBeInTheDocument();
    // Commentable subset stays on coverage.eligible_posts.
    expect(screen.getByText("Commentable now: 1,099")).toBeInTheDocument();
  });

  it("falls back to catalog_total_posts when live_catalog_total_posts is absent", async () => {
    // P0-1 fallback path: `live_catalog_total_posts` is the preferred source; when the
    // live counter is missing, the component must fall back to `catalog_total_posts`.
    const fallbackSummary = {
      ...baseSummary,
      total_posts: 16737,
      live_total_posts: 16737,
      catalog_total_posts: 16200,
      live_catalog_total_posts: undefined,
      comments_coverage: {
        ...baseSummary.comments_coverage,
        available_posts: 1099,
        eligible_posts: 1099,
      },
    };
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(fallbackSummary);
      }
      if (url.includes("/posts?page=1&page_size=25&comments_only=true")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="comments" />);

    expect(await screen.findByText("Available Posts")).toBeInTheDocument();
    expect(screen.getByText("16,200")).toBeInTheDocument();
    expect(screen.getByText("Commentable now: 1,099")).toBeInTheDocument();
  });

  it("shows needs refresh instead of failed when the latest failed run is historical", async () => {
    const summary = {
      ...baseSummary,
      comments_coverage: {
        ...baseSummary.comments_coverage,
        last_comments_run_status: "failed",
        effective_status: "needs_refresh",
        effective_label: "Needs refresh",
        historical_failure: true,
        last_attempt_status: "failed",
        last_attempt_at: "2026-04-21T23:50:01.000Z",
      },
      comments_saved_summary: {
        ...baseSummary.comments_saved_summary,
        saved_comments: 9912,
        retrieved_comments: 106098,
        saved_comment_posts: 427,
        retrieved_comment_posts: 427,
      },
    };

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(summary);
      }
      if (url.includes("/posts?page=1&page_size=25&comments_only=true")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="thetraitorsus" activeTab="comments" />);

    expect(await screen.findByText("Needs refresh")).toBeInTheDocument();
    expect(screen.getByText(/Last attempt failed at/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Failed$/)).not.toBeInTheDocument();
  });

  it("renders comments rows while preserving the effective needs-refresh status", async () => {
    const summary = {
      ...baseSummary,
      comments_coverage: {
        ...baseSummary.comments_coverage,
        last_comments_run_status: "failed",
        effective_status: "needs_refresh",
        effective_label: "Needs refresh",
        historical_failure: true,
        last_attempt_status: "failed",
        last_attempt_at: "2026-04-21T23:51:18.000Z",
      },
    };

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(summary);
      }
      if (url.includes("/posts?page=1&page_size=25&comments_only=true")) {
        return jsonResponse({
          items: [
            {
              id: "post-1",
              source_id: "ABC123",
              posted_at: "2026-04-20T16:01:54.000Z",
              title: "",
              content: "Reunion night",
              excerpt: "",
              url: "https://www.instagram.com/p/ABC123/",
              metrics: { likes: 120, comments: 14, views: 0 },
              saved_comments: 9,
              match_mode: "owner",
              source_surface: "materialized",
            },
          ],
          pagination: { page: 1, page_size: 25, total: 1, total_pages: 1 },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="comments" />);

    expect(await screen.findByText("Needs refresh")).toBeInTheDocument();
    expect(screen.getByText(/Last attempt failed at/i)).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "ABC123" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/p/ABC123/",
    );
    expect(await screen.findByText("Reunion night")).toBeInTheDocument();
    expect(screen.queryByText(/list index out of range/i)).not.toBeInTheDocument();
  });

  it("shows actionable copy when the comments worker lane is offline", async () => {
    // P2-7: When the backend returns 503 with detail.code=SOCIAL_WORKER_UNAVAILABLE,
    // the admin proxy extracts it as `upstream_detail_code`. The UI must surface
    // a specific message with the launch command, not a generic 503.
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/posts?page=1&page_size=25&comments_only=true")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      if (url.includes("/comments/scrape") && init?.method === "POST") {
        return jsonResponse(
          {
            error: "No healthy instagram_comments_scrapling social ingest workers are reporting heartbeats.",
            code: "UPSTREAM_ERROR",
            upstream_status: 503,
            upstream_detail_code: "SOCIAL_WORKER_UNAVAILABLE",
          },
          503,
        );
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="comments" />);

    const button = await screen.findByRole("button", { name: "Sync Comments" });
    fireEvent.click(button);

    await waitFor(() => {
      // The component's readErrorMessage surfaces the actionable runbook pointer.
      expect(screen.getByText(/No Instagram comments worker is online/i)).toBeInTheDocument();
    });
  });

  it("shows Modal-specific guidance when comments scrape requires Modal dispatch", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/posts?page=1&page_size=25&comments_only=true")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      if (url.includes("/comments/scrape") && init?.method === "POST") {
        return jsonResponse(
          {
            error: "Modal social dispatch is required for Instagram comments scraping.",
            code: "UPSTREAM_ERROR",
            upstream_status: 503,
            upstream_detail_code: "SOCIAL_MODAL_EXECUTOR_REQUIRED",
            upstream_detail: {
              required_execution_backend: "modal",
            },
          },
          503,
        );
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="comments" />);

    const button = await screen.findByRole("button", { name: "Sync Comments" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/configured for Modal-backed execution/i)).toBeInTheDocument();
    });
  });

  it("routes the legacy posts tab to catalog actions for Instagram accounts", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/posts?page=1&page_size=25")) {
        return jsonResponse({
          items: [
            {
              id: "catalog-post-1",
              source_id: "C123",
              platform: "instagram",
              account_handle: "bravotv",
              title: "Bravo post",
              content: "Caption text.",
              url: "https://www.instagram.com/p/C123/",
              posted_at: "2026-03-22T12:00:00Z",
              show_name: "The Real Housewives of Beverly Hills",
              season_number: 14,
              match_mode: "owner",
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

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="posts" />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Catalog" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Backfill Posts" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sync Comments" })).not.toBeInTheDocument();
  });

  it("surfaces comments scrape worker errors on the comments tab", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/posts?page=1&page_size=25&comments_only=true")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      if (url.includes("/comments/scrape")) {
        return jsonResponse({ detail: "Instagram comments worker unavailable" }, 503);
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="comments" />);

    const button = await screen.findByRole("button", { name: "Sync Comments" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Instagram comments worker unavailable")).toBeInTheDocument();
    });
  });

  it("surfaces classified comments read-path errors instead of collapsing to the generic fallback", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/posts?page=1&page_size=25&comments_only=true")) {
        return jsonResponse(
          {
            error: "Database service unavailable: runtime DB configuration is incomplete. Set TRR_DB_URL and optional TRR_DB_FALLBACK_URL.",
            code: "UPSTREAM_ERROR",
            upstream_status: 503,
            upstream_detail_code: "DATABASE_SERVICE_UNAVAILABLE",
          },
          503,
        );
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="comments" />);

    await waitFor(() => {
      expect(
        screen.getByText(/runtime DB configuration is incomplete/i),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Failed to load Instagram comments")).not.toBeInTheDocument();
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

  it("falls back to the live summary when the snapshot times out", async () => {
    let liveSummaryCalls = 0;
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/snapshot")) {
        return jsonResponse(
          {
            error: "TRR-Backend request timed out.",
            code: "BACKEND_REQUEST_TIMEOUT",
            retryable: true,
            upstream_status: 504,
            upstream_detail_code: "REQUEST_TIMEOUT",
          },
          504,
        );
      }
      if (url.includes("/summary")) {
        liveSummaryCalls += 1;
        return jsonResponse({
          ...baseSummary,
          account_handle: "bravodailydish",
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravodailydish" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByText("12 / 12")).toBeInTheDocument();
    });

    expect(liveSummaryCalls).toBe(1);
    expect(screen.queryByText("TRR-Backend request timed out.")).not.toBeInTheDocument();
  });

  it("shows the timeout-specific summary banner when the first-paint lite summary times out", async () => {
    let liveSummaryCalls = 0;

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        liveSummaryCalls += 1;
        return jsonResponse(
          {
            error: "TRR-Backend request timed out.",
            code: "BACKEND_REQUEST_TIMEOUT",
            retryable: true,
            upstream_status: 504,
            upstream_detail_code: "REQUEST_TIMEOUT",
          },
          504,
        );
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravodailydish" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByText("Summary read timed out before completion. Retry in a moment.")).toBeInTheDocument();
    });

    expect(liveSummaryCalls).toBe(1);
    expect(screen.queryByText("12 / 12")).not.toBeInTheDocument();
  });

  it("shows a timeout-specific summary banner when the lite summary fallback also times out", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/snapshot")) {
        return jsonResponse(
          {
            error: "TRR-Backend request timed out.",
            code: "BACKEND_REQUEST_TIMEOUT",
            retryable: true,
            upstream_status: 504,
            upstream_detail_code: "REQUEST_TIMEOUT",
          },
          504,
        );
      }
      if (url.includes("/summary")) {
        return jsonResponse(
          {
            error: "Could not reach TRR-Backend. Confirm TRR-Backend is running and TRR_API_URL is correct.",
            code: "BACKEND_REQUEST_TIMEOUT",
            retryable: true,
            upstream_status: 504,
            upstream_detail_code: "REQUEST_TIMEOUT",
          },
          504,
        );
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravodailydish" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByText("Summary read timed out before completion. Retry in a moment.")).toBeInTheDocument();
    });
    expect(
      screen.queryByText("Could not reach TRR-Backend. Confirm TRR-Backend is running and TRR_API_URL is correct."),
    ).not.toBeInTheDocument();
  });

  it("falls back to the live summary when the snapshot responds without summary data", async () => {
    let liveSummaryCalls = 0;
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/snapshot")) {
        return jsonResponse({
          summary: null,
          catalog_run_progress: null,
          generated_at: "2026-04-21T04:16:03.571Z",
        });
      }
      if (url.includes("/summary")) {
        liveSummaryCalls += 1;
        return jsonResponse({
          ...baseSummary,
          account_handle: "bravodailydish",
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravodailydish" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByText("12 / 12")).toBeInTheDocument();
    });

    expect(liveSummaryCalls).toBe(1);
    expect(screen.queryByText("Loading account summary…")).not.toBeInTheDocument();
  });

  it("does not render fake zero-value hero stats while the first summary request is still pending", async () => {
    let resolveSummary: ((value: Response) => void) | null = null;
    mocks.fetchAdminWithAuth.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/snapshot")) {
        throw new Error(`Unhandled request: ${url}`);
      }
      if (url.includes("/summary")) {
        return new Promise<Response>((resolve) => {
          resolveSummary = resolve;
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravodailydish" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getAllByText("Loading…").length).toBeGreaterThan(0);
    });

    expect(screen.getByText("Loading account summary…")).toBeInTheDocument();
    expect(screen.queryByText("0 / 0")).not.toBeInTheDocument();
    expect(screen.queryByText("Never")).not.toBeInTheDocument();

    await act(async () => {
      resolveSummary?.(
        jsonResponse({
          ...baseSummary,
          account_handle: "bravodailydish",
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("12 / 12")).toBeInTheDocument();
    });
  });

  it("renders collaborator-backed Instagram catalog posts without requiring a new run", async () => {
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

    expect(screen.getByText("Collaborator post already in the catalog.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open post" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/p/C123/",
    );
  });

  it("queues a full-history catalog backfill from the primary CTA", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          source_status: [{ source_scope: "creator" }],
        });
      }
      if (url.includes("/cookies/health")) {
        return jsonResponse({
          platform: "instagram",
          required: true,
          healthy: true,
          reason: null,
          refresh_supported: true,
          refresh_available: true,
          refresh_action: "instagram_auth_repair",
          refresh_label: "Repair Instagram Auth",
          source_kind: "default_file",
        });
      }
      if (url.includes("/catalog/backfill")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(
          JSON.stringify({
            source_scope: "creator",
            backfill_scope: "full_history",
            selected_tasks: [...INSTAGRAM_BACKFILL_DEFAULT_TASKS],
          }),
        );
        return jsonResponse({ run_id: "catalog-run-12345678", status: "queued" });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Backfill Posts" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Backfill Posts" }));

    expect(await screen.findByText("Choose what this backfill should run")).toBeInTheDocument();
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(3);
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Start Backfill" }));

    await waitFor(() => {
      expect(
        screen.getByText("Instagram backfill queued for Post Details, Comments, Media. Catalog catalog-."),
      ).toBeInTheDocument();
    });
  });

  it("shows provisional launch copy once instagram kickoff returns a run id", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/cookies/health")) {
        return jsonResponse(healthyCookieHealth("instagram"));
      }
      if (url.includes("/catalog/backfill")) {
        expect(init?.method).toBe("POST");
        const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
        expect(body).toEqual({
          source_scope: "bravo",
          backfill_scope: "full_history",
          selected_tasks: [...INSTAGRAM_BACKFILL_DEFAULT_TASKS],
        });
        return jsonResponse({
          run_id: "catalog-run-pending-12345678",
          status: "queued",
          catalog_run_id: "catalog-run-pending-12345678",
          launch_group_id: "launch-group-12345678",
          launch_state: "pending",
          launch_task_resolution_pending: true,
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Backfill Posts" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Backfill Posts" }));
    expect(await screen.findByText("Choose what this backfill should run")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start Backfill" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Instagram backfill accepted. Task selection is still being finalized. Launch launch-g · Catalog catalog-.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("queues a TikTok full-history catalog backfill with all selected tasks from one click", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          platform: "tiktok",
          account_handle: "bravotv",
          profile_url: "https://www.tiktok.com/@bravotv",
        });
      }
      if (url.includes("/cookies/health")) {
        return jsonResponse(healthyCookieHealth("tiktok"));
      }
      if (url.includes("/catalog/backfill")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(
          JSON.stringify({
            source_scope: "bravo",
            backfill_scope: "full_history",
            selected_tasks: [...TIKTOK_BACKFILL_DEFAULT_TASKS],
          }),
        );
        return jsonResponse({
          run_id: "catalog-run-tiktok-12345678",
          status: "queued",
          catalog_run_id: "catalog-run-tiktok-12345678",
          selected_tasks: [...TIKTOK_BACKFILL_DEFAULT_TASKS],
          effective_selected_tasks: [...TIKTOK_BACKFILL_DEFAULT_TASKS],
          comments_run_id: null,
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="tiktok" handle="bravotv" activeTab="catalog" />);

    const button = await screen.findByRole("button", { name: "Backfill Posts" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("TikTok backfill queued for Post Details, Comments, Media. Catalog catalog-.")).toBeInTheDocument();
    });
  });

  it("auto-refreshes unhealthy TikTok cookies before starting backfill", async () => {
    const cookieHealthResponses = [
      {
        platform: "tiktok",
        required: true,
        healthy: false,
        reason: "expired",
        refresh_supported: true,
        refresh_available: true,
        refresh_action: "cookie_refresh",
        refresh_label: "Refresh Cookies",
        source_kind: "default_file",
      },
      healthyCookieHealth("tiktok"),
    ];

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          platform: "tiktok",
          account_handle: "bravotv",
          profile_url: "https://www.tiktok.com/@bravotv",
        });
      }
      if (url.includes("/cookies/health")) {
        return jsonResponse(cookieHealthResponses.shift() ?? healthyCookieHealth("tiktok"));
      }
      if (url.includes("/cookies/refresh")) {
        expect(init?.method).toBe("POST");
        return jsonResponse({
          success: true,
          healthy: true,
          reason: null,
          refresh_action: "cookie_refresh",
        });
      }
      if (url.includes("/catalog/backfill")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(
          JSON.stringify({
            source_scope: "bravo",
            backfill_scope: "full_history",
            selected_tasks: [...TIKTOK_BACKFILL_DEFAULT_TASKS],
          }),
        );
        return jsonResponse({
          run_id: "catalog-run-tiktok-auto-repair",
          status: "queued",
          catalog_run_id: "catalog-run-tiktok-auto-repair",
          selected_tasks: [...TIKTOK_BACKFILL_DEFAULT_TASKS],
          effective_selected_tasks: [...TIKTOK_BACKFILL_DEFAULT_TASKS],
          comments_run_id: null,
        });
      }
      if (url.includes("/snapshot")) {
        return jsonResponse({
          summary: {
            ...baseSummary,
            platform: "tiktok",
            account_handle: "bravotv",
            profile_url: "https://www.tiktok.com/@bravotv",
          },
          catalog_run_progress: null,
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="tiktok" handle="bravotv" activeTab="catalog" />);

    fireEvent.click(await screen.findByRole("button", { name: "Backfill Posts" }));

    await waitFor(() => {
      expect(screen.getByText("TikTok backfill queued for Post Details, Comments, Media. Catalog catalog-.")).toBeInTheDocument();
    });
  });

  it("preserves deselection in the Instagram backfill dialog and launch copy", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/cookies/health")) {
        return jsonResponse(healthyCookieHealth("instagram"));
      }
      if (url.includes("/catalog/backfill")) {
        expect(init?.method).toBe("POST");
        const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
        expect(body).toEqual({
          source_scope: "bravo",
          backfill_scope: "full_history",
          selected_tasks: ["post_details", "media"],
        });
        return jsonResponse({
          run_id: "catalog-run-abcdef12",
          status: "queued",
          selected_tasks: body.selected_tasks,
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Backfill Posts" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Backfill Posts" }));

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(3);
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).toBeChecked();

    fireEvent.click(checkboxes[1]);

    expect(screen.getByText("Selected: Post Details, Media")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start Backfill" }));

    await waitFor(() => {
      expect(
        screen.getByText("Instagram backfill queued for Post Details, Media. Catalog catalog-."),
      ).toBeInTheDocument();
    });
  });

  it("renders actual execution copy when post details are skipped because posts are already materialized", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/cookies/health")) {
        return jsonResponse(healthyCookieHealth("instagram"));
      }
      if (url.includes("/catalog/backfill")) {
        expect(init?.method).toBe("POST");
        return jsonResponse({
          run_id: "catalog-run-12345678",
          status: "queued",
          launch_group_id: "launch-group-1",
          catalog_run_id: "catalog-run-12345678",
          comments_run_id: "comments-run-12345679",
          effective_selected_tasks: ["comments", "media"],
          post_details_skipped_reason: "already_materialized",
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    fireEvent.click(await screen.findByRole("button", { name: "Backfill Posts" }));
    fireEvent.click(screen.getByRole("button", { name: "Start Backfill" }));

    expect(await screen.findByText(/Instagram backfill queued for Comments, Media\./)).toBeInTheDocument();
    expect(
      screen.getByText(/Post Details skipped because all catalog posts are already materialized\./),
    ).toBeInTheDocument();
  });

  it("shows reused comments and attached media in Instagram launch copy", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/cookies/health")) {
        return jsonResponse(healthyCookieHealth("instagram"));
      }
      if (url.includes("/catalog/backfill")) {
        expect(init?.method).toBe("POST");
        return jsonResponse({
          run_id: "catalog-run-12345678",
          status: "queued",
          launch_group_id: "launch-group-1",
          catalog_run_id: "catalog-run-12345678",
          comments_run_id: "comments-run-12345679",
          effective_selected_tasks: ["comments", "media"],
          attached_followups: {
            comments: {
              run_id: "comments-run-12345679",
              state: "running",
              status: "running",
              source: "reused_run",
            },
            media: {
              attachment_id: "media-launch-group-1",
              state: "pending",
              status: "queued",
              source: "catalog_media_mirror",
              enqueued_job_ids: ["media-job-1"],
              enqueued_job_count: 1,
            },
          },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    fireEvent.click(await screen.findByRole("button", { name: "Backfill Posts" }));
    fireEvent.click(screen.getByRole("button", { name: "Start Backfill" }));

    expect(await screen.findByText(/comments comments.*\(reused\) · media attached\./i)).toBeInTheDocument();
  });

  it("renders deferred attached lanes on recent Instagram catalog runs", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: [
            {
              run_id: "catalog-run-deferred-1",
              status: "running",
              created_at: "2026-04-21T12:00:00Z",
              launch_group_id: "launch-group-deferred-1",
              launch_state: "ready",
              selected_tasks: ["post_details", "comments", "media"],
              effective_selected_tasks: ["post_details", "comments", "media"],
              attached_followups: {
                comments: {
                  run_id: null,
                  state: "pending",
                  status: "pending",
                  source: "deferred_after_catalog",
                },
                media: {
                  attachment_id: "media-launch-group-deferred-1",
                  state: "pending",
                  status: "queued",
                  source: "catalog_media_mirror",
                  enqueued_job_ids: [],
                  enqueued_job_count: 0,
                },
              },
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/catalog-run-deferred-1/progress")) {
        return jsonResponse({
          run_id: "catalog-run-deferred-1",
          run_status: "running",
          source_scope: "bravo",
          stages: {},
          per_handle: [],
          recent_log: [],
          alerts: [],
          summary: {
            total_jobs: 1,
            completed_jobs: 0,
            failed_jobs: 0,
            active_jobs: 1,
            items_found_total: 0,
          },
        });
      }
      if (url.includes("/cookies/health")) {
        return jsonResponse(healthyCookieHealth("instagram"));
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    const recentRunsHeading = await screen.findByText("Recent Catalog Runs");
    const recentRunsSection = recentRunsHeading.closest("section");
    expect(recentRunsSection).not.toBeNull();
    expect(within(recentRunsSection as HTMLElement).getByText("Deferred")).toBeInTheDocument();
    expect(within(recentRunsSection as HTMLElement).getByText("Starts after catalog completion")).toBeInTheDocument();
  });

  it("renders reused comments and attached media lanes in catalog progress", async () => {
    const progressPayload = {
      run_id: "catalog-run-reused-1",
      run_status: "running",
      source_scope: "bravo",
      selected_tasks: ["comments", "media"],
      effective_selected_tasks: ["comments", "media"],
      comments_run_id: "comments-run-reused-1",
      attached_followups: {
        comments: {
          run_id: "comments-run-reused-1",
          state: "running",
          status: "running",
          source: "reused_run",
        },
        media: {
          attachment_id: "media-launch-group-reused-1",
          state: "pending",
          status: "queued",
          source: "catalog_media_mirror",
          enqueued_job_ids: ["media-job-1", "media-job-2"],
          enqueued_job_count: 2,
        },
      },
      stages: {},
      per_handle: [],
      recent_log: [],
      alerts: [],
      summary: {
        total_jobs: 1,
        completed_jobs: 0,
        failed_jobs: 0,
        active_jobs: 1,
        items_found_total: 0,
      },
    };

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: [
            {
              run_id: "catalog-run-reused-1",
              status: "running",
              created_at: "2026-04-21T12:00:00Z",
              selected_tasks: ["comments", "media"],
              effective_selected_tasks: ["comments", "media"],
              comments_run_id: "comments-run-reused-1",
              attached_followups: {
                comments: {
                  run_id: "comments-run-reused-1",
                  state: "running",
                  status: "running",
                  source: "reused_run",
                },
                media: {
                  attachment_id: "media-launch-group-reused-1",
                  state: "pending",
                  status: "queued",
                  source: "catalog_media_mirror",
                  enqueued_job_ids: ["media-job-1", "media-job-2"],
                  enqueued_job_count: 2,
                },
              },
            },
          ],
        });
      }
      if (url.includes("/snapshot")) {
        return jsonResponse({
          summary: {
            ...baseSummary,
            catalog_recent_runs: [
              {
                run_id: "catalog-run-reused-1",
                status: "running",
                created_at: "2026-04-21T12:00:00Z",
                selected_tasks: ["comments", "media"],
                effective_selected_tasks: ["comments", "media"],
                comments_run_id: "comments-run-reused-1",
                attached_followups: progressPayload.attached_followups,
              },
            ],
          },
          catalog_run_progress: progressPayload,
        });
      }
      if (url.includes("/catalog/runs/catalog-run-reused-1/progress")) {
        return jsonResponse(progressPayload);
      }
      if (url.includes("/cookies/health")) {
        return jsonResponse(healthyCookieHealth("instagram"));
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    const progressHeading = await screen.findByText("Catalog Run Progress");
    const progressSection = progressHeading.closest("section");
    expect(progressSection).not.toBeNull();
    await waitFor(() => {
      expect(within(progressSection as HTMLElement).getByText("Reused")).toBeInTheDocument();
      expect(within(progressSection as HTMLElement).getByText("2 repair jobs")).toBeInTheDocument();
    });
  });

  it("does not POST comments scrape from the page when catalog completion is backend-driven", async () => {
    const calls: string[] = [];
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: [
            {
              run_id: "catalog-run-completed-1",
              status: "completed",
              created_at: "2026-04-21T12:00:00Z",
            },
          ],
        });
      }
      if (url.includes("/cookies/health")) {
        return jsonResponse(healthyCookieHealth("instagram"));
      }
      if (url.includes("/snapshot")) {
        return jsonResponse({
          summary: {
            ...baseSummary,
            catalog_recent_runs: [
              {
                run_id: "catalog-run-completed-1",
                status: "completed",
                created_at: "2026-04-21T12:00:00Z",
              },
            ],
          },
          catalog_run_progress: {
            run_id: "catalog-run-completed-1",
            run_status: "completed",
            run_state: "completed",
            operational_state: "completed",
            source_scope: "bravo",
            created_at: "2026-04-21T12:00:00Z",
            stages: {},
            per_handle: [],
            recent_log: [],
            alerts: [],
            summary: {
              total_jobs: 1,
              completed_jobs: 1,
              failed_jobs: 0,
              active_jobs: 0,
              items_found_total: 0,
            },
          },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="thetraitorsus" activeTab="catalog" />);

    await waitFor(() => {
      expect(calls.some((url) => url.includes("/snapshot"))).toBe(true);
    });

    expect(calls.filter((url) => url.includes("/comments/scrape"))).toHaveLength(0);
  });

  it("opens the Instagram catalog detail modal from a catalog row", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/cookies/health")) {
        return jsonResponse(healthyCookieHealth("instagram"));
      }
      if (url.includes("/catalog/posts/source-1/detail")) {
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravotv",
          source_id: "source-1",
          source_surface: "materialized",
          title: "Premiere night",
          content: "Caption copy for the saved post.",
          permalink: "https://www.instagram.com/p/source-1/",
          posted_at: "2026-04-01T12:00:00Z",
          media_mirror_last_job_id: "mirror-job-1",
          media_mirror_status: { status: "mirrored" },
          saved_metrics: {
            likes: 321,
            comments_count: 17,
            views: 1400,
            engagement: 338,
          },
          hashtags: ["bravo"],
          mentions: ["andycohen"],
          collaborators: ["bravotv"],
          tags: ["cast"],
          hosted_media_urls: ["https://cdn.example.com/post.mp4"],
          source_media_urls: ["https://instagram.example.com/post.mp4"],
        });
      }
      if (url.includes("/catalog/posts")) {
        return jsonResponse({
          items: [
            {
              id: "catalog-1",
              source_id: "source-1",
              platform: "instagram",
              account_handle: "bravotv",
              title: "Premiere night",
              content: "Caption preview",
              assignment_status: "assigned",
              show_name: "RHOSLC",
              season_number: 6,
              posted_at: "2026-04-01T12:00:00Z",
              metrics: {
                likes: 321,
                comments_count: 17,
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

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    const rowTitle = await screen.findByText("Premiere night");
    fireEvent.click(rowTitle);

    await waitFor(() => {
      expect(screen.getByText("Catalog Detail")).toBeInTheDocument();
    });
    expect(screen.getByText("Caption copy for the saved post.")).toBeInTheDocument();
    expect(screen.getByText("mirror-job-1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open permalink" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/p/source-1/",
    );
  });

  it("renders saved discussion inside catalog detail for supported non-instagram platforms", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({ ...baseSummary, platform: "tiktok" });
      }
      if (url.includes("/catalog/posts/source-1/detail")) {
        return jsonResponse({
          platform: "tiktok",
          account_handle: "bravotv",
          source_id: "source-1",
          source_surface: "materialized",
          title: "After show clip",
          content: "Caption copy for the saved post.",
          permalink: "https://www.tiktok.com/@bravotv/video/source-1",
          posted_at: "2026-04-01T12:00:00Z",
          saved_metrics: {
            likes: 321,
            comments_count: 17,
            views: 1400,
            engagement: 338,
          },
          discussion_items: [
            {
              id: "comment-1",
              comment_id: "comment-1",
              username: "bravofan",
              display_name: "Bravo Fan",
              discussion_type: "comment",
              text: "Saved TikTok comment",
              created_at: "2026-04-01T12:30:00Z",
            },
          ],
          total_comments_in_db: 1,
          hosted_media_urls: ["https://cdn.example.com/post.mp4"],
          source_media_urls: ["https://tiktok.example.com/post.mp4"],
        });
      }
      if (url.includes("/catalog/posts")) {
        return jsonResponse({
          items: [
            {
              id: "catalog-1",
              source_id: "source-1",
              platform: "tiktok",
              account_handle: "bravotv",
              title: "After show clip",
              content: "Caption preview",
              assignment_status: "assigned",
              show_name: "RHOSLC",
              season_number: 6,
              posted_at: "2026-04-01T12:00:00Z",
              metrics: {
                likes: 321,
                comments_count: 17,
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

    render(<SocialAccountProfilePage platform="tiktok" handle="bravotv" activeTab="catalog" />);

    const rowTitle = await screen.findByText("After show clip");
    fireEvent.click(rowTitle);

    await waitFor(() => {
      expect(screen.getByText("Catalog Detail")).toBeInTheDocument();
    });
    expect(screen.getByText("Saved Discussion")).toBeInTheDocument();
    expect(screen.getByText("Saved TikTok comment")).toBeInTheDocument();
    expect(screen.getByText("Bravo Fan")).toBeInTheDocument();
  });

  it("renders Instagram auth repair CTA in the cookie preflight card when cookies are unhealthy", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/cookies/health")) {
        return jsonResponse({
          platform: "instagram",
          required: true,
          healthy: false,
          reason: "expired",
          refresh_supported: true,
          refresh_available: true,
          refresh_action: "instagram_auth_repair",
          refresh_label: "Repair Instagram Auth",
          source_kind: "default_file",
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Repair Instagram Auth" })).toBeInTheDocument();
    });
  });

  it("repairs Instagram auth and then auto-starts backfill when Backfill Posts is clicked with unhealthy cookies", async () => {
    let cookieHealthChecks = 0;
    const backfillBodies: unknown[] = [];

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/cookies/health")) {
        cookieHealthChecks += 1;
        return jsonResponse({
          platform: "instagram",
          required: true,
          healthy: cookieHealthChecks > 1,
          reason: cookieHealthChecks > 1 ? null : "expired",
          refresh_supported: true,
          refresh_available: true,
          refresh_action: "instagram_auth_repair",
          refresh_label: "Repair Instagram Auth",
          source_kind: "default_file",
        });
      }
      if (url.includes("/cookies/refresh")) {
        expect(init?.method).toBe("POST");
        return jsonResponse({
          success: true,
          healthy: true,
          reason: null,
          refresh_action: "instagram_auth_repair",
          steps: [{ name: "refresh", status: "ok" }],
          remote_auth_probe: { platform: "instagram", ready: true },
        });
      }
      if (url.includes("/catalog/backfill")) {
        backfillBodies.push(typeof init?.body === "string" ? JSON.parse(init.body) : init?.body);
        return jsonResponse({ run_id: "catalog-run-after-repair", status: "queued" });
      }
      if (url.includes("/snapshot")) {
        return jsonResponse({
          summary: baseSummary,
          catalog_run_progress: null,
          generated_at: "2026-04-21T00:00:00.000Z",
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    const backfillButton = await screen.findByRole("button", { name: "Backfill Posts" });
    fireEvent.click(backfillButton);
    fireEvent.click(await screen.findByRole("button", { name: "Start Backfill" }));

    await waitFor(() => {
      expect(backfillBodies).toEqual([
        {
          source_scope: "bravo",
          backfill_scope: "full_history",
          selected_tasks: [...INSTAGRAM_BACKFILL_DEFAULT_TASKS],
        },
      ]);
    });
    expect(
      screen.getByText("Instagram backfill queued for Post Details, Comments, Media. Catalog catalog-."),
    ).toBeInTheDocument();
  });

  it("does not start backfill when Instagram auth repair fails during pre-launch gating", async () => {
    let backfillCalled = false;

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/cookies/health")) {
        return jsonResponse({
          platform: "instagram",
          required: true,
          healthy: false,
          reason: "expired",
          refresh_supported: true,
          refresh_available: true,
          refresh_action: "instagram_auth_repair",
          refresh_label: "Repair Instagram Auth",
          source_kind: "default_file",
        });
      }
      if (url.includes("/cookies/refresh")) {
        expect(init?.method).toBe("POST");
        return jsonResponse({
          success: false,
          healthy: false,
          reason: "remote_probe_failed",
          refresh_action: "instagram_auth_repair",
          steps: [{ name: "verify_remote_auth", status: "failed" }],
          remote_auth_probe: { platform: "instagram", ready: false, reason: "checkpoint_required" },
        });
      }
      if (url.includes("/catalog/backfill")) {
        backfillCalled = true;
        return jsonResponse({ run_id: "should-not-run", status: "queued" });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    const backfillButton = await screen.findByRole("button", { name: "Backfill Posts" });
    fireEvent.click(backfillButton);
    fireEvent.click(await screen.findByRole("button", { name: "Start Backfill" }));

    await waitFor(() => {
      expect(screen.getByText("Backfill was not started because Instagram auth repair failed.")).toBeInTheDocument();
    });
    expect(backfillCalled).toBe(false);
  });

  it("blocks Instagram backfill on non-local runtimes until auth is repaired locally", async () => {
    let backfillCalled = false;

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/cookies/health")) {
        return jsonResponse({
          platform: "instagram",
          required: true,
          healthy: false,
          reason: "expired",
          refresh_supported: true,
          refresh_available: false,
          refresh_action: "instagram_auth_repair",
          refresh_label: "Repair Instagram Auth",
          source_kind: "default_file",
        });
      }
      if (url.includes("/catalog/backfill")) {
        backfillCalled = true;
        return jsonResponse({ run_id: "should-not-run", status: "queued" });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    const backfillButton = await screen.findByRole("button", { name: "Backfill Posts" });
    fireEvent.click(backfillButton);
    fireEvent.click(await screen.findByRole("button", { name: "Start Backfill" }));

    await waitFor(() => {
      expect(
        screen.getByText("Backfill cannot continue until Instagram auth is repaired from a local TRR-Backend host."),
      ).toBeInTheDocument();
    });
    expect(backfillCalled).toBe(false);
  });

  it("surfaces structured backfill startup errors from the proxy", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/cookies/health")) {
        return jsonResponse(healthyCookieHealth("instagram"));
      }
      if (url.includes("/catalog/backfill")) {
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
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Backfill Posts" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Backfill Posts" }));
    fireEvent.click(await screen.findByRole("button", { name: "Start Backfill" }));

    await waitFor(() => {
      expect(screen.getByText("Backfill start is retryable while the backend is busy.")).toBeInTheDocument();
    });
  });

  it("renders fill-missing and backfill copy buttons on catalog-enabled platforms", async () => {
    const writeText = installClipboardMock();

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          platform: "twitter",
          account_handle: "bravotv",
          profile_url: "https://x.com/BravoTV",
          source_status: [{ source_scope: "creator" }],
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="twitter" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Backfill Posts" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Fill Missing Posts" })).toBeInTheDocument();

    const copyButtons = screen.getAllByRole("button", { name: "Copy terminal command" });
    expect(copyButtons).toHaveLength(2);

    fireEvent.click(copyButtons[0]!);
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        "cd ~/Projects/TRR/TRR-Backend && source .venv/bin/activate && python3 scripts/socials/local_catalog_action.py --platform twitter --account bravotv --source-scope creator --action backfill",
      );
    });

    fireEvent.click(copyButtons[1]!);
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        "cd ~/Projects/TRR/TRR-Backend && source .venv/bin/activate && python3 scripts/socials/local_catalog_action.py --platform twitter --account bravotv --source-scope creator --action fill_missing_posts",
      );
    });
  });

  it("routes Fill Missing Posts to sync-newer for head gaps", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          platform: "tiktok",
          account_handle: "bravotv",
          profile_url: "https://www.tiktok.com/@bravotv",
        });
      }
      if (url.includes("/cookies/health")) {
        return jsonResponse(healthyCookieHealth("tiktok"));
      }
      if (url.includes("/catalog/gap-analysis/run")) {
        expect(init?.method).toBe("POST");
        return jsonResponse({
          platform: "tiktok",
          account_handle: "bravotv",
          status: "completed",
          operation_id: "gap-op-head-1",
          stale: false,
          result: {
            platform: "tiktok",
            account_handle: "bravotv",
            gap_type: "head_gap",
            recommended_action: "sync_newer",
            repair_window_start: null,
            repair_window_end: null,
          },
        });
      }
      if (url.includes("/catalog/sync-newer")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(JSON.stringify({ source_scope: "bravo" }));
        return jsonResponse({ run_id: "catalog-run-head-1", status: "queued" });
      }
      if (url.includes("/snapshot")) {
        return jsonResponse({
          summary: {
            ...baseSummary,
            platform: "tiktok",
            account_handle: "bravotv",
            profile_url: "https://www.tiktok.com/@bravotv",
          },
          catalog_run_progress: null,
          generated_at: "2026-04-15T12:00:00.000Z",
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="tiktok" handle="bravotv" activeTab="catalog" />);

    const button = await screen.findByRole("button", { name: "Fill Missing Posts" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Sync newer posts queued (catalog-).")).toBeInTheDocument();
    });
  });

  it("routes Fill Missing Posts to full-history backfill for tail gaps", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          platform: "threads",
          account_handle: "bravotv",
          profile_url: "https://www.threads.net/@bravotv",
        });
      }
      if (url.includes("/cookies/health")) {
        return jsonResponse(healthyCookieHealth("threads"));
      }
      if (url.includes("/catalog/gap-analysis/run")) {
        expect(init?.method).toBe("POST");
        return jsonResponse({
          platform: "threads",
          account_handle: "bravotv",
          status: "completed",
          operation_id: "gap-op-tail-1",
          stale: false,
          result: {
            platform: "threads",
            account_handle: "bravotv",
            gap_type: "tail_gap",
            recommended_action: "backfill_posts",
            repair_window_start: null,
            repair_window_end: null,
          },
        });
      }
      if (url.includes("/catalog/backfill")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(JSON.stringify({ source_scope: "bravo", backfill_scope: "full_history" }));
        return jsonResponse({ run_id: "catalog-run-tail-2", status: "queued" });
      }
      if (url.includes("/snapshot")) {
        return jsonResponse({
          summary: {
            ...baseSummary,
            platform: "threads",
            account_handle: "bravotv",
            profile_url: "https://www.threads.net/@bravotv",
          },
          catalog_run_progress: null,
          generated_at: "2026-04-15T12:00:00.000Z",
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="threads" handle="bravotv" activeTab="catalog" />);

    const button = await screen.findByRole("button", { name: "Fill Missing Posts" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Post backfill queued (catalog-).")).toBeInTheDocument();
    });
  });

  it("routes Fill Missing Posts to bounded-window backfill for interior gaps", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          platform: "facebook",
          account_handle: "bravotv",
          profile_url: "https://www.facebook.com/bravotv",
        });
      }
      if (url.includes("/cookies/health")) {
        return jsonResponse(healthyCookieHealth("facebook"));
      }
      if (url.includes("/catalog/gap-analysis/run")) {
        expect(init?.method).toBe("POST");
        return jsonResponse({
          platform: "facebook",
          account_handle: "bravotv",
          status: "completed",
          operation_id: "gap-op-window-1",
          stale: false,
          result: {
            platform: "facebook",
            account_handle: "bravotv",
            gap_type: "interior_gaps",
            recommended_action: "bounded_window_backfill",
            repair_window_start: "2026-04-01T00:00:00Z",
            repair_window_end: "2026-04-03T23:59:59Z",
          },
        });
      }
      if (url.includes("/catalog/backfill")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(
          JSON.stringify({
            source_scope: "bravo",
            backfill_scope: "bounded_window",
            date_start: "2026-04-01T00:00:00Z",
            date_end: "2026-04-03T23:59:59Z",
          }),
        );
        return jsonResponse({ run_id: "catalog-run-window-1", status: "queued" });
      }
      if (url.includes("/snapshot")) {
        return jsonResponse({
          summary: {
            ...baseSummary,
            platform: "facebook",
            account_handle: "bravotv",
            profile_url: "https://www.facebook.com/bravotv",
          },
          catalog_run_progress: null,
          generated_at: "2026-04-15T12:00:00.000Z",
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="facebook" handle="bravotv" activeTab="catalog" />);

    const button = await screen.findByRole("button", { name: "Fill Missing Posts" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Post backfill queued (catalog-).")).toBeInTheDocument();
    });
  });

  it("does not start another catalog action when Fill Missing Posts resolves to none", async () => {
    let backfillCalled = false;
    let syncNewerCalled = false;

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          platform: "youtube",
          account_handle: "bravo",
          profile_url: "https://www.youtube.com/@bravo",
        });
      }
      if (url.includes("/catalog/gap-analysis/run")) {
        expect(init?.method).toBe("POST");
        return jsonResponse({
          platform: "youtube",
          account_handle: "bravo",
          status: "completed",
          operation_id: "gap-op-none-1",
          stale: false,
          result: {
            platform: "youtube",
            account_handle: "bravo",
            gap_type: "complete",
            recommended_action: "none",
            repair_window_start: null,
            repair_window_end: null,
          },
        });
      }
      if (url.includes("/catalog/backfill")) {
        backfillCalled = true;
        return jsonResponse({ run_id: "unexpected-backfill", status: "queued" });
      }
      if (url.includes("/catalog/sync-newer")) {
        syncNewerCalled = true;
        return jsonResponse({ run_id: "unexpected-sync-newer", status: "queued" });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="youtube" handle="bravo" activeTab="catalog" />);

    const button = await screen.findByRole("button", { name: "Fill Missing Posts" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("No missing posts to fill right now.")).toBeInTheDocument();
    });

    expect(backfillCalled).toBe(false);
    expect(syncNewerCalled).toBe(false);
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
      if (url.includes("/cookies/health")) {
        return jsonResponse(healthyCookieHealth("instagram"));
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
        expect(init?.body).toBe(
          JSON.stringify({
            source_scope: "bravo",
            backfill_scope: "full_history",
            selected_tasks: [...INSTAGRAM_BACKFILL_DEFAULT_TASKS],
          }),
        );
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
      expect(
        screen.getByText("Instagram backfill queued for Post Details, Comments, Media. Catalog catalog-."),
      ).toBeInTheDocument();
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
      if (url.includes("/cookies/health")) {
        return jsonResponse(healthyCookieHealth("instagram"));
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
      if (url.includes("/cookies/health")) {
        return jsonResponse(healthyCookieHealth("instagram"));
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
            source_scope: "bravo",
            backfill_scope: "bounded_window",
            date_start: "2026-03-01T12:00:00Z",
            date_end: "2026-03-02T12:00:00Z",
            selected_tasks: [...INSTAGRAM_BACKFILL_DEFAULT_TASKS],
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
      expect(
        screen.getByText("Instagram backfill queued for Post Details, Comments, Media. Catalog catalog-."),
      ).toBeInTheDocument();
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
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
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
      if (url.includes("/cookies/health")) {
        return jsonResponse(healthyCookieHealth("twitter"));
      }
      if (url.endsWith("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      if (url.includes("/catalog/backfill")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(JSON.stringify({ source_scope: "bravo", backfill_scope: "full_history" }));
        return jsonResponse({
          run_id: "catalog-run-twitter-12345678",
          status: "queued",
          catalog_run_id: "catalog-run-twitter-12345678",
          effective_selected_tasks: ["post_details", "comments", "media"],
        });
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

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Backfill Posts" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Backfill Posts" }));

    await waitFor(() => {
      expect(screen.getByText("Twitter / X backfill queued for Post Details, Comments, Media. Catalog catalog-.")).toBeInTheDocument();
    });
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
    const activeSummary = {
      ...baseSummary,
      catalog_recent_runs: [
        {
          run_id: "run-active-1",
          status: "running",
          created_at: "2026-03-18T11:00:00.000Z",
        },
      ],
    };
    const activeProgress = {
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
    };

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/snapshot")) {
        return jsonResponse({
          summary: activeSummary,
          catalog_run_progress: activeProgress,
          generated_at: "2026-04-09T03:00:00.000Z",
        });
      }
      if (url.includes("/summary")) {
        return jsonResponse(activeSummary);
      }
      if (url.includes("/catalog/runs/run-active-1/progress")) {
        return jsonResponse(activeProgress);
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
        screen.getByText((content) => content.includes("420") && content.includes("persisted")),
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
    const blockedSummary = {
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
    };
    const activeNewProgress = {
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
    };

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/snapshot")) {
        return jsonResponse({
          summary: blockedSummary,
          catalog_run_progress: activeNewProgress,
          generated_at: "2026-04-09T03:00:00.000Z",
        });
      }
      if (url.includes("/summary")) {
        return jsonResponse(blockedSummary);
      }
      if (url.includes("/catalog/runs/run-active-new/progress")) {
        return jsonResponse(activeNewProgress);
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
      // After the snapshot cache refactor, selecting a historical run reissues a
      // snapshot request keyed on `run_id=run-failed-old` instead of calling the
      // legacy direct progress endpoint. Accept either call site so the test
      // covers both the snapshot path and any residual direct fallback.
      expect(
        mocks.fetchAdminWithAuth.mock.calls.some(([input]) => {
          const url = String(input);
          return (
            url.includes("/catalog/runs/run-failed-old/progress") ||
            (url.includes("/snapshot") && url.includes("run_id=run-failed-old"))
          );
        }),
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

it("shows Retry Locally for failed TikTok empty-body runs on local dev", async () => {
  setWindowLocation("http://localhost:3000/admin/social");

  mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "http://localhost");
    if (url.pathname.includes("/summary")) {
      return jsonResponse({
        ...baseSummary,
        platform: "tiktok",
        account_handle: "bravowwhl",
        profile_url: "https://www.tiktok.com/@bravowwhl",
        catalog_recent_runs: [
          {
            run_id: "run-tiktok-failed-alert",
            status: "failed",
            created_at: "2026-04-08T17:08:30.000Z",
            completed_at: "2026-04-08T17:21:00.000Z",
          },
        ],
      });
    }
    const runId = url.searchParams.get("run_id");
    if (url.pathname.includes("/snapshot") && (!runId || runId === "run-tiktok-failed-alert")) {
      return jsonResponse({
        summary: {
          ...baseSummary,
          platform: "tiktok",
          account_handle: "bravowwhl",
          profile_url: "https://www.tiktok.com/@bravowwhl",
          catalog_recent_runs: [
            {
              run_id: "run-tiktok-failed-alert",
              status: "failed",
              created_at: "2026-04-08T17:08:30.000Z",
              completed_at: "2026-04-08T17:21:00.000Z",
            },
          ],
        },
        catalog_run_progress: {
          run_id: "run-tiktok-failed-alert",
          run_status: "failed",
          run_state: "failed",
          source_scope: "bravo",
          last_error_code: "tiktok_discovery_empty_first_page",
          stages: {},
          per_handle: [],
          recent_log: [],
          alerts: [
            {
              code: "tiktok_empty_first_page",
              severity: "error",
              message: "TikTok returned no posts on the first discovery page.",
            },
          ],
          summary: {
            total_jobs: 1,
            completed_jobs: 0,
            failed_jobs: 1,
            active_jobs: 0,
            items_found_total: 0,
          },
        },
      });
    }
    if (url.pathname.includes("/catalog/posts")) {
      return jsonResponse({
        items: [],
        pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
      });
    }
    if (url.pathname.includes("/catalog/review-queue")) {
      return jsonResponse({ items: [] });
    }
    throw new Error(`Unhandled request: ${url}`);
  });

  render(<SocialAccountProfilePage platform="tiktok" handle="bravowwhl" activeTab="catalog" />);

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "View Details" })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "View Details" }));

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Retry Locally" })).toBeInTheDocument();
  });
});

it("hides Retry Locally while a TikTok recovery handoff is still active", async () => {
  setWindowLocation("http://localhost:3000/admin/social");

  mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "http://localhost");
    if (url.pathname.includes("/summary")) {
      return jsonResponse({
        ...baseSummary,
        platform: "tiktok",
        account_handle: "bravowwhl",
        profile_url: "https://www.tiktok.com/@bravowwhl",
        catalog_recent_runs: [
          {
            run_id: "run-tiktok-recovery-active",
            status: "failed",
            created_at: "2026-04-08T17:08:30.000Z",
            completed_at: "2026-04-08T17:21:00.000Z",
          },
        ],
      });
    }
    const runId = url.searchParams.get("run_id");
    if (url.pathname.includes("/snapshot") && (!runId || runId === "run-tiktok-recovery-active")) {
      return jsonResponse({
        summary: {
          ...baseSummary,
          platform: "tiktok",
          account_handle: "bravowwhl",
          profile_url: "https://www.tiktok.com/@bravowwhl",
          catalog_recent_runs: [
            {
              run_id: "run-tiktok-recovery-active",
              status: "failed",
              created_at: "2026-04-08T17:08:30.000Z",
              completed_at: "2026-04-08T17:21:00.000Z",
            },
          ],
        },
        catalog_run_progress: {
          run_id: "run-tiktok-recovery-active",
          run_status: "failed",
          run_state: "failed",
          source_scope: "bravo",
          last_error_code: "tiktok_discovery_empty_first_page",
          stages: {},
          per_handle: [],
          recent_log: [],
          recovery: {
            status: "running",
            reason: "tiktok_empty_body_transport_failure",
            stage: "shared_account_posts",
            job_id: "job-recovery-2",
            attempt_count: 1,
            transport: "public",
            execution_backend: "local",
          },
          alerts: [],
          summary: {
            total_jobs: 1,
            completed_jobs: 0,
            failed_jobs: 1,
            active_jobs: 0,
            items_found_total: 0,
          },
        },
      });
    }
    if (url.pathname.includes("/catalog/posts")) {
      return jsonResponse({
        items: [],
        pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
      });
    }
    if (url.pathname.includes("/catalog/review-queue")) {
      return jsonResponse({ items: [] });
    }
    throw new Error(`Unhandled request: ${url}`);
  });

  render(<SocialAccountProfilePage platform="tiktok" handle="bravowwhl" activeTab="catalog" />);

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "View Details" })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "View Details" }));

  await waitFor(() => {
    expect(screen.getByText(/reason: tiktok empty body transport failure/i)).toBeInTheDocument();
  });

  expect(screen.queryByRole("button", { name: "Retry Locally" })).not.toBeInTheDocument();
});

it("sends the explicit local TikTok backfill payload when Retry Locally is clicked", async () => {
  setWindowLocation("http://localhost:3000/admin/social");

  const backfillBodies: unknown[] = [];

  mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://localhost");
    if (url.pathname.includes("/summary")) {
      return jsonResponse({
        ...baseSummary,
        platform: "tiktok",
        account_handle: "bravowwhl",
        profile_url: "https://www.tiktok.com/@bravowwhl",
        catalog_recent_runs: [
          {
            run_id: "run-tiktok-failed-payload",
            status: "failed",
            created_at: "2026-04-08T17:08:30.000Z",
            completed_at: "2026-04-08T17:21:00.000Z",
          },
        ],
      });
    }
    if (url.pathname.includes("/snapshot")) {
      const runId = url.searchParams.get("run_id");
      if (!runId || runId === "run-tiktok-failed-payload") {
        return jsonResponse({
          summary: {
            ...baseSummary,
            platform: "tiktok",
            account_handle: "bravowwhl",
            profile_url: "https://www.tiktok.com/@bravowwhl",
            catalog_recent_runs: [
              {
                run_id: "run-tiktok-failed-payload",
                status: "failed",
                created_at: "2026-04-08T17:08:30.000Z",
                completed_at: "2026-04-08T17:21:00.000Z",
              },
            ],
          },
          catalog_run_progress: {
            run_id: "run-tiktok-failed-payload",
            run_status: "failed",
            run_state: "failed",
            source_scope: "bravo",
            last_error_code: "tiktok_discovery_empty_first_page",
            stages: {},
            per_handle: [],
            recent_log: [],
            alerts: [],
            summary: {
              total_jobs: 1,
              completed_jobs: 0,
              failed_jobs: 1,
              active_jobs: 0,
              items_found_total: 0,
            },
          },
        });
      }
      if (runId === "run-tiktok-retry-queued") {
        return jsonResponse({
          summary: {
            ...baseSummary,
            platform: "tiktok",
            account_handle: "bravowwhl",
            profile_url: "https://www.tiktok.com/@bravowwhl",
            catalog_recent_runs: [
              {
                run_id: "run-tiktok-retry-queued",
                status: "queued",
                created_at: "2026-04-08T17:30:00.000Z",
              },
            ],
          },
          catalog_run_progress: {
            run_id: "run-tiktok-retry-queued",
            run_status: "queued",
            run_state: "queued",
            source_scope: "bravo",
            stages: {},
            per_handle: [],
            recent_log: [],
            alerts: [],
            summary: {
              total_jobs: 1,
              completed_jobs: 0,
              failed_jobs: 0,
              active_jobs: 1,
              items_found_total: 0,
            },
          },
        });
      }
      return jsonResponse({
        summary: {
          ...baseSummary,
          platform: "tiktok",
          account_handle: "bravowwhl",
          profile_url: "https://www.tiktok.com/@bravowwhl",
          catalog_recent_runs: [],
        },
        catalog_run_progress: null,
      });
    }
    if (url.pathname.includes("/cookies/health")) {
      return jsonResponse(healthyCookieHealth("tiktok"));
    }
    if (url.pathname.includes("/catalog/backfill")) {
      backfillBodies.push(JSON.parse(String(init?.body || "{}")));
      return jsonResponse({
        run_id: "run-tiktok-retry-queued",
        status: "queued",
      });
    }
    if (url.pathname.includes("/catalog/posts")) {
      return jsonResponse({
        items: [],
        pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
      });
    }
    if (url.pathname.includes("/catalog/review-queue")) {
      return jsonResponse({ items: [] });
    }
    throw new Error(`Unhandled request: ${url}`);
  });

  render(<SocialAccountProfilePage platform="tiktok" handle="bravowwhl" activeTab="catalog" />);

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "View Details" })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "View Details" }));

  const retryButton = await screen.findByRole("button", { name: "Retry Locally" });
  fireEvent.click(retryButton);

  await waitFor(() => {
    expect(backfillBodies).toEqual([
      {
        source_scope: "bravo",
        backfill_scope: "full_history",
        allow_inline_dev_fallback: true,
        execution_preference: "prefer_local_inline",
        selected_tasks: [...TIKTOK_BACKFILL_DEFAULT_TASKS],
      },
    ]);
  });
});

it("shows the direct fallback recovery copy for active TikTok recovery handoffs", async () => {
  mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "http://localhost");
    if (url.pathname.includes("/summary")) {
      return jsonResponse({
        ...baseSummary,
        platform: "tiktok",
        account_handle: "bravowwhl",
        profile_url: "https://www.tiktok.com/@bravowwhl",
        catalog_recent_runs: [
          {
            run_id: "run-tiktok-recovering",
            status: "queued",
            created_at: "2026-04-08T17:08:30.000Z",
          },
        ],
      });
    }
    const runId = url.searchParams.get("run_id");
    if (url.pathname.includes("/snapshot") && (!runId || runId === "run-tiktok-recovering")) {
      return jsonResponse({
        summary: {
          ...baseSummary,
          platform: "tiktok",
          account_handle: "bravowwhl",
          profile_url: "https://www.tiktok.com/@bravowwhl",
          catalog_recent_runs: [
            {
              run_id: "run-tiktok-recovering",
              status: "queued",
              created_at: "2026-04-08T17:08:30.000Z",
            },
          ],
        },
        catalog_run_progress: {
          run_id: "run-tiktok-recovering",
          run_status: "queued",
          run_state: "recovering",
          source_scope: "bravo",
          stages: {
            shared_account_posts: {
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
          recovery: {
            status: "fallback_enqueued",
            reason: "tiktok_empty_body_transport_failure",
            stage: "shared_account_posts",
            next_stage: "shared_account_posts",
            transport: "public",
            execution_backend: "local",
          },
          alerts: [],
          summary: {
            total_jobs: 1,
            completed_jobs: 0,
            failed_jobs: 0,
            active_jobs: 1,
            items_found_total: 0,
          },
        },
      });
    }
    if (url.pathname.includes("/catalog/posts")) {
      return jsonResponse({
        items: [],
        pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
      });
    }
    if (url.pathname.includes("/catalog/review-queue")) {
      return jsonResponse({ items: [] });
    }
    throw new Error(`Unhandled request: ${url}`);
  });

  render(<SocialAccountProfilePage platform="tiktok" handle="bravowwhl" activeTab="catalog" />);

  await waitFor(() => {
    expect(screen.getByText("Falling back to direct catalog fetch")).toBeInTheDocument();
  });
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
    expect(screen.getAllByText("Cancelled").length).toBeGreaterThan(0);
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

  it("renders a Cancel + Requeue button when no_eligible_worker_for_required_runtime alert is present and POSTs to remediate-drift on click", async () => {
    const remediateResponse = {
      platform: "instagram",
      account_handle: "bravotv",
      candidate_job_count: 1,
      candidate_runs: [
        {
          run_id: "run-stuck-1",
          run_status: "running",
          job_ids: ["job-1"],
          job_statuses: ["queued"],
          job_types: ["history_discovery"],
          runner_strategy: "newest_first_frontier",
          partition_strategy: "newest_first_frontier",
          catalog_action: "backfill",
        },
      ],
      cancelled_runs: [{ run_id: "run-stuck-1", status: "cancelled" }],
      requeued_canary: { run_id: "run-canary-2", status: "queued" },
    };

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: [{ run_id: "run-stuck-1", status: "running", created_at: "2026-04-20T17:09:36.000Z" }],
        });
      }
      if (url.includes("/catalog/runs/run-stuck-1/progress")) {
        return jsonResponse({
          run_id: "run-stuck-1",
          run_status: "running",
          run_state: "discovering",
          source_scope: "bravo",
          alerts: [
            {
              code: "no_eligible_worker_for_required_runtime",
              severity: "warning",
              message:
                "Queued jobs for this run require a worker runtime that no live worker currently matches.",
              required_runtime: { label: "modal:main · im-AAA" },
              observed_runtime_labels: ["modal:main · im-BBB"],
            },
          ],
          stages: {},
          per_handle: [],
          recent_log: [],
        });
      }
      if (url.includes("/catalog/remediate-drift")) {
        expect(init?.method).toBe("POST");
        const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
        expect(body.requeue_canary).toBe(true);
        return jsonResponse(remediateResponse);
      }
      if (url.includes("/catalog/posts")) {
        return jsonResponse({ items: [], pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 } });
      }
      if (url.includes("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    const button = await screen.findByRole("button", { name: /cancel \+ requeue clean run/i });
    fireEvent.click(button);

    await waitFor(() => {
      const remediateCalls = mocks.fetchAdminWithAuth.mock.calls.filter(([url]: [RequestInfo | URL]) =>
        String(url).includes("/catalog/remediate-drift"),
      );
      expect(remediateCalls.length).toBeGreaterThan(0);
    });
  });

  it("auto-pivots only when the currently displayed run is superseded and a replacement run exists", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: [{ run_id: "run-old-1", status: "running", created_at: "2026-04-20T17:09:36.000Z" }],
        });
      }
      if (url.includes("/catalog/runs/run-old-1/progress")) {
        return jsonResponse({
          run_id: "run-old-1",
          run_status: "cancelled",
          run_state: "cancelled",
          operational_state: "runtime_superseded",
          worker_runtime: {
            replacement_run_id: "run-new-2",
            auto_requeue_status: "queued",
            runtime_superseded: true,
          },
          alerts: [
            {
              code: "runtime_superseded",
              severity: "warning",
              message: "This run was superseded by a replacement run on the current worker runtime.",
            },
          ],
          stages: {},
          per_handle: [],
          recent_log: [],
        });
      }
      if (url.includes("/snapshot") && url.includes("run_id=run-new-2")) {
        return jsonResponse({
          data: {
            summary: {
              ...baseSummary,
              catalog_recent_runs: [
                { run_id: "run-new-2", status: "queued", created_at: "2026-04-20T17:12:00.000Z" },
                { run_id: "run-old-1", status: "cancelled", created_at: "2026-04-20T17:09:36.000Z" },
              ],
            },
            catalog_run_progress: {
              run_id: "run-new-2",
              run_status: "queued",
              run_state: "discovering",
              alerts: [],
              stages: {},
              per_handle: [],
              recent_log: [],
            },
          },
          generated_at: "2026-04-20T17:12:01.000Z",
        });
      }
      if (url.includes("/catalog/posts")) {
        return jsonResponse({ items: [], pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 } });
      }
      if (url.includes("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(
        mocks.fetchAdminWithAuth.mock.calls.some(([url]: [RequestInfo | URL]) => String(url).includes("run_id=run-new-2")),
      ).toBe(true);
    });

    expect(screen.getAllByText(/Run run-new-/i).length).toBeGreaterThan(0);
  });

  it("does not auto-pivot away from unrelated runs", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: [{ run_id: "run-archive-1", status: "running", created_at: "2026-04-20T17:09:36.000Z" }],
        });
      }
      if (url.includes("/catalog/runs/run-archive-1/progress")) {
        return jsonResponse({
          run_id: "run-archive-1",
          run_status: "cancelled",
          run_state: "cancelled",
          alerts: [],
          stages: {},
          per_handle: [],
          recent_log: [],
        });
      }
      if (url.includes("/catalog/posts")) {
        return jsonResponse({ items: [], pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 } });
      }
      if (url.includes("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(
        mocks.fetchAdminWithAuth.mock.calls.some(([url]: [RequestInfo | URL]) =>
          String(url).includes("/catalog/runs/run-archive-1/progress"),
        ),
      ).toBe(true);
    });

    expect(
      mocks.fetchAdminWithAuth.mock.calls.some(([url]: [RequestInfo | URL]) => String(url).includes("run_id=run-new-2")),
    ).toBe(false);
  });

  it("hides manual remediation only after auto-requeue has a replacement run in queued or running state", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: [{ run_id: "run-stuck-2", status: "cancelled", created_at: "2026-04-20T17:09:36.000Z" }],
        });
      }
      if (url.includes("/catalog/runs/run-stuck-2/progress")) {
        return jsonResponse({
          run_id: "run-stuck-2",
          run_status: "cancelled",
          run_state: "cancelled",
          worker_runtime: {
            replacement_run_id: "run-clean-3",
            auto_requeue_status: "queued",
            runtime_superseded: true,
          },
          alerts: [
            {
              code: "no_eligible_worker_for_required_runtime",
              severity: "warning",
              message: "Queued jobs for this run require a worker runtime that no live worker currently matches.",
            },
          ],
          stages: {},
          per_handle: [],
          recent_log: [],
        });
      }
      if (url.includes("/snapshot") && url.includes("run_id=run-clean-3")) {
        return jsonResponse({
          data: {
            summary: {
              ...baseSummary,
              catalog_recent_runs: [{ run_id: "run-clean-3", status: "queued", created_at: "2026-04-20T17:12:00.000Z" }],
            },
            catalog_run_progress: {
              run_id: "run-clean-3",
              run_status: "queued",
              run_state: "discovering",
              alerts: [],
              stages: {},
              per_handle: [],
              recent_log: [],
            },
          },
          generated_at: "2026-04-20T17:12:01.000Z",
        });
      }
      if (url.includes("/catalog/posts")) {
        return jsonResponse({ items: [], pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 } });
      }
      if (url.includes("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /cancel \+ requeue clean run/i })).not.toBeInTheDocument();
    });
  });

  it("keeps manual remediation visible when auto-requeue failed or is unknown", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: [{ run_id: "run-stuck-3", status: "running", created_at: "2026-04-20T17:09:36.000Z" }],
        });
      }
      if (url.includes("/catalog/runs/run-stuck-3/progress")) {
        return jsonResponse({
          run_id: "run-stuck-3",
          run_status: "running",
          run_state: "discovering",
          worker_runtime: {
            replacement_run_id: "run-clean-4",
            auto_requeue_status: "failed",
            runtime_superseded: false,
          },
          alerts: [
            {
              code: "no_eligible_worker_for_required_runtime",
              severity: "warning",
              message: "Queued jobs for this run require a worker runtime that no live worker currently matches.",
            },
          ],
          stages: {},
          per_handle: [],
          recent_log: [],
        });
      }
      if (url.includes("/catalog/posts")) {
        return jsonResponse({ items: [], pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 } });
      }
      if (url.includes("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    expect(await screen.findByRole("button", { name: /cancel \+ requeue clean run/i })).toBeInTheDocument();
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
    const blockedSummary = {
      ...baseSummary,
      account_handle: "bravodailydish",
      catalog_recent_runs: [
        {
          run_id: "run-modal-blocked-1",
          status: "queued",
          created_at: "2026-03-26T01:13:50.000Z",
        },
      ],
    };
    const blockedProgress = {
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
    };

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/snapshot")) {
        return jsonResponse({
          summary: blockedSummary,
          catalog_run_progress: blockedProgress,
          generated_at: "2026-04-09T03:00:00.000Z",
        });
      }
      if (url.includes("/summary")) {
        return jsonResponse(blockedSummary);
      }
      if (url.includes("/catalog/runs/run-modal-blocked-1/progress")) {
        return jsonResponse(blockedProgress);
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
    expect(screen.getByRole("button", { name: "Backfill Posts" })).toBeDisabled();
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
    let snapshotCalls = 0;
    const runningSummaryBody = {
      ...baseSummary,
      catalog_recent_runs: [
        {
          run_id: "cancelok1-run",
          status: "running",
          created_at: "2026-03-22T07:45:33.000Z",
        },
      ],
    };
    const runningProgressBody = {
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
    };

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/snapshot")) {
        snapshotCalls += 1;
        // First snapshot returns the running run; later snapshots time out so the
        // component falls back to /summary (also timing out) — this exercises the
        // "cancel success stays visible despite refresh failures" path.
        if (snapshotCalls === 1) {
          return jsonResponse({
            summary: runningSummaryBody,
            catalog_run_progress: runningProgressBody,
            generated_at: "2026-03-22T07:50:00.000Z",
          });
        }
        return jsonResponse({ error: "TRR-Backend request timed out." }, 504);
      }
      if (url.includes("/summary")) {
        summaryCalls += 1;
        if (summaryCalls === 1) {
          return jsonResponse(runningSummaryBody);
        }
        return jsonResponse({ error: "TRR-Backend request timed out." }, 504);
      }
      if (url.includes("/catalog/runs/cancelok1-run/progress")) {
        return jsonResponse(runningProgressBody);
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
    // This case is about preserving the success banner even when the
    // follow-up summary refresh times out; the stale running snapshot may
    // keep the cancel affordance visible until a later poll lands.
    expect(screen.queryByText("TRR-Backend request timed out.")).not.toBeInTheDocument();
  });

  it("reconciles a cancel attempt when the first cancel request fails but the run is already cancelled upstream", async () => {
    const cancelCalls: string[] = [];
    let progressCalls = 0;

    const runningSummary = {
      ...baseSummary,
      catalog_recent_runs: [
        {
          run_id: "cancel-race-1",
          status: "running",
          created_at: "2026-03-22T10:05:20.000Z",
        },
      ],
    };
    const runningProgress = {
      run_id: "cancel-race-1",
      run_status: "running",
      source_scope: "bravo",
      completed_at: null,
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
        completed_jobs: 1,
        failed_jobs: 0,
        active_jobs: 1,
        items_found_total: 33,
      },
    };
    const cancelledProgress = {
      ...runningProgress,
      run_status: "cancelled",
      completed_at: "2026-03-22T10:14:53.000Z",
      summary: {
        ...runningProgress.summary,
        completed_jobs: 2,
        active_jobs: 0,
      },
    };

    let cancelAttempted = false;

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/snapshot")) {
        // Before the cancel attempt, snapshot polling shows the run as running. After
        // the user clicks Cancel and the reconcile flow discovers the upstream
        // cancellation, subsequent snapshot polls should return the cancelled state
        // so they don't re-assert a "running" UI.
        return jsonResponse({
          summary: runningSummary,
          catalog_run_progress: cancelAttempted ? cancelledProgress : runningProgress,
          generated_at: "2026-04-09T03:00:00.000Z",
        });
      }
      if (url.includes("/summary")) {
        return jsonResponse(runningSummary);
      }
      if (url.includes("/catalog/runs/cancel-race-1/progress")) {
        progressCalls += 1;
        // The reconcile flow should observe the upstream cancellation.
        return jsonResponse(cancelledProgress);
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
        cancelAttempted = true;
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
    expect(progressCalls).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole("button", { name: "Cancel Run" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Backfill Posts" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Sync Recent" })).toBeEnabled();
  });

  it("cancels a queued run and unlocks catalog actions immediately", async () => {
    const cancelCalls: string[] = [];
    let cancelled = false;
    const buildSummary = () => ({
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
    const queuedProgress = {
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
    };

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/snapshot")) {
        return jsonResponse({
          summary: buildSummary(),
          catalog_run_progress: cancelled ? null : queuedProgress,
          generated_at: "2026-03-22T09:50:00.000Z",
        });
      }
      if (url.includes("/summary")) {
        return jsonResponse(buildSummary());
      }
      if (url.includes("/catalog/runs/queued-run-1/progress")) {
        return jsonResponse(queuedProgress);
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

  it(
    "optimistically hides a dismissed run before the dismiss request resolves",
    async () => {
      let resolveDismiss: ((value: Response) => void) | null = null;
      const dismissResponse = new Promise<Response>((resolve) => {
        resolveDismiss = resolve;
      });

      mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/summary")) {
          return jsonResponse({
            ...baseSummary,
            catalog_recent_runs: [
              {
                run_id: "run-dismiss-now",
                status: "cancelled",
                created_at: "2026-03-19T22:00:00.000Z",
                completed_at: "2026-03-19T23:00:00.000Z",
              },
            ],
          });
        }
        if (url.includes("/snapshot")) {
          return jsonResponse({
            summary: {
              ...baseSummary,
              catalog_recent_runs: [],
            },
            catalog_run_progress: null,
            generated_at: "2026-03-19T23:00:00.000Z",
          });
        }
        if (url.includes("/catalog/runs/run-dismiss-now/dismiss")) {
          expect(init?.method).toBe("POST");
          return dismissResponse;
        }
        throw new Error(`Unhandled request: ${url}`);
      });

      const { unmount } = render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

      const dismissButtons = await screen.findAllByRole("button", { name: "Dismiss" });
      expect(dismissButtons).toHaveLength(2);

      await act(async () => {
        fireEvent.click(dismissButtons[0]);
      });

      expect(screen.getByText("No active catalog run. Ready to start the next backfill.")).toBeInTheDocument();
      expect(screen.queryAllByRole("button", { name: "Dismiss" })).toHaveLength(0);
      resolveDismiss = null;
      unmount();
    },
    12_000,
  );

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
    const frontierSummary = {
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
    };
    const frontierProgress = {
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
    };
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/snapshot")) {
        return jsonResponse({
          summary: frontierSummary,
          catalog_run_progress: frontierProgress,
          generated_at: "2026-03-20T15:20:00.000Z",
        });
      }
      if (url.includes("/summary")) {
        return jsonResponse(frontierSummary);
      }
      if (url.includes("/catalog/runs/run-live-1/progress")) {
        return jsonResponse(frontierProgress);
      }
      if (url.includes("/catalog/posts")) {
        return jsonResponse({ items: [], pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 } });
      }
      if (url.includes("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByText("16,474 / 16,475")).toBeInTheDocument();
    });
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
      expect(screen.getByText("Summary read timed out before completion. Retry in a moment.")).toBeInTheDocument();
    });
    expect(screen.queryByRole("heading", { name: "Distribution" })).not.toBeInTheDocument();
    expect(screen.queryByText("The Real Housewives of Salt Lake City")).not.toBeInTheDocument();
  });

  // TODO(ci-shard-isolation): 4 hashtag-stats tests in this file fail under
  // --shard mode — "Unable to find element with text: #alltime" (or similar
  // fallback text). Likely a fetch-mock / module state leak from another
  // file under singleFork that pre-loaded hashtag data. Re-enable after the
  // hashtag state is reset in beforeEach or the mock is fully scoped.
  it.skip("loads authoritative all-time hashtags on the Instagram stats tab from the hashtags endpoint", async () => {
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

  // TODO(ci-shard-isolation): see earlier #alltime skip — same leak class.
  it.skip("updates stats-tab hashtags when operators change the window selector", async () => {
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

  // TODO(ci-shard-isolation): see earlier #alltime skip — same leak class.
  it.skip("shows stats-tab hashtag request errors instead of falling back to the summary preview", async () => {
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

  // TODO(ci-shard-isolation): see earlier #alltime skip — same leak class.
  it.skip("preserves cached all-time hashtags when a later retry for that window is retryably saturated", async () => {
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
      expect(screen.getAllByText("0%").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("0 / 16,453 posts checked")).toBeInTheDocument();
    });
  });

  it("hydrates terminal progress for displayed completed runs without an active polling target", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/snapshot") && url.includes("run_id=4485bca3-ebdc-4a6c-8696-1df2263f7cbf")) {
        return jsonResponse({
          summary: {
            ...baseSummary,
            total_posts: 431,
            live_total_posts: 431,
            catalog_recent_runs: [
              {
                run_id: "4485bca3-ebdc-4a6c-8696-1df2263f7cbf",
                status: "completed",
                created_at: "2026-04-21T15:12:51.564Z",
              },
            ],
          },
          catalog_run_progress: {
            run_id: "4485bca3-ebdc-4a6c-8696-1df2263f7cbf",
            run_status: "completed",
            source_scope: "bravo",
            created_at: "2026-04-21T15:12:51.564Z",
            stages: {
              shared_account_posts: {
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
            post_progress: {
              completed_posts: 33,
              matched_posts: 33,
              total_posts: 431,
            },
            summary: {
              total_jobs: 1,
              completed_jobs: 1,
              failed_jobs: 0,
              active_jobs: 0,
              items_found_total: 33,
            },
          },
          generated_at: "2026-04-21T15:23:31.126Z",
        });
      }
      if (url.includes("/snapshot")) {
        return jsonResponse({
          summary: {
            ...baseSummary,
            account_handle: "thetraitorsus",
            profile_url: "https://www.instagram.com/thetraitorsus/",
            total_posts: 431,
            live_total_posts: 431,
            catalog_recent_runs: [
              {
                run_id: "4485bca3-ebdc-4a6c-8696-1df2263f7cbf",
                status: "completed",
                created_at: "2026-04-21T15:12:51.564Z",
              },
            ],
          },
          generated_at: "2026-04-21T15:13:00.000Z",
        });
      }
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          account_handle: "thetraitorsus",
          profile_url: "https://www.instagram.com/thetraitorsus/",
          total_posts: 431,
          live_total_posts: 431,
          catalog_recent_runs: [
            {
              run_id: "4485bca3-ebdc-4a6c-8696-1df2263f7cbf",
              status: "completed",
              created_at: "2026-04-21T15:12:51.564Z",
            },
          ],
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="thetraitorsus" activeTab="catalog" />);

    const progressCard = await screen.findByText("Catalog Run Progress");
    const progressSection = progressCard.closest("section");
    expect(progressSection).not.toBeNull();

    await waitFor(() => {
      expect(within(progressSection as HTMLElement).getAllByText("Completed").length).toBeGreaterThan(0);
      expect(within(progressSection as HTMLElement).getByText("8%")).toBeInTheDocument();
      expect(within(progressSection as HTMLElement).getByText("33 / 431 posts checked")).toBeInTheDocument();
      expect(within(progressSection as HTMLElement).getByText("33 persisted")).toBeInTheDocument();
      expect(within(progressSection as HTMLElement).getByText("Shard Workers")).toBeInTheDocument();
    });

    expect(
      mocks.fetchAdminWithAuth.mock.calls.some(([request]) =>
        String(request).includes("/snapshot?detail=lite&run_id=4485bca3-ebdc-4a6c-8696-1df2263f7cbf"),
      ),
    ).toBe(true);
    expect(
      within(progressSection as HTMLElement).queryByText("This completed run did not report stage-level progress telemetry."),
    ).not.toBeInTheDocument();

    const progressBar = progressSection?.querySelector("div.mt-4.h-2.overflow-hidden.rounded-full.bg-zinc-100 > div");
    expect(progressBar).not.toBeNull();
    expect(progressBar).toHaveStyle({ width: "8%" });
  });

  it("does not show loading fallback copy for completed runs with no stage telemetry", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/snapshot") && url.includes("run_id=run-completed-no-stage-telemetry")) {
        return jsonResponse({
          summary: {
            ...baseSummary,
            total_posts: 431,
            live_total_posts: 431,
            catalog_recent_runs: [
              {
                run_id: "run-completed-no-stage-telemetry",
                status: "completed",
                created_at: "2026-04-21T11:35:00.000Z",
              },
            ],
          },
          catalog_run_progress: {
            run_id: "run-completed-no-stage-telemetry",
            run_status: "completed",
            source_scope: "bravo",
            created_at: "2026-04-21T11:35:00.000Z",
            stages: {},
            per_handle: [],
            recent_log: [],
            post_progress: {
              completed_posts: 0,
              matched_posts: 0,
              saved_posts: 0,
              total_posts: 431,
            },
            summary: {
              total_jobs: 0,
              completed_jobs: 0,
              failed_jobs: 0,
              active_jobs: 0,
              items_found_total: 0,
            },
          },
          generated_at: "2026-04-21T11:40:00.000Z",
        });
      }
      if (url.includes("/snapshot")) {
        return jsonResponse({
          summary: {
            ...baseSummary,
            total_posts: 431,
            live_total_posts: 431,
            catalog_recent_runs: [
              {
                run_id: "run-completed-no-stage-telemetry",
                status: "completed",
                created_at: "2026-04-21T11:35:00.000Z",
              },
            ],
          },
          generated_at: "2026-04-21T11:36:00.000Z",
        });
      }
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          total_posts: 431,
          live_total_posts: 431,
          catalog_recent_runs: [
            {
              run_id: "run-completed-no-stage-telemetry",
              status: "completed",
              created_at: "2026-04-21T11:35:00.000Z",
            },
          ],
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="thetraitorsus" activeTab="catalog" />);

    const progressCard = await screen.findByText("Catalog Run Progress");
    const progressSection = progressCard.closest("section");
    expect(progressSection).not.toBeNull();

    await waitFor(() => {
      expect(within(progressSection as HTMLElement).getAllByText("Completed").length).toBeGreaterThan(0);
      expect(within(progressSection as HTMLElement).getByText("100%")).toBeInTheDocument();
      expect(within(progressSection as HTMLElement).getByText("431 / 431 posts checked")).toBeInTheDocument();
      expect(within(progressSection as HTMLElement).getByText("431 persisted")).toBeInTheDocument();
      expect(
        within(progressSection as HTMLElement).getByText(
          "This completed run did not report stage-level progress telemetry.",
        ),
      ).toBeInTheDocument();
    });

    expect(screen.queryByText("Waiting for the job to report stage-level progress…")).not.toBeInTheDocument();

    const progressBar = progressSection?.querySelector("div.mt-4.h-2.overflow-hidden.rounded-full.bg-zinc-100 > div");
    expect(progressBar).not.toBeNull();
    expect(progressBar).toHaveStyle({ width: "100%" });
  });

  it("treats completed sync-newer runs as bounded progress instead of full-history coverage", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/snapshot")) {
        return jsonResponse({
          summary: {
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
          },
          catalog_run_progress: {
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
              saved_posts: 16,
              total_posts: 10200,
            },
            summary: {
              total_jobs: 1,
              completed_jobs: 1,
              failed_jobs: 0,
              active_jobs: 0,
              items_found_total: 17,
            },
          },
          generated_at: "2026-04-09T03:00:00.000Z",
        });
      }
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
            saved_posts: 16,
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
      expect(screen.getByText("16 persisted")).toBeInTheDocument();
    });

    expect(screen.queryByText("17 / 10,200 posts checked")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/History discovery finished, but this run only checked 17 of 10,200 posts/i),
    ).not.toBeInTheDocument();
  });

  it("shows at least 1% for full-history runs that checked some posts", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/snapshot")) {
        return jsonResponse({
          summary: {
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
          },
          catalog_run_progress: {
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
              saved_posts: 16,
              total_posts: 10200,
            },
            summary: {
              total_jobs: 2,
              completed_jobs: 2,
              failed_jobs: 0,
              active_jobs: 0,
              items_found_total: 17,
            },
          },
          generated_at: "2026-04-09T03:00:00.000Z",
        });
      }
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
            saved_posts: 16,
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
      expect(screen.getByText("16 persisted")).toBeInTheDocument();
    });
  });

  it("does not treat classify-only items_found_total as posts checked for a failed discovery run", async () => {
    const discoveryMismatchSummary = {
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
    };
    const discoveryMismatchProgress = {
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
    };
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/snapshot")) {
        return jsonResponse({
          summary: discoveryMismatchSummary,
          catalog_run_progress: discoveryMismatchProgress,
          generated_at: "2026-04-07T13:40:00.000Z",
        });
      }
      if (url.includes("/summary")) {
        return jsonResponse(discoveryMismatchSummary);
      }
      if (url.includes("/catalog/runs/run-discovery-classify-mismatch/progress")) {
        return jsonResponse(discoveryMismatchProgress);
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
      expect(screen.getByText("0 persisted")).toBeInTheDocument();
    });
  });

it("renders blocked-auth repair controls and starts the repair flow", async () => {
  const localHostSpy = vi.spyOn(devAdminBypass, "isLocalDevHostname").mockReturnValue(false);
  try {
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
    expect(screen.queryByRole("button", { name: "Retry Locally" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Repair Instagram Auth" }));

    await waitFor(() => {
      expect(screen.getByText(/repairing auth/i)).toBeInTheDocument();
    });
  } finally {
    localHostSpy.mockRestore();
  }
});

  it("keeps catalog launch actions enabled for a generic discovery empty first page failure", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          total_posts: 16668,
          live_total_posts: 16668,
          catalog_recent_runs: [
            {
              run_id: "run-discovery-empty-generic",
              status: "failed",
              created_at: "2026-04-07T13:36:41.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-discovery-empty-generic/progress")) {
        return jsonResponse({
          run_id: "run-discovery-empty-generic",
          run_status: "failed",
          run_state: "failed",
          operational_state: "failed",
          repair_action: null,
          repair_status: null,
          repairable_reason: null,
          resume_stage: null,
          auto_resume_pending: false,
          source_scope: "bravo",
          created_at: "2026-04-07T13:36:41.000Z",
          last_error_message: "Instagram returned no posts for @bravotv on the first page.",
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
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    const backfillButton = await screen.findByRole("button", { name: "Backfill Posts" });

  await waitFor(() => {
    expect(backfillButton).toBeEnabled();
  });
  expect(screen.queryByRole("button", { name: "Retry Locally" })).not.toBeInTheDocument();
  expect(
    screen.queryByText(/Catalog launch is blocked until the required auth is repaired/i),
  ).not.toBeInTheDocument();
});

it("shows Retry Locally for failed Instagram blocked-auth runs on local dev and sends the inline fallback payload", async () => {
  setWindowLocation("http://localhost:3000/admin/social");
  const localHostSpy = vi.spyOn(devAdminBypass, "isLocalDevHostname").mockReturnValue(true);

  const backfillBodies: unknown[] = [];

  try {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          total_posts: 16668,
          live_total_posts: 16668,
          catalog_recent_runs: [
            {
              run_id: "run-instagram-blocked-auth-local",
              status: "failed",
              created_at: "2026-04-07T13:36:41.000Z",
            },
          ],
        });
      }
      if (url.pathname.includes("/snapshot")) {
        const runId = url.searchParams.get("run_id");
        if (!runId || runId === "run-instagram-blocked-auth-local") {
          return jsonResponse({
            summary: {
              ...baseSummary,
              total_posts: 16668,
              live_total_posts: 16668,
              catalog_recent_runs: [
                {
                  run_id: "run-instagram-blocked-auth-local",
                  status: "failed",
                  created_at: "2026-04-07T13:36:41.000Z",
                },
              ],
            },
            catalog_run_progress: {
              run_id: "run-instagram-blocked-auth-local",
              run_status: "failed",
              run_state: "failed",
              operational_state: "blocked_auth",
              repair_action: "repair_instagram_auth",
              repair_status: "idle",
              repairable_reason: "discovery_empty_first_page",
              resume_stage: "discovery",
              auto_resume_pending: false,
              source_scope: "bravo",
              created_at: "2026-04-07T13:36:41.000Z",
              stages: {},
              per_handle: [],
              recent_log: [],
              alerts: [],
              summary: {
                total_jobs: 1,
                completed_jobs: 0,
                failed_jobs: 1,
                active_jobs: 0,
                items_found_total: 0,
              },
            },
          });
        }
        if (runId === "run-instagram-local-retry-queued") {
          return jsonResponse({
            summary: {
              ...baseSummary,
              total_posts: 16668,
              live_total_posts: 16668,
              catalog_recent_runs: [
                {
                  run_id: "run-instagram-local-retry-queued",
                  status: "queued",
                  created_at: "2026-04-07T13:45:00.000Z",
                },
              ],
            },
            catalog_run_progress: {
              run_id: "run-instagram-local-retry-queued",
              run_status: "queued",
              run_state: "queued",
              source_scope: "bravo",
              stages: {},
              per_handle: [],
              recent_log: [],
              alerts: [],
              summary: {
                total_jobs: 1,
                completed_jobs: 0,
                failed_jobs: 0,
                active_jobs: 1,
                items_found_total: 0,
              },
            },
          });
        }
        return jsonResponse({
          summary: {
            ...baseSummary,
            catalog_recent_runs: [],
          },
          catalog_run_progress: null,
        });
      }
      if (url.pathname.includes("/cookies/health")) {
        return jsonResponse(healthyCookieHealth("instagram"));
      }
      if (url.pathname.includes("/catalog/backfill")) {
        backfillBodies.push(JSON.parse(String(init?.body || "{}")));
        return jsonResponse({
          run_id: "run-instagram-local-retry-queued",
          status: "queued",
        });
      }
      if (url.pathname.includes("/catalog/posts")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      if (url.pathname.includes("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "View Details" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "View Details" }));

    const retryButton = await screen.findByRole("button", { name: "Retry Locally" });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(backfillBodies).toEqual([
        {
          source_scope: "bravo",
          backfill_scope: "full_history",
          allow_inline_dev_fallback: true,
          execution_preference: "prefer_local_inline",
          selected_tasks: [...INSTAGRAM_BACKFILL_DEFAULT_TASKS],
        },
      ]);
    });
  } finally {
    localHostSpy.mockRestore();
  }
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
      if (url.includes("/catalog/posts")) {
        return jsonResponse({ items: [], pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 } });
      }
      if (url.includes("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

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
      if (url.includes("/cookies/health")) {
        return jsonResponse(healthyCookieHealth("instagram"));
      }
      if (url.includes("/catalog/backfill")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(
          JSON.stringify({
            source_scope: "bravo",
            backfill_scope: "full_history",
            selected_tasks: [...INSTAGRAM_BACKFILL_DEFAULT_TASKS],
          }),
        );
        return jsonResponse({
          run_id: "catalog-run-drift-12345678",
          status: "queued",
          catalog_action: "backfill",
          catalog_action_scope: "full_history",
        });
      }
      if (url.includes("/catalog/posts")) {
        return jsonResponse({ items: [], pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 } });
      }
      if (url.includes("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
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
      expect(
        screen.getByText("Instagram backfill queued for Post Details, Comments, Media. Catalog catalog-."),
      ).toBeInTheDocument();
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
      if (url.includes("/catalog/posts")) {
        return jsonResponse({ items: [], pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 } });
      }
      if (url.includes("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
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
      if (url.includes("/catalog/posts")) {
        return jsonResponse({ items: [], pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 } });
      }
      if (url.includes("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

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
