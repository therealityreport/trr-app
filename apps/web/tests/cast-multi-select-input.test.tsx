import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CastMultiSelectInput from "@/components/survey/CastMultiSelectInput";

function makeQuestion(configOverride: Record<string, unknown> = {}) {
  return {
    id: "q-cast-multi",
    survey_id: "survey-1",
    question_key: "which_feud",
    question_text: "Which FEUD did you enjoy the most?",
    question_type: "multi_choice",
    display_order: 1,
    is_required: true,
    config: {
      uiVariant: "cast-multi-select",
      minSelections: 2,
      maxSelections: 2,
      ...configOverride,
    },
    created_at: "",
    updated_at: "",
    options: [
      { id: "o1", question_id: "q-cast-multi", option_key: "lisa", option_text: "Lisa", display_order: 1, metadata: {}, created_at: "" },
      { id: "o2", question_id: "q-cast-multi", option_key: "meredith", option_text: "Meredith", display_order: 2, metadata: {}, created_at: "" },
      { id: "o3", question_id: "q-cast-multi", option_key: "heather", option_text: "Heather", display_order: 3, metadata: {}, created_at: "" },
    ],
  };
}

describe("CastMultiSelectInput", () => {
  it("renders figma-style heading/subheading defaults", () => {
    render(
      <CastMultiSelectInput
        question={makeQuestion() as never}
        value={[]}
        onChange={() => {}}
      />,
    );

    expect(screen.getByText("Which FEUD did you enjoy the most?")).toBeInTheDocument();
    expect(screen.getByText("SELECT TWO")).toBeInTheDocument();
    expect(screen.getByTestId("cast-multi-select-root")).toHaveStyle({
      backgroundColor: "rgb(93, 49, 103)",
    });
  });

  it("shows Continue only after two selections and hides it when deselected", () => {
    function Harness() {
      const [value, setValue] = React.useState<string[] | null>([]);
      return (
        <CastMultiSelectInput
          question={makeQuestion() as never}
          value={value}
          onChange={(next) => setValue(next)}
        />
      );
    }

    render(<Harness />);
    expect(screen.queryByTestId("cast-multi-select-continue")).not.toBeInTheDocument();

    const lisa = screen.getByTestId("cast-multi-select-option-lisa");
    const meredith = screen.getByTestId("cast-multi-select-option-meredith");

    fireEvent.click(lisa);
    expect(screen.queryByTestId("cast-multi-select-continue")).not.toBeInTheDocument();

    fireEvent.click(meredith);
    expect(screen.getByTestId("cast-multi-select-continue")).toBeInTheDocument();

    fireEvent.click(lisa);
    expect(screen.queryByTestId("cast-multi-select-continue")).not.toBeInTheDocument();
  });

  it("honors maxSelections by preventing a third selection", () => {
    function Harness() {
      const [value, setValue] = React.useState<string[] | null>([]);
      return (
        <CastMultiSelectInput
          question={makeQuestion() as never}
          value={value}
          onChange={(next) => setValue(next)}
        />
      );
    }

    render(<Harness />);
    const lisa = screen.getByTestId("cast-multi-select-option-lisa");
    const meredith = screen.getByTestId("cast-multi-select-option-meredith");
    const heather = screen.getByTestId("cast-multi-select-option-heather");

    fireEvent.click(lisa);
    fireEvent.click(meredith);
    fireEvent.click(heather);

    expect(lisa).toHaveAttribute("aria-pressed", "true");
    expect(meredith).toHaveAttribute("aria-pressed", "true");
    expect(heather).toHaveAttribute("aria-pressed", "false");
  });
});
