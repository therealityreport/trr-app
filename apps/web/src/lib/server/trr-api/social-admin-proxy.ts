import "server-only";

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";
import {
  buildInternalAdminHeaders,
  type VerifiedAdminContext,
} from "@/lib/server/trr-api/internal-admin-auth";
import { getSeasonByShowAndNumber } from "@/lib/server/trr-api/trr-shows-repository";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export type ProxyErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "BAD_REQUEST"
  | "SEASON_NOT_FOUND"
  | "BACKEND_SATURATED"
  | "BACKEND_UNREACHABLE"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_ERROR"
  | "BACKEND_REQUEST_TIMEOUT"
  | "INTERNAL_ERROR";

export type SocialProxyErrorBody = {
  error: string;
  code?: ProxyErrorCode;
  retryable?: boolean;
  retry_after_seconds?: number;
  trace_id?: string;
  upstream_status?: number;
  upstream_detail?: unknown;
  upstream_detail_code?: string;
};

export class SocialProxyError extends Error {
  status: number;
  code: ProxyErrorCode;
  retryable: boolean;
  retryAfterSeconds?: number;
  traceId?: string;
  upstreamStatus?: number;
  upstreamDetail?: unknown;
  upstreamDetailCode?: string;
  logContext?: Record<string, unknown>;

  constructor(
    message: string,
    options: {
      status: number;
      code: ProxyErrorCode;
      retryable?: boolean;
      retryAfterSeconds?: number;
      traceId?: string;
      upstreamStatus?: number;
      upstreamDetail?: unknown;
      upstreamDetailCode?: string;
      logContext?: Record<string, unknown>;
    },
  ) {
    super(message);
    this.status = options.status;
    this.code = options.code;
    this.retryable = Boolean(options.retryable);
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.traceId = options.traceId;
    this.upstreamStatus = options.upstreamStatus;
    this.upstreamDetail = options.upstreamDetail;
    this.upstreamDetailCode = options.upstreamDetailCode;
    this.logContext = options.logContext;
  }
}

const buildTraceId = (): string => {
  return randomUUID().replace(/-/g, "");
};

const readPositiveIntEnv = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

export const SOCIAL_PROXY_SHORT_TIMEOUT_MS = readPositiveIntEnv("TRR_SOCIAL_PROXY_SHORT_TIMEOUT_MS", 10_000);
export const SOCIAL_PROXY_DEFAULT_TIMEOUT_MS = readPositiveIntEnv("TRR_SOCIAL_PROXY_DEFAULT_TIMEOUT_MS", 25_000);
export const SOCIAL_PROXY_LONG_TIMEOUT_MS = readPositiveIntEnv("TRR_SOCIAL_PROXY_LONG_TIMEOUT_MS", 60_000);

const readTimeoutTier = (timeoutMs: number): string => {
  if (timeoutMs === SOCIAL_PROXY_SHORT_TIMEOUT_MS) return "short";
  if (timeoutMs === SOCIAL_PROXY_DEFAULT_TIMEOUT_MS) return "default";
  if (timeoutMs === SOCIAL_PROXY_LONG_TIMEOUT_MS) return "long";
  return "custom";
};

const readBackendPath = (backendUrl: string): string => {
  try {
    const url = new URL(backendUrl);
    return `${url.pathname}${url.search}`;
  } catch {
    return backendUrl;
  }
};

const serializeErrorCause = (cause: unknown): unknown => {
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
      ...(typeof (cause as Error & { code?: unknown }).code !== "undefined"
        ? { code: String((cause as Error & { code?: unknown }).code) }
        : {}),
    };
  }
  if (cause && typeof cause === "object") {
    return Object.fromEntries(
      Object.entries(cause as Record<string, unknown>).filter(([, value]) => typeof value !== "function"),
    );
  }
  return cause;
};
const SEASON_ID_RESOLUTION_CACHE_TTL_MS = readPositiveIntEnv(
  "TRR_SOCIAL_PROXY_SEASON_ID_CACHE_TTL_MS",
  5 * 60 * 1000,
);
const SEASON_ID_RESOLUTION_CACHE_MAX_ENTRIES = readPositiveIntEnv(
  "TRR_SOCIAL_PROXY_SEASON_ID_CACHE_MAX_ENTRIES",
  512,
);
const SHOW_SEASON_RESOLUTION_PAGE_SIZE = 100;
const SHOW_SEASON_RESOLUTION_MAX_PAGES = 20;

