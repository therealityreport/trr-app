import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ personId: string }>;
}

/**
 * GET /api/admin/trr-api/people/[personId]/fandom
 *
 * Get Fandom/Wikia biographical data for a person.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { personId } = await params;
    const showId = request.nextUrl.searchParams.get("showId")?.trim() ?? "";

    if (!personId) {
      return NextResponse.json(
        { error: "personId is required" },
        { status: 400 }
      );
    }

    const backendUrl = getBackendApiUrl(`/admin/person/${personId}/fandom`);
    if (!backendUrl) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const dedicatedToken = process.env.TRR_BACKEND_SERVICE_TOKEN?.trim() || null;
    const serviceRoleToken =
      process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
    const backendToken =
      dedicatedToken ??
      (process.env.NODE_ENV === "production" ? null : serviceRoleToken);
    if (!backendToken) {
      return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });
    }

    const backendRequestUrl = new URL(backendUrl);
    if (showId) {
      backendRequestUrl.searchParams.set("showId", showId);
    }

    const response = await fetch(backendRequestUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${backendToken}`,
      },
      cache: "no-store",
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const error =
        typeof data.error === "string"
          ? data.error
          : typeof data.detail === "string"
            ? data.detail
            : "Fandom fetch failed";
      return NextResponse.json({ error }, { status: response.status });
    }

    return NextResponse.json({
      fandomData: Array.isArray(data.fandomData) ? data.fandomData : [],
      count: typeof data.count === "number" ? data.count : 0,
    });
  } catch (error) {
    console.error("[api] Failed to get TRR person fandom data", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
