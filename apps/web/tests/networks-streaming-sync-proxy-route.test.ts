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

import { POST } from "@/app/api/admin/networks-streaming/sync/route";

const makeRequest = (body: Record<string, unknown>, extraHeaders?: Record<string, string>) =>
  new NextRequest("http://localhost/api/admin/networks-streaming/sync", {
    method: "POST",
    headers: { "content-type": "application/json", ...(extraHeaders ?? {}) },
    body: JSON.stringify(body),
  });

describe("networks-streaming sync proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();

    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue(
      "https://backend.example.com/api/v1/admin/shows/sync-networks-streaming",
    );
    getInternalAdminBearerTokenMock.mockReset();
    getInternalAdminBearerTokenMock.mockReturnValue("test-admin-token");
    process.env.TRR_API_URL = "https://backend.example.com";
  });

  it("forwards sync payload and auth headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          run_id: "network-streaming-20260224T210000Z",
          status: "stopped",
          resume_cursor: { entity_type: "network", entity_key: "bravo" },
          entities_synced: 14,
          providers_synced: 22,
          links_enriched: 11,
          logos_mirrored: 9,
          variants_black_mirrored: 6,
          variants_white_mirrored: 5,
          completion_total: 50,
          completion_resolved: 49,
          completion_unresolved: 1,
          completion_unresolved_total: 1,
          completion_unresolved_network: 1,
          completion_unresolved_streaming: 0,
          completion_unresolved_production: 0,
          production_missing_logos: 3,
          production_missing_bw_variants: 3,
          completion_percent: 98,
          completion_gate_passed: false,
          missing_columns: [],
          unresolved_logos_count: 1,
          unresolved_logos_truncated: false,
          unresolved_logos: [
            { type: "network", id: "77", name: "Bravo", reason: "no_logo_claim" },
          ],
          failures: 0,
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      makeRequest({
        force: true,
        skip_s3: false,
        dry_run: true,
        limit: 100,
        refresh_external_sources: true,
        batch_size: 50,
        max_runtime_sec: 1200,
        resume_run_id: "network-streaming-20260224T200000Z",
        entity_type: "production",
        entity_keys: ["Shed Media", " Big Head Productions "],
      }, {
        "x-trr-request-id": "req-1",
        "x-trr-tab-session-id": "tab-1",
        "x-trr-flow-key": "flow-1",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.run_id).toBe("network-streaming-20260224T210000Z");
    expect(payload.status).toBe("stopped");
    expect(payload.entities_synced).toBe(14);
    expect(payload.variants_black_mirrored).toBe(6);
    expect(payload.unresolved_logos_count).toBe(1);
    expect(payload.unresolved_logos[0].name).toBe("Bravo");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://backend.example.com/api/v1/admin/shows/sync-networks-streaming");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer test-admin-token",
        "Content-Type": "application/json",
        "x-trr-request-id": "req-1",
        "x-trr-tab-session-id": "tab-1",
        "x-trr-flow-key": "flow-1",
      },
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      async: true,
      force: true,
      skip_s3: false,
      dry_run: true,
      refresh_external_sources: true,
      batch_size: 50,
      max_runtime_sec: 1200,
      resume_run_id: "network-streaming-20260224T200000Z",
      entity_type: "production",
      entity_keys: ["shed media", "big head productions"],
      limit: 100,
    });
  });

  it("returns timeout response when upstream aborts", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    const response = await POST(makeRequest({ force: true }));
    const payload = await response.json();

    expect(response.status).toBe(504);
    expect(payload.error).toBe("Sync/Mirror kickoff timed out");
  });

  it("returns actionable backend connectivity error when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    const response = await POST(makeRequest({}));
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload.error).toBe("Backend fetch failed");
    expect(payload.detail).toContain("TRR_API_URL=https://backend.example.com");
  });

  it("passes through backend error status and message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Sync failed", detail: "provider table unavailable" }), {
          status: 503,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const response = await POST(makeRequest({ force: true }));
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error).toBe("Sync failed");
    expect(payload.detail).toBe("provider table unavailable");
  });
});
