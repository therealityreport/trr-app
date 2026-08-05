import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchAdminBackendJsonMock, MockAdminReadProxyError } = vi.hoisted(() => {
  class TestAdminReadProxyError extends Error {
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
  }
  return {
    fetchAdminBackendJsonMock: vi.fn(),
    MockAdminReadProxyError: TestAdminReadProxyError,
  };
});

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  AdminReadProxyError: MockAdminReadProxyError,
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
  buildAdminBackendStatusError: ({
    status,
    fallbackMessage,
  }: {
    status: number;
    fallbackMessage: string;
  }) => new MockAdminReadProxyError(fallbackMessage, status, { retryable: status >= 500 }),
}));

import {
  archiveImage,
  deleteImage,
  getImage,
  reassignImage,
  unarchiveImage,
} from "@/lib/server/admin/images-repository";
import {
  createMediaLink,
  getAllLinksForAsset,
  updateMediaLinkContextById,
} from "@/lib/server/trr-api/media-links-repository";
import { getAssetsByShowSeason } from "@/lib/server/trr-api/trr-shows-repository";

const adminContext = {
  uid: "admin-user",
  email: "admin@example.test",
  verifiedAt: 42,
};
const SHOW_ID = "11111111-1111-4111-8111-111111111111";
const IMAGE_ID = "22222222-2222-4222-8222-222222222222";
const ASSET_ID = "33333333-3333-4333-8333-333333333333";
const LINK_ID = "44444444-4444-4444-8444-444444444444";

