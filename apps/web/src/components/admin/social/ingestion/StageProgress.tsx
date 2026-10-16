"use client";
import type { IngestionProgress } from "@/lib/social/ingestion-client";
export function StageProgress({ progress }: { progress: IngestionProgress }) {
  return <div className="space-y-3" aria-label="Instagram ingestion stage progress">
    <p className="text-sm font-semibold text-zinc-900">Run {progress.run_id.slice(0, 8)} · {progress.state} · {progress.complete ? "All selected stages complete" : "Work remains"}</p>
    <p className="text-xs text-zinc-500">Last committed: {progress.last_committed_at ? new Date(progress.last_committed_at).toLocaleString() : "No committed results yet"} · {progress.engine} · {progress.workflow_version} · generation {progress.generation}</p>
    {progress.stages.map(stage => <div key={stage.stage} className="border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex flex-wrap justify-between gap-2 text-sm font-semibold"><span>{stage.stage.replaceAll("_", " ")}</span><span>{stage.complete ? "Complete" : stage.discovery_complete ? "Discovery sealed · outcomes pending" : "Discovery incomplete · total can grow"}</span></div>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
        {[["Total", stage.total], ["Committed", stage.committed], ["Cached satisfied", stage.cached_satisfied], ["Source unavailable", stage.source_unavailable], ["Unresolved", stage.unresolved]].map(([label, count]) => <div key={label}><dt className="text-zinc-500">{label}</dt><dd className="font-semibold text-zinc-900">{count}</dd></div>)}
      </dl>
      <p className="mt-2 text-xs text-zinc-500">Attempts {stage.attempts} · Requests {stage.requests}{stage.retry_at ? ` · Retry at ${new Date(stage.retry_at).toLocaleString()}` : ""}</p>
      {stage.blocked_reasons.length ? <p className="mt-1 text-xs text-amber-800">Blocked: {stage.blocked_reasons.join(", ")}</p> : null}
    </div>)}
  </div>;
}
