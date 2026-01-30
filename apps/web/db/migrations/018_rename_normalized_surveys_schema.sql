-- Migration 018: Conditionally rename surveys schema to firebase_surveys
-- This handles dev/staging DBs that previously ran migrations 013-017
-- when they were targeting the 'surveys' schema.
--
-- Logic:
-- 1. If firebase_surveys already exists, do nothing (already renamed or fresh install)
-- 2. If surveys.survey_runs exists AND question_type enum exists AND user_id is TEXT,
--    this is OUR normalized schema (not legacy Supabase schema), so rename it.
-- 3. Otherwise, do nothing (legacy Supabase surveys schema, don't touch)

DO $$
BEGIN
  -- Skip if firebase_surveys already exists
  IF EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'firebase_surveys'
  ) THEN
    RAISE NOTICE 'firebase_surveys schema already exists, skipping rename';
    RETURN;
  END IF;

  -- Only rename if this looks like OUR normalized schema (Firebase-style)
  -- Checks:
  --   1. survey_runs table exists (not in legacy Supabase schema)
  --   2. question_type enum exists
  --   3. responses.user_id is TEXT (Firebase UID), not UUID (Supabase Auth)
  IF to_regclass('surveys.survey_runs') IS NOT NULL
     AND to_regtype('surveys.question_type') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'surveys'
         AND table_name = 'responses'
         AND column_name = 'user_id'
         AND data_type = 'text'
     )
  THEN
    RAISE NOTICE 'Detected Firebase-style normalized surveys schema, renaming surveys -> firebase_surveys';
    EXECUTE 'ALTER SCHEMA surveys RENAME TO firebase_surveys';
  ELSE
    RAISE NOTICE 'surveys schema does not match Firebase-style normalized schema, skipping rename';
  END IF;
END $$;
