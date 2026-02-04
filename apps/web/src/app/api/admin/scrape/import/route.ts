import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/scrape/import
 *
 * Proxies scrape import request to TRR-Backend.
 * Imports selected images to S3 and database.
 *
 * Supports two entity types:
 * - season: requires show_id, season_number
 * - person: requires person_id
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { entity_type, source_url, images } = body;

    // Determine entity type (default to "season" for backward compatibility)
    const effectiveEntityType = entity_type ?? "season";

    // Validate common fields
    if (!source_url) {
      return NextResponse.json(
        { error: "source_url is required" },
        { status: 400 }
      );
    }
    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "At least one image is required" },
        { status: 400 }
      );
    }

    // Validate entity-specific fields
    if (effectiveEntityType === "season") {
      if (!body.show_id) {
        return NextResponse.json(
          { error: "show_id is required for season entity type" },
          { status: 400 }
        );
      }
      if (body.season_number === undefined || body.season_number === null) {
        return NextResponse.json(
          { error: "season_number is required for season entity type" },
          { status: 400 }
        );
      }
    } else if (effectiveEntityType === "person") {
      if (!body.person_id) {
        return NextResponse.json(
          { error: "person_id is required for person entity type" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "entity_type must be 'season' or 'person'" },
        { status: 400 }
      );
    }

    // Get TRR-Backend URL from environment
    const backendUrl = getBackendApiUrl("/admin/scrape/import");
    if (!backendUrl) {
      console.error("[scrape/import] TRR_API_URL not configured");
      return NextResponse.json(
        { error: "Backend API not configured" },
        { status: 500 }
      );
    }

    // Use Supabase service role key for backend auth (already verified admin via Firebase)
    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error("[scrape/import] TRR_CORE_SUPABASE_SERVICE_ROLE_KEY not configured");
      return NextResponse.json(
        { error: "Backend auth not configured" },
        { status: 500 }
      );
    }

    // Forward entire body to backend (it handles validation and entity-specific logic)
    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: data.detail || data.error || "Import failed" },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to import images", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
