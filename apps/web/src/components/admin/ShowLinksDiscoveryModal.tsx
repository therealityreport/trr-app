"use client";

import AdminModal from "@/components/admin/AdminModal";
import type { CanonicalOperationStatus } from "@/lib/admin/async-handles";
import type { LinkDiscoveryProgressSummary } from "@/lib/admin/show-page/link-discovery-progress";

export type ShowLinksDiscoverySourceCount = Readonly<{
  key: string;
  label: string;
  count: number;
}>;

export type ShowLinksDiscoveryModalProps = {
  dialog: {
    open: boolean;
    onClose: () => void;
    status: CanonicalOperationStatus | null;
    error: string | null;
    notice: string | null;
    completionNotice: string | null;
  };
  cancellation: {
    visible: boolean;
    pending: boolean;
    buttonLabel: string;
    onCancel: () => void;
  };
  execution: {
    runLabel: string;
    operationLabel: string;
    owner: string | null;
    backend: string | null;
    mode: string | null;
  };
  progress: {
    summary: LinkDiscoveryProgressSummary | null;
    refreshing: boolean;
    timeoutMessage: string | null;
    stalled: boolean;
    stalledReason: string | null;
    lastUpdateLabel: string | null;
    lastStageChangeLabel: string | null;
    validatedSourceCounts: ReadonlyArray<ShowLinksDiscoverySourceCount>;
    deletedSourceCounts: ReadonlyArray<ShowLinksDiscoverySourceCount>;
    hasResult: boolean;
  };
};

const statusClassName = (status: CanonicalOperationStatus | null): string => {
  if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "failed" || status === "cancelled") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === "running") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-zinc-200 bg-zinc-50 text-zinc-600";
};

