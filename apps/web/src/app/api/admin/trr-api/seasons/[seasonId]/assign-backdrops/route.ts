import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getSupabaseTrrCore } from "@/lib/server/supabase-trr-core";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ seasonId: string }>;
}

/**
 * POST /api/admin/trr-api/seasons/[seasonId]/assign-backdrops
 *
 * Body: { media_asset_ids: string[] }
 *
 * Creates kind=backdrop media_links from the season to each media_asset_id.
 * Idempotent: skips links that already exist.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { seasonId } = await params;

    if (!seasonId) {
      return NextResponse.json({ error: "seasonId is required" }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      media_asset_ids?: unknown;
    };
    const mediaAssetIds = Array.isArray(body.media_asset_ids)
      ? (body.media_asset_ids.filter((id) => typeof id === "string") as string[])
      : [];

    if (mediaAssetIds.length === 0) {
      return NextResponse.json(
        { error: "media_asset_ids must be a non-empty string array" },
        { status: 400 }
      );
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
    const { data: existing, error: existingError } = await (supabase as any)
      .from("media_links")
      .select("media_asset_id")
      .eq("entity_type", "season")
      .eq("entity_id", seasonId)
      .eq("kind", "backdrop")
      .in("media_asset_id", mediaAssetIds)
      .limit(500);

    if (existingError) {
      return NextResponse.json(
        { error: `Failed to check existing links: ${existingError.message}` },
        { status: 500 }
      );
    }

    const already = new Set(
      (existing as Array<{ media_asset_id: string }> | null | undefined)?.map(
        (row) => row.media_asset_id
      ) ?? []
    );
    const toInsert = mediaAssetIds.filter((id) => !already.has(id));

    if (toInsert.length === 0) {
      return NextResponse.json({ assigned: 0, skipped: mediaAssetIds.length });
    }

    const now = new Date().toISOString();
    const rows = toInsert.map((media_asset_id) => ({
      entity_type: "season",
      entity_id: seasonId,
      media_asset_id,
      kind: "backdrop",
      position: null,
      is_primary: false,
      context: {
        show_id: season.show_id,
        season_number: season.season_number,
        assigned_from: "show_backdrops",
      },
      created_at: now,
      updated_at: now,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any)
      .from("media_links")
      .insert(rows);

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to insert links: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ assigned: toInsert.length, skipped: already.size });
  } catch (error) {
    console.error("[api] Failed to assign backdrops", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
