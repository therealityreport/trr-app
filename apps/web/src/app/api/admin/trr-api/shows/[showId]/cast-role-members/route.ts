import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";
const BACKEND_TIMEOUT_MS = 20_000;

interface RouteParams {
  params: Promise<{ showId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showId } = await params;
    const backendUrl = getBackendApiUrl(`/admin/shows/${showId}/cast-role-members`);
    if (!backendUrl) return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const url = new URL(backendUrl);
    searchParams.forEach((value, key) => url.searchParams.set(key, value));

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: "GET",
        headers: { Authorization: `Bearer ${serviceRoleKey}` },
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return NextResponse.json(
          {
            error: `Cast role members request timed out after ${Math.round(BACKEND_TIMEOUT_MS / 1000)}s`,
          },
          { status: 504 }
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: (data as { error?: string; detail?: string }).error || (data as { detail?: string }).detail || "Failed to list cast role members" }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
