import type {
  CatalogBackfillSelectedTask,
  SocialAccountCatalogActionScope,
  SocialAccountCatalogRunProgressSnapshot,
  SocialAccountProfileSummary,
  SocialPlatformSlug,
} from "@/lib/admin/social-account-profile";

type BackfillTaskOption = {
  value: CatalogBackfillSelectedTask;
  label: string;
  description: string;
};

type LocalCatalogCommandDebugOptions = {
  progress?: SocialAccountCatalogRunProgressSnapshot | null;
  mode?: "resume" | "restart" | "probe_only" | "fresh";
};

type CatalogProgressDiagnosticRow = {
  key: string;
  label: string;
  value: string;
  detail: string | null;
};

type JsonRecord = Record<string, unknown>;

const INTEGER_FORMATTER = new Intl.NumberFormat("en-US");
const TWITTER_BACKFILL_LOOKBACK_DAYS = 365;
const CATALOG_ACTION_SCOPES: ReadonlyArray<SocialAccountCatalogActionScope> = [
  "full_history",
  "bounded_window",
  "recent_window",
  "head_gap",
  "frontier_resume",
];
export const INSTAGRAM_BACKFILL_TASK_OPTIONS: ReadonlyArray<BackfillTaskOption> = [
  {
    value: "post_details",
    label: "Post Details",
    description: "Run after the listing pass to refresh saved Instagram post details and metrics.",
  },
  {
    value: "comments",
    label: "Comments",
    description: "Follow listing with the full comments lane for saved Instagram posts in scope.",
  },
  {
    value: "media",
    label: "Media",
    description: "Follow listing by mirroring hosted post media to the R2/CDN lanes.",
  },
];
export const INSTAGRAM_BACKFILL_DEFAULT_SELECTED_TASKS: CatalogBackfillSelectedTask[] = [
  "post_details",
  "comments",
  "media",
];
export const TIKTOK_BACKFILL_DEFAULT_SELECTED_TASKS: CatalogBackfillSelectedTask[] = [
  "post_details",
  "comments",
  "media",
];
const INSTAGRAM_POSTS_ACCELERATION_FLAG_NAMES = [
  "SOCIAL_INSTAGRAM_POSTS_BIDIRECTIONAL_WALK_ENABLED",
  "SOCIAL_INSTAGRAM_POSTS_PER_IP_PACING_ENABLED",
  "SOCIAL_INSTAGRAM_POSTS_PAGE_PROXY_ROTATION_ENABLED",
  "SOCIAL_INSTAGRAM_POSTS_SHARED_WARMUP_ENABLED",
] as const;
const CATALOG_GAP_ANALYSIS_BACKOFF_BASE_MS = 2_000;
const CATALOG_GAP_ANALYSIS_BACKOFF_MAX_MS = 30_000;

export const getCatalogRepairAuthEndpointSegment = (
  repairAction: string | null | undefined,
): "manual-auth" | "repair-auth" => (repairAction === "repair_instagram_auth" ? "manual-auth" : "repair-auth");

export type InstagramCatalogCapacitySnapshot = {
  available: boolean;
  blocked: boolean;
  safe_combined_worker_limit: number;
  remaining_workers: number;
  raw_requested_workers: number;
  backend_effective_requested_workers: number;
  effective_details_worker_count: number;
  effective_comments_worker_count: number;
  active_db_jobs: number;
  dispatched_unclaimed_jobs: number;
  nonterminal_remote_call_ids: string[];
};

export const buildInstagramCatalogCapacityQuery = (input: {
  selectedTasks: CatalogBackfillSelectedTask[];
  detailWorkerCount: number;
  commentsWorkerCount: number;
}): URLSearchParams => {
  return new URLSearchParams({
    selected_tasks: input.selectedTasks.join(","),
    detail_worker_count: String(Math.max(1, input.detailWorkerCount)),
    comments_worker_count: String(Math.max(1, input.commentsWorkerCount)),
  });
};

const formatInteger = (value: number | null | undefined): string => {
  return INTEGER_FORMATTER.format(Number.isFinite(Number(value)) ? Number(value) : 0);
};

const readFiniteNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const readNonNegativeInteger = (value: unknown): number | null => {
  const numeric = readFiniteNumber(value);
  return numeric === null ? null : Math.max(0, Math.trunc(numeric));
};

