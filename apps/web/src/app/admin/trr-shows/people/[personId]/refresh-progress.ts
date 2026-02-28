export const PERSON_REFRESH_PHASES = {
  syncing: "SYNCING",
  mirroring: "MIRRORING",
  counting: "COUNTING",
  findingText: "FINDING TEXT",
  centeringCropping: "CENTERING/CROPPING",
  resizing: "RESIZING",
} as const;

export type PersonRefreshPhase =
  (typeof PERSON_REFRESH_PHASES)[keyof typeof PERSON_REFRESH_PHASES];

const SYNC_STAGE_IDS = new Set([
  "proxy_connecting",
  "tmdb_profile",
  "fandom_profile",
  "fetching",
  "metadata_enrichment",
  "metadata_repair",
  "upserting",
  "pruning",
]);

const PHASE_VALUE_SET = new Set<string>(Object.values(PERSON_REFRESH_PHASES));

export function mapPersonRefreshStage(rawStage: string | null | undefined): PersonRefreshPhase | null {
  if (typeof rawStage !== "string") return null;
  const trimmed = rawStage.trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase();
  if (PHASE_VALUE_SET.has(upper)) {
    return upper as PersonRefreshPhase;
  }

  const normalized = trimmed.toLowerCase().replace(/-/g, "_");
  if (normalized === "mirroring") return PERSON_REFRESH_PHASES.mirroring;
  if (normalized === "auto_count") return PERSON_REFRESH_PHASES.counting;
  if (normalized === "word_id") return PERSON_REFRESH_PHASES.findingText;
  if (normalized === "centering_cropping") return PERSON_REFRESH_PHASES.centeringCropping;
  if (normalized === "resizing") return PERSON_REFRESH_PHASES.resizing;
  if (normalized.startsWith("sync_") || SYNC_STAGE_IDS.has(normalized)) {
    return PERSON_REFRESH_PHASES.syncing;
  }
  return null;
}

export function formatPersonRefreshPhaseLabel(
  rawPhase: string | null | undefined,
): string | null {
  const mapped = mapPersonRefreshStage(rawPhase);
  if (mapped) return mapped;
  if (typeof rawPhase !== "string") return null;
  const trimmed = rawPhase.trim();
  if (!trimmed) return null;
  return trimmed.replace(/[_-]+/g, " ").trim().toUpperCase();
}

const SYNC_COMPLETE_MESSAGE_RE = /^(synced|fetched|upsert complete|pruned|skipping)/i;
const SOURCE_LABEL_BY_ID: Record<string, string> = {
  imdb: "IMDb",
  tmdb: "TMDb",
  fandom: "Fandom",
  fandom_gallery: "Fandom Gallery",
};

function normalizeKey(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  return trimmed.replace(/[-\s]+/g, "_");
}

function normalizeCount(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.floor(value));
}

function formatSkipReason(value: string | null | undefined): string | null {
  const normalized = normalizeKey(value);
  if (!normalized) return null;
  return normalized.replace(/_/g, " ");
}

export function formatRefreshSourceLabel(source: string | null | undefined): string | null {
  const normalized = normalizeKey(source);
  if (!normalized) return null;
  return SOURCE_LABEL_BY_ID[normalized] ?? normalized.replace(/_/g, " ");
}

