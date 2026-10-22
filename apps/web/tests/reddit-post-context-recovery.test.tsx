import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const { fetchMock, user, params, search, router } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  user: { uid: "admin" },
  params: { communitySlug: "rhoslc", showSlug: "rhoslc", seasonNumber: "7", windowKey: "e6", postId: "abc123" },
  search: new URLSearchParams(),
  router: { replace: vi.fn() },
}));
vi.mock("next/navigation", () => ({
  useParams: () => params,
  usePathname: () => "/social/reddit/rhoslc/rhoslc/s7/e6/post/abc123",
  useSearchParams: () => search,
  useRouter: () => router,
}));
vi.mock("@/lib/admin/useAdminGuard", () => ({ useAdminGuard: () => ({ user, checking: false, hasAccess: true }) }));
vi.mock("@/lib/admin/client-auth", () => ({ fetchAdminWithAuth: fetchMock }));
vi.mock("@/lib/admin/use-operation-unload-guard", () => ({ useAdminOperationUnloadGuard: vi.fn() }));
vi.mock("@/components/admin/RedditAdminShell", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/admin/RedditCapturePanel", () => ({ default: () => null }));
import PostDetails from "@/app/admin/reddit-post-details/page";

afterEach(() => { cleanup(); vi.useRealTimers(); });

it.each(["/communities?", "/seasons?"])("keeps post context alive while %s recovers beyond eight seconds", async (slowPath) => {
  vi.useFakeTimers();
  let seasonSignal: AbortSignal | undefined;
  fetchMock.mockImplementation(async (url: string, options: { signal: AbortSignal }) => {
    if (url.includes(slowPath)) {
      seasonSignal = options.signal;
      await new Promise<void>((resolve, reject) => {
        setTimeout(resolve, 15_000);
        options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true });
      });
    }
    if (url.includes("/communities?")) return Response.json({ communities: [{ id: "community", subreddit: "rhoslc", trr_show_id: "show", trr_show_name: "RHOSLC" }] });
    if (url.includes("/seasons?")) return Response.json({ seasons: [{ id: "season", season_number: 7 }] });
    return Response.json({ error: "Reached post resolver after season recovery" }, { status: 404 });
  });
  render(<PostDetails />);
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  await act(async () => { await vi.advanceTimersByTimeAsync(9_000); });
  expect(seasonSignal?.aborted).toBe(false);
  expect(screen.queryByText("Request timed out while resolving post context.")).toBeNull();
  await act(async () => { await vi.advanceTimersByTimeAsync(6_000); });
  expect(screen.getByText("Reached post resolver after season recovery")).toBeInTheDocument();
});
