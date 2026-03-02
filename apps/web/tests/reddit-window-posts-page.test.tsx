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

import AdminRedditWindowPostsPage from "@/app/admin/reddit-window-posts/page";

const jsonResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

describe("admin reddit window posts page", () => {
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
    usePathnameMock.mockReturnValue("/admin/reddit-window-posts");
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams({
        showSlug: "rhoslc",
        community_slug: "BravoRealHousewives",
        windowKey: "w0",
        season: "6",
      }),
    );
    useRouterMock.mockReturnValue({ replace: vi.fn() });
  });

  it("resolves direct admin URL and redirects to canonical week URL", async () => {
    const replaceMock = vi.fn();
    useRouterMock.mockReturnValue({ replace: replaceMock });

    fetchAdminWithAuthMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
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
        return jsonResponse({
          seasons: [
            { id: "season-6", season_number: 6 },
            { id: "season-5", season_number: 5 },
          ],
        });
      }
      if (url.includes("/social/analytics")) {
        return jsonResponse({
          weekly: [
            {
              label: "Pre-Season",
              start: "2025-08-14T04:00:00.000Z",
              end: "2025-09-16T23:00:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/discover?")) {
        return jsonResponse({
          discovery: {
            fetched_at: "2026-03-01T00:00:00.000Z",
            totals: { fetched_rows: 0, matched_rows: 0, tracked_flair_rows: 0 },
            threads: [],
          },
        });
      }
      return jsonResponse({ error: "unexpected" }, 500);
    });

    render(<AdminRedditWindowPostsPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/rhoslc/social/reddit/BravoRealHousewives/s6/w0");
    });
    expect(screen.getByText("No posts found for this window yet.")).toBeInTheDocument();
  });

  it("shows timeout error and retry control when community resolution times out", async () => {
    fetchAdminWithAuthMock.mockRejectedValue(new DOMException("Request timed out", "AbortError"));

    render(<AdminRedditWindowPostsPage />);

    await waitFor(() => {
      expect(screen.getByText("Request timed out while resolving window context.")).toBeInTheDocument();
    });
    const retryButton = screen.getByRole("button", { name: "Retry" });
    fireEvent.click(retryButton);
    await waitFor(() => {
      expect(fetchAdminWithAuthMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("continues resolving when social analytics step times out", async () => {
    const replaceMock = vi.fn();
    useRouterMock.mockReturnValue({ replace: replaceMock });

    fetchAdminWithAuthMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
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
      if (url.includes("/social/analytics")) {
        throw new DOMException("Request timed out", "AbortError");
      }
      if (url.includes("/discover?")) {
        return jsonResponse({
          discovery: {
            fetched_at: "2026-03-01T00:00:00.000Z",
            totals: { fetched_rows: 0, matched_rows: 0, tracked_flair_rows: 0 },
            threads: [],
          },
        });
      }
      return jsonResponse({ error: "unexpected" }, 500);
    });

    render(<AdminRedditWindowPostsPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/rhoslc/social/reddit/BravoRealHousewives/s6/w0");
    });
    expect(
      screen.getByText(
        "Season social period data is temporarily unavailable for this window; loading cached posts by container key.",
      ),
    ).toBeInTheDocument();
  });

  it("runs resolver once for the same signature across rerenders", async () => {
    useSearchParamsMock.mockImplementation(
      () =>
        new URLSearchParams({
          showSlug: "rhoslc",
          community_slug: "BravoRealHousewives",
          windowKey: "w0",
          season: "6",
        }),
    );

    fetchAdminWithAuthMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
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
      if (url.includes("/social/analytics")) {
        return jsonResponse({
          weekly: [
            {
              label: "Pre-Season",
              start: "2025-08-14T04:00:00.000Z",
              end: "2025-09-16T23:00:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/discover?")) {
        return jsonResponse({
          discovery: {
            fetched_at: "2026-03-01T00:00:00.000Z",
            totals: { fetched_rows: 0, matched_rows: 0, tracked_flair_rows: 0 },
            threads: [],
          },
        });
      }
      return jsonResponse({ error: "unexpected" }, 500);
    });

    const { rerender } = render(<AdminRedditWindowPostsPage />);
    await waitFor(() => {
      expect(screen.getByText("Pre-Season")).toBeInTheDocument();
    });
    rerender(<AdminRedditWindowPostsPage />);
    await waitFor(() => {
      const communityCallCount = fetchAdminWithAuthMock.mock.calls.filter((call) =>
        String(call[0]).includes("/api/admin/reddit/communities"),
      ).length;
      expect(communityCallCount).toBe(1);
    });
  });
});
