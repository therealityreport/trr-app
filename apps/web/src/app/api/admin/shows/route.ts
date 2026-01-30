import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  getAllShows,
  getActiveShows,
  createShow,
  getSeasonsByShowId,
} from "@/lib/server/shows/shows-repository";

export const dynamic = "force-dynamic";
/**
 * GET /api/admin/shows
 * List all shows, optionally with seasons
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";
    const includeSeasons = searchParams.get("includeSeasons") === "true";

    const shows = activeOnly ? await getActiveShows() : await getAllShows();

    if (includeSeasons) {
      const showsWithSeasons = await Promise.all(
        shows.map(async (show) => ({
          ...show,
          seasons: await getSeasonsByShowId(show.id),
        }))
      );
      return NextResponse.json({ shows: showsWithSeasons });
    }

    return NextResponse.json({ shows });
  } catch (error) {
    console.error("[api] Failed to fetch shows", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/admin/shows
 * Create a new show
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { key, title, shortTitle, network, status, logline, palette, iconUrl, wordmarkUrl, heroUrl, tags } = body;

    if (!key || !title) {
      return NextResponse.json({ error: "key and title are required" }, { status: 400 });
    }

    const show = await createShow({
      key,
      title,
      shortTitle,
      network,
      status,
      logline,
      palette,
      iconUrl,
      wordmarkUrl,
      heroUrl,
      tags,
    });

    return NextResponse.json({ show }, { status: 201 });
  } catch (error) {
    console.error("[api] Failed to create show", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
