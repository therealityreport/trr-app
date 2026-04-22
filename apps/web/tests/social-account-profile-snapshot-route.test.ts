import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  toVerifiedAdminContext: vi.fn(),
  buildAdminAuthPartition: vi.fn(),
  buildAdminSnapshotCacheKey: vi.fn(),
  getOrCreateAdminSnapshot: vi.fn(),
  buildSnapshotResponse: vi.fn(),
  buildSnapshotSubrequest: vi.fn(),
  readRouteJsonOrThrow: vi.fn(),
  socialProxyErrorResponse: vi.fn(),
  getCatalogRunProgress: vi.fn(),
  getSummary: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: (...args: unknown[]) => mocks.requireAdmin(...args),
  toVerifiedAdminContext: (...args: unknown[]) => mocks.toVerifiedAdminContext(...args),
}));

vi.mock("@/lib/server/admin/admin-snapshot-cache", () => ({
  buildAdminAuthPartition: (...args: unknown[]) => mocks.buildAdminAuthPartition(...args),
  buildAdminSnapshotCacheKey: (...args: unknown[]) => mocks.buildAdminSnapshotCacheKey(...args),
  getOrCreateAdminSnapshot: (...args: unknown[]) => mocks.getOrCreateAdminSnapshot(...args),
}));

vi.mock("@/lib/server/admin/admin-snapshot-route", () => ({
  buildSnapshotResponse: (...args: unknown[]) => mocks.buildSnapshotResponse(...args),
  buildSnapshotSubrequest: (...args: unknown[]) => mocks.buildSnapshotSubrequest(...args),
  readRouteJsonOrThrow: (...args: unknown[]) => mocks.readRouteJsonOrThrow(...args),
}));

vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({
  socialProxyErrorResponse: (...args: unknown[]) => mocks.socialProxyErrorResponse(...args),
}));

vi.mock(
  "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/runs/[runId]/progress/route",
  () => ({
    GET: (...args: unknown[]) => mocks.getCatalogRunProgress(...args),
  }),
);

vi.mock("@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/summary/route", () => ({
  GET: (...args: unknown[]) => mocks.getSummary(...args),
}));

import { GET } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/snapshot/route";

