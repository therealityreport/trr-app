import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ assetId: string }>;
}

/**
 * DELETE /api/admin/trr-api/media-assets/[assetId]
 *
 * Proxy to TRR-Backend delete endpoint for unified media_assets/media_links rows.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { assetId } = await params;

    if (!assetId) {
      return NextResponse.json({ error: "assetId is required" }, { status: 400 });
    }

    const backendUrl = getBackendApiUrl(`/admin/media-assets/${assetId}`);
    if (!backendUrl) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const url = new URL(backendUrl);
    for (const [key, value] of request.nextUrl.searchParams.entries()) {
      url.searchParams.set(key, value);
    }
    if (!url.searchParams.has("exclude")) {
      url.searchParams.set("exclude", "true");
    }

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });
    }

    const backendResponse = await fetch(url.toString(), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${serviceRoleKey}` },
    });

    const data = (await backendResponse.json().catch(() => ({}))) as Record<string, unknown>;

    if (!backendResponse.ok) {
      const errorMessage =
        typeof data.detail === "string"
          ? data.detail
          : typeof data.error === "string"
            ? data.error
            : "Delete failed";
      return NextResponse.json({ error: errorMessage }, { status: backendResponse.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to delete media asset", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
