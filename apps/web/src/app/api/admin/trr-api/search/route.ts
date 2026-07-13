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
import { parseBoundedIntegerParam } from "@/lib/server/trr-api/query-integer-params";

export const dynamic = "force-dynamic";

const MIN_QUERY_LENGTH = 3;
const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;

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

    const limitResult = parseBoundedIntegerParam(request.nextUrl.searchParams.get("limit"), {
      name: "limit",
      defaultValue: DEFAULT_LIMIT,
      min: 1,
      max: MAX_LIMIT,
    });
    if (!limitResult.ok) {
      return NextResponse.json({ error: limitResult.error }, { status: 400 });
    }
    const limit = limitResult.value;
    const upstreamParams = new URLSearchParams({ q: query, limit: String(limit) });
    const cacheKey = buildUserScopedRouteCacheKey(user.uid, "search", upstreamParams);
    const cached = getRouteResponseCache<Record<string, unknown>>(TRR_SEARCH_CACHE_NAMESPACE, cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "x-trr-cache": "hit" } });
    }

    const payload = await getOrCreateRouteResponsePromise(
      TRR_SEARCH_CACHE_NAMESPACE,
      cacheKey,
      async () => {
        const upstream = await fetchAdminBackendJson(
          `/admin/trr-api/search?${upstreamParams.toString()}`,
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
