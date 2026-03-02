import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import {
  isRetryableSseNetworkError,
  normalizeSseProxyError,
  runBackendHealthPreflight,
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
]);

interface RouteParams {
  params: Promise<{ showId: string }>;
}

type FetchErrorCause = {
  code?: string;
  errno?: string;
  address?: string;
  port?: number;
  syscall?: string;
};

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

const isRetryableNetworkError = (error: unknown): boolean => {
  if (isRetryableSseNetworkError(error)) return true;
  if (!(error instanceof Error)) return false;
  const cause = (error as Error & { cause?: { code?: string } }).cause;
  const code = String(cause?.code ?? "");
  return RETRYABLE_FETCH_ERROR_CODES.has(code);
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
      return "Timed out waiting for backend refresh stream response.";
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

export async function POST(request: NextRequest, { params }: RouteParams) {
  let requestId: string | null = null;
  try {
    await requireAdmin(request);
    requestId = request.headers.get("x-trr-request-id")?.trim() || null;

    const { showId } = await params;
    if (!showId) {
      return Response.json(
        {
          stage: "proxy",
          error: "showId is required",
          ...(requestId ? { request_id: requestId } : {}),
        },
        { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } }
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
    const normalizedBody = normalizeRefreshPhotosBody(body);

    const backendUrl = getBackendApiUrl(`/admin/shows/${showId}/refresh-photos/stream`);
    if (!backendUrl) {
      return Response.json(
        {
          stage: "proxy",
          error: "Backend API not configured",
          ...(requestId ? { request_id: requestId } : {}),
        },
        { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return Response.json(
        {
          stage: "proxy",
          error: "Backend auth not configured",
          ...(requestId ? { request_id: requestId } : {}),
        },
        { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
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
          message: "Backend health check passed. Connecting to backend stream...",
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
          message: "Connecting to backend refresh stream...",
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
                ? "Connecting to backend refresh stream..."
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
          const fetchPromise = fetch(backendUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
              ...(requestId ? { "x-trr-request-id": requestId } : {}),
            },
            body: JSON.stringify(normalizedBody),
            signal: requestController.signal,
            cache: "no-store",
          });

          let fetchSettled = false;
          fetchPromise.then(
            () => {
              fetchSettled = true;
            },
            () => {
              fetchSettled = true;
            }
          );

          try {
            while (!fetchSettled) {
              await Promise.race([
                fetchPromise.then(
                  () => undefined,
                  () => undefined
                ),
                sleep(proxyConfig.connectHeartbeatIntervalMs),
              ]);
              if (fetchSettled) break;
              emitProxyProgress({
                message: `Connecting to backend stream (attempt ${attempt}/${BACKEND_FETCH_ATTEMPTS}, ${Math.floor(
                  (Date.now() - attemptStartedAt) / 1000
                )}s/${Math.floor(proxyConfig.connectAttemptTimeoutMs / 1000)}s)...`,
                current: attempt - 1,
                total: BACKEND_FETCH_ATTEMPTS,
                attempt,
                max_attempts: BACKEND_FETCH_ATTEMPTS,
                retrying: attempt > 1,
                attempt_elapsed_ms: Date.now() - attemptStartedAt,
                attempt_timeout_ms: proxyConfig.connectAttemptTimeoutMs,
                checkpoint: "connect_wait",
                backend_host: backendHost,
              });
            }

            const response = await fetchPromise;
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
              error_code: `HTTP_${response.status}`,
              checkpoint: "connect_retry_wait",
              backend_host: backendHost,
            });
            await sleep(getRetryDelayMs(attempt));
          } catch (error) {
            lastError = error;
            const retryable =
              isRetryableNetworkError(error) || (error instanceof Error && error.name === "AbortError");
            if (!retryable || attempt >= BACKEND_FETCH_ATTEMPTS) {
              break;
            }
            emitProxyProgress({
              message: `Backend stream connect failed, retrying... (${getErrorDetail(error)})`,
              current: attempt,
              total: BACKEND_FETCH_ATTEMPTS,
              attempt,
              max_attempts: BACKEND_FETCH_ATTEMPTS,
              retrying: true,
              error_code: getErrorCode(error),
              checkpoint: "connect_retry_wait",
              attempt_elapsed_ms: Date.now() - attemptStartedAt,
              attempt_timeout_ms: proxyConfig.connectAttemptTimeoutMs,
              backend_host: backendHost,
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
            detail: `${getErrorDetail(lastError)} (attempted ${attemptsUsed}x; backend_host=${backendHost})`,
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

        if (!backendResponse.ok) {
          const errorText = await backendResponse.text();
          emitEvent("error", {
            stage: "backend",
            error: "Backend refresh failed",
            detail: errorText || `HTTP ${backendResponse.status}`,
            error_code: `HTTP_${backendResponse.status}`,
            checkpoint: "backend_http_error",
            stream_state: "failed",
            is_terminal: true,
            backend_host: backendHost,
          });
          controller.close();
          return;
        }

        if (!backendResponse.body) {
          emitEvent("error", {
            stage: "backend",
            error: "No response body from backend",
            error_code: "BACKEND_NO_BODY",
            checkpoint: "backend_no_body",
            stream_state: "failed",
            is_terminal: true,
            backend_host: backendHost,
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
          checkpoint: "proxy_connected",
          stream_state: "connected",
          backend_host: backendHost,
        });

        const reader = backendResponse.body.getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
              controller.enqueue(value);
            }
          }
        } catch (error) {
          emitEvent("error", {
            stage: "proxy_stream",
            error: "Backend stream forwarding failed",
            detail: getErrorDetail(error),
            error_code: getErrorCode(error),
            checkpoint: "proxy_stream_forward_error",
            stream_state: "failed",
            is_terminal: true,
            backend_host: backendHost,
          });
        } finally {
          try {
            await reader.cancel();
          } catch {
            // Ignore read cancel errors.
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
    const detail = getErrorDetail(error);
    const status = detail === "unauthorized" ? 401 : detail === "forbidden" ? 403 : 500;
    return Response.json(
      {
        stage: "proxy",
        error: "Refresh stream request failed",
        detail,
        ...(requestId ? { request_id: requestId } : {}),
      },
      {
        status,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }
}
