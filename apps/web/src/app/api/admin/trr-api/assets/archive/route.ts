import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/trr-api/assets/archive
 *
 * Proxies archive requests to TRR-Backend.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const backendUrl = getBackendApiUrl("/admin/assets/archive");
    if (!backendUrl) {
      return Response.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return Response.json({ error: "Backend auth not configured" }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(body ?? {}),
    });

    const data = await backendResponse.json().catch(() => ({}));
    return Response.json(data, { status: backendResponse.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    return Response.json({ error: message }, { status: 500 });
  }
}

