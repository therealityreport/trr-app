import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ThreeChoiceSliderInput from "@/components/survey/ThreeChoiceSliderInput";

function makeQuestion(configOverride: Record<string, unknown> = {}) {
  return {
    id: "q-verdict",
    survey_id: "survey-1",
    question_key: "keep_fire_demote",
    question_text: "For each cast member, should Bravo keep, demote, or fire them?",
    question_type: "likert",
    display_order: 1,
    is_required: true,
    config: {
      uiVariant: "three-choice-slider",
      choices: [
        { value: "fire", label: "Fire" },
        { value: "demote", label: "Demote" },
        { value: "keep", label: "Keep" },
      ],
      rows: [
        { id: "whitney", label: "Whitney Rose", img: "/images/cast/rhoslc-s6/whitney.png" },
        { id: "lisa", label: "Lisa Barlow", img: "/images/cast/rhoslc-s6/lisa.png" },
      ],
      ...configOverride,
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

describe("ThreeChoiceSliderInput", () => {
  it("renders Figma-style prompt and verdict circles", () => {
    render(
      <ThreeChoiceSliderInput
        question={makeQuestion() as never}
        value={{}}
        onChange={() => {}}
      />,
    );

    expect(screen.getByText("KEEP, FIRE OR DEMOTE")).toBeInTheDocument();
    expect(screen.getByText("Whitney Rose")).toBeInTheDocument();
    expect(screen.getByTestId("three-choice-fire")).toBeInTheDocument();
    expect(screen.getByTestId("three-choice-demote")).toBeInTheDocument();
    expect(screen.getByTestId("three-choice-keep")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  });

  it("shows selected image state and Next button, then advances rows", () => {
    const handleChange = vi.fn();

    function Harness() {
      const [value, setValue] = React.useState<Record<string, string> | null>({});
      return (
        <ThreeChoiceSliderInput
          question={makeQuestion() as never}
          value={value}
          onChange={(next) => {
            handleChange(next);
            setValue(next);
          }}
        />
      );
    }

    render(<Harness />);
    fireEvent.click(screen.getByTestId("three-choice-fire"));

    expect(handleChange).toHaveBeenCalledWith({ whitney: "fire" });
    expect(screen.getByRole("img", { name: "Whitney Rose" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Lisa Barlow")).toBeInTheDocument();
  });

  it("uses Canva template fonts when they exist in CloudFront CDN list", () => {
    render(
      <ThreeChoiceSliderInput
        question={makeQuestion({
          promptFontFamily: "Plymouth Serial",
          castNameFontFamily: "GeoSlab703_Md_BT",
          choiceFontFamily: "Hamburg Serial",
          nextButtonFontFamily: "Plymouth Serial",
        }) as never}
        value={{}}
        onChange={() => {}}
      />,
    );

    expect(screen.getByTestId("three-choice-prompt")).toHaveStyle({
      fontFamily: "\"Plymouth Serial\", var(--font-sans), sans-serif",
    });
    expect(screen.getByTestId("three-choice-cast-name")).toHaveStyle({
      fontFamily: "\"Geometric Slabserif 703\", var(--font-sans), sans-serif",
    });
    expect(screen.queryByTestId("three-choice-missing-fonts")).not.toBeInTheDocument();
  });

  it("shows missing-font warning when Canva template fonts are not on CloudFront CDN", () => {
    render(
      <ThreeChoiceSliderInput
        question={makeQuestion({
          promptFontFamily: "Canva Mystery Serif",
          canvaFonts: ["Canva Mystery Serif", "Another Missing Font", "Plymouth Serial"],
        }) as never}
        value={{}}
        onChange={() => {}}
      />,
    );

    expect(screen.getByTestId("three-choice-missing-fonts")).toHaveTextContent(
      "Missing CloudFront CDN fonts: Canva Mystery Serif, Another Missing Font",
    );
  });
});
