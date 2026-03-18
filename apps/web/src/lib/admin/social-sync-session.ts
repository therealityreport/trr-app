export type SocialSyncPlatform = "instagram" | "tiktok" | "twitter" | "youtube" | "facebook" | "threads";
export type SocialSyncSourceScope = "bravo" | "creator" | "community";
export type SocialYouTubeSourceMode = "hybrid" | "api_only" | "scraper_only";
export type SocialSyncRetryKind =
  | "retry_missing_comments"
  | "retry_failed_media"
  | "retry_missing_avatars"
  | "retry_missing_comment_media";

const CAPPED_DEPTH_PLATFORMS = new Set<SocialSyncPlatform>(["tiktok", "twitter", "facebook", "threads"]);

export interface SocialSyncSessionRequest {
  source_scope: SocialSyncSourceScope;
  platforms?: SocialSyncPlatform[];
  accounts_override?: string[];
  hashtags_override?: string[];
  keywords_override?: string[];
  sound_ids?: string[];
  max_posts_per_target: number;
  max_comments_per_post: number;
  max_replies_per_post: number;
  fetch_replies: boolean;
  sync_strategy: "incremental";
  allow_inline_dev_fallback: boolean;
  date_start: string;
  date_end: string;
  youtube_source_mode?: SocialYouTubeSourceMode;
  youtube_force_reindex?: boolean;
  youtube_force_media_refresh?: boolean;
  youtube_force_comment_refresh?: boolean;
}

interface BuildSocialSyncSessionRequestOptions {
  sourceScope: SocialSyncSourceScope;
  platforms: SocialSyncPlatform[] | null;
  dateStart: string;
  dateEnd: string;
  accountsOverride?: string[];
  hashtagsOverride?: string[];
  keywordsOverride?: string[];
  soundIds?: string[];
  youtubeSourceMode?: SocialYouTubeSourceMode;
  youtubeForceReindex?: boolean;
  youtubeForceMediaRefresh?: boolean;
  youtubeForceCommentRefresh?: boolean;
}

export const buildSocialSyncSessionRequest = ({
  sourceScope,
  platforms,
  dateStart,
  dateEnd,
  accountsOverride,
  hashtagsOverride,
  keywordsOverride,
  soundIds,
  youtubeSourceMode,
  youtubeForceReindex,
  youtubeForceMediaRefresh,
  youtubeForceCommentRefresh,
}: BuildSocialSyncSessionRequestOptions): SocialSyncSessionRequest => {
  const requestedPlatforms =
    platforms && platforms.length > 0
      ? platforms
      : (["instagram", "tiktok", "twitter", "youtube", "facebook", "threads"] as SocialSyncPlatform[]);
  const singlePlatform = requestedPlatforms.length === 1;
  const singlePlatformTarget = singlePlatform ? requestedPlatforms[0] : null;
  const shouldUseCappedDepth = requestedPlatforms.some((platform) => CAPPED_DEPTH_PLATFORMS.has(platform));
  const shouldFetchReplies = singlePlatformTarget !== "instagram";

  const payload: SocialSyncSessionRequest = {
    source_scope: sourceScope,
    max_posts_per_target: 0,
    max_comments_per_post: shouldUseCappedDepth ? 5_000 : 0,
    max_replies_per_post: shouldUseCappedDepth ? 1_000 : 0,
    fetch_replies: shouldFetchReplies,
    sync_strategy: "incremental",
    allow_inline_dev_fallback: false,
    date_start: dateStart,
    date_end: dateEnd,
  };
  if (platforms && platforms.length > 0) payload.platforms = platforms;
  if (accountsOverride && accountsOverride.length > 0) payload.accounts_override = accountsOverride;
  if (hashtagsOverride && hashtagsOverride.length > 0) payload.hashtags_override = hashtagsOverride;
  if (keywordsOverride && keywordsOverride.length > 0) payload.keywords_override = keywordsOverride;
  if (soundIds && soundIds.length > 0) payload.sound_ids = soundIds;
  if (youtubeSourceMode) payload.youtube_source_mode = youtubeSourceMode;
  if (youtubeForceReindex) payload.youtube_force_reindex = youtubeForceReindex;
  if (youtubeForceMediaRefresh) payload.youtube_force_media_refresh = youtubeForceMediaRefresh;
  if (youtubeForceCommentRefresh) payload.youtube_force_comment_refresh = youtubeForceCommentRefresh;
  return payload;
};

