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

import { POST } from "@/app/api/admin/trr-api/people/[personId]/reprocess-images/stream/route";

const BACKEND_STREAM_URL = "https://backend.example.com/api/v1/admin/person/person-1/reprocess-images/stream";
const BACKEND_HEALTH_URL = "https://backend.example.com/health";

const makeRequest = (requestId?: string) =>
  new NextRequest(
    "http://localhost/api/admin/trr-api/people/person-1/reprocess-images/stream",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(requestId ? { "x-trr-request-id": requestId } : {}),
      },
      body: JSON.stringify({}),
    },
  );

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

describe("person reprocess-images stream proxy route", () => {
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

  it("retries on transient backend error before succeeding", async () => {
    let streamAttempts = 0;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === BACKEND_HEALTH_URL) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }
      streamAttempts += 1;
      if (streamAttempts === 1) {
        return Promise.reject(new Error("fetch failed"));
      }
      return Promise.resolve(
        new Response("event: progress\ndata: {\"stage\":\"auto_count\"}\n\n", {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        })
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest("req-reprocess-1"), {
      params: Promise.resolve({ personId: "person-1" }),
    });
    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(payload).toContain("\"auto_count\"");
  });

  it("forwards x-trr-request-id to backend", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === BACKEND_HEALTH_URL) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }
      return Promise.resolve(
        new Response("event: progress\ndata: {\"stage\":\"auto_count\"}\n\n", {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        })
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest("req-reprocess-forward"), {
      params: Promise.resolve({ personId: "person-1" }),
    });
    await response.text();

    const streamCall = fetchMock.mock.calls.find((call) => String(call[0]) === BACKEND_STREAM_URL);
    const callHeaders = streamCall?.[1]?.headers as Record<string, string> | undefined;
    expect(callHeaders?.["x-trr-request-id"]).toBe("req-reprocess-forward");
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
              new Response("event: progress\ndata: {\"stage\":\"auto_count\"}\n\n", {
                status: 200,
                headers: { "content-type": "text/event-stream" },
              })
            ),
          80
        );
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest("req-reprocess-heartbeat"), {
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

  it("surfaces backend fetch failures as terminal SSE error events", async () => {
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

    const response = await POST(makeRequest("req-reprocess-connect-fail"), {
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
          evt.data.checkpoint === "connect_exhausted" &&
          evt.data.is_terminal === true
      )
    ).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it("returns terminal SSE error payload when backend fails", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === BACKEND_HEALTH_URL) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }
      return Promise.resolve(new Response("bad gateway", { status: 502 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest("req-reprocess-2"), {
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
          evt.data.error === "Backend reprocess failed" &&
          evt.data.is_terminal === true &&
          evt.data.checkpoint === "backend_http_error"
      )
    ).toBe(true);
    expect(payload).toContain("\"request_id\":\"req-reprocess-2\"");
  });

  it("fails fast with BACKEND_UNRESPONSIVE when health preflight fails", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === BACKEND_HEALTH_URL) {
        return Promise.reject(new Error("fetch failed"));
      }
      return Promise.resolve(
        new Response("event: progress\ndata: {\"stage\":\"auto_count\"}\n\n", {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        })
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest("req-reprocess-preflight-fail"), {
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
