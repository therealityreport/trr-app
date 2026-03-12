import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const queryString = request.nextUrl.searchParams.toString();
    const data = await fetchSocialBackendJson("/shared/sources", {
      queryString,
      fallbackError: "Failed to fetch shared social account sources",
      retries: 0,
      timeoutMs: 30_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch shared social account sources");
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.text();
    const data = await fetchSocialBackendJson("/shared/sources", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
      fallbackError: "Failed to update shared social account sources",
      retries: 0,
      timeoutMs: 45_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to update shared social account sources");
  }
}
