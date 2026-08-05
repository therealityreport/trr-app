import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ShowOverviewTab, {
  type ShowOverviewTabProps,
} from "@/components/admin/show-tabs/ShowOverviewTab";
import type { OverviewSeasonCoverageRow } from "@/lib/admin/show-page/overview-display";

type TestExternalLink = {
  id: string;
  url: string;
  title: string;
};

type TestSocialHandle = {
  id: string;
  label: string;
};

type TestProps = ShowOverviewTabProps<
  TestExternalLink,
  TestSocialHandle,
  OverviewSeasonCoverageRow
>;

const createProps = (overrides: Partial<TestProps> = {}): TestProps => ({
  show: {
    id: "show-1",
    name: "The Real Housewives of Salt Lake City",
    description: "A representative show description.",
    premiere_date: "2020-11-11",
    external_ids: { wikidata_id: "Q104833725" },
    tmdb_id: 110381,
    imdb_id: "tt11363282",
    derived_external_links: {
      justwatch_url: "https://www.themoviedb.org/tv/110381/watch?locale=US",
    },
    genres: ["Reality"],
    tags: ["Bravo"],
  },
  nickname: "RHOSLC",
  alternativeNamesText: "RHOSLC\nSalt Lake City Housewives",
  refreshCenterButtonLabel: "Open Refresh Center",
  refreshNotice: null,
  refreshError: null,
  refreshing: true,
  refreshProgress: {
    stage: "show_core",
    message: "Refreshing details",
    current: 1,
    total: 2,
  },
  renderRefreshProgress: ({ show, message }) =>
    show ? <div data-testid="refresh-progress">{message}</div> : null,
  detailsNotice: null,
  detailsError: null,
  externalIdLinks: [
    {
      id: "external-1",
      url: "https://example.com/show",
      title: "Official show page",
    },
  ],
  getExternalIdLinkTitle: (link) => link.title,
  renderExternalIdLinkBadge: (link) => <span>{`badge:${link.id}`}</span>,
  socialHandleLinks: [{ id: "social-1", label: "@rhoslc" }],
  renderSocialHandlePill: (pill) => <span>{pill.label}</span>,
  redditLoading: false,
  redditError: null,
  redditGroups: [
    {
      key: "SHOW",
      label: "SHOW",
      communities: [
        {
          id: "community-1",
          subreddit: "RHOSLC",
          displayName: "RHOSLC Community",
          assignedFlairs: ["Episode Discussion"],
          postFlairs: [],
        },
      ],
    },
  ],
  getRedditCommunityHref: (community) => `/admin/social/reddit/${community.subreddit}`,
  seasonUrlCoverageRows: [
    {
      seasonNumber: 6,
      links: [
        {
          id: "season-link-1",
          url: "https://example.com/season-6",
          sourceKind: "fandom",
          sourceLabel: "Fandom",
          iconUrl: null,
          linkTitle: "Season Six",
        },
      ],
    },
  ],
  renderSeasonCoverageBadge: (link) => <span>{`season-badge:${link.id}`}</span>,
  networks: ["Bravo"],
  watchProviderRegions: [
    {
      regionCode: "US",
      regionLabel: "United States",
      stream: ["Peacock"],
      free: ["Bravo TV"],
      buyRent: ["Apple TV"],
    },
    {
      regionCode: "GB",
      regionLabel: "United Kingdom",
      stream: ["Hayu"],
      free: [],
      buyRent: [],
    },
  ],
  watchProviderRegionOptions: [
    { regionCode: "US", regionLabel: "United States" },
    { regionCode: "GB", regionLabel: "United Kingdom" },
  ],
  selectedAvailabilityRegion: {
    regionCode: "US",
    regionLabel: "United States",
    stream: ["Peacock"],
    free: ["Bravo TV"],
    buyRent: ["Apple TV"],
  },
  fallbackWatchProviders: [],
  isCovered: true,
  coverageLoading: false,
  coverageError: null,
  onOpenSettings: vi.fn(),
  onOpenRefreshLog: vi.fn(),
  onSelectAvailabilityRegion: vi.fn(),
  onAddToCoveredShows: vi.fn(),
  onRemoveFromCoveredShows: vi.fn(),
  ...overrides,
});

