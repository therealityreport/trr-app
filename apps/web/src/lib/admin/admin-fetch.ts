import {
  clearAdminOperationSession,
  getAutoResumableAdminOperationSession,
  getOrCreateAdminFlowKey,
  markAdminOperationSessionStatus,
  pruneStaleAdminOperationSessions,
  upsertAdminOperationSession,
} from "@/lib/admin/operation-session";

export type AdminFetchWithTimeoutInit = RequestInit & {
  timeoutMs: number;
  externalSignal?: AbortSignal;
};

export type AdminRequestRole = "primary" | "secondary" | "polling";

export type AdminNormalizedError = {
  error: string;
  status: number;
  retryable: boolean;
  code?: string;
  reason?: string;
  retryAfterMs?: number;
};

export type AdminStreamEventPayload = Record<string, unknown> | string | null;
export type AdminStreamEvent = {
  event: string;
  payload: AdminStreamEventPayload;
};

export class AdminRequestError extends Error {
  status: number;
  retryable: boolean;
  code?: string;
  reason?: string;
  retryAfterMs?: number;

  constructor({ error, status, retryable, code, reason, retryAfterMs }: AdminNormalizedError) {
    super(error);
    this.name = "AdminRequestError";
    this.status = status;
    this.retryable = retryable;
    this.code = code;
    this.reason = reason;
    this.retryAfterMs = retryAfterMs;
  }
}

type AdminGetJsonInit = Omit<AdminFetchWithTimeoutInit, "method" | "body" | "timeoutMs"> & {
  timeoutMs?: number;
  requestRole?: AdminRequestRole;
  dedupeKey?: string;
  maxAttempts?: number;
  backoffBaseMs?: number;
  backoffMaxMs?: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __trrAdminGetJsonInFlight: Map<string, Promise<unknown>> | undefined;
}

const ADMIN_PRIMARY_ENTITY_TIMEOUT_MS = 12_000;
const ADMIN_PRIMARY_GALLERY_TIMEOUT_MS = 15_000;
const ADMIN_SECONDARY_TIMEOUT_MS = 5_000;
const ADMIN_POLLING_TIMEOUT_MS = 5_000;
const ADMIN_POLLING_BACKOFF_BASE_MS = 250;
const ADMIN_POLLING_BACKOFF_MAX_MS = 2_000;

const ADMIN_GET_JSON_IN_FLIGHT = globalThis.__trrAdminGetJsonInFlight ?? new Map<string, Promise<unknown>>();
if (!globalThis.__trrAdminGetJsonInFlight) {
  globalThis.__trrAdminGetJsonInFlight = ADMIN_GET_JSON_IN_FLIGHT;
}

const inputToKey = (input: RequestInfo | URL): string =>
  input instanceof URL ? input.toString() : typeof input === "string" ? input : String(input);

const looksLikeGalleryRead = (input: RequestInfo | URL): boolean => {
  const value = inputToKey(input).toLowerCase();
  return value.includes("/photos") || value.includes("/gallery");
};

const resolveTimeoutMs = (
  input: RequestInfo | URL,
  requestRole: AdminRequestRole,
  timeoutMs?: number,
): number => {
  if (typeof timeoutMs === "number" && Number.isFinite(timeoutMs) && timeoutMs > 0) {
    return timeoutMs;
  }
  if (requestRole === "primary") {
    return looksLikeGalleryRead(input) ? ADMIN_PRIMARY_GALLERY_TIMEOUT_MS : ADMIN_PRIMARY_ENTITY_TIMEOUT_MS;
  }
  return requestRole === "polling" ? ADMIN_POLLING_TIMEOUT_MS : ADMIN_SECONDARY_TIMEOUT_MS;
};

const defaultDedupeKey = (input: RequestInfo | URL, requestRole: AdminRequestRole): string =>
  `GET:${requestRole}:${inputToKey(input)}`;

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

