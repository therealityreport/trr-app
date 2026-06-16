import { createSocialProfileProxyRoute } from "@/lib/server/trr-api/social-profile-route-factory";

export const dynamic = "force-dynamic";

// The audit-cursor recovery query joins the comments-audit table to instagram_posts
// and can exceed the DB statement timeout on large accounts, surfacing as a 504. An
// admin-snapshot cache with stale-if-error keeps the panel showing last-known recovery
// rows during a slow/timed-out backend window instead of erroring. See the comments
// page diagnosis: this degrades the transient timeout rather than masking missing data.
const AUDIT_CURSOR_TTL_MS = 30_000;
const AUDIT_CURSOR_STALE_MS = 10 * 60_000;

export const GET = createSocialProfileProxyRoute({
  endpoint: "comments/audit-cursor-retries",
  fallbackError: "Failed to fetch missing-comment recovery",
  logLabel: "[api] Failed to fetch missing-comment recovery",
  method: "GET",
  forwardBody: false,
  queryString: "forward",
  timeoutMs: 60_000,
  routeTimingHeaders: true,
  cache: {
    kind: "admin-snapshot",
    pageFamily: "social-profile",
    scope: ({ platform, handle }) => `${platform}:${handle}:comments-audit-cursor`,
    cacheKeyQuery: "backend",
    ttlMs: AUDIT_CURSOR_TTL_MS,
    staleIfErrorTtlMs: AUDIT_CURSOR_STALE_MS,
  },
});

export const POST = createSocialProfileProxyRoute({
  endpoint: "comments/audit-cursor-retries",
  fallbackError: "Failed to enqueue missing-comment recovery",
  logLabel: "[api] Failed to enqueue missing-comment recovery",
  method: "POST",
  headers: { "Content-Type": "application/json" },
  forwardBody: true,
  bodyFallback: "{}",
  queryString: "none",
  timeoutMs: 210_000,
  routeTimingHeaders: true,
  forwardAdminContext: true,
});
