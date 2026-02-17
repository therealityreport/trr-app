import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getAssetsByShowSeason } from "@/lib/server/trr-api/trr-shows-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string; seasonNumber: string }>;
}

/**
 * GET /api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets
 *
 * Get all media assets (posters, stills, cast photos) for a show season.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { showId, seasonNumber } = await params;

    if (!showId || !seasonNumber) {
      return NextResponse.json(
        { error: "showId and seasonNumber are required" },
        { status: 400 }
      );
    }

    const seasonNum = parseInt(seasonNumber, 10);
    if (isNaN(seasonNum)) {
      return NextResponse.json(
        { error: "seasonNumber must be a valid number" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const parsedLimit = parseInt(searchParams.get("limit") ?? "200", 10);
    const parsedOffset = parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : 200;
    const offset = Number.isFinite(parsedOffset) ? parsedOffset : 0;
    const sources = (searchParams.get("sources") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const assets = await getAssetsByShowSeason(showId, seasonNum, {
      limit,
      offset,
      sources,
    });

    return NextResponse.json({
      assets,
      pagination: {
        limit,
        offset,
        count: assets.length,
      },
    });
  } catch (error) {
    console.error("[api] Failed to fetch season assets", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
