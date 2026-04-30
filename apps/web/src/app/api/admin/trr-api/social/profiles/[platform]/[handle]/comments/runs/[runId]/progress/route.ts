import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  getStaleRouteResponseCache,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import {
  fetchSocialBackendJson,
  SOCIAL_PROXY_PROGRESS_TIMEOUT_MS,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ platform: string; handle: string; runId: string }>;
};

const COMMENTS_PROGRESS_CACHE_NAMESPACE = "admin-social-profile-comments-progress";
const COMMENTS_PROGRESS_CACHE_TTL_MS = 2_000;
const COMMENTS_PROGRESS_STALE_TTL_MS = 15_000;

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAdmin(request);
    const { platform, handle, runId } = await context.params;
    const queryString = request.nextUrl.searchParams.toString();
    const cacheKey = buildUserScopedRouteCacheKey(
      user.uid,
      `${platform}:${handle}:comments-progress:${runId}`,
      request.nextUrl.searchParams,
    );
    const cachedPayload = getRouteResponseCache<Record<string, unknown>>(
      COMMENTS_PROGRESS_CACHE_NAMESPACE,
      cacheKey,
    );
    if (cachedPayload) {
      return NextResponse.json(cachedPayload, { headers: { "x-trr-cache": "hit" } });
    }
    const stalePayload = getStaleRouteResponseCache<Record<string, unknown>>(
      COMMENTS_PROGRESS_CACHE_NAMESPACE,
      cacheKey,
    );
    try {
      const data = await getOrCreateRouteResponsePromise(
        COMMENTS_PROGRESS_CACHE_NAMESPACE,
        cacheKey,
        async () => {
          const payload = await fetchSocialBackendJson(
            `/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/comments/runs/${encodeURIComponent(runId)}/progress`,
            {
              queryString,
              fallbackError: "Failed to fetch social account comments scrape progress",
              retries: 0,
              timeoutMs: SOCIAL_PROXY_PROGRESS_TIMEOUT_MS,
            },
          );
          setRouteResponseCache(
            COMMENTS_PROGRESS_CACHE_NAMESPACE,
            cacheKey,
            payload,
            COMMENTS_PROGRESS_CACHE_TTL_MS,
            COMMENTS_PROGRESS_STALE_TTL_MS,
          );
          return payload;
        },
      );
      return NextResponse.json(data, { headers: { "x-trr-cache": "miss" } });
    } catch (error) {
      if (stalePayload) {
        return NextResponse.json(stalePayload, {
          headers: { "x-trr-cache": "stale", "x-trr-cacheable": "0" },
        });
      }
      throw error;
    }
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch social account comments scrape progress");
  }
}
