import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getNetworksStreamingSummaryMock,
  getNetworkStreamingDetailMock,
  getShowByIdMock,
  getBackendApiUrlMock,
  peekInternalAdminBearerTokenMock,
} = vi.hoisted(() => ({
  getNetworksStreamingSummaryMock: vi.fn(),
  getNetworkStreamingDetailMock: vi.fn(),
  getShowByIdMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
  peekInternalAdminBearerTokenMock: vi.fn(),
}));

vi.mock("@/lib/server/admin/networks-streaming-repository", () => ({
  getNetworksStreamingSummary: getNetworksStreamingSummaryMock,
  getNetworkStreamingDetail: getNetworkStreamingDetailMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  getShowById: getShowByIdMock,
}));

vi.mock("@/lib/server/trr-api/backend", () => ({
  getBackendApiUrl: getBackendApiUrlMock,
}));

vi.mock("@/lib/server/trr-api/internal-admin-auth", () => ({
  peekInternalAdminBearerToken: peekInternalAdminBearerTokenMock,
}));

import { getBrandProfileBySlug } from "@/lib/server/admin/brand-profile-repository";

describe("brand profile repository", () => {
  beforeEach(() => {
    getNetworksStreamingSummaryMock.mockReset();
    getNetworkStreamingDetailMock.mockReset();
    getShowByIdMock.mockReset();
    getBackendApiUrlMock.mockReset();
    peekInternalAdminBearerTokenMock.mockReset();
    getBackendApiUrlMock.mockReturnValue(null);
    peekInternalAdminBearerTokenMock.mockReturnValue("");
  });

  it("aggregates canonical streaming services from assigned shows with regional precedence and flat fallbacks", async () => {
    getNetworksStreamingSummaryMock.mockResolvedValue({
      totals: { total_available_shows: 10, total_added_shows: 3 },
      generated_at: "2026-04-07T00:00:00.000Z",
      rows: [
        {
          type: "network",
          name: "Bravo",
          available_show_count: 10,
          added_show_count: 3,
          hosted_logo_url: null,
          hosted_logo_black_url: null,
          hosted_logo_white_url: null,
          wikidata_id: null,
          wikipedia_url: null,
          tmdb_entity_id: "74",
          homepage_url: "https://bravotv.com",
          resolution_status: null,
          resolution_reason: null,
          last_attempt_at: null,
          has_logo: false,
          has_bw_variants: false,
          has_links: false,
        },
      ],
    });

    getNetworkStreamingDetailMock.mockResolvedValue({
      entity_type: "network",
      entity_key: "bravo",
      entity_slug: "bravo",
      display_name: "Bravo",
      available_show_count: 10,
      added_show_count: 3,
      core: {
        entity_id: "74",
        origin_country: "US",
        display_priority: null,
        tmdb_logo_path: null,
        logo_path: null,
        hosted_logo_key: null,
        hosted_logo_url: null,
        hosted_logo_black_url: null,
        hosted_logo_white_url: null,
        wikidata_id: null,
        wikipedia_url: null,
        wikimedia_logo_file: null,
        link_enriched_at: null,
        link_enrichment_source: null,
        facebook_id: null,
        instagram_id: null,
        twitter_id: null,
        tiktok_id: null,
      },
      override: null,
      completion: {
        resolution_status: null,
        resolution_reason: null,
        last_attempt_at: null,
      },
      shows: [
        {
          trr_show_id: "show-1",
          show_name: "The Valley",
          canonical_slug: "the-valley",
          poster_url: null,
        },
        {
          trr_show_id: "show-2",
          show_name: "Summer House",
          canonical_slug: "summer-house",
          poster_url: null,
        },
        {
          trr_show_id: "show-3",
          show_name: "Southern Charm",
          canonical_slug: "southern-charm",
          poster_url: null,
        },
      ],
      logo_assets: [],
    });

    getShowByIdMock.mockImplementation(async (showId: string) => {
      if (showId === "show-1") {
        return {
          id: "show-1",
          name: "The Valley",
          slug: "the-valley",
          canonical_slug: "the-valley",
          alternative_names: [],
          overview_alternative_names: [],
          imdb_id: null,
          tmdb_id: null,
          external_ids: null,
          derived_external_links: null,
          overview_watch_availability: [],
          watch_provider_regions: [
            {
              region: "US",
              stream: ["Peacock Premium", "Hayu"],
              free: ["Bravo TV"],
              buy_rent: ["Apple TV Store", "Amazon Prime Video"],
            },
            {
              region: "CA",
              stream: ["Peacock Premium Plus"],
              free: [],
              buy_rent: ["Amazon Video"],
            },
          ],
          show_total_seasons: null,
          show_total_episodes: null,
          description: null,
          premiere_date: null,
          genres: [],
          networks: ["Bravo"],
          overview_networks: ["Bravo"],
          streaming_providers: ["should-not-be-used"],
          overview_streaming_providers: ["should-not-be-used"],
          watch_providers: ["should-not-be-used"],
          tags: [],
          primary_poster_image_id: null,
          primary_backdrop_image_id: null,
          primary_logo_image_id: null,
          poster_url: null,
          backdrop_url: null,
          logo_url: null,
          tmdb_status: null,
          tmdb_vote_average: null,
          imdb_rating_value: null,
          created_at: "2026-04-07T00:00:00.000Z",
          updated_at: "2026-04-07T00:00:00.000Z",
        };
      }
      if (showId === "show-2") {
        return {
          id: "show-2",
          name: "Summer House",
          slug: "summer-house",
          canonical_slug: "summer-house",
          alternative_names: [],
          overview_alternative_names: [],
          imdb_id: null,
          tmdb_id: null,
          external_ids: null,
          derived_external_links: null,
          overview_watch_availability: [],
          watch_provider_regions: [],
          show_total_seasons: null,
          show_total_episodes: null,
          description: null,
          premiere_date: null,
          genres: [],
          networks: ["Bravo"],
          overview_networks: ["Bravo"],
          streaming_providers: ["Peacock Premium"],
          overview_streaming_providers: ["Netflix", "Apple TV Store", "Peacock"],
          watch_providers: ["Amazon Video"],
          tags: [],
          primary_poster_image_id: null,
          primary_backdrop_image_id: null,
          primary_logo_image_id: null,
          poster_url: null,
          backdrop_url: null,
          logo_url: null,
          tmdb_status: null,
          tmdb_vote_average: null,
          imdb_rating_value: null,
          created_at: "2026-04-07T00:00:00.000Z",
          updated_at: "2026-04-07T00:00:00.000Z",
        };
      }
      if (showId === "show-3") {
        return {
          id: "show-3",
          name: "Southern Charm",
          slug: "southern-charm",
          canonical_slug: "southern-charm",
          alternative_names: [],
          overview_alternative_names: [],
          imdb_id: null,
          tmdb_id: null,
          external_ids: null,
          derived_external_links: null,
          overview_watch_availability: [],
          watch_provider_regions: [],
          show_total_seasons: null,
          show_total_episodes: null,
          description: null,
          premiere_date: null,
          genres: [],
          networks: ["Bravo"],
          overview_networks: ["Bravo"],
          streaming_providers: ["Peacock Premium Plus"],
          overview_streaming_providers: [],
          watch_providers: ["Amazon Video"],
          tags: [],
          primary_poster_image_id: null,
          primary_backdrop_image_id: null,
          primary_logo_image_id: null,
          poster_url: null,
          backdrop_url: null,
          logo_url: null,
          tmdb_status: null,
          tmdb_vote_average: null,
          imdb_rating_value: null,
          created_at: "2026-04-07T00:00:00.000Z",
          updated_at: "2026-04-07T00:00:00.000Z",
        };
      }
      return null;
    });

    const result = await getBrandProfileBySlug("bravo");

    expect(result).not.toBeNull();
    expect(result?.streaming_services).toEqual([
      "Apple TV",
      "Hayu",
      "Netflix",
      "Peacock",
      "Prime Video",
    ]);
    expect(result?.shows).toHaveLength(3);
    expect(getShowByIdMock).toHaveBeenCalledTimes(3);
  });
});
