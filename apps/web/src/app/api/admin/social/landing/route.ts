import { NextRequest, NextResponse } from "next/server";
import {
  listPersonExternalIds,
  getShowById,
  syncPersonExternalIds,
  updateShowById,
} from "@/lib/server/trr-api/trr-shows-repository";
import { requireAdmin, toVerifiedAdminContext } from "@/lib/server/auth";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  invalidateRouteResponseCache,
  parseCacheTtlMs,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import {
  SOCIAL_LANDING_CACHE_NAMESPACE,
  invalidateSocialLandingRouteCacheForUser,
} from "@/lib/server/admin/social-landing-route-cache";
import { getSocialLandingPayloadResult } from "@/lib/server/admin/social-landing-repository";
import { normalizePersonExternalIdValue, type PersonExternalIdInput } from "@/lib/admin/person-external-ids";
import { normalizeSocialAccountProfileHandle } from "@/lib/admin/show-admin-routes";
import { fetchSocialBackendJson } from "@/lib/server/trr-api/social-admin-proxy";
import { invalidateAdminBackendCache } from "@/lib/server/trr-api/admin-read-proxy";
import { invalidateTrrShowReadCaches } from "@/lib/server/trr-api/trr-show-read-route-cache";

export const dynamic = "force-dynamic";

const SOCIAL_LANDING_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SOCIAL_LANDING_CACHE_TTL_MS,
  60_000,
);
const NETWORK_SOURCE_SCOPE_BY_KEY = {
  "bravo-tv": "bravo",
} as const;
const SHOW_EXTERNAL_ID_KEYS_BY_PLATFORM = {
  instagram: ["instagram_handle", "instagram", "instagram_id"],
  facebook: ["facebook_handle", "facebook", "facebook_id"],
  threads: ["threads_handle", "threads", "threads_id"],
  twitter: ["twitter_handle", "twitter", "x_handle", "twitter_id", "x_id"],
  tiktok: ["tiktok_handle", "tiktok", "tiktok_id"],
  youtube: ["youtube_handle", "youtube", "youtube_id"],
} as const;

type LandingTargetType = "network" | "show" | "person";
type LandingPlatform = keyof typeof SHOW_EXTERNAL_ID_KEYS_BY_PLATFORM;

const isLandingTargetType = (value: unknown): value is LandingTargetType =>
  value === "network" || value === "show" || value === "person";

const isLandingPlatform = (value: unknown): value is LandingPlatform =>
  typeof value === "string" && value in SHOW_EXTERNAL_ID_KEYS_BY_PLATFORM;

const normalizeInternalHandle = (platform: LandingPlatform, rawValue: string): string => {
  const normalizedValue = normalizePersonExternalIdValue(platform, rawValue);
  if (!normalizedValue) {
    throw new Error("A valid social handle or URL is required.");
  }
  if (
    platform === "youtube" &&
    (normalizedValue.startsWith("channel/") ||
      normalizedValue.startsWith("user/") ||
      normalizedValue.startsWith("c/"))
  ) {
    throw new Error("YouTube show and network handles must use a direct channel handle.");
  }

  const canonicalHandle = normalizeSocialAccountProfileHandle(normalizedValue);
  if (!canonicalHandle) {
    throw new Error("A valid social handle or URL is required.");
  }
  return canonicalHandle;
};

const normalizePersonExternalId = (platform: LandingPlatform, rawValue: string): string => {
  const normalizedValue = normalizePersonExternalIdValue(platform, rawValue);
  if (!normalizedValue) {
    throw new Error("A valid social handle or URL is required.");
  }
  return normalizedValue;
};

