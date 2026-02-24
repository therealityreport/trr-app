import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";

import { ShowAssetsImageSections } from "@/components/admin/show-tabs/ShowAssetsImageSections";
import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";

const buildAsset = (id: string, kind: "poster" | "backdrop"): SeasonAsset =>
  ({
    id,
    kind,
    origin_table: "show_images",
    type: "show",
    hosted_url: `https://cdn.example.com/${id}.jpg`,
    source: "manual",
    season_number: null,
    metadata: null,
    person_name: null,
    media_asset_id: null,
    caption: null,
    created_at: null,
    updated_at: null,
    width: null,
    height: null,
    people_count: null,
    people_count_source: null,
    content_type: null,
    context_type: null,
    context_section: null,
    source_page_url: null,
    source_logo_url: null,
    source_variant: null,
    original_url: null,
    url_512: null,
    url_256: null,
    thumbnail_focus_x: null,
    thumbnail_focus_y: null,
    thumbnail_zoom: null,
    thumbnail_crop_mode: null,
  }) as SeasonAsset;

describe("ShowAssetsImageSections runtime", () => {
  it("shows featured badges and fires lightbox callbacks", () => {
    const backdrop = buildAsset("backdrop-1", "backdrop");
    const poster = buildAsset("poster-1", "poster");
    const onOpenAssetLightbox = vi.fn();

    render(
      <ShowAssetsImageSections
        backdrops={[backdrop]}
        posters={[poster]}
        featuredBackdropImageId="backdrop-1"
        featuredPosterImageId="poster-1"
        onOpenAssetLightbox={onOpenAssetLightbox}
        renderGalleryImage={({ asset }): ReactNode => <span>{asset.id}</span>}
      />
    );

    expect(screen.getAllByText("Featured").length).toBe(2);

    const backdropsSection = screen.getByRole("heading", { name: "Backdrops" }).closest("section");
    expect(backdropsSection).not.toBeNull();
    fireEvent.click(within(backdropsSection as HTMLElement).getByRole("button"));
    expect(onOpenAssetLightbox).toHaveBeenCalledWith(
      backdrop,
      0,
      [backdrop],
      expect.any(HTMLButtonElement)
    );
  });

  it("renders section-specific load-more actions when section has more rows", () => {
    render(
      <ShowAssetsImageSections
        backdrops={[buildAsset("backdrop-1", "backdrop")]}
        posters={[buildAsset("poster-1", "poster")]}
        hasMoreBackdrops
        hasMorePosters
        onLoadMoreBackdrops={vi.fn()}
        onLoadMorePosters={vi.fn()}
        onOpenAssetLightbox={vi.fn()}
        renderGalleryImage={({ asset }): ReactNode => <span>{asset.id}</span>}
      />
    );

    expect(screen.getByRole("button", { name: "Load More Backdrops" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load More Posters" })).toBeInTheDocument();
  });

  it("renders auto-advance sentinels when auto mode is enabled", () => {
    render(
      <ShowAssetsImageSections
        backdrops={[buildAsset("backdrop-1", "backdrop")]}
        posters={[buildAsset("poster-1", "poster")]}
        hasMoreBackdrops
        hasMorePosters
        autoAdvanceMode="auto"
        onLoadMoreBackdrops={vi.fn()}
        onLoadMorePosters={vi.fn()}
        onOpenAssetLightbox={vi.fn()}
        renderGalleryImage={({ asset }): ReactNode => <span>{asset.id}</span>}
      />
    );

    expect(document.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });
});
