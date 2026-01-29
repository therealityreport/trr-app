-- Migration 013: Create surveys schema
-- This schema holds the normalized survey system (survey definitions, runs, responses, answers)

BEGIN;

CREATE SCHEMA IF NOT EXISTS surveys;

-- Grant usage to the default postgres role
GRANT USAGE ON SCHEMA surveys TO postgres;

COMMIT;
