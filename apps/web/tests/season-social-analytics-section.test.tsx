import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import SeasonSocialAnalyticsSection, {
  buildRunsRequestKey,
  buildSocialRequestKey,
  formatIngestErrorMessage,
  shouldSetPollingRetry,
} from "../src/components/admin/season-social-analytics-section";
import { auth } from "../src/lib/firebase";

vi.mock("@/components/admin/social-posts-section", () => ({
  __esModule: true,
  default: () => <div data-testid="social-posts-section" />,
}));

vi.mock("@/components/admin/reddit-sources-manager", () => ({
  __esModule: true,
  default: () => <div data-testid="reddit-sources-manager" />,
}));

const { routerReplaceMock } = vi.hoisted(() => ({
  routerReplaceMock: vi.fn((href: string) => {
    window.history.replaceState({}, "", href);
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: routerReplaceMock,
  }),
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

type AnalyticsPayload = {
  window: {
    start: string;
    end: string;
    timezone: string;
    week_zero_start?: string;
    week?: number | null;
    source_scope?: string;
  };
  summary: {
    show_id: string;
    season_id: string;
    season_number: number;
    show_name: string | null;
    total_posts: number;
    total_comments: number;
    total_engagement: number;
    sentiment_mix: {
      positive: number;
      neutral: number;
      negative: number;
      counts: {
        positive: number;
        neutral: number;
        negative: number;
      };
    };
    data_quality?: {
      comments_saved_pct_overall: number | null;
      platform_comments_saved_pct: {
        instagram: number | null;
        youtube: number | null;
        tiktok: number | null;
        twitter: number | null;
      };
      last_post_at: string | null;
      last_comment_at: string | null;
      data_freshness_minutes: number | null;
    };
  };
  weekly: Array<{
    week_index: number;
    label: string;
    start: string;
    end: string;
    week_type?: "preseason" | "episode" | "bye" | "postseason";
    episode_number?: number | null;
    post_volume: number;
    comment_volume: number;
    engagement: number;
    sentiment: {
      positive: number;
      neutral: number;
      negative: number;
    };
  }>;
  weekly_platform_posts: Array<{
    week_index: number;
    label: string;
    start: string;
    end: string;
    week_type?: "preseason" | "episode" | "bye" | "postseason";
    episode_number?: number | null;
    posts: {
      instagram: number;
      youtube: number;
      tiktok: number;
      twitter: number;
    };
    comments: {
      instagram: number;
      youtube: number;
      tiktok: number;
      twitter: number;
    };
    reported_comments?: {
      instagram: number;
      youtube: number;
      tiktok: number;
      twitter: number;
    };
    total_posts: number;
    total_comments: number;
    total_reported_comments?: number;
    comments_saved_pct?: number | null;
  }>;
  weekly_platform_engagement: Array<{
    week_index: number;
    label: string;
    start: string;
    end: string;
    engagement: {
      instagram: number;
      youtube: number;
      tiktok: number;
      twitter: number;
    };
    total_engagement: number;
    has_data: boolean;
  }>;
  weekly_daily_activity: Array<{
    week_index: number;
    label: string;
    start: string;
    end: string;
    week_type?: "preseason" | "episode" | "bye" | "postseason";
    episode_number?: number | null;
    days: Array<{
      day_index: number;
      date_local: string;
      posts: {
        instagram: number;
        youtube: number;
        tiktok: number;
        twitter: number;
      };
      comments: {
        instagram: number;
        youtube: number;
        tiktok: number;
        twitter: number;
      };
      reported_comments?: {
        instagram: number;
        youtube: number;
        tiktok: number;
        twitter: number;
      };
      total_posts: number;
      total_comments: number;
      total_reported_comments?: number;
    }>;
  }>;
  weekly_flags?: Array<{
    week_index: number;
    code: "zero_activity" | "spike" | "drop" | "comment_gap";
    severity: "info" | "warn";
    message: string;
  }>;
  benchmark?: {
    week_index: number;
    current: {
      posts: number;
      comments: number;
      engagement: number;
    };
    previous_week: {
      week_index: number | null;
      metrics: {
        posts: number;
        comments: number;
        engagement: number;
      };
      delta_pct: {
        posts: number | null;
        comments: number | null;
        engagement: number | null;
      };
    };
    trailing_3_week_avg: {
      window_size: number;
      metrics: {
        posts: number;
        comments: number;
        engagement: number;
      };
      delta_pct: {
        posts: number | null;
        comments: number | null;
        engagement: number | null;
      };
    };
    consistency_score_pct?: Partial<Record<"instagram" | "youtube" | "tiktok" | "twitter", number | null>>;
  };
  platform_breakdown: Array<{
    platform: string;
    posts: number;
    comments: number;
    engagement: number;
    sentiment: {
      positive: number;
      neutral: number;
      negative: number;
    };
  }>;
  themes: {
    positive: Array<{ term: string; count: number; score: number }>;
    negative: Array<{ term: string; count: number; score: number }>;
  };
  leaderboards: {
    bravo_content: Array<{
      platform: string;
      source_id: string;
      text: string;
      engagement: number;
      url: string;
      timestamp: string;
      thumbnail_url?: string | null;
    }>;
    viewer_discussion: Array<{
      platform: string;
      source_id: string;
      text: string;
      engagement: number;
      url: string;
      timestamp: string;
      sentiment: "positive" | "neutral" | "negative";
      thumbnail_url?: string | null;
    }>;
  };
  jobs: Array<{
    id: string;
    platform: string;
    status: "queued" | "pending" | "retrying" | "running" | "completed" | "failed" | "cancelled";
  }>;
};

const makeZeroDay = (day_index: number, date_local: string) => ({
  day_index,
  date_local,
  posts: {
    instagram: 0,
    youtube: 0,
    tiktok: 0,
    twitter: 0,
  },
  comments: {
    instagram: 0,
    youtube: 0,
    tiktok: 0,
    twitter: 0,
  },
  reported_comments: {
    instagram: 0,
    youtube: 0,
    tiktok: 0,
    twitter: 0,
  },
  total_posts: 0,
  total_comments: 0,
  total_reported_comments: 0,
});

const analyticsBase: AnalyticsPayload = {
  window: {
    start: "2026-01-01T00:00:00Z",
    end: "2026-01-31T00:00:00Z",
    timezone: "America/New_York",
    source_scope: "bravo",
  },
  summary: {
    show_id: "show-1",
    season_id: "season-1",
    season_number: 6,
    show_name: "Test Show",
    total_posts: 10,
    total_comments: 20,
    total_engagement: 5000,
    sentiment_mix: {
      positive: 0.4,
      neutral: 0.3,
      negative: 0.3,
      counts: {
        positive: 8,
        neutral: 6,
        negative: 6,
      },
    },
    data_quality: {
      comments_saved_pct_overall: 40,
      platform_comments_saved_pct: {
        instagram: 40,
        youtube: 40,
        tiktok: 40,
        twitter: 40,
      },
      last_post_at: "2026-01-20T12:00:00Z",
      last_comment_at: "2026-01-20T13:00:00Z",
      data_freshness_minutes: 120,
    },
  },
  weekly: [
    {
      week_index: 1,
      label: "Week 1",
      start: "2026-01-07T00:00:00Z",
      end: "2026-01-13T23:59:59Z",
      week_type: "episode",
      episode_number: 1,
      post_volume: 4,
      comment_volume: 8,
      engagement: 1000,
      sentiment: {
        positive: 5,
        neutral: 2,
        negative: 1,
      },
    },
    {
      week_index: 2,
      label: "Week 2",
      start: "2026-01-14T00:00:00Z",
      end: "2026-01-20T23:59:59Z",
      week_type: "episode",
      episode_number: 2,
      post_volume: 0,
      comment_volume: 0,
      engagement: 0,
      sentiment: {
        positive: 0,
        neutral: 0,
        negative: 0,
      },
    },
  ],
  weekly_platform_posts: [
    {
      week_index: 1,
      label: "Week 1",
      start: "2026-01-07T00:00:00Z",
      end: "2026-01-13T23:59:59Z",
      week_type: "episode",
      episode_number: 1,
      posts: {
        instagram: 1,
        youtube: 1,
        tiktok: 1,
        twitter: 1,
      },
      comments: {
        instagram: 2,
        youtube: 2,
        tiktok: 2,
        twitter: 2,
      },
      reported_comments: {
        instagram: 5,
        youtube: 5,
        tiktok: 5,
        twitter: 5,
      },
      total_posts: 4,
      total_comments: 8,
      total_reported_comments: 20,
      comments_saved_pct: 40.0,
    },
    {
      week_index: 2,
      label: "Week 2",
      start: "2026-01-14T00:00:00Z",
      end: "2026-01-20T23:59:59Z",
      week_type: "episode",
      episode_number: 2,
      posts: {
        instagram: 0,
        youtube: 0,
        tiktok: 0,
        twitter: 0,
      },
      comments: {
        instagram: 0,
        youtube: 0,
        tiktok: 0,
        twitter: 0,
      },
      total_posts: 0,
      total_comments: 0,
    },
  ],
  weekly_platform_engagement: [
    {
      week_index: 1,
      label: "Week 1",
      start: "2026-01-07T00:00:00Z",
      end: "2026-01-13T23:59:59Z",
      engagement: {
        instagram: 100,
        youtube: 200,
        tiktok: 300,
        twitter: 400,
      },
      total_engagement: 1000,
      has_data: true,
    },
    {
      week_index: 2,
      label: "Week 2",
      start: "2026-01-14T00:00:00Z",
      end: "2026-01-20T23:59:59Z",
      engagement: {
        instagram: 0,
        youtube: 0,
        tiktok: 0,
        twitter: 0,
      },
      total_engagement: 0,
      has_data: false,
    },
  ],
  weekly_daily_activity: [
    {
      week_index: 1,
      label: "Week 1",
      start: "2026-01-07T00:00:00Z",
      end: "2026-01-13T23:59:59Z",
      week_type: "episode",
      episode_number: 1,
      days: [
        {
          day_index: 0,
          date_local: "2026-01-07",
          posts: {
            instagram: 1,
            youtube: 1,
            tiktok: 0,
            twitter: 0,
          },
          comments: {
            instagram: 2,
            youtube: 1,
            tiktok: 0,
            twitter: 0,
          },
          reported_comments: {
            instagram: 5,
            youtube: 5,
            tiktok: 0,
            twitter: 0,
          },
          total_posts: 2,
          total_comments: 3,
          total_reported_comments: 10,
        },
        {
          day_index: 1,
          date_local: "2026-01-08",
          posts: {
            instagram: 0,
            youtube: 0,
            tiktok: 1,
            twitter: 0,
          },
          comments: {
            instagram: 0,
            youtube: 0,
            tiktok: 2,
            twitter: 0,
          },
          reported_comments: {
            instagram: 0,
            youtube: 0,
            tiktok: 5,
            twitter: 0,
          },
          total_posts: 1,
          total_comments: 2,
          total_reported_comments: 5,
        },
        {
          day_index: 2,
          date_local: "2026-01-09",
          posts: {
            instagram: 0,
            youtube: 0,
            tiktok: 0,
            twitter: 1,
          },
          comments: {
            instagram: 0,
            youtube: 0,
            tiktok: 0,
            twitter: 3,
          },
          reported_comments: {
            instagram: 0,
            youtube: 0,
            tiktok: 0,
            twitter: 5,
          },
          total_posts: 1,
          total_comments: 3,
          total_reported_comments: 5,
        },
        makeZeroDay(3, "2026-01-10"),
        makeZeroDay(4, "2026-01-11"),
        makeZeroDay(5, "2026-01-12"),
        makeZeroDay(6, "2026-01-13"),
      ],
    },
    {
      week_index: 2,
      label: "Week 2",
      start: "2026-01-14T00:00:00Z",
      end: "2026-01-20T23:59:59Z",
      week_type: "episode",
      episode_number: 2,
      days: [
        makeZeroDay(0, "2026-01-14"),
        makeZeroDay(1, "2026-01-15"),
        makeZeroDay(2, "2026-01-16"),
        makeZeroDay(3, "2026-01-17"),
        makeZeroDay(4, "2026-01-18"),
        makeZeroDay(5, "2026-01-19"),
        makeZeroDay(6, "2026-01-20"),
      ],
    },
  ],
  weekly_flags: [
    {
      week_index: 2,
      code: "zero_activity",
      severity: "info",
      message: "No posts captured in this week window.",
    },
  ],
  benchmark: {
    week_index: 2,
    current: { posts: 0, comments: 0, engagement: 0 },
    previous_week: {
      week_index: 1,
      metrics: { posts: 4, comments: 8, engagement: 1000 },
      delta_pct: { posts: -100, comments: -100, engagement: -100 },
    },
    trailing_3_week_avg: {
      window_size: 1,
      metrics: { posts: 4, comments: 8, engagement: 1000 },
      delta_pct: { posts: -100, comments: -100, engagement: -100 },
    },
    consistency_score_pct: {
      instagram: 14.3,
      youtube: 14.3,
      tiktok: 14.3,
      twitter: 14.3,
    },
  },
  platform_breakdown: [],
  themes: {
    positive: [],
    negative: [],
  },
  leaderboards: {
    bravo_content: [],
    viewer_discussion: [],
  },
  jobs: [],
};

const jsonResponse = (body: unknown): Response =>
  ({
    ok: true,
    status: 200,
    json: async () => body,
  }) as Response;

const defaultWeekDetailResponse = (weekIndex: number) => {
  if (weekIndex !== 1) {
    return {
      platforms: {
        instagram: { posts: [] },
        youtube: { posts: [] },
        tiktok: { posts: [] },
        twitter: { posts: [] },
      },
    };
  }
  return {
    platforms: {
      instagram: {
        posts: [
          {
            source_id: "ig-week1-1",
            text: "Premiere vibes #RHOSLC @bravotv",
            hashtags: ["RHOSLC"],
            mentions: ["@bravotv"],
            profile_tags: ["@housewife_1"],
            collaborators: ["@housewife_2"],
            comments_count: 5,
            total_comments_available: 5,
          },
        ],
      },
      youtube: {
        posts: [
          {
            source_id: "yt-week1-1",
            text: "Watch #RHOSLC now @BravoTV",
            hashtags: ["RHOSLC"],
            mentions: ["@BravoTV"],
            comments_count: 2,
            total_comments_available: 2,
          },
        ],
      },
      tiktok: {
        posts: [
          {
            source_id: "tt-week1-1",
            text: "Clip #TeamLisa @housewife_1",
            hashtags: ["TeamLisa"],
            mentions: ["@housewife_1"],
            comments_count: 1,
            total_comments_available: 1,
          },
        ],
      },
      twitter: {
        posts: [
          {
            source_id: "tw-week1-1",
            text: "Live thread #RHOSLC @bravoandy",
            hashtags: ["RHOSLC"],
            mentions: ["@bravoandy"],
            comments_count: 0,
            replies_count: 0,
            total_comments_available: 0,
          },
        ],
      },
    },
  };
};

function mockSeasonSocialFetch(analytics: AnalyticsPayload) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes("/social/ingest/worker-health")) return jsonResponse({ queue_enabled: false, healthy: true, healthy_workers: 1, reason: null });
    if (url.includes("/social/analytics?")) {
      return jsonResponse(analytics);
    }
    const weekDetailMatch = /\/social\/analytics\/week\/(\d+)\?/.exec(url);
    if (weekDetailMatch) {
      return jsonResponse(defaultWeekDetailResponse(Number(weekDetailMatch[1])));
    }
    if (url.includes("/social/targets?")) {
      return jsonResponse({ targets: [] });
    }
    if (url.includes("/social/jobs?")) {
      return jsonResponse({ jobs: [] });
    }
    if (url.includes("/social/runs/summary?")) {
      return jsonResponse({ summaries: [] });
    }
    if (url.includes("/social/runs?")) {
      return jsonResponse({ runs: [] });
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
  return fetchMock;
}

describe("SeasonSocialAnalyticsSection weekly trend", () => {
  beforeEach(() => {
    routerReplaceMock.mockClear();
    window.localStorage.clear();
    (auth as unknown as { currentUser?: { getIdToken: () => Promise<string> } }).currentUser = {
      getIdToken: vi.fn().mockResolvedValue("test-token"),
    };
    window.history.replaceState({}, "", "/shows/show-1/s6/social/bravo");
  });

  afterEach(() => {
    if (vi.isFakeTimers()) {
      vi.clearAllTimers();
    }
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders daily heatmap rows with zero-value squares visible", async () => {
    mockSeasonSocialFetch(analyticsBase);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Weekly Trend")).toBeInTheDocument();
    });

    const weekTwoRow = screen.getByTestId("weekly-heatmap-row-2");
    expect(within(weekTwoRow).getAllByTestId(/weekly-heatmap-day-2-/)).toHaveLength(7);
    expect(within(weekTwoRow).getByText("JAN 14")).toBeInTheDocument();
    const zeroTile = within(weekTwoRow).getByTestId("weekly-heatmap-day-2-0").firstElementChild;
    expect(zeroTile?.className).toContain("bg-zinc-200");
    expect(within(weekTwoRow).getByTestId("weekly-heatmap-total-2")).toHaveTextContent("0 posts");
  });

  it("renders section skeletons before analytics resolve", async () => {
    mockSeasonSocialFetch(analyticsBase);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    expect(screen.getByTestId("social-analytics-skeleton")).toBeInTheDocument();
    await screen.findByText("Weekly Trend");
  });

  it("formats summary count cards with comma separators", async () => {
    mockSeasonSocialFetch({
      ...analyticsBase,
      summary: {
        ...analyticsBase.summary,
        total_posts: 1025,
        total_comments: 41725,
        total_engagement: 129_514_143,
      },
    });

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    expect(await screen.findByText("1,025")).toBeInTheDocument();
    expect(screen.getByText("41,725")).toBeInTheDocument();
    expect(screen.getByText("129,514,143")).toBeInTheDocument();
  });

  it("requires two consecutive poll failures before setting retry state", () => {
    expect(shouldSetPollingRetry(0)).toBe(false);
    expect(shouldSetPollingRetry(1)).toBe(false);
    expect(shouldSetPollingRetry(2)).toBe(true);
  });

  it("builds unique in-flight request keys across filter/scope/view changes", () => {
    const base = buildSocialRequestKey({
      seasonId: "season-1",
      sourceScope: "bravo",
      platformFilter: "all",
      weekFilter: "all",
      analyticsView: "bravo",
    });
    const differentWeek = buildSocialRequestKey({
      seasonId: "season-1",
      sourceScope: "bravo",
      platformFilter: "all",
      weekFilter: 2,
      analyticsView: "bravo",
    });
    const differentPlatform = buildSocialRequestKey({
      seasonId: "season-1",
      sourceScope: "bravo",
      platformFilter: "youtube",
      weekFilter: "all",
      analyticsView: "bravo",
    });
    const differentScope = buildRunsRequestKey({
      seasonId: "season-1",
      sourceScope: "creator",
    });
    const baseRuns = buildRunsRequestKey({
      seasonId: "season-1",
      sourceScope: "bravo",
    });

    expect(base).not.toBe(differentWeek);
    expect(base).not.toBe(differentPlatform);
    expect(baseRuns).not.toBe(differentScope);
  });

  it("builds weekly table links to canonical week detail routes", async () => {
    mockSeasonSocialFetch(analyticsBase);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />
    );

    const weekOneLink = await screen.findByRole("link", { name: /Week 1/i });
    const href = weekOneLink.getAttribute("href") ?? "";

    expect(href).toContain("/shows/show-1/s6/social/week/1");
    expect(href).toContain("source_scope=bravo");
    expect(href).toContain("season_id=season-1");
    expect(href).not.toContain("?tab=social/week");
  });

  it("preserves active platform tab in week detail links", async () => {
    mockSeasonSocialFetch(analyticsBase);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    await screen.findByText("Weekly Trend");
    const platformTabs = screen.getByRole("navigation");
    fireEvent.click(within(platformTabs).getByRole("button", { name: "YouTube" }));

    const weekOneLink = await screen.findByRole("link", { name: /Week 1/i });
    const href = weekOneLink.getAttribute("href") ?? "";
    expect(href).toContain("social_platform=youtube");
  });

  it("renders BYE WEEK labels from backend weekly payloads", async () => {
    const byePayload: AnalyticsPayload = {
      ...analyticsBase,
      weekly: analyticsBase.weekly.map((row) =>
        row.week_index === 2
          ? {
              ...row,
              label: "BYE WEEK (Jan 15-Jan 22)",
              week_type: "bye",
              episode_number: null,
            }
          : row,
      ),
      weekly_platform_posts: analyticsBase.weekly_platform_posts.map((row) =>
        row.week_index === 2
          ? {
              ...row,
              label: "BYE WEEK (Jan 15-Jan 22)",
              week_type: "bye",
              episode_number: null,
            }
          : row,
      ),
      weekly_daily_activity: analyticsBase.weekly_daily_activity.map((row) =>
        row.week_index === 2
          ? {
              ...row,
              label: "BYE WEEK (Jan 15-Jan 22)",
              week_type: "bye",
              episode_number: null,
            }
          : row,
      ),
    };
    mockSeasonSocialFetch(byePayload);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    const byeWeekLink = await screen.findByRole("link", {
      name: /bye week/i,
    });
    expect(byeWeekLink.getAttribute("href") ?? "").toContain("/social/week/2");
    expect(screen.getAllByText(/BYE WEEK/i).length).toBeGreaterThan(0);
  });

  it("renders preseason and postseason episode labels in the weekly table", async () => {
    const payload: AnalyticsPayload = {
      ...analyticsBase,
      weekly_platform_posts: [
        {
          week_index: 0,
          label: "Pre-Season",
          start: "2025-08-14T00:00:00Z",
          end: "2025-09-16T23:59:59Z",
          week_type: "preseason",
          episode_number: null,
          posts: { instagram: 1, youtube: 0, tiktok: 0, twitter: 0 },
          comments: { instagram: 1, youtube: 0, tiktok: 0, twitter: 0 },
          total_posts: 1,
          total_comments: 1,
        },
        ...analyticsBase.weekly_platform_posts,
        {
          week_index: 3,
          label: "Week 3",
          start: "2026-01-21T00:00:00Z",
          end: "2026-01-27T23:59:59Z",
          week_type: "postseason",
          episode_number: null,
          posts: { instagram: 0, youtube: 0, tiktok: 0, twitter: 0 },
          comments: { instagram: 0, youtube: 0, tiktok: 0, twitter: 0 },
          total_posts: 0,
          total_comments: 0,
        },
      ],
      weekly_platform_engagement: [
        {
          week_index: 0,
          label: "Pre-Season",
          start: "2025-08-14T00:00:00Z",
          end: "2025-09-16T23:59:59Z",
          engagement: { instagram: 10, youtube: 0, tiktok: 0, twitter: 0 },
          total_engagement: 10,
          has_data: true,
        },
        ...analyticsBase.weekly_platform_engagement,
        {
          week_index: 3,
          label: "Week 3",
          start: "2026-01-21T00:00:00Z",
          end: "2026-01-27T23:59:59Z",
          engagement: { instagram: 0, youtube: 0, tiktok: 0, twitter: 0 },
          total_engagement: 0,
          has_data: false,
        },
      ],
    };
    mockSeasonSocialFetch(payload);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    const preseasonLink = await screen.findByRole("link", { name: /Episode 0/i });
    expect(preseasonLink).toBeInTheDocument();
    const preseasonRow = preseasonLink.closest("tr");
    expect(preseasonRow).not.toBeNull();
    expect(within(preseasonRow as HTMLElement).getByText("Pre-Season")).toBeInTheDocument();

    const postseasonLink = await screen.findByRole("link", { name: /Post-Season/i });
    expect(postseasonLink).toBeInTheDocument();
    const postseasonRow = postseasonLink.closest("tr");
    expect(postseasonRow).not.toBeNull();
    expect(within(postseasonRow as HTMLElement).getByText("Week 3")).toBeInTheDocument();
  });

  it("wraps long pre-season periods into 7-day rows in Comfortable view", async () => {
    const preseasonDates = [
      "2025-08-14",
      "2025-08-15",
      "2025-08-16",
      "2025-08-17",
      "2025-08-18",
      "2025-08-19",
      "2025-08-20",
      "2025-08-21",
      "2025-08-22",
      "2025-08-23",
      "2025-08-24",
      "2025-08-25",
    ];
    const payload: AnalyticsPayload = {
      ...analyticsBase,
      weekly_daily_activity: [
        {
          week_index: 0,
          label: "Pre-Season",
          start: "2025-08-14T12:00:00Z",
          end: "2025-09-16T12:00:00Z",
          week_type: "preseason",
          episode_number: null,
          days: preseasonDates.map((date, index) => ({
            ...makeZeroDay(index, date),
            total_posts: index === 0 ? 1 : 0,
          })),
        },
        ...analyticsBase.weekly_daily_activity,
      ],
    };
    mockSeasonSocialFetch(payload);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    await screen.findByTestId("weekly-heatmap-row-0");
    fireEvent.click(screen.getByRole("button", { name: "Comfortable" }));

    const preseasonRow = screen.getByTestId("weekly-heatmap-row-0");
    const preseasonDays = within(preseasonRow).getAllByTestId(/weekly-heatmap-day-0-/);
    expect(preseasonDays).toHaveLength(12);

    const dayGrid = within(preseasonRow).getByTestId("weekly-heatmap-day-0-0").parentElement;
    expect(dayGrid).not.toBeNull();
    expect(dayGrid).toHaveClass("grid-cols-7");
  });

  it("renders BYE weeks as their own week sections with week numbers", async () => {
    const byePostsByDay = [4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3];
    const byeCommentsByDay = [40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 38];
    const byeDays = byePostsByDay.map((posts, index) => {
      const dayNumber = 16 + index;
      const dateLocal = `2025-12-${String(dayNumber).padStart(2, "0")}`;
      return {
        ...makeZeroDay(index, dateLocal),
        total_posts: posts,
        total_comments: byeCommentsByDay[index],
      };
    });
    const payload: AnalyticsPayload = {
      ...analyticsBase,
      weekly_daily_activity: [
        analyticsBase.weekly_daily_activity[0],
        {
          week_index: 14,
          label: "BYE WEEK (Dec 16-Dec 30)",
          start: "2025-12-16T12:00:00Z",
          end: "2025-12-30T12:00:00Z",
          week_type: "bye",
          episode_number: null,
          days: byeDays,
        },
      ],
    };
    mockSeasonSocialFetch(payload);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    const byeWeekRow = await screen.findByTestId("weekly-heatmap-row-14");
    expect(within(byeWeekRow).getByText("Week 14")).toBeInTheDocument();
    expect(within(byeWeekRow).getByText("BYE WEEK")).toBeInTheDocument();
    expect(within(byeWeekRow).getByTestId("weekly-heatmap-total-14")).toHaveTextContent("43 posts");
    expect(within(byeWeekRow).getByTestId("weekly-heatmap-comments-total-14")).toHaveTextContent("558 comments");
  });

  it("renders premiere and episode/bye metadata tags in the heatmap header", async () => {
    const payload: AnalyticsPayload = {
      ...analyticsBase,
      weekly_daily_activity: analyticsBase.weekly_daily_activity.map((row) =>
        row.week_index === 2
          ? {
              ...row,
              week_type: "bye",
              episode_number: null,
            }
          : row,
      ),
    };
    mockSeasonSocialFetch(payload);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    await screen.findByTestId("weekly-heatmap-row-1");
    expect(screen.getByText("PREMIERE WEEK")).toBeInTheDocument();
    expect(screen.getByText("BYE WEEK")).toBeInTheDocument();
  });

  it("renders platform tabs as the first control row and hides filter/season-id cards", async () => {
    mockSeasonSocialFetch(analyticsBase);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    const nav = await screen.findByRole("navigation");
    expect(within(nav).getByRole("button", { name: "Overview" })).toBeInTheDocument();
    expect(screen.queryByText("Filters")).not.toBeInTheDocument();
    expect(screen.queryByText("Season Details")).not.toBeInTheDocument();
    expect(screen.queryByText("Season ID")).not.toBeInTheDocument();
  });

  it("renders actionable current run empty state controls", async () => {
    mockSeasonSocialFetch(analyticsBase);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    await screen.findByText("Current Run");
    expect(screen.getByText("No run selected.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start New Ingest" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Select Latest Run" })).not.toBeInTheDocument();
  });

  it("selects latest active run from current run empty state action", async () => {
    const activeRunId = "run-active-123";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/social/ingest/worker-health")) return jsonResponse({ queue_enabled: false, healthy: true, healthy_workers: 1, reason: null });
      if (url.includes("/social/analytics?")) return jsonResponse(analyticsBase);
      if (url.includes("/social/targets?")) return jsonResponse({ targets: [] });
      if (url.includes("/social/jobs?")) return jsonResponse({ jobs: [] });
      if (url.includes("/social/runs/summary?")) return jsonResponse({ summaries: [] });
      if (url.includes("/social/runs?")) {
        return jsonResponse({
          runs: [
            { id: "run-completed-999", status: "completed", created_at: "2026-02-16T10:00:00Z" },
            { id: activeRunId, status: "running", created_at: "2026-02-17T10:00:00Z" },
          ],
        });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    const selectLatestButton = await screen.findByRole("button", { name: "Select Latest Run" });
    fireEvent.click(selectLatestButton);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /Run/i })).toHaveValue(activeRunId);
    });
  });

  it("renders last updated and window under the season title", async () => {
    mockSeasonSocialFetch(analyticsBase);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    await screen.findByText("Last Updated");
    const windowLabels = screen.getAllByText("Window");
    expect(windowLabels.length).toBeGreaterThan(0);
    const windowValue = windowLabels[0].parentElement?.querySelector("dd");
    expect(windowValue?.textContent).toContain("to");
  });

  it("preselects tab from social_platform query param and updates URL on tab change", async () => {
    window.history.replaceState(
      {},
      "",
      "/shows/show-1/s6/social/bravo?social_platform=youtube",
    );
    mockSeasonSocialFetch(analyticsBase);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    await screen.findByText("YouTube Posts Schedule");

    const platformTabs = screen.getByRole("navigation");
    fireEvent.click(within(platformTabs).getByRole("button", { name: "Instagram" }));
    expect(window.location.search).toContain("social_platform=instagram");
  });

  it("supports controlled platform tabs without mutating URL and allows hiding internal tabs", async () => {
    mockSeasonSocialFetch(analyticsBase);
    const onPlatformTabChange = vi.fn();
    window.history.replaceState({}, "", "/shows/show-1/s6/social/bravo");

    const { rerender } = render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
        platformTab="overview"
        onPlatformTabChange={onPlatformTabChange}
      />,
    );

    const platformTabs = await screen.findByRole("navigation");
    fireEvent.click(within(platformTabs).getByRole("button", { name: "YouTube" }));
    expect(onPlatformTabChange).toHaveBeenCalledWith("youtube");
    expect(window.location.search).not.toContain("social_platform=youtube");

    rerender(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
        platformTab="youtube"
        onPlatformTabChange={onPlatformTabChange}
        hidePlatformTabs={true}
      />,
    );

    await screen.findByText("YouTube Posts Schedule");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("supports Post, Comment, and Completeness heatmap metrics", async () => {
    mockSeasonSocialFetch(analyticsBase);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />
    );

    await screen.findByTestId("weekly-heatmap-row-1");
    expect(screen.getByTestId("weekly-heatmap-total-1")).toHaveTextContent("4 posts");
    expect(screen.getByTestId("weekly-heatmap-comments-total-1")).toHaveTextContent("8 comments");

    fireEvent.click(screen.getByRole("button", { name: "Comment Count" }));
    expect(screen.getByTestId("weekly-heatmap-total-1")).toHaveTextContent("4 posts");

    fireEvent.click(screen.getByRole("button", { name: "Completeness" }));
    const tile = screen.getByTestId("weekly-heatmap-day-1-0").firstElementChild;
    expect(tile?.className).toContain("bg-red-600");
  });

  it("renders data quality badges and supports density query toggle", async () => {
    mockSeasonSocialFetch(analyticsBase);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    const coverageLabel = await screen.findByText("Coverage");
    const coverageCard = coverageLabel.closest("div");
    expect(coverageCard).not.toBeNull();
    expect(within(coverageCard as HTMLElement).getByText("40.0%")).toBeInTheDocument();
    expect(screen.getByText("2h ago")).toBeInTheDocument();

    const comfortableButton = screen.getByRole("button", { name: "Comfortable" });
    expect(comfortableButton.className).toContain("bg-white");
    expect(window.location.search).not.toContain("social_density=");

    fireEvent.click(screen.getByRole("button", { name: "Compact" }));
    expect(window.location.search).toContain("social_density=compact");

    fireEvent.click(screen.getByRole("button", { name: "Comfortable" }));
    expect(window.location.search).not.toContain("social_density=");

    const tile = screen.getByTestId("weekly-heatmap-day-1-0").firstElementChild;
    expect(tile?.className).toContain("w-full");
  });

  it("shows weekly flag chips and can hide them via alerts toggle", async () => {
    mockSeasonSocialFetch(analyticsBase);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    await screen.findByText("zero activity");
    fireEvent.click(screen.getByRole("button", { name: "Alerts On" }));
    expect(window.location.search).toContain("social_alerts=off");
    expect(screen.queryByText("zero activity")).not.toBeInTheDocument();
  });

  it("hides drop and comment gap weekly pills", async () => {
    mockSeasonSocialFetch({
      ...analyticsBase,
      weekly_flags: [
        { week_index: 1, code: "zero_activity", severity: "info", message: "No posts." },
        { week_index: 1, code: "spike", severity: "warn", message: "Spike." },
        { week_index: 1, code: "drop", severity: "warn", message: "Drop." },
        { week_index: 1, code: "comment_gap", severity: "warn", message: "Gap." },
      ],
    });

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    await screen.findByText("zero activity");
    expect(screen.getByText("spike")).toBeInTheDocument();
    expect(screen.queryByText("drop")).not.toBeInTheDocument();
    expect(screen.queryByText("comment gap")).not.toBeInTheDocument();
  });

  it("renders episode-oriented weekly table with metric lines under each platform and total progress", async () => {
    mockSeasonSocialFetch(analyticsBase);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />
    );

    expect(await screen.findByRole("columnheader", { name: "Episode" })).toBeInTheDocument();
    expect(await screen.findByRole("columnheader", { name: "PROGRESS" })).toBeInTheDocument();
    expect(screen.queryByText(/saved to DB/i)).not.toBeInTheDocument();
    const weekOneLink = await screen.findByRole("link", { name: /S6\.E1/i });
    expect(weekOneLink).toBeInTheDocument();
    expect(screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{2} - \d{1,2}\/\d{1,2}\/\d{2}/).length).toBeGreaterThan(0);

    const weekOneRow = weekOneLink.closest("tr");
    expect(weekOneRow).not.toBeNull();
    const weekOne = within(weekOneRow as HTMLElement);
    expect(weekOne.getByText("Week 1")).toBeInTheDocument();
    expect(weekOne.getByTestId("weekly-platform-metrics-instagram-1")).toHaveTextContent("1 post");
    expect(weekOne.getByTestId("weekly-platform-metrics-instagram-1")).toHaveTextContent("100 likes");
    expect(weekOne.getByTestId("weekly-platform-metrics-instagram-1")).toHaveTextContent("5 comments");
    expect(weekOne.getByTestId("weekly-platform-metrics-instagram-1")).toHaveTextContent("1 hashtag");
    expect(weekOne.getByTestId("weekly-platform-metrics-instagram-1")).toHaveTextContent("1 mention");
    expect(weekOne.getByTestId("weekly-platform-metrics-instagram-1")).toHaveTextContent("2 tags");
    await waitFor(() => {
      expect(weekOne.getByTestId("weekly-total-metrics-1")).toHaveTextContent("4 posts");
      expect(weekOne.getByTestId("weekly-total-metrics-1")).toHaveTextContent("1,000 likes");
      expect(weekOne.getByTestId("weekly-total-metrics-1")).toHaveTextContent("20 comments");
      expect(weekOne.getByTestId("weekly-total-metrics-1")).toHaveTextContent("2 hashtags");
      expect(weekOne.getByTestId("weekly-total-metrics-1")).toHaveTextContent("3 mentions");
      expect(weekOne.getByTestId("weekly-total-metrics-1")).toHaveTextContent("2 tags");
    });
    expect(weekOne.getByTestId("weekly-total-progress-1")).toHaveTextContent("90.0%");
    const weekOneMissingMetrics = weekOne.getByTestId("weekly-missing-metrics-1");
    expect(weekOneMissingMetrics).toHaveTextContent("0 posts");
    expect(weekOneMissingMetrics).toHaveTextContent("0 likes");
    expect(weekOneMissingMetrics).toHaveTextContent("12 comments");
    expect(weekOneMissingMetrics).toHaveTextContent("-- hashtags");
    expect(weekOneMissingMetrics).toHaveTextContent("-- mentions");
    expect(weekOneMissingMetrics).toHaveTextContent("-- tags");

    const weekTwoRow = (await screen.findByRole("link", { name: /S6\.E2/i })).closest("tr");
    expect(weekTwoRow).not.toBeNull();
    const weekTwo = within(weekTwoRow as HTMLElement);
    expect(weekTwo.getByTestId("weekly-total-progress-2")).toHaveTextContent("-");
    await waitFor(() => {
      expect(weekTwo.getByTestId("weekly-total-metrics-2")).toHaveTextContent("0 posts");
      expect(weekTwo.getByTestId("weekly-total-metrics-2")).toHaveTextContent("0 likes");
      expect(weekTwo.getByTestId("weekly-total-metrics-2")).toHaveTextContent("0 comments");
      expect(weekTwo.getByTestId("weekly-total-metrics-2")).toHaveTextContent("0 hashtags");
      expect(weekTwo.getByTestId("weekly-total-metrics-2")).toHaveTextContent("0 mentions");
      expect(weekTwo.getByTestId("weekly-total-metrics-2")).toHaveTextContent("0 tags");
    });
    expect(weekTwo.queryByTestId("weekly-missing-metrics-2")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Sync Metrics" })).toHaveLength(2);
  });

  it("persists selected progress metrics in the social_metrics query param", async () => {
    mockSeasonSocialFetch(analyticsBase);

    const { rerender } = render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    const metricsFilter = await screen.findByTestId("weekly-bravo-metric-filter");
    const weekOneMetricsLine = await screen.findByTestId("weekly-total-metrics-1");
    await waitFor(() => {
      expect(weekOneMetricsLine).toHaveTextContent("2 hashtags");
    });
    expect(new URLSearchParams(window.location.search).get("social_metrics")).toBeNull();

    fireEvent.click(within(metricsFilter).getByRole("button", { name: "Hashtags" }));
    await waitFor(() => {
      const metricsParam = new URLSearchParams(window.location.search).get("social_metrics");
      expect(metricsParam).toBe("posts,likes,comments,mentions,tags");
    });
    rerender(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );
    await waitFor(() => {
      expect(weekOneMetricsLine).not.toHaveTextContent(/hashtags/i);
    });

    fireEvent.click(within(metricsFilter).getByRole("button", { name: "Hashtags" }));
    await waitFor(() => {
      const metricsParam = new URLSearchParams(window.location.search).get("social_metrics");
      expect(metricsParam).toBeNull();
    });
    rerender(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );
    await waitFor(() => {
      expect(weekOneMetricsLine).toHaveTextContent("2 hashtags");
    });
  });

  it("persists social_metric_mode in the URL and switches comments between total and saved values", async () => {
    window.history.replaceState(
      {},
      "",
      "/admin/trr-shows/show-1/seasons/6?tab=social&social_metric_mode=saved",
    );
    mockSeasonSocialFetch(analyticsBase);

    const { rerender } = render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    const weekOneMetricsLine = await screen.findByTestId("weekly-total-metrics-1");
    expect(new URLSearchParams(window.location.search).get("social_metric_mode")).toBe("saved");
    expect(weekOneMetricsLine).toHaveTextContent("8 comments");

    fireEvent.click(screen.getByRole("button", { name: "Total" }));
    rerender(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );
    await waitFor(() => {
      expect(new URLSearchParams(window.location.search).get("social_metric_mode")).toBeNull();
      expect(weekOneMetricsLine).toHaveTextContent("20 comments");
    });

    fireEvent.click(screen.getByRole("button", { name: "Saved" }));
    rerender(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );
    await waitFor(() => {
      expect(new URLSearchParams(window.location.search).get("social_metric_mode")).toBe("saved");
      expect(weekOneMetricsLine).toHaveTextContent("8 comments");
    });
  });

  it("supports Select All / Deselect all metric controls", async () => {
    mockSeasonSocialFetch(analyticsBase);

    const { rerender } = render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    const weekOneMetricsLine = await screen.findByTestId("weekly-total-metrics-1");
    const deselectAllButton = await screen.findByRole("button", { name: "Deselect all" });
    fireEvent.click(deselectAllButton);
    rerender(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );
    await waitFor(() => {
      expect(new URLSearchParams(window.location.search).get("social_metrics")).toBe("none");
      expect(weekOneMetricsLine).toHaveTextContent("No metrics selected");
    });

    const selectAllButton = await screen.findByRole("button", { name: "Select All" });
    fireEvent.click(selectAllButton);
    rerender(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );
    await waitFor(() => {
      expect(new URLSearchParams(window.location.search).get("social_metrics")).toBeNull();
      expect(weekOneMetricsLine).toHaveTextContent("4 posts");
      expect(weekOneMetricsLine).toHaveTextContent("1,000 likes");
    });
  });

  it("fetches week detail payloads when detail metrics are selected", async () => {
    const fetchMock = mockSeasonSocialFetch(analyticsBase);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    await screen.findByTestId("weekly-total-metrics-1");
    await waitFor(() => {
      const weekDetailCalls = fetchMock.mock.calls.filter(([input]) =>
        String(input).includes("/social/analytics/week/"),
      ).length;
      expect(weekDetailCalls).toBeGreaterThan(0);
    });
  });

  it("fetches week detail payloads in hashtags view even when only posts/likes/comments metrics are selected", async () => {
    window.history.replaceState(
      {},
      "",
      "/shows/show-1/s6/social/bravo?social_view=hashtags&social_metrics=posts,likes,comments",
    );
    const fetchMock = mockSeasonSocialFetch(analyticsBase);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
        analyticsView="hashtags"
      />,
    );

    await screen.findByTestId("hashtag-insights-total-uses");
    await waitFor(() => {
      const weekDetailCalls = fetchMock.mock.calls.filter(([input]) =>
        String(input).includes("/social/analytics/week/"),
      ).length;
      expect(weekDetailCalls).toBeGreaterThan(0);
    });
  });

  it("skips week detail payload fetches when only posts/likes/comments metrics are selected", async () => {
    window.history.replaceState(
      {},
      "",
      "/shows/show-1/s6/social/bravo?social_metrics=posts,likes,comments",
    );
    const fetchMock = mockSeasonSocialFetch(analyticsBase);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    const weekOneMetricsLine = await screen.findByTestId("weekly-total-metrics-1");
    expect(weekOneMetricsLine).toHaveTextContent("4 posts");
    expect(weekOneMetricsLine).toHaveTextContent("1,000 likes");
    expect(weekOneMetricsLine).toHaveTextContent("20 comments");
    expect(weekOneMetricsLine).not.toHaveTextContent(/hashtags|mentions|tags/i);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const weekDetailCalls = fetchMock.mock.calls.filter(([input]) =>
      String(input).includes("/social/analytics/week/"),
    ).length;
    expect(weekDetailCalls).toBe(0);
  });

  it("shows -- fallback for detail metrics while week detail data is loading", async () => {
    const weekDetailResolvers = new Map<number, () => void>();
    const deferredFetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/social/ingest/worker-health")) {
        return jsonResponse({ queue_enabled: false, healthy: true, healthy_workers: 1, reason: null });
      }
      if (url.includes("/social/analytics?")) return jsonResponse(analyticsBase);
      const weekDetailMatch = /\/social\/analytics\/week\/(\d+)\?/.exec(url);
      if (weekDetailMatch) {
        const weekIndex = Number(weekDetailMatch[1]);
        return new Promise<Response>((resolve) => {
          weekDetailResolvers.set(weekIndex, () => resolve(jsonResponse(defaultWeekDetailResponse(weekIndex))));
        });
      }
      if (url.includes("/social/targets?")) return jsonResponse({ targets: [] });
      if (url.includes("/social/jobs?")) return jsonResponse({ jobs: [] });
      if (url.includes("/social/runs/summary?")) return jsonResponse({ summaries: [] });
      if (url.includes("/social/runs?")) return jsonResponse({ runs: [] });
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", deferredFetchMock as unknown as typeof fetch);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    const weekOneMetricsLine = await screen.findByTestId("weekly-total-metrics-1");
    await waitFor(() => {
      expect(weekOneMetricsLine).toHaveTextContent("-- hashtags");
      expect(weekOneMetricsLine).toHaveTextContent("-- mentions");
      expect(weekOneMetricsLine).toHaveTextContent("-- tags");
    });

    act(() => {
      weekDetailResolvers.get(1)?.();
      weekDetailResolvers.get(2)?.();
    });

    await waitFor(() => {
      expect(weekOneMetricsLine).toHaveTextContent("2 hashtags");
      expect(weekOneMetricsLine).toHaveTextContent("3 mentions");
      expect(weekOneMetricsLine).toHaveTextContent("2 tags");
    });
  });

  it("renders week date ranges under weekly heatmap headers", async () => {
    mockSeasonSocialFetch(analyticsBase);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    await screen.findByTestId("weekly-heatmap-row-1");
    const dateLabels = screen.getAllByText(/Jan \d{1,2} to Jan \d{1,2}/);
    expect(dateLabels.length).toBeGreaterThan(0);
  });

  it("shows Up-to-Date when platform coverage reaches 100%", async () => {
    const analyticsUpToDate: AnalyticsPayload = {
      ...analyticsBase,
      weekly_platform_posts: analyticsBase.weekly_platform_posts.map((row) =>
        row.week_index === 1
          ? {
              ...row,
              comments: {
                instagram: 5,
                youtube: 5,
                tiktok: 5,
                twitter: 5,
              },
              reported_comments: {
                ...(row.reported_comments ?? {
                  instagram: 0,
                  youtube: 0,
                  tiktok: 0,
                  twitter: 0,
                }),
                instagram: 5,
                youtube: 5,
                tiktok: 5,
                twitter: 5,
              },
              total_comments: 20,
              total_reported_comments: 20,
              comments_saved_pct: 100.0,
            }
          : row,
      ),
    };
    mockSeasonSocialFetch(analyticsUpToDate);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    const upToDateLabels = await screen.findAllByText("Up-to-Date");
    expect(upToDateLabels.length).toBeGreaterThan(0);
    const weekOneRow = (await screen.findByRole("link", { name: /Week 1/i })).closest("tr");
    expect(weekOneRow).not.toBeNull();
    const weekOne = within(weekOneRow as HTMLElement);
    expect(weekOne.getByTestId("weekly-total-progress-1")).toHaveTextContent("100.0%");
    expect(weekOne.queryByTestId("weekly-missing-metrics-1")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Sync Metrics" })).toHaveLength(2);
  });

  it("flags stale active runs older than 45 minutes with pending/retrying counts", async () => {
    const staleTime = new Date(Date.now() - 120 * 60 * 1000).toISOString();
    const runId = "run-stale-001";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/social/ingest/worker-health")) {
        return jsonResponse({ queue_enabled: false, healthy: true, healthy_workers: 1, reason: null });
      }
      if (url.includes("/social/analytics?")) return jsonResponse(analyticsBase);
      if (url.includes("/social/targets?")) return jsonResponse({ targets: [] });
      if (url.includes("/social/runs/summary?")) return jsonResponse({ summaries: [] });
      if (url.includes("/social/runs?")) {
        return jsonResponse({
          runs: [
            {
              id: runId,
              status: "running",
              created_at: staleTime,
              updated_at: staleTime,
            },
          ],
        });
      }
      if (url.includes("/social/jobs?")) {
        return jsonResponse({
          jobs: [
            {
              id: "job-1",
              run_id: runId,
              platform: "instagram",
              status: "pending",
              created_at: staleTime,
              updated_at: staleTime,
            },
            {
              id: "job-2",
              run_id: runId,
              platform: "youtube",
              status: "retrying",
              created_at: staleTime,
              updated_at: staleTime,
            },
          ],
        });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Potentially stalled ingest runs/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/pending \d+ · retrying \d+/)).toBeInTheDocument();
  });

  it("does not flag active runs newer than the stale threshold", async () => {
    const freshTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/social/ingest/worker-health")) {
        return jsonResponse({ queue_enabled: false, healthy: true, healthy_workers: 1, reason: null });
      }
      if (url.includes("/social/analytics?")) return jsonResponse(analyticsBase);
      if (url.includes("/social/targets?")) return jsonResponse({ targets: [] });
      if (url.includes("/social/runs/summary?")) return jsonResponse({ summaries: [] });
      if (url.includes("/social/runs?")) {
        return jsonResponse({
          runs: [
            {
              id: "run-fresh-001",
              status: "running",
              created_at: freshTime,
              updated_at: freshTime,
            },
          ],
        });
      }
      if (url.includes("/social/jobs?")) {
        return jsonResponse({
          jobs: [
            {
              id: "job-fresh-1",
              run_id: "run-fresh-001",
              platform: "instagram",
              status: "pending",
              created_at: freshTime,
              updated_at: freshTime,
            },
          ],
        });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    await screen.findByRole("link", { name: /Week 1/i });
    expect(screen.queryByText(/Potentially stalled ingest runs/i)).not.toBeInTheDocument();
  });

  it("disables weekly Run Week and Sync Metrics actions when queue workers are unhealthy", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/social/ingest/worker-health")) {
        return jsonResponse({
          queue_enabled: true,
          healthy: false,
          healthy_workers: 0,
          reason: "no_healthy_workers",
        });
      }
      if (url.includes("/social/analytics?")) return jsonResponse(analyticsBase);
      if (url.includes("/social/targets?")) return jsonResponse({ targets: [] });
      if (url.includes("/social/jobs?")) return jsonResponse({ jobs: [] });
      if (url.includes("/social/runs/summary?")) return jsonResponse({ summaries: [] });
      if (url.includes("/social/runs?")) return jsonResponse({ runs: [] });
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/disabled until workers recover/i)).toBeInTheDocument();
    });

    screen.getAllByRole("button", { name: "Run Week" }).forEach((button) => {
      expect(button).toBeDisabled();
    });
    screen.getAllByRole("button", { name: "Sync Metrics" }).forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it("hydrates from cached social snapshot and suppresses transient timeout banners", async () => {
    const cacheKey = "trr:season-social-analytics:v1:show-1:6:season-1:bravo:all:all";
    window.localStorage.setItem(
      cacheKey,
      JSON.stringify({
        version: 1,
        saved_at: "2026-02-24T11:00:00.000Z",
        analytics: analyticsBase,
        runs: [],
        targets: [],
        last_updated: "2026-02-24T11:00:00.000Z",
        section_last_success_at: {
          analytics: "2026-02-24T11:00:00.000Z",
          targets: "2026-02-24T11:00:00.000Z",
          runs: "2026-02-24T11:00:00.000Z",
        },
      }),
    );

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/social/ingest/worker-health")) return jsonResponse({ queue_enabled: false, healthy: true, healthy_workers: 1, reason: null });
      if (url.includes("/social/analytics?")) {
        throw new Error("Social analytics request timed out");
      }
      if (url.includes("/social/targets?")) {
        throw new Error("Social targets request timed out");
      }
      if (url.includes("/social/runs?")) {
        throw new Error("Social runs request timed out");
      }
      if (url.includes("/social/jobs?")) {
        return jsonResponse({ jobs: [] });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    await screen.findByText("Weekly Trend");
    await waitFor(() => {
      expect(
        screen.getByText("Showing last successful social data while live refresh retries."),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Social analytics request timed out")).not.toBeInTheDocument();
    expect(screen.queryByText("Social targets request timed out")).not.toBeInTheDocument();
    expect(screen.queryByText("Social runs request timed out")).not.toBeInTheDocument();
  });

  it("uses platform-specific day values and shows YouTube posts schedule label", async () => {
    mockSeasonSocialFetch(analyticsBase);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />
    );

    await screen.findByTestId("weekly-heatmap-row-1");
    const platformTabs = screen.getByRole("navigation");
    fireEvent.click(within(platformTabs).getByRole("button", { name: "YouTube" }));

    await screen.findByText("YouTube Posts Schedule");
    expect(screen.getByTestId("weekly-heatmap-total-1")).toHaveTextContent("1 posts");
  });

  it("shows compatibility message when daily schedule payload is missing", async () => {
    const analyticsWithoutDaily = {
      ...analyticsBase,
      weekly_daily_activity: [],
    } satisfies AnalyticsPayload;

    mockSeasonSocialFetch(analyticsWithoutDaily);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />
    );

    expect(await screen.findByTestId("weekly-heatmap-unavailable")).toHaveTextContent(
      "Daily schedule unavailable for the current view."
    );
  });

  it("switches rendered sections by analyticsView", async () => {
    mockSeasonSocialFetch(analyticsBase);

    const { rerender } = render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
        analyticsView="advanced"
      />,
    );

    await screen.findByText("Ingest + Export");
    expect(screen.queryByText("Top Sentiment Drivers")).not.toBeInTheDocument();
    expect(screen.queryByText("Weekly Trend")).not.toBeInTheDocument();

    rerender(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
        analyticsView="sentiment"
      />,
    );

    await screen.findByText("Top Sentiment Drivers");
    expect(screen.queryByText("Ingest + Export")).not.toBeInTheDocument();
    expect(screen.getByText("Viewer Discussion Highlights")).toBeInTheDocument();

    rerender(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
        analyticsView="bravo"
      />,
    );

    await screen.findByText("Weekly Trend");
    const ingestHeading = screen.getByRole("heading", { name: "Ingest + Export" });
    const weeklyTrendHeading = screen.getByRole("heading", { name: "Weekly Trend" });
    expect(ingestHeading).toBeInTheDocument();
    expect(
      Boolean(ingestHeading.compareDocumentPosition(weeklyTrendHeading) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);

    rerender(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
        analyticsView="reddit"
      />,
    );

    expect(await screen.findByTestId("reddit-sources-manager")).toBeInTheDocument();
    expect(screen.queryByText("Weekly Trend")).not.toBeInTheDocument();
    expect(screen.queryByText("Current Run")).not.toBeInTheDocument();
    expect(screen.queryByText("Season Details")).not.toBeInTheDocument();
    expect(screen.queryByText("Filters")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Overview" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Instagram" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "TikTok" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Twitter/X" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "YouTube" })).not.toBeInTheDocument();
  });

  it("renders advanced run health and benchmark panel", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/social/ingest/worker-health")) return jsonResponse({ queue_enabled: false, healthy: true, healthy_workers: 1, reason: null });
      if (url.includes("/social/analytics?")) return jsonResponse(analyticsBase);
      if (url.includes("/social/targets?")) return jsonResponse({ targets: [] });
      if (url.includes("/social/jobs?")) return jsonResponse({ jobs: [] });
      if (url.includes("/social/runs/summary?")) {
        return jsonResponse({
          summaries: [
            {
              run_id: "run-1",
              status: "completed",
              duration_seconds: 180,
              success_rate_pct: 75,
            },
          ],
        });
      }
      if (url.includes("/social/runs?")) return jsonResponse({ runs: [] });
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
        analyticsView="advanced"
      />,
    );

    await screen.findByText("Run Health");
    expect(screen.getByText("75.0%")).toBeInTheDocument();
    expect(screen.getByText("3m 0s")).toBeInTheDocument();
    expect(screen.getByText("Consistency & Momentum")).toBeInTheDocument();
  });

  it("groups failures and renders latest five failure events in run health", async () => {
    const runId = "run-fail-1";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/social/ingest/worker-health")) return jsonResponse({ queue_enabled: false, healthy: true, healthy_workers: 1, reason: null });
      if (url.includes("/social/analytics?")) return jsonResponse(analyticsBase);
      if (url.includes("/social/targets?")) return jsonResponse({ targets: [] });
      if (url.includes("/social/runs/summary?")) {
        return jsonResponse({
          summaries: [{ run_id: runId, status: "failed", duration_seconds: 240, success_rate_pct: 42.5 }],
        });
      }
      if (url.includes("/social/runs?")) {
        return jsonResponse({
          runs: [{ id: runId, status: "failed", created_at: "2026-02-24T18:00:00Z" }],
        });
      }
      if (url.includes("/social/jobs?")) {
        return jsonResponse({
          jobs: [
            {
              id: "job-a",
              run_id: runId,
              platform: "youtube",
              status: "failed",
              job_type: "comments",
              error_message: "Rate limited",
              created_at: "2026-02-24T18:04:00Z",
              config: { stage: "comments" },
              job_error_code: "RATE_LIMIT",
            },
            {
              id: "job-b",
              run_id: runId,
              platform: "youtube",
              status: "failed",
              job_type: "comments",
              error_message: "Rate limited",
              created_at: "2026-02-24T18:03:00Z",
              config: { stage: "comments" },
              job_error_code: "RATE_LIMIT",
            },
            {
              id: "job-c",
              run_id: runId,
              platform: "instagram",
              status: "failed",
              job_type: "posts",
              error_message: "Parser mismatch",
              created_at: "2026-02-24T18:02:00Z",
              config: { stage: "posts" },
              job_error_code: "PARSER",
            },
            {
              id: "job-d",
              run_id: runId,
              platform: "twitter",
              status: "retrying",
              job_type: "comments",
              error_message: "Network timeout",
              created_at: "2026-02-24T18:01:00Z",
              config: { stage: "comments" },
              job_error_code: "NETWORK",
            },
            {
              id: "job-e",
              run_id: runId,
              platform: "tiktok",
              status: "failed",
              job_type: "posts",
              error_message: "Auth rejected",
              created_at: "2026-02-24T18:00:00Z",
              config: { stage: "posts" },
              job_error_code: "AUTH",
            },
            {
              id: "job-f",
              run_id: runId,
              platform: "instagram",
              status: "failed",
              job_type: "comments",
              error_message: "Unknown error",
              created_at: "2026-02-24T17:59:00Z",
              config: { stage: "comments" },
              job_error_code: "UNKNOWN",
            },
          ],
        });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
        analyticsView="advanced"
      />,
    );

    await screen.findByText("Run Health");
    fireEvent.click(screen.getByRole("button", { name: "Select Latest Run" }));

    await waitFor(() => {
      expect(screen.getByText("Failure Groups")).toBeInTheDocument();
      expect(screen.getByText("Latest 5 Failure Events")).toBeInTheDocument();
    });
    expect(await screen.findByText(/RATE_LIMIT\s*·\s*comments\s*·\s*2/i)).toBeInTheDocument();
    const latestFailures = screen.getByTestId("run-health-latest-failures");
    await waitFor(() => {
      expect(within(latestFailures).getAllByRole("listitem")).toHaveLength(5);
    });
  });

  it("does not crash when benchmark delta payload is partially missing", async () => {
    const analyticsWithPartialBenchmark = {
      ...analyticsBase,
      benchmark: {
        ...analyticsBase.benchmark!,
        previous_week: {
          ...analyticsBase.benchmark!.previous_week,
          delta_pct: undefined,
        },
      },
    } as unknown as AnalyticsPayload;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/social/ingest/worker-health")) return jsonResponse({ queue_enabled: false, healthy: true, healthy_workers: 1, reason: null });
      if (url.includes("/social/analytics?")) return jsonResponse(analyticsWithPartialBenchmark);
      if (url.includes("/social/targets?")) return jsonResponse({ targets: [] });
      if (url.includes("/social/jobs?")) return jsonResponse({ jobs: [] });
      if (url.includes("/social/runs/summary?")) return jsonResponse({ summaries: [] });
      if (url.includes("/social/runs?")) return jsonResponse({ runs: [] });
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
        analyticsView="advanced"
      />,
    );

    await screen.findByText("Consistency & Momentum");
    expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("renders leaderboard thumbnails for content and discussion cards", async () => {
    const analyticsWithThumbs: AnalyticsPayload = {
      ...analyticsBase,
      leaderboards: {
        bravo_content: [
          {
            platform: "instagram",
            source_id: "ig-1",
            text: "Official trailer post",
            engagement: 25,
            url: "https://example.com/ig-1",
            timestamp: "2026-01-07T00:00:00Z",
            thumbnail_url: "https://images.test/content-thumb.jpg",
          },
        ],
        viewer_discussion: [
          {
            platform: "instagram",
            source_id: "ig-comment-1",
            text: "Viewer reaction",
            engagement: 11,
            url: "https://example.com/ig-comment-1",
            timestamp: "2026-01-07T00:00:00Z",
            sentiment: "positive",
            thumbnail_url: "https://images.test/discussion-thumb.jpg",
          },
        ],
      },
    };
    mockSeasonSocialFetch(analyticsWithThumbs);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
        analyticsView="bravo"
      />,
    );

    expect(await screen.findByText("Bravo Content Leaderboard")).toBeInTheDocument();
    expect(screen.getByAltText("Instagram leaderboard thumbnail")).toHaveAttribute(
      "src",
      "https://images.test/content-thumb.jpg",
    );
    expect(screen.getByAltText("Instagram discussion thumbnail")).toHaveAttribute(
      "src",
      "https://images.test/discussion-thumb.jpg",
    );
  });

  it("renders season hashtag analytics from week detail posts and respects platform scope", async () => {
    const analyticsWithHashtags: AnalyticsPayload = {
      ...analyticsBase,
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/social/ingest/worker-health")) return jsonResponse({ queue_enabled: false, healthy: true, healthy_workers: 1, reason: null });
      if (url.includes("/social/analytics?")) {
        return jsonResponse(analyticsWithHashtags);
      }
      const weekDetailMatch = /\/social\/analytics\/week\/(\d+)\?/.exec(url);
      if (weekDetailMatch) {
        const weekIndex = Number(weekDetailMatch[1]);
        if (weekIndex === 1) {
          return jsonResponse({
            platforms: {
              instagram: {
                posts: [
                  {
                    source_id: "ig-w1-1",
                    hashtags: ["RHOSLC", "RHOSLC", "TeamLisa"],
                    text: "Premiere #RHOSLC #RHOSLC #TeamLisa",
                  },
                ],
              },
              youtube: {
                posts: [
                  {
                    source_id: "yt-w1-1",
                    hashtags: ["RHOSLC"],
                    text: "Sneak peek",
                  },
                ],
              },
              tiktok: { posts: [] },
              twitter: {
                posts: [
                  {
                    source_id: "tw-w1-1",
                    text: "Fans are loud tonight #Drama",
                  },
                ],
              },
            },
          });
        }
        return jsonResponse({
          platforms: {
            instagram: {
              posts: [
                {
                  source_id: "ig-w2-1",
                  hashtags: ["TeamLisa"],
                  text: "Aftershow #TeamLisa",
                },
              ],
            },
            youtube: {
              posts: [
                {
                  source_id: "yt-w2-1",
                  hashtags: ["AFTERSHOW", "RHOSLC"],
                  text: "Weekly recap",
                },
              ],
            },
            tiktok: { posts: [] },
            twitter: { posts: [] },
          },
        });
      }
      if (url.includes("/social/targets?")) {
        return jsonResponse({
          targets: [
            { platform: "instagram", hashtags: ["rhoslc", "TeamLisa"], accounts: [], is_active: true },
            { platform: "youtube", hashtags: ["rhoslc"], accounts: [], is_active: true },
          ],
        });
      }
      if (url.includes("/social/jobs?")) return jsonResponse({ jobs: [] });
      if (url.includes("/social/runs?")) return jsonResponse({ runs: [] });
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { rerender } = render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
        analyticsView="hashtags"
        platformTab="overview"
      />,
    );

    await screen.findByRole("heading", { name: "Hashtags" });
    expect(screen.queryByText("Configured Hashtags")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("hashtag-insights-total-uses")).toHaveTextContent("8");
      expect(screen.getByTestId("hashtag-insights-unique-tags")).toHaveTextContent("4");
      expect(screen.getByTestId("hashtag-insights-top-tag")).toHaveTextContent("#RHOSLC");
      expect(screen.getByTestId("hashtag-insights-peak-week")).toHaveTextContent("Week 1");
    });

    const topLeaderboardRow = screen.getByTestId("hashtag-leaderboard-row-0");
    expect(topLeaderboardRow).toHaveTextContent("#RHOSLC");
    expect(topLeaderboardRow).toHaveTextContent("4 uses");
    expect(topLeaderboardRow).toHaveTextContent("50.0%");
    expect(screen.getByTestId("hashtag-weekly-usage-row-1")).toHaveTextContent("5 uses");
    expect(screen.getByTestId("hashtag-platform-usage-row-instagram")).toHaveTextContent("4 uses");
    expect(screen.getByTestId("hashtag-platform-usage-row-youtube")).toHaveTextContent("3 uses");

    rerender(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
        analyticsView="hashtags"
        platformTab="youtube"
      />,
    );

    await screen.findByTestId("hashtag-insights-total-uses");
    await waitFor(() => {
      expect(screen.getByTestId("hashtag-insights-total-uses")).toHaveTextContent("3");
      expect(screen.getByTestId("hashtag-insights-unique-tags")).toHaveTextContent("2");
      expect(screen.getByTestId("hashtag-insights-top-tag")).toHaveTextContent("#RHOSLC");
      expect(screen.getByTestId("hashtag-insights-peak-week")).toHaveTextContent("Week 2");
    });

    const youtubeTopRow = screen.getByTestId("hashtag-leaderboard-row-0");
    expect(youtubeTopRow).toHaveTextContent("#RHOSLC");
    expect(youtubeTopRow).toHaveTextContent("2 uses");
    expect(screen.queryByText("#TEAMLISA")).not.toBeInTheDocument();
    expect(screen.getByTestId("hashtag-platform-usage-row-youtube")).toHaveTextContent("3 uses");

    const weekDetailCalls = fetchMock.mock.calls.filter(([input]) => String(input).includes("/social/analytics/week/"));
    expect(weekDetailCalls.length).toBeGreaterThan(0);
  });

  it("keeps analytics visible when targets fetch fails", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/social/ingest/worker-health")) return jsonResponse({ queue_enabled: false, healthy: true, healthy_workers: 1, reason: null });
      if (url.includes("/social/analytics?")) {
        return jsonResponse(analyticsBase);
      }
      if (url.includes("/social/targets?")) {
        return ({
          ok: false,
          status: 502,
          json: async () => ({ error: "targets unavailable" }),
        }) as Response;
      }
      if (url.includes("/social/runs?")) {
        return jsonResponse({ runs: [] });
      }
      if (url.includes("/social/jobs?")) {
        return jsonResponse({ jobs: [] });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    await screen.findByText("Content Volume");
    const contentVolumeCard = screen.getByText("Content Volume").closest("article");
    expect(contentVolumeCard).not.toBeNull();
    expect(within(contentVolumeCard as HTMLElement).getByText("10")).toBeInTheDocument();
    expect(await screen.findByText(/targets unavailable/i)).toBeInTheDocument();
  });

  it("renders runs and targets when analytics request fails", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/social/ingest/worker-health")) return jsonResponse({ queue_enabled: false, healthy: true, healthy_workers: 1, reason: null });
      if (url.includes("/social/analytics?")) {
        return ({
          ok: false,
          status: 503,
          json: async () => ({ error: "analytics unavailable" }),
        }) as Response;
      }
      if (url.includes("/social/targets?")) {
        return jsonResponse({
          targets: [{ platform: "youtube", accounts: ["bravo"], hashtags: [], keywords: [], is_active: true }],
        });
      }
      if (url.includes("/social/runs?")) {
        return jsonResponse({
          runs: [
            {
              id: "run-1-abcdef",
              status: "completed",
              created_at: "2026-02-17T10:00:00Z",
            },
          ],
        });
      }
      if (url.includes("/social/jobs?")) {
        return jsonResponse({ jobs: [] });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    expect(await screen.findByText(/analytics unavailable/i)).toBeInTheDocument();
    expect(screen.getByText("Configured Targets")).toBeInTheDocument();
    expect(screen.getByText("YouTube: bravo")).toBeInTheDocument();
    const runSelect = screen.getByRole("combobox", { name: /Run/i });
    expect(within(runSelect).getByRole("option", { name: /run-1-ab/i })).toBeInTheDocument();
  });

  it("exits loading and remains interactive when analytics request times out", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/social/ingest/worker-health")) return jsonResponse({ queue_enabled: false, healthy: true, healthy_workers: 1, reason: null });
      if (url.includes("/social/analytics?")) {
        return await new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal as AbortSignal | undefined;
          signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      }
      if (url.includes("/social/targets?")) {
        return jsonResponse({ targets: [] });
      }
      if (url.includes("/social/runs?")) {
        return jsonResponse({ runs: [] });
      }
      if (url.includes("/social/jobs?")) {
        return jsonResponse({ jobs: [] });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    await Promise.resolve();
    expect(screen.getByRole("combobox", { name: /Run/i })).toBeInTheDocument();
    expect(screen.queryByText("Loading social analytics...")).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(40_001);
    });
    await Promise.resolve();
    expect(screen.getByText(/Social analytics request timed out/i)).toBeInTheDocument();
  });

  it("includes season_id hint in social landing requests", async () => {
    const requestedUrls: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/social/ingest/worker-health")) return jsonResponse({ queue_enabled: false, healthy: true, healthy_workers: 1, reason: null });
      requestedUrls.push(url);
      if (url.includes("/social/analytics?")) return jsonResponse(analyticsBase);
      if (url.includes("/social/targets?")) return jsonResponse({ targets: [] });
      if (url.includes("/social/runs?")) return jsonResponse({ runs: [] });
      if (url.includes("/social/jobs?")) return jsonResponse({ jobs: [] });
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    await screen.findByTestId("weekly-heatmap-row-1");
    const socialRequests = requestedUrls.filter(
      (url) =>
        url.includes("/social/analytics?") || url.includes("/social/runs?") || url.includes("/social/targets?"),
    );
    expect(socialRequests.length).toBeGreaterThan(0);
    expect(socialRequests.every((url) => url.includes("season_id=season-1"))).toBe(true);
  });

  it("shows stale-data timestamp when analytics refresh fails after a successful load", async () => {
    let analyticsCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/social/ingest/worker-health")) return jsonResponse({ queue_enabled: false, healthy: true, healthy_workers: 1, reason: null });
      if (url.includes("/social/analytics?")) {
        analyticsCalls += 1;
        if (analyticsCalls === 1) return jsonResponse(analyticsBase);
        return ({
          ok: false,
          status: 503,
          json: async () => ({ error: "analytics unavailable" }),
        }) as Response;
      }
      if (url.includes("/social/targets?")) return jsonResponse({ targets: [] });
      if (url.includes("/social/runs?")) return jsonResponse({ runs: [] });
      if (url.includes("/social/jobs?")) return jsonResponse({ jobs: [] });
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    await screen.findByTestId("weekly-heatmap-row-1");
    fireEvent.click(screen.getByRole("button", { name: "YouTube" }));

    expect(await screen.findByText(/analytics unavailable/i)).toBeInTheDocument();
    expect(await screen.findByText(/Showing last successful data from/i)).toBeInTheDocument();
    expect(screen.getByTestId("weekly-heatmap-row-1")).toBeInTheDocument();
  });

  it("shows strict run-scoped jobs empty state when no run is selected", async () => {
    mockSeasonSocialFetch(analyticsBase);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    await screen.findByText("Ingest Job Status");
    fireEvent.click(screen.getByRole("button", { name: /Ingest Job Status.*Show/i }));
    expect(
      await screen.findByText("No run selected. Pick a run above or start a new ingest."),
    ).toBeInTheDocument();
  });

  it("loads jobs for the selected run id", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/social/ingest/worker-health")) return jsonResponse({ queue_enabled: false, healthy: true, healthy_workers: 1, reason: null });
      if (url.includes("/social/analytics?")) {
        return jsonResponse(analyticsBase);
      }
      if (url.includes("/social/targets?")) {
        return jsonResponse({ targets: [] });
      }
      if (url.includes("/social/runs?")) {
        return jsonResponse({
          runs: [
            {
              id: "run-1-abcdef",
              status: "completed",
              created_at: "2026-02-17T10:00:00Z",
            },
          ],
        });
      }
      if (url.includes("/social/jobs?")) {
        return jsonResponse({
          jobs: [
            {
              id: "job-1",
              run_id: "run-1-abcdef",
              platform: "instagram",
              status: "completed",
              job_type: "posts",
            },
          ],
        });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    const selectLatestRunButton = await screen.findByRole("button", { name: "Select Latest Run" });
    fireEvent.click(selectLatestRunButton);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /Run/i })).toHaveValue("run-1-abcdef");
    });

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some((call) => String(call[0]).includes("run_id=run-1-abcdef")),
      ).toBe(true);
      expect(
        fetchMock.mock.calls.some(
          (call) =>
            String(call[0]).includes("/social/jobs?") && String(call[0]).includes("season_id=season-1"),
        ),
      ).toBe(true);
    });
  });

  it("keeps existing jobs visible when a jobs refresh fails transiently", async () => {
    let failJobsRefresh = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/social/ingest/worker-health")) return jsonResponse({ queue_enabled: false, healthy: true, healthy_workers: 1, reason: null });
      if (url.includes("/social/analytics?")) {
        return jsonResponse(analyticsBase);
      }
      if (url.includes("/social/targets?")) {
        return jsonResponse({ targets: [] });
      }
      if (url.includes("/social/runs?")) {
        return jsonResponse({
          runs: [
            {
              id: "run-1-abcdef",
              status: "completed",
              created_at: "2026-02-17T10:00:00Z",
            },
          ],
        });
      }
      if (url.includes("/social/jobs?")) {
        if (failJobsRefresh) {
          return ({
            ok: false,
            status: 503,
            json: async () => ({ error: "temporary jobs outage" }),
          }) as Response;
        }
        return jsonResponse({
          jobs: [
            {
              id: "job-1",
              run_id: "run-1-abcdef",
              platform: "instagram",
              status: "completed",
              job_type: "posts",
              items_found: 123,
            },
          ],
        });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    await screen.findByText("Run");
    fireEvent.change(screen.getByRole("combobox", { name: /Run/i }), {
      target: { value: "run-1-abcdef" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Ingest Job Status.*Show/i }));
    await screen.findByText("123 items", {}, { timeout: 10_000 });

    failJobsRefresh = true;
    fireEvent.click(screen.getByRole("button", { name: "Refresh Jobs" }));

    expect(await screen.findByText(/temporary jobs outage/i, {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.getByText("123 items")).toBeInTheDocument();
  });

  it("uses incremental sync strategy by default for ingest payload", async () => {
    const runId = "80423aa2-83ae-4f44-8aa4-dd5e8f8d39eb";
    const capturedPayloads: Array<Record<string, unknown>> = [];
    const ingestUrls: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/social/ingest/worker-health")) return jsonResponse({ queue_enabled: false, healthy: true, healthy_workers: 1, reason: null });
      if (url.includes("/social/analytics?")) return jsonResponse(analyticsBase);
      if (url.includes("/social/targets?")) return jsonResponse({ targets: [] });
      if (url.includes("/social/runs?")) {
        return jsonResponse({
          runs: [
            {
              id: runId,
              status: "running",
              summary: { total_jobs: 2, completed_jobs: 0, failed_jobs: 0, active_jobs: 2, items_found_total: 0 },
            },
          ],
        });
      }
      if (url.includes("/social/jobs?")) return jsonResponse({ jobs: [] });
      if (url.includes("/social/ingest") && (init?.method ?? "GET") === "POST") {
        ingestUrls.push(url);
        if (typeof init?.body === "string") {
          capturedPayloads.push(JSON.parse(init.body) as Record<string, unknown>);
        }
        return jsonResponse({ run_id: runId, stages: ["posts", "comments"], queued_or_started_jobs: 2 });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    await screen.findByText("Ingest + Export");
    fireEvent.click(screen.getByRole("button", { name: /Run Season Ingest \(All\)/i }));

    await waitFor(() => {
      expect(capturedPayloads.length).toBeGreaterThan(0);
    });
    expect(capturedPayloads[0]?.sync_strategy).toBe("incremental");
    expect(capturedPayloads[0]?.allow_inline_dev_fallback).toBe(true);
    expect(ingestUrls[0]).toContain("season_id=season-1");
  });

  it("supports day-specific ingest runs", async () => {
    const runId = "80423aa2-83ae-4f44-8aa4-dd5e8f8d39eb";
    const capturedPayloads: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/social/ingest/worker-health")) return jsonResponse({ queue_enabled: false, healthy: true, healthy_workers: 1, reason: null });
      if (url.includes("/social/analytics?")) return jsonResponse(analyticsBase);
      const weekDetailMatch = /\/social\/analytics\/week\/(\d+)\?/.exec(url);
      if (weekDetailMatch) {
        return jsonResponse(defaultWeekDetailResponse(Number(weekDetailMatch[1])));
      }
      if (url.includes("/social/targets?")) return jsonResponse({ targets: [] });
      if (url.includes("/social/runs?")) return jsonResponse({ runs: [] });
      if (url.includes("/social/jobs?")) return jsonResponse({ jobs: [] });
      if (url.includes("/social/ingest") && (init?.method ?? "GET") === "POST") {
        if (typeof init?.body === "string") {
          capturedPayloads.push(JSON.parse(init.body) as Record<string, unknown>);
        }
        return jsonResponse({ run_id: runId, stages: ["posts", "comments"], queued_or_started_jobs: 2 });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    await screen.findByText("Daily Run");
    fireEvent.change(screen.getByLabelText(/Day/i), {
      target: { value: "2026-01-09" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Run Selected Day/i }));

    await waitFor(() => {
      expect(capturedPayloads.length).toBeGreaterThan(0);
    });
    const dayPayload = capturedPayloads[0];
    expect(typeof dayPayload.date_start).toBe("string");
    expect(typeof dayPayload.date_end).toBe("string");
    const start = new Date(String(dayPayload.date_start));
    const end = new Date(String(dayPayload.date_end));
    expect(Number.isNaN(start.getTime())).toBe(false);
    expect(Number.isNaN(end.getTime())).toBe(false);
    expect(start.toISOString()).toBe("2026-01-09T05:00:00.000Z");
    expect(end.toISOString()).toBe("2026-01-10T04:59:59.999Z");
    expect(end.getTime()).toBeGreaterThan(start.getTime());
    expect(end.getTime() - start.getTime()).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
  });

  it("supports week-specific platform ingest runs from Ingest + Export", async () => {
    const runId = "run-week-platform-1";
    const capturedPayloads: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/social/ingest/worker-health")) return jsonResponse({ queue_enabled: false, healthy: true, healthy_workers: 1, reason: null });
      if (url.includes("/social/analytics?")) return jsonResponse(analyticsBase);
      if (url.includes("/social/targets?")) return jsonResponse({ targets: [] });
      if (url.includes("/social/runs?")) return jsonResponse({ runs: [] });
      if (url.includes("/social/jobs?")) return jsonResponse({ jobs: [] });
      if (url.includes("/social/ingest") && (init?.method ?? "GET") === "POST") {
        if (typeof init?.body === "string") {
          capturedPayloads.push(JSON.parse(init.body) as Record<string, unknown>);
        }
        return jsonResponse({ run_id: runId, stages: ["posts", "comments"], queued_or_started_jobs: 2 });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    await screen.findByText("Weekly Run");
    fireEvent.change(screen.getByRole("combobox", { name: /Week/i }), {
      target: { value: "2" },
    });
    const platformSelects = screen.getAllByRole("combobox", { name: /Platform/i });
    fireEvent.change(platformSelects[0], { target: { value: "youtube" } });
    fireEvent.click(screen.getByRole("button", { name: /Run Selected Week/i }));

    await waitFor(() => {
      expect(capturedPayloads.length).toBeGreaterThan(0);
    });
    const payload = capturedPayloads[0];
    expect(payload.platforms).toEqual(["youtube"]);
    expect(payload.date_start).toBe("2026-01-14T00:00:00Z");
    expect(payload.date_end).toBe("2026-01-20T23:59:59Z");
  });

  it("sends full_refresh strategy when full refresh mode is selected", async () => {
    const runId = "80423aa2-83ae-4f44-8aa4-dd5e8f8d39eb";
    const capturedPayloads: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/social/ingest/worker-health")) return jsonResponse({ queue_enabled: false, healthy: true, healthy_workers: 1, reason: null });
      if (url.includes("/social/analytics?")) return jsonResponse(analyticsBase);
      if (url.includes("/social/targets?")) return jsonResponse({ targets: [] });
      if (url.includes("/social/runs?")) return jsonResponse({ runs: [] });
      if (url.includes("/social/jobs?")) return jsonResponse({ jobs: [] });
      if (url.includes("/social/ingest") && (init?.method ?? "GET") === "POST") {
        if (typeof init?.body === "string") {
          capturedPayloads.push(JSON.parse(init.body) as Record<string, unknown>);
        }
        return jsonResponse({ run_id: runId, stages: ["posts", "comments"], queued_or_started_jobs: 2 });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    await screen.findByText("Sync Mode");
    fireEvent.change(screen.getByRole("combobox", { name: /Sync Mode/i }), {
      target: { value: "full_refresh" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Run Season Ingest \(All\)/i }));

    await waitFor(() => {
      expect(capturedPayloads.length).toBeGreaterThan(0);
    });
    expect(capturedPayloads[0]?.sync_strategy).toBe("full_refresh");
    expect(capturedPayloads[0]?.allow_inline_dev_fallback).toBe(true);
  });

  it("Sync Metrics triggers posts_and_comments ingest for the selected week", async () => {
    const runId = "80423aa2-83ae-4f44-8aa4-dd5e8f8d39eb";
    const capturedPayloads: Array<Record<string, unknown>> = [];
    const ingestUrls: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/social/ingest/worker-health")) return jsonResponse({ queue_enabled: false, healthy: true, healthy_workers: 1, reason: null });
      if (url.includes("/social/analytics?")) return jsonResponse(analyticsBase);
      if (url.includes("/social/analytics/week/")) return jsonResponse(defaultWeekDetailResponse(1));
      if (url.includes("/social/targets?")) return jsonResponse({ targets: [] });
      if (url.includes("/social/runs?")) return jsonResponse({ runs: [] });
      if (url.includes("/social/jobs?")) return jsonResponse({ jobs: [] });
      if (url.includes("/social/ingest") && (init?.method ?? "GET") === "POST") {
        ingestUrls.push(url);
        if (typeof init?.body === "string") {
          capturedPayloads.push(JSON.parse(init.body) as Record<string, unknown>);
        }
        return jsonResponse({ run_id: runId, stages: ["posts", "comments"], queued_or_started_jobs: 2 });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    const weekOneRow = (await screen.findByRole("link", { name: /S6\.E1/i })).closest("tr");
    expect(weekOneRow).not.toBeNull();
    const syncButton = within(weekOneRow as HTMLElement).getByRole("button", { name: "Sync Metrics" });
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(capturedPayloads.length).toBeGreaterThan(0);
    });

    const payload = capturedPayloads[0];
    expect(payload.ingest_mode).toBe("posts_and_comments");
    expect(payload.sync_strategy).toBe("incremental");
    expect(payload.comment_refresh_policy).toBeUndefined();
    expect(payload.comment_anchor_source_ids).toBeUndefined();
    expect(payload.date_start).toBe("2026-01-07T00:00:00Z");
    expect(payload.date_end).toBe("2026-01-13T23:59:59Z");
    expect(payload.platforms).toBeUndefined();
    expect(ingestUrls[0]).toContain("season_id=season-1");
  });

  it("Sync Metrics does not short-circuit when comments are already up-to-date", async () => {
    const capturedPayloads: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/social/ingest/worker-health")) return jsonResponse({ queue_enabled: false, healthy: true, healthy_workers: 1, reason: null });
      if (url.includes("/social/analytics?")) return jsonResponse(analyticsBase);
      if (url.includes("/social/analytics/week/")) return jsonResponse(defaultWeekDetailResponse(1));
      if (url.includes("/social/targets?")) return jsonResponse({ targets: [] });
      if (url.includes("/social/runs?")) return jsonResponse({ runs: [] });
      if (url.includes("/social/jobs?")) return jsonResponse({ jobs: [] });
      if (url.includes("/social/ingest") && (init?.method ?? "GET") === "POST") {
        if (typeof init?.body === "string") {
          capturedPayloads.push(JSON.parse(init.body) as Record<string, unknown>);
        }
        return jsonResponse({ run_id: "run-sync-metrics", stages: ["posts", "comments"], queued_or_started_jobs: 1 });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    const weekOneRow = (await screen.findByRole("link", { name: /S6\.E1/i })).closest("tr");
    expect(weekOneRow).not.toBeNull();
    const syncButton = within(weekOneRow as HTMLElement).getByRole("button", { name: "Sync Metrics" });
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(capturedPayloads).toHaveLength(1);
    });
    expect(capturedPayloads[0]?.ingest_mode).toBe("posts_and_comments");
  });

  it("formats worker-unavailable proxy detail into actionable guidance", () => {
    const message = formatIngestErrorMessage({
      error: "Failed to run social ingest (SOCIAL_WORKER_UNAVAILABLE)",
      code: "UPSTREAM_ERROR",
      upstream_status: 503,
      upstream_detail_code: "SOCIAL_WORKER_UNAVAILABLE",
      upstream_detail: {
        code: "SOCIAL_WORKER_UNAVAILABLE",
        message: "No healthy social ingest workers are reporting heartbeats.",
        worker_health: { healthy: false, reason: "no_healthy_workers" },
      },
    });

    expect(message).toContain("Start the social worker and retry");
    expect(message).toContain("no_healthy_workers");
  });

  it("renders rich run labels in the run selector", async () => {
    const runId = "80423aa2-83ae-4f44-8aa4-dd5e8f8d39eb";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/social/ingest/worker-health")) return jsonResponse({ queue_enabled: false, healthy: true, healthy_workers: 1, reason: null });
      if (url.includes("/social/analytics?")) {
        return jsonResponse(analyticsBase);
      }
      if (url.includes("/social/targets?")) {
        return jsonResponse({ targets: [] });
      }
      if (url.includes("/social/jobs?")) {
        return jsonResponse({ jobs: [] });
      }
      if (url.includes("/social/runs?")) {
        return jsonResponse({
          runs: [
            {
              id: runId,
              status: "running",
              created_at: "2026-02-17T19:57:13Z",
              config: {
                date_start: "2026-01-07T00:00:00Z",
                date_end: "2026-01-13T23:59:59Z",
                platforms: "all",
              },
              summary: {
                total_jobs: 8,
                completed_jobs: 1,
                failed_jobs: 0,
                active_jobs: 7,
                items_found_total: 0,
              },
            },
          ],
        });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    const runSelect = await screen.findByRole("combobox", { name: /Run/i });
    const matchingOption = await within(runSelect).findByRole("option", { name: /80423aa2/i });
    expect(matchingOption.textContent).toContain("Week 1");
    expect(matchingOption.textContent).toContain("All Platforms");
    expect(matchingOption.textContent).toContain("Running 1/8");
    expect(matchingOption.textContent).toContain("0 items");
  });

  it("does not emit false completion while run status remains active with transient empty jobs", async () => {
    const runId = "80423aa2-83ae-4f44-8aa4-dd5e8f8d39eb";
    let runJobsCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/social/ingest/worker-health")) return jsonResponse({ queue_enabled: false, healthy: true, healthy_workers: 1, reason: null });
      if (url.includes("/social/analytics?")) return jsonResponse(analyticsBase);
      if (url.includes("/social/targets?")) return jsonResponse({ targets: [] });
      if (url.includes("/social/runs?")) {
        return jsonResponse({
          runs: [
            {
              id: runId,
              status: "running",
              summary: {
                total_jobs: 8,
                completed_jobs: 1,
                failed_jobs: 0,
                active_jobs: 7,
                items_found_total: 0,
              },
            },
          ],
        });
      }
      if (url.includes("/social/jobs?") && url.includes(`run_id=${runId}`)) {
        runJobsCalls += 1;
        if (runJobsCalls === 1) {
          return jsonResponse({
            jobs: [
              {
                id: "job-1",
                run_id: runId,
                platform: "instagram",
                status: "running",
                job_type: "posts",
              },
            ],
          });
        }
        return jsonResponse({ jobs: [] });
      }
      if (url.includes("/social/jobs?")) return jsonResponse({ jobs: [] });
      if (url.includes("/social/ingest") && (init?.method ?? "GET") === "POST") {
        return jsonResponse({ run_id: runId, stages: ["posts", "comments"], queued_or_started_jobs: 8 });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />,
    );

    await screen.findByText("Ingest + Export");
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: /Run Season Ingest \(All\)/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(runJobsCalls).toBeGreaterThan(0);
    expect(
      fetchMock.mock.calls.some(
        (call) =>
          String(call[0]).includes("/social/runs?") && String(call[0]).includes(`run_id=${runId}`),
      ),
    ).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(7000);
    });
    expect(screen.queryByText(/Ingest complete/i)).not.toBeInTheDocument();
  });
});
