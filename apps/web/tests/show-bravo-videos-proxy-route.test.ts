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

import { GET } from "@/app/api/admin/trr-api/shows/[showId]/bravo/videos/route";

describe("show bravo videos proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();

    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue("https://backend.example.com/api/v1/admin/shows/show-1/bravo/videos");
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
  });

  it("passes query parameters through to backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ videos: [{ clip_url: "https://www.bravotv.com/v/1" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/bravo/videos?season_number=2&merge_person_sources=true"
    );

    const response = await GET(request, { params: Promise.resolve({ showId: "show-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.videos).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.example.com/api/v1/admin/shows/show-1/bravo/videos?season_number=2&merge_person_sources=true",
      expect.objectContaining({
        cache: "no-store",
      })
    );
  });
});
