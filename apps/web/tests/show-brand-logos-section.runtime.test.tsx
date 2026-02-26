import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";
import { ShowBrandLogosSection } from "@/components/admin/show-tabs/ShowBrandLogosSection";

const buildLogoAsset = (
  id: string,
  origin: SeasonAsset["origin_table"],
  overrides?: Partial<SeasonAsset>
): SeasonAsset =>
  ({
    id,
    type: "show",
    origin_table: origin,
    source: "manual",
    kind: "logo",
    hosted_url: `https://cdn.example.com/${id}.png`,
    width: null,
    height: null,
    caption: null,
    logo_black_url: `https://cdn.example.com/${id}-black.png`,
    logo_white_url: `https://cdn.example.com/${id}-white.png`,
    media_asset_id: origin === "media_assets" ? `${id}-media` : null,
    logo_link_is_primary: null,
    ...overrides,
  }) as SeasonAsset;

describe("ShowBrandLogosSection", () => {
  it("renders color/black/white previews and featured badge", () => {
    const assets: SeasonAsset[] = [
      buildLogoAsset("logo-1", "media_assets", { logo_link_is_primary: true }),
      buildLogoAsset("logo-2", "show_images"),
    ];

    render(
      <ShowBrandLogosSection
        logoAssets={assets}
        featuredLogoAssetId="logo-1"
        featuredLogoSavingAssetId={null}
        selectedFeaturedLogoVariant="color"
        getAssetDisplayUrl={(asset) => asset.hosted_url}
        onOpenAssetLightbox={vi.fn()}
        onSelectFeaturedLogoVariant={vi.fn()}
        onSetFeaturedLogo={vi.fn()}
      />
    );

    expect(screen.getAllByText("Color").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Black").length).toBeGreaterThan(0);
    expect(screen.getAllByText("White").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Show logo color variant").length).toBeGreaterThan(0);
    expect(screen.getByText("Featured")).toBeInTheDocument();
  });

  it("fires set featured callback for eligible non-featured logos", () => {
    const assets: SeasonAsset[] = [buildLogoAsset("logo-2", "show_images")];
    const onSetFeaturedLogo = vi.fn();
    const onOpenAssetLightbox = vi.fn();
    const onSelectFeaturedLogoVariant = vi.fn();

    render(
      <ShowBrandLogosSection
        logoAssets={assets}
        featuredLogoAssetId={null}
        featuredLogoSavingAssetId={null}
        selectedFeaturedLogoVariant="color"
        getAssetDisplayUrl={(asset) => asset.hosted_url}
        onOpenAssetLightbox={onOpenAssetLightbox}
        onSelectFeaturedLogoVariant={onSelectFeaturedLogoVariant}
        onSetFeaturedLogo={onSetFeaturedLogo}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Set Featured Logo" }));
    expect(onSetFeaturedLogo).toHaveBeenCalledWith(assets[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /Color/i })[0]);
    expect(onOpenAssetLightbox).toHaveBeenCalledTimes(1);
    expect(onSelectFeaturedLogoVariant).not.toHaveBeenCalled();
  });

  it("uses variant clicks to update top logo when row is featured", () => {
    const assets: SeasonAsset[] = [buildLogoAsset("logo-1", "media_assets", { logo_link_is_primary: true })];
    const onSelectFeaturedLogoVariant = vi.fn();
    const onOpenAssetLightbox = vi.fn();

    render(
      <ShowBrandLogosSection
        logoAssets={assets}
        featuredLogoAssetId="logo-1"
        featuredLogoSavingAssetId={null}
        selectedFeaturedLogoVariant="color"
        getAssetDisplayUrl={(asset) => asset.hosted_url}
        onOpenAssetLightbox={onOpenAssetLightbox}
        onSelectFeaturedLogoVariant={onSelectFeaturedLogoVariant}
        onSetFeaturedLogo={vi.fn()}
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Black/i })[0]);
    expect(onSelectFeaturedLogoVariant).toHaveBeenCalledWith(assets[0], "black");
    expect(onOpenAssetLightbox).not.toHaveBeenCalled();
  });
});