export const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  externalSignal?: AbortSignal
): Promise<Response> => {
  const timeoutAbortReason = new DOMException("Request timed out", "AbortError");
  const externalAbortReason = new DOMException("Request aborted", "AbortError");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(timeoutAbortReason), timeoutMs);

  const forwardAbort = () =>
    controller.abort((externalSignal as AbortSignal & { reason?: unknown })?.reason ?? externalAbortReason);
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort((externalSignal as AbortSignal & { reason?: unknown })?.reason ?? externalAbortReason);
    } else {
      externalSignal.addEventListener("abort", forwardAbort, { once: true });
    }
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", forwardAbort);
    }
  }
};

export const adminFetch = async (
  input: RequestInfo | URL,
  { timeoutMs, externalSignal, ...init }: AdminFetchWithTimeoutInit
): Promise<Response> => fetchWithTimeout(input, init, timeoutMs, externalSignal);

const isRetryableStatus = (status: number): boolean =>
  status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;

const isAbortLikeError = (error: unknown): boolean => {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error && error.name === "AbortError") return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();
  return (
    normalized.includes("signal is aborted without reason") ||
    normalized.includes("aborted without reason") ||
    normalized.includes("operation was aborted")
  );
};

const parseRetryAfterMs = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.min(Math.floor(value), 30_000);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.min(parsed, 30_000);
    }
  }
  return undefined;
};

const normalizeErrorPayload = async (response: Response): Promise<AdminNormalizedError> => {
  let payload: Record<string, unknown> | null = null;
  try {
    payload = (await response.clone().json()) as Record<string, unknown>;
  } catch {
    payload = null;
  }

  const message: string =
    (typeof payload?.error === "string" && payload.error.trim()) ||
    (typeof payload?.detail === "string" && payload.detail.trim()) ||
    (payload?.detail &&
      typeof payload.detail === "object" &&
      typeof (payload.detail as Record<string, unknown>).message === "string"
        ? ((payload.detail as Record<string, unknown>).message as string).trim()
        : "") ||
    `${response.status} ${response.statusText || "Request failed"}`;
  const detail =
    payload?.detail && typeof payload.detail === "object" ? (payload.detail as Record<string, unknown>) : null;
  const code =
    (typeof payload?.code === "string" && payload.code.trim()) ||
    (typeof detail?.code === "string" && detail.code.trim()) ||
    undefined;
  const reason =
    (typeof payload?.reason === "string" && payload.reason.trim()) ||
    (typeof detail?.reason === "string" && detail.reason.trim()) ||
    undefined;
  const retryable =
    typeof payload?.retryable === "boolean"
      ? payload.retryable
      : typeof detail?.retryable === "boolean"
        ? detail.retryable
        : isRetryableStatus(response.status);
  const retryAfterMs =
    parseRetryAfterMs(payload?.retry_after_ms) ??
    parseRetryAfterMs(detail?.retry_after_ms) ??
    parseRetryAfterMs(response.headers.get("retry-after"));

  return {
    error: message,
    status: response.status,
    retryable,
    code,
    reason,
    retryAfterMs,
  };
};

const normalizeThrownError = (error: unknown): AdminNormalizedError => {
  if (error instanceof AdminRequestError) {
    return {
      error: error.message,
      status: error.status,
      retryable: error.retryable,
      code: error.code,
      reason: error.reason,
      retryAfterMs: error.retryAfterMs,
    };
  }
  if (isAbortLikeError(error)) {
    return {
      error: "Request timed out",
      status: 408,
      retryable: true,
      code: "REQUEST_TIMEOUT",
    };
  }
  return {
    error: error instanceof Error ? error.message : "Request failed",
    status: 500,
    retryable: false,
  };
};

const isRetryableSaturation = (error: AdminNormalizedError): boolean => {
  const message = error.error.toLowerCase();
  const reason = String(error.reason || "").toLowerCase();
  const code = String(error.code || "").toUpperCase();
  return (
    error.retryable &&
    (code === "DATABASE_SERVICE_UNAVAILABLE" ||
      code === "BACKEND_SATURATED" ||
      reason === "pool_capacity" ||
      reason === "session_pool_capacity" ||
      reason === "queue_pressure" ||
      message.includes("connection pool exhausted") ||
      message.includes("database pool initialization failed") ||
      message.includes("maxclientsinsessionmode"))
  );
};

