import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, toVerifiedAdminContext } from "@/lib/server/auth";
import { resolveRedditPostDetailBySlug } from "@/lib/server/admin/reddit-sources-repository";
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
        const resolved = await resolveRedditPostDetailBySlug({
          communityId,
          seasonId,
          windowKey: containerKey,
          titleSlug,
          authorSlug,
          redditPostId,
          adminContext,
        });
        return resolved
          ? {
              reddit_post_id: resolved.reddit_post_id,
              detail_slug: resolved.detail_slug,
              collision: resolved.collision,
              post: {
                title: resolved.title,
                author: resolved.author,
                posted_at: resolved.posted_at,
                url: resolved.url,
                permalink: resolved.permalink,
              },
            }
          : {};
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
