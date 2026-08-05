import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, toVerifiedAdminContext } from "@/lib/server/auth";
import {
  parseCoveredShowPayload,
  parseCoveredShowsPayload,
  type CoveredShow,
} from "@/lib/server/admin/covered-shows-repository";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  invalidateRouteResponseCache,
  parseCacheTtlMs,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import {
  buildAdminBackendStatusError,
  buildAdminProxyErrorResponse,
  fetchAdminBackendJson,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
} from "@/lib/server/trr-api/admin-read-proxy";

export const dynamic = "force-dynamic";
const COVERED_SHOWS_CACHE_NAMESPACE = "admin-covered-shows";
const COVERED_SHOWS_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_COVERED_SHOWS_CACHE_TTL_MS,
  30_000,
);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const CREATE_COVERED_SHOW_KEYS = new Set(["trr_show_id", "show_name"]);

/**
 * GET /api/admin/covered-shows
 *
 * List all covered shows (shows TRR editorially covers).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const adminContext = toVerifiedAdminContext(user);
    const cacheKey = buildUserScopedRouteCacheKey(
      user.uid,
      "list",
      request.nextUrl.searchParams,
    );
    const cachedShows = getRouteResponseCache<CoveredShow[]>(
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
          apiVersion: "v2",
          adminContext,
          timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
          routeName: "covered-shows:list",
        });
        if (upstream.status !== 200) {
          throw buildAdminBackendStatusError({
            status: upstream.status,
            data: upstream.data,
            fallbackMessage: "Failed to fetch covered shows",
            routeName: "covered-shows:list",
          });
        }
        const loadedShows = parseCoveredShowsPayload(upstream.data);
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
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const body = (await request.json().catch(() => null)) as unknown;
    if (!isRecord(body)) {
      return NextResponse.json(
        { error: "trr_show_id is required and must be a string" },
        { status: 400 },
      );
    }
    if (
      Object.keys(body).length !== CREATE_COVERED_SHOW_KEYS.size ||
      !Object.keys(body).every((key) => CREATE_COVERED_SHOW_KEYS.has(key))
    ) {
      return NextResponse.json(
        { error: "Only trr_show_id and show_name are allowed" },
        { status: 400 },
      );
    }
    if (typeof body.trr_show_id !== "string" || !body.trr_show_id.trim()) {
      return NextResponse.json(
        { error: "trr_show_id is required and must be a string" },
        { status: 400 },
      );
    }
    if (typeof body.show_name !== "string" || !body.show_name.trim()) {
      return NextResponse.json(
        { error: "show_name is required and must be a string" },
        { status: 400 },
      );
    }

    const upstream = await fetchAdminBackendJson("/admin/covered-shows", {
      apiVersion: "v2",
      method: "POST",
      adminContext: toVerifiedAdminContext(user),
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName: "covered-shows:create",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trr_show_id: body.trr_show_id.trim(),
        show_name: body.show_name.trim(),
      }),
    });
    if (upstream.status !== 201) {
      throw buildAdminBackendStatusError({
        status: upstream.status,
        data: upstream.data,
        fallbackMessage: "Failed to add covered show",
        routeName: "covered-shows:create",
      });
    }

    const show = parseCoveredShowPayload(upstream.data);
    invalidateRouteResponseCache(COVERED_SHOWS_CACHE_NAMESPACE, `${user.uid}:`);
    return NextResponse.json({ show }, { status: 201 });
  } catch (error) {
    console.error("[api] Failed to add covered show", error);
    return buildAdminProxyErrorResponse(error);
  }
}
