import React from "react";
import { describe, it, expect } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import MatrixLikertInput from "@/components/survey/MatrixLikertInput";

function makeQuestion(configOverride: Record<string, unknown> = {}) {
  return {
    id: "q-agree",
    survey_id: "survey-1",
    question_key: "agree_scale",
    question_text: "How strongly do you agree?",
    question_type: "likert",
    display_order: 1,
    is_required: true,
    config: {
      uiVariant: "agree-likert-scale",
      rows: [
        { id: "s1", label: "Statement one" },
        { id: "s2", label: "Statement two" },
      ],
      ...configOverride,
    },
    created_at: "",
    updated_at: "",
    options: [
      {
        id: "o1",
        question_id: "q-agree",
        option_key: "strongly_disagree",
        option_text: "Strongly Disagree",
        display_order: 1,
        metadata: {},
        created_at: "",
      },
      {
        id: "o2",
        question_id: "q-agree",
        option_key: "somewhat_disagree",
        option_text: "Somewhat Disagree",
        display_order: 2,
        metadata: {},
        created_at: "",
      },
      {
        id: "o3",
        question_id: "q-agree",
        option_key: "neutral",
        option_text: "Neither",
        display_order: 3,
        metadata: {},
        created_at: "",
      },
      {
        id: "o4",
        question_id: "q-agree",
        option_key: "somewhat_agree",
        option_text: "Somewhat Agree",
        display_order: 4,
        metadata: {},
        created_at: "",
      },
      {
        id: "o5",
        question_id: "q-agree",
        option_key: "strongly_agree",
        option_text: "Strongly Agree",
        display_order: 5,
        metadata: {},
        created_at: "",
      },
    ],
  };
}

describe("MatrixLikertInput", () => {
  it("applies CDN-resolved font overrides to prompt, statement, and options", () => {
    render(
      <MatrixLikertInput
        question={makeQuestion({
          subTextHeadingFontFamily: "Gloucester",
          rowLabelFontFamily: "Rude Slab Condensed",
          optionTextFontFamily: "Plymouth Serial",
        }) as never}
        value={{}}
        onChange={() => {}}
      />,
    );

    expect(screen.getByTestId("agree-likert-prompt")).toHaveStyle({
      fontFamily: '"Gloucester", var(--font-sans), sans-serif',
    });
    expect(screen.getByText("Statement one")).toHaveStyle({
      fontFamily: '"Rude Slab Condensed", var(--font-sans), sans-serif',
    });
    expect(screen.getByRole("button", { name: "Select Strongly Agree for Statement one" })).toHaveStyle({
      fontFamily: '"Plymouth Serial", var(--font-sans), sans-serif',
    });
    expect(screen.queryByTestId("matrix-likert-missing-fonts")).not.toBeInTheDocument();
  });

  it("shows warning when required fonts are missing from CloudFront CDN", () => {
    render(
      <MatrixLikertInput
        question={makeQuestion({
          rowLabelFontFamily: "Totally Missing Font",
          canvaFonts: ["Totally Missing Font"],
        }) as never}
        value={{}}
        onChange={() => {}}
      />,
    );

    expect(screen.getByTestId("matrix-likert-missing-fonts")).toHaveTextContent(
      "Missing CloudFront CDN fonts: Totally Missing Font",
    );
  });

  it("stores per-row selection values when options are clicked", () => {
    const updates: Array<Record<string, string>> = [];

    function Harness() {
      const [value, setValue] = React.useState<Record<string, string> | null>({});
      return (
        <MatrixLikertInput
          question={makeQuestion() as never}
          value={value}
          onChange={(next) => {
            updates.push(next);
            setValue(next);
          }}
        />
      );
    }

    render(<Harness />);
    expect(screen.queryByTestId("agree-likert-continue")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Select Somewhat Agree for Statement one" }));
    expect(screen.getByTestId("agree-likert-continue")).toHaveTextContent("Continue");
    fireEvent.click(screen.getByRole("button", { name: "Select Strongly Disagree for Statement two" }));

    expect(updates).toContainEqual({ s1: "somewhat_agree" });
    expect(updates).toContainEqual({ s1: "somewhat_agree", s2: "strongly_disagree" });
  });

  it("orders and colors options in figma agree-to-disagree sequence", () => {
    const question = makeQuestion();
    question.options = [...question.options].reverse();

    render(
      <MatrixLikertInput
        question={question as never}
        value={{}}
        onChange={() => {}}
      />,
    );

    const row = screen.getByTestId("agree-likert-row-s1");
    const buttons = within(row).getAllByRole("button");
    expect(buttons).toHaveLength(5);

    expect(buttons[0]).toHaveTextContent("Strongly Agree");
    expect(buttons[0]).toHaveStyle({ backgroundColor: "rgb(53, 106, 59)" });

    expect(buttons[4]).toHaveTextContent("Strongly Disagree");
    expect(buttons[4]).toHaveStyle({ backgroundColor: "rgb(153, 6, 10)" });
  });

  it("applies shape and button scale overrides to bars and labels", () => {
    render(
      <MatrixLikertInput
        question={makeQuestion({ shapeScale: 70, buttonScale: 130 }) as never}
        value={{}}
        onChange={() => {}}
      />,
    );

    const button = screen.getByRole("button", { name: "Select Strongly Agree for Statement one" });
    const label = within(button).getByText("Strongly Agree");

    expect(Number.parseInt(button.style.borderRadius, 10)).toBeGreaterThanOrEqual(7);
    expect(Number.parseInt(button.style.minHeight, 10)).toBeGreaterThan(40);
    expect(Number.parseInt(label.style.fontSize, 10)).toBeGreaterThanOrEqual(12);
  });
});
