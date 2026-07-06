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
import { socialProxyErrorResponse } from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ platform: string; handle: string }>;
};

type CompletionRow = {
  total_posts: number | string | null;
  total_reported_comments: number | string | null;
  saved_comments: number | string | null;
  missing_comments: number | string | null;
  accounted_comments: number | string | null;
  comments_finished: number | string | null;
  comments_in_progress: number | string | null;
  comments_not_started: number | string | null;
  details_finished: number | string | null;
  details_not_started: number | string | null;
  media_finished: number | string | null;
  media_in_progress: number | string | null;
  media_not_started: number | string | null;
};

const COMPLETION_SUMMARY_CACHE_NAMESPACE = "social-account-profile-completion-summary";
const COMPLETION_SUMMARY_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SOCIAL_PROFILE_COMPLETION_SUMMARY_CACHE_TTL_MS,
  5 * 60_000,
);
const COMPLETION_SUMMARY_STALE_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SOCIAL_PROFILE_COMPLETION_SUMMARY_STALE_CACHE_TTL_MS,
  10 * 60_000,
);

const readCount = (value: number | string | null | undefined): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getDefaultYear = (): number => new Date().getUTCFullYear();

const readYear = (request: NextRequest): number => {
  const fallbackYear = getDefaultYear();
  const parsed = Number(request.nextUrl.searchParams.get("year") ?? String(fallbackYear));
  return Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100 ? parsed : fallbackYear;
};

const sqlJsonTextNonNegativeInt = (expr: string): string =>
  `coalesce(nullif(regexp_replace(coalesce(${expr}, ''), '[^0-9]', '', 'g'), '')::bigint, 0)`;

