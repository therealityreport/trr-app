import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  buildAdminProxyErrorResponse,
  fetchAdminBackendJson,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
} from "@/lib/server/trr-api/admin-read-proxy";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  parseCacheTtlMs,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";

export const dynamic = "force-dynamic";
const PERSON_RESOLVE_SLUG_CACHE_NAMESPACE = "admin-person-resolve-slug";
const PERSON_RESOLVE_SLUG_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_PERSON_RESOLVE_SLUG_CACHE_TTL_MS,
  60_000,
);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/admin/trr-api/people/resolve-slug?slug=meredith-marks--7f528757&showId=the-real-housewives-of-salt-lake-city
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug")?.trim() ?? "";
    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    const showInput = searchParams.get("showId")?.trim() ?? "";
    const cacheKey = buildUserScopedRouteCacheKey(user.uid, "resolve-person-slug", searchParams);
    const cachedPayload = getRouteResponseCache<Record<string, unknown>>(
      PERSON_RESOLVE_SLUG_CACHE_NAMESPACE,
      cacheKey,
    );
    if (cachedPayload) {
      return NextResponse.json(cachedPayload, { headers: { "x-trr-cache": "hit" } });
    }

    const payload = await getOrCreateRouteResponsePromise(
      PERSON_RESOLVE_SLUG_CACHE_NAMESPACE,
      cacheKey,
      async () => {
        const backendParams = new URLSearchParams({ slug });
        if (showInput) {
          if (UUID_RE.test(showInput)) {
            backendParams.set("show_id", showInput);
          } else {
            backendParams.set("show_slug", showInput);
          }
        }
        const upstream = await fetchAdminBackendJson(
          `/admin/people/resolve-slug?${backendParams.toString()}`,
          {
            timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
            routeName: "person-resolve-slug",
          },
        );
        if (upstream.status === 404) {
          throw new Error(
            typeof upstream.data.detail === "string" ? upstream.data.detail : "person slug not found",
          );
        }
        if (upstream.status !== 200) {
          throw new Error(
            typeof upstream.data.error === "string"
              ? upstream.data.error
              : typeof upstream.data.detail === "string"
                ? upstream.data.detail
                : "Failed to resolve person slug",
          );
        }
        const nextPayload = {
          resolved: upstream.data.resolved ?? null,
          show_id:
            typeof upstream.data.show_id === "string" ? upstream.data.show_id : null,
        };
        setRouteResponseCache(
          PERSON_RESOLVE_SLUG_CACHE_NAMESPACE,
          cacheKey,
          nextPayload,
          PERSON_RESOLVE_SLUG_CACHE_TTL_MS,
        );
        return nextPayload;
      },
    );

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api] Failed to resolve person slug", error);
    if (error instanceof Error && error.message === "person slug not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return buildAdminProxyErrorResponse(error);
  }
}