const seasonIdResolutionCache = new Map<string, { seasonId: string; expiresAt: number }>();
const seasonIdResolutionInFlight = new Map<string, Promise<string>>();

const normalizeBackendErrorMessage = (data: Record<string, unknown>, fallback: string): string => {
  if (typeof data.error === "string" && data.error.trim()) {
    return data.error;
  }
  if (typeof data.detail === "string" && data.detail.trim()) {
    return data.detail;
  }
  if (data.detail && typeof data.detail === "object") {
    const detail = data.detail as Record<string, unknown>;
    if (typeof detail.message === "string" && detail.message.trim()) {
      return detail.message;
    }
    if (typeof detail.error === "string" && detail.error.trim()) {
      return detail.error;
    }
    if (typeof detail.code === "string" && detail.code.trim()) {
      return `${fallback} (${detail.code})`;
    }
  }
  return fallback;
};

const readUpstreamDetail = (data: Record<string, unknown>): unknown => {
  return data.detail;
};

const readUpstreamDetailCode = (data: Record<string, unknown>): string | undefined => {
  if (!data.detail || typeof data.detail !== "object") return undefined;
  const detail = data.detail as Record<string, unknown>;
  if (typeof detail.code !== "string" || !detail.code.trim()) return undefined;
  return detail.code.trim();
};

const hasBackendSaturationText = (value: string): boolean => {
  const message = value.toLowerCase();
  return (
    message.includes("connection pool exhausted") ||
    message.includes("database pool initialization failed") ||
    message.includes("maxclientsinsessionmode") ||
    message.includes("session-pool capacity") ||
    message.includes("session pool capacity")
  );
};

const hasBackendSaturationDetail = (detail: unknown): boolean => {
  if (typeof detail === "string") {
    return hasBackendSaturationText(detail);
  }
  if (!detail || typeof detail !== "object") {
    return false;
  }
  const record = detail as Record<string, unknown>;
  const values = [record.message, record.error, record.detail]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
  return values.length > 0 && hasBackendSaturationText(values);
};

const isBackendSaturatedResponse = (options: {
  status: number;
  message: string;
  detail: unknown;
  detailCode?: string;
}): boolean => {
  const detailRecord =
    options.detail && typeof options.detail === "object" ? (options.detail as Record<string, unknown>) : null;
  const detailReason =
    typeof detailRecord?.reason === "string" && detailRecord.reason.trim()
      ? detailRecord.reason.trim().toLowerCase()
      : "";
  return (
    options.status >= 500 &&
    (hasBackendSaturationText(options.message) ||
      hasBackendSaturationDetail(options.detail) ||
      options.detailCode === "BACKEND_SATURATED" ||
      detailReason === "session_pool_capacity" ||
      (options.detailCode === "DATABASE_SERVICE_UNAVAILABLE" && detailReason === "session_pool_capacity"))
  );
};

const backendSaturatedMessage = (): string => {
  return "Local TRR-Backend is saturated. Showing last successful data while retrying.";
};

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const isRetryableUpstreamStatus = (status: number): boolean => {
  return status === 429 || status === 502 || status === 503 || status === 504;
};

const AUTO_RETRY_ELIGIBLE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const isAutoRetryEligible = (method: string | undefined): boolean => {
  return AUTO_RETRY_ELIGIBLE_METHODS.has(String(method ?? "GET").toUpperCase());
};

