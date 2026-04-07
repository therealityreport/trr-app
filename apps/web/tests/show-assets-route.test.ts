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

import { GET } from "@/app/api/admin/trr-api/shows/[showId]/assets/route";

describe("show assets route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
  });

  it("proxies default paginated mode to the backend and preserves the response contract", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        assets: [{ id: "asset-1", hosted_url: "https://cdn.example.com/1.jpg" }],
        pagination: {
          limit: 75,
          offset: 25,
          count: 1,
          truncated: false,
          full: false,
        },
      },
      durationMs: 6,
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/trr-api/shows/show-1/assets?limit=75&offset=25&sources=tmdb,fanart"
      ),
      { params: Promise.resolve({ showId: "show-1" }) }
    );

    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/trr-api/shows/show-1/assets?limit=75&offset=25&sources=tmdb%2Cfanart",
      expect.objectContaining({ routeName: "show-assets" }),
    );

    const body = await response.json();
    expect(body).toEqual({
      assets: [{ id: "asset-1", hosted_url: "https://cdn.example.com/1.jpg" }],
      pagination: {
        limit: 75,
        offset: 25,
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
      durationMs: 6,
    });

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/shows/show-1/assets?full=1"),
      { params: Promise.resolve({ showId: "show-1" }) }
    );

    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/trr-api/shows/show-1/assets?limit=5001&offset=0&full=true",
      expect.objectContaining({ routeName: "show-assets" }),
    );

    const body = await response.json();
    expect(body).toEqual({
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
    });
  });
});
