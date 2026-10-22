import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const { fetchMock, user, params, search, router } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  user: { uid: "admin" },
  params: { communitySlug: "rhoslc", showSlug: "rhoslc", seasonNumber: "7", windowKey: "e6" },
  search: new URLSearchParams(),
  router: { replace: vi.fn() },
}));
vi.mock("next/navigation", () => ({
  useParams: () => params,
  usePathname: () => "/social/reddit/rhoslc/rhoslc/s7/e6",
  useSearchParams: () => search,
  useRouter: () => router,
}));
vi.mock("@/lib/admin/useAdminGuard", () => ({ useAdminGuard: () => ({ user, checking: false, hasAccess: true }) }));
vi.mock("@/lib/admin/client-auth", () => ({ fetchAdminWithAuth: fetchMock }));
vi.mock("@/lib/admin/use-operation-unload-guard", () => ({ useAdminOperationUnloadGuard: vi.fn() }));
vi.mock("@/components/admin/RedditAdminShell", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/admin/RedditCapturePanel", () => ({ default: () => null }));
import WindowPosts from "@/app/admin/reddit-window-posts/page";

afterEach(cleanup);

it("loads stored window posts even when canonical navigation preserves the visible alias", async () => {
  fetchMock.mockImplementation(async (url: string) => {
    if (url.includes("/communities?")) return Response.json({ communities: [{ id: "community", subreddit: "rhoslc", trr_show_id: "show", trr_show_name: "RHOSLC", is_show_focused: true }] });
    if (url.includes("/seasons?")) return Response.json({ seasons: [{ id: "season", season_number: 7 }] });
    if (url.includes("/episodes?")) return Response.json({ episodes: [{ id: "episode", episode_number: 6, air_date: "2026-10-21" }] });
    if (url.includes("/social/analytics?")) return Response.json({ weekly: [] });
    if (url.includes("/stored-posts?")) return Response.json({ pagination: { total_count: 1 }, posts: [{ reddit_post_id: "abc123", title: "Episode 6 saved post", author: "test", score: 1, num_comments: 2, url: "https://www.reddit.com/comments/abc123", posted_at: "2026-10-21T12:00:00Z", link_flair_text: null }] });
    return Response.json({ runs: [] });
  });
  render(<WindowPosts />);
  await waitFor(() => expect(router.replace).toHaveBeenCalled());
  await waitFor(() => expect(screen.getByText("Episode 6 saved post")).toBeInTheDocument());
  expect(screen.getByRole("link", { name: "View Details", exact: true })).toHaveAttribute("href", "/admin/social/reddit/rhoslc/rhoslc/s7/e6/episode-6-saved-post--u-test");
  expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/stored-posts?"))).toBe(true);
});