describe("ShowOverviewTab", () => {
  it("keeps the details tabpanel semantics and renders representative overview data", () => {
    render(<ShowOverviewTab {...createProps()} />);

    const tabpanel = screen.getByRole("tabpanel");
    expect(tabpanel).toHaveAttribute("id", "show-tabpanel-details");
    expect(tabpanel).toHaveAttribute("aria-labelledby", "show-tab-details");
    expect(screen.getByText("Details and Metadata")).toBeInTheDocument();
    expect(screen.getByText("The Real Housewives of Salt Lake City")).toBeInTheDocument();
    expect(screen.getByText("RHOSLC", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("Salt Lake City Housewives", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("A representative show description.")).toBeInTheDocument();
    expect(screen.getByText("Official show page")).toBeInTheDocument();
    expect(screen.getByText("badge:external-1")).toBeInTheDocument();
    expect(screen.getByText("@rhoslc")).toBeInTheDocument();
    expect(screen.getByText("RHOSLC Community")).toBeInTheDocument();
    expect(screen.getByText("Episode Discussion")).toBeInTheDocument();
    expect(screen.getByText("season-badge:season-link-1")).toBeInTheDocument();
    expect(screen.getByText("Peacock")).toBeInTheDocument();
    expect(screen.getByText("Bravo TV")).toBeInTheDocument();
    expect(screen.getByText("Apple TV")).toBeInTheDocument();
    expect(screen.getByText("show-1")).toBeInTheDocument();
    expect(screen.getByTestId("refresh-progress")).toHaveTextContent("Refreshing details");
  });

  it("dispatches settings, refresh, region, and coverage callbacks and preserves disabled coverage state", () => {
    const onOpenSettings = vi.fn();
    const onOpenRefreshLog = vi.fn();
    const onSelectAvailabilityRegion = vi.fn();
    const onRemoveFromCoveredShows = vi.fn();
    const onAddToCoveredShows = vi.fn();
    const props = createProps({
      onOpenSettings,
      onOpenRefreshLog,
      onSelectAvailabilityRegion,
      onRemoveFromCoveredShows,
      onAddToCoveredShows,
    });
    const { rerender } = render(<ShowOverviewTab {...props} />);

    for (const button of screen.getAllByRole("button", { name: "Open Settings" })) {
      fireEvent.click(button);
    }
    expect(onOpenSettings).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: "Open Refresh Center" }));
    expect(onOpenRefreshLog).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByRole("combobox", { name: "Availability region" }), {
      target: { value: "GB" },
    });
    expect(onSelectAvailabilityRegion).toHaveBeenCalledWith("GB");

    fireEvent.click(screen.getByRole("button", { name: "Remove from Shows" }));
    expect(onRemoveFromCoveredShows).toHaveBeenCalledTimes(1);

    rerender(
      <ShowOverviewTab
        {...props}
        isCovered={false}
        coverageLoading={true}
      />
    );
    const disabledCoverageButton = screen.getByRole("button", { name: "..." });
    expect(disabledCoverageButton).toBeDisabled();
    fireEvent.click(disabledCoverageButton);
    expect(onAddToCoveredShows).not.toHaveBeenCalled();
  });

  it("renders Reddit loading, error, and empty branches", () => {
    const props = createProps({ redditLoading: true, redditGroups: [] });
    const { rerender } = render(<ShowOverviewTab {...props} />);

    expect(screen.getByText("Loading Reddit communities...")).toBeInTheDocument();

    rerender(
      <ShowOverviewTab
        {...props}
        redditLoading={false}
        redditError="Reddit is unavailable"
      />
    );
    expect(screen.getByText("Reddit is unavailable")).toHaveClass("text-red-600");

    rerender(
      <ShowOverviewTab
        {...props}
        redditLoading={false}
        redditError={null}
      />
    );
    expect(
      screen.getByText("No relevant Reddit communities configured for this show.")
    ).toBeInTheDocument();
  });

  it("renders season and watch empty and fallback branches", () => {
    const props = createProps({
      seasonUrlCoverageRows: [],
      watchProviderRegions: [],
      watchProviderRegionOptions: [],
      selectedAvailabilityRegion: null,
      fallbackWatchProviders: [],
    });
    const { rerender } = render(<ShowOverviewTab {...props} />);

    expect(screen.getByText("No seasons available for URL coverage yet.")).toBeInTheDocument();
    expect(screen.getByText("No streaming providers on this record.")).toBeInTheDocument();
    expect(screen.getByText("Typed TMDb availability is unavailable for this show.")).toBeInTheDocument();

    rerender(
      <ShowOverviewTab
        {...props}
        seasonUrlCoverageRows={[{ seasonNumber: 6, links: [] }]}
        fallbackWatchProviders={["Hayu"]}
      />
    );
    expect(screen.getByText("No validated season-scoped URLs discovered.")).toBeInTheDocument();
    expect(screen.getByText("Hayu")).toBeInTheDocument();
  });
});
