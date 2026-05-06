import { invalidateAdminSnapshotFamilies } from "@/lib/server/admin/admin-snapshot-cache";
import { createSocialProfileProxyRoute } from "@/lib/server/trr-api/social-profile-route-factory";

export const dynamic = "force-dynamic";

export const POST = createSocialProfileProxyRoute({
  endpoint: "comments/scrape",
  method: "POST",
  headers: { "Content-Type": "application/json" },
  bodyFallback: "{}",
  fallbackError: "Failed to start social account comments scrape",
  logLabel: "[api] Failed to start social account comments scrape",
  retries: 0,
  timeoutMs: 210_000,
  invalidateCache: ({ params }) => {
    invalidateAdminSnapshotFamilies([{ pageFamily: "social-profile", scope: `${params.platform}:${params.handle}` }]);
  },
});
