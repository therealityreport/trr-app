import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ platform: string; handle: string; runId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { platform, handle, runId } = await context.params;
    const query = request.nextUrl.searchParams.toString();
    const path = `/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/runs/${encodeURIComponent(runId)}/progress${
      query ? `?${query}` : ""
    }`;
    const data = await fetchSocialBackendJson(path, {
      fallbackError: "Failed to fetch social account catalog run progress",
      retries: 1,
      timeoutMs: SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
    });
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch social account catalog run progress");
  }
}
