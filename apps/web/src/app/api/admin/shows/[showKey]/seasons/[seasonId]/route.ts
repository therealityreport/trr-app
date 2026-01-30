import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  getShowByKey,
  getSeasonById,
  updateSeasonById,
  deleteSeason,
  setCurrentSeason,
} from "@/lib/server/shows/shows-repository";

export const dynamic = "force-dynamic";
interface RouteParams {
  params: Promise<{ showKey: string; seasonId: string }>;
}

/**
 * GET /api/admin/shows/[showKey]/seasons/[seasonId]
 * Get a single season
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showKey, seasonId } = await params;

    const show = await getShowByKey(showKey);
    if (!show) {
      return NextResponse.json({ error: "Show not found" }, { status: 404 });
    }

    const season = await getSeasonById(seasonId);
    if (!season) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }

    if (season.show_id !== show.id) {
      return NextResponse.json({ error: "Season does not belong to this show" }, { status: 400 });
    }

    return NextResponse.json({ season });
  } catch (error) {
    console.error("[api] Failed to fetch season", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PUT /api/admin/shows/[showKey]/seasons/[seasonId]
 * Update a season
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showKey, seasonId } = await params;

    const show = await getShowByKey(showKey);
    if (!show) {
      return NextResponse.json({ error: "Show not found" }, { status: 404 });
    }

    const existing = await getSeasonById(seasonId);
    if (!existing) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }

    if (existing.show_id !== show.id) {
      return NextResponse.json({ error: "Season does not belong to this show" }, { status: 400 });
    }

    const body = await request.json();
    const {
      label,
      year,
      description,
      colors,
      showIconUrl,
      wordmarkUrl,
      heroUrl,
      castMembers,
      notes,
      isActive,
      isCurrent,
    } = body;

    // If setting as current, use special function
    if (isCurrent === true && !existing.is_current) {
      const season = await setCurrentSeason(show.id, seasonId);
      return NextResponse.json({ season });
    }

    const season = await updateSeasonById(seasonId, {
      label,
      year,
      description,
      colors,
      showIconUrl,
      wordmarkUrl,
      heroUrl,
      castMembers,
      notes,
      isActive,
      isCurrent,
    });

    return NextResponse.json({ season });
  } catch (error) {
    console.error("[api] Failed to update season", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/admin/shows/[showKey]/seasons/[seasonId]
 * Delete a season
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showKey, seasonId } = await params;

    const show = await getShowByKey(showKey);
    if (!show) {
      return NextResponse.json({ error: "Show not found" }, { status: 404 });
    }

    const existing = await getSeasonById(seasonId);
    if (!existing) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }

    if (existing.show_id !== show.id) {
      return NextResponse.json({ error: "Season does not belong to this show" }, { status: 400 });
    }

    const deleted = await deleteSeason(seasonId);
    if (!deleted) {
      return NextResponse.json({ error: "Failed to delete season" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api] Failed to delete season", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
