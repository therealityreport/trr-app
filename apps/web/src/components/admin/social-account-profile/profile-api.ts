import { useCallback } from "react";
import type { User } from "firebase/auth";
import { fetchAdminWithAuth as fetchAdminWithAuthBase } from "@/lib/admin/client-auth";
import type {
  SocialAccountCatalogFreshness,
  SocialProfileCookieHealth,
  SocialProfileCookieRefreshResult,
  SocialPlatformSlug,
} from "@/lib/admin/social-account-profile";

export type SocialProfileApi = typeof fetchAdminWithAuthBase;

export function useSocialProfileApi(user: User | null): SocialProfileApi {
  return useCallback(
    (
      input: RequestInfo | URL,
      init?: RequestInit,
      options?: Parameters<typeof fetchAdminWithAuthBase>[2],
    ) =>
      fetchAdminWithAuthBase(input, init, {
        ...options,
        preferredUser: options?.preferredUser ?? user,
        allowDevAdminBypass: options?.allowDevAdminBypass ?? true,
      }),
    [user],
  );
}

export type ProxyErrorPayload = {
  error?: string;
  detail?: string;
  code?: string;
  retryable?: boolean;
  retry_after_seconds?: number;
  trace_id?: string;
  upstream_status?: number;
  upstream_detail?: unknown;
  upstream_detail_code?: string;
};

export type SocialAccountRequestError = Error & {
  code?: string;
  retryable?: boolean;
  retryAfterMs?: number;
  isBackendSaturated?: boolean;
  upstreamStatus?: number;
  traceId?: string;
};

export type CatalogFreshnessPayload = SocialAccountCatalogFreshness &
  ProxyErrorPayload & {
    degraded?: boolean;
    partial?: boolean;
    freshness_degraded?: boolean;
    recent_runs_degraded?: boolean;
    recent_runs_unavailable?: boolean;
    degraded_reason?: string | null;
    degradation_reason?: string | null;
  };

export const INSTAGRAM_AUTH_REFRESH_CONFIRMATION = "I UNDERSTAND INSTAGRAM AUTH RISK";
export const INSTAGRAM_AUTH_REFRESH_WARNING =
  "Manual Instagram auth can surface CAPTCHA, verification code, checkpoint, or account-lock prompts. Complete those steps yourself before confirming a validated-cookie sync.";
const socialProfileRequestInflight = new Map<string, Promise<unknown>>();

export const __resetSocialProfileRequestInflightForTests = (): void => {
  socialProfileRequestInflight.clear();
};

export const withSocialProfileRequestDedup = <T,>(key: string, loader: () => Promise<T>): Promise<T> => {
  const existing = socialProfileRequestInflight.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }
  const promise = loader().finally(() => {
    if (socialProfileRequestInflight.get(key) === promise) {
      socialProfileRequestInflight.delete(key);
    }
  });
  socialProfileRequestInflight.set(key, promise as Promise<unknown>);
  return promise;
};

export const hasBackendSaturationText = (value: string): boolean => {
  const message = value.toLowerCase();
  return (
    message.includes("connection pool exhausted") ||
    message.includes("database pool initialization failed") ||
    message.includes("maxclientsinsessionmode") ||
    message.includes("session-pool capacity") ||
    message.includes("session pool capacity") ||
    message.includes("pool pressure") ||
    message.includes("backend is saturated")
  );
};

export const isBackendPressureCode = (value: string | null | undefined): boolean => {
  const normalized = String(value || "").trim().toUpperCase();
  return (
    normalized === "BACKEND_TIMEOUT" ||
    normalized === "BACKEND_REQUEST_TIMEOUT" ||
    normalized === "DATABASE_SERVICE_UNAVAILABLE" ||
    normalized === "UPSTREAM_TIMEOUT" ||
    normalized === "REQUEST_TIMEOUT"
  );
};

export const isBackendSaturatedPayload = (payload: ProxyErrorPayload): boolean => {
  const upstreamDetail =
    payload.upstream_detail && typeof payload.upstream_detail === "object"
      ? (payload.upstream_detail as Record<string, unknown>)
      : null;
  const upstreamReason =
    typeof upstreamDetail?.reason === "string" && upstreamDetail.reason.trim()
      ? upstreamDetail.reason.trim().toLowerCase()
      : "";
  const upstreamCode =
    (typeof payload.upstream_detail_code === "string" && payload.upstream_detail_code.trim()) ||
    (typeof upstreamDetail?.code === "string" && upstreamDetail.code.trim()) ||
    (typeof payload.code === "string" && payload.code.trim()) ||
    "";
  const detailMessage = [payload.error, payload.detail, upstreamDetail?.message, upstreamDetail?.error]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");
  return (
    payload.code === "BACKEND_SATURATED" ||
    upstreamReason === "session_pool_capacity" ||
    (upstreamCode === "DATABASE_SERVICE_UNAVAILABLE" && upstreamReason === "session_pool_capacity") ||
    hasBackendSaturationText(detailMessage)
  );
};

