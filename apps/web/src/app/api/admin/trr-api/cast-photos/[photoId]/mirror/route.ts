import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { IMAGE_PIPELINE_TIMEOUTS } from "@/lib/admin/image-pipeline-timeouts";

export const dynamic = "force-dynamic";
const MIRROR_TIMEOUT_MS = IMAGE_PIPELINE_TIMEOUTS.mirrorMs;

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
 * POST /api/admin/trr-api/cast-photos/[photoId]/mirror
 *
 * Proxy to TRR-Backend mirror endpoint for cast photos.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { photoId } = await params;

    if (!photoId) {
      return NextResponse.json({ error: "photoId is required" }, { status: 400 });
    }

    const backendUrl = getBackendApiUrl(`/admin/cast-photos/${photoId}/mirror`);
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

    const body =
      request.headers.get("content-type")?.includes("application/json")
        ? await request.json().catch(() => ({}))
        : {};

    let backendResponse: Response;
    let data: Record<string, unknown> = {};
    try {
      const out = await fetchJsonWithTimeout(
        backendUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify(body ?? {}),
        },
        MIRROR_TIMEOUT_MS
      );
      backendResponse = out.response;
      data = out.data;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return NextResponse.json(
          {
            error: "Mirror timed out",
            detail: `Timed out waiting for backend mirror response (${Math.round(MIRROR_TIMEOUT_MS / 1000)}s).`,
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
        typeof data.error === "string" ? data.error : "Mirror failed";
      const detail = typeof data.detail === "string" ? data.detail : undefined;
      return NextResponse.json(
        detail ? { error: errorMessage, detail } : { error: errorMessage },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to mirror cast photo", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