const parseRetryAfterSeconds = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsedSeconds = Number.parseInt(trimmed, 10);
  if (Number.isFinite(parsedSeconds) && parsedSeconds >= 0) {
    return Math.min(parsedSeconds, 300);
  }
  const retryDate = Date.parse(trimmed);
  if (Number.isNaN(retryDate)) return undefined;
  const deltaSeconds = Math.ceil((retryDate - Date.now()) / 1000);
  return Math.max(0, Math.min(deltaSeconds, 300));
};

const hasDnsOrTransportFaultText = (value: string): boolean => {
  const message = value.toLowerCase();
  return (
    message.includes("could not translate host name") ||
    message.includes("enotfound") ||
    message.includes("ssl syscall error: eof detected")
  );
};

const hasDnsOrTransportFaultDetail = (detail: unknown): boolean => {
  if (typeof detail === "string") {
    return hasDnsOrTransportFaultText(detail);
  }
  if (!detail || typeof detail !== "object") {
    return false;
  }
  const record = detail as Record<string, unknown>;
  const values = [record.message, record.error, record.detail]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
  return values.length > 0 && hasDnsOrTransportFaultText(values);
};

const isRetryableNetworkError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  if (error.name === "AbortError") {
    return true;
  }
  const message = error.message.toLowerCase();
  if (message.includes("fetch failed") || hasDnsOrTransportFaultText(message)) {
    return true;
  }
  const cause = (error as Error & { cause?: { code?: string } }).cause;
  const code = String(cause?.code ?? "");
  return [
    "ENOTFOUND",
    "ECONNRESET",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "EPIPE",
    "ENETUNREACH",
    "EHOSTUNREACH",
    "EAI_AGAIN",
    "UND_ERR_CONNECT_TIMEOUT",
  ].includes(code);
};

const toProxyError = (error: unknown, fallbackTraceId?: string): SocialProxyError => {
  if (error instanceof SocialProxyError) {
    if (!error.traceId && fallbackTraceId) {
      error.traceId = fallbackTraceId;
    }
    return error;
  }
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return new SocialProxyError("TRR-Backend request timed out.", {
        status: 504,
        code: "UPSTREAM_TIMEOUT",
        retryable: true,
        traceId: fallbackTraceId,
      });
    }
    if (isRetryableNetworkError(error)) {
      return new SocialProxyError(
        "Could not reach TRR-Backend. Confirm TRR-Backend is running and TRR_API_URL is correct.",
        {
          status: 502,
          code: "BACKEND_UNREACHABLE",
          retryable: true,
          traceId: fallbackTraceId,
        },
      );
    }
    if (error.message === "unauthorized") {
      return new SocialProxyError(error.message, { status: 401, code: "UNAUTHORIZED", traceId: fallbackTraceId });
    }
    if (error.message === "forbidden") {
      return new SocialProxyError(error.message, { status: 403, code: "FORBIDDEN", traceId: fallbackTraceId });
    }
    if (error.message === "season not found") {
      return new SocialProxyError(error.message, { status: 404, code: "SEASON_NOT_FOUND", traceId: fallbackTraceId });
    }
    if (error.message === "seasonNumber is invalid") {
      return new SocialProxyError(error.message, { status: 400, code: "BAD_REQUEST", traceId: fallbackTraceId });
    }
    if (error.message === "Backend API not configured") {
      return new SocialProxyError(
        "TRR-Backend is not configured. Confirm TRR_API_URL is set for the app runtime.",
        { status: 502, code: "BACKEND_UNREACHABLE", retryable: true, traceId: fallbackTraceId },
      );
    }
    return new SocialProxyError(error.message, { status: 500, code: "INTERNAL_ERROR", traceId: fallbackTraceId });
  }
  return new SocialProxyError("failed", { status: 500, code: "INTERNAL_ERROR", traceId: fallbackTraceId });
};

const appendQuery = (backendBase: string, queryString: string): string => {
  return queryString ? `${backendBase}?${queryString}` : backendBase;
};

type SeasonListItem = {
  id?: unknown;
  season_number?: unknown;
};

