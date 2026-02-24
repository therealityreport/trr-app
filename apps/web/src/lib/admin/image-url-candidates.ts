const normalizeImageUrl = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const dedupeCandidates = (values: Array<string | null>): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
};

export interface ImageCardCandidateInput {
  cropDisplayUrl?: string | null;
  thumbUrl?: string | null;
  displayUrl?: string | null;
  hostedUrl?: string | null;
  originalUrl?: string | null;
  sourceUrl?: string | null;
}

export interface ImageDetailCandidateInput {
  cropDetailUrl?: string | null;
  detailUrl?: string | null;
  hostedUrl?: string | null;
  originalUrl?: string | null;
  sourceUrl?: string | null;
}

export interface SeasonAssetLike extends ImageCardCandidateInput, ImageDetailCandidateInput {
  hosted_url: string;
  crop_display_url?: string | null;
  thumb_url?: string | null;
  display_url?: string | null;
  crop_detail_url?: string | null;
  detail_url?: string | null;
  original_url?: string | null;
  source_url?: string | null;
}

export interface PersonPhotoLike extends ImageCardCandidateInput, ImageDetailCandidateInput {
  hosted_url?: string | null;
  crop_display_url?: string | null;
  thumb_url?: string | null;
  display_url?: string | null;
  crop_detail_url?: string | null;
  detail_url?: string | null;
  original_url?: string | null;
  url?: string | null;
}

export const buildCardImageUrlCandidates = (input: ImageCardCandidateInput): string[] => {
  return dedupeCandidates([
    normalizeImageUrl(input.cropDisplayUrl),
    normalizeImageUrl(input.thumbUrl),
    normalizeImageUrl(input.displayUrl),
    normalizeImageUrl(input.hostedUrl),
    normalizeImageUrl(input.originalUrl),
    normalizeImageUrl(input.sourceUrl),
  ]);
};

export const buildDetailImageUrlCandidates = (input: ImageDetailCandidateInput): string[] => {
  return dedupeCandidates([
    normalizeImageUrl(input.detailUrl),
    normalizeImageUrl(input.hostedUrl),
    normalizeImageUrl(input.originalUrl),
    normalizeImageUrl(input.sourceUrl),
    normalizeImageUrl(input.cropDetailUrl),
  ]);
};

export const getSeasonAssetCardUrlCandidates = (asset: SeasonAssetLike): string[] => {
  return buildCardImageUrlCandidates({
    cropDisplayUrl: asset.crop_display_url,
    thumbUrl: asset.thumb_url,
    displayUrl: asset.display_url,
    hostedUrl: asset.hosted_url,
    originalUrl: asset.original_url,
    sourceUrl: asset.source_url,
  });
};

export const getSeasonAssetDetailUrlCandidates = (asset: SeasonAssetLike): string[] => {
  return buildDetailImageUrlCandidates({
    cropDetailUrl: asset.crop_detail_url,
    detailUrl: asset.detail_url,
    hostedUrl: asset.hosted_url,
    originalUrl: asset.original_url,
    sourceUrl: asset.source_url,
  });
};

export const getPersonPhotoCardUrlCandidates = (photo: PersonPhotoLike): string[] => {
  return buildCardImageUrlCandidates({
    cropDisplayUrl: photo.crop_display_url,
    thumbUrl: photo.thumb_url,
    displayUrl: photo.display_url,
    hostedUrl: photo.hosted_url,
    originalUrl: photo.original_url,
    sourceUrl: photo.url,
  });
};

export const getPersonPhotoDetailUrlCandidates = (photo: PersonPhotoLike): string[] => {
  return buildDetailImageUrlCandidates({
    cropDetailUrl: photo.crop_detail_url,
    detailUrl: photo.detail_url,
    hostedUrl: photo.hosted_url,
    originalUrl: photo.original_url,
    sourceUrl: photo.url,
  });
};

export const getPersonPhotoOriginalUrlCandidates = (photo: PersonPhotoLike): string[] => {
  return dedupeCandidates([
    normalizeImageUrl(photo.original_url),
    normalizeImageUrl(photo.url),
    normalizeImageUrl(photo.hosted_url),
  ]);
};

export const firstImageUrlCandidate = (candidates: string[]): string | null => {
  return candidates[0] ?? null;
};
