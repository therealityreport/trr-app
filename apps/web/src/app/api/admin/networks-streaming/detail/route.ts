import { NextRequest, NextResponse } from "next/server";
import { parseEntityType } from "@/lib/admin/networks-streaming-entity";
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
  NETWORKS_STREAMING_DETAIL_CACHE_NAMESPACE,
  NETWORKS_STREAMING_DETAIL_CACHE_TTL_MS,
} from "@/lib/server/trr-api/networks-streaming-route-cache";

export const dynamic = "force-dynamic";

type CachedDetailPayload = Record<string, unknown> & { __trr_status?: number };

export async function GET(request: NextRequest) {
  try {
    const startedAt = performance.now();
    const user = await requireAdmin(request);

    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    const forceRefresh = (searchParams.get("refresh") ?? "").trim().length > 0;
    searchParams.delete("refresh");

    const entityType = parseEntityType(searchParams.get("entity_type") ?? "");
    const entityKey = searchParams.get("entity_key")?.trim() ?? "";
    const entitySlug = searchParams.get("entity_slug")?.trim() ?? "";

    if (!entityType) {
      return NextResponse.json({ error: "entity_type must be network, streaming, or production" }, { status: 400 });
    }
    if (!entityKey && !entitySlug) {
      return NextResponse.json({ error: "entity_key or entity_slug is required" }, { status: 400 });
    }

    const query = new URLSearchParams({ entity_type: entityType });
    if (entityKey) query.set("entity_key", entityKey);
    if (entitySlug) query.set("entity_slug", entitySlug);

    const cacheKey = buildUserScopedRouteCacheKey(user.uid, "detail", query);
    const promiseKey = forceRefresh ? `${cacheKey}:refresh` : cacheKey;

    if (!forceRefresh) {
      const cached = getRouteResponseCache<CachedDetailPayload>(
        NETWORKS_STREAMING_DETAIL_CACHE_NAMESPACE,
        cacheKey,
      );
      if (cached) {
        const { __trr_status: cachedStatus, ...cachedBody } = cached;
        return NextResponse.json(cachedBody, {
          status: cachedStatus === 404 ? 404 : 200,
          headers: buildAdminReadResponseHeaders({ cacheStatus: "hit" }),
        });
      }
    }

    let responseHeaders: Record<string, string> | undefined;
    const payload = await getOrCreateRouteResponsePromise<CachedDetailPayload>(
      NETWORKS_STREAMING_DETAIL_CACHE_NAMESPACE,
      promiseKey,
      async () => {
        const upstream = await fetchAdminBackendJson(
          `/admin/shows/networks-streaming/detail?${query.toString()}`,
          {
            timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
            routeName: "networks-streaming-detail",
          },
        );

        if (upstream.status === 404) {
          responseHeaders = buildAdminReadResponseHeaders({
            cacheStatus: forceRefresh ? "refresh" : "miss",
            upstreamMs: upstream.durationMs,
            totalMs: performance.now() - startedAt,
          });
          return { ...upstream.data, __trr_status: 404 };
        }
        if (upstream.status !== 200) {
          throw new Error(
            typeof upstream.data.error === "string"
              ? upstream.data.error
              : typeof upstream.data.detail === "string"
                ? upstream.data.detail
                : "Failed to load networks/streaming detail",
          );
        }
        responseHeaders = buildAdminReadResponseHeaders({
          cacheStatus: forceRefresh ? "refresh" : "miss",
          upstreamMs: upstream.durationMs,
          totalMs: performance.now() - startedAt,
        });
        setRouteResponseCache(
          NETWORKS_STREAMING_DETAIL_CACHE_NAMESPACE,
          cacheKey,
          upstream.data,
          NETWORKS_STREAMING_DETAIL_CACHE_TTL_MS,
        );
        return upstream.data;
      },
    );

    const { __trr_status: responseStatus, ...responseBody } = payload;
    return NextResponse.json(responseBody, {
      status: responseStatus === 404 ? 404 : 200,
      headers:
        responseHeaders ??
        buildAdminReadResponseHeaders({ cacheStatus: forceRefresh ? "refresh" : "miss" }),
    });
  } catch (error) {
    console.error("[api] Failed to load networks/streaming detail", error);
    return buildAdminProxyErrorResponse(error);
  }
}
