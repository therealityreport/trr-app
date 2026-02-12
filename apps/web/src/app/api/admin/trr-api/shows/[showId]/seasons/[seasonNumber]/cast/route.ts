import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  type SeasonCastEpisodeCount,
  getCastByShowId,
  getSeasonCastWithEpisodeCounts,
} from "@/lib/server/trr-api/trr-shows-repository";

export const dynamic = "force-dynamic";

const SEASON_FALLBACK_WARNING =
  "Season episode evidence is missing or stale. Showing approximate show-level cast until cast/credits sync succeeds.";

type SeasonCastSource = "season_evidence" | "show_fallback";

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
 * - include_archive_only: when true, include archive-footage-only cast rows
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
    const includeArchiveOnly =
      (searchParams.get("include_archive_only") ?? "").toLowerCase() === "true";

    let cast: SeasonCastEpisodeCount[] = await getSeasonCastWithEpisodeCounts(showId, seasonNum, {
      limit,
      offset,
      includeArchiveOnly,
    });
    let castSource: SeasonCastSource = "season_evidence";
    let eligibilityWarning: string | null = null;

    if (!includeArchiveOnly && cast.length === 0) {
      const fallbackCast = await getCastByShowId(showId, { limit, offset });
      if (fallbackCast.length > 0) {
        cast = fallbackCast.map((member) => ({
          person_id: member.person_id,
          person_name: member.full_name ?? member.cast_member_name ?? null,
          episodes_in_season: 0,
          total_episodes: member.total_episodes ?? null,
          photo_url: member.photo_url,
          thumbnail_focus_x: member.thumbnail_focus_x ?? null,
          thumbnail_focus_y: member.thumbnail_focus_y ?? null,
          thumbnail_zoom: member.thumbnail_zoom ?? null,
          thumbnail_crop_mode: member.thumbnail_crop_mode ?? null,
          archive_episodes_in_season: 0,
        }));
        castSource = "show_fallback";
        eligibilityWarning = SEASON_FALLBACK_WARNING;
      }
    }

    return NextResponse.json({
      cast,
      cast_source: castSource,
      eligibility_warning: eligibilityWarning,
      pagination: {
        limit,
        offset,
        count: cast.length,
      },
      include_archive_only: includeArchiveOnly,
    });
  } catch (error) {
    console.error("[api] Failed to get season cast", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
