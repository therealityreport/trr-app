import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";

import SeasonSocialAnalyticsSection from "@/components/admin/season-social-analytics-section";
import { auth } from "@/lib/firebase";

vi.mock("@/components/admin/social-posts-section", () => ({
  __esModule: true,
  default: () => <div data-testid="social-posts-section" />,
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
  };
  weekly: Array<{
    week_index: number;
    label: string;
    start: string;
    end: string;
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
    total_posts: number;
    total_comments: number;
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
    }>;
    viewer_discussion: Array<{
      platform: string;
      source_id: string;
      text: string;
      engagement: number;
      url: string;
      timestamp: string;
      sentiment: "positive" | "neutral" | "negative";
    }>;
  };
  jobs: Array<{
    id: string;
    platform: string;
    status: "queued" | "pending" | "retrying" | "running" | "completed" | "failed" | "cancelled";
  }>;
};

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
  },
  weekly: [
    {
      week_index: 1,
      label: "Week 1",
      start: "2026-01-07T00:00:00Z",
      end: "2026-01-13T23:59:59Z",
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
      total_posts: 4,
      total_comments: 8,
    },
    {
      week_index: 2,
      label: "Week 2",
      start: "2026-01-14T00:00:00Z",
      end: "2026-01-20T23:59:59Z",
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

function mockSeasonSocialFetch(analytics: AnalyticsPayload) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/social/analytics?")) {
      return jsonResponse(analytics);
    }
    if (url.includes("/social/targets?")) {
      return jsonResponse({ targets: [] });
    }
    if (url.includes("/social/jobs?")) {
      return jsonResponse({ jobs: [] });
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
  return fetchMock;
}

describe("SeasonSocialAnalyticsSection weekly trend", () => {
  beforeEach(() => {
    (auth as unknown as { currentUser?: { getIdToken: () => Promise<string> } }).currentUser = {
      getIdToken: vi.fn().mockResolvedValue("test-token"),
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders no-data week rows without platform bars", async () => {
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

    const weekTwoRow = screen.getByTestId("weekly-trend-row-2");
    expect(within(weekTwoRow).getByTestId("weekly-no-data-2")).toHaveTextContent("No data yet");
    expect(within(weekTwoRow).queryByTestId("weekly-engagement-bar-2-instagram")).not.toBeInTheDocument();
    expect(within(weekTwoRow).queryByTestId("weekly-engagement-bar-2-youtube")).not.toBeInTheDocument();
  });

  it("renders grouped per-platform bars with expected widths and colors", async () => {
    mockSeasonSocialFetch(analyticsBase);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />
    );

    const instagramBar = await screen.findByTestId("weekly-engagement-bar-1-instagram");
    const youtubeBar = await screen.findByTestId("weekly-engagement-bar-1-youtube");
    const tiktokBar = await screen.findByTestId("weekly-engagement-bar-1-tiktok");
    const twitterBar = await screen.findByTestId("weekly-engagement-bar-1-twitter");

    expect(instagramBar).toHaveStyle({ width: "25%" });
    expect(youtubeBar).toHaveStyle({ width: "50%" });
    expect(tiktokBar).toHaveStyle({ width: "75%" });
    expect(twitterBar).toHaveStyle({ width: "100%" });

    expect(instagramBar.className).toContain("bg-pink-500");
    expect(youtubeBar.className).toContain("bg-red-500");
    expect(tiktokBar.className).toContain("bg-teal-400");
    expect(twitterBar.className).toContain("bg-sky-500");
  });

  it("does not render a minimum-width bar when a platform has zero engagement", async () => {
    const analyticsWithZeroPlatform = {
      ...analyticsBase,
      weekly_platform_engagement: [
        {
          ...analyticsBase.weekly_platform_engagement[0],
          engagement: {
            instagram: 0,
            youtube: 200,
            tiktok: 300,
            twitter: 400,
          },
          total_engagement: 900,
          has_data: true,
        },
        analyticsBase.weekly_platform_engagement[1],
      ],
    } satisfies AnalyticsPayload;

    mockSeasonSocialFetch(analyticsWithZeroPlatform);

    render(
      <SeasonSocialAnalyticsSection
        showId="show-1"
        seasonNumber={6}
        seasonId="season-1"
        showName="Test Show"
      />
    );

    await screen.findByTestId("weekly-trend-row-1");
    expect(screen.queryByTestId("weekly-engagement-bar-1-instagram")).not.toBeInTheDocument();
    expect(screen.getByTestId("weekly-engagement-bar-1-youtube")).toBeInTheDocument();
  });
});
