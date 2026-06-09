import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSocialBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

type RouteContext = {
  params: Promise<{ platform: string; handle: string; runId: string }>;
};

type CatalogRunAction = "manual-auth" | "repair-auth";

type CatalogRunActionOptions = {
  action: CatalogRunAction;
  fallbackError: string;
  logLabel: string;
};

export async function postCatalogRunAction(
  request: NextRequest,
  context: RouteContext,
  options: CatalogRunActionOptions,
) {
  try {
    await requireAdmin(request);
    const { platform, handle, runId } = await context.params;
    const body = await request.text();
    const data = await fetchSocialBackendJson(
      `/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/runs/${encodeURIComponent(
        runId,
      )}/${options.action}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        fallbackError: options.fallbackError,
        retries: 0,
        timeoutMs: 210_000,
      },
    );
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, options.logLabel);
  }
}
