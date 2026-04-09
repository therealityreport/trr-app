"use client";

import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { useSharedPollingResource, useSharedSseResource } from "@/lib/admin/shared-live-resource";

export type AdminSocialLiveStatus = {
  health_dot: {
    queue_enabled: boolean;
    workers: {
      healthy: boolean;
      healthy_workers: number;
    };
    queue: {
      by_status: Record<string, number>;
    };
    updated_at?: string;
  } | null;
  queue_status: Record<string, unknown> | null;
  admin_operations: Record<string, unknown> | null;
  generated_at?: string | null;
  sequence?: number | null;
};

const LIVE_STATUS_URL = "/api/admin/trr-api/social/ingest/live-status";
const LIVE_STATUS_STREAM_URL = "/api/admin/trr-api/social/ingest/live-status/stream";
const LIVE_STATUS_TIMEOUT_MS = 30_000;

type SnapshotEnvelope<T> = {
  data: T;
  generated_at?: string | null;
  cache_age_ms?: number;
  stale?: boolean;
};

const unwrapLiveStatusPayload = (
  payload: AdminSocialLiveStatus | SnapshotEnvelope<AdminSocialLiveStatus>,
): AdminSocialLiveStatus => {
  if (payload && typeof payload === "object" && "data" in payload && payload.data && typeof payload.data === "object") {
    return {
      ...payload.data,
      generated_at: payload.generated_at ?? payload.data.generated_at,
    };
  }
  return payload as AdminSocialLiveStatus;
};

const readStreamErrorMessage = async (response: Response): Promise<string> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string; detail?: string };
    return payload.error ?? payload.detail ?? `Failed to connect to live status stream (${response.status})`;
  }
  const text = await response.text().catch(() => "");
  return text.trim() || `Failed to connect to live status stream (${response.status})`;
};

const consumeLiveStatusStream = async (
  signal: AbortSignal,
  onMessage: (payload: AdminSocialLiveStatus) => void,
): Promise<void> => {
  const response = await fetchAdminWithAuth(
    LIVE_STATUS_STREAM_URL,
    { method: "GET", cache: "no-store", signal },
    { allowDevAdminBypass: true },
  );
  if (!response.ok) {
    throw new Error(await readStreamErrorMessage(response));
  }
  if (!response.body) {
    throw new Error("Live status stream unavailable");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const processChunk = (chunk: string): void => {
    const trimmedChunk = chunk.trim();
    if (!trimmedChunk || trimmedChunk.startsWith(":")) return;

    let eventType = "message";
    const dataLines: string[] = [];
    for (const rawLine of trimmedChunk.split(/\r?\n/)) {
      if (rawLine.startsWith("event:")) {
        eventType = rawLine.slice("event:".length).trim() || "message";
        continue;
      }
      if (rawLine.startsWith("data:")) {
        dataLines.push(rawLine.slice("data:".length).trim());
      }
    }
    if (eventType !== "live_status" || dataLines.length === 0) return;
    onMessage(JSON.parse(dataLines.join("\n")) as AdminSocialLiveStatus);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundaryIndex = buffer.indexOf("\n\n");
      while (boundaryIndex >= 0) {
        processChunk(buffer.slice(0, boundaryIndex));
        buffer = buffer.slice(boundaryIndex + 2);
        boundaryIndex = buffer.indexOf("\n\n");
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) {
      processChunk(buffer);
    }
  } finally {
    reader.releaseLock();
  }
};

export const useAdminLiveStatus = (options: { shouldRun: boolean }) => {
  const sse = useSharedSseResource<AdminSocialLiveStatus>({
    key: "admin-social-live-status",
    shouldRun: options.shouldRun,
    reconnectIntervalMs: 5_000,
    connect: async ({ signal, publish }) => {
      await consumeLiveStatusStream(signal, (payload) => {
        publish({
          data: payload,
          error: null,
          connected: true,
          lastSuccessAtMs: Date.now(),
        });
      });
    },
  });

  const poll = useSharedPollingResource<AdminSocialLiveStatus>({
    key: "admin-social-live-status-fallback",
    shouldRun: options.shouldRun && !sse.connected,
    intervalMs: 10_000,
    fetchData: async (signal, request) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), LIVE_STATUS_TIMEOUT_MS);
      signal.addEventListener("abort", () => controller.abort(), { once: true });
      try {
        const url = request?.forceRefresh ? `${LIVE_STATUS_URL}?refresh=1` : LIVE_STATUS_URL;
        const response = await fetchAdminWithAuth(
          url,
          { method: "GET", cache: "no-store", signal: controller.signal },
          { allowDevAdminBypass: true },
        );
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${response.status}`);
        }
        return unwrapLiveStatusPayload((await response.json()) as AdminSocialLiveStatus);
      } finally {
        clearTimeout(timeout);
      }
    },
  });

  return sse.connected || sse.data
    ? {
        data: sse.data,
        error: sse.error,
        connected: sse.connected,
        lastFetched: sse.lastSuccessAt,
        refetch: sse.refetch,
      }
    : {
        data: poll.data,
        error: poll.error,
        connected: poll.connected,
        lastFetched: poll.lastSuccessAt,
        refetch: poll.refetch,
      };
};
