/**
 * Question Config Types
 *
 * These types define the `config` JSONB structure stored in firebase_surveys.questions.
 * The `uiVariant` field determines which input component to render.
 *
 * DB Type → UI Variant mappings:
 * - numeric → "numeric-ranking" | "numeric-scale-slider"
 * - ranking → "person-rankings" | "poster-rankings"
 * - single_choice → "two-choice-slider" | "text-multiple-choice" | "image-multiple-choice" | "dropdown"
 * - multi_choice → "multi-select-choice"
 * - likert → "cast-decision-card" | "three-choice-slider" | "agree-likert-scale" | "two-axis-grid"
 * - free_text → "text-entry"
 */

// ============================================================================
// UI Variant Union
// ============================================================================

export type UiVariant =
  | "numeric-ranking"        // Episode rating with stars (0-10)
  | "numeric-scale-slider"   // Cast member slider (Boring/Entertaining)
  | "two-axis-grid"          // 2D perceptual map (snap-to-grid cast placement)
  | "person-rankings"        // Cast/person rankings - grid with circles
  | "poster-rankings"        // Season/poster rankings - cards
  | "circle-ranking"         // Legacy alias: cast power rankings
  | "rectangle-ranking"      // Legacy alias: season/franchise rankings
  | "cast-decision-card"     // Cast decision cards (Keep/Fire/Demote, Bring Back/Keep Gone)
  | "three-choice-slider"    // Keep/Fire/Demote slider
  | "agree-likert-scale"     // Agree/Disagree statements
  | "two-choice-slider"      // Whose side feuds
  | "multi-select-choice"    // Multi-select checkboxes
  | "text-multiple-choice"   // Single select radio buttons
  | "image-multiple-choice"  // Single select with images
  | "dropdown"               // Dropdown select
  | "text-entry";            // Free text input

export function canonicalizeRankingVariant(
  uiVariant: UiVariant | string | null | undefined,
): UiVariant | string | null | undefined {
  if (uiVariant === "circle-ranking") return "person-rankings";
  if (uiVariant === "rectangle-ranking") return "poster-rankings";
  return uiVariant;
}

// ============================================================================
// Supporting Types
// ============================================================================

/** Cast member reference for sliders and whose-side questions */
export interface CastMemberSubject {
  id: string;
  name: string;
  img: string;
}

/** Row definition for matrix-likert questions (stored in config) */
export interface MatrixRow {
  id: string;
  label: string;
  img?: string;
}

/** Slider choice option */
export interface SliderChoice {
  value: string;
  label: string;
}

/** Text validation rules */
export interface TextValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  errorMessage?: string;
}

// ============================================================================
// Config Interfaces by UI Variant
// ============================================================================

/** Base config shared by all questions */
export interface BaseQuestionConfig {
  uiVariant?: UiVariant;
  description?: string;
  /** Optional grouping label (used by admin editor + play UI to render sections). */
  section?: string;
  /** Optional size multiplier (percent) for shape-like UI elements in previews/components. */
  shapeScale?: number;
  /** Optional size multiplier (percent) for buttons/interactive controls in previews/components. */
  buttonScale?: number;
  /** Optional color overrides used by advanced template editor controls. */
  questionTextColor?: string;
  subTextHeadingColor?: string;
  optionTextColor?: string;
  componentBackgroundColor?: string;
  placeholderShapeColor?: string;
  placeholderShapeBorderColor?: string;
  placeholderTextColor?: string;
  unassignedContainerColor?: string;
  unassignedContainerBorderColor?: string;
  unassignedCircleBorderColor?: string;
  /** Optional size multiplier (percent) for unassigned cast/token circles. */
  unassignedCircleSize?: number;
}

/**
 * Numeric Ranking Config (numeric-ranking)
 * Episode rating with stars, text input, and slider (0-10 scale)
 */
export interface NumericRankingConfig extends BaseQuestionConfig {
  uiVariant: "numeric-ranking";
  min: number;
  max: number;
  /** Step size for slider precision (default: 0.1) */
  step?: number;
  labels?: {
    min: string;
    max: string;
  };
}

/**
 * Numeric Scale Slider Config (numeric-scale-slider)
 * Horizontal slider for cast member ratings (Boring/Entertaining)
 */
export interface NumericScaleSliderConfig extends BaseQuestionConfig {
  uiVariant: "numeric-scale-slider";
  min: number;
  max: number;
  step?: number;
  minLabel: string;
  maxLabel: string;
  /** Cast member this slider is about */
  subject?: CastMemberSubject;
}

