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

import { POST } from "@/app/api/admin/trr-api/shows/[showId]/links/discover/route";

const makeRequest = () =>
  new NextRequest("http://localhost/api/admin/trr-api/shows/show-1/links/discover", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ include_seasons: true, include_people: true }),
  });

describe("show links discover proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();
    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue(
      "https://backend.example.com/api/v1/admin/shows/show-1/links/discover"
    );
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
  });

  it("returns structured request_abort errors when backend fetch fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("signal is aborted without reason"));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ showId: "show-1" }),
    });
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(502);
    expect(payload.error).toBe("Backend discover request failed");
    expect(payload.reason).toBe("request_abort");
  });

  it("passes backend timeout reasons through response payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: "Links discovery timed out", reason: "server_processing_timeout", detail: "stage=people" }),
        {
          status: 504,
          headers: { "content-type": "application/json" },
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ showId: "show-1" }),
    });
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(504);
    expect(payload.reason).toBe("server_processing_timeout");
    expect(payload.error).toBe("Links discovery timed out");
    expect(payload.detail).toBe("stage=people");
  });
});
