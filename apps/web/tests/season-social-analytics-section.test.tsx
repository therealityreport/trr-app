import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import SeasonSocialAnalyticsSection, {
  formatIngestErrorMessage,
} from "@/components/admin/season-social-analytics-section";
import { auth } from "@/lib/firebase";

vi.mock("@/components/admin/social-posts-section", () => ({
  __esModule: true,
  default: () => <div data-testid="social-posts-section" />,
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
  weekly_daily_activity: Array<{
    week_index: number;
    label: string;
    start: string;
    end: string;
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
      total_posts: number;
      total_comments: number;
    }>;
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
  total_posts: 0,
  total_comments: 0,
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
  weekly_daily_activity: [
    {
      week_index: 1,
      label: "Week 1",
      start: "2026-01-07T00:00:00Z",
      end: "2026-01-13T23:59:59Z",
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
          total_posts: 2,
          total_comments: 3,
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
          total_posts: 1,
          total_comments: 2,
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
          total_posts: 1,
          total_comments: 3,
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
    (auth as unknown as { currentUser?: { getIdToken: () => Promise<string> } }).currentUser = {
      getIdToken: vi.fn().mockResolvedValue("test-token"),
    };
    window.history.replaceState({}, "", "/admin/trr-shows/show-1/seasons/6?tab=social");
  });

  afterEach(() => {
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

    const weekOneLink = await screen.findByRole("link", { name: "Week 1" });
    const href = weekOneLink.getAttribute("href") ?? "";

    expect(href).toContain("/admin/trr-shows/show-1/seasons/6/social/week/1");
    expect(href).toContain("source_scope=bravo");
    expect(href).not.toContain("?tab=social/week");
  });

  it("renders platform tabs above the Filters scope card", async () => {
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
    const filtersHeading = screen.getByText("Filters");
    const position = nav.compareDocumentPosition(filtersHeading);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("preselects tab from social_platform query param and updates URL on tab change", async () => {
    window.history.replaceState(
      {},
      "",
      "/admin/trr-shows/show-1/seasons/6?tab=social&social_platform=youtube",
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
    window.history.replaceState({}, "", "/admin/trr-shows/show-1/seasons/6?tab=social");

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

  it("switches heatmap totals when metric toggle changes", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Comment Count" }));
    expect(screen.getByTestId("weekly-heatmap-total-1")).toHaveTextContent("8 comments");
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
      "Daily schedule unavailable for selected filters."
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
    expect(screen.getByText("Ingest + Export")).toBeInTheDocument();
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

  it("renders configured and observed hashtags and respects platform scope", async () => {
    const analyticsWithHashtags: AnalyticsPayload = {
      ...analyticsBase,
      leaderboards: {
        bravo_content: [
          {
            platform: "instagram",
            source_id: "ig-1",
            text: "Watch #RHOSLC tonight with #TeamLisa",
            engagement: 10,
            url: "https://example.com/ig-1",
            timestamp: "2026-01-07T00:00:00Z",
          },
          {
            platform: "youtube",
            source_id: "yt-1",
            text: "Sneak peek #RHOSLC",
            engagement: 9,
            url: "https://example.com/yt-1",
            timestamp: "2026-01-07T00:00:00Z",
          },
        ],
        viewer_discussion: [
          {
            platform: "twitter",
            source_id: "x-1",
            text: "Fans say #RHOSLC is #Drama",
            engagement: 8,
            url: "https://example.com/x-1",
            timestamp: "2026-01-07T00:00:00Z",
            sentiment: "neutral",
          },
        ],
      },
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics?")) {
        return jsonResponse(analyticsWithHashtags);
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

    await screen.findByText("Configured Hashtags");
    expect(screen.getAllByText("#RHOSLC").length).toBeGreaterThan(0);
    expect(screen.getByText("3 mentions")).toBeInTheDocument();

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

    await screen.findByText("Configured Hashtags");
    expect(screen.getByText("1 mention")).toBeInTheDocument();
    expect(screen.queryByText("3 mentions")).not.toBeInTheDocument();
  });

  it("keeps analytics visible when targets fetch fails", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
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

    await screen.findByText("Run");
    fireEvent.change(screen.getByRole("combobox", { name: /Run/i }), {
      target: { value: "run-1-abcdef" },
    });

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some((call) => String(call[0]).includes("run_id=run-1-abcdef")),
      ).toBe(true);
    });
  });

  it("keeps existing jobs visible when a jobs refresh fails transiently", async () => {
    let failJobsRefresh = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
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
    await screen.findByText("123 items");

    failJobsRefresh = true;
    fireEvent.click(screen.getByRole("button", { name: "Refresh Jobs" }));

    expect(await screen.findByText(/temporary jobs outage/i)).toBeInTheDocument();
    expect(screen.getByText("123 items")).toBeInTheDocument();
  });

  it("uses incremental sync strategy by default for ingest payload", async () => {
    const runId = "80423aa2-83ae-4f44-8aa4-dd5e8f8d39eb";
    const capturedPayloads: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
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
  });

  it("sends full_refresh strategy when full refresh mode is selected", async () => {
    const runId = "80423aa2-83ae-4f44-8aa4-dd5e8f8d39eb";
    const capturedPayloads: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
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

    await Promise.resolve();
    await Promise.resolve();
    expect(runJobsCalls).toBeGreaterThan(0);

    await vi.advanceTimersByTimeAsync(7000);
    expect(screen.queryByText(/Ingest complete/i)).not.toBeInTheDocument();
  });
});
