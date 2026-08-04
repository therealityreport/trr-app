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
  },
];

describe("getCreditsForPersonShowScope", () => {
  beforeEach(() => {
    fetchAdminBackendJsonMock.mockReset();
    queryMock.mockReset();
  });

  it("iterates v2 pages and returns the full show-scope dataset", async () => {
    fetchAdminBackendJsonMock
      .mockResolvedValueOnce({ status: 200, data: { credits: baseCredits.slice(0, 2) } })
      .mockResolvedValueOnce({ status: 200, data: { credits: baseCredits.slice(2) } });

    const result = await getCreditsForPersonShowScope(personId, showId, {
      pageSize: 2,
      maxPages: 5,
    });

    expect(result.map((credit) => credit.id)).toEqual(["credit-1", "credit-2", "credit-3"]);
    expect(fetchAdminBackendJsonMock.mock.calls.map(([, options]) => options.queryString)).toEqual([
      "limit=2&offset=0",
      "limit=2&offset=2",
    ]);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("deduplicates repeated credit ids across bounded v2 pages", async () => {
    fetchAdminBackendJsonMock
      .mockResolvedValueOnce({ status: 200, data: { credits: [baseCredits[0]] } })
      .mockResolvedValueOnce({ status: 200, data: { credits: [baseCredits[0]] } })
      .mockResolvedValueOnce({ status: 200, data: { credits: [baseCredits[1]] } })
      .mockResolvedValueOnce({ status: 200, data: { credits: [baseCredits[1]] } });

    const result = await getCreditsForPersonShowScope(personId, showId, {
      pageSize: 1,
      maxPages: 4,
    });

    expect(result.map((credit) => credit.id)).toEqual(["credit-1", "credit-2"]);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(4);
    expect(queryMock).not.toHaveBeenCalled();
  });
});
