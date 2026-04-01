import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { getInternalAdminBearerToken } from "@/lib/server/trr-api/internal-admin-auth";

interface RouteParams {
  params: Promise<{ runId: string; artifactName: string[] }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  await requireAdmin(request);
  const { runId, artifactName } = await params;
  const artifactPath = artifactName.join("/");
  const backendUrl = getBackendApiUrl(
    `/admin/bravotv/images/runs/${runId}/artifacts/${artifactPath}${request.nextUrl.search}`,
  );
  if (!backendUrl) {
    return Response.json({ error: "Backend API not configured" }, { status: 500 });
  }
  let serviceRoleKey: string;
  try {
    serviceRoleKey = getInternalAdminBearerToken();
  } catch {
    return Response.json(
      {
        error: "TRR internal admin auth is not configured",
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
