import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getAssetsByShowId } from "@/lib/server/trr-api/trr-shows-repository";

export const dynamic = "force-dynamic";
const FULL_FETCH_LIMIT = 5000;

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
    const full =
      searchParams.get("full") === "1" ||
      searchParams.get("full")?.toLowerCase() === "true";
    const sources = (searchParams.get("sources") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const requestLimit = full ? FULL_FETCH_LIMIT + 1 : limit;
    const requestOffset = full ? 0 : offset;
    const rawAssets = await getAssetsByShowId(showId, {
      limit: requestLimit,
      offset: requestOffset,
      sources,
      full,
    });
    const truncated = full && rawAssets.length > FULL_FETCH_LIMIT;
    const assets = truncated ? rawAssets.slice(0, FULL_FETCH_LIMIT) : rawAssets;

    return NextResponse.json({
      assets,
      pagination: {
        limit: full ? FULL_FETCH_LIMIT : limit,
        offset: requestOffset,
        count: assets.length,
        truncated,
        full,
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
