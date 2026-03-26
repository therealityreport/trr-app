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
  TRR_SEASON_CAST_CACHE_NAMESPACE,
  TRR_SEASON_CAST_CACHE_TTL_MS,
} from "@/lib/server/trr-api/trr-show-read-route-cache";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string; seasonNumber: string }>;
}

const parsePhotoFallbackMode = (value: string | null): "none" | "bravo" =>
  value?.trim().toLowerCase() === "bravo" ? "bravo" : "none";

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);

    const { showId, seasonNumber } = await params;
    if (!showId) {
      return NextResponse.json({ error: "showId is required" }, { status: 400 });
    }

    const seasonNum = Number.parseInt(seasonNumber, 10);
    if (!Number.isFinite(seasonNum)) {
      return NextResponse.json({ error: "seasonNumber is invalid" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get("limit") ?? "500", 10);
    const offsetParam = parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Number.isFinite(limitParam) ? Math.min(limitParam, 500) : 500;
    const offset = Number.isFinite(offsetParam) ? Math.max(offsetParam, 0) : 0;
    const includeArchiveOnly = (searchParams.get("include_archive_only") ?? "").toLowerCase() === "true";
    const photoFallbackMode = parsePhotoFallbackMode(searchParams.get("photo_fallback"));

    const cacheKey = buildUserScopedRouteCacheKey(
      user.uid,
      `season-cast:${showId}:${seasonNum}`,
      request.nextUrl.searchParams,
    );
    const cached = getRouteResponseCache<Record<string, unknown>>(TRR_SEASON_CAST_CACHE_NAMESPACE, cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "x-trr-cache": "hit" } });
    }

    const payload = await getOrCreateRouteResponsePromise(
      TRR_SEASON_CAST_CACHE_NAMESPACE,
      cacheKey,
      async () => {
        const upstreamParams = new URLSearchParams({
          limit: String(limit),
          offset: String(offset),
          photo_fallback: photoFallbackMode,
        });
        if (includeArchiveOnly) {
          upstreamParams.set("include_archive_only", "true");
        }
        const upstream = await fetchAdminBackendJson(
          `/admin/trr-api/shows/${showId}/seasons/${seasonNum}/cast?${upstreamParams.toString()}`,
          {
            timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
            routeName: "season-cast",
          },
        );
        if (upstream.status !== 200) {
          throw new Error(
            typeof upstream.data.error === "string"
              ? upstream.data.error
              : typeof upstream.data.detail === "string"
                ? upstream.data.detail
                : "Failed to get season cast",
          );
        }
        setRouteResponseCache(TRR_SEASON_CAST_CACHE_NAMESPACE, cacheKey, upstream.data, TRR_SEASON_CAST_CACHE_TTL_MS);
        return upstream.data;
      },
    );

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api] Failed to get season cast", error);
    return buildAdminProxyErrorResponse(error);
  }
}
