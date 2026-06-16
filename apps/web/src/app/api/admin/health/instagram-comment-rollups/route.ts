import { NextRequest } from "next/server";

import { requireAdmin, toVerifiedAdminContext } from "@/lib/server/auth";
import { executeAdminBackendProxy } from "@/lib/server/trr-api/admin-backend-proxy-route";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await requireAdmin(request);
  return executeAdminBackendProxy(
    request,
    {},
    {
      routeName: "instagram-comment-rollups-health",
      method: "GET",
      backendPath: () => "/admin/health/instagram-comment-rollups",
      query: "forward",
      timeout: "default",
      backendCache: "no-store",
      responseHeaders: { "Cache-Control": "no-store, max-age=0" },
      jsonErrorFallback: "Failed to load Instagram comment rollup health",
      timeoutError: "Instagram comment rollup health timed out",
      timeoutDetail: ({ timeoutMs }) =>
        `The backend did not return Instagram comment rollup health within ${timeoutMs}ms.`,
      logMessage: "[admin-health] instagram comment rollup health proxy failed",
    },
    toVerifiedAdminContext(user),
  );
}
