import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/surveys/[surveySlug]/active-run/route";
import NormalizedSurveyPlay from "@/components/survey/NormalizedSurveyPlay";
import { useNormalizedSurvey } from "@/hooks/useNormalizedSurvey";
import type { ActiveRunResponse, SurveySubmissionEligibility } from "@/lib/surveys/normalized-types";

const mocks = vi.hoisted(() => {
  interface TestUser { uid: string; getIdToken: () => Promise<string> }
  type AuthListener = (user: TestUser | null) => void;
  const listeners = new Set<AuthListener>();
  const auth = {
    currentUser: null as TestUser | null,
    onAuthStateChanged(listener: AuthListener) {
      listeners.add(listener);
      queueMicrotask(() => {
        if (listeners.has(listener)) listener(auth.currentUser);
      });
      return () => listeners.delete(listener);
    },
  };
  return {
    auth,
    changeUser(user: TestUser | null) {
      auth.currentUser = user;
      listeners.forEach((listener) => listener(user));
    },
    fetch: vi.fn<typeof fetch>(),
    push: vi.fn(),
    getUserFromRequest: vi.fn(),
    getActiveRunForSurvey: vi.fn(),
    getSurveyWithQuestions: vi.fn(),
    getUserSubmissionCount: vi.fn(),
  };
});

