import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, toVerifiedAdminContext } from "@/lib/server/auth";
import { getStoredPostCountsByCommunityAndSeason } from "@/lib/server/admin/reddit-sources-repository";
import {
  buildUserScopedRouteCacheKey,
  getCachedStableRead,
  REDDIT_STABLE_DETAIL_CACHE_NAMESPACE,
  REDDIT_STABLE_DETAIL_CACHE_TTL_MS,
} from "@/lib/server/trr-api/reddit-stable-route-cache";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ communityId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const adminContext = toVerifiedAdminContext(user);
    const { communityId } = await params;
    if (!communityId || !isValidUuid(communityId)) {
      return NextResponse.json({ error: "communityId must be a valid UUID" }, { status: 400 });
    }
    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    const forceRefresh = (searchParams.get("refresh") ?? "").trim().length > 0;
    searchParams.delete("refresh");

    const seasonId = searchParams.get("season_id");
    if (!seasonId || !isValidUuid(seasonId)) {
      return NextResponse.json({ error: "season_id must be a valid UUID" }, { status: 400 });
    }

    const cacheKey = buildUserScopedRouteCacheKey(
      user.uid,
      `reddit-stored-post-counts:${communityId}`,
      searchParams,
    );
    const { payload, cacheHit } = await getCachedStableRead({
      namespace: REDDIT_STABLE_DETAIL_CACHE_NAMESPACE,
      cacheKey,
      promiseKey: forceRefresh ? `${cacheKey}:refresh` : cacheKey,
      ttlMs: REDDIT_STABLE_DETAIL_CACHE_TTL_MS,
      forceRefresh,
      loader: async () => {
        const resolved = await getStoredPostCountsByCommunityAndSeason(
          communityId,
          seasonId,
          { adminContext },
        );
        const trackedFlairCounts = Array.isArray(resolved.tracked_flair_counts)
          ? resolved.tracked_flair_counts
          : [];
        return {
          counts: resolved.counts ?? {},
          total_posts: resolved.total_posts ?? 0,
          tracked_total_posts: resolved.tracked_total_posts ?? 0,
          tracked_flair_counts: trackedFlairCounts,
          pending_tracked_flair_counts: Array.isArray(resolved.pending_tracked_flair_counts)
            ? resolved.pending_tracked_flair_counts
            : [],
          flair_counts:
            Array.isArray(resolved.flair_counts) && resolved.flair_counts.length > 0
              ? resolved.flair_counts
              : trackedFlairCounts.map((row) => ({
                  flair:
                    typeof row.flair_label === "string" ? row.flair_label : String(row.flair_label ?? ""),
                  post_count:
                    typeof row.post_count === "number" && Number.isFinite(row.post_count)
                      ? row.post_count
                      : 0,
                })),
        };
      },
    });

    return NextResponse.json(payload, cacheHit ? { headers: { "x-trr-cache": "hit" } } : undefined);
  } catch (error) {
    console.error("[api] Failed to fetch stored post counts", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
