import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getBackendApiUrlMock, fetchMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/backend", () => ({
  getBackendApiUrl: getBackendApiUrlMock,
}));

import { GET } from "@/app/api/admin/trr-api/people/[personId]/fandom/route";

describe("person fandom proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    fetchMock.mockReset();
    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue("http://backend/api/v1/admin/person/person-1/fandom");
    vi.stubGlobal("fetch", fetchMock);
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role";
    delete process.env.TRR_BACKEND_SERVICE_TOKEN;
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    process.env.NODE_ENV = "test";
  });

  it("proxies backend fandom response", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ fandomData: [{ id: "f1" }], count: 1 }),
    });
    const request = new NextRequest("http://localhost/api/admin/trr-api/people/person-1/fandom");
    const response = await GET(request, { params: Promise.resolve({ personId: "person-1" }) });
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.count).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("prefers dedicated backend token when configured", async () => {
    process.env.TRR_BACKEND_SERVICE_TOKEN = "backend-token";
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ fandomData: [], count: 0 }),
    });
    const request = new NextRequest("http://localhost/api/admin/trr-api/people/person-1/fandom");
    await GET(request, { params: Promise.resolve({ personId: "person-1" }) });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend/api/v1/admin/person/person-1/fandom",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer backend-token",
        }),
      }),
    );
  });

  it("requires dedicated backend token in production", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.TRR_BACKEND_SERVICE_TOKEN;
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role";

    const request = new NextRequest("http://localhost/api/admin/trr-api/people/person-1/fandom");
    const response = await GET(request, { params: Promise.resolve({ personId: "person-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe("Backend auth not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
