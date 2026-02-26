import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";

const getBackendHeaders = (): HeadersInit | null => {
  const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return null;
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${serviceRoleKey}`,
  };
};

const normalizeOverrideErrorCode = (status: number, message: string): string => {
  const normalized = message.trim().toLowerCase();
  if (status === 401 || status === 403) {
    return "not_authenticated_for_overrides";
  }
  if (normalized.includes("not authenticated") || normalized.includes("forbidden")) {
    return "not_authenticated_for_overrides";
  }
  if (status >= 500) {
    return "backend_override_unavailable";
  }
  if (
    normalized.includes("backend auth not configured") ||
    normalized.includes("backend api not configured") ||
    normalized.includes("service role")
  ) {
    return "backend_override_unavailable";
  }
  return "backend_override_unavailable";
};

const backendError = (response: Response, payload: Record<string, unknown>) => {
  const error =
    typeof payload.error === "string"
      ? payload.error
      : typeof payload.detail === "string"
        ? payload.detail
        : "Backend override request failed";
  const errorCode = normalizeOverrideErrorCode(response.status, error);
  return NextResponse.json({ error_code: errorCode, error }, { status: response.status });
};

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);

    const params = await context.params;
    const backendUrl = getBackendApiUrl(`/admin/shows/networks-streaming/overrides/${params.id}`);
    if (!backendUrl) {
      return NextResponse.json(
        {
          error_code: "backend_override_unavailable",
          error: "Backend API not configured",
        },
        { status: 500 },
      );
    }

    const headers = getBackendHeaders();
    if (!headers) {
      return NextResponse.json(
        {
          error_code: "backend_override_unavailable",
          error: "Backend auth not configured",
        },
        { status: 500 },
      );
    }

    const body =
      request.headers.get("content-type")?.includes("application/json")
        ? ((await request.json().catch(() => ({}))) as Record<string, unknown>)
        : {};

    const response = await fetch(backendUrl, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      return backendError(response, payload);
    }
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json(
      {
        error_code: normalizeOverrideErrorCode(status, message),
        error: message,
      },
      { status },
    );
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);

    const params = await context.params;
    const backendUrl = getBackendApiUrl(`/admin/shows/networks-streaming/overrides/${params.id}`);
    if (!backendUrl) {
      return NextResponse.json(
        {
          error_code: "backend_override_unavailable",
          error: "Backend API not configured",
        },
        { status: 500 },
      );
    }

    const headers = getBackendHeaders();
    if (!headers) {
      return NextResponse.json(
        {
          error_code: "backend_override_unavailable",
          error: "Backend auth not configured",
        },
        { status: 500 },
      );
    }

    const response = await fetch(backendUrl, { method: "DELETE", headers });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      return backendError(response, payload);
    }
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json(
      {
        error_code: normalizeOverrideErrorCode(status, message),
        error: message,
      },
      { status },
    );
  }
}
