import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const data = await fetchSocialBackendJson("/ingest/reset-health", {
      method: "POST",
      body: JSON.stringify({}),
      headers: {
        "content-type": "application/json",
      },
      fallbackError: "Failed to reset social ingest health",
      retries: 1,
      timeoutMs: SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
    });

    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to reset social ingest health");
  }
}
