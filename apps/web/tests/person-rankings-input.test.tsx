import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const renderRankerMock = vi.fn(() => <div data-testid="flashback-ranker" />);

vi.mock("@/components/flashback-ranker", () => ({
  __esModule: true,
  default: (props: unknown) => {
    renderRankerMock(props);
    return <div data-testid="flashback-ranker" />;
  },
}));

import PersonRankingsInput from "@/components/survey/PersonRankingsInput";

function makeQuestion(uiVariant: "person-rankings" | "poster-rankings") {
  return {
    id: "q-rank",
    survey_id: "survey-1",
    question_key: "rank_q",
    question_text: "Rank the cast",
    question_type: "ranking",
    display_order: 1,
    is_required: true,
    config: {
      uiVariant,
      lineLabelTop: "BEST",
      lineLabelBottom: "WORST",
      shapeScale: 90,
      buttonScale: 115,
    },
    created_at: "",
    updated_at: "",
    options: [
      {
        id: "o1",
        question_id: "q-rank",
        option_key: "lisa",
        option_text: "Lisa",
        display_order: 1,
        metadata: { imagePath: "/images/lisa.png" },
        created_at: "",
        updated_at: "",
      },
    ],
  };
}

describe("PersonRankingsInput", () => {
  beforeEach(() => {
    renderRankerMock.mockClear();
  });

  it("always uses circle preset even if question config is poster-rankings", () => {
    render(
      <PersonRankingsInput
        question={makeQuestion("poster-rankings") as never}
        value={[]}
        onChange={() => {}}
      />,
    );

    const props = renderRankerMock.mock.calls[0][0] as {
      variant: string;
      layoutPreset: string;
      shapeScalePercent?: number;
      buttonScalePercent?: number;
    };
    expect(props.variant).toBe("grid");
    expect(props.layoutPreset).toBe("figma-rank-circles");
    expect(props.shapeScalePercent).toBe(90);
    expect(props.buttonScalePercent).toBe(115);
  });
});
