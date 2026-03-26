import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const {
  requireAdminMock,
  fetchAdminBackendJsonMock,
  invalidateAdminBackendCacheMock,
  setCoverPhotoMock,
  removeCoverPhotoMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  fetchAdminBackendJsonMock: vi.fn(),
  invalidateAdminBackendCacheMock: vi.fn(),
  setCoverPhotoMock: vi.fn(),
  removeCoverPhotoMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/person-cover-photos-repository", () => ({
  setCoverPhoto: setCoverPhotoMock,
  removeCoverPhoto: removeCoverPhotoMock,
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
  invalidateAdminBackendCache: invalidateAdminBackendCacheMock,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  buildAdminProxyErrorResponse: (error: unknown) =>
    NextResponse.json(
      { error: error instanceof Error ? error.message : "failed" },
      { status: 500 },
    ),
}));

import { GET, PUT } from "@/app/api/admin/trr-api/people/[personId]/cover-photo/route";

describe("person cover photo route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    invalidateAdminBackendCacheMock.mockReset();
    setCoverPhotoMock.mockReset();
    removeCoverPhotoMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
  });

  it("returns the backend-owned cover photo contract on GET", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        coverPhoto: {
          person_id: "person-1",
          photo_id: "photo-1",
          photo_url: "https://cdn.example.com/photo.jpg",
        },
      },
      durationMs: 5,
    });

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/people/person-1/cover-photo",
    );
    const response = await GET(request, {
      params: Promise.resolve({ personId: "person-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      coverPhoto: {
        person_id: "person-1",
        photo_id: "photo-1",
        photo_url: "https://cdn.example.com/photo.jpg",
      },
    });
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
    expect(invalidateAdminBackendCacheMock).toHaveBeenCalledWith(
      "/admin/people/person-1/cache/invalidate",
      { routeName: "person-cover-photo" },
    );
  });
});
