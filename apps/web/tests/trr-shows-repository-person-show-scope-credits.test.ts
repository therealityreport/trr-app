import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock("@/lib/server/postgres", () => ({
  query: queryMock,
}));

import { getCreditsForPersonShowScope } from "@/lib/server/trr-api/trr-shows-repository";

const personId = "person-1";
const showId = "show-1";

const baseCredits = [
  {
    id: "credit-1",
    show_id: "show-1",
    person_id: personId,
    show_name: "Show One",
    role: "Host",
    billing_order: 1,
    credit_category: "Self",
    source_type: "imdb",
    show_imdb_id: null,
  },
  {
    id: "credit-2",
    show_id: "show-1",
    person_id: personId,
    show_name: "Show One",
    role: "Executive Producer",
    billing_order: 2,
    credit_category: "Producer",
    source_type: "imdb",
    show_imdb_id: null,
  },
  {
    id: "credit-3",
    show_id: "show-2",
    person_id: personId,
    show_name: "Show Two",
    role: "Self",
    billing_order: 3,
    credit_category: "Self",
    source_type: "imdb",
    show_imdb_id: null,
  },
];

describe("getCreditsForPersonShowScope", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("iterates pages and returns full show-scope credits", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: baseCredits })
      .mockResolvedValueOnce({ rows: [{ imdb_person_id: null }] })
      .mockResolvedValueOnce({ rows: baseCredits })
      .mockResolvedValueOnce({ rows: [{ imdb_person_id: null }] });

    const result = await getCreditsForPersonShowScope(personId, showId, {
      pageSize: 2,
      maxPages: 5,
    });

    expect(result.map((credit) => credit.id)).toEqual(["credit-1", "credit-2", "credit-3"]);
    expect(queryMock).toHaveBeenCalledTimes(4);
  });

  it("deduplicates repeated credit ids across pages", async () => {
    const duplicateCredits = [
      baseCredits[0],
      baseCredits[0],
      baseCredits[1],
    ];

    queryMock
      .mockResolvedValueOnce({ rows: duplicateCredits })
      .mockResolvedValueOnce({ rows: [{ imdb_person_id: null }] })
      .mockResolvedValueOnce({ rows: duplicateCredits })
      .mockResolvedValueOnce({ rows: [{ imdb_person_id: null }] })
      .mockResolvedValueOnce({ rows: duplicateCredits })
      .mockResolvedValueOnce({ rows: [{ imdb_person_id: null }] })
      .mockResolvedValueOnce({ rows: duplicateCredits })
      .mockResolvedValueOnce({ rows: [{ imdb_person_id: null }] });

    const result = await getCreditsForPersonShowScope(personId, showId, {
      pageSize: 1,
      maxPages: 4,
    });

    expect(result.map((credit) => credit.id)).toEqual(["credit-1", "credit-2"]);
  });
});
