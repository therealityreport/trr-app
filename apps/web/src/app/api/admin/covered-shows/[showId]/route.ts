import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import type { AuthContext } from "@/lib/server/postgres";
import {
  getCoveredShowByTrrShowId,
  removeCoveredShow,
} from "@/lib/server/admin/covered-shows-repository";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";

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
    await requireAdmin(request);

    const { showId } = await params;

    if (!showId) {
      return NextResponse.json(
        { error: "showId is required" },
        { status: 400 }
      );
    }

    const show = await getCoveredShowByTrrShowId(showId);

    if (!show) {
      return NextResponse.json(
        { error: "Show not found in covered shows list" },
        { status: 404 }
      );
    }

    return NextResponse.json({ show });
  } catch (error) {
    console.error("[api] Failed to get covered show", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
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

    const deleted = await removeCoveredShow(authContext, showId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Show not found in covered shows list" },
        { status: 404 }
      );
    }
    invalidateRouteResponseCache(COVERED_SHOWS_CACHE_NAMESPACE, `${user.uid}:`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api] Failed to remove covered show", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
