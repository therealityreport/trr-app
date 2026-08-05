import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ShowAssetsTab, {
  type ShowAssetsTabProps,
} from "@/components/admin/show-tabs/ShowAssetsTab";
import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";

vi.mock("@/components/admin/BravotvImageRunPanel", () => ({
  BravotvImageRunPanel: ({
    title,
    onCompleted,
  }: {
    title: string;
    onCompleted: () => void | Promise<void>;
  }) => (
    <div>
      <span>{title}</span>
      <button type="button" onClick={() => void onCompleted()}>
        Run image panel
      </button>
    </div>
  ),
}));

vi.mock("@/components/admin/show-tabs/ShowAssetsImageSections", () => ({
  ShowAssetsImageSections: ({
    onLoadMoreBackdrops,
  }: {
    onLoadMoreBackdrops: () => void;
  }) => (
    <button type="button" onClick={onLoadMoreBackdrops}>
      Load mocked backdrops
    </button>
  ),
}));

vi.mock("@/components/admin/show-tabs/ShowFeaturedMediaSelectors", () => ({
  ShowFeaturedMediaSelectors: ({
    onSetFeaturedPoster,
  }: {
    onSetFeaturedPoster: (id: string) => void;
  }) => (
    <button type="button" onClick={() => onSetFeaturedPoster("poster-2")}>
      Set mocked poster
    </button>
  ),
}));

vi.mock("@/components/admin/show-tabs/ShowBrandLogosSection", () => ({
  ShowBrandLogosSection: ({
    onSetFeaturedLogo,
    logoAssets,
  }: {
    onSetFeaturedLogo: (asset: SeasonAsset) => void;
    logoAssets: SeasonAsset[];
  }) => (
    <button type="button" onClick={() => onSetFeaturedLogo(logoAssets[0])}>
      Set mocked logo
    </button>
  ),
}));

vi.mock("@/components/admin/ShowBrandEditor", () => ({
  default: ({ trrShowName }: { trrShowName: string }) => (
    <div>{`Brand editor for ${trrShowName}`}</div>
  ),
}));

const createAsset = (id: string, personName?: string): SeasonAsset => ({
  id,
  type: "show",
  origin_table: "show_images",
  source: "bravotv",
  kind: "photo",
  hosted_url: `https://cdn.example.com/${id}.jpg`,
  width: 1200,
  height: 1800,
  caption: `${id} caption`,
  person_name: personName,
});

const profileAsset = createAsset("profile-1", "Jane Doe");
const promoAsset = createAsset("promo-1", "Alex Roe");
const logoAsset = createAsset("logo-1");