/**
 * Two Axis Grid Config (two-axis-grid)
 * 2D perceptual map where cast members are placed on an (x,y) grid.
 *
 * Coordinates are centered at (0,0) with extent +/- N (default N=5).
 */
export interface TwoAxisGridConfig extends BaseQuestionConfig {
  uiVariant: "two-axis-grid";
  /** Maximum absolute coordinate value (default: 5). Total intersections per axis: 2*extent + 1 */
  extent?: number;
  /** Axis labels */
  xLabelLeft: string;
  xLabelRight: string;
  yLabelBottom: string;
  yLabelTop: string;
  /** Cast members/items to place (preferred over deriving from question.options). */
  rows?: MatrixRow[];
}

/**
 * Person Rankings Config (person-rankings)
 * Drag-and-drop grid with circular cast member tokens.
 */
export interface PersonRankingsConfig extends BaseQuestionConfig {
  uiVariant: "person-rankings";
  lineLabelTop?: string;
  lineLabelBottom?: string;
}

/**
 * Poster Rankings Config (poster-rankings)
 * Drag-and-drop ranking with rectangular season/poster cards.
 */
export interface PosterRankingsConfig extends BaseQuestionConfig {
  uiVariant: "poster-rankings";
  lineLabelTop?: string;
  lineLabelBottom?: string;
}

/**
 * Circle Ranking Config (legacy alias)
 * Drag-and-drop grid with circular cast member tokens.
 */
export interface CircleRankingConfig extends BaseQuestionConfig {
  uiVariant: "circle-ranking";
  lineLabelTop?: string;
  lineLabelBottom?: string;
}

/**
 * Rectangle Ranking Config (legacy alias)
 * Drag-and-drop list with rectangular items.
 */
export interface RectangleRankingConfig extends BaseQuestionConfig {
  uiVariant: "rectangle-ranking";
  lineLabelTop?: string;
  lineLabelBottom?: string;
}

/**
 * Cast Decision Card Config (cast-decision-card)
 * Fire/Demote/Keep, Bring Back/Keep Gone, and other decision-card prompts.
 * Rows are cast members, choices are the decision options.
 */
export interface CastDecisionCardConfig extends BaseQuestionConfig {
  uiVariant: "cast-decision-card";
  choices: SliderChoice[];
  /** Cast members or items to rate (rows in the matrix view) */
  rows?: MatrixRow[];
}

/**
 * Three Choice Slider Config (three-choice-slider)
 * Legacy alias for cast decision cards.
 */
export interface ThreeChoiceSliderConfig extends Omit<CastDecisionCardConfig, "uiVariant"> {
  uiVariant: "three-choice-slider";
}

/**
 * Agree Likert Scale Config (agree-likert-scale)
 * Standard agree/disagree scale for statements
 * Rows are statements, scale options come from options table
 */
export interface AgreeLikertScaleConfig extends BaseQuestionConfig {
  uiVariant: "agree-likert-scale";
  /** Statements to rate (rows in the matrix view) */
  rows?: MatrixRow[];
}

/**
 * Two Choice Slider Config (two-choice-slider)
 * Whose side feuds - slider between two cast members
 * Options A and B come from the options table with metadata.imagePath
 */
export interface TwoChoiceSliderConfig extends BaseQuestionConfig {
  uiVariant: "two-choice-slider";
  /** Optional neutral/neither option text */
  neutralOption?: string;
}

/**
 * Multi Select Choice Config (multi-select-choice)
 * Checkboxes with optional min/max constraints
 */
export interface MultiSelectChoiceConfig extends BaseQuestionConfig {
  uiVariant: "multi-select-choice";
  minSelections?: number;
  maxSelections?: number;
}

/**
 * Text Multiple Choice Config (text-multiple-choice)
 * Standard radio button group with text options
 */
export interface TextMultipleChoiceConfig extends BaseQuestionConfig {
  uiVariant: "text-multiple-choice";
}

/**
 * Image Multiple Choice Config (image-multiple-choice)
 * Single select with image options
 */
export interface ImageMultipleChoiceConfig extends BaseQuestionConfig {
  uiVariant: "image-multiple-choice";
  columns?: number;
}

/**
 * Dropdown Config (dropdown)
 * Native select element
 */
export interface DropdownConfig extends BaseQuestionConfig {
  uiVariant: "dropdown";
  placeholder?: string;
}

