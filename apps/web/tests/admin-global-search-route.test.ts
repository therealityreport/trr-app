import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  searchShowsMock,
  searchPeopleWithShowContextMock,
  searchEpisodesMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  searchShowsMock: vi.fn(),
  searchPeopleWithShowContextMock: vi.fn(),
  searchEpisodesMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  searchShows: searchShowsMock,
  searchPeopleWithShowContext: searchPeopleWithShowContextMock,
  searchEpisodes: searchEpisodesMock,
}));

import { GET } from "@/app/api/admin/trr-api/search/route";

describe("/api/admin/trr-api/search", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    searchShowsMock.mockReset();
    searchPeopleWithShowContextMock.mockReset();
    searchEpisodesMock.mockReset();
    requireAdminMock.mockResolvedValue(undefined);
  });

  it("enforces minimum query length", async () => {
    const response = await GET(new NextRequest("http://localhost/api/admin/trr-api/search?q=a"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("at least 3");
    expect(searchShowsMock).not.toHaveBeenCalled();
  });

  it("returns grouped shows/people/episodes results", async () => {
    searchShowsMock.mockResolvedValue([
      { id: "show-1", name: "The Traitors", slug: "traitors", canonical_slug: "the-traitors-us" },
    ]);
    searchPeopleWithShowContextMock.mockResolvedValue([
      {
        id: "person-1",
        full_name: "Alan Cumming",
        known_for: "Host",
        external_ids: {},
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z",
        show_context: "the-traitors-us",
      },
    ]);
    searchEpisodesMock.mockResolvedValue([
      {
        id: "episode-1",
        title: "The Castle",
        episode_number: 1,
        season_number: 1,
        air_date: null,
        show_id: "show-1",
        show_name: "The Traitors",
        show_slug: "the-traitors-us",
      },
    ]);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/search?q=ala&limit=7"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(searchShowsMock).toHaveBeenCalledWith("ala", { limit: 7, offset: 0 });
    expect(searchPeopleWithShowContextMock).toHaveBeenCalledWith("ala", { limit: 7, offset: 0 });
    expect(searchEpisodesMock).toHaveBeenCalledWith("ala", { limit: 7, offset: 0 });

    expect(payload.shows[0]).toMatchObject({ name: "The Traitors", slug: "the-traitors-us" });
    expect(payload.people[0]).toMatchObject({ full_name: "Alan Cumming", show_context: "the-traitors-us" });
    expect(payload.people[0].person_slug).toContain("alan-cumming");
    expect(payload.episodes[0]).toMatchObject({
      title: "The Castle",
      season_number: 1,
      show_slug: "the-traitors-us",
    });
  });
});
