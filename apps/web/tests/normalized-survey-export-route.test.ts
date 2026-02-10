import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  getSurveyWithQuestionsMock,
  getRunByIdMock,
  listResponsesWithAnswersMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getSurveyWithQuestionsMock: vi.fn(),
  getRunByIdMock: vi.fn(),
  listResponsesWithAnswersMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/surveys/survey-run-repository", () => ({
  getSurveyWithQuestions: getSurveyWithQuestionsMock,
}));

vi.mock("@/lib/server/surveys/normalized-survey-admin-repository", () => ({
  getRunById: getRunByIdMock,
  listResponsesWithAnswers: listResponsesWithAnswersMock,
}));

import { GET } from "@/app/api/admin/normalized-surveys/[surveySlug]/runs/[runId]/export/route";

describe("/api/admin/normalized-surveys/[surveySlug]/runs/[runId]/export", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getSurveyWithQuestionsMock.mockReset();
    getRunByIdMock.mockReset();
    listResponsesWithAnswersMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-uid" });
  });

  it("returns CSV with flattened question_key columns", async () => {
    getSurveyWithQuestionsMock.mockResolvedValue({
      id: "survey-1",
      slug: "my-survey",
      title: "My Survey",
      description: null,
      is_active: true,
      metadata: {},
      created_at: "2026-02-09T00:00:00.000Z",
      updated_at: "2026-02-09T00:00:00.000Z",
      questions: [
        {
          id: "q1",
          survey_id: "survey-1",
          question_key: "q_yesno",
          question_text: "Yes or no?",
          question_type: "single_choice",
          display_order: 0,
          is_required: true,
          config: {},
          created_at: "2026-02-09T00:00:00.000Z",
          updated_at: "2026-02-09T00:00:00.000Z",
          options: [
            { id: "o_yes", question_id: "q1", option_key: "yes", option_text: "Yes", display_order: 0, metadata: {}, created_at: "2026-02-09T00:00:00.000Z" },
            { id: "o_no", question_id: "q1", option_key: "no", option_text: "No", display_order: 1, metadata: {}, created_at: "2026-02-09T00:00:00.000Z" },
          ],
        },
        {
          id: "q2",
          survey_id: "survey-1",
          question_key: "q_text",
          question_text: "Say something",
          question_type: "free_text",
          display_order: 1,
          is_required: false,
          config: {},
          created_at: "2026-02-09T00:00:00.000Z",
          updated_at: "2026-02-09T00:00:00.000Z",
          options: [],
        },
        {
          id: "q3",
          survey_id: "survey-1",
          question_key: "q_rating",
          question_text: "Rate it",
          question_type: "numeric",
          display_order: 2,
          is_required: false,
          config: {},
          created_at: "2026-02-09T00:00:00.000Z",
          updated_at: "2026-02-09T00:00:00.000Z",
          options: [],
        },
        {
          id: "q4",
          survey_id: "survey-1",
          question_key: "q_multi",
          question_text: "Pick many",
          question_type: "multi_choice",
          display_order: 3,
          is_required: false,
          config: {},
          created_at: "2026-02-09T00:00:00.000Z",
          updated_at: "2026-02-09T00:00:00.000Z",
          options: [
            { id: "o_a", question_id: "q4", option_key: "a", option_text: "A", display_order: 0, metadata: {}, created_at: "2026-02-09T00:00:00.000Z" },
            { id: "o_b", question_id: "q4", option_key: "b", option_text: "B", display_order: 1, metadata: {}, created_at: "2026-02-09T00:00:00.000Z" },
            { id: "o_c", question_id: "q4", option_key: "c", option_text: "C", display_order: 2, metadata: {}, created_at: "2026-02-09T00:00:00.000Z" },
          ],
        },
      ],
    });

    getRunByIdMock.mockResolvedValue({
      id: "run-1",
      survey_id: "survey-1",
      run_key: "wk1",
      title: null,
      starts_at: "2026-02-09T00:00:00.000Z",
      ends_at: null,
      max_submissions_per_user: 1,
      is_active: true,
      metadata: {},
      created_at: "2026-02-09T00:00:00.000Z",
      updated_at: "2026-02-09T00:00:00.000Z",
    });

    listResponsesWithAnswersMock.mockResolvedValue([
      {
        id: "r1",
        survey_run_id: "run-1",
        user_id: "user-1",
        submission_number: 1,
        completed_at: "2026-02-09T12:01:00.000Z",
        metadata: {},
        created_at: "2026-02-09T12:00:00.000Z",
        updated_at: "2026-02-09T12:01:00.000Z",
        answers: [
          { id: "a1", response_id: "r1", question_id: "q1", option_id: "o_yes", text_value: null, numeric_value: null, json_value: null, created_at: "2026-02-09T12:00:01.000Z" },
          { id: "a2", response_id: "r1", question_id: "q2", option_id: null, text_value: "hello", numeric_value: null, json_value: null, created_at: "2026-02-09T12:00:02.000Z" },
          { id: "a3", response_id: "r1", question_id: "q3", option_id: null, text_value: null, numeric_value: 5, json_value: null, created_at: "2026-02-09T12:00:03.000Z" },
          { id: "a4", response_id: "r1", question_id: "q4", option_id: null, text_value: null, numeric_value: null, json_value: ["o_a", "o_c"], created_at: "2026-02-09T12:00:04.000Z" },
        ],
      },
    ]);

    const request = new NextRequest("http://localhost/api/admin/normalized-surveys/my-survey/runs/run-1/export", {
      method: "GET",
    });

    const response = await GET(request, {
      params: Promise.resolve({ surveySlug: "my-survey", runId: "run-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");

    const text = await response.text();
    const [headerLine] = text.split("\n");
    expect(headerLine).toBe(
      "response_id,created_at,user_id,submission_number,completed_at,q_yesno,q_text,q_rating,q_multi",
    );
    expect(text).toContain(
      "r1,2026-02-09T12:00:00.000Z,user-1,1,2026-02-09T12:01:00.000Z,Yes,hello,5,A | C",
    );
  });
});

