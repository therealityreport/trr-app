import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import ShowSettingsTab, {
  type ShowSettingsTabProps,
} from "@/components/admin/show-tabs/ShowSettingsTab";

type TestRole = {
  id: string;
  name: string;
  is_active: boolean;
};

type TestLink = {
  id: string;
  url: string;
};

type TestSourceKind = "instagram" | "fandom" | "imdb";

type PresentationalProps = Exclude<
  ShowSettingsTabProps<TestRole, TestLink, TestSourceKind>,
  { children: ReactNode }
>;

const createProps = (overrides: Partial<PresentationalProps> = {}): PresentationalProps => ({
  header: {
    showLogoSyncing: false,
    refreshCenterButtonLabel: "Open Refresh Center",
    onSyncShowLogoTargets: vi.fn(),
    onOpenRefreshLog: vi.fn(),
  },
  status: {
    linksError: null,
    linksNotice: null,
    linksLoadTimedOut: false,
    rolesError: null,
    rolesWarning: null,
    rolesLoadTimedOut: false,
    showLogoSyncError: null,
    showLogoSyncNotice: null,
    onRetryLinks: vi.fn(),
    onRetryRoles: vi.fn(),
  },
  metadata: {
    form: {
      displayName: "Test Show",
      nickname: "Test Show",
      altNamesText: "TS",
      description: "A test show.",
      premiereDate: "2025-01-02",
      imdbId: "tt123",
      tmdbId: "456",
      tvdbId: "tvdb-7",
      wikidataId: "Q8",
      tvRageId: "rage-9",
      genresText: "Reality",
      networksText: "Bravo",
      streamingProvidersText: "Peacock",
      tagsText: "competition",
    },
    editing: true,
    saving: false,
    notice: null,
    error: null,
    onChangeField: vi.fn(),
    onStartEdit: vi.fn(),
    onCancelEdit: vi.fn(),
    onSave: vi.fn(),
  },
  roles: {
    newRoleName: "Friend",
    loading: false,
    rows: [{ id: "role-1", name: "Housewife", is_active: true }],
    onNewRoleNameChange: vi.fn(),
    onCreate: vi.fn(),
    onRename: vi.fn(),
    onToggleActive: vi.fn(),
  },
  links: {
    showIsBravo: true,
    refreshing: false,
    bulkInput: "https://example.com/new",
    bulkSaving: false,
    loading: false,
    totalCount: 4,
    eligibleCastLoading: false,
    eligibleCastLoadedOnce: true,
    savingLinkIds: {},
    socialLinks: [
      {
        id: "social-1",
        sourceKind: "instagram",
        sourceLabel: "Instagram",
        text: "@testshow",
        url: "https://instagram.com/testshow",
        link: { id: "social-link-1", url: "https://instagram.com/testshow" },
      },
    ],
    showPageLinks: [{ id: "page-1", url: "https://example.com/show" }],
    seasonUrlCoverageRows: [
      {
        seasonNumber: 2,
        links: [
          {
            id: "season-link-1",
            url: "https://example.com/season-2",
            sourceKind: "fandom",
            sourceLabel: "Fandom",
            iconUrl: null,
            linkTitle: "Season Two",
          },
        ],
      },
    ],
    castMemberLinkCoverageCards: [
      {
        personId: "person-1",
        personName: "Jane Doe",
        avatarUrl: null,
        seasons: [2],
        approvedLinkCount: 1,
        approvedLinks: [
          {
            id: "person-link-1",
            sourceKind: "imdb",
            sourceLabel: "IMDb",
            text: "Jane Doe",
            label: "IMDb",
            url: "https://imdb.com/name/nm1",
            iconUrl: null,
            link: { id: "person-link-1", url: "https://imdb.com/name/nm1" },
          },
        ],
        missingSources: [
          {
            key: "fandom",
            label: "Fandom",
            state: "missing",
            url: null,
            link: null,
          },
        ],
      },
    ],
    onRefresh: vi.fn(),
    onBulkInputChange: vi.fn(),
    onAdd: vi.fn(),
    onUpdateUrl: vi.fn(async () => undefined),
    onDelete: vi.fn(),
  },
  reddit: {
    loading: false,
    error: null,
    groups: [
      {
        key: "SHOW",
        label: "SHOW",
        communities: [
          {
            id: "reddit-1",
            subreddit: "TestShow",
            displayName: "Test Show Community",
            assignedFlairs: ["Episode Discussion"],
            postFlairs: ["News"],
          },
        ],
      },
    ],
    getCommunityHref: (community) => `/admin/social/reddit/${community.subreddit}`,
  },
  getShowPageLinkTitle: () => "Official show page",
  renderShowPageLinkBadge: (link) => <span>{`page-badge:${link.id}`}</span>,
  renderSourceBadge: ({ kind }) => <span>{`badge:${kind}`}</span>,
  usesBrandIconOnly: () => true,
  ...overrides,
});

