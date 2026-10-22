import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
const { fetchMock, pathnameMock } = vi.hoisted(() => ({ fetchMock: vi.fn(), pathnameMock: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: pathnameMock, useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/lib/admin/client-auth", () => ({ fetchAdminWithAuth: fetchMock, getClientAuthHeaders: async () => ({}) }));
vi.mock("@/components/admin/RedditCapturePanel", () => ({ default: (props: { communityId: string; seasonId: string }) => <div data-testid="capture-context" data-community={props.communityId} data-season={props.seasonId} /> }));
import RedditSourcesManager from "@/components/admin/reddit-sources-manager";
const showId = "7782652f-783a-488b-8860-41b97de32e75";
const seasonId = "20c4cc05-0ab1-433f-b2fd-848f0d46a250";
const communityId = "a9bb355f-4cdd-4d8d-94dd-06a55ae303f2";
const community = { id: communityId, trr_show_id: showId, trr_show_name: "RHOSLC", subreddit: "rhoslc", display_name: "r/rhoslc", post_flairs: [], analysis_flairs: [], analysis_all_flairs: [], episode_title_patterns: [], post_flair_categories: {}, post_flair_assignments: {}, network_focus_targets: [], franchise_focus_targets: [], is_active: true, is_show_focused: true, assigned_threads: [] };
const seasons = [{ id: seasonId, season_number: 7, air_date: null, premiere_date: null, episode_airdate_count: 0 }, { id: "season-six", season_number: 6, episode_airdate_count: 16, air_date: "2025-09-01" }];
describe("explicit undated Reddit season selection", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    pathnameMock.mockReturnValue("/admin/social/reddit/rhoslc/rhoslc/s7");
    fetchMock.mockImplementation(async (input: string | URL) => {
      const url = String(input);
      let body: unknown = {};
      if (/\/reddit\/communities\?/.test(url)) body = { communities: [{ ...community, id: "other-community", subreddit: "BravoRealHousewives", display_name: "Other community" }, community] };
      else if (url.includes("/seasons?")) body = { seasons };
      else if (url.includes("/episodes")) body = { episodes: [{ id: "undated-episode", episode_number: 1, air_date: null }] };
      else if (url.includes("/social/analytics/periods?")) body = { weekly: [{ week_index: 0, label: "Pre-Season", start: "2026-09-10T00:00:00Z", end: "2026-09-16T23:59:59.999999Z" }] };
      else if (url === `/api/admin/trr-api/shows/${showId}`) body = { show: { id: showId, name: "RHOSLC", alternative_names: ["RHOSLC"], slug: "rhoslc" } };
      return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
    });
  });
  it("keeps explicit S7 in the season selector when S6 has dated episodes", async () => {
    render(<RedditSourcesManager mode="season" showId={showId} showSlug="rhoslc" showName="RHOSLC" seasonId={seasonId} seasonNumber={7} />);
    const selection = await screen.findByRole("combobox", { name: "Season Selection" });
    await waitFor(() => expect(selection).toHaveValue("7"));
    expect(screen.getByRole("option", { name: "S7" })).toBeInTheDocument();
    expect(await screen.findByRole("option", { name: "S6" })).toBeInTheDocument();
  });
  it.each(["/admin/social/reddit/rhoslc/rhoslc/s7", "/social/reddit/rhoslc/rhoslc/s7"])("pins the requested community and S7 UUID at %s", async (pathname) => {
    pathnameMock.mockReturnValue(pathname);
    render(<RedditSourcesManager mode="global" showSlug="rhoslc" seasonNumber={7} initialCommunityId="rhoslc" hideCommunityList />);
    await waitFor(() => {
      expect(screen.getByTestId("capture-context")).toHaveAttribute("data-community", communityId);
      expect(screen.getByTestId("capture-context")).toHaveAttribute("data-season", seasonId);
    });
    expect(screen.getByRole("button", { name: "Season 7" })).toBeInTheDocument();
  });
  it("uses displayed bounds and renders partial/future counts without a stale badge", async () => {
    const fallback = fetchMock.getMockImplementation()!;
    let releasePeriods!: (response: Response) => void;
    const periodsResponse = new Promise<Response>((resolve) => { releasePeriods = resolve; });
    fetchMock.mockImplementation(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      let body: unknown;
      if (url.includes("/reddit/analytics/community/")) {
        body = {
          coverage: { covered_container_count: 5, partial_container_count: 2, upcoming_container_count: 7,
            stale_container_count: 0, proven_through: "2026-10-21T23:06:47.895435Z" },
          freshness: { latest_run_status: "completed", latest_run_timestamp: "2026-10-22T01:00:00Z" },
          container_statuses: [{ container_key: "episode-1", coverage_state: "covered", stale: false }],
        };
      } else if (url.includes("/episodes")) {
        body = { episodes: [{ id: "ep1", episode_number: 1, air_date: "2026-09-16" }] };
      } else if (url.includes("/social/analytics/periods?")) {
        return periodsResponse;
      } else return fallback(input, init);
      return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    render(<RedditSourcesManager mode="global" showSlug="rhoslc" seasonNumber={7} initialCommunityId="rhoslc" hideCommunityList />);
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/social/analytics/periods?"))).toBe(true));
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/reddit/analytics/community/"))).toBe(false);
    await act(async () => releasePeriods(new Response(JSON.stringify({ weekly: [
      { week_index: 0, label: "Pre-Season", week_type: "preseason", episode_number: null, start: "2026-09-10T00:00:00Z", end: "2026-09-16T23:59:59.999999Z" },
      { week_index: 1, label: "Week 1", week_type: "episode", episode_number: 1, start: "2026-09-17T00:00:00Z", end: "2026-09-23T23:59:59.999999Z" },
    ] }), { status: 200 })));
    expect(await screen.findByText("5 covered · 2 partial · 7 upcoming")).toBeInTheDocument();
    expect(screen.getByText(/Captured through/)).toHaveTextContent("10/21/2026");
    await waitFor(() => {
      const requests = fetchMock.mock.calls.map(([url]) => new URL(String(url), "http://localhost"))
        .filter(url => url.pathname.includes("/reddit/analytics/community/") && url.searchParams.has("windows"));
      expect(requests.length).toBeGreaterThan(0);
      const windows = JSON.parse(requests.at(-1)!.searchParams.get("windows")!);
      expect(windows).toContainEqual(expect.objectContaining({ key: "episode-1", start: "2026-09-16T23:01:01.000Z" }));
      expect(windows).toContainEqual(expect.objectContaining({ key: "period-preseason", start: "2026-09-10T00:00:00.000Z", end: "2026-09-16T23:00:00.000Z" }));
    });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/social/analytics?"))).toBe(false);
    expect(screen.queryByRole("button", { name: /Rerun Stale Windows/ })).not.toBeInTheDocument();
  });

  it("does not report coverage against fallback dates when period metadata fails", async () => {
    const fallback = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((input: string | URL, init?: RequestInit) =>
      String(input).includes("/social/analytics/periods?")
        ? Promise.resolve(new Response("{}", { status: 504 }))
        : fallback(input, init));
    render(<RedditSourcesManager mode="global" showSlug="rhoslc" seasonNumber={7} initialCommunityId="rhoslc" hideCommunityList episodeDiscussionsPlacement="inline" />);
    expect(await screen.findByText("Season period dates could not load. Reload the page to retry.")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/reddit/analytics/community/"))).toBe(false);
  });

});