const instagramRawReportedCommentsSql = (alias: string): string => {
  const safeAlias = alias.trim() || "p";
  const raw = `coalesce(${safeAlias}.raw_data, '{}'::jsonb)`;
  return `greatest(${[
    `${raw} ->> 'comments_count'`,
    `${raw} ->> 'comments'`,
    `${raw} ->> 'comment_count'`,
    `${raw} ->> 'commentsCount'`,
    `${raw} -> 'edge_media_to_comment' ->> 'count'`,
    `${raw} -> 'edge_media_to_parent_comment' ->> 'count'`,
    `${raw} -> 'edge_media_preview_comment' ->> 'count'`,
    `${raw} -> 'media' ->> 'comments_count'`,
    `${raw} -> 'media' ->> 'comments'`,
    `${raw} -> 'media' ->> 'comment_count'`,
    `${raw} -> 'media' ->> 'commentsCount'`,
    `${raw} -> 'metrics' ->> 'comments_count'`,
    `${raw} -> 'metrics' ->> 'comments'`,
  ]
    .map(sqlJsonTextNonNegativeInt)
    .join(", ")}, 0)`;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAdmin(request);
    const { platform, handle } = await context.params;
    const normalizedPlatform = platform.trim().toLowerCase();
    const normalizedHandle = handle.trim().toLowerCase().replace(/^@/, "");
    if (normalizedPlatform !== "instagram" || !normalizedHandle) {
      return NextResponse.json({ error: "unsupported_profile" }, { status: 400 });
    }
    const year = readYear(request);
    const cacheKey = buildUserScopedRouteCacheKey(
      String(user?.uid ?? "admin"),
      `${normalizedPlatform}:${normalizedHandle}:completion-summary`,
      new URLSearchParams([["year", String(year)]]),
    );
    const cached = getRouteResponseCache(COMPLETION_SUMMARY_CACHE_NAMESPACE, cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "x-trr-cache": "hit" } });
    }
    const stale = getStaleRouteResponseCache(COMPLETION_SUMMARY_CACHE_NAMESPACE, cacheKey);
    const loadPayload = async () => {
    const instagramPostReportedCommentsSql = instagramRawReportedCommentsSql("p");
    const result = await query<CompletionRow>(
      `
      with target as (
        select
          $1::text as handle,
          make_timestamptz($2, 1, 1, 0, 0, 0) as start_at,
          make_timestamptz($2 + 1, 1, 1, 0, 0, 0) as end_at
      ),
      catalog_candidates as materialized (
        select
          cp.source_id as shortcode,
          cp.posted_at,
          coalesce(cp.comments_count, 0)::bigint as catalog_comments_count
        from social.instagram_account_catalog_posts cp
        cross join target t
        where cp.posted_at >= t.start_at
          and cp.posted_at < t.end_at
          and nullif(cp.source_id, '') is not null
          and (
            nullif(regexp_replace(lower(regexp_replace(coalesce(cp.source_account, ''), '^@+', '')), '[^a-z0-9._-]+', '', 'g'), '') = t.handle
            or nullif(regexp_replace(lower(regexp_replace(coalesce(cp.owner_username, ''), '^@+', '')), '[^a-z0-9._-]+', '', 'g'), '') = t.handle
            or nullif(
              regexp_replace(
                lower(
                  regexp_replace(
                    coalesce(
                      cp.raw_data ->> 'username',
                      cp.raw_data ->> 'ownerUsername',
                      cp.raw_data -> 'owner' ->> 'username',
                      cp.raw_data -> 'user' ->> 'username',
                      ''
                    ),
                    '^@+',
                    ''
                  )
                ),
                '[^a-z0-9._-]+',
                '',
                'g'
              ),
              ''
            ) = t.handle
            or exists (
              select 1
              from jsonb_array_elements_text(coalesce(cp.collaborators, '[]'::jsonb)) collaborator(value)
              where nullif(
                regexp_replace(lower(regexp_replace(coalesce(collaborator.value, ''), '^@+', '')), '[^a-z0-9._-]+', '', 'g'),
                ''
              ) = t.handle
            )
            or exists (
              select 1
              from jsonb_array_elements(
                coalesce(to_jsonb(cp) -> 'collaborators_detail', cp.raw_data -> 'collaborators_detail', '[]'::jsonb)
              ) collaborator(detail)
              where nullif(
                regexp_replace(
                  lower(regexp_replace(coalesce(collaborator.detail ->> 'username', ''), '^@+', '')),
                  '[^a-z0-9._-]+',
                  '',
                  'g'
                ),
                ''
              ) = t.handle
            )
          )
      ),
      post_candidates as materialized (
        select
          p.shortcode,
          p.id as post_id,
          p.posted_at,
          (${instagramPostReportedCommentsSql})::bigint as detail_comments_count,
          lower(coalesce(p.media_mirror_status, '')) as media_mirror_status,
          greatest(coalesce(ch.saved_comment_count, r.active_comment_count, 0), 0)::bigint as saved_comments,
          greatest(coalesce(ch.instagram_reported_comments, (${instagramPostReportedCommentsSql}), 0), 0)::bigint as health_reported_comments,
          greatest(
            coalesce(
              r.missing_comment_count,
              greatest(
                coalesce(ch.instagram_reported_comments, (${instagramPostReportedCommentsSql}), 0)::bigint
                  - coalesce(ch.saved_comment_count, r.active_comment_count, 0)::bigint,
                0
              ),
              0
            ),
            0
          )::bigint as missing_comments
        from social.instagram_posts p
        left join social.instagram_post_comment_rollups r on r.post_id = p.id
        left join social.comment_capture_health ch on ch.post_id = p.id
        cross join target t
        where p.posted_at >= t.start_at
          and p.posted_at < t.end_at
          and nullif(p.shortcode, '') is not null
          and (
            nullif(regexp_replace(lower(regexp_replace(coalesce(p.source_account, ''), '^@+', '')), '[^a-z0-9._-]+', '', 'g'), '') = t.handle
            or nullif(regexp_replace(lower(regexp_replace(coalesce(p.owner_username, ''), '^@+', '')), '[^a-z0-9._-]+', '', 'g'), '') = t.handle
            or nullif(regexp_replace(lower(regexp_replace(coalesce(p.username, ''), '^@+', '')), '[^a-z0-9._-]+', '', 'g'), '') = t.handle
            or exists (
              select 1
              from jsonb_array_elements_text(coalesce(p.collaborators, '[]'::jsonb)) collaborator(value)
              where nullif(
                regexp_replace(lower(regexp_replace(coalesce(collaborator.value, ''), '^@+', '')), '[^a-z0-9._-]+', '', 'g'),
                ''
              ) = t.handle
            )
            or exists (
              select 1
              from jsonb_array_elements(
                coalesce(to_jsonb(p) -> 'collaborators_detail', p.raw_data -> 'collaborators_detail', '[]'::jsonb)
              ) collaborator(detail)
              where nullif(
                regexp_replace(
                  lower(regexp_replace(coalesce(collaborator.detail ->> 'username', ''), '^@+', '')),
                  '[^a-z0-9._-]+',
                  '',
                  'g'
                ),
                ''
              ) = t.handle
            )
          )
      ),
      matched_shortcodes as materialized (
        select shortcode from catalog_candidates
        union
        select shortcode from post_candidates
      ),
      catalog as materialized (
        select
          matched.shortcode,
          max(c.catalog_comments_count)::bigint as catalog_comments_count
        from matched_shortcodes matched
        left join catalog_candidates c on c.shortcode = matched.shortcode
        group by matched.shortcode
      ),
      latest_post as materialized (
        select distinct on (p.shortcode)
          p.shortcode,
          p.post_id,
          coalesce(p.detail_comments_count, 0)::bigint as detail_comments_count,
          lower(coalesce(p.media_mirror_status, '')) as media_mirror_status,
          p.saved_comments,
          p.health_reported_comments,
          p.missing_comments,
          p.posted_at
        from post_candidates p
        order by p.shortcode, p.posted_at desc nulls last, p.post_id desc
      ),
      scored as (
        select
          matched.shortcode,
          lp.post_id,
          greatest(
            coalesce(c.catalog_comments_count, 0),
            coalesce(lp.health_reported_comments, 0),
            coalesce(lp.detail_comments_count, 0)
          )::bigint as reported_comments,
          coalesce(lp.saved_comments, 0)::bigint as saved_comments,
          greatest(
            coalesce(
              lp.missing_comments,
              greatest(
                greatest(
                  coalesce(c.catalog_comments_count, 0),
                  coalesce(lp.health_reported_comments, 0),
                  coalesce(lp.detail_comments_count, 0)
                ) - coalesce(lp.saved_comments, 0),
                0
              ),
              0
            ),
            0
          )::bigint as missing_comments,
          lp.media_mirror_status
        from matched_shortcodes matched
        left join catalog c on c.shortcode = matched.shortcode
        left join latest_post lp on lp.shortcode = matched.shortcode
      )
      select
        count(*)::bigint as total_posts,
        coalesce(sum(reported_comments), 0)::bigint as total_reported_comments,
        coalesce(sum(saved_comments), 0)::bigint as saved_comments,
        coalesce(sum(missing_comments), 0)::bigint as missing_comments,
        coalesce(sum(saved_comments + missing_comments), 0)::bigint as accounted_comments,
        count(*) filter (
          where reported_comments = 0
             or (reported_comments > 0 and missing_comments = 0 and reported_comments <= saved_comments)
        )::bigint as comments_finished,
        count(*) filter (
          where reported_comments > 0 and saved_comments > 0 and missing_comments > 0
        )::bigint as comments_in_progress,
        count(*) filter (where reported_comments > 0 and saved_comments = 0)::bigint as comments_not_started,
        count(*) filter (where post_id is not null)::bigint as details_finished,
        count(*) filter (where post_id is null)::bigint as details_not_started,
        count(*) filter (where media_mirror_status in ('complete', 'completed', 'mirrored', 'up_to_date'))::bigint as media_finished,
        count(*) filter (where media_mirror_status in ('pending', 'partial', 'queued', 'retrying', 'running', 'failed'))::bigint as media_in_progress,
        count(*) filter (
          where post_id is null
             or coalesce(media_mirror_status, '') not in ('complete', 'completed', 'mirrored', 'up_to_date', 'pending', 'partial', 'queued', 'retrying', 'running', 'failed')
        )::bigint as media_not_started
      from scored
      `,
      [normalizedHandle, year],
    );
    const row = result.rows[0] ?? ({} as CompletionRow);
    return {
      platform: normalizedPlatform,
      handle: normalizedHandle,
      year,
      total_posts: readCount(row.total_posts),
      total_reported_comments: readCount(row.total_reported_comments),
      saved_comments: readCount(row.saved_comments),
      missing_comments: readCount(row.missing_comments),
      accounted_comments: readCount(row.accounted_comments),
      lanes: {
        comments: {
          finished: readCount(row.comments_finished),
          in_progress: readCount(row.comments_in_progress),
          not_started: readCount(row.comments_not_started),
        },
        details: {
          finished: readCount(row.details_finished),
          in_progress: 0,
          not_started: readCount(row.details_not_started),
        },
        media: {
          finished: readCount(row.media_finished),
          in_progress: readCount(row.media_in_progress),
          not_started: readCount(row.media_not_started),
        },
      },
    };
    };
    try {
      const payload = await getOrCreateRouteResponsePromise(COMPLETION_SUMMARY_CACHE_NAMESPACE, cacheKey, async () => {
        const nextPayload = await loadPayload();
        setRouteResponseCache(
          COMPLETION_SUMMARY_CACHE_NAMESPACE,
          cacheKey,
          nextPayload,
          COMPLETION_SUMMARY_CACHE_TTL_MS,
          COMPLETION_SUMMARY_STALE_CACHE_TTL_MS,
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
    return socialProxyErrorResponse(error, "[api] Failed to load social completion summary");
  }
}
