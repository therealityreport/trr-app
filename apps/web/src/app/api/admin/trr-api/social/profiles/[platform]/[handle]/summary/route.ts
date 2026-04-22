import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, toVerifiedAdminContext } from "@/lib/server/auth";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
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
        );
        return payload;
      },
    );
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch social account profile summary");
  }
}
