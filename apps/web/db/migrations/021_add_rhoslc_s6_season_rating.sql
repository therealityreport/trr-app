BEGIN;

ALTER TABLE IF EXISTS survey_rhoslc_s6_responses
ADD COLUMN IF NOT EXISTS season_rating numeric(3, 1);

COMMIT;

