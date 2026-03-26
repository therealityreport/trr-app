import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { resolveRedditPostDetailBySlug } from "@/lib/server/admin/reddit-sources-repository";
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

const resolveContainerKeyFromWindowToken = (value: string | null): string | null => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "w0" || normalized === "period-preseason") return "period-preseason";
  if (normalized === "w-postseason" || normalized === "period-postseason") return "period-postseason";
  const episodeCanonical = normalized.match(/^e(\d+)$/);
  if (episodeCanonical) return `episode-${episodeCanonical[1]}`;
  const episodeLegacy = normalized.match(/^w(\d+)$/);
  if (episodeLegacy) return `episode-${episodeLegacy[1]}`;
  const episodeRaw = normalized.match(/^episode-(\d+)$/);
  if (episodeRaw) return `episode-${episodeRaw[1]}`;
  return null;
};

const normalizeDetailPart = (value: string | null): string | null => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return null;
  if (!/^[a-z0-9-]+$/.test(normalized)) return null;
  return normalized;
};

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

    const containerKey = resolveContainerKeyFromWindowToken(searchParams.get("window_key"));
    if (!containerKey) {
      return NextResponse.json({ error: "window_key is required" }, { status: 400 });
    }

    const titleSlug = normalizeDetailPart(searchParams.get("slug"));
    const authorSlug = normalizeDetailPart(searchParams.get("author"));
    const redditPostId = String(searchParams.get("post_id") ?? "").trim() || null;

    if (!redditPostId && (!titleSlug || !authorSlug)) {
      return NextResponse.json({ error: "slug and author are required when post_id is omitted" }, { status: 400 });
    }

    const cacheKey = buildUserScopedRouteCacheKey(user.uid, `reddit-post-resolve:${communityId}`, searchParams);
    const { payload, cacheHit } = await getCachedStableRead({
      namespace: REDDIT_STABLE_DETAIL_CACHE_NAMESPACE,
      cacheKey,
      promiseKey: forceRefresh ? `${cacheKey}:refresh` : cacheKey,
      ttlMs: REDDIT_STABLE_DETAIL_CACHE_TTL_MS,
      forceRefresh,
      loader: async () => {
        const query = new URLSearchParams();
        query.set("season_id", seasonId);
        query.set("window_key", searchParams.get("window_key") ?? "");
        if (titleSlug) query.set("slug", titleSlug);
        if (authorSlug) query.set("author", authorSlug);
        if (redditPostId) query.set("post_id", redditPostId);

        const resolved = await loadStableRedditRead<Record<string, unknown>>({
          backendPath: `/admin/reddit/communities/${communityId}/posts/resolve`,
          routeName: "reddit-post-resolve",
          queryString: query.toString(),
          allowFallbackStatusCodes: [501],
          fallback: async () => {
            const fallback = await resolveRedditPostDetailBySlug({
              communityId,
              seasonId,
              containerKey,
              titleSlug,
              authorSlug,
              redditPostId,
            });
            return fallback
              ? {
                  reddit_post_id: fallback.reddit_post_id,
                  detail_slug: fallback.detail_slug,
                  collision: fallback.collision,
                  post: {
                    title: fallback.title,
                    author: fallback.author,
                    posted_at: fallback.posted_at,
                    url: fallback.url,
                    permalink: fallback.permalink,
                  },
                }
              : {};
          },
        });
        return resolved.payload;
      },
    });

    if (!payload || !payload.reddit_post_id) {
      return NextResponse.json({ error: "Post not found for community, season, and window" }, { status: 404 });
    }

    return NextResponse.json(payload, cacheHit ? { headers: { "x-trr-cache": "hit" } } : undefined);
  } catch (error) {
    console.error("[api] Failed to resolve reddit post detail slug", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
