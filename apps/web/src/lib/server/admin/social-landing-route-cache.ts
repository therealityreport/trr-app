import "server-only";

import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";

export const SOCIAL_LANDING_CACHE_NAMESPACE = "admin-social-landing";

export const invalidateSocialLandingRouteCacheForUser = (userId: string): void => {
  invalidateRouteResponseCache(SOCIAL_LANDING_CACHE_NAMESPACE, `${userId}:`);
};
