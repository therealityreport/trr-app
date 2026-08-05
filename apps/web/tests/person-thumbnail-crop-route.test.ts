import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { captureExpectedConsoleError } from "./helpers/expected-console";

const {
  requireAdminMock,
  toVerifiedAdminContextMock,
  invalidateAdminBackendCacheMock,
  invalidateRouteResponseCacheMock,
  updateCastPhotoThumbnailCropMock,
  updateMediaLinkThumbnailCropMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  toVerifiedAdminContextMock: vi.fn(),
  invalidateAdminBackendCacheMock: vi.fn(),
  invalidateRouteResponseCacheMock: vi.fn(),
  updateCastPhotoThumbnailCropMock: vi.fn(),
  updateMediaLinkThumbnailCropMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
  toVerifiedAdminContext: toVerifiedAdminContextMock,
}));

vi.mock("@/lib/server/admin/person-thumbnail-crops-repository", () => ({
  updateCastPhotoThumbnailCrop: updateCastPhotoThumbnailCropMock,
  updateMediaLinkThumbnailCrop: updateMediaLinkThumbnailCropMock,
}));

vi.mock("@/lib/server/admin/route-response-cache", () => ({
  buildEntityScopedRouteCacheNamespace: (namespace: string, entityId: string) =>
    `${namespace}:${entityId}`,
  invalidateRouteResponseCache: invalidateRouteResponseCacheMock,
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  invalidateAdminBackendCache: invalidateAdminBackendCacheMock,
  buildAdminProxyErrorResponse: (error: unknown) => {
    const message = error instanceof Error ? error.message : "failed";
    return Response.json(
      { error: message },
      { status: message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500 },
    );
  },
}));

import { PUT } from "@/app/api/admin/trr-api/people/[personId]/photos/[photoId]/thumbnail-crop/route";

const ADMIN_CONTEXT = {
  uid: "admin-user",
  email: "admin@example.com",
  verifiedAt: 1_721_131_200_000,
};

const makeRequest = (body: Record<string, unknown>) =>
  new NextRequest("http://localhost/api/admin/trr-api/people/person-1/photos/photo-1/thumbnail-crop", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("person thumbnail crop route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    toVerifiedAdminContextMock.mockReset();
    invalidateAdminBackendCacheMock.mockReset();
    invalidateRouteResponseCacheMock.mockReset();
    updateCastPhotoThumbnailCropMock.mockReset();
    updateMediaLinkThumbnailCropMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user", email: "admin@example.com" });
    toVerifiedAdminContextMock.mockReturnValue(ADMIN_CONTEXT);
    invalidateAdminBackendCacheMock.mockResolvedValue(undefined);
  });

  it("updates cast photo thumbnail crop", async () => {
    updateCastPhotoThumbnailCropMock.mockResolvedValue({
      origin: "cast_photos",
      photo_id: "photo-1",
      person_id: "person-1",
      link_id: null,
      thumbnail_focus_x: 44,
      thumbnail_focus_y: 26,
      thumbnail_zoom: 1.2,
      thumbnail_crop_mode: "manual",
    });

    const response = await PUT(
      makeRequest({
        origin: "cast_photos",
        crop: { x: 44, y: 26, zoom: 1.2, mode: "manual" },
      }),
      { params: Promise.resolve({ personId: "person-1", photoId: "photo-1" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(updateCastPhotoThumbnailCropMock).toHaveBeenCalledWith({
      personId: "person-1",
      photoId: "photo-1",
      crop: { x: 44, y: 26, zoom: 1.2, mode: "manual" },
      adminContext: ADMIN_CONTEXT,
    });
    expect(invalidateAdminBackendCacheMock).toHaveBeenCalledWith(
      "/admin/people/person-1/cache/invalidate",
      { routeName: "person-gallery" },
    );
    expect(invalidateRouteResponseCacheMock).toHaveBeenCalledWith(
      "admin-person-photos:person-1",
    );
    expect(payload.thumbnail_crop_mode).toBe("manual");
    expect(payload.thumbnail_focus_x).toBe(44);
  });

  it("updates media-link thumbnail crop using the route photoId as fallback link id", async () => {
    updateMediaLinkThumbnailCropMock.mockResolvedValue({
      origin: "media_links",
      photo_id: "photo-1",
      person_id: "person-1",
      link_id: "photo-1",
      thumbnail_focus_x: null,
      thumbnail_focus_y: null,
      thumbnail_zoom: null,
      thumbnail_crop_mode: null,
    });

    const response = await PUT(
      makeRequest({
        origin: "media_links",
        crop: null,
      }),
      { params: Promise.resolve({ personId: "person-1", photoId: "photo-1" }) },
    );

    expect(response.status).toBe(200);
    expect(updateMediaLinkThumbnailCropMock).toHaveBeenCalledWith({
      personId: "person-1",
      linkId: "photo-1",
      crop: null,
      adminContext: ADMIN_CONTEXT,
    });
    expect(invalidateAdminBackendCacheMock).toHaveBeenCalledWith(
      "/admin/people/person-1/cache/invalidate",
      { routeName: "person-gallery" },
    );
    expect(invalidateRouteResponseCacheMock).toHaveBeenCalledWith(
      "admin-person-photos:person-1",
    );
  });

  it("rejects out-of-range crop values", async () => {
    const response = await PUT(
      makeRequest({
        origin: "cast_photos",
        crop: { x: 101, y: 20, zoom: 1.1, mode: "manual" },
      }),
      { params: Promise.resolve({ personId: "person-1", photoId: "photo-1" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("Invalid payload");
    expect(updateCastPhotoThumbnailCropMock).not.toHaveBeenCalled();
  });

  it("maps auth failures to 401", async () => {
    const expectedError = captureExpectedConsoleError(/^\[api\] Failed to update thumbnail crop .*unauthorized/);
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));

    const response = await PUT(
      makeRequest({
        origin: "cast_photos",
        crop: null,
      }),
      { params: Promise.resolve({ personId: "person-1", photoId: "photo-1" }) },
    );

    expect(response.status).toBe(401);
    expectedError.expectCalled();
  });
});
