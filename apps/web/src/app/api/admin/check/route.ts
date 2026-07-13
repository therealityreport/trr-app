import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    return NextResponse.json({ hasAccess: true });
  } catch {
    return NextResponse.json({ hasAccess: false });
  }
}
