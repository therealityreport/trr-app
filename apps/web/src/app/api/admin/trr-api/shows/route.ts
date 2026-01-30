import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { searchShows } from "@/lib/server/trr-api/trr-shows-repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/trr-api/shows
 *
 * Search shows in TRR Core API.
 *
 * Query params:
 * - q: search query (required)
 * - limit: max results (default 20, max 100)
 * - offset: pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    if (!query.trim()) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    const shows = await searchShows(query, { limit, offset });

    return NextResponse.json({
      shows,
      pagination: {
        limit,
        offset,
        count: shows.length,
      },
    });
  } catch (error) {
    console.error("[api] Failed to search TRR shows", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
