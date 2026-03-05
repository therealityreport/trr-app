"use client";

import { adminFetch, AdminRequestError, type AdminFetchWithTimeoutInit } from "@/lib/admin/admin-fetch";
import {
  getAutoResumableAdminOperationSession,
  markAdminOperationSessionStatus,
  upsertAdminOperationSession,
} from "@/lib/admin/operation-session";

export type CanonicalOperationStatus =
  | "queued"
  | "running"
  | "cancelling"
  | "cancelled"
  | "failed"
  | "completed";

export type NormalizedKickoffHandle = {
  operationId?: string;
  runId?: string;
  jobId?: string;
  executionOwner?: string;
  executionModeCanonical?: string;
  canonicalStatus: CanonicalOperationStatus;
  rawStatus?: string;
};

export type OperationMonitorState = {
  operationId: string;
  status: CanonicalOperationStatus;
  eventSeq: number;
  lastEventAt: string | null;
};

const normalizeToken = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseEventSeq = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed);
    }
  }
  return null;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const canonicalizeOperationStatus = (
  status: unknown,
  fallback: CanonicalOperationStatus = "queued",
): CanonicalOperationStatus => {
  const raw = normalizeToken(status)?.toLowerCase();
  if (!raw) return fallback;
  if (raw === "pending" || raw === "queued" || raw === "retrying" || raw === "scheduled") return "queued";
  if (raw === "running" || raw === "in_progress" || raw === "started" || raw === "processing" || raw === "attached") return "running";
  if (raw === "cancelling" || raw === "cancel_requested" || raw === "aborting") return "cancelling";
  if (raw === "cancelled" || raw === "canceled") return "cancelled";
  if (raw === "failed" || raw === "error" || raw === "timed_out") return "failed";
  if (
    raw === "completed" ||
    raw === "complete" ||
    raw === "succeeded" ||
    raw === "success" ||
    raw === "done" ||
    raw === "partial"
  ) {
    return "completed";
  }
  return fallback;
};

export const isCanonicalTerminalStatus = (status: CanonicalOperationStatus): boolean =>
  status === "completed" || status === "failed" || status === "cancelled";

export const normalizeKickoffHandle = (payload: unknown): NormalizedKickoffHandle => {
  const record = asRecord(payload);
  const runRecord = asRecord(record?.run);
  const operationId = normalizeToken(record?.operation_id) ?? normalizeToken(record?.operationId);
  const runId =
    normalizeToken(record?.run_id) ??
    normalizeToken(record?.runId) ??
    normalizeToken(runRecord?.run_id) ??
    normalizeToken(runRecord?.id);
  const jobId = normalizeToken(record?.job_id) ?? normalizeToken(record?.jobId) ?? normalizeToken(record?.id);
  const rawStatus =
    normalizeToken(record?.status) ??
    normalizeToken(runRecord?.status) ??
    normalizeToken(record?.state);
  return {
    ...(operationId ? { operationId } : {}),
    ...(runId ? { runId } : {}),
    ...(jobId ? { jobId } : {}),
    ...(normalizeToken(record?.execution_owner) ? { executionOwner: normalizeToken(record?.execution_owner)! } : {}),
    ...(normalizeToken(record?.execution_mode_canonical)
      ? { executionModeCanonical: normalizeToken(record?.execution_mode_canonical)! }
      : {}),
    ...(rawStatus ? { rawStatus } : {}),
    canonicalStatus: canonicalizeOperationStatus(rawStatus, operationId || runId || jobId ? "queued" : "completed"),
  };
};

const toSessionStatus = (
  status: CanonicalOperationStatus,
): "active" | "completed" | "failed" | "cancelled" => {
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  if (status === "cancelled") return "cancelled";
  return "active";
};

const readOperationStatus = (payload: unknown): CanonicalOperationStatus => {
  const record = asRecord(payload);
  return canonicalizeOperationStatus(record?.status, "running");
};

type MonitorCallbacks = {
  onState?: (state: OperationMonitorState) => void | Promise<void>;
  onStreamEvent?: (event: { event: string; payload: unknown }) => void | Promise<void>;
};

export type WaitForOperationOptions = MonitorCallbacks & {
  operationId: string;
  flowScope: string;
  flowKey: string;
  input: string;
  method?: string;
  requestHeaders?: HeadersInit;
  streamTimeoutMs?: number;
  statusTimeoutMs?: number;
  reconnectBackoffMs?: number[];
};

const parseSsePayload = (data: string): unknown => {
  if (!data.trim()) return null;
  try {
    return JSON.parse(data) as unknown;
  } catch {
    return data;
  }
};

const updateOperationSessionFromState = (
  options: Pick<WaitForOperationOptions, "flowScope" | "flowKey" | "input" | "method">,
  state: OperationMonitorState,
): void => {
  upsertAdminOperationSession(options.flowScope, {
    flowKey: options.flowKey,
    input: options.input,
    method: (options.method || "POST").toUpperCase(),
    operationId: state.operationId,
    lastEventSeq: state.eventSeq,
    status: toSessionStatus(state.status),
  });
  if (isCanonicalTerminalStatus(state.status)) {
    markAdminOperationSessionStatus(options.flowScope, toSessionStatus(state.status));
  }
};

