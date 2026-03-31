import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  updatePersonCanonicalProfileSourceOrder,
} from "@/lib/server/trr-api/trr-shows-repository";
import {
  AdminReadProxyError,
  buildAdminProxyErrorResponse,
  fetchAdminBackendJson,
  invalidateAdminBackendCache,
} from "@/lib/server/trr-api/admin-read-proxy";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  invalidateRouteResponseCache,
  parseCacheTtlMs,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";

export const dynamic = "force-dynamic";
const PERSON_DETAIL_CACHE_NAMESPACE = "admin-person-detail";
const PERSON_DETAIL_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_PERSON_DETAIL_CACHE_TTL_MS,
  15_000,
);

interface RouteParams {
  params: Promise<{ personId: string }>;
}

/**
 * GET /api/admin/trr-api/people/[personId]
 *
 * Get person details from TRR Core API.
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

    const cacheSearchParams = new URLSearchParams(request.nextUrl.searchParams);
    const requestRoleRaw = (cacheSearchParams.get("request_role") ?? "").trim().toLowerCase();
    const requestRole =
      requestRoleRaw === "secondary" || requestRoleRaw === "polling" ? requestRoleRaw : "primary";
    cacheSearchParams.delete("request_role");
    const cacheKey = buildUserScopedRouteCacheKey(user.uid, `person:${personId}`, cacheSearchParams);
    const cachedPayload = getRouteResponseCache<Record<string, unknown>>(
      PERSON_DETAIL_CACHE_NAMESPACE,
      cacheKey,
    );
    if (cachedPayload) {
      return NextResponse.json(cachedPayload, { headers: { "x-trr-cache": "hit" } });
    }

    const payload = await getOrCreateRouteResponsePromise(
      PERSON_DETAIL_CACHE_NAMESPACE,
      cacheKey,
      async () => {
        const upstream = await fetchAdminBackendJson(`/admin/people/${personId}`, {
          routeName: "person-detail",
          requestRole,
        });
        if (upstream.status === 404) {
          throw new Error("Person not found");
        }
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
                  : "Failed to fetch person",
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
        const nextPayload = { person: upstream.data.person ?? null };
        setRouteResponseCache(
          PERSON_DETAIL_CACHE_NAMESPACE,
          cacheKey,
          nextPayload,
          PERSON_DETAIL_CACHE_TTL_MS,
        );
        return nextPayload;
      },
    );

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api] Failed to get TRR person", error);
    if (error instanceof Error && error.message === "Person not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return buildAdminProxyErrorResponse(error);
  }
}

/**
 * PATCH /api/admin/trr-api/people/[personId]
 *
 * Update person-level admin preferences.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);

    const { personId } = await params;
    if (!personId) {
      return NextResponse.json(
        { error: "personId is required" },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      canonicalProfileSourceOrder?: unknown;
    };

    if (!Array.isArray(body.canonicalProfileSourceOrder)) {
      return NextResponse.json(
        { error: "canonicalProfileSourceOrder must be an array" },
        { status: 400 }
      );
    }

    const sourceOrder = body.canonicalProfileSourceOrder
      .map((value) => (typeof value === "string" ? value.trim().toLowerCase() : ""))
      .filter((value) => value.length > 0);

    const person = await updatePersonCanonicalProfileSourceOrder(personId, sourceOrder);
    if (!person) {
      return NextResponse.json(
        { error: "Person not found" },
        { status: 404 }
      );
    }
    invalidateRouteResponseCache(PERSON_DETAIL_CACHE_NAMESPACE, `${user.uid}:person:${personId}:`);
    await invalidateAdminBackendCache(`/admin/people/${personId}/cache/invalidate`, {
      routeName: "person-detail",
    });

    return NextResponse.json({ person });
  } catch (error) {
    console.error("[api] Failed to patch TRR person", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message.startsWith("source_order_")
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