export function buildPersonRefreshDetailMessage(input: {
  rawStage?: string | null;
  message?: string | null;
  heartbeat?: boolean;
  elapsedMs?: number | null;
  source?: string | null;
  sourceTotal?: number | null;
  mirroredCount?: number | null;
  current?: number | null;
  total?: number | null;
  skipReason?: string | null;
  detail?: string | null;
  serviceUnavailable?: boolean;
  retryAfterS?: number | null;
}): string | null {
  const baseMessage = typeof input.message === "string" ? input.message.trim() : "";
  const sourceLabel = formatRefreshSourceLabel(input.source);
  const sourceTotal = normalizeCount(input.sourceTotal);
  const mirroredCount = normalizeCount(input.mirroredCount);
  const current = normalizeCount(input.current);
  const total = normalizeCount(input.total);
  const elapsedSeconds =
    typeof input.elapsedMs === "number" && Number.isFinite(input.elapsedMs) && input.elapsedMs >= 0
      ? Math.max(0, Math.round(input.elapsedMs / 1000))
      : null;
  const skipReason = formatSkipReason(input.skipReason);
  const stageLabel = formatPersonRefreshPhaseLabel(input.rawStage);
  const detail = typeof input.detail === "string" ? input.detail.trim() : "";

  const suffixParts: string[] = [];
  if (
    sourceLabel &&
    !baseMessage.toLowerCase().includes(sourceLabel.toLowerCase())
  ) {
    suffixParts.push(`source: ${sourceLabel}`);
  }
  if (
    mirroredCount !== null &&
    sourceTotal !== null &&
    !/mirrored\s+\d+\s*\/\s*\d+/i.test(baseMessage)
  ) {
    suffixParts.push(`mirrored ${mirroredCount}/${sourceTotal}`);
  }
  if (
    current !== null &&
    total !== null &&
    total > 0 &&
    !new RegExp(`\\b${current}\\s*/\\s*${total}\\b`).test(baseMessage)
  ) {
    suffixParts.push(`step ${current}/${total}`);
  }
  if (skipReason && !baseMessage.toLowerCase().includes(skipReason)) {
    suffixParts.push(`skip: ${skipReason}`);
  }
  if (input.serviceUnavailable) {
    const retryAfter =
      typeof input.retryAfterS === "number" && Number.isFinite(input.retryAfterS) && input.retryAfterS > 0
        ? Math.round(input.retryAfterS)
        : null;
    suffixParts.push(
      retryAfter !== null ? `service unavailable (retry in ~${retryAfter}s)` : "service unavailable",
    );
  }
  if (detail && !baseMessage.toLowerCase().includes(detail.toLowerCase())) {
    suffixParts.push(detail);
  }
  if (elapsedSeconds !== null && input.heartbeat) {
    suffixParts.push(`${elapsedSeconds}s elapsed`);
  }

  let normalizedMessage = baseMessage;
  if (!normalizedMessage) {
    if (input.heartbeat) {
      normalizedMessage = stageLabel ? `${stageLabel} in progress` : "Refresh in progress";
    } else if (stageLabel) {
      normalizedMessage = `${stageLabel} update`;
    }
  }

  if (!normalizedMessage && suffixParts.length === 0) return null;
  if (!normalizedMessage) return suffixParts.join(" · ");
  if (suffixParts.length === 0) return normalizedMessage;
  return `${normalizedMessage} · ${suffixParts.join(" · ")}`;
}

export interface SyncProgressTracker {
  seenStageIds: Set<string>;
  completedStageIds: Set<string>;
}

export function createSyncProgressTracker(): SyncProgressTracker {
  return {
    seenStageIds: new Set<string>(),
    completedStageIds: new Set<string>(),
  };
}

function normalizeStageId(rawStage: string | null | undefined): string | null {
  if (typeof rawStage !== "string") return null;
  const trimmed = rawStage.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase().replace(/-/g, "_");
}

function isSyncStageId(stageId: string): boolean {
  return stageId.startsWith("sync_") || SYNC_STAGE_IDS.has(stageId);
}

function isSyncStageComplete(params: {
  stageId: string;
  message: string | null;
  current: number | null;
  total: number | null;
}): boolean {
  const message = params.message?.trim() ?? "";
  if (params.stageId === "tmdb_profile" || params.stageId === "fandom_profile") {
    return true;
  }
  if (SYNC_COMPLETE_MESSAGE_RE.test(message)) {
    return true;
  }
  if (
    typeof params.current === "number" &&
    Number.isFinite(params.current) &&
    typeof params.total === "number" &&
    Number.isFinite(params.total) &&
    params.total >= 0 &&
    params.current >= params.total
  ) {
    return true;
  }
  return false;
}

export function updateSyncProgressTracker(
  tracker: SyncProgressTracker,
  payload: {
    rawStage: string | null | undefined;
    message: string | null;
    current: number | null;
    total: number | null;
  },
): { current: number | null; total: number | null } {
  const stageId = normalizeStageId(payload.rawStage);
  if (!stageId || !isSyncStageId(stageId)) {
    return { current: null, total: null };
  }

  tracker.seenStageIds.add(stageId);

  if (
    isSyncStageComplete({
      stageId,
      message: payload.message,
      current: payload.current,
      total: payload.total,
    })
  ) {
    tracker.completedStageIds.add(stageId);
  }

  return {
    current: tracker.completedStageIds.size,
    total: tracker.seenStageIds.size,
  };
}
