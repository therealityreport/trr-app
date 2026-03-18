export type ReviewableRunState = {
  status?: string | null;
  review_status?: string | null;
  is_publishable?: boolean;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  manifest_key?: string | null;
};

export type CurrentPublishVersionState = {
  is_current: boolean;
  version_number: number;
};

export const allowedReviewTransitions: Record<string, string[]> = {
  draft: ["ready_for_review"],
  ready_for_review: ["in_review"],
  in_review: ["approved", "rejected"],
  rejected: ["in_review"],
  approved: [],
};

export function isRunReviewable(run?: ReviewableRunState | null): boolean {
  return Boolean(run && run.status === "success");
}

export function isDispatchFailedRun(run?: ReviewableRunState | null): boolean {
  return Boolean(
    run &&
      run.status === "pending" &&
      run.error_message &&
      !run.started_at &&
      !run.completed_at &&
      !run.manifest_key,
  );
}

export function getExecutionStatusLabel(run?: ReviewableRunState | null): string {
  if (!run) {
    return "n/a";
  }
  return isDispatchFailedRun(run) ? "failed" : run.status || "n/a";
}

export function getAllowedReviewTransitions(run?: ReviewableRunState | null): string[] {
  if (!isRunReviewable(run)) {
    return [];
  }
  return allowedReviewTransitions[run?.review_status || "draft"] || [];
}

export function getRunOverviewMessage(
  run: ReviewableRunState | null | undefined,
  currentPublishVersion?: CurrentPublishVersionState | null,
): string {
  if (!run) {
    return "";
  }

  if (isDispatchFailedRun(run) || run.status === "failed" || run.status === "cancelled") {
    return "This run did not complete successfully. Fix the execution issue and launch a new run before entering review.";
  }

  if (run.is_publishable === false) {
    if (isRunReviewable(run)) {
      return "This run is a completed independent report. It remains reviewable, but it never contributes to canonical episode, season, or show totals.";
    }
    return "This asset is a non-publishable independent report. It never contributes to canonical totals, and review stays unavailable until the run completes successfully.";
  }

  if (currentPublishVersion?.is_current) {
    return `This run is the current canonical published version (v${currentPublishVersion.version_number}).`;
  }

  if (run.status === "success" && (run.review_status || "draft") === "approved") {
    return "This run is approved and eligible to be published into canonical episode, season, and show totals.";
  }

  if (isRunReviewable(run)) {
    return "This run is still in review flow. Draft totals are visible but not canonical until approval and explicit publish.";
  }

  return "This run is still executing. Review stays unavailable until it completes successfully.";
}