type SeasonListPagination = {
  count?: unknown;
  total?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value: string | null | undefined): value is string =>
  typeof value === "string" && UUID_PATTERN.test(value);

const buildSeasonResolutionCacheKey = (showId: string, seasonNumberRaw: string): string =>
  `${showId.trim().toLowerCase()}:${seasonNumberRaw.trim()}`;

const getCachedSeasonId = (cacheKey: string): string | null => {
  const cached = seasonIdResolutionCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    seasonIdResolutionCache.delete(cacheKey);
    return null;
  }
  return cached.seasonId;
};

const setCachedSeasonId = (cacheKey: string, seasonId: string): void => {
  seasonIdResolutionCache.set(cacheKey, {
    seasonId,
    expiresAt: Date.now() + SEASON_ID_RESOLUTION_CACHE_TTL_MS,
  });
  if (seasonIdResolutionCache.size <= SEASON_ID_RESOLUTION_CACHE_MAX_ENTRIES) {
    return;
  }
  const entriesByExpiry = [...seasonIdResolutionCache.entries()].sort(
    (left, right) => left[1].expiresAt - right[1].expiresAt,
  );
  for (const [key] of entriesByExpiry.slice(0, seasonIdResolutionCache.size - SEASON_ID_RESOLUTION_CACHE_MAX_ENTRIES)) {
    seasonIdResolutionCache.delete(key);
  }
};

const readSeasonListItems = (payload: Record<string, unknown>): SeasonListItem[] => {
  return Array.isArray(payload.seasons) ? (payload.seasons as SeasonListItem[]) : [];
};

const readSeasonListPagination = (payload: Record<string, unknown>): SeasonListPagination | null => {
  if (!payload.pagination || typeof payload.pagination !== "object") {
    return null;
  }
  return payload.pagination as SeasonListPagination;
};

