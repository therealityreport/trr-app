import { describe, it, expect } from "vitest";
import { isQuestionComplete } from "@/components/survey/isQuestionComplete";

describe("isQuestionComplete", () => {
  it("treats numeric 0 as complete", () => {
    const question = {
      id: "q1",
      survey_id: "s1",
      question_key: "n",
      question_text: "Numeric",
      question_type: "numeric",
      display_order: 0,
      is_required: true,
      config: { uiVariant: "numeric-scale-slider", min: 0, max: 10, minLabel: "A", maxLabel: "B" },
      created_at: "",
      updated_at: "",
      options: [],
    } as any;

    expect(isQuestionComplete(question, 0)).toBe(true);
  });

  it("requires all rows for matrix-likert variants", () => {
    const question = {
      id: "q1",
      survey_id: "s1",
      question_key: "m",
      question_text: "Matrix",
      question_type: "likert",
      display_order: 0,
      is_required: true,
      config: {
        uiVariant: "agree-likert-scale",
        rows: [
          { id: "r1", label: "Row 1" },
          { id: "r2", label: "Row 2" },
        ],
      },
      created_at: "",
      updated_at: "",
      options: [
        { id: "o1", question_id: "q1", option_key: "yes", option_text: "Yes", display_order: 0, metadata: {}, created_at: "", updated_at: "" },
      ],
    } as any;

    expect(isQuestionComplete(question, { r1: "yes" })).toBe(false);
    expect(isQuestionComplete(question, { r1: "yes", r2: "yes" })).toBe(true);
  });

  it("requires all subjects for two-axis-grid", () => {
    const question = {
      id: "q1",
      survey_id: "s1",
      question_key: "g",
      question_text: "Grid",
      question_type: "likert",
      display_order: 0,
      is_required: true,
      config: {
        uiVariant: "two-axis-grid",
        extent: 5,
        xLabelLeft: "LEFT",
        xLabelRight: "RIGHT",
        yLabelBottom: "BOTTOM",
        yLabelTop: "TOP",
        rows: [
          { id: "a", label: "A", img: "" },
          { id: "b", label: "B", img: "" },
        ],
      },
      created_at: "",
      updated_at: "",
      options: [],
    } as any;

    expect(isQuestionComplete(question, { a: { x: 0, y: 0 } })).toBe(false);
    expect(isQuestionComplete(question, { a: { x: 0, y: 0 }, b: { x: 5, y: -5 } })).toBe(true);
  });
});

