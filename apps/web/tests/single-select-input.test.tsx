import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import SingleSelectInput from "@/components/survey/SingleSelectInput";

function makeQuestion() {
  return {
    id: "q-single",
    survey_id: "survey-1",
    question_key: "fav_housewife",
    question_text: "Who is your favorite?",
    question_type: "single_choice",
    display_order: 1,
    is_required: false,
    config: { uiVariant: "text-multiple-choice" },
    created_at: "",
    updated_at: "",
    options: [
      {
        id: "o1",
        question_id: "q-single",
        option_key: "lisa",
        option_text: "Lisa",
        display_order: 1,
        metadata: {},
        created_at: "",
      },
      {
        id: "o2",
        question_id: "q-single",
        option_key: "heather",
        option_text: "Heather",
        display_order: 2,
        metadata: {},
        created_at: "",
      },
    ],
  };
}

describe("SingleSelectInput", () => {
  it("renders figma-style text options for text-multiple-choice", () => {
    render(
      <SingleSelectInput
        question={makeQuestion() as never}
        value={null}
        onChange={() => {}}
      />,
    );

    const lisa = screen.getByTestId("single-select-option-lisa");
    expect(lisa).toHaveStyle({
      backgroundColor: "rgb(226, 195, 233)",
      color: "rgb(17, 17, 17)",
      fontFamily: '"Plymouth Serial", var(--font-sans), sans-serif',
      textTransform: "uppercase",
    });
  });

  it("clears selection when clicking the currently selected option", () => {
    function Harness() {
      const [value, setValue] = React.useState<string | null>(null);
      return (
        <SingleSelectInput
          question={makeQuestion() as never}
          value={value}
          onChange={(next) => setValue(next || null)}
        />
      );
    }

    render(<Harness />);

    const lisa = screen.getByRole("button", { name: /lisa/i });
    fireEvent.click(lisa);
    expect(lisa).toHaveAttribute("aria-pressed", "true");
    expect(lisa).toHaveStyle({
      backgroundColor: "rgb(93, 49, 103)",
      color: "rgb(255, 255, 255)",
    });

    fireEvent.click(lisa);
    expect(lisa).toHaveAttribute("aria-pressed", "false");
  });
});
