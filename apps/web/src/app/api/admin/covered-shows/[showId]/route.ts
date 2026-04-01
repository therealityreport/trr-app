import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import type { AuthContext } from "@/lib/server/postgres";
import {
  getCoveredShowByTrrShowId,
  removeCoveredShow as removeCoveredShowLocal,
} from "@/lib/server/admin/covered-shows-repository";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";
import {
  buildAdminProxyErrorResponse,
  fetchAdminBackendJson,
  invalidateAdminBackendCache,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
} from "@/lib/server/trr-api/admin-read-proxy";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { getInternalAdminBearerToken } from "@/lib/server/trr-api/internal-admin-auth";

export const dynamic = "force-dynamic";
const COVERED_SHOWS_CACHE_NAMESPACE = "admin-covered-shows";

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

const getBackendDeleteHeaders = (userUid: string): Headers => {
  const serviceRoleKey = getInternalAdminBearerToken();
  if (!serviceRoleKey?.trim()) {
    throw new Error("Backend auth not configured");
  }
  return new Headers({
    Authorization: `Bearer ${serviceRoleKey.trim()}`,
    "X-TRR-Admin-User-Uid": userUid,
    Accept: "application/json",
  });
};

const parseBackendPayload = async (response: Response): Promise<Record<string, unknown>> => {
  const text = await response.text();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

interface RouteParams {
  params: Promise<{ showId: string }>;
}

/**
 * GET /api/admin/covered-shows/[showId]
 *
 * Get a specific covered show by TRR show ID.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { showId } = await params;

    if (!showId) {
      return NextResponse.json(
        { error: "showId is required" },
        { status: 400 }
      );
    }

    try {
      const upstream = await fetchAdminBackendJson(`/admin/covered-shows/${showId}`, {
        timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
        routeName: "covered-shows:detail",
      });
      if (upstream.status === 404) {
        return NextResponse.json(
          { error: extractBackendMessage(upstream.data, "Show not found in covered shows list") },
          { status: 404 }
        );
      }
      if (upstream.status !== 200) {
        const message = extractBackendMessage(upstream.data, "Failed to get covered show");
        if (upstream.status >= 500 || upstream.status === 403 || upstream.status === 401) {
          console.warn("[api] Falling back to local covered show detail", {
            status: upstream.status,
            message,
          });
        } else {
          throw new Error(message);
        }
      } else {
        return NextResponse.json({ show: upstream.data.show ?? null });
      }
    } catch (error) {
      if (!shouldFallbackToLocalCoveredShowsRepo(error)) {
        throw error;
      }
      console.warn("[api] Covered show detail proxy unavailable; using local repository", error);
    }

    const show = await getCoveredShowByTrrShowId(showId);
    if (!show) {
      return NextResponse.json({ error: "Show not found in covered shows list" }, { status: 404 });
    }
    return NextResponse.json({ show });
  } catch (error) {
    console.error("[api] Failed to get covered show", error);
    return buildAdminProxyErrorResponse(error);
  }
}

/**
 * DELETE /api/admin/covered-shows/[showId]
 *
 * Remove a show from the covered shows list.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const authContext: AuthContext = { firebaseUid: user.uid, isAdmin: true };

    const { showId } = await params;

    if (!showId) {
      return NextResponse.json(
        { error: "showId is required" },
        { status: 400 }
      );
    }

    try {
      const backendUrl = getBackendApiUrl(`/admin/covered-shows/${showId}`);
      if (!backendUrl) {
        throw new Error("Backend API not configured");
      }
      const response = await fetch(backendUrl, {
        method: "DELETE",
        headers: getBackendDeleteHeaders(user.uid),
        cache: "no-store",
      });
      const data = await parseBackendPayload(response);
      if (response.status === 404) {
        return NextResponse.json(
          {
            error: extractBackendMessage(data, "Show not found in covered shows list"),
          },
          { status: 404 }
        );
      }
      if (response.status !== 200) {
        const message = extractBackendMessage(data, "Failed to remove covered show");
        if (response.status >= 500 || response.status === 403 || response.status === 401) {
          console.warn("[api] Falling back to local covered show delete", {
            status: response.status,
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
        return NextResponse.json(data);
      }
    } catch (error) {
      if (!shouldFallbackToLocalCoveredShowsRepo(error)) {
        throw error;
      }
      console.warn("[api] Covered show delete proxy unavailable; using local repository", error);
    }

    const deleted = await removeCoveredShowLocal(authContext, showId);
    if (!deleted) {
      return NextResponse.json({ error: "Show not found in covered shows list" }, { status: 404 });
    }
    invalidateRouteResponseCache(COVERED_SHOWS_CACHE_NAMESPACE, `${user.uid}:`);
    await invalidateAdminBackendCache("/admin/covered-shows/cache/invalidate", {
      routeName: "covered-shows",
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api] Failed to remove covered show", error);
    return buildAdminProxyErrorResponse(error);
  }
}
