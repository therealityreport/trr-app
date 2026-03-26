import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  setCoverPhoto,
  removeCoverPhoto,
} from "@/lib/server/admin/person-cover-photos-repository";
import {
  buildAdminProxyErrorResponse,
  fetchAdminBackendJson,
  invalidateAdminBackendCache,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
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

    const cacheKey = buildUserScopedRouteCacheKey(user.uid, `cover-photo:${personId}`, request.nextUrl.searchParams);
    const cachedPayload = getRouteResponseCache<Record<string, unknown>>(
      PERSON_COVER_PHOTO_CACHE_NAMESPACE,
      cacheKey,
    );
    if (cachedPayload) {
      return NextResponse.json(cachedPayload, { headers: { "x-trr-cache": "hit" } });
    }

    const payload = await getOrCreateRouteResponsePromise(
      PERSON_COVER_PHOTO_CACHE_NAMESPACE,
      cacheKey,
      async () => {
        const upstream = await fetchAdminBackendJson(`/admin/people/${personId}/cover-photo`, {
          timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
          routeName: "person-cover-photo",
        });
        if (upstream.status !== 200) {
          throw new Error(
            typeof upstream.data.error === "string"
              ? upstream.data.error
              : typeof upstream.data.detail === "string"
                ? upstream.data.detail
                : "Failed to get cover photo",
          );
        }
        const nextPayload = { coverPhoto: upstream.data.coverPhoto ?? null };
        setRouteResponseCache(
          PERSON_COVER_PHOTO_CACHE_NAMESPACE,
          cacheKey,
          nextPayload,
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

    const authContext = { firebaseUid: user.uid, isAdmin: true };
    const coverPhoto = await setCoverPhoto(authContext, {
      person_id: personId,
      photo_id: normalizedPhotoId,
      photo_url: normalizedPhotoUrl,
    });
    invalidateRouteResponseCache(PERSON_COVER_PHOTO_CACHE_NAMESPACE, `${user.uid}:cover-photo:${personId}`);
    await invalidateAdminBackendCache(`/admin/people/${personId}/cache/invalidate`, {
      routeName: "person-cover-photo",
    });

    return NextResponse.json({ coverPhoto });
  } catch (error) {
    console.error("[api] Failed to set cover photo", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
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

    const authContext = { firebaseUid: user.uid, isAdmin: true };
    await removeCoverPhoto(authContext, personId);
    invalidateRouteResponseCache(PERSON_COVER_PHOTO_CACHE_NAMESPACE, `${user.uid}:cover-photo:${personId}`);
    await invalidateAdminBackendCache(`/admin/people/${personId}/cache/invalidate`, {
      routeName: "person-cover-photo",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api] Failed to remove cover photo", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
