BEGIN;

CREATE TABLE IF NOT EXISTS survey_rhop_s10_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  respondent_id text,
  app_user_id text NOT NULL,
  app_user_email text,
  app_username text,
  source text NOT NULL DEFAULT 'trr_app',
  show_id text,
  season_number integer,
  episode_number integer,
  season_id text,
  episode_id text,
  ranking jsonb,
  completion_pct integer,
  completed boolean,
  client_schema_version integer,
  client_version text,
  extra jsonb,
  UNIQUE (app_user_id, season_id, episode_id)
);

CREATE INDEX IF NOT EXISTS idx_rhop_s10_app_user_id ON survey_rhop_s10_responses (app_user_id);
CREATE INDEX IF NOT EXISTS idx_rhop_s10_created_at ON survey_rhop_s10_responses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rhop_s10_season_episode ON survey_rhop_s10_responses (season_id, episode_id);

CREATE TRIGGER trg_rhop_s10_updated_at
BEFORE UPDATE ON survey_rhop_s10_responses
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

INSERT INTO surveys (
  key,
  title,
  description,
  response_table_name,
  show_id,
  season_number,
  episode_number,
  is_active
) VALUES (
  'rhop_s10',
  'RHOP S10 Cast Rankings',
  'Weekly fan power rankings for Potomac Season 10',
  'survey_rhop_s10_responses',
  'rhop',
  10,
  NULL,
  TRUE
)
ON CONFLICT (key) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  response_table_name = EXCLUDED.response_table_name,
  show_id = EXCLUDED.show_id,
  season_number = EXCLUDED.season_number,
  episode_number = EXCLUDED.episode_number,
  is_active = EXCLUDED.is_active,
  updated_at = now();

COMMIT;
