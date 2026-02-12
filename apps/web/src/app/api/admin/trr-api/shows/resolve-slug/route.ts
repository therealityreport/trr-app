import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { resolveShowSlug } from "@/lib/server/trr-api/trr-shows-repository";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/trr-api/shows/resolve-slug?slug=the-valley-persian-style
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug")?.trim() ?? "";
    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    const resolved = await resolveShowSlug(slug);
    if (!resolved) {
      return NextResponse.json({ error: "show slug not found" }, { status: 404 });
    }

    return NextResponse.json({ resolved });
  } catch (error) {
    console.error("[api] Failed to resolve show slug", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

