import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  query: vi.fn(),
  transactionQuery: vi.fn(),
  withAuthTransaction: vi.fn(),
  getSurveyWithQuestions: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/server/postgres", () => ({
  query: mocks.query,
  withAuthTransaction: mocks.withAuthTransaction,
}));
vi.mock("@/lib/server/surveys/survey-run-repository", () => ({
  getSurveyWithQuestions: mocks.getSurveyWithQuestions,
}));

import * as options from "@/app/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]/options/route";
import * as questions from "@/app/api/admin/normalized-surveys/[surveySlug]/questions/[questionId]/route";
import { GET as exportRun } from "@/app/api/admin/normalized-surveys/[surveySlug]/runs/[runId]/export/route";
import { GET as getResponses } from "@/app/api/admin/normalized-surveys/[surveySlug]/runs/[runId]/responses/route";
import * as runs from "@/app/api/admin/normalized-surveys/[surveySlug]/runs/[runId]/route";
import { GET as listRuns } from "@/app/api/admin/normalized-surveys/[surveySlug]/runs/route";
import { encodeCsvRow } from "@/lib/server/surveys/csv";
import { exportSurveyResponses } from "@/lib/server/surveys/fetch";

const surveySlug = "survey-a";
const questionId = "818985bf-7faf-4af6-a7aa-242738e0a016";
const optionId = "d59251ad-df13-4c81-b3c8-6ca191d016e3";
const runId = "c6c74faa-ca0e-4afb-aaa6-19663f792366";
const responseId = "1cb58e30-06ea-47ac-8b59-00cc4119603c";
const questionContext = { params: Promise.resolve({ surveySlug, questionId }) };
const runContext = { params: Promise.resolve({ surveySlug, runId }) };
const surveyPredicate = /survey_id = \(SELECT id FROM firebase_surveys\.surveys WHERE slug = \$1\)/;
const noRows = { rows: [], rowCount: 0 };

