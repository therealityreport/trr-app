import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";

export const dynamic = "force-dynamic";
const SHOW_ROLES_CACHE_NAMESPACE = "admin-show-roles";
const CAST_ROLE_MEMBERS_CACHE_NAMESPACE = "admin-show-cast-role-members";

interface RouteParams {
  params: Promise<{ showId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  let backendUrl: string | null = null;
  try {
    const user = await requireAdmin(request);
    const { showId } = await params;

    if (!showId) {
      return NextResponse.json({ error: "showId is required" }, { status: 400 });
    }

    backendUrl = getBackendApiUrl(`/admin/shows/${showId}/cast-matrix/sync`);
    if (!backendUrl) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 180_000);
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(body),
      signal: abortController.signal,
    }).finally(() => clearTimeout(timeout));

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const error =
        typeof data.error === "string"
          ? data.error
          : typeof data.detail === "string"
            ? data.detail
            : "Cast matrix sync failed";
      return NextResponse.json({ error }, { status: response.status });
    }
    invalidateRouteResponseCache(SHOW_ROLES_CACHE_NAMESPACE, `${user.uid}:${showId}:`);
    invalidateRouteResponseCache(CAST_ROLE_MEMBERS_CACHE_NAMESPACE, `${user.uid}:${showId}:`);

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to sync cast matrix", error);
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Cast matrix sync timed out while waiting for TRR-Backend." },
        { status: 504 }
      );
    }
    if (error instanceof TypeError && error.message.toLowerCase().includes("fetch failed")) {
      const target = backendUrl ?? "configured TRR_API_URL";
      return NextResponse.json(
        {
          error: `Could not reach TRR-Backend (${target}). Confirm TRR-Backend is running and TRR_API_URL is correct.`,
        },
        { status: 502 }
      );
    }
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
