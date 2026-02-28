import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const personMock = vi.fn(() => <div data-testid="person-rankings-render" />);
const posterMock = vi.fn(() => <div data-testid="poster-rankings-render" />);
const castMultiSelectMock = vi.fn(() => <div data-testid="cast-multi-select-render" />);
const castSingleSelectMock = vi.fn(() => <div data-testid="cast-single-select-render" />);
const rankTextFieldsMock = vi.fn(() => <div data-testid="rank-text-fields-render" />);
const posterSingleSelectMock = vi.fn(() => <div data-testid="poster-single-select-render" />);
const starRatingMock = vi.fn(() => <div data-testid="star-rating-render" />);
const iconRatingMock = vi.fn(() => <div data-testid="icon-rating-render" />);

vi.mock("@/components/survey/PersonRankingsInput", () => ({
  __esModule: true,
  default: (props: unknown) => {
    personMock(props);
    return <div data-testid="person-rankings-render" />;
  },
}));

vi.mock("@/components/survey/PosterRankingsInput", () => ({
  __esModule: true,
  default: (props: unknown) => {
    posterMock(props);
    return <div data-testid="poster-rankings-render" />;
  },
}));

vi.mock("@/components/survey/CastMultiSelectInput", () => ({
  __esModule: true,
  default: (props: unknown) => {
    castMultiSelectMock(props);
    return <div data-testid="cast-multi-select-render" />;
  },
}));

vi.mock("@/components/survey/SingleSelectCastInput", () => ({
  __esModule: true,
  default: (props: unknown) => {
    castSingleSelectMock(props);
    return <div data-testid="cast-single-select-render" />;
  },
}));

vi.mock("@/components/survey/RankTextFields", () => ({
  __esModule: true,
  default: (props: unknown) => {
    rankTextFieldsMock(props);
    return <div data-testid="rank-text-fields-render" />;
  },
}));

vi.mock("@/components/survey/PosterSingleSelect", () => ({
  __esModule: true,
  default: (props: unknown) => {
    posterSingleSelectMock(props);
    return <div data-testid="poster-single-select-render" />;
  },
}));

vi.mock("@/components/survey/StarRatingInput", () => ({
  __esModule: true,
  default: (props: unknown) => {
    starRatingMock(props);
    return <div data-testid="star-rating-render" />;
  },
}));

vi.mock("@/components/survey/IconRatingInput", () => ({
  __esModule: true,
  default: (props: unknown) => {
    iconRatingMock(props);
    return <div data-testid="icon-rating-render" />;
  },
}));

import QuestionRenderer from "@/components/survey/QuestionRenderer";

function makeQuestion(uiVariant: "person-rankings" | "poster-rankings" | "circle-ranking" | "rectangle-ranking") {
  return {
    id: "q-rank",
    survey_id: "survey-1",
    question_key: "rank_q",
    question_text: "Rank",
    question_type: "ranking",
    display_order: 1,
    is_required: false,
    config: { uiVariant },
    created_at: "",
    updated_at: "",
    options: [],
  };
}

