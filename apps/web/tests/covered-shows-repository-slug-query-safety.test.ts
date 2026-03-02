import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock("@/lib/server/postgres", () => ({
  query: queryMock,
  withAuthTransaction: vi.fn(),
}));

import { getCoveredShows } from "@/lib/server/admin/covered-shows-repository";

describe("covered shows repository slug query safety", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue({ rows: [] });
  });

  it("uses computed_slug and non-ambiguous canonical slug SQL", async () => {
    await getCoveredShows();

    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("AS computed_slug");
    expect(sql).toContain("COALESCE(NULLIF(s.slug, ''), s.computed_slug)");
    expect(sql).not.toContain("AS slug,");
  });
});
