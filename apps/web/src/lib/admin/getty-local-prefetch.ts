export type GettyLocalPrefetchBodyPatch = {
  getty_prefetch_attempted: true;
  getty_prefetch_succeeded: boolean;
  getty_prefetch_error_code?: string;
  getty_prefetch_token?: string;
  getty_prefetch_mode?: string;
  getty_deferred_enrichment?: boolean;
  getty_deferred_editorial_ids?: string[];
  getty_transport_mode?: string;
  getty_proxy_fingerprint?: string;
  getty_runtime_probe_status?: string;
  getty_runtime_probe_reason?: string;
  getty_fallback_invoked?: boolean;
  getty_primary_failure_reason?: string;
  getty_session_validated?: boolean;
  getty_session_truncated?: boolean;
};

export type GettyLocalPrefetchProgressState = {
  status: "queued" | "running" | "completed" | "failed";
  stage: string | null;
  progressMessage: string | null;
  heartbeatAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  activeQuery: Record<string, unknown> | null;
  queriesTotal: number | null;
  queriesCompleted: number | null;
  requestedPage: number | null;
  expectedPage: number | null;
  currentPage: number | null;
  responseUrl: string | null;
  fetchedCandidatesTotal: number | null;
  pageCandidateCount: number | null;
  newUniqueCount: number | null;
  pageClassification: string | null;
  terminationReason: string | null;
  pageSignature: string | null;
  firstEditorialIds: string[];
  siteImageTotal: number | null;
  siteEventTotal: number | null;
  siteVideoTotal: number | null;
  authMode: string | null;
  authWarning: string | null;
  sessionValidated: boolean;
  sessionTruncated: boolean;
  transportMode: string | null;
  proxyFingerprint: string | null;
  runtimeProbeStatus: string | null;
  runtimeProbeReason: string | null;
  fallbackInvoked: boolean;
  primaryFailureReason: string | null;
  querySummariesLive: Array<Record<string, unknown>>;
  lastError: string | null;
  lastErrorCode: string | null;
};

export type GettyLocalPrefetchResult = {
  bodyPatch: GettyLocalPrefetchBodyPatch;
  mergedAssetCount: number;
  mergedEventCount: number;
  candidateManifestTotal: number;
  detailEnrichmentTotal: number;
  deferredEditorialIds: string[];
  querySummaries: Array<Record<string, unknown>>;
  authMode: string | null;
  authWarning: string | null;
  transportMode: string | null;
  proxyFingerprint: string | null;
  runtimeProbeStatus: string | null;
  runtimeProbeReason: string | null;
  fallbackInvoked: boolean;
  primaryFailureReason: string | null;
  sessionValidated: boolean;
  sessionTruncated: boolean;
  elapsedSeconds: number | null;
  prefetchMode: string | null;
  discoveryReady: boolean;
  enrichmentPending: boolean;
};

export type GettyRemoteReadiness = {
  ready: boolean;
  status: "healthy" | "blocked" | "disabled" | "unknown";
  reason: string | null;
  transportMode: string | null;
  proxyFingerprint: string | null;
  queries: Array<Record<string, unknown>>;
  checkedAt: string;
};

export class GettyLocalPrefetchError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "GettyLocalPrefetchError";
    this.code = code;
  }
}

const GETTY_LOCAL_PREFETCH_TIMEOUT_MS = 600_000;
const GETTY_LOCAL_PREFETCH_POLL_INTERVAL_MS = 1_000;

type GettyLocalPrefetchStatusResponse = {
  prefetch_token?: string;
  status?: "queued" | "running" | "completed" | "failed";
  stage?: string | null;
  progress_message?: string | null;
  heartbeat_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  active_query?: Record<string, unknown> | null;
  queries_total?: number;
  queries_completed?: number;
  requested_page?: number;
  expected_page?: number;
  current_page?: number;
  response_url?: string | null;
  fetched_candidates_total?: number;
  page_candidate_count?: number;
  new_unique_count?: number;
  page_classification?: string | null;
  termination_reason?: string | null;
  page_signature?: string | null;
  first_editorial_ids?: string[];
  site_image_total?: number;
  site_event_total?: number;
  site_video_total?: number;
  last_error?: string | null;
  last_error_code?: string | null;
  query_summaries_live?: Array<Record<string, unknown>>;
  poll_after_ms?: number;
  merged_total?: number;
  merged_events_total?: number;
  candidate_manifest_total?: number;
  detail_enrichment_total?: number;
  deferred_editorial_ids?: string[];
  query_summaries?: unknown[];
  auth_mode?: string | null;
  auth_warning?: string | null;
  session_validated?: boolean;
  session_truncated?: boolean;
  getty_transport_mode?: string | null;
  getty_proxy_fingerprint?: string | null;
  getty_runtime_probe_status?: string | null;
  getty_runtime_probe_reason?: string | null;
  getty_fallback_invoked?: boolean;
  getty_primary_failure_reason?: string | null;
  elapsed_seconds?: number;
  prefetch_mode?: string | null;
  discovery_ready?: boolean;
  enrichment_pending?: boolean;
};

const asNullableNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const asNullableString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const mapStatusToProgress = (
  payload: GettyLocalPrefetchStatusResponse
): GettyLocalPrefetchProgressState => ({
  status: payload.status === "failed" || payload.status === "completed" ? payload.status : payload.status === "queued" ? "queued" : "running",
  stage: asNullableString(payload.stage),
  progressMessage: asNullableString(payload.progress_message),
  heartbeatAt: asNullableString(payload.heartbeat_at),
  startedAt: asNullableString(payload.started_at),
  completedAt: asNullableString(payload.completed_at),
  activeQuery:
    payload.active_query && typeof payload.active_query === "object" && !Array.isArray(payload.active_query)
      ? payload.active_query
      : null,
  queriesTotal: asNullableNumber(payload.queries_total),
  queriesCompleted: asNullableNumber(payload.queries_completed),
  requestedPage: asNullableNumber(payload.requested_page),
  expectedPage: asNullableNumber(payload.expected_page),
  currentPage: asNullableNumber(payload.current_page),
  responseUrl: asNullableString(payload.response_url),
  fetchedCandidatesTotal: asNullableNumber(payload.fetched_candidates_total),
  pageCandidateCount: asNullableNumber(payload.page_candidate_count),
  newUniqueCount: asNullableNumber(payload.new_unique_count),
  pageClassification: asNullableString(payload.page_classification),
  terminationReason: asNullableString(payload.termination_reason),
  pageSignature: asNullableString(payload.page_signature),
  firstEditorialIds: Array.isArray(payload.first_editorial_ids)
    ? payload.first_editorial_ids.filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0
      )
    : [],
  siteImageTotal: asNullableNumber(payload.site_image_total),
  siteEventTotal: asNullableNumber(payload.site_event_total),
  siteVideoTotal: asNullableNumber(payload.site_video_total),
  authMode: asNullableString(payload.auth_mode),
  authWarning: asNullableString(payload.auth_warning),
  sessionValidated: payload.session_validated === true,
  sessionTruncated: payload.session_truncated === true,
  transportMode: asNullableString(payload.getty_transport_mode),
  proxyFingerprint: asNullableString(payload.getty_proxy_fingerprint),
  runtimeProbeStatus: asNullableString(payload.getty_runtime_probe_status),
  runtimeProbeReason: asNullableString(payload.getty_runtime_probe_reason),
  fallbackInvoked: payload.getty_fallback_invoked === true,
  primaryFailureReason: asNullableString(payload.getty_primary_failure_reason),
  querySummariesLive: Array.isArray(payload.query_summaries_live)
    ? payload.query_summaries_live.filter(
        (entry): entry is Record<string, unknown> =>
          Boolean(entry) && typeof entry === "object" && !Array.isArray(entry)
      )
    : [],
  lastError: asNullableString(payload.last_error),
  lastErrorCode: asNullableString(payload.last_error_code),
});

