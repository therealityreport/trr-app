import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

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

import { POST } from "@/app/api/admin/trr-api/shows/[showId]/cast-matrix/sync/route";

describe("show cast-matrix sync proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();

    requireAdminMock.mockResolvedValue({ uid: "admin-test-user" });
    getBackendApiUrlMock.mockReturnValue(
      "https://backend.example.com/api/v1/admin/shows/show-1/cast-matrix/sync"
    );
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
  });

  it("posts sync payload to backend and returns result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          show_id: "show-1",
          counts: { season_role_assignments_upserted: 12 },
          unmatched: { cast_names: [] },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/cast-matrix/sync",
      {
        method: "POST",
        body: JSON.stringify({
          season_numbers: [1, 2, 3],
          include_relationship_roles: true,
          include_bravo_links: true,
          include_bravo_images: true,
          dry_run: false,
        }),
      }
    );

    const response = await POST(request, { params: Promise.resolve({ showId: "show-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.show_id).toBe("show-1");
    expect(payload.counts?.season_role_assignments_upserted).toBe(12);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.example.com/api/v1/admin/shows/show-1/cast-matrix/sync",
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("returns actionable backend connectivity error when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/cast-matrix/sync",
      {
        method: "POST",
        body: JSON.stringify({ season_numbers: [1] }),
      }
    );

    const response = await POST(request, { params: Promise.resolve({ showId: "show-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload.error).toContain("Could not reach TRR-Backend");
    expect(payload.error).toContain("https://backend.example.com/api/v1/admin/shows/show-1/cast-matrix/sync");
  });
});
