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

import { POST } from "@/app/api/admin/trr-api/shows/[showId]/refresh-photos/stream/route";

const BACKEND_STREAM_URL = "https://backend.example.com/api/v1/admin/shows/show-1/refresh-photos/stream";
const BACKEND_HEALTH_URL = "https://backend.example.com/health";

const makeRequest = (requestId?: string) =>
  new NextRequest(
    "http://localhost/api/admin/trr-api/shows/show-1/refresh-photos/stream",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(requestId ? { "x-trr-request-id": requestId } : {}),
      },
      body: JSON.stringify({ skip_mirror: true, season_number: 6 }),
    },
  );

describe("show refresh-photos stream proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();
    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue(BACKEND_STREAM_URL);
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
  });

  it("retries on transient fetch failure and then streams success", async () => {
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
        new Response("event: progress\ndata: {\"stage\":\"sync_cast_photos\"}\n\n", {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        })
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest("req-route-123"), {
      params: Promise.resolve({ showId: "show-1" }),
    });
    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(payload).toContain("\"sync_cast_photos\"");
    const streamCall = fetchMock.mock.calls.find((call) => String(call[0]) === BACKEND_STREAM_URL);
    const finalBody = (streamCall?.[1] as RequestInit | undefined)?.body;
    expect(typeof finalBody).toBe("string");
    const parsedBody = JSON.parse(String(finalBody)) as Record<string, unknown>;
    expect(parsedBody.skip_s3).toBe(true);
    expect(parsedBody.season_number).toBe(6);
    const callHeaders = (streamCall?.[1] as RequestInit | undefined)?.headers as
      | Record<string, string>
      | undefined;
    expect(callHeaders?.["x-trr-request-id"]).toBe("req-route-123");
  });

  it("includes request_id in SSE proxy error payload", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === BACKEND_HEALTH_URL) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }
      return Promise.reject(new Error("fetch failed"));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest("req-route-error-1"), {
      params: Promise.resolve({ showId: "show-1" }),
    });
    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(payload).toContain("\"request_id\":\"req-route-error-1\"");
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it("fails fast with backend_preflight_failed when health preflight fails", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === BACKEND_HEALTH_URL) {
        return Promise.reject(new Error("fetch failed"));
      }
      return Promise.resolve(new Response("event: progress\ndata: {\"stage\":\"sync_cast_photos\"}\n\n", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest("req-route-preflight"), {
      params: Promise.resolve({ showId: "show-1" }),
    });
    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(payload).toContain("\"checkpoint\":\"backend_preflight_failed\"");
    expect(payload).toContain("\"error_code\":\"BACKEND_UNRESPONSIVE\"");
    expect(payload).toContain("\"request_id\":\"req-route-preflight\"");
  });
});
