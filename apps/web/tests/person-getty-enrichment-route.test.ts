import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getBackendApiUrlMock, getInternalAdminBearerTokenMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
  getInternalAdminBearerTokenMock: vi.fn(),
}));

const { readGettyPrefetchPayloadMock } = vi.hoisted(() => ({
  readGettyPrefetchPayloadMock: vi.fn(),
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
  readGettyPrefetchPayload: readGettyPrefetchPayloadMock,
}));

import { POST } from "@/app/api/admin/trr-api/people/[personId]/refresh-images/getty-enrichment/route";

describe("person Getty enrichment proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    readGettyPrefetchPayloadMock.mockReset();
    getInternalAdminBearerTokenMock.mockReset();
    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue(
      "https://backend.example.com/api/v1/admin/person/person-1/refresh-images/getty-enrichment"
    );
    getInternalAdminBearerTokenMock.mockReturnValue("internal-admin-token");
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
  });

  it("forwards the stored full Getty payload for deferred enrichment", async () => {
    readGettyPrefetchPayloadMock.mockResolvedValue({
      prefetch_mode: "full",
      deferred_editorial_ids: ["123", "456"],
      merged: [{ editorial_id: "123" }],
      merged_events: [{ event_id: "evt-1" }],
      query_summaries: [{ phrase: "Brandi Glanville" }],
      auth_mode: "chrome_profile_browser_login_bootstrap",
      auth_warning: null,
    });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ getty_enrichment_completed: 2 }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new NextRequest("http://localhost/api/admin/trr-api/people/person-1/refresh-images/getty-enrichment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          getty_prefetch_token: "prefetch-token-1",
          show_name: "The Real Housewives of Beverly Hills",
        }),
      }),
      {
        params: Promise.resolve({ personId: "person-1" }),
      }
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const forwarded = JSON.parse(String(options.body)) as Record<string, unknown>;
    expect(forwarded.getty_prefetch_mode).toBe("full");
    expect(forwarded.getty_deferred_enrichment).toBe(true);
    expect(forwarded.getty_deferred_editorial_ids).toEqual(["123", "456"]);
    expect(forwarded.getty_prefetched_assets).toEqual([{ editorial_id: "123" }]);
    expect(forwarded.getty_prefetched_events).toEqual([{ event_id: "evt-1" }]);
    expect(forwarded.getty_prefetched_queries).toEqual([{ phrase: "Brandi Glanville" }]);
  });
});
