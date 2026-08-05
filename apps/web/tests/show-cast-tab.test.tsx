/* eslint-disable @next/next/no-img-element */
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import ShowCastTab, { type ShowCastTabProps } from "@/components/admin/show-tabs/ShowCastTab";

vi.mock("@/app/admin/trr-shows/[showId]/ShowPageMedia", () => ({
  CastPhoto: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

type TestCastMember = {
  id: string;
  name: string;
};

type PresentationalProps = Exclude<ShowCastTabProps<TestCastMember>, { children: ReactNode }>;

const createProps = (overrides: Partial<PresentationalProps> = {}): PresentationalProps => ({
  renderedCastCount: 2,
  matchedCastCount: 3,
  totalCastCount: 4,
  renderedCrewCount: 1,
  matchedCrewCount: 2,
  totalCrewCount: 3,
  renderedVisibleCount: 3,
  matchedVisibleCount: 5,
  totalVisibleCount: 7,
  castMediaEnriching: false,
  isCastRefreshBusy: false,
  castPhotoEnriching: false,
  castLoading: false,
  missingCastPhotoCount: 2,
  castRefreshButtonLabel: "Refresh Credits",
  showCancelRunButton: true,
  castRefreshCanceling: false,
  castRefreshCancelButtonLabel: "Cancel Run",
  onEnrichCastMedia: vi.fn(),
  onEnrichMissingCastPhotos: vi.fn(),
  onRefreshShowCast: vi.fn(),
  onCancelShowCastWorkflow: vi.fn(),
  castCreditsRefreshNotice: null,
  castCreditsRefreshError: null,
  castRefreshPhaseRows: [
    {
      id: "credits",
      label: "Syncing Credits...",
      message: "IMDb credits in progress",
      statusClassName: "border-sky-200 bg-sky-50 text-sky-700",
      statusLabel: "Running",
    },
  ],
  castRefreshPipelineRunning: true,
  refreshNotice: null,
  refreshError: null,
  castPhotoEnrichNotice: null,
  castPhotoEnrichError: null,
  castMediaEnrichNotice: null,
  castMediaEnrichError: null,
  castLoadWarning: null,
  castLoadError: null,
  onRetryCast: vi.fn(),
  showCreditsError: null,
  onRetryCrew: vi.fn(),
  showCreditsLoading: false,
  showCreditsLoadedOnce: true,
  showCreditsSourceUrl: "https://www.imdb.com/title/tt123/credits",
  castRoleMembersWarningWithSnapshotAge: null,
  onRetryCastRoleMembers: vi.fn(),
  rolesWarningWithSnapshotAge: null,
  onRetryRoles: vi.fn(),
  showCastIntelligenceUnavailable: false,
  castRoleMembersError: null,
  rolesError: null,
  castRoleEditorDeepLinkWarning: null,
  castEligibilityWarning: null,
  castRunFailedMembers: [{ personId: "p-1", name: "Jane Doe", reason: "Bravo image failed" }],
  castFailedMembersOpen: false,
  onToggleCastFailedMembersOpen: vi.fn(),
  onRetryFailedCastMediaEnrich: vi.fn(),
  castMatrixSyncLoading: false,
  castMatrixSyncError: null,
  castMatrixSyncResult: null,
  castMatrixSyncScopeLabel: "Season scope: all show seasons (plus global season 0 roles).",
  onSyncCastMatrixRoles: vi.fn(),
  castSearchQuery: "",
  onSetCastSearchQuery: vi.fn(),
  castSortBy: "episodes",
  onSetCastSortBy: vi.fn(),
  castSortOrder: "desc",
  onSetCastSortOrder: vi.fn(),
  castHasImageFilter: "all",
  onSetCastHasImageFilter: vi.fn(),
  onClearCastFilters: vi.fn(),
  castExactEpisodeCount: null,
  onSetCastExactEpisodeCount: vi.fn(),
  castMinEpisodeCount: null,
  onSetCastMinEpisodeCount: vi.fn(),
  castMaxEpisodeCount: null,
  onSetCastMaxEpisodeCount: vi.fn(),
  availableCastSeasons: [6, 5],
  castSeasonFilters: [6],
  onToggleCastSeasonFilter: vi.fn(),
  castEpisodeScopeLabel: "Episode scope hint",
  shouldShowRoleCreditEmptyState: false,
  castUiTerminalReady: true,
  availableCastRoleAndCreditFilters: [
    { key: "role:housewife", label: "Housewife" },
    { key: "credit:main", label: "Main" },
  ],
  castRoleAndCreditFilters: ["role:housewife"],
  onToggleCastRoleAndCreditFilter: vi.fn(),
  castRoleMembersLoading: false,
  castLoadedOnce: true,
  castRenderProgressLabel: "Rendering 2 of 3 cast members",
  castRosterReady: true,
  castViewMode: "gallery",
  castGalleryColumns: 5,
  onSetCastViewMode: vi.fn(),
  onSetCastGalleryColumns: vi.fn(),
  castGalleryMembers: [
    { id: "cast-1", name: "Heather Gay" },
    { id: "cast-2", name: "Meredith Marks" },
    { id: "cast-3", name: "Lisa Barlow" },
  ],
  castCount: 3,
  archiveFootageCount: 1,
  visibleCastMembers: [
    { id: "cast-1", name: "Heather Gay" },
    { id: "cast-2", name: "Meredith Marks" },
  ],
  renderCastMember: (member) => <div>{member.name}</div>,
  crewDisplaySections: [
    {
      title: "Producers",
      groupedRows: [
        {
          personId: "crew-1",
          personName: "Casey Allan",
          roleLines: [{ creditId: "line-1", role: "producer", episodesLabel: "12 episodes", yearsLabel: null }],
        },
      ],
    },
  ],
  visibleCrewSections: [
    {
      title: "Producers",
      groupedRows: [
        {
          personId: "crew-1",
          personName: "Casey Allan",
          roleLines: [{ creditId: "line-1", role: "producer", episodesLabel: "12 episodes", yearsLabel: null }],
        },
      ],
    },
  ],
  archiveFootageCast: [
    {
      id: "archive-1",
      person_id: "person-archive-1",
      full_name: "Legacy Cast",
      cast_member_name: null,
      photo_url: "https://example.com/archive.jpg",
      cover_photo_url: null,
      thumbnail_focus_x: null,
      thumbnail_focus_y: null,
      thumbnail_zoom: null,
      thumbnail_crop_mode: "auto",
      archive_episode_count: 4,
    },
  ],
  getPersonOverviewHref: ({ personId }) => `/admin/trr-shows/show-1/people/${personId}/overview`,
  ...overrides,
});

describe("ShowCastTab", () => {
  it("preserves wrapper compatibility for child-only usage", () => {
    render(
      <ShowCastTab>
        <div>Child content</div>
      </ShowCastTab>
    );

    const tabpanel = screen.getByRole("tabpanel");
    expect(tabpanel).toHaveAttribute("id", "show-tabpanel-cast");
    expect(tabpanel).toHaveAttribute("aria-labelledby", "show-tab-cast");
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("renders the extracted cast tab UI and dispatches actions and filter callbacks", () => {
    const props = createProps();
    render(<ShowCastTab {...props} />);

    expect(screen.getByText("Credits")).toBeInTheDocument();
    expect(screen.getByText("2/3/4 cast · 1/2/3 crew · 3/5/7 visible")).toBeInTheDocument();
    expect(screen.getByText("1. Syncing Credits...")).toBeInTheDocument();
    expect(screen.getByText("IMDb credits in progress")).toBeInTheDocument();
    expect(screen.getByText("Rendering 2 of 3 cast members")).toBeInTheDocument();
    expect(screen.getByText("Heather Gay")).toBeInTheDocument();
    expect(screen.getByText("Meredith Marks")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Casey Allan" })).toHaveAttribute(
      "href",
      "/admin/trr-shows/show-1/people/crew-1/overview"
    );
    expect(screen.getByRole("link", { name: /Legacy Cast/i })).toHaveAttribute(
      "href",
      "/admin/trr-shows/show-1/people/person-archive-1/overview"
    );
    expect(screen.getByText("4 archive footage episodes")).toBeInTheDocument();
    expect(screen.getByText("Crew source:")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Enrich Media" }));
    fireEvent.click(screen.getByRole("button", { name: "Enrich Missing Cast Photos (2)" }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh Credits" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel Run" }));
    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    fireEvent.click(screen.getByRole("button", { name: "Retry failed only" }));
    fireEvent.click(screen.getByRole("button", { name: "Sync Cast Roles (Wiki/Fandom)" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear Filters" }));
    fireEvent.click(screen.getByRole("button", { name: "S6" }));
    fireEvent.click(screen.getByRole("button", { name: "Housewife" }));
    fireEvent.click(screen.getByRole("button", { name: "List View" }));
    fireEvent.click(screen.getByRole("button", { name: "5 per row" }));

    fireEvent.change(screen.getByLabelText("Search Name"), { target: { value: "Heather" } });
    fireEvent.change(screen.getByLabelText("Sort By"), { target: { value: "name" } });
    fireEvent.change(screen.getByLabelText("Order"), { target: { value: "asc" } });
    fireEvent.change(screen.getByLabelText("Has Image"), { target: { value: "yes" } });
    fireEvent.change(screen.getByLabelText("Episode Exact"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Episode Min"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Episode Max"), { target: { value: "9" } });

    expect(props.onEnrichCastMedia).toHaveBeenCalledTimes(1);
    expect(props.onEnrichMissingCastPhotos).toHaveBeenCalledTimes(1);
    expect(props.onRefreshShowCast).toHaveBeenCalledTimes(1);
    expect(props.onCancelShowCastWorkflow).toHaveBeenCalledTimes(1);
    expect(props.onToggleCastFailedMembersOpen).toHaveBeenCalledTimes(1);
    expect(props.onRetryFailedCastMediaEnrich).toHaveBeenCalledTimes(1);
    expect(props.onSyncCastMatrixRoles).toHaveBeenCalledTimes(1);
    expect(props.onClearCastFilters).toHaveBeenCalledTimes(1);
    expect(props.onToggleCastSeasonFilter).toHaveBeenCalledWith(6);
    expect(props.onToggleCastRoleAndCreditFilter).toHaveBeenCalledWith("role:housewife");
    expect(props.onSetCastViewMode).toHaveBeenCalledWith("list");
    expect(props.onSetCastGalleryColumns).toHaveBeenCalledWith(5);
    expect(props.onSetCastSearchQuery).toHaveBeenCalledWith("Heather");
    expect(props.onSetCastSortBy).toHaveBeenCalledWith("name");
    expect(props.onSetCastSortOrder).toHaveBeenCalledWith("asc");
    expect(props.onSetCastHasImageFilter).toHaveBeenCalledWith("yes");
    expect(props.onSetCastExactEpisodeCount).toHaveBeenCalledWith(4);
    expect(props.onSetCastMinEpisodeCount).toHaveBeenCalledWith(2);
    expect(props.onSetCastMaxEpisodeCount).toHaveBeenCalledWith(9);
  });

  it("renders loading, retry, unavailable-intelligence, and empty-state branches", () => {
    const props = createProps({
      castCreditsRefreshError: "Credits refresh failed",
      castLoadWarning: "Showing last successful cast snapshot.",
      castLoadError: "Cast endpoint failed",
      showCreditsError: "Crew fetch failed",
      showCreditsLoading: true,
      showCreditsLoadedOnce: false,
      castRoleMembersWarningWithSnapshotAge: "Showing last successful cast intelligence snapshot.",
      rolesWarningWithSnapshotAge: "Showing last successful roles snapshot.",
      showCastIntelligenceUnavailable: true,
      castRoleMembersError: "Cast intelligence timeout",
      rolesError: "Roles timeout",
      castRoleEditorDeepLinkWarning: "Role editor deep-link is waiting for cast intelligence.",
      castEligibilityWarning: "Links fallback is active.",
      castRoleMembersLoading: true,
      castLoading: true,
      castLoadedOnce: false,
      castGalleryMembers: [],
      visibleCastMembers: [],
      crewDisplaySections: [],
      visibleCrewSections: [],
      archiveFootageCast: [],
      archiveFootageCount: 0,
      castCount: 0,
      castRosterReady: false,
      castUiTerminalReady: false,
      shouldShowRoleCreditEmptyState: false,
    });
    const { rerender } = render(<ShowCastTab {...props} />);

    expect(screen.getByText("Credits refresh failed")).toHaveClass("text-red-600");
    expect(screen.getByText("Showing last successful cast snapshot.")).toBeInTheDocument();
    expect(screen.getByText("Cast endpoint failed")).toBeInTheDocument();
    expect(screen.getByText("Crew fetch failed")).toBeInTheDocument();
    expect(screen.getByText("Loading crew credits...")).toBeInTheDocument();
    expect(screen.getByText("Refreshing cast intelligence...")).toBeInTheDocument();
    expect(screen.getByText("Loading cast members...")).toBeInTheDocument();
    expect(screen.getByText("Cast intelligence unavailable; showing base cast snapshot.")).toBeInTheDocument();
    expect(screen.getByText("Cast intelligence timeout · Roles timeout")).toBeInTheDocument();
    expect(screen.getByText("Role editor deep-link is waiting for cast intelligence.")).toBeInTheDocument();
    expect(screen.getByText("Links fallback is active.")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Retry Cast" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Retry Crew" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Retry" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Retry Roles" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Retry Cast Intelligence" }));

    expect(props.onRetryCast).toHaveBeenCalledTimes(1);
    expect(props.onRetryCrew).toHaveBeenCalledTimes(1);
    expect(props.onRetryCastRoleMembers).toHaveBeenCalledTimes(2);
    expect(props.onRetryRoles).toHaveBeenCalledTimes(1);

    rerender(
      <ShowCastTab
        {...props}
        castCreditsRefreshError={null}
        castLoadWarning={null}
        castLoadError={null}
        showCreditsError={null}
        showCreditsLoading={false}
        showCreditsLoadedOnce={true}
        castRoleMembersWarningWithSnapshotAge={null}
        rolesWarningWithSnapshotAge={null}
        showCastIntelligenceUnavailable={false}
        castRoleMembersError={null}
        rolesError={null}
        castRoleMembersLoading={false}
        castLoading={false}
        castLoadedOnce={true}
        castRosterReady={true}
        castUiTerminalReady={true}
        shouldShowRoleCreditEmptyState={true}
      />
    );
    expect(screen.getByText("No cast members found for this show.")).toBeInTheDocument();
    expect(screen.getByText("No role or credit filters available.")).toBeInTheDocument();

    rerender(
      <ShowCastTab
        {...props}
        castCreditsRefreshError={null}
        castLoadWarning={null}
        castLoadError={null}
        showCreditsError={null}
        showCreditsLoading={false}
        showCreditsLoadedOnce={true}
        castRoleMembersWarningWithSnapshotAge={null}
        rolesWarningWithSnapshotAge={null}
        showCastIntelligenceUnavailable={false}
        castRoleMembersError={null}
        rolesError={null}
        castRoleMembersLoading={false}
        castLoading={false}
        castLoadedOnce={true}
        castRosterReady={true}
        castUiTerminalReady={true}
        shouldShowRoleCreditEmptyState={false}
        castCount={2}
      />
    );
    expect(screen.getByText("No cast members match the selected filters.")).toBeInTheDocument();
  });
});
