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

export type AdminNormalizedError = {
  error: string;
  status: number;
  retryable: boolean;
};

export type AdminStreamEventPayload = Record<string, unknown> | string | null;
export type AdminStreamEvent = {
  event: string;
  payload: AdminStreamEventPayload;
};

export class AdminRequestError extends Error {
  status: number;
  retryable: boolean;

  constructor({ error, status, retryable }: AdminNormalizedError) {
    super(error);
    this.name = "AdminRequestError";
    this.status = status;
    this.retryable = retryable;
  }
}

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

const normalizeErrorPayload = async (response: Response): Promise<AdminNormalizedError> => {
  let payload: Record<string, unknown> | null = null;
  try {
    payload = (await response.clone().json()) as Record<string, unknown>;
  } catch {
    payload = null;
  }

  const message =
    (typeof payload?.error === "string" && payload.error.trim()) ||
    (typeof payload?.detail === "string" && payload.detail.trim()) ||
    `${response.status} ${response.statusText || "Request failed"}`;

  return {
    error: message,
    status: response.status,
    retryable: isRetryableStatus(response.status),
  };
};

const normalizeThrownError = (error: unknown): AdminNormalizedError => {
  if (error instanceof AdminRequestError) {
    return {
      error: error.message,
      status: error.status,
      retryable: error.retryable,
    };
  }
  if (isAbortLikeError(error)) {
    return {
      error: "Request timed out",
      status: 408,
      retryable: true,
    };
  }
  return {
    error: error instanceof Error ? error.message : "Request failed",
    status: 500,
    retryable: false,
  };
};

export const adminGetJson = async <T>(
  input: RequestInfo | URL,
  init: Omit<AdminFetchWithTimeoutInit, "method" | "body"> & { timeoutMs: number }
): Promise<T> => {
  try {
    const response = await adminFetch(input, {
      ...init,
      method: "GET",
    });
    if (!response.ok) {
      throw new AdminRequestError(await normalizeErrorPayload(response));
    }
    return (await response.json()) as T;
  } catch (error) {
    throw new AdminRequestError(normalizeThrownError(error));
  }
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
