import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

interface RouteParams {
  params: Promise<{ personId: string }>;
}

/**
 * POST /api/admin/trr-api/people/[personId]/refresh-images/stream
 *
 * Proxies refresh images request to TRR-Backend with SSE streaming.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { personId } = await params;
    if (!personId) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({
          stage: "proxy",
          error: "personId is required",
        })}\n\n`,
        { status: 200, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    let body: Record<string, unknown> | undefined;
    if (request.headers.get("content-type")?.includes("application/json")) {
      try {
        body = await request.json();
      } catch {
        body = undefined;
      }
    }

    const backendUrl = getBackendApiUrl(`/admin/person/${personId}/refresh-images/stream`);
    if (!backendUrl) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({
          stage: "proxy",
          error: "Backend API not configured",
        })}\n\n`,
        { status: 200, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({
          stage: "proxy",
          error: "Backend auth not configured",
        })}\n\n`,
        { status: 200, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(body ?? {}),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      return new Response(
        `event: error\ndata: ${JSON.stringify({
          stage: "backend",
          error: "Backend refresh failed",
          detail: errorText,
        })}\n\n`,
        { status: 200, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    if (!backendResponse.body) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({
          stage: "backend",
          error: "No response body from backend",
        })}\n\n`,
        { status: 200, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    return new Response(backendResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    return new Response(
      `event: error\ndata: ${JSON.stringify({
        stage: "proxy",
        error: "Refresh stream request failed",
        detail: message,
      })}\n\n`,
      { status: 200, headers: { "Content-Type": "text/event-stream" } }
    );
  }
}