export const adminGetJson = async <T>(
  input: RequestInfo | URL,
  init: AdminGetJsonInit = {},
): Promise<T> => {
  const {
    timeoutMs: configuredTimeoutMs,
    requestRole: configuredRequestRole,
    dedupeKey: configuredDedupeKey,
    maxAttempts: configuredMaxAttempts,
    backoffBaseMs: configuredBackoffBaseMs,
    backoffMaxMs: configuredBackoffMaxMs,
    ...requestInit
  } = init;
  const requestRole = configuredRequestRole ?? "secondary";
  const timeoutMs = resolveTimeoutMs(input, requestRole, configuredTimeoutMs);
  const dedupeKey = configuredDedupeKey ?? defaultDedupeKey(input, requestRole);
  const maxAttempts =
    Number.isFinite(configuredMaxAttempts) && (configuredMaxAttempts ?? 0) > 0
      ? Math.max(1, Math.floor(configuredMaxAttempts as number))
      : 1;
  const backoffBaseMs =
    Number.isFinite(configuredBackoffBaseMs) && (configuredBackoffBaseMs ?? 0) > 0
      ? Math.floor(configuredBackoffBaseMs as number)
      : ADMIN_POLLING_BACKOFF_BASE_MS;
  const backoffMaxMs =
    Number.isFinite(configuredBackoffMaxMs) && (configuredBackoffMaxMs ?? 0) > 0
      ? Math.floor(configuredBackoffMaxMs as number)
      : ADMIN_POLLING_BACKOFF_MAX_MS;

  const existing = ADMIN_GET_JSON_IN_FLIGHT.get(dedupeKey);
  if (existing) {
    return (await existing) as T;
  }

  const request = (async (): Promise<T> => {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await adminFetch(input, {
          ...requestInit,
          timeoutMs,
          method: "GET",
        });
        if (!response.ok) {
          throw new AdminRequestError(await normalizeErrorPayload(response));
        }
        return (await response.json()) as T;
      } catch (error) {
        const normalized = normalizeThrownError(error);
        const shouldRetry =
          requestRole === "polling" &&
          attempt < maxAttempts &&
          isRetryableSaturation(normalized);
        if (!shouldRetry) {
          throw new AdminRequestError(normalized);
        }
        const retryDelayMs =
          normalized.retryAfterMs ??
          Math.min(backoffBaseMs * 2 ** (attempt - 1), backoffMaxMs);
        await sleep(retryDelayMs);
      }
    }
    throw new AdminRequestError({
      error: "Request failed",
      status: 500,
      retryable: false,
    });
  })();

  ADMIN_GET_JSON_IN_FLIGHT.set(dedupeKey, request);
  try {
    return await request;
  } finally {
    if (ADMIN_GET_JSON_IN_FLIGHT.get(dedupeKey) === request) {
      ADMIN_GET_JSON_IN_FLIGHT.delete(dedupeKey);
    }
  }
};

export const resetAdminGetCoordinatorForTests = (): void => {
  ADMIN_GET_JSON_IN_FLIGHT.clear();
};

export const adminMutation = async <T>(
  input: RequestInfo | URL,
  init: AdminFetchWithTimeoutInit
): Promise<T> => {
  try {
    const response = await adminFetch(input, init);
    if (!response.ok) {
      throw new AdminRequestError(await normalizeErrorPayload(response));
    }
    return (await response.json()) as T;
  } catch (error) {
    throw new AdminRequestError(normalizeThrownError(error));
  }
};

