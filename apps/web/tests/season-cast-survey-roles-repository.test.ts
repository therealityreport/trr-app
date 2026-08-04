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
  deleteSeasonCastSurveyRole,
  listSeasonCastSurveyRoles,
  replaceSeasonCastSurveyRoles,
  upsertSeasonCastSurveyRole,
} from "@/lib/server/admin/season-cast-survey-roles-repository";

const SHOW_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PERSON_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const ROLE_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const PATH = `/admin/shows/${SHOW_ID}/seasons/3/cast-survey-roles`;
const ADMIN_CONTEXT = {
  uid: "signed-admin",
  email: "admin@example.com",
  verifiedAt: 1_721_131_200_000,
};

const roleRow = () => ({
  id: ROLE_ID,
  trr_show_id: SHOW_ID,
  season_number: 3,
  person_id: PERSON_ID,
  role: "main" as const,
  created_at: "2026-07-15T12:00:00Z",
  updated_at: "2026-07-16T12:00:00Z",
});

describe("season cast survey-role v2 repository", () => {
  beforeEach(() => {
    fetchAdminBackendJsonMock.mockReset();
    buildAdminBackendStatusErrorMock.mockReset();
    buildAdminBackendStatusErrorMock.mockImplementation(
      ({ fallbackMessage, status }: { fallbackMessage: string; status: number }) =>
        new MockAdminReadProxyError(fallbackMessage, status),
    );
  });

  it("lists through the signed v2 boundary with no SQL fallback", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({ status: 200, data: { roles: [roleRow()] } });

    await expect(
      listSeasonCastSurveyRoles(SHOW_ID, 3, { adminContext: ADMIN_CONTEXT }),
    ).resolves.toEqual([roleRow()]);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(PATH, {
      apiVersion: "v2",
      adminContext: ADMIN_CONTEXT,
      timeoutMs: 5_000,
      routeName: "season-cast-survey-roles",
    });
  });

  it("upserts with exact input and response identity", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({ status: 200, data: { role: roleRow() } });

    await expect(
      upsertSeasonCastSurveyRole(ADMIN_CONTEXT, {
        trrShowId: SHOW_ID,
        seasonNumber: 3,
        personId: PERSON_ID,
        role: "main",
      }),
    ).resolves.toEqual(roleRow());
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      PATH,
      expect.objectContaining({
        apiVersion: "v2",
        adminContext: ADMIN_CONTEXT,
        method: "POST",
        body: JSON.stringify({ person_id: PERSON_ID, role: "main" }),
      }),
    );
  });

  it("replaces and deletes without a write fallback", async () => {
    fetchAdminBackendJsonMock
      .mockResolvedValueOnce({ status: 200, data: { roles: [roleRow()] } })
      .mockResolvedValueOnce({ status: 200, data: { success: true, removed: false } });

    await expect(
      replaceSeasonCastSurveyRoles(ADMIN_CONTEXT, SHOW_ID, 3, [
        { personId: PERSON_ID, role: "main" },
      ]),
    ).resolves.toEqual([roleRow()]);
    await expect(
      deleteSeasonCastSurveyRole(ADMIN_CONTEXT, {
        trrShowId: SHOW_ID,
        seasonNumber: 3,
        personId: PERSON_ID,
      }),
    ).resolves.toBe(false);
    expect(fetchAdminBackendJsonMock).toHaveBeenNthCalledWith(
      1,
      PATH,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ roles: [{ person_id: PERSON_ID, role: "main" }] }),
      }),
    );
    expect(fetchAdminBackendJsonMock).toHaveBeenNthCalledWith(
      2,
      PATH,
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ person_id: PERSON_ID }),
      }),
    );
  });

  it("rejects extra fields, wrong scope, and invalid timestamps", async () => {
    for (const row of [
      { ...roleRow(), extra: true },
      { ...roleRow(), trr_show_id: "dddddddd-dddd-dddd-dddd-dddddddddddd" },
      { ...roleRow(), updated_at: "yesterday" },
    ]) {
      fetchAdminBackendJsonMock.mockResolvedValueOnce({ status: 200, data: { roles: [row] } });
      await expect(
        listSeasonCastSurveyRoles(SHOW_ID, 3, { adminContext: ADMIN_CONTEXT }),
      ).rejects.toMatchObject({ status: 502, code: "INVALID_BACKEND_RESPONSE" });
    }
  });

  it("does not retry or fall back for a structured backend error", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 503,
      data: { detail: { code: "DATABASE_SERVICE_UNAVAILABLE" } },
    });

    await expect(
      listSeasonCastSurveyRoles(SHOW_ID, 3, { adminContext: ADMIN_CONTEXT }),
    ).rejects.toMatchObject({ status: 503 });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(1);
  });
});