const pollOperationStatus = async (
  options: WaitForOperationOptions,
  fallbackState: OperationMonitorState,
): Promise<OperationMonitorState> => {
  const response = await adminFetch(`/api/admin/trr-api/operations/${options.operationId}`, {
    method: "GET",
    headers: options.requestHeaders,
    timeoutMs: options.statusTimeoutMs ?? 20_000,
  });
  if (!response.ok) {
    throw new AdminRequestError({
      error: `Failed to fetch operation status (${response.status})`,
      status: response.status,
      retryable: response.status >= 500 || response.status === 429 || response.status === 408,
    });
  }
  const payload = (await response.json().catch(() => ({}))) as unknown;
  const record = asRecord(payload);
  const eventSeq =
    parseEventSeq(record?.event_seq) ??
    parseEventSeq(record?.latest_event_seq) ??
    fallbackState.eventSeq;
  const nextState: OperationMonitorState = {
    operationId: options.operationId,
    status: readOperationStatus(record),
    eventSeq,
    lastEventAt:
      normalizeToken(record?.updated_at) ??
      normalizeToken(record?.last_event_at) ??
      fallbackState.lastEventAt,
  };
  updateOperationSessionFromState(options, nextState);
  if (options.onState) await options.onState(nextState);
  return nextState;
};

const streamOperationOnce = async (
  options: WaitForOperationOptions,
  state: OperationMonitorState,
): Promise<OperationMonitorState> => {
  const response = await adminFetch(
    `/api/admin/trr-api/operations/${options.operationId}/stream?after_seq=${Math.max(0, state.eventSeq)}`,
    {
      method: "GET",
      headers: options.requestHeaders,
      timeoutMs: options.streamTimeoutMs ?? 45_000,
    } satisfies AdminFetchWithTimeoutInit,
  );

  if (!response.ok) {
    throw new AdminRequestError({
      error: `Failed to stream operation (${response.status})`,
      status: response.status,
      retryable: response.status >= 500 || response.status === 429 || response.status === 408,
    });
  }
  if (!response.body) {
    throw new AdminRequestError({
      error: "Operation stream unavailable",
      status: 502,
      retryable: true,
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentState = state;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

    let boundaryIndex = buffer.indexOf("\n\n");
    while (boundaryIndex !== -1) {
      const rawEvent = buffer.slice(0, boundaryIndex);
      buffer = buffer.slice(boundaryIndex + 2);

      const lines = rawEvent.split("\n").filter(Boolean);
      let eventType = "message";
      const dataLines: string[] = [];
      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trim());
        }
      }
      const payload = parseSsePayload(dataLines.join("\n"));
      const payloadRecord = asRecord(payload);
      const eventSeq = parseEventSeq(payloadRecord?.event_seq) ?? currentState.eventSeq;
      const statusFromPayload = readOperationStatus(payloadRecord);
      const statusFromEvent =
        eventType === "complete"
          ? "completed"
          : eventType === "error"
            ? canonicalizeOperationStatus(payloadRecord?.status, "failed")
            : statusFromPayload;
      currentState = {
        operationId: options.operationId,
        status: statusFromEvent,
        eventSeq,
        lastEventAt: new Date().toISOString(),
      };

      updateOperationSessionFromState(options, currentState);
      if (options.onStreamEvent) await options.onStreamEvent({ event: eventType, payload });
      if (options.onState) await options.onState(currentState);
      if (isCanonicalTerminalStatus(currentState.status)) {
        return currentState;
      }

      boundaryIndex = buffer.indexOf("\n\n");
    }
  }

  return currentState;
};

export const waitForOperationTerminalState = async (
  options: WaitForOperationOptions,
): Promise<OperationMonitorState> => {
  const resumable = getAutoResumableAdminOperationSession(options.flowScope);
  let state: OperationMonitorState = {
    operationId: options.operationId,
    status: "queued",
    eventSeq:
      resumable?.operationId === options.operationId
        ? Math.max(0, Number(resumable.lastEventSeq || 0))
        : 0,
    lastEventAt: null,
  };

  updateOperationSessionFromState(options, state);
  if (options.onState) await options.onState(state);

  const backoff = options.reconnectBackoffMs ?? [2_000, 5_000, 10_000, 15_000];
  for (let attempt = 0; attempt <= backoff.length; attempt += 1) {
    try {
      state = await streamOperationOnce(options, state);
      if (isCanonicalTerminalStatus(state.status)) return state;
      state = await pollOperationStatus(options, state);
      if (isCanonicalTerminalStatus(state.status)) return state;
    } catch (error) {
      state = await pollOperationStatus(options, state).catch(() => state);
      if (isCanonicalTerminalStatus(state.status)) return state;
      if (attempt >= backoff.length) {
        throw error;
      }
    }

    const waitMs = backoff[Math.min(attempt, backoff.length - 1)] ?? 15_000;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  return state;
};

export const monitorKickoffHandle = async (options: {
  handle: NormalizedKickoffHandle;
  operation: Omit<WaitForOperationOptions, "operationId">;
  waitForLegacyTerminal?: () => Promise<CanonicalOperationStatus>;
}): Promise<CanonicalOperationStatus> => {
  const { handle, operation, waitForLegacyTerminal } = options;
  if (handle.operationId) {
    try {
      const state = await waitForOperationTerminalState({
        ...operation,
        operationId: handle.operationId,
      });
      if (isCanonicalTerminalStatus(state.status)) {
        return state.status;
      }
    } catch {
      // Fall through to legacy fallback if available.
    }
  }
  if (waitForLegacyTerminal) {
    return waitForLegacyTerminal();
  }
  return handle.canonicalStatus;
};
