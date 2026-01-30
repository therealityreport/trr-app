BEGIN;

-- Create survey_episodes table for managing episodes per survey
CREATE TABLE IF NOT EXISTS survey_episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Link to survey
  survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,

  -- Episode identification
  episode_number integer NOT NULL,
  episode_id text NOT NULL,  -- e.g., "E01", "W01"
  episode_label text,  -- e.g., "Premiere", "Week 1", "Reunion Part 1"

  -- Scheduling
  air_date date,
  opens_at timestamptz,
  closes_at timestamptz,

  -- Status
  is_active boolean NOT NULL DEFAULT true,
  is_current boolean NOT NULL DEFAULT false,

  -- Firestore sync tracking
  firestore_synced_at timestamptz,

  -- Ensure unique episode per survey
  UNIQUE(survey_id, episode_number),
  UNIQUE(survey_id, episode_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_survey_episodes_survey_id ON survey_episodes (survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_episodes_is_current ON survey_episodes (survey_id, is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_survey_episodes_air_date ON survey_episodes (air_date);
CREATE INDEX IF NOT EXISTS idx_survey_episodes_is_active ON survey_episodes (survey_id, is_active) WHERE is_active = true;

-- Create updated_at trigger
DROP TRIGGER IF EXISTS trg_survey_episodes_updated_at ON survey_episodes;
CREATE TRIGGER trg_survey_episodes_updated_at
BEFORE UPDATE ON survey_episodes
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

-- Add foreign key from surveys.current_episode_id to survey_episodes.id
-- (deferred because it references a table we're creating)
ALTER TABLE surveys
ADD CONSTRAINT fk_surveys_current_episode
FOREIGN KEY (current_episode_id) REFERENCES survey_episodes(id)
ON DELETE SET NULL;

COMMIT;