export async function prefetchGettyLocallyForPerson(
  personName: string,
  showName?: string | null,
  options?: {
    mode?: "discovery" | "full";
    prefetchToken?: string | null;
    transportMode?: "auto" | "decodo_remote" | "local_browser" | "cookies_only";
    onProgress?: (progress: GettyLocalPrefetchProgressState) => void;
  }
): Promise<GettyLocalPrefetchResult> {
  const normalizedPersonName = personName.trim();
  const mode = options?.mode === "full" ? "full" : "discovery";
  if (!normalizedPersonName) {
    throw new GettyLocalPrefetchError(
      "Getty local scrape requires a person name.",
      "MISSING_PERSON_NAME"
    );
  }

  try {
    const kickoffResp = await fetch("/api/admin/getty-local/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_name: normalizedPersonName,
        show_name: typeof showName === "string" && showName.trim().length > 0 ? showName.trim() : undefined,
        mode,
        prefetch_token:
          typeof options?.prefetchToken === "string" && options.prefetchToken.trim().length > 0
            ? options.prefetchToken.trim()
            : undefined,
        transport_mode:
          typeof options?.transportMode === "string" && options.transportMode.trim().length > 0
            ? options.transportMode.trim()
            : undefined,
      }),
      signal: AbortSignal.timeout(GETTY_LOCAL_PREFETCH_TIMEOUT_MS),
    });

    if (!kickoffResp.ok) {
      const errBody = (await kickoffResp.json().catch(() => ({ error: "unknown" }))) as {
        error?: string;
        detail?: string;
        hint?: string;
        last_error_code?: string;
      };
      const code = errBody.last_error_code || `HTTP_${kickoffResp.status}`;
      const detail = errBody.detail ?? errBody.error ?? "unknown";
      const hint = errBody.hint?.trim();
      throw new GettyLocalPrefetchError(
        `Getty local scrape failed (${kickoffResp.status}): ${detail}.${hint ? ` ${hint}` : ""}`,
        code
      );
    }

    let gettyData = (await kickoffResp.json()) as GettyLocalPrefetchStatusResponse;
    const prefetchToken =
      typeof gettyData.prefetch_token === "string" ? gettyData.prefetch_token.trim() : "";
    if (!prefetchToken) {
      throw new GettyLocalPrefetchError(
        "Getty local scrape did not return a prefetch token.",
        "MISSING_TOKEN"
      );
    }
    options?.onProgress?.(mapStatusToProgress(gettyData));

    const startedAtMs = Date.now();
    while (gettyData.status !== "completed" && gettyData.status !== "failed") {
      if (Date.now() - startedAtMs > GETTY_LOCAL_PREFETCH_TIMEOUT_MS) {
        throw new GettyLocalPrefetchError(
          "Getty local scrape timed out while waiting for discovery progress.",
          "TIMEOUT"
        );
      }
      const delayMs =
        typeof gettyData.poll_after_ms === "number" && gettyData.poll_after_ms > 0
          ? gettyData.poll_after_ms
          : GETTY_LOCAL_PREFETCH_POLL_INTERVAL_MS;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      const statusResp = await fetch(
        `/api/admin/getty-local/scrape?prefetch_token=${encodeURIComponent(prefetchToken)}`,
        {
          method: "GET",
          signal: AbortSignal.timeout(Math.min(30_000, GETTY_LOCAL_PREFETCH_TIMEOUT_MS)),
        }
      );
      if (!statusResp.ok) {
        const errBody = (await statusResp.json().catch(() => ({ error: "unknown" }))) as {
          error?: string;
          detail?: string;
          last_error_code?: string;
        };
        throw new GettyLocalPrefetchError(
          errBody.detail || errBody.error || `Getty local scrape status failed (${statusResp.status})`,
          errBody.last_error_code || `HTTP_${statusResp.status}`
        );
      }
      gettyData = (await statusResp.json()) as GettyLocalPrefetchStatusResponse;
      options?.onProgress?.(mapStatusToProgress(gettyData));
    }
    if (gettyData.status === "failed") {
      throw new GettyLocalPrefetchError(
        gettyData.last_error || "Getty local scrape failed.",
        gettyData.last_error_code || "SCRAPE_FAILED"
      );
    }
    const mergedAssetCount =
      typeof gettyData.merged_total === "number" ? gettyData.merged_total : 0;
    const mergedEventCount =
      typeof gettyData.merged_events_total === "number" ? gettyData.merged_events_total : 0;
    return {
      bodyPatch: {
        getty_prefetch_attempted: true,
        getty_prefetch_succeeded: true,
        getty_prefetch_token: prefetchToken,
        getty_prefetch_mode:
          typeof gettyData.prefetch_mode === "string" ? gettyData.prefetch_mode : mode,
        getty_deferred_enrichment: gettyData.enrichment_pending === true,
        getty_deferred_editorial_ids: Array.isArray(gettyData.deferred_editorial_ids)
          ? gettyData.deferred_editorial_ids.filter(
              (value): value is string => typeof value === "string" && value.trim().length > 0
            )
          : undefined,
        getty_transport_mode:
          typeof gettyData.getty_transport_mode === "string" ? gettyData.getty_transport_mode : undefined,
        getty_proxy_fingerprint:
          typeof gettyData.getty_proxy_fingerprint === "string" ? gettyData.getty_proxy_fingerprint : undefined,
        getty_runtime_probe_status:
          typeof gettyData.getty_runtime_probe_status === "string"
            ? gettyData.getty_runtime_probe_status
            : undefined,
        getty_runtime_probe_reason:
          typeof gettyData.getty_runtime_probe_reason === "string"
            ? gettyData.getty_runtime_probe_reason
            : undefined,
        getty_fallback_invoked: gettyData.getty_fallback_invoked === true,
        getty_primary_failure_reason:
          typeof gettyData.getty_primary_failure_reason === "string"
            ? gettyData.getty_primary_failure_reason
            : undefined,
        getty_session_validated: gettyData.session_validated === true,
        getty_session_truncated: gettyData.session_truncated === true,
      },
      mergedAssetCount,
      mergedEventCount,
      candidateManifestTotal:
        typeof gettyData.candidate_manifest_total === "number"
          ? gettyData.candidate_manifest_total
          : mergedAssetCount,
      detailEnrichmentTotal:
        typeof gettyData.detail_enrichment_total === "number"
          ? gettyData.detail_enrichment_total
          : mergedAssetCount,
      deferredEditorialIds: Array.isArray(gettyData.deferred_editorial_ids)
        ? gettyData.deferred_editorial_ids.filter(
            (value): value is string => typeof value === "string" && value.trim().length > 0
          )
        : [],
      querySummaries: Array.isArray(gettyData.query_summaries)
        ? (gettyData.query_summaries as Array<Record<string, unknown>>)
        : [],
      authMode: typeof gettyData.auth_mode === "string" ? gettyData.auth_mode : null,
      authWarning: typeof gettyData.auth_warning === "string" ? gettyData.auth_warning : null,
      transportMode:
        typeof gettyData.getty_transport_mode === "string" ? gettyData.getty_transport_mode : null,
      proxyFingerprint:
        typeof gettyData.getty_proxy_fingerprint === "string" ? gettyData.getty_proxy_fingerprint : null,
      runtimeProbeStatus:
        typeof gettyData.getty_runtime_probe_status === "string"
          ? gettyData.getty_runtime_probe_status
          : null,
      runtimeProbeReason:
        typeof gettyData.getty_runtime_probe_reason === "string"
          ? gettyData.getty_runtime_probe_reason
          : null,
      fallbackInvoked: gettyData.getty_fallback_invoked === true,
      primaryFailureReason:
        typeof gettyData.getty_primary_failure_reason === "string"
          ? gettyData.getty_primary_failure_reason
          : null,
      sessionValidated: gettyData.session_validated === true,
      sessionTruncated: gettyData.session_truncated === true,
      elapsedSeconds:
        typeof gettyData.elapsed_seconds === "number" ? gettyData.elapsed_seconds : null,
      prefetchMode: typeof gettyData.prefetch_mode === "string" ? gettyData.prefetch_mode : mode,
      discoveryReady: gettyData.discovery_ready === true,
      enrichmentPending: gettyData.enrichment_pending === true,
    };
  } catch (error) {
    if (error instanceof GettyLocalPrefetchError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    const normalized = message.toLowerCase();
    const isTimeout = normalized.includes("timeout") || normalized.includes("abort");
    throw new GettyLocalPrefetchError(
      isTimeout
        ? "Getty local scrape timed out. Start `make getty-server` or retry with the local scraper available."
        : `Getty local scrape unavailable: ${message}. Start \`make getty-server\` or ensure the local Getty scraper can run.`,
      isTimeout ? "TIMEOUT" : "UNREACHABLE"
    );
  }
}

