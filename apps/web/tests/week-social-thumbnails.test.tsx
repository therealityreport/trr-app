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
          profile_tags: ["@tagged_user"],
          collaborators: ["@collab_user"],
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

function clickPostDetailCardByThumbnailAlt(altText: string) {
  const thumbnail = screen.getByAltText(altText);
  const button = thumbnail.closest("button");
  if (!button) {
    throw new Error(`Post card button for thumbnail "${altText}" not found`);
  }
  fireEvent.click(button);
}

function clickPlatformTabByLabel(label: string) {
  const buttons = screen.getAllByRole("button");
  const button = buttons.find((candidate) => {
    const text = (candidate.textContent ?? "").trim().toLowerCase();
    return text.startsWith(label.toLowerCase());
  });
  if (!button) {
    throw new Error(`Platform tab "${label}" button not found`);
  }
  fireEvent.click(button);
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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

    await waitFor(() => {
    expect(screen.getByText("Week 1")).toBeInTheDocument();
  });
  const gallery = screen.getByTestId("week-post-gallery");
  expect(gallery.className).toContain("lg:grid-cols-4");
  expect(screen.getByLabelText("Instagram platform")).toBeInTheDocument();
  expect(screen.getByLabelText("TikTok platform")).toBeInTheDocument();
  expect(screen.getByLabelText("YouTube platform")).toBeInTheDocument();
  const youtubeHandleLink = screen.getByRole("link", { name: "@Bravo" });
  expect(youtubeHandleLink).toHaveAttribute("href", "https://youtube.com/watch?v=abc");
  const backLink = screen.getByRole("link", { name: /Back to Season Social Analytics/i });
  expect(backLink.getAttribute("href")).not.toContain("source_scope=");

    const instagramThumb = screen.getByAltText("Instagram post thumbnail");
    expect(instagramThumb.className).toContain("object-contain");
    expect(instagramThumb).toHaveAttribute(
      "src",
      "https://images.test/ig-preview.jpg",
    );
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
    expect(screen.getByText("@collab_user")).toBeInTheDocument();
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

    await waitFor(() => {
      expect(screen.getByText("Week 1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("Instagram platform"));
    clickPostDetailCardByThumbnailAlt("Instagram post thumbnail");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Post Details" })).toBeInTheDocument();
    });
    const drawerThumb = screen.getAllByAltText("Instagram post thumbnail").at(-1);
    expect(drawerThumb).toBeDefined();
    fireEvent.click(drawerThumb as HTMLElement);
    await screen.findByLabelText("Close lightbox");
    fireEvent.click(screen.getByLabelText("Show metadata"));
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

    await waitFor(() => {
      expect(screen.getByText("Week 1")).toBeInTheDocument();
    });
    clickPlatformTabByLabel("TikTok");
    clickPostDetailCardByThumbnailAlt("TikTok post thumbnail");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Post Details" })).toBeInTheDocument();
    });
    const drawerThumb = screen.getAllByAltText("TikTok post thumbnail").at(-1);
    expect(drawerThumb).toBeDefined();
    fireEvent.click(drawerThumb as HTMLElement);
    const nextButton = screen.queryByLabelText("Next image");
    const previousButton = screen.queryByLabelText("Previous image");
    const mediaNavigationButton = nextButton ?? previousButton;
    if (mediaNavigationButton) {
      fireEvent.click(mediaNavigationButton);
    }
    await waitFor(() => {
      const videos = screen.getAllByLabelText("TikTok media");
      expect(videos.some((node) => node.tagName === "VIDEO")).toBe(true);
    });
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

    await waitFor(() => {
      expect(screen.getByText("Week 1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("Instagram platform"));
    clickPostDetailCardByThumbnailAlt("Instagram post thumbnail");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Post Details" })).toBeInTheDocument();
    });
    const drawerThumb = screen.getAllByAltText("Instagram post thumbnail").at(-1);
    expect(drawerThumb).toBeDefined();
    fireEvent.click(drawerThumb as HTMLElement);
    await screen.findByLabelText("Close lightbox");
    fireEvent.click(screen.getByLabelText("Show metadata"));
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

    await waitFor(() => {
      expect(screen.getByText("Week 1")).toBeInTheDocument();
    });

    clickPlatformTabByLabel("Twitter/X");
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

    await waitFor(() => {
      expect(screen.getByText("Week 1")).toBeInTheDocument();
    });
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

    await waitFor(() => {
      expect(screen.getByText("Week 1")).toBeInTheDocument();
    });

    expect(screen.getByText("38.1%")).toBeInTheDocument();
    expect(screen.getByText("542/1.4K* Comments (Saved/Actual)")).toBeInTheDocument();

    clickPlatformTabByLabel("Twitter/X");

    await waitFor(() => {
      expect(screen.getByText("36.5%")).toBeInTheDocument();
    });
    expect(screen.getByText("506/1.4K* Comments (Saved/Actual)")).toBeInTheDocument();
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
            profile_tags: ["@tagged_user"],
            collaborators: ["@collab_user"],
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

    await waitFor(() => {
      expect(screen.getByText("Week 1")).toBeInTheDocument();
    });

    clickPostDetailCardByThumbnailAlt("Instagram post thumbnail");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Post Details" })).toBeInTheDocument();
    });
    expect(screen.getAllByText("REEL").length).toBeGreaterThan(0);
    expect(screen.getAllByText("14s").length).toBeGreaterThan(0);
    expect(screen.getAllByText("@tagged_user").length).toBeGreaterThan(0);
    expect(screen.getAllByText("@collab_user").length).toBeGreaterThan(0);
    expect(screen.getAllByText("#RHOSLC").length).toBeGreaterThan(0);
    expect(screen.getAllByText("@bravotv").length).toBeGreaterThan(0);
    const postDetailsHeading = screen.getByRole("heading", { name: "Post Details" });
    const postDetailsPanel = postDetailsHeading.closest("div");
    expect(postDetailsPanel).not.toBeNull();
    if (postDetailsPanel) {
      expect(within(postDetailsPanel).getByText(/cover:/i)).toBeInTheDocument();
      expect(within(postDetailsPanel).getByText(/custom cover photo/i)).toBeInTheDocument();
      expect(within(postDetailsPanel).getByText(/\(high\)/i)).toBeInTheDocument();
    }
  });

  it("opens the mirrored thumbnail entry first when only the thumbnail is mirrored", async () => {
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

    await waitFor(() => {
      expect(screen.getByText("Week 1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("Instagram platform"));
    clickPostDetailCardByThumbnailAlt("Instagram post thumbnail");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Post Details" })).toBeInTheDocument();
    });
    const drawerThumb = screen.getAllByAltText("Instagram post thumbnail").at(-1);
    expect(drawerThumb).toBeDefined();
    fireEvent.click(drawerThumb as HTMLElement);
    await screen.findByLabelText("Close lightbox");
    fireEvent.click(screen.getByLabelText("Show metadata"));
    expect(screen.getAllByText("S3 Mirror File").length).toBeGreaterThan(0);
    expect(document.querySelector("video[aria-label='Instagram media']")).toBeNull();
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

    await waitFor(() => {
      expect(screen.getByText("Week 1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /TikTok/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Post Details/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Post Details" })).toBeInTheDocument();
    });
    expect(screen.getAllByText("Saves").length).toBeGreaterThan(0);
    const commentMediaLink = screen.getByRole("link", { name: "Comment media 1" });
    expect(commentMediaLink).toHaveAttribute("href", "https://cdn.example/comment-media.jpg");
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

    await waitFor(() => {
      expect(screen.getByText("Week 1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Twitter\/X/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Post Details/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Comments & Replies" })).toBeInTheDocument();
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

  it("queues incremental week comment sync from Week view", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => weekPayload,
        } as Response;
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
      if (url.includes("/social/runs?")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            runs: [
              {
                id: "80423aa2-83ae-4f44-8aa4-dd5e8f8d39eb",
                status: "completed",
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
              },
            ],
          }),
        } as Response;
      }
      if (url.includes("/social/jobs?")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            jobs: [
              {
                id: "job-1",
                run_id: "80423aa2-83ae-4f44-8aa4-dd5e8f8d39eb",
                platform: "instagram",
                status: "completed",
                job_type: "comments",
                items_found: 10,
                created_at: "2026-01-01T00:00:00.000Z",
                completed_at: "2026-01-01T00:01:00.000Z",
                config: { stage: "comments" },
                metadata: {
                  stage_counters: { posts: 0, comments: 10 },
                  persist_counters: { posts_upserted: 0, comments_upserted: 8 },
                  activity: {
                    phase: "comments_fetch",
                    pages_scanned: 3,
                    posts_checked: 5,
                    matched_posts: 1,
                  },
                },
              },
            ],
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

    await waitFor(() => {
      expect(screen.getByText("Week 1")).toBeInTheDocument();
    });

    const syncButton = await screen.findByRole("button", { name: /Sync .*Metrics/i });
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          /Pass 1\/8 queued for Week 1 \(all platforms\) · run 80423aa2 · 8 job\(s\)/,
        ),
      ).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("Sync Progress")).toBeInTheDocument();
      expect(
        screen.getByText(/Pass 1\/8 ingest complete.*Coverage 36\/36 \(100\.0%\) · Up-to-Date\./),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/10 scraped/i)).toBeInTheDocument();
    expect(screen.getByText(/saved 8/i)).toBeInTheDocument();
    expect(screen.getByText(/saved 0p\/8c/i)).toBeInTheDocument();
    expect(screen.getByText(/comments fetch/i)).toBeInTheDocument();

    const ingestCall = fetchMock.mock.calls.find(
      (call) => String(call[0]).includes("/social/ingest") && (call[1] as RequestInit | undefined)?.method === "POST",
    );
    expect(ingestCall).toBeDefined();
    const ingestInit = ingestCall?.[1] as RequestInit;
    const body = JSON.parse(String(ingestInit.body ?? "{}")) as Record<string, unknown>;

    expect(body.source_scope).toBe("bravo");
    expect(body.sync_strategy).toBe("incremental");
    expect(body.ingest_mode).toBe("posts_and_comments");
    expect(body.max_comments_per_post).toBe(100000);
    expect(body.max_replies_per_post).toBe(100000);
    expect(body.date_start).toBe(weekPayload.week.start);
    expect(body.date_end).toBe(weekPayload.week.end);
    expect(body.platforms).toBeUndefined();
  });

  it("queues a full sync run even when selected posts are already up to date", async () => {
    const upToDatePayload = JSON.parse(JSON.stringify(weekPayload)) as typeof weekPayload;
    upToDatePayload.platforms.instagram.posts[0].total_comments_available = 10;
    upToDatePayload.platforms.tiktok.posts[0].total_comments_available = 12;
    upToDatePayload.platforms.youtube.posts[0].total_comments_available = 14;

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
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
      if (url.includes("/social/runs?")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            runs: [
              {
                id: "2e6556a4-6498-4cb7-9dba-5da9d16a5bbf",
                status: "completed",
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
              },
            ],
          }),
        } as Response;
      }
      if (url.includes("/social/jobs?")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ jobs: [] }),
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

    await waitFor(() => {
      expect(screen.getByText("Week 1")).toBeInTheDocument();
    });

    const syncButton = await screen.findByRole("button", { name: /Sync .*Metrics/i });
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(screen.getByText(/Pass 1\/8 queued for Week 1 \(all platforms\)/)).toBeInTheDocument();
    });

    const ingestCall = fetchMock.mock.calls.find(
      (call) => String(call[0]).includes("/social/ingest") && (call[1] as RequestInit | undefined)?.method === "POST",
    );
    expect(ingestCall).toBeDefined();
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
