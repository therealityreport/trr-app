import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchAdminBackendJsonMock, queryMock } = vi.hoisted(() => ({
  fetchAdminBackendJsonMock: vi.fn(),
  queryMock: vi.fn(),
}));

vi.mock("@/lib/server/postgres", () => ({ query: queryMock }));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
  buildAdminBackendStatusError: ({ fallbackMessage }: { fallbackMessage: string }) =>
    new Error(fallbackMessage),
}));

import { getEpisodeCreditsByPersonShowId } from "@/lib/server/trr-api/trr-shows-repository";

const episodeCredit = {
  show_id: "11111111-2222-3333-4444-555555555555",
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
};

describe("getEpisodeCreditsByPersonShowId", () => {
  beforeEach(() => {
    fetchAdminBackendJsonMock.mockReset();
    queryMock.mockReset();
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { episode_credits: [episodeCredit] },
    });
  });

  it("maps rows and excludes archive footage by default", async () => {
    const result = await getEpisodeCreditsByPersonShowId(
      "person-1",
      "11111111-2222-3333-4444-555555555555",
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
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/people/person-1/episode-credits",
      expect.objectContaining({
        queryString:
          "show_id=11111111-2222-3333-4444-555555555555&include_archive_footage=false&limit=500&offset=0",
      }),
    );
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("can include archive footage when requested", async () => {
    await getEpisodeCreditsByPersonShowId(
      "person-1",
      "11111111-2222-3333-4444-555555555555",
      { includeArchiveFootage: true },
    );

    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/people/person-1/episode-credits",
      expect.objectContaining({ queryString: expect.stringContaining("include_archive_footage=true") }),
    );
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("continues bounded v2 pages so the legacy all-evidence helper is not truncated", async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) => ({
      ...episodeCredit,
      credit_id: `credit-${index}`,
      episode_id: `episode-${index}`,
    }));
    fetchAdminBackendJsonMock
      .mockResolvedValueOnce({
        status: 200,
        data: { episode_credits: firstPage, has_more: true },
      })
      .mockResolvedValueOnce({
        status: 200,
        data: {
          episode_credits: [
            { ...episodeCredit, credit_id: "credit-500", episode_id: "episode-500" },
          ],
          has_more: false,
        },
      });

    const result = await getEpisodeCreditsByPersonShowId(
      "person-1",
      "11111111-2222-3333-4444-555555555555",
    );

    expect(result).toHaveLength(501);
    expect(fetchAdminBackendJsonMock.mock.calls.map(([, options]) => options.queryString)).toEqual([
      "show_id=11111111-2222-3333-4444-555555555555&include_archive_footage=false&limit=500&offset=0",
      "show_id=11111111-2222-3333-4444-555555555555&include_archive_footage=false&limit=500&offset=500",
    ]);
  });
});
