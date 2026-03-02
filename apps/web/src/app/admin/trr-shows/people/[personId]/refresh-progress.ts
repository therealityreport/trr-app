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
  reviewedRows?: number | null;
  changedRows?: number | null;
  totalRows?: number | null;
  failedRows?: number | null;
  skippedRows?: number | null;
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
  const reviewedRows = normalizeCount(input.reviewedRows);
  const changedRows = normalizeCount(input.changedRows);
  const totalRows = normalizeCount(input.totalRows);
  const failedRows = normalizeCount(input.failedRows);
  const skippedRows = normalizeCount(input.skippedRows);

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
  if (
    reviewedRows !== null &&
    totalRows !== null &&
    totalRows > 0 &&
    !new RegExp(`reviewed\\s+${reviewedRows}\\s*/\\s*${totalRows}`, "i").test(baseMessage)
  ) {
    suffixParts.push(`reviewed ${reviewedRows}/${totalRows}`);
  }
  if (changedRows !== null && !new RegExp(`changed\\s+${changedRows}\\b`, "i").test(baseMessage)) {
    suffixParts.push(`changed ${changedRows}`);
  }
  if (
    failedRows !== null &&
    failedRows > 0 &&
    !new RegExp(`failed\\s+${failedRows}\\b`, "i").test(baseMessage)
  ) {
    suffixParts.push(`failed ${failedRows}`);
  }
  if (
    skippedRows !== null &&
    skippedRows > 0 &&
    !new RegExp(`skipped\\s+${skippedRows}\\b`, "i").test(baseMessage)
  ) {
    suffixParts.push(`skipped ${skippedRows}`);
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

const toFiniteInt = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return null;
};

export function buildProxyConnectDetailMessage(input: {
  stage?: string | null;
  message?: string | null;
  attempt?: number | null;
  maxAttempts?: number | null;
  attemptElapsedMs?: number | null;
  attemptTimeoutMs?: number | null;
}): string | null {
  const stage = normalizeStage(input.stage);
  if (stage !== "proxy_connecting") return null;

  const attempt = toFiniteInt(input.attempt);
  const maxAttempts = toFiniteInt(input.maxAttempts);
  const elapsedMs = toFiniteInt(input.attemptElapsedMs);
  const timeoutMs = toFiniteInt(input.attemptTimeoutMs);
  if (attempt !== null && maxAttempts !== null && elapsedMs !== null && timeoutMs !== null && timeoutMs > 0) {
    return (
      `Connecting to backend stream (attempt ${attempt}/${maxAttempts}, ` +
      `${Math.floor(elapsedMs / 1000)}s/${Math.floor(timeoutMs / 1000)}s)...`
    );
  }

  const message = typeof input.message === "string" ? input.message.trim() : "";
  return message || "Connecting to backend stream...";
}

