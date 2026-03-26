import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getDevDashboardSkillsAgentsData } from "@/lib/server/admin/dev-dashboard-skills-agents-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const data = await getDevDashboardSkillsAgentsData();

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to load dev dashboard skills and agents", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
