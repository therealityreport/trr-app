import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const push = vi.fn();
const submit = vi.fn().mockResolvedValue(true);
const useNormalizedSurveyMock = vi.fn();
const scrollIntoViewMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/trr-shows/1/surveys",
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

function makeCastMultiSelectSurvey() {
  return {
    id: "survey-2",
    slug: "cast-multi",
    title: "Cast Multi Survey",
    description: "Demo",
    is_active: true,
    created_at: "",
    updated_at: "",
    questions: [
      {
        id: "q1",
        survey_id: "survey-2",
        question_key: "which_feud",
        question_text: "Which FEUD did you enjoy the most?",
        question_type: "multi_choice",
        display_order: 1,
        is_required: true,
        config: { uiVariant: "cast-multi-select", minSelections: 2, maxSelections: 2 },
        created_at: "",
        updated_at: "",
        options: [
          {
            id: "q1o1",
            question_id: "q1",
            option_key: "lisa",
            option_text: "Lisa",
            display_order: 1,
            metadata: {},
            created_at: "",
          },
          {
            id: "q1o2",
            question_id: "q1",
            option_key: "meredith",
            option_text: "Meredith",
            display_order: 2,
            metadata: {},
            created_at: "",
          },
          {
            id: "q1o3",
            question_id: "q1",
            option_key: "heather",
            option_text: "Heather",
            display_order: 3,
            metadata: {},
            created_at: "",
          },
        ],
      },
    ],
  };
}

describe("NormalizedSurveyPlay continue button", () => {
  beforeEach(() => {
    push.mockReset();
    submit.mockClear();
    scrollIntoViewMock.mockReset();
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
      value: scrollIntoViewMock,
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

  it("shows back chevrons and navigates to previous question", () => {
    render(<NormalizedSurveyPlay surveySlug="demo-survey" />);

    const backQ1 = screen.getByTestId("survey-question-back-q1");
    const backQ2 = screen.getByTestId("survey-question-back-q2");

    expect(backQ1).toBeDisabled();
    expect(backQ2).toBeEnabled();

    fireEvent.click(backQ2);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("uses inline continue for cast-multi-select after two picks", () => {
    useNormalizedSurveyMock.mockReturnValue({
      loading: false,
      survey: makeCastMultiSelectSurvey(),
      activeRun: { id: "run-2" },
      canSubmit: true,
      submitting: false,
      error: null,
      submit,
    });

    render(<NormalizedSurveyPlay surveySlug="cast-multi" />);

    const lisa = screen.getByTestId("cast-multi-select-option-lisa");
    const meredith = screen.getByTestId("cast-multi-select-option-meredith");
    fireEvent.click(lisa);
    fireEvent.click(meredith);

    expect(screen.queryByTestId("survey-question-continue-q1")).not.toBeInTheDocument();
    expect(screen.getByTestId("cast-multi-select-continue")).toBeInTheDocument();
  });
});