export async function getGettyRemoteReadiness(): Promise<GettyRemoteReadiness> {
  const response = await fetch("/api/admin/getty-local/remote-readiness", {
    method: "GET",
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    return {
      ready: false,
      status: "unknown",
      reason: `HTTP_${response.status}`,
      transportMode: "decodo_remote",
      proxyFingerprint: null,
      queries: [],
      checkedAt: new Date().toISOString(),
    };
  }
  const payload = (await response.json()) as Partial<GettyRemoteReadiness>;
  return {
    ready: payload.ready === true,
    status:
      payload.status === "healthy" ||
      payload.status === "blocked" ||
      payload.status === "disabled" ||
      payload.status === "unknown"
        ? payload.status
        : "unknown",
    reason: typeof payload.reason === "string" ? payload.reason : null,
    transportMode: typeof payload.transportMode === "string" ? payload.transportMode : "decodo_remote",
    proxyFingerprint:
      typeof payload.proxyFingerprint === "string" ? payload.proxyFingerprint : null,
    queries: Array.isArray(payload.queries)
      ? payload.queries.filter(
          (entry): entry is Record<string, unknown> =>
            Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
        )
      : [],
    checkedAt:
      typeof payload.checkedAt === "string" ? payload.checkedAt : new Date().toISOString(),
  };
}
