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

import { POST } from "@/app/api/admin/trr-api/shows/[showId]/roles/route";
import { PATCH } from "@/app/api/admin/trr-api/shows/[showId]/roles/[roleId]/route";

describe("show role mutation proxy routes", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();

    requireAdminMock.mockResolvedValue(undefined);
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
  });

  it("returns 504 when create role request times out", async () => {
    getBackendApiUrlMock.mockReturnValue(
      "https://backend.example.com/api/v1/admin/shows/show-1/roles"
    );
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    const fetchMock = vi.fn().mockRejectedValue(abortError);
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest("http://localhost/api/admin/trr-api/shows/show-1/roles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Housewife" }),
    });
    const response = await POST(request, { params: Promise.resolve({ showId: "show-1" }) });
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(504);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(payload.error).toContain("timed out after 60s");
  });

  it("returns 504 when update role request times out", async () => {
    getBackendApiUrlMock.mockReturnValue(
      "https://backend.example.com/api/v1/admin/shows/show-1/roles/role-1"
    );
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    const fetchMock = vi.fn().mockRejectedValue(abortError);
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/roles/role-1",
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      }
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ showId: "show-1", roleId: "role-1" }),
    });
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(504);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(payload.error).toContain("timed out after 60s");
  });

  it("passes through backend mutation error status and detail", async () => {
    getBackendApiUrlMock.mockReturnValue(
      "https://backend.example.com/api/v1/admin/shows/show-1/roles/role-1"
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Role already exists", detail: "duplicate" }), {
          status: 409,
          headers: { "content-type": "application/json" },
        })
      )
    );

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/roles/role-1",
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Housewife" }),
      }
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ showId: "show-1", roleId: "role-1" }),
    });
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(409);
    expect(payload.error).toBe("Role already exists");
  });
});
