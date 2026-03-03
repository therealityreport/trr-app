import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";
import { ShowFeaturedMediaSelectors } from "@/components/admin/show-tabs/ShowFeaturedMediaSelectors";

const buildShowImage = (
  id: string,
  kind: "poster" | "backdrop",
  overrides?: Partial<SeasonAsset>
): SeasonAsset =>
  ({
    id,
    type: "show",
    origin_table: "show_images",
    source: "manual",
    kind,
    hosted_url: `https://cdn.example.com/${id}.png`,
    width: null,
    height: null,
    caption: null,
    ...overrides,
  }) as SeasonAsset;

describe("ShowFeaturedMediaSelectors", () => {
  it("renders browse buttons for poster and backdrop", () => {
    const poster = buildShowImage("poster-1", "poster");
    const backdrop = buildShowImage("backdrop-1", "backdrop");

    render(
      <ShowFeaturedMediaSelectors
        posterAssets={[poster]}
        backdropAssets={[backdrop]}
        featuredPosterImageId={null}
        featuredBackdropImageId={null}
        getAssetDisplayUrl={(asset) => asset.hosted_url}
        onSetFeaturedPoster={vi.fn()}
        onSetFeaturedBackdrop={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /Select Featured Poster/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Select Featured Backdrop/i })).toBeInTheDocument();
  });

  it("shows change label when a featured image is already set", () => {
    const poster = buildShowImage("poster-1", "poster");
    const backdrop = buildShowImage("backdrop-1", "backdrop");

    render(
      <ShowFeaturedMediaSelectors
        posterAssets={[poster]}
        backdropAssets={[backdrop]}
        featuredPosterImageId="poster-1"
        featuredBackdropImageId="backdrop-1"
        getAssetDisplayUrl={(asset) => asset.hosted_url}
        onSetFeaturedPoster={vi.fn()}
        onSetFeaturedBackdrop={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /Change Featured Poster/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Change Featured Backdrop/i })).toBeInTheDocument();
  });

  it("shows featured badges when images are selected", () => {
    const poster = buildShowImage("poster-1", "poster");

    render(
      <ShowFeaturedMediaSelectors
        posterAssets={[poster]}
        backdropAssets={[]}
        featuredPosterImageId="poster-1"
        featuredBackdropImageId={null}
        getAssetDisplayUrl={(asset) => asset.hosted_url}
        onSetFeaturedPoster={vi.fn()}
        onSetFeaturedBackdrop={vi.fn()}
      />
    );

    expect(screen.getByText("Featured")).toBeInTheDocument();
    expect(screen.getByText("Not Set")).toBeInTheDocument();
  });

  it("disables button when no assets are available", () => {
    render(
      <ShowFeaturedMediaSelectors
        posterAssets={[]}
        backdropAssets={[]}
        featuredPosterImageId={null}
        featuredBackdropImageId={null}
        getAssetDisplayUrl={(asset) => asset.hosted_url}
        onSetFeaturedPoster={vi.fn()}
        onSetFeaturedBackdrop={vi.fn()}
      />
    );

    const buttons = screen.getAllByRole("button", { name: /No images available/i });
    expect(buttons).toHaveLength(2);
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });
});
