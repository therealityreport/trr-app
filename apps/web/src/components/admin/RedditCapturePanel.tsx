"use client";
import { useCallback, useEffect, useState } from "react";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { disabledRedditSettings, type RedditCaptureSettings, type RedditRefreshPolicy, type RedditWorkTarget, type RedditWorkflowJob, type RedditCoverage } from "@/lib/admin/reddit-capture-types";
type Json = Record<string, unknown>;
const buttonClass = "rounded border border-zinc-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50";
const inputClass = "rounded border border-zinc-300 p-2 text-sm";
const rows = (value: unknown): Json[] => Array.isArray(value) ? value.filter((row): row is Json => !!row && typeof row === "object") : [];
function Result({ value, emptyLabel = "No results yet." }: {
  value: unknown;
  emptyLabel?: string;
}) {
  if (value == null)
    return <p>{emptyLabel}</p>;
  if (Array.isArray(value))
    return value.length === 0 ? <span>None</span> : <ul className="space-y-2">{value.map((item, index) => <li key={index}><Result value={item} emptyLabel={emptyLabel}/></li>)}</ul>;
  if (typeof value === "object")
    return <dl className="grid gap-1 sm:grid-cols-2">{Object.entries(value as Json).map(([key, item]) => <div key={key}><dt className="font-medium">{key.replaceAll("_", " ")}</dt><dd><Result value={item} emptyLabel={emptyLabel}/></dd></div>)}</dl>;
  return <span className="break-words">{String(value)}</span>;
}
function CoverageSummary({ coverage, postId, selected, onToggle }: { coverage: RedditCoverage | null; postId?: string; selected: string[]; onToggle: (id: string, checked: boolean) => void }) {
  const posts = (coverage?.posts ?? []).filter(post => !postId || post.reddit_post_id === postId);
  return <div className="space-y-2">
    <h3 className="font-semibold">Capture coverage</h3>
    {!coverage && <p>Unknown. Legacy completion does not confirm capture coverage.</p>}
    {(coverage?.runs ?? []).map(run => <div key={run.id}><p>{run.contract_version === 2 ? `${run.satisfied ?? 0} satisfied · ${run.unresolved ?? 0} unresolved · ${run.requested ?? 0} requested` : "Unknown legacy capture evidence"}</p>{run.contract_version === 2 && run.coverage && <details className="rounded border border-zinc-200 p-2"><summary className="cursor-pointer text-sm">Coverage evidence · {run.id}</summary><Result value={run.coverage} emptyLabel="Not recorded" /></details>}</div>)}
    {postId && posts.length === 0 && <p>Post {postId}: unknown capture evidence.</p>}
    {posts.map(post => <div key={post.reddit_post_id} className="rounded border border-zinc-200 p-2">
      <label><input type="checkbox" checked={selected.includes(post.reddit_post_id)} onChange={event => onToggle(post.reddit_post_id, event.target.checked)} /> Post {post.reddit_post_id}</label>
      {(["comments", "media"] as const).map(phase => { const evidence = post.capture_state?.[phase]; return <p key={phase} className="text-sm">{phase === "comments" ? "Comments" : "Media"}: {evidence?.state?.replaceAll("_", " ") ?? "unknown"}{evidence?.successful_at ? ` · Last successful capture: ${evidence.successful_at}` : " · No confirmed successful capture"}{evidence?.next_retry_at ? ` · Retry after: ${evidence.next_retry_at}` : ""}{typeof evidence?.evidence?.error === "string" ? ` · Last error: ${evidence.evidence.error}` : ""}</p>; })}
    </div>)}
  </div>;
}

