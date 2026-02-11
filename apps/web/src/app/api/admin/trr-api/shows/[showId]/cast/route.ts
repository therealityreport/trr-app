import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getCoverPhotos } from "@/lib/server/admin/person-cover-photos-repository";
import {
  getShowArchiveFootageCast,
  getShowCastWithStats,
} from "@/lib/server/trr-api/trr-shows-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string }>;
}

/**
 * GET /api/admin/trr-api/shows/[showId]/cast
 *
 * List cast members for a show from TRR Core API.
 * Ordered by billing_order ASC.
 * Includes photo URLs when available.
 *
 * Query params:
 * - limit: max results (default 20, max 500)
 * - offset: pagination offset (default 0)
 * - minEpisodes: filter to cast with at least N total episodes
 * - requireImage: filter to cast with at least 1 image URL
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);
    const minEpisodes = searchParams.get("minEpisodes");
    const requireImage = searchParams.get("requireImage");

    const parsedMinEpisodes = minEpisodes ? parseInt(minEpisodes, 10) : 1;
    const minEpisodesValue =
      Number.isFinite(parsedMinEpisodes) && parsedMinEpisodes >= 0 ? parsedMinEpisodes : 1;

    const [cast, archiveCast] = await Promise.all([
      getShowCastWithStats(showId, { limit, offset }),
      getShowArchiveFootageCast(showId, { limit, offset }),
    ]);

    let filteredCast = cast;
    if (Number.isFinite(minEpisodesValue)) {
      filteredCast = filteredCast.filter(
        (member) => (member.total_episodes ?? 0) >= minEpisodesValue
      );
    }
    if (requireImage === "true" || requireImage === "1") {
      filteredCast = filteredCast.filter((member) => Boolean(member.photo_url));
    }

    let castWithCover = filteredCast;
    let archiveCastWithCover = archiveCast;

    if (filteredCast.length > 0 || archiveCast.length > 0) {
      const personIds = [
        ...new Set([...filteredCast, ...archiveCast].map((member) => member.person_id)),
      ];
      try {
        const coverPhotos = await getCoverPhotos(personIds);
        castWithCover = filteredCast.map((member) => ({
          ...member,
          cover_photo_url: coverPhotos.get(member.person_id)?.photo_url ?? null,
        }));
        archiveCastWithCover = archiveCast.map((member) => ({
          ...member,
          cover_photo_url: coverPhotos.get(member.person_id)?.photo_url ?? null,
        }));
      } catch (error) {
        console.error("[api] Failed to load cover photos for cast", error);
        castWithCover = filteredCast.map((member) => ({
          ...member,
          cover_photo_url: null,
        }));
        archiveCastWithCover = archiveCast.map((member) => ({
          ...member,
          cover_photo_url: null,
        }));
      }
    }

    if (requireImage === "true" || requireImage === "1") {
      archiveCastWithCover = archiveCastWithCover.filter((member) => Boolean(member.photo_url));
    }

    return NextResponse.json({
      cast: castWithCover,
      archive_footage_cast: archiveCastWithCover,
      pagination: {
        limit,
        offset,
        count: castWithCover.length,
      },
    });
  } catch (error) {
    console.error("[api] Failed to get TRR cast", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
