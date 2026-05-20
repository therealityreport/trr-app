import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isTimeoutSafeFetchTimeoutError,
  timeoutSafeFetch,
} from "@/lib/server/timeout-safe-fetch";

describe("timeoutSafeFetch", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("aborts the upstream fetch after the configured timeout", async () => {
    vi.useFakeTimers();
    const abortSpy = vi.fn();
    const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          abortSpy();
          const abortError = new Error("aborted");
          abortError.name = "AbortError";
          reject(abortError);
        });
      });
    }) as unknown as typeof fetch;

    const request = timeoutSafeFetch("https://backend.example.com/api/v1/test", {
      fetchImpl,
      timeoutMs: 25,
      timeoutName: "test-timeout",
    }).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(25);

    const error = await request;
    expect(error).toMatchObject({
      name: "TimeoutSafeFetchTimeoutError",
      timeoutMs: 25,
      timeoutName: "test-timeout",
    });
    expect(isTimeoutSafeFetchTimeoutError(error)).toBe(true);
    expect(abortSpy).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