export default function RedditCapturePanel({ communityId, seasonId, postId, periodStart, periodEnd, containerKey }: {
  communityId: string;
  seasonId: string;
  postId?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  containerKey?: string;
}) {
  const base = `/api/admin/reddit/communities/${communityId}`;
  const [opened, setOpened] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [coverage, setCoverage] = useState<Json | null>(null);
  const [inventory, setInventory] = useState<Json | null>(null);
  const [settings, setSettings] = useState<RedditCaptureSettings>(disabledRedditSettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [persistedAiEnabled, setPersistedAiEnabled] = useState(false);
  const [runs, setRuns] = useState<Json[]>([]);
  const [runId, setRunId] = useState("");
  const [baseline, setBaseline] = useState("");
  const [targets, setTargets] = useState<RedditWorkTarget[]>([]);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string[]>(postId ? [postId] : []);
  const [policy, setPolicy] = useState<RedditRefreshPolicy>("missing");
  const [result, setResult] = useState<unknown>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [job, setJob] = useState<RedditWorkflowJob | null>(null);
  const [airtimes, setAirtimes] = useState("");
  useEffect(() => { setOpened(false); setCoverage(null); setSettingsLoaded(false); setPersistedAiEnabled(false); setRuns([]); setRunId(""); setTargets([]); setSelected(postId ? [postId] : []); setJob(null); setPreviewId(null); setResult(null); setError(""); }, [communityId, seasonId, postId]);
  const request = useCallback(async (url: string, method = "GET", body?: Json): Promise<Json> => {
    const response = await fetchAdminWithAuth(url, { method, cache: "no-store", ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) }, { allowDevAdminBypass: true });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "The request could not be completed.");
    return data;
  }, []);
  const action = async (work: () => Promise<void>) => { setBusy(true); setError(""); setStatus(""); try {
    await work();
  }
  catch (e) {
    setError(e instanceof Error ? e.message : "The request failed.");
  }
  finally {
    setBusy(false);
  } };
  const load = async () => {
    const query = `?season_id=${encodeURIComponent(seasonId)}`;
    const outcomes = await Promise.allSettled([request(`${base}/coverage${query}`), request(`${base}/settings${query}`), request(`/api/admin/reddit/runs?community_id=${communityId}&season_id=${seasonId}`)]);
    const errors: string[] = [];
    outcomes.forEach((outcome, index) => {
      if (outcome.status === "rejected") {
        errors.push(outcome.reason instanceof Error ? outcome.reason.message : "Unable to load operator data");
        return;
      }
      const data = outcome.value;
      if (index === 0)
        setCoverage(data);
      if (index === 1) {
        const raw = (data.settings ?? data) as Json;
        const value = (raw.schedule ? raw : { schedule: { enabled: raw.schedule_enabled === true, timezone: raw.timezone, episode_airtimes: raw.episode_airtimes, capture_payload: raw.capture_payload }, analysis: { enabled: raw.ai_enabled === true, scheduled_analysis_enabled: raw.scheduled_analysis_enabled === true, model: raw.model, per_run_token_cap: raw.per_run_token_cap, daily_token_budget: raw.daily_token_budget } }) as unknown as RedditCaptureSettings;
        setSettings({ schedule: { ...value.schedule, enabled: value.schedule?.enabled === true }, analysis: { ...value.analysis, enabled: value.analysis?.enabled === true } });
        setAirtimes((value.schedule?.episode_airtimes ?? []).join("\n"));
        setSettingsLoaded(true);
        setPersistedAiEnabled(value.analysis?.enabled === true);
      }
      if (index === 2)
        setRuns(rows(data.runs));
    });
    if (errors.length)
      throw new Error(errors.join(" "));
  };
  const acceptJob = (data: Json) => { const raw = (data.job ?? data) as Json; const next = { ...raw, status: raw.status ?? raw.state } as unknown as RedditWorkflowJob; if (next.id && next.status)
    setJob(next); if (next.status === "failed")
    setError(next.error || "The workflow failed."); setResult(next.result ?? data); const preview = next.result ?? data; if (typeof preview.preview_id === "string" || (preview.apply === false && typeof preview.id === "string"))
    setPreviewId(String(preview.preview_id ?? preview.id)); };
  useEffect(() => {
    if (!job?.id || !["queued", "pending", "running"].includes(job.status))
      return;
    let active = true;
    const timer = setTimeout(() => { void request(`/api/admin/reddit/jobs/${job.id}`).then(data => { if (active)
      acceptJob(data); }).catch(e => { if (active)
      setError(e.message); }); }, 2000);
    return () => { active = false; clearTimeout(timer); };
  }, [job, request]);
  const workflow = (name: string, body: Json) => action(async () => { acceptJob(await request(`${base}/${name}`, "POST", { season_id: seasonId, ...body })); setStatus("Request submitted."); });
  const loadTargets = async (nextOffset: number) => { const data = await request(`/api/admin/reddit/runs/${runId}/targets?limit=50&offset=${nextOffset}`); setTargets(rows(data.targets) as unknown as RedditWorkTarget[]); setOffset(nextOffset); };
  const capture = () => action(async () => { const data = await request(`${base}/discover`, "POST", { season_id: seasonId, refresh_policy: policy, selected_post_ids: selected, requested_phases: ["discovery", "comments", "media"], period_start: periodStart ?? undefined, period_end: periodEnd ?? undefined, container_key: containerKey, wait: false, mode: "sync_full" }); setResult(data); setStatus("Capture requested."); await load(); });
  const saveSettings = () => action(async () => {
    const episode_airtimes = airtimes.split(/\n/).map(value => value.trim()).filter(Boolean);
    if (settings.schedule.enabled && (!settings.schedule.timezone || !episode_airtimes.length || episode_airtimes.some(value => !/(Z|[+-]\d\d:\d\d)$/.test(value) || Number.isNaN(Date.parse(value)))))
      throw new Error("Scheduling requires a timezone and exact episode airtimes with a UTC offset.");
    if (settings.analysis.scheduled_analysis_enabled && !settings.analysis.enabled) throw new Error("Daily AI analysis requires AI analysis to be enabled with a model and usage limits.");
    if (settings.analysis.enabled && (!settings.analysis.model?.trim() || !(Number(settings.analysis.per_run_token_cap) > 0) || !(Number(settings.analysis.daily_token_budget) > 0)))
      throw new Error("AI analysis requires a model and positive usage limits.");
    const { capture_payload, ...schedule } = settings.schedule;
    await request(`${base}/settings?season_id=${seasonId}`, "PATCH", { schedule: { ...schedule, episode_airtimes, ...(capture_payload && Object.keys(capture_payload).length ? { capture_payload } : {}) }, analysis: settings.analysis });
    setPersistedAiEnabled(settings.analysis.enabled);
    setStatus("Settings saved.");
  });
  const aiReady = settingsLoaded && persistedAiEnabled && settings.analysis.enabled && !!settings.analysis.model && Number(settings.analysis.per_run_token_cap) > 0 && Number(settings.analysis.daily_token_budget) > 0;
  return <section className="my-4 rounded-xl border border-zinc-200 bg-white p-4" aria-label="Reddit capture tools">
  <button type="button" className={buttonClass} aria-expanded={opened} onClick={() => { setOpened(!opened); if (!opened)
    void action(load); }}>Capture and analysis tools</button>
  {opened && <div className="mt-4 space-y-5">
   <p className="text-sm text-zinc-600">New captures use the selected refresh policy. Historical maintenance runs only when requested here.</p>
   <div aria-live="polite" role="status">{busy ? "Working…" : status}{job ? ` ${job.status}` : ""}</div>
   {error && <p role="alert" className="text-red-700">{error}</p>}
   <CoverageSummary coverage={coverage as RedditCoverage | null} postId={postId} selected={selected} onToggle={(id, checked) => setSelected(value => checked ? [...new Set([...value, id])] : value.filter(postId => postId !== id))} />
   <div className="flex flex-wrap items-center gap-2"><label>Refresh policy <select aria-label="Refresh policy" className={inputClass} value={policy} onChange={e => setPolicy(e.target.value as RedditRefreshPolicy)}><option value="missing">Missing capture only</option><option value="stale">Missing or stale capture</option><option value="force">Force capture</option></select></label><button type="button" disabled={busy} className={buttonClass} onClick={() => void capture()}>Capture {selected.length ? `${selected.length} selected posts` : "window"}</button><button type="button" disabled={busy || !selected.length} className={buttonClass} onClick={() => void capture()}>Retry selected work</button></div>
   <div className="space-y-2"><h3 className="font-semibold">Run work</h3><label>Run <select aria-label="Run" className={inputClass} value={runId} onChange={e => { setRunId(e.target.value); setTargets([]); setOffset(0); }}><option value="">Select a run</option>{runs.map(run => <option key={String(run.run_id ?? run.id)} value={String(run.run_id ?? run.id)}>{String(run.status)} · {String(run.run_id ?? run.id)}</option>)}</select></label>
    <div className="flex flex-wrap gap-2">{["pause", "resume", "cancel", "retry"].map(control => <button type="button" key={control} disabled={busy || !runId} className={buttonClass} onClick={() => void action(async () => { setResult(await request(`/api/admin/reddit/runs/${runId}/control`, "POST", { action: control })); setStatus(`${control} requested.`); await load(); })}>{control === "retry" ? "Retry unresolved work" : control[0].toUpperCase() + control.slice(1)}</button>)}<button type="button" className={buttonClass} disabled={busy || !runId} onClick={() => void action(() => loadTargets(0))}>View work targets</button></div>
    {targets.length > 0 && <><ul>{targets.map(target => <li key={target.id ?? `${target.kind}:${target.target_key}`}><label><input type="checkbox" disabled={!target.reddit_post_id} checked={!!target.reddit_post_id && selected.includes(target.reddit_post_id)} onChange={e => { if (target.reddit_post_id)
      setSelected(value => e.target.checked ? [...new Set([...value, target.reddit_post_id!])] : value.filter(id => id !== target.reddit_post_id)); }}/> {target.kind} · {target.reddit_post_id ?? target.target_key} · {target.state}{target.error ? ` · ${target.error}` : ""}</label><details className="ml-4 text-sm"><summary>Target evidence</summary><Result emptyLabel="Not recorded" value={{ target: target.target_key, attempts: target.attempt_count, next_retry_at: target.next_retry_at ?? "Not scheduled", unresolved_comment_ids: target.result?.unresolved_ids ?? target.checkpoint?.pending_children, stopping_reason: target.result?.reason, saved_count: target.result?.saved_count, assets: target.result?.assets, source_evidence: target.result?.evidence && typeof target.result.evidence === "object" ? Object.fromEntries(Object.entries(target.result.evidence as Json).filter(([key]) => key !== "checkpoint")) : undefined }} /></details></li>)}</ul><button className={buttonClass} type="button" disabled={busy || offset === 0} onClick={() => void action(() => loadTargets(Math.max(0, offset - 50)))}>Previous targets</button><button className={buttonClass} type="button" disabled={busy || targets.length < 50} onClick={() => void action(() => loadTargets(offset + 50))}>Next targets</button></>}
    <label>Baseline run <input className={inputClass} value={baseline} onChange={e => setBaseline(e.target.value)}/></label><button type="button" className={buttonClass} disabled={busy || !runId || !baseline} onClick={() => void action(async () => setResult(await request(`/api/admin/reddit/runs/${runId}/compare?baseline_id=${encodeURIComponent(baseline)}`)))}>Compare runs</button></div>
   <div className="space-y-2"><h3 className="font-semibold">Classification and maintenance</h3><div className="flex flex-wrap gap-2"><button type="button" className={buttonClass} disabled={busy} onClick={() => void action(async () => { const data = await request(`${base}/reclassify`, "POST", { season_id: seasonId, apply: false }); acceptJob(data); const result = (data.result ?? (data.job as Json)?.result ?? data) as Json; setPreviewId(typeof result.preview_id === "string" ? result.preview_id : typeof result.id === "string" && result.apply === false ? result.id : null); })}>Preview classification</button><button type="button" className={buttonClass} disabled={busy || !previewId} onClick={() => void workflow("reclassify", { apply: true, preview_id: previewId })}>Apply preview</button><button type="button" className={buttonClass} disabled={busy} onClick={() => void action(async () => setInventory(await request(`${base}/legacy-inventory?season_id=${seasonId}`)))}>Inspect legacy inventory</button><button type="button" className={buttonClass} disabled={busy} onClick={() => void workflow("lifecycle", { legacy: false, ...(selected.length ? { post_ids: selected } : {}) })}>Run lifecycle maintenance</button><button type="button" className={buttonClass} disabled={busy || !inventory} onClick={() => void workflow("lifecycle", { legacy: true, ...(selected.length ? { post_ids: selected } : {}) })}>Run legacy maintenance</button></div>{inventory && <><Result value={inventory}/><ul aria-label="Legacy post selection">{rows(inventory.posts).map(post => { const id = String(post.reddit_post_id ?? ""); return <li key={id}><label><input type="checkbox" checked={selected.includes(id)} onChange={e => setSelected(value => e.target.checked ? [...new Set([...value, id])] : value.filter(postId => postId !== id))}/> {String(post.title ?? id)}</label></li>; })}</ul></>}</div>
   <fieldset disabled={busy || !settingsLoaded} className="space-y-3"><legend className="font-semibold">Schedules and AI settings</legend><p>Both features are disabled by default. Enable only after completing their settings.</p><label className="block"><input type="checkbox" checked={settings.schedule.enabled} onChange={e => setSettings(value => ({ ...value, schedule: { ...value.schedule, enabled: e.target.checked } }))}/> Enable schedule</label><label className="block">Timezone <input className={inputClass} value={settings.schedule.timezone ?? ""} placeholder="America/New_York" onChange={e => setSettings(value => ({ ...value, schedule: { ...value.schedule, timezone: e.target.value } }))}/></label><label className="block">Exact episode airtimes (one ISO instant per line)<textarea className={inputClass} value={airtimes} onChange={e => setAirtimes(e.target.value)}/></label><label className="block"><input type="checkbox" checked={settings.analysis.enabled} onChange={e => setSettings(value => ({ ...value, analysis: { ...value.analysis, enabled: e.target.checked } }))}/> Enable AI analysis</label><label className="block"><input type="checkbox" checked={settings.analysis.scheduled_analysis_enabled === true} onChange={e => setSettings(value => ({ ...value, analysis: { ...value.analysis, scheduled_analysis_enabled: e.target.checked } }))} /> Enable daily AI analysis</label><label className="block">Model <input className={inputClass} value={settings.analysis.model ?? ""} onChange={e => setSettings(value => ({ ...value, analysis: { ...value.analysis, model: e.target.value } }))}/></label>{(["per_run_token_cap", "daily_token_budget"] as const).map(key => <label key={key} className="block">{key === "per_run_token_cap" ? "Tokens per run" : "Daily token budget"} <input type="number" min="1" className={inputClass} value={settings.analysis[key] ?? ""} onChange={e => setSettings(value => ({ ...value, analysis: { ...value.analysis, [key]: Number(e.target.value) } }))}/></label>)}<button type="button" className={buttonClass} onClick={() => void saveSettings()}>Save settings</button></fieldset>
   <div className="flex flex-wrap gap-2"><button type="button" className={buttonClass} disabled={busy} onClick={() => void workflow("analysis", { kind: "deterministic", ...(selected.length ? { post_ids: selected } : {}) })}>Run deterministic analysis</button><button type="button" className={buttonClass} disabled={busy || !aiReady} onClick={() => void workflow("analysis", { kind: "ai", ...(selected.length ? { post_ids: selected } : {}) })}>Run AI analysis</button></div>
   {result != null && <div aria-label="Operator results" className="max-h-96 overflow-auto rounded bg-zinc-50 p-3 text-sm"><Result value={result}/></div>}
  </div>}
 </section>;
}
