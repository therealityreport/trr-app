import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock("@/lib/server/postgres", () => ({
  query: queryMock,
}));

import { getCoveredShows } from "@/lib/server/admin/covered-shows-repository";

describe("covered shows repository slug query safety", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("disambiguates colliding computed slugs with the show id prefix", async () => {
    queryMock.mockResolvedValue({
      rows: [
        {
          id: "covered-1",
          trr_show_id: "show-1",
          show_name: "Vanderpump Rules",
          created_at: "2026-03-13T00:00:00Z",
          created_by_firebase_uid: "user-1",
          core_show_name: "Vanderpump Rules",
          slug: null,
          alternative_names: null,
          show_total_episodes: 10,
          poster_url: null,
        },
        {
          id: "covered-2",
          trr_show_id: "show-2",
          show_name: "Vanderpump Rules",
          created_at: "2026-03-13T00:00:00Z",
          created_by_firebase_uid: "user-1",
          core_show_name: "Vanderpump Rules",
          slug: null,
          alternative_names: null,
          show_total_episodes: 12,
          poster_url: null,
        },
      ],
    });

    const shows = await getCoveredShows();

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(shows).toHaveLength(2);
    expect(shows.map((show) => show.canonical_slug)).toEqual([
      "vanderpump-rules--show-1",
      "vanderpump-rules--show-2",
    ]);
  });
});
