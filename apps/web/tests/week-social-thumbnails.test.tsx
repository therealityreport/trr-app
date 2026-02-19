import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import WeekDetailPage from "@/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page";
import { auth } from "@/lib/firebase";

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: () => ({ hasAccess: true, checking: false }),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ showId: "7782652f-783a-488b-8860-41b97de32e75", seasonNumber: "6", weekIndex: "1" }),
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
    expect(screen.getByText("of Comments Saved")).toBeInTheDocument();
    expect(screen.getByText("0.0%")).toBeInTheDocument();
    expect(screen.getByText("0/36* Comments (Saved/Actual)")).toBeInTheDocument();
    expect(
      screen.getByText("* Not all platform-reported comments are saved in Supabase yet."),
    ).toBeInTheDocument();
    expect(screen.getByText(/0\/10\* comments/i)).toBeInTheDocument();
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
                metadata: { stage_counters: { posts: 0, comments: 10 } },
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

    fireEvent.click(screen.getByRole("button", { name: "Sync All Comments" }));

    await waitFor(() => {
      expect(
        screen.getByText(/Sync queued for Week 1 \(all platforms\) · run 80423aa2 · 8 job\(s\)/),
      ).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("Sync Progress")).toBeInTheDocument();
      expect(screen.getByText(/Ingest complete/)).toBeInTheDocument();
    });

    const ingestCall = fetchMock.mock.calls.find(
      (call) => String(call[0]).includes("/social/ingest") && (call[1] as RequestInit | undefined)?.method === "POST",
    );
    expect(ingestCall).toBeDefined();
    const ingestInit = ingestCall?.[1] as RequestInit;
    const body = JSON.parse(String(ingestInit.body ?? "{}")) as Record<string, unknown>;

    expect(body.source_scope).toBe("bravo");
    expect(body.sync_strategy).toBe("incremental");
    expect(body.ingest_mode).toBe("comments_only");
    expect(body.max_comments_per_post).toBe(100000);
    expect(body.max_replies_per_post).toBe(100000);
    expect(body.date_start).toBe(weekPayload.week.start);
    expect(body.date_end).toBe(weekPayload.week.end);
    expect(body.platforms).toBeUndefined();
  });

  it("skips queueing a run when selected posts are already up to date", async () => {
    const upToDatePayload = JSON.parse(JSON.stringify(weekPayload)) as typeof weekPayload;
    upToDatePayload.platforms.instagram.posts[0].total_comments_available = 10;
    upToDatePayload.platforms.tiktok.posts[0].total_comments_available = 12;
    upToDatePayload.platforms.youtube.posts[0].total_comments_available = 14;

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics/week/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => upToDatePayload,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<WeekDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Week 1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Sync All Comments" }));

    await waitFor(() => {
      expect(screen.getByText(/already up to date/i)).toBeInTheDocument();
    });

    const ingestCall = fetchMock.mock.calls.find(
      (call) => String(call[0]).includes("/social/ingest") && (call[1] as RequestInit | undefined)?.method === "POST",
    );
    expect(ingestCall).toBeUndefined();
  });
});
