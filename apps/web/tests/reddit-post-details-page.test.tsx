import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const {
  useParamsMock,
  usePathnameMock,
  useRouterMock,
  useSearchParamsMock,
  useAdminGuardMock,
  fetchAdminWithAuthMock,
} = vi.hoisted(() => ({
  useParamsMock: vi.fn(),
  usePathnameMock: vi.fn(),
  useRouterMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
  useAdminGuardMock: vi.fn(),
  fetchAdminWithAuthMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: useParamsMock,
  usePathname: usePathnameMock,
  useRouter: useRouterMock,
  useSearchParams: useSearchParamsMock,
}));

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: useAdminGuardMock,
}));

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: fetchAdminWithAuthMock,
}));

vi.mock("@/components/admin/SocialAdminPageHeader", () => ({
  default: ({ title }: { title: string }) => <div data-testid="header">{title}</div>,
}));

import AdminRedditPostDetailsPage from "@/app/admin/reddit-post-details/page";

const jsonResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

const postPayload = {
  reddit_post_id: "abc123",
  subreddit: "BravoRealHousewives",
  title: "Sample thread",
  text: "text",
  url: "https://reddit.com/r/BravoRealHousewives/comments/abc123/sample/",
  permalink: "/r/BravoRealHousewives/comments/abc123/sample/",
  author: "test-user",
  score: 12,
  num_comments: 9,
  posted_at: "2026-03-01T00:00:00.000Z",
  link_flair_text: "Salt Lake City",
  canonical_flair_key: "salt-lake-city",
  upvote_ratio: 0.9,
  is_self: true,
  post_type: "self",
  thumbnail: null,
  content_url: null,
  is_nsfw: false,
  is_spoiler: false,
  author_flair_text: null,
  detail_scraped_at: "2026-03-01T00:10:00.000Z",
  source_sorts: ["new"],
  matches: [],
  comments: [],
  comment_summary: {
    total_comments: 6,
    top_level_comments: 4,
    reply_comments: 2,
    earliest_comment_at: null,
    latest_comment_at: null,
  },
  media: [],
  media_summary: {
    total_media: 0,
    mirrored_media: 0,
    pending_media: 0,
    failed_media: 0,
  },
  assigned_threads: [],
};

describe("admin reddit post details page", () => {
  beforeEach(() => {
    useParamsMock.mockReset();
    usePathnameMock.mockReset();
    useRouterMock.mockReset();
    useSearchParamsMock.mockReset();
    useAdminGuardMock.mockReset();
    fetchAdminWithAuthMock.mockReset();

    useAdminGuardMock.mockReturnValue({
      user: { uid: "admin-uid" },
      checking: false,
      hasAccess: true,
    });
    useParamsMock.mockReturnValue({});
    usePathnameMock.mockReturnValue("/rhoslc/social/reddit/BravoRealHousewives/s6/w0/post/abc123");
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams({
        showSlug: "rhoslc",
        community_slug: "BravoRealHousewives",
        windowKey: "w0",
        season: "6",
        post_id: "abc123",
      }),
    );
    useRouterMock.mockReturnValue({ replace: vi.fn() });
  });

  it("kicks off Sync Details with wait=false and polls run status", async () => {
    fetchAdminWithAuthMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admin/reddit/runs?")) {
        return jsonResponse({ runs: [] });
      }
      if (url.includes("/api/admin/reddit/runs/11111111-1111-1111-1111-111111111111")) {
        return jsonResponse({
          run_id: "11111111-1111-1111-1111-111111111111",
          status: "completed",
        });
      }
      if (url.includes("/posts/resolve?")) {
        return jsonResponse({
          reddit_post_id: "abc123",
          detail_slug: "sample-thread--u-test-user",
          collision: false,
          post: {
            title: "Sample thread",
            author: "test-user",
          },
        });
      }
      if (url.includes("/discover?") && url.includes("mode=sync_details")) {
        return jsonResponse({
          run: {
            run_id: "11111111-1111-1111-1111-111111111111",
            status: "running",
          },
        });
      }
      if (url.includes("/posts/abc123/details")) {
        return jsonResponse({ post: postPayload });
      }
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({
          communities: [
            {
              id: "community-1",
              trr_show_id: "show-1",
              trr_show_name: "The Real Housewives of Salt Lake City",
              subreddit: "BravoRealHousewives",
            },
          ],
        });
      }
      if (url.includes("/api/admin/trr-api/shows/show-1/seasons")) {
        return jsonResponse({ seasons: [{ id: "season-6", season_number: 6 }] });
      }
      return jsonResponse({ error: "unexpected" }, 500);
    });

    render(<AdminRedditPostDetailsPage />);
    await screen.findByText("Sample thread");
    await screen.findByText("67% saved to Supabase: 6 of 9 Reddit comments are stored. 3 comments are still missing.");

    fireEvent.click(screen.getByRole("tab", { name: /mirrored media/i }));
    await screen.findByText("0 of 0 media rows are mirrored to hosted storage (0% coverage).");

    fireEvent.click(screen.getByRole("tab", { name: /comments/i }));
    await screen.findByText("67% saved to Supabase: 6 of 9 Reddit comments are stored. 3 comments are still missing.");

    fireEvent.click(screen.getByRole("button", { name: "Sync Details" }));

    await waitFor(() => {
      const syncCall = fetchAdminWithAuthMock.mock.calls.find((call) => {
        const url = String(call[0]);
        return url.includes("/discover?") && url.includes("mode=sync_details");
      });
      expect(syncCall).toBeTruthy();
      const syncUrl = String(syncCall?.[0] ?? "");
      expect(syncUrl).toContain("refresh=true");
      expect(syncUrl).toContain("wait=false");
      expect(syncUrl).toContain("mode=sync_details");
      expect(syncUrl).toContain("container_key=period-preseason");
    });

    await waitFor(() => {
      expect(fetchAdminWithAuthMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/reddit/runs/11111111-1111-1111-1111-111111111111"),
        expect.any(Object),
        expect.any(Object),
      );
    });

    await waitFor(() => {
      expect(fetchAdminWithAuthMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/reddit/runs?"),
        expect.any(Object),
        expect.any(Object),
      );
    });
  });
});
