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
import { getSeasonsByShowId } from "@/lib/server/trr-api/trr-shows-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string }>;
}

const parseBoolean = (value: string | null): boolean => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
};

const buildLocalSeasonsPayload = async (
  showId: string,
  options: { limit: number; offset: number; includeEpisodeSignal: boolean },
) => {
  const seasons = await getSeasonsByShowId(showId, {
    limit: options.limit,
    offset: options.offset,
    includeEpisodeSignal: options.includeEpisodeSignal,
  });
  return {
    seasons,
    pagination: {
      limit: options.limit,
      offset: options.offset,
      count: seasons.length,
    },
    source: "local-fallback",
  };
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
        try {
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
        } catch (upstreamError) {
          console.warn("[api] TRR seasons proxy unavailable; using local repository", upstreamError);
          const fallback = await buildLocalSeasonsPayload(showId, {
            limit,
            offset,
            includeEpisodeSignal,
          });
          setRouteResponseCache(TRR_SHOW_SEASONS_CACHE_NAMESPACE, cacheKey, fallback, TRR_SHOW_SEASONS_CACHE_TTL_MS);
          return fallback;
        }
      },
    );

    return NextResponse.json(payload, {
      headers: payload.source === "local-fallback" ? { "x-trr-show-seasons-source": "local-fallback" } : undefined,
    });
  } catch (error) {
    console.error("[api] Failed to get TRR seasons", error);
    return buildAdminProxyErrorResponse(error);
  }
}
