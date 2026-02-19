import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import CastDecisionCardInput from "@/components/survey/CastDecisionCardInput";
import ThreeChoiceSliderInput from "@/components/survey/ThreeChoiceSliderInput";

function makeQuestion(
  configOverride: Record<string, unknown> = {},
  uiVariant: "cast-decision-card" | "three-choice-slider" = "cast-decision-card",
) {
  return {
    id: "q-verdict",
    survey_id: "survey-1",
    question_key: "keep_fire_demote",
    question_text: "For each cast member, should Bravo keep, demote, or fire them?",
    question_type: "likert",
    display_order: 1,
    is_required: true,
    config: {
      uiVariant,
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

describe("CastDecisionCardInput", () => {
  it("renders figma-style prompt and verdict circles for cast-decision-card", () => {
    render(
      <CastDecisionCardInput
        question={makeQuestion() as never}
        value={{}}
        onChange={() => {}}
      />,
    );

    expect(screen.getByText("WOULD YOU KEEP, FIRE OR DEMOTE")).toBeInTheDocument();
    expect(screen.getByText("Whitney Rose")).toBeInTheDocument();
    expect(screen.getByTestId("three-choice-fire")).toBeInTheDocument();
    expect(screen.getByTestId("three-choice-demote")).toBeInTheDocument();
    expect(screen.getByTestId("three-choice-keep")).toBeInTheDocument();
  });

  it("supports legacy three-choice-slider variant through compatibility alias", () => {
    render(
      <ThreeChoiceSliderInput
        question={makeQuestion({}, "three-choice-slider") as never}
        value={{}}
        onChange={() => {}}
      />,
    );

    expect(screen.getByText("WOULD YOU KEEP, FIRE OR DEMOTE")).toBeInTheDocument();
    expect(screen.getByTestId("three-choice-fire")).toBeInTheDocument();
  });

  it("shows selected image state and Next button, then advances rows", () => {
    const handleChange = vi.fn();

    function Harness() {
      const [value, setValue] = React.useState<Record<string, string> | null>({});
      return (
        <CastDecisionCardInput
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
    expect(screen.getByText("KEEP, FIRE OR DEMOTE")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Whitney Rose" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Lisa Barlow")).toBeInTheDocument();
  });

  it("toggles off the current choice when the same circle is clicked again", () => {
    function Harness() {
      const [value, setValue] = React.useState<Record<string, string> | null>({});
      return (
        <CastDecisionCardInput
          question={makeQuestion() as never}
          value={value}
          onChange={setValue}
        />
      );
    }

    render(<Harness />);

    const fireChoice = screen.getByTestId("three-choice-fire");
    fireEvent.click(fireChoice);
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();

    fireEvent.click(fireChoice);
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  });

  it("shrinks demote text by 1px when selected", () => {
    function Harness() {
      const [value, setValue] = React.useState<Record<string, string> | null>({});
      return (
        <CastDecisionCardInput
          question={makeQuestion() as never}
          value={value}
          onChange={setValue}
        />
      );
    }

    render(<Harness />);

    const demoteButton = screen.getByTestId("three-choice-demote");
    const keepButton = screen.getByTestId("three-choice-keep");
    fireEvent.click(demoteButton);

    const demoteLabel = within(demoteButton).getByText("Demote");
    const keepLabel = within(keepButton).getByText("Keep");
    const demoteSize = Number.parseInt(demoteLabel.style.fontSize, 10);
    const keepSize = Number.parseInt(keepLabel.style.fontSize, 10);

    expect(demoteSize).toBe(keepSize - 1);
  });

  it("uses two-choice prompt for bring back / keep gone cards", () => {
    const question = makeQuestion({
      choices: [
        { value: "bring_back", label: "Bring Back" },
        { value: "keep_gone", label: "Keep Gone" },
      ],
      rows: [{ id: "monica", label: "Monica Garcia" }],
    });
    question.options = [
      {
        id: "o1",
        question_id: "q-verdict",
        option_key: "bring_back",
        option_text: "Bring Back",
        display_order: 1,
        metadata: {},
        created_at: "",
      },
      {
        id: "o2",
        question_id: "q-verdict",
        option_key: "keep_gone",
        option_text: "Keep Gone",
        display_order: 2,
        metadata: {},
        created_at: "",
      },
    ];

    render(
      <CastDecisionCardInput
        question={question as never}
        value={{}}
        onChange={() => {}}
      />,
    );

    expect(screen.getByText("BRING BACK OR KEEP GONE")).toBeInTheDocument();
    expect(screen.getByTestId("three-choice-bring-back")).toBeInTheDocument();
    expect(screen.getByTestId("three-choice-keep-gone")).toBeInTheDocument();
  });

  it("shows Continue for single-row keep/fire/demote after a selection", () => {
    const singleRow = makeQuestion({
      rows: [{ id: "whitney", label: "Whitney Rose", img: "/images/cast/rhoslc-s6/whitney.png" }],
    });

    function Harness() {
      const [value, setValue] = React.useState<Record<string, string> | null>({});
      return (
        <CastDecisionCardInput
          question={singleRow as never}
          value={value}
          onChange={setValue}
        />
      );
    }

    render(<Harness />);
    fireEvent.click(screen.getByTestId("three-choice-fire"));

    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  });

  it("uses Canva template fonts when they exist in CloudFront CDN list", () => {
    render(
      <CastDecisionCardInput
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
      fontFamily: '"Plymouth Serial", var(--font-sans), sans-serif',
    });
    expect(screen.getByTestId("three-choice-cast-name")).toHaveStyle({
      fontFamily: '"Geometric Slabserif 703", var(--font-sans), sans-serif',
    });
    expect(screen.queryByTestId("three-choice-missing-fonts")).not.toBeInTheDocument();
  });

  it("shows missing-font warning when Canva template fonts are not on CloudFront CDN", () => {
    render(
      <CastDecisionCardInput
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
