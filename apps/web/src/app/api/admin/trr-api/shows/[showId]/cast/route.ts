import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getCoverPhotos } from "@/lib/server/admin/person-cover-photos-repository";
import { getCastByShowId } from "@/lib/server/trr-api/trr-shows-repository";

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
 * - limit: max results (default 20, max 100)
 * - offset: pagination offset (default 0)
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

    const cast = await getCastByShowId(showId, { limit, offset });
    let castWithCover = cast;

    if (cast.length > 0) {
      const personIds = [...new Set(cast.map((member) => member.person_id))];
      try {
        const coverPhotos = await getCoverPhotos(personIds);
        castWithCover = cast.map((member) => ({
          ...member,
          cover_photo_url: coverPhotos.get(member.person_id)?.photo_url ?? null,
        }));
      } catch (error) {
        console.error("[api] Failed to load cover photos for cast", error);
        castWithCover = cast.map((member) => ({
          ...member,
          cover_photo_url: null,
        }));
      }
    }

    return NextResponse.json({
      cast: castWithCover,
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