export const buildSocialAccountRequestError = (
  payload: ProxyErrorPayload,
  fallbackMessage: string,
): SocialAccountRequestError => {
  const upstreamDetail =
    payload.upstream_detail && typeof payload.upstream_detail === "object"
      ? (payload.upstream_detail as Record<string, unknown>)
      : null;
  const message =
    (typeof payload.error === "string" && payload.error.trim()) ||
    (typeof payload.detail === "string" && payload.detail.trim()) ||
    (typeof upstreamDetail?.message === "string" && upstreamDetail.message.trim()) ||
    fallbackMessage;
  const retryAfterMs =
    typeof payload.retry_after_seconds === "number" && Number.isFinite(payload.retry_after_seconds)
      ? Math.max(0, payload.retry_after_seconds * 1000)
      : undefined;
  const error = new Error(message) as SocialAccountRequestError;
  error.code = typeof payload.code === "string" && payload.code.trim() ? payload.code.trim() : undefined;
  error.retryable = Boolean(payload.retryable);
  error.retryAfterMs = retryAfterMs;
  error.isBackendSaturated = isBackendSaturatedPayload(payload);
  error.upstreamStatus = typeof payload.upstream_status === "number" ? payload.upstream_status : undefined;
  error.traceId = typeof payload.trace_id === "string" && payload.trace_id.trim() ? payload.trace_id.trim() : undefined;
  return error;
};

export const toSocialAccountRequestError = (
  error: unknown,
  fallbackMessage: string,
): SocialAccountRequestError => {
  if (error instanceof Error) {
    const existing = error as SocialAccountRequestError;
    if (
      existing.code ||
      existing.retryable !== undefined ||
      existing.retryAfterMs !== undefined ||
      existing.isBackendSaturated !== undefined ||
      existing.upstreamStatus !== undefined ||
      existing.traceId !== undefined
    ) {
      return existing;
    }
    const normalized = new Error(existing.message || fallbackMessage) as SocialAccountRequestError;
    normalized.code = existing.code;
    normalized.retryable = existing.retryable;
    normalized.retryAfterMs = existing.retryAfterMs;
    normalized.isBackendSaturated = existing.isBackendSaturated;
    normalized.upstreamStatus = existing.upstreamStatus;
    normalized.traceId = existing.traceId;
    return normalized;
  }
  return new Error(fallbackMessage) as SocialAccountRequestError;
};

export const isBackendSaturationError = (error: unknown): error is SocialAccountRequestError => {
  return Boolean((error as SocialAccountRequestError | undefined)?.isBackendSaturated);
};

export const isCatalogFreshnessDegraded = (payload: CatalogFreshnessPayload | null | undefined): boolean => {
  if (!payload) return false;
  const reason = payload.degraded_reason ?? payload.degradation_reason ?? payload.reason ?? null;
  return (
    Boolean(payload.degraded) ||
    Boolean(payload.partial) ||
    Boolean(payload.freshness_degraded) ||
    Boolean(payload.recent_runs_degraded) ||
    Boolean(payload.recent_runs_unavailable) ||
    Boolean(reason && hasBackendSaturationText(reason)) ||
    isBackendSaturatedPayload(payload)
  );
};

export const toSharedLiveResourceRequestError = (
  message: string | null,
  details: {
    code?: string;
    retryable?: boolean;
    retryAfterMs?: number;
    isBackendSaturated?: boolean;
    upstreamStatus?: number;
  } | null,
): SocialAccountRequestError => {
  const error = new Error(message || details?.code || "Fetch failed") as SocialAccountRequestError;
  error.code = details?.code;
  error.retryable = details?.retryable;
  error.retryAfterMs = details?.retryAfterMs;
  error.isBackendSaturated = details?.isBackendSaturated;
  error.upstreamStatus = details?.upstreamStatus;
  return error;
};

export const isTimeoutRequestError = (error: SocialAccountRequestError | null | undefined): boolean => {
  if (!error) return false;
  return (
    error.code === "BACKEND_REQUEST_TIMEOUT" ||
    error.code === "UPSTREAM_TIMEOUT" ||
    error.upstreamStatus === 504 ||
    error.message.toLowerCase().includes("timed out")
  );
};

