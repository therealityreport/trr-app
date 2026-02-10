ALTER TABLE survey_shows
  ADD COLUMN IF NOT EXISTS trr_show_id uuid;

ALTER TABLE survey_shows
  ADD COLUMN IF NOT EXISTS fonts jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_survey_shows_trr_show_id_unique
  ON survey_shows (trr_show_id)
  WHERE trr_show_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_survey_shows_trr_show_id
  ON survey_shows (trr_show_id);

