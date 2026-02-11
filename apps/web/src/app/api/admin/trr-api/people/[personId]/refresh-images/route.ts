import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ personId: string }>;
}

/**
 * POST /api/admin/trr-api/people/[personId]/refresh-images
 *
 * Proxies refresh images request to TRR-Backend for a person.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { personId } = await params;

    if (!personId) {
      return NextResponse.json(
        { error: "personId is required" },
        { status: 400 }
      );
    }

    // Parse JSON body if provided (optional)
    let body: Record<string, unknown> | undefined;
    if (request.headers.get("content-type")?.includes("application/json")) {
      try {
        body = await request.json();
      } catch {
        body = undefined;
      }
    }

    const backendUrl = getBackendApiUrl(`/admin/person/${personId}/refresh-images`);
    const rawBackendUrl = process.env.TRR_API_URL ?? "unset";
    if (!backendUrl) {
      console.error("[person/refresh-images] TRR_API_URL not configured");
      return NextResponse.json(
        { error: "Backend API not configured" },
        { status: 500 }
      );
    }

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error(
        "[person/refresh-images] TRR_CORE_SUPABASE_SERVICE_ROLE_KEY not configured"
      );
      return NextResponse.json(
        { error: "Backend auth not configured" },
        { status: 500 }
      );
    }

    let backendResponse: Response;
    let data: Record<string, unknown> = {};
    try {
      backendResponse = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify(body ?? {}),
        signal: AbortSignal.timeout(5 * 60 * 1000), // 5 min
      });
      data = (await backendResponse.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
    } catch (error) {
      console.error("[person/refresh-images] Backend fetch failed", {
        backendUrl,
        error,
      });
      const detail = error instanceof Error ? error.message : "unknown error";
      return NextResponse.json(
        { error: "Backend fetch failed", detail: `${detail} (TRR_API_URL=${rawBackendUrl})` },
        { status: 502 }
      );
    }

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: data.detail || data.error || "Refresh failed" },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to refresh person images", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
