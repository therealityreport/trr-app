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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const forwardAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
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
  if (error instanceof Error && error.name === "AbortError") {
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
    const response = await adminFetch(input, requestInit);
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
        await onEvent({ event: eventType, payload });
        boundaryIndex = buffer.indexOf("\n\n");
      }
    }
  } catch (error) {
    throw new AdminRequestError(normalizeThrownError(error));
  }
};
