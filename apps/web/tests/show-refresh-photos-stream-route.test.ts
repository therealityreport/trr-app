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

import { POST } from "@/app/api/admin/trr-api/shows/[showId]/refresh-photos/stream/route";

const makeRequest = () =>
  new NextRequest(
    "http://localhost/api/admin/trr-api/shows/show-1/refresh-photos/stream",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ skip_mirror: true, season_number: 6 }),
    },
  );

describe("show refresh-photos stream proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();
    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue(
      "https://backend.example.com/api/v1/admin/shows/show-1/refresh-photos/stream",
    );
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
  });

  it("retries on transient fetch failure and then streams success", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("fetch failed"))
      .mockResolvedValueOnce(
        new Response("event: progress\ndata: {\"stage\":\"sync_cast_photos\"}\n\n", {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ showId: "show-1" }),
    });
    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(payload).toContain("\"sync_cast_photos\"");
    const finalBody = (fetchMock.mock.calls[1]?.[1] as RequestInit | undefined)?.body;
    expect(typeof finalBody).toBe("string");
    const parsedBody = JSON.parse(String(finalBody)) as Record<string, unknown>;
    expect(parsedBody.skip_s3).toBe(true);
    expect(parsedBody.season_number).toBe(6);
  });
});
