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

import { POST } from "@/app/api/admin/trr-api/people/[personId]/refresh-profile/stream/route";

const BACKEND_STREAM_URL = "https://backend.example.com/api/v1/admin/person/person-1/refresh-profile/stream";
const BACKEND_HEALTH_URL = "https://backend.example.com/health";

const makeRequest = () =>
  new NextRequest("http://localhost/api/admin/trr-api/people/person-1/refresh-profile/stream", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ refresh_links: true, refresh_credits: true }),
  });

describe("person refresh-profile stream proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();
    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue(BACKEND_STREAM_URL);
    getInternalAdminBearerTokenMock.mockReturnValue("internal-admin-bearer");
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    process.env.TRR_STREAM_CONNECT_ATTEMPT_TIMEOUT_MS = "20000";
    process.env.TRR_STREAM_CONNECT_HEARTBEAT_INTERVAL_MS = "2000";
    process.env.TRR_STREAM_CONNECT_PREFLIGHT_TIMEOUT_MS = "3000";
  });

  it("emits proxy progress and forwards backend SSE", async () => {
    const body = "event: progress\ndata: {\"stage\":\"profile_tmdb\"}\n\n";
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === BACKEND_HEALTH_URL) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }
      return Promise.resolve(
        new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } })
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ personId: "person-1" }),
    });
    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(payload).toContain("\"proxy_connecting\"");
    expect(payload).toContain("\"profile_tmdb\"");
    const streamCall = fetchMock.mock.calls.find((call) => String(call[0]) === BACKEND_STREAM_URL);
    expect(streamCall?.[1]).toMatchObject({ method: "POST", dispatcher: expect.anything() });
  });
});
