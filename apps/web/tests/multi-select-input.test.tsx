import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import MultiSelectInput from "@/components/survey/MultiSelectInput";

function makeQuestion(configOverride: Record<string, unknown> = {}) {
  return {
    id: "q-multi",
    survey_id: "survey-1",
    question_key: "watch_time",
    question_text: "When do you watch?",
    question_type: "multi_choice",
    display_order: 1,
    is_required: false,
    config: {
      uiVariant: "multi-select-choice",
      minSelections: 1,
      maxSelections: 2,
      ...configOverride,
    },
    created_at: "",
    updated_at: "",
    options: [
      {
        id: "o1",
        question_id: "q-multi",
        option_key: "live",
        option_text: "Live (or the night it airs)",
        display_order: 1,
        metadata: {},
        created_at: "",
      },
      {
        id: "o2",
        question_id: "q-multi",
        option_key: "day_after",
        option_text: "The day after",
        display_order: 2,
        metadata: {},
        created_at: "",
      },
      {
        id: "o3",
        question_id: "q-multi",
        option_key: "days_later",
        option_text: "2-3 days later",
        display_order: 3,
        metadata: {},
        created_at: "",
      },
    ],
  };
}

describe("MultiSelectInput", () => {
  it("renders figma-style text options by default", () => {
    render(
      <MultiSelectInput
        question={makeQuestion() as never}
        value={[]}
        onChange={() => {}}
      />,
    );

    const live = screen.getByTestId("multi-select-option-live");
    expect(live).toHaveStyle({
      backgroundColor: "rgb(226, 195, 233)",
      color: "rgb(17, 17, 17)",
      fontFamily: '"Plymouth Serial", var(--font-sans), sans-serif',
      textTransform: "uppercase",
    });
  });

  it("toggles selected state on and off", () => {
    function Harness() {
      const [value, setValue] = React.useState<string[] | null>([]);
      return (
        <MultiSelectInput
          question={makeQuestion() as never}
          value={value}
          onChange={setValue}
        />
      );
    }

    render(<Harness />);
    const live = screen.getByTestId("multi-select-option-live");

    fireEvent.click(live);
    expect(live).toHaveAttribute("aria-pressed", "true");
    expect(live).toHaveStyle({
      backgroundColor: "rgb(93, 49, 103)",
      color: "rgb(255, 255, 255)",
    });

    fireEvent.click(live);
    expect(live).toHaveAttribute("aria-pressed", "false");
  });

  it("prevents selecting above maxSelections", () => {
    function Harness() {
      const [value, setValue] = React.useState<string[] | null>([]);
      return (
        <MultiSelectInput
          question={makeQuestion({ maxSelections: 2 }) as never}
          value={value}
          onChange={setValue}
        />
      );
    }

    render(<Harness />);
    const live = screen.getByTestId("multi-select-option-live");
    const dayAfter = screen.getByTestId("multi-select-option-day_after");
    const daysLater = screen.getByTestId("multi-select-option-days_later");

    fireEvent.click(live);
    fireEvent.click(dayAfter);
    fireEvent.click(daysLater);

    expect(live).toHaveAttribute("aria-pressed", "true");
    expect(dayAfter).toHaveAttribute("aria-pressed", "true");
    expect(daysLater).toHaveAttribute("aria-pressed", "false");
  });
});
