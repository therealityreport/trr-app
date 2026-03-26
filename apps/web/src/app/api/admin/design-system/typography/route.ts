import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getTypographyState } from "@/lib/server/admin/typography-repository";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import {
  TYPOGRAPHY_ADMIN_CACHE_NAMESPACE,
  TYPOGRAPHY_ADMIN_CACHE_TTL_MS,
} from "@/lib/server/admin/typography-route-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const cacheKey = buildUserScopedRouteCacheKey(user?.uid ?? "admin", "typography");
    const cached = getRouteResponseCache<Record<string, unknown>>(TYPOGRAPHY_ADMIN_CACHE_NAMESPACE, cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "x-trr-cache": "hit" } });
    }

    const payload = await getOrCreateRouteResponsePromise(
      TYPOGRAPHY_ADMIN_CACHE_NAMESPACE,
      cacheKey,
      async () => {
        const state = await getTypographyState();
        setRouteResponseCache(TYPOGRAPHY_ADMIN_CACHE_NAMESPACE, cacheKey, state, TYPOGRAPHY_ADMIN_CACHE_TTL_MS);
        return state;
      },
    );

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api] Failed to load typography state", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
