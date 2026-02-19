import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getTagsByPhotoIdsMock, upsertCastPhotoTagsMock } = vi.hoisted(
  () => ({
    requireAdminMock: vi.fn(),
    getTagsByPhotoIdsMock: vi.fn(),
    upsertCastPhotoTagsMock: vi.fn(),
  })
);

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/cast-photo-tags-repository", () => ({
  getTagsByPhotoIds: getTagsByPhotoIdsMock,
  upsertCastPhotoTags: upsertCastPhotoTagsMock,
}));

import { PATCH } from "@/app/api/admin/trr-api/cast-photos/[photoId]/people-count/route";

const makeRequest = (body: Record<string, unknown>) =>
  new NextRequest("http://localhost/api/admin/trr-api/cast-photos/photo-1/people-count", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("cast photo people-count route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getTagsByPhotoIdsMock.mockReset();
    upsertCastPhotoTagsMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
  });

  it("updates manual people count while preserving existing tag arrays", async () => {
    getTagsByPhotoIdsMock.mockResolvedValue(
      new Map([
        [
          "photo-1",
          {
            cast_photo_id: "photo-1",
            people_names: ["Person One"],
            people_ids: ["person-1"],
            people_count: 2,
            people_count_source: "auto",
            detector: "facebox_v1",
            created_by_firebase_uid: "seed-user",
          },
        ],
      ])
    );
    upsertCastPhotoTagsMock.mockResolvedValue({
      cast_photo_id: "photo-1",
      people_count: 4,
      people_count_source: "manual",
    });

    const response = await PATCH(
      makeRequest({ people_count: 4 }),
      { params: Promise.resolve({ photoId: "photo-1" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(upsertCastPhotoTagsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cast_photo_id: "photo-1",
        people_names: ["Person One"],
        people_ids: ["person-1"],
        people_count: 4,
        people_count_source: "manual",
      })
    );
    expect(payload.people_count).toBe(4);
    expect(payload.people_count_source).toBe("manual");
  });

  it("rejects invalid people_count payloads", async () => {
    const response = await PATCH(
      makeRequest({ people_count: "invalid" }),
      { params: Promise.resolve({ photoId: "photo-1" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("Invalid payload");
    expect(upsertCastPhotoTagsMock).not.toHaveBeenCalled();
  });
});

