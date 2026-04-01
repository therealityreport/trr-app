import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { getInternalAdminBearerToken } from "@/lib/server/trr-api/internal-admin-auth";
import {
  isRetryableSseNetworkError,
  normalizeSseProxyError,
  runBackendHealthPreflight,
  withStreamingSseFetch,
} from "@/lib/server/sse-proxy";

export const dynamic = "force-dynamic";
export const maxDuration = 800;
const DEFAULT_CONNECT_ATTEMPT_TIMEOUT_MS = 20_000;
const DEFAULT_CONNECT_HEARTBEAT_INTERVAL_MS = 2_000;
const DEFAULT_CONNECT_PREFLIGHT_TIMEOUT_MS = 3_000;
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
  "UND_ERR_BODY_TIMEOUT",
]);

interface RouteParams {
  params: Promise<{ personId: string }>;
}

const readPositiveIntEnv = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const getProxyConfig = (): {
  connectAttemptTimeoutMs: number;
  connectHeartbeatIntervalMs: number;
  connectPreflightTimeoutMs: number;
} => ({
  connectAttemptTimeoutMs: readPositiveIntEnv(
    "TRR_STREAM_CONNECT_ATTEMPT_TIMEOUT_MS",
    DEFAULT_CONNECT_ATTEMPT_TIMEOUT_MS
  ),
  connectHeartbeatIntervalMs: readPositiveIntEnv(
    "TRR_STREAM_CONNECT_HEARTBEAT_INTERVAL_MS",
    DEFAULT_CONNECT_HEARTBEAT_INTERVAL_MS
  ),
  connectPreflightTimeoutMs: readPositiveIntEnv(
    "TRR_STREAM_CONNECT_PREFLIGHT_TIMEOUT_MS",
    DEFAULT_CONNECT_PREFLIGHT_TIMEOUT_MS
  ),
});

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
  if (isRetryableSseNetworkError(error)) return true;
  if (!(error instanceof Error)) return false;
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

const getErrorCode = (error: unknown): string => {
  if (error instanceof Error && error.name === "AbortError") {
    return "CONNECT_TIMEOUT";
  }
  const cause = getErrorCause(error);
  if (cause?.code) return cause.code;
  if (cause?.errno) return cause.errno;
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("fetch failed")) return "FETCH_FAILED";
  }
  return "UNKNOWN";
};

const isSocketTerminationError = (error: unknown): boolean => {
  const code = getErrorCode(error);
  if (code === "UND_ERR_SOCKET" || code === "ECONNRESET" || code === "EPIPE") {
    return true;
  }
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("terminated") || message.includes("socket");
};

const getBackendHost = (backendUrl: string): string => {
  try {
    const url = new URL(backendUrl);
    return `${url.hostname}${url.port ? `:${url.port}` : ""}`;
  } catch {
    return "unknown";
  }
};

const getErrorDetail = (error: unknown): string => {
  const normalized = normalizeSseProxyError(error);
  if (normalized.code === "TIMEOUT" || normalized.code === "ABORTED") {
    return normalized.detail;
  }
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return "Timed out waiting for backend profile refresh stream response.";
    }
    return formatFetchErrorDetail(error);
  }
  if (typeof error === "string" && error.trim()) return error.trim();
  return "unknown error";
};

