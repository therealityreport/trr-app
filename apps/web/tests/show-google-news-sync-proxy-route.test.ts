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

import { POST } from "@/app/api/admin/trr-api/shows/[showId]/google-news/sync/route";

describe("show google-news sync proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    getInternalAdminBearerTokenMock.mockReset();
    vi.restoreAllMocks();

    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue(
      "https://backend.example.com/api/v1/admin/shows/show-1/google-news/sync"
    );
    getInternalAdminBearerTokenMock.mockReturnValue("internal-admin-token");
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
  });

  it("forwards force + async sync payload and ownership headers to backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ synced: true, count: 12 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest("http://localhost/api/admin/trr-api/shows/show-1/google-news/sync", {
      method: "POST",
      body: JSON.stringify({ force: true, async: true }),
      headers: {
        "content-type": "application/json",
        "x-trr-request-id": "req-1",
        "x-trr-tab-session-id": "tab-1",
        "x-trr-flow-key": "flow-1",
      },
    });

    const response = await POST(request, { params: Promise.resolve({ showId: "show-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.synced).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.example.com/api/v1/admin/shows/show-1/google-news/sync",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        headers: expect.objectContaining({
          "x-trr-request-id": "req-1",
          "x-trr-tab-session-id": "tab-1",
          "x-trr-flow-key": "flow-1",
        }),
      })
    );
    const fetchArgs = fetchMock.mock.calls[0]?.[1] as { body?: string };
    expect(fetchArgs.body).toBe(JSON.stringify({ force: true, async: true }));
  });
});
