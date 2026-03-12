import "server-only";

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { getSeasonByShowAndNumber } from "@/lib/server/trr-api/trr-shows-repository";

type ProxyErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "BAD_REQUEST"
  | "SEASON_NOT_FOUND"
  | "BACKEND_UNREACHABLE"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_ERROR"
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

class SocialProxyError extends Error {
  status: number;
  code: ProxyErrorCode;
  retryable: boolean;
  retryAfterSeconds?: number;
  traceId?: string;
  upstreamStatus?: number;
  upstreamDetail?: unknown;
  upstreamDetailCode?: string;

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

export const SOCIAL_PROXY_SHORT_TIMEOUT_MS = readPositiveIntEnv("TRR_SOCIAL_PROXY_SHORT_TIMEOUT_MS", 25_000);
export const SOCIAL_PROXY_DEFAULT_TIMEOUT_MS = readPositiveIntEnv("TRR_SOCIAL_PROXY_DEFAULT_TIMEOUT_MS", 45_000);
export const SOCIAL_PROXY_LONG_TIMEOUT_MS = readPositiveIntEnv("TRR_SOCIAL_PROXY_LONG_TIMEOUT_MS", 90_000);
const SEASON_ID_RESOLUTION_CACHE_TTL_MS = readPositiveIntEnv(
  "TRR_SOCIAL_PROXY_SEASON_ID_CACHE_TTL_MS",
  5 * 60 * 1000,
);
const SEASON_ID_RESOLUTION_CACHE_MAX_ENTRIES = readPositiveIntEnv(
  "TRR_SOCIAL_PROXY_SEASON_ID_CACHE_MAX_ENTRIES",
  512,
);

const seasonIdResolutionCache = new Map<string, { seasonId: string; expiresAt: number }>();
const seasonIdResolutionInFlight = new Map<string, Promise<string>>();

const getServiceRoleKey = (): string => {
  const value = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) {
    throw new Error("Backend auth not configured");
  }
  return value.trim();
};

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

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const isRetryableUpstreamStatus = (status: number): boolean => {
  return status === 429 || status === 502 || status === 503 || status === 504;
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

type FetchWithRetryOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  retries?: number;
  traceId?: string;
  fallbackError: string;
};

type SeasonBackendOptions = FetchWithRetryOptions & {
  queryString?: string;
  seasonIdHint?: string | null;
};

type SocialBackendOptions = FetchWithRetryOptions & {
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
  const retries = Math.max(0, options.retries ?? 0);
  const maxAttempts = retries + 1;
  const traceId = String(options.traceId || options.headers?.["x-trace-id"] || "").trim() || buildTraceId();
  const requestHeaders: Record<string, string> = {
    ...(options.headers ?? {}),
    "x-trace-id": traceId,
  };
  if (!requestHeaders["x-request-id"]) {
    requestHeaders["x-request-id"] = traceId;
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        backendUrl,
        {
          method: options.method ?? "GET",
          headers: requestHeaders,
          body: options.body,
          cache: "no-store",
        },
        options.timeoutMs ?? 30_000,
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
    const season = await getSeasonByShowAndNumber(showId, seasonNumber);
    if (!season?.id) {
      throw new Error("season not found");
    }
    setCachedSeasonId(cacheKey, season.id);
    return season.id;
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
  const traceId = String(options.traceId || options.headers?.["x-trace-id"] || "").trim() || buildTraceId();
  const response = await fetchBackend(backendUrl, {
    ...options,
    traceId,
    headers: {
      Authorization: `Bearer ${getServiceRoleKey()}`,
      "x-trace-id": traceId,
      ...(options.headers ?? {}),
    },
  });
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
};

export const fetchSocialBackendJson = async (
  socialPath: string,
  options: SocialBackendOptions,
): Promise<Record<string, unknown>> => {
  const backendBase = buildSocialBackendUrl(socialPath);
  const backendUrl = appendQuery(backendBase, options.queryString ?? "");
  const traceId = String(options.traceId || options.headers?.["x-trace-id"] || "").trim() || buildTraceId();
  const response = await fetchBackend(backendUrl, {
    ...options,
    traceId,
    headers: {
      Authorization: `Bearer ${getServiceRoleKey()}`,
      "x-trace-id": traceId,
      ...(options.headers ?? {}),
    },
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
  const traceId = String(options.traceId || options.headers?.["x-trace-id"] || "").trim() || buildTraceId();
  return fetchBackend(backendUrl, {
    ...options,
    traceId,
    headers: {
      Authorization: `Bearer ${getServiceRoleKey()}`,
      "x-trace-id": traceId,
      ...(options.headers ?? {}),
    },
  });
};

export const socialProxyErrorResponse = (
  error: unknown,
  logLabel: string,
): NextResponse<SocialProxyErrorBody> => {
  const proxyError = toProxyError(error);
  console.error(logLabel, error);
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
