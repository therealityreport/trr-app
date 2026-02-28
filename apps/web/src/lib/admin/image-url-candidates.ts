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

const isLikelyMirroredUrl = (value: string): boolean => {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return (
      host.includes("cloudfront.net") ||
      host.includes("amazonaws.com") ||
      host.includes("s3.") ||
      host.includes("therealityreport")
    );
  } catch {
    return false;
  }
};

const partitionByMirror = (values: Array<string | null>): { mirrored: string[]; external: string[] } => {
  const mirrored: string[] = [];
  const external: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (isLikelyMirroredUrl(value)) mirrored.push(value);
    else external.push(value);
  }
  return { mirrored, external };
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
  const variantCandidates = [
    normalizeImageUrl(input.cropDisplayUrl),
    normalizeImageUrl(input.thumbUrl),
    normalizeImageUrl(input.displayUrl),
    normalizeImageUrl(input.hostedUrl),
  ];
  const sourceCandidates = [
    normalizeImageUrl(input.originalUrl),
    normalizeImageUrl(input.sourceUrl),
  ];
  const variantPartition = partitionByMirror(variantCandidates);
  const sourcePartition = partitionByMirror(sourceCandidates);
  return dedupeCandidates([
    ...variantPartition.mirrored,
    ...variantPartition.external,
    ...sourcePartition.mirrored,
    ...sourcePartition.external,
  ]);
};

export const buildDetailImageUrlCandidates = (input: ImageDetailCandidateInput): string[] => {
  const sourceCandidates = [
    normalizeImageUrl(input.hostedUrl),
    normalizeImageUrl(input.originalUrl),
    normalizeImageUrl(input.sourceUrl),
  ];
  const generatedCandidates = [
    normalizeImageUrl(input.detailUrl),
    normalizeImageUrl(input.cropDetailUrl),
  ];
  const variantPartition = partitionByMirror(generatedCandidates);
  const sourcePartition = partitionByMirror(sourceCandidates);
  return dedupeCandidates([
    ...sourcePartition.mirrored,
    ...sourcePartition.external,
    ...variantPartition.mirrored,
    ...variantPartition.external,
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
  // Person gallery cards apply client-side focal crop/zoom.
  // Prefer uncropped/base variants to avoid double-cropping pre-generated crop variants.
  const baseCandidates = buildCardImageUrlCandidates({
    cropDisplayUrl: null,
    thumbUrl: photo.thumb_url,
    displayUrl: photo.display_url,
    hostedUrl: photo.hosted_url,
    originalUrl: photo.original_url,
    sourceUrl: photo.url,
  });
  return dedupeCandidates([
    ...baseCandidates,
    normalizeImageUrl(photo.crop_display_url),
  ]);
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
