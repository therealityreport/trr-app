import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { fetchAdminBackendJsonMock, requireAdminMock, resolveAdminShowIdMock } = vi.hoisted(() => {
  process.env.TRR_ADMIN_ROUTE_CACHE_DISABLED = "0";
  return {
    fetchAdminBackendJsonMock: vi.fn(),
    requireAdminMock: vi.fn(),
    resolveAdminShowIdMock: vi.fn(),
  };
});

vi.mock("@/lib/server/auth", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/lib/server/admin/resolve-show-id", () => ({
  resolveAdminShowId: resolveAdminShowIdMock,
}));
vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  AdminReadProxyError: class AdminReadProxyError extends Error {},
  ADMIN_READ_PROXY_GALLERY_TIMEOUT_MS: 8_000,
  ADMIN_READ_PROXY_PRIMARY_TIMEOUT_MS: 20_000,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  buildAdminProxyErrorResponse: (error: unknown) =>
    NextResponse.json({ error: error instanceof Error ? error.message : "failed" }, { status: 500 }),
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
}));
vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  getSeasonsByShowId: vi.fn(),
}));

import { GET as getPeopleHome } from "@/app/api/admin/trr-api/people/home/route";
import { GET as getPersonPhotos } from "@/app/api/admin/trr-api/people/[personId]/photos/route";
import { GET as getSearch } from "@/app/api/admin/trr-api/search/route";
import { GET as getSeasonEpisodes } from "@/app/api/admin/trr-api/seasons/[seasonId]/episodes/route";
import { GET as getShowCast } from "@/app/api/admin/trr-api/shows/[showId]/cast/route";
import { GET as getSeasonCast } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/cast/route";
import { GET as getShowSeasons } from "@/app/api/admin/trr-api/shows/[showId]/seasons/route";
import { GET as getShows } from "@/app/api/admin/trr-api/shows/route";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";
import {
  TRR_PEOPLE_HOME_CACHE_NAMESPACE,
  TRR_SEARCH_CACHE_NAMESPACE,
  TRR_SEASON_CAST_CACHE_NAMESPACE,
  TRR_SEASON_EPISODES_CACHE_NAMESPACE,
  TRR_SHOW_CAST_CACHE_NAMESPACE,
  TRR_SHOW_SEASONS_CACHE_NAMESPACE,
  TRR_SHOWS_CACHE_NAMESPACE,
} from "@/lib/server/trr-api/trr-show-read-route-cache";

const PERSON_PHOTOS_CACHE_NAMESPACE = "admin-person-photos";

