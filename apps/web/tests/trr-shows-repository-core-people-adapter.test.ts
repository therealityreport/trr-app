import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchAdminBackendJsonMock, MockAdminReadProxyError } = vi.hoisted(() => ({
  fetchAdminBackendJsonMock: vi.fn(),
  MockAdminReadProxyError: class AdminReadProxyError extends Error {
    status: number;
    code?: string;

    constructor(message: string, status: number, options?: { code?: string }) {
      super(message);
      this.status = status;
      this.code = options?.code;
    }
  },
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  AdminReadProxyError: MockAdminReadProxyError,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
  buildAdminBackendStatusError: ({ fallbackMessage }: { fallbackMessage: string }) =>
    new Error(fallbackMessage),
}));

import {
  getPersonById,
  searchPeople,
} from "@/lib/server/trr-api/trr-shows-repository";

const adminContext = {
  uid: "admin-user",
  email: "admin@example.com",
  verifiedAt: 1_789_000_000_000,
};

const person = {
  id: "11111111-1111-4111-8111-111111111111",
  full_name: "Alex Example",
  known_for: "Example Show",
  external_ids: { imdb_id: "nm0000001" },
  birthday: null,
  gender: { fandom: "female" },
  biography: null,
  place_of_birth: null,
  homepage: null,
  profile_image_url: null,
  alternative_names: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
};

describe("TRR show repository core people adapters", () => {
  beforeEach(() => {
    fetchAdminBackendJsonMock.mockReset();
  });

  it("reads one person through the strict admin v2 contract", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { person },
    });

    await expect(
      getPersonById(person.id, { adminContext }),
    ).resolves.toEqual(person);

    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      `/admin/people/${person.id}`,
      {
        adminContext,
        apiVersion: "v2",
        timeoutMs: 5_000,
        routeName: "admin-core-person-detail",
        requestRole: "secondary",
      },
    );
  });

  it("preserves the null detail result on a backend 404", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({ status: 404, data: {} });

    await expect(getPersonById(person.id)).resolves.toBeNull();
  });

  it("rejects malformed core-person rows instead of coercing required fields", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { person: { ...person, id: 42 } },
    });

    await expect(getPersonById(person.id)).rejects.toMatchObject({
      status: 502,
      code: "INVALID_BACKEND_RESPONSE",
    });
  });

  it("searches people with bounded pagination and verified admin context", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        people: [person],
        limit: 20,
        offset: 3,
        count: 1,
        total_count: 1,
        has_more: false,
      },
    });

    await expect(
      searchPeople("Alex", { limit: 20, offset: 3, adminContext }),
    ).resolves.toEqual([person]);

    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith("/admin/people", {
      adminContext,
      apiVersion: "v2",
      timeoutMs: 5_000,
      routeName: "admin-core-people-search",
      requestRole: "secondary",
      queryString: "q=Alex&limit=20&offset=3",
    });
  });
});
