import { createSocialProfileReadRoute } from "@/lib/server/trr-api/social-profile-route-factory";

export const dynamic = "force-dynamic";

const COLLABORATORS_TAGS_TTL_MS = 5 * 60_000;
const COLLABORATORS_TAGS_STALE_MS = 15 * 60_000;

export const GET = createSocialProfileReadRoute({
  endpoint: "collaborators-tags",
  fallbackError: "Failed to fetch social account profile collaborators and tags",
  logLabel: "[api] Failed to fetch social account profile collaborators and tags",
  queryString: "none",
  cache: {
    kind: "admin-snapshot",
    pageFamily: "social-profile",
    scope: ({ platform, handle }) => `${platform}:${handle}:collaborators-tags`,
    ttlMs: COLLABORATORS_TAGS_TTL_MS,
    staleIfErrorTtlMs: COLLABORATORS_TAGS_STALE_MS,
  },
});
