import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import type { AuthContext } from "@/lib/server/postgres";
import {
  getCoveredShows,
  addCoveredShow,
} from "@/lib/server/admin/covered-shows-repository";
import {
  buildUserScopedRouteCacheKey,
  getRouteResponseCache,
  invalidateRouteResponseCache,
  parseCacheTtlMs,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";

export const dynamic = "force-dynamic";
const COVERED_SHOWS_CACHE_NAMESPACE = "admin-covered-shows";
const COVERED_SHOWS_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_COVERED_SHOWS_CACHE_TTL_MS,
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
    const cachedShows = getRouteResponseCache<Awaited<ReturnType<typeof getCoveredShows>>>(
      COVERED_SHOWS_CACHE_NAMESPACE,
      cacheKey,
    );
    if (cachedShows) {
      return NextResponse.json({ shows: cachedShows }, { headers: { "x-trr-cache": "hit" } });
    }

    const shows = await getCoveredShows();
    setRouteResponseCache(COVERED_SHOWS_CACHE_NAMESPACE, cacheKey, shows, COVERED_SHOWS_CACHE_TTL_MS);

    return NextResponse.json({ shows });
  } catch (error) {
    console.error("[api] Failed to list covered shows", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
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
    const authContext: AuthContext = { firebaseUid: user.uid, isAdmin: true };

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

    const show = await addCoveredShow(authContext, {
      trr_show_id,
      show_name,
    });
    invalidateRouteResponseCache(COVERED_SHOWS_CACHE_NAMESPACE, `${user.uid}:`);

    return NextResponse.json({ show }, { status: 201 });
  } catch (error) {
    console.error("[api] Failed to add covered show", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
