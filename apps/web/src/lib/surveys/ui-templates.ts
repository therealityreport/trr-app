"use client";

import type { SurveyQuestion } from "@/lib/surveys/normalized-types";
import type { QuestionType } from "@/lib/surveys/normalized-types";
import type { QuestionConfig, UiVariant } from "@/lib/surveys/question-config-types";
import { canonicalizeRankingVariant, inferUiVariant } from "@/lib/surveys/question-config-types";

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
    uiVariant: "rank-text-fields",
    label: "Rank Text Fields",
    description: "Figma tagline rank template with bold text-field choices.",
    questionType: "single_choice",
    defaultConfig: {
      uiVariant: "rank-text-fields",
      questionTextFontFamily: "\"Rude Slab Condensed\", var(--font-sans), sans-serif",
      optionTextFontFamily: "\"Plymouth Serial\", var(--font-sans), sans-serif",
      componentBackgroundColor: "#E2C3E9",
      selectedOptionBackgroundColor: "#5D3167",
      questionTextColor: "#111111",
      optionTextColor: "#111111",
      selectedOptionTextColor: "#FFFFFF",
    },
    seedOptions: [
      { option_key: "choice_1", option_text: "Answer Choice 1" },
      { option_key: "choice_2", option_text: "Answer Choice 2" },
      { option_key: "choice_3", option_text: "Answer Choice 3" },
      { option_key: "choice_4", option_text: "Answer Choice 4" },
    ],
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
    uiVariant: "poster-single-select",
    label: "PosterSingleSelect",
    description: "Single-choice 2x3 poster card selector for season prompts.",
    questionType: "single_choice",
    defaultConfig: {
      uiVariant: "poster-single-select",
      columns: 3,
      componentBackgroundColor: "#000000",
      placeholderShapeColor: "#D9D9D9",
      placeholderShapeBorderColor: "#D9D9D9",
      selectedOptionBorderColor: "#FFFFFF",
      questionTextColor: "#F3F4F6",
      questionTextFontFamily: "\"Geometric Slabserif 712\", var(--font-sans), serif",
      questionTextLineHeight: 0.94,
      questionTextLetterSpacing: 0.008,
    },
  },
  {
    uiVariant: "cast-single-select",
    label: "SingleSelectCast",
    description: "Single-choice cast-circle selector for superlatives.",
    questionType: "single_choice",
    defaultConfig: {
      uiVariant: "cast-single-select",
      columns: 4,
      componentBackgroundColor: "#5D3167",
      placeholderShapeColor: "#EEEEEF",
      placeholderShapeBorderColor: "#DCDDDF",
      selectedOptionBorderColor: "#FFFFFF",
      questionTextColor: "#FFFFFF",
      questionTextFontFamily: "\"Rude Slab Condensed\", var(--font-sans), sans-serif",
      questionTextLineHeight: 0.95,
      questionTextLetterSpacing: 0.01,
    },
  },
  {
    uiVariant: "reunion-seating-prediction",
    label: "ReunionSeatingPrediction",
    description: "Predict reunion couch seating around host with full-time-first flow.",
    questionType: "likert",
    defaultConfig: {
      uiVariant: "reunion-seating-prediction",
      hostName: "Andy Cohen",
      hostImagePath: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Andy_Cohen_2012_Shankbone_2.jpg/320px-Andy_Cohen_2012_Shankbone_2.jpg",
      questionTextColor: "#111111",
      questionTextFontFamily: "\"Rude Slab Condensed\", var(--font-sans), sans-serif",
      questionTextLineHeight: 1.02,
      questionTextLetterSpacing: 0.008,
      componentBackgroundColor: "#D9D9D9",
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
    uiVariant: "cast-multi-select",
    label: "Cast Multi-select",
    description: "Figma cast-card multi-select grid (select two).",
    questionType: "multi_choice",
    defaultConfig: {
      uiVariant: "cast-multi-select",
      minSelections: 2,
      maxSelections: 2,
      subTextHeading: "SELECT TWO",
    },
  },
  {
    uiVariant: "poster-rankings",
    label: "Poster Rankings",
    description: "Drag-and-drop season/poster rankings.",
    questionType: "ranking",
    defaultConfig: {
      uiVariant: "poster-rankings",
      lineLabelTop: "BEST",
      lineLabelBottom: "WORST",
    },
  },
  {
    uiVariant: "person-rankings",
    label: "Person Rankings",
    description: "Drag-and-drop person/cast rankings.",
    questionType: "ranking",
    defaultConfig: {
      uiVariant: "person-rankings",
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
      { option_key: "somewhat_disagree", option_text: "Somewhat disagree" },
      { option_key: "neutral", option_text: "Neither" },
      { option_key: "somewhat_agree", option_text: "Somewhat agree" },
      { option_key: "strongly_agree", option_text: "Strongly agree" },
    ],
    usesRows: true,
  },
  {
    uiVariant: "cast-decision-card",
    label: "Cast decision card",
    description: "Single-cast decision cards (Keep/Fire/Demote, Bring Back/Keep Gone).",
    questionType: "likert",
    defaultConfig: {
      uiVariant: "cast-decision-card",
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
  if (typeof raw === "string") {
    return canonicalizeRankingVariant(raw) as UiVariant;
  }
  return canonicalizeRankingVariant(inferUiVariant(question.question_type)) as UiVariant;
}

export function uiVariantLabel(uiVariant: UiVariant): string {
  const canonical = canonicalizeRankingVariant(uiVariant) as UiVariant;
  const template = getUiTemplate(canonical);
  if (template) return template.label;
  if (uiVariant === "circle-ranking") return "Person Rankings";
  if (uiVariant === "rectangle-ranking") return "Poster Rankings";
  if (uiVariant === "three-choice-slider") return "Cast decision card";
  if (uiVariant === "cast-multi-select") return "Cast Multi-select";
  if (uiVariant === "rank-text-fields") return "Rank Text Fields";
  if (uiVariant === "poster-single-select") return "PosterSingleSelect";
  if (uiVariant === "cast-single-select") return "SingleSelectCast";
  if (uiVariant === "reunion-seating-prediction") return "ReunionSeatingPrediction";
  // Fallback for any variants not in the picker yet.
  return uiVariant;
}
