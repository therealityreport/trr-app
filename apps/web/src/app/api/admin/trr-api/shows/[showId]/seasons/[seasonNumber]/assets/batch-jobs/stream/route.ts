import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

interface RouteParams {
  params: Promise<{ showId: string; seasonNumber: string }>;
}

const buildSseErrorResponse = (payload: Record<string, unknown>, status = 200): Response =>
  new Response(`event: error\ndata: ${JSON.stringify(payload)}\n\n`, {
    status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showId, seasonNumber } = await params;
    if (!showId || !seasonNumber) {
      return buildSseErrorResponse({
        stage: "proxy",
        error: "showId and seasonNumber are required",
        status: 400,
      });
    }

    let body: Record<string, unknown> = {};
    if (request.headers.get("content-type")?.includes("application/json")) {
      body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    }

    const backendUrl = getBackendApiUrl(
      `/admin/shows/${showId}/seasons/${seasonNumber}/assets/batch-jobs/stream`
    );
    if (!backendUrl) {
      return buildSseErrorResponse({ stage: "proxy", error: "Backend API not configured", status: 500 });
    }

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return buildSseErrorResponse({ stage: "proxy", error: "Backend auth not configured", status: 500 });
    }

    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!backendResponse.ok) {
      const detail = await backendResponse.text().catch(() => "");
      return buildSseErrorResponse(
        {
          stage: "backend",
          error: "Backend batch jobs failed",
          detail: detail || `HTTP ${backendResponse.status}`,
          status: backendResponse.status,
        },
        200
      );
    }

    if (!backendResponse.body) {
      return buildSseErrorResponse({ stage: "backend", error: "No response body from backend", status: 502 });
    }

    return new Response(backendResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return buildSseErrorResponse({
      stage: "proxy",
      error: "Batch jobs stream request failed",
      detail: error instanceof Error ? error.message : "unknown error",
      status: 500,
    });
  }
}
