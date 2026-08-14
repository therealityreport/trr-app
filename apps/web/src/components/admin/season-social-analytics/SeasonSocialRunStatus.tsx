import SocialPostsSection from "@/components/admin/social-posts-section";
import {
  JOB_STATUS_PLAIN,
  PLATFORM_LABELS,
  PLATFORM_ORDER,
  STAGE_LABELS_PLAIN,
  formatCountersPlain,
  formatDateTime,
  formatJobActivitySummary,
  getJobActivity,
  getJobPersistCounters,
  getJobStageCounters,
  getJobStageLabel,
} from "./section-helpers";
import type { Dispatch, SetStateAction } from "react";
import type { IngestMode, Platform, SocialJob } from "./section-helpers";

type RunIngestOverride = {
  week?: number;
  day?: string;
  platform?: "all" | Platform;
  ingestMode?: IngestMode;
  rowMissingOnly?: boolean;
};

export type SeasonSocialRunStatusProps = {
  JOB_STATUS_PLAIN: typeof JOB_STATUS_PLAIN;
  PLATFORM_LABELS: typeof PLATFORM_LABELS;
  PLATFORM_ORDER: typeof PLATFORM_ORDER;
  STAGE_LABELS_PLAIN: typeof STAGE_LABELS_PLAIN;
  SocialPostsSection: typeof SocialPostsSection;
  expandedJobErrors: Set<string>;
  formatCountersPlain: typeof formatCountersPlain;
  formatDateTime: typeof formatDateTime;
  formatJobActivitySummary: typeof formatJobActivitySummary;
  getJobActivity: typeof getJobActivity;
  getJobPersistCounters: typeof getJobPersistCounters;
  getJobStageCounters: typeof getJobStageCounters;
  getJobStageLabel: typeof getJobStageLabel;
  isAdvancedView: boolean;
  isBravoView: boolean;
  jobsOpen: boolean;
  manualSourcesOpen: boolean;
  refreshSelectedRunJobs: () => Promise<void>;
  runIngest: (override?: RunIngestOverride) => Promise<void>;
  runScopedJobs: SocialJob[];
  runningIngest: boolean;
  seasonId: string;
  selectedRunId: string | null;
  setExpandedJobErrors: Dispatch<SetStateAction<Set<string>>>;
  setJobsOpen: Dispatch<SetStateAction<boolean>>;
  setManualSourcesOpen: Dispatch<SetStateAction<boolean>>;
  showId: string;
  showName: string;
};

