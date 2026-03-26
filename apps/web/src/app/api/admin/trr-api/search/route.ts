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
  TRR_SEARCH_CACHE_NAMESPACE,
  TRR_SEARCH_CACHE_TTL_MS,
} from "@/lib/server/trr-api/trr-show-read-route-cache";

export const dynamic = "force-dynamic";

const MIN_QUERY_LENGTH = 3;
const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;
const parseLimit = (raw: string | null): number => {
  const parsed = Number.parseInt(raw ?? String(DEFAULT_LIMIT), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(Math.max(parsed, 1), MAX_LIMIT);
};

export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);

    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (query.length < MIN_QUERY_LENGTH) {
      return NextResponse.json(
        { error: `Query must be at least ${MIN_QUERY_LENGTH} characters` },
        { status: 400 },
      );
    }

    const limit = parseLimit(request.nextUrl.searchParams.get("limit"));
    const cacheKey = buildUserScopedRouteCacheKey(user.uid, "search", request.nextUrl.searchParams);
    const cached = getRouteResponseCache<Record<string, unknown>>(TRR_SEARCH_CACHE_NAMESPACE, cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "x-trr-cache": "hit" } });
    }

    const payload = await getOrCreateRouteResponsePromise(
      TRR_SEARCH_CACHE_NAMESPACE,
      cacheKey,
      async () => {
        const upstream = await fetchAdminBackendJson(
          `/admin/trr-api/search?${new URLSearchParams({ q: query, limit: String(limit) }).toString()}`,
          {
            timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
            routeName: "admin-global-search",
          },
        );
        if (upstream.status !== 200) {
          throw new Error(
            typeof upstream.data.error === "string"
              ? upstream.data.error
              : typeof upstream.data.detail === "string"
                ? upstream.data.detail
                : "Failed to run admin global search",
          );
        }
        setRouteResponseCache(TRR_SEARCH_CACHE_NAMESPACE, cacheKey, upstream.data, TRR_SEARCH_CACHE_TTL_MS);
        return upstream.data;
      },
    );

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api] Failed to run admin global search", error);
    return buildAdminProxyErrorResponse(error);
  }
}
