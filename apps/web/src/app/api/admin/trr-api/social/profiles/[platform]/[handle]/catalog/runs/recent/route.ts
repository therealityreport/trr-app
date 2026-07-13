import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  getStaleRouteResponseCache,
  parseCacheTtlMs,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import { query } from "@/lib/server/postgres";
import { parseBoundedIntegerParam } from "@/lib/server/trr-api/query-integer-params";
import { socialProxyErrorResponse } from "@/lib/server/trr-api/social-admin-proxy";
import type { SocialAccountCatalogRun } from "@/lib/admin/social-account-profile";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ platform: string; handle: string }>;
};

type RecentCatalogRunRow = {
  job_id: string | null;
  run_id: string | null;
  status: string | null;
  created_at: string | Date | null;
  started_at: string | Date | null;
  completed_at: string | Date | null;
  error_message: string | null;
  run_config: Record<string, unknown> | null;
};

const CATALOG_BACKFILL_INGEST_MODE = "shared_account_catalog_backfill";
const CATALOG_RECENT_RUNS_CACHE_NAMESPACE = "social-account-catalog-recent-runs";
const CATALOG_RECENT_RUNS_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SOCIAL_PROFILE_CATALOG_RECENT_RUNS_CACHE_TTL_MS,
  10_000,
);
const CATALOG_RECENT_RUNS_STALE_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SOCIAL_PROFILE_CATALOG_RECENT_RUNS_STALE_CACHE_TTL_MS,
  60_000,
);
const CATALOG_RECENT_RUN_STAGES = [
  "shared_account_discovery",
  "shared_account_posts",
  "tiktok_posts_scrapling",
  "threads_posts_scrapling",
  "post_classify",
  "season_materialize",
  "analytics_refresh",
];
const SELECTED_TASKS = new Set(["post_details", "comments", "media"]);
const ACTIVE_FOLLOWUP_STATES = new Set(["queued", "pending", "retrying", "running", "attached", "cancelling"]);
const TERMINAL_PARENT_STATUSES = new Set(["cancelled", "failed"]);

const normalizeHandle = (value: string): string =>
  value.trim().toLowerCase().replace(/^@+/, "");

const readLimit = (request: NextRequest) =>
  parseBoundedIntegerParam(request.nextUrl.searchParams.get("limit"), {
    name: "limit",
    defaultValue: 10,
    min: 1,
    max: 25,
  });

const readRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const readString = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text || null;
};

const readLowerString = (value: unknown): string | null => {
  const text = readString(value)?.toLowerCase() ?? "";
  return text || null;
};

const normalizeIso = (value: string | Date | null | undefined): string | null => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const text = String(value).trim();
  return text || null;
};

const normalizeTasks = (value: unknown): Array<"post_details" | "comments" | "media"> => {
  if (!Array.isArray(value)) return [];
  const tasks: Array<"post_details" | "comments" | "media"> = [];
  for (const item of value) {
    const normalized = String(item ?? "").trim().toLowerCase();
    if (SELECTED_TASKS.has(normalized) && !tasks.includes(normalized as (typeof tasks)[number])) {
      tasks.push(normalized as (typeof tasks)[number]);
    }
  }
  return tasks;
};

const normalizeCommentsSource = (
  value: unknown,
): "new_run" | "reused_run" | "deferred_after_catalog" | null => {
  const normalized = readLowerString(value);
  if (normalized === "new_run" || normalized === "reused_run" || normalized === "deferred_after_catalog") {
    return normalized;
  }
  return null;
};

const coerceAttachedStateForParent = (parentStatus: string | null, state: string | null): string | null => {
  if (parentStatus && TERMINAL_PARENT_STATUSES.has(parentStatus) && state && ACTIVE_FOLLOWUP_STATES.has(state)) {
    return parentStatus;
  }
  return state;
};

