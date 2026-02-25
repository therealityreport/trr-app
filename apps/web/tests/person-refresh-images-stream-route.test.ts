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

const makeRequest = (requestId?: string) =>
  new NextRequest(
    "http://localhost/api/admin/trr-api/people/person-1/refresh-images/stream",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(requestId ? { "x-trr-request-id": requestId } : {}),
      },
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

  it("returns non-200 JSON error payload when backend responds non-OK", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("backend unavailable", { status: 502 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest("req-person-1"), {
      params: Promise.resolve({ personId: "person-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload.stage).toBe("backend");
    expect(payload.error).toBe("Backend refresh failed");
    expect(payload.request_id).toBe("req-person-1");
  });

  it("streams successful backend SSE body through unchanged", async () => {
    const body = "event: progress\ndata: {\"stage\":\"sync_imdb\"}\n\n";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest("req-person-2"), {
      params: Promise.resolve({ personId: "person-1" }),
    });
    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(payload).toContain("event: progress");
    expect(payload).toContain("\"sync_imdb\"");
  });

  it("forwards x-trr-request-id to backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("event: progress\ndata: {\"stage\":\"sync_imdb\"}\n\n", {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest("req-forward-1"), {
      params: Promise.resolve({ personId: "person-1" }),
    });
    await response.text();

    const callHeaders = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string> | undefined;
    expect(callHeaders?.["x-trr-request-id"]).toBe("req-forward-1");
  });

  it("retries once on transient backend fetch failure", async () => {
    const transientError = new Error("fetch failed");
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(transientError)
      .mockResolvedValueOnce(
        new Response("event: progress\ndata: {\"stage\":\"sync_tmdb\"}\n\n", {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest("req-person-1"), {
      params: Promise.resolve({ personId: "person-1" }),
    });
    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(payload).toContain("\"sync_tmdb\"");
  });

  it("does not leak backend URL details in proxy errors", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);
    process.env.TRR_API_URL = "https://internal.example.local";

    const response = await POST(makeRequest("req-person-3"), {
      params: Promise.resolve({ personId: "person-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(String(payload.detail ?? "")).not.toContain("TRR_API_URL");
    expect(String(payload.detail ?? "")).not.toContain("internal.example.local");
    expect(payload.request_id).toBe("req-person-3");
  });
});
