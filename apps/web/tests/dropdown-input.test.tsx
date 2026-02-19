import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import DropdownInput from "@/components/survey/DropdownInput";

function makeQuestion() {
  return {
    id: "q-drop",
    survey_id: "survey-1",
    question_key: "drop",
    question_text: "Choose one",
    question_type: "single_choice",
    display_order: 1,
    is_required: false,
    config: {
      uiVariant: "dropdown",
      placeholder: "Select one",
    },
    created_at: "",
    updated_at: "",
    options: [
      {
        id: "o1",
        question_id: "q-drop",
        option_key: "a",
        option_text: "Option A",
        display_order: 1,
        metadata: {},
        created_at: "",
      },
    ],
  };
}

describe("DropdownInput", () => {
  it("allows clearing back to placeholder", () => {
    function Harness() {
      const [value, setValue] = React.useState<string | null>(null);
      return (
        <DropdownInput
          question={makeQuestion() as never}
          value={value}
          onChange={(next) => setValue(next || null)}
        />
      );
    }

    render(<Harness />);

    const select = screen.getByRole("combobox", { name: /choose one/i });
    fireEvent.change(select, { target: { value: "a" } });
    expect((select as HTMLSelectElement).value).toBe("a");

    fireEvent.change(select, { target: { value: "" } });
    expect((select as HTMLSelectElement).value).toBe("");
  });
});