export const isBackendPressureError = (error: unknown): error is SocialAccountRequestError => {
  const requestError = error as SocialAccountRequestError | undefined;
  if (!requestError) return false;
  return (
    Boolean(requestError.isBackendSaturated) ||
    isBackendPressureCode(requestError.code) ||
    isTimeoutRequestError(requestError) ||
    hasBackendSaturationText(requestError.message || "")
  );
};

export const toCatalogGapAnalysisStatusError = (
  value: unknown,
  fallbackMessage: string,
): SocialAccountRequestError | null => {
  if (!value || typeof value !== "object") {
    if (typeof value === "string" && value.trim()) {
      return new Error(value.trim()) as SocialAccountRequestError;
    }
    return null;
  }
  const payload = value as ProxyErrorPayload & { message?: string; detail?: string };
  if (payload.error || payload.detail || payload.code || payload.retryable || payload.upstream_status) {
    return buildSocialAccountRequestError(payload, fallbackMessage);
  }
  if (typeof payload.message === "string" && payload.message.trim()) {
    return new Error(payload.message.trim()) as SocialAccountRequestError;
  }
  return null;
};

export const toProxyErrorPayload = (value: unknown): ProxyErrorPayload => {
  if (!value || typeof value !== "object") {
    return {};
  }
  const payload = value as Record<string, unknown>;
  return {
    error: typeof payload.error === "string" ? payload.error : undefined,
    detail: typeof payload.detail === "string" ? payload.detail : undefined,
    code: typeof payload.code === "string" ? payload.code : undefined,
    retryable: typeof payload.retryable === "boolean" ? payload.retryable : undefined,
    retry_after_seconds:
      typeof payload.retry_after_seconds === "number" && Number.isFinite(payload.retry_after_seconds)
        ? payload.retry_after_seconds
        : undefined,
    trace_id: typeof payload.trace_id === "string" ? payload.trace_id : undefined,
    upstream_status:
      typeof payload.upstream_status === "number" && Number.isFinite(payload.upstream_status)
        ? payload.upstream_status
        : undefined,
    upstream_detail: payload.upstream_detail,
    upstream_detail_code:
      typeof payload.upstream_detail_code === "string" ? payload.upstream_detail_code : undefined,
  };
};

export function requestCookieHealth(input: {
  fetchAdminWithAuth: SocialProfileApi;
  user: User;
  platform: SocialPlatformSlug;
  handle: string;
  force: boolean;
  commentsAuthRequested: boolean;
  options: { includePostsAuth?: boolean; includeCommentsAuth?: boolean };
}): Promise<SocialProfileCookieHealth> {
  const { fetchAdminWithAuth, user, platform, handle, force, commentsAuthRequested, options } = input;
  const params = new URLSearchParams();
  if (force) params.set("force", "true");
  if (platform === "instagram") {
    if (options.includePostsAuth ?? force) params.set("posts_auth", "true");
    if (options.includeCommentsAuth ?? commentsAuthRequested) params.set("comments_auth", "true");
  }
  const qs = params.size > 0 ? `?${params.toString()}` : "";
  // Preserve immediate transport throws for the caller's existing state batch.
  return fetchAdminWithAuth(
    `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/cookies/health${qs}`,
    { method: "GET" },
    { preferredUser: user },
  ).then(async (response) => {
    const data = (await response.json().catch(() => ({}))) as SocialProfileCookieHealth & ProxyErrorPayload;
    if (!response.ok) throw buildSocialAccountRequestError(data, "Failed to check cookie health");
    return data;
  });
}

export function refreshProfileCookies(input: {
  fetchAdminWithAuth: SocialProfileApi;
  user: User;
  platform: SocialPlatformSlug;
  handle: string;
  requiresInstagramConfirmation: boolean;
}): Promise<SocialProfileCookieRefreshResult> {
  const { fetchAdminWithAuth, user, platform, handle, requiresInstagramConfirmation } = input;
  return fetchAdminWithAuth(
    `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/cookies/refresh`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headless: false,
        timeout_seconds: 180,
        operator_confirmation: requiresInstagramConfirmation ? INSTAGRAM_AUTH_REFRESH_CONFIRMATION : undefined,
        allow_cookie_refresh: true,
      }),
    },
    { preferredUser: user },
  ).then(async (response) => {
    const data = (await response.json().catch(() => ({}))) as SocialProfileCookieRefreshResult & {
      detail?: { message?: string };
    };
    if (!response.ok) {
      throw new Error(data.detail?.message || data.reason || "Cookie refresh failed");
    }
    return data;
  });
}
