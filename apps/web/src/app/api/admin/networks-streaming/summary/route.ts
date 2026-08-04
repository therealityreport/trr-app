import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, toVerifiedAdminContext } from "@/lib/server/auth";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import {
  buildAdminProxyErrorResponse,
} from "@/lib/server/trr-api/admin-read-proxy";
import { getNetworksStreamingSummary } from "@/lib/server/trr-api/admin-networks-streaming-reads";
import {
  NETWORKS_STREAMING_SUMMARY_CACHE_NAMESPACE,
  NETWORKS_STREAMING_SUMMARY_CACHE_TTL_MS,
} from "@/lib/server/trr-api/networks-streaming-route-cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/networks-streaming/summary
 *
 * Returns network + streaming coverage summary sourced from core/admin schema tables.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const adminContext = toVerifiedAdminContext(user);
    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    const forceRefresh = (searchParams.get("refresh") ?? "").trim().length > 0;
    searchParams.delete("refresh");

    const cacheKey = buildUserScopedRouteCacheKey(
      user.uid,
      "summary",
      searchParams,
    );
    const promiseKey = forceRefresh ? `${cacheKey}:refresh` : cacheKey;
    if (!forceRefresh) {
      const cached = getRouteResponseCache<Record<string, unknown>>(
        NETWORKS_STREAMING_SUMMARY_CACHE_NAMESPACE,
        cacheKey,
      );
      if (cached) {
        return NextResponse.json(cached, { headers: { "x-trr-cache": "hit" } });
      }
    }

    const payload = await getOrCreateRouteResponsePromise(
      NETWORKS_STREAMING_SUMMARY_CACHE_NAMESPACE,
      promiseKey,
      async () => {
        const summary = await getNetworksStreamingSummary({ adminContext });
        setRouteResponseCache(
          NETWORKS_STREAMING_SUMMARY_CACHE_NAMESPACE,
          cacheKey,
          summary,
          NETWORKS_STREAMING_SUMMARY_CACHE_TTL_MS,
        );
        return summary;
      },
    );

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api] Failed to load networks/streaming summary", error);
    return buildAdminProxyErrorResponse(error);
  }
}
