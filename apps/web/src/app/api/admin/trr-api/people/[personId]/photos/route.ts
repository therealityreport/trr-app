import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  buildEntityScopedRouteCacheNamespace,
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  getRouteResponseCacheGeneration,
  parseCacheTtlMs,
  setRouteResponseCacheIfGeneration,
} from "@/lib/server/admin/route-response-cache";
import {
  AdminReadProxyError,
  buildAdminProxyErrorResponse,
  fetchAdminBackendJson,
  ADMIN_READ_PROXY_GALLERY_TIMEOUT_MS,
} from "@/lib/server/trr-api/admin-read-proxy";
import { parseBoundedIntegerParam } from "@/lib/server/trr-api/query-integer-params";

export const dynamic = "force-dynamic";
const PERSON_PHOTOS_CACHE_NAMESPACE = "admin-person-photos";
const PERSON_PHOTOS_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_PERSON_PHOTOS_CACHE_TTL_MS,
  5_000,
);

interface RouteParams {
  params: Promise<{ personId: string }>;
}

/**
 * GET /api/admin/trr-api/people/[personId]/photos
 *
 * Get all photos for a person from TRR Core API.
 * Only returns photos with hosted_url populated from the canonical hosted-media store.
 *
 * Query params:
 * - limit: max results (default 100, max 500)
 * - offset: pagination offset (default 0)
 * - sources: comma-separated sources to include (optional)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);

    const { personId } = await params;

    if (!personId) {
      return NextResponse.json(
        { error: "personId is required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limitResult = parseBoundedIntegerParam(searchParams.get("limit"), {
      name: "limit",
      defaultValue: 100,
      min: 1,
      max: 500,
    });
    if (!limitResult.ok) {
      return NextResponse.json({ error: limitResult.error }, { status: 400 });
    }
    const offsetResult = parseBoundedIntegerParam(searchParams.get("offset"), {
      name: "offset",
      defaultValue: 0,
      min: 0,
    });
    if (!offsetResult.ok) {
      return NextResponse.json({ error: offsetResult.error }, { status: 400 });
    }
    const limit = limitResult.value;
    const offset = offsetResult.value;
    const sources = (searchParams.get("sources") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const includeBrokenRaw = (searchParams.get("include_broken") ?? "").trim().toLowerCase();
    const includeBroken = includeBrokenRaw === "1" || includeBrokenRaw === "true";
    const includeTotalCountRaw = (searchParams.get("include_total_count") ?? "").trim().toLowerCase();
    const includeTotalCount = !(includeTotalCountRaw === "0" || includeTotalCountRaw === "false");
    const requestRoleRaw = (searchParams.get("request_role") ?? "").trim().toLowerCase();
    const requestRole =
      requestRoleRaw === "primary" || requestRoleRaw === "polling" ? requestRoleRaw : "secondary";

    const backendParams = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    if (sources.length > 0) {
      backendParams.set("sources", sources.join(","));
    }
    if (includeBroken) {
      backendParams.set("include_broken", "true");
    }
    if (!includeTotalCount) {
      backendParams.set("include_total_count", "false");
    }
    const cacheNamespace = buildEntityScopedRouteCacheNamespace(
      PERSON_PHOTOS_CACHE_NAMESPACE,
      personId,
    );
    const cacheKey = buildUserScopedRouteCacheKey(
      user.uid,
      "photos",
      backendParams,
    );
    const cacheGeneration = getRouteResponseCacheGeneration(cacheNamespace);
    const cachedPayload = getRouteResponseCache<{
      photos: Array<Record<string, unknown>>;
      pagination: {
        limit: number;
        offset: number;
        count: number;
        total_count: number | null;
        total_count_status?: string;
        next_offset: number;
        has_more: boolean;
      };
    }>(cacheNamespace, cacheKey);
    if (cachedPayload) {
      return NextResponse.json(cachedPayload, { headers: { "x-trr-cache": "hit" } });
    }

    const payload = await getOrCreateRouteResponsePromise(
      cacheNamespace,
      cacheKey,
      async () => {
        const upstream = await fetchAdminBackendJson(
          `/admin/people/${personId}/gallery?${backendParams.toString()}`,
          {
            timeoutMs: ADMIN_READ_PROXY_GALLERY_TIMEOUT_MS,
            routeName: "person-gallery",
            requestRole,
          },
        );
        if (upstream.status !== 200) {
          const detail =
            upstream.data.detail && typeof upstream.data.detail === "object"
              ? (upstream.data.detail as Record<string, unknown>)
              : {};
          throw new AdminReadProxyError(
            typeof upstream.data.error === "string"
              ? upstream.data.error
              : typeof upstream.data.detail === "string"
                ? upstream.data.detail
                : typeof detail.message === "string"
                  ? detail.message
                  : "Failed to fetch photos",
            upstream.status,
            {
              code:
                (typeof upstream.data.code === "string" && upstream.data.code) ||
                (typeof detail.code === "string" && detail.code) ||
                undefined,
              retryable:
                typeof upstream.data.retryable === "boolean"
                  ? upstream.data.retryable
                  : typeof detail.retryable === "boolean"
                    ? Boolean(detail.retryable)
                    : upstream.status === 429 || upstream.status === 502 || upstream.status === 503 || upstream.status === 504,
              detail,
            },
          );
        }
        const pagePhotos = Array.isArray(upstream.data.photos)
          ? (upstream.data.photos as Array<Record<string, unknown>>)
          : [];
        const upstreamPagination =
          upstream.data.pagination && typeof upstream.data.pagination === "object"
            ? (upstream.data.pagination as Record<string, unknown>)
            : {};
        const nextPayload = {
          photos: pagePhotos,
          pagination: {
            limit,
            offset,
            count: pagePhotos.length,
            total_count:
              typeof upstreamPagination.total_count === "number" ? upstreamPagination.total_count : null,
            total_count_status:
              typeof upstreamPagination.total_count_status === "string"
                ? upstreamPagination.total_count_status
                : typeof upstreamPagination.total_count === "number"
                  ? "exact"
                  : "deferred",
            next_offset:
              typeof upstreamPagination.next_offset === "number"
                ? upstreamPagination.next_offset
                : offset + pagePhotos.length,
            has_more: upstreamPagination.has_more === true,
          },
        };
        setRouteResponseCacheIfGeneration(
          cacheNamespace,
          cacheKey,
          nextPayload,
          cacheGeneration,
          PERSON_PHOTOS_CACHE_TTL_MS,
        );
        return nextPayload;
      },
    );

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api] Failed to get TRR person photos", error);
    return buildAdminProxyErrorResponse(error);
  }
}
