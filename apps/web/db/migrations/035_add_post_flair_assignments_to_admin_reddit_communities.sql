BEGIN;

ALTER TABLE admin.reddit_communities
  ADD COLUMN IF NOT EXISTS post_flair_assignments JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reddit_communities_post_flair_assignments_is_object'
  ) THEN
    ALTER TABLE admin.reddit_communities
      ADD CONSTRAINT reddit_communities_post_flair_assignments_is_object
      CHECK (jsonb_typeof(post_flair_assignments) = 'object');
  END IF;
END $$;

COMMIT;