describe("admin route cache key normalization", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    resolveAdminShowIdMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
    resolveAdminShowIdMock.mockResolvedValue("show-1");
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { photos: [], pagination: {}, result: "ok" },
      durationMs: 1,
    });
    for (const namespace of [
      TRR_PEOPLE_HOME_CACHE_NAMESPACE,
      TRR_SEARCH_CACHE_NAMESPACE,
      TRR_SEASON_CAST_CACHE_NAMESPACE,
      TRR_SEASON_EPISODES_CACHE_NAMESPACE,
      TRR_SHOW_CAST_CACHE_NAMESPACE,
      TRR_SHOW_SEASONS_CACHE_NAMESPACE,
      TRR_SHOWS_CACHE_NAMESPACE,
      PERSON_PHOTOS_CACHE_NAMESPACE,
    ]) {
      invalidateRouteResponseCache(namespace);
    }
  });

  it("deduplicates equivalent top-level list requests", async () => {
    const secondShows = await getShows(
      new NextRequest("http://localhost/api/admin/trr-api/shows?q=bravo&limit=999&offset=-4"),
    ).then(async () =>
      getShows(new NextRequest("http://localhost/api/admin/trr-api/shows?q=bravo&limit=100&offset=0")),
    );
    const secondSearch = await getSearch(
      new NextRequest("http://localhost/api/admin/trr-api/search?q=%20bravo%20&limit=999"),
    ).then(async () =>
      getSearch(new NextRequest("http://localhost/api/admin/trr-api/search?q=bravo&limit=20")),
    );
    const secondPeople = await getPeopleHome(
      new NextRequest("http://localhost/api/admin/trr-api/people/home?limit=999"),
    ).then(async () =>
      getPeopleHome(new NextRequest("http://localhost/api/admin/trr-api/people/home?limit=24")),
    );

    expect(secondShows.headers.get("x-trr-cache")).toBe("hit");
    expect(secondSearch.headers.get("x-trr-cache")).toBe("hit");
    expect(secondPeople.headers.get("x-trr-cache")).toBe("hit");
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(3);
  });

  it("deduplicates equivalent show, season, and episode requests", async () => {
    const showParams = { params: Promise.resolve({ showId: "show-1" }) };
    const secondSeasons = await getShowSeasons(
      new NextRequest(
        "http://localhost/api/admin/trr-api/shows/show-1/seasons?limit=999&offset=-1&include_episode_signal=1",
      ),
      showParams,
    ).then(async () =>
      getShowSeasons(
        new NextRequest(
          "http://localhost/api/admin/trr-api/shows/show-1/seasons?limit=500&offset=0&include_episode_signal=true",
        ),
        showParams,
      ),
    );
    const secondShowCast = await getShowCast(
      new NextRequest("http://localhost/api/admin/trr-api/shows/show-1/cast?limit=999&offset=-1"),
      showParams,
    ).then(async () =>
      getShowCast(
        new NextRequest("http://localhost/api/admin/trr-api/shows/show-1/cast?limit=500&offset=0"),
        showParams,
      ),
    );
    const seasonCastParams = {
      params: Promise.resolve({ showId: "show-1", seasonNumber: "1" }),
    };
    const secondSeasonCast = await getSeasonCast(
      new NextRequest(
        "http://localhost/api/admin/trr-api/shows/show-1/seasons/1/cast?limit=999&offset=-1&include_archive_only=TRUE",
      ),
      seasonCastParams,
    ).then(async () =>
      getSeasonCast(
        new NextRequest(
          "http://localhost/api/admin/trr-api/shows/show-1/seasons/1/cast?limit=500&offset=0&include_archive_only=true&photo_fallback=none",
        ),
        seasonCastParams,
      ),
    );
    const episodeParams = { params: Promise.resolve({ seasonId: "season-1" }) };
    const secondEpisodes = await getSeasonEpisodes(
      new NextRequest("http://localhost/api/admin/trr-api/seasons/season-1/episodes?limit=999&offset=-1"),
      episodeParams,
    ).then(async () =>
      getSeasonEpisodes(
        new NextRequest("http://localhost/api/admin/trr-api/seasons/season-1/episodes?limit=500&offset=0"),
        episodeParams,
      ),
    );

    expect(secondSeasons.headers.get("x-trr-cache")).toBe("hit");
    expect(secondShowCast.headers.get("x-trr-cache")).toBe("hit");
    expect(secondSeasonCast.headers.get("x-trr-cache")).toBe("hit");
    expect(secondEpisodes.headers.get("x-trr-cache")).toBe("hit");
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(4);
  });

  it("deduplicates canonical person-photo requests while excluding request role", async () => {
    const params = { params: Promise.resolve({ personId: "person-1" }) };
    await getPersonPhotos(
      new NextRequest(
        "http://localhost/api/admin/trr-api/people/person-1/photos?limit=999&offset=-1&include_broken=1&include_total_count=0&sources=getty,%20bravo&request_role=primary",
      ),
      params,
    );
    const second = await getPersonPhotos(
      new NextRequest(
        "http://localhost/api/admin/trr-api/people/person-1/photos?limit=500&offset=0&include_broken=true&include_total_count=false&sources=getty,bravo&request_role=polling",
      ),
      params,
    );

    expect(second.headers.get("x-trr-cache")).toBe("hit");
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(1);
  });
});
