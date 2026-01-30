BEGIN;

-- Ensure the shared updated_at trigger function exists
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- survey_shows
-- ============================================================================

-- Create survey_shows table for managing survey show metadata
-- Named separately from existing 'shows' table which is for media tracking
CREATE TABLE IF NOT EXISTS survey_shows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Identification
  key text NOT NULL UNIQUE,
  title text NOT NULL,
  short_title text,

  -- Network/Status
  network text,
  status text,
  logline text,

  -- Brand colors (show-level defaults)
  palette jsonb DEFAULT '{}'::jsonb,
  -- { primary, accent, dark, light }

  -- Assets
  icon_url text,
  wordmark_url text,
  hero_url text,

  -- Metadata
  tags text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_survey_shows_key ON survey_shows (key);
CREATE INDEX IF NOT EXISTS idx_survey_shows_is_active ON survey_shows (is_active) WHERE is_active = true;

-- Create updated_at trigger
DROP TRIGGER IF EXISTS trg_survey_shows_updated_at ON survey_shows;
CREATE TRIGGER trg_survey_shows_updated_at
BEFORE UPDATE ON survey_shows
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

-- ============================================================================
-- survey_show_seasons
-- ============================================================================

-- Create survey_show_seasons table for season-specific data
-- Named separately from existing 'seasons' table which is for media tracking
CREATE TABLE IF NOT EXISTS survey_show_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Link to survey_show
  show_id uuid NOT NULL REFERENCES survey_shows(id) ON DELETE CASCADE,

  -- Season identification
  season_number integer NOT NULL,
  label text NOT NULL,  -- e.g., "Season 6"
  year text,
  description text,

  -- Season colors (override show palette)
  colors jsonb DEFAULT '{}'::jsonb,
  -- { primary, accent, neutral }

  -- Assets
  show_icon_url text,
  wordmark_url text,
  hero_url text,

  -- Cast members (JSONB array)
  cast_members jsonb DEFAULT '[]'::jsonb,
  -- [{ name, image, role, instagram, status }]

  -- Notes/guidelines
  notes text[] DEFAULT '{}',

  -- Status
  is_active boolean NOT NULL DEFAULT true,
  is_current boolean NOT NULL DEFAULT false,

  -- Unique constraint
  UNIQUE(show_id, season_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_survey_show_seasons_show_id ON survey_show_seasons (show_id);
CREATE INDEX IF NOT EXISTS idx_survey_show_seasons_is_current ON survey_show_seasons (show_id, is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_survey_show_seasons_is_active ON survey_show_seasons (show_id, is_active) WHERE is_active = true;

-- Create updated_at trigger
DROP TRIGGER IF EXISTS trg_survey_show_seasons_updated_at ON survey_show_seasons;
CREATE TRIGGER trg_survey_show_seasons_updated_at
BEFORE UPDATE ON survey_show_seasons
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

COMMIT;