export function buildProxyTerminalErrorMessage(input: {
  stage?: string | null;
  checkpoint?: string | null;
  error?: string | null;
  detail?: string | null;
  errorCode?: string | null;
  backendHost?: string | null;
  attemptsUsed?: number | null;
  maxAttempts?: number | null;
}): string {
  const stage = normalizeStage(input.stage);
  const checkpoint =
    typeof input.checkpoint === "string" && input.checkpoint.trim() ? input.checkpoint.trim() : null;
  const error = typeof input.error === "string" && input.error.trim() ? input.error.trim() : null;
  const detail = typeof input.detail === "string" && input.detail.trim() ? input.detail.trim() : null;
  const errorCode = typeof input.errorCode === "string" && input.errorCode.trim() ? input.errorCode.trim() : null;
  const backendHost =
    typeof input.backendHost === "string" && input.backendHost.trim() ? input.backendHost.trim() : null;
  const attemptsUsed = toFiniteInt(input.attemptsUsed);
  const maxAttempts = toFiniteInt(input.maxAttempts);
  const attemptSummary = maxAttempts ?? attemptsUsed;

  if (stage === "proxy_connecting") {
    if (errorCode === "BACKEND_UNRESPONSIVE" || checkpoint === "backend_preflight_failed") {
      const base = backendHost
        ? `TRR-Backend is not responding (host: ${backendHost}).`
        : "TRR-Backend is not responding.";
      const hint =
        " In workspace mode, use non-reload backend or wait for reload cycle to settle.";
      return `${base}${hint}${detail ? ` ${detail}` : ""}`;
    }
    const base =
      attemptSummary !== null
        ? `Backend stream connect failed after ${attemptSummary} attempts`
        : "Backend stream connect failed";
    const suffixParts: string[] = [];
    if (errorCode) suffixParts.push(`code: ${errorCode}`);
    if (backendHost) suffixParts.push(`host: ${backendHost}`);
    const suffix = suffixParts.length ? ` (${suffixParts.join(", ")}).` : ".";
    const detailSuffix = detail ? ` ${detail}` : "";
    return `${base}${suffix}${detailSuffix}`;
  }

  if (error && detail) return `${error}: ${detail}`;
  if (error) return error;
  if (detail) return detail;
  return "Failed to refresh images";
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

export type PersonRefreshPipelineMode = "refresh" | "reprocess";

export type PersonRefreshPipelineStepId =
  | "profiles"
  | "source_sync"
  | "metadata_enrichment"
  | "upserting"
  | "metadata_repair"
  | "mirroring"
  | "pruning"
  | "auto_count"
  | "word_id"
  | "centering_cropping"
  | "resizing";

export type PersonRefreshPipelineStepStatus =
  | "pending"
  | "running"
  | "completed"
  | "skipped"
  | "failed";

export interface PersonRefreshPipelineStepState {
  id: PersonRefreshPipelineStepId;
  label: string;
  status: PersonRefreshPipelineStepStatus;
  current: number | null;
  total: number | null;
  message: string | null;
  result: string | null;
}

interface PersonRefreshPipelineStepDefinition {
  id: PersonRefreshPipelineStepId;
  label: string;
  modes: Set<PersonRefreshPipelineMode>;
}

const REFRESH_PIPELINE_STEPS: PersonRefreshPipelineStepDefinition[] = [
  { id: "profiles", label: "Profiles", modes: new Set(["refresh"]) },
  { id: "source_sync", label: "Source Sync", modes: new Set(["refresh"]) },
  { id: "metadata_enrichment", label: "Metadata", modes: new Set(["refresh"]) },
  { id: "upserting", label: "Saving Photos", modes: new Set(["refresh"]) },
  { id: "metadata_repair", label: "IMDb Repair", modes: new Set(["refresh", "reprocess"]) },
  { id: "mirroring", label: "S3 Mirroring", modes: new Set(["refresh"]) },
  { id: "pruning", label: "Pruning", modes: new Set(["refresh"]) },
  { id: "auto_count", label: "People Count + Face Crops", modes: new Set(["refresh", "reprocess"]) },
  { id: "word_id", label: "Text Overlay", modes: new Set(["refresh", "reprocess"]) },
  {
    id: "centering_cropping",
    label: "Centering/Cropping",
    modes: new Set(["refresh", "reprocess"]),
  },
  { id: "resizing", label: "Resizing", modes: new Set(["refresh", "reprocess"]) },
];

const SOURCE_SYNC_STAGE_PREFIXES = ["sync_"];
const SOURCE_SYNC_STAGE_IDS = new Set(["fetching"]);

function toCount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.floor(value));
}

function normalizeStage(rawStage: string | null | undefined): string | null {
  if (typeof rawStage !== "string") return null;
  const trimmed = rawStage.trim().toLowerCase();
  if (!trimmed) return null;
  return trimmed.replace(/-/g, "_");
}

function messageIndicatesSkip(message: string): boolean {
  return /(^|\b)skip(ping|ped)?\b|already up to date|no pending images/i.test(message);
}

function messageIndicatesFailure(message: string): boolean {
  return /\b(fail(ed|ure)?|error|paused|unavailable)\b/i.test(message);
}

