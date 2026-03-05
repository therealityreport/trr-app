import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  getStoredPendingTrackedFlairCountsByCommunityAndSeason,
  getStoredPostCountsByCommunityAndSeason,
  getStoredPostTotalByCommunityAndSeason,
  getStoredTrackedPostFlairCountsByCommunityAndSeason,
  getStoredTrackedPostTotalByCommunityAndSeason,
} from "@/lib/server/admin/reddit-sources-repository";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ communityId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { communityId } = await params;
    if (!communityId || !isValidUuid(communityId)) {
      return NextResponse.json({ error: "communityId must be a valid UUID" }, { status: 400 });
    }
    const seasonId = request.nextUrl.searchParams.get("season_id");
    if (!seasonId || !isValidUuid(seasonId)) {
      return NextResponse.json({ error: "season_id must be a valid UUID" }, { status: 400 });
    }

    const [counts, totalPosts, trackedTotalPosts, trackedFlairCounts, pendingTrackedFlairCounts] = await Promise.all([
      getStoredPostCountsByCommunityAndSeason(communityId, seasonId),
      getStoredPostTotalByCommunityAndSeason(communityId, seasonId),
      getStoredTrackedPostTotalByCommunityAndSeason(communityId, seasonId),
      getStoredTrackedPostFlairCountsByCommunityAndSeason(communityId, seasonId),
      getStoredPendingTrackedFlairCountsByCommunityAndSeason(communityId, seasonId),
    ]);
    return NextResponse.json({
      counts,
      total_posts: totalPosts,
      tracked_total_posts: trackedTotalPosts,
      tracked_flair_counts: trackedFlairCounts,
      pending_tracked_flair_counts: pendingTrackedFlairCounts,
      // Legacy alias for clients still reading the older shape.
      flair_counts: trackedFlairCounts.map((row) => ({
        flair: row.flair_label,
        post_count: row.post_count,
      })),
    });
  } catch (error) {
    console.error("[api] Failed to fetch stored post counts", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
