import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  parseCacheTtlMs,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import { getSocialLandingPayload } from "@/lib/server/admin/social-landing-repository";

export const dynamic = "force-dynamic";

const SOCIAL_LANDING_CACHE_NAMESPACE = "admin-social-landing";
const SOCIAL_LANDING_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SOCIAL_LANDING_CACHE_TTL_MS,
  60_000,
);

export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const cacheKey = buildUserScopedRouteCacheKey(user.uid, "landing");
    const cached = getRouteResponseCache<Record<string, unknown>>(
      SOCIAL_LANDING_CACHE_NAMESPACE,
      cacheKey,
    );
    if (cached) {
      return NextResponse.json(cached, { headers: { "x-trr-cache": "hit" } });
    }

    const payload = await getOrCreateRouteResponsePromise(
      SOCIAL_LANDING_CACHE_NAMESPACE,
      cacheKey,
      async () => {
        const nextPayload = await getSocialLandingPayload();
        setRouteResponseCache(
          SOCIAL_LANDING_CACHE_NAMESPACE,
          cacheKey,
          nextPayload,
          SOCIAL_LANDING_CACHE_TTL_MS,
        );
        return nextPayload;
      },
    );
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api] Failed to load social landing payload", error);
    const message = error instanceof Error ? error.message : "Failed to load social landing payload";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
