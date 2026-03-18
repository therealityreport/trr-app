import { afterEach, describe, expect, it, vi } from "vitest";
import { adminFetch, adminMutation, adminStream, fetchWithTimeout } from "@/lib/admin/admin-fetch";
import {
  getAdminOperationSession,
  upsertAdminOperationSession,
} from "@/lib/admin/operation-session";

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
    window.sessionStorage.clear();
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

  it("parses SSE events with adminStream", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'event: progress\ndata: {"stage":"Batch Jobs","current":1,"total":2}\n\n' +
              'event: complete\ndata: {"attempted":2}\n\n'
          )
        );
        controller.close();
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const onEvent = vi.fn();

    await adminStream("/api/test/stream", {
      method: "POST",
      timeoutMs: 1000,
      onEvent,
    });

    expect(onEvent).toHaveBeenCalledWith({
      event: "progress",
      payload: { stage: "Batch Jobs", current: 1, total: 2 },
    });
    expect(onEvent).toHaveBeenCalledWith({
      event: "complete",
      payload: { attempted: 2 },
    });
  });

  it("normalizes 'signal is aborted without reason' errors to retryable timeout", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("signal is aborted without reason"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      adminMutation("/api/test", {
        method: "POST",
        timeoutMs: 1000,
      })
    ).rejects.toMatchObject({
      name: "AdminRequestError",
      status: 408,
      retryable: true,
      message: "Request timed out",
    });
  });

  it("stores operation_id and event_seq from stream payloads", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'event: progress\ndata: {"operation_id":"op-1","event_seq":3,"stage":"start"}\n\n' +
              'event: complete\ndata: {"operation_id":"op-1","event_seq":4,"attempted":1}\n\n'
          )
        );
        controller.close();
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await adminStream("/api/test/stream", {
      method: "POST",
      body: JSON.stringify({ include: true }),
      timeoutMs: 1000,
      onEvent: vi.fn(),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const fetchHeaders = new Headers((fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)?.headers);
    expect(fetchHeaders.get("x-trr-flow-key")).toEqual(expect.any(String));

    const session = getAdminOperationSession("POST:/api/test/stream:16");
    expect(session?.operationId).toBe("op-1");
    expect(session?.lastEventSeq).toBe(4);
    expect(session?.status).toBe("completed");
  });

  it("resumes active operation stream before starting a new stream request", async () => {
    upsertAdminOperationSession("POST:/api/test/stream:14", {
      flowKey: "flow-abc",
      input: "/api/test/stream",
      method: "POST",
      status: "active",
      operationId: "op-123",
      lastEventSeq: 5,
    });

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('event: complete\ndata: {"operation_id":"op-123","event_seq":6}\n\n')
        );
        controller.close();
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await adminStream("/api/test/stream", {
      method: "POST",
      body: JSON.stringify({ retry: true }),
      timeoutMs: 1000,
      onEvent: vi.fn(),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/admin/trr-api/operations/op-123/stream?after_seq=5"
    );
    const requestInit = (fetchMock.mock.calls[0]?.[1] as RequestInit | undefined) ?? {};
    expect(requestInit.method).toBe("GET");
  });

  it("uses x-trr-request-id to isolate new POST streams from stale resumable sessions", async () => {
    upsertAdminOperationSession("POST:/api/test/stream:stale-request", {
      flowKey: "flow-stale",
      input: "/api/test/stream",
      method: "POST",
      status: "active",
      operationId: "op-stale",
      lastEventSeq: 8,
    });

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('event: complete\ndata: {"operation_id":"op-new","event_seq":1}\n\n')
        );
        controller.close();
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await adminStream("/api/test/stream", {
      method: "POST",
      headers: {
        "x-trr-request-id": "req-fresh-123",
      },
      body: JSON.stringify({ retry: true }),
      timeoutMs: 1000,
      onEvent: vi.fn(),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/test/stream");
    const requestInit = (fetchMock.mock.calls[0]?.[1] as RequestInit | undefined) ?? {};
    expect(requestInit.method).toBe("POST");
    const requestHeaders = new Headers(requestInit.headers);
    expect(requestHeaders.get("x-trr-request-id")).toBe("req-fresh-123");
    expect(getAdminOperationSession("POST:/api/test/stream:req-fresh-123")?.status).toBe("completed");
  });
});
