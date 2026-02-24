import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RedditDiscoveryError,
  discoverEpisodeDiscussionThreads,
  discoverSubredditThreads,
} from "@/lib/server/admin/reddit-discovery-service";

const makeListing = (posts: Array<Record<string, unknown>>) => ({
  data: {
    children: posts.map((post) => ({ data: post })),
  },
});

describe("reddit-discovery-service", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("discovers threads across new/hot/top and returns match/exclude hints", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/new.json")) {
        return new Response(
          JSON.stringify(
            makeListing([
              {
                id: "post1",
                title: "RHOSLC S6 E5 Episode Discussion",
                selftext: "Let us talk about the Salt Lake City episode.",
                url: "https://www.reddit.com/r/BravoRealHousewives/comments/post1/example/",
                permalink: "/r/BravoRealHousewives/comments/post1/example/",
                author: "user1",
                score: 250,
                num_comments: 120,
                created_utc: 1_706_000_000,
                link_flair_text: "Episode Discussion",
              },
            ]),
          ),
          { status: 200 },
        );
      }
      if (url.includes("/hot.json")) {
        return new Response(
          JSON.stringify(
            makeListing([
              {
                id: "post2",
                title: "Wife Swap: The Real Housewives Edition promo",
                selftext: "RHOP cast mention and crossover chat",
                url: "https://www.reddit.com/r/BravoRealHousewives/comments/post2/example/",
                permalink: "/r/BravoRealHousewives/comments/post2/example/",
                author: "user2",
                score: 175,
                num_comments: 64,
                created_utc: 1_706_000_500,
                link_flair_text: "Promo",
              },
            ]),
          ),
          { status: 200 },
        );
      }
      if (url.includes("/top.json")) {
        return new Response(
          JSON.stringify(
            makeListing([
              {
                id: "post1",
                title: "RHOSLC S6 E5 Episode Discussion",
                selftext: "Duplicate from top listing.",
                url: "https://www.reddit.com/r/BravoRealHousewives/comments/post1/example/",
                permalink: "/r/BravoRealHousewives/comments/post1/example/",
                author: "user1",
                score: 260,
                num_comments: 130,
                created_utc: 1_706_001_000,
                link_flair_text: "Episode Discussion",
              },
            ]),
          ),
          { status: 200 },
        );
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await discoverSubredditThreads({
      subreddit: "BravoRealHousewives",
      showName: "The Real Housewives of Salt Lake City",
      showAliases: ["RHOSLC"],
    });

    expect(result.sources_fetched).toEqual(["new", "hot", "top"]);
    expect(result.threads).toHaveLength(2);

    const matched = result.threads.find((thread) => thread.reddit_post_id === "post1");
    expect(matched?.is_show_match).toBe(true);
    expect(matched?.passes_flair_filter).toBe(true);
    expect(matched?.source_sorts.sort()).toEqual(["new", "top"]);

    expect(result.hints.suggested_include_terms.some((term) => term.includes("rhoslc"))).toBe(
      true,
    );
    expect(
      result.hints.suggested_exclude_terms.some((term) => term.includes("wife swap")),
    ).toBe(true);
  });

  it("supports all-post and scan-by-terms flare modes", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes(".json")) {
        return new Response(
          JSON.stringify(
            makeListing([
              {
                id: "flair-match-cast",
                title: "Thoughts on Meredith this week",
                selftext: "Meredith had a strong showing.",
                url: "https://www.reddit.com/r/realhousewivesofSLC/comments/flair-match-cast/example/",
                permalink: "/r/realhousewivesofSLC/comments/flair-match-cast/example/",
                author: "user1",
                score: 90,
                num_comments: 20,
                created_utc: 1_706_001_000,
                link_flair_text: ":Meredith: Meredith Marksss 🛀",
              },
              {
                id: "flair-match-no-cast",
                title: "General housewives off-topic chat",
                selftext: "No Salt Lake or cast names here.",
                url: "https://www.reddit.com/r/realhousewivesofSLC/comments/flair-match-no-cast/example/",
                permalink: "/r/realhousewivesofSLC/comments/flair-match-no-cast/example/",
                author: "user2",
                score: 70,
                num_comments: 10,
                created_utc: 1_706_001_001,
                link_flair_text: "Chat/Discussion 👄",
              },
              {
                id: "all-post-selected-no-match",
                title: "BravoCon check-in",
                selftext: "No cast names or SLC references in this thread.",
                url: "https://www.reddit.com/r/realhousewivesofSLC/comments/all-post-selected-no-match/example/",
                permalink: "/r/realhousewivesofSLC/comments/all-post-selected-no-match/example/",
                author: "user4",
                score: 65,
                num_comments: 8,
                created_utc: 1_706_001_003,
                link_flair_text: "Salt Lake City",
              },
              {
                id: "flair-miss",
                title: "RHOSLC but wrong flair",
                selftext: "Talks RHOSLC but flair is not selected.",
                url: "https://www.reddit.com/r/realhousewivesofSLC/comments/flair-miss/example/",
                permalink: "/r/realhousewivesofSLC/comments/flair-miss/example/",
                author: "user3",
                score: 95,
                num_comments: 32,
                created_utc: 1_706_001_002,
                link_flair_text: "S4 ❄️",
              },
            ]),
          ),
          { status: 200 },
        );
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await discoverSubredditThreads({
      subreddit: "realhousewivesofSLC",
      showName: "The Real Housewives of Salt Lake City",
      showAliases: ["RHOSLC"],
      castNames: ["Meredith Marks", "Lisa Barlow"],
      analysisFlares: ["Chat/Discussion 👄", ":Meredith: Meredith Marksss 🛀"],
      analysisAllFlares: ["Salt Lake City"],
      sortModes: ["new"],
    });

    expect(result.threads.map((thread) => thread.reddit_post_id)).toEqual([
      "flair-match-cast",
      "all-post-selected-no-match",
    ]);
    expect(result.threads[0]?.passes_flair_filter).toBe(true);
    expect(result.threads[0]?.matched_cast_terms.length).toBeGreaterThan(0);
    expect(result.threads[0]?.link_flair_text).toBe("Meredith Marksss");
    expect(result.threads[1]?.is_show_match).toBe(false);
    expect(result.threads[1]?.passes_flair_filter).toBe(true);
  });

  it("bypasses flair gating and includes no-flair posts for show-focused communities", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify(
          makeListing([
            {
              id: "show-focused-no-flair",
              title: "Open thread with no flair",
              selftext: "General chatter without explicit terms.",
              url: "https://www.reddit.com/r/realhousewivesofSLC/comments/show-focused-no-flair/example/",
              permalink: "/r/realhousewivesofSLC/comments/show-focused-no-flair/example/",
              author: "user1",
              score: 20,
              num_comments: 5,
              created_utc: 1_706_001_200,
              link_flair_text: null,
            },
          ]),
        ),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await discoverSubredditThreads({
      subreddit: "realhousewivesofSLC",
      showName: "The Real Housewives of Salt Lake City",
      showAliases: ["RHOSLC"],
      castNames: ["Meredith Marks"],
      isShowFocused: true,
      analysisFlares: ["Chat/Discussion"],
      analysisAllFlares: ["Salt Lake City"],
      sortModes: ["new"],
    });

    expect(result.threads).toHaveLength(1);
    expect(result.threads[0]?.reddit_post_id).toBe("show-focused-no-flair");
    expect(result.threads[0]?.passes_flair_filter).toBe(true);
  });

  it("throws 404 when subreddit is missing", async () => {
    const fetchMock = vi.fn(async () => new Response("not found", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(
      discoverSubredditThreads({
        subreddit: "this_sub_does_not_exist",
        showName: "The Real Housewives of Salt Lake City",
        showAliases: ["RHOSLC"],
      }),
    ).rejects.toMatchObject<Partial<RedditDiscoveryError>>({
      status: 404,
    });
  });

  it("throws 429 when reddit rate-limits", async () => {
    const fetchMock = vi.fn(async () => new Response("rate limited", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(
      discoverSubredditThreads({
        subreddit: "BravoRealHousewives",
        showName: "The Real Housewives of Salt Lake City",
        showAliases: ["RHOSLC"],
      }),
    ).rejects.toMatchObject<Partial<RedditDiscoveryError>>({
      status: 429,
    });
  });

  it("discovers episode discussion candidates using phrase + season + show matching", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify(
          makeListing([
            {
              id: "episode-match",
              title: "RHOSLC - Season 6 - Episode 4 - Live Episode Discussion",
              selftext: "Salt Lake City discussion thread.",
              url: "https://www.reddit.com/r/BravoRealHousewives/comments/episode-match/test/",
              permalink: "/r/BravoRealHousewives/comments/episode-match/test/",
              author: "user1",
              score: 200,
              num_comments: 88,
              created_utc: 1_706_001_400,
              link_flair_text: "Salt Lake City",
            },
            {
              id: "wrong-season",
              title: "RHOSLC - Season 5 - Episode 10 - Live Episode Discussion",
              selftext: "Old season thread.",
              url: "https://www.reddit.com/r/BravoRealHousewives/comments/wrong-season/test/",
              permalink: "/r/BravoRealHousewives/comments/wrong-season/test/",
              author: "user2",
              score: 100,
              num_comments: 20,
              created_utc: 1_706_001_401,
              link_flair_text: "Salt Lake City",
            },
          ]),
        ),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await discoverEpisodeDiscussionThreads({
      subreddit: "BravoRealHousewives",
      showName: "The Real Housewives of Salt Lake City",
      showAliases: ["RHOSLC"],
      seasonNumber: 6,
      episodeTitlePatterns: ["Live Episode Discussion"],
      episodeRequiredFlares: ["Salt Lake City"],
      isShowFocused: false,
      sortModes: ["new"],
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.reddit_post_id).toBe("episode-match");
    expect(result.candidates[0]?.num_comments).toBe(88);
    expect(result.candidates[0]?.episode_number).toBe(4);
    expect(result.candidates[0]?.discussion_type).toBe("live");
    expect(result.episode_matrix).toEqual([
      {
        episode_number: 4,
        live: {
          post_count: 1,
          total_comments: 88,
          total_upvotes: 200,
          top_post_id: "episode-match",
          top_post_url: "https://www.reddit.com/r/BravoRealHousewives/comments/episode-match/test/",
        },
        post: {
          post_count: 0,
          total_comments: 0,
          total_upvotes: 0,
          top_post_id: null,
          top_post_url: null,
        },
        weekly: {
          post_count: 0,
          total_comments: 0,
          total_upvotes: 0,
          top_post_id: null,
          top_post_url: null,
        },
        total_posts: 1,
        total_comments: 88,
        total_upvotes: 200,
      },
    ]);
  });

  it("enforces required flair filter for non-show-focused episode discovery", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify(
          makeListing([
            {
              id: "flair-pass",
              title: "RHOSLC Season 6 Episode 5 Live Episode Discussion",
              selftext: "Thread text",
              url: "https://www.reddit.com/r/BravoRealHousewives/comments/flair-pass/test/",
              permalink: "/r/BravoRealHousewives/comments/flair-pass/test/",
              author: "user1",
              score: 90,
              num_comments: 10,
              created_utc: 1_706_001_500,
              link_flair_text: "Salt Lake City",
            },
            {
              id: "flair-fail",
              title: "RHOSLC Season 6 Episode 6 Live Episode Discussion",
              selftext: "Thread text",
              url: "https://www.reddit.com/r/BravoRealHousewives/comments/flair-fail/test/",
              permalink: "/r/BravoRealHousewives/comments/flair-fail/test/",
              author: "user2",
              score: 80,
              num_comments: 9,
              created_utc: 1_706_001_501,
              link_flair_text: "Discussion",
            },
          ]),
        ),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await discoverEpisodeDiscussionThreads({
      subreddit: "BravoRealHousewives",
      showName: "The Real Housewives of Salt Lake City",
      showAliases: ["RHOSLC"],
      seasonNumber: 6,
      episodeTitlePatterns: ["Live Episode Discussion"],
      episodeRequiredFlares: ["Salt Lake City"],
      isShowFocused: false,
      sortModes: ["new"],
    });

    expect(result.candidates.map((candidate) => candidate.reddit_post_id)).toEqual(["flair-pass"]);
  });

  it("bypasses episode required flair gating when show-focused", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify(
          makeListing([
            {
              id: "show-focused-candidate",
              title: "RHOSLC Season 6 Episode 9 Live Episode Discussion",
              selftext: "Thread text",
              url: "https://www.reddit.com/r/realhousewivesofSLC/comments/show-focused-candidate/test/",
              permalink: "/r/realhousewivesofSLC/comments/show-focused-candidate/test/",
              author: "user1",
              score: 50,
              num_comments: 8,
              created_utc: 1_706_001_550,
              link_flair_text: null,
            },
          ]),
        ),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await discoverEpisodeDiscussionThreads({
      subreddit: "realhousewivesofSLC",
      showName: "The Real Housewives of Salt Lake City",
      showAliases: ["RHOSLC"],
      seasonNumber: 6,
      episodeTitlePatterns: ["Live Episode Discussion"],
      episodeRequiredFlares: ["Salt Lake City"],
      isShowFocused: true,
      sortModes: ["new"],
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.reddit_post_id).toBe("show-focused-candidate");
  });

  it("includes episode candidates only when posted within selected period window", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify(
          makeListing([
            {
              id: "period-inside",
              title: "RHOSLC Season 6 Episode 2 Live Episode Discussion",
              selftext: "Thread text",
              url: "https://www.reddit.com/r/BravoRealHousewives/comments/period-inside/test/",
              permalink: "/r/BravoRealHousewives/comments/period-inside/test/",
              author: "user1",
              score: 90,
              num_comments: 10,
              created_utc: 1_704_067_200,
              link_flair_text: "Salt Lake City",
            },
            {
              id: "period-outside",
              title: "RHOSLC Season 6 Episode 3 Live Episode Discussion",
              selftext: "Thread text",
              url: "https://www.reddit.com/r/BravoRealHousewives/comments/period-outside/test/",
              permalink: "/r/BravoRealHousewives/comments/period-outside/test/",
              author: "user2",
              score: 80,
              num_comments: 8,
              created_utc: 1_709_251_200,
              link_flair_text: "Salt Lake City",
            },
          ]),
        ),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await discoverEpisodeDiscussionThreads({
      subreddit: "BravoRealHousewives",
      showName: "The Real Housewives of Salt Lake City",
      showAliases: ["RHOSLC"],
      seasonNumber: 6,
      episodeTitlePatterns: ["Live Episode Discussion"],
      episodeRequiredFlares: ["Salt Lake City"],
      isShowFocused: false,
      periodStart: "2024-01-01T00:00:00.000Z",
      periodEnd: "2024-01-31T23:59:59.000Z",
      sortModes: ["new"],
    });

    expect(result.candidates.map((candidate) => candidate.reddit_post_id)).toEqual(["period-inside"]);
  });

  it("parses Episode, E, and SxE formats and excludes titles without episode number", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify(
          makeListing([
            {
              id: "episode-format",
              title: "RHOSLC Season 6 Episode 7 Live Episode Discussion",
              selftext: "Thread text",
              url: "https://www.reddit.com/r/BravoRealHousewives/comments/episode-format/test/",
              permalink: "/r/BravoRealHousewives/comments/episode-format/test/",
              author: "user1",
              score: 100,
              num_comments: 30,
              created_utc: 1_706_001_700,
              link_flair_text: "Salt Lake City",
            },
            {
              id: "sxe-format",
              title: "RHOSLC S6E8 Post Episode Discussion",
              selftext: "Thread text",
              url: "https://www.reddit.com/r/BravoRealHousewives/comments/sxe-format/test/",
              permalink: "/r/BravoRealHousewives/comments/sxe-format/test/",
              author: "user2",
              score: 95,
              num_comments: 28,
              created_utc: 1_706_001_701,
              link_flair_text: "Salt Lake City",
            },
            {
              id: "e-format",
              title: "RHOSLC Season 6 E9 Weekly Episode Discussion",
              selftext: "Thread text",
              url: "https://www.reddit.com/r/BravoRealHousewives/comments/e-format/test/",
              permalink: "/r/BravoRealHousewives/comments/e-format/test/",
              author: "user3",
              score: 90,
              num_comments: 25,
              created_utc: 1_706_001_702,
              link_flair_text: "Salt Lake City",
            },
            {
              id: "missing-episode-number",
              title: "RHOSLC Season 6 Live Episode Discussion",
              selftext: "Thread text",
              url: "https://www.reddit.com/r/BravoRealHousewives/comments/missing-episode-number/test/",
              permalink: "/r/BravoRealHousewives/comments/missing-episode-number/test/",
              author: "user4",
              score: 80,
              num_comments: 20,
              created_utc: 1_706_001_703,
              link_flair_text: "Salt Lake City",
            },
          ]),
        ),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await discoverEpisodeDiscussionThreads({
      subreddit: "BravoRealHousewives",
      showName: "The Real Housewives of Salt Lake City",
      showAliases: ["RHOSLC"],
      seasonNumber: 6,
      episodeTitlePatterns: [
        "Live Episode Discussion",
        "Post Episode Discussion",
        "Weekly Episode Discussion",
      ],
      episodeRequiredFlares: ["Salt Lake City"],
      isShowFocused: false,
      sortModes: ["new"],
    });

    expect(result.candidates.map((candidate) => candidate.reddit_post_id)).toEqual([
      "episode-format",
      "sxe-format",
      "e-format",
    ]);
    expect(result.candidates.map((candidate) => candidate.episode_number)).toEqual([7, 8, 9]);
    expect(result.candidates.map((candidate) => candidate.discussion_type)).toEqual([
      "live",
      "post",
      "weekly",
    ]);
  });

  it("continues discovery when one sort fails and returns per-sort diagnostics", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/new.json")) {
        return new Response(
          JSON.stringify(
            makeListing([
              {
                id: "new-pass",
                title: "RHOSLC Season 6 Episode 1 Live Episode Discussion",
                selftext: "Thread text",
                url: "https://www.reddit.com/r/BravoRealHousewives/comments/new-pass/test/",
                permalink: "/r/BravoRealHousewives/comments/new-pass/test/",
                author: "user1",
                score: 100,
                num_comments: 30,
                created_utc: 1_706_100_000,
                link_flair_text: "Salt Lake City",
              },
            ]),
          ),
          { status: 200 },
        );
      }
      if (url.includes("/hot.json")) {
        return new Response("temporary error", { status: 503 });
      }
      if (url.includes("/top.json")) {
        return new Response(
          JSON.stringify(
            makeListing([
              {
                id: "top-pass",
                title: "RHOSLC Season 6 Episode 2 Post Episode Discussion",
                selftext: "Thread text",
                url: "https://www.reddit.com/r/BravoRealHousewives/comments/top-pass/test/",
                permalink: "/r/BravoRealHousewives/comments/top-pass/test/",
                author: "user2",
                score: 80,
                num_comments: 10,
                created_utc: 1_706_100_001,
                link_flair_text: "Salt Lake City",
              },
            ]),
          ),
          { status: 200 },
        );
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await discoverEpisodeDiscussionThreads({
      subreddit: "BravoRealHousewives",
      showName: "The Real Housewives of Salt Lake City",
      showAliases: ["RHOSLC"],
      seasonNumber: 6,
      episodeTitlePatterns: ["Live Episode Discussion", "Post Episode Discussion"],
      episodeRequiredFlares: ["Salt Lake City"],
      isShowFocused: false,
      sortModes: ["new", "hot", "top"],
    });

    expect(result.candidates.map((candidate) => candidate.reddit_post_id)).toEqual([
      "new-pass",
      "top-pass",
    ]);
    expect(result.successful_sorts).toEqual(["new", "top"]);
    expect(result.failed_sorts).toEqual(["hot"]);
    expect(result.rate_limited_sorts).toEqual([]);
  });

  it("retries retryable reddit failures before succeeding", async () => {
    const fetchMock = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValueOnce(new Response("rate limit", { status: 429 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify(
            makeListing([
              {
                id: "retried-pass",
                title: "RHOSLC Season 6 Episode 3 Weekly Episode Discussion",
                selftext: "Thread text",
                url: "https://www.reddit.com/r/BravoRealHousewives/comments/retried-pass/test/",
                permalink: "/r/BravoRealHousewives/comments/retried-pass/test/",
                author: "user3",
                score: 60,
                num_comments: 14,
                created_utc: 1_706_100_002,
                link_flair_text: "Salt Lake City",
              },
            ]),
          ),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await discoverEpisodeDiscussionThreads({
      subreddit: "BravoRealHousewives",
      showName: "The Real Housewives of Salt Lake City",
      showAliases: ["RHOSLC"],
      seasonNumber: 6,
      episodeTitlePatterns: ["Weekly Episode Discussion"],
      episodeRequiredFlares: ["Salt Lake City"],
      isShowFocused: false,
      sortModes: ["new"],
    });

    expect(result.candidates).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("matches discussion type aliases when canonical patterns are configured", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify(
          makeListing([
            {
              id: "live-alias",
              title: "RHOSLC Season 6 Episode 1 Live Thread",
              selftext: "Thread text",
              url: "https://www.reddit.com/r/BravoRealHousewives/comments/live-alias/test/",
              permalink: "/r/BravoRealHousewives/comments/live-alias/test/",
              author: "user1",
              score: 50,
              num_comments: 12,
              created_utc: 1_706_100_010,
              link_flair_text: "Salt Lake City",
            },
            {
              id: "post-alias",
              title: "RHOSLC Season 6 Episode 1 Post-Episode Discussion",
              selftext: "Thread text",
              url: "https://www.reddit.com/r/BravoRealHousewives/comments/post-alias/test/",
              permalink: "/r/BravoRealHousewives/comments/post-alias/test/",
              author: "user2",
              score: 51,
              num_comments: 13,
              created_utc: 1_706_100_011,
              link_flair_text: "Salt Lake City",
            },
            {
              id: "weekly-alias",
              title: "RHOSLC Season 6 Episode 1 Weekly Thread",
              selftext: "Thread text",
              url: "https://www.reddit.com/r/BravoRealHousewives/comments/weekly-alias/test/",
              permalink: "/r/BravoRealHousewives/comments/weekly-alias/test/",
              author: "user3",
              score: 52,
              num_comments: 14,
              created_utc: 1_706_100_012,
              link_flair_text: "Salt Lake City",
            },
          ]),
        ),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await discoverEpisodeDiscussionThreads({
      subreddit: "BravoRealHousewives",
      showName: "The Real Housewives of Salt Lake City",
      showAliases: ["RHOSLC"],
      seasonNumber: 6,
      episodeTitlePatterns: [
        "Live Episode Discussion",
        "Post Episode Discussion",
        "Weekly Episode Discussion",
      ],
      episodeRequiredFlares: ["Salt Lake City"],
      isShowFocused: false,
      sortModes: ["new"],
    });

    expect(result.candidates.map((candidate) => candidate.discussion_type)).toEqual([
      "live",
      "post",
      "weekly",
    ]);
  });

  it("rejects ambiguous episode numbers extracted from conflicting title tokens", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify(
          makeListing([
            {
              id: "ambiguous-episode",
              title: "RHOSLC Season 6 Episode 5 S6E6 Live Episode Discussion",
              selftext: "Thread text",
              url: "https://www.reddit.com/r/BravoRealHousewives/comments/ambiguous-episode/test/",
              permalink: "/r/BravoRealHousewives/comments/ambiguous-episode/test/",
              author: "user1",
              score: 42,
              num_comments: 7,
              created_utc: 1_706_100_020,
              link_flair_text: "Salt Lake City",
            },
          ]),
        ),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await discoverEpisodeDiscussionThreads({
      subreddit: "BravoRealHousewives",
      showName: "The Real Housewives of Salt Lake City",
      showAliases: ["RHOSLC"],
      seasonNumber: 6,
      episodeTitlePatterns: ["Live Episode Discussion"],
      episodeRequiredFlares: ["Salt Lake City"],
      isShowFocused: false,
      sortModes: ["new"],
    });

    expect(result.candidates).toHaveLength(0);
  });
});
