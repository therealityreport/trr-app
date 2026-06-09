"use client";

import Image from "next/image";
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
  "run_review",
  "merged_catalog",
  "imported_records",
  "review_candidates",
  "replacement_candidates",
  "missing_nup_lookups",
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

const getReviewReason = (row: Record<string, unknown>): string => {
  const rawReason = typeof row.reason === "string" ? row.reason : null;
  if (rawReason === "caption_match_ambiguous") return "source_mismatch";
  if (rawReason === "target_person_not_deterministic") return "ambiguous_people_match";
  if (rawReason === "person_assignment_needs_review") return "ambiguous_people_match";
  return rawReason?.trim() || "unmatched_source_row";
};

const formatReviewReason = (value: string): string =>
  value
    .split("_")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");

const getRecordValue = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const getStringValue = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
};

const getRecordArray = (value: unknown): Array<Record<string, unknown>> =>
  Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(getRecordValue(item))) : [];

const getCandidateRecords = (row: Record<string, unknown>): Array<Record<string, unknown>> => {
  const records: Array<Record<string, unknown>> = [];
  const directCandidate = getRecordValue(row.candidate);
  if (directCandidate) records.push(directCandidate);
  const perSource = getRecordValue(row.per_source);
  if (perSource) {
    for (const sourceRow of Object.values(perSource)) {
      const sourceRecord = getRecordValue(sourceRow);
      if (!sourceRecord) continue;
      records.push(sourceRecord);
      const nestedCandidate = getRecordValue(sourceRecord.candidate);
      if (nestedCandidate) records.push(nestedCandidate);
    }
  }
  return records;
};

const getDisplayBadges = (row: Record<string, unknown>): string[] => {
  const badges = new Set<string>();
  for (const candidate of getCandidateRecords(row)) {
    const source = getStringValue(candidate.source) ?? "source";
    const role = getStringValue(candidate.source_role);
    if (role) badges.add(`${source}: ${formatReviewReason(role)}`);
    if (candidate.display_eligible === true) badges.add(`${source}: Display OK`);
    if (candidate.display_eligible === false) badges.add(`${source}: Reference only`);
  }
  if (row.replacement_pending === true) badges.add("Replacement pending");
  return Array.from(badges).slice(0, 4);
};

const getSourceRoles = (row: Record<string, unknown>): string[] => {
  const roles = new Set<string>();
  for (const candidate of getCandidateRecords(row)) {
    const role = getStringValue(candidate.source_role);
    if (role) roles.add(role);
  }
  return Array.from(roles);
};

const itemMatchesSourceRole = (row: Record<string, unknown>, sourceRoleFilter: string): boolean =>
  sourceRoleFilter === "all" || getSourceRoles(row).includes(sourceRoleFilter);

const getImagePreviewUrl = (row: Record<string, unknown> | null): string | null => {
  if (!row) return null;
  const acquisition = getRecordValue(row.acquisition);
  const acquisitionUrl = getStringValue(acquisition?.hosted_url) ?? getStringValue(acquisition?.source_url);
  if (acquisitionUrl) return acquisitionUrl;
  const perSource = getRecordValue(row.per_source);
  const bravo = getRecordValue(perSource?.bravo);
  const nbcumv = getRecordValue(perSource?.nbcumv);
  const getty = getRecordValue(perSource?.getty);
  return (
    getStringValue(bravo?.source_url) ??
    getStringValue(nbcumv?.source_url) ??
    getStringValue(getty?.preview_image_url) ??
    getStringValue(getty?.source_url)
  );
};

