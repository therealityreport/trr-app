import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  invalidateRouteResponseCache,
  parseCacheTtlMs,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import {
  buildAdminProxyErrorResponse,
  fetchAdminBackendJson,
  invalidateAdminBackendCache,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
} from "@/lib/server/trr-api/admin-read-proxy";

export const dynamic = "force-dynamic";
const COVERED_SHOWS_CACHE_NAMESPACE = "admin-covered-shows";
const COVERED_SHOWS_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_COVERED_SHOWS_CACHE_TTL_MS,
  30_000,
);

/**
 * GET /api/admin/covered-shows
 *
 * List all covered shows (shows TRR editorially covers).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const cacheKey = buildUserScopedRouteCacheKey(
      user.uid,
      "list",
      request.nextUrl.searchParams,
    );
    const cachedShows = getRouteResponseCache<Array<Record<string, unknown>>>(
      COVERED_SHOWS_CACHE_NAMESPACE,
      cacheKey,
    );
    if (cachedShows) {
      return NextResponse.json({ shows: cachedShows }, { headers: { "x-trr-cache": "hit" } });
    }

    const shows = await getOrCreateRouteResponsePromise(
      COVERED_SHOWS_CACHE_NAMESPACE,
      cacheKey,
      async () => {
        const upstream = await fetchAdminBackendJson("/admin/covered-shows", {
          timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
          routeName: "covered-shows:list",
        });
        if (upstream.status !== 200) {
          throw new Error(
            typeof upstream.data.error === "string"
              ? upstream.data.error
              : "Failed to fetch covered shows",
          );
        }
        const loadedShows = Array.isArray(upstream.data.shows)
          ? (upstream.data.shows as Array<Record<string, unknown>>)
          : [];
        setRouteResponseCache(
          COVERED_SHOWS_CACHE_NAMESPACE,
          cacheKey,
          loadedShows,
          COVERED_SHOWS_CACHE_TTL_MS,
        );
        return loadedShows;
      },
    );

    return NextResponse.json({ shows });
  } catch (error) {
    console.error("[api] Failed to list covered shows", error);
    return buildAdminProxyErrorResponse(error);
  }
}

/**
 * POST /api/admin/covered-shows
 *
 * Add a show to the covered shows list.
 *
 * Request body:
 * - trr_show_id: string (required)
 * - show_name: string (required)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request);

    const body = await request.json();
    const { trr_show_id, show_name } = body;

    if (!trr_show_id || typeof trr_show_id !== "string") {
      return NextResponse.json(
        { error: "trr_show_id is required and must be a string" },
        { status: 400 }
      );
    }

    if (!show_name || typeof show_name !== "string") {
      return NextResponse.json(
        { error: "show_name is required and must be a string" },
        { status: 400 }
      );
    }

    const upstream = await fetchAdminBackendJson("/admin/covered-shows", {
      method: "POST",
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName: "covered-shows:create",
      headers: {
        "Content-Type": "application/json",
        "X-TRR-Admin-User-Uid": user.uid,
      },
      body: JSON.stringify({
        trr_show_id,
        show_name,
      }),
    });
    if (upstream.status === 400 || upstream.status === 404) {
      return NextResponse.json(
        {
          error:
            typeof upstream.data.detail === "string"
              ? upstream.data.detail
              : typeof upstream.data.error === "string"
                ? upstream.data.error
                : "Failed to add covered show",
        },
        { status: upstream.status },
      );
    }
    if (upstream.status !== 200) {
      throw new Error(
        typeof upstream.data.error === "string"
          ? upstream.data.error
          : typeof upstream.data.detail === "string"
            ? upstream.data.detail
            : "Failed to add covered show",
      );
    }
    invalidateRouteResponseCache(COVERED_SHOWS_CACHE_NAMESPACE, `${user.uid}:`);
    await invalidateAdminBackendCache("/admin/covered-shows/cache/invalidate", {
      routeName: "covered-shows",
    });

    return NextResponse.json(upstream.data, { status: 201 });
  } catch (error) {
    console.error("[api] Failed to add covered show", error);
    return buildAdminProxyErrorResponse(error);
  }
}
