import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/scrape/import/stream
 *
 * Proxies scrape import request to TRR-Backend with SSE streaming.
 * Returns progress events as images are imported.
 *
 * Events:
 * - progress: {"current": 1, "total": 5, "url": "...", "status": "downloading"}
 * - imported: {"current": 1, "url": "...", "asset_id": "...", "status": "success"}
 * - skipped: {"current": 1, "url": "...", "status": "duplicate"}
 * - error: {"current": 1, "url": "...", "error": "..."}
 * - complete: {"imported": 5, "skipped_duplicates": 0, "errors": [], "assets": [...]}
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { entity_type, source_url, images } = body;

    // Determine entity type (default to "season" for backward compatibility)
    const effectiveEntityType = entity_type ?? "season";

    // Validate common fields
    if (!source_url) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({ error: "source_url is required" })}\n\n`,
        {
          status: 400,
          headers: { "Content-Type": "text/event-stream" },
        }
      );
    }
    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({ error: "At least one image is required" })}\n\n`,
        {
          status: 400,
          headers: { "Content-Type": "text/event-stream" },
        }
      );
    }

    // Validate entity-specific fields
    if (effectiveEntityType === "season") {
      if (!body.show_id) {
        return new Response(
          `event: error\ndata: ${JSON.stringify({ error: "show_id is required for season entity type" })}\n\n`,
          {
            status: 400,
            headers: { "Content-Type": "text/event-stream" },
          }
        );
      }
      if (body.season_number === undefined || body.season_number === null) {
        return new Response(
          `event: error\ndata: ${JSON.stringify({ error: "season_number is required for season entity type" })}\n\n`,
          {
            status: 400,
            headers: { "Content-Type": "text/event-stream" },
          }
        );
      }
    } else if (effectiveEntityType === "person") {
      if (!body.person_id) {
        return new Response(
          `event: error\ndata: ${JSON.stringify({ error: "person_id is required for person entity type" })}\n\n`,
          {
            status: 400,
            headers: { "Content-Type": "text/event-stream" },
          }
        );
      }
    } else {
      return new Response(
        `event: error\ndata: ${JSON.stringify({ error: "entity_type must be 'season' or 'person'" })}\n\n`,
        {
          status: 400,
          headers: { "Content-Type": "text/event-stream" },
        }
      );
    }

    // Get TRR-Backend URL from environment
    const backendUrl = process.env.TRR_API_URL;
    if (!backendUrl) {
      console.error("[scrape/import/stream] TRR_API_URL not configured");
      return new Response(
        `event: error\ndata: ${JSON.stringify({ error: "Backend API not configured" })}\n\n`,
        {
          status: 500,
          headers: { "Content-Type": "text/event-stream" },
        }
      );
    }

    // Use Supabase service role key for backend auth
    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error("[scrape/import/stream] TRR_CORE_SUPABASE_SERVICE_ROLE_KEY not configured");
      return new Response(
        `event: error\ndata: ${JSON.stringify({ error: "Backend auth not configured" })}\n\n`,
        {
          status: 500,
          headers: { "Content-Type": "text/event-stream" },
        }
      );
    }

    // Forward to backend streaming endpoint
    const backendResponse = await fetch(`${backendUrl}/api/v1/admin/scrape/import/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error("[scrape/import/stream] Backend error:", errorText);
      return new Response(
        `event: error\ndata: ${JSON.stringify({ error: "Backend import failed" })}\n\n`,
        {
          status: backendResponse.status,
          headers: { "Content-Type": "text/event-stream" },
        }
      );
    }

    // Stream the response through
    if (!backendResponse.body) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({ error: "No response body from backend" })}\n\n`,
        {
          status: 500,
          headers: { "Content-Type": "text/event-stream" },
        }
      );
    }

    // Pass through the SSE stream from backend
    return new Response(backendResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("[api] Failed to stream import", error);
    const message = error instanceof Error ? error.message : "failed";
    return new Response(
      `event: error\ndata: ${JSON.stringify({ error: message })}\n\n`,
      {
        status: 500,
        headers: { "Content-Type": "text/event-stream" },
      }
    );
  }
}
