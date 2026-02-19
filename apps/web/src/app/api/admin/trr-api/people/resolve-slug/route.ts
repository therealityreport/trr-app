import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  resolvePersonSlug,
  resolveShowSlug,
} from "@/lib/server/trr-api/trr-shows-repository";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/admin/trr-api/people/resolve-slug?slug=meredith-marks--7f528757&showId=the-real-housewives-of-salt-lake-city
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug")?.trim() ?? "";
    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    const showInput = searchParams.get("showId")?.trim() ?? "";
    let showId: string | null = null;
    if (showInput) {
      if (UUID_RE.test(showInput)) {
        showId = showInput;
      } else {
        const resolvedShow = await resolveShowSlug(showInput);
        showId = resolvedShow?.show_id ?? null;
      }
    }

    const resolved = await resolvePersonSlug(slug, { showId });
    if (!resolved) {
      return NextResponse.json({ error: "person slug not found" }, { status: 404 });
    }

    return NextResponse.json({
      resolved,
      show_id: showId,
    });
  } catch (error) {
    console.error("[api] Failed to resolve person slug", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
