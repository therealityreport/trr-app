import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCoveredShowsMock,
  getShowByIdMock,
  listPersonExternalIdsMock,
  listRedditCommunitiesMock,
  fetchSocialBackendJsonMock,
  fetchAdminBackendJsonMock,
} = vi.hoisted(() => ({
  getCoveredShowsMock: vi.fn(),
  getShowByIdMock: vi.fn(),
  listPersonExternalIdsMock: vi.fn(),
  listRedditCommunitiesMock: vi.fn(),
  fetchSocialBackendJsonMock: vi.fn(),
  fetchAdminBackendJsonMock: vi.fn(),
}));

vi.mock("@/lib/server/admin/covered-shows-repository", () => ({
  getCoveredShows: getCoveredShowsMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  getShowById: getShowByIdMock,
  listPersonExternalIds: listPersonExternalIdsMock,
}));

vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({
  fetchSocialBackendJson: fetchSocialBackendJsonMock,
}));

vi.mock("@/lib/server/admin/reddit-sources-repository", () => ({
  listRedditCommunities: listRedditCommunitiesMock,
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
}));

import { getSocialLandingPayload } from "@/lib/server/admin/social-landing-repository";

describe("social landing repository", () => {
  beforeEach(() => {
    getCoveredShowsMock.mockReset();
    getShowByIdMock.mockReset();
    listPersonExternalIdsMock.mockReset();
    listRedditCommunitiesMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();

    getCoveredShowsMock.mockResolvedValue([
      {
        id: "covered-1",
        trr_show_id: "show-rhoslc",
        show_name: "The Real Housewives of Salt Lake City",
        canonical_slug: "the-real-housewives-of-salt-lake-city",
        alternative_names: ["RHOSLC"],
        show_total_episodes: 100,
        created_at: "2026-01-01T00:00:00Z",
        created_by_firebase_uid: "admin",
      },
      {
        id: "covered-2",
        trr_show_id: "show-wwhl",
        show_name: "Watch What Happens Live with Andy Cohen",
        canonical_slug: "watch-what-happens-live-with-andy-cohen",
        alternative_names: ["WWHL"],
        show_total_episodes: 1000,
        created_at: "2026-01-01T00:00:00Z",
        created_by_firebase_uid: "admin",
      },
    ]);

    listRedditCommunitiesMock.mockResolvedValue([
      {
        id: "community-1",
        trr_show_id: "show-rhoslc",
        trr_show_name: "The Real Housewives of Salt Lake City",
        subreddit: "BravoRealHousewives",
        display_name: "Bravo RH",
        notes: null,
        post_flairs: [],
        analysis_flairs: [],
        analysis_all_flairs: [],
        is_show_focused: false,
        network_focus_targets: [],
        franchise_focus_targets: [],
        episode_title_patterns: [],
        post_flair_categories: {},
        post_flairs_updated_at: null,
        is_active: true,
        created_by_firebase_uid: "admin",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "community-2",
        trr_show_id: "show-wwhl",
        trr_show_name: "Watch What Happens Live with Andy Cohen",
        subreddit: "WWHL",
        display_name: null,
        notes: null,
        post_flairs: [],
        analysis_flairs: [],
        analysis_all_flairs: [],
        is_show_focused: false,
        network_focus_targets: [],
        franchise_focus_targets: [],
        episode_title_patterns: [],
        post_flair_categories: {},
        post_flairs_updated_at: null,
        is_active: true,
        created_by_firebase_uid: "admin",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "community-3",
        trr_show_id: "show-wwhl",
        trr_show_name: "Watch What Happens Live with Andy Cohen",
        subreddit: "AndyCohenArchive",
        display_name: null,
        notes: null,
        post_flairs: [],
        analysis_flairs: [],
        analysis_all_flairs: [],
        is_show_focused: false,
        network_focus_targets: [],
        franchise_focus_targets: [],
        episode_title_patterns: [],
        post_flair_categories: {},
        post_flairs_updated_at: null,
        is_active: false,
        created_by_firebase_uid: "admin",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ]);

    fetchSocialBackendJsonMock.mockImplementation(async (path: string) => {
      if (path === "/shared/sources") {
        return {
          sources: [
            {
              id: "source-1",
              platform: "instagram",
              source_scope: "bravo",
              account_handle: "bravotv",
              is_active: true,
              scrape_priority: 10,
            },
            {
              id: "source-2",
              platform: "instagram",
              source_scope: "bravo",
              account_handle: "bravodailydish",
              is_active: true,
              scrape_priority: 9,
            },
            {
              id: "source-3",
              platform: "instagram",
              source_scope: "bravo",
              account_handle: "wwhlbravo",
              is_active: true,
              scrape_priority: 8,
            },
            {
              id: "source-4",
              platform: "tiktok",
              source_scope: "bravo",
              account_handle: "bravowwhl",
              is_active: true,
              scrape_priority: 8,
            },
            {
              id: "source-5",
              platform: "youtube",
              source_scope: "bravo",
              account_handle: "wwhl",
              is_active: true,
              scrape_priority: 8,
            },
          ],
        };
      }

      if (path === "/shared/ingest/runs") {
        return [
          {
            id: "run-1",
            status: "completed",
            created_at: "2026-04-01T12:00:00.000Z",
            ingest_mode: "shared_account_async",
          },
        ];
      }

      if (path === "/shared/review-queue") {
        return {
          items: [
            {
              id: "review-1",
              platform: "instagram",
              source_id: "source-3",
              source_account: "wwhlbravo",
              review_reason: "unmatched_show",
              review_status: "open",
            },
          ],
        };
      }

      throw new Error(`Unhandled social path: ${path}`);
    });

    getShowByIdMock.mockImplementation(async (showId: string) => {
      if (showId === "show-rhoslc") {
        return {
          id: "show-rhoslc",
          name: "The Real Housewives of Salt Lake City",
          slug: "the-real-housewives-of-salt-lake-city",
          canonical_slug: "the-real-housewives-of-salt-lake-city",
          alternative_names: ["RHOSLC"],
          imdb_id: null,
          tmdb_id: null,
          external_ids: {},
          show_total_seasons: 5,
          show_total_episodes: 100,
          description: null,
          premiere_date: null,
          genres: [],
          networks: [],
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
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        };
      }

      if (showId === "show-wwhl") {
        return {
          id: "show-wwhl",
          name: "Watch What Happens Live with Andy Cohen",
          slug: "watch-what-happens-live-with-andy-cohen",
          canonical_slug: "watch-what-happens-live-with-andy-cohen",
          alternative_names: ["WWHL"],
          imdb_id: null,
          tmdb_id: null,
          external_ids: {
            instagram_id: "bravowwhl",
            twitter_id: "BravoWWHL",
            facebook_id: "WatchWhatHappensLive",
          },
          show_total_seasons: 20,
          show_total_episodes: 1000,
          description: null,
          premiere_date: null,
          genres: [],
          networks: [],
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
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        };
      }

      return null;
    });

    fetchAdminBackendJsonMock.mockImplementation(async (path: string) => {
      if (path.includes("/admin/trr-api/shows/show-rhoslc/cast")) {
        return {
          status: 200,
          data: {
            cast_members: [
              {
                id: "cast-1",
                show_id: "show-rhoslc",
                person_id: "person-heather",
                show_name: "The Real Housewives of Salt Lake City",
                cast_member_name: "Heather Gay",
                role: "Self",
                billing_order: 1,
                credit_category: "cast",
                source_type: "tmdb",
                full_name: "Heather Gay",
                known_for: null,
                photo_url: null,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
              {
                id: "cast-2",
                show_id: "show-rhoslc",
                person_id: "person-producer",
                show_name: "The Real Housewives of Salt Lake City",
                cast_member_name: "Producer Without Handles",
                role: "Producer",
                billing_order: 2,
                credit_category: "crew",
                source_type: "tmdb",
                full_name: "Producer Without Handles",
                known_for: null,
                photo_url: null,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
            ],
          },
        };
      }

      if (path.includes("/admin/trr-api/shows/show-wwhl/cast")) {
        return {
          status: 200,
          data: {
            cast_members: [
              {
                id: "cast-3",
                show_id: "show-wwhl",
                person_id: "person-andy",
                show_name: "Watch What Happens Live with Andy Cohen",
                cast_member_name: "Andy Cohen",
                role: "Host",
                billing_order: 1,
                credit_category: "cast",
                source_type: "tmdb",
                full_name: "Andy Cohen",
                known_for: null,
                photo_url: null,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
            ],
          },
        };
      }

      throw new Error(`Unhandled admin path: ${path}`);
    });

    listPersonExternalIdsMock.mockImplementation(async (personId: string) => {
      if (personId === "person-heather") {
        return [
          {
            id: 1,
            source_id: "instagram",
            external_id: "heathergay",
            is_primary: true,
            valid_from: null,
            valid_to: null,
            observed_at: null,
          },
          {
            id: 2,
            source_id: "twitter",
            external_id: "HeatherGay29",
            is_primary: true,
            valid_from: null,
            valid_to: null,
            observed_at: null,
          },
        ];
      }

      if (personId === "person-andy") {
        return [
          {
            id: 3,
            source_id: "instagram",
            external_id: "andycohen",
            is_primary: true,
            valid_from: null,
            valid_to: null,
            observed_at: null,
          },
          {
            id: 4,
            source_id: "youtube",
            external_id: "@andycohen",
            is_primary: true,
            valid_from: null,
            valid_to: null,
            observed_at: null,
          },
        ];
      }

      if (personId === "person-producer") {
        return [
          {
            id: 5,
            source_id: "imdb",
            external_id: "nm1234567",
            is_primary: true,
            valid_from: null,
            valid_to: null,
            observed_at: null,
          },
        ];
      }

      return [];
    });
  });

  it("builds networks, shows, and people with WWHL duplication and handle filtering", async () => {
    const payload = await getSocialLandingPayload();

    expect(payload.network_sets).toHaveLength(1);
    expect(payload.shared_pipeline.sources).toHaveLength(5);

    const bravoSet = payload.network_sets[0];
    expect(bravoSet.title).toBe("Bravo TV");
    expect(bravoSet.handles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          platform: "instagram",
          handle: "bravotv",
        }),
        expect.objectContaining({
          platform: "instagram",
          handle: "bravowwhl",
          href: "/admin/social/instagram/bravowwhl",
        }),
        expect.objectContaining({
          platform: "youtube",
          handle: "wwhl",
        }),
      ]),
    );

    const rhoslc = payload.show_sets.find((show) =>
      show.show_name.includes("Salt Lake City"),
    );
    expect(rhoslc).toMatchObject({
      fallback_note: "Shared coverage via Bravo TV",
    });
    expect(rhoslc?.handles).toHaveLength(0);

    const wwhl = payload.show_sets.find((show) =>
      show.show_name.includes("Watch What Happens Live"),
    );
    expect(wwhl?.handles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          platform: "instagram",
          handle: "bravowwhl",
        }),
        expect.objectContaining({
          platform: "facebook",
          handle: "watchwhathappenslive",
        }),
        expect.objectContaining({
          platform: "tiktok",
          handle: "bravowwhl",
        }),
        expect.objectContaining({
          platform: "youtube",
          handle: "wwhl",
        }),
      ]),
    );

    expect(payload.people_profiles.map((person) => person.full_name)).toEqual([
      "Andy Cohen",
      "Heather Gay",
    ]);

    const andy = payload.people_profiles.find(
      (person) => person.full_name === "Andy Cohen",
    );
    expect(andy?.shows).toEqual([
      expect.objectContaining({
        show_name: "Watch What Happens Live with Andy Cohen",
      }),
    ]);
    expect(andy?.handles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          platform: "instagram",
          handle: "andycohen",
        }),
        expect.objectContaining({
          platform: "youtube",
          display_label: "@andycohen",
        }),
      ]),
    );

    const heather = payload.people_profiles.find(
      (person) => person.full_name === "Heather Gay",
    );
    expect(heather?.shows).toEqual([
      expect.objectContaining({
        show_name: "The Real Housewives of Salt Lake City",
      }),
    ]);
    expect(heather?.handles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          platform: "instagram",
          handle: "heathergay",
        }),
        expect.objectContaining({
          platform: "twitter",
          handle: "heathergay29",
        }),
      ]),
    );
    expect(payload.reddit_dashboard).toEqual({
      active_community_count: expect.any(Number),
      archived_community_count: expect.any(Number),
      show_count: expect.any(Number),
    });
  });
});
