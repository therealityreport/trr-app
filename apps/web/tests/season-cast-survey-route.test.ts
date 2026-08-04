import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";
import { SURVEY_SEASON_CAST_CACHE_NAMESPACE } from "@/lib/server/admin/survey-route-cache";
import { AdminReadProxyError } from "@/lib/server/trr-api/admin-read-proxy";

const {
  requireAdminMock,
  toVerifiedAdminContextMock,
  getSeasonCastWithEpisodeCountsMock,
  listSeasonCastSurveyRolesMock,
  replaceSeasonCastSurveyRolesMock,
  upsertSeasonCastSurveyRoleMock,
  deleteSeasonCastSurveyRoleMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  toVerifiedAdminContextMock: vi.fn(),
  getSeasonCastWithEpisodeCountsMock: vi.fn(),
  listSeasonCastSurveyRolesMock: vi.fn(),
  replaceSeasonCastSurveyRolesMock: vi.fn(),
  upsertSeasonCastSurveyRoleMock: vi.fn(),
  deleteSeasonCastSurveyRoleMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
  toVerifiedAdminContext: toVerifiedAdminContextMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  getSeasonCastWithEpisodeCounts: getSeasonCastWithEpisodeCountsMock,
}));

vi.mock("@/lib/server/admin/season-cast-survey-roles-repository", () => ({
  listSeasonCastSurveyRoles: listSeasonCastSurveyRolesMock,
  replaceSeasonCastSurveyRoles: replaceSeasonCastSurveyRolesMock,
  upsertSeasonCastSurveyRole: upsertSeasonCastSurveyRoleMock,
  deleteSeasonCastSurveyRole: deleteSeasonCastSurveyRoleMock,
}));

import {
  GET,
  PUT,
} from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/survey-cast/route";

const SHOW_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PERSON_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const ADMIN_CONTEXT = {
  uid: "admin-1",
  email: null,
  verifiedAt: 1_721_131_200_000,
};
const PARAMS = { params: Promise.resolve({ showId: SHOW_ID, seasonNumber: "3" }) };

describe("season survey cast route", () => {
  beforeEach(() => {
    for (const mock of [
      requireAdminMock,
      toVerifiedAdminContextMock,
      getSeasonCastWithEpisodeCountsMock,
      listSeasonCastSurveyRolesMock,
      replaceSeasonCastSurveyRolesMock,
      upsertSeasonCastSurveyRoleMock,
      deleteSeasonCastSurveyRoleMock,
    ]) {
      mock.mockReset();
    }
    requireAdminMock.mockResolvedValue({ uid: "admin-1", email: null });
    toVerifiedAdminContextMock.mockReturnValue(ADMIN_CONTEXT);
    getSeasonCastWithEpisodeCountsMock.mockResolvedValue([
      {
        person_id: PERSON_ID,
        person_name: "Person One",
        episodes_in_season: 8,
        total_episodes: 10,
        photo_url: null,
      },
    ]);
    listSeasonCastSurveyRolesMock.mockResolvedValue([
      { person_id: PERSON_ID, role: "main" },
    ]);
    invalidateRouteResponseCache(SURVEY_SEASON_CAST_CACHE_NAMESPACE);
  });

  it("preserves the merged GET payload and cache behavior with signed role reads", async () => {
    const response = await GET(
      new NextRequest(
        `http://localhost/api/admin/trr-api/shows/${SHOW_ID}/seasons/3/survey-cast?selectedOnly=true&refresh=1`,
      ),
      PARAMS,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      cast: [
        expect.objectContaining({ person_id: PERSON_ID, survey_role: "main" }),
      ],
      selectedOnly: true,
    });
    expect(listSeasonCastSurveyRolesMock).toHaveBeenCalledWith(SHOW_ID, 3, {
      adminContext: ADMIN_CONTEXT,
    });
  });

  it("retains the user-scoped cache and cold-miss singleflight result", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${SHOW_ID}/seasons/3/survey-cast`,
    );

    const first = await GET(request, PARAMS);
    const second = await GET(request, PARAMS);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.headers.get("x-trr-cache")).toBe("hit");
    expect(listSeasonCastSurveyRolesMock).toHaveBeenCalledTimes(1);
  });

  it("preserves patch normalization and returns the refreshed role envelope", async () => {
    const response = await PUT(
      new NextRequest(
        `http://localhost/api/admin/trr-api/shows/${SHOW_ID}/seasons/3/survey-cast`,
        {
          method: "PUT",
          body: JSON.stringify({
            mode: "patch",
            roles: [
              { person_id: PERSON_ID, role: "main" },
              { person_id: "cccccccc-cccc-cccc-cccc-cccccccccccc", role: null },
            ],
          }),
          headers: { "Content-Type": "application/json" },
        },
      ),
      PARAMS,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      roles: [{ person_id: PERSON_ID, role: "main" }],
    });
    expect(upsertSeasonCastSurveyRoleMock).toHaveBeenCalledWith(ADMIN_CONTEXT, {
      trrShowId: SHOW_ID,
      seasonNumber: 3,
      personId: PERSON_ID,
      role: "main",
    });
    expect(deleteSeasonCastSurveyRoleMock).toHaveBeenCalledWith(ADMIN_CONTEXT, {
      trrShowId: SHOW_ID,
      seasonNumber: 3,
      personId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    });
    expect(listSeasonCastSurveyRolesMock).toHaveBeenLastCalledWith(SHOW_ID, 3, {
      adminContext: ADMIN_CONTEXT,
    });
  });

  it("preserves replace mode and delegates one backend replacement", async () => {
    const response = await PUT(
      new NextRequest(
        `http://localhost/api/admin/trr-api/shows/${SHOW_ID}/seasons/3/survey-cast`,
        {
          method: "PUT",
          body: JSON.stringify({
            mode: "replace",
            roles: [{ person_id: PERSON_ID, role: "friend_of" }],
          }),
          headers: { "Content-Type": "application/json" },
        },
      ),
      PARAMS,
    );

    expect(response.status).toBe(200);
    expect(replaceSeasonCastSurveyRolesMock).toHaveBeenCalledWith(
      ADMIN_CONTEXT,
      SHOW_ID,
      3,
      [{ personId: PERSON_ID, role: "friend_of" }],
    );
  });

  it("preserves the structured backend 400 for duplicate replacement entries", async () => {
    replaceSeasonCastSurveyRolesMock.mockRejectedValue(
      new AdminReadProxyError(
        "roles must not contain duplicate person_id entries",
        400,
        {
          code: "INVALID_SEASON_CAST_SURVEY_ROLES_REQUEST",
          retryable: false,
        },
      ),
    );

    const response = await PUT(
      new NextRequest(
        `http://localhost/api/admin/trr-api/shows/${SHOW_ID}/seasons/3/survey-cast`,
        {
          method: "PUT",
          body: JSON.stringify({
            mode: "replace",
            roles: [
              { person_id: PERSON_ID, role: "main" },
              { person_id: PERSON_ID, role: "friend_of" },
            ],
          }),
          headers: { "Content-Type": "application/json" },
        },
      ),
      PARAMS,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "roles must not contain duplicate person_id entries",
      code: "INVALID_SEASON_CAST_SURVEY_ROLES_REQUEST",
      retryable: false,
    });
  });
});
