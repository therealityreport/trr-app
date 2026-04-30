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
    try {
      data = await getOrCreateRouteResponsePromise(PROGRESS_CACHE_NAMESPACE, cacheKey, () =>
        fetchSocialBackendJson(path, {
          adminContext,
          fallbackError: "Failed to fetch social account catalog run progress",
          retries: 0,
          timeoutMs: SOCIAL_PROXY_PROGRESS_TIMEOUT_MS,
        }),
      );
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
        data = stale;
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
      timeout_ms: SOCIAL_PROXY_PROGRESS_TIMEOUT_MS,
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
      timeout_ms: SOCIAL_PROXY_PROGRESS_TIMEOUT_MS,
      retries: 0,
      failed: true,
    });
    return socialProxyErrorResponse(error, "[api] Failed to fetch social account catalog run progress");
  }
}
