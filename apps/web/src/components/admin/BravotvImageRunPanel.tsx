"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminStream } from "@/lib/admin/admin-fetch";
import {
  formatBravotvRunStatus,
  getBravotvSourceOptions,
  getBravotvSourcesForSelection,
  parseOptionalNumber,
  type BravotvImageRunRecord,
  type BravotvRunMode,
  type BravotvSourceSelection,
} from "@/lib/admin/bravotv-image-runs";

type ArtifactPreviewResponse = {
  artifact: string;
  total?: number;
  items?: Array<Record<string, unknown>>;
  value?: unknown;
};

type Props = {
  mode: BravotvRunMode;
  targetId: string;
  title: string;
  className?: string;
  scopedShowId?: string | null;
  scopedShowName?: string | null;
  season?: number | null;
  onCompleted?: () => Promise<void> | void;
};

const DEFAULT_ARTIFACTS = [
  "merged_catalog",
  "imported_records",
  "review_candidates",
  "replacement_candidates",
] as const;

const formatTimestamp = (value?: string | null): string => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const getSummaryCount = (payload: Record<string, unknown> | null | undefined, key: string): number | null =>
  parseOptionalNumber(payload?.[key]);

const renderArtifactLine = (row: Record<string, unknown>): string => {
  const caption = typeof row.caption === "string" && row.caption.trim().length > 0 ? row.caption.trim() : null;
  const showName = typeof row.show_name === "string" && row.show_name.trim().length > 0 ? row.show_name.trim() : null;
  const mediaAssetId =
    typeof row.media_asset_id === "string" && row.media_asset_id.trim().length > 0
      ? row.media_asset_id.trim()
      : null;
  return caption ?? showName ?? mediaAssetId ?? JSON.stringify(row);
};

