import { createSocialProfileReadRoute } from "@/lib/server/trr-api/social-profile-route-factory";

export const dynamic = "force-dynamic";

export const GET = createSocialProfileReadRoute({
  endpoint: "comments",
  fallbackError: "Failed to fetch social account comments",
  logLabel: "[api] Failed to fetch social account comments",
  queryString: "forward",
});
