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

import { POST } from "@/app/api/admin/trr-api/shows/[showId]/assets/batch-jobs/stream/route";

describe("show assets batch jobs stream proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();
    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue(
      "https://backend.example.com/api/v1/admin/shows/show-1/assets/batch-jobs/stream"
    );
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
  });

  it("proxies streaming request body to backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("event: complete\ndata: {\"succeeded\":1}\n\n", {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new NextRequest("http://localhost/api/admin/trr-api/shows/show-1/assets/batch-jobs/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operations: ["count", "resize"],
          content_types: ["profile_pictures"],
          targets: [{ origin: "media_assets", id: "a1" }],
        }),
      }),
      { params: Promise.resolve({ showId: "show-1" }) }
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = (fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)?.body;
    expect(typeof body).toBe("string");
    expect(JSON.parse(String(body))).toMatchObject({
      operations: ["count", "resize"],
      content_types: ["profile_pictures"],
    });
  });
});
