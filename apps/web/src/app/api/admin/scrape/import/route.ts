import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/scrape/import
 *
 * Proxies scrape import request to TRR-Backend.
 * Imports selected images to S3 and database.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { show_id, season_number, source_url, images } = body;

    // Validate required fields
    if (!show_id) {
      return NextResponse.json(
        { error: "show_id is required" },
        { status: 400 }
      );
    }
    if (season_number === undefined || season_number === null) {
      return NextResponse.json(
        { error: "season_number is required" },
        { status: 400 }
      );
    }
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

    // Get TRR-Backend URL from environment
    const backendUrl = process.env.TRR_API_URL;
    if (!backendUrl) {
      console.error("[scrape/import] TRR_API_URL not configured");
      return NextResponse.json(
        { error: "Backend API not configured" },
        { status: 500 }
      );
    }

    // Forward request to backend
    const backendResponse = await fetch(`${backendUrl}/api/v1/admin/scrape/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward the auth header
        Authorization: request.headers.get("Authorization") || "",
      },
      body: JSON.stringify({ show_id, season_number, source_url, images }),
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
