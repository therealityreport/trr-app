import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import SingleSelectCastInput from "@/components/survey/SingleSelectCastInput";

function makeQuestion(configOverride: Record<string, unknown> = {}) {
  return {
    id: "q-cast-single",
    survey_id: "survey-1",
    question_key: "who_funniest",
    question_text: "Who was the FUNNIEST this season?",
    question_type: "single_choice",
    display_order: 1,
    is_required: true,
    config: {
      uiVariant: "cast-single-select",
      columns: 4,
      ...configOverride,
    },
    created_at: "",
    updated_at: "",
    options: [
      { id: "o1", question_id: "q-cast-single", option_key: "lisa", option_text: "Lisa", display_order: 1, metadata: {}, created_at: "" },
      { id: "o2", question_id: "q-cast-single", option_key: "meredith", option_text: "Meredith", display_order: 2, metadata: {}, created_at: "" },
      { id: "o3", question_id: "q-cast-single", option_key: "heather", option_text: "Heather", display_order: 3, metadata: {}, created_at: "" },
    ],
  };
}

describe("SingleSelectCastInput", () => {
  it("renders figma-style heading defaults", () => {
    render(
      <SingleSelectCastInput
        question={makeQuestion() as never}
        value={null}
        onChange={() => {}}
      />,
    );

    expect(screen.getByText("Who was the FUNNIEST this season?")).toBeInTheDocument();
    expect(screen.getByTestId("cast-single-select-root")).toHaveStyle({
      backgroundColor: "rgb(93, 49, 103)",
    });
  });

  it("shows Continue after one selection and hides after unselect", () => {
    function Harness() {
      const [value, setValue] = React.useState<string | null>(null);
      return (
        <SingleSelectCastInput
          question={makeQuestion() as never}
          value={value}
          onChange={(next) => setValue(next)}
        />
      );
    }

    render(<Harness />);
    expect(screen.queryByTestId("cast-single-select-continue")).not.toBeInTheDocument();

    const lisa = screen.getByTestId("cast-single-select-option-lisa");
    fireEvent.click(lisa);
    expect(lisa).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("cast-single-select-continue")).toBeInTheDocument();

    fireEvent.click(lisa);
    expect(lisa).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByTestId("cast-single-select-continue")).not.toBeInTheDocument();
  });
});
