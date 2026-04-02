import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getBackendApiUrlMock, fetchMock, getInternalAdminBearerTokenMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
  fetchMock: vi.fn(),
  getInternalAdminBearerTokenMock: vi.fn().mockReturnValue("test-admin-token"),
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

import { POST } from "@/app/api/admin/trr-api/social-growth/refresh-batch/route";

describe("social growth batch proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    fetchMock.mockReset();
    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue("http://backend/api/v1/admin/people/socialblade/refresh-batch");
    vi.stubGlobal("fetch", fetchMock);
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("proxies batch refresh requests to the backend", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ accepted: [{ personId: "person-1", handle: "lisabarlow14" }], skipped: [], errors: [] }),
    });

    const request = new NextRequest("http://localhost/api/admin/trr-api/social-growth/refresh-batch", {
      method: "POST",
      body: JSON.stringify({
        source: "cast_comparison",
        force: true,
        items: [{ personId: "person-1", handle: "lisabarlow14" }],
      }),
    });
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.accepted).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      source: "cast_comparison",
      force: true,
      items: [{ personId: "person-1", handle: "lisabarlow14" }],
    });
  });

  it("rejects invalid sources before proxying", async () => {
    const request = new NextRequest("http://localhost/api/admin/trr-api/social-growth/refresh-batch", {
      method: "POST",
      body: JSON.stringify({
        source: "person_page",
        items: [{ personId: "person-1", handle: "lisabarlow14" }],
      }),
    });
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("source");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
