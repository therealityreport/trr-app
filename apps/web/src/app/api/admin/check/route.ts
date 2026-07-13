import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const NO_STORE_RESPONSE_INIT = {
  headers: { "Cache-Control": "no-store" },
} as const;

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    return NextResponse.json({ hasAccess: true }, NO_STORE_RESPONSE_INIT);
  } catch {
    return NextResponse.json({ hasAccess: false }, NO_STORE_RESPONSE_INIT);
  }
}
