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
  TRR_SHOW_SEASONS_CACHE_NAMESPACE,
  TRR_SHOW_SEASONS_CACHE_TTL_MS,
} from "@/lib/server/trr-api/trr-show-read-route-cache";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string }>;
}

const parseBoolean = (value: string | null): boolean => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
};

/**
 * GET /api/admin/trr-api/shows/[showId]/seasons
 *
 * List seasons for a show from TRR Core API.
 * Ordered by season_number DESC (newest first).
 *
 * Query params:
 * - limit: max results (default 20, max 100)
 * - offset: pagination offset (default 0)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);

    const { showId } = await params;

    if (!showId) {
      return NextResponse.json(
        { error: "showId is required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);
    const includeEpisodeSignal = parseBoolean(searchParams.get("include_episode_signal"));

    const cacheKey = buildUserScopedRouteCacheKey(
      user.uid,
      `${showId}:list`,
      request.nextUrl.searchParams,
    );
    const cached = getRouteResponseCache<Record<string, unknown>>(TRR_SHOW_SEASONS_CACHE_NAMESPACE, cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "x-trr-cache": "hit" } });
    }

    const payload = await getOrCreateRouteResponsePromise(
      TRR_SHOW_SEASONS_CACHE_NAMESPACE,
      cacheKey,
      async () => {
        const upstreamParams = new URLSearchParams({
          limit: String(limit),
          offset: String(offset),
        });
        if (includeEpisodeSignal) {
          upstreamParams.set("include_episode_signal", "true");
        }
        const upstream = await fetchAdminBackendJson(
          `/admin/trr-api/shows/${showId}/seasons?${upstreamParams.toString()}`,
          {
            timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
            routeName: "show-seasons",
          },
        );
        if (upstream.status !== 200) {
          throw new Error(
            typeof upstream.data.error === "string"
              ? upstream.data.error
              : typeof upstream.data.detail === "string"
                ? upstream.data.detail
                : "Failed to get TRR seasons",
          );
        }
        setRouteResponseCache(TRR_SHOW_SEASONS_CACHE_NAMESPACE, cacheKey, upstream.data, TRR_SHOW_SEASONS_CACHE_TTL_MS);
        return upstream.data;
      },
    );

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api] Failed to get TRR seasons", error);
    return buildAdminProxyErrorResponse(error);
  }
}
