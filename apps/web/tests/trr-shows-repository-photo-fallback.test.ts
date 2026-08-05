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

import { getCastByShowId } from "@/lib/server/trr-api/trr-shows-repository";

const castMember = {
  id: "cast-1",
  show_id: "show-1",
  person_id: "person-1",
  show_name: "Test Show",
  cast_member_name: "Person One",
  role: "Self",
  billing_order: 1,
  credit_category: "cast",
  source_type: "imdb_show_membership",
  full_name: "Person One",
  known_for: null,
  photo_url: "https://cdn.example.com/person-one.jpg",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("trr shows repository cast photo fallback mode", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    fetchAdminBackendJsonMock.mockReset();
    queryMock.mockReset();
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { cast: [castMember] },
    });
  });

  it("delegates none mode without running an app-side profile fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await getCastByShowId("show-1", {
      limit: 10,
      offset: 0,
      photoFallbackMode: "none",
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject(castMember);

    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/shows/show-1/cast",
      expect.objectContaining({
        queryString:
          "view=membership&include_photos=true&photo_fallback=none&limit=10&offset=0",
      }),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("delegates Bravo mode to the bounded backend fallback", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await getCastByShowId("show-1", {
      limit: 10,
      offset: 0,
      photoFallbackMode: "bravo",
    });

    expect(result[0]?.photo_url).toBe("https://cdn.example.com/person-one.jpg");
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/shows/show-1/cast",
      expect.objectContaining({
        queryString:
          "view=membership&include_photos=true&photo_fallback=bravo&limit=10&offset=0",
      }),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(queryMock).not.toHaveBeenCalled();
  });
});
