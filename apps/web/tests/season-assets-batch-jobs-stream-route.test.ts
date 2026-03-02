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

import { POST } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets/batch-jobs/stream/route";

const BACKEND_STREAM_URL =
  "https://backend.example.com/api/v1/admin/shows/show-1/seasons/6/assets/batch-jobs/stream";
const BACKEND_HEALTH_URL = "https://backend.example.com/health";

describe("season assets batch jobs stream proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();
    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue(BACKEND_STREAM_URL);
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
  });

  it("proxies season-scoped stream request to backend endpoint", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === BACKEND_HEALTH_URL) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }
      return Promise.resolve(
        new Response("event: complete\ndata: {\"skipped\":2}\n\n", {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        })
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new NextRequest(
        "http://localhost/api/admin/trr-api/shows/show-1/seasons/6/assets/batch-jobs/stream",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            operations: ["id_text"],
            content_types: ["episode_stills"],
            targets: [{ origin: "cast_photos", id: "a2" }],
          }),
        }
      ),
      { params: Promise.resolve({ showId: "show-1", seasonNumber: "6" }) }
    );
    await response.text();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const streamCall = fetchMock.mock.calls.find((call) => String(call[0]) === BACKEND_STREAM_URL);
    expect(streamCall?.[0]).toContain("/shows/show-1/seasons/6/assets/batch-jobs/stream");
  });

  it("emits terminal backend_preflight_failed when backend health preflight fails", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === BACKEND_HEALTH_URL) {
        return Promise.reject(new Error("fetch failed"));
      }
      return Promise.resolve(new Response("event: complete\ndata: {\"skipped\":2}\n\n", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new NextRequest(
        "http://localhost/api/admin/trr-api/shows/show-1/seasons/6/assets/batch-jobs/stream",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ operations: ["id_text"] }),
        }
      ),
      { params: Promise.resolve({ showId: "show-1", seasonNumber: "6" }) }
    );
    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(payload).toContain("\"checkpoint\":\"backend_preflight_failed\"");
    expect(payload).toContain("\"error_code\":\"BACKEND_UNRESPONSIVE\"");
  });
});
