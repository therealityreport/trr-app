"use client";
import { Button } from "@/components/ui/button";
import type { IngestionLaunch } from "@/lib/social/ingestion-client";
import { INSTAGRAM_BACKFILL_TASK_OPTIONS, formatBackfillTaskLabel, describeInstagramCatalogCapacity } from "@/components/admin/social-account-profile/catalog-operations";
import { formatInteger, formatMonthYear } from "@/components/admin/social-account-profile/profile-presentation";
type Task = NonNullable<IngestionLaunch["selected_tasks"]>[number];
type Placement = NonNullable<IngestionLaunch["execution_placement"]>;
type Props = {
  handle: string;
  /** Present only when v2 ingestion is enabled; omitted for the legacy path. */
  runPlacement?: Placement;
  setRunPlacement?: (value: Placement) => void;
  localWorkerOnline?: boolean | null;
  instagramBackfillSelectedTasks: Task[];
  instagramBackfillMonthStart: string;
  instagramBackfillMonthEnd: string;
  instagramBackfillDetailWorkerCount: number;
  instagramBackfillCommentsWorkerCount: number;
  instagramBackfillDisplayedDetailWorkers: number | null | undefined;
  instagramBackfillDisplayedCommentsWorkers: number | null | undefined;
  instagramBackfillCommentMediaEnabled: boolean;
  instagramBackfillIncludesMedia: boolean;
  instagramBackfillCapacityLoading: boolean;
  instagramBackfillCapacityPresentation: ReturnType<typeof describeInstagramCatalogCapacity>;
  instagramBackfillEstimatedWallSeconds: number;
  instagramBackfillEstimatedWorkerMinutes: number;
  instagramBackfillEstimatedPostTargets: number;
  instagramBackfillEstimatedCommentTargets: number;
  instagramBackfillPreflightItems: string[];
  catalogLaunchActionsBlocked: boolean;
  catalogLaunchGuardMessage: string | null;
  runningCatalogAction: string | null;
  setInstagramBackfillDialogOpen: (value: boolean) => void;
  setInstagramBackfillMonthStart: (value: string) => void;
  setInstagramBackfillMonthEnd: (value: string) => void;
  setInstagramBackfillDetailWorkerCount: (value: number) => void;
  setInstagramBackfillCommentsWorkerCount: (value: number) => void;
  setInstagramBackfillCommentMediaFollowups: (value: boolean) => void;
  toggleInstagramBackfillTask: (task: Task) => void;
  applyBravoTvFastBackfillPreset: () => void;
  submitInstagramBackfillDialog: () => Promise<void>;
  formatDurationEstimate: (seconds: number) => string | null;
  refreshCapacity: () => void;
  INSTAGRAM_BACKFILL_DETAIL_WORKER_OPTIONS: readonly number[];
  INSTAGRAM_BACKFILL_COMMENTS_WORKER_OPTIONS: readonly number[];
  NYT_DASHBOARD_BUTTON_CLASS: string;
  NYT_DASHBOARD_PRIMARY_BUTTON_CLASS: string;
};
export function RunLauncher({
  handle,
  runPlacement,
  setRunPlacement,
  localWorkerOnline,
  instagramBackfillSelectedTasks,
  instagramBackfillMonthStart,
  instagramBackfillMonthEnd,
  instagramBackfillDetailWorkerCount,
  instagramBackfillCommentsWorkerCount,
  instagramBackfillDisplayedDetailWorkers,
  instagramBackfillDisplayedCommentsWorkers,
  instagramBackfillCommentMediaEnabled,
  instagramBackfillIncludesMedia,
  instagramBackfillCapacityLoading,
  instagramBackfillCapacityPresentation,
  instagramBackfillEstimatedWallSeconds,
  instagramBackfillEstimatedWorkerMinutes,
  instagramBackfillEstimatedPostTargets,
  instagramBackfillEstimatedCommentTargets,
  instagramBackfillPreflightItems,
  catalogLaunchActionsBlocked,
  catalogLaunchGuardMessage,
  runningCatalogAction,
  setInstagramBackfillDialogOpen,
  setInstagramBackfillMonthStart,
  setInstagramBackfillMonthEnd,
  setInstagramBackfillDetailWorkerCount,
  setInstagramBackfillCommentsWorkerCount,
  setInstagramBackfillCommentMediaFollowups,
  toggleInstagramBackfillTask,
  applyBravoTvFastBackfillPreset,
  submitInstagramBackfillDialog,
  formatDurationEstimate,
  refreshCapacity,
  INSTAGRAM_BACKFILL_DETAIL_WORKER_OPTIONS,
  INSTAGRAM_BACKFILL_COMMENTS_WORKER_OPTIONS,
  NYT_DASHBOARD_BUTTON_CLASS,
  NYT_DASHBOARD_PRIMARY_BUTTON_CLASS
}: Props) { return (
<div className="fixed inset-0 z-40 flex items-start justify-center bg-zinc-950/55 px-4 py-6 sm:items-center">
              <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Instagram Backfill</p>
                    <h2 className="mt-2 text-2xl font-semibold text-zinc-900">Choose what this backfill should run</h2>
                    <p className="mt-2 text-sm text-zinc-500">
                      {runPlacement
                        ? "Logged-out runs default to Comments and Media: the post listing already supplies every post field, and logged-out Post Details return nothing."
                        : "Post Details, Comments, and Media all run by default inside the selected date window, so a backfill scrapes every lane to completion. Uncheck a lane only to deliberately scope it out."}
                    </p>
                  </div>
                  <Button
                    onClick={() => setInstagramBackfillDialogOpen(false)}
                    size="sm"
                    variant="outline"
                    className={NYT_DASHBOARD_BUTTON_CLASS}
                  >
                    Close
                  </Button>
                </div>
                <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="space-y-3">
                    {INSTAGRAM_BACKFILL_TASK_OPTIONS.map((option) => {
                      const checked = instagramBackfillSelectedTasks.includes(option.value);
                      return (
                        <label
                          key={option.value}
                          className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 ${
                            checked ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleInstagramBackfillTask(option.value)}
                            className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                          />
                          <div>
                            <p className="font-semibold text-zinc-900">{option.label}</p>
                            <p className="mt-1 text-sm text-zinc-500">{option.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {runPlacement && setRunPlacement ? (
                    <fieldset className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                      <legend className="sr-only">Run on</legend>
                      <p className="font-semibold text-zinc-900">Run on</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        Logged out, Modal gets only the newest page of posts. Use This Mac for older history.
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {([
                          { value: "modal", label: "Modal", detail: "Newest posts" },
                          {
                            value: "local",
                            label: "This Mac",
                            detail: localWorkerOnline ? "Mac worker online" : "Mac worker offline",
                          },
                        ] as const).map((option) => {
                          const disabled = option.value === "local" && localWorkerOnline !== true;
                          return (
                            <label
                              key={option.value}
                              className={`flex items-start gap-3 rounded-xl border px-3 py-3 ${
                                runPlacement === option.value ? "border-zinc-900 bg-white" : "border-zinc-200 bg-white"
                              } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                            >
                              <input
                                type="radio"
                                name="instagram-run-placement"
                                value={option.value}
                                checked={runPlacement === option.value}
                                disabled={disabled}
                                onChange={() => {
                                  if (!disabled) setRunPlacement(option.value);
                                }}
                                className="mt-1 h-4 w-4 border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                              />
                              <span>
                                <span className="block text-sm font-semibold text-zinc-900">{option.label}</span>
                                <span className="block text-xs text-zinc-500">{option.detail}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  ) : null}
                  <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                  <p className="font-semibold text-zinc-900">Bounded Window</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Backfill only posts published from the start month through the end month.
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        Start month (MM-YYYY)
                      </span>
                      <input
                        type="month"
                        value={instagramBackfillMonthStart}
                        aria-label="Instagram backfill start month"
                        onChange={(event) => setInstagramBackfillMonthStart(event.currentTarget.value)}
                        onInput={(event) => setInstagramBackfillMonthStart(event.currentTarget.value)}
                        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        End month (MM-YYYY)
                      </span>
                      <input
                        type="month"
                        value={instagramBackfillMonthEnd}
                        aria-label="Instagram backfill end month"
                        onChange={(event) => setInstagramBackfillMonthEnd(event.currentTarget.value)}
                        onInput={(event) => setInstagramBackfillMonthEnd(event.currentTarget.value)}
                        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    Months are sent as UTC boundaries: the first instant of the start month through the last instant of
                    the end month.
                  </p>
                </div>
                {instagramBackfillSelectedTasks.includes("post_details") ? (
                  <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-zinc-900">Detail Workers</p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {instagramBackfillDisplayedDetailWorkers != null
                            ? `${formatInteger(instagramBackfillDisplayedDetailWorkers)} backend-effective · ${formatInteger(instagramBackfillDetailWorkerCount)} requested`
                            : `${instagramBackfillDetailWorkerCount} requested detail ${instagramBackfillDetailWorkerCount === 1 ? "worker" : "workers"}`}
                        </p>
                      </div>
                      {handle.trim().replace(/^@/, "").toLowerCase() === "bravotv" ? (
                        <Button
                          onClick={applyBravoTvFastBackfillPreset}
                          size="sm"
                          variant="outline"
                          className={NYT_DASHBOARD_BUTTON_CLASS}
                        >
                          Fast Bravo TV
                        </Button>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {INSTAGRAM_BACKFILL_DETAIL_WORKER_OPTIONS.map((count) => (
                        <Button
                          key={count}
                          onClick={() => setInstagramBackfillDetailWorkerCount(count)}
                          size="sm"
                          variant={instagramBackfillDetailWorkerCount === count ? "primary" : "outline"}
                          className={`${
                            instagramBackfillDetailWorkerCount === count
                              ? NYT_DASHBOARD_PRIMARY_BUTTON_CLASS
                              : NYT_DASHBOARD_BUTTON_CLASS
                          }`}
                        >
                          {count}
                        </Button>
                      ))}
                    </div>
                    {instagramBackfillDetailWorkerCount === 1 ? (
                      <p className="mt-3 text-sm font-medium text-amber-700">
                        Single-runner detail refresh will be slow on large Instagram accounts.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {instagramBackfillSelectedTasks.includes("comments") ? (
                  <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-zinc-900">Comments Workers</p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {instagramBackfillDisplayedCommentsWorkers != null
                            ? `${formatInteger(instagramBackfillDisplayedCommentsWorkers)} backend-effective · ${formatInteger(instagramBackfillCommentsWorkerCount)} requested`
                            : `${instagramBackfillCommentsWorkerCount} requested comments ${instagramBackfillCommentsWorkerCount === 1 ? "worker" : "workers"}`}
                        </p>
                      </div>
                      {handle.trim().replace(/^@/, "").toLowerCase() === "bravotv" ? (
                        <Button
                          onClick={applyBravoTvFastBackfillPreset}
                          size="sm"
                          variant="outline"
                          className={NYT_DASHBOARD_BUTTON_CLASS}
                        >
                          Fast Bravo TV
                        </Button>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {INSTAGRAM_BACKFILL_COMMENTS_WORKER_OPTIONS.map((count) => (
                        <Button
                          key={count}
                          onClick={() => setInstagramBackfillCommentsWorkerCount(count)}
                          size="sm"
                          variant={instagramBackfillCommentsWorkerCount === count ? "primary" : "outline"}
                          className={`${
                            instagramBackfillCommentsWorkerCount === count
                              ? NYT_DASHBOARD_PRIMARY_BUTTON_CLASS
                              : NYT_DASHBOARD_BUTTON_CLASS
                          }`}
                        >
                          {count}
                        </Button>
                      ))}
                    </div>
                    {instagramBackfillCommentsWorkerCount === 1 ? (
                      <p className="mt-3 text-sm font-medium text-amber-700">
                        Single-runner comments sync will be slow on large Instagram accounts.
                      </p>
                    ) : null}
                    <label className="mt-4 flex items-start gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3">
                      <input
                        type="checkbox"
                        checked={instagramBackfillCommentMediaEnabled}
                        disabled={instagramBackfillIncludesMedia}
                        onChange={(event) => setInstagramBackfillCommentMediaFollowups(event.currentTarget.checked)}
                        className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-zinc-900">Comment media follow-ups</span>
                        <span className="mt-1 block text-xs text-zinc-500">
                          Save comment GIFs, stickers, emoji media, and other comment attachments separately from hosted post media.
                        </span>
                      </span>
                    </label>
                  </div>
                ) : null}
                <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-4" aria-live="polite">
                  <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600">Current Capacity</p><Button size="sm" variant="outline" onClick={refreshCapacity} disabled={instagramBackfillCapacityLoading} className={NYT_DASHBOARD_BUTTON_CLASS}>Refresh Capacity</Button></div>
                  {instagramBackfillCapacityLoading ? (
                    <p className="mt-2 text-sm text-zinc-500">Checking current worker capacity…</p>
                  ) : instagramBackfillCapacityPresentation.summary ? (
                    <p className="mt-2 text-sm font-semibold text-zinc-900">
                      {instagramBackfillCapacityPresentation.summary}
                    </p>
                  ) : null}
                  {instagramBackfillCapacityPresentation.warning ? (
                    <p
                      className={`mt-2 text-sm font-semibold ${
                        instagramBackfillCapacityPresentation.blocked ? "text-red-700" : "text-amber-700"
                      }`}
                      role={instagramBackfillCapacityPresentation.blocked ? "alert" : "status"}
                    >
                      {instagramBackfillCapacityPresentation.warning}
                    </p>
                  ) : null}
                </div>
                <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                    Conservative Full-Depth Estimate
                  </p>
                  <p className="mt-2 text-sm font-semibold text-sky-950">
                    {instagramBackfillPreflightItems.join(" · ")}
                  </p>
                  <p className="mt-1 text-xs text-sky-700">
                    Estimated wall time{" "}
                    {formatDurationEstimate(instagramBackfillEstimatedWallSeconds) ?? "unknown"} · Estimated worker cost{" "}
                    {instagramBackfillEstimatedWorkerMinutes > 0
                      ? `${formatInteger(Math.ceil(instagramBackfillEstimatedWorkerMinutes))} worker-min`
                      : "unknown"}
                    .
                  </p>
                  <p className="mt-1 text-xs text-sky-700">
                    Estimate uses {formatInteger(instagramBackfillEstimatedPostTargets)} catalog posts and{" "}
                    {formatInteger(instagramBackfillEstimatedCommentTargets || instagramBackfillEstimatedPostTargets)} comment targets.
                    The comments lane fetches full per-post threads, not a shallow profile export.
                  </p>
                </div>
                </div>
                <div className="-mx-6 -mb-6 mt-6 flex flex-col gap-3 border-t border-zinc-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-zinc-500 sm:max-w-sm">
                    {instagramBackfillSelectedTasks.length > 0
                      ? `Selected: ${
                          instagramBackfillMonthStart ? formatMonthYear(instagramBackfillMonthStart) : "open start"
                        } to ${
                          instagramBackfillMonthEnd ? formatMonthYear(instagramBackfillMonthEnd) : "open end"
                        } · ${instagramBackfillSelectedTasks.map((task) => formatBackfillTaskLabel(task)).join(", ")}${
                          instagramBackfillSelectedTasks.includes("post_details")
                            ? ` · ${formatInteger(instagramBackfillDisplayedDetailWorkers ?? instagramBackfillDetailWorkerCount)} detail workers${
                                instagramBackfillDisplayedDetailWorkers != null &&
                                instagramBackfillDisplayedDetailWorkers !== instagramBackfillDetailWorkerCount
                                  ? ` effective (${formatInteger(instagramBackfillDetailWorkerCount)} requested)`
                                  : ""
                              }`
                            : ""
                        }${
                          instagramBackfillSelectedTasks.includes("comments")
                            ? ` · ${formatInteger(instagramBackfillDisplayedCommentsWorkers ?? instagramBackfillCommentsWorkerCount)} comments workers${
                                instagramBackfillDisplayedCommentsWorkers != null &&
                                instagramBackfillDisplayedCommentsWorkers !== instagramBackfillCommentsWorkerCount
                                  ? ` effective (${formatInteger(instagramBackfillCommentsWorkerCount)} requested)`
                                  : ""
                              }`
                            : ""
                        }${
                          instagramBackfillCommentMediaEnabled ? " · comment media on" : ""
                        }`
                      : "Select at least one task to continue."}
                  </p>
                  {catalogLaunchGuardMessage ? (
                    <p className="text-xs font-semibold text-red-700 sm:max-w-sm">{catalogLaunchGuardMessage}</p>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setInstagramBackfillDialogOpen(false)}
                      variant="outline"
                      className={NYT_DASHBOARD_BUTTON_CLASS}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => void submitInstagramBackfillDialog()}
                      disabled={
                        instagramBackfillSelectedTasks.length === 0 ||
                        catalogLaunchActionsBlocked ||
                        instagramBackfillCapacityPresentation.blocked
                      }
                      variant="primary"
                      className={NYT_DASHBOARD_PRIMARY_BUTTON_CLASS}
                    >
                      {runningCatalogAction === "backfill" ? "Preparing Backfill…" : "Start Backfill"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
); }
