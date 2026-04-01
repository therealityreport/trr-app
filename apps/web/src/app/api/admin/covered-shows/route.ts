import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import type { AuthContext } from "@/lib/server/postgres";
import {
  addCoveredShow as addCoveredShowLocal,
  type CoveredShow,
  getCoveredShows as getCoveredShowsLocal,
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

const extractBackendMessage = (
  data: Record<string, unknown>,
  fallback: string,
): string => {
  if (typeof data.error === "string" && data.error.trim()) return data.error;
  if (typeof data.detail === "string" && data.detail.trim()) return data.detail;
  return fallback;
};

const shouldFallbackToLocalCoveredShowsRepo = (error: unknown): boolean => {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("backend internal auth is not configured") ||
    message.includes("backend auth not configured") ||
    message.includes("backend api not configured") ||
    message.includes("could not reach trr-backend") ||
    message.includes("timed out")
  );
};

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
        const loadLocalShows = async () => {
          const loadedShows = await getCoveredShowsLocal();
          setRouteResponseCache(
            COVERED_SHOWS_CACHE_NAMESPACE,
            cacheKey,
            loadedShows,
            COVERED_SHOWS_CACHE_TTL_MS,
          );
          return loadedShows;
        };

        try {
          const upstream = await fetchAdminBackendJson("/admin/covered-shows", {
            timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
            routeName: "covered-shows:list",
          });
          if (upstream.status !== 200) {
            const message = extractBackendMessage(upstream.data, "Failed to fetch covered shows");
            if (upstream.status >= 500 || upstream.status === 403 || upstream.status === 401) {
              console.warn("[api] Falling back to local covered shows repository", {
                status: upstream.status,
                message,
              });
              return loadLocalShows();
            }
            throw new Error(message);
          }
          const loadedShows = Array.isArray(upstream.data.shows)
            ? (upstream.data.shows as CoveredShow[])
            : [];
          setRouteResponseCache(
            COVERED_SHOWS_CACHE_NAMESPACE,
            cacheKey,
            loadedShows,
            COVERED_SHOWS_CACHE_TTL_MS,
          );
          return loadedShows;
        } catch (error) {
          if (shouldFallbackToLocalCoveredShowsRepo(error)) {
            console.warn("[api] Covered shows backend proxy unavailable; using local repository", error);
            return loadLocalShows();
          }
          throw error;
        }
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

    try {
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
            error: extractBackendMessage(upstream.data, "Failed to add covered show"),
          },
          { status: upstream.status },
        );
      }
      if (upstream.status !== 200) {
        const message = extractBackendMessage(upstream.data, "Failed to add covered show");
        if (upstream.status >= 500 || upstream.status === 403 || upstream.status === 401) {
          console.warn("[api] Falling back to local covered shows create", {
            status: upstream.status,
            message,
          });
        } else {
          throw new Error(message);
        }
      } else {
        invalidateRouteResponseCache(COVERED_SHOWS_CACHE_NAMESPACE, `${user.uid}:`);
        await invalidateAdminBackendCache("/admin/covered-shows/cache/invalidate", {
          routeName: "covered-shows",
        });
        return NextResponse.json(upstream.data, { status: 201 });
      }
    } catch (error) {
      if (!shouldFallbackToLocalCoveredShowsRepo(error)) {
        throw error;
      }
      console.warn("[api] Covered shows create proxy unavailable; using local repository", error);
    }

    const show = await addCoveredShowLocal(authContext, { trr_show_id, show_name });
    invalidateRouteResponseCache(COVERED_SHOWS_CACHE_NAMESPACE, `${user.uid}:`);
    await invalidateAdminBackendCache("/admin/covered-shows/cache/invalidate", {
      routeName: "covered-shows",
    });
    return NextResponse.json({ show }, { status: 201 });
  } catch (error) {
    console.error("[api] Failed to add covered show", error);
    return buildAdminProxyErrorResponse(error);
  }
}
