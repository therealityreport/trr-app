import "server-only";

import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";

export const SOCIAL_LANDING_CACHE_NAMESPACE = "admin-social-landing";

declare global {
  var __trrAdminSocialLandingRouteCacheVersions: Map<string, number> | undefined;
}

const USER_CACHE_VERSIONS =
  globalThis.__trrAdminSocialLandingRouteCacheVersions ?? new Map<string, number>();
if (!globalThis.__trrAdminSocialLandingRouteCacheVersions) {
  globalThis.__trrAdminSocialLandingRouteCacheVersions = USER_CACHE_VERSIONS;
}

export const getSocialLandingRouteCacheVersion = (userId: string): number =>
  USER_CACHE_VERSIONS.get(userId) ?? 0;

export const isSocialLandingRouteCacheVersionCurrent = (
  userId: string,
  version: number,
): boolean => getSocialLandingRouteCacheVersion(userId) === version;

export const invalidateSocialLandingRouteCacheForUser = (userId: string): void => {
  USER_CACHE_VERSIONS.set(userId, getSocialLandingRouteCacheVersion(userId) + 1);
  invalidateRouteResponseCache(SOCIAL_LANDING_CACHE_NAMESPACE, `${userId}:`);
};
