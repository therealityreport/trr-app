import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

process.env.TRR_ADMIN_ROUTE_CACHE_DISABLED = "1";

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

describe("person gallery broken filter route wiring", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        photos: [],
        pagination: { limit: 25, offset: 10, count: 0, total_count: 0, next_offset: 10, has_more: false },
      },
      durationMs: 7,
    });
  });

  it("defaults includeBroken to false", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/people/person-1/photos?limit=25&offset=10&sources=imdb,fandom",
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ personId: "person-1" }) });
    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/people/person-1/gallery?limit=25&offset=10&sources=imdb%2Cfandom",
      expect.objectContaining({ routeName: "person-gallery" }),
    );
    await expect(response.json()).resolves.toMatchObject({
      pagination: {
        limit: 25,
        offset: 10,
        total_count: 0,
        next_offset: 10,
        has_more: false,
      },
    });
  });

  it("passes includeBroken=true when query flag is enabled", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/people/person-1/photos?include_broken=true",
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ personId: "person-1" }) });
    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/people/person-1/gallery?limit=100&offset=0&include_broken=true",
      expect.objectContaining({ routeName: "person-gallery" }),
    );
  });

  it("returns backend pagination metadata without inflating the page locally", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        photos: Array.from({ length: 3 }, (_, index) => ({ id: `photo-${index + 1}` })),
        pagination: {
          count: 3,
          limit: 3,
          offset: 9,
          total_count: 17,
          next_offset: 12,
          has_more: true,
        },
      },
      durationMs: 5,
    });
    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/people/person-1/photos?limit=3&offset=9",
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ personId: "person-1" }) });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      photos: [{ id: "photo-1" }, { id: "photo-2" }, { id: "photo-3" }],
      pagination: {
        count: 3,
        limit: 3,
        offset: 9,
        total_count: 17,
        next_offset: 12,
        has_more: true,
      },
    });
  });

  it("passes include_total_count=false through to the backend and preserves deferred count metadata", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        photos: [{ id: "photo-1" }],
        pagination: {
          count: 1,
          limit: 48,
          offset: 0,
          total_count: null,
          total_count_status: "deferred",
          next_offset: 1,
          has_more: false,
        },
      },
      durationMs: 5,
    });
    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/people/person-1/photos?limit=48&offset=0&include_total_count=false",
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ personId: "person-1" }) });
    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/people/person-1/gallery?limit=48&offset=0&include_total_count=false",
      expect.objectContaining({ routeName: "person-gallery" }),
    );
    await expect(response.json()).resolves.toMatchObject({
      photos: [{ id: "photo-1" }],
      pagination: {
        count: 1,
        limit: 48,
        offset: 0,
        total_count: null,
        total_count_status: "deferred",
        next_offset: 1,
        has_more: false,
      },
    });
  });
});
