import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const forwardedSearchParams = new URLSearchParams(request.nextUrl.searchParams.toString());

    const data = await fetchSocialBackendJson("/ingest/queue-status", {
      queryString: forwardedSearchParams.toString(),
      fallbackError: "Failed to fetch queue status",
      retries: 0,
      timeoutMs: SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
    });
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch queue status");
  }
}
