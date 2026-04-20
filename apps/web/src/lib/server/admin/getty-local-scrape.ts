import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const DEFAULT_GETTY_LOCAL_URL = "http://127.0.0.1:3456";
const SCRAPE_TIMEOUT_MS = 600_000;
const SUBPROCESS_MAX_BUFFER = 100 * 1024 * 1024;
const GETTY_PREFETCH_TMP_DIR = path.join(os.tmpdir(), "trr-getty-prefetch");

export type GettyLocalScrapePayload = {
  person_name?: string;
  merged?: unknown[];
  merged_total?: number;
  merged_events?: unknown[];
  merged_events_total?: number;
  discovery_manifest?: unknown[];
  candidate_manifest_total?: number;
  deferred_editorial_ids?: string[];
  query_summaries?: unknown[];
  auth_mode?: string;
  auth_warning?: string | null;
  show_name?: string | null;
  elapsed_seconds?: number;
  prefetch_mode?: string;
  discovery_ready?: boolean;
  enrichment_status?: string;
  detail_enrichment_total?: number;
  status?: string;
  stage?: string | null;
  progress_message?: string | null;
  started_at?: string | null;
  heartbeat_at?: string | null;
  completed_at?: string | null;
  last_error?: string | null;
  last_error_code?: string | null;
  active_query?: JsonRecord | null;
  query_summaries_live?: unknown[];
  requested_page?: number | null;
  expected_page?: number | null;
  current_page?: number | null;
  response_url?: string | null;
  fetched_candidates_total?: number | null;
  page_candidate_count?: number | null;
  new_unique_count?: number | null;
  termination_reason?: string | null;
  page_classification?: string | null;
  page_signature?: string | null;
  first_editorial_ids?: string[];
  session_validated?: boolean;
  session_truncated?: boolean;
  getty_transport_mode?: string | null;
  getty_proxy_fingerprint?: string | null;
  getty_runtime_probe_status?: string | null;
  getty_runtime_probe_reason?: string | null;
  getty_fallback_invoked?: boolean;
  getty_primary_failure_reason?: string | null;
  job_pid?: number;
};

export type GettyPrefetchState = GettyLocalScrapePayload & {
  revision?: number;
  token_expires_at?: string;
  last_error?: string | null;
  status?: "queued" | "running" | "completed" | "failed";
  stage?: string | null;
  progress_message?: string | null;
  started_at?: string | null;
  heartbeat_at?: string | null;
  completed_at?: string | null;
  last_error_code?: string | null;
  active_query?: JsonRecord | null;
  query_summaries_live?: JsonRecord[];
  requested_page?: number | null;
  expected_page?: number | null;
  current_page?: number | null;
  response_url?: string | null;
  fetched_candidates_total?: number | null;
  page_candidate_count?: number | null;
  new_unique_count?: number | null;
  termination_reason?: string | null;
  page_classification?: string | null;
  page_signature?: string | null;
  first_editorial_ids?: string[];
  session_validated?: boolean;
  session_truncated?: boolean;
  getty_transport_mode?: string | null;
  getty_proxy_fingerprint?: string | null;
  getty_runtime_probe_status?: string | null;
  getty_runtime_probe_reason?: string | null;
  getty_fallback_invoked?: boolean;
  getty_primary_failure_reason?: string | null;
  job_pid?: number | null;
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

type JsonRecord = Record<string, unknown>;

const asRecord = (value: unknown): JsonRecord | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;

const pickDefined = (record: JsonRecord, keys: string[]): JsonRecord => {
  const picked: JsonRecord = {};
  for (const key of keys) {
    const value = record[key];
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && !value.trim()) continue;
    picked[key] = value;
  }
  return picked;
};

const compactGettyDetails = (details: unknown): JsonRecord | undefined => {
  const record = asRecord(details);
  if (!record) return undefined;
  const compacted = pickDefined(record, [
    "max_file_size",
    "restrictions",
    "release_info",
    "source_display",
    "credit_display",
    "editorial_number",
    "object_name_display",
    "upload_date_display",
    "date_created_display",
    "license_type_display",
  ]);
  return Object.keys(compacted).length > 0 ? compacted : undefined;
};