describe("social account profile snapshot route", () => {
  beforeEach(() => {
    mocks.requireAdmin.mockReset();
    mocks.toVerifiedAdminContext.mockReset();
    mocks.buildAdminAuthPartition.mockReset();
    mocks.buildAdminSnapshotCacheKey.mockReset();
    mocks.getOrCreateAdminSnapshot.mockReset();
    mocks.buildSnapshotResponse.mockReset();
    mocks.buildSnapshotSubrequest.mockReset();
    mocks.readRouteJsonOrThrow.mockReset();
    mocks.socialProxyErrorResponse.mockReset();
    mocks.getCatalogRunProgress.mockReset();
    mocks.getSummary.mockReset();

    mocks.requireAdmin.mockResolvedValue({ uid: "admin-1", email: "admin@example.com" });
    mocks.toVerifiedAdminContext.mockReturnValue({
      uid: "admin-1",
      email: "admin@example.com",
      verifiedAt: 1_700_000_000_000,
    });
    mocks.buildAdminAuthPartition.mockReturnValue("partition:admin-1");
    mocks.buildAdminSnapshotCacheKey.mockReturnValue("snapshot-key");
    mocks.buildSnapshotSubrequest.mockImplementation(
      (_request: NextRequest, pathname: string, searchParams?: URLSearchParams) =>
        new NextRequest(
          `http://localhost${pathname}${searchParams && searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
        ),
    );
    mocks.readRouteJsonOrThrow.mockImplementation(async (response: Response) => response.json());
    mocks.buildSnapshotResponse.mockImplementation(
      ({ data, cacheStatus, generatedAt, cacheAgeMs, stale }: Record<string, unknown>) =>
        NextResponse.json({
          ...((data as Record<string, unknown> | undefined) ?? {}),
          cache_status: cacheStatus,
          generated_at: generatedAt,
          cache_age_ms: cacheAgeMs,
          stale,
        }),
    );
    mocks.getOrCreateAdminSnapshot.mockImplementation(
      async ({ fetcher }: { fetcher: () => Promise<Record<string, unknown>> }) => ({
        data: await fetcher(),
        meta: {
          cacheStatus: "live",
          generatedAt: "2026-04-21T12:00:00.000Z",
          cacheAgeMs: 0,
          stale: false,
        },
      }),
    );
    mocks.socialProxyErrorResponse.mockImplementation((error: unknown) =>
      NextResponse.json(
        { error: error instanceof Error ? error.message : "unknown error" },
        { status: 500 },
      ),
    );
  });

  it("loads catalog progress for cancelling runs inferred from the summary snapshot", async () => {
    mocks.getSummary.mockResolvedValue(
      NextResponse.json({
        catalog_recent_runs: [
          {
            run_id: "run-cancelling-1",
            status: "cancelling",
          },
        ],
      }),
    );
    mocks.getCatalogRunProgress.mockResolvedValue(
      NextResponse.json({
        run_id: "run-cancelling-1",
        run_status: "cancelling",
      }),
    );

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/snapshot?recent_log_limit=10",
      ),
      {
        params: Promise.resolve({
          platform: "instagram",
          handle: "bravotv",
        }),
      },
    );

    expect(mocks.getCatalogRunProgress).toHaveBeenCalledTimes(1);
    const progressContext = mocks.getCatalogRunProgress.mock.calls[0]?.[1] as
      | { params?: Promise<{ platform: string; handle: string; runId: string }> }
      | undefined;
    await expect(progressContext?.params).resolves.toEqual({
      platform: "instagram",
      handle: "bravotv",
      runId: "run-cancelling-1",
    });

    const payload = (await response.json()) as {
      catalog_run_progress?: { run_id?: string; run_status?: string };
    };
    expect(payload.catalog_run_progress).toEqual({
      run_id: "run-cancelling-1",
      run_status: "cancelling",
    });
  });

  it("forwards the requested summary detail to the nested summary subrequest", async () => {
    mocks.getSummary.mockResolvedValue(NextResponse.json({ catalog_recent_runs: [] }));

    await GET(
      new NextRequest(
        "http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/snapshot?detail=lite&recent_log_limit=10",
      ),
      {
        params: Promise.resolve({
          platform: "instagram",
          handle: "bravotv",
        }),
      },
    );

    expect(mocks.buildSnapshotSubrequest).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "/api/admin/trr-api/social/profiles/instagram/bravotv/summary",
      expect.objectContaining({
        toString: expect.any(Function),
      }),
      expect.objectContaining({
        uid: "admin-1",
        email: "admin@example.com",
        verifiedAt: 1_700_000_000_000,
      }),
    );
    const summarySearchParams = mocks.buildSnapshotSubrequest.mock.calls[0]?.[2] as URLSearchParams | undefined;
    expect(summarySearchParams?.toString()).toBe("detail=lite");
  });

  it("passes structured upstream errors through to the social proxy error response", async () => {
    const upstreamError = Object.assign(new Error("Social account profile not found."), {
      status: 404,
      code: "UPSTREAM_ERROR",
      upstreamStatus: 404,
    });
    mocks.readRouteJsonOrThrow.mockRejectedValueOnce(upstreamError);

    await GET(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/missing/snapshot?detail=lite"),
      {
        params: Promise.resolve({
          platform: "instagram",
          handle: "missing",
        }),
      },
    );

    expect(mocks.socialProxyErrorResponse).toHaveBeenCalledTimes(1);
    expect(mocks.socialProxyErrorResponse.mock.calls[0]?.[0]).toBe(upstreamError);
  });
});
