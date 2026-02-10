import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  getShowByKey,
  updateShowByKey,
  deleteShow,
  getSeasonsByShowKey,
} from "@/lib/server/shows/shows-repository";

export const dynamic = "force-dynamic";
interface RouteParams {
  params: Promise<{ showKey: string }>;
}

/**
 * GET /api/admin/shows/[showKey]
 * Get a single show with optional seasons
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showKey } = await params;

    const { searchParams } = new URL(request.url);
    const includeSeasons = searchParams.get("includeSeasons") === "true";

    const show = await getShowByKey(showKey);
    if (!show) {
      return NextResponse.json({ error: "Show not found" }, { status: 404 });
    }

    if (includeSeasons) {
      const seasons = await getSeasonsByShowKey(showKey);
      return NextResponse.json({ show, seasons });
    }

    return NextResponse.json({ show });
  } catch (error) {
    console.error("[api] Failed to fetch show", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PUT /api/admin/shows/[showKey]
 * Update a show
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showKey } = await params;

    const body = await request.json();
    const {
      title,
      trrShowId,
      shortTitle,
      network,
      status,
      logline,
      palette,
      fonts,
      iconUrl,
      wordmarkUrl,
      heroUrl,
      tags,
      isActive,
    } = body;

    const show = await updateShowByKey(showKey, {
      title,
      trrShowId,
      shortTitle,
      network,
      status,
      logline,
      palette,
      fonts,
      iconUrl,
      wordmarkUrl,
      heroUrl,
      tags,
      isActive,
    });

    if (!show) {
      return NextResponse.json({ error: "Show not found" }, { status: 404 });
    }

    return NextResponse.json({ show });
  } catch (error) {
    console.error("[api] Failed to update show", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/admin/shows/[showKey]
 * Delete a show
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showKey } = await params;

    const deleted = await deleteShow(showKey);
    if (!deleted) {
      return NextResponse.json({ error: "Show not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api] Failed to delete show", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
