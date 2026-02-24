import "server-only";

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
  upstream_status?: number;
  upstream_detail?: unknown;
  upstream_detail_code?: string;
};

class SocialProxyError extends Error {
  status: number;
  code: ProxyErrorCode;
  retryable: boolean;
  upstreamStatus?: number;
  upstreamDetail?: unknown;
  upstreamDetailCode?: string;

  constructor(
    message: string,
    options: {
      status: number;
      code: ProxyErrorCode;
      retryable?: boolean;
      upstreamStatus?: number;
      upstreamDetail?: unknown;
      upstreamDetailCode?: string;
    },
  ) {
    super(message);
    this.status = options.status;
    this.code = options.code;
    this.retryable = Boolean(options.retryable);
    this.upstreamStatus = options.upstreamStatus;
    this.upstreamDetail = options.upstreamDetail;
    this.upstreamDetailCode = options.upstreamDetailCode;
  }
}

const getServiceRoleKey = (): string => {
  const value = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
  if (!value) {
    throw new Error("Backend auth not configured");
  }
  return value;
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
  return status === 502 || status === 503 || status === 504;
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

const toProxyError = (error: unknown): SocialProxyError => {
  if (error instanceof SocialProxyError) {
    return error;
  }
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return new SocialProxyError("TRR-Backend request timed out.", {
        status: 504,
        code: "UPSTREAM_TIMEOUT",
        retryable: true,
      });
    }
    if (isRetryableNetworkError(error)) {
      return new SocialProxyError(
        "Could not reach TRR-Backend. Confirm TRR-Backend is running and TRR_API_URL is correct.",
        {
          status: 502,
          code: "BACKEND_UNREACHABLE",
          retryable: true,
        },
      );
    }
    if (error.message === "unauthorized") {
      return new SocialProxyError(error.message, { status: 401, code: "UNAUTHORIZED" });
    }
    if (error.message === "forbidden") {
      return new SocialProxyError(error.message, { status: 403, code: "FORBIDDEN" });
    }
    if (error.message === "season not found") {
      return new SocialProxyError(error.message, { status: 404, code: "SEASON_NOT_FOUND" });
    }
    if (error.message === "seasonNumber is invalid") {
      return new SocialProxyError(error.message, { status: 400, code: "BAD_REQUEST" });
    }
    return new SocialProxyError(error.message, { status: 500, code: "INTERNAL_ERROR" });
  }
  return new SocialProxyError("failed", { status: 500, code: "INTERNAL_ERROR" });
};

const appendQuery = (backendBase: string, queryString: string): string => {
  return queryString ? `${backendBase}?${queryString}` : backendBase;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value: string | null | undefined): value is string =>
  typeof value === "string" && UUID_PATTERN.test(value);

type FetchWithRetryOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  retries?: number;
  fallbackError: string;
};

type SeasonBackendOptions = FetchWithRetryOptions & {
  queryString?: string;
  seasonIdHint?: string | null;
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

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        backendUrl,
        {
          method: options.method ?? "GET",
          headers: options.headers,
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
      const hasDnsOrTransportFault =
        hasDnsOrTransportFaultText(normalizedMessage) || hasDnsOrTransportFaultDetail(upstreamDetail);
      const proxyError = hasDnsOrTransportFault
        ? new SocialProxyError(
            "Could not reach TRR-Backend. Confirm TRR-Backend is running and TRR_API_URL is correct.",
            {
              status: 502,
              code: "BACKEND_UNREACHABLE",
              retryable: true,
              upstreamStatus: response.status,
              upstreamDetail,
              upstreamDetailCode,
            },
          )
        : new SocialProxyError(normalizedMessage, {
            status: response.status,
            code: "UPSTREAM_ERROR",
            retryable: isRetryableUpstreamStatus(response.status),
            upstreamStatus: response.status,
            upstreamDetail,
            upstreamDetailCode,
          });
      if (!proxyError.retryable || attempt >= maxAttempts) {
        throw proxyError;
      }
      await sleep(150 * 2 ** (attempt - 1));
    } catch (error) {
      const proxyError = toProxyError(error);
      if (!proxyError.retryable || attempt >= maxAttempts) {
        throw proxyError;
      }
      await sleep(150 * 2 ** (attempt - 1));
    }
  }

  throw new SocialProxyError(options.fallbackError, { status: 500, code: "INTERNAL_ERROR" });
}

export const resolveSeasonId = async (showId: string, seasonNumberRaw: string): Promise<string> => {
  const seasonNumber = Number.parseInt(seasonNumberRaw, 10);
  if (!Number.isFinite(seasonNumber)) {
    throw new Error("seasonNumber is invalid");
  }
  const season = await getSeasonByShowAndNumber(showId, seasonNumber);
  if (!season?.id) {
    throw new Error("season not found");
  }
  return season.id;
};

export const buildSeasonBackendUrl = async (
  showId: string,
  seasonNumberRaw: string,
  seasonPath: string,
  seasonIdHint?: string | null,
): Promise<string> => {
  const seasonId = isUuid(seasonIdHint) ? seasonIdHint : await resolveSeasonId(showId, seasonNumberRaw);
  const normalizedSeasonPath = seasonPath.startsWith("/") ? seasonPath : `/${seasonPath}`;
  const backendUrl = getBackendApiUrl(`/admin/socials/seasons/${seasonId}${normalizedSeasonPath}`);
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
  const response = await fetchBackend(backendUrl, {
    ...options,
    headers: {
      Authorization: `Bearer ${getServiceRoleKey()}`,
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
  return fetchBackend(backendUrl, {
    ...options,
    headers: {
      Authorization: `Bearer ${getServiceRoleKey()}`,
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
  if (proxyError.upstreamStatus) {
    body.upstream_status = proxyError.upstreamStatus;
  }
  if (proxyError.upstreamDetail !== undefined) {
    body.upstream_detail = proxyError.upstreamDetail;
  }
  if (proxyError.upstreamDetailCode) {
    body.upstream_detail_code = proxyError.upstreamDetailCode;
  }
  return NextResponse.json(body, { status: proxyError.status });
};