const normalizeAttachedFollowups = (
  runConfig: Record<string, unknown>,
  runStatus: string | null,
): SocialAccountCatalogRun["attached_followups"] => {
  const raw = readRecord(runConfig.attached_followups);
  const comments = readRecord(raw.comments);
  const media = readRecord(raw.media);
  const attached: NonNullable<SocialAccountCatalogRun["attached_followups"]> = {};

  const commentsRunId = readString(comments.run_id ?? runConfig.comments_run_id);
  const commentsStatus = readLowerString(comments.status);
  const commentsState = coerceAttachedStateForParent(runStatus, readLowerString(comments.state));
  const commentsSource = normalizeCommentsSource(comments.source);
  if (commentsRunId || commentsStatus || commentsState || commentsSource) {
    attached.comments = {
      run_id: commentsRunId,
      status: runStatus && TERMINAL_PARENT_STATUSES.has(runStatus) && !commentsRunId ? runStatus : commentsStatus,
      state: commentsState,
      source: commentsSource ?? "deferred_after_catalog",
      error_message: readString(comments.error_message),
      failed_at: readString(comments.failed_at),
      retryable: typeof comments.retryable === "boolean" ? comments.retryable : null,
    };
  }

  const mediaJobIds = Array.isArray(media.enqueued_job_ids)
    ? media.enqueued_job_ids.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];
  const mediaStatus = readLowerString(media.status);
  const mediaState = coerceAttachedStateForParent(runStatus, readLowerString(media.state));
  const mediaSource = readLowerString(media.source);
  const mediaCount = Number(media.enqueued_job_count ?? mediaJobIds.length);
  if (readString(media.attachment_id) || mediaStatus || mediaState || mediaSource || mediaJobIds.length > 0 || mediaCount > 0) {
    attached.media = {
      attachment_id: readString(media.attachment_id),
      status: runStatus && TERMINAL_PARENT_STATUSES.has(runStatus) && !mediaJobIds.length ? runStatus : mediaStatus,
      state: mediaState,
      source: mediaSource === "comments_media_followups" ? "comments_media_followups" : "catalog_media_mirror",
      enqueued_job_ids: mediaJobIds,
      enqueued_job_count: Number.isFinite(mediaCount) ? Math.max(0, mediaCount) : mediaJobIds.length,
    };
  }

  return Object.keys(attached).length > 0 ? attached : {};
};

const normalizeRun = (row: RecentCatalogRunRow): SocialAccountCatalogRun => {
  const runConfig = readRecord(row.run_config);
  const status = readLowerString(row.status);
  const selectedTasks = normalizeTasks(runConfig.selected_tasks);
  const effectiveTasks = normalizeTasks(runConfig.effective_selected_tasks);
  return {
    job_id: readString(row.job_id) ?? "",
    run_id: readString(row.run_id) ?? "",
    status,
    created_at: normalizeIso(row.created_at),
    started_at: normalizeIso(row.started_at),
    completed_at: normalizeIso(row.completed_at),
    error_message: readString(row.error_message),
    catalog_action: readLowerString(runConfig.catalog_action) as SocialAccountCatalogRun["catalog_action"],
    catalog_action_scope: readLowerString(runConfig.catalog_action_scope) as SocialAccountCatalogRun["catalog_action_scope"],
    date_start: normalizeIso(readString(runConfig.date_start)),
    date_end: normalizeIso(readString(runConfig.date_end)),
    launch_group_id: readString(runConfig.launch_group_id),
    launch_state: readLowerString(runConfig.launch_state) as SocialAccountCatalogRun["launch_state"],
    selected_tasks: selectedTasks,
    effective_selected_tasks: effectiveTasks.length > 0 ? effectiveTasks : selectedTasks,
    comments_run_id: readString(runConfig.comments_run_id),
    attached_followups: normalizeAttachedFollowups(runConfig, status),
  } as SocialAccountCatalogRun;
};

