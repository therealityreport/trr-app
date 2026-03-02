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

import { GET as GET_FAMILIES, POST as POST_FAMILIES } from "@/app/api/admin/trr-api/brands/families/route";
import { GET as GET_BY_ENTITY } from "@/app/api/admin/trr-api/brands/families/by-entity/route";


describe("brands families proxy routes", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();

    requireAdminMock.mockResolvedValue(undefined);
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
  });

  it("GET /families forwards query params", async () => {
    getBackendApiUrlMock.mockReturnValue("https://backend.example.com/api/v1/admin/brands/families");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ rows: [], count: 0 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET_FAMILIES(new NextRequest("http://localhost/api/admin/trr-api/brands/families?active_only=true"));
    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toContain("active_only=true");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      headers: {
        Authorization: "Bearer service-role-secret",
      },
    });
  });

  it("POST /families forwards payload", async () => {
    getBackendApiUrlMock.mockReturnValue("https://backend.example.com/api/v1/admin/brands/families");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "fam-1", display_name: "NBCU Family" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest("http://localhost/api/admin/trr-api/brands/families", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ display_name: "NBCU Family" }),
    });

    const response = await POST_FAMILIES(request);
    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ display_name: "NBCU Family" }),
    });
  });

  it("GET /families/by-entity forwards entity parameters", async () => {
    getBackendApiUrlMock.mockReturnValue("https://backend.example.com/api/v1/admin/brands/families/by-entity");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ family: null, family_suggestions: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET_BY_ENTITY(
      new NextRequest("http://localhost/api/admin/trr-api/brands/families/by-entity?entity_type=network&entity_key=bravo"),
    );
    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toContain("entity_type=network");
    expect(fetchMock.mock.calls[0][0]).toContain("entity_key=bravo");
  });
});
