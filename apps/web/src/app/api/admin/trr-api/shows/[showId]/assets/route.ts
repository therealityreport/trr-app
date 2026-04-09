import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import {
  ADMIN_READ_PROXY_GALLERY_TIMEOUT_MS,
  buildAdminProxyErrorResponse,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";
import {
  TRR_SHOW_ASSETS_CACHE_NAMESPACE,
  TRR_SHOW_ASSETS_CACHE_TTL_MS,
} from "@/lib/server/trr-api/trr-show-read-route-cache";

export const dynamic = "force-dynamic";
const FULL_FETCH_LIMIT = 5000;

interface RouteParams {
  params: Promise<{ showId: string }>;
}

/**
 * GET /api/admin/trr-api/shows/[showId]/assets
 *
 * Get show-level media assets (posters, backdrops, logos) for a show.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(_request);

    const { showId } = await params;
    if (!showId) {
      return NextResponse.json({ error: "showId is required" }, { status: 400 });
    }

    const { searchParams } = new URL(_request.url);
    const parsedLimit = parseInt(searchParams.get("limit") ?? "200", 10);
    const parsedOffset = parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : 200;
    const offset = Number.isFinite(parsedOffset) ? parsedOffset : 0;
    const cursor = searchParams.get("cursor")?.trim() || null;
    const full =
      searchParams.get("full") === "1" ||
      searchParams.get("full")?.toLowerCase() === "true";
    const sources = (searchParams.get("sources") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const upstreamParams = new URLSearchParams({
      limit: String(full ? FULL_FETCH_LIMIT + 1 : limit),
    });
    if (!full) {
      if (cursor) upstreamParams.set("cursor", cursor);
      else upstreamParams.set("offset", String(offset));
    } else {
      upstreamParams.set("offset", "0");
    }
    if (full) upstreamParams.set("full", "true");
    if (sources.length > 0) upstreamParams.set("sources", sources.join(","));

    const cacheKey = buildUserScopedRouteCacheKey(user.uid, `show-assets:${showId}`, upstreamParams);
    const cached = getRouteResponseCache<Record<string, unknown>>(TRR_SHOW_ASSETS_CACHE_NAMESPACE, cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "x-trr-cache": "hit" } });
    }

    const payload = await getOrCreateRouteResponsePromise(
      TRR_SHOW_ASSETS_CACHE_NAMESPACE,
      cacheKey,
      async () => {
        const upstream = await fetchAdminBackendJson(
          `/admin/trr-api/shows/${showId}/assets?${upstreamParams.toString()}`,
          {
            timeoutMs: ADMIN_READ_PROXY_GALLERY_TIMEOUT_MS,
            routeName: "show-assets",
          },
        );
        if (upstream.status !== 200) {
          throw new Error(
            typeof upstream.data.error === "string"
              ? upstream.data.error
              : typeof upstream.data.detail === "string"
                ? upstream.data.detail
                : "Failed to fetch show assets",
          );
        }
        setRouteResponseCache(TRR_SHOW_ASSETS_CACHE_NAMESPACE, cacheKey, upstream.data, TRR_SHOW_ASSETS_CACHE_TTL_MS);
        return upstream.data;
      },
    );

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api] Failed to fetch show assets", error);
    return buildAdminProxyErrorResponse(error);
  }
}