const readString = (value: unknown): string | null => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

export const normalizeInstagramCatalogCapacity = (payload: unknown): InstagramCatalogCapacitySnapshot | null => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.available !== "boolean" || typeof record.blocked !== "boolean") return null;
  const readCount = (key: keyof InstagramCatalogCapacitySnapshot): number => readNonNegativeInteger(record[key]) ?? 0;
  return {
    available: record.available,
    blocked: record.blocked,
    safe_combined_worker_limit: readCount("safe_combined_worker_limit"),
    remaining_workers: readCount("remaining_workers"),
    raw_requested_workers: readCount("raw_requested_workers"),
    backend_effective_requested_workers: readCount("backend_effective_requested_workers"),
    effective_details_worker_count: readCount("effective_details_worker_count"),
    effective_comments_worker_count: readCount("effective_comments_worker_count"),
    active_db_jobs: readCount("active_db_jobs"),
    dispatched_unclaimed_jobs: readCount("dispatched_unclaimed_jobs"),
    nonterminal_remote_call_ids: Array.isArray(record.nonterminal_remote_call_ids)
      ? record.nonterminal_remote_call_ids.map((value) => String(value || "").trim()).filter(Boolean)
      : [],
  };
};

export const describeInstagramCatalogCapacity = (
  snapshot: InstagramCatalogCapacitySnapshot | null,
  unavailable = false,
): { blocked: boolean; summary: string | null; warning: string | null } => {
  if (!snapshot && !unavailable) return { blocked: false, summary: null, warning: null };
  if (unavailable || !snapshot) {
    return {
      blocked: false,
      summary: null,
      warning: "Current capacity is unavailable. Start remains available; the backend will make the final safety decision.",
    };
  }
  const summary = [
    `Backend-effective ${formatInteger(snapshot.effective_details_worker_count)} detail + ${formatInteger(snapshot.effective_comments_worker_count)} comments (${formatInteger(snapshot.backend_effective_requested_workers)} combined)`,
    `${formatInteger(snapshot.raw_requested_workers)} raw requested`,
    `${formatInteger(snapshot.remaining_workers)} of ${formatInteger(snapshot.safe_combined_worker_limit)} slots remain`,
  ].join(" · ");
  if (snapshot.blocked) {
    return {
      blocked: true,
      summary,
      warning: `Start is blocked: ${formatInteger(snapshot.backend_effective_requested_workers)} workers were requested but only ${formatInteger(snapshot.remaining_workers)} safe slots remain.`,
    };
  }
  if (!snapshot.available) {
    return {
      blocked: false,
      summary,
      warning: "Current capacity is unavailable. Start remains available; the backend will make the final safety decision.",
    };
  }
  return {
    blocked: false,
    summary,
    warning: null,
  };
};

export const defaultLocalCatalogCommandSelectedTasks = (
  platform: SocialPlatformSlug,
  action: "backfill" | "fill_missing_posts",
): CatalogBackfillSelectedTask[] => {
  if (action !== "backfill") {
    return [];
  }
  if (platform === "instagram") {
    return [...INSTAGRAM_BACKFILL_DEFAULT_SELECTED_TASKS];
  }
  if (platform === "tiktok") {
    return [...TIKTOK_BACKFILL_DEFAULT_SELECTED_TASKS];
  }
  return [];
};

const REDACTED_DEBUG_VALUE = "<redacted>";
const DEBUG_REDACT_KEY_PATTERN = /cookie|authorization|password|secret|token|proxy_url|proxyurl|sessionid|csrf|x-ig-|claim/i;

const redactDebugString = (value: string): string =>
  value
    .replace(/(https?:\/\/)([^/@\s]+)@/gi, `$1${REDACTED_DEBUG_VALUE}@`)
    .replace(/(sessionid|csrftoken|ds_user_id|ig_did|mid)=([^;\s]+)/gi, `$1=${REDACTED_DEBUG_VALUE}`)
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, `$1${REDACTED_DEBUG_VALUE}`);

const sanitizeDebugValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeDebugValue(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as JsonRecord).map(([key, innerValue]) => [
        key,
        DEBUG_REDACT_KEY_PATTERN.test(key) ? REDACTED_DEBUG_VALUE : sanitizeDebugValue(innerValue),
      ]),
    );
  }
  if (typeof value === "string") {
    return redactDebugString(value);
  }
  return value;
};

