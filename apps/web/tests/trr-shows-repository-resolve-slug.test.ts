import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock("@/lib/server/postgres", () => ({
  query: queryMock,
}));

import { resolveShowSlug } from "@/lib/server/trr-api/trr-shows-repository";

describe("resolveShowSlug", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("falls back from leading 'the-' to non-article slug when exact match is missing", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "11111111-2222-3333-4444-555555555555",
            name: "Real Housewives of Salt Lake City",
            slug: "real-housewives-of-salt-lake-city",
          },
        ],
      });

    const resolved = await resolveShowSlug("the-real-housewives-of-salt-lake-city");

    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(queryMock.mock.calls[0]?.[1]).toEqual(["the-real-housewives-of-salt-lake-city"]);
    expect(queryMock.mock.calls[1]?.[1]).toEqual(["real-housewives-of-salt-lake-city"]);
    expect(resolved).toMatchObject({
      show_id: "11111111-2222-3333-4444-555555555555",
      slug: "real-housewives-of-salt-lake-city",
      canonical_slug: "real-housewives-of-salt-lake-city",
      show_name: "Real Housewives of Salt Lake City",
    });
  });

  it("falls back from non-article slug to leading 'the-' slug when needed", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "99999999-aaaa-bbbb-cccc-dddddddddddd",
            name: "The Valley",
            slug: "the-valley",
          },
        ],
      });

    const resolved = await resolveShowSlug("valley");

    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(queryMock.mock.calls[0]?.[1]).toEqual(["valley"]);
    expect(queryMock.mock.calls[1]?.[1]).toEqual(["the-valley"]);
    expect(resolved).toMatchObject({
      show_id: "99999999-aaaa-bbbb-cccc-dddddddddddd",
      slug: "the-valley",
      canonical_slug: "the-valley",
      show_name: "The Valley",
    });
  });
});
