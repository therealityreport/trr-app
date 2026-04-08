import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getSocialLandingPayload } from "@/lib/server/admin/social-landing-repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const payload = await getSocialLandingPayload();
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api] Failed to load social landing payload", error);
    const message = error instanceof Error ? error.message : "Failed to load social landing payload";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
