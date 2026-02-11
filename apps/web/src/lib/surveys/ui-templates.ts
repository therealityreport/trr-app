"use client";

import type { SurveyQuestion } from "@/lib/surveys/normalized-types";
import type { QuestionType } from "@/lib/surveys/normalized-types";
import type { QuestionConfig, UiVariant } from "@/lib/surveys/question-config-types";
import { inferUiVariant } from "@/lib/surveys/question-config-types";

export interface UiTemplateSeedOption {
  option_key: string;
  option_text: string;
  metadata?: Record<string, unknown>;
}

export interface UiTemplate {
  uiVariant: UiVariant;
  label: string;
  description: string;
  questionType: QuestionType;
  defaultConfig: QuestionConfig;
  seedOptions?: UiTemplateSeedOption[];
  /** Whether this template expects config.rows to be populated (matrix-like questions). */
  usesRows?: boolean;
}

export const UI_TEMPLATES: UiTemplate[] = [
  {
    uiVariant: "numeric-ranking",
    label: "Star rating (0-10)",
    description: "10-star rating with partial fills + slider + text entry.",
    questionType: "numeric",
    defaultConfig: {
      uiVariant: "numeric-ranking",
      min: 0,
      max: 10,
      step: 0.1,
      labels: { min: "0", max: "10" },
    },
  },
  {
    uiVariant: "numeric-scale-slider",
    label: "Numeric slider",
    description: "Numeric scale slider with min/max labels.",
    questionType: "numeric",
    defaultConfig: {
      uiVariant: "numeric-scale-slider",
      min: 0,
      max: 10,
      step: 1,
      minLabel: "Low",
      maxLabel: "High",
    },
  },
  {
    uiVariant: "text-entry",
    label: "Text entry",
    description: "Free text input.",
    questionType: "free_text",
    defaultConfig: {
      uiVariant: "text-entry",
      inputType: "text",
      placeholder: "",
    },
  },
  {
    uiVariant: "text-multiple-choice",
    label: "Single select (text)",
    description: "Single-choice list of text options.",
    questionType: "single_choice",
    defaultConfig: {
      uiVariant: "text-multiple-choice",
    },
  },
  {
    uiVariant: "image-multiple-choice",
    label: "Single select (image grid)",
    description: "Single-choice grid of options (supports option metadata imagePath/imageUrl).",
    questionType: "single_choice",
    defaultConfig: {
      uiVariant: "image-multiple-choice",
      columns: 3,
    },
  },
  {
    uiVariant: "dropdown",
    label: "Dropdown",
    description: "Single-choice dropdown.",
    questionType: "single_choice",
    defaultConfig: {
      uiVariant: "dropdown",
      placeholder: "Select an option…",
    },
  },
  {
    uiVariant: "multi-select-choice",
    label: "Multi-select",
    description: "Multi-select checkboxes.",
    questionType: "multi_choice",
    defaultConfig: {
      uiVariant: "multi-select-choice",
      minSelections: 0,
      maxSelections: undefined,
    },
  },
  {
    uiVariant: "rectangle-ranking",
    label: "Ranking (list)",
    description: "Drag-and-drop ranking list.",
    questionType: "ranking",
    defaultConfig: {
      uiVariant: "rectangle-ranking",
      lineLabelTop: "BEST",
      lineLabelBottom: "WORST",
    },
  },
  {
    uiVariant: "circle-ranking",
    label: "Ranking (grid)",
    description: "Drag-and-drop ranking grid.",
    questionType: "ranking",
    defaultConfig: {
      uiVariant: "circle-ranking",
      lineLabelTop: "BEST",
      lineLabelBottom: "WORST",
    },
  },
  {
    uiVariant: "two-choice-slider",
    label: "Two-choice slider",
    description: "Two-sided choice UI (option images supported via metadata imagePath/imageUrl).",
    questionType: "single_choice",
    defaultConfig: {
      uiVariant: "two-choice-slider",
      neutralOption: undefined,
    },
  },
  {
    uiVariant: "two-axis-grid",
    label: "Two-axis grid",
    description: "Place subjects on a 2D grid. Provide config.rows or add question options.",
    questionType: "likert",
    defaultConfig: {
      uiVariant: "two-axis-grid",
      extent: 5,
      xLabelLeft: "Left",
      xLabelRight: "Right",
      yLabelBottom: "Bottom",
      yLabelTop: "Top",
      rows: [],
    },
    usesRows: true,
  },
  {
    uiVariant: "agree-likert-scale",
    label: "Likert matrix (agree/disagree)",
    description: "Matrix: rows are statements (config.rows), columns are options.",
    questionType: "likert",
    defaultConfig: {
      uiVariant: "agree-likert-scale",
      rows: [],
    },
    seedOptions: [
      { option_key: "strongly_disagree", option_text: "Strongly disagree" },
      { option_key: "disagree", option_text: "Disagree" },
      { option_key: "neutral", option_text: "Neutral" },
      { option_key: "agree", option_text: "Agree" },
      { option_key: "strongly_agree", option_text: "Strongly agree" },
    ],
    usesRows: true,
  },
  {
    uiVariant: "three-choice-slider",
    label: "3-choice matrix",
    description: "Matrix: rows are subjects (config.rows), columns are the choices (options).",
    questionType: "likert",
    defaultConfig: {
      uiVariant: "three-choice-slider",
      choices: [
        { value: "keep", label: "Keep" },
        { value: "demote", label: "Demote" },
        { value: "fire", label: "Fire" },
      ],
      rows: [],
    },
    seedOptions: [
      { option_key: "keep", option_text: "Keep" },
      { option_key: "demote", option_text: "Demote" },
      { option_key: "fire", option_text: "Fire" },
    ],
    usesRows: true,
  },
];

const TEMPLATE_BY_VARIANT = new Map<UiVariant, UiTemplate>(
  UI_TEMPLATES.map((t) => [t.uiVariant, t]),
);

export function getUiTemplate(uiVariant: UiVariant): UiTemplate | undefined {
  return TEMPLATE_BY_VARIANT.get(uiVariant);
}

export function getQuestionUiVariant(question: SurveyQuestion): UiVariant {
  const config = question.config as Record<string, unknown> | null | undefined;
  const raw = config?.uiVariant;
  if (typeof raw === "string") return raw as UiVariant;
  return inferUiVariant(question.question_type);
}

export function uiVariantLabel(uiVariant: UiVariant): string {
  const template = getUiTemplate(uiVariant);
  if (template) return template.label;
  // Fallback for any variants not in the picker yet.
  return uiVariant;
}

