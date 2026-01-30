BEGIN;

-- Create survey_cast table for managing cast members per survey
CREATE TABLE IF NOT EXISTS survey_cast (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Link to survey
  survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,

  -- Cast member details
  name text NOT NULL,
  slug text NOT NULL,  -- URL-safe identifier (e.g., "lisa-barlow")
  image_url text,
  role text,  -- "OG Wife", "New Wife", "Friend", etc.
  status text CHECK (status IN ('main', 'friend', 'new', 'alum')),
  instagram text,

  -- Ordering for ranking display
  display_order integer NOT NULL DEFAULT 0,

  -- For alumni/ex-wife style questions
  is_alumni boolean NOT NULL DEFAULT false,
  alumni_verdict_enabled boolean NOT NULL DEFAULT false,

  -- Extra metadata as JSONB for flexibility
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Ensure unique cast member per survey
  UNIQUE(survey_id, slug)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_survey_cast_survey_id ON survey_cast (survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_cast_display_order ON survey_cast (survey_id, display_order);
CREATE INDEX IF NOT EXISTS idx_survey_cast_status ON survey_cast (status);
CREATE INDEX IF NOT EXISTS idx_survey_cast_is_alumni ON survey_cast (survey_id, is_alumni) WHERE is_alumni = true;

-- Create updated_at trigger
DROP TRIGGER IF EXISTS trg_survey_cast_updated_at ON survey_cast;
CREATE TRIGGER trg_survey_cast_updated_at
BEFORE UPDATE ON survey_cast
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

COMMIT;
