BEGIN;

-- Add JSONB columns for theme and schedule configuration
ALTER TABLE surveys
ADD COLUMN IF NOT EXISTS theme jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS air_schedule jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS current_episode_id uuid DEFAULT NULL,
ADD COLUMN IF NOT EXISTS firestore_path text DEFAULT NULL;

-- Theme structure example:
-- {
--   "pageBg": "#FFFFFF",
--   "pageText": "#1a1a1a",
--   "questionFont": "var(--font-rude-slab)",
--   "questionColor": "#1a1a1a",
--   ... (all 21 SurveyTheme properties)
-- }

-- Air schedule structure:
-- {
--   "airDays": ["Wednesday"],
--   "airTime": "20:00",
--   "timezone": "America/New_York",
--   "autoProgress": true
-- }

-- Create GIN indexes for JSONB columns for efficient querying
CREATE INDEX IF NOT EXISTS idx_surveys_theme ON surveys USING gin (theme);
CREATE INDEX IF NOT EXISTS idx_surveys_air_schedule ON surveys USING gin (air_schedule);

COMMIT;
