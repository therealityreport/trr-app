export type SseProxyErrorCode = "TIMEOUT" | "ABORTED" | "NETWORK" | "UNKNOWN";

const RETRYABLE_NETWORK_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ECONNABORTED",
  "ETIMEDOUT",
  "EPIPE",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ENOTFOUND",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
]);

export const isRetryableSseNetworkError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  if (error.name === "AbortError") return true;
  const message = error.message.toLowerCase();
  if (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("aborted without reason")
  ) {
    return true;
  }
  const cause = (error as Error & { cause?: { code?: string } }).cause;
  const code = String(cause?.code ?? "");
  return RETRYABLE_NETWORK_ERROR_CODES.has(code);
};

export const normalizeSseProxyError = (
  error: unknown,
  opts?: { timeoutMs?: number }
): { code: SseProxyErrorCode; detail: string } => {
  const timeoutMs = opts?.timeoutMs ?? 0;
  if (error instanceof Error) {
    const lowered = String(error.message || "").toLowerCase();
    if (error.name === "AbortError") {
      const timeoutText =
        timeoutMs > 0
          ? `Timed out waiting for backend stream response (${Math.round(timeoutMs / 60000)}m).`
          : "Timed out waiting for backend stream response.";
      return { code: "TIMEOUT", detail: timeoutText };
    }
    if (lowered.includes("signal is aborted without reason") || lowered.includes("aborted")) {
      return { code: "ABORTED", detail: "Request was aborted while connecting to backend stream." };
    }
    if (isRetryableSseNetworkError(error)) {
      return { code: "NETWORK", detail: error.message?.trim() || "Transient network error." };
    }
    return { code: "UNKNOWN", detail: error.message?.trim() || error.name || "unknown error" };
  }
  if (typeof error === "string" && error.trim()) {
    return { code: "UNKNOWN", detail: error.trim() };
  }
  return { code: "UNKNOWN", detail: "unknown error" };
};

export const buildBackendHealthUrl = (backendStreamUrl: string): string | null => {
  try {
    const url = new URL(backendStreamUrl);
    return `${url.protocol}//${url.host}/health`;
  } catch {
    return null;
  }
};

export const runBackendHealthPreflight = async (
  backendStreamUrl: string,
  opts?: { timeoutMs?: number; requestId?: string | null }
): Promise<
  | { ok: true; healthUrl: string }
  | { ok: false; healthUrl: string; detail: string; errorCode: string }
> => {
  const healthUrl = buildBackendHealthUrl(backendStreamUrl);
  if (!healthUrl) {
    return {
      ok: false,
      healthUrl: "unknown",
      detail: "Could not determine backend health endpoint URL.",
      errorCode: "BACKEND_UNRESPONSIVE",
    };
  }

  const timeoutMs = typeof opts?.timeoutMs === "number" && opts.timeoutMs > 0 ? opts.timeoutMs : 3000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(healthUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(opts?.requestId ? { "x-trr-request-id": opts.requestId } : {}),
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      return {
        ok: false,
        healthUrl,
        detail: `Backend health probe returned HTTP ${response.status}.`,
        errorCode: "BACKEND_UNRESPONSIVE",
      };
    }
    return { ok: true, healthUrl };
  } catch (error) {
    const normalized = normalizeSseProxyError(error, { timeoutMs });
    const detail =
      normalized.code === "TIMEOUT"
        ? "Timed out waiting for backend health probe response."
        : normalized.detail;
    return {
      ok: false,
      healthUrl,
      detail,
      errorCode: "BACKEND_UNRESPONSIVE",
    };
  } finally {
    clearTimeout(timeout);
  }
};
