import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  SOCIAL_PROXY_LONG_TIMEOUT_MS,
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
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const commentsOnly = searchParams.get("comments_only") === "true";
    const data = await fetchSocialBackendJson(`/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/posts`, {
      queryString,
      fallbackError: "Failed to fetch social account profile posts",
      retries: commentsOnly ? 1 : 0,
      timeoutMs: commentsOnly ? SOCIAL_PROXY_LONG_TIMEOUT_MS : 30_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch social account profile posts");
  }
}
