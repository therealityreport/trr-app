import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  SOCIAL_PROXY_SHORT_TIMEOUT_MS,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ workerId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { workerId } = await params;
    const normalizedWorkerId = decodeURIComponent(String(workerId || "")).trim();
    if (!normalizedWorkerId) {
      return NextResponse.json(
        { error: "workerId is required", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }
    const data = await fetchSocialBackendJson(
      `/ingest/workers/${encodeURIComponent(normalizedWorkerId)}/detail`,
      {
        fallbackError: "Failed to fetch worker detail",
        retries: 0,
        timeoutMs: SOCIAL_PROXY_SHORT_TIMEOUT_MS,
      },
    );
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch social ingest worker detail");
  }
}
