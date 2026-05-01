import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, toVerifiedAdminContext } from "@/lib/server/auth";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  getStaleRouteResponseCache,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import {
  fetchSocialBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ platform: string; handle: string }>;
};

const LIVE_PROFILE_TOTAL_CACHE_NAMESPACE = "admin-social-profile-live-total";
const LIVE_PROFILE_TOTAL_CACHE_TTL_MS = 5 * 60_000;
const LIVE_PROFILE_TOTAL_STALE_TTL_MS = 15 * 60_000;

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAdmin(request);
    const adminContext = toVerifiedAdminContext(user);
    const { platform, handle } = await context.params;
    const cacheKey = buildUserScopedRouteCacheKey(
      user.uid,
      `${platform}:${handle}:live-profile-total`,
    );
    const cachedPayload = getRouteResponseCache<Record<string, unknown>>(
      LIVE_PROFILE_TOTAL_CACHE_NAMESPACE,
      cacheKey,
    );
    if (cachedPayload) {
      return NextResponse.json(cachedPayload, { headers: { "x-trr-cache": "hit" } });
    }
    const stalePayload = getStaleRouteResponseCache<Record<string, unknown>>(
      LIVE_PROFILE_TOTAL_CACHE_NAMESPACE,
      cacheKey,
    );
    try {
      const data = await getOrCreateRouteResponsePromise(
        LIVE_PROFILE_TOTAL_CACHE_NAMESPACE,
        cacheKey,
        async () => {
          const payload = await fetchSocialBackendJson(
            `/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/live-profile-total`,
            {
              adminContext,
              fallbackError: "Failed to fetch social account live profile total",
              retries: 0,
              timeoutMs: 30_000,
            },
          );
          setRouteResponseCache(
            LIVE_PROFILE_TOTAL_CACHE_NAMESPACE,
            cacheKey,
            payload,
            LIVE_PROFILE_TOTAL_CACHE_TTL_MS,
            LIVE_PROFILE_TOTAL_STALE_TTL_MS,
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
    return socialProxyErrorResponse(error, "[api] Failed to fetch social account live profile total");
  }
}
