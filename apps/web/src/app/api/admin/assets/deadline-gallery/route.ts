import { NextRequest, NextResponse } from "next/server";

import {
  isDeadlineUrl,
  resolveDeadlineGalleryImageUrl,
} from "@/lib/admin/deadline-gallery";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const jsonError = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const sourceUrl = request.nextUrl.searchParams.get("sourceUrl")?.trim() ?? "";
    const pageUrl = request.nextUrl.searchParams.get("pageUrl")?.trim() ?? "";
    const caption = request.nextUrl.searchParams.get("caption")?.trim() ?? "";
    const personNames = request.nextUrl.searchParams
      .getAll("personName")
      .map((value) => value.trim())
      .filter(Boolean);

    const fetchUrl = sourceUrl || pageUrl;
    if (!fetchUrl) {
      return jsonError("sourceUrl or pageUrl is required", 400);
    }
    if (!isDeadlineUrl(fetchUrl)) {
      return jsonError("Only deadline.com gallery URLs are allowed", 400);
    }

    const upstream = await fetch(fetchUrl, {
      method: "GET",
      headers: {
        accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return jsonError(`Upstream gallery request failed with ${upstream.status}`, 502);
    }

    const html = await upstream.text();
    const resolvedUrl = resolveDeadlineGalleryImageUrl(html, {
      caption,
      pageUrl,
      personNames,
    });

    if (!resolvedUrl) {
      return jsonError("No matching gallery image found", 404);
    }

    return NextResponse.json({ resolvedUrl });
  } catch (error) {
    console.error("[api] Failed to resolve Deadline gallery image", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return jsonError(message, status);
  }
}
