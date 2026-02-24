import { beforeEach, describe, expect, it, vi } from "vitest";
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

describe("person fandom route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    fetchMock.mockReset();
    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue("http://backend/api/v1/admin/person/person-1/fandom");
    vi.stubGlobal("fetch", fetchMock);
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role";
    delete process.env.TRR_BACKEND_SERVICE_TOKEN;
  });

  it("forwards showId query param to repository for show-scoped relationship fallback", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ fandomData: [{ id: "f1" }], count: 1 }),
    });

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/people/person-1/fandom?showId=show-123"
    );

    const response = await GET(request, {
      params: Promise.resolve({ personId: "person-1" }),
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend/api/v1/admin/person/person-1/fandom?showId=show-123",
      expect.objectContaining({ method: "GET" }),
    );
  });
});
