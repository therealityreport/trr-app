import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getRedditPostDetailsByCommunityAndSeason } from "@/lib/server/admin/reddit-sources-repository";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ communityId: string; postId: string }>;
}

const parseCommentsLimit = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { communityId, postId } = await params;
    if (!communityId || !isValidUuid(communityId)) {
      return NextResponse.json({ error: "communityId must be a valid UUID" }, { status: 400 });
    }

    const seasonId = request.nextUrl.searchParams.get("season_id");
    if (!seasonId || !isValidUuid(seasonId)) {
      return NextResponse.json({ error: "season_id must be a valid UUID" }, { status: 400 });
    }

    const normalizedPostId = postId?.trim() ?? "";
    if (!normalizedPostId) {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }

    const commentsLimit = parseCommentsLimit(request.nextUrl.searchParams.get("comments_limit"));
    const post = await getRedditPostDetailsByCommunityAndSeason({
      communityId,
      seasonId,
      redditPostId: normalizedPostId,
      commentsLimit,
    });
    if (!post) {
      return NextResponse.json({ error: "Post not found for community and season" }, { status: 404 });
    }
    return NextResponse.json({ post });
  } catch (error) {
    console.error("[api] Failed to fetch reddit post details", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
