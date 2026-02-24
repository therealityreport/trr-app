import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

const BACKEND_STREAM_TIMEOUT_MS = 10 * 60 * 1000;
const BACKEND_FETCH_ATTEMPTS = 2;
const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);
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

const buildSseErrorResponse = (payload: Record<string, unknown>): Response => {
  return new Response(`event: error\ndata: ${JSON.stringify(payload)}\n\n`, {
    status: 200,
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
  if (error.name === "AbortError") return true;
  const message = error.message.toLowerCase();
  if (message.includes("fetch failed") || message.includes("network") || message.includes("aborted")) {
    return true;
  }
  const cause = (error as Error & { cause?: { code?: string } }).cause;
  const code = String(cause?.code ?? "");
  return RETRYABLE_FETCH_ERROR_CODES.has(code);
};

const getErrorDetail = (error: unknown): string => {
  if (typeof error === "string" && error.trim()) return error.trim();
  if (!(error instanceof Error)) return "unknown error";
  if (error.name === "AbortError") {
    return `Timed out waiting for backend bravo preview stream response (${Math.round(BACKEND_STREAM_TIMEOUT_MS / 60000)}m).`;
  }
  if (error.message?.trim()) return error.message.trim();
  return error.name || "unknown error";
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { showId } = await params;
    if (!showId) {
      return buildSseErrorResponse({
        stage: "proxy",
        error: "showId is required",
        status: 400,
      });
    }

    const backendUrl = getBackendApiUrl(`/admin/shows/${showId}/import-bravo/preview/stream`);
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
          },
          body: JSON.stringify(body ?? {}),
          signal: controller.signal,
          cache: "no-store",
        });

        if (
          response.ok ||
          !RETRYABLE_STATUS_CODES.has(response.status) ||
          attempt >= BACKEND_FETCH_ATTEMPTS
        ) {
          backendResponse = response;
          break;
        }

        lastError = new Error(`Upstream returned retryable status ${response.status}`);
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
      const detail = (await backendResponse.text()).trim();
      return buildSseErrorResponse({
        stage: "backend",
        error: "Backend bravo preview stream failed",
        detail: detail || `HTTP ${backendResponse.status}`,
        status: backendResponse.status,
        retryable: RETRYABLE_STATUS_CODES.has(backendResponse.status),
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
    const message = getErrorDetail(error);
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return buildSseErrorResponse({
      stage: "proxy",
      error: "Bravo preview stream request failed",
      detail: message,
      status,
    });
  }
}
