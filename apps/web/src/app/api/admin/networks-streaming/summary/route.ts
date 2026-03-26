import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import {
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
  buildAdminProxyErrorResponse,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";
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
        const upstream = await fetchAdminBackendJson("/admin/shows/networks-streaming/summary", {
          timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
          routeName: "networks-streaming-summary",
        });
        if (upstream.status !== 200) {
          throw new Error(
            typeof upstream.data.error === "string"
              ? upstream.data.error
              : typeof upstream.data.detail === "string"
                ? upstream.data.detail
                : "Failed to load networks/streaming summary",
          );
        }
        setRouteResponseCache(
          NETWORKS_STREAMING_SUMMARY_CACHE_NAMESPACE,
          cacheKey,
          upstream.data,
          NETWORKS_STREAMING_SUMMARY_CACHE_TTL_MS,
        );
        return upstream.data;
      },
    );

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api] Failed to load networks/streaming summary", error);
    return buildAdminProxyErrorResponse(error);
  }
}
