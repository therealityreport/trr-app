BEGIN;

CREATE TABLE IF NOT EXISTS survey_rhoslc_s6_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  respondent_id text,
  app_user_id text NOT NULL,
  app_user_email text,
  source text NOT NULL DEFAULT 'trr_app',
  show_id text,
  season_number integer,
  season_id text NOT NULL,
  episode_number integer,
  episode_id text NOT NULL,
  ranking jsonb NOT NULL DEFAULT '[]'::jsonb,
  completion_pct integer,
  completed boolean,
  client_schema_version integer,
  client_version text,
  extra jsonb,
  UNIQUE (app_user_id, season_id, episode_id)
);

DROP TRIGGER IF EXISTS trg_rhoslc_s6_updated_at ON survey_rhoslc_s6_responses;
CREATE TRIGGER trg_rhoslc_s6_updated_at
BEFORE UPDATE ON survey_rhoslc_s6_responses
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

CREATE INDEX IF NOT EXISTS idx_rhoslc_s6_created_at ON survey_rhoslc_s6_responses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rhoslc_s6_show_episode ON survey_rhoslc_s6_responses (show_id, season_number, episode_number);

COMMIT;
