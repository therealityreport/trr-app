import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { invalidateSocialLandingRouteCacheForUser } from "@/lib/server/admin/social-landing-route-cache";
import {
  fetchSocialBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const body = await request.text();
    const data = await fetchSocialBackendJson("/shared/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      fallbackError: "Failed to run shared social ingest",
      retries: 0,
      timeoutMs: 210_000,
    });
    invalidateSocialLandingRouteCacheForUser(user.uid);
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to run shared social ingest");
  }
}
