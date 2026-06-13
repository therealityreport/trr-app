import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { createSocialProfileReadRoute } from "@/lib/server/trr-api/social-profile-route-factory";
import {
  fetchSocialBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ platform: string; handle: string }>;
};

const HASHTAGS_TTL_MS = 5 * 60_000;
const HASHTAGS_STALE_MS = 15 * 60_000;

export const GET = createSocialProfileReadRoute({
  endpoint: "hashtags",
  fallbackError: "Failed to fetch social account profile hashtags",
  logLabel: "[api] Failed to fetch social account profile hashtags",
  queryString: "strip-refresh",
  routeTimingHeaders: true,
  cache: {
    kind: "admin-snapshot",
    pageFamily: "social-profile",
    scope: ({ platform, handle }) => `${platform}:${handle}:hashtags`,
    cacheKeyQuery: "backend",
    ttlMs: HASHTAGS_TTL_MS,
    staleIfErrorTtlMs: HASHTAGS_STALE_MS,
  },
});

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
