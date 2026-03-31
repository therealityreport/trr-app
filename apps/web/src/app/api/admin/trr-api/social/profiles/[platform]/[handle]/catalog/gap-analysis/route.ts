import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  SOCIAL_PROXY_SHORT_TIMEOUT_MS,
  fetchSocialBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

const forwardAdminRequestHeaders = (request: NextRequest): HeadersInit => {
  const headers = new Headers();
  const requestId = request.headers.get("x-trr-request-id");
  const tabSessionId = request.headers.get("x-trr-tab-session-id");
  const flowKey = request.headers.get("x-trr-flow-key");
  if (requestId?.trim()) {
    headers.set("x-trr-request-id", requestId.trim());
  }
  if (tabSessionId?.trim()) {
    headers.set("x-trr-tab-session-id", tabSessionId.trim());
  }
  if (flowKey?.trim()) {
    headers.set("x-trr-flow-key", flowKey.trim());
  }
  return headers;
};

type RouteContext = {
  params: Promise<{ platform: string; handle: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { platform, handle } = await context.params;
    const data = await fetchSocialBackendJson(
      `/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/gap-analysis`,
      {
        fallbackError: "Failed to fetch social account catalog gap analysis",
        retries: 0,
        timeoutMs: SOCIAL_PROXY_SHORT_TIMEOUT_MS,
        headers: forwardAdminRequestHeaders(request),
      },
    );
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch social account catalog gap analysis");
  }
}
