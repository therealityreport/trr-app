import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";
export const maxDuration = 800;
const BACKEND_STREAM_TIMEOUT_MS = 10 * 60 * 1000;
const BACKEND_FETCH_ATTEMPTS = 5;
const BACKEND_FETCH_RETRY_BASE_DELAY_MS = 200;
const BACKEND_FETCH_RETRY_MAX_DELAY_MS = 2_000;
const RETRYABLE_FETCH_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ECONNABORTED",
  "ETIMEDOUT",
  "EPIPE",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ENOTFOUND",
  "UND_ERR_CONNECT_TIMEOUT",
]);

interface RouteParams {
  params: Promise<{ personId: string }>;
}

const buildErrorResponse = (
  payload: Record<string, unknown>,
  status: number
): Response =>
  Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
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

type FetchErrorCause = {
  code?: string;
  errno?: string;
  address?: string;
  port?: number;
  syscall?: string;
};

const getErrorCause = (error: unknown): FetchErrorCause | null => {
  if (!(error instanceof Error)) return null;
  const cause = (error as Error & { cause?: unknown }).cause;
  if (!cause || typeof cause !== "object") {
    return null;
  }
  const candidate = cause as {
    code?: unknown;
    errno?: unknown;
    address?: unknown;
    port?: unknown;
    syscall?: unknown;
  };
  const code = typeof candidate.code === "string" ? candidate.code : undefined;
  const errno = typeof candidate.errno === "string" ? candidate.errno : undefined;
  const address = typeof candidate.address === "string" ? candidate.address : undefined;
  const port = typeof candidate.port === "number" ? candidate.port : undefined;
  const syscall = typeof candidate.syscall === "string" ? candidate.syscall : undefined;
  if (!code && !errno && !address && !syscall) return null;
  return { code, errno, address, port, syscall };
};

const formatFetchErrorDetail = (error: unknown): string => {
  if (!(error instanceof Error)) return "unknown error";
  const message = error.message?.trim() || error.name || "unknown error";
  const cause = getErrorCause(error);
  if (!cause) return message;

  const details = Object.entries({
    code: cause.code || cause.errno,
    syscall: cause.syscall,
    address: cause.address,
    port: cause.port,
  })
    .filter(([, value]) => value !== undefined && value !== null && `${value}`.trim().length > 0)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");

  if (!details) return message;
  return `${message} (${details})`;
};

const getErrorDetail = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return `Timed out waiting for backend refresh stream response (${Math.round(BACKEND_STREAM_TIMEOUT_MS / 60000)}m).`;
    }
    return formatFetchErrorDetail(error);
  }
  if (typeof error === "string" && error.trim()) return error.trim();
  return "unknown error";
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const getRetryDelayMs = (attempt: number): number => {
  const exponent = Math.max(attempt - 1, 0);
  const delay = BACKEND_FETCH_RETRY_BASE_DELAY_MS * 2 ** exponent;
  return Math.min(delay, BACKEND_FETCH_RETRY_MAX_DELAY_MS);
};

const SSE_TEXT_ENCODER = new TextEncoder();

const toSseChunk = (eventType: string, payload: Record<string, unknown>): Uint8Array =>
  SSE_TEXT_ENCODER.encode(`event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`);

