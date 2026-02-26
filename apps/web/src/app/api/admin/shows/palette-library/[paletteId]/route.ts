import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import { deletePaletteLibraryEntryById } from "@/lib/server/shows/shows-repository";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ paletteId: string }> },
) {
  try {
    await requireAdmin(request);
    const { paletteId } = await params;

    if (!isValidUuid(paletteId)) {
      return NextResponse.json({ error: "paletteId must be a valid UUID" }, { status: 400 });
    }

    const deleted = await deletePaletteLibraryEntryById(paletteId);
    if (!deleted) {
      return NextResponse.json({ error: "Palette not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api] Failed to delete palette library entry", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
