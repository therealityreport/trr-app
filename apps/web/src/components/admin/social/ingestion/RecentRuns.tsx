"use client";
import type { IngestionRecentRun } from "@/lib/social/ingestion-client";
export function RecentRuns({ runs, selected, active, onInspect }: { runs: IngestionRecentRun[]; selected: string | null; active: string | null; onInspect: (run: string | null) => void }) {
  return <div className="mt-4 border-t border-zinc-200 pt-3"><h3 className="text-xs font-semibold uppercase tracking-[0.14em]">Recent ingestion runs</h3>
    {active && selected !== active ? <button className="mt-2 text-xs font-semibold underline" onClick={() => onInspect(null)}>Return to active run {active.slice(0, 8)}</button> : null}
    <ul className="mt-2 space-y-1">{runs.map(run => <li key={run.run_id}><button aria-pressed={selected === run.run_id} onClick={() => onInspect(run.run_id)} className="text-left text-xs text-zinc-700 hover:underline"><span className={selected === run.run_id ? "font-semibold" : ""}>{run.run_id.slice(0, 8)} · {run.state} · {run.intent.action} · {new Date(run.created_at).toLocaleString()}{run.run_id === active ? " · Active" : ""}</span></button></li>)}</ul>
  </div>;
}
