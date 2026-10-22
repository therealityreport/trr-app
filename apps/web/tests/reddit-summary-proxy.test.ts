import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const { guard, backend } = vi.hoisted(() => ({ guard: vi.fn(), backend: vi.fn() }));
vi.mock("@/lib/server/auth", () => ({ requireAdmin: guard }));
vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({ SOCIAL_PROXY_DEFAULT_TIMEOUT_MS: 5000, fetchSocialBackendJson: backend, socialProxyErrorResponse: () => new Response("Unauthorized", { status: 401 }) }));
import { GET } from "@/app/api/admin/reddit/analytics/community/[communityId]/summary/route";
const communityId = "a9bb355f-4cdd-4d8d-94dd-06a55ae303f2";
const seasonId = "20c4cc05-0ab1-433f-b2fd-848f0d46a250";
const context = { params: Promise.resolve({ communityId }) };
describe("Reddit window summary proxy", () => {
  beforeEach(() => { guard.mockReset().mockResolvedValue({ uid: "admin" }); backend.mockReset().mockResolvedValue({ coverage: {} }); });
  it("forwards exact displayed bounds only to the fixed summary endpoint", async () => {
    const windows = JSON.stringify([{ key: "episode-1", start: "2026-09-16T23:01:01Z", end: "2026-09-23T23:01:10Z" }]);
    const query = new URLSearchParams({ season_id: seasonId, windows, path: "/other" });
    const response = await GET(new NextRequest(`http://localhost/api/admin/reddit/summary?${query}`), context);
    expect(response.status).toBe(200);
    const [path, options] = backend.mock.calls[0];
    expect(path).toBe(`/reddit/analytics/community/${communityId}/summary`);
    expect(new URLSearchParams(options.queryString).get("windows")).toBe(windows);
    expect(new URLSearchParams(options.queryString).has("path")).toBe(false);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("rejects excessive window input before upstream access", async () => {
    const query = new URLSearchParams({ season_id: seasonId, windows: "x".repeat(12001) });
    expect((await GET(new NextRequest(`http://localhost/api/admin/reddit/summary?${query}`), context)).status).toBe(400);
    expect(backend).not.toHaveBeenCalled();
  });
  it("requires an administrator", async () => {
    guard.mockRejectedValue(new Error("unauthorized"));
    expect((await GET(new NextRequest(`http://localhost/api/admin/reddit/summary?season_id=${seasonId}`), context)).status).toBe(401);
    expect(backend).not.toHaveBeenCalled();
  });
});
