import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getBackendApiUrlMock, fetchMock, getInternalAdminBearerTokenMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
  fetchMock: vi.fn(),
  getInternalAdminBearerTokenMock: vi.fn().mockReturnValue("test-admin-token"),
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

import { POST } from "@/app/api/admin/trr-api/social-growth/refresh-batch/route";

describe("social growth batch proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    fetchMock.mockReset();
    getInternalAdminBearerTokenMock.mockReset();
    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue("http://backend/api/v1/admin/people/socialblade/refresh-batch");
    getInternalAdminBearerTokenMock.mockReturnValue("test-admin-token");
    vi.stubGlobal("fetch", fetchMock);
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("proxies batch refresh requests to the backend", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ accepted: [{ personId: "person-1", handle: "lisabarlow14" }], skipped: [], errors: [] }),
    });

    const request = new NextRequest("http://localhost/api/admin/trr-api/social-growth/refresh-batch", {
      method: "POST",
      body: JSON.stringify({
        source: "cast_comparison",
        source_scope: "creator",
        force: true,
        items: [{ personId: "person-1", handle: "lisabarlow14" }],
      }),
    });
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.accepted).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      source: "cast_comparison",
      source_scope: "creator",
      force: true,
      items: [{ personId: "person-1", handle: "lisabarlow14" }],
    });
  });

  it("rejects invalid sources before proxying", async () => {
    const request = new NextRequest("http://localhost/api/admin/trr-api/social-growth/refresh-batch", {
      method: "POST",
      body: JSON.stringify({
        source: "person_page",
        items: [{ personId: "person-1", handle: "lisabarlow14" }],
      }),
    });
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("source");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves structured backend batch errors with a string error", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: {
            message: "Batch refresh could not start because SocialBlade auth is stale",
            code: "SOCIALBLADE_BATCH_AUTH_STALE",
            retryable: true,
            request_id: "request-socialblade-batch-1",
          },
        }),
        {
          status: 503,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    const request = new NextRequest("http://localhost/api/admin/trr-api/social-growth/refresh-batch", {
      method: "POST",
      body: JSON.stringify({
        source: "cast_comparison",
        items: [{ personId: "person-1", handle: "lisabarlow14" }],
      }),
    });
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toEqual({
      error: "Batch refresh could not start because SocialBlade auth is stale",
      detail: {
        message: "Batch refresh could not start because SocialBlade auth is stale",
        code: "SOCIALBLADE_BATCH_AUTH_STALE",
        retryable: true,
        request_id: "request-socialblade-batch-1",
      },
      code: "SOCIALBLADE_BATCH_AUTH_STALE",
      retryable: true,
      request_id: "request-socialblade-batch-1",
    });
    expect(typeof payload.error).toBe("string");
  });

  it("returns a typed 504 when the SocialBlade batch backend request times out", async () => {
    const abortError = Object.assign(new Error("aborted"), { name: "AbortError" });
    fetchMock.mockRejectedValue(abortError);

    const request = new NextRequest("http://localhost/api/admin/trr-api/social-growth/refresh-batch", {
      method: "POST",
      body: JSON.stringify({
        source: "season_run",
        items: [{ personId: "person-1", handle: "lisabarlow14" }],
      }),
    });
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(504);
    expect(payload).toMatchObject({
      error: "SocialBlade backend request timed out",
      code: "SOCIALBLADE_UPSTREAM_TIMEOUT",
      retryable: true,
      detail: {
        code: "SOCIALBLADE_UPSTREAM_TIMEOUT",
        timeout_ms: 55_000,
      },
    });
    expect(typeof payload.error).toBe("string");
  });
});
