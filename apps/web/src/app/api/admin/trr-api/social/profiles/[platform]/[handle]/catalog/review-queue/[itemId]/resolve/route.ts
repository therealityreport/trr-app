import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ platform: string; handle: string; itemId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { platform, handle, itemId } = await context.params;
    const body = await request.text();
    const data = await fetchSocialBackendJson(
      `/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/review-queue/${encodeURIComponent(itemId)}/resolve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        fallbackError: "Failed to resolve social account catalog review queue item",
        retries: 0,
        timeoutMs: 45_000,
      },
    );
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to resolve social account catalog review queue item");
  }
}