const replacementKeyFor = (row: Record<string, unknown>, candidate: Record<string, unknown>): string =>
  `${getStringValue(row.group_id) ?? "group"}::${getStringValue(candidate.page_url) ?? JSON.stringify(candidate)}`;

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
  const [reviewReasonFilter, setReviewReasonFilter] = useState<string>("all");
  const [sourceRoleFilter, setSourceRoleFilter] = useState<string>("all");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [operatorNotes, setOperatorNotes] = useState<Record<string, string>>({});
  const [selectedReplacementKeys, setSelectedReplacementKeys] = useState<string[]>([]);
  const [bulkReplacementNote, setBulkReplacementNote] = useState("");
  const [selectedDuplicateGroup, setSelectedDuplicateGroup] = useState<Record<string, unknown> | null>(null);
  const [duplicatePrimaryByKey, setDuplicatePrimaryByKey] = useState<Record<string, string>>({});
  const [backfilling, setBackfilling] = useState(false);

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

  useEffect(() => {
    const runId = latestRun?.id;
    if (!runId || !latestRun?.artifact_paths?.run_review) return;
    let cancelled = false;
    const loadFilteredReviewCandidates = async () => {
      const params = new URLSearchParams({
        section: "review_candidates",
        offset: "0",
        limit: "10",
      });
      if (reviewReasonFilter !== "all") params.set("reason", reviewReasonFilter);
      if (sourceRoleFilter !== "all") params.set("source_role", sourceRoleFilter);
      try {
        const response = await fetch(`/api/admin/trr-api/bravotv/images/runs/${runId}/review?${params.toString()}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as ArtifactPreviewResponse;
        if (!cancelled) {
          setArtifactPreviews((current) => ({ ...current, review_candidates: payload }));
        }
      } catch (reviewError) {
        console.warn("Failed to load filtered BRAVOTV review candidates", reviewError);
      }
    };
    void loadFilteredReviewCandidates();
    return () => {
      cancelled = true;
    };
  }, [latestRun?.artifact_paths, latestRun?.id, reviewReasonFilter, sourceRoleFilter]);

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

  const handleApproveReplacement = useCallback(
    async (row: Record<string, unknown>, candidate: Record<string, unknown>) => {
      const runId = latestRun?.id;
      const groupId = getStringValue(row.group_id);
      const pageUrl = getStringValue(candidate.page_url);
      const sourceDomain = getStringValue(candidate.source_domain);
      if (!runId || !groupId || !pageUrl || !sourceDomain) return;
      setActionMessage("Approving replacement...");
      setError(null);
      try {
        const response = await fetch(
          `/api/admin/trr-api/bravotv/images/runs/${runId}/replacement-candidates/${groupId}/approve`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              media_asset_id: getStringValue(row.media_asset_id),
              page_url: pageUrl,
              source_domain: sourceDomain,
              expected_width: parseOptionalNumber(candidate.width),
              expected_height: parseOptionalNumber(candidate.height),
              note: operatorNotes[replacementKeyFor(row, candidate)]?.trim() || undefined,
            }),
          },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(getStringValue(payload.detail) ?? getStringValue(payload.error) ?? "Approval failed");
        setActionMessage("Replacement approved.");
        await loadLatestRun();
      } catch (approveError) {
        setError(approveError instanceof Error ? approveError.message : "Approval failed");
        setActionMessage(null);
      }
    },
    [latestRun?.id, loadLatestRun, operatorNotes],
  );

  const selectedReplacementItems = useMemo(() => {
    const selected = new Set(selectedReplacementKeys);
    const items: Array<{ row: Record<string, unknown>; candidate: Record<string, unknown>; key: string }> = [];
    for (const row of artifactPreviews.replacement_candidates?.items ?? []) {
      for (const candidate of getRecordArray(row.replacement_candidates)) {
        const key = replacementKeyFor(row, candidate);
        if (selected.has(key)) items.push({ row, candidate, key });
      }
    }
    return items;
  }, [artifactPreviews.replacement_candidates?.items, selectedReplacementKeys]);

  const handleBulkApproveReplacements = useCallback(async () => {
    const runId = latestRun?.id;
    if (!runId || selectedReplacementItems.length === 0) return;
    setActionMessage("Approving selected replacements...");
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/trr-api/bravotv/images/runs/${runId}/replacement-candidates/approve-bulk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            note: bulkReplacementNote.trim() || undefined,
            items: selectedReplacementItems.map(({ row, candidate, key }) => ({
              group_id: getStringValue(row.group_id),
              media_asset_id: getStringValue(row.media_asset_id),
              page_url: getStringValue(candidate.page_url),
              source_domain: getStringValue(candidate.source_domain),
              expected_width: parseOptionalNumber(candidate.width),
              expected_height: parseOptionalNumber(candidate.height),
              note: operatorNotes[key]?.trim() || undefined,
            })),
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(getStringValue(payload.detail) ?? getStringValue(payload.error) ?? "Bulk approval failed");
      const approved = parseOptionalNumber(payload.approved_count) ?? 0;
      const failed = parseOptionalNumber(payload.failed_count) ?? 0;
      setActionMessage(`Bulk approval complete: ${approved} approved${failed ? `, ${failed} failed` : ""}.`);
      setSelectedReplacementKeys([]);
      await loadLatestRun();
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "Bulk approval failed");
      setActionMessage(null);
    }
  }, [bulkReplacementNote, latestRun?.id, loadLatestRun, operatorNotes, selectedReplacementItems]);

  const handleResolveDuplicate = useCallback(
    async (group: Record<string, unknown>, action: "ignore" | "mark_duplicate") => {
      const runId = latestRun?.id;
      if (!runId) return;
      const groupIds = (Array.isArray(group.group_ids) ? group.group_ids : [])
        .map((value) => String(value).trim())
        .filter(Boolean);
      if (groupIds.length === 0) return;
      setActionMessage(action === "ignore" ? "Ignoring duplicate group..." : "Marking duplicate group...");
      setError(null);
      try {
        const response = await fetch(`/api/admin/trr-api/bravotv/images/runs/${runId}/duplicates/resolve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key_type: getStringValue(group.key_type) ?? "unknown",
            key: getStringValue(group.key) ?? groupIds.join(","),
            group_ids: groupIds,
            action,
            primary_group_id:
              action === "mark_duplicate"
                ? (duplicatePrimaryByKey[getStringValue(group.key) ?? ""] ?? groupIds[0])
                : undefined,
            note: operatorNotes[`duplicate:${getStringValue(group.key) ?? groupIds.join(",")}`]?.trim() || undefined,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(getStringValue(payload.detail) ?? getStringValue(payload.error) ?? "Duplicate action failed");
        }
        setActionMessage(action === "ignore" ? "Duplicate group ignored." : "Duplicate group marked.");
        await loadLatestRun();
      } catch (resolveError) {
        setError(resolveError instanceof Error ? resolveError.message : "Duplicate action failed");
        setActionMessage(null);
      }
    },
    [duplicatePrimaryByKey, latestRun?.id, loadLatestRun, operatorNotes],
  );

  const handleBackfillRun = useCallback(async () => {
    const runId = latestRun?.id;
    if (!runId) return;
    setBackfilling(true);
    setActionMessage("Starting NUP backfill run...");
    setError(null);
    try {
      const response = await fetch(`/api/admin/trr-api/bravotv/images/runs/${runId}/backfill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force_all: true }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(getStringValue(payload.detail) ?? getStringValue(payload.error) ?? "Backfill failed");
      const backfillRun = getRecordValue(payload.run);
      setActionMessage(`Backfill run complete${getStringValue(backfillRun?.id) ? `: ${getStringValue(backfillRun?.id)}` : ""}.`);
      await loadLatestRun();
      if (onCompleted) await onCompleted();
    } catch (backfillError) {
      setError(backfillError instanceof Error ? backfillError.message : "Backfill failed");
      setActionMessage(null);
    } finally {
      setBackfilling(false);
    }
  }, [latestRun?.id, loadLatestRun, onCompleted]);

  const summary = latestRun?.summary ?? null;
  const importSummary = latestRun?.import_summary ?? null;
  const reviewSummary = latestRun?.review_summary ?? null;
  const runReview = getRecordValue(artifactPreviews.run_review?.value);
  const gettyFamilyBackfill = getRecordValue(runReview?.getty_family_backfill);
  const gettyBackfill = getRecordValue(gettyFamilyBackfill?.getty_from_nup_sources);
  const nbcumvBackfill = getRecordValue(gettyFamilyBackfill?.nbcumv_from_getty_nup);
  const reviewReasonCounts = getRecordValue(runReview?.review_reason_counts);
  const reviewReasonLabels = getRecordValue(runReview?.review_reason_labels);
  const completedSourceCounts = getRecordValue(runReview?.source_counts) ?? getRecordValue(latestRun?.manifest?.counts);
  const reviewReasonOptions = useMemo(() => {
    const reasons = new Set<string>();
    if (reviewReasonCounts) {
      for (const reason of Object.keys(reviewReasonCounts)) reasons.add(reason);
    }
    for (const item of artifactPreviews.review_candidates?.items ?? []) {
      reasons.add(getReviewReason(item));
    }
    return Array.from(reasons).sort();
  }, [artifactPreviews.review_candidates?.items, reviewReasonCounts]);
  const runReviewSummary = getRecordValue(runReview?.summary);
  const duplicateGroups = getRecordArray(runReview?.duplicate_groups).slice(0, 5);
  const sourceRoleOptions = useMemo(() => {
    const roles = new Set<string>(["reference_metadata", "original", "editorial_context"]);
    for (const artifact of DEFAULT_ARTIFACTS) {
      for (const item of artifactPreviews[artifact]?.items ?? []) {
        for (const role of getSourceRoles(item)) roles.add(role);
      }
    }
    return Array.from(roles).sort();
  }, [artifactPreviews]);

  useEffect(() => {
    if (reviewReasonFilter !== "all" && !reviewReasonOptions.includes(reviewReasonFilter)) {
      setReviewReasonFilter("all");
    }
  }, [reviewReasonFilter, reviewReasonOptions]);

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
          disabled={running || backfilling}
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
        >
          Refresh Latest Run
        </button>
        {latestRun?.id && (
          <button
            type="button"
            onClick={() => void handleBackfillRun()}
            disabled={running || backfilling}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
          >
            {backfilling ? "Backfilling..." : "Backfill Getty / NBCUMV NUP"}
          </button>
        )}
        {progressMessage && <p className="text-sm text-zinc-600">{progressMessage}</p>}
        {actionMessage && <p className="text-sm text-zinc-600">{actionMessage}</p>}
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
          const rawItems = preview?.items ?? [];
          const items =
            artifactName === "review_candidates" && reviewReasonFilter !== "all"
              ? rawItems.filter((item) => getReviewReason(item) === reviewReasonFilter)
              : artifactName === "merged_catalog" && sourceRoleFilter !== "all"
                ? rawItems.filter((item) => itemMatchesSourceRole(item, sourceRoleFilter))
                : rawItems;
          if (artifactName === "run_review") {
            return (
              <details key={artifactName} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3" open>
                <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-800">
                  Run review summary
                </summary>
                {!runReview ? (
                  <p className="mt-3 text-sm text-zinc-500">No run review artifact available yet.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    <div className="grid gap-2 sm:grid-cols-3">
                      {[
                        ["Merged", runReviewSummary?.total_merged_records],
                        ["Review", runReviewSummary?.total_review_candidates],
                        ["Replacements", runReviewSummary?.total_replacement_pending],
                      ].map(([label, value]) => (
                        <div key={label as string} className="rounded-lg border border-zinc-200 bg-white p-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                            {label as string}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-zinc-900">
                            {parseOptionalNumber(value) ?? 0}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {[
                        ["Getty NUP added", gettyBackfill?.added],
                        ["NBCUMV added", nbcumvBackfill?.added],
                        ["NUP misses", runReviewSummary?.total_missing_nup_lookups],
                      ].map(([label, value]) => (
                        <div key={label as string} className="rounded-lg border border-emerald-100 bg-white p-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                            {label as string}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-zinc-900">
                            {parseOptionalNumber(value) ?? 0}
                          </p>
                        </div>
                      ))}
                    </div>
                    {completedSourceCounts && Object.keys(completedSourceCounts).length > 0 && (
                      <div className="rounded-lg border border-zinc-200 bg-white p-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          Completed source counts
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {Object.entries(completedSourceCounts)
                            .filter(([, value]) => parseOptionalNumber(value) !== null)
                            .map(([source, value]) => (
                              <span
                                key={source}
                                className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-700"
                              >
                                {formatReviewReason(source)}: {parseOptionalNumber(value) ?? 0}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {reviewReasonOptions.length === 0 ? (
                        <p className="text-sm text-zinc-500">No review reason buckets reported.</p>
                      ) : (
                        reviewReasonOptions.map((reason) => {
                          const label =
                            typeof reviewReasonLabels?.[reason] === "string"
                              ? (reviewReasonLabels[reason] as string)
                              : formatReviewReason(reason);
                          const count = parseOptionalNumber(reviewReasonCounts?.[reason]) ?? 0;
                          return (
                            <button
                              key={reason}
                              type="button"
                              onClick={() => setReviewReasonFilter(reason)}
                              className={
                                reviewReasonFilter === reason
                                  ? "rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white"
                                  : "rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                              }
                            >
                              {label} ({count})
                            </button>
                          );
                        })
                      )}
                      {reviewReasonFilter !== "all" && (
                        <button
                          type="button"
                          onClick={() => setReviewReasonFilter("all")}
                          className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                        >
                          Clear filter
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        Source role
                      </span>
                      <button
                        type="button"
                        onClick={() => setSourceRoleFilter("all")}
                        className={
                          sourceRoleFilter === "all"
                            ? "rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white"
                            : "rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                        }
                      >
                        All roles
                      </button>
                      {sourceRoleOptions.map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setSourceRoleFilter(role)}
                          className={
                            sourceRoleFilter === role
                              ? "rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white"
                              : "rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          }
                        >
                          {formatReviewReason(role)}
                        </button>
                      ))}
                    </div>
                    {duplicateGroups.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          Duplicate groups
                        </p>
                        {duplicateGroups.map((group) => {
                          const groupIds = Array.isArray(group.group_ids) ? group.group_ids.join(", ") : "";
                          return (
                            <div key={`${group.key_type}-${group.key}`} className="rounded-lg border border-zinc-200 bg-white p-2">
                              <p className="text-xs font-semibold text-zinc-800">{getStringValue(group.key) ?? "Duplicate group"}</p>
                              <p className="mt-1 text-xs text-zinc-500">{groupIds}</p>
                              <button
                                type="button"
                                onClick={() => setSelectedDuplicateGroup(group)}
                                className="mt-2 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                              >
                                Open drawer
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </details>
            );
          }
          return (
            <details key={artifactName} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3" open={artifactName === "imported_records"}>
              <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-800">
                {artifactName.replace(/_/g, " ")}
                {typeof preview?.total === "number" ? ` (${items.length}${items.length === preview.total ? "" : ` of ${preview.total}`})` : ""}
              </summary>
              {artifactName === "review_candidates" && reviewReasonOptions.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Reason</span>
                  <button
                    type="button"
                    onClick={() => setReviewReasonFilter("all")}
                    className={
                      reviewReasonFilter === "all"
                        ? "rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white"
                        : "rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                    }
                  >
                    All
                  </button>
                  {reviewReasonOptions.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setReviewReasonFilter(reason)}
                      className={
                        reviewReasonFilter === reason
                          ? "rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white"
                          : "rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                      }
                    >
                      {typeof reviewReasonLabels?.[reason] === "string"
                        ? (reviewReasonLabels[reason] as string)
                        : formatReviewReason(reason)}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-3 space-y-2">
                {artifactName === "replacement_candidates" && selectedReplacementItems.length > 0 && (
                  <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-sky-900">
                        {selectedReplacementItems.length} replacement
                        {selectedReplacementItems.length === 1 ? "" : "s"} selected
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleBulkApproveReplacements()}
                        className="rounded-md bg-sky-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sky-800"
                      >
                        Approve selected
                      </button>
                    </div>
                    <textarea
                      value={bulkReplacementNote}
                      onChange={(event) => setBulkReplacementNote(event.target.value)}
                      rows={2}
                      className="mt-2 w-full rounded-md border border-sky-200 bg-white px-2 py-1 text-xs text-zinc-800"
                      placeholder="Optional note for this bulk approval"
                    />
                  </div>
                )}
                {items.length === 0 ? (
                  <p className="text-sm text-zinc-500">No preview rows available yet.</p>
                ) : (
                  items.map((item, index) => (
                    <div key={`${artifactName}-${index}`} className="rounded-lg border border-zinc-200 bg-white p-3">
                      {artifactName === "review_candidates" && (
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          {typeof reviewReasonLabels?.[getReviewReason(item)] === "string"
                            ? (reviewReasonLabels[getReviewReason(item)] as string)
                            : formatReviewReason(getReviewReason(item))}
                        </p>
                      )}
                      {getDisplayBadges(item).length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {getDisplayBadges(item).map((badge) => (
                            <span
                              key={badge}
                              className={
                                badge.includes("Display OK")
                                  ? "rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
                                  : badge.includes("Reference only") || badge.includes("Replacement pending")
                                    ? "rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
                                    : "rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600"
                              }
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      )}
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
                      {artifactName === "replacement_candidates" && getRecordArray(item.replacement_candidates).length > 0 && (
                        <div className="mt-3 space-y-2">
                          {getRecordArray(item.replacement_candidates).slice(0, 3).map((candidate) => (
                            <div key={getStringValue(candidate.page_url) ?? JSON.stringify(candidate)} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-2">
                              <label className="flex min-w-0 flex-1 items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedReplacementKeys.includes(replacementKeyFor(item, candidate))}
                                  onChange={(event) => {
                                    const key = replacementKeyFor(item, candidate);
                                    setSelectedReplacementKeys((current) =>
                                      event.target.checked
                                        ? Array.from(new Set([...current, key]))
                                        : current.filter((value) => value !== key),
                                    );
                                  }}
                                  className="mt-1"
                                />
                                <span className="min-w-0">
                                  <span className="block truncate text-xs font-semibold text-zinc-800">
                                    {getStringValue(candidate.source_domain) ?? "Replacement source"}
                                  </span>
                                  <span className="block truncate text-xs text-zinc-500">
                                    {getStringValue(candidate.title) ?? getStringValue(candidate.page_url) ?? "Untitled"}
                                  </span>
                                </span>
                              </label>
                              <textarea
                                value={operatorNotes[replacementKeyFor(item, candidate)] ?? ""}
                                onChange={(event) =>
                                  setOperatorNotes((current) => ({
                                    ...current,
                                    [replacementKeyFor(item, candidate)]: event.target.value,
                                  }))
                                }
                                rows={2}
                                className="min-w-[180px] flex-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-800"
                                placeholder="Optional approval note"
                              />
                              <button
                                type="button"
                                onClick={() => void handleApproveReplacement(item, candidate)}
                                className="rounded-md bg-sky-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sky-800"
                              >
                                Approve
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </details>
          );
        })}
      </div>
      {selectedDuplicateGroup && (
        <div className="mt-5 rounded-xl border border-zinc-300 bg-white p-4 shadow-sm">
          {(() => {
            const groupIds = (Array.isArray(selectedDuplicateGroup.group_ids) ? selectedDuplicateGroup.group_ids : [])
              .map((value) => String(value).trim())
              .filter(Boolean);
            const drawerKey = getStringValue(selectedDuplicateGroup.key) ?? groupIds.join(",");
            const selectedPrimary = duplicatePrimaryByKey[drawerKey] ?? groupIds[0] ?? "";
            const mergedItems = artifactPreviews.merged_catalog?.items ?? [];
            return (
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      Duplicate review
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">
                      {getStringValue(selectedDuplicateGroup.key) ?? "Duplicate group"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDuplicateGroup(null)}
                    className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    Close
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {groupIds.map((groupId) => {
                    const record = mergedItems.find((item) => getStringValue(item.id) === groupId) ?? null;
                    const previewUrl = getImagePreviewUrl(record);
                    return (
                      <label
                        key={groupId}
                        className={
                          selectedPrimary === groupId
                            ? "rounded-lg border border-zinc-900 bg-zinc-50 p-3"
                            : "rounded-lg border border-zinc-200 bg-white p-3"
                        }
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name={`duplicate-primary-${drawerKey}`}
                            checked={selectedPrimary === groupId}
                            onChange={() =>
                              setDuplicatePrimaryByKey((current) => ({
                                ...current,
                                [drawerKey]: groupId,
                              }))
                            }
                            className="mt-1"
                          />
                          <div className="min-w-0 flex-1">
                            {previewUrl ? (
                              <Image
                                src={previewUrl}
                                alt=""
                                width={320}
                                height={112}
                                unoptimized
                                className="mb-2 h-28 w-full rounded-md object-cover"
                              />
                            ) : (
                              <div className="mb-2 flex h-28 items-center justify-center rounded-md bg-zinc-100 text-xs text-zinc-500">
                                No preview
                              </div>
                            )}
                            <p className="truncate text-xs font-semibold text-zinc-800">{groupId}</p>
                            <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                              {record ? renderArtifactLine(record) : "Record is outside the loaded preview page."}
                            </p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <textarea
                  value={operatorNotes[`duplicate:${drawerKey}`] ?? ""}
                  onChange={(event) =>
                    setOperatorNotes((current) => ({
                      ...current,
                      [`duplicate:${drawerKey}`]: event.target.value,
                    }))
                  }
                  rows={2}
                  className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-800"
                  placeholder="Optional duplicate-resolution note"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleResolveDuplicate(selectedDuplicateGroup, "ignore")}
                    className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    Ignore group
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleResolveDuplicate(selectedDuplicateGroup, "mark_duplicate")}
                    className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white"
                  >
                    Mark non-primary duplicates
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </section>
  );
}
