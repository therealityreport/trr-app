import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showKey: string; iconId: string }>;
}

const backendAuthHeader = (): { Authorization: string } | null => {
  const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return null;
  return { Authorization: `Bearer ${serviceRoleKey}` };
};

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showKey, iconId } = await params;
    const backendUrl = getBackendApiUrl(
      `/admin/shows/${encodeURIComponent(showKey)}/icons/${encodeURIComponent(iconId)}`,
    );
    const auth = backendAuthHeader();
    if (!backendUrl || !auth) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const response = await fetch(backendUrl, {
      method: "DELETE",
      headers: auth,
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
