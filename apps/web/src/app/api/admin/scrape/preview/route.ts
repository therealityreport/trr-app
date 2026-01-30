import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/scrape/preview
 *
 * Proxies scrape preview request to TRR-Backend.
 * Scrapes a URL and returns image candidates for preview.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { url, min_width = 200, limit = 50 } = body;

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Get TRR-Backend URL from environment
    const backendUrl = process.env.TRR_API_URL;
    if (!backendUrl) {
      console.error("[scrape/preview] TRR_API_URL not configured");
      return NextResponse.json(
        { error: "Backend API not configured" },
        { status: 500 }
      );
    }

    // Forward request to backend
    const backendResponse = await fetch(`${backendUrl}/api/v1/admin/scrape/preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward the auth header
        Authorization: request.headers.get("Authorization") || "",
      },
      body: JSON.stringify({ url, min_width, limit }),
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: data.detail || data.error || "Preview failed" },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to preview scrape", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
