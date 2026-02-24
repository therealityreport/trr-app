import { afterEach, describe, expect, it, vi } from "vitest";
import { adminFetch, fetchWithTimeout } from "@/lib/admin/admin-fetch";

const createAbortableNeverFetch = () =>
  vi.fn((_: RequestInfo | URL, init?: RequestInit) => {
    const signal = init?.signal as AbortSignal | undefined;
    return new Promise<Response>((_resolve, reject) => {
      if (!signal) return;
      if (signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      signal.addEventListener("abort", () => {
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
  });

describe("admin-fetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("applies timeout and aborts stalled requests", async () => {
    const fetchMock = createAbortableNeverFetch();
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchWithTimeout("/api/test", {}, 5)).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("forwards external abort signal", async () => {
    const fetchMock = createAbortableNeverFetch();
    vi.stubGlobal("fetch", fetchMock);

    const external = new AbortController();
    const pending = fetchWithTimeout("/api/test", {}, 1000, external.signal);
    external.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });

  it("provides adminFetch convenience wrapper", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await adminFetch("/api/test", {
      method: "POST",
      body: JSON.stringify({ hello: "world" }),
      timeoutMs: 1000,
    });

    expect(response.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
