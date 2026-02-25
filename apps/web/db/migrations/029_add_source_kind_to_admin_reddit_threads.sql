-- Migration 029: Track reddit thread source provenance for manual vs episode-sync saves.

BEGIN;

ALTER TABLE admin.reddit_threads
  ADD COLUMN IF NOT EXISTS source_kind TEXT NOT NULL DEFAULT 'manual';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reddit_threads_source_kind_valid'
      AND conrelid = 'admin.reddit_threads'::regclass
  ) THEN
    ALTER TABLE admin.reddit_threads
      ADD CONSTRAINT reddit_threads_source_kind_valid
      CHECK (source_kind IN ('manual', 'episode_discussion'));
  END IF;
END $$;

UPDATE admin.reddit_threads
   SET source_kind = 'episode_discussion'
 WHERE source_kind = 'manual'
   AND trr_season_id IS NOT NULL
   AND COALESCE(author, '') ILIKE 'AutoModerator'
   AND title ILIKE '%episode discussion%';

COMMIT;
