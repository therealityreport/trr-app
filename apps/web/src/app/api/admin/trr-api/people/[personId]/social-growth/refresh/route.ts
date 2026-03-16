import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes — Modal scrape can take a while

interface RouteParams {
  params: Promise<{ personId: string }>;
}

/**
 * POST /api/admin/trr-api/people/[personId]/social-growth/refresh
 *
 * Proxy to TRR-Backend which dispatches a SocialBlade scrape via Modal,
 * merges with existing data, and persists to Supabase.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { personId } = await params;
    if (!personId) {
      return NextResponse.json({ error: "personId is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const handle = (typeof body.handle === "string" ? body.handle : "").trim();
    const force = Boolean(body.force);
    if (!handle) {
      return NextResponse.json({ error: "handle is required in request body" }, { status: 400 });
    }

    const backendUrl = getBackendApiUrl(`/admin/people/${personId}/socialblade/refresh`);
    if (!backendUrl) {
      return NextResponse.json(
        { error: "Backend API not configured (TRR_API_URL)" },
        { status: 502 }
      );
    }

    const serviceRoleKey =
      process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Backend auth not configured" }, { status: 502 });
    }

    const upstream = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ handle, force }),
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
    console.error("[api] Failed to refresh social growth data", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
