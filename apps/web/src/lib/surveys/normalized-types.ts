/**
 * Types for the normalized survey system (surveys schema).
 * These map to the tables in migrations 013-014.
 */

export type QuestionType =
  | "single_choice"
  | "multi_choice"
  | "free_text"
  | "likert"
  | "numeric"
  | "ranking";

/**
 * Survey definition (surveys.surveys)
 */
export interface NormalizedSurvey {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Question definition (surveys.questions)
 */
export interface SurveyQuestion {
  id: string;
  survey_id: string;
  question_key: string;
  question_text: string;
  question_type: QuestionType;
  display_order: number;
  is_required: boolean;
  /** Type-specific config: min/max for likert, validation rules, etc. */
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Answer option for choice-based questions (surveys.options)
 */
export interface QuestionOption {
  id: string;
  question_id: string;
  option_key: string;
  option_text: string;
  display_order: number;
  /** Additional data: image_url, color, etc. */
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Survey run / deployment window (surveys.survey_runs)
 */
export interface SurveyRun {
  id: string;
  survey_id: string;
  run_key: string;
  title: string | null;
  starts_at: string;
  ends_at: string | null;
  max_submissions_per_user: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Response header (surveys.responses)
 */
export interface SurveyResponse {
  id: string;
  survey_run_id: string;
  user_id: string;
  submission_number: number;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Individual answer (surveys.answers)
 * One row per question per response.
 * For multi_choice/ranking, use json_value to store arrays.
 */
export interface SurveyAnswer {
  id: string;
  response_id: string;
  question_id: string;
  /** For single_choice questions */
  option_id: string | null;
  /** For free_text questions */
  text_value: string | null;
  /** For numeric/likert questions */
  numeric_value: number | null;
  /** For multi_choice (string[]) or ranking (ordered string[]) */
  json_value: unknown;
  created_at: string;
}

/**
 * Input shape for submitting an answer
 */
export interface AnswerInput {
  questionId: string;
  /** For single_choice */
  optionId?: string;
  /** For free_text */
  textValue?: string;
  /** For numeric/likert */
  numericValue?: number;
  /** For multi_choice/ranking (array of option IDs or values) */
  jsonValue?: unknown;
}

/**
 * Survey with its questions and options (for display)
 */
export interface SurveyWithQuestions extends NormalizedSurvey {
  questions: (SurveyQuestion & { options: QuestionOption[] })[];
  /** Optional show-level icon URL used by numeric-rating icon renderer. */
  show_icon_url?: string | null;
  /** Optional TRR linkage (if the survey was created from / linked to TRR core show/season). */
  trr_link?: {
    survey_id: string;
    trr_show_id: string;
    trr_season_id: string | null;
    trr_episode_id: string | null;
    season_number: number | null;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Active run response from API
 */
export interface ActiveRunResponse {
  activeRun: SurveyRun | null;
  survey: SurveyWithQuestions | null;
  userSubmissions: number;
  canSubmit: boolean;
}

/**
 * Submit response from API
 */
export interface SubmitResponse {
  success: boolean;
  responseId?: string;
  error?: string;
}