export default function ShowLinksDiscoveryModal({
  dialog,
  cancellation,
  execution,
  progress,
}: ShowLinksDiscoveryModalProps) {
  const message = dialog.error || dialog.completionNotice || dialog.notice;

  return (
    <AdminModal
      isOpen={dialog.open}
      onClose={dialog.onClose}
      closeLabel="Close links discovery progress"
      ariaLabel="Links discovery progress"
      panelClassName="max-h-[90vh] max-w-3xl overflow-y-auto"
      preserveScrollPosition={true}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-zinc-900">Links Discovery</h3>
          <p className="text-sm text-zinc-500">
            Remote worker-backed refresh for show, season, and cast member pages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {cancellation.visible && (
            <button
              type="button"
              onClick={cancellation.onCancel}
              disabled={cancellation.pending}
              className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
            >
              {cancellation.buttonLabel}
            </button>
          )}
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${statusClassName(dialog.status)}`}
          >
            {dialog.status ?? "queued"}
          </span>
          <button
            type="button"
            onClick={dialog.onClose}
            className="rounded-md border border-zinc-200 px-3 py-1 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
          >
            Close
          </button>
        </div>
      </div>

      {message && (
        <p className={`mb-4 text-sm ${dialog.error ? "text-red-600" : "text-zinc-600"}`}>
          {message}
        </p>
      )}

      <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Run ID</p>
          <p className="mt-1 text-sm font-semibold text-zinc-900">{execution.runLabel}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Operation ID</p>
          <p className="mt-1 text-sm font-semibold text-zinc-900">{execution.operationLabel}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Execution</p>
          <p className="mt-1 text-sm font-semibold text-zinc-900">
            {execution.owner === "remote_worker"
              ? "remote worker"
              : execution.owner || "Awaiting worker"}
          </p>
          {(execution.backend || execution.mode) && (
            <p className="mt-1 text-xs text-zinc-500">
              {[execution.backend, execution.mode ? `mode ${execution.mode}` : null]
                .filter((value): value is string => Boolean(value))
                .join(" · ")}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Status</p>
          <p className="mt-1 text-sm font-semibold text-zinc-900">
            {progress.summary?.stageLabel || "Discovery"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {progress.summary?.elapsedLabel || "Waiting for stream updates"}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Progress</p>
        {progress.summary ? (
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{progress.summary.headline}</p>
                  {progress.summary.detail && (
                    <p className="mt-1 text-sm text-zinc-600">{progress.summary.detail}</p>
                  )}
                </div>
                <div className="text-right text-xs text-zinc-500">
                  {progress.summary.stageElapsedLabel && <p>{progress.summary.stageElapsedLabel}</p>}
                  {progress.summary.elapsedLabel && <p>{progress.summary.elapsedLabel}</p>}
                </div>
              </div>
              {(progress.summary.targetSummary ||
                progress.summary.stageProgressLabel ||
                progress.summary.currentTargetLabel ||
                progress.summary.budgetLabel) && (
                <div className="mt-3 space-y-1 text-sm text-zinc-600">
                  {progress.summary.targetSummary && <p>{progress.summary.targetSummary}</p>}
                  {progress.summary.stageProgressLabel && <p>{progress.summary.stageProgressLabel}</p>}
                  {progress.summary.currentTargetLabel && (
                    <p>
                      Checking:{" "}
                      <span className="font-semibold text-zinc-900">
                        {progress.summary.currentTargetLabel}
                      </span>
                    </p>
                  )}
                  {progress.summary.budgetLabel && (
                    <p className="text-amber-700">{progress.summary.budgetLabel}</p>
                  )}
                </div>
              )}
              {progress.summary.metrics.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {progress.summary.metrics.map((metric) => (
                    <span
                      key={`${metric.label}:${metric.value}`}
                      className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700"
                    >
                      {metric.label}: {metric.value}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {progress.timeoutMessage !== null && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {progress.timeoutMessage}
              </div>
            )}

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Worker Monitor
                </p>
                <div className="mt-2 space-y-1 text-sm text-zinc-700">
                  <p>
                    Worker health:{" "}
                    <span
                      className={
                        progress.stalled
                          ? "font-semibold text-amber-700"
                          : "font-semibold text-emerald-700"
                      }
                    >
                      {progress.stalled ? "Stalled" : "Healthy"}
                    </span>
                  </p>
                  {progress.lastUpdateLabel && <p>Last stream update: {progress.lastUpdateLabel}</p>}
                  {progress.lastStageChangeLabel && (
                    <p>Last stage change: {progress.lastStageChangeLabel}</p>
                  )}
                  {progress.stalledReason && (
                    <p className="text-amber-700">
                      Reason: <span className="font-semibold">{progress.stalledReason}</span>
                    </p>
                  )}
                </div>
              </div>

              {(progress.validatedSourceCounts.length > 0 || progress.deletedSourceCounts.length > 0) && (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Correct / Live by Source
                  </p>
                  {progress.validatedSourceCounts.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {progress.validatedSourceCounts.map((entry) => (
                        <span
                          key={`links-live-source-${entry.key}`}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
                        >
                          {entry.label}: {entry.count}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-zinc-500">
                      No validated live source counts reported yet.
                    </p>
                  )}
                  {progress.deletedSourceCounts.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                        Invalid Deleted
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {progress.deletedSourceCounts.map((entry) => (
                          <span
                            key={`links-deleted-source-${entry.key}`}
                            className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700"
                          >
                            {entry.label}: {entry.count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {progress.hasResult && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Result</p>
                <p className="mt-1 text-sm text-zinc-700">
                  {dialog.completionNotice || "Links discovery finished."}
                </p>
                {progress.validatedSourceCounts.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {progress.validatedSourceCounts.map((entry) => (
                      <span
                        key={`links-result-live-source-${entry.key}`}
                        className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
                      >
                        {entry.label}: {entry.count} live
                      </span>
                    ))}
                  </div>
                )}
                {progress.deletedSourceCounts.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {progress.deletedSourceCounts.map((entry) => (
                      <span
                        key={`links-result-deleted-source-${entry.key}`}
                        className="rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700"
                      >
                        {entry.label}: {entry.count} invalid deleted
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">
            {progress.refreshing
              ? "Waiting for worker progress..."
              : "Start a links refresh to see live updates here."}
          </p>
        )}
      </section>
    </AdminModal>
  );
}
