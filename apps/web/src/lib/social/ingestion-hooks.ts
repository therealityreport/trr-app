"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import {
  INGESTION_BASE, ingestionApi, IngestionRequestError,
  type IngestionLaunch, type IngestionProgress, type IngestionRetryTargets, type IngestionReplay,
} from "./ingestion-client";

export type IngestionView = { account: string; sourceScope: NonNullable<IngestionLaunch["source_scope"]>; dateStart?: string | null; dateEnd?: string | null; actor?: string };
export const isIngestionActive = (state?: string) => state === "queued" || state === "running";

export function ingestionPollInterval(input: { visible: boolean; progress?: IngestionProgress; error?: unknown; failures?: number; now?: number }): number | false {
  if (!input.visible || (input.progress && !isIngestionActive(input.progress.state))) return false;
  const now = input.now ?? Date.now();
  const futureRetry = input.progress?.stages.map(stage => stage.retry_at ? Date.parse(stage.retry_at) - now : 0).filter(delay => delay > 0) ?? [];
  const retryAfter = input.error instanceof IngestionRequestError ? input.error.problem.retry_after_ms ?? 0 : 0;
  if (input.error instanceof IngestionRequestError && !input.error.problem.retryable && input.error.problem.status < 500) return false;
  return Math.max(3000, retryAfter, futureRetry.length ? Math.min(...futureRetry) : 0, input.error ? Math.min(60_000, 3000 * 2 ** Math.min(input.failures ?? 1, 5)) : 0);
}

export class IngestionRequestIdentities {
  private readonly keys = new Map<string, string>();
  get(command: string, payload: unknown): string {
    const signature = JSON.stringify([command, payload]);
    let key = this.keys.get(signature);
    if (!key) { key = crypto.randomUUID(); this.keys.set(signature, key); }
    return key;
  }
  committed(command: string, payload: unknown) { this.keys.delete(JSON.stringify([command, payload])); }
}