function messageIndicatesCompletion(message: string): boolean {
  return /\b(complete|completed|done|synced|fetched|saved|pruned|repaired|mirrored|counted|centered|generated)\b/i.test(
    message,
  );
}

function mapStageToPipelineStep(rawStage: string | null | undefined): PersonRefreshPipelineStepId | null {
  const stage = normalizeStage(rawStage);
  if (!stage) return null;
  if (stage === "tmdb_profile" || stage === "fandom_profile") return "profiles";
  if (SOURCE_SYNC_STAGE_IDS.has(stage) || SOURCE_SYNC_STAGE_PREFIXES.some((prefix) => stage.startsWith(prefix))) {
    return "source_sync";
  }
  if (stage === "metadata_enrichment") return "metadata_enrichment";
  if (stage === "upserting") return "upserting";
  if (stage === "metadata_repair") return "metadata_repair";
  if (stage === "mirroring") return "mirroring";
  if (stage === "pruning") return "pruning";
  if (stage === "auto_count") return "auto_count";
  if (stage === "word_id") return "word_id";
  if (stage === "centering_cropping") return "centering_cropping";
  if (stage === "resizing") return "resizing";
  return null;
}

export function createPersonRefreshPipelineSteps(
  mode: PersonRefreshPipelineMode,
): PersonRefreshPipelineStepState[] {
  return REFRESH_PIPELINE_STEPS.filter((step) => step.modes.has(mode)).map((step) => ({
    id: step.id,
    label: step.label,
    status: "pending",
    current: null,
    total: null,
    message: null,
    result: null,
  }));
}

function determineStepStatus(input: {
  previousStatus: PersonRefreshPipelineStepStatus;
  forceStatus?: PersonRefreshPipelineStepStatus | null;
  message: string | null;
  heartbeat: boolean;
  skipReason: string | null;
  serviceUnavailable: boolean;
  current: number | null;
  total: number | null;
}): PersonRefreshPipelineStepStatus {
  if (input.forceStatus) return input.forceStatus;
  const message = (input.message ?? "").trim();
  const hasCounts = typeof input.current === "number" && typeof input.total === "number";
  const isCountComplete = hasCounts && (input.total ?? 0) >= 0 && (input.current ?? 0) >= (input.total ?? 0);
  if (input.skipReason || messageIndicatesSkip(message)) return "skipped";
  if (input.serviceUnavailable || messageIndicatesFailure(message)) {
    return "failed";
  }
  if (!input.heartbeat && (isCountComplete || messageIndicatesCompletion(message))) return "completed";
  if (input.previousStatus === "completed" || input.previousStatus === "skipped" || input.previousStatus === "failed") {
    return input.previousStatus;
  }
  return "running";
}

export function updatePersonRefreshPipelineSteps(
  steps: PersonRefreshPipelineStepState[],
  payload: {
    rawStage: string | null | undefined;
    message: string | null | undefined;
    current: number | null | undefined;
    total: number | null | undefined;
    heartbeat?: boolean;
    skipReason?: string | null;
    serviceUnavailable?: boolean;
    detail?: string | null;
    forceStatus?: PersonRefreshPipelineStepStatus | null;
  },
): PersonRefreshPipelineStepState[] {
  const stepId = mapStageToPipelineStep(payload.rawStage);
  if (!stepId) return steps;

  const stepIndex = steps.findIndex((step) => step.id === stepId);
  if (stepIndex === -1) return steps;

  const next = steps.map((step) => ({ ...step }));
  for (let index = 0; index < stepIndex; index += 1) {
    const currentStep = next[index];
    if (currentStep.status === "running") {
      currentStep.status = "completed";
      if (!currentStep.result && currentStep.message) {
        currentStep.result = currentStep.message;
      }
    }
  }

  const step = next[stepIndex];
  const current = toCount(payload.current);
  const total = toCount(payload.total);
  const message = typeof payload.message === "string" && payload.message.trim().length > 0
    ? payload.message.trim()
    : typeof payload.detail === "string" && payload.detail.trim().length > 0
      ? payload.detail.trim()
      : step.message;
  const status = determineStepStatus({
    previousStatus: step.status,
    forceStatus: payload.forceStatus ?? null,
    message,
    heartbeat: payload.heartbeat === true,
    skipReason: payload.skipReason ?? null,
    serviceUnavailable: payload.serviceUnavailable === true,
    current,
    total,
  });

  step.status = status;
  step.current = current;
  step.total = total;
  step.message = message ?? null;
  if (status === "completed" || status === "skipped" || status === "failed") {
    step.result = message ?? step.result;
  } else {
    step.result = null;
  }

  return next;
}

