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
    const query = request.nextUrl.search || "";
    const data = await fetchSocialBackendJson(
      `/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/hashtags${query}`,
      {
        fallbackError: "Failed to fetch social account profile hashtags",
        retries: 0,
        timeoutMs: 30_000,
      },
    );
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch social account profile hashtags");
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { platform, handle } = await context.params;
    const body = await request.text();
    const data = await fetchSocialBackendJson(`/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/hashtags`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
      fallbackError: "Failed to update social account profile hashtags",
      retries: 0,
      timeoutMs: 45_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to update social account profile hashtags");
  }
}
