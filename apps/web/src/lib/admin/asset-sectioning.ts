import { mapSeasonAssetToMetadata } from "@/lib/photo-metadata";
import { normalizeContentTypeToken, type CanonicalContentType } from "@/lib/media/content-type";
import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";

export type AssetSectionKey =
  | "profile_pictures"
  | "cast_photos"
  | "confessionals"
  | "reunion"
  | "intro_card"
  | "episode_stills"
  | "posters"
  | "backdrops"
  | "other";

export const ASSET_SECTION_ORDER: AssetSectionKey[] = [
  "profile_pictures",
  "cast_photos",
  "confessionals",
  "reunion",
  "intro_card",
  "episode_stills",
  "posters",
  "backdrops",
  "other",
];

export const ASSET_SECTION_LABELS: Record<AssetSectionKey, string> = {
  profile_pictures: "Profile Pictures",
  cast_photos: "Cast Photos",
  confessionals: "Confessionals",
  reunion: "Reunion",
  intro_card: "Intro Card",
  episode_stills: "Episode Stills",
  posters: "Posters",
  backdrops: "Backdrops",
  other: "Other",
};

export const ASSET_SECTION_TO_BATCH_CONTENT_TYPE: Record<AssetSectionKey, string> = {
  profile_pictures: "profile_pictures",
  cast_photos: "cast_photos",
  confessionals: "confessionals",
  reunion: "reunion",
  intro_card: "intro_card",
  episode_stills: "episode_stills",
  posters: "posters",
  backdrops: "backdrops",
  other: "other",
};

const normalizeToken = (value: string | null | undefined): string =>
  (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const isOfficialSeasonAnnouncementAsset = (
  asset: SeasonAsset,
  metadata: Record<string, unknown>
): boolean => {
  const tokens = [
    asset.context_section,
    asset.context_type,
    typeof metadata.context_section === "string" ? metadata.context_section : null,
    typeof metadata.context_type === "string" ? metadata.context_type : null,
    typeof metadata.fandom_section_tag === "string" ? metadata.fandom_section_tag : null,
    typeof metadata.fandom_section_label === "string" ? metadata.fandom_section_label : null,
  ]
    .map((value) => normalizeToken(value))
    .filter(Boolean)
    .join(" ");
  return tokens.includes("official season announcement");
};

const isProfilePictureAsset = (asset: SeasonAsset, metadata: Record<string, unknown>): boolean => {
  const contextType = normalizeToken(asset.context_type);
  const contextSection = normalizeToken(asset.context_section);
  const metadataContextType = normalizeToken(
    typeof metadata.context_type === "string" ? metadata.context_type : null
  );
  const metadataContextSection = normalizeToken(
    typeof metadata.context_section === "string" ? metadata.context_section : null
  );
  return (
    contextType === "profile picture" ||
    contextType === "profile" ||
    contextSection === "bravo profile" ||
    metadataContextType === "profile picture" ||
    metadataContextType === "profile" ||
    metadataContextSection === "bravo profile"
  );
};

const hasExplicitProfilePictureContentType = (metadata: Record<string, unknown>): boolean => {
  const explicitContentType =
    typeof metadata.content_type === "string"
      ? metadata.content_type
      : typeof metadata.contentType === "string"
        ? metadata.contentType
        : null;
  if (!explicitContentType) return false;
  return normalizeContentTypeToken(explicitContentType, "OTHER") === "PROFILE PICTURE";
};

const mapContentTypeToSection = (
  contentType: CanonicalContentType,
  { isOfficialSeasonAnnouncement }: { isOfficialSeasonAnnouncement: boolean }
): AssetSectionKey | null => {
  switch (contentType) {
    case "PROFILE PICTURE":
      return "profile_pictures";
    case "CAST PHOTOS":
      return isOfficialSeasonAnnouncement ? "cast_photos" : "other";
    case "CONFESSIONAL":
      return "confessionals";
    case "REUNION":
      return "reunion";
    case "INTRO":
      return "intro_card";
    case "EPISODE STILL":
      return "episode_stills";
    case "POSTER":
      return "posters";
    case "BACKDROP":
      return "backdrops";
    case "PROMO":
      return isOfficialSeasonAnnouncement ? "cast_photos" : "other";
    case "LOGO":
      return null;
    default:
      return "other";
  }
};

export function classifySeasonAssetSection(
  asset: SeasonAsset,
  options?: { seasonNumber?: number; showName?: string }
): AssetSectionKey | null {
  const metadata = (asset.metadata ?? {}) as Record<string, unknown>;
  const kind = normalizeToken(asset.kind);
  const hasProfileSignal =
    isProfilePictureAsset(asset, metadata) ||
    hasExplicitProfilePictureContentType(metadata) ||
    kind === "profile" ||
    kind === "profile picture" ||
    kind === "profile_picture";
  const mapped = mapSeasonAssetToMetadata(asset, options?.seasonNumber, options?.showName);
  const contentType = normalizeContentTypeToken(mapped.contentType ?? mapped.sectionTag ?? null, "OTHER");
  const isOfficialSeasonAnnouncement = isOfficialSeasonAnnouncementAsset(asset, metadata);
  const byContentType = mapContentTypeToSection(contentType, { isOfficialSeasonAnnouncement });
  const isCastPromoKind =
    kind === "cast" || kind === "promo" || kind === "profile" || kind === "profile picture" || kind === "profile_picture";
  if (isOfficialSeasonAnnouncement && isCastPromoKind) {
    return "cast_photos";
  }
  if (byContentType === "profile_pictures" && isOfficialSeasonAnnouncement && isCastPromoKind) {
    return "cast_photos";
  }
  if (byContentType === "profile_pictures") {
    // Prevent false positives from loose text inference (e.g., caption text containing "profile").
    return hasProfileSignal ? "profile_pictures" : "other";
  }
  if (byContentType !== "other") return byContentType;
  if (byContentType === "other" && contentType !== "OTHER") return byContentType;

  // OSA cast promos are frequently stored with "profile" kinds in upstream sources.
  if (
    isOfficialSeasonAnnouncement &&
    isCastPromoKind
  ) {
    return "cast_photos";
  }

  if (hasProfileSignal) return "profile_pictures";
  if (asset.type === "episode") return "episode_stills";

  if (kind === "backdrop") return "backdrops";
  if (kind === "poster") return "posters";
  if (kind === "confessional") return "confessionals";
  if (kind === "reunion") return "reunion";
  if (kind === "intro") return "intro_card";
  if (kind === "episode still" || kind === "episode_still" || kind === "still") return "episode_stills";
  if (kind === "cast" || kind === "promo") {
    return isOfficialSeasonAnnouncement ? "cast_photos" : "other";
  }
  if (kind === "logo") return null;
  return "other";
}

export function groupSeasonAssetsBySection(
  assets: SeasonAsset[],
  options?: { seasonNumber?: number; showName?: string; includeOther?: boolean }
): Record<AssetSectionKey, SeasonAsset[]> {
  const grouped: Record<AssetSectionKey, SeasonAsset[]> = {
    profile_pictures: [],
    cast_photos: [],
    confessionals: [],
    reunion: [],
    intro_card: [],
    episode_stills: [],
    posters: [],
    backdrops: [],
    other: [],
  };

  for (const asset of assets) {
    const section = classifySeasonAssetSection(asset, options);
    if (!section) continue;
    if (section === "other" && options?.includeOther === false) continue;
    grouped[section].push(asset);
  }

  return grouped;
}