const readNumberField = (value: unknown): number | null => {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const hasAdditionalSeasonPages = (
  payload: Record<string, unknown>,
  offset: number,
  pageSize: number,
): boolean => {
  const seasons = readSeasonListItems(payload);
  const pagination = readSeasonListPagination(payload);
  const total = readNumberField(pagination?.total);
  if (total !== null) {
    return offset + seasons.length < total;
  }
  const count = readNumberField(pagination?.count);
  if (count !== null) {
    return offset + count < pageSize;
  }
  return seasons.length >= pageSize;
};

const extractSeasonIdFromPayload = (
  payload: Record<string, unknown>,
  targetSeasonNumber: number,
): string | null => {
  const matchingSeason = readSeasonListItems(payload).find(
    (season) => readNumberField(season.season_number) === targetSeasonNumber && typeof season.id === "string" && season.id.trim(),
  );
  return typeof matchingSeason?.id === "string" ? matchingSeason.id : null;
};

const readBackendLookupErrorMessage = (data: Record<string, unknown>, fallback: string): string => {
  if (typeof data.error === "string" && data.error.trim()) {
    return data.error;
  }
  if (typeof data.detail === "string" && data.detail.trim()) {
    return data.detail;
  }
  return fallback;
};

const resolveSeasonIdFromBackend = async (showId: string, seasonNumber: number): Promise<string> => {
  const localSeason = await getSeasonByShowAndNumber(showId, seasonNumber).catch(() => null);
  if (localSeason?.id) {
    return localSeason.id;
  }

  for (let pageIndex = 0; pageIndex < SHOW_SEASON_RESOLUTION_MAX_PAGES; pageIndex += 1) {
    const offset = pageIndex * SHOW_SEASON_RESOLUTION_PAGE_SIZE;
    const upstream = await fetchAdminBackendJson(`/admin/trr-api/shows/${showId}/seasons`, {
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      queryString: `limit=${SHOW_SEASON_RESOLUTION_PAGE_SIZE}&offset=${offset}`,
      routeName: "social-season-resolve",
    });
    if (upstream.status !== 200) {
      throw new Error(readBackendLookupErrorMessage(upstream.data, "Failed to resolve season"));
    }
    const seasonId = extractSeasonIdFromPayload(upstream.data, seasonNumber);
    if (seasonId) {
      return seasonId;
    }
    if (!hasAdditionalSeasonPages(upstream.data, offset, SHOW_SEASON_RESOLUTION_PAGE_SIZE)) {
      break;
    }
  }
  throw new Error("season not found");
};

type FetchWithRetryOptions = {
  method?: string;
  headers?: HeadersInit;
  body?: string;
  timeoutMs?: number;
  retries?: number;
  traceId?: string;
  fallbackError: string;
};

type SeasonBackendOptions = FetchWithRetryOptions & {
  adminContext?: VerifiedAdminContext;
  queryString?: string;
  seasonIdHint?: string | null;
};

type SocialBackendOptions = FetchWithRetryOptions & {
  adminContext?: VerifiedAdminContext;
  queryString?: string;
};

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: abortController.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchBackend(
  backendUrl: string,
  options: FetchWithRetryOptions,
): Promise<Response> {
  const method = options.method ?? "GET";
  const retries = isAutoRetryEligible(method) ? Math.max(0, options.retries ?? 0) : 0;
  const maxAttempts = retries + 1;
  const timeoutMs = options.timeoutMs ?? 30_000;
  const requestHeaders = new Headers(options.headers);
  const traceId = String(options.traceId || requestHeaders.get("x-trace-id") || "").trim() || buildTraceId();
  requestHeaders.set("x-trace-id", traceId);
  if (!requestHeaders.has("x-request-id")) {
    requestHeaders.set("x-request-id", traceId);
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        backendUrl,
        {
          method,
          headers: requestHeaders,
          body: options.body,
          cache: "no-store",
        },
        timeoutMs,
      );

      if (response.ok) {
        return response;
      }

      let data: Record<string, unknown> = {};
      data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const upstreamDetail = readUpstreamDetail(data);
      const upstreamDetailCode = readUpstreamDetailCode(data);
      const normalizedMessage = normalizeBackendErrorMessage(data, options.fallbackError);
      const retryAfterSeconds = parseRetryAfterSeconds(response.headers?.get?.("retry-after") ?? null);
      const hasDnsOrTransportFault =
        hasDnsOrTransportFaultText(normalizedMessage) || hasDnsOrTransportFaultDetail(upstreamDetail);
      const hasBackendSaturation = isBackendSaturatedResponse({
        status: response.status,
        message: normalizedMessage,
        detail: upstreamDetail,
        detailCode: upstreamDetailCode,
      });
      const responseTraceId =
        response.headers?.get?.("x-trace-id") ?? response.headers?.get?.("x-request-id") ?? traceId;
      const proxyError = hasDnsOrTransportFault
        ? new SocialProxyError(
            "Could not reach TRR-Backend. Confirm TRR-Backend is running and TRR_API_URL is correct.",
            {
              status: 502,
              code: "BACKEND_UNREACHABLE",
              retryable: true,
              retryAfterSeconds,
              traceId: responseTraceId,
              upstreamStatus: response.status,
              upstreamDetail,
              upstreamDetailCode,
            },
          )
        : response.status === 504 && upstreamDetailCode === "REQUEST_TIMEOUT"
          ? new SocialProxyError(normalizedMessage, {
              status: 504,
              code: "BACKEND_REQUEST_TIMEOUT",
              retryable: true,
              retryAfterSeconds,
              traceId: responseTraceId,
              upstreamStatus: response.status,
              upstreamDetail,
              upstreamDetailCode,
            })
        : hasBackendSaturation
          ? new SocialProxyError(backendSaturatedMessage(), {
              status: 503,
              code: "BACKEND_SATURATED",
              retryable: true,
              retryAfterSeconds: retryAfterSeconds ?? 2,
              traceId: responseTraceId,
              upstreamStatus: response.status,
              upstreamDetail,
              upstreamDetailCode,
            })
        : new SocialProxyError(normalizedMessage, {
            status: response.status,
            code: "UPSTREAM_ERROR",
            retryable: isRetryableUpstreamStatus(response.status),
            retryAfterSeconds,
            traceId: responseTraceId,
            upstreamStatus: response.status,
            upstreamDetail,
            upstreamDetailCode,
          });
      if (!proxyError.retryable || attempt >= maxAttempts) {
        throw proxyError;
      }
      const retryDelayMs =
        proxyError.retryAfterSeconds !== undefined && proxyError.retryAfterSeconds > 0
          ? proxyError.retryAfterSeconds * 1000
          : 150 * 2 ** (attempt - 1);
      await sleep(retryDelayMs);
    } catch (error) {
      const proxyError = toProxyError(error, traceId);
      if (proxyError.code === "UPSTREAM_TIMEOUT") {
        proxyError.logContext = {
          backend_url: backendUrl,
          backend_path: readBackendPath(backendUrl),
          timeout_ms: timeoutMs,
          timeout_tier: readTimeoutTier(timeoutMs),
          trace_id: traceId,
          attempt,
          max_attempts: maxAttempts,
          error_cause: serializeErrorCause((error as Error & { cause?: unknown })?.cause),
        };
      }
      if (!proxyError.retryable || attempt >= maxAttempts) {
        throw proxyError;
      }
      await sleep(150 * 2 ** (attempt - 1));
    }
  }

  throw new SocialProxyError(options.fallbackError, { status: 500, code: "INTERNAL_ERROR", traceId });
}

