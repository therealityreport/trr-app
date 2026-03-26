import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  createGettyPrefetchJob,
  readGettyPrefetchPayload,
  startGettyPrefetchJob,
} from "@/lib/server/admin/getty-local-scrape";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

/**
 * POST /api/admin/getty-local/scrape
 *
 * Scrapes Getty images + events for a person via the local machine's
 * residential IP.  Getty blocks cloud IPs so this must run locally.
 *
 * Strategy:
 *   1. If the standalone Getty server is running (make getty-server) → use it
 *   2. Otherwise, spawn a Python subprocess directly (zero setup required)
 *
 * Request body: { person_name: string }
 * Response: { merged, merged_total, merged_events, merged_events_total, ... }
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = request.nextUrl.searchParams.get("prefetch_token")?.trim() ?? "";
  if (!token) {
    return Response.json({ error: "prefetch_token is required" }, { status: 400 });
  }
  const state = await readGettyPrefetchPayload(token);
  if (!state) {
    return Response.json({ error: "Getty prefetch token not found" }, { status: 404 });
  }
  return Response.json({
    prefetch_token: token,
    ...state,
    poll_after_ms: state.status === "completed" || state.status === "failed" ? 0 : 1000,
    status_url: `/api/admin/getty-local/scrape?prefetch_token=${encodeURIComponent(token)}`,
  });
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const personName =
    typeof body.person_name === "string" ? body.person_name.trim() : "";
  const showName =
    typeof body.show_name === "string" ? body.show_name.trim() : "";
  const mode =
    typeof body.mode === "string" && body.mode.trim().toLowerCase() === "discovery"
      ? "discovery"
      : "full";
  const prefetchToken =
    typeof body.prefetch_token === "string" ? body.prefetch_token.trim() : "";
  if (!personName) {
    return Response.json(
      { error: "person_name is required" },
      { status: 400 }
    );
  }

  try {
    const { token, state } = await createGettyPrefetchJob(personName, showName || undefined, {
      mode,
      prefetchToken: prefetchToken || undefined,
    });
    const runningState = await startGettyPrefetchJob(token, personName, showName || undefined, {
      mode,
    });
    return Response.json({
      prefetch_token: token,
      ...(runningState ?? state),
      poll_after_ms: 1000,
      status_url: `/api/admin/getty-local/scrape?prefetch_token=${encodeURIComponent(token)}`,
    }, { status: 202 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      {
        error: "Getty local scrape kickoff failed",
        detail: message,
        hint: "Ensure the local Getty scrape subprocess can run and the codex Chrome profile is available.",
      },
      { status: message.toLowerCase().includes("timed out") ? 504 : 500 }
    );
  }
}
