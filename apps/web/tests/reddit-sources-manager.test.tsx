import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import RedditSourcesManager from "@/components/admin/reddit-sources-manager";
import { auth } from "@/lib/firebase";

const { usePathnameMock, useSearchParamsMock, useRouterPushMock, useRouterReplaceMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(() => "/admin/social-media"),
  useSearchParamsMock: vi.fn(() => new URLSearchParams()),
  useRouterPushMock: vi.fn(),
  useRouterReplaceMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
  useSearchParams: useSearchParamsMock,
  useRouter: () => ({ push: useRouterPushMock, replace: useRouterReplaceMock }),
}));

const baseCommunity = {
  id: "community-1",
  trr_show_id: "show-1",
  trr_show_name: "The Real Housewives of Salt Lake City",
  subreddit: "BravoRealHousewives",
  display_name: "Bravo RH",
  notes: null,
  is_active: true,
  post_flares: ["Episode Discussion", "Live Thread"],
  analysis_flares: ["Episode Discussion"],
  analysis_all_flares: [],
  is_show_focused: false,
  network_focus_targets: ["Bravo"],
  franchise_focus_targets: ["Real Housewives"],
  episode_title_patterns: ["Live Episode Discussion", "Post Episode Discussion"],
  post_flares_updated_at: "2026-01-01T00:00:00.000Z",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  assigned_thread_count: 1,
  assigned_threads: [
    {
      id: "thread-1",
      community_id: "community-1",
      trr_show_id: "show-1",
      trr_show_name: "The Real Housewives of Salt Lake City",
      trr_season_id: "season-1",
      reddit_post_id: "post1",
      title: "S6E5 discussion",
      url: "https://www.reddit.com/r/BravoRealHousewives/comments/post1/s6e5/",
      permalink: "/r/BravoRealHousewives/comments/post1/s6e5/",
      author: "user1",
      score: 120,
      num_comments: 80,
      posted_at: "2026-01-10T00:00:00.000Z",
      notes: null,
      created_at: "2026-01-10T00:00:00.000Z",
      updated_at: "2026-01-10T00:00:00.000Z",
    },
  ],
};

const secondaryCommunity = {
  id: "community-2",
  trr_show_id: "show-2",
  trr_show_name: "The Real Housewives of Potomac",
  subreddit: "RHOP",
  display_name: null,
  notes: null,
  is_active: true,
  post_flares: [],
  analysis_flares: [],
  analysis_all_flares: [],
  is_show_focused: false,
  network_focus_targets: [],
  franchise_focus_targets: [],
  episode_title_patterns: [],
  post_flares_updated_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  assigned_thread_count: 0,
  assigned_threads: [],
};

const coveredShowsPayload = {
  shows: [
    { trr_show_id: "show-1", show_name: "The Real Housewives of Salt Lake City" },
    { trr_show_id: "show-2", show_name: "The Real Housewives of Potomac" },
  ],
};

const discoveryPayload = {
  discovery: {
    subreddit: "BravoRealHousewives",
    fetched_at: "2026-01-11T00:00:00.000Z",
    sources_fetched: ["new", "hot", "top"],
    terms: ["rhoslc", "salt lake city"],
    hints: {
      suggested_include_terms: ["rhoslc", "salt lake city"],
      suggested_exclude_terms: ["wife swap"],
    },
    threads: [
      {
        reddit_post_id: "post-discover-1",
        title: "RHOSLC Reunion Discussion",
        text: "Episode was wild",
        url: "https://www.reddit.com/r/BravoRealHousewives/comments/post-discover-1/test/",
        permalink: "/r/BravoRealHousewives/comments/post-discover-1/test/",
        author: "user2",
        score: 90,
        num_comments: 33,
        posted_at: "2026-01-11T00:00:00.000Z",
        link_flair_text: "Episode Discussion",
        source_sorts: ["hot"],
        matched_terms: ["rhoslc"],
        matched_cast_terms: ["meredith"],
        cross_show_terms: [],
        is_show_match: true,
        passes_flair_filter: true,
        match_score: 2,
        suggested_include_terms: ["rhoslc"],
        suggested_exclude_terms: [],
      },
    ],
  },
};

const jsonResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

const seasonLookup: Record<
  string,
  Array<{
    id: string;
    season_number: number;
    has_scheduled_or_aired_episode?: boolean;
    episode_airdate_count?: number;
  }>
> = {
  "show-1": [
    {
      id: "season-2",
      season_number: 7,
      has_scheduled_or_aired_episode: false,
      episode_airdate_count: 0,
    },
    {
      id: "season-1",
      season_number: 6,
      has_scheduled_or_aired_episode: true,
      episode_airdate_count: 18,
    },
    {
      id: "season-older-1",
      season_number: 5,
      has_scheduled_or_aired_episode: true,
      episode_airdate_count: 20,
    },
  ],
  "show-2": [{ id: "season-9", season_number: 8, has_scheduled_or_aired_episode: true, episode_airdate_count: 12 }],
};

const defaultAnalyticsPayload = {
  weekly: [
    {
      week_index: 1,
      label: "Pre-Season",
      start: "2026-01-01T00:00:00.000Z",
      end: "2026-01-07T23:59:59.000Z",
    },
    {
      week_index: 2,
      label: "Final Reunion",
      start: "2026-01-08T00:00:00.000Z",
      end: "2026-01-14T23:59:59.000Z",
    },
  ],
};

const seasonEpisodeLookup: Record<string, Array<{ id: string; episode_number: number; air_date: string | null }>> = {
  "season-1": [
    { id: "ep-1", episode_number: 1, air_date: "2025-09-16T00:00:00.000Z" },
    { id: "ep-2", episode_number: 2, air_date: "2025-09-23T00:00:00.000Z" },
    { id: "ep-3", episode_number: 3, air_date: "2025-09-30T00:00:00.000Z" },
    { id: "ep-4", episode_number: 4, air_date: "2025-10-07T00:00:00.000Z" },
    { id: "ep-5", episode_number: 5, air_date: "2025-10-14T00:00:00.000Z" },
    { id: "ep-6", episode_number: 6, air_date: "2025-10-21T00:00:00.000Z" },
    { id: "ep-7", episode_number: 7, air_date: "2025-10-28T00:00:00.000Z" },
    { id: "ep-8", episode_number: 8, air_date: "2025-11-04T00:00:00.000Z" },
    { id: "ep-9", episode_number: 9, air_date: "2025-11-11T00:00:00.000Z" },
    { id: "ep-10", episode_number: 10, air_date: "2025-11-18T00:00:00.000Z" },
    { id: "ep-11", episode_number: 11, air_date: "2025-11-25T00:00:00.000Z" },
    { id: "ep-12", episode_number: 12, air_date: "2025-12-02T00:00:00.000Z" },
    { id: "ep-13", episode_number: 13, air_date: "2025-12-09T00:00:00.000Z" },
    { id: "ep-14", episode_number: 14, air_date: "2025-12-16T00:00:00.000Z" },
    { id: "ep-15", episode_number: 15, air_date: "2025-12-30T00:00:00.000Z" },
    { id: "ep-16", episode_number: 16, air_date: "2026-01-06T00:00:00.000Z" },
    { id: "ep-17", episode_number: 17, air_date: "2026-01-13T00:00:00.000Z" },
    { id: "ep-18", episode_number: 18, air_date: "2026-01-20T00:00:00.000Z" },
    { id: "ep-19", episode_number: 19, air_date: "2026-01-27T00:00:00.000Z" },
  ],
  "season-older-1": [
    { id: "ep-old-1", episode_number: 1, air_date: "2024-01-01T00:00:00.000Z" },
  ],
  "season-9": [{ id: "ep-rhop-1", episode_number: 1, air_date: "2025-01-01T00:00:00.000Z" }],
};

