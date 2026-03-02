import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  getRecentPeopleViewsMock,
  getPeopleMostPopularMock,
  getPeopleMostShowsMock,
  getPeopleTopEpisodesMock,
  getPeopleRecentlyAddedMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getRecentPeopleViewsMock: vi.fn(),
  getPeopleMostPopularMock: vi.fn(),
  getPeopleMostShowsMock: vi.fn(),
  getPeopleTopEpisodesMock: vi.fn(),
  getPeopleRecentlyAddedMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/recent-people-repository", () => ({
  getRecentPeopleViews: getRecentPeopleViewsMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  getPeopleMostPopular: getPeopleMostPopularMock,
  getPeopleMostShows: getPeopleMostShowsMock,
  getPeopleTopEpisodes: getPeopleTopEpisodesMock,
  getPeopleRecentlyAdded: getPeopleRecentlyAddedMock,
}));

import { GET } from "@/app/api/admin/trr-api/people/home/route";

describe("/api/admin/trr-api/people/home", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getRecentPeopleViewsMock.mockReset();
    getPeopleMostPopularMock.mockReset();
    getPeopleMostShowsMock.mockReset();
    getPeopleTopEpisodesMock.mockReset();
    getPeopleRecentlyAddedMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "firebase-admin-1" });

    getRecentPeopleViewsMock.mockResolvedValue([]);
    getPeopleMostPopularMock.mockResolvedValue([]);
    getPeopleMostShowsMock.mockResolvedValue([]);
    getPeopleTopEpisodesMock.mockResolvedValue([]);
    getPeopleRecentlyAddedMock.mockResolvedValue([]);
  });

  it("returns all five sections", async () => {
    getPeopleMostPopularMock.mockResolvedValue([
      {
        person_id: "11111111-2222-3333-4444-555555555555",
        full_name: "Alan Cumming",
        known_for: "Host",
        photo_url: null,
        show_context: "the-traitors-us",
        metric_value: 15,
        latest_at: "2026-03-01T00:00:00Z",
      },
    ]);

    const request = new NextRequest("http://localhost/api/admin/trr-api/people/home?limit=9");
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(getRecentPeopleViewsMock).toHaveBeenCalledWith("firebase-admin-1", { limit: 9 });
    expect(getPeopleMostPopularMock).toHaveBeenCalledWith({ limit: 9 });
    expect(payload.sections.recentlyViewed).toBeDefined();
    expect(payload.sections.mostPopular).toBeDefined();
    expect(payload.sections.mostShows).toBeDefined();
    expect(payload.sections.topEpisodes).toBeDefined();
    expect(payload.sections.recentlyAdded).toBeDefined();

    expect(payload.sections.mostPopular.items[0]).toMatchObject({
      full_name: "Alan Cumming",
      metric_label: "News Score",
      show_context: "the-traitors-us",
    });
  });

  it("keeps page payload alive when one section fails", async () => {
    getPeopleMostShowsMock.mockRejectedValue(new Error("boom"));

    const request = new NextRequest("http://localhost/api/admin/trr-api/people/home");
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.sections.mostShows.items).toEqual([]);
    expect(payload.sections.mostShows.error).toContain("boom");
    expect(payload.sections.topEpisodes.error).toBeNull();
  });
});
