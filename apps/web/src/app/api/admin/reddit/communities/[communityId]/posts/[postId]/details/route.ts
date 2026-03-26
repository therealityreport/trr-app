import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
  buildAdminProxyErrorResponse,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";
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

    const query = new URLSearchParams({ season_id: seasonId });
    const commentsLimit = parseCommentsLimit(request.nextUrl.searchParams.get("comments_limit"));
    if (commentsLimit) query.set("comments_limit", String(commentsLimit));

    const upstream = await fetchAdminBackendJson(
      `/admin/reddit/communities/${communityId}/posts/${encodeURIComponent(normalizedPostId)}/details?${query.toString()}`,
      {
        timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
        routeName: "reddit-post-detail",
      },
    );

    if (upstream.status === 404) {
      return NextResponse.json(
        {
          error:
            typeof upstream.data.error === "string"
              ? upstream.data.error
              : typeof upstream.data.detail === "string"
                ? upstream.data.detail
                : "Post not found for community and season",
        },
        { status: 404 },
      );
    }
    if (upstream.status !== 200) {
      throw new Error(
        typeof upstream.data.error === "string"
          ? upstream.data.error
          : typeof upstream.data.detail === "string"
            ? upstream.data.detail
            : "Failed to fetch reddit post details",
      );
    }

    return NextResponse.json(upstream.data);
  } catch (error) {
    console.error("[api] Failed to fetch reddit post details", error);
    return buildAdminProxyErrorResponse(error);
  }
}
