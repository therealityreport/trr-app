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
  TRR_SHOW_RESOLVE_SLUG_CACHE_NAMESPACE,
  TRR_SHOW_RESOLVE_SLUG_CACHE_TTL_MS,
} from "@/lib/server/trr-api/trr-show-read-route-cache";
import { resolveShowSlug } from "@/lib/server/trr-api/trr-shows-repository";

export const dynamic = "force-dynamic";
const SHOW_RESOLVE_SLUG_TIMEOUT_MS = Math.max(15_000, ADMIN_READ_PROXY_SHORT_TIMEOUT_MS);

/**
 * GET /api/admin/trr-api/shows/resolve-slug?slug=the-valley-persian-style
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug")?.trim() ?? "";
    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    const cacheKey = buildUserScopedRouteCacheKey(user.uid, "resolve-show-slug", searchParams);
    const cached = getRouteResponseCache<Record<string, unknown>>(
      TRR_SHOW_RESOLVE_SLUG_CACHE_NAMESPACE,
      cacheKey,
    );
    if (cached) {
      return NextResponse.json(cached, { headers: { "x-trr-cache": "hit" } });
    }

    const payload = await getOrCreateRouteResponsePromise(
      TRR_SHOW_RESOLVE_SLUG_CACHE_NAMESPACE,
      cacheKey,
      async () => {
        const localResolved = await resolveShowSlug(slug);
        if (localResolved) {
          const nextPayload = { resolved: localResolved };
          setRouteResponseCache(
            TRR_SHOW_RESOLVE_SLUG_CACHE_NAMESPACE,
            cacheKey,
            nextPayload,
            TRR_SHOW_RESOLVE_SLUG_CACHE_TTL_MS,
          );
          return nextPayload;
        }

        const upstream = await fetchAdminBackendJson(
          `/admin/trr-api/shows/resolve-slug?${new URLSearchParams({ slug }).toString()}`,
          {
            timeoutMs: SHOW_RESOLVE_SLUG_TIMEOUT_MS,
            routeName: "show-resolve-slug",
          },
        );
        if (upstream.status === 404) {
          throw new Error("show slug not found");
        }
        if (upstream.status != 200) {
          throw new Error(
            typeof upstream.data.error === "string"
              ? upstream.data.error
              : typeof upstream.data.detail === "string"
                ? upstream.data.detail
                : "Failed to resolve show slug",
          );
        }
        const nextPayload = { resolved: upstream.data.resolved ?? null };
        setRouteResponseCache(
          TRR_SHOW_RESOLVE_SLUG_CACHE_NAMESPACE,
          cacheKey,
          nextPayload,
          TRR_SHOW_RESOLVE_SLUG_CACHE_TTL_MS,
        );
        return nextPayload;
      },
    );

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api] Failed to resolve show slug", error);
    if (error instanceof Error && error.message === "show slug not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return buildAdminProxyErrorResponse(error);
  }
}
