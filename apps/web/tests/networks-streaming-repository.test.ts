import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock("@/lib/server/postgres", () => ({
  query: queryMock,
}));

import { getNetworkStreamingDetail } from "@/lib/server/admin/networks-streaming-repository";

describe("networks-streaming repository detail", () => {
  beforeEach(() => {
    queryMock.mockReset();
    vi.restoreAllMocks();
  });

  it("returns detail with empty logo assets when logo assets table is unavailable", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    queryMock.mockImplementation(async (text: string) => {
      if (text.includes("target_entity")) {
        return {
          rows: [
            {
              entity_type: "network",
              name_key: "bravo",
              display_name: "Bravo",
              entity_slug: "bravo",
              available_show_count: 62,
              added_show_count: 9,
              core_entity_id: "74",
              core_origin_country: "US",
              core_display_priority: null,
              core_tmdb_logo_path: null,
              core_logo_path: null,
              core_hosted_logo_key: null,
              core_hosted_logo_url: "https://cdn.example.com/bravo.png",
              core_hosted_logo_black_url: "https://cdn.example.com/bravo-black.png",
              core_hosted_logo_white_url: "https://cdn.example.com/bravo-white.png",
              core_wikidata_id: "Q902771",
              core_wikipedia_url: "https://en.wikipedia.org/wiki/Bravo_(American_TV_network)",
              core_wikimedia_logo_file: "Bravo_Logo.svg",
              core_link_enriched_at: "2026-02-24T00:00:00.000Z",
              core_link_enrichment_source: "wikidata",
              core_facebook_id: null,
              core_instagram_id: null,
              core_twitter_id: null,
              core_tiktok_id: null,
              override_id: null,
              override_display_name_override: null,
              override_wikidata_id_override: null,
              override_wikipedia_url_override: null,
              override_logo_source_urls_override: [],
              override_source_priority_override: [],
              override_aliases_override: [],
              override_notes: null,
              override_is_active: false,
              override_updated_by: null,
              override_updated_at: null,
              completion_resolution_status: "resolved",
              completion_resolution_reason: null,
              completion_last_attempt_at: "2026-02-24T00:00:00.000Z",
            },
          ],
        };
      }
      if (text.includes("entity_show_source")) {
        return { rows: [] };
      }
      if (text.includes("to_regclass")) {
        return { rows: [{ exists: false }] };
      }
      throw new Error(`Unexpected query: ${text.slice(0, 120)}`);
    });

    const result = await getNetworkStreamingDetail({
      entity_type: "network",
      entity_slug: "bravo",
      show_scope: "added",
    });

    expect(result).not.toBeNull();
    expect(result?.entity_key).toBe("bravo");
    expect(result?.logo_assets).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      "[networks-streaming-repository] missing_relation table=admin.network_streaming_logo_assets entity_type=network entity_key=bravo",
    );
    const queryTexts = queryMock.mock.calls.map((call: unknown[]) => String(call[0] ?? ""));
    expect(queryTexts.some((sql) => sql.includes("FROM admin.network_streaming_logo_assets"))).toBe(false);
    const showQuery = queryTexts.find((sql) => sql.includes("entity_show_source"));
    expect(showQuery).toBeDefined();
    expect(showQuery).toContain("AS computed_slug");
    expect(showQuery).toContain("COALESCE(NULLIF(s.slug, ''), s.computed_slug)");
    expect(showQuery).not.toContain("AS slug,");
  });

  it("returns detail for production company entity type", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    queryMock.mockImplementation(async (text: string) => {
      if (text.includes("target_entity")) {
        return {
          rows: [
            {
              entity_type: "production",
              name_key: "warner bros. television",
              display_name: "Warner Bros. Television",
              entity_slug: "warner-bros-television",
              available_show_count: 12,
              added_show_count: 5,
              core_entity_id: "1957",
              core_origin_country: "US",
              core_display_priority: null,
              core_tmdb_logo_path: "/wb-logo.png",
              core_logo_path: null,
              core_hosted_logo_key: null,
              core_hosted_logo_url: "https://cdn.example.com/wb.png",
              core_hosted_logo_black_url: null,
              core_hosted_logo_white_url: null,
              core_wikidata_id: "Q1043427",
              core_wikipedia_url: "https://en.wikipedia.org/wiki/Warner_Bros._Television",
              core_wikimedia_logo_file: null,
              core_link_enriched_at: null,
              core_link_enrichment_source: null,
              core_facebook_id: null,
              core_instagram_id: null,
              core_twitter_id: null,
              core_tiktok_id: null,
              override_id: null,
              override_display_name_override: null,
              override_wikidata_id_override: null,
              override_wikipedia_url_override: null,
              override_logo_source_urls_override: [],
              override_source_priority_override: [],
              override_aliases_override: [],
              override_notes: null,
              override_is_active: false,
              override_updated_by: null,
              override_updated_at: null,
              completion_resolution_status: null,
              completion_resolution_reason: null,
              completion_last_attempt_at: null,
            },
          ],
        };
      }
      if (text.includes("entity_show_source")) {
        return {
          rows: [{ trr_show_id: "abc-123", show_name: "Test Show", canonical_slug: "test-show", poster_url: null }],
        };
      }
      if (text.includes("to_regclass")) {
        return { rows: [{ exists: false }] };
      }
      throw new Error(`Unexpected query: ${text.slice(0, 120)}`);
    });

    const result = await getNetworkStreamingDetail({
      entity_type: "production",
      entity_slug: "warner-bros-television",
      show_scope: "added",
    });

    expect(result).not.toBeNull();
    expect(result?.entity_type).toBe("production");
    expect(result?.entity_key).toBe("warner bros. television");
    expect(result?.shows).toHaveLength(1);
    expect(result?.core.entity_id).toBe("1957");
  });
});
