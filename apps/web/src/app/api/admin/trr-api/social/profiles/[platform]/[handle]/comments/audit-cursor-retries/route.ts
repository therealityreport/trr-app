import { createSocialProfileProxyRoute } from "@/lib/server/trr-api/social-profile-route-factory";

export const dynamic = "force-dynamic";

export const GET = createSocialProfileProxyRoute({
  endpoint: "comments/audit-cursor-retries",
  fallbackError: "Failed to fetch audit cursor retries",
  logLabel: "[api] Failed to fetch audit cursor retries",
  method: "GET",
  forwardBody: false,
  queryString: "forward",
  routeTimingHeaders: true,
});

export const POST = createSocialProfileProxyRoute({
  endpoint: "comments/audit-cursor-retries",
  fallbackError: "Failed to enqueue audit cursor retries",
  logLabel: "[api] Failed to enqueue audit cursor retries",
  method: "POST",
  forwardBody: true,
  queryString: "none",
  routeTimingHeaders: true,
  forwardAdminContext: true,
});