vi.mock("@/lib/firebase", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/lib/server/auth", () => ({ getUserFromRequest: mocks.getUserFromRequest }));
vi.mock("@/lib/server/surveys/survey-run-repository", () => ({
  getActiveRunForSurvey: mocks.getActiveRunForSurvey,
  getSurveyWithQuestions: mocks.getSurveyWithQuestions,
  getUserSubmissionCount: mocks.getUserSubmissionCount,
}));

const currentUser = (uid: string) => ({ uid, getIdToken: vi.fn().mockResolvedValue(`token-${uid}`) });
const time = "2026-11-13T00:00:00Z";

function surveyData(
  eligibility: SurveySubmissionEligibility = "allowed",
  userSubmissions = 0,
  limit = 2,
  title = "Test Survey",
): ActiveRunResponse {
  return {
    eligibility,
    canSubmit: eligibility === "allowed",
    userSubmissions,
    activeRun: eligibility === "no-active-run" ? null : {
      id: "run",
      survey_id: "survey",
      run_key: "run",
      title: null,
      starts_at: time,
      ends_at: null,
      max_submissions_per_user: limit,
      is_active: true,
      metadata: {},
      created_at: time,
      updated_at: time,
    },
    survey: eligibility === "no-active-run" ? null : {
      id: "survey",
      slug: "survey",
      title,
      description: null,
      is_active: true,
      metadata: {},
      created_at: time,
      updated_at: time,
      questions: [{
        id: "question",
        survey_id: "survey",
        question_key: "question",
        question_text: "Your answer",
        question_type: "free_text",
        display_order: 1,
        is_required: true,
        config: {},
        options: [],
        created_at: time,
        updated_at: time,
      }],
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
}

function answer(text: string) {
  fireEvent.change(screen.getByRole("textbox", { name: "Your answer" }), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Submit Survey" }));
}

beforeEach(() => {
  mocks.changeUser(currentUser("first"));
  mocks.fetch.mockReset();
  vi.stubGlobal("fetch", mocks.fetch);
});

describe("active-run eligibility", () => {
  it.each([
    { run: false, uid: "first", count: 0, limit: 1, eligibility: "no-active-run" },
    { run: true, uid: null, count: 0, limit: 1, eligibility: "sign-in-required" },
    { run: true, uid: "first", count: 1, limit: 1, eligibility: "limit-reached" },
    { run: true, uid: "first", count: 1, limit: 2, eligibility: "allowed" },
  ])("returns $eligibility with a consistent canSubmit flag", async ({ run, uid, count, limit, eligibility }) => {
    const data = surveyData();
    mocks.getActiveRunForSurvey.mockResolvedValue(run ? { ...data.activeRun, max_submissions_per_user: limit } : null);
    mocks.getSurveyWithQuestions.mockResolvedValue(data.survey);
    mocks.getUserFromRequest.mockResolvedValue(uid ? { uid } : null);
    mocks.getUserSubmissionCount.mockResolvedValue(count);

    const request = new NextRequest("https://trr.localhost/api/surveys/survey/active-run");
    const response = await GET(request, { params: Promise.resolve({ surveySlug: "survey" }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toMatchObject({ eligibility, canSubmit: eligibility === "allowed", userSubmissions: count });
    if (run && uid) {
      expect(mocks.getUserSubmissionCount).toHaveBeenCalledWith({ firebaseUid: uid }, "run");
    } else {
      expect(mocks.getUserSubmissionCount).not.toHaveBeenCalled();
    }
  });
});

describe("normalized survey play", () => {
  it("waits for Firebase, prompts for sign-in, and reloads when the user signs in", async () => {
    mocks.changeUser(null);
    mocks.fetch.mockResolvedValueOnce(Response.json(surveyData("sign-in-required")))
      .mockResolvedValueOnce(Response.json(surveyData()));

    render(<NormalizedSurveyPlay surveySlug="survey" />);
    expect(mocks.fetch).not.toHaveBeenCalled();
    await screen.findByRole("heading", { name: "Sign In to Submit" });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.fetch).toHaveBeenLastCalledWith("/api/surveys/survey/active-run", expect.objectContaining({ credentials: "omit", headers: {} }));
    expect(screen.queryByText(/already submitted/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    expect(mocks.push).toHaveBeenCalledWith("/auth/register");

    act(() => mocks.changeUser(currentUser("first")));
    await screen.findByRole("textbox", { name: "Your answer" });
    expect(mocks.fetch).toHaveBeenLastCalledWith("/api/surveys/survey/active-run", expect.objectContaining({ headers: { Authorization: "Bearer token-first" } }));
  });

  it("aborts and ignores earlier responses after the UID and slug change", async () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    mocks.fetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
      .mockResolvedValueOnce(Response.json(surveyData("allowed", 0, 2, "Current Survey")));
    const { rerender } = render(<NormalizedSurveyPlay surveySlug="survey" />);
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));

    act(() => mocks.changeUser(currentUser("second")));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
    expect(mocks.fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    rerender(<NormalizedSurveyPlay surveySlug="another-survey" />);
    await screen.findByRole("heading", { name: "Current Survey" });
    expect(mocks.fetch.mock.calls[1]?.[1]?.signal?.aborted).toBe(true);
    expect(mocks.fetch).toHaveBeenLastCalledWith("/api/surveys/another-survey/active-run", expect.objectContaining({ headers: { Authorization: "Bearer token-second" } }));

    await act(async () => {
      second.resolve(Response.json(surveyData("limit-reached", 2)));
      first.resolve(Response.json(surveyData("no-active-run")));
    });
    expect(screen.getByRole("heading", { name: "Current Survey" })).toBeVisible();
  });

  it("does not issue a stale load when ID token retrieval finishes after an identity change", async () => {
    const lateToken = deferred<string>();
    const first = currentUser("first");
    first.getIdToken.mockReturnValueOnce(lateToken.promise);
    mocks.changeUser(first);
    mocks.fetch.mockResolvedValueOnce(Response.json(surveyData()));
    renderHook(() => useNormalizedSurvey("survey"));
    await waitFor(() => expect(first.getIdToken).toHaveBeenCalledTimes(1));

    act(() => mocks.changeUser(currentUser("second")));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    await act(async () => { lateToken.resolve("token-first"); });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.fetch).toHaveBeenLastCalledWith("/api/surveys/survey/active-run", expect.objectContaining({ headers: { Authorization: "Bearer token-second" } }));
  });

  it("keeps the answers when the submission token fails or the POST rejects them", async () => {
    const user = currentUser("first");
    user.getIdToken.mockResolvedValueOnce("token-first").mockRejectedValueOnce(new Error("Token request failed"));
    mocks.changeUser(user);
    mocks.fetch.mockResolvedValueOnce(Response.json(surveyData()))
      .mockResolvedValueOnce(Response.json({ success: false, error: "This answer does not meet the survey rules." }, { status: 400 }));
    render(<NormalizedSurveyPlay surveySlug="survey" />);
    await screen.findByRole("textbox", { name: "Your answer" });

    answer("My answer");
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to submit your response.");
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    const submit = screen.getByRole("button", { name: "Submit Survey" });
    expect(submit).toBeEnabled();
    expect(screen.getByRole("textbox")).toHaveValue("My answer");
    fireEvent.click(submit);
    expect(await screen.findByRole("alert")).toHaveTextContent("This answer does not meet the survey rules.");
    expect(screen.getByRole("textbox")).toHaveValue("My answer");
  });

  it("clears answers when the user or slug changes and ignores the earlier user's POST result", async () => {
    const pendingSave = deferred<Response>();
    mocks.fetch.mockResolvedValueOnce(Response.json(surveyData()))
      .mockReturnValueOnce(pendingSave.promise)
      .mockResolvedValueOnce(Response.json(surveyData()))
      .mockResolvedValueOnce(Response.json(surveyData("allowed", 0, 2, "Another Survey")));
    const { rerender } = render(<NormalizedSurveyPlay surveySlug="survey" />);
    await screen.findByRole("textbox", { name: "Your answer" });
    answer("First user's answer");
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));

    act(() => mocks.changeUser(currentUser("second")));
    expect(await screen.findByRole("textbox", { name: "Your answer" })).toHaveValue("");
    expect(mocks.fetch.mock.calls[1]?.[1]?.signal?.aborted).toBe(true);
    await act(async () => { pendingSave.resolve(Response.json({ success: true })); });
    expect(screen.queryByText("Your response has been submitted.")).not.toBeInTheDocument();
    expect(mocks.fetch).toHaveBeenCalledTimes(3);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Second user's answer" } });
    rerender(<NormalizedSurveyPlay surveySlug="another-survey" />);
    await screen.findByRole("heading", { name: "Another Survey" });
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("confirms a save at limit one and leaves results navigation up to the user", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json(surveyData("allowed", 0, 1)))
      .mockResolvedValueOnce(Response.json({ success: true }))
      .mockResolvedValueOnce(Response.json(surveyData("limit-reached", 1, 1)));
    render(<NormalizedSurveyPlay surveySlug="survey" successRedirect="/results" />);
    await screen.findByRole("textbox", { name: "Your answer" });
    answer("My answer");

    expect(await screen.findByRole("status")).toHaveTextContent("Your response has been submitted.");
    await waitFor(() => expect(screen.queryByText(/checking if you can submit/i)).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Submit Another Response" })).not.toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "View Results" }));
    expect(mocks.push).toHaveBeenCalledWith("/results");
  });

  it("uses the surveys destination when public results are unavailable", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json(surveyData("limit-reached", 1, 1)));
    render(<NormalizedSurveyPlay surveySlug="survey" backUrl="/hub/surveys" />);
    expect(await screen.findByText("Results are not available yet.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "View Results" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to Surveys" }));
    expect(mocks.push).toHaveBeenCalledWith("/hub/surveys");
  });

  it("offers a blank second response only after the first save and the server confirms the allowance", async () => {
    const allowance = deferred<Response>();
    mocks.fetch.mockResolvedValueOnce(Response.json(surveyData()))
      .mockResolvedValueOnce(Response.json({ success: true }))
      .mockReturnValueOnce(allowance.promise)
      .mockResolvedValueOnce(Response.json({ success: true }))
      .mockResolvedValueOnce(Response.json(surveyData("limit-reached", 2)));
    render(<NormalizedSurveyPlay surveySlug="survey" successRedirect="/results" />);
    await screen.findByRole("textbox", { name: "Your answer" });
    answer("First answer");

    await screen.findByRole("status");
    expect(screen.getByText(/checking if you can submit/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Submit Another Response" })).not.toBeInTheDocument();
    await act(async () => { allowance.resolve(Response.json(surveyData("allowed", 1))); });
    expect(mocks.push).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Submit Another Response" }));
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Submit Survey" })).toBeDisabled();

    answer("Second answer");
    await screen.findByRole("status");
    await waitFor(() => expect(screen.queryByText(/checking if you can submit/i)).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Submit Another Response" })).not.toBeInTheDocument();
    expect(mocks.fetch.mock.calls.filter(([, init]) => init?.method === "POST").map(([, init]) => JSON.parse(String(init?.body)))).toEqual([
      { answers: [{ questionId: "question", textValue: "First answer" }] },
      { answers: [{ questionId: "question", textValue: "Second answer" }] },
    ]);
  });

  it("keeps the save confirmation after a failed allowance check and retries only the GET", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json(surveyData()))
      .mockResolvedValueOnce(Response.json({ success: true }))
      .mockRejectedValueOnce(new Error("Connection lost"))
      .mockResolvedValueOnce(Response.json(surveyData("allowed", 1)));
    render(<NormalizedSurveyPlay surveySlug="survey" />);
    await screen.findByRole("textbox", { name: "Your answer" });
    answer("My answer");

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to check survey availability.");
    expect(screen.getByRole("status")).toHaveTextContent("Your response has been submitted.");
    expect(screen.queryByRole("button", { name: "Submit Another Response" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    await screen.findByRole("button", { name: "Submit Another Response" });
    expect(mocks.fetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });
});
