import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  episode_required_flares: ["Salt Lake City"],
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
  episode_required_flares: [],
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

const seasonLookup: Record<string, Array<{ id: string; season_number: number }>> = {
  "show-1": [
    { id: "season-1", season_number: 6 },
    { id: "season-older-1", season_number: 5 },
  ],
  "show-2": [{ id: "season-2", season_number: 8 }],
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

    render(<RedditSourcesManager mode="global" />);

    await waitFor(() => {
      expect(screen.getAllByText("Bravo RH").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: /Bravo RH/i }));

    await waitFor(() => {
      expect(screen.getByText("S6E5 discussion")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Add Community" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Thread" })).toBeEnabled();
    expect(screen.getAllByText("The Real Housewives of Salt Lake City").length).toBeGreaterThan(0);
    expect(screen.getAllByText("The Real Housewives of Potomac").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Episode Discussion").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Live Thread").length).toBeGreaterThan(0);
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
      expect(screen.getAllByText("Bravo RH").length).toBeGreaterThan(0);
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

    render(<RedditSourcesManager mode="global" />);

    await waitFor(() => {
      expect(screen.getAllByText("Bravo RH").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: /Bravo RH/i }));
    const discoverButton = await screen.findByRole("button", { name: "Discover Threads" }, { timeout: 10_000 });
    fireEvent.click(discoverButton);

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

    render(<RedditSourcesManager mode="global" />);

    await waitFor(() => {
      expect(screen.getAllByText("Bravo RH").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: /Bravo RH/i }));
    expect(screen.getByRole("checkbox", { name: /Show matched only/i })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Discover Threads" }));

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
      expect(screen.getAllByText("Bravo RH").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: /Bravo RH/i }));
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
      expect(screen.getAllByText("Bravo RH").length).toBeGreaterThan(0);
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
      expect(screen.getAllByText("Bravo RH").length).toBeGreaterThan(0);
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
    await waitFor(() => {
      expect(screen.getByText("No post flairs available yet.")).toBeInTheDocument();
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
      expect(screen.getAllByText("Bravo RH").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: /Bravo RH/i }));

    expect(screen.queryByText("All Posts With Flair")).not.toBeInTheDocument();
    expect(
      screen.getByText("Show-focused mode enabled. All discovered posts are eligible (including no-flair posts)."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Show matched only/i })).not.toBeInTheDocument();
  });

  it("refreshes episode discussion candidates and bulk-saves selected threads", async () => {
    const refreshPayload = {
      community: baseCommunity,
      candidates: [
        {
          reddit_post_id: "episode-1",
          title: "RHOSLC - Season 6 - Episode 4 - Live Episode Discussion",
          text: null,
          url: "https://www.reddit.com/r/BravoRealHousewives/comments/episode-1/test/",
          permalink: "/r/BravoRealHousewives/comments/episode-1/test/",
          author: "user1",
          score: 321,
          num_comments: 88,
          posted_at: "2026-02-24T12:00:00.000Z",
          link_flair_text: "Salt Lake City",
          source_sorts: ["new"],
          match_reasons: ["title pattern: Live Episode Discussion"],
        },
      ],
      meta: {
        fetched_at: "2026-02-24T12:00:00.000Z",
        total_found: 1,
        filters_applied: {},
        season_context: { season_id: "season-1", season_number: 6 },
        period_context: {
          selected_window_start: "2026-01-01T00:00:00.000Z",
          selected_window_end: "2026-01-14T23:59:59.000Z",
          selected_period_labels: ["All Periods"],
        },
      },
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const contextResponse = maybeHandleSeasonPeriodRequests(url);
      if (contextResponse) return contextResponse;
      if (url.includes("/episode-discussions/refresh")) {
        return jsonResponse(refreshPayload);
      }
      if (url.includes("/episode-discussions/save")) {
        return jsonResponse({ success: true, saved_count: 1, skipped_conflicts: [] });
      }
      if (url.includes("/api/admin/reddit/communities")) {
        return jsonResponse({ communities: [baseCommunity, secondaryCommunity] });
      }
      if (url.includes("/api/admin/covered-shows")) return jsonResponse(coveredShowsPayload);
      throw new Error(`Unexpected URL ${url} ${init?.method ?? "GET"}`);
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

    await waitFor(() => {
      expect(screen.getAllByText("Bravo RH").length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByRole("button", { name: /Bravo RH/i }));
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Season" })).toHaveValue("season-1");
      expect(screen.getByRole("combobox", { name: "Period" })).toHaveValue("all-periods");
    });

    fireEvent.click(screen.getByRole("button", { name: "REFRESH" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("season_id=season-1"),
        expect.anything(),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("season_number=6"),
        expect.anything(),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("period_start=2026-01-01T00%3A00%3A00.000Z"),
        expect.anything(),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("period_end=2026-01-14T23%3A59%3A59.000Z"),
        expect.anything(),
      );
    });

    expect(await screen.findByText("RHOSLC - Season 6 - Episode 4 - Live Episode Discussion")).toBeInTheDocument();
    expect(screen.getByText("321 upvotes")).toBeInTheDocument();
    expect(screen.getByText("88 comments")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save Selected" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/episode-discussions/save"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("\"reddit_post_id\":\"episode-1\""),
        }),
      );
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
      expect(screen.getAllByText("Bravo RH").length).toBeGreaterThan(0);
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