const normalizeDebugRecord = (value: unknown): JsonRecord | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return sanitizeDebugValue(value) as JsonRecord;
};

const getProgressFeatureFlagSnapshot = (
  progress?: SocialAccountCatalogRunProgressSnapshot | null,
): JsonRecord => {
  const explicitFlags =
    normalizeDebugRecord(progress?.acceleration_feature_flags) ??
    normalizeDebugRecord(progress?.posts_acceleration_flags) ??
    normalizeDebugRecord(progress?.feature_flags);
  const flags: JsonRecord = {};
  for (const flagName of INSTAGRAM_POSTS_ACCELERATION_FLAG_NAMES) {
    flags[flagName] = explicitFlags?.[flagName] ?? explicitFlags?.[flagName.toLowerCase()] ?? null;
  }
  return flags;
};

const hasPaginationResumeCursor = (
  paginationState?: SocialAccountCatalogRunProgressSnapshot["pagination_state"],
): boolean => {
  const states = Array.isArray(paginationState) ? paginationState : paginationState ? [paginationState] : [];
  return states.some((state) => Boolean(String(state?.end_cursor || state?.cursor_in || "").trim()));
};

const inferBackfillDebugMode = (
  progress?: SocialAccountCatalogRunProgressSnapshot | null,
  explicitMode?: LocalCatalogCommandDebugOptions["mode"],
): "resume" | "restart" | "probe_only" | "fresh" => {
  if (explicitMode) return explicitMode;
  const probeOnly =
    Boolean((progress?.posts_auth_probe as JsonRecord | undefined)?.probe_only) ||
    Boolean((progress?.bidirectional_probe as JsonRecord | undefined)?.probe_only);
  if (probeOnly) return "probe_only";
  const stopReason = String(progress?.stop_reason || progress?.run_diagnostics?.frontier_stop_reason || "").trim().toLowerCase();
  if (stopReason === "cursor_expired_restart_required") return "restart";
  if (progress?.resume_cursor_saved || hasPaginationResumeCursor(progress?.pagination_state)) return "resume";
  return "fresh";
};

const buildLocalCatalogCommandDebugSnapshot = ({
  platform,
  handle,
  sourceScope,
  action,
  selectedTasks,
  progress,
  mode,
}: {
  platform: SocialPlatformSlug;
  handle: string;
  sourceScope: string;
  action: "backfill" | "fill_missing_posts";
  selectedTasks: CatalogBackfillSelectedTask[];
  progress?: SocialAccountCatalogRunProgressSnapshot | null;
  mode?: LocalCatalogCommandDebugOptions["mode"];
}): JsonRecord => ({
  platform,
  account_handle: handle,
  action,
  source_scope: sourceScope,
  selected_tasks: selectedTasks,
  mode: inferBackfillDebugMode(progress, mode),
  run_id: progress?.run_id ?? null,
  run_status: progress?.run_status ?? null,
  partial_scrape: progress?.partial_scrape ?? null,
  stop_reason: progress?.stop_reason ?? progress?.run_diagnostics?.frontier_stop_reason ?? null,
  resume_cursor_saved: progress?.resume_cursor_saved ?? null,
  pagination_doc_id_stale: progress?.pagination_doc_id_stale ?? null,
  doc_id_used: progress?.doc_id_used ?? null,
  feature_flags: getProgressFeatureFlagSnapshot(progress),
  proxy_pacing: normalizeDebugRecord(progress?.proxy_pacing),
  warmup_pool: normalizeDebugRecord(progress?.warmup_pool),
  bidirectional_probe: normalizeDebugRecord(progress?.bidirectional_probe),
  posts_auth_probe: normalizeDebugRecord(progress?.posts_auth_probe),
  listing_progress: normalizeDebugRecord(progress?.listing_progress),
  details_progress: normalizeDebugRecord(progress?.details_progress),
});

