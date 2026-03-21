import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

interface RouteParams {
  params: Promise<{ personId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  await requireAdmin(request);
  const { personId } = await params;
  const backendUrl = getBackendApiUrl(`/admin/bravotv/images/people/${personId}/latest`);
  if (!backendUrl) {
    return Response.json({ error: "Backend API not configured" }, { status: 500 });
  }
  const serviceRoleKey =
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return Response.json(
      {
        error: "TRR_CORE_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY) is not configured",
      },
      { status: 500 },
    );
  }
  const backendResponse = await fetch(backendUrl, {
    headers: { Authorization: `Bearer ${serviceRoleKey}` },
    cache: "no-store",
  });
  const payload = await backendResponse.json().catch(() => ({ error: "Invalid backend response" }));
  return Response.json(payload, { status: backendResponse.status });
}
