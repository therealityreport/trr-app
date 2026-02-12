import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { createMediaLink, getAllLinksForAsset } from "@/lib/server/trr-api/media-links-repository";
import { query } from "@/lib/server/postgres";

/**
 * POST /api/admin/trr-api/media-links
 * Create a link between an existing media asset and an entity.
 *
 * Body:
 * - media_asset_id: string - The ID of the existing media asset
 * - entity_type: "person" | "season" | "show" | "episode"
 * - entity_id: string - The ID of the entity to link to
 * - kind?: string - The kind of link (default: "gallery")
 * - context?: object - Optional context metadata
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { media_asset_id, entity_type, entity_id, kind, context } = body;

    // Validate required fields
    if (!media_asset_id || typeof media_asset_id !== "string") {
      return NextResponse.json(
        { error: "media_asset_id is required" },
        { status: 400 }
      );
    }

    if (!entity_type || !["person", "season", "show", "episode"].includes(entity_type)) {
      return NextResponse.json(
        { error: "entity_type must be one of: person, season, show, episode" },
        { status: 400 }
      );
    }

    if (!entity_id || typeof entity_id !== "string") {
      return NextResponse.json(
        { error: "entity_id is required" },
        { status: 400 }
      );
    }

    // Verify media asset exists using direct SQL (avoids PostgREST drift issues).
    const assetResult = await query<{ id: string }>(
      `SELECT id
       FROM core.media_assets
       WHERE id = $1::uuid
       LIMIT 1`,
      [media_asset_id]
    );
    if (!assetResult.rows[0]) {
      return NextResponse.json(
        { error: "Media asset not found" },
        { status: 404 }
      );
    }

    // Create the link
    const result = await createMediaLink({
      media_asset_id,
      entity_type,
      entity_id,
      kind: kind || "gallery",
      context: context || {},
    });

    return NextResponse.json({
      link: result.link,
      already_exists: result.already_exists,
      message: result.already_exists
        ? "Link already exists"
        : "Link created successfully",
    });
  } catch (error) {
    console.error("[media-links] POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/trr-api/media-links?media_asset_id=xxx
 * Get all links for a specific media asset.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const mediaAssetId = searchParams.get("media_asset_id");

    if (!mediaAssetId) {
      return NextResponse.json(
        { error: "media_asset_id query parameter is required" },
        { status: 400 }
      );
    }

    const links = await getAllLinksForAsset(mediaAssetId);

    return NextResponse.json({ links });
  } catch (error) {
    console.error("[media-links] GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
