import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { getInternalAdminBearerToken } from "@/lib/server/trr-api/internal-admin-auth";

interface RouteParams {
  params: Promise<{ runId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  await requireAdmin(request);
  const { runId } = await params;
  const backendUrl = getBackendApiUrl(`/admin/bravotv/images/runs/${runId}/backfill`);
  if (!backendUrl) {
    return Response.json({ error: "Backend API not configured" }, { status: 500 });
  }
  let serviceRoleKey: string;
  try {
    serviceRoleKey = getInternalAdminBearerToken();
  } catch {
    return Response.json({ error: "TRR internal admin auth is not configured" }, { status: 500 });
  }
  const body = await request.text();
  const backendResponse = await fetch(backendUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: body || "{}",
    cache: "no-store",
  });
  const payload = await backendResponse.json().catch(() => ({ error: "Invalid backend response" }));
  return Response.json(payload, { status: backendResponse.status });
}
