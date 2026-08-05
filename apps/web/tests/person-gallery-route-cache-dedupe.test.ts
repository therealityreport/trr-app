import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

process.env.TRR_ADMIN_ROUTE_CACHE_DISABLED = "0";

const {
  requireAdminMock,
  fetchAdminBackendJsonMock,
  invalidateAdminBackendCacheMock,
  getBackendApiUrlMock,
  getInternalAdminBearerTokenMock,
  commitFetchMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  fetchAdminBackendJsonMock: vi.fn(),
  invalidateAdminBackendCacheMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
  getInternalAdminBearerTokenMock: vi.fn(),
  commitFetchMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
  invalidateAdminBackendCache: invalidateAdminBackendCacheMock,
  ADMIN_READ_PROXY_GALLERY_TIMEOUT_MS: 8_000,
  buildAdminProxyErrorResponse: (error: unknown) =>
    NextResponse.json(
      { error: error instanceof Error ? error.message : "failed" },
      { status: 500 },
    ),
}));

vi.mock("@/lib/server/trr-api/backend", () => ({
  getBackendApiUrl: getBackendApiUrlMock,
}));

vi.mock("@/lib/server/trr-api/internal-admin-auth", () => ({
  getInternalAdminBearerToken: getInternalAdminBearerTokenMock,
}));

import { GET } from "@/app/api/admin/trr-api/people/[personId]/photos/route";
import { POST as CommitFandomPOST } from "@/app/api/admin/trr-api/people/[personId]/import-fandom/commit/route";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";

describe("person gallery route cache dedupe", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    invalidateAdminBackendCacheMock.mockReset();
    getBackendApiUrlMock.mockReset();
    getInternalAdminBearerTokenMock.mockReset();
    commitFetchMock.mockReset();
    invalidateRouteResponseCache("admin-person-photos:person-1");
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
    invalidateAdminBackendCacheMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockImplementation((path: string) => `http://backend/api/v1${path}`);
    getInternalAdminBearerTokenMock.mockReturnValue("internal-admin-token");
    vi.stubGlobal("fetch", commitFetchMock);
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

  it("does not cache an in-flight gallery response after invalidation", async () => {
    let resolveInitialLoad:
      | ((value: { status: number; data: Record<string, unknown>; durationMs: number }) => void)
      | null = null;
    fetchAdminBackendJsonMock.mockImplementationOnce(
      () =>
        new Promise<{ status: number; data: Record<string, unknown>; durationMs: number }>(
          (resolve) => {
            resolveInitialLoad = resolve;
          },
        ),
    );
    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/people/person-1/photos?limit=3&offset=0",
    );
    const initialResponsePromise = GET(request, {
      params: Promise.resolve({ personId: "person-1" }),
    });
    await vi.waitFor(() => expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(1));

    invalidateRouteResponseCache("admin-person-photos:person-1");
    resolveInitialLoad?.({
      status: 200,
      data: {
        photos: [{ id: "photo-old" }],
        pagination: {
          total_count: 1,
          next_offset: 1,
          has_more: false,
        },
      },
      durationMs: 6,
    });
    await initialResponsePromise;

    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        photos: [{ id: "photo-new" }],
        pagination: {
          total_count: 1,
          next_offset: 1,
          has_more: false,
        },
      },
      durationMs: 4,
    });
    const postWriteResponse = await GET(request, {
      params: Promise.resolve({ personId: "person-1" }),
    });

    expect(postWriteResponse.headers.get("x-trr-cache")).not.toBe("hit");
    await expect(postWriteResponse.json()).resolves.toMatchObject({
      photos: [{ id: "photo-new" }],
    });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(2);
  });

  it("reloads a cached gallery after a successful Fandom commit", async () => {
    fetchAdminBackendJsonMock.mockResolvedValueOnce({
      status: 200,
      data: {
        photos: [{ id: "photo-old" }],
        pagination: { total_count: 1, next_offset: 1, has_more: false },
      },
      durationMs: 4,
    });
    const galleryRequest = new NextRequest(
      "http://localhost/api/admin/trr-api/people/person-1/photos?limit=3&offset=0",
    );
    await GET(galleryRequest, { params: Promise.resolve({ personId: "person-1" }) });

    commitFetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ profile: { source: "fandom" }, warnings: [] }),
    });
    const commitResponse = await CommitFandomPOST(
      new NextRequest(
        "http://localhost/api/admin/trr-api/people/person-1/import-fandom/commit",
        {
          method: "POST",
          body: JSON.stringify({
            selected_page_urls: ["https://real-housewives.fandom.com/wiki/Lisa_Barlow"],
          }),
        },
      ),
      { params: Promise.resolve({ personId: "person-1" }) },
    );
    expect(commitResponse.status).toBe(200);

    fetchAdminBackendJsonMock.mockResolvedValueOnce({
      status: 200,
      data: {
        photos: [{ id: "photo-new" }],
        pagination: { total_count: 1, next_offset: 1, has_more: false },
      },
      durationMs: 4,
    });
    const reloadedGallery = await GET(galleryRequest, {
      params: Promise.resolve({ personId: "person-1" }),
    });

    expect(reloadedGallery.headers.get("x-trr-cache")).not.toBe("hit");
    await expect(reloadedGallery.json()).resolves.toMatchObject({
      photos: [{ id: "photo-new" }],
    });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(2);
  });
});
