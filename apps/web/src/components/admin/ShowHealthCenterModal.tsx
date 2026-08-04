"use client";

import type { ReactNode } from "react";

import AdminModal from "@/components/admin/AdminModal";
import type { RefreshLogStatus, RefreshLogTopicKey } from "@/lib/admin/refresh-log-pipeline";

const UUID_LIKE_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

const normalizeRefreshLogMessage = (value: string): string => {
  return value
    .replace(UUID_LIKE_RE, "person")
    .replace(/\s+/g, " ")
    .trim();
};

const extractRefreshLogSubJob = (entry: ShowHealthCenterRefreshLogEntry): { subJob: string; details: string } => {
  const normalizedMessage = normalizeRefreshLogMessage(entry.message);
  const prefixMatch = normalizedMessage.match(/^([^:]{2,50}):\s+(.+)$/);
  if (prefixMatch) {
    return {
      subJob: prefixMatch[1].trim(),
      details: prefixMatch[2].trim(),
    };
  }
  const fallbackSubJob = entry.category.trim() || "Update";
  return {
    subJob: fallbackSubJob,
    details: normalizedMessage,
  };
};

const healthBadgeClassName = (status: ShowHealthCenterHealthStatus): string => {
  if (status === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "stale") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
};

const pipelineStatusPillClass = (status: RefreshLogStatus): string => {
  if (status === "done") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "active") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "failed") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-zinc-200 bg-zinc-50 text-zinc-600";
};

const pipelineStatusText = (status: RefreshLogStatus): string => {
  if (status === "done") return "Done";
  if (status === "active") return "Running";
  if (status === "failed") return "Failed";
  return "Queued";
};

export type ShowHealthCenterHealthStatus = "ready" | "missing" | "stale";

export type ShowHealthCenterRefreshLogEntry = {
  id: string;
  at: string;
  category: string;
  message: string;
  current: number | null;
  total: number | null;
};

export type ShowHealthCenterContentHealthItem = {
  key: string;
  label: string;
  countLabel: string;
  status: ShowHealthCenterHealthStatus;
  onClick: () => void;
};

export type ShowHealthCenterPipelineStep = {
  topic: {
    key: RefreshLogTopicKey;
    label: string;
    description: string;
  };
  status: RefreshLogStatus;
  latest: ShowHealthCenterRefreshLogEntry | null;
  executionOwner?: string;
  parentOperationId?: string;
};

export type ShowHealthCenterOperationsInboxItem = {
  id: string;
  title: string;
  detail: string;
  onClick: () => void;
};

export type ShowHealthCenterRefreshLogTopicGroup = {
  topic: {
    key: RefreshLogTopicKey;
    label: string;
    description: string;
  };
  entries: ReadonlyArray<ShowHealthCenterRefreshLogEntry>;
  entriesForView: ReadonlyArray<ShowHealthCenterRefreshLogEntry>;
  latest: ShowHealthCenterRefreshLogEntry | null;
  status: RefreshLogStatus;
};

export type ShowHealthCenterModalProps = {
  dialog: {
    open: boolean;
    onClose: () => void;
    onRun: () => void;
    runDisabled: boolean;
    runButtonLabel: string;
    notice: string | null;
    error: string | null;
    progressContent: ReactNode;
  };
  contentHealthItems: ReadonlyArray<ShowHealthCenterContentHealthItem>;
  pipeline: {
    steps: ReadonlyArray<ShowHealthCenterPipelineStep>;
    onRetryStep: (topicKey: RefreshLogTopicKey, parentOperationId: string) => void;
  };
  operationsInboxItems: ReadonlyArray<ShowHealthCenterOperationsInboxItem>;
  refreshLog: {
    hasEntries: boolean;
    topicGroups: ReadonlyArray<ShowHealthCenterRefreshLogTopicGroup>;
  };
};