describe("QuestionRenderer ranking dispatch", () => {
  beforeEach(() => {
    personMock.mockClear();
    posterMock.mockClear();
    castMultiSelectMock.mockClear();
    castSingleSelectMock.mockClear();
    rankTextFieldsMock.mockClear();
    posterSingleSelectMock.mockClear();
    starRatingMock.mockClear();
    iconRatingMock.mockClear();
  });

  it("dispatches person-rankings and legacy circle-ranking to PersonRankingsInput", () => {
    render(<QuestionRenderer question={makeQuestion("person-rankings") as never} value={[]} onChange={() => {}} />);
    expect(screen.getByTestId("person-rankings-render")).toBeInTheDocument();

    render(<QuestionRenderer question={makeQuestion("circle-ranking") as never} value={[]} onChange={() => {}} />);
    expect(personMock).toHaveBeenCalledTimes(2);
  });

  it("dispatches poster-rankings and legacy rectangle-ranking to PosterRankingsInput", () => {
    render(<QuestionRenderer question={makeQuestion("poster-rankings") as never} value={[]} onChange={() => {}} />);
    expect(screen.getByTestId("poster-rankings-render")).toBeInTheDocument();

    render(<QuestionRenderer question={makeQuestion("rectangle-ranking") as never} value={[]} onChange={() => {}} />);
    expect(posterMock).toHaveBeenCalledTimes(2);
  });

  it("dispatches cast-multi-select to CastMultiSelectInput", () => {
    render(
      <QuestionRenderer
        question={{
          id: "q-cast-multi",
          survey_id: "survey-1",
          question_key: "which_feud",
          question_text: "Which feud?",
          question_type: "multi_choice",
          display_order: 1,
          is_required: false,
          config: { uiVariant: "cast-multi-select", minSelections: 2, maxSelections: 2 },
          created_at: "",
          updated_at: "",
          options: [],
        } as never}
        value={[]}
        onChange={() => {}}
      />,
    );

    expect(screen.getByTestId("cast-multi-select-render")).toBeInTheDocument();
    expect(castMultiSelectMock).toHaveBeenCalledTimes(1);
  });

  it("dispatches cast-single-select to SingleSelectCastInput", () => {
    render(
      <QuestionRenderer
        question={{
          id: "q-cast-single",
          survey_id: "survey-1",
          question_key: "who_funniest",
          question_text: "Who was the FUNNIEST this season?",
          question_type: "single_choice",
          display_order: 1,
          is_required: false,
          config: { uiVariant: "cast-single-select", columns: 4 },
          created_at: "",
          updated_at: "",
          options: [],
        } as never}
        value={null}
        onChange={() => {}}
      />,
    );

    expect(screen.getByTestId("cast-single-select-render")).toBeInTheDocument();
    expect(castSingleSelectMock).toHaveBeenCalledTimes(1);
  });

  it("dispatches rank-text-fields to RankTextFields", () => {
    render(
      <QuestionRenderer
        question={{
          id: "q-rank-text",
          survey_id: "survey-1",
          question_key: "rank_taglines",
          question_text: "Rank the Taglines",
          question_type: "single_choice",
          display_order: 1,
          is_required: false,
          config: { uiVariant: "rank-text-fields" },
          created_at: "",
          updated_at: "",
          options: [],
        } as never}
        value={null}
        onChange={() => {}}
      />,
    );

    expect(screen.getByTestId("rank-text-fields-render")).toBeInTheDocument();
    expect(rankTextFieldsMock).toHaveBeenCalledTimes(1);
  });

  it("dispatches poster-single-select to PosterSingleSelect", () => {
    render(
      <QuestionRenderer
        question={{
          id: "q-poster-select",
          survey_id: "survey-1",
          question_key: "season_live_start",
          question_text: "During which season...",
          question_type: "single_choice",
          display_order: 1,
          is_required: false,
          config: { uiVariant: "poster-single-select", columns: 3 },
          created_at: "",
          updated_at: "",
          options: [],
        } as never}
        value={null}
        onChange={() => {}}
      />,
    );

    expect(screen.getByTestId("poster-single-select-render")).toBeInTheDocument();
    expect(posterSingleSelectMock).toHaveBeenCalledTimes(1);
  });

  it("uses star rating for numeric-ranking when no icons are configured", () => {
    render(
      <QuestionRenderer
        question={{
          id: "q-num-plain",
          survey_id: "survey-1",
          question_key: "episode_rating",
          question_text: "Rate this episode",
          question_type: "numeric",
          display_order: 1,
          is_required: false,
          config: { uiVariant: "numeric-ranking", min: 0, max: 10, step: 0.1 },
          created_at: "",
          updated_at: "",
          options: [],
        } as never}
        value={7.2}
        onChange={() => {}}
      />,
    );

    expect(screen.getByTestId("star-rating-render")).toBeInTheDocument();
    expect(iconRatingMock).not.toHaveBeenCalled();
  });

  it("uses show icon fallback for numeric-ranking when show icon is provided", () => {
    render(
      <QuestionRenderer
        question={{
          id: "q-num-show-icon",
          survey_id: "survey-1",
          question_key: "episode_rating",
          question_text: "Rate this episode",
          question_type: "numeric",
          display_order: 1,
          is_required: false,
          config: { uiVariant: "numeric-ranking", min: 0, max: 10, step: 0.1 },
          created_at: "",
          updated_at: "",
          options: [],
        } as never}
        value={7.2}
        onChange={() => {}}
        showIconUrl="https://cdn.example.com/icons/rhoslc/brackstar.png"
      />,
    );

    expect(screen.getByTestId("icon-rating-render")).toBeInTheDocument();
    expect(starRatingMock).not.toHaveBeenCalled();
  });

  it("uses per-question icon override before show icon for numeric-ranking", () => {
    render(
      <QuestionRenderer
        question={{
          id: "q-num-override",
          survey_id: "survey-1",
          question_key: "episode_rating",
          question_text: "Rate this episode",
          question_type: "numeric",
          display_order: 1,
          is_required: false,
          config: {
            uiVariant: "numeric-ranking",
            min: 0,
            max: 10,
            step: 0.1,
            iconOverrideUrl: "https://cdn.example.com/icons/custom/override.png",
          },
          created_at: "",
          updated_at: "",
          options: [],
        } as never}
        value={7.2}
        onChange={() => {}}
        showIconUrl="https://cdn.example.com/icons/rhoslc/brackstar.png"
      />,
    );

    expect(screen.getByTestId("icon-rating-render")).toBeInTheDocument();
    const props = iconRatingMock.mock.calls.at(-1)?.[0] as { iconSrc?: string };
    expect(props.iconSrc).toBe("https://cdn.example.com/icons/custom/override.png");
  });
});
