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
        option_key: "disagree",
        option_text: "Disagree",
        display_order: 1,
        metadata: {},
        created_at: "",
      },
      {
        id: "o2",
        question_id: "q-agree",
        option_key: "agree",
        option_text: "Agree",
        display_order: 2,
        metadata: {},
        created_at: "",
      },
    ],
  };
}

function makeThreeChoiceQuestion() {
  return {
    id: "q-verdict",
    survey_id: "survey-1",
    question_key: "cast_verdict",
    question_text: "For each cast member, should Bravo keep, demote, or fire them?",
    question_type: "likert",
    display_order: 2,
    is_required: true,
    config: {
      uiVariant: "three-choice-slider",
      rows: [{ id: "whitney", label: "Whitney Rose" }],
      choices: [
        { value: "fire", label: "Fire" },
        { value: "demote", label: "Demote" },
        { value: "keep", label: "Keep" },
      ],
    },
    created_at: "",
    updated_at: "",
    options: [
      {
        id: "o1",
        question_id: "q-verdict",
        option_key: "fire",
        option_text: "Fire",
        display_order: 1,
        metadata: {},
        created_at: "",
      },
      {
        id: "o2",
        question_id: "q-verdict",
        option_key: "demote",
        option_text: "Demote",
        display_order: 2,
        metadata: {},
        created_at: "",
      },
      {
        id: "o3",
        question_id: "q-verdict",
        option_key: "keep",
        option_text: "Keep",
        display_order: 3,
        metadata: {},
        created_at: "",
      },
    ],
  };
}

describe("MatrixLikertInput", () => {
  it("applies CDN-resolved font overrides to row and column labels", () => {
    render(
      <MatrixLikertInput
        question={makeQuestion({
          rowLabelFontFamily: "Sofia Pro",
          columnLabelFontFamily: "Plymouth Serial",
        }) as never}
        value={{}}
        onChange={() => {}}
      />,
    );

    expect(screen.getByTestId("agree-likert-prompt")).toHaveStyle({
      fontFamily: "\"Plymouth Serial\", var(--font-sans), sans-serif",
    });
    expect(screen.getByText("Statement one")).toHaveStyle({
      fontFamily: "\"Sofia Pro\", var(--font-sans), sans-serif",
    });
    expect(screen.getByRole("button", { name: "Select Disagree for Statement one" })).toHaveStyle({
      fontFamily: "\"Plymouth Serial\", var(--font-sans), sans-serif",
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

    fireEvent.click(screen.getByRole("button", { name: "Select Agree for Statement one" }));
    fireEvent.click(screen.getByRole("button", { name: "Select Disagree for Statement two" }));

    expect(updates).toContainEqual({ s1: "agree" });
    expect(updates).toContainEqual({ s1: "agree", s2: "disagree" });
  });

  it("uses figma keep/fire/demote heading for three-choice slider layout", () => {
    render(
      <MatrixLikertInput
        question={makeThreeChoiceQuestion() as never}
        value={{}}
        onChange={() => {}}
      />,
    );

    expect(screen.getByText("KEEP, FIRE OR DEMOTE")).toBeInTheDocument();
    const fireButton = screen.getByRole("button", { name: "Select Fire for Whitney Rose" });
    expect(fireButton).toHaveStyle({
      borderRadius: "9999px",
      backgroundColor: "rgb(179, 0, 11)",
    });
  });

  it("applies shape and button scale overrides for three-choice slider buttons", () => {
    const question = makeThreeChoiceQuestion();
    question.config = {
      ...question.config,
      shapeScale: 70,
      buttonScale: 130,
    };

    render(
      <MatrixLikertInput
        question={question as never}
        value={{}}
        onChange={() => {}}
      />,
    );

    const fireButton = screen.getByRole("button", { name: "Select Fire for Whitney Rose" });
    const fireLabel = within(fireButton).getByText("Fire");

    expect(Number.parseInt(fireButton.style.width, 10)).toBeGreaterThan(50);
    expect(Number.parseInt(fireButton.style.width, 10)).toBeLessThan(90);
    expect(Number.parseInt(fireLabel.style.fontSize, 10)).toBeGreaterThan(20);
  });
});
