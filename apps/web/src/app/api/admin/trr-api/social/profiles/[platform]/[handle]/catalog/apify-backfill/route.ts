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

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { platform, handle } = await context.params;
    const body = await request.text();
    const data = await fetchSocialBackendJson(
      `/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/apify-backfill`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        fallbackError: "Failed to start Apify backfill",
        retries: 0,
        timeoutMs: 300_000, // 5 min — Apify runs can take a while
      },
    );
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to start Apify backfill");
  }
}
