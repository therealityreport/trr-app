import { createSocialProfileReadRoute } from "@/lib/server/trr-api/social-profile-route-factory";

export const dynamic = "force-dynamic";

const COMMENTS_TTL_MS = 60_000;
const COMMENTS_STALE_MS = 5 * 60_000;

export const GET = createSocialProfileReadRoute({
  endpoint: "comments",
  fallbackError: "Failed to fetch social account comments",
  logLabel: "[api] Failed to fetch social account comments",
  queryString: "strip-refresh",
  routeTimingHeaders: true,
  cache: {
    kind: "admin-snapshot",
    pageFamily: "social-profile",
    scope: ({ platform, handle }) => `${platform}:${handle}:comments`,
    cacheKeyQuery: "backend",
    ttlMs: COMMENTS_TTL_MS,
    staleIfErrorTtlMs: COMMENTS_STALE_MS,
  },
});
