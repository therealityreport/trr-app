import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getSupabaseTrrCore } from "@/lib/server/supabase-trr-core";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ seasonId: string }>;
}

 /**
  * GET /api/admin/trr-api/seasons/[seasonId]/unassigned-backdrops
  *
  * Returns TMDb show backdrops that are not yet linked to ANY season for this show as kind=backdrop.
  */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { seasonId } = await params;

    if (!seasonId) {
      return NextResponse.json({ error: "seasonId is required" }, { status: 400 });
    }

    const supabase = getSupabaseTrrCore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: season, error: seasonError } = await (supabase as any)
      .from("seasons")
      .select("id, show_id, season_number")
      .eq("id", seasonId)
      .single();

    if (seasonError || !season) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: showLinks, error: showLinksError } = await (supabase as any)
      .from("media_links")
      .select(
        "media_asset_id, media_assets:media_assets (id, source, hosted_url, width, height, caption, fetched_at, metadata)"
      )
      .eq("entity_type", "show")
      .eq("entity_id", season.show_id)
      .eq("kind", "backdrop")
      .limit(500);

    if (showLinksError) {
      return NextResponse.json(
        { error: `Failed to load show backdrops: ${showLinksError.message}` },
        { status: 500 }
      );
    }

    // Determine which TMDb backdrops are already assigned to ANY season for this show.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: showSeasons, error: showSeasonsError } = await (supabase as any)
      .from("seasons")
      .select("id")
      .eq("show_id", season.show_id)
      .limit(200);

    if (showSeasonsError) {
      return NextResponse.json(
        { error: `Failed to load show seasons: ${showSeasonsError.message}` },
        { status: 500 }
      );
    }

    const showSeasonIds =
      (showSeasons as Array<{ id: string }> | null | undefined)?.map((row) => row.id) ??
      [];

    let assigned = new Set<string>();
    if (showSeasonIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: seasonBackdropLinks, error: seasonBackdropLinksError } = await (supabase as any)
        .from("media_links")
        .select("media_asset_id")
        .eq("entity_type", "season")
        .eq("kind", "backdrop")
        .in("entity_id", showSeasonIds)
        .limit(1000);

      if (seasonBackdropLinksError) {
        return NextResponse.json(
          { error: `Failed to load season backdrops: ${seasonBackdropLinksError.message}` },
          { status: 500 }
        );
      }

      assigned = new Set(
        (seasonBackdropLinks as Array<{ media_asset_id: string }> | null | undefined)?.map(
          (row) => row.media_asset_id
        ) ?? []
      );
    }

    const candidates =
      (showLinks as Array<{
        media_asset_id: string;
        media_assets?: {
          id: string;
          source: string;
          hosted_url: string | null;
          width: number | null;
          height: number | null;
          caption: string | null;
          fetched_at?: string | null;
          metadata?: Record<string, unknown> | null;
        } | null;
      }> | null | undefined) ?? [];

    const backdrops = candidates
      .map((row) => {
        const asset = row.media_assets ?? null;
        if (!asset?.hosted_url) return null;
        if ((asset.source ?? "").toLowerCase() !== "tmdb") return null;
        if (assigned.has(row.media_asset_id)) return null;
        return {
          media_asset_id: row.media_asset_id,
          hosted_url: asset.hosted_url,
          width: asset.width ?? null,
          height: asset.height ?? null,
          caption: asset.caption ?? null,
          fetched_at: asset.fetched_at ?? null,
          metadata: asset.metadata ?? null,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      season: { id: seasonId, show_id: season.show_id, season_number: season.season_number },
      backdrops,
    });
  } catch (error) {
    console.error("[api] Failed to load unassigned backdrops", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
