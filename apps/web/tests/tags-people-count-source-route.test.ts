import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  getTagsByPhotoIdsMock,
  upsertCastPhotoTagsMock,
  setCastPhotoFaceBoxesMock,
  getMediaLinkByIdMock,
  ensureMediaLinksForPeopleMock,
  updateMediaLinksContextMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getTagsByPhotoIdsMock: vi.fn(),
  upsertCastPhotoTagsMock: vi.fn(),
  setCastPhotoFaceBoxesMock: vi.fn(),
  getMediaLinkByIdMock: vi.fn(),
  ensureMediaLinksForPeopleMock: vi.fn(),
  updateMediaLinksContextMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/cast-photo-tags-repository", () => ({
  getTagsByPhotoIds: getTagsByPhotoIdsMock,
  upsertCastPhotoTags: upsertCastPhotoTagsMock,
  setCastPhotoFaceBoxes: setCastPhotoFaceBoxesMock,
}));

vi.mock("@/lib/server/trr-api/media-links-repository", () => ({
  getMediaLinkById: getMediaLinkByIdMock,
  ensureMediaLinksForPeople: ensureMediaLinksForPeopleMock,
  updateMediaLinksContext: updateMediaLinksContextMock,
}));

import { PUT as putCastPhotoTags } from "@/app/api/admin/trr-api/cast-photos/[photoId]/tags/route";
import { PUT as putMediaLinkTags } from "@/app/api/admin/trr-api/media-links/[linkId]/tags/route";

describe("tags route people_count_source semantics", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getTagsByPhotoIdsMock.mockReset();
    upsertCastPhotoTagsMock.mockReset();
    setCastPhotoFaceBoxesMock.mockReset();
    getMediaLinkByIdMock.mockReset();
    ensureMediaLinksForPeopleMock.mockReset();
    updateMediaLinksContextMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
  });

  it("cast-photo tag-only update preserves manual count source and count", async () => {
    getTagsByPhotoIdsMock.mockResolvedValue(
      new Map([
        [
          "photo-1",
          {
            people_count: 3,
            people_count_source: "manual",
          },
        ],
      ])
    );
    upsertCastPhotoTagsMock.mockResolvedValue({
      cast_photo_id: "photo-1",
      people_names: ["Person One"],
      people_ids: ["person-1"],
      people_count: 3,
      people_count_source: "manual",
      detector: null,
      created_at: null,
      updated_at: null,
      created_by_firebase_uid: "admin-user",
      updated_by_firebase_uid: "admin-user",
    });

    const request = new NextRequest("http://localhost/api/admin/trr-api/cast-photos/photo-1/tags", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        people: [{ id: "person-1", name: "Person One" }],
      }),
    });

    const response = await putCastPhotoTags(request, {
      params: Promise.resolve({ photoId: "photo-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(upsertCastPhotoTagsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cast_photo_id: "photo-1",
        people_count: 3,
        people_count_source: "manual",
      })
    );
    expect(payload.people_count).toBe(3);
    expect(payload.people_count_source).toBe("manual");
  });

  it("media-link tag-only update preserves manual count source and count", async () => {
    getMediaLinkByIdMock.mockResolvedValue({
      id: "link-1",
      media_asset_id: "asset-1",
      context: {
        people_count: 4,
        people_count_source: "manual",
      },
    });
    ensureMediaLinksForPeopleMock.mockResolvedValue(undefined);
    updateMediaLinksContextMock.mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost/api/admin/trr-api/media-links/link-1/tags", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        people: [{ id: "person-1", name: "Person One" }],
      }),
    });

    const response = await putMediaLinkTags(request, {
      params: Promise.resolve({ linkId: "link-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(updateMediaLinksContextMock).toHaveBeenCalledWith(
      "asset-1",
      expect.objectContaining({
        people_count: 4,
        people_count_source: "manual",
      })
    );
    expect(payload.people_count).toBe(4);
    expect(payload.people_count_source).toBe("manual");
  });

  it("media-link update persists face_boxes in context payload", async () => {
    getMediaLinkByIdMock.mockResolvedValue({
      id: "link-1",
      media_asset_id: "asset-1",
      context: {
        people_count: 2,
        people_count_source: "manual",
      },
    });
    ensureMediaLinksForPeopleMock.mockResolvedValue(undefined);
    updateMediaLinksContextMock.mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost/api/admin/trr-api/media-links/link-1/tags", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        people: [{ id: "person-1", name: "Person One" }],
        face_boxes: [
          { index: 1, x: 0.1, y: 0.2, width: 0.3, height: 0.35, person_name: "Person One" },
        ],
      }),
    });

    const response = await putMediaLinkTags(request, {
      params: Promise.resolve({ linkId: "link-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(updateMediaLinksContextMock).toHaveBeenCalledWith(
      "asset-1",
      expect.objectContaining({
        face_boxes: expect.arrayContaining([
          expect.objectContaining({
            index: 1,
            x: 0.1,
            y: 0.2,
            width: 0.3,
            height: 0.35,
            person_name: "Person One",
          }),
        ]),
      })
    );
    expect(payload.face_boxes).toHaveLength(1);
  });
});
