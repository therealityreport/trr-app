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
  "tmdb_profile",
  "fandom_profile",
  "fetching",
  "metadata_enrichment",
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
