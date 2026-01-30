-- Migration 019: Create survey_trr_links and social_posts tables
-- Links normalized surveys to TRR shows/seasons from core API
-- Stores social media posts per show for admin reference

BEGIN;

-- ============================================================================
-- Link normalized surveys to TRR shows/seasons
-- ============================================================================
CREATE TABLE IF NOT EXISTS firebase_surveys.survey_trr_links (
  survey_id UUID PRIMARY KEY REFERENCES firebase_surveys.surveys(id) ON DELETE CASCADE,
  trr_show_id UUID NOT NULL,
  trr_season_id UUID,
  trr_episode_id UUID,
  season_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_survey_trr_links_show ON firebase_surveys.survey_trr_links(trr_show_id);
CREATE INDEX idx_survey_trr_links_season ON firebase_surveys.survey_trr_links(trr_season_id);

-- Unique constraint: one survey per show+season combination
-- This prevents duplicate surveys for the same show/season
CREATE UNIQUE INDEX idx_survey_trr_links_unique_show_season
  ON firebase_surveys.survey_trr_links(trr_show_id, season_number)
  WHERE season_number IS NOT NULL;

-- Trigger for updated_at (reuse existing function from firebase_surveys schema)
CREATE TRIGGER set_survey_trr_links_updated_at
  BEFORE UPDATE ON firebase_surveys.survey_trr_links
  FOR EACH ROW EXECUTE FUNCTION firebase_surveys.set_updated_at();

-- ============================================================================
-- Admin schema for admin-only data
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS admin;

-- ============================================================================
-- Social posts per show (admin schema)
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin.show_social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trr_show_id UUID NOT NULL,
  trr_season_id UUID,
  platform TEXT NOT NULL CHECK (platform IN ('reddit', 'twitter', 'instagram', 'tiktok', 'youtube', 'other')),
  url TEXT NOT NULL,
  title TEXT,
  notes TEXT,
  -- Use Firebase UID (text), NOT Supabase auth.users UUID
  -- No FK since admin identity is Firebase Auth, not Supabase Auth
  created_by_firebase_uid TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_show_social_posts_show ON admin.show_social_posts(trr_show_id);
CREATE INDEX idx_show_social_posts_season ON admin.show_social_posts(trr_season_id);

-- Trigger for updated_at in admin schema
CREATE OR REPLACE FUNCTION admin.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_show_social_posts_updated_at
  BEFORE UPDATE ON admin.show_social_posts
  FOR EACH ROW EXECUTE FUNCTION admin.set_updated_at();

-- ============================================================================
-- RLS: Intentionally NOT enabled for admin tables
-- ============================================================================
-- These tables are ONLY accessed via server-side API routes that call requireAdmin().
-- The connecting role is the app's service role, not end-user sessions.
-- RLS is intentionally NOT enabled to avoid empty-policy denial.
-- Security is enforced at the API layer, not the DB layer.

-- ============================================================================
-- Grants for app role
-- ============================================================================
-- Grant on firebase_surveys.survey_trr_links (admin table in firebase_surveys schema)
GRANT SELECT, INSERT, UPDATE, DELETE ON firebase_surveys.survey_trr_links TO trr_app;

-- Grant on admin schema and tables
GRANT USAGE ON SCHEMA admin TO trr_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON admin.show_social_posts TO trr_app;

-- Future tables in admin schema
ALTER DEFAULT PRIVILEGES IN SCHEMA admin GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO trr_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA admin GRANT USAGE, SELECT ON SEQUENCES TO trr_app;

COMMIT;
