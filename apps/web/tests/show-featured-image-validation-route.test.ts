import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  getShowByIdMock,
  getShowByExactSlugMock,
  updateShowByIdMock,
  validateShowImageForFieldMock,
  fetchSocialBackendJsonMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getShowByIdMock: vi.fn(),
  getShowByExactSlugMock: vi.fn(),
  updateShowByIdMock: vi.fn(),
  validateShowImageForFieldMock: vi.fn(),
  fetchSocialBackendJsonMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  getShowById: getShowByIdMock,
  getShowByExactSlug: getShowByExactSlugMock,
  updateShowById: updateShowByIdMock,
  validateShowImageForField: validateShowImageForFieldMock,
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  fetchAdminBackendJson: vi.fn(),
  invalidateAdminBackendCache: vi.fn(),
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  buildAdminProxyErrorResponse: vi.fn(),
}));

vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({
  fetchSocialBackendJson: fetchSocialBackendJsonMock,
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
    getShowByExactSlugMock.mockReset();
    updateShowByIdMock.mockReset();
    validateShowImageForFieldMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-user", email: "admin@example.test" });
    getShowByIdMock.mockResolvedValue({
      id: SHOW_ID,
      name: "Test Show",
      slug: "test-show",
      canonical_slug: "test-show",
      alternative_names: ["Legacy Alias"],
      external_ids: {},
    });
    getShowByExactSlugMock.mockResolvedValue(null);
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

  it("syncs saved show handles into show-assigned shared account sources", async () => {
    fetchSocialBackendJsonMock
      .mockResolvedValueOnce({
        sources: [
          {
            platform: "instagram",
            account_handle: "bravotv",
            is_active: true,
            scrape_priority: 10,
            metadata: {},
          },
        ],
      })
      .mockResolvedValueOnce({ sources: [] });

    const response = await PUT(buildRequest({ instagram_handle: "@thetraitorsus" }), {
      params: Promise.resolve({ showId: SHOW_ID }),
    });

    expect(response.status).toBe(200);
    expect(updateShowByIdMock).toHaveBeenCalledWith(
      SHOW_ID,
      expect.objectContaining({
        externalIds: expect.objectContaining({
          instagram_handle: "thetraitorsus",
          instagram: "thetraitorsus",
        }),
      }),
    );
    expect(fetchSocialBackendJsonMock).toHaveBeenNthCalledWith(
      1,
      "/shared/sources",
      expect.objectContaining({
        queryString: "source_scope=bravo&include_inactive=true",
      }),
    );
    expect(fetchSocialBackendJsonMock).toHaveBeenNthCalledWith(
      2,
      "/shared/sources",
      expect.objectContaining({
        method: "PUT",
        body: expect.any(String),
      }),
    );
    const putBody = JSON.parse(fetchSocialBackendJsonMock.mock.calls[1][1].body) as {
      sources: Array<{
        platform: string;
        account_handle: string;
        is_active: boolean;
        metadata: Record<string, unknown>;
      }>;
    };
    expect(putBody.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          platform: "instagram",
          account_handle: "thetraitorsus",
          is_active: true,
          metadata: expect.objectContaining({
            assigned_show_id: SHOW_ID,
            profile_kind: "show_official",
            network_name: "Test Show",
          }),
        }),
      ]),
    );
  });

  it("normalizes nickname into the canonical slug and healed alternative names", async () => {
    const response = await PUT(
      buildRequest({
        name: "Test Show",
        nickname: " RHOSLC!!! ",
        alternative_names: ["Salt Lake", "rhoslc", "Test Show"],
      }),
      {
        params: Promise.resolve({ showId: SHOW_ID }),
      }
    );

    expect(response.status).toBe(200);
    expect(getShowByExactSlugMock).toHaveBeenCalledWith("rhoslc");
    expect(updateShowByIdMock).toHaveBeenCalledWith(
      SHOW_ID,
      expect.objectContaining({
        name: "Test Show",
        slug: "rhoslc",
        alternativeNames: ["rhoslc", "Salt Lake"],
      })
    );
  });

  it("rejects nickname values that normalize to an empty slug", async () => {
    const response = await PUT(buildRequest({ nickname: "!!!" }), {
      params: Promise.resolve({ showId: SHOW_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "nickname must produce a valid slug" });
    expect(updateShowByIdMock).not.toHaveBeenCalled();
  });

  it("rejects nickname slug collisions with a clear 409 response", async () => {
    getShowByExactSlugMock.mockResolvedValue({
      id: "99999999-9999-9999-9999-999999999999",
      name: "Other Show",
      slug: "rhoslc",
    });

    const response = await PUT(buildRequest({ nickname: "RHOSLC" }), {
      params: Promise.resolve({ showId: SHOW_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toEqual({
      error: 'nickname slug "rhoslc" is already used by Other Show',
    });
    expect(updateShowByIdMock).not.toHaveBeenCalled();
  });

  it("keeps slug first when alternative names are saved without a nickname change", async () => {
    const response = await PUT(buildRequest({ alternative_names: ["Bravo Alias", "test-show"] }), {
      params: Promise.resolve({ showId: SHOW_ID }),
    });

    expect(response.status).toBe(200);
    expect(updateShowByIdMock).toHaveBeenCalledWith(
      SHOW_ID,
      expect.objectContaining({
        alternativeNames: ["test-show", "Bravo Alias"],
      })
    );
  });
});