export const buildLocalCatalogCommand = (
  platform: SocialPlatformSlug,
  handle: string,
  sourceScope: string,
  action: "backfill" | "fill_missing_posts",
  selectedTasks: CatalogBackfillSelectedTask[] = [],
  debugOptions: LocalCatalogCommandDebugOptions = {},
): string => {
  const selectedTaskArgs = selectedTasks.map((task) => ` --selected-task ${task}`).join("");
  const command = `cd ~/Projects/TRR/TRR-Backend && source .venv/bin/activate && python3 scripts/socials/local_catalog_action.py --platform ${platform} --account ${handle} --source-scope ${sourceScope} --action ${action}${selectedTaskArgs}`;
  const debugSnapshot = buildLocalCatalogCommandDebugSnapshot({
    platform,
    handle,
    sourceScope,
    action,
    selectedTasks,
    progress: debugOptions.progress,
    mode: debugOptions.mode,
  });
  return [
    command,
    "# TRR Backfill Posts debug snapshot (sanitized; no cookies, tokens, or proxy credentials)",
    `# ${JSON.stringify(sanitizeDebugValue(debugSnapshot))}`,
  ].join("\n");
};

export const formatDiagnosticToken = (value?: string | null): string => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  return normalized.replace(/_/g, " ");
};

const CATALOG_OPERATOR_REASON_LABELS: Record<string, string> = {
  instagram_graphql_cursor_unauthorized: "Instagram login expired; complete manual auth",
  instagram_graphql_cursor_forbidden: "Instagram blocked the saved cursor; complete manual auth",
  instagram_graphql_checkpoint_required: "Instagram checkpoint required before this run can resume",
  instagram_graphql_cursor_auth_repair_required: "Instagram cursor needs manual auth repair",
  frontier_auth_blocked: "Instagram blocked frontier resume until auth is fixed",
  run_deadline_exceeded: "Run timed out before recovery finished",
};

export const CATALOG_REPAIRABLE_OPERATOR_REASON_CODES = new Set(Object.keys(CATALOG_OPERATOR_REASON_LABELS));

export const formatCatalogOperatorReasonLabel = (value?: string | null): string => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  return CATALOG_OPERATOR_REASON_LABELS[normalized] ?? formatDiagnosticToken(normalized);
};

const COMMENTS_SKIP_REASON_LABELS: Record<string, string> = {
  comments_not_selected: "Comments lane not selected",
  posts_auth_blocked: "Posts auth blocked",
  no_commentable_targets: "No commentable targets",
  authenticated_comments_not_requested: "Authenticated comments not requested",
  comments_running_or_complete: "Comments already running or complete",
};

const formatCommentsSkipReasonLabel = (value?: string | null): string => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  return COMMENTS_SKIP_REASON_LABELS[normalized] ?? formatDiagnosticToken(normalized);
};

export const normalizeCatalogActionScope = (
  value?: string | null,
): SocialAccountCatalogActionScope | null => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  return CATALOG_ACTION_SCOPES.includes(normalized as SocialAccountCatalogActionScope)
    ? (normalized as SocialAccountCatalogActionScope)
    : null;
};

export const formatModalTargetLabel = (
  progress?: SocialAccountCatalogRunProgressSnapshot | null,
): string | null => {
  const appName = String(progress?.dispatch_health?.configured_app_name || "").trim();
  const functionName = String(progress?.dispatch_health?.configured_function_name || "").trim();
  if (!appName && !functionName) return null;
  return functionName ? `${appName || "<unset>"}.${functionName}` : appName;
};

export const formatSeasonLabel = (seasonNumber?: number | null): string => {
  return seasonNumber ? `Season ${seasonNumber}` : "All seasons";
};

export const formatBackfillTaskLabel = (task: CatalogBackfillSelectedTask): string => {
  return INSTAGRAM_BACKFILL_TASK_OPTIONS.find((option) => option.value === task)?.label ?? task;
};

export const buildTwitterBackfillWindow = (now = new Date()): { dateStart: string; dateEnd: string } => {
  const dateEnd = new Date(now);
  const dateStart = new Date(dateEnd);
  dateStart.setUTCDate(dateStart.getUTCDate() - TWITTER_BACKFILL_LOOKBACK_DAYS);
  return {
    dateStart: dateStart.toISOString(),
    dateEnd: dateEnd.toISOString(),
  };
};

