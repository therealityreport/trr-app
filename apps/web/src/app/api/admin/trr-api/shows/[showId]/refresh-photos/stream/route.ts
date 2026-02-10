import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string }>;
}

/**
 * POST /api/admin/trr-api/shows/[showId]/refresh-photos/stream
 *
 * Proxies show gallery refresh request to TRR-Backend with SSE streaming.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { showId } = await params;
    if (!showId) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({ error: "showId is required" })}\n\n`,
        { status: 400, headers: { "Content-Type": "text/event-stream" } },
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

    const backendUrl = getBackendApiUrl(
      `/admin/shows/${showId}/refresh-photos/stream`,
    );
    if (!backendUrl) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({ error: "Backend API not configured" })}\n\n`,
        { status: 500, headers: { "Content-Type": "text/event-stream" } },
      );
    }

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({ error: "Backend auth not configured" })}\n\n`,
        { status: 500, headers: { "Content-Type": "text/event-stream" } },
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 600_000);
    let backendResponse: Response;
    try {
      backendResponse = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify(body ?? {}),
        signal: controller.signal,
      });
    } catch (error) {
      const detail =
        error instanceof Error && error.name === "AbortError"
          ? "Timed out waiting for backend refresh stream response (10m)."
          : error instanceof Error
            ? error.message
            : "unknown error";
      return new Response(
        `event: error\ndata: ${JSON.stringify({
          error: "Backend fetch failed",
          detail,
        })}\n\n`,
        { status: 502, headers: { "Content-Type": "text/event-stream" } },
      );
    } finally {
      clearTimeout(timer);
    }

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      return new Response(
        `event: error\ndata: ${JSON.stringify({
          error: "Backend refresh failed",
          detail: errorText,
        })}\n\n`,
        { status: backendResponse.status, headers: { "Content-Type": "text/event-stream" } },
      );
    }

    if (!backendResponse.body) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({ error: "No response body from backend" })}\n\n`,
        { status: 500, headers: { "Content-Type": "text/event-stream" } },
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
      { status: 500, headers: { "Content-Type": "text/event-stream" } },
    );
  }
}

