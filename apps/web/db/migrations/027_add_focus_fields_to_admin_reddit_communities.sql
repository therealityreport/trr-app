-- Migration 027: Add community focus metadata for show/network/franchise assignment.

BEGIN;

ALTER TABLE admin.reddit_communities
  ADD COLUMN IF NOT EXISTS is_show_focused BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS network_focus_targets JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS franchise_focus_targets JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reddit_communities_network_focus_targets_is_array'
      AND conrelid = 'admin.reddit_communities'::regclass
  ) THEN
    ALTER TABLE admin.reddit_communities
      ADD CONSTRAINT reddit_communities_network_focus_targets_is_array
      CHECK (jsonb_typeof(network_focus_targets) = 'array');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reddit_communities_franchise_focus_targets_is_array'
      AND conrelid = 'admin.reddit_communities'::regclass
  ) THEN
    ALTER TABLE admin.reddit_communities
      ADD CONSTRAINT reddit_communities_franchise_focus_targets_is_array
      CHECK (jsonb_typeof(franchise_focus_targets) = 'array');
  END IF;
END $$;

UPDATE admin.reddit_communities
   SET is_show_focused = true,
       network_focus_targets = '[]'::jsonb,
       franchise_focus_targets = '[]'::jsonb
 WHERE lower(subreddit) IN ('realhousewivesofslc', 'rhoslc');

UPDATE admin.reddit_communities
   SET is_show_focused = false,
       network_focus_targets = '["Bravo"]'::jsonb,
       franchise_focus_targets = '["Real Housewives"]'::jsonb
 WHERE lower(subreddit) IN ('bravorealhousewives', 'realhousewives');

COMMIT;
