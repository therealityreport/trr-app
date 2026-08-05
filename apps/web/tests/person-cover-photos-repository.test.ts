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
  getCoverPhoto,
  removeCoverPhoto,
  setCoverPhoto,
} from "@/lib/server/admin/person-cover-photos-repository";

const PERSON_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PHOTO_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const ADMIN_CONTEXT = {
  uid: "signed-admin",
  email: "admin@example.com",
  verifiedAt: 1_721_131_200_000,
};

const coverPhoto = () => ({
  person_id: PERSON_ID,
  photo_id: PHOTO_ID,
  photo_url: "https://cdn.example.com/person.jpg",
  created_at: "2026-07-15T12:00:00Z",
  updated_at: "2026-07-16T12:00:00Z",
  created_by_firebase_uid: "signed-admin",
});
describe("person cover-photo v2 repository", () => {
  beforeEach(() => {
    fetchAdminBackendJsonMock.mockReset();
    buildAdminBackendStatusErrorMock.mockReset();
    buildAdminBackendStatusErrorMock.mockImplementation(
      ({ fallbackMessage, status }: { fallbackMessage: string; status: number }) =>
        new MockAdminReadProxyError(fallbackMessage, status),
    );
  });

  it("uses signed v2 context and preserves the existing three-field read shape", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { coverPhoto: coverPhoto() },
    });

    const result = await getCoverPhoto(PERSON_ID, { adminContext: ADMIN_CONTEXT });

    expect(result).toEqual({
      person_id: PERSON_ID,
      photo_id: PHOTO_ID,
      photo_url: "https://cdn.example.com/person.jpg",
    });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      `/admin/people/${PERSON_ID}/cover-photos`,
      expect.objectContaining({
        apiVersion: "v2",
        adminContext: ADMIN_CONTEXT,
        routeName: "person-cover-photo",
      }),
    );
  });

  it("uses v1 only for the exact missing-v2-route response", async () => {
    fetchAdminBackendJsonMock
      .mockResolvedValueOnce({ status: 404, data: { detail: "Not Found" } })
      .mockResolvedValueOnce({
        status: 200,
        data: {
          coverPhoto: {
            person_id: PERSON_ID,
            photo_id: PHOTO_ID,
            photo_url: "https://cdn.example.com/person.jpg",
          },
        },
      });

    await expect(getCoverPhoto(PERSON_ID, { adminContext: ADMIN_CONTEXT })).resolves.toEqual({
      person_id: PERSON_ID,
      photo_id: PHOTO_ID,
      photo_url: "https://cdn.example.com/person.jpg",
    });
    expect(fetchAdminBackendJsonMock).toHaveBeenNthCalledWith(
      2,
      `/admin/people/${PERSON_ID}/cover-photo`,
      expect.objectContaining({
        apiVersion: "v1",
        adminContext: ADMIN_CONTEXT,
        routeName: "person-cover-photo-legacy",
      }),
    );
  });

  it("does not fall back for a structured v2 error", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 404,
      data: { detail: { code: "PERSON_NOT_FOUND", message: "Person not found" } },
    });

    await expect(getCoverPhoto(PERSON_ID, { adminContext: ADMIN_CONTEXT })).rejects.toMatchObject({
      status: 404,
    });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed v2 metadata instead of leaking response drift", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { coverPhoto: { ...coverPhoto(), updated_at: "yesterday" } },
    });

    await expect(getCoverPhoto(PERSON_ID, { adminContext: ADMIN_CONTEXT })).rejects.toMatchObject({
      status: 502,
      code: "INVALID_BACKEND_RESPONSE",
    });
  });

  it("writes with signed context and strictly validates the returned record", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { coverPhoto: coverPhoto() },
    });

    const result = await setCoverPhoto(ADMIN_CONTEXT, {
      person_id: PERSON_ID,
      photo_id: PHOTO_ID,
      photo_url: "https://cdn.example.com/person.jpg",
    });

    expect(result).toEqual(coverPhoto());
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      `/admin/people/${PERSON_ID}/cover-photos`,
      expect.objectContaining({
        apiVersion: "v2",
        adminContext: ADMIN_CONTEXT,
        method: "PUT",
        body: JSON.stringify({
          photo_id: PHOTO_ID,
          photo_url: "https://cdn.example.com/person.jpg",
        }),
      }),
    );
  });

  it("returns the backend deletion result without a local SQL fallback", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { success: true, removed: false },
    });

    await expect(removeCoverPhoto(ADMIN_CONTEXT, PERSON_ID)).resolves.toBe(false);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      `/admin/people/${PERSON_ID}/cover-photos`,
      expect.objectContaining({
        apiVersion: "v2",
        adminContext: ADMIN_CONTEXT,
        method: "DELETE",
      }),
    );
  });
});
