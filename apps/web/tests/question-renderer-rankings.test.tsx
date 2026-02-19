import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const personMock = vi.fn(() => <div data-testid="person-rankings-render" />);
const posterMock = vi.fn(() => <div data-testid="poster-rankings-render" />);

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
});
