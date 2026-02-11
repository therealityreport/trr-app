-- Migration 022: Admin-only season cast roles for survey auto-fill
-- Stores which cast members are eligible for season-based survey questions.

BEGIN;

-- Requires admin schema + admin.set_updated_at() from migration 019

CREATE TABLE IF NOT EXISTS admin.season_cast_survey_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trr_show_id UUID NOT NULL,
  season_number INTEGER NOT NULL CHECK (season_number > 0),
  person_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('main', 'friend_of')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trr_show_id, season_number, person_id)
);

CREATE INDEX IF NOT EXISTS idx_season_cast_survey_roles_show_season
  ON admin.season_cast_survey_roles (trr_show_id, season_number);

CREATE INDEX IF NOT EXISTS idx_season_cast_survey_roles_person
  ON admin.season_cast_survey_roles (person_id);

DROP TRIGGER IF EXISTS set_season_cast_survey_roles_updated_at ON admin.season_cast_survey_roles;
CREATE TRIGGER set_season_cast_survey_roles_updated_at
  BEFORE UPDATE ON admin.season_cast_survey_roles
  FOR EACH ROW EXECUTE FUNCTION admin.set_updated_at();

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON admin.season_cast_survey_roles TO trr_app;

COMMIT;

