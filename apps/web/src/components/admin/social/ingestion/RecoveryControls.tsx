"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { IngestionProgress, IngestionDiagnostics, IngestionRetryTargets } from "@/lib/social/ingestion-client";
export function RecoveryControls({ progress, diagnostics, pending, onControl, onRetry }: {
  progress: IngestionProgress; diagnostics?: IngestionDiagnostics; pending: boolean;
  onControl: (action: "cancel" | "resume") => void; onRetry: (stage: IngestionRetryTargets["stage"], keys: IngestionRetryTargets["target_keys"]) => void;
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [stage, setStage] = useState<IngestionRetryTargets["stage"]>("post_details");
  const [selected, setSelected] = useState<string[]>([]);
  const targets = diagnostics?.targets.filter(target => target.stage === stage && target.outcome === "unresolved") ?? [];
  return <div className="mt-3 space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      {progress.allowed_actions.includes("cancel") ? confirmCancel ? <><span className="text-xs text-red-800">Cancel run {progress.run_id.slice(0, 8)}? Claimed work may finish.</span><Button size="sm" variant="outline" disabled={pending} onClick={() => { onControl("cancel"); setConfirmCancel(false); }}>Confirm cancel</Button><Button size="sm" variant="outline" onClick={() => setConfirmCancel(false)}>Keep running</Button></> : <Button size="sm" variant="outline" disabled={pending} onClick={() => setConfirmCancel(true)}>Cancel Run</Button> : null}
      {progress.allowed_actions.includes("resume") ? <Button size="sm" variant="outline" disabled={pending} onClick={() => onControl("resume")}>Resume Run</Button> : null}
    </div>
    {progress.allowed_actions.includes("retry_targets") && diagnostics ? <details className="border border-zinc-200 p-3"><summary className="cursor-pointer text-xs font-semibold">Retry selected unresolved targets</summary>
      <label className="mt-2 block text-xs">Stage <select aria-label="Retry stage" value={stage} onChange={event => { setStage(event.target.value as typeof stage); setSelected([]); }} className="ml-2 border border-zinc-300 p-1">{["post_details", "comments", "media"].map(value => <option key={value}>{value}</option>)}</select></label>
      <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">{targets.map(target => <label key={target.target_key} className="flex gap-2 text-xs"><input type="checkbox" checked={selected.includes(target.target_key)} onChange={event => setSelected(current => event.target.checked ? [...current, target.target_key] : current.filter(key => key !== target.target_key))} />{target.target_key} · {target.blocked_reason ?? target.last_error_code ?? "Unresolved"}</label>)}</div>
      {diagnostics?.targets_truncated ? <p className="mt-2 text-xs text-amber-800">Diagnostics show the first 100 targets. This action retries only the targets selected here.</p> : null}
      <Button size="sm" variant="outline" className="mt-2" disabled={pending || !selected.length} onClick={() => onRetry(stage, selected)}>Retry {selected.length} targets</Button>
    </details> : null}
  </div>;
}
