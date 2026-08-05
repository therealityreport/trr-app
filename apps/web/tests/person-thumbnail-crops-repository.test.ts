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
  updateCastPhotoThumbnailCrop,
  updateMediaLinkThumbnailCrop,
} from "@/lib/server/admin/person-thumbnail-crops-repository";

const PERSON_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PHOTO_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const ADMIN_CONTEXT = {
  uid: "signed-admin",
  email: "admin@example.com",
  verifiedAt: 1_721_131_200_000,
};

const resultPayload = (origin: "cast_photos" | "media_links") => ({
  origin,
  photo_id: PHOTO_ID,
  person_id: PERSON_ID,
  link_id: origin === "media_links" ? PHOTO_ID : null,
  thumbnail_focus_x: 44,
  thumbnail_focus_y: 26,
  thumbnail_zoom: 1.2,
  thumbnail_crop_mode: "manual",
});

describe("person thumbnail-crop v2 repository", () => {
  beforeEach(() => {
    fetchAdminBackendJsonMock.mockReset();
    buildAdminBackendStatusErrorMock.mockReset();
    buildAdminBackendStatusErrorMock.mockImplementation(
      ({ fallbackMessage, status }: { fallbackMessage: string; status: number }) =>
        new MockAdminReadProxyError(fallbackMessage, status),
    );
  });

  it("updates a cast photo through the signed v2 boundary", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: resultPayload("cast_photos"),
    });

    const result = await updateCastPhotoThumbnailCrop({
      personId: PERSON_ID,
      photoId: PHOTO_ID,
      crop: { x: 44, y: 26, zoom: 1.2, mode: "manual" },
      adminContext: ADMIN_CONTEXT,
    });

    expect(result).toEqual(resultPayload("cast_photos"));
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      `/admin/people/${PERSON_ID}/thumbnail-crops`,
      expect.objectContaining({
        apiVersion: "v2",
        adminContext: ADMIN_CONTEXT,
        method: "PUT",
        body: JSON.stringify({
          origin: "cast_photos",
          photo_id: PHOTO_ID,
          link_id: null,
          crop: { x: 44, y: 26, zoom: 1.2, mode: "manual" },
        }),
      }),
    );
  });

  it("updates a media link and preserves the null crop contract", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        origin: "media_links",
        photo_id: PHOTO_ID,
        person_id: PERSON_ID,
        link_id: PHOTO_ID,
        thumbnail_focus_x: null,
        thumbnail_focus_y: null,
        thumbnail_zoom: null,
        thumbnail_crop_mode: null,
      },
    });

    const result = await updateMediaLinkThumbnailCrop({
      personId: PERSON_ID,
      linkId: PHOTO_ID,
      crop: null,
      adminContext: ADMIN_CONTEXT,
    });

    expect(result?.thumbnail_crop_mode).toBeNull();
    expect(JSON.parse(fetchAdminBackendJsonMock.mock.calls[0][1].body)).toEqual({
      origin: "media_links",
      photo_id: PHOTO_ID,
      link_id: PHOTO_ID,
      crop: null,
    });
  });

  it("rejects response drift instead of accepting extra fields", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { ...resultPayload("cast_photos"), unexpected: true },
    });

    await expect(
      updateCastPhotoThumbnailCrop({
        personId: PERSON_ID,
        photoId: PHOTO_ID,
        crop: null,
        adminContext: ADMIN_CONTEXT,
      }),
    ).rejects.toMatchObject({
      status: 502,
      code: "INVALID_BACKEND_RESPONSE",
    });
  });

  it("preserves the missing-photo null contract and never falls back to app SQL", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 404,
      data: {
        detail: {
          code: "PERSON_THUMBNAIL_CROP_NOT_FOUND",
          message: "Photo not found.",
        },
      },
    });

    await expect(
      updateCastPhotoThumbnailCrop({
        personId: PERSON_ID,
        photoId: PHOTO_ID,
        crop: null,
        adminContext: ADMIN_CONTEXT,
      }),
    ).resolves.toBeNull();
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(1);
  });
});
