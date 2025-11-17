BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS survey_global_profile_responses (
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
  age_bracket text,
  birthdate date,
  gender text,
  pronouns jsonb,
  country text,
  state_region text,
  postal_code text,
  household_size integer,
  children_in_household text,
  relationship_status text,
  education_level text,
  household_income_band text,
  view_hours_week text,
  view_devices_reality jsonb,
  view_live_tv_household text,
  view_platforms_household jsonb,
  view_platforms_subscriptions jsonb,
  view_reality_cowatch text,
  view_live_chats_social text,
  view_bravo_platform_primary text,
  view_bravo_other_sources jsonb,
  view_new_episode_timing text,
  view_binge_style text,
  psych_bravo_fandom_level text,
  psych_other_reality_categories jsonb,
  psych_online_engagement jsonb,
  psych_purchase_behavior jsonb,
  psych_watch_reasons jsonb,
  profile_email text,
  profile_reuse_ok text,
  extra jsonb,
  UNIQUE (app_user_id)
);

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sgpr_updated_at ON survey_global_profile_responses;
CREATE TRIGGER trg_sgpr_updated_at
BEFORE UPDATE ON survey_global_profile_responses
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

CREATE INDEX IF NOT EXISTS idx_sgpr_created_at ON survey_global_profile_responses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sgpr_app_user_id ON survey_global_profile_responses (app_user_id);

COMMIT;
