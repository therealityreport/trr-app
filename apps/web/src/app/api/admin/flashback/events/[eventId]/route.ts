import { NextRequest, NextResponse } from "next/server";

import { deleteFlashbackEvent } from "@/lib/server/admin/flashback-admin-repository";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ eventId: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { eventId } = await params;
    const deleted = await deleteFlashbackEvent(eventId);
    if (!deleted) {
      return NextResponse.json({ error: "event not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[api/admin/flashback/events/[eventId]] Failed to delete event", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
