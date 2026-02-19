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

const buildSseErrorResponse = (payload: Record<string, unknown>): Response =>
  new Response(`event: error\ndata: ${JSON.stringify(payload)}\n\n`, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });

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
 * POST /api/admin/trr-api/people/[personId]/refresh-images/stream
 *
 * Proxies refresh images request to TRR-Backend with SSE streaming.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { personId } = await params;
    if (!personId) {
      return buildSseErrorResponse({
          stage: "proxy",
          error: "personId is required",
        status: 400,
      });
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
      return buildSseErrorResponse({
          stage: "proxy",
          error: "Backend API not configured",
          status: 500,
      });
    }

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return buildSseErrorResponse({
          stage: "proxy",
          error: "Backend auth not configured",
          status: 500,
      });
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
      const detail = `${getErrorDetail(lastError)} (TRR_API_URL=${process.env.TRR_API_URL ?? "unset"})`;
      return buildSseErrorResponse({
        stage: "proxy",
        error: "Backend fetch failed",
        detail,
        status: 502,
      });
    }

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      return buildSseErrorResponse({
          stage: "backend",
          error: "Backend refresh failed",
          detail: errorText || `HTTP ${backendResponse.status}`,
          status: backendResponse.status,
      });
    }

    if (!backendResponse.body) {
      return buildSseErrorResponse({
          stage: "backend",
          error: "No response body from backend",
          status: 502,
      });
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
    });
  }
}
