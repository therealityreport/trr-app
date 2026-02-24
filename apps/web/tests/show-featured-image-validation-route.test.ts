import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  getShowByIdMock,
  updateShowByIdMock,
  validateShowImageForFieldMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getShowByIdMock: vi.fn(),
  updateShowByIdMock: vi.fn(),
  validateShowImageForFieldMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  getShowById: getShowByIdMock,
  updateShowById: updateShowByIdMock,
  validateShowImageForField: validateShowImageForFieldMock,
}));

import { PUT } from "@/app/api/admin/trr-api/shows/[showId]/route";

const SHOW_ID = "11111111-1111-1111-1111-111111111111";
const POSTER_ID = "22222222-2222-2222-2222-222222222222";
const BACKDROP_ID = "33333333-3333-3333-3333-333333333333";

const buildRequest = (body: Record<string, unknown>) =>
  new NextRequest(`http://localhost/api/admin/trr-api/shows/${SHOW_ID}`, {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

describe("show route featured image validation", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getShowByIdMock.mockReset();
    updateShowByIdMock.mockReset();
    validateShowImageForFieldMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
    updateShowByIdMock.mockResolvedValue({
      id: SHOW_ID,
      name: "Test Show",
      slug: "test-show",
      canonical_slug: "test-show",
    });
  });

  it("accepts valid poster image id when validation passes", async () => {
    validateShowImageForFieldMock.mockResolvedValue(true);

    const response = await PUT(buildRequest({ primary_poster_image_id: POSTER_ID }), {
      params: Promise.resolve({ showId: SHOW_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(validateShowImageForFieldMock).toHaveBeenCalledWith(SHOW_ID, POSTER_ID, "poster");
    expect(updateShowByIdMock).toHaveBeenCalledWith(
      SHOW_ID,
      expect.objectContaining({ primaryPosterImageId: POSTER_ID })
    );
    expect(payload).toHaveProperty("show");
  });

  it("accepts valid backdrop image id when validation passes", async () => {
    validateShowImageForFieldMock.mockResolvedValue(true);

    const response = await PUT(buildRequest({ primary_backdrop_image_id: BACKDROP_ID }), {
      params: Promise.resolve({ showId: SHOW_ID }),
    });

    expect(response.status).toBe(200);
    expect(validateShowImageForFieldMock).toHaveBeenCalledWith(SHOW_ID, BACKDROP_ID, "backdrop");
    expect(updateShowByIdMock).toHaveBeenCalledWith(
      SHOW_ID,
      expect.objectContaining({ primaryBackdropImageId: BACKDROP_ID })
    );
  });

  it("rejects poster assignment when image does not validate for this show", async () => {
    validateShowImageForFieldMock.mockResolvedValue(false);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const response = await PUT(buildRequest({ primary_poster_image_id: POSTER_ID }), {
      params: Promise.resolve({ showId: SHOW_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      error: "primary_poster_image_id must reference a poster image for this show",
    });
    expect(updateShowByIdMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "[api] Rejected invalid featured poster image assignment",
      expect.objectContaining({
        showId: SHOW_ID,
        field: "primary_poster_image_id",
        imageId: POSTER_ID,
      })
    );
  });

  it("rejects backdrop assignment when image does not validate for this show", async () => {
    validateShowImageForFieldMock.mockResolvedValue(false);

    const response = await PUT(buildRequest({ primary_backdrop_image_id: BACKDROP_ID }), {
      params: Promise.resolve({ showId: SHOW_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      error: "primary_backdrop_image_id must reference a backdrop image for this show",
    });
    expect(updateShowByIdMock).not.toHaveBeenCalled();
  });

  it("allows clearing featured ids with null without validation", async () => {
    const response = await PUT(
      buildRequest({
        primary_poster_image_id: null,
        primary_backdrop_image_id: null,
      }),
      {
        params: Promise.resolve({ showId: SHOW_ID }),
      }
    );

    expect(response.status).toBe(200);
    expect(validateShowImageForFieldMock).not.toHaveBeenCalled();
    expect(updateShowByIdMock).toHaveBeenCalledWith(
      SHOW_ID,
      expect.objectContaining({
        primaryPosterImageId: null,
        primaryBackdropImageId: null,
      })
    );
  });

  it("keeps normal detail updates working when featured ids are omitted", async () => {
    const response = await PUT(buildRequest({ name: "Updated Name" }), {
      params: Promise.resolve({ showId: SHOW_ID }),
    });

    expect(response.status).toBe(200);
    expect(validateShowImageForFieldMock).not.toHaveBeenCalled();
    expect(updateShowByIdMock).toHaveBeenCalledWith(
      SHOW_ID,
      expect.objectContaining({ name: "Updated Name" })
    );
  });
});
