import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

process.env.TRR_ADMIN_ROUTE_CACHE_DISABLED = "0";

const { requireAdminMock, fetchAdminBackendJsonMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  fetchAdminBackendJsonMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
  invalidateAdminBackendCache: vi.fn(),
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  buildAdminProxyErrorResponse: (error: unknown) =>
    NextResponse.json(
      { error: error instanceof Error ? error.message : "failed" },
      { status: 500 },
    ),
}));

import { GET } from "@/app/api/admin/networks-streaming/summary/route";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";
import { NETWORKS_STREAMING_SUMMARY_CACHE_NAMESPACE } from "@/lib/server/trr-api/networks-streaming-route-cache";

describe("networks-streaming summary route cache dedupe", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    invalidateRouteResponseCache(NETWORKS_STREAMING_SUMMARY_CACHE_NAMESPACE);
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
  });

  it("collapses concurrent cold misses into one backend summary load", async () => {
    let resolvePayload:
      | ((value: { status: number; data: Record<string, unknown>; durationMs: number }) => void)
      | null = null;
    fetchAdminBackendJsonMock.mockImplementation(
      () =>
        new Promise<{ status: number; data: Record<string, unknown>; durationMs: number }>(
          (resolve) => {
            resolvePayload = resolve;
          },
        ),
    );

    const request = new NextRequest("http://localhost/api/admin/networks-streaming/summary");
    const pendingResponses = [GET(request), GET(request)];
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(1);

    resolvePayload?.({
      status: 200,
      data: {
        totals: { total_available_shows: 18, total_added_shows: 7 },
        rows: [],
        generated_at: "2026-03-26T14:00:00.000Z",
      },
      durationMs: 4,
    });

    const [firstResponse, secondResponse] = await Promise.all(pendingResponses);
    await expect(firstResponse.json()).resolves.toEqual({
      totals: { total_available_shows: 18, total_added_shows: 7 },
      rows: [],
      generated_at: "2026-03-26T14:00:00.000Z",
    });
    await expect(secondResponse.json()).resolves.toEqual({
      totals: { total_available_shows: 18, total_added_shows: 7 },
      rows: [],
      generated_at: "2026-03-26T14:00:00.000Z",
    });
  });

  it("bypasses a cached response when refresh is requested", async () => {
    fetchAdminBackendJsonMock
      .mockResolvedValueOnce({
        status: 200,
        data: {
          totals: { total_available_shows: 18, total_added_shows: 7 },
          rows: [],
          generated_at: "2026-03-26T14:00:00.000Z",
        },
        durationMs: 3,
      })
      .mockResolvedValueOnce({
        status: 200,
        data: {
          totals: { total_available_shows: 18, total_added_shows: 8 },
          rows: [],
          generated_at: "2026-03-26T14:00:05.000Z",
        },
        durationMs: 3,
      });

    await GET(new NextRequest("http://localhost/api/admin/networks-streaming/summary"));
    const refreshedResponse = await GET(
      new NextRequest("http://localhost/api/admin/networks-streaming/summary?refresh=123"),
    );

    expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(2);
    await expect(refreshedResponse.json()).resolves.toEqual({
      totals: { total_available_shows: 18, total_added_shows: 8 },
      rows: [],
      generated_at: "2026-03-26T14:00:05.000Z",
    });
  });
});
