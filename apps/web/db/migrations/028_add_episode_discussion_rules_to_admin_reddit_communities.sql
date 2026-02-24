-- Migration 028: Add per-community episode discussion discovery rules.

BEGIN;

ALTER TABLE admin.reddit_communities
  ADD COLUMN IF NOT EXISTS episode_title_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS episode_required_flares JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reddit_communities_episode_title_patterns_is_array'
      AND conrelid = 'admin.reddit_communities'::regclass
  ) THEN
    ALTER TABLE admin.reddit_communities
      ADD CONSTRAINT reddit_communities_episode_title_patterns_is_array
      CHECK (jsonb_typeof(episode_title_patterns) = 'array');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reddit_communities_episode_required_flares_is_array'
      AND conrelid = 'admin.reddit_communities'::regclass
  ) THEN
    ALTER TABLE admin.reddit_communities
      ADD CONSTRAINT reddit_communities_episode_required_flares_is_array
      CHECK (jsonb_typeof(episode_required_flares) = 'array');
  END IF;
END $$;

UPDATE admin.reddit_communities
   SET episode_title_patterns = '["Live Episode Discussion","Post Episode Discussion","Weekly Episode Discussion"]'::jsonb
 WHERE lower(subreddit) = 'bravorealhousewives'
   AND COALESCE(jsonb_array_length(episode_title_patterns), 0) = 0;

COMMIT;
