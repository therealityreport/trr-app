-- Migration 030: show palette library entries for image palette lab.

BEGIN;

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS survey_show_palette_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trr_show_id uuid NOT NULL,
  season_number integer,
  name text NOT NULL,
  colors jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_type text NOT NULL,
  source_image_url text,
  seed integer NOT NULL,
  marker_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by_uid text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT survey_show_palette_library_season_number_valid
    CHECK (season_number IS NULL OR season_number > 0),
  CONSTRAINT survey_show_palette_library_source_type_valid
    CHECK (source_type IN ('upload', 'url', 'media_library'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_survey_show_palette_library_name_scope
  ON survey_show_palette_library (trr_show_id, COALESCE(season_number, -1), lower(name));

CREATE INDEX IF NOT EXISTS idx_survey_show_palette_library_show
  ON survey_show_palette_library (trr_show_id);

CREATE INDEX IF NOT EXISTS idx_survey_show_palette_library_show_season
  ON survey_show_palette_library (trr_show_id, season_number);

DROP TRIGGER IF EXISTS trg_survey_show_palette_library_updated_at ON survey_show_palette_library;
CREATE TRIGGER trg_survey_show_palette_library_updated_at
BEFORE UPDATE ON survey_show_palette_library
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

COMMIT;
