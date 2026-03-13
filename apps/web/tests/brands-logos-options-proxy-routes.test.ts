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

import { GET as getOptionSources } from "@/app/api/admin/trr-api/brands/logos/options/sources/route";
import { GET as getOptionSourceSuggestions } from "@/app/api/admin/trr-api/brands/logos/options/source-suggestions/route";
import { POST as postOptionDiscover } from "@/app/api/admin/trr-api/brands/logos/options/discover/route";
import { POST as postOptionSourceQuery } from "@/app/api/admin/trr-api/brands/logos/options/source-query/route";
import { POST as postOptionSelect } from "@/app/api/admin/trr-api/brands/logos/options/select/route";

describe("brands logo option proxy routes", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();

    requireAdminMock.mockResolvedValue(undefined);
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    process.env.BRAND_LOGO_ROUTING_V2 = "true";
  });

  it("forwards option source requests to backend", async () => {
    getBackendApiUrlMock.mockReturnValue("https://backend.example.com/api/v1/admin/brands/logos/options/sources");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ sources: [{ source_provider: "wikimedia_commons", total_count: 3, has_more: false, editable: true, refreshable: true, query_kind: "search_term", effective_query_value: "instagram", query_links: ["https://commons.wikimedia.org/example"] }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/brands/logos/options/sources?target_type=publication&target_key=instagram.com&logo_role=wordmark",
      { method: "GET" },
    );
    const response = await getOptionSources(request);
    const payload = (await response.json()) as { sources?: Array<{ source_provider: string }> };

    expect(response.status).toBe(200);
    expect(payload.sources?.[0]?.source_provider).toBe("wikimedia_commons");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/admin/brands/logos/options/sources"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer service-role-secret",
        }),
      }),
    );
  });

  it("forwards discover requests to backend", async () => {
    getBackendApiUrlMock.mockReturnValue("https://backend.example.com/api/v1/admin/brands/logos/options/discover");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ candidates: [{ id: "candidate:1" }], total_count: 1, next_offset: 1, has_more: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const request = new NextRequest("http://localhost/api/admin/trr-api/brands/logos/options/discover", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target_type: "publication", target_key: "instagram.com", logo_role: "wordmark" }),
    });
    const response = await postOptionDiscover(request);
    const payload = (await response.json()) as { candidates?: Array<{ id: string }> };

    expect(response.status).toBe(200);
    expect(payload.candidates?.[0]?.id).toBe("candidate:1");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.example.com/api/v1/admin/brands/logos/options/discover",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer service-role-secret",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("forwards source suggestion requests to backend", async () => {
    getBackendApiUrlMock.mockReturnValue("https://backend.example.com/api/v1/admin/brands/logos/options/source-suggestions");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ source_provider: "logos_fandom", suggestions: [{ query_value: "IMDb/Original" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/brands/logos/options/source-suggestions?target_type=publication&target_key=imdb.com&logo_role=wordmark&source_provider=logos_fandom",
      { method: "GET" },
    );
    const response = await getOptionSourceSuggestions(request);
    const payload = (await response.json()) as { suggestions?: Array<{ query_value: string }> };

    expect(response.status).toBe(200);
    expect(payload.suggestions?.[0]?.query_value).toBe("IMDb/Original");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/admin/brands/logos/options/source-suggestions"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer service-role-secret",
        }),
      }),
    );
  });

  it("forwards source query save requests to backend", async () => {
    getBackendApiUrlMock.mockReturnValue("https://backend.example.com/api/v1/admin/brands/logos/options/source-query");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ source: { source_provider: "logos1000", effective_query_value: "peacock-logo", query_values: ["peacock-logo", "peacock-symbol"] } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const request = new NextRequest("http://localhost/api/admin/trr-api/brands/logos/options/source-query", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        target_type: "publication",
        target_key: "peacocktv.com",
        target_label: "peacocktv.com",
        logo_role: "wordmark",
        source_provider: "logos1000",
        query_values: ["peacock-logo", "peacock-symbol"],
      }),
    });
    const response = await postOptionSourceQuery(request);
    const payload = (await response.json()) as { source?: { effective_query_value?: string; query_values?: string[] } };

    expect(response.status).toBe(200);
    expect(payload.source?.effective_query_value).toBe("peacock-logo");
    expect(payload.source?.query_values).toEqual(["peacock-logo", "peacock-symbol"]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.example.com/api/v1/admin/brands/logos/options/source-query",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer service-role-secret",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("preserves backend error on select requests", async () => {
    getBackendApiUrlMock.mockReturnValue("https://backend.example.com/api/v1/admin/brands/logos/options/select");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "selection failed" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const request = new NextRequest("http://localhost/api/admin/trr-api/brands/logos/options/select", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target_type: "publication", target_key: "instagram.com", logo_role: "wordmark", asset_id: "a1" }),
    });
    const response = await postOptionSelect(request);
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(payload.error).toBe("selection failed");
  });
});
