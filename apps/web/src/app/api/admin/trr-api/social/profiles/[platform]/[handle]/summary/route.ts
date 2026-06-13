import { parseCacheTtlMs } from "@/lib/server/admin/route-response-cache";
import {
  createSocialProfileReadRoute,
  type SocialProfileRouteContext,
} from "@/lib/server/trr-api/social-profile-route-factory";
import { SOCIAL_PROXY_LONG_TIMEOUT_MS } from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

const SOCIAL_PROFILE_SUMMARY_CACHE_NAMESPACE = "admin-social-profile-summary";
const SOCIAL_PROFILE_SUMMARY_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SOCIAL_PROFILE_SUMMARY_CACHE_TTL_MS,
  5 * 60_000,
);
const SOCIAL_PROFILE_SUMMARY_STALE_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SOCIAL_PROFILE_SUMMARY_STALE_CACHE_TTL_MS,
  15 * 60_000,
);

export const GET = createSocialProfileReadRoute({
  endpoint: "summary",
  fallbackError: "Failed to fetch social account profile summary",
  logLabel: "[api] Failed to fetch social account profile summary",
  timeoutMs: SOCIAL_PROXY_LONG_TIMEOUT_MS,
  queryString: "forward",
  forwardAdminContext: true,
  routeTimingHeaders: true,
  cache: {
    kind: "route-response",
    namespace: SOCIAL_PROFILE_SUMMARY_CACHE_NAMESPACE,
    ttlMs: SOCIAL_PROFILE_SUMMARY_CACHE_TTL_MS,
    staleTtlMs: SOCIAL_PROFILE_SUMMARY_STALE_CACHE_TTL_MS,
    scope: ({ platform, handle }) => `${platform}:${handle}:summary`,
  },
});

export type RouteContext = SocialProfileRouteContext;
