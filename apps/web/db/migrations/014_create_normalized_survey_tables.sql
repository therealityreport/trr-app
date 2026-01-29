-- Migration 014: Create normalized survey tables
-- Tables: surveys, questions, options, survey_runs, responses, answers

BEGIN;

-- Question type enum
CREATE TYPE surveys.question_type AS ENUM (
  'single_choice',
  'multi_choice',
  'free_text',
  'likert',
  'numeric',
  'ranking'
);

-- Survey definitions
CREATE TABLE surveys.surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT surveys_slug_unique UNIQUE (slug)
);

-- Questions belonging to a survey
CREATE TABLE surveys.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES surveys.surveys(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  question_text text NOT NULL,
  question_type surveys.question_type NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT questions_survey_key_unique UNIQUE (survey_id, question_key)
);

-- Options for choice-based questions
CREATE TABLE surveys.options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES surveys.questions(id) ON DELETE CASCADE,
  option_key text NOT NULL,
  option_text text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT options_question_key_unique UNIQUE (question_id, option_key)
);

-- Survey runs (deployment windows)
CREATE TABLE surveys.survey_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES surveys.surveys(id) ON DELETE CASCADE,
  run_key text NOT NULL,
  title text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  max_submissions_per_user integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT survey_runs_survey_key_unique UNIQUE (survey_id, run_key)
);

-- Response headers (one per submission)
CREATE TABLE surveys.responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_run_id uuid NOT NULL REFERENCES surveys.survey_runs(id) ON DELETE RESTRICT,
  user_id text NOT NULL,
  submission_number integer NOT NULL DEFAULT 1,
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT responses_run_user_submission_unique UNIQUE (survey_run_id, user_id, submission_number)
);

-- Individual answers (one per question per response)
-- For multi_choice/ranking, use json_value to store arrays
CREATE TABLE surveys.answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES surveys.responses(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES surveys.questions(id) ON DELETE RESTRICT,
  option_id uuid REFERENCES surveys.options(id),
  text_value text,
  numeric_value numeric,
  json_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT answers_response_question_unique UNIQUE (response_id, question_id)
);

-- Indexes for common query patterns
CREATE INDEX idx_surveys_slug ON surveys.surveys(slug);
CREATE INDEX idx_questions_survey_order ON surveys.questions(survey_id, display_order);
CREATE INDEX idx_options_question_order ON surveys.options(question_id, display_order);
CREATE INDEX idx_survey_runs_active ON surveys.survey_runs(survey_id, is_active, starts_at, ends_at);
CREATE INDEX idx_responses_run_user ON surveys.responses(survey_run_id, user_id);
CREATE INDEX idx_responses_user ON surveys.responses(user_id);
CREATE INDEX idx_answers_response ON surveys.answers(response_id);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION surveys.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER trg_surveys_updated_at
  BEFORE UPDATE ON surveys.surveys
  FOR EACH ROW EXECUTE FUNCTION surveys.set_updated_at();

CREATE TRIGGER trg_questions_updated_at
  BEFORE UPDATE ON surveys.questions
  FOR EACH ROW EXECUTE FUNCTION surveys.set_updated_at();

CREATE TRIGGER trg_survey_runs_updated_at
  BEFORE UPDATE ON surveys.survey_runs
  FOR EACH ROW EXECUTE FUNCTION surveys.set_updated_at();

CREATE TRIGGER trg_responses_updated_at
  BEFORE UPDATE ON surveys.responses
  FOR EACH ROW EXECUTE FUNCTION surveys.set_updated_at();

COMMIT;
