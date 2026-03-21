import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

interface RouteParams {
  params: Promise<{ personId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  await requireAdmin(request);
  const { personId } = await params;
  const backendUrl = getBackendApiUrl(`/admin/bravotv/images/people/${personId}/stream`);
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
  const body = request.headers.get("content-type")?.includes("application/json")
    ? await request.text().catch(() => "")
    : "";
  const backendResponse = await fetch(backendUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
      ...(request.headers.get("x-trr-request-id") ? { "x-trr-request-id": request.headers.get("x-trr-request-id")! } : {}),
      ...(request.headers.get("x-trr-flow-key") ? { "x-trr-flow-key": request.headers.get("x-trr-flow-key")! } : {}),
      ...(request.headers.get("x-trr-tab-session-id")
        ? { "x-trr-tab-session-id": request.headers.get("x-trr-tab-session-id")! }
        : {}),
    },
    body: body || JSON.stringify({ mode: "person", person_id: personId, sources: ["all"] }),
  });
  if (!backendResponse.body) {
    return Response.json({ error: "No response body from backend" }, { status: 502 });
  }
  return new Response(backendResponse.body, {
    status: backendResponse.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, max-age=0",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
