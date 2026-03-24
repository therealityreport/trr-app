import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { withStreamingSseFetch } from "@/lib/server/sse-proxy";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

interface RouteParams {
  params: Promise<{ operationId: string }>;
}

const toOptionalHeaderValue = (value: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toSafeAfterSeq = (raw: string | null): number => {
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { operationId } = await params;
    if (!operationId) {
      return Response.json({ error: "operationId is required" }, { status: 400 });
    }

    const baseUrl = getBackendApiUrl(`/admin/operations/${operationId}/stream`);
    if (!baseUrl) {
      return Response.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return Response.json({ error: "Backend auth not configured" }, { status: 500 });
    }

    const afterSeq = toSafeAfterSeq(new URL(request.url).searchParams.get("after_seq"));
    const backendUrl = new URL(baseUrl);
    backendUrl.searchParams.set("after_seq", String(afterSeq));

    const requestId = toOptionalHeaderValue(request.headers.get("x-trr-request-id"));
    const tabSessionId = toOptionalHeaderValue(request.headers.get("x-trr-tab-session-id"));
    const flowKey = toOptionalHeaderValue(request.headers.get("x-trr-flow-key"));

    const backendResponse = await fetch(
      backendUrl.toString(),
      withStreamingSseFetch({
        method: "GET",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          ...(requestId ? { "x-trr-request-id": requestId } : {}),
          ...(tabSessionId ? { "x-trr-tab-session-id": tabSessionId } : {}),
          ...(flowKey ? { "x-trr-flow-key": flowKey } : {}),
        },
        cache: "no-store",
      })
    );

    if (!backendResponse.ok) {
      const text = await backendResponse.text().catch(() => "");
      let error = "Failed to stream operation";
      try {
        const json = JSON.parse(text) as { error?: unknown; detail?: unknown };
        if (typeof json.error === "string" && json.error.trim().length > 0) {
          error = json.error;
        } else if (typeof json.detail === "string" && json.detail.trim().length > 0) {
          error = json.detail;
        }
      } catch {
        if (text.trim().length > 0) {
          error = text.trim();
        }
      }
      return Response.json({ error }, { status: backendResponse.status });
    }

    if (!backendResponse.body) {
      return Response.json({ error: "Operation stream unavailable" }, { status: 502 });
    }

    return new Response(backendResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}
