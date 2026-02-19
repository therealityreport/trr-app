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

import { GET } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/fandom/route";

describe("season fandom proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    fetchMock.mockReset();
    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue("http://backend/api/v1/admin/shows/show-1/seasons/1/fandom");
    vi.stubGlobal("fetch", fetchMock);
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role";
  });

  it("returns backend season fandom payload", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ fandomData: [{ id: "sf1" }], count: 1 }),
    });

    const request = new NextRequest("http://localhost/api/admin/trr-api/shows/show-1/seasons/1/fandom");
    const response = await GET(request, {
      params: Promise.resolve({ showId: "show-1", seasonNumber: "1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.count).toBe(1);
  });
});
