import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";

export type FeaturedLogoPayload =
  | { media_asset_id: string }
  | { show_image_id: string };

export const resolveFeaturedLogoPayload = (
  asset: SeasonAsset
): FeaturedLogoPayload | null => {
  const normalizedKind = String(asset.kind ?? "").trim().toLowerCase();
  if (normalizedKind !== "logo") return null;

  if (asset.origin_table === "media_assets") {
    const mediaAssetId = (asset.media_asset_id ?? asset.id ?? "").trim();
    if (!mediaAssetId) return null;
    return { media_asset_id: mediaAssetId };
  }

  if (asset.origin_table === "show_images") {
    const showImageId = (asset.id ?? "").trim();
    if (!showImageId) return null;
    return { show_image_id: showImageId };
  }

  return null;
};

export const resolveFeaturedShowLogoAssetId = (
  logoAssets: SeasonAsset[],
  primaryLogoImageId: string | null | undefined
): string | null => {
  for (const asset of logoAssets) {
    if (asset.origin_table !== "media_assets") continue;
    if ((asset.kind ?? "").trim().toLowerCase() !== "logo") continue;
    if (asset.logo_link_is_primary) return asset.id;
  }

  if (!primaryLogoImageId) return null;
  const normalizedPrimaryLogoImageId = primaryLogoImageId.trim();
  if (!normalizedPrimaryLogoImageId) return null;

  for (const asset of logoAssets) {
    if (asset.origin_table !== "show_images") continue;
    if ((asset.kind ?? "").trim().toLowerCase() !== "logo") continue;
    if (asset.id === normalizedPrimaryLogoImageId) return asset.id;
  }
  return null;
};
