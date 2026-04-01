import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getBackendApiUrlMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
}));
const { getInternalAdminBearerTokenMock } = vi.hoisted(() => ({
  getInternalAdminBearerTokenMock: vi.fn(),
}));
const { hydrateGettyPrefetchPayloadMock, cleanupStaleGettyPrefetchFilesMock } = vi.hoisted(() => ({
  hydrateGettyPrefetchPayloadMock: vi.fn(),
  cleanupStaleGettyPrefetchFilesMock: vi.fn(),
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

vi.mock("@/lib/server/admin/getty-local-scrape", () => ({
  hydrateGettyPrefetchPayload: hydrateGettyPrefetchPayloadMock,
  cleanupStaleGettyPrefetchFiles: cleanupStaleGettyPrefetchFilesMock,
}));

import { GET as getArtifactPreview } from "@/app/api/admin/trr-api/bravotv/images/runs/[runId]/artifacts/[...artifactName]/route";
import { GET as getLatestShowRun } from "@/app/api/admin/trr-api/bravotv/images/shows/[showId]/latest/route";
import { POST as startPersonStream } from "@/app/api/admin/trr-api/bravotv/images/people/[personId]/stream/route";
import { POST as startShowStream } from "@/app/api/admin/trr-api/bravotv/images/shows/[showId]/stream/route";

describe("bravotv image admin proxy routes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockImplementation((path: string) => `https://backend.example.com/api/v1${path}`);
    getInternalAdminBearerTokenMock.mockReset();
    getInternalAdminBearerTokenMock.mockReturnValue("service-role-secret");
    hydrateGettyPrefetchPayloadMock.mockReset();
    hydrateGettyPrefetchPayloadMock.mockImplementation(async (raw: string) => raw);
    cleanupStaleGettyPrefetchFilesMock.mockReset();
    cleanupStaleGettyPrefetchFilesMock.mockResolvedValue(0);
  });

  it("forwards latest show run requests to the backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ run: { id: "run-1", status: "completed" } }), { status: 200 }),
      ),
    );

    const response = await getLatestShowRun(
      new NextRequest("http://localhost/api/admin/trr-api/bravotv/images/shows/show-1/latest"),
      { params: Promise.resolve({ showId: "show-1" }) },
    );
    const payload = await response.json();

    expect(payload).toEqual({ run: { id: "run-1", status: "completed" } });
    expect(fetch).toHaveBeenCalledWith(
      "https://backend.example.com/api/v1/admin/bravotv/images/shows/show-1/latest",
      expect.objectContaining({
        headers: { Authorization: "Bearer service-role-secret" },
        cache: "no-store",
      }),
    );
  });

  it("returns 500 when the TRR-specific service role key is missing", async () => {
    getInternalAdminBearerTokenMock.mockImplementation(() => {
      throw new Error("missing");
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ run: null }), { status: 200 }),
      ),
    );

    const response = await getLatestShowRun(
      new NextRequest("http://localhost/api/admin/trr-api/bravotv/images/shows/show-1/latest"),
      { params: Promise.resolve({ showId: "show-1" }) },
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "TRR internal admin auth is not configured",
    });
  });

  it("streams person run requests through to the backend SSE endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("event: progress\ndata: {\"stage\":\"starting\"}\n\n", {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
      ),
    );

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/bravotv/images/people/person-1/stream",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-trr-request-id": "req-1",
        },
        body: JSON.stringify({ mode: "person", sources: ["tmdb"] }),
      },
    );

    const response = await startPersonStream(request, {
      params: Promise.resolve({ personId: "person-1" }),
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("\"starting\"");
    expect(fetch).toHaveBeenCalledWith(
      "https://backend.example.com/api/v1/admin/bravotv/images/people/person-1/stream",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer service-role-secret",
          "x-trr-request-id": "req-1",
        }),
        body: JSON.stringify({ mode: "person", sources: ["tmdb"] }),
      }),
    );
  });

  it("hydrates Getty prefetch payload before forwarding person stream requests", async () => {
    hydrateGettyPrefetchPayloadMock.mockResolvedValue(
      JSON.stringify({
        mode: "person",
        sources: ["getty"],
        getty_prefetched_assets: [{ editorial_id: "928663262" }],
      }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("event: progress\ndata: {\"stage\":\"starting\"}\n\n", {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
      ),
    );

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/bravotv/images/people/person-1/stream",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "person", sources: ["getty"], getty_prefetch_token: "tok-1" }),
      },
    );

    await startPersonStream(request, {
      params: Promise.resolve({ personId: "person-1" }),
    });

    expect(hydrateGettyPrefetchPayloadMock).toHaveBeenCalled();
    expect(cleanupStaleGettyPrefetchFilesMock).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      "https://backend.example.com/api/v1/admin/bravotv/images/people/person-1/stream",
      expect.objectContaining({
        body: JSON.stringify({
          mode: "person",
          sources: ["getty"],
          getty_prefetched_assets: [{ editorial_id: "928663262" }],
        }),
      }),
    );
  });

  it("hydrates Getty prefetch payload before forwarding show stream requests", async () => {
    hydrateGettyPrefetchPayloadMock.mockResolvedValue(
      JSON.stringify({
        mode: "show",
        sources: ["getty"],
        getty_prefetched_assets: [{ editorial_id: "928663262" }],
      }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("event: progress\ndata: {\"stage\":\"starting\"}\n\n", {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
      ),
    );

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/bravotv/images/shows/show-1/stream",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "show", sources: ["getty"], getty_prefetch_token: "tok-2" }),
      },
    );

    await startShowStream(request, {
      params: Promise.resolve({ showId: "show-1" }),
    });

    expect(hydrateGettyPrefetchPayloadMock).toHaveBeenCalled();
    expect(cleanupStaleGettyPrefetchFilesMock).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      "https://backend.example.com/api/v1/admin/bravotv/images/shows/show-1/stream",
      expect.objectContaining({
        body: JSON.stringify({
          mode: "show",
          sources: ["getty"],
          getty_prefetched_assets: [{ editorial_id: "928663262" }],
        }),
      }),
    );
  });

  it("joins artifact catch-all segments and preserves pagination query strings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ artifact: "replacement_candidates", total: 1, items: [] }), {
          status: 200,
        }),
      ),
    );

    const response = await getArtifactPreview(
      new NextRequest(
        "http://localhost/api/admin/trr-api/bravotv/images/runs/run-1/artifacts/replacement_candidates?offset=5&limit=10",
      ),
      {
        params: Promise.resolve({
          runId: "run-1",
          artifactName: ["replacement_candidates"],
        }),
      },
    );

    expect(await response.json()).toEqual({
      artifact: "replacement_candidates",
      total: 1,
      items: [],
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://backend.example.com/api/v1/admin/bravotv/images/runs/run-1/artifacts/replacement_candidates?offset=5&limit=10",
      expect.objectContaining({
        headers: { Authorization: "Bearer service-role-secret" },
        cache: "no-store",
      }),
    );
  });
});