/** Typed, stateless presentation for this Season Social Analytics region. */
export function SeasonSocialRunStatus({
  JOB_STATUS_PLAIN,
  PLATFORM_LABELS,
  PLATFORM_ORDER,
  STAGE_LABELS_PLAIN,
  SocialPostsSection,
  expandedJobErrors,
  formatCountersPlain,
  formatDateTime,
  formatJobActivitySummary,
  getJobActivity,
  getJobPersistCounters,
  getJobStageCounters,
  getJobStageLabel,
  isAdvancedView,
  isBravoView,
  jobsOpen,
  manualSourcesOpen,
  refreshSelectedRunJobs,
  runIngest,
  runScopedJobs,
  runningIngest,
  seasonId,
  selectedRunId,
  setExpandedJobErrors,
  setJobsOpen,
  setManualSourcesOpen,
  showId,
  showName,
}: SeasonSocialRunStatusProps) {
  return (
    <>
          {(isBravoView || isAdvancedView) && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <button
              type="button"
              onClick={() => setJobsOpen((c) => !c)}
              className="flex w-full items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <h4 className="text-lg font-semibold text-zinc-900">Ingest Job Status</h4>
                {runScopedJobs.length > 0 && (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600">
                    {runScopedJobs.length} job{runScopedJobs.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-zinc-500">{jobsOpen ? "Hide" : "Show"}</span>
            </button>
            {jobsOpen && (<>
            <div className="mt-4 mb-4 flex justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void refreshSelectedRunJobs();
                }}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Refresh Jobs
              </button>
            </div>
            <div className="space-y-2">
              {(() => {
                const statusOrder: Record<string, number> = { running: 0, retrying: 1, queued: 2, pending: 3, failed: 4, completed: 5, cancelled: 6 };
                const statusBadge: Record<string, string> = {
                  completed: "bg-green-100 text-green-700",
                  failed: "bg-red-100 text-red-700",
                  running: "bg-blue-100 text-blue-700 animate-pulse",
                  pending: "bg-zinc-100 text-zinc-600",
                  queued: "bg-zinc-100 text-zinc-600",
                  retrying: "bg-amber-100 text-amber-700 animate-pulse",
                  cancelled: "bg-zinc-100 text-zinc-400",
                };
                const sorted = [...runScopedJobs].sort(
                  (a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
                );
                return sorted.map((job) => {
                  const stage = getJobStageLabel(job);
                  const account = typeof job.config?.account === "string" && job.config.account ? job.config.account : null;
                  const counters = getJobStageCounters(job);
                  const persistCounters = getJobPersistCounters(job);
                  const activitySummary = formatJobActivitySummary(getJobActivity(job));
                  const retrievalMeta = (job.metadata as Record<string, unknown>)?.retrieval_meta as
                    | Record<string, unknown>
                    | undefined;
                  const missingMarked =
                    typeof retrievalMeta?.comments_marked_missing === "number"
                      ? retrievalMeta.comments_marked_missing
                      : null;
                  const incompleteFetches =
                    typeof retrievalMeta?.incomplete_comment_fetches === "number"
                      ? retrievalMeta.incomplete_comment_fetches
                      : null;
                  const refreshDecisionCount = (() => {
                    const value = retrievalMeta?.comment_refresh_decisions;
                    if (!value || typeof value !== "object") return 0;
                    return Object.keys(value as Record<string, unknown>).length;
                  })();
                  const duration =
                    job.started_at && job.completed_at
                      ? `${Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)}s`
                      : job.started_at
                        ? `${Math.round((Date.now() - new Date(job.started_at).getTime()) / 1000)}s`
                        : null;
                  const isActive =
                    job.status === "running" || job.status === "retrying" || job.status === "cancelling";
                  return (
                    <div key={job.id} className={`rounded-lg border px-3 py-2 ${
                      isActive ? "border-blue-200 bg-blue-50" : job.status === "failed" ? "border-red-200 bg-red-50" : "border-zinc-200 bg-zinc-50"
                    }`}>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-900">
                            {PLATFORM_LABELS[job.platform] ?? job.platform}
                          </span>
                          {account && <span className="text-xs text-zinc-500">@{account}</span>}
                          <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-medium text-zinc-600">
                            {STAGE_LABELS_PLAIN[stage] ?? stage}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge[job.status] ?? "bg-zinc-100 text-zinc-500"}`}>
                            {JOB_STATUS_PLAIN[job.status] ?? job.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          {counters ? (
                            <span className="font-semibold tabular-nums text-zinc-700">
                              {formatCountersPlain(counters.posts, counters.comments)} found
                            </span>
                          ) : (
                            <span className="font-semibold tabular-nums text-zinc-700">{(job.items_found ?? 0).toLocaleString()} items</span>
                          )}
                          {persistCounters && (
                            <span className="tabular-nums text-zinc-500">
                              {formatCountersPlain(persistCounters.posts_upserted, persistCounters.comments_upserted)} saved
                            </span>
                          )}
                          {activitySummary && <span className="text-zinc-400">{activitySummary}</span>}
                          {duration && <span className="tabular-nums text-zinc-400">{duration}</span>}
                        </div>
                      </div>
                      {job.error_message && (
                        <div className="mt-1">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedJobErrors((prev) => {
                                const next = new Set(prev);
                                if (next.has(job.id)) {
                                  next.delete(job.id);
                                } else {
                                  next.add(job.id);
                                }
                                return next;
                              })
                            }
                            className="text-xs text-red-500 underline"
                          >
                            {expandedJobErrors.has(job.id) ? "Hide error" : "Show error"}
                          </button>
                          {expandedJobErrors.has(job.id) && (
                            <pre className="mt-1 max-h-32 overflow-auto rounded bg-red-50 p-2 text-[10px] text-red-700">
                              {job.error_message}
                            </pre>
                          )}
                        </div>
                      )}
                      {job.status === "failed" && (
                        <div className="mt-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const retryPlatform = PLATFORM_ORDER.includes(job.platform as Platform)
                                ? (job.platform as Platform)
                                : "all";
                              const retryMode = stage === "comments" ? "comments_only" : "posts_only";
                              void runIngest({ platform: retryPlatform, ingestMode: retryMode });
                            }}
                            disabled={runningIngest}
                            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60"
                          >
                            Retry Failed Stage
                          </button>
                        </div>
                      )}
                      {(missingMarked !== null || incompleteFetches !== null || refreshDecisionCount > 0) && (
                        <p className="mt-1.5 text-xs text-zinc-500">
                          {missingMarked !== null ? `Missing flagged: ${missingMarked}` : "Missing flagged: 0"}
                          {incompleteFetches !== null ? ` · Incomplete fetches: ${incompleteFetches}` : ""}
                          {refreshDecisionCount > 0 ? ` · Decision reasons: ${refreshDecisionCount}` : ""}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-zinc-400">
                        {job.started_at ? `Started ${formatDateTime(job.started_at)}` : `Created ${formatDateTime(job.created_at)}`}
                        {job.completed_at ? ` · Done ${formatDateTime(job.completed_at)}` : ""}
                      </p>
                    </div>
                  );
                });
              })()}
              {!selectedRunId && (
                <p className="text-sm text-zinc-500">No run selected. Pick a run above or use Ingest + Export to start one.</p>
              )}
              {selectedRunId && runScopedJobs.length === 0 && (
                <p className="text-sm text-zinc-500">No jobs found for the selected run yet.</p>
              )}
            </div>
            </>)}
            </section>
          )}

          {(isBravoView || isAdvancedView) && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <button
              type="button"
              onClick={() => setManualSourcesOpen((current) => !current)}
              className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
            >
              <span>Manual Sources (Fallback)</span>
              <span>{manualSourcesOpen ? "Hide" : "Show"}</span>
            </button>
            {manualSourcesOpen && (
              <div className="mt-4">
                <SocialPostsSection showId={showId} showName={showName} seasonId={seasonId} />
              </div>
            )}
            </section>
          )}
    </>
  );
}
