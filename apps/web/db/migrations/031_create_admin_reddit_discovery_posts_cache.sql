-- Migration 031: cache discovered Reddit posts per community/window for rate-limit resilience.

BEGIN;

CREATE TABLE IF NOT EXISTS admin.reddit_discovery_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES admin.reddit_communities (id) ON DELETE CASCADE,
  subreddit TEXT NOT NULL,
  reddit_post_id TEXT NOT NULL,
  title TEXT NOT NULL,
  text TEXT,
  url TEXT NOT NULL,
  permalink TEXT,
  author TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  num_comments INTEGER NOT NULL DEFAULT 0,
  posted_at TIMESTAMPTZ,
  link_flair_text TEXT,
  source_sorts TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  matched_terms TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  matched_cast_terms TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  cross_show_terms TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  is_show_match BOOLEAN NOT NULL DEFAULT false,
  passes_flair_filter BOOLEAN NOT NULL DEFAULT true,
  match_score INTEGER NOT NULL DEFAULT 0,
  last_discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reddit_discovery_posts_unique_community_post
  ON admin.reddit_discovery_posts (community_id, reddit_post_id);

CREATE INDEX IF NOT EXISTS idx_reddit_discovery_posts_community_posted
  ON admin.reddit_discovery_posts (community_id, posted_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_reddit_discovery_posts_community_discovered
  ON admin.reddit_discovery_posts (community_id, last_discovered_at DESC);

DROP TRIGGER IF EXISTS set_reddit_discovery_posts_updated_at ON admin.reddit_discovery_posts;
CREATE TRIGGER set_reddit_discovery_posts_updated_at
  BEFORE UPDATE ON admin.reddit_discovery_posts
  FOR EACH ROW EXECUTE FUNCTION admin.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON admin.reddit_discovery_posts TO trr_app;

COMMIT;
