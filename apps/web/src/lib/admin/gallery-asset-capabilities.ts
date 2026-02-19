import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";

export interface GalleryAssetCapabilities {
  canEdit: boolean;
  canRecount: boolean;
  canTextId: boolean;
  canResize: boolean;
  canPersistCount: boolean;
  canPersistCrop: boolean;
  canArchive: boolean;
  canStar: boolean;
  reasons: Partial<
    Record<
      | "edit"
      | "recount"
      | "textId"
      | "resize"
      | "persistCount"
      | "persistCrop"
      | "archive"
      | "star",
      string
    >
  >;
}

const READ_ONLY_REASON = "Read-only origin: processing tools are only available for media assets or cast photos.";
const LINK_CONTEXT_REASON = "Missing media link context (link_id) for this asset.";
const PERSON_REASON = "Missing person_id for this cast photo.";

export function resolveGalleryAssetCapabilities(
  asset: Pick<SeasonAsset, "origin_table" | "link_id" | "media_asset_id" | "person_id">
): GalleryAssetCapabilities {
  const origin = asset.origin_table ?? null;

  if (origin === "media_assets") {
    const hasLinkId = Boolean(asset.link_id);
    return {
      canEdit: true,
      canRecount: true,
      canTextId: true,
      canResize: true,
      canPersistCount: hasLinkId,
      canPersistCrop: hasLinkId,
      canArchive: true,
      canStar: true,
      reasons: {
        ...(hasLinkId ? {} : { persistCount: LINK_CONTEXT_REASON, persistCrop: LINK_CONTEXT_REASON }),
      },
    };
  }

  if (origin === "cast_photos") {
    const hasPersonId = Boolean(asset.person_id);
    return {
      canEdit: true,
      canRecount: true,
      canTextId: true,
      canResize: true,
      canPersistCount: true,
      canPersistCrop: hasPersonId,
      canArchive: true,
      canStar: true,
      reasons: {
        ...(hasPersonId ? {} : { persistCrop: PERSON_REASON }),
      },
    };
  }

  return {
    canEdit: false,
    canRecount: false,
    canTextId: false,
    canResize: false,
    canPersistCount: false,
    canPersistCrop: false,
    canArchive: true,
    canStar: true,
    reasons: {
      edit: READ_ONLY_REASON,
      recount: READ_ONLY_REASON,
      textId: READ_ONLY_REASON,
      resize: READ_ONLY_REASON,
      persistCount: READ_ONLY_REASON,
      persistCrop: READ_ONLY_REASON,
    },
  };
}