function toSummaryNumber(summary: Record<string, unknown>, key: string): number {
  const value = summary[key];
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function finalizePersonRefreshPipelineSteps(
  steps: PersonRefreshPipelineStepState[],
  mode: PersonRefreshPipelineMode,
  summary: unknown,
): PersonRefreshPipelineStepState[] {
  const next = steps.map((step) => ({ ...step }));
  const summaryRecord = summary && typeof summary === "object" ? (summary as Record<string, unknown>) : null;

  for (const step of next) {
    if (step.status === "running") {
      step.status = "completed";
      step.result = step.message ?? step.result ?? "Completed";
    } else if (step.status === "pending") {
      step.status = "skipped";
      step.result = "Not run";
    }
  }

  if (!summaryRecord) return next;

  const photosFetched = toSummaryNumber(summaryRecord, "photos_fetched");
  const photosUpserted = toSummaryNumber(summaryRecord, "photos_upserted");
  const photosMirrored = toSummaryNumber(summaryRecord, "photos_mirrored");
  const photosMirrorFailed = toSummaryNumber(summaryRecord, "photos_failed");
  const photosPruned = toSummaryNumber(summaryRecord, "photos_pruned");
  const autoCountsAttempted = toSummaryNumber(summaryRecord, "auto_counts_attempted");
  const autoCountsSucceeded = toSummaryNumber(summaryRecord, "auto_counts_succeeded");
  const autoCountsFailed = toSummaryNumber(summaryRecord, "auto_counts_failed");
  const textOverlayAttempted = toSummaryNumber(summaryRecord, "text_overlay_attempted");
  const textOverlaySucceeded = toSummaryNumber(summaryRecord, "text_overlay_succeeded");
  const textOverlayUnknown = toSummaryNumber(summaryRecord, "text_overlay_unknown");
  const textOverlayFailed = toSummaryNumber(summaryRecord, "text_overlay_failed");
  const centeringAttempted = toSummaryNumber(summaryRecord, "centering_attempted");
  const centeringSucceeded = toSummaryNumber(summaryRecord, "centering_succeeded");
  const centeringFailed = toSummaryNumber(summaryRecord, "centering_failed");
  const centeringSkippedManual = toSummaryNumber(summaryRecord, "centering_skipped_manual");
  const resizeAttempted = toSummaryNumber(summaryRecord, "resize_attempted");
  const resizeSucceeded = toSummaryNumber(summaryRecord, "resize_succeeded");
  const resizeFailed = toSummaryNumber(summaryRecord, "resize_failed");
  const resizeCropAttempted = toSummaryNumber(summaryRecord, "resize_crop_attempted");
  const resizeCropSucceeded = toSummaryNumber(summaryRecord, "resize_crop_succeeded");
  const resizeCropFailed = toSummaryNumber(summaryRecord, "resize_crop_failed");
  const metadataTagged = toSummaryNumber(summaryRecord, "episode_metadata_tagged");
  const showContextTagged = toSummaryNumber(summaryRecord, "show_context_tagged");
  const metadataEnrichmentFailed = toSummaryNumber(summaryRecord, "metadata_enrichment_failed");
  const metadataRepair = toSummaryNumber(summaryRecord, "existing_imdb_rows_repaired");
  const metadataRepairAttempted = toSummaryNumber(summaryRecord, "metadata_repair_attempted");

  const updateStep = (id: PersonRefreshPipelineStepId, update: Partial<PersonRefreshPipelineStepState>) => {
    const index = next.findIndex((step) => step.id === id);
    if (index === -1) return;
    next[index] = { ...next[index], ...update };
  };

  if (mode === "refresh") {
    updateStep("source_sync", {
      status: "completed",
      result: `Fetched ${photosFetched.toLocaleString()} photos`,
    });
    updateStep("upserting", {
      status: "completed",
      result: `Saved ${photosUpserted.toLocaleString()} photos`,
    });
    updateStep("metadata_enrichment", {
      status: metadataEnrichmentFailed > 0 ? "failed" : "completed",
      result:
        metadataEnrichmentFailed > 0
          ? `Tagged ${metadataTagged.toLocaleString()} episode rows and ${showContextTagged.toLocaleString()} show rows (${metadataEnrichmentFailed.toLocaleString()} failed)`
          : `Tagged ${metadataTagged.toLocaleString()} episode rows and ${showContextTagged.toLocaleString()} show rows`,
    });
    updateStep("metadata_repair", {
      status: "completed",
      result: `Repaired ${metadataRepair.toLocaleString()} IMDb rows`,
    });
    updateStep("mirroring", {
      status: photosMirrorFailed > 0 ? "failed" : "completed",
      result:
        photosMirrored > 0 || photosMirrorFailed > 0
          ? `Hosted ${photosMirrored.toLocaleString()} assets (${photosMirrorFailed.toLocaleString()} failed)`
          : "Not run",
    });
    updateStep("pruning", {
      status: photosPruned > 0 ? "completed" : next.find((step) => step.id === "pruning")?.status ?? "skipped",
      result: `Pruned ${photosPruned.toLocaleString()} orphaned objects`,
    });
  } else {
    updateStep("metadata_repair", {
      status:
        metadataRepairAttempted > 0
          ? metadataEnrichmentFailed > 0
            ? "failed"
            : "completed"
          : "skipped",
      result:
        metadataRepairAttempted > 0
          ? metadataEnrichmentFailed > 0
            ? `Repaired ${metadataRepair.toLocaleString()} IMDb rows (${metadataEnrichmentFailed.toLocaleString()} failed)`
            : `Repaired ${metadataRepair.toLocaleString()} IMDb rows`
          : "Not run",
    });
  }

  updateStep("auto_count", {
    status: autoCountsFailed > 0 ? "failed" : autoCountsAttempted > 0 ? "completed" : "skipped",
    result:
      autoCountsAttempted > 0
        ? `Saved people tags for ${autoCountsSucceeded.toLocaleString()}/${autoCountsAttempted.toLocaleString()} images (${autoCountsFailed.toLocaleString()} failed)`
        : "Not run",
  });

  updateStep("word_id", {
    status: textOverlayFailed > 0 ? "failed" : textOverlayAttempted > 0 ? "completed" : "skipped",
    result:
      textOverlayAttempted > 0
        ? `Processed ${textOverlaySucceeded.toLocaleString()} detected, ${textOverlayUnknown.toLocaleString()} unknown, ${textOverlayFailed.toLocaleString()} failed`
        : "Not run",
  });

  updateStep("centering_cropping", {
    status: centeringFailed > 0 ? "failed" : centeringAttempted > 0 ? "completed" : "skipped",
    result:
      centeringAttempted > 0 || centeringSkippedManual > 0
        ? `Centered ${centeringSucceeded.toLocaleString()}/${centeringAttempted.toLocaleString()} (${centeringFailed.toLocaleString()} failed, ${centeringSkippedManual.toLocaleString()} manual kept)`
        : "Not run",
  });

  updateStep("resizing", {
    status: resizeFailed > 0 || resizeCropFailed > 0 ? "failed" : resizeAttempted > 0 ? "completed" : "skipped",
    result:
      resizeAttempted > 0 || resizeCropAttempted > 0
        ? `Base ${resizeSucceeded.toLocaleString()}/${resizeAttempted.toLocaleString()}, crop ${resizeCropSucceeded.toLocaleString()}/${resizeCropAttempted.toLocaleString()}`
        : "Not run",
  });

  return next;
}
