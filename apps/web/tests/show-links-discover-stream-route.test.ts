import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getBackendApiUrlMock, getInternalAdminBearerTokenMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
  getInternalAdminBearerTokenMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/backend", () => ({
  getBackendApiUrl: getBackendApiUrlMock,
}));

vi.mock("@/lib/server/trr-api/internal-admin-auth", () => ({
  getInternalAdminBearerToken: getInternalAdminBearerTokenMock,
}));

import { POST } from "@/app/api/admin/trr-api/shows/[showId]/links/discover/stream/route";

const BACKEND_STREAM_URL =
  "https://backend.example.com/api/v1/admin/shows/show-1/links/discover/stream";
const BACKEND_HEALTH_URL = "https://backend.example.com/health";

const makeRequest = (headers?: Record<string, string>) =>
  new NextRequest("http://localhost/api/admin/trr-api/shows/show-1/links/discover/stream", {
    method: "POST",
    headers: { "content-type": "application/json", ...(headers ?? {}) },
    body: JSON.stringify({ include_seasons: true, include_people: true }),
  });

describe("show links discover stream proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    getInternalAdminBearerTokenMock.mockReset();
    vi.restoreAllMocks();
    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue(BACKEND_STREAM_URL);
    getInternalAdminBearerTokenMock.mockReturnValue("service-role-secret");
  });

  it("retries transient fetch errors and returns backend SSE stream", async () => {
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
        new Response('event: progress\\ndata: {"stage":"show_discovery_started"}\\n\\n', {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        })
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ showId: "show-1" }),
    });
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(text).toContain("show_discovery_started");
  });

  it("returns terminal backend_preflight_failed when health probe fails", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === BACKEND_HEALTH_URL) {
        return Promise.reject(new Error("fetch failed"));
      }
      return Promise.resolve(
        new Response('event: progress\\ndata: {"stage":"show_discovery_started"}\\n\\n', {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        })
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ showId: "show-1" }),
    });
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(text).toContain("\"checkpoint\":\"backend_preflight_failed\"");
    expect(text).toContain("\"error_code\":\"BACKEND_UNRESPONSIVE\"");
  });

  it("forwards local execution preference header to backend stream", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === BACKEND_HEALTH_URL) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }
      return Promise.resolve(
        new Response('event: complete\\ndata: {"status":"completed"}\\n\\n', {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        })
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      makeRequest({ "x-trr-prefer-local-execution": "1" }),
      { params: Promise.resolve({ showId: "show-1" }) }
    );
    await response.text();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const backendFetch = fetchMock.mock.calls[1];
    expect(String(backendFetch?.[0])).toBe(BACKEND_STREAM_URL);
    const forwardedHeaders = new Headers((backendFetch?.[1] as RequestInit | undefined)?.headers);
    expect(forwardedHeaders.get("x-trr-prefer-local-execution")).toBe("1");
  });

  it("fails fast on backend database configuration errors without exhausting retries", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === BACKEND_HEALTH_URL) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            detail: {
              code: "DATABASE_SERVICE_UNAVAILABLE",
              reason: "database_configuration",
              message:
                "Database service unavailable: runtime DB configuration is incomplete. Set TRR_DB_URL and optional TRR_DB_FALLBACK_URL.",
              retryable: true,
            },
          }),
          {
            status: 503,
            headers: { "content-type": "application/json" },
          }
        )
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ showId: "show-1" }),
    });
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(text).toContain("\"checkpoint\":\"backend_http_error\"");
    expect(text).toContain("\"error_code\":\"DATABASE_SERVICE_UNAVAILABLE\"");
    expect(text).toContain("Set TRR_DB_URL and optional TRR_DB_FALLBACK_URL");
  });
});
