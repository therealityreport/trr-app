import { getOrCreateAdminTabSessionId } from "@/lib/admin/tab-session";
import {
  buildAdminWorkflowOwnershipKey,
  canAutoResumeWorkflow,
  isAdminWorkflowOwnershipStale,
  isWorkflowTabOwned,
  type AdminWorkflowOwnership,
} from "@/lib/admin/workflow-policy";

const FLOW_KEY_PREFIX = "trr.admin.flow-key.v1:";
const OPERATION_SESSIONS_STORAGE_KEY = "trr.admin.operation-sessions.v1";

export type AdminOperationSessionStatus = "active" | "completed" | "failed" | "cancelled";

export type AdminOperationSessionRecord = {
  flowScope: string;
  flowKey: string;
  ownershipKey: string;
  tabSessionId: string;
  input: string;
  method: string;
  status: AdminOperationSessionStatus;
  operationId: string | null;
  runId: string | null;
  jobId: string | null;
  lastEventSeq: number;
  startedAtMs: number;
  updatedAtMs: number;
};

const isBrowser = (): boolean => typeof window !== "undefined";

const readAllSessions = (): Record<string, AdminOperationSessionRecord> => {
  if (!isBrowser()) return {};
  try {
    const raw = window.sessionStorage.getItem(OPERATION_SESSIONS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, AdminOperationSessionRecord>;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
};

const writeAllSessions = (sessions: Record<string, AdminOperationSessionRecord>): void => {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(OPERATION_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Best-effort only.
  }
};

const nowMs = (): number => Date.now();

const toWorkflowOwnership = (
  session: AdminOperationSessionRecord | null,
): AdminWorkflowOwnership | null => {
  if (!session) return null;
  return {
    tabSessionId: session.tabSessionId,
    flowKey: session.flowKey,
    status: session.status,
    updatedAtMs: session.updatedAtMs,
  };
};

export const pruneStaleAdminOperationSessions = (): void => {
  const sessions = readAllSessions();
  const nextEntries = Object.entries(sessions).filter(([, record]) => !isAdminWorkflowOwnershipStale(record));
  if (nextEntries.length === Object.keys(sessions).length) return;
  writeAllSessions(Object.fromEntries(nextEntries));
};

export const listAdminOperationSessions = (): AdminOperationSessionRecord[] => {
  pruneStaleAdminOperationSessions();
  return Object.values(readAllSessions());
};

export const getOrCreateAdminFlowKey = (flowScope: string): string => {
  if (!isBrowser()) return `server:${flowScope}`;
  const storageKey = `${FLOW_KEY_PREFIX}${flowScope}`;
  try {
    const existing = window.sessionStorage.getItem(storageKey);
    if (existing && existing.trim().length > 0) return existing;
    const generated =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${nowMs().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(storageKey, generated);
    return generated;
  } catch {
    return `${nowMs().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
};

export const getAdminOperationSession = (flowScope: string): AdminOperationSessionRecord | null => {
  const sessions = readAllSessions();
  const session = sessions[flowScope] ?? null;
  if (!session) return null;
  if (isAdminWorkflowOwnershipStale(session)) {
    delete sessions[flowScope];
    writeAllSessions(sessions);
    return null;
  }
  return session;
};

export const getAutoResumableAdminOperationSession = (
  flowScope: string,
): AdminOperationSessionRecord | null => {
  const session = getAdminOperationSession(flowScope);
  if (!session) return null;
  return canAutoResumeWorkflow(toWorkflowOwnership(session)) ? session : null;
};

export const hasTabOwnedActiveAdminOperationSessions = (): boolean =>
  listAdminOperationSessions().some(
    (session) => session.status === "active" && isWorkflowTabOwned(session),
  );

export const listTabOwnedActiveAdminOperationSessions = (): AdminOperationSessionRecord[] =>
  listAdminOperationSessions().filter(
    (session) => session.status === "active" && isWorkflowTabOwned(session),
  );

export const clearCompletedAdminOperationSessions = (): void => {
  const sessions = readAllSessions();
  const nextEntries = Object.entries(sessions).filter(([, record]) => record.status === "active");
  writeAllSessions(Object.fromEntries(nextEntries));
};

export const upsertAdminOperationSession = (
  flowScope: string,
  patch: Partial<AdminOperationSessionRecord> & Pick<AdminOperationSessionRecord, "flowKey" | "input" | "method">
): AdminOperationSessionRecord => {
  const sessions = readAllSessions();
  const existing = sessions[flowScope] ?? null;
  const tabSessionId = getOrCreateAdminTabSessionId();
  const next: AdminOperationSessionRecord = {
    flowScope,
    flowKey: patch.flowKey,
    ownershipKey: buildAdminWorkflowOwnershipKey(tabSessionId, patch.flowKey),
    tabSessionId,
    input: patch.input,
    method: patch.method,
    status: patch.status ?? existing?.status ?? "active",
    operationId:
      patch.operationId !== undefined
        ? patch.operationId
        : existing?.operationId ?? null,
    runId:
      patch.runId !== undefined
        ? patch.runId
        : existing?.runId ?? null,
    jobId:
      patch.jobId !== undefined
        ? patch.jobId
        : existing?.jobId ?? null,
    lastEventSeq:
      typeof patch.lastEventSeq === "number"
        ? patch.lastEventSeq
        : existing?.lastEventSeq ?? 0,
    startedAtMs: existing?.startedAtMs ?? nowMs(),
    updatedAtMs: patch.updatedAtMs ?? nowMs(),
  };
  sessions[flowScope] = next;
  writeAllSessions(sessions);
  return next;
};

export const markAdminOperationSessionStatus = (
  flowScope: string,
  status: AdminOperationSessionStatus,
): AdminOperationSessionRecord | null => {
  const sessions = readAllSessions();
  const existing = sessions[flowScope];
  if (!existing) return null;
  const next = {
    ...existing,
    status,
    updatedAtMs: nowMs(),
  };
  sessions[flowScope] = next;
  writeAllSessions(sessions);
  return next;
};

export const clearAdminOperationSession = (flowScope: string): void => {
  const sessions = readAllSessions();
  if (!(flowScope in sessions)) return;
  delete sessions[flowScope];
  writeAllSessions(sessions);
};
