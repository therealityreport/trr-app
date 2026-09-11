import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { fetchSocialBackendJson, socialProxyErrorResponse } from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: {
  params: Promise<{ platform: string; handle: string }>;
}) {
  try {
    await requireAdmin(request);
    const { platform, handle } = await context.params;
    const data = await fetchSocialBackendJson(
      `/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/retry-targets`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: await request.text(),
        fallbackError: "Failed to resume Post Details", retries: 0, timeoutMs: 210_000 },
    );
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to resume Post Details");
  }
}
