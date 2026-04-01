import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  cleanupStaleGettyPrefetchFiles,
  hydrateGettyPrefetchPayload,
} from "@/lib/server/admin/getty-local-scrape";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { getInternalAdminBearerToken } from "@/lib/server/trr-api/internal-admin-auth";

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
  let body = request.headers.get("content-type")?.includes("application/json")
    ? await request.text().catch(() => "")
    : "";
  if (body.trim()) {
    body = await hydrateGettyPrefetchPayload(body);
    cleanupStaleGettyPrefetchFiles().catch(() => {});
  }
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
