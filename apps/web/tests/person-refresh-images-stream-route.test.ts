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

import { POST } from "@/app/api/admin/trr-api/people/[personId]/refresh-images/stream/route";

const makeRequest = () =>
  new NextRequest(
    "http://localhost/api/admin/trr-api/people/person-1/refresh-images/stream",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ force_mirror: true }),
    },
  );

describe("person refresh-images stream proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();
    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue(
      "https://backend.example.com/api/v1/admin/person/person-1/refresh-images/stream",
    );
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
  });

  it("returns status 200 SSE error payload when backend responds non-OK", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("backend unavailable", { status: 502 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ personId: "person-1" }),
    });
    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(payload).toContain("event: error");
    expect(payload).toContain("\"stage\":\"backend\"");
    expect(payload).toContain("\"error\":\"Backend refresh failed\"");
  });

  it("streams successful backend SSE body through unchanged", async () => {
    const body = "event: progress\ndata: {\"stage\":\"sync_imdb\"}\n\n";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ personId: "person-1" }),
    });
    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(payload).toContain("event: progress");
    expect(payload).toContain("\"sync_imdb\"");
  });
});
