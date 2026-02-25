import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import RedditSourcesManager from "@/components/admin/reddit-sources-manager";
import { auth } from "@/lib/firebase";

const { usePathnameMock, useSearchParamsMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(() => "/admin/social-media"),
  useSearchParamsMock: vi.fn(() => new URLSearchParams()),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
  useSearchParams: useSearchParamsMock,
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

const maybeHandleSeasonPeriodRequests = (url: string): Response | null => {
  if (url.includes("/social/analytics")) {
    return jsonResponse(defaultAnalyticsPayload);
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

describe("RedditSourcesManager", () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue("/admin/social-media");
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
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

    expect(screen.getByText("Community")).toBeInTheDocument();
    expect(screen.queryByText("Selected Community")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Community View",
      }),
    ).toHaveAttribute("href", "/admin/social-media/reddit/communities/community-1");
  });

  it("uses dedicated community heading/actions without top-row delete in community view mode", async () => {
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
      expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
    });
    const heading = await screen.findByRole("heading", { name: "RHOSLC Communities" });
    const headerRow = heading.closest("div")?.parentElement as HTMLElement;
    expect(within(headerRow).getByRole("button", { name: "Settings" })).toBeInTheDocument();
    expect(within(headerRow).getByRole("button", { name: "Discover Threads" })).toBeInTheDocument();
    expect(within(headerRow).queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(within(headerRow).queryByRole("button", { name: "Add Community" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Community" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(await screen.findByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("shows discovery filter hints and show-match badge after discover", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/api/admin/reddit/communities/") && url.includes("/discover")) {
        return jsonResponse(discoveryPayload);
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
    fireEvent.click((await screen.findAllByRole("button", { name: "Discover Threads" }))[0]);

    expect(await screen.findByText("Suggested Include Terms")).toBeInTheDocument();
    expect(screen.getByText("rhoslc")).toBeInTheDocument();
    expect(screen.getByText("wife swap")).toBeInTheDocument();
    expect(screen.getByText("Show Match · score 2")).toBeInTheDocument();
    expect(screen.getByText("Flair: Episode Discussion")).toBeInTheDocument();
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
    fireEvent.click((await screen.findAllByRole("button", { name: "Discover Threads" }))[0]);

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
    fireEvent.click(screen.getByRole("button", { name: "Open community settings" }));
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
      expect(screen.getAllByText("Episode Thread").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Live Discussion").length).toBeGreaterThan(0);
    });
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

  it("renders dedicated episode controls inline with season + refresh and no period selector", async () => {
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

    expect(screen.getByRole("button", { name: /Refresh (Episode )?Discussions/ })).toBeInTheDocument();
    expect(screen.getByText("No episode discussion candidates loaded yet.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open community settings" }));
    expect(await screen.findByText("Title Phrases")).toBeInTheDocument();
    expect(
      screen.getByText(/Required flares for episode refresh are sourced from/i),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("combobox", { name: "Season" })).toHaveLength(1);
    expect(screen.queryByRole("combobox", { name: "Period" })).not.toBeInTheDocument();
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
      name: /Refresh (Episode )?Discussions/,
    });
    fireEvent.click(refreshButton);
    await waitFor(() => {
      const refreshCalls = fetchMock.mock.calls.filter((call) =>
        String(call[0]).includes("/episode-discussions/refresh"),
      );
      expect(refreshCalls.length).toBeGreaterThan(0);
      const refreshUrl = String(refreshCalls[refreshCalls.length - 1]?.[0] ?? "");
      expect(refreshUrl).toContain("season_id=");
      expect(refreshUrl).not.toContain("period_start");
      expect(refreshUrl).not.toContain("period_end");
      expect(refreshUrl).not.toContain("period_label");
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
        hideCommunityList
        initialCommunityId="community-1"
        episodeDiscussionsPlacement="inline"
        enableEpisodeSync
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Refresh (Episode )?Discussions/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Refresh (Episode )?Discussions/ }));

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
        hideCommunityList
        initialCommunityId="community-1"
        episodeDiscussionsPlacement="inline"
        enableEpisodeSync
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Refresh (Episode )?Discussions/ })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Refresh (Episode )?Discussions/ }));

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
        hideCommunityList
        initialCommunityId="community-1"
        episodeDiscussionsPlacement="inline"
        enableEpisodeSync
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Refresh (Episode )?Discussions/ })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Refresh (Episode )?Discussions/ }));

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
        hideCommunityList
        initialCommunityId="community-1"
        episodeDiscussionsPlacement="inline"
        enableEpisodeSync
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Refresh (Episode )?Discussions/ })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Refresh (Episode )?Discussions/ }));
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

    expect(await screen.findByText("RHOSLC S6")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reddit Communities" })).toBeInTheDocument();
    expect(screen.queryByText("Assigned Threads")).not.toBeInTheDocument();
    expect(screen.queryByText("Discovered Threads")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Community" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Thread" })).not.toBeInTheDocument();

    const bravoCommunityLink = await screen.findByRole("link", {
      name: "r/BravoRealHousewives",
    });
    const bravoCard = bravoCommunityLink.closest("article") as HTMLElement;
    expect(within(bravoCard).getByText("NETWORK")).toBeInTheDocument();
    expect(within(bravoCard).queryByText("FRANCHISE")).not.toBeInTheDocument();
    expect(within(bravoCard).getByText("Episode Discussion")).toBeInTheDocument();
    expect(within(bravoCard).queryByText("Live Thread")).not.toBeInTheDocument();
    expect(within(bravoCard).queryByRole("link", { name: "Settings" })).not.toBeInTheDocument();
    expect(within(bravoCard).queryByRole("link", { name: "Community View" })).not.toBeInTheDocument();
    expect(within(bravoCard).queryByRole("button", { name: "Discover Threads" })).not.toBeInTheDocument();
    expect(within(bravoCard).queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();

    const showCommunityLink = screen.getByRole("link", { name: "r/rhoslc" });
    const showCard = showCommunityLink.closest("article") as HTMLElement;
    expect(within(showCard).getByText("SHOW")).toBeInTheDocument();
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
      name: /Refresh (Episode )?Discussions/,
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
        hideCommunityList
        initialCommunityId="community-1"
        episodeDiscussionsPlacement="inline"
        enableEpisodeSync
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Refresh (Episode )?Discussions/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Refresh (Episode )?Discussions/ }));

    expect(
      await screen.findByText("No episode discussion candidates found for the selected season."),
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
    fireEvent.click(screen.getByRole("button", { name: "Open community settings" }));

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
