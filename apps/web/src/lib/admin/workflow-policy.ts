"use client";

import { getOrCreateAdminTabSessionId } from "@/lib/admin/tab-session";

export const ADMIN_WORKFLOW_STALE_MS = 6 * 60 * 60 * 1000;

export type AdminWorkflowStatus = "active" | "completed" | "failed" | "cancelled";

export type AdminWorkflowOwnership = {
  tabSessionId: string;
  flowKey: string;
  status: AdminWorkflowStatus;
  updatedAtMs: number;
};

const INVALID_TAB_SESSION_IDS = new Set(["", "server", "unavailable"]);

const normalizeValue = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

export const isValidAdminTabSessionId = (value: unknown): boolean => {
  const normalized = normalizeValue(value);
  return normalized.length > 0 && !INVALID_TAB_SESSION_IDS.has(normalized);
};

export const buildAdminWorkflowOwnershipKey = (tabSessionId: string, flowKey: string): string =>
  `${tabSessionId}::${flowKey}`;

export const isAdminWorkflowOwnershipStale = (
  ownership: Pick<AdminWorkflowOwnership, "updatedAtMs">,
  nowMs = Date.now(),
  staleAfterMs = ADMIN_WORKFLOW_STALE_MS,
): boolean => {
  if (!Number.isFinite(ownership.updatedAtMs)) return true;
  if (!Number.isFinite(staleAfterMs) || staleAfterMs <= 0) return false;
  return nowMs - ownership.updatedAtMs > staleAfterMs;
};

export const isWorkflowTabOwned = (
  ownership: Pick<AdminWorkflowOwnership, "tabSessionId">,
  tabSessionId = getOrCreateAdminTabSessionId(),
): boolean => {
  if (!isValidAdminTabSessionId(tabSessionId)) return false;
  return normalizeValue(ownership.tabSessionId) === normalizeValue(tabSessionId);
};

export const canAutoResumeWorkflow = (
  ownership: AdminWorkflowOwnership | null,
  tabSessionId = getOrCreateAdminTabSessionId(),
): boolean => {
  if (!ownership) return false;
  if (ownership.status !== "active") return false;
  if (!isWorkflowTabOwned(ownership, tabSessionId)) return false;
  if (isAdminWorkflowOwnershipStale(ownership)) return false;
  return true;
};

export const shouldExcludeCrossTabWorkflow = (
  ownership: Pick<AdminWorkflowOwnership, "tabSessionId">,
  tabSessionId = getOrCreateAdminTabSessionId(),
): boolean => !isWorkflowTabOwned(ownership, tabSessionId);
