BEGIN;

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

COMMIT;
