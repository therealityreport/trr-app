import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RedditDiscoveryError,
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
    expect(matched?.source_sorts.sort()).toEqual(["new", "top"]);

    expect(result.hints.suggested_include_terms.some((term) => term.includes("rhoslc"))).toBe(
      true,
    );
    expect(
      result.hints.suggested_exclude_terms.some((term) => term.includes("wife swap")),
    ).toBe(true);
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
});
