import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

const BACKEND_STREAM_TIMEOUT_MS = 10 * 60 * 1000;
const BACKEND_FETCH_ATTEMPTS = 2;
const RETRYABLE_FETCH_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "UND_ERR_CONNECT_TIMEOUT",
]);

interface RouteParams {
  params: Promise<{ personId: string }>;
}

const buildErrorResponse = (payload: Record<string, unknown>, status: number): Response => {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
};

const getErrorDetail = (error: unknown): string => {
  if (typeof error === "string" && error.trim()) return error.trim();
  if (!(error instanceof Error)) return "unknown error";

  const message = error.message?.trim();
  if (message) {
    return message;
  }
  if (error.name?.trim()) {
    return error.name.trim();
  }
  return "unknown error";
};

const isRetryableNetworkError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  if (message.includes("fetch failed")) {
    return true;
  }
  const cause = (error as Error & { cause?: { code?: string } }).cause;
  const code = String(cause?.code ?? "");
  return RETRYABLE_FETCH_ERROR_CODES.has(code);
};

/**
 * POST /api/admin/trr-api/people/[personId]/reprocess-images/stream
 *
 * Proxies reprocess (count + text-ID + crop) request to TRR-Backend with SSE streaming.
 * Unlike refresh-images, this does NOT sync or mirror — it only reprocesses existing photos.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  let requestId: string | null = null;
  try {
    await requireAdmin(request);
    requestId = request.headers.get("x-trr-request-id")?.trim() || null;

    const { personId } = await params;
    if (!personId) {
      return buildErrorResponse(
        {
          stage: "proxy",
          error: "personId is required",
          ...(requestId ? { request_id: requestId } : {}),
        },
        400
      );
    }

    const backendUrl = getBackendApiUrl(`/admin/person/${personId}/reprocess-images/stream`);
    if (!backendUrl) {
      return buildErrorResponse(
        {
          stage: "proxy",
          error: "Backend API not configured",
          ...(requestId ? { request_id: requestId } : {}),
        },
        500
      );
    }

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return buildErrorResponse(
        {
          stage: "proxy",
          error: "Backend auth not configured",
          ...(requestId ? { request_id: requestId } : {}),
        },
        500
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

    let backendResponse: Response | null = null;
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= BACKEND_FETCH_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), BACKEND_STREAM_TIMEOUT_MS);
      try {
        const response = await fetch(backendUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
            ...(requestId ? { "x-trr-request-id": requestId } : {}),
          },
          body: JSON.stringify(body ?? {}),
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.ok || response.status < 500 || attempt >= BACKEND_FETCH_ATTEMPTS) {
          backendResponse = response;
          break;
        }
      } catch (error) {
        lastError = error;
        if (!isRetryableNetworkError(error) || attempt >= BACKEND_FETCH_ATTEMPTS) {
          break;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    if (!backendResponse) {
      const detail =
        lastError instanceof Error && lastError.name === "AbortError"
          ? "Timed out waiting for backend reprocess stream response (10m)."
          : isRetryableNetworkError(lastError)
            ? "Could not reach TRR-Backend. Confirm the backend service is running and reachable."
            : getErrorDetail(lastError);
      return buildErrorResponse(
        {
          stage: "proxy",
          error: "Backend fetch failed",
          detail,
          ...(requestId ? { request_id: requestId } : {}),
        },
        502
      );
    }

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      return buildErrorResponse(
        {
          stage: "backend",
          error: "Backend reprocess failed",
          detail: errorText || `HTTP ${backendResponse.status}`,
          ...(requestId ? { request_id: requestId } : {}),
        },
        backendResponse.status
      );
    }

    if (!backendResponse.body) {
      return buildErrorResponse(
        {
          stage: "backend",
          error: "No response body from backend",
          ...(requestId ? { request_id: requestId } : {}),
        },
        502
      );
    }

    return new Response(backendResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store, max-age=0",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const message = getErrorDetail(error);
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return buildErrorResponse(
      {
        stage: "proxy",
        error: "Reprocess stream request failed",
        detail: message,
        ...(requestId ? { request_id: requestId } : {}),
      },
      status
    );
  }
}
