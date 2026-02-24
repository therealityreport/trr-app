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
  });

  it("enforces required flair filter for non-show-focused episode discovery", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify(
          makeListing([
            {
              id: "flair-pass",
              title: "RHOSLC Season 6 Live Episode Discussion",
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
              title: "RHOSLC Season 6 Live Episode Discussion",
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
              title: "RHOSLC Season 6 Live Episode Discussion",
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
              title: "RHOSLC Season 6 Live Episode Discussion",
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
              title: "RHOSLC Season 6 Live Episode Discussion",
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
});
