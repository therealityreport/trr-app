-- Migration 024: Persist potential Reddit post flairs per community.

BEGIN;

ALTER TABLE admin.reddit_communities
  ADD COLUMN IF NOT EXISTS post_flares JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS post_flares_updated_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reddit_communities_post_flares_is_array'
      AND conrelid = 'admin.reddit_communities'::regclass
  ) THEN
    ALTER TABLE admin.reddit_communities
      ADD CONSTRAINT reddit_communities_post_flares_is_array
      CHECK (jsonb_typeof(post_flares) = 'array');
  END IF;
END $$;

COMMIT;
