import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

process.env.TRR_ADMIN_ROUTE_CACHE_DISABLED = "0";

const { requireAdminMock, toVerifiedAdminContextMock, fetchAdminBackendJsonMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  toVerifiedAdminContextMock: vi.fn(),
  fetchAdminBackendJsonMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
  toVerifiedAdminContext: toVerifiedAdminContextMock,
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
  buildAdminBackendStatusError: ({ fallbackMessage, status }: { fallbackMessage: string; status: number }) =>
    Object.assign(new Error(fallbackMessage), { status }),
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  buildAdminProxyErrorResponse: (error: unknown) =>
    NextResponse.json(
      { error: error instanceof Error ? error.message : "failed" },
      { status: 500 },
    ),
}));

import { GET } from "@/app/api/admin/covered-shows/route";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";

describe("covered shows route cache dedupe", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    toVerifiedAdminContextMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    invalidateRouteResponseCache("admin-covered-shows");
    requireAdminMock.mockResolvedValue({ uid: "admin-test-user" });
    toVerifiedAdminContextMock.mockReturnValue({
      uid: "admin-test-user",
      email: null,
      verifiedAt: 1_700_000_000_000,
    });
  });

  it("collapses concurrent cold misses into one backend proxy load", async () => {
    let resolveShows:
      | ((value: { status: number; data: Record<string, unknown>; durationMs: number }) => void)
      | null = null;
    fetchAdminBackendJsonMock.mockImplementation(
      () =>
        new Promise<{ status: number; data: Record<string, unknown>; durationMs: number }>(
          (resolve) => {
            resolveShows = resolve;
          },
        ),
    );

    const request = new NextRequest("http://localhost/api/admin/covered-shows");
    const pendingResponses = [GET(request), GET(request)];
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(1);

    resolveShows?.({
      status: 200,
      data: {
        shows: [
          {
            id: "00000000-0000-0000-0000-000000000010",
            trr_show_id: "00000000-0000-0000-0000-000000000011",
            show_name: "Bravo Show",
            canonical_slug: "bravo-show",
            alternative_names: ["Bravo Show"],
            show_total_episodes: 12,
            poster_url: "https://cdn.example.com/poster.jpg",
          },
        ],
      },
      durationMs: 9,
    });

    const [firstResponse, secondResponse] = await Promise.all(pendingResponses);
    const [firstPayload, secondPayload] = await Promise.all([
      firstResponse.json(),
      secondResponse.json(),
    ]);

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(firstPayload.shows).toHaveLength(1);
    expect(secondPayload.shows).toHaveLength(1);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(1);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/covered-shows",
      expect.objectContaining({ apiVersion: "v2" }),
    );
  });
});
