-- Migration 014: Create normalized survey tables in firebase_surveys schema
-- Tables: surveys, questions, options, survey_runs, responses, answers

BEGIN;

-- Question type enum
CREATE TYPE firebase_surveys.question_type AS ENUM (
  'single_choice',
  'multi_choice',
  'free_text',
  'likert',
  'numeric',
  'ranking'
);

-- Survey definitions
CREATE TABLE firebase_surveys.surveys (
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
CREATE TABLE firebase_surveys.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES firebase_surveys.surveys(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  question_text text NOT NULL,
  question_type firebase_surveys.question_type NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT questions_survey_key_unique UNIQUE (survey_id, question_key)
);

-- Options for choice-based questions
CREATE TABLE firebase_surveys.options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES firebase_surveys.questions(id) ON DELETE CASCADE,
  option_key text NOT NULL,
  option_text text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT options_question_key_unique UNIQUE (question_id, option_key)
);

-- Survey runs (deployment windows)
CREATE TABLE firebase_surveys.survey_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES firebase_surveys.surveys(id) ON DELETE CASCADE,
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
CREATE TABLE firebase_surveys.responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_run_id uuid NOT NULL REFERENCES firebase_surveys.survey_runs(id) ON DELETE RESTRICT,
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
CREATE TABLE firebase_surveys.answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES firebase_surveys.responses(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES firebase_surveys.questions(id) ON DELETE RESTRICT,
  option_id uuid REFERENCES firebase_surveys.options(id),
  text_value text,
  numeric_value numeric,
  json_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT answers_response_question_unique UNIQUE (response_id, question_id)
);

-- Indexes for common query patterns
CREATE INDEX idx_firebase_surveys_slug ON firebase_surveys.surveys(slug);
CREATE INDEX idx_firebase_questions_survey_order ON firebase_surveys.questions(survey_id, display_order);
CREATE INDEX idx_firebase_options_question_order ON firebase_surveys.options(question_id, display_order);
CREATE INDEX idx_firebase_survey_runs_active ON firebase_surveys.survey_runs(survey_id, is_active, starts_at, ends_at);
CREATE INDEX idx_firebase_responses_run_user ON firebase_surveys.responses(survey_run_id, user_id);
CREATE INDEX idx_firebase_responses_user ON firebase_surveys.responses(user_id);
CREATE INDEX idx_firebase_answers_response ON firebase_surveys.answers(response_id);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION firebase_surveys.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER trg_firebase_surveys_updated_at
  BEFORE UPDATE ON firebase_surveys.surveys
  FOR EACH ROW EXECUTE FUNCTION firebase_surveys.set_updated_at();

CREATE TRIGGER trg_firebase_questions_updated_at
  BEFORE UPDATE ON firebase_surveys.questions
  FOR EACH ROW EXECUTE FUNCTION firebase_surveys.set_updated_at();

CREATE TRIGGER trg_firebase_survey_runs_updated_at
  BEFORE UPDATE ON firebase_surveys.survey_runs
  FOR EACH ROW EXECUTE FUNCTION firebase_surveys.set_updated_at();

CREATE TRIGGER trg_firebase_responses_updated_at
  BEFORE UPDATE ON firebase_surveys.responses
  FOR EACH ROW EXECUTE FUNCTION firebase_surveys.set_updated_at();

COMMIT;
