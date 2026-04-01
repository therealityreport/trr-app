import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";
import { SURVEY_DETAIL_CACHE_NAMESPACE } from "@/lib/server/admin/survey-route-cache";

const {
  requireAdminMock,
  getSurveyBySlugMock,
  getLinkBySurveyIdMock,
  getCastByShowSeasonMock,
  getEpisodesByShowAndSeasonMock,
  getAssetsByShowSeasonMock,
  listSeasonCastSurveyRolesMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getSurveyBySlugMock: vi.fn(),
  getLinkBySurveyIdMock: vi.fn(),
  getCastByShowSeasonMock: vi.fn(),
  getEpisodesByShowAndSeasonMock: vi.fn(),
  getAssetsByShowSeasonMock: vi.fn(),
  listSeasonCastSurveyRolesMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/surveys/normalized-survey-admin-repository", () => ({
  getSurveyBySlug: getSurveyBySlugMock,
  updateSurvey: vi.fn(),
}));

vi.mock("@/lib/server/surveys/survey-trr-links-repository", () => ({
  getLinkBySurveyId: getLinkBySurveyIdMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  getCastByShowSeason: getCastByShowSeasonMock,
  getEpisodesByShowAndSeason: getEpisodesByShowAndSeasonMock,
  getAssetsByShowSeason: getAssetsByShowSeasonMock,
}));

vi.mock("@/lib/server/admin/season-cast-survey-roles-repository", () => ({
  listSeasonCastSurveyRoles: listSeasonCastSurveyRolesMock,
  replaceSeasonCastSurveyRoles: vi.fn(),
}));

import { GET } from "@/app/api/admin/surveys/[surveyKey]/route";

describe("survey detail route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getSurveyBySlugMock.mockReset();
    getLinkBySurveyIdMock.mockReset();
    getCastByShowSeasonMock.mockReset();
    getEpisodesByShowAndSeasonMock.mockReset();
    getAssetsByShowSeasonMock.mockReset();
    listSeasonCastSurveyRolesMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-1" });
    getSurveyBySlugMock.mockResolvedValue({
      id: "survey-1",
      slug: "traitors-season-3",
      title: "The Traitors S3",
      description: "Who will win?",
      is_active: true,
      metadata: {},
      created_at: "2026-03-30T00:00:00.000Z",
      updated_at: "2026-03-30T00:00:00.000Z",
    });
    getLinkBySurveyIdMock.mockResolvedValue(null);
    invalidateRouteResponseCache(SURVEY_DETAIL_CACHE_NAMESPACE);
  });

  it("returns miss headers for an uncached survey bootstrap", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/admin/surveys/traitors-season-3"),
      { params: Promise.resolve({ surveyKey: "traitors-season-3" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trr-cache")).toBe("miss");
    expect(response.headers.get("x-trr-upstream-ms")).toBeTruthy();
    expect(payload.survey.key).toBe("traitors-season-3");
    expect(getSurveyBySlugMock).toHaveBeenCalledTimes(1);
    expect(getLinkBySurveyIdMock).toHaveBeenCalledTimes(1);
  });

  it("returns a cache hit for repeated survey bootstrap requests", async () => {
    const request = new NextRequest("http://localhost/api/admin/surveys/traitors-season-3");

    const first = await GET(request, {
      params: Promise.resolve({ surveyKey: "traitors-season-3" }),
    });
    const second = await GET(request, {
      params: Promise.resolve({ surveyKey: "traitors-season-3" }),
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.headers.get("x-trr-cache")).toBe("hit");
    expect(getSurveyBySlugMock).toHaveBeenCalledTimes(1);
  });
});