const compactGettyRawAsset = (asset: unknown): JsonRecord | undefined => {
  const record = asRecord(asset);
  if (!record) return undefined;
  const compacted = pickDefined(record, [
    "id",
    "assetId",
    "editorialId",
    "objectName",
    "title",
    "caption",
    "eventId",
    "eventName",
    "eventUrlSlug",
    "eventDate",
    "dateCreated",
    "thumbUrl",
    "compUrl",
    "galleryComp1024Url",
    "galleryHighResCompUrl",
    "highResCompUrl",
    "largeMainImageURL",
    "defaultMainImageURL",
    "zoomedImageUrl",
    "downloadableCompUrl",
    "assetDimensions",
    "actualMaxDimensions",
    "keywords",
    "people",
  ]);
  return Object.keys(compacted).length > 0 ? compacted : undefined;
};

const compactGettyAsset = (entry: unknown): JsonRecord | null => {
  const record = asRecord(entry);
  if (!record) return null;

  const compacted = pickDefined(record, [
    "editorial_id",
    "detail_url",
    "object_name",
    "title",
    "caption",
    "search_title",
    "search_caption",
    "event_name",
    "event_url",
    "event_id",
    "event_url_slug",
    "event_date",
    "date_created",
    "upload_date",
    "date_created_display",
    "upload_date_display",
    "preview_image_url",
    "original_image_url",
    "thumb_url",
    "comp_url",
    "max_file_size",
    "width",
    "height",
    "assetDimensions",
    "actualMaxDimensions",
    "keyword_texts",
    "people_overlay_names",
    "search_people_overlay_names",
    "people",
    "people_count",
    "people_count_source",
    "source",
    "restrictions",
    "release_info",
    "editorial_number",
    "object_name_display",
    "grouped_image_count",
    "person_image_count",
    "source_query_scope",
    "getty_event_group_title",
    "person_match",
  ]);

  const details = compactGettyDetails(record.details);
  if (details) compacted.details = details;

  const asset = compactGettyRawAsset(record.asset);
  if (asset) compacted.asset = asset;

  return Object.keys(compacted).length > 0 ? compacted : null;
};

const compactGettyEvent = (entry: unknown): JsonRecord | null => {
  const record = asRecord(entry);
  if (!record) return null;

  const compacted = pickDefined(record, [
    "event_name",
    "event_url",
    "event_id",
    "event_url_slug",
    "event_date",
    "grouped_image_count",
    "person_image_count",
    "source_query_scope",
    "event_asset_count_scanned",
    "bucket_type",
    "bucket_key",
    "bucket_label",
    "resolved_show_id",
    "resolved_show_name",
    "getty_event_group_title",
    "getty_event_group_id",
    "getty_event_group_slug",
  ]);

  const matchedAsset = compactGettyAsset(record.matched_asset);
  if (matchedAsset) compacted.matched_asset = matchedAsset;
  const representativeAsset = compactGettyAsset(record.representative_asset);
  if (representativeAsset) compacted.representative_asset = representativeAsset;

  return Object.keys(compacted).length > 0 ? compacted : null;
};

const compactGettyQuerySummary = (entry: unknown): JsonRecord | null => {
  const record = asRecord(entry);
  if (!record) return null;
  const compacted = pickDefined(record, [
    "label",
    "scope",
    "phrase",
    "query_url",
    "auth_mode",
    "fetched_asset_total",
    "fetched_candidates_total",
    "usable_after_dedupe_total",
    "overlap_with_prior_queries",
    "site_image_total",
    "site_event_total",
    "site_video_total",
    "last_page",
    "expected_page",
    "current_page",
    "response_url",
    "pagination_rewrite_detected",
    "termination_reason",
    "page_signature",
    "first_editorial_ids",
    "session_validated",
    "session_truncated",
  ]);
  const queryParams = asRecord(record.query_params);
  if (queryParams && Object.keys(queryParams).length > 0) {
    compacted.query_params = queryParams;
  }
  return Object.keys(compacted).length > 0 ? compacted : null;
};

const compactGettyQueryLikeCollection = (entries: unknown): JsonRecord[] | undefined =>
  Array.isArray(entries)
    ? entries
        .map((entry) => compactGettyQuerySummary(entry))
        .filter((entry): entry is JsonRecord => Boolean(entry))
    : undefined;

const GETTY_PREFETCH_STATUSES = new Set<GettyPrefetchState["status"]>([
  "queued",
  "running",
  "completed",
  "failed",
]);

