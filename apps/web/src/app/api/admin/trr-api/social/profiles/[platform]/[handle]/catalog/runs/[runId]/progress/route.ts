import { NextRequest, NextResponse } from "next/server";
import { requireAdminContext } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  SOCIAL_PROXY_PROGRESS_TIMEOUT_MS,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  getStaleRouteResponseCache,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ platform: string; handle: string; runId: string }>;
};

const elapsedMs = (start: number): number => Math.round(performance.now() - start);
const PROGRESS_CACHE_NAMESPACE = "social-account-catalog-run-progress";
const PROGRESS_CACHE_TTL_MS = 5_000;
const PROGRESS_CACHE_STALE_MS = 60_000;
const FAST_PROGRESS_TIMEOUT_MS = 12_000;

const markProgressDegraded = (value: unknown, reason: string): unknown => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const statusOverride =
    reason === "stale_if_error"
      ? {
          run_status: "unknown",
          run_state: "degraded",
          status: "unknown",
        }
      : {};
  return {
    ...(value as Record<string, unknown>),
    ...statusOverride,
    progress_degraded: true,
    progress_degraded_reason: reason,
    progress_degraded_at: new Date().toISOString(),
    progress_authoritative: false,
  };
};

const buildDegradedProgressPayload = (runId: string, reason: string): Record<string, unknown> => ({
  run_id: runId,
  run_status: "unknown",
  run_state: "degraded",
  status: "unknown",
  stages: {},
  summary: {},
  recent_log: [],
  progress_degraded: true,
  progress_degraded_reason: reason,
  progress_degraded_at: new Date().toISOString(),
  progress_authoritative: false,
});

const isFastProgressRequest = (request: NextRequest): boolean => {
  const fast = request.nextUrl.searchParams.get("fast");
  return fast === "true" || fast === "1";
};

export async function GET(request: NextRequest, context: RouteContext) {
  const totalStart = performance.now();
  let platform = "unknown";
  let handle = "unknown";
  let runId = "unknown";
  let authMs = 0;
  let paramsMs = 0;
  let upstreamMs = 0;
  let responseMs = 0;

  try {
    const authStart = performance.now();
    const adminContext = await requireAdminContext(request);
    authMs = elapsedMs(authStart);

    const paramsStart = performance.now();
    ({ platform, handle, runId } = await context.params);
    const query = request.nextUrl.searchParams.toString();
    const cacheKey = buildUserScopedRouteCacheKey(
      adminContext.uid,
      `${platform}:${handle}:${runId}`,
      request.nextUrl.searchParams,
    );
    const cached = getRouteResponseCache(PROGRESS_CACHE_NAMESPACE, cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }
    const path = `/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/runs/${encodeURIComponent(runId)}/progress${
      query ? `?${query}` : ""
    }`;
    paramsMs = elapsedMs(paramsStart);

    const upstreamStart = performance.now();
    let data: unknown;
    const isFastPoll = isFastProgressRequest(request);
    const timeoutMs = isFastPoll ? FAST_PROGRESS_TIMEOUT_MS : SOCIAL_PROXY_PROGRESS_TIMEOUT_MS;
    try {
      const fetchProgress = () =>
        fetchSocialBackendJson(path, {
          adminContext,
          fallbackError: "Failed to fetch social account catalog run progress",
          retries: 0,
          timeoutMs,
        });
      data = await getOrCreateRouteResponsePromise(PROGRESS_CACHE_NAMESPACE, cacheKey, fetchProgress);
      setRouteResponseCache(
        PROGRESS_CACHE_NAMESPACE,
        cacheKey,
        data,
        PROGRESS_CACHE_TTL_MS,
        PROGRESS_CACHE_STALE_MS,
      );
    } catch (error) {
      const stale = getStaleRouteResponseCache(PROGRESS_CACHE_NAMESPACE, cacheKey);
      if (stale) {
        data = markProgressDegraded(stale, "stale_if_error");
      } else if (isFastPoll) {
        data = buildDegradedProgressPayload(runId, "fast_progress_timeout");
      } else {
        throw error;
      }
    }
    upstreamMs = elapsedMs(upstreamStart);

    const responseStart = performance.now();
    const response = NextResponse.json(data);
    responseMs = elapsedMs(responseStart);

    console.info("[api] Social account catalog run progress timing", {
      platform,
      handle,
      run_id: runId,
      auth_ms: authMs,
      params_ms: paramsMs,
      upstream_ms: upstreamMs,
      response_ms: responseMs,
      total_ms: elapsedMs(totalStart),
      timeout_ms: timeoutMs,
      retries: 0,
    });

    return response;
  } catch (error) {
    console.info("[api] Social account catalog run progress timing", {
      platform,
      handle,
      run_id: runId,
      auth_ms: authMs,
      params_ms: paramsMs,
      upstream_ms: upstreamMs,
      response_ms: responseMs,
      total_ms: elapsedMs(totalStart),
      timeout_ms: isFastProgressRequest(request) ? FAST_PROGRESS_TIMEOUT_MS : SOCIAL_PROXY_PROGRESS_TIMEOUT_MS,
      retries: 0,
      failed: true,
    });
    return socialProxyErrorResponse(error, "[api] Failed to fetch social account catalog run progress");
  }
}
