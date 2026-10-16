"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { IngestionDiagnostics, IngestionReplayResult, IngestionReplay } from "@/lib/social/ingestion-client";
export function Diagnostics({ diagnostics, canReplay, canApply, pending, onReplay }: {
  diagnostics: IngestionDiagnostics; canReplay: boolean; canApply: boolean; pending: boolean;
  onReplay: (body: IngestionReplay) => Promise<IngestionReplayResult | undefined>;
}) {
  const [evidenceId, setEvidenceId] = useState("");
  const [parserVersion, setParserVersion] = useState("");
  const [result, setResult] = useState<IngestionReplayResult | null>(null);
  const evidence = diagnostics.evidence.find(item => item.evidence_id === evidenceId);
  const available = Boolean(evidence?.available && (evidence.pinned || Date.parse(evidence.expires_at) > Date.now()));
  const dryRunMatches = result?.mode === "dry_run" && result.evidence_id === evidenceId && result.parser_version === parserVersion.trim();
  const replay = async (apply: boolean) => { const next = await onReplay({ evidence_id: evidenceId, parser_version: parserVersion.trim(), apply }); if (next) setResult(next); };
  return <details className="mt-4 border-t border-zinc-200 pt-3"><summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em]">Diagnostics and evidence replay</summary>
    <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-zinc-600">{diagnostics.targets.map(target => <li key={`${target.stage}:${target.target_key}`}>{target.stage} · {target.target_key} · {target.outcome} · attempts {target.attempts}/{target.max_attempts} · requests {target.requests}{target.last_error_code ? ` · ${target.last_error_code}` : ""}{target.retry_at ? ` · Retry ${new Date(target.retry_at).toLocaleString()}` : ""}</li>)}</ul>
    {diagnostics.targets_truncated || diagnostics.evidence_truncated ? <p className="mt-2 text-xs text-amber-800">Diagnostics are limited to the first 100 records.</p> : null}
    {canReplay ? <div className="mt-3 space-y-2">
      <label className="block text-xs">Evidence<select aria-label="Replay evidence" value={evidenceId} onChange={event => { const id = event.target.value; setEvidenceId(id); setParserVersion(diagnostics.evidence.find(item => item.evidence_id === id)?.parser_version ?? ""); setResult(null); }} className="mt-1 block w-full border border-zinc-300 p-2"><option value="">Select captured evidence</option>{diagnostics.evidence.map(item => <option key={item.evidence_id} value={item.evidence_id}>{item.stage} · {item.target_key} · {item.available && (item.pinned || Date.parse(item.expires_at) > Date.now()) ? "Available" : "Unavailable / expired"}</option>)}</select></label>
      {evidence ? <p className="text-xs text-zinc-500">Captured {new Date(evidence.captured_at).toLocaleString()} · Expires {new Date(evidence.expires_at).toLocaleString()} · {evidence.pinned ? "Pinned" : "Unpinned"}</p> : null}
      <label className="block text-xs">Parser version<input aria-label="Replay parser version" className="ml-2 border border-zinc-300 p-1" value={parserVersion} onChange={event => { setParserVersion(event.target.value); setResult(null); }} /></label>
      <p className="text-xs text-zinc-500">Replay uses captured evidence and preserves its observation time. Dry run makes no writes or source requests.</p>
      <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={pending || !available || !parserVersion.trim()} onClick={() => void replay(false)}>Dry Run Replay</Button>{canApply ? <Button size="sm" variant="outline" disabled={pending || !available || !dryRunMatches} onClick={() => void replay(true)}>Apply Reviewed Replay</Button> : null}</div>
      {result ? <details className="border border-zinc-200 p-2"><summary className="cursor-pointer text-xs font-semibold">Review replay comparison</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(result.comparison, null, 2).slice(0, 20_000)}</pre>{JSON.stringify(result.comparison).length > 20_000 ? <p className="text-xs text-amber-800">Comparison preview is limited to 20,000 characters.</p> : null}</details> : null}
      {result ? <p className="text-xs text-zinc-700" role="status">{result.mode === "dry_run" ? "Dry run" : "Apply"} · {result.comparison.changed ? "Normalized result changed" : "No normalized changes"} · {result.writes} writes · {result.source_requests} source requests{result.receipt_id ? ` · Receipt ${result.receipt_id}` : ""}</p> : null}
    </div> : null}
  </details>;
}
