import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ photoId: string }>;
}

const fetchJsonWithTimeout = async (
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<{ response: Response; data: Record<string, unknown> }> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return { response, data };
  } finally {
    clearTimeout(timer);
  }
};

/**
 * POST /api/admin/trr-api/cast-photos/[photoId]/auto-count
 *
 * Proxy to TRR-Backend auto-count for cast photos.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { photoId } = await params;

    if (!photoId) {
      return NextResponse.json({ error: "photoId is required" }, { status: 400 });
    }

    const backendUrl = getBackendApiUrl(`/admin/cast-photos/${photoId}/auto-count`);
    if (!backendUrl) {
      return NextResponse.json(
        { error: "Backend API not configured" },
        { status: 500 }
      );
    }

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "Backend auth not configured" },
        { status: 500 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as { force?: unknown };
    const force = Boolean(body.force);
    const backendUrlWithForce = `${backendUrl}${backendUrl.includes("?") ? "&" : "?"}force=${force ? "true" : "false"}`;

    let backendResponse: Response;
    let data: Record<string, unknown> = {};
    try {
      const out = await fetchJsonWithTimeout(
        backendUrlWithForce,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          // Backend reads `force` from query param; still send a body for forward-compat.
          body: JSON.stringify({ force }),
        },
        60_000
      );
      backendResponse = out.response;
      data = out.data;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return NextResponse.json(
          {
            error: "Auto-count timed out",
            detail: "Timed out waiting for backend auto-count response (60s).",
          },
          { status: 504 }
        );
      }
      const baseDetail = error instanceof Error ? error.message : "unknown error";
      const causeDetail =
        error instanceof Error && error.cause
          ? `; cause=${String(error.cause)}`
          : "";
      return NextResponse.json(
        {
          error: "Backend fetch failed",
          detail: `${baseDetail}${causeDetail} (TRR_API_URL=${process.env.TRR_API_URL ?? "unset"})`,
        },
        { status: 502 }
      );
    }

    if (!backendResponse.ok) {
      const errorMessage =
        typeof data.error === "string" ? data.error : "Auto-count failed";
      const detail =
        typeof data.detail === "string" ? data.detail : undefined;
      return NextResponse.json(
        detail ? { error: errorMessage, detail } : { error: errorMessage },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to auto-count cast photo", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
