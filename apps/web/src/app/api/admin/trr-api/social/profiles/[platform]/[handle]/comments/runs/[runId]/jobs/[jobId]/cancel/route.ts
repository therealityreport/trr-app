import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ platform: string; handle: string; runId: string; jobId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { platform, handle, runId, jobId } = await context.params;

  try {
    await requireAdmin(request);
    const data = await fetchSocialBackendJson(
      `/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/comments/runs/${encodeURIComponent(runId)}/jobs/${encodeURIComponent(jobId)}/cancel`,
      {
        method: "POST",
        fallbackError: "Failed to cancel social account comments job",
        retries: 0,
        timeoutMs: SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
      },
    );
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to cancel social account comments job");
  }
}
