"use client";

import type { User } from "firebase/auth";
import type { FetchAdminWithAuthOptions } from "@/lib/admin/client-auth";
import type {
  SocialAccountCatalogRunProgressSnapshot,
  SocialPlatformSlug,
} from "@/lib/admin/social-account-profile";

export type CatalogRunProgressProxyErrorPayload = {
  error?: string;
  detail?: string;
  code?: string;
  retryable?: boolean;
  retry_after_seconds?: number;
  upstream_status?: number;
  upstream_detail?: unknown;
  upstream_detail_code?: string;
};

// Only balanced versioned target outcomes establish detail completion. Old job
// counts and generic scraped_at timestamps cannot supply missing success data.
export function readDetailTargetProgress(progress?: SocialAccountCatalogRunProgressSnapshot | null) {
  const counts = progress?.detail_outcomes;
  const keys = ["total", "committed", "cached_satisfied", "source_unavailable", "unresolved", "failed", "retry_wait", "resumable", "attempted", "requests"] as const;
  if (progress?.detail_contract_version !== 1 || progress.progress_authoritative === false || progress.progress_degraded === true || !counts ||
      keys.some((key) => !Number.isSafeInteger(counts[key]) || counts[key] < 0) ||
      counts.total !== counts.committed + counts.cached_satisfied + counts.source_unavailable + counts.unresolved ||
      counts.failed + counts.retry_wait > counts.unresolved || counts.resumable > counts.unresolved) {
    return { counts: null, percent: null, label: "Post Details outcome unknown (legacy or incomplete report)" };
  }
  const status = String(progress.run_status || "").toLowerCase();
  const stopped = ["failed", "cancelled", "blocked_auth"].includes(status);
  const label = stopped ? `Post Details ${status.replaceAll("_", " ")}`
    : counts.unresolved > 0 ? (counts.retry_wait > 0 ? "Post Details waiting to retry" : "Post Details incomplete")
    : status !== "completed" ? "Post Details targets resolved; awaiting completion confirmation"
    : counts.total === 0 ? "Post Details complete: no targets"
    : counts.source_unavailable > 0 ? "Post Details completed with unavailable posts"
    : "Post Details complete";
  return { counts, percent: counts.total === 0 ? 100 : Math.floor(100 * (counts.total - counts.unresolved) / counts.total), label };
}

export type CatalogRunProgressRequestError = Error & {
  code?: string;
  retryable?: boolean;
  retryAfterMs?: number;
  isBackendSaturated?: boolean;
  upstreamStatus?: number;
};

type FetchAdminWithAuth = (
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: FetchAdminWithAuthOptions,
) => Promise<Response>;

type FetchCatalogRunProgressOptions = {
  fetchAdminWithAuth: FetchAdminWithAuth;
  platform: SocialPlatformSlug;
  handle: string;
  runId: string;
  preferredUser: User | null;
  signal?: AbortSignal;
  recentLogLimit?: number;
  fast?: boolean;
};

const BACKEND_PRESSURE_CODES = new Set([
  "BACKEND_SATURATED",
  "DATABASE_SERVICE_UNAVAILABLE",
  "BACKEND_REQUEST_TIMEOUT",
  "UPSTREAM_TIMEOUT",
]);

function hasBackendSaturationText(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.includes("max clients reached") ||
    normalized.includes("session_pool_capacity") ||
    normalized.includes("database pool") ||
    normalized.includes("backend saturated") ||
    normalized.includes("timed out")
  );
}

export function buildSocialAccountCatalogRunProgressPath(
  platform: SocialPlatformSlug,
  handle: string,
  runId: string,
  options?: { recentLogLimit?: number; fast?: boolean },
): string {
  const query = new URLSearchParams({
    recent_log_limit: String(options?.recentLogLimit ?? 25),
  });
  if (options?.fast) {
    query.set("fast", "1");
  }
  return `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(
    handle,
  )}/catalog/runs/${encodeURIComponent(runId)}/progress?${query.toString()}`;
}

export function toCatalogRunProgressProxyErrorPayload(value: unknown): CatalogRunProgressProxyErrorPayload {
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
    upstream_status:
      typeof payload.upstream_status === "number" && Number.isFinite(payload.upstream_status)
        ? payload.upstream_status
        : undefined,
    upstream_detail: payload.upstream_detail,
    upstream_detail_code:
      typeof payload.upstream_detail_code === "string" ? payload.upstream_detail_code : undefined,
  };
}

export function buildCatalogRunProgressRequestError(
  payload: CatalogRunProgressProxyErrorPayload,
  fallbackMessage: string,
): CatalogRunProgressRequestError {
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
  const message =
    (typeof payload.error === "string" && payload.error.trim()) ||
    (typeof payload.detail === "string" && payload.detail.trim()) ||
    (typeof upstreamDetail?.message === "string" && upstreamDetail.message.trim()) ||
    fallbackMessage;
  const detailMessage = [payload.error, payload.detail, upstreamDetail?.message, upstreamDetail?.error]
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .join(" ");
  const retryAfterMs =
    typeof payload.retry_after_seconds === "number" && Number.isFinite(payload.retry_after_seconds)
      ? Math.max(0, payload.retry_after_seconds * 1000)
      : undefined;
  const error = new Error(message) as CatalogRunProgressRequestError;
  error.code = typeof payload.code === "string" && payload.code.trim() ? payload.code.trim() : undefined;
  error.retryable = Boolean(payload.retryable);
  error.retryAfterMs = retryAfterMs;
  error.isBackendSaturated =
    payload.code === "BACKEND_SATURATED" ||
    upstreamReason === "session_pool_capacity" ||
    (upstreamCode === "DATABASE_SERVICE_UNAVAILABLE" && upstreamReason === "session_pool_capacity") ||
    BACKEND_PRESSURE_CODES.has(upstreamCode) ||
    hasBackendSaturationText(detailMessage);
  error.upstreamStatus = typeof payload.upstream_status === "number" ? payload.upstream_status : undefined;
  return error;
}

export async function fetchSocialAccountCatalogRunProgressSnapshot(
  options: FetchCatalogRunProgressOptions,
): Promise<SocialAccountCatalogRunProgressSnapshot> {
  const normalizedRunId = String(options.runId || "").trim();
  if (!options.preferredUser) {
    throw new Error("Missing admin user");
  }
  if (!normalizedRunId) {
    throw new Error("Missing catalog run id");
  }
  const response = await options.fetchAdminWithAuth(
    buildSocialAccountCatalogRunProgressPath(options.platform, options.handle, normalizedRunId, {
      recentLogLimit: options.recentLogLimit,
      fast: options.fast,
    }),
    { signal: options.signal },
    { preferredUser: options.preferredUser },
  );
  const data = (await response.json().catch(() => ({}))) as SocialAccountCatalogRunProgressSnapshot &
    CatalogRunProgressProxyErrorPayload;
  if (!response.ok) {
    throw buildCatalogRunProgressRequestError(
      toCatalogRunProgressProxyErrorPayload(data),
      "Failed to load catalog run progress",
    );
  }
  return data;
}
