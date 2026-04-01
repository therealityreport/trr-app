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
  ADMIN_READ_PROXY_GALLERY_TIMEOUT_MS: 8_000,
  buildAdminProxyErrorResponse: (error: unknown) =>
    NextResponse.json(
      { error: error instanceof Error ? error.message : "failed" },
      { status: 500 },
    ),
}));

import { GET } from "@/app/api/admin/trr-api/people/[personId]/photos/route";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";

describe("person gallery route cache dedupe", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    invalidateRouteResponseCache("admin-person-photos");
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
  });

  it("collapses concurrent cold misses into one backend gallery load", async () => {
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

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/people/person-1/photos?limit=3&offset=0",
    );
    const pendingResponses = [
      GET(request, { params: Promise.resolve({ personId: "person-1" }) }),
      GET(request, { params: Promise.resolve({ personId: "person-1" }) }),
    ];
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(1);

    resolvePayload?.({
      status: 200,
      data: {
        photos: [{ id: "photo-1" }, { id: "photo-2" }, { id: "photo-3" }],
        pagination: {
          limit: 3,
          offset: 0,
          count: 3,
          total_count: 9,
          next_offset: 3,
          has_more: true,
        },
      },
      durationMs: 6,
    });

    const [firstResponse, secondResponse] = await Promise.all(pendingResponses);
    const [firstPayload, secondPayload] = await Promise.all([
      firstResponse.json(),
      secondResponse.json(),
    ]);

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(firstPayload.photos).toHaveLength(3);
    expect(secondPayload.photos).toHaveLength(3);
    expect(firstPayload.pagination).toMatchObject({ has_more: true, next_offset: 3, total_count: 9 });
    expect(secondPayload.pagination).toMatchObject({ has_more: true, next_offset: 3, total_count: 9 });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(1);
  });
});
