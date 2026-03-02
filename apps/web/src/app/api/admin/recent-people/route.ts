import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import type { AuthContext } from "@/lib/server/postgres";
import {
  getRecentPeopleViews,
  recordRecentPersonView,
} from "@/lib/server/admin/recent-people-repository";

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
    const people = await getRecentPeopleViews(user.uid, { limit });

    return NextResponse.json({
      people,
      pagination: {
        limit,
        count: people.length,
      },
    });
  } catch (error) {
    console.error("[api] Failed to read recent people", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const authContext: AuthContext = { firebaseUid: user.uid, isAdmin: true };
    const body = (await request.json().catch(() => ({}))) as {
      personId?: string;
      showId?: string | null;
    };

    const personId = typeof body.personId === "string" ? body.personId.trim() : "";
    if (!UUID_RE.test(personId)) {
      return NextResponse.json({ error: "personId must be a valid UUID" }, { status: 400 });
    }

    const showContext = typeof body.showId === "string" ? body.showId.trim() : null;
    await recordRecentPersonView(
      authContext,
      {
        personId,
        showContext: showContext && showContext.length > 0 ? showContext : null,
      },
      { cap: DEFAULT_LIMIT },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api] Failed to record recent person", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
