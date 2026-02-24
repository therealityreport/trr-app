import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  getCoverPhotoMock,
  setCoverPhotoMock,
  removeCoverPhotoMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getCoverPhotoMock: vi.fn(),
  setCoverPhotoMock: vi.fn(),
  removeCoverPhotoMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/person-cover-photos-repository", () => ({
  getCoverPhoto: getCoverPhotoMock,
  setCoverPhoto: setCoverPhotoMock,
  removeCoverPhoto: removeCoverPhotoMock,
}));

import { PUT } from "@/app/api/admin/trr-api/people/[personId]/cover-photo/route";

describe("person cover photo route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getCoverPhotoMock.mockReset();
    setCoverPhotoMock.mockReset();
    removeCoverPhotoMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
  });

  it("rejects malformed photo_url payload", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/people/person-1/cover-photo",
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          photo_id: "photo-1",
          photo_url: "javascript:alert(1)",
        }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ personId: "person-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("photo_url must be a valid http(s) URL");
    expect(setCoverPhotoMock).not.toHaveBeenCalled();
  });

  it("normalizes valid payload and stores cover photo", async () => {
    setCoverPhotoMock.mockResolvedValue({
      person_id: "person-1",
      photo_id: "photo-1",
      photo_url: "https://cdn.example.com/photo.jpg",
    });
    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/people/person-1/cover-photo",
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          photo_id: "  photo-1  ",
          photo_url: "https://cdn.example.com/photo.jpg",
        }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ personId: "person-1" }),
    });

    expect(response.status).toBe(200);
    expect(setCoverPhotoMock).toHaveBeenCalledWith(
      { firebaseUid: "admin-user", isAdmin: true },
      {
        person_id: "person-1",
        photo_id: "photo-1",
        photo_url: "https://cdn.example.com/photo.jpg",
      }
    );
  });
});
