-- Migration 034: Rename "flare" columns to "flair" (correct Reddit terminology).
BEGIN;

-- 1. Drop old constraints (they reference old column names)
ALTER TABLE admin.reddit_communities
  DROP CONSTRAINT IF EXISTS reddit_communities_post_flares_is_array;
ALTER TABLE admin.reddit_communities
  DROP CONSTRAINT IF EXISTS reddit_communities_analysis_flares_is_array;
ALTER TABLE admin.reddit_communities
  DROP CONSTRAINT IF EXISTS reddit_communities_analysis_all_flares_is_array;
ALTER TABLE admin.reddit_communities
  DROP CONSTRAINT IF EXISTS reddit_communities_episode_required_flares_is_array;

-- 2. Rename columns
ALTER TABLE admin.reddit_communities
  RENAME COLUMN post_flares TO post_flairs;
ALTER TABLE admin.reddit_communities
  RENAME COLUMN post_flares_updated_at TO post_flairs_updated_at;
ALTER TABLE admin.reddit_communities
  RENAME COLUMN analysis_flares TO analysis_flairs;
ALTER TABLE admin.reddit_communities
  RENAME COLUMN analysis_all_flares TO analysis_all_flairs;
ALTER TABLE admin.reddit_communities
  RENAME COLUMN episode_required_flares TO episode_required_flairs;

-- 3. Re-add constraints with new names referencing new columns
ALTER TABLE admin.reddit_communities
  ADD CONSTRAINT reddit_communities_post_flairs_is_array
  CHECK (jsonb_typeof(post_flairs) = 'array');

ALTER TABLE admin.reddit_communities
  ADD CONSTRAINT reddit_communities_analysis_flairs_is_array
  CHECK (jsonb_typeof(analysis_flairs) = 'array');

ALTER TABLE admin.reddit_communities
  ADD CONSTRAINT reddit_communities_analysis_all_flairs_is_array
  CHECK (jsonb_typeof(analysis_all_flairs) = 'array');

ALTER TABLE admin.reddit_communities
  ADD CONSTRAINT reddit_communities_episode_required_flairs_is_array
  CHECK (jsonb_typeof(episode_required_flairs) = 'array');

COMMIT;
