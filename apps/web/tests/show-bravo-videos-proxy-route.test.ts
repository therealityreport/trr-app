import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getBackendApiUrlMock, getInternalAdminBearerTokenMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
  getInternalAdminBearerTokenMock: vi.fn(),
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

import { GET } from "@/app/api/admin/trr-api/shows/[showId]/bravo/videos/route";

describe("show bravo videos proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    getInternalAdminBearerTokenMock.mockReset();
    vi.restoreAllMocks();

    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue("https://backend.example.com/api/v1/admin/shows/show-1/bravo/videos");
    getInternalAdminBearerTokenMock.mockReturnValue("internal-admin-token");
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

  it("retries without person-source merging when the backend times out under pressure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            detail: {
              code: "REQUEST_TIMEOUT",
              retryable: true,
            },
          }),
          {
            status: 504,
            headers: { "content-type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ videos: [{ clip_url: "https://www.bravotv.com/v/fallback" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/bravo/videos?merge_person_sources=true",
    );

    const response = await GET(request, { params: Promise.resolve({ showId: "show-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trr-bravo-videos-source")).toBe("backend-no-person-merge-fallback");
    expect(payload.videos).toHaveLength(1);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://backend.example.com/api/v1/admin/shows/show-1/bravo/videos?merge_person_sources=true",
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://backend.example.com/api/v1/admin/shows/show-1/bravo/videos?merge_person_sources=false",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("does not drop person merge when a person-specific request times out", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: { code: "REQUEST_TIMEOUT", retryable: true } }), {
        status: 504,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/bravo/videos?person_id=person-1&merge_person_sources=true",
    );

    const response = await GET(request, { params: Promise.resolve({ showId: "show-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(504);
    expect(payload.error).toBe("Failed to fetch bravo videos");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns a degraded empty payload when both non-person requests time out", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: { code: "REQUEST_TIMEOUT", retryable: true } }), {
          status: 504,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: { code: "REQUEST_TIMEOUT", retryable: true } }), {
          status: 504,
          headers: { "content-type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/bravo/videos?merge_person_sources=true",
    );

    const response = await GET(request, { params: Promise.resolve({ showId: "show-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trr-bravo-videos-source")).toBe("backend-timeout-degraded");
    expect(payload).toEqual({
      videos: [],
      items: [],
      degraded: true,
      degraded_reason: "backend_timeout",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns a degraded empty payload when non-person videos are unavailable", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/bravo/videos?merge_person_sources=false",
    );

    const response = await GET(request, { params: Promise.resolve({ showId: "show-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trr-bravo-videos-source")).toBe("backend-unavailable-degraded");
    expect(payload).toEqual({
      videos: [],
      items: [],
      degraded: true,
      degraded_reason: "backend_unavailable",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
