import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock("@/lib/server/postgres", () => ({
  query: queryMock,
}));

import { getEpisodeCreditsByPersonShowId } from "@/lib/server/trr-api/trr-shows-repository";

describe("getEpisodeCreditsByPersonShowId", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("maps rows and excludes archive footage by default", async () => {
    queryMock.mockResolvedValue({
      rows: [
        {
          credit_id: "credit-1",
          credit_category: "Self",
          role: "Host",
          billing_order: 1,
          source_type: "imdb",
          episode_id: "ep-1",
          season_number: 4,
          episode_number: 2,
          episode_name: "The Dinner",
          appearance_type: "appears",
        },
      ],
    });

    const result = await getEpisodeCreditsByPersonShowId(
      "person-1",
      "11111111-2222-3333-4444-555555555555"
    );

    expect(result).toEqual([
      {
        credit_id: "credit-1",
        credit_category: "Self",
        role: "Host",
        billing_order: 1,
        source_type: "imdb",
        episode_id: "ep-1",
        season_number: 4,
        episode_number: 2,
        episode_name: "The Dinner",
        appearance_type: "appears",
      },
    ]);

    const sql = String(queryMock.mock.calls[0]?.[0] ?? "");
    expect(sql).toContain("FROM core.v_episode_credits AS vec");
    expect(sql).toContain("COALESCE(vec.appearance_type, 'appears') <> 'archive_footage'");
    expect(queryMock.mock.calls[0]?.[1]).toEqual([
      "person-1",
      "11111111-2222-3333-4444-555555555555",
    ]);
  });

  it("can include archive footage when requested", async () => {
    queryMock.mockResolvedValue({ rows: [] });

    await getEpisodeCreditsByPersonShowId(
      "person-1",
      "11111111-2222-3333-4444-555555555555",
      { includeArchiveFootage: true }
    );

    const sql = String(queryMock.mock.calls[0]?.[0] ?? "");
    expect(sql).not.toContain("archive_footage");
  });
});
