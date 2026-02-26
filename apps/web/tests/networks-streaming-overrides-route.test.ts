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

import { GET, POST } from "@/app/api/admin/networks-streaming/overrides/route";
import { DELETE, PATCH } from "@/app/api/admin/networks-streaming/overrides/[id]/route";

describe("networks-streaming overrides proxy routes", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();

    requireAdminMock.mockResolvedValue(undefined);
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
  });

  it("GET forwards query params and auth header", async () => {
    getBackendApiUrlMock.mockReturnValue("https://backend.example.com/api/v1/admin/shows/networks-streaming/overrides");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: "1", entity_type: "network", entity_key: "bravo", is_active: true }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/networks-streaming/overrides?entity_type=network&active_only=false"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(payload)).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toContain("entity_type=network");
    expect(fetchMock.mock.calls[0][0]).toContain("active_only=false");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      headers: {
        Authorization: "Bearer service-role-secret",
      },
    });
  });

  it("POST forwards payload", async () => {
    getBackendApiUrlMock.mockReturnValue("https://backend.example.com/api/v1/admin/shows/networks-streaming/overrides");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "1", entity_type: "network", entity_key: "bravo", is_active: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest("http://localhost/api/admin/networks-streaming/overrides", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entity_type: "network", entity_key: "bravo" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer service-role-secret",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ entity_type: "network", entity_key: "bravo" }),
    });
  });

  it("PATCH and DELETE forward dynamic id routes", async () => {
    getBackendApiUrlMock.mockImplementation((path: string) => `https://backend.example.com/api/v1${path}`);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "123", entity_type: "network", entity_key: "bravo", is_active: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "deleted", id: "123" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const patchReq = new NextRequest("http://localhost/api/admin/networks-streaming/overrides/123", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notes: "updated" }),
    });

    const patchResponse = await PATCH(patchReq, { params: Promise.resolve({ id: "123" }) });
    expect(patchResponse.status).toBe(200);

    const deleteReq = new NextRequest("http://localhost/api/admin/networks-streaming/overrides/123", {
      method: "DELETE",
    });

    const deleteResponse = await DELETE(deleteReq, { params: Promise.resolve({ id: "123" }) });
    expect(deleteResponse.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe("https://backend.example.com/api/v1/admin/shows/networks-streaming/overrides/123");
    expect(fetchMock.mock.calls[1][0]).toBe("https://backend.example.com/api/v1/admin/shows/networks-streaming/overrides/123");
  });

  it("returns stable error codes for override auth and backend configuration failures", async () => {
    getBackendApiUrlMock.mockReturnValue("https://backend.example.com/api/v1/admin/shows/networks-streaming/overrides");

    delete process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    const noAuthResponse = await GET(new NextRequest("http://localhost/api/admin/networks-streaming/overrides"));
    expect(noAuthResponse.status).toBe(500);
    await expect(noAuthResponse.json()).resolves.toMatchObject({
      error_code: "backend_override_unavailable",
    });

    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const upstreamAuthFailResponse = await GET(
      new NextRequest("http://localhost/api/admin/networks-streaming/overrides"),
    );
    expect(upstreamAuthFailResponse.status).toBe(403);
    await expect(upstreamAuthFailResponse.json()).resolves.toMatchObject({
      error_code: "not_authenticated_for_overrides",
      error: "Not authenticated",
    });
  });
});
