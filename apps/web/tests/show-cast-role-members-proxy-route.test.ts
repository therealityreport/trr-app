import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";

process.env.TRR_ADMIN_ROUTE_CACHE_DISABLED = "1";

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

import { GET } from "@/app/api/admin/trr-api/shows/[showId]/cast-role-members/route";

describe("show cast-role-members proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();
    invalidateRouteResponseCache("admin-show-cast-role-members");

    requireAdminMock.mockResolvedValue({ uid: "admin-test-user" });
    getBackendApiUrlMock.mockReturnValue(
      "https://backend.example.com/api/v1/admin/shows/show-1/cast-role-members"
    );
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
  });

  it("returns cast-role-members payload on successful backend response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ person_id: "person-1", roles: ["Housewife"] }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      )
    );

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/cast-role-members?seasons=4"
    );

    const response = await GET(request, { params: Promise.resolve({ showId: "show-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(payload)).toBe(true);
    expect((payload as Array<{ person_id: string }>)[0]?.person_id).toBe("person-1");
  });

  it("retries once on retryable upstream status and then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "gateway timeout" }), {
          status: 504,
          headers: { "content-type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ person_id: "person-2", roles: ["Friend"] }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/cast-role-members"
    );

    const response = await GET(request, { params: Promise.resolve({ showId: "show-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((payload as Array<{ person_id: string }>)[0]?.person_id).toBe("person-2");
  });

  it("returns timeout envelope with additive fields after retry budget is exhausted", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    const fetchMock = vi.fn().mockRejectedValue(abortError);
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/cast-role-members"
    );

    const response = await GET(request, { params: Promise.resolve({ showId: "show-1" }) });
    const payload = (await response.json()) as {
      error?: string;
      code?: string;
      retryable?: boolean;
      upstream_status?: number;
    };

    expect(response.status).toBe(504);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(payload.error).toContain("timed out after 120s");
    expect(payload.code).toBe("UPSTREAM_TIMEOUT");
    expect(payload.retryable).toBe(true);
    expect(payload.upstream_status).toBe(504);
  });
});