const formatCoverageFieldLabel = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "music_info" || normalized === "music") return "Music";
  if (normalized === "owner_detail" || normalized === "owner") return "Owner";
  if (normalized === "tagged_collaborator_detail" || normalized === "tagged_collaborators") return "Tagged";
  if (normalized === "child_post_data" || normalized === "children") return "Children";
  if (normalized === "dimensions_alt_text" || normalized === "dimensions") return "Alt text/dimensions";
  if (normalized === "inline_comment_samples" || normalized === "sample_comments") return "Inline samples";
  return normalized
    .split("_")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
};

export const getNumberFromRecord = (record: unknown, keys: string[]): number | null => {
  if (typeof record === "number" && Number.isFinite(record)) return record;
  if (!record || typeof record !== "object") return null;
  for (const key of keys) {
    const value = (record as JsonRecord)[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
};

const getInstagramDbSessionCapacity = (
  progress?: SocialAccountCatalogRunProgressSnapshot | null,
): JsonRecord | null => {
  const direct = progress?.db_session_capacity;
  if (direct && typeof direct === "object") return direct as JsonRecord;
  const budgetDecision = progress?.budget_decision;
  if (!budgetDecision || typeof budgetDecision !== "object") return null;
  const nested = (budgetDecision as JsonRecord).db_session_capacity;
  return nested && typeof nested === "object" ? (nested as JsonRecord) : null;
};

const formatCoverageMetric = (metric: unknown): string | null => {
  const covered = getNumberFromRecord(metric, ["present_count", "covered_count", "saved_count", "count"]);
  const total = getNumberFromRecord(metric, ["total_count", "total_posts", "eligible_count", "available_posts"]);
  const pct = getNumberFromRecord(metric, ["pct", "percent"]);
  if (covered == null && total == null && pct == null) return null;
  const countLabel =
    covered != null && total != null
      ? `${formatInteger(covered)} / ${formatInteger(total)}`
      : covered != null
        ? formatInteger(covered)
        : total != null
          ? `0 / ${formatInteger(total)}`
          : null;
  const pctLabel = pct != null ? `${Math.round(pct)}%` : null;
  return [countLabel, pctLabel].filter(Boolean).join(" · ");
};

const formatPhaseProgress = (
  progress?: SocialAccountCatalogRunProgressSnapshot["listing_progress"] | null,
): string | null => {
  if (!progress) return null;
  const pages = getNumberFromRecord(progress, ["pages_scanned", "pages_completed"]);
  const postsSeen = getNumberFromRecord(progress, ["posts_seen", "posts_checked", "completed_posts", "matched_posts"]);
  const postsSaved = getNumberFromRecord(progress, ["posts_upserted", "posts_saved", "saved_posts"]);
  const totalPosts = getNumberFromRecord(progress, ["total_posts"]);
  const status = typeof progress.status === "string" && progress.status.trim() ? progress.status.trim().replaceAll("_", " ") : null;
  const parts = [
    pages != null ? `${formatInteger(pages)} pages` : null,
    postsSeen != null && totalPosts != null
      ? `${formatInteger(postsSeen)} / ${formatInteger(totalPosts)} posts`
      : postsSeen != null
        ? `${formatInteger(postsSeen)} posts`
        : null,
    postsSaved != null ? `${formatInteger(postsSaved)} saved` : null,
    status,
  ];
  return parts.filter(Boolean).join(" · ") || null;
};

export const buildCatalogProgressDiagnosticRows = (
  progress?: SocialAccountCatalogRunProgressSnapshot | null,
  summary?: SocialAccountProfileSummary | null,
): CatalogProgressDiagnosticRow[] => {
  const rows: CatalogProgressDiagnosticRow[] = [];
  const detailsLabel = formatPhaseProgress(progress?.details_progress);
  const listingLabel = formatPhaseProgress(progress?.listing_progress);
  const listingPages = getNumberFromRecord(progress?.listing_progress, ["pages_scanned", "pages_completed"]);
  const listingPostsSeen = getNumberFromRecord(progress?.listing_progress, [
    "posts_seen",
    "posts_checked",
    "completed_posts",
    "matched_posts",
  ]);
  const listingPostsSaved = getNumberFromRecord(progress?.listing_progress, [
    "posts_upserted",
    "posts_saved",
    "saved_posts",
  ]);
  const listingStatus = String(progress?.listing_progress?.status || "").trim();
  const selectedTasks = new Set([...(progress?.selected_tasks ?? []), ...(progress?.effective_selected_tasks ?? [])]);
  const budgetDecision = progress?.budget_decision as JsonRecord | null | undefined;
  const budgetLimits = budgetDecision?.limits as JsonRecord | null | undefined;
  const budgetRunbook =
    (progress?.runbook_state as JsonRecord | null | undefined) ??
    (budgetDecision?.runbook_state as JsonRecord | null | undefined);
  const budgetState = String(budgetDecision?.state || "").trim().toLowerCase();
  const effectiveBudgetCap = getNumberFromRecord(budgetLimits, [
    "effective_max_concurrent_jobs",
    "normal_max_concurrent_jobs",
  ]);
  const requestedBudgetCap = getNumberFromRecord(budgetLimits, [
    "requested_max_concurrent_jobs",
    "healthy_max_concurrent_jobs",
  ]);
  const bindingBudgetCap =
    getNumberFromRecord(budgetLimits, ["live_apply_binding_cap", "comments_job_concurrency_limit", "binding_cap"]) ??
    getNumberFromRecord(budgetRunbook, ["binding_cap", "current_comments_cap"]);
  const canaryMetadata = budgetRunbook?.cap4_canary as JsonRecord | null | undefined;
  const canaryCap =
    getNumberFromRecord(budgetLimits, ["cap4_canary_max_concurrent_jobs"]) ??
    getNumberFromRecord(budgetRunbook, ["speed_canary_cap"]) ??
    getNumberFromRecord(canaryMetadata, ["cap"]);
  const canaryMinimumJobs =
    getNumberFromRecord(budgetRunbook, ["minimum_completed_comments_jobs"]) ??
    getNumberFromRecord(canaryMetadata, ["minimum_completed_comments_jobs"]);
  const canaryActive = Boolean(
    progress?.enable_cap4_canary ||
      budgetLimits?.cap4_canary_active ||
      canaryMetadata?.active,
  );
  const dbSessionCapacity = getInstagramDbSessionCapacity(progress);
  const dbSessionWorkerBudget = getNumberFromRecord(dbSessionCapacity, [
    "safe_combined_worker_limit",
    "worker_budget",
  ]);
  const dbSessionActiveWorkers = getNumberFromRecord(dbSessionCapacity, ["active_workers"]);
  const dbSessionRemainingWorkers = getNumberFromRecord(dbSessionCapacity, ["remaining_workers"]);
  if (dbSessionWorkerBudget != null) {
    rows.push({
      key: "db-session-worker-capacity",
      label: "DB-safe Combined Workers",
      value: [
        `${formatInteger(dbSessionWorkerBudget)} max`,
        dbSessionActiveWorkers != null ? `${formatInteger(dbSessionActiveWorkers)} active` : null,
        dbSessionRemainingWorkers != null ? `${formatInteger(dbSessionRemainingWorkers)} remaining` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      detail: "This combined limit covers Instagram detail, shared-post, comments, and recovery workers.",
    });
  }
  if (budgetState || effectiveBudgetCap != null || bindingBudgetCap != null) {
    const budgetParts = [
      budgetState ? formatDiagnosticToken(budgetState) : null,
      effectiveBudgetCap != null ? `effective cap ${formatInteger(effectiveBudgetCap)}` : null,
      bindingBudgetCap != null ? `binding cap ${formatInteger(bindingBudgetCap)}` : null,
      requestedBudgetCap != null && requestedBudgetCap !== effectiveBudgetCap
        ? `requested ${formatInteger(requestedBudgetCap)}`
        : null,
    ].filter(Boolean);
    rows.push({
      key: "budget-decision",
      label: "Budget",
      value: budgetParts.join(" · "),
      detail: "Budget is checked before catalog jobs launch; paused or identity-blocked lanes do not dispatch new catalog work.",
    });
  }
  if (canaryCap != null) {
    rows.push({
      key: "cap4-canary",
      label: "Cap 4 Canary",
      value: canaryActive ? `enabled at cap ${formatInteger(canaryCap)}` : `available at cap ${formatInteger(canaryCap)}`,
      detail:
        canaryMinimumJobs != null
          ? `Trust the verdict after at least ${formatInteger(canaryMinimumJobs)} completed comments jobs.`
          : "Roll back to cap 2 on auth, proxy, 429, or zero-write failures.",
    });
  }
  const hasDetailRefreshSignal =
    Boolean(detailsLabel) ||
    getNumberFromRecord(progress?.post_progress, ["completed_posts", "matched_posts"]) != null ||
    getNumberFromRecord(progress?.summary, ["items_found_total"]) != null;
  const shouldSuppressZeroListingProgress =
    selectedTasks.has("post_details") &&
    hasDetailRefreshSignal &&
    !listingStatus &&
    (listingPages ?? 0) <= 0 &&
    (listingPostsSeen ?? 0) <= 0 &&
    (listingPostsSaved ?? 0) <= 0;
  if (listingLabel && !shouldSuppressZeroListingProgress) {
    rows.push({
      key: "listing-progress",
      label: "Listing Progress",
      value: listingLabel,
      detail: "Listing saves reachable post identities first; details, comments, and media can continue afterward.",
    });
  }

  if (detailsLabel) {
    rows.push({
      key: "details-progress",
      label: "Details Progress",
      value: detailsLabel,
      detail: "Detail refresh coverage is separate from listing completion.",
    });
  }

  if (selectedTasks.has("post_details")) {
    const appliedDetailWorkerCount = getNumberFromRecord(progress, ["details_refresh_worker_count"]);
    const requestedDetailWorkerCount = getNumberFromRecord(progress, ["requested_details_worker_count"]);
    const liveApplyBindingCap = getNumberFromRecord(progress, ["live_apply_binding_cap"]);
    const workerCapNote = readString(progress?.worker_cap_note);
    const detailWorkerCount =
      appliedDetailWorkerCount ??
      getNumberFromRecord(progress?.worker_runtime, ["runner_count"]) ??
      getNumberFromRecord(progress, ["detail_worker_count", "details_refresh_shard_count"]);
    const detailRunnerStrategy = String(progress?.worker_runtime?.runner_strategy || "").trim().toLowerCase();
    if (detailWorkerCount != null) {
      const showRequestedVsApplied =
        requestedDetailWorkerCount != null && requestedDetailWorkerCount !== detailWorkerCount;
      const workerValue = showRequestedVsApplied
        ? `${formatInteger(detailWorkerCount)} applied · ${formatInteger(requestedDetailWorkerCount)} requested`
        : `${formatInteger(detailWorkerCount)} ${detailWorkerCount === 1 ? "worker" : "workers"}`;
      const detailParts = [
        detailRunnerStrategy ? `Strategy: ${formatDiagnosticToken(detailRunnerStrategy)}.` : null,
        liveApplyBindingCap != null ? `Binding cap ${formatInteger(liveApplyBindingCap)}.` : null,
        workerCapNote,
      ].filter(Boolean);
      rows.push({
        key: "detail-worker-count",
        label: "Detail Worker Count",
        value: workerValue,
        detail: detailParts.length > 0 ? detailParts.join(" ") : null,
      });
    }
    if (detailWorkerCount === 1 && detailRunnerStrategy === "single_runner") {
      rows.push({
        key: "detail-single-runner-warning",
        label: "Detail Speed Warning",
        value: "Single-runner detail refresh",
        detail: "Large Instagram accounts should launch with parallel detail workers.",
      });
    }
  }

  if (selectedTasks.has("comments")) {
    const targetReadiness = progress?.target_readiness as JsonRecord | null | undefined;
    const commentsPreview = targetReadiness?.comments_preview;
    const commentsWorkerCount =
      getNumberFromRecord(progress, ["comments_worker_count"]) ??
      getNumberFromRecord(commentsPreview, ["comments_shard_count", "recommended_comments_shard_count"]) ??
      getNumberFromRecord(targetReadiness, ["comments_shard_count", "recommended_comments_shard_count"]);
    if (commentsWorkerCount != null) {
      rows.push({
        key: "comments-worker-count",
        label: "Comments Worker Count",
        value: `${formatInteger(commentsWorkerCount)} ${commentsWorkerCount === 1 ? "worker" : "workers"}`,
        detail: "Comments workers are separate from post-detail workers.",
      });
    }
  }

  const commentsSkipReason = readString(progress?.comments_skip_reason);
  if (commentsSkipReason) {
    const commentsSkipDetail = readString(progress?.comments_skip_detail);
    const commentsOperatorAction = readString(progress?.comments_operator_action);
    const skipDetailParts = [
      commentsSkipDetail,
      commentsOperatorAction ? `Operator action: ${commentsOperatorAction}` : null,
    ].filter(Boolean);
    rows.push({
      key: "comments-skip-reason",
      label: "Comments Skipped",
      value: formatCommentsSkipReasonLabel(commentsSkipReason),
      detail: skipDetailParts.length > 0 ? skipDetailParts.join(" ") : null,
    });
  }

  const coverage = progress?.rich_field_coverage ?? progress?.field_coverage ?? null;
  if (coverage && typeof coverage === "object") {
    const preferredKeys = [
      "music_info",
      "owner_detail",
      "tagged_collaborator_detail",
      "child_post_data",
      "dimensions_alt_text",
      "inline_comment_samples",
    ];
    const entries = Object.entries(coverage)
      .sort(([left], [right]) => {
        const leftIndex = preferredKeys.indexOf(left);
        const rightIndex = preferredKeys.indexOf(right);
        if (leftIndex !== -1 || rightIndex !== -1) {
          return (leftIndex === -1 ? 100 : leftIndex) - (rightIndex === -1 ? 100 : rightIndex);
        }
        return left.localeCompare(right);
      })
      .map(([key, metric]) => {
        const label = formatCoverageFieldLabel(key);
        const value = formatCoverageMetric(metric);
        return value ? `${label} ${value}` : null;
      })
      .filter(Boolean);
    if (entries.length > 0) {
      rows.push({
        key: "rich-field-coverage",
        label: "Rich Field Coverage",
        value: entries.join(" · "),
        detail: "Rich coverage tracks listing/detail fields and does not mean the post catalog itself is incomplete.",
      });
    }
  }

  const inlineSamples =
    getNumberFromRecord(progress?.sample_comments, ["inline_comments_upserted", "inline_comment_samples", "saved_samples"]) ??
    getNumberFromRecord(progress, ["inline_comments_upserted"]) ??
    getNumberFromRecord(summary?.comments_saved_summary, ["inline_comments_upserted", "inline_comment_samples"]);
  if (inlineSamples != null) {
    rows.push({
      key: "sample-comments",
      label: "Sample Comments",
      value: `${formatInteger(inlineSamples)} inline samples saved`,
      detail: "Inline samples are useful previews, but they do not satisfy the full comments lane.",
    });
  }

  const stateParts = [
    progress?.partial_scrape ? "partial scrape" : null,
    progress?.resume_cursor_saved ? "resume cursor saved" : null,
    progress?.pagination_doc_id_stale ? "doc ID stale" : null,
    progress?.doc_id_used ? `doc ${String(progress.doc_id_used).slice(0, 10)}` : null,
  ].filter(Boolean);
  if (stateParts.length > 0) {
    rows.push({
      key: "pagination-state",
      label: "Pagination State",
      value: stateParts.join(" · "),
      detail: progress?.stop_reason ? `Stop reason: ${formatDiagnosticToken(progress.stop_reason)}.` : null,
    });
  }

  return rows;
};

export const resolveCatalogRequestBackoffMs = (
  error: { retryAfterMs?: number } | null,
  saturationAttempt: number,
): number => {
  const exponentialDelayMs = Math.min(
    CATALOG_GAP_ANALYSIS_BACKOFF_MAX_MS,
    CATALOG_GAP_ANALYSIS_BACKOFF_BASE_MS * 2 ** saturationAttempt,
  );
  return Math.max(error?.retryAfterMs ?? 0, exponentialDelayMs);
};

export const waitForCatalogRetry = (
  delayMs: number,
  signal: AbortSignal,
): Promise<"elapsed" | "cancelled"> => {
  if (signal.aborted) return Promise.resolve("cancelled");

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: "elapsed" | "cancelled") => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", handleAbort);
      resolve(result);
    };
    const timeoutId = window.setTimeout(() => finish("elapsed"), Math.max(0, delayMs));
    const handleAbort = () => {
      window.clearTimeout(timeoutId);
      finish("cancelled");
    };
    signal.addEventListener("abort", handleAbort, { once: true });
  });
};
