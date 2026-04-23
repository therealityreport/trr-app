import { NextRequest, NextResponse } from "next/server";
import { requireAdminContext } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  SOCIAL_PROXY_PROGRESS_TIMEOUT_MS,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ platform: string; handle: string; runId: string }>;
};

const elapsedMs = (start: number): number => Math.round(performance.now() - start);

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
    const path = `/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/runs/${encodeURIComponent(runId)}/progress${
      query ? `?${query}` : ""
    }`;
    paramsMs = elapsedMs(paramsStart);

    const upstreamStart = performance.now();
    const data = await fetchSocialBackendJson(path, {
      adminContext,
      fallbackError: "Failed to fetch social account catalog run progress",
      retries: 0,
      timeoutMs: SOCIAL_PROXY_PROGRESS_TIMEOUT_MS,
    });
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
