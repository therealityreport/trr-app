import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const {
  requireAdminMock,
  fetchAdminBackendJsonMock,
  invalidateAdminBackendCacheMock,
  getBackendApiUrlMock,
  getCoveredShowsLocalMock,
  getCoveredShowByTrrShowIdMock,
  addCoveredShowLocalMock,
  removeCoveredShowLocalMock,
  getInternalAdminBearerTokenMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  fetchAdminBackendJsonMock: vi.fn(),
  invalidateAdminBackendCacheMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
  getCoveredShowsLocalMock: vi.fn(),
  getCoveredShowByTrrShowIdMock: vi.fn(),
  addCoveredShowLocalMock: vi.fn(),
  removeCoveredShowLocalMock: vi.fn(),
  getInternalAdminBearerTokenMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/backend", () => ({
  getBackendApiUrl: getBackendApiUrlMock,
}));

vi.mock("@/lib/server/admin/covered-shows-repository", () => ({
  getCoveredShows: getCoveredShowsLocalMock,
  getCoveredShowByTrrShowId: getCoveredShowByTrrShowIdMock,
  addCoveredShow: addCoveredShowLocalMock,
  removeCoveredShow: removeCoveredShowLocalMock,
}));

vi.mock("@/lib/server/trr-api/internal-admin-auth", () => ({
  getInternalAdminBearerToken: getInternalAdminBearerTokenMock,
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
  invalidateAdminBackendCache: invalidateAdminBackendCacheMock,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  buildAdminProxyErrorResponse: (error: unknown) =>
    NextResponse.json(
      { error: error instanceof Error ? error.message : "failed" },
      { status: error instanceof Error && error.message === "unauthorized" ? 401 : 500 },
    ),
}));

import { GET as LIST_GET, POST } from "@/app/api/admin/covered-shows/route";
import { DELETE, GET } from "@/app/api/admin/covered-shows/[showId]/route";

describe("covered show route parity", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    invalidateAdminBackendCacheMock.mockReset();
    getBackendApiUrlMock.mockReset();
    getCoveredShowsLocalMock.mockReset();
    getCoveredShowByTrrShowIdMock.mockReset();
    addCoveredShowLocalMock.mockReset();
    removeCoveredShowLocalMock.mockReset();
    getInternalAdminBearerTokenMock.mockReset();
    vi.restoreAllMocks();

    requireAdminMock.mockResolvedValue({ uid: "admin-test-user" });
    invalidateAdminBackendCacheMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockImplementation((path: string) => `https://backend.example.com/api/v1${path}`);
    getInternalAdminBearerTokenMock.mockReturnValue("internal-admin-jwt");
  });

  it("returns the backend-owned covered-show contract", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        show: {
          id: "covered-1",
          trr_show_id: "show-1",
          show_name: "Bravo Show",
          canonical_slug: "bravo-show",
          alternative_names: ["Bravo"],
          show_total_episodes: 12,
          poster_url: "https://cdn.example.com/poster.jpg",
        },
      },
      durationMs: 5,
    });

    const request = new NextRequest("http://localhost/api/admin/covered-shows/show-1");
    const response = await GET(request, { params: Promise.resolve({ showId: "show-1" }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      show: {
        id: "covered-1",
        trr_show_id: "show-1",
        show_name: "Bravo Show",
        canonical_slug: "bravo-show",
        alternative_names: ["Bravo"],
        show_total_episodes: 12,
        poster_url: "https://cdn.example.com/poster.jpg",
      },
    });
  });

  it("posts new covered shows through the backend proxy with admin uid", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { success: true, show: { trr_show_id: "show-1" } },
      durationMs: 4,
    });

    const request = new NextRequest("http://localhost/api/admin/covered-shows", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trr_show_id: "show-1", show_name: "Bravo Show" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/covered-shows",
      expect.objectContaining({
        method: "POST",
        routeName: "covered-shows:create",
        headers: {
          "Content-Type": "application/json",
          "X-TRR-Admin-User-Uid": "admin-test-user",
        },
      }),
    );
    expect(invalidateAdminBackendCacheMock).toHaveBeenCalledWith(
      "/admin/covered-shows/cache/invalidate",
      { routeName: "covered-shows" },
    );
  });

  it("falls back to the local repository for covered-shows list when backend auth is unavailable", async () => {
    fetchAdminBackendJsonMock.mockRejectedValue(new Error("Backend internal auth is not configured"));
    getCoveredShowsLocalMock.mockResolvedValue([
      {
        id: "covered-2",
        trr_show_id: "show-2",
        show_name: "Local Show",
        canonical_slug: "local-show",
        alternative_names: [],
        show_total_episodes: 8,
        poster_url: null,
      },
    ]);

    const request = new NextRequest("http://localhost/api/admin/covered-shows");
    const response = await LIST_GET(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      shows: [
        {
          id: "covered-2",
          trr_show_id: "show-2",
          show_name: "Local Show",
          canonical_slug: "local-show",
          alternative_names: [],
          show_total_episodes: 8,
          poster_url: null,
        },
      ],
    });
    expect(getCoveredShowsLocalMock).toHaveBeenCalledTimes(1);
  });

  it("deletes covered shows through the backend proxy with admin uid", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest("http://localhost/api/admin/covered-shows/show-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, { params: Promise.resolve({ showId: "show-1" }) });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.example.com/api/v1/admin/covered-shows/show-1",
      expect.objectContaining({ method: "DELETE" }),
    );
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer internal-admin-jwt");
    expect(headers.get("X-TRR-Admin-User-Uid")).toBe("admin-test-user");
    expect(invalidateAdminBackendCacheMock).toHaveBeenCalledWith(
      "/admin/covered-shows/cache/invalidate",
      { routeName: "covered-shows" },
    );
  });
});