const normalizeGettyPrefetchExecutionState = (
  payload: GettyLocalScrapePayload,
): Partial<GettyPrefetchState> => {
  const record = asRecord(payload) ?? {};
  const normalized: Partial<GettyPrefetchState> = {};
  const copyStatus = (key: "status") => {
    const value = record[key];
    if (
      typeof value === "string" &&
      GETTY_PREFETCH_STATUSES.has(value.trim() as GettyPrefetchState["status"])
    ) {
      normalized[key] = value.trim() as GettyPrefetchState["status"];
    }
  };
  const copyNullableString = (key: string) => {
    const value = record[key];
    if (value == null) {
      (normalized as JsonRecord)[key] = null;
      return;
    }
    if (typeof value === "string") {
      (normalized as JsonRecord)[key] = value.trim();
    }
  };
  const copyNumber = (key: string) => {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      (normalized as JsonRecord)[key] = value;
    }
  };
  copyStatus("status");
  copyNullableString("stage");
  copyNullableString("progress_message");
  copyNullableString("started_at");
  copyNullableString("heartbeat_at");
  copyNullableString("completed_at");
  copyNullableString("last_error");
  copyNullableString("last_error_code");
  copyNumber("requested_page");
  copyNumber("expected_page");
  copyNumber("current_page");
  copyNumber("fetched_candidates_total");
  copyNumber("page_candidate_count");
  copyNumber("new_unique_count");
  copyNumber("job_pid");
  copyNullableString("response_url");
  copyNullableString("termination_reason");
  copyNullableString("page_classification");
  copyNullableString("page_signature");
  copyNullableString("getty_transport_mode");
  copyNullableString("getty_proxy_fingerprint");
  copyNullableString("getty_runtime_probe_status");
  copyNullableString("getty_runtime_probe_reason");
  copyNullableString("getty_primary_failure_reason");
  if (Array.isArray(record.first_editorial_ids)) {
    normalized.first_editorial_ids = record.first_editorial_ids.filter(
      (value): value is string => typeof value === "string" && value.trim().length > 0
    );
  }
  if (typeof record.session_validated === "boolean") {
    normalized.session_validated = record.session_validated;
  }
  if (typeof record.session_truncated === "boolean") {
    normalized.session_truncated = record.session_truncated;
  }
  if (typeof record.getty_fallback_invoked === "boolean") {
    normalized.getty_fallback_invoked = record.getty_fallback_invoked;
  }
  const activeQuery = asRecord(record.active_query);
  if (activeQuery) {
    normalized.active_query = activeQuery;
  }
  const liveSummaries = compactGettyQueryLikeCollection(record.query_summaries_live);
  if (liveSummaries) {
    normalized.query_summaries_live = liveSummaries;
  }
  return normalized;
};

