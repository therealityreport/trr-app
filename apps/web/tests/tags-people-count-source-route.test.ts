import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  toVerifiedAdminContextMock,
  getTagsByPhotoIdsMock,
  upsertCastPhotoTagsMock,
  setCastPhotoFaceBoxesMock,
  fetchAdminBackendJsonMock,
  MockAdminReadProxyError,
} = vi.hoisted(() => {
  class AdminReadProxyError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }

  return {
    requireAdminMock: vi.fn(),
    toVerifiedAdminContextMock: vi.fn(),
    getTagsByPhotoIdsMock: vi.fn(),
    upsertCastPhotoTagsMock: vi.fn(),
    setCastPhotoFaceBoxesMock: vi.fn(),
    fetchAdminBackendJsonMock: vi.fn(),
    MockAdminReadProxyError: AdminReadProxyError,
  };
});

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
  toVerifiedAdminContext: toVerifiedAdminContextMock,
}));

vi.mock("@/lib/server/admin/cast-photo-tags-repository", () => ({
  getTagsByPhotoIds: getTagsByPhotoIdsMock,
  upsertCastPhotoTags: upsertCastPhotoTagsMock,
  setCastPhotoFaceBoxes: setCastPhotoFaceBoxesMock,
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  AdminReadProxyError: MockAdminReadProxyError,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5000,
  buildAdminBackendStatusError: (options: {
    status: number;
    data: Record<string, unknown>;
    fallbackMessage: string;
  }) =>
    new MockAdminReadProxyError(
      typeof options.data.detail === "string"
        ? options.data.detail
        : typeof options.data.error === "string"
          ? options.data.error
          : options.fallbackMessage,
      options.status
    ),
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
}));

import { PUT as putCastPhotoTags } from "@/app/api/admin/trr-api/cast-photos/[photoId]/tags/route";
import { PUT as putMediaLinkTags } from "@/app/api/admin/trr-api/media-links/[linkId]/tags/route";

const parseProxyBody = (): Record<string, unknown> => {
  const body = fetchAdminBackendJsonMock.mock.calls[0]?.[1]?.body;
  expect(typeof body).toBe("string");
  return JSON.parse(body as string) as Record<string, unknown>;
};

describe("tags route people_count_source semantics", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    toVerifiedAdminContextMock.mockReset();
    getTagsByPhotoIdsMock.mockReset();
    upsertCastPhotoTagsMock.mockReset();
    setCastPhotoFaceBoxesMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
    toVerifiedAdminContextMock.mockReturnValue({ uid: "admin-user" });
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

  it("media-link tag-only update proxies the preserved manual count contract", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        people_names: ["Person One"],
        people_ids: ["person-1"],
        people_count: 4,
        people_count_source: "manual",
        face_boxes: null,
      },
      durationMs: 7,
    });

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
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/media-links/link-1/tags",
      expect.objectContaining({
        method: "PUT",
        adminContext: { uid: "admin-user" },
        requestRole: "primary",
        routeName: "media-link-tags:sync",
      })
    );
    expect(parseProxyBody()).toEqual({
      people: [{ id: "person-1", name: "Person One" }],
    });
    expect(payload.people_count).toBe(4);
    expect(payload.people_count_source).toBe("manual");
  });

  it("media-link update proxies face_boxes to the backend", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        people_names: ["Person One"],
        people_ids: ["person-1"],
        people_count: 2,
        people_count_source: "manual",
        face_boxes: [
          {
            index: 1,
            kind: "face",
            x: 0.1,
            y: 0.2,
            width: 0.3,
            height: 0.35,
            confidence: null,
            person_name: "Person One",
          },
        ],
      },
      durationMs: 7,
    });

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
    expect(parseProxyBody()).toEqual({
      people: [{ id: "person-1", name: "Person One" }],
      face_boxes: [
        { index: 1, x: 0.1, y: 0.2, width: 0.3, height: 0.35, person_name: "Person One" },
      ],
    });
    expect(payload.face_boxes).toHaveLength(1);
  });

  it("cast-photo route accepts explicit people_count=0", async () => {
    getTagsByPhotoIdsMock.mockResolvedValue(new Map());
    upsertCastPhotoTagsMock.mockResolvedValue({
      cast_photo_id: "photo-1",
      people_names: [],
      people_ids: [],
      people_count: 0,
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
      body: JSON.stringify({ people_count: 0, people: [] }),
    });

    const response = await putCastPhotoTags(request, {
      params: Promise.resolve({ photoId: "photo-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(upsertCastPhotoTagsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        people_count: 0,
        people_count_source: "manual",
      })
    );
    expect(payload.people_count).toBe(0);
  });

  it("media-link route accepts explicit people_count=0 through the backend proxy", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        people_names: [],
        people_ids: [],
        people_count: 0,
        people_count_source: "manual",
        face_boxes: null,
      },
      durationMs: 7,
    });

    const request = new NextRequest("http://localhost/api/admin/trr-api/media-links/link-1/tags", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ people_count: 0, people: [] }),
    });

    const response = await putMediaLinkTags(request, {
      params: Promise.resolve({ linkId: "link-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(parseProxyBody()).toEqual({ people_count: 0, people: [] });
    expect(payload.people_count).toBe(0);
  });

  it("media-link route maps backend not-found status", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 404,
      data: { detail: "Media link not found" },
      durationMs: 7,
    });

    const request = new NextRequest("http://localhost/api/admin/trr-api/media-links/missing-link/tags", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ people: [] }),
    });

    const response = await putMediaLinkTags(request, {
      params: Promise.resolve({ linkId: "missing-link" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toBe("Media link not found");
  });
});
