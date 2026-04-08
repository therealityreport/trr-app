import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { buildInternalAdminHeaders } from "@/lib/server/trr-api/internal-admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const backendUrl = getBackendApiUrl("/admin/socials/live-status/stream");
    if (!backendUrl) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({ error: "Backend API not configured" })}\n\n`,
        { status: 500, headers: { "Content-Type": "text/event-stream" } },
      );
    }

    const backendResponse = await fetch(backendUrl, {
      method: "GET",
      headers: buildInternalAdminHeaders({ Accept: "text/event-stream" }),
      cache: "no-store",
      signal: request.signal,
    });

    if (!backendResponse.ok || !backendResponse.body) {
      const errorText = await backendResponse.text().catch(() => "");
      return new Response(
        `event: error\ndata: ${JSON.stringify({ error: errorText || "Backend live status stream failed" })}\n\n`,
        {
          status: backendResponse.status || 502,
          headers: { "Content-Type": "text/event-stream" },
        },
      );
    }

    return new Response(backendResponse.body, {
      headers: {
        "Content-Type": backendResponse.headers.get("content-type") ?? "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    return new Response(
      `event: error\ndata: ${JSON.stringify({ error: message })}\n\n`,
      { status: 500, headers: { "Content-Type": "text/event-stream" } },
    );
  }
}
