import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  getShowByTrrShowIdMock,
  getSeasonsByShowIdMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getShowByTrrShowIdMock: vi.fn(),
  getSeasonsByShowIdMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/shows/shows-repository", () => ({
  getShowByTrrShowId: getShowByTrrShowIdMock,
  getSeasonsByShowId: getSeasonsByShowIdMock,
}));

import { GET } from "@/app/api/admin/shows/by-trr-show/[trrShowId]/route";

describe("/api/admin/shows/by-trr-show/[trrShowId]", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getShowByTrrShowIdMock.mockReset();
    getSeasonsByShowIdMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
  });

  it("returns show:null when no record exists", async () => {
    getShowByTrrShowIdMock.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/admin/shows/by-trr-show/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", {
      method: "GET",
    });

    const response = await GET(request, {
      params: Promise.resolve({ trrShowId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ show: null });
    expect(getSeasonsByShowIdMock).not.toHaveBeenCalled();
  });

  it("includes seasons when includeSeasons=true", async () => {
    getShowByTrrShowIdMock.mockResolvedValue({
      id: "show-1",
      key: "show-key",
      trr_show_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      title: "My Show",
      short_title: null,
      network: null,
      status: null,
      logline: null,
      palette: null,
      fonts: {},
      icon_url: null,
      wordmark_url: null,
      hero_url: null,
      tags: [],
      is_active: true,
      created_at: "2026-02-09T00:00:00.000Z",
      updated_at: "2026-02-09T00:00:00.000Z",
    });
    getSeasonsByShowIdMock.mockResolvedValue([
      {
        id: "season-1",
        show_id: "show-1",
        season_number: 1,
        label: "Season 1",
        year: null,
        description: null,
        colors: null,
        show_icon_url: null,
        wordmark_url: null,
        hero_url: null,
        cast_members: [],
        notes: [],
        is_active: true,
        is_current: false,
        created_at: "2026-02-09T00:00:00.000Z",
        updated_at: "2026-02-09T00:00:00.000Z",
      },
    ]);

    const request = new NextRequest(
      "http://localhost/api/admin/shows/by-trr-show/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa?includeSeasons=true",
      { method: "GET" },
    );

    const response = await GET(request, {
      params: Promise.resolve({ trrShowId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.show?.key).toBe("show-key");
    expect(payload.seasons).toHaveLength(1);
    expect(getSeasonsByShowIdMock).toHaveBeenCalledWith("show-1");
  });

  it("returns 400 for invalid UUID", async () => {
    const request = new NextRequest("http://localhost/api/admin/shows/by-trr-show/not-a-uuid", {
      method: "GET",
    });

    const response = await GET(request, {
      params: Promise.resolve({ trrShowId: "not-a-uuid" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Invalid trrShowId");
  });
});

