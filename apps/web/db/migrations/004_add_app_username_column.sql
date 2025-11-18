BEGIN;

ALTER TABLE IF EXISTS survey_global_profile_responses
  ADD COLUMN IF NOT EXISTS app_username text;
ALTER TABLE IF EXISTS survey_rhoslc_s6_responses
  ADD COLUMN IF NOT EXISTS app_username text;
ALTER TABLE IF EXISTS survey_x_responses
  ADD COLUMN IF NOT EXISTS app_username text;

CREATE INDEX IF NOT EXISTS idx_sgpr_app_username ON survey_global_profile_responses (app_username);
CREATE INDEX IF NOT EXISTS idx_rhoslc_s6_app_username ON survey_rhoslc_s6_responses (app_username);
CREATE INDEX IF NOT EXISTS idx_survey_x_app_username ON survey_x_responses (app_username);

COMMIT;
