import {
  createSocialProfileReadRoute,
} from "@/lib/server/trr-api/social-profile-route-factory";
import { SOCIAL_PROXY_LONG_TIMEOUT_MS } from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

const POSTS_TTL_MS = 5 * 60_000;
const POSTS_STALE_MS = 15 * 60_000;

export const GET = createSocialProfileReadRoute({
  endpoint: "posts",
  fallbackError: "Failed to fetch social account profile posts",
  logLabel: "[api] Failed to fetch social account profile posts",
  queryString: "strip-refresh",
  timeoutMs: SOCIAL_PROXY_LONG_TIMEOUT_MS,
  routeTimingHeaders: true,
  cache: {
    kind: "admin-snapshot",
    pageFamily: "social-profile",
    scope: ({ platform, handle }) => `${platform}:${handle}:posts`,
    cacheKeyQuery: "backend",
    ttlMs: POSTS_TTL_MS,
    staleIfErrorTtlMs: POSTS_STALE_MS,
  },
});
