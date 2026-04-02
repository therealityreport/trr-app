import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

process.env.TRR_ADMIN_ROUTE_CACHE_DISABLED = "1";

const { requireAdminMock, resolveAdminShowIdMock, fetchAdminBackendJsonMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  resolveAdminShowIdMock: vi.fn(),
  fetchAdminBackendJsonMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/resolve-show-id", () => ({
  resolveAdminShowId: resolveAdminShowIdMock,
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  buildAdminProxyErrorResponse: (error: unknown) =>
    NextResponse.json({ error: error instanceof Error ? error.message : "failed" }, { status: 500 }),
}));

import { GET } from "@/app/api/admin/trr-api/shows/[showId]/cast/route";

describe("show cast route proxy parity", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    resolveAdminShowIdMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-test-user" });
    resolveAdminShowIdMock.mockResolvedValue("00000000-0000-0000-0000-000000000001");
  });

  it("does not inject a default minEpisodes filter when the caller did not request one", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        cast: [
          {
            person_id: "p2",
            full_name: "Person Two",
            total_episodes: 4,
          },
        ],
        archive_footage_cast: [],
        cast_source: "episode_evidence",
        eligibility_warning: null,
        pagination: { limit: 20, offset: 0, count: 1 },
      },
      durationMs: 9,
    });

    const request = new NextRequest("http://localhost/api/admin/trr-api/shows/show-1/cast");
    const response = await GET(request, { params: Promise.resolve({ showId: "show-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/trr-api/shows/00000000-0000-0000-0000-000000000001/cast?limit=20&offset=0&roster_mode=episode_evidence&photo_fallback=none",
      expect.objectContaining({ routeName: "show-cast" }),
    );
    expect(payload.cast_source).toBe("episode_evidence");
    expect(payload.cast[0].person_id).toBe("p2");
  });

  it("forwards explicit filter and roster parameters", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        cast: [],
        archive_footage_cast: [],
        cast_source: "imdb_show_membership",
        eligibility_warning: null,
        pagination: { limit: 500, offset: 0, count: 0 },
      },
      durationMs: 6,
    });

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/cast?limit=500&minEpisodes=0&exclude_zero_episode_members=true&requireImage=true&roster_mode=imdb_show_membership&photo_fallback=bravo",
    );
    const response = await GET(request, { params: Promise.resolve({ showId: "show-1" }) });

    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/trr-api/shows/00000000-0000-0000-0000-000000000001/cast?limit=500&offset=0&roster_mode=imdb_show_membership&photo_fallback=bravo&minEpisodes=0&exclude_zero_episode_members=true&requireImage=true",
      expect.objectContaining({ routeName: "show-cast" }),
    );
  });

  it("forwards lean staged-loading requests without photos", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        cast: [],
        archive_footage_cast: [],
        cast_source: "imdb_show_membership",
        eligibility_warning: null,
        pagination: { limit: 500, offset: 0, count: 0 },
      },
      durationMs: 5,
    });

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/cast?limit=500&roster_mode=imdb_show_membership&include_photos=false",
    );
    const response = await GET(request, { params: Promise.resolve({ showId: "show-1" }) });

    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/trr-api/shows/00000000-0000-0000-0000-000000000001/cast?limit=500&offset=0&roster_mode=imdb_show_membership&photo_fallback=none&include_photos=false",
      expect.objectContaining({ routeName: "show-cast" }),
    );
  });

  it("returns 404 when show slug or id cannot be resolved", async () => {
    resolveAdminShowIdMock.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/admin/trr-api/shows/missing-show/cast");
    const response = await GET(request, { params: Promise.resolve({ showId: "missing-show" }) });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: 'Show not found for "missing-show".',
    });
    expect(fetchAdminBackendJsonMock).not.toHaveBeenCalled();
  });
});
