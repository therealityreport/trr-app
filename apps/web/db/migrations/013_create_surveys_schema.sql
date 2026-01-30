-- Migration 013: Create firebase_surveys schema
-- This schema holds the normalized survey system (survey definitions, runs, responses, answers)
-- Uses Firebase Auth (text user_id) - separate from legacy surveys.* which uses Supabase Auth (UUID)

BEGIN;

CREATE SCHEMA IF NOT EXISTS firebase_surveys;

COMMIT;