const maybeHandleSeasonPeriodRequests = (url: string): Response | null => {
  if (url.includes("/social/analytics")) {
    return jsonResponse(defaultAnalyticsPayload);
  }
  const seasonEpisodesMatch = url.match(/\/api\/admin\/trr-api\/seasons\/([^/]+)\/episodes(?:\?|$)/);
  if (seasonEpisodesMatch) {
    const seasonId = seasonEpisodesMatch[1] ?? "";
    return jsonResponse({ episodes: seasonEpisodeLookup[seasonId] ?? [] });
  }
  const showDetailsMatch = url.match(/\/api\/admin\/trr-api\/shows\/([^/?]+)(?:\?|$)/);
  if (showDetailsMatch && !url.includes("/seasons")) {
    const showId = showDetailsMatch[1] ?? "";
    if (showId === "show-1") {
      return jsonResponse({
        show: {
          id: "show-1",
          slug: "the-real-housewives-of-salt-lake-city",
          alternative_names: ["RHOSLC"],
        },
      });
    }
    return jsonResponse({
      show: {
        id: showId,
        slug: "the-real-housewives-of-potomac",
        alternative_names: ["RHOP"],
      },
    });
  }
  const showSeasonsMatch = url.match(/\/api\/admin\/trr-api\/shows\/([^/]+)\/seasons(?:\?|$)/);
  if (!showSeasonsMatch) return null;
  const showId = showSeasonsMatch[1] ?? "";
  return jsonResponse({ seasons: seasonLookup[showId] ?? [] });
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findCardByPeriodLabel = (label: string): HTMLElement => {
  const exactLabelRegex = new RegExp(`^${escapeRegExp(label)}$`);
  const articleCards = screen.getAllByRole("article");
  const foundCard = articleCards.find((article) => {
    const hasLabel = !!within(article).queryByRole("heading", { name: exactLabelRegex });
    const refreshPostsButtons = within(article).queryAllByRole("button", { name: "Refresh Posts" });
    return hasLabel && refreshPostsButtons.length === 1;
  });
  if (foundCard) {
    return foundCard as HTMLElement;
  }

  const fallbackCard = articleCards.find(
    (article) => !!within(article).queryByText((content) => exactLabelRegex.test(content.trim())),
  );
  if (!fallbackCard) {
    throw new Error(`Unable to find period card for label ${label}`);
  }
  return fallbackCard as HTMLElement;
};

const clickPeriodRefreshPosts = (label: string): HTMLElement => {
  const card = findCardByPeriodLabel(label);
  const refreshPostsButtons = within(card).queryAllByRole("button", { name: "Refresh Posts" });
  if (!refreshPostsButtons[0]) {
    throw new Error(`Unable to find a refresh posts button for period ${label}`);
  }
  fireEvent.click(refreshPostsButtons[0]);
  return card as HTMLElement;
};

const clickPeriodViewAllPosts = (label: string): void => {
  const card = findCardByPeriodLabel(label);
  const viewAllPostsButtons = within(card).queryAllByRole("button", { name: /View All Posts/i });
  if (!viewAllPostsButtons[0]) {
    throw new Error(`Unable to find a View All Posts button for period ${label}`);
  }
  fireEvent.click(viewAllPostsButtons[0]);
};

const cardHasPendingRefresh = (label: string): boolean => {
  const card = findCardByPeriodLabel(label);
  const refreshingButton = within(card).queryByRole("button", { name: "Refreshing..." });
  const pendingStatus = within(card).queryByRole("status");
  const refreshText =
    within(card).queryByText(/starting refresh/i) ||
    within(card).queryByText(/refresh queued in backend/i) ||
    within(card).queryByText(/scraping posts/i);
  return Boolean(refreshingButton || pendingStatus || refreshText);
};

describe("RedditSourcesManager", () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue("/admin/social-media");
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    useRouterPushMock.mockReset();
    useRouterReplaceMock.mockReset();
    (auth as unknown as { currentUser?: { getIdToken: () => Promise<string> } }).currentUser = {
      getIdToken: vi.fn().mockResolvedValue("test-token"),
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders communities grouped with Add Community and Add Thread actions", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [baseCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<RedditSourcesManager mode="global" initialCommunityId="community-1" />);

    await waitFor(() => {
      expect(screen.getAllByText("r/BravoRealHousewives").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: /Bravo RH/i }));

    await waitFor(() => {
      expect(screen.getByText("S6E5 discussion")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Add Community" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Thread" })).toBeEnabled();
    expect(screen.getAllByText("The Real Housewives of Salt Lake City").length).toBeGreaterThan(0);
    expect(screen.getAllByText("The Real Housewives of Potomac").length).toBeGreaterThan(0);
    expect(screen.queryByText("Episode Discussion")).not.toBeInTheDocument();
    expect(screen.queryByText("Live Thread")).not.toBeInTheDocument();
  }, 15_000);

  it("does not surface timeout error when bootstrap fetch is upstream-aborted", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admin/reddit/communities")) {
        const abortError = new Error("The operation was aborted.") as Error & { name: string };
        abortError.name = "AbortError";
        throw abortError;
      }
      if (url.includes("/api/admin/covered-shows")) {
        return jsonResponse(coveredShowsPayload);
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<RedditSourcesManager mode="global" />);

    await waitFor(() => {
      expect(screen.queryByText("Loading reddit communities...")).not.toBeInTheDocument();
    });

    expect(screen.queryByText("Request timed out. Please try again.")).not.toBeInTheDocument();
  });

  it("still renders episode rows when social period request is aborted", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics")) {
        const abortError = new Error("The operation was aborted.") as Error & { name: string };
        abortError.name = "AbortError";
        throw abortError;
      }
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [baseCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<RedditSourcesManager mode="global" hideCommunityList initialCommunityId="community-1" />);

    expect(await screen.findByText("Episode 1")).toBeInTheDocument();
    expect(screen.queryByText("No episode discussion rows found for this community yet.")).not.toBeInTheDocument();
  });

  it("canonicalizes show-level reddit route to season-scoped path once season context resolves", async () => {
    usePathnameMock.mockReturnValue("/rhoslc/social/reddit");

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [baseCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<RedditSourcesManager mode="global" initialCommunityId="community-1" />);

    await waitFor(() => {
      expect(useRouterReplaceMock).toHaveBeenCalledWith("/rhoslc/s6/social/reddit");
    });
  });

  it("canonicalizes dedicated community route to include season token once season resolves", async () => {
    usePathnameMock.mockReturnValue("/rhoslc/social/reddit/BravoRealHousewives");

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [baseCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <RedditSourcesManager mode="global" hideCommunityList initialCommunityId="community-1" />,
    );

    await waitFor(() => {
      expect(useRouterReplaceMock).toHaveBeenCalledWith(
        "/rhoslc/social/reddit/BravoRealHousewives/s6",
      );
    });
  });

  it("renders EPISODE DISCUSSION badge from source_kind and allows collapsing assigned threads", async () => {
    const episodeSyncCommunity = {
      ...baseCommunity,
      assigned_threads: [
        {
          ...baseCommunity.assigned_threads[0],
          source_kind: "episode_discussion",
        },
      ],
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [episodeSyncCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<RedditSourcesManager mode="global" initialCommunityId="community-1" />);

    await waitFor(() => {
      expect(screen.getAllByText("r/BravoRealHousewives").length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByRole("button", { name: /Bravo RH/i }));

    expect(await screen.findByText("EPISODE DISCUSSION")).toBeInTheDocument();
    const assignedThreadsToggle = screen.getByRole("button", { name: /Assigned Threads/i });
    fireEvent.click(assignedThreadsToggle);
    expect(screen.queryByText("S6E5 discussion")).not.toBeInTheDocument();
  });

  it("renders Community heading with community view actions", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [baseCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<RedditSourcesManager mode="global" />);

    await waitFor(() => {
      expect(screen.getAllByText("r/BravoRealHousewives").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: /Bravo RH/i }));

    expect(screen.getByRole("heading", { name: /reddit communities/i })).toBeInTheDocument();
    expect(screen.queryByText("Selected Community")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByRole("link", {
          name: "Community View",
        }),
      ).toHaveAttribute(
        "href",
        "/rhoslc/social/reddit/BravoRealHousewives/s6",
      );
    });
  });

  it("bootstraps community list with lightweight payload then hydrates assigned threads", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [baseCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<RedditSourcesManager mode="global" hideCommunityList initialCommunityId="community-1" />);

    await waitFor(() => {
      expect(screen.queryByText("Loading reddit communities...")).not.toBeInTheDocument();
    });

    await waitFor(() => {
      const communityCalls = fetchMock.mock.calls
        .map((call) => String(call[0]))
        .filter((url) => url.includes("/api/admin/reddit/communities"));
      expect(communityCalls.some((url) => url.includes("include_assigned_threads=0"))).toBe(true);
      expect(communityCalls.some((url) => url.includes("include_assigned_threads=1"))).toBe(true);
    });
  });

  it("normalizes prefixed subreddit slugs when building community view links", async () => {
    const prefixedCommunity = {
      ...baseCommunity,
      subreddit: "r/BravoRealHousewives",
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [prefixedCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<RedditSourcesManager mode="global" />);

    await waitFor(() => {
      expect(screen.getAllByText(/BravoRealHousewives/i).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: /Bravo RH/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("link", {
          name: "Community View",
        }),
      ).toHaveAttribute(
        "href",
        "/rhoslc/social/reddit/BravoRealHousewives/s6",
      );
    });
  });

  it("uses dedicated community summary/actions without top-row delete in community view mode", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [baseCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <RedditSourcesManager
        mode="global"
        hideCommunityList
        initialCommunityId="community-1"
        backHref="/shows/rhoslc/social/reddit/BravoRealHousewives/s6"
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText("Loading reddit communities...")).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open community settings" })).toBeInTheDocument();
    });
    expect(await screen.findByText("Network Community")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to communities" })).toHaveAttribute(
      "href",
      "/shows/rhoslc/social/reddit/BravoRealHousewives/s6",
    );
    expect(screen.queryByText("Season Selection")).not.toBeInTheDocument();
    const dedicatedSeasonButton = screen.getByRole("button", { name: "Season 6" });
    expect(dedicatedSeasonButton).toBeInTheDocument();
    fireEvent.click(dedicatedSeasonButton);
    expect(screen.getAllByRole("button", { name: "Season 6" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Season 5" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Season 7" })).not.toBeInTheDocument();
    const heading = await screen.findByRole("heading", { name: "r/BravoRealHousewives" });
    expect(screen.getAllByText("The Real Housewives of Salt Lake City").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0 all-post · 1 scan · 1 relevant flares").length).toBeGreaterThan(0);
    const headerRow = heading.closest("div")?.parentElement as HTMLElement;
    expect(within(headerRow).getByRole("button", { name: "Open community settings" })).toBeInTheDocument();
    expect(within(headerRow).queryByRole("button", { name: "Discover Threads" })).not.toBeInTheDocument();
    expect(within(headerRow).getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(within(headerRow).queryByRole("button", { name: "Add Community" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Community" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open community settings" }));
    expect((await screen.findAllByRole("button", { name: "Delete" })).length).toBeGreaterThan(0);
  });

  it("resolves typo community slugs to the canonical subreddit in dedicated view", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [baseCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <RedditSourcesManager
        mode="global"
        hideCommunityList
        initialCommunityId="BravoRealHouseswives"
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "r/BravoRealHousewives" })).toBeInTheDocument();
    });
  });

  it("shows discovery filter hints and show-match badge after discover", async () => {
    const discoveryPayloadWithRelevantFlair = {
      discovery: {
        ...discoveryPayload.discovery,
        threads: discoveryPayload.discovery.threads.map((thread) => ({
          ...thread,
          title: "RHOSLC cast trip reactions",
          link_flair_text: "Salt Lake City",
        })),
      },
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/episode-discussions/refresh")) {
        return jsonResponse({
          community: baseCommunity,
          candidates: [],
          episode_matrix: [],
          meta: {
            fetched_at: "2026-02-24T12:00:00.000Z",
            total_found: 0,
            season_context: { season_id: "season-1", season_number: 6 },
          },
        });
      }
      if (url.includes("/api/admin/reddit/communities/") && url.includes("/discover")) {
        return jsonResponse(discoveryPayloadWithRelevantFlair);
      }
      if (url.includes("/flares/refresh")) {
        return jsonResponse({
          community: baseCommunity,
          flares: baseCommunity.post_flares,
          source: "api",
          warning: null,
        });
      }
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [baseCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<RedditSourcesManager mode="global" hideCommunityList initialCommunityId="community-1" />);

    await waitFor(() => {
      expect(screen.getByText("Assigned Threads")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Sync Posts/ }));

    expect(await screen.findByText("Suggested Include Terms")).toBeInTheDocument();
    expect(screen.getByText("rhoslc")).toBeInTheDocument();
    expect(screen.getByText("wife swap")).toBeInTheDocument();
    expect(screen.getByText("Salt Lake City · 1 posts")).toBeInTheDocument();
    expect(screen.getByText("Show Match · score 2")).toBeInTheDocument();
    expect(screen.getByText("Flair: Salt Lake City")).toBeInTheDocument();
    expect(screen.getByText("cast: meredith")).toBeInTheDocument();
    expect(screen.getByText("Selected flair")).toBeInTheDocument();
  }, 15_000);

  it("keeps all-flair discovered threads visible when Show matched only is enabled", async () => {
    const allFlairCommunity = {
      ...baseCommunity,
      analysis_flares: [],
      analysis_all_flares: ["Salt Lake City"],
    };
    const allFlairDiscoveryPayload = {
      discovery: {
        ...discoveryPayload.discovery,
        threads: [
          ...discoveryPayload.discovery.threads,
          {
            reddit_post_id: "post-discover-2",
            title: "WWHL open thread",
            text: "General Bravo chatter",
            url: "https://www.reddit.com/r/BravoRealHousewives/comments/post-discover-2/test/",
            permalink: "/r/BravoRealHousewives/comments/post-discover-2/test/",
            author: "user3",
            score: 44,
            num_comments: 10,
            posted_at: "2026-01-11T01:00:00.000Z",
            link_flair_text: "Salt Lake City",
            source_sorts: ["new"],
            matched_terms: [],
            matched_cast_terms: [],
            cross_show_terms: [],
            is_show_match: false,
            passes_flair_filter: true,
            match_score: 0,
            suggested_include_terms: [],
            suggested_exclude_terms: [],
          },
        ],
      },
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/episode-discussions/refresh")) {
        return jsonResponse({
          community: allFlairCommunity,
          candidates: [],
          episode_matrix: [],
          meta: {
            fetched_at: "2026-02-24T12:00:00.000Z",
            total_found: 0,
            season_context: { season_id: "season-1", season_number: 6 },
          },
        });
      }
      if (url.includes("/api/admin/reddit/communities/") && url.includes("/discover")) {
        return jsonResponse(allFlairDiscoveryPayload);
      }
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [allFlairCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<RedditSourcesManager mode="global" hideCommunityList initialCommunityId="community-1" />);

    await waitFor(() => {
      expect(screen.getAllByText("r/BravoRealHousewives").length).toBeGreaterThan(0);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading reddit communities...")).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("Assigned Threads")).toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: /Show matched only/i })).toBeChecked();
    });
    fireEvent.click(screen.getByRole("button", { name: /Sync Posts/ }));

    expect(await screen.findByText("WWHL open thread")).toBeInTheDocument();
  });

  it("persists analysis flare mode chip toggles per selected community", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.endsWith("/api/admin/reddit/communities/community-1") && init?.method === "PATCH") {
        const payload = JSON.parse(String(init.body ?? "{}")) as {
          analysis_flares?: string[];
          analysis_all_flares?: string[];
        };
        return jsonResponse({
          community: {
            ...baseCommunity,
      analysis_flares: payload.analysis_flares ?? [],
      analysis_all_flares: payload.analysis_all_flares ?? [],
      is_show_focused: false,
      network_focus_targets: ["Bravo"],
      franchise_focus_targets: ["Real Housewives"],
          },
        });
      }
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [baseCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<RedditSourcesManager mode="global" />);

    await waitFor(() => {
      expect(screen.getAllByText("r/BravoRealHousewives").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: /Bravo RH/i }));
    const openSettingsButton = await screen.findByRole("button", {
      name: /open community settings|settings/i,
    });
    fireEvent.click(openSettingsButton);
    const selectedScanChip = await screen.findByRole("button", {
      name: "Scan terms · Episode Discussion",
    });
    fireEvent.click(selectedScanChip);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/reddit/communities/community-1"),
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining("analysis_all_flares"),
        }),
      );
    });
  });

  it("opens Community Settings modal and keeps flair/focus controls inside it", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [baseCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<RedditSourcesManager mode="global" />);

    await waitFor(() => {
      expect(screen.getAllByText("r/BravoRealHousewives").length).toBeGreaterThan(0);
    });
    await waitFor(() => {
      expect(screen.queryByText("Loading reddit communities...")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Bravo RH/i }));

    expect(screen.queryByText("Community Focus")).not.toBeInTheDocument();
    expect(screen.queryByText("All Posts With Flair")).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "Open community settings" }));

    expect(await screen.findByText("Community Settings")).toBeInTheDocument();
    expect(screen.getByText("Community Focus")).toBeInTheDocument();
    expect(screen.getAllByText("All Posts With Flair").length).toBeGreaterThan(0);
  });

  it("optimistically adds a created community and asynchronously loads post flares", async () => {
    const communities = [{ ...baseCommunity }, { ...secondaryCommunity }];
    const createdCommunity = {
      id: "community-3",
      trr_show_id: "show-1",
      trr_show_name: "The Real Housewives of Salt Lake City",
      subreddit: "RHOSLC",
      display_name: "RHOSLC Main",
      notes: null,
      is_active: true,
      post_flares: [],
      analysis_flares: [],
      analysis_all_flares: [],
      is_show_focused: false,
      network_focus_targets: [],
      franchise_focus_targets: [],
      post_flares_updated_at: null,
      created_at: "2026-02-17T00:00:00.000Z",
      updated_at: "2026-02-17T00:00:00.000Z",
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.endsWith("/api/admin/reddit/communities") && init?.method === "POST") {
        communities.push({
          ...createdCommunity,
          assigned_thread_count: 0,
          assigned_threads: [],
          post_flares: ["Episode Thread", "Live Discussion"],
          analysis_flares: [],
          analysis_all_flares: [],
          post_flares_updated_at: "2026-02-17T00:02:00.000Z",
        });
        return jsonResponse({ community: createdCommunity }, 201);
      }
      if (url.includes("/flares/refresh")) {
        return jsonResponse({
          community: {
            ...createdCommunity,
            assigned_thread_count: 0,
            assigned_threads: [],
            post_flares: ["Episode Thread", "Live Discussion"],
            analysis_flares: [],
            analysis_all_flares: [],
            is_show_focused: false,
            network_focus_targets: [],
            franchise_focus_targets: [],
            post_flares_updated_at: "2026-02-17T00:02:00.000Z",
          },
          flares: ["Episode Thread", "Live Discussion"],
          source: "api",
          warning: null,
        });
      }
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<RedditSourcesManager mode="global" />);

    await waitFor(() => {
      expect(screen.getAllByText("r/BravoRealHousewives").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Community" }));
    fireEvent.change(screen.getByPlaceholderText("BravoRealHousewives or r/BravoRealHousewives"), {
      target: { value: "RHOSLC" },
    });
    fireEvent.change(screen.getByPlaceholderText("Bravo RH Main Subreddit"), {
      target: { value: "RHOSLC Main" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Community" }));

    await waitFor(() => {
      expect(screen.getAllByText("RHOSLC Main").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: "Open community settings" }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some((call) => String(call[0]).includes("/flares/refresh")),
      ).toBe(true);
    });

    await waitFor(() => {
      expect(screen.getAllByText("Episode Thread").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Live Discussion").length).toBeGreaterThan(0);
    }, { timeout: 5000 });
  });

  it("keeps community when flair refresh returns empty and shows helper text", async () => {
    const communities = [{ ...baseCommunity }];
    const createdCommunity = {
      id: "community-4",
      trr_show_id: "show-1",
      trr_show_name: "The Real Housewives of Salt Lake City",
      subreddit: "AnotherSub",
      display_name: "Another Sub",
      notes: null,
      is_active: true,
      post_flares: [],
      analysis_flares: [],
      analysis_all_flares: [],
      is_show_focused: false,
      network_focus_targets: [],
      franchise_focus_targets: [],
      post_flares_updated_at: null,
      created_at: "2026-02-17T00:00:00.000Z",
      updated_at: "2026-02-17T00:00:00.000Z",
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.endsWith("/api/admin/reddit/communities") && init?.method === "POST") {
        communities.push({
          ...createdCommunity,
          assigned_thread_count: 0,
          assigned_threads: [],
        });
        return jsonResponse({ community: createdCommunity }, 201);
      }
      if (url.includes("/flares/refresh")) {
        return jsonResponse({
          community: {
            ...createdCommunity,
            assigned_thread_count: 0,
            assigned_threads: [],
            post_flares: [],
            analysis_flares: [],
            analysis_all_flares: [],
            is_show_focused: false,
            network_focus_targets: [],
            franchise_focus_targets: [],
            post_flares_updated_at: "2026-02-17T00:03:00.000Z",
          },
          flares: [],
          source: "none",
          warning: null,
        });
      }
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<RedditSourcesManager mode="global" />);

    await waitFor(() => {
      expect(screen.getAllByText("r/BravoRealHousewives").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Community" }));
    fireEvent.change(screen.getByPlaceholderText("BravoRealHousewives or r/BravoRealHousewives"), {
      target: { value: "AnotherSub" },
    });
    fireEvent.change(screen.getByPlaceholderText("Bravo RH Main Subreddit"), {
      target: { value: "Another Sub" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Community" }));

    await waitFor(() => {
      expect(screen.getAllByText("Another Sub").length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByRole("button", { name: /Another Sub/i }));
    fireEvent.click(screen.getByRole("button", { name: "Open community settings" }));
    await waitFor(() => {
      expect(screen.getByText("No relevant post flares selected yet.")).toBeInTheDocument();
    });
  });

  it("hides analysis flare assignment controls for show-focused communities", async () => {
    const showFocusedCommunity = {
      ...baseCommunity,
      is_show_focused: true,
      network_focus_targets: [],
      franchise_focus_targets: [],
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [showFocusedCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<RedditSourcesManager mode="global" />);

    await waitFor(() => {
      expect(screen.getAllByText("r/BravoRealHousewives").length).toBeGreaterThan(0);
    });
    await waitFor(() => {
      expect(screen.queryByText("Loading reddit communities...")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Bravo RH/i }));

    fireEvent.click(screen.getByRole("button", { name: "Open community settings" }));
    expect(screen.queryByText("All Posts With Flair")).not.toBeInTheDocument();
    expect(
      await screen.findByText("Show-focused mode enabled. All discovered posts are eligible (including no-flair posts)."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Show matched only/i })).not.toBeInTheDocument();
  });

  it("renders dedicated header actions and hides dedicated candidate/feed controls", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [baseCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <RedditSourcesManager
        mode="global"
        hideCommunityList
        initialCommunityId="community-1"
        episodeDiscussionsPlacement="inline"
        enableEpisodeSync
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText("Loading reddit communities...")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Sync Posts" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Discover Threads" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Season" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Period" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Auto-sync status" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Auto-sync reason" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open community settings" }));
    expect(await screen.findByText("Discussion Filters")).toBeInTheDocument();
    expect(screen.getAllByText("Live Episode Discussion").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Post Episode Discussion").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Weekly Episode Discussion").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Required flares for episode refresh are sourced from/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save Selected" })).not.toBeInTheDocument();
  });

  it("uses all-period refresh behavior in dedicated community mode", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/episode-discussions/refresh")) {
        return jsonResponse({
          community: baseCommunity,
          candidates: [],
          episode_matrix: [],
          meta: {
            fetched_at: "2026-02-24T12:00:00.000Z",
            total_found: 0,
            season_context: { season_id: "season-1", season_number: 6 },
          },
        });
      }
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [baseCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <RedditSourcesManager
        mode="global"
        hideCommunityList
        initialCommunityId="community-1"
        episodeDiscussionsPlacement="inline"
        enableEpisodeSync
      />,
    );

    const refreshButton = await screen.findByRole("button", {
      name: /Sync Posts/,
    });
    fireEvent.click(refreshButton);
    await waitFor(() => {
      const refreshCalls = fetchMock.mock.calls.filter((call) =>
        String(call[0]).includes("/episode-discussions/refresh"),
      );
      expect(refreshCalls.length).toBeGreaterThan(0);
      const refreshUrl = String(refreshCalls[refreshCalls.length - 1]?.[0] ?? "");
      expect(refreshUrl).toContain("season_id=season-1");
      expect(refreshUrl).toContain("sync=true");
      expect(refreshUrl).not.toContain("period_start");
      expect(refreshUrl).not.toContain("period_end");
      expect(refreshUrl).not.toContain("period_label");
    });
  });

  it("surfaces a warning when refresh discovery fails instead of silently swallowing errors", async () => {
    const communityWithSaltLakeFlair = {
      ...baseCommunity,
      post_flares: ["Salt Lake City"],
      analysis_flares: ["Salt Lake City"],
      analysis_all_flares: ["Salt Lake City"],
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/episode-discussions/refresh")) {
        return jsonResponse({
          community: communityWithSaltLakeFlair,
          candidates: [],
          episode_matrix: [],
          meta: {
            fetched_at: "2026-02-24T12:00:00.000Z",
            total_found: 0,
            season_context: { season_id: "season-1", season_number: 6 },
          },
        });
      }
      if (url.includes("/api/admin/reddit/communities/") && url.includes("/discover")) {
        return jsonResponse({ error: "Discovery endpoint unavailable" }, 500);
      }
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [communityWithSaltLakeFlair, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <RedditSourcesManager
        mode="global"
        hideCommunityList
        initialCommunityId="community-1"
        episodeDiscussionsPlacement="inline"
      />,
    );

    const refreshButton = await screen.findByRole("button", {
      name: /Sync Posts/,
    });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      const discoverUrl = String(
        fetchMock.mock.calls.find((call) => String(call[0]).includes("/discover"))?.[0] ?? "",
      );
      expect(discoverUrl).toContain("/discover");
      expect(discoverUrl).toContain("search_backfill=true");
      expect(discoverUrl).not.toContain("refresh=true");
    });
  });

  it("includes sync=true for inline community refresh and shows sync summary", async () => {
    const refreshPayload = {
      community: baseCommunity,
      candidates: [],
      episode_matrix: [],
      meta: {
        fetched_at: "2026-02-24T12:00:00.000Z",
        total_found: 0,
        sync_requested: true,
        sync_auto_saved_count: 1,
        sync_auto_saved_post_ids: ["episode-1"],
        sync_skipped_conflicts: ["episode-conflict"],
        sync_skipped_ineligible_count: 2,
        sync_candidate_results: [
          {
            reddit_post_id: "episode-1",
            status: "auto_saved",
            reason_code: "auto_saved_success",
            reason: "Auto-synced successfully.",
          },
        ],
        season_context: { season_id: "season-1", season_number: 6 },
        period_context: {
          selected_window_start: "2026-01-01T00:00:00.000Z",
          selected_window_end: "2026-01-14T23:59:59.000Z",
          selected_period_labels: ["All Periods"],
        },
      },
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/episode-discussions/refresh")) {
        return jsonResponse(refreshPayload);
      }
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [baseCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <RedditSourcesManager
        mode="global"
        initialCommunityId="community-1"
        episodeDiscussionsPlacement="inline"
        enableEpisodeSync
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Sync Posts/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Sync Posts/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/episode-discussions/refresh"),
        expect.anything(),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("sync=true"),
        expect.anything(),
      );
    });

    expect(await screen.findByText(/Auto-synced 1 posts/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter((call) => String(call[0]).includes("/api/admin/reddit/communities")).length).toBeGreaterThanOrEqual(2);
  });

  it("falls back to all-periods when social analytics period loading fails", async () => {
    const refreshPayload = {
      community: baseCommunity,
      candidates: [],
      episode_matrix: [],
      meta: {
        fetched_at: "2026-02-24T12:00:00.000Z",
        total_found: 0,
        season_context: { season_id: "season-1", season_number: 6 },
      },
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics")) {
        return jsonResponse({ error: "upstream failed" }, 500);
      }
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/episode-discussions/refresh")) {
        return jsonResponse(refreshPayload);
      }
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [baseCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <RedditSourcesManager
        mode="global"
        hideCommunityList
        initialCommunityId="community-1"
        episodeDiscussionsPlacement="inline"
        seasonId="season-1"
        seasonNumber={6}
      />,
    );

    const refreshButton = await screen.findByRole("button", {
      name: /Sync Posts/i,
    });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      const refreshCall = fetchMock.mock.calls.find((call) =>
        String(call[0]).includes("/episode-discussions/refresh"),
      );
      expect(refreshCall).toBeDefined();
      const refreshUrl = String(refreshCall?.[0] ?? "");
      expect(refreshUrl).toContain("season_id=season-1");
      expect(refreshUrl).not.toContain("period_start=");
      expect(refreshUrl).not.toContain("period_end=");
    });
    expect(screen.queryByText("Failed to load social periods for episode discussions")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Season social period data is temporarily unavailable/i),
    ).not.toBeInTheDocument();
  });

  it("opens canonical community week URLs even from /:show/social/reddit base route", async () => {
    usePathnameMock.mockReturnValue("/rhoslc/social/reddit");
    const refreshPayload = {
      community: baseCommunity,
      candidates: [],
      episode_matrix: [
        {
          episode_number: 1,
          live: {
            post_count: 1,
            total_comments: 100,
            total_upvotes: 50,
            top_post_id: "episode-1-live",
            top_post_url: "https://www.reddit.com/r/BravoRealHousewives/comments/episode-1-live/test/",
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
          total_comments: 100,
          total_upvotes: 50,
        },
      ],
      meta: {
        fetched_at: "2026-02-24T12:00:00.000Z",
        total_found: 1,
        season_context: { season_id: "season-1", season_number: 6 },
      },
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/episode-discussions/refresh")) {
        return jsonResponse(refreshPayload);
      }
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [baseCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <RedditSourcesManager
        mode="global"
        hideCommunityList
        initialCommunityId="community-1"
        episodeDiscussionsPlacement="inline"
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Sync Posts/ })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Sync Posts/ }));

    expect(await screen.findByText("Episode 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Episode 1" }));

    expect(useRouterPushMock).toHaveBeenCalled();
    const pushedPath = String(useRouterPushMock.mock.calls.at(-1)?.[0] ?? "");
    expect(pushedPath).toBe("/rhoslc/social/reddit/BravoRealHousewives/s6/e1");
    expect(pushedPath).not.toBe("/rhoslc/social/reddit");
  });

  it("renders episode pills and opens modal with linked + unassigned posts on demand", async () => {
    const communityWithSaltLakeFlair = {
      ...baseCommunity,
      post_flares: ["Salt Lake City", "Shitpost"],
      analysis_flares: ["Shitpost"],
      analysis_all_flares: ["Salt Lake City"],
    };
    const refreshPayload = {
      community: communityWithSaltLakeFlair,
      candidates: [
        {
          reddit_post_id: "episode-1-live-a",
          title: "Episode 1 Live A",
          text: null,
          url: "https://www.reddit.com/r/BravoRealHousewives/comments/episode-1-live-a/test/",
          permalink: "/r/BravoRealHousewives/comments/episode-1-live-a/test/",
          author: "AutoModerator",
          score: 170,
          num_comments: 2700,
          posted_at: "2025-09-16T19:00:00.000Z",
          link_flair_text: "Salt Lake City",
          episode_number: 1,
          discussion_type: "live",
          source_sorts: ["new"],
          match_reasons: ["title pattern: Live Episode Discussion"],
        },
        {
          reddit_post_id: "episode-1-live-b",
          title: "Episode 1 Live B",
          text: "Original text for live discussion post B.",
          url: "https://i.redd.it/example-live-image.jpg",
          permalink: "/r/BravoRealHousewives/comments/episode-1-live-b/test/",
          author: "AutoModerator",
          score: 120,
          num_comments: 900,
          posted_at: "2025-09-16T19:10:00.000Z",
          link_flair_text: "Salt Lake City",
          episode_number: 1,
          discussion_type: "live",
          source_sorts: ["new"],
          match_reasons: ["title pattern: Live Episode Discussion"],
        },
        {
          reddit_post_id: "episode-1-post-a",
          title: "Episode 1 Post A",
          text: null,
          url: "https://www.reddit.com/r/BravoRealHousewives/comments/episode-1-post-a/test/",
          permalink: "/r/BravoRealHousewives/comments/episode-1-post-a/test/",
          author: "AutoModerator",
          score: 75,
          num_comments: 358,
          posted_at: "2025-09-16T21:00:00.000Z",
          link_flair_text: "Salt Lake City",
          episode_number: 1,
          discussion_type: "post",
          source_sorts: ["new"],
          match_reasons: ["title pattern: Post Episode Discussion"],
        },
        {
          reddit_post_id: "episode-1-weekly-a",
          title: "Episode 1 Weekly A",
          text: null,
          url: "https://v.redd.it/example-weekly-video.mp4",
          permalink: "/r/BravoRealHousewives/comments/episode-1-weekly-a/test/",
          author: "AutoModerator",
          score: 54,
          num_comments: 292,
          posted_at: "2025-09-17T07:00:00.000Z",
          link_flair_text: "Salt Lake City",
          episode_number: 1,
          discussion_type: "weekly",
          source_sorts: ["new"],
          match_reasons: ["title pattern: Weekly Episode Discussion"],
        },
      ],
      episode_matrix: [
        {
          episode_number: 1,
          live: {
            post_count: 3,
            total_comments: 2700,
            total_upvotes: 170,
            top_post_id: "episode-1-live",
            top_post_url: "https://www.reddit.com/r/BravoRealHousewives/comments/episode-1-live/test/",
          },
          post: {
            post_count: 1,
            total_comments: 358,
            total_upvotes: 75,
            top_post_id: "episode-1-post",
            top_post_url: "https://www.reddit.com/r/BravoRealHousewives/comments/episode-1-post/test/",
          },
          weekly: {
            post_count: 0,
            total_comments: 292,
            total_upvotes: 54,
            top_post_id: "episode-1-weekly",
            top_post_url: "https://www.reddit.com/r/BravoRealHousewives/comments/episode-1-weekly/test/",
          },
          total_posts: 6,
          total_comments: 3350,
          total_upvotes: 299,
        },
      ],
      meta: {
        fetched_at: "2026-02-24T12:00:00.000Z",
        total_found: 6,
        season_context: { season_id: "season-1", season_number: 6 },
        sync_candidate_results: [
          {
            reddit_post_id: "episode-1-live-a",
            status: "auto_saved",
            reason_code: "auto_saved_success",
            reason: "Auto-synced successfully.",
          },
          {
            reddit_post_id: "episode-1-live-b",
            status: "not_eligible",
            reason_code: "author_not_automoderator",
            reason: "Author is not AutoModerator.",
          },
          {
            reddit_post_id: "episode-1-post-a",
            status: "not_eligible",
            reason_code: "author_not_automoderator",
            reason: "Author is not AutoModerator.",
          },
          {
            reddit_post_id: "episode-1-weekly-a",
            status: "skipped_conflict",
            reason_code: "already_saved_other_community",
            reason: "Already saved in another community.",
          },
        ],
      },
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/episode-discussions/refresh")) {
        return jsonResponse(refreshPayload);
      }
      if (url.includes("/api/admin/reddit/communities/") && url.includes("/discover")) {
        return jsonResponse({
          discovery: {
            ...discoveryPayload.discovery,
            threads: [
              ...discoveryPayload.discovery.threads,
              {
                reddit_post_id: "other-window-post-1",
                title: "Other unassigned window post",
                text: "Original text for other unassigned post.",
                url: "https://i.redd.it/other-window-preview.jpg",
                permalink: "/r/BravoRealHousewives/comments/other-window-post-1/test/",
                author: "other-user",
                score: 77,
                num_comments: 22,
                posted_at: "2025-09-16T23:30:00.000Z",
                link_flair_text: "Shitpost",
                source_sorts: ["hot"],
                matched_terms: ["rhoslc"],
                matched_cast_terms: [],
                cross_show_terms: [],
                is_show_match: true,
                passes_flair_filter: true,
                flair_mode: "scan_term",
                match_score: 1,
                suggested_include_terms: [],
                suggested_exclude_terms: [],
              },
            ],
          },
        });
      }
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [communityWithSaltLakeFlair, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <RedditSourcesManager
        mode="global"
        hideCommunityList
        initialCommunityId="community-1"
        episodeDiscussionsPlacement="inline"
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Sync Posts/ })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Sync Posts/ }));

    expect(await screen.findByText("Episode 1")).toBeInTheDocument();
    expect(await screen.findByText(/Post Episode Discussion/i)).toBeInTheDocument();
    expect(screen.queryByText("Weekly Discussion")).not.toBeInTheDocument();
    expect(screen.getAllByText(/Air date/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Pre-Season")).toBeInTheDocument();
    expect(screen.getByText("Post-Season")).toBeInTheDocument();
    expect(screen.getAllByText(/flair posts/i).length).toBeGreaterThan(0);
    const discoverCallsAfterRefresh = fetchMock.mock.calls.filter((call) =>
      String(call[0]).includes("/discover"),
    ).length;
    expect(discoverCallsAfterRefresh).toBeGreaterThan(0);
    const discoverUrls = fetchMock.mock.calls
      .map((call) => String(call[0]))
      .filter((url) => url.includes("/discover"));
    const syncDiscoverUrl = discoverUrls.find((url) => url.includes("refresh=true")) ?? "";
    expect(syncDiscoverUrl).toContain("exhaustive=true");
    expect(syncDiscoverUrl).toContain("max_pages=1000");
    expect(syncDiscoverUrl).not.toContain("force_flair=");
    expect(syncDiscoverUrl).toContain("search_backfill=true");
    const episodeOneCard = screen.getByText("Episode 1").closest("article");
    expect(episodeOneCard).not.toBeNull();
    const viewAllPostsButton = within(episodeOneCard as HTMLElement).getByRole("button", {
      name: /View All Posts/i,
    });
    fireEvent.click(viewAllPostsButton);
    expect(useRouterPushMock).toHaveBeenCalledTimes(1);
    const pushedPath = String(useRouterPushMock.mock.calls[0]?.[0] ?? "");
    expect(pushedPath).toBe("/rhoslc/social/reddit/BravoRealHousewives/s6/e1");
    expect(discoverUrls.some((url) => url.includes("force_flair="))).toBe(false);
    expect(discoverUrls.some((url) => url.includes("max_pages=1000"))).toBe(true);
    expect(discoverUrls.some((url) => url.includes("search_backfill=true"))).toBe(true);
    expect(discoverUrls.some((url) => url.includes("refresh=true"))).toBe(true);
    expect(screen.queryByRole("columnheader", { name: "Live" })).not.toBeInTheDocument();
  });

  it("uses season social period windows for episode/pre-season containers and canonical flair totals", async () => {
    const communityWithSaltLakeFlair = {
      ...baseCommunity,
      post_flares: ["Salt Lake City"],
      analysis_flares: ["Salt Lake City"],
      analysis_all_flares: ["Salt Lake City"],
    };
    const refreshPayload = {
      community: communityWithSaltLakeFlair,
      candidates: [
        {
          reddit_post_id: "episode-1-live",
          title: "Episode 1 Live",
          text: null,
          url: "https://www.reddit.com/r/BravoRealHousewives/comments/episode-1-live/test/",
          permalink: "/r/BravoRealHousewives/comments/episode-1-live/test/",
          author: "AutoModerator",
          score: 168,
          num_comments: 2700,
          posted_at: "2025-09-16T19:01:01.000Z",
          link_flair_text: "Salt Lake City",
          episode_number: 1,
          discussion_type: "live",
          source_sorts: ["new"],
          match_reasons: ["title pattern: Live Episode Discussion"],
        },
      ],
      episode_matrix: [
        {
          episode_number: 1,
          live: {
            post_count: 1,
            total_comments: 2700,
            total_upvotes: 168,
            top_post_id: "episode-1-live",
            top_post_url: "https://www.reddit.com/r/BravoRealHousewives/comments/episode-1-live/test/",
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
          total_posts: 3,
          total_comments: 2700,
          total_upvotes: 168,
        },
      ],
      meta: {
        fetched_at: "2026-02-24T12:00:00.000Z",
        total_found: 3,
        season_context: { season_id: "season-1", season_number: 6 },
      },
    };
    const customAnalyticsPayload = {
      weekly: [
        {
          week_index: 1,
          label: "Pre-Season",
          start: "2025-08-14T00:00:00.000Z",
          end: "2025-09-16T18:59:59.000Z",
        },
        {
          week_index: 2,
          label: "Episode 1",
          start: "2025-09-16T18:30:00.000Z",
          end: "2025-09-23T18:15:00.000Z",
        },
        {
          week_index: 3,
          label: "Post-Season",
          start: "2026-01-27T00:00:00.000Z",
          end: "2026-02-03T00:00:00.000Z",
        },
      ],
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics")) {
        return jsonResponse(customAnalyticsPayload);
      }
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/episode-discussions/refresh")) {
        return jsonResponse(refreshPayload);
      }
      if (url.includes("/api/admin/reddit/communities/") && url.includes("/discover")) {
        return jsonResponse({
          discovery: {
            ...discoveryPayload.discovery,
            totals: {
              fetched_rows: 1,
              matched_rows: 1,
              tracked_flair_rows: 1,
            },
            threads: [
              {
                reddit_post_id: "other-window-post-canonical",
                title: "Other unassigned window post canonical flair",
                text: "Canonical flair variant post body",
                url: "https://i.redd.it/other-canonical.jpg",
                permalink: "/r/BravoRealHousewives/comments/other-window-post-canonical/test/",
                author: "other-user",
                score: 44,
                num_comments: 12,
                posted_at: "2025-09-17T00:00:00.000Z",
                link_flair_text: "Salt Lake City ❄️",
                source_sorts: ["hot"],
                matched_terms: ["rhoslc"],
                matched_cast_terms: [],
                cross_show_terms: [],
                is_show_match: true,
                passes_flair_filter: true,
                match_score: 1,
                suggested_include_terms: [],
                suggested_exclude_terms: [],
              },
            ],
          },
        });
      }
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [communityWithSaltLakeFlair, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <RedditSourcesManager
        mode="global"
        hideCommunityList
        initialCommunityId="community-1"
        episodeDiscussionsPlacement="inline"
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Sync Posts/ })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Sync Posts/ }));

    expect(await screen.findByText("Episode 1")).toBeInTheDocument();
    expect(screen.getByText("Pre-Season")).toBeInTheDocument();
    expect(screen.getByText("Post-Season")).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Optional seed post URLs (comma or newline separated)"),
    ).not.toBeInTheDocument();
    const preSeasonHeading = screen.getByText("Pre-Season");
    const episodeOneHeading = screen.getByText("Episode 1");
    const postSeasonHeading = screen.getByText("Post-Season");
    expect(
      preSeasonHeading.compareDocumentPosition(episodeOneHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      preSeasonHeading.compareDocumentPosition(postSeasonHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      (await screen.findAllByText(/\b\d+\s+tracked flair posts(?:\s+in window)?\s*·\s*\d+\s+unassigned tracked posts\b/i)).length,
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Episode 1" }));
    expect(useRouterPushMock).toHaveBeenCalled();
    const episodeOnePath = String(useRouterPushMock.mock.calls.at(-1)?.[0] ?? "");
    expect(episodeOnePath).toBe("/rhoslc/social/reddit/BravoRealHousewives/s6/e1");

    const preSeasonCard = findCardByPeriodLabel("Pre-Season");
    fireEvent.click(within(preSeasonCard as HTMLElement).getAllByRole("button", { name: "Refresh Posts" })[0]);
    const episodeOneCard = screen.getByText("Episode 1").closest("article");
    expect(episodeOneCard).not.toBeNull();
    fireEvent.click(within(episodeOneCard as HTMLElement).getByRole("button", { name: "Refresh Posts" }));
    clickPeriodViewAllPosts("Pre-Season");
    expect(useRouterPushMock).toHaveBeenCalled();
    const preSeasonPath = String(useRouterPushMock.mock.calls.at(-1)?.[0] ?? "");
    expect(preSeasonPath).toBe("/rhoslc/social/reddit/BravoRealHousewives/s6/w0");

    await waitFor(() => {
      const discoverUrls = fetchMock.mock.calls
        .map((call) => String(call[0]))
        .filter((url) => url.includes("/discover"));
      expect(
        discoverUrls.some((url) =>
          url.includes(`period_start=${encodeURIComponent("2025-09-16T23:01:01.000Z")}`),
        ),
      ).toBe(true);
      expect(
        discoverUrls.some((url) =>
          url.includes(`period_end=${encodeURIComponent("2025-09-23T23:01:10.000Z")}`),
        ),
      ).toBe(true);
      expect(
        discoverUrls.some((url) =>
          url.includes(`period_start=${encodeURIComponent("2025-08-14T00:00:00.000Z")}`),
        ),
      ).toBe(true);
      expect(
        discoverUrls.some((url) =>
          url.includes(`period_end=${encodeURIComponent("2025-09-16T23:00:00.000Z")}`),
        ),
      ).toBe(true);
      expect(discoverUrls.some((url) => url.includes("search_backfill=true"))).toBe(true);
      expect(discoverUrls.some((url) => url.includes("refresh=true"))).toBe(true);
      expect(discoverUrls.some((url) => url.includes("seed_post_url="))).toBe(false);
      expect(discoverUrls.some((url) => url.includes("container_key=period-preseason"))).toBe(true);
      expect(
        discoverUrls.some(
          (url) =>
            url.includes("container_key=period-preseason") &&
            url.includes("coverage_mode=adaptive_deep"),
        ),
      ).toBe(true);
      expect(discoverUrls.some((url) => url.includes("container_key=episode-1"))).toBe(true);
      expect(
        discoverUrls.some(
          (url) =>
            url.includes("container_key=episode-1") &&
            url.includes("coverage_mode=standard"),
        ),
      ).toBe(true);
      expect(discoverUrls.some((url) => url.includes("period_label=Pre-Season"))).toBe(true);
      expect(discoverUrls.some((url) => url.includes("period_label=Episode+1"))).toBe(true);
    });
  });

  it("falls back to cached window posts when per-container refresh times out", async () => {
    const communityWithSaltLakeFlair = {
      ...baseCommunity,
      post_flares: ["Salt Lake City"],
      analysis_flares: ["Salt Lake City"],
      analysis_all_flares: ["Salt Lake City"],
    };
    const refreshPayload = {
      community: communityWithSaltLakeFlair,
      candidates: [
        {
          reddit_post_id: "episode-1-live",
          title: "Episode 1 Live",
          text: null,
          url: "https://www.reddit.com/r/BravoRealHousewives/comments/episode-1-live/test/",
          permalink: "/r/BravoRealHousewives/comments/episode-1-live/test/",
          author: "AutoModerator",
          score: 168,
          num_comments: 2700,
          posted_at: "2025-09-16T19:01:01.000Z",
          link_flair_text: "Salt Lake City",
          episode_number: 1,
          discussion_type: "live",
          source_sorts: ["new"],
          match_reasons: ["title pattern: Live Episode Discussion"],
        },
      ],
      episode_matrix: [
        {
          episode_number: 1,
          live: {
            post_count: 1,
            total_comments: 2700,
            total_upvotes: 168,
            top_post_id: "episode-1-live",
            top_post_url: "https://www.reddit.com/r/BravoRealHousewives/comments/episode-1-live/test/",
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
          total_comments: 2700,
          total_upvotes: 168,
        },
      ],
      meta: {
        fetched_at: "2026-02-24T12:00:00.000Z",
        total_found: 1,
        season_context: { season_id: "season-1", season_number: 6 },
      },
    };
    const customAnalyticsPayload = {
      weekly: [
        {
          week_index: 1,
          label: "Pre-Season",
          start: "2025-08-14T00:00:00.000Z",
          end: "2025-09-16T18:59:59.000Z",
        },
        {
          week_index: 2,
          label: "Episode 1",
          start: "2025-09-16T18:30:00.000Z",
          end: "2025-09-23T18:15:00.000Z",
        },
      ],
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics")) {
        return jsonResponse(customAnalyticsPayload);
      }
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/episode-discussions/refresh")) {
        return jsonResponse(refreshPayload);
      }
      if (url.includes("/api/admin/reddit/communities/") && url.includes("/discover")) {
        if (
          url.includes(`period_start=${encodeURIComponent("2025-08-14T00:00:00.000Z")}`) &&
          url.includes("refresh=true")
        ) {
          throw new Error("Request timed out. Please try again.");
        }
        return jsonResponse({
          discovery: {
            ...discoveryPayload.discovery,
            totals: {
              fetched_rows: 1,
              matched_rows: 1,
              tracked_flair_rows: 1,
            },
            threads: [
              {
                reddit_post_id: "cached-preseason-post",
                title: "Cached preseason post",
                text: "Loaded from cache after timeout.",
                url: "https://www.reddit.com/r/BravoRealHousewives/comments/cached-preseason-post/test/",
                permalink: "/r/BravoRealHousewives/comments/cached-preseason-post/test/",
                author: "cached-user",
                score: 44,
                num_comments: 12,
                posted_at: "2025-09-01T00:00:00.000Z",
                link_flair_text: "Salt Lake City",
                source_sorts: ["hot"],
                matched_terms: ["rhoslc"],
                matched_cast_terms: [],
                cross_show_terms: [],
                is_show_match: true,
                passes_flair_filter: true,
                match_score: 1,
                suggested_include_terms: [],
                suggested_exclude_terms: [],
              },
            ],
          },
        });
      }
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [communityWithSaltLakeFlair, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <RedditSourcesManager
        mode="global"
        hideCommunityList
        initialCommunityId="community-1"
        episodeDiscussionsPlacement="inline"
      />,
    );

    expect(await screen.findByText("Pre-Season")).toBeInTheDocument();

    clickPeriodRefreshPosts("Pre-Season");
    clickPeriodViewAllPosts("Pre-Season");
    await waitFor(() => {
      expect(useRouterPushMock).toHaveBeenCalled();
      const pushedPath = String(useRouterPushMock.mock.calls.at(-1)?.[0] ?? "");
      expect(pushedPath).toBe("/rhoslc/social/reddit/BravoRealHousewives/s6/w0");
    });
  }, 15_000);

  it("keeps Discovered Threads separate from period refresh payloads and shows partial pass details", async () => {
    const communityWithTrackedFlair = {
      ...baseCommunity,
      post_flares: ["Salt Lake City"],
      analysis_flares: ["Salt Lake City"],
      analysis_all_flares: ["Salt Lake City"],
    };
    const refreshPayload = {
      community: communityWithTrackedFlair,
      candidates: [],
      episode_matrix: [
        {
          episode_number: 1,
          live: {
            post_count: 0,
            total_comments: 0,
            total_upvotes: 0,
            top_post_id: null,
            top_post_url: null,
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
          total_posts: 0,
          total_comments: 0,
          total_upvotes: 0,
        },
      ],
      meta: {
        fetched_at: "2026-02-24T12:00:00.000Z",
        total_found: 0,
        season_context: { season_id: "season-1", season_number: 6 },
      },
    };
    const customAnalyticsPayload = {
      weekly: [
        {
          week_index: 1,
          label: "Pre-Season",
          start: "2025-08-14T00:00:00.000Z",
          end: "2025-09-16T18:59:59.000Z",
        },
        {
          week_index: 2,
          label: "Episode 1",
          start: "2025-09-16T19:01:01.000Z",
          end: "2025-09-23T19:01:10.000Z",
        },
      ],
    };
    const seasonPanelDiscovery = {
      ...discoveryPayload.discovery,
      threads: [
        {
          ...discoveryPayload.discovery.threads[0],
          reddit_post_id: "season-panel-thread",
          title: "Season panel thread",
          posted_at: "2025-09-20T00:00:00.000Z",
          link_flair_text: "Salt Lake City",
        },
      ],
    };
    const windowRefreshDiscovery = {
      ...discoveryPayload.discovery,
      totals: {
        fetched_rows: 1,
        matched_rows: 1,
        tracked_flair_rows: 1,
      },
      threads: [
        {
          ...discoveryPayload.discovery.threads[0],
          reddit_post_id: "window-preseason-thread",
          title: "Window-only preseason thread",
          posted_at: "2025-09-10T00:00:00.000Z",
          link_flair_text: "Salt Lake City",
        },
      ],
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics")) {
        return jsonResponse(customAnalyticsPayload);
      }
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/episode-discussions/refresh")) {
        return jsonResponse(refreshPayload);
      }
      if (url.includes("/api/admin/reddit/communities/") && url.includes("/discover")) {
        if (url.includes("refresh=true") && url.includes("container_key=period-preseason")) {
          return jsonResponse({
            discovery: windowRefreshDiscovery,
            run: {
              run_id: "run-preseason-partial",
              status: "partial",
              totals: {
                fetched_rows: 1,
                matched_rows: 1,
                tracked_flair_rows: 1,
              },
              diagnostics: {
                passes_run: 2,
                final_completeness: {
                  listing_complete: false,
                  backfill_complete: true,
                },
              },
            },
          });
        }
        if (url.includes("container_key=period-preseason")) {
          return jsonResponse({ discovery: windowRefreshDiscovery });
        }
        return jsonResponse({ discovery: seasonPanelDiscovery });
      }
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [communityWithTrackedFlair, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <RedditSourcesManager
        mode="global"
        hideCommunityList
        initialCommunityId="community-1"
        episodeDiscussionsPlacement="inline"
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Sync Posts/ })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Sync Posts/ }));

    expect(await screen.findByText("Season panel thread")).toBeInTheDocument();
    clickPeriodRefreshPosts("Pre-Season");

    await waitFor(() => {
      expect(screen.getByText(/partial coverage after 2 passes/i)).toBeInTheDocument();
      expect(screen.getByText(/listing incomplete/i)).toBeInTheDocument();
    });
    const preSeasonCard = findCardByPeriodLabel("Pre-Season");
    await waitFor(() => {
      expect(
        within(preSeasonCard).getByText(/1 tracked flair posts · 1 unassigned tracked posts/i),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Window-only preseason thread")).not.toBeInTheDocument();
    expect(screen.getByText("Season panel thread")).toBeInTheDocument();
  });

  it("shows queued spinner and queue depth while backend refresh is pending", async () => {
    const communityWithSaltLakeFlair = {
      ...baseCommunity,
      post_flares: ["Salt Lake City"],
      analysis_flares: ["Salt Lake City"],
      analysis_all_flares: ["Salt Lake City"],
    };
    const refreshPayload = {
      community: communityWithSaltLakeFlair,
      candidates: [],
      episode_matrix: [
        {
          episode_number: 1,
          live: {
            post_count: 1,
            total_comments: 2700,
            total_upvotes: 168,
            top_post_id: "episode-1-live",
            top_post_url: "https://www.reddit.com/r/BravoRealHousewives/comments/episode-1-live/test/",
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
          total_comments: 2700,
          total_upvotes: 168,
        },
      ],
      meta: {
        fetched_at: "2026-02-24T12:00:00.000Z",
        total_found: 1,
        season_context: { season_id: "season-1", season_number: 6 },
      },
    };
    const customAnalyticsPayload = {
      weekly: [
        {
          week_index: 1,
          label: "Pre-Season",
          start: "2025-08-14T00:00:00.000Z",
          end: "2025-09-16T18:59:59.000Z",
        },
        {
          week_index: 2,
          label: "Episode 1",
          start: "2025-09-16T18:30:00.000Z",
          end: "2025-09-23T18:15:00.000Z",
        },
      ],
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics")) {
        return jsonResponse(customAnalyticsPayload);
      }
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/episode-discussions/refresh")) {
        return jsonResponse(refreshPayload);
      }
      if (url.includes("/api/admin/reddit/runs/")) {
        return new Promise<Response>(() => {});
      }
      if (url.includes("/api/admin/reddit/communities/") && url.includes("/discover")) {
        if (url.includes("refresh=true")) {
          return jsonResponse({
            run: {
              run_id: "63a7be5d-0000-4000-8000-000000000000",
              status: "queued",
              queue: {
                running_total: 2,
                queued_total: 5,
                other_running: 2,
                other_queued: 4,
                queued_ahead: 3,
              },
            },
          });
        }
        return jsonResponse({
          discovery: {
            ...discoveryPayload.discovery,
            totals: {
              fetched_rows: 0,
              matched_rows: 0,
              tracked_flair_rows: 0,
            },
            threads: [],
          },
        });
      }
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [communityWithSaltLakeFlair, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <RedditSourcesManager
        mode="global"
        hideCommunityList
        initialCommunityId="community-1"
        episodeDiscussionsPlacement="inline"
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Sync Posts/ })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Sync Posts/ }));
    expect(await screen.findByText("Pre-Season")).toBeInTheDocument();

    clickPeriodRefreshPosts("Pre-Season");

    await waitFor(() => {
      expect(cardHasPendingRefresh("Pre-Season")).toBe(true);
    }, { timeout: 10_000 });
  }, 20_000);

  it("shows live comments-stage counters from backend run diagnostics", async () => {
    const communityWithSaltLakeFlair = {
      ...baseCommunity,
      post_flares: ["Salt Lake City"],
      analysis_flares: ["Salt Lake City"],
      analysis_all_flares: ["Salt Lake City"],
    };
    const refreshPayload = {
      community: communityWithSaltLakeFlair,
      candidates: [],
      episode_matrix: [],
      meta: {
        fetched_at: "2026-02-24T12:00:00.000Z",
        total_found: 0,
        season_context: { season_id: "season-1", season_number: 6 },
      },
    };
    const customAnalyticsPayload = {
      weekly: [
        {
          week_index: 1,
          label: "Pre-Season",
          start: "2025-08-14T00:00:00.000Z",
          end: "2025-09-16T18:59:59.000Z",
        },
      ],
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics")) {
        return jsonResponse(customAnalyticsPayload);
      }
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/episode-discussions/refresh")) {
        return jsonResponse(refreshPayload);
      }
      if (url.includes("/api/admin/reddit/runs/")) {
        return new Promise<Response>(() => {});
      }
      if (url.includes("/api/admin/reddit/communities/") && url.includes("/discover")) {
        if (url.includes("refresh=true")) {
          return jsonResponse({
            run: {
              run_id: "63a7be5d-0000-4000-8000-000000000000",
              status: "running",
              queue: {
                running_total: 1,
                queued_total: 0,
                other_running: 0,
                other_queued: 0,
                queued_ahead: 0,
              },
              diagnostics: {
                progress: {
                  stage: "fetching_comments",
                  listing_pages_fetched: 12,
                  search_pages_fetched: 4,
                  rows_discovered_raw: 210,
                  rows_matched: 35,
                  comments_targets_total: 20,
                  comments_targets_done: 6,
                  comments_rows_upserted: 880,
                },
              },
            },
          });
        }
        return jsonResponse({
          discovery: {
            ...discoveryPayload.discovery,
            totals: {
              fetched_rows: 0,
              matched_rows: 0,
              tracked_flair_rows: 0,
            },
            threads: [],
          },
        });
      }
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [communityWithSaltLakeFlair, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <RedditSourcesManager
        mode="global"
        hideCommunityList
        initialCommunityId="community-1"
        episodeDiscussionsPlacement="inline"
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Sync Posts/ })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Sync Posts/ }));
    expect(await screen.findByText("Pre-Season")).toBeInTheDocument();

    clickPeriodRefreshPosts("Pre-Season");

    expect(await screen.findByText(/fetching comments/i)).toBeInTheDocument();
    expect(screen.getByText(/comments 6\/20 posts/i)).toBeInTheDocument();
    expect(screen.getByText(/comment rows 880/i)).toBeInTheDocument();
  }, 20_000);

  it("continues polling run status when cached discovery is returned with an active run", async () => {
    const communityWithSaltLakeFlair = {
      ...baseCommunity,
      post_flares: ["Salt Lake City"],
      analysis_flares: ["Salt Lake City"],
      analysis_all_flares: ["Salt Lake City"],
    };
    const refreshPayload = {
      community: communityWithSaltLakeFlair,
      candidates: [],
      episode_matrix: [
        {
          episode_number: 1,
          live: {
            post_count: 1,
            total_comments: 2700,
            total_upvotes: 168,
            top_post_id: "episode-1-live",
            top_post_url: "https://www.reddit.com/r/BravoRealHousewives/comments/episode-1-live/test/",
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
          total_comments: 2700,
          total_upvotes: 168,
        },
      ],
      meta: {
        fetched_at: "2026-02-24T12:00:00.000Z",
        total_found: 1,
        season_context: { season_id: "season-1", season_number: 6 },
      },
    };
    const customAnalyticsPayload = {
      weekly: [
        {
          week_index: 1,
          label: "Pre-Season",
          start: "2025-08-14T00:00:00.000Z",
          end: "2025-09-16T18:59:59.000Z",
        },
        {
          week_index: 2,
          label: "Episode 1",
          start: "2025-09-16T18:30:00.000Z",
          end: "2025-09-23T18:15:00.000Z",
        },
      ],
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social/analytics")) {
        return jsonResponse(customAnalyticsPayload);
      }
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/episode-discussions/refresh")) {
        return jsonResponse(refreshPayload);
      }
      if (url.includes("/api/admin/reddit/runs/")) {
        return jsonResponse({
          run_id: "11111111-2222-4333-8444-555555555555",
          status: "completed",
          totals: {
            fetched_rows: 2,
            matched_rows: 2,
            tracked_flair_rows: 2,
          },
        });
      }
      if (url.includes("/api/admin/reddit/communities/") && url.includes("/discover")) {
        const isRefreshCall = url.includes("refresh=true");
        if (isRefreshCall) {
          return jsonResponse({
            discovery: {
              ...discoveryPayload.discovery,
              totals: {
                fetched_rows: 1,
                matched_rows: 1,
                tracked_flair_rows: 1,
              },
              threads: [
                {
                  ...discoveryPayload.discovery.threads[0],
                  reddit_post_id: "cached-preseason-post",
                  title: "Cached preseason post",
                  posted_at: "2025-09-01T00:00:00.000Z",
                  link_flair_text: "Salt Lake City",
                },
              ],
            },
            run: {
              run_id: "11111111-2222-4333-8444-555555555555",
              status: "queued",
              queue: {
                running_total: 1,
                queued_total: 1,
                other_running: 1,
                other_queued: 0,
                queued_ahead: 0,
              },
            },
          });
        }
        return jsonResponse({
          discovery: {
            ...discoveryPayload.discovery,
            totals: {
              fetched_rows: 2,
              matched_rows: 2,
              tracked_flair_rows: 2,
            },
            threads: [
              {
                ...discoveryPayload.discovery.threads[0],
                reddit_post_id: "cached-preseason-post",
                title: "Cached preseason post",
                posted_at: "2025-09-01T00:00:00.000Z",
                link_flair_text: "Salt Lake City",
              },
              {
                ...discoveryPayload.discovery.threads[0],
                reddit_post_id: "new-preseason-post",
                title: "New preseason post",
                posted_at: "2025-09-10T00:00:00.000Z",
                link_flair_text: "Salt Lake City",
              },
            ],
          },
        });
      }
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [communityWithSaltLakeFlair, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <RedditSourcesManager
        mode="global"
        hideCommunityList
        initialCommunityId="community-1"
        episodeDiscussionsPlacement="inline"
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Sync Posts/ })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Sync Posts/ }));
    expect(await screen.findByText("Pre-Season")).toBeInTheDocument();

    clickPeriodRefreshPosts("Pre-Season");

    await waitFor(() => {
      expect(cardHasPendingRefresh("Pre-Season")).toBe(true);
    }, { timeout: 10_000 });
    expect(
      await screen.findByText("Cached preseason post", {}, { timeout: 10_000 }),
    ).toBeInTheDocument();
  }, 20_000);

  it("shows per-candidate reason when a post is not auto-synced", async () => {
    const refreshPayload = {
      community: baseCommunity,
      candidates: [
        {
          reddit_post_id: "episode-2",
          title: "RHOSLC - Season 6 - Episode 4 - Live Episode Discussion",
          text: null,
          url: "https://www.reddit.com/r/BravoRealHousewives/comments/episode-2/test/",
          permalink: "/r/BravoRealHousewives/comments/episode-2/test/",
          author: "user2",
          score: 11,
          num_comments: 7,
          posted_at: "2026-02-24T12:00:00.000Z",
          link_flair_text: "Salt Lake City",
          episode_number: 4,
          discussion_type: "live",
          source_sorts: ["new"],
          match_reasons: ["title pattern: Live Episode Discussion"],
        },
      ],
      episode_matrix: [],
      meta: {
        fetched_at: "2026-02-24T12:00:00.000Z",
        total_found: 1,
        sync_requested: true,
        sync_auto_saved_count: 0,
        sync_auto_saved_post_ids: [],
        sync_skipped_conflicts: [],
        sync_skipped_ineligible_count: 1,
        sync_candidate_results: [
          {
            reddit_post_id: "episode-2",
            status: "not_eligible",
            reason_code: "author_not_automoderator",
            reason: "Author is not AutoModerator.",
          },
        ],
      },
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/episode-discussions/refresh")) {
        return jsonResponse(refreshPayload);
      }
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [baseCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <RedditSourcesManager
        mode="global"
        initialCommunityId="community-1"
        episodeDiscussionsPlacement="inline"
        enableEpisodeSync
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Sync Posts/ })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Sync Posts/ }));

    expect(await screen.findByText("Not auto-synced")).toBeInTheDocument();
    expect(screen.getByText("Author is not AutoModerator.")).toBeInTheDocument();
    expect(screen.getByText("Reason code: author_not_automoderator")).toBeInTheDocument();
  });

  it("filters candidates by sync status and reason code", async () => {
    const refreshPayload = {
      community: baseCommunity,
      candidates: [
        {
          reddit_post_id: "episode-a",
          title: "RHOSLC - Season 6 - Episode 4 - Live Episode Discussion [A]",
          text: null,
          url: "https://www.reddit.com/r/BravoRealHousewives/comments/episode-a/test/",
          permalink: "/r/BravoRealHousewives/comments/episode-a/test/",
          author: "AutoModerator",
          score: 111,
          num_comments: 21,
          posted_at: "2026-02-24T12:00:00.000Z",
          link_flair_text: "Salt Lake City",
          episode_number: 4,
          discussion_type: "live",
          source_sorts: ["new"],
          match_reasons: ["title pattern: Live Episode Discussion"],
        },
        {
          reddit_post_id: "episode-b",
          title: "RHOSLC - Season 6 - Episode 5 - Live Episode Discussion [B]",
          text: null,
          url: "https://www.reddit.com/r/BravoRealHousewives/comments/episode-b/test/",
          permalink: "/r/BravoRealHousewives/comments/episode-b/test/",
          author: "user-b",
          score: 22,
          num_comments: 6,
          posted_at: "2026-02-24T12:00:00.000Z",
          link_flair_text: "Salt Lake City",
          episode_number: 5,
          discussion_type: "live",
          source_sorts: ["new"],
          match_reasons: ["title pattern: Live Episode Discussion"],
        },
        {
          reddit_post_id: "episode-c",
          title: "RHOSLC - Season 6 - Episode 6 - Live Episode Discussion [C]",
          text: null,
          url: "https://www.reddit.com/r/BravoRealHousewives/comments/episode-c/test/",
          permalink: "/r/BravoRealHousewives/comments/episode-c/test/",
          author: "user-c",
          score: 33,
          num_comments: 7,
          posted_at: "2026-02-24T12:00:00.000Z",
          link_flair_text: "Salt Lake City",
          episode_number: 6,
          discussion_type: "live",
          source_sorts: ["new"],
          match_reasons: ["title pattern: Live Episode Discussion"],
        },
      ],
      episode_matrix: [],
      meta: {
        fetched_at: "2026-02-24T12:00:00.000Z",
        total_found: 3,
        sync_requested: true,
        sync_auto_saved_count: 1,
        sync_auto_saved_post_ids: ["episode-a"],
        sync_skipped_conflicts: [],
        sync_skipped_ineligible_count: 1,
        sync_candidate_results: [
          {
            reddit_post_id: "episode-a",
            status: "auto_saved",
            reason_code: "auto_saved_success",
            reason: "Auto-synced successfully.",
          },
          {
            reddit_post_id: "episode-b",
            status: "not_eligible",
            reason_code: "author_not_automoderator",
            reason: "Author is not AutoModerator.",
          },
        ],
      },
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/episode-discussions/refresh")) {
        return jsonResponse(refreshPayload);
      }
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [baseCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <RedditSourcesManager
        mode="global"
        initialCommunityId="community-1"
        episodeDiscussionsPlacement="inline"
        enableEpisodeSync
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Sync Posts/ })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Sync Posts/ }));

    expect(await screen.findByText(/\[A\]/i)).toBeInTheDocument();
    expect(screen.getByText(/\[B\]/i)).toBeInTheDocument();
    expect(screen.getByText(/\[C\]/i)).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Auto-sync status" }), {
      target: { value: "not_eligible" },
    });
    expect(screen.queryByText(/\[A\]/i)).not.toBeInTheDocument();
    expect(screen.getByText(/\[B\]/i)).toBeInTheDocument();
    expect(screen.queryByText(/\[C\]/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Auto-sync reason" }), {
      target: { value: "author_not_automoderator" },
    });
    expect(screen.getByText(/\[B\]/i)).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Auto-sync status" }), {
      target: { value: "no_sync_result" },
    });
    expect(screen.queryByText(/\[A\]/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\[B\]/i)).not.toBeInTheDocument();
    expect(screen.getByText(/\[C\]/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText(/\[C\]/i)).toBeInTheDocument();
  });

  it("exports sync candidate results to CSV", async () => {
    const refreshPayload = {
      community: baseCommunity,
      candidates: [
        {
          reddit_post_id: "episode-export",
          title: "RHOSLC - Season 6 - Episode 4 - Live Episode Discussion",
          text: null,
          url: "https://www.reddit.com/r/BravoRealHousewives/comments/episode-export/test/",
          permalink: "/r/BravoRealHousewives/comments/episode-export/test/",
          author: "user-export",
          score: 44,
          num_comments: 10,
          posted_at: "2026-02-24T12:00:00.000Z",
          link_flair_text: "Salt Lake City",
          episode_number: 4,
          discussion_type: "live",
          source_sorts: ["new"],
          match_reasons: ["title pattern: Live Episode Discussion"],
        },
      ],
      episode_matrix: [],
      meta: {
        fetched_at: "2026-02-24T12:00:00.000Z",
        total_found: 1,
        sync_requested: true,
        sync_auto_saved_count: 0,
        sync_auto_saved_post_ids: [],
        sync_skipped_conflicts: [],
        sync_skipped_ineligible_count: 1,
        season_context: { season_id: "season-1", season_number: 6 },
        period_context: {
          selected_window_start: "2026-01-01T00:00:00.000Z",
          selected_window_end: "2026-01-14T23:59:59.000Z",
          selected_period_labels: ["All Periods"],
        },
        sync_candidate_results: [
          {
            reddit_post_id: "episode-export",
            status: "not_eligible",
            reason_code: "author_not_automoderator",
            reason: "Author is not AutoModerator.",
          },
        ],
      },
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/episode-discussions/refresh")) {
        return jsonResponse(refreshPayload);
      }
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [baseCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    class CsvBlobMock {
      parts: string[];
      type: string;

      constructor(parts: unknown[], options?: { type?: string }) {
        this.parts = parts.map((part) => String(part));
        this.type = options?.type ?? "";
      }

      async text(): Promise<string> {
        return this.parts.join("");
      }
    }
    vi.stubGlobal("Blob", CsvBlobMock as unknown as typeof Blob);

    const createObjectUrlMock = vi.fn(() => "blob:sync-csv");
    const revokeObjectUrlMock = vi.fn();
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    Object.defineProperty(window.URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrlMock,
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrlMock,
    });

    render(
      <RedditSourcesManager
        mode="global"
        initialCommunityId="community-1"
        episodeDiscussionsPlacement="inline"
        enableEpisodeSync
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Sync Posts/ })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Sync Posts/ }));
    await screen.findByRole("button", { name: "Export Sync Audit CSV" });

    fireEvent.click(screen.getByRole("button", { name: "Export Sync Audit CSV" }));

    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    const csvBlob = createObjectUrlMock.mock.calls[0]?.[0] as { text: () => Promise<string> };
    const csvText = await csvBlob.text();
    expect(csvText).toContain("reason_code");
    expect(csvText).toContain("author_not_automoderator");
    expect(csvText).toContain("episode-export");
    expect(anchorClickSpy).toHaveBeenCalled();
    expect(revokeObjectUrlMock).toHaveBeenCalledWith("blob:sync-csv");

    anchorClickSpy.mockRestore();
  });

  it("renders season mode as cards-only communities with badges, flares, and per-card actions", async () => {
    const showFocusedCommunity = {
      ...baseCommunity,
      id: "community-3",
      subreddit: "rhoslc",
      display_name: "rhoslc",
      is_show_focused: true,
      network_focus_targets: [],
      franchise_focus_targets: [],
      post_flares: ["Episode Discussion", "Post Episode Discussion"],
      analysis_flares: ["Episode Discussion", "Post Episode Discussion"],
      analysis_all_flares: ["Episode Discussion"],
      assigned_thread_count: 0,
      assigned_threads: [],
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/api/admin/reddit/communities/community-1/discover")) {
        return jsonResponse(discoveryPayload);
      }
      if (url.includes("/flares/refresh")) {
        return jsonResponse({ community: baseCommunity, flares: baseCommunity.post_flares, source: "api" });
      }
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [baseCommunity, showFocusedCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <RedditSourcesManager
        mode="season"
        showId="show-1"
        showName="The Real Housewives of Salt Lake City"
        seasonId="season-1"
        seasonNumber={6}
      />,
    );

    expect(await screen.findByText("RHOSLC")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reddit Communities" })).toBeInTheDocument();
    expect(screen.getByText("Season Selection")).toBeInTheDocument();
    const landingSeasonSelect = screen.getByRole("combobox", { name: "Season Selection" });
    expect(landingSeasonSelect).toHaveValue("6");
    expect(within(landingSeasonSelect).queryByRole("option", { name: "S7" })).not.toBeInTheDocument();
    expect(within(landingSeasonSelect).getByRole("option", { name: "S6" })).toBeInTheDocument();
    expect(screen.queryByText("Assigned Threads")).not.toBeInTheDocument();
    expect(screen.queryByText("Discovered Threads")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Community" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Thread" })).not.toBeInTheDocument();

    const bravoCommunityLink = await screen.findByRole("link", {
      name: "r/BravoRealHousewives",
    });
    await waitFor(() => {
      expect(bravoCommunityLink).toHaveAttribute(
        "href",
        "/rhoslc/social/reddit/BravoRealHousewives/s6",
      );
    });
    const bravoCard = bravoCommunityLink.closest("article") as HTMLElement;
    expect(within(bravoCard).getByText("NETWORK COMMUNITY")).toBeInTheDocument();
    expect(within(bravoCard).getByText("FRANCHISE COMMUNITY")).toBeInTheDocument();
    expect(within(bravoCard).getByText("Episode Discussion")).toBeInTheDocument();
    expect(within(bravoCard).queryByText("Live Thread")).not.toBeInTheDocument();
    expect(within(bravoCard).queryByRole("link", { name: "Settings" })).not.toBeInTheDocument();
    expect(within(bravoCard).queryByRole("link", { name: "Community View" })).not.toBeInTheDocument();
    expect(within(bravoCard).queryByRole("button", { name: "Discover Threads" })).not.toBeInTheDocument();
    expect(within(bravoCard).queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();

    const showCommunityLink = screen.getByRole("link", { name: "r/rhoslc" });
    const showCard = showCommunityLink.closest("article") as HTMLElement;
    expect(within(showCard).getByText("SHOW COMMUNITY")).toBeInTheDocument();
  });

  it("includes season_id for episode refresh requests when seasonId context is provided", async () => {
    const refreshPayload = {
      community: baseCommunity,
      candidates: [],
      episode_matrix: [],
      meta: {
        fetched_at: "2026-02-24T12:00:00.000Z",
        total_found: 0,
        season_context: { season_id: "season-1", season_number: 6 },
      },
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/episode-discussions/refresh")) {
        return jsonResponse(refreshPayload);
      }
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [baseCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <RedditSourcesManager
        mode="global"
        hideCommunityList
        initialCommunityId="community-1"
        episodeDiscussionsPlacement="inline"
        seasonId="season-1"
        seasonNumber={6}
      />,
    );

    const refreshButton = await screen.findByRole("button", {
      name: /Sync Posts/,
    });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/episode-discussions/refresh?season_id=season-1"),
        expect.anything(),
      );
    });
  });

  it("shows zero-result diagnostics after refresh when no episode candidates are found", async () => {
    const refreshPayload = {
      community: baseCommunity,
      candidates: [],
      episode_matrix: [],
      meta: {
        fetched_at: "2026-02-24T12:00:00.000Z",
        total_found: 0,
        expected_episode_count: 18,
        expected_episode_numbers: Array.from({ length: 18 }, (_, index) => index + 1),
        coverage_found_episode_count: 0,
        coverage_expected_slots: 54,
        coverage_found_slots: 0,
        coverage_missing_slots: [{ episode_number: 1, discussion_type: "live" }],
        discovery_source_summary: {
          listing_count: 65,
          search_count: 0,
          search_pages_fetched: 3,
          gap_fill_queries_run: 12,
        },
        season_context: { season_id: "season-1", season_number: 6 },
        period_context: { selected_period_labels: ["All Periods"] },
      },
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/episode-discussions/refresh")) {
        return jsonResponse(refreshPayload);
      }
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [baseCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <RedditSourcesManager
        mode="global"
        initialCommunityId="community-1"
        episodeDiscussionsPlacement="inline"
        enableEpisodeSync
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Sync Posts/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Sync Posts/ }));

    expect(
      await screen.findByText("No episode discussion candidates found for the selected season and period."),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Episodes matched 0/18 · thread slots matched 0/54").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Listings: 65 · Search hits: 0 · Search pages: 3 · Gap-fill queries: 12")
        .length,
    ).toBeGreaterThan(0);
  });

  it("defaults episode season to newest season with scheduled or aired episodes", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [baseCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<RedditSourcesManager mode="global" />);

    await waitFor(() => {
      expect(screen.getAllByText("r/BravoRealHousewives").length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByRole("button", { name: /Bravo RH/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Open community settings" }));

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Season" })).toHaveValue("season-1");
    });
  });

  it("rejects non-Reddit thread URLs in Add Thread form", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [baseCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<RedditSourcesManager mode="global" />);

    await waitFor(() => {
      expect(screen.getAllByText("r/BravoRealHousewives").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: /Bravo RH/i }));
    fireEvent.click(screen.getByRole("button", { name: "Add Thread" }));
    fireEvent.change(screen.getByPlaceholderText("https://www.reddit.com/r/BravoRealHousewives/comments/..."), {
      target: { value: "https://example.com/comments/post1/not-reddit" },
    });
    fireEvent.change(screen.getByPlaceholderText("Episode Discussion Thread"), {
      target: { value: "Bad URL Thread" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Thread" }));

    await waitFor(() => {
      expect(screen.getByText("Enter a valid Reddit post URL")).toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/admin/reddit/threads",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
