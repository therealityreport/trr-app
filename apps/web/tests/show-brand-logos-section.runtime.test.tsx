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
  it("renders summary card with featured logo variants and change button", () => {
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
        onSelectFeaturedLogoVariant={vi.fn()}
        onSetFeaturedLogo={vi.fn()}
      />
    );

    expect(screen.getByText("Featured")).toBeInTheDocument();
    expect(screen.getAllByText("Color").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Black").length).toBeGreaterThan(0);
    expect(screen.getAllByText("White").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Change Featured Logo/i })).toBeInTheDocument();
  });

  it("shows set button when no featured logo is selected", () => {
    const assets: SeasonAsset[] = [buildLogoAsset("logo-1", "show_images")];

    render(
      <ShowBrandLogosSection
        logoAssets={assets}
        featuredLogoAssetId={null}
        featuredLogoSavingAssetId={null}
        selectedFeaturedLogoVariant="color"
        getAssetDisplayUrl={(asset) => asset.hosted_url}
        onSelectFeaturedLogoVariant={vi.fn()}
        onSetFeaturedLogo={vi.fn()}
      />
    );

    expect(screen.getByText("Not Set")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Set Featured Logo/i })).toBeInTheDocument();
  });

  it("fires variant selection callback when clicking variant on featured logo", () => {
    const assets: SeasonAsset[] = [buildLogoAsset("logo-1", "media_assets", { logo_link_is_primary: true })];
    const onSelectVariant = vi.fn();

    render(
      <ShowBrandLogosSection
        logoAssets={assets}
        featuredLogoAssetId="logo-1"
        featuredLogoSavingAssetId={null}
        selectedFeaturedLogoVariant="color"
        getAssetDisplayUrl={(asset) => asset.hosted_url}
        onSelectFeaturedLogoVariant={onSelectVariant}
        onSetFeaturedLogo={vi.fn()}
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Black/i })[0]);
    expect(onSelectVariant).toHaveBeenCalledWith(assets[0], "black");
  });

  it("shows empty state when no logos exist", () => {
    render(
      <ShowBrandLogosSection
        logoAssets={[]}
        featuredLogoAssetId={null}
        featuredLogoSavingAssetId={null}
        selectedFeaturedLogoVariant="color"
        getAssetDisplayUrl={(asset) => asset.hosted_url}
        onSelectFeaturedLogoVariant={vi.fn()}
        onSetFeaturedLogo={vi.fn()}
      />
    );

    expect(screen.getByText("No show logos found.")).toBeInTheDocument();
  });
});
