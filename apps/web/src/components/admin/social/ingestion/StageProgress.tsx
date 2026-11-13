"use client";
import { INSTAGRAM_TARGET_OUTCOME_LABELS, instagramRunStatusLabel, instagramScanStatusLabel, instagramVerificationLabel } from "@/lib/admin/instagram-counts";
import type { IngestionProgress } from "@/lib/social/ingestion-client";
export function StageProgress({ progress }: { progress: IngestionProgress }) {
  const evidence = progress as IngestionProgress & { scan_status?: string; verification_status?: string; verification_details?: unknown; final_acceptance?: boolean };
  const unavailable = progress.stages.reduce((count, stage) => count + stage.source_unavailable, 0);
  return <div className="space-y-3" aria-label="Instagram ingestion stage progress">
    <p className="text-sm font-semibold text-zinc-900">Run {progress.run_id.slice(0, 8)} · Run status: {instagramRunStatusLabel(progress.state, progress)}</p>
    <p className="text-xs text-zinc-600">Scan status: {instagramScanStatusLabel(evidence.scan_status)} · Verification: {instagramVerificationLabel(evidence)}</p>
    <p className="text-xs text-zinc-500">Run status, scan outcomes, and saved inventory are separate. Unavailable targets count as resolved outcomes. They do not establish data completeness.</p>
    <p className="text-xs text-zinc-500">Target resolution: {progress.complete ? `All selected targets resolved · ${unavailable} unavailable targets` : "Unresolved targets remain"}</p>
    <p className="text-xs text-zinc-500">Last result saved: {progress.last_committed_at ? new Date(progress.last_committed_at).toLocaleString() : "Unknown"} · {progress.engine} · {progress.workflow_version} · generation {progress.generation}</p>
    {progress.execution_hold_reason ? <p role="status" className="text-xs text-amber-800">Execution hold: {progress.execution_hold_reason}</p> : null}
    {progress.stages.map(stage => <div key={stage.stage} className="border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex flex-wrap justify-between gap-2 text-sm font-semibold"><span>{stage.stage.replaceAll("_", " ")}</span><span>{stage.complete ? `Targets resolved · ${stage.source_unavailable} unavailable targets` : stage.discovery_complete ? "Target discovery finished · outcomes pending" : "Target discovery open · total can grow"}</span></div>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
        {[["Total targets", stage.total], [INSTAGRAM_TARGET_OUTCOME_LABELS.committed, stage.committed], [INSTAGRAM_TARGET_OUTCOME_LABELS.cached_satisfied, stage.cached_satisfied], [INSTAGRAM_TARGET_OUTCOME_LABELS.source_unavailable, stage.source_unavailable], [INSTAGRAM_TARGET_OUTCOME_LABELS.unresolved, stage.unresolved]].map(([label, count]) => <div key={label}><dt className="text-zinc-500">{label}</dt><dd className="font-semibold text-zinc-900">{count}</dd></div>)}
      </dl>
      <p className="mt-2 text-xs text-zinc-500">Attempts {stage.attempts} · Requests {stage.requests}{stage.retry_at ? ` · Retry at ${new Date(stage.retry_at).toLocaleString()}` : ""}</p>
      {stage.blocked_reasons.length ? <p className="mt-1 text-xs text-amber-800">Blocked: {stage.blocked_reasons.join(", ")}</p> : null}
    </div>)}
  </div>;
}
