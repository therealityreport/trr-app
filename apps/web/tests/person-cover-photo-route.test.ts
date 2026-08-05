import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const {
  requireAdminMock,
  toVerifiedAdminContextMock,
  invalidateAdminBackendCacheMock,
  getCoverPhotoMock,
  setCoverPhotoMock,
  removeCoverPhotoMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  toVerifiedAdminContextMock: vi.fn(),
  invalidateAdminBackendCacheMock: vi.fn(),
  getCoverPhotoMock: vi.fn(),
  setCoverPhotoMock: vi.fn(),
  removeCoverPhotoMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
  toVerifiedAdminContext: toVerifiedAdminContextMock,
}));

vi.mock("@/lib/server/admin/person-cover-photos-repository", () => ({
  getCoverPhoto: getCoverPhotoMock,
  setCoverPhoto: setCoverPhotoMock,
  removeCoverPhoto: removeCoverPhotoMock,
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  invalidateAdminBackendCache: invalidateAdminBackendCacheMock,
  buildAdminProxyErrorResponse: (error: unknown) =>
    NextResponse.json(
      { error: error instanceof Error ? error.message : "failed" },
      { status: 500 },
    ),
}));

import { DELETE, GET, PUT } from "@/app/api/admin/trr-api/people/[personId]/cover-photo/route";

const ADMIN_CONTEXT = {
  uid: "admin-user",
  email: "admin@example.com",
  verifiedAt: 1_721_131_200_000,
};

