import { createSocialProfileReadRoute } from "@/lib/server/trr-api/social-profile-route-factory";

export const dynamic = "force-dynamic";

const REVIEW_QUEUE_TTL_MS = 60_000;
const REVIEW_QUEUE_STALE_MS = 5 * 60_000;

export const GET = createSocialProfileReadRoute({
  endpoint: "catalog/review-queue",
  fallbackError: "Failed to fetch social account catalog review queue",
  logLabel: "[api] Failed to fetch social account catalog review queue",
  queryString: "strip-refresh",
  cache: {
    kind: "admin-snapshot",
    pageFamily: "social-profile",
    scope: ({ platform, handle }) => `${platform}:${handle}:catalog-review-queue`,
    cacheKeyQuery: "backend",
    ttlMs: REVIEW_QUEUE_TTL_MS,
    staleIfErrorTtlMs: REVIEW_QUEUE_STALE_MS,
  },
});
