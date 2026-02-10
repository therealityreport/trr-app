import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import { getSeasonsByShowId, getShowByTrrShowId } from "@/lib/server/shows/shows-repository";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/admin/shows/by-trr-show/[trrShowId]
 * Returns the survey_shows record linked to a TRR show ID.
 *
 * Query params:
 * - includeSeasons=true -> include linked survey_show_seasons rows
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trrShowId: string }> },
) {
  try {
    await requireAdmin(request);
    const { trrShowId } = await params;

    if (!UUID_RE.test(trrShowId)) {
      return NextResponse.json({ error: "Invalid trrShowId" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const includeSeasons = searchParams.get("includeSeasons") === "true";

    const show = await getShowByTrrShowId(trrShowId);
    if (!show) {
      return NextResponse.json({ show: null });
    }

    if (includeSeasons) {
      const seasons = await getSeasonsByShowId(show.id);
      return NextResponse.json({ show, seasons });
    }

    return NextResponse.json({ show });
  } catch (error) {
    console.error("[api] Failed to fetch show by trr_show_id", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

