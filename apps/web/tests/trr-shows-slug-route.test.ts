import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  searchShowsMock,
  getShowByIdMock,
  updateShowByIdMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  searchShowsMock: vi.fn(),
  getShowByIdMock: vi.fn(),
  updateShowByIdMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  searchShows: searchShowsMock,
  getShowById: getShowByIdMock,
  updateShowById: updateShowByIdMock,
}));

import { GET as getShowsRoute } from "@/app/api/admin/trr-api/shows/route";
import { GET as getShowByIdRoute } from "@/app/api/admin/trr-api/shows/[showId]/route";

describe("TRR show routes slug fields", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    searchShowsMock.mockReset();
    getShowByIdMock.mockReset();
    updateShowByIdMock.mockReset();
    requireAdminMock.mockResolvedValue(undefined);
  });

  it("returns canonical_slug in show search results", async () => {
    searchShowsMock.mockResolvedValue([
      {
        id: "7782652f-783a-488b-8860-41b97de32e75",
        name: "The Real Housewives of Salt Lake City",
        slug: "the-real-housewives-of-salt-lake-city",
        canonical_slug: "the-real-housewives-of-salt-lake-city",
      },
    ]);

    const request = new NextRequest("http://localhost/api/admin/trr-api/shows?q=Salt+Lake");
    const response = await getShowsRoute(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.shows[0]).toMatchObject({
      slug: "the-real-housewives-of-salt-lake-city",
      canonical_slug: "the-real-housewives-of-salt-lake-city",
    });
  });

  it("returns canonical_slug in single show response", async () => {
    getShowByIdMock.mockResolvedValue({
      id: "7782652f-783a-488b-8860-41b97de32e75",
      name: "The Real Housewives of Salt Lake City",
      slug: "the-real-housewives-of-salt-lake-city",
      canonical_slug: "the-real-housewives-of-salt-lake-city",
    });

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/7782652f-783a-488b-8860-41b97de32e75"
    );

    const response = await getShowByIdRoute(request, {
      params: Promise.resolve({ showId: "7782652f-783a-488b-8860-41b97de32e75" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.show).toMatchObject({
      slug: "the-real-housewives-of-salt-lake-city",
      canonical_slug: "the-real-housewives-of-salt-lake-city",
    });
  });
});