export const resolveSeasonId = async (showId: string, seasonNumberRaw: string): Promise<string> => {
  const cacheKey = buildSeasonResolutionCacheKey(showId, seasonNumberRaw);
  const cachedSeasonId = getCachedSeasonId(cacheKey);
  if (cachedSeasonId) {
    return cachedSeasonId;
  }
  const inFlight = seasonIdResolutionInFlight.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const seasonNumber = Number.parseInt(seasonNumberRaw, 10);
  if (!Number.isFinite(seasonNumber)) {
    throw new Error("seasonNumber is invalid");
  }
  const lookupPromise = (async () => {
    const seasonId = await resolveSeasonIdFromBackend(showId, seasonNumber);
    setCachedSeasonId(cacheKey, seasonId);
    return seasonId;
  })();
  seasonIdResolutionInFlight.set(cacheKey, lookupPromise);
  try {
    return await lookupPromise;
  } finally {
    const activePromise = seasonIdResolutionInFlight.get(cacheKey);
    if (activePromise === lookupPromise) {
      seasonIdResolutionInFlight.delete(cacheKey);
    }
  }
};

export const resetSeasonIdResolutionCacheForTests = (): void => {
  seasonIdResolutionCache.clear();
  seasonIdResolutionInFlight.clear();
};

export const buildSeasonBackendUrl = async (
  showId: string,
  seasonNumberRaw: string,
  seasonPath: string,
  seasonIdHint?: string | null,
): Promise<string> => {
  const hintedSeasonId = isUuid(seasonIdHint) ? seasonIdHint : null;
  const cacheKey = buildSeasonResolutionCacheKey(showId, seasonNumberRaw);
  const cachedSeasonId = getCachedSeasonId(cacheKey);
  const seasonId =
    hintedSeasonId ??
    cachedSeasonId ??
    (await resolveSeasonId(showId, seasonNumberRaw));
  if (hintedSeasonId) {
    setCachedSeasonId(cacheKey, hintedSeasonId);
  }
  const normalizedSeasonPath = seasonPath.startsWith("/") ? seasonPath : `/${seasonPath}`;
  const backendUrl = getBackendApiUrl(`/admin/socials/seasons/${seasonId}${normalizedSeasonPath}`);
  if (!backendUrl) {
    throw new Error("Backend API not configured");
  }
  return backendUrl;
};

