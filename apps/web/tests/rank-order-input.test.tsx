import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const renderRankerMock = vi.fn(() => <div data-testid="flashback-ranker" />);

vi.mock("@/components/flashback-ranker", () => ({
  __esModule: true,
  default: (props: unknown) => {
    renderRankerMock(props);
    return <div data-testid="flashback-ranker" />;
  },
}));

import RankOrderInput from "@/components/survey/RankOrderInput";

function makeQuestion(
  uiVariant: "person-rankings" | "poster-rankings" | "circle-ranking" | "rectangle-ranking",
) {
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

  it("uses figma-rank-circles preset for person-rankings", () => {
    render(
      <RankOrderInput
        question={makeQuestion("person-rankings") as never}
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

  it("uses figma-rank-rectangles preset for poster-rankings", () => {
    render(
      <RankOrderInput
        question={makeQuestion("poster-rankings") as never}
        value={[]}
        onChange={() => {}}
      />,
    );

    const props = renderRankerMock.mock.calls[0][0] as {
      variant: string;
      layoutPreset: string;
    };
    expect(props.variant).toBe("grid");
    expect(props.layoutPreset).toBe("figma-rank-rectangles");
  });

  it("keeps legacy circle-ranking alias mapping to circle preset", () => {
    render(
      <RankOrderInput
        question={makeQuestion("circle-ranking") as never}
        value={[]}
        onChange={() => {}}
      />,
    );

    const props = renderRankerMock.mock.calls[0][0] as {
      variant: string;
      layoutPreset: string;
    };
    expect(props.variant).toBe("grid");
    expect(props.layoutPreset).toBe("figma-rank-circles");
  });

  it("keeps legacy rectangle-ranking alias mapping to rectangle preset", () => {
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
    expect(props.variant).toBe("grid");
    expect(props.layoutPreset).toBe("figma-rank-rectangles");
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
    const disabledWrap = container.querySelector(".pointer-events-none");
    expect(disabledWrap).toBeTruthy();
  });

  it("passes CDN-resolved font overrides to flashback ranker", () => {
    const question = makeQuestion("circle-ranking");
    question.config = {
      ...question.config,
      rankNumberFontFamily: "Sofia Pro",
      trayLabelFontFamily: "Plymouth Serial",
      shapeScale: 88,
      buttonScale: 122,
    };

    render(
      <RankOrderInput
        question={question as never}
        value={[]}
        onChange={() => {}}
      />,
    );

    const props = renderRankerMock.mock.calls[0][0] as {
      fontOverrides?: Record<string, string>;
      shapeScalePercent?: number;
      buttonScalePercent?: number;
    };
    expect(props.fontOverrides?.rankNumberFontFamily).toContain("Sofia Pro");
    expect(props.fontOverrides?.trayLabelFontFamily).toContain("Plymouth Serial");
    expect(props.shapeScalePercent).toBe(88);
    expect(props.buttonScalePercent).toBe(122);
  });

  it("passes component style overrides for placeholders and unassigned tray", () => {
    const question = makeQuestion("circle-ranking");
    question.config = {
      ...question.config,
      placeholderShapeColor: "#111111",
      placeholderShapeBorderColor: "#222222",
      unassignedContainerColor: "#F4F4F5",
      unassignedContainerBorderColor: "#D4D4D8",
      unassignedCircleBorderColor: "#A1A1AA",
      unassignedCircleSize: 118,
      questionTextColor: "#0F172A",
    };

    render(
      <RankOrderInput
        question={question as never}
        value={[]}
        onChange={() => {}}
      />,
    );

    const props = renderRankerMock.mock.calls[0][0] as {
      styleOverrides?: Record<string, string | number>;
    };
    expect(props.styleOverrides?.circlePlaceholderFillColor).toBe("#111111");
    expect(props.styleOverrides?.circlePlaceholderBorderColor).toBe("#222222");
    expect(props.styleOverrides?.unassignedContainerFillColor).toBe("#F4F4F5");
    expect(props.styleOverrides?.unassignedContainerBorderColor).toBe("#D4D4D8");
    expect(props.styleOverrides?.unassignedItemBorderColor).toBe("#A1A1AA");
    expect(props.styleOverrides?.unassignedItemSizePercent).toBe(118);
    expect(props.styleOverrides?.circlePlaceholderNumberColor).toBe("#0F172A");
  });

  it("shows a warning when required fonts are not in CloudFront CDN", () => {
    const question = makeQuestion("rectangle-ranking");
    question.config = {
      ...question.config,
      rankNumberFontFamily: "Totally Missing Font",
    };

    render(
      <RankOrderInput
        question={question as never}
        value={[]}
        onChange={() => {}}
      />,
    );

    expect(
      screen.getByText("Missing CloudFront CDN fonts: Totally Missing Font"),
    ).toBeInTheDocument();
  });
});
