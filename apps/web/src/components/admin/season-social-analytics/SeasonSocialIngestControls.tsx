import { createPortal } from "react-dom";
import SocialPlatformTabIcon from "@/components/admin/SocialPlatformTabIcon";
import {
  PLATFORM_LABELS,
  PLATFORM_TABS,
  SOCIAL_FULL_SYNC_MIRROR_ENABLED,
  formatSyncStatusLabel,
  getSyncStatusTone,
  formatActiveJobSummary,
  buildPreviewPlatformStatuses,
  formatInteger,
  formatDateTime,
  formatDateTimeFromDate,
  formatMirrorCoverageLabel,
  getJobStageLabel,
  getJobStageCounters,
  getJobPersistCounters,
  getJobActivity,
  formatJobActivitySummary,
  STAGE_LABELS_PLAIN,
  JOB_STATUS_PLAIN,
  formatCountersPlain,
} from "./section-helpers";
import type { SocialSyncSessionProgressSnapshot } from "@/lib/admin/social-sync-session";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type {
  AnalyticsResponse,
  CommentsCoverageResponse,
  MirrorCoverageResponse,
  Platform,
  PlatformTab,
  SocialJob,
  WorkerHealthState,
} from "./section-helpers";

type SyncRetryKind =
  | "retry_missing_comments"
  | "retry_failed_media"
  | "retry_missing_avatars"
  | "retry_missing_comment_media";
type SectionErrorItem = { key: string; label: string; message: string; staleAt: Date | null };
type LiveRunLog = { id: string; timestampLabel: string; message: string; timestampMs: number };
type PlatformHandleCounts = Record<Platform, number>;

export type SeasonSocialIngestControlsProps = {
  JOB_STATUS_PLAIN: typeof JOB_STATUS_PLAIN;
  PLATFORM_LABELS: typeof PLATFORM_LABELS;
  PLATFORM_TABS: typeof PLATFORM_TABS;
  SOCIAL_FULL_SYNC_MIRROR_ENABLED: typeof SOCIAL_FULL_SYNC_MIRROR_ENABLED;
  STAGE_LABELS_PLAIN: typeof STAGE_LABELS_PLAIN;
  SocialPlatformTabIcon: typeof SocialPlatformTabIcon;
  activeSyncSession: SocialSyncSessionProgressSnapshot | null;
  activeSyncSessionRetryKind: string | null;
  analytics: AnalyticsResponse | null;
  buildPreviewPlatformStatuses: typeof buildPreviewPlatformStatuses;
  createPortal: typeof createPortal;
  elapsedTick: number;
  error: string | null;
  externalControlsTarget: HTMLElement | null;
  formatActiveJobSummary: typeof formatActiveJobSummary;
  formatCountersPlain: typeof formatCountersPlain;
  formatDateTime: typeof formatDateTime;
  formatDateTimeFromDate: typeof formatDateTimeFromDate;
  formatInteger: typeof formatInteger;
  formatJobActivitySummary: typeof formatJobActivitySummary;
  formatMirrorCoverageLabel: typeof formatMirrorCoverageLabel;
  formatSyncStatusLabel: typeof formatSyncStatusLabel;
  getJobActivity: typeof getJobActivity;
  getJobPersistCounters: typeof getJobPersistCounters;
  getJobStageCounters: typeof getJobStageCounters;
  getJobStageLabel: typeof getJobStageLabel;
  getSyncStatusTone: typeof getSyncStatusTone;
  hidePlatformTabs: boolean;
  ingestMessage: string | null;
  ingestStartedAt: Date | null;
  lastUpdated: Date | null;
  linkedHandleTabs: ReactNode;
  liveRunLogs: LiveRunLog[];
  platformHandleCounts: PlatformHandleCounts;
  platformTab: PlatformTab;
  pollingStatus: "idle" | "retrying" | "recovered";
  portaledHeaderRail: ReactNode;
  retryActiveSyncSession: (retryKind: SyncRetryKind) => Promise<void>;
  runScopedJobs: SocialJob[];
  runningIngest: boolean;
  sectionErrorItems: SectionErrorItem[];
  setPlatformTabAndUrl: (nextTab: PlatformTab) => void;
  setSyncDetailsExpanded: Dispatch<SetStateAction<boolean>>;
  shouldRenderInlineControls: boolean;
  shouldRenderPortaledControls: boolean;
  socialControlsRail: ReactNode;
  staleFallbackItems: SectionErrorItem[];
  staleFallbackMessage: string;
  syncCommentsCoveragePreview: CommentsCoverageResponse | null;
  syncDetailsExpanded: boolean;
  syncMirrorCoveragePreview: MirrorCoverageResponse | null;
  workerHealth: WorkerHealthState | null;
};

