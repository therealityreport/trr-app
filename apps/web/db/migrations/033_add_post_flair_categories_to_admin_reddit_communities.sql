-- Migration 033: Add flair categorization (cast / season) to reddit communities.

BEGIN;

ALTER TABLE admin.reddit_communities
  ADD COLUMN IF NOT EXISTS post_flair_categories JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reddit_communities_post_flair_categories_is_object'
      AND conrelid = 'admin.reddit_communities'::regclass
  ) THEN
    ALTER TABLE admin.reddit_communities
      ADD CONSTRAINT reddit_communities_post_flair_categories_is_object
      CHECK (jsonb_typeof(post_flair_categories) = 'object');
  END IF;
END $$;

COMMIT;
