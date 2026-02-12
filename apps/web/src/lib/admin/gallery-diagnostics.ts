export type MissingVariantKey = "base.card" | "base.detail" | "crop_card" | "crop_detail";

const getRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
};

const hasUrlInVariantBucket = (bucket: Record<string, unknown> | null): boolean => {
  if (!bucket) return false;
  const webp = getRecord(bucket.webp);
  if (typeof webp?.url === "string" && webp.url.trim().length > 0) return true;
  const jpg = getRecord(bucket.jpg);
  return typeof jpg?.url === "string" && jpg.url.trim().length > 0;
};

const hasVariantUrl = (
  metadata: Record<string, unknown> | null,
  signature: string,
  variantKey: string
): boolean => {
  const variants = getRecord(metadata?.variants);
  if (!variants) return false;
  const signatureBucket = getRecord(variants[signature]);
  if (!signatureBucket) return false;
  const variantBucket = getRecord(signatureBucket[variantKey]);
  return hasUrlInVariantBucket(variantBucket);
};

const readTrimmedString = (record: Record<string, unknown> | null, key: string): string | null => {
  const value = record?.[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const getMissingVariantKeys = (metadataValue: unknown): MissingVariantKey[] => {
  const metadata = getRecord(metadataValue);
  const missing: MissingVariantKey[] = [];

  const hasBaseCard = hasVariantUrl(metadata, "base", "card") || Boolean(readTrimmedString(metadata, "display_url"));
  const hasBaseDetail = hasVariantUrl(metadata, "base", "detail") || Boolean(readTrimmedString(metadata, "detail_url"));

  if (!hasBaseCard) missing.push("base.card");
  if (!hasBaseDetail) missing.push("base.detail");

  const activeCropSignature = readTrimmedString(metadata, "active_crop_signature");
  if (activeCropSignature && activeCropSignature.toLowerCase() !== "base") {
    const hasCropCard = hasVariantUrl(metadata, activeCropSignature, "crop_card");
    const hasCropDetail = hasVariantUrl(metadata, activeCropSignature, "crop_detail");
    if (!hasCropCard) missing.push("crop_card");
    if (!hasCropDetail) missing.push("crop_detail");
  }

  return Array.from(new Set(missing));
};

export const hasMissingVariants = (metadataValue: unknown): boolean => {
  return getMissingVariantKeys(metadataValue).length > 0;
};

export const buildMissingVariantBreakdown = (
  metadataValues: unknown[]
): Array<{ key: MissingVariantKey; count: number }> => {
  const counts = new Map<MissingVariantKey, number>();
  for (const metadata of metadataValues) {
    for (const missingKey of getMissingVariantKeys(metadata)) {
      counts.set(missingKey, (counts.get(missingKey) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => (b.count - a.count) || a.key.localeCompare(b.key));
};
