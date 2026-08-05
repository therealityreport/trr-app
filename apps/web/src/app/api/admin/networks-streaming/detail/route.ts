import { NextRequest, NextResponse } from "next/server";
import { parseEntityType } from "@/lib/admin/networks-streaming-entity";
import { requireAdmin, toVerifiedAdminContext } from "@/lib/server/auth";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import {
  AdminReadProxyError,
  buildAdminProxyErrorResponse,
  buildAdminReadResponseHeaders,
} from "@/lib/server/trr-api/admin-read-proxy";
import {
  getNetworkStreamingDetail,
  type NetworkStreamingDetail,
} from "@/lib/server/trr-api/admin-networks-streaming-reads";
import {
  NETWORKS_STREAMING_DETAIL_CACHE_NAMESPACE,
  NETWORKS_STREAMING_DETAIL_CACHE_TTL_MS,
} from "@/lib/server/trr-api/networks-streaming-route-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const adminContext = toVerifiedAdminContext(user);

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
      const cached = getRouteResponseCache<NetworkStreamingDetail>(
        NETWORKS_STREAMING_DETAIL_CACHE_NAMESPACE,
        cacheKey,
      );
      if (cached) {
        return NextResponse.json(cached, {
          headers: buildAdminReadResponseHeaders({ cacheStatus: "hit" }),
        });
      }
    }

    const payload = await getOrCreateRouteResponsePromise<NetworkStreamingDetail>(
      NETWORKS_STREAMING_DETAIL_CACHE_NAMESPACE,
      promiseKey,
      async () => {
        const detail = await getNetworkStreamingDetail(
          {
            entity_type: entityType,
            entity_key: entityKey || undefined,
            entity_slug: entitySlug || undefined,
            show_scope: "added",
          },
          { adminContext },
        );
        setRouteResponseCache(
          NETWORKS_STREAMING_DETAIL_CACHE_NAMESPACE,
          cacheKey,
          detail,
          NETWORKS_STREAMING_DETAIL_CACHE_TTL_MS,
        );
        return detail;
      },
    );

    return NextResponse.json(payload, {
      headers: buildAdminReadResponseHeaders({ cacheStatus: forceRefresh ? "refresh" : "miss" }),
    });
  } catch (error) {
    console.error("[api] Failed to load networks/streaming detail", error);
    if (
      error instanceof AdminReadProxyError &&
      error.status === 404 &&
      error.code === "NETWORKS_STREAMING_ENTITY_NOT_FOUND" &&
      Array.isArray(error.detail?.suggestions)
    ) {
      return NextResponse.json(
        { error: "not_found", suggestions: error.detail.suggestions },
        { status: 404 },
      );
    }
    return buildAdminProxyErrorResponse(error);
  }
}
