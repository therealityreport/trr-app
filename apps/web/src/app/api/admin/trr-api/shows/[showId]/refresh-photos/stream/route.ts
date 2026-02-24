import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";
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
  params: Promise<{ showId: string }>;
}

const normalizeRefreshPhotosBody = (
  body: Record<string, unknown> | undefined
): Record<string, unknown> => {
  const next = { ...(body ?? {}) };
  if (next.skip_s3 === undefined && typeof next.skip_mirror === "boolean") {
    next.skip_s3 = next.skip_mirror;
  }
  if (typeof next.season_number === "string" && next.season_number.trim().length > 0) {
    const parsed = Number.parseInt(next.season_number, 10);
    if (Number.isFinite(parsed)) {
      next.season_number = parsed;
    }
  }
  return next;
};

const buildSseErrorResponse = (
  payload: Record<string, unknown>,
  status = 200,
  requestId?: string | null
): Response => {
  const responsePayload = requestId ? { ...payload, request_id: requestId } : payload;
  return new Response(`event: error\ndata: ${JSON.stringify(responsePayload)}\n\n`, {
    status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
};

const isRetryableNetworkError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  if (
    message.includes("fetch failed") ||
    message.includes("signal is aborted without reason") ||
    message.includes("network")
  ) {
    return true;
  }
  const cause = (error as Error & { cause?: { code?: string } }).cause;
  const code = String(cause?.code ?? "");
  return RETRYABLE_FETCH_ERROR_CODES.has(code);
};

const getErrorDetail = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return `Timed out waiting for backend refresh stream response (${Math.round(BACKEND_STREAM_TIMEOUT_MS / 60000)}m).`;
    }
    if (error.message?.trim()) return error.message.trim();
    return error.name || "unknown error";
  }
  if (typeof error === "string" && error.trim()) return error.trim();
  return "unknown error";
};

/**
 * POST /api/admin/trr-api/shows/[showId]/refresh-photos/stream
 *
 * Proxies show gallery refresh request to TRR-Backend with SSE streaming.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  let requestId: string | null = null;
  try {
    await requireAdmin(request);
    requestId = request.headers.get("x-trr-request-id")?.trim() || null;

    const { showId } = await params;
    if (!showId) {
      return buildSseErrorResponse({ stage: "proxy", error: "showId is required", status: 400 }, 200, requestId);
    }

    let body: Record<string, unknown> | undefined;
    if (request.headers.get("content-type")?.includes("application/json")) {
      try {
        body = await request.json();
      } catch {
        body = undefined;
      }
    }

    const normalizedBody = normalizeRefreshPhotosBody(body);

    const backendUrl = getBackendApiUrl(`/admin/shows/${showId}/refresh-photos/stream`);
    if (!backendUrl) {
      return buildSseErrorResponse({ stage: "proxy", error: "Backend API not configured", status: 500 }, 200, requestId);
    }

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return buildSseErrorResponse({ stage: "proxy", error: "Backend auth not configured", status: 500 }, 200, requestId);
    }

    let backendResponse: Response | null = null;
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= BACKEND_FETCH_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), BACKEND_STREAM_TIMEOUT_MS);
      try {
        const response = await fetch(backendUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
            ...(requestId ? { "x-trr-request-id": requestId } : {}),
          },
          body: JSON.stringify(normalizedBody),
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
        clearTimeout(timer);
      }
    }

    if (!backendResponse) {
      return buildSseErrorResponse({
        stage: "proxy",
        error: "Backend fetch failed",
        detail: `${getErrorDetail(lastError)} (TRR_API_URL=${process.env.TRR_API_URL ?? "unset"})`,
        status: 502,
      }, 200, requestId);
    }

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      return buildSseErrorResponse({
        stage: "backend",
        error: "Backend refresh failed",
        detail: errorText || `HTTP ${backendResponse.status}`,
        status: backendResponse.status,
      }, 200, requestId);
    }

    if (!backendResponse.body) {
      return buildSseErrorResponse({ stage: "backend", error: "No response body from backend", status: 502 }, 200, requestId);
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
      error: "Refresh stream request failed",
      detail: getErrorDetail(error),
      status: 500,
    }, 200, requestId);
  }
}
