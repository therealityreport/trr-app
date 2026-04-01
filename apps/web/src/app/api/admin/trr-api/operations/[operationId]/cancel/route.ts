import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { getInternalAdminBearerToken } from "@/lib/server/trr-api/internal-admin-auth";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ operationId: string }>;
}

const toOptionalHeaderValue = (value: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { operationId } = await params;
    if (!operationId) {
      return NextResponse.json({ error: "operationId is required" }, { status: 400 });
    }

    const backendUrl = getBackendApiUrl(`/admin/operations/${operationId}/cancel`);
    if (!backendUrl) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const serviceRoleKey = getInternalAdminBearerToken();
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });
    }

    const requestId = toOptionalHeaderValue(request.headers.get("x-trr-request-id"));
    const tabSessionId = toOptionalHeaderValue(request.headers.get("x-trr-tab-session-id"));
    const flowKey = toOptionalHeaderValue(request.headers.get("x-trr-flow-key"));

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        ...(requestId ? { "x-trr-request-id": requestId } : {}),
        ...(tabSessionId ? { "x-trr-tab-session-id": tabSessionId } : {}),
        ...(flowKey ? { "x-trr-flow-key": flowKey } : {}),
      },
    });

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const error =
        typeof data.error === "string"
          ? data.error
          : typeof data.detail === "string"
            ? data.detail
            : "Failed to cancel operation";
      return NextResponse.json({ error }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
