import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { guard, backend } = vi.hoisted(() => ({ guard: vi.fn(), backend: vi.fn() }));
vi.mock("@/lib/server/auth", () => ({ requireAdmin: guard }));
vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS: 25_000,
  fetchSeasonBackendJson: backend,
  socialProxyErrorResponse: () => new Response("Unauthorized", { status: 401 }),
}));
import { GET } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/periods/route";

const showId = "7782652f-783a-488b-8860-41b97de32e75";
const seasonId = "20c4cc05-0ab1-433f-b2fd-848f0d46a250";
const context = { params: Promise.resolve({ showId, seasonNumber: "7" }) };

describe("season period metadata proxy", () => {
  beforeEach(() => {
    guard.mockReset().mockResolvedValue({ uid: "admin" });
    backend.mockReset().mockResolvedValue({ weekly: [] });
  });

  it("requests only canonical dates with validated season context", async () => {
    const response = await GET(new NextRequest(`http://localhost/api/periods?season_id=${seasonId}&timezone=America%2FNew_York&include=rows&path=/other`), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(backend).toHaveBeenCalledWith(showId, "7", "/analytics/periods", expect.objectContaining({
      seasonIdHint: seasonId,
      queryString: "timezone=America%2FNew_York",
      timeoutMs: 25_000,
      retries: 0,
    }));
  });

  it("rejects invalid identifiers before backend access", async () => {
    expect((await GET(new NextRequest("http://localhost/api/periods?season_id=wrong"), context)).status).toBe(400);
    expect(backend).not.toHaveBeenCalled();
  });

  it("requires an administrator", async () => {
    guard.mockRejectedValue(new Error("unauthorized"));
    expect((await GET(new NextRequest("http://localhost/api/periods"), context)).status).toBe(401);
    expect(backend).not.toHaveBeenCalled();
  });
});
