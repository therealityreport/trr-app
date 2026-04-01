import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { getInternalAdminBearerToken } from "@/lib/server/trr-api/internal-admin-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

interface RouteParams {
  params: Promise<{ showId: string }>;
}

const BACKEND_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

const toSseChunk = (
  event: string,
  data: Record<string, unknown>
): string => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

/**
 * POST /api/admin/trr-api/shows/[showId]/get-images/stream
 *
 * SSE proxy for show-level Getty+NBCUMV image fetch.
 * Streams progress events from the backend as images are discovered and imported.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const requestId =
    request.headers.get("x-trr-request-id")?.trim() || undefined;

  try {
    await requireAdmin(request);

    const { showId } = await params;
    if (!showId) {
      return Response.json({ error: "showId is required" }, { status: 400 });
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
      `/admin/shows/${showId}/get-images/stream`
    );
    if (!backendUrl) {
      console.error("[show/get-images] TRR_API_URL not configured");
      return Response.json(
        { error: "Backend API not configured" },
        { status: 500 }
      );
    }

    const serviceRoleKey = getInternalAdminBearerToken();
    if (!serviceRoleKey) {
      console.error(
        "[show/get-images] TRR internal admin auth not configured"
      );
      return Response.json(
        { error: "Backend auth not configured" },
        { status: 500 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);

    let backendResponse: Response;
    try {
      backendResponse = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
          ...(requestId ? { "x-trr-request-id": requestId } : {}),
        },
        body: JSON.stringify(body ?? {}),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        const stream = new ReadableStream({
          start(ctrl) {
            ctrl.enqueue(
              new TextEncoder().encode(
                toSseChunk("error", {
                  message: "Timed out connecting to backend (10m)",
                  is_terminal: true,
                  error_code: "CONNECT_TIMEOUT",
                })
              )
            );
            ctrl.close();
          },
        });
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-store",
          },
        });
      }
      const detail =
        error instanceof Error ? error.message : String(error);
      console.error("[show/get-images] Backend fetch failed", {
        backendUrl,
        detail,
      });
      return Response.json(
        { error: "Backend fetch failed", detail },
        { status: 502 }
      );
    }

    clearTimeout(timeout);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text().catch(() => "");
      const stream = new ReadableStream({
        start(ctrl) {
          ctrl.enqueue(
            new TextEncoder().encode(
              toSseChunk("error", {
                message:
                  errorText || `Backend returned HTTP ${backendResponse.status}`,
                is_terminal: true,
                error_code: `HTTP_${backendResponse.status}`,
              })
            )
          );
          ctrl.close();
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-store",
        },
      });
    }

    if (!backendResponse.body) {
      return Response.json(
        { error: "No response body from backend" },
        { status: 502 }
      );
    }

    // Pipe backend SSE stream directly to client
    const stream = new ReadableStream({
      async start(ctrl) {
        const reader = backendResponse.body!.getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) ctrl.enqueue(value);
          }
        } catch (error) {
          ctrl.enqueue(
            new TextEncoder().encode(
              toSseChunk("error", {
                message: "Stream forwarding failed",
                detail:
                  error instanceof Error ? error.message : String(error),
                is_terminal: true,
                error_code: "PROXY_STREAM_ERROR",
              })
            )
          );
        } finally {
          try {
            await reader.cancel();
          } catch {
            // Ignore cancel errors
          }
          ctrl.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store, max-age=0",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : String(error);
    const status =
      detail === "unauthorized"
        ? 401
        : detail === "forbidden"
          ? 403
          : 500;
    return Response.json(
      {
        error: "Get images request failed",
        detail,
        ...(requestId ? { request_id: requestId } : {}),
      },
      { status }
    );
  }
}