export const compactGettyPrefetchPayload = (
  payload: GettyLocalScrapePayload
): GettyLocalScrapePayload => {
  const merged = Array.isArray(payload.merged)
    ? payload.merged.map((entry) => compactGettyAsset(entry)).filter((entry): entry is JsonRecord => Boolean(entry))
    : [];
  const mergedEvents = Array.isArray(payload.merged_events)
    ? payload.merged_events
        .map((entry) => compactGettyEvent(entry))
        .filter((entry): entry is JsonRecord => Boolean(entry))
    : [];
  const querySummaries = Array.isArray(payload.query_summaries)
    ? payload.query_summaries
        .map((entry) => compactGettyQuerySummary(entry))
        .filter((entry): entry is JsonRecord => Boolean(entry))
    : [];

  return {
    merged,
    merged_total:
      typeof payload.merged_total === "number" ? payload.merged_total : merged.length,
    discovery_manifest: Array.isArray(payload.discovery_manifest)
      ? payload.discovery_manifest
          .map((entry) => compactGettyAsset(entry))
          .filter((entry): entry is JsonRecord => Boolean(entry))
      : merged,
    candidate_manifest_total:
      typeof payload.candidate_manifest_total === "number"
        ? payload.candidate_manifest_total
        : merged.length,
    merged_events: mergedEvents,
    merged_events_total:
      typeof payload.merged_events_total === "number"
        ? payload.merged_events_total
        : mergedEvents.length,
    query_summaries: querySummaries,
    auth_mode: typeof payload.auth_mode === "string" ? payload.auth_mode : undefined,
    auth_warning:
      typeof payload.auth_warning === "string" && payload.auth_warning.trim().length > 0
        ? payload.auth_warning.trim()
        : undefined,
    session_validated: payload.session_validated === true,
    session_truncated: payload.session_truncated === true,
    getty_transport_mode:
      typeof payload.getty_transport_mode === "string" ? payload.getty_transport_mode : undefined,
    getty_proxy_fingerprint:
      typeof payload.getty_proxy_fingerprint === "string" ? payload.getty_proxy_fingerprint : undefined,
    getty_runtime_probe_status:
      typeof payload.getty_runtime_probe_status === "string" ? payload.getty_runtime_probe_status : undefined,
    getty_runtime_probe_reason:
      typeof payload.getty_runtime_probe_reason === "string" ? payload.getty_runtime_probe_reason : undefined,
    getty_fallback_invoked: payload.getty_fallback_invoked === true,
    getty_primary_failure_reason:
      typeof payload.getty_primary_failure_reason === "string"
        ? payload.getty_primary_failure_reason
        : undefined,
    deferred_editorial_ids: Array.isArray(payload.deferred_editorial_ids)
      ? payload.deferred_editorial_ids
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter((value): value is string => Boolean(value))
      : undefined,
    prefetch_mode:
      typeof payload.prefetch_mode === "string" && payload.prefetch_mode.trim().length > 0
        ? payload.prefetch_mode.trim()
        : undefined,
    discovery_ready: payload.discovery_ready === true,
    enrichment_status:
      typeof payload.enrichment_status === "string" && payload.enrichment_status.trim().length > 0
        ? payload.enrichment_status.trim()
        : undefined,
    detail_enrichment_total:
      typeof payload.detail_enrichment_total === "number"
        ? payload.detail_enrichment_total
        : undefined,
    show_name:
      typeof payload.show_name === "string" && payload.show_name.trim().length > 0
        ? payload.show_name.trim()
        : undefined,
    elapsed_seconds:
      typeof payload.elapsed_seconds === "number" ? payload.elapsed_seconds : undefined,
  };
};

const getGettyLocalUrl = (): string =>
  (process.env.TRR_GETTY_LOCAL_URL ?? DEFAULT_GETTY_LOCAL_URL).replace(/\/+$/, "");

/** Shared-secret header for authenticating with the Getty scraper behind a tunnel. */
const getScraperAuthHeaders = (): Record<string, string> => {
  const secret = (process.env.TRR_GETTY_SCRAPER_SECRET ?? "").trim();
  return secret ? { "x-scraper-secret": secret } : {};
};

let gettyRemoteReadinessCache:
  | { expiresAt: number; payload: GettyRemoteReadiness }
  | null = null;

const resolveBackendDir = async (): Promise<string | null> => {
  const explicit = process.env.TRR_BACKEND_DIR?.trim();
  if (explicit) {
    try {
      await access(path.join(explicit, "scripts/getty_scrape_json.py"));
      return explicit;
    } catch {
      // Fall through to workspace lookup.
    }
  }

  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    const candidate = path.join(dir, "TRR-Backend");
    try {
      await access(path.join(candidate, "scripts/getty_scrape_json.py"));
      return candidate;
    } catch {
      // Try parent directory next.
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
};

const resolvePython = async (backendDir: string): Promise<string> => {
  const venvPython = path.join(backendDir, ".venv/bin/python");
  try {
    await access(venvPython);
    return venvPython;
  } catch {
    return "python3";
  }
};

const runSubprocess = (
  python: string,
  scriptPath: string,
  personName: string,
  showName?: string | null,
  mode: "discovery" | "full" = "full",
  transportMode?: string | null
): Promise<{ stdout: string; stderr: string }> =>
  new Promise((resolve, reject) => {
    const args = [scriptPath, personName];
    if (typeof showName === "string" && showName.trim().length > 0) {
      args.push("--show-name", showName.trim());
    }
    args.push("--mode", mode);
    if (typeof transportMode === "string" && transportMode.trim().length > 0) {
      args.push("--transport-mode", transportMode.trim());
    }
    const child = execFile(
      python,
      args,
      {
        timeout: SCRAPE_TIMEOUT_MS,
        maxBuffer: SUBPROCESS_MAX_BUFFER,
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            Object.assign(error, {
              stderr: typeof stderr === "string" ? stderr : "",
            })
          );
          return;
        }
        resolve({
          stdout: typeof stdout === "string" ? stdout : "",
          stderr: typeof stderr === "string" ? stderr : "",
        });
      }
    );
    child.unref();
  });

