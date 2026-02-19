-- Migration 025: Persist show-specific analysis flares per reddit community row.

BEGIN;

ALTER TABLE admin.reddit_communities
  ADD COLUMN IF NOT EXISTS analysis_flares JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reddit_communities_analysis_flares_is_array'
      AND conrelid = 'admin.reddit_communities'::regclass
  ) THEN
    ALTER TABLE admin.reddit_communities
      ADD CONSTRAINT reddit_communities_analysis_flares_is_array
      CHECK (jsonb_typeof(analysis_flares) = 'array');
  END IF;
END $$;

COMMIT;
