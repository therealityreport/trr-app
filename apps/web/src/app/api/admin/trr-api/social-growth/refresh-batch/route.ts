import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface BatchRefreshItem {
  personId: string;
  handle: string;
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json().catch(() => ({}));
    const items = Array.isArray(body.items) ? (body.items as BatchRefreshItem[]) : [];
    const source = typeof body.source === "string" ? body.source.trim() : "";
    const force = Boolean(body.force);

    if (items.length === 0) {
      return NextResponse.json({ error: "items are required" }, { status: 400 });
    }
    if (source !== "cast_comparison" && source !== "season_run") {
      return NextResponse.json({ error: "source must be cast_comparison or season_run" }, { status: 400 });
    }

    const backendUrl = getBackendApiUrl("/admin/people/socialblade/refresh-batch");
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
      body: JSON.stringify({ items, source, force }),
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
    console.error("[api] Failed to refresh SocialBlade batch", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
