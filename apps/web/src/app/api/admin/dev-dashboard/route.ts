import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getDevDashboardData } from "@/lib/server/admin/dev-dashboard-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/dev-dashboard
 *
 * Loads cross-repo dev status for the local TRR workspace.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const data = await getDevDashboardData();

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to load dev dashboard", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

