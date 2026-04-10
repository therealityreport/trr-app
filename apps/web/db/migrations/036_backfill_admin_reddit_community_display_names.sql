-- Migration 036: Backfill default reddit community display names from subreddit

BEGIN;

UPDATE admin.reddit_communities
SET display_name = regexp_replace(btrim(subreddit), '^/?r/', '', 'i')
WHERE (display_name IS NULL OR btrim(display_name) = '')
  AND btrim(subreddit) <> '';

COMMIT;
