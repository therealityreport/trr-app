-- Migration 023: Admin Reddit communities and threads
-- Stores show-level subreddit assignments and optional season-scoped thread links.

BEGIN;

CREATE TABLE IF NOT EXISTS admin.reddit_communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trr_show_id UUID NOT NULL,
  trr_show_name TEXT NOT NULL,
  subreddit TEXT NOT NULL,
  display_name TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by_firebase_uid TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reddit_communities_unique_show_subreddit
  ON admin.reddit_communities (trr_show_id, lower(subreddit));
CREATE INDEX IF NOT EXISTS idx_reddit_communities_show
  ON admin.reddit_communities (trr_show_id);
CREATE INDEX IF NOT EXISTS idx_reddit_communities_active
  ON admin.reddit_communities (is_active, updated_at DESC);

DROP TRIGGER IF EXISTS set_reddit_communities_updated_at ON admin.reddit_communities;
CREATE TRIGGER set_reddit_communities_updated_at
  BEFORE UPDATE ON admin.reddit_communities
  FOR EACH ROW EXECUTE FUNCTION admin.set_updated_at();

CREATE TABLE IF NOT EXISTS admin.reddit_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES admin.reddit_communities (id) ON DELETE CASCADE,
  trr_show_id UUID NOT NULL,
  trr_show_name TEXT NOT NULL,
  trr_season_id UUID,
  reddit_post_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  permalink TEXT,
  author TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  num_comments INTEGER NOT NULL DEFAULT 0,
  posted_at TIMESTAMPTZ,
  notes TEXT,
  created_by_firebase_uid TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reddit_threads_unique_show_post
  ON admin.reddit_threads (trr_show_id, reddit_post_id);
CREATE INDEX IF NOT EXISTS idx_reddit_threads_community
  ON admin.reddit_threads (community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reddit_threads_show
  ON admin.reddit_threads (trr_show_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reddit_threads_season
  ON admin.reddit_threads (trr_season_id)
  WHERE trr_season_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_reddit_threads_updated_at ON admin.reddit_threads;
CREATE TRIGGER set_reddit_threads_updated_at
  BEFORE UPDATE ON admin.reddit_threads
  FOR EACH ROW EXECUTE FUNCTION admin.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON admin.reddit_communities TO trr_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON admin.reddit_threads TO trr_app;

COMMIT;
