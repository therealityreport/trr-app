import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { AdminReadProxyError } from "@/lib/server/trr-api/admin-read-proxy";

const {
  requireAdminMock,
  getImageMock,
  deleteImageMock,
  archiveImageMock,
  unarchiveImageMock,
  reassignImageMock,
  createMediaLinkMock,
  getAllLinksForAssetMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getImageMock: vi.fn(),
  deleteImageMock: vi.fn(),
  archiveImageMock: vi.fn(),
  unarchiveImageMock: vi.fn(),
  reassignImageMock: vi.fn(),
  createMediaLinkMock: vi.fn(),
  getAllLinksForAssetMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
  toVerifiedAdminContext: (user: { uid: string; email?: string }) => ({
    uid: user.uid,
    email: user.email ?? null,
    verifiedAt: 42,
  }),
}));

vi.mock("@/lib/server/admin/images-repository", () => ({
  getImage: getImageMock,
  deleteImage: deleteImageMock,
  archiveImage: archiveImageMock,
  unarchiveImage: unarchiveImageMock,
  reassignImage: reassignImageMock,
}));

vi.mock("@/lib/server/trr-api/media-links-repository", () => ({
  createMediaLink: createMediaLinkMock,
  getAllLinksForAsset: getAllLinksForAssetMock,
}));

import {
  DELETE as deleteImageRoute,
  GET as getImageRoute,
} from "@/app/api/admin/images/[imageType]/[imageId]/route";
import { PUT as archiveImageRoute } from "@/app/api/admin/images/[imageType]/[imageId]/archive/route";
import { PUT as reassignImageRoute } from "@/app/api/admin/images/[imageType]/[imageId]/reassign/route";
import {
  GET as getMediaLinksRoute,
  POST as createMediaLinkRoute,
} from "@/app/api/admin/trr-api/media-links/route";

const IMAGE_ID = "22222222-2222-4222-8222-222222222222";
const ASSET_ID = "33333333-3333-4333-8333-333333333333";
const SHOW_ID = "11111111-1111-4111-8111-111111111111";
const adminContext = {
  uid: "admin-user",
  email: "admin@example.test",
  verifiedAt: 42,
};
const imageParams = {
  params: Promise.resolve({ imageType: "cast", imageId: IMAGE_ID }),
};

describe("Packet 2D image and media-link routes", () => {
  beforeEach(() => {
    for (const mock of [
      requireAdminMock,
      getImageMock,
      deleteImageMock,
      archiveImageMock,
      unarchiveImageMock,
      reassignImageMock,
      createMediaLinkMock,
      getAllLinksForAssetMock,
    ]) {
      mock.mockReset();
    }
    requireAdminMock.mockResolvedValue({ uid: "admin-user", email: "admin@example.test" });
  });

  it("preserves image payloads while forwarding verified admin context", async () => {
    const image = { id: IMAGE_ID, hosted_url: "https://cdn.example.test/image.webp" };
    getImageMock.mockResolvedValue(image);

    const getResponse = await getImageRoute(
      new NextRequest(`http://localhost/api/admin/images/cast/${IMAGE_ID}`),
      imageParams,
    );
    const archiveResponse = await archiveImageRoute(
      new NextRequest(`http://localhost/api/admin/images/cast/${IMAGE_ID}/archive`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ archive: true, reason: "duplicate" }),
      }),
      imageParams,
    );
    const reassignResponse = await reassignImageRoute(
      new NextRequest(`http://localhost/api/admin/images/cast/${IMAGE_ID}/reassign`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ toEntityId: SHOW_ID, toType: "season", mode: "copy" }),
      }),
      imageParams,
    );
    const deleteResponse = await deleteImageRoute(
      new NextRequest(`http://localhost/api/admin/images/cast/${IMAGE_ID}`, {
        method: "DELETE",
      }),
      imageParams,
    );

    await expect(getResponse.json()).resolves.toEqual({ image });
    await expect(archiveResponse.json()).resolves.toEqual({ success: true });
    await expect(reassignResponse.json()).resolves.toEqual({ success: true });
    await expect(deleteResponse.json()).resolves.toEqual({ success: true });
    expect(getImageMock).toHaveBeenCalledWith("cast", IMAGE_ID, { adminContext });
    expect(archiveImageMock).toHaveBeenCalledWith({
      imageType: "cast",
      imageId: IMAGE_ID,
      adminContext,
      reason: "duplicate",
    });
    expect(reassignImageMock).toHaveBeenCalledWith({
      imageType: "cast",
      imageId: IMAGE_ID,
      toType: "season",
      toEntityId: SHOW_ID,
      mode: "copy",
      adminContext,
    });
    expect(deleteImageMock).toHaveBeenCalledWith({
      imageType: "cast",
      imageId: IMAGE_ID,
      adminContext,
    });
  });

  it("preserves media-link POST and GET payloads without an app SQL preflight", async () => {
    const link = {
      id: "44444444-4444-4444-8444-444444444444",
      media_asset_id: ASSET_ID,
      entity_type: "show",
      entity_id: SHOW_ID,
      kind: "gallery",
    };
    createMediaLinkMock.mockResolvedValue({
      link,
      already_exists: false,
      message: "Link created successfully",
    });
    getAllLinksForAssetMock.mockResolvedValue([link]);

    const postResponse = await createMediaLinkRoute(
      new NextRequest("http://localhost/api/admin/trr-api/media-links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          media_asset_id: ASSET_ID,
          entity_type: "show",
          entity_id: SHOW_ID,
        }),
      }),
    );
    const getResponse = await getMediaLinksRoute(
      new NextRequest(
        `http://localhost/api/admin/trr-api/media-links?media_asset_id=${ASSET_ID}`,
      ),
    );

    await expect(postResponse.json()).resolves.toEqual({
      link,
      already_exists: false,
      message: "Link created successfully",
    });
    await expect(getResponse.json()).resolves.toEqual({ links: [link] });
    expect(createMediaLinkMock).toHaveBeenCalledWith(
      {
        media_asset_id: ASSET_ID,
        entity_type: "show",
        entity_id: SHOW_ID,
        kind: "gallery",
        context: {},
      },
      { adminContext },
    );
    expect(getAllLinksForAssetMock).toHaveBeenCalledWith(ASSET_ID, { adminContext });
  });

  it("maps typed retryable image proxy errors", async () => {
    getImageMock.mockRejectedValue(
      new AdminReadProxyError("Backend unavailable", 503, {
        code: "BACKEND_UNAVAILABLE",
        retryable: true,
      }),
    );

    const response = await getImageRoute(
      new NextRequest(`http://localhost/api/admin/images/cast/${IMAGE_ID}`),
      imageParams,
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: "Backend unavailable",
      code: "BACKEND_UNAVAILABLE",
      retryable: true,
    });
  });
});
