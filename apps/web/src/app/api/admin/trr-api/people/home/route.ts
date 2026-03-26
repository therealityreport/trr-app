import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
  buildAdminProxyErrorResponse,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import {
  TRR_PEOPLE_HOME_CACHE_NAMESPACE,
  TRR_PEOPLE_HOME_CACHE_TTL_MS,
} from "@/lib/server/trr-api/trr-show-read-route-cache";

export const dynamic = "force-dynamic";

const DEFAULT_SECTION_LIMIT = 12;
const MAX_SECTION_LIMIT = 24;
const parseLimit = (raw: string | null): number => {
  const parsed = Number.parseInt(raw ?? String(DEFAULT_SECTION_LIMIT), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_SECTION_LIMIT;
  return Math.min(Math.max(parsed, 1), MAX_SECTION_LIMIT);
};

export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const limit = parseLimit(request.nextUrl.searchParams.get("limit"));
    const cacheKey = buildUserScopedRouteCacheKey(user.uid, "people-home", request.nextUrl.searchParams);
    const cached = getRouteResponseCache<Record<string, unknown>>(TRR_PEOPLE_HOME_CACHE_NAMESPACE, cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "x-trr-cache": "hit" } });
    }

    const payload = await getOrCreateRouteResponsePromise(
      TRR_PEOPLE_HOME_CACHE_NAMESPACE,
      cacheKey,
      async () => {
        const upstream = await fetchAdminBackendJson(
          `/admin/trr-api/people/home?${new URLSearchParams({
            limit: String(limit),
          }).toString()}`,
          {
            headers: {
              "X-TRR-Admin-User-Uid": user.uid,
            },
            timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
            routeName: "people-home",
          },
        );
        if (upstream.status !== 200) {
          throw new Error(
            typeof upstream.data.error === "string"
              ? upstream.data.error
              : typeof upstream.data.detail === "string"
                ? upstream.data.detail
                : "Failed to build people home payload",
          );
        }
        setRouteResponseCache(TRR_PEOPLE_HOME_CACHE_NAMESPACE, cacheKey, upstream.data, TRR_PEOPLE_HOME_CACHE_TTL_MS);
        return upstream.data;
      },
    );

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api] Failed to build people home payload", error);
    return buildAdminProxyErrorResponse(error);
  }
}
