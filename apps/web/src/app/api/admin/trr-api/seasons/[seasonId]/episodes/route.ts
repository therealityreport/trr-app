import { fetchAdminPrimaryRead } from "@/lib/server/trr-api/primary-read";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import {
  buildAdminProxyErrorResponse,
  buildAdminBackendStatusError,
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
    const upstreamParams = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    const cacheKey = buildUserScopedRouteCacheKey(
      user.uid,
      `season-episodes:${seasonId}`,
      upstreamParams,
    );
    const cached = getRouteResponseCache<Record<string, unknown>>(TRR_SEASON_EPISODES_CACHE_NAMESPACE, cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "x-trr-cache": "hit" } });
    }

    const payload = await getOrCreateRouteResponsePromise(
      TRR_SEASON_EPISODES_CACHE_NAMESPACE,
      cacheKey,
      async () => {
        const upstream = await fetchAdminPrimaryRead(
          `/admin/trr-api/seasons/${seasonId}/episodes?${upstreamParams.toString()}`,
          {
            routeName: "season-episodes",
          },
        );
        if (upstream.status !== 200) {
          throw buildAdminBackendStatusError({
            status: upstream.status,
            data: upstream.data,
            fallbackMessage: "Failed to get TRR episodes",
            routeName: "season-episodes",
            requestRole: "primary",
          });
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
