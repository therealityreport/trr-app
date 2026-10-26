"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ingestionErrorMessage, type IngestionReplay, type IngestionReplayResult } from "@/lib/social/ingestion-client";
import type { InstagramIngestionController } from "@/lib/social/ingestion-hooks";
import { StageProgress } from "./StageProgress";
import { RecoveryControls } from "./RecoveryControls";
import { RecentRuns } from "./RecentRuns";
import { Diagnostics } from "./Diagnostics";
export function InstagramIngestionPanel({ controller }: { controller: InstagramIngestionController }) {
  const [actionError, setActionError] = useState<string | null>(null);
  const run = controller.progress.data;
  const act = async (action: () => Promise<unknown>) => { setActionError(null); try { await action(); } catch (error) { setActionError(ingestionErrorMessage(error)); } };
  const replay = async (body: IngestionReplay): Promise<IngestionReplayResult | undefined> => { setActionError(null); try { return await controller.replay(controller.selectedRunId!, body); } catch (error) { setActionError(ingestionErrorMessage(error)); } };
  if (!controller.showPanel) return null;
  return <section className="mt-4 border border-zinc-200 bg-white p-4" aria-label="Durable Instagram ingestion">
    <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-xs font-semibold uppercase tracking-[0.14em]">Instagram Ingestion</h2><Button size="sm" variant="outline" onClick={() => void controller.refresh()}>Refresh</Button></div>
    {controller.capabilities.error ? <p role="alert" className="mb-3 text-xs text-amber-800">Instagram ingestion capabilities could not be loaded. {ingestionErrorMessage(controller.capabilities.error)} Refresh to retry before launching a run.</p> : controller.capabilities.isPending ? <p role="status" className="mb-3 text-xs text-zinc-500">Loading Instagram ingestion capabilities. Launches are paused until capabilities are available.</p> : null}
    {!controller.enabled && !controller.capabilitiesUnavailable ? <p className="mb-3 text-xs text-amber-800">New ingestion launches are disabled.{controller.capabilities.data?.disabled_reason ? ` ${controller.capabilities.data.disabled_reason}` : ""} Saved runs remain available for inspection and recovery.</p> : null}
    {controller.uncertainLaunch ? <div className="mb-3 border border-amber-200 bg-amber-50 p-3"><p className="text-xs text-amber-900">The launch response was not confirmed. Retry this exact request to recover its saved run identity before starting another run.</p><Button size="sm" variant="outline" className="mt-2" disabled={controller.pending || !controller.enabled} onClick={() => void act(() => controller.launch(controller.uncertainLaunch!))}>Retry Same Launch Request</Button></div> : null}
    {controller.activeRunId && controller.selectedRunId !== controller.activeRunId ? <p className="mb-3 text-xs text-zinc-500">Inspecting historical run. Active run {controller.activeRunId.slice(0, 8)} remains separate{controller.active ? ` · ${controller.active.state}` : ""}.</p> : null}
    {controller.active && controller.activeRunId !== controller.selectedRunId ? <div className="mb-3 border border-zinc-200 bg-zinc-50 p-3" aria-label="Active ingestion run controls"><p className="text-xs font-semibold">Active run {controller.active.run_id.slice(0, 8)} · {controller.active.state}</p><RecoveryControls key={controller.active.run_id} progress={controller.active} pending={controller.pending} onControl={action => void act(() => controller.control(action, controller.active!.run_id))} onRetry={() => {}} /></div> : null}
    {controller.progress.error ? <p role="status" className="mb-3 text-xs text-amber-800">{ingestionErrorMessage(controller.progress.error)}{run ? " Showing the last committed snapshot." : ""}</p> : null}
    {actionError ? <p role="alert" className="mb-3 text-xs text-red-800">{actionError}</p> : null}
    {run ? <><StageProgress progress={run} /><RecoveryControls key={run.run_id} progress={run} diagnostics={controller.diagnostics.data} pending={controller.pending} onControl={action => void act(() => controller.control(action, run.run_id))} onRetry={(stage, keys) => void act(() => controller.retryTargets(run.run_id, { stage, target_keys: keys }))} /></> : controller.progress.isFetching ? <p className="text-xs text-zinc-500">Loading committed progress…</p> : <p className="text-xs text-zinc-500">No ingestion run selected.</p>}
    {controller.diagnostics.error ? <p className="mt-3 text-xs text-amber-800">{ingestionErrorMessage(controller.diagnostics.error)}</p> : null}
    {controller.diagnostics.data ? <Diagnostics key={controller.selectedRunId} diagnostics={controller.diagnostics.data} pending={controller.pending} canReplay={run?.allowed_actions.includes("replay") === true} canApply={controller.capabilities.data?.replay_apply_enabled === true} onReplay={replay} /> : null}
    {controller.recent.error ? <p className="mt-3 text-xs text-amber-800">{ingestionErrorMessage(controller.recent.error)}</p> : null}
    <RecentRuns runs={controller.recent.data?.runs ?? []} selected={controller.selectedRunId} active={controller.activeRunId} onInspect={controller.inspect} />
  </section>;
}