function request(method = "GET", body?: object, search = "") {
  return new NextRequest(`http://admin.trr.localhost/api/admin/normalized-surveys${search}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.requireAdmin.mockReset().mockResolvedValue({ uid: "admin" });
  mocks.query.mockReset().mockResolvedValue(noRows);
  mocks.transactionQuery.mockReset().mockResolvedValue(noRows);
  mocks.withAuthTransaction.mockReset().mockImplementation(async (_auth, callback) =>
    callback({ query: mocks.transactionQuery }),
  );
  mocks.getSurveyWithQuestions.mockReset().mockResolvedValue({ id: "survey-id", questions: [] });
});

describe("nested normalized survey admin routes", () => {
  it.each([
    ["GET", undefined, /^SELECT /],
    ["PUT", { question_text: "foreign edit" }, /^UPDATE /],
    ["PUT", {}, /^SELECT /],
    ["DELETE", undefined, /^DELETE /],
  ] as const)("question %s uses the survey scope and returns 404 for zero matching rows", async (method, body, operation) => {
    const result = await questions[method](request(method, body), questionContext);

    expect(result.status).toBe(404);
    const query = method === "GET" ? mocks.query : mocks.transactionQuery;
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, values] = query.mock.calls[0];
    expect(sql).toMatch(operation);
    expect(sql).toContain("WHERE id = $2");
    expect(sql).toMatch(surveyPredicate);
    expect(values.slice(0, 2)).toEqual([surveySlug, questionId]);
  });

  it("returns 404 for an options list under the wrong survey before reading options", async () => {
    const result = await options.GET(request(), questionContext);

    expect(result.status).toBe(404);
    expect(mocks.query).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(surveyPredicate), [surveySlug, questionId]);
  });

  it("inserts zero options when the URL question belongs to another survey", async () => {
    const result = await options.POST(request("POST", {
      option_key: "one", option_text: "One", display_order: 0, question_id: "body-id",
    }), questionContext);

    expect(result.status).toBe(404);
    expect(mocks.transactionQuery).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(/INSERT INTO firebase_surveys\.options .*\s+SELECT id, .*FROM firebase_surveys\.questions\s+WHERE id = \$1 AND .*survey_id = \(SELECT id FROM firebase_surveys\.surveys WHERE slug = \$6\)/),
      [questionId, "one", "One", 0, "{}", surveySlug],
    );
  });

  it.each([
    ["PUT", { optionId, option_text: "foreign edit" }, "", /^UPDATE /],
    ["PUT", { optionId }, "", /^SELECT /],
    ["DELETE", undefined, `?optionId=${optionId}`, /^DELETE /],
  ] as const)("option %s requires the option, question and survey to match", async (method, body, search, operation) => {
    const result = await options[method](request(method, body, search), questionContext);

    expect(result.status).toBe(404);
    expect(mocks.transactionQuery).toHaveBeenCalledTimes(1);
    const [sql, values] = mocks.transactionQuery.mock.calls[0];
    expect(sql).toMatch(operation);
    expect(sql).toContain("WHERE id = $3 AND question_id = (SELECT id FROM firebase_surveys.questions WHERE id = $2");
    expect(sql).toMatch(surveyPredicate);
    expect(values.slice(0, 3)).toEqual([surveySlug, questionId, optionId]);
  });

  it.each([
    ["GET", undefined, /^SELECT /],
    ["PUT", { title: "foreign edit" }, /^UPDATE /],
    ["PUT", {}, /^SELECT /],
    ["DELETE", undefined, /^SELECT /],
  ] as const)("run %s uses the survey scope and returns 404 for zero matching rows", async (method, body, operation) => {
    const result = await runs[method](request(method, body), runContext);

    expect(result.status).toBe(404);
    const query = method === "GET" ? mocks.query : mocks.transactionQuery;
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, values] = query.mock.calls[0];
    expect(sql).toMatch(operation);
    expect(sql).toContain("WHERE id = $2");
    expect(sql).toMatch(surveyPredicate);
    expect(values.slice(0, 2)).toEqual([surveySlug, runId]);
  });

  it.each([
    ["run detail", runs.GET],
    ["runs list", listRuns],
  ] as const)("counts the responses for %s using verified admin context", async (entry, handler) => {
    if (entry === "runs list") mocks.query.mockResolvedValueOnce({ rows: [{ id: "survey-id" }] });
    mocks.query.mockResolvedValueOnce({ rows: [{ id: runId }] });
    mocks.transactionQuery.mockResolvedValueOnce({ rows: [{ count: "2" }] });

    const result = await handler(request(), runContext);
    const run = { id: runId, response_count: 2 };

    expect(result.status).toBe(200);
    expect(await result.json()).toEqual(entry === "run detail" ? { run } : { runs: [run] });
    expect(mocks.withAuthTransaction).toHaveBeenCalledExactlyOnceWith(
      { firebaseUid: "admin", isAdmin: true }, expect.any(Function),
    );
    expect(mocks.transactionQuery).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(/COUNT\(\*\).*survey_run_id = \(SELECT id FROM firebase_surveys\.survey_runs WHERE id = \$2 AND survey_id = /),
      [surveySlug, runId],
    );
  });

  it("keeps a run with responses and reports the existing 400 error", async () => {
    mocks.transactionQuery.mockResolvedValueOnce({ rows: [{ id: runId }] }).mockResolvedValueOnce({ rows: [{ exists: true }] });

    const result = await runs.DELETE(request("DELETE"), runContext);

    expect(result.status).toBe(400);
    expect(await result.json()).toEqual({ error: "Cannot delete run with existing responses" });
    expect(mocks.transactionQuery).toHaveBeenCalledTimes(2);
    expect(mocks.transactionQuery).toHaveBeenNthCalledWith(1, expect.stringMatching(/FOR UPDATE$/), [surveySlug, runId]);
    expect(mocks.transactionQuery).toHaveBeenNthCalledWith(2, expect.stringMatching(/SELECT 1 FROM firebase_surveys\.responses/), [surveySlug, runId]);
  });

  it("deletes an empty matching run after locking it and checking for responses", async () => {
    mocks.transactionQuery.mockResolvedValueOnce({ rows: [{ id: runId }] })
      .mockResolvedValueOnce(noRows).mockResolvedValueOnce({ rowCount: 1 });

    const result = await runs.DELETE(request("DELETE"), runContext);

    expect(result.status).toBe(200);
    expect(mocks.transactionQuery).toHaveBeenCalledTimes(3);
    expect(mocks.transactionQuery).toHaveBeenNthCalledWith(
      3, expect.stringMatching(/^DELETE FROM firebase_surveys\.survey_runs WHERE id = \$2 AND survey_id = /), [surveySlug, runId],
    );
  });

  it("returns 404 for a response from another run without fetching its answers", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ id: runId }] });

    const result = await getResponses(request("GET", undefined, `?responseId=${responseId}`), runContext);

    expect(result.status).toBe(404);
    expect(mocks.transactionQuery).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(/WHERE id = \$3 AND survey_run_id = \(SELECT id FROM firebase_surveys\.survey_runs WHERE id = \$2 AND survey_id = /),
      [surveySlug, runId, responseId],
    );
  });

  it.each([getResponses, exportRun])("returns 404 for a response route under the wrong survey", async (handler) => {
    const result = await handler(request(), runContext);

    expect(result.status).toBe(404);
    expect(mocks.query).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(surveyPredicate), [surveySlug, runId]);
    expect(mocks.transactionQuery).not.toHaveBeenCalled();
  });

  it.each([["unauthorized", 401], ["forbidden", 403]] as const)("preserves admin auth status for %s", async (message, status) => {
    mocks.requireAdmin.mockRejectedValueOnce(new Error(message));

    const result = await options.DELETE(request("DELETE", undefined, `?optionId=${optionId}`), questionContext);

    expect(result.status).toBe(status);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.transactionQuery).not.toHaveBeenCalled();
  });
});

describe("survey CSV exports", () => {
  it("quotes all text, escapes CSV delimiters and keeps numeric cells numeric", () => {
    expect(encodeCsvRow(["plain", "", "a,b", 'a"b', "a\rb", "a\nb", "=1", "+2", "-2", "@A1", "\tA1", "  =1", -2, 3, null]))
      .toBe('"plain","","a,b","a""b","a\rb","a\nb","\t=1","\t+2","\t-2","\t@A1","\t\tA1","\t  =1",-2,3,');
  });

  it("exports stable matrix JSON, legacy Likert numbers and escaped dynamic headers", async () => {
    const survey = {
      id: "survey-id",
      questions: [
        { id: "matrix", question_key: '=matrix,"v2"\r\ntest', question_type: "likert", options: [] },
        { id: "legacy", question_key: "legacy", question_type: "likert", options: [] },
        { id: "text", question_key: "text", question_type: "free_text", options: [] },
        { id: "choice", question_key: "choice", question_type: "single_choice", options: [{ id: "opt", option_text: "@formula" }] },
      ],
    };
    mocks.getSurveyWithQuestions.mockResolvedValueOnce(survey);
    mocks.query.mockResolvedValueOnce({ rows: [{ id: runId, survey_id: survey.id, run_key: "week-1" }] });
    mocks.transactionQuery.mockResolvedValueOnce({ rows: [{
      id: responseId, created_at: "created", user_id: "+user", submission_number: 2, completed_at: null,
    }] }).mockResolvedValueOnce({ rows: [
      { response_id: responseId, question_id: "matrix", json_value: { z: 2, a: 1 } },
      { response_id: responseId, question_id: "legacy", numeric_value: -2, json_value: null },
      { response_id: responseId, question_id: "text", text_value: '+sum,"hi"\r\n' },
      { response_id: responseId, question_id: "choice", option_id: "opt" },
    ] });

    const result = await exportRun(request(), runContext);

    expect(result.status).toBe(200);
    expect(result.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(await result.text()).toBe(
      '"response_id","created_at","user_id","submission_number","completed_at","\t=matrix,""v2""\r\ntest","legacy","text","choice"\n' +
      `"${responseId}","created","\t+user",2,"","{""a"":1,""z"":2}",-2,"\t+sum,""hi""\r\n","\t@formula"`,
    );
  });

  it("uses the same safety in legacy exports and preserves array, date and number output", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{
      id: "@user", created_at: new Date("2026-01-02T03:04:05Z"), app_username: 'name,"quoted"\r',
      season_number: -2, pronouns: ["they", "them"], extra: { a: 1 },
    }] });

    const { csv } = await exportSurveyResponses("global_profile", {});

    expect(csv).toMatch(/^"id","created_at","updated_at",/);
    expect(csv).toContain('\n"\t@user","""2026-01-02T03:04:05.000Z"""');
    expect(csv).toContain('"name,""quoted""\r"');
    expect(csv).toContain(",-2,");
    expect(csv).toContain(',"they | them",');
    expect(csv).toContain('"{""a"":1}"');
  });
});
