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

import RankOrderInput from "@/components/survey/RankOrderInput";

function makeQuestion(uiVariant: "circle-ranking" | "rectangle-ranking") {
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
      {
        id: "o2",
        question_id: "q-rank",
        option_key: "mary",
        option_text: "Mary",
        display_order: 2,
        metadata: { imagePath: "/images/mary.png" },
        created_at: "",
        updated_at: "",
      },
    ],
  };
}

describe("RankOrderInput", () => {
  beforeEach(() => {
    renderRankerMock.mockClear();
  });

  it("uses figma-rank-circles preset for circle-ranking", () => {
    render(
      <RankOrderInput
        question={makeQuestion("circle-ranking") as never}
        value={[]}
        onChange={() => {}}
      />,
    );

    expect(renderRankerMock).toHaveBeenCalledTimes(1);
    const props = renderRankerMock.mock.calls[0][0] as {
      variant: string;
      layoutPreset: string;
    };
    expect(props.variant).toBe("grid");
    expect(props.layoutPreset).toBe("figma-rank-circles");
  });

  it("keeps legacy preset for rectangle-ranking", () => {
    render(
      <RankOrderInput
        question={makeQuestion("rectangle-ranking") as never}
        value={[]}
        onChange={() => {}}
      />,
    );

    const props = renderRankerMock.mock.calls[0][0] as {
      variant: string;
      layoutPreset: string;
    };
    expect(props.variant).toBe("classic");
    expect(props.layoutPreset).toBe("legacy");
  });

  it("does not pass onChange handler to ranker in disabled mode", () => {
    const { container } = render(
      <RankOrderInput
        question={makeQuestion("circle-ranking") as never}
        value={[]}
        onChange={() => {}}
        disabled
      />,
    );

    const props = renderRankerMock.mock.calls[0][0] as { onChange?: unknown };
    expect(props.onChange).toBeUndefined();
    expect(container.firstElementChild?.className).toContain("pointer-events-none");
  });
});