export default function ShowHealthCenterModal({
  dialog,
  contentHealthItems,
  pipeline,
  operationsInboxItems,
  refreshLog,
}: ShowHealthCenterModalProps) {
  return (
    <AdminModal
      isOpen={dialog.open}
      onClose={dialog.onClose}
      closeLabel="Close health center"
      ariaLabel="Health Center"
      panelClassName="max-h-[90vh] max-w-5xl overflow-y-auto"
      preserveScrollPosition={true}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-zinc-900">Health Center</h3>
          <p className="text-sm text-zinc-500">
            Content Health, Sync Pipeline, Operations Inbox, and Refresh Log.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={dialog.onRun}
            aria-disabled={dialog.runDisabled}
            className={`rounded-md px-3 py-1 text-sm font-semibold text-white ${
              dialog.runDisabled
                ? "cursor-not-allowed bg-zinc-500"
                : "bg-zinc-900 hover:bg-zinc-800"
            }`}
          >
            {dialog.runButtonLabel}
          </button>
          <button
            type="button"
            onClick={dialog.onClose}
            className="rounded-md border border-zinc-200 px-3 py-1 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
          >
            Close
          </button>
        </div>
      </div>

      {(dialog.notice || dialog.error) && (
        <p className={`mb-4 text-sm ${dialog.error ? "text-red-600" : "text-zinc-500"}`}>
          {dialog.error || dialog.notice}
        </p>
      )}
      {dialog.progressContent}

      <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
          Content Health
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {contentHealthItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              className={`rounded-xl border px-3 py-2 text-left transition hover:shadow-sm ${healthBadgeClassName(
                item.status
              )}`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                {item.label}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {item.status === "ready"
                  ? "Ready"
                  : item.status === "stale"
                    ? "Stale"
                    : "Missing"}
              </p>
              <p className="mt-1 text-xs opacity-80">{item.countLabel}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
            Sync Pipeline
          </p>
          <div className="space-y-2">
            {pipeline.steps.map((step) => {
              const latestParts = step.latest ? extractRefreshLogSubJob(step.latest) : null;
              return (
                <div
                  key={step.topic.key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-700">
                      {step.topic.label}
                      {step.executionOwner && (
                        <span className="ml-1 text-xs text-zinc-500">
                          ({step.executionOwner === "remote_worker" ? "Modal" : step.executionOwner})
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[11px] text-zinc-500">{step.topic.description}</p>
                    <p className="truncate text-[11px] text-zinc-600">
                      {latestParts?.details ?? "No updates yet."}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${pipelineStatusPillClass(
                        step.status
                      )}`}
                    >
                      {pipelineStatusText(step.status)}
                    </span>
                    {step.status === "failed" && step.parentOperationId && (
                      <button
                        type="button"
                        className="ml-2 text-xs text-blue-500 hover:text-blue-700"
                        onClick={() => pipeline.onRetryStep(step.topic.key, step.parentOperationId!)}
                      >
                        Retry
                      </button>
                    )}
                    {step.latest && (
                      <p className="mt-1 text-[10px] text-zinc-400">
                        {new Date(step.latest.at).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
            Operations Inbox
          </p>
          {operationsInboxItems.length === 0 ? (
            <p className="mt-3 text-sm text-emerald-700">No blocking tasks.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {operationsInboxItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left transition hover:bg-amber-100"
                >
                  <p className="text-sm font-semibold text-amber-800">{item.title}</p>
                  <p className="mt-1 text-xs text-amber-700">{item.detail}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
          Refresh Log
        </p>
        {!refreshLog.hasEntries ? (
          <p className="text-xs text-zinc-500">No refresh activity yet.</p>
        ) : (
          <div className="max-h-[44vh] space-y-3 overflow-y-auto pr-1">
            {refreshLog.topicGroups.map(({ topic, entries, entriesForView, latest, status }) => {
              const latestParts = latest ? extractRefreshLogSubJob(latest) : null;
              const latestPercent =
                latest &&
                typeof latest.current === "number" &&
                typeof latest.total === "number" &&
                latest.total > 0
                  ? Math.min(100, Math.round((latest.current / latest.total) * 100))
                  : null;

              if (status === "done") {
                return (
                  <article
                    key={topic.key}
                    className="rounded-lg border border-green-200 bg-green-50 px-3 py-2"
                  >
                    <p className="text-xs font-semibold text-green-800">
                      {topic.label}: Done ✔️
                    </p>
                  </article>
                );
              }

              return (
                <article key={topic.key} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                        {topic.label}
                      </p>
                      <p className="text-[11px] text-zinc-500">{topic.description}</p>
                    </div>
                    {latest && (
                      <p className="text-[10px] text-zinc-400">
                        {new Date(latest.at).toLocaleTimeString()}
                      </p>
                    )}
                  </div>

                  {status === "failed" && (
                    <p className="mt-2 text-xs font-semibold text-red-700">
                      {topic.label}: Failed ✖
                    </p>
                  )}

                  {latest ? (
                    <div className="mt-2 rounded-md border border-zinc-200 bg-white p-2">
                      <p className="text-xs font-semibold text-zinc-800">{latestParts?.subJob}</p>
                      <p className="mt-1 text-xs text-zinc-600">{latestParts?.details}</p>
                      {typeof latest.current === "number" &&
                        typeof latest.total === "number" && (
                          <p className="mt-1 text-[11px] text-zinc-500">
                            {latest.current.toLocaleString()}/{latest.total.toLocaleString()}
                            {latestPercent !== null ? ` (${latestPercent}%)` : ""}
                          </p>
                        )}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-zinc-500">No updates yet.</p>
                  )}

                  {entries.length > 0 && (
                    <details className="mt-2" open={entries.length <= 3}>
                      <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                        Sub-jobs ({entries.length})
                      </summary>
                      <div className="mt-2 space-y-1">
                        {entriesForView.slice(0, 30).map((entry) => {
                          const parts = extractRefreshLogSubJob(entry);
                          const percent =
                            typeof entry.current === "number" &&
                            typeof entry.total === "number" &&
                            entry.total > 0
                              ? Math.min(100, Math.round((entry.current / entry.total) * 100))
                              : null;
                          return (
                            <div
                              key={entry.id}
                              className="rounded border border-zinc-100 bg-white px-2 py-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[11px] font-semibold text-zinc-700">
                                  {parts.subJob}
                                </p>
                                <p className="text-[10px] text-zinc-400">
                                  {new Date(entry.at).toLocaleTimeString()}
                                </p>
                              </div>
                              <p className="mt-0.5 text-[11px] text-zinc-600">{parts.details}</p>
                              {typeof entry.current === "number" &&
                                typeof entry.total === "number" && (
                                  <p className="mt-0.5 text-[10px] text-zinc-500">
                                    {entry.current.toLocaleString()}/{entry.total.toLocaleString()}
                                    {percent !== null ? ` (${percent}%)` : ""}
                                  </p>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </AdminModal>
  );
}