export interface SocialSyncSessionProgressSnapshot {
  sync_session_id: string;
  status: string;
  display_status?: string | null;
  status_reason?: string | null;
  auth_mode?: string | null;
  execution_path?: string | null;
  queue_cap?: number | string | null;
  queue_wait_state?: string | null;
  source_mode?: string | null;
  worker_version?: string | null;
  follow_up_dimensions?: string[];
  next_pass_kind?: string | null;
  expected_after_current_pass?: string | null;
  season_id: string;
  source_scope: SocialSyncSourceScope;
  platforms: SocialSyncPlatform[];
  date_start: string | null;
  date_end: string | null;
  current_pass_kind: string | null;
  current_pass_attempt: number;
  current_run_id: string | null;
  pass_sequence: number;
  follow_up_reason: string | null;
  pass_history: Array<Record<string, unknown>>;
  coverage_by_dimension?: Record<string, Record<string, unknown>>;
  follow_up_breakdown?: Record<string, number>;
  platform_diagnostics?: Record<
    string,
    {
      platform?: string;
      auth_mode?: string | null;
      auth_status_reason?: string | null;
      execution_path?: string | null;
      queue_cap?: number | null;
      queue_wait_state?: string | null;
      queue_age_seconds?: number | null;
      queue_enabled?: boolean;
      worker_required?: boolean;
      remote_only?: boolean;
      source_mode?: string | null;
      coverage_by_dimension?: Record<string, Record<string, unknown> | null>;
      follow_up_breakdown?: Record<string, number>;
      worker_version?: string | null;
      warnings?: string[];
    }
  >;
  worker_health?: {
    queue_enabled?: boolean;
    healthy?: boolean;
    healthy_workers?: number;
    reason?: string | null;
    oldest_queued_age_seconds?: number | null;
  } | null;
  completeness_snapshot: {
    up_to_date?: boolean;
    missing_asset_count?: number;
    missing_comment_media_count?: number;
    missing_avatar_count?: number;
    incomplete_post_count?: number;
    targeted_anchor_count?: number;
    comment_target_count?: number;
    detail_target_count?: number;
    avatar_target_count?: number;
    comment_media_target_count?: number;
    follow_up_dimensions?: string[];
    comments_coverage?: Record<string, unknown>;
    asset_coverage?: Record<string, unknown>;
    comment_media_coverage?: Record<string, unknown>;
    avatar_coverage?: Record<string, unknown>;
  };
  current_run?: {
    id: string;
    status: string;
    summary?: Record<string, unknown>;
  } | null;
}

export interface SocialSyncSessionStreamPayload {
  seq?: number;
  emitted_at?: string;
  sync_session: SocialSyncSessionProgressSnapshot;
  run_progress?: Record<string, unknown> | null;
}

interface ConsumeSocialSyncSessionStreamOptions {
  url: string;
  headers?: HeadersInit;
  signal?: AbortSignal;
  onOpen?: () => void;
  onMessage: (payload: SocialSyncSessionStreamPayload) => void | Promise<void>;
}

const readStreamErrorMessage = async (response: Response): Promise<string> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string; detail?: string };
    return payload.error ?? payload.detail ?? `Failed to connect to sync session stream (${response.status})`;
  }
  const text = await response.text().catch(() => "");
  return text.trim() || `Failed to connect to sync session stream (${response.status})`;
};

export async function consumeSocialSyncSessionStream({
  url,
  headers,
  signal,
  onOpen,
  onMessage,
}: ConsumeSocialSyncSessionStreamOptions): Promise<void> {
  const response = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new Error(await readStreamErrorMessage(response));
  }
  if (!response.body) {
    throw new Error("Sync session stream unavailable");
  }

  onOpen?.();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const processChunk = async (chunk: string): Promise<void> => {
    const trimmedChunk = chunk.trim();
    if (!trimmedChunk || trimmedChunk.startsWith(":")) return;

    let eventType = "message";
    const dataLines: string[] = [];
    for (const rawLine of trimmedChunk.split(/\r?\n/)) {
      if (!rawLine) continue;
      if (rawLine.startsWith("event:")) {
        eventType = rawLine.slice("event:".length).trim() || "message";
        continue;
      }
      if (rawLine.startsWith("data:")) {
        dataLines.push(rawLine.slice("data:".length).trim());
      }
    }
    if (eventType !== "sync_session" || dataLines.length === 0) return;

    const payload = JSON.parse(dataLines.join("\n")) as SocialSyncSessionStreamPayload;
    await onMessage(payload);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundaryIndex = buffer.indexOf("\n\n");
      while (boundaryIndex >= 0) {
        const chunk = buffer.slice(0, boundaryIndex);
        buffer = buffer.slice(boundaryIndex + 2);
        await processChunk(chunk);
        boundaryIndex = buffer.indexOf("\n\n");
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      await processChunk(buffer);
    }
  } finally {
    reader.releaseLock();
  }
}