describe("person cover photo route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    toVerifiedAdminContextMock.mockReset();
    invalidateAdminBackendCacheMock.mockReset();
    getCoverPhotoMock.mockReset();
    setCoverPhotoMock.mockReset();
    removeCoverPhotoMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user", email: "admin@example.com" });
    toVerifiedAdminContextMock.mockReturnValue(ADMIN_CONTEXT);
  });

  it("returns the backend-owned cover photo contract on GET", async () => {
    getCoverPhotoMock.mockResolvedValue({
      person_id: "person-1",
      photo_id: "photo-1",
      photo_url: "https://cdn.example.com/photo.jpg",
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
    expect(getCoverPhotoMock).toHaveBeenCalledWith("person-1", {
      adminContext: ADMIN_CONTEXT,
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
      ADMIN_CONTEXT,
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

  it("does not let a pre-write GET repopulate stale cache after invalidation", async () => {
    let resolveInitialGet: ((value: unknown) => void) | undefined;
    getCoverPhotoMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInitialGet = resolve;
        }),
    );
    setCoverPhotoMock.mockResolvedValue({
      person_id: "person-1",
      photo_id: "photo-new",
      photo_url: "https://cdn.example.com/photo-new.jpg",
    });
    const getRequest = new NextRequest(
      "http://localhost/api/admin/trr-api/people/person-1/cover-photo",
    );
    const initialGet = GET(getRequest, {
      params: Promise.resolve({ personId: "person-1" }),
    });
    await vi.waitFor(() => expect(getCoverPhotoMock).toHaveBeenCalledTimes(1));

    const putResponse = await PUT(
      new NextRequest(
        "http://localhost/api/admin/trr-api/people/person-1/cover-photo",
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            photo_id: "photo-new",
            photo_url: "https://cdn.example.com/photo-new.jpg",
          }),
        },
      ),
      { params: Promise.resolve({ personId: "person-1" }) },
    );
    expect(putResponse.status).toBe(200);

    resolveInitialGet?.({
      person_id: "person-1",
      photo_id: "photo-old",
      photo_url: "https://cdn.example.com/photo-old.jpg",
    });
    await initialGet;

    getCoverPhotoMock.mockResolvedValue({
      person_id: "person-1",
      photo_id: "photo-new",
      photo_url: "https://cdn.example.com/photo-new.jpg",
    });
    const postWriteGet = await GET(getRequest, {
      params: Promise.resolve({ personId: "person-1" }),
    });

    expect(postWriteGet.headers.get("x-trr-cache")).not.toBe("hit");
    await expect(postWriteGet.json()).resolves.toEqual({
      coverPhoto: {
        person_id: "person-1",
        photo_id: "photo-new",
        photo_url: "https://cdn.example.com/photo-new.jpg",
      },
    });
    expect(getCoverPhotoMock).toHaveBeenCalledTimes(2);
  });

  it("invalidates cached cover photos for every admin after a write", async () => {
    getCoverPhotoMock.mockResolvedValue({
      person_id: "person-1",
      photo_id: "photo-old",
      photo_url: "https://cdn.example.com/photo-old.jpg",
    });
    const getRequest = new NextRequest(
      "http://localhost/api/admin/trr-api/people/person-1/cover-photo",
    );

    requireAdminMock.mockResolvedValue({ uid: "admin-one", email: "one@example.com" });
    await GET(getRequest, { params: Promise.resolve({ personId: "person-1" }) });
    requireAdminMock.mockResolvedValue({ uid: "admin-two", email: "two@example.com" });
    await GET(getRequest, { params: Promise.resolve({ personId: "person-1" }) });
    expect(getCoverPhotoMock).toHaveBeenCalledTimes(2);

    setCoverPhotoMock.mockResolvedValue({
      person_id: "person-1",
      photo_id: "photo-new",
      photo_url: "https://cdn.example.com/photo-new.jpg",
    });
    requireAdminMock.mockResolvedValue({ uid: "admin-one", email: "one@example.com" });
    const putResponse = await PUT(
      new NextRequest(
        "http://localhost/api/admin/trr-api/people/person-1/cover-photo",
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            photo_id: "photo-new",
            photo_url: "https://cdn.example.com/photo-new.jpg",
          }),
        },
      ),
      { params: Promise.resolve({ personId: "person-1" }) },
    );
    expect(putResponse.status).toBe(200);

    getCoverPhotoMock.mockResolvedValue({
      person_id: "person-1",
      photo_id: "photo-new",
      photo_url: "https://cdn.example.com/photo-new.jpg",
    });
    requireAdminMock.mockResolvedValue({ uid: "admin-two", email: "two@example.com" });
    const secondAdminResponse = await GET(getRequest, {
      params: Promise.resolve({ personId: "person-1" }),
    });

    expect(secondAdminResponse.headers.get("x-trr-cache")).not.toBe("hit");
    await expect(secondAdminResponse.json()).resolves.toEqual({
      coverPhoto: {
        person_id: "person-1",
        photo_id: "photo-new",
        photo_url: "https://cdn.example.com/photo-new.jpg",
      },
    });
    expect(getCoverPhotoMock).toHaveBeenCalledTimes(3);
  });

  it("keeps another person's cover-photo cache after a scoped write", async () => {
    getCoverPhotoMock.mockResolvedValue({
      person_id: "person-2",
      photo_id: "photo-2",
      photo_url: "https://cdn.example.com/photo-2.jpg",
    });
    const otherPersonRequest = new NextRequest(
      "http://localhost/api/admin/trr-api/people/person-2/cover-photo",
    );
    await GET(otherPersonRequest, {
      params: Promise.resolve({ personId: "person-2" }),
    });
    expect(getCoverPhotoMock).toHaveBeenCalledTimes(1);

    setCoverPhotoMock.mockResolvedValue({
      person_id: "person-1",
      photo_id: "photo-new",
      photo_url: "https://cdn.example.com/photo-new.jpg",
    });
    const putResponse = await PUT(
      new NextRequest(
        "http://localhost/api/admin/trr-api/people/person-1/cover-photo",
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            photo_id: "photo-new",
            photo_url: "https://cdn.example.com/photo-new.jpg",
          }),
        },
      ),
      { params: Promise.resolve({ personId: "person-1" }) },
    );
    expect(putResponse.status).toBe(200);

    const cachedOtherPersonResponse = await GET(otherPersonRequest, {
      params: Promise.resolve({ personId: "person-2" }),
    });
    expect(cachedOtherPersonResponse.headers.get("x-trr-cache")).toBe("hit");
    expect(getCoverPhotoMock).toHaveBeenCalledTimes(1);
  });

  it("removes the cover photo through the signed repository boundary", async () => {
    removeCoverPhotoMock.mockResolvedValue(false);
    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/people/person-1/cover-photo",
      { method: "DELETE" },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ personId: "person-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(removeCoverPhotoMock).toHaveBeenCalledWith(ADMIN_CONTEXT, "person-1");
  });
});
