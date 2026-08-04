import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  toVerifiedAdminContextMock,
  createSurveyFromShowMock,
  getSurveysByTrrShowIdMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  toVerifiedAdminContextMock: vi.fn(),
  createSurveyFromShowMock: vi.fn(),
  getSurveysByTrrShowIdMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
  toVerifiedAdminContext: toVerifiedAdminContextMock,
}));

vi.mock("@/lib/server/surveys/survey-trr-links-repository", () => ({
  getSurveysByTrrShowId: getSurveysByTrrShowIdMock,
}));

vi.mock("@/lib/server/surveys/create-survey-from-show", () => ({
  createSurveyFromShow: createSurveyFromShowMock,
}));

import { POST } from "@/app/api/admin/trr-api/shows/[showId]/surveys/route";

const SHOW_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ADMIN_CONTEXT = {
  uid: "admin-1",
  email: "admin@example.com",
  verifiedAt: 1_721_131_200_000,
};

describe("create survey from show route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    toVerifiedAdminContextMock.mockReset();
    createSurveyFromShowMock.mockReset();
    getSurveysByTrrShowIdMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-1", email: "admin@example.com" });
    toVerifiedAdminContextMock.mockReturnValue(ADMIN_CONTEXT);
    createSurveyFromShowMock.mockResolvedValue({
      survey: { id: "survey-1" },
      link: { survey_id: "survey-1", trr_show_id: SHOW_ID, season_number: 3 },
    });
  });

  it("preserves the 201 payload while passing verified context to role-backed creation", async () => {
    const response = await POST(
      new NextRequest(`http://localhost/api/admin/trr-api/shows/${SHOW_ID}/surveys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonNumber: 3,
          template: "cast_ranking",
          createInitialRun: false,
        }),
      }),
      { params: Promise.resolve({ showId: SHOW_ID }) },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      survey: { id: "survey-1" },
      link: { survey_id: "survey-1", trr_show_id: SHOW_ID, season_number: 3 },
    });
    expect(createSurveyFromShowMock).toHaveBeenCalledWith(
      { firebaseUid: "admin-1", isAdmin: true },
      expect.objectContaining({
        trrShowId: SHOW_ID,
        seasonNumber: 3,
        template: "cast_ranking",
      }),
      ADMIN_CONTEXT,
    );
  });
});
