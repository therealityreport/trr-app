import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
});
