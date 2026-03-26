import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  buildUserScopedRouteCacheKey,
  getCachedStableRead,
  REDDIT_STABLE_LIST_CACHE_NAMESPACE,
  REDDIT_STABLE_LIST_CACHE_TTL_MS,
} from "@/lib/server/trr-api/reddit-stable-route-cache";
import {
  fetchSocialBackendJson,
  socialProxyErrorResponse,
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
} from "@/lib/server/trr-api/social-admin-proxy";
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

    const scope = searchParams.get("scope") === "all" ? "all" : "season";
    const seasonId = searchParams.get("season_id");
    const containerKey = searchParams.get("container_key");
    const flairKey = searchParams.get("flair_key");
    const page = searchParams.get("page");
    const perPage = searchParams.get("per_page");

    if (scope === "season" && (!seasonId || !isValidUuid(seasonId))) {
      return NextResponse.json({ error: "season_id must be a valid UUID" }, { status: 400 });
    }

    const cacheKey = buildUserScopedRouteCacheKey(user.uid, `reddit-analytics-posts:${communityId}`, searchParams);
    const { payload, cacheHit } = await getCachedStableRead({
      namespace: REDDIT_STABLE_LIST_CACHE_NAMESPACE,
      cacheKey,
      promiseKey: forceRefresh ? `${cacheKey}:refresh` : cacheKey,
      ttlMs: REDDIT_STABLE_LIST_CACHE_TTL_MS,
      forceRefresh,
      loader: async () => {
        const query = new URLSearchParams();
        query.set("scope", scope);
        if (seasonId) query.set("season_id", seasonId);
        if (containerKey) query.set("container_key", containerKey);
        if (flairKey) query.set("flair_key", flairKey);
        if (page) query.set("page", page);
        if (perPage) query.set("per_page", perPage);

        return fetchSocialBackendJson(`/reddit/analytics/community/${communityId}/posts`, {
          queryString: query.toString(),
          fallbackError: "Failed to fetch reddit analytics posts",
          timeoutMs: SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
          retries: 1,
        });
      },
    });
    return NextResponse.json(payload, cacheHit ? { headers: { "x-trr-cache": "hit" } } : undefined);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch reddit analytics posts via TRR-Backend");
  }
}