const getProxyErrorStatus = (code: ReturnType<typeof normalizeSseProxyError>["code"]): number => {
  if (code === "TIMEOUT") return 504;
  if (code === "ABORTED") return 499;
  if (code === "NETWORK") return 502;
  return 500;
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
 * POST /api/admin/trr-api/people/[personId]/refresh-profile/stream
 *
 * Proxies refresh profile request to TRR-Backend with SSE streaming.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  let requestId: string | null = null;
  try {
    await requireAdmin(request);
    requestId = request.headers.get("x-trr-request-id")?.trim() || null;
    const tabSessionId = request.headers.get("x-trr-tab-session-id")?.trim() || null;
    const flowKey = request.headers.get("x-trr-flow-key")?.trim() || null;

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

    const backendUrl = getBackendApiUrl(`/admin/person/${personId}/refresh-profile/stream`);
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

    const serviceRoleKey = getInternalAdminBearerToken();
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
    const proxyConfig = getProxyConfig();
    const backendHost = getBackendHost(backendUrl);
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
            stream_state: "connecting",
            ...payload,
          });
        };

        emitProxyProgress({
          message: "Checking backend health before opening stream...",
          current: 0,
          total: BACKEND_FETCH_ATTEMPTS,
          attempt: 0,
          max_attempts: BACKEND_FETCH_ATTEMPTS,
          checkpoint: "backend_preflight_start",
          backend_host: backendHost,
        });
        const preflight = await runBackendHealthPreflight(backendUrl, {
          timeoutMs: proxyConfig.connectPreflightTimeoutMs,
          requestId,
        });
        if (!preflight.ok) {
          emitEvent("error", {
            stage: "proxy_connecting",
            error: "Backend preflight failed",
            detail: `${preflight.detail} (health_url=${preflight.healthUrl}; backend_host=${backendHost})`,
            error_code: preflight.errorCode,
            backend_host: backendHost,
            checkpoint: "backend_preflight_failed",
            stream_state: "failed",
            is_terminal: true,
            attempts_used: 0,
            max_attempts: BACKEND_FETCH_ATTEMPTS,
          });
          controller.close();
          return;
        }
        emitProxyProgress({
          message: "Backend health check passed. Connecting to backend profile refresh stream...",
          current: 0,
          total: BACKEND_FETCH_ATTEMPTS,
          attempt: 0,
          max_attempts: BACKEND_FETCH_ATTEMPTS,
          checkpoint: "backend_preflight_ok",
          backend_host: backendHost,
        });

        let backendResponse: Response | null = null;
        let lastError: unknown = null;
        let attemptsUsed = 0;
        emitProxyProgress({
          message: "Connecting to backend profile refresh stream...",
          current: 0,
          total: BACKEND_FETCH_ATTEMPTS,
          attempt: 0,
          max_attempts: BACKEND_FETCH_ATTEMPTS,
          checkpoint: "connect_start",
          backend_host: backendHost,
        });

        for (let attempt = 1; attempt <= BACKEND_FETCH_ATTEMPTS; attempt += 1) {
          attemptsUsed = attempt;
          emitProxyProgress({
            message:
              attempt === 1
                ? "Connecting to backend profile refresh stream..."
                : `Retrying backend stream connection (attempt ${attempt}/${BACKEND_FETCH_ATTEMPTS})...`,
            current: attempt - 1,
            total: BACKEND_FETCH_ATTEMPTS,
            attempt,
            max_attempts: BACKEND_FETCH_ATTEMPTS,
            retrying: attempt > 1,
            checkpoint: "connect_attempt_start",
            backend_host: backendHost,
          });
          const requestController = new AbortController();
          const attemptStartedAt = Date.now();
          const timeout = setTimeout(() => requestController.abort(), proxyConfig.connectAttemptTimeoutMs);
          const fetchPromise = fetch(
            backendUrl,
            withStreamingSseFetch({
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceRoleKey}`,
                ...(requestId ? { "x-trr-request-id": requestId } : {}),
                ...(tabSessionId ? { "x-trr-tab-session-id": tabSessionId } : {}),
                ...(flowKey ? { "x-trr-flow-key": flowKey } : {}),
              },
              body: JSON.stringify(body ?? {}),
              signal: requestController.signal,
              cache: "no-store",
            })
          );
          let fetchSettled = false;
          fetchPromise.then(
            () => {
              fetchSettled = true;
            },
            () => {
              fetchSettled = true;
            }
          );
          const waitInterval = Math.max(100, proxyConfig.connectHeartbeatIntervalMs);
          while (!fetchSettled) {
            const elapsed = Date.now() - attemptStartedAt;
            emitProxyProgress({
              message: "Waiting for backend stream response...",
              current: attempt - 1,
              total: BACKEND_FETCH_ATTEMPTS,
              attempt,
              max_attempts: BACKEND_FETCH_ATTEMPTS,
              checkpoint: "connect_wait",
              attempt_elapsed_ms: elapsed,
              attempt_timeout_ms: proxyConfig.connectAttemptTimeoutMs,
              backend_host: backendHost,
            });
            await sleep(waitInterval);
          }

          try {
            backendResponse = await fetchPromise;
            clearTimeout(timeout);
            lastError = null;
            break;
          } catch (error) {
            clearTimeout(timeout);
            lastError = error;
            const normalized = normalizeSseProxyError(error);
            const errorCode = getErrorCode(error);
            emitProxyProgress({
              message: `Backend stream connect failed on attempt ${attempt}/${BACKEND_FETCH_ATTEMPTS}.`,
              current: attempt,
              total: BACKEND_FETCH_ATTEMPTS,
              attempt,
              max_attempts: BACKEND_FETCH_ATTEMPTS,
              checkpoint: "connect_attempt_failed",
              error: normalized.detail,
              detail: getErrorDetail(error),
              error_code: errorCode,
              retryable: isRetryableNetworkError(error) && attempt < BACKEND_FETCH_ATTEMPTS,
              backend_host: backendHost,
            });
            if (!isRetryableNetworkError(error) || attempt >= BACKEND_FETCH_ATTEMPTS) {
              break;
            }
            await sleep(getRetryDelayMs(attempt));
          }
        }

        if (!backendResponse) {
          emitEvent("error", {
            stage: "proxy_connecting",
            error: "Backend stream connect failed",
            detail: getErrorDetail(lastError),
            error_code: getErrorCode(lastError),
            backend_host: backendHost,
            checkpoint: "connect_exhausted",
            stream_state: "failed",
            is_terminal: true,
            attempts_used: attemptsUsed,
            max_attempts: BACKEND_FETCH_ATTEMPTS,
          });
          controller.close();
          return;
        }

        emitProxyProgress({
          message: "Connected to backend profile refresh stream.",
          current: attemptsUsed,
          total: BACKEND_FETCH_ATTEMPTS,
          attempt: attemptsUsed,
          max_attempts: BACKEND_FETCH_ATTEMPTS,
          checkpoint: "proxy_connected",
          stream_state: "connected",
          backend_host: backendHost,
        });

        if (!backendResponse.ok || !backendResponse.body) {
          const detail = !backendResponse.ok
            ? `Backend responded with ${backendResponse.status} ${backendResponse.statusText}.`
            : "Backend response did not include a readable stream body.";
          emitEvent("error", {
            stage: "proxy_connecting",
            error: "Backend stream unavailable",
            detail,
            error_code: !backendResponse.ok ? `HTTP_${backendResponse.status}` : "BODY_MISSING",
            backend_host: backendHost,
            checkpoint: "backend_unavailable",
            stream_state: "failed",
            is_terminal: true,
            attempts_used: attemptsUsed,
            max_attempts: BACKEND_FETCH_ATTEMPTS,
          });
          controller.close();
          return;
        }

        const reader = backendResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let boundary = buffer.indexOf("\n\n");
            while (boundary !== -1) {
              const rawChunk = buffer.slice(0, boundary);
              buffer = buffer.slice(boundary + 2);
              controller.enqueue(SSE_TEXT_ENCODER.encode(`${rawChunk}\n\n`));
              boundary = buffer.indexOf("\n\n");
            }
          }
          if (buffer.trim().length > 0) {
            controller.enqueue(SSE_TEXT_ENCODER.encode(`${buffer}\n\n`));
          }
        } catch (error) {
          const shouldSuppress = isSocketTerminationError(error);
          if (!shouldSuppress) {
            emitEvent("error", {
              stage: "proxy_stream",
              error: "Profile refresh stream failed",
              detail: getErrorDetail(error),
              error_code: getErrorCode(error),
              backend_host: backendHost,
              checkpoint: "stream_read_failed",
              stream_state: "failed",
              is_terminal: true,
            });
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const normalized = normalizeSseProxyError(error);
    return buildErrorResponse(
      {
        stage: "proxy",
        error: "Profile refresh stream request failed",
        detail: normalized.detail,
        code: normalized.code,
        ...(requestId ? { request_id: requestId } : {}),
      },
      getProxyErrorStatus(normalized.code)
    );
  }
}
