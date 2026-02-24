import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getSeasonsByShowId } from "@/lib/server/trr-api/trr-shows-repository";
import {
  buildUserScopedRouteCacheKey,
  getRouteResponseCache,
  parseCacheTtlMs,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";

export const dynamic = "force-dynamic";
const SHOW_SEASONS_CACHE_NAMESPACE = "admin-show-seasons";
const SHOW_SEASONS_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SHOW_SEASONS_CACHE_TTL_MS,
);

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
    const cached = getRouteResponseCache<{
      seasons: Awaited<ReturnType<typeof getSeasonsByShowId>>;
      pagination: { limit: number; offset: number; count: number };
    }>(SHOW_SEASONS_CACHE_NAMESPACE, cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "x-trr-cache": "hit" } });
    }

    const seasons = await getSeasonsByShowId(showId, { limit, offset, includeEpisodeSignal });
    const payload = {
      seasons,
      pagination: {
        limit,
        offset,
        count: seasons.length,
      },
    };
    setRouteResponseCache(SHOW_SEASONS_CACHE_NAMESPACE, cacheKey, payload, SHOW_SEASONS_CACHE_TTL_MS);

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api] Failed to get TRR seasons", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
