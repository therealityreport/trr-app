import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { buildInternalAdminHeaders } from "@/lib/server/trr-api/internal-admin-auth";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ personId: string }>;
}

/**
 * GET /api/admin/trr-api/people/[personId]/social-growth
 *
 * Proxy to TRR-Backend to retrieve SocialBlade growth data from Supabase.
 * Requires `handle` query param (Instagram username).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { personId } = await params;
    if (!personId) {
      return NextResponse.json({ error: "personId is required" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const handle = searchParams.get("handle")?.trim();

    if (!handle) {
      return NextResponse.json(
        { error: "handle query parameter is required (Instagram username)" },
        { status: 400 }
      );
    }

    const backendUrl = getBackendApiUrl(
      `/admin/people/${personId}/socialblade?handle=${encodeURIComponent(handle)}`
    );
    if (!backendUrl) {
      return NextResponse.json(
        { error: "Backend API not configured (TRR_API_URL)" },
        { status: 502 }
      );
    }

    let headers: Headers;
    try {
      headers = buildInternalAdminHeaders();
    } catch {
      return NextResponse.json(
        { error: "Backend auth not configured" },
        { status: 502 }
      );
    }

    const upstream = await fetch(backendUrl, {
      headers,
    });

    const data = await upstream.json().catch(() => ({ error: "Invalid response from backend" }));

    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.detail || data.error || `Backend returned ${upstream.status}` },
        { status: upstream.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to get social growth data", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
