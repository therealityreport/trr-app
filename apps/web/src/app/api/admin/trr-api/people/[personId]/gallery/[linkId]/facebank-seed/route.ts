import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ personId: string; linkId: string }>;
}

/**
 * PATCH /api/admin/trr-api/people/[personId]/gallery/[linkId]/facebank-seed
 *
 * Proxy to TRR-Backend facebank seed toggle endpoint.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { personId, linkId } = await params;

    if (!personId || !linkId) {
      return NextResponse.json(
        { error: "personId and linkId are required" },
        { status: 400 },
      );
    }

    const body = request.headers.get("content-type")?.includes("application/json")
      ? await request.json().catch(() => ({}))
      : {};
    const facebankSeed = (body as { facebank_seed?: unknown }).facebank_seed;
    if (typeof facebankSeed !== "boolean") {
      return NextResponse.json(
        { error: "facebank_seed must be a boolean" },
        { status: 400 },
      );
    }

    const backendUrl = getBackendApiUrl(
      `/admin/person/${personId}/gallery/${linkId}/facebank-seed`,
    );
    if (!backendUrl) {
      return NextResponse.json(
        { error: "Backend API not configured" },
        { status: 500 },
      );
    }

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "Backend auth not configured" },
        { status: 500 },
      );
    }

    const internalSecret = process.env.TRR_INTERNAL_ADMIN_SHARED_SECRET;
    if (!internalSecret) {
      return NextResponse.json(
        { error: "Internal backend auth secret not configured" },
        { status: 500 },
      );
    }

    let backendResponse: Response;
    let data: Record<string, unknown> = {};
    try {
      backendResponse = await fetch(backendUrl, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
          "X-TRR-Internal-Admin-Secret": internalSecret,
        },
        body: JSON.stringify({ facebank_seed: facebankSeed }),
      });
      data = (await backendResponse.json().catch(() => ({}))) as Record<string, unknown>;
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown error";
      return NextResponse.json(
        { error: "Backend fetch failed", detail },
        { status: 502 },
      );
    }

    if (!backendResponse.ok) {
      return NextResponse.json(
        {
          error:
            (typeof data.error === "string" && data.error) ||
            (typeof data.detail === "string" && data.detail) ||
            "Facebank seed update failed",
        },
        { status: backendResponse.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to toggle facebank seed", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
