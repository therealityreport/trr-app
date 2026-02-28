import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showKey: string }>;
}

const backendAuthHeader = (): { Authorization: string } | null => {
  const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return null;
  return { Authorization: `Bearer ${serviceRoleKey}` };
};

const toBackendUrl = (showKey: string): string | null => {
  return getBackendApiUrl(`/admin/shows/${encodeURIComponent(showKey)}/icons`);
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showKey } = await params;
    const backendUrl = toBackendUrl(showKey);
    const auth = backendAuthHeader();
    if (!backendUrl || !auth) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const response = await fetch(backendUrl, {
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

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showKey } = await params;
    const backendUrl = toBackendUrl(showKey);
    const auth = backendAuthHeader();
    if (!backendUrl || !auth) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const incoming = await request.formData();
    const outbound = new FormData();
    for (const [key, value] of incoming.entries()) {
      outbound.append(key, value);
    }

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: auth,
      body: outbound,
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
