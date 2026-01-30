-- Migration 016: Create RLS policies for firebase_surveys schema
-- Uses session variables set via set_config('app.firebase_uid', uid, true)
-- Idempotent: DROP IF EXISTS before CREATE

BEGIN;

--------------------------------------------------------------------------------
-- RESPONSES POLICIES
--------------------------------------------------------------------------------

-- User can SELECT their own responses
DROP POLICY IF EXISTS responses_select_own ON firebase_surveys.responses;
CREATE POLICY responses_select_own ON firebase_surveys.responses
  FOR SELECT USING (user_id = current_setting('app.firebase_uid', true));

-- User can INSERT responses with their own user_id
DROP POLICY IF EXISTS responses_insert_own ON firebase_surveys.responses;
CREATE POLICY responses_insert_own ON firebase_surveys.responses
  FOR INSERT WITH CHECK (user_id = current_setting('app.firebase_uid', true));

-- User can UPDATE their own responses
DROP POLICY IF EXISTS responses_update_own ON firebase_surveys.responses;
CREATE POLICY responses_update_own ON firebase_surveys.responses
  FOR UPDATE USING (user_id = current_setting('app.firebase_uid', true));

-- Admin bypass: when app.is_admin = 'true', allow all operations
DROP POLICY IF EXISTS responses_admin_all ON firebase_surveys.responses;
CREATE POLICY responses_admin_all ON firebase_surveys.responses
  FOR ALL USING (current_setting('app.is_admin', true) = 'true');

--------------------------------------------------------------------------------
-- ANSWERS POLICIES
-- Uses EXISTS for better performance than IN (SELECT ...)
--------------------------------------------------------------------------------

-- User can SELECT answers for their own responses
DROP POLICY IF EXISTS answers_select_own ON firebase_surveys.answers;
CREATE POLICY answers_select_own ON firebase_surveys.answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM firebase_surveys.responses r
      WHERE r.id = firebase_surveys.answers.response_id
        AND r.user_id = current_setting('app.firebase_uid', true)
    )
  );

-- User can INSERT answers for their own responses
DROP POLICY IF EXISTS answers_insert_own ON firebase_surveys.answers;
CREATE POLICY answers_insert_own ON firebase_surveys.answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM firebase_surveys.responses r
      WHERE r.id = response_id
        AND r.user_id = current_setting('app.firebase_uid', true)
    )
  );

-- User can UPDATE answers for their own responses
DROP POLICY IF EXISTS answers_update_own ON firebase_surveys.answers;
CREATE POLICY answers_update_own ON firebase_surveys.answers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM firebase_surveys.responses r
      WHERE r.id = firebase_surveys.answers.response_id
        AND r.user_id = current_setting('app.firebase_uid', true)
    )
  );

-- Admin bypass for answers
DROP POLICY IF EXISTS answers_admin_all ON firebase_surveys.answers;
CREATE POLICY answers_admin_all ON firebase_surveys.answers
  FOR ALL USING (current_setting('app.is_admin', true) = 'true');

COMMIT;
