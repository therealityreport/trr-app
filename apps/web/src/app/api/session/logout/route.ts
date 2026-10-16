import { NextRequest, NextResponse } from "next/server";
import { isSameOriginSessionRequest } from "@/lib/server/session-origin";

export async function POST(req: NextRequest) {
  if (!isSameOriginSessionRequest(req)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true });
  // Clear cookie
  res.cookies.set("__session", "", { path: "/", maxAge: 0 });
  return res;
}
