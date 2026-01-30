import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getShowByKey, getSeasonsByShowKey, createSeason } from "@/lib/server/shows/shows-repository";

export const dynamic = "force-dynamic";
interface RouteParams {
  params: Promise<{ showKey: string }>;
}

/**
 * GET /api/admin/shows/[showKey]/seasons
 * List all seasons for a show
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showKey } = await params;

    const show = await getShowByKey(showKey);
    if (!show) {
      return NextResponse.json({ error: "Show not found" }, { status: 404 });
    }

    const seasons = await getSeasonsByShowKey(showKey);
    return NextResponse.json({ seasons });
  } catch (error) {
    console.error("[api] Failed to fetch seasons", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/admin/shows/[showKey]/seasons
 * Create a new season for a show
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showKey } = await params;

    const show = await getShowByKey(showKey);
    if (!show) {
      return NextResponse.json({ error: "Show not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      seasonNumber,
      label,
      year,
      description,
      colors,
      showIconUrl,
      wordmarkUrl,
      heroUrl,
      castMembers,
      notes,
    } = body;

    if (!seasonNumber || !label) {
      return NextResponse.json({ error: "seasonNumber and label are required" }, { status: 400 });
    }

    const season = await createSeason({
      showId: show.id,
      seasonNumber,
      label,
      year,
      description,
      colors,
      showIconUrl,
      wordmarkUrl,
      heroUrl,
      castMembers,
      notes,
    });

    return NextResponse.json({ season }, { status: 201 });
  } catch (error) {
    console.error("[api] Failed to create season", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
