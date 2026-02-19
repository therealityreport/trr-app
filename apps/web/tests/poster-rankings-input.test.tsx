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

import PosterRankingsInput from "@/components/survey/PosterRankingsInput";

function makeQuestion(uiVariant: "person-rankings" | "poster-rankings") {
  return {
    id: "q-rank",
    survey_id: "survey-1",
    question_key: "rank_q",
    question_text: "Rank the seasons",
    question_type: "ranking",
    display_order: 1,
    is_required: true,
    config: {
      uiVariant,
      lineLabelTop: "ICONIC",
      lineLabelBottom: "SNOOZE",
      placeholderShapeColor: "#D9D9D9",
    },
    created_at: "",
    updated_at: "",
    options: [
      {
        id: "o1",
        question_id: "q-rank",
        option_key: "s1",
        option_text: "SEASON 1",
        display_order: 1,
        metadata: {},
        created_at: "",
        updated_at: "",
      },
    ],
  };
}

describe("PosterRankingsInput", () => {
  beforeEach(() => {
    renderRankerMock.mockClear();
  });

  it("always uses rectangle preset even if question config is person-rankings", () => {
    render(
      <PosterRankingsInput
        question={makeQuestion("person-rankings") as never}
        value={[]}
        onChange={() => {}}
      />,
    );

    const props = renderRankerMock.mock.calls[0][0] as {
      variant: string;
      layoutPreset: string;
      styleOverrides?: Record<string, string>;
    };
    expect(props.variant).toBe("grid");
    expect(props.layoutPreset).toBe("figma-rank-rectangles");
    expect(props.styleOverrides?.rectanglePlaceholderFillColor).toBe("#D9D9D9");
  });
});