const fetchRecentRunsPayload = async ({
  normalizedPlatform,
  normalizedHandle,
  limit,
}: {
  normalizedPlatform: string;
  normalizedHandle: string;
  limit: number;
}) => {
  const result = await query<RecentCatalogRunRow>(
    `
    with scoped_runs as (
      select
        r.id as run_uuid,
        r.id::text as run_id,
        coalesce(r.config, '{}'::jsonb) as run_config,
        r.status as run_status,
        r.created_at as run_created_at,
        r.started_at as run_started_at,
        r.completed_at as run_completed_at
      from social.scrape_runs r
      where coalesce(r.config->>'pipeline_ingest_mode', '') = $1
        and nullif(coalesce(r.config->>'failure_dismissed_at', ''), '') is null
        and (
          exists (
            select 1
            from social.scrape_jobs j
            where j.run_id = r.id
              and j.platform = $2
              and lower(coalesce(nullif(j.config->>'account', ''), nullif(j.metadata->>'account', ''), '')) = $3
              and lower(
                coalesce(
                  nullif(j.config->>'stage', ''),
                  nullif(j.metadata->>'stage', ''),
                  nullif(j.job_type, ''),
                  'unknown'
                )
              ) = any($4::text[])
          )
          or (
            (
              lower(coalesce(r.config->>'launch_state', '')) = 'pending'
              or lower(coalesce(r.config->>'launch_task_resolution_pending', 'false')) = 'true'
            )
            and lower(coalesce(nullif(r.config->>'platform', ''), nullif(r.config->'platforms'->>0, ''), '')) = $2
            and ltrim(
              lower(
                coalesce(
                  nullif(r.config->>'account_handle', ''),
                  nullif(r.config->>'account', ''),
                  nullif(r.config->'accounts_override'->>0, ''),
                  ''
                )
              ),
              '@'
            ) = $3
          )
        )
    )
    select
      latest_job.job_id,
      scoped_runs.run_id,
      coalesce(nullif(lower(coalesce(scoped_runs.run_status, '')), ''), latest_job.job_status) as status,
      scoped_runs.run_created_at as created_at,
      scoped_runs.run_started_at as started_at,
      scoped_runs.run_completed_at as completed_at,
      latest_error.error_message as error_message,
      scoped_runs.run_config
    from scoped_runs
    left join lateral (
      select
        j.id::text as job_id,
        lower(coalesce(nullif(j.status, ''), '')) as job_status
      from social.scrape_jobs j
      where j.run_id = scoped_runs.run_uuid
        and j.platform = $2
        and lower(coalesce(nullif(j.config->>'account', ''), nullif(j.metadata->>'account', ''), '')) = $3
        and lower(
          coalesce(
            nullif(j.config->>'stage', ''),
            nullif(j.metadata->>'stage', ''),
            nullif(j.job_type, ''),
            'unknown'
          )
        ) = any($4::text[])
      order by coalesce(j.completed_at, j.started_at, j.created_at) desc, j.id desc
      limit 1
    ) latest_job on true
    left join lateral (
      select j.error_message
      from social.scrape_jobs j
      where j.run_id = scoped_runs.run_uuid
        and j.platform = $2
        and lower(coalesce(nullif(j.config->>'account', ''), nullif(j.metadata->>'account', ''), '')) = $3
        and lower(
          coalesce(
            nullif(j.config->>'stage', ''),
            nullif(j.metadata->>'stage', ''),
            nullif(j.job_type, ''),
            'unknown'
          )
        ) = any($4::text[])
        and nullif(j.error_message, '') is not null
      order by coalesce(j.completed_at, j.started_at, j.created_at) desc, j.id desc
      limit 1
    ) latest_error on true
    order by scoped_runs.run_created_at desc, scoped_runs.run_id desc
    limit $5
    `,
    [CATALOG_BACKFILL_INGEST_MODE, normalizedPlatform, normalizedHandle, CATALOG_RECENT_RUN_STAGES, limit],
  );
  const runs = (result.rows ?? [])
    .map(normalizeRun)
    .filter((run) => String(run.run_id || "").trim().length > 0);
  return {
    platform: normalizedPlatform,
    handle: normalizedHandle,
    catalog_recent_runs: runs,
  };
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAdmin(request);
    const { platform, handle } = await context.params;
    const normalizedPlatform = platform.trim().toLowerCase();
    const normalizedHandle = normalizeHandle(handle);
    if (normalizedPlatform !== "instagram" || !normalizedHandle) {
      return NextResponse.json({ error: "unsupported_profile" }, { status: 400 });
    }
    const limitResult = readLimit(request);
    if (!limitResult.ok) {
      return NextResponse.json({ error: limitResult.error }, { status: 400 });
    }
    const limit = limitResult.value;
    const cacheKey = buildUserScopedRouteCacheKey(
      String(user?.uid ?? "admin"),
      `${normalizedPlatform}:${normalizedHandle}:catalog-runs-recent`,
      request.nextUrl.searchParams,
    );
    const cached = getRouteResponseCache(CATALOG_RECENT_RUNS_CACHE_NAMESPACE, cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "x-trr-cache": "hit" } });
    }
    const stale = getStaleRouteResponseCache(CATALOG_RECENT_RUNS_CACHE_NAMESPACE, cacheKey);
    try {
      const payload = await getOrCreateRouteResponsePromise(CATALOG_RECENT_RUNS_CACHE_NAMESPACE, cacheKey, async () => {
        const nextPayload = await fetchRecentRunsPayload({ normalizedPlatform, normalizedHandle, limit });
        setRouteResponseCache(
          CATALOG_RECENT_RUNS_CACHE_NAMESPACE,
          cacheKey,
          nextPayload,
          CATALOG_RECENT_RUNS_CACHE_TTL_MS,
          CATALOG_RECENT_RUNS_STALE_CACHE_TTL_MS,
        );
        return nextPayload;
      });
      return NextResponse.json(payload, { headers: { "x-trr-cache": "miss" } });
    } catch (error) {
      if (stale) {
        return NextResponse.json(stale, {
          headers: { "x-trr-cache": "stale", "x-trr-cacheable": "0" },
        });
      }
      throw error;
    }
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to load social account catalog recent runs");
  }
}
