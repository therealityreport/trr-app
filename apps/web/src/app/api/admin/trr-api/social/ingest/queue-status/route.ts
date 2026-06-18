import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";
import { attachAdminRouteTiming } from "@/lib/server/admin/admin-route-timing";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const routeStartedAt = performance.now();
  try {
    await requireAdmin(request);
    const forwardedSearchParams = new URLSearchParams(request.nextUrl.searchParams.toString());

    const data = await fetchSocialBackendJson("/ingest/queue-status", {
      queryString: forwardedSearchParams.toString(),
      fallbackError: "Failed to fetch queue status",
      retries: 0,
      timeoutMs: SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
    });
    return attachAdminRouteTiming(NextResponse.json(data), {
      routeFamily: "admin-social-profile",
      routeName: "GET /api/admin/trr-api/social/ingest/queue-status",
      cacheStatus: "miss",
      startedAt: routeStartedAt,
    });
  } catch (error) {
    return attachAdminRouteTiming(
      socialProxyErrorResponse(error, "[api] Failed to fetch queue status"),
      {
        routeFamily: "admin-social-profile",
        routeName: "GET /api/admin/trr-api/social/ingest/queue-status",
        cacheStatus: "error",
        startedAt: routeStartedAt,
      },
    );
  }
}