const createProps = (): ShowAssetsTabProps => ({
  assetsView: "images",
  showId: "show-1",
  showName: "Test Show",
  featuredPosterImageId: "poster-1",
  featuredBackdropImageId: "backdrop-1",
  images: {
    selectedSeason: "all",
    seasonOptions: [{ id: "season-2", season_number: 2 }],
    refreshCenterButtonLabel: "Open Refresh Center",
    autoAdvanceMode: "manual",
    hasActiveAdvancedFilters: true,
    activeAdvancedFilterCount: 2,
    refreshingGetImages: false,
    photosNotice: "Photos refreshed",
    photosError: null,
    getImagesNotice: "Images ready",
    getImagesError: null,
    getImagesProgress: { stage: "download", current: 1, total: 2 },
    batchJobsNotice: "Batch complete",
    batchJobsError: null,
    batchJobsRunning: true,
    batchJobsProgress: { stage: "batch", current: 3, total: 4 },
    truncatedWarning: "Showing the first page.",
    fallbackTelemetry: {
      fallbackRecoveredCount: 2,
      allCandidatesFailedCount: 1,
      totalImageAttempts: 5,
    },
    mirrorTelemetry: { mirroredCount: 4, totalCount: 5, mirroredRatio: 0.8 },
    sourceFailures: [
      {
        sourceId: "show",
        label: "Show assets",
        message: "Unavailable",
        status: 503,
        retryable: true,
      },
    ],
    loading: false,
    filteredAssetCount: 2,
    sections: {
      backdrops: [],
      banners: [],
      posters: [],
      profile_pictures: [profileAsset],
      hasMoreBySection: {
        backdrops: true,
        profile_pictures: true,
        cast_photos: true,
      },
    },
    castPromoAssets: [promoAsset],
    onRunCompleted: vi.fn(),
    onSelectSeason: vi.fn(),
    onOpenRefreshCenter: vi.fn(),
    onOpenFilters: vi.fn(),
    onToggleAutoAdvance: vi.fn(),
    onClearFilters: vi.fn(),
    onOpenBatchJobs: vi.fn(),
    onGetImages: vi.fn(),
    onOpenImport: vi.fn(),
    onLoadMoreBackdrops: vi.fn(),
    onLoadMoreBanners: vi.fn(),
    onLoadMorePosters: vi.fn(),
    onLoadMoreProfilePictures: vi.fn(),
    onLoadMoreCastPromos: vi.fn(),
    onOpenAssetLightbox: vi.fn(),
    formatSourceFailure: (failure) => `${failure.label}: ${failure.message}`,
  },
  videos: {
    error: null,
    loading: false,
    thumbnailSyncing: false,
    thumbnailSyncWarning: null,
    rows: [],
    getThumbnailUrl: () => null,
    formatPublishedDate: () => null,
  },
  branding: {
    posterAssets: [createAsset("poster-1")],
    backdropAssets: [createAsset("backdrop-1")],
    featuredPosterImageId: "poster-1",
    featuredBackdropImageId: "backdrop-1",
    logoAssets: [logoAsset],
    featuredLogoAssetId: "logo-1",
    featuredLogoSavingAssetId: null,
    featuredLogoVariant: "color",
    seasons: [{ id: "season-2", season_number: 2, name: "Season 2", title: null }],
    cast: [
      {
        person_id: "person-1",
        full_name: "Jane Doe",
        cast_member_name: "Jane Doe",
        role: "Self",
        credit_category: "Self",
        photo_url: null,
        cover_photo_url: null,
      },
    ],
    getAssetDisplayUrl: (asset) => asset.hosted_url,
    onSetFeaturedPoster: vi.fn(),
    onSetFeaturedBackdrop: vi.fn(),
    onSelectFeaturedLogoVariant: vi.fn(),
    onSetFeaturedLogo: vi.fn(),
  },
  renderProgress: ({ show, stage }) => (show ? <span>{`progress:${stage}`}</span> : null),
  renderAssetImage: ({ asset, useResolvedUrl }) => (
    <span>{`${useResolvedUrl ? "resolved" : "default"}:${asset.id}`}</span>
  ),
  renderVideoThumbnail: ({ src }) => <span>{`thumbnail:${src}`}</span>,
});

