import "server-only";

export class TimeoutSafeFetchTimeoutError extends Error {
  readonly timeoutMs: number;
  readonly timeoutName: string;

  constructor(message: string, options: { timeoutMs: number; timeoutName: string; cause?: unknown }) {
    super(message, { cause: options.cause });
    this.name = "TimeoutSafeFetchTimeoutError";
    this.timeoutMs = options.timeoutMs;
    this.timeoutName = options.timeoutName;
  }
}

export type TimeoutSafeFetchInit = RequestInit & {
  timeoutMs: number;
  timeoutName?: string;
  fetchImpl?: typeof fetch;
};

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === "AbortError";

export const isTimeoutSafeFetchTimeoutError = (
  error: unknown,
): error is TimeoutSafeFetchTimeoutError => error instanceof TimeoutSafeFetchTimeoutError;

export async function timeoutSafeFetch(
  input: RequestInfo | URL,
  init: TimeoutSafeFetchInit,
): Promise<Response> {
  const { timeoutMs, timeoutName = "default", fetchImpl = fetch, signal, ...fetchInit } = init;
  const boundedTimeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 30_000;
  const controller = new AbortController();
  let timedOut = false;
  let upstreamAborted = false;

  const onUpstreamAbort = () => {
    upstreamAborted = true;
    controller.abort(signal?.reason);
  };

  if (signal?.aborted) {
    onUpstreamAbort();
  } else {
    signal?.addEventListener("abort", onUpstreamAbort, { once: true });
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, boundedTimeoutMs);

  try {
    return await fetchImpl(input, {
      ...fetchInit,
      signal: controller.signal,
    });
  } catch (error) {
    if (timedOut && isAbortError(error)) {
      throw new TimeoutSafeFetchTimeoutError(`Fetch timed out after ${boundedTimeoutMs}ms`, {
        timeoutMs: boundedTimeoutMs,
        timeoutName,
        cause: error,
      });
    }
    throw error;
  } finally {
    clearTimeout(timer);
    if (!upstreamAborted) {
      signal?.removeEventListener("abort", onUpstreamAbort);
    }
  }
}
