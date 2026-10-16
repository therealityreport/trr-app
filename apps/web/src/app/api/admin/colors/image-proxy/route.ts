import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import { fetchSafeImage, SafeImageFetchError } from "@/lib/server/safe-image-fetch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errorStatus(error: unknown) {
  if (error instanceof SafeImageFetchError) return error.status;
  const message = error instanceof Error ? error.message : "failed";
  if (message === "unauthorized") return 401;
  if (message === "forbidden") return 403;
  if (
    message.includes("not allowed") ||
    message.includes("valid absolute URL") ||
    message.includes("Only http/https") ||
    message.includes("redirected")
  ) {
    return 400;
  }
  if (message.includes("exceeds size limit")) return 413;
  return 500;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const raw = request.nextUrl.searchParams.get("url")?.trim() ?? "";
    if (!raw) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const upstream = await fetchSafeImage(raw);

    return new NextResponse(upstream.bytes, {
      status: 200,
      headers: {
        "content-type": upstream.contentType,
        "cache-control": "private, max-age=300",
      },
    });
  } catch (error) {
    const status = errorStatus(error);
    const message = error instanceof SafeImageFetchError || status === 401 || status === 403
      ? (error as Error).message : "Image request failed";
    console.error("[api] Failed to proxy image", message);
    return NextResponse.json({ error: message }, { status: errorStatus(error) });
  }
}
