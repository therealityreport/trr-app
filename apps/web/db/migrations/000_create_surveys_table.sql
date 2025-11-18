BEGIN;

-- Create surveys table (registry of all surveys)
CREATE TABLE IF NOT EXISTS surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Core survey metadata
  key text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  response_table_name text NOT NULL,

  -- Optional survey context
  show_id text,
  season_number integer,
  episode_number integer,

  -- Status
  is_active boolean NOT NULL DEFAULT true
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_surveys_key ON surveys (key);
CREATE INDEX IF NOT EXISTS idx_surveys_is_active ON surveys (is_active);
CREATE INDEX IF NOT EXISTS idx_surveys_show_season ON surveys (show_id, season_number);

-- Create shared function for updated_at triggers (if not exists)
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger
DROP TRIGGER IF EXISTS trg_surveys_updated_at ON surveys;
CREATE TRIGGER trg_surveys_updated_at
BEFORE UPDATE ON surveys
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

COMMIT;
