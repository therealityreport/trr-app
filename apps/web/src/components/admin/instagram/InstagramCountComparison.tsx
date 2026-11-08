import { INSTAGRAM_COUNT_LABELS as labels, INSTAGRAM_COUNT_METRICS as metrics, formatInstagramCount, instagramExploratoryComparison, instagramSummaryObservation, type InstagramCommentCounts, type InstagramCommentCountsSummary } from "@/lib/admin/instagram-counts";

export function InstagramCountComparison({ counts }: { counts?: InstagramCommentCounts | null }) {
  const comparison = instagramExploratoryComparison(counts);
  const rows = [
    [metrics.post, counts?.post_reported_count, counts?.observations?.post_reported_count],
    [metrics.facebook, counts?.facebook_count_observed_on_instagram, counts?.observations?.facebook_count_observed_on_instagram],
    [metrics.threads, counts?.threads_count_observed_on_instagram, counts?.observations?.threads_count_observed_on_instagram],
  ] as const;
  return <details className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
    <summary className="cursor-pointer font-semibold">Count comparison</summary>
    <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {rows.map(([metric, value, observation]) => <div key={metric.label} className="min-w-0 break-words"><dt className="font-semibold">{metric.label}</dt><dd>{formatInstagramCount(value)} <span className="text-xs text-zinc-500">{metric.unit}</span></dd><dd className="mt-1 text-xs text-zinc-500">Scope: {metric.scope}. {metric.description}</dd><dd className="text-xs text-zinc-500">Observed: {observation?.observed_at ? new Date(observation.observed_at).toLocaleString() : "Unknown"} · Source: {observation?.source ?? "Unknown"} · Field: {observation?.source_field ?? "Unknown"} · Surface: {observation?.source_surface ?? "Unknown"}{observation?.unknown_reason ? ` · ${observation.unknown_reason}` : ""}{observation?.observed_in_latest_response === false ? " · Retained observation; absent from latest response" : ""}{observation?.evidence_reference ? ` · Evidence: ${observation.evidence_reference}` : ""}</dd></div>)}
      <div className="min-w-0 break-words"><dt className="font-semibold">{metrics.saved.label}</dt><dd>{formatInstagramCount(counts?.instagram_saved_count)} <span className="text-xs text-zinc-500">{metrics.saved.unit}</span></dd><dd className="mt-1 text-xs text-zinc-500">Scope: {metrics.saved.scope}. {metrics.saved.description}</dd><dd className="text-xs text-zinc-500">Inventory observed: {counts?.inventory_observed_at ? new Date(counts.inventory_observed_at).toLocaleString() : "Unknown"}</dd></div>
    </dl>
    <dl className="mt-3 grid gap-3 sm:grid-cols-2">
      {[[labels.topLevel, counts?.instagram_saved_top_level_count], [labels.replies, counts?.instagram_saved_reply_count], [labels.markedMissing, counts?.instagram_marked_missing_count], ["Saved records with unclassified thread position", counts?.instagram_saved_unclassified_count], [labels.difference, counts?.post_minus_saved_difference]].map(([label, value]) => <div key={String(label)}><dt className="font-semibold">{label}</dt><dd>{formatInstagramCount(value, label === labels.difference)}</dd></div>)}
    </dl>
    <p className="mt-3 text-xs">Saved inventory: {counts?.inventory_status ?? "Unknown"}. Inventory observed: {counts?.inventory_observed_at ? new Date(counts.inventory_observed_at).toLocaleString() : "Unknown"}.</p>
    {counts?.observation_conflicts?.length ? <details className="mt-2 text-xs text-amber-800"><summary className="cursor-pointer">Conflicting source observations: {counts.observation_conflicts.length}</summary><pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words">{JSON.stringify(counts.observation_conflicts, null, 2)}</pre></details> : null}
    <p className="mt-3 text-xs">{metrics.difference.description}</p>
    <p className="mt-3">Hypothetical combined count: {formatInstagramCount(comparison.sum)}</p>
    {comparison.missingInputs.length ? <p className="mt-1 text-xs">Missing inputs: {comparison.missingInputs.join(", ")}</p> : null}
    <p>Post count minus hypothetical combined count: {formatInstagramCount(comparison.difference, true)}</p>
    {comparison.agreement ? <p className="mt-2">{comparison.agreement}</p> : null}
    <p className="mt-2 text-xs">Hidden or removed comments: Not established.</p>
    <p className="mt-2 text-xs">These counts may overlap or come from different observation times. This is an exploratory comparison.</p>
  </details>;
}

export function InstagramCountSummary({ summary }: { summary?: InstagramCommentCountsSummary | null }) {
  return <dl className="space-y-1 text-xs text-zinc-600">
    <div><dt className="inline font-semibold">{labels.saved}: </dt><dd className="inline">{formatInstagramCount(summary?.instagram_saved_count)}</dd></div>
    {[[labels.topLevel, summary?.instagram_saved_top_level_count], [labels.replies, summary?.instagram_saved_reply_count], [labels.markedMissing, summary?.instagram_marked_missing_count], ["Saved records with unclassified thread position", summary?.instagram_saved_unclassified_count]].map(([label, value]) => <div key={String(label)}><dt className="inline font-semibold">{label}: </dt><dd className="inline">{formatInstagramCount(value)}</dd></div>)}
    {([[labels.post, "post_reported"], [labels.facebook, "facebook"], [labels.threads, "threads"]] as const).map(([label, source]) => <div key={source}><dt className="inline font-semibold">{label}: </dt><dd className="inline">{instagramSummaryObservation(summary, source)}</dd></div>)}
    <div><dt className="inline font-semibold">{labels.difference} (known subtotal): </dt><dd className="inline">{formatInstagramCount(summary?.post_minus_saved_difference_known_subtotal, true)}</dd></div>
    <div><dt className="inline font-semibold">Inventory observed: </dt><dd className="inline">{summary?.inventory_observed_at ? new Date(summary.inventory_observed_at).toLocaleString() : "Unknown"}</dd></div>
    <div><dt className="inline font-semibold">Source observation times and provenance: </dt><dd className="inline">Inspect each post. Subtotals can combine different observation times.</dd></div>
  </dl>;
}
