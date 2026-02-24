export interface CastRefreshMember {
  person_id: string;
}

export type CastRefreshPhaseId =
  | "credits_sync"
  | "profile_links_sync"
  | "bio_sync"
  | "network_augmentation"
  | "media_ingest";

export type CastRefreshPhaseStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "timed_out"
  | "skipped";

export interface CastRefreshPhaseProgress {
  current: number | null;
  total: number | null;
  message?: string | null;
  liveCounts?: Record<string, number> | null;
}

export interface CastRefreshPhaseState {
  id: CastRefreshPhaseId;
  label: string;
  timeoutMs: number;
  status: CastRefreshPhaseStatus;
  progress: CastRefreshPhaseProgress;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
}

export interface CastRefreshPhaseContext {
  signal: AbortSignal;
  phase: Pick<CastRefreshPhaseDefinition, "id" | "label" | "timeoutMs">;
  updateProgress: (progress: Partial<CastRefreshPhaseProgress>) => void;
}

export interface CastRefreshPhaseDefinition {
  id: CastRefreshPhaseId;
  label: string;
  timeoutMs: number;
  run: (context: CastRefreshPhaseContext) => Promise<void | { skipped?: boolean; message?: string }>;
}

export class CastRefreshPhaseTimeoutError extends Error {
  phaseId: CastRefreshPhaseId;
  timeoutMs: number;

  constructor(phaseId: CastRefreshPhaseId, timeoutMs: number) {
    super(`${phaseId} timed out after ${Math.round(timeoutMs / 1000)}s`);
    this.name = "CastRefreshPhaseTimeoutError";
    this.phaseId = phaseId;
    this.timeoutMs = timeoutMs;
  }
}

const toIsoNow = (): string => new Date().toISOString();

const withPhaseState = (
  states: CastRefreshPhaseState[],
  phaseId: CastRefreshPhaseId,
  updater: (state: CastRefreshPhaseState) => CastRefreshPhaseState
): CastRefreshPhaseState[] =>
  states.map((state) => (state.id === phaseId ? updater(state) : state));

const emitPhaseStates = (
  states: CastRefreshPhaseState[],
  onPhaseStatesChange?: (states: CastRefreshPhaseState[]) => void
): void => {
  onPhaseStatesChange?.(states);
};

export const createInitialCastRefreshPhaseStates = (
  phases: CastRefreshPhaseDefinition[]
): CastRefreshPhaseState[] =>
  phases.map((phase) => ({
    id: phase.id,
    label: phase.label,
    timeoutMs: phase.timeoutMs,
    status: "pending",
    progress: {
      current: null,
      total: null,
      message: null,
      liveCounts: null,
    },
    startedAt: null,
    finishedAt: null,
    error: null,
  }));

export const runWithTimeout = async <T>(
  phase: Pick<CastRefreshPhaseDefinition, "id" | "timeoutMs">,
  task: (signal: AbortSignal) => Promise<T>
): Promise<T> => {
  const controller = new AbortController();
  let settled = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      if (settled) return;
      controller.abort();
      reject(new CastRefreshPhaseTimeoutError(phase.id, phase.timeoutMs));
    }, phase.timeoutMs);

    controller.signal.addEventListener(
      "abort",
      () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      },
      { once: true }
    );
  });

  const taskPromise = (async () => {
    const result = await task(controller.signal);
    settled = true;
    return result;
  })();

  try {
    return await Promise.race([taskPromise, timeoutPromise]);
  } finally {
    settled = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }
};

export const runPhasedCastRefresh = async (options: {
  phases: CastRefreshPhaseDefinition[];
  onPhaseStatesChange?: (states: CastRefreshPhaseState[]) => void;
}): Promise<CastRefreshPhaseState[]> => {
  let states = createInitialCastRefreshPhaseStates(options.phases);
  emitPhaseStates(states, options.onPhaseStatesChange);

  for (const phase of options.phases) {
    states = withPhaseState(states, phase.id, (state) => ({
      ...state,
      status: "running",
      startedAt: toIsoNow(),
      finishedAt: null,
      error: null,
      progress: {
        ...state.progress,
        message: state.progress.message || `${phase.label} started...`,
      },
    }));
    emitPhaseStates(states, options.onPhaseStatesChange);

    try {
      const result = await runWithTimeout(phase, (signal) =>
        phase.run({
          signal,
          phase,
          updateProgress: (progress) => {
            states = withPhaseState(states, phase.id, (state) => ({
              ...state,
              progress: {
                ...state.progress,
                ...progress,
              },
            }));
            emitPhaseStates(states, options.onPhaseStatesChange);
          },
        })
      );

      if (result && typeof result === "object" && result.skipped) {
        states = withPhaseState(states, phase.id, (state) => ({
          ...state,
          status: "skipped",
          finishedAt: toIsoNow(),
          progress: {
            ...state.progress,
            message: result.message || `${phase.label} skipped.`,
          },
        }));
      } else {
        states = withPhaseState(states, phase.id, (state) => ({
          ...state,
          status: "completed",
          finishedAt: toIsoNow(),
          progress: {
            ...state.progress,
            message: state.progress.message || `${phase.label} complete.`,
          },
        }));
      }
      emitPhaseStates(states, options.onPhaseStatesChange);
    } catch (error) {
      const timeoutError =
        error instanceof CastRefreshPhaseTimeoutError && error.phaseId === phase.id;
      const message =
        timeoutError && error instanceof CastRefreshPhaseTimeoutError
          ? `${phase.label} timed out after ${Math.round(error.timeoutMs / 1000)}s.`
          : error instanceof Error
            ? error.message
            : `${phase.label} failed.`;

      states = withPhaseState(states, phase.id, (state) => ({
        ...state,
        status: timeoutError ? "timed_out" : "failed",
        finishedAt: toIsoNow(),
        error: message,
        progress: {
          ...state.progress,
          message,
        },
      }));
      emitPhaseStates(states, options.onPhaseStatesChange);
      throw error;
    }
  }

  return states;
};

export interface CastRefreshWorkflowDeps<TMember extends CastRefreshMember> {
  refreshCastCredits: () => Promise<void>;
  syncCastMatrixRoles: () => Promise<void>;
  fetchCastMembers: () => Promise<TMember[]>;
  ingestCastMemberMedia: (members: TMember[]) => Promise<void>;
}

export const runCastRefreshWorkflow = async <TMember extends CastRefreshMember>(
  deps: CastRefreshWorkflowDeps<TMember>
): Promise<TMember[]> => {
  await deps.refreshCastCredits();
  await deps.syncCastMatrixRoles();
  const members = await deps.fetchCastMembers();
  await deps.ingestCastMemberMedia(members);
  return members;
};

export interface CastEnrichMediaWorkflowDeps<TMember extends CastRefreshMember> {
  fetchCastMembers: () => Promise<TMember[]>;
  reprocessCastMemberMedia: (members: TMember[]) => Promise<void>;
  ingestCastMemberMedia?: (members: TMember[]) => Promise<void>;
}

export const runCastEnrichMediaWorkflow = async <TMember extends CastRefreshMember>(
  deps: CastEnrichMediaWorkflowDeps<TMember>
): Promise<TMember[]> => {
  const members = await deps.fetchCastMembers();
  await deps.reprocessCastMemberMedia(members);
  return members;
};
