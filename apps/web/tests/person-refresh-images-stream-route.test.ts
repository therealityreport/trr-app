import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getBackendApiUrlMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/backend", () => ({
  getBackendApiUrl: getBackendApiUrlMock,
}));

import { POST } from "@/app/api/admin/trr-api/people/[personId]/refresh-images/stream/route";

const BACKEND_STREAM_URL = "https://backend.example.com/api/v1/admin/person/person-1/refresh-images/stream";
const BACKEND_HEALTH_URL = "https://backend.example.com/health";

const makeRequest = (requestId?: string) =>
  new NextRequest("http://localhost/api/admin/trr-api/people/person-1/refresh-images/stream", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(requestId ? { "x-trr-request-id": requestId } : {}),
    },
    body: JSON.stringify({ force_mirror: true }),
  });

type SseEvent = {
  event: string;
  data: Record<string, unknown> | string | null;
};

const parseSseEvents = (payload: string): SseEvent[] => {
  const blocks = payload.replace(/\r\n/g, "\n").split("\n\n").filter(Boolean);
  return blocks.map((block) => {
    const lines = block.split("\n");
    const event = lines.find((line) => line.startsWith("event:"))?.slice(6).trim() || "message";
    const dataRaw = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");
    let data: Record<string, unknown> | string | null = null;
    if (dataRaw) {
      try {
        data = JSON.parse(dataRaw) as Record<string, unknown>;
      } catch {
        data = dataRaw;
      }
    }
    return { event, data };
  });
};

