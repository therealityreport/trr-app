import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ itemId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { itemId } = await params;
    const body = await request.text();
    const data = await fetchSocialBackendJson(`/shared/review-queue/${itemId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      fallbackError: "Failed to resolve shared social review item",
      retries: 0,
      timeoutMs: 45_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to resolve shared social review item");
  }
}
