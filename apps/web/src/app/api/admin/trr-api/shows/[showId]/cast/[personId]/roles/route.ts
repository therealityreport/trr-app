import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";

export const dynamic = "force-dynamic";
const CAST_ROLE_MEMBERS_CACHE_NAMESPACE = "admin-show-cast-role-members";

interface RouteParams {
  params: Promise<{ showId: string; personId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const { showId, personId } = await params;
    const backendUrl = getBackendApiUrl(`/admin/shows/${showId}/cast/${personId}/roles`);
    if (!backendUrl) return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });

    const body = await request.json().catch(() => ({}));
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: (data as { error?: string; detail?: string }).error || (data as { detail?: string }).detail || "Failed to assign roles" }, { status: response.status });
    }
    invalidateRouteResponseCache(CAST_ROLE_MEMBERS_CACHE_NAMESPACE, `${user.uid}:${showId}:`);

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
