import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  SocialProxyError,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ platform: string; handle: string }>;
};

const isDegradableCookieHealthError = (error: unknown): boolean =>
  error instanceof SocialProxyError &&
  error.status === 504 &&
  (error.code === "UPSTREAM_TIMEOUT" || error.code === "BACKEND_REQUEST_TIMEOUT");

const buildDegradedCookieHealthPayload = (platform: string, handle: string) => ({
  platform,
  account_handle: handle,
  required: true,
  healthy: false,
  reason: "cookie_health_unavailable",
  refresh_supported: true,
  refresh_available: false,
  refresh_action: platform === "instagram" ? "instagram_auth_repair" : "cookie_refresh",
  refresh_label: platform === "instagram" ? "Repair Instagram Auth" : "Refresh Cookies",
  source_kind: "unavailable",
  degraded: true,
  degraded_reason: "backend_timeout",
});

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { platform, handle } = await context.params;
    const force = request.nextUrl.searchParams.get("force") === "true";
    const includePostsAuth = request.nextUrl.searchParams.get("posts_auth") === "true";
    const includeCommentsAuth = request.nextUrl.searchParams.get("comments_auth") === "true";
    const params = new URLSearchParams();
    if (force) params.set("force", "true");
    if (includePostsAuth) params.set("posts_auth", "true");
    if (includeCommentsAuth) params.set("comments_auth", "true");
    const qs = params.size > 0 ? `?${params.toString()}` : "";
    const data = await fetchSocialBackendJson(
      `/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/cookies/health${qs}`,
      {
        method: "GET",
        fallbackError: "Failed to check cookie health",
        retries: includePostsAuth || includeCommentsAuth ? 0 : 1,
        timeoutMs: includePostsAuth || includeCommentsAuth ? 60_000 : 15_000,
      },
    );
    return NextResponse.json(data);
  } catch (error) {
    const { platform, handle } = await context.params;
    if (
      request.nextUrl.searchParams.get("posts_auth") !== "true" &&
      request.nextUrl.searchParams.get("comments_auth") !== "true" &&
      isDegradableCookieHealthError(error)
    ) {
      return NextResponse.json(buildDegradedCookieHealthPayload(platform, handle), {
        headers: { "x-trr-cookie-health-source": "backend-timeout-degraded" },
      });
    }
    return socialProxyErrorResponse(
      error,
      "[api] Failed to check cookie health",
    );
  }
}
