import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { resolveAdminShowId } from "@/lib/server/admin/resolve-show-id";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import {
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
  buildAdminProxyErrorResponse,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";
import {
  TRR_SHOW_CREDITS_CACHE_NAMESPACE,
  TRR_SHOW_CREDITS_CACHE_TTL_MS,
} from "@/lib/server/trr-api/trr-show-read-route-cache";

export const dynamic = "force-dynamic";

const SHOW_CREDITS_TIMEOUT_MS = Math.max(15_000, ADMIN_READ_PROXY_SHORT_TIMEOUT_MS);

interface RouteParams {
  params: Promise<{ showId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);

    const { showId: rawShowId } = await params;
    const showId = await resolveAdminShowId(rawShowId);

    if (!showId) {
      return NextResponse.json({ error: `Show not found for "${rawShowId}".` }, { status: 404 });
    }

    const cacheKey = buildUserScopedRouteCacheKey(user.uid, `${showId}:credits`);
    const cached = getRouteResponseCache<Record<string, unknown>>(TRR_SHOW_CREDITS_CACHE_NAMESPACE, cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "x-trr-cache": "hit" } });
    }

    const payload = await getOrCreateRouteResponsePromise(
      TRR_SHOW_CREDITS_CACHE_NAMESPACE,
      cacheKey,
      async () => {
        const upstream = await fetchAdminBackendJson(`/admin/trr-api/shows/${showId}/credits`, {
          timeoutMs: SHOW_CREDITS_TIMEOUT_MS,
          routeName: "show-credits",
        });
        if (upstream.status !== 200) {
          throw new Error(
            typeof upstream.data.error === "string"
              ? upstream.data.error
              : typeof upstream.data.detail === "string"
                ? upstream.data.detail
                : "Failed to get show credits",
          );
        }
        setRouteResponseCache(TRR_SHOW_CREDITS_CACHE_NAMESPACE, cacheKey, upstream.data, TRR_SHOW_CREDITS_CACHE_TTL_MS);
        return upstream.data;
      },
    );

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api] Failed to get show credits", error);
    return buildAdminProxyErrorResponse(error);
  }
}
