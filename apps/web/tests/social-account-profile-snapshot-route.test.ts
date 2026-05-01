import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { makeSocialAccountDashboardPayload, makeSocialAccountSummary } from "./fixtures/social-account-dashboard";

const {
  requireAdminMock,
  toVerifiedAdminContextMock,
  buildAdminAuthPartitionMock,
  buildAdminSnapshotCacheKeyMock,
  getOrCreateAdminSnapshotMock,
  fetchSocialBackendJsonMock,
  socialProxyErrorResponseMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  toVerifiedAdminContextMock: vi.fn(),
  buildAdminAuthPartitionMock: vi.fn(),
  buildAdminSnapshotCacheKeyMock: vi.fn(),
  getOrCreateAdminSnapshotMock: vi.fn(),
  fetchSocialBackendJsonMock: vi.fn(),
  socialProxyErrorResponseMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
  toVerifiedAdminContext: toVerifiedAdminContextMock,
}));

vi.mock("@/lib/server/admin/admin-snapshot-cache", () => ({
  buildAdminAuthPartition: buildAdminAuthPartitionMock,
  buildAdminSnapshotCacheKey: buildAdminSnapshotCacheKeyMock,
  getOrCreateAdminSnapshot: getOrCreateAdminSnapshotMock,
}));

vi.mock("@/lib/server/admin/admin-snapshot-route", () => ({
  buildSnapshotResponse: vi.fn(
    (input: {
      data: Record<string, unknown>;
      cacheStatus: string;
      generatedAt: string;
      cacheAgeMs: number;
      stale: boolean;
    }) =>
      Response.json(
        {
          data: input.data,
          generated_at: input.generatedAt,
          cache_age_ms: input.cacheAgeMs,
          stale: input.stale,
        },
        { headers: { "x-trr-cache": input.cacheStatus } },
      ),
  ),
}));

vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({
  fetchSocialBackendJson: fetchSocialBackendJsonMock,
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS: 25_000,
  socialProxyErrorResponse: socialProxyErrorResponseMock,
}));

import { GET } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/snapshot/route";

describe("social account profile snapshot route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    toVerifiedAdminContextMock.mockReset();
    buildAdminAuthPartitionMock.mockReset();
    buildAdminSnapshotCacheKeyMock.mockReset();
    getOrCreateAdminSnapshotMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();
    vi.restoreAllMocks();

    requireAdminMock.mockResolvedValue({ uid: "admin-1", provider: "firebase" });
    toVerifiedAdminContextMock.mockReturnValue({ uid: "admin-1" });
    buildAdminAuthPartitionMock.mockReturnValue("firebase:admin-1");
    buildAdminSnapshotCacheKeyMock.mockReturnValue("social-profile-cache-key");
    fetchSocialBackendJsonMock.mockResolvedValue(makeSocialAccountDashboardPayload());
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      Response.json({ error: String(error), code: "BACKEND_UNREACHABLE" }, { status: 502 }),
    );
    getOrCreateAdminSnapshotMock.mockImplementation(
      async (options: { fetcher: () => Promise<Record<string, unknown>> }) => ({
        data: await options.fetcher(),
        meta: {
          cacheStatus: "miss",
          generatedAt: "2026-04-26T12:03:00.000Z",
          cacheAgeMs: 0,
          stale: false,
        },
      }),
    );
  });

  it("proxies one backend dashboard request and does not forward refresh", async () => {
    const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/trr-api/social/profiles/instagram/thetraitorsus/snapshot?detail=lite&run_id=run-1&recent_log_limit=12&refresh=1",
      ),
      { params: Promise.resolve({ platform: "instagram", handle: "thetraitorsus" }) },
    );
    const body = (await response.json()) as { data: { summary?: { account_handle?: string } } };

    expect(response.status).toBe(200);
    expect(body.data.summary?.account_handle).toBe("thetraitorsus");
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledTimes(1);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/profiles/instagram/thetraitorsus/dashboard",
      expect.objectContaining({
        fallbackError: "Failed to fetch social account profile dashboard",
        queryString: "detail=lite&run_id=run-1&recent_log_limit=12",
        retries: 0,
        timeoutMs: 25_000,
      }),
    );
    expect(getOrCreateAdminSnapshotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ttlMs: 3_000,
        staleIfErrorTtlMs: 30_000,
        forceRefresh: true,
      }),
    );
    expect(response.headers.get("x-trr-dashboard-freshness")).toBe("fresh");
    expect(response.headers.get("x-trr-dashboard-source")).toBe("live");
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "social_profile_dashboard_budget",
      expect.objectContaining({
        platform: "instagram",
        handle: "thetraitorsus",
        cacheStatus: "miss",
        freshnessStatus: "fresh",
        initialRequestCount: 1,
        stale: false,
        staleCacheHit: false,
      }),
    );
  });

  it("maps stale snapshot fallback to dashboard freshness headers and telemetry", async () => {
    const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    getOrCreateAdminSnapshotMock.mockResolvedValueOnce({
      data: {
        summary: makeSocialAccountSummary(),
        catalog_run_progress: null,
        dashboard_freshness: {
          status: "fresh",
          source: "live",
          generated_at: "2026-04-26T12:00:00.000Z",
          age_seconds: 0,
        },
        operational_alerts: [],
      },
      meta: {
        cacheStatus: "hit",
        generatedAt: "2026-04-26T12:00:00.000Z",
        cacheAgeMs: 180_000,
        stale: true,
      },
    });

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/thetraitorsus/snapshot"),
      { params: Promise.resolve({ platform: "instagram", handle: "thetraitorsus" }) },
    );
    const body = (await response.json()) as {
      data: { dashboard_freshness?: { status?: string; source?: string; age_seconds?: number } };
    };

    expect(response.status).toBe(200);
    expect(fetchSocialBackendJsonMock).not.toHaveBeenCalled();
    expect(body.data.dashboard_freshness?.status).toBe("stale");
    expect(body.data.dashboard_freshness?.source).toBe("cache");
    expect(body.data.dashboard_freshness?.age_seconds).toBe(180);
    expect(response.headers.get("x-trr-dashboard-freshness")).toBe("stale");
    expect(response.headers.get("x-trr-dashboard-source")).toBe("cache");
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "social_profile_dashboard_budget",
      expect.objectContaining({
        cacheStatus: "hit",
        freshnessStatus: "stale",
        stale: true,
        cacheAgeMs: 180_000,
        staleCacheHit: true,
      }),
    );
  });
});