export function useInstagramIngestion(view: IngestionView, enabled: boolean) {
  const [client] = useState(() => new QueryClient({ defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: true, refetchOnReconnect: true, staleTime: 0, gcTime: 300_000 },
    mutations: { retry: false },
  } }));
  const [visible, setVisible] = useState(() => typeof document === "undefined" || document.visibilityState !== "hidden");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [inspectedRunId, setInspectedRunId] = useState<string | null>(null);
  const [uncertainLaunch, setUncertainLaunch] = useState<IngestionLaunch | null>(null);
  const identities = useRef(new IngestionRequestIdentities());
  const account = view.account.replace(/^@/, "").trim().toLowerCase();
  const viewIdentity = JSON.stringify([account, view.sourceScope === "bravo" ? "network" : view.sourceScope, view.dateStart ?? null, view.dateEnd ?? null, view.actor ?? null]);
  const headers = useMemo(() => ({ "X-Ingestion-View-Scope": viewIdentity }), [viewIdentity]);
  useEffect(() => {
    const update = () => { setVisible(document.visibilityState !== "hidden"); };
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => { setActiveRunId(null); setInspectedRunId(null); setUncertainLaunch(null); identities.current = new IngestionRequestIdentities(); }, [account, view.actor]);
  // Match QueryClientProvider lifecycle, including React Strict Mode effect remounts.
  useEffect(() => { client.mount(); return () => { client.unmount(); }; }, [client]);
  const params = { path: { handle: account } };
  const capabilities = ingestionApi.useQuery("get", `${INGESTION_BASE}/capabilities`, {
    params, headers: { "X-Ingestion-View-Scope": JSON.stringify([account, view.actor ?? null]) },
  }, { enabled }, client);
  // History remains readable when only new launches are disabled.
  const recent = ingestionApi.useQuery("get", `${INGESTION_BASE}/runs/recent`, {
    params: { ...params, query: { source_scope: view.sourceScope, limit: 20 } }, headers,
  }, {
    enabled: enabled && typeof capabilities.data?.enabled === "boolean",
    refetchInterval: query => query.state.data?.runs?.some(run => isIngestionActive(run.state)) ? ingestionPollInterval({ visible, error: query.state.error, failures: query.state.errorUpdateCount }) : false,
    refetchIntervalInBackground: false,
  }, client);
  const discoveredActiveRunId = recent.data?.runs?.find(run => isIngestionActive(run.state))?.run_id ?? null;
  // Pin discovered work across date-filter changes; the selected history view is independent.
  useEffect(() => { if (discoveredActiveRunId) setActiveRunId(discoveredActiveRunId); }, [discoveredActiveRunId]);
  const currentActiveRunId = activeRunId ?? discoveredActiveRunId;
  const selectedRunId = inspectedRunId ?? currentActiveRunId ?? recent.data?.runs?.[0]?.run_id ?? null;
  const progress = ingestionApi.useQuery("get", `${INGESTION_BASE}/runs/{run_id}`, {
    params: { path: { handle: account, run_id: selectedRunId ?? "" } }, headers,
  }, {
    enabled: enabled && Boolean(selectedRunId),
    refetchInterval: query => ingestionPollInterval({ visible, progress: query.state.data, error: query.state.error, failures: query.state.errorUpdateCount }),
    refetchIntervalInBackground: false,
  }, client);
  // Keep the active run separate so inspecting history never changes the active command target.
  const activeProgress = ingestionApi.useQuery("get", `${INGESTION_BASE}/runs/{run_id}`, {
    params: { path: { handle: account, run_id: currentActiveRunId ?? "" } }, headers,
  }, {
    enabled: enabled && Boolean(currentActiveRunId) && selectedRunId !== currentActiveRunId,
    refetchInterval: query => ingestionPollInterval({ visible, progress: query.state.data, error: query.state.error, failures: query.state.errorUpdateCount }),
    refetchIntervalInBackground: false,
  }, client);
  const diagnosticsSnapshot = progress.data;
  const diagnosticsHeaders = {
    "X-Ingestion-View-Scope": JSON.stringify([viewIdentity, diagnosticsSnapshot?.generation, diagnosticsSnapshot?.state, diagnosticsSnapshot?.last_committed_at]),
  };
  const diagnostics = ingestionApi.useQuery("get", `${INGESTION_BASE}/runs/{run_id}/diagnostics`, {
    params: { path: { handle: account, run_id: selectedRunId ?? "" }, query: { limit: 100 } }, headers: diagnosticsHeaders,
  }, { enabled: enabled && Boolean(selectedRunId) && diagnosticsSnapshot?.run_id === selectedRunId }, client);
  const refresh = useCallback(async () => { await client.invalidateQueries(); }, [client]);
  const launchMutation = ingestionApi.useMutation("post", `${INGESTION_BASE}/runs`, { retry: false }, client);
  const cancelMutation = ingestionApi.useMutation("post", `${INGESTION_BASE}/runs/{run_id}/cancel`, { retry: false }, client);
  const resumeMutation = ingestionApi.useMutation("post", `${INGESTION_BASE}/runs/{run_id}/resume`, { retry: false }, client);
  const retryMutation = ingestionApi.useMutation("post", `${INGESTION_BASE}/runs/{run_id}/retry-targets`, { retry: false }, client);
  const replayMutation = ingestionApi.useMutation("post", `${INGESTION_BASE}/runs/{run_id}/replay`, { retry: false }, client);
  const launch = async (body: IngestionLaunch) => {
    if (capabilities.isPending || capabilities.isError) throw new Error("Instagram ingestion capabilities must be available before launching.");
    if (!capabilities.data?.enabled) throw new IngestionRequestError({ code: "INGESTION_DISABLED", status: 409, retryable: false, message: `New ingestion launches are disabled.${capabilities.data?.disabled_reason ? ` ${capabilities.data.disabled_reason}` : ""}` });
    if (!capabilities.data.supported_actions?.includes(body.action ?? "backfill")) throw new Error("This ingestion action is not supported.");
    if (account === "bravotv") {
      if (body.action === "resume_tail") throw new IngestionRequestError({ code: "BOUNDED_WINDOW_REQUIRED", status: 409, retryable: false, message: "Instagram history-tail launches are unavailable. Choose a bounded backfill." });
      if ((body.action ?? "backfill") === "backfill") {
        const start = Date.parse(body.date_start ?? "");
        const end = Date.parse(body.date_end ?? "");
        if (body.backfill_scope !== "bounded_window" || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
          throw new IngestionRequestError({ code: "BOUNDED_WINDOW_REQUIRED", status: 409, retryable: false, message: "Choose an explicit bounded date window before launching Instagram backfill." });
        }
      }
    }
    const command = `launch:${account}`;
    if (uncertainLaunch && JSON.stringify(uncertainLaunch) !== JSON.stringify(body)) {
      throw new Error("Confirm the previous launch request before starting another run.");
    }
    try {
      const result = await launchMutation.mutateAsync({ params: { ...params, header: { "Idempotency-Key": identities.current.get(command, body) } }, body });
      identities.current.committed(command, body);
      setUncertainLaunch(null);
      setActiveRunId(result.run_id); setInspectedRunId(null); void refresh(); return result;
    } catch (error) {
      if (!(error instanceof IngestionRequestError) || error.problem.retryable || error.problem.status >= 500) {
        setUncertainLaunch(body);
      }
      void recent.refetch();
      throw error;
    }
  };
  const control = async (action: "cancel" | "resume", runId: string) => {
    const command = `${account}:${runId}:${action}`;
    const init = { params: { path: { handle: account, run_id: runId }, header: { "Idempotency-Key": identities.current.get(command, {}) } }, body: {} };
    const result = await (action === "cancel" ? cancelMutation : resumeMutation).mutateAsync(init);
    identities.current.committed(command, {}); void refresh(); return result;
  };
  const retryTargets = async (runId: string, body: IngestionRetryTargets) => {
    const command = `${account}:${runId}:retry`;
    const result = await retryMutation.mutateAsync({ params: { path: { handle: account, run_id: runId }, header: { "Idempotency-Key": identities.current.get(command, body) } }, body });
    identities.current.committed(command, body); void refresh(); return result;
  };
  const replay = async (runId: string, body: IngestionReplay) => {
    const command = `${account}:${runId}:replay`;
    const result = await replayMutation.mutateAsync({ params: { path: { handle: account, run_id: runId }, header: { "Idempotency-Key": identities.current.get(command, body) } }, body });
    identities.current.committed(command, body); void refresh(); return result;
  };
  const active = currentActiveRunId === selectedRunId ? progress.data : activeProgress.data;
  const pending = [launchMutation, cancelMutation, resumeMutation, retryMutation, replayMutation].some(mutation => mutation.isPending);
  return { capabilities, recent, progress, diagnostics, launch, control, retryTargets, replay, pending, refresh, uncertainLaunch,
    activeRunId: currentActiveRunId, active, inspectedRunId, inspect: setInspectedRunId, selectedRunId,
    enabled: capabilities.data?.enabled === true && capabilities.isSuccess,
    capabilitiesUnavailable: capabilities.isPending || capabilities.isError,
    showPanel: enabled || Boolean(recent.data?.runs?.length || activeRunId || uncertainLaunch),
  };
}
export type InstagramIngestionController = ReturnType<typeof useInstagramIngestion>;
