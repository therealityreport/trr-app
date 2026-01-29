-- Migration 017: Create application role and grants for surveys schema
-- NOTE: If Supabase manages roles externally, this may need adjustment.
-- On Supabase, you may need to grant to 'authenticated' role or use service_role.

BEGIN;

-- Create application role (idempotent)
-- This role should be used for application connections with RLS enforced
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'trr_app') THEN
    CREATE ROLE trr_app NOINHERIT LOGIN;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- Role already exists, ignore
END
$$;

-- Grant schema usage
GRANT USAGE ON SCHEMA surveys TO trr_app;

-- Explicit table privileges
-- Read-only for survey definitions (users shouldn't modify these)
GRANT SELECT ON surveys.surveys TO trr_app;
GRANT SELECT ON surveys.questions TO trr_app;
GRANT SELECT ON surveys.options TO trr_app;
GRANT SELECT ON surveys.survey_runs TO trr_app;

-- Read-write for user data (controlled by RLS)
GRANT SELECT, INSERT, UPDATE ON surveys.responses TO trr_app;
GRANT SELECT, INSERT, UPDATE ON surveys.answers TO trr_app;

-- Sequence privileges for identity columns (uuid gen_random_uuid doesn't need this,
-- but included for completeness if serial/identity columns are added later)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA surveys TO trr_app;

-- Future tables/sequences (for convenience during development)
ALTER DEFAULT PRIVILEGES IN SCHEMA surveys GRANT SELECT ON TABLES TO trr_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA surveys GRANT USAGE, SELECT ON SEQUENCES TO trr_app;

COMMIT;
