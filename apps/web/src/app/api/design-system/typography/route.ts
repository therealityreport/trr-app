import { NextResponse } from "next/server";
import { getTypographyState } from "@/lib/server/admin/typography-repository";
import {
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import {
  TYPOGRAPHY_PUBLIC_CACHE_NAMESPACE,
  TYPOGRAPHY_PUBLIC_CACHE_TTL_MS,
} from "@/lib/server/admin/typography-route-cache";

export const dynamic = "force-dynamic";
const TYPOGRAPHY_CACHE_KEY = "state";

export async function GET() {
  try {
    const cached = getRouteResponseCache<Record<string, unknown>>(
      TYPOGRAPHY_PUBLIC_CACHE_NAMESPACE,
      TYPOGRAPHY_CACHE_KEY,
    );
    if (cached) {
      return NextResponse.json(cached, { headers: { "x-trr-cache": "hit" } });
    }

    const payload = await getOrCreateRouteResponsePromise(
      TYPOGRAPHY_PUBLIC_CACHE_NAMESPACE,
      TYPOGRAPHY_CACHE_KEY,
      async () => {
        const state = await getTypographyState();
        setRouteResponseCache(TYPOGRAPHY_PUBLIC_CACHE_NAMESPACE, TYPOGRAPHY_CACHE_KEY, state, TYPOGRAPHY_PUBLIC_CACHE_TTL_MS);
        return state;
      },
    );

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api] Failed to load public typography state", error);
    const message = error instanceof Error ? error.message : "failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