export function BravotvImageRunPanel({
  mode,
  targetId,
  title,
  className,
  scopedShowId,
  scopedShowName,
  season,
  onCompleted,
}: Props) {
  const sourceOptions = useMemo(() => getBravotvSourceOptions(mode), [mode]);
  const [sourceSelection, setSourceSelection] = useState<BravotvSourceSelection>(
    mode === "person" ? "all" : "getty",
  );
  const [running, setRunning] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latestRun, setLatestRun] = useState<BravotvImageRunRecord | null>(null);
  const [artifactPreviews, setArtifactPreviews] = useState<Record<string, ArtifactPreviewResponse | null>>({});

  const latestUrl =
    mode === "show"
      ? `/api/admin/trr-api/bravotv/images/shows/${targetId}/latest`
      : `/api/admin/trr-api/bravotv/images/people/${targetId}/latest`;
  const streamUrl =
    mode === "show"
      ? `/api/admin/trr-api/bravotv/images/shows/${targetId}/stream`
      : `/api/admin/trr-api/bravotv/images/people/${targetId}/stream`;

  const loadLatestRun = useCallback(async () => {
    try {
      const response = await fetch(latestUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`Failed to load latest run (${response.status})`);
      const payload = (await response.json()) as { run?: BravotvImageRunRecord | null };
      setLatestRun(payload.run ?? null);
      setError(null);
    } catch (loadError) {
      console.error("Failed to load BRAVOTV run", loadError);
      setError(loadError instanceof Error ? loadError.message : "Failed to load BRAVOTV run");
    }
  }, [latestUrl]);

  useEffect(() => {
    void loadLatestRun();
  }, [loadLatestRun]);

  useEffect(() => {
    const runId = latestRun?.id;
    const artifactPaths = latestRun?.artifact_paths ?? null;
    if (!runId || !artifactPaths) {
      setArtifactPreviews({});
      return;
    }
    let cancelled = false;
    const loadArtifacts = async () => {
      const next: Record<string, ArtifactPreviewResponse | null> = {};
      for (const artifactName of DEFAULT_ARTIFACTS) {
        if (!artifactPaths[artifactName]) continue;
        try {
          const response = await fetch(
            `/api/admin/trr-api/bravotv/images/runs/${runId}/artifacts/${artifactName}?offset=0&limit=10`,
            { cache: "no-store" },
          );
          if (!response.ok) continue;
          next[artifactName] = (await response.json()) as ArtifactPreviewResponse;
        } catch (artifactError) {
          console.warn(`Failed to load artifact ${artifactName}`, artifactError);
        }
      }
      if (!cancelled) setArtifactPreviews(next);
    };
    void loadArtifacts();
    return () => {
      cancelled = true;
    };
  }, [latestRun]);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setProgressMessage("Starting BRAVOTV image run...");
    setError(null);
    try {
      await adminStream(streamUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          ...(mode === "show" ? { show_id: targetId } : { person_id: targetId, show_id: scopedShowId ?? undefined }),
          show_name: scopedShowName ?? undefined,
          season: season ?? undefined,
          sources: getBravotvSourcesForSelection(mode, sourceSelection),
        }),
        timeoutMs: 10 * 60 * 1000,
        onEvent: async ({ event, payload }) => {
          if (event === "progress" && payload && typeof payload === "object") {
            const message = typeof payload.message === "string" ? payload.message : "Working...";
            setProgressMessage(message);
            return;
          }
          if (event === "complete") {
            setProgressMessage("Run complete. Reloading latest artifacts...");
            await loadLatestRun();
            if (onCompleted) await onCompleted();
            return;
          }
          if (event === "error") {
            const detail =
              payload && typeof payload === "object"
                ? ((payload.detail as string | undefined) ?? (payload.error as string | undefined) ?? "Run failed")
                : "Run failed";
            throw new Error(detail);
          }
        },
      });
      setProgressMessage("Run complete.");
    } catch (runError) {
      console.error("Failed to run BRAVOTV pipeline", runError);
      setError(runError instanceof Error ? runError.message : "Failed to run BRAVOTV pipeline");
      setProgressMessage(null);
    } finally {
      setRunning(false);
      await loadLatestRun();
    }
  }, [loadLatestRun, mode, onCompleted, scopedShowId, scopedShowName, season, sourceSelection, streamUrl, targetId]);

  const summary = latestRun?.summary ?? null;
  const importSummary = latestRun?.import_summary ?? null;
  const reviewSummary = latestRun?.review_summary ?? null;

  return (
    <section className={className ?? "rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">BRAVOTV Pipeline</p>
          <h3 className="mt-1 text-lg font-semibold text-zinc-900">{title}</h3>
          <p className="mt-1 text-sm text-zinc-600">
            Durable runs, gallery auto-import, and artifact-backed previews.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
          {sourceOptions.map((option) => {
            const isActive = sourceSelection === option.value;
            return (
              <button
                key={option.value}
                type="button"
                title={option.description}
                onClick={() => setSourceSelection(option.value)}
                disabled={running}
                className={
                  isActive
                    ? "rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50"
                    : "rounded-md px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-white disabled:opacity-50"
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleRun()}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M20 8a8 8 0 00-14-4M4 16a8 8 0 0014 4" />
          </svg>
          {running ? "Running..." : `Run ${mode === "show" ? "Show" : "Person"} Pipeline`}
        </button>
        <button
          type="button"
          onClick={() => void loadLatestRun()}
          disabled={running}
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
        >
          Refresh Latest Run
        </button>
        {progressMessage && <p className="text-sm text-zinc-600">{progressMessage}</p>}
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Status</p>
          <p className="mt-2 text-sm font-semibold text-zinc-900">{formatBravotvRunStatus(latestRun?.status)}</p>
          <p className="mt-1 text-xs text-zinc-600">Completed: {formatTimestamp(latestRun?.completed_at)}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Merged</p>
          <p className="mt-2 text-sm font-semibold text-zinc-900">
            {getSummaryCount(summary, "total_merged_records") ?? 0}
          </p>
          <p className="mt-1 text-xs text-zinc-600">Imported assets: {getSummaryCount(summary, "imported_assets") ?? 0}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Import</p>
          <p className="mt-2 text-sm font-semibold text-zinc-900">
            Links created: {getSummaryCount(importSummary, "links_created") ?? 0}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Supplemental assets: {getSummaryCount(importSummary, "supplemental_assets_upserted") ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Review</p>
          <p className="mt-2 text-sm font-semibold text-zinc-900">
            Needs review: {getSummaryCount(reviewSummary, "review_count") ?? 0}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Replacement pending: {getSummaryCount(reviewSummary, "replacement_pending_count") ?? 0}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {DEFAULT_ARTIFACTS.map((artifactName) => {
          const preview = artifactPreviews[artifactName];
          const items = preview?.items ?? [];
          return (
            <details key={artifactName} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3" open={artifactName === "imported_records"}>
              <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-800">
                {artifactName.replace(/_/g, " ")}
                {typeof preview?.total === "number" ? ` (${preview.total})` : ""}
              </summary>
              <div className="mt-3 space-y-2">
                {items.length === 0 ? (
                  <p className="text-sm text-zinc-500">No preview rows available yet.</p>
                ) : (
                  items.map((item, index) => (
                    <div key={`${artifactName}-${index}`} className="rounded-lg border border-zinc-200 bg-white p-3">
                      <p className="text-sm text-zinc-800">{renderArtifactLine(item)}</p>
                      {"google_reverse_image_search_url" in item && typeof item.google_reverse_image_search_url === "string" && (
                        <a
                          href={item.google_reverse_image_search_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-xs font-semibold text-sky-700 hover:text-sky-800"
                        >
                          Open Google reverse image search
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
