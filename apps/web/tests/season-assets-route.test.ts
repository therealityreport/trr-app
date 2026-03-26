import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { requireAdminMock, fetchAdminBackendJsonMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  fetchAdminBackendJsonMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
  ADMIN_READ_PROXY_GALLERY_TIMEOUT_MS: 8_000,
  buildAdminProxyErrorResponse: (error: unknown) =>
    NextResponse.json({ error: error instanceof Error ? error.message : "failed" }, { status: 500 }),
}));

import { GET } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets/route";

describe("season assets route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    requireAdminMock.mockResolvedValue(undefined);
  });

  it("proxies default paginated mode to the backend and preserves pagination fields", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        assets: [{ id: "asset-1", hosted_url: "https://cdn.example.com/1.jpg" }],
        pagination: {
          limit: 100,
          offset: 20,
          count: 1,
          truncated: false,
          full: false,
        },
      },
      durationMs: 5,
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/trr-api/shows/show-1/seasons/6/assets?limit=100&offset=20&sources=tmdb,fanart"
      ),
      { params: Promise.resolve({ showId: "show-1", seasonNumber: "6" }) }
    );

    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/trr-api/shows/show-1/seasons/6/assets?limit=100&offset=20&sources=tmdb%2Cfanart",
      expect.objectContaining({ routeName: "season-assets" }),
    );

    const body = await response.json();
    expect(body).toEqual({
      assets: [{ id: "asset-1", hosted_url: "https://cdn.example.com/1.jpg" }],
      pagination: {
        limit: 100,
        offset: 20,
        count: 1,
        truncated: false,
        full: false,
      },
    });
  });

  it("supports full fetch mode with truthful truncation metadata", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        assets: Array.from({ length: 5000 }, (_, idx) => ({
          id: `asset-${idx + 1}`,
          hosted_url: `https://cdn.example.com/${idx + 1}.jpg`,
        })),
        pagination: {
          limit: 5000,
          offset: 0,
          count: 5000,
          truncated: true,
          full: true,
        },
      },
      durationMs: 4,
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/trr-api/shows/show-1/seasons/6/assets?full=true"
      ),
      { params: Promise.resolve({ showId: "show-1", seasonNumber: "6" }) }
    );

    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/trr-api/shows/show-1/seasons/6/assets?limit=5001&offset=0&full=true",
      expect.objectContaining({ routeName: "season-assets" }),
    );

    const body = await response.json();
    expect(body.pagination).toMatchObject({
      limit: 5000,
      offset: 0,
      count: 5000,
      truncated: true,
      full: true,
    });
    expect(body.assets).toHaveLength(5000);
  });
});
