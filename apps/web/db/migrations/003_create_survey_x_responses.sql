BEGIN;

-- Drop existing table if it exists (to handle schema changes)
DROP TABLE IF EXISTS survey_x_responses;

CREATE TABLE survey_x_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  respondent_id text,
  app_user_id text NOT NULL,
  app_user_email text,
  source text NOT NULL DEFAULT 'trr_app',
  show_id text,
  season_number integer,
  episode_number integer,
  view_live_tv_household text,
  view_platforms_subscriptions text[] NOT NULL DEFAULT '{}',
  primary_platform text,
  watch_frequency text,
  watch_mode text,
  view_reality_cowatch text,
  view_live_chats_social text,
  view_devices_reality text[] NOT NULL DEFAULT '{}',
  extra jsonb,
  UNIQUE (app_user_id)
);

DROP TRIGGER IF EXISTS trg_survey_x_responses_updated_at ON survey_x_responses;
CREATE TRIGGER trg_survey_x_responses_updated_at
BEFORE UPDATE ON survey_x_responses
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

CREATE INDEX IF NOT EXISTS idx_survey_x_app_user_id ON survey_x_responses (app_user_id);
CREATE INDEX IF NOT EXISTS idx_survey_x_created_at ON survey_x_responses (created_at DESC);

COMMIT;
