import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getSeasonsByShowIdMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getSeasonsByShowIdMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  getSeasonsByShowId: getSeasonsByShowIdMock,
}));

import { GET } from "@/app/api/admin/trr-api/shows/[showId]/seasons/route";

describe("/api/admin/trr-api/shows/[showId]/seasons include episode signal", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getSeasonsByShowIdMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-uid" });
  });

  it("passes includeEpisodeSignal=true when query requests include_episode_signal", async () => {
    getSeasonsByShowIdMock.mockResolvedValue([
      {
        id: "season-6",
        season_number: 6,
        has_scheduled_or_aired_episode: true,
        episode_airdate_count: 18,
      },
    ]);

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/seasons?limit=100&include_episode_signal=true",
      { method: "GET" },
    );
    const response = await GET(request, { params: Promise.resolve({ showId: "show-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(getSeasonsByShowIdMock).toHaveBeenCalledWith(
      "show-1",
      expect.objectContaining({
        includeEpisodeSignal: true,
        limit: 100,
      }),
    );
    expect(payload.seasons?.[0]).toMatchObject({
      has_scheduled_or_aired_episode: true,
      episode_airdate_count: 18,
    });
  });

  it("keeps default behavior when include_episode_signal is not provided", async () => {
    getSeasonsByShowIdMock.mockResolvedValue([]);
    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/seasons",
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ showId: "show-1" }) });
    expect(response.status).toBe(200);
    expect(getSeasonsByShowIdMock).toHaveBeenCalledWith(
      "show-1",
      expect.objectContaining({
        includeEpisodeSignal: false,
      }),
    );
  });
});
