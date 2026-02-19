import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import type { AuthContext } from "@/lib/server/postgres";
import {
  getRedditCommunityById,
  updateRedditCommunityPostFlares,
} from "@/lib/server/admin/reddit-sources-repository";
import { fetchSubredditPostFlares } from "@/lib/server/admin/reddit-flairs-service";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ communityId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const authContext: AuthContext = { firebaseUid: user.uid, isAdmin: true };

    const { communityId } = await params;
    if (!communityId) {
      return NextResponse.json({ error: "communityId is required" }, { status: 400 });
    }
    if (!isValidUuid(communityId)) {
      return NextResponse.json({ error: "communityId must be a valid UUID" }, { status: 400 });
    }

    const community = await getRedditCommunityById(communityId);
    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    const flaresResult = await fetchSubredditPostFlares(community.subreddit);
    const nowIso = new Date().toISOString();
    const updatedCommunity = await updateRedditCommunityPostFlares(
      authContext,
      communityId,
      flaresResult.flares,
      nowIso,
    );

    if (!updatedCommunity) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        community: updatedCommunity,
        flares: flaresResult.flares,
        source: flaresResult.source,
        warning: flaresResult.warning,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[api] Failed to refresh reddit post flares", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message === "Invalid subreddit"
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
