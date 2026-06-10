import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  getStaleRouteResponseCache,
  parseCacheTtlMs,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ platform: string; handle: string }>;
};

const SOCIAL_PROFILE_CATALOG_FRESHNESS_CACHE_NAMESPACE = "admin-social-profile-catalog-freshness";
const SOCIAL_PROFILE_CATALOG_FRESHNESS_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SOCIAL_PROFILE_CATALOG_FRESHNESS_CACHE_TTL_MS,
  60_000,
);
const SOCIAL_PROFILE_CATALOG_FRESHNESS_STALE_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SOCIAL_PROFILE_CATALOG_FRESHNESS_STALE_CACHE_TTL_MS,
  5 * 60_000,
);

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAdmin(request);
    const { platform, handle } = await context.params;
    const forwardedSearchParams = new URLSearchParams(request.nextUrl.searchParams.toString());
    const userId = user?.uid;
    if (!userId) {
      const data = await fetchSocialBackendJson(
        `/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/freshness`,
        {
          method: "POST",
          queryString: forwardedSearchParams.toString(),
          fallbackError: "Failed to fetch social account catalog freshness",
          retries: 0,
          timeoutMs: 30_000,
        },
      );
      return NextResponse.json(data);
    }
    const cacheKey = buildUserScopedRouteCacheKey(
      userId,
      `${platform}:${handle}:catalog-freshness`,
      forwardedSearchParams,
    );
    const cachedPayload = getRouteResponseCache<Record<string, unknown>>(
      SOCIAL_PROFILE_CATALOG_FRESHNESS_CACHE_NAMESPACE,
      cacheKey,
    );
    if (cachedPayload) {
      return NextResponse.json(cachedPayload, { headers: { "x-trr-cache": "hit" } });
    }
    const stalePayload = getStaleRouteResponseCache<Record<string, unknown>>(
      SOCIAL_PROFILE_CATALOG_FRESHNESS_CACHE_NAMESPACE,
      cacheKey,
    );

    try {
      const data = await getOrCreateRouteResponsePromise(
        SOCIAL_PROFILE_CATALOG_FRESHNESS_CACHE_NAMESPACE,
        cacheKey,
        async () => {
          const payload = await fetchSocialBackendJson(
            `/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/freshness`,
            {
              method: "POST",
              queryString: forwardedSearchParams.toString(),
              fallbackError: "Failed to fetch social account catalog freshness",
              retries: 0,
              timeoutMs: 30_000,
            },
          );
          setRouteResponseCache(
            SOCIAL_PROFILE_CATALOG_FRESHNESS_CACHE_NAMESPACE,
            cacheKey,
            payload,
            SOCIAL_PROFILE_CATALOG_FRESHNESS_CACHE_TTL_MS,
            SOCIAL_PROFILE_CATALOG_FRESHNESS_STALE_CACHE_TTL_MS,
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
    return socialProxyErrorResponse(error, "[api] Failed to fetch social account catalog freshness");
  }
}
