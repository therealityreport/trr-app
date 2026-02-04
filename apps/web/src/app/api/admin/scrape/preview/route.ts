import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

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
    const backendUrl = getBackendApiUrl("/admin/scrape/preview");
    if (!backendUrl) {
      console.error("[scrape/preview] TRR_API_URL not configured");
      return NextResponse.json(
        { error: "Backend API not configured" },
        { status: 500 }
      );
    }

    // Use Supabase service role key for backend auth (already verified admin via Firebase)
    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error("[scrape/preview] TRR_CORE_SUPABASE_SERVICE_ROLE_KEY not configured");
      return NextResponse.json(
        { error: "Backend auth not configured" },
        { status: 500 }
      );
    }

    // Forward request to backend
    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
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
