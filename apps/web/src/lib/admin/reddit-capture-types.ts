import type { components } from "@/lib/server/trr-api/generated/reddit-capture";

export type RedditRefreshPolicy = "missing" | "stale" | "force";
export type RedditRunCaptureContract = components["schemas"]["RedditRunCaptureContract"];
export type RedditWorkTarget = components["schemas"]["RedditWorkTarget"];
export type RedditTargetState = RedditWorkTarget["state"];
export interface RedditCaptureSettings {
  schedule: {
    enabled: boolean;
    timezone?: string;
    episode_airtimes?: string[];
    capture_payload?: Record<string, unknown>;
  };
  analysis: {
    enabled: boolean;
    scheduled_analysis_enabled?: boolean;
    model?: string;
    per_run_token_cap?: number;
    daily_token_budget?: number;
  };
}
export interface RedditWorkflowJob {
  id: string;
  status: string;
  result?: Record<string, unknown> | null;
  error?: string | null;
}
export type RedditCaptureEvidence = components["schemas"]["RedditCaptureEvidence"];
export type RedditPostCapture = components["schemas"]["RedditPostCapture"];
export interface RedditCoverage {
  community_id?: string;
  season_id?: string;
  runs?: Array<{ id: string; contract_version: number; requested?: number; satisfied?: number; unresolved?: number; evidence_state?: string; coverage?: RedditRunCaptureContract["coverage"] | null }>;
  posts?: RedditPostCapture[];
}
export const disabledRedditSettings: RedditCaptureSettings = { schedule: { enabled: false }, analysis: { enabled: false } };
