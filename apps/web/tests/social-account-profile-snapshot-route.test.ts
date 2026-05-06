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

  it("uses bounded direct progress when a run id is present and does not forward refresh", async () => {
    fetchSocialBackendJsonMock.mockResolvedValueOnce({
      run_id: "run-1",
      run_status: "running",
      progress_degraded: false,
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/trr-api/social/profiles/instagram/thetraitorsus/snapshot?detail=lite&run_id=run-1&recent_log_limit=12&refresh=1",
      ),
      { params: Promise.resolve({ platform: "instagram", handle: "thetraitorsus" }) },
    );
    const body = (await response.json()) as {
      data: {
        summary: unknown;
        catalog_run_progress?: { run_id?: string; run_status?: string };
        dashboard_freshness?: { source?: string; status?: string };
        summary_omitted_reason?: string | null;
      };
    };

    expect(response.status).toBe(200);
    expect(body.data.summary).toBeNull();
    expect(body.data.summary_omitted_reason).toBe("progress_only");
    expect(body.data.catalog_run_progress?.run_id).toBe("run-1");
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledTimes(1);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/profiles/instagram/thetraitorsus/catalog/runs/run-1/progress",
      expect.objectContaining({
        fallbackError: "Failed to fetch social account catalog run progress",
        queryString: "fast=1&recent_log_limit=12",
        retries: 0,
        timeoutMs: 12_000,
      }),
    );
    expect(getOrCreateAdminSnapshotMock).not.toHaveBeenCalled();
    expect(body.data.dashboard_freshness?.status).toBe("degraded");
    expect(body.data.dashboard_freshness?.source).toBe("direct-progress");
    expect(response.headers.get("x-trr-dashboard-freshness")).toBe("degraded");
    expect(response.headers.get("x-trr-dashboard-source")).toBe("direct-progress");
  });

  it("does not synthesize a running state when direct progress times out", async () => {
    fetchSocialBackendJsonMock.mockRejectedValueOnce(new Error("timeout"));

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/trr-api/social/profiles/instagram/thetraitorsus/snapshot?run_id=run-timeout-1",
      ),
      { params: Promise.resolve({ platform: "instagram", handle: "thetraitorsus" }) },
    );
    const body = (await response.json()) as {
      data: {
        catalog_run_progress?: {
          run_id?: string;
          run_status?: string;
          run_state?: string;
          progress_authoritative?: boolean;
          progress_degraded_reason?: string;
        };
        dashboard_freshness?: { source?: string; status?: string };
      };
    };

    expect(response.status).toBe(200);
    expect(body.data.catalog_run_progress?.run_id).toBe("run-timeout-1");
    expect(body.data.catalog_run_progress?.run_status).toBe("unknown");
    expect(body.data.catalog_run_progress?.run_state).toBe("degraded");
    expect(body.data.catalog_run_progress?.progress_authoritative).toBe(false);
    expect(body.data.catalog_run_progress?.progress_degraded_reason).toBe("direct_progress_timeout");
    expect(body.data.dashboard_freshness?.source).toBe("direct-progress-degraded");
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

  it("bypasses cached social profile snapshots while comments coverage has an active run", async () => {
    getOrCreateAdminSnapshotMock
      .mockResolvedValueOnce({
        data: {
          summary: makeSocialAccountSummary({
            comments_saved_summary: {
              saved_comments: 96564,
              retrieved_comments: 106592,
            },
            comments_coverage: {
              eligible_posts: 437,
              missing_posts: 12,
              stale_posts: 203,
              active_run_id: "comments-run-active",
              effective_status: "running",
              last_comments_run_status: "running",
            },
          }),
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
          cacheAgeMs: 120_000,
          stale: false,
        },
      })
      .mockResolvedValueOnce({
        data: {
          summary: makeSocialAccountSummary({
            comments_saved_summary: {
              saved_comments: 98409,
              retrieved_comments: 106212,
            },
            comments_coverage: {
              eligible_posts: 437,
              missing_posts: 12,
              stale_posts: 203,
              active_run_id: "comments-run-active",
              effective_status: "running",
              last_comments_run_status: "running",
            },
          }),
          catalog_run_progress: null,
          dashboard_freshness: {
            status: "fresh",
            source: "live",
            generated_at: "2026-04-26T12:02:00.000Z",
            age_seconds: 0,
          },
          operational_alerts: [],
        },
        meta: {
          cacheStatus: "refresh",
          generatedAt: "2026-04-26T12:02:00.000Z",
          cacheAgeMs: 0,
          stale: false,
        },
      });

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/thetraitorsus/snapshot?detail=lite"),
      { params: Promise.resolve({ platform: "instagram", handle: "thetraitorsus" }) },
    );
    const body = (await response.json()) as {
      data: { summary?: { comments_saved_summary?: { saved_comments?: number } } };
    };

    expect(response.status).toBe(200);
    expect(body.data.summary?.comments_saved_summary?.saved_comments).toBe(98409);
    expect(response.headers.get("x-trr-cache")).toBe("refresh");
    expect(getOrCreateAdminSnapshotMock).toHaveBeenCalledTimes(2);
    expect(getOrCreateAdminSnapshotMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        forceRefresh: true,
      }),
    );
  });
});
