import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
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

const readCount = (value: number | string | null | undefined): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const readYear = (request: NextRequest): number => {
  const parsed = Number(request.nextUrl.searchParams.get("year") ?? "2025");
  return Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100 ? parsed : 2025;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { platform, handle } = await context.params;
    const normalizedPlatform = platform.trim().toLowerCase();
    const normalizedHandle = handle.trim().toLowerCase().replace(/^@/, "");
    if (normalizedPlatform !== "instagram" || !normalizedHandle) {
      return NextResponse.json({ error: "unsupported_profile" }, { status: 400 });
    }
    const year = readYear(request);
    const result = await query<CompletionRow>(
      `
      with catalog as (
        select
          cp.source_id as shortcode,
          coalesce(cp.comments_count, 0)::bigint as catalog_comments_count
        from social.instagram_account_catalog_posts cp
        where ltrim(lower(coalesce(cp.source_account, '')), '@') = $1
          and cp.posted_at >= make_timestamptz($2, 1, 1, 0, 0, 0)
          and cp.posted_at < make_timestamptz($2 + 1, 1, 1, 0, 0, 0)
      ),
      latest_post as (
        select distinct on (p.shortcode)
          p.id as post_id,
          p.shortcode,
          coalesce(p.comments_count, 0)::bigint as detail_comments_count,
          coalesce(p.fb_comment_count, 0)::bigint as fb_comment_count,
          lower(coalesce(p.media_mirror_status, '')) as media_mirror_status,
          p.scraped_at,
          p.posted_at
        from social.instagram_posts p
        where p.shortcode in (select shortcode from catalog)
        order by p.shortcode, p.scraped_at desc nulls last, p.posted_at desc nulls last, p.id desc
      ),
      scored as (
        select
          c.shortcode,
          lp.post_id,
          greatest(c.catalog_comments_count, coalesce(lp.detail_comments_count, 0))::bigint as reported_comments,
          coalesce(r.active_comment_count, 0)::bigint as saved_comments,
          (
            coalesce(r.active_comment_count, 0)::bigint
            + coalesce(r.missing_comment_count, 0)::bigint
            + coalesce(lp.fb_comment_count, 0)::bigint
          ) as accounted_comments,
          lp.media_mirror_status
        from catalog c
        left join latest_post lp on lp.shortcode = c.shortcode
        left join social.instagram_post_comment_rollups r on r.post_id = lp.post_id
      )
      select
        count(*)::bigint as total_posts,
        coalesce(sum(reported_comments), 0)::bigint as total_reported_comments,
        coalesce(sum(saved_comments), 0)::bigint as saved_comments,
        coalesce(sum(accounted_comments), 0)::bigint as accounted_comments,
        count(*) filter (where reported_comments <= accounted_comments)::bigint as comments_finished,
        count(*) filter (where reported_comments > 0 and accounted_comments > 0 and reported_comments > accounted_comments)::bigint as comments_in_progress,
        count(*) filter (where reported_comments > 0 and accounted_comments = 0)::bigint as comments_not_started,
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
    return NextResponse.json({
      platform: normalizedPlatform,
      handle: normalizedHandle,
      year,
      total_posts: readCount(row.total_posts),
      total_reported_comments: readCount(row.total_reported_comments),
      saved_comments: readCount(row.saved_comments),
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
    });
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to load social completion summary");
  }
}
