import { describe, expect, it } from "vitest";

import { resolveGalleryAssetCapabilities } from "@/lib/admin/gallery-asset-capabilities";

describe("gallery asset capabilities", () => {
  it("enables full tooling for media_assets with link context", () => {
    const capabilities = resolveGalleryAssetCapabilities({
      origin_table: "media_assets",
      link_id: "link-1",
      media_asset_id: "asset-1",
      person_id: null,
    });

    expect(capabilities.canEdit).toBe(true);
    expect(capabilities.canRecount).toBe(true);
    expect(capabilities.canTextId).toBe(true);
    expect(capabilities.canResize).toBe(true);
    expect(capabilities.canPersistCount).toBe(true);
    expect(capabilities.canPersistCrop).toBe(true);
    expect(capabilities.canArchive).toBe(true);
    expect(capabilities.canStar).toBe(true);
  });

  it("requires link_id to persist media-asset count/crop context", () => {
    const capabilities = resolveGalleryAssetCapabilities({
      origin_table: "media_assets",
      link_id: null,
      media_asset_id: "asset-1",
      person_id: null,
    });

    expect(capabilities.canPersistCount).toBe(false);
    expect(capabilities.canPersistCrop).toBe(false);
    expect(capabilities.reasons.persistCount).toContain("link_id");
    expect(capabilities.reasons.persistCrop).toContain("link_id");
  });

  it("requires person_id to persist cast-photo crop", () => {
    const capabilities = resolveGalleryAssetCapabilities({
      origin_table: "cast_photos",
      link_id: null,
      media_asset_id: null,
      person_id: null,
    });

    expect(capabilities.canPersistCount).toBe(true);
    expect(capabilities.canPersistCrop).toBe(false);
    expect(capabilities.reasons.persistCrop).toContain("person_id");
  });

  it("marks show/season/episode image origins as read-only tooling with archive/star support", () => {
    const capabilities = resolveGalleryAssetCapabilities({
      origin_table: "episode_images",
      link_id: null,
      media_asset_id: null,
      person_id: null,
    });

    expect(capabilities.canEdit).toBe(false);
    expect(capabilities.canRecount).toBe(false);
    expect(capabilities.canTextId).toBe(false);
    expect(capabilities.canResize).toBe(false);
    expect(capabilities.canPersistCount).toBe(false);
    expect(capabilities.canPersistCrop).toBe(false);
    expect(capabilities.canArchive).toBe(true);
    expect(capabilities.canStar).toBe(true);
    expect(capabilities.reasons.edit).toContain("Read-only origin");
  });
});

