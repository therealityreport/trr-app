import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { query as pgQuery } from "@/lib/server/postgres";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ seasonId: string }>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    if (!UUID_RE.test(seasonId)) {
      return NextResponse.json({ error: "seasonId must be a UUID" }, { status: 400 });
    }

    const seasonResult = await pgQuery<{
      id: string;
      show_id: string;
      season_number: number;
    }>(
      `SELECT id, show_id, season_number
       FROM core.seasons
       WHERE id = $1::uuid
       LIMIT 1`,
      [seasonId]
    );
    const season = seasonResult.rows[0] ?? null;
    if (!season) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }

    // Determine which TMDb show backdrops are already assigned to ANY season for this show.
    const assignedResult = await pgQuery<{ media_asset_id: string }>(
      `SELECT DISTINCT ml.media_asset_id
       FROM core.media_links AS ml
       JOIN core.seasons AS s
         ON s.id = ml.entity_id
       WHERE ml.entity_type = 'season'
         AND ml.kind = 'backdrop'
         AND s.show_id = $1::uuid`,
      [season.show_id]
    );
    const assigned = new Set(assignedResult.rows.map((row) => row.media_asset_id));

    // Load all show-level TMDb backdrops (including ones not mirrored yet).
    const showBackdrops = await pgQuery<{
      media_asset_id: string;
      context: Record<string, unknown> | null;
      source: string | null;
      source_url: string | null;
      hosted_url: string | null;
      width: number | null;
      height: number | null;
      caption: string | null;
      fetched_at: string | null;
      metadata: Record<string, unknown> | null;
    }>(
      `SELECT
         ml.media_asset_id,
         ml.context,
         ma.source,
         ma.source_url,
         ma.hosted_url,
         ma.width,
         ma.height,
         ma.caption,
         ma.fetched_at,
         ma.metadata
       FROM core.media_links AS ml
       JOIN core.media_assets AS ma
         ON ma.id = ml.media_asset_id
       WHERE ml.entity_type = 'show'
         AND ml.entity_id = $1::uuid
         AND ml.kind = 'backdrop'
         AND ma.source ILIKE 'tmdb'
       ORDER BY ma.created_at DESC NULLS LAST
       LIMIT 500`,
      [season.show_id]
    );

    const backdrops = showBackdrops.rows
      .map((row) => {
        if (assigned.has(row.media_asset_id)) return null;
        const displayUrl = row.hosted_url ?? row.source_url ?? null;
        if (!displayUrl) return null;
        const mergedMetadata =
          row.metadata && typeof row.metadata === "object"
            ? {
                ...(row.metadata as Record<string, unknown>),
                ...(row.context && typeof row.context === "object" ? row.context : {}),
              }
            : row.context && typeof row.context === "object"
              ? (row.context as Record<string, unknown>)
              : null;
        return {
          media_asset_id: row.media_asset_id,
          hosted_url: row.hosted_url ?? null,
          source_url: row.source_url ?? null,
          display_url: displayUrl,
          width: row.width ?? null,
          height: row.height ?? null,
          caption: row.caption ?? null,
          fetched_at: row.fetched_at ?? null,
          metadata: mergedMetadata,
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
