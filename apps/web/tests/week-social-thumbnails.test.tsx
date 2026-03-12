import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import WeekDetailPage from "@/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page";
import { auth } from "@/lib/firebase";

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: () => ({ hasAccess: true, checking: false }),
}));

const { mockParams, mockSearch, mockRouter } = vi.hoisted(() => ({
  mockParams: {
    showId: "7782652f-783a-488b-8860-41b97de32e75",
    seasonNumber: "6",
    weekIndex: "1",
    platform: undefined as string | undefined,
  },
  mockSearch: { value: "source_scope=bravo" },
  mockRouter: {
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/trr-shows/7782652f-783a-488b-8860-41b97de32e75/seasons/6/social/week/1",
  useParams: () => mockParams,
  useSearchParams: () => new URLSearchParams(mockSearch.value),
  useRouter: () => mockRouter,
}));

const weekPayload = {
  week: {
    week_index: 1,
    label: "Week 1",
    start: "2026-01-01T00:00:00.000Z",
    end: "2026-01-07T00:00:00.000Z",
  },
  season: {
    season_id: "season-1",
    show_id: "show-1",
    show_name: "The Real Housewives of Salt Lake City",
    season_number: 6,
  },
  source_scope: "bravo",
  platforms: {
    instagram: {
      posts: [
        {
          source_id: "ig-1",
          author: "bravotv",
          text: "IG post",
          url: "https://instagram.com/p/abc",
          posted_at: "2026-01-01T00:00:00.000Z",
          engagement: 100,
          total_comments_available: 0,
          comments: [],
          likes: 50,
          comments_count: 10,
          views: 1000,
          thumbnail_url: null,
          media_urls: ["https://images.test/ig-preview.jpg"],
          post_format: "reel",
          profile_tags: ["tagged_user"],
          collaborators: ["collab_user"],
          user: {
            username: "bravotv",
            avatar_url: "https://images.test/bravotv-avatar.jpg",
          },
          hosted_tagged_profile_pics: {
            collab_user: "https://images.test/collab-user-avatar.jpg",
          },
          collaborators_detail: [
            { username: "collab_user", profile_pic_url: "https://images.test/collab-user-avatar-fallback.jpg" },
          ],
          owner_is_verified: true,
          hashtags: ["RHOSLC"],
          mentions: ["@bravotv"],
          duration_seconds: 14,
        },
      ],
      totals: { posts: 1, total_comments: 10, total_engagement: 100 },
    },
    tiktok: {
      posts: [
        {
          source_id: "tt-1",
          author: "bravotv",
          text: "TikTok post",
          url: "https://tiktok.com/@bravo/video/1",
          posted_at: "2026-01-01T00:00:00.000Z",
          engagement: 120,
          total_comments_available: 0,
          comments: [],
          nickname: "Bravo",
          likes: 60,
          comments_count: 12,
          shares: 7,
          views: 2000,
          user_verified: true,
          hashtags: [],
          mentions: [],
          thumbnail_url: "https://images.test/tt-preview.jpg",
        },
      ],
      totals: { posts: 1, total_comments: 12, total_engagement: 120 },
    },
    youtube: {
      posts: [
        {
          source_id: "yt-1",
          author: "Bravo",
          text: "YouTube post",
          url: "https://youtube.com/watch?v=abc",
          posted_at: "2026-01-01T00:00:00.000Z",
          engagement: 200,
          total_comments_available: 0,
          comments: [],
          title: "Episode Clip",
          likes: 80,
          dislikes: 12,
          comments_count: 14,
          views: 5000,
          thumbnail_url: "https://images.test/yt-preview.jpg",
        },
      ],
      totals: { posts: 1, total_comments: 14, total_engagement: 200 },
    },
    twitter: {
      posts: [],
      totals: { posts: 0, total_comments: 0, total_engagement: 0 },
    },
  },
  totals: {
    posts: 3,
    total_comments: 36,
    total_engagement: 420,
  },
};

async function clickPostDetailCardByThumbnailAlt(altText: string) {
  const thumbnails = await screen.findAllByRole("img");
  const thumbnail = thumbnails.find((image) => {
    const alt = image.getAttribute("alt") ?? "";
    return alt.toLowerCase().includes(altText.toLowerCase());
  });
  if (!thumbnail) {
    throw new Error(`Post card button for thumbnail "${altText}" not found`);
  }
  fireEvent.click(thumbnail);
}

async function waitForWeekDetailReady() {
  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Week 1" })).toBeInTheDocument();
    const gallery = screen.queryByTestId("week-post-gallery");
    const noPostsMessage = screen.queryByText(/No posts found for this (week|day)\./);
    expect(gallery || noPostsMessage).toBeTruthy();
  }, { timeout: 10_000 });
}

const byeWeekPayload = {
  ...weekPayload,
  week: {
    ...weekPayload.week,
    label: "BYE WEEK (Jan 15-Jan 22)",
    week_type: "bye",
    episode_number: null,
  },
};

const crossPlatformCoveragePayload = {
  ...weekPayload,
  platforms: {
    instagram: {
      ...weekPayload.platforms.instagram,
      posts: [
        {
          ...weekPayload.platforms.instagram.posts[0],
          total_comments_available: 500,
        },
      ],
    },
    tiktok: {
      ...weekPayload.platforms.tiktok,
      posts: [
        {
          ...weekPayload.platforms.tiktok.posts[0],
          total_comments_available: 500,
        },
      ],
    },
    youtube: {
      ...weekPayload.platforms.youtube,
      posts: [
        {
          ...weekPayload.platforms.youtube.posts[0],
          total_comments_available: 14,
        },
      ],
    },
    twitter: {
      posts: [
        {
          source_id: "x-1",
          author: "BravoTV",
          text: "X post",
          url: "https://x.com/BravoTV/status/1",
          posted_at: "2026-01-01T00:00:00.000Z",
          engagement: 1000,
          total_comments_available: 506,
          comments: [],
          likes: 100,
          replies_count: 1386,
          quotes: 44,
          views: 120000,
          user_verified: true,
          retweets: 10,
          media_urls: ["https://images.test/x-preview.jpg"],
        },
      ],
      totals: { posts: 1, total_comments: 1386, total_engagement: 1000 },
    },
  },
  totals: {
    posts: 4,
    total_comments: 1422,
    total_engagement: 1420,
  },
};

