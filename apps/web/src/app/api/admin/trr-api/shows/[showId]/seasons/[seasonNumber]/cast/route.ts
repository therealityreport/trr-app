import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getSeasonCastWithEpisodeCounts } from "@/lib/server/trr-api/trr-shows-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string; seasonNumber: string }>;
}

/**
 * GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/cast
 *
 * List cast members for a show season with per-season episode counts.
 * Query params:
 * - limit: max results (default 500, max 500)
 * - offset: pagination offset (default 0)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

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

    const cast = await getSeasonCastWithEpisodeCounts(showId, seasonNum, { limit, offset });

    return NextResponse.json({
      cast,
      pagination: {
        limit,
        offset,
        count: cast.length,
      },
    });
  } catch (error) {
    console.error("[api] Failed to get season cast", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
