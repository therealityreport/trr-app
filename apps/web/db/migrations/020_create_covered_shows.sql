-- Migration 020: Create admin.covered_shows table
-- Stores the editorial list of shows that TRR covers

BEGIN;

-- ============================================================================
-- Covered shows (editorial list of shows TRR covers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin.covered_shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trr_show_id UUID NOT NULL UNIQUE,
  show_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_firebase_uid TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_covered_shows_trr_show ON admin.covered_shows(trr_show_id);

-- ============================================================================
-- Grants for app role
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON admin.covered_shows TO trr_app;

COMMIT;
