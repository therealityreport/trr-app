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
  });
});
