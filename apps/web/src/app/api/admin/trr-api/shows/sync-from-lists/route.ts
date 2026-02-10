import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";

const fetchJsonWithTimeout = async (
  url: string,
  init: RequestInit,
  timeoutMs: number,
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
 * POST /api/admin/trr-api/shows/sync-from-lists
 *
 * Proxy to TRR-Backend "sync from lists" endpoint.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const backendUrl = getBackendApiUrl("/admin/shows/sync-from-lists");
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

    // Forward optional JSON body if present (defaults to {}).
    let body: Record<string, unknown> = {};
    if (request.headers.get("content-type")?.includes("application/json")) {
      body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    }

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
          body: JSON.stringify(body),
        },
        600_000,
      );
      backendResponse = out.response;
      data = out.data;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return NextResponse.json(
          {
            error: "Sync timed out",
            detail: "Timed out waiting for backend list sync response (10m).",
          },
          { status: 504 },
        );
      }
      const detail = error instanceof Error ? error.message : "unknown error";
      return NextResponse.json(
        {
          error: "Backend fetch failed",
          detail: `${detail} (TRR_API_URL=${process.env.TRR_API_URL ?? "unset"})`,
        },
        { status: 502 },
      );
    }

    if (!backendResponse.ok) {
      const errorMessage =
        typeof data.error === "string"
          ? data.error
          : typeof data.detail === "string"
            ? data.detail
            : "Sync failed";
      const detail =
        typeof data.detail === "string" ? data.detail : undefined;
      return NextResponse.json(
        detail ? { error: errorMessage, detail } : { error: errorMessage },
        { status: backendResponse.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to sync shows from lists", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

