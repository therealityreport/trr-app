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

import { POST } from "@/app/api/admin/trr-api/shows/[showId]/links/discover/stream/route";

const BACKEND_STREAM_URL =
  "https://backend.example.com/api/v1/admin/shows/show-1/links/discover/stream";
const BACKEND_HEALTH_URL = "https://backend.example.com/health";

const makeRequest = () =>
  new NextRequest("http://localhost/api/admin/trr-api/shows/show-1/links/discover/stream", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ include_seasons: true, include_people: true }),
  });

describe("show links discover stream proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();
    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue(BACKEND_STREAM_URL);
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
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
});
