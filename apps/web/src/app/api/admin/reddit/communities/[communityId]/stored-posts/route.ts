import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getStoredWindowPostsByCommunityAndSeason } from "@/lib/server/admin/reddit-sources-repository";
import {
  buildUserScopedRouteCacheKey,
  getCachedStableRead,
  REDDIT_STABLE_DETAIL_CACHE_NAMESPACE,
  REDDIT_STABLE_DETAIL_CACHE_TTL_MS,
} from "@/lib/server/trr-api/reddit-stable-route-cache";
import { loadStableRedditRead } from "@/lib/server/trr-api/reddit-stable-read";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ communityId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
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

    const containerKey = searchParams.get("container_key");
    if (!containerKey) {
      return NextResponse.json({ error: "container_key is required" }, { status: 400 });
    }

    const pageParam = Number.parseInt(searchParams.get("page") ?? "1", 10);
    const perPageParam = Number.parseInt(searchParams.get("per_page") ?? "200", 10);

    const cacheKey = buildUserScopedRouteCacheKey(
      user.uid,
      `reddit-stored-posts:${communityId}`,
      searchParams,
    );
    const { payload, cacheHit } = await getCachedStableRead({
      namespace: REDDIT_STABLE_DETAIL_CACHE_NAMESPACE,
      cacheKey,
      promiseKey: forceRefresh ? `${cacheKey}:refresh` : cacheKey,
      ttlMs: REDDIT_STABLE_DETAIL_CACHE_TTL_MS,
      forceRefresh,
      loader: async () => {
        const query = new URLSearchParams();
        query.set("season_id", seasonId);
        query.set("container_key", containerKey);
        query.set("page", Number.isFinite(pageParam) ? String(pageParam) : "1");
        query.set("per_page", Number.isFinite(perPageParam) ? String(perPageParam) : "200");

        const resolved = await loadStableRedditRead<Record<string, unknown>>({
          backendPath: `/admin/reddit/communities/${communityId}/stored-posts`,
          routeName: "reddit-stored-posts",
          queryString: query.toString(),
          fallback: async () =>
            getStoredWindowPostsByCommunityAndSeason(
              communityId,
              seasonId,
              containerKey,
              Number.isFinite(pageParam) ? pageParam : 1,
              Number.isFinite(perPageParam) ? perPageParam : 200,
            ),
        });
        return resolved.payload;
      },
    });

    return NextResponse.json(payload, cacheHit ? { headers: { "x-trr-cache": "hit" } } : undefined);
  } catch (error) {
    console.error("[api] Failed to fetch stored reddit window posts", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message.includes("container_key")
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
