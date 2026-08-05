import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, toVerifiedAdminContext } from "@/lib/server/auth";
import {
  parseCoveredShowDeletePayload,
  parseCoveredShowPayload,
} from "@/lib/server/admin/covered-shows-repository";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";
import {
  buildAdminBackendStatusError,
  buildAdminProxyErrorResponse,
  fetchAdminBackendJson,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
} from "@/lib/server/trr-api/admin-read-proxy";

export const dynamic = "force-dynamic";
const COVERED_SHOWS_CACHE_NAMESPACE = "admin-covered-shows";

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
    const user = await requireAdmin(request);
    const { showId } = await params;
    if (!showId) {
      return NextResponse.json({ error: "showId is required" }, { status: 400 });
    }

    const upstream = await fetchAdminBackendJson(`/admin/covered-shows/${showId}`, {
      apiVersion: "v2",
      adminContext: toVerifiedAdminContext(user),
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName: "covered-shows:detail",
    });
    if (upstream.status !== 200) {
      throw buildAdminBackendStatusError({
        status: upstream.status,
        data: upstream.data,
        fallbackMessage: "Failed to get covered show",
        routeName: "covered-shows:detail",
      });
    }
    return NextResponse.json({ show: parseCoveredShowPayload(upstream.data) });
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
      return NextResponse.json({ error: "showId is required" }, { status: 400 });
    }

    const upstream = await fetchAdminBackendJson(`/admin/covered-shows/${showId}`, {
      apiVersion: "v2",
      method: "DELETE",
      adminContext: toVerifiedAdminContext(user),
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName: "covered-shows:delete",
    });
    if (upstream.status !== 200) {
      throw buildAdminBackendStatusError({
        status: upstream.status,
        data: upstream.data,
        fallbackMessage: "Failed to remove covered show",
        routeName: "covered-shows:delete",
      });
    }
    const payload = parseCoveredShowDeletePayload(upstream.data);
    invalidateRouteResponseCache(COVERED_SHOWS_CACHE_NAMESPACE, `${user.uid}:`);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api] Failed to remove covered show", error);
    return buildAdminProxyErrorResponse(error);
  }
}
