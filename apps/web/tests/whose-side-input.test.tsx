import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import WhoseSideInput from "@/components/survey/WhoseSideInput";

function makeQuestion() {
  return {
    id: "q-side",
    survey_id: "survey-1",
    question_key: "whose_side",
    question_text: "Whose side are you on?",
    question_type: "single_choice",
    display_order: 1,
    is_required: false,
    config: {
      uiVariant: "two-choice-slider",
      neutralOption: "Neutral",
    },
    created_at: "",
    updated_at: "",
    options: [
      {
        id: "o1",
        question_id: "q-side",
        option_key: "lisa",
        option_text: "Lisa",
        display_order: 1,
        metadata: {},
        created_at: "",
      },
      {
        id: "o2",
        question_id: "q-side",
        option_key: "heather",
        option_text: "Heather",
        display_order: 2,
        metadata: {},
        created_at: "",
      },
      {
        id: "o3",
        question_id: "q-side",
        option_key: "neutral",
        option_text: "Neutral",
        display_order: 3,
        metadata: {},
        created_at: "",
      },
    ],
  };
}

describe("WhoseSideInput", () => {
  it("clears selection when clicking the same side again", () => {
    function Harness() {
      const [value, setValue] = React.useState<string | null>(null);
      return (
        <WhoseSideInput
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

    fireEvent.click(lisa);
    expect(lisa).toHaveAttribute("aria-pressed", "false");
  });
});

