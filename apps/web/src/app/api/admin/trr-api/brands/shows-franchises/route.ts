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
  BRANDS_SHOWS_FRANCHISES_CACHE_NAMESPACE,
  BRANDS_SHOWS_FRANCHISES_CACHE_TTL_MS,
} from "@/lib/server/trr-api/brands-route-cache";

export const dynamic = "force-dynamic";

const showsFranchisesEnabled = (): boolean =>
  (process.env.BRANDS_SHOWS_FRANCHISES_ENABLED ??
    process.env.NEXT_PUBLIC_BRANDS_SHOWS_FRANCHISES_ENABLED ??
    "true") !== "false";

export async function GET(request: NextRequest) {
  try {
    const startedAt = performance.now();
    const user = await requireAdmin(request);
    if (!showsFranchisesEnabled()) {
      return NextResponse.json({ error: "Shows & franchises is disabled" }, { status: 404 });
    }

    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    const forceRefresh = (searchParams.get("refresh") ?? "").trim().length > 0;
    searchParams.delete("refresh");
    const cacheKey = buildUserScopedRouteCacheKey(user.uid, "shows-franchises", searchParams);
    const promiseKey = forceRefresh ? `${cacheKey}:refresh` : cacheKey;

    if (!forceRefresh) {
      const cached = getRouteResponseCache<Record<string, unknown>>(
        BRANDS_SHOWS_FRANCHISES_CACHE_NAMESPACE,
        cacheKey,
      );
      if (cached) {
        return NextResponse.json(cached, {
          headers: buildAdminReadResponseHeaders({ cacheStatus: "hit" }),
        });
      }
    }

    let responseHeaders: Record<string, string> | undefined;
    const payload = await getOrCreateRouteResponsePromise(
      BRANDS_SHOWS_FRANCHISES_CACHE_NAMESPACE,
      promiseKey,
      async () => {
        const upstream = await fetchAdminBackendJson("/admin/brands/shows-franchises", {
          timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
          queryString: searchParams.toString() || undefined,
          routeName: "brands-shows-franchises",
        });
        if (upstream.status !== 200) {
          throw new Error(
            typeof upstream.data.error === "string"
              ? upstream.data.error
              : typeof upstream.data.detail === "string"
                ? upstream.data.detail
                : "Failed to fetch shows & franchises",
          );
        }
        responseHeaders = buildAdminReadResponseHeaders({
          cacheStatus: forceRefresh ? "refresh" : "miss",
          upstreamMs: upstream.durationMs,
          totalMs: performance.now() - startedAt,
        });
        setRouteResponseCache(
          BRANDS_SHOWS_FRANCHISES_CACHE_NAMESPACE,
          cacheKey,
          upstream.data,
          BRANDS_SHOWS_FRANCHISES_CACHE_TTL_MS,
        );
        return upstream.data;
      },
    );

    return NextResponse.json(payload, {
      headers:
        responseHeaders ??
        buildAdminReadResponseHeaders({ cacheStatus: forceRefresh ? "refresh" : "miss" }),
    });
  } catch (error) {
    console.error("[api] Failed to load brands shows/franchises", error);
    return buildAdminProxyErrorResponse(error);
  }
}
