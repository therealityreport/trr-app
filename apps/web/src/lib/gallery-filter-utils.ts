import { mapPhotoToMetadata, mapSeasonAssetToMetadata } from "@/lib/photo-metadata";
import type { TrrPersonPhoto, SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";
import type { ContentTypeFilter } from "@/lib/admin/advanced-filters";

export function normalizeBool(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const raw = value.trim().toLowerCase();
    if (raw === "true" || raw === "1" || raw === "yes") return true;
    if (raw === "false" || raw === "0" || raw === "no") return false;
  }
  return null;
}

export function inferHasTextOverlay(metadata: Record<string, unknown> | null | undefined): boolean | null {
  if (!metadata) return null;
  const direct = normalizeBool((metadata as Record<string, unknown>).has_text_overlay);
  if (direct !== null) return direct;
  return normalizeBool((metadata as Record<string, unknown>).hasTextOverlay);
}

export function inferPeopleCountFromMetadata(metadata: Record<string, unknown> | null | undefined): number | null {
  if (!metadata) return null;
  const raw = (metadata as Record<string, unknown>).people_count;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, Math.floor(raw));
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
  }
  const names = (metadata as Record<string, unknown>).people_names;
  if (Array.isArray(names)) return names.length;
  const ids = (metadata as Record<string, unknown>).people_ids;
  if (Array.isArray(ids)) return ids.length;
  return null;
}

export function inferPeopleCountForPersonPhoto(photo: TrrPersonPhoto): number | null {
  const raw = photo.people_count as unknown;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, Math.floor(raw));
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  if (Array.isArray(photo.people_names) && photo.people_names.length > 0) return photo.people_names.length;
  return inferPeopleCountFromMetadata(photo.metadata ?? null);
}

function matchesWwhl(text: string): boolean {
  return text.toLowerCase().includes("wwhl");
}

function isProfilePictureContext(
  contextType: string | null | undefined,
  contextSection: string | null | undefined
): boolean {
  const normalizedType = (contextType ?? "").toLowerCase().trim();
  const normalizedSection = (contextSection ?? "").toLowerCase().trim();
  return (
    normalizedType === "profile_picture" ||
    normalizedType === "profile" ||
    normalizedSection === "bravo_profile"
  );
}

export function matchesContentTypesForPersonPhoto(
  photo: TrrPersonPhoto,
  contentTypes: ContentTypeFilter[]
): boolean {
  if (contentTypes.length === 0) return true;
  const meta = mapPhotoToMetadata(photo);
  const sectionTag = (meta.sectionTag ?? "").toLowerCase();
  const label = (meta.sectionLabel ?? "").toLowerCase();
  const caption = (meta.caption ?? "").toLowerCase();
  const text = `${sectionTag} ${label} ${caption}`;

  return contentTypes.some((ct) => {
    switch (ct) {
      case "confessional":
        return sectionTag.includes("confessional");
      case "reunion":
        return sectionTag.includes("reunion");
      case "promo":
        return sectionTag.includes("promo");
      case "profile_picture":
        return isProfilePictureContext(photo.context_type, photo.context_section);
      case "episode_still":
        return sectionTag.includes("episode still") || sectionTag.includes("episode");
      case "intro":
        return sectionTag === "intro" || sectionTag.includes("intro");
      case "wwhl":
        return matchesWwhl(text);
      case "other":
        return sectionTag.includes("other") || sectionTag === "";
    }
  });
}

export function matchesContentTypesForSeasonAsset(
  asset: SeasonAsset,
  contentTypes: ContentTypeFilter[],
  seasonNumber?: number,
  showName?: string
): boolean {
  if (contentTypes.length === 0) return true;
  const meta = mapSeasonAssetToMetadata(asset, seasonNumber, showName);
  const sectionTag = (meta.sectionTag ?? "").toLowerCase();
  const label = (meta.sectionLabel ?? "").toLowerCase();
  const caption = (meta.caption ?? "").toLowerCase();
  const text = `${sectionTag} ${label} ${caption}`;
  const kind = (asset.kind ?? "").toLowerCase().trim();

  return contentTypes.some((ct) => {
    // Fallback: for assets imported via admin scraping, "kind" is often the most reliable signal.
    if (ct === "promo" && kind === "promo") return true;
    if (ct === "intro" && kind === "intro") return true;
    if (ct === "reunion" && kind === "reunion") return true;
    if (ct === "episode_still" && (kind === "episode_still" || kind === "episode still")) return true;

    switch (ct) {
      case "confessional":
        return sectionTag.includes("confessional");
      case "reunion":
        return sectionTag.includes("reunion");
      case "promo":
        return sectionTag.includes("promo");
      case "profile_picture":
        return isProfilePictureContext(asset.context_type, asset.context_section);
      case "episode_still":
        return sectionTag.includes("episode still") || sectionTag.includes("episode");
      case "intro":
        return sectionTag === "intro" || sectionTag.includes("intro");
      case "wwhl":
        return matchesWwhl(text);
      case "other":
        return sectionTag.includes("other") || sectionTag === "";
    }
  });
}
