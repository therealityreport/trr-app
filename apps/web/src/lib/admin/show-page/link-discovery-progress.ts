export interface LinkDiscoveryProgressMetric {
  label: string;
  value: string;
}

export interface LinkDiscoveryProgressSummary {
  currentStage: string;
  stageLabel: string;
  headline: string;
  detail: string | null;
  budgetLabel: string | null;
  elapsedLabel: string | null;
  stageElapsedLabel: string | null;
  targetSummary: string | null;
  stageProgressLabel: string | null;
  currentTargetLabel: string | null;
  metrics: LinkDiscoveryProgressMetric[];
  heartbeat: boolean;
  terminal: boolean;
  stalled: boolean;
  stalledReason: string | null;
  lastProgressAt: string | null;
  lastStageTransitionAt: string | null;
}

const parseProgressNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const humanizeStage = (value: string): string => {
  return value
    .trim()
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
};

const formatElapsedLabel = (value: number | null, suffix = "elapsed"): string | null => {
  if (value === null || value < 0) return null;
  return `${Math.max(0, Math.round(value / 1000))}s ${suffix}`;
};

const humanizeBudgetReason = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/[_-]+/g, " ");
};

const buildTargetSummary = (value: unknown): string | null => {
  if (value && typeof value === "object") {
    const targetProgress = value as Record<string, unknown>;
    const renderBucket = (bucketValue: unknown, label: string): string | null => {
      if (!bucketValue || typeof bucketValue !== "object") return null;
      const bucket = bucketValue as Record<string, unknown>;
      const completed = parseProgressNumber(bucket.completed);
      const total = parseProgressNumber(bucket.total);
      if (completed === null || total === null || total <= 0) return null;
      return `${completed}/${total} ${label}`;
    };

    const progressParts = [
      renderBucket(targetProgress.shows, "Shows"),
      renderBucket(targetProgress.seasons, "Seasons"),
      renderBucket(targetProgress.cast_members, "Cast Members"),
    ].filter((part): part is string => Boolean(part));

    if (progressParts.length > 0) {
      return progressParts.join(" · ");
    }
  }

  if (!value || typeof value !== "object") return null;
  const targets = value as Record<string, unknown>;
  const showCount = parseProgressNumber(targets.show_scanned);
  const seasonCount = parseProgressNumber(targets.season_scanned);
  const peopleCount = parseProgressNumber(targets.people_scanned);
  const parts = [
    showCount !== null ? `show ${showCount}` : null,
    seasonCount !== null ? `seasons ${seasonCount}` : null,
    peopleCount !== null ? `cast ${peopleCount}` : null,
  ].filter((part): part is string => Boolean(part));
  if (parts.length === 0) return null;
  return `Targets: ${parts.join(" · ")}`;
};

const buildStageProgressSummary = (
  value: unknown,
  currentStage: string
): { stageProgressLabel: string | null; currentTargetLabel: string | null } => {
  if (!value || typeof value !== "object") {
    return { stageProgressLabel: null, currentTargetLabel: null };
  }
  const progress = value as Record<string, unknown>;
  if (currentStage.startsWith("cleanup") || currentStage === "completed") {
    const validatedLinks = parseProgressNumber(progress.validated_links);
    const promotedLinks = parseProgressNumber(progress.promoted_links);
    const deletedLinks = parseProgressNumber(progress.deleted_links);
    const normalizedSocialUrls = parseProgressNumber(progress.normalized_social_urls);
    const cleanupParts = [
      validatedLinks !== null ? `${validatedLinks} validated` : null,
      promotedLinks !== null ? `${promotedLinks} promoted` : null,
      deletedLinks !== null ? `${deletedLinks} deleted` : null,
      normalizedSocialUrls !== null ? `${normalizedSocialUrls} normalized` : null,
    ].filter((part): part is string => Boolean(part));
    return {
      stageProgressLabel: cleanupParts.length > 0 ? cleanupParts.join(" · ") : null,
      currentTargetLabel: null,
    };
  }

  const processedTargets = parseProgressNumber(progress.processed_targets);
  const totalTargets = parseProgressNumber(progress.total_targets);
  const linksDiscovered = parseProgressNumber(progress.links_discovered);
  const targetsWithLinks = parseProgressNumber(progress.targets_with_links);
  const currentTargetLabel =
    typeof progress.current_target_label === "string" && progress.current_target_label.trim().length > 0
      ? progress.current_target_label.trim()
      : null;

  const parts = [
    processedTargets !== null && totalTargets !== null ? `${processedTargets}/${totalTargets} processed` : null,
    linksDiscovered !== null ? `${linksDiscovered} links found` : null,
    targetsWithLinks !== null ? `${targetsWithLinks} matches` : null,
  ].filter((part): part is string => Boolean(part));

  return {
    stageProgressLabel: parts.length > 0 ? parts.join(" · ") : null,
    currentTargetLabel,
  };
};

