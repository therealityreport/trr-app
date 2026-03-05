"use client";

import { getOrCreateAdminFlowKey } from "@/lib/admin/operation-session";
import { getOrCreateAdminTabSessionId } from "@/lib/admin/tab-session";
import {
  buildAdminWorkflowOwnershipKey,
  canAutoResumeWorkflow,
  isAdminWorkflowOwnershipStale,
  isWorkflowTabOwned,
  type AdminWorkflowStatus,
} from "@/lib/admin/workflow-policy";

const RUN_SESSIONS_STORAGE_KEY = "trr.admin.run-sessions.v1";

export type AdminRunSessionRecord = {
  flowScope: string;
  flowKey: string;
  ownershipKey: string;
  runId: string;
  tabSessionId: string;
  status: AdminWorkflowStatus;
  startedAtMs: number;
  updatedAtMs: number;
};

const isBrowser = (): boolean => typeof window !== "undefined";
const nowMs = (): number => Date.now();

const readAllRunSessions = (): Record<string, AdminRunSessionRecord> => {
  if (!isBrowser()) return {};
  try {
    const raw = window.sessionStorage.getItem(RUN_SESSIONS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, AdminRunSessionRecord>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeAllRunSessions = (records: Record<string, AdminRunSessionRecord>): void => {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(RUN_SESSIONS_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Best-effort only.
  }
};

export const pruneStaleAdminRunSessions = (): void => {
  const all = readAllRunSessions();
  const next = Object.entries(all).filter(([, session]) => !isAdminWorkflowOwnershipStale(session));
  if (next.length === Object.keys(all).length) return;
  writeAllRunSessions(Object.fromEntries(next));
};

export const getOrCreateAdminRunFlowKey = (flowScope: string): string =>
  getOrCreateAdminFlowKey(`run:${flowScope}`);

export const upsertAdminRunSession = (
  flowScope: string,
  patch: {
    runId: string;
    flowKey?: string;
    status?: AdminWorkflowStatus;
  },
): AdminRunSessionRecord => {
  const all = readAllRunSessions();
  const existing = all[flowScope] ?? null;
  const tabSessionId = getOrCreateAdminTabSessionId();
  const flowKey = patch.flowKey ?? existing?.flowKey ?? getOrCreateAdminRunFlowKey(flowScope);
  const next: AdminRunSessionRecord = {
    flowScope,
    flowKey,
    ownershipKey: buildAdminWorkflowOwnershipKey(tabSessionId, flowKey),
    runId: patch.runId,
    tabSessionId,
    status: patch.status ?? existing?.status ?? "active",
    startedAtMs: existing?.startedAtMs ?? nowMs(),
    updatedAtMs: nowMs(),
  };
  all[flowScope] = next;
  writeAllRunSessions(all);
  return next;
};

export const getAdminRunSession = (
  flowScope: string,
): AdminRunSessionRecord | null => {
  const all = readAllRunSessions();
  const session = all[flowScope] ?? null;
  if (!session) return null;
  if (isAdminWorkflowOwnershipStale(session)) {
    delete all[flowScope];
    writeAllRunSessions(all);
    return null;
  }
  return session;
};

export const getAutoResumableAdminRunSession = (
  flowScope: string,
): AdminRunSessionRecord | null => {
  const session = getAdminRunSession(flowScope);
  if (!session) return null;
  return canAutoResumeWorkflow(session) ? session : null;
};

export const markAdminRunSessionStatus = (
  flowScope: string,
  status: AdminWorkflowStatus,
): AdminRunSessionRecord | null => {
  const all = readAllRunSessions();
  const session = all[flowScope];
  if (!session) return null;
  const next = {
    ...session,
    status,
    updatedAtMs: nowMs(),
  };
  all[flowScope] = next;
  writeAllRunSessions(all);
  return next;
};

export const clearAdminRunSession = (flowScope: string): void => {
  const all = readAllRunSessions();
  if (!(flowScope in all)) return;
  delete all[flowScope];
  writeAllRunSessions(all);
};

export const listTabOwnedActiveAdminRunSessions = (): AdminRunSessionRecord[] => {
  pruneStaleAdminRunSessions();
  return Object.values(readAllRunSessions()).filter(
    (session) => session.status === "active" && isWorkflowTabOwned(session),
  );
};
