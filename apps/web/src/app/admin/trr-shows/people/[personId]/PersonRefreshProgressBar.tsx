"use client";

import { useEffect, useState } from "react";
import {
  formatGettySubtaskCountLabel,
  formatPersonRefreshPhaseLabel,
  type PersonGettyProgressState,
  type PersonRefreshPipelineStepState,
  type PersonRefreshSourceProgressState,
} from "./refresh-progress";

export function RefreshProgressBar({
  show,
  phase,
  message,
  current,
  total,
  lastEventAt,
  steps,
  sourceProgress,
  gettyProgress,
}: {
  show: boolean;
  phase?: string | null;
  message?: string | null;
  current?: number | null;
  total?: number | null;
  lastEventAt?: number | null;
  steps?: PersonRefreshPipelineStepState[] | null;
  sourceProgress?: PersonRefreshSourceProgressState[] | null;
  gettyProgress?: PersonGettyProgressState | null;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!show) return;
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [show]);

  if (!show) return null;

  const hasCounts =
    typeof current === "number" &&
    Number.isFinite(current) &&
    typeof total === "number" &&
    Number.isFinite(total) &&
    total >= 0 &&
    current >= 0;
  const safeTotal = hasCounts ? Math.max(0, Math.floor(total)) : null;
  const safeCurrent = hasCounts
    ? Math.max(
        0,
        Math.floor(
          safeTotal !== null && safeTotal > 0 ? Math.min(current, safeTotal) : current
        )
      )
    : null;
  const hasProgressBar = safeCurrent !== null && safeTotal !== null && safeTotal > 0;
  const stepStates = Array.isArray(steps) ? steps : [];
  const completedStepCount = stepStates.filter(
    (step) => step.status === "completed" || step.status === "skipped",
  ).length;
  const warningStepCount = stepStates.filter((step) => step.status === "warning").length;
  const failedStepCount = stepStates.filter((step) => step.status === "failed").length;
  const runningStep = stepStates.find((step) => step.status === "running") ?? null;
  const hasStepProgress = stepStates.length > 0;
  const sourceStates = Array.isArray(sourceProgress) ? sourceProgress : [];
  const gettyState = gettyProgress ?? null;
  const processedStepCount = stepStates.filter(
    (step) =>
      step.status === "completed" ||
      step.status === "warning" ||
      step.status === "skipped" ||
      step.status === "failed",
  ).length;
  const stepPercent = hasStepProgress ? Math.round((processedStepCount / stepStates.length) * 100) : 0;
  const percent = hasProgressBar
    ? Math.min(100, Math.round((safeCurrent / safeTotal) * 100))
    : hasStepProgress
      ? stepPercent
      : 0;
  const phaseLabel = formatPersonRefreshPhaseLabel(phase);
  const countLabel =
    safeCurrent !== null && safeTotal !== null
      ? `${safeCurrent.toLocaleString()}/${safeTotal.toLocaleString()}`
      : null;
  const stepLabel =
    hasStepProgress
      ? `${completedStepCount.toLocaleString()}/${stepStates.length.toLocaleString()} phases complete`
      : null;
  const detailMessage =
    typeof message === "string" && message.trim()
      ? message.trim()
      : null;
  const lastUpdateSeconds =
    typeof lastEventAt === "number" && Number.isFinite(lastEventAt)
      ? Math.max(0, Math.floor((nowMs - lastEventAt) / 1000))
      : null;
  const lastUpdateLabel =
    typeof lastUpdateSeconds === "number" ? `last update ${lastUpdateSeconds}s ago` : null;

  const renderStepStatus = (step: PersonRefreshPipelineStepState): string => {
    if (step.status === "running") {
      if (typeof step.current === "number" && typeof step.total === "number") {
        return `${step.current.toLocaleString()}/${step.total.toLocaleString()}`;
      }
      return "In progress";
    }
    if (step.status === "completed") return "Done";
    if (step.status === "warning") return "Warning";
    if (step.status === "skipped") return "Skipped";
    if (step.status === "failed") return "Failed";
    return "Pending";
  };

  const renderSourceStatus = (source: PersonRefreshSourceProgressState): string => {
    if (source.status === "running") return "In progress";
    if (source.status === "completed") return "Done";
    if (source.status === "warning") return "Warning";
    if (source.status === "skipped") return "Skipped";
    if (source.status === "failed") return "Failed";
    return "Pending";
  };

  const renderGettyStatus = (
    status: PersonGettyProgressState["status"] | PersonGettyProgressState["subtasks"][number]["status"],
  ): string => {
    if (status === "running") return "In progress";
    if (status === "completed") return "Done";
    if (status === "warning") return "Warning";
    if (status === "skipped") return "Skipped";
    if (status === "failed") return "Failed";
    return "Pending";
  };

  const formatGettyQueryMeta = (
    subtask: PersonGettyProgressState["subtasks"][number]
  ): string | null => {
    const parts: string[] = [];
    if (typeof subtask.siteImageTotal === "number" && subtask.siteImageTotal > 0) {
      parts.push(`${subtask.siteImageTotal.toLocaleString()} Getty images`);
    }
    if (typeof subtask.siteEventTotal === "number" && subtask.siteEventTotal > 0) {
      parts.push(`${subtask.siteEventTotal.toLocaleString()} events`);
    }
    if (typeof subtask.siteVideoTotal === "number" && subtask.siteVideoTotal > 0) {
      parts.push(`${subtask.siteVideoTotal.toLocaleString()} videos`);
    }
    if (subtask.candidatesFound > 0) {
      parts.push(`${subtask.candidatesFound.toLocaleString()} fetched`);
    }
    if (subtask.usableAfterDedupeTotal > 0) {
      parts.push(`${subtask.usableAfterDedupeTotal.toLocaleString()} usable`);
    }
    if (subtask.overlapCount > 0) {
      parts.push(`${subtask.overlapCount.toLocaleString()} overlap`);
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  };

  const gettyBreakdownEntries = gettyState
    ? ([
        ["Bravo Search", Number(gettyState.breakdown.bravoSearchTotal)],
        ["Broad Search", Number(gettyState.breakdown.broadSearchTotal)],
        ["Unique Merged", Number(gettyState.breakdown.uniqueDiscovered)],
        ["Via NBCUMV", Number(gettyState.breakdown.matchedViaNbcumv)],
        ["Via BravoTV", Number(gettyState.breakdown.matchedViaBravotvJson)],
        ["Via Image Search", Number(gettyState.breakdown.matchedViaImageSearch)],
        ["Unmatched Getty", Number(gettyState.breakdown.unmatchedGetty)],
        ["Getty-only", Number(gettyState.breakdown.gettyOnlyImported)],
        ["NBCUMV-only", Number(gettyState.breakdown.nbcumvOnlyImported)],
        ["BravoTV-only", Number(gettyState.breakdown.bravotvOnlyImported)],
        ["Covered Existing", Number(gettyState.breakdown.coveredExisting)],
        ["Upgraded Existing", Number(gettyState.breakdown.upgradedExisting)],
        ["Hosted", Number(gettyState.breakdown.mirroredHosted)],
        ["Hosting Failed", Number(gettyState.breakdown.mirroredFailed)],
        ["Skipped", Number(gettyState.breakdown.skipped)],
        ["Failed", Number(gettyState.breakdown.failed)],
      ] as Array<[string, number]>).filter(([, value]) => value > 0)
    : [];
  const gettyIsPrefetched = gettyState?.breakdown.prefetched ?? false;

  const formatSourceCounts = (source: PersonRefreshSourceProgressState): string => {
    const discoveredTotal =
      typeof source.discoveredTotal === "number" ? source.discoveredTotal.toLocaleString() : "?";
    const remaining =
      typeof source.remaining === "number" ? source.remaining.toLocaleString() : "?";
    const parts = [
      `scraped ${source.scrapedCurrent.toLocaleString()}/${discoveredTotal}`,
      `saved ${source.savedCurrent.toLocaleString()}`,
    ];
    if (source.coveredExisting > 0) {
      parts.push(`covered ${source.coveredExisting.toLocaleString()}`);
    }
    if (source.upgradedExisting > 0) {
      parts.push(`upgraded ${source.upgradedExisting.toLocaleString()}`);
    }
    parts.push(`remaining ${remaining}`);
    return parts.join(" · ");
  };

  return (
    <div className="w-full">
      {(phaseLabel || message || hasCounts || hasStepProgress) && (
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-400">
            {countLabel
              ? `${phaseLabel || runningStep?.label?.toUpperCase() || "WORKING"} ${countLabel}`
              : phaseLabel || runningStep?.label?.toUpperCase() || "WORKING"}
          </p>
          {hasProgressBar && safeCurrent !== null && safeTotal !== null && (
            <p className="text-[11px] font-bold tabular-nums text-zinc-400">
              {safeCurrent.toLocaleString()}/{safeTotal.toLocaleString()} ({percent}%)
            </p>
          )}
          {!hasProgressBar && stepLabel && (
            <p className="text-[11px] tabular-nums text-zinc-500">
              {stepLabel}
              {warningStepCount > 0 ? ` · ${warningStepCount.toLocaleString()} warning${warningStepCount === 1 ? "" : "s"}` : ""}
              {failedStepCount > 0 ? ` · ${failedStepCount.toLocaleString()} failed` : ""}
            </p>
          )}
          {!hasProgressBar && lastUpdateLabel && (
            <p className="text-[11px] tabular-nums text-zinc-500">{lastUpdateLabel}</p>
          )}
        </div>
      )}
      {detailMessage && (
        <p className="mb-1 text-[11px] text-zinc-500">{detailMessage}</p>
      )}
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-zinc-800">
        {hasProgressBar || hasStepProgress ? (
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-600 to-emerald-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        ) : safeTotal === 0 ? null : (
          <div className="absolute inset-y-0 left-0 w-1/3 animate-pulse rounded-full bg-sky-600/50" />
        )}
      </div>
      {hasStepProgress && (
        <div className="mt-2 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-sm">
          <div className="grid gap-px bg-zinc-800 sm:grid-cols-2">
            {stepStates.map((step) => {
              const detail = step.result || step.message;
              return (
                <div
                  key={step.id}
                  className={`px-3 py-2 ${
                    step.status === "completed"
                      ? "bg-zinc-900"
                      : step.status === "running"
                        ? "bg-zinc-900/90"
                        : step.status === "failed"
                          ? "bg-red-950/30"
                          : step.status === "skipped"
                            ? "bg-zinc-900/70"
                            : step.status === "warning"
                              ? "bg-amber-950/20"
                              : "bg-zinc-900/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`mt-px h-1 w-1 shrink-0 rounded-full ${
                          step.status === "completed"
                            ? "bg-emerald-500"
                            : step.status === "running"
                              ? "animate-pulse bg-sky-400"
                              : step.status === "failed"
                                ? "bg-red-500"
                                : step.status === "skipped"
                                  ? "bg-zinc-600"
                                  : step.status === "warning"
                                    ? "bg-amber-500"
                                    : "bg-zinc-700"
                        }`}
                      />
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
                        {step.label}
                      </p>
                    </div>
                    <p
                      className={`text-[11px] font-bold tabular-nums ${
                        step.status === "completed"
                          ? "text-emerald-400"
                          : step.status === "running"
                            ? "text-sky-400"
                            : step.status === "failed"
                              ? "text-red-400"
                              : step.status === "warning"
                                ? "text-amber-400"
                                : "text-zinc-500"
                      }`}
                    >
                      {renderStepStatus(step)}
                    </p>
                  </div>
                  {detail && (
                    <p className="mt-0.5 pl-2.5 text-[10px] leading-tight text-zinc-500">
                      {detail}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {sourceStates.length > 0 && (
        <div className="mt-2 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-700/60 bg-zinc-800/80 px-3 py-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-300">
              Image Sources
            </p>
            <p className="text-[11px] font-bold tabular-nums text-zinc-400">
              {sourceStates.filter((source) => source.status !== "pending").length.toLocaleString()}/
              {sourceStates.length.toLocaleString()}
            </p>
          </div>
          <div className="grid gap-px bg-zinc-800 sm:grid-cols-2">
            {sourceStates.map((source) => (
              <div
                key={source.key}
                className={`px-3 py-2 ${
                  source.status === "completed"
                    ? "bg-zinc-900"
                    : source.status === "running"
                      ? "bg-zinc-900/90"
                      : source.status === "failed"
                        ? "bg-red-950/30"
                        : source.status === "skipped"
                          ? "bg-zinc-900/70"
                          : "bg-zinc-900/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`mt-px h-1 w-1 shrink-0 rounded-full ${
                        source.status === "completed"
                          ? "bg-emerald-500"
                          : source.status === "running"
                            ? "animate-pulse bg-sky-400"
                            : source.status === "failed"
                              ? "bg-red-500"
                              : source.status === "skipped"
                                ? "bg-zinc-600"
                                : source.status === "warning"
                                  ? "bg-amber-500"
                                  : "bg-zinc-700"
                      }`}
                    />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
                      {source.label}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase ${
                      source.status === "completed"
                        ? "text-emerald-400"
                        : source.status === "running"
                          ? "text-sky-400"
                          : source.status === "failed"
                            ? "text-red-400"
                            : source.status === "warning"
                              ? "text-amber-400"
                              : "text-zinc-500"
                    }`}
                  >
                    {renderSourceStatus(source)}
                  </span>
                </div>
                <p className="mt-0.5 pl-2.5 text-[10px] tabular-nums leading-tight text-zinc-500">
                  {formatSourceCounts(source)}
                </p>
                {source.failedCurrent > 0 && (
                  <p className="mt-0.5 pl-2.5 text-[10px] leading-tight text-red-400/80">
                    failed {source.failedCurrent.toLocaleString()}
                  </p>
                )}
                {source.message && (
                  <p className="mt-0.5 pl-2.5 text-[10px] leading-tight text-zinc-600">
                    {source.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {gettyState && (
        <div className="mt-2 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-sm">
          {/* Header bar */}
          <div className="flex items-center justify-between border-b border-zinc-700/60 bg-zinc-800/80 px-3 py-1.5">
            <div className="flex items-center gap-2">
              <div
                className={`h-1.5 w-1.5 rounded-full ${
                  gettyState.status === "running"
                    ? "animate-pulse bg-sky-400"
                    : gettyState.status === "completed"
                      ? "bg-emerald-400"
                      : gettyState.status === "failed"
                        ? "bg-red-400"
                        : gettyState.status === "warning"
                          ? "bg-amber-400"
                          : "bg-zinc-500"
                }`}
              />
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-300">
                Getty / NBCUMV
              </p>
              {gettyIsPrefetched && (
                <span className="rounded bg-sky-900/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-300">
                  Hybrid
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {gettyState.phase && (
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  {gettyState.phase.replace(/_/g, " ")}
                </p>
              )}
              {gettyState.authMode && (
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  {gettyState.authMode.replace(/_/g, " ")}
                </p>
              )}
              <span
                className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  gettyState.status === "completed"
                    ? "bg-emerald-900/40 text-emerald-400"
                    : gettyState.status === "running"
                      ? "bg-sky-900/40 text-sky-400"
                      : gettyState.status === "failed"
                        ? "bg-red-900/40 text-red-400"
                        : gettyState.status === "warning"
                          ? "bg-amber-900/40 text-amber-400"
                          : "bg-zinc-700/40 text-zinc-500"
                }`}
              >
                {renderGettyStatus(gettyState.status)}
              </span>
            </div>
          </div>

          {/* Subtask grid */}
          {gettyState.subtasks.length > 0 && (
            <div className="grid gap-px bg-zinc-800 sm:grid-cols-2">
              {gettyState.subtasks.map((subtask) => (
                <div
                  key={subtask.id}
                  className={`px-3 py-2 ${
                    subtask.status === "completed"
                      ? "bg-zinc-900"
                      : subtask.status === "running"
                        ? "bg-zinc-900/90"
                        : subtask.status === "failed"
                          ? "bg-red-950/30"
                          : subtask.status === "skipped"
                            ? "bg-zinc-900/70"
                            : "bg-zinc-900/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`mt-px h-1 w-1 shrink-0 rounded-full ${
                          subtask.status === "completed"
                            ? "bg-emerald-500"
                            : subtask.status === "running"
                              ? "animate-pulse bg-sky-400"
                              : subtask.status === "failed"
                                ? "bg-red-500"
                                : subtask.status === "skipped"
                                  ? "bg-zinc-600"
                                  : "bg-zinc-700"
                        }`}
                      />
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
                        {subtask.label}
                      </p>
                    </div>
                    <p
                      className={`text-[11px] font-bold tabular-nums ${
                        subtask.status === "completed"
                          ? "text-emerald-400"
                          : subtask.status === "running"
                            ? "text-sky-400"
                            : "text-zinc-500"
                      }`}
                    >
                      {formatGettySubtaskCountLabel(subtask) ?? renderGettyStatus(subtask.status)}
                    </p>
                  </div>
                  {subtask.query && (
                    <p className="mt-0.5 pl-2.5 text-[10px] leading-tight text-zinc-600">
                      &ldquo;{subtask.query}&rdquo;
                    </p>
                  )}
                  {subtask.queryUrl && (
                    <a
                      href={subtask.queryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 block pl-2.5 text-[10px] leading-tight text-sky-500 hover:text-sky-400"
                    >
                      Open Getty search
                    </a>
                  )}
                  {formatGettyQueryMeta(subtask) && (
                    <p className="mt-0.5 pl-2.5 text-[10px] leading-tight text-zinc-500">
                      {formatGettyQueryMeta(subtask)}
                    </p>
                  )}
                  {subtask.message && (
                    <p className="mt-0.5 pl-2.5 text-[10px] leading-tight text-zinc-500">
                      {subtask.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Breakdown stats */}
          {gettyBreakdownEntries.length > 0 && (
            <div className="border-t border-zinc-700/60 px-3 py-2">
              <div className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-3">
                {gettyBreakdownEntries.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                      {label}
                    </span>
                    <span
                      className={`text-[11px] font-bold tabular-nums ${
                        label === "Failed" || label === "Hosting Failed"
                          ? "text-red-400"
                          : label === "Skipped"
                            ? "text-zinc-500"
                            : "text-zinc-300"
                      }`}
                    >
                      {value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
