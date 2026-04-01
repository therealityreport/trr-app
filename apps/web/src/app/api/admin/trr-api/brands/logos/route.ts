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
  buildAdminReadResponseHeaders,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";
import {
  BRANDS_LOGOS_CACHE_NAMESPACE,
  BRANDS_LOGOS_CACHE_TTL_MS,
} from "@/lib/server/trr-api/brands-route-cache";

export const dynamic = "force-dynamic";

const brandLogoRoutingEnabled = (): boolean =>
  (process.env.BRAND_LOGO_ROUTING_V2 ?? process.env.NEXT_PUBLIC_BRAND_LOGO_ROUTING_V2 ?? "true").toLowerCase() !==
  "false";

export async function GET(request: NextRequest) {
  try {
    const startedAt = performance.now();
    const user = await requireAdmin(request);
    if (!brandLogoRoutingEnabled()) {
      return NextResponse.json({ error: "Brand logo routing is disabled" }, { status: 404 });
    }

    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    const forceRefresh = (searchParams.get("refresh") ?? "").trim().length > 0;
    searchParams.delete("refresh");
    const cacheKey = buildUserScopedRouteCacheKey(user.uid, "logos", searchParams);
    const promiseKey = forceRefresh ? `${cacheKey}:refresh` : cacheKey;

    if (!forceRefresh) {
      const cached = getRouteResponseCache<Record<string, unknown>>(BRANDS_LOGOS_CACHE_NAMESPACE, cacheKey);
      if (cached) {
        return NextResponse.json(cached, {
          headers: buildAdminReadResponseHeaders({ cacheStatus: "hit" }),
        });
      }
    }

    let responseHeaders: Record<string, string> | undefined;
    const payload = await getOrCreateRouteResponsePromise(BRANDS_LOGOS_CACHE_NAMESPACE, promiseKey, async () => {
      const upstream = await fetchAdminBackendJson("/admin/brands/logos", {
        timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
        queryString: searchParams.toString() || undefined,
        routeName: "brands-logos",
      });
      if (upstream.status !== 200) {
        throw new Error(
          typeof upstream.data.error === "string"
            ? upstream.data.error
            : typeof upstream.data.detail === "string"
              ? upstream.data.detail
            : "Failed to fetch brand logos",
        );
      }
      responseHeaders = buildAdminReadResponseHeaders({
        cacheStatus: forceRefresh ? "refresh" : "miss",
        upstreamMs: upstream.durationMs,
        totalMs: performance.now() - startedAt,
      });
      setRouteResponseCache(BRANDS_LOGOS_CACHE_NAMESPACE, cacheKey, upstream.data, BRANDS_LOGOS_CACHE_TTL_MS);
      return upstream.data;
    });

    return NextResponse.json(payload, {
      headers:
        responseHeaders ??
        buildAdminReadResponseHeaders({ cacheStatus: forceRefresh ? "refresh" : "miss" }),
    });
  } catch (error) {
    console.error("[api] Failed to load brand logos", error);
    return buildAdminProxyErrorResponse(error);
  }
}
