import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";
import { getTrrAdminServiceKey } from "@/lib/server/supabase-trr-admin";
import {
  buildAdminProxyErrorResponse,
  fetchAdminBackendJson,
  invalidateAdminBackendCache,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
} from "@/lib/server/trr-api/admin-read-proxy";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";
const COVERED_SHOWS_CACHE_NAMESPACE = "admin-covered-shows";

const getBackendDeleteHeaders = (userUid: string): Headers => {
  const serviceRoleKey = getTrrAdminServiceKey();
  const internalSecret = process.env.TRR_INTERNAL_ADMIN_SHARED_SECRET;
  if (!serviceRoleKey?.trim() || !internalSecret?.trim()) {
    throw new Error("Backend auth not configured");
  }
  return new Headers({
    Authorization: `Bearer ${serviceRoleKey.trim()}`,
    "X-TRR-Internal-Admin-Secret": internalSecret.trim(),
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

    const upstream = await fetchAdminBackendJson(`/admin/covered-shows/${showId}`, {
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName: "covered-shows:detail",
    });
    if (upstream.status === 404) {
      return NextResponse.json(
        { error: typeof upstream.data.detail === "string" ? upstream.data.detail : "Show not found in covered shows list" },
        { status: 404 }
      );
    }
    if (upstream.status !== 200) {
      throw new Error(
        typeof upstream.data.error === "string"
          ? upstream.data.error
          : typeof upstream.data.detail === "string"
            ? upstream.data.detail
            : "Failed to get covered show",
      );
    }

    return NextResponse.json({ show: upstream.data.show ?? null });
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

    const { showId } = await params;

    if (!showId) {
      return NextResponse.json(
        { error: "showId is required" },
        { status: 400 }
      );
    }

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
          error:
            typeof data.detail === "string"
              ? data.detail
              : typeof data.error === "string"
                ? data.error
                : "Show not found in covered shows list",
        },
        { status: 404 }
      );
    }
    if (response.status !== 200) {
      throw new Error(
        typeof data.error === "string"
          ? data.error
          : typeof data.detail === "string"
            ? data.detail
            : "Failed to remove covered show",
      );
    }
    invalidateRouteResponseCache(COVERED_SHOWS_CACHE_NAMESPACE, `${user.uid}:`);
    await invalidateAdminBackendCache("/admin/covered-shows/cache/invalidate", {
      routeName: "covered-shows",
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to remove covered show", error);
    return buildAdminProxyErrorResponse(error);
  }
}
