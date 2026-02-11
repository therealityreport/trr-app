import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showId } = await params;

    if (!showId) {
      return NextResponse.json({ error: "showId is required" }, { status: 400 });
    }

    const backendUrl = getBackendApiUrl(`/admin/shows/${showId}/import-bravo/commit`);
    if (!backendUrl) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const error =
        typeof data.error === "string"
          ? data.error
          : typeof data.detail === "string"
            ? data.detail
            : "Bravo commit failed";
      return NextResponse.json({ error }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to commit bravo import", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
