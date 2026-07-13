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
  TRR_SEASON_EPISODES_CACHE_NAMESPACE,
  TRR_SEASON_EPISODES_CACHE_TTL_MS,
} from "@/lib/server/trr-api/trr-show-read-route-cache";
import { parseBoundedIntegerParam } from "@/lib/server/trr-api/query-integer-params";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ seasonId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);

    const { seasonId } = await params;
    if (!seasonId) {
      return NextResponse.json({ error: "seasonId is required" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limitResult = parseBoundedIntegerParam(searchParams.get("limit"), {
      name: "limit",
      defaultValue: 20,
      min: 1,
      max: 500,
    });
    if (!limitResult.ok) {
      return NextResponse.json({ error: limitResult.error }, { status: 400 });
    }
    const offsetResult = parseBoundedIntegerParam(searchParams.get("offset"), {
      name: "offset",
      defaultValue: 0,
      min: 0,
    });
    if (!offsetResult.ok) {
      return NextResponse.json({ error: offsetResult.error }, { status: 400 });
    }
    const limit = limitResult.value;
    const offset = offsetResult.value;
    const cacheKey = buildUserScopedRouteCacheKey(
      user.uid,
      `season-episodes:${seasonId}`,
      request.nextUrl.searchParams,
    );
    const cached = getRouteResponseCache<Record<string, unknown>>(TRR_SEASON_EPISODES_CACHE_NAMESPACE, cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "x-trr-cache": "hit" } });
    }

    const payload = await getOrCreateRouteResponsePromise(
      TRR_SEASON_EPISODES_CACHE_NAMESPACE,
      cacheKey,
      async () => {
        const upstream = await fetchAdminBackendJson(
          `/admin/trr-api/seasons/${seasonId}/episodes?${new URLSearchParams({
            limit: String(limit),
            offset: String(offset),
          }).toString()}`,
          {
            timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
            routeName: "season-episodes",
          },
        );
        if (upstream.status !== 200) {
          throw new Error(
            typeof upstream.data.error === "string"
              ? upstream.data.error
              : typeof upstream.data.detail === "string"
                ? upstream.data.detail
                : "Failed to get TRR episodes",
          );
        }
        setRouteResponseCache(
          TRR_SEASON_EPISODES_CACHE_NAMESPACE,
          cacheKey,
          upstream.data,
          TRR_SEASON_EPISODES_CACHE_TTL_MS,
        );
        return upstream.data;
      },
    );

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api] Failed to get TRR episodes", error);
    return buildAdminProxyErrorResponse(error);
  }
}
