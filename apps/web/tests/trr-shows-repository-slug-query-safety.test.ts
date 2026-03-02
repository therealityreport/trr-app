import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock("@/lib/server/postgres", () => ({
  query: queryMock,
}));

import {
  getShowById,
  getShowByImdbId,
  searchShows,
} from "@/lib/server/trr-api/trr-shows-repository";

describe("trr shows repository slug query safety", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue({ rows: [] });
  });

  it("uses computed_slug and non-ambiguous canonical slug SQL in show lookup queries", async () => {
    await searchShows("salt lake city", { limit: 5, offset: 0 });
    await getShowById("00000000-0000-0000-0000-000000000001");
    await getShowByImdbId("tt1234567");

    expect(queryMock).toHaveBeenCalledTimes(3);
    for (const [sql] of queryMock.mock.calls as Array<[string, unknown[]]>) {
      expect(sql).toContain("AS computed_slug");
      expect(sql).toContain("COALESCE(NULLIF(s.slug, ''), s.computed_slug)");
      expect(sql).not.toContain("AS slug,");
    }
  });
});
