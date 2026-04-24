import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCoveredShowsMock,
  listPrimaryPersonExternalIdsByPersonIdsMock,
  listEffectivePersonSocialHandlesByPersonIdsMock,
  listShowExternalIdsByIdsMock,
  listRedditCommunitiesMock,
  fetchSocialBackendJsonMock,
  fetchAdminBackendJsonMock,
  queryMock,
} = vi.hoisted(() => ({
  getCoveredShowsMock: vi.fn(),
  listPrimaryPersonExternalIdsByPersonIdsMock: vi.fn(),
  listEffectivePersonSocialHandlesByPersonIdsMock: vi.fn(),
  listShowExternalIdsByIdsMock: vi.fn(),
  listRedditCommunitiesMock: vi.fn(),
  fetchSocialBackendJsonMock: vi.fn(),
  fetchAdminBackendJsonMock: vi.fn(),
  queryMock: vi.fn(),
}));

vi.mock("@/lib/server/admin/covered-shows-repository", () => ({
  getCoveredShows: getCoveredShowsMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  listPrimaryPersonExternalIdsByPersonIds: listPrimaryPersonExternalIdsByPersonIdsMock,
  listEffectivePersonSocialHandlesByPersonIds:
    listEffectivePersonSocialHandlesByPersonIdsMock,
  listShowExternalIdsByIds: listShowExternalIdsByIdsMock,
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

vi.mock("@/lib/server/postgres", () => ({
  query: queryMock,
}));

import { getSocialLandingPayload } from "@/lib/server/admin/social-landing-repository";

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

describe("social landing repository", () => {
  beforeEach(() => {
    getCoveredShowsMock.mockReset();
    listPrimaryPersonExternalIdsByPersonIdsMock.mockReset();
    listEffectivePersonSocialHandlesByPersonIdsMock.mockReset();
    listShowExternalIdsByIdsMock.mockReset();
    listRedditCommunitiesMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    queryMock.mockReset();

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

    listShowExternalIdsByIdsMock.mockImplementation(
      async (showIds: readonly string[]) =>
        new Map(
          showIds.map((showId) => {
            if (showId === "show-wwhl") {
              return [
                showId,
                {
                  instagram_id: "bravowwhl",
                  twitter_id: "BravoWWHL",
                  facebook_id: "WatchWhatHappensLive",
                },
              ] as const;
            }
            return [showId, {}] as const;
          }),
        ),
    );

    fetchAdminBackendJsonMock.mockImplementation(async (path: string, options?: { body?: string }) => {
      if (path === "/admin/shows/cast-summary") {
        const showIds = JSON.parse(options?.body ?? "{\"show_ids\":[]}") as { show_ids?: string[] };
        return {
          status: 200,
          data: {
            shows: (showIds.show_ids ?? []).map((showId) => {
              if (showId === "show-rhoslc") {
                return {
                  show_id: showId,
                  cast_members: [
                    {
                      person_id: "person-heather",
                      full_name: "Heather Gay",
                    },
                  ],
                };
              }
              if (showId === "show-wwhl") {
                return {
                  show_id: showId,
                  cast_members: [
                    {
                      person_id: "person-andy",
                      full_name: "Andy Cohen",
                    },
                    {
                      person_id: "person-producer",
                      full_name: "Producer Without Handles",
                    },
                  ],
                };
              }
              return {
                show_id: showId,
                cast_members: [],
              };
            }),
          },
        };
      }

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

    listPrimaryPersonExternalIdsByPersonIdsMock.mockImplementation(
      async (personIds: readonly string[]) =>
        new Map(
          personIds.map((personId) => {
            if (personId === "person-heather") {
              return [
                personId,
                [
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
                ],
              ] as const;
            }

            if (personId === "person-andy") {
              return [
                personId,
                [
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
                  {
                    id: 6,
                    source_id: "threads",
                    external_id: "andycohen",
                    is_primary: true,
                    valid_from: null,
                    valid_to: null,
                    observed_at: null,
                  },
                ],
              ] as const;
            }

            if (personId === "person-producer") {
              return [
                personId,
                [
                  {
                    id: 5,
                    source_id: "imdb",
                    external_id: "nm1234567",
                    is_primary: true,
                    valid_from: null,
                    valid_to: null,
                    observed_at: null,
                  },
                ],
              ] as const;
            }

            return [personId, []] as const;
          }),
        ),
    );

    listEffectivePersonSocialHandlesByPersonIdsMock.mockResolvedValue(new Map());
    queryMock.mockResolvedValue({ rows: [] });
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
          href: "/social/instagram/bravowwhl",
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
    expect(payload.person_targets.map((person) => person.full_name)).toEqual([
      "Andy Cohen",
      "Heather Gay",
      "Producer Without Handles",
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
          platform: "threads",
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

  it("caps social landing show and people fanout concurrency to avoid saturating local admin reads", async () => {
    getCoveredShowsMock.mockResolvedValue(
      Array.from({ length: 5 }, (_, index) => ({
        id: `covered-${index + 1}`,
        trr_show_id: `show-${index + 1}`,
        show_name: `Show ${index + 1}`,
        canonical_slug: `show-${index + 1}`,
        alternative_names: [],
        show_total_episodes: 10,
        created_at: "2026-01-01T00:00:00Z",
        created_by_firebase_uid: "admin",
      })),
    );

    let showExternalIdBatchCalls = 0;
    listShowExternalIdsByIdsMock.mockImplementation(async (showIds: readonly string[]) => {
      showExternalIdBatchCalls += 1;
      return new Map(showIds.map((showId) => [showId, {}] as const));
    });

    let castSummaryBatchCalls = 0;
    fetchAdminBackendJsonMock.mockImplementation(async (path: string, options?: { body?: string }) => {
      castSummaryBatchCalls += 1;
      await delay(5);
      return {
        status: 200,
        data: {
          shows: (JSON.parse(options?.body ?? "{\"show_ids\":[]}") as { show_ids?: string[] }).show_ids?.map(
            (showId) => ({
              show_id: showId,
              cast_members: [
                {
                  person_id: `person-${showId}`,
                  full_name: `Person ${showId}`,
                },
              ],
            }),
          ) ?? [],
        },
      };
    });

    let personExternalIdBatchCalls = 0;
    let receivedPersonIds: readonly string[] = [];
    listPrimaryPersonExternalIdsByPersonIdsMock.mockImplementation(
      async (personIds: readonly string[]) => {
        personExternalIdBatchCalls += 1;
        receivedPersonIds = [...personIds];
        await delay(5);
        return new Map(
          personIds.map((personId) => [
            personId,
            [
              {
                id: Number(personId.replace(/\D/g, "")) || 1,
                source_id: "instagram",
                external_id: `${personId}-handle`,
                is_primary: true,
                valid_from: null,
                valid_to: null,
                observed_at: null,
              },
            ],
          ]),
        );
      },
    );
    let personFallbackHandleBatchCalls = 0;
    listEffectivePersonSocialHandlesByPersonIdsMock.mockImplementation(
      async (personIds: readonly string[]) => {
        personFallbackHandleBatchCalls += 1;
        return new Map(
          personIds.map((personId) => [
            personId,
            {
              person_id: personId,
              facebook_handle: null,
              instagram_handle: null,
              tiktok_handle: null,
              twitter_handle: null,
              youtube_handle: null,
            },
          ]),
        );
      },
    );

    const payload = await getSocialLandingPayload();

    expect(payload.show_sets).toHaveLength(5);
    expect(payload.people_profiles).toHaveLength(5);
    expect(castSummaryBatchCalls).toBe(1);
    expect(showExternalIdBatchCalls).toBe(1);
    expect(personExternalIdBatchCalls).toBe(1);
    expect(personFallbackHandleBatchCalls).toBe(1);
    expect(receivedPersonIds).toHaveLength(5);
  });

  it("includes cast members with fallback social handles even when primary external-id rows are missing", async () => {
    listPrimaryPersonExternalIdsByPersonIdsMock.mockImplementation(
      async (personIds: readonly string[]) =>
        new Map(personIds.map((personId) => [personId, []] as const)),
    );
    listEffectivePersonSocialHandlesByPersonIdsMock.mockResolvedValue(
      new Map([
        [
          "person-heather",
          {
            person_id: "person-heather",
            facebook_handle: null,
            instagram_handle: "heathergay",
            tiktok_handle: null,
            twitter_handle: "HeatherGay29",
            youtube_handle: null,
          },
        ],
        [
          "person-andy",
          {
            person_id: "person-andy",
            facebook_handle: null,
            instagram_handle: null,
            tiktok_handle: null,
            twitter_handle: null,
            youtube_handle: null,
          },
        ],
      ]),
    );

    const payload = await getSocialLandingPayload();

    expect(payload.people_profiles.map((person) => person.full_name)).toEqual([
      "Heather Gay",
    ]);
    expect(payload.people_profiles[0]?.handles).toEqual(
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
  });

  it("includes a show when a cast member matches a SocialBlade row by person_id", async () => {
    queryMock.mockResolvedValue({
      rows: [
        {
          person_id: "person-heather",
          platform: "instagram",
          account_handle: "heathergay",
          scraped_at: "2026-04-20T12:00:00.000Z",
          updated_at: "2026-04-20T12:05:00.000Z",
          stats_refreshed: true,
          socialblade_url: "https://socialblade.com/instagram/user/heathergay",
        },
      ],
    });

    const payload = await getSocialLandingPayload();
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];

    expect(sql).toContain("WHERE platform = ANY($1::text[])");
    expect(sql).toContain("person_id = ANY($2::uuid[])");
    expect(sql).toMatch(/\baccount_handle\s*=\s*ANY\(\$3::text\[\]\)/);
    expect(sql).toContain("id::text AS id");
    expect(sql).toContain("ORDER BY");
    expect(sql).toContain("id ASC");
    expect(sql).not.toContain("WHERE lower(platform) = ANY");
    expect(sql).not.toContain("person_id::text = ANY");
    expect(sql).not.toContain("person_id IS NULL");
    expect(sql).not.toContain("regexp_replace");
    expect(sql).not.toContain("ltrim(account_handle");
    expect(sql).not.toContain("lower(account_handle");
    expect(sql).not.toContain("concat(");
    expect(params[0]).toEqual(["instagram", "youtube", "facebook"]);
    expect(params[2]).toContain("andycohen");
    expect(params[2]).toContain("@andycohen");
    expect(params[2]).toContain("user/andycohen");
    expect(params[2]).toContain("c/andycohen");
    expect(params[2]).toContain("channel/andycohen");
    expect(params[2]).toContain("userandycohen");

    expect(payload.cast_socialblade_shows).toEqual([
      expect.objectContaining({
        show_id: "show-rhoslc",
        show_name: "The Real Housewives of Salt Lake City",
        platform_counts: { instagram: 1 },
        cast_member_count: 1,
        latest_scraped_at: "2026-04-20T12:00:00.000Z",
        members: [
          expect.objectContaining({
            person_id: "person-heather",
            full_name: "Heather Gay",
            photo_url: null,
            accounts: [
              expect.objectContaining({
                platform: "instagram",
                handle: "heathergay",
                display_label: "@heathergay",
                account_href: "/social/instagram/heathergay/socialblade",
                socialblade_url:
                  "https://socialblade.com/instagram/user/heathergay",
                stats_refreshed: true,
              }),
            ],
          }),
        ],
      }),
    ]);
  });

  it("does not emit stale person-linked SocialBlade rows for old handles", async () => {
    listPrimaryPersonExternalIdsByPersonIdsMock.mockImplementation(
      async (personIds: readonly string[]) =>
        new Map(
          personIds.map((personId) => {
            if (personId === "person-heather") {
              return [
                personId,
                [
                  {
                    id: 7,
                    source_id: "instagram",
                    external_id: "heathergaynew",
                    is_primary: true,
                    valid_from: null,
                    valid_to: null,
                    observed_at: null,
                  },
                ],
              ] as const;
            }
            return [personId, []] as const;
          }),
        ),
    );
    queryMock.mockResolvedValue({
      rows: [
        {
          person_id: "person-heather",
          platform: "instagram",
          account_handle: "heathergay",
          scraped_at: "2026-04-20T12:00:00.000Z",
          updated_at: "2026-04-20T12:05:00.000Z",
          stats_refreshed: true,
          socialblade_url: "https://socialblade.com/instagram/user/heathergay",
        },
      ],
    });

    const payload = await getSocialLandingPayload();

    expect(payload.cast_socialblade_shows).toEqual([]);
  });

  it("matches account-only SocialBlade rows by normalized platform and handle", async () => {
    queryMock.mockResolvedValue({
      rows: [
        {
          person_id: null,
          platform: "youtube",
          account_handle: "@AndyCohen",
          scraped_at: "2026-04-21T12:00:00.000Z",
          updated_at: "2026-04-21T12:05:00.000Z",
          stats_refreshed: false,
          socialblade_url: null,
        },
      ],
    });

    const payload = await getSocialLandingPayload();

    expect(payload.cast_socialblade_shows).toEqual([
      expect.objectContaining({
        show_id: "show-wwhl",
        platform_counts: { youtube: 1 },
        members: [
          expect.objectContaining({
            person_id: "person-andy",
            full_name: "Andy Cohen",
            accounts: [
              expect.objectContaining({
                platform: "youtube",
                handle: "andycohen",
                display_label: "andycohen",
                account_href: "/social/youtube/andycohen/socialblade",
                stats_refreshed: false,
              }),
            ],
          }),
        ],
      }),
    ]);
  });

  it("omits account-only SocialBlade rows for ambiguous current handles", async () => {
    listPrimaryPersonExternalIdsByPersonIdsMock.mockImplementation(
      async (personIds: readonly string[]) =>
        new Map(
          personIds.map((personId) => {
            if (personId === "person-andy" || personId === "person-producer") {
              return [
                personId,
                [
                  {
                    id: personId === "person-andy" ? 8 : 9,
                    source_id: "youtube",
                    external_id: "@sharedchannel",
                    is_primary: true,
                    valid_from: null,
                    valid_to: null,
                    observed_at: null,
                  },
                ],
              ] as const;
            }
            return [personId, []] as const;
          }),
        ),
    );
    queryMock.mockResolvedValue({
      rows: [
        {
          person_id: null,
          platform: "youtube",
          account_handle: "sharedchannel",
          scraped_at: "2026-04-21T12:00:00.000Z",
          updated_at: "2026-04-21T12:05:00.000Z",
          stats_refreshed: true,
          socialblade_url: "https://socialblade.com/youtube/user/sharedchannel",
        },
      ],
    });

    const payload = await getSocialLandingPayload();

    expect(payload.cast_socialblade_shows).toEqual([]);
  });

  it("allows person-specific SocialBlade rows for ambiguous current handles", async () => {
    listPrimaryPersonExternalIdsByPersonIdsMock.mockImplementation(
      async (personIds: readonly string[]) =>
        new Map(
          personIds.map((personId) => {
            if (personId === "person-andy" || personId === "person-producer") {
              return [
                personId,
                [
                  {
                    id: personId === "person-andy" ? 8 : 9,
                    source_id: "youtube",
                    external_id: "@sharedchannel",
                    is_primary: true,
                    valid_from: null,
                    valid_to: null,
                    observed_at: null,
                  },
                ],
              ] as const;
            }
            return [personId, []] as const;
          }),
        ),
    );
    queryMock.mockResolvedValue({
      rows: [
        {
          person_id: "person-andy",
          platform: "youtube",
          account_handle: "sharedchannel",
          scraped_at: "2026-04-21T12:00:00.000Z",
          updated_at: "2026-04-21T12:05:00.000Z",
          stats_refreshed: true,
          socialblade_url: "https://socialblade.com/youtube/user/sharedchannel",
        },
      ],
    });

    const payload = await getSocialLandingPayload();

    expect(payload.cast_socialblade_shows).toEqual([
      expect.objectContaining({
        show_id: "show-wwhl",
        platform_counts: { youtube: 1 },
        members: [
          expect.objectContaining({
            person_id: "person-andy",
            full_name: "Andy Cohen",
            accounts: [
              expect.objectContaining({
                platform: "youtube",
                handle: "sharedchannel",
                account_href: "/social/youtube/sharedchannel/socialblade",
              }),
            ],
          }),
        ],
      }),
    ]);
  });

  it("assigns a matching handle row to the current cast member when row person_id is stale", async () => {
    queryMock.mockResolvedValue({
      rows: [
        {
          person_id: "person-stale-owner",
          platform: "youtube",
          account_handle: "andycohen",
          scraped_at: "2026-04-21T12:00:00.000Z",
          updated_at: "2026-04-21T12:05:00.000Z",
          stats_refreshed: true,
          socialblade_url: "https://socialblade.com/youtube/user/andycohen",
        },
      ],
    });

    const payload = await getSocialLandingPayload();

    expect(payload.cast_socialblade_shows).toEqual([
      expect.objectContaining({
        show_id: "show-wwhl",
        platform_counts: { youtube: 1 },
        members: [
          expect.objectContaining({
            person_id: "person-andy",
            full_name: "Andy Cohen",
            accounts: [
              expect.objectContaining({
                platform: "youtube",
                handle: "andycohen",
                account_href: "/social/youtube/andycohen/socialblade",
                stats_refreshed: true,
              }),
            ],
          }),
        ],
      }),
    ]);
  });

  it("matches legacy account-only YouTube SocialBlade route handles to current cast handles", async () => {
    queryMock.mockResolvedValue({
      rows: [
        {
          person_id: null,
          platform: "youtube",
          account_handle: "user/AndyCohen",
          scraped_at: "2026-04-21T12:00:00.000Z",
          updated_at: "2026-04-21T12:05:00.000Z",
          stats_refreshed: true,
          socialblade_url: "https://socialblade.com/youtube/user/andycohen",
        },
      ],
    });

    const payload = await getSocialLandingPayload();

    expect(payload.cast_socialblade_shows).toEqual([
      expect.objectContaining({
        show_id: "show-wwhl",
        platform_counts: { youtube: 1 },
        members: [
          expect.objectContaining({
            person_id: "person-andy",
            full_name: "Andy Cohen",
            accounts: [
              expect.objectContaining({
                platform: "youtube",
                handle: "andycohen",
                display_label: "andycohen",
                account_href: "/social/youtube/andycohen/socialblade",
                socialblade_url: "https://socialblade.com/youtube/user/andycohen",
                stats_refreshed: true,
              }),
            ],
          }),
        ],
      }),
    ]);
  });

  it("fetches mixed-case raw YouTube route candidates before payload matching", async () => {
    listEffectivePersonSocialHandlesByPersonIdsMock.mockResolvedValue(
      new Map([
        [
          "person-andy",
          {
            person_id: "person-andy",
            facebook_handle: null,
            instagram_handle: null,
            tiktok_handle: null,
            twitter_handle: null,
            youtube_handle: "user/AndyCohen",
          },
        ],
      ]),
    );
    const storedRows = [
      {
        person_id: null,
        platform: "youtube",
        account_handle: "user/AndyCohen",
        scraped_at: "2026-04-21T12:00:00.000Z",
        updated_at: "2026-04-21T12:05:00.000Z",
        stats_refreshed: true,
        socialblade_url: "https://socialblade.com/youtube/user/AndyCohen",
      },
    ];
    queryMock.mockImplementation(async (_sql: string, params: unknown[]) => {
      const accountHandleCandidates = params[2] as string[];
      return {
        rows: storedRows.filter((row) =>
          accountHandleCandidates.includes(row.account_handle),
        ),
      };
    });

    const payload = await getSocialLandingPayload();
    const [, params] = queryMock.mock.calls[0] as [string, unknown[]];

    expect(params[2]).toContain("user/AndyCohen");
    expect(payload.cast_socialblade_shows).toEqual([
      expect.objectContaining({
        show_id: "show-wwhl",
        platform_counts: { youtube: 1 },
        members: [
          expect.objectContaining({
            person_id: "person-andy",
            full_name: "Andy Cohen",
            accounts: [
              expect.objectContaining({
                platform: "youtube",
                handle: "andycohen",
                display_label: "andycohen",
                account_href: "/social/youtube/andycohen/socialblade",
                socialblade_url: "https://socialblade.com/youtube/user/AndyCohen",
                stats_refreshed: true,
              }),
            ],
          }),
        ],
      }),
    ]);
  });

  it("matches persisted stripped legacy YouTube SocialBlade handles to current cast handles", async () => {
    queryMock.mockResolvedValue({
      rows: [
        {
          person_id: null,
          platform: "youtube",
          account_handle: "userandycohen",
          scraped_at: "2026-04-21T12:00:00.000Z",
          updated_at: "2026-04-21T12:05:00.000Z",
          stats_refreshed: true,
          socialblade_url: "https://socialblade.com/youtube/user/andycohen",
        },
      ],
    });

    const payload = await getSocialLandingPayload();

    expect(payload.cast_socialblade_shows).toEqual([
      expect.objectContaining({
        show_id: "show-wwhl",
        platform_counts: { youtube: 1 },
        members: [
          expect.objectContaining({
            person_id: "person-andy",
            full_name: "Andy Cohen",
            accounts: [
              expect.objectContaining({
                platform: "youtube",
                handle: "andycohen",
                display_label: "andycohen",
                account_href: "/social/youtube/andycohen/socialblade",
                socialblade_url: "https://socialblade.com/youtube/user/andycohen",
                stats_refreshed: true,
              }),
            ],
          }),
        ],
      }),
    ]);
  });

  it("prefers exact YouTube handles over colliding stripped legacy aliases", async () => {
    listPrimaryPersonExternalIdsByPersonIdsMock.mockImplementation(
      async (personIds: readonly string[]) =>
        new Map(
          personIds.map((personId) => {
            if (personId === "person-andy") {
              return [
                personId,
                [
                  {
                    id: 8,
                    source_id: "youtube",
                    external_id: "@andycohen",
                    is_primary: true,
                    valid_from: null,
                    valid_to: null,
                    observed_at: null,
                  },
                ],
              ] as const;
            }
            if (personId === "person-producer") {
              return [
                personId,
                [
                  {
                    id: 9,
                    source_id: "youtube",
                    external_id: "@userandycohen",
                    is_primary: true,
                    valid_from: null,
                    valid_to: null,
                    observed_at: null,
                  },
                ],
              ] as const;
            }
            return [personId, []] as const;
          }),
        ),
    );
    queryMock.mockResolvedValue({
      rows: [
        {
          person_id: null,
          platform: "youtube",
          account_handle: "userandycohen",
          scraped_at: "2026-04-21T12:00:00.000Z",
          updated_at: "2026-04-21T12:05:00.000Z",
          stats_refreshed: true,
          socialblade_url: "https://socialblade.com/youtube/user/userandycohen",
        },
      ],
    });

    const payload = await getSocialLandingPayload();

    expect(payload.cast_socialblade_shows).toEqual([
      expect.objectContaining({
        show_id: "show-wwhl",
        platform_counts: { youtube: 1 },
        members: [
          expect.objectContaining({
            person_id: "person-producer",
            full_name: "Producer Without Handles",
            accounts: [
              expect.objectContaining({
                platform: "youtube",
                handle: "userandycohen",
                account_href: "/social/youtube/userandycohen/socialblade",
              }),
            ],
          }),
        ],
      }),
    ]);
  });

  it("chooses the newest SocialBlade row when duplicate handle rows match", async () => {
    queryMock.mockResolvedValue({
      rows: [
        {
          person_id: null,
          platform: "youtube",
          account_handle: "andycohen",
          scraped_at: "2026-04-20T12:00:00.000Z",
          updated_at: "2026-04-20T12:05:00.000Z",
          created_at: "2026-04-20T12:01:00.000Z",
          stats_refreshed: false,
          socialblade_url: "https://socialblade.com/youtube/user/andycohen-old",
        },
        {
          person_id: null,
          platform: "youtube",
          account_handle: "andycohen",
          scraped_at: "2026-04-21T12:00:00.000Z",
          updated_at: "2026-04-21T12:05:00.000Z",
          created_at: "2026-04-21T12:01:00.000Z",
          stats_refreshed: true,
          socialblade_url: "https://socialblade.com/youtube/user/andycohen-new",
        },
      ],
    });

    const payload = await getSocialLandingPayload();

    expect(
      payload.cast_socialblade_shows[0]?.members[0]?.accounts[0],
    ).toMatchObject({
      handle: "andycohen",
      socialblade_url: "https://socialblade.com/youtube/user/andycohen-new",
      scraped_at: "2026-04-21T12:00:00.000Z",
      stats_refreshed: true,
    });
  });

  it("prefers a person-specific SocialBlade row over a newer generic duplicate", async () => {
    queryMock.mockResolvedValue({
      rows: [
        {
          person_id: null,
          platform: "youtube",
          account_handle: "andycohen",
          scraped_at: "2026-04-23T12:00:00.000Z",
          updated_at: "2026-04-23T12:05:00.000Z",
          created_at: "2026-04-23T12:01:00.000Z",
          stats_refreshed: false,
          socialblade_url: "https://socialblade.com/youtube/user/andycohen-generic",
        },
        {
          person_id: "person-andy",
          platform: "youtube",
          account_handle: "andycohen",
          scraped_at: "2026-04-21T12:00:00.000Z",
          updated_at: "2026-04-21T12:05:00.000Z",
          created_at: "2026-04-21T12:01:00.000Z",
          stats_refreshed: true,
          socialblade_url: "https://socialblade.com/youtube/user/andycohen-specific",
        },
      ],
    });

    const payload = await getSocialLandingPayload();

    expect(
      payload.cast_socialblade_shows[0]?.members[0]?.accounts[0],
    ).toMatchObject({
      handle: "andycohen",
      socialblade_url: "https://socialblade.com/youtube/user/andycohen-specific",
      scraped_at: "2026-04-21T12:00:00.000Z",
      stats_refreshed: true,
    });
  });

  it("uses stable id order when duplicate SocialBlade rows have equal metadata", async () => {
    queryMock.mockResolvedValue({
      rows: [
        {
          id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          person_id: null,
          platform: "youtube",
          account_handle: "andycohen",
          scraped_at: "2026-04-21T12:00:00.000Z",
          updated_at: "2026-04-21T12:05:00.000Z",
          created_at: "2026-04-21T12:01:00.000Z",
          stats_refreshed: false,
          socialblade_url: "https://socialblade.com/youtube/user/andycohen-b",
        },
        {
          id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          person_id: null,
          platform: "youtube",
          account_handle: "andycohen",
          scraped_at: "2026-04-21T12:00:00.000Z",
          updated_at: "2026-04-21T12:05:00.000Z",
          created_at: "2026-04-21T12:01:00.000Z",
          stats_refreshed: true,
          socialblade_url: "https://socialblade.com/youtube/user/andycohen-a",
        },
      ],
    });

    const payload = await getSocialLandingPayload();

    expect(
      payload.cast_socialblade_shows[0]?.members[0]?.accounts[0],
    ).toMatchObject({
      handle: "andycohen",
      socialblade_url: "https://socialblade.com/youtube/user/andycohen-a",
      stats_refreshed: true,
    });
  });

  it("omits unsupported platforms and shows with no SocialBlade rows", async () => {
    queryMock.mockResolvedValue({
      rows: [
        {
          person_id: "person-heather",
          platform: "tiktok",
          account_handle: "heathergay",
          scraped_at: "2026-04-22T12:00:00.000Z",
          updated_at: "2026-04-22T12:05:00.000Z",
          stats_refreshed: true,
          socialblade_url: "https://example.test/unsupported",
        },
        {
          person_id: null,
          platform: "facebook",
          account_handle: "unmatched-account",
          scraped_at: "2026-04-22T13:00:00.000Z",
          updated_at: "2026-04-22T13:05:00.000Z",
          stats_refreshed: true,
          socialblade_url: null,
        },
      ],
    });

    const payload = await getSocialLandingPayload();

    expect(payload.cast_socialblade_shows).toEqual([]);
  });

  it("returns an empty cast SocialBlade section when storage is unavailable without breaking the landing payload", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    queryMock.mockRejectedValue(new Error("relation does not exist"));

    const payload = await getSocialLandingPayload();

    expect(payload.cast_socialblade_shows).toEqual([]);
    expect(payload.network_sets).toHaveLength(1);
    expect(payload.show_sets).toHaveLength(2);
    expect(payload.people_profiles.map((person) => person.full_name)).toEqual([
      "Andy Cohen",
      "Heather Gay",
    ]);
    expect(warnSpy).toHaveBeenCalledWith(
      "[social-landing] Failed to load cast SocialBlade rows",
      expect.any(Error),
    );

    warnSpy.mockRestore();
  });
});
