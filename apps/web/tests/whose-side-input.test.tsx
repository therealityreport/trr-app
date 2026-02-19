import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import TwoChoiceCast from "@/components/survey/TwoChoiceCast";

function makeQuestion(configOverride: Record<string, unknown> = {}) {
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
      ...configOverride,
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

describe("TwoChoiceCast", () => {
  it("uses figma-inspired card defaults for background and heading tone", () => {
    render(
      <TwoChoiceCast
        question={makeQuestion() as never}
        value={null}
        onChange={() => {}}
      />,
    );

    expect(screen.getByTestId("two-choice-cast-root")).toHaveStyle({
      backgroundColor: "rgb(248, 248, 248)",
    });
    expect(screen.getByTestId("two-choice-cast-panel")).toHaveStyle({
      backgroundColor: "rgb(200, 200, 203)",
    });
    expect(screen.getByRole("heading", { name: /whose side are you on/i })).toHaveStyle({
      color: "rgb(17, 17, 17)",
    });
    expect(screen.queryByTestId("two-choice-cast-neutral")).not.toBeInTheDocument();
  });

  it("clears selection when clicking the same side again", () => {
    function Harness() {
      const [value, setValue] = React.useState<string | null>(null);
      return (
        <TwoChoiceCast
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

  it("shows Continue only after a selection and hides it when unselected", () => {
    function Harness() {
      const [value, setValue] = React.useState<string | null>(null);
      return (
        <TwoChoiceCast
          question={makeQuestion() as never}
          value={value}
          onChange={(next) => setValue(next || null)}
        />
      );
    }

    render(<Harness />);
    expect(screen.queryByTestId("two-choice-cast-continue")).not.toBeInTheDocument();

    const lisa = screen.getByRole("button", { name: /lisa/i });
    fireEvent.click(lisa);
    const continueButton = screen.getByTestId("two-choice-cast-continue");
    expect(continueButton).toHaveTextContent("Continue");
    expect(continueButton).toHaveStyle({
      fontFamily: '"Plymouth Serial", var(--font-sans), sans-serif',
    });

    fireEvent.click(lisa);
    expect(screen.queryByTestId("two-choice-cast-continue")).not.toBeInTheDocument();
  });

  it("uses selected glow styling and desaturates the unselected portrait", () => {
    const question = makeQuestion();
    question.options[0]!.metadata = { imagePath: "/images/cast/rhoslc-s6/lisa.png" };
    question.options[1]!.metadata = { imagePath: "/images/cast/rhoslc-s6/heather.png" };

    const { rerender } = render(
      <TwoChoiceCast
        question={question as never}
        value={null}
        onChange={() => {}}
      />,
    );
    rerender(
      <TwoChoiceCast
        question={question as never}
        value={"lisa"}
        onChange={() => {}}
      />,
    );

    const lisaButton = screen.getByRole("button", { name: /lisa/i });
    const heatherButton = screen.getByRole("button", { name: /heather/i });
    expect((lisaButton as HTMLButtonElement).style.boxShadow).not.toBe("none");
    expect((heatherButton as HTMLButtonElement).style.boxShadow).toBe("none");

    const lisaImage = screen.getByAltText("Lisa");
    const heatherImage = screen.getByAltText("Heather");
    expect(lisaImage.className).not.toContain("grayscale");
    expect(heatherImage.className).toContain("grayscale");
  });
});
