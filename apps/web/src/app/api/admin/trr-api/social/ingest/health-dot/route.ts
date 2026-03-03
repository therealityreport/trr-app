import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  SOCIAL_PROXY_SHORT_TIMEOUT_MS,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const data = await fetchSocialBackendJson("/ingest/health-dot", {
      fallbackError: "Failed to fetch ingest health indicator",
      retries: 1,
      timeoutMs: SOCIAL_PROXY_SHORT_TIMEOUT_MS,
    });
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch ingest health indicator");
  }
}