const tryLocalServer = async (
  personName: string,
  showName?: string | null,
  mode: "discovery" | "full" = "full",
  transportMode?: string | null
): Promise<GettyLocalScrapePayload | null> => {
  const gettyLocalUrl = getGettyLocalUrl();
  try {
    const healthResp = await fetch(`${gettyLocalUrl}/health`, {
      signal: AbortSignal.timeout(2_000),
    });
    if (!healthResp.ok) return null;
  } catch {
    return null;
  }

  const resp = await fetch(`${gettyLocalUrl}/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getScraperAuthHeaders() },
    body: JSON.stringify({
      person_name: personName,
      show_name: typeof showName === "string" && showName.trim().length > 0 ? showName.trim() : undefined,
      mode,
      transport_mode:
        typeof transportMode === "string" && transportMode.trim().length > 0
          ? transportMode.trim()
          : undefined,
    }),
    signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => "unknown");
    throw new Error(`Getty local server scrape failed: ${errText.slice(0, 500)}`);
  }
  return (await resp.json()) as GettyLocalScrapePayload;
};

export const scrapeGettyLocallyForPerson = async (
  personName: string,
  showName?: string | null,
  options?: { mode?: "discovery" | "full"; transportMode?: string | null }
): Promise<GettyLocalScrapePayload> => {
  const normalizedPersonName = personName.trim();
  const mode = options?.mode === "discovery" ? "discovery" : "full";
  if (!normalizedPersonName) {
    throw new Error("person_name is required");
  }

  const transportMode =
    typeof options?.transportMode === "string" && options.transportMode.trim().length > 0
      ? options.transportMode.trim()
      : undefined;

  const serverResult = await tryLocalServer(normalizedPersonName, showName, mode, transportMode);
  if (serverResult) {
    return compactGettyPrefetchPayload(serverResult);
  }

  const backendDir = await resolveBackendDir();
  if (!backendDir) {
    throw new Error(
      "Cannot locate TRR-Backend directory. Set TRR_BACKEND_DIR or start the Getty server with make getty-server."
    );
  }

  const python = await resolvePython(backendDir);
  const scriptPath = path.join(backendDir, "scripts/getty_scrape_json.py");
  const { stdout, stderr } = await runSubprocess(
    python,
    scriptPath,
    normalizedPersonName,
    showName,
    mode,
    transportMode,
  );
  if (stderr) {
    console.log("[getty-local/scrape] subprocess stderr:\n", stderr.slice(-2000));
  }
  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new Error(stderr.slice(-500) || "Getty scrape returned no output");
  }
  return compactGettyPrefetchPayload(JSON.parse(trimmed) as GettyLocalScrapePayload);
};

const buildGettyPrefetchState = (
  payload: GettyLocalScrapePayload,
  previous?: GettyPrefetchState | null
): GettyPrefetchState => {
  const now = Date.now();
  const nextRevision = Math.max(1, Number(previous?.revision ?? 0) + 1);
  const executionState = normalizeGettyPrefetchExecutionState(payload);
  const {
    status: _payloadStatus,
    stage: _payloadStage,
    progress_message: _payloadProgressMessage,
    started_at: _payloadStartedAt,
    heartbeat_at: _payloadHeartbeatAt,
    completed_at: _payloadCompletedAt,
    last_error: _payloadLastError,
    last_error_code: _payloadLastErrorCode,
    active_query: _payloadActiveQuery,
    query_summaries_live: _payloadQuerySummariesLive,
    requested_page: _payloadRequestedPage,
    current_page: _payloadCurrentPage,
    fetched_candidates_total: _payloadFetchedCandidatesTotal,
    page_candidate_count: _payloadPageCandidateCount,
    new_unique_count: _payloadNewUniqueCount,
    termination_reason: _payloadTerminationReason,
    page_classification: _payloadPageClassification,
    job_pid: _payloadJobPid,
    ...compactedPayload
  } = compactGettyPrefetchPayload(payload);
  return {
    ...(previous ?? {}),
    ...compactedPayload,
    ...executionState,
    revision: nextRevision,
    token_expires_at:
      previous?.token_expires_at ??
      new Date(now + 2 * 60 * 60 * 1000).toISOString(),
  };
};

export const storeGettyPrefetchPayload = async (
  payload: GettyLocalScrapePayload
): Promise<string> => {
  await mkdir(GETTY_PREFETCH_TMP_DIR, { recursive: true });
  const token = randomUUID();
  await writeFile(
    path.join(GETTY_PREFETCH_TMP_DIR, `${token}.json`),
    JSON.stringify(buildGettyPrefetchState(payload, null)),
    "utf8"
  );
  return token;
};

export const readGettyPrefetchPayload = async (
  token: string
): Promise<GettyPrefetchState | null> => {
  const normalizedToken = token.trim();
  if (!normalizedToken) return null;
  try {
    const raw = await readFile(path.join(GETTY_PREFETCH_TMP_DIR, `${normalizedToken}.json`), "utf8");
    return JSON.parse(raw) as GettyPrefetchState;
  } catch {
    return null;
  }
};

export const updateGettyPrefetchPayload = async (
  token: string,
  payload: GettyLocalScrapePayload
): Promise<GettyPrefetchState | null> => {
  const normalizedToken = token.trim();
  if (!normalizedToken) return null;
  const existing = await readGettyPrefetchPayload(normalizedToken);
  if (!existing) return null;
  const nextState = buildGettyPrefetchState(payload, existing);
  await writeFile(path.join(GETTY_PREFETCH_TMP_DIR, `${normalizedToken}.json`), JSON.stringify(nextState), "utf8");
  return nextState;
};

const createGettyPrefetchJobState = (
  token: string,
  personName: string,
  showName?: string | null,
  mode: "discovery" | "full" = "discovery"
): GettyPrefetchState => {
  const now = new Date().toISOString();
  return buildGettyPrefetchState(
    {
      prefetch_mode: mode,
      discovery_ready: false,
      enrichment_status: mode === "discovery" ? "pending" : "running",
      status: "queued",
      stage: "queued",
      progress_message: `Queued Getty ${mode} job for "${personName}".`,
      started_at: now,
      heartbeat_at: now,
      person_name: personName,
      show_name: showName ?? undefined,
    } as GettyLocalScrapePayload,
    {
      revision: 0,
      token_expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    }
  );
};

export const createGettyPrefetchJob = async (
  personName: string,
  showName?: string | null,
  options?: { mode?: "discovery" | "full"; prefetchToken?: string | null; transportMode?: string | null }
): Promise<{ token: string; state: GettyPrefetchState }> => {
  await mkdir(GETTY_PREFETCH_TMP_DIR, { recursive: true });
  const mode = options?.mode === "full" ? "full" : "discovery";
  const requestedToken =
    typeof options?.prefetchToken === "string" && options.prefetchToken.trim().length > 0
      ? options.prefetchToken.trim()
      : "";
  const token = requestedToken || randomUUID();
  const state = createGettyPrefetchJobState(token, personName.trim(), showName, mode);
  if (typeof options?.transportMode === "string" && options.transportMode.trim().length > 0) {
    state.getty_transport_mode = options.transportMode.trim();
  }
  await writeFile(
    path.join(GETTY_PREFETCH_TMP_DIR, `${token}.json`),
    JSON.stringify(state),
    "utf8"
  );
  return { token, state };
};

export const startGettyPrefetchJob = async (
  token: string,
  personName: string,
  showName?: string | null,
  options?: { mode?: "discovery" | "full"; transportMode?: string | null }
): Promise<GettyPrefetchState> => {
  const normalizedToken = token.trim();
  if (!normalizedToken) {
    throw new Error("Getty prefetch token is required.");
  }
  const backendDir = await resolveBackendDir();
  if (!backendDir) {
    throw new Error(
      "Cannot locate TRR-Backend directory. Set TRR_BACKEND_DIR or ensure the Getty job runner exists."
    );
  }
  const python = await resolvePython(backendDir);
  const scriptPath = path.join(backendDir, "scripts/getty_scrape_job.py");
  const statePath = path.join(GETTY_PREFETCH_TMP_DIR, `${normalizedToken}.json`);
  const mode = options?.mode === "full" ? "full" : "discovery";
  const transportMode =
    typeof options?.transportMode === "string" && options.transportMode.trim().length > 0
      ? options.transportMode.trim()
      : "";
  const args = [scriptPath, personName.trim(), "--state-file", statePath, "--mode", mode];
  if (typeof showName === "string" && showName.trim().length > 0) {
    args.push("--show-name", showName.trim());
  }
  if (transportMode) {
    args.push("--transport-mode", transportMode);
  }
  const child = spawn(python, args, {
    detached: true,
    stdio: "ignore",
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
  });
  child.unref();
  const nextState = await updateGettyPrefetchPayload(normalizedToken, {
    status: "running",
    heartbeat_at: new Date().toISOString(),
    job_pid: child.pid ?? undefined,
  });
  if (!nextState) {
    throw new Error("Getty prefetch job state disappeared before launch completed.");
  }
  return nextState;
};

export const getGettyRemoteReadiness = async (): Promise<GettyRemoteReadiness> => {
  const now = Date.now();
  if (gettyRemoteReadinessCache && gettyRemoteReadinessCache.expiresAt > now) {
    return gettyRemoteReadinessCache.payload;
  }

  const backendDir = await resolveBackendDir();
  if (!backendDir) {
    const payload: GettyRemoteReadiness = {
      ready: false,
      status: "unknown",
      reason: "backend_dir_unavailable",
      transportMode: "decodo_remote",
      proxyFingerprint: null,
      queries: [],
      checkedAt: new Date().toISOString(),
    };
    gettyRemoteReadinessCache = { expiresAt: now + 30_000, payload };
    return payload;
  }

  const python = await resolvePython(backendDir);
  const scriptPath = path.join(backendDir, "scripts/modal/verify_modal_readiness.py");
  try {
    const { stdout } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      execFile(
        python,
        [scriptPath, "--json", "--probe-getty-remote-access"],
        {
          timeout: 60_000,
          maxBuffer: SUBPROCESS_MAX_BUFFER,
          env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
        },
        (error, stdout, stderr) => {
          if (error) {
            reject(error);
            return;
          }
          resolve({
            stdout: typeof stdout === "string" ? stdout : "",
            stderr: typeof stderr === "string" ? stderr : "",
          });
        },
      );
    });
    const summary = JSON.parse(stdout || "{}") as {
      getty_remote_probe?: Record<string, unknown>;
    };
    const probe = summary.getty_remote_probe ?? {};
    const ready = probe.ready === true;
    const payload: GettyRemoteReadiness = {
      ready,
      status:
        typeof probe.reason === "string" && probe.reason.trim() === "proxy_unconfigured"
          ? "disabled"
          : ready
            ? "healthy"
            : "blocked",
      reason: typeof probe.reason === "string" ? probe.reason : null,
      transportMode:
        typeof probe.transport_mode === "string" ? probe.transport_mode : "decodo_remote",
      proxyFingerprint:
        typeof probe.proxy_fingerprint === "string" ? probe.proxy_fingerprint : null,
      queries: Array.isArray(probe.queries)
        ? probe.queries.filter(
            (entry): entry is Record<string, unknown> =>
              Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
          )
        : [],
      checkedAt: new Date().toISOString(),
    };
    gettyRemoteReadinessCache = { expiresAt: now + 30_000, payload };
    return payload;
  } catch {
    const payload: GettyRemoteReadiness = {
      ready: false,
      status: "unknown",
      reason: "probe_unavailable",
      transportMode: "decodo_remote",
      proxyFingerprint: null,
      queries: [],
      checkedAt: new Date().toISOString(),
    };
    gettyRemoteReadinessCache = { expiresAt: now + 15_000, payload };
    return payload;
  }
};

export const deleteGettyPrefetchPayload = async (token: string): Promise<void> => {
  const normalizedToken = token.trim();
  if (!normalizedToken) return;
  try {
    await rm(path.join(GETTY_PREFETCH_TMP_DIR, `${normalizedToken}.json`), { force: true });
  } catch {
    // Best-effort cleanup only.
  }
};

/**
 * Shared hydration helper: expands a `getty_prefetch_token` in a parsed
 * request body into the full set of `getty_prefetched_*` fields that the
 * backend expects.  Returns the JSON-serialized result.
 *
 * If the body has no token or already contains hydrated arrays the
 * original rawBody is returned unchanged.
 */
export const hydrateGettyPrefetchPayload = async (
  rawBody: string,
): Promise<string> => {
  const parsed = JSON.parse(rawBody) as Record<string, unknown>;
  const prefetchToken =
    typeof parsed.getty_prefetch_token === "string"
      ? parsed.getty_prefetch_token.trim()
      : "";
  if (!prefetchToken) {
    return rawBody;
  }
  if (
    Array.isArray(parsed.getty_prefetched_assets) ||
    Array.isArray(parsed.getty_prefetched_events)
  ) {
    return rawBody;
  }

  const stored = await readGettyPrefetchPayload(prefetchToken);
  if (!stored) {
    throw new Error(
      "Getty prefetch payload expired before the backend handoff.",
    );
  }

  const prefetchMode =
    typeof stored.prefetch_mode === "string"
      ? stored.prefetch_mode.trim()
      : "";
  parsed.getty_prefetched_assets =
    prefetchMode === "discovery" && Array.isArray(stored.discovery_manifest)
      ? stored.discovery_manifest
      : Array.isArray(stored.merged)
        ? stored.merged
        : [];
  parsed.getty_prefetched_events =
    prefetchMode === "discovery"
      ? []
      : Array.isArray(stored.merged_events)
        ? stored.merged_events
        : [];
  parsed.getty_prefetched_queries = Array.isArray(stored.query_summaries)
    ? stored.query_summaries
    : [];
  parsed.getty_prefetch_auth_mode =
    typeof stored.auth_mode === "string" ? stored.auth_mode : undefined;
  parsed.getty_prefetch_auth_warning =
    typeof stored.auth_warning === "string" ? stored.auth_warning : undefined;
  parsed.getty_transport_mode =
    typeof stored.getty_transport_mode === "string" ? stored.getty_transport_mode : undefined;
  parsed.getty_proxy_fingerprint =
    typeof stored.getty_proxy_fingerprint === "string" ? stored.getty_proxy_fingerprint : undefined;
  parsed.getty_runtime_probe_status =
    typeof stored.getty_runtime_probe_status === "string" ? stored.getty_runtime_probe_status : undefined;
  parsed.getty_runtime_probe_reason =
    typeof stored.getty_runtime_probe_reason === "string" ? stored.getty_runtime_probe_reason : undefined;
  parsed.getty_fallback_invoked = stored.getty_fallback_invoked === true;
  parsed.getty_primary_failure_reason =
    typeof stored.getty_primary_failure_reason === "string"
      ? stored.getty_primary_failure_reason
      : undefined;
  parsed.getty_session_validated = stored.session_validated === true;
  parsed.getty_session_truncated = stored.session_truncated === true;
  parsed.getty_prefetch_mode = prefetchMode || undefined;
  parsed.getty_deferred_enrichment = stored.enrichment_status === "pending";
  parsed.getty_deferred_editorial_ids = Array.isArray(
    stored.deferred_editorial_ids,
  )
    ? stored.deferred_editorial_ids
    : [];
  delete parsed.getty_prefetch_token;
  // Best-effort cleanup of the consumed prefetch file; TTL reaper is the safety net.
  deleteGettyPrefetchPayload(prefetchToken).catch(() => {});
  return JSON.stringify(parsed);
};

/**
 * Remove stale Getty prefetch state files whose expiry has passed.
 * Intended to be called best-effort (e.g. after a successful hydration).
 */
export const cleanupStaleGettyPrefetchFiles = async (): Promise<number> => {
  let removed = 0;
  try {
    const { readdir, stat } = await import("node:fs/promises");
    const entries = await readdir(GETTY_PREFETCH_TMP_DIR).catch(() => []);
    const now = Date.now();
    for (const entry of entries) {
      if (!entry.endsWith(".json")) continue;
      const filePath = path.join(GETTY_PREFETCH_TMP_DIR, entry);
      try {
        const raw = await readFile(filePath, "utf8");
        const state = JSON.parse(raw) as GettyPrefetchState;
        const expiresAt =
          typeof state.token_expires_at === "string"
            ? new Date(state.token_expires_at).getTime()
            : 0;
        if (expiresAt > 0 && expiresAt < now) {
          await rm(filePath, { force: true });
          removed += 1;
        } else if (expiresAt === 0) {
          // No expiry recorded — fall back to file mtime + 2h
          const info = await stat(filePath);
          if (info.mtimeMs + 2 * 60 * 60 * 1000 < now) {
            await rm(filePath, { force: true });
            removed += 1;
          }
        }
      } catch {
        // Best-effort: skip unreadable files.
      }
    }
  } catch {
    // Best-effort: if the directory doesn't exist yet, nothing to clean.
  }
  return removed;
};
