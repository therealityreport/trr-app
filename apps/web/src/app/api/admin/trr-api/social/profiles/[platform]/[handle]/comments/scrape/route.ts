import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";
import { invalidateAdminSnapshotFamilies } from "@/lib/server/admin/admin-snapshot-cache";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ platform: string; handle: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { platform, handle } = await context.params;
    const bodyText = await request.text();
    const queryString = request.nextUrl.searchParams.toString();
    const data = await fetchSocialBackendJson(
      `/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/comments/scrape`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyText.trim() ? bodyText : "{}",
        queryString,
        fallbackError: "Failed to start social account comments scrape",
        retries: 0,
        timeoutMs: 210_000,
      },
    );
    invalidateAdminSnapshotFamilies([{ pageFamily: "social-profile", scope: `${platform}:${handle}` }]);
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to start social account comments scrape");
  }
}