describe("person refresh-images stream proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();
    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue(BACKEND_STREAM_URL);
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    process.env.TRR_STREAM_CONNECT_ATTEMPT_TIMEOUT_MS = "20000";
    process.env.TRR_STREAM_CONNECT_HEARTBEAT_INTERVAL_MS = "2000";
    process.env.TRR_STREAM_CONNECT_PREFLIGHT_TIMEOUT_MS = "3000";
  });

  it("emits immediate proxy_connecting progress and forwards backend SSE", async () => {
    const body = "event: progress\ndata: {\"stage\":\"sync_imdb\"}\n\n";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } })
    );
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === BACKEND_HEALTH_URL) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }
      return Promise.resolve(
        new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } })
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest("req-person-2"), {
      params: Promise.resolve({ personId: "person-1" }),
    });
    const payload = await response.text();
    const events = parseSseEvents(payload);

    expect(response.status).toBe(200);
    expect(events.some((evt) => evt.event === "progress")).toBe(true);
    expect(
      events.some(
        (evt) =>
          evt.event === "progress" &&
          typeof evt.data === "object" &&
          evt.data !== null &&
          evt.data.stage === "proxy_connecting"
      )
    ).toBe(true);
    expect(
      events.some(
        (evt) =>
          evt.event === "progress" &&
          typeof evt.data === "object" &&
          evt.data !== null &&
          evt.data.stage === "proxy_connecting" &&
          evt.data.checkpoint === "proxy_connected" &&
          evt.data.stream_state === "connected"
      )
    ).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(payload).toContain("\"sync_imdb\"");
  });

  it("emits connect heartbeat progress while backend connect is pending", async () => {
    process.env.TRR_STREAM_CONNECT_ATTEMPT_TIMEOUT_MS = "500";
    process.env.TRR_STREAM_CONNECT_HEARTBEAT_INTERVAL_MS = "20";

    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === BACKEND_HEALTH_URL) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }
      return new Promise((resolve) => {
        setTimeout(
          () =>
            resolve(
              new Response("event: progress\ndata: {\"stage\":\"sync_imdb\"}\n\n", {
                status: 200,
                headers: { "content-type": "text/event-stream" },
              })
            ),
          80
        );
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest("req-heartbeat"), {
      params: Promise.resolve({ personId: "person-1" }),
    });
    const payload = await response.text();
    const events = parseSseEvents(payload);

    expect(response.status).toBe(200);
    expect(
      events.some(
        (evt) =>
          evt.event === "progress" &&
          typeof evt.data === "object" &&
          evt.data !== null &&
          evt.data.stage === "proxy_connecting" &&
          evt.data.checkpoint === "connect_wait" &&
          typeof evt.data.attempt_elapsed_ms === "number" &&
          evt.data.attempt_timeout_ms === 500
      )
    ).toBe(true);
  });

  it("forwards x-trr-request-id to backend", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === BACKEND_HEALTH_URL) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }
      return Promise.resolve(
        new Response("event: progress\ndata: {\"stage\":\"sync_imdb\"}\n\n", {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        })
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest("req-forward-1"), {
      params: Promise.resolve({ personId: "person-1" }),
    });
    await response.text();

    const streamCall = fetchMock.mock.calls.find((call) => String(call[0]) === BACKEND_STREAM_URL);
    const callHeaders = streamCall?.[1]?.headers as Record<string, string> | undefined;
    expect(callHeaders?.["x-trr-request-id"]).toBe("req-forward-1");
  });

  it("retries on transient backend fetch failure and emits retry progress", async () => {
    const transientError = new Error("fetch failed");
    let streamAttempts = 0;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === BACKEND_HEALTH_URL) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }
      streamAttempts += 1;
      if (streamAttempts === 1) {
        return Promise.reject(transientError);
      }
      return Promise.resolve(
        new Response("event: progress\ndata: {\"stage\":\"sync_tmdb\"}\n\n", {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        })
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest("req-person-1"), {
      params: Promise.resolve({ personId: "person-1" }),
    });
    const payload = await response.text();
    const events = parseSseEvents(payload);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(payload).toContain("\"sync_tmdb\"");
    expect(
      events.some(
        (evt) =>
          evt.event === "progress" &&
          typeof evt.data === "object" &&
          evt.data !== null &&
          evt.data.stage === "proxy_connecting" &&
          evt.data.retrying === true
      )
    ).toBe(true);
  });

  it("surfaces backend non-OK responses as SSE error events", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === BACKEND_HEALTH_URL) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }
      return Promise.resolve(new Response("backend unavailable", { status: 502 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest("req-person-1"), {
      params: Promise.resolve({ personId: "person-1" }),
    });
    const payload = await response.text();
    const events = parseSseEvents(payload);

    expect(response.status).toBe(200);
    expect(
      events.some(
        (evt) =>
          evt.event === "error" &&
          typeof evt.data === "object" &&
          evt.data !== null &&
          evt.data.stage === "backend" &&
          evt.data.error === "Backend refresh failed"
      )
    ).toBe(true);
  });

  it("surfaces backend fetch failures as SSE error events", async () => {
    const fetchError = new Error("fetch failed");
    (fetchError as Error & { cause: object }).cause = {
      code: "ECONNREFUSED",
      address: "127.0.0.1",
      port: 8000,
    };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === BACKEND_HEALTH_URL) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }
      return Promise.reject(fetchError);
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest("req-person-4"), {
      params: Promise.resolve({ personId: "person-1" }),
    });
    const payload = await response.text();
    const events = parseSseEvents(payload);

    expect(response.status).toBe(200);
    expect(
      events.some(
        (evt) =>
          evt.event === "error" &&
          typeof evt.data === "object" &&
          evt.data !== null &&
          evt.data.stage === "proxy_connecting" &&
          evt.data.error === "Backend fetch failed" &&
          evt.data.checkpoint === "connect_exhausted" &&
          evt.data.is_terminal === true
      )
    ).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it("fails fast with BACKEND_UNRESPONSIVE when health preflight fails", async () => {
    process.env.TRR_STREAM_CONNECT_PREFLIGHT_TIMEOUT_MS = "1000";
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === BACKEND_HEALTH_URL) {
        return Promise.reject(new Error("fetch failed"));
      }
      return Promise.resolve(
        new Response("event: progress\ndata: {\"stage\":\"sync_imdb\"}\n\n", {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        })
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest("req-preflight-fail"), {
      params: Promise.resolve({ personId: "person-1" }),
    });
    const payload = await response.text();
    const events = parseSseEvents(payload);

    expect(response.status).toBe(200);
    expect(
      events.some(
        (evt) =>
          evt.event === "error" &&
          typeof evt.data === "object" &&
          evt.data !== null &&
          evt.data.stage === "proxy_connecting" &&
          evt.data.checkpoint === "backend_preflight_failed" &&
          evt.data.error_code === "BACKEND_UNRESPONSIVE" &&
          evt.data.is_terminal === true
      )
    ).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