/** Typed, stateless presentation for this Season Social Analytics region. */
export function SeasonSocialIngestControls({
  JOB_STATUS_PLAIN,
  PLATFORM_LABELS,
  PLATFORM_TABS,
  SOCIAL_FULL_SYNC_MIRROR_ENABLED,
  STAGE_LABELS_PLAIN,
  SocialPlatformTabIcon,
  activeSyncSession,
  activeSyncSessionRetryKind,
  analytics,
  buildPreviewPlatformStatuses,
  createPortal,
  elapsedTick,
  error,
  externalControlsTarget,
  formatActiveJobSummary,
  formatCountersPlain,
  formatDateTime,
  formatDateTimeFromDate,
  formatInteger,
  formatJobActivitySummary,
  formatMirrorCoverageLabel,
  formatSyncStatusLabel,
  getJobActivity,
  getJobPersistCounters,
  getJobStageCounters,
  getJobStageLabel,
  getSyncStatusTone,
  hidePlatformTabs,
  ingestMessage,
  ingestStartedAt,
  lastUpdated,
  linkedHandleTabs,
  liveRunLogs,
  platformHandleCounts,
  platformTab,
  pollingStatus,
  portaledHeaderRail,
  retryActiveSyncSession,
  runScopedJobs,
  runningIngest,
  sectionErrorItems,
  setPlatformTabAndUrl,
  setSyncDetailsExpanded,
  shouldRenderInlineControls,
  shouldRenderPortaledControls,
  socialControlsRail,
  staleFallbackItems,
  staleFallbackMessage,
  syncCommentsCoveragePreview,
  syncDetailsExpanded,
  syncMirrorCoveragePreview,
  workerHealth,
}: SeasonSocialIngestControlsProps) {
  return (
    <>
          {shouldRenderPortaledControls && externalControlsTarget
            ? createPortal(portaledHeaderRail, externalControlsTarget)
            : null}
          <section
            aria-label="Season social analytics controls"
            className="rounded-3xl border border-zinc-200 bg-zinc-50/70 p-4 shadow-sm sm:p-6"
          >
            <div className="space-y-4">
              <header className="space-y-3">
                <p className="rounded-full bg-zinc-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                  Season Social Analytics
                </p>
                <p className="max-w-2xl text-sm text-zinc-500">
                  Bravo-owned social analytics with viewer sentiment and weekly rollups.
                </p>
                <dl className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-700">
                  <div className="flex items-center gap-2">
                    <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">Last Updated</dt>
                    <dd className="font-medium text-zinc-800">{formatDateTimeFromDate(lastUpdated)}</dd>
                  </div>
                  {analytics?.window?.start && analytics?.window?.end && (
                    <div className="flex items-center gap-2">
                      <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">Window</dt>
                      <dd className="font-medium text-zinc-800">
                        {formatDateTime(analytics.window.start)} to {formatDateTime(analytics.window.end)}
                      </dd>
                    </div>
                  )}
                </dl>
              </header>

              {!hidePlatformTabs && (
                <nav className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-100/70 p-1" aria-label="Social platform tabs">
                  {PLATFORM_TABS.map((tab) => {
                    const isActive = platformTab === tab.key;
                    const tabCount = tab.key === "overview" ? null : platformHandleCounts[tab.key];
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => {
                          setPlatformTabAndUrl(tab.key);
                        }}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                          isActive
                            ? "bg-white text-zinc-900 shadow-sm"
                            : "text-zinc-600 hover:bg-white/80 hover:text-zinc-900"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <SocialPlatformTabIcon tab={tab.key} />
                          <span>{tabCount === null ? tab.label : `${tab.label} (${tabCount})`}</span>
                        </span>
                      </button>
                    );
                  })}
                </nav>
              )}
              {!hidePlatformTabs ? linkedHandleTabs : null}
              {shouldRenderInlineControls ? socialControlsRail : null}
            </div>

            {(pollingStatus !== "idle" || staleFallbackItems.length > 0 || sectionErrorItems.length > 0) && (
              <div className="mt-4 space-y-2">
                {pollingStatus === "retrying" && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    Live updates temporarily unavailable. Retrying...
                  </div>
                )}
                {pollingStatus === "recovered" && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    Live updates connection restored.
                  </div>
                )}
                {staleFallbackItems.length > 0 && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                    {staleFallbackMessage}
                  </div>
                )}
                {sectionErrorItems.map((item) => (
                  <div key={item.key} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    <span className="font-semibold">{item.label}:</span> {item.message}
                    {item.staleAt && (
                      <p className="mt-1 text-xs font-medium text-amber-800">
                        Showing last successful data from {formatDateTimeFromDate(item.staleAt)}.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {ingestMessage && !error && (() => {
        const activeJobs = runScopedJobs;
        const totalJobs = activeJobs.length;
        const completedJobs = activeJobs.filter((j) => j.status === "completed");
        const failedJobs = activeJobs.filter((j) => j.status === "failed");
        const finishedCount = completedJobs.length + failedJobs.length;
        const progressPct = totalJobs > 0 ? Math.round((finishedCount / totalJobs) * 100) : 0;
        const elapsedSec = Math.floor(elapsedTick / 1000);
        const elapsedMin = Math.floor(elapsedSec / 60);
        const elapsedStr = elapsedMin > 0 ? `${elapsedMin}m ${String(elapsedSec % 60).padStart(2, "0")}s` : `${elapsedSec}s`;
        const syncSnapshot = activeSyncSession?.completeness_snapshot ?? null;
        const syncSessionStatus = String(activeSyncSession?.status || "").toLowerCase();
        const syncRetryDisabled = new Set(["initializing", "pass_running", "pass_evaluating", "completing", "cancelling"]).has(syncSessionStatus);

        const getStage = (j: SocialJob) => getJobStageLabel(j);

        const getAccount = (j: SocialJob) =>
          typeof j.config?.account === "string" && j.config.account ? j.config.account : null;

        const postsStageJobs = activeJobs.filter((j) => getStage(j) === "posts");
        const commentsStageJobs = activeJobs.filter((j) => getStage(j) === "comments");
        const mirrorStageJobs = activeJobs.filter((j) => {
          const stage = getStage(j);
          return stage === "media_mirror" || stage === "mirror";
        });

        const stageProgress = (stageJobs: SocialJob[], stageKey: string) => {
          if (stageJobs.length === 0) return null;
          const done = stageJobs.filter((j) => j.status === "completed" || j.status === "failed").length;
          const pct = Math.round((done / stageJobs.length) * 100);
          const items = stageJobs.reduce((s, j) => s + (j.items_found ?? 0), 0);
          const label = STAGE_LABELS_PLAIN[stageKey] ?? stageKey;
          return { label, stageKey, total: stageJobs.length, done, pct, items, jobs: stageJobs };
        };

        const stages = [
          stageProgress(postsStageJobs, "posts"),
          stageProgress(commentsStageJobs, "comments"),
          stageProgress(mirrorStageJobs, "media_mirror"),
        ].filter(Boolean) as
          NonNullable<ReturnType<typeof stageProgress>>[];

        // Per-platform completion stats for summary
        const platformStats = new Map<string, { posts: number; comments: number }>();
        for (const j of completedJobs) {
          const counters = (j.metadata as Record<string, unknown>)?.stage_counters as Record<string, number> | undefined;
          const existing = platformStats.get(j.platform) ?? { posts: 0, comments: 0 };
          existing.posts += counters?.posts ?? 0;
          existing.comments += counters?.comments ?? 0;
          platformStats.set(j.platform, existing);
        }

        // Per-platform grouping for summary rows
        const platformGrouped = new Map<string, SocialJob[]>();
        for (const j of activeJobs) {
          const existing = platformGrouped.get(j.platform) ?? [];
          existing.push(j);
          platformGrouped.set(j.platform, existing);
        }

        const statusDotClass: Record<string, string> = {
          running: "bg-blue-500 animate-pulse",
          completed: "bg-green-500",
          failed: "bg-red-500",
          queued: "bg-zinc-300",
          pending: "bg-zinc-300",
          retrying: "bg-amber-400 animate-pulse",
          cancelled: "bg-zinc-300",
        };
        const statusTextClass: Record<string, string> = {
          running: "text-blue-700",
          completed: "text-green-700",
          failed: "text-red-600",
          queued: "text-zinc-500",
          pending: "text-zinc-500",
          retrying: "text-amber-600",
          cancelled: "text-zinc-400",
        };

        // Derive a friendly header from active platforms
        const activePlatformNames = [...new Set(activeJobs.map((j) => PLATFORM_LABELS[j.platform] ?? j.platform))];
        const friendlyHeader = runningIngest
          ? `Collecting data from ${activePlatformNames.length > 0 ? activePlatformNames.join(", ") : "social platforms"}...`
          : failedJobs.length > 0
            ? `Sync complete with ${failedJobs.length} ${failedJobs.length === 1 ? "error" : "errors"}`
            : "Sync complete";

        return (
          <div className={`rounded-xl border px-5 py-4 text-sm ${
            runningIngest
              ? "border-blue-200 bg-blue-50 text-blue-800"
              : failedJobs.length > 0
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-green-200 bg-green-50 text-green-700"
          }`}>
            {/* Header row: friendly message + elapsed */}
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{friendlyHeader}</p>
              {runningIngest && ingestStartedAt && (
                <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-mono font-semibold text-blue-700 tabular-nums">
                  {elapsedStr}
                </span>
              )}
            </div>

            {/* Overall progress bar */}
            {runningIngest && totalJobs > 0 && (
              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium">
                    {finishedCount} of {totalJobs} tasks complete
                  </span>
                  <span className="font-semibold tabular-nums">{progressPct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-blue-200">
                  <div
                    className="h-2 rounded-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${Math.max(2, progressPct)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Per-platform summary rows */}
            {runningIngest && platformGrouped.size > 0 && (
              <div className="mt-3 space-y-1.5">
                {Array.from(platformGrouped.entries())
                  .sort(([a], [b]) => (PLATFORM_LABELS[a] ?? a).localeCompare(PLATFORM_LABELS[b] ?? b))
                  .map(([platform, jobs]) => {
                    const label = PLATFORM_LABELS[platform] ?? platform;
                    const runningJob = jobs.find(
                      (j) => j.status === "running" || j.status === "retrying" || j.status === "cancelling",
                    );
                    const doneCount = jobs.filter((j) => j.status === "completed").length;
                    const failCount = jobs.filter((j) => j.status === "failed").length;
                    const totalCount = jobs.length;
                    const counters = runningJob ? getJobStageCounters(runningJob) : null;
                    const activity = runningJob ? getJobActivity(runningJob) : null;
                    const pStats = platformStats.get(platform);

                    let actionText: string;
                    if (runningJob) {
                      const stageName = STAGE_LABELS_PLAIN[getStage(runningJob)] ?? getStage(runningJob);
                      actionText = stageName;
                      if (counters) {
                        actionText += ` \u2014 ${formatCountersPlain(counters.posts, counters.comments)} found`;
                      }
                      if (activity && typeof activity.pages_scanned === "number" && activity.pages_scanned > 0) {
                        actionText += ` (${activity.pages_scanned} ${activity.pages_scanned === 1 ? "page" : "pages"} scanned)`;
                      }
                    } else if (doneCount + failCount === totalCount) {
                      actionText = pStats
                        ? `Done \u2014 ${formatCountersPlain(pStats.posts, pStats.comments)} collected`
                        : "Done";
                    } else {
                      actionText = "Waiting to start";
                    }

                    const dotClass = runningJob
                      ? "bg-blue-500 animate-pulse"
                      : failCount > 0
                        ? "bg-red-500"
                        : doneCount === totalCount
                          ? "bg-green-500"
                          : "bg-zinc-300";

                    return (
                      <div key={platform} className="flex items-center gap-2 text-xs">
                        <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
                        <span className="font-semibold min-w-[5rem]">{label}</span>
                        <span className="text-zinc-600 truncate">{actionText}</span>
                        <span className="ml-auto shrink-0 tabular-nums text-zinc-500">
                          {doneCount} of {totalCount} tasks
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Completed summary with per-platform breakdown */}
            {!runningIngest && completedJobs.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  {Array.from(platformStats.entries())
                    .sort(([a], [b]) => (PLATFORM_LABELS[a] ?? a).localeCompare(PLATFORM_LABELS[b] ?? b))
                    .map(([platform, stats]) => (
                      <span key={platform} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        failedJobs.some((j) => j.platform === platform)
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {PLATFORM_LABELS[platform] ?? platform}
                        <span className="font-semibold tabular-nums">
                          {stats.posts.toLocaleString()} {stats.posts === 1 ? "post" : "posts"}, {stats.comments.toLocaleString()} {stats.comments === 1 ? "comment" : "comments"}
                        </span>
                      </span>
                    ))}
                </div>
                {failedJobs.length > 0 && (
                  <div className="text-xs text-red-600">
                    {failedJobs.length} {failedJobs.length !== 1 ? "tasks" : "task"} failed:{" "}
                    {failedJobs.map((j) => `${PLATFORM_LABELS[j.platform] ?? j.platform} ${STAGE_LABELS_PLAIN[getStage(j)] ?? getStage(j)}`).join(", ")}
                  </div>
                )}
              </div>
            )}

            {/* Expand/collapse toggle for details */}
            <button
              type="button"
              className={`mt-3 flex items-center gap-1 text-xs font-medium ${
                runningIngest ? "text-blue-600 hover:text-blue-800" : "text-zinc-500 hover:text-zinc-700"
              }`}
              onClick={() => setSyncDetailsExpanded((prev) => !prev)}
            >
              {syncDetailsExpanded ? "Hide details" : "Show details"}
              <svg
                className={`h-3 w-3 transition-transform ${syncDetailsExpanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Expandable details section */}
            {syncDetailsExpanded && (
              <>
                {/* Infrastructure status pills */}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                  {workerHealth?.queueEnabled === true ? (
                    <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5">
                      Remote executor health: {workerHealth.healthyWorkers ?? 0} healthy{workerHealth.reason ? ` (${workerHealth.reason})` : ""}
                    </span>
                  ) : (
                    <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5">Remote executor: off</span>
                  )}
                  {syncCommentsCoveragePreview && (
                    <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5">
                      {formatInteger(Number(syncCommentsCoveragePreview.total_saved_comments ?? 0))} of{" "}
                      {formatInteger(Number(syncCommentsCoveragePreview.total_reported_comments ?? 0))} comments collected
                    </span>
                  )}
                  {SOCIAL_FULL_SYNC_MIRROR_ENABLED && syncMirrorCoveragePreview && (
                    <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5">
                      Media uploads:{" "}
                      {formatMirrorCoverageLabel(
                        Math.max(
                          0,
                          Number(syncMirrorCoveragePreview.posts_scanned ?? 0) -
                            Number(syncMirrorCoveragePreview.needs_mirror_count ?? 0),
                        ),
                        Number(syncMirrorCoveragePreview.posts_scanned ?? 0),
                      )}{" "}
                      complete, {formatInteger(Number(syncMirrorCoveragePreview.pending_count ?? 0))} pending,{" "}
                      {formatInteger(Number(syncMirrorCoveragePreview.failed_count ?? 0))} failed
                    </span>
                  )}
                </div>
                {buildPreviewPlatformStatuses(syncCommentsCoveragePreview, syncMirrorCoveragePreview).length > 0 && (
                  <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {buildPreviewPlatformStatuses(syncCommentsCoveragePreview, syncMirrorCoveragePreview).map(
                      ({ platform, status }) => (
                        <div key={`sync-preview-status-${platform}`} className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-zinc-900">{PLATFORM_LABELS[platform] ?? platform}</span>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${getSyncStatusTone(status.sync_status, Boolean(status.stale))}`}>
                              {formatSyncStatusLabel(status.sync_status)}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                            {status.comment_sync_status && (
                              <span className={`inline-flex rounded-full px-2 py-0.5 ${getSyncStatusTone(status.comment_sync_status.status)}`}>
                                Comments {formatSyncStatusLabel(status.comment_sync_status.status)}
                              </span>
                            )}
                            {status.media_mirror_status && (
                              <span className={`inline-flex rounded-full px-2 py-0.5 ${getSyncStatusTone(status.media_mirror_status.status)}`}>
                                Mirror {formatSyncStatusLabel(status.media_mirror_status.status)}
                              </span>
                            )}
                          </div>
                          {formatActiveJobSummary(status) && (
                            <p className="mt-1 text-[11px] text-zinc-600">{formatActiveJobSummary(status)}</p>
                          )}
                          {(status.last_refresh_reason || status.worker_run_id) && (
                            <p className="mt-1 text-[11px] text-zinc-500">
                              {status.last_refresh_reason ? `Reason: ${status.last_refresh_reason}` : "Reason: n/a"}
                              {status.worker_run_id ? ` · Run ${status.worker_run_id.slice(0, 8)}` : ""}
                            </p>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                )}

                {/* Raw ingest message for debugging */}
                {ingestMessage && (
                  <p className="mt-2 text-[10px] font-mono text-zinc-400 break-all">{ingestMessage}</p>
                )}

                {activeSyncSession && syncSnapshot && (
                  <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-700">
                      <span className="font-semibold text-zinc-900">Sync Session</span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5">
                        {String(activeSyncSession.display_status || activeSyncSession.status || "Sync").trim()}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5">
                        Pass {Math.max(1, Number(activeSyncSession.pass_sequence ?? 1) || 1)}/3
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5">
                        {String(activeSyncSession.current_pass_kind || "sync").replaceAll("_", " ")}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5">
                        Attempt {Math.max(1, Number(activeSyncSession.current_pass_attempt ?? 1) || 1)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-600">
                      {activeSyncSession.date_start && activeSyncSession.date_end
                        ? `${activeSyncSession.date_start} to ${activeSyncSession.date_end}`
                        : "Selected window"}
                    </p>
                    {activeSyncSession.status_reason ? (
                      <p className="mt-1 text-[11px] text-zinc-700">{activeSyncSession.status_reason}</p>
                    ) : null}
                    {activeSyncSession.follow_up_dimensions && activeSyncSession.follow_up_dimensions.length > 0 ? (
                      <p className="mt-1 text-[11px] text-zinc-600">
                        Follow-up dimensions: {activeSyncSession.follow_up_dimensions.join(", ")}
                      </p>
                    ) : null}
                    {activeSyncSession.expected_after_current_pass ? (
                      <p className="mt-1 text-[11px] text-zinc-500">{activeSyncSession.expected_after_current_pass}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-zinc-700">
                        Incomplete posts {Number(syncSnapshot.incomplete_post_count ?? 0)}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-zinc-700">
                        Missing media {Number(syncSnapshot.missing_asset_count ?? 0)}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-zinc-700">
                        Missing comment media {Number(syncSnapshot.missing_comment_media_count ?? 0)}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-zinc-700">
                        Missing avatars {Number(syncSnapshot.missing_avatar_count ?? 0)}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-zinc-700">
                        Comment targets {Number(syncSnapshot.comment_target_count ?? syncSnapshot.targeted_anchor_count ?? 0)}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-zinc-700">
                        Detail targets {Number(syncSnapshot.detail_target_count ?? 0)}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-zinc-700">
                        Avatar targets {Number(syncSnapshot.avatar_target_count ?? 0)}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-zinc-700">
                        Comment media targets {Number(syncSnapshot.comment_media_target_count ?? 0)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[
                        Number(syncSnapshot.comment_target_count ?? syncSnapshot.targeted_anchor_count ?? 0) > 0
                          ? ["retry_missing_comments", "Retry Comments"]
                          : null,
                        Number(syncSnapshot.detail_target_count ?? 0) > 0 || Number(syncSnapshot.missing_asset_count ?? 0) > 0
                          ? ["retry_failed_media", "Retry Media"]
                          : null,
                        Number(syncSnapshot.avatar_target_count ?? 0) > 0 || Number(syncSnapshot.missing_avatar_count ?? 0) > 0
                          ? ["retry_missing_avatars", "Retry Avatars"]
                          : null,
                        Number(syncSnapshot.comment_media_target_count ?? 0) > 0 ||
                        Number(syncSnapshot.missing_comment_media_count ?? 0) > 0
                          ? ["retry_missing_comment_media", "Retry Comment Media"]
                          : null,
                      ]
                        .filter((value): value is [string, string] => Array.isArray(value))
                        .map(([retryKind, label]) => (
                        <button
                          key={retryKind}
                          type="button"
                          onClick={() => {
                            void retryActiveSyncSession(
                              retryKind as "retry_missing_comments" | "retry_failed_media" | "retry_missing_avatars" | "retry_missing_comment_media",
                            );
                          }}
                          disabled={syncRetryDisabled || activeSyncSessionRetryKind !== null}
                          className="rounded border border-zinc-300 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {activeSyncSessionRetryKind === retryKind ? "Retrying..." : label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Per-stage progress */}
                {runningIngest && stages.length > 0 && (
                  <div className="mt-4 space-y-4">
                    {stages.map((s) => {
                      const allDone = s.done === s.total;
                      const hasActive = s.jobs.some(
                        (j) => j.status === "running" || j.status === "retrying" || j.status === "cancelling",
                      );
                      return (
                        <div key={s.stageKey}>
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold tracking-wide">{s.label}</span>
                              {hasActive && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                                  In progress
                                </span>
                              )}
                              {allDone && (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                                  Complete
                                </span>
                              )}
                            </div>
                            <span className="tabular-nums">{s.done} of {s.total} complete, {s.items.toLocaleString()} items found</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-blue-200">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-500 ${allDone ? "bg-green-500" : "bg-blue-500"}`}
                              style={{ width: `${Math.max(2, s.pct)}%` }}
                            />
                          </div>
                          {/* Per-platform rows within stage */}
                          <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                            {s.jobs.map((j) => {
                              const counters = getJobStageCounters(j);
                              const persistCounters = getJobPersistCounters(j);
                              const activitySummary = formatJobActivitySummary(getJobActivity(j));
                              const postsFound = counters?.posts ?? 0;
                              const commentsFound = counters?.comments ?? 0;
                              const account = getAccount(j);
                              const jobDuration = j.started_at
                                ? `${Math.round(((j.completed_at ? new Date(j.completed_at).getTime() : Date.now()) - new Date(j.started_at).getTime()) / 1000)}s`
                                : null;
                              return (
                                <div key={j.id} className="flex items-center gap-1.5 rounded bg-white/50 px-2 py-1 text-xs">
                                  <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${statusDotClass[j.status] ?? "bg-zinc-300"}`} />
                                  <span className="font-semibold">{PLATFORM_LABELS[j.platform] ?? j.platform}</span>
                                  {account && <span className="text-blue-600">@{account}</span>}
                                  <span className={`ml-auto ${statusTextClass[j.status] ?? "text-zinc-500"}`}>
                                    {JOB_STATUS_PLAIN[j.status] ?? j.status}
                                  </span>
                                  {counters ? (
                                    <span className="tabular-nums text-zinc-700">{formatCountersPlain(postsFound, commentsFound)} found</span>
                                  ) : (
                                    <span className="tabular-nums text-zinc-700">{(j.items_found ?? 0).toLocaleString()} items</span>
                                  )}
                                  {persistCounters && (
                                    <span className="tabular-nums text-zinc-500">
                                      {formatCountersPlain(persistCounters.posts_upserted, persistCounters.comments_upserted)} saved
                                    </span>
                                  )}
                                  {activitySummary && <span className="text-zinc-400">{activitySummary}</span>}
                                  {jobDuration && j.status !== "queued" && j.status !== "pending" && (
                                    <span className="tabular-nums text-zinc-400">{jobDuration}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Live activity log (latest events) */}
                {runningIngest && liveRunLogs.length > 0 && (
                  <div className="mt-4 border-t border-blue-200 pt-3">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-600">Activity Log</p>
                    <div className="space-y-0.5">
                      {liveRunLogs.slice(0, 6).map((entry) => (
                        <p key={entry.id} className="flex items-center gap-2 text-xs">
                          <span className="shrink-0 font-mono text-[10px] tabular-nums text-blue-500">{entry.timestampLabel}</span>
                          <span className="text-blue-900">{entry.message}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
          })()}
    </>
  );
}
