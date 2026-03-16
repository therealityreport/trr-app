import { NextRequest, NextResponse } from "next/server";
import { getBrandProfileBySlug, getBrandProfileSuggestions } from "@/lib/server/admin/brand-profile-repository";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const slug = request.nextUrl.searchParams.get("slug")?.trim() ?? "";
    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    const payload = await getBrandProfileBySlug(slug);
    if (!payload) {
      const suggestions = await getBrandProfileSuggestions(slug);
      return NextResponse.json({ error: "not_found", suggestions }, { status: 404 });
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api] Failed to load brand profile", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
