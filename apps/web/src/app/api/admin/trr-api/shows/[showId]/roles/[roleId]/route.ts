import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { resolveAdminShowId } from "@/lib/server/admin/resolve-show-id";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";

export const dynamic = "force-dynamic";
const MUTATION_BACKEND_TIMEOUT_MS = 60_000;
const SHOW_ROLES_CACHE_NAMESPACE = "admin-show-roles";

interface RouteParams {
  params: Promise<{ showId: string; roleId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const { showId: rawShowId, roleId } = await params;
    const showId = await resolveAdminShowId(rawShowId);
    if (!showId) return NextResponse.json({ error: `Show not found for "${rawShowId}".` }, { status: 404 });
    const backendUrl = getBackendApiUrl(`/admin/shows/${showId}/roles/${roleId}`);
    if (!backendUrl) return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });

    const body = await request.json().catch(() => ({}));
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MUTATION_BACKEND_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(backendUrl, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return NextResponse.json(
          { error: `Update role request timed out after ${Math.round(MUTATION_BACKEND_TIMEOUT_MS / 1000)}s` },
          { status: 504 }
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: (data as { error?: string; detail?: string }).error || (data as { detail?: string }).detail || "Failed to update role" }, { status: response.status });
    }
    invalidateRouteResponseCache(SHOW_ROLES_CACHE_NAMESPACE, `${user.uid}:${showId}:`);

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
