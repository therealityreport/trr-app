import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getNetworkStreamingDetailMock, getNetworkStreamingSuggestionsMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getNetworkStreamingDetailMock: vi.fn(),
  getNetworkStreamingSuggestionsMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/networks-streaming-repository", () => ({
  getNetworkStreamingDetail: getNetworkStreamingDetailMock,
  getNetworkStreamingSuggestions: getNetworkStreamingSuggestionsMock,
}));

import { GET } from "@/app/api/admin/networks-streaming/detail/route";

describe("networks-streaming detail route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getNetworkStreamingDetailMock.mockReset();
    getNetworkStreamingSuggestionsMock.mockReset();
    requireAdminMock.mockResolvedValue(undefined);
  });

  it("returns detail payload for a valid entity", async () => {
    getNetworkStreamingDetailMock.mockResolvedValue({
      entity_type: "network",
      entity_key: "bravo",
      entity_slug: "bravo",
      display_name: "Bravo",
      available_show_count: 8,
      added_show_count: 3,
      core: {
        entity_id: "77",
        origin_country: "US",
        display_priority: null,
        tmdb_logo_path: null,
        logo_path: null,
        hosted_logo_key: "logos/bravo.png",
        hosted_logo_url: "https://cdn.example.com/bravo.png",
        hosted_logo_black_url: "https://cdn.example.com/bravo-black.png",
        hosted_logo_white_url: "https://cdn.example.com/bravo-white.png",
        wikidata_id: "Q123",
        wikipedia_url: "https://en.wikipedia.org/wiki/Bravo_(American_TV_network)",
        wikimedia_logo_file: "Bravo_logo.svg",
        link_enriched_at: "2026-02-24T00:00:00.000Z",
        link_enrichment_source: "wikimedia",
        facebook_id: null,
        instagram_id: null,
        twitter_id: null,
        tiktok_id: null,
      },
      override: {
        id: null,
        display_name_override: null,
        wikidata_id_override: null,
        wikipedia_url_override: null,
        logo_source_urls_override: [],
        source_priority_override: [],
        aliases_override: [],
        notes: null,
        is_active: false,
        updated_by: null,
        updated_at: null,
      },
      completion: {
        resolution_status: "resolved",
        resolution_reason: null,
        last_attempt_at: "2026-02-24T00:00:00.000Z",
      },
      logo_assets: [],
      shows: [],
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/networks-streaming/detail?entity_type=network&entity_slug=bravo",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.display_name).toBe("Bravo");
    expect(payload.family).toBeNull();
    expect(payload.family_suggestions).toEqual([]);
    expect(payload.shared_links).toEqual([]);
    expect(payload.wikipedia_show_urls).toEqual([]);
    expect(getNetworkStreamingDetailMock).toHaveBeenCalledWith({
      entity_type: "network",
      entity_key: undefined,
      entity_slug: "bravo",
      show_scope: "added",
    });
  });

  it("returns 400 when entity_type is invalid", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/networks-streaming/detail?entity_type=invalid&entity_slug=bravo",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("entity_type");
  });

  it("returns 400 when both entity_key and entity_slug are missing", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/admin/networks-streaming/detail?entity_type=network"),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("entity_key or entity_slug");
  });

  it("returns 404 when entity is not found", async () => {
    getNetworkStreamingDetailMock.mockResolvedValue(null);
    getNetworkStreamingSuggestionsMock.mockResolvedValue([
      {
        entity_type: "streaming",
        name: "Peacock Premium",
        entity_slug: "peacock-premium",
        available_show_count: 77,
        added_show_count: 9,
      },
    ]);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/networks-streaming/detail?entity_type=streaming&entity_slug=peacock-premium",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toBe("not_found");
    expect(payload.suggestions).toHaveLength(1);
  });

  it("returns unauthorized when admin check fails", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/networks-streaming/detail?entity_type=network&entity_slug=bravo",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: "unauthorized" });
  });
});
