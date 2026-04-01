import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { getInternalAdminBearerToken } from "@/lib/server/trr-api/internal-admin-auth";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const backendUrl = getBackendApiUrl("/admin/operations/cancel");
    if (!backendUrl) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const serviceRoleKey = getInternalAdminBearerToken();
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });
    }

    const rawBody = (await request.json().catch(() => ({}))) as {
      operation_ids?: unknown;
      cancel_all_active?: unknown;
    };
    const operationIds = (Array.isArray(rawBody.operation_ids) ? rawBody.operation_ids : [])
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean);
    const cancelAllActive = rawBody.cancel_all_active === true;

    if (!cancelAllActive && operationIds.length === 0) {
      return NextResponse.json(
        { error: "operation_ids must contain at least one valid UUID or cancel_all_active must be true" },
        { status: 400 },
      );
    }
    if (operationIds.some((operationId) => !isValidUuid(operationId))) {
      return NextResponse.json({ error: "operation_ids must contain valid UUID values" }, { status: 400 });
    }

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operation_ids: operationIds,
        cancel_all_active: cancelAllActive,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const error =
        typeof data.error === "string"
          ? data.error
          : typeof data.detail === "string"
            ? data.detail
            : "Failed to cancel admin operations";
      return NextResponse.json({ error }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