describe("Packet 2D admin adapters", () => {
  beforeEach(() => {
    fetchAdminBackendJsonMock.mockReset();
  });

  it("loads season assets through bounded strict v2 pagination", async () => {
    const asset = {
      id: IMAGE_ID,
      type: "season",
      source: "fandom",
      kind: "poster",
      hosted_url: "https://cdn.example.test/poster.webp",
      width: 1200,
      height: 1800,
      caption: null,
    };
    fetchAdminBackendJsonMock.mockResolvedValue({ status: 200, data: { assets: [asset] } });

    await expect(
      getAssetsByShowSeason(SHOW_ID, 3, {
        limit: 5_000,
        sources: ["Fandom", "bravo"],
        full: true,
        adminContext,
      }),
    ).resolves.toEqual([asset]);

    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      `/admin/shows/${SHOW_ID}/seasons/3/assets`,
      expect.objectContaining({
        adminContext,
        apiVersion: "v2",
        requestRole: "primary",
        queryString: "limit=500&offset=0&sources=fandom%2Cbravo&full=true",
      }),
    );
  });

  it("proxies every image operation without a raw admin UID", async () => {
    const image = { id: IMAGE_ID, hosted_url: "https://cdn.example.test/image.webp" };
    fetchAdminBackendJsonMock
      .mockResolvedValueOnce({ status: 200, data: { image } })
      .mockResolvedValue({ status: 200, data: { success: true } });

    await expect(getImage("cast", IMAGE_ID, { adminContext })).resolves.toEqual(image);
    await archiveImage({ imageType: "cast", imageId: IMAGE_ID, adminContext, reason: "duplicate" });
    await unarchiveImage({ imageType: "cast", imageId: IMAGE_ID, adminContext });
    await reassignImage({
      imageType: "cast",
      imageId: IMAGE_ID,
      toType: "season",
      toEntityId: SHOW_ID,
      mode: "copy",
      adminContext,
    });
    await deleteImage({ imageType: "cast", imageId: IMAGE_ID, adminContext });

    expect(fetchAdminBackendJsonMock).toHaveBeenNthCalledWith(
      2,
      `/admin/images/cast/${IMAGE_ID}/archive`,
      expect.objectContaining({
        adminContext,
        apiVersion: "v2",
        method: "PUT",
        body: JSON.stringify({ archive: true, reason: "duplicate" }),
      }),
    );
    expect(fetchAdminBackendJsonMock).toHaveBeenNthCalledWith(
      4,
      `/admin/images/cast/${IMAGE_ID}/reassign`,
      expect.objectContaining({
        adminContext,
        body: JSON.stringify({
          to_entity_id: SHOW_ID,
          to_type: "season",
          mode: "copy",
        }),
      }),
    );
    expect(fetchAdminBackendJsonMock).toHaveBeenNthCalledWith(
      5,
      `/admin/images/cast/${IMAGE_ID}`,
      expect.objectContaining({ adminContext, method: "DELETE" }),
    );
  });

  it("proxies media-link create, list, and context patch contracts", async () => {
    const link = {
      id: LINK_ID,
      entity_type: "show",
      entity_id: SHOW_ID,
      media_asset_id: ASSET_ID,
      kind: "gallery",
      position: null,
      context: {},
      created_at: "2026-07-16T00:00:00Z",
    };
    const contextResponse = {
      link_id: LINK_ID,
      people_count: 2,
      people_count_source: "manual",
      thumbnail_crop: null,
    };
    fetchAdminBackendJsonMock
      .mockResolvedValueOnce({
        status: 200,
        data: { link, already_exists: false, message: "Link created successfully" },
      })
      .mockResolvedValueOnce({ status: 200, data: { links: [link] } })
      .mockResolvedValueOnce({ status: 200, data: contextResponse });

    await expect(
      createMediaLink(
        { media_asset_id: ASSET_ID, entity_type: "show", entity_id: SHOW_ID },
        { adminContext },
      ),
    ).resolves.toMatchObject({ link, already_exists: false });
    await expect(getAllLinksForAsset(ASSET_ID, { adminContext })).resolves.toEqual([link]);
    await expect(
      updateMediaLinkContextById(
        LINK_ID,
        { people_count: 2, people_count_source: "manual" },
        { adminContext },
      ),
    ).resolves.toEqual(contextResponse);

    expect(fetchAdminBackendJsonMock).toHaveBeenNthCalledWith(
      2,
      "/admin/media-links",
      expect.objectContaining({
        adminContext,
        apiVersion: "v2",
        queryString: `media_asset_id=${ASSET_ID}`,
      }),
    );
    expect(fetchAdminBackendJsonMock).toHaveBeenNthCalledWith(
      3,
      `/admin/media-links/${LINK_ID}/context`,
      expect.objectContaining({ adminContext, apiVersion: "v2", method: "PATCH" }),
    );
  });

  it("rejects malformed nested media-link rows", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        links: [
          {
            id: 17,
            entity_type: "show",
            entity_id: SHOW_ID,
            media_asset_id: ASSET_ID,
            kind: "gallery",
            position: null,
            context: {},
            created_at: "2026-07-16T00:00:00Z",
          },
        ],
      },
    });

    await expect(getAllLinksForAsset(ASSET_ID, { adminContext })).rejects.toMatchObject({
      status: 502,
      code: "INVALID_BACKEND_RESPONSE",
    });
  });

  it("rejects malformed create and context response envelopes", async () => {
    const link = {
      id: LINK_ID,
      entity_type: "show",
      entity_id: SHOW_ID,
      media_asset_id: ASSET_ID,
      kind: "gallery",
      position: null,
      context: {},
      created_at: "2026-07-16T00:00:00Z",
    };
    fetchAdminBackendJsonMock
      .mockResolvedValueOnce({
        status: 200,
        data: {
          link,
          already_exists: false,
          message: "Link created successfully",
          unexpected: true,
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        data: {
          link_id: LINK_ID,
          people_count: 2,
          people_count_source: "estimated",
          thumbnail_crop: null,
        },
      });

    await expect(
      createMediaLink(
        { media_asset_id: ASSET_ID, entity_type: "show", entity_id: SHOW_ID },
        { adminContext },
      ),
    ).rejects.toMatchObject({ status: 502, code: "INVALID_BACKEND_RESPONSE" });
    await expect(
      updateMediaLinkContextById(
        LINK_ID,
        { people_count: 2, people_count_source: "manual" },
        { adminContext },
      ),
    ).rejects.toMatchObject({ status: 502, code: "INVALID_BACKEND_RESPONSE" });
  });
});
