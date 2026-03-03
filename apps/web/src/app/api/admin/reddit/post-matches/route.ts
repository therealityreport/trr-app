import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/reddit/post-matches
 *
 * Update `admin_approved` on a reddit_period_post_matches row.
 * Body: { community_id, season_id, period_key, reddit_post_id, admin_approved: boolean | null }
 */
export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const communityId = typeof body.community_id === "string" ? body.community_id.trim() : "";
    const seasonId = typeof body.season_id === "string" ? body.season_id.trim() : "";
    const periodKey = typeof body.period_key === "string" ? body.period_key.trim() : "";
    const redditPostId = typeof body.reddit_post_id === "string" ? body.reddit_post_id.trim() : "";
    const adminApproved =
      body.admin_approved === true ? true : body.admin_approved === false ? false : null;

    if (!communityId || !redditPostId) {
      return NextResponse.json(
        { error: "community_id and reddit_post_id are required" },
        { status: 400 },
      );
    }

    const result = await fetchSocialBackendJson("/reddit/post-matches/approve", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        community_id: communityId,
        season_id: seasonId || undefined,
        period_key: periodKey || undefined,
        reddit_post_id: redditPostId,
        admin_approved: adminApproved,
      }),
      fallbackError: "Failed to update post match approval",
      timeoutMs: 10_000,
      retries: 1,
    });

    return NextResponse.json(result);
  } catch (error) {
    return socialProxyErrorResponse(
      error,
      "[api] Failed to update post match approval via TRR-Backend",
    );
  }
}