export const adminStream = async (
  input: RequestInfo | URL,
  init: AdminFetchWithTimeoutInit & {
    onEvent: (event: AdminStreamEvent) => void | Promise<void>;
  }
): Promise<void> => {
  const { onEvent, ...requestInit } = init;
  try {
    pruneStaleAdminOperationSessions();
    const method = (requestInit.method || "GET").toUpperCase();
    const headers =
      requestInit.headers instanceof Headers
        ? new Headers(requestInit.headers)
        : new Headers(requestInit.headers ?? {});
    const bodyValue =
      typeof requestInit.body === "string"
        ? requestInit.body
        : requestInit.body instanceof URLSearchParams
          ? requestInit.body.toString()
          : requestInit.body
            ? String(requestInit.body)
            : "";
    const bodySignature = bodyValue.length > 0 ? String(bodyValue.length) : "0";
    const requestIdHeader = headers.get("x-trr-request-id")?.trim() ?? "";
    const resumableKey = requestIdHeader || bodySignature;
    const targetPath =
      input instanceof URL
        ? `${input.pathname}${input.search}`
        : typeof input === "string"
          ? input
          : String(input);
    const flowScope = `${method}:${targetPath}:${resumableKey}`;
    const flowKey = getOrCreateAdminFlowKey(flowScope);
    headers.set("x-trr-flow-key", flowKey);
    const requestWithFlow: AdminFetchWithTimeoutInit = {
      ...requestInit,
      headers,
    };

    const existingSession = getAutoResumableAdminOperationSession(flowScope);
    upsertAdminOperationSession(flowScope, {
      flowKey,
      input: targetPath,
      method,
      status: "active",
    });

    let response: Response | null = null;
    if (existingSession?.operationId && existingSession.status === "active") {
      const afterSeq = Math.max(0, Number(existingSession.lastEventSeq || 0));
      const resumeUrl = `/api/admin/trr-api/operations/${existingSession.operationId}/stream?after_seq=${afterSeq}`;
      try {
        response = await adminFetch(resumeUrl, {
          ...requestWithFlow,
          method: "GET",
          body: undefined,
        });
      } catch (error) {
        if (error instanceof AdminRequestError && error.status === 404) {
          clearAdminOperationSession(flowScope);
        }
      }
    }

    if (!response) {
      response = await adminFetch(input, requestWithFlow);
    }

    if (!response.ok) {
      throw new AdminRequestError(await normalizeErrorPayload(response));
    }
    if (!response.body) {
      throw new AdminRequestError({
        error: "Stream unavailable",
        status: 502,
        retryable: true,
      });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

      let boundaryIndex = buffer.indexOf("\n\n");
      while (boundaryIndex !== -1) {
        const rawEvent = buffer.slice(0, boundaryIndex);
        buffer = buffer.slice(boundaryIndex + 2);

        const lines = rawEvent.split("\n").filter(Boolean);
        let eventType = "message";
        const dataLines: string[] = [];
        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trim());
          }
        }

        const dataStr = dataLines.join("\n");
        let payload: AdminStreamEventPayload = dataStr;
        try {
          payload = JSON.parse(dataStr) as Record<string, unknown>;
        } catch {
          payload = dataStr || null;
        }
        if (payload && typeof payload === "object" && !Array.isArray(payload)) {
          const operationIdRaw = (payload as { operation_id?: unknown }).operation_id;
          const operationId =
            typeof operationIdRaw === "string" && operationIdRaw.trim().length > 0
              ? operationIdRaw.trim()
              : null;
          const eventSeqRaw = (payload as { event_seq?: unknown }).event_seq;
          const parsedEventSeq = typeof eventSeqRaw === "number" ? eventSeqRaw : Number.parseInt(String(eventSeqRaw ?? "0"), 10);
          const eventSeq = Number.isFinite(parsedEventSeq) ? Math.max(0, parsedEventSeq) : 0;
          upsertAdminOperationSession(flowScope, {
            flowKey,
            input: targetPath,
            method,
            ...(operationId ? { operationId } : {}),
            ...(eventSeq > 0 ? { lastEventSeq: eventSeq } : {}),
            status: "active",
          });
        }
        if (eventType === "complete") {
          markAdminOperationSessionStatus(flowScope, "completed");
        } else if (eventType === "error") {
          const statusRaw =
            payload && typeof payload === "object" && !Array.isArray(payload)
              ? (payload as { status?: unknown }).status
              : null;
          const status = typeof statusRaw === "string" ? statusRaw.trim().toLowerCase() : "";
          if (status === "cancelled" || status === "canceled") {
            markAdminOperationSessionStatus(flowScope, "cancelled");
          } else {
            markAdminOperationSessionStatus(flowScope, "failed");
          }
        }
        await onEvent({ event: eventType, payload });
        boundaryIndex = buffer.indexOf("\n\n");
      }
    }
  } catch (error) {
    throw new AdminRequestError(normalizeThrownError(error));
  }
};
