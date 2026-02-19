-- Migration 026: Persist all-post analysis flares per reddit community row.

BEGIN;

ALTER TABLE admin.reddit_communities
  ADD COLUMN IF NOT EXISTS analysis_all_flares JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reddit_communities_analysis_all_flares_is_array'
      AND conrelid = 'admin.reddit_communities'::regclass
  ) THEN
    ALTER TABLE admin.reddit_communities
      ADD CONSTRAINT reddit_communities_analysis_all_flares_is_array
      CHECK (jsonb_typeof(analysis_all_flares) = 'array');
  END IF;
END $$;

COMMIT;
