import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getEpisodesBySeasonId } from "@/lib/server/trr-api/trr-shows-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ seasonId: string }>;
}

/**
 * GET /api/admin/trr-api/seasons/[seasonId]/episodes
 *
 * List episodes for a season from TRR Core API.
 * Ordered by episode_number ASC.
 *
 * Query params:
 * - limit: max results (default 20, max 100)
 * - offset: pagination offset (default 0)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { seasonId } = await params;

    if (!seasonId) {
      return NextResponse.json(
        { error: "seasonId is required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const episodes = await getEpisodesBySeasonId(seasonId, { limit, offset });

    return NextResponse.json({
      episodes,
      pagination: {
        limit,
        offset,
        count: episodes.length,
      },
    });
  } catch (error) {
    console.error("[api] Failed to get TRR episodes", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
