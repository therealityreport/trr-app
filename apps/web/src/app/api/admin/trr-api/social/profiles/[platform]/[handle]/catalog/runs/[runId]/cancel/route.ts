import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
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
        retries: 0,
        timeoutMs: 30_000,
      },
    );
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to cancel social account catalog run");
  }
}
