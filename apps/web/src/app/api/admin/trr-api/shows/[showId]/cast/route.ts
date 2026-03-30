import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { resolveAdminShowId } from "@/lib/server/admin/resolve-show-id";
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
  TRR_SHOW_CAST_CACHE_NAMESPACE,
  TRR_SHOW_CAST_CACHE_TTL_MS,
} from "@/lib/server/trr-api/trr-show-read-route-cache";

export const dynamic = "force-dynamic";

const DEFAULT_MIN_EPISODES = 1;

type CastRosterMode = "episode_evidence" | "imdb_show_membership";

interface RouteParams {
  params: Promise<{ showId: string }>;
}

const parsePhotoFallbackMode = (value: string | null): "none" | "bravo" =>
  value?.trim().toLowerCase() === "bravo" ? "bravo" : "none";

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);

    const { showId: rawShowId } = await params;
    const showId = await resolveAdminShowId(rawShowId);

    if (!showId) {
      return NextResponse.json({ error: `Show not found for "${rawShowId}".` }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const cacheKey = buildUserScopedRouteCacheKey(user.uid, `${showId}:cast`, request.nextUrl.searchParams);
    const cached = getRouteResponseCache<Record<string, unknown>>(TRR_SHOW_CAST_CACHE_NAMESPACE, cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "x-trr-cache": "hit" } });
    }

    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);
    const minEpisodes = searchParams.get("minEpisodes");
    const excludeZeroEpisodeMembers =
      String(searchParams.get("exclude_zero_episode_members") ?? "").trim().toLowerCase() === "1" ||
      String(searchParams.get("exclude_zero_episode_members") ?? "").trim().toLowerCase() === "true";
    const requireImage = searchParams.get("requireImage");
    const includePhotos =
      String(searchParams.get("include_photos") ?? "").trim().toLowerCase() === "false" ||
      String(searchParams.get("include_photos") ?? "").trim().toLowerCase() === "0"
        ? false
        : true;
    const rosterModeRaw = String(searchParams.get("roster_mode") ?? "").trim().toLowerCase();
    const rosterMode: CastRosterMode =
      rosterModeRaw === "imdb_show_membership" ? "imdb_show_membership" : "episode_evidence";
    const photoFallbackMode = parsePhotoFallbackMode(searchParams.get("photo_fallback"));

    const payload = await getOrCreateRouteResponsePromise(
      TRR_SHOW_CAST_CACHE_NAMESPACE,
      cacheKey,
      async () => {
        const upstreamParams = new URLSearchParams({
          limit: String(limit),
          offset: String(offset),
          roster_mode: rosterMode,
          photo_fallback: photoFallbackMode,
          minEpisodes: minEpisodes ?? String(DEFAULT_MIN_EPISODES),
        });
        if (excludeZeroEpisodeMembers) upstreamParams.set("exclude_zero_episode_members", "true");
        if (requireImage === "true" || requireImage === "1") upstreamParams.set("requireImage", "true");
        if (!includePhotos) upstreamParams.set("include_photos", "false");

        const upstream = await fetchAdminBackendJson(
          `/admin/trr-api/shows/${showId}/cast?${upstreamParams.toString()}`,
          {
            timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
            routeName: "show-cast",
          },
        );
        if (upstream.status !== 200) {
          throw new Error(
            typeof upstream.data.error === "string"
              ? upstream.data.error
              : typeof upstream.data.detail === "string"
                ? upstream.data.detail
                : "Failed to get show cast",
          );
        }
        setRouteResponseCache(TRR_SHOW_CAST_CACHE_NAMESPACE, cacheKey, upstream.data, TRR_SHOW_CAST_CACHE_TTL_MS);
        return upstream.data;
      },
    );

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api] Failed to get show cast", error);
    return buildAdminProxyErrorResponse(error);
  }
}
