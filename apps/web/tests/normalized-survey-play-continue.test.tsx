import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const push = vi.fn();
const submit = vi.fn().mockResolvedValue(true);
const useNormalizedSurveyMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/hooks/useNormalizedSurvey", () => ({
  useNormalizedSurvey: (...args: unknown[]) => useNormalizedSurveyMock(...args),
}));

import NormalizedSurveyPlay from "@/components/survey/NormalizedSurveyPlay";

function makeSurvey() {
  return {
    id: "survey-1",
    slug: "demo-survey",
    title: "Demo Survey",
    description: "Demo",
    is_active: true,
    created_at: "",
    updated_at: "",
    questions: [
      {
        id: "q1",
        survey_id: "survey-1",
        question_key: "fav",
        question_text: "Pick one",
        question_type: "single_choice",
        display_order: 1,
        is_required: true,
        config: { uiVariant: "text-multiple-choice" },
        created_at: "",
        updated_at: "",
        options: [
          {
            id: "q1o1",
            question_id: "q1",
            option_key: "a",
            option_text: "Option A",
            display_order: 1,
            metadata: {},
            created_at: "",
          },
        ],
      },
      {
        id: "q2",
        survey_id: "survey-1",
        question_key: "comment",
        question_text: "Comment",
        question_type: "free_text",
        display_order: 2,
        is_required: false,
        config: { uiVariant: "text-entry", placeholder: "Type" },
        created_at: "",
        updated_at: "",
        options: [],
      },
    ],
  };
}

describe("NormalizedSurveyPlay continue button", () => {
  beforeEach(() => {
    push.mockReset();
    submit.mockClear();
    useNormalizedSurveyMock.mockReturnValue({
      loading: false,
      survey: makeSurvey(),
      activeRun: { id: "run-1" },
      canSubmit: true,
      submitting: false,
      error: null,
      submit,
    });
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("shows continue after answering and hides it again when deselected", () => {
    render(<NormalizedSurveyPlay surveySlug="demo-survey" />);

    expect(screen.queryByTestId("survey-question-continue-q1")).not.toBeInTheDocument();

    const optionA = screen.getByRole("button", { name: /option a/i });
    fireEvent.click(optionA);
    expect(screen.getByTestId("survey-question-continue-q1")).toBeInTheDocument();

    fireEvent.click(optionA);
    expect(screen.queryByTestId("survey-question-continue-q1")).not.toBeInTheDocument();
  });
});

