import { describe, expect, it } from "vitest";

import { resolveFeaturedShowLogoAssetId } from "@/lib/admin/show-logo-featured";
import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";

const buildLogoAsset = (
  id: string,
  origin: SeasonAsset["origin_table"],
  overrides?: Partial<SeasonAsset>,
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
    media_asset_id: origin === "media_assets" ? `${id}-media` : null,
    logo_link_is_primary: origin === "media_assets" ? false : null,
    ...overrides,
  }) as SeasonAsset;

describe("resolveFeaturedShowLogoAssetId", () => {
  it("prefers media_links.is_primary logo over show primary_logo_image_id fallback", () => {
    const featuredId = resolveFeaturedShowLogoAssetId(
      [
        buildLogoAsset("logo-show", "show_images"),
        buildLogoAsset("logo-media", "media_assets", { logo_link_is_primary: true }),
      ],
      "logo-show",
    );

    expect(featuredId).toBe("logo-media");
  });

  it("falls back to primary media link when no show_image logo is selected", () => {
    const featuredId = resolveFeaturedShowLogoAssetId(
      [buildLogoAsset("logo-media", "media_assets", { logo_link_is_primary: true })],
      null,
    );

    expect(featuredId).toBe("logo-media");
  });
});