export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const adminContext = toVerifiedAdminContext(user);
    const cacheKey = buildUserScopedRouteCacheKey(user.uid, "landing");
    const shouldRefresh =
      request.nextUrl.searchParams.get("refresh") === "1" ||
      request.nextUrl.searchParams.get("refresh") === "true";
    if (shouldRefresh) {
      invalidateSocialLandingRouteCacheForUser(user.uid);
    }

    const cached = getRouteResponseCache<Record<string, unknown>>(
      SOCIAL_LANDING_CACHE_NAMESPACE,
      cacheKey,
    );
    if (cached && !shouldRefresh) {
      return NextResponse.json(cached, { headers: { "x-trr-cache": "hit" } });
    }

    const result = await getOrCreateRouteResponsePromise(
      SOCIAL_LANDING_CACHE_NAMESPACE,
      cacheKey,
      async () => {
        const nextResult = await getSocialLandingPayloadResult(adminContext);
        if (nextResult.cacheable) {
          setRouteResponseCache(
            SOCIAL_LANDING_CACHE_NAMESPACE,
            cacheKey,
            nextResult.payload,
            SOCIAL_LANDING_CACHE_TTL_MS,
          );
        }
        return nextResult;
      },
    );
    const headers: Record<string, string> = {};
    if (shouldRefresh) {
      headers["x-trr-cache"] = "refresh";
    }
    if (!result.cacheable) {
      headers["x-trr-cacheable"] = "0";
    }
    return NextResponse.json(result.payload, { headers });
  } catch (error) {
    console.error("[api] Failed to load social landing payload", error);
    const message = error instanceof Error ? error.message : "Failed to load social landing payload";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const adminContext = toVerifiedAdminContext(user);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const targetType = body?.target_type;
    const targetId = typeof body?.target_id === "string" ? body.target_id.trim() : "";
    const platform = body?.platform;
    const rawValue = typeof body?.value === "string" ? body.value.trim() : "";

    if (!isLandingTargetType(targetType)) {
      return NextResponse.json({ error: "target_type is required" }, { status: 400 });
    }
    if (!targetId) {
      return NextResponse.json({ error: "target_id is required" }, { status: 400 });
    }
    if (!isLandingPlatform(platform)) {
      return NextResponse.json({ error: "platform is required" }, { status: 400 });
    }
    if (!rawValue) {
      return NextResponse.json({ error: "value is required" }, { status: 400 });
    }

    if (targetType === "network") {
      const sourceScope = NETWORK_SOURCE_SCOPE_BY_KEY[targetId as keyof typeof NETWORK_SOURCE_SCOPE_BY_KEY];
      if (!sourceScope) {
        return NextResponse.json({ error: "Network target not found" }, { status: 404 });
      }
      const normalizedHandle = normalizeInternalHandle(platform, rawValue);
      const current = (await fetchSocialBackendJson("/shared/sources", {
        adminContext,
        queryString: `source_scope=${sourceScope}&include_inactive=true`,
        fallbackError: "Failed to load shared social account sources",
        retries: 0,
        timeoutMs: 30_000,
      })) as { sources?: Array<Record<string, unknown>> };
      const existingSources = Array.isArray(current.sources) ? current.sources : [];
      const existingIndex = existingSources.findIndex(
        (entry) =>
          String(entry.platform || "").trim().toLowerCase() === platform &&
          String(entry.account_handle || "").trim().replace(/^@+/, "").toLowerCase() === normalizedHandle.toLowerCase(),
      );
      const nextSources = existingSources.map((entry) => ({
        platform: String(entry.platform || "").trim().toLowerCase(),
        account_handle: String(entry.account_handle || "").trim().replace(/^@+/, ""),
        is_active: entry.is_active !== false,
        scrape_priority: Number(entry.scrape_priority || 100),
        metadata: entry.metadata && typeof entry.metadata === "object" ? entry.metadata : {},
      }));

      if (existingIndex >= 0) {
        nextSources[existingIndex] = {
          ...nextSources[existingIndex],
          is_active: true,
        };
      } else {
        nextSources.push({
          platform,
          account_handle: normalizedHandle,
          is_active: true,
          scrape_priority: 100,
          metadata: {},
        });
      }

      await fetchSocialBackendJson("/shared/sources", {
        adminContext,
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_scope: sourceScope,
          sources: nextSources,
        }),
        fallbackError: "Failed to update shared social account sources",
        retries: 0,
        timeoutMs: 45_000,
      });
    }

    if (targetType === "show") {
      const currentShow = await getShowById(targetId);
      if (!currentShow) {
        return NextResponse.json({ error: "Show not found" }, { status: 404 });
      }
      const normalizedHandle = normalizeInternalHandle(platform, rawValue);
      const existingExternalIds =
        currentShow.external_ids && typeof currentShow.external_ids === "object"
          ? { ...(currentShow.external_ids as Record<string, unknown>) }
          : {};
      for (const key of SHOW_EXTERNAL_ID_KEYS_BY_PLATFORM[platform]) {
        existingExternalIds[key] = normalizedHandle;
      }
      await updateShowById(targetId, { externalIds: existingExternalIds });
      invalidateTrrShowReadCaches(`${user.uid}:`);
      await invalidateAdminBackendCache(`/admin/trr-api/shows/${targetId}/cache/invalidate`, {
        routeName: "show-detail",
      });
    }

    if (targetType === "person") {
      const normalizedExternalId = normalizePersonExternalId(platform, rawValue);
      const existingExternalIds = await listPersonExternalIds(targetId, { includeInactive: false });
      const nextBySource = new Map(existingExternalIds.map((entry) => [entry.source_id, entry] as const));
      nextBySource.set(platform, {
        id: null,
        source_id: platform,
        external_id: normalizedExternalId,
        is_primary: true,
        valid_from: null,
        valid_to: null,
        observed_at: null,
      });
      const inputs = Array.from(nextBySource.values()).map(
        (entry) =>
          ({
            source_id: entry.source_id,
            external_id: entry.external_id,
            valid_from: entry.valid_from,
            valid_to: null,
            is_primary: true,
          }) satisfies PersonExternalIdInput,
      );
      await syncPersonExternalIds(targetId, inputs);
      invalidateRouteResponseCache("admin-person-detail", `${user.uid}:person:${targetId}:`);
      await invalidateAdminBackendCache(`/admin/people/${targetId}/cache/invalidate`, {
        routeName: "person-detail",
      });
    }

    invalidateRouteResponseCache(SOCIAL_LANDING_CACHE_NAMESPACE, `${user.uid}:`);
    const result = await getSocialLandingPayloadResult(adminContext);
    if (result.cacheable) {
      setRouteResponseCache(
        SOCIAL_LANDING_CACHE_NAMESPACE,
        buildUserScopedRouteCacheKey(user.uid, "landing"),
        result.payload,
        SOCIAL_LANDING_CACHE_TTL_MS,
      );
    }
    return NextResponse.json(result.payload, {
      headers: result.cacheable ? undefined : { "x-trr-cacheable": "0" },
    });
  } catch (error) {
    console.error("[api] Failed to update social landing handle", error);
    const message = error instanceof Error ? error.message : "Failed to update social landing handle";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message === "Person not found"
            ? 404
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
