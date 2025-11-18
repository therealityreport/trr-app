BEGIN;

-- Add UNIQUE constraint on app_user_id for survey_x_responses
-- This is required for the ON CONFLICT clause in upsert operations
ALTER TABLE survey_x_responses
ADD CONSTRAINT survey_x_responses_app_user_id_key UNIQUE (app_user_id);

COMMIT;
