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

import { POST } from "@/app/api/admin/trr-api/people/[personId]/reprocess-images/stream/route";

const makeRequest = () =>
  new NextRequest(
    "http://localhost/api/admin/trr-api/people/person-1/reprocess-images/stream",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    },
  );

describe("person reprocess-images stream proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();
    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue(
      "https://backend.example.com/api/v1/admin/person/person-1/reprocess-images/stream",
    );
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
  });

  it("retries on transient backend error before succeeding", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("fetch failed"))
      .mockResolvedValueOnce(
        new Response("event: progress\ndata: {\"stage\":\"auto_count\"}\n\n", {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ personId: "person-1" }),
    });
    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(payload).toContain("\"auto_count\"");
  });
});
