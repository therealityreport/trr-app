import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string; roleId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showId, roleId } = await params;
    const backendUrl = getBackendApiUrl(`/admin/shows/${showId}/roles/${roleId}`);
    if (!backendUrl) return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });

    const body = await request.json().catch(() => ({}));
    const response = await fetch(backendUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: (data as { error?: string; detail?: string }).error || (data as { detail?: string }).detail || "Failed to update role" }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