/**
 * Text Entry Config (text-entry)
 * Text input with optional validation
 */
export interface TextEntryConfig extends BaseQuestionConfig {
  uiVariant: "text-entry";
  inputType?: "text" | "email" | "number" | "tel";
  placeholder?: string;
  validation?: TextValidation;
}

// ============================================================================
// Union Type
// ============================================================================

/**
 * Union of all question config types.
 * Use type narrowing on `uiVariant` to access specific fields.
 */
export type QuestionConfig =
  | NumericRankingConfig
  | NumericScaleSliderConfig
  | TwoAxisGridConfig
  | PersonRankingsConfig
  | PosterRankingsConfig
  | CircleRankingConfig
  | RectangleRankingConfig
  | CastDecisionCardConfig
  | ThreeChoiceSliderConfig
  | AgreeLikertScaleConfig
  | TwoChoiceSliderConfig
  | MultiSelectChoiceConfig
  | TextMultipleChoiceConfig
  | ImageMultipleChoiceConfig
  | DropdownConfig
  | TextEntryConfig
  | BaseQuestionConfig;

// ============================================================================
// Type Guards
// ============================================================================

export function isNumericRankingConfig(config: QuestionConfig): config is NumericRankingConfig {
  return config.uiVariant === "numeric-ranking";
}

export function isNumericScaleSliderConfig(config: QuestionConfig): config is NumericScaleSliderConfig {
  return config.uiVariant === "numeric-scale-slider";
}

export function isTwoAxisGridConfig(config: QuestionConfig): config is TwoAxisGridConfig {
  return config.uiVariant === "two-axis-grid";
}

export function isPersonRankingsConfig(config: QuestionConfig): config is PersonRankingsConfig {
  return config.uiVariant === "person-rankings";
}

export function isPosterRankingsConfig(config: QuestionConfig): config is PosterRankingsConfig {
  return config.uiVariant === "poster-rankings";
}

export function isCircleRankingConfig(config: QuestionConfig): config is CircleRankingConfig {
  return config.uiVariant === "circle-ranking";
}

export function isRectangleRankingConfig(config: QuestionConfig): config is RectangleRankingConfig {
  return config.uiVariant === "rectangle-ranking";
}

export function isCastDecisionCardConfig(config: QuestionConfig): config is CastDecisionCardConfig {
  return config.uiVariant === "cast-decision-card";
}

export function isThreeChoiceSliderConfig(config: QuestionConfig): config is ThreeChoiceSliderConfig {
  return config.uiVariant === "three-choice-slider";
}

export function isAgreeLikertScaleConfig(config: QuestionConfig): config is AgreeLikertScaleConfig {
  return config.uiVariant === "agree-likert-scale";
}

export function isTwoChoiceSliderConfig(config: QuestionConfig): config is TwoChoiceSliderConfig {
  return config.uiVariant === "two-choice-slider";
}

export function isMultiSelectChoiceConfig(config: QuestionConfig): config is MultiSelectChoiceConfig {
  return config.uiVariant === "multi-select-choice";
}

export function isTextMultipleChoiceConfig(config: QuestionConfig): config is TextMultipleChoiceConfig {
  return config.uiVariant === "text-multiple-choice";
}

export function isImageMultipleChoiceConfig(config: QuestionConfig): config is ImageMultipleChoiceConfig {
  return config.uiVariant === "image-multiple-choice";
}

export function isDropdownConfig(config: QuestionConfig): config is DropdownConfig {
  return config.uiVariant === "dropdown";
}

export function isTextEntryConfig(config: QuestionConfig): config is TextEntryConfig {
  return config.uiVariant === "text-entry";
}

// ============================================================================
// Helper: Infer default uiVariant from question_type
// ============================================================================

import type { QuestionType } from "./normalized-types";

/**
 * Infer the default uiVariant when config.uiVariant is not set.
 * Used for backwards compatibility with questions created before uiVariant was added.
 */
export function inferUiVariant(questionType: QuestionType): UiVariant {
  switch (questionType) {
    case "numeric":
      return "numeric-scale-slider";
    case "ranking":
      return "poster-rankings";
    case "single_choice":
      return "text-multiple-choice";
    case "multi_choice":
      return "multi-select-choice";
    case "likert":
      return "agree-likert-scale";
    case "free_text":
      return "text-entry";
    default:
      return "text-entry";
  }
}