describe("ShowAssetsTab", () => {
  it("renders image diagnostics and dispatches route-owned image actions", () => {
    const props = createProps();
    render(<ShowAssetsTab {...props} />);

    const tabpanel = screen.getByRole("tabpanel");
    expect(tabpanel).toHaveAttribute("id", "show-tabpanel-assets");
    expect(tabpanel).toHaveAttribute("aria-labelledby", "show-tab-assets");
    expect(screen.getByLabelText("Filter by season:")).toHaveValue("all");
    expect(screen.getByText("BRAVOTV Get Images for Test Show")).toBeInTheDocument();
    expect(screen.getByText(/Fallback diagnostics: 2 recovered/)).toBeInTheDocument();
    expect(screen.getByText(/Mirrored URL usage: 4\/5 \(80%\)/)).toBeInTheDocument();
    expect(screen.getByText("default:profile-1")).toBeInTheDocument();
    expect(screen.getByText("resolved:promo-1")).toBeInTheDocument();
    expect(screen.getByText("progress:batch")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Open Refresh Center" }));
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    fireEvent.click(screen.getByRole("button", { name: "Auto-Load: Off" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear Filters (2)" }));
    fireEvent.click(screen.getByRole("button", { name: "Batch Jobs" }));
    fireEvent.click(screen.getByRole("button", { name: "Get Images" }));
    fireEvent.click(screen.getByRole("button", { name: "Import Images" }));
    fireEvent.click(screen.getByRole("button", { name: "Run image panel" }));
    fireEvent.click(screen.getByRole("button", { name: "Load mocked backdrops" }));
    fireEvent.click(screen.getByRole("button", { name: "Load More Profile Pictures" }));
    fireEvent.click(screen.getByRole("button", { name: "Load More Cast Promos" }));
    fireEvent.click(screen.getByRole("button", { name: /default:profile-1 Jane Doe/i }));

    expect(props.images.onSelectSeason).toHaveBeenCalledWith("2");
    expect(props.images.onOpenRefreshCenter).toHaveBeenCalledOnce();
    expect(props.images.onOpenFilters).toHaveBeenCalledOnce();
    expect(props.images.onToggleAutoAdvance).toHaveBeenCalledOnce();
    expect(props.images.onClearFilters).toHaveBeenCalledOnce();
    expect(props.images.onOpenBatchJobs).toHaveBeenCalledOnce();
    expect(props.images.onGetImages).toHaveBeenCalledOnce();
    expect(props.images.onOpenImport).toHaveBeenCalledOnce();
    expect(props.images.onRunCompleted).toHaveBeenCalledOnce();
    expect(props.images.onLoadMoreBackdrops).toHaveBeenCalledOnce();
    expect(props.images.onLoadMoreProfilePictures).toHaveBeenCalledOnce();
    expect(props.images.onLoadMoreCastPromos).toHaveBeenCalledOnce();
    expect(props.images.onOpenAssetLightbox).toHaveBeenCalledWith(
      profileAsset,
      0,
      [profileAsset],
      expect.any(HTMLButtonElement),
    );
  });

  it("preserves video loading, metadata, empty, and thumbnail behavior", () => {
    const props = createProps();
    const videoProps: ShowAssetsTabProps = {
      ...props,
      assetsView: "videos",
      videos: {
        ...props.videos,
        thumbnailSyncing: true,
        thumbnailSyncWarning: "Thumbnail fallback used.",
        rows: [
          {
            title: "First Look",
            runtime: "2:30",
            kicker: "Preview",
            clip_url: "https://example.com/video",
            season_number: 2,
            published_at: "2026-07-15",
          },
        ],
        getThumbnailUrl: () => "https://cdn.example.com/video.jpg",
        formatPublishedDate: () => "Jul 15, 2026",
      },
    };
    const { rerender } = render(<ShowAssetsTab {...videoProps} />);

    expect(screen.getByText("Syncing high-quality video thumbnails...")).toBeInTheDocument();
    expect(screen.getByText("Thumbnail fallback used.")).toBeInTheDocument();
    expect(screen.getByText("First Look")).toBeInTheDocument();
    expect(screen.getByText("2:30")).toBeInTheDocument();
    expect(screen.getByText("Season 2")).toBeInTheDocument();
    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(screen.getByText("Posted Jul 15, 2026")).toBeInTheDocument();
    expect(screen.getByText("thumbnail:https://cdn.example.com/video.jpg")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /First Look/ })).toHaveAttribute(
      "href",
      "https://example.com/video",
    );

    rerender(
      <ShowAssetsTab
        {...videoProps}
        videos={{ ...videoProps.videos, rows: [], thumbnailSyncing: false }}
      />,
    );
    expect(screen.getByText("No persisted Bravo videos found for this show.")).toBeInTheDocument();
  });

  it("renders branding and dispatches featured media changes", () => {
    const props = createProps();
    render(<ShowAssetsTab {...props} assetsView="branding" />);

    expect(screen.getByText("Featured Images")).toBeInTheDocument();
    expect(screen.getByText("Logos")).toBeInTheDocument();
    expect(screen.getByText("Brand editor for Test Show")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Set mocked poster" }));
    fireEvent.click(screen.getByRole("button", { name: "Set mocked logo" }));

    expect(props.branding.onSetFeaturedPoster).toHaveBeenCalledWith("poster-2");
    expect(props.branding.onSetFeaturedLogo).toHaveBeenCalledWith(logoAsset);
  });
});
