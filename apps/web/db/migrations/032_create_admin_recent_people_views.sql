-- Migration 032: persist admin people detail recents per firebase user.

BEGIN;

CREATE TABLE IF NOT EXISTS admin.recent_people_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT NOT NULL,
  person_id UUID NOT NULL REFERENCES core.people (id) ON DELETE CASCADE,
  show_context TEXT,
  view_count INTEGER NOT NULL DEFAULT 1,
  first_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recent_people_views_unique_user_person UNIQUE (firebase_uid, person_id)
);

CREATE INDEX IF NOT EXISTS idx_recent_people_views_user_last_viewed
  ON admin.recent_people_views (firebase_uid, last_viewed_at DESC);

DROP TRIGGER IF EXISTS set_recent_people_views_updated_at ON admin.recent_people_views;
CREATE TRIGGER set_recent_people_views_updated_at
  BEFORE UPDATE ON admin.recent_people_views
  FOR EACH ROW EXECUTE FUNCTION admin.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON admin.recent_people_views TO trr_app;

COMMIT;