export const buildSocialBackendUrl = (socialPath: string): string => {
  const normalizedSocialPath = socialPath.startsWith("/") ? socialPath : `/${socialPath}`;
  const backendUrl = getBackendApiUrl(`/admin/socials${normalizedSocialPath}`);
  if (!backendUrl) {
    throw new Error("Backend API not configured");
  }
  return backendUrl;
};

export const fetchSeasonBackendJson = async (
  showId: string,
  seasonNumberRaw: string,
  seasonPath: string,
  options: SeasonBackendOptions,
): Promise<Record<string, unknown>> => {
  const backendBase = await buildSeasonBackendUrl(showId, seasonNumberRaw, seasonPath, options.seasonIdHint);
  const backendUrl = appendQuery(backendBase, options.queryString ?? "");
  const traceId =
    String(options.traceId || new Headers(options.headers).get("x-trace-id") || "").trim() ||
    buildTraceId();
  const response = await fetchBackend(backendUrl, {
    ...options,
    traceId,
    headers: buildInternalAdminHeaders(options.adminContext, {
      "x-trace-id": traceId,
      ...(options.headers ?? {}),
    }),
  });
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
};

export const fetchSocialBackendJson = async (
  socialPath: string,
  options: SocialBackendOptions,
): Promise<Record<string, unknown>> => {
  const backendBase = buildSocialBackendUrl(socialPath);
  const backendUrl = appendQuery(backendBase, options.queryString ?? "");
  const traceId =
    String(options.traceId || new Headers(options.headers).get("x-trace-id") || "").trim() ||
    buildTraceId();
  const response = await fetchBackend(backendUrl, {
    ...options,
    traceId,
    headers: buildInternalAdminHeaders(options.adminContext, {
      "x-trace-id": traceId,
      ...(options.headers ?? {}),
    }),
  });
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
};

export const fetchSeasonBackendResponse = async (
  showId: string,
  seasonNumberRaw: string,
  seasonPath: string,
  options: SeasonBackendOptions,
): Promise<Response> => {
  const backendBase = await buildSeasonBackendUrl(showId, seasonNumberRaw, seasonPath, options.seasonIdHint);
  const backendUrl = appendQuery(backendBase, options.queryString ?? "");
  const traceId =
    String(options.traceId || new Headers(options.headers).get("x-trace-id") || "").trim() ||
    buildTraceId();
  return fetchBackend(backendUrl, {
    ...options,
    traceId,
    headers: buildInternalAdminHeaders(options.adminContext, {
      "x-trace-id": traceId,
      ...(options.headers ?? {}),
    }),
  });
};

export const socialProxyErrorResponse = (
  error: unknown,
  logLabel: string,
): NextResponse<SocialProxyErrorBody> => {
  const proxyError = toProxyError(error);
  console.error(logLabel, {
    error: proxyError.message,
    code: proxyError.code,
    status: proxyError.status,
    retryable: proxyError.retryable,
    trace_id: proxyError.traceId,
    upstream_status: proxyError.upstreamStatus,
    upstream_detail_code: proxyError.upstreamDetailCode,
    context: proxyError.logContext,
  });
  const body: SocialProxyErrorBody = {
    error: proxyError.message,
    code: proxyError.code,
    retryable: proxyError.retryable,
  };
  if (proxyError.traceId) {
    body.trace_id = proxyError.traceId;
  }
  if (proxyError.retryAfterSeconds !== undefined) {
    body.retry_after_seconds = proxyError.retryAfterSeconds;
  }
  if (proxyError.upstreamStatus) {
    body.upstream_status = proxyError.upstreamStatus;
  }
  if (proxyError.upstreamDetail !== undefined) {
    body.upstream_detail = proxyError.upstreamDetail;
  }
  if (proxyError.upstreamDetailCode) {
    body.upstream_detail_code = proxyError.upstreamDetailCode;
  }
  const headers = proxyError.retryAfterSeconds !== undefined ? { "retry-after": String(proxyError.retryAfterSeconds) } : undefined;
  return NextResponse.json(body, { status: proxyError.status, headers });
};
