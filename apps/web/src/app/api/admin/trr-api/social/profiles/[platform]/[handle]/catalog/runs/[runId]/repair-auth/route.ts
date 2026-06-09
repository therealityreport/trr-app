import { NextRequest } from "next/server";
import { postCatalogRunAction } from "../_catalog-run-action";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ platform: string; handle: string; runId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  return postCatalogRunAction(request, context, {
    action: "repair-auth",
    fallbackError: "Failed to repair Instagram auth for this catalog run",
    logLabel: "[api] Failed to repair Instagram auth for this catalog run",
  });
}
