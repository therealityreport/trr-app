import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, toVerifiedAdminContext } from "@/lib/server/auth";
import {
  getCoverPhoto,
  setCoverPhoto,
  removeCoverPhoto,
} from "@/lib/server/admin/person-cover-photos-repository";
import {
  buildAdminProxyErrorResponse,
  invalidateAdminBackendCache,
} from "@/lib/server/trr-api/admin-read-proxy";
import {
  buildEntityScopedRouteCacheNamespace,
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  getRouteResponseCacheGeneration,
  invalidateRouteResponseCache,
  parseCacheTtlMs,
  setRouteResponseCacheIfGeneration,
} from "@/lib/server/admin/route-response-cache";

export const dynamic = "force-dynamic";
const PERSON_COVER_PHOTO_CACHE_NAMESPACE = "admin-person-cover-photo";
const PERSON_COVER_PHOTO_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_PERSON_COVER_PHOTO_CACHE_TTL_MS,
  30_000,
);

interface RouteParams {
  params: Promise<{ personId: string }>;
}

const isValidHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * GET /api/admin/trr-api/people/[personId]/cover-photo
 *
 * Get the cover photo for a person.
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

    const cacheNamespace = buildEntityScopedRouteCacheNamespace(
      PERSON_COVER_PHOTO_CACHE_NAMESPACE,
      personId,
    );
    const cacheKey = buildUserScopedRouteCacheKey(user.uid, "cover-photo", request.nextUrl.searchParams);
    const cacheGeneration = getRouteResponseCacheGeneration(cacheNamespace);
    const cachedPayload = getRouteResponseCache<Record<string, unknown>>(
      cacheNamespace,
      cacheKey,
    );
    if (cachedPayload) {
      return NextResponse.json(cachedPayload, { headers: { "x-trr-cache": "hit" } });
    }

    const payload = await getOrCreateRouteResponsePromise(
      cacheNamespace,
      cacheKey,
      async () => {
        const coverPhoto = await getCoverPhoto(personId, {
          adminContext: toVerifiedAdminContext(user),
        });
        const nextPayload = { coverPhoto };
        setRouteResponseCacheIfGeneration(
          cacheNamespace,
          cacheKey,
          nextPayload,
          cacheGeneration,
          PERSON_COVER_PHOTO_CACHE_TTL_MS,
        );
        return nextPayload;
      },
    );

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api] Failed to get cover photo", error);
    return buildAdminProxyErrorResponse(error);
  }
}

/**
 * PUT /api/admin/trr-api/people/[personId]/cover-photo
 *
 * Set the cover photo for a person.
 * Body: { photo_id: string, photo_url: string }
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);

    const { personId } = await params;

    if (!personId) {
      return NextResponse.json(
        { error: "personId is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const isObjectBody = body && typeof body === "object";
    const photo_id = isObjectBody ? (body as { photo_id?: unknown }).photo_id : null;
    const photo_url = isObjectBody ? (body as { photo_url?: unknown }).photo_url : null;
    const normalizedPhotoId =
      typeof photo_id === "string" && photo_id.trim().length > 0 ? photo_id.trim() : null;
    const normalizedPhotoUrl =
      typeof photo_url === "string" && photo_url.trim().length > 0 ? photo_url.trim() : null;

    if (!normalizedPhotoId || !normalizedPhotoUrl) {
      return NextResponse.json(
        { error: "photo_id and photo_url are required" },
        { status: 400 }
      );
    }
    if (!isValidHttpUrl(normalizedPhotoUrl)) {
      return NextResponse.json(
        { error: "photo_url must be a valid http(s) URL" },
        { status: 400 }
      );
    }

    const adminContext = toVerifiedAdminContext(user);
    const coverPhoto = await setCoverPhoto(adminContext, {
      person_id: personId,
      photo_id: normalizedPhotoId,
      photo_url: normalizedPhotoUrl,
    });
    invalidateRouteResponseCache(
      buildEntityScopedRouteCacheNamespace(PERSON_COVER_PHOTO_CACHE_NAMESPACE, personId),
    );
    await invalidateAdminBackendCache(`/admin/people/${personId}/cache/invalidate`, {
      routeName: "person-cover-photo",
    });

    return NextResponse.json({ coverPhoto });
  } catch (error) {
    console.error("[api] Failed to set cover photo", error);
    return buildAdminProxyErrorResponse(error);
  }
}

/**
 * DELETE /api/admin/trr-api/people/[personId]/cover-photo
 *
 * Remove the cover photo for a person (revert to default).
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);

    const { personId } = await params;

    if (!personId) {
      return NextResponse.json(
        { error: "personId is required" },
        { status: 400 }
      );
    }

    await removeCoverPhoto(toVerifiedAdminContext(user), personId);
    invalidateRouteResponseCache(
      buildEntityScopedRouteCacheNamespace(PERSON_COVER_PHOTO_CACHE_NAMESPACE, personId),
    );
    await invalidateAdminBackendCache(`/admin/people/${personId}/cache/invalidate`, {
      routeName: "person-cover-photo",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api] Failed to remove cover photo", error);
    return buildAdminProxyErrorResponse(error);
  }
}