export const buildLinkDiscoveryProgressSummary = (
  payload: Record<string, unknown>,
  stageLabels: Record<string, string>
): LinkDiscoveryProgressSummary => {
  const payloadStage = typeof payload.stage === "string" ? payload.stage.trim().toLowerCase() : "";
  const currentStage =
    typeof payload.current_stage === "string" && payload.current_stage.trim().length > 0
      ? payload.current_stage.trim().toLowerCase()
      : payloadStage || "refresh";
  const stageLabel = stageLabels[currentStage] ?? humanizeStage(currentStage);
  const rawMessage = typeof payload.message === "string" ? payload.message.trim() : "";
  const heartbeat = payload.heartbeat === true || payloadStage === "heartbeat";
  const terminal =
    currentStage === "completed" ||
    payload.status === "ok" ||
    payload.status === "timed_out" ||
    payload.status === "failed" ||
    payload.status === "cancelled";
  const headline = rawMessage
    ? heartbeat && rawMessage.toLowerCase() === "discovery still running..."
      ? `${stageLabel} still running...`
      : rawMessage
    : heartbeat
      ? `${stageLabel} still running...`
      : terminal
        ? stageLabel
        : `${stageLabel} in progress`;

  const elapsedLabel = formatElapsedLabel(parseProgressNumber(payload.elapsed_ms));
  const stageElapsedLabel = formatElapsedLabel(parseProgressNumber(payload.stage_elapsed_ms), "in this stage");
  const targetSummary = buildTargetSummary(
    payload.target_progress && typeof payload.target_progress === "object"
      ? payload.target_progress
      : payload.scan_targets
  );
  const { stageProgressLabel, currentTargetLabel } = buildStageProgressSummary(payload.stage_progress, currentStage);

  const metrics: LinkDiscoveryProgressMetric[] = [];
  const discoveredRows = parseProgressNumber(payload.discovered_rows);
  if (discoveredRows !== null) metrics.push({ label: "Discovered", value: String(discoveredRows) });
  const rows = parseProgressNumber(payload.rows);
  if (rows !== null) metrics.push({ label: "Stage Rows", value: String(rows) });
  const upserted = parseProgressNumber(payload.upserted);
  if (upserted !== null) metrics.push({ label: "Upserted", value: String(upserted) });
  const approvedAdded = parseProgressNumber(payload.approved_added);
  if (approvedAdded !== null) metrics.push({ label: "Approved", value: String(approvedAdded) });
  const linksValidated = parseProgressNumber(payload.links_validated);
  if (linksValidated !== null) metrics.push({ label: "Validated", value: String(linksValidated) });
  const totalFandomCandidatesTested =
    parseProgressNumber(payload.fandom_candidates_tested_total) ?? parseProgressNumber(payload.fandom_candidates_tested);
  if (totalFandomCandidatesTested !== null) {
    metrics.push({ label: "Fandom Tested (run)", value: String(totalFandomCandidatesTested) });
  }
  const stageFandomCandidatesTested =
    parseProgressNumber(payload.stage_fandom_candidates_tested) ??
    parseProgressNumber(
      payload.stage_budget && typeof payload.stage_budget === "object"
        ? (payload.stage_budget as Record<string, unknown>).stage_fandom_candidates_tested
        : null
    );
  if (stageFandomCandidatesTested !== null) {
    metrics.push({ label: "Fandom Tested (stage)", value: String(stageFandomCandidatesTested) });
  }

  const stageBudget =
    payload.stage_budget && typeof payload.stage_budget === "object"
      ? (payload.stage_budget as Record<string, unknown>)
      : null;
  const budgetLabel =
    stageBudget?.budget_exhausted === true
      ? `Budget exhausted: ${humanizeBudgetReason(stageBudget.budget_reason) ?? "candidate limit"}`
      : null;
  if (stageBudget) {
    const stageTested = parseProgressNumber(stageBudget.stage_fandom_candidates_tested);
    const maxCandidates = parseProgressNumber(stageBudget.max_fandom_candidates);
    if (stageTested !== null && maxCandidates !== null && maxCandidates > 0) {
      metrics.push({ label: "Candidate Budget", value: `${stageTested}/${maxCandidates}` });
    }
  }
  const stalled = payload.stalled === true;
  const stalledReason = humanizeBudgetReason(payload.stalled_reason);
  const lastProgressAt =
    typeof payload.last_progress_at === "string" && payload.last_progress_at.trim().length > 0
      ? payload.last_progress_at.trim()
      : null;
  const lastStageTransitionAt =
    typeof payload.last_stage_transition_at === "string" && payload.last_stage_transition_at.trim().length > 0
      ? payload.last_stage_transition_at.trim()
      : null;

  return {
    currentStage,
    stageLabel,
    headline,
    detail: rawMessage && headline !== rawMessage ? rawMessage : null,
    budgetLabel,
    elapsedLabel,
    stageElapsedLabel,
    targetSummary,
    stageProgressLabel,
    currentTargetLabel,
    metrics,
    heartbeat,
    terminal,
    stalled,
    stalledReason,
    lastProgressAt,
    lastStageTransitionAt,
  };
};
