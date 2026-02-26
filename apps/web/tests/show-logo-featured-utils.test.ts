import { describe, expect, it } from "vitest";

import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";
import {
  resolveFeaturedLogoPayload,
  resolveFeaturedShowLogoAssetId,
} from "@/lib/admin/show-logo-featured";

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
    logo_black_url: null,
    logo_white_url: null,
    logo_link_is_primary: null,
    ...overrides,
  }) as SeasonAsset;

describe("show-logo-featured utilities", () => {
  it("prefers media_links.is_primary logo over show primary_logo_image_id fallback", () => {
    const assets: SeasonAsset[] = [
      buildLogoAsset("show-image-logo", "show_images"),
      buildLogoAsset("media-logo", "media_assets", {
        media_asset_id: "media-logo-id",
        logo_link_is_primary: true,
      }),
    ];

    const featuredId = resolveFeaturedShowLogoAssetId(
      assets,
      "show-image-logo"
    );

    expect(featuredId).toBe("media-logo");
  });

  it("falls back to show primary_logo_image_id when no media primary exists", () => {
    const assets: SeasonAsset[] = [
      buildLogoAsset("show-image-logo", "show_images"),
      buildLogoAsset("media-logo", "media_assets", {
        media_asset_id: "media-logo-id",
        logo_link_is_primary: false,
      }),
    ];

    const featuredId = resolveFeaturedShowLogoAssetId(
      assets,
      "show-image-logo"
    );

    expect(featuredId).toBe("show-image-logo");
  });

  it("maps media_assets and show_images rows to featured-logo payloads", () => {
    const mediaAssetPayload = resolveFeaturedLogoPayload(
      buildLogoAsset("media-row", "media_assets", { media_asset_id: "asset-123" })
    );
    const showImagePayload = resolveFeaturedLogoPayload(
      buildLogoAsset("show-image-row", "show_images")
    );

    expect(mediaAssetPayload).toEqual({ media_asset_id: "asset-123" });
    expect(showImagePayload).toEqual({ show_image_id: "show-image-row" });
  });
});
