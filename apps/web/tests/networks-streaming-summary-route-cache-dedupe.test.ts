import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

process.env.TRR_ADMIN_ROUTE_CACHE_DISABLED = "0";

const { requireAdminMock, getNetworksStreamingSummaryMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getNetworksStreamingSummaryMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
  toVerifiedAdminContext: (user: { uid: string; email?: string }) => ({
    uid: user.uid,
    email: user.email ?? null,
    verifiedAt: 42,
  }),
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  buildAdminProxyErrorResponse: (error: unknown) =>
    NextResponse.json(
      { error: error instanceof Error ? error.message : "failed" },
      { status: 500 },
    ),
}));

vi.mock("@/lib/server/trr-api/admin-networks-streaming-reads", () => ({
  getNetworksStreamingSummary: getNetworksStreamingSummaryMock,
}));

import { GET } from "@/app/api/admin/networks-streaming/summary/route";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";
import { NETWORKS_STREAMING_SUMMARY_CACHE_NAMESPACE } from "@/lib/server/trr-api/networks-streaming-route-cache";

describe("networks-streaming summary route cache dedupe", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getNetworksStreamingSummaryMock.mockReset();
    invalidateRouteResponseCache(NETWORKS_STREAMING_SUMMARY_CACHE_NAMESPACE);
    requireAdminMock.mockResolvedValue({ uid: "admin-user", email: "admin@example.test" });
  });

  it("collapses concurrent cold misses into one backend summary load", async () => {
    let resolvePayload: ((value: Record<string, unknown>) => void) | null = null;
    getNetworksStreamingSummaryMock.mockImplementation(
      () =>
        new Promise<Record<string, unknown>>((resolve) => {
          resolvePayload = resolve;
        }),
    );

    const request = new NextRequest("http://localhost/api/admin/networks-streaming/summary");
    const pendingResponses = [GET(request), GET(request)];
    await Promise.resolve();
    await Promise.resolve();

    expect(getNetworksStreamingSummaryMock).toHaveBeenCalledTimes(1);

    resolvePayload?.({
      totals: { total_available_shows: 18, total_added_shows: 7 },
      rows: [],
      generated_at: "2026-03-26T14:00:00.000Z",
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
    getNetworksStreamingSummaryMock
      .mockResolvedValueOnce({
        totals: { total_available_shows: 18, total_added_shows: 7 },
        rows: [],
        generated_at: "2026-03-26T14:00:00.000Z",
      })
      .mockResolvedValueOnce({
        totals: { total_available_shows: 18, total_added_shows: 8 },
        rows: [],
        generated_at: "2026-03-26T14:00:05.000Z",
      });

    await GET(new NextRequest("http://localhost/api/admin/networks-streaming/summary"));
    const refreshedResponse = await GET(
      new NextRequest("http://localhost/api/admin/networks-streaming/summary?refresh=123"),
    );

    expect(getNetworksStreamingSummaryMock).toHaveBeenCalledTimes(2);
    await expect(refreshedResponse.json()).resolves.toEqual({
      totals: { total_available_shows: 18, total_added_shows: 8 },
      rows: [],
      generated_at: "2026-03-26T14:00:05.000Z",
    });
  });
});
