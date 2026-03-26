import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
  buildAdminProxyErrorResponse,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const parseLimit = (raw: string | null): number => {
  const parsed = Number.parseInt(raw ?? String(DEFAULT_LIMIT), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(Math.max(parsed, 1), MAX_LIMIT);
};

export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const limit = parseLimit(request.nextUrl.searchParams.get("limit"));

    const upstream = await fetchAdminBackendJson("/admin/recent-people", {
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName: "recent-people:list",
      headers: { "X-TRR-Admin-User-Uid": user.uid },
      queryString: `limit=${limit}`,
    });
    if (upstream.status !== 200) {
      throw new Error(
        typeof upstream.data.error === "string"
          ? upstream.data.error
          : typeof upstream.data.detail === "string"
            ? upstream.data.detail
            : "Failed to read recent people",
      );
    }

    return NextResponse.json(upstream.data);
  } catch (error) {
    console.error("[api] Failed to read recent people", error);
    return buildAdminProxyErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const body = (await request.json().catch(() => ({}))) as {
      personId?: string;
      showId?: string | null;
    };

    const personId = typeof body.personId === "string" ? body.personId.trim() : "";
    if (!UUID_RE.test(personId)) {
      return NextResponse.json({ error: "personId must be a valid UUID" }, { status: 400 });
    }

    const upstream = await fetchAdminBackendJson("/admin/recent-people", {
      method: "POST",
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName: "recent-people:record",
      headers: {
        "Content-Type": "application/json",
        "X-TRR-Admin-User-Uid": user.uid,
      },
      body: JSON.stringify({
        personId,
        showId: typeof body.showId === "string" ? body.showId.trim() : null,
      }),
    });
    if (upstream.status === 400) {
      return NextResponse.json(
        {
          error:
            typeof upstream.data.error === "string"
              ? upstream.data.error
              : typeof upstream.data.detail === "string"
                ? upstream.data.detail
                : "Failed to record recent person",
        },
        { status: 400 },
      );
    }
    if (upstream.status !== 200) {
      throw new Error(
        typeof upstream.data.error === "string"
          ? upstream.data.error
          : typeof upstream.data.detail === "string"
            ? upstream.data.detail
            : "Failed to record recent person",
      );
    }

    return NextResponse.json(upstream.data);
  } catch (error) {
    console.error("[api] Failed to record recent person", error);
    return buildAdminProxyErrorResponse(error);
  }
}
