import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, toVerifiedAdminContext } from "@/lib/server/auth";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  getStaleRouteResponseCache,
  parseCacheTtlMs,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import {
  fetchSocialBackendJson,
  SOCIAL_PROXY_LONG_TIMEOUT_MS,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";
const SOCIAL_PROFILE_SUMMARY_CACHE_NAMESPACE = "admin-social-profile-summary";
const SOCIAL_PROFILE_SUMMARY_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SOCIAL_PROFILE_SUMMARY_CACHE_TTL_MS,
  5 * 60_000,
);
const SOCIAL_PROFILE_SUMMARY_STALE_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SOCIAL_PROFILE_SUMMARY_STALE_CACHE_TTL_MS,
  15 * 60_000,
);

type RouteContext = {
  params: Promise<{ platform: string; handle: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAdmin(request);
    const adminContext = toVerifiedAdminContext(user);
    const { platform, handle } = await context.params;
    const cacheKey = buildUserScopedRouteCacheKey(
      user.uid,
      `${platform}:${handle}:summary`,
      request.nextUrl.searchParams,
    );
    const cachedPayload = getRouteResponseCache<Record<string, unknown>>(
      SOCIAL_PROFILE_SUMMARY_CACHE_NAMESPACE,
      cacheKey,
    );
    if (cachedPayload) {
      return NextResponse.json(cachedPayload, { headers: { "x-trr-cache": "hit" } });
    }
    const stalePayload = getStaleRouteResponseCache<Record<string, unknown>>(
      SOCIAL_PROFILE_SUMMARY_CACHE_NAMESPACE,
      cacheKey,
    );
    try {
      const data = await getOrCreateRouteResponsePromise(
        SOCIAL_PROFILE_SUMMARY_CACHE_NAMESPACE,
        cacheKey,
        async () => {
          const payload = await fetchSocialBackendJson(
            `/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/summary`,
            {
              adminContext,
              fallbackError: "Failed to fetch social account profile summary",
              queryString: request.nextUrl.searchParams.toString(),
              retries: 0,
              timeoutMs: SOCIAL_PROXY_LONG_TIMEOUT_MS,
            },
          );
          setRouteResponseCache(
            SOCIAL_PROFILE_SUMMARY_CACHE_NAMESPACE,
            cacheKey,
            payload,
            SOCIAL_PROFILE_SUMMARY_CACHE_TTL_MS,
            SOCIAL_PROFILE_SUMMARY_STALE_CACHE_TTL_MS,
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
    return socialProxyErrorResponse(error, "[api] Failed to fetch social account profile summary");
  }
}
