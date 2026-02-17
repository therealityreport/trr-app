import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getAssetsByShowId } from "@/lib/server/trr-api/trr-shows-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string }>;
}

/**
 * GET /api/admin/trr-api/shows/[showId]/assets
 *
 * Get show-level media assets (posters, backdrops, logos) for a show.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(_request);

    const { showId } = await params;
    if (!showId) {
      return NextResponse.json({ error: "showId is required" }, { status: 400 });
    }

    const { searchParams } = new URL(_request.url);
    const parsedLimit = parseInt(searchParams.get("limit") ?? "200", 10);
    const parsedOffset = parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : 200;
    const offset = Number.isFinite(parsedOffset) ? parsedOffset : 0;
    const sources = (searchParams.get("sources") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const assets = await getAssetsByShowId(showId, { limit, offset, sources });
    return NextResponse.json({
      assets,
      pagination: {
        limit,
        offset,
        count: assets.length,
      },
    });
  } catch (error) {
    console.error("[api] Failed to fetch show assets", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
