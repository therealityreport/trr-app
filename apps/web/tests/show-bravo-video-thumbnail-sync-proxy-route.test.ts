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

import { POST } from "@/app/api/admin/trr-api/shows/[showId]/bravo/videos/sync-thumbnails/route";

describe("show bravo video-thumbnail sync proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();

    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue(
      "https://backend.example.com/api/v1/admin/shows/show-1/bravo/videos/sync-thumbnails"
    );
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
  });

  it("forwards sync request payload to backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ video_thumbnail_sync: { attempted: 3, synced: 2, failed: 1 } }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/bravo/videos/sync-thumbnails",
      {
        method: "POST",
        body: JSON.stringify({ force: true }),
      }
    );

    const response = await POST(request, { params: Promise.resolve({ showId: "show-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.video_thumbnail_sync.synced).toBe(2);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.example.com/api/v1/admin/shows/show-1/bravo/videos/sync-thumbnails",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
      })
    );
  });

  it("maps aborts to a timeout response", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/bravo/videos/sync-thumbnails",
      {
        method: "POST",
        body: JSON.stringify({ force: false }),
      }
    );

    const response = await POST(request, { params: Promise.resolve({ showId: "show-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(504);
    expect(String(payload.error || "")).toContain("timed out after 90s");
  });
});
