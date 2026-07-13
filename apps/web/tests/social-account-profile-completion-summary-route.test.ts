import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  fetchSocialBackendJsonMock,
  requireAdminMock,
  socialProxyErrorResponseMock,
  toVerifiedAdminContextMock,
} = vi.hoisted(() => ({
  fetchSocialBackendJsonMock: vi.fn(),
  requireAdminMock: vi.fn(),
  socialProxyErrorResponseMock: vi.fn(),
  toVerifiedAdminContextMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
  toVerifiedAdminContext: toVerifiedAdminContextMock,
}));

vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({
  fetchSocialBackendJson: fetchSocialBackendJsonMock,
  socialProxyErrorResponse: socialProxyErrorResponseMock,
}));

import { GET } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/completion-summary/route";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";

const CACHE_NAMESPACE = "social-account-profile-completion-summary";

const completionPayload = {
  platform: "instagram",
  handle: "bravotv",
  year: 2026,
  total_posts: 3,
  total_reported_comments: 1200,
  saved_comments: 780,
  missing_comments: 420,
  accounted_comments: 1200,
  lanes: {
    comments: { finished: 1, in_progress: 2, not_started: 0 },
    details: { finished: 2, in_progress: 0, not_started: 1 },
    media: { finished: 1, in_progress: 1, not_started: 1 },
  },
};

const requestCompletionSummary = (
  url = "http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/completion-summary",
  params = { platform: "instagram", handle: "bravotv" },
) => GET(new NextRequest(url), { params: Promise.resolve(params) });

const expectTimingHeaders = (response: Response) => {
  expect(response.headers.get("server-timing")).toContain("trr_admin_route;dur=");
  expect(response.headers.get("x-trr-admin-route-ms")).toMatch(/^\d+$/);
};

describe("social account profile completion summary route", () => {
  beforeEach(() => {
    invalidateRouteResponseCache(CACHE_NAMESPACE);
    requireAdminMock.mockReset();
    toVerifiedAdminContextMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue({
      uid: "admin-1",
      email: "admin@example.com",
      provider: "firebase",
    });
    toVerifiedAdminContextMock.mockReturnValue({
      uid: "admin-1",
      email: "admin@example.com",
      verifiedAt: 1_750_000_000_000,
    });
    fetchSocialBackendJsonMock.mockResolvedValue(completionPayload);
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      Response.json({ error: String(error), code: "BACKEND_UNREACHABLE" }, { status: 502 }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("normalizes the profile, defaults to the current year, and proxies the exact payload", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-29T12:00:00Z"));

    const response = await requestCompletionSummary(
      "http://localhost/api/admin/trr-api/social/profiles/Instagram/%40BravoTV/completion-summary",
      { platform: " Instagram ", handle: " @BravoTV " },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(completionPayload);
    expect(response.headers.get("x-trr-cache")).toBe("miss");
    expect(response.headers.get("x-trr-admin-backend-ms")).toMatch(/^\d+$/);
    expectTimingHeaders(response);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/profiles/instagram/bravotv/completion-summary",
      expect.objectContaining({
        adminContext: expect.objectContaining({ uid: "admin-1" }),
        queryString: "year=2026",
        fallbackError: "Failed to load social completion summary",
        retries: 0,
        timeoutMs: 30_000,
      }),
    );
  });

  it("falls back to the current year when the year query param is invalid", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T12:00:00Z"));

    const response = await requestCompletionSummary(
      "http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/completion-summary?year=nope",
      { platform: "instagram", handle: "@bravotv" },
    );

    expect(response.status).toBe(200);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/profiles/instagram/bravotv/completion-summary",
      expect.objectContaining({ queryString: "year=2026" }),
    );
  });

  it("preserves user-scoped cache miss and hit behavior", async () => {
    const miss = await requestCompletionSummary(
      "http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/completion-summary?year=2026",
    );
    const hit = await requestCompletionSummary(
      "http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/completion-summary?year=2026",
    );

    requireAdminMock.mockResolvedValueOnce({
      uid: "admin-2",
      email: "other@example.com",
      provider: "firebase",
    });
    toVerifiedAdminContextMock.mockReturnValueOnce({
      uid: "admin-2",
      email: "other@example.com",
      verifiedAt: 1_750_000_000_001,
    });
    const otherUserMiss = await requestCompletionSummary(
      "http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/completion-summary?year=2026",
    );

    expect(miss.headers.get("x-trr-cache")).toBe("miss");
    expect(hit.headers.get("x-trr-cache")).toBe("hit");
    expect(otherUserMiss.headers.get("x-trr-cache")).toBe("miss");
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledTimes(2);
    expectTimingHeaders(hit);
  });

  it("serves stale cached data when the bounded backend request times out", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T12:00:00Z"));
    await requestCompletionSummary(
      "http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/completion-summary?year=2026",
    );
    vi.advanceTimersByTime(5 * 60_000 + 1);
    fetchSocialBackendJsonMock.mockRejectedValueOnce(new Error("upstream request timed out"));

    const response = await requestCompletionSummary(
      "http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/completion-summary?year=2026",
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(completionPayload);
    expect(response.headers.get("x-trr-cache")).toBe("stale");
    expect(response.headers.get("x-trr-cacheable")).toBe("0");
    expect(fetchSocialBackendJsonMock).toHaveBeenLastCalledWith(
      "/profiles/instagram/bravotv/completion-summary",
      expect.objectContaining({ timeoutMs: 30_000 }),
    );
    expectTimingHeaders(response);
  });

  it("rejects unsupported platforms before requesting completion data", async () => {
    const response = await requestCompletionSummary(
      "http://localhost/api/admin/trr-api/social/profiles/tiktok/bravotv/completion-summary",
      { platform: "tiktok", handle: "bravotv" },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "unsupported_profile" });
    expect(fetchSocialBackendJsonMock).not.toHaveBeenCalled();
    expectTimingHeaders(response);
  });

  it("preserves the shared upstream error envelope when no stale value exists", async () => {
    const error = new Error("backend unavailable");
    fetchSocialBackendJsonMock.mockRejectedValue(error);

    const response = await requestCompletionSummary(
      "http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/completion-summary?year=2026",
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Error: backend unavailable",
      code: "BACKEND_UNREACHABLE",
    });
    expect(socialProxyErrorResponseMock).toHaveBeenCalledWith(
      error,
      "[api] Failed to load social completion summary",
    );
    expectTimingHeaders(response);
  });
});
