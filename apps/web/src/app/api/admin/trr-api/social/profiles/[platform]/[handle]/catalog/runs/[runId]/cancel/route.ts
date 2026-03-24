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

export async function POST(request: NextRequest, context: RouteContext) {
  const { platform, handle, runId } = await context.params;

  try {
    await requireAdmin(request);
    const data = await fetchSocialBackendJson(
      `/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/runs/${encodeURIComponent(runId)}/cancel`,
      {
        method: "POST",
        fallbackError: "Failed to cancel social account catalog run",
        retries: 1,
        timeoutMs: SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
      },
    );
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to cancel social account catalog run");
  }
}