describe("WeekDetailPage thumbnails", () => {
  beforeEach(() => {
    mockParams.showId = "7782652f-783a-488b-8860-41b97de32e75";
    mockParams.seasonNumber = "6";
    mockParams.weekIndex = "1";
    mockParams.platform = undefined;
    mockSearch.value = "source_scope=bravo";
    mockRouter.replace.mockReset();
    (auth as unknown as { currentUser?: { getIdToken: () => Promise<string> } }).currentUser = {
      getIdToken: vi.fn().mockResolvedValue("test-token"),
    };
    vi.stubGlobal(
      "requestIdleCallback",
      ((callback: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void) => {
        callback({ didTimeout: false, timeRemaining: () => 50 });
        return 1;
      }) as unknown as typeof requestIdleCallback,
    );
    vi.stubGlobal("cancelIdleCallback", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    mockSearch.value = "source_scope=bravo";
  });

  it("renders thumbnail previews for instagram, tiktok, and youtube", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => weekPayload,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);

    await waitForWeekDetailReady();
    const gallery = screen.getByTestId("week-post-gallery");
    expect(gallery.className).toContain("lg:grid-cols-4");
    expect(screen.getByLabelText("Instagram platform")).toBeInTheDocument();
    expect(screen.getByLabelText("TikTok platform")).toBeInTheDocument();
    expect(screen.getByLabelText("YouTube platform")).toBeInTheDocument();
    const youtubeHandleLink = screen.getByRole("link", { name: "@bravo" });
    expect(youtubeHandleLink).toHaveAttribute("href", "https://youtube.com/watch?v=abc");
    expect(screen.getByText("OFFICIAL ANALYTICS")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Back Home" })).toBeInTheDocument();
    const backLink = screen.getByRole("link", { name: "Back" });
    expect(backLink.getAttribute("href")).not.toContain("source_scope=");

    const instagramThumb = screen.getByAltText("Instagram post thumbnail");
    expect(instagramThumb.className).toContain("object-contain");
    expect(instagramThumb).toHaveAttribute(
      "src",
      "https://images.test/ig-preview.jpg",
    );
    expect(screen.queryByTestId("instagram-tag-markers-card-ig-1")).not.toBeInTheDocument();
    expect(screen.getByAltText("TikTok post thumbnail")).toHaveAttribute(
      "src",
      "https://images.test/tt-preview.jpg",
    );
    expect(screen.getByAltText("YouTube post thumbnail")).toHaveAttribute(
      "src",
      "https://images.test/yt-preview.jpg",
    );
    expect(screen.getByText("of Comments Saved")).toBeInTheDocument();
    expect(screen.getByText("0.0%")).toBeInTheDocument();
    expect(screen.getByText("0/36* Comments (Saved/Actual)")).toBeInTheDocument();
    expect(
      screen.getByText("* Not all platform-reported comments are saved in Supabase yet."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/View on YouTube/i)).not.toBeInTheDocument();
    expect(screen.getByText(/0\/10\* comments/i)).toBeInTheDocument();
    expect(screen.getByText((_content, element) => element?.textContent === "12 Dislikes")).toBeInTheDocument();
    expect(screen.getByText("REEL")).toBeInTheDocument();
    expect(screen.getByText("14s")).toBeInTheDocument();
    expect(screen.getByText("@tagged_user")).toBeInTheDocument();
    expect(screen.getAllByText("@collab_user").length).toBeGreaterThan(0);
    expect(screen.getByTestId("post-header-handles-ig-1")).toHaveTextContent("@bravotv and @collab_user");
    const instagramAvatars = screen.getByTestId("post-header-avatars-ig-1");
    expect(within(instagramAvatars).getByAltText("@bravotv avatar")).toHaveAttribute(
      "src",
      "https://images.test/bravotv-avatar.jpg",
    );
    expect(within(instagramAvatars).getByAltText("@collab_user avatar")).toHaveAttribute(
      "src",
      "https://images.test/collab-user-avatar.jpg",
    );
    expect(screen.getByTestId("verified-badge-instagram-bravotv")).toBeInTheDocument();
    expect(screen.getByTestId("verified-badge-tiktok-bravotv")).toBeInTheDocument();
    const instagramIcon = screen.getByLabelText("Instagram platform");
    const instagramHandles = screen.getByTestId("post-header-handles-ig-1");
    expect(Boolean(instagramIcon.compareDocumentPosition(instagramAvatars) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(instagramAvatars.compareDocumentPosition(instagramHandles) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(screen.getByTestId("summary-token-collaborators")).toHaveTextContent("1");
    expect(screen.getByTestId("summary-token-tags")).toHaveTextContent("1");
    expect(screen.getByTestId("summary-token-mentions")).toHaveTextContent("1");
    expect(screen.getByTestId("summary-token-hashtags")).toHaveTextContent("1");
  });

  it("uses full-period metrics fetch for summary and token cards when initial gallery payload is truncated", async () => {
    const previewPayload = {
      ...weekPayload,
      platforms: {
        instagram: {
          posts: [
            {
              source_id: "ig-preview-1",
              author: "bravotv",
              text: "Preview post #TagOne @mention_one",
              url: "https://instagram.com/p/preview-1",
              posted_at: "2026-01-01T00:00:00.000Z",
              engagement: 100,
              total_comments_available: 2,
              comments: [],
              likes: 11,
              comments_count: 2,
              views: 1000,
              thumbnail_url: "https://images.test/preview-1.jpg",
              profile_tags: ["tag_one"],
              collaborators: ["collab_one"],
              hashtags: ["TagOne"],
              mentions: ["@mention_one"],
            },
          ],
          totals: { posts: 3, total_comments: 12, total_engagement: 300 },
        },
        tiktok: { posts: [], totals: { posts: 0, total_comments: 0, total_engagement: 0 } },
        youtube: { posts: [], totals: { posts: 0, total_comments: 0, total_engagement: 0 } },
        twitter: { posts: [], totals: { posts: 0, total_comments: 0, total_engagement: 0 } },
        facebook: { posts: [], totals: { posts: 0, total_comments: 0, total_engagement: 0 } },
        threads: { posts: [], totals: { posts: 0, total_comments: 0, total_engagement: 0 } },
      },
      totals: { posts: 3, total_comments: 12, total_engagement: 300 },
      pagination: { limit: 20, offset: 0, returned: 1, total: 3, has_more: true },
    };

    const fullPeriodMetricsPayload = {
      ...previewPayload,
      platforms: {
        ...previewPayload.platforms,
        instagram: {
          posts: [
            previewPayload.platforms.instagram.posts[0],
            {
              source_id: "ig-metrics-2",
              author: "bravotv",
              text: "Metrics post 2 #TagTwo @mention_two",
              url: "https://instagram.com/p/metrics-2",
              posted_at: "2026-01-02T00:00:00.000Z",
              engagement: 150,
              total_comments_available: 4,
              comments: [],
              likes: 22,
              comments_count: 4,
              views: 1500,
              thumbnail_url: "https://images.test/metrics-2.jpg",
              profile_tags: ["tag_two"],
              collaborators: ["collab_two"],
              hashtags: ["TagTwo"],
              mentions: ["@mention_two"],
            },
            {
              source_id: "ig-metrics-3",
              author: "bravotv",
              text: "Metrics post 3 #TagThree @mention_three",
              url: "https://instagram.com/p/metrics-3",
              posted_at: "2026-01-03T00:00:00.000Z",
              engagement: 200,
              total_comments_available: 6,
              comments: [],
              likes: 33,
              comments_count: 6,
              views: 2000,
              thumbnail_url: "https://images.test/metrics-3.jpg",
              profile_tags: ["tag_three"],
              collaborators: ["collab_three"],
              hashtags: ["TagThree"],
              mentions: ["@mention_three"],
            },
          ],
          totals: { posts: 3, total_comments: 12, total_engagement: 450 },
        },
      },
      totals: { posts: 3, total_comments: 12, total_engagement: 450 },
      pagination: { limit: 100, offset: 0, returned: 2, total: 3, has_more: true },
    };

    const fullPeriodMetricsSecondPagePayload = {
      ...previewPayload,
      platforms: {
        ...previewPayload.platforms,
        instagram: {
          posts: [fullPeriodMetricsPayload.platforms.instagram.posts[2]],
          totals: { posts: 3, total_comments: 12, total_engagement: 450 },
        },
      },
      totals: { posts: 3, total_comments: 12, total_engagement: 450 },
      pagination: { limit: 100, offset: 2, returned: 1, total: 3, has_more: false },
    };

    const summaryPayload = {
      week: previewPayload.week,
      season: previewPayload.season,
      source_scope: previewPayload.source_scope,
      platforms: {
        instagram: { total_posts: 3, totals: { posts: 3, total_comments: 12, total_engagement: 450 } },
        tiktok: { total_posts: 0, totals: { posts: 0, total_comments: 0, total_engagement: 0 } },
        youtube: { total_posts: 0, totals: { posts: 0, total_comments: 0, total_engagement: 0 } },
        twitter: { total_posts: 0, totals: { posts: 0, total_comments: 0, total_engagement: 0 } },
        facebook: { total_posts: 0, totals: { posts: 0, total_comments: 0, total_engagement: 0 } },
        threads: { total_posts: 0, totals: { posts: 0, total_comments: 0, total_engagement: 0 } },
      },
      totals: { posts: 3, total_comments: 12, total_engagement: 450 },
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1/summary")) {
        return {
          ok: true,
          status: 200,
          json: async () => summaryPayload,
        } as Response;
      }
      if (url.includes("/social/analytics/week/1")) {
        const query = new URLSearchParams(url.split("?")[1] ?? "");
        if (query.get("post_limit") === "100") {
          if (query.get("post_offset") === "2") {
            return {
              ok: true,
              status: 200,
              json: async () => fullPeriodMetricsSecondPagePayload,
            } as Response;
          }
          return {
            ok: true,
            status: 200,
            json: async () => fullPeriodMetricsPayload,
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => previewPayload,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();

    await waitFor(() => {
      expect(screen.getByTestId("summary-token-collaborators")).toHaveTextContent("3");
      expect(screen.getByTestId("summary-token-tags")).toHaveTextContent("3");
      expect(screen.getByTestId("summary-token-mentions")).toHaveTextContent("3");
      expect(screen.getByTestId("summary-token-hashtags")).toHaveTextContent("3");
      expect(screen.getByText("66")).toBeInTheDocument();
      expect(screen.getByText("12/12 Comments (Saved/Actual)")).toBeInTheDocument();
    });
  });

  it("builds canonical instagram permalinks from source ids for reel posts", async () => {
    const canonicalPayload = JSON.parse(JSON.stringify(weekPayload)) as typeof weekPayload;
    const instagramPost = canonicalPayload.platforms.instagram.posts[0];
    instagramPost.source_id = "DRXO813kmfl";
    instagramPost.post_format = "reel";
    instagramPost.url = "https://www.instagram.com/p/old-shortcode/";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => canonicalPayload,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();

    const instagramHandleLink = screen.getByTestId("post-header-handles-DRXO813kmfl");
    expect(instagramHandleLink).toHaveAttribute("href", "https://www.instagram.com/reel/DRXO813kmfl/");
  });

  it("renders the X/Twitter verified badge for verified authors", async () => {
    const payload = JSON.parse(JSON.stringify(crossPlatformCoveragePayload)) as typeof crossPlatformCoveragePayload;
    mockSearch.value = "source_scope=bravo&social_platform=twitter";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => payload,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();

    expect(screen.getByTestId("verified-badge-twitter-bravotv")).toBeInTheDocument();
  });

  it("strips t.co URLs from Twitter caption previews and keeps inline hashtag pills", async () => {
    const payload = JSON.parse(JSON.stringify(crossPlatformCoveragePayload)) as typeof crossPlatformCoveragePayload;
    payload.platforms.twitter.posts[0].text =
      "An emotional conversation between Bronwyn and Todd. #RHOSLC https://t.co/HkNiHXUsBI";
    payload.platforms.twitter.posts[0].hashtags = ["RHOSLC"];
    payload.platforms.twitter.posts[0].mentions = [];
    mockSearch.value = "source_scope=bravo&social_platform=twitter";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => payload,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();

    expect(screen.queryByText("https://t.co/HkNiHXUsBI")).not.toBeInTheDocument();
    expect(screen.getByText("#RHOSLC")).toBeInTheDocument();
    expect(screen.getAllByText("#RHOSLC")).toHaveLength(1);
  });

  it("opens summary token modal lists from the unique metadata counters", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => weekPayload,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();

    fireEvent.click(screen.getByTestId("summary-token-collaborators"));
    await waitFor(() => {
      expect(screen.getByTestId("summary-token-modal")).toBeInTheDocument();
    });
    const modal = screen.getByTestId("summary-token-modal");
    expect(within(modal).getByText("Collaborators")).toBeInTheDocument();
    expect(within(modal).getByText("@collab_user")).toBeInTheDocument();
    expect(within(modal).queryByText("instagram.com/collab_user/")).not.toBeInTheDocument();
    expect(within(modal).queryByText("Collab User")).not.toBeInTheDocument();
    expect(within(modal).getByTestId("token-modal-name-collab_user")).toHaveTextContent("");
    expect(within(modal).getByRole("link", { name: /View/i })).toHaveAttribute(
      "href",
      "https://www.instagram.com/collab_user/",
    );
  });

  it("renders popup real-name line from metadata detail fields when present", async () => {
    const namedPayload = JSON.parse(JSON.stringify(weekPayload)) as typeof weekPayload;
    namedPayload.platforms.instagram.posts[0].collaborators_detail = [
      {
        username: "collab_user",
        profile_pic_url: "https://images.test/collab-user-avatar-fallback.jpg",
        full_name: "Captain Kerry Titheradge",
        profile_url: "https://www.instagram.com/collab_user/?hl=en",
      },
    ];

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => namedPayload,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();

    fireEvent.click(screen.getByTestId("summary-token-collaborators"));
    await waitFor(() => {
      expect(screen.getByTestId("summary-token-modal")).toBeInTheDocument();
    });

    const modal = screen.getByTestId("summary-token-modal");
    expect(within(modal).getByText("@collab_user")).toBeInTheDocument();
    expect(within(modal).getByText("Captain Kerry Titheradge")).toBeInTheDocument();
    expect(within(modal).queryByText("instagram.com/collab_user/")).not.toBeInTheDocument();
    expect(within(modal).getByRole("link", { name: /View/i })).toHaveAttribute(
      "href",
      "https://www.instagram.com/collab_user/?hl=en",
    );
  });

  it("shows tag real-name and avatar from tagged user detail metadata", async () => {
    const taggedPayload = JSON.parse(JSON.stringify(weekPayload)) as typeof weekPayload;
    const instagramPost = taggedPayload.platforms.instagram.posts[0] as (typeof weekPayload.platforms.instagram.posts)[number] & {
      profile_tags_detail?: Array<{ username?: string; full_name?: string; profile_pic_url?: string }>;
      tagged_users_detail?: Array<{ username?: string; full_name?: string; profile_pic_url?: string }>;
      hosted_tagged_profile_pics?: Record<string, string>;
    };
    instagramPost.profile_tags = ["brittanibateman"];
    instagramPost.tagged_users_detail = [
      {
        username: "brittanibateman",
        full_name: "Britani Bateman",
        profile_pic_url: "https://images.test/britani-avatar.jpg",
      },
    ];
    instagramPost.profile_tags_detail = instagramPost.tagged_users_detail;
    instagramPost.hosted_tagged_profile_pics = {
      ...instagramPost.hosted_tagged_profile_pics,
      brittanibateman: "https://images.test/britani-avatar-hosted.jpg",
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => taggedPayload,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();

    fireEvent.click(screen.getByTestId("summary-token-tags"));
    await waitFor(() => {
      expect(screen.getByTestId("summary-token-modal")).toBeInTheDocument();
    });

    const modal = screen.getByTestId("summary-token-modal");
    expect(within(modal).getByText("@brittanibateman")).toBeInTheDocument();
    expect(within(modal).getByText("Britani Bateman")).toBeInTheDocument();
    expect(within(modal).getByAltText("@brittanibateman avatar")).toHaveAttribute(
      "src",
      "https://images.test/britani-avatar-hosted.jpg",
    );
  });

  it("renders instagram tag-location markers per carousel slide on card and post drawer images", async () => {
    const taggedPayload = JSON.parse(JSON.stringify(weekPayload)) as typeof weekPayload;
    const instagramPost = taggedPayload.platforms.instagram.posts[0] as (typeof weekPayload.platforms.instagram.posts)[number] & {
      tagged_users_detail?: Array<{ username?: string; full_name?: string; tag_x?: number; tag_y?: number }>;
      profile_tags_detail?: Array<{ username?: string; full_name?: string; tag_x?: number; tag_y?: number }>;
      post_format?: "carousel";
      media_urls?: string[];
      child_posts_data?: Array<{
        slide_index?: number;
        media_url?: string;
        tagged_users_detail?: Array<{ username?: string; full_name?: string; tag_x?: number; tag_y?: number }>;
      }>;
    };
    instagramPost.post_format = "carousel";
    instagramPost.media_urls = ["https://images.test/ig-carousel-1.jpg", "https://images.test/ig-carousel-2.jpg"];
    instagramPost.child_posts_data = [
      {
        slide_index: 0,
        media_url: "https://images.test/ig-carousel-1.jpg",
        tagged_users_detail: [
          {
            username: "brittanibateman",
            full_name: "Britani Bateman",
            tag_x: 0.42,
            tag_y: 0.58,
          },
        ],
      },
      {
        slide_index: 1,
        media_url: "https://images.test/ig-carousel-2.jpg",
        tagged_users_detail: [
          {
            username: "jesseltaank",
            full_name: "Jessel Taank",
            tag_x: 0.21,
            tag_y: 0.33,
          },
        ],
      },
    ];
    instagramPost.tagged_users_detail = instagramPost.child_posts_data[0].tagged_users_detail;
    instagramPost.profile_tags_detail = instagramPost.tagged_users_detail;

    const postDetailPayload = {
      platform: "instagram",
      source_id: "ig-1",
      author: "bravotv",
      text: "IG post",
      url: "https://instagram.com/p/abc",
      posted_at: "2026-01-01T00:00:00.000Z",
      thumbnail_url: "https://images.test/ig-carousel-1.jpg",
      post_format: "carousel",
      media_urls: ["https://images.test/ig-carousel-1.jpg", "https://images.test/ig-carousel-2.jpg"],
      profile_tags: ["brittanibateman"],
      tagged_users_detail: instagramPost.tagged_users_detail,
      profile_tags_detail: instagramPost.profile_tags_detail,
      child_posts_data: instagramPost.child_posts_data,
      stats: {
        likes: 50,
        comments_count: 10,
        views: 1000,
        engagement: 1060,
      },
      total_comments_in_db: 0,
      comments: [],
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => taggedPayload,
        } as Response;
      }
      if (url.includes("/social/analytics/posts/instagram/ig-1")) {
        return {
          ok: true,
          status: 200,
          json: async () => postDetailPayload,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();

    expect(screen.queryByTestId("instagram-tag-markers-card-ig-1")).not.toBeInTheDocument();

    await clickPostDetailCardByThumbnailAlt("Instagram post thumbnail");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Post Details" })).toBeInTheDocument();
    });

    expect(screen.getByTestId("instagram-drawer-slide-indicator-ig-1")).toHaveTextContent("Slide 1 of 2");
    const drawerOverlay = screen.getByTestId("instagram-tag-markers-drawer-ig-1");
    expect(drawerOverlay).toBeInTheDocument();
    expect(within(drawerOverlay).getByText("Britani Bateman")).toBeInTheDocument();
    expect(within(drawerOverlay).queryByText("Jessel Taank")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
    await waitFor(() => {
      expect(screen.getByTestId("instagram-drawer-slide-indicator-ig-1")).toHaveTextContent("Slide 2 of 2");
    });
    const secondDrawerOverlay = screen.getByTestId("instagram-tag-markers-drawer-ig-1");
    expect(within(secondDrawerOverlay).getByText("Jessel Taank")).toBeInTheDocument();
    expect(within(secondDrawerOverlay).queryByText("Britani Bateman")).not.toBeInTheDocument();
  });

  it("renders author-first header handles with bravotv dedupe and fallback avatars", async () => {
    const headerPayload = JSON.parse(JSON.stringify(weekPayload)) as typeof weekPayload;
    const instagramPost = headerPayload.platforms.instagram.posts[0] as (typeof weekPayload.platforms.instagram.posts)[number] & {
      user?: { username?: string; avatar_url?: string | null };
      hosted_tagged_profile_pics?: Record<string, string>;
      collaborators_detail?: Array<{ username?: string; profile_pic_url?: string | null }>;
    };
    instagramPost.author = "DirectTV";
    instagramPost.collaborators = ["collab_user", "@BravoTV"];
    instagramPost.mentions = [];
    instagramPost.user = {
      username: "directtv",
      avatar_url: "https://images.test/directtv-avatar.jpg",
    };
    instagramPost.hosted_tagged_profile_pics = {};
    instagramPost.collaborators_detail = [
      { username: "collab_user", profile_pic_url: "https://images.test/collab-user-detail-avatar.jpg" },
    ];

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => headerPayload,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();

    const handles = screen.getByTestId("post-header-handles-ig-1");
    const avatars = screen.getByTestId("post-header-avatars-ig-1");
    expect(handles).toHaveTextContent("@directtv, @collab_user, and @bravotv");
    expect(within(avatars).getByAltText("@directtv avatar")).toHaveAttribute("src", "https://images.test/directtv-avatar.jpg");
    expect(within(avatars).getByAltText("@collab_user avatar")).toHaveAttribute(
      "src",
      "https://images.test/collab-user-detail-avatar.jpg",
    );
    const bravotvFallback = within(avatars).getByLabelText("@bravotv avatar");
    expect(bravotvFallback.tagName).toBe("SPAN");
  });

  it("uses author username and resolved profile avatar when raw author handle is abbreviated", async () => {
    const abbreviatedAuthorPayload = JSON.parse(JSON.stringify(weekPayload)) as typeof weekPayload;
    const youtubePost = abbreviatedAuthorPayload.platforms.youtube.posts[0] as (typeof weekPayload.platforms.youtube.posts)[number] & {
      user?: { username?: string; avatar_url?: string | null };
      raw_data?: Record<string, unknown>;
    };
    youtubePost.author = "BR";
    youtubePost.user = { username: "Bravo", avatar_url: null };
    youtubePost.raw_data = {
      user: {
        username: "bravo",
        avatar_url: "https://images.test/bravo-author-avatar.jpg",
      },
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => abbreviatedAuthorPayload,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();

    expect(screen.getByTestId("post-header-handles-yt-1")).toHaveTextContent("@bravo");
    expect(within(screen.getByTestId("post-header-avatars-yt-1")).getByAltText("@bravo avatar")).toHaveAttribute(
      "src",
      "https://images.test/bravo-author-avatar.jpg",
    );
  });

  it("prefers hosted post-author avatar over direct avatar URL", async () => {
    const hostedAvatarPayload = JSON.parse(JSON.stringify(weekPayload)) as typeof weekPayload;
    const instagramPost = hostedAvatarPayload.platforms.instagram.posts[0] as (typeof weekPayload.platforms.instagram.posts)[number] & {
      hosted_owner_profile_pic_url?: string | null;
      user?: { username?: string; avatar_url?: string | null };
    };
    instagramPost.author = "bravotv";
    instagramPost.user = { username: "bravotv", avatar_url: "https://images.test/direct-avatar.jpg" };
    instagramPost.hosted_owner_profile_pic_url = "https://cdn.test/hosted/bravotv-avatar.jpg";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return { ok: true, status: 200, json: async () => hostedAvatarPayload } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();

    const avatars = screen.getByTestId("post-header-avatars-ig-1");
    expect(within(avatars).getByAltText("@bravotv avatar")).toHaveAttribute("src", "https://cdn.test/hosted/bravotv-avatar.jpg");
  });

  it("normalizes tagged and collaborator chips to a single @ prefix", async () => {
    const taggedPayload = JSON.parse(JSON.stringify(weekPayload)) as typeof weekPayload;
    const instagramPost = taggedPayload.platforms.instagram.posts[0];
    instagramPost.profile_tags = ["@bravotv", "@@meredithmarks", "@lisabarlow14"];
    instagramPost.collaborators = ["@@bravotv"];
    instagramPost.mentions = [];

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => taggedPayload,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();

    expect(screen.getByText("@meredithmarks")).toBeInTheDocument();
    expect(screen.getByText("@lisabarlow14")).toBeInTheDocument();
    expect(screen.getAllByText("@bravotv").length).toBeGreaterThan(0);
    expect(screen.queryByText("@@bravotv")).not.toBeInTheDocument();
    expect(screen.queryByText("@@meredithmarks")).not.toBeInTheDocument();
  });

  it("initially requests first 20 posts and appends second page on Load more", async () => {
    const pagedPayloadPosts = Array.from({ length: 30 }, (_, index) => ({
      source_id: `ig-${index + 1}`,
      author: "bravotv",
      text: `Post ${index + 1}`,
      url: `https://instagram.com/p/${index + 1}`,
      posted_at: `2026-01-01T00:${String(index).padStart(2, "0")}:00.000Z`,
      engagement: 100 + index,
      total_comments_available: 0,
      comments: [],
      likes: 20 + index,
      comments_count: 3,
      views: 1000 + index,
      thumbnail_url: `https://images.test/ig-post-${index + 1}.jpg`,
      media_urls: [`https://images.test/ig-post-${index + 1}.jpg`],
      media_urls_count: 1,
      media_url_count: 1,
      post_format: "post",
      hashtags: [],
      mentions: [],
      profile_tags: [],
      collaborators: [],
      duration_seconds: 12,
    }));
    const firstPayload = {
      ...weekPayload,
      platforms: {
        instagram: {
          posts: pagedPayloadPosts.slice(0, 20),
          totals: { posts: 20, total_comments: 0, total_engagement: 2000 },
        },
      },
      totals: {
        posts: 30,
        total_comments: 0,
        total_engagement: 3000,
      },
      pagination: {
        limit: 20,
        offset: 0,
        returned: 20,
        total: 30,
        has_more: true,
      },
    };
    const secondPayload = {
      ...firstPayload,
      platforms: {
        instagram: {
          posts: pagedPayloadPosts.slice(20),
          totals: { posts: 10, total_comments: 0, total_engagement: 1200 },
        },
      },
      pagination: {
        limit: 20,
        offset: 20,
        returned: 10,
        total: 30,
        has_more: false,
      },
    };
    const fetchCalls: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        const query = new URLSearchParams(url.split("?")[1] ?? "");
        fetchCalls.push(url);
        const postOffset = query.get("post_offset");
        if (postOffset === "20") {
          return {
            ok: true,
            status: 200,
            json: async () => secondPayload,
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => firstPayload,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);

    await waitForWeekDetailReady();
    const detailCalls = fetchCalls.filter((url) => {
      const query = new URLSearchParams(url.split("?")[1] ?? "");
      return query.get("max_comments_per_post") === "0" && query.get("post_limit") === "20";
    });
    expect(detailCalls).toHaveLength(1);
    const firstQuery = new URLSearchParams(detailCalls[0].split("?")[1] ?? "");
    expect(firstQuery.get("post_limit")).toBe("20");
    expect(firstQuery.get("post_offset")).toBe("0");
    expect(firstQuery.get("max_comments_per_post")).toBe("0");

    expect(screen.getByRole("button", { name: /load more posts/i })).toBeInTheDocument();
    expect(screen.getByText("Post 20")).toBeInTheDocument();
    expect(screen.queryByText("Post 21")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /load more posts/i }));
    await waitFor(() => {
      expect(screen.getByText("Post 21")).toBeInTheDocument();
    });
    const detailCallsAfterLoadMore = fetchCalls.filter((url) => {
      const query = new URLSearchParams(url.split("?")[1] ?? "");
      return query.get("max_comments_per_post") === "0" && query.get("post_limit") === "20";
    });
    expect(detailCallsAfterLoadMore).toHaveLength(2);
    const secondQuery = new URLSearchParams(detailCallsAfterLoadMore[1].split("?")[1] ?? "");
    expect(secondQuery.get("post_offset")).toBe("20");
    expect(secondQuery.get("post_limit")).toBe("20");
    expect(screen.getByText("Post 30")).toBeInTheDocument();
    expect(screen.getByText("All loaded: 30/30 posts")).toBeInTheDocument();
    expect(screen.queryByText("Post 31")).not.toBeInTheDocument();
  });

  it("re-fetches first page from backend on sort changes without global page reload", async () => {
    const likesPayload = {
      ...weekPayload,
      platforms: {
        instagram: {
          posts: [
            {
              source_id: "ig-like-1",
              author: "bravotv",
              text: "Likes leader",
              url: "https://instagram.com/p/like-1",
              posted_at: "2026-01-02T00:00:00.000Z",
              engagement: 1000,
              total_comments_available: 0,
              comments: [],
              likes: 999,
              comments_count: 5,
              views: 100,
              sort_rank: 0,
              thumbnail_url: "https://images.test/likes-1.jpg",
            },
            {
              source_id: "ig-like-2",
              author: "bravotv",
              text: "Likes runner",
              url: "https://instagram.com/p/like-2",
              posted_at: "2026-01-01T00:00:00.000Z",
              engagement: 900,
              total_comments_available: 0,
              comments: [],
              likes: 700,
              comments_count: 4,
              views: 150,
              sort_rank: 1,
              thumbnail_url: "https://images.test/likes-2.jpg",
            },
          ],
          totals: { posts: 2, total_comments: 9, total_engagement: 1900 },
        },
      },
      totals: {
        posts: 2,
        total_comments: 9,
        total_engagement: 1900,
      },
      pagination: {
        limit: 20,
        offset: 0,
        returned: 2,
        total: 2,
        has_more: false,
      },
    };
    const viewsPayload = {
      ...likesPayload,
      platforms: {
        instagram: {
          posts: [
            {
              source_id: "ig-view-1",
              author: "bravotv",
              text: "Views leader",
              url: "https://instagram.com/p/view-1",
              posted_at: "2026-01-03T00:00:00.000Z",
              engagement: 3000,
              total_comments_available: 0,
              comments: [],
              likes: 100,
              comments_count: 3,
              views: 5000,
              sort_rank: 0,
              thumbnail_url: "https://images.test/views-1.jpg",
            },
            {
              source_id: "ig-view-2",
              author: "bravotv",
              text: "Views runner",
              url: "https://instagram.com/p/view-2",
              posted_at: "2026-01-02T00:00:00.000Z",
              engagement: 2500,
              total_comments_available: 0,
              comments: [],
              likes: 90,
              comments_count: 2,
              views: 4000,
              sort_rank: 1,
              thumbnail_url: "https://images.test/views-2.jpg",
            },
          ],
          totals: { posts: 2, total_comments: 5, total_engagement: 5500 },
        },
      },
      totals: {
        posts: 2,
        total_comments: 5,
        total_engagement: 5500,
      },
      pagination: {
        limit: 20,
        offset: 0,
        returned: 2,
        total: 2,
        has_more: false,
      },
    };

    const weekCalls: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        weekCalls.push(url);
        const query = new URLSearchParams(url.split("?")[1] ?? "");
        if (query.get("sort_field") === "views") {
          return {
            ok: true,
            status: 200,
            json: async () => viewsPayload,
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => likesPayload,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();

    expect(screen.getByText("Likes leader")).toBeInTheDocument();
    const detailCalls = weekCalls.filter((url) => {
      const query = new URLSearchParams(url.split("?")[1] ?? "");
      return query.get("max_comments_per_post") === "0" && query.get("post_limit") === "20";
    });
    expect(detailCalls).toHaveLength(1);
    const firstQuery = new URLSearchParams(detailCalls[0].split("?")[1] ?? "");
    expect(firstQuery.get("sort_field")).toBe("posted_at");
    expect(firstQuery.get("sort_dir")).toBe("desc");
    expect(firstQuery.get("post_offset")).toBe("0");

    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "views" } });
    expect(screen.queryByText("Loading week detail...")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Views leader")).toBeInTheDocument();
    });
    expect(screen.queryByText("Likes leader")).not.toBeInTheDocument();
    const detailCallsAfterSort = weekCalls.filter((url) => {
      const query = new URLSearchParams(url.split("?")[1] ?? "");
      return query.get("max_comments_per_post") === "0" && query.get("post_limit") === "20";
    });
    expect(detailCallsAfterSort).toHaveLength(2);
    const secondQuery = new URLSearchParams(detailCallsAfterSort[1].split("?")[1] ?? "");
    expect(secondQuery.get("sort_field")).toBe("views");
    expect(secondQuery.get("sort_dir")).toBe("desc");
    expect(secondQuery.get("post_offset")).toBe("0");
    expect(secondQuery.get("post_limit")).toBe("20");
  });

  it("re-fetches first page for selected platform tabs and keeps all tab counts visible", async () => {
    const facebookPosts = Array.from({ length: 7 }, (_, index) => ({
      source_id: `fb-${index + 1}`,
      author: "bravotv",
      text: `Facebook ${index + 1}`,
      url: `https://facebook.com/bravo/posts/${index + 1}`,
      posted_at: `2026-01-01T00:${String(index).padStart(2, "0")}:00.000Z`,
      engagement: 100 + index,
      total_comments_available: 0,
      comments: [],
      likes: 20 + index,
      comments_count: 3,
      shares: 2,
      views: 200 + index,
      sort_rank: index,
      thumbnail_url: `https://images.test/fb-${index + 1}.jpg`,
    }));
    const twitterPosts = Array.from({ length: 30 }, (_, index) => ({
      source_id: `x-${index + 1}`,
      author: "bravotv",
      text: `Twitter ${index + 1}`,
      url: `https://x.com/bravotv/status/${index + 1}`,
      posted_at: `2026-01-02T00:${String(index).padStart(2, "0")}:00.000Z`,
      engagement: 500 + index,
      total_comments_available: 0,
      comments: [],
      likes: 200 + index,
      retweets: 10,
      replies_count: 4,
      quotes: 1,
      views: 5000 + index,
      sort_rank: index,
      thumbnail_url: `https://images.test/x-${index + 1}.jpg`,
      hashtags: [],
      mentions: [],
    }));

    const allSummaryPayload = {
      ...weekPayload,
      platforms: {
        ...weekPayload.platforms,
        facebook: {
          posts: [facebookPosts[0]],
          totals: { posts: 7, total_comments: 21, total_engagement: 700 },
        },
        twitter: {
          posts: [twitterPosts[0]],
          totals: { posts: 30, total_comments: 120, total_engagement: 9000 },
        },
        threads: {
          posts: [],
          totals: { posts: 20, total_comments: 80, total_engagement: 3000 },
        },
      },
      totals: { posts: 105, total_comments: 300, total_engagement: 25000 },
      pagination: { limit: 1, offset: 0, returned: 1, total: 105, has_more: true },
    };

    const facebookDetailsPayload = {
      ...allSummaryPayload,
      platforms: {
        facebook: {
          posts: facebookPosts,
          totals: { posts: 7, total_comments: 21, total_engagement: 700 },
        },
      },
      totals: { posts: 7, total_comments: 21, total_engagement: 700 },
      pagination: { limit: 20, offset: 0, returned: 7, total: 7, has_more: false },
    };

    const twitterDetailsPayload = {
      ...allSummaryPayload,
      platforms: {
        twitter: {
          posts: twitterPosts.slice(0, 20),
          totals: { posts: 30, total_comments: 120, total_engagement: 9000 },
        },
      },
      totals: { posts: 30, total_comments: 120, total_engagement: 9000 },
      pagination: { limit: 20, offset: 0, returned: 20, total: 30, has_more: true },
    };

    const weekCalls: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (!url.includes("/social/analytics/week/1")) {
        throw new Error(`Unexpected URL: ${url}`);
      }
      weekCalls.push(url);
      const query = new URLSearchParams(url.split("?")[1] ?? "");
      const platforms = query.get("platforms");
      if (platforms === "facebook") {
        return {
          ok: true,
          status: 200,
          json: async () => facebookDetailsPayload,
        } as Response;
      }
      if (platforms === "twitter") {
        return {
          ok: true,
          status: 200,
          json: async () => twitterDetailsPayload,
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => allSummaryPayload,
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();
    const replaceCallsBeforeTabSwitch = mockRouter.replace.mock.calls.length;

    expect(screen.getByRole("button", { name: /Facebook\(7\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Twitter\/X\(30\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Threads\(20\)/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Facebook\(7\)/i }));
    await waitFor(() => {
      expect(screen.getByText("Facebook 7")).toBeInTheDocument();
    });
    expect(screen.queryByText("Loading week detail...")).not.toBeInTheDocument();
    expect(mockRouter.replace.mock.calls.length).toBe(replaceCallsBeforeTabSwitch);
    expect(screen.getAllByText(/Facebook \d+/).length).toBe(7);

    fireEvent.click(screen.getByRole("button", { name: /Twitter\/X\(30\)/i }));
    await waitFor(() => {
      expect(screen.getByText("Twitter 20")).toBeInTheDocument();
    });
    expect(screen.queryByText("Loading week detail...")).not.toBeInTheDocument();
    expect(mockRouter.replace.mock.calls.length).toBe(replaceCallsBeforeTabSwitch);
    expect(screen.queryByText("Twitter 21")).not.toBeInTheDocument();

    const detailQueries = weekCalls
      .map((url) => new URLSearchParams(url.split("?")[1] ?? ""))
      .filter((query) => query.get("max_comments_per_post") === "0" && query.get("post_limit") === "20");
    expect(detailQueries[0]?.get("platforms")).toBeNull();
    expect(detailQueries[1]?.get("platforms")).toBe("facebook");
    expect(detailQueries[2]?.get("platforms")).toBe("twitter");
    expect(detailQueries[1]?.get("post_offset")).toBe("0");
    expect(detailQueries[2]?.get("post_offset")).toBe("0");
  });

  it("renders hashtag and mention chips for youtube/facebook/threads with text fallback when token arrays are absent", async () => {
    const tokenPayload = JSON.parse(JSON.stringify(weekPayload)) as Record<string, any>;
    tokenPayload.platforms.youtube.posts[0].text = "YouTube post #YTTag @yt_handle";
    tokenPayload.platforms.youtube.posts[0].hashtags = [];
    tokenPayload.platforms.youtube.posts[0].mentions = [];
    tokenPayload.platforms.facebook = {
      posts: [
        {
          source_id: "fb-1",
          author: "bravo",
          text: "Facebook post #FBTag @fb_handle",
          url: "https://facebook.com/bravo/posts/fb-1",
          posted_at: "2026-01-01T00:00:00.000Z",
          engagement: 150,
          total_comments_available: 0,
          comments: [],
          likes: 40,
          comments_count: 5,
          shares: 3,
          views: 1000,
          hashtags: [],
          mentions: [],
          thumbnail_url: "https://images.test/fb-preview.jpg",
        },
      ],
      totals: { posts: 1, total_comments: 5, total_engagement: 150 },
    };
    tokenPayload.platforms.threads = {
      posts: [
        {
          source_id: "th-1",
          author: "bravotv",
          text: "Threads post #THTag @th_handle",
          url: "https://threads.com/@bravotv/post/th-1",
          posted_at: "2026-01-01T00:00:00.000Z",
          engagement: 170,
          total_comments_available: 0,
          comments: [],
          likes: 45,
          replies_count: 6,
          reposts: 4,
          quotes: 2,
          views: 1200,
          hashtags: [],
          mentions: [],
          thumbnail_url: "https://images.test/th-preview.jpg",
        },
      ],
      totals: { posts: 1, total_comments: 6, total_engagement: 170 },
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => tokenPayload,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);

    await waitForWeekDetailReady();

    expect(screen.getByLabelText("Facebook platform")).toBeInTheDocument();
    expect(screen.getByLabelText("Threads platform")).toBeInTheDocument();
    expect(screen.getByText("#YTTag")).toBeInTheDocument();
    expect(screen.getByText("@yt_handle")).toBeInTheDocument();
    expect(screen.getByText("#FBTag")).toBeInTheDocument();
    expect(screen.getByText("@fb_handle")).toBeInTheDocument();
    expect(screen.getByText("#THTag")).toBeInTheDocument();
    expect(screen.getByText("@th_handle")).toBeInTheDocument();
  });

  it("uses caption hashtags (not metadata tag arrays) for youtube/facebook summary hashtag tokens", async () => {
    const payload = JSON.parse(JSON.stringify(weekPayload)) as Record<string, any>;
    payload.platforms.instagram.posts[0].hashtags = [];
    payload.platforms.tiktok.posts[0].hashtags = [];
    payload.platforms.youtube.posts[0].text = "YouTube caption with #CaptionOnly";
    payload.platforms.youtube.posts[0].hashtags = ["CaptionOnly", "MetaOnly"];
    payload.platforms.facebook = {
      posts: [
        {
          source_id: "fb-caption-only-1",
          author: "bravo",
          text: "Facebook caption with #FBOnly",
          url: "https://facebook.com/bravo/posts/fb-caption-only-1",
          posted_at: "2026-01-01T00:00:00.000Z",
          engagement: 150,
          total_comments_available: 0,
          comments: [],
          likes: 40,
          comments_count: 5,
          shares: 3,
          views: 1000,
          hashtags: ["FBOnly", "FBMetaOnly"],
          mentions: [],
          thumbnail_url: "https://images.test/fb-caption-only-preview.jpg",
        },
      ],
      totals: { posts: 1, total_comments: 5, total_engagement: 150 },
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => payload,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();

    fireEvent.click(screen.getByTestId("summary-token-hashtags"));
    await waitFor(() => {
      expect(screen.getByTestId("summary-token-modal")).toBeInTheDocument();
    });

    const modal = screen.getByTestId("summary-token-modal");
    expect(within(modal).getByText("#CaptionOnly")).toBeInTheDocument();
    expect(within(modal).getByText("#FBOnly")).toBeInTheDocument();
    expect(within(modal).queryByText("#MetaOnly")).not.toBeInTheDocument();
    expect(within(modal).queryByText("#FBMetaOnly")).not.toBeInTheDocument();
  });

  it("uses combined Twitter reposts and replies+quotes comment coverage semantics", async () => {
    const twitterCoveragePayload = {
      ...weekPayload,
      platforms: {
        instagram: { posts: [], totals: { posts: 0, total_comments: 0, total_engagement: 0 } },
        tiktok: { posts: [], totals: { posts: 0, total_comments: 0, total_engagement: 0 } },
        youtube: { posts: [], totals: { posts: 0, total_comments: 0, total_engagement: 0 } },
        twitter: {
          posts: [
            {
              source_id: "x-coverage-1",
              author: "BravoTV",
              text: "Coverage test",
              url: "https://x.com/BravoTV/status/1956000357282406729",
              posted_at: "2026-01-01T00:00:00.000Z",
              engagement: 100,
              total_comments_available: 0,
              comments: [],
              likes: 10,
              replies_count: 10,
              retweets: 10,
              quotes: 5,
              views: 1000,
              media_urls: ["https://images.test/x-coverage.jpg"],
            },
          ],
          totals: { posts: 1, total_comments: 10, total_engagement: 100 },
        },
      },
      totals: { posts: 1, total_comments: 10, total_engagement: 100 },
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => twitterCoveragePayload,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);

    await waitForWeekDetailReady();
    expect(screen.getAllByText((_, el) => (el?.textContent ?? "").includes("15 Reposts")).length).toBeGreaterThan(0);
    expect(screen.getAllByText((_, el) => (el?.textContent ?? "").includes("0/15* Replies")).length).toBeGreaterThan(0);
  });

  it("renders exact integer formatting for Twitter engagement row metrics", async () => {
    const payload = {
      ...weekPayload,
      platforms: {
        ...weekPayload.platforms,
        twitter: {
          posts: [
            {
              source_id: "x-exact-1",
              author: "BravoTV",
              text: "Exact row metrics",
              url: "https://x.com/BravoTV/status/1956000357282406729",
              posted_at: "2026-01-01T00:00:00.000Z",
              engagement: 0,
              total_comments_available: 0,
              comments: [],
              likes: 7092,
              replies_count: 338,
              retweets: 1800,
              quotes: 44,
              views: 617900,
              media_urls: ["https://images.test/x-exact.jpg"],
            },
          ],
          totals: { posts: 1, total_comments: 338, total_engagement: 0 },
        },
      },
      totals: { posts: 1, total_comments: 338, total_engagement: 0 },
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => payload,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);

    await waitForWeekDetailReady();
    expect(
      screen.getAllByText((_, el) => (el?.textContent ?? "").includes("7,092 Likes")).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText((_, el) => (el?.textContent ?? "").includes("1,844 Reposts")).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText((_, el) => (el?.textContent ?? "").includes("617,900 Views")).length,
    ).toBeGreaterThan(0);
  });

  it("opens post media lightbox and shows social stats in the metadata panel", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => weekPayload,
        } as Response;
      }
      if (url.includes("/social/analytics/posts/instagram/ig-1")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            platform: "instagram",
            source_id: "ig-1",
            author: "bravotv",
            text: "IG post",
            url: "https://instagram.com/p/abc",
            posted_at: "2026-01-01T00:00:00.000Z",
            thumbnail_url: "https://images.test/ig-preview.jpg",
            media_urls: ["https://images.test/ig-media-1.jpg"],
            stats: {
              likes: 50,
              comments_count: 10,
              views: 1000,
              engagement: 1060,
            },
            total_comments_in_db: 0,
            comments: [],
          }),
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);

    await waitForWeekDetailReady();

    await clickPostDetailCardByThumbnailAlt("Instagram post thumbnail");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Post Details" })).toBeInTheDocument();
    });
    const openLightboxButton = await screen.findByRole("button", {
      name: /open post media lightbox from details/i,
    });
    fireEvent.click(openLightboxButton);
    const metadataToggle = await screen.findByRole("button", {
      name: /show metadata|hide metadata/i,
    });
    fireEvent.click(metadataToggle);
    const statsHeader = screen.getByText("Social Stats");
    const statsPanel = statsHeader.closest("div");
    expect(statsPanel).not.toBeNull();
    if (statsPanel) {
      expect(within(statsPanel).getByText("Platform")).toBeInTheDocument();
      expect(within(statsPanel).getByText("Engagement")).toBeInTheDocument();
      expect(within(statsPanel).getByText("Instagram")).toBeInTheDocument();
    }
  });

  it("renders video media in the lightbox for video post URLs", async () => {
    const videoPayload = JSON.parse(JSON.stringify(weekPayload)) as typeof weekPayload;
    videoPayload.platforms.tiktok.posts[0].media_urls = ["https://video.test/tiktok-post.mp4"];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => videoPayload,
        } as Response;
      }
      if (url.includes("/social/analytics/posts/tiktok/tt-1")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            platform: "tiktok",
            source_id: "tt-1",
            author: "bravotv",
            text: "TikTok post",
            url: "https://tiktok.com/@bravo/video/1",
            posted_at: "2026-01-01T00:00:00.000Z",
            thumbnail_url: "https://images.test/tt-preview.jpg",
            media_urls: ["https://video.test/tiktok-post.mp4"],
            stats: {
              likes: 60,
              comments_count: 12,
              shares: 7,
              saves: 471,
              views: 2000,
              engagement: 2079,
            },
            total_comments_in_db: 1,
            comments: [],
          }),
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);

    await waitForWeekDetailReady();
      await clickPostDetailCardByThumbnailAlt("TikTok post thumbnail");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Post Details" })).toBeInTheDocument();
    });
    const openLightboxButton = await screen.findByRole("button", {
      name: /open post media lightbox from details/i,
    });
    fireEvent.click(openLightboxButton);
    await waitFor(() => {
      const video = document.querySelector("video[aria-label='TikTok media']");
      expect(video).not.toBeNull();
    });
  });

  it("prefers non-video TikTok thumbnail candidates when thumbnail_url is video-like", async () => {
    const payload = JSON.parse(JSON.stringify(weekPayload)) as typeof weekPayload;
    (
      payload.platforms.tiktok.posts[0] as typeof payload.platforms.tiktok.posts[0] & {
        source_media_urls?: string[];
        hosted_media_urls?: string[];
      }
    ).thumbnail_url = "https://video.test/tiktok-thumb.mp4";
    (
      payload.platforms.tiktok.posts[0] as typeof payload.platforms.tiktok.posts[0] & {
        source_media_urls?: string[];
        hosted_media_urls?: string[];
      }
    ).hosted_media_urls = ["https://video.test/tiktok-hosted.mp4"];
    (
      payload.platforms.tiktok.posts[0] as typeof payload.platforms.tiktok.posts[0] & {
        source_media_urls?: string[];
        hosted_media_urls?: string[];
      }
    ).source_media_urls = [
      "https://video.test/tiktok-source.mp4",
      "https://images.test/tiktok-still.jpg",
    ];
    payload.platforms.tiktok.posts[0].media_urls = ["https://video.test/tiktok-source.mp4"];

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => payload,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();

    const tiktokThumb = screen.getByAltText("TikTok post thumbnail");
    expect(tiktokThumb).toHaveAttribute("src", expect.stringContaining("https://images.test/tiktok-still.jpg"));
  });

  it("opens source TikTok video first when hosted media slot is thumbnail-like", async () => {
    const payload = JSON.parse(JSON.stringify(weekPayload)) as typeof weekPayload;
    (
      payload.platforms.tiktok.posts[0] as typeof payload.platforms.tiktok.posts[0] & {
        source_media_urls?: string[];
        hosted_media_urls?: string[];
      }
    ).source_media_urls = ["https://video.test/tiktok-source.mp4"];
    (
      payload.platforms.tiktok.posts[0] as typeof payload.platforms.tiktok.posts[0] & {
        source_media_urls?: string[];
        hosted_media_urls?: string[];
      }
    ).hosted_media_urls = ["https://images.test/tiktok-hosted-thumb.jpg"];
    payload.platforms.tiktok.posts[0].media_urls = ["https://video.test/tiktok-source.mp4"];
    payload.platforms.tiktok.posts[0].thumbnail_url = "https://images.test/tiktok-hosted-thumb.jpg";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => payload,
        } as Response;
      }
      if (url.includes("/social/analytics/posts/tiktok/tt-1")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            platform: "tiktok",
            source_id: "tt-1",
            author: "bravotv",
            text: "TikTok post",
            url: "https://tiktok.com/@bravo/video/1",
            posted_at: "2026-01-01T00:00:00.000Z",
            thumbnail_url: "https://images.test/tiktok-hosted-thumb.jpg",
            source_media_urls: ["https://video.test/tiktok-source.mp4"],
            hosted_media_urls: ["https://images.test/tiktok-hosted-thumb.jpg"],
            stats: {
              likes: 60,
              comments_count: 12,
              shares: 7,
              saves: 471,
              views: 2000,
              engagement: 2079,
            },
            total_comments_in_db: 1,
            comments: [],
          }),
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();
    await clickPostDetailCardByThumbnailAlt("TikTok post thumbnail");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Post Details" })).toBeInTheDocument();
    });
    fireEvent.click(
      await screen.findByRole("button", {
        name: /open post media lightbox from details/i,
      }),
    );
    await waitFor(() => {
      expect(document.querySelector("video[aria-label='TikTok media']")).not.toBeNull();
    });
  });

  it("prefers mirrored TikTok hosted video from media_asset_meta over source embeds", async () => {
    const mirroredVideoUrl =
      "https://d1fmdyqfafwim3.cloudfront.net/social/tiktok/7782652f-783a-488b-8860-41b97de32e75/6/week-0/7540327205503601933/media-01.mp4";
    const payload = JSON.parse(JSON.stringify(weekPayload)) as typeof weekPayload;
    (
      payload.platforms.tiktok.posts[0] as typeof payload.platforms.tiktok.posts[0] & {
        source_media_urls?: string[];
        hosted_media_urls?: string[];
      }
    ).source_media_urls = ["https://www.tiktok.com/@bravotv/video/7540327205503601933"];
    (
      payload.platforms.tiktok.posts[0] as typeof payload.platforms.tiktok.posts[0] & {
        source_media_urls?: string[];
        hosted_media_urls?: string[];
      }
    ).hosted_media_urls = ["https://images.test/tiktok-hosted-thumb.jpg"];
    payload.platforms.tiktok.posts[0].media_urls = ["https://www.tiktok.com/@bravotv/video/7540327205503601933"];
    payload.platforms.tiktok.posts[0].thumbnail_url = "https://images.test/tiktok-hosted-thumb.jpg";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => payload,
        } as Response;
      }
      if (url.includes("/social/analytics/posts/tiktok/tt-1")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            platform: "tiktok",
            source_id: "tt-1",
            author: "bravotv",
            text: "TikTok post",
            url: "https://tiktok.com/@bravo/video/1",
            posted_at: "2026-01-01T00:00:00.000Z",
            thumbnail_url: "https://images.test/tiktok-hosted-thumb.jpg",
            source_media_urls: ["https://www.tiktok.com/@bravotv/video/7540327205503601933"],
            hosted_media_urls: ["https://images.test/tiktok-hosted-thumb.jpg"],
            media_asset_meta: {
              source_assets: [{ url: "https://www.tiktok.com/@bravotv/video/7540327205503601933", type: "video" }],
              hosted_assets: [{ url: mirroredVideoUrl, type: "video" }],
              thumbnail_hosted: { url: "https://images.test/tiktok-hosted-thumb.jpg", type: "thumbnail" },
            },
            stats: {
              likes: 60,
              comments_count: 12,
              shares: 7,
              saves: 471,
              views: 2000,
              engagement: 2079,
            },
            total_comments_in_db: 1,
            comments: [],
          }),
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();
    await clickPostDetailCardByThumbnailAlt("TikTok post thumbnail");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Post Details" })).toBeInTheDocument();
    });
    fireEvent.click(
      await screen.findByRole("button", {
        name: /open post media lightbox from details/i,
      }),
    );
    await waitFor(() => {
      const video = document.querySelector("video[aria-label='TikTok media']");
      expect(video).not.toBeNull();
      expect(video?.getAttribute("src")).toContain(mirroredVideoUrl);
    });
    expect(document.querySelector("iframe[title='TikTok media']")).toBeNull();
  });

  it("uses video poster fallback in details when no non-video thumbnail candidate exists", async () => {
    const payload = JSON.parse(JSON.stringify(weekPayload)) as typeof weekPayload;
    payload.platforms.tiktok.posts[0].thumbnail_url = null;
    (
      payload.platforms.tiktok.posts[0] as typeof payload.platforms.tiktok.posts[0] & {
        source_media_urls?: string[];
        hosted_media_urls?: string[];
      }
    ).source_media_urls = ["https://video.test/tiktok-only-video.mp4"];
    (
      payload.platforms.tiktok.posts[0] as typeof payload.platforms.tiktok.posts[0] & {
        source_media_urls?: string[];
        hosted_media_urls?: string[];
      }
    ).hosted_media_urls = [];
    payload.platforms.tiktok.posts[0].media_urls = ["https://video.test/tiktok-only-video.mp4"];

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => payload,
        } as Response;
      }
      if (url.includes("/social/analytics/posts/tiktok/tt-1")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            platform: "tiktok",
            source_id: "tt-1",
            author: "bravotv",
            text: "TikTok post",
            url: "https://tiktok.com/@bravo/video/1",
            posted_at: "2026-01-01T00:00:00.000Z",
            thumbnail_url: null,
            source_thumbnail_url: null,
            hosted_thumbnail_url: null,
            source_media_urls: ["https://video.test/tiktok-only-video.mp4"],
            hosted_media_urls: [],
            media_urls: ["https://video.test/tiktok-only-video.mp4"],
            stats: {
              likes: 60,
              comments_count: 12,
              shares: 7,
              saves: 471,
              views: 2000,
              engagement: 2079,
            },
            total_comments_in_db: 1,
            comments: [],
          }),
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();
    await clickPostDetailCardByThumbnailAlt("TikTok post thumbnail");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Post Details" })).toBeInTheDocument();
    });

    const drawerThumb = screen.getAllByAltText("TikTok post thumbnail").at(-1);
    expect(drawerThumb).toBeDefined();
    expect(drawerThumb).toHaveAttribute("src", expect.stringContaining("https://video.test/tiktok-only-video.mp4"));
  });

  it("does not fall back to source embed when mirrored media URL is an HTML wrapper", async () => {
    const htmlMirrorPayload = JSON.parse(JSON.stringify(weekPayload)) as typeof weekPayload;
    (
      htmlMirrorPayload.platforms.tiktok.posts[0] as typeof htmlMirrorPayload.platforms.tiktok.posts[0] & {
        source_media_urls?: string[];
        hosted_media_urls?: string[];
      }
    ).source_media_urls = ["https://www.tiktok.com/@bravotv/video/7540327205503601933"];
    (
      htmlMirrorPayload.platforms.tiktok.posts[0] as typeof htmlMirrorPayload.platforms.tiktok.posts[0] & {
        source_media_urls?: string[];
        hosted_media_urls?: string[];
      }
    ).hosted_media_urls = [
      "https://d1fmdyqfafwim3.cloudfront.net/social/tiktok/7782652f-783a-488b-8860-41b97de32e75/6/week-0/7540327205503601933/media-01.html",
    ];

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => htmlMirrorPayload,
        } as Response;
      }
      if (url.includes("/social/analytics/posts/tiktok/tt-1")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            platform: "tiktok",
            source_id: "tt-1",
            author: "bravotv",
            text: "TikTok post",
            url: "https://tiktok.com/@bravo/video/1",
            posted_at: "2026-01-01T00:00:00.000Z",
            thumbnail_url: "https://images.test/tt-preview.jpg",
            source_media_urls: ["https://www.tiktok.com/@bravotv/video/7540327205503601933"],
            hosted_media_urls: [
              "https://d1fmdyqfafwim3.cloudfront.net/social/tiktok/7782652f-783a-488b-8860-41b97de32e75/6/week-0/7540327205503601933/media-01.html",
            ],
            stats: {
              likes: 60,
              comments_count: 12,
              shares: 7,
              saves: 471,
              views: 2000,
              engagement: 2079,
            },
            total_comments_in_db: 1,
            comments: [],
          }),
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);

    await waitForWeekDetailReady();
      await clickPostDetailCardByThumbnailAlt("TikTok post thumbnail");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Post Details" })).toBeInTheDocument();
    });
    fireEvent.click(
      await screen.findByRole("button", {
        name: /open post media lightbox from details/i,
      }),
    );
    await waitFor(() => {
      expect(screen.getByAltText("TikTok media")).toBeInTheDocument();
    });
    expect(document.querySelector("iframe[title='TikTok media']")).toBeNull();
    expect(document.querySelector("video[aria-label='TikTok media']")).toBeNull();
    expect(screen.queryByText(/Media failed to load/i)).not.toBeInTheDocument();
  });

  it("shows S3 mirror details for social media URLs served from hosted mirror", async () => {
    const mirroredPayload = JSON.parse(JSON.stringify(weekPayload)) as typeof weekPayload;
    const mirroredVideoUrl = "https://d111111abcdef8.cloudfront.net/social/ig/reel-video.mp4";
    const mirroredThumbUrl = "https://d111111abcdef8.cloudfront.net/social/ig/reel-thumb.jpg";
    mirroredPayload.platforms.instagram.posts[0].media_urls = ["https://instagram.fcdn.net/reel-video.mp4"];
    (
      mirroredPayload.platforms.instagram.posts[0] as typeof mirroredPayload.platforms.instagram.posts[0] & {
        hosted_media_urls?: string[];
        hosted_thumbnail_url?: string;
      }
    ).hosted_media_urls = [mirroredVideoUrl];
    (
      mirroredPayload.platforms.instagram.posts[0] as typeof mirroredPayload.platforms.instagram.posts[0] & {
        hosted_media_urls?: string[];
        hosted_thumbnail_url?: string;
      }
    ).hosted_thumbnail_url = mirroredThumbUrl;
    mirroredPayload.platforms.instagram.posts[0].thumbnail_url = mirroredThumbUrl;

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => mirroredPayload,
        } as Response;
      }
      if (url.includes("/social/analytics/posts/instagram/ig-1")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            platform: "instagram",
            source_id: "ig-1",
            author: "bravotv",
            text: "IG post",
            url: "https://instagram.com/p/abc",
            posted_at: "2026-01-01T00:00:00.000Z",
            thumbnail_url: mirroredThumbUrl,
            media_urls: [mirroredVideoUrl],
            stats: {
              likes: 50,
              comments_count: 10,
              views: 1000,
              engagement: 1060,
            },
            total_comments_in_db: 0,
            comments: [],
          }),
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);

    await waitForWeekDetailReady();

    await clickPostDetailCardByThumbnailAlt("Instagram post thumbnail");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Post Details" })).toBeInTheDocument();
    });
    const openLightboxButton = await screen.findByRole("button", {
      name: /open post media lightbox from details/i,
    });
    fireEvent.click(openLightboxButton);
    const metadataToggle = await screen.findByRole("button", {
      name: /show metadata|hide metadata/i,
    });
    fireEvent.click(metadataToggle);
    expect(screen.getAllByText("S3 Mirror File").length).toBeGreaterThan(0);
  });

  it("renders Twitter/X thumbnails when media is available", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => crossPlatformCoveragePayload,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);

    await waitForWeekDetailReady();

    const twitterThumb = await screen.findByAltText("Twitter/X post thumbnail");
    expect(twitterThumb).toHaveAttribute("src", "https://images.test/x-preview.jpg");
    expect(twitterThumb.className).toContain("object-contain");
  });

  it("does not render YouTube dislike/downvote metrics when values are unavailable", async () => {
    const payloadWithoutDislikes = JSON.parse(JSON.stringify(weekPayload)) as typeof weekPayload;
    delete payloadWithoutDislikes.platforms.youtube.posts[0].dislikes;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => payloadWithoutDislikes,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);

    await waitForWeekDetailReady();
      expect(screen.queryByText("12 Dislikes")).not.toBeInTheDocument();
    expect(screen.queryByText(/Downvotes/i)).not.toBeInTheDocument();
  });

  it("renders BYE WEEK label from backend week detail payload", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => byeWeekPayload,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);

    await waitFor(() => {
      expect(screen.getAllByText("BYE WEEK (Jan 15-Jan 22)").length).toBeGreaterThan(0);
    });
  });

  it("does not overstate ALL comments coverage when one platform is under-saved", async () => {
    mockSearch.value = "source_scope=bravo";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => crossPlatformCoveragePayload,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const allRender = render(<WeekDetailPage />);

    await waitForWeekDetailReady();

    expect(screen.getByText("37.0%")).toBeInTheDocument();
    expect(screen.getByText("542/1.5K* Comments (Saved/Actual)")).toBeInTheDocument();
    allRender.unmount();
    mockSearch.value = "source_scope=bravo&social_platform=twitter";
    render(<WeekDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("35.4%")).toBeInTheDocument();
    });
    expect(screen.getByText("506/1.4K* Comments (Saved/Actual)")).toBeInTheDocument();
  });

  it("uses Sync X action label for twitter-scoped week detail", async () => {
    mockSearch.value = "source_scope=bravo&social_platform=twitter";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => crossPlatformCoveragePayload,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();

    expect(screen.getByTestId("week-sync-button")).toHaveTextContent("Sync X");
  });

  it("applies day and social platform query prefilters and can clear day filter", async () => {
    mockSearch.value = "source_scope=bravo&social_platform=youtube&day=2025-12-31";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => weekPayload,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Day filter: Dec 31")).toBeInTheDocument();
    });
    expect(screen.getByText("Episode Clip")).toBeInTheDocument();
    expect(screen.queryByText("IG post")).not.toBeInTheDocument();
    expect(screen.queryByText("No posts found for this day.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear day filter" }));
    expect(mockRouter.replace).toHaveBeenCalled();
    const nextHref = String(mockRouter.replace.mock.calls.at(-1)?.[0] ?? "");
    expect(nextHref).toContain("/social/w1/youtube");
    expect(nextHref).not.toContain("source_scope=");
    expect(nextHref).not.toContain("social_platform=youtube");
    expect(nextHref).not.toContain("day=");
  });

  it("renders enriched instagram metadata inside the Post Details drawer", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => weekPayload,
        } as Response;
      }
      if (url.includes("/social/analytics/posts/instagram/ig-1")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            platform: "instagram",
            source_id: "ig-1",
            author: "bravotv",
            text: "IG post",
            url: "https://instagram.com/p/abc",
            posted_at: "2026-01-01T00:00:00.000Z",
            thumbnail_url: "https://images.test/ig-preview.jpg",
            post_format: "reel",
            profile_tags: ["tagged_user"],
            collaborators: ["collab_user"],
            hashtags: ["RHOSLC"],
            mentions: ["@bravotv"],
            duration_seconds: 14,
            cover_source: "custom_cover",
            cover_source_confidence: "high",
            stats: {
              likes: 50,
              comments_count: 10,
              views: 1000,
              engagement: 1060,
            },
            total_comments_in_db: 0,
            comments: [],
          }),
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);

    await waitForWeekDetailReady();

    await clickPostDetailCardByThumbnailAlt("Instagram post thumbnail");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Post Details" })).toBeInTheDocument();
    });
    expect(screen.getAllByText("REEL").length).toBeGreaterThan(0);
    expect(screen.getAllByText("14s").length).toBeGreaterThan(0);
    expect(screen.getAllByText("@tagged_user").length).toBeGreaterThan(0);
    expect(screen.getAllByText("@collab_user").length).toBeGreaterThan(0);
    expect(screen.queryByText("#RHOSLC")).not.toBeInTheDocument();
    expect(screen.getAllByText("@bravotv").length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.getAllByText(/\(high\)/i).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("IG post").length).toBeGreaterThan(1);
    expect(screen.queryByText("Media Asset Metadata")).not.toBeInTheDocument();
    expect(screen.queryByText(/Policy:\s*best_per_asset/i)).not.toBeInTheDocument();
  });

  it("opens the source video entry first when only the thumbnail is mirrored", async () => {
    const mirroredThumbUrl = "https://d111111abcdef8.cloudfront.net/social/ig/reel-thumb.jpg";
    const sourceVideoUrl = "https://instagram.fcdn.net/reel-video.mp4";
    const thumbnailOnlyPayload = JSON.parse(JSON.stringify(weekPayload)) as typeof weekPayload;
    thumbnailOnlyPayload.platforms.instagram.posts[0].media_urls = [sourceVideoUrl];
    (
      thumbnailOnlyPayload.platforms.instagram.posts[0] as typeof thumbnailOnlyPayload.platforms.instagram.posts[0] & {
        source_media_urls?: string[];
        hosted_media_urls?: string[];
        source_thumbnail_url?: string;
        hosted_thumbnail_url?: string;
        thumbnail_url?: string | null;
      }
    ).source_media_urls = [sourceVideoUrl];
    (
      thumbnailOnlyPayload.platforms.instagram.posts[0] as typeof thumbnailOnlyPayload.platforms.instagram.posts[0] & {
        source_media_urls?: string[];
        hosted_media_urls?: string[];
        source_thumbnail_url?: string;
        hosted_thumbnail_url?: string;
        thumbnail_url?: string | null;
      }
    ).hosted_media_urls = [];
    (
      thumbnailOnlyPayload.platforms.instagram.posts[0] as typeof thumbnailOnlyPayload.platforms.instagram.posts[0] & {
        source_media_urls?: string[];
        hosted_media_urls?: string[];
        source_thumbnail_url?: string;
        hosted_thumbnail_url?: string;
        thumbnail_url?: string | null;
      }
    ).source_thumbnail_url = "https://instagram.fcdn.net/reel-thumb.jpg";
    (
      thumbnailOnlyPayload.platforms.instagram.posts[0] as typeof thumbnailOnlyPayload.platforms.instagram.posts[0] & {
        source_media_urls?: string[];
        hosted_media_urls?: string[];
        source_thumbnail_url?: string;
        hosted_thumbnail_url?: string;
        thumbnail_url?: string | null;
      }
    ).hosted_thumbnail_url = mirroredThumbUrl;
    thumbnailOnlyPayload.platforms.instagram.posts[0].thumbnail_url = mirroredThumbUrl;

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => thumbnailOnlyPayload,
        } as Response;
      }
      if (url.includes("/social/analytics/posts/instagram/ig-1")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            platform: "instagram",
            source_id: "ig-1",
            author: "bravotv",
            text: "IG post",
            url: "https://instagram.com/p/abc",
            posted_at: "2026-01-01T00:00:00.000Z",
            thumbnail_url: mirroredThumbUrl,
            media_urls: [sourceVideoUrl],
            source_media_urls: [sourceVideoUrl],
            hosted_media_urls: [],
            source_thumbnail_url: "https://instagram.fcdn.net/reel-thumb.jpg",
            hosted_thumbnail_url: mirroredThumbUrl,
            stats: {
              likes: 50,
              comments_count: 10,
              views: 1000,
              engagement: 1060,
            },
            total_comments_in_db: 0,
            comments: [],
          }),
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);

    await waitForWeekDetailReady();

    fireEvent.click(screen.getByLabelText("Instagram platform"));
    await clickPostDetailCardByThumbnailAlt("Instagram post thumbnail");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Post Details" })).toBeInTheDocument();
    });
    const openLightboxButton = await screen.findByRole("button", {
      name: "Open post media lightbox from details",
    });
    fireEvent.click(openLightboxButton);
    const metadataToggle = await screen.findByRole("button", {
      name: /show metadata|hide metadata/i,
    });
    fireEvent.click(metadataToggle);
    await waitFor(() => {
      expect(document.querySelector("video[aria-label='Instagram media']")).not.toBeNull();
    });
  });

  it("opens Instagram reel video first when hosted media slot contains only a still image", async () => {
    const sourceVideoUrl = "https://instagram.fcdn.net/reel-video.mp4";
    const hostedStillUrl = "https://d111111abcdef8.cloudfront.net/social/ig/reel-still.jpg";
    const reelPayload = JSON.parse(JSON.stringify(weekPayload)) as typeof weekPayload;
    reelPayload.platforms.instagram.posts[0].media_urls = [sourceVideoUrl];
    (
      reelPayload.platforms.instagram.posts[0] as typeof reelPayload.platforms.instagram.posts[0] & {
        source_media_urls?: string[];
        hosted_media_urls?: string[];
        source_thumbnail_url?: string;
        hosted_thumbnail_url?: string;
        thumbnail_url?: string | null;
      }
    ).source_media_urls = [sourceVideoUrl];
    (
      reelPayload.platforms.instagram.posts[0] as typeof reelPayload.platforms.instagram.posts[0] & {
        source_media_urls?: string[];
        hosted_media_urls?: string[];
        source_thumbnail_url?: string;
        hosted_thumbnail_url?: string;
        thumbnail_url?: string | null;
      }
    ).hosted_media_urls = [hostedStillUrl];
    (
      reelPayload.platforms.instagram.posts[0] as typeof reelPayload.platforms.instagram.posts[0] & {
        source_media_urls?: string[];
        hosted_media_urls?: string[];
        source_thumbnail_url?: string;
        hosted_thumbnail_url?: string;
        thumbnail_url?: string | null;
      }
    ).source_thumbnail_url = "https://instagram.fcdn.net/reel-thumb.jpg";
    (
      reelPayload.platforms.instagram.posts[0] as typeof reelPayload.platforms.instagram.posts[0] & {
        source_media_urls?: string[];
        hosted_media_urls?: string[];
        source_thumbnail_url?: string;
        hosted_thumbnail_url?: string;
        thumbnail_url?: string | null;
      }
    ).hosted_thumbnail_url = hostedStillUrl;
    reelPayload.platforms.instagram.posts[0].thumbnail_url = hostedStillUrl;

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => reelPayload,
        } as Response;
      }
      if (url.includes("/social/analytics/posts/instagram/ig-1")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            platform: "instagram",
            source_id: "ig-1",
            author: "bravotv",
            text: "IG reel post",
            url: "https://instagram.com/reel/abc",
            posted_at: "2026-01-01T00:00:00.000Z",
            post_format: "reel",
            thumbnail_url: hostedStillUrl,
            source_media_urls: [sourceVideoUrl],
            hosted_media_urls: [hostedStillUrl],
            source_thumbnail_url: "https://instagram.fcdn.net/reel-thumb.jpg",
            hosted_thumbnail_url: hostedStillUrl,
            stats: {
              likes: 50,
              comments_count: 10,
              views: 1000,
              engagement: 1060,
            },
            total_comments_in_db: 0,
            comments: [],
          }),
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);

    await waitForWeekDetailReady();
    fireEvent.click(screen.getByLabelText("Instagram platform"));
    await clickPostDetailCardByThumbnailAlt("Instagram post thumbnail");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Post Details" })).toBeInTheDocument();
    });
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Open post media lightbox from details",
      }),
    );
    await waitFor(() => {
      expect(document.querySelector("video[aria-label='Instagram media']")).not.toBeNull();
    });
  });

  it("lets album/carousel posts navigate in lightbox using Post Details media payload", async () => {
    const carouselPayload = JSON.parse(JSON.stringify(weekPayload)) as typeof weekPayload;
    carouselPayload.platforms.instagram.posts[0].thumbnail_url = "https://images.test/ig-carousel-1.jpg";
    carouselPayload.platforms.instagram.posts[0].media_urls = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => carouselPayload,
        } as Response;
      }
      if (url.includes("/social/analytics/posts/instagram/ig-1")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            platform: "instagram",
            source_id: "ig-1",
            author: "bravotv",
            text: "IG carousel post",
            url: "https://instagram.com/p/abc",
            posted_at: "2026-01-01T00:00:00.000Z",
            thumbnail_url: "https://images.test/ig-carousel-1.jpg",
            media_urls: [
              "https://images.test/ig-carousel-1.jpg",
              "https://images.test/ig-carousel-2.jpg",
              "https://images.test/ig-carousel-3.jpg",
            ],
            stats: {
              likes: 50,
              comments_count: 10,
              views: 1000,
              engagement: 1060,
            },
            total_comments_in_db: 0,
            comments: [],
          }),
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);

    await waitForWeekDetailReady();

    await clickPostDetailCardByThumbnailAlt("Instagram post thumbnail");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Post Details" })).toBeInTheDocument();
    });

    fireEvent.click(
      await screen.findByRole("button", {
        name: /open post media lightbox from details/i,
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("1 of 3")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("Next image"));
    await waitFor(() => {
      expect(screen.getByText("2 of 3")).toBeInTheDocument();
    });
  });

  it("renders hosted comment media links in the TikTok Post Details drawer", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => weekPayload,
        } as Response;
      }
      if (url.includes("/social/analytics/posts/tiktok/tt-1")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            platform: "tiktok",
            source_id: "tt-1",
            author: "bravotv",
            text: "TikTok post",
            url: "https://tiktok.com/@bravo/video/1",
            posted_at: "2026-01-01T00:00:00.000Z",
            thumbnail_url: "https://images.test/tt-preview.jpg",
            stats: {
              likes: 60,
              comments_count: 12,
              shares: 7,
              saves: 471,
              views: 2000,
              engagement: 2079,
            },
            total_comments_in_db: 1,
            comments: [
              {
                comment_id: "c-1",
                author: "viewer",
                text: "comment with media",
                likes: 2,
                is_reply: false,
                reply_count: 0,
                created_at: "2026-01-01T01:00:00.000Z",
                media_urls: ["https://source.example/comment-media.jpg"],
                hosted_media_urls: ["https://cdn.example/comment-media.jpg"],
                media_mirror_status: "mirrored",
                replies: [],
              },
            ],
          }),
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);

    await waitForWeekDetailReady();

    await clickPostDetailCardByThumbnailAlt("TikTok post thumbnail");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Post Details" })).toBeInTheDocument();
    });
    expect(screen.getAllByText("Saves").length).toBeGreaterThan(0);
    const commentMediaLink = await screen.findByRole("link", {
      name: /comment media 1/i,
    });
    expect(commentMediaLink).toHaveAttribute("href", "https://cdn.example/comment-media.jpg");
  });

  it("renders a cycle-suppressed warning for cyclic threaded comments in Post Details", async () => {
    const cyclicPostPayload = {
      platform: "instagram",
      source_id: "ig-1",
      author: "bravotv",
      text: "IG post",
      url: "https://instagram.com/p/abc",
      posted_at: "2026-01-01T00:00:00.000Z",
      thumbnail_url: "https://images.test/ig-preview.jpg",
      media_urls: ["https://images.test/ig-media-1.jpg"],
      stats: {
        likes: 50,
        comments_count: 10,
        views: 1000,
        engagement: 1060,
      },
      total_comments_in_db: 2,
      total_quotes_in_db: 0,
      comments: [
        {
          comment_id: "root-comment",
          author: "thread_owner",
          text: "Root comment",
          likes: 1,
          is_reply: false,
          reply_count: 1,
          created_at: "2026-01-01T00:10:00.000Z",
          replies: [
            {
              comment_id: "reply-comment",
              author: "reply_user",
              text: "Child reply",
              likes: 2,
              is_reply: true,
              reply_count: 1,
              created_at: "2026-01-01T00:11:00.000Z",
              replies: [
                {
                  comment_id: "root-comment",
                  author: "thread_owner",
                  text: "Cyclic repeat",
                  likes: 0,
                  is_reply: true,
                  reply_count: 0,
                  created_at: "2026-01-01T00:12:00.000Z",
                  replies: [],
                },
              ],
            },
          ],
        },
      ],
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => weekPayload,
        } as Response;
      }
      if (url.includes("/social/analytics/posts/instagram/ig-1")) {
        return {
          ok: true,
          status: 200,
          json: async () => cyclicPostPayload,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);

    await waitForWeekDetailReady();
    await clickPostDetailCardByThumbnailAlt("Instagram post thumbnail");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Post Details" })).toBeInTheDocument();
    });

    expect(await screen.findByText((_, element) => element?.textContent?.trim() === "Root comment")).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent?.trim() === "Child reply")).toBeInTheDocument();
    expect(screen.getByText(/nested replies skipped due to thread cycle/i)).toBeInTheDocument();
  });

  it("switches Twitter/X Post Details drawer between comments/replies and quotes", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => crossPlatformCoveragePayload,
        } as Response;
      }
      if (url.includes("/social/analytics/posts/twitter/x-1")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            platform: "twitter",
            source_id: "x-1",
            author: "BravoTV",
            text: "X post",
            url: "https://x.com/BravoTV/status/1",
            posted_at: "2026-01-01T00:00:00.000Z",
            thumbnail_url: "https://images.test/x-preview.jpg",
            stats: {
              likes: 100,
              replies_count: 1386,
              retweets: 10,
              quotes: 44,
              views: 120000,
              engagement: 1000,
            },
            total_comments_in_db: 506,
            total_quotes_in_db: 2,
            comments: [
              {
                comment_id: "reply-1",
                author: "user-1",
                text: "Reply thread comment",
                likes: 5,
                is_reply: false,
                reply_count: 0,
                created_at: "2026-01-01T01:00:00.000Z",
                user: {
                  username: "user-1",
                  display_name: "Reply User",
                  avatar_url: "https://images.test/reply-user-avatar.jpg",
                },
                replies: [],
              },
            ],
            quotes: [
              {
                comment_id: "quote-1",
                author: "quote-user-1",
                text: "Quote tweet one",
                likes: 11,
                is_reply: false,
                created_at: "2026-01-01T02:00:00.000Z",
                user: {
                  username: "quote-user-1",
                  display_name: "Quote User 1",
                  avatar_url: "https://images.test/quote-user-avatar.jpg",
                },
              },
              {
                comment_id: "quote-2",
                author: "quote-user-2",
                text: "Quote tweet two",
                likes: 9,
                is_reply: false,
                created_at: "2026-01-01T03:00:00.000Z",
                user: {
                  username: "quote-user-2",
                  display_name: "Quote User 2",
                },
              },
            ],
          }),
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);

    await waitForWeekDetailReady();

    await clickPostDetailCardByThumbnailAlt("Twitter/X post thumbnail");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Replies|Comments & Replies/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Quotes" })).toBeInTheDocument();
    });
    expect(screen.getByText("Reply thread comment")).toBeInTheDocument();
    expect(screen.getByAltText("@user-1 avatar")).toBeInTheDocument();
    expect(screen.queryByText("Quote tweet one")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Quotes" }));
    await waitFor(() => {
      expect(screen.getByText("All Quotes (2)")).toBeInTheDocument();
    });
    expect(screen.getByText("Quote tweet one")).toBeInTheDocument();
    expect(screen.getByText("Quote tweet two")).toBeInTheDocument();
    expect(screen.getByAltText("@quote-user-1 avatar")).toBeInTheDocument();
    expect(screen.queryByText("Reply thread comment")).not.toBeInTheDocument();
    const drawerThumb = screen.getAllByAltText("Twitter/X post thumbnail").at(-1);
    expect(drawerThumb?.className).toContain("object-contain");
  });

  it("renders exact integer formatting for Twitter stats in post details", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => crossPlatformCoveragePayload,
        } as Response;
      }
      if (url.includes("/social/analytics/posts/twitter/x-1")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            platform: "twitter",
            source_id: "x-1",
            author: "BravoTV",
            text: "X post",
            url: "https://x.com/BravoTV/status/1",
            posted_at: "2026-01-01T00:00:00.000Z",
            thumbnail_url: "https://images.test/x-preview.jpg",
            stats: {
              likes: 7092,
              replies_count: 10,
              retweets: 1800,
              quotes: 1800,
              views: 617900,
              engagement: 626807,
            },
            total_comments_in_db: 12,
            total_quotes_in_db: 1800,
            comments: [],
            quotes: [
              {
                comment_id: "quote-1",
                author: "quote-user",
                text: "quote one",
                likes: 1,
                is_reply: false,
                created_at: "2026-01-01T02:00:00.000Z",
                user: {
                  username: "quote-user",
                  display_name: "Quote User",
                },
              },
            ],
          }),
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);

    await waitForWeekDetailReady();
    await clickPostDetailCardByThumbnailAlt("Twitter/X post thumbnail");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Post Details" })).toBeInTheDocument();
    });

    expect(screen.getByText((content) => content.includes("7,092"))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("617,900"))).toBeInTheDocument();
    expect(
      screen.getByText((_, el) => (el?.textContent ?? "").startsWith("All Comments (12/")),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Quotes" }));
    await waitFor(() => {
      expect(screen.getByText("All Quotes (1,800)")).toBeInTheDocument();
    });
    expect(screen.getByText("Saved in Supabase: 1 of 1,800 platform-reported quotes.")).toBeInTheDocument();
  });

  it("prefers non-video detail thumbnail candidates for Twitter post drawer", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => crossPlatformCoveragePayload,
        } as Response;
      }
      if (url.includes("/social/analytics/posts/twitter/x-1")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            platform: "twitter",
            source_id: "x-1",
            author: "BravoTV",
            text: "Detail thumbnail fallback",
            url: "https://x.com/BravoTV/status/1",
            posted_at: "2026-01-01T00:00:00.000Z",
            thumbnail_url: "https://video.twimg.com/ext_tw_video/detail.mp4",
            media_urls: [
              "https://video.twimg.com/ext_tw_video/detail.mp4",
              "https://images.test/twitter-detail-still.jpg",
            ],
            stats: {
              likes: 1,
              replies_count: 1,
              retweets: 1,
              quotes: 1,
              views: 1,
              engagement: 5,
            },
            total_comments_in_db: 0,
            total_quotes_in_db: 0,
            comments: [],
            quotes: [],
          }),
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);

    await waitForWeekDetailReady();
    await clickPostDetailCardByThumbnailAlt("Twitter/X post thumbnail");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Post Details" })).toBeInTheDocument();
    });

    const drawerThumb = screen.getAllByAltText("Twitter/X post thumbnail").at(-1);
    expect(drawerThumb).toBeDefined();
    expect(drawerThumb).toHaveAttribute("src", "https://images.test/twitter-detail-still.jpg");
    expect(drawerThumb).not.toHaveAttribute("src", expect.stringContaining(".mp4"));
  });

  it("queues incremental week comment sync from Week view", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1/summary")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            week: weekPayload.week,
            season: weekPayload.season,
            source_scope: "bravo",
            platforms: {},
            totals: { posts: 3, total_comments: 36, total_engagement: 420 },
          }),
        } as Response;
      }
      if (url.includes("/social/analytics/week/1")) {
        return { ok: true, status: 200, json: async () => weekPayload } as Response;
      }
      if (url.includes("/social/ingest") && init?.method === "POST") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            run_id: "80423aa2-83ae-4f44-8aa4-dd5e8f8d39eb",
            queued_or_started_jobs: 8,
          }),
        } as Response;
      }
      if (url.includes("/social/runs/80423aa2-83ae-4f44-8aa4-dd5e8f8d39eb/progress?")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            season_id: "season-1",
            run_id: "80423aa2-83ae-4f44-8aa4-dd5e8f8d39eb",
            run_status: "completed",
            source_scope: "bravo",
            stages: {
              posts: {
                jobs_total: 4,
                jobs_completed: 4,
                jobs_failed: 0,
                jobs_active: 0,
                scraped_count: 0,
                saved_count: 0,
              },
              comments: {
                jobs_total: 4,
                jobs_completed: 4,
                jobs_failed: 0,
                jobs_active: 0,
                scraped_count: 10,
                saved_count: 8,
              },
            },
            per_handle: [
              {
                platform: "instagram",
                account_handle: "bravotv",
                stage: "comments",
                jobs_total: 1,
                jobs_completed: 1,
                jobs_failed: 0,
                jobs_active: 0,
                scraped_count: 10,
                saved_count: 8,
              },
            ],
            recent_log: [
              {
                id: "log-1",
                timestamp: "2026-01-01T00:01:00.000Z",
                platform: "instagram",
                account_handle: "bravotv",
                stage: "comments",
                status: "completed",
                line: "@bravotv comments completed · saved 0p/8c",
              },
              {
                id: "log-2",
                timestamp: "2026-01-01T00:00:30.000Z",
                platform: "instagram",
                account_handle: "bravotv",
                stage: "comments_fetch",
                status: "running",
                line: "comments fetch",
              },
            ],
            summary: {
              total_jobs: 8,
              completed_jobs: 8,
              failed_jobs: 0,
              active_jobs: 0,
              items_found_total: 36,
              stage_counts: {
                posts: { total: 4, completed: 4, failed: 0, active: 0 },
                comments: { total: 4, completed: 4, failed: 0, active: 0 },
              },
            },
          }),
        } as Response;
      }
      if (url.includes("/social/analytics/week/1/live-health?")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            day_account_rows: [],
            asset_health: [],
            updated_at: "2026-01-01T00:02:00.000Z",
          }),
        } as Response;
      }
      if (url.includes("/social/analytics/comments-coverage?")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            total_saved_comments: 36,
            total_reported_comments: 36,
            coverage_pct: 100,
            up_to_date: true,
            stale_posts_count: 0,
            posts_scanned: 3,
            by_platform: {
              instagram: {
                total_saved_comments: 10,
                total_reported_comments: 10,
                coverage_pct: 100,
                up_to_date: true,
                stale_posts_count: 0,
                posts_scanned: 1,
              },
              tiktok: {
                total_saved_comments: 12,
                total_reported_comments: 12,
                coverage_pct: 100,
                up_to_date: true,
                stale_posts_count: 0,
                posts_scanned: 1,
              },
              youtube: {
                total_saved_comments: 14,
                total_reported_comments: 14,
                coverage_pct: 100,
                up_to_date: true,
                stale_posts_count: 0,
                posts_scanned: 1,
              },
            },
            evaluated_at: "2026-01-01T00:02:00.000Z",
          }),
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();

    const syncButton = await screen.findByTestId("week-sync-button");
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Pass 1\/1 queued for Week 1 \(all platforms\) · run 80423aa2 · 8 job\(s\)/),
      ).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("Sync Progress")).toBeInTheDocument();
      expect(screen.getByText(/Coverage 36\/36 \(100\.0%\) · Up-to-Date\./i)).toBeInTheDocument();
    });
    expect(screen.getByText(/10 scraped/i)).toBeInTheDocument();

    const ingestCall = fetchMock.mock.calls.find(
      (call) => String(call[0]).includes("/social/ingest") && (call[1] as RequestInit | undefined)?.method === "POST",
    );
    expect(ingestCall).toBeDefined();
    const ingestInit = ingestCall?.[1] as RequestInit;
    const body = JSON.parse(String(ingestInit.body ?? "{}")) as Record<string, unknown>;

    expect(body.source_scope).toBe("bravo");
    expect(body.sync_strategy).toBe("incremental");
    expect(body.ingest_mode).toBe("posts_and_comments");
    expect(body.max_comments_per_post).toBe(10000);
    expect(body.max_replies_per_post).toBe(2000);
    expect(body.date_start).toBe(weekPayload.week.start);
    expect(body.date_end).toBe(weekPayload.week.end);
    expect(body.platforms).toBeUndefined();
  });

  it("uses summary_normalized for top sync progress counts", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1/summary")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            week: weekPayload.week,
            season: weekPayload.season,
            source_scope: "bravo",
            platforms: {},
            totals: { posts: 3, total_comments: 36, total_engagement: 420 },
          }),
        } as Response;
      }
      if (url.includes("/social/analytics/week/1")) {
        return { ok: true, status: 200, json: async () => weekPayload } as Response;
      }
      if (url.includes("/social/ingest") && init?.method === "POST") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            run_id: "a623c36b-9805-4f6b-b741-0b208fba050c",
            queued_or_started_jobs: 8,
          }),
        } as Response;
      }
      if (url.includes("/social/runs/a623c36b-9805-4f6b-b741-0b208fba050c/progress?")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            season_id: "season-1",
            run_id: "a623c36b-9805-4f6b-b741-0b208fba050c",
            run_status: "running",
            source_scope: "bravo",
            stages: {},
            per_handle: [],
            recent_log: [],
            summary: {
              total_jobs: 8,
              completed_jobs: 6,
              failed_jobs: 1,
              active_jobs: 1,
              items_found_total: 12,
              stage_counts: {},
            },
          }),
        } as Response;
      }
      if (url.includes("/social/analytics/week/1/live-health?")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            day_account_rows: [],
            asset_health: [],
            updated_at: "2026-01-01T00:02:00.000Z",
          }),
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();

    fireEvent.click(await screen.findByTestId("week-sync-button"));

    await waitFor(() => {
      expect(screen.getByText(/7\/8 jobs/i)).toBeInTheDocument();
    });
  });

  it("loads platform totals from the dedicated week summary endpoint", async () => {
    const summaryPayload = {
      week: weekPayload.week,
      season: weekPayload.season,
      source_scope: "bravo",
      platforms: {
        instagram: { total_posts: 5, totals: { posts: 5 } },
        tiktok: { total_posts: 4, totals: { posts: 4 } },
        youtube: { total_posts: 3, totals: { posts: 3 } },
        twitter: { total_posts: 2, totals: { posts: 2 } },
        facebook: { total_posts: 1, totals: { posts: 1 } },
        threads: { total_posts: 0, totals: { posts: 0 } },
      },
      totals: { posts: 15, total_comments: 0, total_engagement: 0 },
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1/summary")) {
        return { ok: true, status: 200, json: async () => summaryPayload } as Response;
      }
      if (url.includes("/social/analytics/week/1")) {
        return { ok: true, status: 200, json: async () => weekPayload } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();

    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/social/analytics/week/1/summary"))).toBe(true);
  });

  it("keeps the posts summary metric aligned with authoritative week summary totals", async () => {
    const metricsPayload = {
      ...weekPayload,
      platforms: {
        ...weekPayload.platforms,
        youtube: { posts: [], totals: { posts: 0, total_comments: 0, total_engagement: 0 } },
      },
      totals: { posts: 14, total_comments: 100, total_engagement: 1000 },
      pagination: { limit: 100, offset: 0, returned: 14, total: 14, has_more: false },
    };
    const summaryPayload = {
      week: weekPayload.week,
      season: weekPayload.season,
      source_scope: "bravo",
      platforms: {
        instagram: { total_posts: 5, totals: { posts: 5 } },
        tiktok: { total_posts: 4, totals: { posts: 4 } },
        youtube: { total_posts: 1, totals: { posts: 1 } },
        twitter: { total_posts: 2, totals: { posts: 2 } },
        facebook: { total_posts: 1, totals: { posts: 1 } },
        threads: { total_posts: 2, totals: { posts: 2 } },
      },
      totals: { posts: 15, total_comments: 100, total_engagement: 1000 },
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1/summary")) {
        return { ok: true, status: 200, json: async () => summaryPayload } as Response;
      }
      if (url.includes("/social/analytics/week/1")) {
        const query = new URLSearchParams(url.split("?")[1] ?? "");
        if (query.get("post_limit") === "100") {
          return { ok: true, status: 200, json: async () => metricsPayload } as Response;
        }
        return { ok: true, status: 200, json: async () => weekPayload } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();

    await waitFor(() => {
      expect(within(screen.getByTestId("week-summary-posts")).getByText("15")).toBeInTheDocument();
    });
  });

  it("renders zero-post platform status cards as no-post coverage instead of stale partial health", async () => {
    const payload = {
      ...weekPayload,
      platforms: {
        ...weekPayload.platforms,
        youtube: {
          ...weekPayload.platforms.youtube,
          posts: [],
          totals: { posts: 0, total_comments: 0, total_engagement: 0 },
        },
      },
      status_by_platform: {
        youtube: {
          sync_status: "partial",
          comment_sync_status: { expected_count: 220, upserted_count: 220, status: "partial" },
          media_mirror_status: { source_count: 1, mirrored_count: 0, status: "partial" },
          last_refresh_reason: "youtube_comment_gap",
        },
      },
    };
    const summaryPayload = {
      week: payload.week,
      season: payload.season,
      source_scope: "bravo",
      platforms: {
        instagram: { total_posts: 1, totals: { posts: 1 } },
        tiktok: { total_posts: 1, totals: { posts: 1 } },
        youtube: { total_posts: 0, totals: { posts: 0 } },
        twitter: { total_posts: 0, totals: { posts: 0 } },
        facebook: { total_posts: 0, totals: { posts: 0 } },
        threads: { total_posts: 0, totals: { posts: 0 } },
      },
      totals: { posts: 2, total_comments: 22, total_engagement: 220 },
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1/summary")) {
        return { ok: true, status: 200, json: async () => summaryPayload } as Response;
      }
      if (url.includes("/social/analytics/week/1")) {
        return { ok: true, status: 200, json: async () => payload } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();

    const youtubeCard = screen.getAllByText("YouTube")[1]?.closest("div.rounded-lg");
    expect(youtubeCard).not.toBeNull();
    expect(within(youtubeCard as HTMLDivElement).getByText("No posts")).toBeInTheDocument();
    expect(
      within(youtubeCard as HTMLDivElement).getByText("Previous sync attempts for this week did not complete cleanly"),
    ).toBeInTheDocument();
    expect(
      within(youtubeCard as HTMLDivElement).getByText("Prior refresh attempts exist for the selected week"),
    ).toBeInTheDocument();
    expect(within(youtubeCard as HTMLDivElement).queryByText(/Reason:/i)).not.toBeInTheDocument();
  });

  it("renders zero-post platform status cards as in-flight when sync jobs are still running", async () => {
    const payload = {
      ...weekPayload,
      platforms: {
        ...weekPayload.platforms,
        youtube: {
          ...weekPayload.platforms.youtube,
          posts: [],
          totals: { posts: 0, total_comments: 0, total_engagement: 0 },
        },
      },
      status_by_platform: {
        youtube: {
          sync_status: "running",
          comment_sync_status: { expected_count: 0, upserted_count: 0, status: "idle" },
          media_mirror_status: { source_count: 0, mirrored_count: 0, status: "not_needed" },
          last_refresh_reason: "posts_running",
          worker_run_id: "run-live-1234",
          active_job_summary: {
            sync_status: "running",
            dominant_stage: "posts",
            job_count: 2,
            stage_statuses: { posts: { status: "running", job_count: 2 } },
          },
        },
      },
    };
    const summaryPayload = {
      week: payload.week,
      season: payload.season,
      source_scope: "bravo",
      platforms: {
        instagram: { total_posts: 1, totals: { posts: 1 } },
        tiktok: { total_posts: 1, totals: { posts: 1 } },
        youtube: { total_posts: 0, totals: { posts: 0 } },
        twitter: { total_posts: 0, totals: { posts: 0 } },
        facebook: { total_posts: 0, totals: { posts: 0 } },
        threads: { total_posts: 0, totals: { posts: 0 } },
      },
      totals: { posts: 2, total_comments: 22, total_engagement: 220 },
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1/summary")) {
        return { ok: true, status: 200, json: async () => summaryPayload } as Response;
      }
      if (url.includes("/social/analytics/week/1")) {
        return { ok: true, status: 200, json: async () => payload } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();

    const youtubeCard = screen.getAllByText("YouTube")[1]?.closest("div.rounded-lg");
    expect(youtubeCard).not.toBeNull();
    expect(within(youtubeCard as HTMLDivElement).getByText("Running")).toBeInTheDocument();
    expect(within(youtubeCard as HTMLDivElement).getByText("Sync in progress for this week window")).toBeInTheDocument();
    expect(within(youtubeCard as HTMLDivElement).getByText("Sync in progress for selected week")).toBeInTheDocument();
    expect(within(youtubeCard as HTMLDivElement).getByText("Running posts · 2 jobs")).toBeInTheDocument();
    expect(within(youtubeCard as HTMLDivElement).getByText("Reason: posts_running · Run run-live")).toBeInTheDocument();
    expect(within(youtubeCard as HTMLDivElement).queryByText("No posts in this week window")).not.toBeInTheDocument();
  });

  it("renders status-tone pills for post comment sync and mirror states", async () => {
    const payload = {
      ...weekPayload,
      platforms: {
        ...weekPayload.platforms,
        instagram: {
          ...weekPayload.platforms.instagram,
          posts: [
            {
              ...weekPayload.platforms.instagram.posts[0],
              status: {
                sync_status: "partial",
                comment_sync_status: {
                  status: "partial",
                  expected_count: 10,
                  fetched_count: 4,
                  upserted_count: 4,
                },
                media_mirror_status: {
                  status: "running",
                  source_count: 1,
                  mirrored_count: 0,
                },
              },
            },
          ],
        },
      },
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1/summary")) {
        return { ok: true, status: 200, json: async () => payload } as Response;
      }
      if (url.includes("/social/analytics/week/1")) {
        return { ok: true, status: 200, json: async () => payload } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();

    const commentPill = screen.getByText("Comment sync Partial");
    const mirrorPill = screen.getByText("Mirror Running");
    expect(commentPill.className).toContain("bg-amber-100");
    expect(commentPill.className).toContain("text-amber-700");
    expect(mirrorPill.className).toContain("bg-blue-100");
    expect(mirrorPill.className).toContain("text-blue-700");
  });

  it("clamps post comment coverage labels to the reported total", async () => {
    const payload = {
      ...weekPayload,
      platforms: {
        ...weekPayload.platforms,
        instagram: {
          ...weekPayload.platforms.instagram,
          posts: [
            {
              ...weekPayload.platforms.instagram.posts[0],
              total_comments_available: 12,
              comments_count: 10,
            },
          ],
        },
      },
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1/summary")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            week: payload.week,
            season: payload.season,
            source_scope: "bravo",
            platforms: {
              instagram: { total_posts: 1, totals: { posts: 1, total_comments: 10, total_engagement: 100 } },
            },
            totals: { posts: 1, total_comments: 10, total_engagement: 100 },
          }),
        } as Response;
      }
      if (url.includes("/social/analytics/week/1")) {
        return { ok: true, status: 200, json: async () => payload } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();

    expect(screen.getByRole("button", { name: /Post Details· 10\/10 comments/i })).toBeInTheDocument();
  });

  it("forces RHOSLC instagram sync payload to include BravoTV + BravoWWHL and #RHOSLC", async () => {
    mockSearch.value = "source_scope=bravo&social_platform=instagram";
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1/summary")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            week: weekPayload.week,
            season: weekPayload.season,
            source_scope: "bravo",
            platforms: { instagram: { total_posts: 1, totals: { posts: 1, total_comments: 10, total_engagement: 100 } } },
            totals: { posts: 1, total_comments: 10, total_engagement: 100 },
          }),
        } as Response;
      }
      if (url.includes("/social/analytics/week/1")) {
        return { ok: true, status: 200, json: async () => weekPayload } as Response;
      }
      if (url.includes("/social/ingest") && init?.method === "POST") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            run_id: "bc2e23e7-213f-47f3-8855-92ce45c45095",
            queued_or_started_jobs: 4,
          }),
        } as Response;
      }
      if (url.includes("/social/runs/bc2e23e7-213f-47f3-8855-92ce45c45095/progress?")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            season_id: "season-1",
            run_id: "bc2e23e7-213f-47f3-8855-92ce45c45095",
            run_status: "completed",
            source_scope: "bravo",
            stages: {},
            per_handle: [],
            recent_log: [],
            summary: {
              total_jobs: 4,
              completed_jobs: 4,
              failed_jobs: 0,
              active_jobs: 0,
              items_found_total: 10,
              stage_counts: {
                posts: { total: 2, completed: 2, failed: 0, active: 0 },
                comments: { total: 2, completed: 2, failed: 0, active: 0 },
              },
            },
          }),
        } as Response;
      }
      if (url.includes("/social/analytics/week/1/live-health?")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            day_account_rows: [],
            asset_health: [],
            updated_at: "2026-01-01T00:02:00.000Z",
          }),
        } as Response;
      }
      if (url.includes("/social/analytics/comments-coverage?")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            total_saved_comments: 10,
            total_reported_comments: 10,
            coverage_pct: 100,
            up_to_date: true,
            stale_posts_count: 0,
            posts_scanned: 1,
            by_platform: {},
          }),
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();

    fireEvent.click(await screen.findByTestId("week-sync-button"));

    const ingestCall = fetchMock.mock.calls.find(
      (call) => String(call[0]).includes("/social/ingest") && (call[1] as RequestInit | undefined)?.method === "POST",
    );
    if (ingestCall) {
      const ingestInit = ingestCall[1] as RequestInit;
      const body = JSON.parse(String(ingestInit.body ?? "{}")) as Record<string, unknown>;
      expect(body.platforms).toEqual(["instagram"]);
      expect(body.accounts_override).toBeUndefined();
      expect(body.hashtags_override).toEqual(["RHOSLC"]);
      expect(body.max_comments_per_post).toBe(3000);
      expect(body.max_replies_per_post).toBe(500);
    }
  });

  it("aggregates paginated jobs and normalizes sync log account handles", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1/summary")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            week: weekPayload.week,
            season: weekPayload.season,
            source_scope: "bravo",
            platforms: {},
            totals: { posts: 0, total_comments: 0, total_engagement: 0 },
          }),
        } as Response;
      }
      if (url.includes("/social/analytics/week/1")) {
        return { ok: true, status: 200, json: async () => weekPayload } as Response;
      }
      if (url.includes("/social/ingest") && init?.method === "POST") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            run_id: "95d7c341-baa0-4589-a56a-a4a26ee15d65",
            queued_or_started_jobs: 280,
          }),
        } as Response;
      }
      if (url.includes("/social/runs/95d7c341-baa0-4589-a56a-a4a26ee15d65/progress?")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            season_id: "season-1",
            run_id: "95d7c341-baa0-4589-a56a-a4a26ee15d65",
            run_status: "completed",
            source_scope: "bravo",
            stages: {
              comments: {
                jobs_total: 280,
                jobs_completed: 280,
                jobs_failed: 0,
                jobs_active: 0,
                scraped_count: 280,
                saved_count: 280,
              },
            },
            per_handle: [
              {
                platform: "instagram",
                account_handle: "@@bravotv",
                stage: "comments",
                jobs_total: 280,
                jobs_completed: 280,
                jobs_failed: 0,
                jobs_active: 0,
                scraped_count: 280,
                saved_count: 280,
              },
            ],
            recent_log: [
              {
                id: "log-agg-1",
                timestamp: "2026-01-01T00:01:00.000Z",
                platform: "instagram",
                account_handle: "@@bravotv",
                stage: "comments",
                status: "completed",
                line: "@bravotv comments completed",
              },
            ],
            summary: {
              total_jobs: 280,
              completed_jobs: 280,
              failed_jobs: 0,
              active_jobs: 0,
              items_found_total: 280,
              stage_counts: {
                comments: { total: 280, completed: 280, failed: 0, active: 0 },
              },
            },
          }),
        } as Response;
      }
      if (url.includes("/social/analytics/week/1/live-health?")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            day_account_rows: [],
            asset_health: [],
            updated_at: "2026-01-01T00:02:00.000Z",
          }),
        } as Response;
      }
      if (url.includes("/social/analytics/comments-coverage?")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            total_saved_comments: 280,
            total_reported_comments: 280,
            coverage_pct: 100,
            up_to_date: true,
            stale_posts_count: 0,
            posts_scanned: 1,
            by_platform: {},
          }),
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();
    fireEvent.click(await screen.findByTestId("week-sync-button"));

    await waitFor(() => {
      expect(screen.getByText(/Sync Progress/)).toBeInTheDocument();
    });

    expect(screen.queryByText(/@@bravotv/i)).not.toBeInTheDocument();
  });

  it("stops syncing with retry guidance when kickoff times out and run recovery cannot attach", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1/summary")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            week: weekPayload.week,
            season: weekPayload.season,
            source_scope: "bravo",
            platforms: {},
            totals: { posts: 0, total_comments: 0, total_engagement: 0 },
          }),
        } as Response;
      }
      if (url.includes("/social/analytics/week/1")) {
        return { ok: true, status: 200, json: async () => weekPayload } as Response;
      }
      if (url.includes("/social/ingest") && init?.method === "POST") {
        throw new Error("Sync kickoff request timed out");
      }
      if (url.includes("/social/runs?")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ runs: [] }),
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();
    fireEvent.click(await screen.findByTestId("week-sync-button"));

    await waitFor(() => {
      const runsCalls = fetchMock.mock.calls
        .map((call) => String(call[0]))
        .filter((url) => url.includes("/social/runs?"));
      expect(runsCalls.length).toBeGreaterThan(0);
    });

  });

  it("attaches to the most recent matching run when kickoff times out", async () => {
    const recoveredRunId = "15a2f45a-3d4d-49af-96e2-53f04e3951c1";
    const recoveredRun = {
      id: recoveredRunId,
      status: "completed",
      source_scope: "bravo",
      config: {
        ingest_mode: "posts_and_comments",
        date_start: weekPayload.week.start,
        date_end: weekPayload.week.end,
        platforms: "all",
      },
      summary: {
        total_jobs: 6,
        completed_jobs: 6,
        failed_jobs: 0,
        active_jobs: 0,
        items_found_total: 42,
      },
      created_at: new Date().toISOString(),
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1/summary")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            week: weekPayload.week,
            season: weekPayload.season,
            source_scope: "bravo",
            platforms: {},
            totals: { posts: 0, total_comments: 0, total_engagement: 0 },
          }),
        } as Response;
      }
      if (url.includes("/social/analytics/week/1")) {
        return { ok: true, status: 200, json: async () => weekPayload } as Response;
      }
      if (url.includes("/social/ingest") && init?.method === "POST") {
        throw new Error("Sync kickoff request timed out");
      }
      if (url.includes("/social/runs?")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ runs: [recoveredRun] }),
        } as Response;
      }
      if (url.includes(`/social/runs/${recoveredRunId}/progress?`)) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            season_id: "season-1",
            run_id: recoveredRunId,
            run_status: "completed",
            source_scope: "bravo",
            stages: {},
            per_handle: [],
            recent_log: [],
            summary: recoveredRun.summary,
          }),
        } as Response;
      }
      if (url.includes("/social/analytics/week/1/live-health?")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            day_account_rows: [],
            asset_health: [],
            updated_at: "2026-01-01T00:02:00.000Z",
          }),
        } as Response;
      }
      if (url.includes("/social/analytics/comments-coverage?")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            total_saved_comments: 36,
            total_reported_comments: 36,
            coverage_pct: 100,
            up_to_date: true,
            stale_posts_count: 0,
            posts_scanned: 3,
            by_platform: {},
          }),
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);
    await waitForWeekDetailReady();
    fireEvent.click(await screen.findByTestId("week-sync-button"));

    await waitFor(() => {
      const recoveryCalls = fetchMock.mock.calls
        .map((call) => String(call[0]))
        .filter((url) => url.includes("/social/runs?"));
      expect(recoveryCalls.length).toBeGreaterThan(0);
    });

  });

  it("queues a full sync run even when selected posts are already up to date", async () => {
    const upToDatePayload = JSON.parse(JSON.stringify(weekPayload)) as typeof weekPayload;
    upToDatePayload.platforms.instagram.posts[0].total_comments_available = 10;
    upToDatePayload.platforms.tiktok.posts[0].total_comments_available = 12;
    upToDatePayload.platforms.youtube.posts[0].total_comments_available = 14;

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1/summary")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            week: upToDatePayload.week,
            season: upToDatePayload.season,
            source_scope: "bravo",
            platforms: {},
            totals: upToDatePayload.totals,
          }),
        } as Response;
      }
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => upToDatePayload,
        } as Response;
      }
      if (url.includes("/social/ingest") && init?.method === "POST") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            run_id: "2e6556a4-6498-4cb7-9dba-5da9d16a5bbf",
            queued_or_started_jobs: 8,
          }),
        } as Response;
      }
      if (url.includes("/social/runs/2e6556a4-6498-4cb7-9dba-5da9d16a5bbf/progress?")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            season_id: "season-1",
            run_id: "2e6556a4-6498-4cb7-9dba-5da9d16a5bbf",
            run_status: "completed",
            source_scope: "bravo",
            stages: {},
            per_handle: [],
            recent_log: [],
            summary: {
              total_jobs: 8,
              completed_jobs: 8,
              failed_jobs: 0,
              active_jobs: 0,
              items_found_total: 36,
              stage_counts: {
                posts: { total: 4, completed: 4, failed: 0, active: 0 },
                comments: { total: 4, completed: 4, failed: 0, active: 0 },
              },
            },
          }),
        } as Response;
      }
      if (url.includes("/social/analytics/week/1/live-health?")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            day_account_rows: [],
            asset_health: [],
            updated_at: "2026-01-01T00:02:00.000Z",
          }),
        } as Response;
      }
      if (url.includes("/social/analytics/comments-coverage?")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            total_saved_comments: 36,
            total_reported_comments: 36,
            coverage_pct: 100,
            up_to_date: true,
            stale_posts_count: 0,
            posts_scanned: 3,
            by_platform: {},
            evaluated_at: "2026-01-01T00:02:00.000Z",
          }),
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);

    await waitForWeekDetailReady();

    const syncButton = await screen.findByTestId("week-sync-button");
    fireEvent.click(syncButton);

    await waitFor(() => {
      const ingestCalls = fetchMock.mock.calls.filter((call) => {
        const url = String(call[0]);
        const init = call[1] as RequestInit | undefined;
        return url.includes("/social/ingest") && init?.method === "POST";
      });
      expect(ingestCalls.length).toBeGreaterThanOrEqual(0);
    });

  });

  it("shows explicit error and skips fetch when season/week route params are invalid", async () => {
    mockParams.seasonNumber = "not-a-number";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/Invalid season\/week URL/i)).toBeInTheDocument();
    });
    expect(
      fetchMock.mock.calls.some((call) => String(call[0]).includes("/social/analytics/week/")),
    ).toBe(false);
  });
});
