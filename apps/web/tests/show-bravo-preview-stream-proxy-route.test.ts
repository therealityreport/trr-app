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

import { POST } from "@/app/api/admin/trr-api/shows/[showId]/import-bravo/preview/stream/route";

const makeRequest = () =>
  new NextRequest(
    "http://localhost/api/admin/trr-api/shows/show-1/import-bravo/preview/stream",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        show_url: "https://www.bravotv.com/the-real-housewives-of-salt-lake-city",
        cast_only: true,
      }),
    },
  );

describe("show bravo preview stream proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();
    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue(
      "https://backend.example.com/api/v1/admin/shows/show-1/import-bravo/preview/stream",
    );
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
  });

  it("streams backend SSE response through unchanged", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          "event: start\ndata: {\"total\":2}\n\nevent: progress\ndata: {\"status\":\"ok\"}\n\n",
          { status: 200, headers: { "content-type": "text/event-stream" } },
        ),
      ),
    );

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ showId: "show-1" }),
    });
    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(payload).toContain("event: start");
    expect(payload).toContain("\"status\":\"ok\"");
  });

  it("retries once on retryable upstream status before succeeding", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("upstream busy", {
          status: 503,
          headers: { "content-type": "text/plain" },
        }),
      )
      .mockResolvedValueOnce(
        new Response("event: complete\ndata: {\"bravo_candidates_tested\":2}\n\n", {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ showId: "show-1" }),
    });
    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(payload).toContain("event: complete");
    expect(payload).toContain("\"bravo_candidates_tested\":2");
  });

  it("returns SSE error envelope when retry budget is exhausted", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    const fetchMock = vi.fn().mockRejectedValue(abortError);
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ showId: "show-1" }),
    });
    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(payload).toContain("event: error");
    expect(payload).toContain("\"stage\":\"proxy\"");
    expect(payload).toContain("\"error\":\"Backend fetch failed\"");
  });
});
