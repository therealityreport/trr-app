/**
 * Survey Question Types and Templates
 * Based on Qualtrics survey structure for RHOSLC S6
 */

// Base question interface
export interface BaseQuestion {
  id: string;
  type: QuestionType;
  question: string;
  description?: string;
  required?: boolean;
}

// Question type enum
export type QuestionType =
  | "numeric-ranking"      // Episode rating with stars (was star-rating)
  | "person-rankings"      // Canonical: cast/person power rankings - grid with circles
  | "poster-rankings"      // Canonical: season/poster rankings - rectangular cards
  | "circle-ranking"       // Legacy alias for person-rankings
  | "rectangle-ranking"    // Legacy alias for poster-rankings
  | "cast-decision-card"   // Cast decision cards (Keep/Fire/Demote, Bring Back/Keep Gone)
  | "three-choice-slider"  // Keep/Fire/Demote slider (was matrix-likert for verdicts)
  | "agree-likert-scale"   // Agree/Disagree scale (was matrix-likert for statements)
  | "numeric-scale-slider" // Boring/Entertaining slider per cast member (was slider)
  | "two-axis-grid"        // 2D perceptual map (snap-to-grid cast placement)
  | "two-choice-slider"    // Whose side feuds (was whose-side)
  | "multi-select-choice"  // Select multiple options (was multi-select)
  | "image-multiple-choice" // Single select with images
  | "text-multiple-choice"  // Single select with text options
  | "text-entry"           // Free text input
  | "dropdown";            // Dropdown select

// ============================================================================
// Numeric Rating Questions
// ============================================================================

/** Episode rating with stars and slider (0-10 scale) */
export interface NumericRankingQuestion extends BaseQuestion {
  type: "numeric-ranking";
  minValue: number;
  maxValue: number;
  step?: number;
  labels?: { min: string; max: string };
}

// ============================================================================
// Ranking Questions
// ============================================================================

/** Canonical cast/person rankings - circular tokens in a grid */
export interface PersonRankingsQuestion extends BaseQuestion {
  type: "person-rankings";
  items: RankItem[];
  lineLabelTop?: string;
  lineLabelBottom?: string;
}

/** Canonical season/poster rankings - rectangular cards */
export interface PosterRankingsQuestion extends BaseQuestion {
  type: "poster-rankings";
  items: RankItem[];
  lineLabelTop?: string;
  lineLabelBottom?: string;
}

/** Legacy alias for person rankings */
export interface CircleRankingQuestion extends Omit<PersonRankingsQuestion, "type"> {
  type: "circle-ranking";
}

/** Legacy alias for poster rankings */
export interface RectangleRankingQuestion extends Omit<PosterRankingsQuestion, "type"> {
  type: "rectangle-ranking";
}

// ============================================================================
// Slider Questions
// ============================================================================

/** Cast decision card (Keep/Fire/Demote, Bring Back/Keep Gone, etc.) */
export interface CastDecisionCardQuestion extends BaseQuestion {
  type: "cast-decision-card";
  subjects: CastMemberOption[];
  choices: SliderChoice[];
}

/** Legacy alias for cast decision cards */
export interface ThreeChoiceSliderQuestion extends Omit<CastDecisionCardQuestion, "type"> {
  type: "three-choice-slider";
}

/** Agree/Disagree likert scale for statements */
export interface AgreeLikertScaleQuestion extends BaseQuestion {
  type: "agree-likert-scale";
  statements: StatementRow[];
  scale: LikertColumn[];
}

/** Numeric scale slider (Boring/Entertaining) for individual cast members */
export interface NumericScaleSliderQuestion extends BaseQuestion {
  type: "numeric-scale-slider";
  subject: CastMemberOption;
  minValue: number;
  maxValue: number;
  minLabel: string;
  maxLabel: string;
  step?: number;
}

/** Two-axis snap grid (perceptual map) for multiple cast members */
export interface TwoAxisGridQuestion extends BaseQuestion {
  type: "two-axis-grid";
  /** Optional max absolute coordinate value (default 5). Total intersections per axis: 2*extent + 1 */
  extent?: number;
  xLabelLeft: string;
  xLabelRight: string;
  yLabelBottom: string;
  yLabelTop: string;
  subjects: CastMemberOption[];
}

/** Two-choice slider for feuds (whose side are you on) */
export interface TwoChoiceSliderQuestion extends BaseQuestion {
  type: "two-choice-slider";
  optionA: CastMemberOption;
  optionB: CastMemberOption;
  neutralOption?: string;
}

// ============================================================================
// Multiple Choice Questions
// ============================================================================

/** Multi-select choice (checkboxes) */
export interface MultiSelectChoiceQuestion extends BaseQuestion {
  type: "multi-select-choice";
  options: SelectOption[];
  minSelections?: number;
  maxSelections?: number;
}

/** Single select with images */
export interface ImageMultipleChoiceQuestion extends BaseQuestion {
  type: "image-multiple-choice";
  options: ImageOption[];
  columns?: number;
}

/** Single select with text options (radio buttons) */
export interface TextMultipleChoiceQuestion extends BaseQuestion {
  type: "text-multiple-choice";
  options: SelectOption[];
}

// ============================================================================
// Text Input Questions
// ============================================================================

/** Free text entry */
export interface TextEntryQuestion extends BaseQuestion {
  type: "text-entry";
  placeholder?: string;
  inputType?: "text" | "email" | "number" | "tel";
  validation?: TextValidation;
}

/** Dropdown select */
export interface DropdownQuestion extends BaseQuestion {
  type: "dropdown";
  options: SelectOption[];
  placeholder?: string;
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface SelectOption {
  value: string;
  label: string;
}

export interface ImageOption {
  id: string;
  label: string;
  img: string;
}

export interface CastMemberOption {
  id: string;
  name: string;
  img: string;
}

export interface RankItem {
  id: string;
  label: string;
  img: string;
}

export interface SliderChoice {
  value: string;
  label: string;
}

export interface StatementRow {
  id: string;
  label: string;
}

export interface LikertColumn {
  value: string;
  label: string;
}

export interface TextValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  errorMessage?: string;
}

// ============================================================================
// Union Types
// ============================================================================

export type SurveyQuestion =
  | NumericRankingQuestion
  | PersonRankingsQuestion
  | PosterRankingsQuestion
  | CircleRankingQuestion
  | RectangleRankingQuestion
  | CastDecisionCardQuestion
  | ThreeChoiceSliderQuestion
  | AgreeLikertScaleQuestion
  | NumericScaleSliderQuestion
  | TwoAxisGridQuestion
  | TwoChoiceSliderQuestion
  | MultiSelectChoiceQuestion
  | ImageMultipleChoiceQuestion
  | TextMultipleChoiceQuestion
  | TextEntryQuestion
  | DropdownQuestion;

// Survey section grouping
export interface SurveySection {
  id: string;
  title: string;
  description?: string;
  questions: SurveyQuestion[];
}

// Full survey template
export interface SurveyTemplate {
  id: string;
  title: string;
  description?: string;
  showId: string;
  seasonNumber: number;
  episodeNumber?: number;
  sections: SurveySection[];
}
