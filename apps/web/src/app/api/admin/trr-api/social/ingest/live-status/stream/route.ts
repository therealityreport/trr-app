import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { buildInternalAdminHeaders } from "@/lib/server/trr-api/internal-admin-auth";

export const dynamic = "force-dynamic";

const STREAM_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

function formatStreamError(message: string): string {
  return `event: error\ndata: ${JSON.stringify({ error: message })}\n\n`;
}

function streamErrorResponse(message: string, status = 500): Response {
  return new Response(formatStreamError(message), {
    status,
    headers: STREAM_HEADERS,
  });
}

function isAbortLikeError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function proxiedEventStreamResponse(backendResponse: Response): Response {
  const reader = backendResponse.body?.getReader();
  if (!reader) {
    return streamErrorResponse("Backend live status stream failed", 502);
  }

  const encoder = new TextEncoder();
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          if (value) {
            controller.enqueue(value);
          }
        }
        if (!cancelled) {
          controller.close();
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Backend live status stream ended";
          try {
            controller.enqueue(encoder.encode(formatStreamError(message)));
          } catch {
            // Client already disconnected.
          }
          try {
            controller.close();
          } catch {
            // Client already disconnected.
          }
        }
      } finally {
        try {
          reader.releaseLock();
        } catch {
          // Reader may already be released after cancellation.
        }
      }
    },
    async cancel(reason) {
      cancelled = true;
      try {
        await reader.cancel(reason);
      } catch {
        // Backend stream may already be closed.
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...STREAM_HEADERS,
      "Content-Type": backendResponse.headers.get("content-type") ?? STREAM_HEADERS["Content-Type"],
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const backendUrl = getBackendApiUrl("/admin/socials/live-status/stream");
    if (!backendUrl) {
      return streamErrorResponse("Backend API not configured");
    }

    const backendResponse = await fetch(backendUrl, {
      method: "GET",
      headers: buildInternalAdminHeaders({ Accept: "text/event-stream" }),
      cache: "no-store",
      signal: request.signal,
    });

    if (!backendResponse.ok || !backendResponse.body) {
      const errorText = await backendResponse.text().catch(() => "");
      return streamErrorResponse(errorText || "Backend live status stream failed", backendResponse.status || 502);
    }

    return proxiedEventStreamResponse(backendResponse);
  } catch (error) {
    if (request.signal.aborted || isAbortLikeError(error)) {
      return new Response(null, { status: 204 });
    }
    const message = error instanceof Error ? error.message : "failed";
    return streamErrorResponse(message);
  }
}
