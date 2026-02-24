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

import { GET } from "@/app/api/admin/trr-api/shows/[showId]/google-news/sync/[jobId]/route";

describe("show google-news sync status proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();

    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue(
      "https://backend.example.com/api/v1/admin/shows/show-1/google-news/sync/job-1"
    );
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
  });

  it("forwards sync job status request to backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "job-1", status: "completed" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest("http://localhost/api/admin/trr-api/shows/show-1/google-news/sync/job-1");

    const response = await GET(request, {
      params: Promise.resolve({ showId: "show-1", jobId: "job-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("completed");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.example.com/api/v1/admin/shows/show-1/google-news/sync/job-1",
      expect.objectContaining({
        cache: "no-store",
      })
    );
  });

  it("maps aborts to a 60s timeout response", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    const fetchMock = vi.fn().mockRejectedValue(abortError);
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest("http://localhost/api/admin/trr-api/shows/show-1/google-news/sync/job-1");
    const response = await GET(request, {
      params: Promise.resolve({ showId: "show-1", jobId: "job-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(504);
    expect(String(payload.error || "")).toContain("timed out after 60s");
  });
});
