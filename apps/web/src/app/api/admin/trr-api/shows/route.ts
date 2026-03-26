import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
  buildAdminProxyErrorResponse,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import {
  TRR_SHOWS_CACHE_NAMESPACE,
  TRR_SHOWS_CACHE_TTL_MS,
} from "@/lib/server/trr-api/trr-show-read-route-cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/trr-api/shows
 *
 * Search shows in TRR Core API.
 *
 * Query params:
 * - q: search query (required)
 * - limit: max results (default 20, max 100)
 * - offset: pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    if (!query.trim()) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    const cacheKey = buildUserScopedRouteCacheKey(user.uid, "shows", searchParams);
    const cached = getRouteResponseCache<Record<string, unknown>>(TRR_SHOWS_CACHE_NAMESPACE, cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "x-trr-cache": "hit" } });
    }

    const payload = await getOrCreateRouteResponsePromise(
      TRR_SHOWS_CACHE_NAMESPACE,
      cacheKey,
      async () => {
        const upstream = await fetchAdminBackendJson(
          `/admin/trr-api/shows?${new URLSearchParams({
            q: query,
            limit: String(limit),
            offset: String(offset),
          }).toString()}`,
          {
            timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
            routeName: "admin-shows",
          },
        );
        if (upstream.status !== 200) {
          throw new Error(
            typeof upstream.data.error === "string"
              ? upstream.data.error
              : typeof upstream.data.detail === "string"
                ? upstream.data.detail
                : "Failed to search TRR shows",
          );
        }
        setRouteResponseCache(TRR_SHOWS_CACHE_NAMESPACE, cacheKey, upstream.data, TRR_SHOWS_CACHE_TTL_MS);
        return upstream.data;
      },
    );

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api] Failed to search TRR shows", error);
    return buildAdminProxyErrorResponse(error);
  }
}
