import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ platform: string; handle: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { platform, handle } = await context.params;
    const force = request.nextUrl.searchParams.get("force") === "true";
    const includePostsAuth = request.nextUrl.searchParams.get("posts_auth") === "true";
    const params = new URLSearchParams();
    if (force) params.set("force", "true");
    if (includePostsAuth) params.set("posts_auth", "true");
    const qs = params.size > 0 ? `?${params.toString()}` : "";
    const data = await fetchSocialBackendJson(
      `/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/cookies/health${qs}`,
      {
        method: "GET",
        fallbackError: "Failed to check cookie health",
        retries: includePostsAuth ? 0 : 1,
        timeoutMs: includePostsAuth ? 60_000 : 15_000,
      },
    );
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(
      error,
      "[api] Failed to check cookie health",
    );
  }
}
