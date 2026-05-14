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
    if (platform !== "instagram") {
      return NextResponse.json(
        { error: "Profile relationships are currently available for Instagram only." },
        { status: 400 },
      );
    }
    const data = await fetchSocialBackendJson(
      `/profiles/instagram/${encodeURIComponent(handle)}/relationships`,
      {
        queryString: request.nextUrl.searchParams.toString(),
        fallbackError: "Failed to fetch Instagram profile relationships",
        retries: 0,
        timeoutMs: 30_000,
      },
    );
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch Instagram profile relationships");
  }
}
