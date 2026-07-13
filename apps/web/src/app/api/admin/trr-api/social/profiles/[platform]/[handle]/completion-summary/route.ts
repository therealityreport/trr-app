import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, toVerifiedAdminContext } from "@/lib/server/auth";
import { attachAdminRouteTiming } from "@/lib/server/admin/admin-route-timing";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  getStaleRouteResponseCache,
  parseCacheTtlMs,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import {
  fetchSocialBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ platform: string; handle: string }>;
};

const COMPLETION_SUMMARY_CACHE_NAMESPACE = "social-account-profile-completion-summary";
const COMPLETION_SUMMARY_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SOCIAL_PROFILE_COMPLETION_SUMMARY_CACHE_TTL_MS,
  5 * 60_000,
);
const COMPLETION_SUMMARY_STALE_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SOCIAL_PROFILE_COMPLETION_SUMMARY_STALE_CACHE_TTL_MS,
  10 * 60_000,
);
const COMPLETION_SUMMARY_BACKEND_TIMEOUT_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SOCIAL_PROFILE_COMPLETION_SUMMARY_BACKEND_TIMEOUT_MS,
  30_000,
);

const getDefaultYear = (): number => new Date().getUTCFullYear();

const readYear = (request: NextRequest): number => {
  const fallbackYear = getDefaultYear();
  const parsed = Number(request.nextUrl.searchParams.get("year") ?? String(fallbackYear));
  return Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100 ? parsed : fallbackYear;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const routeStartedAt = performance.now();
  let cacheStatus = "error";
  let backendMs: number | null = null;
  try {
    const user = await requireAdmin(request);
    const adminContext = toVerifiedAdminContext(user);
    const { platform, handle } = await context.params;
    const normalizedPlatform = platform.trim().toLowerCase();
    const normalizedHandle = handle.trim().toLowerCase().replace(/^@+/, "");
    if (normalizedPlatform !== "instagram" || !normalizedHandle) {
      cacheStatus = "bypass";
      return attachAdminRouteTiming(
        NextResponse.json({ error: "unsupported_profile" }, { status: 400 }),
        {
          routeFamily: "admin-social-profile",
          routeName: "GET completion-summary",
          cacheStatus,
          startedAt: routeStartedAt,
        },
      );
    }

    const year = readYear(request);
    const cacheKey = buildUserScopedRouteCacheKey(
      user.uid,
      `${normalizedPlatform}:${normalizedHandle}:completion-summary`,
      new URLSearchParams([["year", String(year)]]),
    );
    const cached = getRouteResponseCache<Record<string, unknown>>(
      COMPLETION_SUMMARY_CACHE_NAMESPACE,
      cacheKey,
    );
    if (cached) {
      cacheStatus = "hit";
      return attachAdminRouteTiming(
        NextResponse.json(cached, { headers: { "x-trr-cache": cacheStatus } }),
        {
          routeFamily: "admin-social-profile",
          routeName: "GET completion-summary",
          cacheStatus,
          startedAt: routeStartedAt,
        },
      );
    }

    const stale = getStaleRouteResponseCache<Record<string, unknown>>(
      COMPLETION_SUMMARY_CACHE_NAMESPACE,
      cacheKey,
    );
    try {
      const payload = await getOrCreateRouteResponsePromise(
        COMPLETION_SUMMARY_CACHE_NAMESPACE,
        cacheKey,
        async () => {
          const backendStartedAt = performance.now();
          try {
            const nextPayload = await fetchSocialBackendJson(
              `/profiles/${encodeURIComponent(normalizedPlatform)}/${encodeURIComponent(normalizedHandle)}/completion-summary`,
              {
                adminContext,
                queryString: new URLSearchParams([["year", String(year)]]).toString(),
                fallbackError: "Failed to load social completion summary",
                retries: 0,
                timeoutMs: COMPLETION_SUMMARY_BACKEND_TIMEOUT_MS,
              },
            );
            setRouteResponseCache(
              COMPLETION_SUMMARY_CACHE_NAMESPACE,
              cacheKey,
              nextPayload,
              COMPLETION_SUMMARY_CACHE_TTL_MS,
              COMPLETION_SUMMARY_STALE_CACHE_TTL_MS,
            );
            return nextPayload;
          } finally {
            backendMs = performance.now() - backendStartedAt;
          }
        },
      );
      cacheStatus = "miss";
      return attachAdminRouteTiming(
        NextResponse.json(payload, { headers: { "x-trr-cache": cacheStatus } }),
        {
          routeFamily: "admin-social-profile",
          routeName: "GET completion-summary",
          cacheStatus,
          backendMs,
          startedAt: routeStartedAt,
        },
      );
    } catch (error) {
      if (stale) {
        cacheStatus = "stale";
        return attachAdminRouteTiming(
          NextResponse.json(stale, {
            headers: { "x-trr-cache": cacheStatus, "x-trr-cacheable": "0" },
          }),
          {
            routeFamily: "admin-social-profile",
            routeName: "GET completion-summary",
            cacheStatus,
            backendMs,
            startedAt: routeStartedAt,
          },
        );
      }
      throw error;
    }
  } catch (error) {
    return attachAdminRouteTiming(
      socialProxyErrorResponse(error, "[api] Failed to load social completion summary"),
      {
        routeFamily: "admin-social-profile",
        routeName: "GET completion-summary",
        cacheStatus,
        backendMs,
        startedAt: routeStartedAt,
      },
    );
  }
}
