import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import WeekDetailPage from "@/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page";
import { auth } from "@/lib/firebase";

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: () => ({ hasAccess: true, checking: false }),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ showId: "show-1", seasonNumber: "6", weekIndex: "1" }),
  useSearchParams: () => new URLSearchParams("source_scope=bravo"),
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
          mentions: [],
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

describe("WeekDetailPage thumbnails", () => {
  beforeEach(() => {
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

    expect(screen.getByAltText("Instagram post thumbnail")).toHaveAttribute(
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
  });
});
