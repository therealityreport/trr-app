import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getNetworksStreamingSummary } from "@/lib/server/admin/networks-streaming-repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/networks-streaming/summary
 *
 * Returns network + streaming coverage summary sourced from core/admin schema tables.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const summary = await getNetworksStreamingSummary();

    return NextResponse.json(summary);
  } catch (error) {
    console.error("[api] Failed to load networks/streaming summary", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
