import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  fetchAdminBackendJsonMock,
  buildAdminBackendStatusErrorMock,
  MockAdminReadProxyError,
} = vi.hoisted(() => ({
  fetchAdminBackendJsonMock: vi.fn(),
  buildAdminBackendStatusErrorMock: vi.fn(),
  MockAdminReadProxyError: class AdminReadProxyError extends Error {
    status: number;
    code?: string;
    retryable?: boolean;

    constructor(
      message: string,
      status: number,
      options?: { code?: string; retryable?: boolean },
    ) {
      super(message);
      this.status = status;
      this.code = options?.code;
      this.retryable = options?.retryable;
    }
  },
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  AdminReadProxyError: MockAdminReadProxyError,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  buildAdminBackendStatusError: buildAdminBackendStatusErrorMock,
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
}));

import {
  listPersonExternalIds,
  listPrimaryPersonExternalIdsByPersonIds,
  listShowExternalIdsByIds,
} from "@/lib/server/trr-api/admin-external-id-reads";

const PERSON_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PERSON_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const ADMIN_CONTEXT = {
  uid: "signed-admin",
  email: "admin@example.com",
  verifiedAt: 1_717_800_000_000,
};

const externalIdRecord = () => ({
  id: 7,
  source_id: "imdb",
  external_id: "nm1234567",
  is_primary: true,
  valid_from: null,
  valid_to: null,
  observed_at: "2026-07-16T12:00:00+00:00",
  created_at: "2026-07-15T12:00:00+00:00",
  updated_at: "2026-07-16T12:00:00+00:00",
});

const sequentialUuid = (index: number): string =>
  `00000000-0000-0000-0000-${String(index).padStart(12, "0")}`;

describe("admin external-ID v2 reads", () => {
  beforeEach(() => {
    fetchAdminBackendJsonMock.mockReset();
    buildAdminBackendStatusErrorMock.mockReset();
    buildAdminBackendStatusErrorMock.mockImplementation(
      ({ fallbackMessage, status }: { fallbackMessage: string; status: number }) =>
        new MockAdminReadProxyError(fallbackMessage, status),
    );
  });

  it("uses signed v2 context for the single-person read and strictly parses records", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { person_id: PERSON_A, external_ids: [externalIdRecord()] },
    });

    const records = await listPersonExternalIds(PERSON_A, {
      includeInactive: true,
      adminContext: ADMIN_CONTEXT,
    });

    expect(records).toEqual([externalIdRecord()]);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      `/admin/people/${PERSON_A}/external-ids`,
      expect.objectContaining({
        apiVersion: "v2",
        adminContext: ADMIN_CONTEXT,
        queryString: "include_inactive=true",
        routeName: "person-external-ids",
      }),
    );
  });

  it("preserves empty entries for missing people while deduping the batch", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        people: [{ person_id: PERSON_B, external_ids: [externalIdRecord()] }],
      },
    });

    const recordsByPerson = await listPrimaryPersonExternalIdsByPersonIds(
      [PERSON_A, PERSON_B, PERSON_A],
      { includeInactive: false, adminContext: ADMIN_CONTEXT },
    );

    expect([...recordsByPerson.keys()]).toEqual([PERSON_A, PERSON_B]);
    expect(recordsByPerson.get(PERSON_A)).toEqual([]);
    expect(recordsByPerson.get(PERSON_B)).toEqual([externalIdRecord()]);
    expect(JSON.parse(fetchAdminBackendJsonMock.mock.calls[0][1].body)).toEqual({
      person_ids: [PERSON_A, PERSON_B],
      include_inactive: false,
    });
  });

  it("chunks show IDs at the backend limit without changing map order", async () => {
    const showIds = Array.from({ length: 201 }, (_, index) => sequentialUuid(index + 1));
    fetchAdminBackendJsonMock.mockImplementation(
      async (_path: string, options: { body: string }) => {
        const body = JSON.parse(options.body) as { show_ids: string[] };
        return {
          status: 200,
          data: {
            shows: body.show_ids.map((showId) => ({
              show_id: showId,
              external_ids: { imdb: `tt-${showId.slice(-4)}` },
            })),
          },
        };
      },
    );

    const externalIdsByShow = await listShowExternalIdsByIds(showIds, {
      adminContext: ADMIN_CONTEXT,
    });

    expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchAdminBackendJsonMock.mock.calls[0][1].body).show_ids).toHaveLength(200);
    expect(JSON.parse(fetchAdminBackendJsonMock.mock.calls[1][1].body).show_ids).toHaveLength(1);
    expect([...externalIdsByShow.keys()]).toEqual(showIds);
  });

  it("rejects response drift instead of passing malformed data to callers", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        person_id: PERSON_A,
        external_ids: [{ ...externalIdRecord(), unexpected: true }],
      },
    });

    await expect(listPersonExternalIds(PERSON_A)).rejects.toMatchObject({
      status: 502,
      code: "INVALID_BACKEND_RESPONSE",
    });
  });

  it("rejects mismatched identities and batch ordering drift", async () => {
    fetchAdminBackendJsonMock.mockResolvedValueOnce({
      status: 200,
      data: { person_id: PERSON_B, external_ids: [] },
    });
    await expect(listPersonExternalIds(PERSON_A)).rejects.toMatchObject({
      status: 502,
      code: "INVALID_BACKEND_RESPONSE",
    });

    fetchAdminBackendJsonMock.mockResolvedValueOnce({
      status: 200,
      data: {
        people: [
          { person_id: PERSON_B, external_ids: [] },
          { person_id: PERSON_A, external_ids: [] },
        ],
      },
    });
    await expect(
      listPrimaryPersonExternalIdsByPersonIds([PERSON_A, PERSON_B]),
    ).rejects.toMatchObject({
      status: 502,
      code: "INVALID_BACKEND_RESPONSE",
    });
  });
});
