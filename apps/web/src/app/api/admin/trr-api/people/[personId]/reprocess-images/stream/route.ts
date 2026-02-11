import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface RouteParams {
  params: Promise<{ personId: string }>;
}

/**
 * POST /api/admin/trr-api/people/[personId]/reprocess-images/stream
 *
 * Proxies reprocess (count + text-ID + crop) request to TRR-Backend with SSE streaming.
 * Unlike refresh-images, this does NOT sync or mirror — it only reprocesses existing photos.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { personId } = await params;
    if (!personId) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({ error: "personId is required" })}\n\n`,
        { status: 400, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    const backendUrl = getBackendApiUrl(`/admin/person/${personId}/reprocess-images/stream`);
    if (!backendUrl) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({ error: "Backend API not configured" })}\n\n`,
        { status: 500, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({ error: "Backend auth not configured" })}\n\n`,
        { status: 500, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: "{}",
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      return new Response(
        `event: error\ndata: ${JSON.stringify({
          error: "Backend reprocess failed",
          detail: errorText,
        })}\n\n`,
        { status: backendResponse.status, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    if (!backendResponse.body) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({ error: "No response body from backend" })}\n\n`,
        { status: 500, headers: { "Content-Type": "text/event-stream" } }
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
      `event: error\ndata: ${JSON.stringify({ error: message })}\n\n`,
      { status: 500, headers: { "Content-Type": "text/event-stream" } }
    );
  }
}
