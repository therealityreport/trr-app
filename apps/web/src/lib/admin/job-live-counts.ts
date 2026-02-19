export interface JobLiveCounts {
  synced: number;
  mirrored: number;
  counted: number;
  cropped: number;
  id_text: number;
  resized: number;
}

const ZERO_COUNTS: JobLiveCounts = {
  synced: 0,
  mirrored: 0,
  counted: 0,
  cropped: 0,
  id_text: 0,
  resized: 0,
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toWholeCount = (value: unknown): number | null => {
  const parsed = toNumber(value);
  if (parsed === null) return null;
  return Math.max(0, Math.floor(parsed));
};

const safeCount = (value: unknown): number => toWholeCount(value) ?? 0;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const readOperationSucceeded = (
  operationCounts: Record<string, unknown> | null,
  key: "count" | "crop" | "id_text" | "resize"
): number | null => {
  if (!operationCounts) return null;
  const op = asRecord(operationCounts[key]);
  if (!op) return null;
  return toWholeCount(op.succeeded);
};

const inferCountsFromPayload = (payload: Record<string, unknown>): JobLiveCounts => {
  const operationCounts = asRecord(payload.operation_counts);

  const synced =
    toWholeCount(payload.synced) ??
    [
      toWholeCount(payload.show_images_upserted),
      toWholeCount(payload.season_images_upserted),
      toWholeCount(payload.episode_images_upserted),
      toWholeCount(payload.cast_photos_upserted),
      toWholeCount(payload.photos_upserted),
    ]
      .filter((value): value is number => value !== null)
      .reduce((sum, value) => sum + value, 0);

  const mirrored =
    toWholeCount(payload.mirrored) ??
    [
      toWholeCount(payload.show_images_mirrored),
      toWholeCount(payload.season_images_mirrored),
      toWholeCount(payload.episode_images_mirrored),
      toWholeCount(payload.cast_photos_mirrored),
      toWholeCount(payload.media_assets_mirrored),
      toWholeCount(payload.photos_mirrored),
    ]
      .filter((value): value is number => value !== null)
      .reduce((sum, value) => sum + value, 0);

  return {
    synced,
    mirrored,
    counted:
      toWholeCount(payload.counted) ??
      toWholeCount(payload.auto_counts_succeeded) ??
      readOperationSucceeded(operationCounts, "count") ??
      0,
    cropped:
      toWholeCount(payload.cropped) ??
      toWholeCount(payload.centering_succeeded) ??
      readOperationSucceeded(operationCounts, "crop") ??
      0,
    id_text:
      toWholeCount(payload.id_text) ??
      toWholeCount(payload.text_overlay_succeeded) ??
      readOperationSucceeded(operationCounts, "id_text") ??
      0,
    resized:
      toWholeCount(payload.resized) ??
      toWholeCount(payload.resize_succeeded) ??
      readOperationSucceeded(operationCounts, "resize") ??
      0,
  };
};

export const resolveJobLiveCounts = (
  previous: JobLiveCounts | null,
  payload: unknown
): JobLiveCounts | null => {
  const payloadRecord = asRecord(payload);
  if (!payloadRecord) return previous;

  const liveCountsRecord = asRecord(payloadRecord.live_counts);
  const inferred = inferCountsFromPayload(payloadRecord);

  const next: JobLiveCounts = {
    synced: safeCount(liveCountsRecord?.synced ?? inferred.synced),
    mirrored: safeCount(liveCountsRecord?.mirrored ?? inferred.mirrored),
    counted: safeCount(liveCountsRecord?.counted ?? inferred.counted),
    cropped: safeCount(liveCountsRecord?.cropped ?? inferred.cropped),
    id_text: safeCount(liveCountsRecord?.id_text ?? inferred.id_text),
    resized: safeCount(liveCountsRecord?.resized ?? inferred.resized),
  };

  if (!previous) return next;
  return {
    synced: Math.max(previous.synced, next.synced),
    mirrored: Math.max(previous.mirrored, next.mirrored),
    counted: Math.max(previous.counted, next.counted),
    cropped: Math.max(previous.cropped, next.cropped),
    id_text: Math.max(previous.id_text, next.id_text),
    resized: Math.max(previous.resized, next.resized),
  };
};

export const formatJobLiveCounts = (counts: JobLiveCounts | null): string | null => {
  if (!counts) return null;
  const ordered: Array<[keyof JobLiveCounts, string]> = [
    ["synced", "synced"],
    ["mirrored", "mirrored"],
    ["counted", "counted"],
    ["cropped", "cropped"],
    ["id_text", "id text"],
    ["resized", "resized"],
  ];
  const parts = ordered.map(([key, label]) => `${label}: ${counts[key].toLocaleString()}`);
  return parts.join(", ");
};

export const appendLiveCountsToMessage = (
  message: string,
  counts: JobLiveCounts | null
): string => {
  const suffix = formatJobLiveCounts(counts);
  if (!suffix) return message;
  const trimmed = message.trim();
  if (!trimmed) return suffix;
  return `${trimmed} | ${suffix}`;
};

export const zeroJobLiveCounts = (): JobLiveCounts => ({ ...ZERO_COUNTS });