describe("ShowSettingsTab", () => {
  it("preserves child-wrapper tabpanel compatibility", () => {
    render(
      <ShowSettingsTab>
        <div>Child content</div>
      </ShowSettingsTab>
    );

    const tabpanel = screen.getByRole("tabpanel");
    expect(tabpanel).toHaveAttribute("id", "show-tabpanel-settings");
    expect(tabpanel).toHaveAttribute("aria-labelledby", "show-tab-settings");
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("renders settings data and dispatches metadata, role, link, and header actions", () => {
    const props = createProps();
    render(<ShowSettingsTab {...props} />);

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getAllByDisplayValue("Test Show")[0]).not.toBeDisabled();
    expect(screen.getByText("test-show")).toBeInTheDocument();
    expect(screen.getByText("Housewife")).toBeInTheDocument();
    expect(screen.getByText("@testshow")).toBeInTheDocument();
    expect(screen.getByText("Official show page")).toBeInTheDocument();
    expect(screen.getByText("Season 2")).toBeInTheDocument();
    expect(screen.getAllByText("Jane Doe")).toHaveLength(2);
    expect(screen.getByText("Test Show Community")).toBeInTheDocument();
    expect(screen.getByText("Cast Member Pages")).toBeInTheDocument();
    expect(screen.getByText(/BravoTV, Fandom/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sync Show Logo Targets" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Refresh Center" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.change(screen.getByDisplayValue("A test show."), {
      target: { value: "Updated description" },
    });
    fireEvent.change(screen.getByPlaceholderText("Housewife"), {
      target: { value: "Guest" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Role" }));
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh Links" }));
    fireEvent.change(screen.getByPlaceholderText(/thetraitors\.fandom\.com/), {
      target: { value: "https://example.com/updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Link(s)" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);

    expect(props.header.onSyncShowLogoTargets).toHaveBeenCalledTimes(1);
    expect(props.header.onOpenRefreshLog).toHaveBeenCalledTimes(1);
    expect(props.metadata.onCancelEdit).toHaveBeenCalledTimes(1);
    expect(props.metadata.onSave).toHaveBeenCalledTimes(1);
    expect(props.metadata.onChangeField).toHaveBeenCalledWith("description", "Updated description");
    expect(props.roles.onNewRoleNameChange).toHaveBeenCalledWith("Guest");
    expect(props.roles.onCreate).toHaveBeenCalledTimes(1);
    expect(props.roles.onRename).toHaveBeenCalledWith(props.roles.rows[0]);
    expect(props.roles.onToggleActive).toHaveBeenCalledWith(props.roles.rows[0]);
    expect(props.links.onRefresh).toHaveBeenCalledTimes(1);
    expect(props.links.onBulkInputChange).toHaveBeenCalledWith("https://example.com/updated");
    expect(props.links.onAdd).toHaveBeenCalledTimes(1);
    expect(props.links.onDelete).toHaveBeenCalledWith("social-link-1");
    expect(screen.getByRole("link", { name: "Open Community" })).toHaveAttribute(
      "href",
      "/admin/social/reddit/TestShow"
    );
  });

  it("preserves timeout retries and loading, error, and empty branches", () => {
    const props = createProps({
      status: {
        ...createProps().status,
        linksError: "Links timed out",
        linksLoadTimedOut: true,
        rolesError: "Roles timed out",
        rolesLoadTimedOut: true,
      },
      metadata: {
        ...createProps().metadata,
        editing: false,
        error: "Metadata save failed",
      },
      roles: {
        ...createProps().roles,
        rows: [],
      },
      links: {
        ...createProps().links,
        loading: true,
        totalCount: 0,
        socialLinks: [],
        showPageLinks: [],
        seasonUrlCoverageRows: [],
        castMemberLinkCoverageCards: [],
      },
      reddit: {
        ...createProps().reddit,
        loading: true,
        groups: [],
      },
    });
    const { rerender } = render(<ShowSettingsTab {...props} />);

    expect(screen.getByText("Links timed out")).toHaveClass("text-amber-700");
    expect(screen.getByText("Metadata save failed")).toHaveClass("text-red-600");
    expect(screen.getByText("No roles configured yet.")).toBeInTheDocument();
    expect(screen.getByText("Loading links...")).toBeInTheDocument();
    expect(screen.getByText("Loading Reddit communities...")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry links" }));
    fireEvent.click(screen.getByRole("button", { name: "Retry roles" }));
    expect(props.status.onRetryLinks).toHaveBeenCalledTimes(1);
    expect(props.status.onRetryRoles).toHaveBeenCalledTimes(1);

    rerender(
      <ShowSettingsTab
        {...props}
        status={{ ...props.status, linksError: null, rolesError: null }}
        links={{ ...props.links, loading: false }}
        reddit={{ ...props.reddit, loading: false, error: "Reddit unavailable" }}
      />
    );

    expect(screen.getByText("No links yet. Run discovery to populate this list.")).toBeInTheDocument();
    expect(screen.getByText("Reddit unavailable")).toHaveClass("text-red-600");

    rerender(
      <ShowSettingsTab
        {...props}
        status={{ ...props.status, linksError: null, rolesError: null }}
        links={{ ...props.links, loading: false }}
        reddit={{ ...props.reddit, loading: false, error: null }}
      />
    );
    expect(
      screen.getByText("No relevant Reddit communities configured for this show.")
    ).toBeInTheDocument();
  });
});
