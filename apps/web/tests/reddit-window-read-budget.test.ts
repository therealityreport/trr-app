import { beforeEach, expect, it, vi } from "vitest";

const { backend } = vi.hoisted(() => ({ backend: vi.fn() }));
vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  fetchAdminBackendJson: backend,
  buildAdminBackendStatusError: vi.fn(),
}));
import { getStoredWindowPostsByCommunityAndSeason } from "@/lib/server/admin/reddit-sources-repository";

beforeEach(() => backend.mockReset());

it("allows a cold backend to return Episode 1 posts through the authenticated reader", async () => {
  const payload = { posts: [{ reddit_post_id: "post-1" }], total_count: 94 };
  backend.mockResolvedValue({ status: 200, data: payload, durationMs: 13_026 });
  const adminContext = { uid: "admin", email: null, verifiedAt: Date.now() };
  expect(await getStoredWindowPostsByCommunityAndSeason("community", "season", "episode-1", 1, 200, { adminContext })).toEqual(payload);
  expect(backend).toHaveBeenCalledWith("/admin/reddit/post-windows", expect.objectContaining({
    apiVersion: "v2", adminContext, timeoutMs: 25_000,
    queryString: "community_id=community&season_id=season&container_key=episode-1&page=1&per_page=200",
  }));
});