/**
 * POST /api/admin/trr-api/people/[personId]/refresh-images/stream
 *
 * Proxies refresh images request to TRR-Backend with SSE streaming.
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

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const emitEvent = (eventType: "progress" | "error", payload: Record<string, unknown>) => {
          controller.enqueue(
            toSseChunk(eventType, {
              ...(requestId ? { request_id: requestId } : {}),
              ...payload,
            })
          );
        };
        const emitProxyProgress = (payload: Record<string, unknown>) => {
          emitEvent("progress", {
            stage: "proxy_connecting",
            ...payload,
          });
        };

        let backendResponse: Response | null = null;
        let lastError: unknown = null;
        let attemptsUsed = 0;
        emitProxyProgress({
          message: "Connecting to backend refresh stream...",
          current: 0,
          total: BACKEND_FETCH_ATTEMPTS,
          attempt: 0,
          max_attempts: BACKEND_FETCH_ATTEMPTS,
        });

        for (let attempt = 1; attempt <= BACKEND_FETCH_ATTEMPTS; attempt += 1) {
          attemptsUsed = attempt;
          emitProxyProgress({
            message:
              attempt === 1
                ? "Connecting to backend refresh stream..."
                : `Retrying backend stream connection (attempt ${attempt}/${BACKEND_FETCH_ATTEMPTS})...`,
            current: attempt - 1,
            total: BACKEND_FETCH_ATTEMPTS,
            attempt,
            max_attempts: BACKEND_FETCH_ATTEMPTS,
            retrying: attempt > 1,
          });
          const requestController = new AbortController();
          const timeout = setTimeout(() => requestController.abort(), BACKEND_STREAM_TIMEOUT_MS);
          try {
            const response = await fetch(backendUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceRoleKey}`,
                ...(requestId ? { "x-trr-request-id": requestId } : {}),
              },
              body: JSON.stringify(body ?? {}),
              signal: requestController.signal,
              cache: "no-store",
            });
            if (response.ok || response.status < 500 || attempt >= BACKEND_FETCH_ATTEMPTS) {
              backendResponse = response;
              break;
            }
            lastError = new Error(`HTTP ${response.status}`);
            emitProxyProgress({
              message: `Backend stream returned HTTP ${response.status}; retrying...`,
              current: attempt,
              total: BACKEND_FETCH_ATTEMPTS,
              attempt,
              max_attempts: BACKEND_FETCH_ATTEMPTS,
              retrying: true,
            });
            await sleep(getRetryDelayMs(attempt));
          } catch (error) {
            lastError = error;
            if (!isRetryableNetworkError(error) || attempt >= BACKEND_FETCH_ATTEMPTS) {
              break;
            }
            emitProxyProgress({
              message: `Backend stream connect failed, retrying... (${getErrorDetail(error)})`,
              current: attempt,
              total: BACKEND_FETCH_ATTEMPTS,
              attempt,
              max_attempts: BACKEND_FETCH_ATTEMPTS,
              retrying: true,
            });
            await sleep(getRetryDelayMs(attempt));
          } finally {
            clearTimeout(timeout);
          }
        }

        if (!backendResponse) {
          emitEvent("error", {
            stage: "proxy_connecting",
            error: "Backend fetch failed",
            detail: `${getErrorDetail(lastError)} (attempted ${attemptsUsed}x; backendUrl=${backendUrl})`,
          });
          controller.close();
          return;
        }

        if (!backendResponse.ok) {
          const errorText = await backendResponse.text();
          emitEvent("error", {
            stage: "backend",
            error: "Backend refresh failed",
            detail: errorText || `HTTP ${backendResponse.status}`,
          });
          controller.close();
          return;
        }

        if (!backendResponse.body) {
          emitEvent("error", {
            stage: "backend",
            error: "No response body from backend",
          });
          controller.close();
          return;
        }

        emitProxyProgress({
          message: "Connected to backend refresh stream.",
          current: attemptsUsed,
          total: BACKEND_FETCH_ATTEMPTS,
          attempt: attemptsUsed,
          max_attempts: BACKEND_FETCH_ATTEMPTS,
          connected: true,
        });

        const reader = backendResponse.body.getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value && value.length > 0) {
              controller.enqueue(value);
            }
          }
        } catch (error) {
          emitEvent("error", {
            stage: "proxy_stream",
            error: "Backend stream disconnected",
            detail: getErrorDetail(error),
          });
        } finally {
          try {
            await reader.cancel();
          } catch {
            // no-op
          }
          controller.close();
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
    return buildErrorResponse(
      {
        stage: "proxy",
        error: "Refresh stream request failed",
        detail: getErrorDetail(error),
        ...(requestId ? { request_id: requestId } : {}),
      },
      500
    );
  }
}
