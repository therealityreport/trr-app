export const TWITTER_RESEARCH_ENDPOINT = "/api/admin/trr-api/social/twitter/search";

export type TwitterResearchRequest = {
  mode: "anonymous_research";
  provider: "lurkbird";
  query: string;
  sort: "latest" | "top";
  max_pages: number;
  max_items: number;
};

export type TwitterResearchPost = {
  tweet_id: string;
  date_time: string;
  text: string;
  url: string;
  username: string;
  likes: number | null;
  replies: number | null;
  views: number | null;
};

export type TwitterResearchResponse = {
  success: boolean;
  query: string;
  tweets: TwitterResearchPost[];
  tweets_found: number;
  complete: false;
  error: string | null;
  retrieval_meta: {
    retrieval_mode: "anonymous_research";
    provider: "lurkbird";
    status: "partial" | "unavailable";
    coverage: string;
    upstream_authentication: string;
    text_scope: string;
    pages_scanned: number;
    max_pages: number;
    max_items: number;
    stop_reason: string;
  };
};
